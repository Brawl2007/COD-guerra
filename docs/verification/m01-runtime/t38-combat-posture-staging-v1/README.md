# T38 · M01-COMBAT-POSTURE-STAGING-V1 — evidência

Base: `claude/quirky-heisenberg-iytxsy @ ef35c7a` (fatia 1 de T38) mais a fatia 2 **ainda não commitada** na árvore de trabalho
(posições de espera em dados, postura de jogo coerente com hitbox/olhos/mira/origem do tiro). As capturas "antes" são de `ef35c7a`
(worktree separado, mesmo spec); as "depois" são da árvore de trabalho. Chromium 1194 headless, SwiftShader, 1280×720 reduzido a
960×540 (PNG de 256 cores). Não é playtest humano e não mede FPS.

## O que mudou no jogo

| Grupo | Antes | Depois (dados em `missions/m01-tczew/mission.json`) |
| --- | --- | --- |
| Pelotão leste (24) | grelha 6×4 (x 1033–1043, z 38,2–41,8), de pé em jogo; só desenhado agachado (fatia 1) | `hold.slots`: 24 lugares desencontrados (x 1028–1043, z 38,2–41,8, mínimo 1,3 m, sem trio em fila nem quatro em linha), reservas na faixa norte; **agachado em jogo** (`crouched`) durante a espera, de pé na retirada |
| Atiradores dos portões (`de_east_2..13`) | dente de serra x 1053/1055/1057, z 9,5–31,5, de pé, virados a leste, os de x 1053 a flutuar 0,4 m | `positions` [x, z, facing] junto à face oeste do portal de 1912 (x 1055,5–1058,3, no chão), virados a oeste, **de joelhos em jogo**; levantam-se 1,2 s antes de disparar e ficam de pé 2,5 s depois (a janela em que a apresentação os mostra a apontar) |
| Secção no posto (`cv_squad_post`) | fila de pé x −76 a −92 | `grp_squad.stage.slots` atrás dos sacos; desde o bombardeamento das 04:34, agachados no lugar; Kowal deitado atrás da rkm no bipé na ponta norte dos sacos (`posture` 'prone') |
| Sapadores | três na mesma recta, dois a 0,6 m | `grp_sappers.stage.slots` espaçados junto ao cabo, de joelhos a trabalhar; no segundo corte: agachados a trabalhar, deitados (T07) quando suprimidos ou à espera parados. Lugares do segundo corte, supressão a 3 m e tempo de reparo inalterados |

Coerência: a hitbox (`spatial.js actorHitboxes`), os olhos (`eyePosition`, linha de visão), o ponto visado por quem dispara contra
o homem (`src/game/m01-aim.js aimPoint`, também usado pelos traçantes de exibição) e a origem dos tiros dele saem todos do mesmo
`crouched`/`posture` que o renderer desenha.

## Capturas

| Ficheiro | Relógio | O que mostra | Observação honesta |
| --- | --- | --- | --- |
| `before/01-start-section-close.png` · `after/…` | 04:30:44 | Vista 01 do roadmap (câmara −74, 30; alvo = centróide da secção) | Antes: quatro de pé espalhados em linha à esquerda. Depois: a secção junto aos sacos em lugares desencontrados, de pé (ainda não há fogo) e Kowal sentado a limpar a rkm (clip já existente); sem fila |
| `before/01b-section-under-fire.png` · `after/…` | 04:48 | Posto da secção sob o fogo da MG dos portões (câmara −62, 32) | Antes: quatro de pé em fila. Depois: três de joelhos e Kowal deitado com a rkm junto à caixa de sacos; Lipski (civil, de preto) continua de pé |
| `before/11-repair-threat-sappers-pinned.png` · `after/…` | 04:50 / 04:47 | Vista 11 do roadmap (câmara −140, 20) | Antes: grupo de pé junto ao portal ao fundo. Depois: sem grupo de pé visível. Os sapadores ficam atrás da encosta nesta câmara nas duas versões (a hora difere porque o RNG diverge depois de T38) |
| `before/11b-sappers-close.png` · `after/…` | 04:50 / 04:47 | Sapadores no segundo corte (câmara −128, 16) | Depois: dois sapadores deitados na encosta, visíveis; o terceiro fora do enquadramento |
| `before/21-east-platoon-hold.png` · `after/…` | 05:08 | Pelotão leste no fim do tabuleiro, visto do tabuleiro | Antes: bloco compacto (grelha, desenhada agachada pela fatia 1). Depois: homens de joelhos espalhados ao longo das duas treliças e ao centro; não se lê fila nem grelha |
| `before/22-gate-riflemen.png` · `after/…` | 05:08 | Atiradores dos portões contra o portal de 1912 (câmara 1041, 20) | Antes: fila de pé. Depois: todos de joelhos; **vistos de frente ainda se lêem como uma linha solta ao longo do muro** (o desencontro em profundidade, até 2,8 m, quase não se vê de frente) |

A mensagem "Você se afastou da sua secção" aparece nas vistas 21/22 porque o jogador é reposicionado na margem leste só para a captura.

## Determinismo, invariantes e golden

- `tools/verification/m01-combat-posture-staging-audit.mjs` (só x86, D11/D30) correu o predecessor exacto `ef35c7a` e a candidata
  na rota real, 12 sementes × {sem apoio, com apoio}: conclusão, checkpoints, estados dos objectivos, ordem dos eventos, horas de
  batalha dos eventos fixos, 18 homens às 06:00, sobreviventes finais (12 / 18), `dlg_m01_049` iguais; reparo antes das 05:30; cada
  queda por atrito 0–5 s depois da sua hora fixa. Relatório: `GOLDEN_AUDIT.json` (gerado neste x86_64, Node v22.22.0).
- O RNG principal diverge do predecessor (as posições e as posturas mudam linhas de visão e acertos): é uma mudança de jogo por
  desenho, por isso o golden por tick passou para `tests/fixtures/m01-t38-gameplay-baseline.json`; o golden das parciais fica fixado
  como história em `tests/m01-animation-contract.test.js`.

## Reproduzir

```sh
npm ci && npm run build
T38_OUT=test-results/m01-t38-staging CHROME_EXECUTABLE=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
  npx playwright test -c tools/verification/playwright.t38.config.js
# "antes": o mesmo spec e config copiados para um worktree de ef35c7a, depois de `npm run build` nesse worktree.
git worktree add --detach /tmp/t38-pred ef35c7ab24d75d87ca6435891f1977fd14d7a52c && ln -s "$PWD/node_modules" /tmp/t38-pred/node_modules
M01_T38_BASELINE=/tmp/t38-pred node tools/verification/m01-combat-posture-staging-audit.mjs   # verifica o golden e escreve GOLDEN_AUDIT.json
```
