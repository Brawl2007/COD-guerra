# Capturas do roadmap final de M01 — 2026-10-07

Evidência de [`docs/M01_FINAL_ROADMAP.md`](../../../M01_FINAL_ROADMAP.md). Estado avaliado: `claude/m01-train-detail-coupling-polish-dws18u @ 0fca9e2`, isto é, a base `codex/m01-bridge-portal-material-detail-polish-v1 @ 99309d9cb023cc94a07d41ff863e1362e4460570` mais `M01-TRAIN-DETAIL-COUPLING-POLISH-V1` (código de produção de `09e5858`; os commits seguintes são documentação). Build de produção servido em `/COD-guerra/`, Chromium/SwiftShader, 1280×720, `?debug=1`.

## Como foram feitas

Harness: [`tools/verification/m01-roadmap-captures.spec.js`](../../../../tools/verification/m01-roadmap-captures.spec.js) com a configuração própria [`tools/verification/playwright.roadmap.config.js`](../../../../tools/verification/playwright.roadmap.config.js) (fora de `npm run test:browser`). Cada vista parte de um snapshot **real** da rota de controlos (`tests/helpers/m01-route.js`, semente 19390901): início 04:30:44 (`M01Simulation` após um tick), bombardeamento 04:34:21 (driver real até os Stukas estarem no céu, sem eventos injectados), arrasto da estação 04:40:16 (`toStationEvacuation`), reparo 04:42:09, ameaça no reparo 04:50:12–15, retirada 06:05:02, demolição leste 06:10:03, demolição oeste 06:45:00, chamada 07:05:00, e 06:13:17 fora da área jogável junto ao Panzerzug (`eastDemolitionOutside`). Só o jogador é reposicionado (posição e olhar); tudo carrega no menu, o jogo continua, corre três frames e pausa; a captura esconde o overlay de pausa. `counters.json` guarda, por vista, o relógio de batalha, a posição do jogador, `drawCalls`/`triangles`/`textures`/`geometries` de `gameDiagnostics()` e o número de actores com LOD atribuído; as posições registadas coincidem com as pedidas em `targets.json`. `capture.log` é a saída do Playwright (1 passed, 7,4 min).

Limites: não é playtest humano, não mede FPS e corre em SwiftShader. A vista 05 pretendia mostrar a mira (ADS), mas `aiming` no snapshot não produz a pose de mira (a mira é input contínuo), por isso mostra a arma na anca. As imagens publicadas são JPEG (qualidade 85) dos PNG originais; reproduzir o conjunto com o comando abaixo.

## Vistas

| Vista | Preset | Relógio | Jogador x, z | Alvo x, z | Draw calls | Triângulos | Texturas | Actores com LOD |
|---|---|---|---|---|---|---|---|---|
| [01-start-section-close](screenshots/01-start-section-close.jpg) | High | 04:30:44 | -74, 30 | -76, 24 (1 actores) | 134 | 446k | 107 | 13/13 |
| [02-start-station-facade](screenshots/02-start-station-facade.jpg) | High | 04:30:44 | -330, 0 | -399, 35 | 70 | 381k | 37 | 1/1 |
| [03-start-hut-objective](screenshots/03-start-hut-objective.jpg) | High | 04:30:44 | -242, 32 | -262, 20 | 97 | 377k | 55 | 4/4 |
| [04-start-west-portal-bridge](screenshots/04-start-west-portal-bridge.jpg) | High | 04:30:44 | -48, 9 | -4, 1 | 261 | 477k | 107 | 13/13 |
| [05-start-ads-viewmodel](screenshots/05-start-ads-viewmodel.jpg) | High | 04:30:44 | -66, 22 | -4, 1 | 264 | 470k | 107 | 13/13 |
| [06-bombing-stukas](screenshots/06-bombing-stukas.jpg) | High | 04:34:21 | -66, 22 | -115, 153 | 138 | 429k | 103 | 12/12 |
| [07-bombing-station-yard](screenshots/07-bombing-station-yard.jpg) | High | 04:34:21 | -300, -10 | -345, 25 | 78 | 383k | 37 | 1/1 |
| [08-station-drag](screenshots/08-station-drag.jpg) | High | 04:40:16 | -301, 36 | -310, 29 | 89 | 401k | 49 | 3/3 |
| [09-repair-sappers](screenshots/09-repair-sappers.jpg) | High | 04:42:09 | -146, 14 | -122, 10 (3 actores) | 225 | 446k | 82 | 8/8 |
| [10-repair-threat-lisewo-far](screenshots/10-repair-threat-lisewo-far.jpg) | High | 04:50:12 | -120, 17 | 1063, 6 | 283 | 592k | 114 | 14/14 |
| [11-repair-threat-sappers-pinned](screenshots/11-repair-threat-sappers-pinned.jpg) | High | 04:50:15 | -140, 20 | -122, 10 (3 actores) | 252 | 547k | 99 | 11/11 |
| [12-withdrawal-deck-east](screenshots/12-withdrawal-deck-east.jpg) | High | 06:05:02 | 38, 42 | 1064, 41 (10 actores) | 298 | 805k | 86 | 10/10 |
| [13-withdrawal-platoon](screenshots/13-withdrawal-platoon.jpg) | High | 06:05:02 | 38, 42 | 0, 0 | 259 | 760k | 88 | 10/10 |
| [14-east-demolition](screenshots/14-east-demolition.jpg) | High | 06:10:03 | 38, 42 | 794, 0 | 297 | 804k | 87 | 10/10 |
| [15-west-demolition](screenshots/15-west-demolition.jpg) | High | 06:45:00 | -292, 26 | -4, 3 | 509 | 900k | 198 | 28/28 |
| [16-roll-call](screenshots/16-roll-call.jpg) | High | 07:05:00 | -248, 80 | -260, 73 (6 actores) | 343 | 753k | 209 | 28/28 |
| [17-panzerzug-daylight](screenshots/17-panzerzug-daylight.jpg) | High | 06:13:17 | 1092, 24 | 1150, 3 | 355 | 962k | 203 | 28/28 |
| [18-repair-threat-low](screenshots/18-repair-threat-low.jpg) | Low | 04:50:12 | -120, 17 | 1063, 6 | 243 | 512k | 99 | 11/11 |
| [19-start-section-close-low](screenshots/19-start-section-close-low.jpg) | Low | 04:30:44 | -74, 30 | -76, 24 (1 actores) | 126 | 365k | 107 | 13/13 |

## Reproduzir

```sh
npm ci && npm run build
ROADMAP_OUT=test-results/m01-roadmap npx playwright test -c tools/verification/playwright.roadmap.config.js
# subconjunto: ROADMAP_VIEWS=01,17 (prefixos das vistas, separados por vírgula)
```

Os contadores saem no log como linhas `ROADMAP_CAPTURE {...}` e `ROADMAP_TARGETS [...]`.
