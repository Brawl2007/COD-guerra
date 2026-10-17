#!/usr/bin/env python3
"""Read-only audit of COD-guerra Claude Code Web migration; no network/write calls."""
from __future__ import annotations

import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
AGENTS = {
    "captain": ("opus", 0),
    "implementer": ("sonnet", 24),
    "verifier": ("sonnet", 14),
    "reviewer": ("sonnet", 12),
    "reviewer-critical": ("opus", 8),
    "explorer": ("haiku", 8),
    "Explore": ("haiku", 8),
    "researcher": ("haiku", 8),
}
# The Linux roster has 30 versioned definitions. All 29 worker types remain
# available to the Captain, but only scoped workers may run in a given session.
AGENTS.update({
    "implementer-deep": ("sonnet", 24),
    "perf-auditor": ("sonnet", 12),
})
for family, limits in {
    "haiku": {"low": 8, "medium": 10, "high": 12, "xhigh": 10, "max": 10},
    "sonnet": {"low": 14, "medium": 24, "high": 24, "xhigh": 24, "max": 24},
    "opus": {"low": 8, "medium": 8, "high": 10, "xhigh": 10, "max": 10},
    "fable": {"low": 6, "medium": 6, "high": 8, "xhigh": 8, "max": 8},
}.items():
    for effort_name, limit in limits.items():
        AGENTS[f"{family}-{effort_name}"] = (family, limit)
REQUIRED = ("CLAUDE.md", "AGENTS.md", ".claude/settings.json",
            ".claude/hooks/session-start.sh", ".claude/hooks/git-safety.py")
ERRORS: list[str] = []


def report(level: str, item: str, value: str) -> None:
    print(f"{level}: {item}: {value}")


def frontmatter(path: Path) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ValueError("missing opening YAML delimiter")
    try:
        block = text.split("---\n", 2)[1]
    except IndexError as exc:
        raise ValueError("missing closing YAML delimiter") from exc
    fields = {}
    for line in block.splitlines():
        match = re.match(r"^([A-Za-z][A-Za-z0-9]*):\s*(.*?)\s*$", line)
        if match:
            fields[match.group(1)] = match.group(2)
    return fields


def command_version(name: str) -> str:
    executable = shutil.which(name)
    if executable is None:
        return "NOT FOUND"
    try:
        result = subprocess.run([executable, "--version"], text=True,
                                capture_output=True, timeout=5, check=False)
        value = (result.stdout or result.stderr).strip().splitlines()
        return value[0][:120] if value else f"present (exit {result.returncode})"
    except (OSError, subprocess.TimeoutExpired):
        return "present (version unavailable)"


def check_rtk() -> None:
    """Distinguish Rust Token Killer from the unrelated Rust Type Kit."""
    exe = shutil.which("rtk")
    if not exe:
        report("WARN", "RTK", "not installed in this VM; Linux setup is not shared")
        return
    try:
        result = subprocess.run([exe, "gain"], text=True, capture_output=True,
                                timeout=5, check=False)
        if result.returncode == 0:
            report("INFO", "RTK", "Rust Token Killer identified by rtk gain; hook activation NOT proven")
        else:
            report("WARN", "RTK", "rtk gain failed: verify this is Rust Token Killer (rtk-ai/rtk), not Rust Type Kit")
    except (OSError, subprocess.TimeoutExpired):
        report("WARN", "RTK", "rtk gain could not be verified in this environment")


def check_jev_offline() -> None:
    """Exercise Jev's real CLI with network-disabled flags and no credentials.

    --offline has to win even when COD_JEV_PILOT=1. If it does not, no
    credential is present, and the test reports an error instead of calling.
    """
    script = ROOT / ".agent/tools/jev_router.py"
    if not script.is_file():
        ERRORS.append("Jev router script missing")
        return
    env = dict(os.environ)
    env.update({
        "COD_JEV_PILOT": "1",
        "TYPESAFE_API_KEY": "",
        "COD_JEV_AUTH": "",
        "COD_JEV_KEY_FILE": os.devnull,
        "COD_JEV_LIMIT": "",
    })
    cmd = [sys.executable, "-B", str(script), "route", "--role", "implement",
           "--risk", "medium", "--complexity", "medium",
           "--description", "Cloud Web offline readiness audit",
           "--offline", "--json"]
    try:
        result = subprocess.run(cmd, env=env, capture_output=True,
                                text=True, check=False, timeout=10)
        data = json.loads(result.stdout) if result.returncode == 0 else {}
        if (result.returncode == 0 and data.get("source") == "rule_fallback"
                and data.get("reason") == "offline"):
            report("INFO", "Jev", "offline routing PASS; no TypeSafe request or token charge")
        else:
            ERRORS.append("Jev offline safety check did not return fallback=offline")
    except (OSError, subprocess.TimeoutExpired, ValueError):
        ERRORS.append("Jev offline safety check could not complete")


def has_rtk_project_hook(settings: dict) -> bool:
    """Report only the versioned hook; user/VM global hooks remain unknown."""
    entries = settings.get("hooks", {}).get("PreToolUse", [])
    return any("rtk" in str(h.get("command", "")).lower()
               for entry in entries if isinstance(entry, dict)
               for h in entry.get("hooks", []) if isinstance(h, dict))


def main() -> int:
    ERRORS.clear()
    report("INFO", "root", str(ROOT))
    report("INFO", "remote", os.environ.get("CLAUDE_CODE_REMOTE", "unset"))
    for path in REQUIRED:
        if not (ROOT / path).is_file():
            ERRORS.append("missing " + path)
    settings = {}
    try:
        settings = json.loads((ROOT / ".claude/settings.json").read_text(encoding="utf-8"))
        if "PreToolUse" not in settings.get("hooks", {}):
            ERRORS.append("PreToolUse Git guard not configured")
        if "SessionStart" not in settings.get("hooks", {}):
            ERRORS.append("SessionStart hook not configured")
    except (OSError, ValueError) as exc:
        ERRORS.append("invalid settings.json: " + type(exc).__name__)
    agent_dir = ROOT / ".claude/agents"
    actual_names = {p.stem for p in agent_dir.glob("*.md")}
    if actual_names != set(AGENTS):
        ERRORS.append("agent roster mismatch: missing " + repr(sorted(set(AGENTS) - actual_names)) +
                      " extra " + repr(sorted(actual_names - set(AGENTS))))
    report("INFO", "project agent definitions", str(len(actual_names)))
    try:
        captain_file = (agent_dir / "captain.md").read_text(encoding="utf-8")
        allow = re.search(r"(?m)^tools: Agent\(([^)]*)\)", captain_file)
        allowed = {name.strip() for name in allow.group(1).split(",")} if allow else set()
        if allowed != set(AGENTS) - {"captain"}:
            ERRORS.append("Captain Agent(...) whitelist does not cover all 29 worker types")
    except OSError:
        ERRORS.append("Captain Agent(...) whitelist unavailable")
    for name, (model, turns) in AGENTS.items():
        path = ROOT / ".claude/agents" / (name + ".md")
        if not path.is_file():
            ERRORS.append("missing subagent " + name)
            continue
        try:
            fields = frontmatter(path)
            if fields.get("name") != name or fields.get("model") != model:
                ERRORS.append("identity/model mismatch in " + name)
            if turns and fields.get("maxTurns") != str(turns):
                ERRORS.append("maxTurns mismatch in " + name)
        except (OSError, ValueError) as exc:
            ERRORS.append("invalid subagent " + name + ": " + str(exc))
    for name in ("python3", "node", "npm", "git", "gh", "rtk", "claude"):
        report("INFO", "command " + name, command_version(name))
    try:
        git = subprocess.run(["git", "-C", str(ROOT), "branch", "--show-current"],
                             capture_output=True, text=True, timeout=5, check=False)
        branch = git.stdout.strip() or "DETACHED/UNKNOWN"
        report("INFO", "branch", branch)
        if branch in ("main", "master"):
            report("WARN", "branch", "protected; do not change project files here")
    except (OSError, subprocess.TimeoutExpired):
        report("WARN", "branch", "unavailable")
    check_rtk()
    report("INFO" if has_rtk_project_hook(settings) else "WARN",
           "RTK project hook",
           "present in project settings (execution not verified)" if has_rtk_project_hook(settings)
           else "not configured in project settings; a VM-global hook may exist")
    check_jev_offline()
    for name in ("ANTHROPIC_API_KEY", "TYPESAFE_API_KEY", "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS"):
        if os.environ.get(name):
            report("WARN", "env " + name, "SET (value deliberately hidden)")
    for issue in ERRORS:
        report("ERROR", "configuration", issue)
    report("RESULT", "preflight", "PASS" if not ERRORS else "FAIL")
    return int(bool(ERRORS))


if __name__ == "__main__":
    sys.exit(main())
