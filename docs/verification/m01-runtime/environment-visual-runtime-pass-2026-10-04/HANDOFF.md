# HANDOFF — M01 environment visual runtime pass

TASK_ID: `M01-ENVIRONMENT-VISUAL-QUALITY-RUNTIME-PASS-V1`  
MODELO solicitado: GPT-6.1 Sol  
ESFORÇO: HIGH  
BASE: `codex/m01-schema2-determinism-audit @ 5f3cc34f53c61beec52255d67f8babd7194c9f7f`  
BRANCH: `codex/m01-environment-visual-runtime-pass`  
HEAD de runtime verificado: `0c07962bbf2ff4f894e5465cea5b6fb517bab38f`  
HEAD FINAL de entrega: [ref da branch](https://github.com/Brawl2007/COD-guerra/tree/codex/m01-environment-visual-runtime-pass). O SHA exacto do commit que inclui este handoff é comunicado na entrega final; esse commit acrescenta evidência e ferramentas de captura, sem alterar o runtime verificado.

M01 continua **PROTÓTIPO JOGÁVEL**. Sem merge, integração ou alteração em main.

## O que o jogador percebe

A estação ganha molduras, cursos horizontais, embasamento, tubos de queda e detalhe superficial do telhado. O solo tem zonas mais verdes, terra compactada e manchas húmidas. As copas passam a formar massas irregulares, e o sol baixo produz sombras com maior contraste depois do nascer do sol. Travessas assentes, fixações metálicas e balastro mais escuro tornam a ferrovia mais legível. Impactos reais ganham poeira e pequenos fragmentos cosméticos; o fumo varia em forma e deriva.

Gameplay, movimento e animação dos soldados, tiros, hitboxes, dano, RNG, clocks, objectivos e saves conservam os mesmos contratos. A prova compara estados completos e eventos, além de verificar que os ficheiros de gameplay/espacial/mapa/assets não mudaram.

## Implementação

| Campo | Resultado |
|---|---|
| DEFAULT QUALITY | Escolha explícita guardada. Médio automático apenas com >=4 cores, >=4 GB reportados, limite WebGL2 >=8192 e renderer conhecido sem software. Desconhecido/limitado/SwiftShader/llvmpipe: Baixa. Alto opcional. Menu acompanha o renderer. |
| LIGHTING | Skylight reduzido, sol baixo mais forte, base de iluminação do solo mais escura; sombras recebidas pelo fallback dos actores. Direcção/altitude continuam a seguir os keyframes históricos existentes. |
| COLOR/TONE | ACES mantido; exposição M01 1.08, cores de céu/névoa coerentes e sem grading laranja/teal. Exposição 1.15 da bancada francesa reposta após o desenho M01. |
| TERRAIN | Máscaras em coordenadas do mundo, manchas de terra/humidade e margens verdes. Nenhum vértice de terreno, altura física ou colisão alterado. |
| RAILWAY | Travessas alinhadas à altura existente, fixações por carril, balastro escuro e pedras de quatro faces instanciadas. Caminhos físicos intactos. |
| STATION | Embasamento, pilastras, cursos, caixilhos mais profundos, detalhe raso no telhado e tubos de queda na massa existente. Sem novas portas/passagens ou reconstrução histórica inventada. |
| VEGETATION | Máscara original de folhas mais densa/irregular, variação de cartão/copa/ramo e melhor massa de cor distante. Sem deslocar troncos sólidos. |
| GRASS | Quatro lâminas por tufo, grupos baixos fora dos corredores e redução de densidade em Baixa; instancing preservado. |
| CLUTTER | Madeira de manutenção junto ao abrigo e pequenas pedras junto à estação. Sem colliders. |
| MATERIALS | Ruído multiescala, manchas, escala de tijolo menor, bump menos excessivo, rugosidade/metalness diferenciados e chave de shader por tipo/escala. Arte procedural original. |
| WATER | Água não metálica, rugosa, resposta simples à vista e movimento subtil amostrado pelo mission clock. Física intacta. |
| SMOKE | Opacidade irregular, deriva/turbulência, base mais escura e expansão da nuvem. Pool 112/192/256; fumo persistente reconstrói-se de damage/clock. |
| EXPLOSIONS | Clarão de evento existente preservado; damage real produz poeira de pressão e fragmentos balísticos cosméticos num pool de 64. Não adiciona eventos, dano ou estado de destruição. |
| DUST | Puffs mais claros nos round-impact existentes; camada de poeira curta nos damage records reais. |
| LOD | LODs de personagens/pontes/aviões/vagões intactos; pixel ratios e shadow map preservados. Sem novos render targets. |

## Before / after obrigatório

[BEFORE_AFTER.md](BEFORE_AFTER.md) contém A–E em Médio e Alto, originais PNG, pares lado a lado e coordenadas/clocks exactos. Baixa tem capturas/counters de regressão. F adicional regista um impacto real no reparo a 0.6 s para expor poeira e fragmentos. As câmaras são probes explicitamente posicionados em estados de rotas genuínas, não um playtest humano.

| Par | Constatação visual |
|---|---|
| A — station approach | Detalhe da fachada, embasamento e manchas do solo claramente distinguem a candidata. |
| B — sapper / rail | Travessas e balastro mais assentes; massas de copa e margens do terreno menos uniformes. |
| C — bridge approach | Leitura de alvenaria e contraste do solo/vegetação melhoram; ainda há cartões visíveis nas árvores. |
| D — long-distance bridge | Sombras e massas verdes quebram a iluminação/terreno uniformes da base. |
| E — damage scene | Estado real após demolição, observado no tabuleiro rodoviário; materiais e sombras têm maior profundidade. A estrutura oculta parte da pluma, pelo que este par isolado não prova toda a sequência da explosão. |
| F — impact / dust | Fumo, poeira curta e fragmentos de um impacto real; complementa a limitação de E. |

## Performance

[PERFORMANCE.md](PERFORMANCE.md) contém calls, triangles, geometries e textures para os 18 pares. Acréscimo de **1–3 draw calls**, triângulos **+12.8% a +25.1%** conforme o probe/preset; contagem de texturas igual em todos os pares. Não são medições de FPS. Os conjuntos de assets carregados são iguais dentro de cada par; Alto aguarda os LODs opcionais necessários.

Sem medição de frame time/GPU num Chromebook físico. Aumentar detalhe tem custo mesmo com calls limitadas. O default automático conservador evita software/recursos desconhecidos; precisa de revisão em hardware alvo antes de expandir a heurística.

## Validação

| Campo | Resultado / evidência |
|---|---|
| GAMEPLAY EQUIVALENCE | PASS: rota completa BASE/CANDIDATE, snapshot, checkpoints, eventos, hitboxes, posições, HP, ammo, RNG, clocks e objectivos. [GAMEPLAY_EQUIVALENCE.json](GAMEPLAY_EQUIVALENCE.json), [equivalence log](logs/equivalence.log). |
| BROWSER STATE EQUIVALENCE | PASS: 18/18 hashes de estado completo, posição/ângulos/clocks e conjuntos de assets iguais. [BROWSER_EQUIVALENCE.json](BROWSER_EQUIVALENCE.json). |
| NODE | **244/244 PASS**, zero failures/skips: [node.log](logs/node.log). Node 24.19.0. |
| BUILD | **PASS**, 51 módulos; warning existente de chunk >500 kB: [build.log](logs/build.log). |
| FOCUSED | **2/2 PASS**: limites/pausa/reconstrução/imutabilidade do fumo e selecção conservadora de qualidade: [focused.log](logs/focused.log). |
| BROWSER | **37/37 PASS**, 16.8 min, workers=1, retries=0; budgets/asserções existentes preservados. [browser.log](logs/browser.log). Chromium 153 / ANGLE SwiftShader. |
| OPTIONAL ASSET FAILURE | Casos existentes de aviões, personagens, transições da estação, vagões, MG34/prone e CKM passaram com fallback funcional. Assets próprios de ambiente são procedurais, sem download. |
| PAUSE / RESTORE | Probes mantêm o estado completo congelado durante captura; fumo/água usam clocks da simulação. Pools não entram no save. Reconstrução determinística testada; testes existentes de save/reload e checkpoint passaram. |
| CI REMOTO | Não contado como aprovação. Os resultados acima são execução local em browser de produção; workflow remoto só filtra main/PR para main. |

Uma tentativa de arranque anterior falhou porque a extração do executável Chromium ficou vazia após o ambiente retomar. O problema ocorreu antes de carregar o jogo. [browser-launch-failure.log](logs/browser-launch-failure.log) preserva essa tentativa; foi reparado o browser e executada uma suíte completa nova, sem retries, que passou 37/37. Nenhum timeout foi aumentado para mascarar o problema.

## Limitações e problemas visuais presentes

Árvores continuam a usar cartões, e alguns ângulos mostram faces planas. Terreno conserva ridges repetidos porque alturas/colisão são imutáveis nesta tarefa. A estação mantém a massa rectangular do telhado. Não há AO por pós-processamento, reflexos/refração da água ou iluminação volumétrica. O clarão curto de granada conserva o sprite anterior; os novos fragmentos/poeira usam os damage records fornecidos pela simulação. Destruição de estação/vagões mantém os estados e a geometria já existentes; não foi inventado um novo sistema de dano. E tem oclusão da pluma pelas treliças. [VISUAL_AUDIT.md](VISUAL_AUDIT.md) detalha estes limites.

## Próximo visual pass recomendado

Vegetação original com meshes/LODs e menor cobertura alpha; depois telhado/weathering da estação e mistura de materiais do terreno. Separadamente, medir frame times/overdraw num Chromebook real. Locomoção/IK/animação permanece fora deste trabalho.

## Recomendação ao capitão

Rever os pares de imagem antes de qualquer decisão de integração. Há melhoria visual material no conjunto, sobretudo A–D e F, com custo gráfico quantificado e gameplay equivalente; recomendo revisão com as limitações acima. Não declarar gráficos finais, exactidão histórica ou desempenho Chromebook comprovado. Sem integração automática.

## FILES CHANGED

Runtime: `src/main.js`, `src/render/m01-atmosphere.js`, `src/render/m01-environment.js`, `src/render/m01-surfaces.js`, `src/render/m01-view.js`, `src/render/three-renderer.js`.

Verificação: três testes novos e três ferramentas em `tools/verification/`; documentação, JSONs, logs e 48 imagens nesta pasta. [FILES_CHANGED.txt](FILES_CHANGED.txt) lista todos os caminhos exactos; [SHA256SUMS.txt](SHA256SUMS.txt) identifica os ficheiros de evidência.
