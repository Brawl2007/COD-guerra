#!/usr/bin/env python3
"""Minimal durable checkpoints stored in a separate Git branch (no AI calls)."""
import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

CONTROL = "refs/heads/cod-guerra/cloud-state"
PREFIX = ".agent/cloud-state/checkpoints/"
TASK = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,63}\Z")
OID = re.compile(r"[0-9a-f]{40}\Z")
KEYS = {"schema_version", "task_id", "work_branch", "work_head",
        "status", "operation", "next_action", "evidence"}


class Failure(Exception):
    pass


def git(*args, input=None, env=None):
    p = subprocess.run(["git", *args], input=input, env=env, text=True,
                       capture_output=True)
    if p.returncode:
        raise Failure("Git command failed: " + args[0])
    return p.stdout.strip()


def workref(branch):
    if not isinstance(branch, str) or branch in ("main", "master", "cod-guerra/cloud-state"):
        raise Failure("Protected branch")
    if len(branch) > 200 or branch.startswith("-"):
        raise Failure("Invalid work branch")
    git("check-ref-format", "--branch", branch)
    return "refs/heads/" + branch


def remote_head(remote, ref):
    p = subprocess.run(["git", "ls-remote", "--heads", remote, ref],
                       text=True, capture_output=True)
    if p.returncode:
        raise Failure("Cannot query remote")
    rows = [line.split() for line in p.stdout.splitlines() if line.strip()]
    hits = [v[0] for v in rows if len(v) == 2 and v[1] == ref]
    if len(hits) > 1 or any(not OID.fullmatch(h) for h in hits):
        raise Failure("Invalid remote ref")
    return hits[0] if hits else None


def fetch_state(remote):
    old = remote_head(remote, CONTROL)
    if old is None:
        return None
    git("fetch", "--no-tags", remote, CONTROL)
    if git("rev-parse", "FETCH_HEAD") != old:
        raise Failure("Remote state moved; retry")
    return old


def validate(d):
    if not isinstance(d, dict) or set(d) != KEYS:
        raise Failure("Invalid checkpoint fields")
    if type(d["schema_version"]) is not int or d["schema_version"] != 1:
        raise Failure("Invalid schema version")
    if not isinstance(d["task_id"], str) or not TASK.fullmatch(d["task_id"]):
        raise Failure("Invalid task ID")
    workref(d["work_branch"])
    if not isinstance(d["work_head"], str) or not OID.fullmatch(d["work_head"]):
        raise Failure("Invalid work HEAD")
    if d["status"] not in ("PENDING", "RUNNING", "BLOCKED", "ACCEPTED"):
        raise Failure("Invalid status")
    if d["operation"] not in ("read_only", "idempotent", "irreversible"):
        raise Failure("Invalid operation")
    a = d["next_action"]
    if not isinstance(a, str) or not 1 <= len(a) <= 400 or "\n" in a:
        raise Failure("Invalid next action")
    ev = d["evidence"]
    if not isinstance(ev, list) or len(ev) > 12 or any(
        not isinstance(e, str) or not 1 <= len(e) <= 160 or "\n" in e for e in ev
    ):
        raise Failure("Invalid evidence")
    return d


def checkpoint(commit, task):
    if not commit:
        raise Failure("State branch not initialized")
    p = subprocess.run(["git", "show", commit + ":" + PREFIX + task + ".json"],
                       text=True, capture_output=True)
    if p.returncode or len(p.stdout) > 8192:
        raise Failure("Checkpoint not found")
    try:
        d = json.loads(p.stdout)
        validate({k: d[k] for k in KEYS})
        if set(d) != KEYS | {"updated_at"} or not isinstance(d["updated_at"], str):
            raise ValueError()
    except (ValueError, KeyError, TypeError, Failure):
        raise Failure("Corrupt checkpoint") from None
    return d


def list_records(remote):
    head = fetch_state(remote)
    if not head:
        return []
    paths = git("ls-tree", "-r", "--name-only", head, "--", PREFIX).splitlines()
    result = []
    for path in paths:
        if path.startswith(PREFIX) and path.endswith(".json"):
            task = path[len(PREFIX):-5]
            if TASK.fullmatch(task):
                rec = checkpoint(head, task)
                result.append({k: rec[k] for k in ("task_id", "work_branch", "status", "updated_at")})
    return sorted(result, key=lambda x: x["task_id"])


def read_record(remote, task):
    if not TASK.fullmatch(task):
        raise Failure("Invalid task ID")
    rec = checkpoint(fetch_state(remote), task)
    same = remote_head(remote, workref(rec["work_branch"])) == rec["work_head"]
    safe = same and rec["status"] == "PENDING" and rec["operation"] in ("read_only", "idempotent")
    return {"checkpoint": rec, "resume_allowed": safe,
            "reason": "ready" if safe else ("work_head_changed_or_missing" if not same else "manual_review_required")}


def publish(remote, filename, init):
    current = git("branch", "--show-current")
    if not current or current in {"main", "master", "cod-guerra/cloud-state"}:
        raise Failure("Publish requires an ordinary work branch, never main or detached HEAD")
    path = Path(filename)
    if not path.is_file() or path.stat().st_size > 8192:
        raise Failure("Input must be JSON <= 8 KiB")
    try:
        data = validate(json.loads(path.read_text(encoding="utf-8")))
    except (UnicodeError, ValueError, TypeError, KeyError):
        raise Failure("Invalid JSON") from None
    if remote_head(remote, workref(data["work_branch"])) != data["work_head"]:
        raise Failure("Work branch does not match checkpoint")
    old = fetch_state(remote)
    if old is None and not init:
        raise Failure("First publish requires --init")
    data["updated_at"] = datetime.now(timezone.utc).isoformat(timespec="microseconds")
    blob = git("hash-object", "-w", "--stdin", input=json.dumps(data, sort_keys=True) + "\n")
    with tempfile.TemporaryDirectory(prefix="cod-state-") as tmp:
        env = dict(os.environ, GIT_INDEX_FILE=str(Path(tmp) / "index"))
        git("read-tree", old + "^{tree}" if old else "--empty", env=env)
        git("update-index", "--add", "--cacheinfo", "100644," + blob + "," + PREFIX + data["task_id"] + ".json", env=env)
        tree = git("write-tree", env=env)
    args = ["-c", "user.name=COD-guerra Cloud State",
            "-c", "user.email=cod-guerra-cloud@users.noreply.github.com",
            "commit-tree", tree, "-m", "checkpoint: " + data["task_id"]]
    if old:
        args += ["-p", old]
    commit = git(*args)
    git("push", remote, commit + ":" + CONTROL)
    return {"published": True, "task_id": data["task_id"], "control_commit": commit}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--remote", default="origin")
    subs = parser.add_subparsers(dest="cmd", required=True)
    subs.add_parser("list")
    getter = subs.add_parser("get")
    getter.add_argument("--task-id", required=True)
    writer = subs.add_parser("publish")
    writer.add_argument("--input", required=True)
    writer.add_argument("--init", action="store_true")
    a = parser.parse_args()
    if not TASK.fullmatch(a.remote):
        parser.error("Invalid remote name")
    try:
        answer = (list_records(a.remote) if a.cmd == "list" else
                  read_record(a.remote, a.task_id) if a.cmd == "get" else
                  publish(a.remote, a.input, a.init))
        print(json.dumps(answer, ensure_ascii=False, sort_keys=True, indent=2))
        return 0
    except Failure as e:
        print("CLOUD_CHECKPOINT_ERROR: " + str(e), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
