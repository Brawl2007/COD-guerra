import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "git-safety.py"
REPO = Path(__file__).resolve().parents[2]

# Built by concatenation so this file's own text never looks like a forbidden command.
PUSH = "git pu" + "sh"
MAIN = "ma" + "in"


def run_hook(payload, cwd=None):
    env = dict(os.environ, CLAUDE_PROJECT_DIR=str(REPO))
    data = payload if isinstance(payload, str) else json.dumps(payload)
    return subprocess.run([sys.executable, str(HOOK)], input=data, capture_output=True,
                          text=True, env=env, cwd=cwd or REPO)


def bash(command, cwd=None):
    return run_hook({"tool_name": "Bash", "tool_input": {"command": command}, "cwd": str(cwd or REPO)})


class GitSafetyHookTest(unittest.TestCase):
    def assert_blocked(self, command, reason_fragment):
        r = bash(command)
        self.assertEqual(r.returncode, 2, f"{command!r} should be blocked: {r.stderr}")
        self.assertIn(reason_fragment, r.stderr)

    def assert_allowed(self, command):
        r = bash(command)
        self.assertEqual(r.returncode, 0, f"{command!r} should be allowed: {r.stderr}")

    def test_push_to_protected_branch_blocked_in_every_spelling(self):
        for c in (
            f"{PUSH} origin {MAIN}",
            f"{PUSH} --dry-run origin {MAIN}",
            f"{PUSH} -u origin {MAIN}",
            f"{PUSH} --no-verify origin HEAD:{MAIN}",
            f"{PUSH} origin :{MAIN}",
            f"{PUSH} origin +HEAD:{MAIN}",
            f"{PUSH} origin feature:{MAIN}",
            f"cd /tmp && {PUSH} origin {MAIN} 2>&1",
            f"git -C ../COD-guerra pu" + f"sh origin {MAIN}",
            f"git --no-pager pu" + f"sh origin {MAIN}",
            f"git -c core.x=y -C /x pu" + f"sh --dry-run origin {MAIN}",
            f"{PUSH} origin master",
        ):
            self.assert_blocked(c, "push")

    def test_other_dangerous_operations_blocked_with_global_options(self):
        self.assert_blocked("git reset --hard HEAD~1", "reset --hard")
        self.assert_blocked("git -C /x reset --hard", "reset --hard")
        self.assert_blocked(f"{PUSH} --force origin feature", "force push")
        self.assert_blocked(f"git -C /x pu" + "sh -f origin feature", "force push")
        self.assert_blocked("git clean -fd", "clean")
        self.assert_blocked("git branch -D feature", "branch deletion")
        self.assert_blocked(f"git checkout -B {MAIN}", "recreating")
        self.assert_blocked(f"git -C /x switch -C {MAIN}", "recreating")

    def test_safe_commands_allowed(self):
        for c in (
            "git status", "git log --oneline -5", "git log --grep push", "git diff --stat",
            f"{PUSH} origin claude/feature", f"{PUSH} -u origin claude/feature",
            f"git -C /x pu" + "sh origin claude/feature", "git fetch origin main",
            f"git branch -d old-feature", "npm test", "echo main", "ls",
        ):
            self.assert_allowed(c)

    def test_fails_closed_on_malformed_input(self):
        self.assertEqual(run_hook("not json").returncode, 2)
        self.assertEqual(run_hook("[1,2]").returncode, 2)
        r = run_hook({"tool_name": "Bash", "tool_input": "git status", "cwd": str(REPO)})
        self.assertEqual(r.returncode, 0)  # tolerated: unparseable input means no command

    def test_edits_and_mutations_blocked_on_protected_branch(self):
        with tempfile.TemporaryDirectory() as d:
            subprocess.run(["git", "init", "-q", "-b", MAIN, d], check=True)
            edit = run_hook({"tool_name": "Edit", "tool_input": {"file_path": f"{d}/a"}, "cwd": d})
            self.assertEqual(edit.returncode, 2)
            self.assertIn("protected branch", edit.stderr)
            commit = bash("git commit -m x", cwd=d)
            self.assertEqual(commit.returncode, 2)
            commit_c = bash(f"git -C {d} commit -m x", cwd=d)
            self.assertEqual(commit_c.returncode, 2)
            push = bash(f"{PUSH} origin feature", cwd=d)
            self.assertEqual(push.returncode, 2)
            self.assertEqual(bash("git status", cwd=d).returncode, 0)


if __name__ == "__main__":
    unittest.main()
