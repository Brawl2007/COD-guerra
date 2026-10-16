# M01 — INTEGRATION MATRIX · Cada proposta ligada a um sistema real

**Estado:** MAPEAMENTO (proposta). Base de referência para "sistema real": consolidação V5 `codex/m01-ready-deliveries-consolidation-v5` @ `d277b06` (PR #52, draft, não integrada em `main`); `main` @ `72bbcdd` para os ficheiros de missão (idênticos nos dois: `mission.json`, `SCRIPT.md`, `STORY_BIBLE.md` não diferem entre `main` e V5). Estados: **IMPLEMENTADO** (em `main`), **EM INTEGRAÇÃO** (na V5, draft, aguarda CI/aprovação), **READY** (branch própria `READY_FOR_CAPTAIN_REVIEW`, fora da V5), **EM PROGRESSO/PROPOSTO** (arquitetura ou WIP). Classes das propostas: **[A]** pronto para integração (dados/apresentação/falas ligadas a eventos existentes), **[B]** pequena expansão (condição nova, campo opcional, prop/animação curta), **[C]** expansão ambiciosa (assets/animações/comportamentos novos), **[D]** alteração estrutural (contratos; exige aprovação explícita).

## 0. Inventário dos sistemas reais (o que podemos aproveitar)

| Sistema | Ficheiro(s) | Estado | Relevante para |
| --- | --- | --- | --- |
| Simulação de M01 (eventos, objetivos, gates, relógio, fogo alemão, supressão, baixas por tiro, evacuações, ckm crew, chamada) | `src/game/m01-simulation.js`, `m01-fire.js`, `wz29.js`, `tczew-world.js` | IMPLEMENTADO (main) + EM INTEGRAÇÃO (ckm crew, stationDrag, MG34 prone, contrato de animação V1) | todas as falas, set pieces |
| Dados da missão | `missions/m01-tczew/mission.json`, `map-layout.json` | IMPLEMENTADO | falas novas (IDs), cutscene beats, cast names |
| Apresentação (view, atores, FX, decals, atmosfera, ambiente, vegetação, pontes, estação, comboios, aviões, viewmodel) | `src/render/m01-*.js` | main: view/atmosfera/ambiente/surfaces/pose; V5: + characters, viewmodel, battlefield-fx-profile, damage-decals, environment-props, vegetation, bridge-structure, station-architecture, train-wagons, train-consist-detail, locomotive, panzerzug, aircraft, soldier-variation, combat-feedback, wz29-presentation, first-person-weapon-fx | arte, ambiente, set pieces |
| Áudio | `src/core/audio.js`, `src/core/battlefield-audio.js` (V5) | EM INTEGRAÇÃO | direção sonora |
| HUD cinematográfico | `src/ui/m01-hud.js` (V5) | EM INTEGRAÇÃO | cartelas, legendas, avisos |
| Contrato de animação V1 (motion/gait/bodyYaw/hitAt/suppressedAt/diedAt) | `src/game/m01-animation-presentation.js`, `docs/architecture/M01_ANIMATION_PRESENTATION_CONTRACT.md` (V5) | EM INTEGRAÇÃO | reações, passos, olhar |
| Motion clips V1 (sprint, crouch_walk, turn_l/r, hit_front, near_miss_duck) | `assets/.../motion-clips-v1/` (V5) | EM INTEGRAÇÃO (assets; **sem Animation Resolver**) | gestos; **não** usáveis em runtime ainda |
| Clips base (25) + estação (drag) + transições + MG34 + MG34 prone + ckm | `assets/models/provisional/m01/characters/*`, `weapons/*` (V5) | EM INTEGRAÇÃO (ligados por `m01-characters.js`) | atuação |
| Station V3 (fidelidade) | `codex/m01-station-visual-fidelity-v3` (PR #54) | READY (fora da V5) | arte da estação |
| Animation Resolver, locomotion arquitetura | `codex/m01-soldier-locomotion-animation` (`SOLDIER_ANIMATION_SYSTEM.md`) | PROPOSTO | tudo o que é gesto/olhar |
| World Interaction System (pickup, mounted, seats) | `codex/m01-world-interactions` | PROPOSTO | **não usado por M01** (decisão) |
| Combat AI architecture | `codex/m01-combat-ai-architecture` | PROPOSTO | fora de âmbito |
| Narrativa de campanha M02–M30 | PR #44 (`docs/campaign/*`) | PROPOSTO (draft) | visão de campanha |

## 1. Matriz de propostas

Colunas: **ID** · **Proposta** · **Doc** · **Classe** · **Sistema/ficheiro real** · **Mecanismo** · **Estado persistente** · **Dependência** · **Teste a acrescentar**.

### 1.1 Falas e callouts

| ID | Proposta | Doc | Cl. | Sistema | Mecanismo | Persistência | Dep. | Teste |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| N-01 | Falas `dlg_m01_100+` (≈55) no `mission.json → dialogue` | 7 | A | `mission.json` | dados; `speaker` ∈ cast | — | — | `m01-tczew-data.test.js` já valida speakers/IDs |
| N-02 | Ligar falas a eventos existentes (`consume` switch: 110, 112–117, 119, 124, 125, 133, 142, 162, 164, 190–194) | 7 | A | `m01-simulation.js` `consume()` / `updateScene` beats | `this.line(id)` com token | `dialogueConsumed` (já) | N-01 | regressão: fala toca uma vez por evento, não repete no restore |
| N-03 | Falas em contadores existentes (120/121/202 em `repairPins`; 122/200 em `progress≥50`; 131 em `kowalRounds`; 132 em `suppressedUntil` da MG; 143/145/150 em `rescue_bak`) | 7 | A | `updateObjectives`, `updateCombat` | `line()` | — | N-01 | mesmo |
| N-04 | 111 e `m01.fired_on_fallen` (reação ao tiro sobre caídos) | 1, 7 | A (fala) / B (flag) | `fire()`: aproximação do traçado < 3 m a um `de_spans_*` em `DOWN`/`RETREAT` (helper de aproximação já usado na supressão) **ou** `hit?.actor` nesse estado, + `consumedEvent(east_demolition)` | `line('dlg_m01_111')`; flag opcional no schema 2 | flag opcional (saves antigos válidos) | N-01 | A/B de rota: snapshot igual com e sem a fala; flag só muda se o tiro acertar |
| N-05 | Variantes 015a–d e 114a–d (rotação por nó) | 7 | A | `tick()` guia (`timers.guide`) e rotação (`m01.suggested_cover`) | token por `floor(clock/14)`; mapa nó→ID | — | N-01 | o HUD só mostra mensagem se 14 s sem fala |
| N-06 | Proximidade (170, 171, 172, 180, 181, 193) | 7 | A | padrão `dist(a,this.player)<N` já usado (008, 040) | `line()` | — | N-01 | — |
| N-07 | Callouts `co_m01_*` novos (ally_hit, cover_rotation, bullet_crack, player_reloading_near_ally) | 7 | A | `callouts.lines` + handlers de `round-impact.crack`, `hitAt`, `reload` | `line()` com cooldown | — | contrato V1 (`hitAt`) para ally_hit | validador aceita IDs `co_m01_*` (já) |
| N-08 | `co_m01_sun_glare` (olhar a leste ±25°, 05:30–06:40) | 7 | B | `tick()`: `player.angle` vs azimute do Sol (`layout.sun`) | `line()` CD 90 s | — | — | determinismo: depende só de `angle`/`battleClock` |
| N-09 | `co_m01_platoon_count` (um número por homem que cruza x = −20) | 7 | B | `updateActors`: deteção de cruzamento por ID | fala por token `id` | — | — | contagem final = `east_platoon_survivors` |
| N-10 | Prioridade/interrupção de legendas | 7 | B | `line()` → `{priority}`; `tick()` escolhe a de maior prioridade; `ambient` interrompida por `critical` | `dialogueQueue` (já no save; campo opcional) | — | saves antigos (sem `priority`) válidos |
| N-11 | Nomes para `east_platoon_voice`, `sapper_2/3`, `grp_ckm_crew` (cast) | 6 | B | `mission.json → cast[].name`; ckm crew: acrescentar 3 entradas de cast **só para o nome da legenda** (os atores já existem na simulação com IDs `ckm_*`) | — | — | validador: `cast` ids únicos; `line()` resolve `speaker` por cast |
| N-12 | VO em polaco (gravação) | 7 | C | `AudioManager` fontes nos atores (`spatial()`) | — | — | N-01, licenças | — |

### 1.2 Cenas e beats

| ID | Proposta | Doc | Cl. | Sistema | Mecanismo | Persistência | Dep. | Teste |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S-01 | Beats novos em `cs_m01_intro` (140 t 16), `cs_m01_order` (112 t 0,5), `cs_m01_east_blast` (124 t −7, 162 t −3, 105 t +2,3), `cs_m01_west_blast` (125 t 13), `cs_m01_roll_call` (151 t 16,5 com `lineVariants`) | 2 | A | `mission.json → cutscenes[].timeline` | `updateScene` consome beats por índice | `scene.beats` (já) | N-01 | HUD test: cartelas inalteradas; skip não repete |
| S-02 | Cartela 3 de abertura (ou 3 linhas na cartela 2) | 2, 10 | B | `src/ui/m01-hud.js` `INTRO_CARDS` | dados do HUD | — | — | `m01-hud-presentation.test.js` (t das cartelas) |
| S-03 | Troca rogatywka→capacete em primeira pessoa (1,2 s) | 2, 4 | B | `m01-viewmodel.js` lê `player.headgear` (já muda em `bombing_0434`) | animação procedural das mãos | — | ViewModel V5 | A/B: snapshot igual |
| S-04 | Direção de atores: targets nulos 2–3 s (planes_heard, raid 05:30), gesto do relógio, caderno, lápis, caneca a rodar, cantil, levantar a cabeça ao responder | 2, 10 | B | `m01-characters.js` (apresentação) + pequenos props anexados a `hand_l/r` | sem escrita no save | — | Animation Resolver para olhar [C] | A/B: snapshot igual |
| S-05 | Nowicki `seated` com capacete no colo no posto | 2 | B | `pose: seated` já existe; prop capacete | — | — | — | — |
| S-06 | Zieliński baixa a cabeça de Jan (≤ 3 m): offset 0,02 m, 0,6 s | 10 | A | `m01-combat-feedback.js` (caps) | evento de apresentação ao beat t −1 de `cs_m01_west_blast` | — | — | dentro dos caps V1 |
| S-07 | Plano exterior final 6 s | 2, 10 | C | não existe câmara externa | `CutsceneDirector` mínimo (uma câmara fixa, sem input) | — | decisão do Capitão | — |
| S-08 | Alternativa: saída a pé do abrigo antes do debrief | 2 | A | `stageRollCall` reposiciona; `endScene` → `debrief` | atrasar `consume(debrief)` até o jogador cruzar a boca do abrigo **ou** 20 s | — | — | rota automática continua a chegar ao debrief |

### 1.3 Gameplay (dentro da estrutura)

| ID | Proposta | Doc | Cl. | Sistema | Mecanismo | Persistência | Dep. | Teste |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| G-01 | MG dos portões com bias progressivo ("sobe a encosta") | 3, 4 | B | `burst()` em `updateCombat` (kind `repair`) | bias de alvo em função de rajadas consecutivas sem supressão; reset ao suprimir | opcional: contador por arma no schema 2 (ou derivado) | — | **12 sementes**: reparo ajuda 180–207 / ignora 206–251 preservados (±5 %) |
| G-02 | Gesto de Rusek (aim 4 s a leste depois das 06:10) | 1, 4 | B | `east_platoon_voice`/`pl_east_*`: `facing` + `aiming` de apresentação | estado de ator (`state:'GUARD'`, `aiming`) | — | — | A/B: nenhum tiro emitido |
| G-03 | Pares com feridos no pelotão leste (2 de 18) | 3 | C | `carriedBy` (existe para Bąk) aplicado a 2 pares `pl_east_*`; velocidade 3 m/s; o par é "o último homem" | `carriedBy` (já no schema) | clips `carry_wounded`/`carried` | tolerância de 90 s do gate leste: os pares chegam? medir | sementes: sobreviventes 12–18 mantidos |
| G-04 | Transporte visível da ckm pela guarnição | 3, 4 | C | fases `abandon`/`retreat` (já) + clips de transporte (novos) + sockets | — | kit ckm | — |
| G-05 | Casamata visitável (interior) | 3 | C | `TczewWorld` (colliders), `m01-view` (geometria), luz | — | — | rota automática não entra |
| G-06 | Carroças de feridos (S3, 05:40) | 3, 5 | C | prop animado + 2 extras; agenda S3 `carts_evacuating` (já) | — | — | — |
| G-07 | Pelotão leste em lances a 1 km antes das 06:00 | 3, 5 | C | agenda de micro-movimento em `pressure` para proxies `pl_east_*` (hoje inativos até 06:00: exige ativação de apresentação sem ativar combate) | opcional | — | A/B: baixas iguais |
| G-08 | Ferido ligeiro a trabalhar (Lenc) | 3 | C | novo estado de ator | schema | — | — |
| G-09 | Kowal suprime alemães do tabuleiro durante o transporte de Bąk | 3 | **D** | muda regra "Kowal nunca suprime os alemães do tabuleiro" (`ENGINE_CONTRACT.md`) | — | **aprovação** | sementes |
| G-10 | ckm jogável / armas apanhadas / veículos | 3 | **D** | `WORLD_INTERACTION_SYSTEM.md` (proposto) | — | **não recomendado para M01** | — |

### 1.4 Ambiente e arte

| ID | Proposta | Doc | Cl. | Sistema | Mecanismo | Persistência | Dep. | Teste |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E-01 | Props de "antes da guerra" (lona/bobinas, giz, cantil, marmita, carrinho, sinal, isolador partido, lanterna caída, capacete/bota do ferido, caixa de fita, água entornada) | 5 | A/B | `m01-environment-props.js` (clusters, keep-outs, sem colliders) | descritores por área/qualidade | — | — | `m01-environment-props` tests (keep-outs, determinismo) |
| E-02 | Quadro de horários com giz; janelas emissivas por hora | 5 | B | Station V2/V3 (`m01-station-architecture.js`) | decal/malha pequena; emissivo por `battleClock` | — | Station V2 aprovada | A/B |
| E-03 | Decals novos (rastro do ferido, sangue na madeira configurável, terra de joelhos, saco desfeito) | 5 | A/B | `m01-damage-decals.js` (atlas V1 / células novas) | eventos reais (`stationDrag`, `bak_wounded`, `repair_complete`) | reconstruído do estado (sem save) | — | determinismo A/B |
| E-04 | Fumo das 04:40 a oeste (3 pontos) | 4, 5 | A | `consume(second_air_pass)`: `impact()` sem dano?? **Cuidado:** `impact()` grava em `sectors.damage` (fumo persistente) e emite `m01-blast` (som/feedback). Usar `impact` com `aerial=true` garante ≥ 30 m; não há dano a atores por `impact` (só a lista). | `sectors.damage` (já) | — | rota: nenhum ator afetado; save mantém |
| E-05 | Fumo a norte a partir de 07:02 | 5 | B | registo de dano "visual" a −Z 1,3 km | `sectors.damage` | — | — |
| E-06 | Tabela de luz por hora (zénite/horizonte/névoa/Sol/skylight/exposição) | 8 | A | `m01-view.js lighting()`, `m01-atmosphere.js` shader | keyframes de cor | — | — | capturas A/B 7 horas × 3 qualidades |
| E-07 | Névoa baixa do rio (04:30→05:00) | 8 | B | `m01-atmosphere.js` (puffs/plano) | por `battleClock` | — | — | nunca acima de y −7 |
| E-08 | Haze de céu por fumo acumulado | 8 | B | uniform no shader do céu | contagem de `damage.smokeVisible` | — | — | — |
| E-09 | Glare solar ±25° | 8 | B | sprite aditivo em `m01-view` | ângulo câmara↔Sol | — | opção de flashes | não cega totalmente: a MG dos portões continua visível |
| E-10 | Afinação de materiais (terreno −15 % verde, copas −12 %, água por hora, creosote) | 8 | A | `m01-surfaces.js`, `m01-vegetation-art.js`, `m01-environment.js` | constantes | — | Env. Pass / Vegetation V1 | A/B |
| E-11 | Sombras longas (frustum do Sol, viés) | 8 | A/B | `m01-view` (sun shadow) | — | — | — | contadores |
| E-12 | Poeira no abrigo (07:05) | 8 | A | `m01-atmosphere` puffs finos | por cena | — | — | — |

### 1.5 Áudio

| ID | Proposta | Doc | Cl. | Sistema | Mecanismo | Dep. | Teste |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-01 | Água do rio (loop linear) | 9 | B | `audio.js` `_startLoop` + fonte linear | `updateM01Presentation` | — | WAV offline; equivalência de rota |
| A-02 | Apito de manobra 04:30–04:33 | 9 | B | plano de camadas novo | cala-se em `planes_heard` | — | idem |
| A-03 | Passos do jogador por material | 9 | B | `world` material + `moveBlend` | `game.js` passa dados | — | idem |
| A-04 | Respiração de Bąk carregado | 9 | B | loop condicionado a `carrying` | — | — | idem |
| A-05 | Acústica interior (abrigo) | 9 | B | segunda reverberação curta + filtro | posição do jogador (`shelter`) | — | idem |
| A-06 | Vibração da ponte por impacto de MG (metal stress) | 9 | A | `planMetalStress` em `round-impact` material `metal` quando jogador em x > 0 | — | — | idem |
| A-07 | Haze sonoro (cama +0,02/dano) | 9 | A | `BattleIntensity`/`PHASE_ACTIVITY` | — | — | idem |
| A-08 | Ducking das 6 janelas | 9 | A | `duck()` | beats | — | — |
| A-09 | Motivo musical | 9 | C | síntese ou gravação | cartelas/debrief | licença | — |
| A-10 | Passos de NPC em massa | 9 | C | `motion.odometer` (contrato V1) | — | resolver | — |

## 2. Estados persistentes (resumo)

| Campo | Novo? | Classe | Obrigatório? |
| --- | --- | --- | --- |
| `m01.fired_on_fallen` | sim | B | não (opcional, saves antigos válidos) |
| `dialogueQueue[].priority` | sim | B | não |
| contador de bias da MG | derivado ou opcional | B | não |
| nomes de cast | dados | B | — |
| Tudo o resto | **nenhum campo novo** | A | — |

Regra: nenhuma proposta [A] escreve no save; nenhuma proposta altera `schemaVersion`; o validador atómico continua a rejeitar campos ilegais (campos novos devem ser aceites como opcionais).

## 3. O que cada agente precisa de ler antes de implementar

| Agente | Lê | Não toca |
| --- | --- | --- |
| Simulação/falas (N-02…N-10, G-01, G-02, E-04, S-08) | docs 2, 7; `ENGINE_CONTRACT.md`; `m01-simulation.js` | relógios, gates, regras de baixas, segurança de 30 m, `Kowal nunca suprime os alemães do tabuleiro` |
| Dados (N-01, N-11, S-01) | docs 6, 7; `mission.json`; `tests/m01-tczew-data.test.js` | IDs existentes; as três falas obrigatórias |
| Apresentação (S-03…S-06, E-01…E-12) | docs 5, 8, 10; handoffs de Station/Vegetation/Env. Pass/Decals/FX | colliders, `m01-decoration-layout.js` (árvores sólidas), simulação |
| Áudio (A-01…A-10) | doc 9; REPORT V1; `battlefield-audio.js` | RNG; autoridade de eventos |
| Animação (S-04, G-03, G-04) | docs 6, 10; contrato V1; `SOLDIER_ANIMATION_SYSTEM.md` | hitboxes, facing, root |
| HUD (S-02) | doc 2; HUD V1 README | contratos de texto do HUD |

## 4. Conflitos conhecidos com trabalho em curso (evitar)

- **Animation Resolver** (próxima tarefa anunciada): S-04 (olhar/gestos) deve esperar por ele; não criar um segundo caminho de animação.
- **Station V3** (PR #54, READY): E-02 deve ser aplicado sobre a V3 quando aprovada, não sobre a V2.
- **FX browser timeouts** (PR #53, diagnóstico em curso): E-04/E-05 acrescentam registos de dano; validar que não agravam o número de efeitos transitórios capturados pelos testes de FX.
- **CI shards** (Issue #55): qualquer teste novo deve ser curto (Node) e entrar nos shards existentes.
