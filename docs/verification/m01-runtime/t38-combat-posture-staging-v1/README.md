# T38 · M01-COMBAT-POSTURE-STAGING-V1 — evidência

Estado: **entregue na branch, NÃO aceite** (falta revisão crítica independente, CI x86 completo e playtest humano).
Base: predecessor `ef35c7a` (fatia 1 de T38) → fatia 2 (jogo), retomada em 2026-10-17 na branch `claude/busy-ritchie-3fkvk2-t38` (cabeça do PR #82
`2bc623c` + candidata #80 `813f163` + correcção de teste #89 `b449007`), com as correcções da revisão crítica de `8bb0372` (REJECT; ver `HANDOFF.md`).
As capturas "antes" são de `ef35c7a` (worktree separado, mesmo spec); as "depois" são desta árvore. Chromium 1194 headless, SwiftShader,
1280×720 reduzido a 960×540 (PNG de 256 cores). Não é playtest humano e não mede FPS.

## O que mudou no jogo

| Grupo | Antes | Depois (dados em `missions/m01-tczew/mission.json`) |
| --- | --- | --- |
| Pelotão leste (24) | grelha 6×4 (x 1033–1043, z 38,2–41,8), de pé em jogo; só desenhado agachado (fatia 1) | `hold.slots`: 24 lugares desencontrados (x 1028–1043, z 38,2–41,8, mínimo 1,3 m, nenhum trio em fila cerrada nem quatro em linha); as reservas pl_east_18..23 na faixa sul (z ≥ 41,4), todas mais a sul do que qualquer um dos outros dezoito (z ≤ 40,8); **de joelhos em jogo** (`crouched`) durante a espera, de pé na retirada |
| Atiradores dos portões (`de_east_2..13`) | dente de serra x 1053/1055/1057, z 9,5–31,5, de pé, virados a leste, os de x 1053 a flutuar 0,4 m | `positions` [x, z, facing] desencontrados em profundidade (x 1053,2–1058,3, na faixa x ≥ 1053 de T23) na encosta entre as pontes, à frente do portal de 1912, virados a oeste, **de joelhos em jogo**; levantam-se 1,2 s antes de disparar e ficam de pé 2,5 s depois (a janela em que a apresentação os mostra a apontar); também se levantam para cada salva de atrito (T23), até 2,5 s depois da queda. Cada lugar mantém exactamente as linhas de visão do lugar antigo nas posições amostradas da rota e nos pontos da estação, do abrigo e do corredor |
| Secção no posto (`cv_squad_post`) | fila de pé x −76 a −92 | `grp_squad.stage.slots` atrás dos sacos, todos dentro do comprimento deles (z 20,5–23,5); desde o bombardeamento das 04:34, de joelhos no lugar; nenhuma das 40 posições alemãs vê um homem de joelhos ali. Kowal (rkm) levanta-se por cima dos sacos 0,5 s antes de cada rajada e fica de pé 0,8 s (a rajada); de pé vê os portões |
| Sapadores | três na mesma recta, dois a 0,6 m | `grp_sappers.stage.slots` espaçados junto ao cabo, de joelhos a trabalhar; no segundo corte: agachados a trabalhar, deitados (T07) quando suprimidos ou à espera parados junto ao corte; depois da retirada, em x −170, de joelhos (não há fogo ali). Os lugares do segundo corte, a supressão a 3 m e o ritmo do trabalho (150 s) não mudam |

Coerência: a hitbox (`spatial.js actorHitboxes`), os olhos (`eyePosition`, linha de visão), o ponto visado por quem dispara contra
o homem (`src/game/m01-aim.js aimPoint`, também usado pelos traçantes de exibição) e a origem dos tiros dele saem todos do mesmo
`crouched`/`posture` que o renderer desenha. O tiro de atrito sai sempre de um homem de pé.

**Cobertura — sem exagero.** A secção ajoelhada fica realmente coberta pelos sacos (verificado por linha de visão). Os sapadores e o
pelotão não têm cobertura sólida nova: baixam a silhueta (de joelhos/deitados) e espalham-se. Os atiradores dos portões **não têm
cobertura vinda de oeste**: o único colisor junto aos portões é o portal de 1912 (atrás deles) e a encosta desce para o rio; escondê-los
atrás do fim dos tabuleiros cortar-lhes-ia a linha de visão com que disparam sobre o jogador. Sem novos props de cobertura (fora do
âmbito "só posições") a melhoria possível é profundidade, alturas diferentes e postura.

**Saves antigos.** Ao carregar um save anterior a T38, quem estiver exactamente no seu lugar antigo (e não tiver sido mandado para
lado nenhum) passa para o lugar novo; quem já se moveu fica onde está.

## Efeitos no jogo (auditoria de 12 sementes × 2 rotas, `GOLDEN_AUDIT.json`)

Gerada por `tools/verification/m01-combat-posture-staging-audit.mjs` (predecessor `ef35c7a` contra esta árvore, as mesmas rotas de controlo reais, x86,
Node 22.22.0, 24 pares de simulações completas); a ferramenta falha se uma só das invariantes seguintes não se mantiver, e saiu com 0.

Iguais ao predecessor em todas as 24 rotas: conclusão, checkpoints, estados dos objectivos, ordem dos eventos, horas de batalha dos
eventos fixos (trem 963, ordem das 05:30, retirada das 06:00, alemães no tabuleiro 06:05, Bąk 06:04, demolições, chamada),
18 homens às 06:00, sobreviventes finais (12 sem apoio, 18 com apoio), `dlg_m01_049`. Absolutos: reparo antes das 05:30; cada
queda por atrito 0,8–3,9 s de batalha depois da sua hora fixa (o limite é 0–5 s).

**Mudam** (o RNG principal diverge depois da primeira linha de visão/acerto diferente): a hora de conclusão do reparo
(−223 s a +154 s de batalha), quantos tiros atingem o jogador e a sua saúde final, e por isso a hora real de `dlg_m01_040`
(que segue o reparo; −17,4 s a +10,5 s). `dlg_m01_027` (uma das MG34 dispara sobre o jogador ou a secção mais de 8 s depois da primeira vez, com o jogador a oeste; não é um evento fixo)
muda em 3 das 24 rotas: as sementes 6 e 9 com apoio passam a tê-lo, a 10 com apoio deixa de o ter (nas outras 21 aparece e desaparece como antes).

Sem desvio sistemático de dificuldade nas 24 rotas: tiros que atingem o jogador 16 → 18 no total (sem apoio 11 → 15, com apoio 5 → 3), eventos `enemy-fire`
38293 → 38366, `round-impact` 14043 → 14079, hora real média da conclusão do reparo 409,4 s → 407,6 s. O desvio é o do RNG, não uma regra nova.

| Semente | Apoio | Reparo antes | Reparo depois | Δ (s de batalha) | Tiros que atingem o jogador antes → depois | Saúde final antes → depois | dlg_m01_027 antes/depois | dlg_m01_040: Δ relógio real (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 19390901 | não | 05:13:46 | 05:13:24 | -22 | 2 → 1 | 84 → 92 | sim/sim | -2.50 |
| 1 | não | 05:10:03 | 05:10:03 | +0 | 3 → 0 | 76 → 100 | sim/sim | -0.85 |
| 2 | não | 05:13:00 | 05:13:00 | +0 | 2 → 3 | 84 → 76 | sim/sim | -0.90 |
| 3 | não | 05:10:14 | 05:09:03 | -71 | 0 → 0 | 100 → 100 | sim/sim | -6.15 |
| 4 | não | 05:13:32 | 05:13:38 | +6 | 0 → 0 | 100 → 100 | sim/sim | -0.45 |
| 5 | não | 05:08:42 | 05:10:29 | +107 | 3 → 5 | 76 → 60 | sim/sim | +7.05 |
| 6 | não | 05:12:33 | 05:10:23 | -130 | 1 → 2 | 92 → 84 | sim/sim | -10.50 |
| 7 | não | 05:10:39 | 05:10:38 | -1 | 0 → 1 | 100 → 92 | sim/sim | -1.00 |
| 8 | não | 05:12:27 | 05:09:21 | -186 | 0 → 1 | 100 → 92 | sim/sim | -14.65 |
| 9 | não | 05:13:27 | 05:12:23 | -64 | 0 → 1 | 100 → 92 | sim/sim | -5.65 |
| 10 | não | 05:09:50 | 05:09:49 | -1 | 0 → 1 | 100 → 92 | sim/sim | -0.95 |
| 11 | não | 05:09:00 | 05:09:25 | +25 | 0 → 0 | 100 → 100 | sim/sim | +0.90 |
| 19390901 | sim | 05:03:32 | 05:03:42 | +10 | 2 → 1 | 84 → 92 | não/não | -0.15 |
| 1 | sim | 05:05:10 | 05:03:21 | -109 | 0 → 0 | 100 → 100 | não/não | -8.95 |
| 2 | sim | 05:02:46 | 05:05:20 | +154 | 1 → 0 | 92 → 100 | não/não | +10.50 |
| 3 | sim | 05:07:01 | 05:03:18 | -223 | 0 → 0 | 100 → 100 | sim/sim | -17.40 |
| 4 | sim | 05:05:08 | 05:06:41 | +93 | 0 → 1 | 100 → 92 | não/não | +6.00 |
| 5 | sim | 05:03:53 | 05:04:40 | +47 | 0 → 0 | 100 → 100 | não/não | +2.65 |
| 6 | sim | 05:04:16 | 05:02:38 | -98 | 0 → 0 | 100 → 100 | não/sim | -8.10 |
| 7 | sim | 05:03:59 | 05:06:19 | +140 | 1 → 0 | 92 → 100 | sim/sim | +9.45 |
| 8 | sim | 05:06:52 | 05:03:50 | -182 | 1 → 0 | 92 → 100 | sim/sim | -14.40 |
| 9 | sim | 05:03:18 | 05:03:57 | +39 | 0 → 0 | 100 → 100 | não/sim | +2.05 |
| 10 | sim | 05:02:26 | 05:03:22 | +56 | 0 → 1 | 100 → 92 | sim/não | +3.25 |
| 11 | sim | 05:05:10 | 05:05:33 | +23 | 0 → 0 | 100 → 100 | não/não | +0.80 |

## Golden por tick (`tests/fixtures/m01-t38-gameplay-baseline.json`) — emenda 01

O golden anterior (`d3ac3b2`) estava desactualizado: `4772b24` moveu os 12 lugares dos atiradores dos portões em `mission.json` e não o regenerou. Regenerado
em x86 **só com a ferramenta do repositório** (`m01-combat-posture-staging-audit.mjs --write-golden --candidate 25ed12f`), depois da auditoria de invariantes
acima, e depois verificado byte a byte noutra execução da mesma ferramenta (sem `--write-golden`). Nada foi editado à mão. O registo completo, gerado a partir
dos dois ficheiros e do git, está em `GOLDEN_AMENDMENT_01.json`; o golden substituído fica byte a byte em
`tests/fixtures/m01-t38-gameplay-baseline-before-amendment-01.json` (fixado por `sha256` em `tests/m01-animation-contract.test.js`).

O que muda, exactamente:
- Das entradas do golden só mudam `gameplayInputsSha256` (`59d8aca3…` → `741888a1…`, porque só `mission.json` mudou das 10 entradas), `candidate` (acrescentado: `25ed12f`) e os
  `routes`. `sourceSha256` (`344a932f…`), o predecessor, os hashes dos golden parciais/históricos, as duas rotas (semente 19390901 sem apoio; semente 7 com apoio)
  e o esquema (sha256 por 512 ticks do frame de jogo completo) **não mudam**.
- `routes`: todos os blocos das duas rotas mudam (0 idênticos). A primeira diferença está no tick 1: apenas `x`, `y`, `z` de `de_east_2..de_east_13`
  (62 folhas: 31 no estado e 31 no checkpoint aninhado); a `facing` não mudou. A seguir, as balas saem de sítios novos: a primeira diferença nas balas emitidas/em voo
  é às 04:45:20 (semente 19390901) e 04:45:43 (semente 7) de relógio de batalha; o RNG principal só diverge às 05:14:06 e 04:45:49.
- Comprimento: 22257 → 22198 ticks (semente 19390901, 44 → 44 blocos) e 21467 → 21585 ticks (semente 7, 42 → 43 blocos).

## Verificação local (x86, Node 22.22.0, Chromium 1194 em SwiftShader, 2026-10-17)

Máquina partilhada e muito carregada (carga 9–25 em 4 CPUs, outros agentes a correr `npm test` e browser em simultâneo); por isso o Playwright correu com `CI=1`
(os mesmos orçamentos de tempo do CI do repositório; nenhuma asserção foi tocada) e sempre sob `flock` (porta 4173 fixa). Nada disto é playtest humano nem mede FPS.

| Comando | Resultado |
| --- | --- |
| `node --test tests/m01-combat-posture-staging.test.js tests/m01-east-front.test.js tests/m01-cover-threat.test.js tests/m01-animation-contract.test.js` (`25ed12f`, antes de regenerar o golden) | 84 testes: 77 passam, 7 falham, todos do golden (2 testes por tick + 5 do mesmo ficheiro que dependem do primeiro). Staging (12 sementes + rota com apoio), east-front e cover-threat: todos verdes |
| `m01-combat-posture-staging-audit.mjs --write-golden --candidate 25ed12f` (predecessor `ef35c7a`) | exit 0: 24 pares de rotas completas (12 sementes × {sem apoio, com apoio}) cumprem todas as invariantes; golden e `GOLDEN_AUDIT.json` escritos |
| a mesma ferramenta, sem `--write-golden` (1 semente; relatório para fora do repositório) | exit 0: os dois percursos do golden reproduzidos byte a byte |
| `node --test tests/m01-animation-contract.test.js` | 21/21 (inclui os 2 testes por tick e os `sha256` do golden antigo e da emenda) |
| `node --test` em todos os outros `tests/*.test.js` (um processo) | 946/946 |
| `npm test` (`HEAD` = emenda do golden) | **967/967**, exit 0 (26 min; `8606998`, o commit da emenda do golden). Os 946 dos outros ficheiros e os 21 do contrato somam o mesmo 967 |
| `npm run build` | OK (vite, 4,6 s) |
| `flock … env CI=1 … npx playwright test tests/browser/m01.spec.js tests/browser/m01-mg34-prone.spec.js --reporter=line` | 32 testes em 47,2 min: **30 passam, 2 falham**: `m01.spec.js:50` e `m01.spec.js:426` (abaixo). Passam, entre outros, `m01.spec.js:196` (Kowal/rkm: rajada e carregador) e as 4 de `m01-mg34-prone.spec.js` (incluindo `:45`), os dois que a revisão crítica apontou |
| `m01-anim-resolver.spec.js` e `m01-distant-front-impostors.spec.js` (mesma forma, `CI=1`, `flock`) | **ainda por correr** quando este texto foi escrito (na fila do `flock`, com trabalhos de outros agentes à frente) |
| a spec de capturas (`playwright.t38.config.js`) e a comparação do teste `:426` na base `813f163` contra esta árvore, mais uma repetição isolada de `:50` | **ainda por correr** (mesma fila) |
| em Node, sem browser: linha temporal do reparo suprimido/livre e poses desenhadas, candidata #80 contra esta árvore (mesmo estado, 04:45:40, 90 s) | suprimido/livre iguais nos primeiros 57 s; as mesmas poses «pinned» (Marek); só mudam as posturas de joelhos (abaixo) |

**As duas falhas de browser, honestamente.** Nenhuma asserção foi tocada.
- `m01.spec.js:50` (carregador do karabinek): `#mag` esperado «2», recebido «3» ao fim do `expect` de 5 s; o instantâneo da página à falha já mostra «2/40», ou seja, o segundo
  tiro entrou depois dos 5 s (frame lento com a máquina carregada). Não toca em nada de T38. A repetição isolada está na fila do `flock`.
- `m01.spec.js:426` («German fire on the repair»): a asserção da linha 439 (ver o reparo suprimido **e** livre nas 60 amostras de 250 ms) não se cumpriu; o relógio de batalha da página só
  avançou 39 s. Em Node, a partir do mesmo estado (04:45:40) a linha temporal do reparo suprimido/livre da candidata #80 e a desta branch são **idênticas** nos primeiros 57 s
  (suprimido 0–5,85 s, livre 5,85–13,6 s, suprimido 13,6–23,45 s, …) e quem é desenhado «pinned» enquanto está suprimido (Marek) é o mesmo (430 contra 429 ticks);
  só mudam as posturas ajoelhadas (29 894 contra 404 tiques-de-actor de «crouched» durante a supressão). A comparação no browser contra a base `813f163` (o que mostraria se falha igual sem T38 nesta máquina) está na fila do `flock`; até correr, **não** se afirma que seja anterior a T38, apenas que o desvio de simulação está excluído.

## Reproduzir

```sh
npm ci && npm run build
# golden: predecessor num worktree separado, depois a ferramenta do repositório (verifica; com --write-golden --candidate <sha> regenera)
git worktree add --detach /tmp/t38-pred ef35c7ab24d75d87ca6435891f1977fd14d7a52c && ln -s "$PWD/node_modules" /tmp/t38-pred/node_modules
M01_T38_BASELINE=/tmp/t38-pred node tools/verification/m01-combat-posture-staging-audit.mjs
# capturas "depois" (as "antes" vêm do mesmo spec num worktree de ef35c7a, depois de `npm run build` nele)
T38_OUT=test-results/m01-t38-staging CHROME_EXECUTABLE=/opt/pw-browsers/chromium npx playwright test -c tools/verification/playwright.t38.config.js
# emenda do golden: onde as duas simulações divergem
git worktree add --detach /tmp/t38-old d3ac3b2 && ln -s "$PWD/node_modules" /tmp/t38-old/node_modules
node tools/verification/m01-t38-golden-divergence.mjs /tmp/t38-old "$PWD" /tmp/divergence.json
```

## Capturas

As capturas `before/` (de `ef35c7a`) e `after/` desta pasta são as da fatia 2 anterior à correcção dos portões e da secção; **a regeneração das `after/` com o código actual está na fila do `flock` e ainda não foi feita**. Não as uses como evidência desta versão.

## Limitações

- Evidência local de uma máquina partilhada e sobrecarregada; sem CI x86 completo, sem revisão crítica independente da versão final e sem playtest humano. T38 continua `DELIVERED_BRANCH`.
- Cobertura real vinda de oeste para os atiradores dos portões: decisão de design por tomar (precisa de novos props de cobertura).
- `m01-postprocess-grading` (9 testes) precisa de `M01_GRADING_BEFORE_DIR` (ver `DEVELOPMENT_STATUS.md`, grupo A) e não foi corrido.
