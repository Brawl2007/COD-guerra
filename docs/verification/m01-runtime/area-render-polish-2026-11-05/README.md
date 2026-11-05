# Acabamento visual dos actos de área (VII-b e VII-c), 2026-11-05

Âmbito: só `src/render`, só actos de área (o Acto I e a ponte não mudam). O renderer lê o estado da simulação e não decide dano, visibilidade, eventos nem estado da missão. Não é playtest nem medição de FPS.

Lacunas de origem: `inc2-vii-b-2026-11-04/README.md` (maqueiros com o ferido ao ombro; impactos de granada sem efeito) e `inc3-vii-c-2026-11-04/README.md` (crepúsculo pouco legível: luminância média 59–87, sem baliza no mundo na saída, só marcador no HUD).

## O que mudou

1. **Maca dos maqueiros (VII-b)**, `src/render/m01-area-stretcher.js` (novo). Quando a simulação diz que um maqueiro (`np_maqueiro_N`) carrega um homem (`actor.carriedBy`), o renderer desenha o par em fila com uma maca procedural (duas varas, dois travessões, lona com folga) entre eles, e o ferido deitado na lona (cópia do registo sem `carriedBy`, mantém a pose `WOUNDED`). O segundo maqueiro é desenhado atrás do primeiro (cópia do registo com outro x/z; nada é escrito de volta). O levantamento usa `timers.medics.since` (1,2 s). Se faltar qualquer registo ou os números não forem finitos, nada é substituído e o transporte ao ombro antigo desenha-se como antes.
2. **Impactos de granada de artilharia (VII-b)**, perfil novo `shell` em `m01-battlefield-fx-profile.js` (`np_shell_crater_*`), reutilizando os efeitos de bomba/granada do Acto I (flash, núcleo, fogo, poeira, fumo, estilhaços, luz) com escala própria (14 m, flash mais longo). Em `m01-view.js`, o rebentamento de uma granada de artilharia é envelhecida a partir do primeiro fotograma desenhado (no máximo 0,3 s depois do impacto), para que um fotograma lento não passe o flash por cima. Os outros tipos mantêm o relógio.
3. **Legibilidade do crepúsculo (VII-c)**, `src/render/m01-area-dusk.js` (novo): duas lanternas com resguardo (poste, capuz, janela âmbar) no limite sul da banda de saída (`plan.withdrawal.exit`), com halo cujo tamanho cresce com a distância (tamanho angular mínimo: lê-se do parapeito, a 200 m, e não encandeia a 5 m), poças de luz no chão; brilho de incêndio da vila a sudoeste (três sprites aditivos baixos) e uma coluna fina de fumo; ambiente ligeiramente elevado só neste acto (`duskLift`, função do sol das keyframes do próprio acto: hemisfério +22 %, exposição +6 %, no máximo). Plausível com o blackout de 1939: luz fraca, escondida do céu. Na qualidade Low saem as poças e a coluna; as lanternas e halos ficam (são a orientação).
4. Edição mínima em `m01-view.js`: `syncAreaPolish` (cria/descarta por plano do acto, nada para o Acto I), ligação à maca antes de `updateActors`, elevação do ambiente em `lighting()`, diagnóstico `areaPolish`. Foi movida a chamada `syncAreaPolish` para antes de `repairLine.sync`, porque `tests/m01-demolition.test.js` fixa `updateDemolition` imediatamente antes de `updateActors`.

## Capturas (cada uma vista uma a uma)

Maca: `stretcher-carry-high.png`, `stretcher-carry-low.png`. Os dois maqueiros em fila, varas entre eles, ferido deitado na lona. A leitura a 5 m é pequena (figuras de ~1,7 m a ~6 m de distância, resolução 1366x768), mas as varas e o corpo são distinguíveis.

Impacto de granada (fotograma do impacto, congelado por dentro da página no primeiro fotograma com flash): `shell-impact-frame-high.png`, `shell-impact-frame-low.png`; ampliação 3x do recorte em `shell-impact-crop-high-x3.png`. O relatório regista `kinds.shell=1`, `flash=2` (High) e 1 (Low), com luz. O impacto está longe (a granada cai na terra de ninguém); o clarão e a poeira são visíveis mas modestos neste enquadramento. Não foi feita captura de impacto próximo.

Crepúsculo: `dusk-line-{high,low}.png` (no parapeito, a olhar para a saída, 200 m), `dusk-town-glow-{high,low}.png` (a meio, a olhar a vila a oeste-sudoeste), `dusk-exit-130m-{high,low}.png`, `dusk-exit-50m-{high,low}.png`. As duas lanternas lêem-se como pontos âmbar com poste a 50 m e 130 m; a 200 m (linha) são pontos pequenos com halo. O brilho laranja-rosa da vila vê-se atrás da silhueta. Os relatórios `report-*.json` têm `renderer.info`, o relógio e o diagnóstico `polish`.

O erro de consola `ERR_INSUFFICIENT_RESOURCES` / `VALIDATE_STATUS` do GL por software não ocorreu nestas corridas (`errors.total=0` em todos os relatórios).

## Comandos e resultados reais

- `node --test tests/m01-area-render-polish.test.js`: 11 testes, 11 passam.
- Testes que lêem as fontes tocadas, após a correcção da ordem em `m01-view.js`:
  - `node --test tests/m01-area-visual.test.js tests/m01-battlefield-fx-polish-v3.test.js tests/m01-battlefield-fx.test.js tests/m01-demolition.test.js tests/m01-lighting.test.js tests/m01-consolidation-lifecycle.test.js tests/m01-damage-decals.test.js tests/m01-long-range-fx.test.js tests/m01-aircraft-runtime.test.js tests/m01-living-battlefield-t21.test.js tests/m01-area-render-polish.test.js`: 103 testes, 103 passam (antes da correcção, 1 falhava em `m01-demolition`, por causa da ordem das chamadas).
  - `node --test tests/m01-aircraft.test.js tests/m01-german-retreat.test.js tests/m01-grading.test.js tests/m01-impostors.test.js tests/m01-mg34-prone-presentation.test.js tests/m01-player-shot-feedback.test.js tests/m01-poses.test.js tests/m01-shot-fx.test.js tests/m01-terrain-material.test.js tests/m01-water.test.js`: 118 testes, 118 passam.
  - `tests/m01-display-fire.test.js` e `tests/m01-east-front.test.js` (importam `M01View` só para `Object.create(M01View.prototype)`) não foram concluídos: são simulações longas e cada uma passava dos 12 minutos de CPU na máquina partilhada; foram interrompidas. Não há evidência nem a favor nem contra deles.
- `npm run build`: concluído sem erros (apenas o aviso habitual de chunks grandes).
- Playwright (build de produção, Chromium/SwiftShader, porta livre, config temporária fora do repositório): `m01-act-vii-b`, `m01-act-vii-c` e `m01-area-render-polish`, 20 testes, 20 passam (22,9 min). Os 8 testes dos actos (4 + 4) reescrevem as capturas de `inc2`/`inc3`; foram repostas com `git checkout`.

## renderer.info antes/depois (mesma cena, mesma câmara)

«Antes» = build da linha de integração sem esta alteração, mesmas cenas (guardadas fora do repositório). Fotogramas congelados na cena; a contagem de triângulos/geometrias/texturas varia com o que a página tinha carregado até ao congelamento, por isso só as chamadas de desenho são comparáveis sem reservas.

| Cena | Qualidade | draw calls antes→depois | triângulos antes→depois | geometrias antes→depois | texturas antes→depois |
|---|---|---|---|---|---|
| VII-b maca | High | 525 → 529 | 933 817 → 1 229 449 | 540 → 588 | 102 → 158 |
| VII-b maca | Low | 417 → 428 | 573 537 → 687 664 | 503 → 540 | 69 → 121 |
| VII-c linha | High | 133 → 142 | 725 122 → 733 986 | 302 → 336 | 67 → 103 |
| VII-c linha | Low | 123 → 130 | 411 388 → 411 646 | 286 → 289 | 79 → 80 |
| VII-c vila | High | 97 → 106 | 157 949 → 256 723 | 263 → 310 | 77 → 101 |
| VII-c vila | Low | 86 → 93 | 101 191 → 197 163 | 97 → 270 | 36 → 78 |
| VII-c saída 130 m | High | 90 → 101 | 367 622 → 632 720 | 272 → 319 | 62 → 89 |
| VII-c saída 130 m | Low | 86 → 93 | 290 720 → 386 692 | 248 → 279 | 49 → 68 |
| VII-c saída 50 m | High | 86 → 99 | 306 373 → 441 924 | 297 → 321 | 63 → 89 |
| VII-c saída 50 m | Low | (sem antes) → 88 | (sem antes) → 368 755 | → 280 | → 69 |
| VII-b impacto | High | (sem antes: sem efeito de granada) → 151 | → 583 534 | → 300 | → 116 |
| VII-b impacto | Low | (sem antes) → 69 | → 267 416 | → 249 | → 74 |

Leitura: o custo próprio do acabamento é de +2 chamadas (maca: madeira e lona) e cerca de +7 a +13 no crepúsculo (postes, janelas, poças em High, 2 halos, 3 brilhos, coluna), com algumas centenas de triângulos. As diferenças grandes de triângulos/texturas (por exemplo +300 000 na maca em High) não vêm da maca (poucas centenas de triângulos): vêm do estado de carregamento e de níveis de detalhe da página no momento do congelamento, e não foram isoladas. O sobrecusto real do acabamento é portanto o das chamadas de desenho; não houve medição de tempo de fotograma.

## Avaliação honesta

- Maca: funciona e vê-se, mas é pequena no ecrã; o ferido deitado lê-se melhor de perto. Só testada a pé a 5 m e com um par de maqueiros; a transição do levantamento (abreast para fila) não foi capturada em fotograma.
- Impacto de granada: o clarão e a poeira existem no fotograma do impacto (provado pelo contador e pelo recorte), mas a granada captada cai longe; não prova o aspeto de um impacto a 30–50 m.
- Crepúsculo: as lanternas e o brilho da vila existem e dão uma referência diegética; porém as lanternas a 200 m são pontos pequenos. A luminância média da imagem inteira (inclui HUD) não é uma medida limpa: em seis de sete pares de comparação subiu (por exemplo vila High 73→93, saída 130 m High 77→87, linha Low 80→90) mas em `dusk-line-high` desceu (78→67; céu 114→94, chão 40→39), e repetida uma segunda vez dá o mesmo valor (65). Não se conseguiu explicar com certeza (variações de nuvens e sombras de nuvens em High, ou a coluna de fumo escura sobre o céu, são hipóteses não verificadas). Portanto a «legibilidade» melhorou nas outras cenas, mas não em todas, e não há prova de que a elevação do ambiente funcione igual em todos os fotogramas.
- Nenhum destes elementos substitui um teste de jogo: validar com o proprietário.
