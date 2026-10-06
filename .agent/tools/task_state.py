#!/usr/bin/env python3

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


ALLOWED_STATES = {
    "PENDING",
    "READY",
    "RUNNING",
    "PASS",
    "FAIL",
    "BLOCKED",
    "SKIPPED",
}

SATISFIED_STATES = {
    "PASS",
    "SKIPPED",
}

SAFE_ID = re.compile(r"[^A-Za-z0-9._-]+")


def fail(message):
    print(f"TASK_STATE_ERROR: {message}", file=sys.stderr)
    raise SystemExit(2)


def now():
    return datetime.now(timezone.utc).isoformat()


def clean_id(value):
    value = SAFE_ID.sub("-", value.strip()).strip("-")
    return value or "unknown"


def load_json(path):
    path = Path(path)

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"{path}: invalid JSON: {exc}")


def atomic_write(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    temp = path.with_suffix(path.suffix + ".tmp")

    temp.write_text(
        json.dumps(
            data,
            ensure_ascii=False,
            indent=2,
        ) + "\n",
        encoding="utf-8",
    )

    temp.replace(path)


def validate_graph(graph_path):
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
        message = result.stderr.strip() or result.stdout.strip()
        fail(f"graph validation failed: {message}")


def load_graph(path):
    validate_graph(path)

    graph = load_json(path)

    if not isinstance(graph.get("nodes"), dict):
        fail("graph nodes missing")

    return graph


def refresh_ready(graph, state):
    changed = True

    while changed:
        changed = False

        for name, definition in graph["nodes"].items():
            node_state = state["nodes"][name]

            if node_state["status"] != "PENDING":
                continue

            dependencies = definition.get("depends_on", [])

            if all(
                state["nodes"][dependency]["status"]
                in SATISFIED_STATES
                for dependency in dependencies
            ):
                node_state["status"] = "READY"
                changed = True


def downstream_nodes(graph, start):
    dependents = {
        name: []
        for name in graph["nodes"]
    }

    for name, definition in graph["nodes"].items():
        for dependency in definition.get("depends_on", []):
            dependents[dependency].append(name)

    found = set()
    stack = list(dependents[start])

    while stack:
        current = stack.pop()

        if current in found:
            continue

        found.add(current)
        stack.extend(dependents[current])

    return found


def load_runtime_state(path):
    state = load_json(path)

    if state.get("schema_version") != 1:
        fail("unsupported runtime state schema")

    if not isinstance(state.get("nodes"), dict):
        fail("runtime state nodes missing")

    return state


def graph_from_state(state):
    graph_path = state.get("graph")

    if not graph_path:
        fail("runtime state has no graph path")

    return load_graph(graph_path)


def save_state(path, graph, state):
    refresh_ready(graph, state)
    state["updated_at"] = now()
    atomic_write(path, state)


parser = argparse.ArgumentParser(
    description="Manage COD-guerra Task Graph runtime state."
)

sub = parser.add_subparsers(
    dest="command",
    required=True,
)

init_parser = sub.add_parser("init")
init_parser.add_argument("--graph", required=True)
init_parser.add_argument("--run-id", required=True)
init_parser.add_argument("--task-id", required=True)

set_parser = sub.add_parser("set")
set_parser.add_argument("--state", required=True)
set_parser.add_argument("--node", required=True)
set_parser.add_argument(
    "--status",
    required=True,
    choices=sorted(ALLOWED_STATES),
)

retry_parser = sub.add_parser("retry")
retry_parser.add_argument("--state", required=True)
retry_parser.add_argument("--node", required=True)

reopen_parser = sub.add_parser("reopen")
reopen_parser.add_argument("--state", required=True)
reopen_parser.add_argument("--node", required=True)

ready_parser = sub.add_parser("ready")
ready_parser.add_argument("--state", required=True)

show_parser = sub.add_parser("show")
show_parser.add_argument("--state", required=True)

args = parser.parse_args()


if args.command == "init":
    run_id = clean_id(args.run_id)
    task_id = clean_id(args.task_id)

    graph_path = Path(args.graph)
    graph = load_graph(graph_path)

    state_path = (
        Path(".agent/runs")
        / run_id
        / "graph_state.json"
    )

    if state_path.exists():
        fail(
            f"runtime state already exists: {state_path}"
        )

    state = {
        "schema_version": 1,
        "run_id": run_id,
        "task_id": task_id,
        "graph": str(graph_path),
        "created_at": now(),
        "updated_at": now(),
        "nodes": {
            name: {
                "status": "PENDING",
                "attempts": 0,
            }
            for name in graph["nodes"]
        },
    }

    save_state(state_path, graph, state)

    print("STATE_INIT=PASS")
    print(f"STATE_PATH={state_path}")

    ready = [
        name
        for name, node in state["nodes"].items()
        if node["status"] == "READY"
    ]

    print("READY=" + ",".join(sorted(ready)))
    raise SystemExit(0)


state_path = Path(args.state)

if not state_path.exists():
    fail(f"runtime state not found: {state_path}")

state = load_runtime_state(state_path)
graph = graph_from_state(state)

graph_nodes = set(graph["nodes"])

if set(state["nodes"]) != graph_nodes:
    fail("runtime state nodes do not match graph")


if args.command == "set":
    node = args.node

    if node not in graph_nodes:
        fail(f"unknown node {node!r}")

    current = state["nodes"][node]["status"]
    target = args.status

    optional = bool(
        graph["nodes"][node].get("optional", False)
    )

    transitions = {
        "READY": {
            "RUNNING",
            "BLOCKED",
        },
        "RUNNING": {
            "PASS",
            "FAIL",
            "BLOCKED",
        },
    }

    if optional:
        transitions["READY"].add("SKIPPED")
        transitions["RUNNING"].add("SKIPPED")

    if target not in transitions.get(current, set()):
        fail(
            f"invalid transition for {node}: "
            f"{current} -> {target}"
        )

    state["nodes"][node]["status"] = target

    if target == "RUNNING":
        state["nodes"][node]["attempts"] += 1

    save_state(state_path, graph, state)

    print("STATE_UPDATE=PASS")
    print(f"NODE={node}")
    print(f"STATUS={target}")
    print(
        "ATTEMPTS="
        + str(state["nodes"][node]["attempts"])
    )

    raise SystemExit(0)


if args.command == "retry":
    node = args.node

    if node not in graph_nodes:
        fail(f"unknown node {node!r}")

    current = state["nodes"][node]["status"]

    if current != "FAIL":
        fail(
            f"retry requires FAIL state; "
            f"{node} is {current}"
        )

    state["nodes"][node]["status"] = "READY"

    save_state(state_path, graph, state)

    print("RETRY_READY=PASS")
    print(f"NODE={node}")
    print(
        "ATTEMPTS="
        + str(state["nodes"][node]["attempts"])
    )

    raise SystemExit(0)


if args.command == "reopen":
    node = args.node

    if node not in graph_nodes:
        fail(f"unknown node {node!r}")

    affected = {
        node,
        *downstream_nodes(graph, node),
    }

    running = sorted(
        name
        for name in affected
        if state["nodes"][name]["status"] == "RUNNING"
    )

    if running:
        fail(
            "cannot reopen subgraph while nodes are RUNNING: "
            + ",".join(running)
        )

    for name in affected:
        state["nodes"][name]["status"] = "PENDING"

    save_state(state_path, graph, state)

    print("SUBGRAPH_REOPEN=PASS")
    print(f"ROOT={node}")
    print("RESET=" + ",".join(sorted(affected)))

    ready = sorted(
        name
        for name in affected
        if state["nodes"][name]["status"] == "READY"
    )

    print("READY=" + ",".join(ready))
    raise SystemExit(0)


if args.command == "ready":
    ready = sorted(
        name
        for name, node in state["nodes"].items()
        if node["status"] == "READY"
    )

    print("READY=" + ",".join(ready))
    raise SystemExit(0)


if args.command == "show":
    print(
        json.dumps(
            state,
            ensure_ascii=False,
            indent=2,
        )
    )
