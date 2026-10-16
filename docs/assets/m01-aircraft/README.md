# M01 — Ju 87 B-1 do raid das 04:34 (provisório, gerado)

**PROVISÓRIO VERIFICADO em galeria isolada.** Junkers Ju 87 B-1 da 3./StG 1, para substituir a silhueta de caixas dos três aviões de `src/render/m01-view.js` (`createAircraft`, `this.planes`). Está ligado aos três aviões do primeiro raid: M01 continua **PROTÓTIPO JOGÁVEL**. As capturas não são playtest nem medição de FPS no Chromebook.

- **Ficheiros:** `assets/models/provisional/m01-aircraft/`, com `m01_ju87_b1_lod{0,1,2}.glb`, `manifest.json`, e `docs/assets/m01-aircraft/import-report.json`.
- **Gerador:** `tools/assets/m01-aircraft/`, com ferramentas gratuitas (Node, gltf-transform, meshoptimizer, jpeg-js e pngjs; MIT/BSD). Comandos:
  ```
  (cd tools/assets/m01-soldiers && npm ci)        # geometria, atlas e texturas partilhados
  cd tools/assets/m01-aircraft && npm ci && node build.mjs
  CHROME_EXECUTABLE=… node render/capture.mjs     # usa o three.js e o Playwright do repositório
  ```
  Os módulos genéricos de geometria, atlas, ruído e texturas são os de `tools/assets/m01-soldiers/src/` (sem a malha do MakeHuman, que só os soldados usam).
- **Verificação:**
  - `tests/m01-ju87-glb.test.js` verifica:
    - comprimento, envergadura, altura e simetria;
    - os nós e o orçamento por LOD;
    - o material único e a textura;
    - a volta completa da hélice em Z;
    - a abertura de 90° dos freios na dobradiça.
  - `import-report.json` vem do GLTFLoader do three.js 0.186.1 e regista nós, material, triângulos, posições e normais finitas, animações e caixa de cada LOD.

## Variante de 1939

| Ponto | Escolha | Fundamento |
| --- | --- | --- |
| Variante | **Ju 87 B-1**, sem traços D/G | T12: três Ju 87 B da 3./StG 1 (Dilley, Schiller, Grenzel), de Elbing, às 04:34–04:35; `equipment-timeline.json` |
| Asa | gaivota invertida (−11° por dentro, +7,8° por fora, cotovelo a ±1,95 m), flaperons Junkers (*Doppelflügel*) por baixo do bordo de fuga | forma do B; ângulos **estimados** |
| Trem | fixo, com carenagens grandes (“calças”) e sirene (*Jericho-Trompete*) à frente de cada perna | B-1; posição da sirene **estimada** |
| Motor | Jumo 211 com **radiador grande debaixo do nariz** e 6 escapes por lado | é o que separa o B do D, que tem os radiadores sob as asas |
| Cabine | capota comprida, piloto e atirador, uma MG 15 atrás | B |
| Cauda | deriva e leme, estabilizador escorado por montantes, roda de cauda | B |
| Freios de mergulho | grelhas sob as asas exteriores, que rodam 90° na dobradiça dianteira | B; dimensões **estimadas** |
| Carga | SC 250 no garfo ventral | carga do raid não documentada; dimensões **estimadas** |
| Pintura | RLM 70/71 em lascas por cima, RLM 65 por baixo, cruzes de 1939 (preto com filetes brancos) nas asas e na fuselagem | cores aproximadas em sRGB |
| Omitido | a suástica da deriva (política dos soldados), o código da unidade e as letras | sem fonte para o avião concreto |

**Certeza: MÉDIA.** A variante B está identificada por T12. Os traços do B-1 vêm de conhecimento geral e não foram confirmados em fonte primária, porque neste ambiente não foi possível ler as páginas: flugzeuginfo.net e wikipedia.org sem ligação, airpages.ru com 403, e o Sketchfab bloqueado pelo WAF. Os candidatos CC-BY de `assets-m01.json` não foram usados nem verificados.

## Dimensões

| Medida | Valor | Origem |
| --- | --- | --- |
| Comprimento | 11,10 m (modelo: 11,10, do cone da hélice ao leme) | T29 (resumo) |
| Envergadura | 13,80 m (modelo: 13,80) | T29 (resumo) |
| Altura | 4,24 m publicada; o modelo mede 4,27 m da roda ao topo da deriva, em atitude de voo | T29; a atitude da medida publicada é **estimada** (provavelmente em solo) |
| Área alar | ~31,9 m² (só orienta a planta) | **estimada**, sem fonte lida |
| Cordas | 3,0 m na raiz, 1,6 m antes da ponta arredondada | **estimadas** |
| Hélice | tripá, Ø 3,4 m | **estimada** |
| Estabilizador | envergadura 4,9 m | **estimada** |
| Bitola | 3,9 m | **estimada** |
| Freios de mergulho | 1,72 × 0,24 m cada | **estimados** |
| SC 250 | 1,64 m, Ø 0,368 m | **estimada** |

O manifesto repete esta tabela em `measures`, com `estimated: true/false` e a fonte de cada linha.

## Conteúdo e nós

| Ficheiro | Triângulos | Draw calls | Texturas | Tamanho | Uso sugerido |
| --- | --- | --- | --- | --- | --- |
| `m01_ju87_b1_lod0.glb` | 13 102 | 5 | cor 2048² JPEG, ORM 1024² PNG | 652 kB | perto, até 150 m; mergulho sobre o jogador |
| `m01_ju87_b1_lod1.glb` | 4 730 | 5 | cor 1024², ORM 512² | 248 kB | 150 a 600 m |
| `m01_ju87_b1_lod2.glb` | 1 636 | 5 | cor 512² | 96 kB | longe; Chromebook |

O orçamento do LOD0 em `assets-m01.json` era de 15 000 triângulos. Há um único material, `ju87_b1`, com um atlas pintado por procedimento (cerca de 125 px/m).

| Nó | Pivô (m) | Conteúdo |
| --- | --- | --- |
| `ju87_b1` (raiz) | 0, 0, 0 = **centro de gravidade estimado sobre o eixo de tracção** | `extras.sockets`, `dimensions_m`, `variant` |
| `fuselage` | 0, 0, 0 | célula: fuselagem e capota do motor, radiador, escapes, entrada do compressor, capota envidraçada, MG 15, asas, flaperons, trem carenado com rodas e sirenes, deriva, estabilizadores, montantes, roda de cauda, garfo da bomba |
| `propeller` | 0, 0, −4,35 (cubo) | cone e 3 pás; roda em Z |
| `dive_brake_r` / `dive_brake_l` | ±2,65, −0,764, −0,683 (dobradiça interior) | freio; o eixo X local segue a dobradiça (com diedro) |
| `bomb_sc250` | 0, −1,06, −0,55 | bomba; o jogo esconde-a ou solta-a no lançamento |

- **Eixos:** metros, +Y para cima, nariz para −Z e asa direita em +X.
- **Sem posição de Tczew:** o modelo não tem coordenadas de Tczew; o voo coloca e orienta a raiz.
- **Sockets:** `cg`, `propeller_hub`, `bomb_release`, `cockpit_eye`, `gunner_mg15`, `siren_l/r`, `wheel_l/r`, `tailwheel`, `exhaust_l/r` e `wingtip_l/r`.

## Animações

| Clip | Duração | Ciclo | Uso |
| --- | --- | --- | --- |
| `propeller_spin` | 1 s | sim | uma volta por segundo em torno de −Z; no jogo, `action.timeScale = rpm / 60`. Rotação estimada: ~1500 rpm em cruzeiro |
| `dive_brakes_extend` | 1,2 s | não | 0 → 90° nos dois freios; para recolher, tocar ao contrário (`timeScale = −1`) |

```js
const ju87 = (await loader.loadAsync('assets/models/provisional/m01-aircraft/m01_ju87_b1_lod1.glb'));
const plane = ju87.scene.clone();          // a raiz é o pivô de voo (CG)
const mixer = new THREE.AnimationMixer(plane);
mixer.clipAction(THREE.AnimationClip.findByName(ju87.animations, 'propeller_spin')).setEffectiveTimeScale(1500 / 60).play();
// No mergulho: dive_brakes_extend com clampWhenFinished; no lançamento: plane.getObjectByName('bomb_sc250').visible = false.
```

## Capturas da galeria isolada

As capturas foram renderizadas com o GLTFLoader e o AnimationMixer do three.js em Chromium/SwiftShader, e inspeccionadas.
- `ju87_views.png`: frente, lado direito (grelha de 1 m), cima, 3/4 frente, 3/4 trás, a parte de baixo com os freios abertos (avião invertido para a luz chegar à parte de baixo) e LOD0/1/2.
- `ju87_details.png`: radiador e escapes, capota e MG 15, trem e sirene, cauda e montantes, freio recolhido e aberto, e a hélice a t = 0 e a t = 1/12 s (30°).
- `ju87_flight.png`: silhueta a 300 m (LOD1), a 800 m (LOD2) e em mergulho a 70° a 400 m. A linha de cima tem o tamanho real com FOV vertical de 60°; a de baixo é a mesma cena com FOV de 15° (cerca de 4×).

## Integração (Codex)

- `M01View.loadAircraft()` carrega os três LODs e substitui as caixas por três `THREE.LOD`, partilhando geometria/material e conservando mixers independentes. Distâncias 150/600 m; médio não usa LOD0 e baixo usa LOD2. A hélice lê o relógio guardado a ~1500 rpm estimadas. Falha opcional conserva silhuetas; só falhas das pontes bloqueiam a missão. As trajectórias, as horas e o estado continuam na simulação. A SC 250 fica oculta porque a carga real não está confirmada. O `raidPlane` (18 m de envergadura) não é um Ju 87 e fica fora deste kit.
- Prova em produção, por continuação de snapshot genuíno, em `docs/verification/m01-runtime/aircraft/`; não é novo playtest contínuo/humano.
- **Dados que a engine poderia expor** (proposta, não implementada):
  - início do mergulho de cada avião, para abrir os freios;
  - instante de lançamento, para esconder a `bomb_sc250` e criar a bomba em queda a partir de `bomb_release`;
  - rotação do motor, para o `timeScale` da hélice e o tom da sirene.

## Licença e autoria

Todo o kit é original e foi gerado por código neste repositório pelo Claude Code: geometria, pintura e animações. Não usa modelos, texturas ou fotografias de terceiros nem conteúdo de jogos. A licença global do projecto continua por decidir pelo proprietário.

## Limitações

- As formas vêm de proporções genéricas de vistas de três lados, não de planos medidos. O cotovelo da asa, a capota e a cauda são aproximados.
- Não há interior da cabine, tripulantes, antena, metralhadoras das asas, nem disco de hélice desfocado para rotações altas.
- O garfo da bomba (Trapez) é fixo. As sirenes não giram, e não há som.
- As cores RLM estão aproximadas em sRGB, sem verificação em amostras. Sem mapa de ambiente, o avião fica escuro.
