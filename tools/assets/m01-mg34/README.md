# Gerador da MG 34 (M01)

Gera `assets/models/provisional/m01/weapons/mg34/`: a arma em LOD0/1/2, os clips `mg34_*` para o rig dos soldados e `manifest.json`. Usa geometria em loft e torno e texturas procedurais originais.

- `src/mg34.mjs`: peças, pivôs, sockets, pintores e proveniência das medidas (`MEASURES`). As primitivas `section`, `tube`, `blk`, `rod` e `sweep` vêm de `../m01-rkm-wz28/src/rkm.mjs`.
- `src/clips.mjs`: `mg34_aim`, `mg34_fire_burst` e `mg34_reload`, com o solver de `../m01-soldiers/src/pose.mjs`. As peças móveis da arma são nós da cena, animados pelo nome.
- `build.mjs`: atlas, LODs (meshoptimizer), GLB (gltf-transform) e manifesto.
- `render/capture.mjs`: capturas de verificação e `import-report.json` em `docs/assets/m01-mg34/`, feitas no palco de `../m01-soldiers/render/`.

Instruções, conteúdo, fontes e limitações: [`docs/assets/m01-mg34/README.md`](../../../docs/assets/m01-mg34/README.md).
