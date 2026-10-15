# Gerador do kit de props de M01

Gera `assets/models/provisional/m01/props/` (21 props em LOD0/LOD1 e `manifest.json`) sem dependências: `node tools/assets/m01-props/build.mjs` (`--check` compara com o disco).

- `src/mesh.mjs`: primitivas (caixa subdividida, cilindro, superelipsoide, tubo, prisma, grelha), materiais PBR e envelhecimento comum; cor de vértice.
- `src/glb.mjs`: escritor GLB mínimo e determinístico; arredonda posições, normais e cores a uma grelha fixa (`QUANT`). `src/noise.mjs` vem de `../m01-soldiers/src/`.
- `src/pmath.mjs`: sin/cos/atan2/asin/exp/log/pow só com aritmética IEEE exacta. O gerador **não** pode usar `Math.sin/cos/pow/exp/atan2/hypot` nem `**`: o libm do V8 muda o último bit conforme a CPU/versão e os GLB deixavam de ser iguais entre aarch64 e x86 (o teste `m01-props-kit` falha se alguém os voltar a usar).
- `src/props-*.mjs`: os props (suprimentos, linha/cercas, equipamento ferroviário, carroças); `src/registry.mjs`: ids, descrições e referências.
- `render/`: página de verificação (three.js) e `capture.mjs` (Playwright) que escreve as capturas em `docs/assets/m01-props/captures/`.

Lista, tamanhos, fontes e limitações: [`docs/assets/m01-props/README.md`](../../../docs/assets/m01-props/README.md).
