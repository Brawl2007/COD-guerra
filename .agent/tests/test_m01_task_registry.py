"""Offline tests: registry truthfulness, duplicate gate and fail-closed claims."""
import importlib.util
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

PATH = Path(__file__).resolve().parents[1] / "tools/m01_task_registry.py"
spec = importlib.util.spec_from_file_location("m01_task_registry", PATH)
gate = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = gate
spec.loader.exec_module(gate)


class RegistryTests(unittest.TestCase):
    def test_all_53_task_ids_and_allowed_statuses(self):
        registry = gate.load()
        self.assertEqual(len(registry["tasks"]), 53)
        self.assertEqual(set(registry["tasks"]), {f"T{i:02d}" for i in range(53)})
        self.assertTrue(all(t["status"] in gate.VALID for t in registry["tasks"].values()))

    def test_true_delivery_never_claimed_as_new(self):
        data = gate.load()["tasks"]
        for task in ("T16", "T21", "T23", "T25", "T35", "T50"):
            self.assertEqual(gate.evaluate(task, data[task], []), "REUSE_OR_REVIEW_EXISTING")
        self.assertIn("PR:#76", data["T50"]["refs"])

    def test_human_and_subsumed_are_blocked(self):
        data = gate.load()["tasks"]
        for task in ("T01", "T11", "T52"):
            self.assertEqual(gate.evaluate(task, data[task], []), "DO_NOT_START")

    def test_unknown_requires_live_scan(self):
        # T38 is a still undeveloped task (T43 was delivered on a branch).
        t = gate.load()["tasks"]["T38"]
        self.assertEqual(gate.evaluate("T38", t), "LIVE_CHECK_REQUIRED")
        self.assertEqual(gate.evaluate("T38", t, [{"kind": "branch", "ref": "claims/m01-t38"}]), "EXISTING_REMOTE_WORK")
        self.assertEqual(gate.evaluate("T38", t, []), "ELIGIBLE_FOR_ATOMIC_CLAIM")

    def test_unaudited_work_cannot_be_claimed(self):
        # T04 is in the candidate now; T00 still requires an audit of existing work first.
        for task in ("T00",):
            t = gate.load()["tasks"][task]
            self.assertEqual(gate.evaluate(task, t, []), "AUDIT_EXISTING_FIRST")

    def test_candidate_and_correction_work_is_reused_not_reclaimed(self):
        data = gate.load()["tasks"]
        # T24: the Gemini and Codex T24 lines were reconciled in the candidate (IN_CANDIDATE_UNVERIFIED), so it is reused, never reclaimed.
        for task in ("T09", "T14", "T24", "T41"):
            self.assertEqual(gate.evaluate(task, data[task], []), "REUSE_OR_REVIEW_EXISTING")

    def test_unavailable_github_prevents_claim(self):
        with patch.object(gate, "live_refs", side_effect=RuntimeError("no permission")):
            self.assertEqual(gate.main(["claim", "T38", "--sha", "a"*40]), 3)

    def test_duplicate_branch_blocks_claim_without_write(self):
        with patch.object(gate, "live_refs", return_value=[{"kind":"branch","ref":"claims/m01-t38"}]), \
             patch.object(gate.subprocess, "run") as run:
            self.assertEqual(gate.main(["claim", "T38", "--sha", "a"*40]), 2)
            run.assert_not_called()

    def test_atomic_post_conflict_stops_cleanly(self):
        with patch.object(gate, "live_refs", return_value=[]), \
             patch.object(gate.subprocess, "run", side_effect=gate.subprocess.CalledProcessError(1, "gh api")):
            self.assertEqual(gate.main(["claim", "T38", "--sha", "a"*40]), 3)

    def test_successful_claim_uses_unique_ref(self):
        with patch.object(gate, "live_refs", return_value=[]), \
             patch.object(gate.subprocess, "run") as run:
            self.assertEqual(gate.main(["claim", "T38", "--sha", "a"*40]), 0)
            call = run.call_args.args[0]
            self.assertIn("ref=refs/heads/claims/m01-t38", call)
            self.assertIn("sha=" + "a"*40, call)


if __name__ == "__main__":
    unittest.main()
