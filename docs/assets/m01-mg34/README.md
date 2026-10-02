# M01 — MG 34 de 1939 (provisória, gerada)

**PROVISÓRIO VERIFICADO.** Kit da *Maschinengewehr 34* das metralhadoras alemãs de M01: a arma em três LODs, os clips `mg34_*` para o rig dos soldados e o manifesto. Não está ligado a `src/`, e M01 continua **PROTÓTIPO JOGÁVEL**. Os modelos existentes não mudaram: a Kar98k continua no GLB dos soldados, e os clips existentes mantêm os nomes. Não há medição de FPS.

- Ficheiros: `assets/models/provisional/m01/weapons/mg34/`, com `m01_mg34_lod{0,1,2}.glb`, `m01_mg34_animations.glb` e `manifest.json`.
- Gerador: `tools/assets/m01-mg34/`. Usa só ferramentas gratuitas, com licença MIT ou BSD: Node, gltf-transform, meshoptimizer, jpeg-js e pngjs. Reutiliza a geometria, o atlas e o solver de poses de `tools/assets/m01-soldiers/` e as primitivas de `tools/assets/m01-rkm-wz28/`.
  ```
  cd tools/assets/m01-soldiers && npm ci && npm run fetch   # dependências e malha base CC0 (para os clips)
  cd ../m01-rkm-wz28 && npm ci                             # primitivas partilhadas
  cd ../m01-mg34 && npm ci && node build.mjs
  CHROME_EXECUTABLE=… node render/capture.mjs              # capturas e import-report.json
  ```
  Duas execuções de `node build.mjs` dão ficheiros idênticos byte a byte.
- Verificação: `tests/m01-mg34-glb.test.js` testa:
  - a escala de 1,219 m (±2 %), com a boca em −Z, o tambor em −X e a alavanca em +X;
  - os pivôs das peças, os orçamentos por LOD e os bytes do manifesto;
  - o material único com texturas e os sockets;
  - as medidas estimadas marcadas;
  - a ligação dos clips aos ossos do soldado alemão e aos nós da arma;
  - os nomes que não repetem clips existentes;
  - a rajada de 7 com intervalo de 0,075 s;
  - a tampa que abre 80° e fecha;
  - o tambor que cai, some e volta ao pivô;
  - a alavanca com curso de 0,12 m.
- `import-report.json`: o GLTFLoader do three.js 0.186.1 regista as malhas, triângulos e draw calls de cada LOD, e os clips com a duração e o número de faixas.

## Variante e identificação

É uma **MG 34 de infantaria de 1939**:
- manga do cano perfurada;
- coronha fixa e punho de pistola com gatilho E/D;
- alça tangente e massa rebatível;
- bípode na posição dianteira;
- tambor de cinta de 50 (*Gurttrommel 34*) à esquerda, com o início da cinta na caixa de alimentação.

Não é a MG 34 de carro, que tem a manga blindada sem furos, nem a MG 42, proibida em M01. Ficha: [`research/weapons/mg34.md`](../../../research/weapons/mg34.md).

## Conteúdo

| Ficheiro | Triângulos visíveis | Draw calls | Texturas | Tamanho | Uso |
| --- | --- | --- | --- | --- | --- |
| `m01_mg34_lod0.glb` | 2 432 | 6 | cor 1024² JPEG, ORM 512², normal 512² | 331 kB | perto, até 15 m; primeira pessoa |
| `m01_mg34_lod1.glb` | 1 262 | 6 | cor 512², ORM 256² | 124 kB | 15 a 40 m |
| `m01_mg34_lod2.glb` | 368 | 6 | cor 256² | 37 kB | dique a ~1,2 km; Chromebook |
| `m01_mg34_animations.glb` | — | — | — | 257 kB | `mg34_aim`, `mg34_fire_burst`, `mg34_reload` |

- **Orçamento:** 4 000 triângulos no LOD0, o valor das armas de apoio em `assets-m01.json`.
- **Material:** um só, `mg34`, com um atlas pintado por procedimento:
  - aço fosfatado escuro, com desgaste nas arestas;
  - **furos ovais da manga**: cor escura e relevo no mapa normal, 8 em volta, em filas alternadas;
  - baquelite castanha na coronha e no punho;
  - tambor pintado com rebordos;
  - latão dos cartuchos.
- **Densidade:** cerca de 1 090 px/m no LOD0.
- **Eixos:** 1 unidade = 1 m, +Y para cima, cano para −Z, lado direito da arma em +X.

## Peças (nós da cena `mg34`)

`extras.visible` dá o estado por omissão. Ao carregar, aplicar `o.visible = o.userData.visible !== false`. Cada nó tem o pivô na sua translação.

| Nó | Por omissão | Pivô (m) | Movimento | Peças |
| --- | --- | --- | --- | --- |
| `mg34_body` | visível | 0, 0, 0 | — | coronha e chapa, caixa, caixa de alimentação com orelhas do tambor, punho, caixa do gatilho, guarda-mato, gatilho E/D, manga perfurada, aro, reforçador de recuo com cone, massa, alça, abraçadeira do bípode, argola, janela de ejecção (por baixo), calha da alavanca |
| `mg34_feed_cover` | visível | 0, 0,072, −0,106 (dobradiça) | rotação em X; a traseira sobe 80° (quaternião `axis([1,0,0], −80°)`) | tampa, fecho atrás, eixo da dobradiça |
| `mg34_cocking_handle` | visível | 0,031, 0,012, −0,035 | translação +Z até 0,12 m (puxada) | haste e punho em gancho, à direita |
| `mg34_drum` | visível | −0,105, −0,008, −0,035 (centro) | translação, rotação e escala (troca) | lata de Ø 0,14 × 0,12 m, boca de saída, pega, fecho |
| `mg34_belt` | visível | −0,03, 0,061, −0,035 | translação e escala | 5 cartuchos com elos na caixa; só se vêem com a tampa aberta |
| `mg34_bipod_folded` | visível | 0, 0,004, −0,645 | — | bípode dobrado para trás por baixo da manga |
| `mg34_bipod_open` | escondido | 0, 0,004, −0,645 | — | bípode aberto, patas no chão a 0,33 m abaixo do eixo (alternativa) |

`extras.sockets` do nó raiz, no referencial da arma:
- **Pega:** `grip_r` (punho) e `grip_l` (pernas do bípode dobrado);
- **Mira:** `cheek` (olho na linha de mira), `rear_sight` e `front_sight`;
- **Efeitos:** `muzzle` (boca, 0, 0,03, −0,769) e `ejection_port` (por baixo);
- **Armar:** `charging_handle` e `charging_handle_back`;
- **Alimentação:** `feed_cover_hinge`, `feed_cover_latch`, `feed_tray` e `drum_center`;
- **Bípode e coronha:** `butt`, `bipod_mount` e `bipod_feet`.

O manifesto repete os pivôs, os sockets e a pega das mãos: pulso, direcção dos dedos e normal da palma.

## Ligação ao rig dos soldados

O referencial da MG 34 é o do osso `weapon` dos `m01_soldier_*`. Para a ligar:
1. Prender a cena ao osso com transformação nula.
2. Esconder `rifle` (Kar98k) e `clip`. Assim fica **uma só arma visível**, o que as capturas confirmam: o soldado mostra só `body`, `head_de_a`, `helmet_m35` e `gear`.
3. Os clips `mg34_*` animam os ossos do rig e também os nós `mg34_feed_cover`, `mg34_cocking_handle`, `mg34_drum` e `mg34_belt`, pelo nome. Por isso, **prender a arma antes de criar a `clipAction`**: o `AnimationMixer` só liga as faixas a nós que já estão na hierarquia. Se a arma for presa depois, fazer `mixer.uncacheClip(clip)` e criar a acção de novo.

```js
const gunner = SkeletonUtils.clone(soldierDe.scene);
gunner.traverse(o => { if (o.isMesh) o.visible = ['body', 'gear', 'head_de_a', 'helmet_m35'].includes(o.name); });   // sem rifle nem clip
const mg = mg34Gltf.scene.clone();
mg.traverse(o => { if (o.isMesh) o.visible = o.userData.visible !== false; });
gunner.getObjectByName('weapon').add(mg);              // posição/rotação 0, antes do mixer
const mixer = new THREE.AnimationMixer(gunner);
mixer.clipAction(THREE.AnimationClip.findByName(mg34Anims.animations, 'mg34_fire_burst')).play();
```

| Clip | Duração | Ciclo | Notas |
| --- | --- | --- | --- |
| `mg34_aim` | 2 s | sim | De pé, ao ombro, com tambor (tiro de assalto). Tronco inclinado contra os 12 kg; a mão esquerda segura as pernas do bípode dobrado e o olho fica na linha de mira |
| `mg34_fire_burst` | 1,02 s | não | Rajada de 7 a 800 tiros/min, com recuo, desvio lateral e subida da boca que volta no fim. `extras.events.fire` = 0 … 0,45 s, de 0,075 em 0,075 s, como a simulação. Para rajadas de 4 a 6, parar ou misturar depois do último `fire` |
| `mg34_reload` | 4,4 s | não | De pé. Eventos: `cover_open` 0,85, `drum_off` 1,35, `drum_drop` 1,75 (o vazio cai e some; o jogo pode deixar um adereço), `drum_from_assistant` 1,85 (o novo vem do municiador, à esquerda), `drum_on` 2,5, `belt_in` 2,8, `cover_closed` 3,2, `handle_back` 3,6 e `handle_forward` 3,9 |

Os clips escondem o clipe de 5 da Kar98k (escala 0 em `weapon_clip`). `extras` contém `weapon: 'mg34'`, `bipod: 'folded'` e `pose: 'standing'`. Os nomes `mg34_*` não existem nos GLB dos soldados nem no da rkm, e o teste verifica isso.

## Capturas

As imagens foram renderizadas com three.js 0.186.1 (GLTFLoader e AnimationMixer) em Chromium/SwiftShader, e inspeccionadas.
- `mg34_views.png`:
  - lado direito sobre uma grelha de 0,5 m, com a alavanca;
  - lado esquerdo, com o tambor de 50;
  - bípode aberto;
  - 3/4 de trás, com a coronha, a tampa e a alça;
  - manga perfurada e boca;
  - tampa aberta com a cinta na caixa;
  - LOD0, LOD1 e LOD2.
- `mg34_in_hands.png`: o atirador alemão com a MG 34 e sem a Kar98k:
  - `mg34_aim` em 3/4 e de perfil;
  - face na coronha (sem capacete, para se ver o olho);
  - as mãos;
  - `mg34_fire_burst` no 1.º e no 7.º tiro, e de volta à pontaria.
- `mg34_reload.png`: oito instantes da troca do tambor, da mão no fecho da tampa até ao regresso à pontaria.

## Medidas e fontes

As especificações vêm de T33 (`research/SOURCES.md`): Wikipédia en, o manual MIS *German Infantry Weapons* (1943), militaryfactory, modernfirearms, o anúncio de um Gurttrommel 34 e o Axis History Forum. Só foram consultadas através de **resumos concordantes de busca**: neste ambiente, wikipedia.org, lonesentry.com, modernfirearms.net, ww2db.com e dday-overlord.com estão bloqueados.

| Medida | Valor | Origem |
| --- | --- | --- |
| Comprimento total | 1219 mm (modelo: 1,219 m) | T33 |
| Cano | 627 mm, da face da culatra (z −0,127, dentro da caixa) à boca | T33 |
| Massa | 12,1 kg | T33; não entra na geometria |
| Calibre, cadência | 7,92×57 mm; 800–900 tiros/min (clips a 800) | T33 |
| Tambor de cinta de 50 à esquerda | Ø 0,14 × 0,12 m; orientação e ganchos **estimados** | T33 (anúncio de peça: 6 × 5,5 × 4,75 pol) |
| Manga perfurada | diâmetro de 48 mm e padrão de furos **estimados** | T33 para o tipo |
| Gatilho E/D | formas **estimadas** | T33 |
| Alça 200–2000 m, massa rebatível | alturas acima do eixo **estimadas** | T33 |
| Bípode na posição dianteira | pernas (~0,35 m) e abertura **estimadas** | T33 (duas posições) |
| Coronha, caixa, tampa (dobradiça à frente), alavanca à direita | proporções, abertura (80°) e curso (0,12 m) **estimados** | fotografias, por resumo |

O manifesto repete esta tabela em `measures`, com `estimated: true/false` e a fonte de cada linha.

## Licença e autoria

Todo o kit é original e foi gerado por código neste repositório pelo Claude Code: geometria, texturas procedurais e clips. Não usa modelos, fotografias como textura nem conteúdo de terceiros ou de jogos. Os clips usam o esqueleto dos soldados, cujos dados base são CC0 do MakeHuman (`ASSET_CREDITS.md`). Não há marcas, números de série nem símbolos na arma. A licença global do projecto continua por decidir pelo proprietário.

## Limitações

- **Postura:** só de pé (tiro de assalto com tambor). As posições do dique pedem tiro deitado sobre o bípode aberto, mas o runtime ainda não tem a pose `prone`, e o clip deitado fica por fazer.
- **Recarga:** só a troca do tambor. A cinta de 250 com a caixa de munição e o porta-tambores do municiador não foram modelados; o municiador também não é animado.
- **Mecanismo:** o `mg34_fire_burst` não anima a cinta nem a ejecção. Os sockets `feed_tray` e `ejection_port` permitem fazê-lo no jogo.
- **Peças por modelar:** mira antiaérea, bandoleira e troca do cano.
- **Furos da manga:** pintados, não recortados; de perto não se vê o cano através deles.
- **Material da coronha:** baquelite ou madeira em 1939, por confirmar.
- **Cores:** aproximadas; sem mapa de ambiente, o aço aparece escuro.
- **Contacto das mãos:** aproximado (FK, IK de 2 ossos e dedos por flexão, sem colisão). A mão esquerda fica por baixo das pernas do bípode, sem as envolver por completo.
