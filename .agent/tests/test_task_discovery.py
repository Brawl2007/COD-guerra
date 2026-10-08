import json
import os
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1] / "tools"
GRAPH = Path(__file__).resolve().parents[1] / "templates" / "TASK_GRAPH.json"
STATE_TOOL = TOOLS / "task_state.py"
DISCOVERY = TOOLS / "task_discovery.py"
NODES = ("memory_retrieval", "context_audit", "implementation", "verification",
         "review", "regression_obligations", "memory_update", "handoff")


def run(tool, cwd, *args):
    return subprocess.run(
        [sys.executable, str(tool), *args],
        cwd=cwd, capture_output=True, text=True, check=False,
    )


def dead_pid():
    proc = subprocess.Popen([sys.executable, "-c", "pass"])
    proc.wait()
    return proc.pid


class DiscoveryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def state(self, run_id):
        return self.root / ".agent/runs" / run_id / "graph_state.json"

    def init(self, run_id, contract=True):
        out = run(STATE_TOOL, self.root, "init", "--graph", str(GRAPH),
                  "--run-id", run_id, "--task-id", "T-" + run_id)
        self.assertEqual(out.returncode, 0, out.stderr)
        if contract:
            (self.state(run_id).parent / "TASK_CONTRACT.yaml").write_text(
                "execution:\n  max_fix_attempts: 3\n")
        return self.state(run_id)

    def set(self, run_id, node, status, *extra):
        out = run(STATE_TOOL, self.root, "set", "--state", str(self.state(run_id)),
                  "--node", node, "--status", status, *extra)
        self.assertEqual(out.returncode, 0, out.stderr)

    def patch(self, run_id, node, **fields):
        path = self.state(run_id)
        data = json.loads(path.read_text())
        data["nodes"][node].update(fields)
        path.write_text(json.dumps(data))

    def age(self, run_id, node, seconds=3600):
        old = (datetime.now(timezone.utc) - timedelta(seconds=seconds)).isoformat()
        self.patch(run_id, node, heartbeat_at=old)

    def to_implementation(self, run_id):
        for n in ("memory_retrieval", "context_audit"):
            self.set(run_id, n, "RUNNING")
            self.set(run_id, n, "PASS")

    def running(self, run_id, pid, operation="idempotent", contract=True, stale=True):
        self.init(run_id, contract)
        self.to_implementation(run_id)
        extra = ["--operation", operation]
        if pid is not None:
            extra += ["--pid", str(pid)]
        self.set(run_id, "implementation", "RUNNING", *extra)
        if stale:
            self.age(run_id, "implementation")

    def completed(self, run_id):
        self.init(run_id)
        for n in NODES:
            if n in ("regression_obligations", "memory_update"):
                self.set(run_id, n, "SKIPPED")
            else:
                self.set(run_id, n, "RUNNING")
                self.set(run_id, n, "PASS")

    def classes(self):
        out = run(DISCOVERY, self.root, "--json")
        self.assertEqual(out.returncode, 0, out.stderr)
        return {r["run"]: r["class"] for r in json.loads(out.stdout)["runs"]}

    def detail(self, run_id):
        return run(DISCOVERY, self.root, "--run", run_id)

    def test_multiple_runs_classified_in_one_root(self):
        self.completed("a-done")
        self.init("b-pending")
        self.running("c-active", os.getpid(), stale=False)
        self.running("d-interrupted", dead_pid())
        self.running("e-unknown", None)
        (self.root / ".agent/runs/f-empty").mkdir()
        (self.root / ".agent/runs/README.md").write_text("not a run")
        self.assertEqual(self.classes(), {
            "a-done": "COMPLETED", "b-pending": "PENDING", "c-active": "ACTIVE",
            "d-interrupted": "INTERRUPTED", "e-unknown": "BLOCKED",
            "f-empty": "INVALID",
        })
        out = run(DISCOVERY, self.root)
        self.assertEqual(out.returncode, 0, out.stderr)
        lines = out.stdout.splitlines()
        self.assertTrue(lines[0].startswith("RUN=a-done TASK=T-a-done CLASS=COMPLETED"))
        self.assertIn("RUN=b-pending TASK=T-b-pending CLASS=PENDING RUNNING= "
                      "READY=memory_retrieval", out.stdout)
        self.assertIn("COMPLETED=a-done", lines)
        self.assertIn("INTERRUPTED=d-interrupted", lines)
        self.assertIn("INVALID=f-empty", lines)

    def test_missing_runs_dir_lists_nothing(self):
        out = run(DISCOVERY, self.root)
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertIn("COMPLETED=", out.stdout.splitlines())
        self.assertNotIn("RUN=", out.stdout)

    def test_completed_run(self):
        self.completed("r")
        out = self.detail("r")
        self.assertEqual(out.returncode, 0, out.stdout)
        self.assertIn("CLASS=COMPLETED", out.stdout)
        self.assertIn("NEXT_ACTION=nothing to resume", out.stdout)

    def test_skipped_required_node_is_invalid(self):
        self.completed("r")
        self.patch("r", "review", status="SKIPPED")
        self.assertEqual(self.classes(), {"r": "INVALID"})

    def test_active_process_not_touched(self):
        self.running("r", os.getpid())  # live owner, even with stale heartbeat
        out = self.detail("r")
        self.assertEqual(out.returncode, 3)
        self.assertIn("CLASS=ACTIVE", out.stdout)
        self.assertIn("VERDICT=ACTIVE", out.stdout)
        self.assertIn("NEXT_ACTION=do not touch", out.stdout)

    def test_unknown_pid_is_blocked(self):
        self.running("r", None)
        out = self.detail("r")
        self.assertEqual(out.returncode, 3)
        self.assertIn("CLASS=BLOCKED", out.stdout)
        self.assertIn("VERDICT=UNKNOWN", out.stdout)
        self.assertIn("NEXT_ACTION=escalate to human", out.stdout)

    def test_recovery_allowed_is_interrupted(self):
        self.running("r", dead_pid())
        out = self.detail("r")
        self.assertEqual(out.returncode, 0, out.stdout)
        self.assertIn("CLASS=INTERRUPTED", out.stdout)
        self.assertIn("BUDGET=3", out.stdout)
        self.assertIn("VERDICT=RESUMABLE", out.stdout)
        state = ".agent/runs/r/graph_state.json"
        contract = ".agent/runs/r/TASK_CONTRACT.yaml"
        self.assertIn(
            f"NEXT_ACTION=python3 .agent/tools/task_recovery.py --state {state} "
            f"--contract {contract} --dry-run", out.stdout)

    def test_abandoned_without_contract_is_blocked(self):
        self.running("r", dead_pid(), contract=False)
        out = self.detail("r")
        self.assertEqual(out.returncode, 3)
        self.assertIn("CLASS=BLOCKED", out.stdout)
        self.assertIn("CONTRACT=none", out.stdout)
        self.assertIn("BUDGET=unknown", out.stdout)
        self.assertIn("attempt budget unknown", out.stdout)

    def test_irreversible_operation_is_blocked(self):
        self.running("r", dead_pid(), operation="irreversible")
        out = self.detail("r")
        self.assertEqual(out.returncode, 3)
        self.assertIn("CLASS=BLOCKED", out.stdout)
        self.assertIn("VERDICT=NEEDS_APPROVAL", out.stdout)

    def test_blocked_node_status_is_blocked(self):
        self.init("r")
        self.patch("r", "memory_retrieval", status="BLOCKED")
        out = self.detail("r")
        self.assertEqual(out.returncode, 3)
        self.assertIn("CLASS=BLOCKED", out.stdout)

    def test_invalid_states_do_not_crash(self):
        self.init("corrupt").write_text("{not json")
        self.init("attempts")
        self.patch("attempts", "review", attempts=-1)
        self.init("boolattempts")
        self.patch("boolattempts", "review", attempts=True)
        self.init("status")
        self.patch("status", "review", status="WEIRD")
        mismatch = self.init("mismatch")
        data = json.loads(mismatch.read_text())
        data["nodes"].pop("handoff")
        mismatch.write_text(json.dumps(data))
        nograph = self.init("nograph")
        data = json.loads(nograph.read_text())
        data["graph"] = "missing/GRAPH.json"
        nograph.write_text(json.dumps(data))
        self.init("ok")
        classes = self.classes()
        self.assertEqual(classes.pop("ok"), "PENDING")
        self.assertEqual(set(classes.values()), {"INVALID"}, classes)
        out = self.detail("corrupt")
        self.assertEqual(out.returncode, 3)
        self.assertIn("NEXT_ACTION=do not resume", out.stdout)

    def test_relative_graph_path_resolved_against_root(self):
        graph = self.root / "graphs/G.json"
        graph.parent.mkdir()
        graph.write_text(GRAPH.read_text())
        out = run(STATE_TOOL, self.root, "init", "--graph", "graphs/G.json",
                  "--run-id", "rel", "--task-id", "T")
        self.assertEqual(out.returncode, 0, out.stderr)
        out = subprocess.run([sys.executable, str(DISCOVERY), "--root", str(self.root),
                              "--json"], capture_output=True, text=True, check=False)
        self.assertEqual(json.loads(out.stdout)["summary"]["PENDING"], ["rel"])

    def test_read_only(self):
        self.running("r", dead_pid())
        self.init("n")
        runs = self.root / ".agent/runs"
        for lock in runs.rglob("*.lock"):
            lock.unlink()
        before = {p: (p.read_bytes(), p.stat().st_mtime_ns)
                  for p in runs.rglob("*") if p.is_file()}
        run(DISCOVERY, self.root)
        run(DISCOVERY, self.root, "--json")
        self.detail("r")
        self.detail("n")
        after = {p: (p.read_bytes(), p.stat().st_mtime_ns)
                 for p in runs.rglob("*") if p.is_file()}
        self.assertEqual(before, after)
        self.assertEqual(list(runs.rglob("*.lock")), [])

    def test_run_argument_validation(self):
        self.init("r")
        for bad in ("../r", "a/b", "..", "r/..", ""):
            out = self.detail(bad)
            self.assertEqual(out.returncode, 2, bad)
        out = self.detail("nope")
        self.assertEqual(out.returncode, 2)
        self.assertIn("unknown run", out.stderr)
        self.assertEqual(self.detail("r").returncode, 0)


if __name__ == "__main__":
    unittest.main()
