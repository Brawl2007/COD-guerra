# Gerador do kit de props de M01

Gera `assets/models/provisional/m01/props/` (21 props em LOD0/LOD1 e `manifest.json`) sem dependências: `node tools/assets/m01-props/build.mjs` (`--check` compara com o disco).

- `src/mesh.mjs`: primitivas (caixa subdividida, cilindro, superelipsoide, tubo, prisma, grelha), materiais PBR e envelhecimento comum; cor de vértice.
- `src/glb.mjs`: escritor GLB mínimo e determinístico. `src/noise.mjs` vem de `../m01-soldiers/src/`.
- `src/props-*.mjs`: os props (suprimentos, linha/cercas, equipamento ferroviário, carroças); `src/registry.mjs`: ids, descrições e referências.
- `render/`: página de verificação (three.js) e `capture.mjs` (Playwright) que escreve as capturas em `docs/assets/m01-props/captures/`.

Lista, tamanhos, fontes e limitações: [`docs/assets/m01-props/README.md`](../../../docs/assets/m01-props/README.md).
