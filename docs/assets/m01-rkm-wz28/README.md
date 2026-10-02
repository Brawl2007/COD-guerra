# M01 — rkm wz.28 de Kowal (provisória, gerada)

**PROVISÓRIO VERIFICADO.** Kit da *ręczny karabin maszynowy* wz.28, a Browning polaca de Szymon Kowal: o modelo da arma em três LODs, os clips do rig dos soldados e o manifesto. Não está ligado a `src/`: M01 continua **PROTÓTIPO JOGÁVEL**. Os modelos existentes não foram alterados, e o kb wz.29 de Kowal continua no GLB dos soldados. Não há medição de FPS.

- Ficheiros: `assets/models/provisional/m01/weapons/rkm_wz28/`, com `m01_rkm_wz28_lod{0,1,2}.glb`, `m01_rkm_wz28_animations.glb` e `manifest.json`.
- Gerador: `tools/assets/m01-rkm-wz28/`. Usa só ferramentas gratuitas, todas com licença MIT ou BSD: Node, gltf-transform, meshoptimizer, jpeg-js e pngjs. Reaproveita a geometria, o atlas e o solver de poses de `tools/assets/m01-soldiers/`.
  ```
  cd tools/assets/m01-soldiers && npm ci && npm run fetch   # dependências e malha base CC0 (para os clips)
  cd ../m01-rkm-wz28 && npm ci && node build.mjs
  CHROME_EXECUTABLE=… node render/capture.mjs              # capturas desta pasta
  ```
- Verificação: `tests/m01-rkm-wz28-glb.test.js` testa:
  - escala de 1,11 m (±2 %), com a boca em −Z;
  - peças e pivôs;
  - orçamentos e texturas por LOD;
  - sockets;
  - medidas estimadas marcadas;
  - clips ligados aos ossos do rig, com uma rajada de 3 tiros.

## Conteúdo

| Ficheiro | Triângulos visíveis | Draw calls | Texturas | Tamanho | Uso |
| --- | --- | --- | --- | --- | --- |
| `m01_rkm_wz28_lod0.glb` | 1 476 | 4 | cor 1024² JPEG, ORM 512², normal 512² | 260 kB | perto, até 15 m |
| `m01_rkm_wz28_lod1.glb` | 744 | 4 | cor 512², ORM 256² | 96 kB | 15 a 40 m |
| `m01_rkm_wz28_lod2.glb` | 234 | 4 | cor 256² | 27 kB | longe; Chromebook |
| `m01_rkm_wz28_animations.glb` | — | — | — | 282 kB | `rkm_carry`, `rkm_aim`, `rkm_fire_burst` |

- **Material:** um só, `rkm_wz28`, com um atlas pintado por procedimento:
  - nogueira envernizada e gasta (coronha, punho e fuste);
  - aço oxidado a azul, com desgaste nas arestas;
  - aço polido (alavanca, selector, regulador e janela de ejecção).
- **Densidade:** cerca de 1180 px/m no LOD0.
- **Escala e eixos:** 1 unidade = 1 m, +Y para cima, cano para −Z e lado direito da arma em +X (`missions/m01-tczew/ASSETS.md`).

## Peças (nós da cena `rkm_wz28`)

`extras.visible` dá o estado por omissão, tal como nos soldados. Ao carregar, aplicar `o.visible = o.userData.visible !== false`. Cada nó tem o pivô na sua translação, por isso uma peça móvel desloca-se pela sua própria posição.

| Nó | Por omissão | Pivô (m) | Peças |
| --- | --- | --- | --- |
| `rkm_body` | visível | 0, 0, 0 | coronha, chapa, caixa, punho de pistola, guarda-mato, gatilho, selector, cano, tubo de gases, bloco e regulador, massa, alça em quadro, fuste, janela de ejecção, calha da alavanca, abraçadeira do bípode |
| `rkm_magazine` | visível | 0, −0,03, −0,112 | carregador de 20 com nervuras |
| `rkm_charging_handle` | visível | −0,017, −0,004, −0,07 | alavanca de armar à esquerda; atrás quer dizer armada (ferrolho aberto); avança 0,10 m |
| `rkm_bipod_folded` | visível | 0, −0,004, −0,585 | bípode dobrado ao longo do fuste |
| `rkm_bipod_open` | escondido | 0, −0,004, −0,585 | bípode aberto, com os patins no chão (alternativa ao dobrado) |

`extras.sockets` do nó raiz, no referencial da arma:
- `grip_r`, `grip_l`, `cheek` (olho na linha de mira);
- `muzzle`, `ejection_port`, `charging_handle`, `charging_handle_forward`;
- `mag_well`, `rear_sight`, `front_sight`, `butt`;
- `bipod_mount`, `bipod_feet`.

## Ligação ao rig dos soldados

O referencial da rkm é o do osso `weapon` dos `m01_soldier_*`. Prender a cena ao osso com transformação nula e esconder `rifle` e `clip`. Os clips da rkm põem as mãos no punho de pistola e no fuste, e o olho atrás da alça. Os clips de espingarda (`aim`, `standing_idle`…) não servem para a rkm, porque o punho de pistola e a coronha em linha recta mudam a pega.

```js
const kowal = SkeletonUtils.clone(soldierPl.scene);
kowal.traverse(o => { if (o.isMesh) o.visible = ['body', 'gear', 'head_kowal', 'helmet_wz31', 'rank_st_strzelec'].includes(o.name); });
const rkm = rkmGltf.scene.clone();
rkm.traverse(o => { if (o.isMesh) o.visible = o.userData.visible !== false; });
kowal.getObjectByName('weapon').add(rkm);              // posição/rotação 0
mixer.clipAction(THREE.AnimationClip.findByName(rkmAnims.animations, 'rkm_fire_burst')).play();
```

| Clip | Duração | Ciclo | Notas |
| --- | --- | --- | --- |
| `rkm_carry` | 4 s | sim | transporte: pronta em baixo, punho à anca direita, boca para baixo e para a esquerda, respiração |
| `rkm_aim` | 2 s | sim | de pé, ao ombro, face na coronha, oscilação lenta |
| `rkm_fire_burst` | 0,8 s | não | rajada de 3 a 600 tiros/min, com recuo e subida da boca. `extras.events.fire` = 0, 0,1 e 0,2 s, igual aos 3 cartuchos por rajada de `src/game/m01-simulation.js` (valores de GAMEPLAY) |

Os clips escondem o clipe de 5 da espingarda (escala 0 em `weapon_clip`). `extras` contém `weapon: 'rkm_wz28'` e `bipod: 'folded'`.

## Capturas

As duas imagens foram renderizadas com three.js 0.186.1 (GLTFLoader e AnimationMixer) em Chromium/SwiftShader, e inspeccionadas.
- `rkm_views.png`: lado direito sobre uma grelha de 0,5 m, lado esquerdo (alavanca e selector), bípode aberto, 3/4 de trás (alça e coronha), pormenores da caixa e do tubo de gases, e LOD0/1/2.
- `rkm_in_hands.png`: Kowal (`head_kowal`, wz.31, divisa de st. strzelec) em transporte (3/4, perfil e mãos), em pontaria (corpo e olho na alça) e a disparar (1.º tiro, 3.º tiro e mãos).

## Medidas e fontes

As especificações vêm de T31 (*Rkm wz. 28*):
- Wikipédia en/pl;
- [opisybroni.pl](https://opisybroni.pl/browning-wz-28/);
- [1939.pl](http://www.1939.pl/uzbrojenie/polskie/bron-strzelecka/rkm_792mm_wz28_browning/index.html);
- [ioh.pl](https://ioh.pl/artykuly/pokaz/rczny-karabin-maszynowy-wz,1023/).

Só foram consultadas através de **resumos concordantes de busca**: neste ambiente a Wikipédia e o opisybroni não respondem e o 1939.pl devolve 403. A H30 (Muzeum II Wojny Światowej) foi lida e confirma a rkm como arma da secção, mas não traz ficha técnica.

| Medida | Valor | Origem |
| --- | --- | --- |
| Comprimento total | 1110 mm (modelo: 1,117 m) | T31, certeza MÉDIA |
| Cano | 611 mm, da face da culatra (z −0,144) à boca (z −0,755) | T31 |
| Massa | 9,0 kg vazia (há fontes com 9,5 kg) | T31; não entra na geometria |
| Calibre, carregador, cadência | 7,92×57 mm; 20 cartuchos; cerca de 600 tiros/min teóricos | T31 |
| Bípode no tubo de gases, logo atrás do regulador, com patins | posição em z e comprimento das pernas (~0,27 m) **estimados** | T31 para o tipo; o resto estimado |
| Punho de pistola inclinado para trás (tipo Colt Monitor) | ângulo e comprimento (~0,11 m) **estimados** | T31 para o tipo |
| Alça em quadro 300–1600 m, massa prismática | alturas acima do eixo **estimadas** | T31 para o tipo |
| Coronha, caixa da culatra, carregador | proporções **estimadas** pelo BAR M1918/FN | estimativa |
| Boca, tapa-chamas | boca lisa: forma por confirmar | estimativa |

O manifesto repete esta tabela em `measures`, com `estimated: true/false` e a fonte de cada linha.

## Licença e autoria

Todo o kit é original e foi gerado por código neste repositório pelo Claude Code: geometria, texturas procedurais e clips. Não usa fotografias como textura nem conteúdo de terceiros ou de jogos. Os clips usam o esqueleto dos soldados, cujos dados base são CC0 do MakeHuman (`ASSET_CREDITS.md`). A licença global do projecto continua por decidir pelo proprietário.

## Limitações

- Não há clips de troca de carregador, de tiro deitado com bípode, de marcha ou de corrida com a rkm.
- O `rkm_fire_burst` não anima a alavanca de armar. O nó `rkm_charging_handle` e o socket `charging_handle_forward` permitem fazê-lo no jogo.
- A bandoleira, a bolsa de carregadores do atirador e o tapa-chamas não foram modelados, por falta de fonte.
- A cor da madeira e o acabamento do aço são escolhas plausíveis, não verificadas em peças de museu.
- Sem mapa de ambiente, o aço oxidado aparece muito escuro nas capturas.
- O contacto das mãos é aproximado: FK, IK de 2 ossos e dedos por flexão, sem colisão.
