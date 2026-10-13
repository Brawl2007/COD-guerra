@AGENTS.md

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
