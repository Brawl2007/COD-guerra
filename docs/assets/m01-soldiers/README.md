# M01 — soldados de 1939 (provisórios, gerados)

**PROVISÓRIO VERIFICADO.** Soldados polacos e alemães riggados, com rosto, mãos, uniforme, equipamento, armas (kb wz.29, Kar98k, kb wz.98a de Bąk e rkm wz.28 de Kowal) e 25 clips. Não foram integrados em `src/`: M01 continua **PROTÓTIPO JOGÁVEL** e estes ficheiros só substituem os humanos procedurais quando a integração os ligar. Não há medição de FPS.

- Modelos: `assets/models/provisional/m01/characters/`. São seis GLB de personagem (`m01_soldier_{pl,de}_lod{0,1,2}.glb`), `m01_soldier_animations.glb` e `manifest.json`.
- Gerador: `tools/assets/m01-soldiers/`, com instruções e licenças no README da ferramenta. Reproduzir com `npm run fetch && node build.mjs`.
- Verificação Node: `tests/m01-soldiers-glb.test.js` (escala, esqueleto, orçamentos com Kowal e Bąk, texturas, variantes, comprimentos das quatro armas, clips e tempos).
- Fichas das armas: [`kb_wz29.md`](../../../research/weapons/kb_wz29.md), [`kb_wz98a.md`](../../../research/weapons/kb_wz98a.md), [`rkm_wz28.md`](../../../research/weapons/rkm_wz28.md).
- Capturas: as imagens desta pasta, renderizadas com `node tools/assets/m01-soldiers/render/capture.mjs`. Usam Three.js 0.186.1 (`GLTFLoader`, `SkeletonUtils`, `AnimationMixer`) em Chromium/SwiftShader e leem os clips do GLB de animações separado, como no jogo.

## Conteúdo

| Ficheiro | Triângulos visíveis | Draw calls | Ossos na skin | Texturas | Tamanho |
| --- | --- | --- | --- | --- | --- |
| `m01_soldier_pl_lod0.glb` | 14 861 | 6 | 61 | cor 2048² JPEG, ORM 1024², normal 1024² | 2,6 MB |
| `m01_soldier_pl_lod1.glb` | 6 022 | 6 | 61 | cor 1024², ORM 512² | 1,0 MB |
| `m01_soldier_pl_lod2.glb` (Chromebook/longe) | 1 895 | 6 | 28 | cor 512² | 0,32 MB |
| `m01_soldier_de_lod0.glb` | 16 055 | 6 | 61 | cor 2048², ORM 1024², normal 1024² | 1,7 MB |
| `m01_soldier_de_lod1.glb` | 6 446 | 6 | 61 | cor 1024², ORM 512² | 0,6 MB |
| `m01_soldier_de_lod2.glb` (Chromebook/longe) | 2 059 | 6 | 28 | cor 512² | 0,19 MB |
| `m01_soldier_animations.glb` | — | — | só esqueleto | — | 0,88 MB |

Kowal completo (corpo, cabeça, capacete, equipamento, divisa, rkm, bípode e bolsa) fica em 14 449, 6 239 e 1 808 triângulos nos LOD0, LOD1 e LOD2. Bąk com a wz.98a fica em 14 807, 5 959 e 1 890. A rkm e a wz.98a juntas tiram cerca de 2 % de densidade ao atlas polaco (382 contra 389 px/m).

Cada nação usa **um único material com atlas** partilhado por todas as instâncias e variantes. O alvo inicial de cerca de 1,2 mil triângulos no LOD2 não foi atingido: ficaram entre 1,9 e 2,1 mil. Abaixo disso, o capacete e as cabeças degradam-se visivelmente (`lods.png`).

**Escala e eixos:** 1 unidade = 1 m, +Y para cima e personagem virado para −Z, com o cano para −Z (`missions/m01-tczew/ASSETS.md`). O corpo mede 1,745 m e, com botas e cabelo, a caixa fica entre 1,65 e 1,85 m (teste). O pose procedural actual (`src/render/m01-actor-pose.js`) usa +X como frente local. Para o alinhar, rodar a cena do GLB −90° em Y.

## Malhas alternáveis (visibilidade)

`node.extras.visible` (`userData.visible` no three.js) dá o estado por omissão. O GLTFLoader **não** esconde malhas automaticamente: aplicar `o.visible = o.userData.visible !== false` ao carregar e depois escolher a variante.

| Malha | Por omissão | Uso |
| --- | --- | --- |
| `body` | visível | corpo, fardamento, mãos e calçado fundidos |
| `head_<id>` | só a primeira | PL: `wrona`, `zielinski`, `krawiec`, `nowicki`, `bak`, `kowal`, `dudek`, `pl_a`; DE: `de_a`, `de_b`, `de_c`. Cada uma inclui cabelo e olhos, e `extras.variant/label` |
| `helmet_wz31` / `helmet_m35` | visível | capacete com forro e francalete |
| `helmet_cover_wz31` | escondido | capa de lona dos sapadores, mostrar com o wz.31 |
| `cap_wz37` | escondido | *rogatywka* de campanha, em vez do capacete (Wrona na abertura) |
| `gear` | visível | cartucheiras, bornal, cantil, pá e máscara: PL com correia; DE com suspensórios em Y e lata canelada |
| `sapper` / `nco` | escondidos | bolsa de sapador; coldre da Vis wz.35 |
| `rank_st_strzelec` / `rank_kapral` / `rank_sierzant` | escondidos | divisas nas platinas: 1 belka, 2 belki e galão |
| `rifle` | visível | kb wz.29 (PL) ou Kar98k (DE), presa ao osso `weapon`; o ferrolho é o osso `weapon_bolt` |
| `clip` | visível | clipe de 5 no osso `weapon_clip`; os clips escalam-no a 0 fora da recarga |
| `rifle_wz98a` | escondido (só PL) | kb wz.98a de Bąk, 1,25 m; mostrar em vez de `rifle` (mesmo ferrolho, mesmos clips) |
| `rkm_wz28` | escondido (só PL) | rkm wz.28 de Kowal, 1,11 m; carregador de 20 no osso `weapon_mag`, alavanca de armar no osso `weapon_bolt`. Esconder `rifle` e `clip` |
| `rkm_bipod_open` / `rkm_bipod_folded` | escondidos (só PL) | bípode aberto (deitado) ou dobrado (resto). `extras.bipod` de cada clip `rkm_*` diz qual mostrar |
| `rkm_pouch` | escondido (só PL) | bolsa de couro dos carregadores, no lugar da cartucheira esquerda (reconstrução) |
| `rag` | escondido (só PL) | pano da limpeza, no osso `weapon_clip`; só aparece no `rkm_clean` |

Elenco sugerido:
- Krawiec = `head_krawiec` + `helmet_cover_wz31` + `sapper` + `rank_kapral`.
- Zieliński = `head_zielinski` + `nco` + `rank_sierzant`.
- Kowal = `head_kowal` + `rank_st_strzelec` + `rkm_wz28` + `rkm_bipod_folded` (ou `_open`) + `rkm_pouch` + `rag` (o pano só aparece no `rkm_clean`), sem `rifle` nem `clip`, e com os clips `rkm_*`.
- Bąk = `head_bak` + `rifle_wz98a` + `clip`, sem `rifle`, e com os clips normais.

## Ossos e sockets

- Esqueleto de jogo com 61 ossos: `root`, `hips`, `spine_01..03`, `neck`, `head`, `jaw`, `eye_l/r`, braços, 15 falanges por mão, pernas, `ball_l/r`. Os ossos de adereço são `weapon` (filho de `root`), `weapon_bolt` (filho de `weapon`), `weapon_mag` (filho de `weapon`, carregador da rkm), `weapon_clip` (filho de `root`) e `carry_socket` (filho de `spine_03`, no ombro direito). Na pose de ligação, os eixos coincidem com os do mundo.
- O LOD2 usa uma skin com 28 ossos, sem dedos, olhos e maxilar. Os nós continuam todos presentes, por isso os mesmos clips funcionam.
- `extras.sockets` do nó raiz, no referencial da arma (origem no punho, cano −Z), lista `muzzle`, `ejection_port`, `bolt_axis`, `bolt_handle`, `clip_guide`, `rear_sight`, `grip_r`, `grip_l` e `butt` da arma por omissão.
- `extras.weapons` tem os sockets de cada arma do GLB (`wz29`, `wz98a`, `rkm_wz28` no polaco). A rkm acrescenta `bolt_handle_forward`, `mag_well`, `bipod_mount` e `bipod_feet`.

## Clips (`m01_soldier_animations.glb`)

Ligam-se por nome de osso a qualquer nação e LOD. Todos foram amostrados a 30 fps. `extras` contém `loop`, `pose` (nome em `actorPoseName`), `speed_mps` na locomoção e `events` com tempos em segundos.

| Clip | Duração | Ciclo | Notas |
| --- | --- | --- | --- |
| `standing_idle` | 4 s | sim | arma em baixo, respiração |
| `aim` | 2 s | sim | pontaria de pé, face na coronha |
| `fire_bolt` | 1,17 s | não | recuo seguido do ferrolho completo (levantar, recuar com ejecção, avançar, baixar), tempos de `kb_wz29.md` §5. Eventos: `fire` 0, `eject` 0,6, `chambered` 1,0 |
| `reload_clip` | 3,4 s | não | abrir, mão à cartucheira, clipe na guia, empurrar os cinco, fechar e expelir o clipe, reassentar. O clipe desce como bloco: os cartuchos não descem um a um |
| `walk` / `run` | 1,0 / 0,68 s | sim | no lugar; o jogo desloca a raiz a 1,1 / 3,25 m/s |
| `crouched_idle` | 3 s | sim | de joelho direito no chão |
| `pinned` | 2,4 s | sim | encolhido sob fogo, sobressaltos |
| `sapper_work` / `sapper_work_pinned` | 3 / 2 s | sim | de joelhos a emendar o cabo, arma às costas; sob fogo fica mais baixo e mais rápido |
| `carry_wounded` | 1,25 s | sim | transportador a 0,64 m/s, com Bąk ao ombro direito |
| `carried` | 2,5 s | sim | ferido: prender a **raiz da cena** deste actor ao osso `carry_socket` do transportador; a arma dele fica escondida (escala 0) |
| `wounded` | 2 s | sim | deitado de costas a apertar a coxa direita |
| `fallen` | 1,4 s | não | queda até ficar deitado e imóvel |
| `seated` | 4 s | sim | sentado no chão (chamada das 07:05), arma entre os joelhos |
| `rkm_standing_idle` / `rkm_crouched_idle` | 4 / 3 s | sim | rkm pronta, de pé ou de joelho |
| `rkm_walk` / `rkm_run` | 1,05 / 0,72 s | sim | no lugar, a 1,02 / 2,78 m/s |
| `rkm_aim` | 2 s | sim | ao ombro, de pé |
| `rkm_fire_burst` | 0,8 s | não | rajada de 3 a 600 tiros/min (a simulação gasta 3 por rajada), com recuo, subida e alavanca a avançar em cada tiro. Eventos `fire` 0 / 0,1 / 0,2 |
| `rkm_prone` / `rkm_prone_fire` | 3 / 0,8 s | sim / não | deitado com o bípode aberto no chão e a mão esquerda sob a coronha (`pose: 'prone'`, que o runtime ainda não tem) |
| `rkm_reload` | 3,4 s | não | de joelho, em cobertura (dlg_m01_029). Eventos: `mag_release` 0,45, `mag_drop` 1,05 (o vazio cai e some; o jogo pode deixar um adereço), `mag_from_pouch` 1,15, `mag_in` 1,9, `handle_back` 2,45 |
| `rkm_clean` | 6 s | sim | abertura: sentado, rkm deitada nos joelhos, esfrega com o pano e depois puxa a alavanca e acompanha-a devagar à frente. Eventos `handle_back` 4,7, `handle_forward` 5,25 |

O ferrolho e a recarga foram autorados sobre o wz.29. A Kar98k usa o mesmo clip, com a mão alguns centímetros acima do botão dobrado (`clip_fire_bolt.png`). A wz.98a tem a mesma caixa e o mesmo ferrolho, por isso serve sem diferença (`lineup_kowal_bak.png`).

Os clips `rkm_*` têm `extras.weapon = 'rkm_wz28'` e `extras.bipod` (`open`/`folded`). Nos clips de espingarda, a rkm do Kowal fica nas mãos de forma aproximada (por exemplo, sentado na chamada ou caído). O carregador fica sempre no poço, excepto no `rkm_reload`.

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
const base = 'assets/models/provisional/m01/characters/';
const [soldier, anims] = await Promise.all([loader.loadAsync(`${base}m01_soldier_pl_lod1.glb`), loader.loadAsync(`${base}m01_soldier_animations.glb`)]);
const show = new Set(['body', 'head_krawiec', 'helmet_wz31', 'helmet_cover_wz31', 'gear', 'sapper', 'rank_kapral', 'rifle', 'clip']);
const actor = SkeletonUtils.clone(soldier.scene);
actor.traverse(o => { if (o.isMesh) o.visible = show.has(o.name); });
const mixer = new THREE.AnimationMixer(actor);
mixer.clipAction(THREE.AnimationClip.findByName(anims.animations, 'sapper_work')).play();
// Transporte: carrier com 'carry_wounded'; o ferido com 'carried' e a cena presa ao socket.
carrier.getObjectByName('carry_socket').add(wounded);   // wounded.position/rotation = 0
```

Para o LOD, trocar o GLB por distância e manter o mesmo `AnimationMixer`/clip; os nomes dos ossos são iguais. No Chromebook, usar LOD1 de perto e LOD2 no resto, sem alegar desempenho antes de medir.

## Capturas

`lineup_pl.png`, `lineup_de.png`, `lineup_kowal_bak.png`, `heads.png`, `lods.png`, `weapons.png` (as quatro armas), `clip_poses.png`, `clip_locomotion.png`, `clip_fire_bolt.png`, `clip_reload.png`, `clip_rkm.png`, `clip_rkm_reload.png`, `clip_sappers.png` e `clip_carry.png`. Foram todas inspeccionadas. Os problemas encontrados durante a produção foram corrigidos antes da captura final:
- capacetes altos;
- correias a atravessar a túnica;
- pernas do ferido para a frente;
- manchas nos capacetes simplificados;
- acne de sombra causada por material de dupla face.

## Licenças e símbolos

- Malha base, alvos morfológicos, esqueleto e pesos: MakeHuman 1.x, **CC0**, só dados (`makehuman.lock.json` fixa commit e sha256). Não é usado código AGPL do MakeHuman.
- Geometria do fardamento/equipamento/armas (incluindo a wz.98a e a rkm wz.28), texturas procedurais e animações: originais, geradas por código neste repositório. Não usam conteúdo extraído de jogos nem fotografias como textura.
- Omitidos de propósito: a águia com suástica da túnica e da fivela alemãs, e os decalques do M35. A fivela alemã é uma chapa lisa e o capacete não tem marcas. A águia da rogatywka polaca é uma placa estilizada.

## Limitações conhecidas

- O corpo é um só, com pequenas variações de rosto. Não há corpos diferentes, como os ombros largos de Kowal. Os alvos faciais só actuam na cabeça.
- Certezas médias:
  - patches da gola polaca azul-marinho com vivo verde-claro (T22);
  - divisas de sierżant como galão;
  - cor da cinta da rogatywka de campanha.
- A farda do Grenzwacht está pendente (P7); o alemão é infantaria M36 genérica.
- Os clips são procedurais (FK e IK de 2 ossos), com contacto aproximado das mãos e sem física de pano. Faltam animações de mãos em primeira pessoa (ViewModel) e transições/blends desenhados.
- Nos LOD1/LOD2, o capacete não tem a cúpula interior; fica a orla interior.
- Pormenores da rkm a confirmar (ver ficha): boca/tapa-chamas, bandoleira, bolsa do atirador. Não há recarga deitado; a troca é de joelho.
