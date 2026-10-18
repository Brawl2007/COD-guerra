# M04 — ATÉ O MAR · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** 31/5/1940, perímetro/praia de Dunquerque; BEF; POV Arthur Reed; fonte H05; 20–28 min; três falas; objetivo secundário de Whitfield (localizado em posição alcançável; ajudar o deslocamento até ao embarque → evacuado; senão desaparecido/capturado conforme script final, sem morte inventada); checkpoints "entroncamento; perímetro; embarque; deslocamento final"; barcos por agenda própria; sem resgate impossível. **Proposto:** setor leste do perímetro (4.ª Divisão, Furnes–Nieuport, S-C27, RECONSTRUÇÃO; P-C04), praia de La Panne/Bray-Dunes com "cais de camiões", relógio, elenco, flags.

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m04_dunkerque` / 4 |
| Datas | 1940-05-31T06:30+02:00 → 1940-05-31T22:40+02:00 (fuso de verão: P-C04) |
| Local | entroncamento a sul de La Panne → pátios de quinta → posição do perímetro no canal (Furnes–Nieuport) → praia (La Panne/Bray-Dunes) — `RECONSTRUCTED`; o molhe de Dunquerque **não** é usado (setor errado) |
| Operação | Dynamo; 31/5: 68 014 evacuados; perímetro leste pela 4.ª Divisão (II Corps); praias belgas evacuadas nessa noite (D, S-C27) |
| Unidade | BEF (canónico) → batalhão da 4.ª Divisão (R) → secção ficcional |
| Elenco | Reed (POV), cabo George Whitfield (§73), sgt. Harold Pryce, pte. Len Fletcher, pte. Dennis Crowe, AB Tom Hale (marinheiro), maqueiro RAMC (propostas) |
| Fora de cena | Lord Gort, gen. Alexander, v-alm. Ramsay |
| Intocável | data, local, POV, falas `dlg_m04_001–003`, checkpoints, barcos com agenda própria, Whitfield condicional sem morte, "chegar à Inglaterra é sobrevivência, não apaga a derrota" |
| Setor | só britânicos no setor leste (a Bélgica capitulou a 28/5); a cooperação francesa pertence ao setor oeste — por isso não aparece aqui (§79 "conforme o setor confirmado") |

---

## 1. Story Bible

**Logline.** Numa estrada entupida de camiões sem gasolina, Arthur Reed vê o cabo Whitfield ajudar um estranho a subir para um transporte que vai partir com lugares a menos. Até à noite, Reed vai cobrir uma passagem, perder uma estrada, aguentar um canal e levar feridos até à água. O barco não espera por ninguém; o que decide quem embarca é quanto espaço se abriu para os outros.

**As oito respostas.**
1. **Situação central:** a praia não espera; cobrir quem embarca e não embarcar.
2. **Modo de contar:** lugares no barco (o barco tem 20; o jogador vê quem entra).
3. **Objeto:** a correia de lona do camião do entroncamento (Whitfield corta-a para improvisar um apoio; Reed guarda-a na bolsa — o gesto de ajeitar a alça nasce aqui e volta em M20).
4. **Silêncio:** o motor do barco que engole as vozes (canónico).
5. **Tarefa que não é matar:** reunir desgarrados; entregar feridos ao embarque; organizar a fila; localizar Whitfield.
6. **Custo humano:** um homem insulta o motorista por partir com lugares limitados (causa: a escassez) → Whitfield impede a agressão / Fletcher ri de nervos → a fila continua; `m04.queue_kept`.
7. **Pessoas históricas:** fora de cena.
8. **Debrief:** regista os 68 014 evacuados de 31/5, a evacuação das praias belgas nessa noite, a continuação de Dynamo até 4/6 e o estado de Whitfield; "sobrevivência, sem apagar a derrota em terra".

**Três motivos.** (a) *A agenda da praia* — barcos chegam e partem sem o jogador; (b) *o espaço que se abre* — a vitória local é abrir lugar para outros; (c) *a estrada que se ouve* — Reed: "Ainda ouço a estrada." (003).

**Temas.** Lealdade confundida com ficar; disciplina de embarque; medo de aviões; abandono involuntário; a derrota sem heroísmo.

**Estrutura (§54).** CONTEXTO → INTRO (camiões, pneus, homens a dormir sentados; Whitfield procura a estrada) → APROXIMAÇÃO (retaguarda até ao entroncamento) → DIÁLOGO (o motorista; a fila) → PRIMEIRO CONTATO (Stukas sobre a estrada) → ESCALADA (rota impraticável; pátios) → COMBATE PRINCIPAL (posição no canal) → SET-PIECE (feridos ao embarque; cais de camiões) → PAUSA (a praia à espera) → CLÍMAX (último deslocamento; Whitfield alcançável; o barco) → CONSEQUÊNCIA (lugar vazio ou ocupado) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Reed | revê cada abrigo antes de embarcar; ficar = lealdade | Whitfield (o gesto do camião) | Whitfield fica para trás | forma grupos viáveis em vez de salvar todos | no barco; a estrada ainda se ouve |
| Whitfield | ajuda estranhos | Reed | ferido na perna ao cobrir a maca (evento fixo às 20:10) | — | `m04.whitfield_status` |
| Pryce | líder com relógio | a secção | a ordem de adelgaçar | fala menos | vivo |
| Fletcher | veterano falador | — | ri de nervos; pode ser ferido | — | `m04.fletcher_status` |
| Crowe | recruta: "há barcos?" | Reed | — | pára de perguntar | vivo |
| Hale (marinheiro) | gere a prancha | ninguém | a maca | — | parte com o barco |

**O que a missão recusa.** Praia genérica; barcos estáticos; todo o barco a explodir; molhe de Dunquerque no setor errado; franceses no setor leste; um Whitfield morto; demolição (M01).

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "Camiões parados" (`cs_m04_intro`, ≤ 75 s)
2 06:30 · 3 estrada secundária a sul de La Panne, fila de camiões sem gasolina · 4 manhã nublada, vento do norte; fumo preto dos tanques de Dunquerque a oeste (D) · 5 Reed, Pryce, Fletcher, Crowe; Whitfield a 30 m a ajudar um homem exausto a subir ao último camião com motor · 6 Cartela: PERÍMETRO DE DUNQUERQUE — 31 DE MAIO DE 1940 — 06:30 · 4.ª DIVISÃO · FORÇA EXPEDICIONÁRIA BRITÂNICA. Pneus queimados; homens a dormir sentados; Whitfield pergunta a um polícia militar qual estrada ainda passa. · 7 estabelecer o gesto de Whitfield antes de o pôr em risco (PR #44) · 8 olhar; andar 5 m · 9 — · 10 — · 11 — · 12 camiões com motores desmontados (sabotagem ordenada), bicicletas, malas · 13 `dlg_m04_010` (Pryce), `011` (Whitfield), `012` (Crowe) · 14 motores parados; um só motor a trabalhar; aviões ao longe · 15 beat t 14: Whitfield empurra o homem para cima (target 3 s) · 16 `missionStart` · 17 Pryce: "Entroncamento." · 18 `m04.whitfield_gesture_seen` (apresentação) · 19 skip → estrada · 20 —

### Cena 2 — "A fila" (jogável; `obj_m04_rearguard`)
2 06:35–07:30 · 3 estrada até ao entroncamento (600 m), valas, uma quinta · 4 nublado · 5 secção; desgarrados (6 proxies de unidades misturadas); polícia militar; motorista do camião · 6 Acompanhar a retaguarda; reunir desgarrados (interação curta: "connosco"); no entroncamento, o camião vai partir com lugares a menos; um homem (desgarrado) insulta o motorista e agarra a porta; Whitfield impede a agressão; Fletcher ri de nervos · 7 o momento de custo humano; aprender o ritmo da retirada · 8 reúne 3–6 desgarrados; pode intervir na fila (aproximar-se: Whitfield já resolve; se o jogador empurrar o homem, Pryce repreende) · 9 ordem de reunião · 10 Whitfield organiza; Pryce conta · 11 nenhum; aviões altos · 12 sinalização confusa; um canhão AT abandonado · 13 `dlg_m04_013–018`, `001` (Whitfield, canónica) · 14 um motor; discussão; vento · 15 livre · 16 Pryce · 17 chegada ao entroncamento + camião parte · 18 `cp_m04_a_entroncamento`; `m04.queue_kept`; `m04.stragglers` · 19 [A]; [B] interação "connosco" · 20 —

### Cena 3 — "Stukas na estrada" (jogável; `obj_m04_cover_passage`)
2 07:30–09:00 · 3 entroncamento; 300 m de estrada aberta até uma fila de salgueiros · 4 nublado; sol fraco · 5 secção; feridos em maca; coluna de outra unidade · 6 Cobrir a passagem de soldados e feridos pela estrada; Stukas atacam alvos adequados (a coluna, o camião) com sirene, sombra, tempo de reação; bombas ≥ 30 m · 7 §79 ponto 2 · 8 cobre; manda abrigar; carrega uma maca 60 m se escolher · 9 cobrir vs carregar · 10 Whitfield ajuda macas; Crowe abriga-se tarde · 11 Ju 87 (Ju 87 V2 reutilizado) em duas passagens · 12 crateras; um camião a arder; macas na vala · 13 `dlg_m04_019–023` · 14 sirenes; bombas na vala com atraso · 15 livre · 16 CP-A · 17 coluna passa (`evt_m04_column_passed`) · 18 `m04.fletcher_status` (tiro/estilhaço real) · 19 [A] · 20 —

### Cena 4 — "A rota acabou" (jogável; `obj_m04_find_route`)
2 09:00–10:30 · 3 estrada bloqueada por artilharia → pátios de duas quintas → canal · 4 fumo · 5 secção; um padre/agricultor? **não** (civis belgas evacuados a 28–30/5; usar uma quinta vazia com gado solto) · 6 A rota torna-se impraticável (bombardeamento atinge a estrada: evento agendado); cruzar pátios; alcançar a posição do perímetro no canal, com defensores britânicos já em posição · 7 §79 ponto 3 · 8 navega por pátios; ajuda a abrir um portão; chega à posição · 9 pátio esquerdo (gado, lama) vs direito (muro, atirador) · 10 Pryce; Whitfield fecha a retaguarda · 11 sondas alemãs do outro lado do canal; morteiros · 12 vacas soltas, leite derramado, uma casa com a mesa posta · 13 `dlg_m04_024–027` · 14 gado; morteiros · 15 livre · 16 estrada atingida · 17 posição alcançada · 18 `cp_m04_b_perimetro` · 19 [A]; [C] gado (NPC simples) opcional [B] estático · 20 —

### Cena 5 — "O canal" (jogável; `obj_m04_hold_canal`)
2 10:30–15:00 (escala acelerada do relógio entre contactos; `readyScale`) · 3 posição na margem do canal Furnes–Nieuport; dique; casa de eclusa · 4 sol entre nuvens · 5 secção; pelotão britânico vizinho; Bren · 6 Aguentar a margem contra sondas e tentativas de travessia (botes a 200 m, rechaçados pelo pelotão vizinho); a tarefa de Reed: ligar o posto vizinho (telefone), levar munição à Bren, cobrir um recuo de posto · 7 "a resistência do perímetro" (batalha ao redor) com participação local · 8 dispara a alvos a 150–400 m; leva munição; liga o posto · 9 — · 10 Bren com guarnição própria; pelotão vizinho rechaça os botes sem o jogador · 11 infantaria alemã do outro lado; artilharia · 12 dique com sacos; a casa de eclusa com vidros partidos · 13 `dlg_m04_028–032` · 14 Bren; botes; artilharia · 15 livre · 16 CP-B · 17 ordem de adelgaçar (`evt_m04_thin_out`, 15:00) · 18 `m04.canal_posts_linked` · 19 [A] fogo como dados; [B] telefone (interação) · 20 —

### Cena 6 — "Feridos ao embarque" (jogável; `obj_m04_deliver_wounded`)
2 19:30–20:30 (elipse de deslocamento ao anoitecer com cartela curta "19:30 — ordem de retirar para a praia") · 3 dunas → praia de La Panne/Bray-Dunes; "cais de camiões" (camiões alinhados na água como molhe, D para Bray-Dunes; `RECONSTRUCTED` aqui) · 4 anoitecer; mar com ondulação; fumo · 5 secção; marinheiro Hale; filas de homens; barcos pequenos a fazer vaivém; um contratorpedeiro ao largo · 6 Entregar feridos ao embarque: dois homens em maca levados pelo cais de camiões até ao bote; Hale: "Devagar com a maca. Abram passagem." (002). Barcos chegam e partem por agenda própria; outros grupos têm lugares. Às 20:10 Whitfield é ferido (estilhaço na perna, evento fixo) ao cobrir a maca e fica num posto de socorro nas dunas (posição alcançável). · 7 §79 ponto 4 + objetivo secundário · 8 carrega maca (dupla), espera pela prancha, entrega; vê a agenda · 9 — · 10 Hale; maqueiro; Pryce lê a hora · 11 bombardeamento esporádico da praia; um avião · 12 camiões na água; equipamento largado na areia (capacetes, Bren sem tripé) · 13 `dlg_m04_033–037`, `002` (Hale, canónica) · 14 ondas; motores de bote; apitos · 15 livre · 16 cartela 19:30 · 17 2 macas entregues · 18 `cp_m04_c_embarque`; `m04.wounded_delivered`; `evt_m04_whitfield_hit` · 19 [A] carriedBy (maca a dois: [B]); [C] água de praia; [C] barcos com agenda · 20 —

### Cena 7 — "O último deslocamento" (clímax; `obj_m04_last_move` + `obj_m04_whitfield`)
2 20:30–22:20 · 3 dunas, posto de socorro, 400 m de praia até ao bote designado · 4 noite a cair; incêndios; holofote de um navio · 5 secção; Whitfield no posto (pode andar apoiado); desgarrados; Hale no bote · 6 Cobrir o último deslocamento do grupo até à embarcação designada (20 lugares). Whitfield está a 250 m, alcançável; ajudar o seu deslocamento (apoio: velocidade reduzida, sem disparar) permite a sua evacuação; se o jogador não for buscá-lo antes de o bote encher/partir (agenda: 22:10), fica `missing`. Um soldado (Pryce) interrompe qualquer tentativa de regresso solitário à estrada perdida: não há resgate impossível. · 7 clímax canónico e objetivo secundário · 8 decide: buscar Whitfield (e ceder o seu lugar? não — o bote tem lugares para a secção; o custo é tempo e exposição) ou cobrir a fila; apoia Whitfield · 9 ir / não ir · 10 Pryce conta lugares; Crowe guarda lugar; Hale grita a hora · 11 artilharia na praia (aviso de assobio); um atirador nas dunas (dados) · 12 fila na água até à cintura; equipamento abandonado · 13 `dlg_m04_038–044` · 14 ondas; motor do bote; vozes · 15 livre; beat: contagem de lugares (Pryce, 2 s) · 16 CP-C · 17 bote parte (`evt_m04_boat_leaves`) · 18 `m04.whitfield_status`, `m04.boat_places_used` · 19 [A] escolta/apoio (padrão `carriedBy` leve); [C] barcos · 20 M20.

### Cena 8 — "O motor" (`cs_m04_outro`, ≤ 50 s) + debrief
2 22:20–22:40 · 3 bote → contratorpedeiro · 4 noite; costa em fogo · 5 secção; Whitfield (variante) ou lugar vazio · 6 O motor abafa as vozes. Reed olha para o lugar vazio ou para Whitfield. Reed: "Ainda ouço a estrada." (003). Cartela: chegada a Dover 1/6; Dynamo até 4/6. · 7 consequência · 8 skip · 9 — · 10 — · 11 — · 12 a costa a arder · 13 `dlg_m04_003` (canónica); `045` (Whitfield, só se evacuado) · 14 **silêncio obrigatório**: motor, água; nenhuma fala além das duas · 15 beat: lugar vazio/ocupado (3 s) · 16 bote parte · 17 debrief · 18 `m04.completed` · 19 variantes por flag · 20 M20 (gesto da alça).

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m04_rearguard` | Acompanhe a retaguarda e reúna desgarrados | sim | intro | entroncamento | — | `m04.stragglers` | A |
| `obj_m04_cover_passage` | Cubra a passagem da coluna e dos feridos | sim | A | `evt_m04_column_passed` | — | `fletcher_status` | — |
| `obj_m04_find_route` | A estrada acabou: chegue à posição do perímetro | sim | estrada atingida | posição | — | — | B |
| `obj_m04_hold_canal` | Ligue os postos e aguente a margem | sim | B | `evt_m04_thin_out` | — | `canal_posts_linked` | — |
| `obj_m04_deliver_wounded` | Entregue os feridos ao embarque | sim | cartela 19:30 | 2 macas | — | `wounded_delivered` | C |
| `obj_m04_whitfield` | Whitfield está no posto das dunas. Ajude-o a chegar ao bote | **secundário** | `evt_m04_whitfield_hit` | Whitfield no bote antes de partir | bote parte sem ele → `missing` | `whitfield_status` | — |
| `obj_m04_last_move` | Cubra o último deslocamento e alcance o bote | sim | C | jogador no bote | ficar fora → o bote seguinte (agenda) com aviso; nunca softlock | `boat_places_used` | D |

### 3.2 Setores
`s1_road_junction` (perto, manhã) · `s2_canal` (perto, dia) · `s3_beach` (perto, noite) · `s4_perimeter_mid` (médio: pelotão vizinho, botes rechaçados, outras colunas) · `s5_sea_sky` (longe: navios, Stukas, combate aéreo ao longe, incêndios de Dunquerque). Agendas independentes: Stukas 07:50/08:30; estrada atingida 09:00; botes alemães 12:30; adelgaçar 15:00; barcos na praia a cada ~8 min desde 19:30.

### 3.3 Checkpoints
A entroncamento · B perímetro · C embarque (feridos entregues; Whitfield ferido no posto) · D deslocamento final (**recuperável**: se o jogador perder o bote, restaura C com o bote seguinte).

### 3.4 Justiça
Stukas sempre com sirene e sombra; artilharia na praia com assobio; o bote avisa 3 vezes (Hale) antes de partir; Whitfield só é `missing`, nunca morto.

---

## 4. Set pieces

### SP-04-1 "O camião que parte"
Contexto: entroncamento. Preparação: Whitfield ajudou um estranho (cena 1). Experiência: a fila, o insulto, a mão de Whitfield. Companheiros: Fletcher ri; Pryce conta. Ambiente: camiões sabotados. Evolução: o camião parte com lugares a menos. Clímax: fala 001. Consequências: `queue_kept`. Requisitos: [A] cena com atores; [B] interação de reunir. Integração: `obj_m04_rearguard`.

### SP-04-2 "Cais de camiões"
Contexto: praia ao anoitecer. Preparação: feridos carregados desde a estrada. Experiência: andar sobre camiões na água com uma maca; o bote balança. Companheiros: Hale; maqueiro. Ambiente: equipamento na areia. Evolução: barcos chegam/partem sem o jogador. Clímax: a maca entregue; Whitfield ferido. Consequências: CP-C. Requisitos: [C] água; [C] barcos; [B] maca a dois. Integração: `obj_m04_deliver_wounded`.

### SP-04-3 "Vinte lugares"
Contexto: o último bote. Preparação: Whitfield no posto. Experiência: decidir ir buscá-lo sob artilharia; a fila na água; a contagem. Companheiros: Pryce impede o regresso à estrada; Crowe guarda lugar. Ambiente: holofote do navio. Evolução: o bote enche. Clímax: parte. Consequências: `whitfield_status`. Requisitos: [A] apoio ao ferido; [C] barcos. Integração: `obj_m04_last_move`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| estrada 06:30 | camiões sabotados, pneus queimados, bicicletas, malas | homens a dormir sentados | aviões altos | — | Whitfield e o estranho | — |
| entroncamento | sinalização confusa, canhão AT abandonado | fila | o insulto | — | polícia militar | camião parte |
| estrada aberta | salgueiros | coluna com macas | sirenes | Stukas | feridos na vala | crateras, camião a arder |
| quintas | gado solto, leite, mesa posta | — | morteiros | — | — | portão aberto |
| canal | dique, casa de eclusa, sacos | pelotão vizinho | botes | sondas | guarnição da Bren | — |
| praia | camiões na água, capacetes, Bren sem tripé | filas, botes | artilharia | atirador | Hale; maqueiros | o bote parte |

Objetos com origem: camiões com motores partidos (ordem de sabotagem), a correia de lona (Whitfield), o canhão AT sem culatra, a mesa posta (família belga evacuada a 28/5), o Bren sem tripé (largado na fila).

---

## 6. Diálogos

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Whitfield | "Enquanto eles passam, nós ficamos." (§79) | camião parte | 1 | — |
| 002 | Hale (marinheiro) | "Devagar com a maca. Abram passagem." (§79) | maca no cais | 1 | — |
| 003 | Reed | "Ainda ouço a estrada." (§79) | outro | 1 | — |
| 010 | Pryce | "Sem gasolina, sem ordens. Entroncamento, e depois logo se vê." (V1) | intro t 6 | 1 | — |
| 011 | Whitfield | "Consegue subir? Apoie-se em mim." (PR #44) | intro t 14 | 2 | — |
| 012 | Crowe | "Há barcos, sargento?" (V1) | intro t 20 | 3 | — |
| 013 | Pryce | "Quem vem connosco, vem agora." (V1) | desgarrados | 1 | — |
| 014 | desgarrado | "Esse camião é nosso também!" (V1) | fila | 2 | — |
| 015 | Whitfield | "Deixem-no respirar. Há outro atrás dele." (PR #44) | agressão | 1 | — |
| 016 | Fletcher | (riso) "Outro. Claro que há." (V1) | 015 + 2 s | 3 | — |
| 017 | Pryce | "Reed. Não é a tua fila." (V1) | jogador empurra | 1 | — |
| 018 | motorista | "Vinte. Nem mais um." (V1) | partida | 2 | — |
| 019 | Pryce | "Sirene! Vala!" (V1) | Stuka | 0 | 20 |
| 020 | Whitfield | "A maca. Dois homens." (V1) | maca na estrada | 1 | — |
| 021 | Crowe | "Eles voltam?" (V1) | após 1.ª passagem | 3 | — |
| 022 | Fletcher | "Sempre voltam." (V1) | 021 | 3 | — |
| 023 | Pryce | "Passaram. Agora a estrada." (V1) | coluna passou | 1 | — |
| 024 | Pryce | "Acabou a estrada. Pelos pátios." (V1) | estrada atingida | 1 | — |
| 025 | Whitfield | "Fecho a retaguarda. Vão." (V1) | pátios | 2 | — |
| 026 | Crowe | "Deixaram a mesa posta." (V1) | casa | 3 | — |
| 027 | defensor | "Secção à eclusa. Bren à direita." (V1) | posição | 1 | — |
| 028 | guarnição Bren | "Munição! Caixa verde!" (V1) | Bren vazia | 1 | 30 |
| 029 | defensor | "Botes! A duzentos!" (V1) | botes | 0 | — |
| 030 | Pryce | "Não são nossos. Deixa o pelotão tratar." (V1) | 029 | 2 | — |
| 031 | Whitfield | "Posto ligado. Eles ainda respondem." (V1) | telefone | 2 | — |
| 032 | Pryce | "Adelgaçar. Para a praia ao anoitecer." (V1) | 15:00 | 1 | — |
| 033 | Hale | "Camiões até ao bote. Um de cada vez." (V1) | praia | 1 | — |
| 034 | Pryce | "Barco a cada oito minutos. Não é o nosso." (V1) | 1.º bote | 2 | — |
| 035 | Whitfield | (atingido) "…perna. Vão com a maca." (V1) | `evt_m04_whitfield_hit` | 1 | — |
| 036 | maqueiro | "Posto nas dunas. Ele anda, apoiado." (V1) | 035 + 4 s | 1 | — |
| 037 | Hale | "Última maca. Bom." (V1) | 2.ª maca | 1 | — |
| 038 | Pryce | "O nosso é o das vinte e dez. Vinte lugares." (V1) | CP-C | 1 | — |
| 039 | Crowe | "Guardo-lhe o lugar, cabo." (V1) | jogador vai a Whitfield | 3 | — |
| 040 | Hale | "Dez minutos!" / "Cinco!" / "Último aviso!" (V1) | agenda | 0 | — |
| 041 | Whitfield | "Não me leves se for ficar alguém de fora." (V1) | apoio | 2 | — |
| 042 | Pryce | "Reed! A estrada já não é nossa. Para a água." (V1) | jogador volta para sul | 0 | 20 |
| 043 | Pryce | "Dezoito. Dezanove. Vinte." (V1) | fila | 1 | — |
| 044 | Hale | "Larga!" (V1) | bote parte | 0 | — |
| 045 | Whitfield | "Continue a olhar para a costa. Só até sairmos." (PR #44, atribuída a Whitfield) | outro, se evacuado | 2 | — |

Callouts: `co_m04_stuka_siren`, `co_m04_shell_whistle`, `co_m04_boat_warning`. Silêncio: o motor (outro).

---

## 7. Arte e atmosfera

**Paleta:** água cinza, areia pálida, fumo preto, verde-sujo de dunas, caqui molhado. **Luz:** 06:30 nublado (zénite `#8d97a3`, horizonte `#c9c6bb`, Sol difuso), 12:00 sol entre nuvens, 19:30 contraluz do mar com fumo preto (horizonte `#d9a56a` filtrado por `#3a3a3a`), 22:00 noite com incêndios e holofote. **Materiais:** lona, metal queimado, areia molhada, madeira de camião, água de praia com espuma. **Silhuetas:** a coluna de fumo de Dunquerque, a fila de camiões na água, o contratorpedeiro. **Destruição:** crateras na estrada, camião a arder, equipamento na areia (persistente). **Humanos:** battledress 1937, Mk II, muitos sem capacete, molhados até à cintura; Whitfield com a perna ligada. **Violência reduzida:** feridos cobertos nas macas.

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| estrada | um motor, discussão, pneus | coluna | aviões altos; artilharia do perímetro | — |
| Stukas | sirene, sombra, bomba na vala | — | — | 2 s após |
| quintas | gado, leite, portão | morteiros | — | — |
| canal | Bren, telefone, botes | pelotão vizinho | artilharia | — |
| praia | ondas, motores de bote, apitos, camiões a ranger | filas | navios; incêndios | — |
| bote | motor | — | costa | **obrigatório** |

Sons novos: água de praia, botes pequenos, multidão em fila, camiões na água. VO inglês britânico.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| 31/5: 68 014 evacuados; dia mais intenso | D | S-C27 | — |
| 4.ª Divisão em Furnes–Nieuport; II Corps a leste | D | S-C27 | P-C04 (batalhão) |
| Praias belgas (La Panne) evacuadas na noite de 31/5 | D | S-C27 | — |
| Cais de camiões (Bray-Dunes) | D (local); R aqui | geral | P-C04 |
| Ordem de sabotar veículos | D (geral) | — | — |
| Fumo dos tanques de petróleo | D | — | — |
| Só britânicos no setor leste | R/D | geral | confirmar |
| Whitfield, Pryce, Fletcher, Crowe, Hale | F | — | — |
| Equipamento BEF 1940; Ju 87 | D | — | auditoria |

**Proibições:** molhe de Dunquerque (setor errado); barcos estáticos; todo o oceano à espera; Whitfield morto. **Fora de cena:** Gort, Alexander, Ramsay.

---

## 10. Handoff técnico

**Contrato:** `id m04_dunkerque`, `order 4`, relógio 06:30→22:40 com segmentos (manhã 1×; canal `readyScale`; cartela 19:30; praia 1×), `entry cs_m04_intro`, `exit` → M05 (cartela nova; Reed volta em M20), grupos (`grp_section`, `grp_stragglers`, `grp_column`, `grp_neighbor_platoon`, `grp_bren`, `grp_de_probes`, `grp_boats`), setores §3.2, checkpoints A–D (D recuperável com bote seguinte), cutscenes (intro, cartela 19:30, outro), falas, flags, debrief.

**Flags:** `m04.completed`, `m04.stragglers`, `m04.queue_kept`, `m04.fletcher_status`, `m04.crowe_status`, `m04.canal_posts_linked`, `m04.wounded_delivered`, `m04.whitfield_status ∈ {evacuated, missing}`, `m04.boat_places_used`.

**Sistemas:** [A] simulação, Ju 87 V2 + safeImpact, fogo como dados, `carriedBy`/apoio, escolta (Pryce impede regresso: padrão de escolta de Zieliński invertido). [B] maca a dois; telefone; interação "connosco". [C] água de praia (profundidade, velocidade, som), barcos com agenda e lugares, multidão (proxies em fila), gado opcional. [D] nenhum.

**Disciplinas:** Level: estrada 600 m, duas quintas, 300 m de canal, 500 m de praia; Combate/IA: sondas no canal, atirador nas dunas; Arte: fumo preto persistente, camiões na água; Personagens: BEF 1940 (6) + desgarrados variados + marinheiro RN; Animação: apoiar ferido a andar, maca a dois, subir ao bote; Som: água, botes; VO: inglês; Historiador: P-C04; Eng. sim: agenda de barcos com lugares; QA: `whitfield_status` nas duas vias, perder o bote → recuperação, skip.

**Testes:** dados; agenda de barcos determinística; Whitfield nunca morto; CP-D recuperável; `boat_places_used ≤ 20`.

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação do jogador | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| Whitfield ajuda um estranho | (intro) | ver | Whitfield empurra | — | start | gesto visto |
| A fila e o camião | `obj_m04_rearguard` | reunir; (não) empurrar | Whitfield impede; Fletcher ri; Pryce repreende | camião parte | fila | `queue_kept`; CP-A |
| Stukas sobre a coluna | `obj_m04_cover_passage` | abrigar/cobrir/carregar maca | macas; Crowe tarde | crateras; camião a arder | sirene | `fletcher_status` |
| A estrada acabou | `obj_m04_find_route` | pátios | Whitfield na retaguarda | portão | estrada atingida | CP-B |
| O canal aguenta | `obj_m04_hold_canal` | disparar; munição; telefone | pelotão rechaça botes | — | B | `canal_posts_linked` |
| Ordem de retirar à praia | (cartela) | — | — | anoitecer | 15:00 | — |
| Feridos ao bote | `obj_m04_deliver_wounded` | maca pelo cais de camiões | Hale; maqueiro | — | praia | CP-C |
| Whitfield ferido | `obj_m04_whitfield` | ir buscá-lo e apoiar | Crowe guarda lugar; Pryce impede regresso | — | 20:10 | `whitfield_status` |
| Vinte lugares | `obj_m04_last_move` | chegar ao bote | Pryce conta; Hale avisa | o bote parte | agenda | CP-D |
| O motor | debrief | — | Whitfield fala se evacuado | costa a arder | bote | `m04.completed` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 8 | A agenda da praia e os vinte lugares dão forma à derrota. |
| 2 | Autenticidade | 7 | setor e praia D/R; batalhão P-C04; fuso a confirmar. |
| 3 | Personagens | 7 | Whitfield e Pryce; Fletcher/Crowe funcionais. |
| 4 | Diálogos | 8 | 45 falas; contagem de lugares como ritmo. |
| 5 | Originalidade | 7 | cais de camiões e a contagem; o resgate de Whitfield é mecânica conhecida, diferenciada pelo custo (tempo, não lugar). |
| 6 | Variedade | 8 | fila, cobertura aérea, pátios, canal, maca, decisão, embarque. |
| 7 | Set pieces | 8 | três ancoradas em factos. |
| 8 | Atmosfera | 8 | fumo preto, contraluz, água. |
| 9 | Environmental storytelling | 8 | sabotagem, mesa posta, Bren sem tripé. |
| 10 | Cinematográfica | 7 | sem câmara externa; o outro no bote é forte. |
| 11 | Sonora | 8 | o motor que engole as vozes. |
| 12 | Impacto emocional | 8 | lugar vazio/ocupado. |
| 13 | Ritmo | 7 | dia longo com `readyScale` no canal; risco de 28 min. |
| 14 | Continuidade | 9 | gesto da alça; `whitfield_status` para M20. |
| 15 | Integração técnica | 6 | água, barcos e multidão são [C]. |

**Correções aplicadas:** (1) retirado o molhe de Dunquerque e os franceses (setor leste); (2) o ferimento de Whitfield passou a evento fixo às 20:10 (antes dependia de o jogador "o encontrar", o que criava escolha falsa); (3) CP-D tornado recuperável com o bote seguinte (nunca softlock por perder o bote).
