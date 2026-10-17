# T38 · M01-COMBAT-POSTURE-STAGING-V1 — evidência

Base: predecessor `ef35c7a` (fatia 1 de T38) → fatia 2 sobre o WIP `8bb0372` da branch `claude/quirky-heisenberg-iytxsy`, com as correcções
da revisão crítica. As capturas "antes" são de `ef35c7a` (worktree separado, mesmo spec); as "depois" são desta árvore. Chromium 1194
headless, SwiftShader, 1280×720 reduzido a 960×540 (PNG de 256 cores). Não é playtest humano e não mede FPS.

## O que mudou no jogo

| Grupo | Antes | Depois (dados em `missions/m01-tczew/mission.json`) |
| --- | --- | --- |
| Pelotão leste (24) | grelha 6×4 (x 1033–1043, z 38,2–41,8), de pé em jogo; só desenhado agachado (fatia 1) | `hold.slots`: 24 lugares desencontrados (x 1028–1043, z 38,2–41,8, mínimo 1,3 m, nenhum trio em fila cerrada nem quatro em linha); as reservas pl_east_18..23 na faixa sul (z ≥ 41,4), todas mais a sul do que qualquer um dos outros dezoito (z ≤ 40,8); **de joelhos em jogo** (`crouched`) durante a espera, de pé na retirada |
| Atiradores dos portões (`de_east_2..13`) | dente de serra x 1053/1055/1057, z 9,5–31,5, de pé, virados a leste, os de x 1053 a flutuar 0,4 m | `positions` [x, z, facing] desencontrados em profundidade (x 1050,5–1058,3) na encosta entre as pontes, à frente do portal de 1912, virados a oeste, **de joelhos em jogo**; levantam-se 1,2 s antes de disparar e ficam de pé 2,5 s depois (a janela em que a apresentação os mostra a apontar); também se levantam para cada salva de atrito (T23), até 2,5 s depois da queda. Cada lugar mantém exactamente as linhas de visão do lugar antigo nas posições amostradas da rota e nos pontos da estação, do abrigo e do corredor |
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

Iguais ao predecessor em todas as 24 rotas: conclusão, checkpoints, estados dos objectivos, ordem dos eventos, horas de batalha dos
eventos fixos (trem 963, ordem das 05:30, retirada das 06:00, alemães no tabuleiro 06:05, Bąk 06:04, demolições, chamada),
18 homens às 06:00, sobreviventes finais (12 sem apoio, 18 com apoio), `dlg_m01_049`. Absolutos: reparo antes das 05:30; cada
queda por atrito 0–5 s de batalha depois da sua hora fixa.

**Mudam** (o RNG principal diverge depois da primeira linha de visão/acerto diferente): a hora de conclusão do reparo
(−185 s a +142 s de batalha), quantos tiros atingem o jogador e a sua saúde final, e por isso a hora real de `dlg_m01_040`
(que segue o reparo). `dlg_m01_027` aparece e desaparece nas mesmas rotas que antes.

| Semente | Apoio | Reparo antes | Reparo depois | Δ (s de batalha) | Tiros que atingem o jogador antes → depois | Saúde final antes → depois | dlg_m01_027 antes/depois | dlg_m01_040: Δ relógio real (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 19390901 | não | 05:13:46 | 05:14:04 | +18 | 2 → 0 | 84 → 100 | sim/sim | +0.45 |
| 1 | não | 05:10:03 | 05:10:03 | +0 | 3 → 1 | 76 → 92 | sim/sim | -0.90 |
| 2 | não | 05:13:00 | 05:12:28 | -32 | 2 → 2 | 84 → 84 | sim/sim | -3.30 |
| 3 | não | 05:10:14 | 05:09:18 | -56 | 0 → 1 | 100 → 92 | sim/sim | -5.05 |
| 4 | não | 05:13:32 | 05:13:35 | +3 | 0 → 1 | 100 → 92 | sim/sim | -0.60 |
| 5 | não | 05:08:42 | 05:11:04 | +142 | 3 → 2 | 76 → 84 | sim/sim | +9.60 |
| 6 | não | 05:12:33 | 05:12:19 | -14 | 1 → 0 | 92 → 100 | sim/sim | -1.95 |
| 7 | não | 05:10:39 | 05:10:38 | -1 | 0 → 0 | 100 → 100 | sim/sim | -0.95 |
| 8 | não | 05:12:27 | 05:09:22 | -185 | 0 → 2 | 100 → 84 | sim/sim | -14.60 |
| 9 | não | 05:13:27 | 05:12:24 | -63 | 0 → 1 | 100 → 92 | sim/sim | -5.55 |
| 10 | não | 05:09:50 | 05:09:50 | +0 | 0 → 1 | 100 → 92 | sim/sim | -0.85 |
| 11 | não | 05:09:00 | 05:09:24 | +24 | 0 → 4 | 100 → 68 | sim/sim | +0.85 |
| 19390901 | sim | 05:03:32 | 05:03:36 | +4 | 2 → 1 | 84 → 92 | não/não | -0.60 |
| 1 | sim | 05:05:10 | 05:04:45 | -25 | 0 → 0 | 100 → 100 | não/não | -2.70 |
| 2 | sim | 05:02:46 | 05:01:43 | -63 | 1 → 1 | 92 → 92 | não/não | -5.55 |
| 3 | sim | 05:07:01 | 05:06:27 | -34 | 0 → 1 | 100 → 92 | sim/sim | -3.50 |
| 4 | sim | 05:05:08 | 05:04:24 | -44 | 0 → 0 | 100 → 100 | não/não | -4.15 |
| 5 | sim | 05:03:53 | 05:04:30 | +37 | 0 → 0 | 100 → 100 | não/não | +1.90 |
| 6 | sim | 05:04:16 | 05:05:48 | +92 | 0 → 0 | 100 → 100 | não/não | +5.90 |
| 7 | sim | 05:03:59 | 05:04:59 | +60 | 1 → 0 | 92 → 100 | sim/sim | +3.55 |
| 8 | sim | 05:06:52 | 05:05:50 | -62 | 1 → 2 | 92 → 84 | sim/sim | -5.50 |
| 9 | sim | 05:03:18 | 05:03:42 | +24 | 0 → 1 | 100 → 92 | não/não | +0.90 |
| 10 | sim | 05:02:26 | 05:03:18 | +52 | 0 → 0 | 100 → 100 | sim/sim | +2.90 |
| 11 | sim | 05:05:10 | 05:03:49 | -81 | 0 → 0 | 100 → 100 | não/não | -6.90 |

## Reproduzir

```sh
npm ci && npm run build
T38_OUT=test-results/m01-t38-staging CHROME_EXECUTABLE=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
  npx playwright test -c tools/verification/playwright.t38.config.js
# "antes": o mesmo spec e config copiados para um worktree de ef35c7a, depois de `npm run build` nesse worktree.
git worktree add --detach /tmp/t38-pred ef35c7ab24d75d87ca6435891f1977fd14d7a52c && ln -s "$PWD/node_modules" /tmp/t38-pred/node_modules
M01_T38_BASELINE=/tmp/t38-pred node tools/verification/m01-combat-posture-staging-audit.mjs   # verifica o golden e escreve GOLDEN_AUDIT.json
```

## Capturas

SCREENSHOTS
