# T47 fase 0 — re-medição do arco de fogo da ckm wz.30 no HEAD candidato

Data: 2026-10-16. HEAD medido: `813f163` (candidata M01, PR #80). Análise só de leitura: nenhum ficheiro em `src/`, `missions/`, `assets/` ou `tools/assets/` foi alterado.
Contexto: `docs/direction/M01_CKM_FIRE_GAP.md` §4-5 (medição original em `fbaac1e`/`1b3a973`).

## Veredicto

**Continua bloqueado. Nenhum alvo alemão tem linha livre da boca da ckm em qualquer momento em que a arma está em posição.** O resultado das branches `codex/*` mantém-se no HEAD (com contagens ligeiramente diferentes por haver mais actores alemães activos).

## Ferramenta e comandos

- `tools/m01-ckm-fire-arc.mjs` (portada de `origin/codex/m01-ckm-fire-arc-resolution`, `git show origin/codex/m01-ckm-fire-arc-resolution~1:tools/m01-ckm-fire-arc.mjs`; commit `3f11a91`). Usa `TczewWorld`, `traceObstruction`/`eyePosition` de `src/world/spatial.js`, `world.lineOfSight` e `traceTerrain` de produção; não reimplementa a colisão. Acrescentado `routeSweep()` (`--route`): corre `route()` de `tests/helpers/m01-route.js` sem injectar nada e, de 1 s em 1 s, traça da boca para todos os inimigos activos com o mundo vivo da simulação; confronta cada amostra com `sim.world.lineOfSight(sonda_na_boca, actor)` (0 divergências).
- `tests/m01-ckm-fire-arc.test.js` (8 testes). Afirma factos medidos, não resultados desejados.
- Comandos: `node tools/m01-ckm-fire-arc.mjs --out <json>`; `node tools/m01-ckm-fire-arc.mjs --route`; `node --test tests/m01-ckm-fire-arc.test.js` (8/8 pass, ~28 s).

## Boca (autoritativa)

`CKM_POSITION` = {24,17; -3; 43} (`src/game/m01-simulation.js:34`), yaw -90 graus; `gun_muzzle_flash` -> (25; -2,36; 43), `gun_muzzle` -> (24,85; -2,36; 43) (`tests/m01-ckm-placement-migration.test.js:126-133`). Seteira mapeada `[25,-3,43]` em `missions/m01-tczew/map-layout.json:124` (`casemates_west`, caixa x 0..26, y -7..-1, z 34..46), normal +X; o mapa só define ponto/normal/altura de cobertura, sem polígono de abertura.

## Medições

### 1. Leque angular (az -30..30, el -5..10, passo 0,5; 1200 m; 3751 raios)

| Primeiro bloqueador | Raios |
|---|---|
| `road_collider_deck_span_01` | 1847 (1,2-27,6 m; az -30..-0,5) |
| `terrain` (margem leste / solo) | 615 (88,8-1182 m; az 0..30) |
| `road_collider_tower_01_s` | 95 (113,3-115,1 m; az 0,5..2,5) |
| `road_collider_pier_01` | 63 (112,4-112,8 m; az 0..3) |
| **livres** | **1131** |

Os 1131 raios livres têm todos az >= -1 e el >= 0,5: saem para sul (z 22..643) por cima da margem/rio, nunca ao longo do tabuleiro nem para a frente alemã. Raio a az 0 / el 0: `road_collider_pier_01` a 112,4 m. Excursão do clip `aim` (+-1,2 graus / +-0,35 graus, 375 raios): 375/375 bloqueados (pier_01 ou deck_span_01), 0 livres.

### 2. Snapshots repair e withdrawal (todos os inimigos activos)

| Fase | Alvos | Livres | Bloqueio |
|---|---|---|---|
| repair (battleClock 17159) | 42 (40 `grp_de_east` + 2 `grp_mg34_loaders`) | **0** | `deck_span_01` 30; `pier_01` 12 |
| withdrawal (21900) | 52 (40 `grp_de_east` + 10 `grp_de_spans` + 2 loaders) | **0** | `deck_span_01` 37; `pier_01` 15 |

Distâncias do primeiro bloqueio: 2,1 a 112,5 m. Ex.: `de_east_0` (1029,8 m): `deck_span_01` a 22,7 m; `de_east_1/2`: a 8,2 m; `de_spans_*`: deck_span_01 a 71-108 m ou pier_01 a 112,4 m. Em lado nenhum a linha chega a 113 m.

### 3. Varrimento da rota completa (1 amostra/s; 1113 amostras; 36 596 amostras de inimigo)

- Antes de `evt_m01_east_demolition` (janela em que a ckm está `idle/aim/feed`): 787 amostras, 21 600 amostras de inimigo, **0 livres**.
- Entre a demolição leste e a oeste: **0 livres**.
- Só depois de `evt_m01_west_demolition` (battleClock >= 24300,75) há 135 amostras livres, 9 actores (`de_east_26,27,33..39`, x 1076-1094, z -20..96, ~1052-1070 m). Nesse instante `pier_01` e `deck_span_01` já foram removidos (`destroyedBy: evt_m01_west_demolition`), a guarnição está em `retreat` e `ckm.visible=false`: irrelevante para fogo da ckm.
- Antes disso, esses mesmos actores são bloqueados por `deck_span_01` (4,2-5,3 m) ou `pier_01` (112,4-112,5 m).
- Bloqueadores globais da rota: `deck_span_01` 25 072; `pier_01` 10 834; `pier_02` 375; `rail_collider_deck_span_03/04/05` e `rail_collider_pier_03` 180; livre 135 (tudo após a demolição oeste).

Resposta a "algum alemão visível de um arco de seteira plausível (rio/ponte a norte/leste)": **não**. O varrimento traça directamente para cada alvo, por isso cobre qualquer azimute possível; nenhum alvo é visível com a casamata intacta.

### 4. O conflito de colliders continua?

Sim, em duas formas, mas a causa directa não é a que o gap doc supunha.

- Caixa da casamata `x 0..26, y -7..-1, z 34..46` (`map-layout.json:124`) sobrepõe-se em x 0..10 ao `road_collider_abutment_west` (walkable, x -22..10, y -12..-0,35, z 29,5..50,5; `assets/models/provisional/m01/bridge-colliders.json`). A boca (x=25) fica **fora** deste collider e de qualquer outro (`inside colliders = []`; `heightAt(25,43) = -3`). Este conflito não bloqueia raios que partem de x=25; é um problema de caminho (interior não modelado), não de visão.
- O bloqueio real são (a) `road_collider_deck_span_01` (walkable, x 8,5..139,7, y -0,5..0, z 37,235..42,765) e (b) `pier_01` (x 137,4..144,4, y -16..-1,2, z 31..49) e `tower_01_s` (x 138,25..143,55, z 43,35..48,65, solid).
- `deck_span_01` entra na colisão de balas via `traceTerrain` (`src/world/tczew-world.js:62,95-100`): `heightAt` trata a superfície walkable como coluna cheia até ao fundo, por isso qualquer raio com y < 0 dentro da pegada do tabuleiro é "terreno". A boca está a 0,235 m a sul da pegada (z 43 > 42,765) e a 2,36 m abaixo do topo do tabuleiro (y = 0): para alvos sobre o tabuleiro (y ~ +1,6 de olho) a linha tem de atravessar a laje. Mesmo com laje fina (-0,5..0) fisicamente correcta, a linha a alvos a norte/nordeste cruza a laje antes de x ~ 50 m (estimativa geométrica, não medida).
- Pormenor: no HEAD a simulação já tem fases `aim/feed` cíclicas (`src/game/m01-simulation.js:496-513`, a partir de 04:46:00) e `fire_burst` desactivado (`:500-502`, `burstPlan.policy 'disabled'`, `:1177-1178`). O gap doc §2-3 está desactualizado neste ponto; o disparo propriamente dito continua ausente.

## Recomendação

**Opção (c), outro posto documentado, como recomendação principal; (a) só se houver prova histórica/mapa; (b) não resolve sozinha.**

| Opção | O que resolve | Ficheiros | Risco para goldens |
|---|---|---|---|
| (a) Abertura/seteira apoiada por mapa/história | Não resolve: a boca já está na seteira mapeada e o mapa não tem abertura; qualquer abertura nova continua sob o tabuleiro a 2,4 m do topo e atrás de `pier_01`/`tower_01_s` a 112 m. Só serve se for um novo ponto de tiro acima do nível do tabuleiro, o que é (c) | `missions/m01-tczew/map-layout.json`, GLB da ckm/manifesto (proibido sem aprovação), pontes `tools/assets/m01-bridges/` | `m01-bridges-glb` (`manifest.mapLayout.sha256_16` do layout), `m01-bridge-structure`, `m01-demolition`, `m01-tczew-data`; alto |
| (b) Corrigir colliders em `tools/assets/m01-bridges/` (regenerar `bridge-colliders.json` com `export-colliders.mjs`) | Remover/afinar `deck_span_01` como coluna cheia e `pier_01`/`tower_01_s` abre linhas, mas continua a haver laje física entre a boca e o tabuleiro, e remover pilar altera o mundo todo (movimento, tiro MG34, LOS dos 90 actores). Medição não feita (exigiria alterar assets, proibido nesta fase) | `tools/assets/m01-bridges/src/bridges.mjs`, `assets/.../bridge-colliders.json` e GLB, possivelmente `src/world/tczew-world.js` | Muito alto: `tests/m01-material-authority.test.js:30` exige `bridge-colliders.json` e `tczew-world.js` idênticos ao Git integrado; `m01-bridge-structure`/`m01-bridges-glb`/`m01-bridge-portal-polish` fixam sha1 dos blobs; golden por tick em `tests/m01-animation-contract.test.js` (traços de gameplay por seed) |
| (c) Outro posto documentado (p. ex. posto da ckm ao nível/acima do tabuleiro, no encontro oeste fora da pegada da laje, com `CKM_POSITION` e `cv_casemate_emb_s` revistos) | Único com linha geométrica plausível; exige nova prova de linha livre com este mesmo scanner e fonte histórica (T04/T08/T27) | `src/game/m01-simulation.js` (`CKM_POSITION`, migração de saves), `missions/m01-tczew/mission.json` (post), `map-layout.json` (cover), asset da ckm (socket/yaw) | Alto: `src/game/m01-simulation.js` tem sha256 fixo em `tests/m01-animation-contract.test.js:43` (`tests/fixtures/m01-partials-gameplay-baseline.json` `sourceSha256`) e o golden por tick; guardas de bytes (`tests/helpers/m01-byte-guard-allowlist.js`, `m01-wz29-viewmodel`, locomotive/panzerzug/soldier-visual); `tests/m01-ckm-placement-migration.test.js` e `m01-ckm-runtime.test.js` |

Qualquer mudança em `src/game/m01-simulation.js` obriga a re-baselinar o golden (sourceSha256 e traços por tick) com auditoria separada, como em D1 (`bca75ae`). Isto aplica-se à tarefa de implementação (fase 1), não a esta fase.

Se o Captain preferir não alterar geometria nem posto, a ckm permanece decorativa (aim/feed visuais) e a T47 fica por documentar como "bloqueada por geometria". Incerteza: a medição trata alvos como o ponto de olho de produção; alvos nunca são testados em múltiplos pontos do corpo.

## Verificação

`npm ci` e `npm test` (completo, com os 8 testes novos): 952 testes, 952 pass, 0 fail, 0 skipped (~663 s). Build e browser não foram corridos (fora do âmbito: nenhuma alteração de `src/` ou assets).
