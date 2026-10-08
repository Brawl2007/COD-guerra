# EVIDENCE — M01 first-person weapon presentation V1

Execução **local**: contentor Linux de 4 núcleos, Node 22, Chromium 1194 com ANGLE/SwiftShader (WebGL por software). Não é CI remoto, Chromebook nem GPU real. Nenhum número abaixo é FPS de jogo.

| Campo | Valor |
|---|---|
| Base | `99309d9cb023cc94a07d41ff863e1362e4460570` |
| Runtime verificado | `a428925` (código + testes). O commit seguinte só acrescenta documentação, capturas e um probe de evidência no fixture de verificação. |
| Ficheiros | [`FILES_CHANGED.txt`](FILES_CHANGED.txt): só `src/render/*`, testes e ferramentas de verificação. Gameplay/world/core/assets/research/missions/build/CI sem diff contra a base. |

## Testes

| Comando | Resultado |
|---|---|
| `node --test tests/m01-weapon-presentation.test.js` | **23/23 PASS** |
| `npm test` | **347/347 PASS**, 0 skips, 203 s ([`logs/node.log`](logs/node.log)) |
| `npm run build` | **PASS** (aviso existente de chunk > 500 kB) ([`logs/build.log`](logs/build.log)) |
| `CI=1 npx playwright test` (suíte integral, 1 worker, 0 retries, sem outra carga na máquina) | **59/64 PASS, 5 FAIL**, 37,6 min ([`logs/browser-full.log`](logs/browser-full.log)). Os 3 testes novos (`m01-weapon-presentation.spec.js`) e os testes existentes da wz.29/viewmodel/rig passam. As 5 falhas estão na secção seguinte. |

## Falhas de navegador que não pertencem a esta branch

As 5 falhas da suíte integral foram repetidas na **base `99309d9`**, com o mesmo build de produção, nas mesmas condições (sozinhas, `CI=1`). Logs: [`logs/base-failing7.log`](logs/base-failing7.log), [`logs/base-look3.log`](logs/base-look3.log), [`logs/t1-look3.log`](logs/t1-look3.log).

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

| Execução | frames/s de parede | s de simulação / s de parede |
|---|---|---|
| base | 0,70 · 0,70 | 0,175 · 0,175 |
| candidata `a428925` | 0,70 · 0,75 | 0,175 · 0,177 |

Dentro do ruído, a candidata não torna os frames mais pesados neste estado. Neste contentor o M01 renderiza **menos de 1 frame por segundo de parede** em SwiftShader, tanto na base como na candidata. É isso que torna frágeis os testes que medem tempo de parede (acima).

## Capturas

[`CAPTURES.md`](CAPTURES.md): 14 pares BASE/CANDIDATE e um probe dos invólucros/clipe no chão, com relatórios JSON por frame. Nos 27 frames comuns, relógio, jogador e arma são idênticos em base e candidata. Os contadores de render são iguais em repouso e ficam +3 a +12 calls (M01) / +5 a +16 (bancada) com efeitos activos.

## Revisão independente

[`REVIEW.md`](REVIEW.md): sem bloqueadores. Nove constatações e uma suspeita, todas resolvidas ou mitigadas em `a428925`, com testes novos.
