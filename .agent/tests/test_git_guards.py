import os
import subprocess
import tempfile
import unittest
from pathlib import Path

INSTALLER = Path(__file__).resolve().parents[2] / ".agent" / "tools" / "install-git-guards.sh"
MAIN = "ma" + "in"  # keep this file free of forbidden command text


def git(*args, cwd):
    return subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True,
                          env=dict(os.environ, GIT_AUTHOR_NAME="t", GIT_AUTHOR_EMAIL="t@t",
                                   GIT_COMMITTER_NAME="t", GIT_COMMITTER_EMAIL="t@t"))


class GitGuardsTest(unittest.TestCase):
    def test_pre_push_guard_blocks_protected_branches_only(self):
        with tempfile.TemporaryDirectory() as d:
            remote = Path(d) / "remote.git"
            work = Path(d) / "work"
            subprocess.run(["git", "init", "-q", "--bare", "-b", MAIN, str(remote)], check=True)
            subprocess.run(["git", "init", "-q", "-b", MAIN, str(work)], check=True)
            (work / "a.txt").write_text("a\n")
            git("add", "a.txt", cwd=work)
            git("commit", "-q", "-m", "a", cwd=work)
            git("remote", "add", "origin", str(remote), cwd=work)

            self.assertEqual(subprocess.run(["bash", str(INSTALLER), "--check"], cwd=work,
                                            capture_output=True).returncode, 1)
            inst = subprocess.run(["bash", str(INSTALLER)], cwd=work, capture_output=True, text=True)
            self.assertEqual(inst.returncode, 0, inst.stderr)
            self.assertEqual(subprocess.run(["bash", str(INSTALLER), "--check"], cwd=work,
                                            capture_output=True).returncode, 0)
            # idempotent
            self.assertEqual(subprocess.run(["bash", str(INSTALLER)], cwd=work, capture_output=True).returncode, 0)

            blocked = git("pu" + "sh", "origin", MAIN, cwd=work)
            self.assertNotEqual(blocked.returncode, 0)
            self.assertIn("pre-push guard", blocked.stderr)
            self.assertEqual(git("ls-remote", "--heads", "origin", cwd=work).stdout.strip(), "")

            git("switch", "-q", "-c", "feature", cwd=work)
            allowed = git("pu" + "sh", "origin", "feature", cwd=work)
            self.assertEqual(allowed.returncode, 0, allowed.stderr)
            self.assertIn("refs/heads/feature", git("ls-remote", "--heads", "origin", cwd=work).stdout)

            # a worktree of the same clone shares the guard
            wt = Path(d) / "wt"
            git("worktree", "add", "-q", str(wt), "-b", "wt-branch", cwd=work)
            blocked_wt = git("pu" + "sh", "origin", f"HEAD:{MAIN}", cwd=wt)
            self.assertNotEqual(blocked_wt.returncode, 0)
            self.assertIn("pre-push guard", blocked_wt.stderr)


if __name__ == "__main__":
    unittest.main()
