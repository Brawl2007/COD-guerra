# Mãos e braços em primeira pessoa da kb wz.29 (R6-a) — 2026-10-23

Queixa do proprietário no playtest: «as mãos e os dedos não seguram as armas de forma convincente; defeitos visuais ao apontar (ADS) e ao recarregar; a animação de braço/arma parece uma rotação rígida».

Branch `claude/exciting-bohr-k8v5xm-r6a`, de `e7f5f28` (candidata #80). **Não publicada. Sem playtest humano e sem inspeção visual humana** (as imagens abaixo foram vistas só por quem escreveu este pacote). Pacote **só de renderização**: `git diff e7f5f28 -- src/game` está vazio, nenhum golden foi tocado, a simulação nunca é escrita.

## Como foi medido

- **Capturas no renderizador real** (Chromium headless/SwiftShader, 1280×720, `M01View` + `M01Simulation` a 0,05 s, qualidade média, os GLB reais): `tools/verification/m01-fp-hands-evidence.mjs <dir>` com `tools/verification/m01-fp-hands-fixture.html`. Antes: `before/`, depois: `after/`. Cada fase tem três PNG: a câmara do jogo (`NN-nome.png`) e a passagem da arma vista de uma câmara livre ao lado (`-right`) e de cima (`-top`). Fases: anca parado, ADS a meio da transição e assente, ciclo do ferrolho em ADS a 0,20/0,45/0,70 s e à anca a 0,40 s, recarga de clipe a 0,45/1,05/1,75/2,50/2,80/3,25 s, corrida, ADS a andar. Não são FPS nem playtest.
- **Vistas de perto** (só a passagem da arma, 960×540, câmara do jogador e câmaras livres): `tools/verification/m01-fp-hands-lab.mjs` + `m01-fp-hands-lab.html` (usadas para afinar; os PNG do `before/`/`after/` são os do renderizador real).
- **Medição determinística** (Node, sem navegador): `tests/helpers/m01-fp-hand-metrics.js` mede, no esqueleto, nas malhas esfoladas e nos clips reais, a distância da ponta do indicador ao gatilho, penetração e folga da palma na madeira (sólidos analíticos da coronha, guarda-mão, caixa e cano de `tools/assets/m01-soldiers/src/weapon.mjs`), o botão do ferrolho (centroide dos vértices do botão), o clipe, o ângulo do pulso (antebraço ↔ mão) contra o autorado, o ângulo do cotovelo, os extremos cortados das mangas dentro do quadro, a fracção do ecrã que a coronha ocupa e os vértices de mão/manga na janela de pontaria. `node tools/verification/m01-fp-hands-metrics.mjs [--src <árvore>] --out <json>` percorre 3 poses de repouso, 38 fases do ciclo do ferrolho, 21 da recarga de clipe e 11 da de cartucho. `before/metrics.json` e `after/metrics.json` são as saídas.
- **Teste**: `tests/m01-fp-hand-grip.test.js` (10 testes, ~2,5 s). Com `M01_FP_SRC=<árvore de e7f5f28> node --test tests/m01-fp-hand-grip.test.js` corre o mesmo teste sobre o código antigo (árvore extraída do commit `e7f5f28`: `src` e `research`): **9 de 10 falham** (só o de marcadores passa, é uma guarda); na árvore nova **10/10 passam**.

## Defeitos encontrados (números do código antigo) e causa-raiz

| Medida | Antes | Depois |
|---|---|---|
| Ponta do indicador ↔ gatilho, em repouso (cm) | 6,2 | 1,3 |
| Mão direita dentro da madeira, em repouso (cm) | 1,5 | 0,8 |
| Mão esquerda dentro da madeira, em repouso (cm) | 1,8 | 0,5 |
| Pontas dos dedos esquerdos acima do eixo do fuste (cm) | 4,7 | 2,8 |
| Palma direita ↔ coronha, em repouso (cm) | 0,7 | 0,6 |
| Mão ↔ botão do ferrolho, ciclo do ferrolho 0,20–0,90 (cm, pior) | 2,1 | 2,1 |
| Clipe ↔ mão direita, recarga 0,20–0,55 (cm, pior) | 0,3 | 0,3 |
| Ângulo do pulso face ao autorado, pior caso (graus) | 132,8 | 30,6 |
| Cotovelo direito anca / ADS / corrida (graus) | 130,3 / 130,3 / 130,3 | 74,4 / 120,5 / 77,2 |
| Extremos cortados da manga dentro do quadro (vértices) | 0 | 0 |
| Coronha no ecrã durante a recarga (% do quadro, pior) | 8,8 | 1,4 |
| Coronha no ecrã à anca (% do quadro, pior) | 1,6 | 1,6 |
| Mãos/mangas na janela de pontaria, ndc ≤ 0,05 (vértices, pior, ADS e ferrolho em ADS) | 105 | 6 |
| Vértice de braço visível mais próximo da lente (cm) | 25,1 | 18,1 |
| Salto do pulso direito no fotograma do tiro que corta uma recarga de cartucho (cm) | 38,6 | ≤ 4 (teste) |
| Maior passo da espingarda por fotograma a 60 Hz numa recarga com ADS e corrida carregados/largados (cm) | 2,02 | 0,84 |

1. **Braços: mão dobrada sobre um antebraço que aponta para outro lado.** `placeViewArms` mantinha a orientação *mundial* autorada da mão e resolvia o antebraço a partir de ombros fixos no referencial da arma (±0,3, −0,4, 0). Nas fases do ferrolho/recarga o antebraço autorado vem de cima ou de trás e o ombro falso fica 40 cm abaixo: o pulso ficava até **133°** mais dobrado do que no clip (pior caso; recarga 0,10 s: 148,6° contra 23,4°). Nas capturas vê-se uma manga vertical «tronco cortado» com o punho ao lado (`before/04b…`, `05…`, `06b…`). Os ombros iam presos à arma: o cotovelo direito media **130,3° na anca, em ADS e na corrida** (o braço era um corpo rígido com a espingarda) e o esquerdo estava sempre no limite do alcance (172,8°).
2. **Mão direita deslocada do punho.** Com `gripWeight = 1` o pulso era levado à força para (5,5, −2,5, 6,5) cm: 4,5 cm abaixo do punho autorado, o indicador ficava debaixo da guarda do gatilho (6,2 cm do gatilho) e os outros dedos 2,6 cm abaixo dela. O clip autorado também não põe o indicador no gatilho: os dedos só fecham 18–26° (sem abdução) e envolvem a coronha (ponta 4,7 cm à esquerda do eixo).
3. **Mão esquerda atravessa o fuste** (1,8 cm) e a ponta dos dedos sobe 4,7 cm no fuste, para o eixo de pontaria: em ADS 70 a 105 vértices de dedos esquerdos ficam na janela da mira.
4. **Recarga: coronha à frente da cara.** A pose de recarga afastava a mira traseira 18 cm (−0,92) com a boca para baixo (−0,18 rad): a coronha ia a 30 cm do olho e enchia **5,8 % do quadro** (8,8 % no pior fotograma) — o grande «triângulo» castanho e a chapa preta nas capturas `before/06*`.
5. **Recarga cortada por um tiro** (a recarga cartucho a cartucho é interrompível): a mudança de clip e de pose é instantânea; o pulso direito dá um salto de **38,6 cm** num fotograma e a arma 24,1 cm.
6. **ADS/corrida durante a recarga** (a simulação não interrompe a recarga com ADS nem corrida; a apresentação mistura-os): já não davam saltos grandes no código antigo (2,02 cm por fotograma, na entrada da recarga); passam a ≤ 0,84 cm porque a pose de recarga ficou perto da pose da anca. Teste 9.
7. **Sem defeito (verificado, nada mudou):** temporização dos marcadores (`chamberOpen`, `eject`, `chambered`, `clipEjected`, `boltClosed` coincidem com os clips: punho levantado a 0,43 s, estojo a 69 % do curso, clipe a sair a 2,45 s, punho em baixo a 2,70 s; teste 10); contacto mão ↔ botão do ferrolho e clipe ↔ mão; planos de corte (todas as malhas ≥ 3 cm, teste `m01-fp-arms`); nenhum extremo de manga dentro do quadro.

## Correcções (só `src/render`)

- **`src/render/m01-fp-hands.js` (novo)**: `ViewHands` + perfil por arma `WZ29_HANDS`.
  - Braços resolvidos a partir das mãos: a mão mantém a pose autorada relativa à arma; o cotovelo fica no círculo de cotovelos válidos de um ombro âncora **no referencial da câmara** (as mangas começam fora do quadro), o mais perto possível do antebraço autorado; o antebraço nunca roda mais de 35° em relação ao autorado (`wristLimit`) e, quando o limite actua, o início da manga sai pelo bordo do quadro (`frameMargin`) em vez de flutuar à vista. Comprimentos de osso exactos.
  - Pega por arma (`hold`): deslocamento do pulso, flexão absoluta dos três ossos de cada dedo sobre o eixo de flexão autorado (calibrado a partir do clip `aim`) e abdução do indicador. Direita: indicador estendido para o gatilho, restantes dedos à volta do punho; esquerda: dedos à volta do fuste sem o atravessar nem subir para o eixo de pontaria. Os números foram ajustados à malha real com `tests/helpers/m01-fp-hand-metrics.js` e ficam fixados pelo teste.
  - O peso da pega (`gripWeight`) continua a vir do ciclo do ferrolho/recarga: durante o ferrolho e a recarga a mão volta à pose autorada (contactos com o botão e o clipe intactos), e regressa de forma suave.
- **`src/render/m01-wz29-presentation.js`**: pose de recarga em `WZ29_FEEL.reload` (mira traseira em (0,09, −0,15, −0,78), boca 0,12 rad para cima, guinada 0,10, rolamento −0,20): a coronha fica ao lado do ombro como à anca (≤ 1,4 % do quadro). `placeViewArms`/`VIEW_SHOULDERS` removidos (sem utilizadores).
- **`src/render/m01-viewmodel.js`**: usa `ViewHands`; **esbatimento de recuperação** quando um tiro corta uma recarga (a pose final é guardada em cada fotograma; no fotograma da interrupção o esqueleto volta a esbater de onde estava ao longo de 0,20 s de relógio de missão, com `smoothstep`; determinístico, não guardado no save, reposto no restauro, sem alocação por fotograma). Salto no tiro: 38,6 cm → ≤ 4 cm.
- **Testes**: `tests/m01-fp-hand-grip.test.js` (novo); em `tests/m01-wz29-viewmodel.test.js` a asserção «corrected right grip contact» (fixava o ponto de pega defeituoso, 5,5/−2,5/6,5 cm) passou a «pega direita = pega autorada + pega por arma».

## Testes executados

- `node --test tests/m01-fp-hand-grip.test.js`: 10/10 (código antigo: 1/10).
- Os 12 ficheiros de teste que tocam o view model, a pega ou a IK (`m01-animation-variety`, `m01-character-assets`, `m01-consolidation-lifecycle`, `m01-fp-arms`, `m01-fp-hand-grip`, `m01-lighting`, `m01-render-perf`, `m01-t37-foot-ik-hand-pin`, `m01-t49-scratch-reuse` (sem alocações em `M01ViewModel.update`), `m01-viewmodel-feel`, `m01-weapon-presentation`, `m01-wz29-viewmodel`): 149/149.
- `npm test` completo (corrido uma vez durante o trabalho; entretanto só mudaram testes, ferramentas e documentação): 1533 testes, 1524 passam e **9 falham, todos por objectos git em falta neste clone** (`git show`/`ls-tree` de `5f3cc34`, `2cfa952`, `d070225`, `99309d9`, `e588c0c`: `m01-locomotive`, `m01-panzerzug`, `m01-soldier-visual-variation`, `m01-mg34-prone-runtime`, `m01-soldier-motion-clips`, `m01-train-consist-polish` ×4); falhariam igual sem o meu diff. A allowlist dos byte-guards já inclui `src/render/m01-viewmodel.js` e o ficheiro novo não existe nas bases históricas.
- Navegador (Chromium/SwiftShader, `npm run build`, `playwright-port-4189.config.mjs`): `m01-weapon-presentation` 3/3 (inclui o clipe a sair aos 2,45 s e o tiro em ADS); `m01-viewmodel-feel` (rifle baixo junto à parede) passa; `m01-fp-arms` 4/7, e as 3 falhas (`T40 canonical 01/05/14 exact saved clock and camera`: o `#pause` demora mais de 5 s a aparecer) **falham igual na build de `e7f5f28`**; `m01-viewmodel-feel` (ADS pelo rato) e `m01-wz29-viewmodel` (low/medium/high) passam ou falham de execução para execução nas duas builds (a antiga falhou `wz29 low` e `feel ADS` isolados, a nova passou os mesmos isolados): lentidão do SwiftShader neste ambiente, não uma regressão medida.

## Limites e por validar

- **Nenhum humano viu o resultado no jogo.** As imagens mostram braços e punhos ligados, a coronha fora do caminho na recarga e o ferrolho/clipe nas mãos, mas os dedos continuam a ser prismas hexagonais de baixa resolução e **não foi avaliada a «sensação»** da animação (ritmo, peso). Falta olhar para: ADS (a mão direita fica ao lado da coronha e perto da mira traseira; só 2 a 6 vértices na janela), a manga direita larga em ADS/recarga (ocupa cerca de um terço do ecrã), e o dedo no gatilho (só se vê dos lados).
- O braço esquerdo continua esticado (172,8°): a espingarda está a 0,74 m do olho (`rearDepth`) e o braço alcança 0,51 m; é um limite do desenho da pose, não do braço.
- O recuo e a transição anca → ADS continuam a mover espingarda e mãos como uma unidade (por desenho); o que passou a articular foi o cotovelo, o pulso e os dedos.
- Só a kb wz.29 tem arma em primeira pessoa; o perfil `WZ29_HANDS` é por arma, outras armas precisam do seu.
- Nenhuma medição de FPS nem de custo por fotograma na máquina de referência (o código novo não aloca por fotograma e o teste estático de `m01-t49-scratch-reuse` passa, mas isso não é uma medição).
