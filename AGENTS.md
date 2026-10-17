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

**Candidata atual:** PR #76 foi integrada em main. O PR #80 é a candidata M01 em desenvolvimento (draft); NÃO escrever nela enquanto o mecanismo exclusivo do PR #84 estiver PAUSED. Não criar candidata concorrente. A lista é índice conservador; Git/PR/CI recentes sempre prevalecem.


Leia os trechos relevantes de `DEVELOPMENT_STATUS.md`, `RUNBOOK.md`, `IMPLEMENTATION_PLAN.md` e o sistema afectado antes de editar. Não carregar documentação longa sem necessidade.
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
