# Bombas da incursão das 04:34: efeitos nos homens, atordoamento do jogador e incursão alargada — 2026-10-23 (R1-a)

Ordem do Capitão (pacote R1-a) a partir da queixa do playtest humano do proprietário: «os soldados junto dos bombardeamentos sobrevivem sem consequências; os bombardeamentos são só efeitos visuais; a guerra devia sentir-se desde as 04:34».

Ramo local `claude/exciting-bohr-k8v5xm-r1a`, de `e7f5f28` (candidata #80 + um documento). **Não publicada**, sem revisão crítica independente, **sem playtest humano** (nada disto foi jogado; os números são de rotas de teste da simulação, não de FPS nem de sensação). As baixas que a simulação cria são **GAMEPLAY_DRAMATIZATION**: nenhuma fonte dá perdas polacas neste raide, e nada disto aparece em ecrã como número nem como facto.

## O que a simulação fazia antes (verificado antes de mexer)

- `impact(id, point, aerial)` só empurrava uma cratera para `sectors.damage` e emitia `m01-blast`. Os três impactos das 04:34 (estação, posto avançado, cabo/Nowicki) eram os únicos na área jogável; o raide das 05:30 cai todo fora dela (`raidTargets`, `mission.json:814`: «nenhum impacto no reparo ou no jogador», que continua verdadeiro para essas seis).
- Na rota de controlo, à hora da bomba do cabo (04:34:17) os três sapadores estavam a **1,6 m, 4,0 m e 6,7 m** da cratera (Nowicki a 1 m, sai de cena por guião), a secção a 34–41 m; a bomba da estação caía a 51–80 m do pátio. **Não há nenhum soldado sem nome na margem oeste entre as 04:34 e as 04:45**: os alemães e o pelotão leste estão inactivos a x > 1000 até ao comboio 963. Quem está ao alcance das bombas é o elenco (que o enredo exige vivo) e os seis extras do pátio da estação.

## O que mudou no jogo

### 1. Efeito de uma bomba nos homens (`src/game/m01-blast.js`, puro; aplicado por `M01Simulation.bombEffects`)

Valores **de jogo, não balística**, afinados para uma bomba de ~250 kg de um Ju 87 B (`missions/m01-tczew/HISTORICAL_RESEARCH.md`: o ataque às 04:34 bombardeou a estação, a margem oeste junto às pontes e o quartel do batalhão). Para cada homem vivo, presente e não transportado, a distância ao tronco, a linha de visão do centro da explosão ao tronco, a postura e uma variação de ±12 % por par (homem, impacto) (hash FNV-1a dos ids, **sem sorteio**) dão a distância efectiva:

| Distância efectiva (m) | Resultado |
|---|---|
| ≤ 12 | morto (`DOWN`, o corpo fica; `recordDamage` regista `hitAt`/`diedAt`) |
| ≤ 24 | ferido: `WOUNDED` (pose de ferido que já existia) se é nosso, `HIT_REACTION` se é alemão; a vida desce 80 → 45 conforme a distância e nunca chega a 0 |
| ≤ 50 | abalado: `suppressedUntil` +7 s no núcleo, +2 s na orla (a supressão que já existe: os sapadores param e deitam-se, os aliados são desenhados «pinned», um alemão vai para a cobertura) |
| > 50 | nada |

Sem linha de visão do centro da explosão ao tronco (aterro, parede, linha de sacos de areia: a mesma `world.lineOfSight` do jogo) a distância efectiva multiplica por **1,8**; agachado por 1,25; deitado por 1,6 (e um ferido conta como deitado). Alcance máximo 57 m (`BOMB_REACH_M`).

**Nunca mortos nem feridos, só abalados (7 s no núcleo):** todo o elenco, derivado dos dados (`definition.cast`: Zieliński, Krawiec, Nowicki, Kowal, Bąk, Dudek, Pawlak, Lipski, sapper_2, sapper_3, east_platoon_voice, generic_rifleman, ckm_gunner/loader/reserve), o pelotão leste inteiro (`grp_east_platoon`: os sobreviventes contam-se por id), a guarnição da ckm, os dois MG34 do dique, quem é transportado e o cenário de layout procedural do pátio (o doente da maca e a carriola). **Podem ser baixas:** os extras do pátio da estação (os dois ferroviários com lanterna, o ordenança e o auxiliar de socorro) e, em geral, qualquer alemão.

### 2. A incursão das 04:34 sente-se na área jogável

`mission.json → raidTargets0434` (+ nota): **onze impactos aéreos** além dos três do evento, das 04:34:46 às 04:43:10 (o ataque durou cerca de dez minutos: 04:34–04:44, certeza baixa), GAMEPLAY_DRAMATIZATION ao longo da margem oeste. Horas fixas de relógio de batalha, sem sorteio. `timers.raidSchedule0434` (opcional, onze entradas `{id, at, point, emitted}`) é criado por `evt_m01_bombing_0434`, como o `raidSchedule` das 05:30.

| Hora | Impacto | Onde (x, z em m) | Alvo |
|---|---|---|---|
| 04:34:46 | `raid_0434_1` | −44, 50 | acesso rodoviário, junto às pontes |
| 04:35:12 | `raid_0434_2` | −108, 30 | faixa entre os acessos, linha de Bydgoszcz |
| 04:35:30 | `raid_0434_3` | −140, −16 | linha de Gdańsk, a norte do aterro |
| 04:36:35 | `raid_0434_4` | −96, 38 | acesso rodoviário, a sul do posto da secção |
| 04:37:30 | `raid_0434_5` | −150, 46 | acesso rodoviário, a sul do ponto de reunião |
| 04:37:50 | `raid_0434_6` | −178, 6 | aterro ferroviário, linha de ignição (encosta sul) |
| 04:38:10 | `raid_0434_7` | −215, 36 | faixa entre os acessos, linha de Bydgoszcz |
| 04:38:52 | `raid_0434_8` | −338, 14 | pátio da estação, vias do desvio |
| 04:39:08 | `raid_0434_9` | −346, 24 | pátio da estação, fachada sul |
| 04:40:30 | `raid_0434_10` | −245, 46 | acesso rodoviário, perto do abrigo |
| 04:43:10 | `raid_0434_11` | −62, 52 | acesso rodoviário, a sul do posto da secção |

Garantias: cada impacto passa por `safeImpact` (**nunca a menos de 30 m do jogador**); se o jogador está a menos de 30 m do ponto previsto, o impacto cai a 40 m dele no primeiro rumo livre (`earlyRaidPoint`: dentro da área jogável, fora do rio e dos edifícios, a ≥ 20 m dos locais dos objectivos — `repair_site_2`, `rally_point`, `rail_hut`, `firing_point`, `shelter`, `aid_position`, `squad_post`; os pontos previstos validam isto ao carregar o módulo, uma gralha nos dados pára o jogo). As crateras (`sectors.damage`) ficam. Nenhuma cratera muda a colisão, e nenhum impacto cai a menos de 20 m de onde os sapadores trabalham (`repair_site_2`). O último fecha às 04:43:10, antes do comboio 963 (04:45).

### 3. O jogador nunca leva dano de bomba, mas fica atordoado

A menos de 60 m (cobertura ×1,35 e agachar ×1,25 sobre a distância; 1,0 a 30 m, o mais perto que uma bomba pode cair): `player.concussion` (pico 0..1) e `player.concussedUntil` (o fim; duração 2–5 s), ambos opcionais e **apagados quando o atordoamento acaba**. Efeito, só no estado da simulação: velocidade de corrida −45 % × nível (sem corrida acima de 0,6), andar −12 % × nível, e a dispersão da arma × (1 + 2,5 × nível) (os mesmos dois sorteios, o desvio multiplicado: o fluxo aleatório não se move). Dois atordoamentos não somam: vale o mais forte (`mergeConcussion`). Leitura: `sim.concussion` (0..1).

### 4. Áudio

O registo da cratera ganha `concussion` (0..1, só nos impactos aéreos novos) e o evento transitório `m01-blast` ganha `concussion` e `effects {killed, wounded, suppressed}` (ids). `Game` passa a força à `AudioManager.explosion(…, {concussion})`, que a usa **em vez** da regra da distância (`k × 0,9`) para o abafamento («duck» de concussão que já existia): uma bomba atrás do aterro ou com o jogador agachado soa menos abafada. Sem `concussion` (outros impactos, saves antigos) a regra antiga mantém-se à letra. Não há mais nada: sem sistema novo. A única alteração em `src/render/` é a constante `blasts` dos decalques de dano (16 → 24), explicada em «Verificação» (os browsers mostraram que 22 crateras não cabiam nas 16).

### 5. O pátio da estação

Um ferroviário ferido fica onde caiu (`updateYard` já não o move nem lhe repõe o estado). Na rota de controlo o pátio fica com três mortos e um ferido (`yard_railway_0`, `yard_railway_1`, `yard_aid`; `yard_orderly` ferido) das duas bombas das 04:38:52 e 04:39:08, vistas pelo jogador a 80–100 m quando passa no barracão.

## O que fica igual

- Nenhum sorteio do fluxo principal (`this.rng`) nem dos fluxos próprios: os atordoamentos, os efeitos e a agenda são funções de ids, relógio e posições.
- Os objectivos, os checkpoints, as bandeiras e a regra dos sobreviventes (12/18) do enredo; o 04:34 de guião (estação, posto avançado, Nowicki desaparecido, o ferido arrastado às 04:35:30) — nada disso muda.
- Granadas e demolições: o evento e o dano são os que eram (as demolições não aplicam efeitos: mexeriam no enredo).
- Saves antigos (schema 2): um save feito depois do evento das 04:34 e sem `raidSchedule0434` carrega e **não inventa impactos retroactivos**; sem `player.concussion`, sem `concussion` nas crateras, tudo carrega como antes (testado). Um save que traz o estado novo é validado (`validateM01Snapshot`): pico em (0, 1], fim a ≤ 5 s do relógio, agenda e crateras coerentes, nenhum impacto antes da hora; um atordoamento já passado é aceite (o tick seguinte apaga-o). Um checkpoint (CP-B, CP-B2) escrito entre o avanço do relógio e a actualização da agenda, no mesmo tick, é válido: o impacto vencido sai no tick seguinte.

## Medido

`tools/verification/m01-bomb-effects-audit.mjs` (`BOMB_EFFECTS_ROUTES.json`): as duas rotas do golden e 6 sementes × {controlo, apoio} = **15 rotas** do piloto de teste, cada uma com os efeitos das bombas e sem eles (a mesma classe com `updateEarlyRaid()` e `bombEffects()` desligados). A janela até às 04:45 não sorteia nada, por isso as 15 rotas têm **o mesmo** 04:34–04:44 (o piloto é o mesmo): os números de baixas e de distâncias não variam com a semente.

| | Todas as 15 rotas |
|---|---|
| Rotas que completam / enredo igual com e sem bombas (12 objectivos, CP-A..D, eventos, bandeiras, 07:05:00) / sobreviventes iguais (12 no controlo, 18 com apoio) | 15 / 15 / 15 |
| Elenco morto ou ferido por bombas | **0** |
| Jogador ferido por bombas | **0** (vida final 68–100, do fogo alemão posterior) |
| Impactos aéreos na janela 04:33:59–04:44:30 | 14 (3 do evento + 11 da agenda) |
| Impacto mais próximo do jogador | **31,1 m** (≥ 30 m garantido) |
| Atordoamento máximo / tempo atordoado na janela (de ~190 s reais) | 0,96 / 32–35 s |
| Baixas genéricas (extras do pátio) | 3 mortos, 1 ferido; 31 abalados (elenco e extras) |
| Duração da rota com − sem bombas | +18 s em média (desvio 31 s: caos de rota, −27 a +72 s) |

Rota de controlo, impacto a impacto (`impacts` no JSON): 04:35:12 a 31,1 m (0,96), 04:36:35 a 35,5 m (0,81), 04:40:30 a 36,6 m (0,78), 04:37:50 a 38,8 m (0,71); a secção e Dudek ficam abalados em quase todos (6 abalados em dois), os três sapadores no impacto do cabo (04:34:17, a 1,6 m de Krawiec) e as duas bombas do pátio fazem as quatro baixas.

## Golden: emenda 16 (`bomb-effects`)

Gerada por `node tools/verification/m01-integration-golden-audit.mjs --amendment 16 --write` (x86; nunca editada à mão): predecessor `e7f5f28` (a árvore da emenda 15, extraída do repositório com os seus dados e conduzida pelo piloto vivo: reproduz o golden da emenda 15). Ficheiros: `tests/fixtures/m01-bomb-effects-gameplay-baseline.json` (o golden, `sourceSha256` `370b9163…`) e `GOLDEN_AMENDMENT_16.json` (a prova passo a passo, este directório). A emenda 15 passa a história (`after: e7f5f28` na ferramenta). Entradas de jogo que mudaram: `src/game/m01-simulation.js`, `missions/m01-tczew/mission.json`, `src/game/m01-yard-life.js`, `src/game/m01-audio-events.js`, `src/game/m01-blast.js` (novo).

| | Controlo (semente 19390901) | Apoio (semente 7) |
|---|---|---|
| 1.ª diferença | tick 1355, 04:34:00 (67,75 s): `state.timers.raidSchedule0434` (registo novo que o evento cria; não existe no predecessor) | idem |
| Ticks idênticos antes dela | 1354 (2 blocos de 512) | 1354 (2 blocos) |
| 1.ª diferença de comportamento (sem os registos novos: agenda, atordoamento do jogador, `concussion` das crateras, `concussion`/`effects` dos eventos) | tick 1407, 04:34:09: `state.player.x` 14,6396 → 14,6994 (a bomba do posto avançado cai a 44,6 m e atordoa-o; o primeiro passo para oeste é mais curto) | idem |
| Ticks | 23 655 → 23 401 | 23 148 → 23 353 |
| 06:00 (s reais) | 560,5 → 568,65 | 542,7 → 547,85 |
| Fim (s reais) | 1182,75 → 1170,05 | 1157,4 → 1167,65 |
| Sobreviventes / vida do jogador | 12 → 12 / 92 → 76 | 18 → 18 / 100 → 100 |
| Clipping / empilhados | 0 / 0 | 0 / 0 |

Dos 26 eventos da missão, 14 mudam de relógio real em cada rota (a rota anda para um lado e para o outro) e **só um muda de relógio de batalha: `evt_m01_repair_complete`** (18 490,5 → 18 600,3 s no controlo, 18 264,6 → 18 334,35 no apoio, como na emenda 15: depende de quanto os sapadores foram picados); os outros 25 mantêm a hora do enredo. Os mesmos 12 objectivos, CP-A..D, eventos consumidos, bandeiras do enredo e 07:05:00 nas duas rotas do golden e nas quatro rotas de invariantes da prova (sementes 3 e 7, controlo e apoio): sobreviventes 12/12 e 18/18, clipping e empilhados 0. A cadeia: `tests/m01-animation-contract.test.js` fixa `sourceSha256` à simulação viva, os `inputsSha256`, o `deltaFields`, a 1.ª diferença e a de comportamento, e corre as duas rotas tick a tick contra o golden.

## Testes

Novos: `tests/m01-blast.test.js` (13: anéis, monotonia, cobertura, postura, variação por id, alcance, protegidos derivados do elenco, atordoamento, fusão, colocação), `tests/m01-bomb-effects.test.js` (18: vítimas e feridos do pátio, o elenco inteiro só abalado, os sapadores na cratera do cabo, cobertura, postura, alemães, jogador nunca ferido e atordoado, velocidade e pontaria, plano e agenda da incursão, deslocamento seguro, saves antigos, validador, restauro tick a tick com baixas, a janela das 04:34 na rota de controlo, a missão completa, o evento de áudio, o ferroviário ferido), e um teste em `audio-core.test.js` (a força de concussão do evento substitui a regra da distância).

## Testes alterados pela emenda (cada um com causa datada no ficheiro; nenhuma asserção apagada)

| Ficheiro | O que mudou | Causa |
|---|---|---|
| `m01-animation-contract.test.js` | emenda 16 viva (teste novo e rotas tick a tick); a 15 passa a história; a asserção `suppressedAt === -1e9` do save legado passa a ser a regra documentada (derivado de `suppressedUntil > 0`) | o CP-B cai depois das primeiras bombas, que abalam homens |
| `m01-damage-decals.test.js` | a lista de crateras da rota: as 3 do evento, as 11 da agenda e `raid_0530` (15, dentro das 16 que os decalques guardam) | a agenda |
| `m01-ckm-candidate-posts.test.js`, `m01-ckm-fire-arc.test.js`, `m01-ckm-live-fire.test.js` | contagens da janela da rota neutra: amostras 880 → 881 (1203 → 1218 a rota inteira), amostras de inimigos 27 431 → 27 421, S1 254/380 → 252/378, S2 255 → 253, S3 1250 → 1157 | o atordoamento atrasa o piloto uns segundos e a rota segue de outro modo, como após qualquer mudança de tempo |
| `m01-deck-assault.test.js` | «semente 4 com apoio» → «semente 1 com apoio» | na 4 já só caem os quatro da demolição; a regra testada é a mesma (medido nas sementes 4, 19390901, 1, 2, 3, 5) |
| `m01-german-retreat.test.js` | `de_spans_6`/`_7` → `de_spans_8`/`_9` | `de_spans_4` a `_7` caem agora no combate do tabuleiro; retiram e carregam `_8` e `_9` |
| `m01-rearguard.test.js` | semente 7 → semente 5 na soma de cinco | na 7 a corrida SEM retaguarda acaba 0,95 s antes do tecto (261,35 s) e a com retaguarda no tecto (262,3 s): «nunca mais longa» falha por um segundo; a soma desce de 1311,5 para 1259,65 s |
| `tests/helpers/m01-cover.js` | o piloto `help` alinha o rumo e a elevação a 0 antes de atirar à MG | ver abaixo |

**O achado do piloto de cobertura.** `m01-cover-threat` (`help` mantém a MG do portão em baixo ≥ 80 %) falhou com 44 % na semente do golden. Medi 12 sementes × {com, sem bombas} (`COVER_PINS_12_SEEDS_BEFORE_SQUARING_UP.json`): com as bombas a MG ficava em baixo **16,6 %** do reparo em média (1–48 %, 0 de 12 sementes ≥ 80 %), sem elas 88,9 %. Não era caos: as 12 sementes partilham todo o percurso antes das 04:45 e o piloto vira para o clarão em contagens inteiras do rato (2,2 mrad, 2,6 m a 1170 m); o rumo com que chegava (o do último passo do `walk`, com um resíduo de uma fracção de contagem que muda com diferenças de centímetros no caminho, aqui causadas pelo atordoamento) decidia se as suas rondas passavam a menos de 3 m da MG. Alinhado a 0 antes de atirar, o piloto é reprodutível: **90 % sem bombas e 91 % com bombas** na semente do golden, e nas 12 sementes (`COVER_PINS_12_SEEDS.json`) a MG fica em baixo 95,2 % (sem) e 95,3 % (com) do reparo, 12 de 12 sementes ≥ 80 % nos dois casos, diferença emparelhada das picadas +1,7 (e.p. 1,0), a abertura (ignorar − cobrir) 28,3 (sem) e 29,9 (com): **as bombas não mudam a mecânica da cobertura**. Nenhuma asserção do teste mudou. (Nada disto muda uma rota do golden: o `coverControls` de `tests/helpers/m01-route.js` mira com valores fraccionários.)

## Verificação

Tudo corrido neste worktree (Node 22, `CI=1`, Chromium do `/opt/pw-browsers` via `CHROME_EXECUTABLE`, SwiftShader, porta 4173). O navegador só prova que a página arranca e que as asserções de estado e de diagnóstico passam: não é FPS nem playtest.

| O quê | Resultado |
|---|---|
| `npm test` completo, uma só corrida em `37ec22f` (simulação, dados e golden já finais; 60 min com os núcleos partilhados) | 1557 testes: **1548 verdes, 9 vermelhos**, os 9 de ambiente (abaixo) |
| `node tools/verification/m01-integration-golden-audit.mjs --amendment 16` (modo de verificação) | `check: identical`, exit 0: as duas rotas do golden tick a tick e as quatro rotas de invariantes (sementes 3 e 7, controlo e apoio; sobreviventes 12/12 e 18/18, clipping 0, empilhados 0) |
| `npm run build` | OK (antes e depois da constante dos decalques, abaixo) |
| Depois dessa constante, focados | `m01-damage-decals` + `m01-player-shot-feedback` 19/19; `m01-battlefield-fx-polish-v3`, `m01-battlefield-fx`, `m01-consolidation-lifecycle`, `m01-demolition`, `m01-render-perf`, `m01-living-battlefield-t21`, `m01-render-idempotence`, `m01-display-fire`, `m01-east-front`, `m01-german-retreat` 129/129 |
| Navegador: `m01-damage-decals` (3), `m01-battlefield-fx-polish-v3` (3), `m01-continuity-raid` (1), `m01-partials-completion` (4), `m01-stuka-dive` (5), as specs que lêem a janela das 04:34 ou a lista de crateras | 16/16 no fim; uma falha achada e corrigida (abaixo). As duas primeiras da `m01-damage-decals` correram antes da constante; a terceira, depois, sozinha |

A suite completa não foi repetida depois da constante dos decalques (só os ficheiros acima, que são os que carregam o módulo ou a vista); as outras specs do navegador (`npm run test:browser` inteiro) não foram corridas.

**Os 9 vermelhos do `npm test` são de ambiente.** O clone é raso (`git rev-parse --is-shallow-repository` → `true`) e estes testes fazem `git show`, `git ls-tree` ou `git diff` a commits que não existem aqui (`git cat-file -t` falha): `m01-locomotive:40`, `m01-panzerzug:40` e `m01-soldier-visual-variation:81` (`ls-tree 5f3cc34f`), `m01-mg34-prone-runtime:159` (`show 2cfa9520`), `m01-soldier-motion-clips:154` (`d070225d`), `m01-train-consist-polish:49,122,176,278` (`99309d9c`, `e588c0cd`). Num clone completo correriam, por isso verifiquei à mão (leitura, não execução) o que protegem e que a alteração toca: (a) os ficheiros de `src/`, `missions/` e `assets/` que mudei e que existem na base `5f3cc34f` estão na lista `tests/helpers/m01-byte-guard-allowlist.js` (`m01-simulation.js`, `mission.json`, `audio.js`, `game.js`); `m01-yard-life.js`, `m01-audio-events.js` e `m01-damage-decals.js` não existem nessa base (a API do GitHub devolve 404 para os três e 200 para `m01-simulation.js`) e `m01-blast.js` é novo; (b) a linha que acrescentei ao `ENGINE_CONTRACT.md` está na linha 11, acima do corpo original que o teste exige contíguo (marcador na linha 31); (c) os corpos de `walkStraight` e `evacuateStation` em `m01-simulation.js`, que o teste de `m01-mg34-prone-runtime` compara byte a byte com a base, são iguais aos de `e7f5f28` (13 940 e 2 987 caracteres). O `m01-soldier-motion-clips` compara commits fixos entre si; o `m01-train-consist-polish` compara `m01-train-wagons.js` e `m01-train-consist-detail.js` (que não toquei) com a entrega original.

**O achado do navegador (corrigido).** `m01-damage-decals.spec.js` › «saved blasts draw their persistent aftermath on load» falhou (`repair_crater` sem resíduo). A rota de controlo guarda agora 21 crateras antes da demolição oeste e 22 depois (3 do evento, 11 da agenda, 6 das 05:30, 2 demolições; antes 10 e 11) e os decalques só desenham as últimas `blasts` = 16: a bomba da estação, o posto avançado e a cratera do cabo perdiam a marca persistente a partir das 05:30. Medido (`m01BlastResidue` sobre as 22): 1645 dos 6000 triângulos de resíduo (as 16 mais recentes, 1440); o entulho e as brasas têm tectos próprios (134 e 40 em qualidade alta), por isso o custo não cresce com a contagem. `blasts` 16 → 24 em `src/render/m01-damage-decals.js` (a única alteração em `src/render/`; o teste unitário e a spec leem `LIMITS.blasts`, nenhuma asserção mudou). Depois: a spec 1/1 e os unitários 19/19. Este ficheiro está na lista de alterações permitidas do `m01-v7-invariants.mjs` e não existe na base do bloqueio de bytes.

## Não feito

- **Poeira** que tapa a vista da IA: nenhuma verificação de visão da IA corre enquanto existe uma nuvem. Os alemães só se activam às 04:45 (depois da última bomba, 04:43:10, mais qualquer duração razoável de nuvem), o `kowalFire` precisa do comboio 963, a ckm só dispara a partir das 04:46, e as seis bombas das 05:30 caem a mais de 560 m de qualquer IA. O gancho seria `TczewWorld.lineOfSight` + os registos de `sectors.damage` (a nuvem derivada do `started`, sem estado novo), ~15 linhas, quando uma bomba posterior o pedir.
- **Falas de ferido ou de sanitário**: nenhuma regra de `src/game/m01-barks.js` serve (`dlg_m01_100/101` são `round-impact` com `victim` e `active cover_withdrawal`; `106/107` seguem-nas). Nenhuma fala nova (nada para revisão por nativo). A linha certa seria um gatilho novo do realizador sobre `m01-blast` com `effects.wounded` e uma regra em `101`/`107`, que é decisão do Capitão (o vocabulário do realizador é fechado e cada linha tem uma só regra).
- **Demolições** (`impact` não aéreo): fora (mexeriam no enredo).
- **Reacção do renderizador ao atordoamento** (vinheta, desfocagem): só o áudio lê a força.

## Em aberto

1. **Baixas só no pátio.** Não há soldados sem nome na margem oeste entre as 04:34 e as 04:45, por isso os únicos homens que podem morrer são os quatro extras do pátio (dois ferroviários, um ordenança, um auxiliar de socorro; o doente da maca e a carriola só ficam abalados). Quem está «junto das bombas» na queixa do proprietário (os sapadores a 1,6–6,7 m da cratera do cabo, a secção) é o elenco, que o enredo exige vivo: fica abalado (deitado, 2–7 s), não ferido. **Decisão do Capitão/proprietário**: um grupo opcional de 4–6 soldados sem nome (`displayOnly`, como os auxiliares) custa 8 asserções de efectivo (97 → N) em 6 ficheiros de teste, a variação visual do renderizador, e `readiness(west_demolition)` conta aliados activos não civis (teriam de ser `civilian` ou sair às 04:45).
2. **Os sapadores a 1,6 m de uma bomba de 250 kg e só abalados** é uma incoerência narrativa que as regras de protecção tornam inevitável; uma saída é pôr a cratera do cabo a ~15 m deles (decisão do proprietário, mexe no ponto `repair_site_1` e em testes de crateras).
3. **Lanterna a flutuar.** O renderizador pendura a lanterna dos dois ferroviários da raiz do esqueleto (`addCivilianProps`, `m01-characters.js`), não de um osso: num ferroviário morto ou ferido a lanterna fica a 0,8 m do chão ao lado do corpo. Correcção (apresentação, não toquei no ficheiro: está bloqueado byte a byte por `m01-soldier-visual-variation.test.js`, e o teste desse ficheiro que o compara com o commit-base não corre neste clone raso, por falta de objectos git: não o podia validar): esconder `civilian_lantern` quando `!actor.alive || actor.state === 'WOUNDED'`, com uma camada nova no bloqueio.
4. **O atordoamento é ~18 % da janela** (32–35 s de ~190 s reais na rota de controlo): é o piloto a correr; um humano parado atrás do aterro sente menos. Os números (`CONCUSSION` em `m01-blast.js`) são botões de afinação, não medidos num jogador.
5. **Ninguém jogou isto**: sem sensação de jogo, sem FPS, sem captura de ecrã avaliada por uma pessoa (as 16 specs do navegador correram, mas só verificam estado e diagnósticos); o fumo de 11 crateras novas divide o orçamento de partículas com as outras (as mais recentes primeiro). Não vi nenhuma imagem da lanterna, dos corpos do pátio nem do atordoamento.
6. **Ambiente.** Neste clone raso 9 testes falham por falta de objectos git que citam (`git show <sha>`: `m01-locomotive`, `m01-mg34-prone-runtime` 159, `m01-panzerzug`, `m01-soldier-motion-clips`, `m01-soldier-visual-variation` 81, `m01-train-consist-polish` ×4); não dependem desta alteração (falham com «not a tree object / bad object»).
