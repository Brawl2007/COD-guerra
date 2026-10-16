@AGENTS.md

**Antes de delegar qualquer TASK_ID da M01**, consultar a mesma fonte de tarefas `.agent/m01-task-registry.json` e executar `python3 .agent/tools/m01_task_registry.py check TXX --live`. Entregas existentes devem ser revistas/integradas, não recriadas. Para tarefa `UNKNOWN` e livre, exigir `claim TXX --sha "$(git rev-parse HEAD)"` antes de implementação, com confirmação atómica no GitHub. Em caso de erro de rede ou conflito, não duplicar. O PR #76 já foi integrado na main. A candidata pós-#76 era o PR #80 em 2026-10-16; revalidar a candidata atual pelo GitHub. Nunca criar outra candidata paralela. Ver `AGENTS.md` e issue #72.


## Regra obrigatória da Routine horária — um integrador

Ler `docs/direction/M01_INTEGRATOR_LEASE.md`. As sessões Cloud podem sobrepor-se: antes de iniciar qualquer integração, consultar o estado remoto em `coordination/m01-integration-state:.agent/coordination/m01-integrator.json`. Se estiver HELD por outra sessão, **não tocar na candidata**, mesmo após uma hora; encerrar ou continuar uma tarefa comprovadamente independente.

**IMPORTANTE:** o estado de coordenação está PAUSED durante a migração da rotina antiga. Não o tornar FREE sem confirmação verificável de que não há sessões anteriores a modificar #80, e sem revisão do PR #84. A idade de uma sessão não prova inatividade.

Qualquer chat que concluiu uma tarefa integralmente validada pode adquirir a reserva de integrador e colocá-la na fila/candidata. Apenas o detentor da reserva pode atualizar a candidata. Usar o SHA do blob anterior via GitHub Contents API (ou o script `.agent/tools/m01_integration_lease.py`, se gh autenticado); falha do CAS ou identidade incerta exige parar. Antes de cada push, confirmar propriedade e HEAD da candidata. Após o push, atualizar SHA monitorizada, publicar handoff e libertar reserva quando seguro.

Tarefas parciais não entram em READY nem na candidata como concluídas. Não aguardar CI a consumir Opus; handoff com HEAD/checks e retoma posterior. CI vermelho impede promoção. O marcador READY não substitui auditoria. Não alterar main/deploy sem autorização.

## Protocolo anti-inatividade da Routine

Não desperdiçar cada execução de uma hora com «aguardar agente», «aguardar CI» ou verificar um único TASK_ID e parar. Depois de um bloqueio, consultar o handoff/issue #72 e executar a próxima ação segura e independente, por ordem: retomar tarefa própria, concluir fatia inacabada, corrigir CI focalizado, integrar entrega READY (somente com lock FREE adquirido), ou reservar tarefa nova verdadeiramente livre. Não mexer em trabalho de outras sessões. Se nenhuma ação for segura, terminar rapidamente com bloqueio exato, poupando tokens. Nunca criar mudanças fictícias apenas para parecer ativo. Ver `docs/direction/M01_INTEGRATOR_LEASE.md`.

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
