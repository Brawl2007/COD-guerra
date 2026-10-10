# M01 · Batalha visível V1 — desenho (T23 visível, fim de T17, T25, T21 visual)

Branch: `claude/m01-battle-visible-v1` (base `3901210`). Desenho do Captain/System design, 2026-10-10. **Nada implementado.**
Queixa do playtest 1: "só vejo 10–13 polacos, os alemães são quase invisíveis, o bombardeio só aconteceu uma vez".

## 0. Estado verificado no HEAD (leitura estática, sem testes executados)

| Ponto | Verificado | Onde |
|---|---|---|
| Laço dos Ju 87 | **Não existe.** `grep -rn "time%" src/` vazio; não há `JU87_LOOP`. O mergulho das 04:34 está feito (D15): caminho puro de `consumed[evt_m01_bombing_0434]`, bombas visíveis. | `src/world/m01-aircraft-path.js`, `src/render/m01-aircraft.js`, `m01-view.js:581-603` |
| 04:40 `evt_m01_second_air_pass` | Só emite `distant-shot` em (−550, 20, 60) → `audio.distantBattle('rifle')`. Nada visível; e `renderState.stukas` passa a `false` neste instante. | `m01-simulation.js:222`, `:892`; `game.js:201` |
| Avião do raid 05:30 | Quatro caixas (`raidPlane`), passagem única a 1100 m, ancorada em `damage.raid_0530.started`. | `m01-view.js:549-552`, `:596-598` |
| Raid 05:30 | Um único `impact('raid_0530',{x:-600,y:0,z:100})`; fumo some aos 240 s. | `m01-simulation.js:229`, `:894` |
| Fogo `kind:'east'` | Atiradores do dique (14–39) e metade dos dos portões disparam para `eastBridgeheadPoint` (x 995–1040, faixas z −3…3 e 37,5…42,5). `tracer:false`; `landRound` sai cedo → sem `round-impact`, sem impacto visível. Clarão de boca e som (`enemy-fire`) existem. | `:473-499`, `:521`, `:573` |
| Pelotão leste polaco | 24 `pl_east_*` com `active:false` até 06:00 → não há impostores nem corpos (`impostorPosture` exige `active`). Os alemães disparam sobre pontos vazios. | `:90-91`, `:232-235`; `m01-impostors.js:60` |
| Panzerzug | Só arte (`PANZERZUG_PLACEMENT` x 1119, z 2,5) e fala; nenhum disparo. | `m01-panzerzug.js:4`, `:224` |
| Salva de ajuste (`hold_access`) | **Já existe na simulação**: após 42 s de exposição, rajada MG `kind:'cover'` de 7 tiros com traçante, ou até 4 tiros de atiradores com linha de vista; grava `timers.coverFire`. Os atiradores do dique (atrás das treliças) nunca entram (LOS). | `:696-713` |
| Prova A/B | Golden por tick: `tests/fixtures/m01-anim-gameplay-baseline.json` (hash de `snapshot(false)`+checkpoint+**eventos**, 2 rotas) em `tests/m01-animation-contract.test.js`; futuros A/B com restauro em `tests/m01-schema2-determinism.test.js`. **Não existe teste de 12 sementes no repositório** (só a referência `round3/cover-comparison.json` em `m01-cover-threat.test.js:53`). | `tests/helpers/m01-animation-contract.js`, `tests/helpers/m01-anim-baseline.mjs` |

Consequência: qualquer campo novo no save ou evento novo muda o golden. Por isso só **BV-3** toca na simulação e traz o seu próprio filtro A/B.

## 1. Decisão por tarefa

| Pacote | Tarefa | Natureza | Toca `src/game`/`src/world`/`src/core`/`missions`? |
|---|---|---|---|
| BV-1 | T23 visível: pelotão em posição, troca de fogo, Panzerzug, salva de ajuste legível | **Apresentação pura** | Não (`git diff --exit-code`) |
| BV-2 | Fim de T17: passagem distante das 04:40; Do 17 em vez de caixas | **Apresentação pura** | Não |
| BV-3 | T25: raid 05:30 com 7 impactos visíveis e audíveis (+ opcional 04:40 com 3 explosões distantes) | **Dados de simulação** | Sim: `m01-simulation.js`, novo `m01-air-raid.js`, `mission.json`, 1 linha de `game.js` |
| BV-4 | T21 só visual: fumo acumulado, fogos distantes, colunas de poeira, clarões a norte | **Apresentação pura** | Não |

Regras comuns a BV-1/2/4: módulo de modelo puro sem THREE (testável em Node) + classe fina; tudo é função de `sim.clock`, `battleClock`, `consumed`, `flags`, `timers`, ids de actores e dados de missão; ruído só por `visualNoise(seed,i)` (`m01-atmosphere.js:7`) com seed = hash do id/tempo; nenhum `Math.random`/`Date.now`/`performance.now`; nenhuma escrita em `sim` (entradas congeladas nos testes); pausa = mesmo frame; restauro = mesmo frame. Tiros de exibição **nunca** chamam `roundFeedback`, `directionalHit`, `crack`, `surfaceDamage` nem criam decalques: só clarão, traçante e pó. Não decidem dano, visibilidade de jogo (LOS), eventos ou estado da missão.

Não tocar em nenhuma tarefa: `src/core/audio*`, `assets/audio`, `m01-characters.js`, `m01-animation-*.js`, `safeImpact`, instantes das bombas de 04:34, cadências reais (`eastFire`/`spansFire`/`kowalFire`/salva `cover`), dano ao jogador (H10).

## 2. Tectos de desempenho (Intel HD 5500, 1366×768)

Os pools existentes não crescem; o que é real desenha primeiro e a exibição usa o que sobra, até ao seu tecto.

| Recurso | low | medium | high | Pool partilhado (capacidade actual) |
|---|---|---|---|---|
| Traçantes de exibição em voo | 6 | 12 | 20 | `tracer` 48 |
| Clarões de boca de exibição | 8 | 16 | 24 | `muzzle` 96 |
| Pó de impacto de exibição (puffs) | 12 | 24 | 40 | `puff` 144 |
| Figuras substitutas (pelotão) | 24 | 24 | 24 | impostores `pl` 64/96/128 |
| Ambiente: billboards (1 batch próprio) | 48 | 80 | 120 | novo, 1 draw call |
| Ambiente: colunas persistentes distantes | 4 | 6 | 8 | dentro do batch acima |
| Ambiente: clarões no horizonte simultâneos | 2 | 3 | 4 | dentro do batch acima |
| Puffs por coluna de raid em `M01Atmosphere` | 6 | 9 | 12 | `max` 112/192/256 |
| Bombardeiros Do 17 | 3 inst. | 3 | 3 | 1 `InstancedMesh`, sem sombra |

Draw calls novos: no máximo +2 (batch ambiente, Do 17). Nada novo com `castShadow`. Não inventar FPS: medir só contagens (diagnósticos) e, se pedido, `perf-auditor`.

## 3. BV-1 · T23 frente leste visível (apresentação pura) — PRIMEIRO

**Muda:** a cabeça de ponte leste passa a ter 24→18 figuras polacas (impostores) de 04:45 às 06:00; os tiros `east` já existentes ganham traçante (1 em 3) e pó de impacto onde aterram; os polacos e o Panzerzug respondem com fogo de exibição; a salva de ajuste ganha 4 traçantes de exibição do dique sobre a cobertura ocupada.
**Não muda:** `enemyFire.rounds`, `landRound` (east continua sem impacto autoritativo), alvos/cadências, supressão, baixas, flags `m01.east_platoon_survivors`, LOS, hitboxes, save, áudio.

### Ficheiros
- **Novo `src/render/m01-east-front.js`** (modelo puro, sem THREE):
  - `EAST_FRONT_CAPS` (tabela §2) e `STANDIN_SLOTS`: 24 entradas `{id:'pl_east_standin_N', x, y, z, posture, fallsAt}`; 16 na faixa da ponte rodoviária (x 998–1038, z 37,5–42,5), 8 na ferroviária (z −3…3), as mesmas faixas que `eastBridgeheadPoint` visa; slots 0–1 = ckm (prone). `fallsAt` (hora de batalha) só para os slots 18–23, espalhados 05:00–05:55: desgaste 24→18 coerente com o estado que a simulação já impõe às 06:00 (ids ≥18 mortos).
  - `eastFrontWindow(consumed)` → `{from: consumed.evt_m01_train963_arrives, to: consumed.evt_m01_east_platoon_withdraws ?? Infinity}` (relógio da missão).
  - `eastStandIns({clock,battleClock,consumed})` → `[{id,x,y,z,posture}]`; vazio fora da janela; slot caído: `prone` 20 s depois de `fallsAt`, depois omitido.
  - `scheduledShots(shooter,{period,jitter,burst},from,to)` → instantes `t = φ + n·P + (visualNoise(h,n)−.5)·jitter·P`, φ = `visualNoise(h,0)·P`, h = hash(id); só os `n` que caem em `[clock−1,2, clock]`. Sem memória.
  - `eastFrontDisplay({clock,battleClock,consumed,flags,quality})` → `{shots:[{id,side:'pl'|'pz',from,to,firedAt,arriveAt,tracer}], muzzles:[...], impacts:[{x,y,z,start,material:'earth',seed}]}`:
    - polacos: espingarda P 7–11 s; ckm rajada de 5 a 0,1 s, P 9–14 s, traçante no 3.º tiro; alvo = ponto das `grp_de_east.firePositions` (linha dos portões e do dique, lido de `mission.json` em modo só leitura) ± 2 m por `visualNoise`;
    - Panzerzug (`consumed.evt_m01_panzerzug_arrives` ≤ clock < `consumed.evt_m01_east_demolition`): 2 bocas de MG em `PANZERZUG_PLACEMENT` + (−4/+30 m em x, y 3 m), rajadas de 6, P 6–10 s, traçante 1 em 3, alvo = substituto vivo ± 3 m. **Só contra a cabeça de ponte leste.**
    - corte pelos tectos de §2 por ordem de `firedAt` decrescente.
  - `eastRoundPresentation(round)` → `{tracer: hash(round.id)%3===0, impact:{x:ax,y:ay,z:az}}` para `kind==='east'` (traçante só de apresentação).
  - `rangingBracket({clock, coverFire, coverNode, player})` → 4 tiros de exibição aos `coverFire.at + .5/1.2/2.0/2.9 s`, origem em pontos de `fp_m01_riflemen_dike` (escolhidos por `visualNoise(hash(coverFire.by), coverFire.at)`), voo com `roundPoint`/`ARC_K`/`ROUND_SPEED` (`src/game/m01-fire.js`, só import): 1.º 8 m curto (leste) no chão, 2.º 1,8 m por cima da cobertura a cair 25 m atrás, 3.º e 4.º na face leste da cobertura. Material por id: `/truss|tower|portal/`→`metal`, senão `earth`. Invariante: nenhum ponto do arco a menos de 1,0 m do olho do jogador. `coverNode` = `sim.world.coverNodes.find(c=>c.id===sim.timers.occupiedCover)`; sem nó → nada.
- **`src/render/m01-impostors.js`**: `select(actors,skinned,player,quality,time,extras=[])`; `extras` = substitutos (nação `pl`, postura dada), entram na mesma ordenação/capacidade. Nunca abaixo de `HANDOFF_M` (o jogador não passa de x 440, os substitutos estão a > 550 m).
- **`src/render/m01-view.js`**: em `updateFire`, depois do desenho real: (1) rondas `east` com `tracer` de apresentação; (2) memo `this.eastRoundMemo` (Map id→impacto, poda a `arriveAt+1,2 s`, limpo em `resetEffects`) para pó quando a ronda sai da lista; (3) `eastFrontDisplay` e `rangingBracket` nos pools `muzzle`/`tracer`/`puff` com os tectos; tamanho mínimo do pó = 4 px (`metresPerPixel` de `m01-impostors.js`). Diagnóstico `eastFront:{standIns, displayTracers:{pl,de,pz}, displayMuzzles, displayImpacts, ranging}`.

### Testes
- **Novo `tests/m01-east-front.test.js`**: (a) substitutos: 0 antes de 04:45, 24 às 04:50, 18 às 05:57, 0 depois de `east_platoon_withdraws`; (b) determinismo: mesma entrada → `deepEqual`, também para `clock` repetido (pausa) e para entradas reconstruídas de `restoreSnapshot` a meio; (c) tectos por qualidade nunca excedidos num varrimento 04:45–06:00 a 1/30 s; (d) ambos os lados (`pl`, `pz`, e `east` reais) com traçantes num minuto qualquer entre 04:53 e 05:59; (e) `rangingBracket`: 4 tiros, distância mínima ao olho ≥ 1,0 m em 200 posições de cobertura da rotação; (f) não-escrita: `snapshot()` antes/depois de 600 chamadas com `sim` real é `deepEqual`; (g) grep do módulo sem `Math.random|Date.now|performance.now`; (h) nenhum tiro de exibição em `sim.enemyFire.rounds`.
- `tests/m01-impostors.test.js`: `extras` respeitam capacidade e nação.
- **Novo spec `tests/browser/m01-east-front-visible.spec.js`** (padrão de `m01-stuka-dive.spec.js`: snapshot do `driver()` real injectado em `cod-guerra:checkpoint:m01:v2`, só o olhar rodado para leste): continuações às 04:47 e 05:20 → `fireEffects.tracer>0`, `eastFront.displayTracers.pl>0` e `de>0` (05:20 também `pz>0`), `impostors` com ≥18 `pl`; pausa: dois frames iguais; `?quality=low` respeita tectos; continuação logo após `timers.coverFire` (via `toCoverAdjustment` de `tests/helpers/m01-route.js`) com `eastFront.ranging>0`. Recorte 4× anexado à verificação.
- Inalterados e a correr: `tests/m01-cover-threat.test.js`, `m01-animation-contract.test.js`, `m01-schema2-determinism.test.js`, `tests/browser/m01-distant-front-impostors.spec.js`.

## 4. BV-2 · Fim de T17 (apresentação pura)

**Muda:** às 04:40 três Ju 87 fazem uma passagem distante sobre a cidade (2–3 km, sem avião sobre o jogador, como diz o evento) e picam uma vez ao longe; às 05:30 a passagem alta é uma Kette de 3 Do 17 com silhueta reconhecível.
**Não muda:** o mergulho das 04:34, bombas, `m01-aircraft-path.js` (src/world), `renderState.stukas`, eventos, áudio (o motor dos Ju 87 vive em `src/core` e segue `renderState.stukas`: a passagem das 04:40 fica sem motor próprio; ouve-se o `distant-shot` existente e, com BV-3b, as explosões).

- **`src/render/m01-aircraft.js`**: `JU87_SECOND_PASS` (polilinha autorada a x −1500…−2600, y 900→450→900, de sul para norte, 3 aviões com 3,5 s de fila, duração ~40 s); `ju87SecondPassSince(clock,consumed)` = `clock − consumed.evt_m01_second_air_pass`; `ju87SecondPassPosition(since,i)`, `ju87SecondPassActive(since,i)` (nunca repete, esconde-se no fim); atitude pela tangente com `ju87Attitude` generalizado para receber a função de amostragem. Se BV-3b existir, o fundo de cada picada fica 1,5 s antes de `air_0440_k` (teste compara).
- **Novo `src/render/m01-raid-bombers.js`**: `do17Geometry()` (fuselagem fina, asa alta ~18 m, 2 naceles, deriva dupla, BufferGeometry fundida), `DO17_KETTE=[{dx:0,dy:0,dz:0},{dx:-28,dy:8,dz:35},{dx:28,dy:-6,dz:35}]`, `raidBomberPositions(since)` a partir de `m01RaidPlanePosition` (import só de leitura); RLM 70/65, `fog:true`, `castShadow:false`; 1 `InstancedMesh`. Certeza: tipo DOCUMENTED (H01-PDF nota 76), número RECONSTRUCTED (comentário no código).
- **`src/render/m01-view.js`**: remover as caixas `raidPlane`; `updateAircraft` usa os `planes` existentes para a 2.ª passagem quando `renderState.stukas` é falso e `ju87SecondPassActive`; `aircraftPath.phase` ganha `'second-pass'`; diagnóstico `raid:{bombers, model:'do17-procedural', positions}`.
- **Testes**: estender `tests/m01-aircraft.test.js` (posições em instantes conhecidos; nunca activo antes do evento nem depois do fim; distância mínima ao jogador ≥ 1500 m em toda a passagem para qualquer posição jogável; Kette alinhada com `m01RaidPlanePosition`); estender `tests/browser/m01-stuka-dive.spec.js` com continuações 04:40+10 s (`phase==='second-pass'`, 3 visíveis, posições = modelo puro) e `raid_0530.started`+12 s (`raid.bombers===3`, sem caixas).

## 5. BV-3 · T25 raid agendado (dados de simulação)

**Muda:** o raid das 05:30 passa a 1 + 6 = 7 impactos (o `raid_0530` actual + `raid_0530_1…6`), cada um com `m01-blast` (som e clarão pelo caminho existente `game.js:224-232`), entrada em `sectors.damage` (restaura, sem duplicar) e fumo persistente. Opcional BV-3b: 3 explosões distantes `air_0440_1…3` às 04:40 (estação/quartel, 1,1–1,5 km).
**Não muda:** `raid_0530` (ponto, instante), `safeImpact`, CP-C, `m01.second_raid_state`, RNG, dano, área jogável, `schema:2`, validador (já aceita qualquer `id` string em `sectors.damage`, `:1023`).

### Dados (`missions/m01-tczew/mission.json`)
Em `evt_m01_bombing_0530`: `"airImpacts":[{"id":"raid_0530_1","after":12.0,"at":[-690,450]}, {"id":"raid_0530_2","after":13.4,"at":[-735,290]}, {"id":"raid_0530_3","after":14.6,"at":[-665,150]}, {"id":"raid_0530_4","after":16.3,"at":[-720,-45]}, {"id":"raid_0530_5","after":17.5,"at":[-680,-185]}, {"id":"raid_0530_6","after":19.2,"at":[-750,-380]}]` (`after` = s de relógio da missão desde `consumed[evento]`; z ≈ trajecto do Do 17 `1800−115·after+30`; x ≤ −560, i.e. ≥100 m fora de `bounds.playable.minX` −460). BV-3b: o mesmo campo em `evt_m01_second_air_pass` com ids `air_0440_1..3`, `after` 6/9/12, pontos x −1100…−1400, z −300…200. `certainty`: RECONSTRUCTED na nota do evento.

### Código
- **Novo `src/game/m01-air-raid.js`** (puro, sem RNG):
  `export const AIR_IMPACT_LATE_S=1.0;`
  `export function airImpactSchedule(definition)` → `[{event,id,after,x,z}]` congelado;
  `export function isScheduledAirImpact(id)` → booleano (ids do agendamento);
  `export function dueAirImpacts({schedule,consumed,clock,recorded})` → entradas com `consumed[event]` finito, `clock ≥ consumed[event]+after`, `clock < consumed[event]+after+AIR_IMPACT_LATE_S` e `!recorded.has(id)`.
- **`src/game/m01-simulation.js`**:
  - `tick`: logo depois de `this.processEvents()` (`:687`) chamar `this.updateAirImpacts()`: saída imediata se nenhum evento do agendamento está consumido ou se `clock` passou o último `at+LATE`; senão `recorded=new Set(sectors.damage.map(d=>d.id))` e, por ordem do agendamento, `this.impact(e.id,{x:e.x,y:this.world.heightAt(e.x,e.z),z:e.z},true,{tag:true})`.
  - `impact(id,point,aerial,{tag=false}={})`: só com `tag` o evento leva `id` (os eventos existentes ficam byte a byte iguais).
  - `renderState.damage[].smokeVisible`: `||d.id==='raid_0530'||isScheduledAirImpact(d.id)` (persistente; `renderState` não é salvo).
- **`src/game/game.js:12`**: `aerial=AERIAL_BLAST_IDS.has(id)||isScheduledAirImpact(id)` em `rebuildSounds` (sem isto, um restauro a meio dá vibração a <1000 m em vez de <500 m). Sem tocar em áudio.
- **`src/render/m01-atmosphere.js`**: colunas de `raid_*`/`air_0440_*` usam `puffs = {low:6,medium:9,high:12}` em vez de `22·density`, para 7 colunas persistentes não expulsarem `station_bomb` nem as demolições.

### Por que o A/B fica idêntico
1. Zero sorteios: `dueAirImpacts`, `heightAt`, `safeImpact` e `impact` não chamam `this.rng`; `rng.state` igual em cada tick.
2. Nada lê `sectors.damage` para gameplay excepto `demolitionStatus` (só ids `*_demolition`, `:827`) → nenhum estado existente muda.
3. Restauro: a única memória é `sectors.damage` (já salvo). Restauro a meio → ids presentes não repetem; futuros saem no mesmo tick. Save antigo a meio do raid (sem `raid_0530_k`): entradas atrasadas mais de 1 s são saltadas para sempre (não há rajada de 6 explosões no mesmo tick); as futuras saem normalmente. Save novo lido por código antigo: válido (id string).
4. Golden: `tests/helpers/m01-animation-contract.js` passa a remover, de `state`, `checkpoint`, `resumeCheckpoint` e `events`, só as entradas `sectors.damage`/`m01-blast` com `isScheduledAirImpact(id)`. `tests/fixtures/m01-anim-gameplay-baseline.json` **fica igual** (`git diff --exit-code tests/fixtures`). Teste de guarda: aplicar o filtro às frames da base aprovada é identidade.
5. **12 sementes**: novo `tests/helpers/m01-ab-seeds.mjs` (fora de `npm test`, modelo de `m01-anim-baseline.mjs`): escreve `git show <base>:src/game/m01-simulation.js` em `src/game/.m01-ab-base.js`, conduz `route(seed,{Simulation:Base})` e alimenta o candidato com os mesmos controlos para as sementes `[19390901,7,1,2,3,4,5,11,42,99,123,2024]` (19390901 e 7 também com `support:true`); compara por tick a frame filtrada e `rng.state`; regista primeira divergência, nº de impactos agendados emitidos (=6 por rota) e relatório em `docs/verification/m01-runtime/m01-battle-visible-v1/ab-seeds.json`. Se alguma rota não terminar na base, compara até ao fim da base e regista-o.

### Testes
- **Novo `tests/m01-air-raid.test.js`**: dados (6 ids únicos com prefixo, `after` crescente em (0, 28], x ≤ −560, alinhamento ±60 m com `M01_RAID_PASS`, `heightAt` finito, `safeImpact` não desloca); rota 19390901 → antes de `second_raid_state==='ended'` existem exactamente 7 `raid_0530*`, `started` = `consumed+after` (± 0,05 s), um `m01-blast` com `id` por entrada; restauro em cada tick da janela com `compareContinuation` (sem duplicados, futuro igual); save "legado" a meio (entradas apagadas) → no máximo 1 emissão por tick e nenhuma atrasada > 1 s; controlo in-tree: rota com `updateAirImpacts` substituído por no-op dá `rng.state` e frame filtrada iguais; `renderState` com fumo visível a `started+600`.
- `tests/m01-schema2-determinism.test.js`: forks `air-raid-mid` e `air-raid-done` na rota completa e na lista `seen`.
- `tests/m01-tczew-data.test.js`: validar `airImpacts`.
- Spec: estender `tests/browser/m01-stuka-dive.spec.js` (ou o de BV-1) com continuação às 05:36: ≥4 colunas com x < −560 no diagnóstico da atmosfera.
- Revisão: **`reviewer-critical` (Opus)** obrigatória (simulação + saves).

## 6. BV-4 · T21 só visual (apresentação pura, prioridade baixa)

**Muda:** guerra à volta: fumo que se acumula ao longo da manhã (folhas de névoa de baixa opacidade sobre a cidade e a margem leste), fogos distantes persistentes (brilho + coluna) depois de 04:34 e do raid, clarões de morteiro a norte depois de `evt_m01_north_contact_distant` (05:50) e em Kozliny depois de `evt_m01_kozliny_attack_distant`, colunas de poeira periódicas na cabeça de ponte leste enquanto BV-1 está activo.
**Não muda:** simulação, nevoeiro/luz (T16/T44), áudio (camas sonoras de T21 ficam para T06), `battleReadout` (T22) — o director lê só `consumed`, `battleClock`, `renderState.damage`.

- **Novo `src/render/m01-ambient.js`**: `AMBIENT_CAPS` (§2); `ambientModel({clock,battleClock,consumed,damage,quality})` → `{columns:[...], sheets:[...], flashes:[...], dust:[...]}` puro (fase de cada elemento por `visualNoise`; clarões por baldes de 2,5 s); classe `M01AmbientDirector` com 1 batch `atmosphere.billboardBatch(capacity)`; diagnóstico `ambient:{columns,sheets,flashes,puffs}`. Classificação no código: GAMEPLAY_DRAMATIZATION.
- `m01-view.js`: uma chamada por frame e o diagnóstico.
- Testes: `tests/m01-ambient.test.js` (determinismo, pausa, tectos, não-escrita com `deepEqual` do snapshot, grep sem `Math.random`); spec: continuação às 05:52 com `ambient.flashes>0` (no spec de BV-1).

## 7. Ordem de trabalho e verificação

1. **BV-1** (maior parte da queixa) → 2. **BV-2** → 3. **BV-3** (+3b opcional) → 4. **BV-4**. BV-1/2/4 partilham `m01-view.js`: sequenciais, um implementer de cada vez.
2. Por pacote: `npm test`, `npm run build`, spec focado com `--workers=1 --retries=0`; para BV-1/2/4 `git diff --exit-code <base> -- src/game src/world src/core missions`; para BV-3 o helper das 12 sementes + golden inalterado.
3. Evidência em `docs/verification/m01-runtime/m01-battle-visible-v1/` e estado em `docs/direction/M01_TASK_STATUS.md` (T17 fecha, T23 PARCIAL "visível; desgaste/Panzerzug na simulação por fazer", T25 DONE*, T21 PARCIAL "visual").

## 8. Incertezas

- A presença visível depende de linha de vista: a T20 mediu 54/66 figuras tapadas pelas pontes (D24); os substitutos e os traçantes podem continuar pouco legíveis de certos pontos. Só um playtest confirma.
- Fogo do pelotão e do Panzerzug fica mudo (só a camada distante de áudio existente); som próprio exige `src/core` (T06).
- O desgaste 24→18 é de apresentação; a versão autoritativa do roadmap (baixas na simulação, `grp_panzerzug`, `holdPositions`) muda o estado de jogo e exige novo golden aprovado — fora desta sessão.
- `raid_0530` continua a y 0 sobre terreno −3 (T03); não mexer aqui para não mudar o golden.
- Não verificado que a rota completa termina nas 12 sementes; o helper regista-o.
