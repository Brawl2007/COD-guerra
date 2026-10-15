"""Offline tests: SessionStart never installs by surprise in Claude Code Cloud."""
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[2] / ".claude/hooks/session-start.sh"
GUARD_INSTALLER = Path(__file__).resolve().parents[2] / ".agent/tools/install-git-guards.sh"


class SessionStartTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "package-lock.json").write_text("{}\n")
        fake = self.root / "fake-bin"
        fake.mkdir()
        self.marker = self.root / "npm-calls.log"
        npm = fake / "npm"
        npm.write_text("#!/bin/sh\n"
                       "echo invoked >> \"$FAKE_NPM_CALLS\"\n"
                       "mkdir -p node_modules\n"
                       "exit 0\n")
        npm.chmod(0o755)
        self.env = dict(os.environ, CLAUDE_PROJECT_DIR=str(self.root),
                        FAKE_NPM_CALLS=str(self.marker),
                        PATH=str(fake) + os.pathsep + os.environ.get("PATH", ""))

    def call(self, remote="true", opt_in=None, guard_opt_in=None):
        env = dict(self.env, CLAUDE_CODE_REMOTE=remote)
        if opt_in is not None:
            env["COD_GUERRA_AUTOINSTALL_DEPS"] = opt_in
        else:
            env.pop("COD_GUERRA_AUTOINSTALL_DEPS", None)
        if guard_opt_in is not None:
            env["COD_GUERRA_INSTALL_GIT_GUARDS"] = guard_opt_in
        else:
            env.pop("COD_GUERRA_INSTALL_GIT_GUARDS", None)
        p = subprocess.run(["bash", str(SCRIPT)], cwd=self.root, env=env,
                           text=True, capture_output=True)
        self.assertEqual(p.returncode, 0, p.stderr)
        return p

    def test_cloud_diagnostic_is_read_only(self):
        self.call()
        self.assertFalse(self.marker.exists())
        self.assertFalse((self.root / "node_modules").exists())

    def test_explicit_disable_is_read_only(self):
        self.call(opt_in="0")
        self.assertFalse(self.marker.exists())

    def test_local_machine_never_auto_installs(self):
        self.call(remote="false", opt_in="1")
        self.assertFalse(self.marker.exists())

    def prepare_git_checkout(self):
        subprocess.run(["git", "init", "-q", "-b", "feature", str(self.root)],
                       check=True, capture_output=True)
        installer = self.root / ".agent" / "tools" / "install-git-guards.sh"
        installer.parent.mkdir(parents=True)
        shutil.copyfile(GUARD_INSTALLER, installer)
        return installer

    def test_guard_opt_in_works_without_npm(self):
        installer = self.prepare_git_checkout()
        self.call(guard_opt_in="1")
        checked = subprocess.run(["bash", str(installer), "--check"], cwd=self.root,
                                 capture_output=True, text=True)
        self.assertEqual(checked.returncode, 0, checked.stderr)
        self.assertFalse(self.marker.exists())
        # Re-entrant installation leaves the same Git guard in place.
        self.call(guard_opt_in="1")
        self.assertFalse(self.marker.exists())

    def test_local_session_never_auto_installs_guard(self):
        installer = self.prepare_git_checkout()
        self.call(remote="false", guard_opt_in="1")
        checked = subprocess.run(["bash", str(installer), "--check"], cwd=self.root,
                                 capture_output=True)
        self.assertNotEqual(checked.returncode, 0)

    def test_cloud_default_does_not_write_git_hooks(self):
        installer = self.prepare_git_checkout()
        self.call()
        checked = subprocess.run(["bash", str(installer), "--check"], cwd=self.root,
                                 capture_output=True)
        self.assertNotEqual(checked.returncode, 0)

    def test_opt_in_installs_once_per_lockfile(self):
        self.call(opt_in="1")
        self.assertEqual(self.marker.read_text().count("invoked"), 1)
        self.call(opt_in="1")
        self.assertEqual(self.marker.read_text().count("invoked"), 1)
        (self.root / "package-lock.json").write_text('{"lockfileVersion":3}\n')
        self.call(opt_in="1")
        self.assertEqual(self.marker.read_text().count("invoked"), 2)


if __name__ == "__main__":
    unittest.main()
