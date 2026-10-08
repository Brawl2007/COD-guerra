import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1] / "tools"
TOOL = TOOLS / "jev_router.py"
REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(TOOLS))
import jev_router  # noqa: E402

SENTINEL = "SENTINEL-KEY-do-not-leak-9f3a"


class Stub:
    """Local TypeSafe stand-in. Records hits."""

    def __init__(self):
        self.hits = 0
        self.bodies = []
        self.auth = []
        self.status = 200
        self.choice = "sonnet"
        self.confidence = 0.9
        stub = self

        class H(BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def do_POST(self):
                n = int(self.headers.get("Content-Length", 0))
                stub.bodies.append(json.loads(self.rfile.read(n)))
                stub.auth.append(self.headers.get("Authorization"))
                stub.hits += 1
                if stub.status != 200:
                    data = json.dumps({"error": "x"}).encode()
                else:
                    data = json.dumps({
                        "model": "jev-1.13.0",
                        "answers": {"model_choice": {
                            "type": "choice", "choice": stub.choice,
                            "probabilities": {}, "confidence": stub.confidence}},
                        "usage": {"input_tokens": 318, "output_tokens": 34},
                    }).encode()
                self.send_response(stub.status)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

        self.srv = HTTPServer(("127.0.0.1", 0), H)
        self.url = "http://127.0.0.1:%d" % self.srv.server_port
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()

    def close(self):
        self.srv.shutdown()
        self.srv.server_close()


AMBIG = ["--role", "implement", "--risk", "medium", "--complexity", "medium",
         "--description", "add a feature"]


class Base(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.tmp = Path(self._tmp.name).resolve()
        self.stub = Stub()
        self.addCleanup(self.stub.close)
        self.ledger = self.tmp / "state" / "ledger.json"
        self.keyfile = self.tmp / "key.env"
        self.write_key(self.keyfile)
        self.env = {k: v for k, v in os.environ.items()
                    if not k.startswith(("TYPESAFE", "COD_JEV"))}
        self.env.update(HOME=str(self.tmp), COD_JEV_LEDGER=str(self.ledger),
                        COD_JEV_KEY_FILE=str(self.keyfile),
                        TYPESAFE_BASE_URL=self.stub.url)

    def write_key(self, path, mode=0o600):
        path.write_text("TYPESAFE_API_KEY=%s\n" % SENTINEL)
        os.chmod(path, mode)

    def cli(self, *args, pilot=True, extra_env=None):
        env = dict(self.env)
        if pilot:
            env["COD_JEV_PILOT"] = "1"
        env.update(extra_env or {})
        p = subprocess.run([sys.executable, str(TOOL), *args], env=env,
                           capture_output=True, text=True)
        self.assertEqual(p.returncode, 0, p.stderr)
        self.last = p
        return p

    def route(self, *args, **kw):
        return json.loads(self.cli("route", *args, "--json", **kw).stdout)

    def calls(self):
        return json.loads(self.ledger.read_text())["calls"] if self.ledger.exists() else []


class RuleTests(Base):
    def test_obvious_cases_no_http(self):
        cases = [
            (["--role", "explore"], "haiku", "explorer"),
            (["--role", "implement", "--read-only"], "haiku", "explorer"),
            (["--role", "verify"], "sonnet", "verifier"),
            (["--role", "review", "--critical", "persistence"], "opus", "reviewer-critical"),
            (["--role", "review", "--risk", "high"], "opus", "reviewer-critical"),
            (["--role", "review", "--risk", "low", "--complexity", "low"], "sonnet", "reviewer"),
            (["--role", "implement", "--fix-attempts", "2"], "sonnet", "implementer-deep"),
            (["--role", "implement", "--risk", "low", "--complexity", "low"], "sonnet", "implementer"),
        ]
        for args, model, agent in cases:
            o = self.route(*args)
            self.assertEqual((o["recommendation_model"], o["recommended_agent"], o["source"]),
                             (model, agent, "rule"), args)
        self.assertEqual(self.stub.hits, 0)
        self.assertEqual(self.calls(), [])

    def test_disabled_without_pilot(self):
        o = self.route(*AMBIG, pilot=False)
        self.assertEqual((o["source"], o["reason"]), ("rule_fallback", "disabled"))
        self.assertEqual(self.stub.hits, 0)


class JevTests(Base):
    def test_jev_consulted(self):
        o = self.route(*AMBIG, "--run-id", "R1")
        self.assertEqual(o["source"], "jev")
        self.assertEqual(o["jev_choice"], "sonnet")
        self.assertEqual(o["jev_model"], "jev-1.13.0")
        self.assertEqual(o["confidence"], 0.9)
        self.assertEqual(o["recommended_agent"], "implementer")
        self.assertEqual(self.stub.hits, 1)
        self.assertEqual(self.stub.auth[0], "Bearer " + SENTINEL)
        body = self.stub.bodies[0]
        self.assertEqual(body["model"], "jev-latest")
        self.assertEqual(body["questions"]["model_choice"]["type"], "choice")
        c = self.calls()
        self.assertEqual(len(c), 1)
        self.assertEqual((c[0]["input_tokens"], c[0]["output_tokens"], c[0]["run_id"]),
                         (318, 34, "R1"))
        self.assertAlmostEqual(c[0]["est_cost_usd"], 318 * 0.042 / 1e6, places=9)
        self.assertEqual(oct(self.ledger.stat().st_mode & 0o777), "0o600")

    def test_low_confidence_fallback(self):
        self.stub.confidence = 0.3
        o = self.route(*AMBIG)
        self.assertEqual((o["source"], o["reason"]), ("rule_fallback", "low_confidence"))
        self.assertEqual(o["recommended_agent"], o["rule_default"]["agent"])
        self.assertEqual(len(self.calls()), 1)

    def test_min_confidence_flag(self):
        self.stub.confidence = 0.7
        o = self.route(*AMBIG, "--min-confidence", "0.9")
        self.assertEqual(o["source"], "rule_fallback")

    def test_haiku_clamped(self):
        self.stub.choice = "haiku"
        o = self.route(*AMBIG)
        self.assertEqual(o["source"], "jev")
        self.assertEqual(o["jev_choice"], "haiku")
        self.assertEqual(o["recommendation_model"], "sonnet")
        self.assertIn("haiku_clamped_to_sonnet", o["flags"])

    def test_opus_implement_escalates(self):
        self.stub.choice = "opus"
        o = self.route(*AMBIG)
        self.assertEqual(o["jev_choice"], "opus")
        self.assertEqual(o["recommended_agent"], "implementer-deep")
        self.assertIn("opus_suggested_escalate_to_captain", o["flags"])

    def test_opus_review_maps_critical(self):
        self.stub.choice = "opus"
        o = self.route("--role", "review", "--risk", "medium", "--complexity", "high")
        self.assertEqual(o["recommended_agent"], "reviewer-critical")

    def test_fix_attempt_one_deep(self):
        o = self.route("--role", "implement", "--fix-attempts", "1")
        self.assertEqual(o["recommended_agent"], "implementer-deep")
        self.assertEqual(o["source"], "jev")

    def test_injected_transport(self):
        def tr(url, headers, body, timeout):
            self.assertEqual(timeout, 15)
            return 200, json.dumps({"model": "m", "answers": {"model_choice": {
                "choice": "sonnet", "confidence": 0.8}}, "usage": {"input_tokens": 5}}).encode()
        env = dict(self.env)
        o = jev_router.route({"role": "implement"}, enable_jev=True, transport=tr, env=env)
        self.assertEqual(o["source"], "jev")
        self.assertEqual(self.stub.hits, 0)


class BudgetTests(Base):
    def test_cap_three(self):
        for _ in range(3):
            self.assertEqual(self.route(*AMBIG)["source"], "jev")
        o = self.route(*AMBIG)
        self.assertEqual((o["source"], o["reason"]), ("rule_fallback", "budget_exhausted"))
        self.assertEqual(self.stub.hits, 3)
        self.assertEqual(len(self.calls()), 3)

    def test_limit_cannot_be_raised(self):
        env = {"COD_JEV_LIMIT": "10"}
        for _ in range(3):
            self.route(*AMBIG, "--limit", "99", extra_env=env)
        o = self.route(*AMBIG, "--limit", "99", extra_env=env)
        self.assertEqual(o["reason"], "budget_exhausted")
        self.assertEqual(self.stub.hits, 3)

    def test_limit_can_be_lowered(self):
        self.route(*AMBIG, "--limit", "1")
        o = self.route(*AMBIG, "--limit", "1")
        self.assertEqual(o["reason"], "budget_exhausted")
        self.assertEqual(self.stub.hits, 1)

    def test_http_errors_counted_no_retry(self):
        for status in (401, 429, 500):
            self.stub.status = status
            before = self.stub.hits
            o = self.route(*AMBIG)
            self.assertEqual((o["source"], o["error"]), ("rule_fallback", "HTTP%d" % status))
            self.assertEqual(self.stub.hits, before + 1)
        c = self.calls()
        self.assertEqual([x["http_status"] for x in c], [401, 429, 500])
        self.assertEqual(self.route(*AMBIG)["reason"], "budget_exhausted")
        self.assertEqual(self.stub.hits, 3)

    def test_network_error_counted(self):
        def tr(*a):
            raise OSError("boom " + SENTINEL)
        o = jev_router.route({"role": "implement"}, enable_jev=True, transport=tr, env=self.env)
        self.assertEqual(o["error"], "OSError")
        self.assertNotIn(SENTINEL, json.dumps(o))
        self.assertEqual(len(self.calls()), 1)


class KeyTests(Base):
    def test_missing_key(self):
        self.keyfile.unlink()
        o = self.route(*AMBIG)
        self.assertEqual((o["source"], o["reason"]), ("rule_fallback", "no_key"))
        self.assertEqual(self.stub.hits, 0)
        self.assertIn("missing", self.cli("check-key").stdout)

    def test_insecure_mode(self):
        os.chmod(self.keyfile, 0o644)
        o = self.route(*AMBIG)
        self.assertEqual(o["reason"], "insecure_key_file")
        self.assertEqual(self.stub.hits, 0)
        self.assertIn("insecure_key_file", self.cli("check-key").stdout)

    def test_key_file_in_repo(self):
        d = Path(tempfile.mkdtemp(dir=str(REPO / ".agent")))
        self.addCleanup(shutil.rmtree, str(d), True)
        kf = d / "k.env"
        self.write_key(kf)
        self.env["COD_JEV_KEY_FILE"] = str(kf)
        o = self.route(*AMBIG)
        self.assertEqual(o["reason"], "insecure_key_file")
        self.assertEqual(self.stub.hits, 0)

    def test_check_key_sources(self):
        self.assertIn("file", self.cli("check-key").stdout)
        p = self.cli("check-key", extra_env={"TYPESAFE_API_KEY": SENTINEL})
        self.assertIn("env", p.stdout)
        self.assertNotIn(SENTINEL, p.stdout + p.stderr)

    def test_secret_never_leaks(self):
        outs = []
        outs.append(self.cli("route", *AMBIG, "--json"))
        outs.append(self.cli("route", *AMBIG, "--dry-run"))
        outs.append(self.cli("route", *AMBIG, "--dry-run", "--json"))
        outs.append(self.cli("usage"))
        outs.append(self.cli("check-key"))
        self.stub.status = 401
        outs.append(self.cli("route", *AMBIG))
        for p in outs:
            self.assertNotIn(SENTINEL, p.stdout + p.stderr)
        self.assertNotIn(SENTINEL, self.ledger.read_text())
        self.assertIn("Bearer ***", outs[1].stdout)
        # env-provided key too
        p = self.cli("route", *AMBIG, "--dry-run", extra_env={"TYPESAFE_API_KEY": SENTINEL})
        self.assertNotIn(SENTINEL, p.stdout + p.stderr)


class NoSendTests(Base):
    def test_dry_run(self):
        o = self.route(*AMBIG, "--dry-run")
        self.assertTrue(o["dry_run"]["would_call"])
        self.assertEqual(o["dry_run"]["body"]["model"], "jev-latest")
        self.assertEqual(self.stub.hits, 0)
        self.assertFalse(self.ledger.exists())

    def test_offline(self):
        o = self.route(*AMBIG, "--offline")
        self.assertEqual((o["source"], o["reason"]), ("rule_fallback", "offline"))
        self.assertEqual(self.stub.hits, 0)
        self.assertFalse(self.ledger.exists())

    def test_enable_flag_without_env(self):
        o = self.route(*AMBIG, "--enable-jev", pilot=False)
        self.assertEqual(o["source"], "jev")


class UsageTests(Base):
    def test_usage_empty(self):
        self.assertIn("calls 0/3", self.cli("usage").stdout)

    def test_usage_after_call(self):
        self.route(*AMBIG, "--run-id", "RX")
        out = self.cli("usage").stdout
        self.assertIn("calls 1/3", out)
        self.assertIn("input_tokens 318", out)
        u = json.loads(self.cli("usage", "--json").stdout)
        self.assertEqual(u["calls_used"], 1)


if __name__ == "__main__":
    unittest.main()
