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
    "captain": ("sonnet", 0),
    "implementer": ("sonnet", 24),
    "verifier": ("sonnet", 14),
    "reviewer": ("sonnet", 12),
    "reviewer-critical": ("opus", 8),
    "explorer": ("haiku", 8),
    "Explore": ("haiku", 8),
    "researcher": ("haiku", 8),
}
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


def main() -> int:
    report("INFO", "root", str(ROOT))
    report("INFO", "remote", os.environ.get("CLAUDE_CODE_REMOTE", "unset"))
    for path in REQUIRED:
        if not (ROOT / path).is_file():
            ERRORS.append("missing " + path)
    try:
        settings = json.loads((ROOT / ".claude/settings.json").read_text(encoding="utf-8"))
        if "PreToolUse" not in settings.get("hooks", {}):
            ERRORS.append("PreToolUse Git guard not configured")
        if "SessionStart" not in settings.get("hooks", {}):
            ERRORS.append("SessionStart hook not configured")
    except (OSError, ValueError) as exc:
        ERRORS.append("invalid settings.json: " + type(exc).__name__)
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
    if not shutil.which("rtk"):
        report("WARN", "RTK", "not installed in this environment; do not assume Linux setup transferred")
    for name in ("ANTHROPIC_API_KEY", "TYPESAFE_API_KEY", "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS"):
        if os.environ.get(name):
            report("WARN", "env " + name, "SET (value deliberately hidden)")
    for issue in ERRORS:
        report("ERROR", "configuration", issue)
    report("RESULT", "preflight", "PASS" if not ERRORS else "FAIL")
    return int(bool(ERRORS))


if __name__ == "__main__":
    sys.exit(main())
