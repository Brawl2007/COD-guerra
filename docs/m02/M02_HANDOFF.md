# M02 — HANDOFF TÉCNICO E HISTÓRICO (ETAPAS M02-01 E M02-02)

## 1. Identificação das Etapas Concluídas

- **Missão:** M02 — Batalha do Bzura, Polónia, 9–12 de setembro de 1939
- **Etapas concluídas:**
  - **M02-01 — Bancada jogável e independente da quinta de 100 × 150 m (N0 Geometria e Balística)** (`bef32e8`)
  - **M02-02 — Combate da Quinta e Avanço de Secção (N1 Combate Causal · Cenas C02–C04)**
- **Ramo Git:** `gemini/m02-01-quinta`
- **Commit base (candidata M01 PR #80 + PR #91 integrado):** `3c8e576dfdfefa7a2158a50dffb74fed4695385f`
- **Interferência na M01 / `main`:** **Zero** (`0` ficheiros da M01 modificados; `0` merges em `main`).

---

## 2. O Que a M02-01 e a M02-02 Implementaram

### 2.1. M02-01 — Geometria 100 × 150 m, Duas Rotas e Balística por Material (`MAP-01`, `MAP-02`)
1. **Envelope Espacial de 100 × 150 m (`X: -50..+50 m`, `Z: -90..+60 m`, origem `(0,0,0)` no pátio):**
   - **B01 — Casa rural da família ausente (`X: -40..-26, Z: -18..-8`, `14 × 10 m`):** 5 divisões interiores navegáveis (`cozinha`, `despensa`, `sala`, `quarto_oeste`, `quarto_este`), 6 portas funcionais (`open`/`closed`/`destroyed`), 4 janelas reais (2 abertas, 2 com vidro quebrável `intact` → `broken`), mobiliário interior de cobertura.
   - **B02 — Celeiro do portão norte (`X: 12..36, Z: -38..-24`, `24 × 14 m`):** interior navegável, portão norte aberto de `3.0 m`, porta sul de `1.2 m` (`closed`), abertura oeste de tiro de metralhadora (`win_b02_west_mg`), 4 pilares internos e posição defensiva de `MG34` (`DE-A05`).
   - **B03 — Estábulo (`X: 20..38, Z: 0..12`, `18 × 12 m`):** corredor central norte–sul com portas abertas de `2.4 m` e janela alta oeste.
   - **B04 — Forno e anexo (`X: -37..-29, Z: 20..26`, `8 × 6 m`):** porta sul aberta, forno interior e pilha de lenha exterior.
2. **Duas Rotas Táticas Completas e Comutáveis:**
   - **Rota A — Vala Húmida (`(0,-80) → (-45,-70) → (-45,-5) → (-24,0) → (-15,-8) → (0,-24)`):** depressão física (`Y = -1.10 m`), rampas suaves e talude leste que protege contra a `MG34` do Celeiro B02.
   - **Rota B — Pomar e Flanco Leste/Sul (`(0,-80) → (43,-55) → (43,27) → (8,42) → (0,20) → (0,-24)`):** flanco leste e pomar sul (`7` macieiras onde apenas o tronco estreito `wood_thick` bloqueia projéteis e movimento, enquanto a copa `foliage` funciona exclusivamente como oclusão visual sem bloquear tiros).

### 2.2. M02-02 — Secção Polaca Causal, Guarnição Alemã `EA1` Finita, Granadas e Cena C04 (`AI-01..04`, `COM-01..03`, `OBJ-01`, `SAVE-01/02`)
1. **Secção Polaca com Efeito Causal Real (`7` aliados + `Piotr Sokół`, `AI-01`, `AI-03`):**
   - Efetivo completo segundo `K-PERSONAGENS-DIALOGOS.md`: `sierż. Władysław Gruca` (`pl_gruca`), `strz. Andrzej Lis` (`pl_lis`), `strz. Tomasz Wierzba` (`pl_wierzba`), `strz. Jurek Małek` (`pl_malek`), `sanit. Edmund Szymczak` (`pl_szymczak`), `strz. Nowak` (`pl_aux_01`, `rkm wz. 28`) e `strz. Kowalski` (`pl_aux_02`, auxiliar `rkm`).
   - Consumo real de munição e ciclos de recarga (`wz29` 5 cartuchos; `rkm_wz28` 20 cartuchos), navegação A* (`M01Navigator`), abertura automática de portas fechadas na rota, fila única por portal (`doorLocks`) em portas estreitas (`1.0–1.2 m`) sem empilhamento de cápsulas (`AI-03`), verificação de linha limpa sem fogo amigo (`friendlyFireClear`) e disparos por raycast balístico real (`traceShot`) que suprimem e causam dano/baixas reais na guarnição alemã (`AI-01`).
   - Ordens táticas do jogador (`suppress` `[Z]`, `advance` `[X]`, `flank_east` `[B]`) + autonomia tática sob comando de `Gruca`.
2. **Guarnição Alemã Finita `EA1` (`10` defensores `DE-A05`..`DE-A14`, `AI-02`, `AI-04`, `COM-03`):**
   - `DE-A05` (`MG34` em `B02`) + `DE-A06` (auxiliar `Kar98k` em `B02`), `DE-A07` e `DE-A08` (`B01` cozinha e sala), `DE-A09` e `DE-A10` (`B03` estábulo), `DE-A11` (portão norte), `DE-A12` e `DE-A13` (reservas locais junto ao poço e cerca sul que deslocam para o flanco ameaçado `west`/`east`), e `DE-A14` (pomar sul, candidato da cena `C04`).
   - Zero spawns infinitos e zero spawns nas costas do jogador (`AI-04`).
   - Percepção honesta (`AI-02`): cone visual + `world.lineOfSight` real e memória auditiva/visual (`lastKnownPosition` com expiração de `5.5–6.0 s`) — paredes sólidas bloqueiam visão e os inimigos nunca seguem movimento oculto atrás de paredes (`wallhack` proibido).
   - Colapso moral / rendição (`SURRENDERED`) quando a `MG34` e `>= 6` defensores caem, e transição persistente de `DE-A14` no pomar sul para `WOUNDED_UNARMED` (`COM-03`).
3. **Granadas Causais (`wz. 33`), Cercas Destrutíveis e Estados de Dano (`COM-01`, `COM-02`):**
   - O jogador dispõe de `2` granadas de fragmentação (`KeyG`) com física balística, ressalto e detonação em ponto fixo (`detonateGrenadeAt`).
   - A explosão verifica `traceObstruction`: paredes sólidas (`brick`, `stone`, `earth`, `wood_thick`) bloqueiam o dano da explosão, enquanto alvos expostos sofrem dano graduado e supressão; janelas intactas no raio partem (`intact → broken`), portas finas fechadas próximas ficam destruídas (`closed → destroyed`) e as cercas de madeira sul (`cov_south_fence_west`, `cov_south_fence_east`) abrem brecha física e visual (`intact → breached`).
4. **Objetivos por Estado (`O01 → O02 → O03 → C04 → COMPLETE`), Diálogos (`K2/K3/K4`) e Cena C04 (`OBJ-01`, `SAVE-01/02`):**
   - Fala literal protegida `dlg_m02_001` (`Lis`: *«Era a estrada de casa. Agora procuro onde esconder a cabeça.»*) e catálogo `bz39_c01_01`..`bz39_c05_01` com prioridades `0/1/2` (onde prioridade `0` interrompe imediatamente falas de menor prioridade).
   - Interação de giz branco na Cena **C04 (Pomar e Água)**: aproximar-se de `DE-A14` (`WOUNDED_UNARMED`) e premir `[E]` marca o poste do pomar com giz branco (`m02.pomar_wounded_marked = true`, `bz39_c04_03`); disparar sobre o ferido desarmado regista `m02.fired_on_wounded = true` e aciona imediatamente a reação de prioridade `0` de `Gruca` (`bz39_c04_05`: *«Baixe a arma. Ele já não combate.»*).
   - Checkpoints semânticos `cp_m02_a_preparacao` e `cp_m02_b_acesso` com validação em duas fases (`validateM02Snapshot`, `SAVE-01`, `SAVE-02`).

---

## 3. Ficheiros Criados / Modificados na M02 vs. Ficheiros Reutilizados da M01

### Ficheiros Exclusivos da M02
- `missions/m02-bzura/m02-01-quinta-layout.json` — Catálogo espacial declarativo da quinta (`100 × 150 m`), `coverNodes`, `polishSquad` (`7` aliados) e `enemyRosterEA1` (`10` defensores).
- `src/world/m02-quinta-world.js` — Mundo físico/balístico `M02QuintaWorld`, `BALLISTIC_MATERIAL_POLICY`, cercas destrutíveis (`fenceStates`), adaptador `navWorld` e `applyExplosionDamageToWorld`.
- `src/game/m02-combat-ai.js` — IA tática da secção polaca (`updatePolishSquad`), IA da guarnição alemã (`updateGermanGarrison`), navegação A* com fila de porta (`stepActorNavigation`), armas (`WEAPON_PROFILES`) e diretor de diálogos (`M02DialogueDirector`).
- `src/game/m02-01-simulation.js` — Simulação determinística `M02BenchSimulation` e validador `validateM02Snapshot`.
- `src/render/m02-01-renderer.js` — Renderizador Three.js `M02BenchRenderer` (edifícios, telhados com empenas, cercas dinâmicas, poste C04 com giz, soldados polacos e alemães articulados, granadas e traçantes).
- `src/m02/m02-01-main.js` e `m02-01.html` — Controlador interativo, HUD tático, legendas de diálogo e API `window.m02Bench`.
- `tools/m02/run-m02-01.mjs` e `tools/m02/playwright-m02-01.config.js` — Ferramentas de execução e teste browser isoladas.
- `tests/m02-01-quinta-geometry-ballistics.test.js` — Suite determinística Node da M02-01 (`7` testes).
- `tests/m02-02-combat-squad-ai.test.js` — Suite determinística Node da M02-02 (`8` testes: `AI-01..04`, `COM-01..03`, `OBJ-01`, `SAVE-01/02`).
- `tests/browser/m02-01-quinta.spec.js` — Suite Playwright em browser real (`9` capturas PNG + telemetria nos 3 perfis).

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

## 4. Como Executar e Testar a M02-01 e M02-02

1. **Iniciar a experiência interativa no navegador:**
   ```bash
   node tools/m02/run-m02-01.mjs
   # Abrir http://127.0.0.1:4173/COD-guerra/m02-01.html
   ```
2. **Executar toda a suite determinística Node (`19` testes):**
   ```bash
   node --test tests/m02-01-quinta-geometry-ballistics.test.js tests/m02-02-combat-squad-ai.test.js tests/m01-simulation-boundary.test.js tests/assets-manifests.test.js
   ```
3. **Executar a verificação em navegador real (Playwright):**
   ```bash
   npx playwright test -c tools/m02/playwright-m02-01.config.js tests/browser/m02-01-quinta.spec.js
   ```

---

## 5. O Que a Etapa Seguinte (M02-03 — Área A Completa, Cena C01 e Horizonte Vivo N2) Deve Fazer

1. **Integrar o Prólogo em Marcha (`C01 — Estrada de Orvalho`, `Z = -220..0 m`) à entrada norte da quinta:**
   - Ligar a coluna em marcha na estrada húmida ao ponto de contacto inicial (`SN1`, `cp_m02_a_preparacao`), incluindo os soldados `DE-A01..DE-A04` da linha avançada da estrada.
2. **Ativar a Camada de Horizonte Vivo (`N2`, Documento H):**
   - Adicionar eventos distantes sincronizados (`L2`/`L3`: clarões e fumo de artilharia no corredor de Łęczyca/Tum com atraso acústico físico `d / 340 m/s`), respeitando o orçamento de `<= 10%` do frame e `0` impacto balístico no combate local.
3. **Preparar a transição `T-AB` (`cp_m02_b_acesso`) para a Área B (Acessos de Łęczyca):**
   - Consumir o estado persistido em `cp_m02_b_acesso` (`flags`, munição de Piotr e estado de `Małek`/`Wierzba`) na abertura da Área B.
