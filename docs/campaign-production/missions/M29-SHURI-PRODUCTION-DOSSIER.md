# M29 — SHURI · Dossiê de produção criativa

**Estado:** PLANEJADA. **Canónico (§79):** 28–29/5/1945, Wana/Shuri, Okinawa; 5.º Marines, 1.ª Divisão; POV Samuel Brooks; fonte H28; 24–32 min; três falas; checkpoints "reconhecimento; passagem; evacuação; 29/5; consolidação — salvar estado de Cole, limites de setor e retirada inimiga"; Brooks já não tem a postura de Guadalcanal; Gray verifica feridos; Cole fala pouco e precisa de ser ouvido de perto; Cole sofre ferimento grave em ataque **sinalizado**; abrir um corredor para Gray e carregadores remove-o; "Cole permanece evacuado e incapacitado, sem reaparecer ativo"; a fala de Cole acontece antes; "não oferecer escolha falsa de ressuscitar"; 29/5: informações indicam retirada japonesa do sistema de Shuri; clímax: reconhecer o castelo já abandonado, interromper avanço em área de fogo amigo/limites de setor quando avisado; "não inventar fortaleza lotada ou chefe final"; final: Gray trabalha sem pausa; Marsh tenta limpar lama de uma carta sem conseguir. **Proposto:** Brooks no 1/5 (R), a esquadra chega às ruínas **depois** de A/1/5 (S-C08: A/1/5 chega ~10:15 com pouca oposição; o castelo na zona da 77.ª; bombardeamento cancelado por rádio — P-C29), as macas que passam por Gray como contagem, a carta enlameada de Marsh como objeto, as ruínas como silêncio, Cole ferido → Tully quer perseguir / Brooks: "ninguém leva o Cole" → `m29.cole_status = wounded_evacuated` (fixo), `m29.tully_restrained`, Ruiz/Prado e Tully por `m08.*`/`m26.*`. **Sistemas:** [C] chuva contínua e lama como modificadores (reutiliza M21/M27), limite de setor como zona com aviso (fogo amigo por agenda cancelado por rádio); [A] tudo o resto; [D] leitura de `m08.*`, `m26.*`.

---

## 0. Ficha e preservação

| Campo | Valor |
| --- | --- |
| id / ordem | `m29_shuri` / 29 |
| Datas | Ato I 1945-05-28T07:00+09:00 → 17:00 · Ato II 1945-05-29T07:30+09:00 → 13:00 (hora local) |
| Local | posições na saída do Wana Draw (buracos cheios de água; lona esticada; o posto de Gray) → a garganta de Wana e a crista (relevo real; trilhos de lama; cavernas batidas) → o planalto de Shuri com a cidade arrasada → as ruínas do castelo de Shuri (muros de pedra, as escadas, o portão; o castelo na zona da 77.ª Divisão) — `RECONSTRUCTED` (P-C29: companhia; rota Wana → Shuri; limite de setor com a 77.ª) |
| Operação | a 1.ª Div. Marines em Wana desde 15/5; mais de 15 polegadas de chuva em 17 dias desde 7/5; a 32.ª Armada japonesa retira do sistema de Shuri para sul entre 22 e 29/5 sob a chuva, deixando retaguardas; a 29/5 de manhã, A/1/5 chega às ruínas do castelo ~10:15 com pouca oposição; o castelo estava na zona da 77.ª Div. (Exército); o bombardeamento planeado da 77.ª foi cancelado por rádio; Okinawa continua até 22/6 (S-C08 — DOCUMENTED em resumo) |
| Unidade | 5.º Marines, 1.ª Divisão (canónico) → 1.º Btl. (R) → esquadra de Brooks (numa companhia que **segue** A/1/5 — P-C29) |
| Elenco | cabo Samuel Brooks (POV), sgt. Henry Cole (§73; ferido 28/5 — fixo), cabo Elliot Marsh (§73; a carta), Nelson Gray, pharmacist's mate (§73), cabo Danny Ruiz **ou** cabo Vic Prado (por `m08.ruiz_status`), pte. Eugene "Gene" Tully (de M26), pfc. Walt Jessup (BAR), dois carregadores do batalhão (sem nome: "os carregadores"), um operador de rádio da companhia (cpl. Hank Dorsey — proposta), o tenente de pelotão por voz (ten. Royce — proposta), uma retaguarda japonesa (dados), civis okinawanos **só por relato e debrief** (o sofrimento civil no sul) (propostas) |
| Fora de cena | del Valle; gen. Andrew Bruce (77.ª); cap. Julian Dusenbury e A/1/5 (chegam primeiro; a bandeira içada por essa companhia — facto documentado e controverso — **não** é encenada, só mencionada no debrief com fonte) |
| Intocável | datas, local, unidade, POV, falas `dlg_m29_001–003` (a de Cole **antes** do ferimento), os cinco checkpoints (estado de Cole, limites de setor e retirada persistentes), Cole ferido em ataque sinalizado e evacuado permanentemente, sem escolha falsa, retirada japonesa verificada com cautela, castelo abandonado sem chefe, paragem no limite de setor/fogo amigo, Gray a trabalhar, a carta enlameada, "a ocupação de Shuri não encerra Okinawa" |

---

## 1. Story Bible

**Logline.** Chove há dezassete dias. Samuel Brooks já não olha para a frota porque a frota não se vê e porque deixou de contar. A esquadra reconhece a saída da garganta de Wana, protege o rádio e o trânsito de macas, e apoia um avanço curto contra uma retaguarda que ninguém sabe se ainda lá está. Um ataque sinalizado fere Cole gravemente; Brooks abre um corredor na lama para Gray e os carregadores e impede Tully de ir atrás de quem disparou. No dia seguinte, com a notícia de que os japoneses deixaram Shuri, a esquadra sobe até às ruínas do castelo depois de outra companhia, pára onde o rádio manda parar, e encontra apenas pedra molhada. Gray não pára. Marsh tenta limpar a lama de uma carta e não consegue.

**As oito respostas.**
1. **Situação central:** desgaste e chuva; a retirada do outro (MASTER-STORY-BIBLE §4).
2. **Modo de contar:** macas que passam por Gray — a guerra conta-se pelos que saem pela lona.
3. **Objeto:** a carta enlameada de Marsh (começada em M26; a dobra; a lama que não sai).
4. **Silêncio:** as ruínas do castelo (quase silêncio; chuva na pedra; tiros distantes para sul).
5. **Tarefa que não é matar:** reconhecer acessos com relevo real; proteger comunicação e trânsito; não ficar todo o grupo num gargalo; apoiar avanço limitado; abrir corredor para Gray; assegurar passagem de suprimento; verificar a retirada; parar no limite de setor; consolidar.
6. **Custo humano:** 28/5, 14:10 — ataque **sinalizado** de morteiro japonês (três salvas com assobio sobre a crista; a terceira atinge a posição de Cole: evento fixo, nunca evitável, nunca "se tivesses…"): Cole gravemente ferido (abdómen e braço) (causa: a retaguarda japonesa cobre a sua própria retirada) → **Tully quer perseguir** ("Vêm dali! Daquela caverna! Eu vou!") / Brooks: "Ninguém leva o Cole. **Ninguém.** Abre a lama para o Gray." → o jogador abre fisicamente o corredor (interação: arrastar um tronco e pôr pranchas sobre a lama do trilho — 30 m — a dois com Jessup; Gray e os carregadores passam; a maca sai) e segura Tully (interação: mão no ombro; `m29.tully_restrained`) ou deixa-o ir (Tully corre 20 m, cai na lama, volta sozinho sem disparar: a caverna está vazia — `m29.tully_restrained = false`; sem morte, sem recompensa); **em ambos os ramos** `m29.cole_status = wounded_evacuated` (fixo) e Cole não volta; Tully reage a Cole conforme `m26.tully_deescalated` (se de-escalado em M26: ouve Brooks à primeira; senão, precisa da mão no ombro).
7. **Pessoas históricas:** del Valle, Bruce, Dusenbury fora de cena; A/1/5 chega primeiro (proxies ao longe); a bandeira só no debrief com fonte.
8. **Debrief:** regista a chuva (>15 polegadas desde 7/5), a retirada da 32.ª Armada para sul sob a chuva com retaguardas, A/1/5 nas ruínas às 10:15 de 29/5, o castelo na zona da 77.ª e o bombardeamento cancelado por rádio, a bandeira içada por outra companhia (facto; controverso; não encenado), Cole `wounded_evacuated`, "a ocupação de Shuri não encerra a batalha: combates no sul até 22/6 e sofrimento civil massivo" (com fonte).

**Três motivos.** (a) *A lona* — "Ainda há gente chegando. Não leve as macas." (001): Gray trabalha sem pausa e as macas são do posto, não da esquadra; (b) *a ligação* — "Mantenha a ligação. Não avancem cegos." (002, Cole, antes): o último conselho de Cole é o método de Brooks em 29/5; (c) *tirar os homens* — "Não é o fim. Precisamos tirar os homens daqui." (003): o verbo final é tirar, não tomar.

**Temas.** Desgaste sem alívio; a chuva como adversário; a retirada do outro (vitória que não se sente); parar quando avisado; Cole que não volta; a carta que não se limpa.

**Estrutura (§54).** CONTEXTO (cartela: 28/5; dezassete dias de chuva; Hagushi há oito semanas) → INTRO (buracos com água; lona; Gray; Cole fala baixo) → APROXIMAÇÃO (reconhecer a saída da garganta; relevo; trilhos de lama) → DIÁLOGO (Cole: "Mantenha a ligação…") → PRIMEIRO CONTATO (apoio ao avanço limitado contra a retaguarda: cavernas batidas) → ESCALADA (o ataque sinalizado; Cole) → COMBATE PRINCIPAL (abrir o corredor na lama para Gray; segurar Tully) → SET-PIECE (a maca sai pela lona; passagem de suprimento) → PAUSA (noite; cartela 29/5: a notícia da retirada) → CLÍMAX (verificar; subir ao castelo depois de A/1/5; parar no limite de setor; consolidar) → CONSEQUÊNCIA (Gray; a carta enlameada) → DEBRIEF.

**Arcos.**

| Personagem | Entrada | Vínculo | Prova | Mudança | Saída |
| --- | --- | --- | --- | --- | --- |
| Brooks | sem a postura de 1942; não olha para a frota | Cole; Gray; Tully | o ferimento de Cole; o limite de setor | mede sucesso por quem sai pela lona; pára quando avisado | "Precisamos tirar os homens daqui." |
| Cole | fala pouco; "Mantenha a ligação. Não avancem cegos." (002) | esquadra | — | — | ferido 14:10 (fixo); `wounded_evacuated`; nunca reaparece |
| Gray | "Ainda há gente chegando. Não leve as macas." (001) | feridos | — | olheiras; não pára | continua |
| Marsh | sem humor; a carta no capacete | Brooks | a lama | não consegue limpar a carta | `marsh_letter_muddy` |
| Tully | de M26; quer perseguir | Brooks | Cole | ouve Brooks (ou cai na lama e volta) | `tully_restrained` |
| Ruiz / Prado | cabo | — | — | — | vivo |
| Jessup | BAR; pranchas | Brooks | o corredor | — | vivo |
| Dorsey | rádio da companhia | Brooks | o limite de setor | — | vivo |

**O que a missão recusa.** Fortaleza lotada; chefe final no castelo; a bandeira encenada; Cole a voltar; "se tivesses chegado antes"; inimigos invisíveis na chuva; a 77.ª a bombardear a esquadra (cancelado por rádio — o jogador para quando avisado); Okinawa "vencida"; Dusenbury em cena.

---

## 2. Roteiro cinematográfico completo

### Cena 1 — "Lona" (`cs_m29_intro`, ≤ 80 s)
2 28/5 07:00 · 3 posições na saída do Wana Draw: buracos cheios de água até meio, uma lona esticada entre dois paus sobre o posto de Gray, macas vazias e macas com homens, lama até ao joelho no trilho; a garganta atrás; a crista à frente com fumo baixo · 4 chuva contínua, nuvens a tocar as cristas, luz cinzenta sem direção (D) · 5 Brooks, Cole, Marsh, Gray, Ruiz/Prado, Tully, Jessup, Dorsey; feridos no posto; carregadores · 6 Cartela: WANA DRAW — OKINAWA — 28 DE MAIO DE 1945 — 07:00 · 5.º MARINES · 1.ª DIVISÃO DE MARINES. Cartela 2: "Dezassete dias de chuva. Hagushi foi há oito semanas." Cartela 3 (`lineVariants`): Ruiz/Prado. Gray verifica um grupo de feridos; os carregadores levam uma maca; Gray, sem levantar a cabeça: "Ainda há gente chegando. Não leve as macas." (001) a Tully, que ia pegar numa para abrigar equipamento. Cole, sentado no bordo do buraco, fala baixo; Brooks tem de se aproximar para ouvir: "Mantenha a ligação. Não avancem cegos." (002). Marsh toca na carta dentro do capacete (o papel já mole). Brooks ajusta o cinto sem olhar — mais devagar do que em M26. · 7 estabelecer o desgaste pelos corpos, a chuva, Gray, Cole baixo, a carta · 8 aproximar-se de Cole (interação: ouvir de perto) · 9 — · 10 — · 11 morteiros esparsos ao longe · 12 lona, macas, água nos buracos, a carta mole · 13 `dlg_m29_001–002` (canónicas), `010–015` · 14 **chuva na lona** sobreposta a veículos ao longe (PR #44); água nas valas; macas · 15 plano fixo na lona; Cole de perto; a carta · 16 `missionStart` · 17 Cole: "Acessos." · 18 — · 19 [C] chuva/lama; [D] lê `m08.*`, `m26.*` · 20 a carta → cena 9

### Cena 2 — "Acessos" (jogável; `obj_m29_recon`, `obj_m29_protect_comms`)
2 28/5 07:15–09:30 (escala acelerada; `readyScale`) · 3 a saída da garganta: dois trilhos de lama (um no fundo, um na meia-encosta), uma crista com cavernas batidas (entradas negras, fumo), um gargalo entre rochas onde o trilho estreita, o fio telefónico da companhia pelo chão · 4 chuva; nuvens baixas; visibilidade 80–150 m (a chuva reduz leitura **sem** criar inimigos invisíveis: tudo o que dispara é visível por flash ou movimento) · 5 esquadra; a companhia nos eixos vizinhos (proxies); macas e suprimento a passar pelo trilho; japoneses: retaguarda esparsa (atirador numa caverna; um morteiro) · 6 Reconhecer acessos do setor com relevo real e proteger comunicação e trânsito: escolher o trilho (fundo: lama funda, coberto; meia-encosta: firme, visto), **evitar ficar todo o grupo preso no gargalo** (≥ 4 homens no gargalo → Cole, baixo, "Gargalo. Dois de cada vez." e um morteiro agendado ≥ 30 m); Dorsey precisa que o fio telefónico seja reparado (interação: emendar o fio, 20 s, a cobrir) e de um ponto com rádio; as macas passam pelo trilho e a esquadra cobre-as no troço visto da caverna (supressão por janelas; o atirador recua) · 7 §79 ponto 1 · 8 escolhe o trilho; não se amontoa; emenda o fio; cobre macas · 9 fundo (lento; coberto) vs meia-encosta (rápido; visto) · 10 Cole baixo; Dorsey; Jessup cobre; Marsh conta macas; Tully impaciente; Gray fica no posto (nunca segue) · 11 atirador (dados; só sobre o troço visto); morteiro ≥ 30 m · 12 fio no chão, cavernas batidas, macas, lama com rastos · 13 `dlg_m29_016–023` · 14 água nas valas, macas, chuva na pedra, o atirador abafado pela chuva · 15 livre · 16 "Acessos." · 17 fio emendado + macas passadas (`evt_m29_recon`) · 18 `cp_m29_a_reconhecimento`; `m29.comms_protected`; `m29.bottleneck_avoided` · 19 [C] chuva/lama; [A] supressão por janelas; [B] emendar o fio · 20 —

### Cena 3 — "Avanço limitado" (jogável; `obj_m29_support_advance`)
2 28/5 09:30–13:30 (escala acelerada) · 3 a crista: posições confirmadas da retaguarda (duas cavernas com atiradores; um ninho de MG numa saliência; um túmulo usado como posição), um trilho que sobe pela meia-encosta; o planalto de Shuri ao fundo (não visível: nuvens) · 4 chuva; fumo de fósforo branco de outra unidade ao longe · 5 esquadra; o pelotão à direita; japoneses: retaguarda (dados; 6–10; recuam por túneis quando flanqueados; alguns ficam — não "todos morrem") · 6 Apoiar avanço limitado sob resistência residual/posições confirmadas: chuva, fumo e ruínas afetam a leitura sem esconder perigos injustamente (cada posição que dispara mostra flash; o túmulo é posição só depois de disparar: Cole, baixo: "Confirma antes." — a regra de M08/M26); a esquadra flanqueia a saliência pela meia-encosta (Jessup fixa; Brooks e Ruiz/Prado contornam); a MG recua por um túnel; as cavernas são seladas por uma equipa de demolição do batalhão (NPC; a esquadra cobre; sem lança-chamas em plano: M24) · 7 §79 ponto 2 · 8 dispara (30–200 m); flanqueia; cobre a equipa; confirma antes · 9 flanquear pela meia-encosta (visto; rápido) vs pelo fundo (coberto; lama) · 10 Cole dirige baixo; Jessup fixa; Ruiz/Prado flanqueia; Tully segue Brooks; Marsh atrás · 11 retaguarda (dados); MG recua; morteiro por agenda ≥ 30 m · 12 cavernas seladas, cartuchos na lama, o túmulo com sacos de areia · 13 `dlg_m29_024–031` · 14 MG abafada pela chuva, cargas de demolição (surdas), fósforo ao longe · 15 livre · 16 CP-A · 17 saliência tomada (`evt_m29_ridge`) · 18 `cp_m29_b_passagem` · 19 [A] · 20 —

### Cena 4 — "Sinalizado" (jogável; `obj_m29_open_corridor`, `obj_m29_restrain_tully`) — **custo humano**
2 28/5 14:00–15:30 · 3 a saliência tomada: buracos com água, o trilho de descida para o posto (lama funda num troço de 30 m, um tronco caído); Cole no buraco da direita com Dorsey; a caverna de onde vem o morteiro japonês a 300 m (fumo) · 4 chuva mais forte · 5 esquadra; Gray e os carregadores no posto (lá em baixo); japoneses: morteiro (três salvas **sinalizadas**: assobio 2 s; a primeira ≥ 50 m; a segunda ≥ 30 m; a terceira atinge o buraco de Cole: **fixo** às 14:10 — sempre ≥ 30 m do jogador) · 6 **Ataque sinalizado**: Dorsey: "Morteiro! Assobio!" — primeira salva; Cole: "Abaixo!" — segunda; terceira: Cole atingido (abdómen e braço; Dorsey ileso); Tully: "Vêm dali! Daquela caverna! Eu vou!" → Brooks: "Ninguém leva o Cole. **Ninguém.** Abre a lama para o Gray." → o jogador **abre fisicamente o corredor**: arrastar o tronco a dois (Brooks + Jessup) e pôr pranchas no troço de lama funda (3 interações; 90 s) para que Gray e os carregadores subam com a maca; **segurar Tully** (interação: mão no ombro; se `m26.tully_deescalated`, Tully ouve à primeira: "…Sim. Lama."; senão precisa da mão) ou deixá-lo ir (corre 20 m, cai na lama, volta; a caverna cala-se por agenda — ninguém a "limpa"); Gray chega, trabalha ("Não falem com ele. Falem comigo."), a maca desce pelo corredor; Cole **não** fala depois do ferimento (regra §79: a sua fala foi antes) · 7 §79 ponto 3 ("Cole sofre ferimento grave em ataque sinalizado; abrir um corredor para Gray e carregadores o remove ao atendimento") · 8 abriga-se nas salvas; arrasta o tronco; põe pranchas; segura Tully (ou não); cobre a descida · 9 corredor primeiro (Gray chega em 90 s) vs Tully primeiro (o corredor atrasa 30 s; Gray chega na mesma; **nenhum** ramo muda o estado de Cole) · 10 Dorsey chama o posto; Jessup arrasta; Gray e carregadores sobem; Marsh fica com Cole (mão na mão, sem fala); Tully · 11 morteiro (três salvas; depois cala-se por agenda) · 12 o tronco, as pranchas, o buraco de Cole com água vermelha (reduzido) · 13 `dlg_m29_032–043` · 14 **assobio → salvas → a chuva → "Ninguém."** · 15 livre; beat fixo na maca a descer pelo corredor (3 s) · 16 CP-B · 17 maca de Cole no posto (`evt_m29_cole_evacuated`) · 18 `cp_m29_c_evacuacao`; `m29.cole_status = wounded_evacuated` (fixo); `m29.tully_restrained`; `m29.corridor_opened`; `m29.player_carried` (se pegou na maca) · 19 [A] obstáculo a dois, maca a dois, `safeImpact`; [B] pranchas, mão no ombro (M19) · 20 Cole nunca reaparece (CONTINUITY §3.5)

### Cena 5 — "Passagem de suprimento" (jogável; `obj_m29_supply_passage`)
2 28/5 15:30–17:00 (escala acelerada) → noite (cartela) · 3 o corredor aberto; o trilho até ao posto e de volta; carregadores com munição e rações a subir; macas a descer · 4 chuva; luz a cair · 5 esquadra (sem Cole; Ruiz/Prado assume o comando da esquadra por antiguidade — ou Brooks, se Prado; **decisão**: Ruiz é cabo desde M26; Brooks é cabo; o tenente por voz nomeia Brooks: "Brooks, a esquadra é tua até ordem."); carregadores; Gray no posto · 6 Assegurar a passagem de suprimento pelo corredor: posicionar Jessup e Tully a cobrir o troço visto; marcar o corredor com fita para a noite; cada carregador que sobe conta (Marsh regista); Gray manda avisar que o posto recebe de outras esquadras também ("Ainda há gente chegando." — a fala 001 repete-se como estado); noite: cartela 29/5 · 7 §79 ponto 3 (segunda metade) · 8 posiciona; marca; cobre; conta · 9 — · 10 Jessup; Tully calado; Marsh conta; Dorsey com o rádio · 11 tiros esparsos ao anoitecer (dados) · 12 fita, caixas, macas · 13 `dlg_m29_044–048` · 14 carregadores na lama, caixas, a lona ao longe · 15 livre · 16 CP-C · 17 noite (`evt_m29_night`) · 18 `m29.supply_through`; `m29.brooks_in_command` · 19 [A] · 20 —

### Cena 6 — "29 de maio" (`cs_m29_day2`, ≤ 60 s)
2 29/5 07:30 · 3 as mesmas posições; chuva mais fina; o planalto de Shuri agora visível por instantes entre nuvens; a cidade arrasada; as ruínas do castelo como linha de pedra; Dorsey com o rádio · 4 manhã chuvosa e **quieta** (D, S-C08) · 5 esquadra (sem Cole; Ruiz/Prado; Tully; Jessup; Marsh; Dorsey); Gray no posto · 6 Cartela: 29 DE MAIO DE 1945 — 07:30. Dorsey: "Batalhão: informações de outros setores. Os japoneses deixaram o sistema de Shuri. Verificar com cautela. Ligação com a direita e com a 77.ª a leste." Marsh: "Deixaram? Então para onde?" Brooks: "Para sul. Onde a gente ainda não foi." (eco de M26). Tully olha para o buraco de Cole (vazio, com água). Brooks: "Mantenha a ligação. Não avancem cegos." — repete as palavras de Cole, baixo, para si. · 7 §79 ponto 4 · 8 olhar · 9 — · 10 — · 11 tiros distantes para sul · 12 o buraco vazio; o rádio · 13 `dlg_m29_049–053` · 14 chuva fina; **quase silêncio**; tiros distantes · 15 plano fixo no buraco vazio; o planalto entre nuvens · 16 night · 17 Brooks: "Verificar." · 18 `cp_m29_d_2905`; `m29.retreat_reported` · 19 [D] snapshot 29/5 (Cole ausente; `m29.cole_status`) · 20 —

### Cena 7 — "O castelo" (jogável; clímax; `obj_m29_verify`, `obj_m29_castle`, `obj_m29_sector_limit`)
2 29/5 08:00–11:30 (escala acelerada) · 3 do Wana ao planalto: a cidade de Shuri arrasada (muros de calcário, escombros, túmulos partidos, um tanque japonês destruído), a subida para as ruínas do castelo (escadas de pedra, o portão, muros), a **zona da 77.ª** a leste marcada no mapa (limite de setor: uma estrada); A/1/5 já nas ruínas (proxies ao longe; **nenhuma** figura nomeada; a bandeira **não** é visível em cena — opção de direção: o jogador chega quando o momento já passou e ninguém o comenta) · 4 chuva fina; nuvens; a pedra molhada brilha · 5 esquadra; A/1/5 ao longe; a companhia; japoneses: retaguarda mínima (dois atiradores que recuam para sul: dados; "pouca oposição"); a 77.ª a leste (NPC, só por rádio) · 6 Verificar a mudança mantendo cautela e ligação: avançar com ligação à direita (Ruiz/Prado estafeta) e ao batalhão (Dorsey); confirmar posições abandonadas (cavernas vazias com equipamento; uma cozinha de campanha; **sem** fortaleza lotada); subir às ruínas depois de A/1/5; **o limite de setor**: Dorsey recebe "a 77.ª tem fogo planeado sobre a zona leste do castelo; cancelado por rádio **se** confirmarem que há Marines lá dentro — parem na estrada até confirmação" → o jogador **pára** quando avisado (zona com aviso: ultrapassar a estrada antes da confirmação dispara a fala do tenente e um impacto de artilharia amiga ≥ 50 m, **nunca** no jogador — a confirmação chega 2 min depois por agenda); consolidar a posição nas ruínas (posicionar; ligação à direita e à 77.ª por rádio) · 7 §79 ponto 5 ("interromper avanço em área de fogo amigo/limites de setor quando avisado") · 8 avança com ligação; verifica (interações: cavernas, cozinha); sobe; pára na estrada; posiciona; liga · 9 subir pelas escadas (vista; rápido) vs pelo muro (coberto; lento) · 10 Ruiz/Prado estafeta; Dorsey; Jessup; Tully calado; Marsh · 11 dois atiradores (dados; recuam); artilharia amiga ≥ 50 m só se ultrapassar · 12 escombros, túmulos partidos, o tanque, cavernas vazias, a cozinha, as escadas de pedra, o portão · 13 `dlg_m29_054–064` · 14 chuva na pedra, passos em escombros, **quase silêncio no castelo**, tiros distantes para sul, o rádio · 15 livre; a pedra molhada · 16 CP-D · 17 posição consolidada nas ruínas após confirmação (`evt_m29_consolidated`) · 18 `cp_m29_e_consolidacao`; `m29.sector_limit_respected`; `m29.crossed_before_confirmation` (debrief); `m29.castle_verified` · 19 [C] limite de setor como zona com aviso e agenda de confirmação; [A] posicionar, estafeta · 20 —

### Cena 8 — "A carta" (`cs_m29_outro`, ≤ 80 s) + debrief
2 29/5 11:30–13:00 · 3 as ruínas: um muro de pedra, a chuva; Gray a trabalhar num canto abrigado (o posto subiu com a companhia: feridos de outras esquadras; um japonês ferido também, depois dos nossos); Marsh sentado com a carta no joelho a tentar tirar a lama com a manga; Tully a olhar para sul · 4 chuva fina; cinzento · 5 Brooks, Marsh, Gray, Ruiz/Prado, Tully, Jessup, Dorsey · 6 Brooks encontra Gray a trabalhar sem pausa; Gray não levanta a cabeça: "Próximo." Marsh esfrega a carta; a lama espalha-se; desiste; dobra-a (a dobra de M26; o papel mole). Tully: "E agora?" Brooks: "Não é o fim. Precisamos tirar os homens daqui." (003). Cartela: a 29/5 A/1/5 chegou às ruínas de Shuri com pouca oposição; o castelo estava na zona da 77.ª Divisão e o bombardeamento foi cancelado por rádio; uma bandeira foi içada nas ruínas por essa companhia (facto documentado e controverso; não encenado); Shuri foi ocupada a 31/5; a 32.ª Armada retirou para sul; os combates continuaram até 22/6 com perdas massivas entre os civis de Okinawa (fonte: debrief). Cartela 2: "Sargento Henry Cole: ferido grave a 28/5; evacuado para o navio-hospital. Não regressou à unidade." Cartela 3 (`lineVariants`): Ruiz/Prado; `tully_restrained`. · 7 §79 final ("A ocupação de Shuri não encerra a batalha de Okinawa") · 8 skip · 9 — · 10 — · 11 — · 12 a carta enlameada; a manga; Gray · 13 `dlg_m29_003` (canónica), `065–067` · 14 **chuva na pedra; Gray a rasgar ligadura; quase silêncio**; tiros distantes para sul · 15 plano fixo na carta; Gray ao fundo sem levantar a cabeça · 16 consolidated · 17 `missionEnd` · 18 `m29.completed`; `m29.marsh_letter_muddy = true`; `m29.cole_status = wounded_evacuated` · 19 [A] cutscene com variantes · 20 M30 lê `m29.cole_status` (Cole ausente do epílogo), `m29.marsh_letter_muddy` (Marsh com a carta por enviar); Gray no epílogo do Pacífico

---

## 3. Gameplay design

### 3.1 Objetivos

| ID | Texto | Obrig. | Ativação | Conclusão | Falha | Consequência | CP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `obj_m29_recon` | Reconheça a saída da garganta; não encham o gargalo | sim | intro | trilho escolhido + macas passadas | — | `bottleneck_avoided` | A |
| `obj_m29_protect_comms` | Emende o fio; dê ao rádio um ponto | sim (paralelo) | intro | fio emendado | — | `comms_protected` | — |
| `obj_m29_support_advance` | Apoie o avanço limitado; confirme antes | sim | A | saliência | — | — | B |
| `obj_m29_open_corridor` | Abra a lama para o Gray: tronco e pranchas | sim | 14:10 | Gray na saliência | — | `corridor_opened`; `cole_status` (fixo) | C |
| `obj_m29_restrain_tully` | Segure Tully | sim (cena) | 14:11 | mão no ombro **ou** Tully volta | — | `tully_restrained` | — |
| `obj_m29_supply_passage` | Assegure a passagem de suprimento; marque para a noite | sim | C | noite | — | `supply_through`; `brooks_in_command` | — |
| `obj_m29_verify` | Verifique a retirada com ligação | sim | D | cavernas e cozinha | — | — | — |
| `obj_m29_castle` | Suba às ruínas depois da outra companhia | sim | verify | ruínas | — | `castle_verified` | — |
| `obj_m29_sector_limit` | Pare na estrada até confirmação | sim (paralelo) | aviso | confirmação | — | `sector_limit_respected`; `crossed_before_confirmation` | E |
| `obj_m29_consolidate` | Consolide; ligue à direita e à 77.ª | sim | confirmação | `evt_m29_consolidated` | — | — | E |

### 3.2 Setores
`s1_wana_exit` (perto: buracos, lona, posto) · `s2_gorge_trails` (perto: dois trilhos, gargalo) · `s3_ridge` (perto: cavernas, saliência, túmulo) · `s4_corridor` (perto: 30 m de lama funda) · `s5_shuri_plateau` (perto, 29/5: cidade arrasada) · `s6_castle_ruins` (perto: escadas, portão, muros; o limite a leste) · `s7_mid` (médio: outros eixos, forças de cobertura em retirada, A/1/5 ao longe, a 77.ª por rádio) · `s8_far` (longe: frota invisível pela chuva, apoio, aviação adequada ao dia — só som). Agendas: atirador da caverna por janelas; morteiro no gargalo se ≥ 4; salvas sinalizadas 14:08/14:09/14:10 (Cole, fixo); morteiro cala-se 14:20; Gray sobe 90 s após o corredor; tiros esparsos ao anoitecer; 29/5: dois atiradores recuam; aviso de setor na estrada; confirmação +2 min; A/1/5 nas ruínas às 10:15 (proxies).

### 3.3 Checkpoints
A reconhecimento · B passagem (saliência) · C evacuação (Cole evacuado; **estado fixo**) · D 29/5 (snapshot: Cole ausente; retirada reportada) · E consolidação (limite de setor; retirada verificada). Salvam o estado de Cole, os limites de setor e a retirada inimiga.

### 3.4 Justiça
A chuva reduz a visibilidade mas tudo o que dispara mostra flash/movimento; morteiros sempre com assobio e ≥ 30 m do jogador (a salva de Cole é fixa e sinalizada); o gargalo avisa antes do morteiro; Cole nunca é "salvável" nem "perdido por culpa"; Tully nunca morre; a artilharia amiga nunca atinge o jogador (≥ 50 m) e a confirmação chega sempre; o castelo não tem "boss"; os dois atiradores de 29/5 recuam.

---

## 4. Set pieces

### SP-29-1 "Acessos na chuva"
Contexto: a saída da garganta. Preparação: Cole baixo; o fio no chão. Experiência: escolher trilho; não encher o gargalo; emendar o fio a cobrir; cobrir macas no troço visto. Companheiros: Cole "Gargalo. Dois de cada vez."; Dorsey; Marsh conta macas. Ambiente: cavernas batidas, lama com rastos. Evolução: o atirador recua. Clímax: macas passadas. Consequências: CP-A. Requisitos: [C] chuva/lama; [B] emendar. Integração: `obj_m29_recon`, `obj_m29_protect_comms`.

### SP-29-2 "Sinalizado"
Contexto: a saliência. Preparação: Cole no buraco da direita com Dorsey; a caverna do morteiro a 300 m. Experiência: três salvas com assobio; Cole atingido (fixo); Tully quer ir; "Ninguém."; o tronco a dois; as pranchas; Gray sobe; a maca desce. Companheiros: Jessup arrasta; Marsh com Cole; Gray "Falem comigo."; Tully. Ambiente: água vermelha reduzida. Evolução: o morteiro cala-se por agenda. Clímax: a maca pelo corredor. Consequências: `cole_status` (fixo), `tully_restrained`, CP-C. Requisitos: [A] obstáculo/maca a dois, `safeImpact`. Integração: `obj_m29_open_corridor`, `obj_m29_restrain_tully`.

### SP-29-3 "O castelo"
Contexto: 29/5. Preparação: a notícia da retirada; o buraco vazio. Experiência: avançar com ligação; cavernas vazias; a cozinha; subir depois de A/1/5; parar na estrada; a confirmação; consolidar. Companheiros: Ruiz/Prado estafeta; Dorsey; o tenente por voz. Ambiente: escadas de pedra, o portão, o tanque. Evolução: dois atiradores recuam; a 77.ª por rádio. Clímax: quase silêncio. Consequências: `sector_limit_respected`, CP-E. Requisitos: [C] limite de setor com aviso. Integração: `obj_m29_verify`, `obj_m29_castle`, `obj_m29_sector_limit`.

---

## 5. Environmental storytelling

| Setor/fase | Inicial | Atividade | Tensão | Combate | Humanos | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| Wana | buracos com água, lona, macas, a carta mole | Gray; carregadores | Cole baixo | morteiros longe | Gray; feridos | — |
| garganta | dois trilhos, gargalo, fio no chão, cavernas batidas | emendar; macas | o gargalo | atirador | Dorsey | fio emendado |
| crista | túmulo com sacos, saliência, cavernas | flanquear; selar | "Confirma antes." | retaguarda; MG | equipa de demolição | cavernas seladas |
| saliência | buraco de Cole, tronco, lama funda | corredor | assobio | 3 salvas | Cole; Gray; Tully | pranchas; maca desce |
| corredor/noite | fita, caixas | suprimento | — | esparsos | carregadores | Brooks no comando |
| planalto 29/5 | cidade arrasada, túmulos partidos, tanque, cavernas vazias, cozinha | verificar | o limite | 2 atiradores recuam | A/1/5 ao longe | — |
| ruínas | escadas, portão, muros, pedra molhada | consolidar | confirmação | — | Gray no canto; o japonês ferido | a carta enlameada |

Objetos com origem: a carta (Pavuvu/Hagushi, M26; a lama de Wana), a lona (do posto desde 20/5), o fio telefónico (cortado por estilhaço a 27/5), o tronco (pinheiro abatido pelo fósforo de 26/5), o tanque japonês (Type 95, abandonado a 24/5 — R), a cozinha de campanha (retaguarda que saiu na noite de 28/29).

---

## 6. Diálogos (VO inglês; japonês só por um ferido no fim, sem tradução)

| ID | Falante | Texto | Gatilho | Prio | CD |
| --- | --- | --- | --- | --- | --- |
| 001 | Gray | "Ainda há gente chegando. Não leve as macas." (§79; a Tully; repete-se como estado em 28/5 tarde) | intro t 15 | 1 | — |
| 002 | Cole | "Mantenha a ligação. Não avancem cegos." (§79; **antes** do ferimento; baixo, de perto) | intro t 40 | 1 | — |
| 003 | Brooks | "Não é o fim. Precisamos tirar os homens daqui." (§79) | outro | 1 | — |
| 010 | Tully | (vai pegar numa maca para o equipamento) | intro t 12 | — | — |
| 011 | Marsh | "Dezassete dias. Nem a carta está seca." (V1) | intro t 25 | 2 | — |
| 012 | Ruiz / Prado | "Cole, fala mais alto." / Cole: "Não." (V1) | intro t 35 | 2 | — |
| 013 | Brooks | (aproxima-se; ouve 002) | interação | — | — |
| 014 | Jessup | "A BAR pesa o dobro molhada." (V1) | intro t 50 | 3 | — |
| 015 | Cole | "Acessos. Dois trilhos. Vejam qual aguenta macas." (V1) | intro fim | 1 | — |
| 016 | Cole | "Gargalo. Dois de cada vez." (V1; baixo) | ≥ 4 no gargalo | 0 | 30 |
| 017 | Dorsey | "Fio cortado. Sem fio, sem batalhão. Alguém segura a luz?" (V1) | fio | 1 | — |
| 018 | Brooks | "Eu emendo. Jessup, a caverna." (V1) | emendar | 1 | — |
| 019 | Marsh | "Maca. Outra. Três." (V1) | macas | 3 | 40 |
| 020 | Jessup | "Atirador na caverna do meio. Só dispara sobre o troço visto. Cubro na janela." (V1) | atirador | 1 | — |
| 021 | Dorsey | "Batalhão responde. Fio bom." (V1) | emendado | 1 | — |
| 022 | Tully | "Quando é que avançamos a sério?" / Cole: "Quando as macas passarem." (V1) | — | 2 | — |
| 023 | Cole | "Crista. Posições confirmadas: duas cavernas, uma saliência. O resto é fumo até disparar." (V1) | crista | 1 | — |
| 024 | Cole | "Confirma antes." (M08/M26; baixo) | túmulo | 0 | — |
| 025 | Jessup | "Fixo a saliência. Brooks, Ruiz: meia-encosta." (V1) | flanco | 1 | — |
| 026 | Ruiz / Prado | "MG recuou por um buraco. Não vou atrás." (V1) | MG recua | 1 | — |
| 027 | equipa de demolição (voz) | "Cavernas. Cubram. Não olhem." (V1) | selar | 1 | — |
| 028 | Tully | "Não olhar porquê?" / Marsh: "Porque não." (V1) | 027 | 3 | — |
| 029 | Cole | "Saliência é nossa. Buracos. Dorsey comigo, à direita." (V1) | saliência | 1 | — |
| 030 | Marsh | "Chove mais." (V1) | 14:00 | 3 | — |
| 031 | Dorsey | "Morteiro! **Assobio!**" (V1) | 14:08 | 0 | — |
| 032 | Cole | "Abaixo!" (V1; última fala) | 14:09 | 0 | — |
| 033 | — | (terceira salva; o buraco de Cole) | 14:10 | — | — |
| 034 | Dorsey | "Cole! **Cole!** Gray! Posto, aqui Dorsey, o sargento—" (V1) | +1 s | 0 | — |
| 035 | Tully | "Vêm dali! Daquela caverna! Eu vou!" (V1) | +3 s | 1 | — |
| 036 | Brooks | "Ninguém leva o Cole. **Ninguém.** Abre a lama para o Gray." (V1) | 035 | 0 | — |
| 037 | Jessup | "Tronco. Tu e eu. Pranchas depois." (V1) | corredor | 1 | — |
| 038 | Tully | "…Sim. Lama." (V1; se `m26.tully_deescalated`) | 036 | 1 | — |
| 039 | Brooks | (mão no ombro de Tully; sem fala) (se não de-escalado) | interação | — | — |
| 040 | Tully | (corre; cai na lama; volta) "…Estava vazia." (V1; se não segurado) | — | 1 | — |
| 041 | Gray | "Não falem com ele. Falem comigo. Pranchas aguentam? Então vão." (V1) | Gray chega | 1 | — |
| 042 | Marsh | (mão na mão de Cole; sem fala) | — | — | — |
| 043 | Gray | "Maca. Devagar no corredor. Ele vai para o navio." (V1) | maca | 1 | — |
| 044 | ten. Royce (voz) | "Brooks, a esquadra é tua até ordem." (V1) | 15:30 | 1 | — |
| 045 | Brooks | "Jessup, Tully: o troço visto. Fita para a noite." (V1) | passagem | 1 | — |
| 046 | Marsh | "Carregador. Dois. Munição e rações. Três." (V1) | contagem | 3 | 40 |
| 047 | Gray (ao longe) | (001 como estado: "Ainda há gente chegando.") | tarde | 2 | — |
| 048 | Tully | (calado a noite toda) | noite | — | — |
| 049 | Dorsey | "Batalhão: informações de outros setores. Os japoneses deixaram o sistema de Shuri. Verificar com cautela. Ligação com a direita e com a 77.ª a leste." (V1) | 29/5 | 1 | — |
| 050 | Marsh | "Deixaram? Então para onde?" (V1) | 049 | 2 | — |
| 051 | Brooks | "Para sul. Onde a gente ainda não foi." (V1) | 050 | 1 | — |
| 052 | Tully | (olha o buraco vazio) | — | — | — |
| 053 | Brooks | "Mantenha a ligação. Não avancem cegos." (V1; repete Cole, para si) | fim da cutscene | 1 | — |
| 054 | Brooks | "Ruiz, direita, a pé. Dorsey, batalhão a cada cem metros." (V1) | verificar | 1 | — |
| 055 | Jessup | "Caverna vazia. Equipamento. Saíram esta noite." (V1) | caverna | 1 | — |
| 056 | Marsh | "Cozinha de campanha. Ainda com arroz." (V1; eco de M08: "ainda morno" — agora frio) | cozinha | 2 | — |
| 057 | Ruiz / Prado | "Dois atiradores a recuar para sul. Não respondem." (V1) | atiradores | 1 | — |
| 058 | Dorsey | "Outra companhia já está nas ruínas. Subimos depois deles." (V1) | 10:15 | 1 | — |
| 059 | Dorsey | "**Parem.** 77.ª tem fogo planeado na zona leste do castelo. Cancelam por rádio se confirmarem Marines lá dentro. Ninguém passa a estrada." (V1) | aviso | 0 | — |
| 060 | ten. Royce (voz) | "Brooks! A estrada! **Recua!**" (V1; se ultrapassa) | zona | 0 | — |
| 061 | Dorsey | "Confirmado. Cancelado. Podemos subir." (V1) | +2 min | 1 | — |
| 062 | Tully | "É isto? Pedra?" (V1) | ruínas | 2 | — |
| 063 | Brooks | "É isto. Posições. Ligação à direita e à 77.ª." (V1) | — | 1 | — |
| 064 | Dorsey | "77.ª responde. Direita responde. Estamos ligados." (V1) | consolidated | 1 | — |
| 065 | Gray | "Próximo." (V1; sem levantar a cabeça) | outro | 2 | — |
| 066 | Marsh | (esfrega a carta; desiste; dobra) | outro | — | — |
| 067 | Tully | "E agora?" (V1) | outro | 1 | — |

Callouts: `co_m29_cave_sniper`, `co_m29_bottleneck`, `co_m29_mortar_whistle` (×3), `co_m29_sector_limit`, `co_m29_friendly_fire_far`. Silêncios: a lona (chuva); depois da terceira salva (1 s antes de Dorsey); o castelo.

---

## 7. Arte e atmosfera

**Paleta:** cinzento de chuva e nuvens, castanho de lama (profundidade visível), verde-escuro de P44 encharcado, preto de cavernas, branco de fósforo ao longe, cinzento-claro de calcário molhado nas ruínas, vermelho reduzido na água do buraco. **Luz:** sem direção (luz difusa sob nuvens) nos dois dias; 29/5 instantes de abertura entre nuvens sobre o planalto; a pedra molhada reflete. **Materiais:** lama (três profundidades), lona, água de buraco, pedra de caverna, calcário de castelo, escadas molhadas, madeira de tronco e pranchas. **Silhuetas:** a lona entre dois paus, a crista com cavernas, o gargalo, o tronco, a cidade arrasada, as escadas e o portão do castelo, o tanque japonês. **Destruição:** total no planalto (cidade arrasada); cavernas seladas; crateras cheias de água. **Humanos:** os mesmos de M26 oito semanas depois (barbas, rostos molhados, roupa pesada; Cole com o cabelo colado; Gray com olheiras fundas; Marsh sem humor); Tully já não é novo; Cole na maca coberto. **Violência reduzida:** água vermelha reduzida; Cole coberto até ao peito; cavernas seladas sem plano aberto; o japonês ferido de Gray sem plano aberto.

**Imagem única:** lona à chuva, macas, o castelo quase em silêncio (ART §4, RECONSTRUCTED).

---

## 8. Áudio

| Fase | Perto | Médio | Longe | Silêncio |
| --- | --- | --- | --- | --- |
| Wana | **chuva na lona**, água nos buracos, macas, Cole baixo | carregadores | veículos; morteiros | — |
| garganta | água nas valas, lama, o fio, o atirador abafado pela chuva | macas | — | — |
| crista | MG abafada, cargas surdas, fósforo ao longe | a direita | — | — |
| saliência | **assobio ×3**, salvas, chuva, "Ninguém.", tronco, pranchas | Gray a subir | — | 1 s após a terceira |
| corredor/noite | carregadores na lama, fita, caixas | — | esparsos | — |
| 29/5 | chuva fina, rádio | — | tiros distantes para sul | **quase** |
| planalto | passos em escombros, pedra molhada | A/1/5 ao longe | a 77.ª só por rádio | — |
| ruínas | chuva na pedra, Gray a rasgar ligadura, a carta | — | tiros para sul | **o castelo** |

Sons novos: chuva contínua por superfície (lona, água, pedra, lama), lama por profundidade, castelo de calcário. Música: motivo VI "A água, outra vez" — uma frase na carta enlameada (a água aqui é a chuva que não seca). VO inglês; japonês mínimo.

---

## 9. Validação histórica

| Asserção | Classe | Fonte | Pendência |
| --- | --- | --- | --- |
| 1.ª Div. Marines em Wana desde meados de maio; >15 polegadas de chuva desde 7/5 | D | H28; S-C08 | — |
| Retirada da 32.ª Armada do sistema de Shuri para sul entre 22 e 29/5 com retaguardas | D (resumo) | H28 | — |
| A/1/5 nas ruínas do castelo ~10:15 de 29/5 com pouca oposição; castelo na zona da 77.ª; bombardeamento cancelado por rádio | D (resumo) | S-C08 | — |
| Bandeira içada nas ruínas por A/1/5 (facto documentado, controverso) — só debrief com fonte | D | S-C08 | texto do debrief a aprovar |
| Companhia de Brooks; rota Wana → Shuri; limite de setor exato | R | — | **P-C29** |
| Shuri ocupada a 31/5; Okinawa até 22/6; perdas civis massivas no sul | D | H28 | fonte para o número de civis no debrief |
| Cole ferido e evacuado (fixo); Ruiz/Prado; Tully por `m26.*` | regra | CONTINUITY §3.5 | — |
| Dorsey, Royce, a equipa de demolição | F | — | acrescentar Dorsey/Royce a CONTINUITY §4 |
| Equipamento: M1, BAR, carabina, EE-8, SCR-300; japonês: Type 99, morteiro de 81 mm, Type 95 (destruído) | D | TIMELINE §3 | auditoria |

**Proibições:** fortaleza lotada; chefe final; a bandeira encenada; Cole a regressar ou "salvável"; fogo amigo sobre o jogador; inimigos invisíveis na chuva; del Valle/Bruce/Dusenbury em cene; Okinawa "vencida". **Fora de cena:** del Valle; Bruce; Dusenbury e A/1/5 (proxies ao longe).

---

## 10. Handoff técnico

**Contrato:** `id m29_shuri`, `order 29`, **dois segmentos de relógio** (28/5 07:00→17:00 + noite; 29/5 07:30→13:00) com snapshot em D, `cast` condicional (`ruiz_or_prado`), grupos (`grp_squad`, `grp_company_axes`, `grp_stretcher_teams`, `grp_carriers`, `grp_demo_team`, `grp_a_company_far` (sem nomes), `grp_jp_cave_sniper`, `grp_jp_rearguard`, `grp_jp_mg_ledge`, `grp_jp_mortar_cave` (3 salvas agendadas; cessa), `grp_jp_snipers_day2` (recuam), `grp_77th_radio` (voz), `grp_aid_post`), setores s1–s8, checkpoints A–E (C fixa `cole_status`), cutscenes (intro, day2, outro com variantes), falas, flags, debrief com fontes.

**Flags:** `m29.completed`, `m29.bottleneck_avoided`, `m29.comms_protected`, `m29.cole_status = wounded_evacuated` (fixo), `m29.tully_restrained`, `m29.corridor_opened`, `m29.player_carried`, `m29.supply_through`, `m29.brooks_in_command`, `m29.retreat_reported`, `m29.castle_verified`, `m29.sector_limit_respected`, `m29.crossed_before_confirmation`, `m29.marsh_letter_muddy` (fixo true), `m29.ruiz_present` (derivada).

**Sistemas:** [C] chuva contínua e lama por profundidade (reutiliza M21/M27), limite de setor como zona com aviso + agenda de confirmação + impacto amigo ≥ 50 m (nunca no jogador); [A] `safeImpact`, obstáculo/maca a dois, supressão por janelas, posicionar, estafeta, fogo como dados; [B] emendar fio, pranchas, mão no ombro (M19), contagem de macas/carregadores; [D] leitura de `m08.ruiz_status`, `m26.tully_deescalated`, `m26.marsh_letter_started`. **Fallbacks honestos:** sem lama por profundidade → modificador fixo por zona; sem zona de limite → o aviso é cutscene curta com paragem forçada de 2 min.

**Disciplinas:** Level: saída do Wana (buracos, lona), garganta com dois trilhos e gargalo, crista com cavernas e saliência, corredor de 30 m, planalto arrasado (300 m), ruínas do castelo com escadas e portão e a estrada-limite; Combate/IA: retaguarda que recua por túneis, MG que recua, morteiro com salvas sinalizadas, atiradores de 29/5 que recuam; Arte: chuva e lama, calcário molhado, cidade arrasada, o tanque; Personagens: os de M26 oito semanas depois, Cole na maca, Dorsey; Animação: ouvir de perto, emendar fio, arrastar tronco, pranchas, mão no ombro, maca pelo corredor, esfregar a carta com a manga; Som: chuva por superfície, lama por profundidade, castelo; VO: inglês; Historiador: P-C29 (companhia, rota, limite), texto do debrief sobre a bandeira e os civis; QA: Cole nunca reaparece após C/D/E; `cole_status` nunca muda; Tully nunca morre; artilharia amiga nunca a < 50 m; Ruiz/Prado exclusivos; Gray nunca segue o jogador; a bandeira nunca existe no mundo.

**Testes:** a terceira salva atinge o buraco de Cole em qualquer ramo e sempre ≥ 30 m do jogador; carregar D → Cole ausente e `cole_status = wounded_evacuated`; ultrapassar a estrada antes da confirmação → `co_m29_friendly_fire_far`, impacto ≥ 50 m, `crossed_before_confirmation`, confirmação chega na mesma; `tully_restrained` true se mão no ombro ou se `m26.tully_deescalated`; `marsh_letter_muddy` sempre true; nenhum ator japonês dentro das ruínas.

---

## 11. Matriz Narrativa-Gameplay

| Evento narrativo | Objetivo | Ação | NPCs | Transformação | Trigger | Consequência |
| --- | --- | --- | --- | --- | --- | --- |
| Lona; Gray; Cole baixo; a carta mole | (intro) | aproximar-se de Cole | Gray 001; Cole 002; Marsh | — | start | variante Ruiz/Prado |
| Acessos; o gargalo; o fio | `obj_m29_recon` / `protect_comms` | escolher trilho; não amontoar; emendar; cobrir macas | Cole "Gargalo."; Dorsey; Marsh conta | fio emendado | intro | CP-A |
| Avanço limitado | `obj_m29_support_advance` | flanquear; confirmar antes; cobrir a demolição | Cole "Confirma antes."; MG recua; equipa sela | cavernas seladas | A | CP-B |
| Sinalizado | `obj_m29_open_corridor` / `restrain_tully` | abrigar; tronco a dois; pranchas; mão no ombro | Dorsey; Cole (fixo); Tully; Gray; Marsh | pranchas; maca desce | 14:08 | CP-C; `cole_status`; `tully_restrained` |
| Passagem de suprimento | `obj_m29_supply_passage` | posicionar; fita; contar | Royce nomeia Brooks; carregadores | fita | C | `brooks_in_command` |
| 29 de maio | (cutscene day2) | olhar | Dorsey; Marsh; Tully | buraco vazio | night | CP-D |
| O castelo; o limite | `obj_m29_verify` / `castle` / `sector_limit` / `consolidate` | avançar com ligação; verificar; subir; parar; posicionar; ligar | Ruiz/Prado estafeta; A/1/5 ao longe; a 77.ª por rádio | — | D | CP-E; `sector_limit_respected` |
| A carta | (outro) | skip | Gray "Próximo."; Marsh dobra; Tully | carta enlameada | consolidated | `m29.completed`; `marsh_letter_muddy` |

---

## 12. Revisão crítica (0–10)

| # | Critério | Nota | Justificação / fragilidade |
| --- | --- | --- | --- |
| 1 | História | 9 | a retirada do outro como "vitória"; Cole sem retorno; a carta que não se limpa. |
| 2 | Autenticidade | 9 | S-C08 preciso (10:15; a 77.ª; cancelamento por rádio); companhia/rota P-C29; a bandeira só no debrief. |
| 3 | Personagens | 10 | os quatro de M08 fecham em três estados; Cole ouvido de perto; Tully lê M26. |
| 4 | Diálogos | 9 | "Não falem com ele. Falem comigo." / "Para sul. Onde a gente ainda não foi." / "É isto. Posições." |
| 5 | Originalidade | 8 | abrir fisicamente um corredor na lama como resposta a um ferimento; parar no limite de setor como clímax. |
| 6 | Variedade | 9 | ouvir de perto, trilhos, gargalo, emendar, cobrir macas, flanquear, confirmar, tronco, pranchas, mão no ombro, fita, verificar, parar, ligar. |
| 7 | Set pieces | 9 | "Sinalizado" é o mais duro da campanha sem ser espetáculo. |
| 8 | Atmosfera | 10 | chuva por superfície; a lona; o castelo quase em silêncio. |
| 9 | Environmental storytelling | 9 | a carta, o fio, a cozinha com arroz frio (eco de M08), o buraco vazio. |
| 10 | Cinematográfica | 9 | a maca pelo corredor; Marsh a esfregar com a manga. |
| 11 | Sonora | 10 | chuva na lona sobreposta a veículos; três assobios; "Ninguém." |
| 12 | Impacto emocional | 10 | Cole. |
| 13 | Ritmo | 8 | 24–32 min; dois dias com `readyScale`. |
| 14 | Continuidade | 10 | lê M08/M26; fixa `cole_status`; a carta vai a M30 por enviar; Gray no epílogo. |
| 15 | Integração técnica | 7 | chuva/lama reutilizam M21/M27; limite de setor [C] simples; o resto [A]/[B]. |

**Correções aplicadas:** (1) a fala de Cole acontece antes do ferimento, que é sinalizado (três assobios) e fixo em todos os ramos; (2) a esquadra chega às ruínas depois de A/1/5 e a bandeira nunca é encenada (só debrief com fonte); (3) a artilharia da 77.ª nunca atinge o jogador e a confirmação chega sempre — o jogo pede paragem, não castigo; (4) Tully reage conforme `m26.tully_deescalated` e nunca morre; (5) Gray nunca segue o jogador e "Ainda há gente chegando." é estado, não só fala; (6) o eco de M08 (arroz) é frio em vez de morno; (7) Dorsey e Royce são propostas deste dossiê a acrescentar a CONTINUITY §4.
