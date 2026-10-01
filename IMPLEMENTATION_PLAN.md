# Plano de implementação

Os critérios completos estão na secção 77 de `docs/PROMPT_MESTRE.txt`.

| Marco | Estado | Critério / dependência |
| --- | --- | --- |
| 0 — diagnóstico | Concluído | Checkout real inspeccionado; 11 testes originais passaram; falhas de tiro/IA/checkpoint documentadas. |
| 1 — fundação | Implementado; local e CI validados | Área actual jogável no build; Three.js/Vite, input/áudio, tiros 3D, fallback e snapshot; ver QUALITY_REPORT. CI da fundação passou; merge da engine separado. |
| 2 — M01/Tczew | Protótipo jogável; aprovação pendente | Fluxo integral na simulação e partida contínua no navegador por piloto automático (menu→debrief, 12/12, sem bloqueios), com cinco correcções de navegação, orientação, ritmo, resgate e retardatários. Ameaça legível nas tarefas de cobertura: fogo alemão com origem visível, supressão real do reparo e baixas da retirada que dependem do fogo do jogador. Playtest humano, encenação e Chromebook pendentes. |
| 3 — M01 polida | Pendente | Humanos riggados, uniformes de 1939, vozes, ViewModel, animações, resgate e consequências; playtest e orçamento. |
| 4 — sistemas especiais | Pendente | Tanque M13, jeep M14, avião M05; sistema jogável e snapshot de cada um. |
| 5 — M02–M07 | Pendente | Cada missão integrada com pesquisa, mapa, roteiro, equipamento, transições e validação. |
| 6 — M08–M30 | Pendente | Lotes pequenos; continuidade de personagens, datas e save; não contar documentos como missões prontas. |
| 7 — revisão final | Pendente | Campanha completa jogada, historicidade, arte, áudio, performance e regressões. |

## Próxima integração

Os PRs #8 e #10 estão integrados; esta branch reúne a fundação do PR #9, as pontes do PR #11 e o runtime de M01. `M01Simulation`, `TczewWorld`, `Wz29` e `M01View` usam o mesmo `Game` e loop. A partida contínua anterior está verificada (`docs/verification/m01-runtime/continuous/`). O fogo de cobertura tem comparação com/sem apoio na simulação (várias sementes), verificações por trechos e duas partidas contínuas `--cover help/ignore` no navegador (`docs/verification/m01-runtime/continuous/round3/`). Fazer playtest humano, seguido de feridos/encenação e orçamento. Não contar snapshots de teste como playtest integral nem iniciar M02 antes da aprovação do marco 2.
