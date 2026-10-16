#!/usr/bin/env python3
"""Serialize M01 integrations with a single GitHub Contents API state file.

Requires Python stdlib and authenticated 'gh'. Cloud agents without gh auth
can use GitHub MCP fetch_file/update_file on the SAME state file/blob SHA.
No automatic expiry / silent stealing: one-hour routine overlap is harmless.
"""
import argparse
import base64
import datetime as dt
import json
import os
import re
import secrets
import subprocess
import sys
from urllib.parse import quote

REPO = os.environ.get("COD_GUERRA_REPO", "Brawl2007/COD-guerra")
COORD_BRANCH = "coordination/m01-integration-state"
STATE_PATH = ".agent/coordination/m01-integrator.json"
READY = re.compile(r"(?m)^M01-INTEGRATION:\s*READY\s*$")


class LeaseError(Exception):
    pass


def api(method, path, payload=None):
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
        raise LeaseError("GitHub request failed (do not assume lock changed): " +
                         result.stderr[:400])
    try:
        return json.loads(result.stdout)
    except ValueError as exc:
        raise LeaseError("Invalid GitHub API response") from exc


def timestamp():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="microseconds")


def branch_head(branch):
    return api("GET", "git/ref/heads/" + quote(branch, safe="/"))["object"]["sha"]


def read_state():
    record = api("GET", "contents/" + STATE_PATH + "?ref=" + quote(COORD_BRANCH, safe=""))
    try:
        raw = base64.b64decode(record["content"].replace("\n", ""))
        state = json.loads(raw.decode("utf-8"))
    except (ValueError, KeyError, UnicodeError) as exc:
        raise LeaseError("Invalid coordination state (fail closed)") from exc
    if state.get("schema") != 1 or state.get("status") not in ("FREE", "HELD"):
        raise LeaseError("Unexpected coordination state (fail closed)")
    return record["sha"], state


def write_state(expected_blob_sha, state, operation):
    state["generation"] = int(state["generation"]) + 1
    state["updated_at"] = timestamp()
    content = (json.dumps(state, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()
    # GitHub checks the original content SHA and rejects conflicting writes.
    # Never force-update a ref or push to the game branch in this function.
    api("PUT", "contents/" + STATE_PATH, {
        "message": "chore(coordination): M01 " + operation,
        "content": base64.b64encode(content).decode("ascii"),
        "sha": expected_blob_sha,
        "branch": COORD_BRANCH,
    })
    return {"generation": state["generation"], "updated_at": state["updated_at"]}


def assert_owner(state, token):
    if state["status"] != "HELD" or not token or state.get("token") != token:
        raise LeaseError("Another session owns the integrator lock")


def acquire(candidate, owner):
    if not candidate or candidate in ("main", "master") or candidate.startswith("coordination/"):
        raise LeaseError("Only an isolated development candidate can be integrated")
    remote_sha = branch_head(candidate)
    blob, state = read_state()
    if state["status"] != "FREE":
        raise LeaseError("Integrator occupied by " + str(state.get("owner")) +
                         "; DO NOT start another integration")
    token = secrets.token_hex(16)
    previous_handoff = state.get("handoff")
    state.update({"status": "HELD", "owner": owner, "token": token,
                  "candidate": candidate, "candidate_sha": remote_sha,
                  "handoff": previous_handoff})
    version = write_state(blob, state, "acquire " + candidate)
    return {"acquired": True, "token": token, "candidate": candidate,
            "sha": remote_sha, "previous_handoff": previous_handoff, **version}


def guard(token):
    _, state = read_state()
    assert_owner(state, token)
    sha = branch_head(state["candidate"])
    if sha != state["candidate_sha"]:
        raise LeaseError("Candidate HEAD changed unexpectedly; stop, inspect and reconcile")
    return {"authorized": True, "candidate": state["candidate"],
            "sha": sha, "owner": state["owner"]}


def heartbeat(token):
    guard(token)
    blob, state = read_state()
    assert_owner(state, token)
    version = write_state(blob, state, "heartbeat")
    return {"heartbeat": True, **version}


def advance(token, new_sha):
    blob, state = read_state()
    assert_owner(state, token)
    if not re.fullmatch(r"[a-fA-F0-9]{40}", new_sha):
        raise LeaseError("Supply the exact new 40-character candidate commit SHA")
    if branch_head(state["candidate"]) != new_sha:
        raise LeaseError("Remote candidate HEAD differs from --sha")
    previous_sha = state["candidate_sha"]
    if previous_sha != new_sha:
        comparison = api("GET", "compare/" + previous_sha + "..." + new_sha)
        if comparison.get("status") not in ("ahead", "identical") or comparison.get("behind_by") != 0:
            raise LeaseError("Not a proven fast-forward from the pinned candidate; stop")
    state["candidate_sha"] = new_sha
    version = write_state(blob, state, "advance candidate pin")
    return {"previous_sha": previous_sha, "current_sha": new_sha, **version}


def release(token, handoff):
    blob, state = read_state()
    assert_owner(state, token)
    state.update({"status": "FREE", "owner": None, "token": None,
                  "handoff": handoff or None})
    version = write_state(blob, state, "release")
    return {"released": True, "handoff": state["handoff"], **version}


def recover(expected_owner, expected_generation, reason):
    """Exceptional operator-verified recovery; NEVER called on a time limit."""
    blob, state = read_state()
    if state["status"] != "HELD":
        raise LeaseError("Recovery only applies to a held lock")
    if state["owner"] != expected_owner or state["generation"] != expected_generation:
        raise LeaseError("Owner/generation changed; the active session may still be running")
    if len(reason.strip()) < 20:
        raise LeaseError("Provide a concrete verification of why the old session ended")
    state.update({"status": "FREE", "owner": None, "token": None,
                  "handoff": "RECOVERED AFTER CONFIRMED INACTIVITY: " + reason})
    version = write_state(blob, state, "operator-confirmed recovery")
    return {"recovered": True, **version}


def candidates():
    """Intake only: READY marker is not CI proof and never triggers auto-merge."""
    prs = api("GET", "pulls?state=open&per_page=100")
    items = []
    for pr in prs:
        labels = {item.get("name") for item in pr.get("labels", [])}
        ready = "m01-ready-to-integrate" in labels or bool(READY.search(pr.get("body") or ""))
        if not ready or pr.get("draft"):
            continue
        items.append({"pr": pr["number"], "title": pr["title"],
                      "head": pr["head"]["ref"], "sha": pr["head"]["sha"],
                      "base": pr["base"]["ref"], "status": "REQUIRES_REVIEW_AND_CI"})
    return sorted(items, key=lambda entry: entry["pr"])


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    actions = parser.add_subparsers(dest="action", required=True)
    actions.add_parser("status")
    actions.add_parser("queue")
    ac = actions.add_parser("acquire")
    ac.add_argument("--candidate", required=True)
    ac.add_argument("--owner", required=True, help="unique session identifier")
    for name in ("guard", "heartbeat", "advance", "release"):
        sub = actions.add_parser(name)
        sub.add_argument("--token", required=True)
        if name == "advance":
            sub.add_argument("--sha", required=True)
        if name == "release":
            sub.add_argument("--handoff", default="")
    re = actions.add_parser("recover")
    re.add_argument("--expected-owner", required=True)
    re.add_argument("--expected-generation", type=int, required=True)
    re.add_argument("--reason", required=True)
    a = parser.parse_args(argv)
    try:
        if a.action == "status":
            blob, state = read_state()
            result = {"state_blob_sha": blob, **{k: v for k, v in state.items() if k != "token"}}
        elif a.action == "queue":
            result = {"ready_prs": candidates(), "warning": "Do not integrate without reviewing CI and code"}
        elif a.action == "acquire":
            result = acquire(a.candidate, a.owner)
        elif a.action == "guard":
            result = guard(a.token)
        elif a.action == "heartbeat":
            result = heartbeat(a.token)
        elif a.action == "advance":
            result = advance(a.token, a.sha)
        elif a.action == "release":
            result = release(a.token, a.handoff)
        else:
            result = recover(a.expected_owner, a.expected_generation, a.reason)
        print(json.dumps(result, sort_keys=True, indent=2, ensure_ascii=False))
        return 0
    except LeaseError as exc:
        print("BLOCKED: " + str(exc), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
