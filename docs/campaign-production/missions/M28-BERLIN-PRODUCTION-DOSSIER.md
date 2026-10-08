# M28 — ÚLTIMOS QUARTEIRÕES · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** 1–2/5/1945, setor central de Berlim; 8.º Exército de Guardas; POV Mikhail Orlov; fonte H27; 22–29 min; três falas; checkpoints "reconhecimento; ligação; evacuação; consolidação; início do cessar-fogo — persistir rendição e não reativar combatentes ao carregar"; "não atribuir ao 8.º Exército a tomada do Reichstag"; abrir saída para civis e feridos "sem invadir todo abrigo como se fosse posição inimiga"; "marcas de perseguição podem aparecer com contexto pesquisado, sem atrocidade pessoal inventada"; 2/5: confirmar a ordem de cessar-fogo, baixar a arma, acompanhar rendição local; "não exigir matar homens que já deixaram o combate nem criar um encontro com Hitler como chefe final"; o cessar-fogo é mudança coordenada por setores, sem mute; final: inimigo ferido supervisionado, morador que sai devagar, Orlov escuta a cidade. **Proposto:** o quarteirão do 8.º Exército de Guardas a sul do Tiergarten/canal Landwehr (S-C23 — P-C28), "A porta aberta" (PR #44 §5: Bychkov ergue o fuzil / Gusev segura-lhe o braço; Orlov ordena → `m28.pow_secured`, `m28.comrade_deescalated`), armas baixadas por setor como contagem, a porta da oficina como objeto, o cessar-fogo como silêncio (sons a recuar, nunca mute), Frau Lehmann e os vizinhos do abrigo ("Posso sair?"), Makarov/Danilin e o copo por `m07.*`, Bychkov de-escalado em M27 baixa a arma antes da ordem. **Sistemas:** [C] cessar-fogo por setores (estado coordenado da simulação: inimigos que continuam vs inimigos que largam as armas), `SURRENDERED` persistente após reload, civis em abrigo com estados; [A] interiores/vertical (M10); [D] leitura de `m07.*`, `m27.*`.

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m28_berlin` / 28 |
| Datas | Ato I 1945-05-01T09:00 → 19:00 · Ato II 1945-05-02T05:30 → 11:00 (**hora de Moscovo** nos registos soviéticos; a hora local alemã do cessar-fogo é pendência P-C28; a cartela mostra a hora de Moscovo com nota) |
| Local | um quarteirão a sul do Tiergarten, junto do canal Landwehr (ruas de prédios de rendimento de cinco pisos com pátios interiores — Hinterhöfe —, uma oficina mecânica com portão para o pátio, um abrigo público numa cave com placa "Luftschutzraum", uma rua com elétrico tombado, a ponte do canal batida) — `RECONSTRUCTED` com classificação explícita (P-C28: quarteirão exato; ruas selecionadas após confirmação cartográfica) |
| Operação | últimos dias: QG de Chuikov em Schulenburgring 2 (Tempelhof) de 27/4 a 4/5; Krebs em Schulenburgring a 1/5 (03:30–04:00); a coluna de Weidling em Bendlerstrasse/canal Landwehr às 05:55 de 2/5; capitulação da guarnição assinada de manhã; o 8.º Exército de Guardas no Tiergarten/canal; o Reichstag tomado por **outras** formações (3.º Exército de Choque) a 30/4–2/5 (S-C23 — DOCUMENTED em resumo) |
| Unidade | 8.º Exército de Guardas (canónico) → 27.ª Divisão de Guardas (R) → secção de Orlov |
| Elenco | starshina Mikhail Orlov (POV), Makarov **ou** Danilin (rádio; por `m07.makarov_status`), sgt. Pavel Gusev, yefreitor Anatoly Bychkov, krasnoarmeyets Nikolai "Kolya" Serov, sanitarka Lidia Kravets, krasnoarmeyets Grigory Petrenko (ferido de 1/5 — proposta), um comandante de companhia por voz, o alemão da oficina (soldado da Wehrmacht de meia-idade, sem nome: diz "Feldwebel"), um alemão ferido no abrigo (Volkssturm idoso), Frau Lehmann e os vizinhos do abrigo (duas famílias; uma criança; um homem com braçadeira branca), um estafeta de outro grupo (propostas) |
| Fora de cena | gen. Helmuth Weidling; gen. Hans Krebs; Chuikov; Hitler (só por notícia fragmentada: "dizem que morreu"); o Reichstag (só por relato: "os do 3.º de Choque") |
| Intocável | datas, local, unidade, POV, falas `dlg_m28_001–003`, os cinco checkpoints (rendição persistente; combatentes não reativados ao carregar), sem Reichstag, sem Hitler, sem atrocidade pessoal inventada, cessar-fogo por setores sem mute, inimigo ferido supervisionado, morador que sai devagar, "a guerra no Pacífico continua" |

---

## 1. Story Bible

**Logline.** Num quarteirão de prédios de cinco pisos onde as caves têm gente e os telhados têm atiradores, Mikhail Orlov passa o primeiro dia de maio a ligar grupos por pátios interiores, a tomar um prédio escada a escada e a abrir uma saída para civis sem tratar cada porta como posição. Na madrugada de 2 a ordem chega aos pedaços pelo rádio e tem de ser confirmada. Os disparos recuam por setores. Um Feldwebel sai da oficina com as mãos à vista; Bychkov ergue o fuzil; Gusev segura-lhe o braço; Orlov baixa a arma. Uma mulher pergunta se pode sair. Orlov escuta a cidade sem a barragem de sempre. Não restaura nada.

**As oito respostas.**
1. **Situação central:** a rendição de um homem e a porta aberta — o grande gesto final é não disparar (PR #44).
2. **Modo de contar:** armas baixadas por setor — o cessar-fogo conta-se por onde os tiros pararam, não por mortos.
3. **Objeto:** a porta da oficina (de ferro, com um postigo; fechada em 1/5; aberta por dentro em 2/5).
4. **Silêncio:** o cessar-fogo — sons a recuar por setores; depois metal a cair, passos, choro, uma voz civil clara; **nunca mute**.
5. **Tarefa que não é matar:** reconhecer; ligar grupos por pátios; abrir saída a civis e feridos; confirmar a ordem; baixar a arma; supervisionar um ferido; abrir passagem; escutar.
6. **Custo humano:** "A porta aberta" (PR #44 §5): às 06:40 de 2/5, com o cessar-fogo confirmado no setor, a porta da oficina abre-se por dentro e um Feldwebel de meia-idade sai com as mãos à vista (causa: a ordem de Weidling chegou também a ele pelo altifalante) → Bychkov ergue o fuzil ("Ontem ele disparava daqui.") / Gusev segura-lhe o braço ("Largou a arma. Baixa a tua." — o gesto de M27) / Orlov: "Abaixe a arma. Vamos abrir passagem." (003) → decisão de **forma**: aproximar-se e ordenar (o jogador fala primeiro: `m28.player_intervened = ordered`) ou cobrir enquanto Gusev intervém (`covered`) — **ambas mantêm o prisioneiro vivo**; muda quem fala e a confiança de Bychkov (`m28.comrade_deescalated` só se Bychkov baixa após o jogador/Gusev sem a repetição de Orlov); se `m27.bychkov_deescalated = true`, Bychkov baixa o fuzil **antes** da ordem de Orlov ("Eu sei. Já sei."); o Feldwebel é revistado e sentado junto do muro (`m28.pow_secured`); disparar sobre ele: `m28.player_fired_on_pow`, silêncio da secção até ao fim, 003 omitida, debrief; nunca termina a missão.
7. **Pessoas históricas:** Weidling, Krebs e Chuikov fora de cena (a ordem é "do comando; assinada esta manhã"); Hitler só por notícia fragmentada e não confirmada em cena; o Reichstag por relato atribuído a outros.
8. **Debrief:** regista Krebs a 1/5, a coluna de Weidling às 05:55 de 2/5, a capitulação assinada de manhã, o Reichstag tomado pelo 3.º Exército de Choque (não pelo 8.º de Guardas), a morte de Hitler a 30/4 (confirmada depois), o contexto de perseguição **com fonte** (o quarteirão teve uma sinagoga/empresas "arianizadas"/deportações — P-C28: mencionar só o que a cartografia confirmar), Petrenko evacuado, o Feldwebel entregue, Frau Lehmann e os vizinhos saídos; "o fim da batalha não restaura casas, confiança e pessoas; a guerra no Pacífico continua".

**Três motivos.** (a) *Pátios* — a cidade liga-se por dentro (Hinterhöfe), não pela rua; (b) *confirmar* — "Confirmem a ordem. Não retomem o fogo." (002): o cessar-fogo é uma mudança de estado coordenada, não um botão; (c) *abrir passagem* — "Abaixe a arma. Vamos abrir passagem." (003): o verbo final é abrir, não limpar.

**Temas.** Parar de disparar como ato; civis no meio de uma cidade que foi inimiga; a rendição de um homem como pessoa; o que não se restaura; a Europa em silêncio enquanto o Pacífico continua.

**Estrutura (§54).** CONTEXTO (cartela: 1/5; Seelow há 15 dias; a cidade) → INTRO (abrigo civil: Frau Lehmann; o jogador não pode tratar toda a figura como inimigo) → APROXIMAÇÃO (reconhecer um acesso; pátios) → DIÁLOGO (Gusev; o estafeta: "os do 3.º de Choque no Reichstag") → PRIMEIRO CONTATO (ligar com outro grupo por interiores) → ESCALADA (defesa local no prédio: pavimentos, escadas) → COMBATE PRINCIPAL (o prédio escada a escada; Petrenko ferido) → SET-PIECE (abrir saída para civis e feridos; o posto de atendimento) → PAUSA (consolidar; notícias fragmentadas; a noite) → CLÍMAX (2/5: a ordem aos pedaços; confirmar; os setores a recuar; a porta aberta) → CONSEQUÊNCIA (o ferido supervisionado; "Posso sair?"; a cidade sem barragem) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Orlov | reconhece a desorientação dos recrutas (Serov); baixa a arma a tempo | Gusev; Serov; Frau Lehmann | a porta; a ordem | distingue inimigo que combate de inimigo que largou; escuta a cidade | baixa a arma; "Abaixe a arma. Vamos abrir passagem." |
| Makarov / Danilin | "Confirmem a ordem. Não retomem o fogo." (002, pela rádio) | Orlov | a ordem aos pedaços | — | vivo |
| Gusev | segura o braço (M27) | Bychkov | a porta | — | vivo |
| Bychkov | o irmão; "ontem ele disparava daqui" | Gusev; Orlov | o Feldwebel | baixa antes (se M27) ou depois; não se converte | `comrade_deescalated` |
| Serov | 17; conta armas baixadas por setor | Orlov | o abrigo | — | vivo |
| Kravets | o posto de atendimento muda de aspeto quando o fogo diminui | feridos de ambos os lados (depois dos nossos) | — | — | vivo |
| Petrenko | ferido no prédio (fixo, 1/5) | Kravets | — | — | evacuado |
| Frau Lehmann | "Posso sair?" (001) | ninguém | a saída | — | sai devagar |
| o Feldwebel | a porta | — | rendição | — | entregue |

**O que a missão recusa.** O Reichstag; Hitler como chefe final; um bunker; "limpar" o abrigo; atrocidade pessoal encenada; mute instantâneo; inimigos que reaparecem armados após reload; um último inimigo para justificar tiros; a Europa como fim da guerra.

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "Luftschutzraum" (`cs_m28_intro`, ≤ 80 s)
2 1/5 09:00 (hora de Moscovo) · 3 uma cave de abrigo público: bancos, malas, candeeiros a petróleo, uma placa "Luftschutzraum"; duas famílias; um homem com braçadeira branca; Frau Lehmann (50 anos) à frente; a escada para o pátio; lá fora, a cidade: fachadas abertas, um elétrico tombado, fumo; artilharia ao longe (ainda) · 4 manhã de maio com fumo; luz de poeira pela escada (R) · 5 Orlov, Makarov/Danilin, Gusev, Bychkov, Serov, Kravets, Petrenko; os civis · 6 Cartela: BERLIM — A SUL DO TIERGARTEN — 1 DE MAIO DE 1945 — 09:00 (HORA DE MOSCOVO) · 27.ª DIVISÃO DE GUARDAS · 8.º EXÉRCITO DE GUARDAS. Cartela 2 (`lineVariants`): "Yuri Makarov, rádio." / "Lev Danilin, rádio." A secção desce ao abrigo para verificar: Serov entra com a arma apontada a tudo; Orlov baixa-lhe o cano com a mão ("Pessoas. Com malas."). Frau Lehmann levanta-se devagar e pergunta: "Posso sair?" (001; em alemão, com a tradução só na legenda; a pergunta repete-se em 2/5). Orlov: "Ainda não." (Gusev traduz o gesto: a mão aberta, "ficar"). Kravets olha para um idoso com a perna enfaixada (Volkssturm sem braçadeira: "é dos deles" — Bychkov; Kravets: "É um velho com uma perna. Depois dos nossos."). Serov: "Pensei que eram soldados." Orlov: "Eu também pensei, em 41, de um alemão a tremer." (uma frase; sem monólogo) · 7 "abrir com um edifício ocupado por civis onde o jogador não pode tratar toda a figura em movimento como inimigo" (PR #44) · 8 olhar; baixar o cano de Serov (interação) · 9 — · 10 — · 11 artilharia ao longe · 12 malas, candeeiros, a placa, a braçadeira branca · 13 `dlg_m28_001` (canónica; primeira ocorrência), `010–017` · 14 a cave (respiração, candeeiro, criança); artilharia abafada; **nenhum tiro no abrigo** · 15 plano fixo nos bancos; a mão de Orlov no cano de Serov · 16 `missionStart` · 17 Gusev: "Acesso." · 18 `m28.makarov_present`, `m28.cup_present` (derivadas) · 19 [C] civis em abrigo com estados (ficam → saem em 2/5); [D] lê `m07.*`, `m27.*` · 20 Frau Lehmann → cena 8

### Cena 2 — "Pátios" (jogável; `obj_m28_recon`, `obj_m28_link`)
2 1/5 09:15–11:00 (escala acelerada; `readyScale`) · 3 o pátio do abrigo → passagens entre pátios (portões, arcos, uma parede aberta por obus) → um segundo pátio com a oficina (portão de ferro fechado; postigo) → um terceiro pátio onde está outro grupo soviético (a secção vizinha); as ruas entre os prédios são batidas por uma MG de um telhado e por um Panzerfaust ocasional contra blindados NPC (nunca contra o jogador a < 30 m) · 4 manhã com fumo; pátios em sombra; a rua ao sol · 5 secção; a secção vizinha (proxies, 8); alemães: atirador no telhado do prédio da esquina, MG na rua (dados), defensores no prédio-alvo (cena 3); civis fechados · 6 Reconhecer um acesso e restabelecer ligação com outro grupo por pátios e interiores reconstruídos "com classificação explícita" (cartela pequena: "RECONSTRUÇÃO: quarteirão tipo, confirmado por cartografia — P-C28"): a rua é dos atiradores; os pátios ligam-se por dentro; o jogador escolhe as passagens (portão; arco; parede aberta: a parede aberta é vista do telhado — exposição 3 s; o arco é coberto mas tem uma porta de cave com civis: **não** entrar como posição — Gusev: "Cave é gente. Pátio é passagem."); o estafeta do outro grupo traz notícias fragmentadas ("Dizem que os do 3.º de Choque estão no Reichstag. Dizem que ele morreu. Dizem." — nada confirmado); ligação feita por voz e por Makarov/Danilin · 7 §79 ponto 1 · 8 navega pátios; escolhe passagens; evita caves; liga · 9 parede aberta (rápida; vista) vs arco (coberto; passa junto de uma cave) · 10 Gusev guia; Serov conta portas; Bychkov quer a rua; Kravets atrás com Petrenko · 11 atirador (dados; só sobre a parede aberta e a rua); MG na rua · 12 portões, arcos, roupa estendida há dias, bicicletas, cartazes do NSDAP rasgados, um aviso de deportação meio arrancado numa parede (sem encenação; o debrief dá o contexto com fonte — P-C28) · 13 `dlg_m28_018–025` · 14 reverberação de fachadas (AUDIO), tiros na rua, passos em pátio · 15 livre; cartela de classificação (3 s) · 16 "Acesso." · 17 ligação com o grupo vizinho (`evt_m28_linked`) · 18 `cp_m28_a_reconhecimento`; `cp_m28_b_ligacao` (ambos aqui: A ao primeiro pátio, B à ligação) · 19 [A] interiores/pátios (M10); [B] "classificação explícita" como cartela · 20 a oficina (portão fechado) → cena 7

### Cena 3 — "O prédio" (jogável; `obj_m28_local_defense`)
2 1/5 11:00–14:00 (escala acelerada) · 3 o prédio-alvo: cinco pisos; escada principal e escada de serviço; apartamentos abertos; um patamar com barricada de móveis; o sótão com a MG do telhado; a cave com civis (**não** é objetivo); o pátio de trás · 4 interiores com luz de janelas partidas; poeira · 5 secção; a secção vizinha a entrar pelo outro lado; alemães: 8–10 defensores (Wehrmacht + Volkssturm + um Hitlerjugend de 15 anos que foge e **não** é alvo obrigatório — recua pela escada de serviço) em três pisos; a MG no sótão · 6 Enfrentar uma defesa local em rua/prédio usando pavimentos, escadas e cobertura funcionais: subir pela escada de serviço (coberta; estreita) ou pela principal (vista do patamar); limpar o patamar da barricada (granada; os defensores recuam para cima); o segundo piso tem um apartamento com uma família na casa de banho (porta fechada; vozes: não é posição — abrir a porta com a arma baixa ou passar: `m28.apartment_family_safe`); o sótão: a MG rende-se quando a vizinha chega pelo outro lado (dados; dois homens de mãos erguidas no sótão: Gusev trata, sem repetir a cena 7); **Petrenko é ferido no terceiro piso** (fixo às 12:30: estilhaço de granada no ombro); o rapaz da HJ foge e ninguém o persegue (Gusev: "Deixa-o. Tem quinze anos.") · 7 §79 ponto 2 · 8 sobe; escolhe escada; granada no patamar; porta com arma baixa; cobre a vizinha; não persegue · 9 escada de serviço (estreita; coberta) vs principal (rápida; vista) · 10 Gusev; Bychkov na frente; Serov cobre a escada; Makarov/Danilin liga com a vizinha; Kravets trata Petrenko no segundo piso · 11 defensores (dados; recuam para cima); MG do sótão (só sobre o pátio e a rua) · 12 barricada de móveis, apartamentos com mesas postas, a casa de banho, o sótão · 13 `dlg_m28_026–035` · 14 escadas, granada abafada, vidros, a família atrás da porta, a MG por cima · 15 livre; verticalidade · 16 CP-B · 17 sótão rendido (`evt_m28_building`) · 18 `m28.petrenko_wounded = true` (fixo); `m28.apartment_family_safe`; `m28.hj_boy_spared = true` (fixo: ninguém o alveja; se o jogador disparar sobre ele, falha — a bala vai à parede: evento fixo; `m28.fired_at_boy` no debrief) · 19 [A] interiores verticais (M10); [C] `SURRENDERED` no sótão · 20 —

### Cena 4 — "Saída para civis" (jogável; `obj_m28_evacuate_civilians`, `obj_m28_evacuate_wounded`) — **set piece**
2 1/5 14:00–16:30 (escala acelerada) · 3 do prédio ao abrigo da cena 1 pelos pátios; a saída para a retaguarda: um arco para uma rua já segura (a vizinha controla) → o posto de atendimento de Kravets no pátio do abrigo (um toldo, duas macas, água); civis: as duas famílias, o homem da braçadeira, o idoso ferido, Frau Lehmann · 4 tarde com fumo · 5 secção; civis; a vizinha; alemães: fogo esparso do prédio seguinte (atirador que bate o arco por janelas) · 6 Abrir uma saída para civis e feridos "sem invadir todo abrigo como se fosse posição inimiga": o jogador abre o percurso (verificar o arco: o atirador bate-o por janelas de 10 s; cobrir com Bychkov e Serov; marcar com um pano); Gusev entra no abrigo **com a arma baixa** e fala com Frau Lehmann por gestos e três palavras de alemão ("Raus. Langsam. Sicher."); os civis saem pelo arco em grupos de quatro no intervalo (o jogador dá o sinal: interação); Petrenko na maca pelo mesmo arco (a dois: Orlov e Bychkov); o idoso ferido alemão sai apoiado (Kravets: depois dos nossos); o posto de atendimento no pátio fica com civis e feridos de ambos os lados; se o jogador entrar no abrigo de arma apontada: as crianças choram, Frau Lehmann senta-se e não sai ("não saem com armas apontadas": a saída atrasa 10 min de relógio; `m28.entered_shelter_armed`) · 7 §79 ponto 3 · 8 verifica; cobre; marca; dá o sinal por grupos; carrega a maca; entra com a arma baixa (ou não) · 9 arma baixa / apontada; carregar / cobrir · 10 Gusev fala; Bychkov cobre sem falar; Serov conta ("quatro, oito, doze"); Kravets recebe · 11 atirador (dados; por janelas) · 12 o arco com pano, o toldo, as malas no pátio · 13 `dlg_m28_036–045` · 14 passos de civis, criança, o atirador por janelas, Kravets · 15 livre; beat fixo no arco com civis a passar (3 s) · 16 building · 17 civis no pátio seguro + Petrenko no posto (`evt_m28_evacuated`) · 18 `cp_m28_c_evacuacao`; `m28.civilians_out` (count); `m28.entered_shelter_armed`; `m28.player_carried` · 19 [C] civis com estados e "não saem com armas apontadas"; [A] maca a dois, supressão por janelas · 20 o posto muda de aspeto em 2/5 (PR #44)

### Cena 5 — "Notícias aos pedaços" (jogável; `obj_m28_consolidate`)
2 1/5 16:30–19:00 (escala acelerada) → noite (cartela) · 3 o prédio e o pátio como posição; a rua para o canal visível de uma janela; a ponte batida; incêndios ao longe · 4 fim de tarde; depois noite com incêndios · 5 secção; a vizinha; o estafeta; alemães: pressão fraca (uma sonda ao anoitecer; dados), tiros esparsos a noite toda (agenda) · 6 Consolidar o quarteirão enquanto unidades vizinhas terminam as suas tarefas e as notícias de rendição chegam de modo fragmentado: posições nas janelas (posicionar), rotação, uma sonda repelida; o rádio traz pedaços: "Krebs esteve no QG esta madrugada" / "negociações" / "o Reichstag é dos do 3.º de Choque" / "ele morreu, dizem" — Makarov/Danilin: "Nada confirmado. Mantemos."; Serov conta os setores onde ainda se dispara (interação: ouvir das janelas e dizer "norte sim, leste sim, oeste não" — a contagem inicia aqui e inverte-se em 2/5); cartela: NOITE DE 1 PARA 2 DE MAIO — tiros esparsos; às 05:55 (hora de Moscovo) a coluna de Weidling apresenta-se em Bendlerstrasse (relato) · 7 §79 ponto 4 · 8 posiciona; roda; ouve; conta setores · 9 janela da rua (vê o canal; exposta) vs janela do pátio (coberta; cega) · 10 Gusev; Bychkov; Serov conta; Makarov/Danilin filtra · 11 sonda (dados); tiros esparsos · 12 as janelas, a ponte batida, incêndios · 13 `dlg_m28_046–052` · 14 setores a disparar (mistura por direção), rádio com pedaços, incêndios · 15 livre · 16 CP-C · 17 noite (`evt_m28_night`) · 18 `cp_m28_d_consolidacao`; `m28.sectors_firing_day1` (3/4) · 19 [A] posicionar, rotação; [B] contagem de setores (estado da mistura sonora) · 20 —

### Cena 6 — "Confirmem a ordem" (jogável; clímax 1; `obj_m28_confirm_ceasefire`)
2 2/5 05:30–06:40 (hora de Moscovo) · 3 as mesmas posições ao amanhecer; a rua; altifalantes alemães ao longe (uma voz em alemão repete uma ordem); o rádio · 4 madrugada cinzenta; fumo a assentar · 5 secção; a vizinha; o estafeta; alemães: **dois estados** — os que continuam a disparar (um atirador no prédio seguinte, por agenda até 06:20) e os que largam as armas (figuras que saem de portas com as mãos à vista, por setor e por agenda) · 6 A ordem de cessar-fogo chega fragmentada e exige confirmação: Makarov/Danilin: "Confirmem a ordem. Não retomem o fogo." (002); o jogador **confirma** (interação: pedir ao rádio a repetição; receber a confirmação da companhia às 06:05) e transmite à secção; a simulação distingue: inimigos que continuam a combater (o atirador: a secção responde só se ele dispara; cessa às 06:20 quando o altifalante chega à rua dele) e os que largam (nunca alvo: a IA aliada não dispara; o jogador que dispara sobre um rendido tem o custo da cena 7); **os setores recuam**: Serov conta de novo — "norte não, leste ainda, oeste não" → "leste não"; metal a cair (armas atiradas ao chão nos pátios), passos, choro, uma voz civil clara; **nunca mute** · 7 §79 ponto 5 ("O cessar-fogo é uma mudança coordenada de estado, com disparos diminuindo por setores, sem um mute artificial instantâneo") · 8 pede confirmação; transmite; não dispara sobre quem largou; responde só a quem dispara (até 06:20) · 9 responder ao atirador (defensivo) vs esperar (ele cessa às 06:20) · 10 Makarov/Danilin confirma; Gusev transmite à vizinha; Bychkov tenso; Serov conta; Kravets prepara o posto (muda de aspeto: mais civis, menos pressa) · 11 atirador (dados; cessa 06:20); rendidos por setor (nunca alvo) · 12 armas no chão dos pátios, lençóis brancos a aparecer em janelas, o altifalante · 13 `dlg_m28_002` (canónica), `053–060` · 14 **setores a diminuir → metal a cair → passos → choro → uma voz civil clara** (AUDIO) · 15 livre; a câmara enquadra a cidade sem cortar controlo (PR #44) · 16 night · 17 confirmação transmitida + último setor calado (`evt_m28_ceasefire`) · 18 `cp_m28_e_cessar_fogo` ("início do cessar-fogo"); `m28.ceasefire_confirmed`; `m28.sectors_firing_day2` (→ 0); `m28.returned_fire_after_order` (se disparou sobre alguém que não disparava) · 19 [C] cessar-fogo por setores (estado coordenado: `enemyState ∈ {fighting, surrendering, surrendered}` por grupo e por agenda; mistura sonora por setor); [A] fogo como dados · 20 —

### Cena 7 — "A porta aberta" (jogável; clímax 2; `obj_m28_door`) — **custo humano**
2 2/5 06:40–06:50 · 3 o pátio da oficina; o portão de ferro com postigo; a secção no pátio; o posto de Kravets ao lado · 4 manhã cinzenta; o primeiro silêncio relativo · 5 Orlov, Gusev, Bychkov, Serov, Kravets, Makarov/Danilin; o Feldwebel · 6 O postigo abre-se; depois a porta, por dentro, devagar: um Feldwebel de meia-idade, sem capacete, com as mãos à vista. **Bychkov ergue o fuzil**: "Ontem ele disparava daqui." (2 s) → se `m27.bychkov_deescalated`: Bychkov baixa **antes** de qualquer ordem ("Eu sei. Já sei.") e Gusev só lhe toca no ombro; senão: Gusev segura-lhe o braço ("Largou a arma. Baixa a tua.") → **decisão de forma**: o jogador aproxima-se e ordena ("Abaixe a arma. Vamos abrir passagem." — 003 — dita pelo jogador primeiro: `player_intervened = ordered`) ou cobre o pátio enquanto Gusev intervém (`covered`; Orlov diz 003 depois); o Feldwebel diz "Feldwebel. Vier Mann drinnen. Keine Waffen." (há quatro dentro, sem armas: Gusev verifica com Serov, armas baixas: quatro homens sentados, uma pistola na mesa que Gusev recolhe); revista; sentados junto do muro; `m28.pow_secured`; `m28.comrade_deescalated` conforme; **disparar**: `player_fired_on_pow`, silêncio da secção, 003 omitida, debrief · 7 PR #44 §5 "A porta aberta"; §79 ("Não exigir matar homens que já deixaram o combate") · 8 aproximar-se e ordenar / cobrir / (disparar: custo); verificar a oficina com arma baixa (opcional: Gusev faz) · 9 ordenar / cobrir · 10 Bychkov; Gusev; Serov; Kravets · 11 nenhum · 12 a porta de ferro aberta, a pistola na mesa, quatro homens sentados · 13 `dlg_m28_003` (canónica), `061–068` · 14 **silêncio relativo**: a porta de ferro, passos, a voz do Feldwebel; ao longe, a cidade sem barragem · 15 livre; beat fixo na porta a abrir (3 s) · 16 ceasefire · 17 prisioneiros sentados (`evt_m28_door`) · 18 `m28.pow_secured`; `m28.player_intervened`; `m28.comrade_deescalated`; `m28.player_fired_on_pow`; `m28.workshop_men` (4) · 19 [C] `SURRENDERED` persistente (**nunca reativa ao carregar** — teste obrigatório); fallback encenado · 20 lido no debrief e em M30? **não** (Orlov sem epílogo de objeto; o copo não volta)

### Cena 8 — "Posso sair?" (`cs_m28_outro`, ≤ 80 s) + debrief
2 2/5 06:50–08:00 → cartela da manhã · 3 o pátio do abrigo: o posto de Kravets mudado (civis sentados, o idoso alemão com a perna tratada, Petrenko à espera da evacuação, um soldado soviético ferido de outra secção, água numa panela); a escada do abrigo; a rua com lençóis às janelas; a cidade a fumegar sem barragem · 4 manhã cinzenta a abrir · 5 Orlov, Gusev, Bychkov, Serov, Kravets, Makarov/Danilin; Frau Lehmann; os vizinhos; o Feldwebel sob guarda de Serov · 6 O idoso alemão ferido recebe supervisão de Kravets (plano médio, 3 s). Frau Lehmann sobe a escada devagar e pergunta de novo: "Posso sair?" (001; segunda ocorrência). Orlov: "Sim." (em russo; o gesto de mão aberta, "ir"). Ela sai devagar; olha a rua; não agradece; os vizinhos atrás. Orlov tira o capacete e escuta a cidade: choro ao longe, passos, metal, um camião; nenhuma barragem. Se `m28.cup_present`: o polegar no bordo do copo; senão no bordo do capacete. Serov: "Acabou?" Gusev: "Aqui." Cartela: a guarnição de Berlim capitulou na manhã de 2/5; o Reichstag foi tomado pelo 3.º Exército de Choque; Hitler morrera a 30/4; a 8/9 de maio a Alemanha capitulou; **a guerra no Pacífico continua** (M29, M30). Cartela 2: contexto de perseguição do quarteirão **com fonte** (texto a preencher após P-C28; nunca encenado). · 7 §79 final ("O fim da batalha não restaura casas, confiança e pessoas") · 8 skip · 9 — · 10 — · 11 — · 12 o posto mudado; a escada; o capacete na mão · 13 `dlg_m28_001` (segunda), `069–072` · 14 **a cidade sem barragem** (choro, passos, metal, camião; nunca silêncio total) · 15 plano fixo na escada; Frau Lehmann a sair; Orlov a escutar · 16 door · 17 `missionEnd` · 18 `m28.completed`; `m28.civilians_out_final` · 19 [A] cutscene com variantes (copo; Makarov/Danilin) · 20 fecha Orlov; M29 abre na chuva de Okinawa

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m28_recon` | Reconheça um acesso pelos pátios; caves não são posições | sim | intro | segundo pátio | — | — | A |
| `obj_m28_link` | Restabeleça ligação com o grupo vizinho | sim | A | `evt_m28_linked` | — | — | B |
| `obj_m28_local_defense` | Tome o prédio escada a escada | sim | B | sótão rendido | — | `petrenko_wounded` (fixo); `apartment_family_safe`; `hj_boy_spared` (fixo) | — |
| `obj_m28_evacuate_civilians` | Abra a saída para os civis do abrigo; arma baixa | sim | building | civis no pátio seguro | — | `civilians_out`; `entered_shelter_armed` | C |
| `obj_m28_evacuate_wounded` | Leve Petrenko ao posto | sim (paralelo) | building | posto | — | `player_carried` | — |
| `obj_m28_consolidate` | Consolide o quarteirão; conte os setores | sim | C | noite | — | `sectors_firing_day1` | D |
| `obj_m28_confirm_ceasefire` | Confirme a ordem; não retome o fogo | sim | 05:30 | último setor calado | — | `ceasefire_confirmed`; `returned_fire_after_order` | E |
| `obj_m28_door` | A porta aberta: baixe a arma; abra passagem | sim (cena) | 06:40 | prisioneiros sentados | — | `pow_secured`; `player_intervened`; `comrade_deescalated`; `player_fired_on_pow` | — |

### 3.2 Setores
`s1_shelter_yard` (perto) · `s2_courtyards` (perto: três pátios, arcos, portões) · `s3_building` (perto, vertical: 5 pisos, duas escadas, sótão) · `s4_exit_arch` (perto) · `s5_street_canal` (médio: a rua, a ponte batida, blindados NPC) · `s6_city_far` (longe: incêndios, baterias, altifalantes, o Reichstag só por relato). Agendas: atirador do telhado (sobre parede aberta/rua); MG da rua; defensores recuam por piso; Petrenko 12:30 (fixo); atirador do arco por janelas de 10 s; sonda ao anoitecer; tiros esparsos noturnos por setor; 2/5: altifalante 05:40; confirmação 06:05; atirador cessa 06:20; rendições por setor 06:00–06:30; a porta 06:40.

### 3.3 Checkpoints
A reconhecimento · B ligação · C evacuação (civis e Petrenko) · D consolidação (noite; setores) · E início do cessar-fogo (ordem confirmada; **rendição persistente**: nenhum combatente rendido reativa ao carregar; o estado `surrendered` por grupo é guardado).

### 3.4 Justiça
Caves e portas fechadas nunca são posições (nenhum inimigo "spawna" de um abrigo); o atirador/MG só batem o que veem; o rapaz da HJ nunca pode ser atingido (bala à parede, fixo); os que largam as armas nunca são alvo da IA aliada; o atirador de 2/5 só é respondido se dispara e cessa por agenda; Petrenko é fixo e vive; o cessar-fogo nunca é mute; nenhum "último inimigo".

---

## 4. Set pieces

### SP-28-1 "Pátios"
Contexto: do abrigo ao grupo vizinho. Preparação: Serov de arma apontada a tudo; a mão de Orlov. Experiência: a rua é dos atiradores; os pátios ligam por dentro; a parede aberta vs o arco com uma cave; as notícias aos pedaços. Companheiros: Gusev "Cave é gente. Pátio é passagem."; Serov conta portas. Ambiente: roupa estendida, cartazes rasgados, o aviso meio arrancado. Evolução: o portão de ferro fechado (a oficina). Clímax: a ligação. Consequências: CP-A/B. Requisitos: [A] interiores (M10). Integração: `obj_m28_recon`, `obj_m28_link`.

### SP-28-2 "Saída para civis"
Contexto: o arco batido por janelas. Preparação: o prédio tomado; Petrenko ferido. Experiência: verificar; cobrir; marcar; Gusev entra com a arma baixa; grupos de quatro no intervalo; a maca; o idoso alemão depois dos nossos; o posto no pátio. Companheiros: Serov conta; Bychkov cobre sem falar; Kravets recebe. Ambiente: o pano no arco; malas. Evolução: civis que não saem com armas apontadas. Clímax: o último grupo. Consequências: CP-C, `civilians_out`. Requisitos: [C] civis com estados. Integração: `obj_m28_evacuate_civilians`, `obj_m28_evacuate_wounded`.

### SP-28-3 "Confirmem a ordem / A porta aberta"
Contexto: a madrugada de 2/5. Preparação: a contagem de setores de 1/5; o altifalante. Experiência: pedir confirmação; transmitir; responder só a quem dispara; os setores a recuar; metal a cair; a porta de ferro que abre por dentro; Bychkov; Gusev; a forma de intervir. Companheiros: Makarov/Danilin confirma; Gusev segura; Serov conta "oeste não". Ambiente: armas no chão; lençóis. Evolução: o atirador cessa às 06:20. Clímax: fala 003. Consequências: CP-E, `pow_secured`, `comrade_deescalated`. Requisitos: [C] cessar-fogo por setores; `SURRENDERED` persistente. Integração: `obj_m28_confirm_ceasefire`, `obj_m28_door`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| abrigo | bancos, malas, candeeiros, placa, braçadeira branca | — | Serov aponta | — | Frau Lehmann; idoso ferido | "Ainda não." |
| pátios | portões, arcos, parede aberta, roupa estendida, cartazes rasgados, aviso meio arrancado | ligar | a rua | atirador; MG | estafeta | ligação |
| prédio | barricada de móveis, mesas postas, casa de banho fechada, sótão | subir | a família atrás da porta | defensores; MG | o rapaz da HJ foge; Petrenko | sótão rendido |
| arco/posto | pano, toldo, macas, água | saída por grupos | atirador por janelas | — | civis; o idoso alemão | posto com ambos os lados |
| janelas/noite | a ponte batida, incêndios | consolidar; contar setores | notícias aos pedaços | sonda | — | 3/4 setores |
| 2/5 | lençóis nas janelas, armas no chão, altifalante | confirmar | o atirador até 06:20 | — | rendidos por setor | 0/4 |
| oficina | porta de ferro, postigo, pistola na mesa | a porta | Bychkov | — | o Feldwebel; quatro dentro | sentados ao muro |
| fim | o posto mudado, a escada | escutar | — | — | Frau Lehmann sai | — |

Objetos com origem: a porta da oficina (serralharia "Werkstatt" de antes da guerra; o portão de ferro de 1928 — ficção), a braçadeira branca (lençol cortado a 30/4), o aviso meio arrancado (**contexto só no debrief com fonte** — P-C28), a barricada de móveis (apartamento do 3.º piso), a pistola na mesa (P38 do Feldwebel), a panela de água (Frau Lehmann; emprestada ao posto).

---

## 6. Diálogos (VO russo; alemão para civis e rendidos, legendado só onde §79 o exige — "Posso sair?")

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Frau Lehmann (alemão, legendado) | "Posso sair?" (§79; duas ocorrências: 1/5 "Ainda não."; 2/5 "Sim.") | abrigo; outro | 1 | — |
| 002 | Makarov / Danilin (rádio) | "Confirmem a ordem. Não retomem o fogo." (§79) | 05:40 | 0 | — |
| 003 | Orlov | "Abaixe a arma. Vamos abrir passagem." (§79; dita pelo jogador primeiro se `ordered`; **omitida** se `player_fired_on_pow`) | porta | 0 | — |
| 010 | Serov | (entra de arma apontada; sem fala) | intro | — | — |
| 011 | Orlov | "Pessoas. Com malas." (V1; baixa-lhe o cano) | intro t 10 | 1 | — |
| 012 | Orlov | "Ainda não." (V1; resposta a 001) | 001 | 1 | — |
| 013 | Bychkov | "O velho é dos deles. Sem braçadeira." (V1) | idoso | 2 | — |
| 014 | Kravets | "É um velho com uma perna. Depois dos nossos." (V1) | 013 | 1 | — |
| 015 | Serov | "Pensei que eram soldados." (V1) | — | 2 | — |
| 016 | Orlov | "Eu também pensei, em 41, de um alemão a tremer." (V1) | 015 | 1 | — |
| 017 | Gusev | "Acesso. Pátios, não a rua." (V1) | intro fim | 1 | — |
| 018 | Gusev | "Cave é gente. Pátio é passagem." (V1) | cave | 1 | 30 |
| 019 | Bychkov | "A rua é mais rápida." / Gusev: "A rua é do telhado." (V1) | — | 2 | — |
| 020 | Serov | "Parede aberta. Vê-se do telhado, não vê?" / Orlov: "Três segundos. Um de cada vez." (V1) | parede | 1 | — |
| 021 | estafeta | "Dizem que os do 3.º de Choque estão no Reichstag. Dizem que ele morreu. Dizem." (V1) | estafeta | 1 | — |
| 022 | Makarov / Danilin | "Dizem não é ordem. Continuamos." (V1) | 021 | 1 | — |
| 023 | Bychkov | "Oficina. Portão fechado. Há gente lá dentro, aposto." (V1) | portão | 2 | — |
| 024 | Gusev | "Fechado é fechado. Hoje não." (V1) | 023 | 1 | — |
| 025 | secção vizinha (voz) | "27.ª? Aqui! Pelo arco!" (V1) | ligação | 1 | — |
| 026 | Gusev | "Prédio. Escada de serviço é estreita e nossa. Principal é deles." (V1) | prédio | 1 | — |
| 027 | Bychkov | "Patamar com móveis. Granada." (V1) | barricada | 0 | — |
| 028 | Serov | "Vozes. Atrás desta porta." / Orlov: "Casa de banho. Família. Arma baixa ou passa." (V1) | 2.º piso | 1 | — |
| 029 | Gusev | "Recuam para cima. Não corras atrás deles pela escada." (V1) | — | 1 | — |
| 030 | Petrenko | "…ombro. Estilhaço. Consigo andar." (V1) | 12:30 | 1 | — |
| 031 | Kravets | "Consegues sentar-te. Segundo piso, agora." (V1) | 030 | 1 | — |
| 032 | Bychkov | "Um miúdo! Escada de serviço! Vai fugir!" (V1) | HJ | 1 | — |
| 033 | Gusev | "Deixa-o. Tem quinze anos." (V1) | 032 | 0 | — |
| 034 | Makarov / Danilin | "Vizinha no sótão pelo outro lado. A MG rendeu-se a eles." (V1) | sótão | 1 | — |
| 035 | Gusev | "Dois de mãos erguidas. Eu trato. Vocês, a saída." (V1) | — | 1 | — |
| 036 | Gusev | "Arco para a rua segura. O atirador do prédio seguinte bate-o. Dez segundos de janela." (V1) | arco | 1 | — |
| 037 | Orlov | "Bychkov, Serov: cobrir o arco. Pano na esquina." (V1) | — | 1 | — |
| 038 | Gusev (alemão, três palavras) | "Raus. Langsam. Sicher." (V1) | abrigo | 1 | — |
| 039 | Frau Lehmann (alemão) | — (olha as armas; se apontadas, senta-se) | — | — | — |
| 040 | Gusev | "Armas baixas. Não saem com armas apontadas. Ninguém sai." (V1; se `entered_shelter_armed`) | — | 0 | — |
| 041 | Serov | "Quatro. Oito. Doze. E o velho." (V1) | contagem | 2 | — |
| 042 | Orlov | "Agora. Quatro. Vão." (V1; sinal) | intervalo | 0 | — |
| 043 | Kravets | "Petrenko na maca pelo arco. Depois o velho, apoiado." (V1) | maca | 1 | — |
| 044 | Bychkov | (cobre; sem fala) | — | — | — |
| 045 | Kravets | "Posto no pátio. Os nossos primeiro. Depois quem vier." (V1) | posto | 1 | — |
| 046 | Gusev | "Janelas. Rua e pátio. Rodem." (V1) | consolidar | 1 | — |
| 047 | Makarov / Danilin | "Rádio: 'Krebs esteve no QG esta madrugada.' 'Negociações.' Nada confirmado. Mantemos." (V1) | notícias | 1 | — |
| 048 | Serov | "Norte sim. Leste sim. Oeste não." (V1; contagem de setores) | janelas | 2 | — |
| 049 | Bychkov | "Sonda. Fraca. Não é ataque, é alguém que ainda não sabe." (V1) | sonda | 1 | — |
| 050 | Makarov / Danilin | "'O Reichstag é dos do 3.º de Choque.' Não nosso. Registem." (V1) | — | 1 | — |
| 051 | Serov | "Ele morreu? O…" / Gusev: "Dizem. Dorme." (V1) | noite | 2 | — |
| 052 | oficial (voz) | "Manter posições. Nada de avanços esta noite." (V1) | noite | 1 | — |
| 053 | — | (altifalante alemão ao longe; uma ordem repetida) | 05:40 | — | — |
| 054 | Makarov / Danilin | (002) | 05:40 | 0 | — |
| 055 | Orlov | "Rádio. Repete a ordem. Quero confirmação da companhia." (V1; interação) | confirmar | 1 | — |
| 056 | Makarov / Danilin | "Companhia confirma: cessar-fogo a partir de agora. Responder só a quem dispara." (V1) | 06:05 | 0 | — |
| 057 | Gusev | "Vizinha avisada. Quem larga, larga. Quem dispara, responde-se." (V1) | — | 1 | — |
| 058 | Serov | "Norte não. Leste ainda. Oeste não." (V1) | setores | 2 | — |
| 059 | Bychkov | "O do prédio seguinte ainda dispara." / Orlov: "Então responde-se. Só a ele." (V1) | atirador | 1 | — |
| 060 | Serov | "Leste não. …Nenhum." (V1) | 06:20 | 1 | — |
| 061 | — | (o postigo; a porta de ferro por dentro; 3 s) | 06:40 | — | — |
| 062 | Bychkov | "Ontem ele disparava daqui." (V1; ergue o fuzil) | +2 s | 1 | — |
| 063 | Bychkov | "Eu sei. Já sei." (V1; **só se** `m27.bychkov_deescalated`; baixa antes da ordem) | 062 | 0 | — |
| 064 | Gusev | "Largou a arma. Baixa a tua." (PR #44; se não de-escalado em M27) | 062 | 0 | — |
| 065 | Orlov | (003) | ordered / covered | 0 | — |
| 066 | Feldwebel (alemão) | "Feldwebel. Vier Mann drinnen. Keine Waffen." | — | 1 | — |
| 067 | Gusev | "Quatro dentro. Serov, comigo. Armas baixas." (V1) | 066 | 1 | — |
| 068 | Serov | "Uma pistola na mesa. Mais nada. Estão sentados." (V1) | oficina | 1 | — |
| 069 | Frau Lehmann (alemão, legendado) | (001, segunda) | escada | 1 | — |
| 070 | Orlov | "Sim." (V1; mão aberta) | 069 | 1 | — |
| 071 | Serov | "Acabou?" (V1) | outro | 1 | — |
| 072 | Gusev | "Aqui." (V1) | 071 | 1 | — |

Callouts: `co_m28_roof_sniper`, `co_m28_street_mg`, `co_m28_arch_window`, `co_m28_probe_dusk`, `co_m28_loudspeaker`, `co_m28_sector_quiet` (um por setor). Silêncios: o abrigo (nenhum tiro); a porta (3 s); a cidade sem barragem (nunca total).

---

## 7. Arte e atmosfera

**Paleta:** cinza de reboco e de fumo, ocre de tijolo exposto, preto de vigas queimadas, branco de lençóis e braçadeiras, verde-caqui M43, vermelho desbotado de cartazes rasgados, azul-escuro de pátios em sombra, laranja de incêndios à noite. **Luz:** 09:00 poeira iluminada pela escada da cave; pátios em sombra com a rua ao sol; interiores com luz de janelas partidas; noite com incêndios; 2/5 madrugada cinzenta a abrir. **Materiais:** reboco, tijolo, ferro de portão, madeira de móveis, vidro partido, lona de toldo, pedra de calçada, água de panela. **Silhuetas:** prédios de cinco pisos com fachadas abertas, arcos de pátio, o elétrico tombado, a ponte batida do canal, lençóis às janelas. **Destruição:** persistente (barricada, parede aberta, sótão). **Humanos:** Orlov 1945; Serov de 17; Kravets; civis com malas e braçadeiras; o Feldwebel de meia-idade sem capacete; o idoso Volkssturm; o rapaz da HJ (visto de costas, a fugir). **Violência reduzida:** Petrenko com o ombro coberto; nenhum civil ferido pela secção; a oficina sem sangue.

**Imagem única:** a porta da oficina e um homem de mãos à vista; depois, uma porta de abrigo a abrir-se (ART §4, GAMEPLAY_DRAMATIZATION).

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| abrigo | candeeiro, criança, respiração, malas | — | artilharia abafada | **nenhum tiro** |
| pátios | passos em pátio, portões, **reverberação de fachadas** | MG na rua | incêndios | — |
| prédio | escadas, granada abafada, vidros, a família atrás da porta | a vizinha pelo outro lado | — | — |
| arco/posto | civis, criança, o atirador por janelas, Kravets | — | — | — |
| noite | tiros esparsos por setor (mistura direcional), rádio aos pedaços | sonda | incêndios; baterias | — |
| 2/5 | **altifalante → confirmação → setores a diminuir → metal a cair → passos → choro → uma voz civil clara** | rendições por setor | — | **o cessar-fogo (nunca mute)** |
| oficina | a porta de ferro, a voz do Feldwebel | — | a cidade sem barragem | relativo (3 s) |
| fim | a escada, Frau Lehmann, o capacete | camião; passos | choro ao longe | **nunca total** |

Sons novos: cidade em ruínas com reverberação de fachadas, cessar-fogo por setor (mistura por direção com estados), altifalante alemão, civis em abrigo. Música: motivo VI "A água, outra vez" — uma frase quando Orlov escuta a cidade (a "água" aqui é o silêncio que não é silêncio). VO russo; alemão (legendado só em 001).

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| Krebs no QG de Chuikov a 1/5 (03:30–04:00); coluna de Weidling em Bendlerstrasse às 05:55 de 2/5; capitulação assinada de manhã | D (resumo) | H27; S-C23 | hora local (**P-C28**) |
| 8.º Ex. Guardas no Tiergarten/canal Landwehr; o Reichstag tomado pelo 3.º Exército de Choque | D | S-C23 | — |
| Quarteirão de Orlov; ruas/prédios selecionados | R (classificação explícita em cartela) | — | **P-C28** (confirmação cartográfica) |
| Civis em abrigos; Volkssturm idoso; Hitlerjugend em combate | D (geral) | H27 | — |
| Cessar-fogo por setores com altifalantes; rendições escalonadas | D (geral) | S-C23 | — |
| Contexto de perseguição do quarteirão (debrief com fonte; nunca encenado) | regra | MASTER-STORY-BIBLE §8 regra 5 | **P-C28** |
| Hitler morto a 30/4 — só por notícia fragmentada em cena; confirmado na cartela | D | — | — |
| Makarov/Danilin, copo, Bychkov por `m07.*`/`m27.*` | regra | CONTINUITY | — |
| Frau Lehmann, Petrenko, o Feldwebel, o idoso, o rapaz | F | — | acrescentar Petrenko a CONTINUITY §4 |
| Equipamento: PPSh-41, Mosin, DP-27, F-1; alemão: P38, Kar98k, Panzerfaust (só vs NPC), MG 42 | D | TIMELINE §3 | auditoria |

**Proibições:** Reichstag; Hitler em cena ou como "chefe"; bunker; atrocidade pessoal encenada; mute; combatentes rendidos que reativam; "limpar" abrigos; o rapaz da HJ alvejável; Weidling/Krebs/Chuikov em cena. **Fora de cena:** todos os acima.

---

## 10. Handoff técnico

**Contrato:** `id m28_berlin`, `order 28`, **dois segmentos de relógio** (1/5 09:00→19:00 + noite; 2/5 05:30→11:00; hora de Moscovo com nota), `cast` condicional (`makarov_or_danilin`), grupos (`grp_section`, `grp_neighbour`, `grp_runner`, `grp_civilians_shelter` (×2 famílias + Lehmann + braçadeira), `grp_apartment_family`, `grp_de_roof_sniper`, `grp_de_street_mg`, `grp_de_building_floors` (×3), `grp_de_attic_mg`, `grp_hj_boy` (nunca alvo), `grp_de_arch_sniper`, `grp_de_probe_dusk`, `grp_de_night_sectors` (×4), `grp_de_holdout_sniper` (cessa 06:20), `grp_de_surrendering_sectors` (×4), `grp_workshop` (Feldwebel + 4), `grp_aid_post`), setores s1–s6, checkpoints A–E (E persiste `surrendered` por grupo), cutscenes (intro, outro com variantes), falas, flags, debrief com cartela de contexto a preencher (P-C28).

**Flags:** `m28.completed`, `m28.makarov_present`, `m28.cup_present`, `m28.petrenko_wounded` (fixo), `m28.apartment_family_safe`, `m28.hj_boy_spared` (fixo), `m28.fired_at_boy`, `m28.civilians_out`, `m28.entered_shelter_armed`, `m28.player_carried`, `m28.sectors_firing_day1`, `m28.ceasefire_confirmed`, `m28.sectors_firing_day2`, `m28.returned_fire_after_order`, `m28.pow_secured`, `m28.player_intervened ∈ {ordered, covered}`, `m28.comrade_deescalated`, `m28.player_fired_on_pow`, `m28.workshop_men`, `m28.civilians_out_final`.

**Sistemas:** [C] cessar-fogo por setores (`enemyState ∈ {fighting, surrendering, surrendered}` por grupo e por agenda; a IA aliada nunca dispara sobre `surrendering/surrendered`; mistura sonora por setor com callouts `co_m28_sector_quiet`), `SURRENDERED` persistente (serializado no save: **nenhum ator rendido reativa ao carregar** — teste de aceitação), civis em abrigo com estados ("não saem com armas apontadas": condição de armas da secção em `lowered`); [A] interiores verticais (M10), fogo como dados, supressão por janelas, maca a dois, posicionar, rotação; [B] contagem de setores (leitura do estado da mistura), pedir confirmação ao rádio (estado `ceasefireConfirmed`), baixar o cano (M19); [D] leitura de `m07.*`, `m27.*`. **Fallbacks honestos:** sem estados por setor → o cessar-fogo é uma sequência agendada de desativação de grupos com mistura por direção (nunca mute); sem civis com estados → cutscenes curtas para a saída por grupos.

**Disciplinas:** Level: abrigo (cave), três pátios ligados, prédio de 5 pisos com duas escadas e sótão, arco de saída, rua com elétrico tombado e ponte batida (só vista); Combate/IA: defensores por piso que recuam, MG do sótão que se rende à vizinha, rendições por setor, atirador que cessa por agenda; Arte: Berlim 1945 (prédios de rendimento, Hinterhöfe, lençóis, cartazes), o aviso **sem** encenação; Personagens: secção de 1945, civis berlinenses, Feldwebel, Volkssturm, HJ (de costas); Animação: baixar o cano de outro, granada no patamar, abrir porta com arma baixa, sinal por grupos, maca, pedir confirmação, a porta de ferro por dentro, segurar o braço, tirar o capacete e escutar; Som: reverberação de fachadas, cessar-fogo por setor, altifalante; VO: russo/alemão; Historiador: P-C28 (quarteirão, hora local, contexto de perseguição com fonte); QA: rendidos nunca reativam após reload; o rapaz nunca é atingível; civis nunca atingíveis pela secção; `returned_fire_after_order` só se o jogador disparou sobre quem não disparava; Makarov/Danilin exclusivos; Bychkov baixa antes da ordem se `m27.bychkov_deescalated`.

**Testes:** guardar em E e carregar → `grp_workshop` e `grp_de_surrendering_sectors` em `surrendered`, sem armas, sem IA hostil; disparar sobre o rapaz → bala à parede, `fired_at_boy`, rapaz foge; entrar no abrigo com armas apontadas → civis não saem até `lowered`; o atirador de 2/5 cessa às 06:20 mesmo sem resposta; mistura sonora nunca atinge silêncio total (nível mínimo ambiente); fala 003 omitida se `player_fired_on_pow`; `comrade_deescalated` true se Bychkov baixa após jogador/Gusev sem repetição de Orlov.

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| Luftschutzraum; "Posso sair?" / "Ainda não." | (intro) | baixar o cano de Serov | Frau Lehmann; Kravets; Bychkov | — | start | variantes Makarov/copo |
| Pátios; notícias aos pedaços | `obj_m28_recon` / `link` | escolher passagens; evitar caves; ligar | Gusev; estafeta; vizinha | — | intro | CP-A; CP-B |
| O prédio escada a escada | `obj_m28_local_defense` | subir; granada; porta com arma baixa; não perseguir | defensores recuam; família; HJ foge; sótão rende-se à vizinha; Petrenko (fixo) | barricada; sótão | B | `petrenko_wounded`; `apartment_family_safe` |
| Saída para civis | `obj_m28_evacuate_civilians` / `wounded` | verificar; cobrir; marcar; sinal por grupos; maca; arma baixa | Gusev "Raus. Langsam. Sicher."; Serov conta; Kravets | pano; posto no pátio | building | CP-C; `civilians_out` |
| Consolidar; contar setores | `obj_m28_consolidate` | posicionar; rodar; ouvir | rádio aos pedaços; sonda | noite; 3/4 | C | CP-D |
| Confirmem a ordem | `obj_m28_confirm_ceasefire` | pedir confirmação; transmitir; responder só a quem dispara | Makarov/Danilin 002; Serov conta; rendições por setor | armas no chão; lençóis; 0/4 | 05:40 | CP-E; `ceasefire_confirmed` |
| A porta aberta | `obj_m28_door` | ordenar / cobrir / (disparar) | Bychkov; Gusev; Feldwebel; quatro dentro | porta aberta; sentados ao muro | 06:40 | `pow_secured`; `comrade_deescalated` |
| "Posso sair?" / "Sim." | (outro) | skip | Frau Lehmann sai; Kravets; Serov "Acabou?" | o posto mudado | door | `m28.completed` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 10 | o gesto final é não disparar; "Posso sair?" duas vezes; "Aqui." |
| 2 | Autenticidade | 8 | S-C23 sólido; quarteirão/hora/contexto P-C28 com classificação explícita em cartela. |
| 3 | Personagens | 9 | Orlov fecha o arco de M07 com uma frase; Bychkov lê M27; Serov conta; Frau Lehmann sem gratidão. |
| 4 | Diálogos | 9 | "Cave é gente. Pátio é passagem." / "Dizem não é ordem." / "Eu sei. Já sei." / "Aqui." |
| 5 | Originalidade | 10 | cessar-fogo como sistema; armas baixadas por setor; a forma de intervir em vez do resultado. |
| 6 | Variedade | 9 | baixar canos, pátios, vertical, porta com arma baixa, sinal por grupos, maca, contar setores, confirmar, ordenar/cobrir, escutar. |
| 7 | Set pieces | 9 | a porta aberta é o quarto âncora da campanha. |
| 8 | Atmosfera | 9 | pátios, lençóis, a cidade sem barragem. |
| 9 | Environmental storytelling | 8 | o aviso meio arrancado é delicado: contexto só no debrief com fonte. |
| 10 | Cinematográfica | 9 | a mão no cano de Serov; a porta de ferro; o capacete na mão. |
| 11 | Sonora | 10 | o cessar-fogo por setores sem mute é o desenho sonoro mais importante da campanha. |
| 12 | Impacto emocional | 9 | "Sim." |
| 13 | Ritmo | 8 | 22–29 min; duas datas com `readyScale`. |
| 14 | Continuidade | 10 | lê `m07.*` e `m27.*`; fecha Orlov; nenhuma ligação a Antonov/Gromov. |
| 15 | Integração técnica | 5 | cessar-fogo por setores e `SURRENDERED` persistente são [C] críticos com fallbacks; a verticalidade reutiliza M10. |

**Correções aplicadas:** (1) o Reichstag e Hitler existem só por relato atribuído a outros e por cartela; (2) o contexto de perseguição do quarteirão fica no debrief com fonte (P-C28) e o único sinal ambiental (aviso meio arrancado) nunca é encenado; (3) o rapaz da HJ nunca é atingível (bala à parede, fixo) e ninguém o persegue; (4) civis não saem com armas apontadas — a atitude é mecânica, não moral; (5) a decisão da porta é de forma (ordenar/cobrir) com ambos os ramos a manter o prisioneiro vivo, e Bychkov baixa antes da ordem se de-escalado em M27; (6) o cessar-fogo nunca atinge silêncio total; (7) rendidos persistem no save e nunca reativam; (8) Petrenko é proposta deste dossiê a acrescentar a CONTINUITY §4.
