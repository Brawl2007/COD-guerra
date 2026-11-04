# VII-a — pacote visual 1 (relevo, terra, orla de árvores, destroço, legibilidade, chão) — 2026-11-03

Ramo local `pkg1-visual` (de `b41d947d`, linha da candidata #80 + handoff do Captain). **Não publicado**, sem revisão crítica independente, **sem playtest humano**. Só apresentação (`src/render/*`): `src/game/*`, `src/world/*` e `missions/*` não mudam (`git diff b41d947d -- src/game src/world missions` vazio). O interruptor `acts.json enabled` continua `false`; só se vê com `?act=vii-a` / `?acts=1`.

## O que mudou

| Pedido | Como ficou | Ficheiro |
|---|---|---|
| 1. Relevo | O terreno desenhado **é** o da simulação (−3 m, deslocamento 0) no retângulo jogável + 6 m: aí pessoas, olho do jogador e tiros já estão no chão certo. Fora dele um deslocamento só visual cresce em 70 m: subida suave até ~1,7 m junto às árvores (norte) e ondulação ≤ 0,75 m nos outros lados; nunca negativo (a malha do campo assenta sobre o terreno já submetido, por amostragem), 0 na borda da malha. Regra, constantes e teste em `m01-area-field.js`. Sulcos, rodados e desgaste na faixa combatida são **só cor e sombreado** (nenhuma geometria ±cm). A paisagem distante assenta no mesmo chão desenhado (`surfaceY` + deslocamento). | `m01-area-field.js`, `m01-view.js` |
| 2. Montes e parapeito | Montes (49 coberturas alemãs): monte irregular instanciado, pegada da caixa × 1,1, cume = topo da caixa (nenhum vértice acima), torrões à volta (instanciados). Parapeito: berma contínua com cume exatamente no topo da caixa (1,15 m), face norte rente à caixa (onde ficam os sacos do kit T12), talude sul 0,3 m além da face, sela até à frente baixa do ninho (0,55 m). Uma só `earth` com grão em espaço-mundo + bump. As caixas simples desses obstáculos deixam de ser desenhadas (`dressing.replaces(id)`); os obstáculos da simulação não mudam. | `m01-area-earthworks.js`, `m01-area-dressing.js` |
| 3. Orla de árvores | 64 árvores numa só geometria: pinheiros (tronco alto torto + 3 massas) e folhosas (tronco curto + 5–6 massas de verdes diferentes), alturas 6,5–17 m, 2–4 arbustos/mato seco ao pé, sem sombra projetada. O escalão de qualidade desenha um prefixo de árvores inteiras (Low 55 %, Medium 80 %, High 100 %). Sem assets externos. As regras do envelope protegido da paisagem distante não foram tocadas (arranque sem o erro «Far bodies intersects…»). | `m01-area-trees.js` |
| 4. Destroço | Casco genérico dentro das duas caixas (flancos quase verticais, convés inclinado, frente/trás inclinadas, casamata baixa **sem torre, canhão, rodas nem lagartas**, escotilha aberta, rombo, chapa solta), ferrugem e fuligem por vértice. **Coluna de fumo visível:** o fumo já existia (`np_wreck_fire`), mas `m01-atmosphere` apagava-o aos 240 s de idade e o destroço arde «desde −420 s»; registos com `wreck` já não se apagam (uma linha). | `m01-area-wreck.js`, `m01-atmosphere.js` |
| 5. Legibilidade dos alemães | (a) Campo claro de restolho (palha) por trás da farda feldgrau; (b) com a área ativa o material dos corpos alemães sobe ×1,32 em valor (`color` do material, sem shader novo, sem estado por ator; o ato atual fica a ×1); o rim/fill existentes mantêm-se. Nada toca visibilidade da simulação. | `m01-area-field.js`, `m01-soldier-variation.js` (`setLift`), `m01-characters.js` (`setAreaLegibility`) |
| 6. Chão | Shader próprio sem `sin()` de coordenadas grandes (a causa provável das faixas anteriores): manta de campos (células de 34 × ~118 m, num referencial rodado 12,6°, bordos deformados por ruído), cada um com o seu estado (restolho claro/dourado, lavrado, pastagem, tubérculos), balcas de erva entre campos, fiadas que seguem o referencial (só onde não fazem aliasing: `fwidth`), trilho com duas rodeiras (`np_track_south`), faixa pisada atrás do parapeito, grão de solo em dois escalas (um só em Low). | `m01-area-field.js` |
| Crateras | Discos de fuligem e bordos irregulares instanciados (2 draws em vez de 16). | `m01-area-dressing.js` |

## Comandos e resultados reais

| Comando | Resultado |
|---|---|
| `npm run build` | OK. |
| `node --test tests/m01-area-visual.test.js` (novo) | 6/6: relevo 0 na faixa combatida/≥0/≤1,7+0,75+0,03 m/0 na borda e crescente a norte; monte (cume ≤ topo da caixa, pegada ≤ 1,06); berma (cume ≤ topo, pé ≤ 0,35 m, sela do ninho); destroço (assenta, cabe nas caixas + escotilha/destroços, sem nomes de modelo nos fontes); árvores (determinísticas, variadas, prefixo por escalão); torrões/bordos e guardas de texto. |
| 56 ficheiros de teste que leem os fontes tocados (`m01-act-vii-a`, `m01-acts`, `m01-terrain-*`, `m01-atmosphere-runtime`, `m01-soldier-visual-variation`, `m01-actor-legibility`, `m01-animation-resolver*`, `m01-far-landscape`, `m01-render-*`, `m01-material-authority`, `m01-props-runtime`, `m01-lod-*`, `m01-ckm-*`, `m01-aircraft*`, `m01-water`, …) em 2 lotes de `node --test` | **547/547** (221 + 326, incluindo os 6 do ficheiro novo), 0 falhas. A suite completa (`npm test`) **não** foi corrida. |
| `CHROME_EXECUTABLE=/opt/pw-browsers/chromium npx playwright test tests/browser/m01-act-vii-a.spec.js` | **3/3** (0 erros de página). Reescreve os PNG de `acts-inc1-2026-10-25/`: repostos com `git checkout`; esses PNG continuam a ser a evidência «antes». |
| `npx playwright test tests/browser/m01-act-vii-a-visual.spec.js` (novo; High e Low) | 2/2: capturas 1280 × 720 (`deviceScaleFactor` 1) das mesmas quatro vistas + `renderer.info` por vista. `VIS_OUT`, `VIS_TAG`, `VIS_TIERS`, `VIS_SCENES` ajustam a saída. |

## Desenhos e triângulos (`gameDiagnostics()`, `?debug=1`, SwiftShader — **não é FPS**)

Mesmas quatro vistas, mesmo save (semente 19390901), menor de 8 fotogramas lidos por vista. «Antes» = `b41d947d` construído à parte com o mesmo spec.

| Vista | High antes → depois: draws | High: triângulos | Low antes → depois: draws | Low: triângulos |
|---|---|---|---|---|
| 02 chegada | 284 → 142 | 448 254 → 506 240 | 215 → 74 | 203 153 → 232 134 |
| 04 linha, meio da vaga | 274 → 132 (*) | 541 988 → 613 210 (*) | 211 → 71 | 203 164 → 236 304 |
| 05 oeste | 197 → 158 | 543 990 → 617 706 | 131 → 95 | 203 460 → 239 252 |
| 05b destroço | 248 → 136 | 541 340 → 613 550 | 184 → 73 | 202 436 → 236 562 |

- A decoração da área (`gameDiagnostics().m01.areaDressing`): **9 draws** (campo, montes, berma, torrões, discos e bordos das crateras, fuligem do destroço, casco, árvores) e **56 584 triângulos em High / 38 334 em Low** (árvores 64 → 35, torrões 476 → 214). Antes eram ~150 draws (2 malhas por árvore, por cratera e por caixa do destroço; estimativa pelo código) e ~3 mil triângulos (estimativa).
- **Os triângulos sobem** (+58 a +75 mil em High, +29 a +37 mil em Low), ~12 % da cena; não medido na máquina de referência (Intel HD 5500). Os draws descem ~140. As árvores (23 mil em High) não projetam sombra; montes e berma sim.
- (*) A primeira corrida do «depois» leu 575 / 1 182 615 nesta vista (exatamente o dobro de uma passagem: já tinha acontecido ao «antes» em 05/05b numa corrida anterior, com mediana em vez de mínimo). É um fotograma lido entre duas passagens do `renderer.info`, não custo real; a repetição desta vista deu 132 / 613 210 (`metrics-high-mid-rerun.json`). `metrics-high.json` mantém a leitura duplicada tal como saiu.
- Memória: +1 geometria, texturas +0/+1 (mapa de solo 256² próprio em vez do 512² do material antigo).

## Capturas (vistas uma a uma; 1280 × 720; SwiftShader; sem sombras em Low)

- `02-arrival-{high,low}.png` — chegada: o chão é agora um campo (restolho claro à direita, lavrado/pastagem à esquerda, trilho com rodeiras ao centro, balca de erva), orla de árvores com copas diferentes e fumo do destroço no centro; Zieliński e Pawlak visíveis. Melhorou muito face às faixas uniformes. **Ainda provisório:** as fiadas ao perto são regulares como um relvado em Low; a célula verde da esquerda é demasiado escura/saturada.
- `04-line-north-midwave-{high,low}.png` — do parapeito: sacos sobre uma berma de terra (High mostra-os por inteiro), montes arredondados à frente (um tom mais escuro que a palha), arame, destroço com coluna de fumo, orla. **Alemães:** ver o corte `crop-04-germans-before-after-4x.png`: antes, caixas verde-oliva e nenhum alemão discernível; depois, dois a ~140 m (de pé) aparecem como marcas escuras verticais de 4–8 píxeis sobre o horizonte claro, e os montes ajudam a perceber de onde vêm. **Continuam muito pequenos:** a 120–195 m (distâncias do save: 119 a 194 m; o enunciado dizia 70–140 m, a rota passiva nunca os deixa passar de ~90 m) um homem tem 6–10 px; o ganho vem do contraste, não do tamanho. Não foi possível mostrar a subida ×1,32 isolada (não há captura «sem»).
- `05-line-west-ckm-{high,low}.png` — ao longo da linha: berma contínua com grão e sacos no cume (antes, uma parede de caixa verde com pixéis); a faixa pisada atrás é uma cor lisa em Low, com rachas finas em High. A cidade (paisagem distante) ao fundo à esquerda não mudou.
- `05b-wreck-aimed-{high,low}.png` + `crop-05b-wreck-before-after-4x.png` — destroço: forma de casco com convés inclinado e casamata, mais claro que a caixa negra de antes, **coluna de fumo visível** (antes quase invisível). A ~85 m ocupa ~60 px: lê-se «casco» mas a escotilha/rombo só se veem em corte.
- Não houve captura nova dos cartões (01, 06, 07, 08): não mudam.

## Riscos e o que não ficou

- **Triângulos +12 %** (árvores com 5–6 massas de 80 faces); medir na máquina de referência. Se pesar: `TREE_SHARE` e a geometria das copas (`m01-area-trees.js`).
- A malha do campo usa 3 000 raios (`surfaceHeightAt`) no arranque do VII-a: custo não medido em Chromebook (já havia reconstrução do relevo atrás do cartão).
- Visual ≠ simulação: a berma/os montes têm base até 0,3 m / 10 % além da caixa (um tiro que raspa a base pode parecer ficar fora); o fumo e a subida de 1,7 m a norte nunca bloqueiam nada na simulação. Subida visível só a > 70 m da faixa combatida.
- Árvores «de guarda-chuva» (massas achatadas) ainda se leem como estilizadas; o fumo mostra pontilhado (dither do sprite existente); a trilha é plana em Low.
- Os alemães só mudaram por contraste (campo + ×1,32): a 140 m continuam sendo pontos. Soluções reais (silhueta/impostor, tamanho de mira, ADS) são decisões de desenho, não deste pacote.
- Primeiro sync: se o primeiro mundo apresentado for já o da área, a paisagem distante assenta no terreno sem o deslocamento (≤ 5 cm a oeste): irrelevante aqui, anotado.
- Nada disto foi jogado por uma pessoa.
