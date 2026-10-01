# M01 — relatório dos assets provisórios das pontes

Estado: **PROVISÓRIO VERIFICADO PARA INTEGRAÇÃO**. M01 continua **PLANEJADA** e não foi jogada. A verificação refere-se a um visualizador Three.js independente da engine.

Esta entrega continua os modelos e o gerador do Claude Code, branch `claude/m01-bridge-models`, commit `fdbb1860df31ce2b2a31a8ff09bfb4dbc4c74229`. Codex completou o LOD2, os estados destruídos em todos os LODs, os IDs/pivôs, a colocação no mapa e a verificação. Os nomes dos ficheiros e os diretórios originais foram conservados em `assets/models/provisional/m01/` e `tools/assets/m01-bridges/`, apesar dos nomes sugeridos em `CLAUDE_BRIDGE_TASK.md`. As criações continuam provisórias, sem aprovação artística/histórica final.

A branch incorpora o `main` revisto após PR #10. Em relação a esse `main`, esta entrega não altera `src/` da engine, `mission.json`, `map-layout.json`, horários, dependências ou workflows da raiz. As dependências isoladas do gerador já pertenciam à entrega do Claude.

## Entrega e contagens

São 12 GLB: duas pontes e portal comum de Lisewo, cada um com LOD0/1/2 e colisores separados. O manifesto conserva contagens por peça, eventos, pivôs, referências ao mapa e o hash da entrada (`50b8e90a69804bff`). Os ficheiros de origem são o código do gerador; não existe ficheiro Blender.

| Ficheiro | LOD | Triângulos intactos | Todos os estados | Únicos | Chamadas intactas¹ | KiB |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `bridge_rail_1891_1912.glb` | 0 | 22184 | 32624 | 23564 | 43 | 1610.4 |
| `bridge_rail_1891_1912.colliders.glb` | colliders | 0 | 432 | 432 | — | 62.6 |
| `bridge_rail_1891_1912.lod1.glb` | 1 | 12400 | 18244 | 13084 | 41 | 913.3 |
| `bridge_rail_1891_1912.lod2.glb` | 2 | 4392 | 6156 | 4620 | 41 | 344.8 |
| `bridge_road_lentze_1857_1912.glb` | 0 | 43156 | 62728 | 45160 | 74 | 3019.8 |
| `bridge_road_lentze_1857_1912.colliders.glb` | colliders | 0 | 552 | 552 | — | 80.2 |
| `bridge_road_lentze_1857_1912.lod1.glb` | 1 | 8668 | 12040 | 9664 | 52 | 639.3 |
| `bridge_road_lentze_1857_1912.lod2.glb` | 2 | 3844 | 4888 | 4168 | 52 | 297.4 |
| `portal_lisewo_1912.glb` | 0 | 1996 | 1996 | 1996 | 7 | 112.1 |
| `portal_lisewo_1912.colliders.glb` | colliders | 0 | 12 | 12 | — | 2.5 |
| `portal_lisewo_1912.lod1.glb` | 1 | 764 | 764 | 764 | 6 | 40.0 |
| `portal_lisewo_1912.lod2.glb` | 2 | 524 | 524 | 524 | 6 | 31.1 |

¹ Estimativa por primitivas/material no asset intacto, numa passagem, sem sombras. Não é uma medição de FPS. O visualizador regista também `renderer.info.render`, incluindo terreno e passagem de sombras, em [review-results.json](../../docs/assets/m01-bridges/review-results.json).

“Todos os estados” inclui peças intactas e substitutas; o adaptador escolhe a visibilidade. “Únicos” conta malhas compartilhadas uma vez. Vãos caídos reutilizam a malha intacta com outra transformação. Materiais PBR de cores lisas são reutilizados; não há texturas. Limites de `assets-m01.json` verificados: ≤25 000 triângulos/vão ferroviário, ≤30 000/vão rodoviário e ≤12 000/par de torres no LOD0. Os testes também rejeitam ficheiros >6 MiB e LODs que não diminuem a geometria intacta.

O manifesto propõe LOD1 a 400 m e LOD2 a 800 m. Esses limiares precisam de avaliação visual/performance na engine. O visualizador permite trocar o conjunto inteiro para comparar; a integração futura deve escolher LOD por peça/distância para evitar carregar todos os vãos em LOD0 a um quilómetro.

## Dimensões importadas

Medições obtidas após `GLTFLoader` importar os GLB no Chromium 153.0.8010.0, usando a caixa envolvente das malhas visíveis e `matrixWorld`. Eixos: X leste, Y altura, Z sul. Importar com transformação identidade: os deslocamentos `[0,0,0]`, `[0,0,40]` e `[1049.2,0,20]` já estão aplicados à raiz. Não aplicar `placement.translation` outra vez.

| Modelo intacto, LOD0 | Mínimo XYZ (m) | Máximo XYZ (m) | Dimensões XYZ (m) |
| --- | --- | --- | --- |
| `rail_bridge` | -20.10, -16.00, -14.50 | 1067.20, 15.00, 12.25 | 1087.30, 31.00, 26.75 |
| `road_bridge` | -22.00, -16.00, 24.00 | 1067.10, 21.80, 54.00 | 1089.10, 37.80, 30.00 |
| `lisewo_portal` | 1058.45, -1.00, -11.75 | 1067.75, 21.00, 51.75 | 9.30, 22.00, 63.50 |

Os apoios 00–09 usam `supportsX` e foram medidos novamente em coordenadas globais nos três LODs. O apoio ferroviário pós-guerra de x=727,6 foi excluído. O comprimento entre os apoios extremos é 1049,2 m na ferroviária e 1049,1 m na rodoviária. As caixas acima incluem os encontros, as torres e os talha-mares; não representam o mesmo intervalo do comprimento histórico aproximado de 1030–1037 m. A aceitação histórica final de ±2% permanece pendente.

As dez torres separadas mantêm 23 m de altura em todos os LODs, raio nominal 2,65 m, com base e cornija mais largas. Os portais oeste mantêm 16 m (ferroviário) e 18 m (rodoviário) de altura. A sua planta continua artística: o modelo mede 5,90 × 24,50 m e 6,70 × 20,90 m (X×Z), diferente dos footprints aproximados do mapa. Não alterar silenciosamente o mapa nem chamar esses portais reconstruções exatas.

## Contrato de peças e estado

| Peça | IDs nos três LODs |
| --- | --- |
| Raízes | `rail_bridge`, `road_bridge` |
| Vãos | `rail_span_01`…`rail_span_09`; `road_span_01`…`road_span_09` |
| Apoios/encontros | `rail_support_00`…`rail_support_09`; `road_support_00`…`road_support_09` |
| Portais | `rail/road_portal_west`, `rail/road_portal_old_east` (prefixos alternativos) |
| Torres individuais | `road_tower_01_n`…`road_tower_05_s` |
| Substitutas | IDs da peça com sufixo `_rubble`, `_collapsed` ou `_damaged` |

Os vãos têm origem local no apoio oeste da malha; apoios e escombros nos eixos correspondentes; portais oeste em x=−4; torres na posição individual do mapa, y=−1,2. `extras.m01.pivot` e o manifesto documentam a translação local. Os colisores são caixas em coordenadas locais da ponte, com `of` apontando à peça e pivô documentado; não são malhas de animação.

| ID de evento | Peças ligadas nas duas pontes |
| --- | --- |
| `evt_m01_east_demolition` | apoio 06, portal antigo leste, vãos 06 e 07 |
| `evt_m01_west_demolition` | apoios 00 e 01, vãos 01 e 02; na rodoviária também torres 01 norte/sul |

As torres foram separadas dos pilares para que os danos possam ser revistos sem reconstruir o asset inteiro. A perda das torres 01 e as poses de queda são **GAMEPLAY_PLACEHOLDER**. P13 permanece parcial: não há confirmação primária dos números de pilar e da presença exata do portal antigo em 1939.

**glTF extras não aplicam visibilidade.** O consumidor deve chamar `applyBridgeState(root, consumedEventIds)`, de `tools/assets/m01-bridges/src/state.mjs`, antes de mostrar cada GLB carregado, após trocar LOD e após restaurar dados. Sem esse passo, um visualizador genérico pode mostrar simultaneamente intactos e escombros. A função só projeta IDs de eventos já decididos pela simulação: oculta peças intactas, mostra substitutas e marca `userData.colliderEnabled=false` nos colisores afectados. A engine deve excluir esses colisores das consultas. Não existe física de escombros ou nova colisão para as peças caídas.

O save contém apenas IDs consumidos. A demolição oeste usa a cronologia de `mission.json` (atualmente 06:45) e mantém a leste já consumida; assets não decidem relógio, segurança do jogador ou detonação.

## Referências e limites históricos

Os IDs remetem a [SOURCES.md](../../research/SOURCES.md), [SOURCE_CHECK.md](SOURCE_CHECK.md) e [MEASUREMENTS.md](MEASUREMENTS.md), onde o estado da consulta está registado. T04/T05/T07/T25 continuam referências secundárias/resumos do trabalho do Claude; a conformidade geométrica com esses dados não equivale a confirmação primária.

| Detalhe | Referência / condição |
| --- | --- |
| Treliça Lentze, 8,68 m, 6,43 m, torres 23 m/Ø5,3 m | T04; cotas aplicadas, passo da treliça e ornamentos artísticos |
| Via dupla e vãos lenticulares | T05; flechas 11/5 m, espaçamento 9,6 m e painéis supostos |
| Três vãos da extensão de 1910–1912 | T25; forma Pratt provisória, materiais e pilares incertos |
| Posições dos apoios/eixos | G01; medições modernas, possíveis trocas de vãos após a guerra |
| Terreno do visualizador | G01/G02; planos aproximados, não é terreno da missão |
| Portal comum e portões fechados | T07/T25; presença usada no plano, forma e posição fina incertas |
| Demolições | H01-PDF revisto fixa 06:10/06:45; números 06/01 e danos precisos ainda P13 |

Conflitos mantidos: vãos 06/07 da rodoviária medidos ~145,4/71,5 m contra 130,9/81,6 m nominais (`lengthConflict`); eixo rodoviário 40 m do mapa contra 38,8 m medidos; casamatas x=0…26 do mapa contra encontro rodoviário modelado x=−22…10. O interior das casamatas não está modelado. Portais, pintura, fundações, talha-mares, detalhes de 1939 e poses de queda exigem referências melhores. O anexo histórico foi consultado na revisão anterior, mas esta entrega não declara aprovação fotográfica dos modelos.

## Verificação efectuada

- `npm test`: **28/28** (7 testes de GLB/estado, mais os testes existentes de simulação/dados).
- Segunda exportação: 12 GLB e manifesto idênticos byte a byte.
- Importação WebGL real em Chromium 153.0.8010.0 com Three.js 0.186.1/GLTFLoader, SwiftShader.
- **17 capturas** do conjunto, cabeceira oeste, treliças/torres, apoio 06, Lisewo, três LODs e duas demolições nos três LODs.
- **9 combinações estado/LOD** e três retornos LOD0→1→2→0; IDs e visibilidade constantes, colisores removidos continuam inactivos.
- Recarga da página + restauração de JSON contendo apenas `consumedEventIds`, de LOD0 para LOD2: peças demolidas não reaparecem.
- Apoios globais, alturas de torres/portais, posições finitas, normais unitárias e contagens binárias/manifesto verificadas; **zero erros de página, consola ou pedidos**.

Evidência: [capturas e instruções](../../docs/assets/m01-bridges/README.md), [resultados completos](../../docs/assets/m01-bridges/review-results.json), `tests/m01-bridges-glb.test.js`. Esta revisão não mede FPS numa GPU real nem testa M01 na engine.

## Origem, licença e reprodução

Modelagem procedural original: Claude Code; continuação e verificação: Codex, para COD-guerra. Sem modelos, texturas ou fotografias de terceiros nos GLB. A licença das criações originais é a do repositório, ainda não escolhida pelo proprietário; não marcar CC0. Medições: **© OpenStreetMap contributors, via Overture Maps Foundation**, ODbL, conforme G01/MEASUREMENTS.md; alturas G02 (Copernicus DEM) conforme a atribuição nesse documento. Bibliotecas de desenvolvimento: Three.js 0.186.1 e glTF Transform 4.5.1 (MIT); não estão incorporadas nas malhas.

Ficheiros de origem: `tools/assets/m01-bridges/src/geom.mjs`, `bridges.mjs`, `write-glb.mjs`, `state.mjs`, `build.mjs` e `render/`. Ver comandos de reprodução em [README do gerador](../../docs/assets/m01-bridges/README.md). A regeneração usa os dados actuais do mapa e é determinística; as capturas e o resultado da revisão têm data/ambiente próprios.
