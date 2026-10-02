# Gerador da ckm wz.30 (M01)

Gera `assets/models/provisional/m01/weapons/ckm_wz30/`: a arma no tripé, com fita e caixa, em LOD0/1/2 (cada um com os clips `ckm_wz30_gun_*`), os clips da guarnição para o rig polaco e `manifest.json`. A geometria é feita por loft e torno, e as texturas são procedurais e originais. A geração é determinística.

- `src/ckm.mjs`: peças, pivôs (`PIVOTS`/`PARENTS`), sockets, pintores e origem das medidas (`MEASURES`, com `estimated`).
- `src/clips.mjs`: estado da arma e poses do atirador e do municiador para `idle`, `aim`, `fire_burst`, `feed` e `abandon`, com o solver de `../m01-soldiers/src/pose.mjs`. O lugar do atirador é resolvido para o olho ficar na linha de mira.
- `build.mjs`: atlas, LODs (meshoptimizer), GLB (gltf-transform), clips e manifesto.
- `render/capture.mjs`: capturas de verificação em `docs/assets/m01-ckm-wz30/`, no palco de `../m01-soldiers/render/`. Precisa de `CHROME_EXECUTABLE` se o Playwright não encontrar o Chromium.

Reutiliza primitivas de `../m01-rkm-wz28/src/rkm.mjs` e geometria, texturas e montagem de `../m01-soldiers/src/`. Corre `npm ci` também nesses directórios e `npm run fetch` em `../m01-soldiers` (malha base CC0 do MakeHuman, para os clips). Sem essa malha, `npm run build` pára com erro antes de escrever; `node build.mjs --geometry-only --out <pasta>` gera só a geometria, sem clips, e recusa a pasta dos entregáveis.

```
npm ci && npm run build      # GLB + manifesto
npm run render               # capturas (todas) ou: node render/capture.mjs ckm_views
```

Instruções, conteúdo, fontes e limitações: [`docs/assets/m01-ckm-wz30/README.md`](../../../docs/assets/m01-ckm-wz30/README.md).
