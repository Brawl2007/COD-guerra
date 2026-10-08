import json
import os
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))
from task_lock import StateLock  # noqa: E402
GRAPH = Path(__file__).resolve().parents[1] / "templates" / "TASK_GRAPH.json"
STATE_TOOL = TOOLS / "task_state.py"
RECOVERY = TOOLS / "task_recovery.py"


def run(tool, cwd, *args):
    return subprocess.run(
        [sys.executable, str(tool), *args],
        cwd=cwd, capture_output=True, text=True, check=False,
    )


def dead_pid():
    proc = subprocess.Popen([sys.executable, "-c", "pass"])
    proc.wait()
    return proc.pid


class RecoveryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.cwd = self.tmp.name
        out = run(STATE_TOOL, self.cwd, "init", "--graph", str(GRAPH),
                  "--run-id", "r1", "--task-id", "T")
        self.assertEqual(out.returncode, 0, out.stderr)
        self.state = Path(self.cwd) / ".agent/runs/r1/graph_state.json"
        self.contract = Path(self.cwd) / "contract.yaml"
        self.contract.write_text("execution:\n  max_fix_attempts: 3\n")

    def tearDown(self):
        self.tmp.cleanup()

    def set(self, node, status, *extra):
        out = run(STATE_TOOL, self.cwd, "set", "--state", str(self.state),
                  "--node", node, "--status", status, *extra)
        self.assertEqual(out.returncode, 0, out.stderr)

    def load(self):
        return json.loads(self.state.read_text())

    def patch(self, node, **fields):
        data = self.load()
        data["nodes"][node].update(fields)
        self.state.write_text(json.dumps(data))

    def age(self, node, seconds=3600):
        old = (datetime.now(timezone.utc) - timedelta(seconds=seconds)).isoformat()
        self.patch(node, heartbeat_at=old)

    def recover(self, *extra):
        return run(RECOVERY, self.cwd, "--state", str(self.state),
                   "--contract", str(self.contract), *extra)

    def advance_to_implementation(self):
        for n in ("memory_retrieval", "context_audit"):
            self.set(n, "RUNNING")
            self.set(n, "PASS")

    def interrupted(self, operation="idempotent"):
        self.advance_to_implementation()
        self.set("implementation", "RUNNING", "--pid", str(dead_pid()),
                 "--operation", operation)
        self.age("implementation")

    def test_recovery_after_interruption_resumes_without_graph_restart(self):
        self.interrupted()
        out = self.recover()
        self.assertEqual(out.returncode, 0, out.stdout)
        data = self.load()["nodes"]
        self.assertEqual(data["implementation"]["status"], "READY")
        self.assertEqual(data["implementation"]["attempts"], 1)
        self.assertEqual(data["memory_retrieval"]["status"], "PASS")
        self.assertEqual(data["context_audit"]["status"], "PASS")
        self.assertEqual(data["verification"]["status"], "PENDING")
        self.assertIn("RESUMABLE=implementation", out.stdout)
        # Resumed run continues counting attempts.
        self.set("implementation", "RUNNING")
        self.assertEqual(self.load()["nodes"]["implementation"]["attempts"], 2)

    def test_dry_run_does_not_modify_state(self):
        self.interrupted()
        before = self.state.read_text()
        out = self.recover("--dry-run")
        self.assertIn("RESUMABLE=implementation", out.stdout)
        self.assertEqual(self.state.read_text(), before)

    def test_live_process_is_not_abandoned(self):
        self.advance_to_implementation()
        sleeper = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(30)"])
        try:
            self.set("implementation", "RUNNING", "--pid", str(sleeper.pid),
                     "--operation", "idempotent")
            self.age("implementation")
            out = self.recover()
            self.assertEqual(out.returncode, 0)
            self.assertIn("ACTIVE=implementation", out.stdout)
            self.assertEqual(self.load()["nodes"]["implementation"]["status"], "RUNNING")
        finally:
            sleeper.kill()
            sleeper.wait()

    def test_recycled_pid_counts_as_dead(self):
        self.advance_to_implementation()
        sleeper = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(30)"])
        try:
            self.set("implementation", "RUNNING", "--pid", str(sleeper.pid),
                     "--operation", "idempotent")
            if "owner_pid_start" not in self.load()["nodes"]["implementation"]:
                self.skipTest("no /proc start time available")
            self.patch("implementation", owner_pid_start=1)
            self.age("implementation")
            self.assertIn("RESUMABLE=implementation", self.recover("--dry-run").stdout)
        finally:
            sleeper.kill()
            sleeper.wait()

    def test_fresh_heartbeat_or_missing_evidence_is_not_abandoned(self):
        self.advance_to_implementation()
        self.set("implementation", "RUNNING", "--pid", str(dead_pid()),
                 "--operation", "idempotent")
        out = self.recover()  # heartbeat just written
        self.assertIn("ACTIVE=implementation", out.stdout)
        self.patch("implementation", heartbeat_at=None, owner_pid=None)
        out = self.recover()
        self.assertEqual(out.returncode, 3)
        self.assertIn("UNKNOWN=implementation", out.stdout)
        self.assertEqual(self.load()["nodes"]["implementation"]["status"], "RUNNING")

    def test_dangerous_operations_require_approval(self):
        for operation in ("irreversible", None):
            with self.subTest(operation=operation):
                self.tearDown(); self.setUp()
                self.advance_to_implementation()
                extra = ["--operation", operation] if operation else []
                self.set("implementation", "RUNNING", "--pid", str(dead_pid()), *extra)
                self.age("implementation")
                out = self.recover()
                self.assertEqual(out.returncode, 3)
                self.assertIn("NEEDS_APPROVAL=implementation", out.stdout)
                self.assertEqual(self.load()["nodes"]["implementation"]["status"], "RUNNING")
                out = self.recover("--approve", "implementation")
                self.assertEqual(out.returncode, 0, out.stdout)
                self.assertEqual(self.load()["nodes"]["implementation"]["status"], "READY")

    def test_attempt_budget_is_respected_even_with_approval(self):
        self.advance_to_implementation()
        self.patch("implementation", status="READY", attempts=2)
        self.set("implementation", "RUNNING", "--pid", str(dead_pid()),
                 "--operation", "idempotent")
        self.assertEqual(self.load()["nodes"]["implementation"]["attempts"], 3)
        self.age("implementation")
        out = self.recover("--approve", "implementation")
        self.assertEqual(out.returncode, 3)
        self.assertIn("BUDGET_EXHAUSTED=implementation", out.stdout)
        data = self.load()["nodes"]["implementation"]
        self.assertEqual(data["status"], "BLOCKED")
        self.assertEqual(data["attempts"], 3)

    def test_unknown_budget_blocks_automation(self):
        self.interrupted()
        out = run(RECOVERY, self.cwd, "--state", str(self.state))
        self.assertEqual(out.returncode, 3)
        self.assertIn("NEEDS_APPROVAL=implementation", out.stdout)

    def test_pass_nodes_and_attempts_are_preserved(self):
        self.interrupted()
        before = self.load()["nodes"]
        self.recover()
        after = self.load()["nodes"]
        for name in ("memory_retrieval", "context_audit"):
            self.assertEqual(before[name], after[name])
        self.assertEqual(before["implementation"]["attempts"],
                         after["implementation"]["attempts"])

    def test_integration_node_never_auto_resumes(self):
        graph = {
            "schema_version": 1, "task_id": "",
            "nodes": {"push": {"type": "integration", "depends_on": []}},
        }
        gpath = Path(self.cwd) / "g.json"
        gpath.write_text(json.dumps(graph))
        out = run(STATE_TOOL, self.cwd, "init", "--graph", str(gpath),
                  "--run-id", "r2", "--task-id", "T")
        self.assertEqual(out.returncode, 0, out.stderr)
        self.state = Path(self.cwd) / ".agent/runs/r2/graph_state.json"
        self.set("push", "RUNNING", "--pid", str(dead_pid()), "--operation", "idempotent")
        self.age("push")
        out = self.recover()
        self.assertEqual(out.returncode, 3)
        self.assertIn("NEEDS_APPROVAL=push", out.stdout)

    # --- unknown owner -------------------------------------------------

    def test_unknown_pid_with_stale_heartbeat_is_never_auto_recovered(self):
        for pid in (None, 0, -5, True, "abc"):
            with self.subTest(pid=pid):
                self.tearDown(); self.setUp()
                self.advance_to_implementation()
                self.set("implementation", "RUNNING", "--operation", "idempotent")
                self.patch("implementation", owner_pid=pid)
                self.age("implementation")
                before = self.state.read_text()
                out = self.recover()
                self.assertEqual(out.returncode, 3, out.stdout)
                self.assertIn("UNKNOWN=implementation", out.stdout)
                self.assertIn("RESUMABLE=\n", out.stdout)
                self.assertEqual(self.state.read_text(), before)

    def test_unknown_pid_needs_explicit_approval_and_stale_heartbeat(self):
        self.advance_to_implementation()
        self.set("implementation", "RUNNING", "--operation", "idempotent")
        # fresh heartbeat: approval must not override liveness evidence
        out = self.recover("--approve", "implementation")
        self.assertIn("ACTIVE=implementation", out.stdout)
        self.age("implementation")
        # no heartbeat at all: nothing to prove abandonment, even approved
        self.patch("implementation", heartbeat_at=None)
        out = self.recover("--approve", "implementation")
        self.assertIn("UNKNOWN=implementation", out.stdout)
        self.age("implementation")
        out = self.recover("--approve", "implementation")
        self.assertEqual(out.returncode, 0, out.stdout)
        self.assertEqual(self.load()["nodes"]["implementation"]["status"], "READY")

    # --- irreversible --------------------------------------------------

    def test_irreversible_is_never_resumed_without_approval(self):
        self.interrupted("irreversible")
        out = self.recover()
        self.assertEqual(out.returncode, 3)
        self.assertIn("NEEDS_APPROVAL=implementation", out.stdout)
        self.assertIn("RESUMABLE=\n", out.stdout)
        self.assertEqual(self.load()["nodes"]["implementation"]["status"], "RUNNING")

    # --- legacy states -------------------------------------------------

    def test_legacy_state_without_new_fields_is_compatible(self):
        self.advance_to_implementation()
        data = self.load()
        data["nodes"]["implementation"] = {"status": "READY"}  # no attempts
        self.state.write_text(json.dumps(data))
        self.set("implementation", "RUNNING", "--pid", str(dead_pid()),
                 "--operation", "idempotent")
        self.assertEqual(self.load()["nodes"]["implementation"]["attempts"], 1)
        # legacy RUNNING node with no liveness fields at all
        data = self.load()
        data["nodes"]["implementation"] = {"status": "RUNNING"}
        self.state.write_text(json.dumps(data))
        out = self.recover()
        self.assertEqual(out.returncode, 3)
        self.assertIn("UNKNOWN=implementation", out.stdout)
        self.assertEqual(self.load()["nodes"]["implementation"], {"status": "RUNNING"})

    # --- concurrency ---------------------------------------------------

    def test_simultaneous_recoveries_apply_exactly_once(self):
        self.interrupted()
        procs = [
            subprocess.Popen(
                [sys.executable, str(RECOVERY), "--state", str(self.state),
                 "--contract", str(self.contract)],
                cwd=self.cwd, stdout=subprocess.PIPE, text=True)
            for _ in range(8)
        ]
        outs = [p.communicate()[0] for p in procs]
        self.assertTrue(all(p.returncode == 0 for p in procs), outs)
        self.assertEqual(sum("RESUMABLE=implementation" in o for o in outs), 1)
        node = self.load()["nodes"]["implementation"]
        self.assertEqual(node["status"], "READY")
        self.assertEqual(node["attempts"], 1)
        self.assertEqual(len(node["recoveries"]), 1)
        self.assertEqual(self.load()["nodes"]["memory_retrieval"]["status"], "PASS")

    def test_recovery_decides_on_state_changed_while_it_waited(self):
        self.interrupted()
        lock = StateLock(self.state).acquire()
        proc = subprocess.Popen(
            [sys.executable, str(RECOVERY), "--state", str(self.state),
             "--contract", str(self.contract)],
            cwd=self.cwd, stdout=subprocess.PIPE, text=True)
        try:
            time.sleep(0.5)
            self.assertIsNone(proc.poll(), "recovery must wait for the lock")
            # A live owner heartbeats while recovery is blocked.
            self.patch("implementation", heartbeat_at=datetime.now(timezone.utc).isoformat())
        finally:
            lock.release()
        out = proc.communicate(timeout=20)[0]
        self.assertIn("ACTIVE=implementation", out)
        self.assertEqual(self.load()["nodes"]["implementation"]["status"], "RUNNING")

    def test_state_tool_waits_for_lock_and_times_out(self):
        self.interrupted()
        lock = StateLock(self.state).acquire()
        try:
            env = dict(os.environ, TASK_LOCK_TIMEOUT="0.3")
            out = subprocess.run(
                [sys.executable, str(STATE_TOOL), "heartbeat", "--state",
                 str(self.state), "--node", "implementation"],
                cwd=self.cwd, capture_output=True, text=True, env=env)
            self.assertEqual(out.returncode, 2)
            self.assertIn("could not lock", out.stderr)
        finally:
            lock.release()

    def test_concurrent_state_updates_are_not_lost(self):
        names = [f"n{i}" for i in range(8)]
        graph = {"schema_version": 1, "task_id": "",
                 "nodes": {n: {"type": "integration", "depends_on": []} for n in names}}
        gpath = Path(self.cwd) / "wide.json"
        gpath.write_text(json.dumps(graph))
        out = run(STATE_TOOL, self.cwd, "init", "--graph", str(gpath),
                  "--run-id", "wide", "--task-id", "T")
        self.assertEqual(out.returncode, 0, out.stderr)
        self.state = Path(self.cwd) / ".agent/runs/wide/graph_state.json"
        results = []

        def work(node):
            for status in ("RUNNING", "PASS"):
                results.append(run(STATE_TOOL, self.cwd, "set", "--state",
                                   str(self.state), "--node", node,
                                   "--status", status).returncode)

        threads = [threading.Thread(target=work, args=(n,)) for n in names]
        [t.start() for t in threads]
        [t.join() for t in threads]
        self.assertEqual(results, [0] * 16)
        nodes = self.load()["nodes"]
        self.assertTrue(all(nodes[n]["status"] == "PASS" and nodes[n]["attempts"] == 1
                            for n in names), nodes)


if __name__ == "__main__":
    unittest.main()
