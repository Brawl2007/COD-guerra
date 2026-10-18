# M06 — PERÍMETRO · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** 14/4/1941, Tobruk; 9.ª Divisão Australiana; POV Daniel Hargreaves; fonte H07; 20–26 min; três falas; checkpoints "postos; primeiro ataque; ligação retomada; defesa final"; "Tobruk não é um deserto plano uniforme"; apoio antitanque historicamente adequado com operadores próprios; final: Ellis atende inimigo ferido supervisionado; Daniel procura sombra; o cerco continua. **Proposto:** "Batalha da Páscoa" na noite de 13/14 e amanhecer de 14/4 (S-C03), 2/17.º Batalhão (20.ª Brigada) como RECONSTRUÇÃO (P-C06), postos "R32/R33" como rótulos, elenco (§73 + propostas), relógio, flags.

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m06_tobruk` / 6 |
| Datas | 1941-04-14T03:10+02:00 → 1941-04-14T08:40+02:00 (fuso P-C06) |
| Local | perímetro sul de Tobruk, setor da estrada de El Adem: postos de betão da linha italiana (R-série), arame, fosso antitanque, wadis pedregosos — `RECONSTRUCTED`; o porto ao longe `EXACT` em silhueta |
| Operação | assalto do Afrika Korps (5.ª Div. Ligeira): infiltração do 8.º Btl. de Metralhadoras na noite 13/14; ~38 panzers pela brecha ao amanhecer, rechaçados pela artilharia e antitanque; infantaria alemã encurralada, muitos capturados (D, S-C03) |
| Unidade | 9.ª Div. Australiana (canónico) → 2/17.º Btl., 20.ª Bde (R) → secção ficcional no posto "R32" |
| Elenco | Daniel (POV), sgt. Colin Fraser, pte. Jack Morrow (atirador Bren), pte. Peter Ellis (socorrista) (§73); l-cpl. Ray "Bluey" Dunstan, cpl. Arthur Keane e pte. Len Sobey (guarnição da Vickers), um alemão ferido desarmado (propostas) |
| Fora de cena | gen. Morshead; cabo John Edmondson VC (2/17.º, 13/14 de abril) — **nunca** dramatizado |
| Intocável | data, unidade, POV, falas `dlg_m06_001–003`, checkpoints, resultado (ataque rechaçado; cerco continua), Morrow = atirador, Ellis = socorrista, o inimigo ferido tratado no fim |

---

## 1. Story Bible

**Logline.** Três horas antes do amanhecer, o sargento Fraser percorre os postos do perímetro e manda que respondam com a lâmpada. Quando o posto da esquerda deixa de responder, alguém tem de ir lá. Ao nascer do sol passam tanques pela brecha, e Daniel aprende que um perímetro é uma linha de homens que se veem — e que, quando a luta acaba, a sombra se partilha com quem já não dispara.

**As oito respostas.**
1. **Situação central:** um perímetro é uma linha de homens que se veem; quando um posto cala, alguém vai lá.
2. **Modo de contar:** postos que respondem (lâmpada de sinais e telefone: R31, R32, R33…).
3. **Objeto:** o cantil de Daniel (sacode a areia; dá sombra; em M11 dá o último gole).
4. **Silêncio:** o posto que não responde.
5. **Tarefa que não é matar:** restabelecer a ligação (telefone de campanha); levar munição e água à Vickers; sombra para os feridos; triagem.
6. **Custo humano:** um alemão ferido desarmado é trazido para a área médica (causa: a infantaria encurralada pela brecha fechada) → Morrow protesta porque Dunstan também espera / Ellis organiza a mesma proteção para ambos → `m06.pow_treated`; Morrow reconhece sem virar santo; Fraser mantém o setor. Sem minijogo de karma.
7. **Pessoas históricas:** fora de cena.
8. **Debrief:** regista a Batalha da Páscoa (ataque rechaçado, tanques perdidos pelos alemães, prisioneiros), o cerco que continua até dezembro e a saída do batalhão por mar em outubro.

**Três motivos.** (a) *A linha que se vê* — a defesa é visual: lâmpadas, silhuetas, poeira; (b) *o posto que cala* — perder comunicação é um evento visível (um foguete, uma lâmpada que não acende); (c) *a sombra* — o deserto decide com o Sol, não só com balas.

**Temas.** Disciplina (Fraser); medo mascarado por rotina (Morrow limpa areia); compaixão com regras (Ellis); escassez (água, sombra); o inimigo como pessoa quando já não dispara.

**Estrutura (§54).** CONTEXTO → INTRO (postos; Fraser; Ellis; Morrow) → APROXIMAÇÃO (ronda dos postos; lâmpadas) → DIÁLOGO (Morrow e a areia) → PRIMEIRO CONTATO (infantaria na brecha, 04:30) → ESCALADA (R33 cala) → COMBATE PRINCIPAL (o corredor até R33; sobreviventes; ligação) → SET-PIECE (tanques ao amanhecer; o 2-pdr) → PAUSA (o Sol a subir; água) → CLÍMAX (consolidar; evacuar feridos) → CONSEQUÊNCIA (Ellis e o alemão; sombra) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Daniel | conta carregadores e distâncias; sacode o cantil | Fraser (ronda), Dunstan | R33; os tanques; o alemão | chama os homens pelo nome; partilha a sombra | vivo; posição mantida |
| Fraser | ronda com lâmpada | todos | R33 | ordens mais curtas | `m06.fraser_status` |
| Morrow | limpa areia | Bren | o alemão na área médica | reconhece a obrigação | `m06.morrow_status` |
| Ellis | prepara macas | feridos | triagem com o alemão | — | `m06.ellis_status` |
| Dunstan | veterano | Daniel | ferido na brecha (evento) | — | `m06.dunstan_status` |
| Keane/Sobey | Vickers | — | munição | — | vivos |

**O que a missão recusa.** Deserto plano amarelo; arma do futuro; Daniel vence sozinho; execução de rendidos; o caso Edmondson dramatizado; repetir esta defesa em M11.

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "Lâmpadas" (`cs_m06_intro`, ≤ 75 s)
2 03:10 · 3 posto R32 (betão italiano, seteiras, trincheira de ligação) · 4 noite sem lua? (**P-C06**; assumir lua em quarto, estrelas) · 5 Daniel, Fraser, Morrow, Ellis, Dunstan; Keane/Sobey na Vickers · 6 Cartela: TOBRUK — 14 DE ABRIL DE 1941 — 03:10 · 2/17.º BATALHÃO · 9.ª DIVISÃO AUSTRALIANA. Fraser visita postos: lâmpada de sinais para R31 (responde) e R33 (responde). Ellis prepara socorro; Morrow limpa poeira da Bren. Rádio/telefone: outro trecho do perímetro anuncia contacto (infiltração a oeste). · 7 estabelecer a linha que se vê · 8 olhar; sacudir o cantil (gesto) · 9 — · 10 — · 11 — · 12 betão frio, arame, fosso · 13 `dlg_m06_001` (Fraser, canónica), `010–012` · 14 vento seco; telefone; artilharia ao longe · 15 beat: a lâmpada de R33 a responder (2 s) · 16 `missionStart` · 17 Fraser: "Postos." · 18 `cp_m06_a_postos` · 19 skip · 20 —

### Cena 2 — "Ronda" (jogável; `obj_m06_check_posts`)
2 03:15–04:20 · 3 trincheira de ligação R32 → observação → depósito de munição → Vickers · 4 noite · 5 Fraser; guarnição · 6 Conferir observação (binóculos: sem HUD; aprender a distinguir ruído de veículo aliado de movimento inimigo), munição (levar uma caixa à Vickers) e ligação (telefone a R33) · 7 reconhecimento funcional (PR #44) · 8 observa; leva caixa; telefona · 9 — · 10 Keane/Sobey abastecem; Dunstan conta · 11 nenhum ativo; infiltração a oeste (som) · 12 — · 13 `dlg_m06_013–016` · 14 — · 15 livre · 16 CP-A · 17 04:20 contacto (`evt_m06_contact_1`) · 18 `m06.ammo_delivered` · 19 [A]; [B] telefone/lâmpada · 20 —

### Cena 3 — "Primeiro ataque" (jogável; `obj_m06_repel_infantry`)
2 04:20–05:00 · 3 R32 e o arame · 4 noite; clarões · 5 secção; Vickers · 6 Repelir infantaria alemã que tenta alargar a brecha pelo arame; a Vickers sustenta; quando falta munição, a supressão do acesso cai (efeito visível); operador e assistente mudam postura e reagem à supressão · 7 §79 ponto 2 · 8 dispara (150–300 m, clarões); abastece a Vickers; Morrow com a Bren · 9 posição · 10 Vickers com guarnição própria · 11 infantaria (dados), morteiros · 12 arame cortado; foguetes · 13 `dlg_m06_017–020` · 14 Vickers; Bren; morteiros · 15 livre · 16 contacto · 17 ataque repelido · 18 `cp_m06_b_primeiro_ataque` · 19 [A] · 20 —

### Cena 4 — "R33 não responde" (`cs_m06_silence`, ≤ 25 s; jogável depois; `obj_m06_reconnect`)
2 05:00–05:50 · 3 corredor protegido (trincheira + wadi) até R33 · 4 madrugada azul · 5 Daniel, Dunstan, Ellis; sobreviventes de R33 (3) · 6 Morrow: "O posto da esquerda não responde." (002). **Silêncio obrigatório**: a lâmpada não acende. Fraser manda Daniel com Dunstan e Ellis pelo corredor; localizar sobreviventes; recompor contacto (telefone/lâmpada); observar blindados a atravessar outro setor ao longe · 7 §79 ponto 3 · 8 atravessa por lances; encontra 3 sobreviventes e 2 feridos; liga o telefone; sinaliza com a lâmpada · 9 corredor curto (exposto) vs wadi (longo) · 10 Dunstan ferido no corredor (evento fixo `evt_m06_dunstan_hit`); Ellis trata; sobreviventes respondem · 11 atiradores na brecha; MG · 12 R33 com a porta rebentada; equipamento; dois mortos cobertos · 13 `dlg_m06_002` (canónica), `021–026` · 14 silêncio → tiros → telefone · 15 beat: a lâmpada acende (R33 responde) 2 s · 16 05:00 · 17 ligação (`evt_m06_link_restored`) · 18 `cp_m06_c_ligacao`; `m06.posts_reconnected`; `m06.dunstan_status` · 19 [A]; [B] lâmpada · 20 —

### Cena 5 — "Tanques pela brecha" (jogável; `obj_m06_observe_armor`)
2 05:50–06:40 (nascer do sol ~06:10) · 3 R33/R32; o acesso da brecha a 600–900 m · 4 amanhecer; Sol a leste (glare para quem olha para leste — facto de hora) · 5 secção; equipa de 2-pdr (portee) com guarnição própria a 200 m; artilharia · 6 Blindados pressionam o acesso: observar, sinalizar à equipa antitanque (lâmpada/telefone: posição e número), cobrir a infantaria que os segue; a artilharia e o 2-pdr destroem/afastam os tanques (eventos agendados); Daniel não dispara a tanques com o fuzil · 7 §79 ponto 4 · 8 observa; sinaliza (interação); cobre o 2-pdr contra infantaria · 9 — · 10 equipa do 2-pdr ocupa posição por si · 11 Pz III/IV (proxies), infantaria · 12 um tanque a arder a 500 m; poeira · 13 `dlg_m06_027–031` · 14 2-pdr; motores; impactos · 15 livre · 16 ligação · 17 tanques recuam (`evt_m06_armor_repulsed`) · 18 — · 19 [A] fogo como dados; [C] blindados como proxies com estados | 20 —

### Cena 6 — "Consolidar; feridos" (jogável; clímax; `obj_m06_consolidate`)
2 06:40–07:40 · 3 R32/R33; corredor · 4 sol · 5 secção; Ellis; maqueiros · 6 Infantaria alemã encurralada tenta romper; consolidar o trecho; garantir a evacuação dos feridos (Dunstan, dois de R33) pelo corredor; outras unidades cumprem as suas partes; alemães começam a render-se ao longe (visível, sem close) · 7 clímax canónico · 8 cobre o corredor; carrega uma maca (opcional) · 9 — · 10 Fraser mantém; Ellis organiza · 11 infantaria; rendições (estado `SURRENDERED` [C] ou proxies encenados) · 12 calor a subir; sombra curta · 13 `dlg_m06_032–036` · 14 — · 15 livre · 16 armor_repulsed · 17 feridos evacuados · 18 `cp_m06_d_defesa_final`; `m06.wounded_evacuated` · 19 [A] carriedBy · 20 —

### Cena 7 — "Sombra" (`cs_m06_outro`, ≤ 60 s) + debrief
2 07:40–08:40 · 3 área médica atrás de R32 (lona) · 4 sol alto; calor · 5 Daniel, Fraser, Morrow, Ellis, Dunstan ferido, um alemão ferido desarmado trazido sob guarda · 6 Ellis: "Ele não está mais atirando. Tire-o do sol." (003). Morrow protesta (Dunstan espera). Ellis organiza a mesma proteção a ambos; Fraser mantém o setor. Daniel procura sombra para Dunstan com a lona e dá-lhe o cantil. A posição resistiu; o cerco continua. · 7 consequência canónica + momento de custo humano · 8 skip; (jogável: dar o cantil a Dunstan — interação) · 9 — · 10 — · 11 — · 12 lona; macas; o alemão com a cabeça ligada · 13 `dlg_m06_003` (canónica), `037–040` · 14 vento; moscas; artilharia ao longe · 15 beat: Morrow olha o alemão, depois Dunstan (3 s) · 16 feridos evacuados | 17 debrief | 18 `m06.pow_treated = true`, `m06.completed` | 19 encenado (sem opção de negar ajuda) | 20 M11 lê `fraser/ellis/morrow/dunstan_status`.

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m06_check_posts` | Confira observação, munição e ligação | sim | intro | 3 tarefas | — | `ammo_delivered` | A |
| `obj_m06_repel_infantry` | Repila a infantaria com a Vickers | sim | 04:20 | ataque repelido | posto invadido → restaurar A | — | B |
| `obj_m06_reconnect` | R33 não responde: vá lá e recomponha a ligação | sim | 05:00 | telefone + lâmpada | — | `posts_reconnected`, `dunstan_status` | C |
| `obj_m06_signal_at` | Sinalize os blindados à equipa antitanque | sim | 05:50 | 2 sinais | — | — | — |
| `obj_m06_cover_at` | Cubra o 2-pdr contra a infantaria | sim | sinal | armor_repulsed | 2-pdr perdido → o seguinte assume (sem softlock) | — | — |
| `obj_m06_consolidate` | Consolide o trecho e evacue os feridos | sim | repulsed | 3 feridos no corredor | — | `wounded_evacuated` | D |
| `obj_m06_shade` | Dê sombra e água a Dunstan | opcional | outro | interação | — | `m06.canteen_shared` | — |

### 3.2 Setores
`s1_r32` (perto) · `s2_r33_corridor` (perto) · `s3_breach` (médio: brecha, tanques, infantaria encurralada, rendições) · `s4_perimeter` (médio: clarões e movimentos noutros trechos; o posto a oeste anuncia contacto às 03:10) · `s5_port` (longe: artilharia, porto, poeira). Agendas: contacto 04:20; R33 cala 05:00; tanques 05:50–06:40; rendições 07:00+.

### 3.3 Checkpoints
A postos · B primeiro ataque (munição, arame) · C ligação (R33 ligado; Dunstan ferido; sobreviventes) · D defesa final (feridos; tanque a arder persistente; prisioneiros).

### 3.4 Justiça
Tanques nunca são alvo do fuzil (sem "bazooka" inexistente); o 2-pdr tem guarnição própria; sem glare na direção do porto; a Vickers avisa "fita" antes de calar.

---

## 4. Set pieces

### SP-06-1 "O posto que cala"
Contexto: 05:00. Preparação: lâmpadas que respondem desde a cena 1. Experiência: a lâmpada não acende; o corredor; os sobreviventes. Companheiros: Dunstan ferido; Ellis trata. Ambiente: porta rebentada; mortos cobertos. Evolução: telefone, lâmpada. Clímax: R33 responde. Consequências: CP-C. Requisitos: [B] lâmpada/telefone; [A] fogo como dados. Integração: `obj_m06_reconnect`.

### SP-06-2 "Tanques ao amanhecer"
Contexto: brecha. Preparação: motores ouvidos desde as 05:30. Experiência: observar, sinalizar, cobrir; o 2-pdr trabalha. Companheiros: guarnição própria. Ambiente: Sol a leste; poeira. Evolução: um tanque arde; outros recuam. Clímax: `armor_repulsed`. Consequências: tanque persistente. Requisitos: [C] proxies blindados; [B] sinalização. Integração: `obj_m06_signal_at/cover_at`.

### SP-06-3 "Sombra"
Contexto: área médica. Preparação: Dunstan ferido; o alemão trazido. Experiência: ver Ellis organizar; dar o cantil. Companheiros: Morrow protesta e cede; Fraser mantém o setor. Ambiente: lona, moscas. Evolução: ambos à sombra. Clímax: fala 003. Consequências: `pow_treated`. Requisitos: encenado; [C] `SURRENDERED` opcional. Integração: outro.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| R32 03:10 | betão italiano com inscrições, arame, fosso, caixas | ronda | contacto a oeste | — | Morrow e a areia | — |
| ataque 04:20 | foguetes | Vickers | fita | infantaria | Keane/Sobey | arame cortado |
| R33 05:00 | porta rebentada, telefone caído, dois mortos cobertos | — | silêncio | atiradores | sobreviventes | lâmpada acende |
| brecha 05:50 | marcas de lagartas, poeira | 2-pdr | motores | tanques | — | tanque a arder |
| consolidação | — | macas | — | infantaria encurralada | rendições ao longe | — |
| área médica | lona, moscas | triagem | o alemão | — | Ellis | sombra |

Objetos com origem: inscrições italianas no betão (perímetro de 1930s), o telefone caído de R33, o cantil, a lona, o tanque a arder (o 2-pdr).

---

## 6. Diálogos (VO inglês australiano)

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Fraser | "Fiquem baixos. Eles veem qualquer cabeça acima da pedra." (§79) | intro t 20 | 1 | — |
| 002 | Morrow | "O posto da esquerda não responde." (§79) | 05:00 | 1 | — |
| 003 | Ellis | "Ele não está mais atirando. Tire-o do sol." (§79) | outro t 6 | 1 | — |
| 010 | Fraser | "R31 responde. R33 responde. Lâmpada em cada hora." (V1) | intro t 8 | 1 | — |
| 011 | Morrow | "Há areia dentro de tudo, até da voz." (PR #44) | intro t 14 | 3 | — |
| 012 | Ellis | "Macas: duas. Água: pouca. Sombra: nenhuma até às oito." (V1) | intro t 26 | 2 | — |
| 013 | Fraser | "Observação. Ouve antes de olhar." (V1) | binóculos | 1 | — |
| 014 | Dunstan | "Motor aliado ronca; o deles rateia. Vais aprender." (V1) | observação | 2 | — |
| 015 | Keane | "Caixa verde. Obrigado, Hargreaves." (V1) | munição | 2 | — |
| 016 | Sobey | "R33 na linha. Diz que está tudo quieto." (V1) | telefone | 2 | — |
| 017 | Fraser | "Arame! Vickers!" (V1) | contacto | 0 | — |
| 018 | Keane | "Fita!" (V1) | Vickers vazia | 0 | 30 |
| 019 | Morrow | "Bren aguenta. Despacha a fita!" (V1) | 018 | 1 | — |
| 020 | Fraser | "Recuaram. Contem munição." (V1) | repelido | 1 | — |
| 021 | Fraser | "Hargreaves, Dunstan, Ellis. Pelo corredor. Tragam-me uma voz de R33." (V1) | 002 + 4 s | 1 | — |
| 022 | Dunstan | "Wadi é longo. Corredor é curto e vê-se. Tu escolhes." (V1) | saída | 2 | — |
| 023 | Dunstan | (atingido) "…Bluey abaixo. Continuem." (V1) | hit | 1 | — |
| 024 | Ellis | "Não param. Eu fico com ele." (V1) | 023 | 1 | — |
| 025 | sobrevivente R33 | "Entraram pela porta. Três. Levámos dois." (V1) | R33 | 2 | — |
| 026 | Fraser (telefone) | "R33. Ouço-te. Lâmpada." (V1) | telefone | 1 | — |
| 027 | Fraser | "Motores. Não são nossos." (V1) | 05:30 | 1 | — |
| 028 | Fraser | "Não disparem aos tanques. Sinalizem o dois-libras: posição e número." (V1) | tanques | 0 | — |
| 029 | equipa 2-pdr | "Vistos. Deixem-nos chegar." (V1) | sinal | 2 | — |
| 030 | Morrow | "Infantaria atrás deles! Esquerda!" (V1) | infantaria | 0 | 20 |
| 031 | Dunstan | "Um a arder. Olha para o que não arde." (V1) | tanque a arder | 2 | — |
| 032 | Fraser | "Estão presos entre nós e o arame. Vão render-se ou morrer. Não escolhemos por eles." (V1) | rendições | 1 | — |
| 033 | Ellis | "Macas para o corredor. Três." (V1) | consolidação | 1 | — |
| 034 | Fraser | "Hargreaves, Dunstan primeiro." (V1) | maca | 1 | — |
| 035 | Morrow | "Mãos à vista. Um deles vem com os nossos." (V1) | prisioneiro | 2 | — |
| 036 | Fraser | "Posição mantida. Ninguém se ponha de pé." (V1) | D | 1 | — |
| 037 | Morrow | "Esse homem era do outro lado!" (PR #44) | outro t 8 | 2 | — |
| 038 | Ellis | "Agora precisa de ajuda. E o Bluey também. Lona para os dois." (PR #44, adaptada) | 037 | 1 | — |
| 039 | Morrow | "…Dá-lhe a sombra. Eu fico de olho." (V1) | 038 + 3 s | 2 | — |
| 040 | Daniel | "Deixe-lhe a sombra. Depois voltamos ao posto." (PR #44) | cantil | 1 | — |

Callouts: `co_m06_wire`, `co_m06_belt`, `co_m06_motors`, `co_m06_ally_hit`. Silêncio: R33 (cena 4) e 2 s após cada impacto de tanque.

---

## 7. Arte e atmosfera

**Paleta:** calcário cinzento, areia compacta, caqui desbotado, betão italiano, preto da noite, laranja do tanque a arder. **Luz:** 03:10 noite (estrelas, zénite `#0c1424`), 05:30 azul (`#3a4f70`), 06:10 Sol az 85°, el 1° (`#ffcf9a`, glare a leste), 07:40 sol alto, exposição 1,1, calor (haze). **Materiais:** betão com inscrições, arame, pedra, lona. **Silhuetas:** os postos R, a linha do fosso, o porto ao longe, a brecha. **Destruição:** arame cortado, tanque a arder, R33 rebentado — persistentes. **Humanos:** KD, Mk II, rostos de areia; o alemão com a cabeça ligada. **Violência reduzida:** mortos cobertos; sem sangue na área médica.

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| noite | vento seco, telefone, lâmpada (clique), areia no metal | contacto a oeste | artilharia do porto | — |
| ataque | Vickers (ritmo, fita), Bren, morteiros | — | — | — |
| R33 | passos no wadi, telefone | — | — | **obrigatório** |
| tanques | motores Maybach, 2-pdr, impactos, incêndio | infantaria | artilharia | 2 s/impacto |
| área médica | moscas, lona, cantil | — | — | — |

Sons novos: Vickers, telefone de campanha, 2-pdr, Pz III/IV à distância, lâmpada. VO inglês australiano.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| Batalha da Páscoa: infiltração na noite 13/14; ~38 panzers ao amanhecer; rechaçados; prisioneiros | D | H07; S-C03 | horas exatas P-C06 |
| 2/17.º no centro da ação; Edmondson VC | D | S-C03 | **não** dramatizar |
| Postos R-série italianos; fosso; arame | D (geral) | — | mapa |
| Vickers e 2-pdr no setor | R | — | P-C06 |
| Alemão ferido tratado | F plausível (prisioneiros documentados) | — | — |
| Equipamento 1941 (SMLE, Bren, Vickers, Boys, 2-pdr, KD) | D | — | auditoria |

**Proibições:** Owen gun (1942+), Sten; deserto plano; Daniel vence sozinho; execução. **Fora de cena:** Morshead, Edmondson.

---

## 10. Handoff técnico

**Contrato:** `id m06_tobruk`, `order 6`, relógio 03:10→08:40 com segmentos (ronda `readyScale`; ataques 1×), grupos (`grp_section`, `grp_vickers`, `grp_r33`, `grp_at_team`, `grp_de_infantry`, `grp_de_armor`), setores, checkpoints A–D, cutscenes (intro, silence, outro), falas, flags, debrief.

**Flags:** `m06.completed`, `m06.ammo_delivered`, `m06.posts_reconnected`, `m06.fraser_status`, `m06.ellis_status`, `m06.morrow_status`, `m06.dunstan_status`, `m06.wounded_evacuated`, `m06.pow_treated`, `m06.canteen_shared`.

**Sistemas:** [A] simulação, fogo como dados, supressão, `carriedBy`, checkpoints; [B] lâmpada/telefone (interação com resposta agendada), sinalização ao 2-pdr; [C] blindados como proxies com estados (motor, arder, recuar), rendições (`SURRENDERED` ou encenação), calor como luz (haze). [D] nenhum.

**Disciplinas:** Level: 3 postos, 400 m de arame, wadi, brecha a 600–900 m; Combate/IA: infantaria encurralada; Arte: betão italiano, luz por hora; Personagens: australianos 1941 (7), alemães DAK 1941; Animação: lâmpada, telefone, abastecer Vickers, dar cantil; Som: Vickers/2-pdr; VO: australiano; Historiador: P-C06; QA: R33 cala sempre às 05:00; `dunstan_status`; proxies de tanques determinísticos.

**Testes:** dados; cronologia; lâmpada responde/cala por evento; 2-pdr substituído sem softlock; `pow_treated` sempre true (sem opção).

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| Fraser pede lâmpadas | (intro) | ver R31/R33 responder | ronda | — | start | CP-A |
| Ronda dos postos | `obj_m06_check_posts` | observar; munição; telefone | Keane/Sobey; Dunstan | — | A | `ammo_delivered` |
| Infantaria no arame | `obj_m06_repel_infantry` | disparar; abastecer | Vickers reage à supressão | arame cortado | 04:20 | CP-B |
| R33 cala | `obj_m06_reconnect` | corredor; sobreviventes; ligação | Dunstan ferido; Ellis | lâmpada acende | 05:00 | CP-C |
| Tanques pela brecha | `obj_m06_signal_at/cover_at` | sinalizar; cobrir | 2-pdr com guarnição | tanque a arder | 05:50 | repulsed |
| Encurralados | `obj_m06_consolidate` | cobrir corredor; maca | rendições ao longe | macas | repulsed | CP-D |
| O alemão e Bluey | outro | dar o cantil | Morrow protesta; Ellis organiza | lona | feridos | `pow_treated` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 8 | A linha que se vê e o posto que cala. |
| 2 | Autenticidade | 8 | Batalha da Páscoa D; batalhão R com forte plausibilidade. |
| 3 | Personagens | 8 | Fraser/Morrow/Ellis (§73) + Dunstan. |
| 4 | Diálogos | 8 | 40 falas; o protesto de Morrow sem sermão. |
| 5 | Originalidade | 8 | lâmpadas; sinalizar tanques em vez de os matar. |
| 6 | Variedade | 8 | ronda, defesa, corredor, observação, consolidação, triagem. |
| 7 | Set pieces | 8 | três. |
| 8 | Atmosfera | 8 | noite → amanhecer com glare a leste. |
| 9 | Environmental storytelling | 7 | betão italiano; R33. |
| 10 | Cinematográfica | 7 | sem câmara externa. |
| 11 | Sonora | 8 | Vickers e o silêncio de R33. |
| 12 | Impacto emocional | 8 | a sombra partilhada. |
| 13 | Ritmo | 8 | 20–26 min. |
| 14 | Continuidade | 9 | quatro flags para M11; o cantil. |
| 15 | Integração técnica | 7 | proxies blindados [C]; resto [A]/[B]. |

**Correções aplicadas:** (1) a fala 003 ganhou contexto (Dunstan também espera) para o protesto de Morrow ter causa; (2) a guarnição da Vickers recebeu nomes e a falha de munição ganhou efeito visível na supressão; (3) a lua foi marcada pendente (P-C06) em vez de assumida.
