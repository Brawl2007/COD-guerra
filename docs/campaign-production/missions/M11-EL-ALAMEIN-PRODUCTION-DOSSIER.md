# M11 — NOITE NO DESERTO · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** noite de 23/10/1942, El Alamein; 9.ª Divisão Australiana; POV Daniel Hargreaves; fonte H11; 22–28 min; três falas; checkpoints "preparação; primeira linha; corredor aberto; consolidação"; barragem às **21:40** (verificada pela AWM: HISTORICAL_GATES V); sem procedimentos reais de minas; final: Ellis entre macas; Daniel dá água a Morrow. **Proposto:** 2/17.º Batalhão, 20.ª Brigada (S-C03, RECONSTRUÇÃO; P-C11), elenco conforme flags de M06 (substitutos nomeados), relógio, flags.

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m11_el_alamein` / 11 |
| Datas | 1942-10-23T20:30+02:00 → 1942-10-24T03:40+02:00 |
| Local | posição de reunião atrás da linha australiana (setor norte) → corredor de avanço com fita branca → primeira linha defensiva alemã (arame, postos) → acesso para suprimento/evacuação → posição consolidada (`RECONSTRUCTED`; objetivo do batalhão P-C11) |
| Operação | Lightfoot: barragem de 882 peças às 21:40 (D, AWM); lua cheia (D); engenheiros abrem corredores nos campos de minas com fita e lâmpadas; infantaria avança atrás da barragem; 2/17.º no ataque (D, S-C03) |
| Unidade | 9.ª Div. Australiana (canónico) → 2/17.º, 20.ª Bde (R) |
| Elenco | Daniel (POV, lance-corporal), Fraser, Morrow (Bren), Ellis (socorrista) (§73; presentes conforme `m06.*_status`), Dunstan (se `m06.dunstan_status = recovered`), pte. Neville Barrow (reforço), substitutos: sgt. Harry Coote (por Fraser), pte. Keith Lund (por Ellis), Keane/Sobey (Vickers, se vivos) (propostas) |
| Fora de cena | Montgomery, Morshead |
| Intocável | data, hora da barragem, unidade, POV, falas `dlg_m11_001–003` (reatribuídas a substitutos conforme regra de §79 se o falante estiver ausente), checkpoints, "a batalha ainda durará dias" |

---

## 1. Story Bible

**Logline.** Dezoito meses depois de Tobruk, Daniel reconhece os sobreviventes pelos rostos que mudaram. Às 21:40 o horizonte inteiro acende-se. A tarefa não é atacar: é seguir uma fita branca na escuridão, manter aberto um corredor onde cabem pessoas, ir buscar um homem que falta à contagem — e dar a Morrow o último gole do cantil que sacudia em Tobruk.

**As oito respostas.**
1. **Situação central:** uma noite inteira de artilharia; abrir um corredor na escuridão.
2. **Modo de contar:** metros de fita branca (o corredor que existe só enquanto se vê a fita).
3. **Objeto:** o mesmo cantil de M06 (o último gole para Morrow).
4. **Silêncio:** o deserto antes das 21:40.
5. **Tarefa que não é matar:** seguir os engenheiros; levar mensagem; recompor ligação; carregar um ferido opcional.
6. **Custo humano:** um homem ausente da contagem aparece a arrastar-se entre as marcas de passagem (causa: perdeu a fita no escuro) → Daniel hesita entre continuar com o grupo e desviar-se / Ellis organiza uma equipa se a rota for segura e o tempo permitir → `m11.straggler_helped`, sem mudar o destino do ataque.
7. **Pessoas históricas:** fora de cena.
8. **Debrief:** regista a barragem, o avanço da noite, a batalha que dura até 4/11, as baixas do batalhão em outubro–novembro; "sem comemorar".

**Três motivos.** (a) *A fita* — o corredor é uma linha que se segue, não um caminho que se escolhe; (b) *o horizonte* — a escala (882 peças) vista por setores; (c) *sustentar* — desta vez a questão não é resistir (M06), é manter um ganho.

**Temas.** Disciplina no escuro; reconhecer quem mudou; escassez (água); participação local vs vitória de campanha.

**Estrutura (§54).** CONTEXTO → INTRO (chamada de Fraser; rostos; Ellis conta macas) → APROXIMAÇÃO (21:40; o corredor) → DIÁLOGO (Fraser: "Siga o corredor.") → PRIMEIRO CONTATO (primeira linha; arame) → ESCALADA (acesso para suprimento; blindados presos) → COMBATE PRINCIPAL (pressão lateral; perda de contacto; mensagem) → SET-PIECE (o homem que rasteja) → PAUSA (ligação recomposta) → CLÍMAX (manter posição e corredor até substituição) → CONSEQUÊNCIA (água a Morrow) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Daniel | reconhece rostos; conta carregadores | Morrow (cantil), Fraser | o homem que rasteja; a pressão lateral | sustenta um ganho em vez de resistir | "Não sobrou muito. Beba devagar." (003) |
| Fraser/Coote | chamada | — | — | ordens mais curtas | vivo |
| Morrow/Barrow | Bren; exausto | Daniel | "A direita parou." (002) | — | recebe água |
| Ellis/Lund | macas | feridos | o homem que rasteja | — | entre macas |
| Barrow | reforço | — | — | aprende a fita | vivo |

**O que a missão recusa.** Tutorial de minas; visão noturna; reutilizar a defesa de M06; blindados que atravessam tudo; teletransporte de reforços; amanhecer (termina de noite).

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "Chamada no escuro" (`cs_m11_intro`, ≤ 80 s)
2 20:30 · 3 posição de reunião (vala) atrás da linha · 4 lua cheia; silêncio · 5 Daniel, Fraser/Coote, Morrow/Barrow, Ellis/Lund, Dunstan (variante), Keane/Sobey (variante); companhia · 6 Cartela: EL ALAMEIN — 23 DE OUTUBRO DE 1942 — 20:30 · 2/17.º BATALHÃO · 9.ª DIVISÃO AUSTRALIANA. Cartela 2 (`lineVariants`): quem voltou de Tobruk (por flags de M06). Fraser faz a chamada; Daniel reconhece os sobreviventes e as mudanças nos rostos; Ellis organiza macas; Morrow limpa areia da Bren (gesto de M06) mais devagar. Fraser: "Siga o corredor. Não escolha caminho no escuro." (001). · 7 reconhecer quem mudou; preparar o silêncio · 8 olhar; sacudir o cantil (gesto); pode falar com Morrow · 9 — · 10 — · 11 — · 12 fita enrolada, lâmpadas tapadas, macas · 13 `dlg_m11_001` (canónica; Coote se Fraser ausente), `010–015` · 14 **silêncio obrigatório** (vento; nada) · 15 beat: rostos (Fraser 2 s, Morrow 2 s) · 16 `missionStart` · 17 21:39:30 · 18 `cp_m11_a_preparacao` · 19 variantes · 20 flags de M06.

### Cena 2 — "21:40" (`cs_m11_barrage`, ≤ 20 s; jogável depois)
2 21:40 · 3 vala · 4 o horizonte inteiro acende-se por setores (oeste); clarões a cada segundo · 5 companhia · 6 A barragem altera instantaneamente a paisagem sonora e ilumina a frente inteira; ninguém fala durante 10 s; depois Fraser: "Corredor." · 7 §79 abertura: "uma frente extensa, não uma explosão isolada" · 8 olhar livre · 9 — · 10 — · 11 — · 12 — · 13 `dlg_m11_016` · 14 barragem (banda longa por setores; atraso coerente) · 15 beat: olhar a frente (target nulo 5 s) · 16 21:40:00 · 17 Fraser · 18 — · 19 [B] evento de barragem por setores · 20 —

### Cena 3 — "A fita" (jogável; `obj_m11_follow_engineers`)
2 22:00–22:40 · 3 corredor de avanço: fita branca, lâmpadas tapadas, marcas; engenheiros à frente · 4 lua + clarões; poeira · 5 secção; engenheiros (NPC com tarefa própria); companhias vizinhas noutros corredores · 6 Acompanhar os engenheiros pelo corredor sinalizado; reconhecer o risco (áreas fora da fita são perigosas: aviso, não procedimento); avançar por etapas sob a barragem rastejante; Barrow sai da fita uma vez (Fraser puxa-o) · 7 §79 ponto 1 · 8 segue a fita; mantém distância; ajuda a estender fita (interação abstrata) · 9 — · 10 engenheiros param/avançam por si; Fraser conta · 11 fogo alemão esporádico (dados); morteiros · 12 fita, lâmpadas, marcas de passagem · 13 `dlg_m11_017–021` · 14 barragem; fita ao vento; passos · 15 livre · 16 Fraser · 17 primeira linha à vista · 18 `m11.tape_metres` · 19 [A]; [B] fita (prop dinâmico) · 20 —

### Cena 4 — "Primeira linha" (jogável; `obj_m11_first_line`)
2 22:40–23:30 · 3 posição alemã: arame, postos, uma MG · 4 clarões · 5 secção; Vickers (Keane/Sobey ou guarnição nova) sustenta um flanco · 6 Avançar por etapas sob cobertura e alcançar a primeira linha; a arma coletiva sustenta um flanco sem seguir Daniel · 7 §79 ponto 2 · 8 lances; suprime; corta/atravessa o arame onde os engenheiros abriram · 9 — · 10 Vickers no flanco; Morrow/Barrow com a Bren · 11 MG; infantaria em postos · 12 arame; postos de areia · 13 `dlg_m11_022–025` · 14 Vickers; MG; arame · 15 livre · 16 à vista · 17 linha tomada · 18 `cp_m11_b_primeira_linha` · 19 [A] · 20 —

### Cena 5 — "Acesso" (jogável; `obj_m11_secure_access`)
2 23:30–00:30 · 3 brecha para suprimento/evacuação (um gap marcado) · 4 lua · 5 secção; carriers/jipes (proxies); blindados noutro corredor · 6 Garantir um acesso para suprimento/evacuação; blindados e outras formações enfrentam dificuldades nos seus corredores (um tanque preso a 300 m, visível; não "atravessam magicamente") · 7 §79 ponto 3 · 8 marca o gap (lâmpada); cobre o primeiro carrier; dispara a sondas · 9 — · 10 engenheiros alargam; carrier passa · 11 sondas; artilharia alemã · 12 tanque preso; marcas de lagartas · 13 `dlg_m11_026–029` · 14 motores; artilharia · 15 livre · 16 CP-B · 17 primeiro carrier passa (`evt_m11_access_open`) · 18 `cp_m11_c_corredor_aberto` · 19 [A]; [C] veículos como proxies · 20 —

### Cena 6 — "A direita parou" (jogável; `obj_m11_relink`)
2 00:30–01:30 · 3 flanco direito; posto vizinho; 200 m · 4 lua; fumo · 5 secção; posto vizinho · 6 Pressão lateral e perda de contacto: Morrow: "A direita parou. A nossa passagem ainda está aberta." (002). Levar mensagem ao posto vizinho, recompor ligação (lâmpada/telefone), reorganizar · 7 §79 ponto 4 · 8 leva a mensagem por lances; liga · 9 — · 10 Fraser reorganiza; Barrow cobre · 11 contra-ataque local (dados) · 12 — · 13 `dlg_m11_002` (canónica; Barrow se Morrow ausente), `030–033` · 14 — · 15 livre · 16 access_open · 17 ligação (`evt_m11_relinked`) · 18 — · 19 [A]; [B] lâmpada · 20 —

### Cena 7 — "O homem que rasteja" (`cs_m11_straggler`, ≤ 30 s; jogável depois) — **custo humano**
2 01:30–02:00 · 3 entre as marcas de passagem, 60 m fora do corredor · 4 lua · 5 Daniel, Ellis/Lund, Fraser · 6 Um homem ausente da contagem (do pelotão vizinho) aparece a arrastar-se entre marcas de passagem, fora da fita. Daniel hesita entre continuar e desviar-se; Ellis: se a rota for segura (pelo trilho das marcas) e o tempo permitir (antes da substituição), uma equipa ajuda-o sem mudar o ataque · 7 momento de custo humano · 8 decide: ir pelo trilho de marcas (seguro, lento) com Ellis e trazê-lo (carriedBy) — ou ficar; não há recompensa; se for, Fraser cobre · 9 ir / ficar · 10 Ellis vai sempre que o jogador vá; Fraser avisa do tempo · 11 fogo esporádico · 12 marcas de passagem · 13 `dlg_m11_034–037` · 14 — · 15 beat: o homem (2 s) · 16 relinked · 17 decisão resolvida · 18 `m11.straggler_helped` · 19 [A] carriedBy · 20 —

### Cena 8 — "Até à substituição" (jogável; clímax; `obj_m11_hold_until_relief`)
2 02:00–03:20 · 3 posição conquistada e corredor · 4 lua baixa; clarões a diminuir · 5 secção; substituição a chegar (outra unidade) · 6 Manter a posição e o corredor até chegar substituição/ordem de consolidar; sinais legíveis do objetivo (lâmpadas); pressão alemã por salvas (rotação de cobertura); a Vickers sustenta · 7 §79 ponto 5 · 8 rotação por salvas; suprime; mantém a lâmpada do gap · 9 — · 10 substituição chega por si (proxies) · 11 contra-ataque; artilharia · 12 — · 13 `dlg_m11_038–041` · 14 — · 15 livre · 16 decisão · 17 ordem de consolidar (`evt_m11_consolidate`) · 18 `cp_m11_d_consolidacao` · 19 [A] · 20 —

### Cena 9 — "Beba devagar" (`cs_m11_outro`, ≤ 60 s) + debrief
2 03:20–03:40 · 3 posição · 4 lua baixa; clarões ao longe · 5 secção · 6 O grupo permanece na posição sem comemorar; Ellis procura espaço entre macas; Daniel entrega o cantil a Morrow (ou Barrow), agora visivelmente exausto: "Não sobrou muito. Beba devagar." (003). Cartela: a batalha continua até 4/11. · 7 consequência canónica · 8 skip; (jogável: dar o cantil — interação) · 9 — · 10 — · 11 — · 12 macas; o cantil · 13 `dlg_m11_003` (canónica), `042–043` · 14 clarões ao longe; nenhuma música · 15 beat: o cantil (3 s) · 16 consolidate · 17 debrief · 18 `m11.completed`; `m11.canteen_given` · 19 — · 20 fim do arco de Daniel.

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m11_wait_barrage` | Aguarde a barragem | sim | intro | 21:40 | — | — | A |
| `obj_m11_follow_engineers` | Siga os engenheiros pela fita | sim | 21:40 | linha à vista | sair da fita > 8 m → aviso; > 15 m por 10 s → ferimento (mina, aviso triplo; nunca morte instantânea) | `tape_metres` | — |
| `obj_m11_first_line` | Alcance a primeira linha | sim | à vista | tomada | — | — | B |
| `obj_m11_secure_access` | Garanta um acesso para suprimento/evacuação | sim | B | carrier passa | — | — | C |
| `obj_m11_relink` | Leve a mensagem e recomponha a ligação | sim | 00:30 | relinked | — | — | — |
| `obj_m11_straggler` | Um homem falta à contagem | **opcional** | relinked | homem na posição | tempo (substituição) | `straggler_helped` | — |
| `obj_m11_hold_until_relief` | Mantenha posição e corredor até à substituição | sim | decisão | consolidate | — | — | D |
| `obj_m11_canteen` | Dê água a Morrow | sim (fim) | outro | interação | — | `canteen_given` | — |

### 3.2 Setores
`s1_section` (perto) · `s2_corridors` (médio: outros corredores, blindados presos, carriers) · `s3_barrage` (longe: baterias, clarões por setor, linha de fumo que muda com a operação — eventos agendados 21:40, 22:00 rastejante, 00:00 nova barragem) · `s4_enemy_rear` (longe: artilharia alemã, flares).

### 3.3 Checkpoints
A preparação · B primeira linha · C corredor aberto · D consolidação.

### 3.4 Justiça
Fora da fita: aviso → aviso → ferimento com evacuação, nunca morte; sem procedimento de minas; nunca "demasiado escuro": lua cheia + clarões; a direita "pára" por evento, não por falha do jogador.

---

## 4. Set pieces

### SP-11-1 "21:40"
Contexto: vala. Preparação: silêncio total; rostos. Experiência: o horizonte acende-se; 10 s sem falas. Companheiros: ninguém fala. Ambiente: clarões por setor. Evolução: "Corredor." Clímax: a escala. Consequências: —. Requisitos: [B] evento de barragem por setores. Integração: `obj_m11_wait_barrage`.

### SP-11-2 "A fita"
Contexto: corredor. Preparação: 001. Experiência: seguir uma linha branca sob clarões; Barrow sai; engenheiros param. Companheiros: engenheiros com tarefa própria. Ambiente: lâmpadas tapadas. Evolução: barragem rastejante. Clímax: a primeira linha. Consequências: `tape_metres`. Requisitos: [B] fita dinâmica. Integração: `obj_m11_follow_engineers`.

### SP-11-3 "O homem que rasteja"
Contexto: fora da fita. Preparação: a contagem de Fraser. Experiência: ir pelo trilho de marcas com Ellis. Companheiros: Fraser cobre e avisa do tempo. Ambiente: marcas de passagem. Evolução: trazê-lo. Clímax: a posição. Consequências: `straggler_helped`. Requisitos: [A] carriedBy. Integração: `obj_m11_straggler`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| vala 20:30 | fita enrolada, lâmpadas, macas, cantis | chamada | silêncio | — | rostos | — |
| corredor | fita, lâmpadas, marcas | engenheiros | clarões | esporádico | Barrow | fita estendida |
| primeira linha | arame, postos de areia, MG | — | — | assalto | Vickers | linha tomada |
| acesso | gap, tanque preso | carriers | — | sondas | engenheiros | marcas de lagartas |
| flanco | — | posto vizinho | perda de contacto | contra-ataque | — | ligação |
| posição | macas | substituição | — | salvas | Ellis | cantil |

Objetos com origem: a fita (engenheiros, noite de 23/10), as lâmpadas tapadas (orientação), o tanque preso (corredor vizinho), o cantil (Tobruk).

---

## 6. Diálogos (VO inglês australiano)

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Fraser (ou Coote) | "Siga o corredor. Não escolha caminho no escuro." (§79) | intro t 40 | 1 | — |
| 002 | Morrow (ou Barrow) | "A direita parou. A nossa passagem ainda está aberta." (§79) | 00:30 | 1 | — |
| 003 | Daniel | "Não sobrou muito. Beba devagar." (§79) | cantil | 1 | — |
| 010 | Fraser | "Chamada. Hargreaves. Morrow. Ellis. Dunstan…" (variantes) (V1) | intro t 6 | 1 | — |
| 011 | Morrow | "Tobruk foi há um ano. Parece que foi este rosto." (V1) | intro t 20 | 3 | — |
| 012 | Ellis | "Macas: quatro. Esta noite vão chegar." (V1) | intro t 26 | 2 | — |
| 013 | Barrow | "É a minha primeira. Que faço se perder a fita?" (V1) | intro t 32 | 3 | — |
| 014 | Fraser | "Páras. Chamas. Esperas." (V1) | 013 | 1 | — |
| 015 | Morrow | (se `m06.pow_treated`) "Lembras-te do alemão à sombra? Hoje não há sombra para ninguém." (V1) | intro t 48 | 3 | — |
| 016 | Fraser | "…Corredor." (V1) | 21:40 + 10 s | 1 | — |
| 017 | engenheiro | "Fita até ao marco três. Não passem da fita." (V1) | corredor | 1 | — |
| 018 | Fraser | "Barrow! A fita!" (V1) | Barrow sai | 0 | — |
| 019 | engenheiro | "Parem. Marco. Dois minutos." (V1) | engenheiros param | 1 | — |
| 020 | Morrow | "A barragem anda. Nós andamos atrás." (V1) | rastejante | 2 | — |
| 021 | Fraser | "Linha à vista. Arame." (V1) | linha | 1 | — |
| 022 | Keane/guarnição | "Vickers no flanco esquerdo. Não nos sigam." (V1) | flanco | 1 | — |
| 023 | Fraser | "MG no posto. Suprimir e atravessar pelo corte." (V1) | MG | 0 | 20 |
| 024 | Morrow | "Bren vazia!" (V1) | — | 1 | 30 |
| 025 | Fraser | "Linha é nossa. Agora o acesso." (V1) | tomada | 1 | — |
| 026 | engenheiro | "Gap marcado. Lâmpada verde para os carriers." (V1) | acesso | 1 | — |
| 027 | Fraser | "Tanque preso à direita. Não é nosso problema. O carrier é." (V1) | tanque | 2 | — |
| 028 | carrier (voz) | "Passamos? Passamos!" (V1) | carrier | 2 | — |
| 029 | Fraser | "Corredor aberto. Mantê-lo." (V1) | access_open | 1 | — |
| 030 | Fraser | "Perdemos a direita. Hargreaves: mensagem ao posto vizinho. Lâmpada." (V1) | 002 | 1 | — |
| 031 | posto vizinho | "Recebido. Estamos cá. Reorganizar." (V1) | ligação | 1 | — |
| 032 | Barrow | "Contra-ataque!" (V1) | contra-ataque | 0 | 20 |
| 033 | Fraser | "Ligação. Agora contem." (V1) | relinked | 1 | — |
| 034 | Fraser | "Falta um do vizinho." (V1) | contagem | 1 | — |
| 035 | Ellis | "Não passem sobre ele. Há um homem aqui!" (PR #44) | o homem | 1 | — |
| 036 | Ellis | "Pelo trilho das marcas é seguro. Se formos agora, voltamos antes da substituição." (V1) | 035 | 1 | — |
| 037 | Fraser | "Vão. Eu conto o tempo. Dez minutos." (V1) | decisão | 1 | — |
| 038 | Fraser | "Substituição a caminho. Aguentar o corredor." (V1) | hold | 1 | — |
| 039 | Morrow | "Salva! Mudem!" (V1) | salva | 0 | 20 |
| 040 | Daniel | "O corredor não serve de nada se não couberem pessoas nele." (PR #44) | carrier 2 | 2 | — |
| 041 | substituição | "Rendemos-vos. Posição conhecida." (V1) | consolidate | 1 | — |
| 042 | Ellis | "Espaço. Entre as macas." (V1) | outro | 2 | — |
| 043 | Morrow | (bebe) "…Devagar." (V1) | cantil | 3 | — |

Callouts: `co_m11_tape` ("A fita!"), `co_m11_mg_post`, `co_m11_salvo`. Silêncios: antes das 21:40; 10 s depois.

---

## 7. Arte e atmosfera

**Paleta:** preto-azul de lua cheia, branco da fita, laranja-branco dos clarões por setor, caqui ao luar (cinzento), poeira. **Luz:** 20:30 lua cheia (az 90°, el 25°, `#c9d4e8` fraca; sombras nítidas), 21:40 clarões a 1–2 Hz no horizonte oeste (`#ffd27a`), 03:20 lua baixa. **Materiais:** areia compacta, arame, fita, lona. **Silhuetas:** a fita, lâmpadas tapadas, o tanque preso, postos de areia. **Destruição:** crateras novas, arame cortado, tanque preso (persistente). **Humanos:** KD longos, Mk II, rostos mudados (variação por ano). **Violência reduzida:** macas cobertas.

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| 20:30 | vento, cantil, fita | — | nada | **obrigatório** |
| 21:40 | — | — | barragem por setores com atraso | 10 s sem falas |
| fita | passos, fita ao vento, engenheiros | outros corredores | barragem rastejante | — |
| linha | Vickers, Bren, arame | — | — | — |
| acesso | carriers, motores | tanque preso | artilharia alemã | — |
| flanco | lâmpada, telefone | posto vizinho | — | — |
| posição | salvas, substituição | — | clarões a diminuir | cantil |

Sons novos: barragem de 882 peças por setores (banda longa), fita, carriers. VO australiano.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| Barragem às 21:40 de 23/10 | D | H11 (AWM) | — |
| Lua cheia | D | geral | — |
| 2/17.º no ataque sob barragem; arame/minas | D | S-C03 | P-C11 (companhia, objetivo) |
| Fita e lâmpadas dos engenheiros | D (geral) | — | — |
| Blindados presos nos corredores | D (geral) | — | — |
| Substituição; "a direita parou" | R/F | — | — |
| Equipamento 1942 (SMLE, Bren, Vickers, 6-pdr) | D | — | auditoria |

**Proibições:** tutorial de minas; visão noturna; M06 repetida; amanhecer. **Fora de cena:** Montgomery, Morshead.

---

## 10. Handoff técnico

**Contrato:** `id m11_el_alamein`, `order 11`, relógio 20:30→03:40, `cast` condicional por `m06.*_status` com substitutos (`presentIf`/`substituteFor`), grupos (`grp_section`, `grp_engineers`, `grp_vickers`, `grp_carriers`, `grp_neighbor_post`, `grp_relief`, `grp_de_line`), setores, checkpoints A–D, cutscenes (intro, barrage, straggler, outro), falas (com reatribuição), flags, debrief.

**Flags:** `m11.completed`, `m11.tape_metres`, `m11.fraser_status`, `m11.morrow_status`, `m11.ellis_status`, `m11.barrow_status`, `m11.corridor_open`, `m11.straggler_helped`, `m11.canteen_given`.

**Sistemas:** [A] simulação, fogo como dados, rotação por salvas, carriedBy; [B] barragem por setores (eventos + áudio), fita dinâmica, lâmpada, reatribuição de falas por flag ([D] leve: leitura de flags de M06); [C] veículos como proxies (carriers, tanque preso). [D] nenhum além da leitura de flags.

**Disciplinas:** Level: 1,2 km de corredor + linha + acesso + flanco; Combate/IA: postos e contra-ataque; Arte: lua cheia e clarões; Personagens: australianos 1942 (variantes + Barrow/Coote/Lund); Animação: estender fita, lâmpada, carregar; Som: barragem; VO: australiano; Historiador: P-C11; QA: variantes por flags de M06 (2^4), fora da fita nunca mata, D.

**Testes:** barragem às 21:40:00 do relógio; falas 001/002 reatribuídas quando o falante está ausente; `straggler_helped` nas duas vias; cantil no fim sempre.

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| Rostos de Tobruk | (intro) | ouvir a chamada; gesto do cantil | Fraser conta | — | start | CP-A |
| 21:40 | `obj_m11_wait_barrage` | olhar | ninguém fala | horizonte aceso | 21:40 | — |
| A fita | `obj_m11_follow_engineers` | seguir; ajudar a estender | engenheiros; Barrow sai | fita estendida | corredor | `tape_metres` |
| Primeira linha | `obj_m11_first_line` | lances; suprimir | Vickers no flanco | arame cortado | linha | CP-B |
| Acesso | `obj_m11_secure_access` | marcar gap; cobrir carrier | engenheiros; carriers | marcas de lagartas | B | CP-C |
| A direita parou | `obj_m11_relink` | mensagem; lâmpada | posto vizinho | — | 00:30 | relinked |
| O homem que rasteja | `obj_m11_straggler` | ir pelo trilho/ficar | Ellis; Fraser conta tempo | — | relinked | `straggler_helped` |
| Até à substituição | `obj_m11_hold_until_relief` | rotação; lâmpada | substituição chega | — | decisão | CP-D |
| Beba devagar | `obj_m11_canteen` | dar o cantil | Morrow | — | consolidate | `m11.completed` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 8 | sustentar um ganho; o cantil fecha o arco. |
| 2 | Autenticidade | 8 | 21:40 D; lua D; companhia P-C11. |
| 3 | Personagens | 8 | variantes com substitutos nomeados; Barrow. |
| 4 | Diálogos | 8 | reatribuição cumprida. |
| 5 | Originalidade | 8 | a fita como corredor; o homem que rasteja. |
| 6 | Variedade | 8 | esperar, seguir, assaltar, marcar, ligar, decidir, aguentar. |
| 7 | Set pieces | 8 | três. |
| 8 | Atmosfera | 9 | lua cheia e clarões por setor. |
| 9 | Environmental storytelling | 7 | deserto é pobre por natureza; fita/lâmpadas/tanque preso. |
| 10 | Cinematográfica | 8 | 10 s sem falas às 21:40. |
| 11 | Sonora | 9 | silêncio → barragem. |
| 12 | Impacto emocional | 8 | o último gole. |
| 13 | Ritmo | 8 | 22–28 min. |
| 14 | Continuidade | 9 | lê M06; fecha Daniel. |
| 15 | Integração técnica | 7 | maioria [A]/[B]; proxies [C]. |

**Correções aplicadas:** (1) regra "fora da fita" com aviso triplo e ferimento evacuável (nunca morte instantânea); (2) falas 001/002 com substitutos nomeados (Coote/Barrow) para respeitar a regra literal de §79; (3) "a direita parou" tornado evento agendado (não falha do jogador).
