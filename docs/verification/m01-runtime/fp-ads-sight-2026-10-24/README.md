# Mira em ADS da kb wz.29: o triângulo de madeira sob o fiel (R6-b) — 2026-10-24

Queixa do Capitão sobre a ADS de `bc6d4b0` (R6-a): «um grande triângulo de madeira sobe no centro do ecrã, por baixo do fiel, e tapa grande parte da vista inferior-central».

Branch `claude/exciting-bohr-k8v5xm-r6b`, de `bc6d4b0` (ramo de integração com a R6-a). **Não publicada. Sem playtest humano e sem inspeção visual humana** (as imagens foram vistas só por quem escreveu o pacote). Pacote **só de renderização**: `git diff bc6d4b0 -- src/game` está vazio, nenhum golden foi tocado, a simulação nunca é escrita, o alinhamento das miras e a direcção da bala (a câmara) ficam exactamente como estavam.

## Causa-raiz

1. **O triângulo é o topo da coronha (malha `rifle`), e é a geometria do asset que o põe ali, não a pose.** A linha de mira (ponto mais alto da alça → ponta do fiel) passa **2,7 a 3,5 cm acima do topo da coronha** em qualquer distância do olho, e só **3,2 mm acima do topo do anel da culatra**. Com o olho na linha de mira, a coronha fica a 10–25° abaixo do eixo, dentro dos ±29° do quadro (câmara de armas de 58°).
2. **O olho está atrás da soleira.** `WZ29_VISUAL.rearDepth` = 0,74 m: o olho fica 11,5 cm **atrás** da chapa da coronha (a soleira está 0,625 m atrás da alça, o olho 0,74 m). Daí a «tira escura» por baixo do triângulo nas capturas antigas: é a **face traseira da chapa de aço** da coronha, vista de trás. (Medido: `forwardOfButt` = −0,115 m em `before/sight-metrics.json`.)
3. **A alça e o fiel não se vêem.** A alça (`rifle_rearsight`) é um **bloco liso de 26 × 14 × 70 mm, sem entalhe, folha nem orifício**; o fiel tem a ponta a 1 mm acima do topo desse bloco, por isso o bloco esconde o fiel (0 px), e o anel da culatra (3,2 mm abaixo da linha, a 0,415 m do olho) e a caixa do ferrolho (0,37 m) tapam as faces baixas do bloco: ficam **104 px de alça** (≈ 20 × 5 px de um quadro 1280 × 720) e **0 px de fiel** (as orelhas do fiel espreitam 1–2 px). Isto é do asset (alça sem entalhe e baixa demais), não da pose; ver «Por decidir».

## O que as miras travam nos testes (e o que não travam)

- **Alinhamento** (o que tem de ficar): `alignmentReport` (`tools/verification/m01-wz29-viewmodel-audit.mjs`) projecta os marcos `[0,.056,−.29]` (alça) e `[0,.065,−.752]` (fiel), pela câmara de 58°, e exige `|alça−fiel|` e `|fiel|` < `adsTolerancePixels` = 0,5 px; usado em `m01-wz29-viewmodel.test.js` (LOD0/1 × 3 qualidades, restauro, transição), `m01-viewmodel-feel.test.js` (3 sítios, incluindo parede) e `m01-weapon-presentation.test.js` (ferrolho). O primeiro teste de `m01-wz29-viewmodel.test.js` prende os marcos ao asset (`rear_sight` do GLB; vértices reais do fiel; SHA da linha de base). Estes **continuam todos a passar sem alteração**.
- **Distância do olho (0,74 m), de borla:** `a.points.rear[2] < −0,7` e o recuo em `[−0,74; −0,718]` para `aim` 0 e 1 (`m01-wz29-viewmodel.test.js`), `position.z == −rearDepth` exacto em ADS parada e a andar (`m01-viewmodel-feel.test.js`, `m01-weapon-presentation.test.js`), alcance do cano 1,215 ± 0,01 m em ADS (parede). Ou seja, encurtar a distância do olho também obrigaria a mexer nestes testes (e nas constantes da parede).

## Por que a distância do olho NÃO foi encurtada (medido)

Encurtar `rearDepth` põe o olho sobre a coronha («cheek weld») e tira a chapa de aço do quadro, mas **traz as mãos e as mangas para a lente**, e os limites da R6-a (`tests/m01-fp-hand-grip.test.js`: mangas ≤ 12 % do quadro em ADS parada e ≤ 14 % no ciclo, vértice de braço ≥ 12 cm da lente, cotovelos ≤ 140°, braços a sair pelo fundo) deixam de se cumprir. Medido pondo `rearDepth` à mão (commit `8b78f0c`, a parametrização temporária `rearDepth`/`hipDepth` já não está na árvore), a grelha ADS parada + 23 fases do ferrolho, mesmo teste e mesmas medidas:

| rearDepth (m) | olho à frente da soleira (cm) | mangas ADS parada / pior do ciclo (% do quadro) | vértice de braço mais perto da lente (cm) | cotovelos ADS R/L (°) | braço a sair pela direita |
|---|---|---|---|---|---|
| **0,74 (actual)** | −11,5 | 10,2 / 13,5 | 23,5 | 137 / 138 | não |
| 0,70 | −7,5 | 11,0 / 14,6 | 22,1 | 144 / 140 | não |
| 0,66 | −3,5 | 12,0 / 16,8 | 20,7 | 147 / 143 | não |
| 0,62 | +0,5 | 13,4 / 20,0 | 16,7 | 147 / 146 | não |
| 0,60 | +2,5 | 14,3 / 22,1 | 14,6 | 146 / 148 | não |
| 0,56 | +6,5 | 16,6 / 26,8 | 11,5 | 141 / 151 | sim (fase 0,92) |
| 0,52 | +10,5 | 14,7 / 28,7 | 8,5 | 130 / 155 | sim (4 fases) |

Uma busca aleatória (500 avaliações) sobre as âncoras de ombro e as direcções dos antebraços em ADS a 0,60 m não baixou a área das mangas de 14,3 %: a área vem dos punhos e do início do antebraço, que estão onde está a mão (a mão não pode sair do punho, o teste de palma tem 1 cm). O recuo de 0,74 para 0,62 m só tira a chapa de aço do quadro (0,625 m é onde o olho passa a soleira); o triângulo de madeira **continua** (45 % da região inferior-central a 0,52 m, medido sem o corte). A distância do olho **não** resolve o triângulo; resolve-o o corte abaixo. Fica a decisão do Capitão/proprietário se querem mesmo assim o olho sobre a coronha à custa de mangas de 13–16 % (a constante é uma só, `WZ29_VISUAL.rearDepth`; os testes de mãos e de recuo/alcance teriam de ser reabertos).

## Correcção: corte da coronha atrás da culatra, só em ADS (`src/render`)

- **`m01-wz29-presentation.js`:** `FACE_CLIP` e `faceClipWeight(aim, stroke, reload, wall)`; o material da espingarda (`riflePresentationMaterial(source, boltBone)`) recebe o corte. Com a espingarda ao olho, **todo o fragmento da espingarda mais perto do olho do que 0,41 m é descartado, menos o ferrolho** (osso `weapon_bolt`: caixa, corpo, alavanca e botão ficam). 0,41 m = a distância do olho ao fim traseiro do anel da culatra (0,415 m) menos 5 mm: o corte cai logo atrás do anel, que o esconde. O que desaparece é a coronha de madeira atrás da culatra (cume, calcanhar, soleira) e a chapa de aço. Justificação: sem cabeça desenhada, é o que a cabeça e o ombro do atirador tapam; o asset não é editado.
- **Peso do corte** (uniforme `m01FaceClip` em metros, escrito por `M01ViewModel.update`): 0 à anca, 0,41 m exactos nas miras; só engata quando a espingarda está quase ao olho (suavização do `adsEase` entre 0,35 e 0,75, para a coronha nunca aparecer serrada a meio da subida), **desliga no curso do ferrolho** (curso 0,4 → 0,8: a espingarda sai do olho e vê-se a coronha, como antes), na recarga e quando a parede a baixa. É função só do relógio de missão e do estado; sem alocação por fotograma; não é guardado no save.
- **Shader:** `vM01Bolt` (índice de osso `skinIndex.x` contra o osso do ferrolho) no vértice e `discard` logo a seguir a `<clipping_planes_fragment>`; chave de programa `…-v5`. Compilou no Chromium/SwiftShader (as capturas correram sem erro de página).
- **Reversível:** `FACE_CLIP.depth = 0` desliga o corte.

## Medido (rasterizador de software determinístico, sem navegador)

`tests/helpers/m01-fp-sight-picture.js` rasteriza o que a câmara de armas vê (teste de profundidade, plano próximo de 0,03 m, 58°, 16:9) dos triângulos da espingarda classificados (coronha de madeira, cume atrás da culatra, guarda-mão, alça, fiel, ferrolho, aço), mãos e mangas, aplicando o mesmo corte do shader. **Região inferior-central** = metade central da largura, de logo abaixo do ponto de mira ao fundo (|x| ≤ 0,25, −1 ≤ y ≤ −0,05 em ndc, ≈ 320 × 342 px a 1280 × 720). `tools/verification/m01-fp-ads-sight-metrics.mjs [--src <árvore>] --out …` produz `before/sight-metrics.json` (`bc6d4b0`, via `git archive`) e `after/sight-metrics.json`.

| Medida (ADS parada, região inferior-central) | Antes (bc6d4b0) | Depois |
|---|---|---|
| Cume da coronha (madeira atrás da culatra) | 30,1 % | **0,1 %** |
| Madeira total (coronha + guarda-mão) | 30,6 % (3,6 % do quadro) | **3,0 %** (0,35 % do quadro) |
| Aço (anel, caixa do ferrolho, chapa da soleira) | 22,1 % | 3,7 % |
| Mãos (pele) à vista | 6,1 % | 10,7 % (as mãos que a coronha tapava) |
| Alça visível (px de 1280 × 720) / fiel | 104 / 0 | 104 / 0 (inalterado, ver causa 3) |
| Janela da mira 96 × 72 px, pele/mangas (R6-a) | 0 / 0 | 0 / 0 |
| Fases ADS com o olho à altura (ferrolho 0,05/0,10/0,12/0,15/0,90…0,97): cume | 27–33 % | 0 % |
| Curso do ferrolho (0,20…0,87): cume | até 31 % | ≤ 10 % (como antes ou menos, em todas) |
| Subida à ADS a 60 Hz: maior salto de madeira por fotograma | 5,4 % | 5,3 % (pico de madeira na região 11,7 %, antes 30 %) |
| Descida da ADS: maior salto de madeira por fotograma | 6,9 % | 3,9 % |
| Recuo (5 fotogramas): passo da alça / cume | 0,88 cm / 0 % | 0,88 cm / 0,1 % |

**Honestidade:** o custo é que a pele (mão esquerda a envolver o fuste, nós da direita) passa a ver-se onde estava a coronha: 10,7 % da região, contra 6,1 %. Não há pele na janela de 96 × 72 px. As mãos são prismas hexagonais de baixa resolução.

## Capturas (renderizador real, Chromium/SwiftShader, 1280 × 720, qualidade média)

`tools/verification/m01-fp-hands-evidence.mjs <dir> <porta> --ads` (modo novo, só fases à ADS) com `m01-fp-hands-fixture.html`; `before/` = `bc6d4b0`, `after/` = ponta do ramo. Fases: anca parado, ADS a meio da transição (0,15 s), ADS assente, ciclo do ferrolho em ADS a 0,20/0,45/0,70 s, ADS a andar. Cada fase tem três PNG (câmara do jogo, `-right`, `-top`). `compare/*.jpg` = antes | depois a meia resolução (`tools/verification/m01-fp-hands-compare.py <dir> <etiqueta antes> <etiqueta depois>`); `zoom/*.jpg` = o centro do quadro (480 × 360 px à volta do ponto de mira, descido) a 2× (`tools/verification/m01-fp-ads-sight-zoom.py`). **Não são FPS nem playtest.**

## Testes

Ver o fim deste ficheiro (preenchido com as corridas finais).

## Por decidir / o que um humano tem de julgar

- Se a ADS **sem a coronha** lê bem: o centro passa a ser anel da culatra (disco escuro) com as miras, a mão esquerda em prismas sobre o fuste, a bandoleira a pender e a manga direita à direita. Falta olhar para isto em movimento.
- A **alça sem entalhe e baixa** (e o fiel escondido atrás dela): é de asset (alça com entalhe/folha mais alta, ou a caixa/ferrolho mais baixos). Uma tarefa de asset (R6-c) resolveria o «não há miras legíveis» que o corte da coronha não resolve nem agrava.
- O **olho sobre a coronha** (distância do olho 0,52–0,60 m) à custa de mangas de 14–17 % e dos testes de mãos (tabela acima).
- O corte é «de apresentação»: numa câmara livre (`-right`/`-top`, ou outras vistas) a coronha aparece inteira, porque o corte depende da distância ao olho.
