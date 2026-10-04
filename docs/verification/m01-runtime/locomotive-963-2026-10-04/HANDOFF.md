# Locomotiva do trem 963 — handoff curto

TASK_ID: `M01-LOCOMOTIVE-963-PRODUCTION-ASSET-RUNTIME-V1`. Solicitado GPT-6.1 Sol / HIGH. M01 continua **PROTÓTIPO JOGÁVEL**.

- Base exacta: `codex/m01-schema2-determinism-audit` @ `5f3cc34f53c61beec52255d67f8babd7194c9f7f`, confirmada antes de criar a branch.
- Branch: `codex/m01-locomotive-963-production-asset-runtime`.
- HEAD/commit final: o commit que contém este handoff; SHA exacto na entrega. Um commit isolado, sem merge.
- Produção alterada: `src/render/m01-view.js`, novo `src/render/m01-locomotive.js`, novos GLBs/atlas/manifest/licença em `assets/models/production/m01/locomotive/`.

## Audit real antes de editar

`M01View.createTrains()` criava uma caixa 17×3,2×2,8 m centrada em `[1075,2,-2.5]` e dois cilindros em x=1070/1080, y=0,4. Escala de apresentação em metros; eixo longitudinal X, cabeça voltada para oeste. Os 65 vagões existentes começam em x=1090, passo 9,10 m. Nenhum asset parcial de locomotiva existia no repo.

O comboio está parado: não existe velocidade ou trajectória animada. A polyline `train_963` do mapa define a ocupação da via, não uma rota de movimento. `M01Simulation.renderState.train963` deriva somente de `evt_m01_train963_arrives` (04:45). O renderer controla visibilidade a partir desse dado. O handler também activa `grp_de_east`; não o alterámos. Checkpoint/save guardam os eventos consumidos; CP-C descreve os comboios parados. Não há collider próprio da locomotiva: terrenos, carris, portões e colliders da ponte continuam intactos. Nenhum estado de locomotiva foi acrescentado ao save.

`SOURCE_CHECK.md` P16, `ASSETS.md` e `assets-m01.json` deixam a classe aberta. O número 963 é do serviço, não uma identificação da máquina. A nova geometria é uma interpretação genérica conservadora anterior à guerra, sem placa de classe, número, dono ou insígnia. Não afirma que esta configuração de rodas/tender foi a usada historicamente. Referências visuais de época, sem copiar assets: [museu Bahnwelt, G8 de 1913](https://bahnwelt.de/en/das-museum/fahrzeuge/4981-mainz/) e [skansen Chabówka, Tr12 de 1921](https://www.parowozy.pl/ekspozycja/lokomotywy-parowe/tr12/). Não importámos BR52 de 1942 nem BR01 de expresso.

## O que muda / o que não muda

Caldeira com bandas, smokebox/porta, chaminé, domos, cabine com aberturas/janelas e tejadilho arqueado, chassis aberto, running boards, tender/carvão, rodas raiadas, bielas, valve gear simplificado, buffers, ganchos, escadas, tubulação e handrails. Três classes de superfície distinguem pintura/fuligem, aço exposto e vidro escuro. Geometria e pintura originais baked em GLB, licença CC0; não há modelagem em tempo de jogo.

Anchor permanece `[1075,0,-2.5]`, escala 1, native forward −Z rodado +π/2 para oeste. Apenas o GLB desce 0,82 m para assentar as rodas nos carris existentes (terreno −1 + centro do carril 0,12 + meia altura 0,06 = topo −0,82). É adaptação visual, sem alterar collider/passagem. O fallback conserva a caixa/cilindros antigos.

LOD0 <60 m, LOD1 <180 m, LOD2 distante, hysteresis de 10%. Uma só versão visível. Falha parcial escolhe um LOD disponível; falha total mantém o proxy. A chegada tardia invalida o frame pausado; disposal não anexa assets à cena abandonada. O cache existente continua proprietário dos buffers.

Posição de gameplay, velocidade, cronologia, triggers, objectivos, eventos, dano, hit detection, RNG, IA, saves/checkpoints, clocks e colliders preservados byte a byte. Wz.29, MG34, CKM, estação, vegetação, FX, Panzerzug e todos os assets anteriores intactos. O bloco Panzerzug de `createTrains()` permanece igual. Rodas/bielas estáticas porque o comboio está parado; não foi inventado movimento nem novo emissor de fumo.

| LOD | Triângulos | Draw calls | Materiais | Texturas | GLB |
| --- | ---: | ---: | ---: | ---: | ---: |
| 0 | 16.144 | 3 | 3 | 1×256² | ~1,14 MB |
| 1 | 8.768 | 3 | 3 | 1×256² | ~0,68 MB |
| 2 | 4.088 | 3 | 3 | 1×256² | ~0,35 MB |

Contagens por asset activo, sem passes de sombra. Os três LODs são pré-carregados (~2,17 MB GLB); cada GLB contém sua cópia da pequena textura. Counters da cena real em `report.json`, não FPS. **FPS EM CHROMEBOOK NÃO MEDIDO.**

## Validação proporcional e evidência

- `node --test tests/m01-locomotive.test.js tests/m01-support-runtime.test.js`: 11/11 PASS (7 novos + 4 existentes), sem skips. GLBs reais, hashes, atributos finitos, budgets, features, transform, rail offset, LOD/hysteresis, carregamento, falha parcial/total, disposal, pause/restore e preservação dos ficheiros anteriores. Teste inicial falhou por limite de stdout do git e por corte textual ambíguo; fixtures corrigidas, assertions mantidas.
- `npm run build`: PASS; aviso existente de chunk >500 kB permanece.
- Browser focado de produção: `CHROME_EXECUTABLE=/tmp/chromium npm run test:browser -- tests/browser/m01-locomotive.spec.js --reporter=list`. **2/2 PASS**, 32,4 s, retries/skips/falhas 0, configuração/timeouts intactos. Valida loaded [0,1,2], LOD2 no ponto real da missão, pause/restore e fallback com todos os novos GLBs bloqueados. Resumo em `validation.json`, stdout real em `browser-focused.log`.
- [pairs.html](pairs.html): quatro pares BEFORE/AFTER a 1280×720 — lateral, 3/4 frontal, traseira e ~86 m no cenário. Mesma câmara/clock/save. BEFORE usa as geometrias/materiais/dimensões do proxy original conservado; AFTER usa o GLB. Câmaras de inspeção encenadas, estado obtido por controlos reais até 04:45:10, sem mutar gameplay. O portal fechado continua a ocultar parte da frente; não foi removido para a captura. 8 capturas finais, zero browser page errors, igualdade exacta do snapshot em cada captura.
- Sem Node integral, browser integral, CI ou playtest humano reivindicados. Uma repetição focada após o ajuste visual dos carris, nenhuma suíte completa.

Limites: classe histórica desconhecida; proporções/configuração genéricas, não reconstrução medida. LOD distante simplifica spokes/gear. Vidro opaco escuro e interior simplificado; nenhum som, fumo novo ou animação de marcha. Fallback volta ao visual antigo. Arte suficientemente legível para revisão da M01, sem promessa de perfeição histórica.

**READY_FOR_CAPTAIN_REVIEW** — checks focados verdes. Não integrar nem fazer merge automático; main e outras branches intactos.
