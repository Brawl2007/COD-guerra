#!/usr/bin/env python3
"""Advisory decision support for the Captain, built on the Jev router.

Six capabilities (priority, bug, branch, risk, verify, cost) share ONE engine:
deterministic local rules first; Jev (TypeSafe choice questions, several per
request, one paid call) only for ambiguous cases and only when the pilot is
enabled, a key exists, the shared ledger has budget and --offline is not set.
Jev output is untrusted: it is validated and then clipped by safety
post-filters. Nothing here merges, pushes, approves or marks anything fixed.
Python stdlib only. The API key is never printed, logged or written.
"""
import argparse
import json
import math
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import jev_router as jr  # noqa: E402

STR_MAX = 300
LIST_MAX = 50
HARD_MAX = 2000      # classification scans at most this many list items
RAW_STR_MAX = 2000   # cap on text used by rules (pathological length only)
PATH_MAX = 1000
JEV_MIN_CONF = 0.6
CAPABILITIES = ("priority", "bug", "branch", "risk", "verify", "cost")
DEFAULT_MANDATORY = ("npm test", "npm run build", "npm run test:browser")
BUG_CATEGORIES = ("gameplay", "rendering", "animation", "soldier_ai", "assets",
                  "audio", "tests_ci", "infrastructure", "integration")
SEVERITIES = ("low", "medium", "high", "critical")
BRANCH_CLASSES = ("review_candidate", "needs_tests", "potential_conflict",
                  "in_progress", "eligible_for_integration_review")
FORBIDDEN_ACTIONS = ["merge", "cherry-pick", "push", "approve_pr"]
TIERS = ("p0", "p1", "p2", "p3")
RISKS = ("low", "medium", "high")
TEST_SETS = {
    "visual": ["focused tests", "visual comparison"],
    "simulation": ["gameplay tests", "determinism tests"],
    "save": ["persistence tests", "load tests"],
    "assets": ["asset loading tests", "fallback tests"],
    "integration": ["combined tests", "regression tests"],
}


# ------------------------------------------------------------ sanitization
_CTRL = re.compile(r"[\x00-\x1f\x7f]")
_REDACT = [
    re.compile(r"(?i)\bBearer\s+\S+"),
    re.compile(r"(?i)\b(api[_-]?key|token|secret|password|authorization)\b\s*[=:]\s*\S+"),
    re.compile(r"\bsk-[A-Za-z0-9_\-]{6,}"),
]
_LONG = re.compile(r"[A-Za-z0-9+_=\-]{32,}")


def _long_token(m):
    s = m.group(0)
    if re.search(r"\d", s) and re.search(r"[A-Za-z]", s):
        return "[REDACTED]"
    return s


def clean_str(v, secrets=(), limit=STR_MAX, long=True):
    """Redacted copy for `observed` and the Jev payload. Never feed it to rules."""
    s = _CTRL.sub(" ", str(v))
    for sec in secrets:
        if sec:
            s = s.replace(sec, "[REDACTED]")
    for rx in _REDACT:
        s = rx.sub("[REDACTED]", s)
    # path-like entries (long=False) skip this: it would erase long file names. A path entry
    # containing whitespace is free text, not a path, so it is still scanned.
    if long or re.search(r"\s", s.strip()):
        s = _LONG.sub(_long_token, s)
    return s.strip()[:limit]


def raw_str(v, limit=RAW_STR_MAX):
    """Raw-but-cleaned text for rule classification (control chars + length cap only)."""
    return _CTRL.sub(" ", str(v)).strip()[:limit]


def _items(v):
    if v is None or v == "":
        return []
    if isinstance(v, (str, int, float)) and not isinstance(v, bool):
        v = [v]
    if not isinstance(v, (list, tuple)):
        return []
    return [x for x in v if isinstance(x, (str, int, float)) and not isinstance(x, bool)]


def raw_list(v, limit=PATH_MAX):
    """(items, over_cap) for rule classification: full list up to HARD_MAX, no redaction."""
    items = _items(v)
    out = [raw_str(x, limit) for x in items[:HARD_MAX]]
    return [x for x in out if x], len(items) > HARD_MAX


def clean_list(v, secrets=(), path=False):
    out = [clean_str(x, secrets, STR_MAX, long=not path) for x in _items(v)[:LIST_MAX]]
    return [x for x in out if x]


def over_cap_review(out):
    out["needs_review"] = "human"
    out["reason"] += "; input list exceeds the scan cap (%d): human review, floor never lowered" % HARD_MAX
    out["input_over_cap"] = True
    return out


def clean_enum(v, allowed, default=None):
    s = str(v).strip().lower() if isinstance(v, str) else ""
    return s if s in allowed else default


# -------------------------------------------------------------- the engine
class Reject(Exception):
    """Jev output was valid but unsafe; keep the rule result."""


def _result(cap, observed, rec, reason, source="rule", needs_review="none", **extra):
    out = {"capability": cap, "observed": observed, "recommendation": rec,
           "confidence": None, "reason": reason, "source": source,
           "needs_review": needs_review, "advisory": True}
    out.update(extra)
    return out


def insufficient(cap, observed, why, **extra):
    return _result(cap, observed, "insufficient_evidence", why, "rule", "human", **extra)


def _parse(raw, questions):
    resp = json.loads(raw)
    answers = resp["answers"]
    parsed, confs = {}, []
    for qid, q in questions.items():
        a = answers[qid]
        choice = str(a["choice"]).lower()
        if choice not in q["criteria"]:
            raise ValueError("bad choice")
        conf = a["confidence"]
        if isinstance(conf, bool) or not isinstance(conf, (int, float)):
            raise ValueError("bad confidence")
        conf = float(conf)
        if not math.isfinite(conf) or not 0.0 <= conf <= 1.0:
            raise ValueError("bad confidence")
        parsed[qid] = choice
        confs.append(conf)
    usage = resp.get("usage") or {}
    return parsed, min(confs), int(usage.get("input_tokens", 0)), \
        int(usage.get("output_tokens", 0)), resp.get("model")


def consult(out, spec, *, enable_jev, offline, dry_run, min_confidence,
            transport, env, run_id, limit_flag):
    """Gate + one paid call for an ambiguous case. `out` is the rule result.

    spec = {"state": {...}, "questions": {id: {instructions, criteria}},
            "apply": fn(answers, out) -> None (mutates out) or raises Reject}
    Gate semantics and reasons are identical to jev_router.route().
    """
    e = jr._env(env)
    out["jev_consulted_for"] = sorted(spec["questions"])

    def fallback(reason, **extra):
        out.update(source="rule_fallback", fallback_reason=reason, **extra)
        if out["needs_review"] == "none":
            out["needs_review"] = "human"
        return out

    lpath = jr.ledger_path(e)
    limit = jr.effective_limit(e, limit_flag)
    if not (enable_jev or e.get("COD_JEV_PILOT") == "1"):
        return fallback("disabled")
    if offline:
        return fallback("offline")
    kstatus, key = jr.load_key(e)
    if key is None:
        return fallback("insecure_key_file" if kstatus == "insecure_key_file" else "no_key")
    try:
        used = len(jr.read_ledger(lpath)["calls"])
    except jr.LedgerUnreadable:
        return fallback("ledger_unreadable")
    if used >= limit:
        return fallback("budget_exhausted", budget={"used": used, "limit": limit})

    url = (e.get("TYPESAFE_BASE_URL") or jr.DEFAULT_BASE).rstrip("/") + "/v1/systemone"
    body = {"state": spec["state"], "model": "jev-latest", "questions": {
        qid: {"type": "choice", "instructions": q["instructions"], "criteria": q["criteria"]}
        for qid, q in spec["questions"].items()}}
    if dry_run:
        out["dry_run"] = {
            "would_call": True, "url": url,
            "headers": {"Authorization": "Bearer ***", "Content-Type": "application/json"},
            "body": body, "budget": {"used": used, "limit": limit}}
        return out

    request_id = "%s-%d" % (run_id or "norun", used + 1)
    try:
        idx = jr.reserve(lpath, limit, run_id, request_id)
    except jr.LedgerUnreadable:
        return fallback("ledger_unreadable")
    if idx is None:
        return fallback("budget_exhausted", budget={"used": used, "limit": limit})
    headers = {"Authorization": "Bearer " + key, "Content-Type": "application/json"}
    send = transport or jr.default_transport
    try:
        status, raw = send(url, headers, json.dumps(body).encode(), jr.TIMEOUT_S)
    except Exception as exc:  # never include the message (may echo URL/headers)
        jr.finish(lpath, idx, outcome="error:" + type(exc).__name__)
        return fallback("error", error=type(exc).__name__)
    if status != 200:
        jr.finish(lpath, idx, http_status=status, outcome="http_%d" % status)
        return fallback("error", error="HTTP%d" % status)
    try:
        answers, conf, tin, tout, jmodel = _parse(raw, spec["questions"])
    except Exception as exc:
        jr.finish(lpath, idx, http_status=status, outcome="parse_error:" + type(exc).__name__)
        return fallback("error", error="ParseError")
    jr.finish(lpath, idx, http_status=status, model=jmodel, input_tokens=tin,
              output_tokens=tout, est_cost_usd=jr.est_cost(tin),
              choice=";".join("%s=%s" % kv for kv in sorted(answers.items()))[:200],
              confidence=conf, outcome="ok")
    out.update(jev_answers=answers, jev_model=jmodel, confidence=conf,
               usage={"input_tokens": tin, "output_tokens": tout,
                      "est_cost_usd": jr.est_cost(tin)})
    if conf < min_confidence:
        return fallback("low_confidence")
    try:
        spec["apply"](answers, out)
    except Reject as exc:
        return fallback("unsafe_jev_output", rejected=str(exc))
    out.update(source="jev", needs_review="technical")
    out["reason"] += " | Jev (confidence %.2f) refined the ambiguous part within safety filters" % conf
    return out


def run(cap, analysis, *, enable_jev=False, offline=False, dry_run=False,
        min_confidence=JEV_MIN_CONF, transport=None, env=None, run_id=None,
        limit_flag=None):
    """analysis = (rule_result, spec_or_None)."""
    out, spec = analysis
    if spec is None:
        return out
    return consult(out, spec, enable_jev=enable_jev, offline=offline, dry_run=dry_run,
                   min_confidence=min_confidence, transport=transport, env=env,
                   run_id=run_id, limit_flag=limit_flag)


# ------------------------------------------------------------- path rules
def _has(text, words):
    return any(w in text for w in words)


CRITICAL_AREAS = {
    "simulation": ("simulation", "/sim/", "/sim.", "authoritative", "game_loop", "gameloop", "engine/"),
    "save_persistence": ("save", "persist", "localstorage", "storage", "serializ", "snapshot"),
    "determinism": ("rng", "random", "seed", "determin", "timing", "tick"),
    "architecture": ("architecture", "/adr/", "schema", "bootstrap"),
    "integration": ("integration", "merge", "rebase", "release"),
    "historical_mission": ("historical", "history", "mission", "scenario", "m01", "tczew", "campaign"),
}
CODE_EXT = (".js", ".ts", ".mjs", ".cjs", ".jsx", ".tsx", ".py", ".html", ".css", ".glsl", ".wgsl")
DOC_EXT = (".md", ".txt", ".rst")


def critical_areas(files, text):
    hits = {}
    for area, words in CRITICAL_AREAS.items():
        for f in files:
            fl = "/" + f.lower().replace("\\", "/").lstrip("/")  # root-relative paths still match "/sim/"
            if _has(fl, words):
                hits[area] = f
                break
        else:
            if area in ("simulation", "save_persistence", "determinism", "architecture") and \
               _has(text, words if area != "determinism" else ("determinism", "rng", "seed")):
                hits[area] = "(summary)"
    return hits


# --------------------------------------------------------------- priority
_SEV = {"low": 1, "medium": 2, "high": 3, "critical": 4, "blocker": 4}
_LVL = {"none": 0, "low": 1, "medium": 2, "high": 3}
_TASK_DONE = ("delivered", "done", "merged", "accepted")


def _task_obs(t, secrets):
    t = t if isinstance(t, dict) else {}
    return {
        "id": clean_str(t.get("id", ""), secrets, 80),
        "title": clean_str(t.get("title", ""), secrets),
        "gameplay_impact": clean_enum(t.get("gameplay_impact"), _LVL),
        "severity": clean_enum(t.get("severity"), _SEV),
        "blocked_by": clean_list(t.get("blocked_by") or t.get("dependencies"), secrets),
        "regression_risk": clean_enum(t.get("regression_risk"), _LVL),
        "effort": clean_enum(t.get("effort"), _LVL),
        "delivery_state": clean_str(t.get("delivery_state", ""), secrets, 40).lower(),
        "m01_benefit": clean_enum(t.get("m01_benefit"), _LVL),
        "evidence": clean_list(t.get("evidence"), secrets),
    }


def analyze_priority(data, secrets=()):
    tasks_in = data.get("tasks") if isinstance(data, dict) else data
    if not isinstance(tasks_in, list):
        tasks_in = []
    tasks = [_task_obs(t, secrets) for t in tasks_in[:LIST_MAX]]
    observed = {"tasks": tasks}
    if not tasks:
        return insufficient("priority", observed, "no candidate tasks"), None
    rows, excluded, ambiguous = [], [], []
    for i, t in enumerate(tasks):
        tid = t["id"] or "task_%d" % i
        if not t["id"] or not t["evidence"] or not t["severity"]:
            excluded.append({"id": tid, "tier": "insufficient_evidence",
                             "reason": "needs id, severity and at least one evidence item"})
            continue
        if t["delivery_state"] in _TASK_DONE:
            rows.append({"id": tid, "tier": "deferred", "reason": "already delivered", "i": i})
            continue
        if t["blocked_by"]:
            rows.append({"id": tid, "tier": "deferred", "reason": "blocked by " + ", ".join(t["blocked_by"][:5]), "i": i})
            continue
        sev, gi, m1 = _SEV[t["severity"]], _LVL.get(t["gameplay_impact"], -1), _LVL.get(t["m01_benefit"], -1)
        if sev >= 4:
            rows.append({"id": tid, "tier": "p0", "reason": "blocker/critical severity with evidence", "i": i})
        elif sev == 1 and 0 <= gi <= 1 and 0 <= m1 <= 1:
            rows.append({"id": tid, "tier": "p3", "reason": "low severity, low gameplay and M01 benefit", "i": i})
        elif sev == 3 and (gi == 3 or m1 == 3):
            rows.append({"id": tid, "tier": "p1", "reason": "high severity with high gameplay/M01 benefit", "i": i})
        else:
            row = {"id": tid, "tier": "p2", "reason": "ambiguous: default p2", "i": i, "ambiguous": True}
            rows.append(row)
            ambiguous.append(row)

    def score(r):
        t = tasks[r["i"]]
        return -(_SEV.get(t["severity"], 0) + max(_LVL.get(t["gameplay_impact"], 0), 0)
                 + max(_LVL.get(t["m01_benefit"], 0), 0))

    def finish_out(out):
        ranked = [r for r in rows if r["tier"] in TIERS]
        ranked.sort(key=lambda r: (r["tier"], score(r), _LVL.get(tasks[r["i"]]["effort"], 2), r["id"]))
        deferred = [r for r in rows if r["tier"] == "deferred"]
        out["recommendation"] = {
            "ranking": [r["id"] for r in ranked],
            "tasks": [{"id": r["id"], "tier": r["tier"], "reason": r["reason"]}
                      for r in ranked + deferred] + excluded}
        return out

    if not rows:
        out = insufficient("priority", observed, "no task has enough evidence to rank")
        out["recommendation"] = "insufficient_evidence"
        out["excluded"] = excluded
        return out, None
    out = _result("priority", observed, None,
                  "tiers from deterministic rules; tasks without evidence are excluded from ranking",
                  needs_review="human" if excluded or ambiguous else "none")
    finish_out(out)
    if not ambiguous:
        return out, None
    questions = {}
    for r in ambiguous:
        t = tasks[r["i"]]
        questions["task_%d" % r["i"]] = {
            "instructions": "Pick the priority tier for this task given gameplay impact, severity, "
                            "M01 benefit, regression risk and effort. Task: " + json.dumps(
                                {k: t[k] for k in ("title", "severity", "gameplay_impact", "m01_benefit",
                                                   "regression_risk", "effort")}),
            "criteria": {"p1": "Do soon: material benefit to M01 or gameplay at acceptable risk.",
                         "p2": "Normal backlog priority.",
                         "p3": "Low value or low urgency; do when convenient."}}

    def apply(answers, o):
        for qid, choice in answers.items():
            r = rows[[x["i"] for x in rows].index(int(qid.split("_")[1]))]
            if r["tier"] in ("p0", "deferred"):
                raise Reject("tier of p0/deferred tasks is rule-owned")
            r["tier"], r["reason"] = choice, "Jev tier for ambiguous task"
        finish_out(o)

    return out, {"state": {"capability": "priority", "tasks": [
        {k: v for k, v in tasks[r["i"]].items() if k != "evidence"} for r in ambiguous]},
        "questions": questions, "apply": apply}


# -------------------------------------------------------------------- bug
BUG_PATH_RULES = [
    ("soldier_ai", ("soldier", "ai/", "pathfind", "behavior", "behaviour", "squad")),
    ("animation", ("animation", "anim/", "animat", "skeleton", "spritesheet")),
    ("rendering", ("render", "shader", "canvas", "webgl", "css", "sprite", "draw", "visual", "camera")),
    ("audio", ("audio", "sound", "music", "sfx")),
    ("tests_ci", (".github", "ci/", "workflow", "playwright", "vitest", "flaky", "test:browser")),
    ("assets", ("asset", "texture", "atlas", "png", "jpg", "model/", "preload")),
    ("integration", ("integration", "merge conflict", "rebase")),
    ("infrastructure", ("package.json", "build", "vite", "tooling", ".agent", "npm ", "dependency")),
    ("gameplay", ("gameplay", "mission", "objective", "damage", "score", "weapon", "player", "spawn")),
]
SEV_CRITICAL = ("crash", "data loss", "corrupt", "softlock", "soft-lock", "cannot start", "save lost")
SEV_HIGH = ("freeze", "hang", "broken", "fails", "regression", "blocks", "unplayable", "wrong")
SEV_LOW = ("typo", "cosmetic", "minor", "nit", "alignment")
BUG_OWNER = {
    "gameplay": "implementer", "rendering": "implementer", "animation": "implementer",
    "soldier_ai": "implementer-deep", "assets": "implementer", "audio": "implementer",
    "tests_ci": "implementer", "infrastructure": "implementer", "integration": "implementer-deep",
}


def analyze_bug(data, secrets=()):
    d = data if isinstance(data, dict) else {}
    obs = {"title": clean_str(d.get("title", ""), secrets),
           "summary": clean_str(d.get("summary", ""), secrets),
           "files": clean_list(d.get("files"), secrets, path=True),
           "symptoms": clean_list(d.get("symptoms"), secrets),
           "evidence": clean_list(d.get("evidence"), secrets)}
    rfiles, over = raw_list(d.get("files"))
    rsym, over_s = raw_list(d.get("symptoms"), RAW_STR_MAX)
    over = over or over_s
    obs["files_truncated"] = len(rfiles) > LIST_MAX
    if not (obs["title"] or obs["summary"]) or not (rfiles or obs["symptoms"] or obs["evidence"]):
        return insufficient("bug", obs, "needs a title/summary plus files, symptoms or evidence",
                            status="unverified", fixed=False), None
    text = " ".join([raw_str(d.get("title", "")), raw_str(d.get("summary", "")), *rsym]).lower()
    paths = " ".join(rfiles).lower()
    cats = []
    for cat, words in BUG_PATH_RULES:
        if _has(paths, words) or _has(text, words):
            cats.append(cat)
    # more specific signals win over the generic gameplay keyword
    specific = [c for c in cats if c != "gameplay"]
    pool = specific or cats
    if len(pool) == 1:
        cat, cat_amb = pool[0], False
    else:
        cat, cat_amb = (pool[0] if pool else "gameplay"), True
    crit, high, low = _has(text, SEV_CRITICAL), _has(text, SEV_HIGH), _has(text, SEV_LOW)
    sev_amb = False
    if crit:
        sev = "critical"
    elif high and low:
        sev, sev_amb = "medium", True
    elif high:
        sev = "high"
    elif low:
        sev = "low"
    else:
        sev = "medium"
    why = "category from path/keyword rules; severity from symptom keywords (default medium)"
    # a "trivial" wording in free text cannot lower severity below medium when the files touch a
    # critical area (contradictory input keeps the floor); Jev below may only raise it
    # the floor is independent of the rule severity (also holds on the ambiguous path)
    sev_floor = "medium" if critical_areas(rfiles, "") else None
    if sev_floor and SEVERITIES.index(sev) < SEVERITIES.index(sev_floor):
        sev = sev_floor
        why += "; severity floor medium (critical-area files)"

    def build(cat, sev):
        return {"category": cat, "severity": sev, "route_to": {"area": cat, "agent": BUG_OWNER[cat]}}

    out = _result("bug", obs, build(cat, sev), why,
                  needs_review="human" if (cat_amb or sev_amb) else "none",
                  status="unverified", fixed=False)
    if over:
        return over_cap_review(out), None
    if not (cat_amb or sev_amb):
        return out, None
    questions = {}
    if cat_amb:
        questions["category"] = {
            "instructions": "Classify this bug report into exactly one area.",
            "criteria": {c: "Bug area: " + c.replace("_", " ") for c in BUG_CATEGORIES}}
    if sev_amb:
        questions["severity"] = {
            "instructions": "Rate the bug severity.",
            "criteria": {s: "Bug severity: " + s for s in SEVERITIES}}

    def apply(answers, o):
        c = answers.get("category", cat)
        s = answers.get("severity", sev)
        if crit and s != "critical":
            raise Reject("severity floor critical")
        if sev_floor and SEVERITIES.index(s) < SEVERITIES.index(sev_floor):
            raise Reject("severity floor medium")
        o["recommendation"] = build(c, s)
        o["status"], o["fixed"] = "unverified", False

    return out, {"state": {"capability": "bug", "title": obs["title"], "summary": obs["summary"],
                           "files": obs["files"], "symptoms": obs["symptoms"]},
                 "questions": questions, "apply": apply}


# ----------------------------------------------------------------- branch
def analyze_branch(data, secrets=()):
    d = data if isinstance(data, dict) else {}
    obs = {"branch": clean_str(d.get("branch", ""), secrets, 120),
           "head": clean_str(d.get("head", ""), secrets, 64),
           "tests": clean_enum(d.get("tests"), ("passed", "failed", "unknown"), "unknown"),
           "review": clean_enum(d.get("review"), ("approved", "rejected", "none"), "none"),
           "files_changed": clean_list(d.get("files_changed"), secrets, path=True),
           "dependencies": clean_list(d.get("dependencies"), secrets),
           "known_conflicts": clean_list(d.get("known_conflicts"), secrets),
           "base_compat": clean_enum(d.get("base_compat"), ("compatible", "incompatible", "unknown"), "unknown"),
           "in_progress": d.get("in_progress") is True}
    rfiles, over = raw_list(d.get("files_changed"))
    obs["files_truncated"] = len(rfiles) > LIST_MAX
    extra = {"actions_forbidden": list(FORBIDDEN_ACTIONS)}
    if not obs["branch"] or not obs["head"]:
        return insufficient("branch", obs, "needs branch name and head", **extra), None

    def eligible_ok(o):
        return (o["tests"] == "passed" and o["review"] == "approved" and not o["known_conflicts"]
                and o["base_compat"] == "compatible" and not o["in_progress"])

    def rule():
        if obs["known_conflicts"] or obs["base_compat"] == "incompatible":
            return "potential_conflict", "known conflicts or incompatible base"
        if obs["in_progress"]:
            return "in_progress", "marked in progress"
        if obs["review"] == "rejected":
            return "in_progress", "review rejected; rework needed"
        if obs["tests"] != "passed":
            return "needs_tests", "tests %s" % obs["tests"]
        if eligible_ok(obs):
            return "eligible_for_integration_review", "tests passed, review approved, no conflicts, base compatible"
        return "review_candidate", "tests passed; review/base compatibility not yet established"

    cls, why = rule()
    contradictory = (
        (obs["review"] == "approved" and obs["tests"] != "passed")
        or (obs["review"] == "rejected" and obs["tests"] == "passed")
        or (obs["known_conflicts"] and obs["base_compat"] == "compatible")
        or (obs["in_progress"] and obs["review"] == "approved"))
    out = _result("branch", obs, cls, why, needs_review="technical" if contradictory else "none", **extra)
    if contradictory:
        out["reason"] += "; metadata is contradictory"
        out["needs_review"] = "human"
    if over:
        return over_cap_review(out), None
    if not contradictory:
        return out, None

    def apply(answers, o):
        c = answers["branch_class"]
        if obs["tests"] != "passed" and c in ("review_candidate", "eligible_for_integration_review"):
            raise Reject("tests not passed: branch cannot be a review candidate")
        if c == "eligible_for_integration_review" and not eligible_ok(obs):
            raise Reject("eligibility needs tests passed, review approved, no conflicts, compatible base")
        if cls == "potential_conflict" and c != "potential_conflict":
            raise Reject("known conflicts cannot be cleared by Jev")
        o["recommendation"] = c

    return out, {
        "state": {"capability": "branch", **{k: obs[k] for k in obs if k != "head"}},
        "questions": {"branch_class": {
            "instructions": "Classify this branch for integration triage. Metadata may be contradictory; "
                            "be conservative. You can never authorize merge, push or PR approval.",
            "criteria": {c: "Branch class: " + c.replace("_", " ") for c in BRANCH_CLASSES}}},
        "apply": apply}


# ------------------------------------------------------------------- risk
def _is_code(f):
    return f.lower().endswith(CODE_EXT)


TEST_DIRS = ("test", "tests", "__tests__", "spec")


def _is_test_path(f):
    """Test only by directory segment or basename pattern, never by substring."""
    parts = f.lower().replace("\\", "/").split("/")
    base = parts[-1]
    return (any(p in TEST_DIRS for p in parts[:-1]) or ".test." in base or ".spec." in base
            or "_test." in base or base.startswith("test_"))


def _is_doc_or_test(f):
    fl = f.lower().replace("\\", "/")
    return fl.endswith(DOC_EXT) or _is_test_path(fl) or fl.startswith("docs/") or "/docs/" in fl


def analyze_risk(data, secrets=()):
    d = data if isinstance(data, dict) else {}
    src = d.get("files_changed") or d.get("files")
    obs = {"files_changed": clean_list(src, secrets, path=True),
           "change_type": clean_str(d.get("change_type", ""), secrets, 40).lower(),
           "summary": clean_str(d.get("summary", ""), secrets)}
    rfiles, over = raw_list(src)
    obs["files_truncated"] = len(rfiles) > LIST_MAX
    extra = {"mandatory_checks_preserved": True, "mandatory_checks": list(DEFAULT_MANDATORY)}
    if not rfiles:
        return insufficient("risk", obs, "needs the list of changed files", **extra), None
    text = (raw_str(d.get("summary", "")) + " " + raw_str(d.get("change_type", ""), 40)).lower()
    areas = critical_areas(rfiles, text)
    non_doc = [f for f in rfiles if not _is_doc_or_test(f)]
    # floor policy (documented): critical area in code -> high; in docs/tests-only or
    # historical/mission data files -> medium; Jev may raise but never lower below it.
    if areas:
        hard = [x for x in areas if x != "historical_mission"]
        if non_doc and (hard or any(_is_code(f) for f in non_doc)):
            floor, why = "high", "critical area(s) %s touched by non-test/non-doc files" % sorted(areas)
        else:
            floor, why = "medium", "critical area(s) %s touched only by docs/tests or data" % sorted(areas)
        ambiguous = floor == "medium"
    elif not non_doc or obs["change_type"] in ("docs", "test", "tests"):
        floor, why, ambiguous = "low", "docs/tests only, no critical area", False
    elif len(non_doc) <= 5 and obs["change_type"] != "refactor":
        floor, why, ambiguous = "medium", "small non-critical code change", False
    else:
        floor, why, ambiguous = "medium", "large or refactoring change outside critical areas", True
    out = _result("risk", obs, floor, why, needs_review="technical" if floor == "high" else "none", **extra)
    out["critical_areas"] = sorted(areas)
    out["rule_floor"] = floor
    if over:
        if floor != "high":
            out["recommendation"] = floor = "high"  # unscanned tail may hold critical files
        return over_cap_review(out), None
    if not ambiguous:
        return out, None

    def apply(answers, o):
        j = answers["risk"]
        o["recommendation"] = j if RISKS.index(j) > RISKS.index(floor) else floor
        o["mandatory_checks_preserved"] = True

    return out, {
        "state": {"capability": "risk", "files_changed": obs["files_changed"],
                  "change_type": obs["change_type"], "summary": obs["summary"],
                  "critical_areas": sorted(areas), "rule_floor": floor},
        "questions": {"risk": {
            "instructions": "Rate the regression risk of this change. The rule floor is given; "
                            "do not go below it.",
            "criteria": {"low": "Low regression risk", "medium": "Medium regression risk",
                         "high": "High regression risk"}}},
        "apply": apply}


# ----------------------------------------------------------------- verify
def verify_sets(files, ctype, text):
    paths = " ".join(files).lower()
    s = set()
    if _has(paths, ("render", "shader", "canvas", "css", "sprite", "ui/", "visual", "camera", "draw", "webgl")) \
            or ctype in ("visual", "rendering"):
        s.add("visual")
    if _has(paths, ("sim", "gameplay", "ai/", "soldier", "mission", "rng", "random", "seed", "engine/")) \
            or ctype in ("simulation", "gameplay"):
        s.add("simulation")
    if _has(paths, ("save", "persist", "storage", "serializ")) or ctype in ("save", "persistence"):
        s.add("save")
    if _has(paths, ("asset", "texture", "atlas", "audio", "sound", "model/", ".png", ".jpg", ".ogg", ".mp3")) \
            or ctype == "assets":
        s.add("assets")
    if _has(paths, ("integration", "merge")) or ctype in ("integration", "merge"):
        s.add("integration")
    return s


def mandatory_for(files, ctype, sets, mandatory):
    code = any(_is_code(f) for f in files) or ctype in ("feature", "bugfix", "refactor", "visual", "code")
    runtime = bool(sets & {"visual", "assets", "simulation", "integration"})
    out = []
    for m in mandatory:
        if m == "npm run build" and not code:
            continue
        if m == "npm run test:browser" and not runtime:
            continue
        out.append(m)
    return out


def analyze_verify(data, secrets=(), mandatory=DEFAULT_MANDATORY):
    d = data if isinstance(data, dict) else {}
    src = d.get("files_changed") or d.get("files")
    obs = {"files_changed": clean_list(src, secrets, path=True),
           "change_type": clean_str(d.get("change_type", ""), secrets, 40).lower()}
    rfiles, over = raw_list(src)
    obs["files_truncated"] = len(rfiles) > LIST_MAX
    if not rfiles and not obs["change_type"]:
        return insufficient("verify", obs, "needs files_changed or change_type",
                            mandatory_checks=list(mandatory)), None
    sets = verify_sets(rfiles, obs["change_type"], "")

    def rec(sets):
        tests = []
        for k in sorted(sets):
            tests += TEST_SETS[k]
        tests = sorted(set(tests))
        return {"test_sets": sorted(sets), "recommended_tests": tests,
                "mandatory_checks": mandatory_for(rfiles, obs["change_type"], sets, mandatory)}

    why = "test sets from path/change-type rules, always unioned with project mandatory checks"
    out = _result("verify", obs, rec(sets), why, mandatory_checks_preserved=True)
    if over:
        return over_cap_review(out), None
    if sets:
        return out, None
    out["needs_review"] = "human"
    out["reason"] += "; no specific area recognised, only mandatory checks and focused tests"
    out["recommendation"]["recommended_tests"] = ["focused tests"]

    def apply(answers, o):
        extra = answers["extra_set"]
        if extra != "none":
            o["recommendation"] = rec({extra})
        o["recommendation"]["mandatory_checks"] = mandatory_for(
            rfiles, obs["change_type"], {extra} - {"none"}, mandatory)
        o["mandatory_checks_preserved"] = True

    return out, {
        "state": {"capability": "verify", **obs},
        "questions": {"extra_set": {
            "instructions": "Pick the single extra verification set most worth adding for this change, "
                            "or none. Mandatory project checks always stay.",
            "criteria": {"none": "No extra verification set",
                         **{k: "Add the %s verification set" % k for k in TEST_SETS}}}},
        "apply": apply}


# ------------------------------------------------------------------- cost
def analyze_cost(data, secrets=()):
    d = data if isinstance(data, dict) else {}
    req = {"role": d.get("role"), "risk": d.get("risk"), "complexity": d.get("complexity"),
           "fix_attempts": d.get("fix_attempts") or 0,
           "critical_flags": ["unspecified"] if d.get("critical") is True else d.get("critical_flags"),
           "description": clean_str(d.get("description", ""), secrets, jr.DESC_MAX)}
    try:
        req["fix_attempts"] = max(0, int(req["fix_attempts"]))
        norm = jr.normalize(req)
    except (ValueError, TypeError, OverflowError) as exc:
        return insufficient("cost", {"role": clean_str(d.get("role", ""), secrets, 40)},
                            "invalid or missing role/risk/complexity: " + clean_str(exc, secrets, 80)), None
    return norm, None


def tier_of(model, agent):
    if model == "opus":
        return "opus"
    if model == "haiku":
        return "haiku"
    return "sonnet_high_effort" if agent == "implementer-deep" else "sonnet"


def run_cost(data, *, enable_jev, offline, dry_run, min_confidence, transport, env, run_id,
             limit_flag, secrets=()):
    norm, _ = analyze_cost(data, secrets)
    if norm.get("capability"):
        return norm
    model, agent, amb, why = jr.rule_decide(norm)
    r = jr.route(norm, enable_jev=enable_jev, offline=offline, dry_run=dry_run,
                 min_confidence=min_confidence, transport=transport, env=env,
                 run_id=run_id, limit_flag=limit_flag)
    tier = tier_of(r["recommendation_model"], r["recommended_agent"])
    rec = {"model_tier": tier, "agent": r["recommended_agent"], "consult_jev": "yes" if amb else "no",
           "consult_jev_reason": (why if why.startswith("ambiguous") else "ambiguous: " + why) if amb else "local rule resolves (%s); do not consult Jev" % why,
           "keep_verifier_and_reviewer": True}
    out = _result("cost", norm, rec, r["rationale"], r["source"],
                  {"rule": "none", "jev": "technical"}.get(r["source"], "human"))
    if norm["critical_flags"] and norm["role"] == "implement":
        out["reason"] += "; critical change: requires critical review (opus) and independent verification"
    for k in ("confidence", "usage", "dry_run"):
        if r.get(k) is not None:
            out[k] = r[k]
    if r["source"] == "rule_fallback":
        out["fallback_reason"] = r.get("reason")
        if r.get("error"):
            out["error"] = r["error"]
        if r.get("budget"):
            out["budget"] = r["budget"]
    if r.get("flags"):
        out["flags"] = r["flags"]
    return out


# ----------------------------------------------------------------- public
ANALYZERS = {"priority": analyze_priority, "bug": analyze_bug, "branch": analyze_branch,
             "risk": analyze_risk, "verify": analyze_verify}


def decide(cap, data, *, enable_jev=False, offline=False, dry_run=False,
           min_confidence=JEV_MIN_CONF, transport=None, env=None, run_id=None,
           limit_flag=None, mandatory_checks=None):
    if cap not in CAPABILITIES:
        raise ValueError("unknown capability: %s" % cap)
    e = jr._env(env)
    _, key = jr.load_key(e)  # only to redact it from anything we echo or send
    secrets = (key,) if key else ()
    kw = dict(enable_jev=enable_jev, offline=offline, dry_run=dry_run,
              min_confidence=min_confidence, transport=transport, env=env,
              run_id=run_id, limit_flag=limit_flag)
    if cap == "cost":
        return run_cost(data, secrets=secrets, **kw)
    if cap == "verify":
        analysis = analyze_verify(data, secrets, tuple(mandatory_checks or DEFAULT_MANDATORY))
    else:
        analysis = ANALYZERS[cap](data, secrets)
    return run(cap, analysis, **kw)


# -------------------------------------------------------------------- CLI
def print_banner(out, env=None, file=None):
    """Only for a real Jev response (usage present). Mirrors the router banner."""
    u = out.get("usage")
    if not u or "dry_run" in out:
        return
    file = file or sys.stderr
    s = jr.usage_summary(env)
    calls = "%s/%s" % (s.get("calls_used", "?"), s.get("limit", "?"))
    print("JEV START", file=file)
    print("capability: %s; reason: ambiguous case, local rules insufficient" % out["capability"], file=file)
    print("JEV RESULT", file=file)
    print("recommendation: %s (source=%s)" % (
        json.dumps(out["recommendation"], sort_keys=True)[:300], out["source"]), file=file)
    print("confidence: %.2f" % (out.get("confidence") or 0.0), file=file)
    print("consumption: input_tokens=%s output_tokens=%s est_cost_usd=%.6f calls=%s" % (
        u.get("input_tokens"), u.get("output_tokens"), u.get("est_cost_usd") or 0.0, calls), file=file)
    print("JEV END", file=file)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)
    for c in CAPABILITIES:
        p = sub.add_parser(c)
        p.add_argument("--input", required=True, help="JSON file")
        p.add_argument("--run-id")
        p.add_argument("--enable-jev", action="store_true")
        p.add_argument("--offline", action="store_true")
        p.add_argument("--dry-run", action="store_true")
        p.add_argument("--min-confidence", type=float, default=JEV_MIN_CONF)
        p.add_argument("--limit", type=int, help="can only lower the cap of %d" % jr.PILOT_MAX_PAID_CALLS)
        p.add_argument("--mandatory", help="comma list replacing default mandatory checks (verify)")
    sub.add_parser("usage")
    for p in sub.choices.values():
        p.add_argument("--json", action="store_true")
    a = ap.parse_args(argv)
    if a.cmd == "usage":
        return jr.main(["usage"] + (["--json"] if a.json else []))
    try:
        data = json.loads(Path(a.input).read_text())
    except (OSError, ValueError) as exc:
        ap.error("cannot read --input: %s" % type(exc).__name__)
    mand = [m.strip() for m in a.mandatory.split(",") if m.strip()] if a.mandatory else None
    try:
        out = decide(a.cmd, data, enable_jev=a.enable_jev, offline=a.offline, dry_run=a.dry_run,
                     min_confidence=a.min_confidence, run_id=a.run_id, limit_flag=a.limit,
                     mandatory_checks=mand)
    except ValueError as exc:
        ap.error(str(exc))
    print_banner(out)
    if a.json:
        print(json.dumps(out, indent=2))
    else:
        print("%s: %s (%s, needs_review=%s)" % (
            out["capability"], json.dumps(out["recommendation"], sort_keys=True), out["source"],
            out["needs_review"]))
        print("reason: " + out["reason"])
        if out.get("fallback_reason"):
            print("fallback: " + out["fallback_reason"])
        if "dry_run" in out:
            print(json.dumps(out["dry_run"], indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
