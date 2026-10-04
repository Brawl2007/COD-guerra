# M01 — Vagões queimados e danificados (provisórios, gerados)

**PROVISÓRIO VERIFICADO em galeria isolada.** Os dois vagões de dois eixos do kit intacto ([`m01-wagons`](../m01-wagons/README.md)), coberto e aberto, ganham agora dois estados novos cada um: **queimado** e **danificado**. Cada estado tem LOD0/1/2. Os vagões não estão ligados ao jogo: M01 continua **PROTÓTIPO JOGÁVEL**. As capturas não são playtest nem medição de FPS no Chromebook. A ligação ao runtime fica com o Codex.

- **Ficheiros:** estão em `assets/models/provisional/m01-wagon-damage/`:
  - `m01_wagon_{covered,open}_{burned,damaged}_lod{0,1,2}.glb`;
  - `manifest.json`.
  
  O relatório `docs/assets/m01-wagon-damage/import-report.json` fica nesta pasta.
- **Gerador:** está em `tools/assets/m01-wagon-damage/`. Importa `tools/assets/m01-wagons/src/wagons.mjs` sem o alterar e usa a geometria, o atlas e as texturas de `tools/assets/m01-soldiers/src/`. Comandos:
  ```
  (cd tools/assets/m01-soldiers && npm ci)
  (cd tools/assets/m01-wagons && npm ci)
  cd tools/assets/m01-wagon-damage && npm ci && node build.mjs
  CHROME_EXECUTABLE=… node render/capture.mjs     # usa o three.js e o Playwright do repositório
  ```
  As ferramentas são gratuitas: Node, gltf-transform, meshoptimizer e pngjs, com licenças MIT ou BSD.
- **Kit intacto preservado:**
  - Os seis GLB intactos, o `manifest.json` deles, `wagons.mjs` e o `build.mjs` intacto ficam iguais byte a byte.
  - O manifesto regista os sha256 e os bytes desses 9 ficheiros (`base.sha256`), e o teste confirma-os.
- **Determinismo:** duas execuções de `node build.mjs` dão os mesmos ficheiros, byte a byte.

## Estados

| Estado | Coberto (`covered`) | Aberto (`open`) |
| --- | --- | --- |
| **Queimado** (`burned`) | Caixa de tábuas ardida até 1,6–2,7 m, em degraus pelas juntas das tábuas e mais alta junto aos montantes. Não tem tejadilho. As portas carbonizadas ficam no carril de baixo. O carril de cima cedeu e os montantes da porta estão inclinados. Um arco do tejadilho está de pé; o outro caiu. No soalho há tábuas do tejadilho e cinza. | Taipais ardidos até 1,3–2,3 m. As cantoneiras laterais do topo cederam e estão torcidas, e há dois montantes inclinados. A carga está carbonizada, com vigas e cinza no soalho. |
| **Danificado** (`damaged`) | Furo de impacto de ~1 × 0,8 m no painel traseiro direito, com lascas, estilhaços e fuligem. A diagonal foi empurrada para dentro e a porta direita saiu da guia de baixo. O tampão traseiro direito está amolgado e a cobertura do tejadilho levantada. Há tábuas soltas. | O taipal direito rebentou de cima numa extensão de ~1,9 m, com tábuas a pender para fora. A cantoneira do topo e o montante da porta dobraram para fora. Há estilhaços, fuligem e tábuas soltas no soalho. |

O dano não é só pintura:

- Tábuas partidas e furos são geometria nova: contornos extrudados com bordos irregulares.
- Montantes, cantoneiras, carris e o tampão foram deslocados ou dobrados na própria malha.
- A madeira queimada tem um material próprio, com:
  - carvão com fendas em grelha;
  - bolhas de tinta na transição;
  - cinza nas faces de cima.
- O aço queimado perde a tinta, ganha ferrugem e fuligem (mais fortes em cima) e fica mais rugoso e menos metálico.
- O lado esquerdo do vagão danificado fica como no intacto, de propósito. O impacto é de um lado só.

O manifesto lista em `states.<tipo>_<estado>.changes_vs_intact` as peças do kit intacto **removidas**, as **acrescentadas** e as **deformadas**.

> No kit intacto do aberto há duas peças com o nome `top_rail_r`: a cantoneira do lado direito e a do topo traseiro. O gerador distingue-as pela extensão em Z e só retira a lateral.

## Contrato para o runtime (inalterado em relação ao intacto)

- **Unidades e eixos:** metros, +Y para cima, frente em −Z.
- **Origem:** no topo do carril, ao centro do vagão.
- **Passo:** 9,10 m entre tampões no LOD0 e no LOD1.
- **Nós iguais aos do intacto, nas mesmas posições:**
  - `body`;
  - `wheelset_1` em (0; 0,5; −2) e `wheelset_2` em (0; 0,5; 2);
  - no coberto, `door_l` e `door_r` em (±1,54; 2,24; 0).
- **Nó novo `debris`:** pivô em (0; 1,24; 0), no soalho. Tem os restos soltos, só visuais. Pode ser escondido sem afectar o resto.
- **Sockets:** iguais aos do intacto:
  - `coupler_front/rear`;
  - `wheelset_1/2`;
  - `fire`;
  - `smoke_top`;
  - no coberto, `door_l/r` e `disembark_l/r`.

  O danificado tem também `impact`, o centro do furo: (1,45; 2,1; 1,72) no coberto e (1,45; 2,25; −0,7) no aberto.

  Os sockets estão no `extras.sockets` do nó raiz de cada GLB e no manifesto.
- **Animações:**
  - `wheels_roll` é igual à do intacto em todos.
  - `doors_open` só existe no **coberto danificado** e só move a `door_l`, 1,95 m em Z. A porta direita está fora da guia e a do queimado está ardida no carril, por isso não correm.
- **Escolha do estado:** quem decide o vagão e o estado é a simulação. Por exemplo, `station_wagon_fire` dá `burned`. O renderer só troca o GLB do mesmo tipo, na mesma posição e com o mesmo passo.
- **Colisão e cobertura:** não se devem inferir das peças partidas nem dos restos. Uma colisão futura usa a caixa do vagão intacto do mesmo tipo. Este trabalho não altera colisão, cobertura nem mapa.
- **Sem efeitos próprios:** não há fogo, brasas, fumo, partículas, luzes nem temporizadores. O fogo e o fumo do evento usam os sockets `fire` e `smoke_top`.

## Orçamento e medidas

Os LOD usam as mesmas proporções do intacto:

| LOD | Triângulos | Textura de cor | Textura ORM |
| --- | --- | --- | --- |
| LOD0 | todos | 1024² | 512² |
| LOD1 | 40 % (meshoptimizer) | 512² | 256² |
| LOD2 | 12 % | 256² | sem ORM |

Há sempre um só material por GLB. Uma draw call por nó com malha.

| Ficheiro | Triângulos | Draw calls | Bytes | Texturas | Caixa (m) | Diferença da caixa face ao LOD0 intacto (m) |
| --- | --- | --- | --- | --- | --- | --- |
| `m01_wagon_covered_burned_lod0.glb` | 2480 | 6 | 337 kB | 1024² + 512² | −1,59; −0,04; −4,55 → 1,60; 3,71; 4,55 | topo −0,14 (sem tejadilho) |
| `m01_wagon_covered_burned_lod1.glb` | 1277 | 6 | 139 kB | 512² + 256² | −1,59; 0,01; −4,53 → 1,60; 3,71; 4,53 | — |
| `m01_wagon_covered_burned_lod2.glb` | 609 | 6 | 57 kB | 256² | −1,59; 0,01; −3,97 → 1,60; 3,60; 4,53 | — |
| `m01_wagon_open_burned_lod0.glb` | 2340 | 4 | 320 kB | 1024² + 512² | −1,57; −0,04; −4,55 → 1,60; 2,84; 4,55 | ±0,07–0,10 em X (cantoneiras torcidas) |
| `m01_wagon_open_burned_lod1.glb` | 1158 | 4 | 127 kB | 512² + 256² | −1,57; 0,01; −4,53 → 1,60; 2,84; 4,53 | — |
| `m01_wagon_open_burned_lod2.glb` | 572 | 4 | 52 kB | 256² | −1,57; 0,01; −4,49 → 1,57; 2,84; 4,53 | — |
| `m01_wagon_covered_damaged_lod0.glb` | 2452 | 6 | 338 kB | 1024² + 512² | −1,59; −0,04; −4,55 → 1,96; 3,85; 4,55 | +0,37 em +X (porta fora da guia) |
| `m01_wagon_covered_damaged_lod1.glb` | 1194 | 6 | 132 kB | 512² + 256² | −1,59; 0,01; −4,53 → 1,96; 3,82; 4,53 | — |
| `m01_wagon_covered_damaged_lod2.glb` | 570 | 6 | 56 kB | 256² | −1,56; 0,01; −4,03 → 1,96; 3,82; 4,03 | — |
| `m01_wagon_open_damaged_lod0.glb` | 2098 | 4 | 292 kB | 1024² + 512² | −1,50; −0,04; −4,55 → 1,97; 2,84; 4,55 | +0,47 em +X (tábuas a pender) |
| `m01_wagon_open_damaged_lod1.glb` | 976 | 4 | 111 kB | 512² + 256² | −1,50; 0,01; −4,53 → 1,97; 2,84; 4,53 | — |
| `m01_wagon_open_damaged_lod2.glb` | 405 | 4 | 42 kB | 256² | −1,50; 0,01; −3,95 → 1,97; 2,84; 3,97 | — |

Para comparação, os LOD0 intactos têm:

| Tipo | Triângulos | Draw calls | Bytes |
| --- | --- | --- | --- |
| Coberto | 2332 | 5 | 301 kB |
| Aberto | 1948 | 3 | 266 kB |

Cada estado acrescenta uma draw call, a do nó `debris`, e 11–36 kB.

Detalhes das medidas:

- O manifesto tem as diferenças exactas da caixa por ficheiro (`bbox_delta_vs_intact_lod0_m`).
- Como no intacto, o LOD2 pode perder tampões ou rodas pequenas na simplificação; o passo de 9,10 m só se garante no LOD0 e no LOD1.
- A caixa maior do danificado vem de peças visuais: a porta saída da guia e as tábuas a pender. Não é uma caixa de colisão.

## Galeria

As capturas usam o GLTFLoader e o AnimationMixer do three.js 0.186.1. São uma verificação visual, não um playtest.

| Imagem | O que mostra |
| --- | --- |
| [`damage_compare.png`](damage_compare.png) | Intacto, queimado e danificado lado a lado, nos dois tipos, a 3/4 da frente pelo lado direito e a 3/4 da traseira pelo lado esquerdo. |
| [`damage_side_by_side.png`](damage_side_by_side.png) | Os três estados encostados pelos tampões, com o passo de 9,10 m, sobre a grelha de 1 m. |
| [`damage_interiors.png`](damage_interiors.png) | Interiores: o queimado sem tejadilho, com cinza e tábuas; o furo visto de dentro; `doors_open` no danificado (só a porta esquerda); a carga carbonizada; o rombo no taipal. |
| [`damage_details.png`](damage_details.png) | Rodado queimado e intacto, tampão amolgado, tampões e gancho do queimado, furo com lascas, porta fora da guia, porta carbonizada, taipal rebentado. |
| [`damage_sockets.png`](damage_sockets.png) | Os sockets (amarelo) nos quatro GLB, incluindo `impact`. |
| [`damage_lods.png`](damage_lods.png) | LOD0, LOD1 e LOD2 de cada variante. |
| [`damage_train.png`](damage_train.png) | 12 vagões em LOD2 com os três estados alternados, a 1050 e a 1200 m (FOV 60° e 15°). Também LOD1 a 120 m e LOD0 a 40 m. |

A 1050–1200 m, um vagão ocupa poucos píxeis. A silhueta do queimado (sem tejadilho, com o esqueleto de montantes) distingue-se do intacto com FOV 15°; com FOV 60° não se distingue. O danificado, a essa distância, lê-se como intacto.

## Limitações

- **P16 continua aberta.** São variantes genéricas para composição. Não afirmam quais vagões históricos arderam ou foram atingidos, nem a classe, o dono ou o país. Não há locomotiva nem inscrições.
- **Escolhas do autor, sem fonte própria:**
  - as alturas do queimado;
  - a posição e o tamanho dos furos;
  - as peças que caem.
- **Sem vagão-alvo:** este trabalho não escolhe qual vagão do trem 963 ou do desvio oeste fica em cada estado.
- **Rodado queimado:** à sombra da caixa, quase não se distingue do intacto. A ferrugem e a fuligem são leves.
- **Restos (`debris`):** não têm física e não caem com o tempo. Ficam assentes no soalho ou presos à caixa.
- **Texturas:** são procedurais, com 1024² no LOD0. De perto (< 2 m), o padrão dos estilhaços tem píxeis visíveis.
- **Por verificar:** a integração no jogo, a iluminação real da estação e o desempenho no Chromebook.
