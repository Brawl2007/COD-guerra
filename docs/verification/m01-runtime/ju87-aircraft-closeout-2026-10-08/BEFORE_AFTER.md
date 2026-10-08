# Antes / depois — primeiro raid em produção

BASE: `codex/m01-bridge-portal-material-detail-polish-v1 @ 99309d9` (worktree limpa, `vite build` e `vite preview` próprios). CANDIDATA: esta branch, build de produção. Ferramenta: [`tools/assets/m01-aircraft/render/raid-capture.mjs`](../../../../tools/assets/m01-aircraft/render/raid-capture.mjs).

Procedimento igual nos dois lados: o driver da simulação (seed 19390901) avança até ao tick em que `renderState.stukas` passa a verdadeiro e guarda esse snapshot genuíno (relógio 146.00 s, 04:33:10.00). O jogo de produção abre com `?debug=1`, a qualidade escolhida e **Continuar**; espera os três LOD do Ju 87, deixa correr +4 s (ou +30 s) de relógio da missão, mira o avião 0 por input relativo do rato, pausa por pointer lock e fotografa 1280×720 com o painel de pausa escondido. O relógio no momento da foto difere décimas de segundo entre corridas (tempo real), por isso o avião pode estar 1–2 m deslocado. Não é playtest humano nem medição de FPS.

Os originais são PNG sem alterações. Os recortes são uma janela 1:1 de 320×180 em torno do avião, ampliada ×3 por vizinho mais próximo; os pares só acrescentam etiquetas. Contadores do renderer em [PERFORMANCE.md](PERFORMANCE.md).

| Captura | Qualidade | Relógio da missão BASE / CANDIDATA | Hora de batalha | Distância ao avião 0 | LOD | Originais | Recortes 1:1 ×3 | Par |
|---|---|---|---|---|---|---|---|---|
| raid-low | low | 150.35 s / 150.63 s | 04:33:14.35 / 04:33:14.63 | 244 m / 243 m | 2 / 2 | [BASE](captures/BASE/raid-low.png) · [CANDIDATA](captures/CANDIDATE/raid-low.png) | [BASE](captures/BASE/raid-low-crop3x.png) · [CANDIDATA](captures/CANDIDATE/raid-low-crop3x.png) | [par](pairs/PAIR-raid-low.png) |
| raid-medium | medium | 150.92 s / 150.57 s | 04:33:14.92 / 04:33:14.57 | 242 m / 243 m | 1 / 1 | [BASE](captures/BASE/raid-medium.png) · [CANDIDATA](captures/CANDIDATE/raid-medium.png) | [BASE](captures/BASE/raid-medium-crop3x.png) · [CANDIDATA](captures/CANDIDATE/raid-medium-crop3x.png) | [par](pairs/PAIR-raid-medium.png) |
| raid-high | high | 150.62 s / 150.58 s | 04:33:14.62 / 04:33:14.58 | 243 m / 243 m | 1 / 1 | [BASE](captures/BASE/raid-high.png) · [CANDIDATA](captures/CANDIDATE/raid-high.png) | [BASE](captures/BASE/raid-high-crop3x.png) · [CANDIDATA](captures/CANDIDATE/raid-high-crop3x.png) | [par](pairs/PAIR-raid-high.png) |
| raid-low-t30 | low | 176.35 s / 176.60 s | 04:33:40.35 / 04:33:40.60 | 213 m / 214 m | 2 / 2 | [BASE](captures/BASE/raid-low-t30.png) · [CANDIDATA](captures/CANDIDATE/raid-low-t30.png) | [BASE](captures/BASE/raid-low-t30-crop3x.png) · [CANDIDATA](captures/CANDIDATE/raid-low-t30-crop3x.png) | [par](pairs/PAIR-raid-low-t30.png) |
| raid-high-t30 | high | 176.82 s / 176.58 s | 04:33:40.82 / 04:33:40.58 | 214 m / 214 m | 1 / 1 | [BASE](captures/BASE/raid-high-t30.png) · [CANDIDATA](captures/CANDIDATE/raid-high-t30.png) | [BASE](captures/BASE/raid-high-t30-crop3x.png) · [CANDIDATA](captures/CANDIDATE/raid-high-t30-crop3x.png) | [par](pairs/PAIR-raid-high-t30.png) |

## Medida da silhueta

[`tools/verification/m01-ju87-silhouette-metrics.py`](../../../../tools/verification/m01-ju87-silhouette-metrics.py) segmenta cada imagem sozinha (fundo local por mediana 21×21; avião = píxeis a mais de 18 de luminância do fundo) e reporta a mediana; [SILHOUETTE_METRICS.json](SILHOUETTE_METRICS.json) tem os valores completos. A contagem de píxeis inclui a cruz da mira, igual nos dois lados.

| Captura | Píxeis do avião BASE / CANDIDATA | Luminância mediana do avião BASE → CANDIDATA | Céu (mediana) BASE / CANDIDATA | Contraste céu − avião BASE → CANDIDATA |
|---|---:|---:|---:|---:|
| raid-low | 217 / 214 (-1 %) | 14.6 → 77.8 | 171.9 / 171.9 | 157.3 → 94.0 |
| raid-medium | 225 / 206 (-8 %) | 14.9 → 76.3 | 170.9 / 171.8 | 155.9 → 95.5 |
| raid-high | 229 / 202 (-12 %) | 15.5 → 74.5 | 171.8 / 171.8 | 156.3 → 97.3 |
| raid-low-t30 | 289 / 287 (-1 %) | 14.3 → 79.3 | 162.2 / 161.5 | 147.9 → 82.2 |
| raid-high-t30 | 282 / 289 (+2 %) | 14.3 → 79.3 | 161.5 / 161.5 | 147.2 → 82.2 |

## Leitura

- **Barriga e volume:** na base o avião é um recorte quase preto (luminância mediana ~15 contra um céu a ~160–172). Na candidata a barriga RLM 65 lê-se como superfície pintada iluminada pelo solo (~75–79); o contraste com o céu continua alto (~82–97), por isso o avião não se perde no céu.
- **Forma:** o contorno é o do mesmo modelo (a inclinação de apresentação, de poucos graus, muda ligeiramente a projecção); a gaivota, as calças e a cauda continuam legíveis em LOD1 e LOD2. A +4 s a área segmentada da candidata é 1–12 % menor (−3 a −27 px): nos pares a forma e a envergadura são as mesmas, mas as bordas agora cinzento-claras ficam abaixo do limiar de 18 de luminância da segmentação e a inclinação muda um pouco a projecção. A +30 s fica igual (−1 % / +2 %).
- **Atitude:** a +30 s a candidata mostra a inclinação para o lado da deriva; o rumo e a posição são os mesmos.
- **O que não se vê a esta distância (~210–245 m):** o disco da hélice, o vidro e a tripulação ficam abaixo de um píxel útil; vêem-se de perto na galeria (`docs/assets/m01-aircraft/ju87_views.png`, `ju87_details.png`). Fade e histerese não aparecem em fotos estáticas; estão cobertos por testes (`tests/m01-aircraft-runtime.test.js`) e pelos diagnósticos `fade`/`attitude` em `captures/*/raid-capture*.json`.
