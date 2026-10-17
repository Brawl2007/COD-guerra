#!/usr/bin/env python3
"""Opt-in PAID Jev smoke pilot in Claude Code Web, with an explicit call cap.

No credentials stored or printed. Uses only the existing TypeSafe egress proxy.
Does not spawn agents, modify repo, merge, deploy or spend unless --online is set.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys

import jev_router

REPO = Path(__file__).resolve().parents[2]
BRANCH = "infra/claude-web-single-captain-v1"
MAX_CALLS = 20
OFFICIAL_URL = "https://api.typesafe.ai"


def git(*args: str) -> str:
    result = subprocess.run(["git", "-C", str(REPO), *args],
                            text=True, capture_output=True, timeout=8, check=False)
    if result.returncode:
        raise RuntimeError("Git state unavailable")
    return result.stdout.strip()


def guard(env: dict, online: bool) -> dict:
    branch = git("symbolic-ref", "--short", "HEAD")
    head = git("rev-parse", "HEAD")
    if branch != BRANCH:
        raise RuntimeError("Only the approved infrastructure branch may run paid Jev")
    if git("status", "--porcelain", "--untracked-files=normal"):
        raise RuntimeError("Checkout is not clean; stop before paid calls")
    if online and env.get("CLAUDE_CODE_REMOTE") != "true":
        raise RuntimeError("Paid Jev pilot allowed only in Claude Code Web")
    base = (env.get("TYPESAFE_BASE_URL") or OFFICIAL_URL).rstrip("/")
    if base != OFFICIAL_URL:
        raise RuntimeError("Non-official TypeSafe endpoint blocked")
    return {"branch": branch, "head": head}


def invoke(*, role: str, risk: str, complexity: str, description: str,
           online: bool, env: dict) -> dict:
    checked = guard(env, online)
    safe = " ".join(description.split())[:240]
    if not safe:
        raise RuntimeError("An explicit, non-sensitive task description is required")
    # Override secrets and pilot state in process memory; proxy owns authentication.
    e = dict(env, COD_JEV_PILOT="1", COD_JEV_AUTH="proxy",
             TYPESAFE_API_KEY="", COD_JEV_KEY_FILE=os.devnull,
             TYPESAFE_BASE_URL=OFFICIAL_URL)
    outcome = jev_router.route(
        {"role": role, "risk": risk, "complexity": complexity,
         "description": safe, "read_only": role == "explore"},
        enable_jev=True, offline=not online, env=e,
        limit_flag=MAX_CALLS,
        run_id="CLAUDE-WEB-JEV-20-CALL-PILOT",
    )
    return {
        "branch": checked["branch"], "head": checked["head"],
        "mode": "paid_pilot" if online else "offline_preview",
        "max_project_ledger_calls": MAX_CALLS,
        "recommendation_model": outcome["recommendation_model"],
        "recommended_agent": outcome["recommended_agent"],
        "source": outcome["source"], "reason": outcome.get("reason"),
        "confidence": outcome.get("confidence"),
        "usage": outcome.get("usage"),
        "jev_model": outcome.get("jev_model"),
        "provider_billing_verified": False,
        "note": "Only source=jev plus usage proves an API response. The local 20-call cap is not a dollar or provider account limit.",
    }


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--role", required=True, choices=("explore", "implement", "verify", "review"))
    p.add_argument("--risk", default="medium", choices=("low", "medium", "high"))
    p.add_argument("--complexity", default="medium", choices=("low", "medium", "high"))
    p.add_argument("--description", required=True)
    p.add_argument("--online", action="store_true",
                   help="OPT IN: permits one real TypeSafe Jev call if rules are ambiguous")
    p.add_argument("--json", action="store_true")
    a = p.parse_args(argv)
    try:
        result = invoke(role=a.role, risk=a.risk, complexity=a.complexity,
                        description=a.description, online=a.online, env=os.environ)
    except (RuntimeError, OSError, ValueError, subprocess.TimeoutExpired) as exc:
        print("JEV_PILOT_BLOCKED: " + str(exc), file=sys.stderr)
        return 2
    if a.json:
        print(json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2))
    else:
        print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
