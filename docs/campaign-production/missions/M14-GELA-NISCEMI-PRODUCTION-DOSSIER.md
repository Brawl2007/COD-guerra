# M14 — ESTRADAS SICILIANAS · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** 14/7/1943, eixo Gela–Niscemi, Sicília; 16.º Regimento, 1.ª Divisão de Infantaria dos EUA; POV Edward Lane; fonte H14; 18–25 min; três falas; checkpoints "saída; reconhecimento; comboio reorganizado; entrega"; jeep com controlos e passageiros reais; sem emboscada em cada curva; ajudar civis opcional e com consequência de fala; a entrega conclui o objetivo local. **Proposto:** comboio de abastecimento de Gela para Niscemi **no dia seguinte à tomada** (13/7 pela história oficial, 14/7 por cronologias — S-C14, sem conflito com a data canónica), elenco de Lane (§73 + propostas), família Scirè, relógio, flags. **Sistema:** jeep jogável [C] — bancada do Marco 4.

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m14_gela_niscemi` / 14 |
| Datas | 1943-07-14T07:00+02:00 → 1943-07-14T13:00+02:00 |
| Local | estrada estreita a norte de Gela → passagem bloqueada num aqueduto → caminho de quinta (masseria) → olival → quinta da família Scirè (a estrada passa pelo pátio) → arredores de Niscemi (posto de comando/socorro) — `RECONSTRUCTED` (troço P-C14) |
| Operação | consolidação após o contra-ataque HG (11–12/7) e a tomada de Niscemi (13/7 ou 14/7); eixo Piano Lupo–Niscemi (D, S-C14) |
| Unidade | 16.º Reg., 1.ª DI (canónico) → Companhia E, secção de Lane |
| Elenco | Lane (POV, motorista), sgt. Luis Morgan, pfc. Marcus Bell (metralhadora .30 no segundo jeep), T/5 Samuel Price (socorrista) (§73); pvt. Joey Castellano (fala dialeto, traduz mal), pvt. Hank Doyle (recruta); família Scirè: Salvatore, Concetta, Nino (12); segundo grupo (jeep + camião) (propostas) |
| Fora de cena | gen. Terry Allen, gen. Patton |
| Intocável | data, unidade, POV, falas `dlg_m14_001–003`, checkpoints, "não conquistar a ilha inteira", família sem casa no fim, Price sem exigir gratidão |

---

## 1. Story Bible

**Logline.** Um jeep, uma estrada estreita, quatro caixas de suprimento, cinco homens que ainda não conhecem bem a guerra e uma família cuja casa fica no meio da rota. Lane ajusta o espelho e aprende que o problema nem sempre se resolve escolhendo outra estrada.

**As oito respostas.**
1. **Situação central:** um jeep, uma estrada, civis, suprimento.
2. **Modo de contar:** caixas entregues (4 → integridade da carga).
3. **Objeto:** o espelho do jeep (Lane ajusta-o antes de partir; depois de Omaha deixará de procurar uma vista completa).
4. **Silêncio:** o comboio parado no olival (cigarras).
5. **Tarefa que não é matar:** conduzir com distância; reconhecer a pé; abrir passagem a civis; entregar.
6. **Custo humano:** um morador tenta atravessar com uma mala quando o comboio se reorganiza (causa: a estrada passa pela casa) → Doyle grita para o afastar / Price pára a discussão e mostra uma rota segura, com a desconfiança dos civis → `m14.civilians_helped`; a família continua sem casa.
7. **Pessoas históricas:** fora de cena.
8. **Debrief:** regista a entrega local, a tomada de Niscemi na véspera, a campanha que continua para norte; "sem conquistar a ilha".

**Três motivos.** (a) *Distância entre os carros* — conduzir é uma disciplina de grupo; (b) *a estrada deles também* — a guerra atravessa um pátio; (c) *vista completa* — Lane acredita que vê tudo pelo espelho.

**Temas.** Mobilidade e orientação; contacto com civis sem gratidão; pequena ajuda concreta; a confiança de Morgan.

**Estrutura (§54).** CONTEXTO → INTRO (comboio parado; espelho; Price e o pé) → APROXIMAÇÃO (condução; curvas) → DIÁLOGO (Morgan: "Distância entre os carros.") → PRIMEIRO CONTATO (passagem bloqueada; reconhecimento a pé) → ESCALADA (contacto pontual no olival) → COMBATE PRINCIPAL (proteger carga e passageiros; alternar) → SET-PIECE (a quinta Scirè; a mala; Price) → PAUSA (olival; cigarras) → CLÍMAX (entrega com o segundo grupo a cobrir) → CONSEQUÊNCIA (família na casa alheia) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Lane | ajusta o espelho; "outra estrada" | Morgan (confiança), Price | a passagem bloqueada; a família | começa a ouvir junto dos muros | entrega; vê a família |
| Morgan | distribui posições | secção | a carga | mede Lane | `m14.morgan_trust (0–2)` |
| Bell | confere munição; .30 | — | contacto | — | vivo |
| Price | atende o pé; "Podem ficar aqui…" (003) | civis | a mala | — | vivo |
| Castellano | dialeto | família | traduz mal | — | `m14.castellano_status` |
| Doyle | recruta | — | grita ao morador | aprende | vivo |
| família Scirè | desconfiança | ninguém | a casa no meio | — | sem casa |

**O que a missão recusa.** Câmara a atravessar o cenário; emboscada por curva; civis gratos; conquistar Niscemi (já tomada); Patton em cena.

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "Espelho" (`cs_m14_intro`, ≤ 70 s)
2 07:00 · 3 estrada estreita entre muros de pedra; comboio de 2 jeeps e 1 camião parados · 4 sol baixo a leste; poeira; cigarras · 5 Lane, Morgan, Bell, Price, Castellano, Doyle; segundo grupo · 6 Cartela: EIXO GELA–NISCEMI, SICÍLIA — 14 DE JULHO DE 1943 — 07:00 · 16.º REGIMENTO · 1.ª DIVISÃO DE INFANTARIA. Morgan distribui posições; Bell confere munição; Price atende um homem com o pé ferido (do camião). Lane recebe a condução do jeep; ajusta o espelho (gesto); uma pequena marca pessoal de Castellano no painel (uma medalha de São Cristóvão). Morgan: "Distância entre os carros. Não nos amontoem numa curva." (001). · 7 estabelecer jeep, passageiros, espelho · 8 ajustar o espelho (interação); olhar · 9 — · 10 — · 11 — · 12 muros, oliveiras, um cartaz italiano · 13 `dlg_m14_001` (canónica), `010–013` · 14 motor do jeep; cigarras · 15 primeira pessoa no banco; beat: o espelho (2 s) · 16 `missionStart` · 17 Morgan: "Vamos." · 18 `cp_m14_a_saida` · 19 skip · 20 —

### Cena 2 — "Distância" (jogável; `obj_m14_drive`)
2 07:05–07:40 · 3 4 km de estrada: curvas, muros, uma ponte pequena, subida · 4 sol · 5 comboio; colunas e patrulhas noutros acessos (proxies) · 6 Conduzir mantendo espaço entre veículos (indicador discreto de distância); curvas físicas; um camião de outra unidade cruza; poeira · 7 §79 ponto 1 · 8 conduz; mantém 30–50 m; evita obstáculos · 9 — · 10 Morgan comenta distância; Bell na .30 · 11 nenhum · 12 um tanque italiano destruído na berma, uma carroça · 13 `dlg_m14_014–017` · 14 motor por regime; pneus; poeira · 15 banco do condutor · 16 CP-A · 17 passagem bloqueada à vista · 18 — · 19 [C] jeep · 20 —

### Cena 3 — "Bloqueio" (jogável; `obj_m14_recon_alt`)
2 07:40–08:40 · 3 aqueduto com cratera e um camião italiano capotado; caminho de quinta a oeste · 4 sol · 5 secção; o camião do comboio pára · 6 Uma passagem é bloqueada; descer, reconhecer uma alternativa a pé (caminho de quinta até uma masseria), informar o grupo; cenário e NPCs indicam porquê (a cratera é de 12/7; o camião italiano) · 7 §79 ponto 2 · 8 desce; reconhece a pé (300 m); encontra um agricultor que aponta (Castellano traduz mal: "diz que o caminho é bom para mulas"); volta e informa (interação) · 9 caminho de quinta vs contornar pelo leito seco (mais longo) · 10 Morgan espera; Bell cobre; Castellano · 11 nenhum ativo · 12 masseria com portão; mulas · 13 `dlg_m14_018–022` · 14 cigarras; mulas · 15 livre a pé · 16 bloqueio · 17 comboio reencaminhado · 18 `cp_m14_b_reconhecimento`; `m14.route` · 19 [A] a pé; [C] regressar ao jeep · 20 —

### Cena 4 — "Olival" (jogável; `obj_m14_protect_convoy`)
2 08:40–09:40 · 3 caminho de quinta entre oliveiras · 4 luz entre oliveiras · 5 comboio; 4 alemães retardatários (HG, deixados para trás) numa posição coerente no olival · 6 Contacto pontual: fogo sobre o camião de suprimento e os passageiros; proteger carga e passageiros; **decisão:** usar o jeep para reposicionar os suprimentos atrás do muro (condução sob fogo) ou ficar a proteger a retaguarda a pé enquanto o grupo cumpre o outro papel · 7 §79 ponto 3 · 8 escolhe; conduz/dispara; Bell com a .30 · 9 jeep vs retaguarda · 10 Morgan assume o papel oposto; Castellano ferido leve (evento) · 11 4 alemães (dados) que recuam/rendem-se? (**não**: recuam; a rendição é de M19) · 12 caixas atingidas (integridade), um pneu · 13 `dlg_m14_023–027` · 14 .30; motor sob fogo · 15 banco/livre · 16 CP-B · 17 retardatários recuam · 18 `cp_m14_c_comboio_reorganizado`; `m14.cargo_integrity (0–4)`, `m14.jeep_damage`, `m14.castellano_status` · 19 [C] jeep; [A] fogo · 20 —

### Cena 5 — "A estrada passa pela casa" (`cs_m14_family`, ≤ 40 s; jogável) — **custo humano**
2 09:40–10:30 · 3 quinta Scirè: a estrada atravessa o pátio; casa com telhado parcialmente destruído · 4 sol alto · 5 secção; família Scirè; outro morador · 6 Moradores procuram afastar-se da estrada; Salvatore atravessa com uma mala quando o comboio se reorganiza; Doyle grita para o afastar; Price pára a discussão e mostra uma rota segura (pelo muro, atrás do camião); a família desconfia; Castellano traduz mal; Morador: "A estrada passa por nossa casa." (002). Abrir passagem segura para o comboio (afastar uma carroça: interação a dois). Ajudar os civis é **opcional**: levar a mala/mostrar o abrigo (Price) → `m14.civilians_helped` · 7 §79 ponto 4 + PR #44 · 8 afasta a carroça; opcional: ajuda · 9 ajudar / não · 10 Price; Doyle cala-se; Nino observa · 11 nenhum · 12 telhado, mala, galinhas · 13 `dlg_m14_002` (canónica), `028–033` · 14 **silêncio obrigatório** (cigarras) antes da discussão · 15 beat: a mala (2 s); Nino (2 s) · 16 CP-C · 17 passagem aberta · 18 `m14.civilians_helped` · 19 [C] civis; [B] interação a dois · 20 M18/M19 (Morgan).

### Cena 6 — "Entrega" (jogável; clímax; `obj_m14_deliver`)
2 10:30–12:00 · 3 do pátio aos arredores de Niscemi (3 km); posto de comando/socorro numa escola · 4 calor · 5 comboio; segundo grupo cobre a via de acesso (independente) · 6 Transportar o material até ao destino enquanto o segundo grupo cobre a via (uma posição alemã residual à distância, resolvida pelo segundo grupo); a entrega conclui o objetivo local; o destinatário confere o suprimento (integridade) · 7 §79 ponto 5 · 8 conduz; mantém distância; entrega (interação) · 9 — · 10 segundo grupo; destinatário conta caixas · 11 posição residual (proxies) · 12 Niscemi com bandeira branca numa janela; soldados a descansar · 13 `dlg_m14_034–038` · 14 motor; cidade · 15 banco · 16 passagem · 17 entrega (`evt_m14_delivered`) · 18 `cp_m14_d_entrega` · 19 [C] · 20 —

### Cena 7 — "A casa dos outros" (`cs_m14_outro`, ≤ 50 s) + debrief
2 12:00–13:00 · 3 escola; ao fundo, uma casa ocupada por uma família deslocada · 4 sol · 5 secção; destinatário; Price com um morador · 6 O destinatário confere o suprimento; Price ajuda um morador (um velho com a perna ligada) sem exigir gratidão: "Podem ficar aqui até o comboio sair." (003); Lane vê uma casa ocupada por uma família que não pode regressar à sua (os Scirè, se `civilians_helped`; outra família, senão). Morgan dá a Lane uma frase conforme `morgan_trust`. · 7 consequência canónica · 8 skip · 9 — · 10 — · 11 — | 12 casa alheia · 13 `dlg_m14_003` (canónica), `039–041` · 14 cidade; nenhuma música · 15 beat: a família (3 s) · 16 delivered · 17 debrief · 18 `m14.completed`; `m14.morgan_trust` · 19 variantes · 20 M18.

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m14_drive` | Conduza mantendo distância | sim | intro | bloqueio | capotar (restaurar A, aviso) | `jeep_damage` | A |
| `obj_m14_recon_alt` | Reconheça uma alternativa a pé e informe | sim | bloqueio | informar | — | `route` | B |
| `obj_m14_protect_convoy` | Proteja a carga e os passageiros | sim | contacto | retardatários recuam | camião destruído → `cargo_integrity = 0` (continua) | `cargo_integrity` | C |
| `obj_m14_open_yard` | Abra passagem pelo pátio | sim | C | carroça afastada | — | — | — |
| `obj_m14_help_civilians` | Ajude a família a sair da estrada | opcional | pátio | mala/abrigo | — | `civilians_helped` | — |
| `obj_m14_deliver` | Entregue o material em Niscemi | sim | passagem | delivered | — | — | D |

### 3.2 Setores
`s1_convoy` (perto) · `s2_other_roads` (médio: patrulhas e comboios noutras estradas por agenda) · `s3_access_road` (médio: segundo grupo e posição residual) · `s4_sky_far` (longe: movimento aéreo, fumo, fogo de apoio pertinente). Agendas: camião cruza 07:20; retardatários 08:50; posição residual 11:00.

### 3.3 Checkpoints
A saída · B reconhecimento · C comboio reorganizado (integridade da carga) · D entrega.

### 3.4 Justiça
Jeep com assistência (física simplificada, sem colisores invisíveis); capotar restaura com aviso; retardatários sempre recuam; família nunca é alvo.

---

## 4. Set pieces

### SP-14-1 "Distância entre os carros"
Contexto: estrada. Preparação: fala 001. Experiência: conduzir com passageiros reais e curvas físicas; um camião cruza. Companheiros: Bell na .30; Morgan comenta. Ambiente: muros, tanque italiano. Evolução: bloqueio. Clímax: —. Consequências: —. Requisitos: [C] jeep. Integração: `obj_m14_drive`.

### SP-14-2 "Olival"
Contexto: caminho de quinta. Preparação: reconhecimento a pé. Experiência: escolher jeep (reposicionar carga sob fogo) ou retaguarda a pé. Companheiros: Morgan faz o oposto. Ambiente: oliveiras, caixas. Evolução: retardatários recuam. Clímax: `cargo_integrity`. Consequências: Castellano ferido leve. Requisitos: [C] jeep sob fogo. Integração: `obj_m14_protect_convoy`.

### SP-14-3 "A mala"
Contexto: pátio Scirè. Preparação: silêncio de cigarras. Experiência: Doyle grita; Price mostra a rota; afastar a carroça. Companheiros: Castellano traduz mal; Nino observa. Ambiente: telhado destruído. Evolução: ajudar ou não. Clímax: fala 002. Consequências: `civilians_helped`. Requisitos: [C] civis. Integração: `obj_m14_open_yard/help_civilians`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| estrada | muros, cartaz italiano, tanque destruído, carroça | comboio | — | — | Price e o pé | — |
| aqueduto | cratera, camião italiano capotado | — | — | — | agricultor, mulas | reencaminhado |
| olival | oliveiras, caixas | — | retardatários | pontual | Castellano | caixas atingidas |
| pátio | telhado, galinhas, mala | — | discussão | — | família | carroça afastada |
| Niscemi | bandeira branca numa janela, soldados a descansar | entrega | posição residual | — | destinatário | — |
| escola | — | — | — | — | família deslocada | — |

Objetos com origem: a medalha no painel (Castellano), o cartaz (propaganda italiana), o tanque (Livorno, 11/7), a cratera (12/7), a mala (os Scirè), a bandeira branca (Niscemi, 13/7).

---

## 6. Diálogos (VO inglês; dialeto siciliano para a família, legendado só quando Castellano "traduz")

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Morgan | "Distância entre os carros. Não nos amontoem numa curva." (§79) | intro t 30 | 1 | — |
| 002 | Morador (Salvatore) | "A estrada passa por nossa casa." (§79; via Castellano) | pátio | 2 | — |
| 003 | Price | "Podem ficar aqui até o comboio sair." (§79) | outro | 1 | — |
| 010 | Price | "Pé. Não é bala, é bota. Descansa no camião." (V1) | intro t 6 | 2 | — |
| 011 | Bell | "Trinta no segundo jeep. Duas caixas." (V1) | intro t 12 | 2 | — |
| 012 | Castellano | "São Cristóvão. Não é para ti, é para o jeep." (V1) | intro t 18 | 3 | — |
| 013 | Morgan | "Lembrem-se: carro carregado vira devagar." (PR #44) | intro t 24 | 1 | — |
| 014 | Morgan | "Cinquenta metros. Nem mais, nem menos." (V1) | distância errada | 1 | 30 |
| 015 | Doyle | "Aquele era italiano?" (V1) | tanque | 3 | — |
| 016 | Bell | "Era. Já não é nada." (V1) | 015 | 3 | — |
| 017 | Morgan | "Camião a cruzar. Encosta." (V1) | camião | 1 | — |
| 018 | Morgan | "Cratera. Reconhecimento a pé. Lane, Castellano." (V1) | bloqueio | 1 | — |
| 019 | agricultor (dialeto) | — Castellano: "Diz que… é bom para mulas. Acho." (V1) | masseria | 2 | — |
| 020 | Lane | — (sem fala; interação "informar") | — | — | — |
| 021 | Morgan | "Caminho de quinta. Mulas aguentam, nós também." (V1) | informar | 1 | — |
| 022 | Doyle | "E se for armadilha?" (V1) | 021 | 3 | — |
| 023 | Bell | "Contacto! Olival, esquerda!" (V1) | fogo | 0 | — |
| 024 | Morgan | "Lane: ou levas o jeep com as caixas para trás do muro, ou ficas na retaguarda comigo a cobrir. Diz." (V1) | decisão | 1 | — |
| 025 | Castellano | (atingido leve) "…ombro. Continua." (V1) | hit | 1 | — |
| 026 | Bell | "Recuam. Não vou atrás." (V1) | recuo | 2 | — |
| 027 | Morgan | "Caixas? Conta." (V1) | reorganizado | 1 | — |
| 028 | Doyle | "Ei! Sai da estrada! Sai!" (V1) | mala | 2 | — |
| 029 | Price | "Pára. Não é nossa estrada apenas. Dá-lhes passagem." (PR #44) | 028 | 1 | — |
| 030 | Castellano | "Diz que… a casa é deles. Acho que diz isso." (V1) | 002 | 2 | — |
| 031 | Price | "Pelo muro, atrás do camião. Mostra-lhes, Lane." (V1) | opcional | 1 | — |
| 032 | Concetta (dialeto) | — (sem tradução; recusa a mão) | ajuda | 3 | — |
| 033 | Morgan | "Carroça. Dois homens." (V1) | passagem | 1 | — |
| 034 | segundo grupo (rádio) | "Via de acesso é nossa. Posição residual a oeste; tratamos." (V1) | entrega | 1 | — |
| 035 | Morgan | "Distância. Última vez que digo." (V1) | estrada | 1 | 60 |
| 036 | destinatário | "Quatro caixas?" (variantes: "Três. E esta?") (V1) | entrega | 1 | — |
| 037 | Lane | "Se sairmos daqui, a carga chega. Eles ficam com a casa." (PR #44) | entrega | 2 | — |
| 038 | Bell | "Niscemi. Bandeira branca na janela. Ontem." (V1) | cidade | 3 | — |
| 039 | Price | (ajuda o velho; sem fala) → 003 | outro | — | — |
| 040 | Morgan | (`morgan_trust ≥ 1`) "Conduziste bem. Para a próxima, ouve mais os muros." / (0) "Para a próxima, distância." (V1) | outro | 2 | — |
| 041 | Nino (dialeto) | — (olha; sem tradução) | outro | — | — |

Callouts: `co_m14_contact_grove`, `co_m14_cargo_hit`, `co_m14_distance`. Silêncio: olival/pátio (cigarras).

---

## 7. Arte e atmosfera

**Paleta:** ocre, pedra branca de muro, cinza-verde de oliveira, poeira dourada, caqui/HBT. **Luz:** 07:00 Sol baixo a leste (sombras longas nos muros); 10:00 luz dura; 12:00 zénite, haze de calor. **Materiais:** pedra seca, estuque, terra batida, metal quente do jeep. **Silhuetas:** muros, oliveiras, masseria, Niscemi no alto. **Destruição:** cratera, camião italiano, telhado dos Scirè, caixas atingidas (persistentes). **Humanos:** HBT, M1, suor; família com roupa de trabalho e um vestido de domingo (mala). **Violência reduzida:** Castellano com manga rasgada.

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| comboio | motor do jeep (regimes, caixa), pneus, poeira, medalha a bater | comboio | — | — |
| estrada | cigarras, aves | camião a cruzar | aviões | — |
| aqueduto | mulas, agricultor | — | — | — |
| olival | .30, tiros espaçados, caixas | — | — | **obrigatório** (antes) |
| pátio | galinhas, discussão, carroça | — | — | **obrigatório** (cigarras) |
| Niscemi | cidade, soldados | segundo grupo | fogo de apoio | — |

Sons novos: jeep Willys, estrada de terra, cigarras, mulas, dialeto. VO inglês/siciliano.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| 11/7 contra-ataque HG vs 2/16.º; 12/7 estrada Piano Lupo–Niscemi; Niscemi tomada 13/7 (oficial) ou 14/7 | D (resumo) | H14; S-C14 | P-C14 |
| 14/7 como dia de consolidação/abastecimento | R (coerente) | — | — |
| Retardatários alemães no olival | F plausível | — | — |
| Família Scirè; masseria; dialeto | F; arquitetura R | — | revisão regional |
| Equipamento 1943 (Garand, .30, jeep) | D | — | auditoria |

**Proibições:** conquistar Niscemi na missão; emboscada por curva; Patton/Allen em cena; civis gratos por obrigação. **Fora de cena:** Allen, Patton.

---

## 10. Handoff técnico

**Contrato:** `id m14_gela_niscemi`, `order 14`, relógio 07:00→13:00, `player.vehicle: jeep_willys_mb` ([D] opcional), `passengers`, `cargo` (4 caixas com integridade), grupos (`grp_section`, `grp_second_group`, `grp_family`, `grp_de_stragglers`, `grp_other_convoys`), setores, checkpoints A–D, cutscenes (intro, family, outro), falas, flags, debrief.

**Flags:** `m14.completed`, `m14.route`, `m14.jeep_damage`, `m14.cargo_integrity (0–4)`, `m14.castellano_status`, `m14.civilians_helped`, `m14.morgan_trust (0–2)`, `m14.price_helped_resident` (sempre true).

**Sistemas:** [C] jeep (condução, passageiros reais, carga, dano, colisão), civis com rotas; [B] interação a dois (carroça), distância de comboio; [A] fogo como dados, a pé. [D] `player.vehicle` no schema. **Bancada do Marco 4:** "direção para M14" (§77); §80 VEÍCULOS: "condução, passageiros, entrada/saída, carga, dano e colisão".

**Disciplinas:** Eng. sim: jeep; Level: 8 km de estrada em troços + masseria + pátio + Niscemi (silhueta); Combate/IA: retardatários; Arte: Sicília; Personagens: americanos 1943 (6), família (3), agricultor; Animação: condução, entrar/sair, afastar carroça; Som: jeep; VO: inglês/siciliano; Historiador: P-C14 + revisão regional; QA: entrar/sair do jeep, capotar, integridade da carga.

**Testes:** carga serializada; capotar → restore com aviso; `civilians_helped` nas duas vias; `morgan_trust` derivado (distância + carga + decisão).

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| O espelho | (intro) | ajustar | Morgan distribui; Price | — | start | CP-A |
| Distância | `obj_m14_drive` | conduzir | Bell; camião cruza | poeira | A | `jeep_damage` |
| Bloqueio | `obj_m14_recon_alt` | reconhecer a pé; informar | agricultor; Castellano | — | cratera | CP-B |
| Olival | `obj_m14_protect_convoy` | jeep/retaguarda | Morgan faz o oposto; retardatários recuam | caixas atingidas | contacto | CP-C |
| A mala | `obj_m14_open_yard/help_civilians` | afastar carroça; ajudar | Doyle grita; Price; família desconfia | passagem | pátio | `civilians_helped` |
| Entrega | `obj_m14_deliver` | conduzir; entregar | segundo grupo cobre | — | passagem | CP-D |
| A casa dos outros | debrief | — | Price ajuda; Morgan avalia | — | delivered | `morgan_trust` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 7 | "road movie" com um pátio no meio; leve por desenho (prepara Omaha). |
| 2 | Autenticidade | 7 | eixo D; data resolvida como dia seguinte; troço P-C14. |
| 3 | Personagens | 8 | os quatro de §73 estabelecidos; Castellano e Doyle para M18/M19. |
| 4 | Diálogos | 7 | dialeto sem tradução é decisão forte; precisa de revisão. |
| 5 | Originalidade | 8 | civis que recusam a mão; conduzir como disciplina. |
| 6 | Variedade | 8 | conduzir, reconhecer a pé, proteger, abrir passagem, entregar. |
| 7 | Set pieces | 7 | — |
| 8 | Atmosfera | 8 | muros e cigarras. |
| 9 | Environmental storytelling | 8 | medalha, cartaz, bandeira branca. |
| 10 | Cinematográfica | 7 | — |
| 11 | Sonora | 8 | cigarras como silêncio. |
| 12 | Impacto emocional | 7 | a família na casa alheia. |
| 13 | Ritmo | 8 | 18–25 min. |
| 14 | Continuidade | 9 | `morgan_trust`, Castellano, Doyle, Price → M18/M19. |
| 15 | Integração técnica | 4 | jeep [C]/[D]. |

**Correções aplicadas:** (1) data mantida com a missão definida como abastecimento do dia seguinte à tomada (resolve a divergência 13/14); (2) retardatários nunca se rendem (a rendição pertence a M19); (3) a família recusa a mão (sem gratidão obrigatória).
