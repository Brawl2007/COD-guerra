# Plano de implementação

Os critérios completos estão na secção 77 de `docs/PROMPT_MESTRE.txt`.

| Marco | Estado | Critério / dependência |
| --- | --- | --- |
| 0 — diagnóstico | Concluído | Checkout real inspeccionado; 11 testes originais passaram; falhas de tiro/IA/checkpoint documentadas. |
| 1 — fundação | Implementado; local e CI validados | Área actual jogável no build; Three.js/Vite, input/áudio, tiros 3D, fallback e snapshot; ver QUALITY_REPORT. CI da fundação passou; merge da engine separado. |
| 2 — M01/Tczew | Pendente | Pesquisa, geografia, 2º Batalhão, wz.29; abertura 04:30, ataque 04:34, engenheiros, retirada, skip, sectores e checkpoints. |
| 3 — M01 polida | Pendente | Humanos riggados, uniformes de 1939, vozes, ViewModel, animações, resgate e consequências; playtest e orçamento. |
| 4 — sistemas especiais | Pendente | Tanque M13, jeep M14, avião M05; sistema jogável e snapshot de cada um. |
| 5 — M02–M07 | Pendente | Cada missão integrada com pesquisa, mapa, roteiro, equipamento, transições e validação. |
| 6 — M08–M30 | Pendente | Lotes pequenos; continuidade de personagens, datas e save; não contar documentos como missões prontas. |
| 7 — revisão final | Pendente | Campanha completa jogada, historicidade, arte, áudio, performance e regressões. |

## Próxima integração

Os PRs #8 e #10 de pesquisa/mapa/roteiro/preparação estão integrados. M01 permanece PLANEJADA. Seguir `missions/m01-tczew/ENGINE_CONTRACT.md`: handlers explícitos, relógios, prontidão, snapshots reais e segurança. Respeitar `src/world/spatial.js` e `src/game/simulation.js`; M01 usa mapa novo em metros, sem herdar as coordenadas/arma da bancada. Não substituir o renderer nem criar outro loop de jogo.
