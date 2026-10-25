# M02 — HANDOFF TÉCNICO E HISTÓRICO (ETAPA M02-01)

## 1. Identificação da Etapa

- **Missão:** M02 — Batalha do Bzura, Polónia, 9–12 de setembro de 1939
- **Etapa concluída:** **M02-01 — Bancada jogável e independente da quinta de 100 × 150 m**
- **Ramo Git:** `gemini/m02-01-quinta`
- **Commit base (candidata M01 PR #80 + PR #91 integrado):** `3c8e576dfdfefa7a2158a50dffb74fed4695385f`
- **Interferência na M01 / `main`:** **Zero** (0 ficheiros da M01 modificados; 0 merges em `main`).

---

## 2. O Que a M02-01 Implementou

1. **Envelope Espacial de 100 × 150 m (`X: -50..+50 m`, `Z: -90..+60 m`, origem `(0,0,0)` no pátio):**
   - **B01 — Casa rural da família ausente (`X: -40..-26, Z: -18..-8`, `14 × 10 m`):** 5 divisões interiores navegáveis (`cozinha`, `despensa`, `sala`, `quarto_oeste`, `quarto_este`), 6 portas funcionais com dobradiça e estado `open`/`closed`, 4 janelas reais (2 abertas, 2 com vidro quebrável `intact` → `broken`), mobiliário de cobertura interior (fogão de alvenaria, mesa, duas camas).
   - **B02 — Celeiro do portão norte (`X: 12..36, Z: -38..-24`, `24 × 14 m`):** interior navegável, portão norte aberto de `3.0 m`, porta sul funcional de `1.2 m` (`initialState: closed`), abertura oeste de tiro de metralhadora (`win_b02_west_mg`, `X = 12, Z = -30`), 4 pilares estruturais de madeira (`wood_thick`), coberturas internas (sacos, feixes, palha, carroça, bancada MG34) e posição simulada de MG34 (`de_b02_mg34`) para validação de linha de fogo e oclusão.
   - **B03 — Estábulo (`X: 20..38, Z: 0..12`, `18 × 12 m`):** corredor central norte–sul com portas abertas de `2.4 m` e janela alta oeste, validando o flanco leste/sul.
   - **B04 — Forno e anexo (`X: -37..-29, Z: 20..26`, `8 × 6 m`):** porta sul aberta, forno de alvenaria interior e pilha de lenha exterior para cobertura.
2. **Duas Rotas Táticas Completas e Comutáveis:**
   - **Rota A — Vala Húmida (`(0,-80) → (-45,-70) → (-45,-5) → (-24,0) → (-15,-8) → (0,-24)`):** depressão física real no terreno (`Y = -1.10 m`), rampas suaves de entrada e saída e talude leste (`ditch_east_lip_north`/`south`) que bloqueia o fogo da MG34 do Celeiro B02 enquanto o jogador avança agachado ou de pé na vala.
   - **Rota B — Pomar e Flanco Leste/Sul (`(0,-80) → (43,-55) → (43,27) → (8,42) → (0,20) → (0,-24)`):** flanco leste com micro-relevo agrícola e pomar sul (`7` macieiras onde apenas o tronco estreito de madeira `wood_thick` bloqueia projéteis e movimento, enquanto a copa `foliage` funciona exclusivamente como oclusão visual sem bloquear tiros como se fosse parede).
3. **Balística Por Material (`BALLISTIC_MATERIAL_POLICY`) e Aberturas Reais (`MAP-02`):**
   - Segmentação automática de todas as paredes em torno de portas e janelas: cada janela gera ombreiras (`window_frame`), peitoril (`window_sill`) e verga (`window_lintel`) físicos; cada porta gera batentes (`door_frame`), verga (`door_lintel`) e folha móvel (`door_leaf`) ativa apenas quando `state === 'closed'`.
   - Vidros intactos (`glass`) partem no primeiro disparo (`glassBrokenId`) e deixam passar os disparos seguintes.
4. **Perfis Gráficos Escaláveis e Telemetria (`src/render/m02-01-renderer.js`):**
   - Perfis `high` (Máxima), `medium` (Equilibrada) e `low` (Otimizada) integrados com `selectConsumerLod` de `src/render/m01-lod-policy.js`, garantindo que coberturas, paredes, portas, janelas e alvos nunca são ocultados.
   - Telemetria real medida em Chromium Headless (`1280 × 720`, Linux `aarch64`, WebGL por software SwiftShader):
     - **Perfil `high` (Máxima):** `simMs p50 = 0.5 ms`, `renderMs p50 = 20.3 ms`, `drawCalls = 320`, `triangles = 23 245`
     - **Perfil `medium` (Equilibrada):** `simMs p50 = 0.6 ms`, `renderMs p50 = 23.3 ms`, `drawCalls = 320`, `triangles = 23 245`
     - **Perfil `low` (Otimizada):** `simMs p50 = 0.5 ms`, `renderMs p50 = 12.1 ms`, `drawCalls = 190`, `triangles = 21 069`

---

## 3. Ficheiros Criados vs. Ficheiros Reutilizados da M01

### Ficheiros Novos Criados (Exclusivos da M02-01)
- `missions/m02-bzura/m02-01-quinta-layout.json` — Catálogo espacial declarativo da quinta de 100 × 150 m.
- `src/world/m02-quinta-world.js` — Mundo físico/balístico `M02QuintaWorld` e `BALLISTIC_MATERIAL_POLICY`.
- `src/game/m02-01-simulation.js` — Simulação determinística `M02BenchSimulation` (sem DOM/Three.js/`Math.random`/`Date.now`).
- `src/render/m02-01-renderer.js` — Renderizador Three.js `M02BenchRenderer` com perfis gráficos, presets de iluminação e telemetria.
- `src/m02/m02-01-main.js` — Controlador interativo e API de inspeção `window.m02Bench`.
- `m02-01.html` — Ponto de entrada independente da bancada M02-01.
- `tools/m02/run-m02-01.mjs` — Script de arranque isolado da bancada.
- `tools/m02/playwright-m02-01.config.js` — Configuração Playwright isolada para verificação browser da M02-01.
- `tests/m02-01-quinta-geometry-ballistics.test.js` — Suite determinística Node (`MAP-01`, `MAP-02`, fronteira de simulação e snapshots).
- `tests/browser/m02-01-quinta.spec.js` — Suite Playwright em browser real com capturas `SN1–SN5` + interior `B01` e telemetria.
- `docs/m02/M02_HANDOFF.md` — Este documento de handoff.

### Ficheiros Reutilizados da M01 (Sem Qualquer Modificação — 0 Bytes Alterados)
- `src/world/m01-player-physics.js` (`movePlayer`, `PLAYER_PHYSICS`)
- `src/world/m01-collision-layout.js` (`indexSolids`, `queryNearbySolids`)
- `src/world/spatial.js` (`eyePosition`, `aimDirection`, `muzzlePosition`, `traceShot`, `traceObstruction`, `visible`)
- `src/game/wz29.js` (`Wz29`)
- `src/render/m01-lod-policy.js` (`selectConsumerLod`, `selectLodBand`)
- `src/core/random.js` (`Random`)
- `src/config.js` (`EYE_HEIGHT`)

---

## 4. Como Executar e Testar a M02-01

1. **Iniciar a bancada interativa no navegador:**
   ```bash
   node tools/m02/run-m02-01.mjs
   # Abrir http://127.0.0.1:4173/COD-guerra/m02-01.html
   ```
2. **Executar os testes unitários e balísticos determinísticos (Node):**
   ```bash
   node --test tests/m02-01-quinta-geometry-ballistics.test.js
   ```
3. **Executar os testes de fronteira e manifestos da M01 + M02-01:**
   ```bash
   node --test tests/m01-simulation-boundary.test.js tests/assets-manifests.test.js tests/m02-01-quinta-geometry-ballistics.test.js
   ```
4. **Executar a verificação em navegador real (Playwright):**
   ```bash
   npx playwright test -c tools/m02/playwright-m02-01.config.js
   ```

---

## 5. Auditoria das Lições da M01 e Reconciliação Documental (Pacote A–Q vs. PR #58)

| Domínio / Lição da M01 (Relatórios A–E, PR #80/#91) | Estado na Base `3c8e576` | Aplicação na M02-01 |
| :--- | :--- | :--- |
| Colisão cápsula vs. OBB/AABB e suporte contínuo de piso | **Corrigido e testado** (`m01-player-physics.js`) | Reutilizado diretamente; validado na vala (`Y = -1.1 m`) e rampas sem quedas bruscas nem bloqueios. |
| Portas e janelas como aberturas físicas e balísticas reais | **Parcial na M01** (foco em pontes/vagões) | **Implementado e testado na M02-01** (`m02-quinta-world.js`): segmentação real de paredes em ombreiras, peitoris, vergas, folhas de porta e vidros quebráveis. |
| Copas de árvores vs. troncos (evitar colisão balística de caixa gigante) | **Corrigido no PR #91** (`b04c5f1`) | **Aplicado de raiz na M02-01**: troncos estreitos (`wood_thick`) em `obstacles`; copas (`foliage`) apenas em `sightBlockers` (oclusão visual, não bloqueiam balas). |
| Fronteira estrita Simulação vs. Apresentação | **Corrigido e testado** (`m01-simulation-boundary.test.js`) | `M02BenchSimulation` e `M02QuintaWorld` são 100% determinísticos e livres de DOM/Three.js. |
| Reconciliação Pacote A–Q (Astra) vs. PR #58 (`7849522`) | Auditado | O PR #58 continha apenas documentação criativa preliminar de campanha (`M02–M30`) sem implementação espacial da quinta. O Pacote A–Q governa a engenharia espacial, histórica e de aceitação (`MAP-01`/`MAP-02`) da M02, preservando a continuidade narrativa de Piotr Sokół, Kruk, Marek, Janek e Nowak. |

---

## 6. Rigor Histórico: Provado vs. Reconstruído vs. Dramatização

- **PROVADO (`[H01]–[H07]`):**
  - Ofensiva do Exército Poznań / 25.ª Divisão de Infantaria / 56.º Regimento de Infantaria polaco iniciada a 9 de setembro de 1939 no setor de Łęczyca / Kwiatkówek / Tum contra elementos da 30.ª DI alemã (`IR 26`).
  - **Regra histórica cumprida:** A M02 representa a ofensiva polaca de 9–12 de setembro de 1939 (e posterior mudança operacional), **nunca** uma retirada geral na manhã de 10 de setembro.
  - Armamento sem anacronismos de 1944–1945: espingarda polaca `kb wz. 29` (`7,92×57 mm`) e posição defensiva alemã `MG34`.
- **RECONSTRUÍDO:**
  - Tipologia arquitetónica da quinta polaca da região de Łęczyca (`B01` casa de alvenaria rebocada de 5 divisões, `B02` celeiro de madeira de 3 vãos, `B03` estábulo com corredor central, `B04` forno exterior, vala de drenagem agrícola e pomar).
- **DRAMATIZAÇÃO / BANCADA DE PRODUÇÃO (Pendências `GEO-01` e `HIST-01`):**
  - A geometria de `100 × 150 m` e as coordenadas locais da bancada são uma composição de level design claramente identificada no código e no HUD como `BANCADA DE PRODUÇÃO · RECONSTRUÍDO`.
  - Não foram inventadas coordenadas GPS/WIG nem subunidades abaixo do 56.º Regimento até fecho documental de `GEO-01` (carta WIG 1:100 000 Pas 41 Słup 29 Łęczyca) e `HIST-01`.

---

## 7. O Que a Etapa Seguinte (M02-02 — Combate da Quinta e Avanço de Secção) Deve Fazer

1. **Integrar a secção polaca e defensores alemães sobre `M02QuintaWorld`:**
   - Instanciar a secção polaca (`sierż. Kruk`, `kpr. Marek`, `strz. Janek`, `strz. Nowak`) e os defensores alemães (`DE-A1-01` a `DE-A1-08`) utilizando a máquina de estados tática (`AdvanceOrder`, `HoldAndSuppress`, `FlankMove`, `ClearRoom`, `FallbackToCover`) definida no Documento M (`M-ARQUITETURA-TECNICA.md`).
2. **Garantir combate real (Proibição de Teatro Falso):**
   - Substituir os alvos estáticos de calibração (`testTargets`) da bancada M02-01 por agentes com munição, percepção por raycast real (`M02QuintaWorld.lineOfSight`), supressão e dano efetivo.
   - Fazer com que a neutralização da MG34 em `B02` ou a limpeza de `B01` pelos aliados ou pelo jogador faça progredir os objetivos (`OBJ-A1` → `OBJ-A5`) por estado real do mundo, sem temporizadores artificiais.
3. **Preservar os contratos validados na M02-01:**
   - Manter `missions/m02-bzura/m02-01-quinta-layout.json` e `src/world/m02-quinta-world.js` como autoridade geométrica e balística da Área A.
