# HANDOFF — M01 environmental damage decal pass v1

TASK_ID: `M01-ENVIRONMENTAL-DAMAGE-DECAL-PASS-V1`  
BASE: `99309d9cb023cc94a07d41ff863e1362e4460570`  
BRANCHES: `codex/m01-environmental-damage-decal-pass-v1` e `claude/bold-cannon-rkvxjp` (mesmo commit). Nunca `main`; sem PR, merge ou deploy.  
HEAD de entrega: o SHA do commit que inclui este ficheiro é comunicado na entrega final (ver as branches).

M01 continua **PROTÓTIPO JOGÁVEL**.

## O que o jogador percebe

- Tiros deixam marcas diferentes por material: lascas claras na pedra, lascas laranja irregulares no tijolo, farpas ao longo do veio na madeira e na casca, mossa no metal, risco brilhante na cabeça do carril, terra húmida lançada na direcção do tiro, gravilha deslocada no balastro, pavimento lascado no tabuleiro rodoviário. Pequenos fragmentos assentam junto às marcas.
- O FX de impacto acompanha a superfície desenhada: faíscas no carril e nas juntas metálicas, farpas na madeira, lascas na pedra, mesmo onde a simulação reporta `earth`. Os tiros do próprio jogador passam a ter FX de impacto visual (antes só tinham som).
- Granadas e bombas deixam queimado ou cratera, terra lançada, detritos e brasas que se apagam; a bomba da estação deixa poeira clara de alvenaria e entulho junto à fachada. As demolições queimam a via e os encontros, espalham alvenaria e deixam fuligem nas pontas dos tabuleiros que ficam de pé.
- Marcas de bala desaparecem ao fim de 1 a 4 min de missão (terra mais cedo, metal mais tarde); resíduos de explosões ficam e são reconstruídos do save, também depois de carregar ou restaurar.

## Contrato de autoridade

Nada de dano, acertos, RNG, eventos, objectivos, colisões, mundo, missão, assets ou save mudou. O renderer só consome `round-impact`, `player-shot` e `sectors.damage`; não grava nada. `src/game/game.js` tem uma linha nova (o gancho de apresentação); a simulação, `src/world`, `src/core`, `missions`, `assets`, `package*.json` e configs estão iguais à base (o workflow verifica com `git diff --exit-code`). Falhas do módulo ficam contidas (`counts.errors`), sem saltar os handlers do evento. Detalhe em [DESIGN.md](DESIGN.md).

## Ficheiros

[FILES_CHANGED.txt](FILES_CHANGED.txt). Produção: `src/render/m01-damage-decals.js` (novo), `src/render/m01-view.js` (ganchos; cores de instância do lote de lascas desde a construção), `src/game/game.js` (+1 linha). Testes: `tests/m01-damage-decals.test.js`, `tests/browser/m01-damage-decals.spec.js`. Verificação: `tools/verification/m01-damage-decals-{fixture.html,gallery.mjs,cpu.mjs}`. CI: `.github/workflows/m01-environmental-damage-decal-pass-v1.yml`. Docs: esta pasta, `RUNBOOK.md`, `DEVELOPMENT_STATUS.md`, `docs/NEXT_CHAT_CONTEXT.md`, índice `docs/verification/m01-runtime/README.md`.

## Resultados

| Verificação | Resultado |
|---|---|
| Node completo (`npm test`) | **337/337** (13 novos em `tests/m01-damage-decals.test.js`, incluindo rota real bit-idêntica com eventos congelados) — [log](logs/node-test.log) |
| Node focado | 13/13 — [log](logs/node-focused.log) |
| Build de produção | PASS (aviso de chunk > 500 kB já existente na base) — [log](logs/build.log) |
| Browser AFTER (decals 3, battlefield FX 2, combat feedback 3) | **8/8** — [log](logs/browser-after.log) |
| Browser BEFORE (ganchos da base, mesmas vistas) | 3/3 — [log](logs/browser-before.log) |
| Galeria (fixture) | 17 vistas, atlas pronto em todas, sem erros — [relatório](gallery/gallery-report.json) |
| Invariância da autoridade (`git diff --exit-code 99309d9` em simulação/mundo/core/missão/assets/configs; `game.js` só +1 linha) | PASS (passo do workflow) |
| CI do workflow focado no checkpoint `b084bba` | verde em `claude/bold-cannon-rkvxjp` ([run 37720345045](https://github.com/Brawl2007/COD-guerra/actions/runs/37720345045)); em `codex/…` ([run 37720348114](https://github.com/Brawl2007/COD-guerra/actions/runs/37720348114)) o browser deu 7/8: o teste existente `m01-battlefield-fx` "real in-flight round…" expirou num `page.screenshot` de 30 s (excerto do log do job e sonda local em [logs/session-probes.txt](logs/session-probes.txt); diagnóstico em [PERFORMANCE.md](PERFORMANCE.md)). No commit seguinte passou nas duas branches (linha abaixo). |
| CI do workflow focado no commit `61db784` | verde nas duas branches, em todos os passos: `claude/…` ([run 37751291323](https://github.com/Brawl2007/COD-guerra/actions/runs/37751291323)) e `codex/…` ([run 37751298242](https://github.com/Brawl2007/COD-guerra/actions/runs/37751298242)); browser AFTER 8/8 e BEFORE 3/3 em cada uma, incluindo o teste "real in-flight round…" que tinha expirado (um run verde não prova a causa desse timeout). No run da branch `claude/…` a sonda `west-bridgehead` AFTER foi capturada já na cena da chamada, sem falhar o teste: corrigido a seguir (ver "Depois do CI do commit `61db784`"). Este resultado pertence à revisão anterior; o CI do commit com a correcção é separado. |
| CI do workflow focado no commit `f745952` | vermelho nas duas branches: `claude/…` ([run 37759525691](https://github.com/Brawl2007/COD-guerra/actions/runs/37759525691)) e `codex/…` ([run 37759527952](https://github.com/Brawl2007/COD-guerra/actions/runs/37759527952)); autoridade, Node, build e BEFORE 3/3 verdes; browser AFTER 7/8, com todos os testes dos decals verdes (as sondas passaram com as guardas novas). O teste existente "real in-flight round…" expirou outra vez em `page.screenshot` (30 s). Causa medida e corrigida a seguir: a primeira lasca de FX trocava o programa a meio do combate (ver "Depois do CI do commit `f745952`" e [PERFORMANCE.md](PERFORMANCE.md)). Este resultado pertence à revisão anterior; o CI do commit com a correcção é separado. |

## Revisão e verificação independentes (antes do commit)

Dois agentes independentes, só de leitura, sobre a árvore de trabalho: **Reviewer** (código, testes, riscos) e **Verifier** (reexecução de testes/build/browser, comparação base/candidato, docs contra código). Tudo o que encontraram foi tratado antes do commit:

| Origem | Achado | Resolução |
|---|---|---|
| Reviewer (bloqueante) | `aim()` do spec calculava o olho com `gameDiagnostics().player` sem `space:'metres'` (unidades legadas) | corrigido; os dois testes de tiro passam e acertam os alvos pedidos |
| Reviewer | sondas exigiam `marks === 0` com o jogo a correr (risco de flake com fogo inimigo) | asserção removida das sondas; "nada de marcas ressuscitadas do save" fica no teste Node |
| Reviewer | `refineGroundPoint` podia não terminar com pontos não finitos/enormes | guarda `0 < distância < 5000` |
| Reviewer | marcas na parede do portal podiam passar ~7 cm para o vão do arco | marca confinada ao pano ao lado da abertura ou acima do fecho; teste novo (falha sem a correcção) |
| Reviewer | juntas, pranchas e pedra recebiam só pó de terra | FX da superfície desenhada (`fx`) para pedra, madeira, casca, metal e pavimento |
| Reviewer | compilação dos shaders no primeiro impacto | `renderer.compile` no primeiro frame; geometria vazia do resíduo já com o formato final |
| Reviewer | atlas síncrono (~0,36 s de CPU) no construtor | pintado em 64 fatias por temporizador; o mesmo gerador serve a versão síncrona e o checksum medido foi igual ([logs/session-probes.txt](logs/session-probes.txt)) |
| Reviewer | `dirty` morto, cores CSS convertidas por frame, cópias por frame, `slice(-0)`, lascas sem corte ao baixar a qualidade, ramo morto | removidos/corrigidos |
| Reviewer | teste da assinatura não isolava os receptores; contagem de texturas constante | teste com a mesma lista de dano e receptores diferentes; texturas contadas nos materiais |
| Verifier | vista da via sem marcas visíveis (tiros fora da via) | tiros com mira (ADS) a 3 m apontados à cabeça do carril, travessa, balastro e carril oposto |
| Verifier | fachada da estação quase igual | poeira do bloco "cinza" tinha o tom do solo: passou a poeira clara de alvenaria, mais opaca; mancha 2,6 → 4,5 m; entulho maior; sonda frontal sem os adereços do pátio à frente |
| Verifier | marcas no tijolo pareciam anéis iguais | cada célula com lasca própria (buraco descentrado, contorno, 0,10–0,20 m) |
| Verifier | detrito grande parecia um dado | rocha low-poly (vértices deslocados por hash); demolição 12–45 cm |
| Verifier | gancho antes dos handlers sem protecção | `try/catch` nos dois pontos de entrada; `counts.errors` = 0 verificado no browser |
| Verifier | teste de invariância sem tiros do jogador | rota com o piloto de apoio, que dispara contra a MG |
| Verifier | 5 imprecisões no DESIGN.md; galeria escrevia por omissão na pasta versionada | DESIGN corrigido; omissão `test-results/m01-damage-decals` |

Segunda revisão (sobre as alterações posteriores ao commit `b084bba`):

| Achado | Resolução |
|---|---|
| a pintura do atlas em fatias podia não acabar antes de capturas em SwiftShader (frames de cerca de 1 s): uma imagem da galeria saiu sem arte | promessa `m01DecalAtlasReady`; a fixture e o spec esperam por ela (o spec no menu pausado, antes de continuar) |
| se a pintura falhasse, as cadeias de temporizador reagendavam sem fim | erro guardado, promessa rejeitada, `counts.errors`; nunca reagenda |
| (terceira leitura) com essa guarda, uma falha do atlas lançava do construtor, porque os contadores só existem depois de `reset()` | a pintura arranca depois de `reset()`; `atlasError` nos diagnósticos sobrevive ao restauro e o spec falha logo em vez de esperar 120 s; simulado com uma cópia temporária do módulo cujo pintor lança ([logs/session-probes.txt](logs/session-probes.txt)) |
| pintar no carregamento do módulo gastava CPU em páginas sem M01 | a pintura começa na criação da vista M01 |
| possível custo de construção de pipeline no primeiro desenho (ANGLE/Vulkan), no frame do primeiro impacto | primeiro frame: compilação mais um desenho sem píxeis de cada malha; teste Node novo |
| poeira da estação | aprovada (raio 4,5 m; polígonos dentro da caixa do edifício descartados) |

Depois do CI do commit `61db784`:

| Achado | Resolução |
|---|---|
| a sonda `west-bridgehead` partia de um estado 13,25 s depois da demolição oeste (primeira amostra da rota a 13 s ou mais); a cena acaba aos 15 s com a chamada, que leva o jogador para (−260,5; 68,2). O jogo avança no máximo 0,25 s por frame e as sondas avançaram 0,27–2,77 s antes da pausa; no run 37751291323 a captura AFTER saiu já na chamada (relógio 1049,43) e o teste passou na mesma, porque só verifica o resíduo | estado 8,25 s depois da demolição (primeira amostra a 8 s ou mais; 6,75 s de margem até ao fim da cena, a mesma da `station-facade` antes da demolição oeste; na pose encenada, longe do abrigo, a chamada não dispara); antes da captura, cada sonda exige que nenhum evento tenha disparado desde o carregamento e que o jogador continue a menos de 0,5 m da posição encenada (x/z); margens de todas as vistas medidas em Node ([logs/session-probes.txt](logs/session-probes.txt)); capturas BEFORE/AFTER, logs e contadores regenerados com o spec corrigido |

Revisão e verificação independentes desta correcção, antes do commit (os mesmos papéis, só leitura sobre a árvore de trabalho):

| Origem | Achado | Resolução |
|---|---|---|
| Reviewer (a corrigir) | a guarda de posição não cobria a `station-facade`: a demolição oeste dispara 6,75 s depois do estado sem mover o jogador, e no modo BEFORE nada apanhava uma captura tardia | cada sonda verifica também, antes da captura, que nenhum evento disparou desde o carregamento (`eventIds`, igual na base); uma cópia temporária do spec que segura a `station-facade` 7 s antes da pausa falha nessa asserção ([logs/session-probes.txt](logs/session-probes.txt)) |
| Reviewer | os comentários do spec davam a chamada como limite no estado novo (com o jogador longe do abrigo ela não dispara); asserções sem mensagem | comentários com os limites reais (demolição oeste na `station-facade`, restauro fora dos limites na `east-deck-end`); mensagens com a sonda e o relógio |
| Verifier | desvios reais de 8,25 s e 13,25 s (a rota é amostrada a cada 1 s); a guarda verifica só x/z; no estado de 8,25 s a chamada não está pendente | textos corrigidos no HANDOFF, BEFORE_AFTER, sondas, status e contexto |

O Verifier confirmou ainda, sobre a primeira versão da correcção: só spec, docs e provas mudam e a invariância da autoridade passa; Node 336/336; teste das sondas com o spec corrigido (`west-bridgehead` no relógio 1042,30, na posição encenada); a guarda de posição falha quando forçada (estado de 13,25 s e espera até ao relógio 1049: 239,8 m, e a imagem da falha mostra a chamada); checksums 44/44; tabela e resumo do PERFORMANCE recalculados dos logs; factos de CI conferidos nos logs dos jobs; entrada 5 das sondas reproduzida. O Reviewer releu a versão final do spec sem achados. As provas do browser foram depois regeneradas com o spec final (BEFORE 3/3, AFTER 8/8).

Depois do CI do commit `f745952`:

| Achado | Resolução |
|---|---|
| o teste existente `m01-battlefield-fx` "real in-flight round…" expirou em `page.screenshot` (30 s) nos dois runs; já tinha expirado num run de `b084bba`. Sonda A/B no estado do teste (2 núcleos, 6 capturas de cada lado): base 8,6–9,9 s, candidato 9,2–16,3 s; nas 3 capturas instrumentadas do candidato um programa novo (`MeshStandardMaterial` + `USE_INSTANCING_COLOR`) era ligado depois do impacto num frame de 6,4–6,6 s de CPU. Origem: este passe dá lascas às balas em madeira e pedra desenhadas, e o lote de lascas só ganhava cores de instância na primeira lasca | `M01View.createFireEffects` cria as cores de instância das lascas na construção e o lote é desenhado uma vez, sem píxeis, no primeiro frame (`damageDecals.update({…, warm})`); teste Node novo (falha sem a correcção) e teste de aquecimento alargado; na mesma sonda depois da correcção 9,5–9,7 s, sem programas novos depois do impacto ([logs/session-probes.txt](logs/session-probes.txt), entradas 7–9) |

Revisão e verificação independentes desta correcção, antes do commit:

| Origem | Achado | Resolução |
|---|---|---|
| Reviewer | correcção certa em todos os caminhos: o programa das lascas com cores de instância é o único ligado, no primeiro frame; a instância de aquecimento tem área zero e o `updateFire` reescreve a contagem em cada frame desenhado; cores das lascas inalteradas; nada bloqueante | — |
| Reviewer (testes) | verificar a lista `warm` por expressão regular; caso com uma malha já ocupada, que fica intacta; usar o `updateFire` da própria vista para repor a contagem | aplicados |
| Reviewer (notas) | faíscas sem aquecimento; trocas de iluminação da base religam os materiais iluminados; `battlefieldShards` e possíveis lascas pretas por `vertexColors` sem atributo de cor vêm da base | registados nas limitações; fora desta correcção |
| Verifier | âmbito e autoridade PASS; Node 337/337, e cada metade da correcção tem um teste que falha sem ela; teste "real in-flight round…" 3/3 em 2 núcleos (49,5–51,4 s); sonda: 8,9–10,1 s, sem programas novos depois do impacto (a base na mesma máquina: 9,3–10,1 s); checksums 44/44; tabela, resumo e diagnóstico do PERFORMANCE conferidos com os logs; factos de CI conferidos nos logs dos jobs | — |
| Verifier (texto) | seis imprecisões: a base também liga modelos do mundo depois de continuar (antes do impacto); `battlefieldShards` também começa sem cores de instância; frames longos e medianas sem a condição; "três runs concluídos"; ligações medidas nas 3 capturas instrumentadas | corrigidas |

Os relatórios integrais dos agentes não são publicados; os pontos acima são o resumo fiel do que foi encontrado e corrigido.

## Evidências

- [BEFORE_AFTER.md](BEFORE_AFTER.md): seis pares base/candidato no build de produção e a galeria de grandes planos.
- [PERFORMANCE.md](PERFORMANCE.md): orçamento, contadores do renderer e tempos de CPU do módulo (não são FPS).
- [DESIGN.md](DESIGN.md): arquitectura, autoridade, superfícies, materiais, ciclo de vida e limitações.
- `logs/`: Node focado e completo, build, browser BEFORE/AFTER, galeria. `perf/`: tempos de CPU por rota/qualidade. `SHA256SUMS.txt`.

## Limitações e pendências

- Fuligem das janelas da estação quase invisível na fachada escura; queimados da demolição leste discretos ao nível do chão (legíveis de cima e junto aos destroços).
- Reconstruir o resíduo custa 3–4,5 ms (mediana) a 14–21 ms (máximo) de CPU em Node, uma vez por explosão ou restauro.
- Sem marcas em personagens, vagões, locomotiva, Panzerzug, treliças, água e portal de Lisewo.
- Primeiros desenhos e trocas de programa por tratar: o lote de faíscas vem da base, partilha programa e geometria com o clarão das armas inimigas e não é aquecido; o caso de um tiro do jogador num carril construir esse pipeline (pequeno) antes de qualquer tiro inimigo é novo neste passe, porque antes os tiros do jogador não tinham FX de impacto; o lote `battlefieldShards` das explosões só cria cores de instância no primeiro uso; as trocas de iluminação (luz da explosão visível, sombra do sol por volta das 04:57) religam todos os materiais iluminados, incluindo os dos decals. Ficam para o FX de batalha e a iluminação.
- Possível defeito da base, não verificado em imagem: as lascas e os estilhaços usam `vertexColors` numa geometria sem atributo de cor, por isso o tom final pode vir do valor genérico do WebGL (preto ou herdado) e não da cor de instância.
- Provas em Chromium/SwiftShader; sem Chromebook físico nem playtest humano.
