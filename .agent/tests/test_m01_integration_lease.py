"""Offline tests for single-owner GitHub integration lock; no network or tokens."""
import importlib.util
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

PATH = Path(__file__).resolve().parents[1] / "tools/m01_integration_lease.py"
spec = importlib.util.spec_from_file_location("m01_integration_lease", PATH)
lease = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = lease
spec.loader.exec_module(lease)

CANDIDATE = "claude/quirky-heisenberg-9l4m7b"
PIN = "a" * 40
NEXT = "b" * 40
LOCK_HEAD = "c" * 40
TOKEN = "token-123"


def held(**overrides):
    data = {"schema": 1, "status": "HELD", "owner": "session-a",
            "token": TOKEN, "candidate": CANDIDATE, "candidate_sha": PIN,
            "updated_at": "2026-10-16T15:00:00+00:00", "handoff": None}
    data.update(overrides)
    return data


class IntegrationLeaseTests(unittest.TestCase):
    def test_main_can_never_be_acquired(self):
        with patch.object(lease, "head") as h:
            with self.assertRaises(lease.LeaseError):
                lease.acquire("main", "session-a")
            h.assert_not_called()

    def test_active_session_blocks_second_session(self):
        with patch.object(lease, "head", return_value=PIN), \
             patch.object(lease, "read_lock", return_value=(LOCK_HEAD, held())), \
             patch.object(lease, "transition") as transition:
            with self.assertRaisesRegex(lease.LeaseError, "occupied"):
                lease.acquire(CANDIDATE, "session-b")
            transition.assert_not_called()

    def test_first_claim_uses_atomic_ref_creation(self):
        seen = []
        def fake_api(method, path, payload=None, missing_ok=False):
            seen.append((method, path, payload))
            return {}
        with patch.object(lease, "head", return_value=PIN), \
             patch.object(lease, "read_lock", return_value=(None, None)), \
             patch.object(lease, "make_commit", return_value=LOCK_HEAD), \
             patch.object(lease, "api", side_effect=fake_api):
            result = lease.acquire(CANDIDATE, "session-a")
        self.assertEqual(result["candidate_sha"], PIN)
        self.assertTrue(any(m == "POST" and p == "git/refs" and
                            payload["ref"] == "refs/heads/" + lease.LOCK
                            for m, p, payload in seen))

    def test_conflicting_ref_creation_is_not_ignored(self):
        with patch.object(lease, "head", return_value=PIN), \
             patch.object(lease, "read_lock", return_value=(None, None)), \
             patch.object(lease, "make_commit", return_value=LOCK_HEAD), \
             patch.object(lease, "api", side_effect=lease.LeaseError("422 conflict")):
            with self.assertRaises(lease.LeaseError):
                lease.acquire(CANDIDATE, "session-b")

    def test_transition_is_non_force_fast_forward(self):
        with patch.object(lease, "make_commit", return_value=NEXT), \
             patch.object(lease, "api", return_value={}) as request:
            self.assertEqual(lease.transition(LOCK_HEAD, held()), NEXT)
        self.assertEqual(request.call_args.args[0], "PATCH")
        self.assertEqual(request.call_args.args[2]["force"], False)

    def test_guard_rejects_candidate_changed_by_another_session(self):
        with patch.object(lease, "read_lock", return_value=(LOCK_HEAD, held())), \
             patch.object(lease, "head", return_value=NEXT):
            with self.assertRaisesRegex(lease.LeaseError, "HEAD changed"):
                lease.guard(TOKEN)

    def test_guard_accepts_pinned_head_and_owner(self):
        with patch.object(lease, "read_lock", return_value=(LOCK_HEAD, held())), \
             patch.object(lease, "head", return_value=PIN):
            self.assertEqual(lease.guard(TOKEN)["sha"], PIN)

    def test_wrong_owner_cannot_release(self):
        with patch.object(lease, "read_lock", return_value=(LOCK_HEAD, held())), \
             patch.object(lease, "transition") as transition:
            with self.assertRaises(lease.LeaseError):
                lease.release("someone-else", "finished")
            transition.assert_not_called()

    def test_release_records_handoff(self):
        with patch.object(lease, "read_lock", return_value=(LOCK_HEAD, held())), \
             patch.object(lease, "transition", return_value=NEXT) as transition:
            result = lease.release(TOKEN, "CI pending: HEAD abcd")
        self.assertTrue(result["released"])
        state = transition.call_args.args[1]
        self.assertEqual(state["status"], "FREE")
        self.assertEqual(state["handoff"], "CI pending: HEAD abcd")

    def test_advance_refuses_non_ff_branch(self):
        with patch.object(lease, "read_lock", return_value=(LOCK_HEAD, held())), \
             patch.object(lease, "head", return_value=NEXT), \
             patch.object(lease, "api", return_value={"status": "diverged", "behind_by": 1}), \
             patch.object(lease, "transition") as transition:
            with self.assertRaisesRegex(lease.LeaseError, "non-fast-forward"):
                lease.advance(TOKEN, NEXT)
            transition.assert_not_called()

    def test_intake_queue_requires_ready_and_not_draft(self):
        pull = lambda n, ready, draft: {
            "number": n, "draft": draft, "body": "M01-INTEGRATION: READY" if ready else "",
            "labels": [], "head": {"ref": "feature", "sha": PIN},
            "base": {"ref": "main"}, "title": "Example",
        }
        with patch.object(lease, "api", return_value=[
            pull(1, True, False), pull(2, False, False), pull(3, True, True)
        ]):
            self.assertEqual([x["pr"] for x in lease.candidates()], [1])


if __name__ == "__main__":
    unittest.main()
