#!/usr/bin/env python3

import json
import os
import re
import subprocess
import sys


PROTECTED_BRANCHES = {"main", "master"}


def deny(reason):
    print(
        f"BLOCKED by COD-guerra Git Safety: {reason}",
        file=sys.stderr,
    )
    sys.exit(2)


def current_branch(cwd):
    try:
        result = subprocess.run(
            ["git", "-C", cwd, "branch", "--show-current"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
        return result.stdout.strip()
    except Exception:
        return ""


try:
    payload = json.load(sys.stdin)
except Exception as exc:
    deny(f"invalid hook input: {exc}")

tool_name = payload.get("tool_name", "")
tool_input = payload.get("tool_input") or {}

cwd = (
    payload.get("cwd")
    or os.environ.get("CLAUDE_PROJECT_DIR")
    or os.getcwd()
)

branch = current_branch(cwd)

# Direct file-editing tools must never modify a protected branch.
if tool_name in {"Edit", "Write", "MultiEdit"}:
    if branch in PROTECTED_BRANCHES:
        deny(
            f"{tool_name} attempted while checked out on "
            f"protected branch '{branch}'. Create/switch to a work branch first."
        )
    sys.exit(0)

if tool_name != "Bash":
    sys.exit(0)

command = str(tool_input.get("command", ""))

# Operations dangerous regardless of current branch.
dangerous_patterns = [
    (
        r"\bgit\s+reset\b[^\n;&|]*--hard\b",
        "git reset --hard is forbidden",
    ),
    (
        r"\bgit\s+clean\b[^\n;&|]*\s-[^\s;&|]*f[^\s;&|]*",
        "forced git clean is forbidden",
    ),
    (
        r"\bgit\s+branch\s+-D\b",
        "forced branch deletion is forbidden",
    ),
    (
        r"\bgit\s+push\b[^\n;&|]*(?:--force(?:-with-lease)?|-f(?:\s|$))",
        "force push is forbidden",
    ),
    (
        r"\bgit\s+push\b[^\n;&|]*(?:^|[\s:])(?:refs/heads/)?main(?:$|[\s:])",
        "direct push to main is forbidden",
    ),
    (
        r"\bgit\s+push\b[^\n;&|]*HEAD:(?:refs/heads/)?main\b",
        "pushing HEAD to main is forbidden",
    ),
    (
        r"\bgit\s+branch\s+(?:-d|-D)\s+main\b",
        "deleting main is forbidden",
    ),
    (
        r"\bgit\s+(?:switch|checkout)\b[^\n;&|]*(?:-C|-B)\s+main\b",
        "resetting/recreating main is forbidden",
    ),
]

for pattern, reason in dangerous_patterns:
    if re.search(pattern, command):
        deny(reason)

# If currently on main/master, block Git operations that can mutate it.
if branch in PROTECTED_BRANCHES:
    protected_mutations = re.search(
        r"\bgit\s+"
        r"(?:add|commit|merge|rebase|cherry-pick|revert|am|apply|restore|reset)"
        r"\b",
        command,
    )

    if protected_mutations:
        deny(
            f"mutating Git operation attempted on protected branch '{branch}'"
        )

    if re.search(r"\bgit\s+push\b", command):
        deny(
            f"git push attempted while checked out on protected branch '{branch}'"
        )

sys.exit(0)
