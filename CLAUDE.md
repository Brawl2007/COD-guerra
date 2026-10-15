@AGENTS.md

**Antes de delegar qualquer TASK_ID da M01**, consultar a mesma fonte de tarefas `.agent/m01-task-registry.json` e executar `python3 .agent/tools/m01_task_registry.py check TXX --live`. Entregas existentes devem ser revistas/integradas, não recriadas. Para tarefa `UNKNOWN` e livre, exigir `claim TXX --sha "$(git rev-parse HEAD)"` antes de implementação, com confirmação atómica no GitHub. Em caso de erro de rede ou conflito, não duplicar. O **PR #76** já contém a candidata principal V2–V7; não criar outra candidata paralela. Ver `AGENTS.md` e issue #72.

## Missão permanente da Routine Cloud — M01 completa

Na sessão principal do Capitão Opus, o objetivo contínuo é **terminar toda a M01 Tczew**, não esperar que o utilizador forneça uma tarefa a cada execução horária. Ler `docs/direction/M01_AUTOPILOT.md` e https://github.com/Brawl2007/COD-guerra/issues/72; verificar estado Git/PR/CI atual, retomar trabalho próprio e escolher novos subpassos internos quando necessário. PRs pendentes não autorizam duplicação nem paralisação de toda a missão. **Sem merge/deploy/publicação de checkpoint sem autorização humana específica.**

## Claude Code neste repositório

- Arranque recomendado: `claude --agent captain` (Opus 5.5, esforço alto) com `/advisor fable`.
  Guia, verificação local e correção do Advisor: `docs/direction/AGENT_SETUP.md`.
- Opus planeia e decide; Sonnet implementa, verifica e revê; Haiku lê código (`explorer`/`Explore`)
  e documentação (`researcher`). Opus `reviewer-critical` só para simulação, saves, integração e arquitetura.
- Advisor (Fable 5.1): consultar antes de fixar um plano grande, quando o mesmo erro aparece duas vezes
  e antes de declarar concluída uma tarefa longa. Fora disso, não chamar.
- O Advisor lê a transcrição inteira: manter o contexto pequeno. Delegar leituras pesadas, não colar logs
  longos, usar `/compact` antes de decisões importantes.
- Jev: chamadas pagas via TypeSafe sem limite de quantidade/gastos, autorizadas expressamente em 2026-10-13. Manter registo de utilizacao e segurança; nao autorizar custos de outros fornecedores, planos ou assets.

## Execucao cloud com Claude Max 5x

- Nas Routines, confirmar a branch, HEAD e a disponibilidade dos agentes e skills antes de desenvolver.
- O Captain (Opus) coordena e delega; nao duplicar investigacao ou fazer toda a implementacao no modelo principal.
- Contexto minimo, testes deterministas e verificacao/revisao proporcionais ao risco.
- Excecao: Jev pago autorizado sem teto de gastos. Fable pago, outras APIs e despesas adicionais exigem autorizacao especifica.
- O filesystem remoto nao e o Chromebook. Nao assumir ~/.claude, memoria, caches ou runs locais na cloud.
- .agent/runs/ e estado efemero. A continuidade entre execucoes exige handoffs duraveis e referencia a commits/branches reais.
- Nunca editar/push diretamente main, dar merge ou fazer deploy automatico durante a sincronizacao inicial.

### Continuidade cloud com checkpoints

- O Captain consulta `python3 .agent/tools/cloud_checkpoint.py list` e, com TASK_ID conhecido, `get --task-id <TASK_ID>` antes de iniciar um novo RUN_ID na cloud.
- Checkpoints sao indices de HEAD/branch, nao restauracao de Task Graph; revalidar codigo, testes e contratos.
- Diagnostico inicial somente leitura: `publish`/`--init` requerem autorizacao separada e permissoes cloud verificadas.
- Nunca repetir push, commit, merge ou deploy baseado apenas num checkpoint. Sem escrita em main.
- Instrucoes: `.agent/cloud-state/README.md`.

### Hooks cloud sem efeitos laterais no diagnostico

- O `SessionStart` e read-only por padrao; nao instala pacotes.
- Para uma futura sessao de desenvolvimento com Node, pode-se definir
  `COD_GUERRA_AUTOINSTALL_DEPS=1` conscientemente; so age em ambiente cloud.
- CI do sistema agentic valida testes Python e scripts no PR e pushes da branch
  de preparacao. Nenhum workflow usa Claude nem Jev pago.
