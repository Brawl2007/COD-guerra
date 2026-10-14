import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

TOOL = Path(__file__).resolve().parents[1] / "tools" / "jogar.sh"
GOOD_PKG = '{"name": "t", "scripts": {"build": "echo build-ok", "preview": "echo preview-ok"}}\n'
BAD_PKG = '{"name": "t", "scripts": {"build": "exit 1", "preview": "echo preview-ok"}}\n'
GIT_ENV = dict(os.environ, GIT_AUTHOR_NAME="t", GIT_AUTHOR_EMAIL="t@t",
               GIT_COMMITTER_NAME="t", GIT_COMMITTER_EMAIL="t@t")


def git(*args, cwd):
    r = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, env=GIT_ENV)
    if r.returncode:
        raise RuntimeError(f"git {' '.join(args)}: {r.stderr}")
    return r.stdout.strip()


class JogarTest(unittest.TestCase):
    """Usa um remoto local temporário: não precisa de internet nem do jogo real."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        base = Path(self._tmp.name)
        self.origin = base / "origin.git"
        self.root = base / "root"
        self.jogo = base / "jogo"
        self.nm = base / "nm"
        git("init", "-q", "--bare", str(self.origin), cwd=base)
        git("init", "-q", "-b", "main", str(self.root), cwd=base)
        git("remote", "add", "origin", str(self.origin), cwd=self.root)
        (self.root / "README.md").write_text("v1\n")
        (self.root / "package.json").write_text(GOOD_PKG)
        git("add", ".", cwd=self.root)
        git("commit", "-q", "-m", "v1", cwd=self.root)
        git("push", "-q", "origin", "HEAD:refs/heads/feat", cwd=self.root)
        git("checkout", "-q", "-b", "feat-ruim", cwd=self.root)
        (self.root / "package.json").write_text(BAD_PKG)
        git("commit", "-qam", "build partido", cwd=self.root)
        git("push", "-q", "origin", "HEAD:refs/heads/feat-ruim", cwd=self.root)
        git("checkout", "-q", "main", cwd=self.root)
        self.commit = git("rev-parse", "--short", "origin/feat", cwd=self.root)

    def run_tool(self, *args):
        env = dict(os.environ, JOGAR_DIR=str(self.jogo), JOGAR_NODE_MODULES=str(self.nm))
        return subprocess.run(["bash", str(TOOL), *args], cwd=self.root, env=env,
                              capture_output=True, text=True)

    def test_usage_without_arguments(self):
        r = self.run_tool()
        self.assertEqual(r.returncode, 2)
        self.assertIn("Uso:", r.stderr)

    def test_unknown_ref_is_rejected_before_touching_the_game_folder(self):
        r = self.run_tool("nao-existe")
        self.assertEqual(r.returncode, 1)
        self.assertIn("Não encontro", r.stderr)
        self.assertFalse(self.jogo.exists())

    def test_creates_detached_game_folder_and_stops_without_dependencies(self):
        r = self.run_tool("feat")
        self.assertEqual(r.returncode, 1)
        self.assertIn("Sem dependências instaladas", r.stderr)
        self.assertEqual((self.jogo / "README.md").read_text(), "v1\n")
        self.assertEqual(git("rev-parse", "--short", "HEAD", cwd=self.jogo), self.commit)
        self.assertFalse(os.path.lexists(self.jogo / "node_modules"))

    def test_links_dependencies_builds_and_reports_the_commit(self):
        self.nm.mkdir()
        r = self.run_tool("feat", "--build-only")
        self.assertEqual(r.returncode, 0, r.stderr + r.stdout)
        link = self.jogo / "node_modules"
        self.assertTrue(link.is_symlink())
        self.assertEqual(link.resolve(), self.nm.resolve())
        self.assertIn("Build pronto", r.stdout)
        self.assertIn(f"commit {self.commit}", r.stdout)

    def test_reports_failed_build_with_a_hint(self):
        self.nm.mkdir()
        r = self.run_tool("feat-ruim", "--build-only")
        self.assertEqual(r.returncode, 1)
        self.assertIn("O build falhou", r.stderr)

    def test_refuses_to_touch_a_game_folder_with_changes(self):
        self.assertEqual(self.run_tool("feat").returncode, 1)  # cria a pasta de jogo
        (self.jogo / "sujo.txt").write_text("x")
        r = self.run_tool("feat")
        self.assertEqual(r.returncode, 1)
        self.assertIn("tem alterações", r.stderr)
        self.assertTrue((self.jogo / "sujo.txt").exists())

    def test_refuses_a_folder_that_is_not_this_repositorys_worktree(self):
        self.jogo.mkdir()
        (self.jogo / "outro.txt").write_text("x")
        r = self.run_tool("feat")
        self.assertEqual(r.returncode, 1)
        self.assertIn("não é uma pasta de jogo", r.stderr)
        self.assertTrue((self.jogo / "outro.txt").exists())

    def test_removes_a_broken_dependency_link_left_by_an_old_run(self):
        self.assertEqual(self.run_tool("feat").returncode, 1)  # cria a pasta sem dependências
        os.symlink(self.nm, self.jogo / "node_modules")  # aponta para uma pasta que não existe
        r = self.run_tool("feat")
        self.assertEqual(r.returncode, 1)
        self.assertIn("Sem dependências instaladas", r.stderr)
        self.assertFalse(os.path.lexists(self.jogo / "node_modules"))


if __name__ == "__main__":
    unittest.main()
