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

## Pendentes de decisão humana

- **H1** Que HEAD da V7 está validado (CI integral verde + relatório fechado)? Desbloqueia `BASE`.
- **H2** Adotar no trunk os PRs de documentação #58/#44/#56? Os três apontam para a `main`.
- **H3** O destino das oito alterações por commitar na worktree original (manter, arquivar num commit WIP na própria branch, ou descartar).
- **H4** Sessão no Chromebook de referência (T01) e playtest humano (T52): só uma pessoa os pode fazer.
- **H5** Qualquer tarefa [D] da campanha (S1 flags de save, S2 relógio por segmentos, S8 bancadas de veículo).
