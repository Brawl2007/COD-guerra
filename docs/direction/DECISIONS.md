# Registo de decisões do Captain

Formato: data · decisão · razão · reversível? Decisões de produto/jogabilidade/[D] ficam como
**PENDENTE HUMANO** até aprovação explícita.

| # | Data | Decisão | Razão | Reversível |
|---|---|---|---|---|
| D1 | 2026-10-08 | O Captain (Claude Code) assume a coordenação técnica. ChatGPT/GPT Sol deixa de ser necessário para dirigir. | Instrução do utilizador | — |
| D2 | 2026-10-08 | Nenhuma implementação do M01 sobre `2645f3f` nem sobre a V7 por validar. A base de desenvolvimento nasce do HEAD da V7 que o utilizador fornecer como validado, mais a infra Capitão V3. | Instrução do utilizador; a V7 tem o CI integral em curso | Não |
| D3 | 2026-10-08 | `claude/captain-direction-v1` (V7 `7a5800e` + infra) só recebe documentação de planeamento. Ao criar a base, os commits de `docs/direction/` são reaplicados por cherry-pick. | Plano independente do resultado do CI | Sim |
| D4 | 2026-10-08 | Os dossiês M02–M30 (PR #58) são **referenciados, não copiados**. | Evitar duplicar 1,45 MB de proposta que pode ainda mudar no PR | Sim |
| D5 | 2026-10-08 | Não começar M02+ antes de o M01 estar em PRODUÇÃO. Os sistemas novos nascem em bancadas reutilizáveis. | Mandato: "não sacrificar a qualidade da M01" | Sim (decisão humana) |
| D6 | 2026-10-08 | A lane de simulação é sequencial: T03 → T02 → T22 → T05 → T47. O ckm (T47) vem depois de T22/T05. | Todas mexem em `m01-simulation.js`; T47 precisa de display rounds e de campos de áudio | Sim |
| D7 | 2026-10-08 | As oito alterações por commitar em `~/projetos/COD-guerra` ficam intocadas, embora 5/8 sejam idênticas à V7 e as outras pareçam superadas. | Instrução do utilizador. Descartá-las é ação destrutiva e exige decisão humana. | — |
| D8 | 2026-10-08 | Nenhuma worktree nova. Reutilizar esta, com checkout esparso. | Disco a 81 % (cerca de 1,3 GB livres) | Sim |
| D9 | 2026-10-08 | Browser integral só no CI do GitHub. Localmente: Node + browser focado, quando estritamente necessário. | Chromebook; SwiftShader lento; disco | Sim |
| D10 | 2026-10-09 | Base de desenvolvimento do M01: `claude/m01-dev-base` = V7 `4c6f7bebee27b68af3bea8ad086da1dffbca0084` (CI integral 84/84, run 37876099475) + infra Capitão V3 + Jev (cherry-pick -x). Resolve H1. | Instrução do utilizador após a certificação ("depois desenvolve M01") | Sim |
| D11 | 2026-10-09 | No Chromebook (aarch64, Node 24.21) o `npm test` dá 467/474 na base: 7 falhas conhecidas em `m01-animation-contract.test.js` (2 hashes golden por tick + 5 em cascata). O CI x86_64 dá 474/474 no mesmo código; `m01-schema2-determinism` (A/B na mesma máquina) passa localmente. Prova de gameplay das tarefas M01 = CI x86 da branch (um workflow por branch); localmente exige-se exatamente este conjunto de 7. | Divergência de vírgula flutuante entre arquiteturas (hipótese, não investigada) | Sim |
| D12 | 2026-10-09 | T19 `M01-PLAYER-SHOT-FEEDBACK-V1` ACEITE (`08d2e81`, CI 37890545910: Node 480/480, build, browser focado 1/1) e integrada por fast-forward em `claude/m01-dev-base`. | Ciclo implementer→verifier→reviewer completo | Sim |
| D13 | 2026-10-09 | O Chromebook deixa de ser plataforma-alvo do jogo. Não se sacrifica qualidade por ele. Anexo B14 levantado (segunda cascata de sombras em Média/Alta); T01 anulada; T44/T49 deixam de esperar por T01. A máquina continua a ser só a estação de desenvolvimento. | Instrução do utilizador | Sim (decisão humana) |
| D14 | 2026-10-09 | T16 `M01-LIGHTING-DAWN-V1` ACEITE (`3386fc2`, CI 37918399233: Node 490/490, build, browser focado 8/8). Sem vento em `map-layout.json` (porta de autoridade); constante `CLOUD_WIND`. Integração em `claude/m01-dev-base` aguarda autorização (merge bloqueado pelo classificador de permissões); a próxima tarefa empilha sobre esta branch. | Ciclo implementer→verifier→reviewer completo | Sim |
| D15 | 2026-10-09 | T17 `M01-STUKA-DIVE-SEQUENCE-V1` ACEITE (`4c64beb`, CI 37930134740: Node 502/502, build, browser focado 5/5). Caminho dos aviões em `src/world/m01-aircraft-path.js` declarado só de apresentação (a simulação não o importa); guarda de Doppler 500 m/s + salto de relógio 1 s (só áudio). Empilhada sobre T16; integração em `claude/m01-dev-base` continua a aguardar autorização. | Ciclo implementer→verifier→reviewer completo (1 correcção) | Sim |
## Pendentes de decisão humana

- ~~**H1**~~ Resolvido em 2026-10-09 (D10): V7 `4c6f7be`, CI integral 84/84.
- **H2** Adotar no trunk os PRs de documentação #58/#44/#56? Os três apontam para a `main`.
- **H3** O destino das oito alterações por commitar na worktree original (manter, arquivar num commit WIP na própria branch, ou descartar).
- **H4** Playtest humano (T52): só uma pessoa o pode fazer. (T01 anulada por D13.)
- **H5** Qualquer tarefa [D] da campanha (S1 flags de save, S2 relógio por segmentos, S8 bancadas de veículo).
