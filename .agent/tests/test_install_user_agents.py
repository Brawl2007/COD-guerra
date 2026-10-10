import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / ".agent" / "tools" / "install-user-agents.sh"


def run(*args, user_dir):
    return subprocess.run(["bash", str(SCRIPT), *args], capture_output=True, text=True,
                          env=dict(os.environ, CLAUDE_USER_DIR=user_dir,
                                   COD_JEV_HOME=str(Path(user_dir).parent / "jev")))


class InstallUserAgentsTest(unittest.TestCase):
    def test_copies_agents_and_merges_hook_without_losing_settings(self):
        with tempfile.TemporaryDirectory() as d:
            user = Path(d) / "claude"
            user.mkdir()
            (user / "settings.json").write_text(json.dumps({"model": "opus", "advisorModel": "fable",
                                                            "hooks": {"PreToolUse": [{"matcher": "Bash", "hooks": []}]}}))
            self.assertEqual(run("--check", user_dir=str(user)).returncode, 1)

            r = run(user_dir=str(user))
            self.assertEqual(r.returncode, 0, r.stderr)
            expected = sorted(p.name for p in (REPO / ".claude" / "agents").glob("*.md")) + ["captain20.md"]
            self.assertEqual(sorted(p.name for p in (user / "agents").glob("*.md")), sorted(expected))
            self.assertGreaterEqual(len(expected), 30)
            c20 = (user / "agents" / "captain20.md").read_text()
            self.assertIn("name: captain20\n", c20)
            self.assertIn("Agent(implementer, verifier, reviewer, explorer, Explore, researcher, implementer-deep, reviewer-critical, haiku-low", c20)
            self.assertIn("model: opus\n", c20)
            self.assertEqual(run("--check", user_dir=str(user)).returncode, 0)
            jev = Path(d) / "jev"
            for name in ("jev_router.py", "jev_decisions.py"):
                self.assertEqual((jev / name).read_bytes(), (REPO / ".agent" / "tools" / name).read_bytes())
            self.assertIn("teto 100", r.stdout)
            self.assertIn("~/.local/share/cod-guerra/jev/jev_router.py", c20)
            (jev / "jev_router.py").write_text("PILOT_MAX_PAID_CALLS = 3\n")  # cópia antiga
            self.assertEqual(run("--check", user_dir=str(user)).returncode, 1)
            run(user_dir=str(user))

            r = run("--hook", user_dir=str(user))
            self.assertEqual(r.returncode, 0, r.stderr)
            data = json.loads((user / "settings.json").read_text())
            self.assertEqual(data["model"], "opus")
            self.assertEqual(data["advisorModel"], "fable")
            pre = data["hooks"]["PreToolUse"]
            self.assertEqual(len(pre), 2)
            self.assertIn("git-safety.py", json.dumps(pre[1]))
            self.assertTrue((user / "hooks" / "git-safety.py").exists())
            self.assertTrue(list(user.glob("settings.json.bak-*")))

            r = run("--hook", user_dir=str(user))  # idempotent
            self.assertEqual(len(json.loads((user / "settings.json").read_text())["hooks"]["PreToolUse"]), 2)
            self.assertIn("[OK] hook git-safety instalado", run("--check", user_dir=str(user)).stdout)


if __name__ == "__main__":
    unittest.main()
