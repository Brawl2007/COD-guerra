# M02 — CONTRA-ATAQUE · Dossiê de produção criativa

**Estado:** PLANEJADA (proposta de direção; nada implementado). **Canónico (§79):** 9–10/9/1939, região de Łęczyca/Bzura; Exército Poznań na ofensiva polonesa; POV Piotr Sokół; fonte H03; duração-alvo 20–26 min; as três falas de §79 e os quatro checkpoints nomeados. **Proposto nesta biblioteca:** 25.ª Divisão de Infantaria (S-C02, RECONSTRUÇÃO; regimento pendente P-C02), elenco secundário, relógio, objetivos, eventos, set pieces, falas novas, flags. Classes técnicas [A]/[B]/[C]/[D] conforme `CAMPAIGN-TECHNICAL-ROADMAP.md`.

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m02_bzura` / 2 |
| Datas | 1939-09-09T16:30+01:00 → 1939-09-10T09:00+01:00 (passagem de data dentro da missão, com cartela e checkpoint) |
| Local | margem norte do Bzura → acesso norte de Łęczyca (povoação e pomar: `RECONSTRUCTED`; eixo exato: P-C02) |
| Operação | contra-ofensiva do Grupo Operacional Knoll-Kownacki (Exército Poznań) sobre a 30.ª DI alemã (D) |
| Unidade | Exército Poznań (canónico) → 25.ª DI (R) → companhia ficcional |
| Elenco | Piotr Sokół (POV), Andrzej Lis (§73), plut. Władysław Gruca, kpr. Tomasz Wierzba, strz. Jurek Małek, san. Edmund Szymczak (propostas) |
| Fora de cena | gen. Kutrzeba, gen. Knoll-Kownacki (nomes só no debrief) |
| Intocável | datas, local, unidade, POV, fonte, as falas `dlg_m02_001–003`, os checkpoints "preparação; acesso; reorganização; cobertura da retirada", o resultado (êxito inicial; batalha perdida), Lis ferido e o seu estado para M03, elipse de dias no debrief |
| Herdado de M01 | nenhum ator; cartela explícita de nova unidade; a secção de Tczew **não** aparece |

---

## 1. Story Bible

**Logline.** Na tarde de 9 de setembro, Piotr Sokół atravessa com a sua secção os campos ao norte de Łęczyca na primeira ofensiva polaca da campanha. À noite a estrada é deles. Na manhã seguinte, com aviões por cima e o grupo da direita a recuar, a mesma estrada serve só para tirar gente dela — e Lis, que a chamava "a estrada de casa", é um dos que precisam de ser tirados.

**As oito respostas.**
1. **Situação central:** avançar por uma estrada que à noite já não é nossa.
2. **Modo de contar:** os cantos dobrados no mapa de Piotr (cada objetivo alcançado é um canto; no fim deixa de dobrar).
3. **Objeto:** o mapa de Piotr.
4. **Silêncio:** a pausa no pomar depois da tomada do acesso.
5. **Tarefa que não é matar:** manter aberto o corredor de suprimento; carregar a carroça de feridos; marcar o alemão ferido para os socorristas.
6. **Custo humano:** o alemão ferido no pomar (causa: baixas de Wierzba a 8/9 → reação 1: "Deixa-o." / reação 2: Lis marca o lugar com giz → consequência: `m02.pomar_wounded_marked`; a carroça de feridos passa por ele de manhã).
7. **Pessoas históricas:** fora de cena.
8. **Debrief:** regista o êxito local de 9–10/9, a paragem da ofensiva a 12–13/9, a contra-ofensiva alemã, a retirada pela Puszcza Kampinoska e o estado de Lis — sem vitória.

**Três motivos.** (a) *A iniciativa* — pela primeira (e única) vez na campanha polaca o jogador ataca; a missão ensina que atacar é escolher exposição. (b) *A estrada de casa* — Lis reconhece cada árvore; a guerra apaga as referências da infância. (c) *Os últimos* — o verbo muda de "avançar" para "manter a passagem para quem vem atrás".

**Temas.** Iniciativa e exposição; memória de lugar; responsabilidade por quem vem atrás; raiva (Wierzba) e contenção (Lis); o mapa que deixa de servir.

**Estrutura (12 beats de §54).** CONTEXTO (cartela) → INTRO (homens deitados na margem; preparação de artilharia) → APROXIMAÇÃO (vala ou pomar) → DIÁLOGO (Lis e a estrada) → PRIMEIRO CONTATO (MG na zagroda) → ESCALADA (o acesso; grupos separados) → COMBATE PRINCIPAL (corredor de suprimento sob pressão noturna) → SET-PIECE (o pomar; o alemão ferido) → PAUSA (noite; passagem de data) → CLÍMAX (manhã: Stukas, a direita recua, a última passagem; Lis) → CONSEQUÊNCIA (a carroça; o mapa sem cantos novos) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Perda/prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Piotr Sokół | seguro de que uma ordem clara basta; dobra o mapa | Lis (a estrada) | a direita recua; Lis ferido | de conquistar metros a manter a passagem | "Você vem conosco. A arma eu levo." (003); não dobra mais cantos |
| Andrzej Lis | confiante em reconhecer a estrada | Piotr; o giz de Szymczak | as referências desaparecem; ferido no clímax | de guia a carga | `m02.lis_status` |
| Władysław Gruca | ordens de três palavras | a secção | a ordem muda | fala menos; aponta mais | vivo (essencial) |
| Tomasz Wierzba | raiva (irmão morto a 8/9) | ninguém, por escolha | o alemão ferido | não se converte; obedece a Lis | vivo; silêncio |
| Jurek Małek | recruta que copia Lis | Lis | pode ser ferido no eixo exposto | — | `m02.malek_status` |
| Edmund Szymczak | giz e macas | todos | — | — | vivo |

**O que a missão recusa.** Ondas atrás de cada sebe; "spawn repentino" (§79); apresentar o êxito inicial como vitória (gate H03); uma segunda ponte; esperar contra o sol (M01); contagem em voz alta (M01).

---

## 2. Roteiro cinematográfico completo

Formato por cena (20 elementos): **1** nº/título · **2** hora · **3** local · **4** luz/clima · **5** presentes · **6** o que acontece · **7** porquê · **8** o jogador · **9** decisões · **10** aliados · **11** inimigos · **12** ambiente/transformação · **13** falas · **14** som · **15** câmara · **16** trigger de entrada · **17** trigger de saída · **18** consequências/flags · **19** sistemas/fallback/skip · **20** continuidade.

### Cena 1 — "Deitados na margem" (`cs_m02_intro`, skippable, ≤ 70 s)
2 9/9 16:30 · 3 margem norte do Bzura, linha de partida numa vala de drenagem · 4 sol baixo a oeste (azimute ~250°), luz dourada, poeira · 5 Piotr, Lis, Gruca, Wierzba, Małek, Szymczak; companhias vizinhas a leste e oeste (proxies) · 6 Tela preta: vento nos salgueiros, artilharia de preparação a norte. Cartela: ŁĘCZYCA — 9 DE SETEMBRO DE 1939 — 16:30 · 25.ª DIVISÃO DE INFANTARIA · EXÉRCITO "POZNAŃ". Fade-in em primeira pessoa deitado: Lis limpa o ferrolho ao lado; Gruca, de joelho, aponta com a mão a estrada, a fila de árvores e a zagroda ao fundo. · 7 estabelecer que o jogador **ataca** pela primeira vez e que outras companhias vão por outros eixos · 8 olha livremente; pode rastejar 3 m; recebe o mapa (prop: `folded_map_m02`) · 9 nenhuma · 10 companhias vizinhas levantam-se por vagas sem esperar · 11 artilharia alemã responde ao longe (sul) · 12 restolho, uma carroça civil abandonada na estrada · 13 `dlg_m02_010` (Gruca), `dlg_m02_001` (Lis, canónica), `dlg_m02_011` (Małek) · 14 artilharia polaca de 75 mm a norte (banda longa), 15 s de salvas; folhas · 15 primeira pessoa; beat t 12: Lis vira a cabeça para a estrada (target de 2 s) · 16 `missionStart` · 17 Gruca levanta-se (`evt_m02_prelude_end`) · 18 `cp_m02_a_preparacao` · 19 skip → jogador na vala com mapa; companhias em movimento · 20 cartela cumpre §73 (unidade nova, sem Tczew).

### Cena 2 — "Dois eixos" (jogável)
2 16:35–17:05 · 3 400 m de campo entre a vala e a zagroda · 4 poeira ao contraluz · 5 secção; proxies das companhias vizinhas (s3) · 6 Gruca dá a escolha: a vala (protegida, 250 m mais longa) ou a linha do pomar (curta, exposta ao MG da zagroda). O grupo segue o jogador. · 7 ensinar que atacar é escolher exposição · 8 escolhe o eixo; rasteja/corre por lances; identifica a origem do fogo pelas reações de Lis e pela poeira (sem marcador) · 9 `m02.axis ∈ {ditch, orchard}` · 10 Lis identifica a estrada; Małek copia; Wierzba resmunga · 11 MG34 na zagroda (dados de fogo como M01: clarão, traçante, supressão < 3 m); atiradores nas sebes · 12 restolho pisado; a vala tem água até ao tornozelo · 13 `dlg_m02_012`, `013`, `014a/b` · 14 tiros em vários planos; cascos ao longe · 15 livre · 16 `evt_m02_prelude_end` · 17 chegada à última cobertura antes da zagroda · 18 eixo pomar: Małek pode ser ferido (`evt_m02_malek_hit`, tiro real) · 19 [A] fogo como dados; [A] dois caminhos; nenhum skip · 20 —

### Cena 3 — "A zagroda" (jogável; `obj_m02_take_access`)
2 17:05–17:30 · 3 quinta murada que domina a estrada · 4 sol a tocar as copas · 5 secção; grupo de Wierzba pelo flanco · 6 Neutralizar a posição: suprimir a MG, flanquear pelo celeiro, entrar no pátio. Outros grupos tomam a sebe leste e a estrada (s2). · 7 o acesso é a chave do corredor · 8 suprime, flanqueia, entra; pode lançar granada wz.33 pela janela do celeiro · 9 flanco esquerdo (celeiro) vs direito (pátio aberto) · 10 Gruca suprime com o rkm; Wierzba vai primeiro · 11 guarnição da MG recua com um ferido pela porta sul (visível, sem close) · 12 pátio com galinhas, portão arrombado; o quadro de "sala" da quinta é um mapa de giz dos vizinhos · 13 `dlg_m02_015`, `016`, `017` · 14 MG a 30 m: estalos; silêncio do pátio depois · 15 livre; beat: 1,5 s a olhar o pátio vazio · 16 chegada à cobertura · 17 pátio limpo (nenhum atirador ativo em `s1`) · 18 `cp_m02_b_acesso`; canto do mapa dobrado (prop) · 19 [A]; interior do celeiro `RECONSTRUCTED` (um nível) · 20 —

### Cena 4 — "O pomar" (`cs_m02_orchard`, ≤ 40 s, jogável depois)
2 17:40–18:10 · 3 pomar de macieiras a sul da zagroda · 4 luz rasante entre as árvores; sombras longas · 5 secção; Szymczak; um alemão ferido (`de_orchard_wounded`, estado DOWN, desarmado) · 6 A pausa canónica: água, procura de desaparecidos, leitura do terreno. Lis: daqui vê a estrada de casa. Małek: "Parece igual ao de casa." Entre duas árvores, um alemão ferido que já não segura a arma. Wierzba quer deixá-lo. Lis: não podem transportá-lo; podem marcar o lugar com giz na árvore para os socorristas. · 7 o momento de custo humano; a estrada muda de significado · 8 pode **marcar** a árvore (interação abstrata com o giz de Szymczak, 2 s) ou não; pode dar-lhe água (interação) ou não; **não há recompensa**; se disparar sobre ele, `m02.fired_on_wounded` e 20 s de silêncio da secção (regra de M01) · 9 marcar / não marcar · 10 Wierzba afasta-se e vigia o sul; Szymczak estende o giz; Lis fica entre Wierzba e o alemão · 11 nenhum ativo · 12 macieiras com fruta; uma cesta tombada; o alemão respira · 13 `dlg_m02_018` (Lis, PR #44), `019` (Wierzba), `020` (Lis), `021` (Szymczak), `022` (Małek); se disparar: `023` (Gruca) · 14 **silêncio obrigatório**: só vento nas folhas e a respiração; `duck()` · 15 primeira pessoa; beat t 6: Lis olha para a estrada (3 s); t 14: olha para o alemão · 16 pátio limpo + 20 s · 17 Gruca: "Corredor." (`dlg_m02_024`) · 18 `m02.pomar_wounded_marked`; `m02.fired_on_wounded` · 19 [A] ator DOWN desarmado (como `de_spans_*` em M01); [B] interação de marcar; versão encenada: Lis marca sozinho · 20 de manhã a carroça passa pela árvore marcada (cena 7).

### Cena 5 — "O corredor" (jogável; `obj_m02_hold_supply_corridor`)
2 18:10–19:40 (pôr do sol ~19:10) · 3 estrada entre a zagroda e a orla de Łęczyca; vala paralela · 4 crepúsculo, fumo de Łęczyca a sul · 5 secção; mensageiro da companhia; carroça de suprimento (NPC) · 6 Reunir os grupos separados (Wierzba volta com dois homens de outra secção) e manter o corredor por onde passa a carroça de munição/água; pressão alemã de contra-ataques locais por sondas na sebe oeste · 7 o verbo passa de conquistar a manter · 8 posiciona a secção em dois pontos; cobre a carroça; rotação de cobertura por salvas reais (mecânica de M01) · 9 onde colocar o rkm; ir buscar os separados ou esperar · 10 Gruca distribui; Lis conhece um atalho · 11 sondas de infantaria pela sebe oeste; morteiros ao longe (sem dano invisível) · 12 estrada com sulcos de carroça; primeiro cadáver polaco coberto com capote · 13 `dlg_m02_025–029` · 14 cascos; rodas; tiros espaçados · 15 livre · 16 `dlg_m02_024` · 17 carroça chega (`evt_m02_supply_arrived`) ou é destruída (fogo real) · 18 `m02.supply_reached ∈ {0,1,2}` · 19 [A]; [C] carroça NPC com cavalo (nova família) · 20 —

### Cena 6 — "Noite" (`cs_m02_night`, ≤ 30 s, passagem de data)
2 19:40 → 10/9 05:30 · 3 orla de Łęczyca, posições consolidadas · 4 noite; incêndios a sul; depois, amanhecer cinzento · 5 secção · 6 Cartela: 10 DE SETEMBRO — 05:30. Os homens dormem sentados; Piotr dobra o segundo canto do mapa; Lis não dorme. Um mensageiro chega com a primeira notícia: aviões sobre a estrada ao amanhecer. · 7 passagem explícita de dias (§79) sem elipse mentirosa: só uma noite · 8 skip · 9 — · 10 — · 11 — · 12 orvalho; posições com restolho; a estrada com mais carroças · 13 `dlg_m02_030`, `031` · 14 silêncio noturno; artilharia muito longe · 15 fade; beat: mão com o mapa · 16 corredor resolvido · 17 cartela consumida · 18 `cp_m02_c_reorganizacao` (snapshot com data nova) · 19 [B] passagem de data (cartela + checkpoint + estado de setores) · 20 —

### Cena 7 — "A direita recuou" (jogável)
2 05:30–07:30 · 3 cruzamento da estrada com o caminho da zagroda · 4 manhã clara; sombras longas para oeste · 5 secção; mensageiros; grupo da direita (proxies em `s3`) · 6 Stukas atacam a estrada a leste (Ju 87 V2 reutilizado; impactos ≥ 30 m do jogador, regra de M01). O grupo da direita recua (visível a 300 m: homens a correr com feridos). Gruca: **"O grupo da direita recuou. Nossa ordem mudou."** (002). Prioridade: manter a passagem para o último grupo e tirar feridos. · 7 a pressão noutros setores muda a ordem (§79 ponto 4) · 8 reposiciona para cobrir o cruzamento; escolhe cobertura; lê as vias de chegada · 9 cobrir a estrada ou a sebe · 10 Wierzba calado; Małek pergunta se "perdemos" · 11 infantaria alemã pela sebe oeste e pela estrada; MG de apoio a 400 m · 12 crateras novas na estrada; a carroça de feridos passa pela macieira marcada (se `pomar_wounded_marked`: dois socorristas param 4 s) · 13 `dlg_m02_002` (canónica), `032–035` · 14 sirenes de Stuka; impactos; rodas · 15 livre; beat: olhar a direita a recuar (2 s target) · 16 cartela consumida · 17 último grupo anunciado (`evt_m02_last_group`) · 18 — · 19 [A] Ju 87 V2; [A] safeImpact · 20 —

### Cena 8 — "A última passagem" (clímax; `obj_m02_cover_last_group`)
2 07:30–08:20 · 3 cruzamento e 200 m de estrada até à carroça de feridos · 4 sol a leste (sem glare mecânico: não é o motivo de M02) · 5 secção; último grupo (12 proxies com 2 feridos); carroça · 6 Sustentar a passagem: cada baixa do último grupo é um tiro real alemão sem supressão (regra de M01). A meio, **Lis é atingido** na coxa (evento fixo `evt_m02_lis_hit`, como Bąk em M01). Piotr: **"Você vem conosco. A arma eu levo."** (003). O jogador pode carregá-lo (`carriedBy`) até à carroça ou cobrir enquanto Szymczak o leva; se nenhum, Lis fica. · 7 o clímax canónico; o estado de Lis para M03 · 8 cobre/suprime; carrega Lis (velocidade reduzida, sem disparar) ou cobre Szymczak · 9 carregar vs cobrir · 10 Szymczak vai buscar Lis se o jogador cobrir ≥ 20 s; Gruca ordena a retirada quando o último grupo passa · 11 pressão crescente pela sebe; MG · 12 estrada com feridos; a carroça carrega macas · 13 `dlg_m02_003` (canónica), `036–041` · 14 tiros; respiração de quem carrega (A-04 de M01) · 15 livre · 16 `evt_m02_last_group` · 17 último grupo passou + ordem (`evt_m02_withdraw_order`) · 18 `m02.lis_status ∈ {wounded_evacuated, wounded_walking, missing}`; sobreviventes do último grupo (10–12) · 19 [A] carriedBy; [A] baixas por tiro real; fallback: Szymczak · 20 Lis em M03 conforme flag.

### Cena 9 — "Carroça" (`cs_m02_outro`, ≤ 45 s) + debrief
2 08:20–09:00 · 3 estrada para norte, de regresso pela zagroda · 4 manhã · 5 Piotr, Gruca, Wierzba, Małek (se vivo), Szymczak; Lis na carroça (se evacuado) ou ausente · 6 A carroça parte pela mesma estrada por onde avançaram; Piotr tira o mapa e não dobra o canto. Se Lis está na carroça: olha para a estrada e diz a fala 042; se ausente: ninguém fala. · 7 consequência · 8 skip · 9 — · 10 — · 11 — · 12 a estrada com marcas de inversão (sulcos para norte sobre sulcos para sul) · 13 `dlg_m02_042` (Lis, só se evacuado), `043` (Piotr) · 14 rodas; sem música · 15 beat: mão com o mapa, canto não dobrado · 16 `evt_m02_withdraw_order` consumido · 17 debrief · 18 `m02.completed` · 19 skip aplica estado final · 20 debrief: 12–13/9 paragem; 14–17/9 contra-ofensiva; retirada pela Kampinos; Lis.

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto (jogador) | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m02_prepare` | Siga o plutonowy até à linha de partida | sim | `evt_m02_prelude_end` | chegar à vala (R 4 m) | — | — | A |
| `obj_m02_choose_axis` | Escolha o eixo: vala ou pomar | sim | prepare | entrar em qualquer eixo | — | `m02.axis` | — |
| `obj_m02_cross_under_cover` | Chegue à última cobertura antes da quinta | sim | choose_axis | zona `last_cover` | morte (restaurar A) | — | — |
| `obj_m02_take_access` | Neutralize a posição que domina a estrada | sim | cross | nenhum inimigo ativo em `zagroda_yard` | — | `evt_m02_access_taken` | B |
| `obj_m02_regroup` | Reúna os grupos separados | sim | access | Wierzba + 2 de volta (ou timeout 4 min → chegam sozinhos) | — | — | — |
| `obj_m02_hold_supply_corridor` | Mantenha o corredor até a carroça chegar | sim | regroup | `evt_m02_supply_arrived` ou carroça destruída | — | `m02.supply_reached` | — |
| `obj_m02_orchard` | Pausa: água, desaparecidos, terreno | sim (cena) | access + 20 s | `dlg_m02_024` | — | `m02.pomar_wounded_marked` | — |
| `obj_m02_night` | (cartela) | sim | corredor | cartela | — | — | C |
| `obj_m02_cover_crossroads` | Cubra o cruzamento; a ordem mudou | sim | cartela | `evt_m02_last_group` | — | — | — |
| `obj_m02_cover_last_group` | Sustente a passagem do último grupo | sim | last_group | último proxy passa x_cross | — | sobreviventes 10–12 | — |
| `obj_m02_lis` | Leve Lis à carroça | **opcional** | `evt_m02_lis_hit` | Lis em `wagon_point` | ordem de retirada sem Lis → `missing` | `m02.lis_status` | — |
| `obj_m02_withdraw` | Retire para a carroça | sim | `evt_m02_withdraw_order` | `wagon_point` | — | `m02.completed` | D |

Regra §74: nenhum objetivo usa contagem de inimigos; `regroup` tem timeout com recuperação (os separados chegam sozinhos).

### 3.2 Setores de batalha ao redor

| Setor | Camada | Agenda (independente do jogador) |
| --- | --- | --- |
| `s1_north_access` | perto (0–150 m) | 16:30 preparação → 17:05 contacto MG → 17:30 pátio limpo → 18:10 corredor → noite → 05:30 pressão → 07:30 última passagem → 08:20 retirada |
| `s2_town_edge` | médio (150–500 m) | outros grupos tomam a sebe leste (17:20) e a estrada (18:00); à noite consolidam; de manhã recuam por vagas |
| `s3_fields` | médio | companhias vizinhas avançam por vagas (16:35–18:30); a direita recua (06:40) |
| `s4_sky` | longe | 10/9 06:10 Stukas sobre a estrada leste (impactos ≥ 30 m); 07:50 segunda passagem (só som e fumo, com marca visual — lição de M01 E-04) |
| `s5_columns` | longe | colunas alemãs a sul; fumo de Łęczyca; artilharia |

### 3.3 Checkpoints

| CP | Trigger | Restaurar |
| --- | --- | --- |
| A preparação | `evt_m02_prelude_end` | todos vivos; proxies em vagas; mapa no inventário |
| B acesso | pátio limpo | eixo escolhido; Małek estado; pátio limpo; corredor por iniciar |
| C reorganização | cartela 10/9 | data nova; `supply_reached`; `pomar_wounded_marked`; posições noturnas; setores em `dawn` |
| D cobertura da retirada | `evt_m02_withdraw_order` | `lis_status`; sobreviventes; carroça; destruição da estrada |

### 3.4 Dificuldade/justiça
Nunca morrer por Stuka fora de aviso (sirene 6 s + sombra); a MG da zagroda suprime antes de matar; o último grupo perde homens por tiros reais apenas sem supressão (12–20 s sem fogo do jogador), mínimo 10 sobreviventes.

---

## 4. Set pieces

### SP-02-1 "Dois eixos"
**Contexto:** linha de partida, 16:35. **Preparação:** Gruca aponta; Lis nomeia a estrada; companhias vizinhas levantam-se. **Experiência:** o jogador escolhe e sente a diferença (água na vala; poeira e traçantes no pomar). **Companheiros:** seguem o eixo; Małek copia Lis; Wierzba vai à frente no pomar. **Ambiente:** restolho, carroça civil, sebes. **Evolução:** a MG abre fogo ao primeiro movimento visível; a vala chega tarde (a MG já cobre o pátio); o pomar chega cedo e exposto (Małek pode cair). **Clímax:** a última cobertura. **Consequências:** `m02.axis`, `m02.malek_status`. **Requisitos:** [A] dois caminhos + fogo como dados; [B] água na vala (material/áudio). **Integração:** `obj_m02_choose_axis`/`cross`.

### SP-02-2 "O pomar"
**Contexto:** pausa canónica depois do acesso. **Preparação:** Lis falou da estrada na cena 1; Wierzba perdeu o irmão a 8/9 (dito na cena 2). **Experiência:** silêncio, água, um homem a respirar entre duas árvores. **Companheiros:** Wierzba afasta-se; Lis interpõe-se; Szymczak oferece o giz. **Ambiente:** maçãs, cesta, giz na casca. **Evolução:** marcar/não marcar; água/não; disparar/não. **Clímax:** a fala de Lis (018). **Consequências:** flag; silêncio da secção se disparar; a carroça de manhã. **Requisitos:** [A] ator DOWN; [B] interação de marcar; [B] silêncio com `duck()`. **Integração:** `obj_m02_orchard`.

### SP-02-3 "A última passagem"
**Contexto:** 07:30, a direita recuou. **Preparação:** Stukas às 06:10 mostraram o preço da estrada. **Experiência:** cobrir homens que correm; cada baixa é um tiro real; Lis cai. **Companheiros:** Szymczak vai buscar Lis se o jogador cobrir; Gruca ordena a retirada ao último homem. **Ambiente:** crateras; a carroça carrega macas. **Evolução:** carregar vs cobrir. **Clímax:** a fala 003 de Piotr. **Consequências:** `m02.lis_status`; sobreviventes. **Requisitos:** [A] `carriedBy`; [A] baixas por tiro real; [A] escolta. **Integração:** `obj_m02_cover_last_group`, `obj_m02_lis`.

---

## 5. Environmental storytelling

| Setor/fase | Estado inicial | Atividade | Tensão | Combate | Humanos | Consequência | Transição |
| --- | --- | --- | --- | --- | --- | --- | --- |
| vala/campo 16:30 | restolho, carroça civil abandonada, salgueiros | companhias por vagas | preparação de artilharia | MG da zagroda | homens deitados | pisadas, um capote caído | — |
| zagroda 17:05 | quinta murada, galinhas, mapa de giz dos vizinhos na parede | — | MG na janela | flanqueamento | guarnição recua com ferido | portão arrombado, cartuchos | pátio vazio |
| pomar 17:40 | macieiras, cesta, fruta | pausa | o alemão a respirar | — | Wierzba/Lis | giz na árvore | a carroça de manhã |
| estrada 18:10 | sulcos, primeiro cadáver coberto | carroça | sondas na sebe | rotação de cobertura | mensageiro | mais carroças à noite | — |
| noite | posições; incêndios a sul | dormir sentado | — | — | Lis acordado | orvalho | cartela |
| manhã 05:30 | mesma estrada com crateras | a direita a recuar | Stukas | pressão | feridos | sulcos invertidos | debrief |

**Catálogo de objetos com origem:** carroça civil (família que fugiu a 7/9); mapa de giz (os vizinhos combinaram a evacuação); cesta de maçãs (colheita interrompida); capote sobre o morto (Szymczak); giz (Szymczak marca feridos e portas); crateras (Stukas 06:10).

---

## 6. Diálogos

**Política:** VO polaco, legendas PT. `001–003` literais de §79. Propostas marcadas (PR #44) ou (V1). Prioridade: 0 proteção · 1 missão · 2 resposta · 3 ambiente. Cooldown em segundos.

| ID | Falante | Texto | Gatilho / condição | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Lis | "Era a estrada de casa. Agora procuro onde esconder a cabeça." (§79) | cena 1 t 14 | 1 | — |
| 002 | Gruca | "O grupo da direita recuou. Nossa ordem mudou." (§79) | `evt_m02_right_group_withdraws` | 1 | — |
| 003 | Piotr | "Você vem conosco. A arma eu levo." (§79) | `evt_m02_lis_hit` + jogador a < 4 m | 1 | — |
| 010 | Gruca | "Vala: chegamos tarde. Pomar: chegamos vistos. Escolhe, Sokół." (V1) | cena 1 t 8 | 1 | — |
| 011 | Małek | "É a primeira vez que vamos para a frente deles?" (V1) | cena 1 t 20 | 3 | — |
| 012 | Lis | "Daqui ainda vejo a estrada de casa." (PR #44) | eixo escolhido | 2 | — |
| 013 | Wierzba | "O meu irmão ficou ontem na ponte. Não me fales de casa." (V1) | 012 + 4 s | 2 | — |
| 014a | Lis | "Deitem-se. É da janela do celeiro." (V1) | 1.ª rajada da MG, eixo pomar | 0 | 20 |
| 014b | Lis | "Têm a estrada no fio de mira. A vala leva-nos por baixo." (V1) | 1.ª rajada, eixo vala | 0 | 20 |
| 015 | Gruca | "Rkm à esquerda. Wierzba, celeiro." (V1) | chegada à última cobertura | 1 | — |
| 016 | Wierzba | "Vou primeiro. Não me cubram, atirem." (V1) | 015 + 2 s | 2 | — |
| 017 | Gruca | "Pátio. Devagar." (V1) | MG calada | 1 | — |
| 018 | Lis | "A estrada era nossa ontem. Hoje só conseguimos tirar gente dela." (PR #44) | pomar t 14 | 2 | — |
| 019 | Wierzba | "Deixa-o. Os nossos também ficaram." (V1) | pomar t 18 | 2 | — |
| 020 | Lis | "Não o levamos. Marcamos. O Szymczak sabe o que fazer." (V1) | 019 + 3 s | 2 | — |
| 021 | Szymczak | "Giz na casca. Os deles também sabem ler." (V1) | jogador a < 2 m do giz | 2 | — |
| 022 | Małek | "Parece igual ao de casa." (V1) | pomar t 8 | 3 | — |
| 023 | Gruca | "Não gasto homens nem balas com quem já caiu. Nem você." (V1; regra de M01) | tiro sobre o ferido | 1 | — |
| 024 | Gruca | "Corredor." (V1) | fim do pomar | 1 | — |
| 025 | Gruca | "Dois postos. Um na vala, um no celeiro." (V1) | início do corredor | 1 | — |
| 026 | Lis | "Há um atalho pelo canavial. Vou buscar o Wierzba." (V1) | regroup | 2 | — |
| 027 | mensageiro | "A carroça vem pela estrada. Precisam dela de pé." (V1) | carroça a 300 m | 1 | — |
| 028 | Wierzba | "Trouxe dois. Os outros não sei." (V1) | regroup done | 2 | — |
| 029 | Szymczak | "Água na carroça. Um gole cada." (V1) | supply_arrived | 2 | — |
| 030 | Lis | "Não durmo. A estrada à noite parece outra." (V1) | cena 6 | 3 | — |
| 031 | mensageiro | "Aviões ao amanhecer. Sobre a estrada." (V1) | cena 6 fim | 1 | — |
| 032 | Lis | "Sombra! Para a vala!" (V1) | Stuka (sombra) | 0 | 15 |
| 033 | Małek | "Perdemos?" (V1) | 002 + 3 s | 3 | — |
| 034 | Gruca | "Ainda não. Mas já não é para a frente." (V1) | 033 + 2 s | 2 | — |
| 035 | Szymczak | (se marcado) "A árvore. Dois minutos." (V1) | carroça junto da macieira | 2 | — |
| 036 | Gruca | "Último grupo! Cubram a estrada!" (V1) | `evt_m02_last_group` | 0 | — |
| 037 | Lis | "Estou vendo a sebe. Esquerda, baixo." (V1) | 1.ª salva alemã | 0 | 20 |
| 038 | Lis | (atingido) "…a perna." (V1) | `evt_m02_lis_hit` | 1 | — |
| 039 | Szymczak | "Cubra-me que eu vou buscá-lo!" (V1) | jogador não carrega em 20 s | 1 | — |
| 040 | Gruca | "Passaram. Retirar pela estrada!" (V1) | último proxy | 0 | — |
| 041 | Wierzba | "…Lis." (V1; só se `missing`) | ordem sem Lis | 2 | — |
| 042 | Lis | "Antes seguíamos a estrada. Agora seguimos os últimos." (PR #44, adaptada) | outro, só se evacuado | 2 | — |
| 043 | Piotr | (sem voz; legenda de pensamento proibida) — gesto: não dobra o canto | outro | — | — |

Callouts: `co_m02_mg_window` ("Janela!"), `co_m02_stuka_shadow`, `co_m02_wagon_hit`, `co_m02_ally_hit`, reutilizando os perfis de M01 (`co_m01_*`). Contrato de silêncio: pomar (cena 4) e 2 s após cada bomba.

---

## 7. Arte e atmosfera

**Paleta:** ocre de restolho, verde-cinza de macieira, tijolo e cal da zagroda, poeira dourada ao contraluz; manhã de 10/9 cinzenta e depois clara.

| Fase | Zénite | Horizonte | Sol | Skylight | Névoa | Exposição | Uniformes (wz.36) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 16:30 | `#8fa6c2` | `#e9c89a` | az 250°, el 22°, `#ffd9a0` | médio | poeira 0,06 | 1,05 | caqui quente, sombras longas |
| 18:30 | `#6f86a8` | `#f0b07a` | az 268°, el 6° | baixo | fumo sul | 1,0 | contraluz; silhuetas |
| 19:40 | `#2f3a52` | `#b05a3a` (incêndios) | abaixo | baixo | fumo 0,1 | 0,9 | cinza-azul |
| 05:30 | `#5a6a80` | `#c9c0b0` | az 75°, el −2° | baixo | orvalho/névoa 0,08 | 0,95 | frio |
| 07:30 | `#7f9bc0` | `#e6dcc8` | az 95°, el 18° | médio | poeira 0,05 | 1,05 | caqui claro |

**Materiais:** restolho (alto albedo, −15 % verde), terra de vala com água, tijolo caiado, madeira de celeiro, macieiras (família nova de vegetação V1). **Silhuetas:** fila de álamos na estrada, a zagroda, a torre da igreja de Łęczyca ao longe (`RECONSTRUCTED`, P-C02). **Destruição:** crateras de Stuka na estrada (persistentes), celeiro com telhado furado, sulcos invertidos. **Violência reduzida:** o morto coberto; o alemão ferido sem sangue visível na versão reduzida (só postura e respiração).

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio | Música |
| --- | --- | --- | --- | --- | --- |
| 16:30 | vento nos salgueiros, ferrolho de Lis | companhias a levantar-se | artilharia polaca 75 mm a norte | — | motivo I na cartela (10 s) |
| avanço | passos no restolho/água na vala; rajadas de MG34; estalos a < 3 m | tiros em vários planos | artilharia alemã a sul | — | — |
| zagroda | granada, galinhas, portão | — | — | 1,5 s no pátio | — |
| pomar | folhas, respiração do alemão, giz | — | — | **obrigatório** | — |
| corredor | rodas, cascos, rkm | sondas na sebe | Łęczyca a arder | — | — |
| noite | grilos, respiração | — | artilharia | obrigatório (fade) | — |
| manhã | sirene de Stuka, impactos, rodas | a direita a recuar (gritos a 300 m) | segunda passagem (som + fumo) | 2 s após cada bomba | — |
| outro | rodas | — | — | — | motivo I no debrief |

Sons novos: carroça/cavalo, macieiras, artilharia polaca de 75 mm, água na vala. VO polaco.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| Contra-ofensiva do Exército Poznań sobre a 30.ª DI alemã a 9/9 | D | H03; S-C02 | leitura integral |
| Łęczyca retomada na noite de 9/9 pela 25.ª DI | R (uma fonte secundária) | S-C02 | P-C02: regimento/eixo |
| Ataque a partir da margem norte do Bzura para sul | R | conhecimento geral; S-C02 ambíguo | P-C02 |
| Paragem a 12–13/9; contra-ofensiva alemã; retirada pela Kampinos 17–19/9 | D (geral) | H03 | — |
| Luftwaffe ativa sobre as estradas a 10/9 | R | geral | — |
| Pomar, zagroda, cruzamento | `RECONSTRUCTED` | — | mapa |
| Alemão ferido abandonado; carroça; Wierzba | F | — | — |
| Lis ferido; Piotr e Lis chegam a Varsóvia | F (plausível) | — | — |
| Equipamento: wz.98a/wz.29, rkm wz.28, wz.33, wz.36; MG34, Kar98k; Ju 87 | D | H30 | auditoria |

**Proibições:** apresentar o êxito como vitória; blindados alemães no pátio; MP40 padrão; Zieliński/Jan; Tczew. **Fora de cena:** Kutrzeba, Knoll-Kownacki.

---

## 10. Handoff técnico

**Contrato `mission.json` (schema 1 de M01):** `id m02_bzura`, `order 2`, `dateStart/End` com fuso CET, `location` (lat/lon aprox. 52.06 N 19.20 E, `latLonCertainty: approx`), `operation`, `faction PL`, `formation Exército Poznań`, `unit 25.ª DI (R)`, `protagonist piotr_sokol`, `cast` (6 + proxies), `groups` (`grp_section`, `grp_wierzba`, `grp_last_group`, `grp_de_zagroda`, `grp_de_probe_w`), `clock` com segmentos (16:30→19:40 escala 1×; noite snap; 05:30→09:00), `phases`, `objectives` (§3.1), `events` (ids listados), `sectors` (§3.2), `checkpoints` (A–D), `cutscenes` (`cs_m02_intro`, `cs_m02_orchard`, `cs_m02_night`, `cs_m02_outro`), `dialogue` (§6), `callouts`, `continuityFlags`, `debrief`.

**Flags:** `m02.completed`, `m02.axis`, `m02.malek_status`, `m02.wierzba_status`, `m02.supply_reached`, `m02.corridor_held`, `m02.pomar_wounded_marked`, `m02.fired_on_wounded`, `m02.lis_status`, `m02.last_group_survivors`.

**Sistemas:** [A] simulação/eventos/setores/checkpoints de M01; fogo inimigo como dados; supressão; baixas por tiro real; `carriedBy`; Ju 87 V2; `safeImpact`. [B] passagem de data; interação de marcar (padrão `sapper_crate`); água na vala; macieiras. [C] carroça com cavalo (NPC); proxies de companhias em vagas (padrão `pl_east_*` com movimento). [D] nenhum.

**Requisitos por disciplina (19):** Dir. criativo: aprovar a 25.ª DI e o pomar · Roteirista: VO polaco e registo · Designer narrativo: flags e variantes de Lis · Game designer: gate do último grupo (tolerância) · Level designer: 400 m de campo, zagroda de um nível, pomar, cruzamento · Combate/IA: sondas e MG com dados · Dir. arte: tabela de luz · Ambiente: restolho, macieiras, zagroda · Personagens: 6 polacos 1939 (reutilizar kit M01 com cabeças novas), alemães 1939 · Animação: carregar ferido (clip de M01), marcar com giz (novo curto) · Cinematografia: 4 cutscenes ≤ 3 min total · Som: carroça, macieiras, 75 mm · Compositor: motivo I · VO: 6 vozes + mensageiro · Historiador: P-C02 · Eng. simulação: data interna; carroça · Eng. render: campo aberto 600 m com LOD · QA: 12 sementes do último grupo; skip; restore C → data correta · Produtor: depende de M01 Marco 2.

**Testes a acrescentar:** dados (IDs, falas 001–003 literais, cronologia 9→10/9), sobreviventes do último grupo 10–12 em 12 sementes, `lis_status` nas três vias, restore em C conserva data e flags, skip de cada cutscene.

**Riscos:** campo aberto de 600 m sem "corredor"; carroça (nova família); dois eixos equilibrados.

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo jogável | Ação do jogador | Comportamento dos NPCs | Transformação ambiental | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| A primeira ofensiva começa | `obj_m02_prepare` | seguir Gruca; receber o mapa | companhias levantam-se por vagas | artilharia a norte; poeira | `missionStart` | CP-A |
| Lis reconhece a estrada | `obj_m02_choose_axis` | escolher vala/pomar | Lis guia; Małek copia; Wierzba resmunga | — | 010 | `m02.axis` |
| A MG da zagroda abre fogo | `obj_m02_cross_under_cover` | identificar origem; lances | Lis avisa; Gruca suprime | restolho pisado; traçantes | 1.º movimento visível | Małek pode cair |
| O acesso cai | `obj_m02_take_access` | suprimir, flanquear, entrar | Wierzba vai primeiro; guarnição recua com ferido | portão arrombado | pátio limpo | CP-B; canto dobrado |
| O alemão no pomar | `obj_m02_orchard` | marcar/água/nada | Wierzba afasta-se; Lis interpõe-se | giz na casca | pátio + 20 s | `pomar_wounded_marked` |
| A carroça precisa da estrada | `obj_m02_hold_supply_corridor` | dois postos; cobrir | mensageiro; sondas recuam | sulcos; carroças | 024 | `supply_reached` |
| Noite | `obj_m02_night` | — | Lis não dorme | orvalho; incêndios | corredor | CP-C (data) |
| Stukas e a direita recua | `obj_m02_cover_crossroads` | cobrir o cruzamento | direita recua com feridos; Gruca diz 002 | crateras | 06:10/06:40 | ordem muda |
| A última passagem | `obj_m02_cover_last_group` | suprimir sem parar | baixas por tiro real; Szymczak | macas na carroça | `evt_m02_last_group` | sobreviventes |
| Lis cai | `obj_m02_lis` | carregar ou cobrir | Szymczak vai se coberto | — | `evt_m02_lis_hit` | `lis_status` |
| A ordem de retirar | `obj_m02_withdraw` | chegar à carroça | Gruca conta | sulcos invertidos | último proxy | CP-D |
| A carroça volta pela estrada | debrief | — | Lis fala se evacuado | — | outro | `m02.completed` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 8 | Ofensiva única da campanha polaca; a inversão da estrada é limpa. Fragilidade: a divisão é reconstrução. |
| 2 | Autenticidade | 7 | Datas/operação D; eixo e regimento P-C02. |
| 3 | Personagens | 7 | Lis e Wierzba carregam a missão; Gruca/Małek/Szymczak funcionais. |
| 4 | Diálogos | 8 | 43 falas com gatilho; canónicas literais; registo a decidir. |
| 5 | Originalidade | 7 | Pomar e carroça são originais; o resgate de Lis ecoa Bąk (diferenciado pela consequência de campanha). |
| 6 | Variedade | 8 | escolha de eixo, assalto, corredor, pausa, data, cobertura, transporte. |
| 7 | Set pieces | 8 | três, todas sobre eventos reais do roteiro. |
| 8 | Atmosfera | 7 | luz por hora definida; depende de macieiras/carroça novas. |
| 9 | Environmental storytelling | 8 | objetos com origem; sulcos invertidos. |
| 10 | Cinematográfica | 7 | ≤ 3 min de cutscene; sem câmara externa. |
| 11 | Sonora | 7 | assinatura clara; sons novos [C]. |
| 12 | Impacto emocional | 8 | a estrada; Lis; o canto não dobrado. |
| 13 | Ritmo | 8 | pausa, noite, manhã; 20–26 min plausíveis. |
| 14 | Continuidade | 9 | Lis em três estados para M03; sem Tczew. |
| 15 | Integração técnica | 8 | maioria [A]; carroça e proxies em vagas [C]. |

**Correções aplicadas na revisão:** (1) o resgate de Lis passou a ter uma terceira via (Szymczak, se o jogador cobrir ≥ 20 s) para não ser cópia de Bąk; (2) a "pressão aérea e blindada" foi movida para a manhã de 10/9 (Stukas de noite seriam implausíveis); (3) o alemão ferido recebeu a regra de M01 (sem parede falsa, com custo).
