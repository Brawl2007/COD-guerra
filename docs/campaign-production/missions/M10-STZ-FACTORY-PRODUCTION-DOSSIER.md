# M10 — FÁBRICA · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** 14/10/1942, fábrica de tratores de Stalingrado (STZ); setor da 37.ª Divisão de Guardas, 62.º Exército; POV Aleksandr Gromov (novo POV identificado na abertura); fonte H10; 22–30 min; três falas; **perda fixa:** Vasili Rybin apresentado na abertura a trabalhar com Gromov; na rutura do acesso um bombardeamento sinalizado mata-o; a morte é confirmada, nunca falsa opção; o jogador pode ajudar o **outro** ferido; um ID de evento conserva a morte em restauros e skip; Rybin não reaparece na chamada; checkpoints "ligação; entrada do ataque; transferência; retirada"; debrief assume a perda de terreno. **Proposto:** 109.º Regimento de Guardas (S-C28, RECONSTRUÇÃO; P-C10), três galpões com lógica própria (PR #44), relógio ancorado no ataque de 14/10, elenco, flags.

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m10_stz_factory` / 10 |
| Datas | 1942-10-14T07:20+04:00 → 1942-10-14T17:30+04:00 |
| Local | três oficinas da STZ ligadas por passarelas e valas de serviço; posto de coordenação; pátio com trilhos; posição menor junto a um muro — `RECONSTRUCTED` (planta pendente P-C10; nenhum corredor afirmado como edifício exato) |
| Operação | ofensiva alemã de 14/10 (14.ª Pz, 305.ª, 389.ª) após preparação aérea/artilharia; 109.º Reg. absorve o golpe; estádio 11:15; ~100 tanques no recinto 16:30; grupo nas oficinas às 21:00; rutura noturna (~70 homens) para Barrikady; 62.º Exército cortado nessa noite (D em resumo, S-C28) |
| Unidade | 37.ª DG, 62.º Exército (canónico) → 109.º Reg. (R) → secção ficcional (ex-desantniki: a 37.ª DG formou-se do 1.º Corpo Aerotransportado — D) |
| Elenco | Gromov (POV, serzhant), Vasili Rybin (§79, morte fixa), sgt. Ilya Kondratyev (graduado), Timofey Zhdan (o outro ferido), krasn. Petya Lobov (mensageiro), voz de rádio, trabalhador da fábrica com braçadeira (fundo) (propostas) |
| Fora de cena | gen. Zholudev, Chuikov |
| Intocável | data, unidade, POV, falas `dlg_m10_001–003`, checkpoints, a morte de Rybin (fixa, sinalizada, com ID), "limpar um galpão não é vencer", a chamada interrompida |

---

## 1. Story Bible

**Logline.** Numa oficina onde ainda se ouve o eixo de uma máquina, Rybin mostra a Gromov como ela funciona e empresta-lhe uma chave. Às nove e meia o telhado cai sobre ele. O resto do dia é perder oficinas uma a uma, transferir munição e feridos, decidir se o outro ferido ainda cabe na rota — e sair com quem for possível, com a máquina da abertura ao fundo, inalcançável.

**As oito respostas.**
1. **Situação central:** interiores que mudam de dono a cada hora.
2. **Modo de contar:** oficinas mantidas/perdidas (três; no fim nenhuma).
3. **Objeto:** a chave de oficina de Rybin (Gromov só percebe que a guardou quando abandona o galpão).
4. **Silêncio:** o zumbido da máquina que para depois do bombardeamento.
5. **Tarefa que não é matar:** conduzir o mensageiro; transferir munição e feridos; ajudar Zhdan.
6. **Custo humano:** a morte fixa de Rybin (causa: o bombardeamento sinalizado da rutura) → Gromov hesita junto da máquina / Kondratyev chama para Zhdan, que ainda respira → `m10.zhdan_status`; a máquina reaparece inacessível ao fundo.
7. **Pessoas históricas:** fora de cena.
8. **Debrief:** regista a perda da fábrica, a quase destruição da divisão, a rutura noturna para Barrikady, o 62.º Exército cortado; nenhuma conquista.

**Três motivos.** (a) *Níveis* — passarelas, valas de serviço, telhados: a fábrica é vertical; (b) *a máquina* — o que Rybin mostrou torna-se cobertura e depois distância; (c) *sair* — o clímax não é reconquistar.

**Temas.** Perda sem câmara lenta; o abrigo que era oficina; a decisão de ajudar quem ainda respira; a mão que treme.

**Estrutura (§54).** CONTEXTO → INTRO (galpão 1; Rybin; a chave) → APROXIMAÇÃO (ligação entre oficinas; o mensageiro) → DIÁLOGO (Rybin e o eixo) → PRIMEIRO CONTATO (o bombardeamento; a rutura; Rybin) → ESCALADA (galpão 2; poeira) → COMBATE PRINCIPAL (transferência; Zhdan ferido) → SET-PIECE (galpão 3 aberto ao pátio; tanques) → PAUSA (notícias; a ordem de recuar) → CLÍMAX (rota de reunião; cobertura alternada; Zhdan) → CONSEQUÊNCIA (chamada interrompida; a mão) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Gromov | reconhece máquinas pelo ruído; quer recuperar cada metro | Rybin (a chave) | Rybin morre; Zhdan | protege a saída possível | "Eu seguro este lado. Passe primeiro." (003); a mão a tremer |
| Rybin | mostra o eixo; empresta a chave | Gromov | — | — | **morto** (`m10.rybin_status = dead`, ID `evt_m10_rybin_killed`) |
| Kondratyev | "Defendemos a passagem entre estes homens." (001) | secção | a ordem de recuar | — | vivo |
| Zhdan | calado | — | ferido grave na transferência | — | `m10.zhdan_status ∈ {evacuated, left_alive_with_medics? **não**: {evacuated, not_reached}}` |
| Lobov | mensageiro, 18 | Gromov | — | — | vivo |

**O que a missão recusa.** Corredor metálico genérico; morte ornamental em câmara lenta; resgate falso de Rybin; reconquista; disparar através de chapas; rendição encenada (M07 já); Zholudev em cena.

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "O eixo" (`cs_m10_intro`, ≤ 80 s)
2 07:20 · 3 galpão 1 (oficina de montagem: tornos, uma máquina grande ainda com ruído residual, trilhos, pontes rolantes) · 4 luz por claraboias partidas; poeira em suspensão · 5 Gromov, Rybin, Kondratyev, Zhdan, Lobov; trabalhador com braçadeira · 6 Cartela: STALINGRADO, FÁBRICA DE TRATORES — 14 DE OUTUBRO DE 1942 — 07:20 · 37.ª DIVISÃO DE GUARDAS · 62.º EXÉRCITO. "Novo protagonista": Gromov identificado (cartela 2: "Serzhant Aleksandr Gromov"). Soldados reorganizam munição entre máquinas; Rybin mostra a Gromov como a máquina funciona ("Esta máquina para quando se cala o eixo.") e empresta-lhe uma chave de oficina para abrir uma caixa. Kondratyev: ligação entre oficinas; Lobov ao posto de coordenação. · 7 preparação pessoal antes da perda (regra de impacto) · 8 olhar; abrir a caixa com a chave (interação) · 9 — · 10 — · 11 artilharia ao longe; aviões a chegar · 12 máquina, chave, caixas, trilhos, pontes rolantes · 13 `dlg_m10_001` (Kondratyev, canónica), `010–013` · 14 eixo (zumbido grave), metal, aviões altos · 15 beat: Rybin e a máquina (3 s); a chave na mão (2 s) · 16 `missionStart` · 17 Kondratyev: "Ligação." · 18 `cp_m10_a_ligacao`; `m10.key_received` · 19 skip · 20 —

### Cena 2 — "Ligação entre oficinas" (jogável; `obj_m10_link`, `obj_m10_escort_messenger`)
2 07:30–09:15 · 3 passarela galpão 1 → vala de serviço → galpão 2 (telhado danificado) → posto de coordenação numa cave · 4 poeira; luz rasante · 5 Gromov, Lobov; postos · 6 Conferir a ligação entre oficinas (telefone/visual) e conduzir o mensageiro ao posto; o bombardeamento começa (Stukas em vagas; a fábrica treme) · 7 §79 ponto 1 · 8 navega por passarela/vala; protege Lobov; dispara a sondas (30–60 m) · 9 passarela (vê, exposta) vs vala (não vê, protegida) · 10 Lobov segue; postos respondem · 11 sondas alemãs no galpão 2; Stukas (safeImpact) · 12 galpão 2 com telhado em farrapos · 13 `dlg_m10_014–018` · 14 Stukas; metal · 15 livre · 16 CP-A · 17 Lobov no posto · 18 — · 19 [A]; [C] interiores industriais | 20 —

### Cena 3 — "A rutura" (`cs_m10_rybin`, ≤ 25 s; jogável antes e depois) — **morte fixa**
2 09:15–09:40 · 3 galpão 1 (regresso) · 4 poeira · 5 secção; Rybin junto da máquina · 6 Sirenes e sombras: bombardeamento **sinalizado** (três avisos: Kondratyev "Telhado!", a sombra, o assobio). O ataque rompe o acesso; o telhado do galpão 1 cai sobre a máquina. **Rybin morre** (ID `evt_m10_rybin_killed`, idempotente, persistido). O zumbido do eixo para. Gromov a 15 m: pode correr para lá (não há nada a fazer: a cena mostra-o claramente — Kondratyev segura-o: "Já não está."). · 7 a perda fixa canónica · 8 abriga-se (aviso); depois pode aproximar-se; não há interação de resgate · 9 — · 10 Kondratyev segura Gromov; Zhdan cobre a entrada · 11 infantaria alemã entra pelo acesso rompido · 12 telhado caído; a máquina coberta; poeira · 13 `dlg_m10_019–022` · 14 assobio → impacto → **silêncio: o eixo parou** → tiros · 15 beat: 2 s de silêncio; Kondratyev a segurar Gromov (2 s) · 16 regresso ao galpão 1 · 17 entrada alemã (`evt_m10_breach`) · 18 `cp_m10_b_entrada_ataque`; `m10.rybin_status = dead` · 19 [A] safeImpact (o jogador nunca morre pelo telhado: regra de M01) · 20 Rybin nunca mais na chamada.

### Cena 4 — "Entre máquinas" (jogável; `obj_m10_fight_shop2`)
2 09:40–11:30 · 3 galpão 1 → galpão 2 · 4 poeira que reduz visão sem cegar · 5 secção; grupo vizinho · 6 Combater entre máquinas, valas de serviço e pontos altos; armas não disparam através de chapas (obstrução real); o jogador distingue o que atravessa (vidro, madeira) do que exige contorno (chapa, bloco) · 7 §79 ponto 2 · 8 lances entre máquinas; sobe a uma passarela (ponto alto) ou usa a vala · 9 alto vs baixo · 10 Kondratyev; Zhdan; Lobov cobre · 11 infantaria; MG numa ponte rolante · 12 tornos como cobertura; óleo no chão · 13 `dlg_m10_023–026` · 14 metal; eco · 15 livre · 16 breach · 17 galpão 2 estabilizado · 18 `m10.workshops_lost = 1` (galpão 1) · 19 [A] obstrução por material | 20 —

### Cena 5 — "Transferência" (jogável; `obj_m10_transfer`)
2 11:30–13:00 · 3 galpão 2 (ameaçado) → galpão 3 (aberto ao pátio) · 4 luz do pátio · 5 secção; feridos; maqueiros · 6 Transferir munição e feridos da oficina ameaçada; **Zhdan sofre ferimento grave** (evento fixo: estilhaço no abdómen; sangue, atuação, ajuda; sem câmara lenta) num acesso alcançável; outra personagem ferida leve · 7 §79 ponto 3 · 8 carrega caixas e um ferido leve; estanca Zhdan com Kondratyev (interação abstrata 10 s) · 9 ordem das transferências · 10 Kondratyev; Lobov · 11 pressão crescente · 12 galpão 3 com vista para o pátio: trilhos, um trator inacabado, tanques ao longe · 13 `dlg_m10_027–031` · 14 — · 15 livre · 16 estabilizado · 17 feridos e munição no galpão 3 · 18 `cp_m10_c_transferencia`; `m10.zhdan_status = wounded_reachable` · 19 [A] carriedBy · 20 —

### Cena 6 — "O pátio foi rompido" (`cs_m10_order`, ≤ 25 s)
2 13:00–13:30 · 3 galpão 3 · 4 fumo · 5 secção; rádio · 6 Notícias de penetração noutros trechos (estádio perdido; tanques no recinto); rádio: "O pátio foi rompido. Retirem os feridos." (002). Ordem de recuar para a posição menor junto ao muro. Limpar um galpão não é vencer. · 7 §79 ponto 4 · 8 skip · 9 — · 10 — · 11 tanques visíveis no pátio (proxies) · 12 — · 13 `dlg_m10_002` (canónica), `032–033` · 14 rádio; tanques · 15 beat: tanques no pátio (3 s) · 16 transferência · 17 ordem · 18 `m10.workshops_lost = 2` · 19 — · 20 —

### Cena 7 — "Rota de reunião" (jogável; clímax; `obj_m10_withdraw`, `obj_m10_zhdan`)
2 13:30–16:30 · 3 galpão 3 → vala de serviço → muro → posição menor (200 m) · 4 fumo; sol filtrado · 5 secção; feridos; grupo vizinho · 6 Conservar a rota de reunião com cobertura alternada (o jogador segura um lado enquanto os outros passam: "Eu seguro este lado. Passe primeiro." — 003); ajudar Zhdan: a rota real existe se o jogador abrir o corredor da vala (suprimir a MG da ponte rolante) antes de a ordem final fechar (Kondratyev avisa 3 vezes); se não, Zhdan fica com os maqueiros do grupo vizinho (`not_reached`) — a cena diz-o, sem fingir resgate · 7 §79 ponto 5 · 8 cobertura alternada (rotação por salvas, mecânica de M01); carrega Zhdan (carriedBy, lento) ou cobre · 9 carregar vs cobrir · 10 Kondratyev; Lobov; grupo vizinho segura o flanco · 11 infantaria; tanque no pátio (só som/visão; não entra no galpão) · 12 muro com buraco; trilhos · 13 `dlg_m10_003` (canónica), `034–039` · 14 cobertura alternada; tanque · 15 livre · 16 ordem · 17 posição menor alcançada (`evt_m10_rally`) · 18 `cp_m10_d_retirada`; `m10.zhdan_status`, `m10.workshops_lost = 3` · 19 [A] · 20 —

### Cena 8 — "Chamada interrompida" (`cs_m10_outro`, ≤ 60 s) + debrief
2 16:30–17:30 · 3 posição menor junto ao muro; ao fundo, a área perdida com a máquina da abertura visível entre o telhado caído · 4 fumo; sol baixo · 5 Gromov, Kondratyev, Lobov, Zhdan (variante), sobreviventes · 6 Kondratyev faz a chamada; o fogo atrás dos galpões interrompe-a; Rybin não é chamado (Kondratyev salta o nome; Gromov percebe). Um sobrevivente tenta conter o tremor da mão. Gromov encontra a chave no bolso. · 7 consequência canónica · 8 skip · 9 — · 10 — · 11 — · 12 a máquina ao fundo, inalcançável; a chave · 13 `dlg_m10_040–043` · 14 chamada → fogo → silêncio · 15 beat: a máquina ao fundo (4 s); a chave (2 s) · 16 rally · 17 debrief · 18 `m10.completed` · 19 variantes por `zhdan_status` · 20 — (M11 é outra frente).

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m10_link` | Confira a ligação entre as oficinas | sim | intro | 2 postos | — | — | A |
| `obj_m10_escort_messenger` | Leve Lobov ao posto de coordenação | sim | A | Lobov no posto | Lobov ferido → continua a pé (nunca morre) | — | — |
| `obj_m10_return` | Volte ao galpão 1 | sim | posto | galpão 1 | — | `evt_m10_rybin_killed` | B |
| `obj_m10_fight_shop2` | Aguente o galpão 2 | sim | breach | estabilizado | — | `workshops_lost=1` | — |
| `obj_m10_transfer` | Transfira munição e feridos para o galpão 3 | sim | estabilizado | 2 caixas + 1 ferido leve + Zhdan estancado | — | `zhdan_status` | C |
| `obj_m10_withdraw` | Conserve a rota de reunião até à posição menor | sim | ordem | rally | — | — | D |
| `obj_m10_zhdan` | Abra a vala para Zhdan antes de a rota fechar | **opcional** | ordem | Zhdan na posição | 3 avisos → `not_reached` | `zhdan_status` | — |

### 3.2 Setores
`s1_shop1` → `s2_shop2` → `s3_shop3_yard` (perto, em sequência) · `s4_other_shops` (médio: oficinas/pátios vizinhos, blindados no perímetro, grupo vizinho) · `s5_complexes_sky` (longe: Barrikady, aviação, artilharia). Agendas: Stukas desde 08:00; rutura 09:30; estádio 11:15 (rádio); tanques no pátio 13:00 (antecipação das 16:30 históricas, assinalada como `COMPRESSED_FOR_GAMEPLAY`); ordem 13:30.

### 3.3 Checkpoints
A ligação · B entrada do ataque (Rybin morto; acesso rompido) · C transferência (galpão 3; Zhdan ferido) · D retirada (posição menor; `workshops_lost=3`).

### 3.4 Justiça
Telhado nunca mata o jogador (safeImpact + aviso triplo); poeira reduz visão simetricamente; chapas bloqueiam ambos os lados; Zhdan só por janela real anunciada.

---

## 4. Set pieces

### SP-10-1 "O eixo"
Contexto: galpão 1. Preparação: Rybin mostra a máquina; a chave. Experiência: abrir a caixa; ouvir o eixo. Companheiros: todos a reorganizar munição. Ambiente: pontes rolantes, trilhos. Evolução: o mensageiro parte. Clímax: nenhum (preparação). Consequências: `key_received`. Requisitos: [B] interação; [C] interiores. Integração: intro.

### SP-10-2 "O telhado"
Contexto: regresso ao galpão 1. Preparação: três avisos. Experiência: abrigar-se; o impacto; o eixo para; Rybin não está. Companheiros: Kondratyev segura Gromov. Ambiente: telhado caído sobre a máquina. Evolução: a entrada alemã. Clímax: o silêncio. Consequências: `rybin_status = dead`. Requisitos: [A] safeImpact; [A] evento idempotente persistido. Integração: `obj_m10_return`.

### SP-10-3 "Eu seguro este lado"
Contexto: rota de reunião. Preparação: Zhdan estancado no galpão 3. Experiência: cobertura alternada; abrir a vala; carregar Zhdan ou cobrir. Companheiros: grupo vizinho no flanco; Lobov. Ambiente: muro com buraco; tanque no pátio. Evolução: três avisos. Clímax: posição menor. Consequências: `zhdan_status`. Requisitos: [A] rotação por salvas; carriedBy. Integração: `obj_m10_withdraw/zhdan`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| galpão 1 07:20 | tornos, máquina com eixo, pontes rolantes, caixas, chave | reorganizar | aviões | — | Rybin | telhado caído |
| galpão 2 | telhado em farrapos, óleo, valas | postos | sondas | infantaria | Lobov | — |
| galpão 3 | aberto ao pátio, trator inacabado, trilhos | transferência | tanques ao longe | pressão | Zhdan | — |
| pátio | trilhos, tanques | — | — | — | — | rompido |
| vala/muro | buraco no muro | cobertura alternada | avisos | MG | grupo vizinho | — |
| posição menor | muro; a máquina ao fundo | chamada | fogo | — | a mão | a chave |

Objetos com origem: a chave (Rybin, "para abrir caixas de peças"), o trator inacabado (produção interrompida em setembro), o vestiário com roupa de trabalho (operários mobilizados), a braçadeira (milícia da fábrica — D geral), o telhado (Stukas de 09:30).

---

## 6. Diálogos (VO russo)

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Kondratyev | "Defendemos a passagem entre estes homens." (§79) | intro t 10 | 1 | — |
| 002 | Rádio | "O pátio foi rompido. Retirem os feridos." (§79) | cena 6 | 1 | — |
| 003 | Gromov | "Eu seguro este lado. Passe primeiro." (§79) | cobertura alternada (jogador segura) | 1 | — |
| 010 | Rybin | "Esta máquina para quando se cala o eixo." (PR #44) | intro t 16 | 2 | — |
| 011 | Rybin | "Chave. Para as caixas. Devolves-ma logo." (V1) | intro t 24 | 2 | — |
| 012 | Lobov | "Posto de coordenação é na cave?" (V1) | intro t 34 | 3 | — |
| 013 | Kondratyev | "Éramos paraquedistas. Hoje somos chaves e caixas." (V1) | intro t 40 | 3 | — |
| 014 | Kondratyev | "Passarela vê. Vala não vê e não é vista." (V1) | escolha | 2 | — |
| 015 | posto 2 | "Galpão dois na linha. Telhado já não temos." (V1) | ligação | 2 | — |
| 016 | Lobov | "Aviões!" (V1) | Stukas | 0 | 20 |
| 017 | Kondratyev | "Sondas no dois! Não deixem que vejam a vala!" (V1) | sondas | 0 | — |
| 018 | posto (cave) | "Mensageiro recebido. Voltem ao um." (V1) | entrega | 1 | — |
| 019 | Kondratyev | "Telhado! Sombra! Para baixo!" (V1; 3 avisos) | sirene/sombra/assobio | 0 | — |
| 020 | Kondratyev | "Gromov! Já não está. **Já não está.**" (V1) | Gromov a correr | 1 | — |
| 021 | Zhdan | "Entraram pelo acesso!" (V1) | breach | 0 | — |
| 022 | Lobov | "…o Vasili?" (V1) | 10 s depois | 3 | — |
| 023 | Kondratyev | "Chapa não atravessa. Vidro atravessa. Lembra-te." (V1) | galpão 2 | 2 | — |
| 024 | Zhdan | "MG na ponte rolante!" (V1) | MG | 0 | 20 |
| 025 | Kondratyev | "Ponto alto é teu ou é deles. Decide." (V1) | passarela | 2 | — |
| 026 | Kondratyev | "Dois aguenta. Por agora." (V1) | estabilizado | 1 | — |
| 027 | Kondratyev | "Caixas para o três. Feridos primeiro." (V1) | transferência | 1 | — |
| 028 | Zhdan | (atingido) "…Gromov." (V1) | `evt_m10_zhdan_hit` | 1 | — |
| 029 | Kondratyev | "Estanca. Dez segundos. Comigo." (V1) | 028 | 1 | — |
| 030 | Gromov | "Não volto por aquele galpão. Ele não sai de lá." (PR #44) | caixas no três | 2 | — |
| 031 | Lobov | "Tanques no pátio." (V1) | tanques | 1 | — |
| 032 | Kondratyev | "Ouviram. Posição menor, junto ao muro. Rota pela vala." (V1) | ordem | 1 | — |
| 033 | Kondratyev | "Limpar o galpão não era ganhar. Era tempo." (V1) | ordem + 4 s | 2 | — |
| 034 | Kondratyev | "Cobertura alternada. Um segura, os outros passam." (V1) | rota | 1 | — |
| 035 | Kondratyev | "Zhdan só passa se a vala estiver limpa. Primeiro aviso." (V1) | aviso 1 | 1 | — |
| 036 | Kondratyev | "Segundo aviso. A rota fecha." (V1) | aviso 2 | 1 | — |
| 037 | Kondratyev | "Último. Os maqueiros do vizinho ficam com ele. Não é abandono: é o que há." (V1) | aviso 3 (se não) | 1 | — |
| 038 | grupo vizinho | "Flanco é nosso até ao muro. Passem!" (V1) | flanco | 1 | — |
| 039 | Lobov | "Muro! Buraco à direita!" (V1) | muro | 1 | — |
| 040 | Kondratyev | "Chamada. Gromov. Lobov. Zhdan…" (variante) "…" (salta Rybin) (V1) | outro | 1 | — |
| 041 | Rádio/fogo | (interrompe) | outro t 10 | — | — |
| 042 | Lobov | (mão a tremer; sem fala) | — | — | — |
| 043 | Gromov | "A máquina ainda está lá. Ele não." (PR #44) | a chave | 2 | — |

Callouts: `co_m10_roof`, `co_m10_mg_crane`, `co_m10_tanks_yard`. Silêncios: o eixo que para (cena 3); a chamada interrompida.

---

## 7. Arte e atmosfera

**Paleta:** ferrugem, cinza de betão, preto de óleo, poeira branca, laranja de incêndio, verde-oliva. **Luz:** claraboias partidas (feixes), poeira volumétrica após impactos (densidade 0,3 por 60 s), pátio com sol filtrado por fumo, 16:30 sol baixo laranja. **Materiais:** chapa (opaca ao tiro), vidro, madeira, betão, óleo. **Silhuetas:** pontes rolantes, chaminés, o trator inacabado, tanques no pátio. **Destruição:** telhado do galpão 1 (persistente), galpão 2 em farrapos, muro com buraco. **Humanos:** gimnastyorka com óleo; Zhdan com ligadura abdominal; a mão. **Violência reduzida:** Zhdan sem sangue visível, com atuação; Rybin nunca visível sob o telhado (regra: sem corpo exposto).

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| galpão 1 | eixo (zumbido grave), metal, caixas | — | aviões | — |
| ligação | passarela (metal), vala (abafado), Stukas | sondas | — | — |
| rutura | assobio, impacto, telhado | infantaria | — | **obrigatório: o eixo parou** |
| galpão 2 | eco metálico, MG na ponte rolante | — | — | — |
| transferência | caixas, Zhdan | pressão | tanques | — |
| rota | cobertura alternada, muro | tanque no pátio | Barrikady | — |
| posição menor | chamada | fogo | — | interrupção |

Sons novos: interiores industriais (volumes grandes, metal), ponte rolante, tanque em pátio, zumbido de ouvido (configurável). VO russo.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| Ofensiva de 14/10 sobre a STZ; 109.º Reg. absorve; ~100 tanques no recinto 16:30; rutura noturna | D (resumo) | H10; S-C28 | leitura |
| 37.ª DG ex-aerotransportada | D | geral | — |
| Planta das oficinas; posição do 109.º | R/P | — | P-C10 |
| Tanques no pátio às 13:00 | `COMPRESSED_FOR_GAMEPLAY` | — | assinalado |
| Milícia da fábrica | D (geral) | — | — |
| Rybin, Zhdan, Kondratyev, Lobov | F | — | — |

**Proibições:** reconquista; corredor genérico; rendição encenada; Zholudev em cena. **Fora de cena:** Zholudev, Chuikov.

---

## 10. Handoff técnico

**Contrato:** `id m10_stz_factory`, `order 10`, relógio 07:20→17:30, grupos (`grp_section`, `grp_posts`, `grp_neighbor`, `grp_de_assault`, `grp_de_armor_yard`), setores, checkpoints A–D, cutscenes (intro, rybin, order, outro), falas, flags, debrief.

**Flags:** `m10.completed`, `m10.key_received`, `m10.rybin_status = dead` (fixo, escrito em `evt_m10_rybin_killed`), `m10.workshops_lost`, `m10.zhdan_status ∈ {evacuated, not_reached}`, `m10.lobov_status`, `m10.ammo_transferred`.

**Sistemas:** [A] simulação, safeImpact, fogo como dados, obstrução por material (existe em M01: paredes/terreno), carriedBy, rotação por salvas; [B] interações (chave, estancar); [C] interiores industriais com níveis (passarelas, valas), poeira volumétrica, tanques como proxies no pátio. [D] nenhum.

**Disciplinas:** Level: três galpões com lógica distinta + vala + muro; Combate/IA: infantaria entre máquinas; Arte: industrial; Personagens: soviéticos 1942 (5), alemães; Animação: estancar, carregar; Som: industrial; VO: russo; Historiador: P-C10; QA: `rybin_status` idempotente em restore/skip; Zhdan nas duas vias; telhado nunca mata.

**Testes:** `evt_m10_rybin_killed` consumido uma vez; chamada salta Rybin em todas as variantes; `workshops_lost` monotónico; avisos 3× antes de `not_reached`.

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| Rybin e o eixo | (intro) | abrir a caixa | Rybin empresta | — | start | `key_received` |
| Ligação; o mensageiro | `obj_m10_link/escort_messenger` | passarela/vala; proteger Lobov | postos; sondas | Stukas | A | — |
| O telhado | `obj_m10_return` | abrigar-se | Kondratyev segura | telhado caído; eixo pára | avisos | CP-B; Rybin morto |
| Entre máquinas | `obj_m10_fight_shop2` | alto/baixo; obstrução | MG na ponte rolante | — | breach | `workshops_lost=1` |
| Transferência; Zhdan | `obj_m10_transfer` | caixas; estancar | Kondratyev | galpão 3 | estabilizado | CP-C |
| O pátio rompido | (ordem) | — | rádio | tanques no pátio | 13:00 | `workshops_lost=2` |
| Eu seguro este lado | `obj_m10_withdraw/zhdan` | cobertura alternada; abrir a vala | grupo vizinho; avisos | muro | ordem | CP-D; `zhdan_status` |
| Chamada interrompida | debrief | — | Kondratyev salta o nome | a máquina ao fundo | rally | `m10.completed` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 9 | a chave, o eixo, "já não está": uma perda sem ornamento. |
| 2 | Autenticidade | 7 | ofensiva D em resumo; planta P-C10; tanques antecipados (assinalado). |
| 3 | Personagens | 8 | Rybin em 40 s de vida; Kondratyev. |
| 4 | Diálogos | 8 | "Limpar o galpão não era ganhar. Era tempo." |
| 5 | Originalidade | 8 | perder oficinas como contagem. |
| 6 | Variedade | 8 | ligação, escolta, combate vertical, transferência, cobertura alternada. |
| 7 | Set pieces | 8 | três. |
| 8 | Atmosfera | 8 | poeira e feixes. |
| 9 | Environmental storytelling | 8 | a máquina ao fundo. |
| 10 | Cinematográfica | 8 | 2 s de silêncio do eixo. |
| 11 | Sonora | 9 | o eixo que para. |
| 12 | Impacto emocional | 9 | — |
| 13 | Ritmo | 8 | 22–30 min. |
| 14 | Continuidade | 7 | isolada; a chave não transita. |
| 15 | Integração técnica | 6 | interiores industriais [C]. |

**Correções aplicadas:** (1) o resgate de Zhdan recebeu três avisos explícitos e uma saída honesta (`not_reached` = fica com maqueiros) em vez de "morre se falhares"; (2) Rybin nunca é visível sob o telhado (sem corpo exposto); (3) os tanques no pátio às 13:00 foram assinalados como compressão.
