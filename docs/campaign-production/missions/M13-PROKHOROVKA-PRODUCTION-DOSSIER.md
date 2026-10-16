# M13 — AÇO · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** 12/7/1943, setor de Prokhorovka, batalha de Kursk; 5.º Exército de Tanques de Guardas; POV Ivan Demin; T-34/76 apropriado ao setor; fonte H13; 20–28 min; três falas; checkpoints "aproximação; primeiro confronto; avaria recuperável; manobra final"; sem T-34/85 nem "linha infinita de Tigers"; saída a pé só se projetada e validada; sem placar triunfal. **Proposto:** 29.º Corpo de Tanques, 31.ª Brigada (S-C06; RECONSTRUÇÃO, P-C13); tripulação nomeada; relógio ancorado no sinal das 08:30 e na orla do sovkhoz às 10:30; **o fosso antitanque não é encenado como facto**; flags. **Sistema:** tanque jogável [C]/[D] — bancada do Marco 4.

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m13_prokhorovka` / 13 |
| Datas | 1943-07-12T07:30+03:00 → 1943-07-12T13:40+03:00 |
| Local | área de reunião a sudoeste de Prokhorovka, junto do aterro ferroviário → campos → sovkhoz Oktyabrsky / cota 252.2 → ponto de reunião (`RECONSTRUCTED`; P-C13) |
| Operação | contra-ataque do 5.º Ex. Tanques Guardas contra o II SS-Pz Korps; sinal 08:30; 31.ª Bde na orla do sovkhoz 10:30 com perdas pesadas por artilharia e aviação; nascer do sol 05:02 (D em resumo, S-C06) |
| Unidade | 5.º Ex. Tanques Guardas (canónico) → 29.º Corpo, 31.ª Bde (R) → tanque ficcional |
| Elenco | Demin (POV, condutor-mecânico), leyt. Arkady Fomin (comandante-apontador; no T-34/76 o comandante aponta), sgt. Nikita Grach (municiador), Semyon Tsoi (rádio/metralhador de casco) (propostas); tripulação do tanque vizinho (4) |
| Fora de cena | Rotmistrov |
| Intocável | data, unidade, POV, veículo (T-34/76), falas `dlg_m13_001–003`, checkpoints, "não repetir mitos de proporções", a chamada da tripulação, "quantos saíram daquele tanque" |

---

## 1. Story Bible

**Logline.** Dentro de um T-34, a guerra é um visor, quatro vozes e um motor. Demin conduz; Fomin aponta; Grach carrega; Tsoi escuta. Quando a torre fica lenta e o tanque ao lado arde, a pergunta deixa de ser quantos alvos — é quantos saíram.

**As oito respostas.**
1. **Situação central:** dentro de um tanque, a guerra é um visor.
2. **Modo de contar:** tripulantes que saíram (dos tanques vizinhos e do próprio).
3. **Objeto:** a escotilha (Demin bate-lhe para confirmar que fechou; no fim verifica se cada um respondeu).
4. **Silêncio:** motor desligado, metal a estalar.
5. **Tarefa que não é matar:** conduzir; manter formação; reposicionar; cobrir a saída de uma tripulação; proteger a ligação com a infantaria.
6. **Custo humano:** o tanque vizinho arde e parte da tripulação tenta sair (causa: impacto de AT) → Grach quer disparar ao alvo que os atingiu / Fomin proíbe perseguir um alvo que cortaria a passagem dos sobreviventes → o jogador cobre a zona (fumo/HE) e reposiciona; `m13.neighbor_crew_rescued`.
7. **Pessoas históricas:** fora de cena.
8. **Debrief:** regista a operação, as perdas soviéticas pesadas, a violência do combate, sem "vitória tática" nem mitos de Tigers.

**Três motivos.** (a) *Quatro funções* — o tanque é uma tripulação; (b) *o visor* — ver pouco, ouvir muito; (c) *sair* — tripulações que saem contam mais do que alvos.

**Temas.** Confiança dentro de uma máquina que falha; medir êxito; claustrofobia; a chamada.

**Estrutura (§54).** CONTEXTO → INTRO (interior; a escotilha; a formação) → APROXIMAÇÃO (marcha; inércia; casco/torre) → DIÁLOGO (Fomin pelo periscópio) → PRIMEIRO CONTATO (AT na orla; posições) → ESCALADA (formação vizinha perde veículos) → COMBATE PRINCIPAL (avaria: torre lenta; reposicionar) → SET-PIECE (o tanque que arde; a saída) → PAUSA (depressão; reparação) → CLÍMAX (manobra local; ponto de reunião) → CONSEQUÊNCIA (chamada) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Demin | lê indicadores, não vozes | Fomin (ordens), Grach (torre) | a torre lenta; o tanque vizinho | conta tripulações | "Quantos saíram daquele tanque?" (003) |
| Fomin | "Mantenha a formação enquanto houver passagem." (001) | tripulação | o alvo que cortaria a passagem | — | vivo |
| Grach | "Torre lenta!" (002) | — | quer disparar | obedece | vivo (ou ferido leve: `m13.grach_status`) |
| Tsoi | rádio | — | rádio avariado | — | vivo |
| tripulação vizinha | — | — | arde | — | `m13.neighbor_crew_rescued (0–4)` |

**O que a missão recusa.** T-34/85; Tigers em série; fosso antitanque como facto; herói invulnerável; câmara externa que esconde teletransporte; placar; saída a pé sem sistema.

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "Escotilha" (`cs_m13_intro`, ≤ 75 s)
2 07:30 · 3 interior do T-34/76 na área de reunião (aterro ferroviário à direita) · 4 luz pelas fendas; poeira; nascer do sol já passado (05:02) · 5 Demin, Fomin, Grach, Tsoi; brigada em redor (motores) · 6 Cartela: PROKHOROVKA — 12 DE JULHO DE 1943 — 07:30 · 31.ª BRIGADA DE TANQUES · 5.º EXÉRCITO DE TANQUES DE GUARDAS. Interior apertado; motor; tripulação confere tarefas; Demin bate na escotilha; Fomin aponta a formação e o terreno pelo periscópio: "Mantenha a formação enquanto houver passagem." (001). · 7 estabelecer as quatro vozes · 8 olhar pelo visor do condutor; bater na escotilha (gesto) · 9 — · 10 — · 11 — · 12 munição estivada, uma fotografia colada, óleo · 13 `dlg_m13_001` (canónica), `010–013` · 14 diesel V-2 ao ralenti; metal · 15 primeira pessoa (condutor); câmara externa **opcional** 3 s para escala (segura) · 16 `missionStart` · 17 Fomin: "Em frente." · 18 `cp_m13_a_aproximacao` · 19 skip → a conduzir · 20 —

### Cena 2 — "Marcha" (jogável; `obj_m13_drive`)
2 07:45–08:30 · 3 2 km de campos até à linha de partida · 4 sol baixo a leste (sem glare às 08:30: S-C06) · 5 brigada · 6 Conduzir com inércia, limites do terreno (valas, aterro), casco e torre distintos; o tutorial acontece no deslocamento; manter distância na coluna · 7 §79 ponto 1 · 8 acelera/trava/vira; aprende que a torre roda independentemente (Fomin manda) · 9 — · 10 outros tanques em coluna · 11 nenhum; artilharia ao longe · 12 campos de trigo, uma vala · 13 `dlg_m13_014–017` · 14 motor por regime; engrenagem da torre · 15 condutor; câmara externa opcional em ponto seguro · 16 CP-A · 17 08:30 sinal (`evt_m13_signal`) · 18 — · 19 [C] veículo · 20 —

### Cena 3 — "Primeiro confronto" (jogável; `obj_m13_first_contact`)
2 08:30–09:45 · 3 campos até à orla do sovkhoz; depressões; cota 252.2 em frente · 4 sol; poeira; fumo · 5 brigada; infantaria motorizada a seguir; artilharia e aviação alemã · 6 Avançar com outros veículos por valas, elevações e acessos; **decisão:** cobertura por depressão (lenta, protegida) ou apoiar a infantaria numa faixa mais exposta; combater posições AT e veículos identificados (Fomin informa orientação/dano/alvo sem HUD onisciente); proteger a ligação com a infantaria · 7 §79 pontos 2–3 · 8 conduz à posição; Fomin aponta e dispara (o jogador pode assumir a pontaria em assistência: configurável); mantém a infantaria coberta · 9 depressão vs faixa exposta · 10 Fomin, Grach, Tsoi com falas de função; infantaria segue/para · 11 PaK 40 na orla, Pz IV, um StuG (proxies com estados); Stukas (safeImpact adaptado) · 12 trigo a arder; crateras · 13 `dlg_m13_018–023` · 14 76 mm; impactos no casco; aviação · 15 condutor · 16 sinal · 17 primeiro alvo neutralizado / posição alcançada · 18 `cp_m13_b_primeiro_confronto` · 19 [C] · 20 —

### Cena 4 — "Torre lenta" (jogável; `obj_m13_damage`)
2 09:45–10:30 · 3 orla do sovkhoz · 4 fumo · 5 tripulação; formação vizinha · 6 A formação vizinha perde veículos (visível: dois tanques param, um arde); o tanque do grupo sofre **avaria recuperável** (impacto no anel da torre: rotação lenta; Grach: "Torre lenta! Preciso que você gire o casco." — 002); reposicionar numa depressão; ação concreta da tripulação (Grach com a manivela manual; Tsoi comunica) · 7 §79 ponto 4 · 8 roda o casco para apontar (mecânica: a torre não acompanha); recua para a depressão · 9 — · 10 Grach na manivela; Fomin aponta pelo casco · 11 AT; infantaria alemã com Panzerfaust? (**não** em julho 1943: Panzerfaust só do final de 1943 — usar Hafthohlladung/granadas e PaK) · 12 — · 13 `dlg_m13_002` (canónica), `024–027` · 14 engrenagem a falhar; manivela · 15 condutor · 16 CP-B · 17 depressão alcançada · 18 `cp_m13_c_avaria_recuperavel`; `m13.turret_damaged = true` · 19 [C] dano por componente · 20 —

### Cena 5 — "O tanque que arde" (`cs_m13_neighbor`, ≤ 25 s; jogável depois) — **custo humano**
2 10:30–11:00 · 3 depressão; tanque vizinho a 60 m a arder · 4 fumo negro · 5 tripulação; 4 homens do tanque vizinho (2 saem, 1 ferido, 1 preso) · 6 Pela fenda: o tanque vizinho arde; homens tentam sair; Grach quer disparar ao Pz IV que os atingiu; Fomin proíbe: perseguir cortaria a passagem dos sobreviventes; cobrir a zona (HE sobre a infantaria que os caça; fumo) e **permitir a saída** · 7 §79 ponto 4 (saída de homens de um veículo aliado) · 8 posiciona o casco para cobrir; Fomin dispara HE à infantaria; o jogador decide a janela (30 s) · 9 cobrir vs perseguir (perseguir = Fomin recusa a ordem: o tanque não se move para lá; sem janela falsa) · 10 Grach obedece; Tsoi conta pela rádio quem saiu · 11 infantaria alemã; Pz IV recua · 12 tanque a arder (persistente) · 13 `dlg_m13_028–032` · 14 incêndio; gritos abafados pelo casco · 15 condutor; beat: a fenda (3 s) · 16 CP-C · 17 janela fecha · 18 `m13.neighbor_crew_rescued (0–3)` · 19 [C] tripulações como atores que saem de veículos · 20 —

### Cena 6 — "Manobra final" (jogável; clímax; `obj_m13_final_maneuver`)
2 11:00–12:40 · 3 depressão → flanco do sovkhoz → edifícios → ponto de reunião atrás do aterro · 4 sol alto; fumo · 5 tripulação; infantaria motorizada; brigada · 6 Apoiar uma manobra local (a infantaria toma um edifício do sovkhoz com o apoio do tanque pelo flanco) e chegar ao ponto de reunião/posição consolidada; se o tanque for perdido (fogo), **restaurar CP-C** (saída a pé não projetada) · 7 §79 ponto 5 · 8 conduz pelo flanco com a torre lenta (casco a apontar); apoia com HE; alcança a reunião · 9 — · 10 infantaria toma o edifício · 11 PaK, infantaria · 12 edifício do sovkhoz tomado; tanques imobilizados no campo · 13 `dlg_m13_033–037` · 14 — · 15 condutor · 16 janela · 17 reunião (`evt_m13_rally`) · 18 `cp_m13_d_manobra_final` · 19 [C] · 20 —

### Cena 7 — "Chamada" (`cs_m13_outro`, ≤ 60 s) + debrief
2 12:40–13:40 · 3 ponto de reunião; motor desligado · 4 sol; fumo · 5 tripulação; sobreviventes de outros tanques · 6 Motor desligado; metal a estalar; a tripulação faz a chamada (Fomin, Grach, Tsoi, Demin); um sobrevivente do tanque vizinho sai tossindo e senta-se no casco; Demin: "Quantos saíram daquele tanque?" (003). Tsoi: o número. · 7 consequência canónica · 8 skip; (jogável: abrir a escotilha — interação) · 9 — · 10 — · 11 — · 12 tanques imobilizados no campo; fumo · 13 `dlg_m13_003` (canónica), `038–041` · 14 **silêncio obrigatório**: metal a estalar · 15 beat: escotilha aberta (3 s); o campo (4 s) · 16 rally · 17 debrief · 18 `m13.completed` · 19 — · 20 M14 (outra frente).

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m13_drive` | Conduza até à linha de partida em coluna | sim | intro | linha | — | — | A |
| `obj_m13_advance` | Avance com a brigada: depressão ou faixa exposta | sim | sinal | orla | — | `m13.axis` | — |
| `obj_m13_first_contact` | Neutralize a posição AT; proteja a infantaria | sim | orla | posição | tanque destruído → restaurar A/B | — | B |
| `obj_m13_damage` | Torre lenta: reposicione na depressão | sim | impacto | depressão | — | `turret_damaged` | C |
| `obj_m13_cover_neighbor` | Cubra a saída da tripulação vizinha | sim (janela) | C | 30 s | — | `neighbor_crew_rescued` | — |
| `obj_m13_final_maneuver` | Apoie a infantaria no sovkhoz; chegue à reunião | sim | janela | rally | tanque destruído → restaurar C | — | D |
| `obj_m13_hatch` | Abra a escotilha; chamada | sim (fim) | rally | interação | — | — | — |

### 3.2 "Batalha ao redor"
`s1_crew_tank` (perto) · `s2_brigade` (médio: formações com trajetórias próprias; perdas por evento) · `s3_infantry` (médio: infantaria motorizada que segue/para) · `s4_german_line` (médio: PaK, Pz IV, StuG como proxies com estados) · `s5_far` (longe: baterias, fumo, combate noutros eixos, Stukas). Agendas: sinal 08:30; perdas da formação vizinha 09:50; tanque vizinho atingido 10:30; edifício tomado 12:00.

### 3.3 Checkpoints
A aproximação (solo) · B primeiro confronto (estado do tanque e da brigada) · C avaria recuperável (torre lenta; depressão) · D manobra final (reunião; destroços persistentes).

### 3.4 Justiça
Dano por componente (torre, lagarta, rádio, ótica) com efeitos legíveis; tanque nunca invulnerável; Stukas com aviso; infantaria alemã sem Panzerfaust (1943/7); assistência de pontaria configurável.

---

## 4. Set pieces

### SP-13-1 "Marcha"
Contexto: coluna. Preparação: escotilha; Fomin aponta. Experiência: inércia, torre independente, distância. Companheiros: coluna. Ambiente: trigo, aterro. Evolução: o sinal. Clímax: avançar. Consequências: CP-A. Requisitos: [C] veículo. Integração: `obj_m13_drive`.

### SP-13-2 "Torre lenta"
Contexto: orla. Preparação: formação vizinha perde veículos. Experiência: o impacto; a torre não roda; girar o casco para apontar; a manivela de Grach. Companheiros: quatro vozes. Ambiente: fumo. Evolução: depressão. Clímax: fala 002. Consequências: `turret_damaged`. Requisitos: [C] dano por componente. Integração: `obj_m13_damage`.

### SP-13-3 "Quantos saíram"
Contexto: tanque vizinho a arder. Preparação: cena 4. Experiência: cobrir a saída; Fomin recusa perseguir. Companheiros: Grach obedece; Tsoi conta. Ambiente: fumo negro. Evolução: 30 s. Clímax: a chamada no fim. Consequências: `neighbor_crew_rescued`. Requisitos: [C] tripulações que saem. Integração: `obj_m13_cover_neighbor`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| interior | munição, fotografia, óleo, escotilha | tripulação | motor | — | quatro vozes | — |
| campos | trigo, aterro, vala | coluna | artilharia | — | — | trigo a arder |
| orla | PaK, cota 252.2, sovkhoz | brigada | fumo | AT | infantaria | tanques parados |
| depressão | — | manivela | — | — | Grach | — |
| tanque vizinho | — | homens a sair | incêndio | infantaria | tripulação | destroço persistente |
| sovkhoz | edifícios, silo | infantaria toma | — | PaK | — | edifício tomado |
| reunião | destroços no campo | chamada | — | — | sobrevivente a tossir | — |

Objetos com origem: a fotografia (Grach), a manivela manual (T-34/76 real), os tanques imobilizados (29.º Corpo, manhã de 12/7), o silo do sovkhoz.

---

## 6. Diálogos (VO russo; por função)

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Fomin | "Mantenha a formação enquanto houver passagem." (§79) | intro t 30 | 1 | — |
| 002 | Grach | "Torre lenta! Preciso que você gire o casco." (§79) | impacto no anel | 0 | — |
| 003 | Demin | "Quantos saíram daquele tanque?" (§79) | outro t 8 | 1 | — |
| 010 | Fomin | "Confirme a escotilha. Não quero ninguém solto." (PR #44) | intro t 8 | 1 | — |
| 011 | Grach | "Vinte e cinco perfurantes, dez explosivas. Contei duas vezes." (V1) | intro t 14 | 2 | — |
| 012 | Tsoi | "Rádio funciona. Até funcionar menos." (V1) | intro t 20 | 3 | — |
| 013 | Fomin | "Em frente. Distância de cinquenta." (V1) | fim intro | 1 | — |
| 014 | Fomin | "Vala à direita. Casco a esquerda, torre fica." (V1) | vala | 1 | — |
| 015 | Grach | "A torre é minha quando ele manda. O casco é teu." (V1) | tutorial | 2 | — |
| 016 | Tsoi | "Coluna pede distância. Estás em cima deles." (V1) | distância < 20 m | 2 | 30 |
| 017 | Tsoi | "Sinal. Oito e meia." (V1) | 08:30 | 1 | — |
| 018 | Fomin | "Depressão à esquerda ou faixa com a infantaria. Demin: tu levas-nos." (V1) | escolha | 1 | — |
| 019 | Fomin | "PaK na orla. Onze horas. Parar." (V1) | contacto | 0 | — |
| 020 | Grach | "Perfurante!" (V1) | carregar | 1 | 20 |
| 021 | Fomin | "Fogo." / "Curto. Outra." (V1) | tiro | 1 | — |
| 022 | Tsoi | "Infantaria pede que não a deixemos. Devagar." (V1) | infantaria atrás | 2 | 40 |
| 023 | Fomin | "Aviões! Não parem no mesmo sítio." (V1) | Stukas | 0 | — |
| 024 | Tsoi | "A formação à direita perdeu dois." (V1) | perdas | 2 | — |
| 025 | Fomin | "Impacto. Anel. Grach, manivela." (V1) | impacto | 0 | — |
| 026 | Grach | "Manivela. Dez graus por… muito tempo." (V1) | manivela | 2 | — |
| 027 | Fomin | "Depressão. Recua. Casco aponta por mim." (V1) | reposicionar | 1 | — |
| 028 | Tsoi | "O vizinho arde. Estão a sair." (V1) | tanque vizinho | 1 | — |
| 029 | Grach | "O Panzer que o atingiu está ali! Deixa-me—" (V1) | 028 | 2 | — |
| 030 | Fomin | "Não. Se vamos atrás dele, cortamos a passagem deles. Explosiva sobre a infantaria. Demin, casco a duas horas." (V1) | 029 | 0 | — |
| 031 | Tsoi | "Dois fora. Um a arrastar-se. Um…" (V1) | janela | 2 | — |
| 032 | Fomin | "Antes de contar os deles, vê se os nossos saíram." (PR #44) | janela fecha | 2 | — |
| 033 | Tsoi | "Infantaria vai ao edifício. Pedem o flanco." (V1) | manobra | 1 | — |
| 034 | Fomin | "Flanco. Torre lenta, por isso o casco anda." (V1) | flanco | 1 | — |
| 035 | Grach | "Explosiva!" (V1) | HE | 1 | 20 |
| 036 | Tsoi | "Edifício é deles. Nosso. É nosso." (V1) | tomado | 2 | — |
| 037 | Fomin | "Reunião atrás do aterro. Devagar." (V1) | rally | 1 | — |
| 038 | Fomin | "Motor." (V1) | rally | 1 | — |
| 039 | Fomin | "Chamada. Grach." "Aqui." "Tsoi." "Aqui." "Demin." (V1) | outro | 1 | — |
| 040 | Tsoi | "Daquele? Dois. O terceiro não." (V1 variantes por flag) | 003 | 1 | — |
| 041 | Demin | "Chamem cada um. Não desliguem ainda o rádio." (PR #44) | outro | 2 | — |

Callouts: `co_m13_pak`, `co_m13_hit_component`, `co_m13_aircraft`. Silêncio: motor desligado.

---

## 7. Arte e atmosfera

**Paleta:** verde-oliva (4BO), trigo dourado, preto de fumo, cinza de poeira, laranja de incêndio; interior: branco sujo e óleo. **Luz:** 07:30 Sol a leste (el 25°), 10:30 alto, nuvens de chuva na frente (S-C06: sem tempestade), poeira constante. **Materiais:** aço, trigo, terra, lona. **Silhuetas:** aterro ferroviário, silo do sovkhoz, cota 252.2, tanques imobilizados. **Destruição:** trigo a arder, tanques (persistentes), edifício. **Humanos:** capacete acolchoado, macacão, óleo; o sobrevivente a tossir. **Violência reduzida:** sem corpos visíveis nos destroços.

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| interior | V-2 por regime, engrenagem da torre, metal, respiração | coluna | artilharia | — |
| avanço | 76 mm, impactos por componente (anel, lagarta, casco), rádio | brigada, infantaria | Stukas, baterias | — |
| avaria | manivela, engrenagem a falhar | — | — | — |
| vizinho | incêndio abafado, gritos abafados | infantaria | — | — |
| manobra | HE, infantaria | edifício | — | — |
| reunião | metal a estalar, escotilha | — | — | **obrigatório** |

Sons novos: interior de T-34 (vibração, abafamento), 76 mm, impactos por componente, manivela, Pz IV/PaK à distância. VO russo.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| 12/7: sinal 08:30; 31.ª Bde na orla do sovkhoz 10:30; perdas por artilharia/aviação | D (resumo) | H13; S-C06 | leitura |
| Nascer do sol 05:02 | D | S-C06 | — |
| 29.º Corpo: 25.ª/31.ª/32.ª Bde, 53.ª Mot. | D | S-C06 | — |
| Fosso antitanque | contestado → **não encenado** | S-C06 | — |
| T-34/76 modelo 1943 (torre hexagonal); comandante-apontador | D | geral | modelo exato P-C13 |
| Clima | R (nuvens de chuva) | S-C06 | P-C13 |
| Panzerfaust | **proibido** (não existia em julho 1943) | geral | — |
| Fomin, Grach, Tsoi, Demin | F | — | — |

**Proibições:** T-34/85, Tigers em série, fosso como facto, Panzerfaust, Rotmistrov em cena, placar. **Fora de cena:** Rotmistrov.

---

## 10. Handoff técnico

**Contrato:** `id m13_prokhorovka`, `order 13`, relógio 07:30→13:40, `player.vehicle: t34_76_m1943` ([D] opcional no schema), `crew` (4, com funções e estados), grupos (`grp_brigade`, `grp_infantry`, `grp_neighbor_tank`, `grp_de_line`, `grp_de_armor`, `grp_aircraft`), setores, checkpoints A–D, cutscenes (intro, neighbor, outro), falas, flags, debrief.

**Flags:** `m13.completed`, `m13.axis`, `m13.turret_damaged`, `m13.track_damaged`, `m13.radio_damaged`, `m13.ammo_ap/he`, `m13.grach_status`, `m13.neighbor_crew_rescued (0–3)`, `m13.tank_lost (bool, só para restore)`.

**Sistemas:** [C] veículo (casco/torre, inércia, componentes, dano, tripulação com estados, munição por tipo, visores), tripulações como atores que saem de veículos, proxies blindados; [D] `player.vehicle`/`crew` no schema; [A] falas/eventos/setores. **Bancada do Marco 4:** "tanque em bancada que sirva a M13" (§77); §80 VEÍCULOS: "casco/torre, colisão, componentes, dano, tripulação e restauração coerentes".

**Disciplinas:** Eng. sim: modelo de tanque; Level: 3 km de campos + sovkhoz; Combate/IA: PaK/Pz IV com estados; Arte: T-34/76 1943 interior/exterior; Personagens: 4 + 4; Animação: manivela, saída de veículo; Som: interior; VO: russo; Historiador: P-C13; QA: restore B/C com estado do tanque; `tank_lost` → restore, nunca a pé.

**Testes:** componentes serializados; torre lenta altera rotação; janela de 30 s determinística; chamada sempre quatro vozes.

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| Escotilha | (intro) | bater | Fomin aponta | — | start | CP-A |
| Marcha | `obj_m13_drive` | conduzir; distância | coluna | — | A | — |
| Sinal; depressão ou faixa | `obj_m13_advance` | escolher; conduzir | infantaria | trigo a arder | 08:30 | `axis` |
| PaK na orla | `obj_m13_first_contact` | posicionar; Fomin dispara | Grach carrega | — | contacto | CP-B |
| Torre lenta | `obj_m13_damage` | girar o casco; recuar | Grach manivela | — | impacto | CP-C |
| O vizinho arde | `obj_m13_cover_neighbor` | cobrir a saída | Fomin recusa perseguir; Tsoi conta | destroço | 10:30 | `neighbor_crew_rescued` |
| Flanco do sovkhoz | `obj_m13_final_maneuver` | casco a apontar; HE | infantaria toma o edifício | edifício | janela | CP-D |
| Chamada | `obj_m13_hatch` | abrir a escotilha | quatro vozes; sobrevivente | — | rally | `m13.completed` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 8 | quatro vozes e "quantos saíram". |
| 2 | Autenticidade | 8 | horas e brigada D em resumo; fosso excluído; Panzerfaust excluído. |
| 3 | Personagens | 8 | funções distintas; Grach com impulso. |
| 4 | Diálogos | 8 | por função, curtos. |
| 5 | Originalidade | 8 | torre lenta → casco aponta. |
| 6 | Variedade | 7 | um veículo; fases distintas (marcha, contacto, avaria, saída, manobra). |
| 7 | Set pieces | 8 | três. |
| 8 | Atmosfera | 8 | claustrofobia e trigo. |
| 9 | Environmental storytelling | 7 | interior rico; campo pobre por natureza. |
| 10 | Cinematográfica | 8 | fenda e escotilha. |
| 11 | Sonora | 9 | interior; metal a estalar. |
| 12 | Impacto emocional | 8 | a chamada. |
| 13 | Ritmo | 8 | 20–28 min. |
| 14 | Continuidade | 7 | isolada. |
| 15 | Integração técnica | 4 | bancada nova [C]/[D]. |

**Correções aplicadas:** (1) Panzerfaust removido (anacrónico); (2) o fosso antitanque excluído como facto; (3) perseguir o Pz IV não é janela falsa: Fomin recusa a ordem e o tanque não se move para lá.
