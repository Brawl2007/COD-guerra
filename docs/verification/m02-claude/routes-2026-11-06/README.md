# Vídeo contínuo das duas rotas (N0, PDF N5): bancada M02, 2026-11-06

Evidência para o portão N0 (secção N, pp. 47–49, prova N5). **Não é aprovação do N0**: a leitura humana dos vídeos, a oclusão, os interiores e a decisão do Capitão/proprietário continuam pendentes.

## Comando e versão

```bash
CHROME_EXECUTABLE=/opt/pw-browsers/chromium PORT=4392 \
  npx playwright test -c tools/m02/playwright-m02-01.config.js tests/browser/m02-n0-route-videos.spec.js
```

- Spec: `tests/browser/m02-n0-route-videos.spec.js`, commit `6cead229` (base `f0815f61`).
- Resultado: 2 passed (3,3 min de parede). Cada teste afirma: rota concluída com os 5 waypoints, todos os 6 pontos da rota em `routeProgress` visitados, zero erros de consola, ponteiro bloqueado, vídeo não vazio.
- Browser: Chromium 153.0.8010.12, renderer **SwiftShader** (ANGLE Vulkan por software, WebGL). Perfil de qualidade `low` (ver limitações), luz `afternoon_1939_09_09`, janela e vídeo a 960 × 540.
- HUD de depuração escondido (`.hud-layer`). Ficam o retículo, as cartelas, as legendas de som, os indicadores direcionais e os diálogos, que fazem parte do jogo.

## Como o Piotr é conduzido

Só com entradas de jogo na página da bancada, sem teleporte, sem `sim.tick()` e sem salto de cena:

- teclado: `KeyW` e `ShiftLeft` (eventos `keydown`/`keyup` no `window`), `Space` para disparar, `KeyR` para recarregar, `KeyE` se uma porta fechada bloquear;
- rato: `mousemove` com `movementX/Y` sobre o canvas com o ponteiro bloqueado (o mesmo handler do rato do jogador). O bloqueio é pedido com um gesto de utilizador via CDP, para não disparar o tiro do clique.

As decisões (rota do navegador até cada waypoint, hostil visível que se consegue atingir, ponto de mira) reaproveitam o `MissionBot` de `tests/m02-mission-bot.js`, importado na página pelo servidor Vite de desenvolvimento. Os waypoints são os de `missions/m02-bzura/m02-01-quinta-layout.json` (`routes.ditch`, `routes.orchard`), a partir do SN1 (0, −80). O Piotr corre os waypoints e, quando vê um hostil que consegue acertar a ≤ 90 m, pára, mira e dispara (no máximo 25 s de simulação por rota). Uma primeira tentativa sem combate, só a correr, matou o Piotr na rota do pomar (`mission-failed`, `piotr_killed`, aos 27,9 s simulados); não faz parte desta evidência, mas mostra que a rota do pomar a correr sem responder ao fogo é letal na bancada.

## Resultados reais (de `route-*.json`)

| | Vala (A) | Pomar (B) |
|---|---|---|
| Vídeo | `route-vala.webm` | `route-pomar.webm` |
| Duração do vídeo (ffprobe) | 58,1 s | 90,2 s |
| Tempo de simulação percorrido | 38,4 s | 50,1 s |
| Tempo de parede da corrida | 61 s | 92 s |
| Tamanho | 2 217 900 B | 3 234 401 B |
| sha256 | `458ce87d5cf399bfa039dcb5e42351803d3c9f4882ef9c6759f8a5e202d37ec0` | `ea3cd5d6eb9d439a6cee5c0514cca5f83a1f0a214124abba6e8cbffa13b345b2` |
| Início / fim | SN1 (0, −80), C03 / (−0,6, −23,3), cena C04 | SN1 (0, −80), C03 / (0,0, −22,9), cena C04 |
| Vida de Piotr no fim | 83 | 81 |
| Tiros disparados por Piotr | 6 (1 recarga) | 5 (1 recarga) |
| Hostis ativos no fim | 0 | 0 |
| Waypoints concluídos | 5/5 | 5/5 |

Cada vídeo começa no SN1 em C03 e acaba junto ao portão norte da quinta (0, −24). No percurso os hostis da guarnição EA1 caem pelos tiros de Piotr e pela secção, e a cena passa a C04 (objetivo `C04`) antes do último waypoint; por isso o fim já é C04, não C03. A simulação não foi alterada para isso.

Frames (capturas de ecrã tiradas durante a gravação, à mesma resolução): `route-vala-{start,mid,end}.png` e `route-pomar-{start,mid,end}.png`. O «meio» é a captura no primeiro tick de amostragem depois de passado metade dos waypoints.

`route-vala.json` e `route-pomar.json` têm o manifesto completo: comando, waypoints, vídeo e vídeo bruto (sha256, bytes, duração), estado final, entradas usadas e o traço por segundo de parede (relógio da simulação, posição, vida, cena, objetivo, exposição à MG34, hostis ativos).

## Limitações

- **Sem FPS.** O SwiftShader é renderização por software; os tempos não representam uma GPU. A bancada avança um passo de simulação por frame com teto de 0,05 s, por isso o vídeo corre mais devagar do que o tempo real do jogo (58 s de vídeo para 38 s simulados na vala; 90 s para 50 s no pomar). Não se declara taxa de frames.
- Perfil `low`: escolhido para manter a bancada utilizável no SwiftShader (em `medium`/`high` a simulação anda cerca de 0,1× do tempo real nesta máquina). As capturas do N0 com os três perfis estão em `docs/verification/m02-claude/n0-2026-11-05/`.
- O vídeo guardado foi cortado (cabeçalho de carregamento da página removido) e recodificado com `ffmpeg` (VP8, 350 kb/s alvo) para caber no repositório; o vídeo bruto do Playwright (6,9 MB e 10,7 MB, sha256 nos `.json`) não é versionado e regenera-se com o comando acima.
- O condutor é um bot determinista com ajuda de navegação e de mira; não é um jogador humano nem um playtest (O4). Não prova leitura da rota nem que a escolha entre vala e pomar seja evidente.
- Em Node/Vite de desenvolvimento: o spec importa `tests/m02-mission-bot.js` do servidor Vite, por isso só corre com `tools/m02/run-m02-01.mjs` (a configuração `tools/m02/playwright-m02-01.config.js` já o faz).
- O desfecho (vida final, instante em que as cenas mudam) varia com o tempo de parede, porque o passo de simulação depende da duração de cada frame; uma repetição não dá um vídeo idêntico.
