#!/usr/bin/env python3
"""M01 task preflight: offline registry + optional live GitHub duplicate check.

No LLM, npm, dependencies or paid APIs. Claims use atomic GitHub git-ref creation.
Never assert that a branch's existence proves an accepted/integrated feature.
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

REGISTRY = Path(__file__).resolve().parents[1] / "m01-task-registry.json"
CLAIM_PREFIX = "claims/m01-"
VALID = {"UNKNOWN", "NEEDS_AUDIT", "DELIVERED_PR", "DELIVERED_BRANCH",
         "IN_CANDIDATE_UNVERIFIED", "SUBSUMED", "HUMAN_REQUIRED", "HUMAN_REVIEW_REQUIRED",
         "INTEGRATED_VERIFIED", "PARTIAL_IN_CANDIDATE", "IN_CORRECTION", "NOT_DEVELOPED", "ANNULLED"}


def load(path=REGISTRY):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    tasks = data["tasks"]
    expected = {"T" + str(i).zfill(2) for i in range(53)}
    if set(tasks) != expected:
        raise ValueError("registry must list exactly T00..T52")
    if any(not isinstance(v.get("refs"), list) or v.get("status") not in VALID
           for v in tasks.values()):
        raise ValueError("invalid M01 task status/refs")
    return data


def gh_json(*args):
    result = subprocess.run(["gh", "api", *args], capture_output=True, text=True, timeout=40)
    if result.returncode:
        raise RuntimeError("GitHub API unavailable (no safe claim): " + result.stderr[:250])
    return json.loads(result.stdout)


def live_refs(repo, task):
    """Search actual open PRs and branch names for a unique task id (Txx)."""
    expression = re.compile(r"(?<![A-Za-z0-9])" + re.escape(task) + r"(?![0-9])", re.I)
    matches = []
    prs = gh_json(f"repos/{repo}/pulls?state=open&per_page=100")
    for pr in prs:
        searchable = " ".join((pr.get("title") or "", pr.get("head", {}).get("ref") or ""))
        if expression.search(searchable):
            matches.append({"kind": "pr", "id": pr["number"], "ref": pr["head"]["ref"]})
    for page in range(1, 6):
        branches = gh_json(f"repos/{repo}/branches?per_page=100&page={page}")
        for br in branches:
            name = br["name"]
            if expression.search(name) or name.lower() == CLAIM_PREFIX + task.lower():
                matches.append({"kind": "branch", "ref": name})
        if len(branches) < 100:
            break
    return matches


def evaluate(task, entry, matches=None):
    if entry["status"] in ("DELIVERED_PR", "DELIVERED_BRANCH", "IN_CANDIDATE_UNVERIFIED",
                           "INTEGRATED_VERIFIED", "IN_CORRECTION"):
        return "REUSE_OR_REVIEW_EXISTING"
    if entry["status"] in ("SUBSUMED", "HUMAN_REQUIRED", "HUMAN_REVIEW_REQUIRED", "ANNULLED"):
        return "DO_NOT_START"
    if entry["status"] in ("NEEDS_AUDIT", "PARTIAL_IN_CANDIDATE"):
        return "AUDIT_EXISTING_FIRST"
    if matches is None:
        return "LIVE_CHECK_REQUIRED"
    if matches:
        return "EXISTING_REMOTE_WORK"
    return "ELIGIBLE_FOR_ATOMIC_CLAIM"


def main(argv=None):
    parser = argparse.ArgumentParser(description="M01 task registry: list, check, claim (atomic)")
    parser.add_argument("action", choices=("list", "check", "claim"))
    parser.add_argument("task", nargs="?", help="T00..T52")
    parser.add_argument("--live", action="store_true", help="query GitHub PRs and branches")
    parser.add_argument("--repo", default="Brawl2007/COD-guerra")
    parser.add_argument("--sha", help="existing source commit SHA for new claim; required for claim")
    a = parser.parse_args(argv)
    data = load()
    if a.action == "list":
        for key, val in data["tasks"].items():
            print(f"{key} {val['status']:<26} {val['name']} | {', '.join(val['refs'])}")
        return 0
    if not a.task or a.task not in data["tasks"]:
        parser.error("check/claim requires a valid task T00..T52")
    entry = data["tasks"][a.task]
    matches = None
    if a.live or a.action == "claim":
        try:
            matches = live_refs(a.repo, a.task)
        except (OSError, RuntimeError, subprocess.TimeoutExpired, ValueError) as error:
            print(f"BLOCKED: {error}", file=sys.stderr)
            return 3
    verdict = evaluate(a.task, entry, matches)
    print(json.dumps({"task": a.task, **entry, "verdict": verdict,
                      "live_refs": matches, "candidate": data["candidate"]},
                     ensure_ascii=False, sort_keys=True))
    if a.action == "check":
        return 0 if verdict == "ELIGIBLE_FOR_ATOMIC_CLAIM" else 2
    if verdict != "ELIGIBLE_FOR_ATOMIC_CLAIM":
        print("Refusing duplicate or unreviewed task claim", file=sys.stderr)
        return 2
    if not a.sha or not re.fullmatch(r"[0-9a-fA-F]{40}", a.sha):
        parser.error("claim requires --sha <40-character existing commit>")
    ref = "refs/heads/" + CLAIM_PREFIX + a.task.lower()
    try:
        subprocess.run(["gh", "api", "-X", "POST", f"repos/{a.repo}/git/refs",
                        "-f", f"ref={ref}", "-f", f"sha={a.sha}"],
                       check=True, capture_output=True, text=True, timeout=40)
    except (subprocess.CalledProcessError, OSError, subprocess.TimeoutExpired) as error:
        print(f"CLAIM_FAILED (someone may already own {ref}): {error}", file=sys.stderr)
        return 3
    print(f"CLAIMED {ref}; record owner/PR in issue #72 and continue on an isolated work branch")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
