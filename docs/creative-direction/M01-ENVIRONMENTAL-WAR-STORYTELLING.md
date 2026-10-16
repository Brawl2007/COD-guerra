# M01 — ENVIRONMENTAL WAR STORYTELLING · O ambiente como personagem, hora a hora

**Estado:** ROTEIRO AMBIENTAL (proposta de direção). Descreve tudo o que acontece à volta do jogador nos cinco setores, por fase, com o que **já existe** (agendas de setor em `mission.json`, props em `m01-environment-props.js` (30 clusters), vagões do pátio (3, um a arder), 195 árvores/716 arbustos (Vegetation V1), Station V2, decals V1, fumo/poeira persistentes, trem 963 + locomotiva + Panzerzug, Ju 87 V2) e o que se **propõe** ([A]/[B]/[C]). Regra: **a destruição é gradual e persistente**; nada começa destruído; nada desaparece depois de destruído.

## 0. Princípios do ambiente

1. **Antes da guerra, era um lugar.** Cada zona tem vestígios de uso civil e militar de *antes* das 04:34: ferrovia (lanternas, horários, sinais, carvão), caserna (sacos, fogareiro, caixas, correame), engenharia (ferramentas, bobinas de cabo, marcas de giz nos pilares).
2. **Cada detrito tem origem.** Um saco desfeito vem de um saco inteiro que estava ali; uma cratera tem o raio da bomba que a fez (decals V1 já diferenciam granada/bomba/demolição); a poeira vem da ponte, não "do ar".
3. **O tempo passa visivelmente.** Luz (C01), fumo acumulado, sombras que rodam, poeira que assenta.
4. **Nada depende do olhar.** As agendas de setor correm sem o jogador (Prompt §71); a representação só mostra o estado.
5. **O fim mostra o que aconteceu.** Às 07:05 o jogador deve conseguir reconstruir a batalha olhando à volta.

## 1. S1 — Cabeça de ponte oeste e aterro

### 1.1 Estado inicial (04:30)
- **Hora/luz:** crepúsculo civil; Sol −3,7° a 70°; faixa clara a ENE; a margem oeste em sombra. Visibilidade: silhuetas a 200 m, formas a 1 km (as torres, os portões fechados como linha escura).
- **Céu/clima:** limpo a pouco nublado; névoa fina sobre o canal (x 25–265), ≤ 2 m de altura, a dissipar até 05:00 [B: densidade de névoa por hora]. Sem vento forte (deriva lenta de fumo).
- **Situação das tropas:** a secção no posto (−70, −3, 22): fogareiro, bule, dois capacetes no chão, o mapa; o posto avançado (18, 0, 3) com sacos de areia sob o portal ferroviário e Nowicki só; a guarnição da ckm na casamata (24, −3, 43), invisível, com um fio de luz na seteira [B]; dois sapadores em ronda na encosta sul (x −40…−120, z 8–12), com bobinas de cabo cobertas por lona [B] e marcas de giz nos pilares/encontro [B]; um guarda no portal rodoviário.
- **Sons:** vento, água sob ferro, o apito de manobra da estação (04:30–04:33), uma locomotiva de manobra ao longe, passos no cascalho, metal da rkm a ser limpa, o bule.
- **Atmosfera emocional:** rotina com pressentimento. Café "de verdade" (005).
- **Props existentes:** `coffee_stove`, `folded_map`, clusters `bridge_mid_01/02/03`, `bridge_road_01/02`, `bridge_rail_01/02` (madeira de manutenção, caixas, barris, pedras), `cv_*` (sacos, trincheira).
- **Props propostos [A/B]:** lona sobre bobinas (encosta sul), caixas de munição polacas com estêncil genérico (sem unidade), uma pá espetada, um cantil pendurado no portal, o capacete de Jan no chão ao lado do posto (ViewModel põe-no depois), giz nos pilares (decal).

### 1.2 Atividade militar (04:30–04:33)
- Troca de turno no portal rodoviário (`generic_rifleman` ou extra: anda 20 m, para, olha a leste) [B].
- Sapadores: tocam, apontam, anotam; **nunca** um procedimento (Prompt §79).
- Kowal limpa a rkm (`rkm_clean`, já). Dudek escreve. Pawlak ata a bota. Zieliński dobra o mapa.
- Comunicação: só voz; nenhum rádio (a secção não tem).

### 1.3 Início da tensão (04:33:10–04:34)
- Motores a ENE; aproximação pelo sul; três silhuetas (Ju 87 V2).
- **Todos param** (targets nulos [B]); o apito de manobra cala-se [B]; Lipski apaga a lanterna [B]; Nowicki corre pela encosta com a caneca (já).
- Som: só vento + motores a crescer 40 s.

### 1.4 Combate (04:34–06:10)
| Hora | O que muda no ambiente de S1 | Estado |
| --- | --- | --- |
| 04:34:02 | Bomba 1: posto avançado destruído (sacos desabados, cratera no encontro) **ou** coluna de água e lama 40 m a norte (`forward_post_state`); `cv_forward_post` deixa de existir se destruído | já |
| 04:34:05 | Bomba 2: cratera em `repair_site_1` (`cv_crater_1` surge), terra sobre a trincheira, a caneca no chão; poeira 30 s | já + decals V1 |
| 04:34:08 | Bomba 3 (S3) vista como clarão a oeste e fumo que sobe o resto da missão | já |
| 04:36 | Sacos desfeitos (decals terra), um capacete caído, a bobina de cabo rebentada [B], marcas de estilhaços nas treliças (decals em `metal`) | parcial |
| 04:45 | A 1 km: fumo da locomotiva; clarões nos portões; traçantes; impactos na encosta sul (poeira) e nos sacos (terra) | já |
| 04:51 | Nascer do Sol: a água ganha reflexo; as sombras do portal estendem-se para oeste | já (keyframes) |
| 04:52 | Panzerzug atrás dos vagões; MGs esporádicas sobre o aterro: impactos no ferro do portal (faíscas, `metal`) | já |
| 05:04–05:15 | Reparo pronto: os sapadores **recolhem** a lona e as ferramentas [B]; a encosta fica com marcas de joelhos e a terra remexida (decal `earth` [A]) | proposta |
| 05:30–05:34 | Raid alto: fumo novo a sudoeste (cidade); nada cai em S1 | já (`raid_0530`) |
| 05:30–06:00 | Salvas de ajuste: cada cobertura ocupada ganha impactos (decals V1); os sacos "comem-se" de dentro para fora [B: variante de saco danificado] | parcial |
| 06:00–06:10 | O tabuleiro: 18 homens a correr pela treliça norte; impactos no ferro; Bąk cai (sangue na madeira do tabuleiro: decal `wood` [A], intensidade configurável) | parcial |
| 06:10 | A 700 m: coluna, vãos de 1912 ausentes, fumo persistente (`east_demolition`, já) | já |

### 1.5 Momentos humanos (S1)
- 04:36 o lugar vazio na contagem; 04:40 Krawiec de costas para o rio; 04:48 Kowal a passar carregadores pela mão; 05:12 Lenc a olhar para o rio e Krawiec a mandá-lo virar; 05:40 Pawlak a beber; 06:04 Bąk; 06:10:02 ninguém fala; 06:12 Rusek; 06:30 a guarnição com a arma; 06:38 a mão de Zieliński na cabeça de Jan.

### 1.6 Consequências (06:10–06:45)
- A guarnição abandona a casamata: a seteira fica aberta, a água do refrigerador entornada no degrau (decal [B]), uma caixa de fita vazia [B].
- 06:20: fogo esporádico do dique: novos impactos nos sacos do portal; ninguém os repara.
- 06:36–06:45: a cabeça de ponte **esvazia-se** (todos a x < −90): sacos sem ninguém, o fogareiro apagado [B], o posto da secção abandonado com o bule no chão.
- **06:45:** o portal oeste, as casamatas, o encontro e o 1.º pilar caem (já, GLB `_collapsed`, LOD0–2); poeira a deslizar para norte sobre a água durante minutos (fumo persistente, já); terra e lascas no posto de disparo (chips V1); encontros danificados com fuligem (decals V1).

### 1.7 Transição (06:46–07:05)
- O que permanece visível à saída para o abrigo: 141 m de água sem ponte; as torres do 1.º pilar (ficam de pé ou caem conforme P13/P11: decisão já tomada pelos assets); a locomotiva a 1 km ainda a fumegar; o pátio a arder a oeste.
- O que mudou: a cabeça de ponte já não é um lugar; é uma margem.

## 2. S2 — Cabeça de ponte leste (Lisewo), 780–1250 m

### 2.1 Estado inicial (04:30)
- Os portões fechados do portal de 1912 (x≈1052) como linha escura; o dique (x≈1075) atrás das treliças; nenhuma luz de trem (agenda `quiet`); o céu a clarear por cima deles.
- Som: nada (1 km de água e planície).

### 2.2 Atividade e tensão (04:45–04:52)
- **04:45:** o trem 963 para diante dos portões: 65 vagões (LOD2 instanciado) e a locomotiva com fumo (`planLocomotiveIdleTick`); pioneiros descem (silhuetas: proxies `de_east_*` ativam); fogo do pelotão leste (clarões polacos [B]: hoje só os alemães têm clarões visíveis; propor clarões do pelotão leste a partir de proxies `pl_east_*` quando ativos — **cuidado:** `pl_east_*` só ativam às 06:00; propor emissores de apresentação de "fogo amigo distante" ligados ao estado `firefight` de S2, sem atores) ; MG34 nos portões e no dique.
- **04:52:** o Panzerzug na via paralela (Panzerzug V5): silhueta blindada, seteiras escuras, sem canhão (P6).
- Fumo: a locomotiva (contínuo), poeira das rajadas no dique, fumo da ckm polaca do lado leste (`ae_s2_ckm_east`, emissor de áudio até às 06:00).

### 2.3 Combate (04:46–06:10)
| Hora | Estado S2 | Ambiente |
| --- | --- | --- |
| 04:46 | `firefight` | clarões em duas linhas (portões, dique); traçantes para oeste e para a cabeça de ponte leste |
| 04:52 | `panzerzug_support` | rajadas do trem; fumo mais denso |
| 05:40 | `pressure` | [C] micro-movimentos do pelotão leste em lances a 1 km; a "metralhadora perdida" (037) = um clarão polaco que se apaga |
| 06:00 | `polish_withdrawal` | 18 figuras pela treliça norte |
| 06:05 | `germans_on_spans` | 10 figuras pela metade sul até x = 690 |
| 06:10 | `east_blown` | coluna, vãos ausentes, 4 no chão, 6 em retirada com feridos (RETREAT; [C] pares) |
| 06:20 | `german_regroup` | fogo esporádico do dique |
| 06:45 | `smoke_and_sporadic_fire` | fumo baixo sobre a planície, iluminado pelo Sol a 96° |

### 2.4 Momentos humanos (a 700–1200 m)
- Os que recuam a carregar outros (06:10+); os que ficam; a cadência que hesita quando suprimida. Nenhum close. É a distância que é humana: o jogador não vê rostos, vê gestos.

### 2.5 Consequências e transição
- Os vãos de 1912 e o antigo portal de Lisewo ausentes para sempre; o trem 963 nunca se move (facto: o plano falhou); a locomotiva continua a fumegar às 07:05 (facto plausível: fogo aceso); o Panzerzug recua? (não documentado: **fica**).

## 3. S3 — Estação de Tczew e pátio, 250–460 m

### 3.1 Estado inicial (04:30) · `night_shift`
- Station V2 (cinco volumes, marquise, 140 aberturas; V3 em revisão): luz fraca em 2–3 janelas do pavilhão central [B: emissivo por hora]; o quadro de horários na fachada norte com giz "04:12 Malbork — opóźn." [B]; lanternas de serviço; o barracão (−270…−250, 14…26) com a caixa de faixa branca; três vagões no pátio (`yard_wagon_1..3`), um deles será o que arde.
- Props existentes: clusters `station_south_01..08`, `station_north_01/02` (madeira, barris, caixas, pedras), `rail_approach_01..08` (travessas, ferramentas), `freight_wagons_west`.
- Props propostos [B]: marmita e garrafa de chá num banco (o turno da noite), um carrinho de bagagem vazio, um sinal de manobra com lanterna, fio telegráfico ao longo da linha (a "linha que caiu" para Szymankowo: um isolador partido num poste [B]).
- Som: locomotiva de manobra ao longe, apito (até 04:33), passos, o ferro a arrefecer.
- Pessoas: Lipski com lanterna (ronda x −100…−20 às 04:31, já); 3 extras ferroviários [C].

### 3.2 Bombardeio (04:34) · `bombed`
- Bomba 3 no pátio: o vagão 3 (coberto) arde (`station_wagon_fire`: chamas, fumo contínuo, geometria queimada do kit `m01-wagon-damage`, já ligada); vidros partidos (decals fuligem V1; [B] vidro no chão); poeira de alvenaria clara junto da fachada (decals V1 "bomba dentro da estação" já previsto).
- O ferido do pátio (−300, −3, 30): capacete a 2 m, uma bota [B].

### 3.3 Socorro (04:35:30–05:30) · `wounded_evacuation` → `aid_post`
- Dudek chega à cabeça do ferido, arrasta-o 50 m de costas (0,65 m/s) até (−334, 26,2); fases grab/drag/release (já, com clips); rastro no cascalho (decal [B]).
- **Posto de socorro improvisado** (04:50) junto à estação: [B] duas padiolas, cobertores, uma mesa, um lampião; [C] 2 extras (socorrista e ferido ligeiro sentado). Até [C], o posto é props.
- Lipski: "Szymankowo continua sem responder." (171) se o jogador passar.

### 3.4 Raid alto (05:30–05:34) · `second_raid`
- Explosões abafadas a sudoeste (cidade); fumo novo por cima dos telhados; ninguém no pátio corre (o raid é longe).

### 3.5 Carroças (05:40) · `carts_evacuating`
- [C] uma carroça de mão com um ferido, empurrada por um extra, da estação para oeste (saída do mapa em x < −460); Lipski a abrir caminho (172). Até [C]: agenda de estado sem representação (já) + som de rodas no cascalho [B].

### 3.6 Poeira (06:45) · `dust_fall`
- A poeira da demolição oeste não chega a 300 m sem vento; o que chega é o **som** e o silêncio. A estação fica com o vagão a arder e o posto de socorro.

### 3.7 Momentos humanos e transição
- O ferido arrastado; Lipski a trabalhar sob bombas; as carroças; Dudek a voltar ao posto. Às 07:05 a estação é o único lugar com gente a mexer-se (o socorro continua): a guerra não acabou com a ponte.

## 4. S4 — Perímetro norte, 800–1500 m

- **04:30–05:15:** nada. O silêncio a norte é parte da composição sonora.
- **05:15:** fogo esporádico (som grave, sem clarões visíveis de dia).
- **05:50:** contacto: clarões de morteiro a −Z (noite ainda? não: Sol +7°; clarões pouco visíveis; usar fumo baixo [B]).
- **06:25:** pausa.
- **07:00:** ataque de Koźliny: canhão AT (som seco, grave) e MGs; ouvido de dentro do abrigo com atraso de 4 s.
- **Ambiente proposto [B]:** uma coluna de fumo fina a norte a partir das 06:00 (um veículo a arder às 07:00 seria facto-compatível: T08 "um veículo destruído por canhão AT" — propor fumo preto a NNW a partir de 07:02 [B], sem veículo visível).

## 5. S5 — Céu a leste e linha para Szymankowo, 0,8–40 km

- **04:30:** céu a clarear a ENE; nenhuma luz de trem na linha de Szymankowo (a linha que não responde).
- **04:33:10:** três pontos a ENE que viram para sul; motores.
- **04:34–04:36:** mergulhos sobre o aterro; saída para leste.
- **04:40:** segunda passagem distante (fumo novo a oeste [A]).
- **04:45:** fumo da locomotiva do trem 963 a leste (a única "luz" na linha).
- **05:30–05:34:** raid de altitude: zumbido alto, sem silhuetas detalhadas (pontos a 3–4 km de altura [B], opcionais), fumo na cidade.
- **05:34+:** fumo do trem.
- **Nunca:** aviões sobre o jogador depois das 04:36; AA polaca (a secção não a tem).

## 6. Detritos com origem identificável (catálogo)

| Detrito | Origem | Onde | Estado |
| --- | --- | --- | --- |
| Sacos de areia desfeitos | bomba 1 / salvas de ajuste | posto avançado, sacos do portal | decals V1 (terra); variante de saco [B] |
| Cratera com terra remexida | bomba 2 | `repair_site_1` | `cv_crater_1` + decals V1 |
| Vagão queimado | bomba 3 | pátio (−352, 8) | kit `wagon-damage` ligado |
| Vidro e alvenaria | bomba 3 | fachada norte da estação | decals V1 (fuligem, poeira clara); vidro [B] |
| Caneca amassada | Nowicki | (−36, −3, 11) → Krawiec | prop (já) |
| Capacete e bota | ferido do pátio | (−300, 30) | [B] |
| Rastro no cascalho | arrasto | (−300,30)→(−334,26) | decal [B] |
| Bobina de cabo rebentada | bomba 2 | encosta sul | [B] |
| Terra de joelhos e lona recolhida | reparo | `repair_site_2` | decal [A] / prop [B] |
| Lascas de ferro, faíscas | MG no portal | portais | FX + decals V1 (`metal`) |
| Sangue na madeira | Bąk | `bak_wound_point` | decal [A], configurável |
| Água entornada, caixa de fita | guarnição | seteira | [B] |
| Vãos ausentes, detritos no rio | demolições | x≈794–808; x≈0–141 | GLB `_collapsed` + decals V1 |
| Terra e madeira no posto de disparo | demolição oeste | (−290, 22) | chips/debris V1 |
| Fumo acumulado | tudo | céu | pools V1 (limites por qualidade) |

## 7. O que o jogador vê às 07:05 (prova de que o ambiente contou a história)

Da boca do abrigo (−260, −4, 70), olhando a leste: água onde havia ponte; as torres do 1.º pilar; fumo a 1 km; o pátio a arder à esquerda; poeira ainda no ar. Olhando a norte: uma coluna fina de fumo (07:02 [B]). Nenhum HUD. Se o jogador consegue dizer "foi assim" sem ler nada, o ambiente fez o seu trabalho.

## 8. Dependências e limites

- Props novos entram em `m01-environment-props.js` (clusters por área, keep-outs de rotas, sem colliders) ou em `m01-decoration-layout.js` (árvores sólidas: não mexer).
- Decals novos usam o atlas V1 (16 células) ou um atlas adicional [B].
- Nada do que se propõe altera `TczewWorld` (colisão), `mission.json`, relógios ou RNG.
- Todas as capturas de prova devem usar os fixtures de câmara já existentes (`tools/verification/*fixtures*`) com estado congelado e hash igual (método das entregas V2/V5).
