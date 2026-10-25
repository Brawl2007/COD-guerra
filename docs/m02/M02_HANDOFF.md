# M02 — HANDOFF TÉCNICO E HISTÓRICO (ETAPAS M02-01, M02-02 E M02-03 — ÁREA A COMPLETA)

## 1. Identificação das Etapas Concluídas

- **Missão:** M02 — Batalha do Bzura, Polónia, 9–12 de setembro de 1939
- **Etapas concluídas:**
  - **M02-01 — Bancada jogável e independente da quinta de 100 × 150 m (N0 Geometria e Balística)** (`bef32e8`)
  - **M02-02 — Combate da Quinta e Avanço de Secção (N1 Combate Causal · Cenas C02–C04)** (`41d990d`)
  - **M02-03 — Área A Completa (Cena C01 Estrada de Orvalho + Encontro EA0 + Horizonte Vivo N2 + Transição `T-AB` para Área B)**
- **Ramo Git:** `gemini/m02-01-quinta`
- **Commit base (candidata M01 PR #80 + PR #91 integrado):** `3c8e576dfdfefa7a2158a50dffb74fed4695385f`
- **Interferência na M01 / `main`:** **Zero** (`0` ficheiros da M01 modificados; `0` merges em `main`).

---

## 2. O Que as Etapas M02-01, M02-02 e M02-03 Implementaram

### 2.1. M02-01 — Geometria 100 × 150 m, Duas Rotas e Balística por Material (`MAP-01`, `MAP-02`)
1. **Envelope Espacial da Quinta (`X: -50..+50 m`, `Z: -90..+60 m`, origem `(0,0,0)` no pátio):**
   - **B01 — Casa rural da família ausente (`X: -40..-26, Z: -18..-8`, `14 × 10 m`):** 5 divisões interiores navegáveis (`cozinha`, `despensa`, `sala`, `quarto_oeste`, `quarto_este`), 6 portas funcionais (`open`/`closed`/`destroyed`), 4 janelas reais (2 abertas, 2 com vidro quebrável `intact` → `broken`), mobiliário interior de cobertura.
   - **B02 — Celeiro do portão norte (`X: 12..36, Z: -38..-24`, `24 × 14 m`):** interior navegável, portão norte aberto de `3.0 m`, porta sul de `1.2 m` (`closed`), abertura oeste de tiro de metralhadora (`win_b02_west_mg`), 4 pilares internos e posição defensiva de `MG34` (`DE-A05`).
   - **B03 — Estábulo (`X: 20..38, Z: 0..12`, `18 × 12 m`) e B04 — Forno e anexo (`X: -37..-29, Z: 20..26`, `8 × 6 m`):** interiores navegáveis e coberturas de flanco.
2. **Duas Rotas Táticas Completas e Comutáveis:**
   - **Rota A — Vala Húmida (`(0,-80) → (-45,-70) → (-45,-5) → (-24,0) → (-15,-8) → (0,-24)`):** depressão física (`Y = -1.10 m`), rampas suaves e talude leste que protege contra a `MG34` do Celeiro B02.
   - **Rota B — Pomar e Flanco Leste/Sul (`(0,-80) → (43,-55) → (43,27) → (8,42) → (0,20) → (0,-24)`):** flanco leste e pomar sul (`7` macieiras onde apenas o tronco estreito `wood_thick` bloqueia projéteis e movimento, enquanto a copa `foliage` funciona exclusivamente como oclusão visual sem bloquear tiros).

### 2.2. M02-02 — Secção Polaca Causal, Guarnição Alemã `EA1` Finita, Granadas e Cena C04 (`AI-01..04`, `COM-01..03`, `OBJ-01`, `SAVE-01/02`)
1. **Secção Polaca com Efeito Causal Real (`7` aliados + `Piotr Sokół`, `AI-01`, `AI-03`):**
   - Efetivo completo segundo `K-PERSONAGENS-DIALOGOS.md`: `sierż. Władysław Gruca` (`pl_gruca`), `strz. Andrzej Lis` (`pl_lis`), `strz. Tomasz Wierzba` (`pl_wierzba`), `strz. Jurek Małek` (`pl_malek`), `sanit. Edmund Szymczak` (`pl_szymczak`), `strz. Nowak` (`pl_aux_01`, `rkm wz. 28`) e `strz. Kowalski` (`pl_aux_02`, auxiliar `rkm`).
   - Consumo real de munição e ciclos de recarga (`wz29` 5 cartuchos; `rkm_wz28` 20 cartuchos), navegação A* (`M01Navigator`), abertura automática de portas fechadas na rota, fila única por portal (`doorLocks`) em portas estreitas (`1.0–1.2 m`) sem empilhamento de cápsulas (`AI-03`), verificação de linha limpa sem fogo amigo (`friendlyFireClear`) e disparos por raycast balístico real (`traceShot`) que suprimem e causam dano/baixas reais na guarnição alemã (`AI-01`).
2. **Guarnição Alemã Finita `EA1` (`10` defensores `DE-A05`..`DE-A14`, `AI-02`, `AI-04`, `COM-03`):**
   - Zero spawns infinitos e zero spawns nas costas do jogador (`AI-04`).
   - Percepção honesta (`AI-02`): cone visual + `world.lineOfSight` real e memória auditiva/visual (`lastKnownPosition` com expiração de `5.5–6.0 s`) — paredes sólidas bloqueiam visão e os inimigos nunca seguem movimento oculto atrás de paredes (`wallhack` proibido).
   - Colapso moral / rendição (`SURRENDERED`) quando a `MG34` e `>= 6` defensores caem, e transição persistente de `DE-A14` no pomar sul para `WOUNDED_UNARMED` (`COM-03`).
3. **Granadas Causais (`wz. 33`), Cercas Destrutíveis e Cena C04 (`COM-01`, `COM-02`, `OBJ-01`, `SAVE-01/02`):**
   - `2` granadas de fragmentação (`KeyG`) com física balística e verificação de `traceObstruction` (paredes sólidas bloqueiam dano; janelas intactas partem; portas finas fechadas próximas partem; cercas de madeira sul `cov_south_fence_west` e `cov_south_fence_east` abrem brecha física e visual `intact → breached`).
   - Fala literal protegida `dlg_m02_001` (`Lis`: *«Era a estrada de casa. Agora procuro onde esconder a cabeça.»*) e catálogo `bz39_c01_01`..`bz39_c05_01` com prioridades `0/1/2`.
   - Interação de giz branco na Cena **C04 (Pomar e Água)** (`[E]` junto a `DE-A14` marca o poste do pomar com giz branco `m02.pomar_wounded_marked = true`; disparar sobre o ferido desarmado regista `m02.fired_on_wounded = true` e aciona imediatamente `bz39_c04_05` de `Gruca`).

### 2.3. M02-03 — Área A Completa: Cena C01 (`P1`), Encontro `EA0`, Horizonte Vivo `N2` e Transição `T-AB` (`HZ-01..03`, `NAR-01`)
1. **Cena C01 (Preparação em `P1 (0, -175)`) e Encontro `EA0` (`DE-A01..DE-A04` em `(-18, -110)`):**
   - Extensão do corredor norte (`Z = -210..-80 m`) com trincheira de preparação em `P1 (0, -175)` (`cov_c01_p1_trench_lip`), bueiro intermédio (`cov_c01_mid_culvert`), trincheira transversal do posto avançado em `(-18, -110)` (`cov_c01_outpost_parapet`, depressão de terreno `Y = -0.32 m`), nós de cobertura `cv_c01_*` e `4` defensores finitos `EA0` (`DE-A01..DE-A04`).
   - `startAreaAFullC01()` posiciona Piotr e a secção em `P1 (0, -175)` com cartela `«Setor de Łęczyca — 9 de setembro de 1939 — fim da tarde»` e objetivo `O00`. O contacto balístico ocorre em `< 15 s`; neutralizar `DE-A01..DE-A04` transita imediatamente `O00 → O01`, ativa `m02.prep_avanco_ok = true` e `m02.ea0_posto_cleared = true`, e grava `cp_m02_a_preparacao`.
2. **Horizonte Vivo `N2` (`src/world/m02-horizon-system.js` — `HZ-01`, `HZ-02`, `HZ-03`):**
   - 8 setores angulares de `45°` (`N, NE, E, SE, S, SW, W, NW`) cobrindo `360°`, com silhuetas de estudo explicitamente identificadas (`Tum / Colegiada` em `SW` e perfil urbano de `Łęczyca` em `E`).
   - **`HS-A1` (Apoio lateral polaco a oeste):** `6` soldados persistentes (`hs_a1_01..06`) com estados finitos `PREPARE → ADVANCE → OCCUPY_COVER → CONSOLIDATED` e promoção/demoção `L2_impostor <-> L1_actor` com histerese de `15%` (`230 m` para promover, `268 m` para demover), preservando `id`, `health`, `mag`, `reserve` e coordenadas (`HZ-02`).
   - **`HS-A2` (Frente lateral da companhia a nordeste/leste):** `5` eventos finitos de fogo/fumo (`ev_hsa2_01..05`), atraso acústico físico `delaySec = distanceM / 343.0` (`horizon-flash` imediato seguido de `horizon-acoustic-boom` após `d / 343 s`), estados finitos `OFFENSIVE_FIRE → POSITION_TAKEN → SETTLED_SMOKE`, sem nunca repetir explosões nem reiniciar após conclusão ou restauro de checkpoint (`HZ-03`).
   - **`HS-A3` (Coluna logística na estrada norte `Z = -245`):** `3` viaturas (`hs_a3_01..03`) que atravessam uma única vez (`WAIT_ROAD → PASSING_ONCE → EXITED_SECTOR`) sem loop infinito (`HZ-03`).
   - **4 Estados Temporais (`T0`, `T1`, `T2`, `T3`):** sincronizados com os presets de iluminação do renderizador (`afternoon_1939_09_09`, `night_1939_09_09`, `morning_1939_09_10`, `afternoon_1939_09_10`).
3. **Cena C05 — Deslocação e Transição Semântica `T-AB` (`NAR-01`):**
   - `triggerTransitionTAB({ skip: false | true })` transita para `T1` (`«Acessos de Łęczyca — noite de 9 para 10 de setembro»`), aciona `bz39_c05_01` e produz um `transitionTABPayload` 100% idêntico quer a cena seja assistida (`skip: false`) quer saltada (`skip: true`).

---

## 3. Ficheiros Criados / Modificados na M02 vs. Ficheiros Reutilizados da M01

### Ficheiros Exclusivos da M02
- `missions/m02-bzura/m02-01-quinta-layout.json` — Catálogo espacial declarativo da Área A (`100 × 150 m` + corredor `C01` até `Z = -210 m`), `coverNodes`, `polishSquad` (`7` aliados), `enemyRosterEA0` (`4` defensores) e `enemyRosterEA1` (`10` defensores).
- `src/world/m02-quinta-world.js` — Mundo físico/balístico `M02QuintaWorld`, `BALLISTIC_MATERIAL_POLICY`, cercas destrutíveis (`fenceStates`), adaptador `navWorld` e `applyExplosionDamageToWorld`.
- `src/world/m02-horizon-system.js` — Diretor determinístico do Horizonte Vivo `N2` (`M02HorizonDirector`, `HORIZON_SECTORS_360`, `M02_TEMPORAL_STATES`, `HS-A1`, `HS-A2`, `HS-A3`, atraso acústico `d / 343 m/s` e histerese `L2 <-> L1`).
- `src/game/m02-combat-ai.js` — IA tática da secção polaca (`updatePolishSquad`), IA da guarnição alemã (`updateGermanGarrison`), navegação A* com fila de porta (`stepActorNavigation`), armas (`WEAPON_PROFILES`) e diretor de diálogos (`M02DialogueDirector`).
- `src/game/m02-01-simulation.js` — Simulação determinística `M02BenchSimulation` (`startAreaAFullC01`, `triggerTransitionTAB`) e validador `validateM02Snapshot`.
- `src/render/m02-01-renderer.js` — Renderizador Three.js `M02BenchRenderer` (terreno estendido até `Z = -235 m`, 4 estados temporais `T0..T3`, horizonte 360° com `HS-A1/A2/A3`, edifícios, cercas dinâmicas, poste C04 com giz, soldados articulados, granadas e traçantes).
- `src/m02/m02-01-main.js` e `m02-01.html` — Controlador interativo, HUD tático, cartela histórica, legendas de diálogo e API `window.m02Bench`.
- `tools/m02/run-m02-01.mjs` e `tools/m02/playwright-m02-01.config.js` — Ferramentas de execução e teste browser isoladas.
- `tests/m02-01-quinta-geometry-ballistics.test.js` — Suite determinística Node da M02-01 (`7` testes).
- `tests/m02-02-combat-squad-ai.test.js` — Suite determinística Node da M02-02 (`8` testes).
- `tests/m02-03-area-a-horizon-c01.test.js` — Suite determinística Node da M02-03 (`5` testes: `C01/EA0`, `HZ-01`, `HZ-02`, `HZ-03`, `NAR-01`).
- `tests/browser/m02-01-quinta.spec.js` — Suite Playwright em browser real (`12` capturas PNG + telemetria nos 3 perfis).

### Ficheiros Reutilizados da M01 (`0` Bytes Alterados)
- `src/world/m01-player-physics.js` (`movePlayer`, `PLAYER_PHYSICS`)
- `src/world/m01-navigation.js` (`M01Navigator`)
- `src/world/m01-collision-layout.js` (`indexSolids`, `queryNearbySolids`)
- `src/world/spatial.js` (`eyePosition`, `aimDirection`, `muzzlePosition`, `traceShot`, `traceObstruction`, `visible`)
- `src/game/wz29.js` (`Wz29`)
- `src/render/m01-lod-policy.js` (`selectConsumerLod`, `selectLodBand`)
- `src/core/random.js` (`Random`)
- `src/config.js` (`EYE_HEIGHT`)

---

## 4. Como Executar e Testar a M02-01, M02-02 e M02-03

1. **Iniciar a experiência interativa no navegador:**
   ```bash
   node tools/m02/run-m02-01.mjs
   # Abrir http://127.0.0.1:4173/COD-guerra/m02-01.html
   ```
2. **Executar toda a suite determinística Node (`24` testes):**
   ```bash
   node --test tests/m02-01-quinta-geometry-ballistics.test.js tests/m02-02-combat-squad-ai.test.js tests/m02-03-area-a-horizon-c01.test.js tests/m01-simulation-boundary.test.js tests/assets-manifests.test.js
   ```
3. **Executar a verificação em navegador real (Playwright):**
   ```bash
   npx playwright test -c tools/m02/playwright-m02-01.config.js tests/browser/m02-01-quinta.spec.js
   ```

---

## 5. O Que a Etapa Seguinte (M02-04 — Área B: Acessos de Łęczyca e Cruzamento `EB1–EB3`) Deve Fazer

1. **Construir a Célula `AREA_B_LECZYCA` consumindo `transitionTABPayload` (`cp_m02_b_acesso`):**
   - Importar o estado persistido de `Piotr` (saúde, munição `wz. 29`, granadas `wz. 33`) e da secção polaca (`m02.malek_status`, `m02.wierzba_status`, `m02.pomar_wounded_marked`, `m02.fired_on_wounded`).
2. **Implementar os Encontros `EB1`, `EB2` e `EB3` nos Acessos Periféricos de Łęczyca (`T1` noite → `T2` manhã):**
   - Combate noturno/alvorada nos armazéns e cruzamento periférico (`B05–B07`), mantendo `<= 2` células ativas em memória (`STREAM-01`) e a regra histórica de ofensiva polaca em 9–10 de setembro.
