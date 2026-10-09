# M01 — Final Approved Deliveries Integration V7

TASK_ID: `M01-FINAL-APPROVED-DELIVERIES-INTEGRATION-V7`.

**Estado: VALIDATION_IN_PROGRESS.** As execuções browser integrais terminaram 80/84 e 82/84. As quatro primeiras correções passaram na segunda execução; as duas falhas restantes têm provas preservadas e correções em validação focada, sem alterações de produção. A terceira execução integral sem filtros está em curso no run 37862528016; a certificação ainda está pendente. M01 continua **PROTÓTIPO JOGÁVEL**; não há alegação de qualidade AAA ou de certificação no Chromebook.

## Identidade, recuperação e decisões

| Item | Identidade |
|---|---|
| Branch de trabalho e única branch escrita | `codex/m01-final-production-consolidation-v7` |
| V6 protegida / HEAD inicial da V7 | `cbc7de5668a1b2e4bc646b86548196a5f4f1039a` |
| Runtime combinado final, antes dos commits exclusivamente de CI/provas/docs | `8f7d1ea8f096472436c860e118a8c799e740e23f` |
| Node completo/build | `a97a3152d4848517a267d80c0cbbdc24bf2ddaeb` |
| Primeira execução browser integral, FAIL 80/84 | `1b636303beeebf019aa2cd13819c6e0637f2b0bc` |
| Harness corrigido e retestado 5/5 | `91c7a844c7d5020a552969027a424aad1f13dcd4` |
| Segunda execução browser integral, FAIL 82/84 | `13b14fe75cdffc4e6425dcff4cb7b1f5dbb75e24`, [run 37851294926](https://github.com/Brawl2007/COD-guerra/actions/runs/37851294926) |
| Segunda correção do harness, retestada 4/4 | `0a83942b41957e0b900b8a8fc704eb7860f84ba9` |
| Terceira execução integral, em curso | `9d9844e65701aeb80af854d8f9b7ed6dc9a351e8`, [run 37862528016](https://github.com/Brawl2007/COD-guerra/actions/runs/37862528016) |
| PR draft | [#59 — V7 → V6](https://github.com/Brawl2007/COD-guerra/pull/59) |
| HEAD final publicado | O `head.sha` exato da PR #59, registrado na descrição final da PR; inclui este próprio handoff. `git rev-parse origin/codex/m01-final-production-consolidation-v7` reproduz esse SHA após fetch. |

V6 e V7 foram confirmadas remotamente no mesmo SHA antes das alterações. A V6 é ancestral da V7. Todos os sistemas herdados permanecem; o delta de produção restringe-se a sete módulos de render. O checkout anterior, com trabalho V6 local antigo, não foi apagado nem reaplicado. O trabalho foi feito numa worktree isolada da V7 e numa referência V6 detached somente para leitura/build.

[DELIVERY_MATRIX.md](DELIVERY_MATRIX.md), [REMOTE_INITIAL.json](REMOTE_INITIAL.json) e [BRANCH_DELTA_INVENTORY.json](BRANCH_DELTA_INVENTORY.json) mostram fontes, SHAs, checkpoints herdados, provas, dependências e decisões. [SOURCE_REVIEW_INDEX.json](SOURCE_REVIEW_INDEX.json) identifica sete documentos primários exatos das fontes, com Git blob SHA, SHA-256 e URLs; o conteúdo está preservado em `SOURCE_REVIEW.json.gz`. Foram inventariadas 117 branches e comparadas com as 113 da V6. A admissão usa a autorização técnica explícita desta tarefa; não se inventou aprovação anterior do Capitão.

| Delta admitido | Fonte | Commit V7 |
|---|---|---|
| Station Visual Fidelity V3 | `090804776b18c8dc3200497388eb59e83b56205c` → `271413f26efc1dbccefc39ac401f4495928a2493` | `e6bc661c09ba866d55686bfb679f883982d2f8cb` |
| Armas, somente o checkpoint validado | `2e946ab0f62997689c1f7d015cef8904ec6f3c60` → `7dbc0a5490c336db63bcf2704b8fca216353be88` | `2a19dd00acd0815b45cff232bc1860fdb5e99211` |
| Decals concluídos | `b084bba8a56c85d60f15a10a6bcf3fb4da18f5e8` → `12a70220ecdd0e2e3488a1c8a2e5f3cca0a78416` | `c6f8c97a3943542a86e2f695c38fa1f2a764d490` |
| Guardas browser Station V3 sobre a fixture estabilizada da V6 | Mesmo módulo Station admitido | `8f7d1ea8f096472436c860e118a8c799e740e23f` |

Exclusões: os quatro commits de armas posteriores a `7dbc0a5` continuam com falha de recarga documentada; Ju 87 posterior permanece 55/61 browser sem prova nova; Distant Battlefield acrescenta apresentação sem áudio sincronizado e acabamento parcial; authority/RNG/locomotion pilots e Animation Resolver não são funcionalidades concluídas compatíveis. Os quatro WIP referidos em #55 continuam sem nomes inequívocos. Planos criativos e M02–M30 não foram importados. Preservado o Ju 87 herdado da V6, não certificada a branch Ju 87 excluída.

## Código e integração por hunks

| Ficheiro / integração | Mudança e comportamento preservado |
|---|---|
| `src/render/m01-station-architecture.js` | Materiais metro-calibrados, caixilhos/vidros, acabamento de arcos, juntas, beirais/caleiras/cumeeiras/chaminés e normais. Cinco volumes, 140 aberturas, 3 LODs, envelope, fallback e ausência de colliders preservados. Materiais próprios, sem alterar iluminação global. |
| `src/render/first-person-weapon-fx.js` | ADS sem atraso de rotação, aterragem contínua de brass/clip, smoke mais contido e histórico de wisps, luz partilhada com ownership correto, prewarm inicial. Pools limitados e relógio da simulação preservados. |
| `src/render/m01-viewmodel.js`, `m01-wz29-presentation.js` | Alinhamento e ciclo visual; recoil, mãos, ferrolho, recargas, socket e fallback conservados. Nenhuma alteração a armas autoritativas ou hitboxes. |
| `src/render/three-renderer.js` | Aplica os FX validados à bancada, conserva M01 e reset; não substitui o renderer por uma versão antiga. |
| `src/render/m01-damage-decals.js` | Promise/readiness/erro do atlas, warm invisível de primeira utilização, cinza assentada. Erro de paint rejeita readiness e não agenda loop infinito; dispõe callbacks corretamente. |
| `src/render/m01-view.js` — somente 22 linhas de delta | Mantém imports `M01DamageDecals` e Bridge V2; acrescenta prewarm, partilha de luz e warm dos chips. Conserva o helper V6 `updateFallbackWeapon`, a guarda de flash recém-emitido, reset e duração de ferrolho com fallback para fixtures parciais. |
| Testes de armas | Conserva oito hashes estritos de perfis/ballistics/RNG/spatial; acrescenta as regressões da fonte e fronteira de import. A versão da fonte que retirava os hashes não substituiu o teste combinado. |
| Testes/fixtures de decals | Conserva `buildM01VegetationLayout` e descriptors atuais. A captura pós-west usa um avanço genuíno de 8,25 s, antes da transição de roll-call, com guardas de pose/evento. Não muda eventos, relógio ou lifetimes para passar. |
| Browser Station | Conserva a espera estabilizada do LOD/restauro da V6 e acrescenta orçamento V3 e detecção de erros GLSL. |

`m01-environment.js`, `m01-characters.js`, pontes, comboios, áudio, HUD, simulação, world, missão, dados históricos e assets existentes permanecem byte a byte iguais à V6. Não houve substituição integral de módulos centrais.

## Provas e resultados reais

| Verificação | Resultado | Evidência |
|---|---|---|
| Station Node focado | **31/31 PASS** | `logs/station-node.log` |
| Armas/ViewModel/lifecycle Node focado | **45/45 PASS** | `logs/weapon-node.log` |
| Decals/FX/MG34/lifecycle Node focado | **37/37 PASS** | `logs/decals-node.log` |
| Node completo, execução não filtrada | **474/474 PASS**, 0 falhas/cancelamentos/skips | [Run 37831786923](https://github.com/Brawl2007/COD-guerra/actions/runs/37831786923), `logs/node-full-ci.log`; 167534,073728 ms |
| Build V7 local/CI | **PASS** | Logs e SHA do bundle abaixo; aviso >500 kB continua |
| Build V6 original isolada | **PASS**, hash original reproduzido | Não altera a branch V6 |
| Browser focado Station/evacuação/assets/controlo/reload | **8/8 PASS**, retries 0 | `BROWSER_FOCUSED_CORE.json`, log; 5,4 min |
| Browser focado armas/decals/FX | **8/8 PASS**, retries 0 | `BROWSER_FOCUSED_WEAPON_FX.json`, log; 6,8 min |
| Browser integral combinado, primeira execução | **80 PASS / 4 FAIL**, 84 executados, zero skips/retries/erros globais | [Run 37833355993](https://github.com/Brawl2007/COD-guerra/actions/runs/37833355993); `BROWSER_FULL_FIRST.json.gz`, resumo/log originais e `BROWSER_FAILURE_DIAGNOSIS.json` |
| Browser focado após correção do harness | **5/5 PASS**, Chromium 153, workers 1, retries/skips zero | `BROWSER_HARNESS_FOCUSED.json.gz`, resumo e log; prova de yaw/HUD, impacto pausado e muzzle real |
| Browser integral combinado, segunda execução | **82 PASS / 2 FAIL**, 84 executados, zero skips/retries/erros globais | [Run 37851294926](https://github.com/Brawl2007/COD-guerra/actions/runs/37851294926); `BROWSER_FULL_SECOND.json.gz`, resumo/log e `BROWSER_FULL_SECOND_DIAGNOSIS.json`; quatro correções anteriores passaram |
| Browser focado após segunda correção | **4/4 PASS**, Chromium 153, workers 1, retries/skips zero | `BROWSER_SECOND_HARNESS_FOCUSED.json.gz`, resumo e log; fases reais FX e burned/reload/checkpoint/LOD/fallback |
| Browser integral após segunda correção | **EM EXECUÇÃO**, uma invocação sem filtros, retries 0 | [Run 37862528016](https://github.com/Brawl2007/COD-guerra/actions/runs/37862528016), HEAD `9d9844e`; fonte/correções assinadas e build passaram |
| Autoridade e recuperação | **PASS** | 291 ficheiros protegidos, duas rotas completas e futuros dos quatro CPs; `INVARIANTS.json` e reteste corrigido abaixo |
| Helper adicional de LOD, após correção de QA | **PASS** — Low/Medium/High/Low = 2/1/0/2 em V6 e V7 | `INVARIANTS_LOD_CORRECTED.json`, `logs/invariants-lod-corrected.log`; commit `158c30edea72869144cb0b0c875029dc3818adc2` |
| Visual principal local e CI | **57/57 pares PASS para estado equivalente**, 114 frames | 12 boards inspecionadas; os 114 PNGs locais e CI têm hashes idênticos, `VISUAL_SUMMARY.json`; não é uma aprovação artística automática |
| Visual local suplementar | **15/15 pares PASS para estado equivalente**, 30 frames | Roof artístico, soldados/963 próximos e explosões quentes; três boards inspecionadas |
| Prévia V7 local e CI com controlos | **PASS**, 14 controlos, zero erros JS/HTTP | `PLAYABLE_PREVIEW.json`, captura, logs; menu/intro/WASD/pointer lock/fire/ADS/reload/áudio/HUD/pause/CP-A/Continue |
| Vite para porta encaminhada no CI | **PASS**, job concluído | [Run 37835181912](https://github.com/Brawl2007/COD-guerra/actions/runs/37835181912); comando `0.0.0.0` e hostname encaminhado testados; não hospedagem pública |
| Hardware Chromebook / playtest humano | **NÃO EXECUTADO** | Não é apresentado como teste aprovado ou FPS medido |

Os grupos focados sobrepõem casos do Node completo e do browser integral; os seus números não são somados para fabricar um total. A referência V6 continua com o relatório histórico real 83/84 e retestes focados separados. A V7 pede um relatório integral próprio, sem união de resultados antigos.

A revisão do relatório extra de invariantes identificou um erro no próprio helper: `sync` recebia qualidade e player invertidos, ficando sempre no LOD distante e registando um objeto no campo quality. **O relatório CI original foi conservado**, mas essa parte não serve como prova de cycling de qualidade. Corrigida a ordem para `sync(player, quality)` e acrescentadas asserções de qualidade, LOD e triângulos. O reteste do commit `158c30e` passou novamente todos os 291 hashes, duas rotas/CPs, recursos/dispose/recreate e a sequência **2/1/0/2** nas duas versões. Os testes Node da Station e os browsers já usavam a assinatura correta. Nenhum ficheiro do jogo mudou. Os dois testes browser corrigidos posteriormente são identificados separadamente, com a primeira execução integral preservada como FAIL.

O bundle V6 tem SHA-256 `b9d9f57d83317dc2114561c7c8b7d443ebbfeb66c3ccdc5ab07bfd09dd8d035a` (`index-QzIf-9Lu.js`). O bundle V7 tem SHA-256 `258742274390e6ccac1d17da4a01c6f9a82a7f9506179b66614d42691c6e3d1a` (`index-lksc2ZVJ.js`). CSS permanece `199d38325c505021278bfaff8be2fe6f86a0f742bb82f9cf6a1909fdfa3b7e06`. Os commits posteriores de QA/docs não alteram esses bundles.

## Invariantes e diferenças face ao enunciado

Preservados: 12 objetivos, CP-A..D, Schema 2, RNG, eventos, baixas por ID, cronologia, MG34 prone/CKM, hitboxes/muzzle, evacuação/`stationDrag`, 65 vagões, 963, Panzerzug, Ju 87 herdado, armas, áudio, HUD, FX, colliders/âncoras/rotas, 30 clusters e Low/Medium/High.

**O inventário real protegido da V6 tem 26 IDs de eventos, incluindo `evt_m01_prelude_start`, e as rotas consomem os mesmos 26.** A missão já agenda west demolition às **06:45**, como comprovam `m01-tczew-data.test.js` e os dados históricos herdados; east permanece **06:10**. Não se retirou um evento nem se alterou o relógio para reproduzir números de prompts anteriores. A comparação usa igualdade integral das definições/eventos/snapshots da V6, não uma asserção falsa de 25. Os quatro CPs são restaurados e comparados durante 300 ticks de 0,05 s cada, em ambas as rotas; mesmo futuro, eventos e RNG.

## Visual, história e custo

[VISUAL_REVIEW.md](VISUAL_REVIEW.md) separa qualidade intencional, limitações de enquadramento e problemas preexistentes. Station: tijolo mais fino e menos uniforme, caixilhos/vidros em Low, remates mais legíveis e cobertura com variação visível no probe elevado. Bridge/train/roll-call e soldados mantêm a apresentação. Armas mantêm mãos/flash/ciclo e têm smoke/ejecta ajustados. A elevada repetição estrutural dos vãos, formas estilizadas de árvores/personagens e iluminação escura de madrugada ainda são limitações do protótipo.

As referências continuam as documentadas na [Station V2](../station-architecture-production-v2-2026-10-07/HANDOFF.md): Poczt226/Poczt734. A V7 importa o acabamento da V3, sem novas hipóteses históricas ou arquitetura navegável. Cor, detalhe de joinery, juntas radiais, posições/remates de caleiras/rufos e desgaste são estimados; não se afirma levantamento de 1939. O roof elevado é uma **câmara artística de inspeção**, não um ponto acessível ao jogador; as outras vistas obrigatórias usam altura real do jogador ou controlos reais na fixture.

| Station, módulo completo | V6 | V7 |
|---|---:|---:|
| LOD0 triângulos | 30 881 | 34 285 |
| LOD1 triângulos | 28 707 | 28 975 |
| LOD2 triângulos | 13 382 | 16 928 |
| Draw calls próprias | 7 | 7 |
| Mapas / geometrias | 10 / 21 | 10 / 21 |
| Buffers de atributos, todos os LODs | 9 632 040 B | 10 584 816 B |
| Pixels RGBA dos mapas, sem mipmaps | 655 360 B | 1 441 792 B |
| Colliders novos | 0 | 0 |

A redução progressiva dos três LODs permanece. Low cresce **26,5% no módulo Station**; não se oculta esse custo. O acréscimo estimado de buffers + mapas com cadeia de mipmaps é aproximadamente **1,91 MiB**; não é VRAM física medida. Na vista frontal local, a cena inteira mantém 48/53/56 calls em Low/Medium/High; triângulos passam de 384047/428618/484908 para 387593/428886/488312. O registo CI/JSON contém os contadores próprios de cada execução; não se misturam estados/hardware. Instâncias/props ficam preservados. Os contadores residentes variam com carregamento/LOD/warm; não provam FPS.

## Diagnóstico e correção da primeira execução integral

A primeira suíte completa não foi cancelada: 84 casos executados, **80 PASS / 4 FAIL**, retries/skips zero, em 96,63 min. O artifact 11579816373 foi baixado e verificado por SHA-256 e CRC do ZIP. Report e resumo completos comprimidos sem perdas, logs e excertos primários dos traces/attachments ficam neste diretório. Não se combina esse resultado com retestes para fabricar 84/84.

- **Impacto real:** todos os limites de partículas passaram; falhou `page.screenshot` após 30 s, já depois de carregar as fontes. O teste agora congela um frame realmente quente via `requestAnimationFrame` e saída nativa de pointer lock, verifica clock/pools congelados e captura sem concorrer com frames animados.
- **Orientação nos portões e na demolição:** o DOM ainda mostrava a direção anterior durante a asserção de 5 s. O attachment `afterEach` demonstra yaw e texto autoritativo corretos, depois apresentados no HUD. O helper exige erro angular <0,01, um novo frame e HUD exatamente igual ao status da simulação antes das mesmas asserções de direção; guarda prova de ambos os giros.
- **Retirada:** o loop terminava na primeira baixa (17 homens, clock 749,6667, muzzle frames 5), antes do próximo clarão submetido. O attachment posterior observou muzzle frames 6 em 750,1667, somente 0,5 s simulados depois. O loop continua limitado a 300 amostras, mas espera pelas duas condições já exigidas: baixa real e novo frame de muzzle. Todos os checks de origem, piso de 12 sobreviventes e igualdade HUD/simulação permanecem. Captura com pausa nativa.

Somente `tests/browser/m01.spec.js` e `m01-battlefield-fx.spec.js` mudam nesta correção. Nenhuma asserção original foi removida; nenhum evento, RNG, input, HUD de produção ou lifetime foi alterado. O build continua com o mesmo SHA. Os cinco cenários focados passaram em 2,4 min; isso autoriza uma nova execução integral após a correção, sem filtros e sem somar resultados históricos.

## Diagnóstico e correção da segunda execução integral

A segunda suíte completa terminou **82 PASS / 2 FAIL**, 84 casos, sem retries, skips, flaky ou erros globais, em 94,35 min. Não foi cancelamento nem limite do runner. Artifact **11585538865**, 96 110 429 B, SHA-256 `7ab1ecf84c461281554125965427cd533e83282611551ce90ca73afa7421a8f3`, ZIP/CRC verificado; raw report, resumo e excertos primários dos traces foram preservados. As quatro correções da primeira execução passaram nesta segunda invocação.

- **Fallback dos vagões:** o trace contém `evt_m01_wounded_dragged` no estado autoritativo restaurado, clock 0, player perto do vagão, mas ainda apresenta os vagões intactos e distantes, em LOD2. O helper aceitava frame 10 comparado ao frame 9 do menu, cuja qualidade/assets podiam invalidar o frame antes de Continuar. Agora o contador é recolhido **após** confirmar controlo real, e exige outro frame submetido antes de pausar. Não se espera pelo estado desejado: as mesmas asserções de burned/fire/fallback/65 proxies continuam a decidir se está correto. O renderer herdado já aplica destruição antes do cache; não foi alterado.
- **FX da demolição leste:** o `waitForFunction` de 30 s expirou sob software WebGL/trace. A montagem do observador levou 14,22 s, após 11,19 s na confirmação de controlo; o trace acaba com a indicação real de demolição e pausa nativa às 06:10:02. O trace não inclui os contadores no instante da falha, portanto **não permite afirmar isoladamente** se a leitura atrasou ou se o callback perdeu a fase quente. Agora o observador é armado no menu pausado antes de Continuar, exige controlo nativo, evento real e core/fire+dust positivos; o orçamento de leitura é 60 s de parede. Smoke mantém seu predicado positivo; capturas pausadas usam o orçamento de readback de 120 s já usado pelos outros casos. Diagnóstico do estado/captura é anexado se voltar a falhar. Nenhum lifetime, timing, evento ou RNG foi alterado.

O build da correção continua com o mesmo SHA-256. Os quatro casos focados (ambos os FX e ambos os cenários de vagões) passaram em 3,8 min, Chromium 153, sem retries/skips/erros globais. A certificação combinada permanece pendente até uma nova execução integral real; os resultados focados não substituem essa execução.

## Battlefield FX e infraestrutura

Mantido o diagnóstico real da V6/#53: chips de madeira foram amostrados ~1,224 s após chegada, além de 0,76 s de lifetime; granada ~1,2001 s e demolição Low ~1,3833 s, depois das fases quentes. Os jobs históricos FAIL não eram cancelamentos. A V6 já corrigiu o harness para guardas de controlo, fases e tempos equivalentes; a V7 não prolonga efeitos/eventos nem altera autoridade para conseguir verde. Os três casos FX V3 focados passaram agora, incluindo impactos distintos, bombing/demolições e ciclo smoke/pause/restore/qualidade.

Chromium local inicialmente estava truncado e fazia SIGSEGV até em `--version`, antes da aplicação. Recuperado do pacote Chromium original, fora do repositório; WebGL2 e execução real verificados. CFT não chegou pelo downloader local; o runner CI instala o Chromium suportado normalmente. Isto é infraestrutura, não uma regressão M01 ou um teste aprovado por ausência de execução. Warnings PCFSoftShadowMap→PCFShadowMap/SwiftShader e o aviso de bundle grande são registrados como limites; zero erro JS/HTTP nos cenários aprovados.

## Prévia, reprodução e integração

[PREVIEW.md](PREVIEW.md) fornece o caminho jogável específico da V7: GitHub Codespaces com porta privada do Vite ou Chromebook/Linux com Node 24. Sem domínio novo, Pages, dispatch ou fornecedor público. Não se entrega um URL online de jogo fictício. A aplicação local e o comando/hostname encaminhado foram exercitados; Codespaces real e Chromebook físico são ações de validação do utilizador.

```bash
npm ci
node --test --test-concurrency=2 --test-reporter=tap tests/*.test.js
npm run build
npx playwright install chromium
CI=1 npx playwright test --workers=1 --retries=0 --reporter=list,json
```

Para comparações, criar somente uma referência detached da V6, ligar as dependências e construir ambas; definir `M01_V6_CHECKOUT` e `CHROME_EXECUTABLE`. Executar `m01-v7-invariants.mjs`, `m01-v7-production-visuals.mjs --start-servers`, `m01-v7-transient-visuals.mjs` e `m01-v7-visual-report.py`. Os modos `--supplementary` dos dois capturadores e do relatório reproduzem as vistas adicionais. Não repetir a suíte integral apenas para rever imagens.

Na integração futura, conservar os hunks combinados de fallback/muzzle/reset, Bridge V2 e vegetação. Não fazer merge das fontes de armas/Ju 87/Distant Battlefield na íntegra. Primeiro rever a matriz, relatório único browser, provas e prévia. A PR #59 continua draft e não faz merge da V7 sobre a V6 por si mesma.

Recuperação segura, **apenas se necessária**, sem reset/force-push ou alteração da V6:

```bash
git fetch origin codex/m01-final-production-consolidation-v6
git worktree add -b codex/m01-v7-recovery-YYYYMMDD ../COD-guerra-v7-recovery cbc7de5668a1b2e4bc646b86548196a5f4f1039a
```

Para retirar uma candidata da V7, reverter somente o commit do delta e as guardas/testes que dependem dele; repetir os testes afetados. Uma retirada da Station também deve tratar o commit browser `8f7d1ea`. Não apagar trabalho ou aplicar o stash antigo da V6. `main`, deploy, Pages, V6 e branches das fontes não receberam escritas desta tarefa.
