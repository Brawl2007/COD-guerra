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
    - os três materiais (`ju87_b1` opaco com cor/ORM e normais em LOD0/LOD1, `ju87_glass` e `ju87_prop_disc` translúcidos), o material de cada nó e o número de draw calls;
    - a capota por cima da fuselagem e o disco centrado no cubo com o diâmetro da hélice;
    - as peças novas (tripulação, painel, MG 17, Pitot, antena, aros) e as medidas estimadas correspondentes;
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
| Cabine | capota comprida transparente com nove aros e calhas, piloto (virado para a frente) e atirador (para trás) em silhueta simples, encosto blindado, painel, uma MG 15 atrás | B; aros e tripulação **estimados** |
| Armamento e antena | duas MG 17 nas asas por fora do trem, tubo de Pitot na asa esquerda, mastro curto atrás da capota com fio até à deriva | posições **estimadas** por vistas genéricas |
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
| MG 17 | x = ±2,6 m | **estimada** |
| Pitot | x = −5,7 m | **estimada** |
| Antena | mastro a z = 1,42 m, fio até z = 5,2 m | **estimada** |
| Aros da capota | nove, de z = −1,86 a 1,22 m | **estimados** |

O manifesto repete esta tabela em `measures`, com `estimated: true/false` e a fonte de cada linha.

## Conteúdo e nós

| Ficheiro | Triângulos | Draw calls | Texturas | Tamanho | Uso sugerido |
| --- | --- | --- | --- | --- | --- |
| `m01_ju87_b1_lod0.glb` | 14 710 | 7 | cor 2048² JPEG, ORM 1024² JPEG, normais 1024² PNG, disco 128² PNG | 922 kB | perto, até 150 m; mergulho sobre o jogador |
| `m01_ju87_b1_lod1.glb` | 5 356 | 7 | cor 1024², ORM 512², normais 512², disco 128² | 359 kB | 150 a 600 m (alto e médio no raid) |
| `m01_ju87_b1_lod2.glb` | 1 929 | 7 | cor 512², ORM 256², disco 128² | 136 kB | longe; qualidade baixa (Chromebook) |

O orçamento do LOD0 em `assets-m01.json` é de 15 000 triângulos. Antes desta revisão (PR #28): 13 102/4 730/1 636 triângulos, 5 draw calls e 652/248/96 kB.

| Material | Uso | Notas |
| --- | --- | --- |
| `ju87_b1` | célula, hélice, freios, bomba | atlas pintado por procedimento (~132 px/m): cor, ORM (rugosidade/metal) e normais (LOD0/LOD1) |
| `ju87_glass` | nó `canopy` | `BLEND`, cor 0,42/0,50/0,53 com alfa 0,3, rugosidade 0,06; sem textura |
| `ju87_prop_disc` | nó `propeller_disc` | `BLEND`, dupla face, textura RGBA 128² (anel ténue com três rastos, mais denso nas pontas) |

| Nó | Pivô (m) | Conteúdo |
| --- | --- | --- |
| `ju87_b1` (raiz) | 0, 0, 0 = **centro de gravidade estimado sobre o eixo de tracção** | `extras.sockets`, `dimensions_m`, `variant` |
| `fuselage` | 0, 0, 0 | célula: fuselagem e capota do motor, radiador, escapes, entrada do compressor, aros e calhas da capota, cabine (painel, encosto blindado) e tripulação simplificada, MG 15, asas com MG 17, Pitot, antena, flaperons, trem carenado com rodas e sirenes, deriva, estabilizadores, montantes, roda de cauda, garfo da bomba |
| `canopy` | 0, 0, 0 | vidro da capota (`ju87_glass`) |
| `propeller` | 0, 0, −4,35 (cubo) | cone e 3 pás; roda em Z |
| `propeller_disc` | 0, 0, −4,35 (cubo) | disco translúcido da hélice em rotação (`ju87_prop_disc`); não roda |
| `dive_brake_r` / `dive_brake_l` | ±2,65, −0,764, −0,683 (dobradiça interior) | freio; o eixo X local segue a dobradiça (com diedro) |
| `bomb_sc250` | 0, −1,06, −0,55 | bomba; o jogo esconde-a ou solta-a no lançamento |

- **Eixos:** metros, +Y para cima, nariz para −Z e asa direita em +X.
- **Sem posição de Tczew:** o modelo não tem coordenadas de Tczew; o voo coloca e orienta a raiz.
- **Sockets:** `cg`, `propeller_hub`, `bomb_release`, `cockpit_eye`, `gunner_mg15`, `siren_l/r`, `wheel_l/r`, `tailwheel`, `exhaust_l/r` e `wingtip_l/r`.

## Pintura e desgaste

Tudo no atlas único, pintado em espaço 3D por `PAINTERS` em `src/ju87.mjs`:

- **Juntas e superfícies de controlo:** linhas de painéis na fuselagem (anéis e duas costuras longitudinais por lado), na capota do motor (com parafusos em relevo), nas asas (longarinas, nervuras e junta do cotovelo) e nas calças do trem; folgas mais fundas no leme, na profundidade e na divisão flap/aileron (x = ±3,65 m), com caixas de compensação no leme e na profundidade. Saem no mapa de normais (LOD0 1024², LOD1 512²) e escurecem a cor. Posições **estimadas** por proporção.
- **Tinta:** tom ligeiramente diferente por painel, desbotamento suave nas superfícies de cima e passadiço mais escuro e rugoso na raiz da asa.
- **Desgaste:** lascas até ao alumínio (metal 0,85, rugosidade 0,36) só onde há mãos, botas e erosão: passadiço e raiz da asa, bordos de ataque, capota do motor, bordos da cabine, aros da capota e pontas das pás. A cobertura foi medida por amostragem do ruído (~5 % no passadiço, ~1 % na capota do motor).
- **Sujidade:** fuligem dos escapes ao longo dos lados, a abrir e a esbater para trás; óleo brilhante na barriga atrás do radiador; poeira nas calças, nas rodas e na barriga traseira; escapes com cor de calor.
- **Cabine:** o topo da fuselagem dentro da capota é pintado de interior escuro; capacete de couro, rosto e fato de voo nas silhuetas da tripulação.

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
- `ju87_flight.png`: silhueta a 300 m (LOD1), a 800 m (LOD2) e em mergulho a 70° a 400 m, com os materiais por avião e o céu de ambiente do jogo (`src/render/m01-aircraft.js`, opção `runtime` do viewer). A linha de cima tem o tamanho real com FOV vertical de 60°; a de baixo é a mesma cena com FOV de 15° (cerca de 4×).
- As vistas e os pormenores usam a luz da galeria, sem o céu de ambiente do jogo; o disco da hélice aparece porque é parte do GLB.

## Integração (Codex)

- `M01View.loadAircraft()` carrega os três LODs e substitui as caixas por três `THREE.LOD`, partilhando geometria e texturas e conservando mixers independentes. Distâncias 150/600 m; médio não usa LOD0 e baixo usa LOD2. Falha opcional conserva silhuetas; só falhas das pontes bloqueiam a missão. As trajectórias, as horas e o estado continuam onde estavam. A SC 250 fica oculta porque a carga real não está confirmada. O `raidPlane` (18 m de envergadura) não é um Ju 87 e fica fora deste kit.
- **Apresentação (`src/render/m01-aircraft.js`, só funções do relógio guardado):**
  - materiais por avião (clones leves; texturas e geometria partilhadas) com pequenas diferenças de tom/rugosidade, sem marcas de unidade inventadas;
  - céu de ambiente 256×128 (PMREM do three.js) só nos aviões: reflexo no vidro e no metal e o ressalto do solo na barriga RLM 65, que só com a luz hemisférica da cena ficava quase preta contra o céu;
  - hélices com rpm (~1476–1524) e fase próprias; inclinação para o lado da deriva lateral do caminho existente e pequenas oscilações, sem mudar a posição nem o rumo (`rotation.y = 0,1`);
  - LOD com histerese de 10 % nos limiares (o mínimo por qualidade prevalece);
  - fade por dithering (`alphaHash`) durante 3 s depois de `evt_m01_planes_heard` e 2,5 s de cada lado da volta de 90 s do caminho, que antes teleportava os aviões ~360 m.
- Prova em produção, por continuação de snapshot genuíno, em `docs/verification/m01-runtime/aircraft/` (integração) e `docs/verification/m01-runtime/ju87-aircraft-closeout-2026-10-08/` (esta revisão, antes/depois); não é novo playtest contínuo/humano.
- **Dados que a engine poderia expor** (proposta, não implementada):
  - início do mergulho de cada avião, para abrir os freios;
  - instante de lançamento, para esconder a `bomb_sc250` e criar a bomba em queda a partir de `bomb_release`;
  - rotação do motor, para o `timeScale` da hélice e o tom da sirene.

## Licença e autoria

Todo o kit é original e foi gerado por código neste repositório pelo Claude Code: geometria, pintura e animações. Não usa modelos, texturas ou fotografias de terceiros nem conteúdo de jogos. A licença global do projecto continua por decidir pelo proprietário.

## Limitações

- As formas vêm de proporções genéricas de vistas de três lados, não de planos medidos. O cotovelo da asa, a capota e a cauda são aproximados.
- A tripulação é uma silhueta simples (cabeça e tronco), visível só de perto através do vidro; o interior da cabine é um painel e um encosto. Aros, antena, MG 17, Pitot, juntas e compensadores são estimados.
- O garfo da bomba (Trapez) é fixo. As sirenes não giram, e não há som.
- As cores RLM estão aproximadas em sRGB, sem verificação em amostras. O céu de ambiente é estático (cores de madrugada); o raid acontece antes do nascer do sol.
- O caminho dos três aviões é um voo nivelado em ciclo de 90 s: não há mergulho, freios abertos nem lançamento visível porque a trajectória e os tempos estão fixados. Os freios e a bomba estão prontos no kit para quando a simulação expuser esses dados.
