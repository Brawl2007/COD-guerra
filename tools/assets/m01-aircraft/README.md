# Gerador de aviões de M01 (Ju 87 B-1)

Gera `assets/models/provisional/m01-aircraft/`, com o Ju 87 B-1 em LOD0/1/2, a hélice e os freios de mergulho animados, e `manifest.json`. Usa geometria em loft/torno e pintura procedural originais.

- `src/ju87.mjs`: planta, peças, pivôs, sockets, pintores e proveniência das medidas (`MEASURES`).
- Geometria, atlas, ruído e texturas vêm de `../m01-soldiers/src/` (é preciso `npm ci` também nessa pasta).
- `build.mjs`: atlas, LODs (meshoptimizer), GLB com animações (gltf-transform) e manifesto.
- `render/`: galeria isolada (three.js e Playwright do repositório) e `import-report.json`; a opção `runtime` do viewer aplica os materiais e o céu de ambiente do jogo (`src/render/m01-aircraft.js`). `render/raid-capture.mjs` captura o primeiro raid real no build de produção (`npm run build && npm run preview`), em várias qualidades, com recorte 1:1 ampliado e contadores do renderer.

Instruções, variante, fontes e integração: [`docs/assets/m01-aircraft/README.md`](../../../docs/assets/m01-aircraft/README.md).
