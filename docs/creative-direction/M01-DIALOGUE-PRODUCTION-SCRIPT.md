# M01 — DIALOGUE PRODUCTION SCRIPT · Falas, variações, callouts e política de idioma

**Estado:** PROPOSTA DE PRODUÇÃO. As 70 falas canónicas (`dlg_m01_001`–`067`, `056a/b/c`, `057a/b`) e os callouts existentes **não mudam de texto** (três são verificadas literalmente por teste: 004, 022, 048). As falas novas usam IDs `dlg_m01_100+` e `co_m01_*`, para nunca colidir. Cada fala nova indica **gatilho real** (evento, handler ou cena já existentes), condição, cooldown, prioridade e classe **[A]/[B]** (matriz em [`M01-INTEGRATION-MATRIX.md`](M01-INTEGRATION-MATRIX.md)).

## 0. Como o sistema atual fala (o que existe, para não inventar)

- `M01Simulation.line(id, token)` põe a fala numa fila FIFO (`dialogueQueue`), uma legenda de cada vez, duração `max(2,5 s, min(6 s, caracteres/24))`, sem prioridade nem interrupção. `token` evita repetição: a mesma fala pode tocar outra vez com outro token (ex.: `dlg_m01_029:${floor(clock/90)}` repete de 90 em 90 s).
- Falas tocam em: handlers de eventos (`consume`), conclusão de objetivos (`updateObjectives`), cenas (`updateScene` por beats, com `lineVariants` por flag), combate (`co_m01_enemy_mg_fire_on_squad`, `co_m01_enemy_group_suppressed`, 022 na primeira supressão, 029 na recarga de Kowal, 040 quando o pelotão passa a < 25 m, 050/051 por relógio).
- Callouts listados em `mission.json → callouts.lines` **sem** `id` (`npc_reloading`, `player_reloading_near_ally`, `ally_hit`, `cover_rotation`, `sun_glare_player_facing_east`) estão especificados mas **não ligados**; o validador só aceita IDs `co_m01_*`.
- Mensagens de sistema (`message()`) são texto de HUD, não falas: "Abrigue-se!…", guia de rumo, carregadores de Kowal, escolta de Zieliński.
- Legenda: `NOME: fala` (HUD V1), nome do orador a latão; uma linha de cada vez.

**Consequência de direção:** as falas novas de combate devem ser curtas (≤ 6 palavras), porque a fila é FIFO: uma fala longa atrasa um aviso. Propõe-se, como **[B]**, um campo `priority` na fila (`critical > danger > mission > response > ambient`) com interrupção da legenda `ambient` por `critical`. Até lá, as falas `ambient` abaixo têm cooldown ≥ 60 s e nunca tocam em fases `FIRST_CONTACT`, `SET_PIECE`, `CLIMAX`.

## 1. Política de idiomas, legendas e adaptação

| Tema | Decisão |
| --- | --- |
| Idioma do áudio | **Polaco** para toda a secção, sapadores, guarnição, Pawlak, Rusek e Lipski. **Alemão** não é gravado em M01: a 700–1200 m nenhuma voz é audível; os alemães comunicam por clarões, cadência e movimento. |
| Legendas | **Português** (registo já usado em `mission.json`: "você", "Cubro você!", "Carrego. Depois cobro."). As falas novas seguem o mesmo registo para não misturar tratamentos na mesma secção. Uma passagem única de localização (pt-PT/pt-BR) deve ser decidida pelo Capitão antes da gravação; as cartelas do HUD V1 já usam "Polónia". |
| Referências em polaco | Fornecidas neste documento para as ~40 falas estruturantes, como **referência de gravação a rever por falante nativo**; não são texto de jogo. Formas de tratamento: apelidos sem "pan" entre soldados (*Wrona!*), *panie sierżancie* para o sargento, *panie kapralu* dos sapadores para Krawiec, *proszę pana* de Lipski (civil) para militares. |
| Sotaques | Sem caricatura. Vozes nativas ou fluentes; licença por ator em `ASSET_CREDITS.md`. |
| Nomes próprios no texto | Nunca "tradução" de nomes (Zieliński é Zieliński). Patentes em polaco nas cartelas (*sierżant*, *kapral*, *strzelec*) e em português nas legendas descritivas. |
| Gritos de combate | Monossílabos polacos sobrevivem sem legenda quando o sentido é evidente (*Padnij!* = "Deita!"); a legenda mostra o português. |
| Silêncio | É uma fala. Beats de silêncio têm duração definida nas cenas e não são preenchidos com callouts. |
| Formato | `NOME: fala`; ≤ 2 linhas; ≤ 6 s; nome do orador sempre visível (acessibilidade). Linhas simultâneas: máximo 2 vozes (regra de `callouts.note`). |
| Interrupção | Explosão, morte do orador, mudança de setor, restauro e skip cortam a fala em curso (parte já implementada: skip limpa a fila; restauro repõe a fila do save). Um orador morto/evacuado nunca fala (regra do PR #44, adotada). |

## 2. Falas canónicas (inalteradas) — mapa de uso

Para referência rápida da equipa de voz. Texto completo em `mission.json`.

| Bloco | IDs | Momento |
| --- | --- | --- |
| Intro | 005, 001, 002, 006, 007, 003, **004** | `cs_m01_intro` t 13–40 |
| Caminho/posto | 008, 009, 010, 011 | 04:31; entrega |
| Aviões | 012, 013, 067, 066 | 04:33:10 |
| Bombardeio | 014, 016, 015, 017 | `cs_m01_bombing`; 04:35:30 |
| Reunião | 018, 019, 020 | rally point |
| Sapadores | 021, 023, 024, **022** | repair sites |
| Trem | 025, 028, 026, 027, 029, 030, 038 | 04:45–05:30 |
| Reparo pronto | 031, 032 | gate |
| Ordem | 033, 034 | `cs_m01_order` |
| Contra o sol | 035, 036, 037 | 05:30–06:00 |
| Tabuleiro | 039, 040, 041, 042, 043 | 06:00–06:10 |
| Explosão leste | 044, 045, 046 | `cs_m01_east_blast` |
| Corredor | 047, **048**, 049, 050, 051 | 06:10–06:45 |
| Oeste | 052 | `cs_m01_west_blast` |
| Chamada | 053–065 (+056a/b/c, 057a/b) | `cs_m01_roll_call` |
| Callouts ligados | `co_m01_enemy_mg_fire_on_squad`, `co_m01_enemy_group_suppressed` | combate |

## 3. Falas novas por personagem

Legenda das colunas: **Gatilho** = evento/handler/cena existente; **Cond.** = condição adicional; **CD** = cooldown; **Pri.** = prioridade proposta; **Cl.** = classe.

### 3.1 Jan Wrona (100–109)

| ID | Texto | Gatilho | Cond. | CD | Pri. | Cl. | PL ref. |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 104 | Era só para levar o café. | depois de 018, no rally point | jogador parado ≤ 3 m de Zieliński por 4 s; fase `SETUP`→`MAIN` | única | ambient | B | *Miałem tylko zanieść kawę.* |
| 105 | Dois segundos. | `m01-blast` `east_demolition` + 2,3 s (chegada do som) | jogador no tabuleiro (x 20–160) | única | response | A | *Dwie sekundy.* |

(104 é a proposta do PR #44, adotada; é opcional e nunca obrigatória.)

### 3.2 Zieliński (110–119)

| ID | Texto | Gatilho | Cond. | CD | Pri. | Cl. | PL ref. |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 110 | Rusek. Esses já não vêm. | `evt_m01_east_demolition` + 8 s | Rusek (`east_platoon_voice`) vivo e ≤ 30 m | única | response | A | *Rusek. Ci już nie przyjdą.* |
| 111 | Wrona. Não gasto cartuchos com quem já caiu. Nem você. | `player-shot` cujo traçado passa a < 3 m de um `de_spans_*` em `DOWN`/`RETREAT` **ou** o atinge (mesma lógica de aproximação da supressão) | depois de `east_demolition` | única | mission | A | *Wrona. Nie marnuję naboi na tych, co już padli. Ty też nie.* |
| 112 | Cinco e meia. | `cs_m01_order` t 0,5 | — | — | mission | A | *Wpół do szóstej.* |
| 113 | O sol está do lado deles. Esperem o clarão. | `evt_m01_order_demolish` + 25 s | jogador virado a leste (±30°) | 120 s | ambient | B | *Słońce jest po ich stronie. Czekajcie na błysk.* |
| 114a | Para os sacos! Já! | rotação `cv_sandbag_mid_2` | salva real emitida (já existente) | — | danger | A | *Do worków! Już!* |
| 114b | Portal! Atrás da ombreira! | rotação `cv_portal_road_n` | idem | — | danger | A | *Portal! Za filar!* |
| 114c | Treliça! Rasteje! | rotação `cv_road_truss_1` / `_3` | idem | — | danger | A | *Kratownica! Czołgaj się!* |
| 114d | Torre! Lado norte! | rotação `cv_tower_p1_n` (substitui a genérica 035 nesse nó) | idem | — | danger | A | *Wieża! Od północy!* |
| 115 | Pawlak. Água. Depois fala. | `evt_m01_runner_pressure_report` t 0 (antes de 037) | — | — | response | A | *Pawlak. Woda. Potem mów.* |
| 116 | Hajduk. Para a estação. A arma vai convosco. | guarnição ckm em fase `retreat` a ≤ 12 m do jogador | — | única | mission | A | *Hajduk. Na dworzec. Karabin idzie z wami.* |
| 117 | Dudek, vai. Eu digo quando. | `evt_m01_dudek_retrieves_bak` | — | — | mission | A | *Dudek, idź. Powiem kiedy.* |
| 118 | Sem corrida. Quem corre cai. | `obj_m01_leave_bridge` ativo + jogador a sprintar no tabuleiro (x > 20) | — | 60 s | response | B | *Bez biegu. Kto biegnie, pada.* |
| 119 | Contem. Em voz alta. | primeiro `pl_east_*` passa o jogador no corredor (x < −20) | 047 já dita | única | mission | A | *Liczcie. Na głos.* |

Variações de 015 ("Siga a minha voz"), usadas em vez da mensagem de HUD repetida de 7 em 7 s **[A]**: 015a *"Wrona! Aqui! Trincheira!"*, 015b *"Pela esquerda! Cabeça baixa!"*, 015c *"Mais vinte metros!"*, 015d *"Estou a ouvi-lo. Venha."* Rotação por token de tempo; a mensagem de HUD passa a aparecer só se nenhuma fala tocou nos últimos 14 s.

### 3.3 Krawiec (120–129)

| ID | Texto | Gatilho | Cond. | CD | Pri. | Cl. | PL ref. |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 120 | Três… quatro… agora. | fim de `repairSuppressedUntil` (sapadores levantam-se) | `repairPins` ≥ 1 | 25 s | response | A | *Trzy… cztery… teraz.* |
| 121 | Lenc! Cabeça! | supressão do reparo, 2.ª vez em diante | — | 30 s | danger | A | *Lenc! Głowa!* |
| 122 | Metade. Não comemorem. | `cover_repair.progress` ≥ 50 | — | única | ambient | A | *Połowa. Nie cieszcie się.* |
| 123 | Isto sabe ao meu avô. | nunca (reservada; não usar: contradiz a voz de Krawiec) | — | — | — | — | — |
| 124 | Apito. Três toques. Depois, chão. | `cs_m01_east_blast` t −7 | — | — | mission | A | *Gwizdek. Trzy razy. Potem na ziemię.* |
| 125 | Oitenta anos. Quarenta segundos. | `cs_m01_west_blast` t 13 | — | — | ambient | A | *Osiemdziesiąt lat. Czterdzieści sekund.* |
| 126 | Vá para o rio. Não para mim. | jogador fica ≤ 2 m de um sapador a trabalhar por > 6 s | durante `cover_repair` | 45 s | response | B | *Patrz na rzekę. Nie na mnie.* |

### 3.4 Kowal (130–139)

| ID | Texto | Gatilho | Cond. | CD | Pri. | Cl. | PL ref. |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 130 | Clarão. Esquerda do portão. Conta até três. | `enemy-fire` de `de_east_0/1` visto (`recentFire`) | 2.ª ocorrência em diante; jogador ≤ 40 m | 90 s | response | A | *Błysk. Na lewo od bramy. Licz do trzech.* |
| 131 | Dois carregadores. Depois é com o Wrona. | reabastecimento de Jan por Kowal | `kowalRounds` ≤ 10 após dar | única | response | A | *Dwa magazynki. Potem radź sobie, Wrona.* |
| 132 | A MG calou. Trabalhem! | `de_east_0` ou `_1` entra em `suppressedUntil` por tiro do jogador | durante `cover_repair` | 20 s | response | A | *Cekaem ucichł. Robota!* |
| 133 | Não é um. São dois. | `evt_m01_panzerzug_arrives` + 15 s | — | única | ambient | A | *Nie jeden. Dwa.* |
| 134 | Mil metros. Não é tiro, é pontaria. | depois de 181 (Rusek) + 3 s | — | única | response | A | *Tysiąc metrów. To nie strzał, to celowanie.* |
| 135 | Abaixa! | `round-impact` com `crack` a ≤ 6 m do jogador | Kowal ≤ 25 m | 12 s | danger | A | *Padnij!* |

### 3.5 Bąk (140–149)

| ID | Texto | Gatilho | Cond. | CD | Pri. | Cl. | PL ref. |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 140 | Wrona, que horas são? | `cs_m01_intro` t 16 | — | — | ambient | A | *Wrona, która godzina?* |
| 141 | E agora? Que horas? | `evt_m01_runner_pressure_report` + 3 s | Bąk vivo, ≤ 20 m | única | ambient | A | *A teraz? Która?* |
| 142 | Um… dois… três… | `evt_m01_east_platoon_withdraws` + 2 s (Bąk parte para o tabuleiro) | — | única | ambient | A | *Raz… dwa… trzy…* |
| 143 | Não me deixe cair. | jogador apanha Bąk (`carrying='jozef_bak'`) | — | única | response | A | *Nie upuść mnie.* |
| 144 | Dez… nove… oito… | 10 s depois de 143 | ainda carregado | única | ambient | B | *Dziesięć… dziewięć… osiem…* |
| 145 | Dudek… ele carregou. Depois cobra ele. | `obj_m01_rescue_bak` concluído | — | — | response | A | *Dudek… on mnie niósł. Teraz jemu policz.* |

### 3.6 Dudek (150–159)

| ID | Texto | Gatilho | Cond. | CD | Pri. | Cl. | PL ref. |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 150 | Não olhe para a perna. Olhe para mim. | entrega de Bąk em `aid_position` (ambos os ramos: por Jan ou por Dudek) | — | única | response | A | *Nie patrz na nogę. Patrz na mnie.* |
| 151 | Devo-lhe uma. Está no caderno. | `cs_m01_roll_call` t 16,5 | `m01.bak_status = rescued_by_player` | — | ambient | A | *Jestem ci winien. Mam zapisane.* |
| 152 | Segura a cabeça. Assim. | fase `grab` do arrasto da estação (já tem 017) | — | — | response | A | *Trzymaj głowę. O tak.* |
| 153 | Já está. Já está. | fase `release` na estação | — | — | ambient | A | *Już. Już.* |

### 3.7 Pawlak (160–169)

| ID | Texto | Gatilho | Cond. | CD | Pri. | Cl. | PL ref. |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 160 | Quatro e quarenta e cinco. (prefixo opcional, dito imediatamente antes de 025; o texto canónico de 025 não muda) | `evt_m01_train963_arrives` t 0 | só se a gravação o permitir sem cortar 025 | — | mission | A | *Czwarta czterdzieści pięć.* |
| 161 | Do outro lado, o oficial mandou dizer só isto: aguentem. | depois de 037 + 4 s | — | — | mission | A | *Z tamtej strony oficer kazał powiedzieć tylko to: trzymajcie się.* |
| 162 | Seis e dez. É agora. | `cs_m01_east_blast` t −3 | — | — | mission | A | *Szósta dziesięć. To teraz.* |
| 164 | Cinco e trinta e quatro. Acabou lá em cima. | `m01.second_raid_state` → `ended` | — | — | ambient | A | *Piąta trzydzieści cztery. Tam w górze koniec.* |

### 3.8 Lipski (170–179)

| ID | Texto | Gatilho | Cond. | CD | Pri. | Cl. | PL ref. |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 170 | O senhor cabo andou meses nos meus pilares de lanterna. Eu sabia. | `evt_m01_railway_worker_report` (variante de 008 se Krawiec ≤ 20 m de Lipski) | raro; opcional | única | ambient | B | *Pan kapral miesiącami chodził po moich filarach z latarką. Wiedziałem.* |
| 171 | Szymankowo continua sem responder. | `evt_m01_wounded_dragged` (04:35:30) | jogador ≤ 15 m de Lipski (mesmo padrão de 008) | única | ambient | A | *Szymankowo dalej nie odpowiada.* |
| 172 | Deixem passar as carroças! | setor S3 entra em `carts_evacuating` (05:40) | jogador ≤ 40 m da estação | única | ambient | B | *Przepuśćcie wozy!* |

### 3.9 Rusek (180–189)

| ID | Texto | Gatilho | Cond. | CD | Pri. | Cl. | PL ref. |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 180 | Caíram todos na ckm. Todos. Eu estava a carregar. | `evt_m01_east_demolition` + 20 s | Rusek vivo, ≤ 30 m do jogador | única | ambient | A | *Wszyscy padli przy cekaemie. Wszyscy. Ja ładowałem.* |
| 181 | Estão ali. A rastejar. Deixe-me. | `evt_m01_east_demolition` + 6 s | idem | única | response | A | *Tam są. Czołgają się. Puśćcie mnie.* |
| 182 | — (silêncio: 20 s sem falas de secção depois de 110) | — | — | — | — | A | — |

### 3.10 Guarnição da ckm (190–199)

| ID | Orador | Texto | Gatilho | Cl. | PL ref. |
| --- | --- | --- | --- | --- | --- |
| 190 | Hajduk | Esta não fica. Vem connosco. | `ckm.phase` → `abandon` | A | *Ten nie zostaje. Idzie z nami.* |
| 191 | Hajduk | Água fora. Caixas. Vai. | `abandon` + 1,5 s | A | *Woda precz. Skrzynki. Idź.* |
| 192 | Cyra | Fita no meu ombro. Não puxes. | `abandon` + 2,5 s | A | *Taśma na moje ramię. Nie ciągnij.* |
| 193 | Piszczek | Capral, e se eles atravessarem? | fase `retreat`, ≤ 12 m do jogador | A | *Panie kapralu, a jak przejdą?* |
| 194 | Hajduk | Então é por isso que a levamos. | 193 + 2 s | A | *Dlatego ją niesiemy.* |

### 3.11 Sapadores (200–209)

| ID | Orador | Texto | Gatilho | Cl. | PL ref. |
| --- | --- | --- | --- | --- | --- |
| 200 | Wąs | Cabo. Pronto aqui. | `cover_repair.progress` ≥ 50 (antes de 122) | A | *Kapralu. Tu gotowe.* |
| 201 | Wąs | (respiração; sem legenda) | sapadores `pinned` | A (VO) | — |
| 202 | Lenc | Outra vez não… | `repairPins` = 3 | A | *Tylko nie znowu…* |

### 3.12 Callouts a ligar (IDs novos para os já especificados) **[A/B]**

| ID | Orador | Texto (existente ou novo) | Evento real | Cl. |
| --- | --- | --- | --- | --- |
| `co_m01_npc_reloading` | any_pl | Recarregando! | `npc-shot` seguido de `rounds=20`/cooldown (Kowal já tem 029; usar para fuzileiros quando o `reload_clip` for resolvido) | B |
| `co_m01_player_reloading_near_ally` | Bąk | Cubro você! (= 030) | `reload` com Bąk ≤ 8 m e vivo | A |
| `co_m01_ally_hit` | any_pl | Sanitário! | `hitAt` real num `pl_*` ≤ 30 m (contrato de animação V1 expõe `hitAt`) | A |
| `co_m01_cover_rotation` | Zieliński | Mudar! Próxima posição! (= genérica) | salva real (já) quando o nó não tem 114a–d | A |
| `co_m01_sun_glare` | Zieliński | Tira os olhos do sol! | jogador virado a leste ±25° por > 6 s entre 05:30 e 06:40 | B |
| `co_m01_bullet_crack` | Kowal/Bąk | Abaixa! (= 135) | `round-impact.crack` | A |
| `co_m01_platoon_count` | Jan | {n}. (contagem parcial em voz alta, um número por homem que passa) | cada `pl_east_*` que cruza x = −20 | B |

## 4. Variação contextual (anti-repetição)

| Situação repetível | Linhas disponíveis | Regra de rotação |
| --- | --- | --- |
| Guia "siga a voz" | 015, 015a–d | token por `floor(clock/14)`; nunca a mesma duas vezes seguidas |
| Rotação de cobertura | 035, 114a–d, `co_m01_cover_rotation` | por nó reservado (`m01.suggested_cover`) |
| MG dos portões dispara | 027, 130, `co_m01_enemy_mg_fire_on_squad` | 1.ª: callout; 2.ª: 027; 3.ª+: 130 com CD 90 s |
| Sapadores deitados | 022 (1.ª, obrigatória), 121 (2.ª+), 202 (3.ª), 120 (ao levantar) | contadores já existentes (`repairPins`) |
| Recarga de Kowal | 029 | token `floor(clock/90)` (já) |
| Estalo perto do jogador | 135 (Kowal), 030-variante (Bąk) | alternar orador por paridade de `floor(clock/12)` |
| Pelotão passa | 040, 119, `co_m01_platoon_count` | 040 uma vez; contagem por homem |
| Demolição oeste | 050, 051, 125 | por relógio (já) |

## 5. O que fica em silêncio (contrato)

| Janela | Duração | Nenhuma fala exceto |
| --- | --- | --- |
| 04:33:10 → 04:34:00 (motores) | ~40 s de relógio | 012, 013, 067, 066 |
| 05:30:00 → 05:34:00 (raid alto) | janela | 112, 033, 034, 164 no fim |
| `east_demolition` t 0 → t 8,5 | 8,5 s | 105 (opcional, após o som) |
| `west_demolition` t 0 → t 11 | 11 s | — |
| Depois de 110 | 20 s | — (a secção não responde ao jogador) |
| `cs_m01_roll_call` t 31–38 | 7 s | 059 (2.ª vez) |

## 6. Falas que não existem (decisões)

- Nenhum alemão fala. Nenhum oficial histórico fala. Ninguém diz "morto" (Zieliński diz "depois"; Dudek diz "no chão"; Kowal diz "lá se foi").
- Ninguém comenta Szymankowo além de Lipski (008, 171) e do debrief.
- Ninguém diz "o primeiro dia da guerra" ou "Westerplatte".
- Ninguém agradece ao jogador. A gratidão é a dívida (056a, 145, 151), nunca um elogio.

## 7. Entrega para gravação (checklist)

- [ ] Lista final de IDs aprovados pelo Capitão (canónicos + novos).
- [ ] Texto em polaco revisto por falante nativo; registo militar de 1939 (sem anglicismos, sem calão pós-guerra).
- [ ] Três tomadas por fala: calmo / sob fogo / exausto, onde aplicável.
- [ ] Respirações e esforço (`201`, carregar Bąk, arrastar o ferido) gravados como camadas separadas.
- [ ] Nenhuma fala com música por baixo.
- [ ] Licenças dos atores registadas em `ASSET_CREDITS.md`; sem vozes sintéticas que imitem pessoas reais.
