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


## Desempenho e pó (2026-11-05)
Auditoria de desempenho do renderer (só leitura, PC de referência Intel HD 5500 a 1366×768) e a nuvem de pó do Ato I. **Sem números de FPS**: o SwiftShader não mede isso; o que se mede aqui é trabalho evitado (consultas ao terreno, texturas, buffers libertados) e `renderer.info`.

### O que mudou (ramo `area-perf-3`, por item da auditoria)
| # | Item | O que fiz | Ficheiro |
|---|---|---|---|
| 1 | Shader do campo | Linhas de cultura só com `aDist < 20`; troços do trilho e faixa pisada só fora de Low; empenamento do domínio e tinta fbm desvanecem aos 50–80 m em Low e deixam de ser avaliados para lá disso; toques no mapa de solo só até 60 m (High/Medium). | `m01-area-field.js` |
| 2 | Shader da berma | Bloco de pranchas/estacas dentro de `if(bRev>0.)`; seixos dentro de `if(bPebK>0.)`. | `m01-area-earthworks.js` |
| 3 | Mudança de ato na mesma área | VII-a → VII-b → VII-c já não reconstrói campo, mapa de solo 256², restolho, árvores, destroço nem os ≈ 2 500 raycasts ao terreno: o novo `M01AreaDressing` recebe `reuse:` e só refaz as terraplanagens das coberturas (montes, berma, torrões, crateras). Mudança de área continua a reconstruir tudo. | `m01-area-dressing.js`, `m01-view.js` |
| 4 | `dispose()` | Liberta todos os `InstancedMesh` (montes, torrões, discos/aros de crateras, crateras de granada) e o restolho. | `m01-area-dressing.js`, `m01-area-stubble.js` |
| 5 | `syncShellCraters` | Decide por uma assinatura sem alocação antes de construir nada. | `m01-area-dressing.js` |
| 6 | Atmosfera | Cores dos puffs (destroço, fumo, vapor) são constantes: acabou o `Color.set('#…')` por puff por fotograma. | `m01-atmosphere.js` |
| 7 | Crateras de granada | Os aros reutilizam o material de terra da decoração (um só programa de solo). | `m01-area-dressing.js` |
| 8 | Sombras | Montes/aros/berma só projetam sombra nos níveis com mapa de sombras (Low não). | `m01-area-dressing.js` |
| 9 | Viewmodel | Nós nomeados procurados uma vez por construção (`ed3f2080`, verificado por `tests/m01-viewmodel-part-cache.test.js`). | `m01-viewmodel.js` |
| 10 | Pó do Ato I | Ver abaixo. | `m01-dust-volume.js`, `m01-atmosphere.js`, `m01-view.js` |
| 11 | Quadrícula em Low | Ver abaixo. | `m01-area-field.js` |

### Medições
**Consultas ao terreno por dressing** (`tests/m01-area-dressing-reuse.test.js`, correr com `DRESSING_COUNT=1`): primeira construção **2 457**; construção nova de outro ato (comportamento antigo) **2 457**; ato da mesma área com `reuse` **0**.

**`renderer.info.memory` nas mudanças de ato, na página** (`tests/browser/m01-act-transition-memory.spec.js`: o fim de VII-a e o de VII-b abrem o ato seguinte; leitura mínima de 8 fotogramas depois de a decoração estar desenhada; `perf3-transitions-{high,low}.json`):

| Mudança | High geometrias | High texturas | Low geometrias | Low texturas |
|---|---|---|---|---|
| VII-a → VII-b | 292 → 300 | 126 → 116 | 251 → 253 | 83 → 79 |
| VII-b → VII-c | 295 → 299 | 118 → 100 | 249 → 252 | 76 → 78 |

Os totais incluem o que o próprio ato traz (atores, crateras, cartelas), por isso a diferença é de poucos recursos e não zero; o spec exige texturas ≤ +4 e geometrias ≤ +12. O mesmo teste com a reconstrução completa (`reuse:null`, High) dá os mesmos totais (±1 geometria): **o ganho do reaproveitamento não está nas contagens de `renderer.info.memory`, está nos 2 457 raycasts, na textura de 256² e nos buffers que já não são recriados**. A volta VII-c → VII-a é um jogo novo (não é uma transição na mesma página): a identidade dos objetos e os eventos `dispose` de toda a cadeia VII-a → VII-b → VII-c → VII-a estão em `tests/m01-area-dressing-reuse.test.js` (nada fica por libertar, nada em uso é libertado).

**`renderer.info` das quatro vistas de VII-a** (`tests/browser/m01-act-vii-a-visual.spec.js`, menor de 8 leituras; `perf3-base-metrics-*.json` = código da linha de integração 101b572a, `perf3-metrics-*.json` = este ramo; SwiftShader):

| Vista | High draws | High triângulos | High geom./tex. | Low draws | Low triângulos | Low geom./tex. |
|---|---|---|---|---|---|---|
| 02 chegada | 147 → 147 | 571 186 → 571 186 | 292/111 → 292/111 | 77 → 77 | 258 657 → 254 642 | 246/76 → 247/76 |
| 04 linha | 136 → 136 | 686 346 → 686 346 | 295/111 → 295/111 | 74 → 75 | 258 812 → 259 176 | 248/79 → 248/79 |
| 05 oeste | (*) → 161 | (*) → 690 840 | 405/110 → 320/113 | 99 → 99 | 261 762 → 261 764 | 264/79 → 264/79 |
| 05b destroço | 138 → 138 | 686 602 → 686 602 | 297/110 → 297/111 | 75 → 77 | 259 066 → 259 148 | 250/79 → 250/79 |

(*) A leitura «antes» de High 05 (578 draws, 1 184 299 triângulos) é a passagem dupla do `renderer.info` já descrita no pacote 1: não é comparável. Triângulos e draws ficam iguais: **o trabalho desta ronda no renderer é de shader, CPU e libertação de memória, não de geometria**. Os `perf2-*` que um agente anterior tinha guardado (triângulos 40 % mais baixos) vinham de um estado que não consegui reproduzir e foram removidos. Capturas: `perf3-02-arrival-*`, `perf3-04-…`, `perf3-05-…`, `perf3-05b-…` (High e Low).

### Pó do Ato I (item 10)
**Problema.** `state.dust` (`src/game/m01-dust.js`) é um facto da simulação: cilindro de raio `r`, altura `h`, `density`; uma linha de visão com ≥ 3 m de densidade 1 dentro dele cega a IA. O renderer só desenhava um véu bege ténue (puffs soltos, `.62 × density`), por isso o jogador via através de uma nuvem que cega o alemão.

**O que o renderer faz agora** (`src/render/m01-dust-volume.js`; só lê o registo da simulação, não decide visibilidade, dano nem eventos). Um único `InstancedMesh` (um draw call, um material) desenha uma caixa por nuvem; o fragment shader intersecta o raio do olho com o cilindro como `dustChord` e integra a profundidade ótica `tau = K · density · comprimento · perfil` com `alpha = 1 − exp(−tau)` (K = 2,3 compensa a média do perfil suave: 3 m de densidade 1 dão ≈ 95 % de opacidade; uma nuvem rala, ou uma corda curta junto à borda, continua rala). A orla suave, o topo mais fino e o ruído só modelam o desenho de uma nuvem cujo tamanho e densidade vêm da simulação; o perfil é 0 no corte do cilindro. Com o olho dentro da caixa desenha-se a face de trás a profundidade 0, de modo que o pó à volta do jogador cobre a vista. Por nível: **8 / 6 / 4 nuvens** (High / Medium / Low; as mais próximas do olho, as restantes mantêm os puffs antigos) e **9 / 6 / 4 amostras** por raio. Sem alocação por fotograma: `pick()` usa um `Int16Array` e um `Float32Array` fixos; a piscina, os buffers e o material são criados uma vez. `renderer.info`: +1 draw call enquanto há nuvens, sem geometria nova além de uma caixa unitária.

**Capturas** (vista do jogador às 04:35:02, depois das bombas das 04:34, com um save do Ato I; `before` = código anterior, `after` = este ramo):

| Nível | Antes | Depois |
|---|---|---|
| Low, vista N | `dust-before-n20-low.png`: apenas manchas escuras ténues junto ao horizonte | `dust-after-n20-low.png`: cortina de pó opaca em arco sobre o horizonte |
| Low, vista E | `dust-before-e20-low.png` | `dust-after-e20-low.png` |
| High, vista O (a ponte ao fundo) | `dust-before-w34-high.png`: véu ténue, a ponte lê-se completa | `dust-after-w34-high.png`: bancos de pó opacos; a ponte e as torres só aparecem entre eles |
| High, vista N | — | `dust-after-n20-high.png` |

Vi cada par. **Melhor:** a nuvem que cega a IA já é uma cortina que o jogador não atravessa com a vista; as ralas continuam ralas. **Não tão bom:** os bancos de High (vista O) têm topo chato e arestas laterais quase verticais (lêem-se como «pães» e não como nuvens de explosão). Sem textura de profundidade, com o olho dentro da caixa a nuvem tapa tudo, incluindo o que está dentro da nuvem. Os scripts de captura eram ficheiros temporários (removidos): as vistas saem de um save do Ato I às 04:35:02 com três orientações do jogador; não há spec versionado que as reproduza.

### Quadrícula do campo em Low (item 11)
O grão do mapa de solo (1,1 m, sub-amostrado) e o fbm de 3 oitavas imprimiam uma quadrícula a 15–40 m. Em Low o grão desvanece entre 4 e 15 m e não se amostra para lá disso; a tinta passa a uma só amostra de ruído de baixa frequência, rodada 37° em relação aos eixos das células e com metade da força; o `polygonOffset` do campo passa a −2/−16 (com −4 espreitavam manchas escuras do terreno entre os 15 e os 60 m). Comparar `after-02-arrival-low.png` (antes, com a quadrícula descrita acima) com `perf3-02-arrival-low.png` (depois): não vejo quadrícula a 15–40 m; fica uma modulação suave de baixa frequência e as faixas de linha da relva a menos de 20 m. **Custo visual em Low:** o trilho gasto, as rodeiras e a faixa pisada deixaram de existir em Low (pedido da auditoria, item 1): o caminho que atravessava o campo na chegada já não se vê. High e Medium não mudaram.

### Comandos e resultados reais
- `node --test` focado (71/71, 0 falhas): `m01-area-visual`, `m01-atmosphere-runtime`, `m01-dust`, `m01-dust-ai`, `m01-area-dressing-reuse` (9, com o teste novo), `m01-viewmodel-part-cache`, `m01-render-perf`, `m01-t49-scratch-reuse`, `m01-act-vii-b`. A suite completa (`npm test`) **não** foi corrida.
- `npm run build`: ok.
- Playwright (SwiftShader, Chromium, porta temporária): `m01-act-vii-a-visual.spec.js` High e Low: 2/2, 0 erros de página; `m01-act-transition-memory.spec.js` (novo): Low 1/1 e High 1/1 (High falhou uma vez por tempo-limite de 240 s com a máquina carregada; o limite subiu para 420 s e passou).
- Riscos: nada disto foi jogado por uma pessoa nem medido na máquina de referência; a cortina de pó depende de `gl_FragDepth` e o seu custo (4–9 amostras por pixel coberto) não foi medido fora do SwiftShader.
