@AGENTS.md

**Antes de delegar qualquer TASK_ID da M01**, consultar a mesma fonte de tarefas `.agent/m01-task-registry.json` e executar `python3 .agent/tools/m01_task_registry.py check TXX --live`. Entregas existentes devem ser revistas/integradas, não recriadas. Para tarefa `UNKNOWN` e livre, exigir `claim TXX --sha "$(git rev-parse HEAD)"` antes de implementação, com confirmação atómica no GitHub. Em caso de erro de rede ou conflito, não duplicar. O PR #76 já foi integrado; a candidata atual é o PR #80 (verificar HEAD e issue #72 antes de agir). Não criar candidata paralela. Ver `AGENTS.md` e issue #72.

## M01 — execução Claude Code Web com Capitão único

A Routine antiga permanece pausada. Usar **uma única sessão Web principal Opus** com os subagentes existentes em `.claude/agents/`. Consultar `docs/direction/CLOUD_WEB_SINGLE_CAPTAIN.md`, `docs/direction/M01_AUTOPILOT.md` e a issue #72 antes de tarefas. Guardar os resultados em Git; não iniciar outro Capitão automaticamente. O integrador #84 permanece PAUSED até validação e ativação explícita. **Sem merge em main, deploy ou publicação de checkpoint sem autorização humana específica.**

## Claude Code neste repositório

- Arranque local opcional: `claude --agent captain` (Opus, esforço médio); no Web selecionar Opus e dar o prompt inicial documentado. Não ativar o Advisor por padrão.
  Guia, verificação local e correção do Advisor: `docs/direction/AGENT_SETUP.md`.
- O Capitão Opus coordena; Sonnet implementa, verifica e revê; Haiku lê código (`explorer`/`Explore`)
  e documentação (`researcher`). Opus `reviewer-critical` só para simulação, saves, integração e arquitetura.
- Não invocar Advisor/Fable por rotina: só quando o utilizador pedir e o custo for aceitável. Delegar leituras pesadas, não colar logs longos; compactar apenas quando útil.
- Jev: usar primeiro `jev_router.py`/`jev_decisions.py` em modo `--offline` (regras locais, sem chamadas pagas). Existe autorização histórica para chamadas TypeSafe, mas **nesta migração Cloud Web não ativar consultas pagas automaticamente**: exigir confirmação explícita, verificar credenciais/limites e registar utilização. Jev não é um compressor de tokens.

## Execucao Claude Code Web com Claude Max

- Na sessão Web única, confirmar branch, HEAD, agentes, skills e estado remoto antes de desenvolver.
- O Captain (Opus) coordena e delega; nao duplicar investigacao ou fazer toda a implementacao no modelo principal.
- Contexto minimo, testes deterministas e verificacao/revisao proporcionais ao risco.
- Não chamar consultores externos pagos por padrão. Qualquer exceção de autorização histórica deve ser revalidada antes de consumir créditos de APIs externas.
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
