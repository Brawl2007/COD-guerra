# Pipeline de assets

`src/assets/asset-manager.js` usa GLTFLoader/OBJLoader/MTLLoader/TextureLoader oficiais de Three.js. GLB/glTF conservam scene graph, skinning, UVs, materiais e clips. O formato final de humanos/armas será GLB riggado. A API `animate` cria AnimationMixer; clips reais ainda precisam de assets licenciados e validação visual.

`assets/models` contém os três modelos OBJ/MTL originais da bancada. O plugin Vite `original-assets` copia este directório para `dist/assets`. URLs sempre usam `assetUrl()` e `BASE_URL`; não usar caminhos absolutos `/assets` que quebrem Pages.

Os soldados OBJ tinham triângulos sobrepostos em partes arredondadas. `mesh-repair.js` reconstrói apenas Uniform/Face/Helmet desses dois placeholders originais; a transformação não se aplica a assets finais/importados.

Materiais de alvenaria, madeira, terra e metal são CanvasTextures originais, criadas uma vez em `src/render/materials.js`. Não equivalem a um conjunto final de texturas PBR fotografadas. Áudio permanece procedural.

## Cache e ciclo de vida

- Uma promise por nome/URL deduplica carregamentos. Falhas removem a entrada e ficam em `failures`.
- `beginSession/current` invalidam inserções tardias; disposal invalida todas as callbacks.
- `dispose` recolhe geometria, material e textura únicos; clones de skeleton são criados com SkeletonUtils.
- Renderer libera materiais próprios de cada actor, instancing, texturas procedurais e contexto no encerramento.
- Fallback permite jogar se um modelo falta; isso não aprova qualidade artística final.

## Aprovação de asset final

Registar autoria/licença em `ASSET_CREDITS.md`; conferir metros, eixos, pivôs, escala, socket de cano/mãos, clips, colisores e disponibilidade histórica. Nunca extrair arquivos de Call of Duty. Não usar base64 gigante ou comprometer um patch inteiro por binários indisponíveis.
