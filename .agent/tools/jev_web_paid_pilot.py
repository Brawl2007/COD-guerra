#!/usr/bin/env python3
"""Opt-in Jev decision pilot in Claude Code Web, with local estimated USD guard.

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
import tempfile

import jev_router
import jev_decisions

REPO = Path(__file__).resolve().parents[2]
BRANCH = "infra/claude-web-single-captain-v1"
MAX_SPEND_USD = jev_router.CLOUD_WEB_BUDGET_USD
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
    e = paid_env(env, online)
    outcome = jev_router.route(
        {"role": role, "risk": risk, "complexity": complexity,
         "description": safe, "read_only": role == "explore"},
        enable_jev=True, offline=not online, env=e,
        limit_flag=None,
        run_id="CLAUDE-WEB-JEV-20-CALL-PILOT",
    )
    return {
        "branch": checked["branch"], "head": checked["head"],
        "mode": "paid_pilot" if online else "offline_preview",
        "max_project_ledger_calls": None, "local_estimated_usd_cap": MAX_SPEND_USD,
        "recommendation_model": outcome["recommendation_model"],
        "recommended_agent": outcome["recommended_agent"],
        "source": outcome["source"], "reason": outcome.get("reason"),
        "confidence": outcome.get("confidence"),
        "usage": outcome.get("usage"),
        "jev_model": outcome.get("jev_model"),
        "provider_billing_verified": False,
        "note": "Only source=jev plus usage proves an API response. The local 20-call cap is not a dollar or provider account limit.",
    }


def paid_env(env: dict, online: bool) -> dict:
    """Never mutate global environment; paid approval exists only in child call."""
    return dict(env, COD_JEV_PILOT="1", COD_JEV_AUTH="proxy",
                COD_JEV_WEB_PAID_APPROVED="1" if online else "0",
                TYPESAFE_API_KEY="", COD_JEV_KEY_FILE=os.devnull,
                TYPESAFE_BASE_URL=OFFICIAL_URL)


def read_scoped_payload(filename: str) -> dict:
    """Read small user-prepared JSON in /tmp only, never arbitrary cloud secrets."""
    path = Path(filename).resolve()
    if not path.is_relative_to(Path(tempfile.gettempdir()).resolve()):
        raise RuntimeError("Structured decision input must be in the temporary directory")
    if not path.is_file() or path.stat().st_size > 8192:
        raise RuntimeError("Input must be an existing JSON file of at most 8 KiB")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise RuntimeError("JSON decision input must be an object")
    return data


def invoke_decision(*, capability: str, payload: dict, online: bool, env: dict) -> dict:
    """Use existing six-capability safety filters; never run game or Git actions."""
    checked = guard(env, online)
    output = jev_decisions.decide(
        capability, payload, enable_jev=True, offline=not online,
        env=paid_env(env, online), limit_flag=None,
        run_id="CLAUDE-WEB-JEV-US5-BUDGET",
    )
    return {
        "branch": checked["branch"], "head": checked["head"],
        "mode": "paid_pilot" if online else "offline_preview",
        "capability": capability, "result": output,
        "max_project_ledger_calls": None,
        "local_estimated_usd_cap": MAX_SPEND_USD,
        "provider_billing_verified": False,
        "note": "Advisory only. Cloud ledger is ephemeral; provider prepaid balance is the real financial bound.",
    }


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--role", choices=("explore", "implement", "verify", "review"))
    p.add_argument("--capability", choices=jev_decisions.CAPABILITIES,
                   help="One of the six existing Jev structured decision types")
    p.add_argument("--input", help="JSON object saved under /tmp, max 8 KiB")
    p.add_argument("--risk", default="medium", choices=("low", "medium", "high"))
    p.add_argument("--complexity", default="medium", choices=("low", "medium", "high"))
    p.add_argument("--description")
    p.add_argument("--online", action="store_true",
                   help="OPT IN: permits one real TypeSafe Jev call if rules are ambiguous")
    p.add_argument("--json", action="store_true")
    a = p.parse_args(argv)
    if a.capability:
        if not a.input:
            p.error("--capability requires --input")
    elif not a.role or not a.description:
        p.error("Specify --role plus --description, or --capability plus --input")
    try:
        if a.capability:
            result = invoke_decision(capability=a.capability,
                                     payload=read_scoped_payload(a.input),
                                     online=a.online, env=os.environ)
        else:
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
