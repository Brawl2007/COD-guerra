# M12 — PRIMEIRO SANGUE · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** 20/2/1943, passagem de Kasserine, Tunísia; elementos do 26.º Regimento de Infantaria, 1.ª Divisão, II Corpo dos EUA; POV Owen Mercer; fonte H12; 20–27 min; três falas; checkpoints "posição inicial; ruptura do flanco; reunião dos feridos; transporte final"; o título refere-se à experiência de Mercer (não "primeiro combate dos EUA"); sem destruir todos os tanques; sem vitória americana inventada. **Proposto:** 1.º Batalhão do 26.º (Stark Force, S-C13; RECONSTRUÇÃO, P-C12), retirada pela estrada de Thala, relógio ancorado na rutura a meio da tarde, elenco, flags.

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m12_kasserine` / 12 |
| Datas | 1943-02-20T09:00+01:00 → 1943-02-20T19:30+01:00 |
| Local | posição improvisada na encosta baixa do Djebel Semmama (lado norte/leste da passagem) → acesso da estrada no fundo do vale (rio Hatab) → bifurcação a norte (estrada de Thala) → ponto de reunião — `RECONSTRUCTED` (P-C12) |
| Operação | Stark Force (1/26.º, 19.º Eng., artilharia, TD, bateria francesa) defende a passagem; 20/2 de manhã 10.ª Pz + Centauro; rutura a meio da tarde; retirada caótica; regrupamento em Thala; passagem recuperada 25/2 (D em resumo, S-C13) |
| Unidade | 26.º Reg., 1.ª DI (canónico) → 1.º Btl. (R) → secção ficcional |
| Elenco | Mercer (POV, pfc), sgt. Frank Delgado (graduado; a lista), T/5 Ray Boucher (motorista), pvt. Ike Ballard (o acusador), cpl. Ben Yates (19.º Eng.), T/5 Harold Sims (socorrista) (propostas) |
| Fora de cena | col. Stark, gen. Fredendall, Rommel |
| Intocável | data, unidade, POV, falas `dlg_m12_001–003`, checkpoints, resultado (passagem perdida; retirada; reorganização), "uma perda não é apagada pelo debrief" |

---

## 1. Story Bible

**Logline.** Mercer anota ordens como listas e espera confirmação. Em Kasserine, o telefone não responde, dois relatos sobre o vale contradizem-se, o flanco cede fora do olhar, e a única certeza é um camião com o motor ligado que ainda pode levar dois. No ponto de reunião, Delgado refaz a lista e deixa linhas em branco.

**As oito respostas.**
1. **Situação central:** a primeira derrota; romper e retirar sem se desfazer.
2. **Modo de contar:** a lista no bloco de Delgado (nomes que chegaram; linhas em branco).
3. **Objeto:** a folha de ordens dobrada de Mercer (sempre na mesma sequência; no fim, não consegue preencher os nomes).
4. **Silêncio:** o telefone de campanha mudo ("Pare de esperar resposta.").
5. **Tarefa que não é matar:** levar munição/informação; decidir a ordem de saída; recuperar material; carregar feridos ao camião.
6. **Custo humano:** dois grupos pedem passagem no cruzamento (causa: escassez de transporte) → Ballard acusa o outro grupo de fuga / Mercer ordena a prioridade pela via realmente aberta → `m12.groups_evacuated`; a lista fica incompleta.
7. **Pessoas históricas:** fora de cena.
8. **Debrief:** regista a perda da passagem, a retirada para Thala, a recuperação a 25/2, a reorganização; "sem inventar vitória".

**Três motivos.** (a) *Informação incompleta* — a desorganização é narrativa, não IA burra; (b) *a via aberta* — a decisão certa é a que a rota permite; (c) *a lista* — contar os que chegaram.

**Temas.** Dependência de ordens; medo que vira acusação; liderança sem certeza; a derrota como aprendizagem.

**Estrutura (§54).** CONTEXTO → INTRO (posição improvisada; fios cortados; dois relatos) → APROXIMAÇÃO (munição à posição; observar o vale) → DIÁLOGO (Delgado e o telefone) → PRIMEIRO CONTATO (defesa do acesso) → ESCALADA (o flanco cede fora de vista) → COMBATE PRINCIPAL (ordem de retirada; reunir; material; feridos) → SET-PIECE (o cruzamento; dois grupos) → PAUSA (motor ligado) → CLÍMAX (cobrir o último camião; retirar pela rota aberta) → CONSEQUÊNCIA (a lista) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Mercer | listas; espera confirmação | Delgado; Boucher | o flanco; o cruzamento | decide com informação incompleta | não preenche os nomes |
| Delgado | "Pare de esperar resposta." (001) | secção | a lista | — | linhas em branco |
| Boucher | motor ligado | — | "Então tragam os dois." (003) | — | `m12.boucher_status` |
| Ballard | medo → acusação | — | o cruzamento | cala-se | `m12.ballard_deescalated` |
| Yates | engenheiro virado infantaria | — | — | — | vivo |
| Sims | socorrista | feridos | — | — | vivo |

**O que a missão recusa.** IA aliada incompetente; vitória local; massacre inventado; escolha moral fabricada só para punir; destruir todos os tanques; Stark/Fredendall em cena.

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "Dois relatos" (`cs_m12_intro`, ≤ 80 s)
2 09:00 · 3 posição improvisada: buracos na encosta baixa, fios de telefone cortados, caixas · 4 manhã fria de fevereiro, céu baixo, lama recente · 5 Mercer, Delgado, Boucher (camião a 80 m), Ballard, Yates, Sims; dois mensageiros · 6 Cartela: PASSAGEM DE KASSERINE, TUNÍSIA — 20 DE FEVEREIRO DE 1943 — 09:00 · 26.º REGIMENTO · 1.ª DIVISÃO DE INFANTARIA. Dois relatos contraditórios sobre a estrada do vale (um mensageiro: "tanques na estrada"; outro: "só infantaria, a oeste"); o telefone não responde à encosta; Delgado: "Não temos contato com a encosta. Pare de esperar resposta." (001). Mercer dobra a folha de ordens. · 7 a desorganização como narrativa · 8 olhar; dobrar a folha (gesto) · 9 — · 10 — · 11 — · 12 fios cortados, um canhão de 37 mm abandonado, lama · 13 `dlg_m12_001` (canónica), `010–014` · 14 vento frio; telefone (silêncio); motor ao ralenti · 15 beat: o telefone (2 s) · 16 `missionStart` · 17 Delgado: "Munição." · 18 `cp_m12_a_posicao_inicial` · 19 skip · 20 —

### Cena 2 — "O vale" (jogável; `obj_m12_carry_observe`)
2 09:10–10:30 · 3 encosta → posição avançada com vista para o fundo do vale (estrada, rio Hatab, Djebel Chambi em frente) · 4 nuvens; luz plana · 5 Mercer, Yates; posição avançada · 6 Levar munição/informação à posição avançada; observar a aproximação pela via real do vale: poeira, pequenas patrulhas a recuar, ordens sucessivas — descobrir qual aproximação está realmente sob ameaça · 7 §79 ponto 1 + PR #44 · 8 carrega; observa (binóculos sem HUD); relata · 9 — · 10 posição avançada relata; patrulhas recuam · 11 primeiras sondas (dados); morteiros · 12 poeira a sul · 13 `dlg_m12_015–018` · 14 motores ao longe; morteiros · 15 livre · 16 CP-A · 17 ameaça identificada (`evt_m12_threat_identified`) · 18 — · 19 [A] · 20 —

### Cena 3 — "O acesso" (jogável; `obj_m12_defend_access`)
2 10:30–13:30 (`readyScale` entre vagas) · 3 acesso da estrada; posições de infantaria, engenheiros (Yates) e um TD (M3 GMC) · 4 nuvens · 5 secção; engenheiros; TD; artilharia · 6 Defender o acesso junto de infantaria, engenheiros e apoio; as limitações de coordenação aparecem em ordens e atrasos (o apoio chega tarde; o TD recua por ordem), sem IA incompetente; a defesa funciona sem Mercer ser o único atirador · 7 §79 ponto 2 · 8 dispara a infantaria (100–400 m); leva uma mensagem ao TD; cobre Yates · 9 — · 10 engenheiros combatem como infantaria; TD dispara a tanques a 800 m e recua por ordem · 11 infantaria italiana/alemã; Pz IV ao longe (proxies) · 12 crateras; um camião a arder · 13 `dlg_m12_019–023` · 14 TD; morteiros; motores · 15 livre · 16 threat_identified · 17 **14:00** flanco cede (`evt_m12_flank_collapse`) · 18 — · 19 [A]; [C] blindados proxies · 20 —

### Cena 4 — "O flanco cede" (`cs_m12_flank`, ≤ 25 s; jogável depois)
2 14:00–14:30 · 3 acesso; o lado dos engenheiros a oeste · 4 — · 5 secção; homens a recuar · 6 Uma posição lateral cede **fora do espaço do jogador**: ausência de comunicações, chegada de homens a recuar, mudança dos tiros no flanco; mensageiro: a passagem está a cair; ordem de retirada para a bifurcação a norte · 7 §79 ponto 3 · 8 reposiciona; cobre os que recuam · 9 — · 10 Delgado reorganiza; Ballard acusa os que recuam ("fugiram") · 11 pressão de flanco · 12 — · 13 `dlg_m12_024–028` · 14 tiros a mudar de lado · 15 beat: homens a recuar (3 s) · 16 flank_collapse · 17 ordem de retirar · 18 `cp_m12_b_ruptura_flanco` · 19 [A] · 20 —

### Cena 5 — "Reunir, recuperar, carregar" (jogável; `obj_m12_rally_wounded`)
2 14:30–16:00 · 3 do acesso à bifurcação (600 m); veículos avariados; feridos · 4 nuvens; luz a baixar · 5 secção; Sims; tripulações a abandonar veículos · 6 Reunir sobreviventes, recuperar material útil alcançável (uma caixa de munição, um rádio), remover feridos para transporte (camião de Boucher: motor ligado); tripulações deixam veículos avariados (fogo, ferimentos) · 7 §79 ponto 4 · 8 carrega feridos (2) ao camião; recupera material (opcional) · 9 material vs tempo · 10 Sims; Boucher; tripulações · 11 pressão; artilharia · 12 half-track avariado; jeep tombado · 13 `dlg_m12_029–033` · 14 motor; artilharia · 15 livre · 16 ordem · 17 2 feridos no camião · 18 `cp_m12_c_reuniao_feridos`; `m12.equipment_recovered` · 19 [A] carriedBy · 20 —

### Cena 6 — "O cruzamento" (`cs_m12_crossroads`, ≤ 40 s; jogável) — **custo humano + decisão**
2 16:00–16:30 · 3 bifurcação (Thala a norte, Tébessa a oeste) · 4 luz baixa · 5 Mercer, Delgado, Boucher (camião), Ballard; dois grupos (A: três feridos que não andam, com Sims; B: homens da encosta com equipamento) · 6 Dois grupos pedem passagem; o camião ainda pode levar dois (Mercer, 002); Ballard acusa o grupo B de fuga; Mercer ordena a prioridade segundo a via realmente aberta (a estrada de Thala está aberta; a de Tébessa já não — mensageiro): primeiro os que não andam; o grupo B segue a pé pela estrada de Thala com a secção; Boucher: "Então tragam os dois. Estamos saindo." (003) · 7 §79 ponto 5 + PR #44 · 8 ordena (interação: escolher ordem); ambos saem se a rota e o tempo permitirem (a segunda viagem do camião existe: agenda) · 9 ordem · 10 Ballard cala-se à ordem de Delgado; Boucher parte e volta (agenda 12 min) · 11 pressão a aproximar-se · 12 — · 13 `dlg_m12_002`, `003` (canónicas), `034–038` · 14 motor; discussão · 15 beat: o motor ligado (2 s) · 16 CP-C · 17 primeira viagem parte · 18 `m12.order_chosen`, `m12.ballard_deescalated` · 19 [B] escolha; [C] camião com agenda · 20 —

### Cena 7 — "Último transporte" (jogável; clímax; `obj_m12_cover_last_truck`)
2 16:30–18:00 · 3 bifurcação → 400 m da estrada de Thala · 4 crepúsculo · 5 secção; grupo B a pé; camião na segunda viagem · 6 Cobrir o último transporte e retirar pela rota ainda aberta; não destruir tanques: um Pz IV aparece na estrada do vale a 600 m (proxy) e a secção retira por lances sob cobertura do TD que ainda dispara duas vezes e recua · 7 §79 ponto 5 · 8 cobertura por lances; suprime infantaria; não dispara a tanques · 9 — · 10 Delgado; Boucher volta; grupo B · 11 infantaria; Pz IV (proxy) · 12 estrada com veículos abandonados · 13 `dlg_m12_039–043` · 14 motor; tanque · 15 livre · 16 primeira viagem · 17 segunda viagem parte com os últimos (`evt_m12_last_truck`) · 18 `cp_m12_d_transporte_final`; `m12.groups_evacuated` · 19 [A] · 20 —

### Cena 8 — "A lista" (`cs_m12_outro`, ≤ 60 s) + debrief
2 18:00–19:30 · 3 ponto de reunião na estrada de Thala (oliveiras, uma quinta) · 4 noite a cair; frio · 5 secção; feridos; Delgado · 6 Delgado refaz a lista do grupo no bloco; Mercer tenta preencher a sua folha e deixa nomes em branco; uma perda (Yates, ferido grave e evacuado? **não** — Yates morto na retirada: evento fixo `evt_m12_yates_killed` na cena 7, por tiro real sem possibilidade de intervenção; a cena mostra-o claramente) não é apagada. Cartela: Thala; 25/2 passagem recuperada. · 7 consequência canónica · 8 skip · 9 — · 10 — · 11 — · 12 o bloco; a folha · 13 `dlg_m12_044–046` · 14 vento; motor a arrefecer · 15 beat: linhas em branco (4 s) · 16 last_truck · 17 debrief · 18 `m12.completed`; `m12.list_complete = false` (sempre) · 19 — · 20 M22 ecoa a lista (forma, não pessoa).

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m12_carry_observe` | Leve munição à posição avançada e observe o vale | sim | intro | caixa + 2 relatos | — | — | A |
| `obj_m12_defend_access` | Defenda o acesso com a infantaria e os engenheiros | sim | threat | 14:00 | posição invadida → restaurar A | — | — |
| `obj_m12_cover_retreating` | Cubra os que recuam do flanco | sim | flank_collapse | ordem | — | — | B |
| `obj_m12_rally_wounded` | Reúna sobreviventes e leve os feridos ao camião | sim | ordem | 2 feridos | — | — | C |
| `obj_m12_recover` | Recupere material alcançável | opcional | ordem | rádio/caixa | — | `equipment_recovered` | — |
| `obj_m12_order_groups` | Decida a ordem de saída | sim | C | escolha | — | `order_chosen` | — |
| `obj_m12_cover_last_truck` | Cubra o último transporte e retire pela rota aberta | sim | 1.ª viagem | last_truck | ficar para trás (aviso 3×) → restaurar C | `groups_evacuated` | D |

### 3.2 Setores
`s1_slope_access` (perto) · `s2_fork_road` (perto) · `s3_engineers_flank` (médio: o lado que cede, fora de vista) · `s4_valley` (médio/longe: colunas, tanques, TD, artilharia) · `s5_passes` (longe: movimentos para Thala/Tébessa). Agendas: sondas 10:30; vagas 11:30/12:30; flanco cede 14:00; Pz IV na estrada 16:40; camião 2 viagens.

### 3.3 Checkpoints
A posição inicial · B ruptura do flanco · C reunião dos feridos (camião carregado) · D transporte final.

### 3.4 Justiça
Tanques nunca alvo obrigatório; TD com agenda própria; ambos os grupos podem sair; nunca "escolher um condenado"; Yates morre por tiro real em evento fixo (sem janela falsa).

---

## 4. Set pieces

### SP-12-1 "Pare de esperar resposta"
Contexto: posição improvisada. Preparação: dois relatos; fios cortados. Experiência: observar o vale e decidir o que é verdade. Companheiros: Delgado; mensageiros. Ambiente: canhão de 37 mm abandonado. Evolução: a ameaça identifica-se. Clímax: —. Consequências: —. Requisitos: [A]. Integração: `obj_m12_carry_observe`.

### SP-12-2 "O camião ainda pode levar dois"
Contexto: bifurcação. Preparação: feridos carregados; Ballard a acusar desde o flanco. Experiência: ordenar; o motor ligado; o camião parte e volta. Companheiros: Boucher; Sims; grupo B. Ambiente: estradas de Thala/Tébessa. Evolução: segunda viagem. Clímax: fala 003. Consequências: `order_chosen`. Requisitos: [B] escolha; [C] camião. Integração: `obj_m12_order_groups`.

### SP-12-3 "Rota aberta"
Contexto: estrada de Thala ao crepúsculo. Preparação: Pz IV no vale. Experiência: retirar por lances; TD dispara e recua; Yates cai. Companheiros: Delgado; grupo B. Ambiente: veículos abandonados. Evolução: a segunda viagem. Clímax: o último camião. Consequências: `groups_evacuated`; Yates. Requisitos: [A]. Integração: `obj_m12_cover_last_truck`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| posição 09:00 | buracos, fios cortados, 37 mm abandonado, lama | mensageiros | telefone mudo | — | Mercer dobra a folha | — |
| vale | estrada, rio, poeira | patrulhas a recuar | — | sondas | — | — |
| acesso | posições, TD, engenheiros | TD dispara/recua | — | vagas | Yates | camião a arder |
| flanco | — | homens a recuar | — | pressão | Ballard acusa | — |
| estrada | half-track avariado, jeep tombado | tripulações saem | — | artilharia | Sims | material |
| bifurcação | sinal Thala/Tébessa | camião | dois grupos | — | Boucher | — |
| reunião | oliveiras, quinta | lista | — | — | Delgado | linhas em branco |

Objetos com origem: o 37 mm sem culatra (bateria recuada à pressa), o half-track (10.ª Pz atingiu-o às 13:00), o bloco de Delgado (lista de 19/2 riscada), a folha de Mercer.

---

## 6. Diálogos (VO inglês americano)

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Delgado | "Não temos contato com a encosta. Pare de esperar resposta." (§79) | intro t 30 | 1 | — |
| 002 | Mercer | "O caminhão ainda pode levar dois." (§79) | cruzamento | 1 | — |
| 003 | Boucher | "Então tragam os dois. Estamos saindo." (§79) | 002 + 2 s | 1 | — |
| 010 | mensageiro 1 | "Tanques na estrada do vale. Vi-os." (V1) | intro t 6 | 2 | — |
| 011 | mensageiro 2 | "Só infantaria. A oeste. Os tanques são nossos." (V1) | intro t 10 | 2 | — |
| 012 | Ballard | "Qual deles mente?" (V1) | intro t 14 | 3 | — |
| 013 | Delgado | "Nenhum. Os dois viram pouco." (V1) | 012 | 2 | — |
| 014 | Boucher | "O motor está a trabalhar. Não o quero desligar." (PR #44) | intro t 40 | 3 | — |
| 015 | Yates | "Somos engenheiros. Hoje somos o que for preciso." (V1) | vale | 3 | — |
| 016 | posição avançada | "Poeira a sul. Patrulha nossa a recuar." (V1) | observação | 1 | — |
| 017 | Delgado | "Diz-me o que vês. Não o que te disseram." (V1) | relato | 1 | — |
| 018 | posição avançada | "É pela estrada. Tanques e infantaria. Confirmado." (V1) | threat | 1 | — |
| 019 | Delgado | "Acesso. Engenheiros à esquerda, TD atrás. Não é só o Mercer que atira." (V1) | defesa | 1 | — |
| 020 | TD (voz) | "Dois tiros e recuo. Ordens." (V1) | TD | 2 | — |
| 021 | Ballard | "Recuam?! Já?!" (V1) | TD recua | 2 | — |
| 022 | Delgado | "Ordens. Não é fuga. Aprende a diferença." (V1) | 021 | 1 | — |
| 023 | Yates | "Morteiros! Buracos!" (V1) | morteiros | 0 | 20 |
| 024 | mensageiro | "O lado dos engenheiros caiu. A passagem está a cair." (V1) | flank | 1 | — |
| 025 | Ballard | "Fugiram! Deixaram-nos!" (V1) | homens a recuar | 2 | — |
| 026 | Delgado | "Cala-te e cobre-os." (V1) | 025 | 1 | — |
| 027 | Delgado | "Ordem: bifurcação a norte. Reunir, feridos, material se der." (V1) | ordem | 1 | — |
| 028 | Mercer | "Eu não sei tudo. Sei qual camião ainda pode sair." (PR #44) | ordem + 4 s | 2 | — |
| 029 | Sims | "Dois que não andam. Precisam do camião." (V1) | feridos | 1 | — |
| 030 | tripulação | "Half-track foi-se. Vamos a pé." (V1) | veículo | 2 | — |
| 031 | Delgado | "Rádio na caixa do jeep. Se der. Se não der, deixa." (V1) | material | 2 | — |
| 032 | Boucher | "Carrega e vai. Estou a contar." (V1) | feridos no camião | 1 | — |
| 033 | Sims | "Devagar com o segundo." (V1) | 2.º ferido | 2 | — |
| 034 | Delgado | "Dois grupos. Um camião. Mercer: decide pela estrada que existe." (V1) | cruzamento | 1 | — |
| 035 | mensageiro | "Tébessa está fechada. Thala aberta." (V1) | cruzamento | 1 | — |
| 036 | Ballard | "Esses só querem fugir!" (V1) | grupo B | 2 | — |
| 037 | Delgado | "Mais uma e vais a pé. Entra primeiro o grupo que não consegue andar." (V1, PR #44 adaptada) | 036 | 1 | — |
| 038 | Boucher | "Doze minutos e volto. Não me deixem sozinho na estrada." (V1) | parte | 1 | — |
| 039 | Delgado | "Tanque na estrada do vale. Não é nosso. Lances para norte." (V1) | Pz IV | 0 | — |
| 040 | TD (voz) | "Último tiro. Vou." (V1) | TD | 2 | — |
| 041 | Yates | (atingido; sem fala) — Sims: "Yates!" (V1) | `evt_m12_yates_killed` | 1 | — |
| 042 | Delgado | "Não parem. Ele fica. Nós não." (V1) | 041 + 3 s | 1 | — |
| 043 | Boucher | "Entrem! Todos!" (V1) | 2.ª viagem | 0 | — |
| 044 | Delgado | "Escreva os que chegaram. Os outros ficam por confirmar." (PR #44) | outro | 1 | — |
| 045 | Mercer | (folha; sem fala) | — | — | — |
| 046 | Ballard | "…Desculpa. Pelo que disse." (V1) | outro | 3 | — |

Callouts: `co_m12_mortars`, `co_m12_tank_road`, `co_m12_truck_leaving`. Silêncios: telefone mudo; o motor ligado (2 s).

---

## 7. Arte e atmosfera

**Paleta:** pedra fria cinzenta, lama castanha, oliveira, caqui, céu baixo; nada de "deserto amarelo". **Luz:** 09:00 céu encoberto (luz plana), 14:00 nuvens com aberturas, 17:30 crepúsculo frio, 19:00 noite. **Materiais:** calcário, lama, lona de camião, metal. **Silhuetas:** Djebel Semmama e Chambi, a bifurcação, veículos abandonados. **Destruição:** camião a arder, half-track, jeep tombado (persistentes). **Humanos:** M41, capacete M1, lama; Yates com braçadeira de engenheiro. **Violência reduzida:** Yates sem close.

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| posição | vento frio, folha de papel, telefone mudo | motor ao ralenti | — | **obrigatório** (telefone) |
| vale | binóculos, morteiros | patrulhas | motores | — |
| acesso | Garand, BAR, TD (75 mm) | vagas | artilharia | — |
| flanco | tiros a mudar de lado | homens a recuar | — | — |
| estrada | motor, feridos | artilharia | — | — |
| bifurcação | discussão, motor | — | tanque | 2 s (motor) |
| reunião | vento; motor a arrefecer | — | — | — |

Sons novos: telefone EE-8 (mudo), camiões GMC/Dodge, M3 GMC, Pz IV a média distância. VO inglês.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| Stark Force (1/26.º, 19.º Eng., TD, artilharia, bateria francesa) na passagem; 3/26.º a oeste | D (resumo) | H12; S-C13 | leitura |
| Rutura a meio da tarde de 20/2; retirada para Thala | D (resumo) | S-C13 | hora P-C12 |
| 19.º Eng. 117 baixas a 20/2 | D (resumo) | S-C13 | — |
| Passagem recuperada 25/2 | D | S-C13 | — |
| Posição exata de 1/26.º; Semmama | R | — | P-C12 |
| Clima (frio, lama) | R | — | — |
| Mercer, Delgado, Boucher, Ballard, Yates, Sims | F | — | — |

**Proibições:** vitória local; "primeiro combate dos EUA"; Tébessa como rota da secção (fechada no roteiro); Stark em cena. **Fora de cena:** Stark, Fredendall, Rommel.

---

## 10. Handoff técnico

**Contrato:** `id m12_kasserine`, `order 12`, relógio 09:00→19:30 com `readyScale` entre vagas, grupos (`grp_section`, `grp_forward_post`, `grp_engineers`, `grp_td`, `grp_group_a`, `grp_group_b`, `grp_truck`, `grp_axis_infantry`, `grp_axis_armor`), setores, checkpoints A–D, cutscenes (intro, flank, crossroads, outro), falas, flags, debrief.

**Flags:** `m12.completed`, `m12.threat_identified`, `m12.equipment_recovered`, `m12.order_chosen`, `m12.ballard_deescalated`, `m12.boucher_status`, `m12.groups_evacuated (0–2)`, `m12.yates_status = dead` (fixo), `m12.list_complete = false`.

**Sistemas:** [A] simulação, fogo como dados, carriedBy, rotação por salvas; [B] escolha de ordem; [C] camião com agenda (2 viagens), TD e Pz IV como proxies com eventos. [D] nenhum.

**Disciplinas:** Level: encosta, acesso, 600 m de estrada, bifurcação, reunião; Combate/IA: vagas e flanco por evento; Arte: Tunísia em fevereiro (lama); Personagens: americanos 1943 (6), italianos/alemães; Animação: carregar ao camião, folha; Som: TD/camiões; VO: inglês; Historiador: P-C12; QA: `groups_evacuated` 0/1/2; Yates fixo; lista nunca completa.

**Testes:** flanco cede sempre às 14:00; ambos os grupos podem sair; nunca falha por ficar sem camião (3 avisos → restauro C); `list_complete` sempre false.

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| Dois relatos; telefone mudo | (intro) | dobrar a folha | Delgado | — | start | CP-A |
| Observar o vale | `obj_m12_carry_observe` | carregar; relatar | patrulhas recuam | poeira | A | threat |
| Defender o acesso | `obj_m12_defend_access` | disparar; mensagem ao TD | TD dispara/recua; engenheiros | camião a arder | threat | — |
| O flanco cede | `obj_m12_cover_retreating` | cobrir | Ballard acusa; Delgado | — | 14:00 | CP-B |
| Reunir, material, feridos | `obj_m12_rally_wounded/recover` | carregar; recuperar | Sims; tripulações | veículos abandonados | ordem | CP-C |
| O camião leva dois | `obj_m12_order_groups` | ordenar | Boucher parte/volta; Ballard cala | — | C | `order_chosen` |
| Rota aberta | `obj_m12_cover_last_truck` | lances; não disparar a tanques | TD último tiro; Yates cai | — | 1.ª viagem | CP-D |
| A lista | debrief | — | Delgado escreve | linhas em branco | last_truck | `m12.completed` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 8 | informação incompleta e a lista. |
| 2 | Autenticidade | 7 | Stark Force D em resumo; posição P-C12. |
| 3 | Personagens | 7 | Delgado e Boucher; Ballard é um traço com arco mínimo (desculpa). |
| 4 | Diálogos | 8 | "Aprende a diferença." |
| 5 | Originalidade | 7 | retirada com decisão real; ecoa M04 (lugares) mas por via, não por tempo. |
| 6 | Variedade | 8 | observar, defender, cobrir recuo, reunir, decidir, retirar. |
| 7 | Set pieces | 7 | — |
| 8 | Atmosfera | 7 | lama fria; sem "deserto". |
| 9 | Environmental storytelling | 7 | veículos abandonados; folha e bloco. |
| 10 | Cinematográfica | 7 | — |
| 11 | Sonora | 7 | telefone mudo. |
| 12 | Impacto emocional | 7 | linhas em branco; Yates. |
| 13 | Ritmo | 8 | 20–27 min com `readyScale`. |
| 14 | Continuidade | 7 | isolada; eco formal em M22. |
| 15 | Integração técnica | 8 | quase tudo [A]; camião/TD [C] simples. |

**Correções aplicadas:** (1) a perda da secção (Yates) tornou-se evento fixo por tiro real com a cena a dizê-lo, em vez de dependente de falha do jogador; (2) Tébessa fechada por mensageiro para a decisão ter base real; (3) ambos os grupos podem sair (segunda viagem) — sem "condenado".
