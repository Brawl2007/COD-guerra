# Cloud checkpoints — COD-guerra

A new Claude Code cloud Routine can start with a fresh filesystem. Local
.agent/runs/ data is NOT durable between machines. A dedicated, separate Git
branch (cod-guerra/cloud-state) stores only small task handoffs pointing to
work branches and exact commits. Real truth still comes from Git, tests and
evidence attached to those commits.

## Safety
- list/get are read-only operations at the remote (they may fetch locally).
- publish alone pushes a new control-branch commit. The first push requires
  explicit --init; it is never performed by the setup PR or by CI.
- Never merge the control branch to main, force-push it, or include secrets,
  transcripts, credentials, user data or full execution logs in checkpoints.
- Checkpoints are not complete Task Graph state. The git-backed record alone
  never authorizes replay of commits, pushes, merge, deploy or irreversible work.
- get returns resume_allowed only for PENDING status and an unchanged pushed
  work_head and read_only/idempotent class. RUNNING/BLOCKED/ACCEPTED are held
  for manual review; a changed work HEAD blocks automatic continuation.
- Concurrency: Git rejects non-fast-forward writes. On a conflict, re-read and
  reconcile; do not force-push. This is NOT a parallel task scheduler.
- Claude Code Cloud permissions to push this dedicated state ref and invoke
  subagents remain to be tested after initial rollout.

## How to use

Run from a task checkout with a Git remote named origin:

    python3 .agent/tools/cloud_checkpoint.py list
    python3 .agent/tools/cloud_checkpoint.py get --task-id M01-TASK-1

After the task's branch has been committed and pushed, write a JSON file:

    {
      "schema_version": 1,
      "task_id": "M01-TASK-1",
      "work_branch": "feature/m01-task-1",
      "work_head": "0123456789abcdef0123456789abcdef01234567",
      "status": "PENDING",
      "operation": "read_only",
      "next_action": "Verify the branch HEAD and inspect referenced handoff",
      "evidence": ["commit:0123456789abcdef0123456789abcdef01234567"]
    }

The shown work_head is a PLACEHOLDER. Replace it with the actual full SHA
from the pushed feature branch. First-time setup (after approval):

    python3 .agent/tools/cloud_checkpoint.py publish --input /tmp/checkpoint.json --init

Before publishing, check the file read-only (same checks as publish, never
writes or pushes; reports `requires_init`):

    python3 .agent/tools/cloud_checkpoint.py validate --input /tmp/checkpoint.json

Later updates:

    python3 .agent/tools/cloud_checkpoint.py publish --input /tmp/checkpoint.json

Do not run publish from the first, read-only diagnostic Routine.

## Offline verification

    python3 -m unittest discover -s .agent/tests -p 'test_*.py' -v

The workflow agentic-python-tests.yml runs the tests without paid model
calls. Green offline tests alone do not prove live Claude Code cloud
capability, runtime permissions, or that Routine scheduling is continuous.

## Integracao com Captain

`.claude/agents/captain.md` e as skills autonomous-task e structured-handoff agora orientam consulta `list/get` no inicio e handoff verificavel no fim de cada Routine. Nao ha publicacao automatica. O comando `publish` permanece desativado nas instrucoes cloud ate aprovacao explicita para uso e teste real de permissoes de escrita. Um indice nao restaura Task Graph, nao prova execucao completa e nao garante paralelismo.

## Diagnostico e dependencias

O Hook SessionStart em `.claude/hooks/session-start.sh` nao instala nada no
primeiro arranque da cloud. A instalacao `npm ci` so ocorre quando
`CLAUDE_CODE_REMOTE=true` e `COD_GUERRA_AUTOINSTALL_DEPS=1`.
Assim e possivel executar diagnosticos read-only sem efeitos de npm. Se for
necessario testar o jogo numa Routine futura, configurar conscientemente esse
opt-in; os testes no GitHub Actions fazem `npm ci` na sua maquina isolada.

O workflow `.github/workflows/agentic-python-tests.yml` verifica PRs de
agentes e pushes para as branches `chore/claude-cloud-agent-sync-*`.
Nao executa agentes Claude ou chamadas Jev pagas. O workflow do jogo em
`.github/workflows/pages.yml` pode ser validado separadamente; nao publicar
nada em PRs.
