# Gerador dos vagões queimados e danificados de M01

Gera `assets/models/provisional/m01-wagon-damage/`. Os vagões coberto e aberto do kit intacto ficam em dois estados, queimado (`burned`) e danificado (`damaged`). Cada estado tem LOD0/1/2 e há um `manifest.json`. A geometria e a pintura são procedurais e originais.

- `src/shapes.mjs`: primitivas.
  - `box` e `bar` seguem a construção do kit intacto, que não as exporta.
  - `slab` extruda contornos não convexos por ear clipping: bordos queimados e furos.
  - `warp` e `rotateAbout` deformam peças existentes.
  - `roofArc` desenha o arco do tejadilho.
- `src/damage.mjs`: os quatro estados. Parte das peças de `../m01-wagons/src/wagons.mjs` (importado, não editado), retira, acrescenta e deforma peças, e regista cada alteração. Tem também os pivôs, os sockets (mais `impact`) e os pintores de madeira e aço queimados e do impacto.
- `build.mjs`:
  - atlas;
  - LODs com meshoptimizer, nas proporções do intacto;
  - GLB com `wheels_roll` e, só no coberto danificado, `doors_open` da porta esquerda;
  - manifesto com triângulos, draw calls, bytes, diferenças da caixa e sha256 do kit intacto.
- `render/`: galeria isolada, com o three.js e o Playwright do repositório, e `import-report.json`.

É preciso `npm ci` em `../m01-soldiers`, `../m01-wagons` e nesta pasta. Instruções, contrato para o runtime e limitações: [`docs/assets/m01-wagon-damage/README.md`](../../../docs/assets/m01-wagon-damage/README.md).
