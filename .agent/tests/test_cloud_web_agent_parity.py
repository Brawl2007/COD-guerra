"""Static regression contract: Cloud Web preserves the Linux project agent roster.

No Claude calls, token usage or external API calls are made.
"""
import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
AGENTS_DIR = REPO / ".claude" / "agents"


def fields(path: Path):
    data = path.read_text(encoding="utf-8")
    parts = data.split("---", 2)
    if len(parts) < 3 or parts[0] != "":
        raise ValueError(f"Invalid agent frontmatter: {path}")
    return dict(re.findall(r"(?m)^([A-Za-z][A-Za-z0-9]*):[ \t]*(.*)$", parts[1]))


class CloudWebAgentParityTests(unittest.TestCase):
    def test_captain_can_delegate_to_every_versioned_specialist(self):
        """Restoring original 29 Agent tool entries avoids the captain20 regression."""
        names = {p.stem for p in AGENTS_DIR.glob("*.md")}
        self.assertEqual(len(names), 30, f"Unexpected agent roster: {sorted(names)}")
        self.assertIn("captain", names)
        captain = (AGENTS_DIR / "captain.md").read_text(encoding="utf-8")
        m = re.search(r"(?m)^tools: Agent\(([^)]*)\)", captain)
        self.assertIsNotNone(m, "Captain must explicitly permit specialist delegations")
        allowed = {a.strip() for a in m.group(1).split(",")}
        self.assertEqual(allowed, names - {"captain"})
        self.assertEqual(fields(AGENTS_DIR / "captain.md")["model"], "opus")
        self.assertEqual(fields(AGENTS_DIR / "captain.md")["effort"], "medium")

    def test_core_workers_remain_bounded_without_losing_identity(self):
        expected = {
            "implementer": ("sonnet", 24),
            "verifier": ("sonnet", 14),
            "reviewer": ("sonnet", 12),
            "reviewer-critical": ("opus", 8),
            "explorer": ("haiku", 8),
            "Explore": ("haiku", 8),
            "researcher": ("haiku", 8),
        }
        for name, (model, limit) in expected.items():
            with self.subTest(agent=name):
                meta = fields(AGENTS_DIR / (name + ".md"))
                self.assertEqual(meta["model"], model)
                self.assertEqual(int(meta["maxTurns"]), limit)

    def test_cloud_session_has_single_captain_and_keeps_integrator_paused(self):
        captain = (AGENTS_DIR / "captain.md").read_text(encoding="utf-8")
        self.assertIn("only Captain", captain)
        self.assertIn("one active implementer at most", captain)
        self.assertIn("No polling loop", captain)
        self.assertIn("while PAUSED, **never write to the candidate #80**", captain)
        guide = (REPO / "docs/direction/CLOUD_WEB_SINGLE_CAPTAIN.md").read_text(encoding="utf-8")
        self.assertIn("Routine antiga", guide)
        self.assertIn("maxTurns", guide)
        self.assertIn("RTK", guide)


if __name__ == "__main__":
    unittest.main()
