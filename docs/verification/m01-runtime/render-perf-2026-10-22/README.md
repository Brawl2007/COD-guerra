# Custo por frame do renderer: soldados e viewmodel (2026-10-22)

Ramo `wp4-render-perf` (base `a6f25b45`). Alteração só de apresentação em `src/render/**`: não toca em `src/game/*`, na simulação, nos saves, nos níveis de qualidade, no MSAA, nas sombras nem nos LOD. Nenhum valor de FPS é afirmado: as medições abaixo são microbenchmarks em Node (CPU, sem GPU, sem navegador) e não substituem a medição no PC de referência (Intel HD 5500, 1366x768).

## O que mudou

1. **Um `Skeleton` por soldado** (`shareSkeletons()` em `src/render/m01-characters.js`, chamado em `create()` logo a seguir a `clone(...)`). `SkeletonUtils.clone()` cria um `Skeleton` por malha; todas as malhas de um soldado vêm da mesma pele de origem (verificado nos seis GLB: `pl:0/1/2` com 26 malhas e `de:0/1/2` com 8 malhas, um só skin cada, mesmos ossos e mesmas `boneInverses`). As malhas do mesmo grupo (mesmos ossos, mesmas inversas, comparadas elemento a elemento) passam a usar o `Skeleton` da primeira, com `m.bind(first.skeleton, m.bindMatrix)`; cada malha mantém a sua `bindMatrix`. Peles diferentes nunca são fundidas (teste sintético). `release()` continua a eliminar cada `Skeleton` distinto uma só vez (agora um por soldado). O `WebGLObjects` já deduplica por `Skeleton` por frame, por isso o cálculo e o envio das matrizes de ossos passa de uma vez por malha para uma vez por soldado.
2. **`M01Characters.update()` sem alocações por frame desnecessárias**: quaternions de torção como constante de módulo; candidatos num conjunto de registos reutilizado, filtrados num ciclo e ordenados no lugar (mesmo comparador, ordem total com desempate por id); registos de camadas reutilizados para o `AnimationPlayer`; o callback `alt` do resolvedor é um só (contexto por campos), sem `closure` por ator; o laço de malhas é um `for` (sem `forEach`/closure por ator); o osso `weapon` é guardado no `create()` (antes `getObjectByName` mais um `updateMatrixWorld(true)` completo por ator e por frame para calcular o muzzle).
3. **Diagnóstico `stats.actors` construído de forma preguiçosa**: `update()` guarda por instância um instantâneo escalar (`dBlend`, `dTime`, `dLoop`, `dIk`, `dMuzzle`, `dProne`) e `stats.actors` passa a ser um getter que constrói as entradas na primeira leitura (`gameDiagnostics()`, testes). Campos, valores e ordem iguais aos de antes: o muzzle é calculado no mesmo ponto do frame (antes do IK), `ik` continua a ser o registo vivo da instância, `weaponMeshes` lê a visibilidade das malhas (que só muda em `update()` da própria instância).
4. **Viewmodel** (`src/render/m01-viewmodel.js`): a chave de alteração deixou de ser `JSON.stringify` e passou a comparar 25 escalares com um vetor reutilizado (NaN e campos ausentes continuam a coincidir consigo próprios). `update(sim, quality, flashUntil, view, state = sim.renderState)` recebe o `state` que `src/render/m01-view.js` já leu no início de `render()`, por isso o getter `sim.renderState` (reconstrói todo o estado de render) deixa de ser lido duas ou três vezes por frame; sem o argumento lê uma só vez.
5. **Carregamentos opcionais de alta qualidade**: `requestHighSources()` verifica `pending`/`sources` por chave e só entra em `loadSource/loadMG/loadCKM` quando a fonte nunca foi pedida; deixa de criar sete `Promise` por frame no nível `high`.

## Prova de paridade

- `tests/m01-render-perf.test.js` (6 testes): (a) um só `Skeleton` por soldado em `pl:0/1/2` e `de:0/1/2` e peles distintas nunca fundidas; (b) paridade de pose: para 5 soldados (PL/DE, perto/longe, a andar) durante 24 frames, as matrizes de ossos de cada malha esquelética (`boneMatrices`, `bindMatrix`, `bindMatrixInverse`) são idênticas bit a bit às de um clone `SkeletonUtils` sem partilha, posto com as mesmas transformações de ossos (inclui o sinal de `-0`), e `release()` elimina o `Skeleton` uma só vez; (c) reutilização do scratch, nada retido entre frames e entradas de diagnóstico não construídas sem leitura; (d) nenhuma chamada a `loadSource/loadMG/loadCKM` por frame com fontes carregadas ou pendentes; (e) viewmodel: sem `JSON.stringify` em frames inalterados, cada entrada da chave invalida, `renderState` lido no máximo uma vez; (f) guarda de fonte (sem `new THREE.*`, `JSON.stringify`, `filter/flatMap/forEach` nos corpos por frame).
- Comparação ad hoc, não guardada, do módulo antigo (`HEAD`) com o novo na missão real (`M01Simulation` + `TczewWorld`, IK ligado): `stats` (sem `actors`), `stats.actors` completo (incluindo `ik`, `muzzle`, `blend`, `blendClip`), `diagnostics` (sem tempos de IK), conjunto devolvido e matrizes mundiais de todos os ossos, frame a frame: `high` 2400 frames (45 600 entradas), `high`/`medium`/`low` 200 frames cada. Sem uma única diferença.

## Microbenchmark (Node 22.22.0, sem GPU)

Comando (a revisão anterior obtém-se com `git show a6f25b45:src/render/m01-characters.js > src/render/_before-characters.js` e `BENCH_MODULE=_before-characters.js`; o ficheiro temporário foi apagado):

```
node --expose-gc --min-semi-space-size=256 --max-semi-space-size=256 tools/verification/m01-render-perf-bench.mjs <rótulo>
```

Cenário: 40 soldados (20 aliados, 20 inimigos; 20 a 8–110 m, 20 a 130–320 m; um terço a andar), nível `high`, `M01Characters.update()` + uma passagem `skeleton.update()` por `Skeleton` único com malha visível (o que o `WebGLObjects` faz, só a parte de CPU), 60 frames de aquecimento e 240 medidos. Nove execuções por revisão, alternadas; os valores são a mediana das nove execuções (cada execução: mediana dos 240 frames).

| Métrica (por frame) | Antes (`a6f25b45`) | Depois |
| --- | --- | --- |
| `update()` mediana (ms) | 1,7391 (execuções: 1,6739 a 2,3647) | 1,3506 (execuções: 1,1278 a 1,5635) |
| `update()` média (ms, mediana das médias) | 1,9486 | 1,5371 |
| Passagem de ossos, CPU (ms, mediana) | 0,4511 | 0,1993 |
| Chamadas a `skeleton.update` | 240 | 40 |
| Recálculos reais de matrizes de ossos | 164,35 | 27,39 |
| `Skeleton` distintos por soldado | 26 (PL) / 8 (DE) | 1 |
| Heap alocada por `update()` (bytes, mediana) | 453 778 | 369 468 |

Notas honestas: a máquina de medição é ruidosa (intervalos acima); a contagem de chamadas e de recálculos de ossos é exata e determinística. A heap restante por `update()` vem sobretudo do resolvedor de animação, de `describe`/`actorPose` e do `AnimationPlayer.apply`, que ficaram fora do âmbito. Os tempos de Node não são FPS nem tempo de GPU: o envio das matrizes de ossos para a GPU (`boneTexture`) também passa de uma textura por malha para uma por soldado, mas isso não foi medido aqui.

## Validação

Todos os números abaixo foram obtidos nesta máquina partilhada (carga média 17 a 31 durante as suites lentas).

- `node --test tests/m01-frame-cost-allocation.test.js tests/m01-far-actor-pose-rate.test.js`: 8 testes, 8 passam (antes e depois da alteração).
- Testes focados do renderer/personagens/viewmodel (87 testes de frame-cost, pose-rate, viewmodel-feel, wz29-viewmodel, t49-scratch-reuse, fp-arms, weapon-presentation, character-assets; mais 197 testes de animação, IK, LOD, CKM, MG34, civis, idempotência de render, variação visual): 284 de 284 passam. `tests/m01-render-perf.test.js` (novo): 6 de 6 passam.
- `npm run build`: compila sem erros (só o aviso habitual de chunks acima de 600 kB).
- `npm test` completo, uma vez, sobre a árvore final de código (`src/`): 1462 testes, 1462 passam, 0 falham, 0 cancelados, 0 saltados. (Uma segunda execução paralela de 298 testes dos ficheiros `m01-s[i-z]*`, `m01-[t-z]*` e `t*`, lançada para adiantar enquanto três testes de rotas completas demoravam, também passou integralmente.)
- Fumo no navegador, `tests/browser/m01.spec.js` com `playwright-port-4185.config.mjs` copiado para a porta 4196 (`CI=1 CHROME_EXECUTABLE=/opt/pw-browsers/chromium`, SwiftShader, 1280x720, carga alta). Uma execução completa foi interrompida pelo limite de 3000 s no teste 22 de 29, com 7 falhas. Para separar regressão de ambiente, os mesmos testes foram corridos na base `a6f25b45` (build à parte, porta 4197): na base falham `:59` (timeout), `:293` (grab, `toBeVisible`), `:346` (timeout), `:393` (gates, `toContainText`) e `:478` (asserção), ou seja, `:59`, `:346` e `:478` também falham sem a minha alteração (mesmo tipo de falha em `:346` e `:478`; em `:59` a base excede o tempo e a versão alterada falha a contagem de munição, ambos sob carga). Os restantes quatro (`:293`, `:393` x2, `:415`, `:455`) foram repetidos com a alteração, com a máquina menos carregada: 6 de 6 passam. Conclusão prudente: nenhuma falha atribuível à alteração, mas `:59`, `:346` e `:478` falham neste ambiente SwiftShader também na base e não foram validados como verdes. Os restantes 7 testes (23 a 29) não chegaram a correr na execução completa com a alteração.
- Nenhuma asserção foi alterada ou enfraquecida. Capturas de ecrã: os testes de navegador gravam-nas em `test-results/` (ignorado); não há alteração visual intencional (mesmos LOD, qualidade, sombras e materiais), por isso não foram guardadas capturas novas.
