# M02 — HANDOFF TÉCNICO E HISTÓRICO (MISSÃO M02 COMPLETA: ETAPAS M02-01 A M02-05 E MATRIZ TOTAL O2/O3)

## 1. Identificação das Etapas Concluídas

- **Missão:** M02 — Batalha do Bzura, Polónia, 9–12 de setembro de 1939 (e epílogo em Varsóvia, 25 de setembro de 1939)
- **Etapas concluídas (100% da M02 e Matriz Total de Aceitação):**
  - **M02-01 — Bancada jogável e independente da quinta de 100 × 150 m (N0 Geometria e Balística)** (`bef32e8`)
  - **M02-02 — Combate da Quinta e Avanço de Secção (N1 Combate Causal · Cenas C02–C04)** (`41d990d`)
  - **M02-03 — Área A Completa (Cena C01 Estrada de Orvalho + Encontro EA0 + Horizonte Vivo N2 + Transição `T-AB` para Área B)** (`df47781`)
  - **M02-04 — Área B Completa (Corredor Logístico nos Acessos de Łęczyca · Cenas C06–C08 · Encontro `EB1` `DE-B01..DE-B12` · Set Piece `SP02 — A Carroça Não Passa Sozinha` · Reorganização `TR02` e Checkpoint `cp_m02_c_reorganizacao`)** (`bca39bd`)
  - **M02-05 — Área C Completa, Epílogo C12 e Ponte de Campanha M02→M03 (Passagem e Socorro nos Acessos de Leśmierz · Cenas C09–C12 · Encontros `EC1` `DE-C01..DE-C08` e `EC2` `DE-C09..DE-C20` · Set Piece `SP03 — Um Último Atravessamento` · 3 Resultados de `Lis` · Checkpoint `cp_m02_d_cobertura_retirada` · Epílogo `TR04/TR05` e Exportação `M02→M03`)** (`bca39bd`)
  - **M02-06 — Direção Audiovisual, Acessibilidade, Setores de Horizonte e Matriz O2/O3 Completa (Documento L · `AV-01/02`, `MAP-03`, `HZ-01..03`, `SAVE-01`, `O3` Auditoria de 12 Sementes)**
- **Ramo Git:** `gemini/m02-01-quinta`
- **Commit base (candidata M01 PR #80 + PR #91 integrado):** `3c8e576dfdfefa7a2158a50dffb74fed4695385f`
- **Interferência na M01 / `main`:** **Zero** (`0` ficheiros da M01 modificados; `0` merges em `main`).

---

## 2. O Que as Etapas M02-01 a M02-06 Implementaram

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
3. **Cena C05 — Deslocação e Transição Semântica `T-AB` (`NAR-01`):**
   - `triggerTransitionTAB({ skip: false | true })` transita para `T1` (`«Acessos de Łęczyca — noite de 9 para 10 de setembro»`), aciona `bz39_c05_01` e produz um `transitionTABPayload` 100% idêntico quer a cena seja assistida (`skip: false`) quer saltada (`skip: true`).

### 2.4. M02-04 — Área B Completa: Acessos de Łęczyca, Encontro `EB1`, `SP02 — A Carroça Não Passa Sozinha` e Reorganização `TR02` (`STREAM-01`, `PERF-02`)
1. **Streaming por Células (`src/world/m02-zone-streamer.js` — `STREAM-01`, `PERF-02`):**
   - `M02ZoneStreamer` gere as células `A`, `B` e `C` com limite estrito `MAX_RESIDENT_CELLS = 2` (`residentCellsCount <= 2`) e descarga explícita das células anteriores (`disposedCellsCount`).
2. **Célula B (`180 × 240 m` · `B05`–`B08`) e Encontro `EB1` (`12` defensores `DE-B01..DE-B12`):**
   - **B05 — Casa-oficina (`16 × 11 m`)**, **B06 — Loja de esquina (`12 × 9 m`)**, **B07 — Telheiro de carroças (`15 × 7 m`)** navegáveis; **B08 — Habitação fechada (`10 × 8 m`)** opaca, sem portas nem interior oco (`0` portas).
   - `enterAreaBC06()` posiciona Piotr em `(0, 78)`, carrega `DE-B01..DE-B12` (`EB1`), ativa `T1` (`night_1939_09_09`) e dispara `bz39_c06_01` e `bz39_c06_02`.
3. **Set Piece `SP02 — A Carroça Não Passa Sozinha` e Cena C07 (`TR02` · `cp_m02_c_reorganizacao`):**
   - A carroça logística (`supplyCart`) aguarda em `(0, 62)` (`WAITING_CLEAR_CORRIDOR`) enquanto `B05`/`B06` mantêm fogo direto; quando o corredor é suprimido/limpo, avança até `(0, -48)` e entrega `vol_water` e `vol_ammo` (`m02.supply_reached = 2`).
   - Se a roda for danificada (`damageCartWheel()`), a carroça passa a `IMMOBILIZED`, dispara `bz39_c06_03` e `bz39_c06_04`, e liberta os volumes para transporte manual (`pickupSupplyVolume`, `deliverSupplyVolume`, `loseSupplyVolume`), suportando entrega parcial (`1` volume) ou nula (`0` volumes) e rejeitando portadores duplicados/circulares (`SAVE-02`).
   - `completeC07Reorganization()` aplica a transição `TR02` (`T2 · 10 de setembro de 1939 — manhã`), repõe reserva de munição (`+15` se `ammoDelivered`) e saúde limitada (`+10` até máx. `85` se `waterDelivered`, sem cura mágica a `100%`), evacua baixas graves sem ressurreição mágica e grava o 3.º checkpoint canónico `cp_m02_c_reorganizacao`.

### 2.5. M02-05 — Área C Completa: Acessos de Leśmierz, Encontros `EC1/EC2`, `SP03`, Socorro de `Lis`, Epílogo `C12` e Ponte `M02→M03` (`NAR-02`, `HIST-TEST-01`)
1. **Cena C08 (`TR03`), Célula C (`200 × 200 m` · `B09`–`B12`) e Encontro `EC1` (`8` defensores `DE-C01..DE-C08`):**
   - `enterAreaCC09()` destaca `Lis` para ligação fora da célula (`detachedOutOfCell = true`, `state = 'LIAISON_OUTSIDE_CELL'`), comuta para a Célula `C` em `T3` (`afternoon_1939_09_10`), carrega **B09 — Armazém agrícola (`22 × 12 m`)**, **B10 — Oficina mecânica (`14 × 10 m`)**, **B11 — Portaria e muro (`6 × 5 m`)** e **B12 — Casa de socorro e abrigo de bombas (`12 × 9 m` com 2 macas)**, e posiciona os `8` defensores finitos de `EC1`.
2. **Cena C10 (`A Ordem Muda`), Encontro `EC2` (`12` reservas `DE-C09..DE-C20`) e `SP03 — Um Último Atravessamento`:**
   - `startC10OrderChanges()` dispara a fala literal protegida `dlg_m02_002` (`Gruca`: *«O grupo da direita recuou. Nossa ordem mudou.»*), adiciona as `12` reservas finitas de `EC2` (perfazendo **exatamente `46` hostis identificados na missão inteira**: `EA0(4) + EA1(10) + EB1(12) + EC1(8) + EC2(12) = 46`), agenda o aviso de `6.0 s` do impacto fixo de artilharia e grava o 4.º checkpoint canónico `cp_m02_d_cobertura_retirada`.
   - `detonateC10FixedArtillery()` detona nas coordenadas fixas `(4, 0, 18)` (nunca deslocadas para perseguir ou poupar o jogador), bloqueia fisicamente a rua exterior (`corridorExteriorBlocked = true`) e força os `12` soldados do último grupo (`LG01..LG12`, incluindo `2` feridos iniciais `LG03` e `LG09`) a atravessar pela nave de `B09` rumo à Casa de Socorro `B12`.
3. **Cena C11 (`Lis e o Último Grupo`), Cena C12 (`Epílogo`) e Ponte de Campanha `M02→M03` (`NAR-02`, `HIST-TEST-01`):**
   - Em `C11`, `Lis` regressa da ligação já atingido por estilhaço fora da célula (`WOUNDED_LIAISON`), sem duplicar a instância de `Lis`.
   - Ao socorrer/contactar `Lis` (`assistLisInC11`), Piotr profere a fala literal protegida `dlg_m02_003` (*«Você vem conosco. A arma eu levo.»*).
   - Os **3 estados possíveis de `m02.lis_status`** (`wounded_evacuated`, `wounded_walking`, `missing`) propagam-se de forma estrita para `C12` e para o pacote `exportCampaignResultToM03()` (`cod-guerra-campaign-bridge-m02-to-m03-v1`):
     - `wounded_evacuated` ou `wounded_walking`: `Lis` profere `bz39_c12_01` em `C12` e entra no abrigo inicial da **M03 (Varsóvia, 25 de setembro de 1939)** apto a proferir a fala canónica da água (*«Guarda um pouco de água. Todos precisam.»*), mas nunca curado para patrulha normal (`combatCapableNormalPatrol: false`).
     - `missing`: `Lis` nunca fala em `C12` nem na `M03` (`canSpeakCanonicalWaterLine: false`), e `Wierzba` profere `bz39_c12_02` (*«Lis…»*).
   - `HIST-TEST-01`: Todas as cartelas (`TR01..TR05`), diálogos e metadados históricos preservam a ofensiva polaca em 9–10 de setembro (`generalRetreatOnMorningSept10: false`) e situam a inflexão operacional em 12–13 de setembro.

### 2.6. M02-06 — Direção Audiovisual, Acessibilidade, Setores do Horizonte e Matriz O2/O3 (`AV-01`, `AV-02`, `MAP-03`, `HZ-01..03`, `O3`)
1. **Cinemática de Desobstrução da Arma (`WEAPON_CLEARANCE_DIST_M = 0.78` · `AV-01`):**
   - Raycast de desobstrução impede que o cano do `wz. 29` penetre paredes ou caixilhos de portas. Ao aproximar-se a `< 0.78 m`, o estado passa a `LOWERED_NEAR_OBSTACLE`, inclinando a arma para baixo (`lowerPitchRad > 0`) e puxando-a para trás (`pullBackM > 0`). Ao afastar-se para `>= 0.78 m`, regressa imediatamente a `READY`.
   - Recuperação física suave do coice (`recoilPitchRad`, `recoilKickBackM`) com atenuação tática de `0.68x` na postura agachada.
2. **Acústica Balística por Material e Áudio Espacial a 3 Escalas (`MATERIAL_IMPACT_AUDIO_MAP` · `AV-01`):**
   - Mapeamento estrito por material: terra húmida (`sfx_impact_earth_wet_thud`), pedra (`sfx_impact_stone_ricochet`), alvenaria (`sfx_impact_brick_masonry`), madeira estrutural/fina (`sfx_impact_wood_*`), vidro (`sfx_impact_glass_shatter`), metal (`sfx_impact_metal_ping`) e corpo orgânico (`sfx_impact_cloth_body`). O impacto em terra **nunca** gera ping metálico (`isMetallic: false`).
   - Roteamento espacial em 3 escalas: `< 12 m` (`close_mechanical`), `12..140 m` (`tactical_encounter`), `> 140 m` (`distant_operation`) com atraso acústico físico `d / 343 m/s` (exceto avisos críticos de interface com atraso zero).
   - Oclusão acústica real: linha de vista direta (`gain: 1.0`, `18000 Hz`), através de porta fechada (`gain: 0.52`, passa-baixo `1400 Hz`), através de parede sólida de tijolo/pedra (`gain: 0.28`, passa-baixo `680 Hz`).
3. **Diretor de Acessibilidade e Desacoplamento Tático (`AV-02`):**
   - Opções configuráveis: legendas ativas, indicadores de ameaça direcionais (com azimute angular e expiração após `2.2 s`), gama dinâmica reduzida (ganho comprimido em `[0.38, 0.75]`), intensidade de zumbido `tinnitusIntensity` (`0.0..1.0`), vibração de câmara reduzida (`amplitudeRad <= 0.008 rad`) e violência reduzida.
   - Desacoplamento estrito: as opções de acessibilidade nunca alteram dano balístico, vida do jogador, caixas de colisão de inimigos ou regras de progressão de objetivos.
4. **Desobstrução da Rota de Macas (`MAP-03`):**
   - Raycast contínuo da rota de maca (`evacRoute`) de `B09` até `B12` a passo de `0.5 m` com largura útil de `0.9 m` (`±0.45 m` de folga lateral), comprovando **`0` colisões** com paredes sólidas ou obstáculos intransponíveis.
5. **Setores Distantes de Guerra e Idempotência (`HZ-01..03`):**
   - Setor `HS-B1` (combate urbano em Łęczyca: `LOCALIZED_FIRE` → `REDUCED_INTENSITY` → `POLISH_OCCUPATION`).
   - Setor `HS-C1` (grupo de flanco direito `LG01..LG12`: `ADVANCE` → `UNDER_PRESSURE` → `RETREAT_TO_CORRIDOR`).
   - Setor `HS-C2` (impacto fixo de artilharia `art_hsc2_01`: `READY` → `WARNING` → `IMPACTED` → `RESIDUAL_DUST_DAMAGE`), com sincronização de cratera/destroços (`syncAreaCWorldDamage`) e garantia de que o impacto não se repete ao restaurar checkpoints.
6. **Auditoria de Stress de Clímax em 12 Sementes (`O3` · Sementes `19390909..19390920`):**
   - 12 execuções determinísticas do fluxo completo de missão (`A → B → C → C12 → M03`): 100% de sucesso, sem deadlocks, sem coordenadas NaN e sem exceções.

---

## 3. Matriz Completa de Aceitação M02 (`O2` e `O3`)

| Identificador | Requisito Canónico | Ficheiro de Teste | Estado |
|---|---|---|---|
| `HIST-TEST-01` | Invariante Histórica: manhã de 10 Set não é retirada geral do Exército Poznań | `tests/m02-04-05-areas-bc-completion.test.js` | **PASS (100%)** |
| `HIST-TEST-02` | Cartelas históricas e inflexão em 12–13 Setembro | `tests/m02-04-05-areas-bc-completion.test.js` | **PASS (100%)** |
| `MAP-01` | Navegação da Quinta 100 × 150 m, Rota A (Vala) e Rota B (Pomar) | `tests/m02-01-quinta-geometry-ballistics.test.js` | **PASS (100%)** |
| `MAP-02` | Balística por material, caixilhos, vidros quebráveis e copas de árvores | `tests/m02-01-quinta-geometry-ballistics.test.js` | **PASS (100%)** |
| `MAP-03` | Rota de maca desobstruída a ±0,45 m (largura útil ≥ 0,9 m) de B09 a B12 | `tests/m02-06-audiovisual-accessibility-full-matrix.test.js` | **PASS (100%)** |
| `AI-01` | Secção polaca com causalidade real e progressão sem Piotr exposto | `tests/m02-02-combat-squad-ai.test.js` | **PASS (100%)** |
| `AI-02` | Percepção honesta alemã sem wallhack e com esquecimento após 6s | `tests/m02-02-combat-squad-ai.test.js` | **PASS (100%)** |
| `AI-03` | Fila única por portal e abertura automática de portas | `tests/m02-02-combat-squad-ai.test.js` | **PASS (100%)** |
| `AI-04` | Guarnição alemã finita, sem spawns nas costas ou infinitos | `tests/m02-02-combat-squad-ai.test.js` | **PASS (100%)** |
| `COM-01` | Recarga, ciclo de culatra e dispersão balística de wz. 29 | `tests/m02-02-combat-squad-ai.test.js` | **PASS (100%)** |
| `COM-02` | Granada wz. 33 causal, oclusão por parede sólida e brecha de cerca | `tests/m02-02-combat-squad-ai.test.js` | **PASS (100%)** |
| `COM-03` | Falas literais protegidas (`dlg_m02_001..003`), ferido persistente e giz branco | `tests/m02-02-combat-squad-ai.test.js` | **PASS (100%)** |
| `OBJ-01` | Progressão imediata de objetivos orientada a estado | `tests/m02-02-combat-squad-ai.test.js` | **PASS (100%)** |
| `NAR-01` | Transição T-AB idêntica quer seja assistida ou saltada | `tests/m02-03-area-a-horizon-c01.test.js` | **PASS (100%)** |
| `NAR-02` | Epílogo C12 e fala de Varsóvia condicionados ao estado de Lis | `tests/m02-04-05-areas-bc-completion.test.js` | **PASS (100%)** |
| `SAVE-01` | Restauro exato de checkpoints sem mutação em snapshots corrompidos | `tests/m02-02-combat-squad-ai.test.js` | **PASS (100%)** |
| `SAVE-02` | Anti-duplicação de inventário e portadores de caixas de suprimento | `tests/m02-04-05-areas-bc-completion.test.js` | **PASS (100%)** |
| `HZ-01` | 8 setores angulares de 45° cobrindo 360° no Horizonte Vivo N2 | `tests/m02-03-area-a-horizon-c01.test.js` | **PASS (100%)** |
| `HZ-02` | Promoção/demoção L2 <-> L1 de HS-A1 com histerese de 15% | `tests/m02-03-area-a-horizon-c01.test.js` | **PASS (100%)** |
| `HZ-03` | Atraso acústico d/343 m/s e eventos finitos de horizonte (HS-A2/A3/B1/C1/C2) | `tests/m02-06-audiovisual-accessibility-full-matrix.test.js` | **PASS (100%)** |
| `AV-01` | Cinemática de desobstrução (0,78 m), coice e acústica balística por material | `tests/m02-06-audiovisual-accessibility-full-matrix.test.js` | **PASS (100%)** |
| `AV-02` | Acessibilidade completa sem alterar parâmetros de combate | `tests/m02-06-audiovisual-accessibility-full-matrix.test.js` | **PASS (100%)** |
| `STREAM-01` | Streaming por células com limite estrito de ≤ 2 células residentes | `tests/m02-04-05-areas-bc-completion.test.js` | **PASS (100%)** |
| `PERF-01` | Performance em browser real: 60+ FPS, draw calls < 700, triângulos < 140k | `tests/browser/m02-01-quinta.spec.js` | **PASS (62.5 FPS)** |
| `PERF-02` | Tempo de simulação p50 < 4 ms (medido: 0.5 ms) | `tests/browser/m02-01-quinta.spec.js` | **PASS (0.5 ms)** |
| `REG-01` | Zero regressões ou alterações nos ficheiros da missão M01 | `git diff --stat` | **PASS (0 bytes M01)** |
| `O3` | Auditoria de Clímax em 12 Sementes (19390909..19390920) com 100% determinismo | `tests/m02-06-audiovisual-accessibility-full-matrix.test.js` | **PASS (12/12 sementes)** |

---

## 4. Ficheiros Criados / Modificados na M02 vs. Ficheiros Reutilizados da M01

### Ficheiros Exclusivos da M02
- `missions/m02-bzura/m02-01-quinta-layout.json` — Catálogo espacial declarativo da Área A (`100 × 150 m` + corredor `C01` até `Z = -210 m`), `coverNodes`, `polishSquad` (`7` aliados), `enemyRosterEA0` (`4` defensores) e `enemyRosterEA1` (`10` defensores).
- `missions/m02-bzura/m02-cells-bc-layout.json` — Catálogo espacial declarativo da Célula B (`B05..B08`, `supplyCart`, `cartRoute`, `enemyRosterEB1` com `12` defensores) e da Célula C (`B09..B12`, `artilleryFixedImpact`, `evacRoute`, `enemyRosterEC1` com `8` defensores, `enemyRosterEC2` com `12` reservas e `lastGroupRoster` `LG01..LG12`).
- `src/world/m02-quinta-world.js` — Mundo físico/balístico `M02QuintaWorld`, `BALLISTIC_MATERIAL_POLICY`, cercas destrutíveis (`fenceStates`), adaptador `navWorld` e `applyExplosionDamageToWorld`.
- `src/world/m02-zone-streamer.js` — Streamer espacial `M02ZoneStreamer` (`MAX_RESIDENT_CELLS = 2`, `preloadCell`, `switchToCell`, `getStreamingMetrics`) e conversor `buildCellWorldLayout`.
- `src/world/m02-horizon-system.js` — Diretor determinístico do Horizonte Vivo `N2` (`M02HorizonDirector`, `HORIZON_SECTORS_360`, `M02_TEMPORAL_STATES`, `HS-A1..A3`, `HS-B1`, `HS-C1..C2`, atraso acústico `d / 343 m/s` e histerese `L2 <-> L1`).
- `src/game/m02-combat-ai.js` — IA tática da secção polaca (`updatePolishSquad`), IA da guarnição alemã (`updateGermanGarrison`), navegação A* com fila de porta (`stepActorNavigation`), armas (`WEAPON_PROFILES` incluindo `mp38`) e diretor de diálogos (`M02DialogueDirector` com `C01–C12` e `dlg_m02_001..003`).
- `src/game/m02-acts-director.js` — Diretor dos Atos III–V (`enterAreaBC06`, `damageCartWheel`, `pickupSupplyVolume`, `deliverSupplyVolume`, `loseSupplyVolume`, `updateAreaB`, `completeC07Reorganization`, `enterAreaCC09`, `unlockC09GateLatch`, `startC10OrderChanges`, `detonateC10FixedArtillery`, `syncAreaCWorldDamage`, `startC11LisAndLastGroup`, `assistLisInC11`, `updateAreaC`, `completeC12Epilogue`, `exportCampaignResultToM03`).
- `src/game/m02-audiovisual-director.js` — Diretor determinístico de direção audiovisual e acessibilidade (`M02AudiovisualDirector`, `WEAPON_CLEARANCE_DIST_M`, `MATERIAL_IMPACT_AUDIO_MAP`, oclusão por porta/parede, indicadores direcionais e opções de acessibilidade).
- `src/game/m02-01-simulation.js` — Simulação determinística `M02BenchSimulation` e validador `validateM02Snapshot` (`SAVE-01`, `SAVE-02`).
- `src/render/m02-01-renderer.js` — Renderizador Three.js `M02BenchRenderer` com suporte para comutação dinâmica entre Células A, B e C, carroça logística e caixas de suprimento (`vol_water`/`vol_ammo`), cratera/fumo de `SP03` e grupo de evacuação `LG01..LG12`.
- `src/m02/m02-01-main.js` e `m02-01.html` — Controlador interativo, HUD tático, atalhos `0–9` e `M`, cartelas históricas, legendas de diálogo e API `window.m02Bench`.
- `tools/m02/run-m02-01.mjs` e `tools/m02/playwright-m02-01.config.js` — Ferramentas de execução e teste browser isoladas.
- `tests/m02-01-quinta-geometry-ballistics.test.js` — Suite determinística Node da M02-01 (`7` testes).
- `tests/m02-02-combat-squad-ai.test.js` — Suite determinística Node da M02-02 (`8` testes).
- `tests/m02-03-area-a-horizon-c01.test.js` — Suite determinística Node da M02-03 (`5` testes).
- `tests/m02-04-05-areas-bc-completion.test.js` — Suite determinística Node da M02-04 e M02-05 (`5` testes).
- `tests/m02-06-audiovisual-accessibility-full-matrix.test.js` — Suite determinística Node de Audiovisual, Acessibilidade e Matriz Total (`7` testes: Boundary Guard, `AV-01`, `AV-02`, `MAP-03`, `HZ-01..03`, `O3` 12-seed stress).
- `tests/browser/m02-01-quinta.spec.js` — Suite Playwright em browser real (`16` capturas PNG cobrindo `M02-01` a `M02-06` + telemetria nos 3 perfis).

### Ficheiros Reutilizados da M01 (`0` Bytes Alterados)
- `src/world/m01-player-physics.js`, `src/world/m01-navigation.js`, `src/world/m01-collision-layout.js`, `src/world/spatial.js`, `src/game/wz29.js`, `src/render/m01-lod-policy.js`, `src/core/random.js`, `src/config.js`.

---

## 5. Como Executar e Testar a Missão M02 Completa

1. **Iniciar a experiência interativa no navegador:**
   ```bash
   node tools/m02/run-m02-01.mjs
   # Abrir http://127.0.0.1:4173/COD-guerra/m02-01.html
   ```
2. **Executar toda a suite determinística Node (`32` testes):**
   ```bash
   node --test tests/m02-01-quinta-geometry-ballistics.test.js tests/m02-02-combat-squad-ai.test.js tests/m02-03-area-a-horizon-c01.test.js tests/m02-04-05-areas-bc-completion.test.js tests/m02-06-audiovisual-accessibility-full-matrix.test.js
   ```
3. **Executar a verificação em navegador real (Playwright):**
   ```bash
   npx playwright test -c tools/m02/playwright-m02-01.config.js tests/browser/m02-01-quinta.spec.js
   ```
