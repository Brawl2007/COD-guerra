# M01 — Production pass ferroviário (trem 963, Panzerzug 7, vagões, carris)

**Documento de preparação, sem código.** Autor: Vehicle + Railway Art/Engineering Lead. Data: 07/10/2026. Branch `claude/railway-production-pass-3c7fwx`.

Objectivo: transformar os comboios, vagões e carris de M01 de geometria de protótipo (caixas e cilindros) em assets convincentes para um FPS da Segunda Guerra Mundial, **sem** redesenho de gameplay, **sem** alterar horários históricos (04:45 trem 963, 04:52 Panzerzug 7), **sem** alterar a autoridade da simulação e **sem** alterar a composição autoritativa do comboio (65 vagões, `missions/m01-tczew/mission.json` e `map-layout.json`).

O contrato de execução, pronto para o Captain, está em [`TASK_CONTRACT_M01_RAILWAY.md`](TASK_CONTRACT_M01_RAILWAY.md).

Leituras prévias obrigatórias para quem executar: `AGENTS.md`, `DEVELOPMENT_STATUS.md`, `RUNBOOK.md`, `missions/m01-tczew/ASSETS.md`, `missions/m01-tczew/assets-m01.json`, `missions/m01-tczew/SOURCE_CHECK.md` (P6, P16), `docs/assets/m01-bridges/README.md` e `docs/assets/m01-soldiers/README.md` (convenções de kit GLB já aceites no repositório).

---

## 0. Diagnóstico do estado actual

Tudo o que existe hoje está em quatro sítios. Nenhum deles decide dano, visibilidade, eventos ou missão: a visibilidade vem de `renderState.train963` e `renderState.panzerzug`, que são os eventos consumidos `evt_m01_train963_arrives` e `evt_m01_panzerzug_arrives` (`src/game/m01-simulation.js:701`). Isso tem de continuar exactamente assim.

| Sistema | Onde | O que há | Problema visual |
| --- | --- | --- | --- |
| Trem 963 | `src/render/m01-view.js:310-315` (`createTrains`) | 32 `BoxGeometry` de 17×3,2×2,8 m a cada 20 m desde x=1075, z=−2,5; a primeira caixa escura faz de locomotiva; 2 cilindros "eixo" por caixa | 32 caixas para 65 vagões; sem locomotiva reconhecível, sem rodas, sem engates, sem tampões, sem variação; 96 draw calls só neste grupo |
| Panzerzug 7 | `m01-view.js:316-317` | 5 caixas metálicas de 17 m a cada 19 m desde x=1119, z=+2,5; 2 cilindros a fazer de torres em x=1120 e 1197 | Silhueta de contentores; 7 draw calls |
| Carris | `src/render/m01-environment.js` (`buildTracks`) | Por cada polyline `rail_*`: uma travessa (`box` madeira 0,2×0,10×2,65) e uma pedra de lastro a cada 1,35 m, instanciadas | **Não há carril**: só travessas e lastro. Passo de 1,35 m (real ≈ 0,60–0,65 m). Uma só via no eixo da polyline, enquanto os dois comboios estão em z=±2,5 m, ou seja, **ao lado** da via desenhada. O troço da linha leste depois de x=1431 é saltado (`length>1800`): os últimos 280 m do trem assentam em nada |
| Assentamento | `src/world/tczew-world.js` (`terrainHeightAt`) | Terreno em x≥1055 está a y=−1; a polyline `rail_line_east` está a y=0 | Travessas a y≈0,07 e "rodas" de raio 0,6 em y=0,4 (base a −0,2): **a via e o comboio flutuam ≈1 m** sobre o terreno leste |
| Vagões do desvio da estação | `map-layout.json` `freight_wagons_west` (3 pontos em x −320…−352) e `coverNodes` `cv_wagon_1/2` (tipo `VEHICLE`) | **Não são renderizados**. Os nós `VEHICLE` são excluídos dos sólidos em `TczewWorld.refresh`, portanto também não têm colisão | O roteiro usa-os como última cobertura da rota para o abrigo ("portal, sandbags, trincheira, barracão, vagões"); hoje não existem |
| Vagão a arder | `m01-simulation.js:177` empurra `station_wagon_fire` para `destruction` no evento `wounded_dragged` (3.ª bomba das 04:34, `SCRIPT.md` t 8,5 s) | **Nenhum consumidor no renderer**. Só o emissor `station_bomb` põe fumo permanente no centro da estação | Estado guardado no save sem representação |
| Fumo da locomotiva | `SCRIPT.md` cena 5: "vê-se a fumaça de uma locomotiva parada diante dos portões" | Não existe | O único sinal a 1 km seria o fumo; não há |
| Fogo do Panzerzug | `mission.json` `ae_s2_mg_train` em [1160, 3, 2,5] (emissor áudio); `firePositions` reais estão nos portões (x≈1055) | Não há clarão no trem | Ver decisão D6: mudar a origem do fogo é gameplay, não arte |

Medidas da cena que condicionam tudo o que se segue:

- **Distâncias.** O jogador fica na margem oeste; o trem 963 começa em x=1065 e o Panzerzug em x=1110. Da secção de Jan (x≈−70…−30) são **1,05–1,2 km**. Durante "Cubra a retirada" o jogador pode estar no tabuleiro rodoviário (z≈40), nunca para lá da zona de demolição leste (x≈794): a distância mínima realista ao trem é **≈450 m**. Os únicos vagões a 0–60 m são os **três do desvio da estação**.
- **Ângulo de vista.** As vias correm ao longo de x, que é a direcção do olhar de quem está na margem oeste a olhar para Lisewo. Do posto avançado (z=3) ou da secção (z=22) a composição é vista **de topo, quase de frente** (0,3–1,3° de obliquidade): os 65 vagões sobrepõem-se uns aos outros e a **frente da locomotiva** (porta da caixa de fumo, lanternas, trave dos tampões) é a face virada para o jogador, enquadrada pelo arco do portal de 1912. Do tabuleiro rodoviário a 450 m a obliquidade é ≈5°. Em nenhum momento de M01 o trem 963 ou o Panzerzug são vistos de lado a menos de 1 km.
- **Luz.** 04:45 é antes do nascer do Sol (crepúsculo náutico 03:27, civil ~04:20). O Sol nasce a ENE e fica baixo até 06:40: os comboios estão **sempre em contraluz**. A 1 km só a silhueta, o fumo e os clarões contam.
- **Fog.** `scene.fog` 420–2800 m (`m01-view.js:18`). A 1050–1250 m o comboio está 26–35 % fundido com o céu.
- **Sombras.** Câmara de sombra ±65 m em volta do jogador: o trem leste nunca projecta sombra; os vagões do desvio projectam.
- **Ecrã.** 1280×720, FOV 70° (48° a mirar): ≈18,3 px/°, logo um objecto de altura *h* a distância *d* ocupa ≈1048·h/d px (≈1528·h/d a mirar).
- **Orçamento actual do frame** (`docs/verification/m01-runtime/visual-sprint/after/report.json`): 128–153 geometrias e 360–650 k triângulos por frame, com passes de sombra. Os comboios actuais somam **103 draw calls** sem instancing quando visíveis, mais do que o resto do frame; isto é a primeira coisa a corrigir.

---

## 1. Breakdown visual por componente

Regra de certeza (herdada de `SOURCE_CHECK.md`): P16 (classe da locomotiva e tipos de vagão) e P6 (composição do Panzerzug 7) continuam abertas. **Nenhuma classe, número de série ou unidade é afirmada no ecrã.** As proporções abaixo são de material genérico alemão da época e servem só para modelar; as dimensões marcadas "a confirmar" ficam no manifesto como `RECONSTRUCTED`.

### 1.1 Locomotiva do trem 963 (vapor, carga, com tender)

Referências de proporção, nunca de identidade: locomotiva de carga prussiana de quatro ou cinco eixos acoplados, ainda numerosa em 1939 (a lista `assets-m01.json` já rejeitou BR 52 por ser de 1942 e BR 01 por ser de expresso). Dimensões de trabalho: comprimento com tender ≈18–19 m, largura ≈3,1 m, altura ao topo da chaminé ≈4,3 m, rodas motoras ≈1,25–1,40 m, tender de três eixos (a confirmar, P16).

| Zona | Elementos que definem a silhueta e a leitura | Nota de arte |
| --- | --- | --- |
| Caixa de fumo | Porta redonda com volante central e dobradiças, chaminé curta e grossa, farol superior | A chaminé e a porta são a "cara" da locomotiva mesmo a 500 m |
| Caldeira | Cilindro com cinta de chapa, domo de vapor e domo de areia (dois volumes no topo), válvulas de segurança, tubos de areia a descer | Os dois domos quebram a linha do topo: é o que distingue uma locomotiva de uma caixa a 1 km |
| Cabina | Janelas laterais e frontais, tejadilho, portas, degraus | Interior escuro; no LOD de longe é uma caixa mais alta que a caldeira |
| Rodado | Rodas motoras raiadas e acopladas, bielas, cilindros exteriores com distribuição (Walschaerts/Heusinger) | A 1 km nada disto se vê; a 450 m vê-se o ritmo escuro/claro das rodas |
| Plataforma | Estribos laterais, trave dos tampões vermelha com dois tampões, gancho e engate, três lanternas (Zg 3) | Lanternas: decisão D3 |
| Tender | Caixa de água com carvão, três eixos, freio manual, escada traseira | Carvão com relevo irregular, não plano |
| Cor | Preto fosco (caldeira, cabina, tender) com rodado/chassis vermelho-óxido, trave dos tampões vermelha | Esquema padrão DRG; tom exacto INCERTO, documentar no manifesto |

### 1.2 Panzerzug 7 (silhueta a ≥1,05 km, MGs só)

Composição `RECONSTRUCTED` dentro do comprimento autoritativo (polyline 1110→1215, 105 m) e coerente com T20 (2 × 7,5 cm, 2 × 2 cm AA) e com a regra da missão (apenas MGs disparam). Proposta, de oeste para leste, mantendo cinco corpos como hoje:

1. **Vagão de protecção** (plataforma rasa com carris sobresselentes, lastro, sacos) ≈10 m.
2. **Vagão de infantaria/MG** (caixa blindada de paredes verticais, seteiras, tejadilho plano, portas laterais) ≈13 m.
3. **Vagão de canhão** 7,5 cm em casamata baixa com torre pequena ≈13 m.
4. **Locomotiva blindada com tender** no meio (caixa blindada que envolve caldeira e cabina, só a chaminé e os domos sobressaem) ≈18 m.
5. **Vagão antiaéreo** 2 cm em plataforma aberta com escudo baixo, ou segundo vagão de canhão, seguido de vagão de protecção ≈13+10 m.

| Zona | Elementos | Nota |
| --- | --- | --- |
| Blindagem | Chapas de 15–30 mm aparafusadas/rebitadas em painéis, juntas verticais, seteiras rectangulares com tampa, escotilhas no tejadilho, escadas | A 1 km lê-se só a **altura** (≈4,5–5 m na locomotiva e torres contra 3,2–4 m dos vagões de carga), o contorno recto e a frente blindada do vagão de protecção, que é a face virada para o jogador |
| Armas | Torre do 7,5 cm com cano curto; 2 cm com escudo; MGs nas seteiras | Nenhuma arma dispara visualmente a não ser que a simulação emita de lá (D6) |
| Cor | Cinzento-escuro uniforme, sem insígnias até política de símbolos (`assets-m01.json`, nota de insígnias) | Esquema de 1939 INCERTO; manter neutro |

Nota de composição: visto quase de topo da margem oeste, o Panzerzug em z=+2,5 **sobrepõe-se** ao trem 963 em z=−2,5 no ecrã (e, para quem está a sul do eixo, fica ligeiramente à frente, não "atrás"). A fala de Kowal (dlg 038, "na outra via, atrás dos vagões") continua válida como leitura de combate; visualmente, o que faz o Panzerzug destacar-se é ser **mais alto e mais escuro** do que os vagões e ter a sua própria coluna de fumo. Não alterar dados (D8).

### 1.3 Vagões do trem 963 (65) e do desvio da estação (3)

Três tipos, todos de **dois eixos** (o material de carga alemão corrente de 1939 não tinha bogies; o termo "bogie" do pedido aplica-se só ao Panzerzug e a plataformas longas, ver 1.4):

| Tipo | Proporção de trabalho (a confirmar, P16) | Elementos de silhueta | Elementos de perto |
| --- | --- | --- | --- |
| **Coberto (G)** | 9,6–10,0 m entre tampões, caixa 2,8–3,0 m de largura, 3,9–4,0 m ao topo do tejadilho curvo, entre-eixos 4,5–5,0 m | Tejadilho curvo, porta de correr central de cada lado, portinholas de ventilação altas | Prancheado vertical com juntas e nós, nervuras metálicas em T, calha e roletes da porta, trinco, placas de inscrição, estribos |
| **Aberto (O)** | 9,0–9,5 m, bordas 1,5–1,8 m acima do estrado | Caixa baixa com portas laterais de dobrar, carga (carvão, lona, vazio) | Nervuras exteriores, dobradiças, cunhas de madeira, lona com cordas |
| **Plataforma (R)** | 10–12 m, estrado 1,25 m acima do carril | Fueiros, carga volumosa coberta ou vazio | Tábuas do estrado, fueiros, correntes |
| **Variante com guarita de freio** | Qualquer dos anteriores, guarita numa extremidade, +1 m de altura | Quebra o ritmo do topo da composição a cada 4–6 vagões | Janela, porta, volante de freio |

Cor: castanho-avermelhado "vermelho de vagão" na caixa, tejadilho cinzento, chassis e rodado pretos, inscrições brancas estilizadas (sem números verdadeiros nem siglas de companhia afirmadas). Os três vagões do desvio recebem **os mesmos tipos** com maior detalhe (LOD0), e um deles arde (secção 6).

### 1.4 Rodado: eixos, caixas de eixo, "bogies", rodas

- **Vagões de dois eixos:** rodas de ≈0,94–1,00 m (disco ou raiadas), eixo visível entre as rodas, caixa de eixo com tampa, chapa guia (W-iron) e **mola de lâminas** por roda, pendurada do longarão. É o conjunto que o jogador vê a 5 m: tem de ser geometria, não textura.
- **Bogies (só Panzerzug e plataformas longas):** armação de duas pernas com molas, dois eixos, pivot ao centro. Em M01 nunca são vistos a menos de 450 m: geometria simples (caixa com duas rodas) chega.
- **Rodas:** pista de rolamento em aço nu (metálico, claro), verso e cubo oxidados, flange. A 20 m a roda é um disco de 50 px: precisa de aro e flange modelados; raios podem ser textura com normal map.
- **Locomotiva:** rodas raiadas com contrapesos; as bielas são a única parte "mecânica" que se nota a 450 m pela mancha clara.

### 1.5 Engates e tampões

- **Tampões**: dois por topo, cabeça redonda ou rectangular de ≈0,35–0,45 m, luva cónica, flange de quatro parafusos, a 1,05 m acima do carril. Entre vagões parados as cabeças tocam-se: visualmente fecham o espaço entre caixas.
- **Engate de parafuso** com gancho, lanterna e correntes laterais; entre vagões engatados fica curvado para baixo. A 5 m é uma peça de grande leitura; a 50 m desaparece dentro da sombra entre vagões.
- **Mangueiras de travão** (se houver travão contínuo, incerto para carga de 1939): opcional, não afirmar.

### 1.6 Chassis

Longarões em U, cabeceiras, travessas, tirantes, cilindro e timoneria de travão, volante ou alavanca de freio manual, degraus, chapa de identificação. A sombra do chassis sobre o lastro é metade da credibilidade de um vagão parado: garantir `castShadow` para os vagões do desvio e ambient occlusion pintada no atlas para o resto.

### 1.7 Armadura (Panzerzug)

Painéis grandes, juntas de 20–40 mm, parafusos de cabeça redonda em filas duplas a 10–15 cm, seteiras com aro, escotilhas em relevo. Nada disto se vê a 1 km; ver secção 3 sobre o que fazer com LOD0.

### 1.8 Equipamento ferroviário

Prioridade por visibilidade na rota do jogador (estação, barracão, aterro, portal):

1. **Carris** com perfil real (secção 1.9).
2. **Postes de telégrafo** ao longo da linha oeste (já há uma cerca em `buildClutter`; os postes dão escala ao aterro).
3. **Marcos hectométricos, placas de declive, sinal de disco/semáforo mecânico** junto à estação, lanternas de via.
4. **Grua de água** e **pilha de carvão/cinzeiro** na zona da estação; **caixa de areia, dormentes empilhados, alavanca de agulha** no desvio dos vagões.
5. **Agulha** entre a linha principal e o desvio (hoje o desvio nem sequer tem via).

Tudo decoração não sólida, com o mesmo princípio do `M01Environment` actual: nunca bloqueia rotas nem tiros.

### 1.9 Integração com os carris

- **Perfil** de carril de ≈0,15 m de altura, cabeça de ≈0,07 m, patim de ≈0,125 m, sobre placas de apoio nas travessas. Topo do carril = terreno + lastro (≈0,30 m) + travessa (0,16 m) + 0,15 m.
- **Bitola** 1,435 m. **Entre-eixo de vias** no leste: manter os ±2,5 m da layout (D8).
- **Travessas** de madeira 2,6×0,26×0,16 m a cada 0,63 m (metade no preset baixo). **Lastro** como faixa contínua, não pedras soltas.
- **Juntas** de carril (talas) a cada 15–30 m: a 5 m são o detalhe que denuncia "via real".
- **Assentamento**: as rodas tocam o topo do carril (±2 cm) em todo o comboio; é um critério de aceitação (secção 10), medido no teste do GLB e na captura.
- **Ponte**: o kit GLB das pontes já tem material `steel_rail` no tabuleiro; os carris novos do solo têm de **encontrar** os da ponte nos encontros (x=0 e x≈1049) sem degrau visível.

### 1.10 Danos

Ver secção 6. Só os vagões do desvio têm estados de dano em M01; o trem 963 e o Panzerzug não recebem dano (não há evento na simulação, e não se inventa).

### 1.11 Estados a arder / queimado

Ver secções 6 e 7: um vagão coberto do desvio arde a partir do evento `wounded_dragged` e passa a carcaça queimada mais tarde na missão.

---

## 2. O que o jogador percebe a 5 m, 20 m, 50 m e 100+ m

Números para 1280×720, FOV 70°, preset baixo (pixel ratio 1). A mirar multiplicar por 1,46.

| Elemento (tamanho real) | 5 m | 20 m | 50 m | 100 m | 450 m (tabuleiro) | 1050 m (secção) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Altura do vagão (3,2–4,0 m) | enche o ecrã | 170–210 px | 67–84 px | 34–42 px | 7–9 px | **3–4 px** |
| Comprimento do vagão (10 m) | — | 520 px | 210 px | 105 px | 23 px | **10 px** |
| Composição de 65 vagões (650 m), vista quase de topo | — | — | — | — | faixa diagonal ≈60 px de largura (5°) | **sliver de 5–10 px** (secção/posto avançado) |
| Roda (1 m) | 210 px | 52 px | 21 px | 10 px | 2 px | <1 px |
| Tampão (0,40 m) | 84 px | 21 px | 8 px | 4 px | — | — |
| Tábua (0,15 m) | 31 px | 8 px | 3 px | 1,5 px | — | — |
| Rebite / parafuso (25 mm) | 5 px | 1,3 px | — | — | — | — |
| Junta de tábuas (1 cm) | 2 px | — | — | — | — | — |
| Guarita de freio (+1 m) | — | 52 px | 21 px | 10 px | 2 px | 1 px |
| Chaminé + domos da locomotiva (0,6–0,9 m acima da caldeira) | — | — | — | — | 1,5–2 px | <1 px |
| Coluna de fumo (30–60 m) | — | — | — | — | 70–140 px | **30–60 px** |
| Clarão de MG (mínimo forçado em código) | — | — | — | — | ≥8 px | ≥8 px |

Conclusões operacionais:

- **5 m (desvio da estação).** Tudo é geometria ou normal map legível: rebites, dobradiças, calha da porta, juntas de tábuas, flange e pista das rodas, molas, correntes do engate, talas dos carris, parafusos. Texturas tiling denunciam-se; precisa de atlas único com variação pintada, decalques de inscrição e sujidade em gradiente. A sombra de contacto e a oclusão no chassis são o que separa "modelo" de "objecto".
- **20 m (desvio e trincheira).** Silhueta completa + prancheado + roda com aro/flange + porta e nervuras. Rebites passam a textura. A cor por vagão e o nível de ferrugem são o que distingue um vagão do vizinho.
- **50 m (do barracão).** Silhueta, tejadilho curvo vs. aberto, guaritas, roda como disco escuro, sombra sob o chassis. Detalhe fino inútil; a **variação de altura e de tom** entre vagões é tudo.
- **100 m.** Tipo do vagão ainda legível (coberto/aberto/plataforma); nada mais. LOD2 chega.
- **450 m (tabuleiro rodoviário, retirada, ≈5° de obliquidade).** A composição é uma faixa diagonal de ≈60 px de largura por 7–9 px de altura, com os vagões sobrepostos (cada um contribui ≈2 px laterais); as guaritas e os vagões abertos aparecem como dentes na linha do topo; a locomotiva vê-se a três quartos, com chaminé, domos e fumo. Distinguir tipos de vagão não é objectivo realista; distinguir **tejadilho contínuo vs. quebra** é. O Panzerzug lê-se pela altura e pela cor mais escura.
- **1050–1250 m (secção de Jan, 90 % da missão).** O comboio é uma **mancha escura de 5–10 px de largura por 4–5 px de altura** no fim das pontes, dentro do arco do portal, em contraluz e com 26–35 % de fog. O que o jogador vê: a frente da locomotiva, a **coluna de fumo** (30–60 px), o **brilho de lanternas/fornalha** (D3), a massa mais alta do Panzerzug a partir das 04:53 e os **clarões** das MGs dos portões. Modelar rebites ou variar vagões para este plano é desperdício absoluto; investir na frente da locomotiva, no fumo, no brilho e no contraste de altura.

---

## 3. Estratégia de LOD

Princípio: o LOD é apresentação, escolhido no renderer pela distância ao jogador com histerese; nunca altera dados da simulação (mesma regra do kit das pontes, que usa 0/400/800 m em `renderState.parts`). Os comboios não entram em `parts`: o novo módulo de apresentação calcula o LOD por grupo (composição inteira, não por vagão) com a distância ao vagão mais próximo.

| Nível | Distância | Uso em M01 | Orçamento por peça (triângulos) | Materiais |
| --- | --- | --- | --- | --- |
| LOD0 | 0–30 m | **Só os 3 vagões do desvio** e a variante queimada | Vagão 4 000–6 000 (D1); queimado ≤6 000 | Atlas 2048² albedo + normal 1024² + ORM 1024² |
| LOD1 | 30–150 m | Vagões do desvio ao afastar; nunca o trem leste | Vagão ≤1 500; locomotiva ≤8 000; Panzerzug ≤10 000 | Atlas 1024², sem normal no preset baixo |
| LOD2 | 150–1 500 m | **Todo o trem 963 e o Panzerzug** durante toda a missão | Vagão ≤300; locomotiva ≤1 500; Panzerzug corpo ≤800 por vagão | Atlas 512² só cor, AO pintada |
| LOD3 | >1 500 m | Não necessário (o trem acaba em x=1715, ≈1,75 km da secção: usar LOD2 com fog) | — | — |

Decisões de LOD que poupam trabalho:

- **Não produzir LOD0 da locomotiva nem do Panzerzug neste pass** (D2). `assets-m01.json` orçamenta 20 000 e 18 000 triângulos para LOD0; M01 nunca os vê a menos de 450 m. Entregar LOD1 e LOD2 agora; LOD0 fica como tarefa de campanha quando uma missão os exigir de perto.
- **Instancing por tipo e por LOD**: um `InstancedMesh` por (tipo de vagão, LOD) com todos os vagões dessa classe; rodas de todos os vagões num único `InstancedMesh` por LOD. O trem de 65 vagões passa de 96 draw calls para ≈6 (3 corpos + rodas + locomotiva + tender).
- **Histerese** de 15 % na troca para não piscar quando o jogador anda no tabuleiro.
- **Preset baixo**: o LOD2 é obrigatório para tudo a mais de 100 m, as travessas passam a metade e o normal map desliga-se (o material `texturedSurface` já tem a convenção `m01LowDetail`).
- **Fallback**: se um GLB falhar, manter as caixas actuais (comportamento igual ao das pontes: diagnóstico em `assetFailures`, nunca comboio invisível).

---

## 4. Materiais necessários

Todos originais ou CC0 com ficha por ficheiro (regra de `ASSETS.md`). O gerador pode pintar atlas proceduralmente como `tools/assets/m01-soldiers/src/paint.mjs` faz hoje.

| Material | Onde | Canais | Notas de valor (sRGB albedo, roughness, metalness) |
| --- | --- | --- | --- |
| **Aço pintado de vagão** (vermelho-castanho) | Caixas G/O/R, nervuras | albedo, normal (nervuras/rebites), roughness, AO | Albedo escuro e dessaturado (≈#5a3a2c), roughness 0,7–0,85, metalness 0–0,1 (tinta não é metal) |
| **Madeira de prancheado** | Portas, paredes, estrados | albedo, normal (juntas, veio), roughness | Veio vertical, tábuas com tom individual ±8 %, roughness 0,85–0,95 |
| **Aço nu / ferrugem** | Rodas (verso), engates, tampões, molas, chassis | albedo, normal, roughness, metalness (máscara) | Pista de rolamento metalness 0,9 roughness 0,35; verso oxidado metalness 0,2 roughness 0,9 |
| **Preto de locomotiva** | Caldeira, cabina, tender | albedo, roughness, AO | Preto fosco com fuligem; roughness 0,6 na caldeira (lustro de óleo) e 0,9 no tender |
| **Vermelho-óxido de rodado** | Rodas motoras, chassis da locomotiva | albedo, roughness | Esquema DRG; tom INCERTO |
| **Blindagem cinzenta** | Panzerzug | albedo, normal (juntas/parafusos), roughness, AO | Cinzento-escuro ≈#3a3d3b, roughness 0,75; sem metalness alto |
| **Carvão** | Tender, vagões abertos | albedo, normal, roughness | Preto com brilho em facetas (roughness 0,4 em pontos) |
| **Lona** | Cargas cobertas | albedo, normal | Cáqui dessaturado, vincos |
| **Carril** | Perfil extrudido | albedo, roughness, metalness | Cabeça polida metalness 0,9 roughness 0,3; alma e patim oxidados |
| **Lastro** | Faixa contínua | `texturedSurface('stone')` triplanar existente, escala 0,5 | Reutilizar; sem textura nova |
| **Travessa** | Instâncias | `texturedSurface('wood')` existente, mais escura (creosote) | Reutilizar com `color` |
| **Madeira carbonizada** | Vagão queimado | albedo, normal (crosta), roughness | Preto com cinza, roughness 1,0 |
| **Emissivo** | Fornalha/cinzeiro, lanternas (D3), brasas | emissive | `toneMapped:false` como os clarões actuais |

Regras:

- **Um atlas por família**: `rail_stock` (vagões + locomotiva + chassis + rodas), `armour` (Panzerzug), `rail_track` (carril/talas/placas). Três materiais no total para todo o sistema ferroviário.
- **Nada de cor sólida** (Prompt §24): mesmo o LOD2 usa o atlas 512² com AO e sujidade pintadas.
- **Tone mapping**: a cena é crepuscular; validar os valores de albedo com uma captura às 04:45 e outra às 06:20 (contraluz), não só em luz neutra.
- **Memória**: 2048² + 2×1024² ≈ 24 MB descomprimidos por atlas; no preset baixo carregar a versão 1024². Registar bytes por ficheiro no manifesto como o kit de soldados faz.

---

## 5. Weathering

Camadas, da base para cima, todas pintadas no atlas e moduladas por instância:

1. **Desbotamento/giz** da tinta nas faces superiores e expostas ao Sol (tejadilho, topo das paredes).
2. **Fuligem** em gradiente de cima para baixo nos vagões e no topo da caldeira/cabina (fumo da locomotiva).
3. **Ferrugem em escorrência** a partir de rebites, dobradiças, cantos de nervuras, parafusos de tampões.
4. **Pó de travão e lama** nos 60 cm inferiores: rodas, molas, longarões, degraus.
5. **Massa e óleo** nas caixas de eixo, engates, bielas (locomotiva), cilindros.
6. **Inscrições a giz e estênceis** gastos (destinos, cargas), riscados em parte; nunca números ou siglas reais afirmadas.
7. **Desgaste de uso**: portas com tinta gasta junto ao trinco e à calha, estribos polidos, bordas superiores dos vagões abertos amolgadas.
8. **Panzerzug**: camada mais fina (tinta recente), mas com arranhões nas chapas, ferrugem nas juntas e fuligem na chaminé.

Variação por instância sem texturas extra: um atributo por instância (`weatherVariant` 0–3 e `tint` ±6 % de valor e ±3 % de matiz) escolhe uma de quatro máscaras de sujidade no canal alfa/ORM e desloca o tom base. Com três tipos × quatro máscaras × espelhamento, 65 vagões não repetem par vizinho.

---

## 6. Danos

Toda a mudança de estado vem de `renderState.destruction` e `renderState.events`; o renderer só mapeia IDs para variantes de malha.

| Estado | Fonte na simulação | Quem | Representação |
| --- | --- | --- | --- |
| Intacto | — | todos | Malha base |
| **A arder** | `station_wagon_fire` em `destruction` (evento `wounded_dragged`) | 1 vagão coberto do desvio, no ponto **(−352, 0, 8)** (D7: o único ponto sem nó de cobertura; `cv_wagon_1/2` ficam utilizáveis) | Malha `wagon_g_burning`: portas rebentadas, tejadilho parcialmente aberto, prancheado carbonizado nas bordas; emissivo interior; fogo e fumo da secção 7 |
| **Queimado** | Mesmo ID, idade ≥ N min | O mesmo vagão | Malha `wagon_g_burned`: carcaça de chassis + nervuras, tábuas restantes negras, tejadilho caído; sem fogo, fumo residual fino |
| Impactos de bala | `impacts` já desenhados por `updateFire` (faíscas/poeira) | vagões do desvio | Sem decalques novos neste pass; opcional: decalques pooled em atlas (≤32) se o orçamento permitir |
| Crateras/estilhaços | `craters_embankment` já em `destruction` | desvio | Lascas de madeira e buracos **pintados** na variante queimada; não gerar geometria dinâmica |

Idade do fogo sem tocar na simulação: `destruction` não guarda tempo, mas o evento tem hora fixa na missão (`mission.json`, `evt_m01_wounded_dragged`), e `renderState.battleClock` é dado da simulação. O renderer calcula `idade = battleClock − hora_do_evento` a partir dos dados da missão: determinístico, igual após restaurar save, sem alterar `m01-simulation.js`. Proposta de curva: chamas plenas 0–25 min, decrescentes 25–60 min, só fumo e brasas 60–90 min, carcaça depois (o vagão continua a fumegar no debrief das 07:00, coerente com o fumo permanente de `station_bomb`).

O trem 963 e o Panzerzug **não** têm estados de dano em M01: a demolição das 06:10 cobre-os de fumo (`SCRIPT.md`, "a fumaça cobre o trem 963"), o que já é tratado pelo emissor de demolição existente.

---

## 7. Integração de fumo e fogo

O pool de partículas (`M01Atmosphere`, 112/192/256 por preset) já é partilhado e prioriza demolições. Os emissores ferroviários entram **no mesmo pool**, com prioridade abaixo das demolições e acima do fumo de chaminés genérico, e com tectos fixos para nunca esgotar a demolição.

| Emissor | Condição (dados da simulação) | Partículas máx. (baixo/médio/alto) | Aparência |
| --- | --- | --- | --- |
| **Chaminé da locomotiva 963** | `renderState.train963` | 8/12/16 | Fumo cinzento-escuro de carvão em coluna lenta (locomotiva parada), inclinada pelo vento da cena; puffs de 6–10 m a 40–60 m de altura; é o sinal principal a 1 km |
| **Vapor** (válvulas de segurança, purgadores dos cilindros) | `renderState.train963` | 4/6/8 | Branco, baixo, curto, dissipa em 3–5 s; ciclo com pausa (a locomotiva está parada, a pressão sobe) |
| **Chaminé do Panzerzug** | `renderState.panzerzug` | 4/6/8 | Mesma coluna, mais fina |
| **Vagão a arder** | `station_wagon_fire` + idade | fogo 10/14/18 + fumo 10/14/18 | Chamas: billboards aditivos a partir da textura de puff com paleta laranja→amarelo, nascendo das portas e do tejadilho, 1,5–3 m; fumo preto-castanho a subir 20–30 m; brasas: 6–10 pontos emissivos pequenos |
| **Vagão queimado** | idade ≥ 60 min | 3/4/6 | Fio de fumo cinzento |

Regras:

- Sem luzes dinâmicas novas no preset baixo. No médio/alto, **uma** `PointLight` laranja oscilante no vagão a arder, alcance 12 m, sem sombras, dentro do raio dos 65 m da câmara de sombra; nunca a mais de 1 luz. O trem a 1 km não tem luz.
- O brilho da fornalha e das lanternas (D3) é emissivo com `toneMapped:false`, sem luz.
- O fumo da locomotiva usa a mesma textura `puffTexture` e a mesma fusão com o fog (`smoothstep(500, 2700, depth)` no shader): a 1 km fica naturalmente dessaturado.
- Determinismo: fase das partículas derivada de `clock` e índice, como hoje; nenhum `Math.random()` no render.
- Som: fora deste pass. Os emissores de áudio da missão já existem (`ae_s2_mg_train`); o som de locomotiva parada (purgas, fornalha) é uma tarefa de áudio separada.

---

## 8. Como evitar repetição entre vagões

A composição autoritativa é 65 vagões entre x=1065 e x=1715 (passo 10 m). A variação é toda apresentação, determinística, derivada de uma semente fixa (padrão `seed=19390901` já usado em `M01Environment`):

1. **Mistura de tipos** plausível para um comboio de trânsito de carga: ≈60 % cobertos, ≈25 % abertos, ≈15 % plataformas/outros, por sequência pseudo-aleatória sem mais de 4 iguais seguidos.
2. **Guarita de freio** em ≈1 de cada 5 vagões, alternando a extremidade.
3. **Quatro máscaras de weathering** e jitter de tom por instância (secção 5).
4. **Espelhamento** em X (inscrições ficam do lado oposto) em ≈50 % dos vagões.
5. **Estados das portas**: nos cobertos, ≈1/3 com uma porta aberta e ≈1/6 com as duas (os pioneiros desembarcaram); estático, decidido pela semente, sem relação com eventos (D9).
6. **Cargas** nos abertos: carvão cheio, meio, vazio, lona; plataformas vazias ou com carga coberta.
7. **Micro-jitter** de pose: ±0,3° de guinada e ±0,2° de rolamento por vagão, ±3 cm de folga no engate. A 450 m isto quebra a linha perfeita; a 5 m parece via real.
8. **Inscrições** diferentes por variante (giz, estênceis gastos), nunca o mesmo decalque em vizinhos.
9. **Desvio da estação**: dois tipos diferentes entre os três vagões (coberto, coberto a arder, aberto), e orientações diferentes.

Verificação: um teste do manifesto garante que nenhuma janela de 6 vagões consecutivos repete (tipo, máscara, espelhamento).

---

## 9. Como reduzir BoxGeometry / CylinderGeometry

| Hoje | Depois | Efeito |
| --- | --- | --- |
| 32 `Mesh(BoxGeometry)` + 64 `Mesh(CylinderGeometry)` para o trem | 3 `InstancedMesh` de corpos (por tipo) + 1 de rodas + 1 locomotiva + 1 tender, a partir de GLB | 96 → ≈6 draw calls; geometria com silhueta real |
| 5 caixas + 2 cilindros para o Panzerzug | 1 GLB com 5 corpos fundidos num só mesh por LOD (as peças são sempre vistas juntas) | 7 → 1–2 draw calls |
| Travessa `box` + pedra `rock` a cada 1,35 m por linha | Travessas instanciadas a 0,63 m (1 draw call por material), **faixa de lastro** como um mesh contínuo por linha, **carris** extrudidos por polyline fundidos num mesh por linha | Lastro: ~1 000 instâncias → 1 mesh; carris: 0 → 3 meshes; travessas mantêm 1 draw call |
| Nada no desvio | 3 instâncias LOD0/1 + variante a arder/queimada | +3–4 draw calls perto da estação, com sombra |
| Nenhum equipamento ferroviário | Postes, marcos, sinal, grua de água, agulha, como instâncias nas listas existentes do `M01Environment` | +4–6 draw calls instanciados |

Regras de engenharia:

- **Geração reprodutível** em Node, no padrão de `tools/assets/m01-bridges` e `tools/assets/m01-soldiers`: `build.mjs` → GLB + `railway.manifest.json` com triângulos, bytes, materiais, licença e `sha256_16` das entradas. Nada de malhas feitas à mão sem fonte.
- **Primitivas continuam aceites como fallback** e para peças que o jogador nunca vê de perto, desde que não sejam o estado final visível: o critério é a captura, não o tipo de geometria.
- **Carris em código, não em GLB**: dependem das polylines de `map-layout.json`; extrudir o perfil ao longo de cada polyline no `M01Environment` (ou num módulo `m01-railway.js` novo), com segmentação a cada 2 m, talas a cada 15 m e fusão num `BufferGeometry` por linha.
- **Rodas partilhadas**: a mesma malha de roda serve vagões, tender e desvio; só as motoras da locomotiva são diferentes.
- **Sem skinning**: nada se move em M01 (D4); rodas são estáticas.
- `dispose()` completo de geometrias, materiais, texturas e `InstancedMesh`, como os módulos actuais, verificado no teste de carregar/sair repetido.

---

## 10. Critérios concretos de "production-ready"

Todos verificáveis; nenhum depende de opinião ou de FPS inventado.

**A. Dados e autoridade (bloqueantes)**

1. `src/game/**`, `missions/m01-tczew/mission.json` e `missions/m01-tczew/map-layout.json` **sem alterações** (o manifesto das pontes guarda o hash da layout: `tests/m01-bridges-glb.test.js` continua verde).
2. Visibilidade do trem 963 às 04:45 e do Panzerzug às 04:52 lida só de `renderState`; o estado após restaurar save é idêntico (captura antes/depois do reload com o mesmo snapshot).
3. Nenhum `Math.random()` no render ferroviário; duas execuções com o mesmo snapshot produzem o mesmo `gameDiagnostics()` e capturas com diferença ≤1 % de píxeis.

**B. Geometria e assentamento**

4. Teste Node do kit (`tests/m01-railway-glb.test.js`, molde `tests/m01-bridges-glb.test.js`): GLB válidos, nomes de nós únicos, triângulos ≤ orçamento por LOD, bounds dentro de ±5 % das dimensões do manifesto, posições/normais finitas, ≤3 materiais, texturas ≤2048².
5. Ponto mais baixo das rodas a y=0 ±0,02 m no espaço do modelo; no jogo, topo do carril e contacto das rodas coincidem (±2 cm) em x=1065, x=1400, x=1715 e nos três vagões do desvio, medido por script com `gameDiagnostics` ou pelo viewer do kit.
6. Comprimento da composição 963 = 650 m ±1 % (65 vagões entre tampões), início em x=1065 e fim em x=1715; Panzerzug entre x=1110 e x=1215.
7. Carris contínuos entre o solo e o tabuleiro em x=0 e x≈1049 sem degrau visível na captura a 5 m.

**C. Leitura visual (capturas de produção, 1280×720, presets baixo e médio)**

8. **1 050 m, 04:46**: a frente da locomotiva lê-se como massa escura no fim das pontes, dentro do arco, com coluna de fumo visível e brilho (se D3); **04:53**: o Panzerzug distingue-se pela altura/tom e pelo segundo fumo. Capturas do posto da secção e do posto avançado.
9. **450–500 m, 06:02** (tabuleiro rodoviário, retirada): locomotiva a três quartos com chaminé e domos, linha do topo da composição com dentes (guaritas, vagões abertos), Panzerzug mais alto; sem flicker de LOD em 10 s de câmara parada.
10. **50 m, 20 m, 5 m** no desvio da estação: silhueta, prancheado, rodas com flange, tampões, engate, talas; a 5 m sem tiling visível e com sombra de contacto sob o chassis.
11. **Vagão a arder** às 04:40 (chamas e fumo) e **queimado** às 06:50; o fogo nunca rouba partículas às demolições (contagem de `smokePuffs` da demolição igual com e sem fogo do vagão).
12. Sem buracos de backface, sem z-fighting entre carril/travessa/lastro, sem comboio a flutuar em nenhuma captura.

**D. Orçamento (medido, não prometido)**

13. Draw calls ferroviários ≤12 com tudo visível (hoje 103); triângulos ferroviários ≤60 k no plano a 1 km e ≤40 k a 5 m do desvio, lidos de `gameDiagnostics()`.
14. Texturas ferroviárias ≤3 atlas; bytes por ficheiro no manifesto; total do kit ≤6 MB.
15. Preset baixo: travessas a metade, sem normal map, sem `PointLight`, partículas dentro do tecto de 112.
16. **Sem afirmar FPS**: registar triângulos/draw calls e deixar a medição no Chromebook como pendente explícita (`RUNBOOK.md`).

**E. Processo e evidência**

17. `npm test`, `npm run build`, `npm run test:browser` verdes; a partida contínua `tools/m01-browser-playthrough.mjs` chega ao debrief sem erros de consola novos.
18. `docs/verification/m01-runtime/railway/` com capturas antes/depois e `report.json` por vista; `docs/assets/m01-railway/README.md` com tabela de LODs, triângulos, materiais, bytes e capturas do viewer.
19. `ASSET_CREDITS.md`, `missions/m01-tczew/ASSETS.md`, `assets-m01.json` (estados) e `DEVELOPMENT_STATUS.md` actualizados; licença/autoria por ficheiro; nenhuma classe ou unidade afirmada no ecrã (P6/P16).
20. Fallback testado: com um GLB ferroviário em falta, o jogo arranca, mostra o diagnóstico e usa as caixas actuais.

---

## 11. Decisões pedidas ao Captain

Numeradas para resposta curta; a recomendação do lead está em cada linha. Sem resposta, aplica-se a recomendação.

| ID | Decisão | Recomendação |
| --- | --- | --- |
| D1 | Subir o orçamento LOD0 dos vagões de 2 500 (`assets-m01.json`) para 4 000–6 000 só para os 3 vagões do desvio | **Sim**: são os únicos vistos a 5 m |
| D2 | Adiar LOD0 da locomotiva (20 k) e do Panzerzug (18 k) | **Adiar**: M01 nunca os vê a <450 m; entregar LOD1/LOD2 |
| D3 | Lanternas (três luzes Zg 3) e brilho de fornalha na locomotiva 963 às 04:45 | **Sim, fraco** e marcado `RECONSTRUCTED` no manifesto |
| D4 | Movimento de chegada do trem após o evento | **Não** neste pass: pára já na posição com vapor; evita desfasamento com as posições de fogo da simulação |
| D5 | Pintura/insígnias do Panzerzug | Cinzento-escuro **sem insígnias** até política de símbolos |
| D6 | Clarões de MG no Panzerzug | **Fora deste pass**: exige posição de fogo na simulação (gameplay); abrir ticket separado |
| D7 | Qual vagão arde | **(−352, 0, 8)**, sem nó de cobertura |
| D8 | Entre-eixo de vias no leste | **Manter ±2,5 m** da layout; não tocar em `map-layout.json` |
| D9 | Portas abertas nos vagões do 963 | **Sim**, estáticas por semente |
| D10 | Colisão dos 3 vagões do desvio (hoje `VEHICLE` não é sólido: renderizá-los cria atravessamento visível) | **Pré-requisito**: PR pequeno do dono da engine a acrescentar 3 caixas sólidas em `TczewWorld` com teste de rota; o pass de arte só liga os vagões do desvio depois dessa fusão |

## 12. Referências consultadas no Sketchfab (só referência, nada reutilizado)

Pesquisa feita a 07/10/2026 pela API (resultados são dados de terceiros, licença **não verificada**, escala **não verificada**). Nenhum é de 1939 nem alemão de carga; confirmam que a estratégia ORIGINAL de `assets-m01.json` é a certa.

| Título | Autor | Licença declarada | Uso |
| --- | --- | --- | --- |
| Artilleriewagen / Kommandowagen / Infanteriewagen s.Sp. | AlexandrKovbasa1 | CC-BY | **Rejeitado**: material de 1944; só referência de linguagem de blindagem (juntas, parafusos, seteiras) |
| DRB 01.10 Steam Locomotive (low poly) | vonBerlichingen | CC-BY | **Rejeitado**: expresso carenado; referência de proporção de domos/cabina apenas |
| DR Cattle Train | Sjdjdjdmx | CC-BY | A verificar conteúdo; possível referência de vagão coberto de dois eixos |
| Railway Boxcar Freight Wagon | saadthedesigner314 | CC-BY | Provável vagão americano; referência de topologia low-poly |
| Soviet armoured train (vários) | nadiralishly | CC-BY | **Rejeitado**: 300–580 k faces, soviético |
