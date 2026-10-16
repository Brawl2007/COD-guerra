# M15 — ALÉM DO RECIFE · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** 20/11/1943, Betio, Tarawa; 2.ª Divisão de Marines; POV Ben Turner, numa onda posterior de embarcações convencionais; fonte H15; 22–30 min; três falas; checkpoints "antes de entrar na água; primeira cobertura; ligação; consolidação"; os LVT das primeiras ondas passam o recife, a embarcação convencional não; não resolver Betio como corredor de bunkers; fim = consolidação local de 20/11. **Proposto:** 1.º Batalhão, 2.º Marines, Red Beach 2, 4.ª/5.ª vaga em LCVP (S-C15; RECONSTRUÇÃO, P-C15), elenco, relógio, flags. **Sistema:** água rasa/vadear [C].

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m15_tarawa` / 15 |
| Datas | 1943-11-20T10:15+12:00 → 1943-11-20T18:30+12:00 |
| Local | LCVP presa no recife (~600 jardas) → água até ao peito/cintura → cais de madeira à direita → paliçada de troncos de coqueiro (Red Beach 2) → cratera com MG → posição de troncos que bloqueia o trânsito → cabeça do cais (`RECONSTRUCTED`; recife e cais `EXACT` em silhueta) |
| Operação | 2.ª Div. Marines em Betio: LVT nas 3 primeiras vagas; LCVP encalham no recife (maré de quadratura); 1/2 ordenado ~10:00, A/B em terra 12:05 em Red 2; vadear 500–700 jardas sob fogo cruzado; cais entre Red 2/3 (D em resumo, S-C15) |
| Unidade | 2.ª Div. Marines (canónico) → 1.º Btl., 2.º Marines (R) → esquadra ficcional |
| Elenco | Turner (POV, pfc), sgt. Dale Whitcomb (graduado), PhM2c Lou Brandt (socorrista), pfc. Tommy Reiner (desaparecido), pfc. Al Marchetti (ferido grave sobrevivente), cpl. Hap Dodd e pvt. Sal Ferrante (guarnição da MG .30 na cratera) (propostas) |
| Fora de cena | col. Shoup, gen. Julian Smith |
| Intocável | data, unidade, POV, onda posterior convencional, falas `dlg_m15_001–003`, checkpoints, Reiner desaparecido (sem certeza inventada), Marchetti ferido grave sobrevivente, "sem coleção de mortes em câmara lenta" |

---

## 1. Story Bible

**Logline.** Os LVT da frente já estão na areia. O barco de Turner pára no recife a seiscentas jardas, e a ordem é saltar para a água. O que se segue não é tomar uma praia: é chegar a ela com quem ainda estiver de pé, cobrir um socorrista que volta à água por um homem, levar munição a uma metralhadora numa cratera — e manter um espaço para que a próxima onda chegue a algum lado.

**As oito respostas.**
1. **Situação central:** a água até ao peito; a onda que chega depois da primeira.
2. **Modo de contar:** homens que chegam à areia (da esquadra: 7 saltam; quantos chegam).
3. **Objeto:** a correia do equipamento (Turner aperta-a na água; larga-a na areia para alcançar outro homem) e, no fim, o equipamento de Reiner junto da rebentação.
4. **Silêncio:** o som abafado junto ao cais (a água engole os tiros por segundos).
5. **Tarefa que não é matar:** vadear; reunir; levar munição à MG; manter um corredor para a onda seguinte.
6. **Custo humano:** um homem preso na água (Marchetti, ferido, agarrado a um obstáculo) → Brandt entra na água / Turner cobre um corredor real com o fuzil; sem botão de resgate: se Turner não cobrir, Brandt é atingido (tiro real) e Marchetti é trazido por outros mais tarde → `m15.brandt_covered`; Reiner nunca é encontrado.
7. **Pessoas históricas:** fora de cena.
8. **Debrief:** regista a consolidação local de 20/11, a captura completa só a 23/11, as perdas, o recife e a maré; Reiner `missing`.

**Três motivos.** (a) *A água* — o obstáculo é o transporte, não o inimigo; (b) *a onda seguinte* — a linha de chegada é um corredor para os outros; (c) *a correia* — apertar para si, largar para o outro.

**Temas.** Dependência de homens que não se veem; peso; incapacidade de chegar depressa a quem grita; vitória local e custo.

**Estrutura (§54).** CONTEXTO → INTRO (LVT à frente; o recife) → APROXIMAÇÃO (saltar; vadear) → DIÁLOGO (Whitcomb: "O nosso barco não vai passar.") → PRIMEIRO CONTATO (fogo cruzado na água) → ESCALADA (paliçada; reunir; Brandt volta à água) → COMBATE PRINCIPAL (ligação com a cratera; munição à MG) → SET-PIECE (avanço curto contra a posição de troncos; equipa de assalto) → PAUSA (o cais; som abafado) → CLÍMAX (manter o espaço de desembarque; receber a onda seguinte) → CONSEQUÊNCIA (equipamento de Reiner; Marchetti) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Turner | acompanha os LVT; aperta a correia | Reiner (ao lado na LCVP), Brandt | a água; Marchetti; a correia | abre lugar para os outros | "Isto era dele. Não deixem aqui." (003) |
| Whitcomb | "Aqueles veículos passaram…" (001) | esquadra | reunir | — | vivo |
| Brandt | socorrista | homens na água | "Cubra a água." (002) | — | `m15.brandt_status` |
| Reiner | fala com Turner na LCVP | Turner | desaparece na água | — | `missing` (fixo) |
| Marchetti | — | — | ferido grave na água | — | evacuado (fixo) |
| Dodd/Ferrante | MG na cratera | — | munição | — | vivos |

**O que a missão recusa.** Segunda Omaha; bunker a cada cinco metros; LVT bloqueados pelo recife (falso); câmara lenta; corpo de Reiner; Shoup em cena.

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "O recife" (`cs_m15_intro`, ≤ 70 s)
2 10:15 · 3 LCVP presa no recife; LVT à frente já na areia; cais à direita · 4 sol alto, água turquesa-suja, fumo na ilha · 5 esquadra (7); coxswain; outras LCVP presas · 6 Cartela: BETIO, TARAWA — 20 DE NOVEMBRO DE 1943 — 10:15 · 2.º MARINES · 2.ª DIVISÃO DE MARINES. Turner observa os LVT à frente; a LCVP bate no recife e não passa; Whitcomb: "Aqueles veículos passaram. O nosso barco não vai passar." (001). Reiner ao lado: "Fica perto de mim." Ordem: por cima da borda. · 7 a decisão de entrar na água vem de uma ordem visível · 8 olhar; apertar a correia (gesto) · 9 — · 10 — · 11 fogo sobre a água · 12 LCVP presas; um LVT a arder na praia · 13 `dlg_m15_001` (canónica), `010–013` · 14 motor; casco no coral; impactos na água · 15 beat: LVT na areia (3 s); Reiner (2 s) · 16 `missionStart` · 17 ordem · 18 `cp_m15_a_antes_da_agua` · 19 skip · 20 —

### Cena 2 — "Água" (jogável; `obj_m15_wade`)
2 10:20–11:00 · 3 600 jardas de água: peito → cintura → joelhos; obstáculos de coral; o cais à direita · 4 sol; reflexos · 5 esquadra; outros grupos a vadear; mortos e feridos na água (cobertos pela água, sem close) · 6 Sair da embarcação sob ordem e atravessar a água até cobertura, com movimento, profundidade e equipamento coerentes (peso: velocidade cai; não pode disparar com água ao peito); fogo cruzado dos flancos; **Reiner desaparece** (evento fixo: cai entre duas vagas de fogo; Turner vê-o e depois não vê; nunca mais); outros chegam · 7 §79 ponto 1 · 8 vadeia; escolhe linha (cais: cobertura parcial, longa; direto: curto, exposto); agacha nos obstáculos · 9 cais vs direto · 10 Whitcomb puxa um homem; Brandt pára por um ferido · 11 MG nos flancos (dados), morteiros · 12 água com equipamento a flutuar · 13 `dlg_m15_014–018` · 14 água a abafar tiros; respiração · 15 livre (baixo) · 16 ordem · 17 paliçada · 18 `cp_m15_b_primeira_cobertura`; `m15.reiner_status = missing`; `m15.men_reached` · 19 [C] água rasa (profundidade, velocidade, disparo bloqueado) · 20 —

### Cena 3 — "Paliçada" (jogável; `obj_m15_rally`, `obj_m15_cover_brandt`)
2 11:00–11:45 · 3 paliçada de troncos de coqueiro; areia entre a paliçada e a água · 4 sol · 5 esquadra; outros grupos já a combater mais adiante; Brandt · 6 Reunir sobreviventes junto da proteção disponível; Brandt tenta alcançar Marchetti, preso a um obstáculo na água a 40 m; Turner cobre um corredor real (suprime a MG do flanco direito enquanto Brandt vai e volta; 60 s) · 7 §79 ponto 2 + custo humano · 8 cobre (suprime a MG: rotação por salvas); ou não · 9 cobrir vs reunir · 10 Brandt vai sempre; Whitcomb reúne · 11 MG do flanco direito · 12 paliçada com marcas; equipamento · 13 `dlg_m15_002` (canónica), `019–023` · 14 água; MG · 15 livre · 16 CP-B · 17 Brandt de volta com Marchetti (ou atingido: tiro real) · 18 `m15.brandt_covered`, `m15.brandt_status`, `m15.marchetti_status = wounded_evacuated` (fixo: se Brandt cai, outros trazem Marchetti mais tarde) · 19 [A] supressão · 20 —

### Cena 4 — "A cratera" (jogável; `obj_m15_link_mg`)
2 11:45–12:30 · 3 da paliçada a uma cratera com a MG .30 de Dodd/Ferrante (80 m); areia; destroços · 4 sol · 5 esquadra; guarnição · 6 Abrir ligação com uma posição próxima da praia e levar munição à arma coletiva (duas caixas da LCVP que chegaram à areia); a MG altera a distribuição de fogo (supressão do acesso visível) · 7 §79 ponto 3 · 8 carrega caixas por lances; liga (grita/sinal) · 9 — · 10 Dodd/Ferrante disparam; Ferrante pede fita · 11 atiradores japoneses em posições de troncos (dados) · 12 cratera, destroços de LVT · 13 `dlg_m15_024–027` · 14 .30; água ao fundo · 15 livre · 16 Brandt de volta · 17 2 caixas entregues · 18 `cp_m15_c_ligacao`; `m15.mg_ammo_delivered` · 19 [A] · 20 —

### Cena 5 — "A posição de troncos" (jogável; `obj_m15_short_advance`)
2 12:30–14:00 · 3 posição japonesa de troncos e areia que impede o trânsito entre a paliçada e o cais · 4 sol; fumo · 5 esquadra; equipa de assalto (engenheiros com cargas e um lança-chamas, **por sua própria equipa**) · 6 Coordenar um avanço curto contra a posição: a MG suprime, o jogador cobre a aproximação da equipa de assalto (sinais de fogo e risco para aliados: o lança-chamas tem zona de perigo), a equipa neutraliza · 7 §79 ponto 4 · 8 cobre; sinaliza "cessar" à MG quando a equipa entra (interação); não é o jogador que destrói a posição · 9 — · 10 equipa de assalto atua por si · 11 posição (dados), um contra-ataque curto · 12 posição destruída (persistente) · 13 `dlg_m15_028–032` · 14 lança-chamas (som), cargas · 15 livre · 16 CP-C · 17 posição neutralizada (`evt_m15_position_cleared`) · 18 — · 19 [C] equipa de assalto como atores com tarefa; zona de perigo · 20 —

### Cena 6 — "O cais" (`cs_m15_pier`, ≤ 25 s)
2 14:00–14:10 · 3 cabeça do cais de madeira · 4 sol · 5 Turner, Whitcomb · 6 Pausa: junto do cais o som abafa (a água); Turner vê a LCVP ainda presa no recife, vazia. · 7 silêncio · 8 olhar · 9 — · 10 — · 11 — · 12 a LCVP vazia · 13 `dlg_m15_033` · 14 **silêncio obrigatório** (água) · 15 beat: a LCVP (3 s) · 16 position_cleared · 17 Whitcomb · 18 — · 19 — · 20 —

### Cena 7 — "A onda seguinte" (jogável; clímax; `obj_m15_hold_landing_space`)
2 14:10–17:30 (`readyScale` entre contactos) · 3 espaço de desembarque/evacuação na cabeça do cais e 60 m de areia · 4 sol a baixar · 5 esquadra; feridos a embarcar; reforços e suprimentos a chegar pelo cais (proxies) · 6 Manter um espaço de desembarque/evacuação e receber o grupo seguinte: cobrir macas que vão para os barcos no cais, cobrir homens que chegam; contra-ataques pontuais; outros setores com resultados persistentes · 7 §79 ponto 5 · 8 rotação por salvas; cobre macas; recebe (interação: indicar o corredor) · 9 — · 10 Whitcomb; Brandt (variante); guarnição · 11 infantaria japonesa; atiradores · 12 cais com macas; barcos · 13 `dlg_m15_034–038` · 14 — · 15 livre · 16 Whitcomb · 17 anoitecer + consolidação (`evt_m15_consolidate`) · 18 `cp_m15_d_consolidacao`; `m15.corridor_held`, `m15.next_wave_received` · 19 [A]; [C] barcos no cais · 20 —

### Cena 8 — "Isto era dele" (`cs_m15_outro`, ≤ 60 s) + debrief
2 17:30–18:30 · 3 linha de rebentação junto do cais · 4 pôr do sol; maré a subir · 5 Turner, Whitcomb, Brandt (variante); Marchetti em maca a embarcar · 6 Turner encontra o equipamento de Reiner (mochila com o nome) perto da água: "Isto era dele. Não deixem aqui." (003). Marchetti segue para atendimento. Vitória local e custo aparecem juntos. Cartela: Betio só a 23/11. · 7 consequência canónica · 8 skip; (jogável: apanhar o equipamento — interação) · 9 — · 10 — · 11 — · 12 a mochila; a maca · 13 `dlg_m15_003` (canónica), `039–040` · 14 rebentação; nenhuma música · 15 beat: a mochila (3 s) · 16 consolidate · 17 debrief · 18 `m15.completed` · 19 — · 20 —

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m15_wade` | Saia da embarcação e atravesse a água até cobertura | sim | ordem | paliçada | morte (restaurar A) | `men_reached` | B |
| `obj_m15_rally` | Reúna sobreviventes junto da paliçada | sim | B | reunidos | — | — | — |
| `obj_m15_cover_brandt` | Cubra Brandt enquanto vai buscar Marchetti | sim (janela 60 s) | rally | Brandt de volta | Brandt atingido (tiro real) | `brandt_covered` | — |
| `obj_m15_link_mg` | Ligue à cratera; leve munição à MG | sim | — | 2 caixas | — | `mg_ammo_delivered` | C |
| `obj_m15_short_advance` | Cubra a equipa de assalto contra a posição | sim | C | cleared | — | — | — |
| `obj_m15_hold_landing_space` | Mantenha o espaço de desembarque; receba a onda seguinte | sim | pier | consolidate | — | `corridor_held` | D |
| `obj_m15_reiner_gear` | Recolha o equipamento de Reiner | sim (fim) | outro | interação | — | — | — |

### 3.2 Setores
`s1_water_beach` (perto) · `s2_pier` (perto) · `s3_adjacent_beaches` (médio: Red 1/Red 3, veículos com resultados persistentes, outros grupos) · `s4_ships_support` (longe: navios, fogo de apoio, aeronaves) · `s5_island_interior` (médio/longe: fumo, combate que continua). Agendas: LVT a arder 10:15; contra-ataques 13:30/15:30; barcos no cais a cada ~20 min; maré a subir 17:00.

### 3.3 Checkpoints
A antes de entrar na água (na LCVP) · B primeira cobertura (paliçada; Reiner `missing`) · C ligação (MG abastecida; Brandt/Marchetti) · D consolidação (maré; destroços).

### 3.4 Justiça
Na água: velocidade por profundidade igual para NPCs; disparo bloqueado ao peito (aviso); MG dos flancos com clarão; Reiner desaparece por evento (sem tentativa possível: a cena diz-o); Brandt só é atingido por tiro real sem supressão.

---

## 4. Set pieces

### SP-15-1 "Por cima da borda"
Contexto: recife. Preparação: LVT à frente; Reiner ao lado. Experiência: 600 jardas de água, fogo cruzado, peso; Reiner desaparece. Companheiros: Whitcomb puxa; Brandt pára. Ambiente: equipamento a flutuar, LVT a arder. Evolução: peito → joelhos. Clímax: a paliçada. Consequências: `reiner_status`, `men_reached`. Requisitos: [C] água rasa. Integração: `obj_m15_wade`.

### SP-15-2 "Cubra a água"
Contexto: paliçada. Preparação: Marchetti preso; Brandt decide. Experiência: suprimir a MG por 60 s; ver Brandt ir e voltar. Companheiros: Whitcomb reúne. Ambiente: areia. Evolução: salvas. Clímax: Brandt de volta (ou não). Consequências: `brandt_covered`. Requisitos: [A] supressão. Integração: `obj_m15_cover_brandt`.

### SP-15-3 "A onda seguinte"
Contexto: cabeça do cais. Preparação: o som abafado; a LCVP vazia. Experiência: cobrir macas e homens que chegam; indicar o corredor. Companheiros: guarnição; Brandt. Ambiente: barcos no cais. Evolução: maré sobe. Clímax: consolidação. Consequências: `corridor_held`. Requisitos: [A]; [C] barcos. Integração: `obj_m15_hold_landing_space`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| recife | LCVP presas, LVT na areia, um a arder | — | ordem | fogo na água | Reiner | — |
| água | equipamento a flutuar, coral | outros a vadear | fogo cruzado | MG | feridos | Reiner não está |
| paliçada | troncos marcados, mochilas | reunir | Marchetti na água | MG | Brandt | — |
| cratera | destroços de LVT, caixas | MG | fita | atiradores | Dodd/Ferrante | — |
| posição | troncos e areia | equipa de assalto | lança-chamas | contra-ataque | — | destruída |
| cais | LCVP vazia ao longe | macas, barcos | — | — | — | maré sobe |
| rebentação | a mochila de Reiner | — | — | — | Marchetti | — |

Objetos com origem: a mochila com o nome (Reiner), a LCVP vazia (a deles), o LVT a arder (1.ª vaga), as caixas na areia (ondas anteriores), a posição de troncos (guarnição japonesa).

---

## 6. Diálogos (VO inglês americano)

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Whitcomb | "Aqueles veículos passaram. O nosso barco não vai passar." (§79) | recife | 1 | — |
| 002 | Brandt | "Cubra a água. Ainda há homens lá." (§79) | Marchetti | 1 | — |
| 003 | Turner | "Isto era dele. Não deixem aqui." (§79) | mochila | 1 | — |
| 010 | Reiner | "Fica perto de mim. Eu fico perto de ti." (V1) | intro t 10 | 2 | — |
| 011 | coxswain | "Recife! Não passo! Por cima da borda!" (V1) | encalhe | 0 | — |
| 012 | Whitcomb | "Correias apertadas. Fuzil alto. Vamos." (V1) | ordem | 1 | — |
| 013 | Marchetti | "Seiscentas jardas?" (V1) | ordem | 3 | — |
| 014 | Whitcomb | "Cais à direita! Quem puder, cais!" (V1) | água | 1 | — |
| 015 | Brandt | "Não disparem com água ao peito. Andem." (V1) | tentativa de disparo | 1 | 30 |
| 016 | Reiner | "Turner—" (V1; última) | desaparece | 1 | — |
| 017 | Whitcomb | "Não parem! Ninguém pára na água!" (V1) | — | 0 | 20 |
| 018 | Whitcomb | "Paliçada! Baixo!" (V1) | paliçada | 0 | — |
| 019 | Whitcomb | "Quem chegou? Nomes." (V1) | reunir | 1 | — |
| 020 | Brandt | "Marchetti. Preso no obstáculo. Vou." (V1) | — | 1 | — |
| 021 | Brandt | "Cubra-me até à água. Só até à água!" (PR #44) | 002 | 1 | — |
| 022 | Whitcomb | "MG à direita. Mantém-na baixa e ele volta." (V1) | cobertura | 1 | — |
| 023 | Brandt | "Tenho-o. Tenho-o." / (variante) — | regresso | 1 | — |
| 024 | Dodd | "Cratera! Trinta aqui! Precisamos de caixas!" (V1) | ligação | 1 | — |
| 025 | Ferrante | "Fita! Fita!" (V1) | MG vazia | 0 | 30 |
| 026 | Whitcomb | "Caixas da LCVP que chegou. Duas. Lances." (V1) | — | 1 | — |
| 027 | Dodd | "Agora sim. Agora o acesso é nosso." (V1) | abastecida | 2 | — |
| 028 | engenheiro | "Posição de troncos bloqueia o cais. Vamos nós. Cubram a aproximação." (V1) | avanço | 1 | — |
| 029 | Whitcomb | "Lança-chamas. Ninguém à frente dele." (V1) | zona | 0 | — |
| 030 | Turner | — (interação "cessar") → Dodd: "Cessar!" (V1) | entrada | 1 | — |
| 031 | engenheiro | "Está feita." (V1) | cleared | 1 | — |
| 032 | Whitcomb | "Contra-ataque! Paliçada!" (V1) | contra-ataque | 0 | — |
| 033 | Whitcomb | "A nossa LCVP. Ainda ali." (V1) | cais | 3 | — |
| 034 | Whitcomb | "Cais é a porta. Macas para os barcos, homens para a areia." (V1) | hold | 1 | — |
| 035 | maqueiro | "Passagem! Maca!" (V1) | macas | 1 | 20 |
| 036 | reforço | "Onde é a areia?!" (V1) | onda seguinte | 2 | — |
| 037 | Turner | "A praia não acaba onde a água acaba." (PR #44) | corredor | 2 | — |
| 038 | Whitcomb | "Anoitece. Consolidar. Amanhã é outro dia disto." (V1) | consolidate | 1 | — |
| 039 | Brandt (variante) | "Marchetti vai no próximo barco. Vive." (V1) | outro | 2 | — |
| 040 | Whitcomb | "Reiner fica como desaparecido. É o que sabemos." (V1) | outro | 1 | — |

Callouts: `co_m15_mg_flank`, `co_m15_belt`, `co_m15_flamethrower_zone`. Silêncio: o cais.

---

## 7. Arte e atmosfera

**Paleta:** turquesa-suja de água rasa, branco de coral, cinza de troncos, preto de fumo, verde de camuflagem P42, areia pálida. **Luz:** 10:15 Sol alto (el 60°), reflexos na água; 14:00 fumo; 17:30 pôr do sol laranja; maré a subir. **Materiais:** água (profundidade visível), coral, troncos de coqueiro, madeira do cais, areia. **Silhuetas:** o cais, LVT na areia, LCVP no recife, a posição de troncos. **Destruição:** LVT a arder, posição destruída, cais marcado (persistentes). **Humanos:** camuflagem P42 encharcada, M1 com capa, Garand; Marchetti com ligadura; nada de corpos em close. **Violência reduzida:** feridos na água só por postura.

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| recife | motor da LCVP, coral no casco | outras LCVP | fogo naval | — |
| água | água a abafar tiros, respiração, equipamento | outros grupos | — | — |
| paliçada | areia, MG | — | — | — |
| cratera | .30, fita | — | — | — |
| posição | lança-chamas, cargas | contra-ataque | — | — |
| cais | água | macas, barcos | — | **obrigatório** |
| rebentação | ondas; maré | — | — | — |

Sons novos: água rasa (vadear por profundidade), coral, LVT, lança-chamas, cais de madeira. VO inglês.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| LVT nas 3 primeiras vagas; LCVP encalham; vadear 500–700 jardas; cais entre Red 2/3 | D | H15; S-C15 | — |
| 1/2 ordenado ~10:00; A/B em terra 12:05 em Red 2 | D (resumo) | S-C15 | P-C15 (embarcação do 1/2) |
| Maré de quadratura baixa | D | S-C15 | hora |
| Lança-chamas e equipas de assalto na 2.ª Div. | D (geral) | — | — |
| Posição de troncos; cratera | R | — | mapa |
| Turner, Whitcomb, Brandt, Reiner, Marchetti, Dodd, Ferrante | F | — | — |

**Proibições:** LVT bloqueados; Omaha; bunkers em série; Shoup em cena; corpo de Reiner. **Fora de cena:** Shoup, J. Smith.

---

## 10. Handoff técnico

**Contrato:** `id m15_tarawa`, `order 15`, relógio 10:15→18:30 (`readyScale` à tarde), grupos (`grp_squad`, `grp_mg_crater`, `grp_assault_team`, `grp_other_groups`, `grp_stretchers`, `grp_reinforcements`, `grp_jp_flank_mgs`, `grp_jp_position`), setores, checkpoints A–D, cutscenes (intro, pier, outro), falas, flags, debrief.

**Flags:** `m15.completed`, `m15.men_reached`, `m15.reiner_status = missing` (fixo), `m15.brandt_covered`, `m15.brandt_status`, `m15.marchetti_status = wounded_evacuated` (fixo), `m15.mg_ammo_delivered`, `m15.corridor_held`, `m15.next_wave_received`.

**Sistemas:** [C] água rasa (profundidade, velocidade, disparo bloqueado, obstáculos), equipa de assalto com zona de perigo, barcos no cais, maré visual; [A] fogo como dados, supressão, rotação, carriedBy; [B] interação "cessar". [D] nenhum.

**Disciplinas:** Level: recife 600 jardas, praia 200 m, cais; Combate/IA: MG de flanco, posição de troncos, contra-ataques; Arte: água/coral; Personagens: Marines 1943 (7), japoneses; Animação: vadear por profundidade, puxar homem na água, lança-chamas (equipa); Som: água; VO: inglês; Historiador: P-C15; QA: Reiner sempre `missing`; Brandt nas duas vias; maré.

**Testes:** disparo bloqueado ao peito; `men_reached` 4–7 em 12 sementes; Marchetti sempre evacuado; D restaura maré/destroços.

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| O recife | (intro) | apertar a correia | Whitcomb; Reiner | — | start | CP-A |
| Água | `obj_m15_wade` | vadear; cais/direto | Whitcomb puxa; Reiner some | equipamento a flutuar | ordem | CP-B; `reiner_status` |
| Paliçada; Brandt | `obj_m15_rally/cover_brandt` | suprimir 60 s | Brandt vai/volta | — | rally | `brandt_covered` |
| A cratera | `obj_m15_link_mg` | caixas por lances | Dodd/Ferrante | supressão do acesso | — | CP-C |
| A posição de troncos | `obj_m15_short_advance` | cobrir; cessar | equipa de assalto | posição destruída | C | cleared |
| O cais | (pausa) | olhar | — | LCVP vazia | cleared | — |
| A onda seguinte | `obj_m15_hold_landing_space` | rotação; macas; corredor | reforços; maqueiros | maré sobe | pier | CP-D |
| Isto era dele | `obj_m15_reiner_gear` | apanhar | Marchetti embarca | — | consolidate | `m15.completed` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 8 | a correia; a onda seguinte. |
| 2 | Autenticidade | 8 | recife/LVT/LCVP/cais D; vaga do 1/2 R. |
| 3 | Personagens | 7 | Whitcomb, Brandt; Reiner em 2 falas (por desenho). |
| 4 | Diálogos | 8 | "Só até à água!" |
| 5 | Originalidade | 8 | vadear como verbo; o lança-chamas é de outros. |
| 6 | Variedade | 8 | vadear, cobrir, carregar, cessar, receber. |
| 7 | Set pieces | 8 | três. |
| 8 | Atmosfera | 8 | água e coral. |
| 9 | Environmental storytelling | 8 | LCVP vazia; mochila. |
| 10 | Cinematográfica | 8 | o cais abafado. |
| 11 | Sonora | 9 | água que engole tiros. |
| 12 | Impacto emocional | 8 | Reiner sem corpo. |
| 13 | Ritmo | 7 | 22–30 min; tarde com `readyScale`. |
| 14 | Continuidade | 7 | isolada. |
| 15 | Integração técnica | 5 | água rasa [C]. |

**Correções aplicadas:** (1) Marchetti é sempre evacuado (se Brandt cai, outros o trazem) para não transformar a cobertura num "botão de vida"; (2) Reiner desaparece por evento sem tentativa possível (sem janela falsa); (3) a posição de troncos é neutralizada pela equipa de assalto, não pelo jogador.
