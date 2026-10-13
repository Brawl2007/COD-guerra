"""Offline policy tests for the COD-guerra cloud Captain instructions."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class CloudCaptainInstructionsTests(unittest.TestCase):
    def read(self, path):
        return (ROOT / path).read_text(encoding="utf-8")

    def test_captain_checks_remote_before_local_discovery(self):
        s = self.read(".claude/agents/captain.md")
        self.assertLess(s.index("## Claude Code Cloud: retomada"), s.index("## Startup: existing runs"))
        self.assertIn("cloud_checkpoint.py list", s)
        self.assertIn("cloud_checkpoint.py get --task-id <TASK_ID>", s)

    def test_unknown_or_in_progress_status_cannot_resume_automatically(self):
        s = self.read(".claude/agents/captain.md")
        for key in ("DESCONHECIDA", "RUNNING", "BLOCKED", "HEAD divergente", "resume_allowed=false"):
            self.assertIn(key, s)

    def test_cloud_writes_require_separate_authorization(self):
        s = self.read(".claude/agents/captain.md")
        self.assertIn("DESATIVADOS nas Routines", s)
        self.assertIn("autorizacao explicita", s)
        self.assertIn("cod-guerra/cloud-state", s)

    def test_skills_and_claude_guide_reference_checkpoint_tool(self):
        auto = self.read(".claude/skills/autonomous-task/SKILL.md")
        handoff = self.read(".claude/skills/structured-handoff/SKILL.md")
        claude = self.read("CLAUDE.md")
        self.assertIn("cloud_checkpoint.py list", auto)
        self.assertIn("CLOUD_CHECKPOINT", handoff)
        self.assertIn("cloud_checkpoint.py list", claude)
        self.assertIn("publish", claude)


if __name__ == "__main__":
    unittest.main()
