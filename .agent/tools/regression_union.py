#!/usr/bin/env python3

import argparse
import json
import sys
from pathlib import Path


ALLOWED_KINDS = {
    "test",
    "build",
    "browser",
    "runtime",
    "persistence",
    "performance",
    "manual",
}


def fail(message):
    print(f"REGRESSION_LEDGER_ERROR: {message}", file=sys.stderr)
    raise SystemExit(2)


parser = argparse.ArgumentParser(
    description="Union accepted COD-guerra regression obligation records."
)
parser.add_argument(
    "--records-dir",
    default=".agent/regression/records",
)
args = parser.parse_args()

records_dir = Path(args.records_dir)

if not records_dir.exists():
    fail(f"records directory does not exist: {records_dir}")

records = []
obligations = {}

for path in sorted(records_dir.glob("*.json")):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"{path}: invalid JSON: {exc}")

    if data.get("schema_version") != 1:
        fail(f"{path}: unsupported schema_version")

    task_id = str(data.get("task_id", "")).strip()
    accepted_head = str(data.get("accepted_head", "")).strip()
    status = str(data.get("status", "")).strip()

    if not task_id:
        fail(f"{path}: missing task_id")

    if not accepted_head:
        fail(f"{path}: missing accepted_head")

    if status != "ACCEPTED":
        fail(f"{path}: durable regression record must be ACCEPTED")

    raw_obligations = data.get("obligations")

    if not isinstance(raw_obligations, list):
        fail(f"{path}: obligations must be an array")

    records.append({
        "task_id": task_id,
        "accepted_head": accepted_head,
        "path": str(path),
    })

    for item in raw_obligations:
        if not isinstance(item, dict):
            fail(f"{path}: obligation must be an object")

        obligation_id = str(item.get("id", "")).strip()
        kind = str(item.get("kind", "")).strip()
        check = str(item.get("check", "")).strip()
        reason = str(item.get("reason", "")).strip()

        if not obligation_id:
            fail(f"{path}: obligation missing id")

        if kind not in ALLOWED_KINDS:
            fail(
                f"{path}: obligation {obligation_id}: "
                f"unsupported kind '{kind}'"
            )

        if not check:
            fail(f"{path}: obligation {obligation_id}: missing check")

        definition = {
            "id": obligation_id,
            "kind": kind,
            "check": check,
        }

        existing = obligations.get(obligation_id)

        if existing is not None:
            if (
                existing["kind"] != kind
                or existing["check"] != check
            ):
                fail(
                    f"conflicting definition for obligation "
                    f"'{obligation_id}'"
                )

            existing["sources"].append({
                "task_id": task_id,
                "accepted_head": accepted_head,
                "reason": reason,
                "record": str(path),
            })
            continue

        obligations[obligation_id] = {
            **definition,
            "sources": [
                {
                    "task_id": task_id,
                    "accepted_head": accepted_head,
                    "reason": reason,
                    "record": str(path),
                }
            ],
        }

result = {
    "schema_version": 1,
    "record_count": len(records),
    "obligation_count": len(obligations),
    "records": records,
    "obligations": [
        obligations[key]
        for key in sorted(obligations)
    ],
}

print(json.dumps(result, ensure_ascii=False, indent=2))
