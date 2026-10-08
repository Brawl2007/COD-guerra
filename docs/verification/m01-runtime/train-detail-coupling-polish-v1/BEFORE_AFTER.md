# Antes / depois — composição do trem 963

BEFORE: build de produção da base exacta `99309d9cb023cc94a07d41ff863e1362e4460570` (worktree destacada, só com o spec novo copiado). AFTER: build de produção do HEAD de código `09e58584931d37445e010a9429d74adfbf87abfa`. Spec idêntico nos dois (`tests/browser/m01-train-consist-polish.spec.js`, SHA-256 `bd6ca2877005c70b683a8811950365e30ba408629ee67f7bdd7125eebe73afc0`), BEFORE com `M01_BASELINE_CAPTURE=1`.

Chromium/SwiftShader, 1280×720, `?debug=1`. Estados reais da rota de controlos (`tests/helpers/m01-route.js`, seed 19390901): chegada do trem às 04:50 ("Proteja o reparo") e 06:13 depois da demolição leste (sol acima do horizonte, Panzerzug ao lado). O fixture só reposiciona o jogador (fora da área jogável, para ver a composição de perto); tudo carrega no menu, o jogo corre dois frames e pausa, e o teste confirma que o jogador ficou na posição encenada. Não é playtest humano nem medida de FPS.

| Vista | Qualidade | BEFORE | AFTER | Lado a lado |
|---|---|---|---|---|
| Vagão perto | High | [png](screenshots/BEFORE-wagon-near-high.png) | [png](screenshots/AFTER-wagon-near-high.png) | [jpg](screenshots/PAIR-wagon-near-high.jpg) |
| Dois vagões ligados | High | [png](screenshots/BEFORE-coupling-pair-high.png) | [png](screenshots/AFTER-coupling-pair-high.png) | [jpg](screenshots/PAIR-coupling-pair-high.jpg) |
| Dois vagões ligados | Low | [png](screenshots/BEFORE-coupling-pair-low.png) | [png](screenshots/AFTER-coupling-pair-low.png) | [jpg](screenshots/PAIR-coupling-pair-low.jpg) |
| Estrado (lado sul, por cima da linha existente) | High | [png](screenshots/BEFORE-underframe-high.png) | [png](screenshots/AFTER-underframe-high.png) | [jpg](screenshots/PAIR-underframe-high.jpg) |
| Composição a média distância | High | [png](screenshots/BEFORE-consist-medium-high.png) | [png](screenshots/AFTER-consist-medium-high.png) | [jpg](screenshots/PAIR-consist-medium-high.jpg) |
| Composição a média distância | Low | [png](screenshots/BEFORE-consist-medium-low.png) | [png](screenshots/AFTER-consist-medium-low.png) | [jpg](screenshots/PAIR-consist-medium-low.jpg) |
| Composição ao longe (≈270 m) | High | [png](screenshots/BEFORE-consist-far-high.png) | [png](screenshots/AFTER-consist-far-high.png) | [jpg](screenshots/PAIR-consist-far-high.jpg) |
| Composição com sol (06:13) | High | [png](screenshots/BEFORE-consist-daylight-high.png) | [png](screenshots/AFTER-consist-daylight-high.png) | [jpg](screenshots/PAIR-consist-daylight-high.jpg) |
| Locomotiva–vagão 1 (limite conhecido) | High | [png](screenshots/BEFORE-locomotive-wagon1-high.png) | [png](screenshots/AFTER-locomotive-wagon1-high.png) | [jpg](screenshots/PAIR-locomotive-wagon1-high.jpg) |
| Falha total dos GLB (proxies) | High | [png](screenshots/BEFORE-fallback-proxies-high.png) | [png](screenshots/AFTER-fallback-proxies-high.png) | [jpg](screenshots/PAIR-fallback-proxies-high.jpg) |

O que muda à vista: as rodas deixam de flutuar ~0,83 m e assentam nos carris de uma via própria (travessas, balastro); deixa de haver luz por baixo do estrado; mangueiras, engates e mangas dos tampões preenchem o espaço entre vagões; tons diferentes por vagão. O LOD por vista (`lod` no spec) é o mesmo nos dois runs.

Galeria isolada (módulo real + GLB reais, sol neutro, câmara livre; não é o jogo): `gallery/*.png` e `gallery/gallery-report.json`, gerada por `tools/verification/m01-train-consist-gallery.mjs`. Mostra engate e mangueiras de perto, estrado com freio, roda sobre o carril e de topo (verdugos dentro da via), quatro vagões com variação, fim da composição, e o mesmo intervalo nos conjuntos mid/far/Low.

Reproduzir: `npm run build && npx playwright test tests/browser/m01-train-consist-polish.spec.js` (AFTER); numa worktree de `99309d9` com o mesmo spec copiado, `npm run build && M01_BASELINE_CAPTURE=1 npx playwright test tests/browser/m01-train-consist-polish.spec.js` (BEFORE). Pares: `python3 tools/verification/m01-train-consist-pairs.py <before> <after> screenshots`.
