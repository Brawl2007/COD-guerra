# EVIDENCE — M01 first-person weapon presentation V1

Execução **local**: contentor Linux de 4 núcleos, Node 22, Chromium 1194 com ANGLE/SwiftShader (WebGL por software). Não é CI remoto, Chromebook nem GPU real. Nenhum número abaixo é FPS de jogo.

| Campo | Valor |
|---|---|
| Base | `99309d9cb023cc94a07d41ff863e1362e4460570` |
| Runtime verificado | `d97329c` (código + testes). A suíte integral de navegador correu em `a428925`. Depois disso o runtime mudou três vezes: <ul><li>`9827c73`: sem atraso de olhar em ADS; o fallback lê o tempo do ferrolho do perfil.</li><li>`dfb1572`: pré-compilação dos programas de FX do tiro (secção «Primeiro disparo»).</li><li>`d97329c`: a pré-compilação repete-se quando muda a configuração de luzes do mundo, com a luz das explosões nos dois estados (revisão em [`VERIFICATION.md`](VERIFICATION.md)).</li></ul> Em `d97329c` repetiram-se os testes Node, o build, a medição do primeiro disparo, os testes de navegador da arma e `m01.spec.js:38`, e as capturas (idênticas píxel a píxel às de `9827c73`). Os commits seguintes só acrescentam documentação. |
| Ficheiros | [`FILES_CHANGED.txt`](FILES_CHANGED.txt): só `src/render/*`, testes e ferramentas de verificação. Gameplay/world/core/assets/research/missions/build/CI sem diff contra a base. |

## Testes

| Comando | Resultado |
|---|---|
| `node --test tests/m01-weapon-presentation.test.js` | **27/27 PASS** (`d97329c`) |
| `npm test` | **351/351 PASS**, 0 skips (`d97329c`, [`logs/node.log`](logs/node.log)) |
| `npm run build` | **PASS**, bundle 1 232,24 kB (gzip 333,40 kB) (aviso existente de chunk > 500 kB) (`d97329c`, [`logs/build.log`](logs/build.log)); base 1 198,77 kB ([`logs/base-build.log`](logs/base-build.log)) |
| `CI=1 npx playwright test` em `a428925` (suíte integral, 1 worker, 0 retries, sem capturas em paralelo; um revisor correu scripts Node curtos durante parte da execução) | **59/64 PASS, 5 FAIL**, 37,6 min ([`logs/browser-full.log`](logs/browser-full.log)). Passam os 3 testes novos (`m01-weapon-presentation.spec.js`) e as 3 variantes de `m01-wz29-viewmodel.spec.js`. `m01.spec.js:99` (rigs e mãos) falha em `fireRound` (linha 131), como na base, sem chegar às asserções da arma. As 5 falhas estão na secção seguinte. |

Subconjunto de navegador em `dfb1572` (`CI=1`, 1 worker, máquina sem outra carga): **7/9 PASS** em 5,9 min ([`logs/browser-subset.log`](logs/browser-subset.log)). Os mesmos 3 testes que não são da arma correram na base nas mesmas condições ([`logs/base-subset.log`](logs/base-subset.log)). Em `d97329c` repetiram-se os testes da arma e `m01.spec.js:38` ([`logs/browser-subset-d97329c.log`](logs/browser-subset-d97329c.log)): os 3 testes da arma e as 3 variantes da wz.29 passam; `m01.spec.js:38` falhou (secção «`m01.spec.js:38` no limite», abaixo).

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
  - os callbacks de `requestAnimationFrame` por segundo de parede (campo `rafPerWallSecond`, SwiftShader, não FPS do jogo) são iguais nas duas: 2,4–2,5 em repouso e 4,65 durante a recarga.

  O resultado vira com o ruído. A candidata não torna esta sequência mais lenta.

### `m01.spec.js:38` no limite

A linha 55 espera que a recarga por clipe (3,4 s de relógio da missão) acabe em 15 s de tempo de parede depois de retomar.

| Build | Execuções do teste ([`logs/m01-38-repeat.log`](logs/m01-38-repeat.log), [`logs/base-subset.log`](logs/base-subset.log), subconjuntos) | Segundos de retomar até `mag` 5 ([`logs/m01-reload.jsonl`](logs/m01-reload.jsonl)) |
|---|---|---|
| base `99309d9` | 3 PASS em 3 | 15,10 · 13,18 |
| `dfb1572` | 3 PASS em 3 | 15,02 · 14,56 |
| `d97329c` | 1 PASS em 5; as falhas são na linha 55 | 14,31 · 14,51 |

- [`logs/m01-reload.mjs`](logs/m01-reload.mjs) faz a mesma sequência no build de produção e mede o tempo sem prazo. Os três builds ficam no limite de 15 s (2,0–2,3 callbacks de rAF por segundo de parede); a base passa-o numa das medições.
- `d97329c` e `dfb1572` têm o mesmo trabalho por frame (a chave da pré-compilação é uma string e um `Set`). O passa/falha vira com o ruído.
- Mas a candidata é mais pesada por frame quando há tiros. [`logs/fixture-frame-cost.mjs`](logs/fixture-frame-cost.mjs) desenha 50 frames com dois tiros e os ciclos do ferrolho no fixture, cada um sincronizado com `readPixels` ([`logs/fixture-frame-cost.jsonl`](logs/fixture-frame-cost.jsonl)): **+6,8 %** no total (59,7 s contra 55,9 s; mediana 1177 contra 1110 ms por frame).
- Esse custo aproxima a candidata do limite deste passo. A correcção proposta para os testes (prazos em tempo de simulação, abaixo) também resolve este.

## Primeiro disparo: compilação de shaders

[`logs/first-shot-ab.mjs`](logs/first-shot-ab.mjs) abre o build de produção, chega a CP-A e dispara uma vez com um clique real. Mede o tempo de parede até `mag` = 4 e a duração dos frames à volta do clique (SwiftShader, não FPS). Base, candidata antes da correcção e candidata corrigida, alternadas, duas vezes ([`logs/first-shot-ab.jsonl`](logs/first-shot-ab.jsonl)):

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
- **Execução GL de `9827c73`:** o frame do tiro durou 3,7 s, dos quais `getShaderInfoLog` ×6 levou 2,4 s e `getProgramInfoLog` ×3 levou 1,3 s: 3 programas (clarão, fios, nuvem). Em `d97329c` o frame do tiro não tem chamadas de compilação.
- **Build intermédia, não commitada** (só `compile()` sobre a cena inteira, sem forçar o link): o custo ficou no primeiro uso. No frame do tiro, `getShaderInfoLog` ×6 levou 2,6 s e `getProgramInfoLog` ×3 levou 1,3 s. Além disso, no three r186 `compile(scene)` compila todos os materiais da cena, também os escondidos.

**Correcção** (`dfb1572`; repetição por configuração de luzes em `d97329c`): `prewarmWeaponFx`.
- Cada objecto de FX é compilado sozinho contra a sua cena (`compile(object, camera, scene)`: as luzes visíveis, as sombras, o nevoeiro e o ambiente dessa cena) e cada programa é usado uma vez (consulta de uniforms). Assim o link acontece aí, sem desenhar nada nem mudar visibilidades.
- O passe da arma tem luzes constantes e é preparado uma vez.
- As chaves dos programas dependem da configuração de luzes, por isso o passe do mundo é preparado outra vez sempre que essa configuração muda:
  - o sol passa a projectar sombra ao nascer (~04:56);
  - uma mudança de qualidade liga ou desliga os shadow maps;
  - a luz das explosões pisca, por isso cada preparação compila-a nos dois estados.
- Com a correcção, o frame do tiro não tem tempo de compilação.
- No arranque, o frame com mais compilação liga 25 programas em `d97329c` (23 em `dfb1572`; 20 em `9827c73`; 18 na base), com duração do mesmo tipo (2,4 s; base 2,2 s). Os 2 a mais em relação a `dfb1572` são as variantes com a luz das explosões acesa.

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

Bundle de produção: 1 232,24 kB (gzip 333,40 kB) em `d97329c` (base 1 198,77 kB, gzip 321,48 kB: [`logs/base-build.log`](logs/base-build.log)).

As capturas finais são de `d97329c` e idênticas píxel a píxel às de `9827c73` e `dfb1572`. Em relação a `a428925`, 24 dos 28 frames são idênticos; os 4 frames de ADS da bancada depois de tiros mudam pela remoção do atraso de olhar em ADS, com o mesmo estado. As somas SHA-256 dos PNG por frame estão em [`logs/capture-identity.txt`](logs/capture-identity.txt).

## Revisão independente

[`REVIEW.md`](REVIEW.md): sem bloqueadores. Nove constatações e uma suspeita, resolvidas ou mitigadas (ver a tabela por item: três correcções sem teste próprio e a documentação feita depois). Verificação independente em [`VERIFICATION.md`](VERIFICATION.md). Depois dela, a medição do primeiro disparo (acima) encontrou a compilação no primeiro tiro. A correcção teve uma revisão própria, também em `VERIFICATION.md`.
