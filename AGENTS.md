# COD Guerra

## Registo obrigatório antitrabalho duplicado (M01)

**Antes de planear, implementar, delegar ou criar uma branch para uma tarefa M01**, executar:
```bash
python3 .agent/tools/m01_task_registry.py list
python3 .agent/tools/m01_task_registry.py check TXX --live
```
TXX é o TASK_ID do roadmap. `check` deve consultar os PRs/branches atuais pelo GitHub CLI (`gh` autenticado). Se devolver `REUSE_OR_REVIEW_EXISTING`, continuar e integrar a entrega existente; `AUDIT_EXISTING_FIRST`, ler commits/testes; `EXISTING_REMOTE_WORK`, não duplicar; `LIVE_CHECK_REQUIRED`, verificar rede antes de programar. **Não iniciar nova implementação quando o estado/autoridade é incerto.**

Se e só se a tarefa estiver `UNKNOWN`, sem PR/branch existente e após confirmação de que a issue #72 não a atribui a outro agente, reservar atomicamente:
```bash
python3 .agent/tools/m01_task_registry.py claim TXX --sha "$(git rev-parse HEAD)"
```
A reserva cria exclusivamente `refs/heads/claims/m01-txx` no GitHub; se a criação falhar, outro agente pode ter reclamado a tarefa: não continuar nem fazer outra reserva. Registar owner e branch de desenvolvimento na issue #72 e criar PR de implementação. Não converter estados em `INTEGRATED` sem verificar commits, CI e destino; não tratar a presença na V7 ou no PR #76 como integração em `main`.

**Candidata única M01:** o PR #76 já foi integrado na main; em 2026-10-16 a candidata pós-#76 é o PR #80 (`claude/quirky-heisenberg-9l4m7b`). Antes de agir, revalidar o HEAD e qual PR a substituiu. O índice é conservador; Git/PR/CI recentes prevalecem.


Leia `DEVELOPMENT_STATUS.md`, `RUNBOOK.md`, `IMPLEMENTATION_PLAN.md` e o sistema afectado antes de editar.
A especificação completa é `docs/PROMPT_MESTRE.txt`; o índice do produto é `PROJECT_SPEC.md`.

- Node >=22.12; usar Node 24 no CI. `npm ci`, `npm test`, `npm run build`, `npm run test:browser`.
- Dev: `npm run dev`, URL `/COD-guerra/` na porta 5173. Produção: `npm run preview`, porta 4173.
- Gameplay: x/y em unidades legadas; 32 unidades = 1 m. Three.js: x/z no solo, y altura em metros.
- `Simulation` guarda somente dados. Renderer nunca decide dano, visibilidade, eventos ou estado da missão.
- Preservar a bancada antiga. A aldeia francesa é ficcional; nunca renomeá-la para Tczew.
- Testar alterações proporcionais ao comportamento. Teste de estado não é playtest. Não inventar FPS.
- Assets finais precisam de autoria/licença, escala e animações verificadas. Não extrair conteúdo de COD.
- Trabalhar em branch própria; abrir PR para main. Actualizar status e evidências antes de terminar.
- Trabalho simultâneo com Claude Code: pesquisa/mapa/roteiro de M01 em branch própria, evitando alterações concorrentes em engine/combate/build.
- Direção do Captain (estado verificado, plano das 30 missões, grafo de tarefas, decisões, handoff): `docs/direction/README.md`.


## Regra permanente — uma IA entrega, um jogo recebe

- As tarefas completas e validadas por Codex, Claude, Gemini ou outras IAs convergem para **uma única candidata jogável M01**. Nunca tratar PR isolado ou fatia parcial como tarefa concluída ou integrada; nunca repetir trabalho já feito.
- O agente que concluiu a tarefa **pode ser o integrador**, mas qualquer sessão pode assumir esse papel desde que tenha a **reserva exclusiva**. Somente **um integrador ativo** pode modificar a candidata, mesmo que a Routine Cloud inicie outros chats de hora em hora.
- **Migração inicial em 2026-10-16:** estado PAUSED enquanto o PR #84 não estiver validado e antigas sessões puderem editar a #80. É proibido adquirir a reserva ou escrever na candidata até verificar handoff dos antigos integradores e ativar o estado FREE em CAS.
- A reserva encontra-se no GitHub, na branch `coordination/m01-integration-state`, ficheiro `.agent/coordination/m01-integrator.json`; aquisição e libertação exigem atualização com SHA anterior (compare-and-swap). **Nunca assumir que uma reserva caducou apenas por passar uma hora.** Se estiver ocupada ou incerta, não modificar a candidata.
- Ler primeiro `docs/direction/M01_INTEGRATOR_LEASE.md` e executar o coordenador `python3 .agent/tools/m01_integration_lease.py status` / `queue` quando `gh` estiver autenticado. Sem `gh`, usar a mesma fonte via GitHub MCP `fetch_file` / `update_file`. Falha de rede ou conflito = **não integrar**.
- Um PR só pode entrar na fila quando cumprir **todos** os critérios de aceitação e testes aplicáveis, sem partes em aberto. O marcador READY é triagem, não certificado de CI. Confirmar dependências, autoria, proveniência e se código já está presente.
- **Routine anti-inatividade:** após verificar uma tarefa bloqueada, não terminar sem procurar trabalho independente seguro: retomar tarefa própria parcial, terminar outra fatia pendente, rever um CI falhado no HEAD atual, integrar READY se a reserva estiver FREE, ou assumir tarefa realmente livre. Respeitar reservas de outros agentes. Se todas as frentes estiverem ocupadas/bloqueadas, encerrar imediatamente com uma linha de bloqueio para poupar tokens. Consultar `docs/direction/M01_INTEGRATOR_LEASE.md`.
- Guardar handoff curto com TASK_ID, dono, branch, HEAD, testes e CI pendente. Se a sessão estiver ativa noutra branch, respeitar a reserva. Retomar trabalho existente antes de iniciar outro TASK_ID.
- Testes proporcionais durante o desenvolvimento, verificação obrigatória da candidata no SHA integrado antes de a declarar jogável. Sem force-push, atalhos em CI, regressões escondidas, merge em main ou deploy sem autorização explícita.
- Priorizar comandos/script e Sonnet; não iniciar Opus ou subagentes redundantes nem desperdiçar sessões com polling contínuo de CI. As autorizações financeiras existentes não obrigam a usar APIs pagas.
