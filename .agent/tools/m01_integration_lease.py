#!/usr/bin/env python3
"""Exclusive M01 integrator lease stored in a GitHub-only coordination branch.

Uses stdlib + authenticated gh CLI; never modifies main or the game candidate.
GitHub git-ref creation and non-forced fast-forward transitions serialize sessions.
There is deliberately NO automatic timeout-based lock stealing.
"""
import argparse
import datetime as dt
import json
import os
import re
import secrets
import subprocess
import sys

REPO = os.environ.get("COD_GUERRA_REPO", "Brawl2007/COD-guerra")
LOCK = "coordination/m01-integrator-lock"
MARKER = "M01-INTEGRATOR-STATE-V1\n"
READY = re.compile(r"(?m)^M01-INTEGRATION:\s*READY\s*$")


class LeaseError(Exception):
    pass


def api(method, path, payload=None, missing_ok=False):
    cmd = ["gh", "api", "--method", method, "repos/" + REPO + "/" + path]
    if payload is not None:
        cmd += ["--input", "-"]
    try:
        result = subprocess.run(
            cmd, input=json.dumps(payload) if payload is not None else None,
            capture_output=True, text=True, timeout=45, check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise LeaseError("GitHub unavailable; fail closed: " + str(exc)) from exc
    if result.returncode:
        if missing_ok and ("HTTP 404" in result.stderr or '"status":404' in result.stderr
                           or "Not Found (HTTP 404)" in result.stderr):
            return None
        raise LeaseError("GitHub request failed; no lease changes assumed: " +
                         result.stderr[:450])
    try:
        return json.loads(result.stdout)
    except ValueError as exc:
        raise LeaseError("Invalid GitHub API response") from exc


def head(branch, missing_ok=False):
    ref = api("GET", "git/ref/heads/" + branch, missing_ok=missing_ok)
    return ref["object"]["sha"] if ref else None


def commit(sha):
    return api("GET", "git/commits/" + sha)


def read_lock():
    sha = head(LOCK, missing_ok=True)
    if sha is None:
        return None, None
    data = commit(sha)
    message = data["message"]
    if not message.startswith(MARKER):
        raise LeaseError("Coordination ref exists without a recognized state; stop")
    try:
        state = json.loads(message[len(MARKER):])
    except ValueError as exc:
        raise LeaseError("Coordination ref state is corrupt; stop") from exc
    if state.get("schema") != 1 or state.get("status") not in ("FREE", "HELD"):
        raise LeaseError("Invalid coordination state; stop")
    return sha, state


def timestamp():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def make_commit(parent, state):
    base = commit(parent)
    payload = {
        "message": MARKER + json.dumps(state, sort_keys=True, ensure_ascii=False),
        "tree": base["tree"]["sha"],
        "parents": [parent],
    }
    return api("POST", "git/commits", payload)["sha"]


def transition(old_sha, state):
    new_sha = make_commit(old_sha, state)
    # force=False is essential: competing state transitions from the same
    # parent are NOT both fast-forwards. Only one can win.
    api("PATCH", "git/refs/heads/" + LOCK,
        {"sha": new_sha, "force": False})
    return new_sha


def assert_owner(state, token):
    if state["status"] != "HELD" or not token or state.get("token") != token:
        raise LeaseError("Not the active lease owner; no write permitted")


def acquire(candidate, owner):
    if not candidate or candidate in ("main", "master") or candidate.startswith("coordination/"):
        raise LeaseError("A development candidate branch (never main) is required")
    candidate_sha = head(candidate)  # fail closed on network error / missing branch
    old_sha, old = read_lock()
    if old is not None and old["status"] == "HELD":
        raise LeaseError("Integration is occupied by " + str(old.get("owner")) +
                         " (since " + str(old.get("updated_at")) + "). Do not steal.")
    token = secrets.token_hex(16)
    state = {"schema": 1, "status": "HELD", "owner": owner,
             "token": token, "candidate": candidate,
             "candidate_sha": candidate_sha, "updated_at": timestamp(),
             "handoff": old.get("handoff") if old else None}
    if old_sha is None:
        marker_sha = make_commit(candidate_sha, state)
        api("POST", "git/refs",
            {"ref": "refs/heads/" + LOCK, "sha": marker_sha})
    else:
        transition(old_sha, state)
    return {"acquired": True, "token": token, "candidate": candidate,
            "candidate_sha": candidate_sha, "owner": owner,
            "previous_handoff": state["handoff"]}


def guard(token):
    _, state = read_lock()
    if state is None:
        raise LeaseError("No integration lock: do not modify candidate")
    assert_owner(state, token)
    actual = head(state["candidate"])
    if actual != state["candidate_sha"]:
        raise LeaseError("Candidate HEAD changed: pinned=" +
                         state["candidate_sha"] + " actual=" + actual +
                         "; stop and inspect commits")
    return {"owner": state["owner"], "candidate": state["candidate"],
            "sha": actual, "authorized": True}


def heartbeat(token):
    old_sha, state = read_lock()
    assert_owner(state, token)
    # Guard checks the candidate has not been changed unexpectedly.
    guard(token)
    state["updated_at"] = timestamp()
    transition(old_sha, state)
    return {"heartbeat": state["updated_at"], "owner": state["owner"]}


def advance(token, new_sha):
    old_sha, state = read_lock()
    assert_owner(state, token)
    if not re.fullmatch(r"[0-9a-f]{40}", new_sha):
        raise LeaseError("Expected a 40-character commit SHA")
    if head(state["candidate"]) != new_sha:
        raise LeaseError("The candidate remote HEAD is not the supplied SHA")
    old_pin = state["candidate_sha"]
    if old_pin != new_sha:
        comparison = api("GET", "compare/" + old_pin + "..." + new_sha)
        if comparison.get("status") not in ("ahead", "identical") or comparison.get("behind_by", 1):
            raise LeaseError("Candidate moved non-fast-forward; stop")
    state["candidate_sha"] = new_sha
    state["updated_at"] = timestamp()
    transition(old_sha, state)
    return {"advanced": True, "previous": old_pin, "current": new_sha}


def release(token, handoff):
    old_sha, state = read_lock()
    assert_owner(state, token)
    state.update({"status": "FREE", "owner": None, "token": None,
                  "updated_at": timestamp(), "handoff": handoff or None})
    transition(old_sha, state)
    return {"released": True, "handoff": state["handoff"]}


def candidates():
    """PR metadata is an intake queue, NOT proof of completion or passing CI."""
    prs = api("GET", "pulls?state=open&per_page=100")
    items = []
    for pr in prs:
        labels = {v.get("name", "") for v in pr.get("labels", [])}
        is_ready = "m01-ready-to-integrate" in labels or bool(READY.search(pr.get("body") or ""))
        if not is_ready or pr.get("draft"):
            continue
        items.append({"pr": pr["number"], "head": pr["head"]["ref"],
                      "sha": pr["head"]["sha"], "base": pr["base"]["ref"],
                      "title": pr["title"], "status": "AWAITING_INTEGRATOR_REVIEW"})
    return sorted(items, key=lambda x: x["pr"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="action", required=True)
    sub.add_parser("status")
    sub.add_parser("queue")
    ac = sub.add_parser("acquire")
    ac.add_argument("--candidate", required=True, help="e.g. claude/quirky-heisenberg-9l4m7b")
    ac.add_argument("--owner", required=True, help="unique Claude session/run ID")
    for action in ("guard", "heartbeat", "release", "advance"):
        subp = sub.add_parser(action)
        subp.add_argument("--token", required=True, help="token returned by acquire")
        if action == "release":
            subp.add_argument("--handoff", default="", help="short state / CI handoff")
        if action == "advance":
            subp.add_argument("--sha", required=True)
    a = parser.parse_args()
    try:
        if a.action == "status":
            sha, state = read_lock()
            if state and state.get("token"):
                state = {k: v for k, v in state.items() if k != "token"}
            result = {"lock_commit": sha, "state": state or {"status": "FREE", "uninitialized": True}}
        elif a.action == "queue":
            result = {"ready_prs": candidates(), "note": "Each PR still needs code, CI and provenance checks"}
        elif a.action == "acquire":
            result = acquire(a.candidate, a.owner)
        elif a.action == "guard":
            result = guard(a.token)
        elif a.action == "heartbeat":
            result = heartbeat(a.token)
        elif a.action == "advance":
            result = advance(a.token, a.sha)
        else:
            result = release(a.token, a.handoff)
        print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
        return 0
    except LeaseError as exc:
        print("BLOCKED: " + str(exc), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
