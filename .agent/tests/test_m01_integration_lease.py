"""Offline checks for M01 integration lock (no GitHub requests / no paid models)."""
import importlib.util
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

FILE = Path(__file__).resolve().parents[1] / "tools/m01_integration_lease.py"
spec = importlib.util.spec_from_file_location("m01_integration_lease", FILE)
lease = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = lease
spec.loader.exec_module(lease)

CANDIDATE = "claude/quirky-heisenberg-9l4m7b"
PIN = "a" * 40
NEXT = "b" * 40
BLOB = "c" * 40
TOKEN = "token-123"


def record(**changes):
    value = {
        "schema": 1, "status": "HELD", "owner": "session-a",
        "token": TOKEN, "candidate": CANDIDATE, "candidate_sha": PIN,
        "updated_at": "2026-10-16T20:00:00+00:00",
        "generation": 3, "handoff": None,
    }
    value.update(changes)
    return value


class LeaseTests(unittest.TestCase):
    def test_main_is_never_a_valid_candidate(self):
        with patch.object(lease, "branch_head") as remote:
            with self.assertRaises(lease.LeaseError):
                lease.acquire("main", "session-a")
            remote.assert_not_called()

    def test_active_owner_blocks_new_session_without_write(self):
        with patch.object(lease, "branch_head", return_value=PIN), \
             patch.object(lease, "read_state", return_value=(BLOB, record())), \
             patch.object(lease, "write_state") as write:
            with self.assertRaisesRegex(lease.LeaseError, "unavailable"):
                lease.acquire(CANDIDATE, "session-b")
            write.assert_not_called()

    def test_paused_migration_blocks_new_integrations(self):
        with patch.object(lease, "branch_head", return_value=PIN), \
             patch.object(lease, "read_state", return_value=(BLOB, record(status="PAUSED"))), \
             patch.object(lease, "write_state") as write:
            with self.assertRaisesRegex(lease.LeaseError, "PAUSED"):
                lease.acquire(CANDIDATE, "session-b")
            write.assert_not_called()

    def test_activation_requires_old_sessions_confirmed_stopped(self):
        with patch.object(lease, "read_state") as reader:
            with self.assertRaises(lease.LeaseError):
                lease.activate("No further writers after current routine handoffs")
            reader.assert_not_called()

    def test_activation_pins_current_candidate_sha(self):
        with patch.object(lease, "read_state", return_value=(BLOB, record(status="PAUSED"))), \
             patch.object(lease, "branch_head", return_value=NEXT), \
             patch.object(lease, "write_state", return_value={"generation": 4}) as write:
            result = lease.activate("CI checked and all previous writers stopped", True)
        self.assertEqual(result["sha"], NEXT)
        self.assertEqual(write.call_args.args[1]["status"], "FREE")
        self.assertEqual(write.call_args.args[1]["candidate_sha"], NEXT)

    def test_acquire_sets_owner_and_pins_remote_head(self):
        with patch.object(lease, "branch_head", return_value=PIN), \
             patch.object(lease, "read_state", return_value=(BLOB, record(status="FREE"))), \
             patch.object(lease, "write_state", return_value={"generation": 4}) as write:
            data = lease.acquire(CANDIDATE, "session-b")
        self.assertEqual(data["sha"], PIN)
        self.assertEqual(data["generation"], 4)
        self.assertEqual(write.call_args.args[0], BLOB)
        self.assertEqual(write.call_args.args[1]["owner"], "session-b")
        self.assertEqual(write.call_args.args[1]["status"], "HELD")

    def test_contents_write_uses_expected_blob_not_force(self):
        seen = {}
        def fake_api(method, path, body=None):
            seen.update({"method": method, "path": path, "body": body})
            return {}
        with patch.object(lease, "api", side_effect=fake_api):
            lease.write_state(BLOB, record(), "heartbeat")
        self.assertEqual(seen["method"], "PUT")
        self.assertEqual(seen["body"]["sha"], BLOB)
        self.assertEqual(seen["body"]["branch"], lease.COORD_BRANCH)
        self.assertNotIn("force", seen["body"])

    def test_conflicting_update_fails_closed(self):
        with patch.object(lease, "api", side_effect=lease.LeaseError("409 Conflict")):
            with self.assertRaises(lease.LeaseError):
                lease.write_state(BLOB, record(), "acquire")

    def test_wrong_session_cannot_release(self):
        with patch.object(lease, "read_state", return_value=(BLOB, record())), \
             patch.object(lease, "write_state") as write:
            with self.assertRaises(lease.LeaseError):
                lease.release("other-session", "done")
            write.assert_not_called()

    def test_guard_detects_candidate_head_drift(self):
        with patch.object(lease, "read_state", return_value=(BLOB, record())), \
             patch.object(lease, "branch_head", return_value=NEXT):
            with self.assertRaisesRegex(lease.LeaseError, "HEAD changed"):
                lease.guard(TOKEN)

    def test_guard_accepts_pinned_head_and_owner(self):
        with patch.object(lease, "read_state", return_value=(BLOB, record())), \
             patch.object(lease, "branch_head", return_value=PIN):
            self.assertTrue(lease.guard(TOKEN)["authorized"])

    def test_release_records_short_handoff(self):
        with patch.object(lease, "read_state", return_value=(BLOB, record())), \
             patch.object(lease, "write_state", return_value={"generation": 4}) as write:
            self.assertTrue(lease.release(TOKEN, "CI pending")["released"])
        state = write.call_args.args[1]
        self.assertEqual(state["status"], "FREE")
        self.assertEqual(state["handoff"], "CI pending")
        self.assertIsNone(state["token"])

    def test_recovery_requires_exact_owner_and_generation(self):
        with patch.object(lease, "read_state", return_value=(BLOB, record())), \
             patch.object(lease, "write_state") as write:
            with self.assertRaises(lease.LeaseError):
                lease.recover("session-a", 2, "Confirmed previous run is no longer running", True)
            write.assert_not_called()

    def test_recovery_cannot_use_expiration_without_evidence(self):
        with patch.object(lease, "read_state", return_value=(BLOB, record())), \
             patch.object(lease, "write_state") as write:
            with self.assertRaises(lease.LeaseError):
                lease.recover("session-a", 3, "expired")
            write.assert_not_called()

    def test_non_fast_forward_is_rejected(self):
        with patch.object(lease, "read_state", return_value=(BLOB, record())), \
             patch.object(lease, "branch_head", return_value=NEXT), \
             patch.object(lease, "api", return_value={"status": "diverged", "behind_by": 1}), \
             patch.object(lease, "write_state") as write:
            with self.assertRaisesRegex(lease.LeaseError, "fast-forward"):
                lease.advance(TOKEN, NEXT)
            write.assert_not_called()

    def test_ready_queue_ignores_drafts_and_unready(self):
        def pull(number, ready, draft):
            return {
                "number": number, "draft": draft,
                "body": "M01-INTEGRATION: READY" if ready else "",
                "labels": [], "head": {"ref": "feature", "sha": PIN},
                "base": {"ref": "main"}, "title": "Example"
            }
        with patch.object(lease, "api", return_value=[
            pull(1, True, False), pull(2, False, False), pull(3, True, True)
        ]):
            self.assertEqual([i["pr"] for i in lease.candidates()], [1])


if __name__ == "__main__":
    unittest.main()
