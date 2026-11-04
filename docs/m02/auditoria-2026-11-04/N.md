# Auditoria M02 — secção N «Plano do vertical slice» (PDF pp. 47–49)

Fonte: `docs/m02/preproducao/M02-BZURA-PRE-PRODUCAO.pdf`, pp. 47–49 (N1–N6).
Implementação: checkout `03387a3` (linha da M01), lido por `grep`/`sed`; repo de código não editado.
Caminhos relativos à raiz; «layout» = `missions/m02-bzura/m02-01-quinta-layout.json`; «sim» = `src/game/m02-01-simulation.js`; «rend» = `src/render/m02-01-renderer.js`; «main» = `src/m02/m02-01-main.js`; «spec» = `tests/browser/m02-01-quinta.spec.js`.
Contagem: IMPLEMENTADO 9 · PARCIAL 11 · AUSENTE 7 · CONTRADIZ 3 · NÃO VERIFICÁVEL 2 (32 linhas).

| # | Requisito / afirmação de N | Estado | Evidência (ficheiro:linha / pesquisa) |
|---|---|---|---|
| 1 | N1: slice 100×150 m, A = X -50…50, Z -90…60 | IMPLEMENTADO | `tests/m02-01-quinta-geometry-ballistics.test.js:33` («100x150m envelope»); layout `layout.bounds.playable` (ver E.md) |
| 2 | N1: inclui B01, B02, B03, B04 com bounds | IMPLEMENTADO | geometry test `:53–54` (B03 [20,38,0,12], B04 [-37,-29,20,26]); layout `:166,215,259,294` |
| 3 | N1: duas rotas, vala, pomar, pátio | IMPLEMENTADO | geometry test `:72` (Rota A vala), `:117` (Rota B pomar, troca de rota `:137`) |
| 4 | N1: som, luz, vegetação, horizonte 360° | PARCIAL | luz: 5 presets em rend `:39–99`; horizonte: `src/world/m02-horizon-system.js`; sem prova 360° (ver 27); vegetação/som sem teste dedicado (`grep -n "vegeta" tests/m02-*` não usado como prova) |
| 5 | N1: "não é fachada bonita com resto vazio" | NÃO VERIFICÁVEL | critério de revisão humana; sem playtest/revisão registados |
| 6 | N1: slice deriva de C03, "breve entrada própria" | PARCIAL | entrada `SN1 (0,-80)` em main `:5`; ligação a C03 só indireta (`startAreaAFullC01` em handoff:46 usa P1 (0,-175), não o slice) |
| 7 | N1: EA0 fora; dez defensores EA1 | CONTRADIZ | layout tem 14 defensores `DE-A01…DE-A14` (grep `"id": "DE-A` = 14 ids únicos), incluindo posto EA0; N pede 10 |
| 8 | N1: secção próxima + dois auxiliares (D) | PARCIAL | 5 aliados `pl_gruca/lis/wierzba/malek/szymczak` (layout `:354–406`); N pede secção + 2 auxiliares, não verificada a divisão |
| 9 | N2: partida (0,-80); MG audível/visível na abertura a oeste de B02, ~51 m | PARCIAL | partida (0,-80) main `:5`; MG `DE-A05` em sim `:53,671`; distância ~51 m não medida em teste (`grep -n "51" tests/m02-0*` sem hit relevante) |
| 10 | N2: escolha 45–75 s, aliados avançam/disparam autonomamente | IMPLEMENTADO | `tests/m02-02-combat-squad-ai.test.js:34` (aliados gastam munição real e disparam rajadas); ordens `suppress/advance/flank_east` sim `:555` |
| 11 | N2: cobertura muda exposição | IMPLEMENTADO | spec `:44–46` (vala: `player.y < -0.85`, `mgState.canHitPlayer === false`) |
| 12 | N2: interiores completos, LoS e bala respeitam janelas/portas | PARCIAL | B01: porta fechada bloqueia, aberta acerta (spec `:49–70`; geometry test `:231–236` janela); B02/B03/B04 sem teste de bala por vão (grep `B03\|B04` em tests só bounds e corredor B03) |
| 13 | N2: consolidação, objetivo por estado, roster finito, baixas reais | IMPLEMENTADO | `tests/m02-02-combat-squad-ai.test.js:136–147` (7 neutralizados → rendição, checkpoint `cp_m02_b_acesso`); sim `:1231–1238` |
| 14 | N2: consequência pomar/água e checkpoint; persistem dano, ferido, porta/cerca, marca | PARCIAL | `snapshot()` sim `:1366–1399` guarda portas `:1387`, cercas `:1389`, aliados, inimigos; «marca realizada» sem campo/teste identificado |
| 15 | N2: se o jogador acaba mais depressa, sem espera | NÃO VERIFICÁVEL | sem teste de ritmo; não há playtest registado |
| 16 | N2: distâncias/tempo até contacto medidos por logs/captura futura | PARCIAL | telemetria só de renderer (rend `:1162–1172` p50/p95/p99, spec `:243–255`); não há log de combate com distâncias de tiro nem tempo até contacto |
| 17 | N3-N0: bancada geométrica (piso, paredes, vãos, colisor, rotas, NPCs de prova, tiro, telemetria) | IMPLEMENTADO | `m02-01.html`, `tests/m02-01-quinta-geometry-ballistics.test.js`, `tools/m02/run-m02-01.mjs`; N0 = M02-01 |
| 18 | N3-N0: «não chamar ao blockout vertical slice concluído» | PARCIAL | `docs/m02/M02_HANDOFF.md` descreve a bancada; confirmar que nenhum texto de ecrã/handoff declara «slice concluído» (não pesquisado exaustivamente) |
| 19 | N3-N1: dez inimigos finitos | CONTRADIZ | ver 7 (14 no dado) |
| 20 | N3-N1: supressão/munição, mudança de cobertura | IMPLEMENTADO | `suppressionAdd` combat-ai `:13–65`; sim `:870–880`; fallback de cobertura combat-ai `:955–956` |
| 21 | N3-N1: rendição/retirada | IMPLEMENTADO | combat-ai `:921–929` (`enemy_surrendered`); teste `m02-02…:136–145` |
| 22 | N3-N1: porta e cerca com estado real | IMPLEMENTADO | sim `:198–202`; fence `breached` por granada `tests/m02-02…:188–191` |
| 23 | N3-N1: jogador escolhe ambos os percursos; inimigos não surgem atrás | PARCIAL | ambos os percursos testados (geometry `:72,117`); ausência de spawn/inimigos atrás não tem teste (`grep -n "spawn" tests/m02-0[12]*` sem asserção do tipo) |
| 24 | N3-N1: gate bloqueia polimento se combate/colisão falham | NÃO VERIFICÁVEL | gate processual; sem registo de decisão de gate |
| 25 | N3-N2: arte final dos 4 edifícios, terreno G, luz/áudio L, horizonte H aprovado | AUSENTE | não há assets finais nem aprovação de referências visuais; `docs/m02/M02_HANDOFF.md` descreve bancada procedural |
| 26 | N3-N2: ≥ um material parede, madeira e vidro provado nos tiros; dano nos LODs | PARCIAL | madeira (cerca), vidro (granada) em `tests/m02-02…:150–191`; parede `material: brick` no layout `:185`; sem teste de tiro por material nem de dano em LODs (`grep -in "lod" tests/m02-0[12]*` não encontra asserção) |
| 27 | N3-N3: checkpoint antes do assalto e de consolidação | IMPLEMENTADO | `cp_m02_a_preparacao` sim `:363,431,1186`; `cp_m02_b_acesso` sim `:1232,1238`; IDs de produção M02 já usados (N diz «só depois de integração») |
| 28 | N3-N3: restaura porta destruída, cerca aberta, inimigo ferido, munição | PARCIAL | restore de cerca testado `tests/m02-02…:241–268`; porta *destruída* (estado `destroyed`) não: portas são `open/closed` (sim `:1387`); ferido/munição incluídos no snapshot (`:1372`, validação `:82,111–119`) mas teste de munição pós-restore não confirmado |
| 29 | N3-N3: revisão de todos os interiores e 360°; playtest, medições, correções antes de B/C | AUSENTE | sem relato de playtest; B/C já implementados (`tests/m02-04-05-areas-bc-completion.test.js`) sem gate de N6 |
| 30 | N4: não afirmar reconstrução Kwiatkówek/Tum sem GEO-01/ART-01; imagens rotuladas | CONTRADIZ | ver B.md #2: `m02-01.html:244` apresenta «Kwiatkówek–Tum» como local da ação |
| 31 | N4: dependências técnicas (entrada independente, helpers, rkm, checkpoint, instrumentação) | IMPLEMENTADO | `src/m02/m02-01-main.js`, `m02-01.html` entrada própria; `window.m02Bench` (spec `:34–254`); MG34 `DE-A05` |
| 32 | N4: «sem mods de M01» | PARCIAL | M02 importa módulos m01 (leitura); não verificado por `git diff` que nada de M01 mudou neste branch |

## N5 — conjuntos de captura

| Item exigido por N5 | Exigido | Existente no spec | Falta |
|---|---|---|---|
| Pontos SN1–SN5 | 5 | 5 teleportes + 5 PNG (`spec:34–94`: `m02-01-sn1-start.png` … `m02-01-sn5-orchard.png`) | — |
| Coordenadas | SN3 (-23,-12); SN4 (8,-28) | `main:7` SN3 (-21,-13.5); `main:8` SN4 (4,-29.5); SN1/SN2/SN5 coincidem (`main:5,6,9`) | SN3 desvio ~2,8 m; SN4 desvio ~4,1 m |
| 360° por ponto | 360° | 1 vista fixa por ponto (`angle`/`pitch` únicos em `main:5–9`) | 4+ direções ou panorama por ponto |
| Luz | fim da tarde + manhã de revisão | PNG tirados na luz por defeito T0 (restaurado em `spec:241`); morning existe (rend `:69`, html `:283`) mas SN nunca capturados com ela | 5 pontos × manhã |
| Perfis | 3 (high/medium/low) | `?quality=medium` fixo (`spec:20`); loop dos 3 perfis `spec:245` só recolhe telemetria, sem screenshot | SN × high e × low |
| **Total** | **30** (5×2×3) | **5 PNG** (1 luz × 1 perfil × 1 vista), nomeados sem luz/perfil | **25 conjuntos** (e nomes `ponto/luz/perfil`) |
| Interiores B01–B04, portas abertas/fechadas, neutra | 4 edifícios × 2 estados | 1 PNG interior (`m02-01-b01-kitchen-interior.png`, `spec:80`); luz `neutral_review` existe (rend `:99`) mas sem uso no spec | B02, B03, B04; portas fechadas; altura de cobertura |
| Vídeo contínuo de ambos os percursos | 2 | nenhum (`grep -in "recordVideo\|video"` em spec/tools/handoff: 0 hits) | ambos |
| Pacote: build/hash, configuração, equipamento | sim | ausente; `ARTIFACT_DIR` por defeito é um caminho de outro utilizador (`spec:5`), não reproduzível | manifesto |
| Frame p50/p95/p99 | sim | calculado em rend `:1162–1172` e exibido main `:286`; spec grava JSON por perfil (`spec:262–265`) | só sobre 10 frames sintéticos (`spec:249`), sem equipamento nem janela de jogo real |
| Logs de combate, relato de playtest, lista de defeitos, decisão | sim | eventos em `sim.events` (ex. `door-toggled`, `checkpoint-saved`) sem exportação para o pacote | exportação, playtest, defeitos, decisão |

## N6 — critério de expansão (resumo)

Cumpridos por testes de estado (não playtest): inimigos respeitam paredes (LoS via janela/porta, spec `:49–70`; combat-ai `:1021` usa `lastKnownPosition`), checkpoint restaura sem duplicação (`tests/m02-02…:241–268`; NAR-01 sim `:437`), transformação do espaço (cerca/vidro, `tests/m02-02…:150–191`). Por provar: arquitetura reconhecível pelo humano, aliados com efeito causal medido em jogo, nenhum ator preso (sem teste de stuck de aliados/inimigos), horizonte nos cinco pontos, perfis mantêm gameplay (só drawCalls/triangles > 0, `spec:254–255`), performance «adequada ao alvo adotado» (sem alvo adotado no repo), playtest humano. Ainda assim a expansão para B/C já existe no código (`tests/m02-04-05-areas-bc-completion.test.js`): contradiz «aprovação antes de expandir» como processo.

## Desvios prioritários
1. **N5 captura (30 exigidos, 5 existentes)**: 25 conjuntos em falta; pontos únicos sem 360°, só luz T0 e perfil medium; sem vídeos, sem pacote de aprovação.
2. **Gate N6 ultrapassado**: B/C e actos C05–C12 implementados sem playtest nem aprovação do Capitão; sem alvo de performance adotado.
3. **Contagem de inimigos**: 14 defensores no dado (incl. EA0) contra 10 EA1 em N1 (linhas 7 e 19).
4. **Coordenadas SN3/SN4** divergem do PDF (2,8 m e 4,1 m) (`main:7–8`).
5. **«Kwiatkówek–Tum» no ecrã** (`m02-01.html:244`) contradiz N4 sem GEO-01/ART-01.

## Lacunas de prova (gate)
- Matriz de capturas `SN × luz × perfil` (30) e panorama 360° por ponto; interiores B02–B04 com portas abertas/fechadas.
- Vídeo contínuo das duas rotas.
- Pacote de aprovação: hash/build, configuração, equipamento, p50/p95/p99 em jogo real (não 10 frames sintéticos), logs de combate exportados, defeitos, decisão.
- Testes em falta: tiro por material (parede/madeira/vidro) por edifício; restauro de porta destruída; munição após restore; «marca realizada»; inimigos nunca atrás do jogador; atores não presos; distância/tempo até contacto MG ≈51 m.
- Playtest humano e revisão 360° (N3/N6); ART/GEO para N2.
- Nota: `ARTIFACT_DIR` por defeito (`spec:5`) aponta para um caminho de outro utilizador; o spec browser não foi corrido nesta auditoria.
