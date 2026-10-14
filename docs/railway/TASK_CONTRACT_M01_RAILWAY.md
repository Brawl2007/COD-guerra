# TASK_CONTRACT — M01 railway production pass

| Campo | Valor |
| --- | --- |
| Contrato | `M01-RAILWAY-PP-01` |
| Emitido por | Vehicle + Railway Art/Engineering Lead, 07/10/2026 |
| Para | Captain (aprovação, decisões D1–D10) → agente executor (arte/engine de apresentação) |
| Base técnica | [`M01_RAILWAY_PRODUCTION_PASS.md`](M01_RAILWAY_PRODUCTION_PASS.md) (diagnóstico, breakdown, LOD, materiais, weathering, danos, fumo, variação, redução de primitivas, critérios) |
| Estado de M01 | Continua **PROTÓTIPO JOGÁVEL** durante e depois deste contrato; o pass não aprova o marco 2 nem o 3 |

## 1. Objectivo

Substituir as caixas/cilindros do trem 963, do Panzerzug 7, dos vagões e das vias de M01 por um kit ferroviário original, com LODs, materiais, weathering, estados de dano/fogo do vagão da estação, fumo da locomotiva e carris reais, dentro do orçamento medido, **sem** alterar gameplay, horários, autoridade da simulação ou composição autoritativa.

## 2. Não-objectivos (recusar se pedido no decorrer do trabalho)

- Qualquer alteração a `src/game/**`, `missions/m01-tczew/mission.json`, `missions/m01-tczew/map-layout.json`, saves/schema, relógios, eventos, posições de fogo, colisão (excepto o pré-requisito D10, feito noutro PR pelo dono da engine).
- Movimento de comboios, desembarque animado de pioneiros, disparo visual do Panzerzug (D4, D6).
- LOD0 da locomotiva e do Panzerzug (D2). Som. Humanos. Ju 87.
- Afirmar classe de locomotiva, tipo de vagão, unidade ou armamento no ecrã ou em texto de jogo (P6/P16 abertas).
- Declarar FPS.

## 3. Pré-requisitos

| # | Pré-requisito | Dono | Estado |
| --- | --- | --- | --- |
| P-1 | Decisões D1–D10 respondidas (ou aceitar as recomendações do documento base) | Captain | pendente |
| P-2 | PR separado: 3 caixas sólidas para `freight_wagons_west` em `TczewWorld.refresh` (ou equivalente), com teste de rota (`node tools/verify-m01-route.mjs`) e regressão em `tests/`; sem isso os vagões do desvio ficam **desligados** no pass | dono da engine (Codex) | pendente |
| P-3 | Branch própria a partir de `main` actualizado; nenhuma alteração concorrente em engine/combate/build (regra de `AGENTS.md`) | executor | — |

## 4. Entregáveis

| # | Entregável | Caminho | Conteúdo mínimo |
| --- | --- | --- | --- |
| E-1 | Gerador reprodutível do kit | `tools/assets/m01-railway/` (`package.json` próprio, `build.mjs`, `src/*.mjs`, `render/capture.mjs`, `README.md`) | Gera todos os GLB e o manifesto a partir de código; sem malhas/texturas de terceiros; padrão de `tools/assets/m01-bridges` e `m01-soldiers` |
| E-2 | Kit GLB | `assets/models/provisional/m01/railway/` | `loco_freight.lod1/lod2.glb`, `tender.lod1/lod2.glb`, `wagon_g.lod0/1/2.glb`, `wagon_o.lod0/1/2.glb`, `wagon_r.lod1/2.glb` (LOD0 opcional), `wagon_g_burning.lod0/1.glb`, `wagon_g_burned.lod0/1.glb`, `panzerzug7.lod1/lod2.glb`, atlas `rail_stock`, `armour`, `rail_track`, `railway.manifest.json` |
| E-3 | Manifesto | `railway.manifest.json` | schemaVersion, convenções (metros, +Y, frente −Z, origem no eixo do carril ao nível do topo do carril), por ficheiro: nós, triângulos, bytes, materiais, texturas, dimensões, certeza (`RECONSTRUCTED`/`INCERTO`) e licença; composição do 963 (65 entradas: tipo, variante, espelho, portas, carga) e do Panzerzug (5 corpos) derivadas da semente fixa |
| E-4 | Módulo de apresentação | `src/render/m01-railway.js` (novo) + edições mínimas em `src/render/m01-view.js` (substituir `createTrains`, chamar o módulo) e `src/render/m01-environment.js` (`buildTracks` → carris extrudidos, travessas a 0,63 m, faixa de lastro, equipamento ferroviário) | Lê só `renderState` (`train963`, `panzerzug`, `destruction`, `battleClock`, `damage`) e `world.features`; LOD por distância com histerese; `InstancedMesh` por tipo/LOD; fallback para as caixas actuais; `dispose()` completo; diagnóstico em `gameDiagnostics().m01` (draw calls e triângulos ferroviários, LOD activo, partículas ferroviárias) |
| E-5 | Fumo/fogo | dentro de E-4, usando `M01Atmosphere.billboardBatch` e o pool existente | Tectos por preset da secção 7 do documento base; prioridade abaixo das demolições; `PointLight` única só em médio/alto |
| E-6 | Teste Node do kit | `tests/m01-railway-glb.test.js` | Critérios B4–B6 do documento base (validade GLB, orçamentos, bounds, contacto roda/carril, comprimento 650 m, não-repetição em janelas de 6) |
| E-7 | Evidência de jogo | `docs/verification/m01-runtime/railway/` (`README.md`, `before/`, `after/`, `report.json`) | Capturas de produção 1280×720 nos presets baixo e médio: secção 04:46 e 04:53 (1 050 m), tabuleiro 06:02 (≈450 m), desvio 50/20/5 m, vagão a arder 04:40 e queimado 06:50, restauro de save; extensão de `tools/capture-m01-visual.mjs` com flag `--railway-only` |
| E-8 | Documentação do kit | `docs/assets/m01-railway/README.md` + PNG do viewer | Tabela LOD/triângulos/draw calls/texturas/bytes, convenções de importação, limitações, o que fica `RECONSTRUCTED` |
| E-9 | Registos | `ASSET_CREDITS.md`, `missions/m01-tczew/ASSETS.md`, `missions/m01-tczew/assets-m01.json` (estados/budgets conforme D1/D2), `DEVELOPMENT_STATUS.md`, `RUNBOOK.md` (comando de captura) | Pequenos, indicados no PR |

## 5. Orçamentos (alvos a medir; registar os valores reais)

| Item | Alvo |
| --- | --- |
| Draw calls ferroviários com tudo visível | ≤12 (hoje 103) |
| Triângulos ferroviários no plano a 1 km | ≤60 k |
| Triângulos ferroviários a 5 m do desvio | ≤40 k |
| LOD0 vagão (desvio) | 4 000–6 000 (D1) |
| LOD1 vagão / locomotiva / Panzerzug | ≤1 500 / ≤8 000 / ≤10 000 |
| LOD2 vagão / locomotiva / Panzerzug (por corpo) | ≤300 / ≤1 500 / ≤800 |
| Atlas | 3 no total; ≤2048² albedo, ≤1024² normal/ORM; versão 1024² para o preset baixo |
| Kit total | ≤6 MB |
| Partículas ferroviárias (baixo/médio/alto) | locomotiva 12/18/24; vagão a arder 20/28/36; nunca reduzem as da demolição |
| Luzes dinâmicas novas | 0 no baixo; 1 no médio/alto |

## 6. Critérios de aceitação

Os 20 critérios da secção 10 do documento base, agrupados: **A** autoridade/dados (1–3), **B** geometria/assentamento (4–7), **C** leitura visual por distância (8–12), **D** orçamento medido (13–16), **E** processo/evidência (17–20). Todos obrigatórios; o Captain pode dispensar apenas C9 (captura no tabuleiro) se o snapshot da retirada não estiver disponível no ambiente, ficando registado como pendente.

Comandos de validação (todos têm de passar antes do PR):

```sh
npm ci
cd tools/assets/m01-railway && npm ci && node build.mjs && cd ../../..
npm test
npm run build
npm run test:browser
npm run assets:m01:colliders -- --check
node tools/verify-m01-route.mjs
CHROME_EXECUTABLE=/caminho/chromium node tools/capture-m01-visual.mjs docs/verification/m01-runtime/railway/after --railway-only
```

## 7. Faseamento sugerido (cada fase com commit próprio e evidência)

| Fase | Trabalho | Saída verificável |
| --- | --- | --- |
| F1 | Gerador + GLB dos vagões (3 tipos, 3 LODs, variantes a arder/queimado) + atlas `rail_stock` + manifesto + teste Node | `npm test` verde; capturas do viewer a 5/20/50 m |
| F2 | Carris extrudidos, travessas, lastro, equipamento ferroviário; continuidade com o tabuleiro | Captura a 5 m no portal oeste e em x≈1049; sem degrau |
| F3 | Composição 963 (65 instâncias, semente, variação) + locomotiva/tender LOD1/2 + fumo/vapor | Capturas 04:46 a 1 050 m e 06:02 a 450 m; draw calls/triângulos no `report.json` |
| F4 | Panzerzug 7 LOD1/2 + fumo | Captura 04:53; silhueta distinguível |
| F5 | Desvio da estação (após P-2): 3 vagões LOD0/1, vagão a arder/queimado, luz no médio/alto | Capturas 04:40 e 06:50 a 5/20/50 m; restauro de save |
| F6 | Presets, fallback, dispose, documentação, créditos, status; PR para `main` | Suite completa verde; `docs/verification/m01-runtime/railway/` completo |

## 8. Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| Atravessar vagões do desvio sem colisão | P-2 obrigatório antes de F5; até lá, desvio desligado por flag no módulo |
| Fogo do vagão a esgotar partículas das demolições | Tectos fixos e prioridade por tipo; teste compara `smokePuffs` da demolição com e sem fogo |
| Flicker de LOD no tabuleiro | Histerese 15 % e LOD por composição, não por vagão |
| Hash de `map-layout.json` nas pontes | Ficheiro intocado; `tests/m01-bridges-glb.test.js` no CI |
| Tiling visível a 5 m | Atlas único com AO/sujidade, 4 máscaras, jitter de tom; critério C10 |
| Chromebook | Nenhuma promessa; valores de triângulos/draw calls registados; medição real continua pendente no `RUNBOOK.md` |
| Afirmar classe/unidade | Manifesto com `RECONSTRUCTED`/`INCERTO`; revisão de texto no PR |

## 9. Definição de "feito"

PR para `main` com: kit E-1…E-3, módulo E-4/E-5, teste E-6, evidência E-7, documentação E-8, registos E-9; todos os comandos da secção 6 verdes no CI (Node 24); critérios A–E cumpridos e assinalados um a um na descrição do PR com ligação às capturas; `DEVELOPMENT_STATUS.md` a dizer explicitamente o que ficou `RECONSTRUCTED`, o que está adiado (LOD0 de locomotiva/Panzerzug, som, D6) e que M01 continua PROTÓTIPO JOGÁVEL sem medição no Chromebook.
