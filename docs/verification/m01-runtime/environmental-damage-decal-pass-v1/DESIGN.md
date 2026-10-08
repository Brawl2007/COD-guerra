# DESIGN — M01 environmental damage decal pass v1

TASK_ID: `M01-ENVIRONMENTAL-DAMAGE-DECAL-PASS-V1` · base `99309d9cb023cc94a07d41ff863e1362e4460570` · módulo `src/render/m01-damage-decals.js` (`M01_DAMAGE_DECAL_VERSION = 'm01-environmental-damage-decal-pass-v1'`).

Objectivo: dar consequências visuais ao combate (marcas de bala por material, queimados, crateras, terra lançada, lascas, pequenos detritos, brasas, resíduos das demolições das pontes) **sem alterar a autoridade de gameplay**. Tudo o que este módulo produz é apresentação: não decide acertos, dano, visibilidade, eventos, objectivos nem estado da missão, e não acrescenta dados ao save.

## 1. Autoridade e fluxo de dados

| Entrada autoritativa | Origem | Uso visual |
|---|---|---|
| `round-impact` (`by`, `point`, `material`) | `M01Simulation` (tiros alemães/NPC já resolvidos) | uma marca no máximo + lascas |
| `player-shot` (`point`, `material`) | `M01Simulation.traceShot` do jogador | uma marca + o FX de impacto já existente (`M01View.impact`) no ponto da marca |
| `sectors.damage` (`id`, `x/y/z`, `started`) via `renderState.damage` | explosões gravadas (granadas, bombas, demolições) | resíduo persistente + detritos + brasas |

- `Game.handleM01Event` ganhou **uma linha**: `round-impact`/`player-shot` → `M01View.surfaceDamage(event, sim)`. O método só lê `sim.world`, `sim.player`, `sim.actor(by)` e `sim.clock`; o evento continua a seguir para os handlers existentes sem alteração (áudio, FX de impacto alemão, feedback de acerto).
- `M01View.render` chama `damageDecals.update({state: sim.renderState, time: sim.clock, world, trees, quality, camera})` depois de `updateBattlefieldFx`.
- Variação visual: `m01DecalSeed` (FNV dos dados do evento, quantizados ao mm/ms) + `visualNoise` (hash de apresentação já usado pelos FX). Sem `Math.random`, sem `src/core/random`, sem RNG da simulação, sem relógio de parede.
- Correcções puramente visuais do ponto (a simulação mantém o seu): (a) tiros do jogador no chão percorrem de volta o raio olho→ponto até ao solo **desenhado** (a marcha do terreno da simulação avança até 1,2 m e, na cabeça de ponte oeste, o encontro andável fica 0,35 m abaixo do aterro desenhado); (b) uma marca em tronco pode deslizar até 5 cm para dentro da faceta; (c) marcas em superfícies limitadas (faces, faixas do tabuleiro, travessas) são encaixadas dentro dos limites.
- Prova: teste Node com a rota real até `hold_access` (355 `round-impact`, quatro bombas gravadas) com eventos congelados (`Object.freeze` profundo) — `snapshot(false)` idêntico com e sem decals; duas instâncias alimentadas com os mesmos eventos produzem marcas/resíduo/diagnóstico idênticos.

## 2. Superfícies desenhadas (modelo analítico)

Uma marca só nasce em geometria que está realmente desenhada. Se nenhuma superfície desenhada coincide com o ponto autoritativo (ar sobre o rio, treliças, vagões, personagens), não há marca — nunca uma marca a flutuar.

| Receptor | Geometria imitada | Tipo |
|---|---|---|
| Terreno | `PlaneGeometry(2000,650,400,130)` do `M01View`: os mesmos dois triângulos por célula de 5 m (`M01_TERRAIN_MESH`); água excluída | `earth` |
| Tabuleiros | faixas de `bridges.mjs` (`M01_DECK_LAYOUT`): pranchas ferroviárias (madeira), carris, pavimento e lancis rodoviários; juntas de dilatação metálicas; topos dos encontros; encontros danificados após a demolição oeste (`M01_DAMAGED_ABUTMENTS`) | `wood` `rail` `road` `stone` `metal` |
| Via férrea em aterro | travessas/fixações/balastro de `M01Environment.buildTracks` e carris de `M01View.buildTerrain`, às alturas da primeira construção (o desenho não muda com as demolições) | `rail` `sleeper` `ballast` |
| Caixas desenhadas | estação, barracão, coberturas (`M01View.syncSolids`): faces exactas | `brick` `wood` `earth` |
| Portais oeste | paredes (a marca fica no pano ao lado da abertura ou acima do fecho do arco, nunca sobre o vão) e ombreiras; torres de 20 lados (base de pedra, fuste de tijolo, cornija) com o raio do próprio tiro | `brick` `stone` |
| Torres rodoviárias / pilares | torres de 20 lados nos pilares 1–5; faces x dos pilares abaixo do capitel | `brick` `stone` |
| Árvores sólidas | tronco LOD próximo (`CylinderGeometry(.58,1,1,10)`, inclinação/rotação do descritor) | `bark` |

O teste Node verifica, para cada tipo, que a marca fica exactamente 4 mm à frente da face/faixa (terreno: 8 mm + no máximo 12 mm de folga sobre uma aresta convexa).

## 3. Diferenciação por material

| Tipo | Arte (células) | Tamanho (m) | Aspecto | Vida (s) | Lascas / detrito | FX secundário |
|---|---|---|---|---|---|---|
| stone | 0–1 lascado irregular, poeira clara | 0,11–0,18 | 1 | 180 | 2 pedra | lascas de pedra |
| brick | 2–3 lasca laranja irregular, buraco descentrado (cada célula com forma própria) | 0,10–0,20 | 1 | 180 | 2 tijolo | — |
| wood | 4–5 farpas com veio | 0,07–0,10 | 1,75 ao longo do veio | 180 | 1 farpa | lascas de madeira |
| bark | 4–5, tom acinzentado | 0,065–0,09 | 1,7 | 180 | 1 farpa | lascas de madeira |
| sleeper | 4–5, creosote escuro | 0,075–0,11 | 1,6 | 180 | 1 farpa | lascas de madeira |
| metal | 6 mossa com chumbo | 0,05–0,075 | 1 | 200 | — | faíscas |
| rail | 7 risco brilhante na cabeça do carril | 0,045–0,065 | 2,4 ao longo do carril | 200 | — | faíscas metálicas |
| earth | 8–9 terra húmida escura com torrões | 0,20–0,32 | 1,4 na direcção do tiro (1,12 em faces verticais) | 70 | 2 torrões | — |
| ballast | 10 gravilha deslocada | 0,20–0,30 | 1,2 | 90 | 2 gravilha | pedra |
| road | 11 pavimento lascado | 0,10–0,15 | 1 | 150 | 1 pedra | lascas de pedra |

Nenhum par de tipos partilha a combinação arte/tamanho/aspecto (teste Node); madeira/casca/travessa partilham células de farpa mas diferem em tamanho, aspecto e tonalidade.

FX de impacto: o FX secundário é o FX já existente (`M01View.impact`) que corresponde à superfície desenhada, emitido quando a simulação reporta outro material (tabuleiros, juntas e via são `earth` para a simulação). Os tiros alemães mantêm o FX do `Game` para o material da simulação e recebem este, se diferente; o tiro do próprio jogador, que na base não tinha FX visual, recebe só o da superfície desenhada.

## 4. Arte

Atlas procedural original, gerado em código no arranque (determinístico, `atlasChecksum` nos diagnósticos): 512×256 RGBA sRGB com mipmaps + 512×256 R8 de altura usada como bump. 16 células de 64 px com bordo transparente (sem sangramento nos mipmaps) e 4 blocos de 128 px: queimado A, queimado B, cratera, poeira de alvenaria. Sem assets externos nem conteúdo extraído de COD.

## 5. Explosões e resíduo persistente

| Tipo (`m01BlastKind`) | Ids | Raio | Arte | Fuligem em faces | Detritos | Brasas |
|---|---|---|---|---|---|---|
| grenade | `m01_grenade_*` | 1,7 m | queimado B | até 2,4 m | 12 × 2–6 cm | 4 × 24 s |
| bomb | `station_bomb`, `forward_post`, `repair_crater`, `raid_0530` | 5,4 m | cratera | até 12 m | 30 × 5–24 cm | 9 × 80 s |
| demolition | `east_demolition`, `west_demolition` | 13 m | queimados A/B, tom escurecido | — | 30 × 12–45 cm | 10 × 120 s |

- Superfície da explosão: a mais alta desenhada que não fique acima do ponto gravado + 0,9 m (o `forward_post` em quase-acerto fica gravado a y −10, o raid das 05:30 a y 0 sobre terreno a −3); uma explosão sob um tabuleiro mantém a sua janela de altura.
- Polígonos recortados (Sutherland–Hodgman) sobre os receptores desenhados: triângulos exactos do terreno, faixas dos tabuleiros, travessas/carris, encontros danificados. Explosão num tabuleiro queima só esse tabuleiro; no chão nunca sobe para um tabuleiro metros acima.
- Bomba dentro da estação: poeira clara de alvenaria (3,4 m) e entulho maior junto à fachada mais próxima, fora da caixa desenhada, e fuligem nas janelas da fachada norte mais próximas.
- Demolições: um disco largo por peça destruída (pilar, torre, encontro; tabuleiros e treliças caem com elas) e quatro discos menores logo fora da sua planta, porque o colapso desenhado cobre o centro; fuligem nos últimos 9 m dos tabuleiros que ficam de pé junto ao vão; nada sobre tabuleiros destruídos nem sobre água; detritos e brasas só à volta das âncoras em terra.
- Persistência: reconstruído a partir de `renderState.damage` (últimas 16 explosões) quando mudam a lista, a qualidade ou aquilo sobre que o resíduo assenta (assinatura do mundo: superfícies andáveis, encontros danificados, edifícios/coberturas com as suas alturas). Cada evento consumido refresca o mundo; só os que mudam essa assinatura obrigam a reconstruir (7 reconstruções numa rota completa). Não há dados novos no save: carregar, restaurar ou recomeçar reproduz exactamente o mesmo resíduo. Começa 0,04 s depois de `started` e fica completo 0,59 s depois (uniforme = relógio da missão), por isso a pausa congela-o e um save carregado mostra-o de imediato.

## 6. Ciclo de vida e limpeza determinística

- Marcas: vida no relógio da missão (tabela acima × 0,85–1,15), entrada 0,05 s, saída nos últimos 32 % da vida; as mais antigas desvanecem quando o pool passa de 88 %; FIFO na capacidade.
- Anti-spam: no máximo `cluster` marcas por receptor num raio de 0,6 m (terra/balastro 1,1 m); duplicado se a menos de 0,35 × o menor dos dois tamanhos; nunca nasce uma marca menor que ~1 px (`alcance = min(qualidade, tamanho × 450)`).
- `prune` em cada impacto e em cada frame: expiradas; anteriores ao relógio (restauro para trás); receptor que deixou de existir (revisão do mundo: vãos demolidos, cobertura do posto avançado rebaixada para 0,45 m).
- `reset()` (via `resetEffects` em restauro/recomeço/novo jogo) limpa marcas, lascas, resíduo e pools; o resíduo volta no frame seguinte a partir do save. `dispose()` liberta grupo, geometrias, materiais e as duas texturas.
- Marcas em árvores só se desenham com o tronco em LOD próximo.

## 7. Orçamento

| Qualidade | Marcas | Detritos (resíduo 70 % / lascas 30 %) | Brasas | Alcance | Cluster |
|---|---:|---:|---:|---:|---:|
| low | 48 | 64 | 0 | 55 m | 4 |
| medium | 96 | 128 | 24 | 90 m | 5 |
| high | 144 | 192 | 40 | 130 m | 6 |

Global: 16 explosões; 6000 triângulos de resíduo — enquanto houver mais de uma explosão e o total passar disso, descarta-se a não-demolição mais antiga (ou, só com demolições, a mais antiga); uma explosão sozinha nunca é cortada (a maior, a demolição oeste, tem cerca de 600). **4 draw calls** (marcas, resíduo, detritos, brasas — todos instanced ou uma só malha), **2 texturas**. Pools instanced alocados uma vez para `high` (144/192/40) e nunca crescem; a geometria do resíduo é recriada só quando é reconstruído, com o tamanho exacto. Sem luzes, render targets, sombras projectadas novas ou colliders.

Arranque: o atlas (cerca de 0,36 s de CPU em Node) é pintado em 64 fatias de 2048 píxeis por temporizador e enviado à GPU quando completo, em vez de bloquear o construtor; até lá as marcas ficam transparentes. Os quatro programas de shader são compilados (`renderer.compile`) no primeiro frame desenhado, não no primeiro impacto em combate.

## 8. Z-fighting e ordenação

- Marcas: deslocamento 4 mm na normal (terreno 8 mm + folga ≤ 12 mm), `polygonOffset(-1,-4)`, `depthWrite: false`, `alphaTest .012`; uma marca nunca atravessa uma aresta de faceta/faixa (encolhe até 45 % ou não nasce).
- Resíduo: 12 mm no terreno, 4 mm em tabuleiros/encontros, 3 mm na via; mesmo material sem escrita de profundidade.
- `renderOrder`: resíduo −3, marcas −2, brasas −1 — antes das partículas suaves existentes (poeira/fumo).

## 9. Integração

`src/render/m01-view.js`: import, uma linha no construtor, a chamada `update` no `render`, o método `surfaceDamage` depois de `explosion()`, `reset()` em `resetEffects`, uma linha de diagnóstico e `dispose()`. As duas chamadas ao módulo estão protegidas: uma falha conta em `counts.errors`/`lastError` e é registada uma vez, sem saltar o áudio, FX ou feedback do evento nem interromper o frame. `src/game/game.js`: uma linha. Posições escolhidas fora dos blocos tocados pela frente concorrente de FX. Simulação, mundo, missão, assets, áudio, build e testes existentes intactos.

## 10. Limitações conhecidas

- Fuligem das janelas da fachada norte da estação: presente na geometria, quase invisível sobre a fachada escura em sombra.
- Queimados da demolição leste na planície: legíveis de cima; ao nível do chão discretos sobre o terreno escuro e manchado, e o centro fica por baixo do colapso desenhado.
- Sem marcas em personagens, vagões, locomotiva, Panzerzug, treliças de aço, água ou no portal de Lisewo distante (estes impactos mantêm só o FX existente).
- Detritos são rochas low-poly (icosaedro com vértices deslocados por hash), sombreado plano, sem física nem colisão.
- Provas em Chromium/SwiftShader; sem medição de FPS nem Chromebook físico.
