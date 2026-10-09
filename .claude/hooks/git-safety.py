#!/usr/bin/env python3

import json
import os
import re
import subprocess
import sys


PROTECTED_BRANCHES = {"main", "master"}

# `git` followed by any global options (-C <dir>, -c k=v, --no-pager, --git-dir=<p>, ...)
# before the subcommand, so `git -C ../x push origin main` is caught like `git push origin main`.
GIT = r"\bgit(?:\s+-[^\s;&|]+(?:\s+[^-\s;&|][^\s;&|]*)?)*\s+"
PROTECTED = r"(?:main|master)"


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


# Operations dangerous regardless of current branch.
DANGEROUS_PATTERNS = [
    (
        GIT + r"reset\b[^\n;&|]*--hard\b",
        "git reset --hard is forbidden",
    ),
    (
        GIT + r"clean\b[^\n;&|]*\s-[^\s;&|]*f[^\s;&|]*",
        "forced git clean is forbidden",
    ),
    (
        GIT + r"branch\s+-D\b",
        "forced branch deletion is forbidden",
    ),
    (
        GIT + r"push\b[^\n;&|]*(?:--force(?:-with-lease)?|-f(?:\s|$))",
        "force push is forbidden",
    ),
    (
        # `main`/`master` anywhere in the push arguments, whatever follows it (`;`, `"`, `)`, EOL...),
        # but not inside another ref name (origin/main, maintenance, feature/main-fix).
        GIT + r"push\b[^\n;&|]*?(?<![\w/.-])(?:refs/heads/)?" + PROTECTED + r"(?![\w/.-])",
        "direct push to main is forbidden",
    ),
    (
        GIT + r"push\b[^\n;&|]*HEAD:(?:refs/heads/)?" + PROTECTED + r"\b",
        "pushing HEAD to main is forbidden",
    ),
    (
        GIT + r"branch\s+(?:-d|-D)\s+" + PROTECTED + r"\b",
        "deleting main is forbidden",
    ),
    (
        GIT + r"(?:switch|checkout)\b[^\n;&|]*(?:-C|-B)\s+" + PROTECTED + r"\b",
        "resetting/recreating main is forbidden",
    ),
]


def check(payload):
    tool_name = str(payload.get("tool_name", ""))
    tool_input = payload.get("tool_input")
    if not isinstance(tool_input, dict):
        tool_input = {}

    cwd = (
        payload.get("cwd")
        or os.environ.get("CLAUDE_PROJECT_DIR")
        or os.getcwd()
    )

    branch = current_branch(str(cwd))

    # Direct file-editing tools must never modify a protected branch.
    if tool_name in {"Edit", "Write", "MultiEdit"}:
        if branch in PROTECTED_BRANCHES:
            deny(
                f"{tool_name} attempted while checked out on "
                f"protected branch '{branch}'. Create/switch to a work branch first."
            )
        return

    if tool_name != "Bash":
        return

    command = str(tool_input.get("command", ""))

    for pattern, reason in DANGEROUS_PATTERNS:
        if re.search(pattern, command):
            deny(reason)

    # If currently on main/master, block Git operations that can mutate it.
    if branch in PROTECTED_BRANCHES:
        protected_mutations = re.search(
            GIT
            + r"(?:add|commit|merge|rebase|cherry-pick|revert|am|apply|restore|reset)"
            r"\b",
            command,
        )

        if protected_mutations:
            deny(
                f"mutating Git operation attempted on protected branch '{branch}'"
            )

        if re.search(GIT + r"push\b", command):
            deny(
                f"git push attempted while checked out on protected branch '{branch}'"
            )


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception as exc:
        deny(f"invalid hook input: {exc}")
    if not isinstance(payload, dict):
        deny("invalid hook input: payload is not an object")
    try:
        check(payload)
    except SystemExit:
        raise
    except Exception as exc:
        # Fail closed: a crashing hook must never let a command through.
        deny(f"hook error ({type(exc).__name__}: {exc})")
    sys.exit(0)


if __name__ == "__main__":
    main()
