#!/usr/bin/env python3
"""Persistent compact Context Packet with staleness detection."""

import argparse
import hashlib
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from task_lock import LockTimeout, StateLock

SCHEMA = 1
CAP = 300
FIELDS = {
    "schema_version": int, "task_id": str, "run_id": str, "branch": str,
    "head": str, "contract_path": str, "contract_sha256": str,
    "files": list, "invariants": list, "evidence": list,
    "git_dirty": list, "created_at": str,
}


def fail(message):
    print(f"CONTEXT_PACKET_ERROR: {message}", file=sys.stderr)
    raise SystemExit(2)


def sha(path):
    p = Path(path)
    if not p.is_file():
        return None
    return hashlib.sha256(p.read_bytes()).hexdigest()


def git(root, *args):
    r = subprocess.run(["git", *args], cwd=root, capture_output=True,
                       text=True, check=False)
    if r.returncode != 0:
        fail(f"git {' '.join(args)} failed: {r.stderr.strip()}")
    return r.stdout


def packet_path(root, run_id):
    return Path(root) / ".agent" / "runs" / run_id / "context_packet.json"


def resolve_in_root(root, rel):
    full = (Path(root) / rel).resolve()
    if full != root and root not in full.parents:
        fail(f"path outside root: {rel}")
    return full


def dirty_state(root):
    out = git(root, "status", "--porcelain", "-z", "--untracked-files=all")
    toks, items, i = out.split("\0"), [], 0
    while i < len(toks):
        t = toks[i]
        i += 1
        if len(t) < 4:
            continue
        status, path = t[:2].strip(), t[3:]
        if "R" in t[:2] or "C" in t[:2]:
            i += 1  # skip origin path
        if path.startswith(".agent/runs/"):
            continue
        items.append({"path": path, "status": status,
                      "sha256": sha(Path(root) / path)})
    return sorted(items, key=lambda d: (d["path"], d["status"]))


def clip(items):
    return [str(s)[:CAP] for s in items or []]


def build(root, run_id, task_id, contract, files, invariants, evidence):
    contract_hash = sha(resolve_in_root(root, contract) if not os.path.isabs(contract) else contract)
    if contract_hash is None:
        fail(f"contract not found: {contract}")
    entries = []
    for f in files:
        full = resolve_in_root(root, f)
        if not full.is_file():
            fail(f"relevant file missing: {f}")
        entries.append({"path": str(full.relative_to(root)), "sha256": sha(full),
                        "size": full.stat().st_size})
    return {
        "schema_version": SCHEMA, "task_id": task_id, "run_id": run_id,
        "branch": git(root, "rev-parse", "--abbrev-ref", "HEAD").strip(),
        "head": git(root, "rev-parse", "HEAD").strip(),
        "contract_path": contract, "contract_sha256": contract_hash,
        "files": entries, "invariants": clip(invariants),
        "evidence": clip(evidence), "git_dirty": dirty_state(root),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def write(root, run_id, packet):
    path = packet_path(root, run_id)
    lock = StateLock(path)
    try:
        lock.acquire()
        tmp = path.with_name(path.name + f".tmp{os.getpid()}")
        tmp.write_text(json.dumps(packet, indent=2, sort_keys=True) + "\n",
                       encoding="utf-8")
        os.replace(tmp, path)
    except LockTimeout as exc:
        fail(str(exc))
    finally:
        lock.release()


def load(root, run_id):
    """Return (packet, invalid_reasons)."""
    path = packet_path(root, run_id)
    if not path.is_file():
        return None, ["missing_file"]
    try:
        p = json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return None, ["unparseable_json"]
    if not isinstance(p, dict):
        return None, ["not_an_object"]
    bad = [f"bad_field:{k}" for k, t in FIELDS.items()
           if k not in p or not isinstance(p[k], t) or isinstance(p[k], bool)]
    if not bad and p["schema_version"] != SCHEMA:
        bad.append("wrong_schema_version")
    if not bad:
        if p["run_id"] != run_id:
            bad.append("run_id_mismatch")
        if not all(isinstance(f, dict) and isinstance(f.get("path"), str)
                   and isinstance(f.get("sha256"), str) for f in p["files"]):
            bad.append("bad_field:files")
        if not all(isinstance(d, dict) and isinstance(d.get("path"), str)
                   for d in p["git_dirty"]):
            bad.append("bad_field:git_dirty")
    return (None, bad) if bad else (p, [])


def evaluate(root, run_id, contract=None):
    p, bad = load(root, run_id)
    if bad:
        return None, "INVALID", bad
    stale = []
    if git(root, "rev-parse", "HEAD").strip() != p["head"]:
        stale.append("head_changed")
    if git(root, "rev-parse", "--abbrev-ref", "HEAD").strip() != p["branch"]:
        stale.append("branch_changed")
    c = contract or p["contract_path"]
    cfull = Path(c) if os.path.isabs(c) else Path(root) / c
    if sha(cfull) != p["contract_sha256"]:
        stale.append("contract_changed")
    for f in p["files"]:
        if sha(Path(root) / f["path"]) != f["sha256"]:
            stale.append(f"file_changed:{f['path']}")
    if dirty_state(root) != p["git_dirty"]:
        stale.append("dirty_changed")
    return p, ("STALE" if stale else "VALID"), stale


def report(status, reasons):
    print(f"PACKET={status} REASONS={','.join(reasons) or 'none'}")
    return {"VALID": 0, "STALE": 1}.get(status, 2)


def cmd_create(a, existing=None):
    root = Path(a.root).resolve()
    task_id = a.task_id or (existing or {}).get("task_id")
    contract = a.contract or (existing or {}).get("contract_path")
    if not task_id or not contract:
        fail("task-id and contract are required")
    files = a.file if a.file is not None else [f["path"] for f in (existing or {}).get("files", [])]
    inv = a.invariant if a.invariant is not None else (existing or {}).get("invariants", [])
    ev = a.evidence if a.evidence is not None else (existing or {}).get("evidence", [])
    packet = build(root, a.run_id, task_id, contract, files, inv, ev)
    write(root, a.run_id, packet)
    print(f"PACKET=WRITTEN HEAD={packet['head'][:12]} FILES={len(packet['files'])}")
    return 0


def cmd_refresh(a):
    root = Path(a.root).resolve()
    old, bad = load(root, a.run_id)
    if bad:
        fail(f"cannot refresh, packet invalid: {','.join(bad)}")
    return cmd_create(a, old)


def cmd_check(a):
    _, status, reasons = evaluate(Path(a.root).resolve(), a.run_id, a.contract)
    return report(status, reasons)


def cmd_show(a):
    p, status, reasons = evaluate(Path(a.root).resolve(), a.run_id)
    if status != "VALID":
        return report(status, reasons)
    print(json.dumps(p, sort_keys=True, separators=(",", ":")))
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name, fn in (("create", cmd_create), ("refresh", cmd_refresh),
                     ("check", cmd_check), ("show", cmd_show)):
        s = sub.add_parser(name)
        s.set_defaults(fn=fn)
        s.add_argument("--run-id", required=True)
        s.add_argument("--root", default=".")
        if name in ("create", "refresh"):
            s.add_argument("--task-id", required=(name == "create"))
            s.add_argument("--contract", required=(name == "create"))
            s.add_argument("--file", action="append")
            s.add_argument("--invariant", action="append")
            s.add_argument("--evidence", action="append")
        if name == "check":
            s.add_argument("--contract")
    a = ap.parse_args(argv)
    if "/" in a.run_id or a.run_id in ("", ".", ".."):
        fail("invalid run-id")
    return a.fn(a)


if __name__ == "__main__":
    sys.exit(main())
