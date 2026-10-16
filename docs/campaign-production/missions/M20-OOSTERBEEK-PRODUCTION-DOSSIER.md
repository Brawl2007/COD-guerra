# M20 — UMA PONTE LONGE DEMAIS · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** 17, 21 e noite de 25/9/1944, eixo Arnhem/Oosterbeek; 1.ª Divisão Aerotransportada Britânica; POV Arthur Reed após treinamento/designação ficcionais registados; fonte H19; 26–35 min; três falas; checkpoints "reunião de 17/9; nova fase em 21/9; posto médico; início da retirada em 25/9; embarque recuperável"; informações sobre Arnhem chegam como relatos, sem levar Reed à ponte; feridos que permanecem recebem contexto; objetivo cumprido é sobreviver/retirar-se, não conquistar a ponte; o final lembra a travessia de 1940 por som e gesto originais. **Proposto:** Reed no 1st Border (infantaria de planadores, 1.ª Brigada Aerotransportada — S-C05/CONTINUITY §3.2, P-C20), casa-posto da família Van Dijk, cartuchos contados por homem como medida do perímetro (17 → 21 → 25), Penn fica com os feridos (`m20.penn_stayed`), Operação Berlin com chuva forte, fitas brancas e botas abafadas (S-C05 — DOCUMENTED), o gesto da alça herdado de M04 (`m04.whitfield_status`). **Sistemas:** [C] planador Horsa (chegada encenada), barco de assalto na água de noite, missão em três atos com estados salvos por ato; [A] tudo o resto.

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m20_oosterbeek` / 20 |
| Datas | Ato I 1944-09-17T13:30+02:00 → 17:00 · Ato II 1944-09-21T08:00+02:00 → 14:00 · Ato III 1944-09-25T21:30+02:00 → 1944-09-26T03:30+02:00 (hora de verão alemã/holandesa ocupada, CEST) |
| Local | LZ a oeste de Arnhem (charnecas/clareiras entre Wolfheze e Heelsum) → estrada e bosques até Oosterbeek → perímetro oeste de Oosterbeek (casas burguesas, hotel usado como posto, jardins, a casa-posto Van Dijk) → fitas brancas pela Oude Kerk até à margem do Nederrijn — `RECONSTRUCTED` (P-C20: batalhão/LZ/casa/ponto de embarque) |
| Operação | Market Garden (17/9); perímetro de Oosterbeek (21/9); Operação Berlin: retirada noturna 25/26 com chuva forte, vento, nuvens, fitas brancas, botas abafadas, storm boats canadianos; ~2 400 evacuados; ~1 200 feridos ficam com os médicos (S-C05 — DOCUMENTED em resumo) |
| Unidade | 1.ª Divisão Aerotransportada (canónico) → 1st Border, 1.ª Bde Aerotransportada (proposta, RECONSTRUCTED) → secção de Reed |
| Elenco | lance-corporal Arthur Reed (POV), sgt. Alan Birch, cabo Jim Stokes, pte. Ronnie Vane, cabo Walter Penn (RAMC, socorrista), família Van Dijk (pai Hendrik, mãe Anneke, filha Mieke, 9 anos), dois feridos nomeados do posto (pte. Len Ashby — ferido na coxa, transportável; pte. Colin Marsh — ventre, intransportável), um guia de fitas (sapador), um marinheiro/engenheiro canadiano no barco (propostas) |
| Fora de cena | gen. Roy Urquhart; ten.-cor. John Frost; a ponte de Arnhem (só por relatos) |
| Intocável | as três datas, a unidade, o POV, falas `dlg_m20_001–003`, os cinco checkpoints, "Arnhem por relatos", feridos que ficam com contexto, "nenhum reforço por teletransporte", "sobreviver/retirar-se", o eco de 1940 por som e gesto originais, Whitfield só como memória válida (`m04.whitfield_status`, nunca morto) |

---

## 1. Story Bible

**Logline.** Quatro anos depois de ter ouvido o motor do barco engolir as vozes em La Panne, Arthur Reed sai de um planador numa charneca holandesa com a confiança de quem conferiu o material duas vezes. Em nove dias a confiança transforma-se em cartuchos contados por homem, numa casa com uma família no porão e num posto onde os feridos esperam macas que não chegam. Na noite de 25, com chuva a bater nas copas, Reed segue fitas brancas até à água, mantém o grupo unido e ajeita a alça da bolsa antes de entrar no barco. Penn fica. Arnhem nunca chega a ser vista.

**As oito respostas.**
1. **Situação central:** o perímetro que encolhe e a retirada pelo rio — a esperança inicial de Market Garden a transformar-se em defesa exausta e evacuação (PR #44, adotado).
2. **Modo de contar:** cartuchos por homem (17: "material conferido"; 21: Birch pergunta a cada um quantos; 25: a contagem já não se faz — o que há vai na mão).
3. **Objeto:** a alça da bolsa de documentos de Reed — a correia de lona cortada por Whitfield em 1940 (M04 §1), agora costurada à bolsa; o gesto de ajeitar a alça antes de entrar num barco.
4. **Silêncio:** o rio à noite — remos na água escura, chuva, chamadas em voz baixa; o barco afasta-se e o som deixa de ter palavras.
5. **Tarefa que não é matar:** reorganizar e ligar elementos separados; visitar o posto médico; proteger a passagem dos feridos; decidir quem fica; seguir as fitas; manter o grupo unido; embarcar.
6. **Custo humano:** Marsh não pode ser movido (ferida no ventre; o médico do posto é claro) → Stokes acusa os socorristas de "desistirem" e quer levá-lo na maca à força (causa: a escassez de macas e de homens) → Penn decide ficar com Marsh e Ashby e com os outros que não se movem; Birch aceita; Reed pode insistir com Penn (sem efeito sobre a decisão: Penn fica) ou calar-se → `m20.penn_stayed = true` sempre; `m20.stokes_deescalated` se o jogador ou Birch cortam a acusação. O barco parte sem Penn. Nenhum inimigo morto faz chegar uma maca a mais.
7. **Pessoas históricas:** Urquhart e Frost fora de cena; a ponte só por relatos contraditórios ("A notícia da ponte mudou outra vez.").
8. **Debrief:** regista a retirada de ~2 400 homens pelo Nederrijn na noite de 25/26 sob chuva forte, os ~1 200 feridos que ficaram com os médicos e foram capturados, Arnhem não tomada, o fim de Market Garden como objetivo; "sobreviver e retirar não é vencer; é o que houve".

**Três motivos.** (a) *A contagem* — cartuchos por homem como relógio do perímetro; (b) *as vozes até à água* — "Siga as vozes até a água" (003): de noite segue-se o som, não o mapa; (c) *a alça* — o gesto de 1940 repetido em 1944, sem dizer o nome de Whitfield.

**Temas.** Confiança que se desgasta sem traição; o que a escassez faz à atuação de cada um; cuidar dos que ficam; a derrota que se atravessa a remo; a memória como gesto, não como flashback.

**Estrutura (§54).** CONTEXTO (cartela dos quatro anos) → INTRO (planador; charneca; material conferido) → APROXIMAÇÃO (17/9: estrada e bosques; relatos) → DIÁLOGO (rádio que não responde; Birch reorganiza) → PRIMEIRO CONTATO (17/9: ligação entre elementos separados sob fogo esparso) → ESCALADA (cartela 21/9: a casa-posto; a contagem) → COMBATE PRINCIPAL (21/9: defender postos menores; recuos controlados) → SET-PIECE (posto médico; passagem de feridos) → PAUSA (Penn fica; a família no porão) → CLÍMAX (25/9: fitas, chuva, a água, o barco) → CONSEQUÊNCIA (a outra margem; a alça) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Reed | confiança: material conferido; "os mortos de 1940 não voltam como se nada tivesse ocorrido" (§79) | Birch; Penn | a passagem dos feridos; a noite | forma um grupo que chega inteiro à água; aceita que Penn fique | no barco; a alça |
| Birch | "Siga as vozes até a água. Mantenha o grupo unido." (003) | secção | a contagem de 21/9 | não muda; mantém | no barco |
| Stokes | veterano exaltado; "A notícia da ponte mudou outra vez." (001) | Reed | Marsh na maca | baixa a voz; carrega Ashby | no barco |
| Vane | recruta; conta cartuchos duas vezes | Reed | a chuva, o escuro | segue as fitas sem largar o casaco de Reed | no barco |
| Penn | socorrista; "Eles ainda estão esperando macas." (002 é de Reed, dirigida a Penn) | os feridos | ficar | decide ficar | fica (`m20.penn_stayed`) |
| Van Dijk (família) | porão | ninguém | a casa como posto | — | ficam (21/9 → 25/9) |
| Ashby / Marsh | feridos | Penn | — | — | Ashby capturado vivo (contexto); Marsh fica, estado não anunciado |

**O que a missão recusa.** Reed na ponte de Arnhem; Reed paraquedista; reforços que aparecem entre datas; montagem que teletransporta material; Whitfield morto ou em voz-off; chuva em 17/9 (tarde clara); "um inimigo morto a mais salva um ferido"; barco que espera por Reed; o Reno como rio tranquilo; uma vitória.

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "Material conferido" (`cs_m20_intro`, ≤ 80 s)
2 17/9 13:30 · 3 interior de um Horsa em aproximação → LZ: charneca, pinhal baixo, planadores já no chão (asas partidas, um de nariz enterrado), homens a descarregar · 4 tarde clara de setembro, sol alto, sombras curtas (D) · 5 Reed, Birch, Stokes, Vane, Penn; piloto do planador (Glider Pilot Regiment) · 6 Cartela 1: QUATRO ANOS DEPOIS DE DUNQUERQUE — 1940–1944 (duas linhas: reconstituição em Inglaterra; voluntário para as forças aerotransportadas; treino com Horsa). Cartela 2: A OESTE DE ARNHEM — 17 DE SETEMBRO DE 1944 — 13:30 · 1st BORDER · 1.ª DIVISÃO AEROTRANSPORTADA. O Horsa toca o chão, salta, pára. Reed desprende a bolsa: a alça é uma correia de lona antiga costurada a uma bolsa nova (um plano de 2 s, sem comentário). Descarregam. Casas aparentemente tranquilas ao longe; um holandês de bicicleta pára e acena. Vane: "Quantos planadores. Nunca vi tantos." Birch: "Conferido duas vezes não é conferido três. Vamos." · 7 estabelecer confiança, material, um grupo novo (nenhum dos homens de 1940) e o objeto sem explicar · 8 olhar; sair do planador · 9 — · 10 — · 11 nenhum · 12 planadores, contentores de paraquedas, bicicleta holandesa · 13 `dlg_m20_010–013` · 14 vento na charneca; planadores a aterrar ao longe; nenhum tiro · 15 beat: a alça (2 s); grande plano geral da LZ · 16 `missionStart` · 17 Birch: "Reunir no caminho." · 18 — · 19 [C] Horsa encenado (cutscene; nunca pilotável); variante de cartela se `m04.whitfield_status = evacuated` (uma linha a mais: "Whitfield escreveu de Birmingham" — só aqui, só se evacuado); se `missing`, nada · 20 lê `m04.*`.

### Cena 2 — "Vias pesquisadas" (jogável; `obj_m20_assemble`)
2 17/9 13:45–15:00 · 3 caminho de areia entre pinhal e charneca → estrada secundária → primeiras casas (Heelsum/Wolfheze ao longe, genéricas) · 4 sol; sombras de pinheiro · 5 secção; outros grupos do batalhão em caminhos próprios (visíveis a 100–300 m); holandeses às janelas e portões · 6 Reunir a secção e aproximar-se por uma via pesquisada (Birch tem o mapa; o jogador escolhe entre o caminho do bosque e a estrada: ambas chegam); outros grupos tentam acessos próprios; um estafeta de bicicleta traz relato: "Os paras do 2.º Batalhão vão para a ponte" — relato, não objetivo; a rádio (Set 22) de Vane não liga com o batalhão · 7 §79 ponto 1: "informações sobre Arnhem chegam como relatos, sem levar o protagonista automaticamente à ponte" · 8 navega; interage com o estafeta (ouvir); tenta a rádio (interação: Vane roda, só ruído) · 9 bosque (sombra, lento) vs estrada (rápido, exposto a nada por agora) · 10 Birch orienta; Stokes repete o relato; Vane com a rádio · 11 nenhum ainda · 12 bicicletas, bandeiras laranja tímidas, uma mesa com água à porta de uma casa · 13 `dlg_m20_014–018` · 14 passos na areia; bicicletas; aviões altos · 15 livre · 16 CP-A ("reunião de 17/9") · 17 chegada ao ponto de reunião da companhia (`evt_m20_rally`) · 18 `cp_m20_a_reuniao` · 19 [A] navegação; [B] rádio só ruído (estado) · 20 —

### Cena 3 — "Ligação" (jogável; `obj_m20_link_up`)
2 17/9 15:00–17:00 · 3 orla de bosque; um cruzamento com uma quinta; 200 m de campo até outro grupo · 4 sol a descer; luz dourada (D) · 5 secção; grupo separado (pelotão vizinho, 8 proxies) a 200 m; um Kampfgruppe improvisado alemão (6–8, sem blindados) a sondar a estrada · 6 Resistência esparsa e comunicação precária obrigam a reorganização: ligar fisicamente com o grupo separado (estafeta a pé — Reed ou Vane), cobrir a travessia do campo; o primeiro contacto é curto, a 80–150 m, e termina com os alemães a recuar (não é a batalha pela ponte); Birch reorganiza: "quem tem quê" — primeira contagem de cartuchos (todos: muitos; Vane: "cinquenta e mais os carregadores") · 7 §79 ponto 2 · 8 corre o campo (ou manda Vane: escolha com consequência mínima — Vane volta ofegante); dispara (80–150 m); conta cartuchos (interação curta: Reed diz um número) · 9 ir / mandar Vane · 10 Birch comanda; Stokes cobre; Penn atrás · 11 Kampfgruppe (dados; recua após 4–6 baixas inimigas ou 6 min) · 12 cruzamento; quinta; o primeiro ferido alemão deixado para trás (os alemães levam-no) · 13 `dlg_m20_019–024` · 14 primeiros tiros no pinhal (eco seco); vozes a 200 m · 15 livre · 16 CP-A · 17 ligação feita + contagem (`evt_m20_linked`) · 18 `m20.ammo_day1 = full` (estado); cartela de fim de ato: "17 DE SETEMBRO — 17:00 — A ponte, por relatos, está com os paraquedistas. Nós não vamos à ponte." · 19 [A]; [B] "contagem" como interação de estado (cada ato grava `ammo_dayN`) · 20 —

### Cena 4 — "A casa-posto" (`cs_m20_day2`, ≤ 60 s) + jogável (`obj_m20_posts`)
2 21/9 08:00 · 3 Oosterbeek oeste: uma casa burguesa de dois pisos com jardim (a casa Van Dijk) usada como posto; janelas com colchões; o hotel mais à frente, com bandeira da Cruz Vermelha; ruas com árvores; viaturas queimadas · 4 dia nublado, luz baixa e fria (21/9 sem registo de chuva em S-C05: nublado, sem chuva no roteiro) · 5 secção (desgastada: barba, smock sujo, Stokes com ligadura na mão), família Van Dijk no porão (porta aberta um palmo), feridos no hotel/posto · 6 Cartela: OOSTERBEEK — 21 DE SETEMBRO DE 1944 — 08:00 — QUINTO DIA. O mesmo grupo, outro estado (estados salvos por ato: ninguém novo, ninguém "teletransportado"). Birch pergunta a cada um quantos cartuchos: Stokes "doze", Vane "vinte e dois, sargento", Reed (o jogador diz: a interação mostra o número real do inventário — ≤ 30), Penn "nenhum; dois rolos de ligadura". A filha Van Dijk espreita; a mãe puxa-a. Hendrik Van Dijk traz água numa chaleira. Birch: "Cada um defende a janela que tem. Recuar só quando eu disser." · 7 a escassez torna-se visível e mede-se; a família é a casa · 8 olhar; dizer o número (interação) · 9 — · 10 — · 11 morteiros alemães (longe → médio) · 12 colchões nas janelas, chaleira, uma boneca no degrau do porão · 13 `dlg_m20_025–030` · 14 morteiro longe; chaleira; a filha; **silêncio** entre as respostas da contagem · 15 plano fixo na sala; a contagem em campo-contracampo mínimo · 16 fim do Ato I · 17 Birch: "Postos." · 18 `cp_m20_b_fase21` ("nova fase em 21/9"); `m20.ammo_day2 = low` · 19 [A]; [B] inventário limitado por ato (dados: `ammoPerMan`); [D] porão habitado (civis presentes, não interativos além de olhar/água) · 20 —

### Cena 5 — "Postos menores" (jogável; `obj_m20_posts`)
2 21/9 08:30–11:00 (escala acelerada entre contactos; `readyScale`) · 3 três postos: a janela do piso de cima da casa Van Dijk; o muro do jardim; a esquina da rua com uma viatura queimada; um recuo possível para a casa seguinte · 4 nublado · 5 secção; outro grupo britânico do outro lado da rua (no "lado diferente do perímetro": 6 proxies); alemães (infantaria + um StuG a 300 m que não entra na rua — fogo como dados, dispara contra a casa da esquina) · 6 Defender posições menores com recuos controlados: duas sondas alemãs (09:00; 10:20) a 60–120 m; a segunda força o recuo da esquina para o muro (Birch dá a ordem; recuar antes da ordem = o outro grupo fica exposto e um proxy é ferido — consequência visível, não morte do jogador); os cartuchos contam: sem recolha de munição inimiga em quantidade (um carregador de MP 40 recolhido = "não serve na Sten"? Sten e MP 40 usam 9 mm mas carregadores diferentes — o jogo permite trocar cartuchos à mão: interação lenta, 10 cartuchos, a cobrir) · 7 §79 ponto 4 · 8 defende; recua quando ordenado; recolhe cartuchos à mão (lento) · 9 recuar cedo vs aguentar até à ordem · 10 Birch ordena; Stokes na janela de cima; Vane no muro; Penn no porão com a família · 11 duas sondas (dados); StuG ao longe (dano no edifício, nunca no jogador a < 30 m sem aviso) · 12 janela desfeita, colchão a arder, a viatura · 13 `dlg_m20_031–037` · 14 StuG contra a casa da esquina; Bren curta (rajadas de 3); silêncio entre sondas · 15 livre · 16 CP-B · 17 segunda sonda repelida (`evt_m20_posts_held`) · 18 `m20.early_withdrawal` (se recuou cedo) · 19 [A] fogo como dados; [B] recolha à mão · 20 —

### Cena 6 — "Eles ainda estão esperando macas" (jogável; `obj_m20_aid_post`, `obj_m20_wounded_passage`) — **custo humano**
2 21/9 11:00–14:00 · 3 do muro do jardim ao hotel/posto médico (150 m com dois cruzamentos expostos); o posto: salão com feridos no chão, um médico (RAMC), dois maqueiros, Penn; o corredor de saída para a casa Van Dijk · 4 nublado; luz de janelas tapadas · 5 secção; médico; maqueiros; Ashby (coxa) e Marsh (ventre); 6–8 feridos proxies; feridos alemães também (um; o médico trata-o) · 6 Visitar o posto médico (Birch manda Reed e Penn levar ligaduras e trazer Ashby para a casa, onde há menos fogo); no posto, a passagem de feridos para a casa tem de ser protegida: um cruzamento varrido por uma MG a 200 m — Reed cobre (fumo? **não** há granadas de fumo em quantidade; usa-se o intervalo da MG, que dispara por rajadas de 8 s com 20 s de pausa: dados) e os maqueiros passam com Ashby na maca; **Marsh pede para ir**; o médico diz que não (ventre: morre a ser movido); **Stokes** (chegou com munição) acusa os socorristas: "Estão a desistir dele. Dêem-me a maca." → Penn: "Não há maca. E ele não aguenta a rua." → o jogador pode (a) pôr-se entre Stokes e a maca (interação: `m20.player_intervened`), (b) chamar Birch (rádio curto/voz: Birch chega em 20 s), (c) nada → Birch corta: "Stokes. Ashby. Pega na frente da maca." Stokes pega. Penn fica no posto com Marsh "até os maqueiros voltarem" (não voltam hoje) · 7 §79 ponto 3 ("Munição e atendimento tornam-se problemas visíveis; visitar ponto médico e proteger uma passagem para feridos") · 8 leva ligaduras; cobre o cruzamento no intervalo da MG; intervém/chama/nada; carrega a traseira da maca se escolher (Vane carrega se não) · 9 intervir / chamar / nada; carregar / cobrir · 10 Penn decide; Stokes acusa e carrega; Birch corta; o médico continua a trabalhar · 11 MG a 200 m (rajadas por agenda); morteiros ao longe · 12 feridos no chão; a maca; cartazes do hotel; um relógio parado · 13 `dlg_m20_002` (Reed: "Eles ainda estão esperando macas." — a Penn, à entrada do posto), `038–049` · 14 **silêncio obrigatório** no salão (respiração, panos, o relógio não anda); MG por rajadas · 15 livre; beat fixo na maca (3 s) · 16 CP-B · 17 Ashby na casa (`evt_m20_ashby_moved`) · 18 `cp_m20_c_posto` ("posto médico"); `m20.stokes_deescalated`; `m20.player_intervened`; `m20.player_carried` · 19 [A] maca a dois (M01/M16), agenda de MG; [B] a passagem como "janela de intervalo"; fallback: se a MG for dados sem intervalo, usar o outro grupo a suprimir (ordem de Birch) · 20 Penn fica mais tarde; o Marsh nunca é "salvo por mais um inimigo morto"

### Cena 7 — "O que fica" (`cs_m20_penn`, ≤ 70 s)
2 25/9 21:30 · 3 posto médico (o hotel) à luz de velas; a chuva começa (gotas no vidro partido); Penn ajoelhado junto de Marsh; Birch à porta com a ordem; a família Van Dijk na casa ao lado (não visível aqui) · 4 noite, chuva forte a chegar, vento (D, S-C05) · 5 Reed, Birch, Stokes, Vane, Penn, médico, feridos · 6 Cartela: 25 DE SETEMBRO — 21:30 — ORDEM DE RETIRAR PELO RIO. Birch lê a ordem em voz baixa: fitas brancas até à igreja velha e depois até à água; botas abafadas com panos; ninguém fala alto; os feridos que não andam ficam com os médicos. Penn: "Eu fico." Birch não discute (já sabia). Reed pode dizer uma frase (escolha: "Vem connosco." / "…") — Penn: "Alguém tem de dizer-lhes amanhã o que aconteceu. Em inglês." Entrega a Reed os dois rolos de ligadura que sobram ("Vão precisar na água, não eu."). Stokes abafa as botas com um lençol rasgado. Vane envolve a Sten num pano. · 7 os feridos que ficam recebem contexto (§79); Penn decide, não o jogador · 8 escolha de uma frase · 9 "Vem connosco." / silêncio (sem efeito sobre Penn; `m20.reed_asked_penn`) · 10 — · 11 — · 12 velas, ligaduras, lençol · 13 `dlg_m20_050–056` · 14 chuva a começar; velas; vozes baixas; nenhum tiro · 15 planos curtos; a mão de Penn no ombro de Marsh · 16 CP-C · 17 Birch: "Fitas." · 18 `cp_m20_d_retirada` ("início da retirada em 25/9"); `m20.penn_stayed = true` · 19 [A] cutscene; variante curta de uma fala · 20 Penn não reaparece na campanha

### Cena 8 — "Siga as vozes até a água" (jogável; clímax; `obj_m20_follow_tapes`, `obj_m20_keep_group`)
2 25/9 22:00 → 26/9 01:30 · 3 ruas escuras de Oosterbeek sob chuva → jardins → a Oude Kerk (silhueta) → prados encharcados do polder até ao dique → a margem do Nederrijn com barcos de assalto (storm boats) a fazer vaivém; fitas brancas de sapador em estacas e cercas; guias que sussurram · 4 noite fechada, chuva forte, vento, nuvens (D); clarões de artilharia britânica do lado sul (fogo de apoio — "longe"); flares alemães ocasionais (parar; não correr) · 5 secção (sem Penn); grupos que partem independentemente (proxies em fila); guias; alemães que disparam para a escuridão (a 150–300 m: fogo como dados, raro, com balas traçantes visíveis) · 6 Retirada noturna: seguir as fitas (não o mapa) e as vozes baixas dos guias; manter o grupo unido (Vane agarra o smock de Reed; Stokes à frente); parar sob flare; atravessar o prado encharcado (água até ao joelho, lento); fila no dique sob chuva; a MG alemã varre o prado uma vez por agenda (traçantes visíveis a 1,5 m de altura: deitar-se); chegar ao ponto de embarque onde um engenheiro canadiano conta "doze" por barco; **o barco parte com quem estiver**: se o grupo estiver separado (Vane perdido), Reed pode voltar 40 m a buscá-lo com a chamada baixa ("Vane.") — o barco seguinte leva-os; se o jogador correr sob flare, é visto: rajada (dados) e `m20.group_scattered`: Vane leva 30 s a reaparecer · 7 §79 ponto 5 + PR #44 ("barcos cujo embarque não espera eternamente por Reed") · 8 segue fitas; agacha-se sob flare; atravessa água; chama Vane; espera a fila; embarca · 9 esperar pelo barco seguinte / embarcar sem Vane (se perdido: ele vai noutro barco — `m20.vane_separated`; não morre) · 10 Birch à frente a contar cabeças; Stokes carrega a Bren sem cartuchos; Vane agarrado · 11 MG por agenda; flares; artilharia britânica a cobrir (fogo amigo nunca sobre o jogador) · 12 fitas, estacas, equipamento largado no prado, uma bota, um capacete cheio de água · 13 `dlg_m20_003` (Birch: "Siga as vozes até a água. Mantenha o grupo unido." — à partida), `057–066` · 14 **chuva nas copas e nos capacetes; botas abafadas; chamadas em voz baixa; remos; água**; traçantes; artilharia ao longe · 15 livre; a escuridão como ferramenta (lanterna proibida) · 16 CP-D · 17 chegada ao barco (`evt_m20_boat`) · 18 `cp_m20_e_embarque` (**recuperável**: se o barco partir sem Reed, restaura o ponto de embarque com o barco seguinte — nunca "missão falhada por perder um barco") · 19 [C] água em prado/dique (vadear), barco de assalto com agenda; [A] flares como evento com aviso (som do disparo + luz a subir 1 s antes de iluminar), MG como dados; [B] "chamada baixa" como interação · 20 o eco de M04: ali o barco também não esperava

### Cena 9 — "Remos" (`cs_m20_outro`, ≤ 60 s) + debrief
2 26/9 01:30–03:30 · 3 o storm boat no rio; o motor fora-de-borda engasgado abafado por remos (os barcos canadianos tinham motores; usar motor em marcha lenta + remos a corrigir: S-C05 fala de storm boats; o eco de 1940 está no **motor que engole as vozes** — original de M04 — agora quase inaudível sob a chuva, e nos **remos**) → a outra margem: lama, um camião, chá numa lata · 4 noite; chuva a abrandar; a primeira cinza do céu só no fim · 5 Reed, Birch, Stokes, Vane, o engenheiro canadiano; proxies encharcados · 6 Reed ajeita a alça da bolsa (o gesto de M04, 2 s, sem música) e entra no barco. Remos na água escura; o motor baixo. Reed olha para trás: Oosterbeek em fogo baixo; nenhum nome dito. Na margem sul, Birch conta: quatro. Vane: "O Penn…" Birch: "Está onde disse que ficava." Cartela: ~2 400 homens atravessaram na noite de 25/26; ~1 200 feridos ficaram com os médicos e foram capturados; Arnhem não foi tomada. Cartela 2 (`lineVariants`): "Whitfield, Birmingham, 1944: vivo" só se `m04.whitfield_status = evacuated`; nada se `missing`. · 7 consequência; o eco por som e gesto, não por flashback · 8 skip · 9 — · 10 — · 11 — · 12 Oosterbeek ao longe; a lata de chá · 13 `dlg_m20_067–069` · 14 **silêncio obrigatório**: remos, chuva, motor baixo; nenhuma fala durante a travessia · 15 plano fixo na alça; plano geral do rio; a margem · 16 `evt_m20_boat` · 17 `missionEnd` · 18 `m20.completed`; `m20.vane_separated` (se), `m20.whitfield_memory = m04.whitfield_status` · 19 [C] barco em movimento (cutscene; fallback: plano fixo com água animada) · 20 fecha Reed; abre M21 pelo som (água → folhas)

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m20_assemble` | Reúna a secção e chegue ao ponto de reunião | sim | intro | `evt_m20_rally` | — | — | A |
| `obj_m20_link_up` | Ligue com o grupo separado e reorganize | sim | A | `evt_m20_linked` + contagem | — | `ammo_day1` | — |
| `obj_m20_posts` | Defenda os postos; recue quando Birch ordenar | sim | B | 2 sondas repelidas | — | `early_withdrawal` | — |
| `obj_m20_aid_post` | Leve ligaduras ao posto e traga Ashby | sim | posts held | Ashby na casa | — | `stokes_deescalated`, `player_intervened`, `player_carried` | C |
| `obj_m20_wounded_passage` | Proteja a passagem dos feridos no cruzamento | sim | posto | maca passou | maca atingida? **nunca** (MG por agenda; a maca passa no intervalo) | — | — |
| `obj_m20_follow_tapes` | Siga as fitas até à água sem luz nem voz alta | sim | D | dique | — | `group_scattered` | — |
| `obj_m20_keep_group` | Mantenha o grupo unido | sim (paralelo) | D | embarque com ≥ 3 | Vane separado → outro barco | `vane_separated` | — |
| `obj_m20_embark` | Embarque | sim | dique | `evt_m20_boat` | barco parte → **recuperável** (barco seguinte) | `m20.completed` | E |

### 3.2 Setores
`s1_lz_heath` (perto, 17/9) · `s2_oosterbeek_west` (perto, 21/9: casa, rua, hotel) · `s3_other_perimeter` (médio: outros trechos do perímetro; o outro grupo do outro lado da rua) · `s4_arnhem_far` (longe: Arnhem, fogo de apoio, travessias — só som e clarões) · `s5_polder_river` (perto, 25/9: prados, dique, água). Agendas: Kampfgruppe 17/9 15:40; sondas 21/9 09:00 e 10:20; MG do cruzamento rajadas 8 s/pausa 20 s; MG do prado uma passagem a cada 90 s; flares a cada 2–4 min; barcos a cada 6 min (12 lugares).

### 3.3 Checkpoints
A reunião de 17/9 · B nova fase em 21/9 (contagem) · C posto médico (Ashby na casa; Penn no posto) · D início da retirada em 25/9 (Penn fica) · E embarque (**recuperável** com o barco seguinte). Estados salvos por ato: `ammo_day1/2/3`, feridos, destruição da casa, `early_withdrawal`, `stokes_deescalated`.

### 3.4 Justiça
Fogo inimigo como dados com aviso (traçantes, flare com som 1 s antes); nenhuma morte do jogador por escuridão sem sinal; MG do cruzamento com intervalo legível; barco que parte nunca falha a missão; Vane nunca morre por se perder; a escassez muda o ritmo (cartuchos), não cria reforços; a casa Van Dijk nunca é destruída com a família dentro (o StuG bate na casa da esquina).

---

## 4. Set pieces

### SP-20-1 "A contagem"
Contexto: a sala da casa Van Dijk a 21/9. Preparação: a confiança de 17/9 (material conferido; "cinquenta e mais os carregadores"). Experiência: Birch pergunta a cada um; Reed diz o número real do inventário; a filha espreita. Companheiros: Stokes "doze"; Vane "vinte e dois"; Penn "nenhum; duas ligaduras". Ambiente: colchões, chaleira, boneca. Evolução: a contagem repete-se a 25/9 sem palavras (cada um mostra a mão). Clímax: "Cada um defende a janela que tem." Consequências: `ammo_day2 = low`. Requisitos: [B] `ammoPerMan` por ato; interação de dizer o número. Integração: `cs_m20_day2`, `obj_m20_posts`.

### SP-20-2 "Eles ainda estão esperando macas"
Contexto: o posto médico e o cruzamento. Preparação: a rádio que não liga; ligaduras na mão. Experiência: o intervalo da MG; a maca que passa; Marsh que pede; Stokes que acusa; Penn que decide. Companheiros: médico que não pára; maqueiros; Birch que corta. Ambiente: o relógio parado do hotel. Evolução: Ashby chega à casa; Marsh fica. Clímax: Penn: "Não há maca. E ele não aguenta a rua." Consequências: `stokes_deescalated`, `player_intervened`, CP-C. Requisitos: [A] maca a dois, agenda de MG; [B] intervenção como interação. Integração: `obj_m20_aid_post`, `obj_m20_wounded_passage`.

### SP-20-3 "Siga as vozes até a água"
Contexto: a noite de 25/9. Preparação: botas abafadas; Penn fica; Birch lê a ordem. Experiência: fitas brancas que só se veem a 3 m; chuva; flares que obrigam a parar; o prado com água; a fila no dique; o barco que conta doze. Companheiros: Vane agarrado; Stokes à frente; Birch a contar cabeças. Ambiente: equipamento largado, um capacete cheio de água. Evolução: perder Vane / chamá-lo. Clímax: a alça; os remos. Consequências: `vane_separated`, `group_scattered`, `m20.completed`. Requisitos: [C] água, barco com agenda; [A] flares/MG como dados. Integração: `obj_m20_follow_tapes`, `obj_m20_keep_group`, `obj_m20_embark`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| LZ 17/9 | planadores (asas partidas), contentores, bicicleta | descarga; holandês acena | rádio só ruído | — | piloto do planador | — |
| estrada 17/9 | bandeiras laranja tímidas, mesa com água | estafeta; outros grupos | relato da ponte | primeiro contacto curto | holandeses às janelas | cartuchos cheios |
| casa Van Dijk 21/9 | colchões nas janelas, chaleira, boneca | contagem | morteiros | sondas; StuG na esquina | família no porão | janela desfeita; colchão a arder |
| hotel/posto 21/9 | feridos no chão, cartazes, relógio parado, Cruz Vermelha | médico; maqueiros | Marsh pede | MG no cruzamento | Penn; Ashby; Marsh; um ferido alemão | Ashby na casa; Penn no posto |
| posto 25/9 | velas, ligaduras, lençol rasgado | abafar botas | a ordem | — | Penn fica | — |
| polder/rio 25/9 | fitas, estacas, equipamento largado, capacete com água | fila; guias | flares | MG no prado | engenheiro canadiano | barco parte |
| margem sul | lama, camião, lata de chá | contagem de cabeças | — | — | — | quatro |

Objetos com origem: a alça (correia de lona do camião de M04, costurada em Inglaterra em 1942), a boneca (Mieke Van Dijk, deixada no degrau quando a mãe a puxou), o relógio parado do hotel (parou com o primeiro morteiro a 19/9), os dois rolos de ligadura (Penn → Reed), o capacete cheio de água (de um homem de outro batalhão que já atravessou).

---

## 6. Diálogos (VO inglês; neerlandês para a família Van Dijk, sem tradução; alemão só por gritos ao longe)

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Stokes | "A notícia da ponte mudou outra vez." (§79) | estafeta, 17/9 | 1 | — |
| 002 | Reed | "Eles ainda estão esperando macas." (§79) | entrada do posto, 21/9 | 1 | — |
| 003 | Birch | "Siga as vozes até a água. Mantenha o grupo unido." (§79) | partida, 25/9 | 1 | — |
| 010 | Vane | "Quantos planadores. Nunca vi tantos." (V1) | intro t 20 | 3 | — |
| 011 | Birch | "Conferido duas vezes não é conferido três. Vamos." (V1) | intro t 30 | 1 | — |
| 012 | piloto do planador | "Chão holandês. De nada." (V1) | intro t 40 | 3 | — |
| 013 | Stokes | "Casas inteiras. Pessoas às janelas. Isto não é a Normandia." (V1) | intro t 55 | 2 | — |
| 014 | Birch | "Bosque ou estrada. As duas chegam. Reed, escolhe." (V1) | bifurcação | 1 | — |
| 015 | estafeta | "O 2.º Batalhão vai à ponte. Os outros ainda a juntar-se. É o que sei." (V1) | estafeta | 1 | — |
| 016 | Vane | "Só ruído, sargento. Nem o batalhão." (V1) | rádio | 2 | — |
| 017 | Birch | "Então vamos a pé até quem ouvir." (V1) | 016 | 1 | — |
| 018 | holandês (neerlandês) | — (acena; oferece água) | mesa | — | — |
| 019 | Birch | "Grupo do Hollis do outro lado do campo. Alguém vai lá." (V1) | ligação | 1 | — |
| 020 | Vane | "Vou eu, sargento." (V1) | se o jogador manda | 2 | — |
| 021 | Stokes | "Alemães na estrada. Poucos. Não é a ponte, é uma sonda." (V1) | contacto | 0 | — |
| 022 | Birch | "Deixa-os recuar. Não é a nossa guerra hoje." (V1) | recuam | 1 | — |
| 023 | Birch | "Quem tem quê. Cartuchos." (V1) | contagem 1 | 1 | — |
| 024 | Vane | "Cinquenta e mais os carregadores." (V1) | 023 | 2 | — |
| 025 | Birch | "Cartuchos. Stokes." / Stokes: "Doze." / "Vane." / "Vinte e dois, sargento." / "Reed." (V1; o jogador diz o número) | contagem 2 | 1 | — |
| 026 | Penn | "Nenhum. Dois rolos de ligadura." (V1) | 025 | 1 | — |
| 027 | Birch | "Cada um defende a janela que tem. Recuar só quando eu disser." (V1) | fim da contagem | 1 | — |
| 028 | Hendrik Van Dijk (neerlandês) | — (traz a chaleira; sem tradução) | — | — | — |
| 029 | Stokes | "A miúda. Diz-lhe para ficar em baixo." (V1) | Mieke espreita | 2 | — |
| 030 | Vane | "Ela não percebe." / Birch: "Percebe o tom." (V1) | 029 | 3 | — |
| 031 | Stokes | "Sonda à esquerda. Sessenta metros." (V1) | sonda 1 | 0 | — |
| 032 | Birch | "Rajadas de três. Não há mais." (V1) | Bren | 1 | — |
| 033 | Birch | "Esquina para o muro. **Agora.**" (V1) | ordem de recuo | 0 | — |
| 034 | outro grupo (voz) | "Quem recuou? Estamos descobertos!" (V1; se `early_withdrawal`) | recuo cedo | 1 | — |
| 035 | Vane | "Dez cartuchos do alemão. À mão. Dá tempo?" (V1) | recolha | 2 | — |
| 036 | Birch | "Dá se eu te cobrir. Vai." (V1) | 035 | 1 | — |
| 037 | Stokes | "Aquele canhão não entra na rua. Bate na esquina e vai-se." (V1) | StuG | 2 | — |
| 038 | Birch | "Reed, Penn. Ligaduras ao hotel. Trazem o Ashby para cá." (V1) | posto | 1 | — |
| 039 | médico | "Põe aí. Quem é que anda? O Ashby anda com maca. O Marsh não anda." (V1) | entrada | 1 | — |
| 040 | Marsh | "Levem-me. Eu aguento a rua." (V1) | maca | 1 | — |
| 041 | médico | "Não aguentas. É o ventre, Marsh. Aqui ficas comigo." (V1) | 040 | 1 | — |
| 042 | Penn | "A MG pára vinte segundos. Vai na pausa, não antes." (V1) | cruzamento | 1 | — |
| 043 | maqueiro | "Agora! Agora!" (V1) | intervalo | 0 | — |
| 044 | Stokes | "Estão a desistir dele. Dêem-me a maca." (V1) | chega | 1 | — |
| 045 | Penn | "Não há maca. E ele não aguenta a rua." (V1) | 044 | 0 | — |
| 046 | Stokes | "Então carrego-o às costas." (V1) | 045 | 1 | — |
| 047 | Reed | "Stokes. Não é assim que ele vive." (V1; se `player_intervened`) | interação | 0 | — |
| 048 | Birch | "Stokes. Ashby. Pega na frente da maca." (V1) | corte | 0 | — |
| 049 | Marsh | "Vai, Jim. Eu fico com o Penn." (V1) | 048 | 1 | — |
| 050 | Birch | "Fitas brancas até à igreja velha. Depois até à água. Botas com panos. Ninguém fala alto." (V1) | ordem | 1 | — |
| 051 | Birch | "Os que não andam ficam com os médicos. É a ordem." (V1) | 050 | 1 | — |
| 052 | Penn | "Eu fico." (V1) | 051 | 0 | — |
| 053 | Reed | "Vem connosco." (V1; escolha) | — | 2 | — |
| 054 | Penn | "Alguém tem de dizer-lhes amanhã o que aconteceu. Em inglês." (V1) | 052/053 | 1 | — |
| 055 | Penn | "Duas ligaduras. Vão precisar na água, não eu." (V1) | entrega | 1 | — |
| 056 | Vane | "O pano na Sten. Não quero que bata." (V1) | abafar | 3 | — |
| 057 | guia (sussurro) | "Fita. Esquerda. Devagar." (V1) | fitas | 1 | — |
| 058 | Birch | "Flare. **Parado.**" (V1) | flare | 0 | — |
| 059 | Vane | "Está água. Até ao joelho." (V1) | prado | 2 | — |
| 060 | Stokes | "Traçantes. Deita." (V1) | MG | 0 | — |
| 061 | Reed | "Vane." (V1; chamada baixa, interação) | perdido | 1 | — |
| 062 | Vane | "Aqui. Aqui. Não vi a fita." (V1) | 061 | 1 | — |
| 063 | engenheiro canadiano | "Doze. Doze por barco. Não corram." (V1) | dique | 1 | — |
| 064 | engenheiro canadiano | "Cheio. O próximo em seis minutos." (V1) | barco parte | 1 | — |
| 065 | Birch | "Quatro. Esperamos pelo próximo." (V1; se Vane separado) | — | 1 | — |
| 066 | Birch | "Entra, Reed." (V1) | embarque | 0 | — |
| 067 | Vane | "O Penn…" (V1) | margem | 2 | — |
| 068 | Birch | "Está onde disse que ficava." (V1) | 067 | 1 | — |
| 069 | Reed | (se `m04.whitfield_status = evacuated`) "Já atravessei um rio assim. Com outro homem." (V1; só se evacuado; silêncio se `missing`) | margem | 2 | — |

Callouts: `co_m20_flare`, `co_m20_tracers`, `co_m20_mg_pause`, `co_m20_stug_corner`. Silêncios: a sala da contagem (entre respostas); o salão do posto; a travessia (remos, chuva, motor baixo).

---

## 7. Arte e atmosfera

**Paleta:** 17/9 — verde de pinhal e roxo de urze, areia clara, caqui de Denison smock novo, céu azul pálido de setembro; 21/9 — cinzento de nuvens, tijolo escuro holandês, colchões brancos sujos, cinza de fumo, vermelho da Cruz Vermelha; 25/9 — preto-azulado de chuva, branco das fitas, laranja baixo de incêndios, prata de água. **Luz:** 13:30 sol alto (sombras curtas, 17/9); 08:00 nublado frio (zénite `#7f8791`, horizonte `#b9bcb8`, 21/9); 21:30 velas; 22:00–03:30 noite fechada com chuva (ambiente `#0b0e14`, flares `#f1e9c8` a subir 1 s), clarões de artilharia a sul. **Materiais:** madeira de Horsa, urze, areia, tijolo, colchão, vidro partido, lona molhada, lama de polder, água de rio com chuva. **Silhuetas:** planadores partidos; a casa de dois pisos com janelas tapadas; o hotel com a bandeira; a Oude Kerk; o dique; o storm boat. **Destruição:** persistente por ato (janela desfeita, colchão a arder apagado em 25/9, viatura queimada). **Humanos:** 17/9 smocks limpos e barba feita; 21/9 barba de cinco dias, ligadura na mão de Stokes, smock rasgado; 25/9 panos nas botas, ponchos; Penn com braçadeira da Cruz Vermelha; família Van Dijk com roupa de casa, a filha com casaco por cima do pijama. **Violência reduzida:** feridos cobertos até ao peito; nenhum plano de Marsh abaixo do peito.

**Imagem única:** remos na água escura sob chuva; o barco afasta-se (ART §4, DOCUMENTED para a chuva).

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| LZ 17/9 | madeira do Horsa, vento na urze, descarga | planadores a aterrar | aviões altos | — |
| estrada 17/9 | areia, bicicletas, rádio em ruído | outros grupos | tiros esparsos para Arnhem | — |
| ligação 17/9 | tiros no pinhal (eco seco), vozes a 200 m | Kampfgruppe | — | — |
| casa 21/9 | chaleira, colchão, a voz da filha | morteiros; o outro grupo | perímetro; Arnhem | **entre respostas** |
| postos 21/9 | Bren em rajadas de 3, vidro, StuG na esquina | sondas | fogo de apoio ao longe | — |
| posto 21/9 | respiração, panos, o relógio parado | MG por rajadas | — | **obrigatório** no salão |
| ordem 25/9 | velas, chuva a começar, lençol a rasgar | — | — | — |
| polder/rio | chuva nas copas e nos capacetes, botas abafadas, água até ao joelho, sussurros, flare (sopro + luz), traçantes | MG do prado; guias | artilharia britânica a sul | — |
| travessia | remos, chuva, motor baixo | — | Oosterbeek em fogo | **obrigatório** |

Sons novos: Horsa (interior/aterragem), chuva forte em copas/capacete/água, storm boat (motor baixo + remos), flare, polder (vadear). Música: motivo IV "A escala" só na cartela dos quatro anos; nenhuma música na travessia (o eco de 1940 é som, não música). VO inglês (sotaques do norte de Inglaterra/Cumbria para o 1st Border — proposta de elenco), neerlandês, alemão ao longe.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| 17/9/1944 primeira vaga aerotransportada a oeste de Arnhem; tarde clara | D | H19; S-C05 | — |
| 1st Border como infantaria de planadores da 1.ª Bde Aerotransportada; Reed em planador, não paraquedista | R | CONTINUITY §3.2; S-C05 | **P-C20** (batalhão/LZ) |
| Perímetro de Oosterbeek a 21/9; casas e hotel como postos; escassez de munição e de atendimento | D (geral) | H19 | P-C20 (casa-posto) |
| Operação Berlin noite 25/26: início ~22:00 (alguns 21:30), chuva forte, vento, fitas brancas até à Oude Kerk, botas abafadas, storm boats canadianos, ~2 400 evacuados, ~1 200 feridos ficam | D (resumo) | S-C05 | ponto de embarque exato (P-C20) |
| Barcos canadianos com motor; remos | D/R | S-C05 | confirmar proporção motor/remo nos storm boats usados |
| Família Van Dijk; Penn; Ashby; Marsh; o engenheiro | F | — | — |
| Equipamento: Lee-Enfield No.4, Sten, Bren, PIAT, Denison smock, Set 22; MP 40/StuG alemães | D | TIMELINE §3 | auditoria |
| Troca manual de 9 mm entre carregadores MP 40/Sten | R (plausível, lento) | — | revisão de armas |
| Urquhart/Frost fora de cena; ponte por relatos | regra | §79 | — |

**Proibições:** Reed na ponte; Reed paraquedista; chuva em 17/9; reforços entre datas; Whitfield morto/voz-off; Urquhart/Frost em cena; cópia de "A Bridge Too Far" (nenhuma frase do filme). **Fora de cena:** Urquhart, Frost.

---

## 10. Handoff técnico

**Contrato:** `id m20_oosterbeek`, `order 20`, **três segmentos de relógio** (`clock.segments`: 17/9 13:30→17:00; 21/9 08:00→14:00; 25/9 21:30→26/9 03:30) com cartela e `restore` por ato, `cast` (Reed, Birch, Stokes, Vane, Penn, Van Dijk×3, Ashby, Marsh, médico, maqueiros, guia, engenheiro, piloto, estafeta), grupos (`grp_section`, `grp_other_group`, `grp_de_probe_a/b`, `grp_de_kampfgruppe`, `grp_stug_far`, `grp_wounded`, `grp_civilians_vandijk`, `grp_guides`, `grp_boats`), setores s1–s5, checkpoints A–E (E recuperável), cutscenes (intro, day2, penn, outro), falas, flags, debrief.

**Flags:** `m20.completed`, `m20.ammo_day1/2/3`, `m20.early_withdrawal`, `m20.stokes_deescalated`, `m20.player_intervened`, `m20.player_carried`, `m20.penn_stayed` (sempre true), `m20.reed_asked_penn`, `m20.group_scattered`, `m20.vane_separated`, `m20.whitfield_memory` (cópia de `m04.whitfield_status`).

**Sistemas:** [C] missão em três atos com estados salvos por ato (extensão do `battleClock` por segmentos; o maior risco), água em prado/dique (vadear), barco de assalto com agenda (12 lugares, 6 min), Horsa encenado, flare como evento de luz com aviso; [A] fogo como dados, maca a dois (M01/M16), suppression, rotação de postos, agenda de MG; [B] `ammoPerMan` por ato, "dizer o número", chamada baixa, troca de cartuchos à mão; [D] porão com civis presentes (não interativos: olhar, água), leitura de `m04.*`. **Fallbacks honestos:** sem água → o prado é lama e o dique é a margem; sem barco em movimento → cutscene com plano fixo; sem três segmentos → três sub-missões encadeadas com `restore` (aceitável se a cartela e o estado persistirem).

**Disciplinas:** Level: LZ (charneca 400 m), estrada/bosque, casa Van Dijk (2 pisos + porão), rua com esquina, hotel/posto (salão), polder (300 m) e dique, margem; Combate/IA: sondas com recuo, MG por agenda com intervalo, Kampfgruppe que recua; Arte: Horsa, Oosterbeek burguês, chuva; Personagens: 1st Border em três estados de desgaste, RAMC, família holandesa, canadiano; Animação: descarga de planador, contagem (mostrar cartuchos na mão), abafar botas, vadear, remar, a alça; Som: chuva por superfície, flare, storm boat; VO: inglês/neerlandês/alemão; Historiador: P-C20 + proporção motor/remo; QA: estados por ato (nada novo entre atos), barco recuperável, Vane nunca morre, Penn sempre fica, variantes de Whitfield (2).

**Testes:** `ammo_day2 ≤ 30` para Reed independentemente de recolhas em 17/9; recuar cedo fere um proxy do outro grupo (nunca mata Vane/Stokes); `penn_stayed` true em todos os ramos; `whitfield_memory` copia `m04.whitfield_status` e nunca produz "dead"; perder o barco restaura E com o barco seguinte em ≤ 6 min de relógio; flare ilumina 1 s após o som; a casa Van Dijk nunca recebe dano estrutural de StuG.

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| Material conferido; a alça | (intro) | olhar; sair | piloto; holandês acena | planadores no chão | start | variante Whitfield |
| Relatos da ponte; rádio em ruído | `obj_m20_assemble` | escolher via; ouvir estafeta; rádio | Stokes 001; Vane rádio | — | bifurcação | CP-A |
| Ligar os separados; primeira contagem | `obj_m20_link_up` | correr o campo / mandar Vane; disparar; dizer número | Kampfgruppe recua; Birch conta | — | A | `ammo_day1`; cartela fim de ato |
| A casa-posto; a contagem | (cutscene day2) | dizer número | família no porão; Penn "nenhum" | colchões; chaleira | fim ato I | CP-B; `ammo_day2` |
| Postos menores; recuo controlado | `obj_m20_posts` | defender; recuar à ordem; recolher à mão | sondas; outro grupo exposto se cedo | janela desfeita; colchão a arder | B | `early_withdrawal` |
| Eles ainda estão esperando macas | `obj_m20_aid_post` / `wounded_passage` | levar ligaduras; cobrir no intervalo; intervir/chamar; carregar | médico; Marsh pede; Stokes acusa; Penn decide; Birch corta | Ashby na casa | posts held | CP-C; `stokes_deescalated`; `player_intervened` |
| O que fica | (cutscene penn) | uma frase | Penn fica; botas abafadas | velas; chuva começa | C | CP-D; `penn_stayed` |
| Siga as vozes até a água | `obj_m20_follow_tapes` / `keep_group` | seguir fitas; parar sob flare; vadear; chamar Vane; fila | guias; MG por agenda; engenheiro conta | prado com água; equipamento largado | D | `group_scattered`; `vane_separated` |
| Embarque | `obj_m20_embark` | entrar | Birch "Entra, Reed." | barco parte | dique | CP-E (recuperável) |
| Remos | (outro) | skip | Birch conta quatro | Oosterbeek ao longe | boat | `m20.completed`; `whitfield_memory` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 9 | a confiança que vira contagem; Penn fica; o rio como eco de 1940 sem repetição. |
| 2 | Autenticidade | 8 | Berlin documentada (chuva, fitas, botas, barcos, números); batalhão/LZ/casa/embarque P-C20; família e feridos ficção declarada. |
| 3 | Personagens | 8 | Birch, Stokes, Vane, Penn com arcos curtos; a família Van Dijk só presença (deliberado). |
| 4 | Diálogos | 9 | "Não há maca. E ele não aguenta a rua." / "Está onde disse que ficava." |
| 5 | Originalidade | 8 | cartuchos por homem como relógio; retirada noturna por fitas e vozes; nenhuma ponte. |
| 6 | Variedade | 9 | aterrar, reunir, ligar, contar, defender/recuar, levar ligaduras, cobrir no intervalo, carregar, seguir fitas, vadear, embarcar. |
| 7 | Set pieces | 9 | a contagem; o posto; a água — os três sem "onda final". |
| 8 | Atmosfera | 9 | três datas com três luzes; a chuva na água. |
| 9 | Environmental storytelling | 8 | a boneca, o relógio parado, o capacete com água, a alça. |
| 10 | Cinematográfica | 8 | a alça em 2 s; remos sem música. |
| 11 | Sonora | 9 | chuva por superfície; botas abafadas; flare com aviso; silêncio da travessia. |
| 12 | Impacto emocional | 9 | Penn; o barco que não espera; nenhum nome dito. |
| 13 | Ritmo | 7 | 26–35 min para três datas é apertado (PR #44): o Ato I foi limitado a duas tarefas; testar antes de acrescentar combate. |
| 14 | Continuidade | 9 | lê `m04.whitfield_status` com duas variantes; fecha Reed; abre M21 pelo som da água. |
| 15 | Integração técnica | 5 | três segmentos com estados por ato, água, barco e Horsa são [C]; fallbacks definidos. |

**Correções aplicadas:** (1) o Ato I foi reduzido a reunião + ligação (duas tarefas) para respeitar 26–35 min; (2) 21/9 sem chuva (S-C05 só documenta chuva a 25/26); (3) a MG do cruzamento recebeu intervalo legível para que a passagem de feridos seja justa; (4) o StuG nunca bate na casa com a família; (5) Penn fica em todos os ramos (a decisão é dele, não do jogador); (6) o eco de 1940 usa o motor baixo e os remos, nunca um flashback nem o nome de Whitfield dito em voz alta; (7) o barco perdido restaura o embarque em vez de falhar a missão.
