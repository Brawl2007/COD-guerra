# Materiais originais M01 · T09 / T28

Gerador Node sem dependências externas. Arte original procedural de sementes fixas; sem downloads, fotografias ou conteúdo extraído de jogos. Autor: `COD-guerra project, original procedural`; licença dos PNG: `CC0-1.0`. Escalas e cores são estimativas artísticas, não medições históricas.

```sh
node tools/assets/m01-materials/generate.mjs             # CLI anterior: terreno (6 PNG + manifesto)
node tools/assets/m01-materials/generate.mjs --out DIR   # terreno noutro directório
node tools/assets/m01-materials/generate.mjs --atlas     # atlas partilhado (6 PNG + manifesto)
node tools/assets/m01-materials/generate.mjs --atlas --out DIR
node tools/assets/m01-materials/generate.mjs --all       # terreno e atlas nos directórios canónicos
node --test tests/m01-material-atlas.test.js tests/m01-terrain-material.test.js tests/m01-terrain-textures.test.js
```

`--all --out DIR` escreve terreno em `DIR` e o atlas em `../atlas`, relativo a `DIR`. A execução anterior sem flags continua compatível.

O atlas High tem 1024², grelha 4×4 de células 256² (248² úteis + gutter periódico de 4 px de cada lado); Low tem 512², com gutters de 2 px. Três mapas partilhados por tier: albedo sRGB, normal XYZ tangencial linear (+Y) e ORM linear (R oclusão, G rugosidade, B metalicidade). Cada canal alpha é opaco. O Low do atlas destina-se a consumidores opt-in futuros; o terreno Low actual usa apenas a máscara macro, sem descarregar detalhes.

As 16 células: campo, prado, lama, caminho, balastro, tijolo dessaturado/argamassa, pedra, madeira, aço pintado, aço oxidado, lona, telha, asfalto, margem húmida, argamassa e reboco. A redução Low filtra albedo/ORM e renormaliza normais. A biblioteca `M01MaterialLibrary` em `src/render/materials.js` lê o manifesto; as texturas são partilhadas, pertencem à biblioteca e são libertadas uma vez. `surface()` continua igual para consumidores existentes. A amostragem repete cada célula, usando o gutter periódico e limitando a pegada dos mipmaps ao gutter para evitar misturar células vizinhas; anisotropia fica no valor padrão 1.

| Texturas | High descodificado RGBA8 |
| --- | --- |
| Atlas albedo / normal / ORM | 12 MiB |
| Terreno detail-a / normal-a 1024² + detail-b / normal-b 512² | 10 MiB |
| Máscara macro 2048×640 | 5 MiB |
| **Total High** | **27 MiB**, abaixo de 40 MiB |

São bytes calculados sem mipmaps, não VRAM medida. Os testes do terreno calculam separadamente a cadeia completa de mipmaps. Manifestos incluem SHA-256, bytes PNG, bytes descodificados, canais, licença, autoria e escala estimada. `src/noise.mjs` e `src/layers.mjs` fornecem ruído periódico, Worley e carimbos; `src/atlas.mjs` pinta PBR e gutters; `src/terrain.mjs` preserva os canais de detalhe originais. O material T28 aplica variação macro, caminhos com sulcos, balastro e margens húmidas, com projecção triplanar de cor/normais nas encostas. Geometria e física permanecem propriedade do mundo.

Galeria: iniciar Vite e abrir `/COD-guerra/tools/assets/m01-materials/viewer.html`. Escolher material, qualidade e distância **1 / 5 / 20 m**; a placa mede 6×4 m e a distância da câmara à placa é exacta. Para captura automática: `window.materialViewer.ready`, `setFamily(id)`, `setDistance(m)`, `await setTier('high'|'low')`, `diagnostics` (`materialIds`, `family`, `tier`, `distance`, `loaded`, `textures`, `maps`, `decodedBytes`, `cameraDistance`, `calls`, `triangles`). `materials` é a contagem de materiais criados na biblioteca, não a lista de IDs. Não há animação nem relógio variável. A galeria é uma ferramenta Vite de desenvolvimento.

O jogo com `?debug` disponibiliza `window.m01TerrainDebug.setEnabled(on)` para comparar terreno novo/antigo no mesmo quadro pausado: troca exclusivamente materiais, sem tocar em relógios, posição do jogador, alturas, geometria ou colisores. `?terrain=legacy` mantém a comparação ao carregar.

Custos do shader: High/Média fazem cerca de 9 leituras de textura por fragmento em chão plano; a mistura triplanar numa encosta pode chegar a 45 antes de optimizações do compilador. Low elimina os detalhes e conserva uma leitura da máscara. O material não acrescenta chamadas de desenho; estes limites estáticos não substituem medição de FPS ou de VRAM num aparelho real.
