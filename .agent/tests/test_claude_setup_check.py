import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import claude_setup_check as csc  # noqa: E402

REPO = Path(__file__).resolve().parents[2]


class ClaudeSetupCheckTest(unittest.TestCase):
    def test_version_thresholds(self):
        self.assertEqual(csc.parse_version("2.1.295 (Claude Code)"), (2, 1, 295))
        self.assertFalse([m for lvl, m in csc.check_version((2, 1, 295)) if lvl == "WARN"])
        warns = [m for lvl, m in csc.check_version((2, 1, 260)) if lvl == "WARN"]
        self.assertEqual(len(warns), 1)
        self.assertIn("2.1.293", warns[0])
        self.assertEqual(csc.check_version(None)[0][0], "WARN")

    def test_env_reports_names_never_values(self):
        secret = "sk-ant-should-never-print"
        out = csc.check_env({"ANTHROPIC_API_KEY": secret, "DISABLE_TELEMETRY": "1",
                             "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "0", "PATH": "/bin"})
        text = " ".join(m for _, m in out)
        self.assertNotIn(secret, text)
        self.assertIn("ANTHROPIC_API_KEY", text)
        self.assertIn("DISABLE_TELEMETRY", text)
        self.assertNotIn("AGENT_TEAMS", text)

    def test_settings_keys_and_env_block(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "settings.json"
            p.write_text(json.dumps({"advisorModel": "fable", "env": {"CLAUDE_CODE_DISABLE_ADVISOR_TOOL": "1"}}))
            out = csc.check_settings(p, "user settings")
            self.assertIn(("INFO", 'user settings: advisorModel = "fable"'), out)
            self.assertTrue(any(lvl == "WARN" and "DISABLE_ADVISOR" in m for lvl, m in out))
            p.write_text("{broken")
            self.assertEqual(csc.check_settings(p, "x")[0][0], "WARN")
            self.assertEqual(csc.check_settings(Path(d) / "none.json", "x"), [("INFO", "x: absent")])

    def test_repository_has_every_required_agent(self):
        with tempfile.TemporaryDirectory() as home:
            out = csc.check_agents(REPO, home)
        missing = [m for lvl, m in out if lvl == "WARN"]
        self.assertEqual(missing, [])
        lines = " ".join(m for _, m in out)
        self.assertIn("agent captain (project): model=opus effort=high", lines)
        self.assertIn("agent Explore (project): model=haiku effort=low", lines)
        self.assertIn("agent researcher (project): model=haiku effort=low", lines)


if __name__ == "__main__":
    unittest.main()
