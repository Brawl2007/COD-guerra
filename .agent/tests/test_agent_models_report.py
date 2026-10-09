import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

TOOL = Path(__file__).resolve().parents[1] / "tools" / "agent_models_report.py"


def rec(model, effort, agent="", in_tok=10, out_tok=5, kind="assistant"):
    return json.dumps({
        "type": kind, "effort": effort, "attributionAgent": agent, "timestamp": "2026-10-09T10:00:00Z",
        "message": {"model": model, "role": "assistant", "content": [{"type": "text", "text": "SECRET-CONTENT"}],
                    "usage": {"input_tokens": in_tok, "output_tokens": out_tok,
                              "cache_creation_input_tokens": 100, "cache_read_input_tokens": 50}},
    })


class AgentModelsReportTest(unittest.TestCase):
    def test_report_groups_models_and_efforts_per_transcript(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d) / "projects" / "-home-x"
            sub = root / "sess1" / "subagents"
            sub.mkdir(parents=True)
            (root / "sess1.jsonl").write_text("\n".join([
                json.dumps({"type": "user", "message": {"role": "user", "content": "hi"}}),
                rec("claude-opus-5-5", "high", "captain"), rec("claude-opus-5-5", "high", "captain"),
            ]) + "\n")
            (sub / "agent-abc.jsonl").write_text("\n".join([
                rec("claude-haiku-5-5", "low", "haiku-low"), rec("claude-haiku-5-5", "low", "haiku-low"),
                rec("claude-sonnet-5-5", "medium", "haiku-low"),  # mid-run switch
                "not json",
            ]) + "\n")
            r = subprocess.run([sys.executable, str(TOOL), "--root", d, "--json"], capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stderr)
            rows = {Path(x["file"]).name: x for x in json.loads(r.stdout)}
            self.assertEqual(rows["sess1.jsonl"]["kind"], "main")
            self.assertEqual(rows["sess1.jsonl"]["models"], {"claude-opus-5-5": 2})
            self.assertEqual(rows["sess1.jsonl"]["efforts"], {"high": 2})
            self.assertEqual(rows["sess1.jsonl"]["tokens"]["input_tokens"], 20)
            sa = rows["agent-abc.jsonl"]
            self.assertEqual(sa["kind"], "subagent")
            self.assertEqual(sa["agent"], "haiku-low")
            self.assertEqual(sa["models"], {"claude-haiku-5-5": 2, "claude-sonnet-5-5": 1})
            self.assertEqual(sa["efforts"], {"low": 2, "medium": 1})
            self.assertEqual(sa["turns"], 3)
            self.assertNotIn("SECRET-CONTENT", r.stdout)

            text = subprocess.run([sys.executable, str(TOOL), "--root", d], capture_output=True, text=True)
            self.assertIn("switched model or effort mid-run", text.stdout)
            self.assertNotIn("SECRET-CONTENT", text.stdout)

            old = subprocess.run([sys.executable, str(TOOL), "--root", d, "--hours", "0"], capture_output=True, text=True)
            self.assertIn("No transcripts", old.stdout)

            agents = Path(d) / "agents"
            agents.mkdir()
            (agents / "haiku-low.md").write_text("---\nname: haiku-low\nmodel: haiku\neffort: low\n---\n")
            (agents / "opus-max.md").write_text("---\nname: opus-max\nmodel: opus\neffort: max\n---\n")
            cov = subprocess.run([sys.executable, str(TOOL), "--root", d, "--coverage", "--agents-dir", str(agents)],
                                 capture_output=True, text=True)
            self.assertEqual(cov.returncode, 0, cov.stderr)
            self.assertIn("Coverage of 2 defined agents (1 used)", cov.stdout)
            self.assertRegex(cov.stdout, r"haiku-low\s+haiku/low\s+3\s+claude-haiku-5-5")
            self.assertRegex(cov.stdout, r"opus-max\s+opus/max\s+never")


if __name__ == "__main__":
    unittest.main()
