import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1] / "tools"
GRAPH = Path(__file__).resolve().parents[1] / "templates" / "TASK_GRAPH.json"
STATE_TOOL = TOOLS / "task_state.py"
NODE = "memory_retrieval"


def run(cwd, *args):
    return subprocess.run(
        [sys.executable, str(STATE_TOOL), *args],
        cwd=cwd, capture_output=True, text=True, check=False,
    )


class AttemptsValidationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.cwd = self.tmp.name
        out = run(self.cwd, "init", "--graph", str(GRAPH),
                  "--run-id", "r1", "--task-id", "T")
        self.assertEqual(out.returncode, 0, out.stderr)
        self.state = Path(self.cwd) / ".agent/runs/r1/graph_state.json"

    def tearDown(self):
        self.tmp.cleanup()

    def patch(self, **fields):
        data = json.loads(self.state.read_text())
        data["nodes"][NODE].update(fields)
        self.state.write_text(json.dumps(data))

    def drop_attempts(self):
        data = json.loads(self.state.read_text())
        data["nodes"][NODE].pop("attempts", None)
        self.state.write_text(json.dumps(data))

    def cmd(self, name):
        args = [name, "--state", str(self.state)]
        if name != "show":
            args += ["--node", NODE]
        if name == "set":
            args += ["--status", "RUNNING"]
        return run(self.cwd, *args)

    def assert_clean_error(self, out):
        self.assertEqual(out.returncode, 2, out.stderr)
        self.assertIn("TASK_STATE_ERROR:", out.stderr)
        self.assertNotIn("Traceback", out.stderr)

    def test_invalid_attempts_rejected(self):
        for bad in ("2", None, [1], -1, 1.5, True):
            with self.subTest(bad=bad):
                self.patch(attempts=bad, status="FAIL")
                for name in ("set", "retry", "show"):
                    self.assert_clean_error(self.cmd(name))

    def test_non_dict_node_rejected(self):
        data = json.loads(self.state.read_text())
        data["nodes"][NODE] = "oops"
        self.state.write_text(json.dumps(data))
        self.assert_clean_error(self.cmd("show"))

    def test_valid_attempts_increment(self):
        self.patch(attempts=0)
        out = self.cmd("set")
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertIn("ATTEMPTS=1", out.stdout)

    def test_missing_attempts_legacy(self):
        self.drop_attempts()
        out = self.cmd("set")
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertIn("ATTEMPTS=1", out.stdout)

    def test_positive_attempts_increment(self):
        self.patch(attempts=3)
        out = self.cmd("set")
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertIn("ATTEMPTS=4", out.stdout)


if __name__ == "__main__":
    unittest.main()
