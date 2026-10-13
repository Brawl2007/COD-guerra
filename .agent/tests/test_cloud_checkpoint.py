"""Offline tests for durable cloud checkpoints using temporary local Git remotes."""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "tools" / "cloud_checkpoint.py"
CONTROL = "refs/heads/cod-guerra/cloud-state"


class CloudCheckpointTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.remote = self.base / "origin.git"
        self.work = self.base / "work"
        self.git("init", "-q", "--bare", str(self.remote), cwd=self.base)
        self.git("init", "-q", "-b", "main", str(self.work), cwd=self.base)
        self.git("config", "user.email", "ci@example.invalid")
        self.git("config", "user.name", "CI Test")
        (self.work / "README.md").write_text("game\n")
        self.git("add", "README.md")
        self.git("commit", "-qm", "initial")
        self.git("remote", "add", "origin", str(self.remote))
        self.git("push", "-q", "origin", "main")
        self.main_before = self.git("rev-parse", "HEAD")
        self.git("switch", "-q", "-c", "feature/cloud-01")
        (self.work / "task.txt").write_text("task\n")
        self.git("add", "task.txt")
        self.git("commit", "-qm", "task")
        self.git("push", "-q", "origin", "feature/cloud-01")
        self.work_head = self.git("rev-parse", "HEAD")

    def git(self, *args, cwd=None):
        result = subprocess.run(["git", *args], cwd=cwd or self.work,
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout.strip()

    def run_tool(self, *args, ok=True):
        result = subprocess.run([sys.executable, str(SCRIPT), *args],
                                cwd=self.work, capture_output=True, text=True)
        if ok:
            self.assertEqual(result.returncode, 0, result.stderr)
            return json.loads(result.stdout)
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        return result

    def record(self, **overrides):
        value = {
            "schema_version": 1,
            "task_id": "M01-CLOUD-01",
            "work_branch": "feature/cloud-01",
            "work_head": self.work_head,
            "status": "PENDING",
            "operation": "idempotent",
            "next_action": "Run focused tests before code changes",
            "evidence": ["commit:" + self.work_head, "tests:pending"],
        }
        value.update(overrides)
        return value

    def publish(self, record=None, *, init=False, ok=True):
        file = self.base / "checkpoint.json"
        file.write_text(json.dumps(record or self.record()))
        args = ["publish", "--input", str(file)]
        if init:
            args.append("--init")
        return self.run_tool(*args, ok=ok)

    def control_head(self):
        return self.git("ls-remote", "--heads", "origin", CONTROL)

    def test_initialization_is_explicit_and_does_not_change_main(self):
        self.publish(ok=False)
        self.assertFalse(self.control_head())
        self.publish(init=True)
        self.assertTrue(self.control_head())
        self.assertEqual(self.git("ls-remote", "--heads", "origin", "refs/heads/main").split()[0],
                         self.main_before)
        self.assertEqual(self.git("branch", "--show-current"), "feature/cloud-01")
        self.assertEqual(self.git("status", "--porcelain"), "")

    def test_roundtrip_is_durable_and_resumable_when_safe(self):
        self.publish(init=True)
        self.assertEqual(self.run_tool("list")[0]["task_id"], "M01-CLOUD-01")
        result = self.run_tool("get", "--task-id", "M01-CLOUD-01")
        self.assertTrue(result["resume_allowed"])
        self.assertEqual(result["reason"], "ready")
        self.assertEqual(result["checkpoint"]["work_head"], self.work_head)
        self.assertEqual(result["checkpoint"]["next_action"], self.record()["next_action"])

    def test_new_cloud_checkout_reads_remote_checkpoint(self):
        self.publish(init=True)
        fresh = self.base / "fresh-session"
        cloned = subprocess.run(
            ["git", "clone", "-q", "--branch", "feature/cloud-01",
             str(self.remote), str(fresh)], capture_output=True, text=True
        )
        self.assertEqual(cloned.returncode, 0, cloned.stderr)
        self.assertFalse((fresh / ".agent" / "runs").exists())
        result = subprocess.run(
            [sys.executable, str(SCRIPT), "get", "--task-id", "M01-CLOUD-01"],
            cwd=fresh, capture_output=True, text=True
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        recovered = json.loads(result.stdout)
        self.assertTrue(recovered["resume_allowed"])
        self.assertEqual(recovered["checkpoint"]["work_head"], self.work_head)

    def test_running_or_irreversible_is_not_auto_resumed(self):
        self.publish(self.record(status="RUNNING"), init=True)
        self.assertEqual(self.run_tool("get", "--task-id", "M01-CLOUD-01")["reason"],
                         "manual_review_required")
        self.publish(self.record(operation="irreversible", status="PENDING"))
        self.assertFalse(self.run_tool("get", "--task-id", "M01-CLOUD-01")["resume_allowed"])

    def test_changed_remote_work_head_blocks_resumption(self):
        self.publish(init=True)
        (self.work / "task.txt").write_text("new task change\n")
        self.git("add", "task.txt")
        self.git("commit", "-qm", "change after checkpoint")
        self.git("push", "-q", "origin", "feature/cloud-01")
        result = self.run_tool("get", "--task-id", "M01-CLOUD-01")
        self.assertFalse(result["resume_allowed"])
        self.assertEqual(result["reason"], "work_head_changed_or_missing")
        self.publish(ok=False)

    def test_cannot_publish_from_main_even_with_valid_remote_work_branch(self):
        self.git("switch", "-q", "main")
        self.publish(init=True, ok=False)
        self.assertFalse(self.control_head())

    def test_cannot_publish_from_detached_head(self):
        self.git("checkout", "-q", "--detach", self.main_before)
        self.publish(init=True, ok=False)
        self.assertFalse(self.control_head())

    def test_invalid_and_protected_branches_do_not_publish(self):
        for branch in ("main", "master", "cod-guerra/cloud-state", "-bad"):
            with self.subTest(branch=branch):
                self.publish(self.record(work_branch=branch), init=True, ok=False)
        self.assertFalse(self.control_head())

    def test_invalid_schema_and_task_ids_are_rejected(self):
        for changed in ({"task_id": "../bad"}, {"work_head": "abc"},
                        {"evidence": ["x\nbad"]}, {"schema_version": 2},
                        {"next_action": "x" * 500}):
            with self.subTest(changed=changed):
                self.publish(self.record(**changed), init=True, ok=False)
        self.assertEqual(self.run_tool("list"), [])

    def test_explicit_second_publish_advances_control_branch(self):
        self.publish(init=True)
        first = self.control_head()
        self.publish(self.record(status="BLOCKED", next_action="Ask for approval"))
        second = self.control_head()
        self.assertNotEqual(first, second)
        self.assertFalse(self.run_tool("get", "--task-id", "M01-CLOUD-01")["resume_allowed"])

    def test_missing_task_and_invalid_task_rejected(self):
        self.publish(init=True)
        self.run_tool("get", "--task-id", "UNKNOWN", ok=False)
        self.run_tool("get", "--task-id", "../", ok=False)

    def test_read_only_empty_state(self):
        self.assertEqual(self.run_tool("list"), [])
        self.assertFalse(self.control_head())


if __name__ == "__main__":
    unittest.main()
