# M18 — OVERLORD · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** manhã de 6/6/1944, Omaha Beach, setor Fox Green; Companhia E, 16.º Regimento, 1.ª Divisão de Infantaria; POV Edward Lane; fontes H17/H18; 24–32 min; três falas; checkpoints "preparação; primeira cobertura segura; grupo reunido; passagem; objetivo acima da praia"; sem invulnerabilidade roteirizada; material à equipa de abertura por interação abstrata; um homem com ferimento grave por explosão (impacto, ajuda, consequência, sem pontuação); Price presente ou evacuado conforme evento; não copiar composição visual ou diálogos de outro jogo; não encerrar a Normandia. **Proposto:** secção de Lane na Companhia E dispersa para o limite Fox Green/Easy Red (S-C20), saída entre E-1 e E-3 pelo fumo dos incêndios de erva (facto geral), elenco, flags.

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m18_omaha` / 18 |
| Datas | 1944-06-06T06:25+02:00 → 1944-06-06T12:00+02:00 |
| Local | LCVP → água e obstáculos (ouriços, estacas) → banco de seixos → arame acima dos seixos → trilho na falésia entre as saídas E-1 e E-3 → trincheira alemã acima da praia — `RECONSTRUCTED` (Fox Green; P-C18) |
| Operação | E/16 na 1.ª vaga, dispersa por ~800 jardas; uma secção em Easy Red; 2/3 de baixas; F/16 defronte de E-3; grupos pequenos sobem entre as saídas (D em resumo, S-C20) |
| Unidade | Companhia E, 16.º Reg., 1.ª DI (canónico) |
| Elenco | Lane (POV, pfc), sgt. Luis Morgan, pfc. Marcus Bell, T/5 Samuel Price (§73); pvt. Hank Doyle, pvt. Joey Castellano (de M14), pvt. Earl Whitaker (o ferido grave por explosão), equipa de abertura (engenheiros com bangalores) (propostas) |
| Fora de cena | ten. Spalding; cap. Dawson; gen. Huebner |
| Intocável | data, setor, unidade, POV, falas `dlg_m18_001–003`, checkpoints, Price condicional, "o litoral cheio de destroços e socorro" no fim, sem placar |

---

## 1. Story Bible

**Logline.** Meses depois da Sicília, Lane reconhece Morgan, Bell e Price pelos gestos dentro de uma embarcação apertada. A rampa desce em Fox Green. O que se segue não é uma batalha: é sair da água, encontrar a voz dos seus atrás de um banco de seixos, levar tubos a uma equipa que abre o arame, subir por onde o fumo deixa, e olhar de cima para a mesma praia — agora cheia de macas.

**As oito respostas.**
1. **Situação central:** sair da água e subir.
2. **Modo de contar:** quem sobe (da secção: 7 na embarcação; quantos chegam à trincheira).
3. **Objeto:** a alça da maca improvisada ("Segure a alça. Vamos levá-lo juntos." — Price).
4. **Silêncio:** atrás do banco de seixos (1–2 s deliberados; "não falta de combate").
5. **Tarefa que não é matar:** encontrar cobertura; reunir pela voz; levar material à equipa de abertura; carregar um ferido.
6. **Custo humano:** Whitaker ferido grave por explosão (morteiro) nos seixos (causa: a praia) → ele protesta que foi deixado / Doyle explica que não havia rota / Price trabalha → o jogador recebe uma tarefa de cobertura legível (cobrir Price enquanto trata), não uma ordem de disparar sobre quem já caiu; `m18.whitaker_status = wounded_evacuated` (fixo); `m18.price_status` por tiro real.
7. **Pessoas históricas:** fora de cena.
8. **Debrief:** regista a Companhia E dispersa, as baixas, as saídas abertas por grupos pequenos, a campanha que continua; "não encerrar a Normandia no dia do desembarque".

**Três motivos.** (a) *Vertical* — a praia é um problema de altura; (b) *a voz dos nossos* — reunir é ouvir; (c) *a praia vista de cima* — a mesma coisa, outra escala.

**Temas.** Sobrevivência coletiva; o luto que não cabe no combate; vozes desencontradas que se reorganizam; equipa.

**Estrutura (§54).** CONTEXTO → INTRO (embarcação; gestos) → APROXIMAÇÃO (rampa; água; obstáculos) → DIÁLOGO (Morgan: "Encontre cobertura. Depois procure a nossa voz.") → PRIMEIRO CONTATO (MG das casamatas; seixos) → ESCALADA (reunir; Price; Whitaker) → COMBATE PRINCIPAL (material à equipa de abertura) → SET-PIECE (a passagem; subir pelo fumo) → PAUSA (2 s atrás dos seixos; depois o meio da falésia) → CLÍMAX (objetivo acima da praia; acesso para os seguintes) → CONSEQUÊNCIA (a praia de cima) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Lane | "resolve escolhendo outra estrada"; ajusta o espelho (memória) | Morgan, Bell, Price | a praia não se controla | deixa de procurar vista completa | olha a praia de cima |
| Morgan | gestos da Sicília | secção | reunir | ordens mais curtas | vivo |
| Bell | "Há outros subindo pela esquerda." (003) | — | — | — | `m18.bell_status` |
| Price | "Segure a alça." (002) | feridos | tratar na exposição | — | `m18.price_status ∈ {present, wounded_evacuated}` |
| Doyle | recruta | Lane | Whitaker | explica a verdade | `m18.doyle_status` |
| Castellano | medalha | — | — | — | `m18.castellano_status` |
| Whitaker | — | — | explosão | — | evacuado (fixo) |
| equipa de abertura | — | — | arame | — | — |

**O que a missão recusa.** Composição icónica de filme/jogo; invulnerabilidade; toda a invasão parada por Lane; contagem de mutilação; fim da campanha; Spalding/Dawson em cena.

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "Embarcação" (`cs_m18_intro`, ≤ 80 s)
2 06:25 · 3 LCVP a 400 m de Fox Green · 4 manhã cinzenta; mar picado; fumo na praia · 5 secção (7); outras embarcações · 6 Cartela: OMAHA BEACH, SETOR FOX GREEN — 6 DE JUNHO DE 1944 — 06:25 · COMPANHIA E · 16.º REGIMENTO · 1.ª DIVISÃO DE INFANTARIA. Cartela 2: "meses depois da Sicília" (continuidade: `m14.*`). Espaço apertado; motores; Lane reconhece Morgan (distribui), Bell (confere), Price (ajusta a bolsa) pelos gestos aprendidos; Castellano com a medalha; Doyle vomita; a rampa vai descer. Morgan: "Encontre cobertura. Depois procure a nossa voz." (001). · 7 reconhecer pelos gestos; preparar a voz · 8 olhar; segurar o cinto de salva-vidas (gesto) · 9 — · 10 — · 11 fogo sobre a água · 12 — · 13 `dlg_m18_001` (canónica), `010–013` · 14 motor em caixa metálica; impactos; vozes · 15 primeira pessoa; beat: Price (2 s), Bell (2 s) · 16 `missionStart` · 17 rampa · 18 `cp_m18_a_preparacao` · 19 skip → rampa · 20 lê `m14.morgan_trust` (uma fala).

### Cena 2 — "Rampa" (jogável; `obj_m18_reach_cover`)
2 06:30–07:00 · 3 água até ao peito → obstáculos → areia → banco de seixos (300 m) · 4 maré a subir; fumo · 5 secção dispersa; outras secções; feridos · 6 Alcançar cobertura depois da rampa: usar água, obstáculos (ouriços, estacas) e areia legíveis; sem invulnerabilidade; o fluxo de outros grupos continua se o jogador parar · 7 §79 ponto 1 · 8 avança por obstáculos; agacha na água; corre entre estacas · 9 linha (estacas vs areia aberta) · 10 Morgan grita a cobertura; Bell corre à esquerda · 11 MG das casamatas de E-3 (dados), morteiros · 12 obstáculos, destroços, feridos na água · 13 `dlg_m18_014–018` · 14 tiro aberto; água; surf · 15 livre · 16 rampa · 17 banco de seixos · 18 `cp_m18_b_primeira_cobertura` · 19 [C] água de praia (reutiliza M04/M15); [A] fogo como dados · 20 —

### Cena 3 — "A nossa voz" (jogável; `obj_m18_regroup`)
2 07:00–07:40 · 3 banco de seixos; 60 m de praia · 4 fumo; luz cinzenta · 5 secção dispersa; Price a tratar; outros grupos a procurar saídas · 6 **Silêncio de 1–2 s** atrás dos seixos; reunir um grupo pequeno pela voz (chamar: interação; respostas de Morgan, Bell, Doyle, Castellano); Price atende feridos entre obstáculos enquanto Bell cobre a passagem; **Whitaker** é ferido grave por explosão de morteiro (evento fixo; impacto, ajuda, consequência); protesta que foi deixado; Doyle explica que não havia rota; o jogador cobre Price (rotação por salvas) enquanto trata; a alça: Price e Lane carregam Whitaker 40 m para trás de um ouriço · 7 §79 ponto 2 + custo humano · 8 chama; cobre Price; carrega com Price (maca a dois) · 9 — · 10 Price trabalha (pode ser atingido por tiro real se não coberto: `price_status`); Bell cobre; Doyle · 11 MG; morteiros · 12 seixos; macas improvisadas · 13 `dlg_m18_002` (canónica), `019–025` · 14 seixos; silêncio 2 s; morteiro · 15 livre; beat: 2 s · 16 CP-B · 17 grupo reunido (≥ 4) · 18 `cp_m18_c_grupo_reunido`; `m18.whitaker_status = wounded_evacuated`; `m18.price_status` · 19 [A] carriedBy a dois · 20 —

### Cena 4 — "Material à equipa" (jogável; `obj_m18_deliver_material`)
2 07:40–08:40 · 3 seixos → arame acima dos seixos (40 m expostos) · 4 fumo de erva a arder na falésia (facto geral) · 5 grupo; equipa de abertura (engenheiros) · 6 Levar material (secções de bangalore) a uma equipa que abre passagem, com interação abstrata e cobertura; a cobertura dos aliados depende de posições reais (Bell com a .30 recuperada? **não**: Bell com o fuzil; a .30 ficou na embarcação — honesto) · 7 §79 ponto 3 · 8 carrega 2 secções por lances; entrega (interação); cobre a equipa · 9 — · 10 equipa monta e detona por si · 11 MG; atiradores · 12 arame; erva a arder · 13 `dlg_m18_026–030` · 14 bangalore (abstrato: detonação) · 15 livre · 16 CP-C · 17 passagem aberta (`evt_m18_gap`) · 18 `cp_m18_d_passagem`; `m18.material_delivered` · 19 [A]; [B] interação de entrega (padrão sapper_crate) · 20 —

### Cena 5 — "Subir pelo fumo" (jogável; `obj_m18_climb`)
2 08:40–10:00 · 3 trilho na falésia entre E-1 e E-3; fumo de erva; posições alemãs no topo · 4 fumo (reduz visão simetricamente) · 5 grupo; outros grupos a subir pela esquerda (Bell: "Há outros subindo pela esquerda." — 003) · 6 Atravessar a saída confirmada e apoiar o avanço por posições dominantes; outros grupos sobem; não colocar toda a invasão à espera · 7 §79 ponto 4 · 8 sobe por lances; suprime posições no topo; usa o fumo · 9 trilho (direto) vs flanco pela esquerda (com outros) · 10 outros grupos por si; Morgan reorganiza a meio · 11 posições no topo (dados) · 12 erva a arder; minas assinaladas pela equipa (aviso) · 13 `dlg_m18_003` (canónica), `031–035` · 14 vento da falésia; vozes dissonantes · 15 livre · 16 gap · 17 topo · 18 — · 19 [C] terreno vertical (reutiliza M16) · 20 —

### Cena 6 — "Acima da praia" (jogável; clímax; `obj_m18_consolidate`)
2 10:00–11:30 · 3 trincheira alemã acima da praia; acesso para os seguintes · 4 fumo a diminuir · 5 grupo; grupos seguintes · 6 Consolidar um objetivo acima da praia mantendo acesso para os seguintes; contra-ataque local pontual; o volume de fogo diminui localmente sem interromper a guerra abaixo · 7 §79 ponto 5 · 8 ocupa a trincheira; rotação por salvas; mantém o acesso (sinaliza) · 9 — · 10 grupos seguintes sobem · 11 contra-ataque (dados) · 12 trincheira com equipamento alemão · 13 `dlg_m18_036–039` · 14 — · 15 livre · 16 topo · 17 consolidado (`evt_m18_consolidated`) · 18 `cp_m18_e_objetivo` · 19 [A] · 20 —

### Cena 7 — "A praia de cima" (`cs_m18_outro`, ≤ 70 s) + debrief
2 11:30–12:00 · 3 borda da falésia · 4 luz a abrir · 5 Lane, Morgan, Bell, Doyle, Castellano; Price (variante) · 6 Lane olha a praia depois do avanço: as mesmas embarcações, agora entre destroços e trabalho de socorro; macas; Price permanece a atender (se `present`) ou foi evacuado (cartela/`lineVariants`). Morgan: uma ordem curta. Cartela: a campanha continua; Caumont a 13/6. · 7 consequência canónica · 8 skip · 9 — · 10 — · 11 — · 12 a praia com macas · 13 `dlg_m18_040–042` · 14 vento; a praia abafada; nenhuma música · 15 beat: a praia (5 s) · 16 consolidated · 17 debrief · 18 `m18.completed`; `m18.group_size_top` · 19 variantes · 20 M19 lê `price_status`, `doyle_status`, `castellano_status`, `bell_status`.

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m18_reach_cover` | Alcance cobertura depois da rampa | sim | rampa | seixos | morte (restaurar A) | — | B |
| `obj_m18_regroup` | Reúna o grupo pela voz; cubra Price | sim | B | ≥ 4 reunidos | — | `price_status`, `whitaker_status` | C |
| `obj_m18_carry_whitaker` | Carregue Whitaker com Price | sim | explosão | ouriço | — | — | — |
| `obj_m18_deliver_material` | Leve material à equipa de abertura | sim | C | 2 secções | — | `material_delivered` | D |
| `obj_m18_climb` | Atravesse a saída e suba | sim | gap | topo | — | — | — |
| `obj_m18_consolidate` | Consolide acima da praia; mantenha o acesso | sim | topo | consolidated | — | `group_size_top` | E |

### 3.2 Setores
`s1_beach_section` (perto) · `s2_shingle_wire` (perto) · `s3_bluff` (perto) · `s4_neighbor_sectors` (médio: Easy Red/Fox Green, outros grupos, saídas) · `s5_fleet_sky` (longe: frota, embarcações, aviação, fogo naval). Agendas: morteiros; MG de E-3; erva a arder desde 07:30; outros grupos sobem 08:30; contra-ataque 10:30; macas na praia desde 09:00.

### 3.3 Checkpoints
A preparação · B primeira cobertura segura · C grupo reunido (Whitaker; Price) · D passagem · E objetivo acima da praia.

### 3.4 Justiça
Água/obstáculos com cobertura real; MG com clarão nas casamatas; morteiros com assobio; Whitaker fixo; Price só por tiro real sem supressão; fumo reduz visão para ambos.

---

## 4. Set pieces

### SP-18-1 "Rampa"
Contexto: LCVP. Preparação: gestos reconhecidos. Experiência: água, obstáculos, areia, seixos. Companheiros: dispersam; Morgan grita. Ambiente: destroços. Evolução: maré. Clímax: os seixos. Consequências: CP-B. Requisitos: [C] água. Integração: `obj_m18_reach_cover`.

### SP-18-2 "Segure a alça"
Contexto: seixos. Preparação: 2 s de silêncio; vozes. Experiência: cobrir Price; a explosão; carregar Whitaker com Price. Companheiros: Doyle explica; Bell cobre. Ambiente: macas improvisadas. Evolução: Price pode ser atingido. Clímax: fala 002. Consequências: `price_status`. Requisitos: [A] maca a dois; supressão. Integração: `obj_m18_regroup/carry_whitaker`.

### SP-18-3 "Pelo fumo"
Contexto: arame → falésia. Preparação: material entregue. Experiência: subir pelo fumo com outros a subir à esquerda; a praia de cima. Companheiros: equipa de abertura; outros grupos. Ambiente: erva a arder. Evolução: topo. Clímax: a vista. Consequências: `group_size_top`. Requisitos: [C] vertical; fumo. Integração: `obj_m18_climb/consolidate`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| LCVP | equipamento, cintos, medalha | — | — | fogo na água | Doyle vomita | — |
| praia | ouriços, estacas, destroços, feridos na água | outros grupos | maré | MG | — | — |
| seixos | macas improvisadas, arame | reunir | morteiros | — | Price; Whitaker | — |
| arame | erva a arder | equipa de abertura | — | atiradores | — | passagem |
| falésia | trilho, minas assinaladas | outros a subir | fumo | posições | — | — |
| trincheira | equipamento alemão | consolidar | — | contra-ataque | — | — |
| borda | a praia com macas | — | — | — | Price (variante) | — |

Objetos com origem: a medalha (Castellano, M14), a alça (maca improvisada de Price), as secções de bangalore (engenheiros), a erva a arder (fogo naval/morteiros), o equipamento alemão na trincheira.

---

## 6. Diálogos (VO inglês americano)

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Morgan | "Encontre cobertura. Depois procure a nossa voz." (§79) | antes da rampa | 1 | — |
| 002 | Price | "Segure a alça. Vamos levá-lo juntos." (§79) | Whitaker | 1 | — |
| 003 | Bell | "Há outros subindo pela esquerda." (§79) | falésia | 1 | — |
| 010 | Bell | "Sei quem está no barco. Mal vejo quem saiu." (PR #44) | intro t 10 | 3 | — |
| 011 | Price | "Bolsa fechada. Segunda cheia." (V1) | intro t 16 | 2 | — |
| 012 | Castellano | "São Cristóvão de novo. Hoje é para mim." (V1) | intro t 22 | 3 | — |
| 013 | Morgan | (`m14.morgan_trust ≥ 1`) "Lane: ouve os seixos como ouviste os muros." / (0) "Lane: cobertura. Só isso." (V1) | intro t 34 | 2 | — |
| 014 | Morgan | "Rampa! Água! Estacas!" (V1) | rampa | 0 | — |
| 015 | Bell | "Esquerda! Esquerda é menos!" (V1) | água | 1 | — |
| 016 | Doyle | "Não consigo—" (V1) | água | 3 | — |
| 017 | Morgan | "Consegues. Anda." (V1) | 016 | 1 | — |
| 018 | Morgan | "Seixos! Baixo!" (V1) | seixos | 0 | — |
| 019 | Lane | "Morgan! Bell!" (V1; interação) | chamar | 1 | 10 |
| 020 | Morgan | "Aqui." / Bell: "Aqui." / Doyle: "…aqui." / Castellano: "Aqui." (V1) | respostas | 1 | — |
| 021 | Price | "Não se mexam todos! Preciso da passagem!" (PR #44) | a tratar | 1 | — |
| 022 | Whitaker | (explosão) "…Deixaram-me! Deixaram-me ali!" (V1) | `evt_m18_whitaker_hit` | 1 | — |
| 023 | Doyle | "Não havia rota. Não havia. Agora há." (V1) | 022 | 1 | — |
| 024 | Morgan | "Lane: cobre o Price. Não é para atirar ao que já caiu. É para ele trabalhar." (V1) | cobertura | 1 | — |
| 025 | Price | (se atingido) "…bolsa. Leva a bolsa." (V1) | price_hit | 1 | — |
| 026 | engenheiro | "Bangalore! Quem tiver secções, aqui!" (V1) | arame | 1 | — |
| 027 | Morgan | "Duas secções. Lances. Vão." (V1) | material | 1 | — |
| 028 | engenheiro | "Cabeças! …Passagem." (V1) | detonação | 0 | — |
| 029 | Morgan | "Minas assinaladas. Entre as fitas." (V1) | trilho | 1 | — |
| 030 | Castellano | "O fumo é da erva. Serve." (V1) | fumo | 2 | — |
| 031 | Morgan | "Posições no topo. Suprimir e subir." (V1) | topo | 0 | 20 |
| 032 | Doyle | "Vejo-os! Vejo-os!" (V1) | — | 2 | — |
| 033 | Bell | "Esquerda. Não somos só nós." (V1) | 003 | 2 | — |
| 034 | Morgan | "Meio da falésia. Respira. Dois segundos." (V1) | a meio | 1 | — |
| 035 | Morgan | "Trincheira. É nossa se a ocuparmos." (V1) | topo | 1 | — |
| 036 | Morgan | "Acesso aberto para quem vier. Sinaliza." (V1) | consolidar | 1 | — |
| 037 | Bell | "Contra-ataque! Direita!" (V1) | — | 0 | 20 |
| 038 | grupo seguinte | "Subimos! Onde é a trincheira?" (V1) | seguintes | 2 | — |
| 039 | Morgan | "Consolidado. Ninguém desce." (V1) | consolidated | 1 | — |
| 040 | Lane | "Subimos. Agora ainda há homens lá em baixo." (PR #44) | outro | 2 | — |
| 041 | Price (variante present) | "Vou ficar com eles. Aqui em cima não há ninguém para tratar." (V1) / cartela (evacuado) | outro | 2 | — |
| 042 | Morgan | "Água. Depois, nada. Hoje não se fala." (V1) | outro | 1 | — |

Callouts: `co_m18_mg_bunker`, `co_m18_mortar`, `co_m18_mines`. Silêncios: 2 s atrás dos seixos; 2 s a meio da falésia.

---

## 7. Arte e atmosfera

**Paleta:** cinza de mar e seixos, castanho de areia molhada, preto de fumo de erva, verde-oliva de assault jacket, cinza de falésia. **Luz:** 06:25 cinzento (zénite `#7d8792`, horizonte `#b9bfc3`), 08:00 fumo de erva (haze castanho), 11:30 luz a abrir. **Materiais:** água, seixos, areia, arame, erva queimada, calcário. **Silhuetas:** as casamatas de E-3, a falésia, as embarcações, a frota. **Destruição:** destroços na praia (persistentes), erva queimada, trincheira. **Humanos:** assault jacket, M1 com rede, cinto de salva-vidas, molhados; Price com a bolsa; Whitaker na maca. **Violência reduzida:** feridos na água só por postura; Whitaker coberto.

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| LCVP | motor em caixa metálica, impactos, vozes | outras embarcações | fogo naval | — |
| praia | tiro aberto, água, surf, estacas | outros grupos | frota | — |
| seixos | seixos a rolar, morteiro, maca | — | — | **2 s** |
| arame | bangalore (detonação), erva a arder | — | — | — |
| falésia | vento, vozes dissonantes a reorganizar-se | outros a subir | — | 2 s |
| trincheira | contra-ataque | grupos seguintes | — | — |
| borda | vento; a praia abafada | — | — | — |

Sons novos: surf, seixos, bangalore (abstrato), erva a arder, falésia (oclusão). VO inglês.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Fonte/pendência |
| --- | --- | --- | --- |
| E/16 na 1.ª vaga; dispersa ~800 jardas; secção em Easy Red; 2/3 de baixas | D (resumo) | H17/H18; S-C20 | — |
| Saídas E-1/E-3; grupos pequenos sobem entre elas | D (geral) | H18 | P-C18 (trilho) |
| Erva a arder na falésia; maré a subir | D (geral) | — | — |
| Bangalores para abrir arame | D (geral) | — | — |
| Secção de Lane, Whitaker, equipa | F | — | — |
| Equipamento (assault jacket, M1 com rede, cinto) | D | — | auditoria |

**Proibições:** composições icónicas; placar; fim da campanha; Spalding/Dawson em cena. **Fora de cena:** Spalding, Dawson, Huebner.

---

## 10. Handoff técnico

**Contrato:** `id m18_omaha`, `order 18`, relógio 06:25→12:00, `cast` com leitura de `m14.*`, grupos (`grp_section`, `grp_gap_team`, `grp_other_groups`, `grp_following_groups`, `grp_de_bunkers`, `grp_de_top`, `grp_de_counter`), setores, checkpoints A–E, cutscenes (intro, outro), falas, flags, debrief.

**Flags:** `m18.completed`, `m18.price_status ∈ {present, wounded_evacuated}`, `m18.bell_status`, `m18.doyle_status`, `m18.castellano_status`, `m18.whitaker_status = wounded_evacuated` (fixo), `m18.material_delivered`, `m18.group_size_top`.

**Sistemas:** [C] água de praia (reutiliza), terreno vertical (reutiliza), fumo que reduz visão; [A] fogo como dados, supressão, rotação, maca a dois, interação de entrega; [D] leitura de flags de M14. 

**Disciplinas:** Level: 300 m de praia com obstáculos, seixos, arame, falésia 30 m, trincheira; Combate/IA: casamatas, posições no topo, contra-ataque; Arte: cinza e fumo; Personagens: 1.ª DI 1944 (8), alemães; Animação: água, maca a dois, bangalore (entrega); Som: surf/seixos; VO: inglês; Historiador: P-C18; QA: Price nas duas vias; Whitaker fixo; variantes de M14.

**Testes:** `price_status` só muda por tiro real sem supressão; Whitaker sempre evacuado; `group_size_top` 4–7; nenhum objetivo de abates.

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| Gestos na embarcação | (intro) | ver | Price, Bell, Morgan | — | start | CP-A |
| Rampa | `obj_m18_reach_cover` | água; estacas; areia | Morgan grita; Bell à esquerda | maré | rampa | CP-B |
| A nossa voz; Whitaker | `obj_m18_regroup/carry_whitaker` | chamar; cobrir Price; carregar | Price trata; Doyle explica | macas | B | CP-C; `price_status` |
| Material à equipa | `obj_m18_deliver_material` | carregar; entregar | equipa detona | passagem | C | CP-D |
| Pelo fumo | `obj_m18_climb` | subir; suprimir | outros à esquerda | erva queimada | gap | topo |
| Acima da praia | `obj_m18_consolidate` | trincheira; acesso | grupos seguintes | — | topo | CP-E |
| A praia de cima | debrief | — | Price (variante) | macas na praia | consolidated | `m18.completed` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 8 | sair da água e subir; a praia de cima. |
| 2 | Autenticidade | 7 | E/16 D; trilho P-C18. |
| 3 | Personagens | 8 | os quatro + Doyle/Castellano/Whitaker. |
| 4 | Diálogos | 8 | "Não é para atirar ao que já caiu. É para ele trabalhar." |
| 5 | Originalidade | 7 | risco de parecer qualquer "Omaha"; a direção (vozes, alça, fumo) é a defesa. |
| 6 | Variedade | 8 | água, reunir, carregar, entregar, subir, consolidar. |
| 7 | Set pieces | 8 | três. |
| 8 | Atmosfera | 8 | cinza e erva a arder. |
| 9 | Environmental storytelling | 8 | a praia de cima com macas. |
| 10 | Cinematográfica | 8 | pausas deliberadas de 2 s. |
| 11 | Sonora | 8 | caixa metálica → tiro aberto → vento. |
| 12 | Impacto emocional | 8 | Whitaker; Price. |
| 13 | Ritmo | 8 | 24–32 min. |
| 14 | Continuidade | 9 | lê M14; escreve para M19. |
| 15 | Integração técnica | 6 | água e vertical [C] (reutilizados). |

**Correções aplicadas:** (1) o ferido grave por explosão ganhou nome próprio (Whitaker, fixo) para não consumir Doyle/Castellano, que M19 precisa; (2) a .30 de Bell ficou na embarcação (honesto); (3) a tarefa de cobertura é explicitamente "para o Price trabalhar", não para disparar sobre caídos.
