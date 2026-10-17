"""No-network tests for the explicitly authorized TypeSafe Jev Cloud Web pilot."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock

TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))
import jev_router as jr  # noqa: E402
import jev_web_paid_pilot as pilot  # noqa: E402


class CloudPaidSafetyTests(unittest.TestCase):
    REQ = {"role": "implement", "risk": "medium", "complexity": "medium",
           "description": "Prioritize a narrow infrastructure task"}

    def test_cloud_default_blocks_but_authorized_calls_have_no_arbitrary_count_cap(self):
        self.assertEqual(jr.effective_limit({"CLAUDE_CODE_REMOTE": "true"}), 0)
        e = {"CLAUDE_CODE_REMOTE": "true", "COD_JEV_WEB_PAID_APPROVED": "1"}
        self.assertIsNone(jr.effective_limit(e))
        self.assertEqual(jr.effective_limit(e, flag=1000), 1000)
        self.assertEqual(jr.effective_limit(dict(e, COD_JEV_LIMIT="3"), flag=20), 3)
        self.assertEqual(jr.effective_limit(dict(e, COD_JEV_LIMIT="999")), 999)
        self.assertIsNone(jr.effective_limit({}))  # Linux behavior unchanged.

    def test_cloud_budget_is_estimated_in_usd_and_fails_closed(self):
        env = {"CLAUDE_CODE_REMOTE": "true", "COD_JEV_WEB_PAID_APPROVED": "1"}
        sample = {"state": "small decision", "model": "jev-latest"}
        self.assertTrue(jr.cloud_credit_available(env, [], sample))
        self.assertTrue(jr.cloud_credit_available(env, [{"est_cost_usd": 4.9}], sample))
        self.assertFalse(jr.cloud_credit_available(env, [{"est_cost_usd": 5.0}], sample))
        self.assertFalse(jr.cloud_credit_available(env, [{"est_cost_usd": 4.99999}], sample))
        self.assertFalse(jr.cloud_credit_available(env, [{"est_cost_usd": "nan"}], sample))
        self.assertFalse(jr.cloud_credit_available({"CLAUDE_CODE_REMOTE": "true"}, [], sample))

    def test_unapproved_cloud_router_cannot_hit_transport(self):
        with tempfile.TemporaryDirectory() as d:
            ledger = str(Path(d) / "ledger.json")
            def should_not_call(*args):
                self.fail("UNEXPECTED PAID CALL")
            e = {"CLAUDE_CODE_REMOTE": "true", "COD_JEV_PILOT": "1",
                 "COD_JEV_AUTH": "proxy", "COD_JEV_LEDGER": ledger}
            out = jr.route(self.REQ, enable_jev=True, env=e,
                           transport=should_not_call)
            self.assertEqual(out["source"], "rule_fallback")
            self.assertEqual(out["reason"], "budget_exhausted")
            self.assertFalse(Path(ledger).exists())

    def test_approved_cloud_call_uses_mock_transport_and_ledger(self):
        with tempfile.TemporaryDirectory() as d:
            e = {"CLAUDE_CODE_REMOTE": "true",
                 "COD_JEV_WEB_PAID_APPROVED": "1", "COD_JEV_PILOT": "1",
                 "COD_JEV_AUTH": "proxy", "COD_JEV_LEDGER": str(Path(d) / "ledger.json")}
            received = []
            def fake(url, headers, body, timeout):
                received.append((url, headers, json.loads(body)))
                return 200, json.dumps({
                    "model": "jev-1.14.0",
                    "usage": {"input_tokens": 125, "output_tokens": 5},
                    "answers": {"model_choice": {
                        "choice": "sonnet", "confidence": 0.91}}}).encode()
            out = jr.route(self.REQ, enable_jev=True, env=e, transport=fake)
            self.assertEqual(out["source"], "jev")
            self.assertEqual(len(received), 1)
            self.assertEqual(received[0][1], {"Content-Type": "application/json"})
            self.assertEqual(len(jr.read_ledger(Path(e["COD_JEV_LEDGER"]))["calls"]), 1)

    def test_six_capabilities_use_existing_safety_filtered_router(self):
        from unittest import mock
        fake = {"source": "jev", "capability": "priority",
                "recommendation": {"priority": "p1"}, "usage": {"input_tokens": 300}}
        with mock.patch.object(pilot, "guard", return_value={
            "branch": pilot.BRANCH, "head": "a" * 40}):
            with mock.patch.object(pilot.jev_decisions, "decide", return_value=fake) as run:
                result = pilot.invoke_decision(
                    capability="priority", payload={"task": "x"},
                    online=True, env={"CLAUDE_CODE_REMOTE": "true"})
                self.assertEqual(result["capability"], "priority")
                self.assertEqual(result["local_estimated_usd_cap"], 5.0)
                self.assertIsNone(result["max_project_ledger_calls"])
                options = run.call_args.kwargs
                self.assertTrue(options["enable_jev"])
                self.assertFalse(options["offline"])
                self.assertEqual(options["env"]["COD_JEV_WEB_PAID_APPROVED"], "1")
                self.assertEqual(options["env"]["COD_JEV_AUTH"], "proxy")
        self.assertEqual(len(pilot.jev_decisions.CAPABILITIES), 6)

    def test_input_must_be_small_json_inside_tmp(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "decision.json"
            path.write_text('{"description":"analysis"}')
            self.assertEqual(pilot.read_scoped_payload(str(path))["description"], "analysis")
            path.write_text("{" + "a" * 10000 + "}")
            with self.assertRaisesRegex(RuntimeError, "8 KiB"):
                pilot.read_scoped_payload(str(path))
        with self.assertRaisesRegex(RuntimeError, "temporary directory"):
            pilot.read_scoped_payload(str(Path(__file__).resolve()))

    def test_guard_requires_cloud_and_expected_branch(self):
        with mock.patch.object(pilot, "git", side_effect=[
                "infra/claude-web-single-captain-v1", "a" * 40, ""]):
            with self.assertRaisesRegex(RuntimeError, "Claude Code Web"):
                pilot.guard({}, online=True)
        with mock.patch.object(pilot, "git", return_value="main"):
            with self.assertRaisesRegex(RuntimeError, "approved infrastructure branch"):
                pilot.guard({"CLAUDE_CODE_REMOTE": "true"}, online=True)
        with mock.patch.object(pilot, "git", side_effect=[
                "infra/claude-web-single-captain-v1", "b" * 40, "M file"]):
            with self.assertRaisesRegex(RuntimeError, "not clean"):
                pilot.guard({"CLAUDE_CODE_REMOTE": "true"}, online=True)

    def test_guard_rejects_redirected_provider(self):
        with mock.patch.object(pilot, "git", side_effect=[
                "infra/claude-web-single-captain-v1", "c" * 40, ""]):
            with self.assertRaisesRegex(RuntimeError, "Non-official"):
                pilot.guard({"CLAUDE_CODE_REMOTE": "true",
                             "TYPESAFE_BASE_URL": "https://example.com"}, online=True)

    def test_wrapper_offline_and_online_flags_are_explicit(self):
        response = {"recommendation_model": "sonnet",
                    "recommended_agent": "implementer",
                    "source": "rule_fallback", "reason": "offline"}
        with mock.patch.object(pilot, "guard", return_value={
            "branch": pilot.BRANCH, "head": "f" * 40}):
            with mock.patch.object(pilot.jev_router, "route", return_value=response) as route:
                out = pilot.invoke(role="implement", risk="medium", complexity="medium",
                                   description="test only", online=False,
                                   env={"CLAUDE_CODE_REMOTE": "true",
                                        "TYPESAFE_API_KEY": "dummy-secret"})
                k = route.call_args.kwargs
                self.assertTrue(k["offline"])
                self.assertEqual(k["env"]["TYPESAFE_API_KEY"], "")
                self.assertEqual(k["env"]["COD_JEV_WEB_PAID_APPROVED"], "0")
                self.assertFalse(out["provider_billing_verified"])
                route.reset_mock()
                pilot.invoke(role="implement", risk="medium", complexity="medium",
                             description="test only", online=True,
                             env={"CLAUDE_CODE_REMOTE": "true"})
                k = route.call_args.kwargs
                self.assertFalse(k["offline"])
                self.assertIsNone(k["limit_flag"])
                self.assertEqual(k["env"]["COD_JEV_WEB_PAID_APPROVED"], "1")
                self.assertEqual(k["env"]["COD_JEV_AUTH"], "proxy")
                self.assertEqual(k["env"]["TYPESAFE_BASE_URL"], "https://api.typesafe.ai")


if __name__ == "__main__":
    unittest.main()
