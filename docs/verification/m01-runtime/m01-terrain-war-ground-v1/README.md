# M01-TERRAIN-WAR-GROUND-V1 (T09 família terreno + T28)

Branch `claude/m01-war-scars-v1`, base `f51c9c1` (integração M01). Só apresentação: `git diff --exit-code f51c9c1 -- src/game src/world src/core missions` vazio.
Geometria do terreno, alturas e colliders intactos; o material novo ocupa o slot `ground` (`src/render/m01-view.js`, mesmo mesh).

## O que mudou

- **Texturas** `assets/textures/m01/terrain/` (6 PNG + `terrain.manifest.json`), geradas por `tools/assets/m01-materials/generate.mjs` (determinístico, sem npm).
  Autor `COD-guerra project, original procedural`, licença `CC0-1.0`, tiles de 4 m e 1,6 m. Ver `tools/assets/m01-materials/README.md`.
- **Máscara macro** `src/render/m01-terrain-mask.js` (pura): cozida ao carregar a partir de `road_approach_west`, `ignition_line`,
  `rail_embankment_west` / `rail_line_southwest` / `rail_line_east` (largura do balastro a partir de `M01_TRACK_CENTRES`) e do polígono `vistula_channel`.
  RGBA8 em metros: R distância normalizada ao caminho batido, G ao balastro, B distância com sinal à margem, A campo macro (ruído de valor, sem `Math.random`).
- **Material** `src/render/m01-terrain-material.js` (`m01-terrain-macro-v1`): campo lavrado / prado / lama revolvida, caminho com rodeiras, balastro,
  faixa húmida e escura junto ao Vístula (+ mistura por declive nas margens íngremes), palha e fuligem, normais de detalhe, anti-repetição (duas amostras
  rodadas, misturadas por ruído de baixa frequência). Luz, nevoeiro, sombras (duas cascatas T16) e grading T44 intactos: só se alteram `map`, `roughness` e `normal`.
- **A/B** `?terrain=legacy` (só apresentação) repõe a textura `soil` única.
- **Diagnóstico** `gameDiagnostics().m01.terrain = {material, textures, gpuBytes, quality, tier, lowDetail, files, mask, samplers, failures}`.

## Orçamento (calculado dos tamanhos, RGBA8 + cadeia completa de mips, não medido)

| Tier | Texturas | Conjunto | GPU (MiB) | Limite |
| --- | --- | --- | --- | --- |
| High | 5 | máscara 2048x640, detalhe A 1024², detalhe B 512², normal A 1024², normal B 512² | 20,00 (20 971 500 B) | 24 |
| Medium | 5 | máscara 1024x320 + os mesmos quatro a 512² | 7,00 (7 340 012 B) | 8 |
| Low | 2 | máscara 1024x320 + detalhe A 512² (uma amostra, sem normal, sem detritos) | 3,00 (3 145 712 B) | 8 |

- Samplers: 5 declarados (máscara, 2 detalhes, 2 normais) contra 2 do solo antigo (`map` + `bumpMap`): **+3** (limite +4). Na Low o ramo `m01LowDetail` só amostra máscara + detalhe A.
- Draw calls: **+0** (mesmo mesh; nos A/B as contagens são iguais: 351/351, 507/507, 373/373).
- Mudança de qualidade: o material volta a cozer a máscara, troca o conjunto e faz `dispose()` das texturas substituídas (testado em Node).
- Sem FPS: nenhuma medição na máquina de referência (Intel HD 5500). O custo do fragmento (≤9 leituras + 3 ruídos) por medir.

## Provas

Spec `tests/browser/m01-terrain-war-ground.spec.js` (8 casos, 6,3 min, `--workers=1 --retries=0`, Chromium 1194 com SwiftShader): **8/8 passam**.
Vistas agachadas (olho 1,08 m, pitch -1,25 rad: o ponto de chão mais próximo está a 1,14 m): ao longo da `ignition_line` a 1,14 / 5 / 50 m de distância olho-chão, mais balastro (`rail-5m`),
estrada de carroças (`road-5m`) e margem do Vístula (`bank-5m`). Estado inicial real da simulação; só a posição e a vista do jogador mudam.

| Vista | Imagem | Luminância média / desvio (região de chão 600x440 ou 600x280 px) | Textura local (std 8x8) | Legado (`?terrain=legacy`) |
| --- | --- | --- | --- | --- |
| 1,14 m | `m01-terrain-near-1m-high.jpg` | 46,1 / **13,3** | **5,38** | 26,7 / 6,17 / 2,74 |
| 5 m | `m01-terrain-mid-5m-high.jpg` | 46,5 / **15,1** | **8,54** | 25,7 / 5,71 / 3,15 |
| 50 m | `m01-terrain-far-50m-high.jpg` | 33,7 / **19,0** | **7,17** | 24,9 / 10,04 / 3,33 |

**A/B de píxeis**: a variância do chão mais do que duplica a 1 m e 5 m (13,3 vs 6,2; 15,1 vs 5,7) e quase duplica a 50 m (19,0 vs 10,0); a riqueza local de textura sobe 2 a 2,7 vezes.
O spec exige variância e riqueza local estritamente maiores que as do legado e draw calls não superiores. A luminância média do chão sobe (46 vs 26): as tintas novas
são mais claras (o solo antigo era quase preto ao amanhecer); a iluminação T16 e o grading T44 não foram tocados.
Outras imagens: `rail-5m` (balastro entre travessas), `road-5m` (estrada batida, bordos de lama), `bank-5m` (limo molhado e brilhante junto à água),
`mid-5m-medium` e `mid-5m-low` (tiers). Relatórios JSON por vista ao lado das imagens. Os `*-legacy.jpg` são os mesmos pontos com o solo antigo.

## Limites conhecidos

- Medição de FPS e de memória real na máquina de referência por fazer (só números calculados). Resultados em SwiftShader não são prova de desempenho.
- Os arbustos/tufos 3D e as rodeiras são pouco legíveis ao amanhecer; as rodeiras só existem na estrada e no caminho (largura normalizada, 4 cm de profundidade analítica).
- Normais do prado e da margem reutilizam as do campo/lama (4 canais por PNG). Sem triplanar (o declive da margem ocupa 5 m e a esticada vertical é pequena).
- Crateras e marcas de explosão continuam a ser dos decals (T18/T27); a máscara não usa `blastZones` (o chão antes do rebentamento não deve estar queimado).
- Fora da extensão da malha (x -700..1300, z -285..365) as caixas de enchimento usam só cor macro neutra.
- PNG de dados carregados com `createImageBitmap(premultiplyAlpha:'none', colorSpaceConversion:'none')`; se o navegador não o suportar, o material cai para a cor macro (falha registada em `terrain.failures`).
