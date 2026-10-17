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

**Integração única existente:** PR #76 (V2–V7) já está na `main` (6697956). A candidata única seguinte é a do topo de `docs/direction/M01_INTEGRATION_LEDGER.md` (PR #80). Não criar outra consolidação concorrente. O Capitão trabalha sobre ela quando for seguro, mantendo histórico, provas e proteções. A lista é índice conservador; Git/PR/CI recentes sempre prevalecem.


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

## Regra permanente: uma IA entrega, um jogo recebe (integração única)

Política do proprietário (2026-10-16); consolida e substitui a regra do PR #77 (integrar tarefas concluídas na versão jogável; bloquear promoção perante conflito, regressão, check vermelho ou incerteza; integração na candidata ≠ merge na `main` ≠ deploy). Vale para Claude, Codex, Gemini e qualquer outro agente.

- **Uma só candidata jogável da M01.** Depois do merge do #76 na `main`, a candidata é a branch indicada no topo de `docs/direction/M01_INTEGRATION_LEDGER.md`. Branches auxiliares convergem para ela; não abrir outra candidata nem um PR por cada pequena correção.
- **Ciclo para cada entrega de outra IA:**
  1. Identificar a origem.
  2. Consultar o ledger e o registo T00–T52.
  3. Provar pela ancestralidade Git se a entrega já está incluída (`git merge-base --is-ancestor`, `git log candidata..entrega`), nunca pela descrição nem pelo CI verde.
  4. Integrar só o que falta, com merge `--no-ff` que preserve commits e autoria.
  5. Correr primeiro os testes focados e, na candidata final, os obrigatórios.
  6. Atualizar a linha do ledger.
- **Estados no ledger:**
  - `CONCLUÍDA NA ORIGEM`
  - `INTEGRADA NA CANDIDATA`
  - `INTEGRADA SEM VALIDAÇÃO DE JOGO`
  - `PENDENTE`
  - `BLOQUEADA (motivo)`

  Um teste unitário verde não equivale a uma tarefa validada no jogo.
- **Não repetir nem sobrescrever** implementações aprovadas de outra IA. Nos conflitos, preservar o comportamento dos dois lados; não remover asserções nem criar timeouts artificiais. As tarefas bloqueadas ficam preservadas e identificadas.
- **Economia de tokens:**
  - Git, scripts e diffs primeiro; ler só os ficheiros necessários.
  - Haiku para leitura, Sonnet (esforço médio/alto) para implementação e integração normais, Opus só para conflitos complexos e arquitetura.
  - Um único agente por questão.
  - Não repetir auditorias nem suites completas no mesmo SHA.
  - Não reiniciar o CI por mudanças secundárias.
  - Não usar Fable, Jev ou APIs pagas sem nova autorização explícita.
- **Contexto:** no início de cada sessão, ler o ledger em vez de reconstruir a história. No fim, atualizar a linha com SHA, tarefa, origem, estado, testes e próxima ação.
- **Limites:** sem merge na `main`, deploy, force-push nem reset destrutivo sem autorização explícita do proprietário. A qualidade gráfica não fica limitada pelo Chromebook: arquitetura escalável com opções de qualidade.
- **Relatório de ciclo (curto):**
  - candidata (branch e SHA);
  - novas entregas; integradas antes; integradas agora;
  - bloqueadas e motivo;
  - testes executados; CI;
  - o que mudou no jogo; o que ficou intacto;
  - próxima ação.
