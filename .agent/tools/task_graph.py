#!/usr/bin/env python3

import argparse
import json
import re
import sys
from collections import deque
from pathlib import Path


ALLOWED_NODE_TYPES = {
    "memory",
    "context_audit",
    "agent",
    "test",
    "command",
    "build",
    "browser",
    "regression",
    "handoff",
    "integration",
}

ALLOWED_AGENT_ROLES = {
    "implementer",
    "verifier",
    "reviewer",
}

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

SAFE_NODE_ID = re.compile(r"^[A-Za-z0-9._-]+$")


def fail(message):
    print(f"TASK_GRAPH_ERROR: {message}", file=sys.stderr)
    raise SystemExit(2)


def load_json(path):
    path = Path(path)

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"{path}: invalid JSON: {exc}")


def validate_graph(graph, allow_empty_task_id=False):
    errors = []

    if not isinstance(graph, dict):
        return ["graph root must be an object"], [], []

    if graph.get("schema_version") != 1:
        errors.append("unsupported schema_version")

    task_id = graph.get("task_id")

    if not isinstance(task_id, str):
        errors.append("task_id must be a string")
    elif not task_id.strip() and not allow_empty_task_id:
        errors.append("task_id must not be empty")

    nodes = graph.get("nodes")

    if not isinstance(nodes, dict) or not nodes:
        errors.append("nodes must be a non-empty object")
        return errors, [], []

    node_names = set(nodes)

    for name, node in nodes.items():
        if not isinstance(name, str) or not SAFE_NODE_ID.fullmatch(name):
            errors.append(f"invalid node id: {name!r}")
            continue

        if not isinstance(node, dict):
            errors.append(f"{name}: node must be an object")
            continue

        node_type = node.get("type")

        optional = node.get("optional", False)

        if not isinstance(optional, bool):
            errors.append(
                f"{name}: optional must be a boolean"
            )

        if node_type not in ALLOWED_NODE_TYPES:
            errors.append(
                f"{name}: unsupported node type {node_type!r}"
            )

        dependencies = node.get("depends_on")

        if not isinstance(dependencies, list):
            errors.append(f"{name}: depends_on must be an array")
            continue

        if len(dependencies) != len(set(dependencies)):
            errors.append(f"{name}: duplicate dependency")

        for dependency in dependencies:
            if not isinstance(dependency, str):
                errors.append(
                    f"{name}: dependency names must be strings"
                )
                continue

            if dependency == name:
                errors.append(f"{name}: node cannot depend on itself")

            if dependency not in node_names:
                errors.append(
                    f"{name}: unknown dependency {dependency!r}"
                )

        role = node.get("role")

        if node_type == "agent":
            if role not in ALLOWED_AGENT_ROLES:
                errors.append(
                    f"{name}: invalid or missing agent role {role!r}"
                )
        elif role is not None:
            errors.append(
                f"{name}: role is only valid for agent nodes"
            )

    if errors:
        return errors, [], []

    # Kahn topological sort.
    indegree = {
        name: len(node["depends_on"])
        for name, node in nodes.items()
    }

    dependents = {
        name: []
        for name in nodes
    }

    for name, node in nodes.items():
        for dependency in node["depends_on"]:
            dependents[dependency].append(name)

    queue = deque(
        sorted(
            name
            for name, degree in indegree.items()
            if degree == 0
        )
    )

    order = []

    while queue:
        current = queue.popleft()
        order.append(current)

        for dependent in sorted(dependents[current]):
            indegree[dependent] -= 1

            if indegree[dependent] == 0:
                queue.append(dependent)

    if len(order) != len(nodes):
        errors.append("graph contains a dependency cycle")
        return errors, [], []

    sinks = sorted(
        name
        for name, children in dependents.items()
        if not children
    )

    if not sinks:
        errors.append("graph has no terminal/sink node")

    return errors, order, sinks


def load_state(path, graph):
    if path is None:
        return {}

    state = load_json(path)

    if not isinstance(state, dict):
        fail("state root must be an object")

    states = state.get("nodes", {})

    if not isinstance(states, dict):
        fail("state.nodes must be an object")

    graph_nodes = set(graph["nodes"])

    for name, status in states.items():
        if name not in graph_nodes:
            fail(f"state contains unknown node {name!r}")

        if status not in ALLOWED_STATES:
            fail(
                f"state node {name!r} has invalid status "
                f"{status!r}"
            )

    return states


def calculate_ready(graph, states):
    ready = []

    for name, node in graph["nodes"].items():
        current = states.get(name, "PENDING")

        if current != "PENDING":
            continue

        dependencies = node["depends_on"]

        if all(
            states.get(dep, "PENDING") in SATISFIED_STATES
            for dep in dependencies
        ):
            ready.append(name)

    return sorted(ready)


parser = argparse.ArgumentParser(
    description="Validate and inspect COD-guerra Task Graph V1."
)

subparsers = parser.add_subparsers(
    dest="command",
    required=True,
)

validate_parser = subparsers.add_parser("validate")
validate_parser.add_argument("graph")
validate_parser.add_argument(
    "--allow-empty-task-id",
    action="store_true",
)

ready_parser = subparsers.add_parser("ready")
ready_parser.add_argument("graph")
ready_parser.add_argument("--state")
ready_parser.add_argument(
    "--allow-empty-task-id",
    action="store_true",
)

args = parser.parse_args()

graph = load_json(args.graph)

errors, order, sinks = validate_graph(
    graph,
    allow_empty_task_id=args.allow_empty_task_id,
)

if errors:
    for error in errors:
        print(f"TASK_GRAPH_ERROR: {error}", file=sys.stderr)

    raise SystemExit(2)

if args.command == "validate":
    print("GRAPH_VALID=PASS")
    print(f"NODE_COUNT={len(graph['nodes'])}")
    print("TOPOLOGICAL_ORDER=" + ",".join(order))
    print("SINKS=" + ",".join(sinks))
    raise SystemExit(0)

states = load_state(args.state, graph)
ready = calculate_ready(graph, states)

print("GRAPH_VALID=PASS")
print("READY=" + ",".join(ready))
