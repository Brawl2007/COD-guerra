# M03 — CIDADE CERCADA · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** 25/9/1939, Varsóvia; defesa da cidade; POV Piotr Sokół após fuga ficcional de Bzura e incorporação à guarnição; fonte H04; duração-alvo 22–28 min; três falas; checkpoints "abrigo; comunicação; rota alternativa; retirada"; regra de Lis (ausente/incapacitado → fala removida ou atribuída a morador/companheiro presente; não reaparece curado). **Proposto:** quarteirão do setor oeste (Wola/Ochota, `RECONSTRUCTED`, P-C03), elenco, relógio ancorado na "Segunda-feira Negra" (S-C10), objetivos, eventos, set pieces, falas, flags.

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m03_warszawa` / 3 |
| Datas | 1939-09-25T07:40+01:00 → 1939-09-25T19:30+01:00 |
| Local | um quarteirão do setor oeste (prédio de quatro pisos com porão; cruzamento com barricada; pátio interior; posto médico numa escola) — `RECONSTRUCTED`; nenhuma rua afirmada como exata |
| Operação | cerco de Varsóvia; bombardeamento massivo de 25/9 desde as 08:00 (~370–400 aviões), redes de água destruídas; negociações 26/9; capitulação 28/9 (D, S-C10) |
| Unidade | defesa de Varsóvia (canónico) → companhia improvisada de sobreviventes do Exército Poznań + guarnição (F plausível) |
| Elenco | Piotr (POV), Lis (conforme `m02.lis_status`), kpr. Feliks Nowak (defensor), Helena Zaremba, Krysia (7), Stary Mazur (moradores), san. Szymczak (se se quiser continuidade; senão socorrista da guarnição Jadwiga? **não**: usar socorrista militar **Bronisław Kita**) |
| Fora de cena | gen. Czuma, gen. Rómmel, Stefan Starzyński |
| Intocável | data, local, POV, as falas `dlg_m03_001–003`, checkpoints, objetivo opcional (munição **ou** civil ferido), resultado (capitulação posterior; matar mais não reescreve), Lis conforme M02 |

---

## 1. Story Bible

**Logline.** Cinco dias depois de atravessar a floresta com Lis numa carroça, Piotr acorda num porão de Varsóvia com uma família que guarda a chave de um apartamento que já não existe. Às oito da manhã o céu enche-se de aviões. A tarefa não é tomar a rua: é tirar os seus dela — e deixar a porta do porão aberta para quem vive lá.

**As oito respostas.**
1. **Situação central:** um quarteirão com gente dentro; a rota segura muda a cada bombardeamento.
2. **Modo de contar:** baldes de água no porão (3 → 2 → 1; o jogador vê o nível).
3. **Objeto:** a chave da família Zaremba (Krysia deixa-a no banco no fim).
4. **Silêncio:** o porão entre duas vagas de bombardeamento.
5. **Tarefa que não é matar:** transportar água/munição; libertar uma saída soterrada; auxiliar um civil adulto ferido (opcional).
6. **Custo humano:** soldados querem ocupar o porão para munição (causa: o depósito da rua foi atingido) → reação 1: Nowak manda separar o corredor de passagem; reação 2: Stary Mazur recusa sair do seu apartamento no 3.º → consequência: o porão fica mais cheio e com menos água; `m03.cellar_corridor_kept`.
7. **Pessoas históricas:** fora de cena.
8. **Debrief:** regista a Segunda-feira Negra, a falta de água, as negociações de 26/9 e a capitulação de 28/9; "matar mais inimigos não reescreve a queda da cidade" (§79).

**Três motivos.** (a) *A verticalidade* — a cidade é escadas, janelas, pátios; a rua é o lugar mais perigoso. (b) *A chave* — as pessoas guardam o que já não abre nada. (c) *A água* — o que se conta não são tiros, são baldes.

**Temas.** Civis sob cerco; obediência (Nowak) contra necessidade (munição); compaixão (lugar para a maca); exaustão; a ordem de recuar que é alívio e vergonha.

**Estrutura (§54).** CONTEXTO (cartela: data, Lis) → INTRO (porão, vidros a tremer, pouca água) → APROXIMAÇÃO (mensagem por um quarteirão) → DIÁLOGO (Helena: "Ainda há gente no andar de cima.") → PRIMEIRO CONTATO (cruzamento, janelas) → ESCALADA (bombardeamento corta a rua) → COMBATE PRINCIPAL (interior danificado; libertar saída; defesa por pátios) → SET-PIECE (o quadro que cai; a família) → PAUSA (porão, água) → CLÍMAX (passagem ao posto médico; flanco) → CONSEQUÊNCIA (um morador abre lugar à maca; a chave no banco) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Piotr | já não dobra o mapa; quer "manter o cruzamento" | a família do porão | a rua cortada; o porão disputado | protege a saída do porão em vez do cruzamento | recua à ordem; vê a chave |
| Lis (se presente) | ferido/andante ou ausente | Piotr; Krysia (dá-lhe água) | — | "Guarda um pouco de água. Todos precisam." (003) ou a fala passa a Nowak | estado de M02 mantido |
| Nowak | ordens de guarnição | o corredor do porão | o depósito atingido | separa o corredor; não ocupa o porão | vivo |
| Helena / Krysia | guardam a chave | Piotr; Lis | o 3.º andar atingido | Krysia deixa a chave no banco | vivas |
| Stary Mazur | recusa sair | ninguém | — | não muda | vivo no 3.º (ou desce se `m03.mazur_descended`) |
| Kita (socorrista) | triagem na escola | — | — | — | vivo |

**O que a missão recusa.** "Sequência de salas com inimigos" (PR #44); escolta interminável de civis; capitulação em 25/9; atrocidade atribuída a unidade histórica; contagem em voz alta (M01); civis como obstáculos.

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "O porão" (`cs_m03_intro`, ≤ 80 s)
2 07:40 · 3 porão do prédio (abóbada de tijolo, uma janela de cave ao nível da rua) · 4 luz estreita e poeirenta; uma vela · 5 Piotr, Lis (variante), Helena, Krysia, Mazur à porta, Nowak a descer · 6 Cartela: VARSÓVIA — 25 DE SETEMBRO DE 1939 — 07:40 · DEFESA DA CIDADE; segunda cartela com o estado de Lis (`lineVariants`): "Andrzej Lis, ferido no Bzura, chegou com Piotr pela floresta" / "…ferido, ficou no posto de socorro" / "Andrzej Lis não chegou a Varsóvia". Vidros a tremer, teto a soltar poeira, três baldes com pouca água. Nowak dá a tarefa: levar mensagem ao posto do cruzamento (ligação interrompida). · 7 situar data, Lis, civis, água · 8 olhar livre; levantar-se; ver os baldes · 9 — · 10 — · 11 — · 12 colchões, uma mala, a chave na mão de Helena · 13 `dlg_m03_010` (Nowak), `001` (Helena, canónica), `011` (Krysia), `003` (Lis, se presente; senão Nowak diz `003b`) · 14 vidro a vibrar; respiração; um avião alto · 15 beat t 10: Krysia olha para Piotr (2 s) · 16 `missionStart` · 17 Nowak sobe · 18 `cp_m03_a_abrigo`; `m03.water_level = 3` · 19 skip → porão com todos; mensagem no inventário · 20 variantes por `m02.lis_status`.

### Cena 2 — "Mensagem por um quarteirão" (jogável; `obj_m03_message`)
2 07:45–08:10 · 3 escadas → pátio → passagem entre prédios → cruzamento com barricada · 4 manhã clara; fumo a leste · 5 Piotr; Nowak até ao pátio; moradores nas escadas (um sobe com água, outro desce com uma criança); defensores no cruzamento · 6 Atravessar o quarteirão por três sinais reais (fachada com relógio parado, sino de uma igreja, acesso pelo pátio) sem seta; chegar ao posto e recompor a ligação (telefone de campanha) · 7 ensinar o labirinto vertical antes de o destruir · 8 navega; sobe/desce; entrega a mensagem (interação) · 9 pelo pátio (seguro, longo) ou pela rua (curto, atirador alemão a 200 m) · 10 defensores já combatem em portas e janelas; um morador pede passagem · 11 atirador na rua; artilharia ligeira · 12 barricada de elétricos tombados e paralelepípedos; sacos de areia nas janelas · 13 `dlg_m03_012–015` · 14 passos em escada; sino; tiros espaçados · 15 livre · 16 Nowak sobe · 17 mensagem entregue (`evt_m03_link_restored`) · 18 `cp_m03_b_comunicacao` · 19 [C] interiores verticais (escadas/janelas/oclusão) · 20 —

### Cena 3 — "O cruzamento" (jogável; `obj_m03_hold_crossing`)
2 08:10–08:40 · 3 cruzamento; janelas dos 1.º/2.º pisos · 4 sol de manhã na rua · 5 Piotr; Nowak; 6 defensores; moradores a procurar rota · 6 Defender o cruzamento junto de quem já combate; moradores atravessam pela rota segura (porta do pátio) · 7 o cruzamento é a tarefa "militar" que a cidade vai tornar secundária · 8 escolhe janela/barricada; dispara a alemães que avançam por portas e fachadas (10–80 m); abre a porta do pátio aos moradores (interação) · 9 janela alta (visão, exposição) vs barricada · 10 Nowak coordena; defensores rodam · 11 infantaria alemã por fachadas; MG ao fundo da rua · 12 cartuchos no soalho; cortinas; um piano · 13 `dlg_m03_016–019`, `002` (Nowak, canónica: "Não é para tomar a rua. É para tirar os nossos dela.") · 14 tiros em interior (reverberação); vidro · 15 livre · 16 ligação restabelecida · 17 **08:40** sirene + aviões (`evt_m03_raid_1`) · 18 — · 19 [A] fogo como dados; [C] janelas reais · 20 —

### Cena 4 — "A rua corta-se" (`cs_m03_raid`, ≤ 25 s; jogável depois)
2 08:40–09:10 · 3 cruzamento → interior do prédio da esquina (danificado) · 4 poeira de gesso; luz em feixes · 5 todos · 6 O jogador **vê** primeiro o vidro a tremer, depois a rua obstruída (fachada desaba; bombas ≥ 30 m). O acesso principal fica cortado. Nowak: pelo pátio. · 7 a rota segura muda · 8 cobre-se; atravessa o interior danificado (mobília, escada partida); ajuda a libertar uma saída (interação abstrata: afastar vigas com dois homens, 25 s) · 9 — · 10 Nowak e dois defensores; um morador preso atrás da viga · 11 nenhum ativo (bombardeamento) · 12 fachada no chão; pó branco; um quadro cai da parede (set piece) · 13 `dlg_m03_020–023` · 14 sirene; bombas por bairros com atraso; silêncio de pó · 15 primeira pessoa; beat: o quadro cai (1,5 s) · 16 `evt_m03_raid_1` · 17 saída libertada (`evt_m03_exit_cleared`) · 18 `cp_m03_c_rota_alternativa` · 19 [A] `safeImpact`; [B] interação de libertar (padrão de reparo de M01: dois atores + tempo) · 20 —

### Cena 5 — "Munição ou o ferido" (jogável; `obj_m03_optional`)
2 09:10–09:50 · 3 pátios ligados; a escola (posto médico) a 120 m · 4 fumo; sol entre prédios · 5 Piotr; Lis (se andante, segue devagar); Kita; um civil adulto ferido (Mazur? **não** — o Sr. Wójcik do prédio ao lado) · 6 Objetivo opcional canónico: transportar munição extra do depósito secundário **ou** auxiliar o civil ferido até à escola. Recursos e falas mudam; o resultado histórico, não. · 7 a escolha de recursos de §79 · 8 escolhe; carrega caixa (velocidade reduzida) ou carrega/escolta o ferido (`carriedBy`) · 9 munição vs civil · 10 Kita recebe o ferido; Nowak aceita a munição · 11 atirador no telhado (dados) · 12 escola com macas; depósito com caixas · 13 `dlg_m03_024–027` · 14 — · 15 livre · 16 saída libertada · 17 entrega · 18 `m03.ammo_carried` / `m03.civilian_wounded_helped` | 19 [A] carriedBy; [A] interação | 20 —

### Cena 6 — "O porão disputado" (`cs_m03_cellar`, ≤ 40 s; jogável depois)
2 09:50–10:20 · 3 porão · 4 vela; poeira · 5 Piotr; Nowak; dois soldados com caixas; Helena, Krysia; mais cinco moradores (do prédio atingido); Mazur não desceu · 6 O depósito da rua foi atingido; os soldados querem o porão para munição. Nowak vê as pessoas sob a escada e manda separar o corredor de passagem ("Se querem esta entrada, abram outra para eles." — PR #44, atribuída a Nowak). A água: dois baldes. · 7 o momento de custo humano · 8 pode subir ao 3.º para insistir com Mazur (opcional: `m03.mazur_descended`) · 9 — · 10 soldados obedecem; Helena dá água a Krysia; Lis (se presente) guarda a sua · 11 — · 12 porão mais cheio; caixas junto à escada; a chave na mão de Helena · 13 `dlg_m03_028–031` · 14 **silêncio obrigatório** (vela, respiração, um avião alto) · 15 beat: Nowak olha para a escada (2 s) · 16 entrega · 17 `dlg_m03_031` · 18 `m03.cellar_corridor_kept = true`; `m03.water_level = 2` · 19 cena encenada (sem opção de "expulsar civis") · 20 —

### Cena 7 — "Segunda vaga; a escola" (jogável; clímax)
2 10:20–11:10 · 3 pátios → rua lateral → escola · 4 fumo denso; luz laranja · 5 Piotr; Nowak; defensores; Kita; macas · 6 Segunda vaga de bombardeamento (agenda independente); a passagem para o posto médico fica sob fogo de uma MG na rua lateral; outro grupo cobre o flanco; proteger a passagem enquanto macas atravessam · 7 clímax canónico · 8 suprime a MG (janela do 1.º); cobre macas por lances; rotação por salvas · 9 onde cobrir · 10 outro grupo mantém o flanco (independente); Kita conta macas · 11 MG; infantaria por fachadas · 12 escola com vidros partidos; macas no corredor · 13 `dlg_m03_032–036` · 14 bombas por bairros; MG; macas · 15 livre · 16 `dlg_m03_031` · 17 última maca passa + ordem de recuar (`evt_m03_withdraw_order`) · 18 `m03.stretchers_passed` · 19 [A] · 20 —

### Cena 8 — "Recuar ao abrigo" (`cs_m03_outro`, ≤ 60 s) + debrief
2 11:10–11:40 (elipse até à noite no debrief) · 3 porão · 4 vela; menos poeira · 5 todos; Lis conforme flag · 6 Recebida a ordem, recuar ao abrigo. Um morador abre lugar no chão para uma maca. O porão tem mais gente e um balde. Krysia deixa a chave sobre o banco; Piotr reconhece-a sem saber de quem era (se Helena não lha mostrou na cena 1 — ela mostrou; o reconhecimento é silencioso). Cartela: 26/9 negociações; 28/9 capitulação. · 7 consequência · 8 skip · 9 — · 10 — · 11 — · 12 o mesmo enquadramento do porão, agora sem espaço · 13 `dlg_m03_037` (morador), `038` (Lis se presente / Nowak) · 14 respiração; a cidade a arder ao longe; sem música até à cartela · 15 beat: a chave no banco (3 s) · 16 ordem · 17 debrief · 18 `m03.completed` · 19 skip aplica estado · 20 transição para M04: uma mão fecha a porta do porão.

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m03_message` | Leve a mensagem ao posto do cruzamento | sim | intro | interação no posto | — | `evt_m03_link_restored` | B |
| `obj_m03_hold_crossing` | Defenda o cruzamento até à vaga | sim | link | `evt_m03_raid_1` (08:40) | — | — | — |
| `obj_m03_open_courtyard_door` | Abra a porta do pátio aos moradores | opcional | hold | interação | — | `m03.residents_passed` | — |
| `obj_m03_cross_interior` | Atravesse o interior danificado | sim | raid_1 | zona `exit_block` | — | — | — |
| `obj_m03_clear_exit` | Ajude a libertar a saída | sim | exit_block | 25 s com dois atores | — | `evt_m03_exit_cleared` | C |
| `obj_m03_optional` | Munição extra **ou** o civil ferido | opcional (escolha) | exit_cleared | entrega | — | flags | — |
| `obj_m03_cellar` | (cena) | sim | entrega / timeout 3 min | `dlg_m03_031` | — | `cellar_corridor_kept`, `water_level` | — |
| `obj_m03_protect_medical_passage` | Proteja a passagem para o posto médico | sim | cellar | última maca | — | `stretchers_passed` | — |
| `obj_m03_withdraw` | Recue ao abrigo | sim | `evt_m03_withdraw_order` | porão | — | `m03.completed` | D |

### 3.2 Setores

| Setor | Camada | Agenda |
| --- | --- | --- |
| `s1_block` | perto | 07:40 porão → 08:10 cruzamento → 08:40 vaga 1 → 09:10 pátios → 09:50 porão → 10:20 vaga 2 → 11:10 recuo |
| `s2_adjacent_streets` | médio | defesas vizinhas; incêndios; evacuação de moradores por outra rua |
| `s3_city_raids` | longe | bombardeamentos por bairros **agendados independentemente** (08:00, 08:40, 10:20, 12:30…), fumo acumulado; sem relação com a posição do jogador (§79) |
| `s4_west_front` | longe | artilharia alemã; sondas |

### 3.3 Checkpoints
A abrigo (`missionStart`+cartela; água 3) · B comunicação (`link_restored`; cruzamento ativo) · C rota alternativa (`exit_cleared`; rua cortada persistente; `residents_passed`) · D retirada (`withdraw_order`; flags opcionais; porão cheio).

### 3.4 Justiça
Bombas ≥ 30 m e sempre precedidas de sirene/vidro; nenhum inimigo vê através de paredes; a MG da rua lateral tem clarão na janela; escolta de macas com tolerância (mínimo 3 de 4 passam se o jogador suprimir).

---

## 4. Set pieces

### SP-03-1 "Três sinais"
**Contexto:** a mensagem pelo quarteirão. **Preparação:** Nowak nomeia os sinais no porão (relógio parado, sino, pátio). **Experiência:** navegar vertical sem seta. **Companheiros:** moradores nas escadas (um pede passagem, outro recusa). **Ambiente:** relógio, sino, barricada. **Evolução:** rua (atirador) vs pátio. **Clímax:** a ligação no posto. **Consequências:** CP-B. **Requisitos:** [C] interiores. **Integração:** `obj_m03_message`.

### SP-03-2 "O quadro cai"
**Contexto:** 08:40, vaga 1. **Preparação:** o cruzamento defendido. **Experiência:** vidro → fachada → pó; a saída soterrada. **Companheiros:** Nowak e dois homens afastam vigas com o jogador. **Ambiente:** o quadro da família cai da parede do apartamento vazio; combate continua pela janela. **Evolução:** 25 s de trabalho sob o som da vaga. **Clímax:** a saída abre. **Consequências:** CP-C; rua cortada persistente. **Requisitos:** [A] safeImpact; [B] interação de dois atores; [B] prop com física simples (o quadro). **Integração:** `obj_m03_clear_exit`.

### SP-03-3 "A passagem para a escola"
**Contexto:** vaga 2 + MG na rua lateral. **Preparação:** Kita contou macas na cena 5. **Experiência:** cobrir macas por lances. **Companheiros:** outro grupo no flanco (independente); Kita. **Ambiente:** escola com vidros partidos. **Evolução:** rotação por salvas. **Clímax:** a última maca. **Consequências:** `stretchers_passed`. **Requisitos:** [A]. **Integração:** `obj_m03_protect_medical_passage`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| porão 07:40 | colchões, mala, três baldes, vela, a chave | — | vidro a tremer | — | família; Mazur à porta | — |
| escadas/pátio | relógio parado, roupa estendida, bicicleta | moradores a subir/descer | sino | — | criança ao colo | — |
| cruzamento | barricada de elétricos, sacos nas janelas, piano | defensores | — | janelas | — | cartuchos |
| interior 08:40 | apartamento com mesa posta | — | — | — | morador preso | fachada no chão, quadro caído |
| pátios/escola | caixas; macas; giz nas portas (socorrista) | — | atirador | MG | Kita | macas no corredor |
| porão 09:50 | mais gente, caixas, dois baldes | — | disputa | — | Nowak | corredor separado |
| porão 11:10 | sem espaço; um balde; a chave no banco | — | — | — | maca | — |

**Objetos com origem:** a chave (apartamento do 3.º do prédio ao lado, atingido a 24/9); o relógio parado (bomba de 23/9 na rede elétrica); a mesa posta (família que saiu à pressa de manhã); o piano (sala usada como posto); os baldes (a água acabou nas torneiras a 24/9; S-C10 regista redes destruídas).

---

## 6. Diálogos

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Helena (morador) | "Ainda há gente no andar de cima." (§79) | cena 1 t 16 | 2 | — |
| 002 | Nowak (defensor) | "Não é para tomar a rua. É para tirar os nossos dela." (§79) | cruzamento, 1.º contacto | 1 | — |
| 003 | Lis | "Guarda um pouco de água. Todos precisam." (§79) | cena 1 t 24, **só se Lis presente** | 2 | — |
| 003b | Nowak | "Guarda um pouco de água. Todos precisam." (§79, reatribuída conforme regra de §79) | se Lis ausente/incapacitado | 2 | — |
| 010 | Nowak | "Ligação cortada com o cruzamento. Leva isto. Relógio parado, sino, pátio: é o caminho." (V1) | cena 1 t 4 | 1 | — |
| 011 | Krysia | "O senhor também mora aqui agora?" (V1) | cena 1 t 10 | 3 | — |
| 012 | morador (escadas) | "A porta só fecha deste lado. Não a deixe aberta." (PR #44) | pátio | 3 | — |
| 013 | Mazur | "Eu fico. A casa é minha." (V1) | 3.º andar | 3 | 60 |
| 014 | defensor | "Pelo pátio. A rua já não serve!" (PR #44) | atirador ativo | 0 | 20 |
| 015 | Nowak | "Ligação. Agora aguentamos até nos mandarem sair." (V1) | mensagem entregue | 1 | — |
| 016 | defensor | "Janela alta vê mais e morre mais." (V1) | escolha de posição | 2 | — |
| 017 | Nowak | "Abre-lhes a porta do pátio. Pela rua não." (V1) | moradores a 10 m | 1 | — |
| 018 | morador | "Para onde?" (V1) | porta aberta | 3 | — |
| 019 | Nowak | "Vidro." (V1) | 08:39 (vibração) | 0 | — |
| 020 | Nowak | "Para dentro! Afastem-se da fachada!" (V1) | raid_1 | 0 | — |
| 021 | Nowak | "A rua acabou. Pelo interior." (V1) | fachada caída | 1 | — |
| 022 | morador preso | "Aqui! A viga!" (V1) | zona exit_block | 1 | 15 |
| 023 | Nowak | "Dois homens. Ao três." (V1) | interação | 1 | — |
| 024 | Nowak | "O depósito da rua foi atingido. Há caixas na padaria. Ou…" (V1) | exit_cleared | 1 | — |
| 025 | Kita | "…ou o Wójcik, no 2.º. Não anda. Não consigo os dois." (V1) | 024 + 3 s | 1 | — |
| 026 | Kita | "Devagar na escada. Ele não grita por orgulho." (V1) | a carregar | 2 | — |
| 027 | Nowak | "Caixas. Bom. Dá para a tarde." (V1) | munição entregue | 2 | — |
| 028 | soldado | "O porão. Para as caixas." (V1) | cena 6 t 2 | 2 | — |
| 029 | Nowak | "Há gente debaixo da escada. Se querem esta entrada, abram outra para eles." (PR #44, adaptada) | t 8 | 1 | — |
| 030 | Helena | "Krysia. Bebe. Devagar." (V1) | t 16 | 3 | — |
| 031 | Nowak | "Corredor livre. Caixas à esquerda. Vamos." (V1) | t 30 | 1 | — |
| 032 | Kita | "Quatro macas. A rua lateral tem uma metralhadora na janela." (V1) | cena 7 início | 1 | — |
| 033 | Nowak | "Cala-a e elas passam." (V1) | 032 + 2 s | 1 | — |
| 034 | defensor (flanco) | "Flanco seguro. Não venham para aqui." (V1) | rádio/grito | 2 | — |
| 035 | Kita | "Mais uma. Última." (V1) | 3.ª maca | 1 | — |
| 036 | Nowak | "Ordem: recuar ao abrigo." (V1) | withdraw_order | 0 | — |
| 037 | morador | "Aqui. Há lugar aqui." (V1) | maca no porão | 2 | — |
| 038 | Lis / Nowak | "Há pessoas lá em baixo. Primeiro elas." (PR #44) | outro | 2 | — |

Callouts: `co_m03_glass` ("Vidro!"), `co_m03_window_mg`, `co_m03_stretcher_hit`. Silêncios: porão (cenas 1, 6, 8) e 2 s após cada bomba.

---

## 7. Arte e atmosfera

**Paleta:** gesso branco, tijolo vermelho-escuro, cinza de fumo, laranja de incêndio ao longe, luz em feixes. **Luz:** 07:40 manhã clara (Sol az 110°, el 14°), 08:40 poeira (exposição 1,1, névoa branca 0,25 por 90 s), 10:20 laranja-cinza, 11:10 fumo alto. **Materiais:** gesso, soalho, tijolo, paralelepípedo, elétrico tombado. **Silhuetas:** torre de igreja com sino; elétricos; a fachada que cai. **Destruição:** fachada persistente; rua cortada até ao fim; fumo acumulado por bairro (haze). **Humanos:** civis com casacos sobre roupa de casa; soldados com gesso nos ombros; Lis com a perna ligada (variante). **Violência reduzida:** feridos cobertos; sem sangue no porão.

Interiores: planta de prédio polaco dos anos 1920–30 (`RECONSTRUCTED`; nunca afirmar edifício real).

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| porão | vela, respiração, vidro | — | avião alto | obrigatório |
| quarteirão | passos em escada, sino, porta | defensores | bombardeiros He 111 (motores dessincronizados) | — |
| cruzamento | tiros com reverberação de sala, vidro | MG ao fundo da rua | artilharia | — |
| vaga | sirene, bombas por bairro com atraso, fachada, pó | — | — | 2 s após |
| pátios/escola | macas, caixas | atirador | — | — |
| recuo | respiração; a cidade a arder | — | — | obrigatório |

Sons novos: interiores de alvenaria, sirene de Varsóvia, He 111, fachada a cair, elétrico. VO polaco (moradores e soldados).

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| 25/9 "Segunda-feira Negra": bombardeamento massivo desde as 08:00 | D | H04; S-C10 | — |
| Redes de água destruídas; falta de água | D | S-C10 | — |
| Negociações 26/9 à noite; capitulação 28/9 13:15; prisioneiros 29–30/9 | D | S-C10 | — |
| Setor oeste com barricadas; quarteirão específico | `RECONSTRUCTED` | — | P-C03 |
| Sobreviventes do Exército Poznań incorporados na defesa | D (geral) | H03/H04 | — |
| Família Zaremba, Nowak, Kita, Wójcik, Mazur | F | — | — |
| Equipamento polaco 1939; He 111/Ju 87; Kar98k | D | H30 | auditoria |

**Proibições:** capitulação em 25/9; atrocidade atribuída a unidade; civis como alvos ou moeda. **Fora de cena:** Czuma, Rómmel, Starzyński.

---

## 10. Handoff técnico

**Contrato:** `id m03_warszawa`, `order 3`, relógio 07:40→11:40 (elipse em debrief), `entry.cutscene cs_m03_intro` com `lineVariants` por `m02.lis_status`, `cast` condicional (Lis `presentIf`), `groups` (`grp_piotr`, `grp_nowak`, `grp_defenders`, `grp_residents`, `grp_de_facade`, `grp_de_mg_side`), `sectors` (§3.2) com agenda de raids independente, `checkpoints` A–D, `cutscenes` (intro, raid, cellar, outro), `dialogue`, `continuityFlags`, `debrief`.

**Flags:** `m03.completed`, `m03.lis_present` (derivada), `m03.residents_passed`, `m03.ammo_carried`, `m03.civilian_wounded_helped`, `m03.mazur_descended`, `m03.cellar_corridor_kept`, `m03.water_level`, `m03.stretchers_passed`.

**Sistemas:** [A] simulação, fogo como dados, `safeImpact`, `carriedBy`, interação de dois atores (padrão reparo), checkpoints. [B] prop com física simples (quadro); `lineVariants` por flag de outra missão (**[D] leve**: leitura de flags de campanha no save — ver roadmap). [C] interiores verticais (escadas, janelas, oclusão de som e visão), civis com rotas/abrigos (3 adultos + 1 criança + extras), vaga de bombardeamento por bairro.

**Requisitos por disciplina:** Level designer: prédio de 4 pisos + porão, pátio, cruzamento, passagem, escola (≈ 200×200 m); Combate/IA: inimigos que usam janelas; Arte: gesso/poeira; Personagens: civis polacos 1939 (4), Lis com ligadura; Animação: carregar civil, afastar viga, dar água; Som: interiores; VO: 10 vozes; Historiador: P-C03; Eng.: oclusão por paredes; QA: variantes de Lis ×3, skip, restore C com rua cortada; Produtor: primeira missão com civis — pré-requisito do sistema [C] de civis.

**Testes:** dados; cronologia; `lineVariants` por `m02.lis_status`; água 3→2→1; rua cortada persistente após restore; objetivo opcional exclusivo (munição xor civil); macas ≥ 3/4 com supressão.

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo jogável | Ação do jogador | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| Acordar num porão com gente | (intro) | ver os baldes; ouvir Lis/Nowak | família; Mazur à porta | vidro treme | `missionStart` | CP-A; água 3 |
| A ligação cortada | `obj_m03_message` | navegar por 3 sinais | moradores nas escadas | — | Nowak sobe | CP-B |
| Tirar os nossos da rua | `obj_m03_hold_crossing` | janela/barricada; disparar; abrir porta do pátio | defensores rodam; moradores atravessam | cartuchos; cortinas | ligação | `residents_passed` |
| A vaga das 08:40 | `obj_m03_cross_interior` | abrigar-se; atravessar | Nowak guia | fachada cai; rua cortada | sirene/vidro | rota muda |
| O quadro cai; a saída soterrada | `obj_m03_clear_exit` | libertar com dois homens | morador preso | vigas afastadas | zona | CP-C |
| Munição ou o Sr. Wójcik | `obj_m03_optional` | escolher e carregar | Kita/Nowak recebem | caixas/maca | exit | flags |
| O porão disputado | `obj_m03_cellar` | (ver; subir a Mazur opcional) | Nowak separa corredor | porão cheio; água 2 | entrega | `cellar_corridor_kept` |
| Macas para a escola | `obj_m03_protect_medical_passage` | calar a MG; cobrir | outro grupo no flanco; Kita conta | vidros da escola | 031 | `stretchers_passed` |
| A ordem de recuar | `obj_m03_withdraw` | voltar ao porão | morador abre lugar | sem espaço; água 1; a chave | ordem | `m03.completed` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 8 | A chave, a água, o corredor do porão: três ideias concretas. |
| 2 | Autenticidade | 7 | Data e contexto D; quarteirão R; nenhuma rua afirmada. |
| 3 | Personagens | 8 | Nowak e Helena fortes; Mazur é um traço (recusa). |
| 4 | Diálogos | 8 | regra de Lis cumprida (003/003b). |
| 5 | Originalidade | 8 | nada de "salas com inimigos"; o quadro e a chave. |
| 6 | Variedade | 8 | navegação vertical, defesa, bombardeamento, trabalho, escolha, escolta de macas. |
| 7 | Set pieces | 7 | três; a segunda depende de física simples. |
| 8 | Atmosfera | 8 | gesso e luz em feixes; fumo por bairro. |
| 9 | Environmental storytelling | 9 | cada objeto tem origem; o porão muda três vezes. |
| 10 | Cinematográfica | 7 | quatro cutscenes curtas; sem câmara externa. |
| 11 | Sonora | 8 | interiores e sirene; silêncio do porão. |
| 12 | Impacto emocional | 8 | a chave no banco; o lugar para a maca. |
| 13 | Ritmo | 8 | 22–28 min plausíveis; elipse só no debrief. |
| 14 | Continuidade | 9 | Lis em três variantes; porta → M04. |
| 15 | Integração técnica | 6 | interiores verticais e civis são [C]; leitura de flags de campanha [D]. |

**Correções aplicadas:** (1) a fala 003 de Lis recebeu a variante 003b (Nowak) conforme a regra literal de §79; (2) o objetivo opcional foi tornado exclusivo (munição xor civil) para não virar escolta interminável; (3) o socorrista militar recebeu nome próprio (Kita) para não reutilizar Szymczak de M02 sem trajetória.
