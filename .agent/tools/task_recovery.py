#!/usr/bin/env python3
"""Conservative recovery of interrupted Task Graph V1 executions.

A node is only treated as abandoned when it is RUNNING, its owner
process is proven dead (or its PID was recycled) and its heartbeat is
stale. An owner that cannot be determined ("unknown": no/invalid PID or
an unreadable process table) is never recovered automatically, however
old the heartbeat; it needs an explicit --approve plus a stale
heartbeat. The whole read -> decide -> write cycle runs under the lock
shared with task_state.py. A node is only resumed
automatically (RUNNING -> READY) when it declared a re-runnable
operation, is not irreversible, and the Task Contract attempt budget
still allows another run. Everything else needs explicit approval.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from task_lock import LockTimeout, StateLock


DEFAULT_STALE_SECONDS = 900

AUTO_OPERATIONS = {"read_only", "idempotent"}

# Node types whose work can publish or merge; never auto-resumed.
NEVER_AUTO_TYPES = {"integration"}

FIX_ATTEMPTS = re.compile(
    r"^\s*max_fix_attempts:\s*(\d+)\s*$", re.MULTILINE
)


def fail(message):
    print(f"TASK_RECOVERY_ERROR: {message}", file=sys.stderr)
    raise SystemExit(2)


def now():
    return datetime.now(timezone.utc)


def parse_time(value):
    try:
        parsed = datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return None

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)

    return parsed


def proc_start_ticks(pid):
    try:
        text = Path(f"/proc/{pid}/stat").read_text(
            encoding="utf-8"
        )
        return int(text.rsplit(")", 1)[1].split()[19])
    except Exception:
        return None


def pid_status(node):
    """Return 'alive', 'dead' or 'unknown' for the recorded owner."""
    pid = node.get("owner_pid")

    if isinstance(pid, bool) or not isinstance(pid, int) or pid <= 0:
        return "unknown"

    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return "dead"
    except PermissionError:
        return "alive"
    except OSError:
        return "unknown"

    recorded = node.get("owner_pid_start")
    current = proc_start_ticks(pid)

    if (
        recorded is not None
        and current is not None
        and recorded != current
    ):
        # PID was recycled by an unrelated process.
        return "dead"

    return "alive"


def load_json(path):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"{path}: invalid JSON: {exc}")


def atomic_write(path, data):
    path = Path(path)
    temp = path.with_suffix(f"{path.suffix}.{os.getpid()}.tmp")
    temp.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temp.replace(path)


def load_state(path):
    if not Path(path).exists():
        fail(f"runtime state not found: {path}")

    state = load_json(path)

    if state.get("schema_version") != 1:
        fail("unsupported runtime state schema")

    if not isinstance(state.get("nodes"), dict):
        fail("runtime state nodes missing")

    return state


def load_graph(state):
    graph_path = state.get("graph")

    if not graph_path:
        fail("runtime state has no graph path")

    validator = Path(__file__).with_name("task_graph.py")
    result = subprocess.run(
        [
            sys.executable,
            str(validator),
            "validate",
            str(graph_path),
            "--allow-empty-task-id",
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    if result.returncode != 0:
        fail(
            "graph validation failed: "
            + (result.stderr.strip() or result.stdout.strip())
        )

    graph = load_json(graph_path)

    if set(graph["nodes"]) != set(state["nodes"]):
        fail("runtime state nodes do not match graph")

    return graph


def resolve_budget(args):
    if args.max_attempts is not None:
        return args.max_attempts

    if args.contract:
        try:
            text = Path(args.contract).read_text(encoding="utf-8")
        except OSError as exc:
            fail(f"cannot read contract: {exc}")

        match = FIX_ATTEMPTS.search(text)

        if match:
            return int(match.group(1))

        fail("contract has no execution.max_fix_attempts")

    return None


def classify(name, node, definition, budget, stale_after, approved, at):
    """Return (verdict, reason) for one RUNNING node."""
    owner = pid_status(node)

    if owner == "alive":
        return "ACTIVE", "owner process is still alive"

    heartbeat = parse_time(node.get("heartbeat_at"))

    if heartbeat is None:
        return "UNKNOWN", "no heartbeat evidence; cannot prove abandonment"

    age = (at - heartbeat).total_seconds()

    if age < stale_after:
        return "ACTIVE", f"heartbeat is fresh ({int(age)}s < {stale_after}s)"

    if owner == "unknown" and name not in approved:
        # A stale heartbeat alone is not proof: the owner may be a
        # slow but live process we cannot identify.
        return (
            "UNKNOWN",
            f"owner process unknown (heartbeat {int(age)}s old); "
            "abandonment not proven, explicit approval required",
        )

    # From here the node is provably abandoned (or explicitly approved).
    prefix = f"abandoned (owner={owner}, heartbeat {int(age)}s old)"
    attempts = node.get("attempts", 0)

    if isinstance(attempts, bool) or not isinstance(attempts, int):
        return "NEEDS_APPROVAL", f"{prefix}; attempts counter invalid"

    if budget is None:
        return "NEEDS_APPROVAL", f"{prefix}; attempt budget unknown"

    if attempts >= budget:
        return (
            "BUDGET_EXHAUSTED",
            f"{prefix}; attempts {attempts} >= budget {budget}",
        )

    operation = node.get("operation")

    if definition.get("type") in NEVER_AUTO_TYPES:
        reason = f"{prefix}; node type {definition['type']!r} is never auto-resumed"
    elif owner == "unknown":
        reason = f"{prefix}; owner unknown"
    elif operation not in AUTO_OPERATIONS:
        reason = (
            f"{prefix}; operation is {operation!r}, "
            "not declared re-runnable"
        )
    else:
        return "RESUMABLE", f"{prefix}; {operation} operation, within budget"

    if name in approved:
        return "RESUMABLE", reason + "; resumption approved explicitly"

    return "NEEDS_APPROVAL", reason


def main():
    parser = argparse.ArgumentParser(
        description="Detect and recover interrupted Task Graph runs."
    )
    parser.add_argument("--state", required=True)
    parser.add_argument("--contract")
    parser.add_argument("--max-attempts", type=int)
    parser.add_argument(
        "--stale-after",
        type=int,
        default=DEFAULT_STALE_SECONDS,
        help="seconds without heartbeat before a node counts as stale",
    )
    parser.add_argument(
        "--approve",
        action="append",
        default=[],
        metavar="NODE",
        help="explicitly approve resuming a dangerous/undeclared node",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="report decisions without modifying state",
    )
    args = parser.parse_args()

    state_path = Path(args.state)

    if not state_path.exists():
        fail(f"runtime state not found: {state_path}")

    # Held until process exit: state is read, decided on and written
    # without any other task_state/task_recovery process interleaving.
    try:
        state_lock = StateLock(state_path).acquire()
    except LockTimeout as exc:
        fail(str(exc))

    state = load_state(state_path)
    graph = load_graph(state)
    budget = resolve_budget(args)
    at = now()

    for name in args.approve:
        if name not in graph["nodes"]:
            fail(f"unknown node {name!r} in --approve")

    decisions = {}

    for name, node in state["nodes"].items():
        if node.get("status") != "RUNNING":
            continue

        decisions[name] = classify(
            name,
            node,
            graph["nodes"][name],
            budget,
            args.stale_after,
            set(args.approve),
            at,
        )

    print("RECOVERY_MODE=" + ("DRY_RUN" if args.dry_run else "APPLY"))
    print(f"ATTEMPT_BUDGET={budget if budget is not None else 'unknown'}")

    changed = False

    for name in sorted(decisions):
        verdict, reason = decisions[name]
        print(f"NODE={name} VERDICT={verdict} REASON={reason}")

        if args.dry_run:
            continue

        node = state["nodes"][name]

        if verdict == "RESUMABLE":
            node["status"] = "READY"

            for key in (
                "started_at",
                "heartbeat_at",
                "owner_pid",
                "owner_pid_start",
                "operation",
            ):
                node.pop(key, None)

            node.setdefault("recoveries", []).append(
                {"at": at.isoformat(), "reason": reason}
            )
            changed = True
        elif verdict == "BUDGET_EXHAUSTED":
            node["status"] = "BLOCKED"
            node.setdefault("recoveries", []).append(
                {"at": at.isoformat(), "reason": reason}
            )
            changed = True

    if changed:
        state["updated_at"] = at.isoformat()
        atomic_write(state_path, state)

    resumable = sorted(
        n for n, (v, _) in decisions.items() if v == "RESUMABLE"
    )
    approval = sorted(
        n for n, (v, _) in decisions.items() if v == "NEEDS_APPROVAL"
    )
    blocked = sorted(
        n for n, (v, _) in decisions.items() if v == "BUDGET_EXHAUSTED"
    )
    active = sorted(
        n for n, (v, _) in decisions.items() if v == "ACTIVE"
    )
    unknown = sorted(
        n for n, (v, _) in decisions.items() if v == "UNKNOWN"
    )

    print("RESUMABLE=" + ",".join(resumable))
    print("NEEDS_APPROVAL=" + ",".join(approval))
    print("BUDGET_EXHAUSTED=" + ",".join(blocked))
    print("ACTIVE=" + ",".join(active))
    print("UNKNOWN=" + ",".join(unknown))

    # Exit 0: nothing to do or all handled. Exit 3: human action required.
    raise SystemExit(3 if (approval or blocked or unknown) else 0)


if __name__ == "__main__":
    main()
