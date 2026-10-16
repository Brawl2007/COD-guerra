# M23 — CERCADOS · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** Bastogne, 23–26/12/1944; Foy, 13/1/1945; 506.º Regimento Paraquedista, 101.ª Divisão; POV Isaac Bennett; fontes H22/H23; 26–36 min; três falas; checkpoints "23/12; defesa estabilizada; 26/12; 13/1; aproximação; consolidação — cada passagem de data cria snapshot consistente, com suprimento e elenco atualizados"; a melhoria das condições para suprimento aéreo não resolve tudo num instante; "o alívio histórico não acontece porque Bennett matou o último inimigo; outras unidades cumprem a operação"; Foy a 13/1/1945, nunca em dezembro; "não reproduzir cenas, líderes ou falas de adaptações famosas de Easy Company"; final: Bennett entrega as luvas a um homem diferente daquele para quem as guardou. **Proposto:** Bennett na Companhia I do 3.º Batalhão (S-C19: Foy atacada a 13/1 às 09:00 pelas companhias E e I; o 3/506 defendera Foy em dezembro — P-C23), as luvas como objeto e como prova de ausência (PR #44), a noite no buraco como silêncio, os rendidos ao frio como custo humano (`m23.pows_sheltered`), `m23.ritter_status` como estado de conhecimento de Bennett (não como "resgate"), `m23.gloves_given_to = ferraro`. **Sistemas:** [C] neve (superfície, pegadas, capas improvisadas), C-47 de largadas e colunas blindadas como NPC por agenda; [D] três snapshots por data; [A] tudo o resto.

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m23_bastogne_foy` / 23 |
| Datas | Ato I 1944-12-23T09:30+01:00 → 16:30 · Ato II 1944-12-26T15:00+01:00 → 1944-12-27T01:00+01:00 · Ato III 1945-01-13T08:00+01:00 → 13:00 (hora da Europa Central) |
| Local | bosque a sul/sudeste de Foy, a leste da estrada Foy–Bastogne (buracos com troncos; um posto avançado 150 m à frente; o caminho de suprimento para trás) → a zona de receção das largadas (um campo atrás das posições, **não** o DZ principal: um ponto de recolha de contentores desviados — P-C23) → 26/12: a mesma linha, menos homens, mais neve; a estrada de retaguarda; o posto de socorro do batalhão numa quinta → 13/1: a orla do bosque virada a Foy; 400 m de campo nevado; o flanco direito (leste) da povoação: quintas, celeiro, a igreja ao fundo (silhueta) — `RECONSTRUCTED` (P-C23) |
| Operação | cerco de Bastogne (20–26/12); céu limpo e largadas a 23/12 (D); a 4.ª Divisão Blindada abre o corredor pelo sul a 26/12 (~16:50; D); ataque a Foy a 13/1/1945 às 09:00 pelas companhias E e I do 506.º, casa a casa, dezenas de prisioneiros; contra-ataque a 14/1; Noville a 15/1 (S-C19 — DOCUMENTED em resumo) |
| Unidade | 506.º PIR, 101.ª (canónico) → 3.º Btl., Companhia I (proposta, RECONSTRUCTED) → esquadra de Bennett |
| Elenco | pfc. Isaac Bennett (POV), sgt. Walt Ingram (graduado — proposta), T/5 Nate Vogel (socorrista), pte. Cal Ritter (o homem das luvas, no posto avançado), pte. Lenny Shaw (recruta que treme), cabo Gus Hadley (o zangado), pte. Dom Ferraro (reforço que chega a 13/1; recebe as luvas), pfc. Abel Munro (ferido de 23/12, transportável — proposta), um estafeta da companhia, o tenente de pelotão só por voz (ten. Cassidy — proposta), prisioneiros alemães de Foy (um que fala: Obergefreiter, sem nome; "Kalt"), uma coluna de camiões/blindados NPC a 26–27/12 (propostas) |
| Fora de cena | gen. Anthony McAuliffe; a 4.ª Blindada e o corredor de Assenois (só por relato e som); **nenhuma figura da Companhia E** |
| Intocável | as três datas, a unidade, o POV, falas `dlg_m23_001–003`, os seis checkpoints (snapshot por data: suprimento, elenco, ferimentos, rostos), "as largadas não resolvem tudo", "outras unidades cumprem o alívio", Foy só em janeiro, nenhuma cena/líder/fala de adaptações da Companhia E, as luvas entregues a outro homem, "cerco rompido e ataque bem-sucedido não apagam frio, ferimentos e perdas" |

---

## 1. Story Bible

**Logline.** Num buraco com dois troncos por cima, Isaac Bennett guarda um par de luvas para Cal Ritter, que está no posto avançado e não tem nenhumas. Durante três dias leva munição, vê o céu abrir-se e os paraquedas descerem longe de mais, defende cinquenta metros de bosque e aprende que o frio mata devagar e sem tiros. Quando a coluna abre o corredor a 26, Bennett não disparou o último tiro: ouve-o pela rádio, e a sua tarefa é a estrada. Em janeiro, com lençóis por cima dos capotes, avança sobre um campo branco até Foy. Num abrigo da vila, entrega as luvas a Dom Ferraro, um reforço que conheceu nessa manhã.

**As oito respostas.**
1. **Situação central:** cercados; um par de luvas guardado para alguém (MASTER-STORY-BIBLE §4).
2. **Modo de contar:** luvas e cobertores distribuídos — a guerra conta-se por quem tem o que, não por inimigos.
3. **Objeto:** as luvas (generosidade quotidiana → prova de ausência → objeto para os vivos; PR #44).
4. **Silêncio:** a noite no buraco, neve a cair (23/12 fim de ato; repetido a 26/12 só com o som das colunas ao longe).
5. **Tarefa que não é matar:** levar munição; acompanhar as largadas; distribuir; apoiar a retirada de feridos; manter a estrada; ir ao posto de socorro; preparar; avançar; proteger um flanco; abrigar rendidos; entregar as luvas.
6. **Custo humano:** 13/1, Foy — prisioneiros alemães (dezenas na vila; oito no celeiro do setor da esquadra) tremem no pátio a −10 °C (causa: foram rendidos sem capotes, a vila ainda sob contra-fogo) → Hadley quer deixá-los no pátio ("Eles deixaram os nossos nos buracos.") / Vogel lembra os recursos ("Há a cave e há dois cobertores a mais desde ontem. Mais um morto de frio é mais um que não interrogam.") → o jogador pode abrir a cave e dar passagem (interação) ou calar-se → `m23.pows_sheltered` se o jogador ou Ingram decidem pela cave; Hadley não se converte; em `false` os prisioneiros são levados mais tarde por outra unidade (sem morte mostrada; o debrief regista "sem abrigo durante duas horas"). Em paralelo, **`m23.ritter_status`** é um estado de conhecimento: a 26/12, ir ao posto de socorro (opcional) permite ver Ritter a ser carregado para a evacuação da noite (pés gelados e estilhaço — ferido a 24/12 no posto avançado, off-screen, fixo) → `evacuated_wounded`; não ir → Bennett só ouve "levaram-no" → `missing` (para Bennett; a cartela final diz "evacuado, destino desconhecido para Bennett"). Em ambos, as luvas ficam com Bennett.
7. **Pessoas históricas:** McAuliffe fora de cena (nem a resposta "Nuts" é citada); a 4.ª Blindada só por relato; nenhuma figura da Companhia E.
8. **Debrief:** regista as largadas de 23/12, o corredor aberto a 26/12 pela 4.ª Blindada, as evacuações de feridos a partir de 27/12, o ataque a Foy a 13/1 pelas companhias E e I com dezenas de prisioneiros, o contra-ataque de 14/1 e Noville a 15/1; Ritter (`evacuated_wounded` / "destino desconhecido para Bennett"); as luvas a Ferraro; "o cerco rompido e a vila tomada não apagam frio, ferimentos e perdas".

**Três motivos.** (a) *Quem tem o que* — a distribuição como ritual (cobertores, luvas, rações, munição); (b) *o céu* — "a melhora das condições" vê-se antes de se sentir (os C-47 passam; o material cai noutro setor; só à noite chega alguma coisa); (c) *as luvas* — "Eu guardei estas para ele. Agora use você." (003).

**Temas.** O frio como inimigo que não dispara; guardar coisas para outros; acreditar que se verá o homem na volta; o alívio que vem de fora; a vila tomada que não aquece; objetos para os vivos.

**Estrutura (§54).** CONTEXTO (cartela: cercados desde 20/12) → INTRO (o buraco; Vogel organiza poucos materiais; Bennett guarda as luvas) → APROXIMAÇÃO (levar munição ao posto avançado: Ritter sem luvas, Bennett não as dá ainda — "quando voltares") → DIÁLOGO (o céu abre; os C-47) → PRIMEIRO CONTATO (23/12 tarde: sonda alemã no bosque; defesa de um trecho) → ESCALADA (retirada de um ferido pelo caminho de suprimento; a noite no buraco) → COMBATE PRINCIPAL (26/12: manter a estrada; o relato do corredor; o posto de socorro) → SET-PIECE (as colunas ao longe; a evacuação da noite) → PAUSA (cartela 13/1: lençóis, reforços, Ferraro) → CLÍMAX (o campo branco; o flanco direito de Foy; consolidação; os rendidos ao frio) → CONSEQUÊNCIA (o abrigo; as luvas a Ferraro; Vogel atende) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Bennett | guarda coisas para outros; deixa uma mão livre e fria | Ritter; Vogel | as largadas longe; a estrada; Foy | objetos para os vivos | dá as luvas a Ferraro |
| Ingram | "A coluna abriu passagem. Mantenham essa estrada." (002) | esquadra | a estrada; a cave | — | vivo; consolida |
| Vogel | "Não tenho mais cobertores. Procure onde o vento não entra." (001) | todos | os rendidos | — | atende sobreviventes |
| Ritter | no posto avançado, sem luvas; "quando voltares" | Bennett | ferido a 24/12 (off-screen, fixo) | — | `ritter_status` (conhecimento de Bennett) |
| Shaw | treme; não dorme | Bennett | a noite no buraco; Foy | pára de pedir desculpa por tremer | vivo |
| Hadley | zangado com tudo | — | os rendidos | baixa a voz; não muda | `hadley_deescalated` |
| Ferraro | chega a 13/1 com lençol novo; não sabe os nomes | Bennett | o campo | — | recebe as luvas (`gloves_given_to`) |
| Munro | ferido a 23/12 (fixo) | Vogel | — | — | evacuado a 27/12 |

**O que a missão recusa.** Foy em dezembro; qualquer cena, líder ou frase reconhecível de adaptações da Companhia E (nenhuma corrida de oficial pela vila, nenhuma substituição de comandante, nenhum "Nuts"); Bennett a "romper" o cerco; largadas que resolvem tudo; tanques jogáveis; cercados sem frio; rendidos executados; um Ritter morto em cena; três mapas arbitrários (três estados físicos e morais).

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "Quem tem o que" (`cs_m23_intro`, ≤ 80 s)
2 23/12 09:30 · 3 linha no bosque: buracos com troncos e ramos por cima, neve pisada, um fogo de lata; Vogel ajoelhado com a bolsa aberta a contar (ligaduras, duas morfinas, um cobertor); Bennett com duas luvas a mais enfiadas no cinto; Shaw a tremer; Hadley a limpar a arma · 4 manhã limpa, frio seco, céu azul pela primeira vez em dias (D) · 5 Bennett, Ingram, Vogel, Shaw, Hadley, Munro; o posto avançado 150 m à frente (Ritter e outro) · 6 Cartela: BOSQUE A SUL DE FOY — BASTOGNE — 23 DE DEZEMBRO DE 1944 — 09:30 · 506.º REGIMENTO PARAQUEDISTA · 101.ª DIVISÃO. Cartela 2: "Cercados desde 20 de dezembro." Vogel distribui o que há: um cobertor para Shaw e Munro partilharem; Hadley protesta ("Eu também tenho frio"); Vogel: "Não tenho mais cobertores. Procure onde o vento não entra." (001). Bennett olha para o céu: um ronco. Ingram: "Se o céu aguenta, hoje cai alguma coisa. Não é para nós, mas cai." Bennett toca nas luvas do cinto (um gesto, 2 s). · 7 estabelecer privação, distribuição, o objeto e o céu · 8 olhar; tocar nas luvas (interação opcional) · 9 — · 10 — · 11 morteiros alemães esparsos (longe) · 12 fogo de lata, cobertor, ramos sobre os buracos, uma caixa de rações vazia · 13 `dlg_m23_001` (canónica), `010–015` · 14 vento sobre madeira; neve; o primeiro ronco de C-47 ao longe · 15 plano fixo em Vogel a contar; as luvas no cinto · 16 `missionStart` · 17 Ingram: "Munição ao posto. Bennett." · 18 — · 19 [A] cutscene; [C] neve como superfície · 20 as luvas são lidas por M30 (epílogo condicional)

### Cena 2 — "Munição ao posto; o céu" (jogável; `obj_m23_supply_run`, `obj_m23_watch_drops`)
2 23/12 09:45–12:30 · 3 caminho de 150 m até ao posto avançado (um buraco duplo numa orla, com vista para o campo de Foy); depois o caminho de retaguarda até ao ponto de recolha de contentores desviados (um campo atrás da linha, 300 m) · 4 céu azul; sol baixo de inverno; sombras longas azuis na neve · 5 esquadra; Ritter e um companheiro no posto; o estafeta da companhia; C-47 em formação a partir de ~10:00 (dados: altitude, rota sobre Bastogne a oeste/sudoeste — P-C23), paraquedas coloridos a descer **longe** (sobre Bastogne), alguns contentores desviados para o campo de trás; alemães: fogo AA e morteiros esparsos · 6 Levar munição (duas bandoleiras e uma caixa de .30) ao posto avançado: Ritter não tem luvas (as mãos envoltas em meias); Bennett pode dar-lhe as luvas **agora** ou guardá-las ("Quando voltares para a linha. Aqui molhas-tudo."): escolha com consequência só de texto — se as dá agora, Ritter devolve-as ("Ficam contigo. No posto perdem-se. Dá-mas na linha.") → as luvas ficam sempre com Bennett (regra: o objeto não sai de Bennett até Foy); depois, acompanhar a chegada de material: os C-47 passam, as cores descem sobre a cidade, não sobre o bosque; dois contentores desviados caem no campo de trás; Ingram manda a esquadra recolher um (interação a dois: arrastar o contentor 60 m; o outro caiu em zona vista por um morteiro alemão: Ingram proíbe) — dentro: munição de .30 e rações, **sem** cobertores ("Não é para nós, mas cai") · 7 §79 ponto 1 ("dados e local de lançamento confirmados na pesquisa" → P-C23) · 8 leva munição; escolhe dar/guardar; observa (olhar para o céu: interação); arrasta o contentor a dois · 9 dar/guardar (sem efeito sobre o objeto); recolher o contentor seguro / tentar o exposto (Ingram proíbe; se insistir, morteiro ≥ 30 m e Ingram chama-o: sem dano) · 10 Ritter; Ingram; Shaw ajuda a arrastar; Hadley vigia · 11 AA alemã ao longe; morteiros esparsos · 12 o posto com meias nas mãos, paraquedas ao longe, o contentor com fita colorida · 13 `dlg_m23_016–026` · 14 C-47 (formação; motores; AA ao longe), paraquedas, a neve a ranger · 15 livre; beat: o céu (3 s) · 16 start · 17 contentor recolhido (`evt_m23_container`) · 18 `cp_m23_a_2312`; `m23.gloves_offered_early` (texto) · 19 [C] C-47 e paraquedas como NPC por agenda (nunca interativos); [B] arrastar a dois (M01 obstáculo) · 20 o cinto de Bennett continua com as luvas

### Cena 3 — "Cinquenta metros" (jogável; `obj_m23_hold_stretch`, `obj_m23_wounded_back`)
2 23/12 13:30–16:30 (escala acelerada entre contactos; `readyScale`) · 3 o trecho de bosque da esquadra (50 m de linha, 6 buracos), a orla com vista para o campo, o caminho de suprimento para trás · 4 sol baixo; a luz vira âmbar e depois azul · 5 esquadra; o pelotão à esquerda e à direita (proxies); alemães: duas sondas (14:00; 15:30) de Volksgrenadier pela orla e pelo bosque à direita (dados; 50–200 m), morteiros · 6 Defender o trecho alternando combate intenso com espera e reorganização: a primeira sonda chega aos 60 m e recua; entre sondas, Vogel manda Bennett e Shaw buscar Munro (ferido na perna na segunda sonda: **fixo** às 15:40) ao buraco da direita e levá-lo pelo caminho de suprimento até ao ponto de recolha da companhia (120 m; maca de ramos a dois); a espera é jogo: manter o fogo de lata, trocar de posição para não congelar os pés (interação de "mexer os pés" a cada 3 min: sem ela, uma linha de Vogel; **nunca** dano por frio ao jogador — o frio é dos NPCs e do mundo) · 7 §79 ponto 2 · 8 defende (50–200 m); espera; mexe os pés; carrega Munro a dois · 9 carregar / cobrir (Shaw carrega se não) · 10 Ingram comanda; Hadley na direita; Vogel trata Munro; Shaw treme e dispara mal · 11 Volksgrenadier em duas sondas (dados); morteiros ≥ 30 m · 12 cartuchos na neve, sangue de Munro (reduzido), a maca de ramos · 13 `dlg_m23_027–035` · 14 neve a ranger; Garands abafados pelo bosque; morteiros; o fogo de lata; **nada** entre sondas · 15 livre · 16 CP-A · 17 Munro entregue + segunda sonda repelida (`evt_m23_stretch_held`) · 18 `cp_m23_b_defesa` ("defesa estabilizada"); `m23.player_carried` · 19 [A] fogo como dados, maca a dois, rotação; [B] "mexer os pés" como interação de estado (sem punição) · 20 —

### Cena 4 — "A noite no buraco" (`cs_m23_night`, ≤ 50 s)
2 23/12 → cartela de passagem · 3 o buraco de Bennett e Shaw; os troncos por cima; a neve a cair pela abertura · 4 noite; neve fina; nenhum clarão · 5 Bennett, Shaw · 6 Shaw treme e pede desculpa por tremer; Bennett não responde; tira uma luva do cinto, olha para ela, volta a guardá-la (Ritter está no posto). A neve cai. Cartela: 24 E 25 DE DEZEMBRO — o posto avançado é atingido a 24; Ritter ferido (pés gelados, estilhaço) e levado ao posto de socorro; o céu fecha-se a 25; o cerco continua. · 7 o silêncio da missão; o estado físico e moral muda sem combate · 8 skip · 9 — · 10 — · 11 — · 12 a luva na mão · 13 `dlg_m23_036–037` · 14 **silêncio obrigatório**: neve a cair, a respiração de Shaw; nenhum tiro · 15 plano fixo dentro do buraco (a abertura como moldura) · 16 CP-B · 17 cartela 26/12 · 18 `m23.ritter_wounded = true` (fixo, off-screen) · 19 [A] cutscene · 20 a luva volta ao cinto

### Cena 5 — "Mantenham essa estrada" (jogável; `obj_m23_hold_road`, `obj_m23_aid_station` opcional) — **set piece**
2 26/12 15:00–18:30 (escala acelerada) · 3 a mesma linha com mais neve e menos homens (snapshot: Munro fora; Ritter fora; um proxy do pelotão morto a 25 — fixo; Shaw com os pés enfaixados mas na linha); a estrada de retaguarda (Foy–Bastogne, 200 m atrás) com um cruzamento que a esquadra passa a guardar; a quinta do posto de socorro do batalhão (400 m, pelo caminho) · 4 tarde cinzenta; neve; luz a cair cedo (16:30) · 5 esquadra (sem Munro, sem Ritter); o estafeta; Vogel entre a linha e o posto; alemães: uma sonda (15:30) e morteiros; **rádio/relatos**: às 16:50 a notícia de que a coluna da 4.ª Blindada entrou por sul (relato, não visto); à noite, camiões e blindados NPC passam na estrada atrás (agenda, 20:00+) · 6 Proteger a ligação quando forças blindadas abrem um corredor **noutro lado**: a tarefa de Bennett é a estrada atrás da linha — Ingram: "A coluna abriu passagem. Mantenham essa estrada." (002); a esquadra guarda o cruzamento (uma sonda tenta cortá-lo às 17:20: repelida; o jogador coloca um homem na valeta e outro na quinta — interação de posicionar, M11); **opcional:** ir ao posto de socorro (Vogel pede ajuda para levar um ferido do pelotão à quinta): lá, Ritter está a ser carregado para o camião da evacuação da noite — Bennett pode falar com ele (20 s): "Guarda-as. Onde vou não preciso." → `ritter_status = evacuated_wounded`; se o jogador não for, ouve só "levaram o Ritter" → `missing` (conhecimento) · 7 §79 ponto 3 ("O alívio histórico não acontece porque Bennett matou o último inimigo") · 8 posiciona; defende o cruzamento; vai (ou não) ao posto; ouve a rádio · 9 ir ao posto / ficar (sem efeito sobre a estrada: Ingram cobre com Hadley) · 10 Ingram; Hadley na valeta; Vogel; Ritter no camião; o estafeta com a notícia · 11 sonda (dados); morteiros · 12 a estrada com rodados novos; o camião do posto; cobertores ensanguentados · 13 `dlg_m23_002` (canónica), `038–049` · 14 neve; o relato pela rádio (interferência); **colunas blindadas e camiões ao longe** (20:00+: Sherman em coluna — AUDIO); morteiros · 15 livre; beat fixo no camião (3 s, se foi ao posto) · 16 cartela 26/12 · 17 sonda do cruzamento repelida + relato ouvido (`evt_m23_corridor_news`) · 18 `cp_m23_c_2612`; `m23.ritter_status`; `m23.visited_aid_station` · 19 [D] snapshot 26/12 (elenco, neve, ferimentos); [C] colunas NPC por agenda (nunca entram na área jogável); [A] rotação, posicionar · 20 Ritter não reaparece; as luvas com Bennett

### Cena 6 — "13 de janeiro" (`cs_m23_day13`, ≤ 60 s)
2 13/1/1945 08:00 · 3 a orla do bosque virada a Foy: posições de partida; lençóis por cima dos capotes (capas improvisadas — D geral para a 101.ª em janeiro); reforços a chegar pelo caminho (Ferraro e dois); o campo branco de 400 m até às primeiras quintas; a igreja ao fundo · 4 manhã com neve no chão e céu baixo; luz branca difusa (D: neve) · 5 esquadra (snapshot: Shaw de volta com galochas de um morto — fixo; Hadley; Vogel; Ingram; Ferraro novo), o pelotão, a companhia à esquerda (E — só proxies sem rosto, nunca nomeados) · 6 Cartela: FOY — 13 DE JANEIRO DE 1945 — 08:00 — DEZOITO DIAS DEPOIS DO CORREDOR. Snapshot: rostos mais magros, lençóis, munição completa (os comboios), reforços sem nomes para os outros. Ferraro apresenta-se; Bennett não decora o nome à primeira. Ingram: "Às nove. O campo. A direita é nossa; a esquerda é da outra companhia. Ninguém pára no campo." Vogel distribui o que chegou: cobertores (agora há), mas luvas não. Bennett toca no cinto. · 7 §79 ponto 4 ("novo estado do mapa: preparação do ataque a Foy, vila ainda ocupada") · 8 olhar · 9 — · 10 — · 11 artilharia americana de preparação (longe → médio) · 12 lençóis, galochas, caixas de munição cheias, um mapa de Foy a lápis · 13 `dlg_m23_050–055` · 14 preparação de artilharia; a neve; a voz nova de Ferraro · 15 plano fixo na orla; Ferraro de perfil · 16 CP-C · 17 09:00 · 18 `cp_m23_d_1301` ("13/1"); `m23.ferraro_arrived` · 19 [D] snapshot 13/1 · 20 —

### Cena 7 — "O campo branco" (jogável; `obj_m23_approach`, `obj_m23_right_flank`)
2 13/1 09:00–10:30 · 3 o campo nevado (400 m, uma depressão a meio, uma cerca, um monte de estrume que serve de cobertura), as primeiras quintas do flanco direito (leste) de Foy, um celeiro, um muro, o caminho que entra na vila · 4 luz branca; fumo da preparação · 5 esquadra; o pelotão; a outra companhia à esquerda (proxies, nunca em primeiro plano); alemães (26.ª VGD — R): MG numa quinta do flanco direito, infantaria nas casas, um morteiro; os defensores recuam para o centro da vila casa a casa (dados) · 6 Avançar com o grupo por campo/edificações pesquisados: o campo só se atravessa em movimento ("ninguém pára no campo": parar > 8 s = morteiro agendado ≥ 30 m + aviso de Ingram); a depressão e o monte de estrume são as duas pausas reais; proteger o flanco direito: a MG da quinta vê o campo — o jogador e Hadley contornam pelo caminho de leste (coberto por uma sebe baixa) enquanto Ingram fixa; a MG recua quando flanqueada (não "morrem todos"); o celeiro é limpo (três alemães: dois recuam, um fica ferido e **rende-se** — levado ao pátio, cena 8) · 7 §79 ponto 5 ("Não reproduzir cenas, líderes ou falas de adaptações famosas") · 8 atravessa em movimento; pausa na depressão; flanqueia; dispara (50–150 m); limpa o celeiro · 9 flanquear pelo caminho de leste (lento, coberto) vs correr direto (rápido, MG) · 10 Ingram fixa; Hadley flanqueia; Shaw segue Bennett; Ferraro à retaguarda (ordem de Ingram: "o novo atrás"); Vogel atrás com a bolsa · 11 MG (dados; recua quando flanqueada); infantaria casa a casa; morteiro agendado · 12 o campo com rastos, a cerca, o celeiro com palha e o ferido alemão · 13 `dlg_m23_056–063` · 14 neve a ranger; MG abafada pela quinta; a outra companhia à esquerda (combate médio); artilharia · 15 livre; a luz branca sem sombras · 16 09:00 · 17 flanco direito seguro (`evt_m23_flank`) · 18 `cp_m23_e_aproximacao` ("aproximação") · 19 [A]; [C] neve com pegadas e capas · 20 —

### Cena 8 — "Rendidos ao frio" (jogável; clímax; `obj_m23_consolidate`, `obj_m23_pows`) — **custo humano**
2 13/1 10:30–12:30 (escala acelerada) · 3 o pátio de uma quinta do flanco direito: celeiro, casa com cave, muro para o centro da vila; oito prisioneiros alemães (os dois do celeiro + seis entregues pelo pelotão) sentados no pátio, sem capotes, a tremer; contra-fogo alemão do norte da vila (morteiros; uma MG a 300 m) · 4 meio-dia branco; vento · 5 esquadra; prisioneiros; um sargento do pelotão que os entregou ("são vossos até a companhia os levar"); Vogel a tratar um ferido alemão e Shaw (dedo partido) · 6 Consolidar o objetivo na vila: posições no muro e na casa; uma pressão alemã (11:10; dados) repelida com o pelotão; **os rendidos**: Hadley quer deixá-los no pátio ("Eles deixaram os nossos nos buracos.") / Vogel lembra os recursos ("Há a cave e há dois cobertores a mais desde ontem. Mais um morto de frio é mais um que não interrogam.") → o jogador abre a cave e dá passagem (interação; um prisioneiro diz "Kalt… danke") ou cala-se → Ingram decide pela cave se ninguém o fizer em 15 s (com um "Hadley. Cave." seco) → `m23.pows_sheltered = true`; se o jogador disparar sobre um rendido: `m23.player_fired_on_pow`, a esquadra deixa de falar com Bennett (regra M01/M19), a fala 003 é **omitida** (Bennett entrega as luvas sem palavras) e o debrief regista; nunca termina a missão nem dá nada · 7 o custo humano com contexto e consequência · 8 defende; abre a cave; dá passagem; (dispara: custo) · 9 abrir / calar-se · 10 Hadley; Vogel; Ingram; o sargento do pelotão; os prisioneiros · 11 pressão (dados); MG a 300 m; morteiros ≥ 30 m · 12 o pátio com prisioneiros sentados; a porta da cave; os dois cobertores · 13 `dlg_m23_064–073` · 14 vento no pátio; dentes a bater; morteiros; a porta da cave · 15 livre; beat fixo nos prisioneiros (3 s) antes de Hadley · 16 CP-E · 17 pressão repelida + prisioneiros na cave ou levados (`evt_m23_consolidated`) · 18 `cp_m23_f_consolidacao`; `m23.pows_sheltered`; `m23.hadley_deescalated` (se Hadley baixa a voz após o jogador/Ingram); `m23.player_fired_on_pow` · 19 [C] `SURRENDERED` (M19) para oito atores (lote: sentados, não-alvo aliado, movem-se para a cave por ordem); fallback encenado · 20 lido no debrief; nenhuma missão posterior o usa

### Cena 9 — "Agora use você" (`cs_m23_outro`, ≤ 70 s) + debrief
2 13/1 12:30–13:00 · 3 o abrigo da vila (a casa com cave): Vogel atende sobreviventes (Shaw; um homem do pelotão; o ferido alemão ao lado); Ferraro sentado com as mãos debaixo dos braços; a janela com a vila e o campo branco · 4 interior frio; luz branca da porta · 5 Bennett, Ferraro, Vogel, Shaw, Ingram à porta, Hadley de guarda · 6 Bennett tira as luvas do cinto. Olha para elas (o gesto de 23/12). Ferraro não tem luvas (as dele ficaram no camião dos reforços). Bennett: "Eu guardei estas para ele. Agora use você." (003; **omitida** se `player_fired_on_pow`: entrega sem fala). Ferraro: "Quem?" Bennett: "Um homem que não vais conhecer." Vogel continua a atender. Cartela: Foy tomada a 13/1 pelas companhias E e I com dezenas de prisioneiros; contra-ataque alemão a 14/1; Noville a 15/1. Cartela 2 (`lineVariants`): "Cal Ritter: evacuado a 27/12 com pés gelados e estilhaço." / "Cal Ritter: evacuado a 27/12. Bennett nunca soube para onde." · 7 §79 final: "Cerco rompido e ataque bem-sucedido não apagam frio, ferimentos e perdas" · 8 skip · 9 — · 10 — · 11 — · 12 as luvas nas mãos de Ferraro; a bolsa de Vogel quase vazia outra vez · 13 `dlg_m23_003` (canónica), `074–076` · 14 **silêncio obrigatório** (vento na porta; Vogel a rasgar ligadura); nenhuma música · 15 plano fixo nas luvas; Ferraro a calçá-las devagar; Vogel ao fundo · 16 `evt_m23_consolidated` · 17 `missionEnd` · 18 `m23.completed`; `m23.gloves_given_to = ferraro`; `m23.ferraro_status = alive` · 19 [A] cutscene com variantes · 20 M30 lê `gloves_given_to` e `ferraro_status`; M24 abre no Pacífico (Finch) — corte seco de neve para areia negra

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m23_supply_run` | Leve munição ao posto avançado | sim | intro | entregue | — | `gloves_offered_early` (texto) | — |
| `obj_m23_watch_drops` | Acompanhe as largadas e recolha o contentor seguro | sim | posto | `evt_m23_container` | — | — | A |
| `obj_m23_hold_stretch` | Defenda o trecho; espere; reorganize | sim | A | 2 sondas | — | — | — |
| `obj_m23_wounded_back` | Leve Munro ao ponto de recolha | sim | 15:40 | entregue | — | `player_carried` | B |
| `obj_m23_hold_road` | Mantenha o cruzamento da estrada | sim | C (26/12) | sonda repelida + relato | — | — | — |
| `obj_m23_aid_station` | Ajude Vogel a levar um ferido ao posto de socorro | **opcional** | 26/12 16:00 | posto | — | `ritter_status`; `visited_aid_station` | — |
| `obj_m23_approach` | Atravesse o campo em movimento | sim | D (13/1) | quintas | — | — | E |
| `obj_m23_right_flank` | Proteja o flanco direito: flanqueie a MG; limpe o celeiro | sim | campo | `evt_m23_flank` | — | — | — |
| `obj_m23_consolidate` | Consolide o objetivo; repila a pressão | sim | E | pressão repelida | — | — | F |
| `obj_m23_pows` | Os rendidos: abrigo | sim (cena) | prisioneiros no pátio | cave ou levados | — | `pows_sheltered`; `hadley_deescalated`; `player_fired_on_pow` | — |
| `obj_m23_gloves` | (cena) | sim | outro | — | — | `gloves_given_to = ferraro` | — |

### 3.2 Setores
`s1_line_woods` (perto, 23 e 26/12) · `s2_outpost` (perto, 23/12) · `s3_rear_field` (perto, 23/12: contentores) · `s4_rear_road` (perto, 26/12: cruzamento; quinta do posto a 400 m) · `s5_foy_field` (perto, 13/1) · `s6_foy_east` (perto, 13/1: quintas, celeiro, pátio, cave) · `s7_mid` (médio: pelotão, a outra companhia, colunas na estrada atrás, perímetro) · `s8_far` (longe: artilharia, C-47 a 23/12, o corredor a sul por relato, Noville). Agendas: C-47 10:00–12:00 (vagas); contentores 11:20; sondas 23/12 14:00/15:30; Munro 15:40 (fixo); 26/12 sonda 15:30, notícia 16:50, sonda do cruzamento 17:20, Ritter carregado 16:30–17:00 (janela do opcional), colunas 20:00+; 13/1 preparação 08:40, 09:00 avanço, morteiro sobre parados > 8 s, pressão 11:10.

### 3.3 Checkpoints
A 23/12 (contentor) · B defesa estabilizada (Munro entregue) · C 26/12 (snapshot: sem Munro/Ritter; neve; Shaw enfaixado) · D 13/1 (snapshot: lençóis, Ferraro, munição completa) · E aproximação (flanco) · F consolidação (prisioneiros; pressão). Cada passagem de data salva suprimento, elenco, ferimentos e rostos.

### 3.4 Justiça
Nenhum dano por frio ao jogador (o frio é dos NPCs e das escolhas de distribuição); morteiros sobre parados só com aviso e ≥ 30 m; sondas por vias coerentes; a MG recua quando flanqueada; Munro, Ritter e o proxy de 25/12 são fixos e nunca "evitáveis"; largadas e colunas nunca interativas; o rendido nunca reage; disparar sobre rendidos tem custo e nunca recompensa; o campo só pune paragens, não movimento.

---

## 4. Set pieces

### SP-23-1 "O céu"
Contexto: 23/12, do posto avançado ao campo de trás. Preparação: Vogel sem cobertores; Ritter sem luvas. Experiência: os C-47 passam; as cores descem sobre a cidade; dois contentores caem no campo errado; arrastar um a dois; abrir: munição e rações, sem cobertores. Companheiros: Ritter devolve as luvas; Shaw arrasta; Ingram proíbe o contentor exposto. Ambiente: paraquedas ao longe; fita colorida. Evolução: AA alemã ao longe. Clímax: "Não é para nós, mas cai." Consequências: CP-A. Requisitos: [C] C-47/paraquedas por agenda; [B] arrastar a dois. Integração: `obj_m23_supply_run`, `obj_m23_watch_drops`.

### SP-23-2 "Mantenham essa estrada"
Contexto: 26/12, o cruzamento atrás da linha. Preparação: a noite no buraco; Ritter ferido off-screen. Experiência: posicionar homens; a sonda que tenta cortar; a notícia às 16:50 pela rádio (não vista); o posto de socorro e Ritter no camião (opcional); à noite, colunas ao longe. Companheiros: Ingram; Hadley na valeta; Vogel; Ritter. Ambiente: rodados novos; cobertores ensanguentados. Evolução: o som das colunas. Clímax: fala 002. Consequências: `ritter_status`, CP-C. Requisitos: [D] snapshot; [C] colunas NPC. Integração: `obj_m23_hold_road`, `obj_m23_aid_station`.

### SP-23-3 "Rendidos ao frio"
Contexto: 13/1, o pátio em Foy. Preparação: o campo branco; o celeiro; Ferraro sem luvas. Experiência: oito homens a tremer; Hadley; Vogel; a cave. Companheiros: Ingram decide se ninguém o faz. Ambiente: a porta da cave; dois cobertores. Evolução: a pressão alemã durante a decisão. Clímax: "Kalt… danke." Consequências: `pows_sheltered`, `hadley_deescalated`. Requisitos: [C] `SURRENDERED` em lote; fallback encenado. Integração: `obj_m23_pows`, `obj_m23_consolidate`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| linha 23/12 | buracos com troncos, fogo de lata, caixa de rações vazia | distribuir | o céu | sondas | Vogel; Shaw; Munro | cartuchos na neve; maca de ramos |
| posto avançado | meias nas mãos, duas caixas | munição | — | — | Ritter | — |
| campo de trás | paraquedas ao longe, contentor com fita | arrastar | morteiro no exposto | — | — | contentor aberto |
| buraco noite | a luva na mão | — | neve | — | Shaw | — |
| linha 26/12 | mais neve, menos homens, um buraco vazio | — | relato | sonda | — | — |
| cruzamento | rodados novos, valeta, quinta | posicionar | 16:50 | sonda | estafeta | colunas à noite |
| posto de socorro | camião, cobertores ensanguentados | evacuação | — | — | Ritter | — |
| orla 13/1 | lençóis, galochas, caixas cheias, mapa a lápis | preparar | preparação | — | Ferraro | — |
| campo branco | rastos, cerca, monte de estrume | atravessar | morteiro nos parados | MG | — | rastos |
| pátio/cave | prisioneiros sentados, porta da cave, dois cobertores | consolidar | Hadley | pressão | prisioneiros; Vogel | cave aberta ou pátio |
| abrigo | bolsa de Vogel, as luvas | atender | — | — | Ferraro; Shaw | luvas calçadas |

Objetos com origem: as luvas (um par a mais do pacote de Natal da mãe de Bennett, recebido em Mourmelon a 16/12), o cobertor partilhado (do posto de socorro, 21/12), a fita do contentor (código de cor da carga — P-C23), as galochas de Shaw (de um morto do pelotão a 25/12), os lençóis (requisitados nas quintas de Savy a 10/1), os dois cobertores a mais (comboio de 12/1).

---

## 6. Diálogos (VO inglês; alemão para os prisioneiros, sem tradução)

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Vogel | "Não tenho mais cobertores. Procure onde o vento não entra." (§79) | intro t 20 | 1 | — |
| 002 | Ingram | "A coluna abriu passagem. Mantenham essa estrada." (§79) | 16:50 | 1 | — |
| 003 | Bennett | "Eu guardei estas para ele. Agora use você." (§79; **omitida** se `player_fired_on_pow`) | outro | 1 | — |
| 010 | Vogel | "Um cobertor. Shaw e Munro. Partilhem." (V1) | intro t 8 | 1 | — |
| 011 | Hadley | "Eu também tenho frio." (V1) | 010 | 2 | — |
| 012 | Ingram | "Se o céu aguenta, hoje cai alguma coisa. Não é para nós, mas cai." (V1) | intro t 35 | 1 | — |
| 013 | Shaw | "Desculpa. Não consigo parar." (V1; treme) | intro t 45 | 3 | — |
| 014 | Bennett | "Ninguém te pediu para parar." (V1) | 013 | 2 | — |
| 015 | Ingram | "Munição ao posto. Bennett." (V1) | intro fim | 1 | — |
| 016 | Ritter | "Duas bandoleiras. Já me sinto rico." (V1) | posto | 2 | — |
| 017 | Bennett | "Tenho luvas a mais." / "Quando voltares para a linha." (V1; escolha) | — | 1 | — |
| 018 | Ritter | "Ficam contigo. No posto perdem-se. Dá-mas na linha." (V1; se oferece) | 017 | 1 | — |
| 019 | Ritter | "Está bem. Na linha." (V1; se guarda) | 017 | 1 | — |
| 020 | Ritter | "Ouves? Motores. Muitos." (V1) | 10:00 | 1 | — |
| 021 | Ingram | "C-47. Olhem para onde cai. Não para eles." (V1) | C-47 | 1 | — |
| 022 | Shaw | "Cores. Vermelho, azul… caem na cidade." (V1) | paraquedas | 2 | — |
| 023 | Hadley | "Na cidade. Claro. Nós comemos neve." (V1) | 022 | 2 | — |
| 024 | Ingram | "Dois desviados no campo de trás. O da esquerda. O da direita está à vista do morteiro deles: ninguém vai lá." (V1) | 11:20 | 1 | — |
| 025 | Ingram | "Bennett! Disse ninguém." (V1; se insiste) | exposto | 0 | — |
| 026 | Vogel | "Munição e rações. Cobertores, nenhum." (V1) | contentor | 1 | — |
| 027 | Ingram | "Sonda pela orla. Deixem-nos chegar aos sessenta." (V1) | 14:00 | 0 | — |
| 028 | Vogel | "Mexam os pés. Quem não mexe, perde-os." (V1) | espera | 2 | 180 |
| 029 | Shaw | "Falhei. Falhei outra vez." (V1) | dispara mal | 3 | — |
| 030 | Hadley | "Então pára de tremer." / Ingram: "Hadley." (V1) | 029 | 2 | — |
| 031 | Munro | "…perna. Não é grave. Não é grave." (V1) | 15:40 | 1 | — |
| 032 | Vogel | "É grave o suficiente. Bennett, Shaw: maca de ramos, caminho de trás, ponto da companhia." (V1) | 031 | 1 | — |
| 033 | Shaw | "Eu pego atrás." (V1) | maca | 2 | — |
| 034 | sargento do ponto | "Recebido. Vai para a cidade quando houver estrada. Não há." (V1) | entrega | 1 | — |
| 035 | Ingram | "Segunda sonda. Depois desta, noite." (V1) | 15:30 | 0 | — |
| 036 | Shaw | "Desculpa. É o frio." (V1) | noite | 3 | — |
| 037 | Bennett | (tira a luva; guarda-a; sem fala) | noite | — | — |
| 038 | Ingram | "Cruzamento atrás. Um na valeta, um na quinta. Bennett, coloca-os." (V1) | 26/12 | 1 | — |
| 039 | estafeta | "Rádio do batalhão: blindados nossos a sul, em Assenois. Dizem que entraram." (V1) | 16:50 | 1 | — |
| 040 | Hadley | "Entraram. E nós?" (V1) | 039 | 2 | — |
| 041 | Ingram | (002) | 039 | 1 | — |
| 042 | Vogel | "Bennett. Um ferido do pelotão para a quinta. Quatro mãos. Vens?" (V1) | 16:00 | 1 | — |
| 043 | Ritter | "Bennett. Guarda-as. Onde vou não preciso." (V1; posto de socorro) | camião | 1 | — |
| 044 | Bennett | "Dou-tas quando voltares." / Ritter: "Então guarda-as bem." (V1) | 043 | 1 | — |
| 045 | Vogel | "Levaram o Ritter para o camião. Não sei para onde depois." (V1; se não foi) | regresso | 1 | — |
| 046 | Ingram | "Sonda no cruzamento! Valeta!" (V1) | 17:20 | 0 | — |
| 047 | Hadley | "Ouvem? Lagartas. Nossas. Atrás." (V1) | 20:00 | 2 | — |
| 048 | Shaw | "São nossas mesmo?" / Ingram: "São. Vêm pela estrada que guardámos." (V1) | 047 | 2 | — |
| 049 | Vogel | "Amanhã evacuam. Hoje, estrada." (V1) | noite | 1 | — |
| 050 | Ferraro | "Ferraro. Dom. Chegámos ontem à noite." (V1) | 13/1 | 2 | — |
| 051 | Bennett | "Bennett. Fica atrás de mim e não pares no campo." (V1) | 050 | 1 | — |
| 052 | Ingram | "Às nove. O campo. A direita é nossa; a esquerda é da outra companhia. Ninguém pára no campo." (V1) | 08:30 | 1 | — |
| 053 | Vogel | "Cobertores, agora há. Luvas, continua a não haver." (V1) | distribuição | 2 | — |
| 054 | Shaw | "Galochas. Eram do Pell." (V1) | — | 3 | — |
| 055 | Hadley | "O novo atrás. Não quero levar um tiro pelas costas de um lençol." (V1) | — | 2 | — |
| 056 | Ingram | "Agora! Depressão a meio. Estrume à direita. Mexam-se!" (V1) | 09:00 | 0 | — |
| 057 | Ingram | "**Ninguém pára!**" (V1; se o jogador pára > 8 s) | parado | 0 | — |
| 058 | Hadley | "MG na quinta da direita. Vê o campo todo." (V1) | MG | 0 | — |
| 059 | Ingram | "Eu fixo. Bennett e Hadley pelo caminho de leste, pela sebe." (V1) | — | 1 | — |
| 060 | Hadley | "Recuou. Não os cacem. A vila é casa a casa." (V1) | flanqueada | 1 | — |
| 061 | Shaw | "Celeiro. Três. Dois a fugir pela porta de trás." (V1) | celeiro | 1 | — |
| 062 | prisioneiro (alemão) | "Nicht schießen… verwundet…" (sem tradução) | rendido | 1 | — |
| 063 | Ingram | "Mãos. Pátio. Vogel vê-o depois dos nossos." (V1) | — | 1 | — |
| 064 | sargento do pelotão | "Mais seis. São vossos até a companhia os levar." (V1) | pátio | 1 | — |
| 065 | Hadley | "Deixem-nos no pátio. Eles deixaram os nossos nos buracos." (V1) | 3 s depois | 1 | — |
| 066 | Vogel | "Há a cave e há dois cobertores a mais desde ontem. Mais um morto de frio é mais um que não interrogam." (V1) | 065 | 1 | — |
| 067 | Bennett | "Cave. Devagar. Um de cada vez." (V1; se abre) | interação | 0 | — |
| 068 | Ingram | "Hadley. Cave." (V1; se ninguém em 15 s) | — | 0 | — |
| 069 | prisioneiro (alemão) | "Kalt… danke." | cave | 2 | — |
| 070 | Hadley | "…Não me agradeças a mim." (V1) | 069 | 2 | — |
| 071 | Ingram | "Pressão do norte! Muro!" (V1) | 11:10 | 0 | — |
| 072 | Vogel | (se o jogador disparou sobre um rendido) "…" (silêncio da esquadra) | fired | — | — |
| 073 | Ingram | "Chega. É nosso. Até amanhã, pelo menos." (V1) | consolidated | 1 | — |
| 074 | Ferraro | "Quem?" (V1) | 003 | 1 | — |
| 075 | Bennett | "Um homem que não vais conhecer." (V1) | 074 | 1 | — |
| 076 | Vogel | "Próximo." (V1) | outro fim | 2 | — |

Callouts: `co_m23_c47`, `co_m23_mortar_exposed`, `co_m23_probe_edge`, `co_m23_columns_rear`, `co_m23_mg_farm`, `co_m23_pressure_north`. Silêncios: a noite no buraco; o pátio antes de Hadley (3 s); o abrigo (as luvas).

---

## 7. Arte e atmosfera

**Paleta:** branco de neve com sombras azuis, verde-oliva escurecido de capotes molhados, castanho de troncos e ramos, cinza de céu baixo (26/12, 13/1), azul limpo de 23/12, branco sujo de lençóis, vermelho/azul/amarelo dos paraquedas ao longe, pedra e madeira escura de Foy. **Luz:** 23/12 sol baixo e límpido (zénite `#5f86b8`, horizonte `#dfe6ec`), sombras longas; 26/12 cinzento (zénite `#7a8288`, horizonte `#b7bbb8`); noite do buraco azul-escuro com neve; 13/1 branco difuso sem sombras (zénite `#9aa0a4`, horizonte `#d8d9d6`). **Materiais:** neve pisada/intacta (pegadas persistentes), ramos, lona, lençol, palha, pedra gelada. **Silhuetas:** buracos com troncos, o posto avançado na orla, paraquedas ao longe, o cruzamento com rodados, a igreja de Foy, lençóis no campo. **Destruição:** persistente por data (buracos de morteiro na neve, o celeiro, o muro). **Humanos:** 23/12 barbas, mãos envoltas, capotes; 26/12 pés enfaixados, mais magros; 13/1 lençóis por cima, galochas de morto, Ferraro limpo; prisioneiros sem capotes, mãos nas axilas. **Violência reduzida:** Munro coberto; nenhum morto americano em primeiro plano (o proxy de 25/12 só por cartela); prisioneiros sem sangue visível.

**Imagem única:** luvas repartidas num buraco de neve; depois, Foy à luz de janeiro (ART §4, RECONSTRUCTED).

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| linha 23/12 | vento sobre madeira, neve a ranger, fogo de lata | pelotão | morteiros esparsos | — |
| o céu | o cinto; respiração | — | **C-47 em formação**, AA, paraquedas | — |
| sondas | Garands abafados pelo bosque, morteiros | — | — | **entre sondas** |
| noite | neve a cair, a respiração de Shaw | — | — | **obrigatório** |
| 26/12 | rádio com interferência, neve | sonda | artilharia de transição; **colunas blindadas e camiões** (20:00+) | — |
| posto de socorro | camião, cobertores, Vogel | — | — | — |
| 13/1 orla | lençóis, caixas, a voz nova | preparação | — | — |
| campo | neve a ranger, MG abafada pela quinta | a outra companhia à esquerda | artilharia | — |
| pátio | dentes a bater, a porta da cave, morteiros | pressão | — | **antes de Hadley** |
| abrigo | ligadura a rasgar, vento na porta | — | — | **obrigatório** |

Sons novos: neve (ranger por temperatura), C-47 em formação com AA, Sherman em coluna (NPC), lençóis. Música: motivo V "A lama" uma frase na chegada das colunas (26/12 noite); nenhuma em Foy. VO inglês (sotaques do sul para Bennett — Georgia; proposta), alemão.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| Cerco de Bastogne 20–26/12; céu limpo e largadas a 23/12 | D | H22; S-C19 | local/código de cor das largadas (**P-C23**) |
| Corredor aberto pelo sul a 26/12 (~16:50) pela 4.ª Blindada; evacuações a partir de 27/12 | D (resumo) | H22 | — |
| 3/506 defendeu Foy em dezembro; Companhia I; setor no bosque a sul/sudeste de Foy | R | S-C19 | **P-C23** (setor exato, Bois Jacques vs orla) |
| Foy atacada a 13/1/1945 às 09:00 pelas companhias E e I; casa a casa; dezenas de prisioneiros; contra-ataque 14/1; Noville 15/1 | D (resumo) | S-C19 | atribuição de setores E/I (P-C23) |
| Lençóis como capas improvisadas; galochas em falta; trench foot | D (geral) | H22/H23 | — |
| 26.ª VGD como defensor de Foy em janeiro | R | — | confirmar unidade |
| Ingram, Vogel, Ritter, Shaw, Hadley, Ferraro, Munro, Cassidy, Pell | F | — | acrescentar Ingram/Munro/Cassidy a CONTINUITY §4 |
| McAuliffe fora de cena; "Nuts" nunca citado; nenhuma figura da Companhia E | regra | §79 | — |
| Equipamento: M1, BAR, M1919, bazuca, 60 mm, C-47, Sherman (NPC) | D | TIMELINE §3 | auditoria |

**Proibições:** Foy em dezembro; qualquer cena/líder/fala reconhecível de adaptações da Companhia E; "Nuts"; Bennett a romper o cerco; largadas que resolvem tudo; tanques jogáveis; rendidos executados; Ritter morto em cena. **Fora de cena:** McAuliffe; a 4.ª Blindada; a Companhia E (proxies sem rosto à esquerda em 13/1).

---

## 10. Handoff técnico

**Contrato:** `id m23_bastogne_foy`, `order 23`, **três segmentos de relógio** (23/12 09:30→16:30 + noite; 26/12 15:00→27/12 01:00; 13/1 08:00→13:00) com snapshot em C e D, `cast` (Bennett, Ingram, Vogel, Ritter, Shaw, Hadley, Ferraro, Munro, estafeta, sargento do ponto, sargento do pelotão, Cassidy [voz], prisioneiros ×8), grupos (`grp_squad`, `grp_platoon`, `grp_outpost`, `grp_other_company_faceless`, `grp_de_probe_a/b/c/d`, `grp_de_mg_farm`, `grp_de_village`, `grp_de_pressure`, `grp_pows`, `grp_c47`, `grp_columns_rear`, `grp_aid_station`), setores s1–s8, checkpoints A–F, cutscenes (intro, night, day13, outro), falas, flags, debrief.

**Flags:** `m23.completed`, `m23.gloves_offered_early` (texto), `m23.player_carried`, `m23.ritter_wounded` (fixo), `m23.visited_aid_station`, `m23.ritter_status ∈ {evacuated_wounded, missing}` (conhecimento de Bennett), `m23.ferraro_arrived`, `m23.pows_sheltered`, `m23.hadley_deescalated`, `m23.player_fired_on_pow`, `m23.gloves_given_to = ferraro` (fixo), `m23.ferraro_status = alive` (lido por M30).

**Sistemas:** [D] três snapshots por data (elenco, ferimentos, neve, suprimento) — mesma extensão de `battleClock` que M20; [C] neve (superfície com pegadas persistentes, capas de lençol), C-47/paraquedas e colunas blindadas como NPC por agenda (fora da área jogável), `SURRENDERED` em lote (M19); [A] fogo como dados, `safeImpact`, maca a dois, arrastar a dois, posicionar homens (M11), rotação; [B] "mexer os pés" (estado sem punição), "olhar para o céu", abrir a cave/dar passagem. **Fallbacks honestos:** sem neve dinâmica → textura com pegadas pré-cozidas por setor; sem C-47 animados → som + paraquedas 2D ao longe; sem `SURRENDERED` em lote → cena encenada (Ingram decide; o jogador só abre a porta).

**Disciplinas:** Level: linha de bosque (50 m jogáveis + 150 m de posto), campo de trás, cruzamento com quinta (400 m de caminho), orla 13/1, campo de 400 m com depressão/cerca/estrume, flanco leste de Foy (quintas, celeiro, pátio, cave); Combate/IA: sondas por orla, MG que recua ao ser flanqueada, pressão com pelotão; Arte: três estados de neve e de homens; Personagens: 101.ª em três estados (barba, pés enfaixados, lençóis), prisioneiros sem capote; Animação: distribuir, tocar no cinto, arrastar contentor, maca de ramos, mexer os pés, posicionar, abrir cave, calçar luvas; Som: neve por temperatura, C-47, colunas; VO: inglês/alemão; Historiador: P-C23 (setor, largadas, atribuição E/I, 26.ª VGD); QA: snapshots nunca "ressuscitam" Munro/Ritter; `ritter_status` só muda por visita ao posto; `gloves_given_to` sempre Ferraro; fala 003 omitida se `player_fired_on_pow`; nenhum dano por frio ao jogador.

**Testes:** carregar C → Munro e Ritter ausentes, buraco vazio presente; carregar D → Ferraro presente, lençóis ativos, munição completa; parar no campo 13/1 > 8 s → `co_m23_mortar_exposed` + impacto ≥ 30 m, nunca dano direto; os prisioneiros nunca reagem armados após reload; `visited_aid_station = false` → cartela "destino desconhecido"; a outra companhia nunca tem atores nomeados nem falas.

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| Quem tem o que; as luvas no cinto | (intro) | tocar nas luvas | Vogel distribui; Hadley protesta | — | start | — |
| Munição ao posto; "quando voltares" | `obj_m23_supply_run` | levar; dar/guardar | Ritter devolve | — | intro | `gloves_offered_early` |
| O céu; o contentor errado | `obj_m23_watch_drops` | olhar; arrastar a dois | Ingram proíbe o exposto | contentor aberto | 10:00 | CP-A |
| Cinquenta metros; Munro | `obj_m23_hold_stretch` / `wounded_back` | defender; esperar; mexer os pés; carregar | sondas; Vogel; Shaw | cartuchos; maca de ramos | A | CP-B; `player_carried` |
| A noite no buraco | (cutscene night) | skip | Shaw treme | neve | B | `ritter_wounded` (fixo) |
| Mantenham essa estrada; Ritter no camião | `obj_m23_hold_road` / `aid_station` | posicionar; defender; ir ao posto (opc.) | estafeta 16:50; Ritter; colunas à noite | rodados; snapshot | C | `ritter_status`; `visited_aid_station` |
| 13 de janeiro; Ferraro | (cutscene day13) | olhar | Ferraro apresenta-se; Vogel sem luvas | lençóis; munição cheia | D | `ferraro_arrived` |
| O campo branco; o flanco direito | `obj_m23_approach` / `right_flank` | atravessar em movimento; flanquear; celeiro | Ingram fixa; Hadley; MG recua; um rende-se | rastos; celeiro | 09:00 | CP-E |
| Rendidos ao frio | `obj_m23_pows` / `consolidate` | abrir a cave; defender | Hadley; Vogel; Ingram decide; prisioneiros | cave aberta | pátio | CP-F; `pows_sheltered`; `hadley_deescalated` |
| Agora use você | `obj_m23_gloves` | skip | Ferraro calça; Vogel atende | luvas calçadas | consolidated | `m23.completed`; `gloves_given_to` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 9 | as luvas em três estados; o alívio que vem de fora; Ritter como conhecimento, não resgate. |
| 2 | Autenticidade | 8 | S-C19 sólido no resumo; setor/largadas/atribuição E-I P-C23; a 26.ª VGD a confirmar. |
| 3 | Personagens | 9 | Vogel, Shaw, Hadley, Ritter, Ferraro em gestos curtos; Ingram sem arco (deliberado). |
| 4 | Diálogos | 9 | "Não é para nós, mas cai." / "Mais um morto de frio é mais um que não interrogam." / "Um homem que não vais conhecer." |
| 5 | Originalidade | 9 | distribuição como ritual; o campo que só pune paragens; rendidos ao frio como decisão. |
| 6 | Variedade | 9 | levar, olhar, arrastar, defender, esperar, carregar, posicionar, visitar, atravessar, flanquear, limpar, abrir a cave, entregar. |
| 7 | Set pieces | 8 | nenhum é tiroteio puro; o céu e a estrada são "coisas que acontecem noutro lado". |
| 8 | Atmosfera | 9 | três estados de neve e de luz. |
| 9 | Environmental storytelling | 9 | meias nas mãos, galochas de morto, lençóis, dois cobertores a mais. |
| 10 | Cinematográfica | 8 | o buraco como moldura; as luvas calçadas devagar. |
| 11 | Sonora | 9 | C-47 ao longe; colunas atrás; o pátio com dentes a bater. |
| 12 | Impacto emocional | 9 | "Agora use você." |
| 13 | Ritmo | 7 | 26–36 min para três datas: a compressão é assumida (PR #44); 23/12 limitado a duas tarefas + defesa; testar antes de acrescentar tiroteios. |
| 14 | Continuidade | 9 | fecha Bennett; `gloves_given_to`/`ferraro_status` lidos por M30; nenhuma dependência da Companhia E. |
| 15 | Integração técnica | 5 | três snapshots, neve, NPCs aéreos/blindados e `SURRENDERED` em lote são [C]/[D]; fallbacks definidos. |

**Correções aplicadas:** (1) o objeto (luvas) nunca sai de Bennett antes de Foy — a oferta precoce a Ritter é devolvida, evitando um ramo em que as luvas "desaparecem"; (2) `ritter_status` foi definido como estado de conhecimento de Bennett (visita ao posto), nunca como resgate dependente do jogador; (3) o alívio de 26/12 chega por relato e som, e a tarefa é a estrada atrás da linha (a esquadra está a norte; o corredor é a sul); (4) o frio nunca causa dano ao jogador — é dos NPCs e das escolhas; (5) a Companhia E existe só como proxies sem rosto à esquerda, sem nomes nem falas; (6) disparar sobre rendidos omite a fala 003 e silencia a esquadra, sem terminar a missão; (7) Ingram, Munro, Cassidy e Pell são propostas deste dossiê a acrescentar a CONTINUITY §4.
