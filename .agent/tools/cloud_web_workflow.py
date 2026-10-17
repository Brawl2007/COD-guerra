#!/usr/bin/env python3
"""Offline, fail-closed dispatch and verification for ONE Claude Code Web Captain.

Does not start agents, call APIs, install tools, merge, deploy or write project files.
The Captain invokes the proposed specialist subagents in Claude Code Web itself.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys

PROJECT = Path(__file__).resolve().parents[2]
WORK_BRANCH = "infra/claude-web-single-captain-v1"
SAFE_ROOTS = (".agent/tools/", ".agent/tests/", ".claude/agents/", ".claude/hooks/", "docs/direction/")
PHASES = ("scan", "edit", "verify", "review")
ROLES = {"scan": "explore", "edit": "implement", "verify": "verify", "review": "review"}
DEFAULT_AGENTS = {"scan": "haiku-low", "edit": "implementer", "verify": "verifier", "review": "reviewer"}


class Blocked(Exception):
    pass


def git(root: Path, *args: str) -> str:
    p = subprocess.run(["git", "-C", str(root), *args], text=True,
                       capture_output=True, timeout=8, check=False)
    if p.returncode:
        raise Blocked("Git identity unavailable; refusing dispatch")
    return p.stdout.strip()


def identity(root: Path, expected_sha: str = "") -> dict:
    branch = git(root, "symbolic-ref", "--short", "HEAD")
    head = git(root, "rev-parse", "HEAD")
    if branch != WORK_BRANCH:
        raise Blocked(f"branch {branch!r} is not the approved infrastructure branch")
    if expected_sha and head != expected_sha:
        raise Blocked("HEAD changed: recheck plan and evidence before proceeding")
    if git(root, "status", "--porcelain", "--untracked-files=normal"):
        raise Blocked("dirty checkout: do not dispatch over work in progress")
    return {"branch": branch, "head": head}


def scope(files: list[str]) -> list[str]:
    if not files:
        raise Blocked("explicit --file scope required")
    cleaned = []
    for name in files:
        p = Path(name)
        if (p.is_absolute() or ".." in p.parts or not p.parts
                or not any(name.startswith(prefix) for prefix in SAFE_ROOTS)):
            raise Blocked("file outside infrastructure allowlist: " + name)
        if name not in cleaned:
            cleaned.append(name)
    if len(cleaned) > 8:
        raise Blocked("maximum 8 scoped file paths; narrow the task")
    return cleaned


def jev_local(root: Path, role: str, description: str, risk: str) -> dict:
    """Reuse existing Jev rules IN PROCESS; explicit offline wins over proxy keys."""
    module_path = root / ".agent/tools/jev_router.py"
    if not module_path.is_file():
        raise Blocked("offline Jev module missing")
    spec = importlib.util.spec_from_file_location("cod_jev_offline", module_path)
    if spec is None or spec.loader is None:
        raise Blocked("cannot load offline Jev")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    result = module.route({"role": role, "description": description[:240],
                           "risk": risk, "complexity": "medium",
                           "read_only": role == "explore"},
                          offline=True, enable_jev=True,
                          env={"COD_JEV_PILOT": "1", "COD_JEV_AUTH": "proxy"})
    if result.get("source") not in ("rule", "rule_fallback") or result.get("usage"):
        raise Blocked("offline Jev invariant violated")
    if result.get("source") == "rule_fallback" and result.get("reason") != "offline":
        raise Blocked("Jev returned a non-offline fallback")
    return {"model": result["recommendation_model"],
            "source": result["source"], "agent_hint": result["recommended_agent"]}


def plan(a: argparse.Namespace) -> dict:
    root = Path(a.root).resolve()
    ident = identity(root, a.expect_sha)
    paths = scope(a.file)
    if not re.fullmatch(r"INFRA-[A-Za-z0-9_-]{2,48}", a.task_id):
        raise Blocked("task-id must be INFRA-...; gameplay/M01 tasks prohibited")
    description = " ".join(a.description.split())[:240]
    if not description:
        raise Blocked("description required")
    phases = ("scan",) if a.read_only else PHASES
    dispatch = []
    for phase in phases:
        routed = jev_local(root, ROLES[phase], description, a.risk)
        agent = DEFAULT_AGENTS[phase]
        if phase == "review" and routed["model"] == "opus":
            agent = "CAPTAIN_REVIEW"  # Never create an additional Opus session.
        dispatch.append({"phase": phase, "agent": agent, "model": routed["model"],
                         "offline_router": routed["source"],
                         "instruction": {
                             "scan": "Read only; report at most 8 path:line findings; do not edit or run network calls.",
                             "edit": "Change ONLY scoped files; focused checks; send diff summary, not full logs.",
                             "verify": "Independent verification; report commands, SHA and actual PASS/FAIL.",
                             "review": "Independent review of tested diff; report ACCEPT/REJECT and evidence.",
                         }[phase]})
    return {"schema_version": 1, "task_id": a.task_id, "description": description,
            **ident, "scope": paths, "read_only": bool(a.read_only),
            "max_simultaneous_workers": 1, "router": "Jev local offline; no TypeSafe",
            "phases": dispatch, "suggested_token_stop": a.token_stop,
            "token_limit_is_enforced": False,
            "restrictions": "No second captain, Agent Teams, M01, paid APIs, main, PR80/84, deploy, force-push, cloud-state publication."}


def verify(a: argparse.Namespace) -> dict:
    root = Path(a.root).resolve()
    ident = identity(root)
    report = json.loads(Path(a.report).read_text(encoding="utf-8"))
    if not isinstance(report, dict) or report.get("schema_version") != 1:
        raise Blocked("invalid report format")
    if report.get("branch") != ident["branch"] or report.get("head") != ident["head"]:
        raise Blocked("report HEAD/branch does not match clean checkout")
    if not re.fullmatch(r"INFRA-[A-Za-z0-9_-]{2,48}", str(report.get("task_id", ""))):
        raise Blocked("invalid infrastructure task-id")
    expected = ("scan",) if report.get("read_only") is True else PHASES
    phases = report.get("phases")
    if not isinstance(phases, dict) or set(phases) != set(expected):
        raise Blocked("missing or unexpected phase evidence")
    tokens = 0
    for phase in expected:
        item = phases[phase]
        if not isinstance(item, dict) or item.get("status") != "PASS":
            raise Blocked("phase not PASS: " + phase)
        if not isinstance(item.get("evidence"), str) or not item["evidence"].strip():
            raise Blocked("missing evidence: " + phase)
        if not isinstance(item.get("agent"), str) or not item["agent"].strip():
            raise Blocked("missing agent identity: " + phase)
        count = item.get("tokens")
        if not isinstance(count, int) or isinstance(count, bool) or count < 0:
            raise Blocked("token measurement missing or invalid: " + phase)
        tokens += count
    if not report.get("read_only"):
        if (phases["edit"]["agent"] == phases["verify"]["agent"]
                or phases["edit"]["agent"] == phases["review"]["agent"]):
            raise Blocked("implementer and independent checks cannot use the same agent identity")
    cap = report.get("token_stop")
    if not isinstance(cap, int) or isinstance(cap, bool) or not 100 <= cap <= 200000:
        raise Blocked("missing/invalid token stop threshold")
    if tokens > cap:
        raise Blocked(f"reported tokens {tokens} exceed soft stop threshold {cap}; stop and review")
    return {"result": "PASS", "task_id": report["task_id"], "branch": ident["branch"],
            "head": ident["head"], "phases_passed": len(expected),
            "reported_tokens": tokens, "token_stop": cap,
            "note": "Reported tokens are self-reported, not metered or a hard cap. No API/agent run was launched by this script."}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subs = parser.add_subparsers(dest="cmd", required=True)
    p = subs.add_parser("plan", help="Print minimal, offline staged subagent plan")
    p.add_argument("--task-id", required=True)
    p.add_argument("--description", required=True)
    p.add_argument("--file", action="append", required=True)
    p.add_argument("--risk", choices=("low", "medium", "high"), default="medium")
    p.add_argument("--read-only", action="store_true")
    p.add_argument("--token-stop", type=int, default=25000)
    p.add_argument("--expect-sha", default="")
    v = subs.add_parser("verify", help="Validate independent phase evidence and budget")
    v.add_argument("--report", required=True)
    for sub in (p, v):
        sub.add_argument("--root", default=str(PROJECT))
    a = parser.parse_args(argv)
    try:
        if a.cmd == "plan" and not 100 <= a.token_stop <= 200000:
            raise Blocked("token-stop must be 100..200000")
        result = plan(a) if a.cmd == "plan" else verify(a)
    except (Blocked, OSError, ValueError, ImportError, subprocess.TimeoutExpired) as e:
        print("BLOCKED: " + str(e), file=sys.stderr)
        return 2
    print(json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
