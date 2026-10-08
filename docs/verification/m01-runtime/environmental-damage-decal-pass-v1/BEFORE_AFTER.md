# BEFORE / AFTER — danos ambientais M01

Capturas do build de produção (`npm run preview`), Chromium/SwiftShader, 1280×720, qualidade Alta, geradas por `tests/browser/m01-damage-decals.spec.js`. **BEFORE** é o mesmo spec com `M01_BASELINE_CAPTURE=1` contra o renderer da base `99309d9` (`src/render/m01-view.js` e `src/game/game.js` repostos; o módulo novo existe mas não é importado). Mesmos snapshots, mesma posição encenada do jogador e mesmos comandos de rato; nas continuações os NPC podem diferir ligeiramente por temporização. HUD/pausa escondidos na captura. Não é um playtest humano nem uma medição de FPS.

Estados de origem (todos genuínos, sem eventos injectados): abertura da missão depois do skip da intro; rota real ~4 min depois da demolição leste (fumo já dissipado, cargas oeste ainda por detonar); rota real 8,25 s depois da demolição oeste (na rota, a chamada segue-se à cena dessa demolição aos 15 s e muda o jogador de sítio; na pose encenada, longe do abrigo, não dispara). Antes de cada captura de sonda o spec verifica que nenhum evento disparou desde o carregamento e que o jogador continua a menos de 0,5 m da posição encenada. A posição/orientação do jogador é encenada no snapshot (como nas sondas de `m01-bridge-portal-polish.spec.js`).

| Vista | Origem e câmara | BEFORE | AFTER | O que muda |
|---|---|---|---|---|
| Portal ferroviário, tijolo | abertura; jogador em (4,5; −5,4) virado à face leste do portal; 4 tiros com mira, apontados com o rato do jogo a pontos da parede | [BEFORE](before/BEFORE-portal-brick-high.png) | [AFTER](after/AFTER-portal-brick-high.png) | Quatro lascas no tijolo (tijolo vivo, buraco descentrado) espalhadas pelo pano; o tiro do jogador ganha FX de impacto. Na base não fica rasto. A 6 m cada lasca tem poucos píxeis; grandes planos na galeria. |
| Via em aterro | abertura; jogador no aterro a 3 m da via; 4 tiros com mira à cabeça do carril, a uma travessa, ao balastro e ao carril oposto | [BEFORE](before/BEFORE-track-bed-high.png) | [AFTER](after/AFTER-track-bed-high.png) | Furo na travessa, gravilha deslocada no balastro e riscos nos carris (2 carril, 1 travessa, 1 balastro nos diagnósticos). Os riscos têm 4,5–6,5 cm de largura: discretos a esta distância; faíscas e lascas são transitórias. |
| Cratera do reparo 1 | rota real pré-demolição oeste; (−49; 15,5) virado ao ponto de reparo | [BEFORE](before/BEFORE-repair-crater-high.png) | [AFTER](after/AFTER-repair-crater-high.png) | Cratera com bordo suave e núcleo escuro, terra e pedras espalhadas. Na base o terreno fica liso depois da bomba. |
| Fachada da estação | mesma rota; (−400; 17,5) de frente para a base da fachada norte | [BEFORE](before/BEFORE-station-facade-high.png) | [AFTER](after/AFTER-station-facade-high.png) | Poeira clara de alvenaria com flocos de fuligem e pedaços de tijolo na base da fachada (fora da caixa desenhada do edifício). A fuligem das janelas existe mas mal se distingue na fachada escura. |
| Ponta do vão 5 (rodoviário) | mesma rota; no tabuleiro em (650; 40) virado ao vão demolido | [BEFORE](before/BEFORE-east-deck-end-high.png) | [AFTER](after/AFTER-east-deck-end-high.png) | Fuligem nos últimos 9 m do tabuleiro junto ao vão. Discreta mas visível; na base o tabuleiro fica limpo. |
| Cabeça de ponte oeste | rota real 8,25 s após a demolição oeste; (−30; 2) no aterro | [BEFORE](before/BEFORE-west-bridgehead-high.png) | [AFTER](after/AFTER-west-bridgehead-high.png) | Via e encontro queimados, blocos de alvenaria e pedaços de tijolo. Na base só a ponte muda; o chão e a via ficam limpos depois da demolição. |

## Galeria de grandes planos (fixture de verificação)

`gallery/` — renderer real (`Renderer`/`M01View`/`M01DamageDecals`) com uma `M01Simulation` descartável, servido pelo `vite` de desenvolvimento (`tools/verification/m01-damage-decals-fixture.html`, nunca incluído no build). Impactos são os próprios `traceShot`/`traceRound` da simulação; explosões são registos reais ou `M01Simulation.consume()` reais. Uma vista (`east-demolition`) eleva a câmara 30 m como vista de verificação, não de jogo. `gallery/gallery-report.json` guarda contagens e materiais de cada vista; `gallery/atlas.png` mostra o atlas procedural (sobre cinzento, sobre oliva escuro e o mapa de altura).

| Imagem | Conteúdo |
|---|---|
| [brick-portal](gallery/brick-portal.png) | tijolo: face do portal (tiros do jogador) e torre (tiros alemães) |
| [stone-abutment](gallery/stone-abutment.png) | pedra: topo do encontro oeste e lancil |
| [wood-hut](gallery/wood-hut.png) | madeira: parede do barracão, veio vertical |
| [tree-bark](gallery/tree-bark.png) | casca: tronco de `m01_tree_0` |
| [earth-slope](gallery/earth-slope.png) / [earth-cover](gallery/earth-cover.png) | terra: encosta do aterro e face de um parapeito |
| [railway](gallery/railway.png) | carril, travessa e balastro |
| [road-deck](gallery/road-deck.png) | pavimento e lancis do tabuleiro rodoviário |
| [metal-joint](gallery/metal-joint.png) | metal: junta de dilatação ferroviária |
| [grenade-terrain](gallery/grenade-terrain.png) / [grenade-road-deck](gallery/grenade-road-deck.png) | granada: queimado, terra lançada, detritos e brasas |
| [repair-crater](gallery/repair-crater.png) / [repair-crater-track](gallery/repair-crater-track.png) | bomba real `nowicki_lost` no ponto de reparo e junto à via |
| [station-bomb](gallery/station-bomb.png) | bomba real `bombing_0434` na estação |
| [west-demolition](gallery/west-demolition.png) | demolição oeste real: via queimada, entulho |
| [east-demolition](gallery/east-demolition.png) | demolição leste real, vista elevada: queimados à volta dos pilares 6 |
| [east-demolition-deck-end](gallery/east-demolition-deck-end.png) | fuligem na ponta do vão 5 |
