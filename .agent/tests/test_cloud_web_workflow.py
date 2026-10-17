"""Stdlib-only smoke and denial tests; no network, paid API or Claude execution."""
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "tools/cloud_web_workflow.py"
BRANCH = "infra/claude-web-single-captain-v1"


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        folder = self.root / ".agent/tools"
        folder.mkdir(parents=True)
        shutil.copy2(SCRIPT, folder / SCRIPT.name)
        # Offline stub ONLY for dispatcher tests. Real checkout uses real Jev.
        (folder / "jev_router.py").write_text('''
def route(request, *, offline=False, enable_jev=False, env=None):
    assert offline and enable_jev
    assert env["COD_JEV_AUTH"] == "proxy"
    role = request["role"]
    return {"recommendation_model": "haiku" if role == "explore" else "sonnet",
            "recommended_agent": {"explore": "explorer", "implement": "implementer",
                                  "verify": "verifier", "review": "reviewer"}[role],
            "source": "rule_fallback", "reason": "offline"}
''')
        self.git("init", "-q", "-b", BRANCH)
        self.git("-c", "user.email=test@example.test", "-c", "user.name=Test",
                 "add", ".agent/tools")
        self.git("-c", "user.email=test@example.test", "-c", "user.name=Test",
                 "commit", "-qm", "fixture")
        self.head = self.git("rev-parse", "HEAD").stdout.strip()

    def git(self, *cmd):
        p = subprocess.run(["git", "-C", str(self.root), *cmd],
                           text=True, capture_output=True)
        self.assertEqual(p.returncode, 0, p.stderr)
        return p

    def run_script(self, *args):
        return subprocess.run([sys.executable, str(SCRIPT), *args,
                               "--root", str(self.root)],
                              text=True, capture_output=True)

    def good_plan(self, *other):
        return self.run_script("plan", "--task-id", "INFRA-SMOKE",
                               "--description", "Check offline workflow",
                               "--file", ".agent/tools/cloud_web_workflow.py", *other)

    def test_plan_produces_sequential_offline_agents(self):
        p = self.good_plan("--expect-sha", self.head)
        self.assertEqual(p.returncode, 0, p.stderr)
        obj = json.loads(p.stdout)
        self.assertEqual(obj["max_simultaneous_workers"], 1)
        self.assertEqual([s["agent"] for s in obj["phases"]],
                         ["haiku-low", "implementer", "verifier", "reviewer"])
        self.assertTrue(all(s["offline_router"] in ("rule", "rule_fallback")
                            for s in obj["phases"]))

    def test_read_only_short_plan(self):
        p = self.good_plan("--read-only")
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertEqual([s["phase"] for s in json.loads(p.stdout)["phases"]], ["scan"])

    def test_refuses_gameplay_and_wrong_sha(self):
        self.assertEqual(self.good_plan("--expect-sha", "f" * 40).returncode, 2)
        self.assertEqual(self.run_script("plan", "--task-id", "T48",
                                         "--description", "Game", "--file", "src/game.js").returncode, 2)

    def test_refuses_other_branch_and_dirty_worktree(self):
        self.git("checkout", "-qb", "main")
        self.assertEqual(self.good_plan().returncode, 2)
        self.git("checkout", "-q", BRANCH)
        (self.root / "scratch.txt").write_text("not committed")
        self.assertEqual(self.good_plan().returncode, 2)

    def test_ponytail_is_opt_in_and_only_for_sonnet_edit(self):
        self.assertEqual(self.good_plan("--ponytail").returncode, 2)
        skill = self.root / ".claude/skills/ponytail/SKILL.md"
        skill.parent.mkdir(parents=True)
        skill.write_text("---\\nname: ponytail\\n---\\nPonytail test fixture\\n".replace("\\n", "\n"))
        self.git("add", ".claude/skills/ponytail/SKILL.md")
        self.git("-c", "user.email=test@example.test", "-c", "user.name=Test",
                 "commit", "-qm", "fixture ponytail")
        enabled = self.good_plan("--ponytail")
        self.assertEqual(enabled.returncode, 0, enabled.stderr)
        plan = json.loads(enabled.stdout)
        self.assertEqual(plan["ponytail_mode"], "full")
        self.assertIn("Skill(ponytail)", plan["phases"][1]["instruction"])
        self.assertNotIn("Skill(ponytail)", plan["phases"][0]["instruction"])
        self.assertNotIn("Skill(ponytail)", plan["phases"][2]["instruction"])
        self.assertNotIn("Skill(ponytail)", plan["phases"][3]["instruction"])
        self.assertEqual(self.good_plan("--ponytail", "--read-only").returncode, 2)
        baseline = self.good_plan()
        self.assertEqual(json.loads(baseline.stdout)["ponytail_mode"], "off")

    def test_pilot_does_not_add_global_hooks_or_reduce_quality(self):
        project = SCRIPT.parents[2]
        skill = (project / ".claude/skills/ponytail/SKILL.md").read_text()
        agent = (project / ".claude/agents/implementer.md").read_text()
        hooks = (project / ".claude/settings.json").read_text().lower()
        license_text = (project / ".claude/skills/ponytail/LICENSE").read_text()
        self.assertIn("name: ponytail", skill)
        self.assertIn("Never cut:", skill)
        self.assertIn("MIT License", license_text)
        self.assertIn("PONYTAIL_PILOT=full", agent)
        self.assertIn("Skill", agent.split("tools:", 1)[1].splitlines()[0])
        self.assertNotIn("ponytail", hooks)

    def test_verify_evidence_and_budget(self):
        phases = {name: {"agent": agent, "status": "PASS", "tokens": 100,
                         "evidence": "confirmed in test fixture"} for name, agent in (
                             ("scan", "haiku-low"), ("edit", "implementer"),
                             ("verify", "verifier"), ("review", "reviewer"))}
        report = {"schema_version": 1, "task_id": "INFRA-SMOKE", "branch": BRANCH,
                  "head": self.head, "read_only": False,
                  "token_stop": 500, "phases": phases}
        report_file = Path(self.tmp.name).parent / (self.root.name + "-report.json")
        self.addCleanup(lambda: report_file.unlink(missing_ok=True))
        report_file.write_text(json.dumps(report))
        p = self.run_script("verify", "--report", str(report_file))
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertEqual(json.loads(p.stdout)["reported_tokens"], 400)
        report["token_stop"] = 300
        report_file.write_text(json.dumps(report))
        self.assertEqual(self.run_script("verify", "--report", str(report_file)).returncode, 2)
        report["token_stop"] = 500
        phases["verify"]["agent"] = "implementer"
        report_file.write_text(json.dumps(report))
        self.assertEqual(self.run_script("verify", "--report", str(report_file)).returncode, 2)


if __name__ == "__main__":
    unittest.main()
