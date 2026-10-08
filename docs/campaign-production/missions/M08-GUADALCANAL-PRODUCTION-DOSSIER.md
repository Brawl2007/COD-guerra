# M08 — WATCHTOWER · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** 7–8/8/1942, Guadalcanal; 5.º Marines, 1.ª Divisão; POV Samuel Brooks; fonte H09; 18–25 min; três falas; checkpoints "desembarque; reconhecimento; nova data; defesa inicial"; resistência inicial pequena; não copiar Omaha nem transferir Tulagi; nome do campo adequado ao momento (Henderson só depois); sem batalha noturna sem nova data. **Proposto:** 1.º Batalhão do 5.º Marines (RECONSTRUÇÃO, P-C08), relógio ancorado em H-hora 09:10 e tomada do campo a 8/8 ~16:00 (S-C26), elenco (§73 + propostas), o acampamento abandonado como set piece, flags.

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m08_guadalcanal` / 8 |
| Datas | 1942-08-07T09:05+11:00 → 1942-08-08T18:30+11:00 |
| Local | Red Beach (praia de desembarque a leste de Lunga Point) → coqueiral e capim kunai → acampamento japonês abandonado → acessos do aeródromo → o campo (`RECONSTRUCTED`; Lunga Point e o campo `EXACT` em silhueta) |
| Operação | Watchtower: H-hora 09:10, sem resistência na praia; guarnição japonesa (sobretudo trabalhadores) foge; campo tomado 8/8 ~16:00; ataques aéreos à frota 7 e 8/8; Savo 8/9; transportes partem 9/8 com suprimentos por descarregar (D, S-C26) |
| Unidade | 5.º Marines, 1.ª Div. (canónico) → 1.º Btl. (R) → esquadra ficcional |
| Elenco | Brooks (POV, private), sgt. Henry Cole, cpl. Elliot Marsh, Nelson Gray (pharmacist's mate) (§73); pvt. Danny Ruiz (recruta), pfc. Walt Jessup (BAR) (propostas) |
| Fora de cena | gen. Vandegrift, alm. Turner, alm. Fletcher, maj. Lofton Henderson (nome do campo, depois) |
| Intocável | datas, unidade, POV, falas `dlg_m08_001–003`, checkpoints, "pouca oposição", passagem explícita para 8/8, "ocupar terreno não garante abastecimento" |

---

## 1. Story Bible

**Logline.** A rampa desce e não acontece nada. Brooks, que esperava o primeiro tiro, passa dois dias a aprender que o silêncio de Guadalcanal é a ameaça: um acampamento com arroz ainda morno, um ruído na mata que quase custa um dos seus, um campo de aviação tomado quase sem disparar — e uma frota no horizonte que não garante comida.

**As oito respostas.**
1. **Situação central:** o silêncio da praia é a ameaça; não disparar contra sombras.
2. **Modo de contar:** caixas descarregadas (a contagem de suprimentos na praia; no fim, a certeza de que não chegam).
3. **Objeto:** a tigela de arroz ainda morna na mesa do acampamento abandonado.
4. **Silêncio:** a praia depois da rampa.
5. **Tarefa que não é matar:** organizar material; carregar suprimentos; reconhecer; transportar um homem incapacitado pelo calor.
6. **Custo humano:** ruído na mata (causa: medo acumulado desde a rampa) → Marsh quer disparar / Henry Cole manda identificar → são os seus a carregar equipamento; `m08.friendly_fire_avoided`; se o jogador disparar primeiro, um dos seus é ferido (tiro real) — consequência honesta, sem recompensa, flag `m08.friendly_fire`.
7. **Pessoas históricas:** fora de cena.
8. **Debrief:** regista o desembarque sem oposição, Tulagi como outra situação, o campo tomado a 8/8, os ataques aéreos à frota, Savo na noite de 8/9 e a partida dos transportes a 9/8 — "a vitória logística é instável".

**Três motivos.** (a) *O vazio* — tensão pesquisada, não falta de produção; (b) *o acampamento* — a vida interrompida de outros; (c) *a frota* — o horizonte naval que parte.

**Temas.** Medo sem alvo; disciplina de identificação; logística como sobrevivência; o inimigo ausente que é humano (refeições interrompidas).

**Estrutura (§54).** CONTEXTO → INTRO (embarcação; silêncio) → APROXIMAÇÃO (praia; material) → DIÁLOGO (Marsh e a comida) → PRIMEIRO CONTATO (um contacto pontual na mata, dramatização) → ESCALADA (acampamento; o ruído) → COMBATE PRINCIPAL (acessos do campo; observação; ataque aéreo à frota) → SET-PIECE (8/8: o campo) → PAUSA (noite, sem batalha) → CLÍMAX (transporte de suprimentos e de Ruiz) → CONSEQUÊNCIA (posições; horizonte naval) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Brooks | observador; olha para a frota; ajusta o cinto | Cole (ordens curtas), Marsh (comida), Gray | o ruído; Ruiz no calor | não dispara sobre sombras | posições; "quem traz comida?" |
| Henry Cole | metódico | esquadra | o ruído | — | vivo (canon) |
| Marsh | inquieto com comida; começa a carta (menção) | Brooks | quase dispara | — | vivo |
| Gray | foca cuidados | feridos/calor | — | — | vivo |
| Ruiz | recruta, 18 | Brooks | calor | — | `m08.ruiz_status` |
| Jessup | BAR, veterano de Pearl? (**não** — "veterano" de treino) | — | — | — | vivo |

**O que a missão recusa.** Praia de Omaha; bunkers a cada 20 m; batalha noturna; "Henderson Field" em 7/8; frota estática.

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "A rampa" (`cs_m08_intro`, ≤ 70 s)
2 09:05 · 3 embarcação (Higgins) a 300 m da Red Beach · 4 manhã tropical, sol alto, calor húmido · 5 esquadra; outras embarcações; a frota ao largo (transportes, cruzadores) · 6 Cartela: GUADALCANAL — 7 DE AGOSTO DE 1942 — 09:05 · 5.º MARINES · 1.ª DIVISÃO DE MARINES. Homens procuram o primeiro disparo; o bombardeamento naval cessa; a rampa desce: **nada**. Cole: "Espalhem-se. O silêncio não diz onde eles estão." (001). · 7 estabelecer o vazio · 8 olhar; sair pela rampa · 9 — · 10 esquadra espalha-se · 11 nenhum · 12 coqueiros, areia, caixas já na praia de ondas anteriores · 13 `dlg_m08_001`, `010–012` · 14 motor → rampa → **silêncio obrigatório** (insetos, mar) · 15 beat: 3 s sem ninguém falar na praia · 16 `missionStart` · 17 Cole: "Material." · 18 `cp_m08_a_desembarque` · 19 skip · 20 —

### Cena 2 — "Caixas" (jogável; `obj_m08_organize`)
2 09:15–10:15 · 3 praia; ponto de reunião no coqueiral · 4 sol · 5 esquadra; outras ondas e equipas de descarga (proxies) · 6 Desembarcar, organizar material (carregar 3 caixas da água para a pilha: contagem visível), alcançar reunião; outras ondas trazem homens e equipamento independentemente · 7 §79 ponto 1 · 8 carrega caixas (velocidade reduzida); chega à reunião · 9 — · 10 Marsh conta caixas e pergunta pela comida; Ruiz entusiasmado · 11 nenhum · 12 praia a encher-se de caixas; um jipe; macas vazias · 13 `dlg_m08_013–016` · 14 descarga; vozes; mar · 15 livre · 16 CP-A · 17 reunião · 18 `m08.crates_carried` · 19 [A]; [B] carregar caixa (padrão `sapper_crate`) · 20 —

### Cena 3 — "A mata" (jogável; `obj_m08_advance`)
2 10:15–12:00 · 3 coqueiral → capim kunai (2 m) → orla da mata · 4 calor; luz em feixes · 5 esquadra; companhias vizinhas (proxies) · 6 Avançar por vegetação pesquisada com visão limitada; sinais de retirada (equipamento largado, pegadas para oeste); **um** contacto pontual (dramatização a verificar por setor: dois soldados japoneses de uma unidade de construção que disparam e fogem) · 7 §79 ponto 2 · 8 navega; observa sinais; reage ao contacto (ou não dispara) · 9 trilho (rápido, canalizado) vs kunai (lento, cobertura) · 10 Cole manda identificar antes de disparar; Jessup cobre · 11 2 atiradores (dados) que recuam · 12 ferramentas, um capacete japonês, pegadas · 13 `dlg_m08_017–020` · 14 insetos; capim · 15 livre · 16 reunião · 17 orla da mata · 18 — · 19 [A]; [B] vegetação alta (família nova) · 20 —

### Cena 4 — "O acampamento" (`cs_m08_camp`, ≤ 35 s; jogável depois) — **set piece + momento de custo humano**
2 12:00–12:40 · 3 acampamento japonês abandonado (tendas, cozinha, mesa de campanha, uma porta encostada num barracão) · 4 sombra · 5 esquadra; Gray · 6 Refeições interrompidas: tigelas de arroz ainda mornas, chá, ferramentas, uma porta encostada. Conferir a posição; apoiar reconhecimento (Cole manda Brooks e Ruiz ver o barracão). Ruído na mata: Marsh ergue a arma; Cole: identificar primeiro. É o grupo de Jessup a carregar equipamento. · 7 §79 ponto 3 + momento · 8 inspeciona (interação: tigela, porta); no ruído, pode disparar (fere um dos seus: tiro real; `m08.friendly_fire`) ou esperar · 9 disparar vs esperar · 10 Marsh baixa a arma à ordem; Jessup sai da mata · 11 nenhum · 12 a tigela morna; a porta range · 13 `dlg_m08_021–026` · 14 **silêncio** → ruído na mata → vozes · 15 beat: a tigela (2 s); o ruído (target nulo 2 s) · 16 orla · 17 identificação · 18 `cp_m08_b_reconhecimento`; `m08.friendly_fire_avoided` / `m08.friendly_fire` · 19 [A] cena; [B] interações · 20 M26/M29 lembram "a tigela" (Marsh) se `friendly_fire_avoided`.

### Cena 5 — "Acessos do campo; a frota sob ataque" (jogável; `obj_m08_observe_airfield`)
2 13:00–15:30 · 3 orla sul do coqueiral com vista para o campo (pista de terra, rolo compressor, hangares de palha) e para o mar · 4 sol a oeste · 5 esquadra; outras companhias · 6 Observar os acessos do campo (binóculos, sem HUD); às 13:20 ataque aéreo à frota (bombardeiros japoneses a média altitude; flak; um navio atingido ao longe — sem nome); a esquadra não intervém; Marsh conta caixas que não chegaram · 7 "batalha ao redor" naval; a incerteza · 8 observa; escolhe posição de observação; relata a Cole (interação) · 9 — · 10 Cole regista; Ruiz pergunta se "é connosco" · 11 aviões (proxies), flak · 12 fumo no mar · 13 `dlg_m08_027–030` · 14 motores altos; flak; nada perto · 15 livre; beat: o navio a fumegar (3 s) · 16 CP-B · 17 ordem de parar para a noite (`evt_m08_night`) · 18 — · 19 [A] setores; [C] frota/aviões como proxies · 20 —

### Cena 6 — "8 de agosto" (`cs_m08_date`, ≤ 30 s)
2 noite → 8/8 13:30 · 3 posição no coqueiral → aproximação ao campo · 4 noite de insetos; manhã · 5 esquadra · 6 Cartela: 8 DE AGOSTO — 13:30. Sem batalha noturna (regra); de manhã, ordem de ocupar o campo. · 7 §79 ponto 4 · 8 skip · 9 — · 10 — · 11 — · 12 posições com buracos cavados; caixas abertas · 13 `dlg_m08_031` · 14 insetos; mar · 15 fade · 16 night · 17 cartela · 18 `cp_m08_c_nova_data` · 19 [B] data · 20 —

### Cena 7 — "O campo" (jogável; `obj_m08_occupy_airfield`)
2 13:30–16:00 · 3 o campo: pista, rolo compressor, oficinas, torre de água, um avião japonês destruído · 4 sol · 5 esquadra; companhias · 6 Ocupar o campo e estabelecer defesa: resistência esporádica (3–4 atiradores que recuam; dados), limpar oficinas (interiores simples), posicionar a BAR, cavar; o nome: "o campo" (Cole corrige Ruiz: "Ainda não tem nome nosso.") · 7 §79 ponto 4 · 8 avança por lances; limpa uma oficina; escolhe posição · 9 — · 10 companhias ocupam por si; Jessup posiciona a BAR · 11 atiradores esporádicos · 12 rolo compressor, bidões, sacos de arroz · 13 `dlg_m08_002` (Marsh, canónica: "O campo é nosso. E a comida?"), `032–035` · 14 tiros esporádicos; pás · 15 livre · 16 cartela · 17 defesa estabelecida (`evt_m08_defense_set`) · 18 `cp_m08_d_defesa_inicial` · 19 [A] · 20 —

### Cena 8 — "Transporte" (jogável; clímax de tensão; `obj_m08_carry`)
2 16:00–18:00 · 3 do campo à praia (1,2 km) e de volta; ponto de socorro de Gray · 4 calor; sol baixo · 5 esquadra; Gray; equipas de descarga · 6 Transportar suprimentos (caixas de arroz capturado e munição) do campo ao posto; Ruiz colapsa pelo calor (evento fixo `evt_m08_ruiz_heat`): transportá-lo (carriedBy) ou apoiá-lo até Gray: "Sente-o aqui. Depois encontre água." (003). Incerteza naval: os transportes ao largo preparam-se para partir (visível: fumo, movimento). · 7 §79 ponto 5 · 8 carrega; decide ordem (Ruiz primeiro ou caixas); encontra água (interação no poço do acampamento) · 9 ordem das tarefas · 10 Gray recebe homens de vários setores; Marsh pergunta pela comida · 11 nenhum ativo; aviões ao longe · 12 praia com caixas por abrir; a frota a mover-se · 13 `dlg_m08_003` (canónica), `036–040` · 14 passos; respiração; mar · 15 livre · 16 defense_set · 17 Ruiz com Gray + água · 18 `m08.ruiz_status = heat_recovered`; `m08.supplies_carried` · 19 [A] carriedBy; [B] água (interação) · 20 —

### Cena 9 — "Horizonte" (`cs_m08_outro`, ≤ 50 s) + debrief
2 18:00–18:30 · 3 posições no campo; vista para o mar · 4 pôr do sol · 5 esquadra · 6 O grupo monta posições; ocupar terreno não garante abastecimento; Gray recebe homens; Brooks olha os navios afastados; Marsh pergunta pela comida; Cole dá ordem curta. Cartela: Savo na noite de 8/9; transportes partem a 9/8; duas refeições por dia desde 12/8. · 7 consequência · 8 skip · 9 — · 10 — · 11 — · 12 horizonte naval · 13 `dlg_m08_041–043` · 14 mar; insetos; nenhuma música · 15 beat: a frota (4 s) · 16 Ruiz com Gray · 17 debrief · 18 `m08.completed` · 19 — · 20 M26/M29.

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m08_organize` | Organize o material e chegue à reunião | sim | intro | 3 caixas + zona | — | `crates_carried` | A |
| `obj_m08_advance` | Avance pela mata até à orla | sim | A | orla | — | — | — |
| `obj_m08_camp` | Confira o acampamento; apoie o reconhecimento | sim | orla | identificação | — | `friendly_fire_avoided` | B |
| `obj_m08_observe_airfield` | Observe os acessos do campo | sim | B | 2 relatos a Cole | — | — | — |
| `obj_m08_date` | (cartela 8/8) | sim | night | cartela | — | — | C |
| `obj_m08_occupy_airfield` | Ocupe o campo e estabeleça defesa | sim | C | defense_set | — | — | D |
| `obj_m08_carry` | Leve suprimentos e Ruiz ao posto de Gray | sim | D | Ruiz + 2 caixas | — | `ruiz_status`, `supplies_carried` | — |
| `obj_m08_water` | Encontre água para Ruiz | sim | Ruiz com Gray | poço | — | — | — |

### 3.2 Setores
`s1_beach` (perto, 7/8) · `s2_jungle_camp` (perto) · `s3_airfield` (perto, 8/8) · `s4_companies` (médio: companhias e trabalho no campo; descarga) · `s5_fleet_sky` (longe: frota, ataques aéreos 13:20 de 7/8 e 12:00 de 8/8, fumo; movimento dos transportes ao fim de 8/8). Tulagi: só som muito distante e menção (facto diferente).

### 3.3 Checkpoints
A desembarque · B reconhecimento (acampamento; `friendly_fire_*`) · C nova data (snapshot 8/8) · D defesa inicial (campo; posições).

### 3.4 Justiça
Contactos pontuais sempre com recuo (nunca "spawn"); o ruído na mata identifica-se em 4 s; calor como evento fixo de Ruiz, sem medidor.

---

## 4. Set pieces

### SP-08-1 "Nada"
Contexto: rampa. Preparação: todos à espera do primeiro tiro. Experiência: silêncio de 3 s; depois caixas. Companheiros: Cole espalha; Marsh conta. Ambiente: praia a encher-se. Evolução: ondas chegam sem o jogador. Clímax: nenhum — é o ponto. Consequências: CP-A. Requisitos: [A]; [C] descarga como proxies. Integração: `obj_m08_organize`.

### SP-08-2 "Arroz morno"
Contexto: acampamento. Preparação: sinais de retirada na mata. Experiência: tigelas, porta, ruído; a arma de Marsh. Companheiros: Cole; Jessup sai da mata. Ambiente: cozinha. Evolução: disparar/esperar. Clímax: identificação. Consequências: flag. Requisitos: [A]. Integração: `obj_m08_camp`.

### SP-08-3 "O campo e a frota"
Contexto: 8/8 tarde. Preparação: observação de 7/8; ataque aéreo visto. Experiência: ocupar quase sem disparar; carregar; Ruiz. Companheiros: Gray; Marsh. Ambiente: rolo compressor, sacos de arroz, a frota a mover-se. Evolução: a vitória logística instável. Clímax: horizonte. Consequências: `ruiz_status`. Requisitos: [A] carriedBy; [C] frota. Integração: `obj_m08_occupy_airfield/carry`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| praia | coqueiros, caixas, jipe, macas vazias | descarga | silêncio | — | Marsh conta | caixas por abrir |
| mata | ferramentas, capacete japonês, pegadas para oeste | — | contacto pontual | 2 atiradores | — | — |
| acampamento | tigelas mornas, chá, porta encostada, cozinha | — | ruído | — | Jessup | — |
| orla/campo (7/8) | pista de terra, rolo compressor, hangares de palha | ataque aéreo à frota | — | — | — | fumo no mar |
| campo (8/8) | bidões, sacos de arroz, avião destruído, torre de água | ocupação | atiradores | esporádico | Jessup com BAR | buracos |
| praia (8/8) | caixas por abrir; frota a mover-se | — | — | — | Gray | horizonte |

Objetos com origem: a tigela (refeição das 08:30 interrompida pelo bombardeamento naval), o rolo compressor (construção do campo pelos trabalhadores), os sacos de arroz (a dieta das semanas seguintes), as caixas por abrir (partem a 9/8 com os transportes).

---

## 6. Diálogos (VO inglês americano)

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Henry Cole | "Espalhem-se. O silêncio não diz onde eles estão." (§79) | rampa + 3 s | 1 | — |
| 002 | Marsh | "O campo é nosso. E a comida?" (§79) | defense_set | 2 | — |
| 003 | Gray | "Sente-o aqui. Depois encontre água." (§79) | Ruiz entregue | 1 | — |
| 010 | Marsh | "Estavam todos à espera de disparos." (PR #44) | praia | 3 | — |
| 011 | Ruiz | "É isto? Já está?" (V1) | praia | 3 | — |
| 012 | Jessup | "Ainda não começou. Começa quando quiserem." (V1) | 011 | 2 | — |
| 013 | Cole | "Material. Três caixas cada um. Depois reunião no coqueiral." (V1) | A | 1 | — |
| 014 | Marsh | "Vinte caixas. Nenhuma diz 'comida'." (V1) | caixas | 3 | 60 |
| 015 | Gray | "Água. Bebam agora, não quando tiverem sede." (V1) | reunião | 2 | — |
| 016 | Cole | "Mata. Identificar antes de disparar." (V1) | reunião | 1 | — |
| 017 | Jessup | "Pegadas para oeste. Fugiram." (V1) | pegadas | 2 | — |
| 018 | Cole | "Dois! Recuam! Não persigam." (V1) | contacto | 0 | — |
| 019 | Ruiz | "Eram soldados?" (V1) | após contacto | 3 | — |
| 020 | Cole | "Eram pessoas com uma espingarda. Hoje, sim." (V1) | 019 | 2 | — |
| 021 | Marsh | "Arroz. Ainda morno." (V1) | tigela | 2 | — |
| 022 | Cole | "Brooks, Ruiz: o barracão. Devagar." (V1) | acampamento | 1 | — |
| 023 | Marsh | "Ali! Na mata!" (V1) | ruído | 0 | — |
| 024 | Cole | "Ouvir não é ver. Confirma antes de disparar." (PR #44) | 023 + 1 s | 0 | — |
| 025 | Jessup | "Somos nós! Caixas!" (V1) | 4 s | 1 | — |
| 026 | Cole | (se o jogador disparou) "Guarda isso. Hoje foi um de nós." (V1) | friendly_fire | 1 | — |
| 027 | Cole | "Binóculos. Os acessos. Diz-me o que vês, não o que achas." (V1) | observação | 1 | — |
| 028 | Ruiz | "Aviões! É connosco?" (V1) | ataque aéreo | 2 | — |
| 029 | Cole | "É com a frota. Nós observamos." (V1) | 028 | 1 | — |
| 030 | Marsh | "Se afundam um daqueles, afundam as nossas caixas." (V1) | navio a fumegar | 2 | — |
| 031 | Cole | "Noite aqui. Ninguém dispara ao escuro sem ver." (V1) | night | 1 | — |
| 032 | Cole | "O campo. Por lances. Oficinas primeiro." (V1) | cartela | 1 | — |
| 033 | Ruiz | "Henderson—" Cole: "Ainda não tem nome nosso." (V1) | campo | 2 | — |
| 034 | Jessup | "BAR na torre de água. Vê tudo." (V1) | posição | 2 | — |
| 035 | Cole | "Cavar. Hoje dorme-se em buracos." (V1) | defense_set | 1 | — |
| 036 | Cole | "Caixas para o posto do Gray. Arroz deles, munição nossa." (V1) | carry | 1 | — |
| 037 | Ruiz | (colapsa) "…só um minuto." (V1) | `evt_m08_ruiz_heat` | 1 | — |
| 038 | Gray | "Calor. Não é ferida. Água e sombra." (V1) | Ruiz | 1 | — |
| 039 | Marsh | "Os transportes estão a mexer-se." (V1) | frota | 2 | — |
| 040 | Cole | "Mexem-se. Nós não." (V1) | 039 | 2 | — |
| 041 | Brooks | "Agora temos o campo. Quem traz comida?" (PR #44) | outro | 2 | — |
| 042 | Gray | "Sentem-nos à sombra. Um de cada vez." (V1) | outro | 2 | — |
| 043 | Cole | "Posições. Amanhã vê-se." (V1) | outro | 1 | — |

Callouts: `co_m08_movement_jungle` ("Movimento!"), `co_m08_identify` ("Identifica!"), `co_m08_aircraft_fleet`. Silêncios: a praia (cena 1) e o acampamento antes do ruído.

---

## 7. Arte e atmosfera

**Paleta:** verde-escuro de selva, verde-amarelo de kunai, areia pálida, azul-cinza de mar com fumo, HBT verde-sálvia. **Luz:** 09:05 Sol alto (el 50°), luz dura; 12:00 sombra do coqueiral em feixes; 16:00 sol a oeste; 18:00 pôr do sol laranja sobre a frota. **Materiais:** coqueiro, kunai, lona japonesa, terra da pista, bidões. **Silhuetas:** Lunga Point, a linha de coqueiros, a torre de água do campo, a frota. **Destruição:** mínima (o ponto): um avião japonês destruído, fumo no mar. **Humanos:** P41 HBT, M1, Springfield, suor, sal; Ruiz pálido. **Violência reduzida:** nada a reduzir, por desenho.

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| rampa | motor, rampa | outras embarcações | bombardeamento naval cessa | **obrigatório** (3 s) |
| praia | caixas, vozes, jipe | descarga | frota | — |
| mata | insetos, capim, pegadas | — | — | — |
| acampamento | tigela, porta a ranger, ruído | — | — | **obrigatório** (antes do ruído) |
| frota | — | — | motores altos, flak, impacto no mar | — |
| campo | pás, tiros esporádicos, BAR | companhias | aviões | — |
| transporte | respiração, caixas | — | transportes a mover-se | — |

Sons novos: selva tropical, Higgins boat, descarga, flak naval ao longe, Springfield/BAR. VO inglês americano.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| H-hora 09:10 na Red Beach; sem resistência | D | H09; S-C26 | — |
| Guarnição (trabalhadores) foge; acampamentos com arroz | D | S-C26 | local P-C08 |
| Campo tomado 8/8 ~16:00 (fontes divergem 7/8) | D maioritário | S-C26 | — |
| Ataques aéreos à frota 7 e 8/8 | D (geral) | H09 | horas |
| Savo 8/9; transportes partem 9/8; duas refeições desde 12/8 | D | S-C26 | — |
| Calor incapacitante a 7/8 | D (geral) | — | — |
| 1/5 e trajeto | R | — | P-C08 |
| Nome "Henderson" só a 12/8 | D | — | — |
| Equipamento 1942 (Springfield, BAR, P41) | D | — | auditoria |

**Proibições:** Omaha; Tulagi aqui; batalha noturna; bunkers em série; M1 carbine. **Fora de cena:** Vandegrift, Turner, Fletcher, Henderson.

---

## 10. Handoff técnico

**Contrato:** `id m08_guadalcanal`, `order 8`, relógio 09:05→18:30 (noite em snap), grupos (`grp_squad`, `grp_companies`, `grp_unloading`, `grp_jp_stragglers`, `grp_fleet`, `grp_jp_aircraft`), setores, checkpoints A–D, cutscenes (intro, camp, date, outro), falas, flags, debrief.

**Flags:** `m08.completed`, `m08.crates_carried`, `m08.friendly_fire_avoided`, `m08.friendly_fire`, `m08.ruiz_status`, `m08.supplies_carried`, `m08.jessup_status`.

**Sistemas:** [A] simulação, fogo como dados (poucos), carriedBy, interações; [B] vegetação alta (kunai), data; [C] frota e aviões como proxies com eventos (navio atingido), descarga como proxies. [D] nenhum. Missão de **baixo risco técnico** apesar de nova frente: candidata a primeira missão do Pacífico.

**Disciplinas:** Level: praia 400 m, coqueiral/kunai 800 m, acampamento, campo (pista 1 km em silhueta); Combate/IA: 2+4 atiradores que recuam; Arte: selva e campo; Personagens: Marines 1942 (6), japoneses (trabalhadores/soldados, 4); Animação: carregar caixa, apoiar homem com calor; Som: selva; VO: inglês; Historiador: P-C08; QA: `friendly_fire` nas duas vias; data; Ruiz.

**Testes:** dados; cronologia 7→8/8; o ruído identifica-se sempre em 4 s; tiro do jogador fere um aliado (tiro real) e não dá recompensa; Ruiz nunca "morre" de calor.

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| A rampa e o nada | (intro) | sair | Cole espalha | — | start | CP-A |
| Caixas | `obj_m08_organize` | carregar 3 | Marsh conta | praia cheia | A | `crates_carried` |
| A mata e os dois que fogem | `obj_m08_advance` | identificar; (não) disparar | Cole proíbe perseguir | — | contacto | — |
| Arroz morno; o ruído | `obj_m08_camp` | inspecionar; esperar/disparar | Marsh ergue; Cole; Jessup | — | ruído | CP-B; flag |
| A frota atacada | `obj_m08_observe_airfield` | observar; relatar | Cole regista | fumo no mar | 13:20 | — |
| 8 de agosto | `obj_m08_date` | — | — | buracos | night | CP-C |
| O campo | `obj_m08_occupy_airfield` | lances; oficina; posição | companhias ocupam | — | cartela | CP-D |
| Ruiz e as caixas | `obj_m08_carry/water` | carregar; água | Gray | — | D | `ruiz_status` |
| Horizonte | debrief | — | Marsh; Cole | frota parte | Ruiz | `m08.completed` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 8 | O vazio como ameaça e a logística como desfecho. |
| 2 | Autenticidade | 8 | praia, campo, arroz, frota: D; batalhão R. |
| 3 | Personagens | 8 | os quatro de §73 estabelecidos para 1945; Ruiz. |
| 4 | Diálogos | 8 | "Ouvir não é ver." |
| 5 | Originalidade | 9 | uma missão de desembarque quase sem tiros. |
| 6 | Variedade | 7 | observar, carregar, reconhecer; combate mínimo por facto. |
| 7 | Set pieces | 7 | "Nada" e "arroz morno" são de tensão; risco de parecer vazio sem direção de som. |
| 8 | Atmosfera | 8 | selva e frota. |
| 9 | Environmental storytelling | 9 | tigela, rolo compressor, caixas por abrir. |
| 10 | Cinematográfica | 7 | — |
| 11 | Sonora | 9 | o silêncio da rampa; insetos. |
| 12 | Impacto emocional | 7 | sem perda; a inquietação é o impacto. |
| 13 | Ritmo | 7 | risco de monotonia entre cenas 3 e 5; o ataque aéreo resolve. |
| 14 | Continuidade | 9 | Ruiz, a tigela, a carta de Marsh (menção) → M26/M29. |
| 15 | Integração técnica | 8 | quase tudo [A]/[B]; frota [C] visual. |

**Correções aplicadas:** (1) o disparo do jogador no ruído passou a ter consequência honesta (fere um aliado por tiro real) em vez de "nada acontece"; (2) o calor de Ruiz é evento fixo sem medidor; (3) "Henderson" só em debrief.
