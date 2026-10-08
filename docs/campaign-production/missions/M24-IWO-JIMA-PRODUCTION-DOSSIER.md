# M24 — AREIA NEGRA · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** 19/2/1945, Iwo Jima; 28.º Marines, 5.ª Divisão; POV Leo Finch; fonte H24; 22–30 min; três falas; checkpoints "primeira cobertura; reunião; apoio; avanço; consolidação — salvar estado da praia, veículos e feridos"; "os instantes iniciais de desembarque e a intensificação posterior do fogo são diferentes de Omaha; não copiar a mesma sequência com outra cor de areia"; tripulações reagem a veículos avariados; fogo oculto localizado por impactos, informação de aliados e observação, sem radar omnisciente; Finch não encerra sozinho o sistema defensivo; a bandeira de 23/2 não é plantada a 19/2; final: "o homem que gritava ao seu lado não está mais ali". **Proposto:** Finch no 1.º Batalhão do 28.º (S-C04: Green Beach ~09:00; elementos de 1/28 e 2/28 na costa oeste em < 90 min — P-C24), os terraços de cinza como medida (metros subidos), a peça de equipamento de Salas na rebentação como objeto, "os minutos antes de o fogo começar" como silêncio, Rourke que jura ouvir a voz de Salas → Finch procura cobertura real para o socorro / Kessler manda seguir → `m24.rourke_status`, `m24.salas_status = missing` (sempre). **Sistemas:** [C] cinza vulcânica (movimento, pegadas que se desfazem, terraços), LVT-4 na chegada, veículos avariados persistentes, fogo oculto "por impacto"; [A] tudo o resto.

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m24_iwo_jima` / 24 |
| Datas | 1945-02-19T08:50+09:00 → 1945-02-19T18:00+09:00 (hora local da ilha; confirmar fuso dos registos — P-C24) |
| Local | Green Beach (extremo esquerdo, junto ao Suribachi) → três terraços de cinza vulcânica → o istmo (700 jardas reais → **≈ 300 m jogáveis**, `COMPRESSED_FOR_GAMEPLAY`) → a costa oeste (primeira posição do dia) — Suribachi `EXACT` como presença; o resto `RECONSTRUCTED` (P-C24: companhia; terraços; hora do fogo intenso) |
| Operação | desembarque de 19/2 (H-hora 09:00); o 28.º Marines em Green Beach com a missão de cortar o istmo e isolar o Suribachi; elementos de 1/28 e 2/28 na costa oeste em menos de 90 minutos; a base do Suribachi cercada a D+3; bandeira a 23/2 às 10:20 (S-C04 — DOCUMENTED em resumo) |
| Unidade | 28.º Marines, 5.ª Divisão (canónico) → 1.º Batalhão (proposta, RECONSTRUCTED) → esquadra de Finch |
| Elenco | pte. Leo Finch (POV), sgt. Burt Kessler (graduado), HA1c Milo Jensen (socorrista da Marinha), pfc. Eddie Salas (o que gritava ao lado; `missing`), pte. Jimmy Rourke (ferido que ouve a voz), cabo Pete Lundgren (tripulação do LVT avariado; junta-se à esquadra), pfc. Ray Okafor (BAR — proposta), uma equipa de lança-chamas/demolição do batalhão (dois homens sem nome: "a equipa"), um observador avançado por voz (propostas) |
| Fora de cena | gen. Holland Smith; os homens das bandeiras de 23/2; o Suribachi como monte, nunca como objetivo |
| Intocável | data, local, unidade, POV, falas `dlg_m24_001–003`, os cinco checkpoints (praia, veículos e feridos persistentes), "não é Omaha pintada de preto", tripulações que saem de veículos avariados, fogo oculto sem radar, apoio adequado sem Finch a "encerrar a ilha", bandeira só a 23/2, Salas ausente no fim, "a batalha prossegue" |

---

## 1. Story Bible

**Logline.** Leo Finch memoriza o Suribachi do LVT como quem decora um nome para não o esquecer. Na praia, a cinza engole as botas até ao tornozelo e os primeiros minutos são quase silêncio: ninguém dispara sobre eles. Depois o fogo começa de todo o lado e de lado nenhum. Finch sobe três terraços, reúne homens, leva munição a uma posição, aprende a ler de onde vem o fogo pelos impactos e não pelo inimigo, e atravessa um istmo de 300 metros até ver o outro mar. Ao anoitecer, Rourke jura que ouviu a voz de Salas atrás do terraço. Salas não está. A bandeira é de outro dia.

**As oito respostas.**
1. **Situação central:** areia negra — atravessar o istmo no primeiro dia (MASTER-STORY-BIBLE §4).
2. **Modo de contar:** terraços subidos (metros) — a guerra mede-se pela linha de areia que se ganhou, não por inimigos vistos.
3. **Objeto:** a peça de equipamento de Salas na rebentação (a bolsa do cantil com o nome a tinta; Finch recolhe-a num momento de calmaria, sem espetáculo — PR #44).
4. **Silêncio:** os minutos antes de o fogo começar (a praia quase sem tiros; a cinza; a respiração).
5. **Tarefa que não é matar:** procurar cobertura num terreno que a recusa; reunir; levar apoio; localizar o fogo pela leitura; marcar a seteira para a equipa; manter a ligação; garantir passagem para feridos e reforços.
6. **Custo humano:** ao anoitecer, Rourke (ferido na coxa no terceiro terraço, evento fixo às 10:20) jura ouvir a voz de Salas do outro lado do terraço (causa: Salas gritava ao lado de Finch até ao segundo terraço; depois do fogo intenso ninguém o viu) → Finch pode procurar uma posição de cobertura real para que Jensen trate e evacue Rourke pela passagem ("Tenho um homem aqui. Protejam esta passagem.") / Kessler manda seguir para a costa ("Não parem todos no mesmo lugar.") → `m24.rourke_status = evacuated` (passagem protegida: a maca passa à tarde) ou `evacuated_late` (Jensen trata no sítio; a maca passa ao anoitecer com outro grupo); **Salas continua `missing` em qualquer ramo** — a voz que Rourke ouviu não se confirma; o jogo não o oferece para resgate.
7. **Pessoas históricas:** Holland Smith e os homens das bandeiras fora de cena; Kuribayashi nem nomeado.
8. **Debrief:** regista o 28.º em Green Beach às 09:00, a costa oeste alcançada por elementos de 1/28 e 2/28 em menos de 90 minutos, a base do Suribachi cercada a D+3, a bandeira de 23/2, a batalha até 26/3; Salas `missing`; "o primeiro dia foi uma linha de areia, não um monte".

**Três motivos.** (a) *A cinza* — cada passo afunda; a cobertura é um terraço, não uma parede; (b) *o fogo sem origem* — "Achamos cobertura. Ainda precisamos chegar até eles." (003): chegar é o problema, não disparar; (c) *o nome a tinta* — Salas existe por um cantil.

**Temas.** O terreno como inimigo; ver o monte e não o tomar; ler em vez de ver; o trânsito dos outros como medida de sucesso; a ausência sem corpo.

**Estrutura (§54).** CONTEXTO → INTRO (o LVT; o Suribachi memorizado; a praia quase calada) → APROXIMAÇÃO (primeira cobertura: a cinza recusa-a) → DIÁLOGO (Kessler: "Não parem todos no mesmo lugar.") → PRIMEIRO CONTATO (o fogo começa: reunir; Jensen; o LVT de Lundgren avariado) → ESCALADA (levar apoio ao terraço; localizar o fogo oculto por impactos) → COMBATE PRINCIPAL (a equipa neutraliza a seteira marcada; avanço curto pelo istmo) → SET-PIECE (passagem para feridos; Rourke; Jensen) → PAUSA (calmaria: a bolsa do cantil) → CLÍMAX (ligação e consolidação na costa oeste; reforços passam) → CONSEQUÊNCIA (anoitecer; Rourke ouve a voz; Salas não está) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Finch | memoriza o Suribachi; recolhe sem exibir | Kessler; Salas | a cinza; o fogo sem origem; a passagem | mede sucesso pela linha de areia e pelo trânsito dos outros | na costa oeste; a bolsa do cantil |
| Kessler | "Não parem todos no mesmo lugar." (001) | esquadra | Rourke | — | vivo |
| Jensen | "Tenho um homem aqui. Protejam esta passagem." (002) | feridos | a passagem | — | vivo; continua |
| Salas | grita ao lado de Finch até ao segundo terraço | Finch | — | — | `missing` (nunca visto cair) |
| Rourke | ferido às 10:20 (fixo) | Jensen | ouve a voz | — | `rourke_status` |
| Lundgren | sai do LVT avariado com a tripulação | esquadra | — | passa a espingardeiro | vivo |
| Okafor | BAR | Kessler | — | — | vivo |

**O que a missão recusa.** Omaha pintada de preto (sem rampa de LCVP, sem obstáculos de praia, sem falésia); a bandeira; o Suribachi como objetivo; radar de inimigos; tanques em chamas com tripulação sentada; Finch a destruir todos os bunkers; cadáveres carbonizados em grande plano; um Salas encontrado; o istmo em escala real sem compressão declarada.

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "O monte" (`cs_m24_intro`, ≤ 70 s)
2 08:50 · 3 interior de um LVT-4 a 400 m da praia; mar com ondulação curta; a praia negra; o Suribachi à esquerda, perto de mais; a frota atrás (couraçados em fogo de preparação) · 4 manhã clara e fresca; sol atrás da frota; o monte contra o céu (R) · 5 Finch, Kessler, Salas, Rourke, Okafor, Jensen, a esquadra (12); Lundgren ao leme do LVT · 6 Cartela: IWO JIMA — GREEN BEACH — 19 DE FEVEREIRO DE 1945 — 08:50 · 28.º MARINES · 5.ª DIVISÃO DE MARINES. Finch olha para o Suribachi e repete-o para si (um plano de 3 s no monte; sem fala). Salas, ao lado, grita por cima do motor: "Vês aquilo? É pequeno. Dizem que é pequeno." Kessler: "Não é nosso hoje. O istmo é nosso. Quando sair, ninguém pára na água." A preparação naval levanta terra no monte. O LVT roça o fundo; a rampa não desce (LVT-4 tem rampa traseira: **desce atrás**). · 7 estabelecer o monte como presença, o istmo como tarefa, Salas como voz, o veículo correto · 8 olhar · 9 — · 10 — · 11 fogo naval (amigo, longe) · 12 o LVT; as rochas negras; o monte · 13 `dlg_m24_010–013` · 14 motor do LVT; mar; a preparação naval; **nenhum tiro inimigo** · 15 plano fixo no Suribachi (3 s); rampa traseira a descer · 16 `missionStart` · 17 rampa · 18 — · 19 [C] LVT-4 encenado (cutscene; rampa traseira) · 20 M23 (neve) → M24 (cinza): corte seco

### Cena 2 — "Os minutos antes" (jogável; `obj_m24_first_cover`)
2 09:00–09:25 · 3 a praia: 30 m de areia molhada, depois cinza seca a subir em três terraços (1,5 m; 2,5 m; 3 m), equipamento a chegar, LVTs a virar, homens a afundar-se até ao tornozelo; nenhuma parede, nenhum obstáculo de praia · 4 sol claro; o monte à esquerda · 5 esquadra; outras vagas a chegar (proxies, 40); poucos tiros inimigos (esparsos, longe: fogo de morteiro ocasional ≥ 50 m) · 6 Alcançar a praia e procurar cobertura "conforme as condições do terreno": **a cinza recusa a cobertura** — cavar não serve (a cinza escorre), deitar-se na praia aberta é ficar à vista; a única cobertura é a base de um terraço; mover-se custa (velocidade 60 %, pegadas que se desfazem, equipamento que escorrega); os minutos quase silenciosos são jogo: subir o primeiro terraço antes de o fogo começar (às 09:25 por agenda — "hora do fogo intenso" P-C24); Salas grita ao lado ("Isto é só areia! Onde estão eles?"); Kessler: "Não parem todos no mesmo lugar." (001) · 7 §79 ponto 1 ("Os instantes iniciais de desembarque… diferentes de Omaha") · 8 anda na cinza (lento); sobe o terraço (interação: agarrar a borda, 3 s); espalha-se (ficar junto de ≥ 3 homens dispara a fala 001 e, depois do fogo, um morteiro agendado ≥ 30 m) · 9 subir já (exposto 3 s) vs esperar na base (o fogo começa e apanha a praia) · 10 Kessler; Salas grita; Jensen com a bolsa; Okafor com a BAR afundada · 11 esparsos (dados) até 09:25 · 12 pegadas, equipamento abandonado, um LVT virado · 13 `dlg_m24_001` (canónica), `014–018` · 14 **rebentação → cinza (passos que se afundam) → quase nada** (AUDIO: "antes do fogo") · 15 livre; a cinza como plano próximo · 16 rampa · 17 primeiro terraço subido por Finch (`evt_m24_terrace1`) · 18 `cp_m24_a_primeira_cobertura`; `m24.first_cover_time` · 19 [C] cinza (movimento, pegadas) e terraços como interação de subida · 20 Salas ainda ao lado

### Cena 3 — "O fogo começa" (jogável; `obj_m24_rally`)
2 09:25–10:20 · 3 o primeiro e o segundo terraço; a praia atrás a ser batida; um LVT-4 avariado (lagarta na cinza) a 40 m com a tripulação a sair · 4 sol; poeira negra · 5 esquadra; vagas seguintes; Lundgren e dois tripulantes a sair do LVT; Jensen entre feridos; inimigos: morteiros e artilharia do Suribachi e do norte (dados; impactos agendados ≥ 30 m com assobio), MG ocultas de ambos os lados do istmo (dados: só disparam sobre quem está em linha de visão, e a origem **não é mostrada**) · 6 Reunir homens durante a intensificação: Kessler manda Finch juntar os que ficaram na base do primeiro terraço (interação "connosco", 3 homens) e trazer a tripulação do LVT (Lundgren: "A lagarta foi. O canhão também. Somos infantaria."); Jensen trabalha entre feridos e pede que lhe tragam um (Finch carrega um proxy 20 m até ao abrigo do terraço: a dois com Okafor); **Rourke** é atingido na coxa às 10:20 (fixo) ao subir o terceiro terraço; Salas sobe à frente a gritar: é a última vez que se vê · 7 §79 ponto 2 ("tripulações reagem a veículos avariados e não ficam permanentemente sentadas em tanques em chamas") · 8 reúne; traz a tripulação; carrega a dois; sobe o segundo terraço · 9 carregar / cobrir (Okafor carrega se não) · 10 Kessler reúne; Jensen trata; Lundgren sai do LVT e tira a MG do veículo? **não** (a .50 fica; ele traz a sua carabina); Salas sobe · 11 morteiros/artilharia (dados); MG por linha de visão · 12 o LVT avariado (persistente), pegadas, equipamento, feridos no terraço · 13 `dlg_m24_019–026` · 14 **o fogo começa** (um impacto perto, depois muitos: a mudança é uma cadência, não um susto), ordens entrecortadas, o motor do LVT a morrer · 15 livre · 16 CP-A · 17 esquadra reunida no segundo terraço (`evt_m24_rallied`) · 18 `cp_m24_b_reuniao`; `m24.men_rallied`; `m24.lundgren_joined`; `m24.rourke_wounded = true` (fixo); `m24.salas_last_seen = terrace2` · 19 [C] veículo avariado persistente com tripulação que sai; [A] `safeImpact`, reunir, maca a dois · 20 Salas desaparece a partir daqui

### Cena 4 — "Ler o fogo" (jogável; `obj_m24_bring_support`, `obj_m24_locate_fire`)
2 10:20–11:30 · 3 o terceiro terraço e o rebordo do planalto baixo do istmo: cinza, rochas, pouca vegetação, o terreno sobe para o norte; uma posição da esquadra vizinha 60 m à frente, encravada; impactos a levantar cinza em linha · 4 sol alto; poeira · 5 esquadra; a esquadra vizinha; a equipa de lança-chamas/demolição do batalhão à espera atrás do terraço; inimigos: uma MG oculta numa seteira de bunker camuflado (dados; só a boca de fogo pisca quando dispara; a seteira não é marcada no HUD), um morteiro · 6 Levar apoio a uma posição (duas caixas de .30 e uma bolsa de granadas à esquadra vizinha: 60 m sob fogo intermitente, por saltos entre buracos de obus) e localizar a origem do fogo oculto: **pela leitura** — a linha de impactos na cinza (direção), onde os homens caem (altura: "rasteiro, vem de baixo"), o relato da vizinha ("Esquerda, à altura do joelho, a cada seis segundos"), e a observação (o piscar na seteira, visível só de um ponto: o buraco de obus à direita); Finch marca a seteira (interação: apontar e dizer a Kessler; Kessler passa à equipa) — a equipa faz o resto (lança-chamas e carga: **sem** grande plano; o bunker cala-se; Finch cobre a equipa) · 7 §79 ponto 3 ("sem radar omnisciente") · 8 leva as caixas por saltos; observa os impactos; muda para o buraco certo; marca; cobre a equipa · 9 buraco da direita (vê a seteira; exposto ao morteiro) vs esquerda (coberto; não vê) · 10 Kessler lê com Finch; Okafor suprime (BAR); a equipa avança quando marcada; Jensen fica com Rourke no segundo terraço · 11 MG oculta (dados; cadência de 6 s); morteiro ≥ 30 m · 12 impactos em linha, caixas, o bunker camuflado (depois: a seteira negra) · 13 `dlg_m24_027–035` · 14 **tiros concentrados**, o assobio do morteiro, o lança-chamas (curto, abafado, sem lingering), silêncio da seteira · 15 livre; sem câmara na equipa durante a ação (plano no cobrir) · 16 CP-B · 17 bunker calado (`evt_m24_bunker_silenced`) · 18 `cp_m24_c_apoio`; `m24.support_delivered`; `m24.fire_located` (por leitura: `impacts`, `report`, `observation` — contam-se as três) · 19 [C] fogo oculto por impacto (MG cuja origem é só som/flash; a IA não "marca"); [A] fogo como dados, supressão; [B] marcar a seteira · 20 —

### Cena 5 — "Tenho um homem aqui" (jogável; `obj_m24_advance_isthmus`, `obj_m24_wounded_passage`) — **custo humano**
2 11:30–14:00 (escala acelerada; `readyScale`) · 3 o istmo (≈ 300 m jogáveis): cinza, rochas, um campo de pequenos bunkers e buracos de aranha (a maioria vazios ou já tratados por outros grupos: dados), o terreno desce para a costa oeste; a passagem para feridos: um corredor entre dois buracos de obus, exposto a uma MG do lado do Suribachi (sul) · 4 sol a oeste; o monte agora à esquerda e atrás · 5 esquadra; outros grupos em avanço (proxies, 20–30) por acessos próprios; tanques do 5.º Tank Bn atrás, atolados na cinza (NPC; tripulações a sair); Jensen com Rourke a chegar à passagem; inimigos: fogo do Suribachi (MG a 300 m, por agenda), buracos de aranha com um ou dois homens (dados), morteiros · 6 Apoiar um avanço curto pelos acessos do setor: a esquadra avança por saltos; os buracos de aranha tratam-se com granada e cobertura (Okafor), nunca "limpeza total" (os que não disparam ficam para os grupos seguintes); **a passagem para feridos**: Jensen: "Tenho um homem aqui. Protejam esta passagem." (002) → decisão: montar uma posição de cobertura real (Finch e Okafor num buraco de obus a suprimir a MG do sul durante os 40 s da passagem; Lundgren ajuda a maca) → Rourke passa à tarde (`rourke_status = evacuated`); ou seguir Kessler ("Não parem todos no mesmo lugar." repetida em tom de ordem: a esquadra tem a costa) → Jensen trata no sítio e espera outro grupo; Rourke passa ao anoitecer (`evacuated_late`); nenhum ramo o mata · 7 §79 ponto 4 e o custo humano · 8 avança por saltos; granada; suprime (40 s) ou segue · 9 proteger a passagem / seguir · 10 Kessler avança; Okafor suprime; Lundgren na maca; Jensen · 11 MG do sul (agenda: rajadas de 8 s / pausas de 12 s); buracos de aranha (dados) · 12 buracos de aranha, cinza revolvida, um tanque atolado ao longe · 13 `dlg_m24_002` (canónica), `036–044` · 14 sal e surf abafado atrás; a MG do sul; ordens entrecortadas; tanques a rodar na cinza (longe) · 15 livre · 16 CP-C · 17 o rebordo da descida para a costa oeste (`evt_m24_isthmus_edge`) · 18 `cp_m24_d_avanco`; `m24.rourke_status`; `m24.passage_held` · 19 [A] supressão por janela, maca a dois; [C] tanques NPC atolados com tripulação que sai · 20 —

### Cena 6 — "A bolsa do cantil" (jogável; calmaria; `obj_m24_calm`)
2 14:00–14:20 · 3 um buraco de obus grande no rebordo; a rebentação do lado oeste já se ouve; equipamento espalhado: um capacete, uma bolsa de cantil com "SALAS E." a tinta · 4 sol a descer; o monte atrás · 5 esquadra (sem Salas; Rourke com Jensen ou já evacuado); Lundgren · 6 Calmaria entre fases: munição contada, água, Jensen a trocar ligaduras; Finch vê a bolsa do cantil na cinza (interação: recolher — sem comentário; Kessler olha e não diz nada); ninguém pergunta por Salas ainda · 7 "Mostrar o equipamento do companheiro ausente num momento de calmaria, sem espetáculo sobre a perda" (PR #44) · 8 recolhe a bolsa (opcional; se não, Kessler recolhe-a mais tarde: `m24.salas_item_by = kessler`) · 9 — · 10 — · 11 morteiros esparsos · 12 a bolsa, o capacete · 13 `dlg_m24_045–047` · 14 **silêncio relativo**: a rebentação oeste, a respiração, a lata de água · 15 beat fixo na bolsa (3 s) · 16 edge · 17 Kessler: "Costa." · 18 `m24.salas_item_by` · 19 [B] interação de recolher · 20 a bolsa é lida por M30? **não**: Finch não tem epílogo de objeto; fica no registo

### Cena 7 — "A costa oeste" (jogável; clímax; `obj_m24_link_consolidate`)
2 14:20–17:30 (escala acelerada entre pressões) · 3 a descida para a costa oeste: rochas negras, a rebentação, uma plataforma de cinza entre dois promontórios; a esquadra vizinha à direita; o corredor de volta ao istmo para reforços e feridos · 4 tarde; sol baixo a oeste sobre o mar (contraluz) · 5 esquadra; a esquadra vizinha; reforços que chegam pelo istmo (proxies, 15); inimigos: pressão do norte (infantaria japonesa por buracos, dados, 15:30 e 16:40); morteiros do Suribachi (agenda) · 6 Manter uma ligação (com a esquadra vizinha por voz e por um estafeta: Lundgren) e consolidar a posição alcançada no primeiro dia: posições em buracos de obus, rotação por supressão, duas pressões repelidas; **garantir passagem para feridos/reforços**: o jogador mantém o corredor do istmo coberto (posiciona Okafor; marca o corredor com um pano para os que chegam); os reforços passam e assumem o flanco norte — o clímax é "espaço suficiente para um novo grupo chegar" (PR #44), não um monte · 7 §79 ponto 5 · 8 defende; roda; posiciona; marca o corredor; cobre a chegada · 9 buraco do mar (vê o norte; exposto ao morteiro) vs buraco da rocha (coberto; cego ao corredor) · 10 Kessler; Okafor; Lundgren estafeta; a vizinha · 11 duas pressões (dados; ≥ 30 m para morteiros); nenhum "banzai" · 12 o outro mar; pano no corredor; reforços a chegar · 13 `dlg_m24_003` (canónica: ao ver a costa), `048–055` · 14 rebentação oeste (agora perto); pressões abafadas por rocha; o istmo atrás · 15 livre; contraluz do mar · 16 costa · 17 reforços no flanco norte (`evt_m24_consolidated`) · 18 `cp_m24_e_consolidacao`; `m24.isthmus_crossed`; `m24.link_established` · 19 [A] · 20 —

### Cena 8 — "A voz" (`cs_m24_outro`, ≤ 70 s) + debrief
2 17:30–18:00 · 3 a plataforma ao anoitecer; a rebentação; Rourke numa maca (se `evacuated_late`, a maca passa agora com outro grupo; se `evacuated`, só Jensen) · 4 anoitecer; o monte contra o céu a leste, com clarões · 5 Finch, Kessler, Jensen, Okafor, Lundgren; Rourke (variante) · 6 Rourke (ou Jensen a citar Rourke, se já evacuado: "O Rourke jurava que ouviu o Salas do outro lado do terraço"): "Ouvi-o. Atrás do terraço. A gritar como de manhã." Finch olha para o istmo atrás: ninguém. Kessler: "Não ouviste. Amanhã procuramos entre os que chegaram à praia." Finch tira a bolsa do cantil do cinto (se a recolheu) e volta a guardá-la. Cartela: o 28.º Marines alcançou a costa oeste no primeiro dia; a base do Suribachi foi cercada a 22/2; a bandeira foi içada a 23/2 por outros homens; a batalha continuou até 26/3. Cartela 2: "Eddie Salas: desaparecido em combate, 19/2/1945." · 7 §79 final ("A batalha prossegue. A bandeira de 23/2 pertence a outra data") · 8 skip · 9 — · 10 — · 11 — · 12 a bolsa; o monte com clarões · 13 `dlg_m24_056–059` · 14 **silêncio obrigatório**: rebentação; o monte ao longe; nenhuma música · 15 plano fixo em Finch de costas para o monte; a bolsa · 16 `evt_m24_consolidated` · 17 `missionEnd` · 18 `m24.completed`; `m24.salas_status = missing` (fixo) · 19 [A] cutscene com variantes · 20 fecha Finch; M25 abre com Hughes no Reno

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m24_first_cover` | Saia da praia e suba o primeiro terraço antes de o fogo começar | sim | rampa | terraço 1 | — (o fogo começa na mesma; só muda onde apanha) | `first_cover_time` | A |
| `obj_m24_rally` | Reúna os homens e a tripulação do LVT; leve um ferido a Jensen | sim | A | `evt_m24_rallied` | — | `men_rallied`; `lundgren_joined`; `rourke_wounded` (fixo) | B |
| `obj_m24_bring_support` | Leve munição à esquadra vizinha | sim | B | entregue | — | `support_delivered` | — |
| `obj_m24_locate_fire` | Localize a origem do fogo pela leitura; marque a seteira | sim | apoio | marcada; bunker calado | — | `fire_located` | C |
| `obj_m24_advance_isthmus` | Avance pelo istmo por saltos | sim | C | rebordo | — | — | D |
| `obj_m24_wounded_passage` | Proteja a passagem para Rourke | sim (decisão) | 002 | maca passa **ou** Kessler segue | — | `rourke_status`; `passage_held` | — |
| `obj_m24_calm` | (calmaria) recolha o que está na cinza | opcional | rebordo | bolsa | — | `salas_item_by` | — |
| `obj_m24_link_consolidate` | Ligue com a vizinha e consolide; garanta o corredor | sim | costa | reforços no flanco | — | `isthmus_crossed`; `link_established` | E |

### 3.2 Setores
`s1_green_beach` (perto) · `s2_terraces` (perto) · `s3_isthmus` (perto, comprimido) · `s4_west_coast` (perto) · `s5_mid` (médio: outras praias, grupos em avanço, tanques atolados, a esquadra vizinha) · `s6_far` (longe: frota, Suribachi com fogo, o planalto norte). Agendas: fogo intenso 09:25; LVT de Lundgren avaria 09:35; Rourke 10:20 (fixo); MG oculta cadência 6 s; equipa avança ao ser marcada; MG do sul rajadas 8 s/pausas 12 s; passagem de Rourke 40 s; pressões 15:30/16:40; reforços 16:00 (chegam ao flanco às 17:00).

### 3.3 Checkpoints
A primeira cobertura · B reunião · C apoio (bunker calado) · D avanço (rebordo; `rourke_status`) · E consolidação. Salvam o estado da praia (LVT virado, LVT avariado, equipamento), veículos (tanques atolados), feridos (Rourke, proxies).

### 3.4 Justiça
Morteiros/artilharia sempre com assobio e ≥ 30 m; a MG oculta só dispara sobre linha de visão e a origem é legível por três leituras (impactos, relato, observação); a cinza abranda mas nunca "prende"; os primeiros minutos são realmente quase silenciosos; Rourke é fixo e vive em ambos os ramos; Salas nunca é oferecido; os buracos de aranha que não disparam não precisam de ser limpos; nenhum "banzai".

---

## 4. Set pieces

### SP-24-1 "Os minutos antes"
Contexto: a praia. Preparação: o monte memorizado; Salas a gritar. Experiência: a cinza que engole; a cobertura que não existe; subir o terraço; o quase silêncio; o fogo que começa como cadência. Companheiros: Kessler espalha; Jensen; Lundgren sai do LVT. Ambiente: pegadas, LVT virado. Evolução: 09:25. Clímax: fala 001. Consequências: CP-A/B. Requisitos: [C] cinza, terraços, LVT. Integração: `obj_m24_first_cover`, `obj_m24_rally`.

### SP-24-2 "Ler o fogo"
Contexto: o terceiro terraço. Preparação: a vizinha encravada. Experiência: levar caixas por saltos; a linha de impactos; o relato; o piscar na seteira; marcar; cobrir a equipa; o bunker cala-se sem espetáculo. Companheiros: Kessler lê; Okafor suprime; a equipa. Ambiente: impactos em linha. Evolução: três leituras. Clímax: a seteira negra. Consequências: `fire_located`. Requisitos: [C] fogo oculto por impacto. Integração: `obj_m24_bring_support`, `obj_m24_locate_fire`.

### SP-24-3 "Tenho um homem aqui"
Contexto: o istmo. Preparação: Rourke ferido às 10:20. Experiência: a passagem exposta; 40 s de supressão ou seguir; a maca passa à tarde ou ao anoitecer. Companheiros: Jensen; Lundgren; Kessler. Ambiente: buracos de aranha. Evolução: a MG do sul por janelas. Clímax: fala 002. Consequências: `rourke_status`. Requisitos: [A] supressão por janela, maca a dois. Integração: `obj_m24_wounded_passage`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| LVT | rochas negras, o monte | — | — | — | Salas grita | — |
| praia | areia molhada, cinza, LVT virado, equipamento | vagas a chegar | quase silêncio | esparsos | — | pegadas que se desfazem |
| terraços | buracos de obus, LVT avariado | reunir; Jensen | o fogo começa | morteiros; MG | Lundgren sai; Rourke | feridos no terraço |
| rebordo | impactos em linha, caixas, bunker camuflado | levar apoio | leitura | MG oculta | a equipa | seteira negra |
| istmo | buracos de aranha, tanques atolados | avanço por saltos | a passagem | MG do sul | Jensen; Rourke | maca passou (ou não ainda) |
| buraco grande | a bolsa do cantil, capacete | calmaria | — | — | — | bolsa recolhida |
| costa oeste | rochas, rebentação, pano no corredor | consolidar | pressões | pressões | reforços | flanco assumido |

Objetos com origem: a bolsa do cantil (Salas; o nome a tinta de Camp Tarawa, Havai), o LVT virado (segunda vaga, 09:05), o LVT avariado (lagarta na cinza, 09:35), os tanques atolados (5.º Tank Bn, 10:00+), o pano do corredor (uma toalha de Okafor).

---

## 6. Diálogos (VO inglês; japonês só por vozes abafadas em buracos, sem tradução)

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Kessler | "Não parem todos no mesmo lugar." (§79) | ≥ 3 juntos | 0 | 30 |
| 002 | Jensen | "Tenho um homem aqui. Protejam esta passagem." (§79) | istmo | 1 | — |
| 003 | Finch | "Achamos cobertura. Ainda precisamos chegar até eles." (§79) | ver a costa | 1 | — |
| 010 | Salas | "Vês aquilo? É pequeno. Dizem que é pequeno." (V1) | intro t 10 | 2 | — |
| 011 | Kessler | "Não é nosso hoje. O istmo é nosso. Quando sair, ninguém pára na água." (V1) | intro t 25 | 1 | — |
| 012 | Rourke | "Porque é que ninguém dispara?" (V1) | intro t 45 | 3 | — |
| 013 | Lundgren | "Rampa atrás! Saiam pela traseira!" (V1) | intro fim | 1 | — |
| 014 | Salas | "Isto é só areia! Onde estão eles?" (V1) | praia | 2 | — |
| 015 | Kessler | "Cavar não serve. Escorre. O terraço é a parede." (V1) | cavar | 1 | — |
| 016 | Okafor | "A BAR afunda. Dá-me a mão." (V1) | terraço | 2 | — |
| 017 | Jensen | "Ainda não há ninguém para mim. Vai haver." (V1) | praia | 3 | — |
| 018 | Kessler | "Primeiro terraço. Já. Antes de eles acordarem." (V1) | 09:15 | 1 | — |
| 019 | Kessler | "Começou. Ouvem a cadência? Agora é a sério." (V1) | 09:25 | 0 | — |
| 020 | Lundgren | "A lagarta foi. O canhão também. Somos infantaria." (V1) | LVT | 1 | — |
| 021 | Kessler | "Finch. Os três da base do terraço. Traz-mos." (V1) | reunir | 1 | — |
| 022 | Jensen | "Um ferido ali. Dois homens. Devagar na cinza." (V1) | ferido | 1 | — |
| 023 | Salas | "Eu vou à frente! Vejo o segundo!" (V1; última fala) | 10:15 | 1 | — |
| 024 | Rourke | "…coxa. Jensen! **Jensen!**" (V1) | 10:20 | 0 | — |
| 025 | Jensen | "Aqui. Não mexas. Finch, fica com a esquadra; eu fico com ele." (V1) | 024 | 1 | — |
| 026 | Kessler | "Segundo terraço. Contem-se." (V1) | rallied | 1 | — |
| 027 | Kessler | "A vizinha está encravada. Duas caixas e granadas. Por saltos, buraco a buraco." (V1) | apoio | 1 | — |
| 028 | vizinha (voz) | "Esquerda! À altura do joelho! A cada seis segundos!" (V1) | relato | 1 | — |
| 029 | Kessler | "Vês a linha na cinza? A cinza diz de onde vem. Não procures o homem; procura o buraco." (V1) | impactos | 1 | — |
| 030 | Okafor | "Pisca. Ali. Só se vê deste buraco." (V1) | observação | 1 | — |
| 031 | Finch | "Seteira a dez horas, abaixo da rocha partida." (V1; marcar) | marcar | 0 | — |
| 032 | Kessler | "Equipa! A dez horas, rocha partida. Nós cobrimos." (V1) | 031 | 0 | — |
| 033 | Okafor | "BAR a cobrir. Vão." (V1) | equipa avança | 1 | — |
| 034 | equipa (voz) | "Feito." (V1) | bunker calado | 1 | — |
| 035 | Kessler | "Não olhem. Istmo." (V1) | 034 | 1 | — |
| 036 | Kessler | "Por saltos. Buraco de aranha: granada e passa. Os que não disparam ficam para os de trás." (V1) | istmo | 1 | — |
| 037 | Lundgren | "Tanques atrás. Atolados. A tripulação vem a pé." (V1) | tanques | 2 | — |
| 038 | Jensen | (002) | passagem | 1 | — |
| 039 | Kessler | "Finch. A costa. Não parem todos no mesmo lugar." (V1; repetição em tom de ordem) | 038 | 1 | — |
| 040 | Finch | "Okafor, buraco da direita. Quarenta segundos." (V1; se protege) | decisão | 0 | — |
| 041 | Jensen | "Agora! Lundgren, atrás da maca!" (V1; passagem) | supressão | 0 | — |
| 042 | Jensen | "Então trato-o aqui. O próximo grupo leva-o." (V1; se segue) | — | 1 | — |
| 043 | Rourke | "Não me deixem na areia." / Jensen: "Não é areia. E não te deixo." (V1) | — | 2 | — |
| 044 | Kessler | "Rebordo. Dali vê-se o outro mar." (V1) | rebordo | 1 | — |
| 045 | Okafor | "Munição. Contem." (V1) | calmaria | 2 | — |
| 046 | Finch | (recolhe a bolsa; sem fala) | bolsa | — | — |
| 047 | Kessler | (olha; não diz nada; depois) "Costa." (V1) | — | 1 | — |
| 048 | Finch | (003) | ver a costa | 1 | — |
| 049 | Kessler | "Ligação com a vizinha. Lundgren, a pé, à direita." (V1) | costa | 1 | — |
| 050 | Kessler | "Pressão do norte. Buracos." (V1) | 15:30 | 0 | — |
| 051 | Okafor | "Corredor do istmo. Marca-o com alguma coisa; os de trás não sabem o caminho." (V1) | corredor | 1 | — |
| 052 | reforços (voz) | "28.º? Onde é o flanco?" / Finch: "Norte. Pelo pano." (V1) | 16:00 | 1 | — |
| 053 | Kessler | "Segunda. Aguentem até eles assumirem." (V1) | 16:40 | 0 | — |
| 054 | Lundgren | "A vizinha responde. Estamos ligados." (V1) | ligação | 1 | — |
| 055 | Kessler | "Flanco deles. Hoje acabou aqui." (V1) | consolidated | 1 | — |
| 056 | Rourke / Jensen (variante) | "Ouvi-o. Atrás do terraço. A gritar como de manhã." / "O Rourke jurava que ouviu o Salas do outro lado do terraço." (V1) | outro | 1 | — |
| 057 | Kessler | "Não ouviste. Amanhã procuramos entre os que chegaram à praia." (V1) | 056 | 1 | — |
| 058 | Okafor | "Ele estava ao teu lado." (V1) | outro | 2 | — |
| 059 | Finch | (guarda a bolsa; sem fala) | outro fim | — | — |

Callouts: `co_m24_fire_begins`, `co_m24_mortar_whistle`, `co_m24_mg_hidden` (só direção/altura, nunca posição), `co_m24_mg_south_pause`, `co_m24_pressure_north`. Silêncios: a praia antes de 09:25; a bolsa (3 s); o anoitecer.

---

## 7. Arte e atmosfera

**Paleta:** preto de cinza vulcânica (com micro-brilho), cinzento-azulado do mar, verde-musgo de HBT/P1944 Marines, aço de LVT, castanho-cinza do Suribachi, branco de rebentação, laranja de fogo naval ao longe. **Luz:** 08:50 sol atrás da frota (contraluz no mar); 10:00 sol alto com poeira negra (a cinza absorve a luz: sombras fracas); 14:00 sol a oeste; 17:30 anoitecer com o monte contra o céu e clarões. **Materiais:** cinza (pegadas que se desfazem em 20 s), areia molhada, rocha vulcânica, lona, aço de LVT, borracha de lagarta. **Silhuetas:** o Suribachi (EXACT), terraços como degraus, LVTs virados/avariados, tanques atolados, o outro mar. **Destruição:** persistente (veículos, buracos de obus, bunker calado). **Humanos:** camuflado Marines 1945, capacetes com cobertura, equipamento afundado; Jensen com bolsas da Marinha; sem sangue em grande plano; a equipa de lança-chamas sem plano aberto durante a ação. **Violência reduzida:** nenhum corpo carbonizado; o bunker "cala-se".

**Imagem única:** a encosta do Suribachi ao longe; areia preta com pegadas que se desfazem (ART §4, EXACT para o monte).

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| LVT | motor, mar, rampa traseira | outros LVTs | fogo naval | — |
| praia | **rebentação → cinza (passos que se afundam)** | vagas | esparsos | **antes do fogo** |
| terraços | **o fogo começa** (cadência), ordens entrecortadas, o LVT a morrer | feridos | artilharia do monte | — |
| rebordo | tiros concentrados, assobio de morteiro, o lança-chamas (curto, abafado) | a vizinha | — | a seteira calada |
| istmo | MG do sul por janelas, granadas abafadas em buracos | tanques a rodar na cinza | frota | — |
| buraco grande | lata de água, respiração | — | rebentação oeste | **relativo** |
| costa oeste | rebentação perto, pressões abafadas por rocha | corredor; reforços | o monte | — |
| anoitecer | rebentação | — | clarões no monte | **obrigatório** |

Sons novos: cinza vulcânica (passo por profundidade), LVT-4, fogo oculto com origem só por impacto/flash, lança-chamas curto. Música: nenhuma (M24 é o único "sem motivo" do movimento V: a cinza absorve). VO inglês; japonês abafado.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| H-hora 09:00; 28.º Marines em Green Beach; missão de cortar o istmo | D | H24; S-C04 | — |
| Elementos de 1/28 e 2/28 na costa oeste em < 90 min; base do Suribachi cercada D+3; bandeira 23/2 10:20 | D (resumo) | S-C04 | — |
| Terraços de cinza vulcânica; veículos atolados; fogo japonês inicialmente contido e depois intenso | D (geral) | H24 | **P-C24** (altura dos terraços; hora do fogo intenso) |
| Companhia de Finch; LVT-4 na primeira vaga do 28.º; tanques do 5.º Tank Bn atrás | R | — | P-C24 |
| Istmo comprimido 700 jardas → ≈ 300 m | COMPRESSED_FOR_GAMEPLAY (declarado) | — | cartela de compressão no debrief |
| Socorristas da Marinha (HA1c) com os Marines | D | — | — |
| Kessler, Jensen, Salas, Rourke, Lundgren, Okafor, a equipa | F | — | acrescentar Okafor a CONTINUITY §4 |
| Equipamento: M1, BAR, carabina, lança-chamas M2, LVT-4, Sherman (NPC); japonês: Type 92/99, morteiros, Type 97 | D | TIMELINE §3 | auditoria |

**Proibições:** bandeira a 19/2; Suribachi como objetivo; Holland Smith/homens das bandeiras em cena; Omaha pintada de preto; radar de inimigos; tripulações em tanques em chamas; Salas encontrado; "banzai"; cadáveres carbonizados. **Fora de cena:** Holland Smith; os homens das bandeiras; Kuribayashi (nem nomeado).

---

## 10. Handoff técnico

**Contrato:** `id m24_iwo_jima`, `order 24`, relógio 08:50→18:00 com `readyScale` entre fases, `cast` (Finch, Kessler, Jensen, Salas [até 10:15], Rourke, Lundgren + 2 tripulantes, Okafor, equipa ×2, vizinha [voz], reforços), grupos (`grp_squad`, `grp_neighbour_squad`, `grp_waves`, `grp_lvt_crew`, `grp_tank_crews_far`, `grp_demo_team`, `grp_reinforcements`, `grp_jp_hidden_mg`, `grp_jp_spiderholes`, `grp_jp_mg_south`, `grp_jp_pressure_a/b`, `grp_mortars_suribachi`), setores s1–s6, checkpoints A–E, cutscenes (intro, outro com variantes), falas, flags, debrief com cartela de compressão.

**Flags:** `m24.completed`, `m24.first_cover_time`, `m24.men_rallied`, `m24.lundgren_joined`, `m24.rourke_wounded` (fixo), `m24.support_delivered`, `m24.fire_located` (bitmask impacts/report/observation), `m24.rourke_status ∈ {evacuated, evacuated_late}`, `m24.passage_held`, `m24.salas_item_by ∈ {finch, kessler}`, `m24.isthmus_crossed`, `m24.link_established`, `m24.salas_status = missing` (fixo).

**Sistemas:** [C] cinza vulcânica (modificador de velocidade por profundidade, pegadas que se desfazem, impossibilidade de cavar), terraços como interação de subida, LVT-4 encenado e LVT avariado persistente com tripulação que sai, tanques NPC atolados, fogo oculto por impacto (MG sem marcador: só flash, som e impactos; `co_m24_mg_hidden` transmite direção/altura), lança-chamas da equipa como evento curto; [A] `safeImpact`, supressão por janela, maca a dois, reunir, rotação, fogo como dados; [B] marcar a seteira, marcar o corredor, recolher a bolsa. **Fallbacks honestos:** sem cinza dinâmica → modificador fixo de velocidade + textura com pegadas pré-cozidas; sem lança-chamas → a equipa usa carga (som e fumo) e o bunker cala-se.

**Disciplinas:** Level: praia de 30 m + três terraços, rebordo com buracos de obus e bunker camuflado, istmo de 300 m com buracos de aranha, costa oeste com dois promontórios e corredor; Combate/IA: MG oculta por linha de visão, buracos de aranha opcionais, pressões; Arte: cinza, Suribachi, LVTs, tanques; Personagens: Marines 1945, socorrista da Marinha; Animação: afundar na cinza, agarrar o terraço, sair do LVT pela traseira, saltos entre buracos, marcar, recolher a bolsa; Som: cinza, LVT-4, fogo oculto; VO: inglês/japonês abafado; Historiador: P-C24 (companhia, terraços, hora, LVT/tanques), compressão do istmo; QA: fogo intenso só a partir de 09:25; Rourke vivo em ambos os ramos; Salas nunca reaparece nem é "encontrável"; LVTs e tanques persistem após reload; a bandeira nunca existe no mundo.

**Testes:** nenhum tiro inimigo direto sobre o jogador antes de 09:25 (só esparsos ≥ 50 m); `fire_located` exige ≥ 2 das 3 leituras antes de `obj_m24_locate_fire` aceitar a marcação; a MG oculta nunca tem marcador de HUD; `rourke_status` nunca `dead`; `salas_status` sempre `missing`; o LVT avariado permanece após CP-C/D/E; o bunker calado não reativa.

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| O monte memorizado | (intro) | olhar | Salas grita; Kessler "o istmo é nosso" | — | start | — |
| Os minutos antes | `obj_m24_first_cover` | andar na cinza; subir o terraço; espalhar-se | Kessler 001; Jensen espera | pegadas; LVT virado | rampa | CP-A |
| O fogo começa; o LVT de Lundgren; Rourke | `obj_m24_rally` | reunir; trazer a tripulação; carregar a dois | Lundgren sai; Jensen trata; Salas sobe à frente | LVT avariado; feridos no terraço | 09:25 | CP-B; `rourke_wounded` |
| Ler o fogo | `obj_m24_bring_support` / `locate_fire` | levar caixas por saltos; ler; marcar; cobrir | vizinha relata; Okafor suprime; a equipa | seteira negra | B | CP-C; `fire_located` |
| Tenho um homem aqui | `obj_m24_advance_isthmus` / `wounded_passage` | saltos; granada; suprimir 40 s ou seguir | Jensen 002; Kessler repete 001; Lundgren na maca | maca passou (ou não ainda) | C | CP-D; `rourke_status` |
| A bolsa do cantil | `obj_m24_calm` | recolher | Kessler olha | bolsa recolhida | rebordo | `salas_item_by` |
| A costa oeste | `obj_m24_link_consolidate` | defender; rodar; marcar o corredor; cobrir reforços | Lundgren estafeta; vizinha; reforços | pano; flanco assumido | costa | CP-E; `isthmus_crossed` |
| A voz | (outro) | skip | Rourke/Jensen; Kessler | — | consolidated | `m24.completed`; `salas_status = missing` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 8 | o istmo como vitória de linha de areia; Salas por um cantil. |
| 2 | Autenticidade | 8 | S-C04 sólido; companhia/terraços/hora P-C24; compressão declarada. |
| 3 | Personagens | 8 | Kessler, Jensen, Lundgren, Okafor com funções claras; Salas é voz. |
| 4 | Diálogos | 8 | "Não procures o homem; procura o buraco." / "Não é areia. E não te deixo." |
| 5 | Originalidade | 9 | cobertura que não existe; fogo sem origem lido por três leituras; o silêncio inicial como jogo. |
| 6 | Variedade | 8 | subir, espalhar-se, reunir, trazer tripulação, carregar, levar caixas, ler, marcar, cobrir, saltos, suprimir por janela, recolher, ligar, marcar corredor. |
| 7 | Set pieces | 8 | nenhum é "onda"; o bunker cala-se sem espetáculo. |
| 8 | Atmosfera | 9 | cinza que absorve a luz; o monte sempre presente. |
| 9 | Environmental storytelling | 8 | LVT virado, tanques atolados, a bolsa, o pano. |
| 10 | Cinematográfica | 8 | o monte em 3 s; de costas para ele no fim. |
| 11 | Sonora | 9 | "o fogo começa" como cadência; o lança-chamas curto. |
| 12 | Impacto emocional | 8 | a voz que Rourke ouviu. |
| 13 | Ritmo | 8 | 22–30 min; `readyScale` no istmo e na costa. |
| 14 | Continuidade | 7 | Finch não volta; a ligação é pelo tema (areia negra → aço de M25) e pelo POV table. |
| 15 | Integração técnica | 5 | cinza, LVT, veículos persistentes e fogo oculto por impacto são [C]; fallbacks definidos. |

**Correções aplicadas:** (1) o LVT-4 recebeu rampa traseira (não frontal) para não copiar o LCVP de Omaha; (2) a sequência inicial é quase silenciosa por agenda (fogo intenso às 09:25, P-C24) para cumprir "não copiar a mesma sequência com outra cor de areia"; (3) a MG oculta nunca tem marcador: a localização exige leituras; (4) o lança-chamas é da equipa, curto e sem plano aberto; (5) Rourke vive em ambos os ramos e Salas nunca é "encontrável"; (6) o istmo foi comprimido com declaração (700 jardas → 300 m) e cartela no debrief; (7) Okafor é proposta deste dossiê a acrescentar a CONTINUITY §4.
