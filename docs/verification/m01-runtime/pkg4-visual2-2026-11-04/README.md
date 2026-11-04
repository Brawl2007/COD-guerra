# Pacote 4 (viewmodel da kb wz.29) e VII-a visual, ronda 2 — 2026-11-04

Ramo local `pkg4-visual2` (de `57ba50f3`). **Não publicado**, sem revisão crítica independente, **sem playtest humano**. Só apresentação: `git diff 57ba50f3 -- src/game src/world missions` vazio. Capturas em SwiftShader (software), 1280 × 720: **não são FPS**. Os `before-*` são o código de `57ba50f3`; os `after-*` o deste ramo.

## Parte A — viewmodel da kb wz.29

**Diagnóstico.** O fuzil e as mãos vêm de `fp-arms-v2/m01_fp_arms_v2.glb`, gerado por `tools/assets/m01-soldiers/` (código do projeto, MakeHuman CC0 na base). (1) A «alça» do GLB é um bloco plano de 26 × 14 × 70 mm cujo topo fica 1 mm **abaixo** da linha de mira: não há entalhe e o alvo fica atrás do bloco (o teste antigo documentava «sem entalhe, alvo escondido»: 104 px de bloco, 0 px de alvo). (2) Cada falange é uma `CapsuleGeometry(r, l, 1, 5)`: prisma de 5 lados, daí as «contas» hexagonais.

**O que mudou** (código procedural; o GLB, o `manifest.json`, os hashes e o estado da licença em `ASSET_CREDITS.md` **não foram tocados**; a licença do `fp-arms-v2` continua pendente do proprietário):
- `src/render/m01-wz29-sights.js` (novo): o viewmodel deixa de desenhar os 80 triângulos do bloco (clone da geometria; a do GLB partilhado nunca é editada) e desenha uma base baixa + uma **folha com entalhe em U** (boca 8,8 mm, fundo 6,8 mm, 13,5 mm de fundo) + um **alvo** mais largo (3,4 mm na base, 2,4 mm no topo, topo plano). Tudo no referencial do osso `weapon`, **nas mesmas marcas do ADS**: `WZ29_VISUAL.rear [0,.056,-.29]` fica a meio do entalhe (4 mm acima do fundo) e a ponta do alvo é exatamente `front [0,.065,-.752]`. A câmara, o FOV e as marcas não mudam.
- `src/render/m01-fp-fingers.js` (novo): mãos finas construídas ao carregar a partir das mesmas juntas de bind, mesmos ossos e raios: 10 lados, pontas arredondadas (a ponta pára ¼ de raio antes), ligeiro afunilamento, saliência na articulação proximal, secção achatada no dorso, normais suaves. Mão 1 028 → 2 688 triângulos. **A pose de transporte continua com as mãos originais** (`fp_hands_carry`) para respeitar o orçamento de 6 000 triângulos do T40.
- `m01-viewmodel.js`: liga os dois (construção, visibilidade por fotograma só em `!carry`, `dispose`). Sem alocações por fotograma.

**Evidência** (`before-/after-{hip,ads}.png`, pipeline de produção `M01View` via `tools/verification/m01-wz29-sights-capture.mjs`; comparações `cmp-*.png`):
- `cmp-ads-hands-3x.png`: dedos arredondados em vez de contas hexagonais. `cmp-ads-sights-8x.png` / `cmp-hip-rear-sight-6x.png`: a folha com entalhe, vista no ADS (dois ombros com o intervalo e o alvo lá dentro) e à anca.
- Alinhamento ADS inalterado: `horizontalPixels 4,6e-15`, `verticalPixels 9,3e-14` (iguais aos de antes). Rasterizador do teste, 1280 × 720: alça 198 px (antes 104), alvo 6 px (antes 0), entalhe com 8 px de abertura, alvo na coluna 640.
- Fixture do viewmodel (`weaponFrame`, High): 6 → 9 chamadas, 3 264 → 4 948 triângulos (mãos +1 660, alça +24 líquidos).

**Limites, ditos com franqueza.** No ADS o olho está 0,74 m atrás da alça e o fecho/anel do receptor (0,37–0,42 m) tapam a parte baixa do entalhe: vê-se sobretudo a metade de cima da folha e a **ponta** do alvo (2 × 3 px a 720p). É uma limitação do desenho do ADS existente (olho atrás da coronha), que não alterei. A folha é aço escuro; em cenas escuras lê-se pelo fundo claro no entalhe. Cenas sem ajuste de brilho/cor do aço.

## Parte B — VII-a ronda 2 (só `np`; ato 1 intacto)

| Pedido | O que fiz | Ficheiro |
|---|---|---|
| Árvores pequenas / «guarda-chuva» | Três silhuetas: pinheiro cónico (4 massas empilhadas que estreitam), choupo colunar (3) e folhosa com núcleo mais alto que largo e 4 lóbulos (todos ≥ tão altos como largos). Alturas: mediana 10,2 → 14,8 m, máxima 17 → 27,6 m. Triângulos 29 260 → 28 060. | `m01-area-trees.js` |
| Face interior do parapeito (mancha castanha) | Material próprio da berma (`createBermMaterial`): **revestimento de pranchas horizontais com estacas**, tom por prancha, veio, juntas, fio de «desgaste»; seixos esparsos e grão fino só perto da câmara (desligados em Low); bump de prancha/estaca. Coordenadas ao longo do talude e relativas ao eixo da berma (coordenadas de mundo grandes cortavam o padrão). As pranchas esbatem-se para a cor média com `fwidth`. Só sombreado: geometria e caixas intactas. | `m01-area-earthworks.js`, `m01-area-dressing.js` |
| Relva em xadrez perto da câmara | Linhas do campo **aperiódicas** (fase deformada a 3 escalas, largura/força/falhas por linha) e esbatidas aos 4–20 m (antes 45–150 m); amostragem **estocástica** do mapa de solo em High/Medium (`textureGrad`, 4 amostras com desvio aleatório por célula); Low: 1 amostra deformada e contraste do grão reduzido (ainda assim fica um xadrez ténue a 15–40 m em Low — ver riscos). **Tufos de restolho só em High** (`m01-area-stubble.js`): 3 400 tufos × 4 lâminas num só `InstancedMesh`, um ladrilho fixo de 26 × 26 m enrolado à volta da câmara no vertex shader (sem trabalho de CPU nem alocações por fotograma), tamanho desce para zero na borda, só na faixa jogável plana, cor da mesma célula de cultura do campo (palha / verde / nada na lavrada), sem sombra. | `m01-area-field.js`, `m01-area-stubble.js`, `m01-area-dressing.js` |

**`renderer.info`** (`tests/browser/m01-act-vii-a-visual.spec.js`, menor de 8 leituras, `metrics-*.json`; SwiftShader, não é FPS):

| Vista | High antes → depois: draws | High: triângulos | Low antes → depois: draws | Low: triângulos |
|---|---|---|---|---|
| 02 chegada | 143 → 147 | 557 102 → 571 186 | 74 → 77 | 262 136 → 263 100 |
| 04 linha | (*) → 137 | (*) → 686 348 | 72 → 75 | 257 932 → 258 894 |
| 05 oeste | (*) → 162 | (*) → 690 842 | 96 → 99 | 260 798 → 261 840 |
| 05b destroço | (*) → 142 | (*) → 687 210 | 73 → 77 | 258 104 → 259 152 |

(*) As leituras «antes» em High nas vistas 04/05/05b deram exatamente 575 / 1 182 615 (passagem dupla do `renderer.info`, o artefacto já descrito no pacote 1), logo não são comparáveis; a comparação limpa em High é a vista 02 e o diagnóstico da decoração. `areaDressing` (High): **86 908 → 99 308 triângulos, 9 → 10 draws** (tufos +13 600, árvores −1 200; o tufo é o draw novo). Low: 59 878 → 59 158 (árvores). Os +3 draws (+4 em High) das outras colunas são as 3 malhas da alça do viewmodel (+1 o tufo em High). Texturas e geometrias: +0/+2.

Capturas: `after-02-arrival-*`, `after-04-line-north-midwave-*`, `after-05-line-west-ckm-*`, `after-05b-wreck-aimed-*` (High e Low) contra os `before-*` homónimos. `before-04-...-high.png` é a captura do pacote 1 (`vii-a-visual-pkg1-2026-11-03/04-...-high.png`, mesmo código de cena): a captura «antes» desta ronda caiu no fade de abertura (o spec ganhou `VIS_WAIT`, espera em ms das vistas que não são a chegada, por omissão 3 500, para evitar isto; os `after` usaram 14 000).

**O que ficou melhor / o que não.**
- High 05 e 05b: o parapeito lê-se como berma com revestimento de pranchas e estacas sob os sacos; o chão perto tem tufos de restolho; as árvores são claramente mais altas e variadas (choupos).
- Relva em xadrez: desaparece em High a toda a distância; em Low desce mas **resta uma quadrícula ténue** a 15–40 m (o mapa de solo repete-se; só uma amostra).
- As pranchas, vistas de perto, têm contornos de junta pouco naturais (as linhas seguem a malha de 9 pontos do perfil) e a face fica quase sempre à sombra com este sol; o contraste vem do albedo, não do relevo.
- Os tufos são lâminas planas simples: de pé, a 1–3 m, lêem-se como espigões; não há vento.
- Árvores a 280–360 m continuam pequenas no ecrã (são grandes, mas estão longe); alturas até 27 m são para folhagem/choupo, não medidas contra fotografia.

## Comandos e resultados reais
- `node --test` (145/145, 0 falhas): `m01-act-vii-a`, `m01-acts`, `m01-area-visual` (10, 4 novos), `m01-pkg4-viewmodel-detail` (novo, 4), `m01-fp-ads-sight` (9; o teste do alvo/entalhe foi reescrito, o bloqueio de alinhamento mantém-se), `m01-fp-hand-grip`, `m01-fp-arms` (inclui o orçamento ≤ 6 000 em transporte e em ADS/recarga), `m01-character-assets`, `m01-render-perf`, `m01-t49-scratch-reuse`, `m01-viewmodel-feel`, `m01-weapon-presentation`, `m01-wz29-viewmodel`. A suite completa (`npm test`) **não** foi corrida.
- Helpers de teste: `m01-fp-sight-picture.js` conhece as 3 malhas novas; `m01-fp-hand-metrics.js` só aplica `applyBoneTransform` a `SkinnedMesh`.
- `npm run build`: ok. `tests/browser/m01-act-vii-a-visual.spec.js` (High e Low): 2/2, 0 erros de página.
- Specs de viewmodel/ADS no Playwright: ver o fim deste ficheiro.

## Riscos
- Triângulos: viewmodel +1 660 (mãos), tufos +13 600 em High; não medido na máquina de referência (Intel HD 5500). Se pesar: `FINGER_DETAIL` (lados/anéis) e `STUBBLE` (`count`, `radius`, `bladesPerTuft`).
- Orçamento de transporte: sem folga nova (as mãos finas não são usadas aí).
- Estado de licença do `fp-arms-v2` inalterado (decisão do proprietário).
- Nada disto foi jogado por uma pessoa.

## Specs de viewmodel/ADS no Playwright (`CI=1`, SwiftShader)
`m01-wz29-viewmodel.spec.js`, `m01-fp-arms.spec.js`, `m01-weapon-presentation.spec.js`, `m01-viewmodel-feel.spec.js`: **8 passaram, 7 falharam**, todos os falhados nos fluxos «save pausado no limite do pointer lock» (`#pause` nunca fica visível: o Chromium headless deste ambiente não concede o bloqueio do ponteiro; em Low/Medium do `wz29-viewmodel` `window.gameDiagnostics` ainda não existia). **Não atribuo isto ao pacote sem prova**: antes de qualquer alteração, o mesmo spec (`wz29-viewmodel`, High) já falhava neste ambiente (o clique em `#continue` não terminava em 45 s sem `CI=1`), mas não corri o conjunto completo no código de base. As verificações do viewmodel que dependem de geometria (alinhamento ADS, sight picture, orçamento de triângulos, perto do plano de corte, dedos/pega) são os testes `node --test` acima, que passam. Sem PNG versionado reescrito (`git status` limpo fora dos ficheiros deste pacote).
