# Texturas do terreno M01 (T09-lite, família terreno)

Gerador determinístico, sem dependências npm (só `node:zlib`/`node:crypto`; PNG e CRC32 próprios em `src/png.mjs`).

```sh
node tools/assets/m01-materials/generate.mjs            # escreve assets/textures/m01/terrain/ (6 PNG + terrain.manifest.json, ~7 s)
node tools/assets/m01-materials/generate.mjs --out DIR  # noutro sítio, para comparar
node --test tests/m01-terrain-textures.test.js          # rerun idêntico, manifesto bate com os ficheiros, orçamento
```

Arte original procedural (ruído de valor periódico, Worley, carimbos com sementes fixas; só aritmética exacta, sem `Math.sin/cos/pow`,
para o resultado não depender da versão de Node). Nada vem de Call of Duty nem de fotografias ou de downloads.
Autor `COD-guerra project, original procedural`, licença `CC0-1.0` (a mesma dos restantes assets originais, ver `assets/models/production/m01/*/manifest.json`).

| Ficheiro | Tamanho | Tile | Canais (RGBA) |
| --- | --- | --- | --- |
| `terrain-detail-a-1024.png` / `-512.png` | 1024² / 512² | 4 m | R campo lavrado · G prado · B lama · A margem molhada (luma, média 0,5) |
| `terrain-detail-b-512.png` | 512² | 1,6 m | R balastro · G caminho batido · B palha (cobertura) · A fuligem (cobertura) |
| `terrain-normal-a-1024.png` / `-512.png` | 1024² / 512² | 4 m | RG normal xy do campo · BA normal xy da lama (prado e margem reutilizam-nas) |
| `terrain-normal-b-512.png` | 512² | 1,6 m | RG normal xy do caminho · BA normal xy do balastro |

São dados lineares (não sRGB), `flipY=false`, mipmaps ligados, repetição. A cor vem dos tons do shader
(`src/render/m01-terrain-material.js`), por isso o PNG só carrega relevo e contraste. A tabela de tiers (High 1024², Medium/Low 512²) e o
orçamento de memória estão em `docs/verification/m01-runtime/m01-terrain-war-ground-v1/README.md`.

Módulos: `src/noise.mjs` (ruído periódico, Worley, RNG), `src/layers.mjs` (uma função por camada), `src/terrain.mjs` (empacotamento,
normais a partir da altura, redução 1024→512), `src/png.mjs` (escritor com filtro adaptativo + leitor para os testes).
