# Passagem de contexto — soldados M01 de 1939 (trabalho em curso)

Documento de continuidade para outra sessão do Claude Code. Apagar quando o trabalho for entregue.

## Pedido (utilizador, literal)

> O Claude pode avançar com os assets dos soldados de 1939, enquanto eu termino a integração:
> * Modelos com rosto, mãos, uniforme e equipamento polaco/alemão.
> * Animações de ferrolho, recarga por clipe, sapadores sob fogo e transporte de Bąk.
> * Autoria/licença documentada, escala em metros e versões leves para Chromebook.
> Deve trabalhar numa branch própria, sem alterar `src/`, e entregar os modelos GLB com capturas e instruções de utilização.
> Os humanos ainda são a maior diferença visual em relação à referência. O combate do PR #15 já está comigo para revisão.

## Regras que não mudam

- Branch: `claude/m01-soldiers-1939` (criada a partir de `0ab60d7`, Codex M01). Nunca `main`, nunca `workflow_dispatch`. Sem PR salvo pedido explícito.
- **Não alterar `src/`** (motor/jogo). Tudo fica em `tools/assets/m01-soldiers/`, `assets/models/provisional/m01/characters/` e docs.
- O PR https://github.com/Brawl2007/COD-guerra/pull/15 (combate de cobertura → `codex/m01-runtime`) está com o utilizador para revisão: não mexer.
- M01 continua **PROTÓTIPO JOGÁVEL** (nunca VALIDADA). Não inventar FPS. Não extrair conteúdo de COD.
- Licenças: só CC0/CC-BY/original; recusar NC, ND e licenças de loja. Escala 1 unidade = 1 m, +Y para cima, personagem virado para −Z (`missions/m01-tczew/ASSETS.md`).
- Insígnias: **omitir a águia com suástica** (peito alemão, decalques do capacete) e documentar a omissão.
- Ler `AGENTS.md`, `DEVELOPMENT_STATUS.md`, `RUNBOOK.md`, `IMPLEMENTATION_PLAN.md` antes de editar docs de estado.
- Commits terminam com as linhas de atribuição da sessão; sem identificadores de modelo em commits/código.
- Push: `git push -u origin claude/m01-soldiers-1939` (repetir até 4× com espera 2/4/8/16 s se falhar a rede).

## Estado da branch (último commit `c007f8b`)

| Commit | Conteúdo |
| --- | --- |
| `cc99913` | Gerador WIP: obtenção do MakeHuman CC0, corpo, esqueleto de jogo, pesos, GLB, fardamento de base, viewer |
| `e8634b5` | Túnica a partir do torso alisado (Taubin), sem relevo anatómico |
| `c007f8b` | `noise.mjs`, `atlas.mjs`, `head.mjs` — **escritos mas ainda não integrados nem verificados em render** |
| (este) | `dev/preview.mjs`, `dev/shot.mjs` e este documento |

## Preparar o ambiente

```sh
npm ci                                   # raiz do repo: three + @playwright/test usados pelo viewer
cd tools/assets/m01-soldiers
npm ci
npm run fetch                            # clone esparso do MakeHuman (commit fixo) em .cache/makehuman, verifica makehuman.lock.json (641 ficheiros, sha256)
node dev/preview.mjs pl                  # → .cache/preview_pl.glb (cores lisas + clip "test" de dobras); também "de"
cd ../../..
CHROME_EXECUTABLE=$(find /opt/pw-browsers -path '*chrome-linux/chrome' -type f | head -1) \
  node tools/assets/m01-soldiers/dev/shot.mjs tools/assets/m01-soldiers/.cache/preview_pl.glb /tmp/pl.png views
#   modos: views (frente/perfil/costas/clip) | chest (grande plano); 4.º argumento opcional: malhas a mostrar
```

`.cache/` e `node_modules/` estão no `.gitignore` da ferramenta. Os scripts `build` e `render` do `package.json` apontam para `build.mjs` e `render/capture.mjs`, **que ainda não existem** (são o objectivo final).

## Fonte dos dados

MakeHuman (repo `makehumancommunity/makehuman`, commit `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`), **só dados CC0** (`LICENSE.ASSETS.md`): malha base hm08, alvos macro e do rosto, `default.mhskel`, `default_weights.mhw`. O código AGPL do MakeHuman **não** é usado; os leitores em `src/mh.mjs` são próprios.

## Módulos existentes (`src/`)

- `mh.mjs`: lê base.obj (dm, frente +Z), `.target`, `macroTargets()` (convenção MH 1.1), esqueleto (articulação = média dos vértices) e pesos.
- `human.mjs`: `GAME_BONES` (60 ossos: root, hips, spine_01..03, neck, head, jaw, eye_l/r, clavícula/braço/antebraço/mão, 15 falanges por mão, thigh/calf/foot/ball, e adereços `weapon`, `weapon_bolt`, `weapon_clip`, `carry_socket`); `LIGHT_DROP` (dedos, olhos, maxilar para LOD2); `buildHuman({macro, face, headMask})` → metros, frente −Z, pesos top-4; alvos do rosto mascarados por `(headW-0.35)/0.5`. Corpo de teste {gender 1, age 0.55, muscle 0.6, weight 0.45, height 0.5} = 1,745 m.
- `glb.mjs`: `writeCharacter()` — articulações com eixos do mundo na pose de ligação (IBM = translação −junta), skin partilhada ou subconjunto por malha (`skinBones`), materiais com texturas, morphs, clips (`tracks: {bone, path, times, values}`).
- `meshops.mjs`: vectores, `fromBase` (separa por par v/vt, `src` = índice original, v do UV invertido), normais soldadas, `skinArrays`, `merge`, grelha de vizinhos, `transferSkin`.
- `geom.mjs`: casco 2D, `hullRings`, `loft` (devolve `size` [perímetro, comprimento] em m para o atlas), `lathe`, `roundedBox`, `cylinder`, `strap`, `place`, `axesFrom`.
- `garments.mjs`: `classify` (pele visível, túnica, calças, pés), `smoothedBody` (Taubin), `shell` (casca com espessura, Taubin, folga mínima), `cuffLips`, `skinFromBody`, `orientOutward`.
- `outfit.mjs`: `buildOutfit(h, STYLES.pl|de)` → túnica (caimento por casco convexo + envelope vertical + cintura), punhos, calças, aba, cinto, gola, botas paramétricas (biqueira/sola), cano (alto alemão / curto polaco) e perneiras polacas. **Visualmente aceite** (silhueta, dobras de teste).
- `render/viewer.html` + `render/stage.mjs`: GLTFLoader/SkeletonUtils/AnimationMixer oficiais em Chromium SwiftShader; `window.stage.add(url, {position, rotationY, show, clip, time, morphs, unskinned})`, `camera`, `bbox`, `bone`, `clips`, `info`.

### Novos, por verificar

- `noise.mjs`: ruído de gradiente 3D, fBm, hash.
- `atlas.mjs`: `collectIslands` (ilhas por componente UV nas peças da malha base; uma ilha por loft com `size`), `pack` (prateleiras, densidade px/m por procura binária, `part.texel` multiplica), `atlasUVs`, `rasterize` (pinta por píxel com posição/normal/UV/atributos interpolados; `painters[part.paint](ctx)` → `{c, r, m, h}`), `normalsFromHeight`, `dilate`, `downsample`. **Verificar a orientação do mapa de normais com o GLTFLoader do three r186** (botões devem parecer em relevo com luz de cima; se não, inverter o canal Y).
- `head.mjs`: `faceRegions` (máscaras por magnitude de alvos CC0: lábios, sobrancelhas, orelhas, nariz, pálpebras, bochechas, bigode/filtro; cabelo por linha de corte militar; barba por geometria), `buildHead(h0, macro, variant, style)` → cabeça/pescoço com `attrs`, casca de cabelo, olhos (esferas ajustadas aos ajudantes `helper-l/r-eye` do hm08, pólo da íris para −Z, pesados na cabeça); `buildHands`. Limiares das máscaras a afinar com capturas (sobretudo sobrancelhas e linha do cabelo). Variante = `{ id, targets: [[rel, peso]], hairLength, ... }`.

## Decisões tomadas para o resto

1. **Um GLB por nação e por LOD** (`m01_soldier_pl_lod0.glb` …), com malhas alternáveis por visibilidade: corpo+fardamento fundidos, `head_<id>` (+cabelo/olhos) por variante, capacete/boné por variante, conjuntos de equipamento, `rifle`/`rifle_bolt`/`clip` nos ossos de adereço. **Um único material com atlas por nação** (todas as instâncias partilham a textura).
2. Texturas: cor 2048² (LOD0) JPEG; normal e metal/rugosidade 1024²; versão leve só cor 512–1024². AO pintado na cor.
3. **Clips num GLB separado** (`m01_soldier_animations.glb`, só esqueleto), ligados por nome de osso a qualquer nação/LOD. Nomes alinhados com as poses do jogo em `src/render/m01-actor-pose.js` (`standing`, `crouched`, `seated`, `wounded`, `fallen`, `carried`): `standing_idle`, `walk`, `run`, `crouched_idle`, `aim`, `fire_bolt` (recuo + ferrolho no osso `weapon_bolt`), `reload_clip` (abrir, clipe de 5 em `weapon_clip`, empurrar, fechar), `pinned` (sob fogo, cabeça baixa), `sapper_work` e `sapper_work_pinned`, `carry_wounded` (transportador, ombros, encaixe `carry_socket`) + `carried` (Bąk), `wounded`, `fallen` (morte, termina deitado), `seated` (chamada das 07:05). Gerar com FK + IK de 2 ossos (mãos na arma, pés no chão), amostrado a 30 fps; rotações locais = inv(R_pai)·R_osso (ossos com eixos do mundo na ligação).
4. **LOD** com meshoptimizer (alvos ≈ 10–14 k / ≈ 4 k / ≈ 1,2 k triângulos); LOD2 usa `LIGHT_DROP` (pesos sobem ao pai). A cabeça hm08 é densa (~15 k triângulos com mãos): simplificar já no LOD0.
5. Variantes de cabeça com base no `STORY_BIBLE.md`: Wrona (21, rosto jovem, barba rala, olhos claros), Zieliński (38, bigode curto, rosto marcado), Krawiec (29, sapador, mãos sujas de graxa, mangas arregaçadas, capa de lona no capacete), Nowicki (22), mais genéricas; alemães 3 genéricas. Idade do rosto com `head/head-age-incr|decr` (só cabeça).
6. Uniforme polaco: túnica wz.36 cáqui-esverdeada (ou anterior), 4 bolsos com pestana e botão, carcela com botões, platinas, **patches da gola azul-marinho com vivo verde-claro** (`ASSETS.md`, fonte T22 resumo — certeza média), capacete **wz.31**, *rogatywka* wz.37, cinto de couro castanho, 2 cartucheiras, bornal wz.33, cantil, máscara WSR wz.32 em estojo, pá. Alemão 1939: túnica M36 *feldgrau* com gola verde-escura e *Litzen* cinzentas, calças cinza-pedra, botas altas, capacete **M35** (sem decalques), cinto preto, suspensórios em Y, 2×3 cartucheiras, bornal, cantil, lata canelada da máscara, pá. Grenzwacht pendente (P7) — documentar. Armas: **kb wz.29** (alavanca recta, 1,10 m, cano 0,60 m) e **Kar98k** (alavanca dobrada, ~1,11 m); clipe de 5. Fontes: `missions/m01-tczew/HISTORICAL_RESEARCH.md` §7, `research/SOURCES.md` (H30, T17), `research/weapons/kb_wz29.md`.
7. Saídas: `assets/models/provisional/m01/characters/` + `manifest.json` (ficheiros, triângulos, ossos, clips, variantes, licenças). Capturas em `docs/assets/m01-soldiers/` (LODs, variantes, clips-chave). Teste Node em `tests/` que abre os GLB e confere escala (altura 1,65–1,85 m), ossos, clips e orçamentos. Actualizar `ASSET_CREDITS.md` (MakeHuman CC0 + geometria/texturas originais), `missions/m01-tczew/ASSETS.md`, `DEVELOPMENT_STATUS.md`/`QUALITY_REPORT.md` com evidência real (sem FPS inventado) e um README de utilização (carregar, alternar variantes, sockets, clips, versão leve).

## Ordem sugerida

1. Ligar `atlas` + pintores (novo `src/paint.mjs`) ao fardamento existente e às cabeças; verificar capturas (rosto, bolsos, mapa de normais).
2. Equipamento e capacetes (`src/gear.mjs`), armas (`src/weapon.mjs`).
3. Montagem por nação, fusão por material, LODs, `build.mjs`.
4. Pose/IK e clips (`src/pose.mjs`, `src/clips.mjs`), GLB de animações, verificação no viewer.
5. Capturas (`render/capture.mjs`), teste, docs, commit e push.

## Outro trabalho desta sessão (fora da branch)

`/graphify` sobre o repo ficou a meio (8 de 9 fragmentos semânticos e a extracção AST, só em `graphify-out/` local, que **não vai para o git**). Numa sessão nova é preciso correr `/graphify` de novo. Antes, juntar `graphify-out/` a `.git/info/exclude`.
