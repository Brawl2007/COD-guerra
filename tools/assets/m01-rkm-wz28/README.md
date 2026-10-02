# Gerador da rkm wz.28 (M01)

Gera `assets/models/provisional/m01/weapons/rkm_wz28/`: a arma em LOD0/1/2, os clips para o rig dos soldados e `manifest.json`. Usa geometria em loft/torno e texturas procedurais originais.

- `src/rkm.mjs`: peças, pivôs, sockets, pintores e proveniência das medidas (`MEASURES`).
- `src/clips.mjs`: `rkm_carry`, `rkm_aim` e `rkm_fire_burst`, com o solver de `../m01-soldiers/src/pose.mjs`.
- `build.mjs`: atlas, LODs (meshoptimizer), GLB (gltf-transform) e manifesto.
- `render/capture.mjs`: capturas de verificação em `docs/assets/m01-rkm-wz28/`, feitas no palco de `../m01-soldiers/render/`.

Instruções, conteúdo, fontes e limitações: [`docs/assets/m01-rkm-wz28/README.md`](../../../docs/assets/m01-rkm-wz28/README.md).
