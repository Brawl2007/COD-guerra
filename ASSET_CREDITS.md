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
| Humanos, wz.29, mãos, comboios, aviões, solo e edifícios de M01 | Geometrias originais em `src/render/m01-view.js` | Placeholders próprios, sem assets da bancada de 1944 ou extracção de jogos. Uniformes, silhuetas, detalhes e animações finais pendentes. |
| Disparo/ferrolho/clipe do wz.29 | Síntese original própria em `src/core/audio.js` | Não reutiliza a amostra nem a sequência de recarga da M1. Ainda falta gravação/mixagem final. |

Nenhum asset profissional novo foi adquirido ou considerado licenciado sem evidência. Os requisitos seguintes permanecem em `assets-needed.md` e no prompt mestre.
