# M01 — Diálogo reativo de combate (rascunho de dados, dlg_m01_100–154)

**Estado:** RASCUNHO DE DADOS, não ligado. Não toca em `missions/m01-tczew/mission.json` nem em `src/game/*` (integração em curso). O Capitão cola o bloco JSON da secção 3 e liga os gatilhos depois da fusão do combate.
**Base:** worktree `dlg`, 98f094f. Gatilhos verificados nos ramos `-combat` (178060f), `-pacing` (3fac80e) e `-npc` (c61ce98). Fonte criativa: Fable 5.1 (PR #56: `M01-DIALOGUE-PRODUCTION-SCRIPT.md`, `M01-CHARACTER-BIBLE.md`) e a análise de lacunas FABLE_GAP (§2 contradições, §4 diálogo reativo). Escrita original; nenhuma fala, nome ou cena de Call of Duty.

## 0. Regras de escrita e de ligação

1. **Correção T47.** A ckm wz.30 DISPARA toda a manhã (04:46–06:09:30). Nenhuma fala diz que "nunca disparou". As falas Fable 190–194 foram reescritas em 116–119 ("a arma que falou a manhã toda vai com eles"). Posto da ckm = S2 (7,17;−3;26), abrigo de sacos no encontro oeste, não casamata.
2. **Cooldowns em `clock` (tempo real de jogo), nunca em `battleClock`.** O pacing comprime `battleClock` 24x/27x; um cooldown de 60 s em `battleClock` dispararia a cada 2–3 s reais.
3. **Fila FIFO.** `line(id,token)` não tem prioridade nem variantes. Anti-repetição = token `id:slot`, com `slot = floor(clock/CD)`; máximo de repetições = token `id:n` contado. As variantes são ids próprios (cada alternativa é uma fala) e rodam por `floor(clock/N) % k`. Nenhuma chave nova em JSON; o grupo e o CD vivem só neste documento.
4. **Comprimento.** Prioridade 1 (perigo): <= 6 palavras PT (excepção consciente: 148, 8 palavras, fala Fable já aprovada, não é de perigo). `duration = max(2,5; chars/24)`, até 6 s.
5. **Silêncios.** Nunca durante `scene`, `germanSilence()` (06:10–06:11), `m01-blast demolition` leste t0–8,5 s e oeste t0–11 s, nem na chamada final. Máximo 2 vozes em simultâneo (regra de `callouts.note`).
6. **Regra B4 preservada (verificada, não só afirmada).** A carga oeste espera Bąk entregue ao socorrista: é um gate de `readiness`, não uma fala. Nenhuma fala manda ir para oeste antes da demolição leste e do corredor. 149 (~06:04–06:08, depois de `finish(rescue_bak)`) diz ao jogador para VOLTAR à secção, como a mensagem de HUD "volte à secção"; 151 (~06:30) só avisa que a carga espera Bąk enquanto Dudek o leva à estação.
7. **Vozes.** Jan conta; Zieliński diz "depois" e nunca "morto", ordens de 3–4 palavras; Krawiec nunca explica; Kowal fala em números e distâncias; Bąk ri antes do perigo; Dudek estanca/carrega, nunca "cura"; Pawlak diz as horas. Sem elogio ao jogador (Fable §6): Kowal corrige, Zieliński manda mudar.
8. **Polaco.** Registo militar 1939: *Padnij!*, *Sanitariusz!*, *kapralu*, *cekaem*, *przęsło*, *kratownica*, *dworzec*, *wał* (dique). Palavrão máximo: *psiakrew*. Sem anglicismos. Referência de gravação a rever por falante nativo.
9. **Legendas** em português no registo de `mission.json` ("você", "trem", "Cubro você!").
10. **Pontos de referência usados** (só os que `map-layout.json` nomeia): portões e portal de Lisewo, dique norte/sul, trem 963 (vagões), tabuleiro, treliças (`cv_road_truss_*`), portal rodoviário/ferroviário (`cv_portal_*`), torres (`cv_tower_p1_*`), estação, aterro oeste. **Posto de sinais ("signal box")**: o mapa não tem nenhum; não há fala que o cite.

## 1. Eventos e estados em que as falas se apoiam (nomes exactos)

**Eventos que existem** (`this.emit`, `src/game/m01-simulation.js` nos ramos): `enemy-fire {origin,rounds,interval,weapon,at}`; `ally-fire {by,weapon,rounds,interval,at}` (ckm, T47); `round-impact {kind,by,point,material,crack,distance,pass,victim,pinned}`; `player-hit`; `player-shot {hit,weapon}`; `reload`; `npc-shot {weapon,rounds}`; `m01-blast {kind: grenade|demolition|bomb|shell, soundAt}`; `distant-shot`; `complete`; `checkpoint`.

**Estado só de leitura (poll, sem evento):** `a.ai.peek`, `a.ai.shakenUntil`, `a.ai.pinnedUntil` (-combat: "no callout events"); `a.suppressedUntil`; `a.ckm.phase` (`idle|aim|feed|fire_burst|abandon|retreat`); `a.mg34Prone.phase` (`reload`, `fire_burst`); `timers.repairPins`, `timers.repairSuppressedUntil`, `timers.coverFire {at,by,z}`, `timers.kowalRounds`, `timers.holdAccessVisited`; `flags['m01.suggested_cover']`, `flags['m01.bak_status']`; `player.carrying`; `threat.recentFire/inFlight/mgSuppressed`; `consumedEvent(...)`; `readiness(...)`; `germanSilence()`.

**Pacing (-pacing):** `objectiveMarker` (label/ponto/distância), `activeCompression`, `HOLD_AREA`, `mission.status`; **NPC (-npc):** `a.nav` (rotas), sem eventos novos.

**Nota sobre baixas:** `round-impact.victim` é sempre uma baixa letal de um homem `pl_east_*` no tabuleiro (06:00–06:10); as baixas de `landAttrition` (a ~1000 m em `hold_access`) não emitem e ficam sem fala, de propósito (o jogador nunca as vê).

**NÃO existem (marcados `NEEDS_EVENT`):** `enemy_down_by_player` (`fire()` só põe `a.state='DOWN'`), `ckm_stoppage`/`ckm_stoppage_cleared` (a ckm não encrava; o análogo real é `feed`), `platoon_man_crossed`. (Não existem granadas alemãs: 139 foi reaproveitada para `Padnij!` por estalo.)

## 2. Falas por gatilho

### A. Aliado atingido / caído (6)

| ID | Falante | Polaco (original) / Legenda PT | Gatilho | Condições | CD clock / Pri / Máx | Grupo de variantes | Ref. Fable/GAP | Marcas |
|---|---|---|---|---|---|---|---|---|
| 100 | `generic_rifleman` | *Trafili go! Sanitariusz!*<br>Acertaram ele! Sanitário! | round-impact (victim != null) | round-impact.victim é SEMPRE uma baixa letal de homem do pelotão leste (pl_east_*) no tabuleiro (06:00–06:10), nunca ferimento nem homem da secção; os homens gritam por sanitário na mesma; jogador <= 40 m; fora de scene/germanSilence | 20 s / 1 / 3 | ally_hit (100/101) | callout ally_hit; GAP 108 |  |
| 101 | `generic_rifleman` | *Ranny! Mamy rannego!*<br>Ferido! Temos um ferido! | round-impact (victim != null) | idem (só cover_withdrawal activo); alterna com 100 por (n pedidos mod 2) | 20 s / 1 / 3 | ally_hit (100/101) | callout ally_hit |  |
| 102 | `szymon_kowal` | *Jeden padł. Na moście.*<br>Um caiu. Na ponte. | round-impact (victim != null) | cover_withdrawal activo; vítima pl_east_* no tabuleiro perto do jogador (as baixas de landAttrition ocorrem a ~1000 m em hold_access e não emitem: ficam de fora); jogador <= 80 m | 25 s / 2 / 3 | ally_down (102/103) | — |  |
| 103 | `marek_zielinski` | *Zostaw. Potem.*<br>Deixe. Depois. | round-impact (victim != null) | 5 s depois de 102; cover_withdrawal activo; só se o jogador estiver parado (|v|<0,5 m/s); Zieliński diz "depois", nunca "morto" | 40 s / 2 / 2 | ally_down (102/103) | Fable CHR (Zieliński) |  |
| 104 | `leon_dudek` | *Trzymaj ucisk. Jestem.*<br>Segure o curativo. Estou aqui. | evt_m01_bak_wounded (seguimento de 042) | Dudek vivo, 4 s depois de 042; Bąk no chão em bak_wound_point. (Não ligar a round-impact.victim: Dudek está no aid_position ou com Bąk a partir das 06:04) | única / 2 / 1 | medic_answer (104/108) | — |  |
| 105 | `marek_zielinski` | *Wrona! Trafiony? Odpowiedz!*<br>Wrona! Foi atingido? Responda! | player-hit | Zieliński vivo <= 30 m; jogador health < 100 após o golpe | 25 s / 1 / 3 | player_hit | — |  |

### B. Chamada do socorrista (4)

| ID | Falante | Polaco (original) / Legenda PT | Gatilho | Condições | CD clock / Pri / Máx | Grupo de variantes | Ref. Fable/GAP | Marcas |
|---|---|---|---|---|---|---|---|---|
| 106 | `generic_rifleman` | *Sanitariusz, tutaj! Szybko!*<br>Sanitário, aqui! Rápido! | round-impact (victim != null) ou bak_wounded (evt_m01_bak_wounded) | 2.ª chamada em diante na mesma baixa (token por vítima), <= 40 m; round-impact.victim = baixa do pelotão leste; não repete 042 (Bąk) | 15 s / 1 / 2 | medic_call (106/107) | callout ally_hit (2.ª) |  |
| 107 | `generic_rifleman` | *Sanitariusz! Do mnie!*<br>Sanitário! Aqui comigo! | idem | alterna com 106 | 15 s / 1 / 2 | medic_call (106/107) | — |  |
| 108 | `leon_dudek` | *Idę! Nie ruszajcie go!*<br>Já vou! Não mexam nele! | evt_m01_dudek_retrieves_bak | Dudek vivo e activo; 2 s depois do evento (a seguir a Zieliński mandar Dudek ir); só se o jogador não leva Bąk | única / 2 / 1 | medic_answer (104/108) | — |  |
| 109 | `leon_dudek` | *Za pas, nie za rękę.*<br>Pelo cinto, não pelo braço. | player.carrying === jozef_bak | Dudek <= 25 m; 8 s depois de 146; só 1.ª carga | única / 2 / 1 | carry_help | Fable 121 (reformulada) |  |

### C. Metralhadora pesada ckm wz.30 (tiro, fita, recarga, movimento) (10)

| ID | Falante | Polaco (original) / Legenda PT | Gatilho | Condições | CD clock / Pri / Máx | Grupo de variantes | Ref. Fable/GAP | Marcas |
|---|---|---|---|---|---|---|---|---|
| 110 | `generic_rifleman` | *Seria po wale!*<br>Rajada no dique! | ally-fire (by ckm_gunner, one per burst) | ckm.phase fire_burst; alterna 110/111/112 por floor(clock/60)%3; voz do celowniczy (Hajduk); jogador <= 60 m | 60 s / 3 / 4 | ckm_fire (110/111) | — | NEEDS_CAST:hajduk |
| 111 | `generic_rifleman` | *Ognia na bramę!*<br>Fogo no portão! | ally-fire (by ckm_gunner) | timers.coverFire.by é gateShooter; senão fica mudo; jogador <= 60 m | 60 s / 3 / 4 | ckm_fire (110/111) | — | NEEDS_CAST:hajduk |
| 112 | `generic_rifleman` | *Taśma się kończy!*<br>A fita está acabando! | ckm.phase → feed (troca real de fita, belt < CKM_BURST_ROUNDS) | jogador <= 60 m; não durante germanSilence | 90 s / 2 / 3 | ckm_belt (112/113) | — | NEEDS_CAST:hajduk |
| 113 | `generic_rifleman` | *Nowa taśma! Gotowe!*<br>Fita nova! Pronto! | ckm.phase feed → aim (CKM_FEED_SEC acabou) | segue 112 (token do mesmo slot); amunicyjny (Cyra) | 90 s / 3 / 3 | ckm_belt (112/113) | — | NEEDS_CAST:cyra |
| 114 | `generic_rifleman` | *Zacięcie! Przeładować!*<br>Travou! Recarregar! | NEEDS_EVENT:ckm_stoppage | a ckm não encrava hoje; o análogo real é 112/113. Só ligar se o ramo -combat acrescentar o evento | única / 2 / 1 | ckm_stoppage (114/115) | — | NEEDS_EVENT:ckm_stoppage; NEEDS_CAST:hajduk |
| 115 | `generic_rifleman` | *Jest. Strzelaj!*<br>Pronto. Atire! | NEEDS_EVENT:ckm_stoppage_cleared | par de 114 | única / 3 / 1 | ckm_stoppage (114/115) | — | NEEDS_EVENT:ckm_stoppage_cleared; NEEDS_CAST:cyra |
| 116 | `generic_rifleman` | *Zabieramy go. Za mną!*<br>Levamos ela. Comigo! | ckm.phase → abandon | guarnição viva; jogador <= 60 m; só 1 vez. Reescreve Fable 190: a ckm DISPAROU toda a manhã (T47) | única / 1 / 1 | ckm_move | Fable 190; GAP 117 | NEEDS_CAST:hajduk |
| 117 | `generic_rifleman` | *Wylej wodę. Skrzynki. Idziemy.*<br>Esvazie a água. Caixas. Vamos. | ckm.phase abandon + 1,5 s | refrigeração a água do wz.30; segue 116 | única / 3 / 1 | ckm_move | Fable 191 | NEEDS_CAST:cyra |
| 118 | `generic_rifleman` | *Kapralu, na dworzec?*<br>Cabo, para a estação? | ckm.phase → retreat | jogador <= 12 m da ckm; Piszczek pergunta a Hajduk | única / 3 / 1 | ckm_move | Fable 193 (reescrita) | NEEDS_CAST:piszczek |
| 119 | `generic_rifleman` | *Na dworzec. Tam też strzela.*<br>Para a estação. Lá ela também atira. | 118 + 2 s | par de 118; Hajduk | única / 2 / 1 | ckm_move | Fable 194 (reescrita); GAP 118 | NEEDS_CAST:hajduk |

### D. MG34 a suprimir-nos / reparo sob fogo (9)

| ID | Falante | Polaco (original) / Legenda PT | Gatilho | Condições | CD clock / Pri / Máx | Grupo de variantes | Ref. Fable/GAP | Marcas |
|---|---|---|---|---|---|---|---|---|
| 120 | `szymon_kowal` | *MG z wału! Głowy w dół!*<br>Metralhadora do dique! Cabeças baixas! | enemy-fire (weapon mg34) + round-impact.pinned não vazio | Kowal <= 40 m; o callout co_m01_enemy_mg_fire_on_squad cobre a 1.ª ocorrência; esta fala só a 2.ª em diante | 45 s / 1 / 4 | mg34_fire (120/121) | GAP 104 / Fable 130 |  |
| 121 | `jozef_bak` | *Ha… psiakrew, blisko.*<br>Ha… raios, foi perto. | round-impact (crack, distance <= 6 m) | Bąk vivo <= 20 m e antes de bak_wounded; alterna 121/139 por floor(clock/12)%2 | 30 s / 2 / 4 | mg34_crack (121) | Fable 135 (variante Bąk; 139 = variante Kowal) |  |
| 122 | `marek_zielinski` | *Głów nie podnosić. Czekać na przerwę.*<br>Ninguém levante a cabeça. Esperem a pausa. | mg34Prone.phase === fire_burst (rajada de grupo aberta) | jogador em cobertura (cv_*); só activo em cover_repair e hold_access | 60 s / 2 / 3 | mg34_burst (122) | — |  |
| 123 | `szymon_kowal` | *Zmienia taśmę! Teraz!*<br>Ele troca a fita! Agora! | mg34Prone.phase === reload (carregador a trocar, 4,8 s) | MG34 de portão com LOS ao jogador; alterna 123/124 | 40 s / 1 / 4 | mg34_reload (123/124) | novo (combat: reload-aware) |  |
| 124 | `marek_zielinski` | *Przerwa! Strzelaj!*<br>Pausa! Atire! | idem | alterna com 123; só 1 em cada janela reload (token por startedAt) | 40 s / 1 / 4 | mg34_reload (123/124) | novo |  |
| 125 | `pawel_krawiec` | *Lenc! Głowa!*<br>Lenc! Cabeça! | timers.repairPins >= 2 | cover_repair activo; sapadores a <6 m do site | 30 s / 1 / 3 | repair_pins (125/126) | GAP 100 / Fable 121 |  |
| 126 | `sapper_3` | *Znowu nie…*<br>Outra vez não… | timers.repairPins === 3 | Lenc vivo e activo | única / 2 / 1 | repair_pins (125/126) | GAP 101 / Fable 202 |  |
| 127 | `pawel_krawiec` | *Trzy… cztery… teraz.*<br>Três… quatro… agora. | timers.repairSuppressedUntil expira com repairPins >= 1 | cover_repair activo | 25 s / 2 / 3 | repair_resume (127) | GAP 102 / Fable 120 |  |
| 139 | `szymon_kowal` | *Padnij!*<br>Abaixa! | round-impact (crack, distance <= 6 m do jogador) | Kowal vivo <= 25 m; alterna 121/139 por floor(clock/12)%2 | 12 s / 1 / 6 | mg34_crack (121/139) | GAP 105 / Fable 135 |  |

### E. Inimigo a espreitar / localizado (callouts com pontos de referência) (10)

| ID | Falante | Polaco (original) / Legenda PT | Gatilho | Condições | CD clock / Pri / Máx | Grupo de variantes | Ref. Fable/GAP | Marcas |
|---|---|---|---|---|---|---|---|---|
| 128 | `szymon_kowal` | *Błysk przy bramie!*<br>Clarão no portão! | threat.recentFire (age < 2,5 s) em gateShooter | origem nos portões de Lisewo; 2.ª ocorrência em diante; jogador <= 80 m | 90 s / 1 / 3 | located (128-131) | GAP 104; callout enemy_mg_fire_on_squad |  |
| 129 | `szymon_kowal` | *Błysk w wagonach!*<br>Clarão nos vagões! | threat.recentFire junto ao trem 963 (vagões) | origem a menos de 25 m do trem 963 parado; idem | 90 s / 1 / 3 | located (128-131) | — |  |
| 130 | `szymon_kowal` | *Strzelec na wale północnym!*<br>Atirador no dique norte! | timers.coverFire (z < 0) | coverFire.age < 3 s; rotação por origem | 45 s / 1 / 4 | located (128-131) | HUD coverFireStatus (texto) |  |
| 131 | `szymon_kowal` | *Strzelec na wale południowym!*<br>Atirador no dique sul! | timers.coverFire (z > 0) | idem | 45 s / 1 / 4 | located (128-131) | idem |  |
| 132 | `marek_zielinski` | *Wychyla się przy bramie. Czekaj na niego.*<br>Ele se debruça no portão. Espere por ele. | ai.peek > 0 num grp_de_east com LOS ao jogador | jogador sem aim há 3 s; 1.ª vez por sessão e depois cd | 45 s / 2 / 3 | peek (132/133) | novo (combat: peeks) |  |
| 133 | `szymon_kowal` | *Schował się. Zaraz wróci.*<br>Escondeu-se. Já volta. | ai.peek passa de > 0 a 0 (peek fechado) | LOS ao jogador existiu nos últimos 2 s | 60 s / 3 / 3 | peek (132/133) | novo |  |
| 134 | `marek_zielinski` | *Dwóch przy bramie!*<br>Dois no portão! | >= 2 enemies com ai.peek > 0 em simultâneo | gateShooter; jogador <= 80 m | 60 s / 1 / 3 | located (134) | novo |  |
| 135 | `szymon_kowal` | *Niemcy na przęsłach! Między kratami!*<br>Alemães no tabuleiro! Entre as treliças! | consumedEvent(germans_on_east_spans) + enemy-fire de grp_de_spans | uma vez por rajada longa; depois de 06:00 e antes da demolição leste | 30 s / 1 / 3 | located (135) | HUD Pelotão leste: alemães no tabuleiro |  |
| 136 | `marek_zielinski` | *Do portalu! Za filar!*<br>Ao portal! Atrás do pilar! | flags[m01.suggested_cover] = cv_portal_* | rotação real de cobertura (já emitida); substitui 035 nesse nó | 20 s / 1 / 4 | cover_node (136/137) | Fable 114b |  |
| 137 | `marek_zielinski` | *Za kratownicę! Czołgaj się!*<br>Atrás da treliça! Rasteje! | flags[m01.suggested_cover] = cv_road_truss_* | idem | 20 s / 1 / 4 | cover_node (136/137) | Fable 114c |  |

### F. Granada (1)

| ID | Falante | Polaco (original) / Legenda PT | Gatilho | Condições | CD clock / Pri / Máx | Grupo de variantes | Ref. Fable/GAP | Marcas |
|---|---|---|---|---|---|---|---|---|
| 138 | `szymon_kowal` | *Granat! Padnij!*<br>Granada! Abaixem! | m01-blast kind grenade (granada do jogador) ou grenades.active com id m01_grenade_* | só o jogador lança granadas hoje: aviso quando há aliados <= 12 m do ponto de queda; 1 s antes de soundAt | 20 s / 1 / 4 | grenade (138) | GAP 110 | NOTE: só granada do jogador; não há granadas alemãs |

### G. Tiro certeiro / alemão abatido pelo jogador (sem elogio) (4)

| ID | Falante | Polaco (original) / Legenda PT | Gatilho | Condições | CD clock / Pri / Máx | Grupo de variantes | Ref. Fable/GAP | Marcas |
|---|---|---|---|---|---|---|---|---|
| 140 | `szymon_kowal` | *Dostał. Zmień pozycję.*<br>Pegou. Mude de posição. | player-shot (hit: true) | alvo inimigo; 1 em cada 3 acertos; Kowal <= 40 m | 25 s / 2 / 4 | player_hit_enemy (140/141) | — |  |
| 141 | `szymon_kowal` | *Jeden mniej przy bramie. Zmień pozycję.*<br>Um a menos no portão. Mude de lugar. | NEEDS_EVENT:enemy_down_by_player | fire() só põe a.state=DOWN; sem emit | 30 s / 2 / 4 | player_hit_enemy (140/141) | — | NEEDS_EVENT:enemy_down_by_player |
| 142 | `marek_zielinski` | *Wrona. Nie licz. Zmień miejsce.*<br>Wrona. Não conte. Mude de lugar. | NEEDS_EVENT:enemy_down_by_player | 2.º abate seguido em < 20 s; eco de 048 | 60 s / 2 / 2 | player_hit_enemy (142) | Fable §6 (sem elogio) | NEEDS_EVENT:enemy_down_by_player |
| 143 | `szymon_kowal` | *MG ucichł. Do roboty!*<br>A metralhadora calou. Trabalhem! | de_east_0/1.suppressedUntil por tiro do jogador (state) | cover_repair activo; recordSuppression regista o instante | 20 s / 1 / 4 | mg_silenced (143) | GAP 103 / Fable 132 |  |

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
| 150 | `jan_wrona` | *Jeszcze jeden.*<br>Mais um. | NEEDS_EVENT:platoon_man_crossed | pl_east_* cruza x=-20 em hold_corridor; contagem por homem | 6 s / 2 / 10 | corridor_count (150) | GAP 122; Fable platoon_count | NEEDS_EVENT:platoon_man_crossed |
| 151 | `pawel_krawiec` | *Ładunek czeka na Bąka.*<br>A carga espera o Bąk. | readiness(west_demolition) falso porque Bąk ainda não está no posto de socorro/estação | battleClock >= ~06:30; Dudek com task evacuate_bak e Bąk ainda não entregue na estação (cue bak_delivery_hold); o jogador já não o leva (dudek_retrieves_bak); antes de 050 | 60 s / 1 / 2 | west_wait (151) | regra B4 |  |
| 152 | `sapper_2` | *Zapalnik gotowy, kapralu.*<br>Espoleta pronta, cabo. | readiness(west_demolition) verdadeiro | antes de 050 (Última chamada); Wąs; uma vez | única / 2 / 1 | west_ready (152) | Fable 200 (variante) |  |

### J. Momentos calmos (2)

| ID | Falante | Polaco (original) / Legenda PT | Gatilho | Condições | CD clock / Pri / Máx | Grupo de variantes | Ref. Fable/GAP | Marcas |
|---|---|---|---|---|---|---|---|---|
| 153 | `szymon_kowal` | *Cicho. Za cicho.*<br>Quieto. Quieto demais. | threat.recentFire vazio e threat.inFlight 0 | >= 20 s de clock sem fogo; fase com cobertura activa (hold_access/hold_corridor); fora de cenas e silêncios | 90 s / 3 / 3 | quiet (153/154) | novo |  |
| 154 | `jozef_bak` | *Wrona, która godzina?*<br>Wrona, que horas são? | idem | Bąk vivo e antes de bak_wounded; alterna 153/154 | 90 s / 3 / 2 | quiet (153/154) | Fable 140/141 |  |

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
    "note": "PL: Trzymaj ucisk. Jestem."
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
    "speaker": "generic_rifleman",
    "text": "Rajada no dique!",
    "context": "reativa; ally-fire (by ckm_gunner, one per burst)",
    "priority": 3,
    "note": "PL: Seria po wale! | NEEDS_CAST:hajduk"
  },
  {
    "id": "dlg_m01_111",
    "speaker": "generic_rifleman",
    "text": "Fogo no portão!",
    "context": "reativa; ally-fire (by ckm_gunner)",
    "priority": 3,
    "note": "PL: Ognia na bramę! | NEEDS_CAST:hajduk"
  },
  {
    "id": "dlg_m01_112",
    "speaker": "generic_rifleman",
    "text": "A fita está acabando!",
    "context": "reativa; ckm.phase → feed (troca real de fita, belt < CKM_BURST_ROUNDS)",
    "priority": 2,
    "note": "PL: Taśma się kończy! | NEEDS_CAST:hajduk"
  },
  {
    "id": "dlg_m01_113",
    "speaker": "generic_rifleman",
    "text": "Fita nova! Pronto!",
    "context": "reativa; ckm.phase feed → aim (CKM_FEED_SEC acabou)",
    "priority": 3,
    "note": "PL: Nowa taśma! Gotowe! | NEEDS_CAST:cyra"
  },
  {
    "id": "dlg_m01_114",
    "speaker": "generic_rifleman",
    "text": "Travou! Recarregar!",
    "context": "reativa; NEEDS_EVENT:ckm_stoppage",
    "priority": 2,
    "note": "PL: Zacięcie! Przeładować! | NEEDS_EVENT:ckm_stoppage; NEEDS_CAST:hajduk"
  },
  {
    "id": "dlg_m01_115",
    "speaker": "generic_rifleman",
    "text": "Pronto. Atire!",
    "context": "reativa; NEEDS_EVENT:ckm_stoppage_cleared",
    "priority": 3,
    "note": "PL: Jest. Strzelaj! | NEEDS_EVENT:ckm_stoppage_cleared; NEEDS_CAST:cyra"
  },
  {
    "id": "dlg_m01_116",
    "speaker": "generic_rifleman",
    "text": "Levamos ela. Comigo!",
    "context": "reativa; ckm.phase → abandon",
    "priority": 1,
    "note": "PL: Zabieramy go. Za mną! | NEEDS_CAST:hajduk"
  },
  {
    "id": "dlg_m01_117",
    "speaker": "generic_rifleman",
    "text": "Esvazie a água. Caixas. Vamos.",
    "context": "reativa; ckm.phase abandon + 1,5 s",
    "priority": 3,
    "note": "PL: Wylej wodę. Skrzynki. Idziemy. | NEEDS_CAST:cyra"
  },
  {
    "id": "dlg_m01_118",
    "speaker": "generic_rifleman",
    "text": "Cabo, para a estação?",
    "context": "reativa; ckm.phase → retreat",
    "priority": 3,
    "note": "PL: Kapralu, na dworzec? | NEEDS_CAST:piszczek"
  },
  {
    "id": "dlg_m01_119",
    "speaker": "generic_rifleman",
    "text": "Para a estação. Lá ela também atira.",
    "context": "reativa; 118 + 2 s",
    "priority": 2,
    "note": "PL: Na dworzec. Tam też strzela. | NEEDS_CAST:hajduk"
  },
  {
    "id": "dlg_m01_120",
    "speaker": "szymon_kowal",
    "text": "Metralhadora do dique! Cabeças baixas!",
    "context": "reativa; enemy-fire (weapon mg34) + round-impact.pinned não vazio",
    "priority": 1,
    "note": "PL: MG z wału! Głowy w dół!"
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
    "text": "Ninguém levante a cabeça. Esperem a pausa.",
    "context": "reativa; mg34Prone.phase === fire_burst (rajada de grupo aberta)",
    "priority": 2,
    "note": "PL: Głów nie podnosić. Czekać na przerwę."
  },
  {
    "id": "dlg_m01_123",
    "speaker": "szymon_kowal",
    "text": "Ele troca a fita! Agora!",
    "context": "reativa; mg34Prone.phase === reload (carregador a trocar, 4,8 s)",
    "priority": 1,
    "note": "PL: Zmienia taśmę! Teraz!"
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
    "text": "Lenc! Cabeça!",
    "context": "reativa; timers.repairPins >= 2",
    "priority": 1,
    "note": "PL: Lenc! Głowa!"
  },
  {
    "id": "dlg_m01_126",
    "speaker": "sapper_3",
    "text": "Outra vez não…",
    "context": "reativa; timers.repairPins === 3",
    "priority": 2,
    "note": "PL: Znowu nie…"
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
    "text": "Clarão nos vagões!",
    "context": "reativa; threat.recentFire junto ao trem 963 (vagões)",
    "priority": 1,
    "note": "PL: Błysk w wagonach!"
  },
  {
    "id": "dlg_m01_130",
    "speaker": "szymon_kowal",
    "text": "Atirador no dique norte!",
    "context": "reativa; timers.coverFire (z < 0)",
    "priority": 1,
    "note": "PL: Strzelec na wale północnym!"
  },
  {
    "id": "dlg_m01_131",
    "speaker": "szymon_kowal",
    "text": "Atirador no dique sul!",
    "context": "reativa; timers.coverFire (z > 0)",
    "priority": 1,
    "note": "PL: Strzelec na wale południowym!"
  },
  {
    "id": "dlg_m01_132",
    "speaker": "marek_zielinski",
    "text": "Ele se debruça no portão. Espere por ele.",
    "context": "reativa; ai.peek > 0 num grp_de_east com LOS ao jogador",
    "priority": 2,
    "note": "PL: Wychyla się przy bramie. Czekaj na niego."
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
    "text": "Alemães no tabuleiro! Entre as treliças!",
    "context": "reativa; consumedEvent(germans_on_east_spans) + enemy-fire de grp_de_spans",
    "priority": 1,
    "note": "PL: Niemcy na przęsłach! Między kratami!"
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
    "note": "PL: Dostał. Zmień pozycję."
  },
  {
    "id": "dlg_m01_141",
    "speaker": "szymon_kowal",
    "text": "Um a menos no portão. Mude de lugar.",
    "context": "reativa; NEEDS_EVENT:enemy_down_by_player",
    "priority": 2,
    "note": "PL: Jeden mniej przy bramie. Zmień pozycję. | NEEDS_EVENT:enemy_down_by_player"
  },
  {
    "id": "dlg_m01_142",
    "speaker": "marek_zielinski",
    "text": "Wrona. Não conte. Mude de lugar.",
    "context": "reativa; NEEDS_EVENT:enemy_down_by_player",
    "priority": 2,
    "note": "PL: Wrona. Nie licz. Zmień miejsce. | NEEDS_EVENT:enemy_down_by_player"
  },
  {
    "id": "dlg_m01_143",
    "speaker": "szymon_kowal",
    "text": "A metralhadora calou. Trabalhem!",
    "context": "reativa; de_east_0/1.suppressedUntil por tiro do jogador (state)",
    "priority": 1,
    "note": "PL: MG ucichł. Do roboty!"
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
    "text": "Mais um.",
    "context": "reativa; NEEDS_EVENT:platoon_man_crossed",
    "priority": 2,
    "note": "PL: Jeszcze jeden. | NEEDS_EVENT:platoon_man_crossed"
  },
  {
    "id": "dlg_m01_151",
    "speaker": "pawel_krawiec",
    "text": "A carga espera o Bąk.",
    "context": "reativa; readiness(west_demolition) falso porque Bąk ainda não está no posto de socorro/estação",
    "priority": 1,
    "note": "PL: Ładunek czeka na Bąka."
  },
  {
    "id": "dlg_m01_152",
    "speaker": "sapper_2",
    "text": "Espoleta pronta, cabo.",
    "context": "reativa; readiness(west_demolition) verdadeiro",
    "priority": 2,
    "note": "PL: Zapalnik gotowy, kapralu."
  },
  {
    "id": "dlg_m01_153",
    "speaker": "szymon_kowal",
    "text": "Quieto. Quieto demais.",
    "context": "reativa; threat.recentFire vazio e threat.inFlight 0",
    "priority": 3,
    "note": "PL: Cicho. Za cicho."
  },
  {
    "id": "dlg_m01_154",
    "speaker": "jozef_bak",
    "text": "Wrona, que horas são?",
    "context": "reativa; idem",
    "priority": 3,
    "note": "PL: Wrona, która godzina?"
  }
]
```

Para colar: acrescentar ao fim de `dialogue` (depois de `dlg_m01_067`). Não colar nada em `callouts`. Cada fala nova escreve em `dialogueConsumed` (save): exige teste de determinismo e actualização da golden (24 rotas) pelas ferramentas do repo.

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

### NEEDS_EVENT (a pedir ao ramo de combate/NPC; nada disto está implementado)

| Evento proposto | Falas | Onde emitir | Nota |
|---|---|---|---|
| `enemy_down_by_player {id,weapon}` | 141, 142 | `fire()` quando `a.alive` passa a falso | não há nenhum hoje; não implementar 141/142 sem ele |
| `ckm_stoppage`, `ckm_stoppage_cleared` | 114, 115 | máquina da ckm | opcional; a ckm não encrava hoje (análogo real: `feed`, 112/113) |
| `platoon_man_crossed {id}` | 150 | cruzamento x=-20 de `pl_east_*` em `hold_corridor` | `-pacing` conta `x <= -275`; contagem por homem é nova |

`ally_down` e `enemy_grenade` deixaram de ser necessários nesta revisão.

### NEEDS_CAST (ids de `cast` para legenda; hoje caem em `generic_rifleman`)

`hajduk` (110, 111, 112, 114, 116, 119), `cyra` (113, 115, 117), `piszczek` (118). Também `rusek` (sem fala aqui; `east_platoon_voice` mantém-se). `sapper_2` = Wąs (152), `sapper_3` = Lenc (126) já existem como sapadores sem nome.

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

Dos 55: 5 dependem de `NEEDS_EVENT` (114, 115, 141, 142, 150); as outras 50 usam eventos ou estado que já existem. As que são só estado em poll, sem evento: 116–119, 122–124, 132–134, 136–137, 143–147, 151–154.

## 6. Para revisão (dúvidas desta auto-revisão)

Nenhum outro agente reviu isto: só auto-revisão contra as regras.

1. **Polaco** (rever com falante nativo): 122 *Głów nie podnosić* (forma); 130/131 *wał północny/południowy* (dique, termo local para o dique de Lisewo); 132 *Wychyla się* (espreitar); 137 *kratownica* (treliça); 118/119 *Kapralu* (assume Hajduk como *kapral*, sem fonte: confirmar posto); 147 *portal drogowy* (portal da estrada); 152 *zapalnik* (espoleta; talvez *kapsuł*/*lont* conforme a carga).
2. **Hajduk, Cyra, Piszczek** são nomes da Character Bible Fable (PR #56, não integrado). Sem cast: usar `generic_rifleman` até serem aprovados.
3. **Histórico:** 120/143 usam "MG" para a metralhadora alemã (o termo exacto polaco de 1939 para a MG34 é dúvida; "cekaem" é a nossa wz.30). 117: o wz.30 é arrefecido a água (correto). 116–119 assumem que a ckm retira para a estação com a guarnição (alinhado com o `retreat` T47, mas o destino "estação" vem da Fable 116).
4. **Pedido "tiro certeiro / abate":** o pedido incluía falas de bom tiro. Respeitei Fable §6 ("ninguém agradece ao jogador"): 140–143 corrigem e mandam mudar de posição, sem elogio. Decisão de produto do Capitão se preferir elogio curto.
5. **Palavras:** 148 tem 8 palavras (>6). 141 tem 8. Estão em prioridade 2 (não de perigo).
6. **Conflito de numeração:** os ids 100–154 colidem com a numeração de Fable (100–209, por personagem) e com FABLE_GAP §4 (100–124). Coluna "Ref. Fable/GAP" dá o mapeamento. Não reusei nenhum número para o mesmo texto sem o indicar; 100–154 são deste rascunho.
7. **Pacing:** a janela 05:34–05:59 é comprimida a 24x; cooldowns em `clock` são necessários, mas a leitura de `threat.recentFire` num `battleClock` comprimido pode saltar de 90 s de jogo em 4 s reais; se o Capitão achar poucas oportunidades de falar, rever 128/129 (CD 90 s).
8. **Granada do jogador (138):** aviso de aliado quando o JOGADOR lança; não é aviso de granada recebida (não há granadas alemãs; 139 virou `Padnij!` por estalo, alternando com 121 como a Fable 135 previa).
9. **Baixas (100–103, 106–107):** `round-impact.victim` só dispara com mortes do pelotão leste no tabuleiro. 104/108 foram religadas a `evt_m01_bak_wounded` e `evt_m01_dudek_retrieves_bak` porque Dudek está no `aid_position` ou com Bąk nessa altura.
10. **149:** foi corrigida para "Volte"; a primeira versão mandava ir para oeste, contra o fluxo (HUD "volte à secção").
11. **Nowicki** não fala (ausente após o bombardeio). **Jan** só tem 150 (Character Bible: Jan quase não fala).
12. **Testes:** não corri `npm test`: é só um documento de dados. O JSON foi validado em Python (ids únicos 100–154, nenhum em colisão com 001–067, todos os falantes em `cast`).
