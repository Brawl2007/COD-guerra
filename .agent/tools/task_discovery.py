#!/usr/bin/env python3
"""Read-only discovery of persisted Task Graph runs under .agent/runs.

Classifies every run so a new session can find what to resume without
hunting for a RUN_ID. Decisions about RUNNING nodes come from
task_recovery.classify. This tool never writes state, never takes or
creates lock files and never relaunches work.

Run classes (precedence): INVALID > ACTIVE > BLOCKED > INTERRUPTED >
PENDING > COMPLETED.
"""

import argparse
import contextlib
import io
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True  # strictly read-only, not even __pycache__
sys.path.insert(0, str(Path(__file__).resolve().parent))

import task_recovery  # noqa: E402
from task_recovery import (  # noqa: E402
    DEFAULT_STALE_SECONDS,
    FIX_ATTEMPTS,
    classify,
)

STATUSES = {"PENDING", "READY", "RUNNING", "PASS", "FAIL", "BLOCKED", "SKIPPED"}
CLASSES = ("COMPLETED", "PENDING", "ACTIVE", "INTERRUPTED", "BLOCKED", "INVALID")
NEEDS_HUMAN = {"NEEDS_APPROVAL", "UNKNOWN", "BUDGET_EXHAUSTED"}


class Invalid(Exception):
    pass


def reuse(func, *args):
    """Call a task_recovery loader, turning its fail()/errors into Invalid."""
    err = io.StringIO()
    try:
        with contextlib.redirect_stderr(err):
            return func(*args)
    except SystemExit:
        message = err.getvalue().strip().replace("TASK_RECOVERY_ERROR: ", "")
        raise Invalid(message or "invalid") from None
    except Exception as exc:
        raise Invalid(f"{type(exc).__name__}: {exc}") from None


def read_budget(contract):
    try:
        match = FIX_ATTEMPTS.search(contract.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError):
        return None
    return int(match.group(1)) if match else None


def rel(path, root):
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)


def inspect_run(run_dir, root, stale_after, at):
    state_path = run_dir / "graph_state.json"
    contract = run_dir / "TASK_CONTRACT.yaml"
    info = {
        "run": run_dir.name,
        "task": None,
        "class": None,
        "reason": "",
        "state_path": rel(state_path, root),
        "contract": rel(contract, root) if contract.is_file() else None,
        "budget": None,
        "nodes": {},
    }
    info["budget"] = read_budget(contract) if info["contract"] else None

    try:
        if not state_path.is_file():
            raise Invalid("graph_state.json missing")
        state = reuse(task_recovery.load_state, state_path)
        info["task"] = state.get("task_id")
        for name, node in state["nodes"].items():
            if not isinstance(node, dict):
                raise Invalid(f"node {name!r} is not an object")
            if node.get("status") not in STATUSES:
                raise Invalid(f"node {name!r} has unknown status {node.get('status')!r}")
            attempts = node.get("attempts", 0)
            if isinstance(attempts, bool) or not isinstance(attempts, int) or attempts < 0:
                raise Invalid(f"node {name!r} has invalid attempts {attempts!r}")
        graph_ref = state.get("graph")
        if not isinstance(graph_ref, str) or not graph_ref:
            raise Invalid("runtime state has no graph path")
        graph_path = Path(graph_ref)
        if not graph_path.is_absolute():
            graph_path = root / graph_path
        graph = reuse(task_recovery.load_graph, dict(state, graph=str(graph_path)))
        for name, node in state["nodes"].items():
            if node["status"] == "SKIPPED" and graph["nodes"][name].get("optional") is not True:
                raise Invalid(f"required node {name!r} is SKIPPED")
    except Invalid as exc:
        info["class"], info["reason"] = "INVALID", str(exc)
        return info

    verdicts = []
    for name in sorted(state["nodes"]):
        node = state["nodes"][name]
        entry = {"status": node["status"], "attempts": node.get("attempts", 0)}
        if node["status"] == "RUNNING":
            verdict, reason = classify(
                name, node, graph["nodes"][name], info["budget"],
                stale_after, set(), at,
            )
            entry.update(verdict=verdict, reason=reason)
            verdicts.append((name, verdict, reason))
        info["nodes"][name] = entry

    statuses = [n["status"] for n in info["nodes"].values()]
    active = [n for n, v, _ in verdicts if v == "ACTIVE"]
    human = [(n, v, r) for n, v, r in verdicts if v in NEEDS_HUMAN]
    blocked_nodes = [n for n, e in info["nodes"].items() if e["status"] == "BLOCKED"]

    if active:
        info["class"], info["reason"] = "ACTIVE", f"{active[0]} owned by a live/fresh process"
    elif human:
        name, verdict, reason = human[0]
        info["class"], info["reason"] = "BLOCKED", f"{name} {verdict}: {reason}"
    elif blocked_nodes:
        info["class"], info["reason"] = "BLOCKED", f"node {blocked_nodes[0]} is BLOCKED"
    elif verdicts:
        info["class"], info["reason"] = "INTERRUPTED", "abandoned RUNNING nodes are resumable"
    elif any(s not in ("PASS", "SKIPPED") for s in statuses):
        info["class"], info["reason"] = "PENDING", "unfinished nodes, none running"
    else:
        info["class"], info["reason"] = "COMPLETED", "all nodes PASS/SKIPPED"
    return info


def nodes_with(info, status):
    return ",".join(n for n, e in info["nodes"].items() if e["status"] == status)


def next_action(info):
    cls = info["class"]
    if cls == "INTERRUPTED":
        return (
            f"python3 .agent/tools/task_recovery.py --state {info['state_path']} "
            f"--contract {info['contract']} --dry-run ; then rerun without "
            "--dry-run and resume READY nodes via task_state.py (never re-init)"
        )
    return {
        "PENDING": "resume READY nodes via task_state.py set (never re-init)",
        "ACTIVE": "do not touch; another owner is working on this run",
        "BLOCKED": "escalate to human: check Git evidence; use task_recovery.py "
                   "--approve only with explicit human approval",
        "INVALID": "do not resume; inspect state/graph and escalate",
        "COMPLETED": "nothing to resume",
    }[cls]


def main():
    parser = argparse.ArgumentParser(description="Read-only discovery of Task Graph runs.")
    parser.add_argument("--root", default=".", help="repository root (default: cwd)")
    parser.add_argument("--run", metavar="RUN_ID", help="detailed summary of one run")
    parser.add_argument("--stale-after", type=int, default=DEFAULT_STALE_SECONDS)
    parser.add_argument("--json", action="store_true", help="machine-readable output")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    runs_dir = root / ".agent" / "runs"
    at = task_recovery.now()

    if args.run is not None:
        run_id = args.run
        if not run_id or "/" in run_id or "\\" in run_id or ".." in run_id or run_id == ".":
            print(f"TASK_DISCOVERY_ERROR: invalid RUN_ID {run_id!r}", file=sys.stderr)
            raise SystemExit(2)
        run_dir = runs_dir / run_id
        if not run_dir.is_dir():
            print(f"TASK_DISCOVERY_ERROR: unknown run {run_id!r}", file=sys.stderr)
            raise SystemExit(2)
        info = inspect_run(run_dir, root, args.stale_after, at)
        info["next_action"] = next_action(info)
        if args.json:
            print(json.dumps(info, indent=2, sort_keys=True))
        else:
            print(f"RUN={info['run']}")
            print(f"TASK={info['task'] or ''}")
            print(f"CLASS={info['class']}")
            print(f"REASON={info['reason']}")
            print(f"ROOT={root}")
            print(f"STATE_PATH={info['state_path']}")
            print(f"CONTRACT={info['contract'] or 'none'}")
            print(f"BUDGET={info['budget'] if info['budget'] is not None else 'unknown'}")
            for name, e in info["nodes"].items():
                line = f"NODE={name} STATUS={e['status']} ATTEMPTS={e['attempts']}"
                if "verdict" in e:
                    line += f" VERDICT={e['verdict']} REASON={e['reason']}"
                print(line)
            print(f"NEXT_ACTION={info['next_action']}")
        ok = info["class"] in ("COMPLETED", "PENDING", "INTERRUPTED")
        raise SystemExit(0 if ok else 3)

    runs = []
    if runs_dir.is_dir():
        for run_dir in sorted(p for p in runs_dir.iterdir() if p.is_dir()):
            runs.append(inspect_run(run_dir, root, args.stale_after, at))
    summary = {c: [r["run"] for r in runs if r["class"] == c] for c in CLASSES}

    if args.json:
        print(json.dumps({"runs": runs, "summary": summary}, indent=2, sort_keys=True))
    else:
        for r in runs:
            print(
                f"RUN={r['run']} TASK={r['task'] or ''} CLASS={r['class']} "
                f"RUNNING={nodes_with(r, 'RUNNING')} READY={nodes_with(r, 'READY')} "
                f"REASON={r['reason']}"
            )
        for c in CLASSES:
            print(f"{c}=" + ",".join(summary[c]))
    raise SystemExit(0)


if __name__ == "__main__":
    main()
