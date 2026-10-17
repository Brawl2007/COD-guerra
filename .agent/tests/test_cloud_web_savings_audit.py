"""No-network regression tests for the Claude Code Web savings audit."""
import importlib.util
import json
from pathlib import Path
from unittest import TestCase, mock

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / ".agent" / "tools" / "cloud_web_preflight.py"
spec = importlib.util.spec_from_file_location("cloud_web_preflight_savings", SCRIPT)
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class CloudWebSavingsTests(TestCase):
    def setUp(self):
        audit.ERRORS.clear()

    def tearDown(self):
        audit.ERRORS.clear()

    def test_jev_offline_always_sets_offline_and_removes_credentials(self):
        outcome = mock.Mock(returncode=0, stdout=json.dumps({
            "source": "rule_fallback", "reason": "offline",
            "recommendation_model": "sonnet", "recommended_agent": "implementer",
        }), stderr="")
        with mock.patch.object(audit.subprocess, "run", return_value=outcome) as runner:
            with mock.patch.object(audit, "report"):
                audit.check_jev_offline()
        self.assertEqual(audit.ERRORS, [])
        argv = runner.call_args.args[0]
        env = runner.call_args.kwargs["env"]
        self.assertEqual(argv[1], "-B")
        self.assertIn("--offline", argv)
        self.assertIn("--json", argv)
        self.assertNotIn("--enable-jev", argv)
        self.assertEqual(env["COD_JEV_PILOT"], "1")  # proves offline overrides pilot
        self.assertEqual(env["TYPESAFE_API_KEY"], "")
        self.assertEqual(env["COD_JEV_AUTH"], "")
        self.assertEqual(env["COD_JEV_KEY_FILE"], audit.os.devnull)

    def test_jev_offline_rejects_unexpected_paid_result(self):
        outcome = mock.Mock(returncode=0, stdout=json.dumps({
            "source": "jev", "usage": {"input_tokens": 12},
        }), stderr="")
        with mock.patch.object(audit.subprocess, "run", return_value=outcome):
            with mock.patch.object(audit, "report"):
                audit.check_jev_offline()
        self.assertTrue(any("offline safety" in err for err in audit.ERRORS))

    def test_rtk_project_hook_not_confused_with_git_safety(self):
        safety = {"hooks": {"PreToolUse": [{
            "matcher": "Bash|Edit|Write",
            "hooks": [{"type": "command", "command": "python3 .claude/hooks/git-safety.py"}]
        }]}}
        self.assertFalse(audit.has_rtk_project_hook(safety))
        safety["hooks"]["PreToolUse"].append({
            "matcher": "Bash",
            "hooks": [{"type": "command", "command": "rtk rewrite"}],
        })
        self.assertTrue(audit.has_rtk_project_hook(safety))

    def test_j_ev_cloud_policy_explicitly_offline(self):
        claude = (ROOT / "CLAUDE.md").read_text(encoding="utf-8")
        captain = (ROOT / ".claude/agents/captain.md").read_text(encoding="utf-8")
        self.assertIn("não ativar consultas pagas automaticamente", claude)
        self.assertIn("exclusivamente offline por padrao", captain)


if __name__ == "__main__":
    import unittest
    unittest.main()
