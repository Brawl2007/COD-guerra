# M01 — Tczew 1939 · Plano de produção de áudio (Web Audio)

Estado: **PLANO**, não evidência de implementação. Escrito para fazer M01 deixar de soar a protótipo
(`src/core/audio.js` é hoje síntese procedural com osciladores e ruído branco, por chamada, sem posicionamento,
sem prioridades e com `Math.random` na apresentação). Alvo: Chromium num Chromebook de referência a 1280×720,
30 FPS, sem dependências externas no carregamento sob `/COD-guerra/`.

Regras que este plano respeita e que a implementação não pode quebrar:

- `M01Simulation` guarda apenas dados e emite eventos; o áudio é apresentação. O áudio **nunca** consome `sim.rng`,
  nunca decide dano, visibilidade, supressão ou estado de missão, e nunca escreve no save.
- Nada extraído de Call of Duty ou de outro jogo. Cada ficheiro final tem autoria, licença compatível com repositório
  público e origem registada em `ASSET_CREDITS.md`. Sem clonagem de voz de pessoas históricas.
- Não inventar FPS nem custos de CPU. Os orçamentos abaixo são metas a medir no aparelho real; o SwiftShader do CI
  não mede nada disto.
- Os horários de `missions/m01-tczew/mission.json` (eventos, sectores, cutscenes) são a autoridade temporal.
  Som de um evento só toca quando o evento acontece de facto.

Índice: 1 arquitectura · 2 taxonomia de eventos · 3 near/mid/far por família · 4 limites de concorrência ·
5 prioridade e voice stealing · 6 atenuação · 7 oclusão · 8 aleatoriedade determinista · 9 orçamento ·
10 TASK CONTRACT.

---

## 1. Arquitectura Web Audio

### 1.1 Grafo

```
[voices]──► WEAPONS_1P ─┐                       (arma do jogador, sem panner, estéreo fixo)
[voices]──► WEAPONS_3D ─┤
[voices]──► BALLISTICS ─┤  (cracks, whizzes, impactos)
[voices]──► EXPLOSIONS ─┼──► DUCK ──► MASTER ──► LIMITER ──► destination
[voices]──► VEHICLES ───┤               ▲
[voices]──► STRUCTURE ──┤               │
[loops ]──► AMB_NEAR ───┤        (ganho modulado por eventos: ducking, "surdez" pós-explosão)
[loops ]──► AMB_FAR ────┤
[voices]──► VOICES ─────┤  (não passa pelo DUCK; é o DUCK que protege as vozes)
[voices]──► FOLEY ──────┤
[    ]──► MUSIC ────────┘  (reservado; silencioso em M01, ver §3.12)
[voices]──► UI ────────────► MASTER

REVERB_A (vale do Vístula, ~3,2 s)  ◄── sends por voz   ──► MASTER
REVERB_B (treliça / interior, ~0,9 s) ◄── sends por voz  ──► MASTER
```

- Um único `AudioContext` ({latencyHint:'interactive'}), criado no gesto do utilizador como hoje (`Game.start/resume`).
  `suspend()` na pausa/perda de foco, `close()` no `dispose()`. Mantém o padrão actual.
- Cada bus é um `GainNode`. Os canais pedidos pelo prompt mestre (MASTER, MUSIC, WEAPONS, VOICES, EXPLOSIONS,
  AMBIENCE) existem como grupos de buses; o menu só expõe MASTER agora, os restantes ficam preparados para opções.
- `LIMITER`: `DynamicsCompressorNode` (threshold −6 dB, knee 0, ratio 12, attack 3 ms, release 250 ms). É rede de
  segurança contra clipping quando se somam tiro próximo + estrondo + estalo, não é "glue".
- `DUCK`: ganho com rampas agendadas (`setTargetAtTime`) pela lógica de eventos; o Web Audio não tem sidechain
  nativo e o `AudioWorklet` fica fora da fase 1 (ver §9). Regras em §3.12.
- Reverb por `ConvolverNode` com **impulsos sintéticos gerados em código** (ruído com decaimento exponencial,
  filtrado por bandas; sem IR gravado de terceiros). Dois convolvers no máximo; mono; `normalize=true`.
  No preset `low`, substituir por rede de delays realimentados com passa-baixo (sem convolução).

### 1.2 Cadeia de voz (pool)

Uma voz é uma cadeia pré-alocada e reutilizada; só o `AudioBufferSourceNode` é criado por disparo (é one-shot por
especificação):

```
BufferSource ──► GainNode(env) ──► BiquadFilter(lowpass; distância+oclusão) ──► PannerNode ──► [send → REVERB_A/B]
                                                                               └──────────────► bus
```

- `PannerNode`: `panningModel='equalpower'` por defeito (HRTF custa ~uma convolução por voz e não cabe no
  Chromebook); `distanceModel='linear'`, `refDistance=1`, `maxDistance=1e6`, `rolloffFactor=0`, cone desligado.
  Ou seja: **o panner só faz direcção**; a atenuação é calculada em JS pelas curvas de §6 e aplicada no `GainNode`.
  Isto dá crossfades near/mid/far e piso de ganho controlados, e torna a atenuação testável em Node sem
  `AudioContext`.
- `AudioListener` sincronizado uma vez por frame com `eyePosition(player)` e `aimDirection(angle,pitch)` (M01 em
  metros; a bancada converte por `UNITS_PER_METRE`). Usar `positionX.value=` directo (sem rampas: o jitter de 30 FPS
  é inaudível e as rampas acumulam automations).
- Vozes 1P (arma do jogador, foley do jogador, ferrolho/clipe) não têm panner: vão directas para o bus com
  `StereoPanner` fixo (ferrolho ligeiramente à direita, clipe ao centro).
- Doppler: removido da especificação Web Audio. Para o Ju 87 e os comboios calcula-se em JS
  `playbackRate = 343 / (343 − v_radial)` limitado a [0,85; 1,25], actualizado a 10 Hz com `setTargetAtTime`.

### 1.3 Relógios e agendamento

- Um único domínio de tempo para decisões: `sim.clock` (segundos de jogo activo; pára na pausa). O `battleClock`
  (escala 1×–27×) **só** escolhe estados de sectores; nunca acelera a densidade de sons por segundo real.
- Atraso de propagação `d/343` já existe para `enemy-fire` e `m01-blast` (`Game.pendingSounds`, reconstruído por
  `rebuildSounds()` ao restaurar). Generalizar: qualquer fonte a mais de 60 m toca com atraso (0,17 s já é
  perceptível contra o clarão). Fonte a menos de 60 m toca no frame.
- `pendingSounds` é fila em `sim.clock`; a execução converte para `ctx.currentTime + (at − sim.clock)` com
  lookahead de um frame, e nunca agenda no passado (se `at < sim.clock − 0,25`, descarta: evitamos acumulação depois
  de um frame lento).
- Loops (ambiente, comboio, fogo) são posicionados por fase: `start(0, offset)` com `offset = (sim.clock − t0) mod
  duração`, para que pausa/reload retomem o mesmo ponto, sem contadores de tempo real.

### 1.4 Assets e carregamento

- Formato: Ogg Vorbis q4–q5 (≈110–130 kbps) para one-shots; Opus 96 kbps em `.ogg` para loops longos. 48 kHz.
  Mono para tudo o que é posicionado; estéreo só para beds de ambiente e para a camada 1P do tiro do jogador.
- `assets/audio/m01/manifest.json`: `{id, file, bus, gainDb, variants, loop, priority, licence, author, note}`.
  O carregamento lê o manifesto; um ficheiro em falta cai no sintetizador actual (comportamento já existente:
  "Áudio procedural ativo") e aparece em `gameDiagnostics().audio.missing`. Nunca bloqueia o início.
- `decodeAudioData` só depois do gesto (precisa do contexto). Três patamares de pré-carregamento (§9.3).
- Memória PCM: um segundo mono a 48 kHz = 192 KB. Orçamento §9.

### 1.5 Diagnóstico

`?debug=1` → `gameDiagnostics().audio`: `{contextState, baseLatency, outputLatency, voices:{active,byBus},
steals, dropped, pending, missing, loadedBytes}`. Nada disto aparece no HUD normal (RUNBOOK).

---

## 2. Taxonomia de eventos

### 2.1 IDs de som (namespaces)

```
wpn.<arma>.<camada>.<parte>      arma ∈ {wz29, kar98k, mg34, ckm30, rkm28, vis35}
                                 camada ∈ {near, mid, far}  parte ∈ {transient, body, mech, tail}
bal.crack | bal.whizz | bal.ricochet
imp.<material>.<camada>          material ∈ {earth, stone, brick, wood, metal, water, character}
exp.<tipo>.<camada>              tipo ∈ {grenade, bomb50, bomb250, demolition, artillery}
air.ju87.<estado>                estado ∈ {drone_far, drone_near, dive_siren, pullout, bomb_release}
air.heavy.drone_far              (raid de alta altitude 05:30)
veh.train.<parte>                parte ∈ {chuff, whistle, brake, coupling, idle_hiss, rail_hum}
veh.panzerzug.<parte>            parte ∈ {chuff_heavy, armour_rumble, brake}
struct.bridge.<parte>            parte ∈ {creak_wind, stress_metal, deck_step, span_groan, collapse, splash, debris}
fire.<tamanho>                   tamanho ∈ {wagon, small}
amb.<bed>                        bed ∈ {dawn_river, wind_open, wind_truss, dust_fall, smoke_drift, yard_night}
amb.far.<gerador>                gerador ∈ {rifle_single, mg_burst, ckm_burst, shout_walla, artillery_rumble}
voc.<actor>.<linha>              falas de mission.json (dlg_/co_); voc.walla.{pl_near, pl_far, de_far}
foley.step.<material>.{walk,run,crouch} | foley.cloth.{move,sprint,crouch} | foley.gear.{rattle,land} | foley.breath.sprint
ui.*
```

### 2.2 Mapeamento evento da simulação → sons

Os eventos existem hoje em `src/game/m01-simulation.js`; a coluna "campos" indica o que a apresentação precisa e
está marcado **[novo]** o que falta (todos dados, nenhum muda comportamento).

| Evento sim | Campos usados | Sons |
| --- | --- | --- |
| `player-shot` | `weapon`, `material`, `point` | `wpn.wz29.near.*` (1P); `imp.<material>` no `point` (3D, com atraso se >60 m); `bal.ricochet` em stone/metal |
| `reload` | `weapon.reloadMode` | `wpn.wz29.near.mech` sequência bolt/clip/single (1P) |
| `player-hit` | — | `imp.character.near` + `foley.gear.land` + rampa de "surdez" curta |
| `npc-shot` (Kowal) | `point`, `rounds`, **`weapon` [novo]** | `wpn.rkm28.<camada>` rajada de 3 |
| `enemy-fire` | `origin`, `rounds`, `interval`, `weapon`, `at` | `wpn.mg34|kar98k.<camada>` com atraso `d/343`; rajadas como vozes de ronda (≤120 m) ou voz de rajada (>120 m) |
| `round-impact` | `point`, `material`, `crack`, `distance`, `kind` | `bal.crack` se `crack`; `bal.whizz` se `distance` 6–20 m da trajectória **[novo: `pass` = distância mínima ao ouvido]**; `imp.<material>` se <30 m |
| `distant-shot` | `point` | `amb.far.rifle_single` posicionado (Kozliny, norte, 2.ª passagem aérea) |
| `m01-blast` | `point`, `soundAt`, `aerial`, **`kind` [novo: grenade/bomb/demolition/raid]** | `exp.<kind>.<camada>` + `struct.bridge.*` quando demolição + `fire.wagon` quando `station_bomb` |
| `checkpoint` | — | `ui.checkpoint` (discreto, −18 dB) |
| `restored` | — | `rebuildSounds()`; parar todas as vozes 3D com fade de 30 ms; reposicionar loops pela fase |
| `complete` | — | fade geral 1,5 s |
| `message`, `sector-order` | — | nenhum |

### 2.3 Fontes contínuas lidas do estado (sem evento)

Lidas de `sim.renderState` e de `sim.player` uma vez por frame, como o renderer já faz:

| Estado | Som | Nota |
| --- | --- | --- |
| `player.moveBlend`, `sprinting`, `crouched`, material sob os pés | `foley.step.*`, `foley.cloth.*`, `foley.breath.sprint` | Passo disparado por fase do bob (`sin(time·9/14)` cruza zero) — o mesmo relógio do renderer; material por `world.surfaceAt` **[novo, apresentação]** |
| actores aliados/inimigos a <25 m com `moveBlend>0` | `foley.step.*` 3D | máximo 4 vozes (§4) |
| `renderState.stukas` + posições dos aviões (função do `clock`, `m01-view.js`) | `air.ju87.drone_*`, Doppler | posição vem do renderer porque é função determinista do relógio; não há dado de gameplay |
| `renderState.secondRaid` + posição do `raidPlane` | `air.heavy.drone_far` | 1100 m de altitude: só drone, passa-baixo forte |
| `renderState.train963` / `panzerzug` + **posição [novo: hoje o comboio aparece parado]** | `veh.train.*`, `veh.panzerzug.*` | ver §3.7 |
| `renderState.damage[].smokeVisible`, `destruction` (`station_wagon_fire`) | `fire.wagon`, `amb.dust_fall`, `amb.smoke_drift` | loops posicionados |
| `sim.sectors`/`mission.json` `sectors[].schedule` por `battleClock` | `amb.far.*` gerador | §3.11 |
| `mission.json` `sectors[1].audioEmitters` (`ae_s2_mg_dike`, `ae_s2_mg_train`, `ae_s2_ckm_east`) | `wpn.mg34.far`, `wpn.ckm30.far` | já existem no JSON e não são usados por nenhum código: passam a alimentar o gerador distante |
| `scene` (`cs_m01_bombing`, `cs_m01_east_blast`, `cs_m01_west_blast`, `cs_m01_roll_call`) | ducking/silêncios da timeline | §3.12 |
| `subtitle` / `dialogueQueue` | `voc.*` | §3.10 |

### 2.4 Lacunas na simulação (dados, não comportamento)

Fase 0 do contrato (§10) acrescenta apenas campos:
1. `npc-shot.weapon` (`rkm_wz28`), `m01-blast.kind`, `round-impact.pass` (já se calcula `closestApproach`; basta emitir).
2. Fogo da CKM wz.30 da casamata (`grp_ckm_crew`, `cv_casemate_emb_s`): hoje nenhum evento. Opção mínima: uma
   agenda de rajadas em `mission.json` (`audioEmitters` do sector s1, `activeFrom/Until`), consumida só pelo gerador
   de apresentação. Não cria dano nem supressão; fica documentado como dramatização.
3. Posição do comboio 963 e do Panzerzug: hoje `train963`/`panzerzug` são booleanos e a geometria está fixa em
   x≈1075–1215. Para o som de chegada (04:45, 04:52) a apresentação usa uma curva de posição determinista do
   `battleClock` (chegada em 90 s de relógio, travagem nos últimos 20 s) — só apresentação; se mais tarde o comboio
   passar a dado de simulação, a curva lê-o.

---

## 3. Design near / mid / far por família

Bandas de distância (parâmetros de projecto, afinados por família em §6):

| Banda | Distância | Carácter |
| --- | --- | --- |
| near | 0–40 m | transiente intacto, corpo cheio, mecânica audível, cauda curta e seca; sem atraso |
| mid | 40–250 m | transiente arredondado, corpo médio, primeira reflexão do vale, atraso 0,1–0,7 s |
| far | 250–1 500 m | sem transiente: "pop" grave e cauda longa do vale; 0,7–4,4 s de atraso; passa-baixo ≤2,5 kHz |
| horizon | >1 500 m | só rumor; Kozliny, norte, céu |

Cada família tem **samples distintos por banda**, não o mesmo sample com volume diferente (exigência da secção
"Som e leitura" do prompt mestre). O crossfade entre bandas usa janelas de ±25 % da fronteira (§6).

### 3.1 Identidade das armas

| Arma | Quem/onde em M01 | Cadência | Assinatura pretendida (near) | Far |
| --- | --- | --- | --- | --- |
| kb wz.29 (7,92×57) | jogador, secção | semi-auto, ferrolho ~1 s | transiente seco e curto, corpo médio-grave firme, **mecânica em 3 tempos** (abrir–recuar–fechar) a 130/440/910 ms como hoje; clipe de 5 com "clac" metálico e cartuchos individuais na carga parcial | pop seco de ~120 ms + cauda do vale |
| Kar98k (7,92×57) | alemães do dique/tabuleiro (≥690 m) | semi-auto | mesmo cartucho que o wz.29: distinguir sobretudo **pela posição, cadência e eco de leste**; mesmo comprimento de cano (600 mm, T21): a diferença real de timbre é mínima e não se deve fingir outra | único "far" visto pelo jogador; a camada mid só se os alemães do tabuleiro chegarem a <250 m |
| MG34 | portões de Lisewo, trem 963 | 800–900 rpm (sim: `interval` 0,075 s = 800 rpm) | zumbido rápido e uniforme; cada ronda com transiente agudo; cinta e mecanismo entre rajadas | "rasgar" contínuo e grave a 13 Hz, cauda de 1,5 s; **é a assinatura rítmica que o jogador tem de reconhecer** (callout `co_m01_enemy_mg_fire_on_squad`) |
| CKM wz.30 (Browning M1917 polaco, arrefecida a água) | casamata sul (polaca), cabeça de ponte leste até 06:00 | ~600 rpm | batida mais lenta e pesada que a MG34 (10 Hz vs 13 Hz), corpo grave com "tump" da camisa de água; rajadas de 8–15 | a diferença rítmica entre 10 Hz e 13 Hz é o que separa "nossa" de "deles" a 1 km; obrigatório que os dois far-loops tenham cadência exacta |
| rkm wz.28 (BAR polaco) | Kowal, junto ao jogador | ~600 rpm, rajadas de 3 (sim: `rounds:3`) | três transientes claros, corpo entre fuzil e MG, cauda curta; cartucho igual ao wz.29 | raro |
| Vis wz.35 | Zieliński | — | não dispara na simulação; só mecânica no coldre (foley) | — |
| granat wz.33 | jogador | — | alavanca/cavilha (1P), ressalto no chão por material, explosão §3.3 | — |

Camadas por arma e banda: `transient` (0–30 ms), `body` (30–250 ms), `mech` (0,1–3 s, só near/1P), `tail`
(0,3–4 s, escolhido por zona do ouvinte: vale aberto, treliça, interior). Mistura 1P do wz.29: transient −3 dBFS,
body −6, mech −14, tail −12 via REVERB_A send 0,35.

### 3.2 Tiros próximos e distantes: regra de escolha

```
d = distância emissor–ouvinte (3D, metros)
if d < 40:        near  (sem atraso)                    + tail por zona
elif d < 250:     mid   (atraso d/343)                  + REVERB_A send 0,5
elif d < 1500:    far   (atraso d/343, LP por §6)       + REVERB_A send 0,7
else:             amb.far.* (gerador, sem voz própria)
```

Rajadas (`enemy-fire` com `rounds>1`): até 120 m, uma voz por ronda (`interval` exacto da simulação, até 12
rondas); acima de 120 m, **uma voz de rajada** cujo sample tem `rounds` rondas (variantes de 3, 5, 8, 12; escolhe o
≥ mais próximo e corta por envelope). Mantém a cadência real da MG sem gastar 12 vozes a 1 km.

### 3.3 Explosões

| Tipo | Em M01 | Near | Mid/Far |
| --- | --- | --- | --- |
| granada wz.33 | jogador | estalo seco <5 ms, corpo 150 ms, detritos de terra 0,6 s, zumbido 1,5 s configurável | pop + cauda |
| bomba 50 kg (SC 50) | 04:34 (3 bombas: posto avançado/quase-acerto no rio a ≥40 m, repair_site_1, pátio da estação ~300–450 m) | quase-acerto a 40 m: sopro + terra a cair 2 s + silvo da água se no rio | estação: corpo grave 0,8 s, cauda do vale 3 s, vidros (`imp.glass` [far]) e `fire.wagon` a seguir |
| raid 05:30 (alta altitude) | `raid_0530` a (−600, 100), ~700 m | — | rumor em cadeia (3–6 impactos, 0,4–0,9 s entre si), LP 1,2 kHz |
| demolição leste (pilar 6, x≈800) | 06:10, ~700–800 m do tabuleiro | — | ver §3.8 |
| demolição oeste (x≈70) | 06:45, jogador no abrigo/posto | o jogador está a <150 m: near/mid cheio, com oclusão do abrigo | — |
| artilharia | não há em M01 (sem evento); reservar `exp.artillery.far` para o rumor de `s4_north_perimeter` a 07:00 | — | rumor |

Clarão antes do som: já garantido por `soundAt`; manter. Vibração do tabuleiro (`renderer.m01.blast`) continua a
chegar com o som.

### 3.4 Bullet cracks e whizzes

- `bal.crack`: estalo supersónico; só quando a trajectória passa a ≤6 m do ouvido (`round-impact.crack`, já
  calculado). Toca **sem atraso** à chegada (a onda de choque chega com a bala), antes do estampido da origem — a
  ordem "crack … depois bang de leste" é a leitura de fogo a 1,2 km que o jogador deve aprender.
- `bal.whizz`: passagem a 6–20 m (`pass` [novo]); sem crack, só o sibilo com Doppler fixo (sample já gravado com
  descida de tom), −12 dB face ao crack.
- `bal.ricochet`: 1 em 3 impactos em `stone|metal|brick` (hash determinista, §8), nunca em `earth|wood|character`.
- Três variantes de crack por intensidade (≤2 m, ≤4 m, ≤6 m); prioridade P1; nunca mais de 3 em 100 ms (o 4.º é
  descartado — a saturação é pior que a omissão).

### 3.5 Impactos por material

Materiais já existentes no mundo: `earth`, `stone`, `brick`, `wood`, `metal`, `character` (+ `water` quando o
ponto fica abaixo do nível do rio [novo, apresentação]).

| Material | Near | Mid | Notas |
| --- | --- | --- | --- |
| earth | "thud" surdo + poeira | pop surdo | aterro, encosta; é o mais frequente (fogo mergulhante dos portões) |
| stone / brick | estalo mineral + fragmentos | estalo | portais de 1912, estação; ricochete possível |
| wood | estalo lenhoso + lascas | — | sacos/HIGH_COVER, barracão, dormentes |
| metal | "ping" + ressonância 300–600 ms | ping lavado | treliças, carris; ressonância com send para REVERB_B |
| water | "plop" + salpico | — | Vístula |
| character | impacto abafado + reacção (`voc.walla`) | — | nunca gore audível adicional; intensidade configurável |

Impactos do jogador (`player-shot.material`) e de fogo inimigo (`round-impact`) usam o mesmo catálogo; o do
jogador tem atraso `d/343` se >60 m (um tiro a 1 km no dique só "chega" 3 s depois — e é o que o jogador vê no
impacto de poeira).

### 3.6 Ju 87 e aeronaves

Timeline de `s5_sky_east` e `cs_m01_bombing`:

| battleClock | Estado | Som |
| --- | --- | --- |
| 04:33:10 | `stukas_approach` | `air.ju87.drone_far` ×3 (desfasados 0,3–0,8 s, Doppler), de ENE (80°), −30 dB a subir |
| 04:34:00 (cs t=0) | `stukas_attack` | `air.ju87.dive_siren` do 1.º avião (a sirene de mergulho é o único som "icónico" permitido: gravação/síntese própria); 2.º e 3.º com sirene −9 dB e 2–4 s depois |
| cs t=2,1 / 5,0 / 8,5 | bombas | `air.ju87.bomb_release` (silvo descendente 1,5 s) → `exp.bomb50.*` nos pontos reais → `air.ju87.pullout` (motor em carga) |
| 04:36 | `stukas_depart` | drone a descer para −40 dB em 40 s, LP a fechar |
| 04:40 | `second_pass_distant` | `air.ju87.drone_far` a 2–3 km, 25 s, sem sirene; + `distant-shot` que a sim já emite |
| 05:30–05:34 | `high_altitude_raid` | `air.heavy.drone_far` (multi-motor, 1100 m), 4 min, nível −34 dB; nunca sirene |

A posição dos aviões vem de `m01-view.js` (função do `clock`): o emissor de áudio segue o `Group` do avião. Isto é
apresentação a ler apresentação e é permitido; não há decisão de gameplay. Doppler por §1.2; sem HRTF, a elevação é
sugerida pelo passa-baixo mais aberto (céu limpo) e por 20 % de send para REVERB_A.

### 3.7 Comboio, locomotiva e Panzerzug

- Trem 963 (04:45, `s2` `train_arrives`): curva de apresentação de 90 s de `battleClock`: `veh.train.rail_hum`
  (a 1 km, primeiro som: vibração dos carris do próprio tabuleiro, −36 dB, só se o jogador estiver sobre carris ou a
  <15 m), `veh.train.chuff` com rate ligada à velocidade (0,6→1,0→0,4), `veh.train.brake` nos últimos 20 s,
  `veh.train.coupling` ×3–5 na paragem, depois `veh.train.idle_hiss` loop a −30 dB enquanto `train963` for
  verdadeiro e até `east_demolition` (fumo cobre o trem; o loop desce 6 dB e fecha o LP).
- Panzerzug (04:52): `veh.panzerzug.chuff_heavy` + `armour_rumble` (loop de corpo 40–120 Hz, −28 dB a 1 km),
  travagem mais longa (30 s). A MG do trem (`ae_s2_mg_train`) passa a alimentar o gerador far a partir daqui.
- Apito: `veh.train.whistle` apenas em dois momentos deterministas (chegada do 963 a 04:44:30 e arranque de recuo do
  Panzerzug depois de 06:10). Nunca aleatório: o apito é "evento" e o jogador não pode ouvir apitos sem comboio.

### 3.8 Metal stress, demolição da ponte, detritos

Sequência da demolição leste (`cs_m01_east_blast`, distâncias reais calculadas em runtime; o jogador está no
tabuleiro ou no portal):

| t (s) | Som | Banda |
| --- | --- | --- |
| −4,0 | `ui.sapper_whistle` ×3 (apito curto dos sapadores: fonte real = Krawiec a <40 m, é 3D) | near |
| 0,0 | nada (clarão; o som ainda não chegou) | — |
| d/343 (~2,1) | `exp.demolition.far` (corpo 0,9 s + cauda 4 s) + `struct.bridge.stress_metal` **no tabuleiro sob o jogador** (near: o próprio tabuleiro transmite: estalos metálicos 1,5 s, −10 dB) + vibração já existente | far + near |
| +0,8 | `struct.bridge.span_groan` (gemido estrutural 3 s, de leste, mid/far) e `struct.bridge.collapse` (ferro a cair 4 s) | far |
| +4,0 | `struct.bridge.splash` ×2–3 + `struct.bridge.debris` (detritos no rio a 700–800 m), LP 2 kHz | far |
| +6,5 | **silêncio de 2 s**: DUCK leva tudo a −24 dB em 150 ms excepto `amb.wind_*`; regresso em 1,2 s | mix |
| +8,5 / +10 | `voc.marek_zielinski.dlg_m01_045/046` | VOICES |

Demolição oeste (06:45): mesma sequência com `near/mid` (o jogador está a <150 m e dentro do abrigo/posto: a
oclusão §7 fecha o LP a 600 Hz mas o corpo grave passa), seguida de `amb.dust_fall` 60 s e do estado
`west_blown` do sector s1 ("poeira, silêncio, zumbido; ferroviários olham a ponte"): zumbido configurável (opção
de acessibilidade já prevista no prompt), `amb.far.*` desce para o piso, só vento e rio durante 90 s.

Metal stress contínuo: `struct.bridge.creak_wind` loop (3 variantes, 20–30 s, sem repetição perceptível por
alternância hash §8) quando o ouvinte está na zona `truss_*`, −30 dB; `struct.bridge.deck_step` substitui
`foley.step.metal` no tabuleiro (passo com ressonância de chapa).

### 3.9 Fogo e ambiente de fumo

- `fire.wagon`: a partir de `station_wagon_fire` (04:35:30), loop 24 s com crepitar + corpo, posicionado no pátio
  (~300–450 m): far, LP 1,8 kHz, −26 dB; dura até ao fim da missão com decaimento de 3 dB a cada 30 min de
  `battleClock` (dado determinista).
- `amb.smoke_drift` após cada `m01-blast` com `smokeVisible` (já em `renderState.damage`): bed de baixa frequência
  + sopro, 240 s como o fumo visual, mesma posição.
- `amb.dust_fall` nas demolições: 60 s, chiado granular, near.

### 3.10 Soldados: vozes, gritos, passos, pano/equipamento

- **Falas** (`dlg_m01_*`, `co_m01_*`, 70 linhas + callouts): gravações com actores (polaco; legendas em
  português), um ficheiro por linha, `voc.<actor>.<id>`. Limite de **2 vozes simultâneas** (regra do
  `mission.json`); granada/aviso de demolição/`co_m01_enemy_mg_fire_on_squad` têm prioridade sobre ambiente e
  sobre falas de contexto. Enquanto não houver gravações: **legenda sem som** (nunca TTS, nunca síntese de voz).
  O sistema de fila (`dialogueQueue`) já é da simulação; o áudio só toca o que `subtitle` mostra e nada mais.
- **Gritos sem texto** (`voc.walla.*`): reacções (ser atingido, ser suprimido `pinned`, esforço ao transportar
  Bąk), em polaco neutro e sem palavras inteligíveis, para não contradizer legendas. Três bancos: `pl_near`
  (secção, sapadores: ≤40 m), `pl_far` (pelotão leste na retirada, 100–700 m), `de_far` (alemães no dique/tabuleiro,
  ≥250 m; ordens curtas gravadas por actor, nunca extraídas de material de arquivo). Disparadas por dados que já
  existem: `suppressedUntil`, `state` (`HIT_REACTION`, `DOWN`, `WOUNDED`), `pinned` em `round-impact`, `victim`.
- **Passos**: jogador 1P (dois pés alternados, material por `world.surfaceAt` [novo]: `earth`, `ballast` (carris),
  `wood` (dormentes/barracão), `metal` (tabuleiro), `grass`, `stone` (portais/estação), `water_edge`); NPCs 3D a
  <25 m, 4 vozes no máximo, P4.
- **Pano/equipamento**: `foley.cloth.move` a cada passo (−22 dB), `foley.gear.rattle` ao correr (cartucheiras, pá
  dos sapadores), `foley.gear.land` ao agachar/ser atingido; `foley.breath.sprint` depois de 4 s de corrida, fade
  em 3 s ao parar.

### 3.11 Camada distante da batalha (a batalha fora da presença do jogador)

Objectivo: observar um sector distante 90 s e ouvir preparação → acção → resultado, **sem loop perceptível e sem
encher cada segundo** (prova de aceitação do prompt mestre).

Gerador determinista (`FarBattleLayer`), avaliado a 4 Hz em `sim.clock`:

```
estado(sector) = último schedule[].state com at ≤ battleClock         (dados do mission.json)
perfil(estado) = {densidade por minuto real, mistura rifle/mg/ckm/walla/rumble, pausa mínima/máxima}
emissor        = audioEmitters[] do sector ou farAnchors[] do map-layout (posição real → direcção/atenuação)
próximo evento = t_último + pausa(hash(sector, estado, n))            (§8: reproduzível, sem Math.random)
```

| Sector | Estado | Perfil (por minuto real) |
| --- | --- | --- |
| s2 leste | `quiet` | 0 |
| | `train_arrives` | comboio §3.7 |
| | `firefight` (04:46) | 6–9 rajadas MG34 (dique/trem), 10–16 Kar98k soltos, 2–3 rajadas CKM polaca (`ae_s2_ckm_east`, até 06:00), 1–2 `walla.de_far`; pausas de 3–12 s |
| | `panzerzug_support` | +MG do trem, +armour_rumble |
| | `pressure` (05:40) | densidade ×1,4; `walla.pl_far` ×2 |
| | `polish_withdrawal` (06:00) | CKM cala; `walla.pl_far` ×4 (ordens de recuo, de 100–400 m) |
| | `germans_on_spans` | os tiros reais (`enemy-fire`) dominam; gerador ×0,5 |
| | `east_blown` → `german_regroup` | 90 s quase silêncio; depois 2–4 tiros soltos/min, `walla.de_far` feridos |
| | `smoke_and_sporadic_fire` (06:45) | 1–3 tiros/min, LP mais fechado (fumo) |
| s3 estação | `bombed`/`wounded_evacuation` | `fire.wagon`, vidros, `walla.pl_far` civis/feridos ×3/min, carroça (`foley.cart`) em `carts_evacuating` |
| s4 norte | `sporadic_fire` (05:15) | 2–4 tiros/min a 800–1500 m, horizonte N |
| | `contact` (05:50) | 6–10 tiros + 1–2 rajadas/min; `distant-shot` da sim marca o início |
| | `lull` (06:25) | 0–1/min |
| | `kozliny_attack` (07:00) | 8–12/min + `exp.artillery.far` 1–2/min, 20 s, antes da chamada |
| s5 céu | ver §3.6 | — |

Regras de legibilidade: nunca dois emissores do mesmo tipo a <0,4 s; a cada 45–75 s uma **pausa** de 4–9 s em todos
os sectores far (a "respiração" da frente); a densidade é por **segundo real**, por isso o segmento a 27× não
transforma a cabeça de ponte leste numa metralha contínua. Quando a simulação emite um tiro real do mesmo
emissor (`enemy-fire` de `de_east_0`), o gerador salta o próximo evento desse emissor: não há dois sons para uma
MG. Os sons do gerador são apresentação pura: não produzem supressão, dano nem callouts (os callouts continuam a
depender de salvas reais, como hoje).

### 3.12 Silêncio e gama dinâmica

Alvos de nível (pico/dBFS aproximado no bus, antes do LIMITER):

| Categoria | Pico | Nota |
| --- | --- | --- |
| wz.29 1P | −3 | referência de loudness do jogo |
| crack a ≤2 m | −4 | o único som autorizado a competir com a arma |
| explosão near (<40 m) | −2 → limitado | o LIMITER trabalha aqui de propósito |
| vozes (falas) | −12 (média) | DUCK garante −8 dB de margem face a tudo o que não é P0 |
| armas mid | −14 | |
| armas far / gerador | −30 a −22 | |
| beds de ambiente | −36 a −28 | |
| piso (prelúdio 04:30) | −42 | rio + vento + pátio nocturno |

Ducking (no bus DUCK, rampas `setTargetAtTime`, τ de descida 30 ms, subida 400–1200 ms):
- fala P0/P1 a tocar: −8 dB em AMB_*, VEHICLES, FOLEY; −4 dB em WEAPONS_3D;
- tiro do jogador: −6 dB em AMB_FAR por 250 ms (o "mundo abre" depois de cada tiro);
- explosão a <60 m: −18 dB em tudo excepto EXPLOSIONS por 600 ms + "surdez" (LP no MASTER 20 kHz → 900 Hz → 20 kHz
  em 2,5 s + `ui.tinnitus` −20 dB) — desligável nas opções (prompt: "redução de … zumbido");
- `cs_m01_east_blast` t=6,5: silêncio de 2 s (§3.8); `west_blown`: 90 s de piso.

Estrutura de silêncio da missão (o que a mistura **não** faz): 04:30–04:33 só prelúdio; 04:36–04:45 reorganização
sem tiros far (s2 `quiet` até 04:45: a ponte está em silêncio depois do raid, é histórico e é o contraste com
04:46); 06:25 `lull` no norte; 07:00 chamada só com vento, rio e Kozliny ao longe.

Música: MUSIC fica silencioso em M01. O prompt proíbe música heroica sobre resgates/mortes; a chamada das 07:05 é
sem música. Um único "stinger" de cartela (intro/outro) pode entrar mais tarde como asset licenciado próprio.

---

## 4. Limites de concorrência

Pool global de **32 vozes 3D** (preset `medium`/`high`) e **20** (`low`), mais vozes 1P fora do pool. Por bus:

| Bus | Máx. vozes (med/high) | low | Regra de rate |
| --- | --- | --- | --- |
| WEAPONS_1P | 4 (transient+body+mech+tail do wz.29) | 4 | — |
| WEAPONS_3D near/mid | 8 | 5 | por emissor ≥ `interval` real; rajada >120 m = 1 voz |
| WEAPONS_3D far + gerador | 6 | 3 | ≥0,4 s entre emissores do mesmo tipo; 3 novos / 100 ms |
| BALLISTICS | 6 (crack 3, whizz 2, impactos 4 partilhados) | 4 | cracks ≤3 / 100 ms |
| EXPLOSIONS | 4 | 3 | |
| VEHICLES | 4 loops (chuff, hiss, rumble, brake) | 3 | |
| STRUCTURE | 4 | 2 | |
| AMB_NEAR / AMB_FAR | 3 + 3 loops | 2 + 2 | beds, fogo, fumo, poeira |
| VOICES | 2 falas + 3 walla | 2 + 2 | regra do mission.json: 2 vozes |
| FOLEY | 4 (jogador 2, NPC 4 partilhados) | 2 | NPC só a <25 m |
| REVERB | 2 convolvers | 0 (rede de delays) | |

Rajadas: 12 rondas near de uma MG34 cabem em 8 vozes porque cada ronda dura <120 ms e o pool reaproveita por
envelope terminado (`ended`), não por contagem fixa.

---

## 5. Prioridade e voice stealing

Classes:

| P | Conteúdo | Pode ser roubado por |
| --- | --- | --- |
| P0 | arma do jogador, `player-hit`, granada a <20 m, demolições, falas de ordem/aviso (`dlg_m01_044`, `co_m01_*`), sirene do Ju 87 a <600 m | nunca |
| P1 | cracks, whizz, impactos <30 m, rkm de Kowal, MG34/Kar98k mid, explosões mid, callouts | P0 |
| P2 | armas far reais (`enemy-fire` >250 m), walla near, comboio/Panzerzug, fogo, stress metálico | P0, P1 |
| P3 | gerador far, walla far, beds | P0–P2 |
| P4 | foley NPC, passos de aliados, cauda de reverb por voz | tudo |

Algoritmo ao pedir voz com o bus cheio:
1. Descartar candidatos de prioridade superior à do pedido. Se não houver vítima elegível: **descartar o pedido**
   (contar em `dropped`). Nunca interromper P0 por nada.
2. Entre elegíveis: menor prioridade → menor ganho efectivo (ganho × atenuação) → mais antigo.
3. Roubar com fade de 15 ms (`gain.setTargetAtTime(0, now, 0.005)` + `stop(now+0.02)`), nunca `stop()` seco
   (clique).
4. Coalescência antes de roubar: dois pedidos do mesmo `id` e emissor com <30 ms de diferença fundem-se num só;
   rajada far já é uma voz; impactos do mesmo `round-impact` partilham uma voz (material + ricochete em sequência).
5. Pedidos P3 com ganho efectivo < −48 dB nem entram no pool (inaudíveis atrás de qualquer tiro).

`steals`, `dropped` e o pior caso por segundo ficam no diagnóstico (§1.5) e no teste de stress (§10).

---

## 6. Atenuação

Calculada em JS por família, aplicada ao `GainNode` e ao `BiquadFilter` da voz (o panner não atenua, §1.2):

```
g(d)   = min(1, (dref / max(d, dref))^k) · floor(d)         ganho
fc(d)  = fmax · exp(−d / dair)                               passa-baixo (absorção do ar, aproximação)
delay  = d > 60 ? d / 343 : 0                                 segundos de sim.clock
```

| Família | dref (m) | k | dair (m) | fmax (Hz) | piso | near→mid | mid→far | corte |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fuzil (wz29/kar98k) | 4 | 1,0 | 900 | 16 000 | 0 | 40 ±10 | 250 ±60 | 1 800 m |
| MG34 / CKM / rkm | 5 | 0,9 | 900 | 14 000 | 0 | 40 ±10 | 250 ±60 | 2 000 m |
| crack / whizz | — | — | — | 18 000 | — | só near, nível por `pass` | — | 20 m da trajectória |
| impactos | 2 | 1,2 | 600 | 12 000 | 0 | 30 | — | 120 m (fogo do jogador: até 1 200 m só `earth.far` −30 dB) |
| explosões (granada) | 6 | 0,8 | 1 200 | 12 000 | 0 | 40 | 250 | 600 m |
| bombas / demolições | 20 | 0,6 | 1 500 | 10 000 | −40 dB a 1,5 km | 60 | 300 | 5 000 m |
| Ju 87 | 60 | 0,7 | 2 500 | 9 000 | −46 dB | — | — | 6 000 m |
| comboio / Panzerzug | 30 | 0,8 | 1 200 | 8 000 | −40 dB | — | — | 2 500 m |
| fogo / fumo / poeira | 8 | 1,0 | 500 | 6 000 | 0 | — | — | 500 m |
| walla | 3 | 1,1 | 600 | 10 000 | 0 | 30 | 150 | 700 m |
| passos NPC | 1,5 | 1,4 | — | — | 0 | — | — | 25 m |

Crossfade de banda: em `d ∈ [f−w, f+w]` as duas bandas tocam com ganho `cos²/sin²`; fora, só uma. Elevação (aviões)
usa a distância 3D; o passa-baixo dos aviões abre +30 % (céu sem obstáculos).

Para o ouvinte em interior (§7) soma-se a oclusão **depois** desta curva. Não há "atenuação por volume de
opções": o MASTER é o único controlo do utilizador por agora.

---

## 7. Oclusão

Só apresentação; reutiliza a geometria determinista que a simulação já usa, sem a alterar.

1. **Zonas do ouvinte** (`audioZones` [novo] em `map-layout.json`, caixas em metros): `open_embankment`
   (predefinida), `truss_road`, `truss_rail`, `portal_arch`, `casemate_emb_s`, `rail_hut`, `station`, `shelter`.
   Cada zona define: `reverb` (A/B + send), `lowpassOutside` (Hz), `gainOutsideDb`, `stepMaterial`, `bed` extra
   (`wind_truss`, `creak_wind`). Avaliação por frame (teste de caixa, custo nulo); transição com rampa 300 ms.
   - treliças: **semi-abertas** (as trussas não são paredes sólidas, DEVELOPMENT_STATUS): sem oclusão, mas REVERB_B
     metálico, `creak_wind`, passos de chapa;
   - interiores (barracão, casamata, abrigo, estação): `lowpassOutside` 600–900 Hz, −12 dB para fontes exteriores,
     REVERB_B curto; fontes interiores sem oclusão.
2. **Oclusão por linha de vista** para emissores 3D de P0–P2 (não para o gerador far nem beds): `world.lineOfSight
   (ouvinte, fonte)` com a mesma função que a sim usa para actores, a 4 Hz por emissor, máximo 8 emissores por
   avaliação (os mais altos por ganho efectivo). Resultado suavizado (`occl ∈ [0,1]`, τ 250 ms):
   `fc *= lerp(1, 0,15, occl)`, `g *= lerp(1, 0,35, occl)`, `send *= lerp(1, 1,6, occl)`. Oclusão nunca silencia
   (o grave contorna): piso 0,35.
   - Caso já identificado: salva de ajuste de `hold_access` vem do dique atrás das treliças — o som fica ocluído
     (LP) mas audível e direccional; o HUD continua a dar o rumo (não é função do áudio).
3. **Água/relevo**: fontes abaixo do nível do rio (`y < −2`) recebem `fc *= 0,5` (som "de dentro do vale").
4. Sem raycast por frame, sem worker: 8 testes de linha de vista a 4 Hz são ~32/s, ordem de grandeza abaixo do que
   a simulação já faz por tick para os actores.

---

## 8. Aleatoriedade sem perder determinismo

- **Nunca `Math.random` na apresentação** (hoje `ambience()` e `noise()` usam-no). Substituir por
  `src/core/random.js` (`Random`, LCG seedável, já existe) instanciado **pela apresentação**, nunca o `sim.rng`.
- Semente por evento: `seed = hash32(id_do_evento_ou_chave)` onde a chave é:
  - `round-impact`/`enemy-fire`: o `id` da ronda (`m01_round_N`, dado da sim) ou `by + firedAt`;
  - `m01-blast`: `damage.id` (`station_bomb`, `east_demolition`, `m01_grenade_N`);
  - `player-shot`/`reload`: `weapon.shotCount` ou um contador de apresentação reposto em `restored`;
  - gerador far: `(sectorId, estado, índice_do_evento_desde_o_estado)`;
  - loops: `(id, ciclo = floor((sim.clock − t0)/duração))` para escolher a variante do próximo ciclo.
- Com a semente: variante (round-robin ponderado sem repetição imediata entre `variants`), pitch ±4 % (armas),
  ±8 % (impactos, foley), ±2 % (vozes: nunca; vozes não têm pitch aleatório), ganho ±1,5 dB, micro-offset de
  camada 0–12 ms. O mesmo evento depois de restaurar um checkpoint soa igual; o mesmo tiro do jogador em duas
  partidas com a mesma seed da sim soa igual.
- O que **não** é determinista e está documentado como tal: o instante exacto em `ctx.currentTime` (depende do
  frame) e o estado do limiter. Nada disto volta à simulação.
- Teste: dois `AudioDirector` alimentados pela mesma sequência de eventos produzem a mesma lista de
  `{id, variante, rate, gain, at}` (teste Node com contexto falso, §10).

---

## 9. Orçamento de desempenho (metas a medir; não são medições)

### 9.1 Thread de áudio

Quantum de 128 amostras a 48 kHz = 2,67 ms. Meta: **≤40 % do quantum** no Chromebook (medido por
`AudioContext.outputLatency` estável e ausência de glitches em 10 min; não há API directa de carga de CPU de
áudio — usar `chrome://tracing`/`about:tracing` categoria `webaudio` numa sessão manual e registar o resultado em
`docs/verification/m01-runtime/audio/`).

| Item | Quantidade | Nota |
| --- | --- | --- |
| vozes activas (source+gain+biquad+panner equalpower) | ≤32 (med/high), ≤20 (low) | panner equalpower é barato; HRTF proibido no preset Chromebook |
| convolvers | 2 (IR mono ≤3,2 s e ≤0,9 s) | é o item mais caro; no `low` desaparece |
| loops | ≤10 | |
| compressor | 1 | |
| automations por segundo | ≤200 | evitar `setValueAtTime` por frame em listeners/loops; só `value=` e `setTargetAtTime` a 10 Hz |

### 9.2 Thread principal

- Agendamento de áudio por frame **≤0,5 ms** (p95) medido com `performance.now()` à volta de `AudioDirector.update`,
  exposto em `gameDiagnostics().audio.updateMs`.
- Zero alocações recorrentes além do `BufferSource`: nada de `createBuffer` de ruído por chamada (o sintetizador
  de fallback passa a usar 4 buffers de ruído pré-gerados no `init`).
- Linha de vista: ≤8 testes a 4 Hz (§7).

### 9.3 Memória e carregamento

| Patamar | Conteúdo | PCM decodificado | Ogg no disco |
| --- | --- | --- | --- |
| T0 (antes de "Iniciar") | wz.29 completo (4 camadas × 4 variantes + mecânica), cracks/whizz, impactos near, foley do jogador, beds do prelúdio, UI | ≤12 MB (≈60 s mono) | ≤1,6 MB |
| T1 (durante `cs_m01_intro`) | Ju 87 (drone/sirene/pullout/bomba), bombas 50 kg, fogo, walla near, falas 001–020 | ≤14 MB | ≤2 MB |
| T2 (depois de `bombing_0434`, antes de 04:45) | MG34/Kar98k/CKM/rkm todas as bandas, rajadas far, gerador, comboio, Panzerzug, falas 021–043 | ≤16 MB | ≤2,4 MB |
| T3 (depois de `order_demolish`) | demolições, metal stress, detritos, poeira, falas 044–070, Kozliny | ≤10 MB | ≤1,4 MB |
| **Total** | | **≤52 MB PCM** (≈270 s de material mono) | **≤7,5 MB** |

Regras: nada é carregado de fora de `/COD-guerra/assets/audio/`; falha de rede num patamar não bloqueia o jogo
(fallback procedural + entrada em `missing`); `AudioBuffer`s partilhados entre missões só são libertados no
`dispose()`.

### 9.4 Presets

| Preset | Pool | Reverb | Gerador far | HRTF | Oclusão LoS |
| --- | --- | --- | --- | --- | --- |
| low | 20 | rede de delays | densidade ×0,6 | não | 4 emissores a 2 Hz |
| medium | 32 | 2 convolvers | ×1 | não | 8 a 4 Hz |
| high | 32 | 2 convolvers | ×1 | opcional (8 vozes P0/P1) | 8 a 4 Hz |

---

## 10. TASK CONTRACT (pronto para implementação)

Branch própria a partir de `main`; PR para `main`. Não tocar em combate, relógios, saves, mapa histórico, build ou
workflows além do listado. Trabalho concorrente: engine/combate/build são do Codex; o áudio vive em
`src/core/audio/` e no bridge de `game.js`, e as alterações à simulação são **apenas campos de dados** (T0).
Cada tarefa termina com testes, `npm test`, `npm run build`, `npm run test:browser`, e actualização de
`DEVELOPMENT_STATUS.md`, `ASSET_CREDITS.md` e `assets-needed.md`.

### T0 — Dados da simulação (pequeno, primeiro, PR próprio)

Ficheiros: `src/game/m01-simulation.js`, `missions/m01-tczew/mission.json`, `missions/m01-tczew/map-layout.json`,
`missions/m01-tczew/ENGINE_CONTRACT.md`, `tests/m01-tczew-data.test.js`, `tests/m01-runtime.test.js`.

- `npc-shot` ganha `weapon:'rkm_wz28'`; `m01-blast` ganha `kind ∈ {grenade,bomb,demolition,raid}`;
  `round-impact` ganha `pass` (distância mínima da trajectória ao ouvido, já calculada por `closestApproach`).
- `mission.json`: `sectors[0].audioEmitters` com a CKM da casamata (`ae_s1_ckm_casemate`, `cv_casemate_emb_s`,
  `activeFrom:'04:46:00'`, `activeUntil:'06:10:00'`, `classification:'GAMEPLAY_DRAMATIZATION'`);
  `sectors[1].audioEmitters` passam a ter `activeFrom`. Validador do teste de dados aceita e exige os campos.
- `map-layout.json`: `audioZones[]` (§7) e `surfaces[]` (polígonos/caixas com `stepMaterial`), classificação
  `RECONSTRUCTED`.
- Aceitação: snapshots antigos continuam válidos (schema 2 inalterado: nenhum campo novo no save); `npm test`
  verde; `ENGINE_CONTRACT.md` lista os três campos e a regra "o áudio nunca consome `sim.rng`".

### T1 — Núcleo Web Audio (`src/core/audio/`)

Ficheiros novos: `context.js` (contexto, buses, limiter, duck, reverb sintética), `voice-pool.js` (pool, steal,
coalescência), `attenuation.js` (curvas §6, funções puras), `scheduler.js` (fila em `sim.clock`, loops por fase),
`manifest.js` (carregamento por patamar, fallback), `presentation-random.js` (hash + `Random`), `synth-fallback.js`
(o sintetizador actual, com buffers de ruído pré-gerados e sem `Math.random`). `src/core/audio.js` mantém a
API pública usada por `game.js` e pela bancada francesa (`shot`, `reload`, `impact`, `explosion`, `ambience`,
`hit`, `wz29Shot`, `wz29Mechanism`, `distantFire`, `crack`) como fachada sobre o novo núcleo: **a bancada antiga
não muda de som nem de comportamento**.

Interface mínima:

```js
audio.play(id, {position?, priority, bus, seedKey, gainDb?, rateMul?, at?})  // at em sim.clock
audio.loop(id, {position?, bus, t0, gainDb})  → handle {setPosition, setGain, setRate, stop(fadeMs)}
audio.listener(position, forward, up, zoneId)
audio.duck(bus, db, holdS, releaseS)
audio.update(simClock, dtReal)   // drena fila, aplica oclusão, actualiza loops e diagnósticos
audio.diagnostics
```

Testes Node (`tests/audio-core.test.js`) com um `FakeAudioContext` (regista nós e automations; sem som):
- atenuação: tabela de §6 em 0/10/40/250/1 000 m por família, piso e crossfade;
- steal: pool cheio com P0 não é roubado; P3 a −50 dB não entra; fade de 15 ms;
- determinismo: duas instâncias, mesma sequência de eventos → mesma lista `{id,variante,rate,gain,at}`;
- loops por fase: avançar `simClock` 37 s, restaurar, `offset` igual;
- fallback: manifesto com ficheiro em falta → sintetizador, `missing` preenchido, sem excepção.

### T2 — Bridge M01 (`src/game/audio-director-m01.js` + `game.js`)

- `AudioDirectorM01` recebe eventos de `handleM01Event` e o estado por frame (§2.3); `game.js` só delega
  (as chamadas directas a `this.audio.*` em `handleM01Event` passam para o director; a bancada mantém o caminho
  actual).
- Implementa §2.2, §3.2, §3.4, §3.5 e `rebuildSounds` (pendentes a partir de `sectors.damage` **e** de
  `enemyFire.rounds` em voo, que já estão no save).
- Teste Node (`tests/m01-audio-director.test.js`): alimenta o director com o `report.json` de
  `tools/verify-m01-cover.mjs` (eventos reais de uma rota) e verifica: todo `enemy-fire` produz um pedido com
  atraso `d/343 ± 1 ms`; `crack` só quando `crack:true`; nenhum pedido excede os limites de §4; contagem de
  `dropped` < 2 % dos pedidos na retirada (06:05–06:10) com 32 vozes.

### T3 — Camada distante e fontes contínuas

- `FarBattleLayer` (§3.11) com perfis por estado em `missions/m01-tczew/audio-profiles.json` (dados, com
  `classification` por entrada); comboios (§3.7), aviões (§3.6, emissor segue o `Group` do renderer), fogo/fumo
  (§3.9), foley do jogador e NPC (§3.10), zonas e oclusão (§7).
- Teste Node: 90 s de `battleClock` em `firefight` → entre 6 e 9 rajadas MG, nenhuma dupla <0,4 s, pelo menos uma
  pausa ≥4 s, sequência idêntica em duas execuções; o segmento a 27× não altera a densidade por segundo real.
- Teste de navegador (`tests/browser/m01.spec.js`, novo caso): com `?debug=1`, após `bombing_0434` e após
  `train963_arrives`, `gameDiagnostics().audio` tem `contextState==='running'` (depois do gesto),
  `voices.active ≤ 32`, `steals` e `dropped` registados, zero erros de consola; captura do diagnóstico em
  `docs/verification/m01-runtime/audio/`. O SwiftShader não valida o som: o teste verifica estado e limites.

### T4 — Assets

- Gravação/síntese própria ou CC0/CC-BY com atribuição por ficheiro (`ASSET_CREDITS.md`: ficheiro, autor,
  licença, origem, processamento). Proibido: material de COD ou de qualquer jogo; bibliotecas com cláusula NC em
  repositório público sem autorização escrita; gravações de arquivo com vozes reais de 1939.
- Entrega por patamar (§9.3), 48 kHz, loudness por §3.12, nomes = IDs de §2.1, variantes `_v1.._vN`.
- Ordem de produção (uma arma excelente primeiro, como pede o prompt): (1) wz.29 completo + mecânica + cracks +
  impactos earth/stone/metal; (2) MG34 e CKM wz.30 nas três bandas com cadências exactas; (3) Ju 87 + bombas;
  (4) demolições + metal; (5) comboios; (6) beds, foley, walla; (7) falas gravadas.
- Até existirem ficheiros, o fallback procedural toca e `missing` lista o que falta: o jogo nunca fica mudo nem
  bloqueado.

### T5 — Mistura, opções e evidência

- Sliders MASTER (existente) + VOICES/AMBIENCE/EFFECTS no menu; opção "reduzir zumbido/surdez"; tudo persistido
  em `localStorage` fora do save.
- Sessão manual no Chromebook (não substituível por CI): 10 min de `cs_m01_bombing` → `firefight` sem glitches,
  `outputLatency` estável, trace `webaudio`; registar em `docs/verification/m01-runtime/audio/README.md` com o
  aparelho, a versão do Chromium e o preset. Sem esta sessão, o estado fica "implementado, não medido".
- `DEVELOPMENT_STATUS.md`: o marco 3 continua pendente até haver falas gravadas e medição real.

### Fora de âmbito (explícito)

`AudioWorklet`, HRTF por defeito, música, síntese de voz, balística sonora "real" além de `d/343`, e qualquer
alteração de dano/supressão/visibilidade por causa do som.
