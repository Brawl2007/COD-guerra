# CAMPAIGN MASTER STORY BIBLE · COD-Guerra, 30 missões, uma guerra (1/9/1939 → 2/9/1945)

**Estado:** PROPOSTA DE DIREÇÃO (Fase 3 do brief). Complementa e não substitui `docs/PROMPT_MESTRE.txt` §52/§73/§79, `STORY_BIBLE.md`, `missions/campaign-plan.json`, os documentos do PR #44 (`docs/campaign/`) e a direção de M01 (PR #56). M01 é PROTÓTIPO JOGÁVEL; M02–M30 são PLANEADAS. Os detalhes de cada missão estão nos dossiês em `missions/`.

---

## 1. Logline, tema, promessa

**Logline.** Durante seis anos, vinte soldados de frentes diferentes aprendem a mesma coisa de maneiras incompatíveis: a guerra não é a batalha que se ganha, é aquilo que se faz sob pressão, as pessoas que se ajudam e os nomes que deixam de responder.

**Tema (herdado de M01, PR #44 §1):** *contar os vivos, não os inimigos mortos.* A frase pertence a Zieliński (`dlg_m01_048`) e **não é repetida** por outro protagonista; o que se repete é o gesto: cada missão tem o seu modo de contar.

**Promessa ao jogador.** Trinta situações militares-humanas diferentes, não trinta mapas. Em cada uma: um lugar real, uma data real, uma unidade real, pessoas inventadas, um problema que não se resolve a disparar, pelo menos um silêncio, um objeto que fica, um momento em que alguém podia ser cruel e alguém o impede ou paga o preço, e um debrief que diz o que foi.

**O que a campanha recusa (herdado, Prompt §72, PR #44 §1):** corredores com ondas; "mate todos para avançar"; discursos sobre o sentido da guerra; música heroica sobre feridos; atrocidades inventadas atribuídas a unidades identificáveis; execução de rendidos como mecânica ou recompensa; copiar cenas, falas, mortes, enquadramentos ou coreografias de *Call of Duty*, *CoD 2* ou *World at War*; coincidências entre protagonistas que nunca se conheceram; "botão de vitória" em M30.

---

## 2. Seis movimentos (adotados do PR #44; assinaturas de situação desta biblioteca)

| Mov. | Missões | Sentido dramático | O que o jogador aprende a fazer | Linguagem visual/sonora | Transição de saída (montagem por **gesto**, 8–20 s, skip) |
| --- | --- | --- | --- | --- | --- |
| **I — A guerra chega** | M01–M03 · Polónia 1939 | rotina destroçada; derrota; defender casas | proteger um trabalho; avançar e recuar; cuidar de quem está dentro | amanhecer azul → campos ao meio-dia → pó de edifícios; apitos, cascos, vidro a vibrar | M03: uma mão fecha a porta do porão → M04: uma mão abre a porta de um camião parado na estrada |
| **II — Sobreviver para continuar** | M04–M07 · 1940–41 | o objetivo muda de vencer para regressar ou aguentar | cobrir quem embarca; voar e voltar; aguentar um cerco; procurar na neve | água e motores; céu; calor seco; gelo e vento | M07: uma voz chama nomes na neve e a resposta é vento → M08: a mesma espera de resposta, mas de uma rampa de embarcação, no calor |
| **III — A guerra consome tudo** | M08–M12 · 1942–43 | distância, fábricas, logística, exaustão | observar sem disparar; atravessar água; perder interiores; abrir corredor de noite; retirar sem se desfazer | selva quieta; reflexos de fogo na água; metal; artilharia; rádio falho | M12: a lista de nomes com linhas em branco → M13: a lista de tripulantes dita dentro de um tanque |
| **IV — A escala da invasão** | M13–M20 · 1943–44 | mobilidade e alianças; vitórias que custam quase tudo | conduzir; vadear; subir; cair de noite; flanquear; retirar pelo rio | metal, poeira, mar, pedra, noite, água outra vez | M20: remos na água escura → M21: chuva nas copas; o som da água muda de rio para folhas |
| **V — Aproximar-se não é terminar** | M21–M26 · 1944–45 | falta de homens; exaustão; civis no meio | evacuar pela ravina; resistir onde não era frente; aguentar o frio; atravessar o istmo; manter uma ponte; não disparar sobre uma porta | lama, neve, cinza, aço, aldeias habitadas, céu marítimo | M26: Marsh dobra a carta por começar → M27: a mesma dobra numa ordem de ataque em russo, sob um ruído que não deixa ouvir |
| **VI — Parar de disparar** | M27–M30 · 1945 | a guerra termina em datas diferentes; o silêncio não desfaz nada | consolidar um objetivo pequeno; baixar a arma; reconhecer o que o inimigo deixou; testemunhar | ruído gigantesco → disparos a diminuir por setor → chuva → água e vento | M30: alguém levanta uma tábua; créditos |

**Regra das transições (PR #44 §2–3, herdada):** nunca comprimir anos numa cena contínua; nunca mapa com setas; nunca anunciar resultado não observado; nunca sugerir que dois protagonistas se cruzaram. A montagem emparelha **gestos** (mãos, portas, água, listas, cartas), não pessoas.

---

## 3. As oito regras (herdadas da visão de M01) como critério de aceitação de cada dossiê

1. Uma **situação central** escrita numa frase antes de qualquer mapa.
2. Um **modo de contar**.
3. Um **objeto**.
4. Um **silêncio**.
5. Uma **tarefa que não é matar**.
6. Um **momento de custo humano** com causa, duas reações e consequência.
7. **Pessoas históricas fora de cena**.
8. Um **debrief que diz o que foi**.

Cada dossiê abre com estas oito respostas (secção 1 do dossiê) e a revisão crítica (secção 12) verifica-as.

---

## 4. As 29 situações (assinaturas; o detalhe pertence a cada dossiê)

| # | Missão | Situação central | Modo de contar | Objeto | Silêncio obrigatório | Tarefa que não é matar | Momento de custo humano (causa → duas reações → consequência) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 02 | Bzura/Łęczyca | avançar por uma estrada que à noite já não é nossa | cantos dobrados no mapa de Piotr | o mapa de Piotr | a pausa no pomar depois do acesso | manter aberto o corredor de suprimento; carregar a carroça | alemão ferido no pomar → Wierzba quer deixá-lo / Lis marca o lugar → a carroça de feridos passa por ele; `m02.pomar_wounded_marked` |
| 03 | Varsóvia | um quarteirão com gente dentro; a rota segura muda a cada bombardeamento | baldes de água no porão | a chave da família Zaremba | o porão entre duas vagas | transportar água/munição; libertar uma saída | soldados querem o porão para munição → sargento separa corredor / morador recusa sair → o porão fica mais cheio e com menos água |
| 04 | Dunquerque | a praia não espera: cobrir quem embarca e não embarcar | lugares no barco | a correia de lona do camião | o motor que abafa as vozes | entregar feridos ao embarque; organizar a fila | homem insulta o motorista → Whitfield impede a agressão / Fletcher ri de nervos → a fila continua; ninguém "ganha" |
| 05 | Inglaterra (303) | voltar com o ala importa mais do que somar vitórias | milhas com a asa dele à vista | o remendo no Hurricane | motor reduzido no regresso; a cadeira vazia | formar; navegar; escoltar o ala; aterrar | piloto inimigo de paraquedas → Malec pode olhar / o rádio manda proteger a formação → nunca é alvo; `m05.enemy_pilot_fired_on` só gera reação negativa |
| 06 | Tobruk | um perímetro é uma linha de homens que se veem; quando um posto cala, alguém vai lá | postos que respondem (lâmpada/telefone) | o cantil de Daniel | o posto que não responde | restabelecer ligação; levar munição à Vickers; sombra para feridos | alemão ferido desarmado na área médica → Morrow protesta / Ellis trata ambos → `m06.pow_treated`; Morrow reconhece sem virar santo |
| 07 | Kryukovo | a neve apaga rastos e sons: encontrar quem ficou | rastos novos e antigos | o copo de lata de Saveliev | o campo antes do assalto de 8/12 | abrir corredor para o trenó; restabelecer rádio | alemão desarmado a tremer junto da casa → Lukin ergue a arma por pânico / Saveliev interpõe-se → Lukin guia o trenó no fim; `m07.pow_escorted` |
| 08 | Guadalcanal | o silêncio da praia é a ameaça; não disparar contra sombras | caixas descarregadas | a tigela de arroz ainda morna | a praia depois da rampa | carregar suprimentos; transportar um homem incapacitado pelo calor | ruído na mata → Marsh quer disparar / Henry Cole manda identificar → são os seus; `m08.friendly_fire_avoided` |
| 09 | Stalingrado, Volga | atravessar água sob fogo e chegar a um lugar que já arde | nomes aprendidos | o embrulho de Yermolin | o meio do rio | levar munição/informação; manter ligação com a margem | recém-chegado quer ceder o lugar a um ferido que regressa → ordem de embarcar / ajudam na margem → a maca regressa pela mesma rota; `m09.vetrov_name_learned` |
| 10 | Stalingrado, fábrica | interiores que mudam de dono a cada hora | oficinas mantidas/perdidas | a chave de oficina de Rybin | o zumbido da máquina que para | transferir munição e feridos; conduzir o mensageiro | morte fixa de Rybin → Gromov hesita / Kondratyev chama para Zhdan → `m10.zhdan_status`; a máquina fica inacessível ao fundo |
| 11 | El Alamein | uma noite inteira de artilharia: abrir um corredor na escuridão | fita branca do corredor (metros) | o mesmo cantil de M06 | o deserto antes das 21:40 | seguir os engenheiros; levar mensagem; carregar ferido opcional | homem ausente da contagem aparece a arrastar-se → Daniel hesita / Ellis organiza → `m11.straggler_helped` sem mudar o ataque |
| 12 | Kasserine | a primeira derrota: romper e retirar sem se desfazer | a lista no bloco de Delgado | a folha de ordens dobrada de Mercer | o telefone de campanha mudo | levar munição; decidir ordem de saída; carregar feridos ao camião | dois grupos pedem passagem → Ballard acusa / Mercer ordena pela via realmente aberta → `m12.groups_evacuated`; a lista fica com linhas em branco |
| 13 | Prokhorovka | dentro de um tanque, a guerra é um visor | tripulantes que saíram | a escotilha que Demin bate | motor desligado, metal a estalar | conduzir; manter formação; reposicionar; cobrir a saída de uma tripulação | tanque vizinho arde → Fomin proíbe perseguir o alvo que cortaria a passagem / Grach quer disparar → `m13.neighbor_crew_rescued` |
| 14 | Gela–Niscemi | um jeep, uma estrada, civis, suprimento | caixas entregues | o espelho do jeep | o comboio parado no olival (cigarras) | conduzir; reconhecer a pé; abrir passagem a civis | morador com mala atravessa → Doyle grita / Price mostra a rota segura → `m14.civilians_helped`; a família continua sem casa |
| 15 | Tarawa | a água até ao peito: a onda que chega depois da primeira | homens que chegam à areia | a correia do equipamento (apertada, depois largada) | o som abafado junto ao cais | vadear; reunir; levar munição à MG; manter corredor para a onda seguinte | homem preso na água → Brandt entra / Turner cobre, sem botão de resgate → `m15.brandt_covered`; o equipamento de Reiner fica na areia |
| 16 | Monte Cassino | encosta, feridos, reconhecimento depois de o inimigo sair | feridos descidos | a carta de Kaleta | a abadia vazia a 18/5 | carregar feridos; apoiar; reconhecer | Kaleta ferido com a carta → Ostrowski guarda-a / Herc manda seguir → `m16.letter_state`; nenhum prémio por abandonar |
| 17 | Sainte-Mère-Église | cair sozinho de noite; encontrar os outros pelo som | homens reunidos por senha | o cordel do equipamento de salto | o pomar depois da aterragem | reunir; levar informação; ligar grupos; bloquear acesso | sinal na sebe → Dunning prepara disparo / Nathan Cole exige confirmação → `m17.dunning_fired`; a chamada ao amanhecer revela faltas |
| 18 | Omaha, Fox Green | sair da água e subir | quem sobe | a alça da maca improvisada | atrás do banco de seixos (1–2 s) | levar material à equipa de abertura; reunir; carregar ferido | ferido protesta que foi deixado → Doyle explica que não havia rota / Price trabalha → `m18.price_status`; a praia de cima com macas |
| 19 | Caumont, bocage | o inimigo rendido e a raiva de Omaha | um homem sob guarda | o Soldbuch do rendido (o nome lido) | a quinta deserta (aves) | patrulhar; transmitir; abrir rota ao transporte; escoltar rendido | rendido ajoelhado → Doyle ergue a arma / Morgan corta → `m19.pow_secured`; custódia por NPC; sem execução |
| 20 | Oosterbeek | três datas; perímetro que encolhe; retirada pelo rio | cartuchos por homem (17 → 21 → 25) | a alça da bolsa de documentos (gesto de M04) | o rio à noite, remos e chuva | visitar posto médico; proteger passagem de feridos; seguir fitas; manter grupo | ferido que não pode ser movido → Stokes acusa os socorristas / Penn fica com ele → `m20.penn_stayed`; o barco parte |
| 21 | Vossenack | a floresta não deixa ver; artilharia nas copas; evacuar | padiolas que passam | o mapa molhado de Allen | depois do rebentamento na copa (oclusão) | orientar; abrir rota de evacuação na ravina; carregar maca | ferido pede para não ficar na terra encharcada → Teague procura rota / Pruitt manda avançar → `m21.evac_route`; Halvorsen volta, Ames não |
| 22 | Clervaux | a surpresa: resistir num lugar que não era frente | vozes que ainda respondem no rádio | o caderno de Lewis | estática onde devia haver resposta | reunir; levar feridos; proteger saída | posto perdido → Ballard acusa Pascal / Lewis confirma o mapa → `m22.pascal_deescalated`; lista incompleta |
| 23 | Bastogne/Foy | cercados; um par de luvas guardado para alguém | luvas e cobertores distribuídos | as luvas | a noite no buraco, neve a cair | levar suprimento; distribuir; manter corredor 26/12; avançar em Foy | rendidos ao frio → Hadley quer deixá-los sem abrigo / Vogel lembra os recursos → `m23.pows_sheltered`; as luvas vão para Ferraro |
| 24 | Iwo Jima | areia negra: atravessar o istmo no primeiro dia | terraços subidos (metros) | a peça de equipamento de Salas na rebentação | os minutos antes de o fogo começar | subir terraços; levar apoio; localizar fogo oculto; atravessar o istmo; passagem para feridos | Rourke jura ter ouvido a voz de Salas → Finch procura cobertura real / Kessler manda seguir → `m24.salas_status = missing` |
| 25 | Remagen | a ponte que fica de pé (espelho de M01) | homens que atravessam | o guarda-corpo (a mão de Hughes) | o espanto de ver a ponte inteira; os 2 s após 15:40 | cobrir a equipa; atravessar; manter acesso; proteger o grupo seguinte | rendido junto do acesso → Fisk quer "garantir" / Hanlon impede amontoar na zona danificada → `m25.pow_at_access_secured` |
| 26 | Okinawa, Hagushi | a praia calma e os civis; não disparar sobre uma porta | famílias que passam | a carta de Marsh (por começar) | depois da rampa: aves, uma porta | organizar; reconhecer; passar civis; abrir rota de suprimento | porta abre-se → Tully aponta / Henry Cole manda baixar → `m26.tully_deescalated`; a família fica com medo |
| 27 | Seelow | o maior ruído da guerra; objetivo local | homens que ficaram na vala após cada salto | o mapa de Orlov (mostrado a Serov) | depois da barragem: o zumbido | manter contacto; abrir passagem; evacuar ferido; recompor ligação | inimigo incapaz de combater → Bychkov acusa / Orlov ordena segurança e cuidados → `m27.bychkov_deescalated`; Serov volta ao mapa |
| 28 | Berlim | a rendição de um homem e a porta aberta | armas baixadas por setor | a porta da oficina | o cessar-fogo (sons a recuar, nunca mute) | reconhecer; ligar; abrir saída a civis/feridos; confirmar cessar-fogo; baixar a arma | "A porta aberta" (PR #44 §5): Bychkov ergue o fuzil / Gusev segura-lhe o braço; Orlov ordena → `m28.pow_secured`, `m28.comrade_deescalated` |
| 29 | Shuri | desgaste e chuva; a retirada do outro | macas que passam por Gray | a carta enlameada de Marsh | as ruínas do castelo | reconhecer; proteger comunicação; abrir corredor para Gray; verificar retirada; parar no limite de setor | Cole ferido → Tully quer perseguir / Brooks: "ninguém leva o Cole" → `m29.cole_status = wounded_evacuated` (fixo) |
| 30 | Baía de Tóquio | sem combate: a cerimónia vista por um marinheiro; epílogos | nomes que não responderam, em cada frente (eco, não repetição) | o encaixe metálico que Cross confere; objetos dos epílogos | a água | preparar; observar; caminhar; percorrer epílogos | ninguém; o custo humano são os objetos sem dono e as casas que não voltam |

---

## 5. Curva da campanha (intensidade dramática ≠ nível gráfico)

```
peso dramático
 ▲                                           M18      M23          M28
 │                     M10        M13  M15   ██  M20   ██   M24 M27  ██ M29
 │        M03   M06 M07 ██  M11 M12 ██   ██  ██   ██   ██    ██  ██  ██  ██
 │  M01 M02 ██ M04  ██  ██  ██  ██  ██  ██  ██   ██ M21 ██ M22 ██ M25 ██  ██  ██
 │  ██  ██  ██  ██ M05 ██  ██ M08 ██ M09 ██ M14 ██ M16 M17 ██  ██  ██  ██ M26 ██  ██ M30
 └──────────────────────────────────────────────────────────────────────────────► 
   1939        1940–41        1942–43          1944              1945
```

Regras (PR #44 §4, Prompt §72): não aumentar sangue por missão para simular escalada; quanto mais perdas o jogador viu, mais pesam a respiração, o silêncio e o tratamento dado a quem já não combate. As cenas mais perturbadoras são **raras, pessoais, pesquisadas**: M06 (triagem), M19 (rendido), M26 (porta), M28 (porta aberta). Missões "calmas" (M08, M26, M30) são tensão pesquisada, não falta de produção.

| Fase | Intensidade | Conduta dos soldados (regra de atuação) |
| --- | --- | --- |
| 1939 | surpresa, ruptura | recrutas hesitam; líderes mantêm coesão; ninguém é omnisciente |
| 1940–41 | sobrevivência, desgaste | homens disputam recursos e ainda cuidam uns dos outros |
| 1942–43 | brutalidade do combate próximo | medo, raiva e precipitação contra disciplina de socorro |
| 1944 | escala, perda de referências | exaustão moral sem crueldade automática |
| 1945 | vingança, exaustão, cessar-fogo | alguns querem retaliar; outros impedem; nenhum exército é uniformemente cruel |
| M30 | consequência | não existe botão de vitória |

---

## 6. Cadeia de memória (objetos e gestos que atravessam a campanha)

| Fio | Missões | Regra |
| --- | --- | --- |
| **A caneca** (Nowicki) | M01 → M30 (Polónia) | só reaparece em Tczew, Set/1945, com flags; nunca noutra frente; Jan não aparece no navio |
| **O mapa dobrado** (Piotr) | M02 → M03 | em M03 Piotr já não dobra os cantos |
| **A correia/alça** (Reed) | M04 → M20 | o gesto de ajeitar a alça antes de entrar no barco; Whitfield só como memória válida (`m04.whitfield_status`) |
| **O cantil** (Daniel) | M06 → M11 | sacudir areia → último gole para Morrow |
| **O copo de lata** (Saveliev) | M07 → M27/28 | só se `m07.saveliev_status` permitir; senão o gesto passa a Gusev **sem** o objeto |
| **A carta de Marsh** | M08 (menção) → M26 (começa) → M29 (lama) | Marsh escreve desde Guadalcanal; a carta nunca é lida em voz alta |
| **A chave de Rybin** | M10 | fica com Gromov; não transita |
| **A lista** (Mercer → Lewis) | M12, M22 | dois homens diferentes, duas listas incompletas; o eco é de forma, não de pessoa |
| **A carta de Kaleta** | M16 → M30 (epílogo condicional) | só se `m16.kaleta_status` permitir |
| **As luvas** (Bennett) | M23 → M30 (epílogo condicional) | só se associáveis a sobrevivente/local |
| **O guarda-corpo** | M01 (ponte destruída) ↔ M25 (ponte mantida) | espelho de função, não de geografia; Hughes nunca "conhece" Jan |
| **A porta** | M03 (porão) → M26 (porta que se abre) → M28 (porta aberta) | a porta é o lugar onde a guerra decide se dispara |

---

## 7. Regras de prisioneiros, civis e consequências (vinculativas para os 29 dossiês)

1. Desarmados e rendidos deixam de ser alvos de combate: estado próprio (`SURRENDERED`/custódia) ou, se o sistema não existir, cena encenada honesta; nunca "minijogo de execução", nunca XP/objetivo por matá-los (Prompt §72, PR #44 §4).
2. Se o jogador puder disparar sobre rendidos/civis, o jogo **não** o impede por parede falsa: mostra o custo (reação dos companheiros, silêncio da secção, flag de arquivo), como em M01 (`m01.fired_on_fallen`). Nunca recompensa.
3. Nenhuma morte roteirizada é anunciada como evitável (Rybin M10, Cole ferido M29, Nowicki M01, Reiner/Salas/Ames `missing`).
4. Civis não são obstáculos, moedas nem aliados automáticos: têm medo, recusam, desconfiam, pedem passagem; a ajuda é pequena e concreta.
5. Crimes de guerra históricos (Szymankowo em M01, perseguição em Berlim M28) só por relato/debrief com fonte; nunca encenados como ato de unidade identificável.
6. Toda a consequência fica em flag `mNN.*` legível no debrief e, quando o arco continua, na missão seguinte.

---

## 8. Como os protagonistas se distinguem (voz, gesto, objeto, silêncio)

Resumo (detalhe em `CAMPAIGN-CHARACTER-CONTINUITY.md`):

| POV | Voz | Gesto-assinatura | Fraqueza de entrada | Mudança |
| --- | --- | --- | --- | --- |
| Piotr Sokół | frases de comando curtas; chama Lis pelo nome | dobra os cantos do mapa | acredita que uma ordem clara basta | protege uma saída, não um cruzamento |
| Arthur Reed | pergunta antes de afirmar | ajeita a alça da bolsa | confunde ficar com lealdade | forma grupos viáveis |
| Tomasz Malec | procedimentos em voz alta | confere duas vezes o arnês; não larga logo os controlos | esconde nervos em rotina | procura a asa do ala, não o alvo |
| Daniel Hargreaves | conta carregadores e distâncias | sacode areia do cantil | vê posições, não rostos | chama os homens pelo nome |
| Mikhail Orlov | confirma onde está o grupo antes de acelerar | esfrega o polegar no bordo do copo | hesita perante o frio | reconhece a desorientação dos recrutas; baixa a arma a tempo |
| Samuel Brooks | faz perguntas porque a selva não mostra nada | ajusta o cinto (1942) → não precisa olhar (1945) | olha para a frota, não para a mata | não dispara sobre sombras; depois, não sobre portas |
| Pavel Antonov | perguntas pequenas a desconhecidos | repete o nome em silêncio | memoriza mal com ruído | um nome aprendido tarde |
| Aleksandr Gromov | reconhece máquinas pelo ruído | guarda a chave sem dar conta | quer recuperar cada metro | protege a saída possível |
| Owen Mercer | anota ordens como listas | dobra a folha sempre igual | espera confirmação | decide com informação incompleta |
| Ivan Demin | lê indicadores, não vozes | bate na escotilha | mede êxito por alvos | conta tripulações que saíram |
| Edward Lane | resolve escolhendo outra estrada | ajusta o espelho | acredita que vê tudo | escuta junto das sebes |
| Ben Turner | acompanha os LVTs da frente | aperta a correia molhada | quer chegar sozinho à praia | abre lugar para os outros |
| Leon Ostrowski | lê o envelope antes de subir | muda a carta de bolso | pensa no texto a escrever | guarda o tempo para salvar |
| Nathan Cole | toca no ombro, respostas curtas | guarda o cordel do salto | quer reunir a companhia inteira | liga dois grupos concretos |
| Victor Allen | consulta o mapa em vez de admitir | marca paragens sem coordenadas | vergonha de perder o norte | pede confirmação |
| Paul Lewis | ouve o rádio de rotina | escreve rotas limpas | confia nos relatórios | comunica o que sabe sem inventar |
| Isaac Bennett | guarda coisas para outros | deixa uma mão livre e fria | acredita que verá o homem na volta | objetos para os vivos |
| Leo Finch | memoriza o Suribachi | recolhe sem exibir | mede sucesso pela linha de areia | pelo trânsito dos outros |
| Carl Hughes | habituado a ordens de marcha | mão no guarda-corpo | estranha a pausa | manter passagem também decide |
| William Cross | escuta ordens antes de anúncios | confere um encaixe | procura instruções | fica imóvel a ouvir a água |

---

## 9. Cutscenes: contrato (complementam, nunca contradizem)

- Toda a cutscene tem `skipEndState` consistente, duração máxima, beats com `t`, `lineVariants` por flag, e retorno de controlo no local certo (Prompt §74; `mission.json` de M01 como modelo).
- Primeira pessoa com olhar livre por defeito; câmara externa só em M05 (escala do voo), M13 (exterior do tanque em momentos seguros) e M30 (cerimónia) — todas [C].
- Nenhuma cutscene mostra o resultado de uma escolha antes de a escolha ocorrer; nenhuma duplica eventos no skip; nenhuma mostra personagem morta/evacuada.
- Montagens de transição: 8–20 s, cartela de data/local/unidade, skip; sem mapa com setas.

---

## 10. Critérios de qualidade da campanha (para o Capitão, PR #44 §9 + brief)

1. O jogador distingue 30 experiências pela situação e pelas pessoas, não pelo HUD.
2. Consegue dizer, em cada missão, **quem fez o quê e quem tentou impedir**.
3. Os mesmos personagens mudam de aparência/atuação entre anos; nenhum retorno ignora ausências.
4. Há agência real onde há escolha; os limites históricos são reconhecíveis.
5. Pelo menos um momento por missão é memorável sem depender da maior explosão.
6. A opção de violência reduzida conserva o significado.
7. Civis, capturados e rendidos obedecem ao contrato de não-recompensa.
8. Nenhuma nota 10/10 é automática: a qualidade só se afirma com playtest humano e evidência em runtime.
