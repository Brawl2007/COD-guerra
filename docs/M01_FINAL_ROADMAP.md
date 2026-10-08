# M01 — Roadmap técnico final: de protótipo jogável a apresentação de FPS WWII clássico

**Estado:** plano executável pelo Captain e pelos agentes, **sem código**. **Autor:** Lead Game Production Engineer (Claude Code), 2026-10-07. **Base avaliada:** `codex/m01-bridge-portal-material-detail-polish-v1 @ 99309d9cb023cc94a07d41ff863e1362e4460570` mais `M01-TRAIN-DETAIL-COUPLING-POLISH-V1` (HEAD `0fca9e2` em `claude/m01-train-detail-coupling-polish-dws18u`, código de produção de `09e5858`). M01 continua **PROTÓTIPO JOGÁVEL**; nada neste documento aprova o marco 2 nem substitui o playtest humano e a medição no Chromebook.

Evidência própria desta avaliação: 19 capturas em estados reais da rota, com contadores, em [`docs/verification/m01-runtime/final-roadmap-2026-10-07/`](verification/m01-runtime/final-roadmap-2026-10-07/README.md).

---

## 0. Resumo executivo

1. O que faz um jogador dizer "isto ainda parece protótipo" é, por ordem de impacto: o **mundo** (terreno plano e sem fim, árvores-esfera, chão de uma textura, madrugada sem sombras nem céu), as **pessoas** (soldados que deslizam, cortam entre poses, morrem num frame e se repetem), os **acontecimentos** (Stukas em laço, frente leste invisível, explosões que não "aterram", comboios que aparecem), o **som** (síntese procedural em tudo) e a **camada de apresentação** (cutscenes só com legendas, HUD de protótipo, tiro do jogador sem consequência).
2. A autoridade da simulação, o determinismo (schema 2, auditoria A/B), os checkpoints, a rota contínua e os kits já integrados (pontes, soldados LOD0 com 25 clips, MG34 deitada, ckm, locomotiva 963, Panzerzug, 65 vagões com engates, Ju 87, arrasto da estação, evacuação, FX V2) são sólidos. **Cerca de 85 % do trabalho que falta é apresentação; os restantes 15 % são campos de dados pequenos e delimitados na simulação.**
3. Há cinco documentos e um candidato de código paralelos de hoje que este roadmap **integra em vez de repetir**: plano de animação (TASK A–E), direcção da batalha (BX-00–14), production pass ferroviário (D1–D10), plano de áudio (T0–T5) e o passo de HUD/cinema V1 (código, não integrado). As tarefas abaixo referem-nos pelo ID e dizem o que muda.
4. O caminho crítico é: **integrar FX V3 e o HUD/cinema V1 → libertar `m01-view.js` → luz de madrugada + Stukas + vida dos comboios → onda de ambiente (terreno, vegetação, estruturas) → onda de animação → assets de áudio → closeout V3 + playtest humano**. Três ondas de tarefas correm em paralelo com baixo conflito de ficheiros; a quarta é fecho.
5. Regra que não muda: renderer e áudio nunca decidem dano, visibilidade, eventos ou estado da missão; cada tarefa prova com `git diff --exit-code` nos ficheiros de autoridade que não lhes tocou, ou, quando lhes toca de propósito, prova com a comparação A/B de futuros e as 12 sementes que o gameplay ficou igual.

---

## 1. Método e limites

**Evidência recolhida nesta avaliação**

- 19 capturas de produção (1280×720, SwiftShader, `?debug=1`) em estados reais da rota de controlos (semente 19390901): início 04:30, bombardeamento 04:34 com os Stukas no céu, arrasto da estação 04:40, reparo 04:42, ameaça no reparo 04:50 (High e Low), retirada 06:05, demolição leste 06:10, demolição oeste 06:45, chamada 07:05 e Panzerzug às 06:13. Contadores por vista (draw calls 70–509, triângulos 365 k–962 k, texturas 37–209). Pasta de evidência acima.
- Quatro levantamentos independentes por sistema sobre o mesmo HEAD: (a) soldados, animação e armas; (b) HUD, cutscenes, ritmo, composição de batalha, veículos e desempenho; (c) FX e áudio; (d) ambiente, iluminação, céu, materiais e LOD. Cada afirmação deste documento com número ou ficheiro foi confirmada no código.
- Leitura de `src/game/m01-simulation.js`, `src/render/m01-view.js`, `m01-atmosphere.js`, `m01-environment.js`, `m01-characters.js`, `src/core/audio.js`, `src/game/game.js`, `missions/m01-tczew/mission.json` e `map-layout.json`; dos relatórios de branches anteriores (closeout V2, auditoria de placeholders, pendências, combat AI, sectores de batalha, benchmark do Chromebook) e dos cinco documentos paralelos de 2026-10-07 (secção 3).

**Limites**

- Nenhum playtest humano e **nenhum FPS medido**; SwiftShader não mede desempenho. Os contadores são triângulos/draw calls, não tempo de frame.
- Low e High diferem pouco no ecrã (vistas 18/19 vs 10/01): sombras só depois do nascer do Sol e LOD de actores. Isso é em si um achado (problema 19/20).
- A vista 05 pretendia mostrar a mira; o flag `aiming` no snapshot não produz a pose de mira (a mira é input contínuo). Fica registado; não altera o diagnóstico da arma em primeira pessoa.
- O áudio não é verificável em headless: o diagnóstico do som vem da leitura de `audio.js` e do plano de áudio, não de escuta.

---

## 2. O que já está bom e não se refaz

| Sistema | Estado | Não repetir |
| --- | --- | --- |
| Autoridade e determinismo | `M01Simulation` só dados; schema 2 com CP-A..D; auditoria A/B de 61 055 comparações; rota contínua do menu ao debrief | Nenhuma tarefa reescreve `tick`, RNG, gates, saves ou IDs; só acrescenta campos opcionais validados |
| Pontes | Kit GLB com LOD 0/400/800, portais 1912, materiais V1, colisores exportados | Não redesenhar geometria; só materiais/acabamento (problema 16) |
| Trem 963 e Panzerzug 7 | Locomotiva e Panzerzug de produção; 65 vagões GLB com LOD, danos, engates, estrado, via própria assente (2026-10-07) | Não refazer vagões, engates ou assentamento; falta **vida** (fumo, chegada, som) e a via principal |
| Soldados | Rig de 61 ossos, 25 clips, LOD0/1/2 + proxies, variação visual (closeout V2 em curso), MG34 deitada, ckm com guarnição, arrasto da estação, Bąk ao ombro | Não refazer rigs nem kits; o problema é animação/locomoção (plano TASK A–E) |
| Ju 87 | Kit com LOD por distância e provas do raid real | Não refazer o modelo; falta o **percurso** (problema 6) |
| FX de combate | V2 integrado (fumo suave, poeira, colunas por `sectors.damage`, feedback de quase-acerto) e V3 candidato (perfis, texturas, impactos por material) | Não abrir outro pass de FX antes de integrar V3 |
| Pátio da estação | Vagões do desvio com estado de fogo; arrasto S3; estação em curso (V3) | Não tocar na estação até V3 fechar |
| Vegetação e props | Pass de densidade/assentamento e LOD de vegetação integrados (árvores em lotes, tufos, cercas, caixas) | A base de instanciação serve; o que muda são os **assets** (silhuetas, texturas) |
| Harness de testes | 47 ficheiros Node, 17 specs de navegador, rota automática, capturas com `M01_BASELINE_CAPTURE`, workflows focados por tarefa | Toda a tarefa reutiliza este kit (secção 9) |

---

## 3. Trabalho em curso, candidatos não integrados e planos paralelos (não repetir)

| Item | Onde | Estado em 2026-10-07 | Ficheiros quentes | O que fecha / como este roadmap o trata |
| --- | --- | --- | --- | --- |
| `M01-FX-CAPTURE-TIMING-FIX-V1` | tarefa em curso (GPT-5.6) | em curso | `tests/browser/m01-battlefield-fx-polish-v3.spec.js`, FX | Pré-requisito da integração de FX V3 (T15) |
| `M01-SOLDIER-VISUAL-VARIATION-CLOSEOUT-V2` | tarefa em curso | em curso | `src/render/m01-soldier-variation.js`, `m01-characters.js` (`create()`), testes de variação | Nenhuma tarefa de animação toca estes ficheiros até fechar (onda 2) |
| `M01-STATION-ARCHITECTURE-VISUAL-CLOSEOUT-V3` | tarefa em curso | em curso | `src/render/m01-environment.js` (estação), `tools/assets/m01-station` | Estruturas de campo, props e terreno só entram em `m01-environment.js` depois (onda 2) |
| Battlefield FX V3 | `codex/m01-battlefield-fx-polish-v3 @ e08755b` (14 commits) | candidato, não integrado | `m01-atmosphere.js`, `m01-view.js`, novos `m01-battlefield-fx-profile.js`, `m01-fx-textures.js` | Perfis small/bombing/demolition, texturas de poeira, impactos por material, densidade por distância. **Integrar primeiro** (T15); as lacunas que sobrarem vão para T18/T19 |
| HUD e cinema V1 | `codex/m01-hud-cinematic-presentation-pass-v1 @ a42ee07` (1 commit, base `99309d9`) | candidato de código, não integrado | `index.html`, `src/main.js`, `src/game/game.js`, `src/styles.css`, novo `src/ui/m01-hud.js`, testes e `tools/verification/m01-hud-capture.mjs` | Cartelas/fades da intro e da chamada, avisos de objectivo, checkpoint, cartela de retoma, pips de munição, vida baixa. **Rever e integrar** (T04); o que falta vai para T26/T50 |
| Plano de animação | `claude/exciting-planck-5ylz7z` → `docs/architecture/M01_CHARACTER_ANIMATION_PRODUCTION_PASS.md` | documento | — | TASK A–E adoptadas como T07/T08/T35/T36/T37, com a ordem e as decisões da secção 7 |
| Direcção da batalha | `claude/pensive-thompson-jc2y12` → `missions/m01-tczew/BATTLEFIELD_EXPERIENCE.md` | documento | — | BX-00–14 adoptadas como T17/T20/T21/T22/T23/T24/T25/T34/T47/T48; BX-07b (desembarque com efeito no fogo) fica **fora** |
| Production pass ferroviário | `claude/railway-production-pass-3c7fwx` → `docs/railway/*.md` | documento, **diagnóstico desactualizado** face ao HEAD (já há 65 vagões GLB, locomotiva/Panzerzug de produção, via assente, vagões do desvio) | — | Re-basear antes de executar (passo 1 de T24); D1–D10 respondidas no Anexo B |
| Plano de áudio | `claude/zealous-ramanujan-2el38r` → `docs/M01_AUDIO_PRODUCTION_PLAN.md` | documento | — | T0–T5 adoptadas como T05/T06/T45/T46 |
| Pilotos de autoridade near/far e RNG por formação | PR #39 (`codex/m01-near-far-authority-runtime-pilot`), `codex/m01-per-formation-rng-architecture` | pilotos, não integrados | `m01-simulation.js`, `game.js` | **Fora deste roadmap**: não são necessários para a apresentação; decisão do Captain à parte |
| Harness hardening | PR #40 (`codex/m01-browser-harness-hardening`) | não integrado | testes | Útil para o closeout; não bloqueia |

**Regra de ficheiros quentes.** `src/render/m01-view.js` é o maior ponto de conflito (FX V3, Stukas, luz, comboios, impostores, água). Cada tarefa que lhe toque deve **extrair** o seu sistema para um módulo novo (`m01-lighting.js`, `m01-aircraft.js`, `m01-impostors.js`, `m01-ambient.js`, `m01-water.js`, `m01-player-fx.js`, `m01-far-landscape.js`) e deixar em `m01-view.js` só a chamada. Uma tarefa de cada vez em `m01-view.js`; o mesmo para `m01-atmosphere.js` (FX, luz, vento), `m01-environment.js` (estação V3, depois terreno/vegetação/estruturas/via) e `m01-characters.js` (variação V2, depois animação).

---

## 4. TOP 20 problemas restantes, por impacto perceptível

Severidade: **CRITICAL** = a primeira coisa que qualquer jogador vê em qualquer vista; **HIGH** = visível em cada fase ou em cada confronto; **MEDIUM** = polimento que separa "bom" de "produção".

| # | Sev. | Problema | Sistemas | Evidência (vistas) | Tasks |
| --- | --- | --- | --- | --- | --- |
| 1 | CRITICAL | Mundo plano sem fim: terreno analítico, margens rectas, horizonte vazio, costura céu/chão | terreno, composição, longa distância | 01, 09, 10, 17 | T27, T28, T30 |
| 2 | CRITICAL | Madrugada sem luz: sem sombras até ≈04:56, um mapa de sombra ±65 m, céu/nevoeiro de uma cor, sem AO/grading, estrela no zénite | iluminação, céu/clima, materiais | todas | T16, T44 |
| 3 | CRITICAL | Árvores-esfera e chão nu: 85 árvores só a oeste, 5 951 tufos sem textura, sem relva/arbustos, uma textura de solo | vegetação, terreno, props | 01, 04, 09, 10, 15, 16, 19 | T10, T29, T28 |
| 4 | CRITICAL | Soldados robóticos: pés a deslizar, cortes secos, morte num frame, sem reacção, poses iguais, fila em pé sob fogo | soldados, animações, composição | 01, 10, 11, 13, 14 | T07, T08, T35, T36, T37, T38 |
| 5 | CRITICAL | Encenação sem camada de apresentação: cutscenes só com legendas, 32 beats de acção não executados, sem cartelas/fades/letterbox, diálogo com saltos | cutscenes, scripted sequences, HUD | 09, 14, 15, 16 | T04, T02, T26 |
| 6 | CRITICAL | Raid dos Ju 87 em laço: seno + teletransporte a cada 90 s, sem mergulho/sirene/bombas visíveis; bomba do posto sob o terreno; raid 05:30 de um impacto a flutuar | aeronaves, explosões, scripted | 06 | T17, T03, T25 |
| 7 | HIGH | Áudio 100 % sintetizado: sem amostras, vozes, reverb, mistura ou posicionamento real; batalha distante toca em todas as fases | áudio | — | T05, T06, T45, T46 |
| 8 | HIGH | Frente leste ilegível: homem de 0,9 px a 1,1 km, 26/40 alemães disparam para o vazio, pelotão leste inactivo até 06:00, sem traçantes polacos | composição de batalha, longa distância, impactos | 10, 12, 18 | T20, T22, T23, T21 |
| 9 | HIGH | Explosões e demolições que não "aterram": flash <0,1 s a 771 m, luz invisível, feedback 0 além de 180 m, lascas pretas, colunas de granada de 4 min, sem colapso/detritos/silêncio | explosões, fumaça, partículas, impactos | 14, 15, 07 | T15, T18, T03 |
| 10 | HIGH | Comboios inertes: aparecem às 04:45/04:52, locomotiva fria, sem chegada, sem som; via principal com travessas a 1,35 m e desalinhada do tabuleiro | locomotiva, Panzerzug, vagões, veículos | 02, 07, 10, 17 | T24, T31 |
| 11 | HIGH | Tiro do jogador sem consequência: sem impacto, clarão, cápsula nem hit marker; metal/água nunca ocorrem | armas, impactos, HUD | 05 | T19 |
| 12 | HIGH | Arma e mãos em primeira pessoa: manga aberta, mãos planas, mira instantânea (τ 45 ms), sem sway/recuo credível, transporte de Bąk primitivo | armas, animações | 01, 05, 14 | T39, T40 |
| 13 | HIGH | Estação, barracão, abrigo, posto e props em caixas (estação em curso): sem plataforma, sinais, postes, carroças, civis | estação, props, composição | 02, 03, 07, 08, 15, 16 | T12, T13, T32, T33, T34 |
| 14 | HIGH | Ritmo e dados do roteiro: 199 s sem fogo no posto de disparo (`west=p.x>-200`), esperas de 754/1083 s, fala 019 às 04:31 antes da bomba, 26/40 alemães nunca disparam para oeste | scripted, composição, diálogo | — | T02, T23, T48 |
| 15 | MEDIUM | HUD e menus de protótipo: candidato V1 por integrar, fonte não carregada, sem ecrã de carregamento, sem hit marker | HUD, menus | todas | T04, T50, T19 |
| 16 | MEDIUM | Pontes: aço quase preto sem rebites, portais "castelo de brinquedo", tabuleiro de terra, treliça sem LOD de longe | pontes, materiais | 04, 09, 12, 13 | T14, T41 |
| 17 | MEDIUM | Materiais: 14 texturas canvas 512² com tiling, sem normal/roughness, cores saturadas | materiais, texturas | todas | T09, T28, T14 |
| 18 | MEDIUM | Água opaca: caixa azul escura sem reflexo, fluxo, margem nem detritos | água, pontes | 12, 13 | T42 |
| 19 | MEDIUM | Transições de LOD a saltar: actores a 15/40/45 e 100/130/160 m, comboios, partes das pontes; Low ≈ High | LOD, performance | 10 vs 18, 01 vs 19 | T43, T24 |
| 20 | MEDIUM | Desempenho desconhecido: 0 medições de FPS, chão sempre desenhado (≈323 k triângulos), bundle 1 218 kB, 70–509 draw calls | performance, loading | contadores | T01, T49, T50 |

---

## 5. Fichas dos 20 problemas

Formato: problema visual/jogável · causa provável (ficheiro) · solução de produção · risco · dependências · como verificar.

### P1 · Mundo plano sem fim (CRITICAL)

- **Problema.** Da secção (vista 01) e do aterro (09/10) o terreno é um plano com ruído fraco até ao nevoeiro; as margens do Vístula são taludes rectos; a leste (17) o chão é uma folha até ao horizonte; a linha céu/chão é uma costura. Nada ao longe situa Tczew: nem a cidade a oeste, nem Lisewo, nem as linhas de árvores das margens, apesar de `map-layout.farAnchors` descrever Elbląg/Malbork/Westerplatte.
- **Causa.** `src/world/tczew-world.js` (`terrainHeightAt`) é um campo de alturas analítico (plano + aterro + taludes) partilhado por simulação e renderer; o chão é uma malha única sempre desenhada (≈323 k triângulos); não há geometria para lá da área jogável; `farAnchors` não tem consumidor.
- **Solução.** Separar **relevo de gameplay** (intocável: envelope de todas as posições/rotas/origens de fogo/nós de cobertura e área jogável com margem) de **relevo de apresentação** (fora do envelope: ondulação dos campos, perfil natural das margens, bermas), gerado por semente e validado por teste de grelha; adicionar uma **paisagem distante** (massas da cidade a oeste com torres/chaminés em silhueta, Lisewo a leste, linhas de árvores nas duas margens, saia de terreno até ao nevoeiro, bandas de bruma por altitude); dividir o chão em blocos com culling.
- **Risco.** Médio: `heightAt` é autoridade (altura dos actores, `eyePosition`, linha de visão). Mitigação: relevo só fora do envelope, teste que prova `heightAt` igual numa grelha densa dentro do envelope, A/B de futuros nas duas rotas e 12 sementes.
- **Dependências.** Estação V3 fechada (`m01-environment.js`); iluminação (P2) para a bruma de horizonte.
- **Verificar.** Vistas 01/09/10/17 antes/depois; grelha de `heightAt` (diff 0 dentro do envelope); `tools/verify-m01-route.mjs`; `tools/m01-cover-comparison.mjs`; contadores de triângulos do chão por vista.

### P2 · Madrugada sem luz (CRITICAL)

- **Problema.** Todas as vistas antes das 04:56 não têm sombras (01–11); a chamada (16) tem sombras longas porque o Sol já nasceu. O céu é um gradiente com estrela no zénite e nuvens estáticas; o nevoeiro é uma cor fixa (#727f8c→#a8b2b0) igual em todas as direcções; não há disco solar, AO, nem variação de exposição entre 04:30 e 07:05 (≈14 % de variação total de luz).
- **Causa.** `m01-view.js` `lighting()`: `this.sun.castShadow = alt>0`, intensidade `max(.09, sin(alt)·5.8)`, exposição fixa 1.08, `scene.background` = cor única; uma só `DirectionalLight` com um mapa de sombra 1024² de ±65 m; `m01-atmosphere.js` sky com starburst no zénite e nuvens sem deriva.
- **Solução.** Modelo de céu por altitude solar (zénite/horizonte/halo, disco solar depois do nascer, bruma), hemisférica derivada do céu, **luz direccional de crepúsculo com sombras desde 04:30** (fraca, azulada, vinda do horizonte claro a ENE), duas cascatas de sombra (perto 2048² ±30 m, longe 1024² ±160 m) em Medium/High e uma em Low, nevoeiro cujo tom depende da direcção de vista, exposição por fase, deriva das nuvens pelo vento dos dados; fase B: AO leve e grading por fase, só depois de medir.
- **Risco.** Médio no custo (segunda cascata); baixo na autoridade (só renderer). Mitigação: cascata longa só em Medium/High; contadores antes/depois; preset Low sem custo novo.
- **Dependências.** FX V3 integrado (`m01-atmosphere.js`); T01 para o orçamento da fase B.
- **Verificar.** Capturas às 04:30, 04:45, 05:30, 06:10, 07:05 com diferenças legíveis de luz; sombras de contacto em 01/04/09; sem bandas; `gameDiagnostics()` com passes de sombra e triângulos.

### P3 · Árvores-esfera e chão nu (CRITICAL)

- **Problema.** Árvores = tronco + esferas verdes (01, 04, 15, 16); só 85, só a oeste; 5 951 tufos sem textura; não há arbustos, caniços nas margens, relva junto ao jogador; o solo é uma textura com tiling.
- **Causa.** `m01-environment.js` `buildTreeBatches`/`buildGroundClusters`: geometria primitiva instanciada; `src/world/m01-decoration-layout.js` só distribui a oeste; `m01-surfaces.js` gera 14 texturas canvas 512².
- **Solução.** Kit de vegetação original (3 espécies genéricas da planície do Vístula × LOD0/1/2 + cartões impostores, 2 arbustos, cartões de relva/caniço com vento), distribuído nas duas margens e ao longo de estradas/linha, relva instanciada a ≤40 m, impostores até ao nevoeiro; material de solo com macro-variação (campo/prado/lama), trilhos gastos pelas rotas, faixa de balastro junto à via, banda húmida junto ao rio, normal de detalhe.
- **Risco.** Médio no orçamento (instâncias e overdraw de cartões). Mitigação: tectos por preset, impostores a partir de 120 m, relva só no tier perto.
- **Dependências.** Estação V3 fechada; pipeline de texturas (T09).
- **Verificar.** Vistas 01/04/09/10/15/16 antes/depois; contadores; teste de que a vegetação continua decoração não sólida (rota e colisores iguais).

### P4 · Soldados robóticos (CRITICAL)

- **Problema.** Deslizamento de pés (deriva medida 0,41/0,36/2,25 m/s nas marchas), giros instantâneos, cortes secos entre clips, morte no frame final de `fallen`, `HIT_REACTION` ignorado, um só idle/`pinned`/`seated`, secção em fila de pé sob fogo (11), alemães sempre em LOD2 em Low/Medium, proxies-manequim ao longe, mãos cor-de-rosa e manga aberta (14), armas que desaparecem em alguns clips, sem cápsulas.
- **Causa.** `m01-characters.js` escolhe um clip por frame com `stopAllAction()`; não há velocidade/odómetro/`bodyYaw`/`diedAt`/`hitAt` na simulação; biblioteca de clips sem sprint/crouch-walk/turn/mortes/flinch; posições de espera em linha nos dados.
- **Solução.** O plano de animação (TASK A–E): contrato de apresentação na simulação, resolver puro + player com acções persistentes e fundidos em tempo de missão, biblioteca de clips V2, guarnições/evacuações, IK/fidelidade; mais **encenação de posturas** nos dados (secção atrás dos sacos, sapadores deitados, alemães em cobertura).
- **Risco.** Alto no âmbito, baixo na autoridade (campos só dados). Mitigação: cinco tarefas com fallbacks; nenhuma toca `m01-soldier-variation.js`; A/B de futuros cobre os campos novos.
- **Dependências.** Variação V2 fechada antes de tocar `m01-characters.js`; TASK A (sim) e C (clips) podem avançar já.
- **Verificar.** Métrica de deriva ≤0,10 m/s média; zero `stopAllAction()` no caminho genérico; morte a partir de `diedAt`; capturas 01/11/13 com poses variadas; testes de variação verdes.

### P5 · Encenação sem camada de apresentação (CRITICAL)

- **Problema.** As seis cutscenes são legendas sobre a vista normal; a intro não tem cartela/fade; a chamada das 07:05 não tem fade; "Lipski aponta", "sapadores correm", "fade com cartela" existem só como texto; o `t` negativo de alguns beats dispara a 0; a fala 019 toca às 04:31 a anunciar a bomba das 04:34.
- **Causa.** `m01-simulation.js` (linhas 125–144) só executa beats `line`; 32 beats `action` não têm consumidor; não há camada de apresentação de cena (`game.js` escreve texto no DOM).
- **Solução.** Integrar o passo HUD/cinema V1 (cartelas, fades, letterbox, avisos de objectivo, checkpoint, retoma) e completar: tabela de **cues de apresentação por beat** (letterbox, escurecer HUD, prompt de olhar "▲ ponte leste", tremor ao chegar o som), tarefas de NPC por beat (BX-11) e correcção dos dados de continuidade (T02). Nunca rodar a câmara do jogador (regra do repositório).
- **Risco.** Baixo. Mitigação: cues são dados em `mission.json` lidos só pela apresentação; `scene.elapsed` já é autoritativo.
- **Dependências.** T04 antes de T26; T02 para os dados.
- **Verificar.** Specs de navegador da intro/chamada/bombardeio/explosões com `hudPresentation` no diagnóstico; capturas 09/14/15/16 com cartelas e cues; pausa a meio da cena congela a apresentação.

### P6 · Raid dos Ju 87 em laço (CRITICAL)

- **Problema.** Três aviões minúsculos a 160–200 m a descrever um seno e a saltar para trás a cada 90 s (06); nenhum mergulho, sirene, bomba visível ou partida; a bomba do posto avançado está em `{x:0,y:-10,z:-40}` com o terreno a −3 (explosão debaixo do chão) e `raid_0530` em y 0 com o terreno a −3 (a flutuar); o raid das 05:30 é um impacto e uma coluna de 240 s.
- **Causa.** `m01-view.js:424` (`Math.sin(time*.02)`, `time%90`) e `:431` (`time%150`); `map-layout.stukaPath` (7 pontos com mergulho até [−110,160,12] em t=44) sem consumidor; coordenadas das bombas em `mission.json`.
- **Solução.** BX-04 (aviões no `stukaPath` ancorados no evento consumido, inclinação pela tangente, sirene por avião, bombas visíveis a cair entre a largada e o ponto/instante autoritativo, partida para leste, sem laço), BX-06 (raid 05:30 com 5–7 impactos agendados, Do 17 numa passagem alta) e correcção das coordenadas das bombas ao terreno (T03).
- **Risco.** Baixo. Mitigação: posições derivadas só de `clock − consumed[evento]`; reload a meio reproduz o ponto certo.
- **Dependências.** FX V3 integrado (as bombas usam o perfil `bombing`); T03.
- **Verificar.** Teste da posição no caminho em instantes conhecidos; continuação a `planes_heard`+30 s com os três aviões no enquadramento; `grep time%` vazio em `m01-view.js`; captura 06 antes/depois.

### P7 · Áudio 100 % sintetizado (HIGH)

- **Problema.** Tiros, explosões, passos e "batalha distante" são osciladores e ruído branco (`src/core/audio.js`, 257 linhas); sem amostras, vozes (só legendas), reverb, buses, ducking, oclusão; `Math.random` na apresentação; a camada distante toca em todas as fases.
- **Causa.** Não existe `assets/audio`; o sistema actual é o da bancada francesa.
- **Solução.** O plano de áudio: T0 campos de dados, T1 núcleo Web Audio (buses, pool, atenuação, scheduler, manifesto com fallback para a síntese), T2 bridge M01, T3 camada distante e fontes contínuas, T4 assets por patamar (uma arma excelente primeiro: wz.29), T5 mistura/opções e sessão manual no Chromebook. Vozes gravadas em polaco com legendas; nunca TTS.
- **Risco.** Médio (licenças e custo de CPU de áudio). Mitigação: manifesto com fallback (nunca mudo), tectos de vozes por bus, medição manual.
- **Dependências.** T05 (dados) antes de T06; T06 antes de T21 (ambiente) e T24 (comboios).
- **Verificar.** Testes Node com `FakeAudioContext` (atenuação, steal, determinismo, loops por fase); diagnóstico `audio` nas continuações; sessão manual registada.

### P8 · Frente leste ilegível (HIGH)

- **Problema.** Da secção, Lisewo é fumo e dois slivers (10); um homem a 1,1 km mede 0,9 px; só clarões e traçantes alemães; 26 dos 40 alemães disparam `kind:'east'` para pontos vazios; o pelotão leste está inactivo até às 06:00; não há resposta polaca visível.
- **Causa.** `updateActors`/`eastFire` em `m01-simulation.js`; lotes de corpos sem tamanho mínimo no ecrã; ausência de `rounds` de exibição e de `battleReadout`.
- **Solução.** BX-02 impostores com altura mínima de 3 px e contraluz, BX-00 fundação (`battleReadout`, `sector-event`, `rounds` `display`/`attrition`), BX-01 frente visível (pelotão em posição desde 04:45, troca de traçantes, desgaste 24→18 nos IDs 18–23, Panzerzug só contra leste), BX-03/05 camada ambiente.
- **Risco.** Médio: tocar em `rounds` e no validador. Mitigação: `display` nunca aterra nem suprime (teste), cadências do fogo sobre reparo/jogador/secção inalteradas, 12 sementes.
- **Dependências.** T22 (engine) antes de T23; T20 independente; T21 depende de T06.
- **Verificar.** Continuação às 04:47 com `fireEffects.tracer>0` nos dois sentidos e impostores >0; recorte 4× da vista 10; `tests/m01-cover-threat.test.js` intacto.

### P9 · Explosões e demolições que não "aterram" (HIGH)

- **Problema.** A demolição leste a 771 m é um flash de <0,09 s e uma coluna (14); a luz da explosão é invisível; além de 180 m não há tremor nem flash de exposição; lascas (`chip`/`blastShard`) saem pretas; cada granada escreve um registo em `sectors.damage` e deixa uma coluna de fumo de 4 minutos; os vãos desaparecem por `renderState.parts` sem colapso, detritos no rio nem os 2 s de silêncio do roteiro.
- **Causa.** Material de billboard partilhado sem luz, uma textura de puff 128 px, sem soft particles/ordenação (`m01-atmosphere.js` no HEAD); `vertexColors:true` em `TetrahedronGeometry` sem atributo de cor; `grenade.js`/`impact()` a persistir fumo; `m01-combat-feedback.js` com alcance 180 m. FX V3 (candidato) já traz perfis por tipo, textura de poeira, impactos por material e densidade por distância.
- **Solução.** Integrar FX V3 e medir o que fecha; depois um set-piece de demolição: colapso dos vãos derivado do instante consumido (rotação/queda em 2–4 s, determinística), detritos e salpicos no rio a 700–800 m, escala mínima de flash/luz por distância, feedback além de 180 m (flash de exposição escalado), 2 s de silêncio (áudio), chuva de terra no posto de disparo depois da oeste; fumo de granada efémero (dados).
- **Risco.** Baixo/médio (orçamento de partículas partilhado com demolições). Mitigação: tectos por preset já existentes; prioridade às demolições.
- **Dependências.** T15 → T18; T03 para os dados de granadas/bombas.
- **Verificar.** Specs de FX V3 (determinismo, orçamentos); capturas 14/15 antes/depois com recorte 4×; contagem de `smokePuffs` com e sem fogo do vagão; material de lascas com cor.

### P10 · Comboios inertes (HIGH)

- **Problema.** O trem 963 e o Panzerzug aparecem instantaneamente às 04:45/04:52 (flag), parados, frios: sem fumo, vapor, lanternas, travões nem engates; a 1 km são slivers (10); a via principal tem travessas a 1,35 m (real ≈0,63), carris que não coincidem com os do tabuleiro nos encontros (±0,72 vs ±2 m) e a polyline leste a y 0 sobre terreno a −1.
- **Causa.** `renderState.train963/panzerzug` são booleanos consumidos; `m01-locomotive.js`/`m01-panzerzug.js` são arte estática; `buildTracks` em `m01-environment.js`; nenhum emissor ferroviário no pool de partículas.
- **Solução.** Chegada como função do `battleClock` antes do flag (04:43:30→04:45 e 04:51→04:52, apresentação pura, pára exactamente na posição autoritativa), lâmpada frontal, fumo de carvão e vapor nos tectos do pool, coluna do Panzerzug, sons de travagem/engates/vapor pelo plano de áudio; via principal com travessas a 0,63 m, faixa de balastro, perfil de carril contínuo nos encontros x=0 e x≈1049, agulha para o desvio da estação, polyline ancorada ao terreno. D4 do pass ferroviário é substituída por esta chegada (não altera posições de fogo: as MG34 estão no dique).
- **Risco.** Baixo. Mitigação: a composição autoritativa (65 vagões, horários) não muda; `tests/m01-train-consist-polish.test.js` continua a comparar posições com a base.
- **Dependências.** FX V3 (pool); T06 para os sons; T24 depois de re-basear o documento ferroviário.
- **Verificar.** `trainX(battleClock)` monótono e com paragem exacta; continuações às 04:44:30 e 04:46; capturas 10/17 antes/depois; draw calls ferroviários ≤12 com tudo visível.

### P11 · Tiro do jogador sem consequência (HIGH)

- **Problema.** Disparar produz som e nada mais: sem poeira/lascas no ponto de impacto, sem clarão/fumo na boca da própria arma, sem cápsula ejectada, sem hit marker; impactos em metal (treliça) e água nunca aparecem.
- **Causa.** `m01-simulation.js:612` emite `player-shot` com `point`, `material`, `hit` e `weapon`, mas `game.js` (130/168) só chama áudio; os clarões em `m01-view.js` são só para `team==='enemy'`; não há classificação `water`.
- **Solução.** Módulo `m01-player-fx.js`: impactos por material com os perfis de FX V3, clarão/fumo no socket da boca do viewmodel, cápsula com física simples de apresentação, hit marker discreto no HUD a partir de `hit:true`, material `water` por altura do ponto abaixo do rio (apresentação), atraso do som de impacto >60 m.
- **Risco.** Baixo. Mitigação: só lê o evento; nenhum campo novo necessário.
- **Dependências.** T15 (perfis de impacto), T04 (HUD).
- **Verificar.** Spec: um tiro contra o aterro, a treliça e o rio produz impacto do material certo; `fireEffects` no diagnóstico; captura com recorte.

### P12 · Arma e mãos em primeira pessoa (HIGH)

- **Problema.** Manga da farda aberta e braço a atravessar o enquadramento (14), mãos planas cor-de-rosa (01/05), mira com constante de tempo de 45 ms (salto), sway/bob mínimos, recuo e regresso pouco credíveis, transporte de Bąk como um bloco com coronha gigante (14).
- **Causa.** `m01-viewmodel.js`/`m01-wz29-presentation.js` (blend de mira, bob); malha de braços do kit de soldados usada no viewmodel sem variante de primeira pessoa; `carry_socket` sem clip de transporte em primeira pessoa.
- **Solução.** Sensação da arma (entrada/saída de mira 0,30/0,22 s com curva, sway de respiração, bob por marcha, recuo com regresso, abaixar junto a paredes por raio de apresentação, FOV 70→48 com transição) e braços dedicados (mangas fechadas, mãos com dedos e material de pele, punhos/correias) e pose de transporte própria. Verificar primeiro se `codex/m01-viewmodel-visual-v2` (1 ficheiro, não integrado) está superada pela versão integrada.
- **Risco.** Baixo. Mitigação: nada toca `wz29.js` (balística, cadência, ficha da arma).
- **Dependências.** Clips de transporte de T08 para a pose; nenhuma com ficheiros quentes.
- **Verificar.** Fixture do viewmodel (`tests/helpers/m01-viewmodel-fixture.js`) com curvas de mira/recuo; capturas 05 (mira real por input) e 14 antes/depois.

### P13 · Estação, barracão, abrigo, posto e props em caixas (HIGH)

- **Problema.** Barracão = caixa de madeira com laje preta (03/15); abrigo = muro de blocos com laje (16); posto avançado = caixas baixas (04); caixas e paletes = cubos (01/03); fogo do vagão = sprite; cerca = fio; sem plataforma, marquise, sinais, postes de telégrafo, grua de água, carroças nem civis/ferroviários. A estação está em curso (V3).
- **Causa.** `buildArchitecture`/`buildClutter`/`m01-environment-props.js` com primitivas; `grp_railway_workers` sem actores.
- **Solução.** Kits originais com LOD e colisores **iguais** às caixas actuais (barracão com telhado de duas águas/chaminé/porta/janela, abrigo escavado com revestimento de madeira e sacos, posto com parapeito de sacos/terra, exterior da casamata), kit de props (caixas, sacos, barris, postes com isoladores, cerca, lanternas, carroça, alavanca de agulha, sinal, grua de água, pilha de carvão, travessas empilhadas) e vida do pátio (BX-08/11/12: ferroviários com lanternas, posto de socorro, carroça, vagão a arder/queimado, fuligem e vidros na estação).
- **Risco.** Baixo/médio (capacidade dos lotes de actores com BX-08). Mitigação: subir lotes para 110 ou enviar distantes para impostores (T20).
- **Dependências.** Estação V3 fechada para a hookup em `m01-environment.js`; T12/T13 (assets) podem avançar já.
- **Verificar.** Capturas 02/03/07/08/15/16 antes/depois; rota e colisores iguais (`npm run assets:m01:colliders -- --check`, `verify-m01-route.mjs`); contadores.

### P14 · Ritmo e dados do roteiro (HIGH)

- **Problema.** No posto de disparo (x≈−290) o fogo alemão da fase de retirada não é gerado durante 199 s; as esperas totais da partida 3 somam 754,6/1083 s; a fala `dlg_m01_019` ("O posto da ponte levou uma bomba…") toca às 04:31 a menos que o jogador esteja a 15 m de Lipski; 018/038/048–049/051 têm saltos de continuidade; beats com `t` negativo disparam a 0; 26 dos 40 alemães nunca disparam para oeste.
- **Causa.** `m01-simulation.js:465` `west=p.x>-200` exclui o posto de disparo; horários em `mission.json`; `eastFire` dos atiradores do dique.
- **Solução.** Correcção cirúrgica dos dados e da condição `west` (incluir o posto de disparo e a rota até ao abrigo), re-timing das falas, `t` negativos convertidos em pré-roll explícito; cadências novas só em `display` (BX-01/09) sem tocar nas afinadas.
- **Risco.** Médio: altera o que o jogador sofre no posto de disparo. Mitigação: só a condição espacial muda, não a cadência; comparação de 12 sementes; invariantes de `m01-cover-threat`.
- **Dependências.** Nenhuma (onda 0).
- **Verificar.** Rota completa com tempos por fase registados (sem janela >60 s sem acontecimento audível/visível entre 04:46 e 06:45); falas na ordem do roteiro; A/B de futuros.

### P15 · HUD e menus de protótipo (MEDIUM)

- **Problema.** HUD com textos sem hierarquia, fonte Barlow declarada mas não carregada, sem cartelas/fades/avisos (candidato V1 por integrar), sem hit marker, sem ecrã de carregamento (bundle 1 218 kB + GLB), rodapé "PROTÓTIPO JOGÁVEL · MODELOS E ÁUDIO PROVISÓRIOS".
- **Causa.** `game.js` escreve directamente no DOM; `styles.css`; `main.js`.
- **Solução.** Integrar V1 (T04); depois fonte self-hosted, hit marker (T19), ecrã de carregamento com progresso real do `asset-manager`, menu de pausa com objectivo (já no V1), rodapé ligado a um flag de estado (fica até VALIDADA).
- **Risco.** Baixo.
- **Dependências.** T04 primeiro.
- **Verificar.** Specs de HUD do V1; captura do menu/carregamento; sem erros de consola.

### P16 · Pontes: aço preto, portais de brinquedo, tabuleiro de terra (MEDIUM)

- **Problema.** Treliça quase preta sem especular/rebites (12/13); portais com tijolo saturado liso e ameias sem pedra/cornija/sujidade (04/09/13); tabuleiro rodoviário com textura de solo (12); treliça sem impostor de longe.
- **Causa.** Materiais do kit `tools/assets/m01-bridges` (albedo escuro, roughness uniforme); `m01-bridge-portal-polish.js` V1 só detalhe geométrico.
- **Solução.** Kit de materiais V2 (tinta cinza-esverdeada sobre ferrugem com variação de roughness, faixas de rebites em normal, AO; tijolo dessaturado com argamassa, soco e cornijas de pedra, aduelas do arco, fuligem; superfície do tabuleiro em cubo/prancha; guardas), impostor da treliça para >800 m.
- **Risco.** Baixo (só materiais; geometria e colisores iguais).
- **Dependências.** T09 (pipeline de texturas).
- **Verificar.** `tests/m01-bridges-glb.test.js` (hash da layout, orçamentos); capturas 04/12/13 antes/depois às 04:30 e 06:10 (contraluz).

### P17 · Materiais e texturas (MEDIUM)

- **Problema.** 14 texturas canvas 512² (`m01-surfaces.js`) com tiling visível a 5 m, sem normal/roughness, cores saturadas (tijolo, vagões), sem decalques nem AO pintada.
- **Causa.** Geração em runtime no browser, resolução fixa, sem pipeline de atlas.
- **Solução.** Pipeline Node reprodutível (`tools/assets/m01-materials`) a gerar atlas 1024²/2048² (albedo/normal/ORM) com máscaras de variação e manifesto com SHA/licença, no padrão de `paint.mjs` dos soldados; biblioteca de materiais partilhada (terreno, balastro, tijolo, pedra, madeira, aço/ferrugem, lona); versão 1024² para Low.
- **Risco.** Baixo (memória: ≈24 MB por atlas descomprimido; registar bytes).
- **Dependências.** Nenhuma (onda 0); consumidores em T28/T14/T32/T33.
- **Verificar.** Teste do manifesto (tamanhos, bytes, licença); capturas a 5 m sem tiling visível.

### P18 · Água opaca (MEDIUM)

- **Problema.** O Vístula é uma caixa azul escura (12/13): sem reflexo do céu, fresnel, fluxo, espuma nas pilhas, margem húmida; sem detritos depois da demolição.
- **Causa.** Material simples em `m01-surfaces.js`/`m01-view.js`.
- **Solução.** Módulo `m01-water.js`: fresnel + reflexo do gradiente de céu (sem reflexão planar em Low), normais de fluxo animadas pelo relógio da simulação e vento dos dados, espuma/ondulação nas pilhas, mistura na margem, detritos (T18) e salpicos.
- **Risco.** Baixo.
- **Dependências.** T16 (céu) para o reflexo; T18 para detritos.
- **Verificar.** Capturas 12/13 antes/depois às 06:05 e 04:30; pausa congela a água.

### P19 · Transições de LOD a saltar (MEDIUM)

- **Problema.** Actores saltam entre LOD0/1/2 a 15/40/45 m e para proxies a 100/130/160 m; comboios e vagões do desvio aparecem por flag; partes das pontes trocam a 400/800 m; árvores trocam sem fundido; Low e High quase iguais.
- **Causa.** Escolhas de LOD por módulo sem política comum, sem histerese (excepto vegetação) nem dither.
- **Solução.** Política única por preset (distâncias, histerese 15 %, fundido por dither/alpha de 0,3 s pelo relógio), aplicada a actores, árvores, props, comboios e partes; Low com poupanças reais (sombras, cascatas, partículas, relva).
- **Risco.** Baixo.
- **Dependências.** Depois das ondas 1–2 (os sistemas novos adoptam a política ao nascer).
- **Verificar.** Teste puro da função de LOD; câmara parada 10 s sem flicker nas continuações; contadores por preset.

### P20 · Desempenho desconhecido (MEDIUM, gate transversal)

- **Problema.** Nunca houve uma medição de FPS no Chromebook; o chão é sempre desenhado (≈323 k triângulos); 70–509 draw calls e 365 k–962 k triângulos por vista; bundle 1 218,61 kB; mapa de sombra em todas as vistas.
- **Causa.** Benchmark existe numa branch não integrada (`codex/m01-chromebook-benchmark`), nunca corrido no aparelho; sem orçamento declarado.
- **Solução.** Baseline no Chromebook **antes** das ondas (T01), orçamento por preset derivado dela, e um pass de desempenho depois das ondas 1–2 (chão em blocos com culling, passes de sombra, fusão de materiais, code-splitting do bundle, Low real), nova medição no closeout.
- **Risco.** Alto se ignorado (tudo o resto soma instâncias). Mitigação: cada tarefa publica contadores; nenhuma declara FPS.
- **Dependências.** Captain com o aparelho.
- **Verificar.** `docs/verification/m01-runtime/chromebook-baseline-<data>/` com aparelho, Chromium, preset, cenas e tempos de frame; repetição no closeout.

---

## 6. Tasks

Convenções comuns a todas as tasks (não repetidas em cada ficha): branch própria a partir do trunk indicado pelo Captain, confirmar HEAD remoto, PR pequeno para esse trunk (nunca `main`, nunca deploy); `npm test`, `npm run build`, suíte focada de navegador com BEFORE na base exacta e AFTER no HEAD, retries 0, skips novos 0; evidência em `docs/verification/m01-runtime/<task>/` com capturas inspeccionadas e contadores de `gameDiagnostics()`; actualizar `DEVELOPMENT_STATUS.md` e `docs/NEXT_CHAT_CONTEXT.md`; nenhum FPS declarado; bancada francesa, `Simulation`, `tick`, RNG, gates, CP-A..D e IDs intocados salvo onde a task o diz; assets originais ou CC0/CC-BY com ficha por ficheiro; nada de COD. **Modelo/esforço** segue a convenção do repositório: `GPT-6.1 Sol` para autoridade/dados/validador, `Claude Code` para kits de assets, módulos novos e evidência, `GPT-5.6 Sol` para polimento em módulos de FX/atmosfera/vista existentes, `Captain` para o que exige humano.

### Onda 0 — já, sem conflito com o trabalho em curso

#### T00 · `M01-PLANS-CONSOLIDATION-V1`
- **Objectivo:** trazer para o trunk os quatro documentos paralelos (animação, batalha, ferroviário, áudio) e este roadmap, para que todos os TASK_IDs resolvam num só lugar.
- **Scope:** merge das branches só-documentação; nota no pass ferroviário a dizer que o diagnóstico é anterior ao HEAD (ver T24); índice em `docs/NEXT_CHAT_CONTEXT.md`.
- **Ficheiros:** `docs/**`, `missions/m01-tczew/*.md`, `DEVELOPMENT_STATUS.md`.
- **Não alterar:** `src/**`, dados executáveis.
- **Aceitação:** `npm test` verde; os cinco documentos acessíveis no trunk; nenhum conflito de conteúdo não resolvido.
- **Verificação:** diff só em docs.
- **Modelo/esforço:** Claude Code · LOW. **Depende de:** —.

#### T01 · `M01-CHROMEBOOK-FPS-BASELINE-V1`
- **Objectivo:** primeira medição real de tempo de frame no Chromebook de referência, que fixa o orçamento de tudo o que se segue.
- **Scope:** reutilizar o instrumento de `codex/m01-chromebook-benchmark` (só a ferramenta, re-baseada), cenas: início 04:30, bombardeio 04:34, reparo sob fogo 04:50, tabuleiro 06:05, demolição oeste 06:45; três presets; registar aparelho, versão do Chromium, resolução, tempos de frame (média/P95), contadores.
- **Ficheiros:** `tools/m01-chromebook-benchmark.mjs` (re-base), `docs/verification/m01-runtime/chromebook-baseline-<data>/`, `RUNBOOK.md`.
- **Não alterar:** `src/**`.
- **Aceitação:** relatório com números reais por cena/preset; orçamento proposto por preset (ms por frame, draw calls, triângulos) escrito no roadmap.
- **Verificação:** o relatório identifica a sessão (humano + aparelho); sem FPS "estimados".
- **Modelo/esforço:** Captain (sessão) + Claude Code · LOW (ferramenta/relatório). **Depende de:** —.

#### T02 · `M01-SCRIPT-DATA-CONTINUITY-FIX-V1`
- **Objectivo:** eliminar os buracos de ritmo e as contradições de diálogo que vêm dos dados e de uma condição espacial.
- **Scope:** condição `west` em `m01-simulation.js:465` passa a cobrir o posto de disparo e a rota até ao abrigo (sem mudar cadências); re-timing de `dlg_m01_018/019/038/048/049/051`; beats com `t` negativo convertidos em pré-roll explícito; registo em `ENGINE_CONTRACT.md`.
- **Ficheiros:** `src/game/m01-simulation.js` (condição e leitura de beats), `missions/m01-tczew/mission.json`, `tests/m01-runtime.test.js`, `tests/m01-cover-threat.test.js`, `tests/m01-tczew-data.test.js`.
- **Não alterar:** cadências de fogo, dano, supressão, gates, CP-A..D, RNG, schema.
- **Aceitação:** no posto de disparo durante a retirada há fogo alemão com a cadência já afinada; nenhuma janela >60 s sem acontecimento entre 04:46 e 06:45 na rota automática; falas na ordem do roteiro; 019 nunca antes da bomba.
- **Verificação:** `tools/verify-m01-route.mjs` com tempos por fase; `tools/m01-cover-comparison.mjs` (12 sementes, invariantes iguais); `compareContinuation` nos instantes alterados; saves antigos válidos.
- **Modelo/esforço:** GPT-6.1 Sol · HIGH. **Depende de:** —.

#### T03 · `M01-BLAST-DATA-GROUNDING-V1`
- **Objectivo:** bombas e granadas com dados coerentes com o terreno e com o fumo que o roteiro pede.
- **Scope:** bomba do posto avançado (`y:-10`) e `raid_0530` (`y:0`) ancoradas à altura do terreno no ponto (`heightAt`), mantendo x/z e o instante; registos de granada em `sectors.damage` marcados como fumo efémero (≤20 s) ou sem fumo persistente; validador aceita o campo.
- **Ficheiros:** `missions/m01-tczew/mission.json`, `src/game/m01-simulation.js` (`impact`), `src/game/grenade.js`, testes de dados/runtime.
- **Não alterar:** raio de dano, `safeImpact`, instantes, IDs.
- **Aceitação:** os três pontos de explosão ficam a ≤0,2 m do terreno; granadas não deixam colunas de 240 s; saves antigos com registos de granada continuam válidos (fumo cai para o novo limite).
- **Verificação:** teste de dados; continuação às 04:34:30 e após uma granada com `smokePuffs` por registo; A/B de futuros.
- **Modelo/esforço:** GPT-6.1 Sol · MEDIUM. **Depende de:** —. Mesmo lane que T02 (sequenciar).

#### T04 · `M01-HUD-CINEMATIC-PASS-V1-REVIEW-MERGE`
- **Objectivo:** integrar o candidato `a42ee07` (cartelas, fades, letterbox, avisos de objectivo, checkpoint, cartela de retoma, pips, vida baixa).
- **Scope:** re-base sobre o trunk; rever `src/ui/m01-hud.js` contra a regra "só lê a simulação"; correr os seus testes Node e o spec de navegador; corrigir o que falhar; registar limitações (fonte, hit marker ficam para T50/T19).
- **Ficheiros:** os do candidato (`index.html`, `src/main.js`, `src/game/game.js`, `src/styles.css`, `src/ui/m01-hud.js`, testes, `tools/verification/m01-hud-capture.mjs`).
- **Não alterar:** `m01-simulation.js`, cenas, objectivos.
- **Aceitação:** intro com ecrã preto → cartelas → fade-in; chamada com cartela 07:05 e fade para o debrief; banner por objectivo; pausa congela tudo; `hudPresentation` no diagnóstico; nenhum texto da simulação alterado.
- **Verificação:** `tests/m01-hud-presentation.test.js`, `tests/browser/m01-hud-presentation.spec.js`, capturas da intro/chamada; rota completa inalterada.
- **Modelo/esforço:** Claude Code · MEDIUM. **Depende de:** —.

#### T05 · `M01-AUDIO-DATA-FIELDS-V1` (= plano de áudio T0)
- **Objectivo:** os campos de dados que o áudio precisa, sem comportamento novo.
- **Scope:** `npc-shot.weapon`, `m01-blast.kind`, `round-impact.pass`; `audioEmitters` com `activeFrom/Until` (incl. ckm da casamata como dramatização); `audioZones` e `surfaces` em `map-layout.json`; `ENGINE_CONTRACT.md`.
- **Ficheiros:** `src/game/m01-simulation.js`, `src/game/m01-fire.js`, `missions/m01-tczew/mission.json`, `map-layout.json`, testes de dados/runtime.
- **Não alterar:** schema do save (nenhum campo novo no snapshot), cadências, dano.
- **Aceitação:** eventos com os campos; validador aceita/exige; snapshots antigos válidos; hash da layout nas pontes actualizado de forma controlada (`tests/m01-bridges-glb.test.js`).
- **Verificação:** `npm test`; A/B de futuros.
- **Modelo/esforço:** GPT-6.1 Sol · MEDIUM. **Depende de:** —. Mesmo lane que T02/T03.

#### T06 · `M01-AUDIO-CORE-V1` (= plano de áudio T1 + T2)
- **Objectivo:** núcleo Web Audio de produção com fallback para a síntese actual.
- **Scope:** `src/core/audio/` (contexto, buses, limiter, duck, reverb sintética, pool com prioridades e steal, atenuação por família, scheduler em `sim.clock`, manifesto por patamar, `presentation-random`, `synth-fallback` sem `Math.random`); `src/game/audio-director-m01.js`; `src/core/audio.js` mantém a API da bancada.
- **Ficheiros:** novos acima + bridge mínimo em `src/game/game.js`.
- **Não alterar:** som/comportamento da bancada francesa; nenhuma leitura de `sim.rng`.
- **Aceitação:** testes Node com `FakeAudioContext` (atenuação, steal, determinismo, loops por fase, fallback); todo `enemy-fire` produz pedido com atraso `d/343`; `dropped` <2 % na retirada com 32 vozes; o jogo nunca fica mudo.
- **Verificação:** `tests/audio-core.test.js`, `tests/m01-audio-director.test.js`; spec de navegador com `gameDiagnostics().audio` (estado, vozes, erros 0).
- **Modelo/esforço:** Claude Code · HIGH. **Depende de:** T05 (campos; pode começar com stubs).

#### T07 · `M01-ANIM-CONTRACT-SIM-V1` (= plano de animação TASK A)
- **Objectivo:** contrato de apresentação por actor na simulação (`motion`, `bodyYaw`, `posture/postureSince`, `suppressedAt`, `hitAt/hitYaw`, `diedAt/deathYaw`, `reload`, `cover`, `carry`).
- **Scope:** Anexo A do plano; um ponto de escrita no fim de `updateActors`; validação atómica; defaults para saves antigos; hitboxes para `posture='prone'`.
- **Ficheiros:** `src/game/m01-simulation.js`, `src/world/spatial.js` (só prone), testes de contrato/determinismo, `ENGINE_CONTRACT.md`.
- **Não alterar:** renderer, clips, combate, gates, CP-A..D, mapa; velocidade de transporte de Bąk só com decisão do Captain (Anexo B).
- **Aceitação:** I1, I9, I10, I15 do plano provados; `tests/m01-schema2-determinism.test.js` verde; rotas completas com resultados iguais.
- **Verificação:** `compareContinuation` durante marcha/giro/flinch/morte/recarga; corrupção; legacy.
- **Modelo/esforço:** GPT-6.1 Sol · HIGH. **Depende de:** —. Mesmo lane que T02/T03/T05 (sequenciar).

#### T08 · `M01-ANIM-CLIP-LIBRARY-V2` (= TASK C)
- **Objectivo:** clips novos do Anexo B do plano (sprint, crouch walk, turn, transições de postura, prone, mortes, flinches, idles, fidgets, cobertura, transporte, chamada) com metadados medidos.
- **Scope:** `tools/assets/m01-soldiers/src/clips.mjs` e geradores; galeria por clip; manifesto com SHA dos ficheiros preservados.
- **Ficheiros:** `tools/assets/m01-soldiers/**`, `assets/models/provisional/m01/characters/**`, `tests/m01-soldiers-glb.test.js`, `docs/assets/m01-soldiers/`.
- **Não alterar:** `src/**`, clips existentes (byte a byte), cabeças/equipamento/variação.
- **Aceitação:** todos os clips com `extras` coerentes com a auditoria a 240 Hz; continuidade nos extremos; pés ≤15 mm nos contactos; capturas inspeccionadas.
- **Verificação:** teste GLB; `tools/verification/m01-animation-clip-audit.mjs`.
- **Modelo/esforço:** Claude Code · HIGH. **Depende de:** —.

#### T09 · `M01-TEXTURE-AUTHORING-PIPELINE-V1`
- **Objectivo:** pipeline Node reprodutível de atlas de materiais (albedo/normal/ORM) e biblioteca partilhada, para substituir as 14 texturas canvas 512².
- **Scope:** `tools/assets/m01-materials` (gerador determinístico, padrão `paint.mjs`), famílias: terreno (campo/prado/lama/trilho), balastro, tijolo dessaturado + argamassa, pedra, madeira, aço pintado/ferrugem, lona, telha/cartão asfáltico; 2048²/1024² + versão 1024²/512² para Low; manifesto com bytes/SHA/licença; `src/render/materials.js` ganha um registo de materiais que lê o manifesto (sem trocar consumidores ainda).
- **Ficheiros:** `tools/assets/m01-materials/**`, `assets/textures/m01/**` (novo), `src/render/materials.js`, teste do manifesto.
- **Não alterar:** aspecto actual (os consumidores só mudam em T28/T14/T32/T33).
- **Aceitação:** atlas gerados em CI; bytes totais registados (≤40 MB descomprimidos no conjunto High); teste verde.
- **Verificação:** `npm test`; viewer com capturas a 1/5/20 m sem tiling visível.
- **Modelo/esforço:** Claude Code · HIGH. **Depende de:** —.

#### T10 · `M01-VEGETATION-KIT-V1`
- **Objectivo:** kit de vegetação original com silhuetas reais e LOD/impostores.
- **Scope:** 3 espécies genéricas de planície (porte de choupo, salgueiro, carvalho) × LOD0/1/2 + cartões impostores cruzados, 2 arbustos, cartões de relva e caniço com atributo de vento; atlas de folhagem com alpha; manifesto; galeria.
- **Ficheiros:** `tools/assets/m01-vegetation/**`, `assets/models/provisional/m01/vegetation/**`, `tests/m01-vegetation-glb.test.js`, `docs/assets/m01-vegetation/`.
- **Não alterar:** `src/**`, layout de decoração.
- **Aceitação:** orçamentos por LOD (árvore LOD0 ≤2 500, LOD2 ≤120 triângulos, impostor 8), alpha correcta, capturas do viewer.
- **Verificação:** teste GLB; viewer.
- **Modelo/esforço:** Claude Code · HIGH. **Depende de:** T09 (atlas), pode começar antes.

> T11 (re-base do pass ferroviário) foi fundida no passo 1 de T24; a numeração salta de propósito para manter as referências das tabelas.

#### T12 · `M01-PROP-KIT-V1`
- **Objectivo:** props originais para substituir caixas e fios.
- **Scope:** caixas de munição/mantimentos (3), sacos de areia (recto/canto/rebentado), barris, postes de telégrafo com isoladores e fio, cerca de madeira/arame, lanternas, carroça de mão e carroça de cavalo (silhueta), alavanca de agulha, sinal mecânico, grua de água, pilha de carvão, travessas empilhadas, bidões; LOD0/1; manifesto.
- **Ficheiros:** `tools/assets/m01-props/**`, `assets/models/provisional/m01/props/**`, teste GLB, `docs/assets/m01-props/`.
- **Não alterar:** `src/**`.
- **Aceitação:** orçamentos (LOD0 ≤1 500, LOD1 ≤300), capturas do viewer.
- **Modelo/esforço:** Claude Code · HIGH. **Depende de:** T09 (opcional).

#### T13 · `M01-FIELD-STRUCTURES-KIT-V1`
- **Objectivo:** barracão, abrigo, posto avançado e exterior da casamata como estruturas credíveis com colisores **iguais** aos actuais.
- **Scope:** barracão ferroviário (telhado de duas águas, chaminé, porta, janela, bancada), abrigo escavado (revestimento de madeira, sacos, entrada em L, interior escuro), posto avançado (parapeito de sacos/terra, estrutura de madeira, estado `destroyed`), casamata (betão com seteira, terra por cima); LOD0/1/2; bounds exportados e comparados com as caixas de `TczewWorld`.
- **Ficheiros:** `tools/assets/m01-field-structures/**`, `assets/models/provisional/m01/structures/**`, teste GLB com comparação de bounds, `docs/assets/m01-field-structures/`.
- **Não alterar:** `src/**`, `map-layout.json`, colisores.
- **Aceitação:** bounds dentro de ±5 cm dos colisores actuais; orçamentos; capturas do viewer.
- **Modelo/esforço:** Claude Code · HIGH. **Depende de:** T09 (opcional).

#### T14 · `M01-BRIDGE-MATERIAL-KIT-V2`
- **Objectivo:** materiais de produção para treliças, portais e tabuleiro, sem tocar na geometria nem nos colisores.
- **Scope:** regenerar o kit de pontes com aço pintado/ferrugem (roughness variável, rebites em normal, AO), tijolo dessaturado com argamassa + soco/cornijas/aduelas de pedra + fuligem, superfície do tabuleiro rodoviário (cubos/pranchas) e ferroviário, guardas; versão Low; manifesto.
- **Ficheiros:** `tools/assets/m01-bridges/**`, `assets/models/**/m01-bridges/**`, `docs/assets/m01-bridges/`, `tests/m01-bridges-glb.test.js` (orçamentos), `src/render/m01-bridge-portal-polish.js` só se um material o exigir.
- **Não alterar:** geometria, colisores, `map-layout.json`, `renderState.parts`.
- **Aceitação:** hash da layout igual; colisores `--check` verde; capturas 04/12/13 às 04:30 e 06:10 sem aço preto nem tijolo saturado.
- **Modelo/esforço:** Claude Code · HIGH. **Depende de:** T09.

### Onda 1 — depois de integrar FX V3 (liberta `m01-view.js` e `m01-atmosphere.js`)

#### T15 · `M01-FX-V3-INTEGRATION-GATE`
- **Objectivo:** integrar `codex/m01-battlefield-fx-polish-v3` (com `M01-FX-CAPTURE-TIMING-FIX-V1`) e dizer exactamente o que ficou fechado de P9.
- **Scope:** re-base, suíte focada V3 + Node integral; tabela "fechado/aberto" para: duração do flash a 771 m, luz da explosão, feedback >180 m, cor das lascas, soft particles/ordenação, fumo de granada (dados, T03).
- **Ficheiros:** os do candidato.
- **Não alterar:** nada fora do candidato.
- **Aceitação:** CI verde; tabela publicada; T18/T19 reescritas se necessário.
- **Modelo/esforço:** GPT-5.6 Sol · MEDIUM. **Depende de:** fix de timing das capturas.

#### T16 · `M01-LIGHTING-DAWN-V1`
- **Objectivo:** madrugada e nascer do Sol legíveis em todas as fases, com sombras desde 04:30.
- **Scope:** extrair `lighting()` para `src/render/m01-lighting.js`; céu por altitude solar (zénite/horizonte/halo/disco), hemisférica derivada, direccional de crepúsculo com sombras antes do nascer, duas cascatas (Medium/High) e uma (Low), nevoeiro por direcção de vista no shader da atmosfera, exposição por fase, deriva das nuvens por vento dos dados, remoção da estrela no zénite e da costura.
- **Ficheiros:** `src/render/m01-view.js` (chamada), novo `m01-lighting.js`, `src/render/m01-atmosphere.js` (sky/fog), `src/render/three-renderer.js` (mapas de sombra), `map-layout.json` → `weather.wind` (dados).
- **Não alterar:** keyframes do Sol (`map-layout.sun`, fonte C01), alcances do nevoeiro usados por testes, simulação.
- **Aceitação:** capturas 04:30/04:45/05:30/06:10/07:05 com luz distinta; sombras de contacto na vista 01; sem bandas; Low sem custo novo; contadores publicados.
- **Verificação:** teste puro do modelo de céu por altitude; spec com as cinco continuações; `M01_BASELINE_CAPTURE` na base.
- **Modelo/esforço:** GPT-5.6 Sol · HIGH. **Depende de:** T15.

#### T17 · `M01-STUKA-DIVE-SEQUENCE-V1` (= BX-04)
- **Objectivo:** os Ju 87 seguem o `stukaPath`, mergulham, largam bombas visíveis e partem; sem laço.
- **Scope:** extrair `updateAircraft` para `src/render/m01-aircraft.js`; `t = clock − consumed[bombing_0434] + 42` (+3,5 s e +7 s), aproximação ancorada em `planes_heard`, inclinação pela tangente, hélice, sirene por avião (ID de áudio), silvo e bomba visível 1,5 s antes de cada `m01-blast` aéreo até ao ponto/instante autoritativo, partida para leste; segunda passagem só som; `raidPlane` e `time%` removidos; Do 17 do raid 05:30 numa passagem alta (apresentação de T25).
- **Ficheiros:** `src/render/m01-view.js`, novo `m01-aircraft.js`, `tests/m01-aircraft.test.js`, spec de navegador.
- **Não alterar:** instantes das bombas, `safeImpact`, kit do Ju 87.
- **Aceitação:** posições no caminho em instantes conhecidos; reload às 04:35 reproduz; `grep "time%" src/render` vazio; captura 06 com três aviões em formação e uma bomba a cair.
- **Modelo/esforço:** Claude Code · HIGH. **Depende de:** T15, T03; T06 para a sirene (opcional).

#### T18 · `M01-DEMOLITION-SETPIECE-V2`
- **Objectivo:** as duas demolições lêem-se a qualquer distância e deixam rasto.
- **Scope:** colapso dos vãos derivado de `consumed[...]` (queda/rotação 2–4 s, determinística, só apresentação sobre `renderState.parts`), detritos e salpicos no rio a 700–800 m (t≈4 s), tamanho mínimo e duração do flash/luz por distância, flash de exposição e tremor além de 180 m ao chegar o som, chuva de terra no posto de disparo após a oeste, poeira em suspensão; lascas com cor; gancho para os 2 s de silêncio (áudio).
- **Ficheiros:** `src/render/m01-atmosphere.js`, `m01-combat-feedback.js`, `m01-view.js` (partes), `m01-battlefield-fx-profile.js`, testes e spec.
- **Não alterar:** `renderState.parts`, instantes, dano, nós de cobertura.
- **Aceitação:** capturas 14 (762 m) e 15 (362 m) com flash, coluna e colapso legíveis; pausa a meio do colapso congela; orçamentos de partículas respeitados.
- **Modelo/esforço:** GPT-5.6 Sol · HIGH. **Depende de:** T15.

#### T19 · `M01-PLAYER-SHOT-FEEDBACK-V1`
- **Objectivo:** cada tiro do jogador tem impacto, clarão, cápsula e, quando acerta, hit marker.
- **Scope:** `src/render/m01-player-fx.js` lê `player-shot` (`point`, `material`, `hit`); impactos com os perfis de V3; clarão/fumo no socket da boca do viewmodel; cápsula ejectada (apresentação); material `water` por altura do ponto; hit marker no HUD (0,15 s, discreto); atraso do som de impacto >60 m.
- **Ficheiros:** novo `m01-player-fx.js`, `src/game/game.js` (ligação), `src/render/m01-viewmodel.js` (sockets), `src/ui/m01-hud.js` (marker), testes/spec.
- **Não alterar:** `wz29.js`, `fire()`, `player-shot` (campos já existem).
- **Aceitação:** tiro no aterro/treliça/rio produz o impacto certo; clarão visível em primeira pessoa; marker só com `hit:true`.
- **Modelo/esforço:** Claude Code · HIGH. **Depende de:** T15, T04.

#### T20 · `M01-DISTANT-FRONT-IMPOSTORS-V1` (= BX-02)
- **Objectivo:** humanos a mais de ~350 m deixam de ser invisíveis: silhuetas com tamanho mínimo.
- **Scope:** `src/render/m01-impostors.js` com `InstancedMesh` de quads virados para a câmara, altura `max(3 px, 1,7 m)`, três posturas, passo por ID, contraste mínimo na névoa, contraluz 05:30–06:40; capacidade 128/96/64.
- **Ficheiros:** novo módulo + chamada em `m01-view.js`/`m01-characters.js` (só hand-off por distância), teste puro do tamanho, spec com recorte 4×.
- **Não alterar:** hitboxes, LOS, lotes de corpos abaixo de 350 m.
- **Aceitação:** vista 10 com o pelotão/alemães visíveis a 1,1 km; vista 12 com alemães no tabuleiro a 600–700 m.
- **Modelo/esforço:** Claude Code · MEDIUM. **Depende de:** T15 (conflito em `m01-view.js`).

#### T21 · `M01-AMBIENT-DIRECTOR-V1` (= BX-00 apresentação + BX-03 + BX-05)
- **Objectivo:** a guerra ouve-se e vê-se à volta: camas sonoras, frases por sector, clarões no horizonte norte, estados de mistura.
- **Scope:** `src/render/m01-ambient.js` (`AmbientDirector` com RNG próprio semeado), `missions/m01-tczew/battlefield-ambience.json`, diagnóstico `ambient`; usa o `AudioMix` de T06.
- **Ficheiros:** novos + `game.js` (diag) + `m01-view.js` (chamada).
- **Não alterar:** simulação (lê `battleReadout` de T22), cadências reais.
- **Aceitação:** teste de não-escrita (`deepEqual` do snapshot antes/depois de N updates); determinismo dos geradores; continuação às 05:52 com `ambient.flashes>0`.
- **Modelo/esforço:** Claude Code · HIGH. **Depende de:** T06, T22.

#### T22 · `M01-BATTLE-READOUT-AND-DISPLAY-ROUNDS-V1` (= BX-00 engine)
- **Objectivo:** leitura da batalha para a apresentação e tiros de exibição como dados.
- **Scope:** `get battleReadout()`, `sector-event`, `ROUND_KINDS` com `display`/`attrition`, `by` de aliados, `landRound` ignora `display`, `renderState.ambient`, `firedAt` em Kowal.
- **Ficheiros:** `src/game/m01-simulation.js`, `src/game/m01-fire.js`, testes.
- **Não alterar:** cadências sobre reparo/jogador/secção/salva/tabuleiro; dano; supressão.
- **Aceitação:** `display` nunca aterra/suprime/fere (teste); saves antigos válidos; tecto de 200 tiros em voo respeitado.
- **Modelo/esforço:** GPT-6.1 Sol · MEDIUM. **Depende de:** T02 (mesmo lane).

#### T23 · `M01-EAST-FRONT-VISIBLE-V1` (= BX-01)
- **Objectivo:** frente leste com pelotão em posição, traçantes nos dois sentidos, desgaste 24→18 e Panzerzug só contra leste.
- **Scope:** conforme BX-01; `grp_panzerzug` novo grupo; `holdPositions`/`fireProfile` nos dados.
- **Ficheiros:** `src/game/m01-simulation.js`, `missions/m01-tczew/mission.json`, testes de cobertura/sectores.
- **Não alterar:** `m01.east_platoon_survivors` (flag 12–18), prontidão da demolição leste, cadências afinadas.
- **Aceitação:** exactamente 6 baixas nos IDs 18–23 antes das 05:56; nenhuma `display` aterra; 90 s "a olhar para trás"; 12 sementes iguais; continuação às 04:47 com traçantes dos dois lados.
- **Modelo/esforço:** GPT-6.1 Sol · HIGH. **Depende de:** T22; T20 para ver.

#### T24 · `M01-TRAIN-ARRIVAL-AND-LIFE-V1` (= BX-07 + pass ferroviário D3, re-baseado)
- **Objectivo:** o trem 963 e o Panzerzug chegam, fumegam, acendem e soam.
- **Scope:** passo 1: re-basear `docs/railway/*` no HEAD (o que já existe) e fechar D1–D10 (Anexo B); passo 2: chegada por `battleClock` antes do flag (04:43:30→04:45, 04:51→04:52) com paragem exacta na posição autoritativa, lâmpada frontal `fog:false`, fumo de carvão/vapor no pool com tectos (12/18/24), coluna do Panzerzug, sons `veh.train.*` com atraso; "manobra parada" a oeste.
- **Ficheiros:** `src/render/m01-locomotive.js`, `m01-panzerzug.js`, `m01-train-wagons.js` (deslocamento de chegada), `m01-atmosphere.js` (emissores), `docs/railway/*`.
- **Não alterar:** composição (65 vagões, posições finais), horários, `renderState`, colisores.
- **Aceitação:** `trainX(battleClock)` monótono e com paragem exacta; `tests/m01-train-consist-polish.test.js` continua a comparar as posições finais com a base; continuações às 04:44:30 e 04:46; vista 10 com fumo e lâmpada a 1 km; draw calls ferroviários ≤12.
- **Modelo/esforço:** Claude Code · HIGH. **Depende de:** T15; T06 (sons, opcional).

#### T25 · `M01-RAID-0530-SCHEDULE-V1` (= BX-06)
- **Objectivo:** o raid das 05:30 são 5–7 impactos agendados sobre a cidade, com fumo persistente e névoa.
- **Scope:** `timers.raidSchedule` com RNG da simulação, `raidTargets` nos dados, `smokeVisible` para o prefixo, validador; apresentação em T17/T21.
- **Ficheiros:** `src/game/m01-simulation.js`, `mission.json`, testes.
- **Não alterar:** CP-C, `safeImpact`, área jogável.
- **Aceitação:** N impactos até 05:34, todos fora da área jogável, sem duplicados após restauro a meio; continuação às 05:36 com ≥4 colunas a oeste.
- **Modelo/esforço:** GPT-6.1 Sol · MEDIUM. **Depende de:** T03 (mesmo lane).

#### T26 · `M01-SCENE-BEATS-PRESENTATION-V1`
- **Objectivo:** os beats `action` das cutscenes passam a cues de apresentação (sem rodar a câmara).
- **Scope:** tabela de cues por beat em `mission.json` (campo só de apresentação: letterbox, escurecer HUD, prompt de olhar com rumo, tremor ao chegar o som, pausa de legendas), lidas por `m01-hud.js`/`game.js` a partir de `scene.elapsed`; beats com `t` negativo já corrigidos por T02; tarefas de NPC por beat ficam em T34.
- **Ficheiros:** `src/ui/m01-hud.js`, `src/game/game.js`, `missions/m01-tczew/mission.json` (cues), testes/spec.
- **Não alterar:** `m01-simulation.js` (os beats `action` continuam sem efeito de gameplay), câmara.
- **Aceitação:** cada cutscene tem pelo menos letterbox + um cue visível; pausa congela; capturas das quatro cenas livres.
- **Modelo/esforço:** Claude Code · MEDIUM. **Depende de:** T04, T02.

### Onda 2 — depois de fechar Estação V3 e Variação V2 (liberta `m01-environment.js` e `m01-characters.js`)

#### T27 · `M01-TERRAIN-RELIEF-OUTSIDE-ENVELOPE-V1`
- **Objectivo:** relevo natural fora do envelope de gameplay, com `heightAt` provadamente igual dentro dele.
- **Scope:** definir o envelope (união de posições/rotas/origens de fogo/nós de cobertura/área jogável + margem 20 m) em dados; relevo de apresentação por semente fora dele (ondulação dos campos, perfil das margens, bermas); chão em blocos com culling; saia até ao nevoeiro.
- **Ficheiros:** `src/world/tczew-world.js` (`terrainHeightAt` com envelope), `src/render/m01-environment.js` (malha em blocos), `map-layout.json` (envelope), testes de grelha e determinismo.
- **Não alterar:** alturas dentro do envelope, colisores, `heightAt` usado por actores.
- **Aceitação:** grelha de 1 m dentro do envelope com diferença 0; A/B de futuros nas duas rotas; 12 sementes iguais; vistas 01/09/17 com horizonte modelado; triângulos do chão por vista ≤ metade dos actuais na área jogável.
- **Modelo/esforço:** GPT-6.1 Sol · HIGH (envelope e provas) + Claude Code (malha). **Depende de:** Estação V3.

#### T28 · `M01-TERRAIN-MATERIAL-MACRO-V1`
- **Objectivo:** solo com macro-variação, trilhos, balastro e margem húmida, sem tiling.
- **Scope:** material de terreno com os atlas de T09 (máscara macro campo/prado/lama, trilhos gastos pelas rotas dos dados, faixa de balastro junto às vias, banda húmida junto ao rio, normal de detalhe, triplanar em taludes); Low só macro.
- **Ficheiros:** `src/render/m01-environment.js`, `m01-surfaces.js`, `materials.js`.
- **Não alterar:** geometria, colisores.
- **Aceitação:** capturas a 1/5/50 m sem tiling; contadores de texturas por preset.
- **Modelo/esforço:** Claude Code · HIGH. **Depende de:** T09, Estação V3.

#### T29 · `M01-VEGETATION-RUNTIME-V2`
- **Objectivo:** árvores com silhueta, nas duas margens, relva e arbustos perto, impostores longe.
- **Scope:** ligar T10 em `buildTreeBatches`/`buildGroundClusters`: LOD por distância com histerese, impostores a partir de 120 m, linhas de árvores ao longo de estradas/linha/margens (incl. leste), caniços nas margens, relva instanciada ≤40 m com vento; tectos por preset; substitui esferas e tufos.
- **Ficheiros:** `src/render/m01-environment.js`, `src/world/m01-decoration-layout.js` (distribuição), testes.
- **Não alterar:** colisão (vegetação continua não sólida), rotas.
- **Aceitação:** vistas 01/04/09/15/16 sem esferas; contadores por preset; rota igual.
- **Modelo/esforço:** Claude Code · HIGH. **Depende de:** T10, Estação V3.

#### T30 · `M01-FAR-LANDSCAPE-V1`
- **Objectivo:** Tczew e Lisewo existem no horizonte.
- **Scope:** `src/render/m01-far-landscape.js`: massas da cidade a oeste (telhados, torres, chaminés) para lá de x −460, Lisewo a leste para lá de 1 800, linhas de árvores, bandas de bruma por altitude ligadas a T16, saia de terreno; `farAnchors` como direcções de referência; LOD único; só fora do envelope.
- **Ficheiros:** novo módulo + chamada em `m01-view.js`.
- **Não alterar:** área jogável, colisores.
- **Aceitação:** vistas 01/10/17 com horizonte; custo ≤10 draw calls.
- **Modelo/esforço:** Claude Code · HIGH. **Depende de:** T16, T27.

#### T31 · `M01-TRACK-BED-V2`
- **Objectivo:** via principal credível e contínua com o tabuleiro.
- **Scope:** travessas a 0,63 m (Low 1,26), faixa de balastro contínua, perfil de carril ao longo das polylines com talas a cada 15 m, continuidade com os carris do tabuleiro em x=0 e x≈1049 (bitola/offset iguais), agulha para o desvio da estação, polyline leste ancorada ao terreno, junção com a via própria do trem (z −2,5).
- **Ficheiros:** `src/render/m01-environment.js` (`buildTracks`), `src/render/m01-train-consist-detail.js` (junção), testes.
- **Não alterar:** `map-layout.json` (polylines), colisores, posições dos comboios.
- **Aceitação:** sem degrau nos encontros (captura a 5 m); draw calls de via ≤4; vista 10 antes/depois.
- **Modelo/esforço:** Claude Code · MEDIUM. **Depende de:** Estação V3.

#### T32 · `M01-FIELD-STRUCTURES-RUNTIME-V1`
- **Objectivo:** ligar o kit de T13 (barracão, abrigo, posto, casamata) com colisores iguais.
- **Scope:** `buildArchitecture` (partes não-estação), estados (`forward_post_state`), interiores escuros, LOD.
- **Ficheiros:** `src/render/m01-environment.js`, testes, spec.
- **Não alterar:** `TczewWorld` colisores, nós de cobertura.
- **Aceitação:** rota e `--check` de colisores iguais; capturas 03/04/15/16 antes/depois.
- **Modelo/esforço:** Claude Code · HIGH. **Depende de:** T13, Estação V3.

#### T33 · `M01-PROPS-RUNTIME-V2`
- **Objectivo:** props do kit T12 no lugar das caixas e fios, mais equipamento ferroviário.
- **Scope:** `m01-environment-props.js`: substituição por tipo, postes de telégrafo ao longo da linha oeste, cerca, lanternas, grua/carvão/travessas/agulha/sinal no pátio; instanciado; não sólido.
- **Ficheiros:** `src/render/m01-environment-props.js`, `src/world/m01-decoration-layout.js`, testes.
- **Não alterar:** colisores, rotas, nós de cobertura.
- **Aceitação:** capturas 01/02/03/07/16; draw calls de props ≤8.
- **Modelo/esforço:** Claude Code · MEDIUM. **Depende de:** T12, Estação V3.

#### T34 · `M01-STATION-YARD-LIFE-V1` (= BX-08 + BX-11 + BX-12 parte da estação)
- **Objectivo:** o pátio e a secção têm vida antes, durante e depois do bombardeio.
- **Scope:** engine: actores novos (ferroviários com lanternas, padioleiro/ferido, socorrista, carroça), tarefas por hora (`task` novos: `clean_weapon`, `coffee`, `map`, `patrol`, `guard_change`, `watch_bridge`), validador e migração; apresentação: lanternas, vagão a arder/queimado por idade do evento, fuligem/vidros na estação, poses por tarefa.
- **Ficheiros:** `src/game/m01-simulation.js`, `mission.json`, `src/render/m01-yard-wagons.js`, `m01-environment.js` (estação, depois de V3), `m01-characters.js` (poses por tarefa, depois de Variação V2).
- **Não alterar:** corredor do pelotão, `firing_point`/`shelter`, combate.
- **Aceitação:** posições previstas em horas-chave; nunca no corredor; 90 s de independência; capturas 04:36 e 05:41.
- **Modelo/esforço:** GPT-6.1 Sol · HIGH (engine) + Claude Code · MEDIUM (apresentação). **Depende de:** Estação V3, Variação V2, T20.

#### T35 · `M01-ANIM-LOCOMOTION-RESOLVER-V1` (= TASK B)
- **Objectivo:** resolver puro + player com acções persistentes, fundidos em tempo de missão, tiers por relógio, proxies por odómetro.
- **Scope:** `m01-animation-resolver.js`, `m01-animation-player.js`, integração em `M01Characters.update()` com precedência dos adaptadores; fallbacks sem T07/T08.
- **Ficheiros:** novos + `src/render/m01-characters.js`, `m01-actor-pose.js`, testes 7.1/7.2 do plano, specs (a) e (c).
- **Não alterar:** `m01-soldier-variation.js`, `create()` além das acções/sockets, simulação.
- **Aceitação:** deriva ≤0,10 m/s média; zero `stopAllAction()` no caminho genérico; matrizes iguais após reload/pausa/LOD; piloto de riflemen substituído.
- **Modelo/esforço:** Claude Code · HIGH. **Depende de:** Variação V2; T07/T08 melhoram, não bloqueiam.

#### T36 · `M01-ANIM-CREWS-EVACUATION-V1` (= TASK D)
- **Objectivo:** municiador da MG34, fases da ckm, transporte de Bąk com pickup/putdown.
- **Scope:** conforme TASK D; política de fogo da ckm desligada até decisão (Anexo B).
- **Ficheiros:** `src/game/m01-simulation.js`, `src/render/m01-characters.js`, testes `m01-mg34-prone-*`, `m01-ckm-runtime`, `m01-station-drag-runtime`.
- **Não alterar:** resolver genérico, variação.
- **Aceitação:** F10/F12/F13 do plano fechados; sem tiros inventados; determinismo com saves a meio.
- **Modelo/esforço:** GPT-6.1 Sol · HIGH. **Depende de:** T07, T35.

#### T37 · `M01-ANIM-FIDELITY-IK-BUDGET-V1` (= TASK E)
- **Objectivo:** pés no terreno, mãos nos sockets, tiers com contadores.
- **Scope:** `m01-foot-ik.js`, `m01-hand-pin.js`, inclinação da raiz em rampas, política de fidelidade, relatório por tier (sem FPS).
- **Ficheiros:** novos + `m01-characters.js` atrás de interruptor.
- **Não alterar:** simulação, clips, hitboxes.
- **Aceitação:** botas ≤2 cm do terreno nas rampas; I7/I8; custo por tier medido com o instrumento.
- **Modelo/esforço:** Claude Code · HIGH. **Depende de:** T35, T01.

#### T38 · `M01-COMBAT-POSTURE-STAGING-V1`
- **Objectivo:** ninguém fica em fila de pé sob fogo: posições de espera usam cobertura.
- **Scope:** dados de posições/orientações da secção no posto avançado (atrás dos sacos), do pelotão, dos alemães nos portões (em cobertura), sapadores deitados (`posture='prone'` de T07); espaçamento e variação; nós de cobertura existentes.
- **Ficheiros:** `missions/m01-tczew/mission.json`, `map-layout.json` (só posições), testes de cobertura.
- **Não alterar:** cadências, linhas de visão que mudem resultados (verificar), gates.
- **Aceitação:** 12 sementes com os mesmos invariantes; `m01-cover-threat` verde; vistas 01/11 sem fila.
- **Modelo/esforço:** GPT-6.1 Sol · MEDIUM. **Depende de:** T07.

#### T39 · `M01-VIEWMODEL-FEEL-V2`
- **Objectivo:** a wz.29 em primeira pessoa com peso: mira com curva, sway, bob por marcha, recuo com regresso, abaixar junto a paredes, transição de FOV.
- **Scope:** `m01-viewmodel.js`, `m01-wz29-presentation.js`; avaliar antes `codex/m01-viewmodel-visual-v2` (superada ou não).
- **Ficheiros:** os dois módulos, `tests/helpers/m01-viewmodel-fixture.js`, testes.
- **Não alterar:** `wz29.js` (balística, cadência, ficha), `player.aiming` semântico.
- **Aceitação:** curvas de mira 0,30/0,22 s; sway/bob derivados do relógio da simulação (pausa congela); captura com mira real por input.
- **Modelo/esforço:** Claude Code · HIGH. **Depende de:** —.

#### T40 · `M01-FP-ARMS-AND-CARRY-V2`
- **Objectivo:** braços de primeira pessoa com mangas fechadas e mãos com dedos; transporte de Bąk credível.
- **Scope:** variante FP do kit de soldados (braços/mãos/punhos/correias, material de pele), pose de transporte com os clips de T08, sem clipping nas margens do enquadramento.
- **Ficheiros:** `tools/assets/m01-soldiers/**` (variante FP), `src/render/m01-viewmodel.js`, testes GLB.
- **Não alterar:** rig/clips de terceira pessoa, variação.
- **Aceitação:** capturas 01/05/14 antes/depois; orçamento FP ≤6 000 triângulos.
- **Modelo/esforço:** Claude Code · HIGH. **Depende de:** T08 (clips), T39.

#### T41 · `M01-BRIDGE-FINISH-RUNTIME-V2`
- **Objectivo:** ligar o kit de materiais T14, impostor da treliça a >800 m, guardas e superfície do tabuleiro.
- **Scope:** `m01-bridge-portal-polish.js`/carregamento do kit; impostor; LOD das partes com histerese.
- **Ficheiros:** `src/render/m01-bridge-portal-polish.js`, `m01-view.js` (partes), testes.
- **Não alterar:** `renderState.parts`, colisores.
- **Aceitação:** capturas 04/12/13; contadores.
- **Modelo/esforço:** Claude Code · MEDIUM. **Depende de:** T14, T15.

#### T42 · `M01-WATER-VISTULA-V1`
- **Objectivo:** água com reflexo, fluxo e margem.
- **Scope:** `src/render/m01-water.js` (fresnel + reflexo do céu de T16, normais de fluxo pelo relógio e vento, espuma nas pilhas, mistura na margem, detritos de T18); Low sem reflexo.
- **Ficheiros:** novo + `m01-view.js`/`m01-surfaces.js`.
- **Não alterar:** nível do rio (dados), colisão.
- **Aceitação:** capturas 12/13 às 04:30 e 06:05; pausa congela.
- **Modelo/esforço:** Claude Code · MEDIUM. **Depende de:** T16.

#### T43 · `M01-LOD-POLICY-AND-FADES-V1`
- **Objectivo:** uma política de LOD por preset com histerese e fundidos.
- **Scope:** função única de LOD (distâncias, histerese 15 %, dither 0,3 s pelo relógio) adoptada por actores, árvores, props, comboios, partes; Low com poupanças reais.
- **Ficheiros:** novo `src/render/m01-lod-policy.js` + consumidores.
- **Não alterar:** limites de skinning 18/24/28 sem medição.
- **Aceitação:** câmara parada 10 s sem flicker nas continuações; contadores por preset; teste puro.
- **Modelo/esforço:** GPT-5.6 Sol · MEDIUM. **Depende de:** ondas 1–2.

#### T44 · `M01-POSTPROCESS-GRADING-V1` (fase B de P2)
- **Objectivo:** AO leve e grading por fase, só se o orçamento de T01 o permitir.
- **Scope:** AO barato (ou AO pintada nos atlas) em Medium/High, vinheta suave, curva de cor por fase (sem LUT externa); Low intocado.
- **Ficheiros:** `src/render/three-renderer.js`, `m01-lighting.js`.
- **Não alterar:** Low; tone mapping ACES.
- **Aceitação:** custo medido no Chromebook ≤ orçamento; capturas.
- **Modelo/esforço:** GPT-5.6 Sol · MEDIUM. **Depende de:** T16, T01.

### Onda 3 — conteúdo de longa duração e fecho

#### T45 · `M01-AUDIO-ASSETS-V1` (= plano de áudio T4)
- **Objectivo:** amostras originais/CC por patamar, uma arma excelente primeiro.
- **Scope:** ordem do plano: wz.29 completo + mecânica + cracks + impactos; MG34/ckm nas três bandas com cadências exactas; Ju 87 + bombas; demolições + metal; comboios; camas/foley/walla; falas gravadas (decisão do Captain).
- **Ficheiros:** `assets/audio/m01/**`, `manifest.json`, `ASSET_CREDITS.md`.
- **Não alterar:** código além do manifesto.
- **Aceitação:** ficha por ficheiro; loudness por §3.12; `missing` vazio por patamar.
- **Modelo/esforço:** Claude Code · HIGH + Captain (licenças, vozes). **Depende de:** T06.

#### T46 · `M01-AUDIO-MIX-OPTIONS-V1` (= T5)
- **Objectivo:** sliders por grupo, opção de reduzir zumbido, sessão manual no Chromebook registada.
- **Ficheiros:** `src/main.js`, `index.html`, `styles.css`, `RUNBOOK.md`, evidência.
- **Aceitação:** 10 min sem glitches no aparelho; `outputLatency` estável.
- **Modelo/esforço:** Claude Code · MEDIUM + Captain. **Depende de:** T45.

#### T47 · `M01-CKM-CASEMATE-CREW-V1` (= BX-10)
- **Objectivo:** guarnição da ckm na casamata com fogo de exibição e saída às 06:12.
- **Ficheiros:** `src/game/m01-simulation.js`, `mission.json`, testes de rota.
- **Não alterar:** supressão/dano (só Kowal suprime), prontidão da demolição oeste.
- **Aceitação:** guarnição fora de `bz_west` antes das 06:45; nenhuma `display` aterra; brilho na seteira na captura das 04:50.
- **Modelo/esforço:** GPT-6.1 Sol · HIGH. **Depende de:** T22, T21.

#### T48 · `M01-GERMAN-RETREAT-AND-REGROUP-V1` (= BX-09)
- **Objectivo:** depois da explosão leste, alemães recuam com feridos, 60 s de silêncio, reagrupamento.
- **Ficheiros:** `src/game/m01-simulation.js`, `m01-actor-pose.js`/resolver (precedência de `carriedBy`), testes.
- **Não alterar:** linha de visão dos portões para oeste.
- **Aceitação:** pares carregados seguem os carregadores; silêncio 06:10–06:11; captura às 06:12.
- **Modelo/esforço:** GPT-6.1 Sol · MEDIUM. **Depende de:** T22, T20.

#### T49 · `M01-PERF-BUDGET-PASS-V1`
- **Objectivo:** caber no orçamento de T01 depois das ondas 1–2.
- **Scope:** chão em blocos com culling (se T27 não o fez), passes de sombra, fusão de materiais/atlas, instâncias, texturas por preset, Low real; segunda medição no Chromebook.
- **Ficheiros:** os módulos com maior custo medido.
- **Não alterar:** aspecto em High além de tolerância visual registada.
- **Aceitação:** P95 dentro do orçamento por preset no aparelho; contadores por vista publicados.
- **Modelo/esforço:** GPT-5.6 Sol · HIGH + Captain (medição). **Depende de:** T01, ondas 1–2.

#### T50 · `M01-LOADING-AND-BUNDLE-V1`
- **Objectivo:** carregamento com progresso real e bundle dividido; fonte self-hosted.
- **Scope:** ecrã de carregamento ligado ao `asset-manager`, code-splitting (three/GLTF loader, bancada francesa), Barlow self-hosted (licença), rodapé ligado ao estado.
- **Ficheiros:** `index.html`, `src/main.js`, `src/assets/asset-manager.js`, `vite.config.js`, `styles.css`.
- **Aceitação:** bundle inicial <600 kB; progresso visível; sem FOUT.
- **Modelo/esforço:** Claude Code · MEDIUM. **Depende de:** T04.

#### T51 · `M01-INTEGRATED-VISUAL-CLOSEOUT-V3`
- **Objectivo:** prova integrada de que M01 deixou de parecer protótipo.
- **Scope:** suíte Node e navegador integrais; as 19 vistas deste roadmap AFTER vs BEFORE (esta pasta), com contadores; segunda medição no Chromebook; tabela de problemas P1–P20 fechado/aberto; recomendação de marco.
- **Ficheiros:** `docs/verification/m01-runtime/integrated-visual-closeout-v3/`, `DEVELOPMENT_STATUS.md`, `QUALITY_REPORT.md`.
- **Aceitação:** critérios da secção 8; nenhum retry/skip; limitações explícitas.
- **Modelo/esforço:** GPT-5.6 Sol · HIGH. **Depende de:** tudo o que foi integrado.

#### T52 · `M01-HUMAN-PLAYTEST-V1`
- **Objectivo:** decisão VALIDADA/NÃO VALIDADA com humano.
- **Scope:** partida completa no Chromebook, guião de observação (os 20 problemas), registo de tempos por fase e de qualquer "isto parece protótipo".
- **Modelo/esforço:** Captain. **Depende de:** T51.

---

## 7. Ordem ideal para concluir M01 depressa

**Princípio:** três lanes em paralelo (dados/autoridade, render/módulos novos, assets), uma tarefa de cada vez por ficheiro quente, integrações cedo. As setas indicam dependências duras; o resto pode começar quando houver capacidade.

```
Onda 0 (agora)        T00 docs ─┐
                      T01 FPS baseline (Captain) ──────────────────────────────┐
  lane dados:         T02 → T03 → T05 → T07  (GPT-6.1 Sol, sequencial)         │
  lane render:        T04 HUD/cinema merge                                     │
  lane assets:        T08 clips ‖ T09 texturas → T10 vegetação ‖ T12 props ‖ T13 estruturas ‖ T14 pontes
  lane áudio:         T06 núcleo (após T05 ou com stubs)                       │
                                                                               │
Onda 1 (após FX V3)   T15 gate ──► T16 luz ──► T17 Stukas ──► T18 demolições ──► T19 tiro do jogador
                      T22 readout ──► T23 frente leste ‖ T25 raid ‖ T20 impostores ‖ T24 comboios
                      T21 ambiente (após T06+T22) ‖ T26 beats (após T04+T02)   │
                                                                               │
Onda 2 (após Estação V3 + Variação V2)                                         │
  ambiente:           T27 relevo ──► T30 horizonte ‖ T28 solo ‖ T29 vegetação ‖ T31 via ‖ T32 estruturas ‖ T33 props
  pessoas:            T35 resolver ──► T36 guarnições ‖ T37 IK ‖ T38 encenação ‖ T39 arma ──► T40 braços
  acabamento:         T41 pontes ‖ T42 água ‖ T34 vida do pátio ──► T43 LOD ──► T44 grading (se T01 permitir)
                                                                               │
Onda 3 (fecho)        T45 assets áudio ──► T46 mistura ‖ T47 ckm ‖ T48 recuo alemão ‖ T49 perf ◄─┘ ‖ T50 loading
                      ──► T51 closeout V3 ──► T52 playtest humano ──► decisão de marco
```

**Caminho crítico:** T15 → T16 → (T17, T18) → T27 → T30 → T35 → T49 → T51 → T52. Tudo o que não está nele deve correr em paralelo para não o atrasar.

**Paralelismo seguro por ficheiro.** Em cada momento, no máximo: uma tarefa em `m01-view.js`, uma em `m01-atmosphere.js`, uma em `m01-environment.js`, uma em `m01-characters.js`, uma em `m01-simulation.js` (o lane de dados é sequencial de propósito). Módulos novos (`m01-lighting.js`, `m01-aircraft.js`, `m01-impostors.js`, `m01-ambient.js`, `m01-player-fx.js`, `m01-water.js`, `m01-far-landscape.js`, `m01-animation-*.js`, `src/core/audio/`) não colidem entre si.

**Estimativa de ritmo (não é promessa):** onda 0 e 1 em paralelo durante as duas primeiras semanas de trabalho de agentes; onda 2 nas duas seguintes; onda 3 e fecho na quinta. O que decide a data é a disponibilidade do Captain para T01, decisões do Anexo B e as três tarefas em curso.

---

## 8. Definição de "M01 com apresentação de FPS clássico"

M01 só sai de PROTÓTIPO JOGÁVEL quando **todas** as linhas abaixo forem verdadeiras no closeout V3, medidas nas 19 vistas desta avaliação (AFTER vs BEFORE desta pasta):

| Vista | O que tem de ser verdade |
| --- | --- |
| 01/19 início | Sombras de contacto às 04:30; árvores com silhueta; chão com variação e relva perto; soldados em poses diferentes, sem fila; mãos/mangas correctas; horizonte modelado |
| 02/07 estação | Estação V3 com plataforma/janelas reais; vagões do desvio com fogo/queimado por idade; props reais; via com carris e agulha |
| 03/15 barracão e abrigo | Estruturas do kit (telhado, porta, sacos), não caixas; cue de cena na oeste; flash/coluna/chuva de terra legíveis a 362 m |
| 04/13 portais e treliça | Tijolo dessaturado com pedra e sujidade; aço com especular e rebites; tabuleiro com superfície; via contínua no encontro |
| 05 arma | Mira com curva; sway/bob; braços fechados; clarão e cápsula ao disparar; hit marker ao acertar |
| 06 Stukas | Três aviões em formação no caminho autorado, um a mergulhar, bomba visível; sem laço (captura 60 s depois é diferente e coerente) |
| 08 arrasto | Ferido arrastado com lanternas/socorristas por perto; vagão a arder; estação com fuligem |
| 09/11 reparo | Sapadores deitados quando o HUD diz "deitados"; secção atrás dos sacos; cues de cena |
| 10/18 frente leste | Traçantes nos dois sentidos; impostores visíveis a 1,1 km; fumo e lâmpada do trem; Panzerzug mais alto; Low ≠ High com poupanças reais |
| 12 tabuleiro | Água com reflexo/fluxo; alemães a 600–700 m como silhuetas; detritos depois da demolição |
| 14 demolição leste | Flash, luz e colapso legíveis a 762 m; tremor ao chegar o som; 2 s de silêncio |
| 16 chamada | Cartela 07:05 e fade; poses da chamada; sombras longas já existem |
| 17 Panzerzug | Horizonte a leste modelado; comboios com fumo; chão não é uma folha |
| Transversal | Áudio com amostras em todos os patamares (sem síntese audível no caminho normal); FPS medido no Chromebook dentro do orçamento nos três presets; zero erros de consola; determinismo A/B e 12 sementes iguais; HUD V1+ integrado |

A decisão final de marco continua a ser humana (T52).

---

## 9. Kit de verificação padrão (todas as tasks)

```sh
npm ci
npm test                                   # Node focado + integral no fecho
npm run build
npx playwright test tests/browser/<spec-da-task>.spec.js          # AFTER
# BEFORE na base exacta: worktree da base com o mesmo spec copiado e M01_BASELINE_CAPTURE=1
node tools/verify-m01-route.mjs            # rota completa (sempre que a simulação ou dados mudem)
node tools/m01-cover-comparison.mjs        # 12 sementes (sempre que fogo/ritmo/posições mudem)
npm run assets:m01:colliders -- --check    # sempre que estruturas/pontes mudem
git diff --exit-code <base> -- src/game src/world missions/m01-tczew/mission.json missions/m01-tczew/map-layout.json   # tarefas só de apresentação
npx playwright test -c tools/verification/playwright.roadmap.config.js   # as 19 vistas, no closeout (ROADMAP_VIEWS para subconjuntos)
```

Regras: retries 0; skips novos 0; timeouts inalterados; capturas inspeccionadas e descritas (o que mudou e o que não mudou); contadores de `gameDiagnostics()` por vista; nenhum FPS sem aparelho; A/B de futuros (`tests/helpers/m01-determinism.js`) para qualquer campo novo na simulação; saves antigos (legacy 86/89, schema 2) carregam.

---

## 10. Evidências desta avaliação

- Capturas e contadores: [`docs/verification/m01-runtime/final-roadmap-2026-10-07/`](verification/m01-runtime/final-roadmap-2026-10-07/README.md) (19 vistas, `counters.json`, `targets.json`, `capture.log`), reproduzíveis com `tools/verification/m01-roadmap-captures.spec.js`.
- Código citado: `src/game/m01-simulation.js:125-144` (beats `line`), `:465` (`west=p.x>-200`), `:612` (`player-shot`); `src/render/m01-view.js:269` (clarões só inimigos), `:424/:431` (laços dos aviões), `:455` (`castShadow=alt>0`); `src/core/audio.js` (síntese); `map-layout.json` (`sun.keyframes`, `stukaPath`, `farAnchors`, `bounds`).
- Documentos paralelos (secção 3) e relatórios anteriores em `docs/verification/m01-runtime/` e nas branches `codex/m01-integrated-visual-placeholder-closeout-v2`, `codex/m01-visual-placeholder-asset-audit`, `codex/m01-next-pendencies-audit`, `codex/m01-combat-ai-architecture`, `codex/m01-distant-battle-sectors`, `codex/m01-chromebook-benchmark`.

---

## Anexo A — Módulos e donos por onda

| Ficheiro | Dono actual (em curso) | Onda 1 | Onda 2 | Onda 3 |
| --- | --- | --- | --- | --- |
| `src/game/m01-simulation.js`, `m01-fire.js`, `mission.json`, `map-layout.json` | — | T02→T03→T05→T07→T22→T23→T25 (sequencial) | T27 (envelope), T34, T36, T38 | T47, T48 |
| `src/render/m01-view.js` | FX V3 | T15→T16→T17→T18→T19→T20→T24 (um de cada vez) | T30, T41, T42 | — |
| `src/render/m01-atmosphere.js` | FX V3 | T15→T16→T18→T24 | — | — |
| `src/render/m01-environment.js`, `m01-environment-props.js` | Estação V3 | — | T27→T28→T29→T31→T32→T33 | — |
| `src/render/m01-characters.js`, `m01-actor-pose.js` | Variação V2 | — | T35→T36→T37, T34 (poses) | T48 |
| `src/render/m01-viewmodel.js`, `m01-wz29-presentation.js` | — | T19 (sockets) | T39→T40 | — |
| `src/ui/m01-hud.js`, `game.js`, `main.js`, `index.html`, `styles.css` | HUD V1 (candidato) | T04→T19→T26 | — | T46, T50 |
| `src/core/audio*` | — | T06 | — | T45, T46 |
| `tools/assets/**`, `assets/**` | — | T08, T09, T10, T12, T13, T14 | T40 | T45 |
| Módulos novos | — | `m01-lighting`, `m01-aircraft`, `m01-impostors`, `m01-ambient`, `m01-player-fx` | `m01-far-landscape`, `m01-water`, `m01-animation-*`, `m01-foot-ik`, `m01-hand-pin`, `m01-lod-policy` | — |

## Anexo B — Decisões pedidas ao Captain (resposta curta; sem resposta aplica-se a recomendação)

| ID | Decisão | Recomendação do lead |
| --- | --- | --- |
| B1 | Ordem de integração dos candidatos | FX V3 (após o fix de timing) primeiro; HUD/cinema V1 logo a seguir; Estação V3 e Variação V2 quando fecharem |
| B2 | Chromebook para T01 | Agendar antes da onda 1; sem isto, T44/T49 ficam bloqueadas e tudo o resto publica só contadores |
| B3 | Pass ferroviário D1–D10 | D1 sim; D2 adiar LOD0 de locomotiva/Panzerzug; D3 sim (lanternas e fornalha, `RECONSTRUCTED`); **D4 substituída por chegada de apresentação (T24)**; D5 sem insígnias; D6 fora (gameplay); D7 vagão em (−352, 0, 8); D8 manter ±2,5 m; D9 sim; D10 já não se aplica se os vagões do desvio no HEAD tiverem colisão — verificar em T24 |
| B4 | Velocidade de transporte de Bąk (3 → 1,6 m/s) | Sim, com verificação na rota completa de que a prontidão da oeste (06:45) se mantém |
| B5 | Sprint do pelotão | Manter 5,5 m/s e autorar `sprint` |
| B6 | Sapadores deitados (`posture='prone'`) | Sim; confirmar que nenhuma regra usa a linha de visão dos sapadores |
| B7 | Política de fogo da ckm | Só fogo de exibição (BX-10) até decisão; nunca supressão |
| B8 | Recarga dos riflemen por `rounds` | Sim; rever fixtures que leiam `rounds` |
| B9 | BX-07b (desembarque de pioneiros com atraso do primeiro fogo) | **Não** neste roadmap |
| B10 | Vozes | Gravações em polaco com actores, legendas em português, sem TTS; até existirem, legendas sem som |
| B11 | Relevo fora do envelope (T27) | Aprovar o princípio "dentro do envelope, `heightAt` byte a byte" |
| B12 | Rodapé "PROTÓTIPO JOGÁVEL" | Fica até à decisão de T52 |
| B13 | Pilotos near/far e RNG por formação (PR #39 e branch) | Fora deste roadmap; decidir à parte, não bloqueiam a apresentação |
| B14 | Segunda cascata de sombras e grading | Só em Medium/High e só depois de T01 |
