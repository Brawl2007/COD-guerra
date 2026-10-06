#!/usr/bin/env python3

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


SAFE_ID = re.compile(r"[^A-Za-z0-9._-]+")


def clean_id(value: str) -> str:
    value = SAFE_ID.sub("-", value.strip())
    value = value.strip("-")
    return value or "unknown"


parser = argparse.ArgumentParser(
    description="Append one COD-guerra agentic execution event to JSONL."
)

parser.add_argument("--run-id", required=True)
parser.add_argument("--task-id", required=True)
parser.add_argument("--node", required=True)
parser.add_argument("--event", required=True)

parser.add_argument("--attempt", type=int, default=0)
parser.add_argument("--agent", default="")
parser.add_argument("--status", default="")
parser.add_argument("--head", default="")
parser.add_argument("--message", default="")

args = parser.parse_args()

run_id = clean_id(args.run_id)
task_id = clean_id(args.task_id)

run_dir = Path(".agent/runs") / run_id
run_dir.mkdir(parents=True, exist_ok=True)

event = {
    "event_version": 1,
    "timestamp": datetime.now(timezone.utc).isoformat(),
    "run_id": run_id,
    "task_id": task_id,
    "node": args.node,
    "event": args.event,
    "attempt": args.attempt,
    "agent": args.agent,
    "status": args.status,
    "head": args.head,
    "message": args.message,
}

with (run_dir / "events.jsonl").open("a", encoding="utf-8") as f:
    f.write(json.dumps(event, ensure_ascii=False, separators=(",", ":")) + "\n")
