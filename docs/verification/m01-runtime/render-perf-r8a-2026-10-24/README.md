# R8-a: soldados em 2 draw calls (renderer), 2026-10-24

Branch `claude/exciting-bohr-k8v5xm-r8a` (base `2ac59cc`). Alteração só de apresentação em `src/render/`: não toca em `src/game`, goldens, saves, LOD, qualidade, nem nos ficheiros do viewmodel em primeira pessoa (`m01-viewmodel.js`, `m01-wz29-presentation.js`, `m01-fp-hands.js`). Nenhum valor de FPS é afirmado: os números são draw calls, triângulos e microbenchmarks de CPU em Node. O FPS no PC de referência (Intel HD 5500, 1366x768) é medição humana (T49).

## Ponto de partida (correção da auditoria)

A auditoria falava em ≈26 draw calls por soldado. Os GLB têm 26 malhas (PL) ou 8 (DE), mas a maior parte está oculta (cabeças alternativas, galões, armas de outros soldados). O que se desenhava de facto, medido por percurso do grafo de cena como o `WebGLRenderer`, eram **6 draw calls por soldado** (corpo, cabeça, capacete, equipamento, espingarda, carregador; mais insígnias nos graduados). Agora são **2** (lote de corpo + lote de arma).

## O que mudou

- `src/render/m01-soldier-batching.js` (novo): `mergeSoldierGeometries()` concatena geometrias indexadas com o mesmo layout (cópia bruta dos atributos, também dos interleaved do glTF; índices deslocados; `color` a branco nas peças sem cor quando outra a tem), `SoldierMergeCache` (geometrias fundidas por lista de peças, propriedade do `M01Characters`, libertadas uma só vez em `dispose()`), `batchSoldier()` e `sharesShading()`.
- `src/render/m01-characters.js`: em `create()` (instanciação, nunca por frame) as peças esqueléticas visíveis de forma permanente (corpo, uma cabeça, capacete, equipamento, insígnias, sapador) fundem-se numa `SkinnedMesh` (`batch_body`) e as que seguem `armed` (espingarda + carregador, wz.98a, rkm) noutra (`batch_weapon`). Mesmo `Skeleton` partilhado (WP4), mesma `bindMatrix`, mesmos pesos e índices de ossos: a pose e a skinning são idênticas. Material: o da variação (cor por vértice, rim alemão incluído); peças sem variação juntam-se-lhe com cor branca (multiplicação por 1,0) só se forem o material de origem do clone (`sharesShading`), caso contrário ficam como estão.
- As peças lógicas continuam em `v.meshes` (nome, geometria, material, `visible` para regras de `update()`, diagnóstico `weaponMeshes`, `getObjectByName`), mas passam para um `Group` invisível `m01_batched_parts` (o three salta a subárvore ao desenhar e na passagem de sombras) cujo `updateMatrixWorld` é vazio: as ~20 peças dormentes deixam de recalcular matrizes e inversas por frame.
- Em `update()`, só se ligam/desligam `visible` e `castShadow` dos lotes existentes (laço sem alocações; `drawCallsOf()` sem alocações). `stats.submittedDrawCalls` novo; `submittedMeshes` mantém o significado anterior (peças lógicas).
- Ficam como malhas individuais: kit MG34, bipés e pano do rkm (regras próprias, um só soldado), props dos civis, e peças incompatíveis. Civis, médicos e tripulações MG34 não têm lote de arma (`unarmedKind`; se mudasse, a instância é recriada).
- `batching:false` (opção do construtor) mantém o caminho anterior, para A/B e testes.

## Resultados (Node 22.22.0, sem GPU; 40 soldados, 7 execuções alternadas, mediana)

`BENCH_QUALITY=<nível> BENCH_BATCHING=0|1 node --expose-gc --min-semi-space-size=256 --max-semi-space-size=256 tools/verification/m01-render-perf-bench.mjs`; resumo com `tools/verification/m01-render-perf-summary.mjs bench-runs.jsonl` (dados em bruto: `bench-runs.jsonl`). Instâncias esqueléticas por nível = orçamento de atores do LOD (40 em High, 21 em Medium, 18 em Low para estes 40 soldados).

| Nível | Instâncias | Draw calls antes | depois | Por soldado | Triângulos (antes = depois) | `update()` mediana antes → depois (ms) |
| --- | --- | --- | --- | --- | --- | --- |
| High | 40 | 240 | 80 | 6 → 2 | 126 774 | 1,347 → 1,206 |
| Medium | 21 | 126 | 42 | 6 → 2 | 53 655 | 1,186 → 1,075 |
| Low | 18 | 108 | 36 | 6 → 2 | 39 607 | 0,987 → 0,926 |

- Os triângulos são exatamente os mesmos; o LOD (bandas 2/5/33, 0/3/18, 0/1/17) não muda.
- `update()` (CPU): -8 a -10 % em mediana, dentro do ruído desta máquina partilhada (intervalos das medianas por execução sobrepõem-se, ver `bench-runs.jsonl`). A poupança vem de as peças dormentes deixarem de atualizar matrizes mundiais e inversas; a heap por `update()` é a mesma (~365 kB). Não é uma afirmação de FPS.
- Memória: as geometrias fundidas duplicam os atributos das peças (`mergeCache`): 24 geometrias / 3,7 MB em High, 16 / 1,7 MB em Medium, 13 / 1,2 MB em Low, criadas uma vez por lista de peças (variante de cabeça/capacete/equipamento por nível de LOD) e reutilizadas por soldados e trocas de LOD.
- Menos objetos por soldado no GPU: uma só passagem de ossos por soldado já vinha do WP4; agora há também 2 em vez de 6 chamadas `drawElements` por soldado e por passagem de sombras (≤ 35 m).

## Equivalência visual (Chromium headless/SwiftShader 1280x720, GLB e atlas reais)

`npm run build` e depois `CHROME_EXECUTABLE=/opt/pw-browsers/chromium node tools/verification/m01-render-perf-r8a-capture.mjs docs/verification/m01-runtime/render-perf-r8a-2026-10-24/captures` (fixture `m01-render-perf-r8a-fixture.html`: os mesmos atores existentes, pose, luzes e câmara; o antigo `batching:false` e o novo desenhados no mesmo frame de teste). `renderer.info.render.calls` inclui a passagem de sombras. Imagens em `captures/` (antes, depois e diferença ×32; `pairs.html`; `report.json` com todos os números, incluindo Medium e Low).

| Cena (5 soldados) | LOD | Calls antes → depois | Triângulos | Píxeis diferentes (de 921 600) | Dif. máx. por canal |
| --- | --- | --- | --- | --- | --- |
| PL 5 m High | 0 | 73 → 23 | 148 552 = 148 552 | 0 | 0 |
| DE 5 m High | 0 | 61 → 21 | 160 212 = 160 212 | 4 | 24 |
| PL 30 m High | 1 | 73 → 23 | 61 154 = 61 154 | 9 | 85 |
| DE 30 m High | 1 | 61 → 21 | 64 194 = 64 194 | 59 | 140 |
| PL 80 m High | 2 | 37 → 12 | 9 414 = 9 414 | 91 | 149 |
| DE 80 m High | 2 | 31 → 11 | 10 265 = 10 265 | 226 | 162 |
| PL 5 m Medium / DE 30 m Medium / PL 80 m Low | 1 / 2 / 2 | 73→23 / 61→21 / 37→12 | iguais | 1 / 28 / 91 | 24 / 141 / 149 |

Vi as imagens (PL 5 m, DE 30 m, PL 80 m): indistinguíveis a olho. A diferença são píxeis isolados em costuras entre peças coplanares (pescoço/gola, correias no ombro; aparecem no mapa de diferenças como pontos soltos, nenhuma região). Causa verificada na própria fixture:

1. a mesma instância com as peças lógicas repostas na cena e os lotes ocultos desenha **exatamente** como o caminho anterior (0 píxeis de diferença), por isso a pose, a skinning e o material são iguais; a diferença vem só de como as peças se sobrepõem;
2. o three ordena as peças opacas por `material.id` e depois pela profundidade de vista do centro da esfera envolvente de cada peça (`drawOrder` em `report.json`), logo a ordem entre peças coplanares do caminho antigo depende da câmara; no lote a ordem é a do índice (corpo, cabeça, capacete, equipamento) e é estável; reconstruir o lote com as peças por ordem inversa muda até 786 píxeis, e `renderOrder` das cabeças não muda nada no caminho antigo (0 px), ou seja, só os empates de profundidade dentro de peças que se tocam decidem estes píxeis;
3. repetir o mesmo frame no caminho antigo dá 0 píxeis de diferença (a medição é determinística).

Conclusão: sem alteração visual percetível; empates de profundidade nas costuras passam de dependentes da câmara para estáveis.

## Medium: MSAA 4x, AO e cascata dupla (avaliação, sem alteração de código)

Já estão no Medium desde T44 e T16; o item da auditoria estava desatualizado. Verificado no código e coberto por `tests/m01-grading.test.js` e `tests/m01-lighting.test.js`:

- MSAA: alvo de renderização do passe de grading com `samples:4` em Medium e High (`gradingQuality`, `src/render/m01-grading.js`); Low não tem passe nem alvo.
- AO a resolução total: no mesmo passe, sem buffer a meia resolução e sem segundo alvo; Medium com 8 amostras (`aoTaps:8`, `aoStrength:.55`, `aoRadius:.7`), High com 12. Mesmo custo estrutural (1 passe, 1 alvo, 1 textura de profundidade) nos dois.
- Cascata dupla: `cascadePlan` dá 2 cascatas em Medium e High (larga ±65 m a 1024, próxima ±25 m a 1024 em Medium e 2048 em High, 40 % da intensidade na próxima), 1 só em Low (sem mapa).
- High mantém-se acima do Medium (12 amostras de AO, mapa próximo 2048, `ratio` 1,5 contra 1,25), por isso nada mais a mudar sem alterar o High. Não medido: o custo real destas passagens na HD 5500 a 1366x768 (preenchimento e sobreposição são o primeiro limite nesse GPU). Fica para T49 no PC de referência; o `initialQuality` já arranca em Medium nesse GPU.

## Testes

- `tests/m01-soldier-batching.test.js` (9, novos): orçamento ≤ 2 draw calls por soldado (PL/DE, sargento, sapador, wz.98a; LOD 0/1/2; 40 soldados em High/Medium/Low) contra ≥ 4 no caminho antigo, triângulos iguais e `stats.submittedDrawCalls` igual ao percurso da cena; equivalência com o caminho sem lotes em 5 frames e 10 atores (matrizes de ossos e raiz iguais; conjunto de triângulos com posição skinned, cor e uv exatamente iguais; materiais; visibilidade lógica; entradas de diagnóstico); alternância de `armed` (vivo, morto, ferido, médico, Kowal, Bak); LOD (mesmas bandas, trocas e chaves; `castShadow` por distância e nível, 80 frames por nível); cache (uma construção por lista de peças, reutilização em trocas de LOD, `dispose` uma só vez); `mergeSoldierGeometries` (interleaved, branco, índices de 32 bits); libertação (Skeleton uma vez, geometrias da cache só em `dispose`); guarda de código (sem fusão nem `new THREE.*` em `update()`).
- `tests/m01-render-perf.test.js`: a paridade de ossos passa a iterar as peças lógicas (`v.meshes`); `bindMatrixInverse` só se compara nas peças desenhadas (as dormentes já não atualizam a subárvore). Nenhuma asserção removida.
- Suites focadas (37 ficheiros: render, personagens, LOD, IK, hand pin, variação, legibilidade, civis, pose rate, CKM, MG34, estação, impostores, grading, lighting, viewmodel, fp-arms, wz29): 365 testes, 364 passam, 1 falha (a pré-existente abaixo). Um `npm test` completo não terminou no limite de 40 min nesta máquina partilhada (carga 6 a 17 com outros agentes), por isso não afirmo o resultado da suite completa; a integração final deve corrê-lo.
- `npm run build`: compila (só o aviso habitual de chunks > 600 kB).
- Pré-existente e não relacionado: `tests/m01-soldier-visual-variation.test.js` "integration preserves gameplay ... byte-identical" corre `git ls-tree` sobre o commit `5f3cc34f…`, que não existe neste clone (`fatal: not a tree object`), com ou sem esta alteração.

## O que fica

- FPS e tempo de GPU no PC de referência (T49, humano): esperam-se menos chamadas de desenho e de mudança de estado, mas não foi medido.
- Peças individuais residuais: MG34 (6 malhas do kit no LOD2, mais o lote de corpo: 7 chamadas; eram 10), Kowal (rkm + bipé + pano, 4 chamadas), props dos civis.
- Dois lotes por soldado podiam passar a um se a arma partilhasse o material do corpo (hoje a arma usa o material original sem cor por vértice, o corpo o clone com cor e rim alemão); fundir exigiria alterar o rim dos alemães nas armas, o que mudaria o visual.
