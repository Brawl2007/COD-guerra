# Créditos dos assets

| Conteúdo | Origem | Situação |
| --- | --- | --- |
| `assets/models/*.obj` e `*.mtl` | Placeholders originais já existentes no repositório; autoria declarada no README anterior | Redistribuídos na bancada; sem conteúdo extraído de outro jogo. A licença global do projecto ainda não foi escolhida pelo proprietário. |
| Texturas em `src/render/materials.js` | Geração procedural original nesta alteração | Incluídas como código, sem downloads externos. |
| Geometrias arredondadas de reparação e primitivas | Código original usando Three.js | Provisórias; não representam humanos de qualidade final. |
| Efeitos sonoros em `src/core/audio.js` | Síntese procedural original já existente, preservada | Provisórios, sem vozes gravadas. |
| Three.js | https://github.com/mrdoob/three.js | Dependência MIT; licença distribuída no pacote. |
| `assets/models/provisional/m01/*.glb` | Gerador original de Claude Code em `tools/assets/m01-bridges/`, completado no PR #11 | Modelos provisórios; histórico e autoria preservados. Medidas/atribuições em `missions/m01-tczew/BRIDGE_ASSET_REPORT.md`. Dados modernos G01 incluem ODbL/OpenStreetMap; incertezas de 1939 continuam explícitas. |
| `bridge-colliders.json` e juntas/posts | Exportação própria dos GLB revistos e aproximações de ligação/aberturas em `TczewWorld` | Apenas dados de física; reprodutíveis. Não são levantamento histórico final nem colisão exacta das treliças/ruínas. |
| `assets/models/provisional/m01/characters/*.glb` (soldados de 1939) | Gerador original de Claude Code em `tools/assets/m01-soldiers/`. A malha base, os alvos, o esqueleto e os pesos são dados **CC0** do MakeHuman (https://github.com/makehumancommunity/makehuman, commit fixo em `makehuman.lock.json`, sem código AGPL). Fardamento, equipamento, kb wz.29/Kar98k, texturas e 15 clips são originais. | Provisórios verificados (`tests/m01-soldiers-glb.test.js`, `docs/assets/m01-soldiers/`), ainda não ligados ao jogo. A águia com suástica e os decalques do M35 foram omitidos de propósito. |
| Humanos, wz.29, mãos, comboios, aviões, solo e edifícios de M01 | Geometrias originais em `src/render/m01-view.js` e poses em `src/render/m01-actor-pose.js` | Placeholders próprios, sem assets da bancada de 1944 ou extracção de jogos. Uniformes, silhuetas, detalhes e animações finais pendentes. |
| Disparo/ferrolho/clipe do wz.29 | Síntese original própria em `src/core/audio.js` | Não reutiliza a amostra nem a sequência de recarga da M1. Ainda falta gravação/mixagem final. |

Nenhum asset profissional novo foi adquirido ou considerado licenciado sem evidência. Os requisitos seguintes permanecem em `assets-needed.md` e no prompt mestre.

## Revisão visual de M01

`m01-surfaces.js`, `m01-atmosphere.js`, `m01-environment.js` e o perfil/atributos adicionais de humanos/wz.29 são código e arte procedural originais. Texturas geradas uma vez no cliente, sem downloads nem conteúdo extraído de COD. O kit GLB original do Claude é preservado; a apresentação aplica novos materiais em tempo de execução. As posições de `m01-decoration-layout.js` são composição artística, não cartografia histórica. Folhagem/detalhes pequenos são não sólidos; os 17 troncos próximos têm caixas de física reproduzíveis. Humanos continuam provisórios e estilizados, sem aprovação de uniformes/rig/arte final. A licença global do projecto continua por decidir pelo proprietário.
