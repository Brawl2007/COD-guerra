import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

TOOL = Path(__file__).resolve().parents[1] / "tools" / "context_packet.py"
RUN = "R1"


def sh(cwd, *cmd):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, check=True)


class ContextPacketTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.root = Path(self._tmp.name).resolve()
        sh(self.root, "git", "init", "-q", "-b", "work")
        sh(self.root, "git", "config", "user.email", "t@t")
        sh(self.root, "git", "config", "user.name", "t")
        (self.root / "a.txt").write_text("a\n")
        (self.root / "b.txt").write_text("b\n")
        (self.root / "contract.yaml").write_text("task: T\n")
        self.commit("init")
        self.create()

    def commit(self, msg):
        sh(self.root, "git", "add", "-A", ":!.agent")
        sh(self.root, "git", "commit", "-q", "--allow-empty", "-m", msg)

    def tool(self, *args):
        return subprocess.run([sys.executable, str(TOOL), *args, "--root", str(self.root)],
                              capture_output=True, text=True, check=False)

    def create(self, *extra):
        r = self.tool("create", "--run-id", RUN, "--task-id", "T", "--contract",
                      "contract.yaml", "--file", "a.txt", "--invariant", "no gameplay",
                      "--evidence", "x" * 500, *extra)
        self.assertEqual(r.returncode, 0, r.stderr)
        return r

    def check(self, run=RUN):
        return self.tool("check", "--run-id", run)

    @property
    def pfile(self):
        return self.root / ".agent" / "runs" / RUN / "context_packet.json"

    def assertStale(self, reason):
        r = self.check()
        self.assertEqual(r.returncode, 1, r.stdout)
        self.assertIn("PACKET=STALE", r.stdout)
        self.assertIn(reason, r.stdout)

    def assertInvalid(self):
        r = self.check()
        self.assertEqual(r.returncode, 2, r.stdout)
        self.assertIn("PACKET=INVALID", r.stdout)

    def test_create_fields(self):
        p = json.loads(self.pfile.read_text())
        for k in ("schema_version", "task_id", "run_id", "branch", "head",
                  "contract_path", "contract_sha256", "files", "invariants",
                  "evidence", "git_dirty", "created_at"):
            self.assertIn(k, p)
        self.assertEqual(p["branch"], "work")
        self.assertEqual(p["files"][0]["path"], "a.txt")
        self.assertEqual(p["files"][0]["size"], 2)
        self.assertEqual(len(p["files"][0]["sha256"]), 64)
        self.assertEqual(len(p["evidence"][0]), 300)
        self.assertEqual(p["git_dirty"], [])

    def test_valid_reuse(self):
        r = self.check()
        self.assertEqual(r.returncode, 0)
        self.assertIn("PACKET=VALID", r.stdout)
        s = self.tool("show", "--run-id", RUN)
        self.assertEqual(s.returncode, 0)
        self.assertEqual(json.loads(s.stdout)["task_id"], "T")

    def test_new_commit_stales_head(self):
        self.commit("more")
        self.assertStale("head_changed")

    def test_contract_edit(self):
        (self.root / "contract.yaml").write_text("task: changed\n")
        self.assertStale("contract_changed")

    def test_contract_missing(self):
        (self.root / "contract.yaml").unlink()
        self.assertStale("contract_changed")

    def test_relevant_file_edit(self):
        (self.root / "a.txt").write_text("edited\n")
        self.assertStale("file_changed:a.txt")

    def test_relevant_file_deleted(self):
        (self.root / "a.txt").unlink()
        self.assertStale("file_changed:a.txt")

    def test_untracked_file(self):
        (self.root / "new.txt").write_text("n\n")
        self.assertStale("dirty_changed")

    def test_tracked_modification(self):
        (self.root / "b.txt").write_text("b2\n")
        self.assertStale("dirty_changed")

    def test_further_edit_of_dirty_file(self):
        (self.root / "b.txt").write_text("b2\n")
        self.create()
        self.assertEqual(self.check().returncode, 0)
        (self.root / "b.txt").write_text("b3\n")
        self.assertStale("dirty_changed")

    def test_branch_change(self):
        sh(self.root, "git", "checkout", "-q", "-b", "other")
        self.assertStale("branch_changed")

    def test_ignores_agent_runs(self):
        (self.root / ".agent" / "runs" / "other").mkdir(parents=True)
        (self.root / ".agent" / "runs" / "other" / "state.json").write_text("{}")
        (self.pfile.parent / "noise.txt").write_text("x")
        self.assertEqual(self.check().returncode, 0)

    def test_missing_packet(self):
        self.assertEqual(self.check("nope").returncode, 2)

    def test_invalid_json(self):
        self.pfile.write_text("{not json")
        self.assertInvalid()

    def test_truncated(self):
        text = self.pfile.read_text()
        self.pfile.write_text(text[: len(text) // 2])
        self.assertInvalid()

    def test_non_object(self):
        self.pfile.write_text("[1, 2]")
        self.assertInvalid()

    def test_missing_field(self):
        p = json.loads(self.pfile.read_text())
        del p["head"]
        self.pfile.write_text(json.dumps(p))
        self.assertInvalid()

    def test_wrong_type(self):
        p = json.loads(self.pfile.read_text())
        p["files"] = "a.txt"
        self.pfile.write_text(json.dumps(p))
        self.assertInvalid()

    def test_wrong_schema(self):
        p = json.loads(self.pfile.read_text())
        p["schema_version"] = 99
        self.pfile.write_text(json.dumps(p))
        self.assertInvalid()

    def test_run_id_mismatch(self):
        p = json.loads(self.pfile.read_text())
        p["run_id"] = "other"
        self.pfile.write_text(json.dumps(p))
        self.assertInvalid()

    def test_show_refuses_stale_and_invalid(self):
        (self.root / "a.txt").write_text("edited\n")
        s = self.tool("show", "--run-id", RUN)
        self.assertEqual(s.returncode, 1)
        self.assertIn("PACKET=STALE", s.stdout)
        self.assertNotIn('"task_id"', s.stdout)
        self.pfile.write_text("garbage")
        s = self.tool("show", "--run-id", RUN)
        self.assertEqual(s.returncode, 2)

    def test_refresh_after_change(self):
        (self.root / "a.txt").write_text("edited\n")
        r = self.tool("refresh", "--run-id", RUN)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(self.check().returncode, 0)
        self.assertEqual(json.loads(self.pfile.read_text())["task_id"], "T")

    def test_create_rejects_missing_file(self):
        r = self.tool("create", "--run-id", "R2", "--task-id", "T", "--contract",
                      "contract.yaml", "--file", "ghost.txt")
        self.assertEqual(r.returncode, 2)
        self.assertFalse((self.root / ".agent/runs/R2/context_packet.json").exists())

    def test_create_rejects_outside_root(self):
        outside = self.root.parent / "outside.txt"
        outside.write_text("x")
        self.addCleanup(outside.unlink)
        for f in ("../outside.txt", str(outside)):
            r = self.tool("create", "--run-id", "R2", "--task-id", "T",
                          "--contract", "contract.yaml", "--file", f)
            self.assertEqual(r.returncode, 2, f)
            self.assertIn("outside root", r.stderr)


if __name__ == "__main__":
    unittest.main()
