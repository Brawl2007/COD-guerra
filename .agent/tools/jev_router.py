#!/usr/bin/env python3
"""Advisory model router for the Captain (Jev pilot).

Local rules decide obvious cases with zero network. Only ambiguous cases may
consult TypeSafe Jev, and only when the pilot is explicitly enabled, a key is
available, any optional user-defined call limit permits it and --offline is not set.
The tool never spawns agents; the Captain keeps the final decision.
Python stdlib only. The API key is never printed, logged or written.
COD_JEV_AUTH=proxy (opt-in) calls without a key or Authorization header, for an
egress proxy that injects it. After a http_401/403 paid call, route refuses new
paid calls (auth_failed_previously) until `route --retry-auth` (one attempt).
"""
import argparse
import datetime
import fcntl
import json
import math
import os
import stat
import sys
import urllib.error
import urllib.request
from pathlib import Path

# Explicit user authorization (2026-10-13): paid Jev calls without a project cap.
# Optional COD_JEV_LIMIT / --limit may lower this to a finite number.
# The provider may enforce credit/billing limits; those are not bypassed.
PILOT_MAX_PAID_CALLS = None
PRICE_PER_MTOK_INPUT = 0.042
CLOUD_WEB_BUDGET_USD = 5.0  # Local estimate only; TypeSafe account must enforce real prepaid balance.
DEFAULT_BASE = "https://api.typesafe.ai"
TIMEOUT_S = 15
DESC_MAX = 500
REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_KEY_FILE = "~/.config/cod-guerra/typesafe.env"
DEFAULT_LEDGER = "~/.local/state/cod-guerra/jev_pilot_ledger.json"
ROLES = ("explore", "implement", "verify", "review")
LEVELS = ("low", "medium", "high")
CRITICAL_NAMES = ("persistence", "architecture", "integration", "simulation", "save")

INSTRUCTIONS = (
    "Pick the cheapest capable model for a software-engineering delegation. "
    "The state describes the task: role (explore/implement/verify/review), "
    "description, risk, complexity, previous failed fix attempts and critical "
    "flags. Choose exactly one model."
)
CRITERIA = {
    "haiku": "Read-only, narrow exploration or lookup with no code changes and no judgement about correctness.",
    "sonnet": "Ordinary scoped implementation, independent verification, or ordinary review; also hard implementation after repeated failures (higher effort, same model).",
    "opus": "Critical review of architecture, integration, persistence, simulation or save-data changes where a missed flaw is costly.",
}


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")


def _env(env):
    return os.environ if env is None else env


# ---------------------------------------------------------------- request
def normalize(req):
    role = str(req.get("role", "")).lower()
    if role not in ROLES:
        raise ValueError("role must be one of %s" % ", ".join(ROLES))
    risk = str(req.get("risk") or "medium").lower()
    cx = str(req.get("complexity") or "medium").lower()
    if risk not in LEVELS or cx not in LEVELS:
        raise ValueError("risk/complexity must be low|medium|high")
    desc = str(req.get("description", ""))
    flags = req.get("critical_flags") or []
    if flags is True:
        flags = ["unspecified"]
    elif isinstance(flags, str):
        flags = [f.strip().lower() for f in flags.split(",") if f.strip()]
    elif isinstance(flags, dict):
        flags = [k for k, v in flags.items() if v]
    else:
        flags = [str(f).lower() for f in flags]
    return {
        "role": role,
        "description": desc[:DESC_MAX],
        **({"description_truncated": True} if len(desc) > DESC_MAX else {}),
        "risk": risk,
        "complexity": cx,
        "fix_attempts": int(req.get("fix_attempts") or 0),
        "critical_flags": sorted(set(flags)),
        "read_only": bool(req.get("read_only", False)),
    }


def rule_decide(r):
    """Return (model, agent, ambiguous, rationale)."""
    role = r["role"]
    if role == "explore":
        return "haiku", "explorer", False, "read-only narrow exploration"
    if role == "verify":
        return "sonnet", "verifier", False, "independent verification"
    if role == "review":
        if r["critical_flags"] or r["risk"] == "high":
            return "opus", "reviewer-critical", False, "critical flag or high risk review"
        if r["risk"] == "medium" and r["complexity"] == "high":
            return "sonnet", "reviewer", True, "medium risk with high complexity review"
        return "sonnet", "reviewer", False, "ordinary review"
    # implement
    if r["fix_attempts"] >= 2:
        return "sonnet", "implementer-deep", False, "persistent failures (fix_attempts>=2)"
    if r["risk"] == "low" and r["complexity"] == "low" and r["fix_attempts"] == 0:
        return "sonnet", "implementer", False, "ordinary scoped implementation"
    if r["fix_attempts"] >= 1 or r["risk"] == "high" or r["complexity"] == "high":
        return "sonnet", "implementer-deep", True, "ambiguous: elevated difficulty"
    return "sonnet", "implementer", True, "ambiguous: medium risk/complexity"


# -------------------------------------------------------------------- key
def load_key(env=None):
    """Return (status, key). status: env|file|proxy|missing|insecure_key_file."""
    e = _env(env)
    if (e.get("COD_JEV_AUTH") or "").strip() == "proxy":
        return "proxy", None
    k = (e.get("TYPESAFE_API_KEY") or "").strip()
    if k:
        return "env", k
    path = Path(os.path.expanduser(e.get("COD_JEV_KEY_FILE") or DEFAULT_KEY_FILE))
    try:
        real = path.resolve()
        st = os.stat(real)
    except OSError:
        return "missing", None
    if not stat.S_ISREG(st.st_mode) or st.st_mode & 0o077:
        return "insecure_key_file", None
    if real == REPO_ROOT or REPO_ROOT in real.parents:
        return "insecure_key_file", None
    try:
        text = real.read_text()
    except OSError:
        return "missing", None
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("TYPESAFE_API_KEY="):
            v = line.split("=", 1)[1].strip().strip("'\"")
            if v:
                return "file", v
    return "missing", None


# ----------------------------------------------------------------- ledger
def ledger_path(env=None):
    return Path(os.path.expanduser(_env(env).get("COD_JEV_LEDGER") or DEFAULT_LEDGER))


def effective_limit(env=None, flag=None):
    """Scoped paid opt-in for Cloud Web, optional per-ledger call limit.

    No arbitrary 20-call ceiling: the user approved use of the existing
    US$5 balance, subject to the separate estimated-cost guard below.
    The cloud ledger is ephemeral and is NOT a provider billing hard limit.
    """
    e = _env(env)
    lim = PILOT_MAX_PAID_CALLS
    for v in (e.get("COD_JEV_LIMIT"), flag):
        if v not in (None, ""):
            try:
                chosen = max(0, int(v))
                lim = chosen if lim is None else min(lim, chosen)
            except (ValueError, TypeError):
                pass
    if e.get("CLAUDE_CODE_REMOTE") == "true":
        if e.get("COD_JEV_WEB_PAID_APPROVED") != "1":
            return 0  # Refuse calls by default, even behind credential-injecting proxy.
        # No forced count cap; keep any explicit COD_JEV_LIMIT or --limit.
    return lim


class LedgerUnreadable(Exception):
    """Ledger exists but cannot be trusted; callers must fail closed."""


def read_ledger(path):
    """Only a missing file is an empty ledger; anything else unreadable raises."""
    try:
        st = os.stat(str(path))
        if not stat.S_ISREG(st.st_mode):
            raise LedgerUnreadable("not_regular_file")
        data = json.loads(Path(path).read_text())
    except FileNotFoundError:
        return {"limit": PILOT_MAX_PAID_CALLS, "calls": []}
    except LedgerUnreadable:
        raise
    except (OSError, ValueError) as exc:
        raise LedgerUnreadable(type(exc).__name__)
    if not isinstance(data, dict) or not isinstance(data.get("calls"), list):
        raise LedgerUnreadable("bad_structure")
    return data


class Locked:
    def __init__(self, path):
        self.path = Path(path)

    def __enter__(self):
        self.path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        fd = os.open(str(self.path) + ".lock", os.O_CREAT | os.O_RDWR, 0o600)
        fcntl.flock(fd, fcntl.LOCK_EX)
        self.fd = fd
        return self

    def __exit__(self, *a):
        fcntl.flock(self.fd, fcntl.LOCK_UN)
        os.close(self.fd)

    def write(self, data):
        tmp = str(self.path) + ".tmp"
        fd = os.open(tmp, os.O_CREAT | os.O_WRONLY | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w") as f:
            json.dump(data, f, indent=2)
        os.chmod(tmp, 0o600)
        os.replace(tmp, self.path)


def paid_call_gate(path):
    """Serialize requests through their persisted ledger outcomes.

    Independent of the ledger file lock to avoid reentrant locking in
    reserve() and finish(). The OS releases it on abrupt process exit.
    """
    return Locked(str(path) + ".auth")


def reserve(path, limit, run_id, request_id):
    """Atomically reserve a slot. Return index or None if refused."""
    with Locked(path) as lk:
        data = read_ledger(path)  # raises LedgerUnreadable: never rewrite
        if limit is not None and len(data["calls"]) >= limit:
            return None
        data["limit"] = limit
        data["calls"].append({
            "ts": now(), "run_id": run_id, "request_id": request_id,
            "http_status": None, "model": None, "input_tokens": 0,
            "output_tokens": 0, "est_cost_usd": 0.0, "choice": None,
            "confidence": None, "outcome": "reserved",
        })
        lk.write(data)
        return len(data["calls"]) - 1


def finish(path, idx, **fields):
    with Locked(path) as lk:
        try:
            data = read_ledger(path)
        except LedgerUnreadable:
            return False
        if idx < len(data["calls"]):
            data["calls"][idx].update(fields)
            lk.write(data)


def auth_blocked(calls):
    """Latest http_401/http_403 outcome after the last successful ("ok") call, else None."""
    found = None
    for c in calls:
        o = c.get("outcome")
        if o == "ok":
            found = None
        elif o in ("http_401", "http_403"):
            found = o
    return found


def est_cost(tokens):
    return round(tokens * PRICE_PER_MTOK_INPUT / 1_000_000, 10)


def cloud_credit_available(env, calls, body):
    """Fail closed before dispatch if the scoped Cloud Web ledger approaches US$5.

    UTF-8 body bytes plus overhead intentionally overestimate input tokens.
    This is NOT a provider billing limit and resets if the VM ledger is lost.
    """
    e = _env(env)
    if e.get("CLAUDE_CODE_REMOTE") != "true":
        return True
    if e.get("COD_JEV_WEB_PAID_APPROVED") != "1":
        return False
    try:
        totals = [float(c.get("est_cost_usd", 0.0)) for c in calls]
        if any(not math.isfinite(x) or x < 0 for x in totals):
            return False
        payload_bytes = len(json.dumps(body, ensure_ascii=False).encode("utf-8"))
        conservative = est_cost(payload_bytes + 2048)
        return math.fsum(totals) + conservative <= CLOUD_WEB_BUDGET_USD
    except (TypeError, ValueError, OverflowError):
        return False


# -------------------------------------------------------------- transport
class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None  # never forward the Authorization header


_OPENER = urllib.request.build_opener(_NoRedirect)


def default_transport(url, headers, body, timeout):
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with _OPENER.open(req, timeout=timeout) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read()


def build_body(norm):
    return {
        "state": norm,
        "model": "jev-latest",
        "questions": {"model_choice": {
            "type": "choice", "instructions": INSTRUCTIONS, "criteria": CRITERIA}},
    }


def map_choice(choice, norm):
    """Return (model, agent, flags) applying guardrails."""
    role, flags = norm["role"], []
    if role == "implement":
        deep = norm["fix_attempts"] >= 1
        if choice == "opus":
            flags.append("opus_suggested_escalate_to_captain")
            return "sonnet", "implementer-deep", flags
        if choice == "haiku":
            flags.append("haiku_clamped_to_sonnet")
        return "sonnet", ("implementer-deep" if deep else "implementer"), flags
    if role == "review":
        if choice == "opus":
            return "opus", "reviewer-critical", flags
        if choice == "haiku":
            flags.append("haiku_clamped_to_sonnet")
        return "sonnet", "reviewer", flags
    return None, None, flags


# ------------------------------------------------------------------ route
def route(request, *, enable_jev=False, offline=False, dry_run=False,
          min_confidence=0.6, transport=None, env=None, run_id=None,
          limit_flag=None, retry_auth=False):
    e = _env(env)
    norm = normalize(request)
    model, agent, ambiguous, why = rule_decide(norm)
    out = {
        "recommendation_model": model, "recommended_agent": agent,
        "source": "rule", "confidence": None, "rationale": why,
        "rule_default": {"model": model, "agent": agent},
        "flags": [], "advisory": True,
    }
    if not ambiguous:
        return out

    def fallback(reason, **extra):
        out.update(source="rule_fallback", reason=reason, **extra)
        return out

    lpath = ledger_path(e)
    limit = effective_limit(e, limit_flag)
    if not (enable_jev or e.get("COD_JEV_PILOT") == "1"):
        return fallback("disabled")
    if offline:
        return fallback("offline")
    kstatus, key = load_key(e)
    if key is None and kstatus != "proxy":
        return fallback("insecure_key_file" if kstatus == "insecure_key_file" else "no_key")
    try:
        prior = read_ledger(lpath)["calls"]
        used = len(prior)
    except LedgerUnreadable:
        return fallback("ledger_unreadable")
    if limit is not None and used >= limit:
        return fallback("budget_exhausted", budget={"used": used, "limit": limit})

    if auth_blocked(prior) and not retry_auth:
        return fallback("auth_failed_previously")

    base = (e.get("TYPESAFE_BASE_URL") or DEFAULT_BASE).rstrip("/")
    url = base + "/v1/systemone"
    body = build_body(norm)
    if not cloud_credit_available(e, prior, body):
        return fallback("budget_exhausted", budget={"kind": "cloud_usd_5_ledger_estimate"})
    if dry_run:
        out["source"] = "rule"
        out["dry_run"] = {
            "would_call": True, "url": url,
            "headers": ({"Content-Type": "application/json"} if kstatus == "proxy" else
                        {"Authorization": "Bearer ***", "Content-Type": "application/json"}),
            **({"auth": "proxy"} if kstatus == "proxy" else {}),
            "body": body, "budget": {"used": used, "limit": limit},
        }
        return out

    # Keep the cross-process auth gate through the HTTP result and ledger write.
    with paid_call_gate(lpath):
        try:
            latest = read_ledger(lpath)["calls"]
        except LedgerUnreadable:
            return fallback("ledger_unreadable")
        now_used = len(latest)
        if limit is not None and now_used >= limit:
            return fallback("budget_exhausted", budget={"used": now_used, "limit": limit})
        if auth_blocked(latest) and not retry_auth:
            return fallback("auth_failed_previously")
        if not cloud_credit_available(e, latest, body):
            return fallback("budget_exhausted", budget={"kind": "cloud_usd_5_ledger_estimate"})
        request_id = "%s-%d" % (run_id or "norun", now_used + 1)
        try:
            idx = reserve(lpath, limit, run_id, request_id)
        except LedgerUnreadable:
            return fallback("ledger_unreadable")
        if idx is None:
            return fallback("budget_exhausted", budget={"used": now_used, "limit": limit})
        headers = {"Content-Type": "application/json"}
        if key is not None:
            headers["Authorization"] = "Bearer " + key
        send = transport or default_transport
        try:
            status, raw = send(url, headers, json.dumps(body).encode(), TIMEOUT_S)
        except Exception as exc:  # network errors; never include message (may echo URL/headers)
            finish(lpath, idx, outcome="error:" + type(exc).__name__)
            return fallback("error", error=type(exc).__name__)
        if status != 200:
            finish(lpath, idx, http_status=status, outcome="http_%d" % status)
            return fallback("error", error="HTTP%d" % status)
        try:
            resp = json.loads(raw)
            ans = resp["answers"]["model_choice"]
            choice = str(ans["choice"]).lower()
            conf = ans["confidence"]
            if isinstance(conf, bool) or not isinstance(conf, (int, float)):
                raise ValueError("bad confidence")
            conf = float(conf)
            if not math.isfinite(conf) or not 0.0 <= conf <= 1.0:
                raise ValueError("bad confidence")
            usage = resp.get("usage") or {}
            tin = int(usage.get("input_tokens", 0))
            tout = int(usage.get("output_tokens", 0))
            jmodel = resp.get("model")
            if choice not in CRITERIA:
                raise ValueError("bad choice")
        except Exception as exc:
            finish(lpath, idx, http_status=status, outcome="parse_error:" + type(exc).__name__)
            return fallback("error", error="ParseError")
        finish(lpath, idx, http_status=status, model=jmodel, input_tokens=tin,
               output_tokens=tout, est_cost_usd=est_cost(tin), choice=choice,
               confidence=conf, outcome="ok")
        out.update(jev_choice=choice, jev_model=jmodel, confidence=conf,
                   usage={"input_tokens": tin, "output_tokens": tout,
                          "est_cost_usd": est_cost(tin)})
        if conf < min_confidence:
            return fallback("low_confidence", confidence=conf)
        m, a, flags = map_choice(choice, norm)
        out.update(source="jev", recommendation_model=m, recommended_agent=a,
                   flags=flags, rationale="Jev choice %s (confidence %.2f)" % (choice, conf))
        return out


# -------------------------------------------------------------------- CLI
def usage_summary(env=None):
    p = ledger_path(env)
    try:
        calls = read_ledger(p)["calls"]
    except LedgerUnreadable as exc:
        return {"ledger": str(p), "ledger_status": "corrupt_or_unreadable",
                "reason": str(exc), "limit": effective_limit(env)}
    lim = effective_limit(env)
    return {
        "ledger": str(p), "calls_used": len(calls), "limit": lim,
        "input_tokens": sum(c.get("input_tokens") or 0 for c in calls),
        "est_cost_usd": round(sum(c.get("est_cost_usd") or 0 for c in calls), 10),
        "calls": calls,
    }


def print_jev_banner(out, file=None):
    """Banner on stderr for a real Jev consultation (response received and parsed)."""
    u = out.get("usage")
    if not u:
        return
    file = file or sys.stderr
    s = usage_summary()
    calls = "%s/%s" % (s.get("calls_used", "?"), "unlimited" if s.get("limit") is None else s["limit"])
    src = "source=%s" % out.get("source")
    if out.get("jev_choice"):
        src += ", jev_choice=%s" % out["jev_choice"]
    print("JEV START", file=file)
    print("recommendation: %s -> %s (%s)" % (
        out.get("recommendation_model"), out.get("recommended_agent"), src), file=file)
    print("confidence: %.2f" % (out.get("confidence") or 0.0), file=file)
    print("consumption: input_tokens=%s output_tokens=%s est_cost_usd=%.6f calls=%s" % (
        u.get("input_tokens"), u.get("output_tokens"), u.get("est_cost_usd") or 0.0, calls),
        file=file)
    print("JEV END", file=file)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("route")
    r.add_argument("--role", required=True, choices=ROLES)
    r.add_argument("--description", default="")
    r.add_argument("--risk", choices=LEVELS, default="medium")
    r.add_argument("--complexity", choices=LEVELS, default="medium")
    r.add_argument("--fix-attempts", type=int, default=0)
    r.add_argument("--critical", default="", help="comma list: " + ",".join(CRITICAL_NAMES))
    r.add_argument("--read-only", action="store_true")
    r.add_argument("--run-id")
    r.add_argument("--enable-jev", action="store_true")
    r.add_argument("--offline", action="store_true")
    r.add_argument("--dry-run", action="store_true")
    r.add_argument("--retry-auth", action="store_true",
                   help="one paid attempt after http_401/403 (fix credentials first)")
    r.add_argument("--min-confidence", type=float, default=0.6)
    r.add_argument("--limit", type=int, help="optional cap on calls; default is unlimited")
    r.add_argument("--request-json", help="JSON file with request fields (CLI flags override)")
    for n in ("usage", "check-key"):
        s = sub.add_parser(n)
    ap_json = [r, *sub.choices.values()]
    for p in set(ap_json):
        p.add_argument("--json", action="store_true")
    a = ap.parse_args(argv)

    if a.cmd == "usage":
        u = usage_summary()
        if u.get("ledger_status"):
            if a.json:
                print(json.dumps(u, indent=2))
            else:
                print("ledger CORRUPT or unreadable (%s): %s; budget unknown, paid calls refused" % (
                    u["reason"], u["ledger"]))
            return 2
        if a.json:
            print(json.dumps(u, indent=2))
        else:
            print("calls %d/%s  input_tokens %d  est_cost_usd %.6f" % (
                u["calls_used"], "unlimited" if u["limit"] is None else u["limit"],
                u["input_tokens"], u["est_cost_usd"]))
            for c in u["calls"]:
                print("  %s %s %s tokens=%s choice=%s conf=%s outcome=%s" % (
                    c.get("ts"), c.get("run_id"), c.get("model"), c.get("input_tokens"),
                    c.get("choice"), c.get("confidence"), c.get("outcome")))
            blocked = auth_blocked(u["calls"])
            if blocked:
                print("auth: BLOCKED after %s (use route --retry-auth after fixing credentials)" % blocked)
        return 0
    if a.cmd == "check-key":
        st, _ = load_key()
        res = {"key_status": st}
        if a.json:
            print(json.dumps(res))
        elif st == "proxy":
            print("key: proxy (injected by egress proxy; not verifiable locally)")
        else:
            print("key: " + st)
        return 0

    req = {}
    if a.request_json:
        try:
            req = json.loads(Path(a.request_json).read_text())
        except (OSError, ValueError) as exc:
            ap.error("cannot read --request-json: %s" % type(exc).__name__)
    req.update(role=a.role, risk=a.risk, complexity=a.complexity,
               fix_attempts=a.fix_attempts, read_only=a.read_only or req.get("read_only", False))
    if a.description or "description" not in req:
        req["description"] = a.description
    if a.critical:
        req["critical_flags"] = a.critical
    try:
        out = route(req, enable_jev=a.enable_jev, offline=a.offline, dry_run=a.dry_run,
                    min_confidence=a.min_confidence, run_id=a.run_id, limit_flag=a.limit,
                    retry_auth=a.retry_auth)
    except ValueError as exc:
        ap.error(str(exc))
    print_jev_banner(out)
    if a.json:
        print(json.dumps(out, indent=2))
    else:
        line = "%s -> %s (%s)" % (out["recommendation_model"], out["recommended_agent"], out["source"])
        if out.get("reason"):
            line += " reason=" + out["reason"]
        if out.get("error"):
            line += " error=" + out["error"]
        if out.get("confidence") is not None:
            line += " confidence=%.2f" % out["confidence"]
        print(line)
        for f in out["flags"]:
            print("flag: " + f)
        if "dry_run" in out:
            print("dry-run: would call %s (no request sent)" % out["dry_run"]["url"])
            print(json.dumps(out["dry_run"], indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
