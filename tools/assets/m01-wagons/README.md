# Gerador dos vagões de M01 (coberto e aberto)

Gera `assets/models/provisional/m01-wagons/`: os vagões de mercadorias coberto (tipo G, portas de correr) e aberto (tipo O), em LOD0/1/2, com rodados e portas animados, e `manifest.json`. Usa geometria e pintura procedurais originais.

- `src/wagons.mjs`: dimensões, proveniência das medidas (`MEASURES`), primitivas (paralelepípedo, prisma e sólido de revolução com faces planas e UV em metros), peças, pivôs, sockets e pintores.
- Geometria, atlas, ruído e texturas vêm de `../m01-soldiers/src/`; é preciso `npm ci` também nessa pasta.
- `build.mjs`: atlas, LODs (meshoptimizer), GLB com animações (gltf-transform) e manifesto.
- `render/`: galeria isolada (three.js e Playwright do repositório) e `import-report.json`.

Instruções, identificação, fontes e integração: [`docs/assets/m01-wagons/README.md`](../../../docs/assets/m01-wagons/README.md).
