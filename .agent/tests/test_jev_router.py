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
# Mechanics tests use a finite environment cap; production is unrestricted by default.
TEST_CAP = 3


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
                if stub.status == 302:
                    self.send_header("Location", stub.url + "/redir")
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
                        TYPESAFE_BASE_URL=self.stub.url,
                        COD_JEV_LIMIT=str(TEST_CAP))

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
            (["--role", "implement", "--read-only", "--risk", "low", "--complexity", "low"], "sonnet", "implementer"),
            (["--role", "review", "--risk", "high", "--read-only"], "opus", "reviewer-critical"),
            (["--role", "review", "--critical", "persistence", "--read-only"], "opus", "reviewer-critical"),
            (["--role", "verify", "--read-only"], "sonnet", "verifier"),
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

    def test_no_banner_for_rule_or_dry_run(self):
        for args in (["route", "--role", "explore", "--json"],
                     ["route", *AMBIG, "--dry-run"],
                     ["route", *AMBIG, "--dry-run", "--json"]):
            p = self.cli(*args)
            self.assertNotIn("JEV", p.stderr)
        self.assertEqual(self.stub.hits, 0)
        self.assertEqual(self.calls(), [])
        p = self.cli("route", *AMBIG, pilot=False)
        self.assertNotIn("JEV START", p.stderr)

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

    def test_banner_on_real_jev_call(self):
        for extra in ([], ["--json"]):
            self.ledger.unlink(missing_ok=True)
            p = self.cli("route", *AMBIG, *extra)
            err = p.stderr.splitlines()
            self.assertEqual(err[0], "JEV START")
            self.assertEqual(err[-1], "JEV END")
            self.assertIn("recommendation: sonnet -> implementer (source=jev, jev_choice=sonnet)", err)
            self.assertIn("confidence: 0.90", err)
            self.assertIn("consumption: input_tokens=318 output_tokens=34 "
                          "est_cost_usd=0.000013 calls=1/3", err)
            self.assertNotIn(SENTINEL, p.stderr + p.stdout)
            if extra:
                self.assertEqual(json.loads(p.stdout)["source"], "jev")
            else:
                self.assertNotIn("JEV START", p.stdout)

    def test_banner_on_low_confidence_fallback(self):
        self.stub.confidence = 0.3
        p = self.cli("route", *AMBIG, "--json")
        self.assertIn("JEV START", p.stderr)
        self.assertIn("confidence: 0.30", p.stderr)
        self.assertEqual(json.loads(p.stdout)["source"], "rule_fallback")

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
        # The environment cap is a ceiling: a flag asking for more cannot lift it.
        for _ in range(TEST_CAP):
            self.route(*AMBIG, "--limit", "99")
        o = self.route(*AMBIG, "--limit", "99")
        self.assertEqual(o["reason"], "budget_exhausted")
        self.assertEqual(self.stub.hits, TEST_CAP)

    def test_limit_can_be_lowered(self):
        self.route(*AMBIG, "--limit", "1")
        o = self.route(*AMBIG, "--limit", "1")
        self.assertEqual(o["reason"], "budget_exhausted")
        self.assertEqual(self.stub.hits, 1)

    def test_http_errors_counted_no_retry(self):
        for status in (429, 500, 401):
            self.stub.status = status
            before = self.stub.hits
            o = self.route(*AMBIG)
            self.assertEqual((o["source"], o["error"]), ("rule_fallback", "HTTP%d" % status))
            self.assertEqual(self.stub.hits, before + 1)
        c = self.calls()
        self.assertEqual([x["http_status"] for x in c], [429, 500, 401])
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


class HardeningTests(Base):
    BAD = [b"{garbage", b'{"calls": [{"outcome": "ok"', b'{"limit": 3}',
           b'{"calls": {"a": 1}}', b'[]', b'"x"']

    def test_corrupt_ledger_fails_closed(self):
        self.ledger.parent.mkdir(parents=True)
        for raw in self.BAD:
            self.ledger.write_bytes(raw)
            o = self.route(*AMBIG)
            self.assertEqual((o["source"], o["reason"]), ("rule_fallback", "ledger_unreadable"), raw)
            self.assertEqual(self.stub.hits, 0)
            self.assertEqual(self.ledger.read_bytes(), raw)
            with self.assertRaises(jev_router.LedgerUnreadable):
                jev_router.reserve(self.ledger, 3, "r", "q")
            jev_router.finish(self.ledger, 0, outcome="x")
            self.assertEqual(self.ledger.read_bytes(), raw)
            p = subprocess.run([sys.executable, str(TOOL), "usage"], env=self.env,
                               capture_output=True, text=True)
            self.assertNotEqual(p.returncode, 0)
            self.assertIn("CORRUPT", p.stdout)
            self.assertNotIn("calls 0/3", p.stdout)

    def test_non_regular_ledger_fails_closed(self):
        self.ledger.mkdir(parents=True)
        o = self.route(*AMBIG)
        self.assertEqual(o["reason"], "ledger_unreadable")
        self.assertEqual(self.stub.hits, 0)

    def test_reserved_slot_counts_as_used(self):
        self.ledger.parent.mkdir(parents=True)
        self.ledger.write_text(json.dumps({"calls": [{"outcome": "reserved"}] * 3}))
        self.assertEqual(self.route(*AMBIG)["reason"], "budget_exhausted")
        self.assertEqual(self.stub.hits, 0)

    def test_description_truncated(self):
        o = self.route(*AMBIG[:6], "--description", "x" * 900)
        self.assertEqual(o["source"], "jev")
        st = self.stub.bodies[0]["state"]
        self.assertEqual(len(st["description"]), 500)
        self.assertTrue(st["description_truncated"])
        self.route(*AMBIG)
        self.assertNotIn("description_truncated", self.stub.bodies[1]["state"])

    def test_bad_confidence_is_parse_error(self):
        for bad in ("high", 1.5, -0.1, float("nan"), float("inf"), None, True):
            self.stub.confidence = bad
            self.ledger.unlink() if self.ledger.exists() else None
            o = self.route(*AMBIG)
            self.assertEqual((o["source"], o["error"]), ("rule_fallback", "ParseError"), bad)
            self.assertEqual(self.calls()[0]["outcome"].split(":")[0], "parse_error")

    def test_redirect_not_followed(self):
        self.stub.status = 302
        o = self.route(*AMBIG)
        self.assertEqual((o["source"], o["error"]), ("rule_fallback", "HTTP302"))
        self.assertEqual(self.stub.hits, 1)
        self.assertEqual(len(self.calls()), 1)


class ProductionCapTests(unittest.TestCase):
    """Unlimited by default; optional limits and audit ledger remain."""

    def test_default_unlimited_and_optional_restrictions(self):
        self.assertIsNone(jev_router.PILOT_MAX_PAID_CALLS)
        self.assertIsNone(jev_router.effective_limit({}))
        self.assertEqual(jev_router.effective_limit({"COD_JEV_LIMIT": "500"}), 500)
        self.assertEqual(jev_router.effective_limit({"COD_JEV_LIMIT": "3"}, flag="99"), 3)
        self.assertEqual(jev_router.effective_limit({}, flag="1"), 1)

    def test_unrestricted_ledger_accepts_over_100_mock_reservations(self):
        with tempfile.TemporaryDirectory() as d:
            ledger = Path(d) / "ledger.json"
            for i in range(105):
                self.assertEqual(jev_router.reserve(ledger, None, "test", "mock-%d" % i), i)
            self.assertEqual(len(jev_router.read_ledger(ledger)["calls"]), 105)
            self.assertIsNone(jev_router.read_ledger(ledger)["limit"])


class ProxyAuthTests(unittest.TestCase):
    REQ = {"role": "implement", "risk": "medium", "complexity": "medium", "description": "x"}

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.tmp = Path(self._tmp.name).resolve()
        self.ledger = self.tmp / "ledger.json"
        self.env = {"COD_JEV_PILOT": "1", "COD_JEV_LEDGER": str(self.ledger),
                    "COD_JEV_KEY_FILE": str(self.tmp / "none.env"), "HOME": str(self.tmp)}
        self.sent = []
        self.status = 200

    def transport(self, url, headers, body, timeout):
        self.sent.append(dict(headers))
        if isinstance(self.status, Exception):
            raise self.status
        if self.status != 200:
            return self.status, b"{}"
        return 200, json.dumps({
            "model": "jev-1", "usage": {"input_tokens": 10, "output_tokens": 1},
            "answers": {"model_choice": {"choice": "sonnet", "confidence": 0.9}}}).encode()

    def go(self, **kw):
        return jev_router.route(self.REQ, transport=self.transport, env=self.env, **kw)

    def n_calls(self):
        return len(jev_router.read_ledger(self.ledger)["calls"]) if self.ledger.exists() else 0

    def test_proxy_sends_without_authorization(self):
        self.env["COD_JEV_AUTH"] = "proxy"
        self.assertEqual(self.go()["source"], "jev")
        self.assertEqual(self.sent, [{"Content-Type": "application/json"}])

    def test_without_opt_in_still_no_key(self):
        for v in (None, "other", ""):
            if v is not None:
                self.env["COD_JEV_AUTH"] = v
            self.assertEqual(self.go()["reason"], "no_key")
        self.assertEqual(self.sent, [])

    def test_dry_run_proxy(self):
        self.env["COD_JEV_AUTH"] = "proxy"
        d = self.go(dry_run=True)["dry_run"]
        self.assertEqual(d["auth"], "proxy")
        self.assertEqual(d["headers"], {"Content-Type": "application/json"})
        self.assertEqual(self.sent, [])

    def test_check_key_proxy(self):
        env = dict(os.environ, COD_JEV_AUTH="proxy")
        p = subprocess.run([sys.executable, str(TOOL), "check-key"], env=env,
                           capture_output=True, text=True)
        self.assertEqual(p.stdout.strip(),
                         "key: proxy (injected by egress proxy; not verifiable locally)")

    def test_brake_after_401_and_403(self):
        self.env["COD_JEV_AUTH"] = "proxy"
        for code in (401, 403):
            self.ledger.unlink(missing_ok=True)
            self.sent.clear()
            self.status = code
            self.assertEqual(self.go()["reason"], "error")
            self.assertEqual(len(self.sent), 1)
            o = self.go()
            self.assertEqual((o["source"], o["reason"]), ("rule_fallback", "auth_failed_previously"))
            self.assertEqual(len(self.sent), 1)
            self.assertEqual(self.n_calls(), 1)

    def test_retry_auth_single_attempt_then_blocked(self):
        self.env["COD_JEV_AUTH"] = "proxy"
        self.status = 401
        self.go()
        self.go(retry_auth=True)
        self.assertEqual(len(self.sent), 2)
        self.assertEqual(self.go()["reason"], "auth_failed_previously")
        self.assertEqual(len(self.sent), 2)
        self.assertEqual(self.n_calls(), 2)

    def test_success_after_retry_unblocks(self):
        self.env["COD_JEV_AUTH"] = "proxy"
        self.status = 401
        self.go()
        self.status = 200
        self.assertEqual(self.go(retry_auth=True)["source"], "jev")
        self.assertEqual(self.go()["source"], "jev")
        self.assertEqual(len(self.sent), 3)

    def test_brake_applies_in_key_mode(self):
        self.env["TYPESAFE_API_KEY"] = SENTINEL
        self.status = 401
        self.go()
        self.assertEqual(self.go()["reason"], "auth_failed_previously")
        self.assertEqual(len(self.sent), 1)
        self.assertEqual(self.sent[0]["Authorization"], "Bearer " + SENTINEL)

    def test_500_and_timeout_do_not_brake(self):
        self.env["COD_JEV_AUTH"] = "proxy"
        self.status = 500
        self.go()
        self.status = TimeoutError()
        self.go()
        self.status = 200
        self.assertEqual(self.go()["source"], "jev")
        self.assertEqual(len(self.sent), 3)

    def test_brake_persists_after_failed_retry(self):
        self.env["COD_JEV_AUTH"] = "proxy"
        for bad in (TimeoutError(), 500):
            self.ledger.unlink(missing_ok=True)
            self.sent.clear()
            self.status = 401
            self.go()
            self.status = bad
            self.go(retry_auth=True)
            self.assertEqual(len(self.sent), 2)
            self.assertEqual(self.go()["reason"], "auth_failed_previously")
            self.assertEqual(len(self.sent), 2)

    def test_ok_retry_then_500_does_not_brake(self):
        self.env["COD_JEV_AUTH"] = "proxy"
        self.status = 401
        self.go()
        self.status = 200
        self.go(retry_auth=True)
        self.status = 500
        self.go()
        self.status = 200
        self.assertEqual(self.go()["source"], "jev")
        self.assertEqual(len(self.sent), 4)

    def test_usage_shows_blocked_line(self):
        self.env["COD_JEV_AUTH"] = "proxy"
        self.status = 401
        self.go()
        p = subprocess.run([sys.executable, str(TOOL), "usage"],
                           env=dict(os.environ, COD_JEV_LEDGER=str(self.ledger)),
                           capture_output=True, text=True)
        self.assertIn("auth: BLOCKED after http_401 (use route --retry-auth after fixing credentials)",
                      p.stdout)


class AuthGateConcurrencyTests(unittest.TestCase):
    """Requests sharing the ledger must not race past an HTTP 401."""

    REQ = {"role": "implement", "risk": "medium", "complexity": "medium"}

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.ledger = Path(self.tmp.name) / "ledger.json"
        self.env = {"COD_JEV_LEDGER": str(self.ledger), "COD_JEV_AUTH": "proxy"}
        self.started = threading.Event()
        self.release = threading.Event()
        self.calls = 0

    def transport(self, *args):
        self.calls += 1
        if self.calls == 1:
            self.started.set()
            if not self.release.wait(5):
                raise TimeoutError("wait timed out")
            return 401, b'{}'
        return 200, json.dumps({
            "model": "jev-1", "usage": {"input_tokens": 5, "output_tokens": 1},
            "answers": {"model_choice": {"choice": "sonnet", "confidence": 0.9}}
        }).encode()

    def test_two_parallel_requests_do_not_bypass_401(self):
        results, errors = [], []
        def call():
            try:
                results.append(jev_router.route(self.REQ, enable_jev=True,
                                                transport=self.transport, env=self.env))
            except Exception as exc:
                errors.append(type(exc).__name__)
        t1, t2 = threading.Thread(target=call), threading.Thread(target=call)
        t1.start()
        try:
            self.assertTrue(self.started.wait(5))
            t2.start()
        finally:
            self.release.set()
        t1.join(6)
        t2.join(6)
        self.assertFalse(t1.is_alive() or t2.is_alive())
        self.assertEqual(errors, [])
        self.assertEqual(self.calls, 1)
        self.assertEqual({r.get("reason") for r in results},
                         {"error", "auth_failed_previously"})
        self.assertEqual(len(jev_router.read_ledger(self.ledger)["calls"]), 1)

    def test_exception_releases_gate_for_next_call(self):
        def fails(*args):
            raise TimeoutError("simulated")
        first = jev_router.route(self.REQ, enable_jev=True,
                                 transport=fails, env=self.env)
        self.assertEqual(first["reason"], "error")
        def succeeds(*args):
            return 200, json.dumps({
                "model": "jev-1", "usage": {"input_tokens": 5, "output_tokens": 1},
                "answers": {"model_choice": {"choice": "sonnet", "confidence": 0.9}}
            }).encode()
        second = jev_router.route(self.REQ, enable_jev=True,
                                  transport=succeeds, env=self.env)
        self.assertEqual(second["source"], "jev")


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
