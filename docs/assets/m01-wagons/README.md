# M01 — Vagões de mercadorias do trem 963 e do pátio (provisórios, gerados)

**PROVISÓRIO VERIFICADO em galeria isolada.** Dois tipos de vagão de dois eixos, para substituir as caixas de 17 m do trem 963 em `src/render/m01-view.js` (`createTrains`, `this.train`) e servir os vagões do desvio oeste (`freight_wagons_west`, coberturas `cv_wagon_1/2`). Não estão ligados ao jogo: M01 continua **PROTÓTIPO JOGÁVEL**. As capturas não são playtest nem medição de FPS no Chromebook.

- **Ficheiros:** `assets/models/provisional/m01-wagons/`, com `m01_wagon_{covered,open}_lod{0,1,2}.glb`, `manifest.json`, e `docs/assets/m01-wagons/import-report.json`.
- **Gerador:** `tools/assets/m01-wagons/`, com ferramentas gratuitas (Node, gltf-transform, meshoptimizer, jpeg-js e pngjs; MIT/BSD). Comandos:
  ```
  (cd tools/assets/m01-soldiers && npm ci)        # geometria, atlas e texturas partilhados
  cd tools/assets/m01-wagons && npm ci && node build.mjs
  CHROME_EXECUTABLE=… node render/capture.mjs     # usa o three.js e o Playwright do repositório
  ```
  A malha do MakeHuman não é necessária.
- **Verificação:**
  - `tests/m01-wagons-glb.test.js` verifica:
    - 9,10 m entre tampões, as alturas e a simetria;
    - as rodas no carril;
    - os nós e o orçamento por LOD;
    - o material único com textura;
    - a volta completa dos rodados em X, a rolar para −Z;
    - o curso de 1,95 m das portas.
  - `import-report.json` vem do GLTFLoader do three.js 0.186.1. Regista os nós, o material, os triângulos, as posições e normais finitas, as animações e a caixa de cada LOD.
  - Duas execuções de `node build.mjs` dão os mesmos ficheiros, byte a byte.

## Identificação (P16 continua aberta)

As fontes só dão o número do trem (963) e os **65 vagões** (T07 e T08, lidas por resumo). A classe da locomotiva e os tipos de vagão continuam por identificar. Por isso, seguindo `SOURCE_CHECK.md`, os modelos são **genéricos da época** e não afirmam classe, dono nem país.

| Tipo | Base das proporções | O que tem |
| --- | --- | --- |
| **Coberto** (`covered`, tipo G) | construção normalizada alemã (*Verbandsbauart*), G 10 | caixa de tábuas com montantes, diagonais e cantoneiras de aço; tejadilho em arco; dois ventiladores por lado; **uma porta de correr por lado**, para o desembarque dos pioneiros |
| **Aberto** (`open`, tipo O) | *Verbandsbauart*, O | taipais de tábuas com montantes e cantoneira no topo; portas de duas folhas fixas, desenhadas na pintura |

Os dois tipos partilham o estrado: travessas de topo, longarinas, rodados de raios, caixas de eixo com mola de lâminas, sapatas de freio, tampões, gancho com tensor e degraus de manobra.

**Pintura:** castanho-avermelhado de vagão de mercadorias, estrado e rodados pretos com pó e ferrugem, e tejadilho cinzento. As cores estão aproximadas em sRGB. Não há inscrições de dono, número, classe nem datas, porque não há fonte para os vagões do trem. O interior fica em madeira crua mais escura.

## Dimensões

| Medida | Valor | Origem |
| --- | --- | --- |
| Bitola | 1,435 m | bitola normal (PKP, DRG, Cidade Livre) |
| Comprimento entre tampões | 9,10 m (LOD0 e LOD1) | **estimado**; `assets-m01.json` pede ~9–10 m, a confirmar |
| Estrado | 7,86 m | **estimado** |
| Largura da caixa | 2,90 m; 3,18 m no coberto com portas e puxadores | **estimada** |
| Distância entre eixos | 4,0 m | **estimada** |
| Rodas | Ø 1,0 m, 10 raios | **estimadas** |
| Tampões | 1,04 m sobre o carril, 1,75 m entre centros | **estimados** (valores correntes) |
| Soalho | 1,24 m sobre o carril | **estimado** |
| Coberto | 3,85 m de altura; abertura das portas 1,80 × 2,0 m | **estimados** |
| Aberto | taipais de 1,55 m; 2,84 m de altura | **estimados** |
| Número no trem 963 | 65 | T07, T08 |

O manifesto repete esta tabela em `measures`, com `estimated: true/false` e a fonte de cada linha. Nenhuma ficha técnica de vagão foi lida neste ambiente.

## Conteúdo e nós

| Ficheiro | Triângulos | Draw calls | Texturas | Tamanho | Uso sugerido |
| --- | --- | --- | --- | --- | --- |
| `m01_wagon_covered_lod0.glb` | 2 332 | 5 | cor 1024² JPEG, ORM 512² PNG | 301 kB | perto (< 60 m): pátio, cobertura, desembarque |
| `m01_wagon_covered_lod1.glb` | 1 128 | 5 | cor 512², ORM 256² | 121 kB | 60–300 m |
| `m01_wagon_covered_lod2.glb` | 516 | 5 | cor 256² | 51 kB | trem 963 a ~1,05–1,2 km; Chromebook |
| `m01_wagon_open_lod0.glb` | 1 948 | 3 | cor 1024², ORM 512² | 266 kB | perto |
| `m01_wagon_open_lod1.glb` | 846 | 3 | cor 512², ORM 256² | 97 kB | médio |
| `m01_wagon_open_lod2.glb` | 364 | 3 | cor 256² | 38 kB | longe |

O orçamento de `assets-m01.json` é de 2 500 triângulos no LOD0. Cada tipo tem um único material, `wagon_covered` ou `wagon_open`, com um atlas pintado por procedimento (44 e 55 px/m).

No LOD2 a simplificação reduz os tampões e os engates no coberto (8,98 m de ponta a ponta) e retira-os no aberto (7,92 m). O passo entre vagões continua a ser de 9,10 m; a 1 km cada tampão ocupa menos de um píxel.

| Nó | Pivô (m) | Conteúdo |
| --- | --- | --- |
| `wagon_covered` / `wagon_open` (raiz) | 0, 0, 0 = **topo do carril, ao centro da via e a meio do vagão** | `extras.sockets`, `dimensions_m`, `type` |
| `body` | 0, 0, 0 | caixa, estrado, tampões, engates, caixas de eixo, molas, freios e degraus |
| `wheelset_1` / `wheelset_2` | 0, 0,5, −2,0 / +2,0 (eixo) | duas rodas e o eixo; rodam em X |
| `door_r` / `door_l` (só o coberto) | ±1,54, 2,24, 0 (centro da porta fechada) | porta de correr e puxador; desliza em Z por fora dos montantes |

- **Eixos:** metros, +Y para cima e frente em −Z; os vagões são simétricos. O lado direito fica em +X.
- **Sem posição de Tczew:** a raiz não tem coordenadas de Tczew; o jogo coloca-a sobre a via.
- **Sockets:**
  - `coupler_front/rear`: as faces dos tampões, a ±4,55 m. Encostar o `coupler_rear` de um vagão ao `coupler_front` do seguinte dá um passo de 9,10 m.
  - `wheelset_1/2`.
  - `fire` (soalho) e `smoke_top`, para o vagão que arde no pátio (`station_wagon_fire`).
  - No coberto: `door_r/l` (soleira) e `disembark_r/l` (no chão, a 0,9 m da caixa).
  - No aberto: `load`.

## Animações

| Clip | Duração | Ciclo | Uso |
| --- | --- | --- | --- |
| `wheels_roll` | 1 s | sim | uma volta por segundo a rolar para −Z; no jogo, `timeScale = v / (π × 1,0 m)`, com v em m/s e negativo para recuar |
| `doors_open` (só o coberto) | 1,5 s | não | as duas portas correm 1,95 m para +Z; para fechar, tocar ao contrário (`timeScale = −1`) |

```js
const covered = await loader.loadAsync('assets/models/provisional/m01-wagons/m01_wagon_covered_lod2.glb');
// Trem 963: 65 vagões encostados pelos tampões (passo de 9,10 m) ao longo da via; um InstancedMesh por nó e por tipo.
// Perto, no desembarque: clone do LOD0 e doors_open com clampWhenFinished; os pioneiros saem por disembark_r/l.
```

## Capturas da galeria isolada

As capturas foram renderizadas com o GLTFLoader e o AnimationMixer do three.js em Chromium/SwiftShader, e inspeccionadas.
- `wagons_views.png`:
  - coberto em 3/4, de lado sobre grelha de 1 m e de topo;
  - coberto com `doors_open`, que mostra o interior;
  - aberto em 3/4 e o interior dos taipais;
  - LOD0/1/2 do coberto.
- `wagons_details.png`:
  - rodado, caixa de eixo, mola e sapata;
  - tampões, gancho com tensor e degrau;
  - porta fechada e aberta;
  - `wheels_roll` a t = 0 e a t = 1/12 s (30°), só com o rodado para a sombra da caixa não o esconder;
  - tejadilho e topo;
  - soalho do aberto.
- `wagons_train.png`:
  - 12 vagões em LOD2 a 1 050 m de lado e a 1 200 m, a 30° do través. A linha de cima tem o tamanho real com FOV vertical de 60°; a de baixo é a mesma cena com FOV de 15° (cerca de 4×).
  - o LOD1 a 120 m e o LOD0 a 40 m.

## Integração (Codex)

- Substituir as 32 caixas de 17 m de `createTrains()` por 65 vagões encostados pelos tampões, com passo de 9,10 m (cerca de 592 m ao todo).
  - A mistura dos tipos não tem fonte; a captura usa dois cobertos para cada aberto.
  - A 1 km, usar o LOD2 em `InstancedMesh`, um por nó e por tipo.
  - A locomotiva continua a ser a caixa escura até P16.
- O desvio oeste (`freight_wagons_west`) e as coberturas `cv_wagon_1/2` podem usar o LOD0. O `heightM` de 2,5 m das coberturas fica abaixo dos 2,84 m do aberto e dos 3,85 m do coberto.
- **Dados que a engine poderia expor** (proposta, não implementada):
  - o vagão e o lado de onde saem os pioneiros, para tocar `doors_open` só nesse;
  - o vagão do pátio que arde em `station_wagon_fire`, para o fogo no socket `fire`;
  - a velocidade do trem até parar diante dos portões, para o `timeScale` de `wheels_roll`.

## Licença e autoria

Todo o kit é original e foi gerado por código neste repositório pelo Claude Code: geometria, pintura e animações. Não usa modelos, texturas ou fotografias de terceiros nem conteúdo de jogos. A licença global do projecto continua por decidir pelo proprietário.

## Limitações

- As proporções vêm de conhecimento geral da construção normalizada alemã, não de planos medidos. Os tipos reais do trem 963 são desconhecidos (P16).
- Não há garita do guarda-freio, plataforma de freio de mão, tubagem do freio, inscrições, carga no vagão aberto, nem estados de dano ou queimado. Para `station_wagon_fire` só há o socket.
- As rodas de raios estão pintadas sobre um disco, e os raios só se lêem de perto.
- A densidade do atlas (44–55 px/m) chega para o pátio a mais de 10 m; ao perto as tábuas ficam suaves.
- Sem mapa de ambiente, o aço do aro e dos pratos dos tampões fica escuro nas capturas.

## Integração do Codex — 2026-10-02

O trem 963 usa agora 65 vagões LOD2 instanciados com passo 9,10 m e fallback. A composição é genérica (49 cobertos/16 abertos); P16 continua aberta. Pátio oeste, velocidade e desembarque ficam pendentes; não alterar colisão por inferência visual. Provas de produção e limites em [`support-runtime-2026-10-02`](../../verification/m01-runtime/support-runtime-2026-10-02/README.md). As capturas e o relatório acima conservam a origem da galeria original.
