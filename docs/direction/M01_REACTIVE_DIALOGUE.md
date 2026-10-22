# M01 — Diálogo reativo de combate (rascunho de dados, dlg_m01_100–154)

**Estado:** LIGADO no ramo `claude/busy-ritchie-3fkvk2-dlgwire` (emenda 10 do golden, delta `dialogue`; ver §7). Os dados vivem em `missions/m01-tczew/mission.json` (cada fala tem uma regra `bark`; o bloco global é `barks`), o realizador em `src/game/m01-barks.js` e a fila em `M01Simulation.line()`. As secções 0 a 6 são o texto original da revisão (rascunho de dados) e ficam como história; onde divergem do jogo, vale a §7. Não integrada na `main`, sem playtest.
**Base:** worktree `dlg`, 98f094f. Gatilhos verificados nos ramos `-combat` (178060f), `-pacing` (3fac80e) e `-npc` (c61ce98). Fonte criativa: Fable 5.1 (PR #56: `M01-DIALOGUE-PRODUCTION-SCRIPT.md`, `M01-CHARACTER-BIBLE.md`) e a análise de lacunas FABLE_GAP (§2 contradições, §4 diálogo reativo). Escrita original; nenhuma fala, nome ou cena de Call of Duty.

## 0. Regras de escrita e de ligação

1. **Correção T47.** A ckm wz.30 DISPARA toda a manhã (04:46–06:09:30). Nenhuma fala diz que "nunca disparou". As falas Fable 190–194 foram reescritas em 116–119 ("a arma que falou a manhã toda vai com eles"). Posto da ckm = S2 (7,17;−3;26), abrigo de sacos no encontro oeste, não casamata.
2. **Cooldowns em `clock` (tempo real de jogo), nunca em `battleClock`.** O pacing comprime `battleClock` 24x/27x; um cooldown de 60 s em `battleClock` dispararia a cada 2–3 s reais.
3. **Fila FIFO.** `line(id,token)` não tem prioridade nem variantes. Anti-repetição = token `id:slot`, com `slot = floor(clock/CD)`; máximo de repetições = token `id:n` contado. As variantes são ids próprios (cada alternativa é uma fala) e rodam por `floor(clock/N) % k`. Nenhuma chave nova em JSON; o grupo e o CD vivem só neste documento.
4. **Comprimento.** Prioridade 1 (perigo): <= 6 palavras PT (excepção consciente: 148, 8 palavras, fala Fable já aprovada, não é de perigo). `duration = max(2,5; chars/24)`, até 6 s.
5. **Silêncios.** Nunca durante `scene`, `germanSilence()` (06:10–06:11), `m01-blast demolition` leste t0–8,5 s e oeste t0–11 s, nem na chamada final. Máximo 2 vozes em simultâneo (regra de `callouts.note`).
6. **Regra B4 preservada (verificada, não só afirmada).** A carga oeste espera Bąk entregue ao socorrista: é um gate de `readiness`, não uma fala. Nenhuma fala manda ir para oeste antes da demolição leste e do corredor. 149 (~06:04–06:08, depois de `finish(rescue_bak)`) diz ao jogador para VOLTAR à secção, como a mensagem de HUD "volte à secção"; 151 (~06:30) só avisa que a carga espera Bąk enquanto Dudek o leva à estação.
7. **Vozes.** Jan conta; Zieliński diz "depois" e nunca "morto", ordens de 3–4 palavras; Krawiec nunca explica; Kowal fala em números e distâncias; Bąk ri antes do perigo; Dudek estanca/carrega, nunca "cura"; Pawlak diz as horas. Sem elogio ao jogador (Fable §6): Kowal corrige, Zieliński manda mudar.
8. **Polaco.** Registo militar 1939: *Padnij!*, *Sanitariusz!*, *panie kapralu*, *cekaem* (sempre; nunca "MG"), *przęsło*, *kratownica*, *dworzec*, *wał* (dique). Palavrão máximo: *psiakrew*. Sem anglicismos. Referência de gravação a rever por falante nativo.
9. **Legendas** em português no registo de `mission.json` ("você", "trem", "Cubro você!").
10. **Pontos de referência usados** (só os que `map-layout.json` nomeia): portões e portal de Lisewo, dique norte/sul, trem 963 (vagões), tabuleiro, treliças (`cv_road_truss_*`), portal rodoviário/ferroviário (`cv_portal_*`), torres (`cv_tower_p1_*`), estação, aterro oeste. **Posto de sinais ("signal box")**: o mapa não tem nenhum; não há fala que o cite.

## 1. Eventos e estados em que as falas se apoiam (nomes exactos)

**Eventos que existem** (`this.emit`, `src/game/m01-simulation.js` nos ramos): `enemy-fire {origin,rounds,interval,weapon,at}`; `ally-fire {by,weapon,rounds,interval,at}` (ckm, T47); `round-impact {kind,by,point,material,crack,distance,pass,victim,pinned}`; `player-hit`; `player-shot {hit,weapon}`; `reload`; `npc-shot {weapon,rounds}`; `m01-blast {kind: grenade|demolition|bomb|shell, soundAt}`; `distant-shot`; `complete`; `checkpoint`.

**Estado só de leitura (poll, sem evento):** `a.ai.peek`, `a.ai.shakenUntil`, `a.ai.pinnedUntil` (-combat: "no callout events"); `a.suppressedUntil`; `a.ckm.phase` (`idle|aim|feed|fire_burst|abandon|retreat`); `a.mg34Prone.phase` (`reload`, `fire_burst`); `timers.repairPins`, `timers.repairSuppressedUntil`, `timers.coverFire {at,by,z}`, `timers.kowalRounds`, `timers.holdAccessVisited`; `flags['m01.suggested_cover']`, `flags['m01.bak_status']`; `player.carrying`; `threat.recentFire/inFlight/mgSuppressed`; `consumedEvent(...)`; `readiness(...)`; `germanSilence()`.

**Pacing (-pacing):** `objectiveMarker` (label/ponto/distância), `activeCompression`, `HOLD_AREA`, `mission.status`; **NPC (-npc):** `a.nav` (rotas), sem eventos novos.

**Nota sobre baixas:** `round-impact.victim` é sempre uma baixa letal de um homem `pl_east_*` no tabuleiro (06:00–06:10); as baixas de `landAttrition` (a ~1000 m em `hold_access`) não emitem e ficam sem fala, de propósito (o jogador nunca as vê).

**NÃO existem (marcados `NEEDS_EVENT`):** `enemy_down_by_player` (`fire()` só põe `a.state='DOWN'`), `platoon_man_crossed`. *(Actualização 2026-10-22: `ckm_stoppage` e `ckm_stoppage_cleared` passaram a existir, a ckm encrava duas vezes por rota — §7c; `enemy_down_by_player` existe desde a fatia 2.)* (Não existem granadas alemãs: 139 foi reaproveitada para `Padnij!` por estalo.)

## 2. Falas por gatilho

### A. Aliado atingido / caído (6)

| ID | Falante | Polaco (original) / Legenda PT | Gatilho | Condições | CD clock / Pri / Máx | Grupo de variantes | Ref. Fable/GAP | Marcas |
|---|---|---|---|---|---|---|---|---|
| 100 | `generic_rifleman` | *Trafili go! Sanitariusz!*<br>Acertaram ele! Sanitário! | round-impact (victim != null) | round-impact.victim é SEMPRE uma baixa letal de homem do pelotão leste (pl_east_*) no tabuleiro (06:00–06:10), nunca ferimento nem homem da secção; os homens gritam por sanitário na mesma; jogador <= 40 m; fora de scene/germanSilence; substitui o callout ally_hit "Sanitário!"; não toca se ally_hit tocou há < 15 s | 20 s / 1 / 3 | ally_hit (100/101) | callout ally_hit; GAP 108 |  |
| 101 | `generic_rifleman` | *Ranny! Mamy rannego!*<br>Ferido! Temos um ferido! | round-impact (victim != null) | idem (só cover_withdrawal activo); alterna com 100 por (n pedidos mod 2); substitui ally_hit; não toca se ally_hit ou 100 tocaram há < 15 s | 20 s / 1 / 3 | ally_hit (100/101) | callout ally_hit |  |
| 102 | `szymon_kowal` | *Jeden padł. Na moście.*<br>Um caiu. Na ponte. | round-impact (victim != null) | cover_withdrawal activo; vítima pl_east_* no tabuleiro perto do jogador (as baixas de landAttrition ocorrem a ~1000 m em hold_access e não emitem: ficam de fora); jogador <= 80 m | 25 s / 2 / 3 | ally_down (102/103) | — |  |
| 103 | `marek_zielinski` | *Zostaw. Potem.*<br>Deixe. Depois. | round-impact (victim != null) | 5 s depois de 102; cover_withdrawal activo; só se o jogador estiver parado (|v|<0,5 m/s); Zieliński diz "depois", nunca "morto" | 40 s / 2 / 2 | ally_down (102/103) | Fable CHR (Zieliński) |  |
| 104 | `leon_dudek` | *Trzymaj opatrunek. Jestem.*<br>Segure o curativo. Estou aqui. | evt_m01_bak_wounded (seguimento de 042) | Dudek vivo, 4 s depois de 042; Bąk no chão em bak_wound_point. (Não ligar a round-impact.victim: Dudek está no aid_position ou com Bąk a partir das 06:04) | única / 2 / 1 | medic_answer (104/108) | — |  |
| 105 | `marek_zielinski` | *Wrona! Trafiony? Odpowiedz!*<br>Wrona! Foi atingido? Responda! | player-hit | Zieliński vivo <= 30 m; jogador health < 100 após o golpe | 25 s / 1 / 3 | player_hit | — |  |

### B. Chamada do socorrista (4)

| ID | Falante | Polaco (original) / Legenda PT | Gatilho | Condições | CD clock / Pri / Máx | Grupo de variantes | Ref. Fable/GAP | Marcas |
|---|---|---|---|---|---|---|---|---|
| 106 | `generic_rifleman` | *Sanitariusz, tutaj! Szybko!*<br>Sanitário, aqui! Rápido! | round-impact (victim != null) ou bak_wounded (evt_m01_bak_wounded) | 2.ª chamada em diante na mesma baixa (token por vítima), <= 40 m; round-impact.victim = baixa do pelotão leste; não repete 042 (Bąk); substitui ally_hit na 2.ª chamada; não toca se ally_hit tocou há < 15 s | 15 s / 1 / 2 | medic_call (106/107) | callout ally_hit (2.ª) |  |
| 107 | `generic_rifleman` | *Sanitariusz! Do mnie!*<br>Sanitário! Aqui comigo! | idem | alterna com 106; idem 106 | 15 s / 1 / 2 | medic_call (106/107) | — |  |
| 108 | `leon_dudek` | *Idę! Nie ruszajcie go!*<br>Já vou! Não mexam nele! | evt_m01_dudek_retrieves_bak | Dudek vivo e activo; 2 s depois do evento (a seguir a Zieliński mandar Dudek ir); só se o jogador não leva Bąk | única / 2 / 1 | medic_answer (104/108) | — |  |
| 109 | `leon_dudek` | *Za pas, nie za rękę.*<br>Pelo cinto, não pelo braço. | player.carrying === jozef_bak | Dudek <= 25 m; 8 s depois de 146; só 1.ª carga | única / 2 / 1 | carry_help | Fable 121 (reformulada) |  |

### C. Metralhadora pesada ckm wz.30 (tiro, fita, recarga, movimento) (10)

| ID | Falante | Polaco (original) / Legenda PT | Gatilho | Condições | CD clock / Pri / Máx | Grupo de variantes | Ref. Fable/GAP | Marcas |
|---|---|---|---|---|---|---|---|---|
| 110 | `ckm_gunner` | *Seria po wale!*<br>Rajada no dique! | ally-fire (by ckm_gunner, one per burst) | só as 2 primeiras rajadas da manhã, prioridade mínima (cede a qualquer outra fala); jogador <= 60 m; alterna 110/111 | 120 s / 3 / 2 | ckm_fire (110/111) | — |  |
| 111 | `ckm_gunner` | *Ognia na bramę!*<br>Fogo no portão! | ally-fire (by ckm_gunner) | timers.coverFire.by é gateShooter; senão fica mudo; jogador <= 60 m | 60 s / 3 / 4 | ckm_fire (110/111) | — |  |
| 112 | `ckm_gunner` | *Taśma się kończy!*<br>A fita está acabando! | ckm.phase → feed (troca real de fita, belt < CKM_BURST_ROUNDS) | jogador <= 60 m; não durante germanSilence | 90 s / 2 / 3 | ckm_belt (112/113) | — |  |
| 113 | `ckm_loader` | *Nowa taśma! Gotowe!*<br>Fita nova! Pronto! | ckm.phase feed → aim (CKM_FEED_SEC acabou) | segue 112 (token do mesmo slot); amunicyjny (ckm_loader) | 90 s / 3 / 3 | ckm_belt (112/113) | — |  |
| 114 | `ckm_gunner` | *Zacięcie! Przeładować!*<br>Travou! Recarregar! | ckm_stoppage (evento da simulação, um por encravamento) | **Ligada em 2026-10-22** (§7c): a ckm encrava duas vezes por rota (`CKM_STOPPAGES` em `src/game/m01-simulation.js`); jogador <= 60 m do atirador; passa pelo intervalo (6 s), orçamento (7 em 60 s) e vozes do realizador como qualquer outra fala | 20 s / 2 / 3 | — | — | era NEEDS_EVENT:ckm_stoppage |
| 115 | `ckm_loader` | *Jest. Strzelaj!*<br>Pronto. Atire! | ckm_stoppage_cleared (o municiador desencravou) | **Ligada em 2026-10-22** (§7c): segue 114 (`after` 0–8 s depois de a 114 ir para o ecrã; sem 114 não se diz); jogador <= 60 m do municiador; prioridade 3: orçamento de 5 falas em 60 s, a própria 114 conta uma | — / 3 / 3 | — | — | era NEEDS_EVENT:ckm_stoppage_cleared |
| 116 | `ckm_gunner` | *Zabieramy go. Za mną!*<br>Levamos ela. Comigo! | ckm.phase → abandon | guarnição viva; jogador <= 60 m; só 1 vez. Reescreve Fable 190: a ckm DISPAROU toda a manhã (T47) | única / 1 / 1 | ckm_move | Fable 190; GAP 117 |  |
| 117 | `ckm_loader` | *Wylej wodę. Skrzynki. Idziemy.*<br>Esvazie a água. Caixas. Vamos. | ckm.phase abandon + 1,5 s | refrigeração a água do wz.30; segue 116 | única / 3 / 1 | ckm_move | Fable 191 |  |
| 118 | `ckm_reserve` | *Panie kapralu, nasypem na zachód?*<br>Cabo, pelo aterro para oeste? | ckm.phase → retreat | jogador <= 12 m da ckm; o retreat real do sim vai para oeste ao longo do aterro (z 22..26, até x ≈ −170 e ao ponto de reunião), NÃO para a estação | única / 3 / 1 | ckm_move | Fable 193 (reescrita) |  |
| 119 | `ckm_gunner` | *Nasypem. Stamtąd też strzela.*<br>Pelo aterro. De lá também atira. | 118 + 2 s | par de 118; ckm_gunner | única / 2 / 1 | ckm_move | Fable 194 (reescrita); GAP 118 |  |

### D. MG34 a suprimir-nos / reparo sob fogo (9)

| ID | Falante | Polaco (original) / Legenda PT | Gatilho | Condições | CD clock / Pri / Máx | Grupo de variantes | Ref. Fable/GAP | Marcas |
|---|---|---|---|---|---|---|---|---|
| 120 | `szymon_kowal` | *Cekaem z wału! Głowy nisko!*<br>Metralhadora do dique! Cabeças baixas! | enemy-fire (weapon mg34) + round-impact.pinned não vazio | Kowal <= 40 m; o callout co_m01_enemy_mg_fire_on_squad cobre a 1.ª ocorrência; esta fala só a 2.ª em diante; não toca se co_m01_enemy_mg_fire_on_squad tocou há < 30 s | 45 s / 1 / 4 | mg34_fire (120/121) | GAP 104 / Fable 130 |  |
| 121 | `jozef_bak` | *Ha… psiakrew, blisko.*<br>Ha… raios, foi perto. | round-impact (crack, distance <= 6 m) | Bąk vivo <= 20 m e antes de bak_wounded; alterna 121/139 por floor(clock/12)%2 | 30 s / 2 / 4 | mg34_crack (121) | Fable 135 (variante Bąk; 139 = variante Kowal) |  |
| 122 | `marek_zielinski` | *Czekać na przerwę!*<br>Esperem a pausa! | mg34Prone.phase === fire_burst (rajada de grupo aberta) | jogador em cobertura (cv_*); só activo em cover_repair e hold_access | 60 s / 2 / 3 | mg34_burst (122) | — |  |
| 123 | `szymon_kowal` | *Ładuje! Teraz!*<br>Ele recarrega! Agora! | mg34Prone.phase === reload (carregador a trocar, 4,8 s) | MG34 de portão com LOS ao jogador; alterna 123/124 | 40 s / 1 / 4 | mg34_reload (123/124) | novo (combat: reload-aware) |  |
| 124 | `marek_zielinski` | *Przerwa! Strzelaj!*<br>Pausa! Atire! | idem | alterna com 123; só 1 em cada janela reload (token por startedAt) | 40 s / 1 / 4 | mg34_reload (123/124) | novo |  |
| 125 | `pawel_krawiec` | *Głowy nisko!*<br>Cabeças baixas! | timers.repairPins >= 2 | cover_repair activo; sapadores a <6 m do site | 30 s / 1 / 3 | repair_pins (125/126) | GAP 100 / Fable 121 |  |
| 126 | `sapper_3` | *Tylko nie znowu…*<br>Outra vez não… | timers.repairPins === 3 | sapper_3 vivo e activo | única / 2 / 1 | repair_pins (125/126) | GAP 101 / Fable 202 |  |
| 127 | `pawel_krawiec` | *Trzy… cztery… teraz.*<br>Três… quatro… agora. | timers.repairSuppressedUntil expira com repairPins >= 1 | cover_repair activo | 25 s / 2 / 3 | repair_resume (127) | GAP 102 / Fable 120 |  |
| 139 | `szymon_kowal` | *Padnij!*<br>Abaixa! | round-impact (crack, distance <= 6 m do jogador) | Kowal vivo <= 25 m; alterna 121/139 por floor(clock/12)%2 | 12 s / 1 / 6 | mg34_crack (121/139) | GAP 105 / Fable 135 |  |

### E. Inimigo a espreitar / localizado (callouts com pontos de referência) (10)

| ID | Falante | Polaco (original) / Legenda PT | Gatilho | Condições | CD clock / Pri / Máx | Grupo de variantes | Ref. Fable/GAP | Marcas |
|---|---|---|---|---|---|---|---|---|
| 128 | `szymon_kowal` | *Błysk przy bramie!*<br>Clarão no portão! | threat.recentFire (age < 2,5 s) em gateShooter | origem nos portões de Lisewo; 2.ª ocorrência em diante; jogador <= 80 m; não toca se co_m01_enemy_mg_fire_on_squad tocou há < 30 s | 90 s / 1 / 3 | located (128-131) | GAP 104; callout enemy_mg_fire_on_squad |  |
| 129 | `szymon_kowal` | *Błysk przy wagonach!*<br>Clarão junto aos vagões! | threat.recentFire junto ao trem 963 (vagões) | origem a menos de 25 m do trem 963 parado; idem | 90 s / 1 / 3 | located (128-131) | — |  |
| 130 | `szymon_kowal` | *Na lewo od bramy!*<br>À esquerda do portão! | timers.coverFire (origem nos portões, à esquerda do portão vista do jogador) | coverFire.age < 8 s (era «< 3 s» no rascunho; os dados usam 8 s, a janela da linha de HUD `coverFireStatus`, que diz o mesmo; ver §7, revisão N3); lado = sinal do produto vectorial (direcção do jogador para o portão x origem), como directionTo; não toca se co_m01_enemy_mg_fire_on_squad tocou há < 30 s | 45 s / 1 / 4 | located (128-131) | HUD coverFireStatus (texto) |  |
| 131 | `szymon_kowal` | *Na prawo od bramy!*<br>À direita do portão! | timers.coverFire (origem nos portões, à direita do portão vista do jogador) | idem 130 | 45 s / 1 / 4 | located (128-131) | idem |  |
| 132 | `marek_zielinski` | *Wychyla się. Czekaj.*<br>Ele se debruça. Espere. | ai.peek > 0 num grp_de_east com LOS ao jogador | jogador sem aim há 3 s; 1.ª vez por sessão e depois cd | 45 s / 2 / 3 | peek (132/133) | novo (combat: peeks) |  |
| 133 | `szymon_kowal` | *Schował się. Zaraz wróci.*<br>Escondeu-se. Já volta. | ai.peek passa de > 0 a 0 (peek fechado) | LOS ao jogador existiu nos últimos 2 s | 60 s / 3 / 3 | peek (132/133) | novo |  |
| 134 | `marek_zielinski` | *Dwóch przy bramie!*<br>Dois no portão! | >= 2 enemies com ai.peek > 0 em simultâneo | gateShooter; jogador <= 80 m | 60 s / 1 / 3 | located (134) | novo |  |
| 135 | `szymon_kowal` | *Niemcy na przęsłach! W kratownicy!*<br>Alemães no tabuleiro! Na treliça! | consumedEvent(germans_on_east_spans) + enemy-fire de grp_de_spans | uma vez por rajada longa; depois de 06:00 e antes da demolição leste | 30 s / 1 / 3 | located (135) | HUD Pelotão leste: alemães no tabuleiro |  |
| 136 | `marek_zielinski` | *Do portalu! Za filar!*<br>Ao portal! Atrás do pilar! | flags[m01.suggested_cover] = cv_portal_* | rotação real de cobertura (já emitida); substitui 035 nesse nó; substitui 035 nesse nó; 035 não toca se 136/137 tocou há < 20 s (e vice-versa) | 20 s / 1 / 4 | cover_node (136/137) | Fable 114b |  |
| 137 | `marek_zielinski` | *Za kratownicę! Czołgaj się!*<br>Atrás da treliça! Rasteje! | flags[m01.suggested_cover] = cv_road_truss_* | idem; substitui 035 nesse nó; 035 não toca se 136/137 tocou há < 20 s (e vice-versa) | 20 s / 1 / 4 | cover_node (136/137) | Fable 114c |  |

### F. Granada (1)

| ID | Falante | Polaco (original) / Legenda PT | Gatilho | Condições | CD clock / Pri / Máx | Grupo de variantes | Ref. Fable/GAP | Marcas |
|---|---|---|---|---|---|---|---|---|
| 138 | `szymon_kowal` | *Granat! Padnij!*<br>Granada! Abaixem! | m01-blast kind grenade (granada do jogador) ou grenades.active com id m01_grenade_* | só o jogador lança granadas hoje: aviso quando há aliados <= 12 m do ponto de queda; 1 s antes de soundAt | 20 s / 1 / 4 | grenade (138) | GAP 110 | NOTE: só granada do jogador; não há granadas alemãs |

### G. Tiro certeiro / alemão abatido pelo jogador (sem elogio) (4)

| ID | Falante | Polaco (original) / Legenda PT | Gatilho | Condições | CD clock / Pri / Máx | Grupo de variantes | Ref. Fable/GAP | Marcas |
|---|---|---|---|---|---|---|---|---|
| 140 | `szymon_kowal` | *Dostał. Zmień stanowisko.*<br>Pegou. Mude de posição. | player-shot (hit: true) | alvo inimigo; 1 em cada 3 acertos; Kowal <= 40 m | 25 s / 2 / 4 | player_hit_enemy (140/141) | — |  |
| 141 | `szymon_kowal` | *Jeden mniej przy bramie. Zmień stanowisko.*<br>Um a menos no portão. Mude de posição. | NEEDS_EVENT:enemy_down_by_player | fire() só põe a.state=DOWN; sem emit | 30 s / 2 / 4 | player_hit_enemy (140/141) | — | NEEDS_EVENT:enemy_down_by_player |
| 142 | `marek_zielinski` | *Wrona. Nie licz. Zmień stanowisko.*<br>Wrona. Não conte. Mude de posição. | NEEDS_EVENT:enemy_down_by_player | 2.º abate seguido em < 20 s; eco de 048 | 60 s / 2 / 2 | player_hit_enemy (142) | Fable §6 (sem elogio) | NEEDS_EVENT:enemy_down_by_player |
| 143 | `szymon_kowal` | *Cekaem ucichł. Do roboty!*<br>A metralhadora calou. Trabalhem! | de_east_0/1.suppressedUntil por tiro do jogador (state) | cover_repair activo; recordSuppression regista o instante; não toca se co_m01_enemy_group_suppressed (109) tocou há < 10 s | 20 s / 1 / 4 | mg_silenced (143) | GAP 103 / Fable 132 |  |

### H. Progresso de objetivos (reparo, defesa da ponte, Bąk ao socorrista) (6)

| ID | Falante | Polaco (original) / Legenda PT | Gatilho | Condições | CD clock / Pri / Máx | Grupo de variantes | Ref. Fable/GAP | Marcas |
|---|---|---|---|---|---|---|---|---|
| 144 | `pawel_krawiec` | *Połowa. Nie cieszcie się.*<br>Metade. Não comemorem. | cover_repair.progress >= 50 | uma vez; Krawiec activo | única / 2 / 1 | repair_half (144) | Fable 122 |  |
| 145 | `marek_zielinski` | *Trzymamy ten przyczółek. Do rozkazu.*<br>Seguramos esta cabeça de ponte. Até a ordem. | active(hold_access) e timers.holdAccessVisited, jogador dentro de HOLD_AREA | activeCompression com razão hold_in_position (m01-pacing COMPRESS_WHEN) ou inside(player,HOLD_AREA); antes de 06:00; uma vez | única / 2 / 1 | hold (145) | pacing HOLD_AREA |  |
| 146 | `jozef_bak` | *Nie upuść mnie.*<br>Não me deixe cair. | player.carrying = jozef_bak | pickup; 1.ª vez | única / 1 / 1 | carry_bak (146) | GAP 120 / Fable 143 |  |
| 147 | `leon_dudek` | *Tu, za portal drogowy!*<br>Aqui, atrás do portal da estrada! | player.carrying = jozef_bak e dist(aid_position) > 20 m | Dudek activo; repete por floor(clock/25); substitui mensagem de HUD a cada 7 s | 25 s / 1 / 4 | carry_guide (147) | objectiveMarker "Dudek com Bąk" |  |
| 148 | `leon_dudek` | *Nie patrz na nogę. Patrz na mnie.*<br>Não olhe para a perna. Olhe para mim. | finish(rescue_bak) | uma vez | única / 1 / 1 | bak_delivered (148) | GAP 121 / Fable 150 |  |
| 149 | `marek_zielinski` | *Bąk u Dudka. Wracaj.*<br>Bąk está com Dudek. Volte. | finish(rescue_bak) + 3 s | ~06:04–06:08: manda o jogador voltar à secção (o HUD já diz "volte à secção"). NÃO manda ir para oeste: o avanço oeste vem depois da demolição leste e do corredor; B4 é um gate de readiness, não uma fala | única / 1 / 1 | bak_delivered (149) | novo |  |

### I. Corredor e avisos de demolição (3)

| ID | Falante | Polaco (original) / Legenda PT | Gatilho | Condições | CD clock / Pri / Máx | Grupo de variantes | Ref. Fable/GAP | Marcas |
|---|---|---|---|---|---|---|---|---|
| 150 | `jan_wrona` | *[n]. Liczę dalej.*<br>{n}. Continuo contando. | dlg_m01_049 + 25 s (sem evento novo) | {n} = m01.east_platoon_survivors por extenso, como 047/049; hold_corridor; pelo menos 1 homem pl_east_* ainda a passar (x > −275); uma vez | única / 2 / 1 | corridor_count (150) | GAP 122; Fable platoon_count |  |
| 151 | `marek_zielinski` | *Czekamy na Bąka.*<br>Esperamos o Bąk. | consumedEvent(east_demolition) e !readiness(west_demolition) só por causa de Bąk | predicado real (readiness west_demolition): east_demolition consumido && player.x < −90 && todos os aliados não civis x < −90 && !bak.carry && !bak.carriedBy. A fala toca quando os 3 primeiros são verdadeiros e Bąk ainda carry/carriedBy (Dudek a levá-lo); ordem curta de Zieliński, não Krawiec; antes de 050 | 60 s / 1 / 2 | west_wait (151) | regra B4 |  |
| 152 | `sapper_2` | *Zapalarka gotowa, panie kapralu.*<br>Acendedor pronto, cabo. | readiness(west_demolition) verdadeiro | readiness(west_demolition) passa a verdadeiro; antes de 050; uma vez | única / 2 / 1 | west_ready (152) | Fable 200 (variante) |  |

### J. Momentos calmos (2)

| ID | Falante | Polaco (original) / Legenda PT | Gatilho | Condições | CD clock / Pri / Máx | Grupo de variantes | Ref. Fable/GAP | Marcas |
|---|---|---|---|---|---|---|---|---|
| 153 | `szymon_kowal` | *Cicho. Za cicho.*<br>Quieto. Quieto demais. | threat.recentFire vazio, threat.inFlight 0 e silêncio aliado (sem ally-fire/npc-shot/player-shot há 15 s) | só em hold_corridor e depois de germanSilence() (battleClock > 06:11); >= 20 s de clock sem fogo; fora de cenas | 90 s / 3 / 2 | quiet (153/154) | novo |  |
| 154 | `jozef_bak` | *Wrona, która godzina?*<br>Wrona, que horas são? | threat.recentFire vazio e silêncio aliado (sem ally-fire/npc-shot/player-shot há 15 s) | Bąk vivo e antes de bak_wounded (06:04); fases hold_access/cover_repair; fora de cenas e silêncios | 90 s / 3 / 2 | quiet (153/154) | Fable 140/141 |  |

## 3. Bloco JSON (forma exacta de `mission.json → dialogue`)

Mesmas chaves das entradas existentes (`id, speaker, text, context, priority` + `note`, já usada em 033). `text` = legenda PT; o polaco vai em `note`. Todos os `speaker` são ids de `cast` (teste `m01-tczew-data`), nenhum id colide com 001–067.

```json
[
  {
    "id": "dlg_m01_100",
    "speaker": "generic_rifleman",
    "text": "Acertaram ele! Sanitário!",
    "context": "reativa; round-impact (victim != null)",
    "priority": 1,
    "note": "PL: Trafili go! Sanitariusz!"
  },
  {
    "id": "dlg_m01_101",
    "speaker": "generic_rifleman",
    "text": "Ferido! Temos um ferido!",
    "context": "reativa; round-impact (victim != null)",
    "priority": 1,
    "note": "PL: Ranny! Mamy rannego!"
  },
  {
    "id": "dlg_m01_102",
    "speaker": "szymon_kowal",
    "text": "Um caiu. Na ponte.",
    "context": "reativa; round-impact (victim != null)",
    "priority": 2,
    "note": "PL: Jeden padł. Na moście."
  },
  {
    "id": "dlg_m01_103",
    "speaker": "marek_zielinski",
    "text": "Deixe. Depois.",
    "context": "reativa; round-impact (victim != null)",
    "priority": 2,
    "note": "PL: Zostaw. Potem."
  },
  {
    "id": "dlg_m01_104",
    "speaker": "leon_dudek",
    "text": "Segure o curativo. Estou aqui.",
    "context": "reativa; evt_m01_bak_wounded (seguimento de 042)",
    "priority": 2,
    "note": "PL: Trzymaj opatrunek. Jestem."
  },
  {
    "id": "dlg_m01_105",
    "speaker": "marek_zielinski",
    "text": "Wrona! Foi atingido? Responda!",
    "context": "reativa; player-hit",
    "priority": 1,
    "note": "PL: Wrona! Trafiony? Odpowiedz!"
  },
  {
    "id": "dlg_m01_106",
    "speaker": "generic_rifleman",
    "text": "Sanitário, aqui! Rápido!",
    "context": "reativa; round-impact (victim != null) ou bak_wounded (evt_m01_bak_wounded)",
    "priority": 1,
    "note": "PL: Sanitariusz, tutaj! Szybko!"
  },
  {
    "id": "dlg_m01_107",
    "speaker": "generic_rifleman",
    "text": "Sanitário! Aqui comigo!",
    "context": "reativa; idem",
    "priority": 1,
    "note": "PL: Sanitariusz! Do mnie!"
  },
  {
    "id": "dlg_m01_108",
    "speaker": "leon_dudek",
    "text": "Já vou! Não mexam nele!",
    "context": "reativa; evt_m01_dudek_retrieves_bak",
    "priority": 2,
    "note": "PL: Idę! Nie ruszajcie go!"
  },
  {
    "id": "dlg_m01_109",
    "speaker": "leon_dudek",
    "text": "Pelo cinto, não pelo braço.",
    "context": "reativa; player.carrying === jozef_bak",
    "priority": 2,
    "note": "PL: Za pas, nie za rękę."
  },
  {
    "id": "dlg_m01_110",
    "speaker": "ckm_gunner",
    "text": "Rajada no dique!",
    "context": "reativa; ally-fire (by ckm_gunner, one per burst)",
    "priority": 3,
    "note": "PL: Seria po wale!"
  },
  {
    "id": "dlg_m01_111",
    "speaker": "ckm_gunner",
    "text": "Fogo no portão!",
    "context": "reativa; ally-fire (by ckm_gunner)",
    "priority": 3,
    "note": "PL: Ognia na bramę!"
  },
  {
    "id": "dlg_m01_112",
    "speaker": "ckm_gunner",
    "text": "A fita está acabando!",
    "context": "reativa; ckm.phase → feed (troca real de fita, belt < CKM_BURST_ROUNDS)",
    "priority": 2,
    "note": "PL: Taśma się kończy!"
  },
  {
    "id": "dlg_m01_113",
    "speaker": "ckm_loader",
    "text": "Fita nova! Pronto!",
    "context": "reativa; ckm.phase feed → aim (CKM_FEED_SEC acabou)",
    "priority": 3,
    "note": "PL: Nowa taśma! Gotowe!"
  },
  {
    "id": "dlg_m01_114",
    "speaker": "ckm_gunner",
    "text": "Travou! Recarregar!",
    "context": "reativa; NEEDS_EVENT:ckm_stoppage",
    "priority": 2,
    "note": "PL: Zacięcie! Przeładować! | NEEDS_EVENT:ckm_stoppage"
  },
  {
    "id": "dlg_m01_115",
    "speaker": "ckm_loader",
    "text": "Pronto. Atire!",
    "context": "reativa; NEEDS_EVENT:ckm_stoppage_cleared",
    "priority": 3,
    "note": "PL: Jest. Strzelaj! | NEEDS_EVENT:ckm_stoppage_cleared"
  },
  {
    "id": "dlg_m01_116",
    "speaker": "ckm_gunner",
    "text": "Levamos ela. Comigo!",
    "context": "reativa; ckm.phase → abandon",
    "priority": 1,
    "note": "PL: Zabieramy go. Za mną!"
  },
  {
    "id": "dlg_m01_117",
    "speaker": "ckm_loader",
    "text": "Esvazie a água. Caixas. Vamos.",
    "context": "reativa; ckm.phase abandon + 1,5 s",
    "priority": 3,
    "note": "PL: Wylej wodę. Skrzynki. Idziemy."
  },
  {
    "id": "dlg_m01_118",
    "speaker": "ckm_reserve",
    "text": "Cabo, pelo aterro para oeste?",
    "context": "reativa; ckm.phase → retreat",
    "priority": 3,
    "note": "PL: Panie kapralu, nasypem na zachód?"
  },
  {
    "id": "dlg_m01_119",
    "speaker": "ckm_gunner",
    "text": "Pelo aterro. De lá também atira.",
    "context": "reativa; 118 + 2 s",
    "priority": 2,
    "note": "PL: Nasypem. Stamtąd też strzela."
  },
  {
    "id": "dlg_m01_120",
    "speaker": "szymon_kowal",
    "text": "Metralhadora do dique! Cabeças baixas!",
    "context": "reativa; enemy-fire (weapon mg34) + round-impact.pinned não vazio",
    "priority": 1,
    "note": "PL: Cekaem z wału! Głowy nisko!"
  },
  {
    "id": "dlg_m01_121",
    "speaker": "jozef_bak",
    "text": "Ha… raios, foi perto.",
    "context": "reativa; round-impact (crack, distance <= 6 m)",
    "priority": 2,
    "note": "PL: Ha… psiakrew, blisko."
  },
  {
    "id": "dlg_m01_122",
    "speaker": "marek_zielinski",
    "text": "Esperem a pausa!",
    "context": "reativa; mg34Prone.phase === fire_burst (rajada de grupo aberta)",
    "priority": 2,
    "note": "PL: Czekać na przerwę!"
  },
  {
    "id": "dlg_m01_123",
    "speaker": "szymon_kowal",
    "text": "Ele recarrega! Agora!",
    "context": "reativa; mg34Prone.phase === reload (carregador a trocar, 4,8 s)",
    "priority": 1,
    "note": "PL: Ładuje! Teraz!"
  },
  {
    "id": "dlg_m01_124",
    "speaker": "marek_zielinski",
    "text": "Pausa! Atire!",
    "context": "reativa; idem",
    "priority": 1,
    "note": "PL: Przerwa! Strzelaj!"
  },
  {
    "id": "dlg_m01_125",
    "speaker": "pawel_krawiec",
    "text": "Cabeças baixas!",
    "context": "reativa; timers.repairPins >= 2",
    "priority": 1,
    "note": "PL: Głowy nisko!"
  },
  {
    "id": "dlg_m01_126",
    "speaker": "sapper_3",
    "text": "Outra vez não…",
    "context": "reativa; timers.repairPins === 3",
    "priority": 2,
    "note": "PL: Tylko nie znowu…"
  },
  {
    "id": "dlg_m01_127",
    "speaker": "pawel_krawiec",
    "text": "Três… quatro… agora.",
    "context": "reativa; timers.repairSuppressedUntil expira com repairPins >= 1",
    "priority": 2,
    "note": "PL: Trzy… cztery… teraz."
  },
  {
    "id": "dlg_m01_128",
    "speaker": "szymon_kowal",
    "text": "Clarão no portão!",
    "context": "reativa; threat.recentFire (age < 2,5 s) em gateShooter",
    "priority": 1,
    "note": "PL: Błysk przy bramie!"
  },
  {
    "id": "dlg_m01_129",
    "speaker": "szymon_kowal",
    "text": "Clarão junto aos vagões!",
    "context": "reativa; threat.recentFire junto ao trem 963 (vagões)",
    "priority": 1,
    "note": "PL: Błysk przy wagonach!"
  },
  {
    "id": "dlg_m01_130",
    "speaker": "szymon_kowal",
    "text": "À esquerda do portão!",
    "context": "reativa; timers.coverFire (origem nos portões, à esquerda do portão vista do jogador)",
    "priority": 1,
    "note": "PL: Na lewo od bramy!"
  },
  {
    "id": "dlg_m01_131",
    "speaker": "szymon_kowal",
    "text": "À direita do portão!",
    "context": "reativa; timers.coverFire (origem nos portões, à direita do portão vista do jogador)",
    "priority": 1,
    "note": "PL: Na prawo od bramy!"
  },
  {
    "id": "dlg_m01_132",
    "speaker": "marek_zielinski",
    "text": "Ele se debruça. Espere.",
    "context": "reativa; ai.peek > 0 num grp_de_east com LOS ao jogador",
    "priority": 2,
    "note": "PL: Wychyla się. Czekaj."
  },
  {
    "id": "dlg_m01_133",
    "speaker": "szymon_kowal",
    "text": "Escondeu-se. Já volta.",
    "context": "reativa; ai.peek passa de > 0 a 0 (peek fechado)",
    "priority": 3,
    "note": "PL: Schował się. Zaraz wróci."
  },
  {
    "id": "dlg_m01_134",
    "speaker": "marek_zielinski",
    "text": "Dois no portão!",
    "context": "reativa; >= 2 enemies com ai.peek > 0 em simultâneo",
    "priority": 1,
    "note": "PL: Dwóch przy bramie!"
  },
  {
    "id": "dlg_m01_135",
    "speaker": "szymon_kowal",
    "text": "Alemães no tabuleiro! Na treliça!",
    "context": "reativa; consumedEvent(germans_on_east_spans) + enemy-fire de grp_de_spans",
    "priority": 1,
    "note": "PL: Niemcy na przęsłach! W kratownicy!"
  },
  {
    "id": "dlg_m01_136",
    "speaker": "marek_zielinski",
    "text": "Ao portal! Atrás do pilar!",
    "context": "reativa; flags[m01.suggested_cover] = cv_portal_*",
    "priority": 1,
    "note": "PL: Do portalu! Za filar!"
  },
  {
    "id": "dlg_m01_137",
    "speaker": "marek_zielinski",
    "text": "Atrás da treliça! Rasteje!",
    "context": "reativa; flags[m01.suggested_cover] = cv_road_truss_*",
    "priority": 1,
    "note": "PL: Za kratownicę! Czołgaj się!"
  },
  {
    "id": "dlg_m01_138",
    "speaker": "szymon_kowal",
    "text": "Granada! Abaixem!",
    "context": "reativa; m01-blast kind grenade (granada do jogador) ou grenades.active com id m01_grenade_*",
    "priority": 1,
    "note": "PL: Granat! Padnij! | NOTE: só granada do jogador; não há granadas alemãs"
  },
  {
    "id": "dlg_m01_139",
    "speaker": "szymon_kowal",
    "text": "Abaixa!",
    "context": "reativa; round-impact (crack, distance <= 6 m do jogador)",
    "priority": 1,
    "note": "PL: Padnij!"
  },
  {
    "id": "dlg_m01_140",
    "speaker": "szymon_kowal",
    "text": "Pegou. Mude de posição.",
    "context": "reativa; player-shot (hit: true)",
    "priority": 2,
    "note": "PL: Dostał. Zmień stanowisko."
  },
  {
    "id": "dlg_m01_141",
    "speaker": "szymon_kowal",
    "text": "Um a menos no portão. Mude de posição.",
    "context": "reativa; NEEDS_EVENT:enemy_down_by_player",
    "priority": 2,
    "note": "PL: Jeden mniej przy bramie. Zmień stanowisko. | NEEDS_EVENT:enemy_down_by_player"
  },
  {
    "id": "dlg_m01_142",
    "speaker": "marek_zielinski",
    "text": "Wrona. Não conte. Mude de posição.",
    "context": "reativa; NEEDS_EVENT:enemy_down_by_player",
    "priority": 2,
    "note": "PL: Wrona. Nie licz. Zmień stanowisko. | NEEDS_EVENT:enemy_down_by_player"
  },
  {
    "id": "dlg_m01_143",
    "speaker": "szymon_kowal",
    "text": "A metralhadora calou. Trabalhem!",
    "context": "reativa; de_east_0/1.suppressedUntil por tiro do jogador (state)",
    "priority": 1,
    "note": "PL: Cekaem ucichł. Do roboty!"
  },
  {
    "id": "dlg_m01_144",
    "speaker": "pawel_krawiec",
    "text": "Metade. Não comemorem.",
    "context": "reativa; cover_repair.progress >= 50",
    "priority": 2,
    "note": "PL: Połowa. Nie cieszcie się."
  },
  {
    "id": "dlg_m01_145",
    "speaker": "marek_zielinski",
    "text": "Seguramos esta cabeça de ponte. Até a ordem.",
    "context": "reativa; active(hold_access) e timers.holdAccessVisited, jogador dentro de HOLD_AREA",
    "priority": 2,
    "note": "PL: Trzymamy ten przyczółek. Do rozkazu."
  },
  {
    "id": "dlg_m01_146",
    "speaker": "jozef_bak",
    "text": "Não me deixe cair.",
    "context": "reativa; player.carrying = jozef_bak",
    "priority": 1,
    "note": "PL: Nie upuść mnie."
  },
  {
    "id": "dlg_m01_147",
    "speaker": "leon_dudek",
    "text": "Aqui, atrás do portal da estrada!",
    "context": "reativa; player.carrying = jozef_bak e dist(aid_position) > 20 m",
    "priority": 1,
    "note": "PL: Tu, za portal drogowy!"
  },
  {
    "id": "dlg_m01_148",
    "speaker": "leon_dudek",
    "text": "Não olhe para a perna. Olhe para mim.",
    "context": "reativa; finish(rescue_bak)",
    "priority": 1,
    "note": "PL: Nie patrz na nogę. Patrz na mnie."
  },
  {
    "id": "dlg_m01_149",
    "speaker": "marek_zielinski",
    "text": "Bąk está com Dudek. Volte.",
    "context": "reativa; finish(rescue_bak) + 3 s",
    "priority": 1,
    "note": "PL: Bąk u Dudka. Wracaj."
  },
  {
    "id": "dlg_m01_150",
    "speaker": "jan_wrona",
    "text": "{n}. Continuo contando.",
    "context": "reativa; dlg_m01_049 + 25 s (sem evento novo)",
    "priority": 2,
    "note": "PL: [n]. Liczę dalej."
  },
  {
    "id": "dlg_m01_151",
    "speaker": "marek_zielinski",
    "text": "Esperamos o Bąk.",
    "context": "reativa; consumedEvent(east_demolition) e !readiness(west_demolition) só por causa de Bąk",
    "priority": 1,
    "note": "PL: Czekamy na Bąka."
  },
  {
    "id": "dlg_m01_152",
    "speaker": "sapper_2",
    "text": "Acendedor pronto, cabo.",
    "context": "reativa; readiness(west_demolition) verdadeiro",
    "priority": 2,
    "note": "PL: Zapalarka gotowa, panie kapralu."
  },
  {
    "id": "dlg_m01_153",
    "speaker": "szymon_kowal",
    "text": "Quieto. Quieto demais.",
    "context": "reativa; threat.recentFire vazio, threat.inFlight 0 e silêncio aliado (sem ally-fire/npc-shot/player-shot há 15 s)",
    "priority": 3,
    "note": "PL: Cicho. Za cicho."
  },
  {
    "id": "dlg_m01_154",
    "speaker": "jozef_bak",
    "text": "Wrona, que horas são?",
    "context": "reativa; threat.recentFire vazio e silêncio aliado (sem ally-fire/npc-shot/player-shot há 15 s)",
    "priority": 3,
    "note": "PL: Wrona, która godzina?"
  }
]
```

Para colar: primeiro as entradas de `cast` da secção 3b; depois acrescentar ao fim de `dialogue` (depois de `dlg_m01_067`). Não colar nada em `callouts`. Cada fala nova escreve em `dialogueConsumed` (save): exige teste de determinismo e actualização da golden (24 rotas) pelas ferramentas do repo.

### 3b. Entradas de `cast` a acrescentar (guarnição da ckm)

Ids iguais aos actores da simulação (`CKM_IDS`: `ckm_gunner`, `ckm_loader`, `ckm_reserve`, `grp_ckm_crew`), anónimos como `sapper_2/3`. `ckm_wz30` já está em `allowedEquipment`. Lenc e Wąs foram retirados do documento e das falas: os sapadores ficam `sapper_2`/`sapper_3` ("Sapador (sem nome)"); 125 já não diz nomes.

```json
[
  {"id": "ckm_gunner",  "name": "Atirador da ckm",  "rank": "strzelec (celowniczy)", "role": "SUPPORT", "faction": "PL", "fictional": true, "loadout": ["ckm_wz30"]},
  {"id": "ckm_loader",  "name": "Municiador da ckm", "rank": "strzelec (amunicyjny)", "role": "SUPPORT", "faction": "PL", "fictional": true, "loadout": ["ckm_wz30"]},
  {"id": "ckm_reserve", "name": "Soldado da ckm",   "rank": "strzelec", "role": "RIFLEMAN", "faction": "PL", "fictional": true, "loadout": ["ckm_wz30"]}
]
```
Verificar contra o teste `m01-tczew-data` (loadout/`allowedEquipment`) e a regra de `groups[].size: 3` antes de colar; o actor `ckm_gunner` é tratado como "o cabo" nas falas 118/119 (panie kapralu): o posto é suposição (ver Para revisão).

## 4. Rotação das variantes (anti-repetição)

| Gatilho repetível | Falas | Regra |
|---|---|---|
| Aliado atingido | 100, 101 | alterna por n.º de pedidos (mod 2); CD 20 s |
| Chamada ao socorrista | 106, 107 -> 108 | 106/107 alternam; 108 só uma vez por baixa |
| ckm dispara | 110, 111 | `floor(clock/60) % 2`; 111 só com `coverFire.by` nos portões |
| Troca de fita da ckm | 112 -> 113 | par; token do mesmo slot `floor(clock/90)` |
| Estalo perto | 105 (Zieliński, quando o jogador é atingido) / 121 (Bąk) | 121 só se Bąk vivo, 30 s |
| MG34 troca de fita | 123, 124 | alternam por `startedAt` da fase `reload` |
| Localização | 128, 129, 130, 131, 134, 135 | por origem; nunca a mesma duas vezes seguidas (CD 45–90 s) |
| Cobertura | 136, 137 (+ 035 genérica) | por nó em `m01.suggested_cover` |
| Calma | 153, 154 | `floor(clock/90) % 2` |

## 5. Anexos

### NEEDS_EVENT (a pedir ao ramo de combate/NPC; só `platoon_man_crossed` ficou por implementar; `enemy_down_by_player` desde a fatia 2 e `ckm_stoppage*` desde 2026-10-22)

| Evento proposto | Falas | Onde emitir | Nota |
|---|---|---|---|
| `enemy_down_by_player {id,weapon}` | 141, 142 | `fire()` quando `a.alive` passa a falso | não há nenhum hoje; não implementar 141/142 sem ele |
| `ckm_stoppage`, `ckm_stoppage_cleared` | 114, 115 | máquina da ckm | **FEITO em 2026-10-22** (`startCKMStoppage` e a fase `stoppage` de `updateCKMGunner`, §7c). Antes: opcional, a ckm não encravava (análogo real: `feed`, 112/113) |

`ally_down`, `enemy_grenade` e `platoon_man_crossed` deixaram de ser necessários (150 usa `{n}` e `dlg_m01_049`).

### NEEDS_CAST (ids de `cast` para legenda; hoje caem em `generic_rifleman`)

Resolvido por 3b: `ckm_gunner` (110, 111, 112, 114, 116, 119), `ckm_loader` (113, 115, 117), `ckm_reserve` (118). Nenhum nome próprio (Hajduk/Cyra/Piszczek foram retirados). 118 e 119 legendam como dois falantes diferentes.

### Contagem por gatilho

| Gatilho | Falas | N |
|---|---|---|
| Aliado atingido / caído | 100–105 | 6 |
| Chamada do socorrista | 106–109 | 4 |
| ckm (tiro, fita, recarga, movimento) | 110–119 | 10 |
| MG34 a suprimir / reparo sob fogo | 120–127, 139 | 9 |
| Inimigo a espreitar / localizado | 128–137 | 10 |
| Granada | 138 | 1 |
| Tiro certeiro / abate | 140–143 | 4 |
| Objetivos (reparo, defesa, Bąk) | 144–149 | 6 |
| Corredor e demolição | 150–152 | 3 |
| Momentos calmos | 153–154 | 2 |
| **Total** | 100–154 | **55** |

Dos 55: 4 dependiam de `NEEDS_EVENT` (114, 115, 141, 142); os quatro eventos existem hoje (141/142 desde a fatia 2, 114/115 desde 2026-10-22) e as 55 estão ligadas. As que são só estado em poll, sem evento: 116–119, 122–124, 132–134, 136–137, 143–147, 150–154.

## 6. Para revisão (dúvidas desta auto-revisão)

Nenhum outro agente reviu o texto original; a segunda ronda aplicou as correcções do Capitão (cast, polaco, destino da ckm, 150–154, sobreposições). **Um falante nativo tem de confirmar TODO o polaco antes da gravação.**

1. **Polaco** (confirmar com nativo): 104 *opatrunek*; 119/118 *nasypem* (pelo aterro); 122 *Czekać na przerwę!*; 123 *Ładuje! Teraz!*; 130/131 *Na lewo/prawo od bramy!*; 132 *Wychyla się*; 135 *W kratownicy!*; 140–142 *zmień stanowisko*; 152 *Zapalarka* (pedida pelo Capitão; "acendedor/ignitor" em PT é aproximação); 120/143 *cekaem* também para a MG alemã (decisão do Capitão).
2. **118/119 vs. pedido do Capitão.** O pedido dava 118 *Panie kapralu, na dworzec?* e 119 *Na dworzec. Stamtąd też strzela.*; mas o código (T47: `retreat` em `src/game/m01-simulation.js`, `final={x:-170-i*1.6,z:22+i*1.2}`) e a nota de `grp_ckm_crew` mandam a guarnição para OESTE ao longo do aterro, não para a estação. Segui o código (alínea c): 118 *Panie kapralu, nasypem na zachód?* e 119 *Nasypem. Stamtąd też strzela.* (*nasyp* = aterro). Se o Capitão preferir a estação, a sim tem de mudar primeiro.
3. **Posto do falante.** Tratei `ckm_gunner` como "cabo" (*panie kapralu* em 118, vindo de `ckm_reserve`): sem fonte; confirmar. As falas Fable 190–194 foram reescritas porque a ckm DISPARA toda a manhã (T47).
4. **110** passou a prioridade mínima (3) com CD 120 s e máx. 2; a alternativa é cortá-la.
5. **150** agora usa `{n}` e `dlg_m01_049` (sem evento novo); o PL tem `[n]` como espaço reservado (a sim substitui `{n}` por extenso em PT).
6. **151** copia o predicado real de `readiness(west_demolition)` (east_demolition consumido, `player.x < −90`, aliados não civis `x < −90`, Bąk sem `carry`/`carriedBy`) e é dita por Zieliński (*Czekamy na Bąka*). 149 (~06:04–06:08) manda VOLTAR (HUD "volte à secção"), nunca ir para oeste; B4 é um gate de readiness, não uma fala.
7. **153** só em `hold_corridor`, depois de `germanSilence()` e com silêncio aliado de 15 s; **154** (Bąk) só antes das 06:04.
8. **Sobreposições** com `ally_hit` (100, 101, 106, 107), `cover_rotation`/035 (136, 137), `co_m01_enemy_mg_fire_on_squad` (120, 128–131) e `co_m01_enemy_group_suppressed` (143): cada linha tem a regra "substitui X" ou "não toca se X tocou há <N s" na coluna Condições.
9. **Sem elogio** (Fable §6): 140–143 corrigem e mandam mudar de posição. Decisão de produto do Capitão.
10. **Palavras:** 148 tem 8 palavras (>6), 141 tem 8; ambas prioridade 2.
11. **Numeração:** 100–154 colidem com a numeração Fable e FABLE_GAP §4; a coluna "Ref. Fable/GAP" dá o mapeamento.
12. **Pacing:** em janelas comprimidas (24x/27x) os cooldowns em `clock` são necessários; se houver poucas oportunidades de falar, rever 128–131 (CD 45–90 s).
13. **Nowicki** não fala (ausente após o bombardeio). **Jan** só tem 150.
14. **Testes:** nenhum correu (documento de dados). O JSON foi validado em Python: 55 entradas, ids 100–154 únicos, sem colisão com 001–067, todos os falantes em `cast` (incluindo as 3 entradas propostas em 3b).

## 7. Ligação ao jogo (ramo `dlgwire`)

**O que é.** Um realizador pequeno e determinista (`src/game/m01-barks.js`, sem sorteios, sem relógio de parede, só lê a simulação e só escreve estado de diálogo) sobre o sistema que já existia: uma fala reativa é uma entrada de `mission.json → dialogue` (ou de `callouts.lines`, depois de ganhar `id`) com uma regra `bark`, e diz-se por `M01Simulation.line()`. Não há um segundo sistema de diálogo.

**Regra `bark` (dados).** `on` (gatilho: `poll`, ou um evento já emitido pela simulação — `round-impact`, `ally-fire`, `player-hit`, `player-shot`, `reload`, `enemy_down_by_player`, `enemy-fire`, e desde 2026-10-22 `ckm_stoppage` e `ckm_stoppage_cleared` —, ou um chamado explícito: `coverRotation`, `guide`), `when` (condições, todas; vocabulário fechado, um nome desconhecido pára o jogo ao carregar), `cooldown` (segundos de `clock`, nunca do relógio de batalha comprimido), `max` (vezes por missão), `group` (variantes que alternam e partilham o cooldown), `replaces` («substitui X»), `unless` («não toca se X tocou há N s»), `requires` («só depois de X ter tocado»), `after` («X + N s», com janela). `priority` (1 = mais urgente) vem da própria fala. Limites globais em `barks`: intervalo mínimo desde a última fala de qualquer tipo (4/6/8 s por prioridade; 2,6 s para uma resposta), orçamento de 60 s (8/7/5 falas por prioridade, **contando também as falas de guião**), `voices` 2, tempo de vida na fila (2,5/5/8 s), `cutAfterSec`.

**Fila (`line()`).** Falas de guião (sem regra) mantêm a FIFO de sempre, passam à frente de qualquer fala reativa à espera e nunca são largadas, cortadas ou ultrapassadas. Falas reativas ordenam-se por prioridade atrás do guião; no máximo 2 vozes vivas (a do ecrã e uma à espera): uma terceira só entra se for mais urgente que a que espera (substitui-a). Uma fala reativa velha demais na fila cai; uma fala de guião corta uma reativa que está no ecrã há ≥ 1 s; uma de prioridade 1 corta uma de prioridade 3 (nunca uma de prioridade 2). Há uma só legenda de cada vez: ninguém fala por cima de ninguém. Estado do realizador em `timers.barks` (guardado e validado; ausente nos saves antigos).

**Ligadas.** As 55 de 100–154. *(No ramo `dlgwire` ficavam de fora 114 e 115: a ckm não tinha modelo de encravamento, por isso ficaram nos dados, sem regra, com `NEEDS_EVENT`. Estão ligadas desde 2026-10-22: a ckm encrava e emite `ckm_stoppage` / `ckm_stoppage_cleared`, §7c.)* 141 e 142 estão ligadas: `enemy_down_by_player` existe desde a fatia 2. Mais: 030 (regra: `reload` com Kowal a ≤ 8 m e o rkm dele disparado há ≤ 6 s; era de Bąk, que nunca dispara — revisão N3, 2026-10-19), 035 (regra: nó `cv_tower_p1_*`), 036 (regra: sol nos olhos, a olhar o Sol de `map-layout.sun` durante 6 s entre 05:30 e 06:40), 042 (no `evt_m01_bak_wounded`, depois de 041), 047 (antes de 048 no corredor), 067 (no `evt_m01_planes_heard`, entre 013 e 066, a ordem do guião de Fable). A rotação de cobertura passou a **falar** (nó: sacos → callout `co_m01_cover_rotation`, portal → 136, treliça → 137, torre → 035) e a mensagem de HUD «Zieliński: …» só sai se nenhuma voz puder falar (o estado fica em `mission.status`). O guia «siga a voz» passou de uma mensagem igual de 7 em 7 s a uma voz (015a–d, texto de Fable §3.2, sem referência polaca, por rever), de 14 em 14 s, calada enquanto o jogador se aproxima (8 m desde o último chamado) e à espera da voz que estiver a falar; a mensagem antiga é só o que sobra.

**Desvios do texto das secções 0–6 (e porquê).**
- **111** usa o alvo real da rajada da ckm (`burstPlan.target` num atirador dos portões) em vez de `timers.coverFire.by`: `coverFire` só é escrito pelas salvas de ajuste das 05:30 e nunca é apagado.
- **116/117** esperam que a cena `cs_m01_east_blast` acabe: a fase `abandon` dura 3 s e coincide com a cena, onde a própria regra 0.5 proíbe vozes; dizem-se na fase `retreat`, até 60 s depois da demolição.
- **138** avisa com a granada no ar (fusível entre 0,5 e 3 s, aliados a ≤ 12 m do ponto), não «1 s antes de `soundAt`» (no evento de detonação já passou).
- **147** não substitui nenhuma mensagem de HUD: a de 7 s era a do guia do sargento, não a de Bąk; mantém-se a mensagem de direcção do `updateGuide`.
- **100–103, 106/107** medem a distância à **vítima** (40/80 m): as seis baixas do pelotão caem a 700–800 m do posto do tabuleiro (medido), por isso só falam se o jogador avançar pelo tabuleiro. Idem as regras de «Kowal ≤ N m»: no posto de apoio e na rota de controlo Kowal fica a 43–50 m do jogador.
- **106/107** respondem **uma** vez por chamada (100/101 ou o ferimento de Bąk), partilhando o cooldown do grupo.
- 112/113 e 116–119 vão por estado (`poll`) em vez de eventos novos; nada foi acrescentado às máquinas da ckm.

**Medido e provado.** `node tools/verification/m01-dialogue-rate-audit.mjs --before <git archive de 167dccc> --before-label 167dccc` (`docs/verification/m01-runtime/dialogue-2026-10-19/LINE_RATE.json`), nas rotas do golden (controlo 19390901 / apoio seed 7), antes → depois: 46 / 52 → 83 / 82 falas (2,32 / 2,71 → 4,18 / 4,27 por minuto), das quais reativas 34 / 27 (1,71 / 1,41 por minuto); minuto mais cheio 8 / 8 → 10 / 10 (só reativas: 7 / 6, ≈ 1 por 8,6 s); maior silêncio em combate (04:45–06:10 de batalha, bordas incluídas) 84,7 / 74,7 → 64,8 / 37,8 s; no máximo 2 vozes reativas vivas e nenhuma fala de guião começa por cima de outra (uma reativa cortada pela seguinte na rota de controlo, por desenho); nenhuma fala de guião se perdeu (`scriptedLines` em `LINE_RATE.json`: as 46 / 52 do predecessor continuam ditas, pela mesma ordem; ganham-se 067, 042 e 047). O teste de pior caso (todos os gatilhos a disparar durante dez minutos) nunca dá mais de 8 falas por minuto. Golden: emenda 10, com o estado de diálogo retirado 0 ticks diferem em 23839 e em 23051; invariantes 24/24. Só 26 das 62 regras disparam nas duas rotas do golden (as outras dependem de onde o jogador está ou do que faz: cada uma tem o seu teste encenado, não um playtest); a rota de sonda no posto da esquadra (`LINE_RATE.json`, `probe`, não é um golden) dá 82 falas, 34 reativas, de 23 regras (todas entre as 26). Browser (porta 4189): legendas com o nome do falante, 118 e 119 com dois nomes, nada sobreposto ao HUD a 1366×768.

**Por rever / por fazer.** Polaco inteiro (falante nativo); 015a–d (texto de Fable, sem polaco). O troço mais calado que resta (≈ 65 s na rota de controlo) cai no assalto do tabuleiro, em que o relógio de batalha fica parado em 06:09:30 durante ≈ 190 s reais: a única fala reativa específica do tabuleiro é a 135 (máx. 3) e já se gastou; falta texto para os alemães a avançar e a recuar (pedir a Fable, não repetir a 135). As três falas de `callouts` sem `id` (`npc_reloading`, `player_reloading_near_ally`, `sun_glare_player_facing_east`) continuam sem emissor; o equivalente canónico de duas delas (030 e 036) está ligado por regra, só `npc_reloading` fica por ligar. As distâncias e os cooldowns das regras são dados: afinam-se no playtest. `timers.guide` (próxima chamada do guia, agora de 14 s) **é** validado em `validateM01Snapshot` (finito e ≥ 0, como os outros temporizadores da lista; sem limite superior): um `guide` muito alto só cala o guia, por isso não se acrescenta guarda (corrigido 2026-10-19, revisão N2; a frase anterior dizia que não tinha validador).


### 7b. Revisão crítica do realizador (2026-10-19, ramo `claude/busy-ritchie-3fkvk2-rear`, emenda 11)

- **B1 — custo sem limite (corrigido).** Causa: `peekers(s,true)` (`src/game/m01-barks.js`) traçava uma linha de visão de cada alemão a espreitar até ao jogador, duas vezes por tick (132 e 133), sem saída antecipada. Agora as condições de espreitar leem a vista da própria IA (`ai.seen.who === 'player'`, escrita por `aiTarget` quando o atirador escolhe o alvo e vê o jogador — também os atiradores de espingarda, antes só a MG34; ≤ 3 s, acima do intervalo máximo entre tiros de um espreitar, 2,8 s) e contam uma vez por passagem das regras, parando no número pedido. Nenhuma linha de visão no realizador. Custo do tick da simulação (`node tools/verification/m01-tick-cost.mjs [--rev R] --runs 3`, mínimo por tick em 3 corridas, as duas rotas do golden, máquina partilhada com outros testes; ms): antes do diálogo `167dccc` média 0,403 / 0,413, janela de combate (04:45–06:10) 0,591 / 0,627, ticks > 5 ms 4 / 6; com o diálogo `c1a3ecf` 0,568 / 0,539, 0,904 / 0,868, 21 / 9 (picos de 6,5–6,8 ms às 04:46:00–04:46:11); depois da correcção 0,447 / 0,447, 0,656 / 0,693, 6 / 6, e os picos das 04:46 desapareceram. O pior tick (11–14 ms, 05:30:00, a cena da ordem e o segundo ataque aéreo) já existia antes do diálogo e não é do realizador.
- **N1 — o registo contava ao pôr na fila (corrigido).** Uma fala reactiva só conta (o seu `max`, o cooldown, o seu grupo, «tocou há N s», o orçamento de 60 s) quando vai para o ecrã (`barkShown`, chamada por `advanceSubtitle`); enquanto espera leva `queuedAt` e o seu `token`, e a regra (e o seu grupo) não é oferecida outra vez. Se sai da fila sem ser vista (tempo de vida, substituída por uma mais urgente, cena saltada), devolve o token e não gasta nada; a ordem de mudar de cobertura que tinha calado a mensagem de HUD repõe essa mensagem nesse momento (`fallback`). O intervalo mínimo e o orçamento continuam a contar uma fala que espera desde que foi posta na fila, como antes. As falas de guião não mudam (contam ao pôr na fila; nunca caem).
- **N3.** 130/131: os dados ficam com `ageMax` 8 s, a janela da linha de HUD `coverFireStatus` (8 s), que a voz repete; com 3 s a voz perdia-se sempre que o intervalo ou o orçamento a seguravam nos primeiros segundos da salva. A tabela foi alinhada aos dados. 030 «Cubro você!»: passa a Kowal (texto igual), com a condição nova `fired` (o homem disparou de facto há ≤ 6 s); o callout `player_reloading_near_ally` acompanha.
- **N4.** `tests/m01-ckm-live-fire.test.js` deixa de pôr de lado todo `timers.barks`: só `seen.allyFire` (o resto do registo tem de ser igual com e sem a ckm a disparar).
- **N2.** Frase sobre `timers.guide` corrigida acima.
- **Fatia 2b (retaguarda).** Os tiros da retaguarda (`npc-shot`, arma `ally_rifle`, `by` pl_east_0..2) contam como «o nosso lado disparou» para `quiet`; quando calam os alemães do tabuleiro dizem o callout `co_m01_enemy_group_suppressed` pela mesma regra do tiro do jogador (Kowal a ≤ 150 m, 25 s). Nenhum texto novo.

### 7c. Encravamento da ckm: 114 e 115 (2026-10-22, ramo `wp2-ckm-jam`, emenda 13)

Decisão do proprietário: a ckm encrava, e as duas falas que esperavam `NEEDS_EVENT` passam a dizer-se nos eventos. **Não publicado, sem revisão crítica independente, sem playtest humano.** Detalhe, tabelas e prova: `docs/verification/m01-runtime/ckm-jam-2026-10-22/README.md`.

- **A ckm.** `CKM_STOPPAGES` (`src/game/m01-simulation.js`): ao ir disparar a 14.ª rajada (3,8 s) e a 45.ª (4,6 s) o atirador não dispara; fase `stoppage` até `clearAt`, o municiador desencrava com o clip `feed` já autorado, `ckm_stoppage_cleared`, e a rajada segue no mesmo tick. Só entre 04:46:00 e 06:09:30. Sem sorteios; estado guardado só depois de acontecer (`ckmFire.jams`, `ckm.clearAt`), por isso os saves antigos carregam.
- **Os eventos.** `ckm_stoppage {by:'ckm_gunner', at, clearAt, origin, n}` e `ckm_stoppage_cleared {by:'ckm_loader', at, origin, n}` (`validateM01AudioEvent`, nunca guardados). Dois gatilhos novos do realizador, `ckm_stoppage` e `ckm_stoppage_cleared` (`TRIGGERS` em `src/game/m01-barks.js`).
- **As regras (dados em `mission.json`).** 114: `{"on":"ckm_stoppage","when":{"near":{"of":"ckm_gunner","m":60}},"cooldown":20,"max":3}`, prioridade 2. 115: `{"on":"ckm_stoppage_cleared","when":{"near":{"of":"ckm_loader","m":60}},"max":3,"after":[{"line":"dlg_m01_114","sec":0,"window":8}]}`, prioridade 3: só se a 114 foi para o ecrã há ≤ 8 s (`after`, uma por âncora), por isso nunca há «Pronto» sem «Travou». O texto, o falante e as prioridades são os do guião; só o `context` e a `note` perderam o `NEEDS_EVENT`.
- **Como o realizador as trata.** Como a qualquer outra fala: `makeRoom` e as duas vozes (prioridade 2 substitui uma prioridade 3 à espera, nunca uma prioridade 1), intervalo mínimo desde a última fala (6 s para a 114, 2,6 s para a 115 por ser resposta), orçamento de 60 s (7 e 5; a própria 114 conta uma na conta da 115). Testes encenados: `tests/m01-barks.test.js` («114 and 115 …», os dois casos `CASES`).
- **Medido** (14 rotas, 28 encravamentos): o jogador estava a ≤ 60 m em 21; a 114 ouviu-se 11 vezes, **a 115 nenhuma**. Duas rotas do golden: 114 em 3 de 4, 115 em 0 de 4. É o orçamento de prioridade 3 (5 falas em 60 s) e o facto de o evento ser de um só instante (o que o canal recusa nesse instante perde-se). Variante de teste, só nas duas rotas do golden e sem tocar nos dados (a 115 em prioridade 2): 114 em 3 de 4, 115 em 2 de 4.
- **Por decidir (proprietário).** Subir a 115 para prioridade 2 (um número em `mission.json`; muda o golden: o ficheiro é uma entrada da emenda 13), e/ou dar aos eventos de um só instante uma pequena tolerância no realizador (a fala espera uns segundos pelo canal). Não feito: a prioridade é dado da fala, e o realizador é de todas as falas.
