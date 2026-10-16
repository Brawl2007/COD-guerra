# Gerador dos soldados M01 (1939)

Gera os GLB de `assets/models/provisional/m01/characters/`: polaco e alemão, LOD0–2, mais o GLB de animações. Instruções de uso no jogo e capturas: [`docs/assets/m01-soldiers/README.md`](../../../docs/assets/m01-soldiers/README.md).

```sh
npm ci                        # na raiz do repo: three + @playwright/test (viewer e capturas)
cd tools/assets/m01-soldiers
npm ci
npm run fetch                 # clone esparso do MakeHuman (commit fixo), confere 641 ficheiros CC0 por sha256
node build.mjs                # pl, de e anim → assets/models/provisional/m01/characters/ + manifest.json (~40 s)
node build.mjs pl --out .cache/out --size 1024 --lod lod0      # iteração rápida
cd ../../.. && node tools/assets/m01-soldiers/render/capture.mjs  # capturas → docs/assets/m01-soldiers/
npm test                      # inclui tests/m01-soldiers-glb.test.js
```

Em ambientes sem o Chromium do Playwright, definir `CHROME_EXECUTABLE`, por exemplo `/opt/pw-browsers/chromium-*/chrome-linux/chrome`.

## Fonte dos dados e licença

- MakeHuman (`makehumancommunity/makehuman`, commit em `makehuman.lock.json`). São usados **só dados CC0** (`LICENSE.ASSETS.md`): a malha base hm08, os alvos macro e do rosto, `default.mhskel` e `default_weights.mhw`. Os leitores em `src/mh.mjs` são próprios e o código AGPL não é usado. `.cache/` não vai para o git.
- Tudo o resto é geometria, texturas e animação procedurais originais deste repositório: fardamento, equipamento, armas, atlas e clips.

## Módulos (`src/`)

| Módulo | Função |
| --- | --- |
| `mh.mjs`, `human.mjs` | leitura do MakeHuman; corpo em metros com frente −Z; esqueleto de jogo de 61 ossos (inclui `weapon_mag`, carregador da rkm); pesos top-4; `LIGHT_DROP` para o esqueleto leve |
| `garments.mjs`, `outfit.mjs` | túnica/calças em casca alisada (Taubin, casco convexo, cintura), aba, cinto, gola, botas, perneiras; estilos `pl`/`de` |
| `head.mjs`, `variants.mjs` | cabeças variantes (alvos CC0 só na cabeça), máscaras de lábios/sobrancelhas/barba/cabelo, casca de cabelo, olhos; personagens do `STORY_BIBLE.md` |
| `gear.mjs` | wz.31 (+capa), M35, rogatywka wz.37, correame, bolsas, cantil, pá, máscara, coldre, divisas |
| `weapon.mjs` | kb wz.29, Kar98k e clipe de 5; sockets da arma |
| `paint.mjs`, `noise.mjs`, `atlas.mjs`, `textures.mjs` | atlas único por nação: ilhas, empacotamento, pintura procedural, relevo → normal (Y glTF), ORM, JPEG/PNG |
| `assemble.mjs` | malhas fundidas por grupo alternável, LODs com meshoptimizer e cúpula interior do capacete largada nos LOD1/2 |
| `pose.mjs`, `clips.mjs` | quaterniões, FK, IK de 2 ossos com torção do antebraço, mãos orientadas, dedos; 25 clips a 30 fps (15 gerais e 10 `rkm_*`); faixas constantes com 2 chaves |
| `glb.mjs`, `geom.mjs`, `meshops.mjs` | escrita glTF (gltf-transform), primitivas, utilidades |

`render/viewer.html` + `render/stage.mjs` abrem os GLB no Chromium com o GLTFLoader oficial. `render/capture.mjs` gera as capturas versionadas. Ferramentas de desenvolvimento em `dev/`:
- `textured.mjs`: pré-visualização texturizada;
- `anim.mjs`: soldado com os clips embutidos;
- `shot.mjs`, `sheet.mjs`, `close.mjs`, `carry.mjs`: vistas, folhas de contacto, grandes planos por osso e transporte.

## Convenções que o gerador garante

- 1 unidade = 1 m, +Y para cima, frente e cano para −Z. Os ossos têm os eixos do mundo na pose de ligação: rotação local = inv(R_pai)·R_osso.
- As translações das faixas de `hips`/`weapon` assumem o corpo de base (1,745 m), partilhado por todas as variantes. Mudar `MACRO` em `assemble.mjs` exige regenerar as animações.
- Os mapas de normais seguem o glTF (+Y para cima na imagem), verificados com botões e bolsos iluminados de cima.

## Biblioteca de clips V2 (T08)

`node tools/assets/m01-soldiers/build-clip-library-v2.mjs [--out dir] [--report ficheiro]` gera `assets/models/provisional/m01/characters/clip-library-v2/` (GLB só de animação + `manifest.json`). Precisa apenas do `three` da raiz e da pose de ligação dos GLB de personagem já versionados: **não** corre o MakeHuman nem precisa de `@gltf-transform`. Não toca em `m01_soldier_animations.glb`, nos LOD nem nos outros pacotes de animação (os hashes são fixados por outros manifestos); o manifesto regista o SHA-256 de cada ficheiro preservado.

| Módulo (`motion/library/`) | Função |
| --- | --- |
| `common.mjs` | pega da espingarda e pés copiados de `standing_idle`/`crouched_idle`, mistura de descritores (IK resolvida depois), `bakeClip` |
| `locomotion.mjs` | `sprint`, `crouch_walk`, `hit_front`, `near_miss_duck` (iguais ao `motion-clips-v1`), `turn_left_90/right_90`, `carry_walk` |
| `posture.mjs` | `stand_to_crouch`, `crouch_to_stand`, `prone_enter/exit/idle/flinch/crawl` |
| `idles.mjs` | `standing_idle_b/c`, `crouched_idle_b`, `fidget_look/shift/helmet/check_rifle` |
| `reactions.mjs` | `hit_back/left/right`, `blast_duck`, `death_front/back/left/right/crumple` |
| `cover.mjs` | `cover_low_idle`, `cover_high_idle`, `cover_low_peek_fire_l/r`, `cover_high_lean_l/r`, `cover_return`, `cover_leave` |
| `call.mjs` | `call_out`, `seated_b`, `seated_pass_canteen`, `seated_receive_canteen`, `seated_cup_turn` |
| `audit.mjs` | auditoria a 240 Hz com o `AnimationMixer` real (tornozelos como proxy do pé, método do piloto de locomoção): contactos, velocidade nominal, deriva, costura dos loops, junções |

O construtor exporta o GLB, mede-o e escreve as medições nos `extras` de cada clip (`contacts`, `audit`, `speed_mps`/`cycle_distance_m` só nos de locomoção, `events`, `interrupt`, `family`, `mask`). Falha (código ≠ 0) se um clip violar os limites (`LIMITS`, derivados de 15 mm de deriva nos contactos). `node tools/assets/m01-soldiers/render/gallery-v2.mjs` regenera a tabela e as folhas de contacto em `docs/assets/m01-soldiers/` (rasterizador em software, sem navegador).
