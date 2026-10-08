# M19 — BOCAGE · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** 13/6/1944, setor de Caumont, Normandia; 1.ª Divisão de Infantaria; Lane permanece no 16.º Regimento, com ação local compatível com papel de reserva/proteção dos flancos; POV Edward Lane; fonte H18; 20–27 min; três falas; checkpoints "patrulha; contato; rota aberta; ligação consolidada"; Price ou substituto conforme continuidade; linha de visão não atravessa vegetação; um inimigo rendido pode ser desarmado/supervisionado conforme sistema validado; não exigir execução. **Proposto:** quinta deserta no flanco do setor (S-C18: Caumont tomada pelo 18.º/26.º; o 16.º no flanco — P-C19), o rendido como momento de custo humano (PR #44), o Soldbuch como objeto, elenco por flags de M18, flags. **Sistema:** `SURRENDERED`/custódia [C] com fallback encenado.

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m19_caumont_bocage` / 19 |
| Datas | 1944-06-13T07:30+02:00 → 1944-06-13T12:30+02:00 |
| Local | quinta abandonada (varal, pátio) → sebes e taludes → caminho encaixado → cruzamento com um transporte → posição de flanco — `RECONSTRUCTED` (P-C19) |
| Operação | Caumont tomada 13/6 pela 1.ª DI (18.º/26.º com o 743.º Tank) contra a 2.ª Pz Div.; o 16.º em papel de flanco/reserva (D em resumo/R, S-C18) |
| Unidade | 16.º Reg., 1.ª DI (canónico) → secção de Lane |
| Elenco | Lane (POV), sgt. Luis Morgan, pfc. Marcus Bell (se `m18.bell_status`), T/5 Samuel Price **ou** T/5 Abe Lindqvist (conforme `m18.price_status`), pvt. Hank Doyle (se `m18.doyle_status = unhurt`; senão Castellano assume o impulso), pvt. Joey Castellano; Monsieur Lefranc (morador); o rendido (Gefreiter, sem nome inventado além do Soldbuch ficcional "Weber") (propostas) |
| Fora de cena | Huebner |
| Intocável | data, setor, unidade, POV, falas `dlg_m19_001–003`, checkpoints, Price/substituto (nunca ambos), o rendido supervisionado, sem execução para terminar |

---

## 1. Story Bible

**Logline.** Sete dias depois de Omaha, o silêncio rural de uma quinta deserta perturba mais do que o tiro. Lane aprende a descobrir o inimigo por vestígios e escuta, a abrir uma rota para um transporte — e a ver um dos seus erguer a arma a um homem ajoelhado de mãos erguidas, por causa da praia. Morgan corta o impulso. O comboio passa; o prisioneiro fica sob guarda; um morador observa sem confiança.

**As oito respostas.**
1. **Situação central:** o inimigo rendido e a raiva de Omaha.
2. **Modo de contar:** um homem sob guarda (custódia; nunca "abates").
3. **Objeto:** o Soldbuch do rendido (Morgan lê o nome em voz alta: o rendido passa a pessoa).
4. **Silêncio:** a quinta deserta (aves; roupa no varal).
5. **Tarefa que não é matar:** patrulhar; transmitir; abrir rota ao transporte; desarmar/escoltar o rendido; dar água.
6. **Custo humano:** após o flanqueamento, um alemão desarmado ajoelha-se e indica rendição (causa: a secção fecha o flanco) → Doyle (ou Castellano), tomado por Omaha, ergue a arma: "Depois de Omaha, queres deixá-lo sair?" / Morgan corta: "Ele já largou a arma." → revistado e levado sob guarda por NPCs; `m19.pow_secured`; se o jogador dispara sobre o rendido: `m19.player_fired_on_pow`, a secção deixa de falar com Lane até ao fim (regra de M01), Morgan assume o posto sem a fala 003 e o debrief regista-o (sem recompensa, sem fim de missão).
7. **Pessoas históricas:** fora de cena.
8. **Debrief:** regista Caumont tomada pela divisão, a 2.ª Pz Div. em frente, o papel de flanco do 16.º, o prisioneiro entregue; "sem atribuir ao 16.º um crime inventado".

**Três motivos.** (a) *Vestígios* — o inimigo descobre-se, não "spawna"; (b) *o Soldbuch* — o nome lido; (c) *a vigia* — Morgan protege Lane da exaustão com um gesto, não um discurso.

**Temas.** A marca de Omaha na secção; disciplina sem negar a raiva; descoberta; civis sem confiança; cuidado entre homens.

**Estrutura (§54).** CONTEXTO → INTRO (quinta deserta; aves; Price/Lindqvist) → APROXIMAÇÃO (patrulha do flanco; passagens entre sebes) → DIÁLOGO (Morgan: "Devagar. A sebe esconde…") → PRIMEIRO CONTATO (sinais; transmitir; aproximação cuidadosa) → ESCALADA (contacto central: observar vs flanquear) → COMBATE PRINCIPAL (rota para o transporte) → SET-PIECE (reação pontual + o rendido) → PAUSA (o Soldbuch) → CLÍMAX (ligação do flanco) → CONSEQUÊNCIA (comboio; prisioneiro; morador; a vigia) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Lane | chega da praia; escuta junto das sebes | Morgan | o rendido; a exaustão | paciência antes de disparar | bebe água; Morgan assume o posto |
| Morgan | "Devagar." (001) | secção | Doyle | — | "Beba água, Lane." (003) |
| Bell | "O transporte entrou." (002) | — | — | — | vivo |
| Price / Lindqvist | socorrista | — | — | — | vivo |
| Doyle (ou Castellano) | Omaha dentro | Lane | o rendido | baixa a arma; não se converte | `m19.doyle_deescalated` |
| Lefranc | observa | ninguém | — | — | sem confiança |
| o rendido | medo | — | custódia | — | vivo, entregue |

**O que a missão recusa.** Tiros em cada sebe; IA que vê através da vegetação; labirinto de cubos; execução; cópia de WaW; Price e Lindqvist ao mesmo tempo; Huebner em cena.

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "Varal" (`cs_m19_intro`, ≤ 70 s)
2 07:30 · 3 quinta abandonada: pátio, varal com roupa, galinheiro vazio; homens a preparar defesa · 4 manhã de junho; sol entre sebes; aves · 5 Lane, Morgan, Bell, Price/Lindqvist, Doyle/Castellano · 6 Cartela: SETOR DE CAUMONT — 13 DE JUNHO DE 1944 — 07:30 · 16.º REGIMENTO · 1.ª DIVISÃO DE INFANTARIA. Cartela 2 (`lineVariants`): "T/5 Price continua com a secção" / "T/5 Price foi evacuado de Omaha; T/5 Lindqvist assumiu". Contraste com Omaha: aves, propriedade abandonada; Morgan verifica o caminho de um transporte; Morgan: "Devagar. A sebe esconde o que a praia deixava à vista." (001). · 7 estabelecer o silêncio rural e as variantes · 8 olhar; andar no pátio · 9 — · 10 — · 11 artilharia além das colinas · 12 varal, mesa com louça, uma bicicleta · 13 `dlg_m19_001` (canónica), `010–013` · 14 **silêncio obrigatório** (aves, roupa ao vento) · 15 beat: o varal (3 s) · 16 `missionStart` · 17 Morgan: "Patrulha." · 18 `cp_m19_a_patrulha` · 19 variantes · 20 lê `m18.*`.

### Cena 2 — "Passagens" (jogável; `obj_m19_patrol`)
2 07:40–08:40 · 3 flanco: sebes de alturas diferentes, taludes, um caminho encaixado, uma construção de pedra · 4 sol entre sebes · 5 secção; outras patrulhas noutras vias · 6 Patrulhar um flanco e reconhecer passagens entre sebes, taludes e construções; a vegetação opaca para o jogador é opaca para a IA · 7 §79 ponto 1 · 8 navega; identifica aberturas (interação: marcar passagem) · 9 caminho encaixado (coberto, cego) vs talude (visão, exposto) · 10 Morgan assinala; Bell observa · 11 nenhum ativo · 12 sebes com aberturas; uma vaca · 13 `dlg_m19_014–017` · 14 aves; vento na sebe · 15 livre · 16 CP-A · 17 sinais encontrados · 18 — · 19 [C] sebes com oclusão simétrica · 20 —

### Cena 3 — "Sinais" (jogável; `obj_m19_signs_transmit`)
2 08:40–09:30 · 3 orla de um campo; marcas · 4 — · 5 secção · 6 Encontrar sinais de uma posição inimiga (fio de telefone de campanha, cigarros, terra remexida, um capacete) e transmitir informação (rádio SCR-300 de Bell); permitir aproximação cuidadosa antes do contacto; nenhum tiro ativado por sebe · 7 §79 ponto 2 · 8 observa sinais (interações); transmite (interação); aproxima-se devagar · 9 — · 10 Bell transmite; Doyle impaciente · 11 posição alemã (MG 42 + 6) além da sebe (dados, só quando observada) · 12 fio, cigarros, capacete · 13 `dlg_m19_018–021` · 14 rádio · 15 livre · 16 sinais · 17 transmitido + aproximação · 18 `cp_m19_b_contato` · 19 [A]; [B] interações de sinais · 20 —

### Cena 4 — "Contacto central" (jogável; `obj_m19_engage`)
2 09:30–10:30 · 3 sebe/talude; abertura lateral · 4 sol · 5 secção · 6 **Decisão:** observação prolongada (a posição revela-se: a MG move-se; a secção ataca quando a guarnição muda) ou flanqueamento pela passagem lateral (exposição, resultado proporcional); grupos usam cobertura, janelas da construção de pedra e rotas laterais reais · 7 §79 ponto 3 · 8 escolhe; dispara (10–120 m); flanqueia · 9 observar vs flanquear · 10 Morgan comanda; Bell cobre; Price/Lindqvist atrás · 11 MG 42 + infantaria (dados); recuam; **um fica desarmado** (ferido leve, sem arma) · 12 sebe aberta; cartuchos · 13 `dlg_m19_022–026` · 14 MG 42 abafada pela sebe; poeira indireta · 15 livre · 16 CP-B · 17 posição neutralizada (`evt_m19_position_cleared`) · 18 `m19.approach` · 19 [A] · 20 —

### Cena 5 — "Rota para o transporte" (jogável; `obj_m19_open_route`)
2 10:30–11:15 · 3 caminho encaixado até ao cruzamento; o transporte (camião com munição/suprimento) · 4 poeira de pneus · 5 secção; outro grupo no trecho seguinte; motorista · 6 Abrir e proteger uma rota para o transporte; outro grupo mantém o trecho seguinte (Lane não escolta toda a estrada); o transporte entra: Bell: "O transporte entrou. Agora precisamos da saída." (002) · 7 §79 ponto 4 · 8 limpa o caminho (um tronco: interação a dois); cobre a entrada; sinaliza ao outro grupo · 9 — · 10 outro grupo; motorista · 11 atirador (dados) · 12 pneus; poeira; aliados a ocupar rotas próprias · 13 `dlg_m19_002` (canónica), `027–030` · 14 pneus; motor · 15 livre · 16 cleared · 17 transporte dentro · 18 `cp_m19_c_rota_aberta`; `m19.transport_through` · 19 [A]; [C] camião proxy · 20 —

### Cena 6 — "Ele já largou a arma" (`cs_m19_pow`, ≤ 45 s; jogável) — **custo humano**
2 11:15–11:40 · 3 cruzamento; a sebe onde a posição caiu · 4 sol · 5 Lane, Morgan, Doyle/Castellano, Bell; o rendido (Weber) ajoelhado, mãos erguidas · 6 Reação pontual alemã rechaçada (curta); depois, da sebe, um alemão desarmado ajoelha-se e indica claramente rendição. Doyle (ou Castellano), tomado pelo que viu em Omaha, ergue a arma e murmura que não quer prisioneiros. Morgan corta o impulso: "Ele já largou a arma." O rendido é revistado (Morgan tira o Soldbuch e lê o nome: "Weber, Karl. Gefreiter.") e levado sob guarda por Bell e outro; sem execução, sem recompensa. · 7 o momento de custo humano da campanha (PR #44) · 8 pode aproximar-se e baixar a arma de Doyle (interação: mão no cano) — `m19.player_intervened`; ou cobrir enquanto Morgan intervém; **se disparar** sobre o rendido: `m19.player_fired_on_pow`, silêncio da secção até ao fim; o debrief regista · 9 intervir / cobrir / (disparar) · 10 Morgan intervém sempre (fallback encenado); Doyle baixa a arma e afasta-se; Bell escolta · 11 nenhum ativo · 12 o Soldbuch; a arma do rendido no chão · 13 `dlg_m19_031–037` · 14 silêncio tenso; respiração · 15 beat: as mãos erguidas (2 s); Morgan entre os dois (2 s); o Soldbuch (2 s) · 16 transport_through + reação rechaçada · 17 rendido escoltado · 18 `m19.pow_secured = true` (salvo disparo), `m19.doyle_deescalated`, `m19.pow_name_read` · 19 [C] `SURRENDERED`/custódia; fallback encenado honesto · 20 —

### Cena 7 — "Ligação do flanco" (jogável; clímax; `obj_m19_hold_flank`)
2 11:40–12:15 · 3 cruzamento e posição de flanco · 4 sol alto · 5 secção; outro grupo · 6 Manter a ligação do flanco durante uma segunda reação pontual (menor); intervalos de silêncio e atividade que o jogador apenas observa (artilharia além das colinas) · 7 §79 ponto 5 · 8 rotação por salvas; mantém ligação (rádio) · 9 — · 10 outro grupo · 11 reação menor · 12 — · 13 `dlg_m19_038–040` · 14 — · 15 livre · 16 escolta · 17 ligação consolidada (`evt_m19_consolidated`) · 18 `cp_m19_d_ligacao_consolidada` · 19 [A] · 20 —

### Cena 8 — "Água" (`cs_m19_outro`, ≤ 60 s) + debrief
2 12:15–12:30 · 3 cruzamento; o comboio a passar; o prisioneiro sentado sob guarda; Lefranc à porta da quinta vizinha · 4 meio-dia · 5 secção; Lefranc; o rendido · 6 O comboio passa; o prisioneiro aguarda sob guarda; Lefranc observa sem confiança imediata; Morgan percebe o desgaste de Lane e reduz a conversa a uma ordem simples: "Beba água, Lane. Depois assumo seu posto." (003) — e assume a vigia (gesto). Se `player_fired_on_pow`: Morgan assume a vigia sem a fala; cartela regista. · 7 consequência canónica · 8 skip; (jogável: beber — interação) · 9 — · 10 — · 11 — · 12 o comboio; Lefranc · 13 `dlg_m19_003` (canónica), `041–043` · 14 pneus; aves; nenhuma música · 15 beat: Lefranc (2 s); Morgan na vigia (3 s) · 16 consolidated · 17 debrief · 18 `m19.completed`; `m19.lane_rested` · 19 variantes · 20 fim do arco de Lane.

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m19_patrol` | Patrulhe o flanco e marque passagens | sim | intro | 3 passagens | — | — | A |
| `obj_m19_signs_transmit` | Encontre sinais e transmita | sim | passagens | transmitido | — | — | B |
| `obj_m19_engage` | Observe ou flanqueie a posição | sim | B | cleared | — | `approach` | — |
| `obj_m19_open_route` | Abra e proteja a rota para o transporte | sim | cleared | transporte dentro | camião destruído → continua a pé (sem falha) | `transport_through` | C |
| `obj_m19_pow` | (cena) | sim | reação 1 | escoltado | — | `pow_secured`, `doyle_deescalated` | — |
| `obj_m19_hold_flank` | Mantenha a ligação do flanco | sim | escolta | consolidated | — | — | D |
| `obj_m19_drink` | Beba água | sim (fim) | outro | interação | — | `lane_rested` | — |

### 3.2 Setores
`s1_farm_hedges` (perto) · `s2_crossroads` (perto) · `s3_other_patrols` (médio: patrulhas e transporte em vias distintas; outro grupo) · `s4_beyond_hills` (longe: artilharia; combates de Caumont; 2.ª Pz Div.). Agendas: posição revela-se 09:50 (se observação); transporte 10:45; reação 1 11:15; reação 2 11:50.

### 3.3 Checkpoints
A patrulha · B contato (sinais; posição ativa) · C rota aberta (transporte) · D ligação consolidada (prisioneiro; comboio).

### 3.4 Justiça
Oclusão simétrica; posição só ativa quando observada/aproximada; reações pontuais com aviso; o rendido nunca volta a combater; disparar sobre ele nunca termina a missão nem dá nada.

---

## 4. Set pieces

### SP-19-1 "A sebe esconde"
Contexto: patrulha. Preparação: o varal; fala 001. Experiência: marcar passagens; sinais; transmitir. Companheiros: Bell no rádio; Doyle impaciente. Ambiente: fio, cigarros. Evolução: aproximação cuidadosa. Clímax: a decisão observar/flanquear. Consequências: `approach`. Requisitos: [C] sebes. Integração: `obj_m19_patrol/signs_transmit/engage`.

### SP-19-2 "O transporte entrou"
Contexto: caminho encaixado. Preparação: posição neutralizada. Experiência: tronco a dois; cobrir a entrada; outro grupo no trecho seguinte. Companheiros: motorista; Bell. Ambiente: poeira de pneus. Evolução: reação 1. Clímax: fala 002. Consequências: `transport_through`. Requisitos: [C] camião. Integração: `obj_m19_open_route`.

### SP-19-3 "Ele já largou a arma"
Contexto: cruzamento. Preparação: Doyle com Omaha dentro (M18). Experiência: as mãos erguidas; a arma de Doyle; Morgan; o nome lido. Companheiros: Bell escolta. Ambiente: a arma no chão. Evolução: intervir/cobrir/(disparar). Clímax: o Soldbuch. Consequências: `pow_secured`. Requisitos: [C] `SURRENDERED`; fallback. Integração: `obj_m19_pow`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| quinta | varal, louça, bicicleta, galinheiro vazio | preparar defesa | silêncio | — | Price/Lindqvist | — |
| sebes | aberturas, vaca, caminho encaixado | patrulha | — | — | — | passagens marcadas |
| orla | fio, cigarros, capacete, terra remexida | — | sinais | — | — | — |
| posição | MG 42, construção de pedra | — | — | contacto | — | sebe aberta |
| caminho | tronco, poeira | transporte | atirador | reação | motorista | — |
| cruzamento | a arma no chão, Soldbuch | escolta | — | — | o rendido; Lefranc | prisioneiro sentado |

Objetos com origem: o varal (família Lefranc saiu a 11/6), o fio de telefone (posição alemã), o Soldbuch (Weber), o tronco (abatido pela artilharia de 12/6).

---

## 6. Diálogos (VO inglês; alemão para o rendido; francês para Lefranc, sem tradução)

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Morgan | "Devagar. A sebe esconde o que a praia deixava à vista." (§79) | intro t 30 | 1 | — |
| 002 | Bell | "O transporte entrou. Agora precisamos da saída." (§79) | transporte dentro | 1 | — |
| 003 | Morgan | "Beba água, Lane. Depois assumo seu posto." (§79; **omitida** se `player_fired_on_pow`) | outro | 1 | — |
| 010 | Morgan | "Transporte às onze pela estrada encaixada. Até lá, flanco." (V1) | intro t 6 | 1 | — |
| 011 | Price / Lindqvist | "Bolsa cheia. Hoje espero não a abrir." / "Sou o Lindqvist. O Price está em Inglaterra, vivo." (V1 variantes) | intro t 14 | 2 | — |
| 012 | Doyle (ou Castellano) | "Está tudo tão calado." (V1) | intro t 20 | 3 | — |
| 013 | Bell | "Calado é o que me assusta desde terça." (V1) | 012 | 3 | — |
| 014 | Morgan | "Não vês nada? Então espera por confirmação." (PR #44) | patrulha | 1 | — |
| 015 | Bell | "Abertura à esquerda. Marca." (V1) | passagem | 2 | — |
| 016 | Doyle | "Uma vaca. Só uma vaca." (V1) | vaca | 3 | — |
| 017 | Morgan | "Caminho encaixado é cego. Talude vê e é visto." (V1) | escolha | 2 | — |
| 018 | Bell | "Fio de telefone. Deles. Está vivo." (V1) | fio | 1 | — |
| 019 | Morgan | "Cigarros. Há menos de uma hora." (V1) | cigarros | 2 | — |
| 020 | Bell (rádio) | "Posição provável além da sebe norte. Seis a oito. MG. Aguardamos." (V1) | transmitir | 1 | — |
| 021 | Doyle | "Vamos lá agora?" (V1) | — | 3 | — |
| 022 | Morgan | "Observar até ela se mexer, ou flanquear pela abertura. Lane?" (V1) | decisão | 1 | — |
| 023 | Bell | "MG a mudar. Agora." (V1; observação) | revela-se | 0 | — |
| 024 | Morgan | "Abertura! Flanco!" (V1; flanqueamento) | — | 0 | — |
| 025 | Bell | "Recuam. Um ficou. Sem arma." (V1) | cleared | 2 | — |
| 026 | Morgan | "Deixem-no onde está. Primeiro a rota." (V1) | 025 | 1 | — |
| 027 | Morgan | "Tronco. Dois homens." (V1) | tronco | 1 | — |
| 028 | motorista | "Posso entrar? Posso entrar?" (V1) | camião | 2 | — |
| 029 | outro grupo (rádio) | "Trecho seguinte é nosso. Mandem-no." (V1) | — | 1 | — |
| 030 | Morgan | "Reação! Curta! Posições!" (V1) | reação 1 | 0 | — |
| 031 | Bell | "Mãos. Está de mãos erguidas." (V1) | rendido | 1 | — |
| 032 | Doyle (ou Castellano) | "Depois de Omaha, queres deixá-lo sair? Não quero prisioneiros." (PR #44, adaptada) | arma erguida | 1 | — |
| 033 | Morgan | "Ele já largou a arma." (PR #44) | 032 + 1 s | 0 | — |
| 034 | Morgan | "Doyle. **Baixa.** Ele está rendido. A nossa tarefa mudou." (PR #44) | se não baixa em 3 s | 0 | — |
| 035 | Morgan | (Soldbuch) "Weber, Karl. Gefreiter. Vinte e dois." (V1) | revista | 1 | — |
| 036 | Bell | "Comigo. Devagar. Mãos onde eu as veja." (V1) | escolta | 1 | — |
| 037 | Morgan | (se o jogador disparou) "…" (silêncio; a secção não fala mais com Lane) (V1) | fired | — | — |
| 038 | Morgan | "Ligação. Rádio ao outro grupo." (V1) | flanco | 1 | — |
| 039 | Bell | "Segunda reação, menor. Aguentamos." (V1) | reação 2 | 1 | — |
| 040 | Morgan | "Consolidado." (V1) | consolidated | 1 | — |
| 041 | Lefranc (francês) | — (sem tradução; olha) | outro | — | — |
| 042 | Lane | "A estrada está livre. O homem ficou sob guarda." (PR #44) | outro | 2 | — |
| 043 | Morgan | (assume a vigia; gesto) | outro | — | — |

Callouts: `co_m19_mg_hedge`, `co_m19_hands_up`, `co_m19_reaction`. Silêncios: a quinta; o cruzamento antes de 031.

---

## 7. Arte e atmosfera

**Paleta:** verde de sebe (muitos tons), castanho de talude, pedra normanda cinzenta, branco de roupa no varal, M41 verde-oliva. **Luz:** 07:30 sol baixo entre sebes (raios), 09:30 sombra de talude, 12:00 meio-dia. **Materiais:** sebe densa, terra de talude, pedra, lona de camião. **Silhuetas:** quinta, sebes, construção de pedra, o comboio. **Destruição:** sebe aberta, tronco, cartuchos (persistentes). **Humanos:** M41 seco; Lindqvist com bolsa nova; o rendido com rosto (Feldbluse, sem capacete). **Violência reduzida:** sem sangue no rendido.

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| quinta | aves, roupa ao vento, louça | — | artilharia além das colinas | **obrigatório** |
| sebes | vento na sebe, passos abafados, vaca | patrulhas | — | — |
| orla | rádio, fio | — | — | — |
| contacto | MG 42 abafada, poeira indireta | — | — | — |
| caminho | tronco, pneus, motor | outro grupo | — | — |
| cruzamento | respiração; Soldbuch | — | — | **obrigatório** (antes) |
| fim | pneus; aves | — | — | — |

Sons novos: sebes (oclusão), quinta, SCR-300, camião. VO inglês/alemão/francês.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| Caumont tomada 13/6 pela 1.ª DI (18.º/26.º, 743.º Tank) vs 2.ª Pz Div. | D (resumo) | H18; S-C18 | — |
| 16.º no flanco/reserva | R | S-C18 | **P-C19** |
| Bocage: sebes, taludes, caminhos encaixados | D (geral) | — | — |
| Rendido ajoelhado; Doyle; Morgan | F (dramatização deliberadamente não atribuída) | — | revisão histórico-narrativa (PR #44) |
| Lefranc | F | — | — |
| Equipamento 1944; SCR-300; MG 42 | D | — | auditoria |

**Proibições:** execução; crime atribuído ao 16.º; cópia de WaW; IA através da sebe; Huebner em cena. **Fora de cena:** Huebner.

---

## 10. Handoff técnico

**Contrato:** `id m19_caumont_bocage`, `order 19`, relógio 07:30→12:30, `cast` condicional (`price_or_lindqvist`, `doyle_or_castellano`), grupos (`grp_section`, `grp_other_group`, `grp_truck`, `grp_de_position`, `grp_de_reaction`, `grp_pow`, `grp_resident`), setores, checkpoints A–D, cutscenes (intro, pow, outro), falas, flags, debrief.

**Flags:** `m19.completed`, `m19.approach`, `m19.transport_through`, `m19.pow_secured`, `m19.pow_name_read`, `m19.doyle_deescalated`, `m19.player_intervened`, `m19.player_fired_on_pow`, `m19.lane_rested`.

**Sistemas:** [C] `SURRENDERED`/custódia (estado de ator: desarmado, não-alvo para IA aliada, escolta por NPCs, persistência, não reativa após reload), sebes com oclusão simétrica (visão e som), camião; [A] fogo como dados, rotação; [B] interações (marcar, sinais, tronco, mão no cano); [D] leitura de flags de M18. **Nota (PR #44):** se o nível de interatividade não existir, a versão encenada (Morgan intervém sozinho) é honesta — nunca janela falsa.

**Disciplinas:** Level: quinta, 500 m de sebes, caminho encaixado, cruzamento; Combate/IA: posição que se revela por observação; rendição; Arte: bocage; Personagens: 1.ª DI (variantes), alemães, Lefranc; Animação: mãos erguidas, revista, mão no cano, vigia; Som: sebes; VO: inglês/alemão/francês; Historiador: P-C19 + revisão do momento; QA: variantes de M18 (2×2), rendido nunca reativa, disparo sobre rendido sem recompensa.

**Testes:** Price e Lindqvist nunca juntos; Doyle/Castellano nunca juntos no impulso; `pow_secured` true salvo disparo; fala 003 omitida se `player_fired_on_pow`; o rendido não reaparece armado após reload.

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| O varal | (intro) | olhar | Price/Lindqvist | — | start | CP-A |
| Passagens | `obj_m19_patrol` | marcar | Bell observa | — | A | — |
| Sinais; transmitir | `obj_m19_signs_transmit` | observar; rádio | Bell transmite | — | sinais | CP-B |
| Observar ou flanquear | `obj_m19_engage` | escolher; disparar | MG move-se; recuam; um fica desarmado | sebe aberta | B | `approach` |
| O transporte entrou | `obj_m19_open_route` | tronco; cobrir | motorista; outro grupo | poeira | cleared | CP-C |
| Ele já largou a arma | `obj_m19_pow` | intervir/cobrir/(disparar) | Doyle ergue; Morgan corta; Bell escolta | Soldbuch | reação 1 | `pow_secured` |
| Ligação do flanco | `obj_m19_hold_flank` | rotação; rádio | reação 2 | — | escolta | CP-D |
| Água | `obj_m19_drink` | beber | Morgan assume a vigia; Lefranc observa | comboio passa | consolidated | `m19.completed` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 9 | a raiva de Omaha e o nome lido. |
| 2 | Autenticidade | 7 | Caumont D; posição do 16.º P-C19; o momento é ficção não atribuída (regra). |
| 3 | Personagens | 9 | Morgan em três gestos; Doyle com arco. |
| 4 | Diálogos | 9 | "Ele já largou a arma." / "Weber, Karl. Gefreiter. Vinte e dois." |
| 5 | Originalidade | 8 | descoberta por vestígios; custódia como contagem. |
| 6 | Variedade | 8 | patrulhar, sinais, observar/flanquear, rota, custódia, ligação. |
| 7 | Set pieces | 9 | o terceiro é dos quatro âncoras da campanha. |
| 8 | Atmosfera | 8 | silêncio rural. |
| 9 | Environmental storytelling | 8 | varal, fio, Soldbuch. |
| 10 | Cinematográfica | 8 | os três beats do cruzamento. |
| 11 | Sonora | 8 | sebes. |
| 12 | Impacto emocional | 9 | — |
| 13 | Ritmo | 8 | 20–27 min. |
| 14 | Continuidade | 9 | lê M14/M18; fecha Lane. |
| 15 | Integração técnica | 5 | `SURRENDERED` e sebes [C]; fallback honesto. |

**Correções aplicadas:** (1) o rendido recebeu Soldbuch ficcional e nome lido (humanização sem pessoa real); (2) disparar sobre o rendido tem custo (silêncio da secção, fala 003 omitida, debrief) sem terminar a missão; (3) Price/Lindqvist e Doyle/Castellano são exclusivos por flags.
