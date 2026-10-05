# M01 Integrated Visual Placeholder Closeout V2

## RESUMO

Base auditada: `codex/m01-integration-browser-harness-stabilization-v2@6bd69521aef18f00b2ab37ccd7ceeca6a4da3a2b`.

A M01 já não denuncia protótipo principalmente por locomotiva, Panzerzug, Wz.29 ou falta de personagens. Os maiores fatores restantes são: **Station ainda construída como massa procedural**, **grandes corredores de terreno/yard pouco vestidos**, **árvores próximas com silhueta geométrica**, **movimento de soldados repetitivo apesar da variação de aparência**, e **portais/estruturas de acesso com acabamento/material muito simples em enquadramentos dominantes**.

A leitura vem de screenshots do browser no HEAD exato da base, inspeção do runtime integrado e contadores já validados. Não é benchmark de FPS.

## P0

| Prioridade | Sistema | Problema visual | Evidência | Código/asset responsável | Próxima tarefa recomendada |
|---|---|---|---|---|---|
| P0-1 | Station | Corpo principal lê como um bloco enorme: parede plana, repetição de tijolo, janelas rasas, roof slab, pouca profundidade de portas/annexes e nenhum interior shell convincente. | `m01-station-ground-drag.png`; capturas dirigidas `station-facade-south.png`, `station-facade-oblique-roof.png`, `station-annex-yard.png` | `tczew-world.js:refresh()`; `m01-environment.js:buildArchitecture()`; `m01-view.js:buildTerrain()` | **Station Architecture Production V2** |
| P0-2 | Environment / yard | Muito espaço jogável continua visualmente vazio; terreno domina o frame, props concentram-se em poucos pontos e há pouca leitura de pátio ferroviário/atividade humana. | `m01-station-grab.png`, `m01-repair-under-fire.png`, `m01-visual-medium.png` | `m01-view.js:buildTerrain()`; `m01-environment.js:buildClutter()/buildGroundClusters()` | **Environment Prop Density & Grounding V1** |
| P0-3 | Soldiers / animation | A variation resolveu clones de rosto/equipamento, mas grupos próximos ainda compartilham o mesmo clip/postura; inspeção de 5 PL e 5 DE mostrou todos em `standing_idle`; roll-call repete a mesma pose sentada. | `pl-close-after.jpg`, `de-close-after.jpg`, `roles-after.jpg`, `m01-roll-call-seated.png` | `m01-characters.js:sample()`; clips em `assets/models/provisional/m01/characters/` | **Soldier Animation Anti-Clone Pass V1** |
| P0-4 | Vegetation | Árvores perto do jogador ainda leem como tronco cilíndrico + massas poliédricas; o LOD é barato e estável, mas a silhueta próxima continua “low-poly placeholder”. | `AFTER-near-tree-medium.png`, `m01-visual-medium.png` | `m01-environment.js`: Cylinder + Icosahedron/Dodecahedron tree batches | **Vegetation Near-Silhouette Polish V2** |
| P0-5 | Bridge approaches / portals | Portais/towers dominam vários enquadramentos e usam superfícies brick repetidas e volumes muito limpos/blocados; parecem mais asset provisório do que estrutura acabada. Geometria histórica deve ser verificada antes de redesign. | `m01-rig-iron-sights.png`, `AFTER-real-round-impact.png`, `AFTER-near-tree-medium.png` | `assets/models/provisional/m01/portal_lisewo_1912*.glb`; material remap em `m01-view.js:loadBridges()` | **Bridge Portal Material/Detail Polish V1** + sanity histórica curta |

## P1

| Prioridade | Sistema | Problema visual | Evidência | Código/asset responsável | Próxima tarefa recomendada |
|---|---|---|---|---|---|
| P1-1 | Railway | Rails/travessas/ballast são geometricamente corretos o suficiente para navegação, mas visualmente muito regulares e finos; switches e pequenos mecanismos praticamente não leem. | `m01-repair-under-fire.png`, `m01-train-mg34.jpg` | `m01-view.js:buildTerrain()`; `m01-environment.js:buildTracks()` | Railway Detail Polish |
| P1-2 | Battlefield FX | Smoke/dust ainda mostram billboard language: puffs repetidos, mesma família de textura e fades previsíveis; muzzle/impact usam pools simples. | `AFTER-real-round-impact.png`, `m01-real-near-explosion.png` | `m01-atmosphere.js`; `m01-view.js:createFireEffects()/updateBattlefieldFx()` | Battlefield FX Polish V3 |
| P1-3 | Train consist | Assets reais carregam, mas longa composição continua repetitiva; couplings/underframe/gaps não têm peso visual equivalente à locomotiva. | capturas dirigidas `train-locomotive-near.png`, `train-consist-far.png`; wagon LOD screenshots | `m01-train-wagons.js`; `assets/models/provisional/m01-wagons/` | Train Detail & Coupling Polish |
| P1-4 | Player hands | Wz.29 e ADS estão funcionalmente fortes, mas braços/mãos/sleeves ainda têm shading/silhueta simples quando ocupam grande parte da tela. | `m01-rig-iron-sights.png` / `wz29-production-ADS-high.png` | `m01-viewmodel.js`; Wz.29 presentation assets | First-Person Hands/Sleeve Polish |
| P1-5 | Materials | `CanvasTexture` procedural funciona, mas tiling e mesma linguagem de material aparecem em superfícies muito grandes, especialmente brick/soil. | Station e portais; terreno em quase todas as capturas | `m01-surfaces.js:artTexture()/texturedSurface()` | Material Breakup / Decal Pass |
| P1-6 | Lighting / depth | Céu/fog e materiais produzem leitura muito uniforme; cenas abertas têm pouco contraste local e objetos distantes fundem-se no mesmo valor. | `m01-visual-medium.png`, `m01-repair-under-fire.png` | `m01-atmosphere.js`; lighting em `m01-view.js` | Lighting/Fog Art-Direction Polish |
| P1-7 | LOD transitions | Vegetation/train usam seleção discreta com hysteresis, mas sem cross-fade; movimento rápido pode revelar troca de silhueta. | diagnóstico de LOD + inspeção near/mid/far | `m01-environment.js:chooseVegetationLod()`; train/wagon LOD selectors | LOD Transition Polish |
| P1-8 | Yard fire | Incêndio de vagão usa um Sprite único para chama; perto, a leitura é muito 2D comparada ao smoke volumétrico. | `AFTER-yard-wagon-burned-lod0.png` | `m01-yard-wagons.js` | Wagon Fire Presentation Polish |

## P2

| Prioridade | Sistema | Problema visual | Evidência | Código/asset responsável | Próxima tarefa recomendada |
|---|---|---|---|---|---|
| P2-1 | Clutter | Rocks/crates/timber repetem poucas primitivas e escalas. | yard/approach captures | `m01-environment.js:buildClutter()` | prop-set expansion |
| P2-2 | Grass | Tufts são repetidos e orientação/altura ainda previsíveis em áreas próximas. | vegetation captures | `m01-environment.js` grass BufferGeometry | grass micro-variation |
| P2-3 | Debris | Fragmentos tetraédricos são aceitáveis em movimento, mas próximos podem denunciar procedural. | impact/FX captures | `m01-atmosphere.js` debrisGeometry | debris shape set |
| P2-4 | Contact shadows | Plane-based shadows ajudam grounding, mas não substituem melhor contato/occlusion em close-ups. | soldier groups | `m01-view.js:createContactShadows()` | contact polish |
| P2-5 | Windows/glass | Station windows são essencialmente vazios escuros; sem vidro/reflexo/interior parallax. | station captures | `m01-view.js`, `m01-environment.js` | included in Station pass |
| P2-6 | Signage / small railway props | Poucos sinais, cabos, caixas, ferramentas e utilidade ferroviária contextual. | rail/yard captures | environment dressing | included in Prop Density pass |
| P2-7 | Formation staging | Distâncias e alinhamentos de grupos ainda parecem “colocados” em algumas cenas. | roll-call / nearby groups | mission positions + animation presentation | animation/staging polish |
| P2-8 | Smoke lifetime endings | Fades são funcionais, mas alguns desaparecimentos ainda podem ser lidos como sistema de partículas encerrando. | FX sequences | `m01-atmosphere.js:update()` | included in FX Polish |

## O QUE NÃO É PRIORIDADE

Fallbacks de locomotive, Panzerzug, train wagons, yard wagons, actors e Ju 87 são **B — fallback aprovado**. Não devem consumir uma tarefa visual enquanto os GLBs normais carregam. No cenário validado de wagon/train havia 6 modelos de vagão carregados e **0 proxies**.

Sky sphere, contact plane, cartridge cylinder e instancing são **C — procedural aceitável** por si só; o problema é apenas quando a composição final os deixa visualmente óbvios.

## MEDIÇÃO

Validação funcional da base, run `37349847102`: browser **56/56**, retries 0; Node **313/313**.

A auditoria visual dirigida teve um run verde próprio, `37363471495`: capturas Station/Train **2/2**, matriz visual integrada **14/14**, Station/roll-call **2/2**, MG34 prone **1/1**, build PASS e produção byte-idêntica fora do escopo de auditoria.

Contadores são snapshots de câmaras/cenas diferentes, não totais universais:

- fixed-rail High da auditoria: **244 draw calls, 458.551 triangles, 105 textures, 237 geometries**; vegetation 85 trees = 7 near / 35 mid / 43 far, 470 tree instances, 7 tree draws, 15.468 tree triangles, 14 leaf cards, 5.951 grass instances;
- fixed-rail Low da auditoria: **126 draw calls, 350.820 triangles, 89 textures, 279 geometries**; vegetation 3 near / 23 mid / 59 far, 287 tree instances, 6 tree draws, 7.564 tree triangles, 0 leaf cards, 2.975 grass instances;
- outro snapshot High do checkpoint integrado mediu 127 draw calls / 392.513 triangles; a diferença confirma que estes números dependem de câmara, assets já carregados e frame de amostragem;
- wagon near snapshot: 65 train wagons, 6 modelos reais de wagon carregados, proxies 0; total 61 draw calls / 370.672 triangles;
- Soldier inspection: 5 DE, 5 PL e 4 role actors próximos usavam apenas `standing_idle` no frame de inspeção; variation alterava identidade visual, não o clip.

## SANITY HISTÓRICA / LÓGICA

Sem pesquisa histórica profunda nesta tarefa:

- **verificar** a silhueta/ornamentação dos portais/towers antes de qualquer redesign; a crítica aqui é de acabamento visual, não afirmação de anacronismo;
- **verificar** Station roof/chimneys/annex proportions contra referência antes de criar asset final;
- uniformes/armas mostrados não apresentam erro gritante suficiente para classificar como P0 histórico nesta auditoria;
- wagons continuam em pasta `provisional`, portanto um sanity check visual/histórico deve preceder um pass de detalhe caro.

## TAREFAS RECOMENDADAS

| Ordem | Tarefa | Resolve | Ficheiros principais | Risco | Modelo | Dependências | Paralelo? |
|---|---|---|---|---|---|---|---|
| 1 | Environment Prop Density & Grounding V1 | vazio, escala e leitura do yard/rail | `m01-environment.js`, decoration layout, props | baixo-médio | **GPT-5.6 Sol HIGH** | preservar rotas/colliders | sim, excluindo Station |
| 2 | Station Architecture Production V2 | maior placeholder único | Station asset novo + `m01-environment.js` / world anchors | alto | **GPT-6.1 Sol HIGH** | sanity de escala/história; colisão intocada | sim com animation/FX |
| 3 | Soldier Animation Anti-Clone Pass V1 | clones de movimento/formação | `m01-characters.js`, clips/animation GLB | médio-alto | **GPT-6.1 Sol HIGH** | preservar gameplay/muzzle sockets | sim |
| 4 | Bridge Portal Material/Detail Polish V1 | portais dominantes/tiling | portal GLBs + bridge material mapping | médio | **GPT-5.6 Sol HIGH** | sanity histórica curta | sim |
| 5 | Battlefield FX Polish V3 | billboard/repetition/lifetime | `m01-atmosphere.js`, FX presentation | médio | **GPT-5.6 Sol HIGH** | limites atuais e simulation authority | sim |
| 6 | Train Detail & Coupling Polish | repetição do consist | train wagons/assets | médio | **GPT-5.6 Sol HIGH** | manter LOD/fallback | sim |
| 7 | LOD Transition Polish | pop near/mid/far | vegetation/train selectors | médio | **GPT-5.6 Sol HIGH** | depois de silhuetas finais | parcialmente |

## MAIOR GANHO VISUAL POR HORA

1. **Environment Prop Density & Grounding V1** — pouca arquitetura nova; afeta muitos frames imediatamente.
2. **Station Architecture Production V2** — ganho absoluto maior, mas exige mais horas.
3. **Soldier Animation Anti-Clone Pass V1** — alto ganho em todas as cenas com grupos.
4. **Bridge Portal Material/Detail Polish V1** — poucos assets dominam vários enquadramentos.
5. **Battlefield FX Polish V3** — melhora ação sem mexer no gameplay.

## EVIDÊNCIA

A auditoria usa o artifact browser do HEAD exato da base e uma captura dirigida desta branch para Station/Train. O workflow de closeout inclui screenshots, diagnostics, este relatório e `CODE_LOCATIONS.md`.

Produção deve permanecer byte-idêntica à base durante esta tarefa.
