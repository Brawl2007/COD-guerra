# M17 — ANTES DO AMANHECER · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** madrugada de 6/6/1944, Sainte-Mère-Église e arredores; 505.º Regimento Paraquedista, 82.ª Divisão; POV Nathan Cole; fonte H17; 20–27 min; três falas; checkpoints "antes do salto; aterrissagem segura; reunião; ligação; defesa final"; paraquedas de época; sinais de reconhecimento historicamente apropriados; não reproduzir caso de paraquedista histórico nem cena de outro jogo; não matar cada soldado escondido. **Proposto:** 3.º Batalhão (S-C17; RECONSTRUÇÃO, P-C17), acesso norte da cidade, senha de voz (Flash/Thunder documentada para a 101.ª; uso pela 82.ª pendente), elenco, flags. **Nathan Cole ≠ Henry Cole (Marine).**

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m17_sainte_mere_eglise` / 17 |
| Datas | 1944-06-06T01:15+02:00 → 1944-06-06T06:10+02:00 (nascer do sol ~05:58) |
| Local | C-47 → pomar/campo a leste da DZ O → sebes, pátios de quinta → bloqueio de estrada no acesso norte (N13, sentido Neuville-au-Plain) → orla da cidade — `RECONSTRUCTED` (P-C17); a igreja e a praça `EXACT` em silhueta, sem a cena da torre |
| Operação | Mission Boston: pathfinders do 505.º sobre DZ O 01:21; lançamento preciso; 3/505 toma a cidade 04:30–05:00; contra-ataques de 6–7/6 pelo norte e sul (D em resumo, S-C17) |
| Unidade | 505.º PIR, 82.ª (canónico) → 3.º Btl. (R) → stick ficcional |
| Elenco | Nathan Cole (POV, pfc), sgt. Bill Harker (graduado), pvt. Ray Dunning (o que quase dispara), pvt. Louis Marchand (desaparecido; equipamento encontrado), dois paraquedistas de outro stick, grupo do bloqueio (tenente ficcional fora de cena, voz) (propostas) |
| Fora de cena | ten.-cor. Krause; gen. Ridgway; John Steele |
| Intocável | data, unidade, POV, falas `dlg_m17_001–003`, checkpoints, paraquedas de época, "não atribuir toda a cidade a Cole", a chamada ao amanhecer com faltas |

---

## 1. Story Bible

**Logline.** A luz do avião desaparece e Nathan Cole cai sozinho num pomar escuro. Durante quatro horas, a guerra é um sussurro de senha, uma sebe que pode ser aliada ou patrulha, um cordel do equipamento de salto guardado por hábito, e uma posição que só vale alguma coisa quando outro grupo sabe que ela existe. Ao amanhecer, a chamada revela quem falta.

**As oito respostas.**
1. **Situação central:** cair sozinho de noite; encontrar os outros pelo som.
2. **Modo de contar:** homens reunidos por senha (1 → 3 → 5 → ligação com o bloqueio).
3. **Objeto:** o cordel do equipamento de salto (Cole guarda-o; ao amanhecer usa-o para fechar o embrulho com o equipamento de Marchand).
4. **Silêncio:** o pomar depois da aterragem.
5. **Tarefa que não é matar:** reunir por senha; levar informação; ligar grupos; bloquear um acesso.
6. **Custo humano:** um sinal na sebe (causa: isolamento e medo) → Dunning prepara disparo sem confirmação / Cole exige cobertura e verificação → são dois do 505.º de outro stick; `m17.dunning_fired` (se o jogador ou Dunning disparar: um dos dois é ferido, tiro real; sem recompensa); a chamada ao amanhecer revela faltas, não um catálogo de abates.
7. **Pessoas históricas:** fora de cena.
8. **Debrief:** regista o lançamento preciso do 505.º, a cidade tomada pelo 3/505 antes do amanhecer, os contra-ataques de 6–7/6, os moradores afetados (incêndio na cidade na noite anterior — facto, sem a cena da torre), Marchand `missing`.

**Três motivos.** (a) *A senha* — identidade é procedimento; (b) *isolar → ligar* — o terreno que isolava passa a oferecer rotas; (c) *o cordel* — orientação guardada por hábito.

**Temas.** Isolamento; medo que vira erro; confiança em sinais pequenos; a posição que existe quando outro a conhece.

**Estrutura (§54).** CONTEXTO → INTRO (C-47; flak; gestos) → APROXIMAÇÃO (salto; aterragem dispersa) → DIÁLOGO (Harker: "Primeiro saiba quem está ao seu lado.") → PRIMEIRO CONTATO (o sinal na sebe) → ESCALADA (patrulha: contornar ou contactar) → COMBATE PRINCIPAL (informação ao bloqueio; ligação entre grupos) → SET-PIECE (interromper trânsito no acesso) → PAUSA (ligação por rádio/mensageiro) → CLÍMAX (conservar a posição até reorganização; reação inimiga) → CONSEQUÊNCIA (chamada; equipamento de Marchand) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Nathan Cole | toca no ombro; respostas curtas; quer reunir a companhia inteira | Marchand (no avião), Harker, Dunning | a sebe; a patrulha | liga dois grupos concretos | entrega o equipamento de Marchand |
| Harker | "Primeiro saiba quem está ao seu lado." (001) | stick | — | — | vivo |
| Dunning | medo | Cole | a sebe | aprende a esperar | `m17.dunning_status` |
| Marchand | ao lado no avião; "conta cinco" | Cole | desaparece na dispersão | — | `missing` (fixo) |
| grupo do bloqueio | já defende | — | ligação | — | — |

**O que a missão recusa.** Paraquedas moderno; grilo como sinal da 82.ª sem confirmação; a torre da igreja; contornos fluorescentes; toda a cidade por Cole; Krause/Steele em cena.

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "C-47" (`cs_m17_intro`, ≤ 80 s)
2 01:15 · 3 interior do C-47; luzes vermelhas; porta aberta · 4 noite; flak distante; lua quase cheia atrás de nuvens · 5 stick (Cole, Harker, Dunning, Marchand, 12 proxies) · 6 Cartela: SAINTE-MÈRE-ÉGLISE — 6 DE JUNHO DE 1944 — 01:15 · 505.º REGIMENTO PARAQUEDISTA · 82.ª DIVISÃO AEROTRANSPORTADA. Motores; homens conferem equipamento por toque no ombro (gesto de Cole); Marchand: "Contei cinco antes de saltarmos. E agora?"; Harker: "Primeiro saiba quem está ao seu lado." (001); flak; luz vermelha → verde. · 7 estabelecer gestos, Marchand, o cordel · 8 olhar; tocar no ombro (interação) · 9 — · 10 — · 11 flak · 12 cordel do equipamento (Cole guarda um pedaço) · 13 `dlg_m17_001` (canónica), `010–013` · 14 motores; flak; vento da porta · 15 beat: a luz verde (2 s) · 16 `missionStart` · 17 luz verde · 18 `cp_m17_a_antes_do_salto` · 19 skip → a saltar · 20 —

### Cena 2 — "Salto" (jogável; `obj_m17_jump`)
2 01:35–01:40 · 3 do avião ao pomar · 4 noite; clarões de flak; a cidade com um incêndio ao longe (facto) · 5 Cole; outros paraquedas · 6 Saltar na sequência; liberdade de olhar; controlo acessível apropriado ao T-5 (pequenas correções, sem wingsuit); aterragem dispersa num pomar · 7 §79 ponto 1 · 8 olha; corrige pouco; aterra (rolamento automático) · 9 — · 10 outros paraquedas afastam-se · 11 flak; uma MG a disparar para o céu ao longe · 12 — · 13 `dlg_m17_014` (Cole, respiração) · 14 vento; paraquedas; depois **silêncio do pomar** · 15 primeira pessoa; beat: a luz do avião a desaparecer (3 s) · 16 luz verde · 17 aterragem · 18 `cp_m17_b_aterrissagem_segura` · 19 [C] descida com controlo limitado · 20 —

### Cena 3 — "Senha" (jogável; `obj_m17_rally`)
2 01:40–02:30 · 3 pomar → sebes → caminho de quinta · 4 escuro legível (lua entre nuvens); fogos ao longe · 5 Cole; Harker (a 80 m), Dunning (a 150 m); dois de outro stick · 6 Após aterragem dispersa, reunir parte do grupo por sinais historicamente apropriados: senha de voz (desafio/resposta — "Flash"/"Thunder" se confirmado para a 82.ª, P-C17; senão, sinal de voz da unidade); Cole liberta-se do arnês (interação), guarda o cordel; encontra Harker; depois Dunning. **O sinal na sebe:** um ruído e uma silhueta; Dunning prepara disparo sem confirmação; Cole exige cobertura e verificação (desafio); são dois do 505.º de outro stick · 7 §79 ponto 2 + custo humano · 8 desafia (interação de senha); cobre; **não** dispara; se disparar (ou deixar Dunning): um dos dois é ferido (tiro real); flag · 9 desafiar vs disparar · 10 Harker; Dunning; os dois respondem à senha · 11 nenhum ativo nesta cena (patrulha a 300 m, som) · 12 arnês no pomar; um paraquedas numa macieira · 13 `dlg_m17_002` (canónica: "Vi outros homens no pomar. Não sei de que companhia."), `015–021` · 14 sussurros; passos na lama; patrulha ao longe · 15 livre · 16 CP-B · 17 5 reunidos · 18 `cp_m17_c_reuniao`; `m17.men_rallied`, `m17.dunning_fired` · 19 [B] senha (interação de fala com resposta agendada) · 20 —

### Cena 4 — "Patrulha" (jogável; `obj_m17_recon_avoid`)
2 02:30–03:30 · 3 vias e pátios pesquisados até ao bloqueio de estrada (600 m) · 4 escuro · 5 grupo de 5; patrulha alemã (6) numa via coerente · 6 Reconhecer vias/pátios; **decisão real:** contornar a patrulha (pelo pátio de uma quinta, lento) ou contactar (emboscada curta); a missão segue em ambos; levar informação a homens que já defendem a posição (bloqueio) · 7 §79 ponto 3 · 8 contorna ou contacta; chega ao bloqueio; entrega informação (interação) · 9 contornar vs contactar · 10 Harker aceita qualquer; Dunning quer contactar · 11 patrulha (dados) · 12 quinta com cão a ladrar; uma vaca morta pela flak · 13 `dlg_m17_022–026` · 14 cão; passos; se contacto: tiros curtos · 15 livre · 16 CP-C · 17 bloqueio alcançado (`evt_m17_roadblock`) · 18 `m17.patrol_avoided` · 19 [A] · 20 —

### Cena 5 — "Ligação e acesso" (jogável; `obj_m17_link_groups`, `obj_m17_block_access`)
2 03:30–04:30 · 3 bloqueio no acesso norte; a cidade a 500 m (3/505 a limpar: sons) · 4 escuro; fogos na cidade · 5 grupo; grupo do bloqueio (8); mensageiro · 6 Apoiar a ligação entre grupos (Cole corre como mensageiro até à orla da cidade e volta com a confirmação: "Temos ligação. Digam a eles que a posição está aqui." — 003) e interromper trânsito inimigo no acesso confirmado: um veículo ligeiro alemão com reboque tenta passar; a equipa de bazooka do bloqueio pára-o; o jogador cobre e dispara à infantaria que desmonta; outros paraquedistas têm missões próprias e não seguem Cole · 7 §79 ponto 4 · 8 corre como mensageiro (ida/volta sob risco); cobre; dispara · 9 rota da ida (estrada vs sebe) · 10 equipa de bazooka por si; Harker comanda o bloqueio enquanto Cole vai · 11 veículo + infantaria (dados) · 12 veículo parado a arder; reboque · 13 `dlg_m17_003` (canónica), `027–032` · 14 bazooka; motor; cidade · 15 livre · 16 roadblock · 17 veículo parado + ligação confirmada · 18 `cp_m17_d_ligacao`; `m17.access_held` · 19 [A]; [C] veículo como proxy · 20 —

### Cena 6 — "Até à reorganização" (jogável; clímax; `obj_m17_hold`)
2 04:30–05:45 · 3 bloqueio · 4 escuro → azul · 5 grupo; bloqueio · 6 Conservar a posição até comunicação/reorganização prevista; reação inimiga pelo norte (N13, de Neuville-au-Plain) por vias coerentes: duas sondas e uma pressão maior às 05:15; não matar cada soldado escondido; a cidade é tomada pelo 3/505 (sons; rádio) sem Cole · 7 §79 ponto 5 · 8 rotação de cobertura por salvas; suprime; mantém o bloqueio · 9 — · 10 bloqueio; mensageiro: a cidade é nossa (04:45) · 11 sondas; pressão · 12 veículo a arder; sebes · 13 `dlg_m17_033–037` · 14 — · 15 livre · 16 D · 17 reorganização (`evt_m17_reorg`, 05:45) · 18 `cp_m17_e_defesa_final` · 19 [A] · 20 —

### Cena 7 — "Chamada ao amanhecer" (`cs_m17_outro`, ≤ 70 s) + debrief
2 05:45–06:10 · 3 bloqueio; a cidade ao fundo; moradores a sair · 4 amanhecer · 5 grupo; bloqueio; moradores (fundo) · 6 Harker faz a chamada; faltas (Marchand e outros do stick); Cole entrega a Harker o equipamento de Marchand (encontrado numa sebe na cena 4: musette com o nome) fechado com o cordel do salto; a cidade e os moradores continuam afetados (incêndio da noite, casas abertas). Cartela: 3/505 tomou a cidade antes do amanhecer; contra-ataques 6–7/6. · 7 consequência canónica · 8 skip; (jogável: entregar — interação) · 9 — · 10 — · 11 — · 12 a musette; o cordel · 13 `dlg_m17_038–040` · 14 aves; a cidade; nenhuma música · 15 beat: a musette (3 s); moradores (2 s) · 16 reorg · 17 debrief · 18 `m17.completed`; `m17.marchand_status = missing` · 19 — · 20 M18 (mesmo dia, outra unidade; cartela separa).

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m17_jump` | Salte na sequência | sim | luz verde | aterragem | — | — | B |
| `obj_m17_rally` | Reúna o grupo por senha | sim | B | 5 reunidos | — | `men_rallied`, `dunning_fired` | C |
| `obj_m17_recon_avoid` | Reconheça as vias; leve informação ao bloqueio | sim | C | roadblock | — | `patrol_avoided` | — |
| `obj_m17_link_groups` | Ligue o bloqueio à cidade | sim | roadblock | confirmação | — | — | D |
| `obj_m17_block_access` | Interrompa o trânsito no acesso | sim | roadblock | veículo parado | — | `access_held` | — |
| `obj_m17_hold` | Conserve a posição até à reorganização | sim | D | 05:45 | posição invadida → restaurar D | — | E |
| `obj_m17_marchand_gear` | Entregue o equipamento de Marchand | sim (fim) | outro | interação | — | — | — |

### 3.2 Setores
`s1_orchard_hedges` (perto) · `s2_roadblock` (perto) · `s3_town` (médio: 3/505 a limpar a cidade; incêndio; sons) · `s4_dispersed_groups` (médio: grupos dispersos e combates em acessos distintos) · `s5_sky_flak` (longe: transporte aéreo, flak, clarões). Agendas: patrulha 02:40; cidade tomada 04:45; sondas 04:50/05:05; pressão 05:15.

### 3.3 Checkpoints
A antes do salto · B aterragem segura · C reunião · D ligação · E defesa final.

### 3.4 Justiça
Senha sempre funciona com aliados; patrulha evitável; nunca "escuridão ilegível" (lua + fogos); pressão de 05:15 com aviso (mensageiro).

---

## 4. Set pieces

### SP-17-1 "A luz do avião"
Contexto: C-47 → pomar. Preparação: Marchand; o cordel. Experiência: saltar, ver a luz desaparecer, o silêncio. Companheiros: nenhum (isolamento). Ambiente: paraquedas na macieira. Evolução: libertar-se do arnês. Clímax: o silêncio. Consequências: CP-B. Requisitos: [C] descida. Integração: `obj_m17_jump`.

### SP-17-2 "O sinal na sebe"
Contexto: reunião. Preparação: Dunning assustado. Experiência: desafiar em vez de disparar. Companheiros: Harker; os dois do outro stick. Ambiente: sebe. Evolução: senha. Clímax: a resposta. Consequências: `dunning_fired`. Requisitos: [B] senha. Integração: `obj_m17_rally`.

### SP-17-3 "A posição está aqui"
Contexto: bloqueio. Preparação: patrulha contornada/contactada. Experiência: correr como mensageiro; bazooka pára o veículo; aguentar até 05:45. Companheiros: bloqueio; Harker. Ambiente: veículo a arder. Evolução: sondas → pressão. Clímax: reorganização. Consequências: `access_held`. Requisitos: [A]; [C] veículo proxy. Integração: `obj_m17_link_groups/block_access/hold`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| C-47 | equipamento, luzes, cordel | gestos | flak | — | Marchand | — |
| pomar | paraquedas na macieira, arnês | — | silêncio | — | — | — |
| sebes | cão, vaca morta pela flak | patrulha | o sinal | (opcional) | os dois do outro stick | musette de Marchand |
| bloqueio | sacos, bazooka | ligação | veículo | sondas | tenente (voz) | veículo a arder |
| cidade (fundo) | incêndio, casas abertas | 3/505 | — | — | moradores | — |

Objetos com origem: o cordel (equipamento de salto), a musette de Marchand (perdida ao aterrar; ele não), o veículo a arder (bazooka do bloqueio), o incêndio na cidade (noite de 5/6 — facto, sem a torre).

---

## 6. Diálogos (VO inglês americano; senha sussurrada)

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Harker | "Primeiro saiba quem está ao seu lado." (§79) | C-47 t 24 | 1 | — |
| 002 | companheiro (do outro stick) | "Vi outros homens no pomar. Não sei de que companhia." (§79) | senha respondida | 2 | — |
| 003 | Nathan Cole | "Temos ligação. Digam a eles que a posição está aqui." (§79) | regresso do mensageiro | 1 | — |
| 010 | Marchand | "Contei cinco antes de saltarmos. E agora?" (PR #44) | C-47 t 10 | 2 | — |
| 011 | Harker | "Agora contas quem responde." (V1) | 010 | 2 | — |
| 012 | Dunning | "Flak." (V1) | flak | 3 | — |
| 013 | Harker | "Verde! Vão!" (V1) | luz verde | 0 | — |
| 014 | Cole | (respiração; sem fala) | aterragem | — | — |
| 015 | Harker (sussurro) | "Flash." — Cole: "Thunder." (V1; P-C17) | senha | 1 | — |
| 016 | Harker | "Dois. Faltam muitos." (V1) | reunido | 2 | — |
| 017 | Dunning | "Ali! Na sebe!" (V1) | sinal | 1 | — |
| 018 | Cole | "Espera. Não sabes quem está ali." (PR #44) | 017 | 0 | — |
| 019 | Cole | "Flash." (V1) | desafio | 1 | — |
| 020 | outro stick | "Thunder. Thunder! Não disparem!" (V1) | resposta | 1 | — |
| 021 | Harker | (se disparo) "Era dos nossos. Agora carrega-o." (V1) | dunning_fired | 1 | — |
| 022 | Harker | "Patrulha. Seis. Pelo pátio, ou saltamos-lhes em cima. Decide, Cole." (V1) | patrulha | 1 | — |
| 023 | Dunning | "Saltamos." (V1) | 022 | 3 | — |
| 024 | Harker | "Cão. Devagar." (V1) | pátio | 2 | — |
| 025 | bloqueio (voz) | "Flash!" — "Thunder." — "Entrem. Quem são?" (V1) | roadblock | 1 | — |
| 026 | Harker | "Cinco do terceiro. Informação: patrulha a norte, seis, há meia hora." (V1) | informação | 1 | — |
| 027 | tenente (voz) | "Precisamos de ligação com a cidade. Alguém rápido." (V1) | ligação | 1 | — |
| 028 | Harker | "Cole. Estrada ou sebe. Vai e volta." (V1) | mensageiro | 1 | — |
| 029 | orla da cidade (voz) | "Terceiro batalhão. A cidade é quase nossa. Digam ao bloqueio que aguente." (V1) | orla | 1 | — |
| 030 | bloqueio | "Veículo! Norte!" (V1) | veículo | 0 | — |
| 031 | bazooka | "Deixem-no chegar. …Agora." (V1) | bazooka | 1 | — |
| 032 | Harker | "Infantaria a desmontar. Fogo." (V1) | desmonta | 0 | — |
| 033 | mensageiro | "Cidade tomada. Quatro e quarenta e cinco." (V1) | 04:45 | 1 | — |
| 034 | Harker | "Sondas. Não persigam. Posição." (V1) | sondas | 1 | 30 |
| 035 | Dunning | "Vêm mais." (V1) | pressão | 1 | — |
| 036 | Harker | "Salva! Muda!" (V1) | rotação | 0 | 20 |
| 037 | tenente (voz) | "Reorganização. Chamada." (V1) | 05:45 | 1 | — |
| 038 | Harker | "Marchand." (silêncio) "Marchand." (V1) | chamada | 1 | — |
| 039 | Cole | "Vi a luz do avião desaparecer. Depois encontrei a voz deles." (PR #44) | outro | 2 | — |
| 040 | Harker | "Guardamos isto. Ele volta ou não volta; o saco fica." (V1) | entrega | 2 | — |

Callouts: `co_m17_challenge` ("Flash!"), `co_m17_vehicle_north`, `co_m17_salvo`. Silêncio: o pomar.

---

## 7. Arte e atmosfera

**Paleta:** azul-noite, laranja do incêndio na cidade, verde-preto de sebes, branco de paraquedas, M42 verde-cinza. **Luz:** 01:15 luz vermelha do avião; 01:40 lua entre nuvens (legível); 05:45 azul → dourado. **Materiais:** seda de paraquedas, lama, sebes, pedra normanda. **Silhuetas:** a igreja e a praça (sem a torre como cena), macieiras, o bloqueio. **Destruição:** veículo a arder, vaca morta, casas abertas na cidade. **Humanos:** M42 jump uniform, M1C, rosto molhado, lama. **Violência reduzida:** sem corpos em close.

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| C-47 | motores, equipamento, luz | — | flak | — |
| salto | vento, paraquedas | outros paraquedas | MG para o céu | — |
| pomar | respiração, arnês | — | fogos | **obrigatório** |
| sebes | sussurros, lama, cão | patrulha | — | — |
| bloqueio | bazooka, motor, Garand | cidade (3/505) | transporte aéreo | — |
| amanhecer | aves, chamada | moradores | — | — |

Sons novos: C-47, paraquedas T-5, senha sussurrada, pomar normando noturno, bazooka. VO inglês.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| Pathfinders do 505.º sobre DZ O 01:21; lançamento preciso | D (resumo) | H17; S-C17 | — |
| 3/505 toma a cidade 04:30–05:00 | D | S-C17 | — |
| Senha Flash/Thunder/Welcome (101.ª); uso pela 82.ª | D/P | S-C17 | **P-C17** |
| Incêndio na cidade na noite de 5/6 | D (geral) | — | — |
| Contra-ataques 6–7/6 pelo norte/sul | D | S-C17 | — |
| Bloqueio no acesso norte; veículo; stick | R/F | — | P-C17 |
| Equipamento 1944 (M42, M1C, T-5, bazooka, Gammon) | D | — | auditoria |

**Proibições:** a torre/Steele; grilo sem confirmação; paraquedas moderno; toda a cidade por Cole; Krause em cena. **Fora de cena:** Krause, Ridgway, Steele.

---

## 10. Handoff técnico

**Contrato:** `id m17_sainte_mere_eglise`, `order 17`, relógio 01:15→06:10, grupos (`grp_stick`, `grp_other_stick`, `grp_roadblock`, `grp_bazooka`, `grp_de_patrol`, `grp_de_vehicle`, `grp_de_reaction`), setores, checkpoints A–E, cutscenes (intro, outro), falas, flags, debrief.

**Flags:** `m17.completed`, `m17.men_rallied`, `m17.dunning_fired`, `m17.dunning_status`, `m17.patrol_avoided`, `m17.access_held`, `m17.marchand_status = missing` (fixo).

**Sistemas:** [C] descida de paraquedas com controlo limitado; senha como interação de fala ([B]); [A] fogo como dados, rotação, mensageiro; [C] veículo como proxy. [D] nenhum.

**Disciplinas:** Level: pomar, sebes, pátio, bloqueio, orla da cidade (silhueta); Combate/IA: patrulha evitável, sondas; Arte: noite normanda; Personagens: paraquedistas 1944 (6+), alemães; Animação: arnês, senha sussurrada, mensageiro; Som: C-47/paraquedas; VO: inglês; Historiador: P-C17; QA: senha; `dunning_fired` com ferido real; `marchand_status`.

**Testes:** senha nunca falha com aliados; disparo no sinal fere um aliado por tiro real; cidade tomada às 04:45 do relógio; Marchand nunca encontrado.

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| Toque no ombro; verde | (intro) | tocar | Marchand; Harker | — | start | CP-A |
| A luz desaparece | `obj_m17_jump` | olhar; corrigir | — | silêncio | verde | CP-B |
| Senha; o sinal na sebe | `obj_m17_rally` | desafiar/(não) disparar | Dunning; os dois do outro stick | — | sinal | CP-C; `dunning_fired` |
| Patrulha | `obj_m17_recon_avoid` | contornar/contactar | Harker aceita | — | patrulha | `patrol_avoided` |
| Ligação; veículo | `obj_m17_link_groups/block_access` | mensageiro; cobrir | bazooka; 3/505 | veículo a arder | roadblock | CP-D |
| Até à reorganização | `obj_m17_hold` | rotação | sondas → pressão | — | D | CP-E |
| Chamada | `obj_m17_marchand_gear` | entregar | Harker chama | — | 05:45 | `m17.completed` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 8 | isolar → ligar; o cordel. |
| 2 | Autenticidade | 7 | lançamento/cidade D; senha da 82.ª P-C17. |
| 3 | Personagens | 7 | Harker, Dunning; Marchand em duas falas (por desenho). |
| 4 | Diálogos | 8 | senha como diálogo. |
| 5 | Originalidade | 8 | nenhuma torre; reunir por voz. |
| 6 | Variedade | 8 | saltar, reunir, contornar/contactar, mensageiro, bloquear, aguentar. |
| 7 | Set pieces | 8 | três. |
| 8 | Atmosfera | 8 | noite legível. |
| 9 | Environmental storytelling | 7 | musette; vaca; incêndio. |
| 10 | Cinematográfica | 8 | a luz do avião. |
| 11 | Sonora | 8 | sussurros. |
| 12 | Impacto emocional | 7 | faltas na chamada. |
| 13 | Ritmo | 8 | 20–27 min. |
| 14 | Continuidade | 7 | isolada; Nathan ≠ Henry (regra). |
| 15 | Integração técnica | 6 | descida [C]; resto [A]/[B]. |

**Correções aplicadas:** (1) o grilo foi retirado (101.ª) em favor de senha de voz com pendência; (2) a torre/Steele proibida explicitamente; (3) o disparo no sinal tem consequência real (ferido aliado) sem recompensa.
