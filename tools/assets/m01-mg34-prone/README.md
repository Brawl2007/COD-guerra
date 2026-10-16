# Gerador da MG 34 deitada (M01)

Gera `assets/models/provisional/m01/weapons/mg34-prone/`: `m01_mg34_prone_animations.glb` com os clips `mg34_prone_*` do atirador e `mg34_loader_prone_*` do municiador, para o rig alemão actual, e `manifest.json`. Não gera malhas: a arma é o kit de `../m01-mg34/` (PR #30), reutilizado sem alterações.

- `src/prone.mjs`: corpo deitado do atirador, pés, arma sobre o bípode aberto (inclinação até as patas tocarem no chão) e mãos de pontaria.
- `src/clips.mjs`: os 9 clips, os eventos, o corpo do municiador, a passagem do tambor e o ajuste dos pés ao chão medido na pele das botas.
- `src/skin.mjs`: skinning linear (LBS) dos vértices do soldado para medir contactos com o chão (joelhos, cotovelos, coxas, botas).
- `build.mjs`: GLB (gltf-transform), SHA-256 dos ficheiros reutilizados e contactos no `manifest.json`.
- `render/capture.mjs`: capturas de verificação e `import-report.json` em `docs/assets/m01-mg34-prone/`, feitas no palco de `../m01-soldiers/render/`.

Reutiliza só funções exportadas por `../m01-soldiers/`, `../m01-rkm-wz28/` e `../m01-mg34/`; nenhum desses geradores é editado.

Instruções, ligação, janela de tiro, contactos, fontes e limitações: [`docs/assets/m01-mg34-prone/README.md`](../../../docs/assets/m01-mg34-prone/README.md).
