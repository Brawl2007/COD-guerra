# EVIDENCE — M01 first-person weapon presentation V1

Execução **local**: contentor Linux de 4 núcleos, Node 22, Chromium 1194 com ANGLE/SwiftShader (WebGL por software). Não é CI remoto, Chromebook nem GPU real. Nenhum número abaixo é FPS de jogo.

| Campo | Valor |
|---|---|
| Base | `99309d9cb023cc94a07d41ff863e1362e4460570` |
| Runtime verificado | `5743b83` (código + testes). A suíte integral de navegador correu em `a428925`. Depois disso o runtime mudou quatro vezes: <ul><li>`9827c73`: sem atraso de olhar em ADS; o fallback lê o tempo do ferrolho do perfil.</li><li>`dfb1572`: pré-compilação dos programas de FX do tiro (secção «Primeiro disparo»).</li><li>`d97329c`: a pré-compilação repete-se quando muda a configuração de luzes do mundo, com a luz das explosões nos dois estados.</li><li>`5743b83`: a chave inclui o tipo de shadow map e os dois passes repetem-se quando ela muda; a bancada pede `PCFShadowMap`, o tipo que o three r186 desenha (segunda revisão em [`VERIFICATION.md`](VERIFICATION.md)).</li></ul> Em `5743b83` repetiram-se os testes Node, o build, a medição do primeiro disparo em Média, os testes de navegador da arma e `m01.spec.js:38` (alternado com a base e `d97329c`). As capturas não foram repetidas: são de `d97329c` (secção «Capturas»). Os commits seguintes só acrescentam documentação. |
| Ficheiros | [`FILES_CHANGED.txt`](FILES_CHANGED.txt): só `src/render/*`, testes e ferramentas de verificação. Gameplay/world/core/assets/research/missions/build/CI sem diff contra a base. |

## Testes

| Comando | Resultado |
|---|---|
| `node --test tests/m01-weapon-presentation.test.js` | **28/28 PASS** (`5743b83`), com o teste novo do renderer real do three sobre WebGL2 falso |
| `npm test` | **352/352 PASS**, 0 skips (`5743b83`, [`logs/node.log`](logs/node.log)) |
| `npm run build` | **PASS**, bundle 1 232,18 kB (gzip 333,41 kB) (aviso existente de chunk > 500 kB) (`5743b83`, [`logs/build.log`](logs/build.log)); base 1 198,77 kB ([`logs/base-build.log`](logs/base-build.log)) |
| `CI=1 npx playwright test` em `a428925` (suíte integral, 1 worker, 0 retries, sem capturas em paralelo; um revisor correu scripts Node curtos durante parte da execução) | **59/64 PASS, 5 FAIL**, 37,6 min ([`logs/browser-full.log`](logs/browser-full.log)). Passam os 3 testes novos (`m01-weapon-presentation.spec.js`) e as 3 variantes de `m01-wz29-viewmodel.spec.js`. `m01.spec.js:99` (rigs e mãos) falha em `fireRound` (linha 131), como na base, sem chegar às asserções da arma. As 5 falhas estão na secção seguinte. |

Subconjunto de navegador em `dfb1572` (`CI=1`, 1 worker, máquina sem outra carga): **7/9 PASS** em 5,9 min ([`logs/browser-subset.log`](logs/browser-subset.log)). Os mesmos 3 testes que não são da arma correram na base nas mesmas condições ([`logs/base-subset.log`](logs/base-subset.log)). Em `d97329c` repetiram-se os testes da arma e `m01.spec.js:38` ([`logs/browser-subset-d97329c.log`](logs/browser-subset-d97329c.log)): os 3 testes da arma e as 3 variantes da wz.29 passam; `m01.spec.js:38` falhou (secção «`m01.spec.js:38` no limite», abaixo). Em `5743b83`, os 3 testes da arma e as 3 variantes da wz.29 (Baixa, Média, Alta) passam: **6/6** em 2,4 min ([`logs/browser-weapon-5743b83.log`](logs/browser-weapon-5743b83.log)); `m01.spec.js:38` foi repetido à parte (abaixo).

| Teste | `dfb1572` | Base `99309d9` |
|---|---|---|
| `m01-weapon-presentation.spec.js` (3 testes) | PASS | (não existe) |
| `m01-wz29-viewmodel.spec.js` (3 variantes) | PASS | — |
| `m01.spec.js:38` (ferrolho, clipe, miras, ADS, pausa, CP-A) | **PASS** (1,8 min) | PASS (1,7 min) |
| `m01.spec.js:99` (rigs e mãos) | falha na linha 131 (`fireRound`) | **falha igual** (linha 131) |
| `game.spec.js:28` (bancada: tiro, recarga, pausa) | 1 PASS em 3 execuções; as falhas são na linha 59 | 1 PASS em 3 execuções; as falhas são na linha 59 |

Notas:
- **`m01.spec.js:38` antes da correcção.** Em `9827c73` falhava no primeiro disparo (linha 45: `mag` 4 em 5 s, [`logs/t1-two-9827c73.log`](logs/t1-two-9827c73.log)), por causa da compilação no primeiro tiro (abaixo). Esse log e [`logs/base-two.log`](logs/base-two.log) correram enquanto o verificador da outra branch usava a CPU; na base, nessa carga, falhou mais à frente (linha 55).
- **`game.spec.js:28` está no limite nas duas.** A linha 59 espera 12 s de tempo de parede para a recarga acabar depois de retomar ([`logs/game28-repeat.log`](logs/game28-repeat.log), alternado com a base). A medição [`logs/bench-reload.mjs`](logs/bench-reload.mjs) faz a mesma sequência em Média ([`logs/bench-reload.jsonl`](logs/bench-reload.jsonl)):
  - a recarga acaba 11,5 e 12,4 s depois de retomar na candidata, 11,8 e 11,9 s na base;
  - os callbacks de `requestAnimationFrame` por segundo de parede (SwiftShader, não FPS do jogo) são iguais nas duas: 2,4–2,5 em repouso e 4,65 durante a recarga. O JSONL é a saída tal como foi produzida, com o campo ainda chamado `fps`; o script passou depois a escrevê-lo como `rafPerWallSecond` (o mesmo valor).

  O resultado vira com o ruído. A candidata não torna esta sequência mais lenta.

### `m01.spec.js:38` no limite

A linha 55 espera que a recarga por clipe (3,4 s de relógio da missão) acabe em 15 s de tempo de parede depois de retomar. Neste contentor, isso fica no limite para todos os builds.

| Build | Execuções do teste | Segundos de retomar até `mag` 5, sem prazo ([`logs/m01-reload.jsonl`](logs/m01-reload.jsonl)) |
|---|---|---|
| base `99309d9` | **5 PASS em 5** (3 antes, 2 na série alternada nova) | 15,10 · 13,18 |
| `dfb1572` | 3 PASS em 3 | 15,02 · 14,56 |
| `d97329c` | **1 PASS em 7** (5 antes, 2 na série nova), sempre na linha 55 | 14,31 · 14,51 |
| `5743b83` | **0 PASS em 2** (série nova), linha 55 | — |

Fontes:
- Série alternada nova ([`logs/m01-38-interleaved.log`](logs/m01-38-interleaved.log)): máquina sem outra carga, uma execução de cada build por ronda (base, `d97329c`, `5743b83`), duas rondas completas.
- [`logs/m01-38-repeat.log`](logs/m01-38-repeat.log) tem duas séries anteriores com rótulos repetidos:
  - linhas 1–110: base e `d97329c` alternados;
  - linhas 111–179: `dfb1572` e `d97329c` alternados.
- Os subconjuntos: [`logs/base-subset.log`](logs/base-subset.log), [`logs/browser-subset.log`](logs/browser-subset.log), [`logs/browser-subset-d97329c.log`](logs/browser-subset-d97329c.log).

O que se sabe:
- **A diferença repete-se e não parece ruído.** As builds com a pré-compilação de `d97329c` (`d97329c` e `5743b83`) falham este passo quase sempre; a base e `dfb1572` passam sempre.
- **A causa não foi encontrada.**
  - De `dfb1572` para `d97329c` só mudou a pré-compilação: repetição por chave e luz das explosões nos dois estados. Sem mudança de chave, custa por frame uma string e um `Set.has`.
  - Em Baixa e antes do nascer do sol, `5743b83` comporta-se como `d97329c`.
- A medição sem prazo ([`logs/m01-reload.mjs`](logs/m01-reload.mjs)) não reproduz a falha: `d97329c` acabou em 14,31 e 14,51 s, e a base e `dfb1572` passaram dos 15 s uma vez cada (15,10 e 15,02 s).
- Foram retiradas duas afirmações da versão anterior:
  - «o passa/falha vira com o ruído»;
  - a ligação a +6,8 %: `dfb1572` tem os mesmos FX e passa.
- **Risco aberto antes do merge.**
  - Repetir o teste num CI com GPU.
  - No contentor, ver o estado do jogo no momento da falha, para separar uma recarga lenta de uma retoma que não pegou.

Custo por frame com tiros no fixture, **n = 1**: [`logs/fixture-frame-cost.mjs`](logs/fixture-frame-cost.mjs) desenha 50 frames com dois tiros e os ciclos do ferrolho, cada um sincronizado com `readPixels`.
- Resultado: +6,8 % no total (59,7 s contra 55,9 s; mediana 1177 contra 1110 ms por frame).
- Uma execução por build, não alternada, sem repetição.
- A saída bruta está em [`logs/fixture-frame-cost-raw.jsonl`](logs/fixture-frame-cost-raw.jsonl). A do candidato tem o rótulo `t1mut`: uma cópia de trabalho com os ficheiros que deram `d97329c`.
- O resumo [`logs/fixture-frame-cost.jsonl`](logs/fixture-frame-cost.jsonl) sai de [`logs/fixture-frame-cost-summary.py`](logs/fixture-frame-cost-summary.py), byte a byte.

## Primeiro disparo: compilação de shaders

[`logs/first-shot-ab.mjs`](logs/first-shot-ab.mjs) abre o build de produção, chega a CP-A e dispara uma vez com um clique real. Corre na qualidade que o SwiftShader escolhe (Baixa, sem shadow maps; Média na subsecção «Em Média», abaixo). Mede o tempo de parede até `mag` = 4 e a duração dos frames à volta do clique (SwiftShader, não FPS). Base, candidata antes da correcção e candidata corrigida, alternadas, duas vezes ([`logs/first-shot-ab.jsonl`](logs/first-shot-ab.jsonl)):

| Build | s até `mag` 4 | Frame a seguir ao clique | 4 frames seguintes (efeitos activos) |
|---|---|---|---|
| base `99309d9` (4 execuções) | 0,77 · 1,06 · 0,78 · 0,71 | normal (23–50 ms depois de um frame de 1,2–1,4 s) | 1,1–1,5 s |
| `9827c73` | 4,89 · 4,80 | **3,9 · 4,0 s** | 1,4–1,7 s |
| `dfb1572` | 1,26 · 1,00 | normal | 1,2–1,8 s |
| `d97329c` | 1,16 · 1,02 | normal | 1,2–1,9 s |

- O frame do tiro já não pára; o tempo até `mag` 4 fica a menos de um frame da base (os frames duram 1,1–1,9 s neste contentor).
- Os frames seguintes, com efeitos activos (clarão, fios de fumo, nuvem), foram mais pesados do que na base: até ~1,9 s contra 1,1–1,5 s (n = 2 por build). Provável causa, não medida: o SwiftShader rasteriza no CPU, e esses efeitos são sprites transparentes que cobrem muitos píxeis. Não foi medido em GPU real.

**Causa.** [`logs/first-shot-gl.mjs`](logs/first-shot-gl.mjs) cronometra as chamadas WebGL por frame ([`logs/first-shot-gl.jsonl`](logs/first-shot-gl.jsonl)).
- As camadas do clarão, os fios de fumo e os sprites da nuvem estão escondidos em repouso, por isso os seus programas eram criados no primeiro tiro. Os pools de invólucros e de clipe estão visíveis com `count` 0, por isso o three usa os seus programas em todos os frames; só o pool de invólucros era criado no primeiro invólucro.
- O ANGLE/SwiftShader só termina a compilação e o link no primeiro uso.
- **Execução GL de `9827c73`:** o frame do tiro durou 3,7 s, dos quais `getShaderInfoLog` ×6 levou 2,4 s e `getProgramInfoLog` ×3 levou 1,3 s: 3 programas (clarão, fios, nuvem). Em `d97329c` o frame do tiro não tem chamadas de compilação (em Baixa).
- **Build intermédia, não commitada** (só `compile()` sobre a cena inteira, sem forçar o link): o custo ficou no primeiro uso. No frame do tiro, `getShaderInfoLog` ×6 levou 2,6 s e `getProgramInfoLog` ×3 levou 1,3 s. Além disso, no three r186 `compile(scene)` compila todos os materiais da cena, também os escondidos.

**Correcção** (`dfb1572`; repetição por configuração de luzes em `d97329c`; tipo de shadow map em `5743b83`): `prewarmWeaponFx`.
- Cada objecto de FX é compilado sozinho contra a sua cena (`compile(object, camera, scene)`: as luzes visíveis, as sombras, o nevoeiro e o ambiente dessa cena) e cada programa é usado uma vez (consulta de uniforms). Assim o link acontece aí, sem desenhar nada nem mudar visibilidades.
- As chaves dos programas dependem do estado do renderer e da cena. Por isso os dois passes (arma e mundo) são preparados outra vez sempre que muda um destes valores (`programStateKey`):
  - shadow maps ligados ou desligados, numa mudança de qualidade;
  - o tipo de shadow map. A bancada passou a pedir `PCFShadowMap`, o tipo que o r186 desenha; antes, o r186 reescrevia o tipo a meio do primeiro frame com sombra;
  - a sombra do sol do M01, que começa ao nascer (~04:56).

  Os programas que não mudam são reaproveitados.
- A luz das explosões pisca, por isso cada preparação do passe do mundo compila-a nos dois estados.
- Com a correcção, o frame do tiro não compila os FX da arma, em Baixa e em Média (subsecção seguinte).
- No arranque, o frame com mais compilação liga 25 programas em `d97329c` (23 em `dfb1572`; 20 em `9827c73`; 18 na base), com duração do mesmo tipo (2,4 s; base 2,2 s). Os 2 a mais em relação a `dfb1572` são as variantes com a luz das explosões acesa.

### Em Média (shadow maps ligados)

As medições acima correram em Baixa, a qualidade que o SwiftShader escolhe, sem shadow maps. A segunda revisão ([`VERIFICATION.md`](VERIFICATION.md)) mostrou que em Média `d97329c` voltava a compilar no tiro:
- a bancada pedia `PCFSoftShadowMap`;
- o three r186 reescreve-o para `PCFShadowMap` dentro do primeiro render com sombra, depois da pré-compilação desse frame;
- o tipo entra na chave de todos os programas.

[`logs/first-shot-programs.mjs`](logs/first-shot-programs.mjs) conta os programas criados (`createProgram`/`linkProgram`) em cada frame, do clique até dois frames depois de o HUD mostrar o tiro. Corre em Média:
- na bancada;
- no M01 a partir de um save genuíno depois do nascer do sol (04:58, [`logs/sunrise-save.mjs`](logs/sunrise-save.mjs));
- no M01 no início da missão (04:30, antes do nascer do sol).

Os builds foram alternados, duas rondas ([`logs/first-shot-programs.jsonl`](logs/first-shot-programs.jsonl)):

| Build | Bancada, Média | M01 depois do nascer do sol, Média | M01 às 04:30, Média |
|---|---|---|---|
| base `99309d9` | 2 · 2 (no frame do tiro) | 0 · 0 | 0 |
| `d97329c` | **4 · 4** (3 no frame do tiro, 1 depois) | **3 · 3** (no frame do tiro) | 0 |
| `5743b83` | 1 · 1 (no frame do tiro; ver abaixo) | **0 · 0** | 0 (e 0 em Baixa) |

- Antes do nascer do sol nenhuma luz do M01 projecta sombra. O three não chega a reescrever o tipo, por isso `d97329c` já não compilava aí.
- O aviso do r186 sobre `PCFSoftShadowMap` aparece na base e em `d97329c` assim que há sombra; em `5743b83` não aparece.
- O programa que sobra na bancada é o das partículas de impacto da bancada antiga: um shader instanciado com cor por instância ([`logs/first-shot-shaders.mjs`](logs/first-shot-shaders.mjs), [`logs/first-shot-shaders.jsonl`](logs/first-shot-shaders.jsonl)).
  - O primeiro `setColorAt` cria a cor por instância, o que muda a variante do programa.
  - A base compila esse mesmo programa no primeiro impacto, e mais um: o clarão antigo.
  - Não é um FX da arma e fica como está. Correcção proposta, não aplicada: criar a cor por instância na construção.
- Em Média, no M01, os frames duram 2–4 s neste contentor. O custo de 3 programas perde-se nessa variação, por isso a contagem de programas é o sinal fiável. Tempos do clique até o HUD mostrar o tiro: bancada base 1,20 · 1,48 s, `d97329c` 2,38 · 2,08 s, `5743b83` 1,63 · 1,67 s.

## Falhas de navegador que não pertencem a esta branch

As 5 falhas da suíte integral foram repetidas na **base `99309d9`**, com o build de produção da própria base, nas mesmas condições (sozinhas, `CI=1`): [`logs/base-failing7.log`](logs/base-failing7.log), [`logs/base-look3.log`](logs/base-look3.log). A repetição da candidata está em [`logs/t1-look3.log`](logs/t1-look3.log).

| Teste | Candidata | Base 99309d9 | Causa observada |
|---|---|---|---|
| `m01-audio-production.spec.js:36` | falha (timeout 300 s na linha 53) | **falha igual** (linha 53) | Um único `mousemove` despachado logo depois do pointer lock: `Input` descarta de propósito a primeira amostra depois do lock, o pitch nunca chega a −0,75. |
| `m01.spec.js:99` (rigs + mãos) | falha (`fireRound`, linha 131) | **falha igual** (linha 131) | O clique despachado logo a seguir a `#resume` pode chegar antes de o pointer lock voltar (`pointerlockchange` faz `clear()`); com < 1 frame/s a corrida perde-se. |
| `m01.spec.js:318` (salva: portões / treliça) | falha 1 de 2 variantes | **falha 2 de 2** numa execução, 1 de 2 noutra | Prazo de 5 s para o HUD mudar depois do `mousemove`, com < 1 frame/s. Falha na base em qualquer das variantes. |
| `m01.spec.js:337` (demolição na treliça) | falha | **falha igual** | Mesmo prazo de 5 s para o HUD. |
| `m01.spec.js:386` (fogo alemão no reparo) | falha | **falha igual** | Amostra 60 × 250 ms de tempo de parede à espera de estados que dependem do tempo de simulação, que avança ~0,18 s por segundo de parede (abaixo). |

Na primeira execução integral da candidata (`2e946ab`, com uma captura pesada a correr em paralelo) falharam também `m01-wagon-runtime-integration.spec.js:41` e `m01.spec.js:66`. Ambos passam na base sozinhos e passam na candidata final, na suíte integral sem carga. A carga paralela tornava esses testes de tempo de parede mais lentos.

Correcção proposta para os testes, **não aplicada** (fora do âmbito; testes de outras áreas):
- despachar primeiro um `mousemove` de 0 px, como já fazem os testes do Ju 87 e da demolição;
- esperar pelo pointer lock antes do clique;
- dar prazos em tempo de simulação em vez de tempo de parede.

## Custo relativo por frame (SwiftShader, não FPS)

[`logs/frame-rate-ab.mjs`](logs/frame-rate-ab.mjs) abre o build de produção e carrega o mesmo snapshot genuíno (bombardeamento das 05:30 + 60 s), em qualidade Baixa, sem input e com pointer lock. Conta callbacks de `requestAnimationFrame` e segundos de simulação por segundo de parede durante 20 s, alternando base e candidata duas vezes ([`logs/frame-cost-ab.jsonl`](logs/frame-cost-ab.jsonl)).

| Execução | callbacks de rAF / s de parede | s de simulação / s de parede |
|---|---|---|
| base | 0,70 · 0,70 | 0,175 · 0,175 |
| candidata `a428925` | 0,70 · 0,75 | 0,175 · 0,177 |

Dentro do ruído, a candidata não torna os frames mais pesados neste estado. A resolução é ±1 frame por janela de 20 s (~±7 %). O estado medido é de repouso, sem tiros. Os frames com efeitos activos estão na medição do primeiro disparo (acima) e nos draw calls (`CAPTURES.md`). Neste contentor, com este snapshot, o M01 renderiza **menos de 1 frame por segundo de parede** em SwiftShader, tanto na base como na candidata; perto de CP-A, 2,0–2,3 (`logs/m01-reload.jsonl`). É isso que torna frágeis os testes que medem tempo de parede (acima).

## Capturas

[`CAPTURES.md`](CAPTURES.md): 14 pares BASE/CANDIDATE e um probe dos invólucros/clipe no chão, com relatórios JSON por frame. Nos 27 frames comuns, relógio, jogador e arma são idênticos em base e candidata. Contadores de render (draw calls):
- iguais em repouso;
- +1/+2 com invólucros e clipe pousados no mundo;
- +3 a +12 com efeitos de tiro activos (M01);
- +5 a +16 na bancada.

Bundle de produção: 1 232,18 kB (gzip 333,41 kB) em `5743b83` (`d97329c`: 1 232,24 kB; base 1 198,77 kB, gzip 321,48 kB: [`logs/base-build.log`](logs/base-build.log)).

As capturas finais são de `d97329c` e idênticas píxel a píxel às de `9827c73` e `dfb1572`. Em relação a `a428925`, 24 dos 28 frames são idênticos; os 4 frames de ADS da bancada depois de tiros mudam pela remoção do atraso de olhar em ADS, com o mesmo estado.
- [`logs/capture-identity.txt`](logs/capture-identity.txt) tem os digests SHA-256 completos dos PNG por frame, calculados depois de cada execução com `sha256sum`. Os PNG não estão no repositório.
- `5743b83` não foi capturado de novo. As capturas correm em Baixa, sem shadow maps, onde a mudança só altera chaves de programa, não o código dos shaders.

## Revisão independente

[`REVIEW.md`](REVIEW.md): sem bloqueadores. Nove constatações e uma suspeita, resolvidas ou mitigadas (ver a tabela por item: três correcções sem teste próprio e a documentação feita depois). Verificação independente em [`VERIFICATION.md`](VERIFICATION.md). Depois dela, a medição do primeiro disparo (acima) encontrou a compilação no primeiro tiro. A correcção teve uma revisão própria, também em `VERIFICATION.md`.
