# Plano de implementação

Continuação Codex: PR draft #92 sobre #91 `afaded9`, código `0261829` + `b197f03`; correções P0/P1 e a fatia de nível da D5 implementadas na origem, Node 1482/1482, build/bundle PASS e browser 14/15 + correção 1/1; percurso contínuo Soldado PASS 12/12, sem mortes/erros (Low 640×360; não é playtest humano), sem promoção de contagens históricas ou integração na #80. [Handoff](docs/verification/m01-runtime/continuity-p0/HANDOFF.md). D2 já integrada na #91, D3/D4/SP-08 e revisão humana pendentes.

## Onze tarefas parciais aceites — 2026-10-16

O lote `M01-PARTIALS-COMPLETION-INTEGRATION-V1` fecha T02/T03/T05/T06/T07/T14/T24/T26/T34/T36/T41. Fonte aceite `e377a0739906507dee63cd4006a3428efd22c56b`, branch `codex/m01-partials-browser-sampling-repair-v1`; produção idêntica à certificada `9a679c50`. Verificador independente PASS e revisão crítica ACCEPT; provas, limites e histórico no `docs/verification/m01-runtime/partials-completion-integration-v1/HANDOFF.md`. Node874/874, tooling173, build,24rotas causais,24futuros ON/OFF,299ficheiros protegidos, controlos integrais das pontes0 e44regressões acopladas passaram. A captura Stuka foi corrigida e validada separadamente; os runs anteriores42/44 e13/14 continuam FAIL, sem alegar uma execução integral44/44. O handoff contém a execução final e os resultados exatos da correção.

**37 tarefas principais confirmadas;15 por fechar**, incluindo T53. T21/PR65 e T50/PR66 são candidatos existentes fora deste lote. M01 continua PROTÓTIPO JOGÁVEL; playtest humano e performance no PC-alvo pendentes. As variâncias T24-CAMERA-01 e T36-EXPOSURE-01 e os FAIL históricos permanecem explícitos; main não é modificada.

O conteúdo abaixo é histórico e conserva o estado da respetiva data.

Os critérios completos estão na secção 77 de `docs/PROMPT_MESTRE.txt`.

| Marco | Estado | Critério / dependência |
| --- | --- | --- |
| 0 — diagnóstico | Concluído | Checkout real inspeccionado; 11 testes originais passaram; falhas de tiro/IA/checkpoint documentadas. |
| 1 — fundação | Implementado; local e CI validados | Área actual jogável no build; Three.js/Vite, input/áudio, tiros 3D, fallback e snapshot; ver QUALITY_REPORT. CI da fundação passou; merge da engine separado. |
| 2 — M01/Tczew | Protótipo jogável; aprovação pendente | Fluxo integral na simulação e partida contínua no navegador por piloto automático (menu→debrief, 12/12, sem bloqueios), com cinco correcções de navegação, orientação, ritmo, resgate e retardatários. Ameaça legível nas tarefas de cobertura: fogo alemão com origem visível, supressão real do reparo e baixas da retirada que dependem do fogo do jogador. Playtest humano, encenação e Chromebook pendentes. |
| 3 — M01 polida | Parcial | Soldados/primeira pessoa com rig, 25 clips e LODs integrados, armas de Kowal/Bąk e arrasto de S3; falta revisão artística/histórica, vozes, equipamento dos proxies, encenação, playtest e orçamento. |
| 4 — sistemas especiais | Pendente | Tanque M13, jeep M14, avião M05; sistema jogável e snapshot de cada um. |
| 5 — M02–M07 | Pendente | Cada missão integrada com pesquisa, mapa, roteiro, equipamento, transições e validação. |
| 6 — M08–M30 | Pendente | Lotes pequenos; continuidade de personagens, datas e save; não contar documentos como missões prontas. |
| 7 — revisão final | Pendente | Campanha completa jogada, historicidade, arte, áudio, performance e regressões. |

## Próxima integração

Os PRs #8 e #10 estão integrados; esta branch reúne a fundação do PR #9, as pontes do PR #11 e o runtime de M01. `M01Simulation`, `TczewWorld`, `Wz29` e `M01View` usam o mesmo `Game` e loop. A partida contínua anterior está verificada (`docs/verification/m01-runtime/continuous/`). O fogo de cobertura tem comparação com/sem apoio na simulação (várias sementes), verificações por trechos e duas partidas contínuas `--cover help/ignore` no navegador (`docs/verification/m01-runtime/continuous/round3/`). Fazer playtest humano, seguido de feridos/encenação e orçamento. Não contar snapshots de teste como playtest integral nem iniciar M02 antes da aprovação do marco 2.

A revisão visual fornece materiais originais, nuvens, partículas suaves e detalhes de cenário (`docs/verification/m01-runtime/visual-sprint/`). Os modelos preparados pelo Claude estão agora ligados com rigs, rostos, mãos, recarga, transporte e LODs (`docs/verification/m01-runtime/characters/`). Não aprova o marco 3: ainda faltam revisão de arte/uniformes, vozes, equipamento dos proxies, composição, encenação e performance medida.
