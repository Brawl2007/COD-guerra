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


## Claude Web — Workflow V2 (infraestrutura, ativação controlada)

Na branch de migração infra/claude-web-single-captain-v1, consultar docs/direction/CLOUD_WEB_WORKFLOW_V2.md e usar python3 .agent/tools/cloud_web_workflow.py plan para gerar um despacho determinístico e offline. O script não inicia agentes; o Capitão Opus único deve delegar na sessão Claude Code Web, começando por um único haiku-low SOMENTE leitura. No modo autorizado de edição, a sequência é scan Haiku -> edit Sonnet -> verify Sonnet independente -> review Sonnet independente. Nunca executar fases em paralelo sem autorização e isolamento comprovado. O Jev roda exclusivamente com offline=True, sem TypeSafe; não instalar RTK automaticamente. Fazer a medição real no UI, nunca inventar poupanças. A verificação posterior é python3 .agent/tools/cloud_web_workflow.py verify --report <relatorio.json>. Durante a migração não iniciar M01, não alterar main, PR #80, PR #84 nem fazer deploy. O #84 permanece PAUSED.

## Ponytail 5 — piloto limitado na infraestrutura

Skill original MIT em `.claude/skills/ponytail/SKILL.md`; protocolo: `docs/direction/PONYTAIL_PILOT.md`. Ativar **apenas** quando o plano de infraestrutura contiver `--ponytail` e o Task Contract permitir `PONYTAIL_PILOT=full`, somente dentro do agente Sonnet `implementer`. Sem plugin global, sem hooks Ponytail, sem segundo Capitão e sem M01 nesta migração. Compara com execução baseline sem a flag; aceitação depende da qualidade integral e dos testes, não do número de linhas. Caso contrário, Ponytail OFF.

## Jev TypeSafe — até US$5 em decisões úteis (autorização 2026-10-17)

O utilizador autorizou usar todo o saldo referido de US$5 **quando houver benefício concreto e sem atrapalhar o trabalho do Claude**. Não gastar para consumir saldo. Ver `docs/direction/JEV_ONLINE_PILOT.md`. O único Capitão Opus pode consultar o Jev real **uma decisão ambígua de cada vez**, pela interface `python3 .agent/tools/jev_web_paid_pilot.py --online`, nas capacidades priority, bug, branch, risk, verify e cost. Primeiro confirmar que o proxy cobra a conta TypeSafe esperada. Não há teto arbitrário de 20 chamadas; existe uma **guarda estimada de US$5 por ledger de VM**, que NÃO substitui limites reais de faturação/prepago do fornecedor entre sessões. O wrapper requer branch de infraestrutura limpa e aplica `COD_JEV_WEB_PAID_APPROVED=1` apenas à chamada; despachante V2, preflight e CI permanecem offline. Jev aconselha, não programa, não elimina testes e não autoriza merge/deploy. Reutilizar decisões existentes, evitar chamadas óbvias, redundantes ou repetidas. Não instalar ferramentas, não enviar segredos, não usar outras APIs pagas, não iniciar M01, não alterar main, PR #80/#84 nem fazer deploy. Medir utilização real e parar perante dúvida/falha.
