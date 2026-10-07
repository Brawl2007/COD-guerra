# M01 — Direcção da experiência de campo de batalha

Estado: **PROPOSTA DE ARQUITECTURA.** Este documento não altera a engine, o combate, os saves nem o build. Descreve como fazer a guerra de Tczew acontecer perto, a média distância, no horizonte, fora do campo de visão e antes/depois de Jan chegar, sem que nenhum efeito visual ou sonoro passe a decidir gameplay. Termina em tarefas (`BX-*`) ordenadas por impacto, com dono sugerido, ficheiros, verificação e risco.

Base lida: `AGENTS.md`, `DEVELOPMENT_STATUS.md`, `RUNBOOK.md`, `IMPLEMENTATION_PLAN.md`, `docs/PROMPT_MESTRE.txt` (§19–21, §26–30, §39, §42–44, §55–57, §71, §75, §80), `ENGINE_CONTRACT.md`, `SCRIPT.md`, `MAP.md`, `HISTORICAL_RESEARCH.md`, `SOURCE_CHECK.md`, `mission.json`, `map-layout.json`, `src/game/m01-simulation.js`, `src/game/m01-fire.js`, `src/game/game.js`, `src/render/m01-view.js`, `src/render/m01-atmosphere.js`, `src/core/audio.js`, e as evidências em `docs/verification/m01-runtime/`.

---

## 0. Diagnóstico: onde a guerra já existe e onde ela só acontece à frente do jogador

A simulação já é, em dados, "a guerra ao redor": cinco agendas de sectores (`definition.sectors`), 26 eventos com ID consumidos uma vez (`consume()`), fogo alemão como registos em voo (`enemyFire.rounds`), baixas por ID, relógio de batalha com gates, e um teste de 90 s que prova que olhar para trás não muda nada (`tests/m01-runtime.test.js`). O problema não é autoridade: é que quase tudo o que está longe ou fora de cena **não é apresentado**, e o pouco que é apresentado **repete-se**.

| Camada | O que existe hoje | Limite observado (ficheiro) |
| --- | --- | --- |
| S2 cabeça de ponte leste (780–1250 m) | 40 `de_east` activos às 04:45; 14 na faixa dos portões disparam sobre a margem oeste com clarão, fumo, traçante e estampido atrasado; 26 no dique disparam `kind:'east'` para pontos vazios | O pelotão leste (`pl_east_0..23`) está **inactivo até às 06:00**: os alemães disparam para o vazio durante 75 min de relógio. Não há fogo polaco de resposta, nem baixas visíveis, nem silhuetas: um homem de 1,7 m a 1 km mede **≈0,9 px** (FOV 70°, 720 px); só clarões e traçantes se vêem (`m01-simulation.js` `eastFire`, `m01-view.js` `updateActors`) |
| S5 céu (Stukas, raid 05:30) | Três caixas e um avião grande, visíveis por flags | Posições em **seno com `time%90`** e **`time%150`**: laço óbvio, sem relação com `map-layout.stukaPath`, sem sirene, sem mergulho, sem aproximação pelo sul (`m01-view.js` `render`) |
| S4 perímetro norte (0,8–1,5 km) | Dois eventos (05:50, 07:00) emitem **um** `distant-shot` cada | Um combate de companhia reduz-se a um tiro de wz.29 sintetizado; nada no horizonte, nenhum rumor contínuo, nenhuma frase (`m01-simulation.js` `consume`, `game.js` `handleM01Event`) |
| Raid 05:30 (Do 17) | Um `impact('raid_0530')` em (−600, 0, 100) | Quatro minutos de bombardeamento de altitude = uma explosão e uma coluna de fumo de 240 s; sem zumbido, sem névoa de fumo sobre a cidade |
| S3 pátio da estação (250–460 m) | Fumo persistente da estação; flag `station_wagon_fire` | Ferido arrastado (04:35:30), posto de socorro (04:50), carroças (05:40), ferroviários com lanternas (04:30): **nada em cena**; só a fala 017 à distância |
| Comboios | Trem 963 e Panzerzug 7 como caixas estáticas que **aparecem** à hora | Sem chegada, sem fumo de locomotiva, sem travões, sem luz; a "fumaça de locomotivas" do estado `train_smoke_east` não existe |
| Casamata oeste (ckm wz.30) | Nó de cobertura reservado (`cv_casemate_emb_s`), interior em `map-layout` | Nenhum actor, nenhum fogo, nenhuma saída às 06:45 (`grp_ckm_crew` só no JSON) |
| Áudio | One-shots sintetizados com atraso de 343 m/s, estalo supersónico, estrondo com vibração | **Não há cama sonora** (vento, rio sob o ferro, aves, zumbido de motores), não há buses nem ducking, não há filtro de interior; o silêncio de 2 s depois da explosão leste está no roteiro mas não na mistura (`audio.js`, `game.js`) |
| Ritmo | Cadências por atirador: MG 6–13 s, fuzil 9–18 s, 26 atiradores do dique em paralelo | Crepitar **contínuo e uniforme** a 1 km, sem frases nem pausas; nenhum silêncio desenhado fora das cutscenes |
| Destruição ambiental | Partes das pontes por evento, poeira das demolições, cratera como cobertura, posto avançado rebaixado | Vagão em chamas, vidros, chuva de terra após 06:45, poeira em suspensão: ausentes |

Conclusão do diagnóstico: o trabalho é sobretudo de **apresentação e de camada ambiente**, com um conjunto pequeno e bem delimitado de **acrescentos autoritativos** (actores e agendas que precisam de persistir).

---

## 1. Arquitectura: três camadas, uma única autoridade

```
                 ┌────────────────────────────────────────────────────────┐
                 │  M01Simulation  (dados; autoridade única)              │
                 │  battleClock · clock · sectors · actors · rounds       │
                 │  consumed[id]=clock · sectors.damage · destruction     │
                 │  timers.*schedules (novo)                              │
                 └──────────┬─────────────────────────────┬───────────────┘
      drainEvents()         │  one-shots                  │  leitura
   (AUTHORITATIVE EVENTS)   ▼                             ▼  renderState · battleReadout (novo)
                 ┌──────────────────────┐      ┌───────────────────────────────────┐
                 │ Game.handleM01Event  │      │ M01View.render(sim)                │
                 │ → PRESENTATION EVENTS│      │ actores · partes · fogo · poeira   │
                 │ (clarão, poeira,     │      │ impostores · comboios · aviões     │
                 │  som atrasado, shake)│      │ (funções puras de dados + clock)   │
                 └──────────┬───────────┘      └───────────────┬───────────────────┘
                            │                                  │
                            ▼                                  ▼
                 ┌────────────────────────────────────────────────────────┐
                 │ AmbientDirector (novo, apresentação)                   │
                 │ AMBIENT BATTLEFIELD LAYERS: camas sonoras, frases,     │
                 │ clarões no horizonte, névoa, vento, estados de mistura │
                 │ lê battleReadout; RNG próprio semeado; nunca escreve   │
                 └────────────────────────────────────────────────────────┘
```

Regra única: **a seta nunca inverte**. Nada da direita escreve na simulação, lê o olhar para decidir, ou cria entidades.

### 1.1 AUTHORITATIVE EVENTS (simulação)

Um acontecimento é autoritativo quando **qualquer** destas condições é verdadeira:

1. muda saúde, vida, posição, activação, estado ou tarefa de um actor;
2. muda objectivos, flags, relógio, gates ou checkpoints;
3. cria estado do mundo que **persiste** (dano, destruição, cobertura, fumo que fica);
4. o jogador pode **interagir** com ele (atingir, suprimir, carregar, falar);
5. tem de ser **igual depois de salvar/carregar** e igual com a câmara virada;
6. produz uma **consequência** referida noutro sítio (fala, HUD, debrief, contagem).

Propriedades obrigatórias (já praticadas em `consume()`/`enemyFire`): ID estável, consumo único com hora (`consumed[id]`), serialização no schema 2 com validação, aleatoriedade **só** pelo `Random` da simulação, posições em dados (nunca "jogador + deslocamento", excepto `safeImpact`, que afasta e nunca aproxima), e um evento emitido em `drainEvents()` para a apresentação reagir.

O que **continua** a ser autoritativo em M01 e o que **passa a ser** (secção 6):

| Já é | Passa a ser (novo, pequeno e delimitado) |
| --- | --- |
| Bombas 04:34, demolições, chegada do trem/Panzerzug (hora), ordem, retirada, baixas por ID, tiros em voo, gates, cenas | Agenda de **desgaste** do pelotão leste 24→18 antes das 06:00 (IDs 18–23; a flag 12–18 não muda) |
| Fumo persistente via `sectors.damage` | Impactos **múltiplos** do raid 05:30, agendados em `timers.raidSchedule` e persistidos como `sectors.damage` |
| Posições e estados de todos os actores | Actores novos de S3 (ferroviários, padioleiro, ferido, socorrista, carroça), guarnição da ckm, com tarefas por hora |
| Fogo alemão `kind:'east'` que não aterra | Fogo de **exibição** (`kind:'display'`) de polacos e alemães que nunca aterra nem suprime; `carriedBy` para alemães feridos no recuo |

### 1.2 PRESENTATION EVENTS (renderer e áudio)

Reacções efémeras a um evento autoritativo, ou **funções puras** de (dados da simulação, `clock`). Características:

- **Podem ser descartadas** sob orçamento sem que nada mude (pools limitados, como hoje: 96 clarões, 48 traçantes, 256 puffs).
- **Determinismo quando importa.** Tudo o que deve ficar igual depois de um reload deriva de dados autoritativos: a posição dos Stukas é `f(clock − consumed['evt_m01_bombing_0434'])`; a chegada do trem é `f(battleClock)`; a posição de uma coluna de fumo vem de `sectors.damage`. `Math.random` só para jitter sem persistência (partículas).
- **Lêem**: o fluxo de `drainEvents()`, `renderState`, `actors`, `enemyFire.rounds`, `sectors.damage`, `consumed`, `battleClock`, `scene`. **Não lêem** o que o jogador vê para decidir o que acontece; só para decidir o que desenhar.
- **Nunca**: traçam linhas de visão para gameplay, decidem acertos, supressão, dano, visibilidade de inimigos, hora de eventos; nunca movem actores; nunca tocam no RNG da simulação; nunca escrevem no snapshot (o `actorAnimations` já é só diagnóstico, por contrato).

### 1.3 AMBIENT BATTLEFIELD LAYERS (camada ambiente)

Camadas contínuas que dão a sensação de **frente larga**: camas sonoras, frases de fogo distante, clarões no horizonte, rumor com atraso, névoa de fumo, vento. Regras próprias:

- **Fonte de verdade: o estado dos sectores**, nunca um temporizador autónomo. A camada lê `battleReadout` (novo getter só de leitura): estado agendado de cada sector (`sector.state`, que vem do `battleClock`), **intensidade medida** (tiros reais nos últimos 20 s de `clock`, pelos `firedAt` dos actores do sector), eventos recentes, cena activa, flags (raid, Stukas, trem).
- **Dois relógios, dois papéis.** O **estado** vem do `battleClock` (agendas históricas, gates). O **fraseado** corre no `clock` (segundos de jogo activo): quando um gate segura a hora, o sector não congela em silêncio nem repete, porque as frases continuam no tempo activo. Em pausa ambos param e a mistura suspende (`audio.suspend()`), retomando sem reiniciar.
- **Aleatoriedade própria, semeada e reprodutível**: `presentationRandom(seed ^ hash(sectorId))`, onde `seed` é a semente da missão. A mesma partida soa parecida depois de um reload, mas o RNG da simulação não é tocado.
- **Sem entidades.** Nada na camada ambiente é um inimigo, tem vida, ou pode ser atingido. Se alguma coisa precisar de o ser, **é promovida** para a simulação (actores com ID). Em M01 a fronteira é clara: a área jogável é x −460…440 / z −80…140 (`bounds.playable`); S4 (z −1500…−800) e S5 nunca são promovidos.
- **Coerência de consequência**: um acontecimento ambiente só pode ser grande se deixa rasto que **a simulação guarda** (fumo persistente, cratera, corpo, relato). O que não deixa rasto fica pequeno: tiros isolados, clarões, rumor. Por isso os impactos do raid 05:30 são autoritativos e os clarões de fuzil do norte são ambiente.

### 1.4 O que pode e o que NÃO pode afectar o gameplay

| Capacidade | AUTHORITATIVE | PRESENTATION | AMBIENT |
| --- | --- | --- | --- |
| Alterar saúde, vida, posição, estado, tarefa de actores | **Sim** | Não | Não |
| Criar/activar actores, reforços, recuos | **Sim** (vias de acesso coerentes) | Não | Não |
| Disparar tiros que aterram, ferem, suprimem | **Sim** | Não | Não |
| Disparar tiros de exibição (clarão + traçante, sem chegada) | **Sim** (são dados em `rounds`, `kind:'display'`) | Não (só desenha) | Não |
| Mudar objectivos, flags, relógio, gates, checkpoints | **Sim** | Não | Não |
| Dano/destruição/fumo que persiste e entra no save | **Sim** (`sectors.damage`, `destruction`) | Não | Não |
| Fumo, poeira, clarão, faísca, vibração efémeros | Não | **Sim** | **Sim** (longe) |
| Som posicional de um tiro/explosão real, com atraso | Não | **Sim** | Não |
| Camas sonoras, frases distantes, rumor, zumbido de motores | Não | Não | **Sim** |
| Clarões/silhuetas no horizonte sem entidade | Não | Não | **Sim** |
| Ducking, filtro de interior, limites de vozes | Não | **Sim** (mistura) | **Sim** |
| Usar `Math.random` | **Nunca** | Só jitter sem persistência | Só RNG semeado próprio |
| Ler o olhar/posição do jogador | Só para segurança (`safeImpact`, `inView` nos retardatários, já existente) | Para desenhar e espacializar | Para espacializar e para orçamento |
| Decidir visibilidade, LOS, acerto, supressão | **Só aqui** | Nunca | Nunca |
| Ser descartado por orçamento/preset | **Nunca** | Sim (degradar tamanho, não existência do sinal principal) | Sim |
| Ficar diferente depois de salvar/carregar | **Nunca** | Só partículas em curso | Só a fase das frases |

**Teste de pertença** (para cada ideia nova): "Se isto não acontecer, alguma coisa fica diferente no save, no HUD, nas falas, na contagem ou no que o jogador pode atingir?" Se sim → autoritativo. Se não → apresentação ou ambiente. Se "não, mas deixa fumo durante 20 min" → o fumo é autoritativo (`sectors.damage`), o resto não.

### 1.5 Contratos de interface a acrescentar (mínimos)

| Interface | Onde | Natureza | Descrição |
| --- | --- | --- | --- |
| `sim.battleReadout` | `m01-simulation.js` (getter, como `threat`) | leitura | `{clock, battleClock, phase, scene, flags:{raid,stukas,train963,panzerzug}, sectors:{id:{state, intensity 0–1, lastFireAt, shooters, casualties}}, recentBlasts:[...]}`. Calculado, não guardado. |
| `sector-event` | `tick()` ao actualizar `sector.state`; nos handlers de 05:50/07:00/04:40 em vez de `distant-shot` | evento | `{type:'sector-event', sector, state, kind:'state'|'onset', at}`. A apresentação usa como transição de mistura/frase. |
| `rounds` generalizados | `m01-fire.js` `validRound`, `ROUND_KINDS`; `m01-simulation.js` `landRound` | dados | `by` admite `pl_east_*`, `ckm_crew_*`, `szymon_kowal`; `kind:'display'` nunca aterra nem suprime; `kind:'attrition'` só com `by: de_east_*` e `victim: pl_east_(18..23)`; `ox>=690` só para `de_*`. Lista continua em `enemyFire.rounds` (compatibilidade de save). |
| `timers.raidSchedule`, `timers.attrition`, `timers.deploy` | `m01-simulation.js` | dados | Agendas criadas no `consume()` com RNG da simulação, drenadas no `tick()` pelo `battleClock`; validadas no schema 2; saves antigos sem elas são aceites (como `enemyFire`). |
| `renderState.ambient` | `m01-simulation.js` | leitura | Flags de apresentação derivadas: `raidWindow`, `stukaPhase`, `trainApproach`, `interior` (jogador dentro de `shelter`/`casemates_west`). |
| `AmbientDirector` | `src/render/m01-ambient.js` (novo) | apresentação | Lê `battleReadout` + `renderState`, mantém geradores por sector, estados de mistura, clarões de horizonte, vento/névoa. Sem referência à instância para escrita. |
| `AudioMix` | `src/core/audio-mix.js` (novo), usado por `AudioManager` | apresentação | Buses `MASTER, VOICES, WEAPONS_NEAR, WEAPONS_FAR, EXPLOSIONS, AMBIENCE, VEHICLES, UI`; prioridades e ducking; filtro de interior; limite de 2 vozes (`callouts.note`). |
| `presentationRandom(seed)` | `src/render/m01-ambient.js` | apresentação | LCG igual ao `Random` mas instância separada; semeado com a semente da missão e o ID do gerador. |
| `gameDiagnostics().m01.ambient` | `game.js` | leitura | Estado de mistura, ganhos, geradores activos, contagens por camada, descartes por orçamento. Só leitura, como hoje. |
| `missions/m01-tczew/battlefield-ambience.json` | dados | dados | Perfis por `sector.state`: famílias de eventos, distribuições de intervalos (mín/máx/mediana), comprimento de frases, bancos de variantes, zonas de origem, atrasos. Estados de mistura por fase. |

---

## 2. O que o jogador vê e ouve, por fase e por distância

Horas em relógio de batalha. "Fora de cena" = acontece e persiste sem ser visto. Camada: **A** autoritativo, **P** apresentação, **M** ambiente.

| Fase | Perto (0–150 m) | Média (150–800 m) | Longa (0,8–1,5 km) | Horizonte / céu | Fora de cena |
| --- | --- | --- | --- | --- | --- |
| 04:30–04:33 prelúdio | Kowal limpa a rkm, Bąk sopra o café, mapa com lanterna tapada, sapadores em ronda na encosta sul, rendição de guarda no portal (A tarefas + P poses); vento, rio sob o ferro, aves da madrugada (M) | Lanternas dos ferroviários no pátio da estação (A actores + P brilho) | — | Faixa clara a ENE; torres em silhueta (P já existe) | Apito de manobra longe, uma ou duas vezes (M, só prelúdio) |
| 04:33:10–04:34 alarme | Todos param; as aves calam (M) | — | — | Ronco crescente a 80°, aviões ainda invisíveis (M) | — |
| 04:34–04:36 bombardeio | Três bombas (A), onda de choque, poeira, zumbido opcional (P); capacete (A) | Vagão do pátio a arder (A flag + P chamas) | — | Três Ju 87 em fila pelo `stukaPath`, aproximação final pelo sul, sirenes de mergulho, saída para leste (P) | — |
| 04:36–04:45 reorganização | Contagem, gritos (A falas) | Ferido arrastado 45 m até à estação (A); segunda passagem: ronco e dois impactos longe para oeste (A fumo + M ronco) | Luz de uma locomotiva a aproximar-se na linha de Szymankowo onde não devia haver trem (P, 04:43:30) | Fumo da estação (A) | Posto de socorro a formar-se (A, 04:50) |
| 04:45–05:30 reparo | Rajadas de Kowal com traçantes (A display), sapadores deitados/trabalhando (A) | — | Trem 963 pára com travões e vapor; pioneiros desembarcam e ocupam posições (A opcional); **troca de traçantes** pelotão leste ↔ portões/dique (A display); clarões; baixas visíveis do pelotão (A desgaste); Panzerzug chega 04:52 e dispara contra a cabeça de ponte leste (A display, pendente P6) | Fumo das locomotivas a derivar com o vento (P) | S4 `sporadic_fire` a partir de 05:15: tiros isolados, 20–90 s (M) |
| 05:30–06:00 contra o sol | Salvas de ajuste reais (A) | — | Fogo leste com frases e pausas (A cadências + M envelope só em `display`) | Raid de altitude: zumbido, 5–7 impactos na cidade com fumo persistente, névoa castanha a oeste (A impactos + P/M) | S4 `contact` 05:50: frases de MG, crepitar grave, clarões rasos no horizonte norte, rumor 2,6–4,4 s depois (M) |
| 06:00–06:10 set-piece | Pelotão a passar, Bąk ferido (A) | Alemães no tabuleiro a 600–700 m como silhuetas com tamanho mínimo (P impostores) | Cabeça de ponte leste em `polish_withdrawal`: fogo esparso, fumo (A/M) | — | — |
| 06:10 explosão leste | Vibração ao chegar o som (P) | Detritos no rio a 700–800 m (P, t≈4 s) | Clarão → 1,9–2,3 s → estrondo; alemães recuam **com feridos**, alguns ficam (A); 60 s de silêncio alemão (A) | — | **Silêncio de 2 s**: tudo menos o vento (P mistura) |
| 06:10–06:45 corredor | Guarnição da ckm sai da casamata e passa por Jan (A) | Carroças com feridos para oeste atrás da estação (A/P); fogo esporádico do dique varre a faixa (A) | `german_regroup` 06:20: frases curtas, raras (A) | Fumo da cidade; sol a 15° (P) | S4 `lull` 06:25 (M) |
| 06:45 explosão oeste | Estrondo quase imediato, chuva de terra sobre o posto de disparo, silêncio, zumbido, vento e água (P mistura) | Lipski olha a ponte (A tarefa) | — | Poeira em suspensão na luz da manhã (P névoa) | — |
| 07:00–07:05 abrigo | Interior: respiração, filtro grave (P) | — | — | — | Ataque de Koźliny: canhão AT (2–4 disparos) e MGs ao norte, ouvidos abafados (M, A evento) |

Nenhuma destas colunas espera pelo jogador. As três primeiras linhas já acontecem com ele a andar para o posto; o que muda é que passam a ser **vistas e ouvidas**.

---

## 3. Como produzir cada elemento pedido

| Elemento | Camada | Fonte de verdade | Como | Em M01 (certeza) | Não pode |
| --- | --- | --- | --- | --- | --- |
| Formações de infantaria distantes | A + P | Actores com ID (`pl_east_*`, `de_east_*`, `de_spans_*`, `ckm_crew_*`) | Activar o pelotão leste desde 04:45 em posições de espera (dados em `mission.json`), estado `GUARD/SUPPRESS`, sem movimento até 06:00. Desenhar além de ~350 m como **impostores**: um quad por actor com altura mínima de 3 px, silhueta escura contra céu/água, 3 posturas (de pé, agachado, caído) e passo | Pelotão de Faterkowski na cabeça de ponte leste: DOCUMENTED; números: dramatização (P8) | Inventar infantaria alemã na margem oeste (HISTORICAL_RESEARCH §10) |
| Clarões de boca distantes | P | `actor.firedAt`, `actor.shot` | Já existe para inimigos (tamanho mínimo no ecrã). Estender a aliados (`firedAt` em Kowal, pelotão, ckm); brilho na seteira da casamata | — | Ser desenhado sem tiro real nos dados |
| Troca de traçantes | A (dados) + P | `enemyFire.rounds` com `kind:'display'`, flag `tracer` | Pelotão (2 MG pesadas → traçante por rajada) e ckm da casamata disparam registos que **nunca aterram nem suprimem**; dique/portões já disparam `kind:'east'` — passam a apontar aos homens reais do pelotão; cores por lado (`m01-view.js` `updateFire`) | ckm wz.30 e MG34: DOCUMENTED; traçante: prática plausível, RECONSTRUCTED | Suprimir, ferir ou matar; alterar as cadências afinadas do fogo sobre o reparo/jogador |
| Artilharia | M (norte) + A display (Panzerzug) | `sector.state` de S4; `train_963/panzerzug` | Norte: morteiros/canhão só como clarão raso + rumor com atraso (ambiente, efémero). Panzerzug 7: disparos de 7,5 cm **só contra a cabeça de ponte leste** (clarão de saída, estampido 3,5 s depois, impacto com poeira a 1 km), podendo causar 1–2 das 6 baixas agendadas | H01-PDF p.133 relata artilharia contra os acessos; calibres P6 pendente → **sem granadas na margem oeste** | Cair perto do jogador; disparar canhões contra a margem oeste antes de P6 |
| Colunas de fumo | A (`sectors.damage`) + P | Impactos autoritativos | Toda a coluna que dura mais de ~60 s é uma entrada `sectors.damage` (estação, raid, demolições, quartel/segunda passagem). `smokeVisible` por prefixo de ID (raid até ao fim da missão). Vento único em dados (`map-layout.weather.wind`) para todas as colunas, puffs e nuvens | Fumo da estação: DOCUMENTED; cidade: RECONSTRUCTED | Aparecer sem impacto registado; derivar em direcções diferentes |
| Aeronaves | P + M | `consumed['evt_m01_bombing_0434']`, `consumed['evt_m01_planes_heard']`, `flags.second_raid_state`, `map-layout.stukaPath` | Três Ju 87 ao longo do `stukaPath` (t=44 ↔ bombardeio+2,1 s; 3,5 s entre aviões; inclinação pela tangente); zumbido crescente a 80° desde 04:33:10; sirene por mergulho; partida para leste; **sem laço**. Segunda passagem: só som e dois impactos longe. Raid 05:30: 3 silhuetas Do 17 numa única passagem alta, zumbido grave, sem mergulhos | Ju 87 de Elbing e aproximação pelo sul: H01-PDF; Do 17 Z: nota 76 | Voar sobre Jan depois das 04:36; mostrar número de aviões na tela |
| Explosões | A + P | `m01-blast` (já existe) | Nunca periódicas: bombas (3 + 2 + 5–7) e demolições (2) vêm de eventos e agendas com jitter semeado; morteiros do norte são clarões ambiente sem rasto. Clarão primeiro, som pela distância (já existe), vibração ao chegar o som (já existe) | — | Explosão "decorativa" sem origem/destino |
| Silhuetas em movimento | A + P impostores | Posições dos actores | Pelotão em posição e a recuar, alemães a desembarcar e a avançar/recuar, padioleiro a arrastar, carroça, guarnição da ckm a sair, Lipski. Continuidade por ID entre impostor e corpo próximo | — | Clones: cada impostor tem fase, altura e postura próprias |
| Tropas em retirada | A | `east_platoon_withdraws`, `east_demolition` | Já existe para o pelotão. Alemães: 2 dos 4 caídos são **carregados** (`carriedBy`), 2 ficam; carregadores recuam a 1 m/s; ao chegar a x≥1060 ficam inactivos ("nenhum reaparece") | SCRIPT Cena 8 | Ressuscitar, reaparecer, humilhar |
| Reforços | A + P | `train963_arrives`, `panzerzug_arrives` | Chegada do trem como função do `battleClock` (04:43:30→04:45:00, desaceleração, pára quando o evento dispara); Panzerzug 04:51→04:52 atrás. Opcional: pioneiros desembarcam e ocupam posições por `deployPaths` em 45–90 s | Trem 963 e Panzerzug 7: DOCUMENTED; hora do blindado: RECONSTRUCTED | Spawn visível; aparecer atrás do jogador |
| Destruição ambiental | P (de dados A) | `destruction`, `sectors.damage`, nós de cobertura dinâmicos | Vagão em chamas no pátio, parede enegrecida e vidros da estação, cratera com bordo em `repair_site_1`, sacos rebentados no posto avançado, chuva de terra e poeira em suspensão depois das 06:45, detritos no rio depois das 06:10 | — | Criar colisão/cobertura nova sem nó autoritativo |
| Veículos distantes | A/P | Actores-veículo (carroça), comboios | Carroça com padiolas a sair para oeste às 05:40 (actor com rota); trens; blindados do norte **só som** (nunca visíveis: além do limite e do horizonte) | Carroças: dramatização; blindados de Koźliny: T08 | Jipe/tanque jogável (marco 4) |
| Actividade ferroviária | P + M (+A) | `battleClock`, flags | Luz de locomotiva a aproximar-se no crepúsculo (04:43), travões, silvo de vapor, choque de engates, vapor contínuo da 963 parada, fumo a derivar; apito de manobra a oeste só no prelúdio; "manobra parada" depois do bombardeio (silêncio ferroviário) | SCRIPT Cena 1 e 5; luz do trem: dramatização plausível | Inventar trens além do 963 e do Panzerzug |
| Holofotes | — | — | **Não aplicável em M01**: crepúsculo civil, sem AA/holofotes documentados em Tczew. Substitutos de luz: lanterna de Lipski, lanterna tapada no mapa, lâmpada da locomotiva, chamas do vagão, brilho na seteira, clarão das demolições. A família `LightBeam` fica definida na camada ambiente para missões posteriores (M05, M20) | HISTORICAL_RESEARCH §6.2 | — |
| Camadas de áudio | M + P | `battleReadout`, eventos | Buses e prioridades; camas: vento, rio (ganho pela distância ao canal e pelo tabuleiro), aves, zumbido de motores, cama de S2 pela intensidade **medida**, rumor de S4 pelo estado, crepitar e vozes do pátio por posição, vapor do trem; one-shots com atraso (já existe); filtro de interior no abrigo e junto à casamata; vozes limitadas a 2 | `MAP.md §8`, `callouts.note` | Esconder uma granada próxima ou um aviso de demolição (prioridade) |
| Ritmos de batalha | M (envelope) + A (agendas) | `sector.state` + intensidade medida | Macro: agendas históricas. Micro: **frases** (3–8 eventos, 4–20 s) separadas por pausas (10–90 s), intervalos log-normais com mínimo/máximo e **sem dois intervalos iguais seguidos**; call-and-response entre lados (resposta 2–6 s depois, timbre diferente); orçamento de eventos por minuto e por sector. O envelope só escala cadências de fogo **que nunca aterra** | §39, §71 | Tocar nas cadências do fogo sobre o reparo, o jogador, a secção, a salva de ajuste e o tabuleiro |
| Transições silêncio/estrondo | P mistura | `scene`, `sector-event`, `m01-blast` | Tabela de **estados de mistura** por fase (secção 4.3) com ataque/relaxamento; silêncios desenhados: alarme (aves calam), 2 s após a explosão leste, chuva de terra → silêncio → zumbido → vento após a oeste, abrigo | SCRIPT Cenas 3, 8, 9, 10 | Cortar uma fala obrigatória ou um aviso |

---

## 4. Ritmo, variação e anti-parque-temático

### 4.1 Regras

1. **Nada espera pelo olhar.** Só os gates da missão seguram a hora, e mesmo então os sectores continuam (já é assim). A camada ambiente lê a posição do jogador apenas para espacializar e orçamentar.
2. **Nada é centrado no jogador.** Origens vêm de dados do mapa (`north_perimeter`, `east_gates`, `raidTargets`, `tczew_station`); a única função que olha para o jogador é `safeImpact`, e só afasta.
3. **Nenhum período fixo.** Intervalos vêm de distribuições com mínimo, máximo e mediana; dois intervalos consecutivos nunca são iguais; frases têm comprimentos variados; cada gerador tem semente própria.
4. **Variação em três eixos**: tempo (intervalos e frases), espaço (posições amostradas em zonas, nunca o mesmo ponto duas vezes seguidas), timbre (≥4 variantes por família com jitter de altura/filtro; bancos de amostras licenciadas podem substituir a síntese sem mudar a arquitectura).
5. **Rasto obrigatório**: o que é grande deixa fumo/cratera/corpo/relato na simulação; o que não deixa rasto fica pequeno.
6. **Continuidade por ID**: um impostor ao longe e um corpo ao perto são o mesmo actor; um morto continua caído na mesma posição em qualquer LOD e depois de restaurar.
7. **Consistência física**: clarão antes do som pela distância real; som e clarão na mesma origem; fumo de todas as fontes com o mesmo vento; silhuetas em contraluz entre 05:30 e 06:40.
8. **Orçamento declarado** por preset, com ordem de degradação (§75): partículas secundárias e impostores distantes primeiro, depois densidade de camas; o sinal principal de um evento autoritativo (clarão + som) nunca desaparece, só encolhe.
9. **A bancada francesa não muda** (`SectorBattle`, `BattleDirector`, renderer da aldeia): o `AmbientDirector` é só de M01.

### 4.2 Frases e intervalos (perfil por estado, em `battlefield-ambience.json`)

| Estado do sector (exemplos) | Famílias | Frase | Pausa entre frases | Observação |
| --- | --- | --- | --- | --- |
| `s4.quiet`, `s2.quiet`, `s5.empty` | — | — | — | Silêncio; só camas naturais |
| `s4.sporadic_fire` (05:15) | tiro isolado de fuzil, raro MG de 3 | 1–2 eventos | 20–90 s | Grave, sem estalidos agudos; atraso 2,3–4,4 s |
| `s4.contact` (05:50) | MG 4–9, fuzis 2–5, morteiro raro | 3–8 eventos em 4–20 s | 10–40 s | Clarões rasos no horizonte norte, com resposta do outro lado 2–6 s depois |
| `s4.lull` (06:25) | tiro isolado | 1 evento | 40–120 s | — |
| `s4.kozliny_attack` (07:00) | canhão AT 2–4 disparos (2–3 s entre), MGs | 2 frases | 15–30 s | Ouvido no abrigo com filtro grave |
| `s2.firefight` (04:46) | envelope **só** sobre `display`/`east` | multiplicador 0,6–1,8 nas cadências | pausas 15–45 s a cada 60–120 s | O fogo sobre reparo/jogador/secção mantém cadências afinadas |
| `s2.east_blown` (06:10) | silêncio alemão 60 s de relógio | — | — | Depois, `german_regroup`: 2–3 tiros, 40–120 s |
| `s2.smoke_and_sporadic_fire` (06:45) | tiro isolado | 1 | 60–180 s | — |
| `s3.bombed` → `aid_post` | crepitar, gritos, vidros | contínuo com envelope | — | Ganho pela distância ao pátio |
| `s5.stukas_approach/attack/depart` | zumbido 80° → sirenes → partida | guiado pelo `stukaPath` | — | Sem repetição: uma passagem |
| `s5.high_altitude_raid` (05:30–05:34) | zumbido alto, crumps pelos impactos autoritativos | — | — | Depois: névoa de fumo a oeste |

### 4.3 Estados de mistura (quiet/loud)

| Estado | Entrada | Camas | Ducking |
| --- | --- | --- | --- |
| PRELÚDIO | 04:30 | vento, rio, aves, manobra longe (1–2×) | — |
| ALARME | `planes_heard` | aves cortam em 1 s; zumbido sobe de 80° | — |
| BOMBARDEIO | `bombing_0434` | sirenes, bombas, poeira; zumbido opcional (acessibilidade) | tudo abaixo de falas 014–016 |
| REORGANIZAÇÃO | `take_cover` concluído | pátio a 300 m (crepitar, vozes), segunda passagem 04:40 longe | — |
| FRENTE LESTE | `train963_arrives` | cama S2 pela intensidade medida; Kowal perto; vapor do trem | avisos de MG acima da cama |
| CONTRA O SOL | 05:30 | + raid (zumbido alto, crumps), + S4 esporádico/contacto | falas prioritárias |
| RETIRADA | `east_platoon_withdraws` | tiros do tabuleiro a 600 m (mais secos), botas no ferro | — |
| EXPLOSÃO LESTE | `m01-blast east` | clarão → silêncio relativo → estrondo → detritos → **2 s só vento** (t 6,5–8,5 da cena) → fala 045 | corta tudo menos vento |
| CORREDOR | `leave_bridge` | fogo esporádico leste, carroças, S4 pausa | — |
| EXPLOSÃO OESTE | `m01-blast west` | estrondo imediato, chuva de terra, silêncio, zumbido (reduzível), vento e água | corta tudo |
| ABRIGO | `roll_call` | filtro grave; respiração; S4 07:00 abafado | vozes da chamada acima de tudo |

---

## 5. Verificação proporcional

Teste de estado não é playtest; nada aqui mede FPS.

- **Node (simulação)**: agendas novas drenadas pelo `battleClock` e idempotentes; snapshot/restauro das agendas, actores e `carriedBy`; desgaste exactamente 6 baixas nos IDs 18–23 com `m01.east_platoon_survivors` igual a 18 às 06:00; `display` nunca aterra, nunca suprime, nunca fere; novos actores nunca entram no corredor nem em `bz_west` depois das 06:36; o teste de 90 s "a olhar para trás" cobre os novos actores; `node tools/m01-cover-comparison.mjs` repete os invariantes (ajuda termina o reparo antes de ignorar em todas as sementes; sobreviventes 15–18 vs 12).
- **Node (apresentação pura)**: determinismo dos geradores (mesma semente → mesma lista), limites de intervalos, "sem dois intervalos iguais seguidos", posição dos Stukas em instantes conhecidos do caminho, `trainX(battleClock)` monótono e com paragem exacta, clamp de tamanho dos impostores; e um teste de **não-escrita**: `structuredClone(sim.snapshot())` antes e depois de N actualizações do `AmbientDirector` é `deepEqual`.
- **Navegador (continuações de saves reais da rota, como hoje)**: 04:33:40 (três aviões no caminho, vistos do posto avançado), 04:47 (traçantes nos dois sentidos: `fireEffects.tracer>0` com origens x<1050 e x>1050; impostores > 0), 05:36 (≥4 colunas de fumo a oeste), 05:52 (clarões no norte: contador de ambiente > 0), 06:12 (alemães a recuar com feridos), 06:46 (chuva de terra/poeira). O diagnóstico `gameDiagnostics().m01.ambient` é lido como os outros contadores. O áudio não é verificável em headless: registar a limitação e uma verificação manual em `RUNBOOK.md`.
- **Partida contínua**: repetir `tools/m01-browser-playthrough.mjs` (base e `--cover help/ignore`) depois das tarefas autoritativas; os resultados têm de manter CP-A..D, 12/12 e os invariantes de cobertura.
- **Pendente de humanos**: playtest completo e Chromebook. Até lá, desempenho = **NÃO MEDIDO**.

---

## 6. Tarefas por impacto

Dono sugerido: **engine** = `src/game/*`, validador e saves (Codex, conforme `AGENTS.md`); **apresentação** = ficheiros novos ou `src/render/*`/`src/core/audio*` (baixo conflito); **dados** = `missions/m01-tczew/*.json` e documentação. `BX-00` é fundação (impacto indirecto) e precede as que a referem; as restantes estão por impacto na sensação de batalha ampla.

| ID | Tarefa | Camadas | Dono | Depende de |
| --- | --- | --- | --- | --- |
| BX-00 | Fundação: `battleReadout`, `sector-event`, `rounds` generalizados, `AmbientDirector` + `AudioMix`, `presentationRandom`, diagnóstico `ambient`, `battlefield-ambience.json` | A (leitura/dados) + P + M | engine + apresentação | — |
| BX-01 | Frente leste visível: pelotão em posição, troca de traçantes, desgaste 24→18, Panzerzug contra a cabeça de ponte leste | A + P | engine | BX-00 (`rounds`), BX-02 |
| BX-02 | Impostores de longa distância com tamanho mínimo no ecrã | P | apresentação | — |
| BX-03 | Cama sonora, estados de mistura e motor de frases (S2, S4, S3, naturais) | M + P | apresentação | BX-00 |
| BX-04 | Stukas no `stukaPath`, sirenes, zumbido a 80°, segunda passagem 04:40 | P + M (+A pequeno) | apresentação (+ engine para os dois impactos) | BX-00 (áudio) |
| BX-05 | Perímetro norte: clarões no horizonte, rumor com atraso, frases por estado | M | apresentação | BX-00, BX-03 |
| BX-06 | Raid 05:30: 5–7 impactos agendados, fumo persistente sobre a cidade, Do 17 numa passagem, névoa | A + P + M | engine + apresentação | BX-00 |
| BX-07 | Comboios: chegada do 963 e do Panzerzug, vapor, luz, travões; desembarque opcional | P + M (+A opcional) | apresentação (+ engine opcional) | BX-00 (áudio) |
| BX-08 | Pátio da estação: lanternas, ferido arrastado, posto de socorro, carroças | A + P | engine + apresentação | BX-02 |
| BX-09 | Depois da explosão leste: recuo alemão com feridos, silêncio de 60 s, reagrupamento | A + P | engine | BX-02 |
| BX-10 | Guarnição da ckm wz.30: fogo abafado da casamata, saída às 06:12 pelo corredor | A + P + M | engine | BX-00, BX-03 |
| BX-11 | Vida da secção antes e depois: ocupações do prelúdio, reorganização, Lipski a olhar a ponte | A (`task`) + P | engine (pequeno) + apresentação | — |
| BX-12 | Destruição ambiental persistente: vagão em chamas, estação, cratera, chuva de terra, poeira em suspensão | P | apresentação | — |
| BX-13 | Vento, névoa baixa e céu coerentes com todo o fumo | P + dados | apresentação | — |
| BX-14 | Orçamento por preset, ordem de degradação, modo de captura das vistas longas, RUNBOOK | P + testes | apresentação | BX-00 |

**Ordem de execução sugerida** (respeita dependências e o lane de cada agente): BX-00 → BX-02 → BX-01 → BX-03 → BX-04 → BX-06 → BX-05 → BX-07 → BX-09 → BX-08 → BX-10 → BX-12 → BX-13 → BX-11 → BX-14. BX-02, BX-12 e BX-13 são apresentação pura e podem avançar em paralelo com a engine.

### BX-00 — Fundação

- **Engine**: `get battleReadout()` em `m01-simulation.js` (calculado; `intensity` = tiros por actores do sector nos últimos 20 s de `clock` / máximo do perfil); `firedAt` também em aliados que disparam (Kowal); `sector-event` emitido na mudança de `sector.state` e nos handlers de 04:40/05:50/07:00 (substitui `distant-shot`); `ROUND_KINDS` + `validRound` em `m01-fire.js` admitem `kind:'display'|'attrition'`, `by` de aliados, `ox<690` para aliados, arma em `['mg34','kar98k','ckm_wz30','rkm_wz28','kb_wz29','pz7_75mm']`; `landRound` ignora `display`; `renderState.ambient`.
- **Apresentação**: `src/render/m01-ambient.js` (`AmbientDirector` com `update(readout, renderState, clock, player)`, geradores por sector, estados de mistura), `src/core/audio-mix.js` (buses, prioridades, ducking, lowpass de interior), `presentationRandom`, diagnóstico `ambient` em `game.js`.
- **Dados**: `missions/m01-tczew/battlefield-ambience.json` com os perfis da secção 4.2 e os estados da 4.3; `map-layout.json → weather.wind`.
- **Gameplay**: nenhum. `landRound` para `display` retorna antes de qualquer traçado.
- **Verificação**: `validRound` aceita/rejeita os novos campos; saves antigos sem `firedAt` em aliados continuam válidos; teste de não-escrita do `AmbientDirector`; `npm test`, `npm run build`.
- **Risco**: baixo. Atenção ao limite de 200 tiros em voo do validador: os geradores de `display` respeitam um tecto por sector.

### BX-01 — Frente leste visível (04:45–06:00)

- **Engine**: em `train963_arrives`, `pl_east_0..17` ficam `active:true` nas posições de espera (`grp_east_platoon.holdPositions`, 1040–1046 / z 38–40, já usadas como posição inicial) com estado `GUARD`; `updateActors` **não os move** antes de `east_platoon_withdraws` (guarda explícita). Fogo `display` do pelotão sobre os alemães dos portões/dique: duas MG pesadas (traçante) e fuzis, cadências com envelope. `eastFire` dos atiradores que não vêem a margem oeste passa a apontar `kind:'east'` aos homens reais do pelotão (continua a não aterrar). **Desgaste**: `timers.attrition` com 6 horas de relógio entre ~04:50 e 05:55 (jitter semeado); em cada uma, um `de_east` com linha de visão dispara `kind:'attrition'` com `victim: pl_east_(23..18)`; `landRound` mata a vítima se o traçado a atingir, **sem tocar** em `m01.east_platoon_survivors`; a agenda termina antes das 06:00 e `east_platoon_withdraws` continua a reger os 12–18. Panzerzug 7 (04:52+): 1 disparo de 7,5 cm a cada 60–180 s contra a cabeça de ponte leste, `display` com impacto desenhado, podendo ser o atirador de 1–2 baixas do desgaste (gate por `groups.grp_panzerzug.fire:'east_only'`, RECONSTRUCTED até P6).
- **Apresentação**: traçantes por lado (`r.by` polaco vs alemão), clarões já derivados de `firedAt`, impostores (BX-02) para o pelotão e os alemães.
- **Dados**: `mission.json` → `grp_east_platoon.holdPositions`, `fireProfile`; `grp_panzerzug` (novo grupo); `battlefield-ambience.json` → `s2.*`.
- **Gameplay**: as cadências sobre reparo/jogador/secção/salva de ajuste/tabuleiro **não mudam**; nenhum alemão morre por fogo polaco de exibição; `s2.strength` continua `enemies alive × 2`; a prontidão da demolição leste não muda. Efeito indirecto: nenhum, se o Panzerzug só disparar para leste.
- **Verificação**: Node: pelotão activo e imóvel antes das 06:00; nenhuma `display` aterra/suprime/fere; exactamente 6 baixas nos IDs 18–23 antes das 05:56 e flag 18 às 06:00; nenhuma ronda `attrition` em voo depois das 06:00; 90 s a olhar para trás; snapshot/restauro; `m01-cover-comparison` nas 12 sementes com os mesmos invariantes de `tests/m01-cover-threat.test.js`. Navegador: continuação às 04:47 com `fireEffects.tracer>0` de ambos os lados e impostores visíveis; captura com recorte 4×, como `gate-mg-flash-zoom4x`.
- **Risco**: médio. A geometria dos portões (x 1053–1057) fica a 10–17 m do pelotão (1040–1046): a 1,1 km é um aglomerado de 2 px; aceitar. Capacidade dos lotes de actores (90 torsos) tem de subir para ~110 com BX-08/BX-10.

### BX-02 — Impostores de longa distância

- **Apresentação**: em `updateActors`, actores a mais de ~350 m do jogador deixam de ir aos lotes de corpo e vão a um `InstancedMesh` de quads virados para a câmara, com altura `max(3 px em metros à distância d, 1,7 m)`, três posturas (de pé, agachado/deitado, caído) e fase de passo por ID; cor por lado com contraste mínimo garantido na névoa (`fog` aplicado, mas com piso), escurecido em contraluz entre 05:30 e 06:40 (direcção do sol já calculada em `lighting`). Capacidade 128/96/64 por preset.
- **Gameplay**: nenhum (hitboxes e LOS continuam nos dados).
- **Verificação**: teste puro da função de tamanho; captura 06:03 do tabuleiro (alemães a 600–700 m) e 04:47 (pelotão a 1,1 km) com recorte 4×.
- **Risco**: baixo. Não substitui arte final de humanos; é o que torna a frente **legível**.

### BX-03 — Cama sonora, estados de mistura e motor de frases

- **Apresentação**: `AmbientDirector` + `AudioMix` (BX-00) com as camas da secção 3 (vento com LFO lento semeado; rio pelo canal x 25–265 e pelo tabuleiro; aves 04:30–04:33:10 e regresso esparso depois das 04:50; cama S2 pela intensidade medida; S3 por distância ao pátio; S4 por estado; vapor do trem; zumbidos de BX-04/06); estados de mistura da 4.3 com ataque/relaxamento; frases da 4.2 para S4 e envelope para `display` de S2 (o envelope é aplicado **pela simulação** ao gerar as rajadas `display`, lendo um multiplicador que vem de dados, nunca do renderer — a camada ambiente só reproduz). Síntese procedural primeiro; bancos de amostras licenciadas depois (`assets/audio/production/ambience/`), sem mudar a arquitectura.
- **Gameplay**: nenhum.
- **Verificação**: determinismo e limites dos geradores; não-escrita; `ambient.state` no diagnóstico nas continuações; verificação auditiva manual em `RUNBOOK.md` (headless não ouve).
- **Risco**: médio no CPU de áudio (Web Audio com dezenas de osciladores): limitar vozes de síntese por bus (p. ex. 8 longe, 6 perto) e reutilizar nós.

### BX-04 — Stukas e primeiro contacto

- **Apresentação**: aviões no `stukaPath` com `t = (clock − consumed[bombing_0434]) + 42` para o primeiro, +3,5 s e +7 s para os outros; antes do bombardeio, aproximação em altitude ancorada em `consumed[planes_heard]`; inclinação pela tangente; hélice; sirene de mergulho por avião (varrimento procedural) a partir de t≈38; silvo de bomba 1,5 s antes de cada `m01-blast` aéreo da cena (os instantes 2,1/5/8,5 s são dados); partida para leste e desaparecimento na névoa. Segunda passagem 04:40: zumbido distante a oeste/noroeste, **sem aviões sobre Jan**. Raid plane actual (`time%150`) e laço `time%90` removidos.
- **Engine (pequeno)**: `second_air_pass` passa a registar dois impactos a ≥600 m para oeste (direcção da estação/quartel, RECONSTRUCTED; T30 não confirma o local do quartel) em `sectors.damage` com fumo de 240 s, em vez de um `distant-shot`.
- **Gameplay**: nenhum (impactos longe da área jogável; `safeImpact` continua a valer).
- **Verificação**: posições do caminho em instantes conhecidos; reload às 04:35 → aviões no ponto certo; continuação a `planes_heard`+30 s com três aviões no enquadramento a sul; `grep` de `time%` em `m01-view.js` vazio.
- **Risco**: baixo. Modelo Ju 87 B-1 continua a tarefa do terceiro agente (`docs/THIRD_AGENT_TASK.md`); até lá as caixas seguem o caminho certo.

### BX-05 — Perímetro norte (S4)

- **Apresentação/ambiente**: perfis `s4.*` (4.2); origens amostradas na faixa sul do polígono `north_perimeter` (z −1000…−800, x −900…−100), nunca a menos de 600 m do jogador; clarões rasos com material `fog:false` e tamanho mínimo; rumor grave com atraso 2,3–4,4 s; morteiros raros com fumo efémero (<40 s, sem rasto autoritativo); call-and-response; 07:00 ouvido no abrigo com filtro. Os eventos 05:50/07:00 chegam como `sector-event` (BX-00).
- **Gameplay**: nenhum; S4 nunca é promovido (fora dos limites).
- **Verificação**: geradores; continuação às 05:52 do tabuleiro a olhar para norte com contador `ambient.flashes>0`.
- **Risco**: baixo. Horas antes das 07:00 são dramatização (P9): manter a nota em `HISTORICAL_RESEARCH.md`.

### BX-06 — Raid das 05:30 sobre a cidade

- **Engine**: em `bombing_0530`, criar `timers.raidSchedule` com 5–7 impactos (RNG da simulação) em `raidTargets` (`mission.json`, blocos a oeste/sudoeste da estação, x −650…−1200, z −250…250, RECONSTRUCTED), horas espalhadas em 05:30:20–05:33:40; `tick()` drena por `battleClock` chamando `impact('raid_0530_k', p, true)` (passa por `safeImpact`); `smokeVisible` para o prefixo `raid_0530_` até ao fim da missão; validador aceita a agenda; saves sem ela continuam válidos; restaurar a meio da janela não repete impactos já consumidos.
- **Apresentação/ambiente**: três silhuetas Do 17 numa única passagem alta ancorada em `consumed[bombing_0530]`; zumbido grave 05:29:30–05:35 na direcção da passagem; crumps com atraso (já existe); névoa castanha a oeste proporcional ao número de colunas activas (tinta do nevoeiro, não do céu).
- **Gameplay**: nenhum; CP-C continua adiado até 05:34.
- **Verificação**: Node: N impactos até 05:34, todos ≥30 m e fora da área jogável, no snapshot; sem duplicados após restauro a meio; navegador: continuação às 05:36 da encosta a olhar para oeste com ≥4 colunas em `smokePuffs` e captura.
- **Risco**: baixo. Número e posições não documentados (nota 76): dizer "cidade", nunca contar aviões na tela.

### BX-07 — Comboios

- **Apresentação**: `trainX(battleClock)`: 04:43:30→04:45:00 de x≈1600 (dentro da névoa) até a locomotiva parar em 1065, desaceleração suave; Panzerzug 04:51→04:52 até 1119; antes disso invisíveis; vapor contínuo da 963 parada (puffs ancorados na chaminé, com o vento de BX-13); lâmpada frontal como sprite `fog:false` (crepúsculo, sol −1,7° às 04:43); travões, silvo, choque de engates com 3,0–3,5 s de atraso; vapor ao parar. "Manobra parada" a oeste depois do bombardeio.
- **Engine (opcional, BX-07b)**: pioneiros nascem junto aos vagões (x 1070–1150, z −4) e seguem `deployPaths` em 45–90 s até às `firePositions`, por interpolação directa (o colisor do portal é sólido, `world.move` não serve a leste de x 1050); a MG dos portões só dispara em posição. **Atrasa o primeiro fogo sobre o reparo** em até ~60 s de jogo: só com nova comparação de 12 sementes e aceitação dos invariantes.
- **Gameplay**: nenhum em BX-07; pequeno e medido em BX-07b.
- **Verificação**: `trainX` monótono e com paragem exacta; continuações às 04:44:30 (trem a meio, lâmpada) e 04:46 (parado, vapor); para BX-07b, `m01-cover-comparison` e `m01-cover-threat`.
- **Risco**: baixo (BX-07), médio (BX-07b). Composição do 963 e locomotiva: P16 aberta — modelos genéricos, sem classe na tela.

### BX-08 — Pátio da estação (S3)

- **Engine**: actores novos, `team:'ally'`, civis quando aplicável, sem armas e sem combate: `rw_extra_0..2` (ferroviários com lanterna, ronda 04:30–04:34, depois junto às carroças), `s3_bearer_0` + `s3_wounded_0` (04:35:30: arrasto 45 m de (−300, −3, 30) até à porta da estação em ~40 s; pose `dragged` derivada de `carriedBy` com altura baixa), `s3_medic_0` + dois feridos deitados no posto de socorro (04:50), `s3_cart_0` (entidade-veículo com rota para oeste atrás da estação às 05:40, 1,5 m/s) com dois padioleiros; Lipski junta-se às carroças depois das 06:45. Tarefas por `battleClock` via `task`/`target`; posições no save; validador com a lista de IDs alargada e migração por omissão (como `enemyFire`). Zona: pátio x −470…−335, z 20…55 e via atrás da estação; **nunca** o corredor do pelotão (x −322…−235, z 28…40) nem `firing_point`/`shelter`.
- **Apresentação**: brilho de lanternas (prelúdio), chamas do vagão (BX-12), silhueta da carroça (impostor com rodas), cama de vozes/crepitar (BX-03).
- **Gameplay**: nenhum; aliados não recebem dano do jogador (`fire()` só fere `enemy`), e não há inimigos com linha de visão ao pátio.
- **Verificação**: posições previstas em horas-chave; nunca dentro do corredor; snapshot/validador/migração; 90 s de independência; navegador: 04:36 do ponto de reunião a olhar para oeste (arrasto), 05:41 (carroça).
- **Risco**: médio (validador estrito e capacidade dos lotes). Tudo `GAMEPLAY_DRAMATIZATION` plausível (SCRIPT §5).

### BX-09 — Depois da explosão leste

- **Engine**: em `east_demolition`, dois dos quatro `de_spans` caídos passam a `carriedBy` de dois sobreviventes (os carregadores recuam a 1 m/s), dois ficam no chão; ao chegar a x≥1060 todos os `de_spans` ficam `active:false`. `de_east` fica em silêncio 60 s de relógio após a explosão; `german_regroup` (06:20) com 2–3 tiros em frases raras; `smoke_and_sporadic_fire` (06:45) com tiros isolados 60–180 s (ajuste de `eastFire` em modo `retreat`, que já existe).
- **Apresentação**: `actorPoseName` dá precedência a `carriedBy` sobre `!alive`; pose de transporte para alemães; silhuetas em recuo (BX-02).
- **Gameplay**: `de_spans` já não dispara em `retreat` (cooldown 99); o jogador continua a poder atingir carregadores a 700–1000 m (combate legítimo); nenhum alvo novo. A linha de visão dos atiradores dos portões para a margem oeste não muda.
- **Verificação**: Node: pares carregados seguem os carregadores; validador (`carriedBy` com carregador vivo); silêncio alemão 06:10–06:11; captura às 06:12 do tabuleiro.
- **Risco**: baixo. Sem close e sem humilhação (§72): tudo a ≥700 m.

### BX-10 — Guarnição da ckm wz.30

- **Engine**: `ckm_crew_0..2` dentro de `casemates_west` junto à seteira (25, −3, 43); `display` em rajadas de 6–10 com traçante sobre a cabeça de ponte leste entre 04:46 e 06:00, pausas 15–60 s; às 06:12 (`evacuating_bridgehead`) saem com a arma pelas mesmas etapas do pelotão até junto da estação, de modo a estarem a x<−90 antes das 06:45 (a prontidão da demolição oeste exige-o; é o risco principal e tem teste); passam pelo posto de disparo (SCRIPT Cena 9).
- **Apresentação/ambiente**: clarão como brilho na seteira; som próximo e abafado quando o jogador está fora (fonte interior → filtro), estampido cheio só se ele estiver dentro (interior ainda não acessível; tratar como áudio).
- **Gameplay**: nenhum (nunca suprime nem fere; Kowal continua o único aliado que suprime, por contrato).
- **Verificação**: `node tools/verify-m01-route.mjs` continua a chegar ao debrief com a guarnição fora de `bz_west` antes das 06:45; nenhuma `display` aterra; captura às 04:50 do posto avançado (brilho na seteira).
- **Risco**: médio (gate oeste). Mitigação: etapas com limiares que não prendem, como no pelotão (`continuous/README.md` #5).

### BX-11 — Vida da secção antes e depois

- **Engine (pequeno)**: valores novos de `task` por fase (`clean_weapon`, `coffee`, `map`, `patrol`, `guard_change`, `watch_bridge`), atribuídos e limpos por eventos (`prelude_start`, `planes_heard`, `west_demolition`); dois sapadores em ronda na encosta sul 04:30–04:33; Pawlak até ao portal rodoviário e volta (rendição de guarda); Lipski `watch_bridge` depois das 06:45; validador alarga a lista de `task`.
- **Apresentação**: poses por tarefa (ajoelhado com a arma nos joelhos, mãos no mapa com brilho de lanterna tapada, caneca); nada de estátuas (§37).
- **Gameplay**: nenhum; tarefas não impedem as ordens dos eventos.
- **Verificação**: tarefas definidas/limpas nos eventos; validador; captura da intro.
- **Risco**: baixo.

### BX-12 — Destruição ambiental persistente

- **Apresentação** (só de dados existentes): chamas e brasas no vagão do pátio a partir de `destruction: station_wagon_fire`; parede enegrecida e vidros partidos na estação depois de `station_bomb`; disco e bordo de cratera em `repair_site_1` ligados ao nó `cv_crater_1`; sacos rebentados no posto avançado quando `forward_post_state==='destroyed'`; detritos a cair no rio a 700–800 m 4 s depois da explosão leste; chuva de terra sobre o posto de disparo 6–10 s depois de o som da demolição oeste chegar; poeira em suspensão (névoa próxima mais densa e quente) até às 07:05.
- **Gameplay**: nenhum (nenhuma colisão nova; a cratera é cobertura autoritativa já existente).
- **Verificação**: continuações às 04:37 (pátio) e 06:46 (posto de disparo) com capturas.
- **Risco**: baixo.

### BX-13 — Vento, névoa e céu

- **Dados/apresentação**: `map-layout.json → weather.wind` (um vector; proposta artística: sudoeste 2–3 m/s, para o fumo derivar para nordeste sobre o rio e não tapar a vista do jogador; o tempo de 1/9/1939 na região foi seco e quente, direcção do vento não documentada); todas as colunas, puffs, vapor, fumo da boca e a deriva das nuvens lêem-no; névoa baixa sobre o rio 04:30–05:00 a desaparecer com o nascer do sol (dramatização declarada em `HISTORICAL_RESEARCH.md §6.2`); tinta de névoa a oeste com o fumo da cidade (BX-06).
- **Gameplay**: nenhum.
- **Verificação**: a atmosfera lê o vento dos dados (teste simples); inspecção visual.
- **Risco**: baixo.

### BX-14 — Orçamento, degradação e provas

- **Apresentação/testes**: tectos por preset para impostores (128/96/64), one-shots ambiente por minuto, vozes de síntese por bus, puffs (já existe); ordem de degradação da regra 8; `tools/capture-m01-visual.mjs --horizon-only` para as continuações da secção 5; `RUNBOOK.md` com a verificação auditiva manual; `DEVELOPMENT_STATUS.md` com "FPS: NÃO MEDIDO" até ao Chromebook.
- **Verificação**: mesma simulação em preset baixo e alto depois de 60 s com o ambiente a correr (snapshots iguais); contadores no diagnóstico.
- **Risco**: baixo.

---

## 7. Riscos transversais e decisões em aberto

- **Validador estrito do schema 2.** Novos actores e agendas exigem alargar `validateM01Snapshot` e migrar saves antigos por omissão, como já foi feito para `enemyFire` e `kowalRounds`. Nunca aceitar um save com actores a mais ou a menos sem migração explícita.
- **Capacidade dos lotes de actores** (`createActors`: 90 torsos/cabeças/capacetes). Com BX-08 e BX-10 o elenco passa de 82 para ~94: subir para 110, ou enviar os distantes para impostores (BX-02) antes de somar.
- **Desempenho**: tudo aqui soma instâncias, osciladores e puffs. Medir no Chromebook antes de aprovar; os presets degradam primeiro o que não muda a leitura do combate (§75).
- **História**: sem artilharia na margem oeste (P6); horas de S4 antes das 07:00 são dramatização (P9); sem som de Westerplatte; sem holofotes; vento, névoa, carroças, extras e luz do trem são dramatização declarada; o Panzerzug só dispara para leste até P6; não contar aviões na tela (04:34 e 05:30).
- **Lanes de trabalho** (`AGENTS.md`): as tarefas marcadas **engine** tocam `src/game/*`, validador e saves e pertencem ao Codex; as de **apresentação** podem avançar em ficheiros novos (`m01-ambient.js`, `audio-mix.js`) com conflito mínimo; os **dados** (`battlefield-ambience.json`, `raidTargets`, `holdPositions`, `weather.wind`) podem ser preparados primeiro, à parte.
- **O que esta proposta não resolve**: humanos, rigs e vozes finais (marco 3), o Ju 87 verificável (terceiro agente), a composição do colapso vista de dentro da treliça (pendência conhecida), o playtest humano e a medição no Chromebook. Nenhuma tarefa `BX-*` aprova M01 como VALIDADA.
