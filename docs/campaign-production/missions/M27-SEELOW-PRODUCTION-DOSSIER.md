# M27 — PORTÕES DE BERLIM · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** 16/4/1945, Seelow/Oderbruch; 8.º Exército de Guardas, 1.ª Frente Bielorrussa; POV Mikhail Orlov "com sua nova designação ficcional explicitada"; fonte H27; 24–31 min; três falas; checkpoints "preparação; primeira cobertura; passagem local; reorganização; objetivo limitado — salvar formações, terreno danificado e perdas"; a escala da preparação em baterias, formações e panorama; Orlov reconhece Makarov ou um substituto; artilharia intensa não eliminou toda a defesa; blindados com dificuldades próprias; "não romper toda a profundidade defensiva no primeiro dia; o desfecho de 18–19/4 é situado na transição documental"; final: socorrista a manter homens fora da via dos veículos; um sobrevivente pergunta se chegaram. **Proposto:** Orlov starshina na 27.ª Divisão de Guardas (CONTINUITY §3.4: draft de agosto de 1942 para o 62.º Exército, que se tornou 8.º Exército de Guardas em abril de 1943 — facto; P-C27), Makarov presente por `m07.makarov_status` ou Lev Danilin, Gusev no papel de Saveliev (sem o copo), Bychkov/Serov/Kravets (PR #44 adotados), o mapa de Orlov mostrado a Serov como objeto, o zumbido depois da barragem como silêncio, o inimigo incapaz de combater → Bychkov acusa / Orlov ordena segurança e cuidados → `m27.bychkov_deescalated`, o copo de Saveliev só se `m07.saveliev_status = unhurt` (entregue a Orlov na evacuação de dezembro de 1941 — registo ficcional). **Sistemas:** [C] barragem massiva por eixos e holofotes como panorama/NPC, lama/canais do Oderbruch, blindados NPC que atolam; [D] leitura de `m07.*`; [A] tudo o resto.

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m27_seelow` / 27 |
| Datas | 1945-04-16T02:40 → 16:00 **hora de Moscovo** (S-C24: barragem às 03:00 "hora de Moscovo"; equivalência com a hora local alemã pendente — P-C27; o relógio da missão usa a hora dos registos soviéticos) |
| Local | trincheiras de partida na cabeça de ponte de Küstrin (Oderbruch) → a planície encharcada: campos, valas de drenagem, um canal principal (Haupt Graben) com margens íngremes, uma ponte destruída e um aqueduto/passagem → quintas do Oderbruch ao pé das encostas → o objetivo limitado: uma quinta com muro e estábulo junto da estrada que sobe para Seelow (as alturas acima: **não** alcançadas) — `RECONSTRUCTED` (P-C27: divisão no setor; canal/vala; fuso) |
| Operação | ofensiva de Berlim: barragem às 03:00 (hora de Moscovo) de 16/4; 143 (ou 120) holofotes acesos depois; poeira e fumo que cegam os atacantes; canais e solo encharcado; o 8.º Exército de Guardas frente ao setor mais forte (a estrada/autoestrada para Seelow); sem rutura total a 16/4; Seelow a 17/4; alturas a 17–18/4; rutura a 19/4 (S-C24 — DOCUMENTED em resumo) |
| Unidade | 8.º Exército de Guardas (canónico) → 27.ª Divisão de Guardas (proposta, RECONSTRUCTED) → secção de Orlov (starshina) |
| Elenco | starshina Mikhail Orlov (POV), operador Yuri Makarov (§73; se `m07.makarov_status ∈ {unhurt, recovered}`) **ou** Lev Danilin (rádio substituto), sgt. Pavel Gusev (substituto de Saveliev; sem o copo), yefreitor Anatoly Bychkov (veterano furioso; o irmão morto em 1944), krasnoarmeyets Nikolai "Kolya" Serov (17), sanitarka Lidia Kravets, krasnoarmeyets Timur Aliyev (ferido do dia — proposta), um comandante de T-34 só por voz (ten. Rudenko — proposta), um oficial da companhia por voz, um alemão incapaz de combater (ferido na vala, soldado jovem da 9.ª Div. de Paraquedistas — R; sem nome inventado além de "Peter" que ele diz) (propostas) |
| Fora de cena | marechal Georgy Zhukov; gen. Chuikov; Stalingrado como passado de Orlov (nunca ligado a Antonov/Gromov) |
| Intocável | data, local, unidade, POV, falas `dlg_m27_001–003`, os cinco checkpoints (formações, terreno danificado e perdas persistentes), Makarov ou substituto por flag, a escala da preparação como panorama, posições que resistiram, blindados que atolam, "não romper toda a profundidade a 16/4", o desfecho de 17–19/4 só em transição documental, Saveliev **não** em 1945, Orlov nunca ligado a Antonov/Gromov |

---

## 1. Story Bible

**Logline.** Mikhail Orlov tem trinta e seis anos e uma cicatriz na perna que ninguém vê. Às três da manhã o mundo faz o maior ruído que ele alguma vez ouviu e depois os holofotes acendem-se e não iluminam nada além de poeira. A secção avança por uma planície encharcada onde cada vala é uma cobertura e uma armadilha, descobre que a primeira linha ainda responde, espera por blindados que atolam no canal, evacua um ferido pela mão de uma socorrista que não deixa ninguém ficar na via dos veículos, e toma uma quinta ao pé das encostas. Serov pergunta se chegaram. Orlov mostra-lhe o mapa: chegaram aqui. A cidade ainda está adiante.

**As oito respostas.**
1. **Situação central:** o maior ruído da guerra; objetivo local (MASTER-STORY-BIBLE §4).
2. **Modo de contar:** homens que ficaram na vala após cada salto — cada salto deixa alguém para trás (ferido, esgotado, perdido) e a secção conta-se de novo.
3. **Objeto:** o mapa de Orlov (mostrado a Serov; a ordem de ataque dobrada com a mesma dobra da carta de Marsh — transição V → VI); o copo de Saveliev **só** se `m07.saveliev_status = unhurt` (senão o gesto do polegar passa ao bordo do mapa).
4. **Silêncio:** depois da barragem — o zumbido (os ouvidos; os holofotes com zumbido elétrico; o vento no Oderbruch).
5. **Tarefa que não é matar:** manter contacto; alcançar cobertura; identificar o que resistiu; abrir passagem com o apoio que existe; evacuar; recompor ligação; consolidar só com flanco e ligação.
6. **Custo humano:** na vala junto do canal, um soldado alemão jovem (paraquedista da 9.ª — R), ferido nas duas pernas, sem arma, incapaz de combater (causa: a barragem e a retirada da sua unidade para a segunda linha) → Bychkov acusa-o pelo irmão (morto na Bielorrússia em 1944: "Os teus mataram o meu irmão em Bobruisk.") e ergue o fuzil / Orlov ordena segurança e cuidados ("Segurança primeiro. Depois a Kravets vê-o. **Depois** dos nossos.") → o jogador pode pôr a mão no antebraço de Bychkov (interação, o gesto que Gusev repetirá em M28) ou chamar Gusev / calar-se → Gusev segura-lhe o braço se ninguém o fizer em 5 s → `m27.bychkov_deescalated` se Bychkov baixa o fuzil após o jogador/Gusev; Serov, que assistia, volta ao mapa com Orlov (`m27.serov_map_shown`); Bychkov não se converte ("O que fez não desaparece." — PR #44, atribuída a Bychkov); se o jogador disparar sobre o alemão: `m27.player_fired_on_pow`, a secção deixa de falar com Orlov até à quinta, a fala 003 é **omitida**, o debrief regista; nunca termina a missão.
7. **Pessoas históricas:** Zhukov e Chuikov fora de cena (a ordem é "do batalhão"; os holofotes são "ordem de cima").
8. **Debrief:** regista a barragem de 03:00, os holofotes, a planície encharcada, os blindados presos nos canais, o 8.º Exército de Guardas frente ao setor mais forte, a ausência de rutura a 16/4, Seelow a 17/4, as alturas a 17–18/4, a rutura a 19/4; Aliyev evacuado; "uma quinta ao pé das encostas; a cidade a 70 km".

**Três motivos.** (a) *O ruído* — a preparação como fenómeno distante por vários eixos (PR #44): baterias e formações que não esperam Orlov; (b) *a primeira linha ainda responde* — "A primeira linha ainda responde." (001): a artilharia não fez o trabalho todo; (c) *a mesma vala* — "Não empurrem todos para a mesma vala." (002): a cobertura que se enche é uma armadilha.

**Temas.** A promessa de Berlim contra a resistência real; o desgaste de um veterano que reconhece nos recrutas o que já viu (Serov como Lukin); a disciplina que protege o inimigo incapaz; a escala que não espera por ninguém; "chegámos aqui".

**Estrutura (§54).** CONTEXTO (cartela: Orlov desde 1941; a nova designação explicitada) → INTRO (trincheiras; a espera; o mapa dobrado; Makarov/Danilin; 03:00) → APROXIMAÇÃO (avançar depois da preparação; holofotes; manter contacto) → DIÁLOGO (o zumbido; Gusev: "Não empurrem…") → PRIMEIRO CONTATO (a primeira linha responde: MG e morteiros de posições que resistiram) → ESCALADA (o canal; os blindados atolam; o acesso falha) → COMBATE PRINCIPAL (abrir passagem local pelo aqueduto com o apoio que existe) → SET-PIECE (o ferido alemão na vala; Bychkov) → PAUSA (evacuar Aliyev; Kravets e a via dos veículos; notícias de outros setores) → CLÍMAX (a quinta: tomar e consolidar só com ligação e flanco; pressão local) → CONSEQUÊNCIA (a ambulância; Serov pergunta; o mapa) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Orlov | confirma onde está o grupo antes de acelerar (M07); esfrega o polegar no bordo do copo/mapa | Gusev; Serov | o canal; Bychkov; a quinta | reconhece a desorientação dos recrutas; distingue o objetivo local de Berlim | mostra o mapa a Serov |
| Makarov / Danilin | "A primeira linha ainda responde." (001) | Orlov | o rádio sob o ruído | — | vivo |
| Gusev | "Não empurrem todos para a mesma vala." (002) | secção | Bychkov | — (o gesto da mão no antebraço nasce aqui) | vivo; essencial em M28 |
| Bychkov | furioso; o irmão | ninguém | o alemão na vala | baixa o fuzil; não se converte | `bychkov_deescalated` → M28 |
| Serov | 17; "Pensei que chegávamos hoje." | Orlov | o alemão; o mapa | volta ao mapa | vivo |
| Kravets | socorrista | feridos | a via dos veículos | — | vivo; continua |
| Aliyev | ferido no canal (fixo) | Kravets | — | — | evacuado (fixo) |
| o alemão ("Peter") | incapaz de combater | — | custódia e cuidados | — | entregue à retaguarda |

**O que a missão recusa.** Vitória total a 16/4; Orlov na crista de Seelow; Zhukov/Chuikov em cena; Saveliev em 1945; Stalingrado ligado a outros POVs; ondas suicidas; tanques que atravessam o impossível; execução; partículas genéricas a esconder a formação; um alemão "boss".

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "03:00" (`cs_m27_intro`, ≤ 90 s)
2 02:40 → 03:00 (hora de Moscovo) · 3 trincheiras de partida na cabeça de ponte; lama; homens sentados com as armas entre os joelhos; atrás, por vários eixos, baterias (152 mm, Katyusha em rampas), colunas de T-34 e SU-76 com motores desligados; holofotes AA ainda apagados em linha; a planície escura à frente; as encostas de Seelow como uma linha mais escura · 4 noite antes do amanhecer; nuvens; um brilho de incêndio a oeste · 5 Orlov, Makarov/Danilin, Gusev, Bychkov, Serov, Kravets, Aliyev; um oficial da companhia por voz; a secção (10) · 6 Cartela: ODERBRUCH — CABEÇA DE PONTE DE KÜSTRIN — 16 DE ABRIL DE 1945 — 02:40 (HORA DE MOSCOVO) · 27.ª DIVISÃO DE GUARDAS · 8.º EXÉRCITO DE GUARDAS. Cartela 2: "Mikhail Orlov. Kryukovo, 1941. Ferido em dezembro; hospital; reforço para o 62.º Exército em 1942, que se tornou o 8.º de Guardas em 1943. Starshina." Cartela 3 (`lineVariants`): "Yuri Makarov: ferido na mesma semana de 1941, mesmo comboio, mesmo reforço. Rádio." / "Lev Danilin, rádio. O Makarov ficou em 1941." Orlov desdobra a ordem de ataque: **a mesma dobra** da carta de Marsh (plano 2 s). Se `m07.saveliev_status = unhurt`: Orlov esfrega o polegar no bordo de um copo de lata (cartela mínima: "O copo do Saveliev. Dezembro de 1941: 'Leva. No hospital dão-te chá sem copo.'"); senão, no bordo do mapa. Serov: "Pensei que chegávamos hoje." Orlov: "Chega-se a onde se chega." Às 03:00: **a barragem** — o som chega como uma parede; o panorama mostra os eixos (não só o tremor de câmara); 30 s; depois os holofotes acendem-se e a planície fica branca de poeira: não se vê nada · 7 a escala como panorama; a designação explicitada; o objeto; o eco de M26 · 8 olhar; dobrar/desdobrar (interação) · 9 — · 10 — · 11 — · 12 o mapa, o copo (variante), as rampas de Katyusha, os holofotes · 13 `dlg_m27_010–016` · 14 **barragem massiva por eixos → holofotes (zumbido elétrico)** · 15 panorama por vários eixos (a câmara mostra a operação, não o tremor); plano no mapa; plano nos holofotes a acender · 16 `missionStart` · 17 oficial: "Avançar." · 18 `m27.makarov_present`, `m27.cup_present` (derivadas) · 19 [C] barragem como panorama/NPC (partículas **não** genéricas: as formações continuam visíveis); [D] lê `m07.*` · 20 a dobra (M26 → M27)

### Cena 2 — "Manter contacto" (jogável; `obj_m27_advance_contact`)
2 03:30–04:30 · 3 a planície: campos encharcados, valas de drenagem a cada 80–120 m, lama que puxa, poeira e fumo da barragem a 50 m de visibilidade, os holofotes atrás a projetar sombras longas (cegam quem olha para trás); outras secções à esquerda e à direita (vozes; silhuetas) · 4 noite com holofotes; poeira branca; brilho de incêndios · 5 secção; formações nos eixos vizinhos (proxies); nenhum inimigo em contacto ainda (fogo alemão esparso de longe: morteiros ≥ 30 m) · 6 Avançar após a preparação mantendo contacto com o grupo através de terreno que dificulta observação: o jogador confirma onde está o grupo antes de acelerar (interação: "contagem por voz" — Orlov chama, cada um responde: 4 confirmações ao longo da fase; sem confirmação, a secção dispersa-se e Gusev chama: custo em tempo; **nunca** perde homens por isso); as valas são cobertura e armadilha (lama no fundo: lento); os holofotes cegam se o jogador olhar para trás por > 2 s (efeito de luz, sem dano); **o zumbido** depois da barragem (3 s de ouvido tapado ao início) · 7 §79 ponto 1 · 8 avança por valas; confirma o grupo; não olha para trás · 9 vala (cobertura; lama lenta) vs campo (rápido; sombra longa visível) · 10 Gusev regula o passo; Makarov/Danilin com o rádio; Serov agarrado; Bychkov à frente; Kravets atrás com Aliyev · 11 morteiros esparsos (dados) · 12 valas, poeira, um cavalo morto de uma bateria alemã, fios · 13 `dlg_m27_017–023` · 14 **vento no Oderbruch → zumbido → vozes abafadas → holofotes** · 15 livre; sombras longas · 16 "Avançar." · 17 chegada à primeira vala grande (`evt_m27_first_ditch`) · 18 `cp_m27_a_preparacao`; `m27.contact_kept` (0–4) · 19 [C] holofotes como luz direcional com cegueira temporária (sem dano), lama como modificador; [A] navegação, "contagem por voz" (M01 `line()`) · 20 —

### Cena 3 — "A primeira linha ainda responde" (jogável; `obj_m27_first_cover`, `obj_m27_identify`)
2 04:30–06:00 (escala acelerada; `readyScale`) · 3 a vala grande e um talude de estrada secundária; à frente, 300 m até à primeira linha alemã (trincheiras na margem de um canal menor; uma quinta em ruínas com uma MG; posições de morteiro atrás); o amanhecer começa a cinzento · 4 amanhecer com poeira; os holofotes apagam-se às 05:30 (agenda) · 5 secção; formações vizinhas; alemães: **posições que resistiram** (MG 42 na quinta em ruínas; um ninho na trincheira; morteiros), outras posições só fumo sem ameaça (a barragem acertou) · 6 Alcançar cobertura e identificar posições que resistiram: Makarov/Danilin: "A primeira linha ainda responde." (001); o jogador aprende a distinguir posição sobrevivente (fogo, movimento, traçantes) de fumo sem ameaça (observação: 3 pontos; sem HUD); Gusev manda ocupar a vala em troços ("Não empurrem todos para a mesma vala." — 002 — quando ≥ 4 homens se amontoam: um morteiro agendado ≥ 30 m e a fala); a secção suprime o ninho enquanto a formação da direita avança (agenda); a MG da quinta é para depois (com apoio) · 7 §79 ponto 2 ("Artilharia intensa não eliminou automaticamente toda defesa") · 8 ocupa cobertura em troços; observa 3 pontos; suprime (150–300 m) · 9 vala (coberta; enche-se) vs talude (vista; exposta) · 10 Gusev distribui; Makarov/Danilin relata; Bychkov dispara demais; Serov não vê nada; Kravets com Aliyev · 11 MG (dados; só sobre linha de visão); ninho (recua quando a direita avança); morteiros ≥ 30 m · 12 trincheiras batidas, fumo, a quinta em ruínas, posições vazias com equipamento · 13 `dlg_m27_001–002` (canónicas), `024–031` · 14 silêncio depois das rajadas (AUDIO); MG abafada pela poeira; a formação da direita · 15 livre · 16 CP-A · 17 ninho recuado + 3 posições identificadas (`evt_m27_identified`) · 18 `cp_m27_b_primeira_cobertura`; `m27.positions_identified` (survived/smoke) · 19 [A] fogo como dados; [B] identificar como interação de observação · 20 —

### Cena 4 — "O canal" (jogável; `obj_m27_open_passage`)
2 06:00–08:30 (escala acelerada) · 3 o canal principal: margens íngremes de 3 m, água até à cintura, uma ponte destruída, um aqueduto/passagem de 1,5 m de largura 200 m à direita (coberto pela MG da quinta); T-34 e SU-76 a chegar pela estrada e a **atolar** na margem (NPC; o acesso de blindados falha: as lagartas rasgam a lama; um T-34 fica atravessado na rampa; a tripulação sai e procura outra passagem); um sapador com pranchas · 4 manhã cinzenta; poeira a assentar · 5 secção; os blindados (NPC; ten. Rudenko por voz); sapadores; formações vizinhas; alemães: MG da quinta (cobre o aqueduto por janelas), atiradores, Panzerfaust contra os blindados (dados; nunca contra o jogador a < 30 m) · 6 Abrir passagem local junto de apoio disponível: o apoio é um T-34 que **não** atravessa ("Blindados encontram dificuldades próprias") mas que, parado, pode suprimir a quinta com o canhão **se** o jogador lhe indicar a posição (interação: correr 40 m até ao T-34 e bater na torre; Rudenko: "Vejo fumo. Diz-me a janela." — Orlov indica); com a quinta suprimida, a secção passa o aqueduto em fila (um de cada vez: Gusev conta; "a mesma vala" repetida como "a mesma ponte"); **Aliyev é ferido ao passar** (fixo às 07:50: estilhaço de morteiro na anca; cai na vala do outro lado) · 7 §79 ponto 3 ("não atravessam uma encosta/vala impossível porque o roteiro exige") · 8 corre ao T-34; indica; passa o aqueduto em fila; cobre · 9 indicar ao T-34 (40 m expostos; apoio real) vs passar sem apoio (a MG por janelas: lento, 3 janelas) · 10 Rudenko suprime se indicado; sapadores põem pranchas; Gusev conta a fila; Bychkov primeiro; Kravets com Aliyev · 11 MG (agenda); atiradores; Panzerfaust contra blindados (NPC) · 12 a ponte destruída, o T-34 atravessado na rampa, pranchas, água · 13 `dlg_m27_032–041` · 14 motores de T-34 a rodar na lama; o canhão; o aqueduto (água); morteiros · 15 livre; o T-34 atolado em plano médio (a imagem revela por que o campo é difícil — PR #44) · 16 CP-B · 17 secção do outro lado + Aliyev ferido (`evt_m27_passage`) · 18 `cp_m27_c_passagem_local`; `m27.passage_opened ∈ {tank_assisted, infantry_only}`; `m27.aliyev_wounded = true` (fixo) · 19 [C] blindados NPC que atolam (estado "atolado": nunca "destruído por roteiro"); lama/água; [A] fogo como dados, supressão por janelas; [B] indicar ao T-34 · 20 Aliyev → cena 6

### Cena 5 — "O que fez não desaparece" (jogável; `obj_m27_pow`) — **custo humano**
2 08:30–08:45 · 3 a vala do outro lado do canal: lama, água até ao joelho, equipamento alemão abandonado; um soldado alemão jovem (paraquedista; capacete sem cobertura; 18–19 anos) sentado contra a margem, as duas pernas feridas, sem arma, a tremer, a dizer "nicht… nicht…" · 4 manhã cinzenta · 5 Orlov, Gusev, Bychkov, Serov; Kravets a tratar Aliyev a 10 m; Makarov/Danilin no rádio · 6 Bychkov encontra-o; ergue o fuzil: "Os teus mataram o meu irmão em Bobruisk." Orlov: "Segurança primeiro. Depois a Kravets vê-o. **Depois** dos nossos." → o jogador põe a mão no antebraço de Bychkov (interação) / chama Gusev / cala-se → Gusev segura-lhe o braço se ninguém em 5 s: "Largou a arma. Baixa a tua." (PR #44, atribuída a Gusev — nasce aqui, volta em M28); Bychkov baixa; "O que fez não desaparece." (PR #44, Bychkov); o alemão diz "Peter"; Kravets, depois de Aliyev, põe-lhe um torniquete (plano médio); Serov, que assistia de olhos abertos, volta para junto de Orlov: Orlov abre o mapa e mostra-lhe onde estão (`m27.serov_map_shown`); se o jogador dispara: `player_fired_on_pow`, silêncio da secção até à quinta, 003 omitida, debrief · 7 custo humano com contexto (o irmão) e consequência (M28) · 8 mão no antebraço / chamar / calar-se / (disparar: custo) · 9 as três · 10 Bychkov; Gusev; Kravets; Serov · 11 nenhum (morteiros longe) · 12 o alemão sem arma; o torniquete; o mapa · 13 `dlg_m27_042–050` · 14 **silêncio** antes de Bychkov (2 s); a voz do alemão; a lama · 15 livre; beat fixo no alemão (2 s); o mapa com Serov (plano próximo) · 16 passage · 17 alemão sob guarda; Serov junto do mapa (`evt_m27_pow`) · 18 `m27.bychkov_deescalated`; `m27.player_intervened`; `m27.player_fired_on_pow`; `m27.serov_map_shown`; `m27.pow_cared = true` · 19 [C] `SURRENDERED`/DOWN (M07/M19); fallback encenado · 20 Bychkov de-escalado aqui baixa a arma antes da ordem em M28

### Cena 6 — "A via dos veículos" (jogável; `obj_m27_evacuate`, `obj_m27_relink`)
2 08:45–10:30 (escala acelerada) · 3 de volta ao canal pelo aqueduto (Aliyev na maca: a dois pela passagem de 1,5 m), a estrada do lado de cá cheia de veículos (T-34 a tentar outra rampa, camiões, uma ambulância GAZ com cruz vermelha a tentar atravessar a coluna); o posto do batalhão numa vala alargada; o rádio · 4 manhã; poeira · 5 secção; Kravets; condutores; a ambulância; Makarov/Danilin; o oficial por voz; o alemão levado por dois homens de outra secção para a retaguarda · 6 Evacuar Aliyev (maca a dois pelo aqueduto: Orlov e Bychkov — Bychkov pega sem falar) até à ambulância, que não consegue atravessar a coluna: **Kravets mantém os homens fora da via dos veículos** (o jogador ajuda: interação "fora da via" com dois homens que se sentaram na estrada; um T-34 a recuar passa a 2 m — aviso sonoro; nunca atropela: o veículo pára se há alguém, com buzina e grito do condutor); recompor ligação (Makarov/Danilin: "Batalhão responde. Esquerda parada no canal; direita avançou 400 m e parou. Reorganizar antes de subir."); notícias de outros setores mostram avanço interrompido · 7 §79 ponto 4 · 8 carrega a dois; tira homens da via; ouve o rádio · 9 carregar / cobrir (Bychkov e Serov carregam se não) · 10 Kravets; condutores; Makarov/Danilin; o oficial · 11 artilharia alemã sobre a estrada (≥ 30 m, agenda) · 12 a ambulância, a coluna, o posto na vala · 13 `dlg_m27_051–057` · 14 **ambulância** (motor, buzina), a coluna, o rádio com outros setores · 15 livre; a ambulância a tentar atravessar em plano médio (ART §4) · 16 pow · 17 Aliyev na ambulância + ligação (`evt_m27_relinked`) · 18 `cp_m27_d_reorganizacao`; `m27.aliyev_evacuated = true` (fixo); `m27.link_restored`; `m27.player_carried` · 19 [C] veículos NPC com paragem por presença; [A] maca a dois, rádio por estados · 20 —

### Cena 7 — "A quinta" (jogável; clímax; `obj_m27_objective`, `obj_m27_hold`)
2 10:30–15:00 (escala acelerada entre pressões) · 3 a quinta do Oderbruch ao pé das encostas: muro de tijolo, casa, estábulo, um pomar; a estrada que sobe para Seelow (**não** se sobe); as encostas acima com fogo alemão (88 mm, morteiros: dados); a formação da direita a 200 m; o canal atrás com o T-34 que finalmente passou por outra rampa (NPC, chega às 12:30) · 4 meio-dia cinzento; depois sol fraco · 5 secção (sem Aliyev); a formação da direita; o T-34; alemães: guarnição da quinta (infantaria da 9.ª Para — R; 8–10), MG no estábulo, contra-ataque local às 13:40 (infantaria + um StuG ao longe que não entra no pomar: dados) · 6 Capturar/consolidar um objetivo limitado: a quinta — aproximação pelo pomar (cobertura), supressão da MG do estábulo (o T-34, se chegou, bate o estábulo por indicação; senão, Bychkov pela esquerda), limpar casa e estábulo (interiores simples; dois alemães rendem-se: levados ao muro, sem repetição da cena 5 — Gusev trata), **consolidar só quando existe ligação e flanco protegidos** (interação: ligação com a direita por Serov a pé + posição de flanco no pomar com a DP de Bychkov); sobreviver à pressão local (contra-ataque repelido com a direita); "não romper toda a profundidade"; o oficial por voz: "Quinta é o objetivo. As alturas são amanhã. Ninguém sobe." · 7 §79 ponto 5 · 8 aproxima-se pelo pomar; indica ao T-34 (se); limpa interiores; posiciona; liga; defende · 9 pomar (coberto; lento) vs estrada (rápida; 88 mm por agenda) · 10 Gusev; Bychkov na DP; Serov liga; Makarov/Danilin; Kravets no posto da quinta (depois) · 11 guarnição (dados); MG; contra-ataque; StuG ao longe; 88 mm ≥ 30 m · 12 muro, estábulo, pomar, a estrada que sobe · 13 `dlg_m27_058–067` · 14 88 mm das encostas; a DP; o T-34 (se); interiores; silêncio depois das rajadas · 15 livre; a estrada que sobe sempre no enquadramento · 16 CP-D · 17 contra-ataque repelido + ligação + flanco (`evt_m27_consolidated`) · 18 `cp_m27_e_objetivo_limitado`; `m27.objective_consolidated`; `m27.tank_arrived` · 19 [A] interiores (M10), posicionar, rotação; [C] T-34 NPC que chega por outra rampa · 20 —

### Cena 8 — "A cidade ainda está adiante" (`cs_m27_outro`, ≤ 70 s) + debrief
2 15:00–16:00 · 3 a quinta: o muro; a estrada atrás com a coluna a mover-se devagar; Kravets a manter dois homens fora da via de um T-34 que passa; a ambulância de regresso; as encostas acima com fumo · 4 tarde com sol fraco · 5 Orlov, Gusev, Bychkov, Serov, Makarov/Danilin, Kravets · 6 Orlov observa Kravets a tentar manter homens fora da via dos veículos (plano médio, 4 s). Serov: "Chegámos?" Orlov abre o mapa e mostra-lhe (o polegar no bordo do copo, se existe, ou do mapa): "Chegamos aqui. A cidade ainda está adiante." (003). Serov olha a estrada que sobe. Bychkov limpa o fuzil sem olhar para ninguém. Gusev: "Amanhã, a encosta. Hoje, o muro." Cartela: a 16/4 o 8.º Exército de Guardas chegou ao pé das encostas sem rutura; Seelow foi tomada a 17/4; as alturas a 17–18/4; a rutura a 19/4; Berlim a 70 km. Cartela 2 (`lineVariants`): "Yuri Makarov: rádio, vivo." / "Lev Danilin: rádio, vivo." · 7 §79 final ("Cansaço permanece apesar da proximidade do fim europeu") · 8 skip · 9 — · 10 — · 11 — · 12 o mapa; o copo (variante); a estrada que sobe · 13 `dlg_m27_003` (canónica), `068–070` · 14 **silêncio relativo**: a coluna devagar, a ambulância; nenhuma música até à cartela (motivo VI "A água, outra vez" — uma frase: começa aqui) · 15 plano fixo em Kravets e a via; o mapa com Serov; a estrada que sobe · 16 consolidated · 17 `missionEnd` · 18 `m27.completed`; `m27.bychkov_deescalated` → M28 · 19 [A] cutscene com variantes · 20 M28 (Berlim) lê `m27.bychkov_deescalated`, `m27.makarov_present`, `m27.cup_present`

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m27_advance_contact` | Avance após a preparação; confirme o grupo antes de acelerar | sim | 03:30 | vala grande | — | `contact_kept` | A |
| `obj_m27_first_cover` | Ocupe cobertura em troços; não encham a mesma vala | sim | A | troços ocupados | — | — | — |
| `obj_m27_identify` | Identifique as posições que resistiram (3) | sim | cobertura | 3 observações | — | `positions_identified` | B |
| `obj_m27_open_passage` | Abra passagem pelo aqueduto com o apoio que existe | sim | B | secção do outro lado | — | `passage_opened`; `aliyev_wounded` (fixo) | C |
| `obj_m27_pow` | O alemão incapaz de combater: segurança e cuidados | sim (cena) | vala | sob guarda | — | `bychkov_deescalated`; `player_intervened`; `player_fired_on_pow`; `serov_map_shown` | — |
| `obj_m27_evacuate` | Evacue Aliyev até à ambulância; mantenha a via livre | sim | pow | Aliyev na ambulância | — | `aliyev_evacuated` (fixo); `player_carried` | — |
| `obj_m27_relink` | Recomponha a ligação com o batalhão | sim (paralelo) | pow | rádio | — | `link_restored` | D |
| `obj_m27_objective` | Tome a quinta; limpe casa e estábulo | sim | D | limpa | — | — | — |
| `obj_m27_hold` | Consolide com ligação e flanco; repila a pressão | sim | quinta | contra-ataque repelido | — | `objective_consolidated` | E |

### 3.2 Setores
`s1_jump_off` (perto) · `s2_oderbruch_flat` (perto: valas, lama, poeira, holofotes atrás) · `s3_first_line` (perto: trincheiras, quinta em ruínas) · `s4_canal` (perto: ponte destruída, aqueduto, rampas com blindados) · `s5_farm` (perto: muro, casa, estábulo, pomar) · `s6_mid` (médio: eixos de infantaria/blindados, a formação da direita, a coluna na estrada, a ambulância) · `s7_far` (longe: baterias, holofotes, formações, as encostas com 88 mm, Seelow). Agendas: barragem 03:00–03:30; holofotes 03:30–05:30; morteiros esparsos; MG da quinta em ruínas por janelas (5 s/12 s); blindados atolam 06:40/07:10; Aliyev 07:50 (fixo); ambulância 09:20; T-34 chega à quinta 12:30; contra-ataque 13:40; 88 mm a cada 70 s sobre a estrada.

### 3.3 Checkpoints
A preparação (barragem; grupo contado) · B primeira cobertura (posições identificadas) · C passagem local (aqueduto; Aliyev ferido; blindados atolados persistem) · D reorganização (Aliyev evacuado; ligação) · E objetivo limitado (quinta; flanco). Salvam formações (onde estão os eixos), terreno danificado (crateras, a ponte, o T-34 atravessado) e perdas (Aliyev; proxies).

### 3.4 Justiça
A barragem nunca fere o jogador; holofotes cegam sem dano; morteiros/88 mm com assobio e ≥ 30 m; Panzerfaust só contra blindados NPC; MG por janelas legíveis; blindados NPC param se há alguém na via (buzina + grito); Aliyev é fixo e vive; o alemão nunca reage; "a mesma vala" avisa antes do morteiro; nenhuma onda suicida: o acesso que falha reorganiza-se.

---

## 4. Set pieces

### SP-27-1 "03:00"
Contexto: trincheiras de partida. Preparação: o mapa dobrado; Makarov ou Danilin; o copo ou não. Experiência: a parede de som por vários eixos; os holofotes que não iluminam nada; avançar por valas confirmando o grupo por voz; o zumbido. Companheiros: Gusev regula; Serov agarrado; Bychkov à frente. Ambiente: cavalo morto, fios. Evolução: holofotes apagam-se às 05:30. Clímax: fala 001. Consequências: CP-A/B. Requisitos: [C] panorama/holofotes/lama. Integração: `obj_m27_advance_contact`, `obj_m27_identify`.

### SP-27-2 "O canal"
Contexto: a ponte destruída. Preparação: posições identificadas; a MG da quinta em ruínas. Experiência: os T-34 atolam; correr ao T-34 e indicar; o aqueduto em fila; Aliyev cai. Companheiros: Rudenko por voz; sapadores; Gusev conta a fila. Ambiente: o T-34 atravessado na rampa. Evolução: supressão do canhão (ou sem apoio, por janelas). Clímax: a passagem. Consequências: CP-C, `passage_opened`. Requisitos: [C] blindados NPC que atolam. Integração: `obj_m27_open_passage`.

### SP-27-3 "O que fez não desaparece"
Contexto: a vala do outro lado. Preparação: Bychkov disparou demais o dia todo; o irmão. Experiência: o alemão sem arma e sem pernas úteis; o fuzil erguido; a mão no antebraço; Kravets depois dos nossos; Serov volta ao mapa. Companheiros: Gusev; Kravets; Serov. Ambiente: torniquete; mapa. Evolução: a frase de Bychkov. Clímax: "Largou a arma. Baixa a tua." Consequências: `bychkov_deescalated` → M28. Requisitos: [C] `SURRENDERED`/DOWN; fallback. Integração: `obj_m27_pow`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| trincheiras | lama, baterias, rampas, holofotes em linha | espera | 03:00 | — | Serov; Makarov/Danilin | — |
| planície | valas, poeira, cavalo morto, fios | avançar | holofotes | morteiros | — | contagem por voz |
| primeira linha | trincheiras batidas, fumo, quinta em ruínas, equipamento | identificar | a mesma vala | MG; ninho | — | ninho recuou |
| canal | ponte destruída, rampas, pranchas, água | blindados atolam | o aqueduto | MG; Panzerfaust (NPC) | Rudenko; sapadores | T-34 atravessado; Aliyev |
| vala do outro lado | equipamento alemão, lama | — | Bychkov | — | o alemão; Kravets | torniquete |
| estrada | coluna, ambulância, posto na vala | evacuar; ligar | a via | artilharia | condutores | Aliyev na ambulância |
| quinta | muro, estábulo, pomar, a estrada que sobe | tomar; consolidar | 88 mm | guarnição; contra-ataque | rendidos ao muro | flanco; ligação |
| fim | coluna devagar, a ambulância de regresso | — | — | — | Kravets na via | o mapa |

Objetos com origem: o mapa de Orlov (ordem de ataque do batalhão, 15/4, dobrada como a carta de Marsh), o copo (Saveliev, dezembro de 1941 — só se `m07.saveliev_status = unhurt`), o cavalo morto (bateria alemã de 10,5 cm retirada a 15/4), a ponte destruída (demolida pelos alemães a 14/4), o T-34 atravessado (6.ª Brigada? **não** nomear unidade blindada: "blindados de apoio" — P-C27), o torniquete (de Kravets; o terceiro do dia).

---

## 6. Diálogos (VO russo; alemão para o ferido, sem tradução)

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Makarov / Danilin | "A primeira linha ainda responde." (§79; reatribuída a Danilin se Makarov ausente) | primeiro fogo da primeira linha | 1 | — |
| 002 | Gusev | "Não empurrem todos para a mesma vala." (§79; substituto de Saveliev) | ≥ 4 na mesma vala | 0 | 30 |
| 003 | Orlov | "Chegamos aqui. A cidade ainda está adiante." (§79; **omitida** se `player_fired_on_pow`: Orlov só aponta o mapa) | outro | 1 | — |
| 010 | oficial (voz) | "Às três. Depois dos holofotes, avançar. Ninguém pára nas valas." (V1) | intro t 5 | 1 | — |
| 011 | Serov | "Pensei que chegávamos hoje." (PR #44) | intro t 20 | 2 | — |
| 012 | Orlov | "Chega-se a onde se chega." (V1) | 011 | 1 | — |
| 013 | Makarov | "A mesma semana, o mesmo comboio, o mesmo reforço. E ainda me pões a carregar o rádio." / Danilin: "Dizem que tinhas um rádio em 41 que não funcionava." (V1 variantes) | intro t 35 | 2 | — |
| 014 | Bychkov | "Berlim. Setenta quilómetros. O meu irmão ficou a mil." (V1) | intro t 50 | 2 | — |
| 015 | Gusev | "Guarda isso para a vala. Vais precisar." (V1) | 014 | 2 | — |
| 016 | Kravets | "Aliyev, a bolsa fica comigo. Tu levas a arma." (V1) | intro t 60 | 3 | — |
| 017 | Orlov | "Secção. Contem." (V1; contagem por voz) | interação | 1 | — |
| 018 | secção (vozes) | "Gusev." "Bychkov." "Serov." "Kravets." "Aliyev." "Rádio." (V1) | 017 | 1 | — |
| 019 | Gusev | "Orlov! Onde estás? Perdemos-te na poeira." (V1; sem contagem) | dispersão | 0 | — |
| 020 | Serov | "Não vejo nada. Os holofotes… não vejo nada." (V1) | olhar para trás | 2 | — |
| 021 | Orlov | "Não olhes para trás. Olha para as minhas costas." (V1) | 020 | 1 | — |
| 022 | Bychkov | "Cavalo deles. A bateria foi-se antes da nossa." (V1) | cavalo | 3 | — |
| 023 | Gusev | "Vala grande. Troços. Dois aqui, dois ali. Não todos." (V1) | vala | 1 | — |
| 024 | Makarov / Danilin | (001) | MG | 1 | — |
| 025 | Orlov | "Fumo não dispara. Procura o que dispara." (V1) | identificar | 1 | — |
| 026 | Serov | "Aquilo mexe-se?" / Orlov: "Mexe-se. É posição. Marca." (V1) | observação | 2 | — |
| 027 | Gusev | (002) | amontoar | 0 | 30 |
| 028 | Bychkov | "Deixa-me ir à quinta." / Gusev: "Com quê? Vai a direita primeiro." (V1) | — | 2 | — |
| 029 | formação da direita (voz) | "Direita avança! Suprimam o ninho!" (V1) | agenda | 1 | — |
| 030 | Makarov / Danilin | "Ninho recuou. A quinta não." (V1) | identified | 1 | — |
| 031 | Orlov | "A quinta é com apoio. Canal primeiro." (V1) | — | 1 | — |
| 032 | Rudenko (voz, do T-34) | "Rampa não aguenta! Lagarta a rasgar! Saiam da frente!" (V1) | 06:40 | 1 | — |
| 033 | Gusev | "Atolou. O segundo também vai atolar. Não esperem por eles." (V1) | 07:10 | 1 | — |
| 034 | sapador | "Aqueduto à direita. Um de cada vez. Pranchas na água." (V1) | aqueduto | 1 | — |
| 035 | Orlov | "O tanque não passa, mas dispara. Eu vou lá." (V1; se indica) | decisão | 1 | — |
| 036 | Rudenko (voz) | "Vejo fumo. Diz-me a janela." / Orlov: "Estábulo em ruínas, janela esquerda, piso térreo." (V1) | T-34 | 1 | — |
| 037 | Gusev | "Um. Dois. Não três. A mesma ponte é a mesma vala." (V1) | fila | 1 | — |
| 038 | Bychkov | "Eu primeiro." (V1) | fila | 2 | — |
| 039 | Aliyev | "…anca. Kravets. **Kravets.**" (V1) | 07:50 | 0 | — |
| 040 | Kravets | "Aqui. Não te mexas. Orlov: do outro lado, na vala. Já." (V1) | 039 | 1 | — |
| 041 | Gusev | "Secção do outro lado. Menos um na vala. Contem." (V1) | passage | 1 | — |
| 042 | alemão (alemão) | "Nicht… nicht… bitte…" | vala | 1 | — |
| 043 | Bychkov | "Os teus mataram o meu irmão em Bobruisk." (V1) | +2 s | 1 | — |
| 044 | Orlov | "Segurança primeiro. Depois a Kravets vê-o. **Depois** dos nossos." (V1) | 043 | 0 | — |
| 045 | Orlov | (mão no antebraço de Bychkov; sem fala) | interação | — | — |
| 046 | Gusev | "Largou a arma. Baixa a tua." (PR #44; se ninguém em 5 s) | — | 0 | — |
| 047 | Bychkov | "O que fez não desaparece." (PR #44) | baixa | 1 | — |
| 048 | alemão (alemão) | "Peter… Peter…" | — | 2 | — |
| 049 | Kravets | "Torniquete. O terceiro hoje. Fica aí até virem buscar-te." (V1) | tratamento | 1 | — |
| 050 | Orlov | "Serov. Anda cá. Olha o mapa. Nós estamos aqui." (V1) | Serov | 1 | — |
| 051 | Kravets | "Fora da via! Fora! O tanque não vos vê!" (V1) | estrada | 0 | — |
| 052 | condutor (voz) | "Saiam! **Saiam!**" (buzina) (V1) | T-34 recua | 0 | — |
| 053 | Orlov | "Vocês dois. Para a vala. Agora." (V1; interação) | homens na via | 1 | — |
| 054 | Makarov / Danilin | "Batalhão responde. Esquerda parada no canal. Direita avançou quatrocentos e parou. Reorganizar antes de subir." (V1) | rádio | 1 | — |
| 055 | Bychkov | (pega na maca; sem fala) | maca | — | — |
| 056 | condutor da ambulância | "Não passo a coluna. Tragam-no até aqui." (V1) | ambulância | 1 | — |
| 057 | Kravets | "Vai. A anca aguenta até ao hospital. Hoje não morre ninguém meu." (V1) | Aliyev dentro | 1 | — |
| 058 | oficial (voz) | "Quinta é o objetivo. As alturas são amanhã. Ninguém sobe." (V1) | 10:30 | 1 | — |
| 059 | Gusev | "Pomar. Devagar. A estrada tem os oitenta e oito em cima." (V1) | aproximação | 1 | — |
| 060 | Orlov | "Tanque! Estábulo, janela direita!" (V1; se o T-34 chegou) | 12:30 | 1 | — |
| 061 | Bychkov | "Eu pela esquerda com a DP." (V1; se não) | — | 1 | — |
| 062 | Gusev | "Dois a render-se. Ao muro. Eu trato." (V1) | interiores | 1 | — |
| 063 | Orlov | "Serov. Direita, a pé. Diz-lhes que a quinta é nossa e pergunta onde é o flanco deles." (V1) | ligação | 1 | — |
| 064 | Serov | "Fui e voltei. Flanco deles no pomar grande. O nosso é este." (V1) | regresso | 1 | — |
| 065 | Makarov / Danilin | "Contra-ataque! Pomar! Um blindado ao longe, não entra!" (V1) | 13:40 | 0 | — |
| 066 | Gusev | "Aguentar o muro. Não persigam. A direita bate-lhes o flanco." (V1) | — | 1 | — |
| 067 | oficial (voz) | "Quinta consolidada. Mantenham. Amanhã às cinco." (V1) | consolidated | 1 | — |
| 068 | Serov | "Chegámos?" (V1) | outro | 1 | — |
| 069 | Orlov | (003) | 068 | 1 | — |
| 070 | Gusev | "Amanhã, a encosta. Hoje, o muro." (V1) | +4 s | 1 | — |

Callouts: `co_m27_barrage`, `co_m27_searchlights`, `co_m27_mortar_whistle`, `co_m27_mg_farm_pause`, `co_m27_tank_reversing`, `co_m27_88_road`, `co_m27_counterattack`. Silêncios: o zumbido (3 s); antes de Bychkov (2 s); a via dos veículos (4 s no fim).

---

## 7. Arte e atmosfera

**Paleta:** preto-azulado da madrugada, branco cegante dos holofotes na poeira, castanho de lama e de água de vala, cinzento de fumo, verde-caqui de gimnastyorka M43 com dragonas, verde-escuro de T-34, tijolo das quintas do Oderbruch, verde pálido dos pomares em abril, a linha escura das encostas. **Luz:** 02:40 noite com brilho de incêndios; 03:00 clarões por eixos; 03:30 holofotes (luz direcional branca com sombras longas; cegueira ao olhar para trás); 05:30 amanhecer cinzento com poeira; 10:00 cinzento; 14:00 sol fraco. **Materiais:** lama que puxa, água de canal, tijolo, madeira de estábulo, aço de T-34, pranchas, lona de maca. **Silhuetas:** rampas de Katyusha, holofotes em linha, o T-34 atravessado na rampa, a ponte destruída, a quinta com muro, a estrada que sobe para as encostas. **Destruição:** persistente (crateras da barragem, trincheiras batidas, a ponte, o T-34 atolado, o estábulo). **Humanos:** Orlov de 1945 (M43, SSh-40, starshina; cicatriz na perna coberta), Makarov/Danilin com rádio, Gusev, Bychkov com DP, Serov de 17, Kravets com bolsa e braçadeira; o alemão jovem de paraquedista sem capacete. **Violência reduzida:** Aliyev coberto; o alemão com as pernas cobertas após o torniquete.

**Imagem única:** o panorama da barragem por vários eixos; depois, a ambulância a tentar atravessar a estrada (ART §4, RECONSTRUCTED).

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| trincheiras | lama, respiração, o mapa a desdobrar, o copo (variante) | motores desligados | — | antes das 03:00 |
| 03:00 | **barragem massiva por eixos** (Katyusha, 152 mm: cada eixo com a sua assinatura) | — | — | — |
| holofotes | **zumbido elétrico**, vento no Oderbruch, vozes abafadas | formações vizinhas | morteiros | **o zumbido** (3 s) |
| primeira linha | MG abafada pela poeira, rajadas curtas | a direita avança | artilharia | **depois das rajadas** |
| canal | T-34 a rodar na lama, lagarta a rasgar, canhão (se), água do aqueduto | sapadores | Panzerfaust contra blindados | — |
| vala | a voz do alemão, lama, o torniquete | — | morteiros | **antes de Bychkov** |
| estrada | **ambulância** (motor, buzina), coluna, rádio com setores | T-34 a recuar | 88 mm | — |
| quinta | 88 mm das encostas, DP, interiores, o T-34 (se) | contra-ataque; a direita | — | depois das rajadas |
| fim | a coluna devagar, Kravets | ambulância | encostas com fumo | **relativo** (4 s) |

Sons novos: barragem soviética por eixos (Katyusha, 152 mm), holofotes (zumbido), lama do Oderbruch, T-34 atolado, ambulância GAZ. Música: motivo VI "A água, outra vez" — uma frase na cartela final (começa aqui; M28–M30 desenvolvem). VO russo; alemão.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| Barragem às 03:00 de 16/4 (hora de Moscovo); 143 (ou 120) holofotes acesos depois; poeira e fumo cegam os atacantes | D (resumo) | H27; S-C24 | **P-C27** (fuso/equivalência local) |
| Oderbruch: solo encharcado, canais e valas; blindados presos; o 8.º Ex. Guardas frente ao setor mais forte | D (resumo) | S-C24 | canal/vala exatos (P-C27) |
| Sem rutura a 16/4; Seelow 17/4; alturas 17–18/4; rutura 19/4 | D | S-C24 | — |
| 27.ª Divisão de Guardas no setor; secção de Orlov | R | CONTINUITY §3.4 | **P-C27** |
| 62.º Exército → 8.º Exército de Guardas (abril 1943) | D | CONTINUITY §3.4 | — |
| 9.ª Divisão de Paraquedistas alemã no setor de Seelow | R | — | confirmar |
| Makarov/Danilin por `m07.makarov_status`; Saveliev ausente; o copo por `m07.saveliev_status` | regra | CONTINUITY | — |
| Gusev, Bychkov, Serov, Kravets, Aliyev, Rudenko, "Peter" | F | — | acrescentar Aliyev/Rudenko a CONTINUITY §4 |
| Equipamento: PPSh-41, Mosin, DP-27, T-34-85, SU-76, Katyusha, 152 mm, GAZ ambulância; alemão: MG 42, Panzerfaust, 88 mm, StuG | D | TIMELINE §3 | auditoria |

**Proibições:** vitória total a 16/4; Orlov nas alturas; Zhukov/Chuikov em cena; Saveliev em 1945; Stalingrado ligado a Antonov/Gromov; ondas suicidas; tanques a atravessar o canal por roteiro; execução; nomear a unidade blindada sem pesquisa. **Fora de cena:** Zhukov; Chuikov.

---

## 10. Handoff técnico

**Contrato:** `id m27_seelow`, `order 27`, relógio 02:40→16:00 (hora de Moscovo) com `readyScale` em quatro fases, `cast` condicional (`makarov_or_danilin`), grupos (`grp_section`, `grp_formation_left/right`, `grp_batteries_far`, `grp_searchlights`, `grp_tanks_canal`, `grp_sappers`, `grp_column_road`, `grp_ambulance`, `grp_de_first_line_mg`, `grp_de_nest`, `grp_de_farm_ruin_mg`, `grp_de_snipers`, `grp_de_farm_garrison`, `grp_de_counterattack`, `grp_de_stug_far`, `grp_de_88_far`, `grp_pow`), setores s1–s7, checkpoints A–E, cutscenes (intro, outro com variantes), falas, flags, debrief datado.

**Flags:** `m27.completed`, `m27.makarov_present` (derivada de `m07.makarov_status`), `m27.cup_present` (derivada de `m07.saveliev_status = unhurt`), `m27.contact_kept` (0–4), `m27.positions_identified`, `m27.passage_opened ∈ {tank_assisted, infantry_only}`, `m27.aliyev_wounded` (fixo), `m27.bychkov_deescalated`, `m27.player_intervened`, `m27.player_fired_on_pow`, `m27.serov_map_shown`, `m27.pow_cared` (fixo), `m27.aliyev_evacuated` (fixo), `m27.player_carried`, `m27.link_restored`, `m27.tank_arrived`, `m27.objective_consolidated`.

**Sistemas:** [C] barragem como panorama por eixos (NPC; formações visíveis sob partículas — nunca partículas genéricas que escondam a operação), holofotes como luz direcional com cegueira temporária sem dano, lama/água de canal como modificadores, blindados NPC com estado "atolado" e paragem por presença na via, `SURRENDERED`/DOWN (M07/M19); [A] fogo como dados, `safeImpact`, supressão por janelas, maca a dois, interiores (M10), posicionar, rotação, "contagem por voz" (`line()` FIFO); [B] identificar posições (observação), indicar ao T-34, "fora da via"; [D] leitura de `m07.*`. **Fallbacks honestos:** sem holofotes dinâmicos → luz fixa + véu de poeira; sem blindados NPC → som + T-34 estático atravessado; sem `SURRENDERED` → cena encenada (Gusev segura; o jogador só põe a mão por interação).

**Disciplinas:** Level: trincheiras de partida com panorama (eixos a 300–800 m), planície de 600 m com valas, primeira linha (300 m), canal com ponte destruída/aqueduto/rampas, estrada com coluna, quinta com pomar e a estrada que sobe (nunca jogável acima); Combate/IA: posições que resistiram vs fumo, MG por janelas, guarnição com rendição, contra-ataque com flanco amigo; Arte: Oderbruch (lama, tijolo, pomares), holofotes na poeira, T-34 atolado, ambulância; Personagens: Orlov 1945 e Makarov/Danilin (variantes), Gusev, Bychkov, Serov, Kravets, paraquedista alemão jovem; Animação: desdobrar o mapa (a dobra), polegar no bordo (copo/mapa), contagem por voz, bater na torre do T-34, fila no aqueduto, mão no antebraço, torniquete, tirar homens da via, maca; Som: barragem por eixos, holofotes, lama, T-34, ambulância; VO: russo/alemão; Historiador: P-C27 (fuso, divisão, canal, unidade blindada, 9.ª Para); QA: Makarov e Danilin nunca juntos; o copo só com `m07.saveliev_status = unhurt`; Aliyev vivo em todos os ramos; o alemão nunca reage; blindados nunca atropelam; `bychkov_deescalated` persiste para M28; a quinta nunca dá acesso jogável às alturas.

**Testes:** barragem e holofotes nunca causam dano; `contact_kept < 2` → dispersão com custo de tempo, nunca perdas; MG da quinta em ruínas não dispara sem linha de visão; T-34 atolado permanece atravessado após CP-C/D/E; `passage_opened = tank_assisted` só se o jogador indicou; `aliyev_evacuated` true em todos os ramos; fala 003 omitida se `player_fired_on_pow`; `m07.makarov_status ∈ {unhurt, recovered}` → Makarov presente e fala 001/013 com texto de Makarov, senão Danilin.

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| 03:00; o mapa dobrado; o copo ou não | (intro) | desdobrar | Serov "Pensei…"; Makarov/Danilin | holofotes acendem | start | `makarov_present`; `cup_present` |
| Manter contacto | `obj_m27_advance_contact` | avançar por valas; contagem por voz; não olhar para trás | Gusev chama; Serov cego | poeira; valas | "Avançar." | CP-A; `contact_kept` |
| A primeira linha ainda responde | `obj_m27_first_cover` / `identify` | troços; observar 3; suprimir | Makarov/Danilin 001; Gusev 002; a direita avança | ninho recuou | A | CP-B; `positions_identified` |
| O canal; os blindados atolam | `obj_m27_open_passage` | correr ao T-34; indicar; fila no aqueduto | Rudenko; sapadores; Gusev conta; Aliyev cai (fixo) | T-34 atravessado; pranchas | B | CP-C; `passage_opened`; `aliyev_wounded` |
| O que fez não desaparece | `obj_m27_pow` | mão no antebraço / chamar / calar-se | Bychkov; Gusev; Kravets; Serov ao mapa | torniquete | passage | `bychkov_deescalated`; `serov_map_shown` |
| A via dos veículos; a ligação | `obj_m27_evacuate` / `relink` | maca a dois; fora da via; ouvir | Kravets; condutores; ambulância; rádio | Aliyev na ambulância | pow | CP-D; `aliyev_evacuated`; `link_restored` |
| A quinta | `obj_m27_objective` / `hold` | pomar; indicar (se); interiores; posicionar; ligar; defender | guarnição; rendidos ao muro; contra-ataque; a direita | estábulo; flanco | D | CP-E; `objective_consolidated` |
| A cidade ainda está adiante | (outro) | skip | Kravets na via; Serov pergunta; Gusev | — | consolidated | `m27.completed` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 9 | a escala que não espera; o objetivo local; Serov ao mapa. |
| 2 | Autenticidade | 8 | S-C24 sólido; fuso/divisão/canal P-C27; a 9.ª Para a confirmar. |
| 3 | Personagens | 9 | Orlov veterano por gestos (M07 repetidos); Bychkov com motivo; Gusev nasce aqui para M28. |
| 4 | Diálogos | 9 | "Chega-se a onde se chega." / "Fumo não dispara." / "A mesma ponte é a mesma vala." / "Hoje não morre ninguém meu." |
| 5 | Originalidade | 9 | barragem como panorama; holofotes que cegam o atacante; blindados que não passam; indicar em vez de destruir. |
| 6 | Variedade | 9 | contagem por voz, troços, identificar, correr ao tanque, fila, mão no antebraço, maca, fora da via, rádio, pomar, interiores, ligar, defender. |
| 7 | Set pieces | 9 | 03:00, o canal, a vala — nenhum é "matar X". |
| 8 | Atmosfera | 9 | holofotes na poeira; a lama; a estrada que sobe sempre no enquadramento. |
| 9 | Environmental storytelling | 8 | cavalo morto, T-34 atravessado, o terceiro torniquete, a dobra. |
| 10 | Cinematográfica | 9 | o panorama por eixos; a ambulância; o mapa com Serov. |
| 11 | Sonora | 10 | barragem por eixos, zumbido, holofotes, silêncio depois das rajadas, ambulância. |
| 12 | Impacto emocional | 8 | "Chegámos?" |
| 13 | Ritmo | 8 | 24–31 min; quatro `readyScale`. |
| 14 | Continuidade | 10 | lê `m07.*` (Makarov/Danilin, copo), nasce `m27.bychkov_deescalated` para M28; a dobra de M26; Stalingrado fora de cena. |
| 15 | Integração técnica | 5 | panorama, holofotes, blindados NPC que atolam e lama são [C]; fallbacks definidos. |

**Correções aplicadas:** (1) a designação de Orlov (62.º → 8.º de Guardas; 27.ª DG) foi explicitada em cartela, como exige §79; (2) o copo de Saveliev só existe com `m07.saveliev_status = unhurt` e com registo ficcional de entrega em 1941 — nunca Saveliev em 1945; (3) os blindados atolam por estado e o apoio é "indicar", não "destruir"; (4) o acesso que falha reorganiza-se (sem ondas); (5) a fala 002 foi atribuída a Gusev como substituto explícito de Saveliev (§79 "Saveliev/substituto"); (6) Aliyev é fixo e vive; o alemão nunca reage; disparar sobre ele omite 003 sem terminar a missão; (7) a hora da missão usa a hora de Moscovo com pendência declarada (P-C27); (8) Aliyev e Rudenko são propostas deste dossiê a acrescentar a CONTINUITY §4.
