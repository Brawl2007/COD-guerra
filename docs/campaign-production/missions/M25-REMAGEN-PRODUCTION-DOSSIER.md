# M25 — PONTE AINDA DE PÉ · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** 7/3/1945, Remagen, Alemanha; Companhia A, 27.º Batalhão de Infantaria Blindada, 9.ª Divisão Blindada; POV Carl Hughes; fonte H25; 20–27 min; três falas; checkpoints "acesso; antes da travessia; margem oposta; consolidação — restaurar ponte, danos, travessias e eventos"; tentativas de demolição e danos seguem a história pesquisada, "sem um puzzle de fios apresentado como procedimento real"; engenharia e tropas subsequentes trabalham independentemente de Hughes; "um bombardeio posterior só pode ser usado com nova data comprovada"; debrief informa o colapso de 17/3 "sem fazê-la ruir durante a captura". **Proposto:** inversão temática de M01 (a ponte que fica de pé) sem Hughes "conhecer" Jan nem repetir Tczew (PR #44), o guarda-corpo (a mão de Hughes) como objeto, o espanto e os 2 s após 15:40 como silêncios, a cronologia S-C21 (avanço 13:40; Cia. A na ponte 15:15–15:30; ordem 15:30; detonação ~15:40 — a ponte ergue-se e assenta; primeiros homens na margem leste ~15:45), os homens que atravessam como contagem (`m25.crossed_count`), o rendido junto do acesso → Fisk quer "garantir" / Hanlon impede amontoar na zona danificada → `m25.pow_at_access_secured`. **Sistemas:** [A] quase tudo (a ponte como estrutura jogável reutiliza M01: `planMetalStress`, guarda-corpo, pilares); [C] veículos NPC (M26, half-tracks) a cruzar por agenda; [B] "cortar fios" abstrato (os engenheiros; o jogador cobre).

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m25_remagen` / 25 |
| Datas | 1945-03-07T13:40+01:00 → 1945-03-07T17:00+01:00 (+ cartela noturna; hora da Europa Central) |
| Local | encosta acima de Remagen (vista da ponte) → ruas da cidade até ao acesso oeste (rampa; a cratera aberta pelos alemães na rampa) → a ponte Ludendorff (325 m; duas torres de cada lado; tabuleiro de ferrovia com pranchas) → margem leste (as torres leste; a estrada da margem; o túnel de Erpeler Ley como entrada visível, **nunca** entrado) — ponte `EXACT`; cidade e posições `RECONSTRUCTED` (P-C25: posição da Cia. A antes da ordem; fogo do lado leste; túnel) |
| Operação | CCB da 9.ª Blindada chega a Remagen a 7/3; avanço 13:40; a Cia. A (Timmermann) na ponte 15:15–15:30; ordem de atravessar 15:30; detonação alemã ~15:40 (a ponte ergue-se e assenta; cargas: ~2 000 kg no pilar oeste e 2×300 kg); Drabik na margem leste ~15:45; túnel de Erpeler Ley com soldados e civis; colapso a 17/3 (S-C21 — DOCUMENTED em resumo) |
| Unidade | Cia. A, 27.º AIB, 9.ª Div. Blindada (canónico) → esquadra de Hughes; engenheiros do 9.º Btl. de Engenharia Blindada (Hanlon) |
| Elenco | pfc. Carl Hughes (POV), staff sergeant Mel Ortega (graduado), sgt. Walt Hanlon (engenheiro), cabo Dale Fisk (chefe da equipa de cobertura), pfc. Lou Brandt (equipa de acesso — proposta), pte. Teddy Kowalczyk (recruta; conta os que atravessam — proposta), um motorista de half-track (T/5 Reyes — proposta), o rendido do acesso (Volkssturm/soldado alemão idoso, sem nome inventado além do que diz: "Hartmann"), civis de Remagen às janelas (sem nomes), tripulações de M26 (NPC) (propostas) |
| Fora de cena | ten. Karl Timmermann; sgt. Alexander Drabik; gen. William Hoge; cap. Willi Bratge / maj. Hans Scheller (lado alemão); o interior do túnel |
| Intocável | data, local, unidade, POV, falas `dlg_m25_001–003`, os quatro checkpoints (restaurar ponte, danos, travessias e eventos), cronologia 13:40/15:30/15:40/15:45, "sem puzzle de fios", engenharia independente de Hughes, nenhum bombardeamento em 7/3, colapso só no debrief (17/3), Hughes nunca "conhece" Jan |

---

## 1. Story Bible

**Logline.** Carl Hughes desce do half-track habituado a que as ordens sejam de marcha: atravessar a cidade, seguir para sul. Da encosta, vê o que ninguém esperava: a ponte inteira sobre o Reno. A ordem muda. Durante três horas, Hughes cobre uma equipa que abre o acesso, vê engenheiros fazerem um trabalho que ele não sabe fazer, atravessa com a mão no guarda-corpo quando a estrutura acabou de se erguer e assentar, e aprende que manter uma passagem aberta também decide uma guerra. À noite, os suprimentos cruzam. A ponte ainda está de pé. Vai estar dez dias.

**As oito respostas.**
1. **Situação central:** a ponte que fica de pé — espelho de função, não de geografia, com M01 (MASTER-STORY-BIBLE §4/§6).
2. **Modo de contar:** homens que atravessam — Kowalczyk conta em voz alta; a guerra mede-se por quem passou.
3. **Objeto:** o guarda-corpo (a mão de Hughes; a vibração após 15:40; o mesmo gesto de Jan em M01 sobre outra ponte, que Hughes não conhece).
4. **Silêncio:** o espanto de ver a ponte inteira (da encosta); os 2 s após 15:40 (a ponte ergue-se, assenta, e ninguém respira).
5. **Tarefa que não é matar:** reconhecer ameaças; cobrir a equipa de acesso; esperar a ordem; atravessar quando há passagem; não amontoar; estabelecer ligação; proteger o grupo seguinte; dar espaço aos suprimentos.
6. **Custo humano:** junto do acesso leste (a torre), um alemão idoso rende-se com as mãos erguidas sobre a zona onde o tabuleiro está danificado (causa: a cratera e as pranchas partidas tornam o lugar perigoso para todos) → Fisk quer "garantir" ("Põe-no de joelhos aqui. Não o largo até vir um oficial.") / Hanlon impede amontoar na zona danificada ("Não amontoem os homens aqui. Nem os deles. A estrutura não sabe de que lado estão.") → o jogador pode escoltar o rendido para fora do tabuleiro (interação: 20 m até à margem; `m25.player_escorted_pow`) ou calar-se → Ortega decide por Hanlon se ninguém o fizer em 10 s → `m25.pow_at_access_secured`; Fisk não se converte; disparar sobre o rendido: `m25.player_fired_on_pow`, silêncio da esquadra, fala 003 **omitida**, debrief regista; nunca termina a missão.
7. **Pessoas históricas:** Timmermann, Drabik, Hoge, Bratge, Scheller fora de cena (a ordem chega "do tenente" sem nome; o primeiro homem na margem leste é "outro" — Hughes não é o primeiro).
8. **Debrief:** regista a captura de 7/3 (ordem 15:30; detonação falhada ~15:40; primeiros homens na margem leste ~15:45), a travessia de tropas e veículos nos dias seguintes, os ataques alemães posteriores (artilharia, aviação, V-2) **datados** (8–16/3), o colapso de 17/3 com 28 engenheiros mortos; o rendido "entregue"; "a ponte ficou de pé dez dias; o que passou por ela já estava do outro lado".

**Três motivos.** (a) *O espanto* — a primeira imagem é um oficial que interrompe uma ordem habitual (PR #44); (b) *o guarda-corpo* — "A ponte está de pé. Mantenham o acesso aberto." (001): manter é o verbo; (c) *o espaço* — "Outro grupo está cruzando. Deixem espaço." (003): a vitória local é o trânsito dos outros.

**Temas.** Ordens que mudam diante de uma oportunidade real; o trabalho que não se sabe fazer (engenharia) visto com respeito; manter em vez de tomar; a estrutura que não sabe de que lado se está; dez dias de pé.

**Estrutura (§54).** CONTEXTO → INTRO (half-track; a encosta; a ponte inteira; a ordem muda) → APROXIMAÇÃO (ruas de Remagen; civis às janelas; fogo do lado leste) → DIÁLOGO (Ortega: "A ponte está de pé.") → PRIMEIRO CONTATO (reconhecer ameaças no acesso: MG nas torres leste; a cratera na rampa) → ESCALADA (cobrir a equipa que abre a rota; os engenheiros começam) → COMBATE PRINCIPAL (a espera; 15:40: a ponte ergue-se e assenta) → SET-PIECE (atravessar com a mão no guarda-corpo; cortar fios é deles) → PAUSA (margem leste: o rendido; Hanlon) → CLÍMAX (neutralizar as torres; ligação; o grupo seguinte; M26 à noite) → CONSEQUÊNCIA (suprimentos a cruzar) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Hughes | habituado a ordens de marcha; estranha a pausa | Ortega; Hanlon | o guarda-corpo; o rendido; o espaço | manter passagem também decide | olha os suprimentos; a mão no ferro |
| Ortega | "A ponte está de pé. Mantenham o acesso aberto." (001) | esquadra | o rendido | — | vivo |
| Hanlon | "Não amontoem os homens aqui." (002) | a estrutura | o acesso danificado | — | continua a trabalhar |
| Fisk | chefe de cobertura; quer "garantir" | Hughes | o rendido | baixa a arma; não muda | vivo |
| Brandt | equipa de acesso | Ortega | a cratera | — | ferido leve (fixo, 15:20) |
| Kowalczyk | conta | Hughes | 15:40 | pára de contar; recomeça | vivo |
| Hartmann (rendido) | idoso; mãos erguidas | ninguém | — | — | entregue |

**O que a missão recusa.** Puzzle de fios; a ponte a ruir em 7/3; bombardeamento em 7/3; Hughes como primeiro homem na margem leste; Timmermann/Drabik/Hoge em cena; entrar no túnel; Jan mencionado; Tczew; execução do rendido; tanques jogáveis; "destruir a ponte como espetáculo".

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "A ponte inteira" (`cs_m25_intro`, ≤ 80 s)
2 13:40 · 3 estrada na encosta acima de Remagen; half-tracks parados; a cidade abaixo, o Reno largo e cinzento, a ponte Ludendorff **inteira** com as quatro torres, a Erpeler Ley como paredão do outro lado, o túnel como boca negra · 4 tarde de março, céu encoberto, luz fria e plana (R) · 5 Hughes, Ortega, Fisk, Brandt, Kowalczyk; Reyes no half-track; um tenente (sem nome, de costas) com binóculos; Hanlon com um jipe de engenheiros atrás · 6 Cartela: REMAGEN — RENO — 7 DE MARÇO DE 1945 — 13:40 · COMPANHIA A · 27.º BATALHÃO DE INFANTARIA BLINDADA · 9.ª DIVISÃO BLINDADA. Hughes desce do half-track com a ordem habitual na cabeça (Ortega: "Cidade e depois sul. Como ontem."). O tenente baixa os binóculos e não diz nada por 3 s (**silêncio de espanto**). Ortega olha e também cala. A ponte inteira. O tenente: "Mudou. Cidade, e depois **aquilo**." Ortega: "A ponte está de pé. Mantenham o acesso aberto." (001). Hanlon, atrás: "Se está de pé é porque ainda não a deitaram abaixo. Ainda." · 7 estabelecer a inversão (manter, não tomar) e o espanto como silêncio · 8 olhar · 9 — · 10 — · 11 fogo esparso do lado leste (longe) · 12 half-tracks, binóculos, a ponte · 13 `dlg_m25_001` (canónica), `010–014` · 14 **vento sobre o Reno → espanto** (3 s sem fala); motores em ralenti · 15 plano geral da ponte (EXACT) a partir da encosta; o tenente de costas · 16 `missionStart` · 17 Ortega: "Cidade." · 18 — · 19 [A] cutscene; [C] half-tracks NPC · 20 nenhum eco verbal de M01 aqui

### Cena 2 — "Ruas até à margem" (jogável; `obj_m25_approach`)
2 13:50–15:00 (escala acelerada; `readyScale`) · 3 ruas de Remagen a descer para a margem: casas com lençóis brancos às janelas, uma praça, a rua que dá para a rampa de acesso; a rampa com uma **cratera** aberta pelos alemães (demolição parcial para travar veículos — D: cratera na rampa antes da detonação principal; hora exata P-C25); as torres oeste; a vista das torres leste · 4 encoberto; luz plana · 5 esquadra; outras esquadras da companhia por ruas paralelas (proxies); civis às janelas (lençóis; uma mulher fecha a portada); inimigos: fogo esparso de atiradores do lado leste (dados; 300–600 m), uma MG nas torres leste que bate a rampa por rajadas · 6 Acompanhar a aproximação à margem e reconhecer as ameaças que impedem chegar ao acesso: a MG das torres leste (identificável pelo impacto na rampa e pelo flash na seteira da torre), os atiradores da Erpeler Ley, a cratera (veículos não passam; homens sim, pela borda); Ortega manda Hughes e Fisk observar da esquina antes de a equipa de acesso avançar (interação: observar 10 s; relatar) · 7 §79 ponto 1 · 8 navega as ruas (civis: nunca alvo; disparar sobre janelas = aviso de Ortega); observa; relata · 9 praça (rápido; atirador) vs beco (lento; coberto) · 10 Ortega; Fisk; Brandt e Kowalczyk atrás; Hanlon com o jipe parado na praça · 11 atiradores (dados); MG das torres (agenda: rajadas de 6 s / pausas de 14 s) · 12 lençóis, a praça, a cratera, pranchas · 13 `dlg_m25_015–021` · 14 passos em pedra; lençóis ao vento; a MG a bater a rampa (longe → médio); o Reno · 15 livre · 16 start · 17 ameaças relatadas (`evt_m25_threats`) · 18 `cp_m25_a_acesso` · 19 [A] · 20 —

### Cena 3 — "A equipa abre a rota" (jogável; `obj_m25_cover_access`)
2 15:00–15:30 · 3 a rampa oeste com a cratera; as torres oeste (abrigo); a borda da cratera; os primeiros metros de tabuleiro · 4 encoberto · 5 esquadra; a equipa de acesso (Brandt + 3) a avançar pela borda; os engenheiros (Hanlon + 2) à espera atrás das torres oeste com alicates e cordas; inimigos: a MG das torres leste; morteiros do lado leste (≥ 30 m) · 6 Apoiar o grupo que abre a rota: Fisk chefia a cobertura (o jogador na torre oeste, janela do piso 1: suprime a seteira da torre leste nas rajadas da MG — 300 m; a BAR de outro homem bate a outra torre); a equipa passa a borda da cratera e estabelece-se no início do tabuleiro; **Brandt é ferido leve às 15:20** (fixo; estilhaço no ombro; fica na torre oeste); os engenheiros avançam para o tabuleiro **antes** da infantaria para localizar cargas e fios (Hanlon: "Nós primeiro. Vocês cobrem. Não toquem em nada que pareça um fio."); "o jogador vê outros soldados a assumir cobertura e funções específicas; não é o único homem capaz de atravessar" · 7 §79 ponto 2 · 8 suprime por janelas; muda de janela quando a MG o encontra (aviso: impactos na pedra); não toca em fios (não há interação: a proibição é de desenho) · 9 janela alta (vê a seteira; exposto ao morteiro) vs baixa (vê só a rampa) · 10 Fisk comanda a cobertura; Brandt ferido; Hanlon avança com a equipa; Kowalczyk começa a contar ("Quatro na ponte. Cinco.") · 11 MG das torres (agenda); morteiros · 12 a cratera, pranchas, fios visíveis ao longo do guarda-corpo (nunca interativos), as torres · 13 `dlg_m25_022–030` · 14 **passos metálicos** dos primeiros homens no tabuleiro; a MG; alicates (longe) · 15 livre · 16 CP-A · 17 ordem de atravessar às 15:30 (`evt_m25_order`) · 18 `cp_m25_b_antes_travessia`; `m25.brandt_wounded = true` (fixo) · 19 [A] supressão por janelas; [B] "cortar fios" abstrato: os engenheiros fazem-no como NPCs com agenda, sem minigame; a cutscene curta da cena 4 mostra o resultado · 20 —

### Cena 4 — "15:40" (`cs_m25_1540`, ≤ 40 s) — **set piece**
2 15:38–15:41 · 3 a rampa oeste; o tabuleiro com a equipa de acesso e os engenheiros a meio; Hughes na borda da cratera com a mão no guarda-corpo · 4 encoberto · 5 todos · 6 A ordem veio às 15:30; a esquadra avança para a borda. Às ~15:40, a detonação alemã: um estrondo, a ponte **ergue-se e assenta** (D), poeira e lascas, o guarda-corpo vibra na mão de Hughes (plano fixo na mão, 2 s, sem som além do metal — `planMetalStress` reutilizado de M01 com outra assinatura); **2 s de silêncio**; a ponte está de pé. Hanlon (ao longe, na ponte): "**Está de pé!** Cortem o que resta! Vão!" Kowalczyk recomeça a contar, errado ("Um. Um. Dois.") · 7 o silêncio da missão; a cronologia S-C21 · 8 skip (a mão é cutscene) · 9 — · 10 — · 11 — · 12 poeira, lascas, pranchas partidas · 13 `dlg_m25_031–033` · 14 **o estrondo → o metal → 2 s de nada → vozes** · 15 plano fixo na mão no guarda-corpo; plano geral da ponte a assentar (sem câmara lenta) · 16 15:40 · 17 Ortega: "Agora." · 18 `m25.detonation_seen = true` · 19 [A] `planMetalStress` (M01) como vibração sem colapso; partículas · 20 o gesto de Jan (M01) sem o nome

### Cena 5 — "Atravessar" (jogável; `obj_m25_cross`)
2 15:41–15:55 · 3 o tabuleiro (325 m): pranchas sobre a via férrea, troços com pranchas partidas (passagem pela viga lateral e pelo guarda-corpo), os engenheiros a cortar fios e a atirar cargas ao rio (NPC; o jogador passa por eles), fumo; as torres leste à frente com a MG a bater o tabuleiro por rajadas; atiradores da Erpeler Ley · 4 encoberto; poeira a assentar · 5 esquadra; engenheiros; outros homens a atravessar (proxies; **o primeiro na margem leste é um deles, não Hughes** — fixo às 15:45); inimigos: MG das torres leste (agenda), atiradores (dados), morteiros ≥ 30 m · 6 Cruzar sob risco coerente: avançar por saltos entre vigas; nos troços com pranchas partidas, a mão no guarda-corpo (interação de travessia lateral, lenta: 8 m); passar pelos engenheiros sem os empurrar (Hanlon: "Não amontoem os homens aqui." (002) — se ≥ 3 homens pararem junto dele, a fala dispara e um morteiro agendado cai ≥ 30 m); ver outro homem chegar primeiro à margem leste e desaparecer na torre; chegar · 7 §79 ponto 3 ("Tentativas de demolição e danos seguem a história pesquisada") · 8 avança por saltos; travessia lateral com a mão no ferro; não amontoa · 9 esperar a pausa da MG na viga (coberto, lento) vs correr o troço aberto (rápido, exposto) · 10 Ortega à frente; Fisk atrás a cobrir; Kowalczyk conta; Hanlon na ponte; outros atravessam · 11 MG (agenda); atiradores; morteiros · 12 fios cortados, cargas no rio (som), pranchas partidas · 13 `dlg_m25_002` (canónica), `034–040` · 14 **passos metálicos, disparos de acesso, o metal a vibrar sob os pés, a água abaixo** · 15 livre; a mão no guarda-corpo em plano próximo nas travessias laterais · 16 "Agora." · 17 Hughes na margem leste (`evt_m25_east_bank`) · 18 `cp_m25_c_margem_oposta`; `m25.crossed_count` (os que Kowalczyk contou até Hughes chegar) · 19 [A] ponte como estrutura (M01: vigas, guarda-corpo, pilares), supressão por janelas; [B] travessia lateral · 20 —

### Cena 6 — "A estrutura não sabe de que lado estão" (jogável; `obj_m25_pow`) — **custo humano**
2 15:55–16:05 · 3 o acesso leste: a base da torre leste norte; pranchas partidas e a zona onde o tabuleiro danificado range; um alemão idoso sentado contra a torre, capacete no chão, mãos erguidas; a MG da torre já calada por outro grupo (dados) · 4 encoberto · 5 Hughes, Ortega, Fisk, Kowalczyk; Hanlon a chegar com a equipa (vai verificar o pilar leste); o rendido (Hartmann); outros homens a chegar · 6 Fisk quer "garantir": "Põe-no de joelhos aqui. Não o largo até vir um oficial." Hanlon: "Não amontoem os homens aqui. Nem os deles. A estrutura não sabe de que lado estão." → o jogador escolta o rendido 20 m para a margem (interação: "comigo", mãos visíveis; `m25.player_escorted_pow`) / cala-se → Ortega: "Fisk. Margem. Com ele." se ninguém em 10 s → `m25.pow_at_access_secured = true`; o rendido diz o nome ("Hartmann. Volkssturm. Sechzig.") e fica sentado na margem sob guarda de Kowalczyk; se o jogador dispara sobre ele: `m25.player_fired_on_pow`, a esquadra deixa de falar com Hughes, 003 omitida, debrief; nunca termina a missão · 7 custo humano com contexto · 8 escolta / cala-se / (dispara: custo) · 9 escoltar / calar-se · 10 Fisk; Hanlon; Ortega; Kowalczyk guarda · 11 atiradores esparsos (dados) · 12 o capacete no chão; as pranchas a ranger · 13 `dlg_m25_041–047` · 14 o tabuleiro a ranger; a água; **silêncio** antes da fala de Fisk (2 s) · 15 livre; beat fixo no rendido (2 s) · 16 east bank · 17 rendido na margem (`evt_m25_pow_secured`) · 18 `m25.pow_at_access_secured`; `m25.fisk_deescalated`; `m25.player_escorted_pow`; `m25.player_fired_on_pow` · 19 [C] `SURRENDERED` (M19); fallback encenado · 20 lido no debrief

### Cena 7 — "Ligação entre margens" (jogável; clímax; `obj_m25_towers`, `obj_m25_link`, `obj_m25_next_group`)
2 16:05–17:00 (escala acelerada) · 3 a margem leste: as duas torres leste (a sul ainda com atiradores), a estrada da margem, a boca do túnel de Erpeler Ley a 150 m (fogo esparso de lá; **nunca** entrado), o paredão da Erpeler Ley acima; o tabuleiro atrás com engenheiros a pôr pranchas; a rampa oeste com veículos à espera · 4 fim de tarde encoberto; a luz cai depois das 17:30 (cartela) · 5 esquadra; outros grupos (proxies, 30) a consolidar; engenheiros; o grupo seguinte a atravessar (proxies, 15); half-tracks e, à noite (cartela), M26 Pershing do 14.º Tank Bn (NPC); inimigos: atiradores na torre sul e no paredão (dados), fogo esparso do túnel (dados; nunca ataque em massa), artilharia alemã ocasional ≥ 30 m (datada: 7/3 à tarde houve fogo esparso; nenhum bombardeamento aéreo) · 6 Neutralizar a ameaça local do outro acesso (a torre sul: subir pela escada da torre com Fisk, limpar dois pisos — 2–3 atiradores que se rendem ou recuam pela porta de trás) e estabelecer ligação entre margens (Ortega manda Hughes voltar ao tabuleiro com Kowalczyk para marcar a passagem segura para o grupo seguinte — pranchas verdes/vermelhas de Hanlon: a marcação é dos engenheiros, Hughes **transmite**); proteger a passagem do grupo seguinte (a esquadra cobre a margem; a MG do túnel por agenda; o jogador posiciona Fisk e a BAR); Hughes: "Outro grupo está cruzando. Deixem espaço." (003) ao ver o tabuleiro cheio; à noite (cartela 17:30 → 22:00) os primeiros veículos passam · 7 §79 pontos 4–5 ("Engenharia e tropas subsequentes começam suas tarefas independentemente de Hughes") · 8 sobe a torre; dispara (10–40 m); transmite a marcação; posiciona; cobre; dá espaço (afastar-se do tabuleiro: interação de "recuar para a margem" quando o grupo chega) · 9 limpar a torre pela escada (coberto, lento) vs pela porta (rápido, exposto) · 10 Fisk; Ortega; Hanlon marca pranchas; Kowalczyk conta o grupo seguinte; o grupo seguinte com agenda própria · 11 atiradores; fogo do túnel por agenda; artilharia esparsa ≥ 30 m · 12 pranchas marcadas, cordas, half-tracks, a boca do túnel · 13 `dlg_m25_003` (canónica), `048–057` · 14 **maquinaria de engenharia** (serras, martelos, pranchas), motores na rampa, a MG do túnel, o Reno · 15 livre · 16 pow secured · 17 grupo seguinte na margem leste + torre sul calada (`evt_m25_consolidated`) · 18 `cp_m25_d_consolidacao`; `m25.towers_cleared`; `m25.link_established`; `m25.next_group_through` · 19 [A]; [C] veículos NPC a cruzar por agenda (half-tracks à tarde; M26 só na cartela noturna) · 20 —

### Cena 8 — "Suprimentos" (`cs_m25_outro`, ≤ 60 s) + debrief
2 22:00 (cartela) · 3 a margem leste à noite; faróis tapados; jipes com reboques, half-tracks, um M26 a atravessar devagar sobre pranchas novas (NPC; som de metal sob peso); engenheiros ainda a trabalhar à luz de lanternas · 4 noite encoberta; lanternas · 5 Hughes, Ortega, Fisk, Kowalczyk, Hanlon; o rendido já levado · 6 Homens observam os suprimentos a cruzar. Kowalczyk: "Perdi a conta às quatro." Ortega: "Não perdeste. Mudou de unidade." Hughes põe a mão no guarda-corpo da margem (vibra com o M26). Hanlon passa com uma prancha: "Amanhã outra vez. E depois de amanhã." Hughes percebe quanto trabalho ainda depende daquela estrutura danificada. Cartela: a ponte Ludendorff foi capturada a 7/3/1945; tropas e veículos cruzaram nos dias seguintes; foi atacada por artilharia, aviação e V-2 entre 8 e 16/3; colapsou a 17/3 com 28 engenheiros mortos; nessa altura havia já pontes flutuantes ao lado. Cartela 2: "Hartmann, Volkssturm: entregue às 16:00." · 7 §79 final ("O debrief informa o colapso posterior em 17/3, sem fazê-la ruir durante a captura") · 8 skip · 9 — · 10 — · 11 — · 12 faróis tapados; pranchas novas; a mão no ferro · 13 `dlg_m25_058–060` · 14 **suprimentos a cruzar** (metal sob peso; motores baixos; serras) — nenhuma música · 15 plano fixo na mão; plano geral da ponte à noite com faróis · 16 consolidated · 17 `missionEnd` · 18 `m25.completed` · 19 [C] M26 NPC em cutscene · 20 M26 (Hagushi) abre no Pacífico; o motivo VI começa lá

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m25_approach` | Desça à margem e reconheça as ameaças ao acesso | sim | intro | `evt_m25_threats` | — | — | A |
| `obj_m25_cover_access` | Cubra a equipa que abre a rota; não toque em fios | sim | A | ordem 15:30 | — | `brandt_wounded` (fixo) | B |
| `obj_m25_cross` | Atravesse; não amontoe junto dos engenheiros | sim | 15:40 | margem leste | — | `crossed_count` | C |
| `obj_m25_pow` | O rendido do acesso: tire-o da zona danificada | sim (cena) | east bank | margem | — | `pow_at_access_secured`; `fisk_deescalated`; `player_escorted_pow`; `player_fired_on_pow` | — |
| `obj_m25_towers` | Neutralize a torre sul | sim | pow | 2 pisos | — | `towers_cleared` | — |
| `obj_m25_link` | Transmita a marcação das pranchas; estabeleça ligação | sim | towers | marcação transmitida | — | `link_established` | — |
| `obj_m25_next_group` | Proteja a passagem do grupo seguinte; dê espaço | sim | link | grupo na margem | — | `next_group_through` | D |

### 3.2 Setores
`s1_hillside` (perto, intro) · `s2_town` (perto) · `s3_west_ramp` (perto: cratera, torres oeste) · `s4_bridge_deck` (perto: 325 m) · `s5_east_access` (perto: torres leste, margem, boca do túnel) · `s6_mid` (médio: combates na outra margem, fluxo de tropas e veículos, engenheiros) · `s7_far` (longe: baterias alemãs, retirada por vias distintas, o Reno a montante/jusante). Agendas: MG das torres leste rajadas 6 s/pausas 14 s; morteiros a cada 50 s (≥ 30 m); Brandt 15:20 (fixo); ordem 15:30; detonação 15:40; primeiro homem na margem leste 15:45 (NPC); MG da torre calada por outro grupo 15:50; fogo do túnel por rajadas a cada 40 s; grupo seguinte 16:30; half-tracks 16:45; M26 só na cartela 22:00.

### 3.3 Checkpoints
A acesso (ameaças relatadas) · B antes da travessia (ordem; Brandt ferido; engenheiros na ponte) · C margem oposta (`crossed_count`) · D consolidação. Restauram a ponte (pranchas partidas, fios cortados), danos, travessias (quem já passou) e eventos (15:40 nunca se repete após C).

### 3.4 Justiça
MG das torres com janelas legíveis; morteiros/artilharia com assobio e ≥ 30 m; a detonação de 15:40 nunca fere o jogador (cutscene); as pranchas partidas têm sempre viga lateral com guarda-corpo; fios nunca interativos (nenhuma "falha" possível); o rendido nunca reage; o túnel nunca ataca em massa; o jogador nunca é o primeiro na margem leste (fixo, não falha).

---

## 4. Set pieces

### SP-25-1 "A equipa abre a rota"
Contexto: a rampa com a cratera. Preparação: ameaças relatadas da esquina. Experiência: suprimir por janelas da torre oeste; a equipa pela borda; Brandt ferido; os engenheiros avançam primeiro. Companheiros: Fisk comanda; Hanlon "nós primeiro"; Kowalczyk conta. Ambiente: fios ao longo do guarda-corpo (nunca tocados). Evolução: a MG encontra a janela. Clímax: a ordem 15:30. Consequências: CP-B. Requisitos: [A] supressão por janelas; [B] engenheiros NPC com agenda. Integração: `obj_m25_cover_access`.

### SP-25-2 "15:40"
Contexto: a borda da cratera. Preparação: a ordem; a mão no guarda-corpo. Experiência: o estrondo; a ponte ergue-se e assenta; o metal na mão; 2 s de nada; "Está de pé!"; atravessar por vigas e pranchas partidas; passar pelos engenheiros sem amontoar; outro homem chega primeiro. Companheiros: Ortega à frente; Fisk atrás; Hanlon na ponte; Kowalczyk recomeça a contar. Ambiente: cargas atiradas ao rio. Evolução: MG por janelas até à margem. Clímax: fala 002. Consequências: CP-C, `crossed_count`. Requisitos: [A] `planMetalStress` (M01) como vibração; ponte como estrutura. Integração: `cs_m25_1540`, `obj_m25_cross`.

### SP-25-3 "A estrutura não sabe de que lado estão"
Contexto: o acesso leste danificado. Preparação: Fisk a cobrir durante três horas; o tabuleiro a ranger. Experiência: o rendido idoso; Fisk; Hanlon; escoltar 20 m. Companheiros: Ortega decide se ninguém o faz; Kowalczyk guarda. Ambiente: o capacete no chão. Evolução: o nome dito. Clímax: "Nem os deles." Consequências: `pow_at_access_secured`. Requisitos: [C] `SURRENDERED`; fallback. Integração: `obj_m25_pow`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| encosta | half-tracks, binóculos, a ponte inteira | — | espanto | — | o tenente de costas | — |
| cidade | lençóis às janelas, praça, portadas | esquadras paralelas | atiradores | esparsos | civis às janelas | — |
| rampa oeste | cratera, pranchas, torres, fios ao longo do ferro | equipa pela borda; engenheiros | MG das torres | supressão | Brandt ferido | — |
| tabuleiro | pranchas partidas, vigas, cargas no rio | atravessar | 15:40 | MG; atiradores | engenheiros; o primeiro homem | poeira; fios cortados |
| acesso leste | capacete no chão, tabuleiro a ranger | escolta | Fisk | esparsos | Hartmann | rendido na margem |
| margem leste | torres, estrada, boca do túnel, cordas | torre sul; marcação | túnel | atiradores | grupo seguinte | pranchas marcadas |
| noite | faróis tapados, pranchas novas, M26 | suprimentos | — | — | engenheiros | a mão no ferro |

Objetos com origem: a cratera (demolição parcial alemã da rampa, antes de 15:40), os fios ao longo do guarda-corpo (cargas alemãs: ~2 000 kg no pilar oeste e 2×300 kg — S-C21), as pranchas (postas pelos alemães para trânsito rodoviário; as novas pelos engenheiros à noite), o capacete de Hartmann (Volkssturm, M42 com camuflagem a tinta), os lençóis (rendição civil de Remagen).

---

## 6. Diálogos (VO inglês; alemão para o rendido, sem tradução)

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Ortega | "A ponte está de pé. Mantenham o acesso aberto." (§79) | intro t 40 | 1 | — |
| 002 | Hanlon | "Não amontoem os homens aqui." (§79; repetida no acesso leste com "Nem os deles.") | ≥ 3 parados junto dele | 0 | 20 |
| 003 | Hughes | "Outro grupo está cruzando. Deixem espaço." (§79; **omitida** se `player_fired_on_pow`) | tabuleiro cheio | 1 | — |
| 010 | Ortega | "Cidade e depois sul. Como ontem." (V1) | intro t 5 | 1 | — |
| 011 | tenente (de costas) | (3 s de silêncio) "Mudou. Cidade, e depois **aquilo**." (V1) | intro t 25 | 1 | — |
| 012 | Hanlon | "Se está de pé é porque ainda não a deitaram abaixo. Ainda." (V1) | intro t 50 | 2 | — |
| 013 | Kowalczyk | "É grande. Pensava que o Reno era mais pequeno." (V1) | intro t 60 | 3 | — |
| 014 | Fisk | "Não é o Reno que me preocupa. São as torres." (V1) | 013 | 2 | — |
| 015 | Ortega | "Lençóis nas janelas. Não disparem para as janelas." (V1) | cidade | 1 | — |
| 016 | Ortega | "Hughes! Janelas **não**." (V1; se dispara sobre uma) | — | 0 | — |
| 017 | Fisk | "Atirador do outro lado. Longe. Não vale a pena responder." (V1) | atirador | 2 | — |
| 018 | Ortega | "Esquina. Hughes, Fisk: dez segundos a olhar. Depois contam-me." (V1) | observar | 1 | — |
| 019 | Hughes | "MG na torre leste norte, seteira do primeiro piso. Bate a rampa em rajadas de seis. Há uma cratera na rampa; homens passam pela borda." (V1; relatar) | relato | 1 | — |
| 020 | Ortega | "Então a equipa vai pela borda e nós pela torre. Hanlon?" (V1) | 019 | 1 | — |
| 021 | Hanlon | "Nós primeiro. Vocês cobrem. Não toquem em nada que pareça um fio." (V1) | 020 | 1 | — |
| 022 | Fisk | "Cobertura! Torre oeste, piso um. Hughes na janela alta." (V1) | cobertura | 1 | — |
| 023 | Fisk | "Rajada… pausa. **Agora.** Bate a seteira." (V1) | janela | 0 | — |
| 024 | Brandt | "Borda da cratera. Passa-se. Um de cada vez." (V1) | equipa | 1 | — |
| 025 | Fisk | "Encontraram-te. Muda de janela." (V1) | impactos | 0 | — |
| 026 | Brandt | "…ombro. Não é nada. Fico na torre." (V1) | 15:20 | 1 | — |
| 027 | Kowalczyk | "Quatro na ponte. Cinco. Os engenheiros, seis." (V1) | conta | 2 | 15 |
| 028 | Hanlon (ao longe) | "Fios ao longo do ferro. Cortem o que virem. Cargas ao rio." (V1) | engenheiros | 1 | — |
| 029 | Ortega | "Ordem. Atravessar. Quando eu disser." (V1) | 15:30 | 0 | — |
| 030 | Fisk | "Hughes, mão no ferro. Se ela mexer, é o ferro que te segura." (V1) | borda | 1 | — |
| 031 | — | (o estrondo; o metal; 2 s) | 15:40 | — | — |
| 032 | Hanlon (ao longe) | "**Está de pé!** Cortem o que resta! Vão!" (V1) | +2 s | 0 | — |
| 033 | Kowalczyk | "Um. Um. Dois." (V1; recomeça errado) | +4 s | 2 | — |
| 034 | Ortega | "Agora." (V1) | — | 0 | — |
| 035 | Ortega | "Vigas! Pranchas partidas: pela lateral, mão no ferro!" (V1) | travessia | 1 | — |
| 036 | Hanlon | (002) | amontoar | 0 | 20 |
| 037 | Fisk | "MG na pausa! Troço aberto, **vão**!" (V1) | pausa | 0 | — |
| 038 | outro homem (proxy) | "Margem! Estou na margem!" (V1; 15:45) | primeiro | 1 | — |
| 039 | Kowalczyk | "Esse não é nosso. Sete. Oito." (V1) | 038 | 2 | — |
| 040 | Ortega | "Torre. Base. Abriguem-se." (V1) | east bank | 1 | — |
| 041 | Hartmann (alemão) | "Nicht schießen… alt… Volkssturm…" | rendido | 1 | — |
| 042 | Fisk | "Põe-no de joelhos aqui. Não o largo até vir um oficial." (V1) | +2 s | 1 | — |
| 043 | Hanlon | "Não amontoem os homens aqui. Nem os deles. A estrutura não sabe de que lado estão." (V1) | 042 | 0 | — |
| 044 | Hughes | "Comigo. Mãos onde eu as veja. Vinte metros." (V1; se escolta) | interação | 0 | — |
| 045 | Ortega | "Fisk. Margem. Com ele." (V1; se ninguém em 10 s) | — | 0 | — |
| 046 | Hartmann (alemão) | "Hartmann. Volkssturm. Sechzig." | margem | 1 | — |
| 047 | Kowalczyk | "Fico com ele. Não conto. Ele já passou." (V1) | guarda | 2 | — |
| 048 | Ortega | "Torre sul ainda dispara. Fisk, Hughes: escada." (V1) | torre | 1 | — |
| 049 | Fisk | "Piso um limpo. Dois recuaram pela porta. Não os cacem." (V1) | torre | 1 | — |
| 050 | Hanlon | "Pranchas verdes aguentam. Vermelhas não. Alguém diz isto aos de trás." (V1) | marcação | 1 | — |
| 051 | Ortega | "Hughes, Kowalczyk. Ao tabuleiro. Transmitam. Não marquem: é deles." (V1) | 050 | 1 | — |
| 052 | Hughes | "Verdes aguentam, vermelhas não! Passem a palavra!" (V1; transmitir) | tabuleiro | 1 | — |
| 053 | Fisk | "Túnel dispara às vezes. Não é ataque. É alguém com medo." (V1) | túnel | 2 | — |
| 054 | Ortega | "Grupo seguinte na ponte. Posições na margem. BAR para o túnel." (V1) | 16:30 | 1 | — |
| 055 | Hughes | (003) | tabuleiro cheio | 1 | — |
| 056 | Kowalczyk | "Vinte e dois. Vinte e três. Um half-track." (V1) | 16:45 | 2 | — |
| 057 | Ortega | "Ligados. As duas margens são nossas até alguém dizer o contrário." (V1) | consolidated | 1 | — |
| 058 | Kowalczyk | "Perdi a conta às quatro." / Ortega: "Não perdeste. Mudou de unidade." (V1) | noite | 2 | — |
| 059 | Hanlon | "Amanhã outra vez. E depois de amanhã." (V1) | prancha | 1 | — |
| 060 | Ortega | "Os polacos rebentaram as deles em 39 para os travar. Estes não conseguiram rebentar a deles. É o que há." (V1; eco temático sem Jan nem Tczew) | noite | 2 | — |

Callouts: `co_m25_mg_tower_pause`, `co_m25_mortar_whistle`, `co_m25_detonation`, `co_m25_tunnel_fire`, `co_m25_next_group`. Silêncios: o espanto (3 s); os 2 s após 15:40; antes de Fisk (2 s).

---

## 7. Arte e atmosfera

**Paleta:** cinzento do Reno em março, aço escuro da ponte, pedra escura das torres (basalto), branco de lençóis, verde-oliva de M1943 e half-tracks, castanho de pranchas, preto da boca do túnel, amarelo baixo de faróis tapados. **Luz:** 13:40 encoberto e plano (zénite `#8a9099`, horizonte `#c2c4c0`); 15:40 a mesma luz com poeira; 17:00 a cair; 22:00 noite com lanternas e faróis tapados. **Materiais:** aço rebitado, pranchas (sãs/partidas), basalto, lençol, lona de half-track, água larga e rápida. **Silhuetas:** a ponte inteira com quatro torres (EXACT), a Erpeler Ley, o túnel, a cratera, um M26 sobre pranchas. **Destruição:** persistente (cratera, pranchas partidas, fios cortados, poeira de 15:40 assentada após C). **Humanos:** 9.ª Blindada com M1943 e capacetes com rede, engenheiros com alicates/cordas, Hartmann idoso com braçadeira; civis às janelas. **Violência reduzida:** Brandt com o ombro coberto; nenhum plano no rio após as cargas.

**Imagem única:** a ponte inteira vista do acesso; depois, a mão no guarda-corpo a vibrar (ART §4, EXACT para a ponte).

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| encosta | motores em ralenti, binóculos | — | esparsos do lado leste | **espanto** (3 s) |
| cidade | passos em pedra, lençóis | esquadras paralelas | MG das torres a bater a rampa | — |
| rampa | supressão por janelas, impactos na pedra | equipa na borda; alicates | morteiros | — |
| 15:40 | **estrondo → metal (`planMetalStress`) → 2 s** | — | — | **obrigatório** (2 s) |
| tabuleiro | **passos metálicos**, o metal sob os pés, MG por janelas, água abaixo | engenheiros; cargas ao rio | — | — |
| acesso leste | o tabuleiro a ranger, respiração | esparsos | — | antes de Fisk (2 s) |
| margem leste | escada da torre, cordas, serras, martelos | túnel por rajadas; grupo seguinte | baterias; o Reno | — |
| noite | **suprimentos a cruzar**: metal sob peso, motores baixos, serras | — | — | — (sem música) |

Sons novos: ponte de aço com pranchas (reutiliza `planMetalStress` de M01 com assinatura de vibração sem colapso), Reno largo, M26 Pershing (NPC), serras/martelos de engenharia. Música: nenhuma em 7/3 (a maquinaria é a música); o motivo VI começa em M26. VO inglês, alemão.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| CCB da 9.ª Blindada em Remagen a 7/3; avanço 13:40; Cia. A (Timmermann) na ponte 15:15–15:30; ordem 15:30 | D (resumo) | H25; S-C21 | — |
| Detonação ~15:40: a ponte ergue-se e assenta; cargas ~2 000 kg no pilar oeste e 2×300 kg | D (resumo) | S-C21 | — |
| Cratera aberta na rampa oeste antes da detonação principal | D (geral) | H25 | hora exata (**P-C25**) |
| Primeiros homens na margem leste ~15:45 (Drabik) — Hughes não é o primeiro | D | S-C21 | — |
| Túnel de Erpeler Ley com soldados e civis; rendição à noite | D (resumo) | S-C21 | P-C25 (fogo do túnel; nunca entrado) |
| Engenheiros (9.º Btl. Eng. Blindado) cortam fios e atiram cargas ao rio | D (geral) | H25 | nomes reais (Mott/Dorland/Reynolds) **fora de cena** |
| Veículos (M26 do 14.º Tank Bn) a cruzar na noite de 7/8 após reparação da rampa | D (geral) | H25 | hora da primeira travessia blindada |
| Ataques posteriores datados (8–16/3); colapso 17/3 com 28 engenheiros mortos | D | S-C21 | — |
| Volkssturm no acesso leste; "Hartmann" | R/F | — | — |
| Ortega, Hanlon, Fisk, Brandt, Kowalczyk, Reyes | F | — | acrescentar Brandt/Kowalczyk/Reyes a CONTINUITY §4 |
| Equipamento: M1, BAR, M3 half-track, jipe, M26; alemão: MG 42 nas torres, Kar98k, Panzerfaust (não usado contra o jogador) | D | TIMELINE §3 | auditoria |

**Proibições:** puzzle de fios; colapso em 7/3; bombardeamento em 7/3; Hughes como primeiro; Timmermann/Drabik/Hoge/Bratge/Scheller em cena; entrar no túnel; Jan/Tczew nomeados; execução do rendido. **Fora de cena:** todos os acima; o interior do túnel.

---

## 10. Handoff técnico

**Contrato:** `id m25_remagen`, `order 25`, relógio 13:40→17:00 com `readyScale` na cidade e na consolidação + cartela 22:00, `cast` (Hughes, Ortega, Hanlon + 2 engenheiros, Fisk, Brandt, Kowalczyk, Reyes, tenente [de costas, sem nome], Hartmann, civis, primeiro homem [proxy]), grupos (`grp_squad`, `grp_access_team`, `grp_engineers`, `grp_company_parallel`, `grp_first_man`, `grp_next_group`, `grp_vehicles_rampa`, `grp_de_towers_mg`, `grp_de_snipers_ley`, `grp_de_tower_south`, `grp_de_tunnel_fire`, `grp_pow`, `grp_civilians`), setores s1–s7, checkpoints A–D, cutscenes (intro, 1540, outro), falas, flags, debrief datado.

**Flags:** `m25.completed`, `m25.brandt_wounded` (fixo), `m25.detonation_seen` (fixo), `m25.crossed_count`, `m25.pow_at_access_secured`, `m25.fisk_deescalated`, `m25.player_escorted_pow`, `m25.player_fired_on_pow`, `m25.towers_cleared`, `m25.link_established`, `m25.next_group_through`.

**Sistemas:** [A] a ponte como estrutura jogável (vigas, guarda-corpo, pilares, `planMetalStress` como vibração de 15:40 sem colapso — reutilização direta de M01), supressão por janelas, fogo como dados, rotação, posicionar; [B] travessia lateral com a mão no ferro (variante de M01), observar/relatar, transmitir marcação, "cortar fios" como agenda de NPCs; [C] veículos NPC a cruzar (half-tracks à tarde; M26 na cartela), `SURRENDERED` (M19). **Fallbacks honestos:** sem veículos animados → som + cartela; sem `SURRENDERED` → cena encenada (Ortega decide; o jogador só anda ao lado).

**Disciplinas:** Level: encosta com vista (EXACT), 400 m de cidade, rampa com cratera e torres oeste, tabuleiro de 325 m com troços partidos, acesso leste com duas torres (uma com escada jogável), margem com boca de túnel a 150 m; Combate/IA: MG por janelas, atiradores, torre sul com recuo, túnel por rajadas; Arte: ponte Ludendorff EXACT (fotos/planos), basalto, Reno, lençóis; Personagens: 9.ª Blindada, engenheiros, Volkssturm idoso, civis; Animação: binóculos baixados, mão no guarda-corpo (vibração), travessia lateral, cortar fios/atirar cargas (NPC), escolta, transmitir, marcar pranchas; Som: `planMetalStress` reassinado, Reno, M26; VO: inglês/alemão; Historiador: P-C25 (posição da Cia. A, cratera, túnel, primeira travessia blindada); QA: 15:40 nunca se repete após CP-C; fios nunca interativos; o jogador nunca é o primeiro na margem leste; nenhum bombardeamento em 7/3; o colapso não existe no mundo.

**Testes:** `detonation_seen` true em qualquer ramo e a estrutura íntegra após; `crossed_count ≥ 1` antes de Hughes (o primeiro homem é NPC); `pow_at_access_secured` true salvo disparo; fala 003 omitida se `player_fired_on_pow`; a torre sul nunca reativa após `towers_cleared`; o túnel nunca gera mais de 2 atores ativos; civis nunca alvo (disparo sobre janela → aviso, nunca morte civil).

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| A ponte inteira; a ordem muda | (intro) | olhar | tenente cala; Ortega 001; Hanlon "ainda" | — | start | — |
| Ruas até à margem; as ameaças | `obj_m25_approach` | navegar; observar 10 s; relatar | esquadras paralelas; civis | — | intro | CP-A |
| A equipa abre a rota | `obj_m25_cover_access` | suprimir por janelas; mudar de janela | Brandt ferido (fixo); Hanlon "nós primeiro"; Kowalczyk conta | — | A | CP-B |
| 15:40 | (cutscene) | skip | Hanlon "Está de pé!"; Kowalczyk recomeça | poeira; pranchas partidas | 15:40 | `detonation_seen` |
| Atravessar | `obj_m25_cross` | saltos; mão no ferro; não amontoar | engenheiros cortam; outro chega primeiro | fios cortados; cargas no rio | "Agora." | CP-C; `crossed_count` |
| A estrutura não sabe de que lado estão | `obj_m25_pow` | escoltar / calar-se | Fisk; Hanlon; Ortega decide; Kowalczyk guarda | rendido na margem | east bank | `pow_at_access_secured` |
| Torre sul; a marcação; o grupo seguinte | `obj_m25_towers` / `link` / `next_group` | escada; transmitir; posicionar; dar espaço | Fisk; Hanlon marca; grupo seguinte; túnel | pranchas marcadas | pow | CP-D; `next_group_through` |
| Suprimentos | (outro) | skip | Kowalczyk; Hanlon com prancha; Ortega eco temático | M26 sobre pranchas | consolidated | `m25.completed` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 9 | manter em vez de tomar; o espelho de M01 por função; "a estrutura não sabe de que lado estão". |
| 2 | Autenticidade | 9 | S-C21 preciso (13:40/15:30/15:40/15:45); ponte EXACT; nenhum colapso antecipado; nomes reais fora de cena. |
| 3 | Personagens | 8 | Hanlon e Ortega em duas falas cada; Kowalczyk pela contagem; Fisk com impulso sem redenção. |
| 4 | Diálogos | 9 | "Se está de pé é porque ainda não a deitaram abaixo. Ainda." / "Não perdeste. Mudou de unidade." |
| 5 | Originalidade | 9 | o espanto como primeira batida; "cortar fios" como trabalho dos outros; o jogador não é o primeiro. |
| 6 | Variedade | 8 | observar/relatar, suprimir por janelas, atravessar lateral, não amontoar, escoltar, escada da torre, transmitir, posicionar, dar espaço. |
| 7 | Set pieces | 9 | 15:40 é o set piece mais curto da campanha e um dos mais fortes. |
| 8 | Atmosfera | 8 | março encoberto; o Reno; faróis tapados. |
| 9 | Environmental storytelling | 8 | cratera, fios, pranchas verdes/vermelhas, lençóis. |
| 10 | Cinematográfica | 9 | a mão no guarda-corpo em dois momentos; a ponte a assentar sem câmara lenta. |
| 11 | Sonora | 9 | `planMetalStress` reassinado; passos metálicos; maquinaria como música. |
| 12 | Impacto emocional | 8 | quieto por desenho: o impacto é o trabalho que falta. |
| 13 | Ritmo | 8 | 20–27 min; `readyScale` na cidade e na consolidação. |
| 14 | Continuidade | 9 | espelho de M01 sem Jan nem Tczew (uma fala de Ortega, factual); fecha Hughes. |
| 15 | Integração técnica | 8 | a ponte reutiliza M01 (estrutura, `planMetalStress`); veículos NPC e `SURRENDERED` com fallbacks. |

**Correções aplicadas:** (1) o primeiro homem na margem leste é um NPC às 15:45 (Drabik fora de cena, sem nome), nunca Hughes; (2) os fios não são interativos em nenhum ramo — os engenheiros cortam-nos por agenda; (3) nenhum ataque aéreo ou V-2 em 7/3: todos datados no debrief (8–16/3); (4) o eco de M01 é uma fala factual de Ortega sobre 1939 sem Jan nem Tczew; (5) civis nunca são alvo (aviso, nunca morte civil); (6) o túnel nunca é entrado nem ataca em massa; (7) Brandt, Kowalczyk e Reyes são propostas deste dossiê a acrescentar a CONTINUITY §4.
