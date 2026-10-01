# Trabalho para Claude Code — kit das pontes de M01

Produzir as duas pontes como **assets provisórios originais**, prontos para a engine carregar. M01 continua PLANEJADA. Este trabalho adianta a arte e a estrutura dos modelos; não implementa a missão.

## Branch e âmbito

Partir de `main` após a integração do PR #10, numa branch como `claude/m01-bridge-assets`. Ler `map-layout.json`, `MEASUREMENTS.md`, `SOURCE_CHECK.md`, `ASSETS.md` e `assets-m01.json`.

Alterar apenas novos ficheiros em `assets/models/production/m01/`, `assets/source/m01/`, `tools/m01-assets/` e um relatório `missions/m01-tczew/BRIDGE_ASSET_REPORT.md`. Se necessário, acrescentar créditos em `ASSET_CREDITS.md`, preservando as entradas existentes.

Não alterar `src/`, o build, dependências, workflows, `mission.json`, `map-layout.json` ou os horários. Scripts de produção e visualização ficam fora da engine. O PR #9 contém o loader Three.js; os modelos devem poder ser avaliados separadamente.

## Modelos e coordenadas

- Entregar `bridge_rail_1939.glb` e `bridge_road_1939.glb`, mais ficheiros de origem e script de exportação reproduzível.
- Unidade: metro; +Y para cima; comprimento em +X. Origem de ambos no referencial do mapa. Ferroviária no eixo Z=0; rodoviária em Z=40. Não aplicar novamente este deslocamento na importação.
- Ler `supportsX` do JSON. São posições medidas actualmente, com incerteza histórica explícita; não substituir silenciosamente por intervalos iguais. `spansM` são comprimentos históricos nominais, não uma segunda lista de posições.
- Nove vãos por ponte: seis originais e três da extensão de 1910–1912. Ferroviária com via dupla e vãos lenticulares; rodoviária com treliça Lentze, torres e portais. Excluir o apoio ferroviário pós-guerra `postwarSupportsX`.
- Gerar comprimentos por parâmetros, sem esticar a ponte inteira para esconder diferenças. Medir a caixa envolvente e cada apoio após importar. Registar diferenças entre medidas modernas e comprimentos documentados.
- Identificar detalhes provisórios. A presença/aparência do antigo portal leste ainda depende de P13; não escrever que a reconstrução artística foi historicamente aprovada.

## Peças para destruição

Nomes estáveis nos nós glTF:

| Peça | Ferroviária | Rodoviária |
| --- | --- | --- |
| Raiz | `rail_bridge` | `road_bridge` |
| Vãos | `rail_span_01`…`rail_span_09` | `road_span_01`…`road_span_09` |
| Apoios, incluindo encontros | `rail_support_00`…`rail_support_09` | `road_support_00`…`road_support_09` |
| Portal oeste | `rail_portal_west` | `road_portal_west` |
| Antigo portal leste, provisório | `rail_portal_old_east` | `road_portal_old_east` |
| Torres, lado norte/sul | — | `road_tower_01_n`…`road_tower_05_s` |

Manter separáveis os apoios 00, 01 e 06, os vãos adjacentes e os portais. Entregar escombros separados com pivôs documentados e um manifesto JSON ligando as peças aos IDs do mapa. A engine decidirá quando ocultar, animar ou substituir peças; não colocar lógica de detonação nos assets.

## Orçamento e materiais

Seguir os limites de `assets-m01.json`: até 25 mil triângulos por vão ferroviário, 30 mil por vão rodoviário e 12 mil por par de torres no LOD0. Produzir três LODs e registar totais por ponte, chamadas estimadas e tamanho dos ficheiros. Reutilizar materiais e geometrias quando forem iguais. A ponte completa não deve carregar todas as peças em LOD0 a um quilómetro de distância.

Texturas originais ou com licença de redistribuição verificada. Fotografias dos arquivos servem de referência e não entram como texturas. Sem conteúdo de outros jogos, licenças NC/ND ou modelos de lojas que proíbam colocar o ficheiro no repositório público.

## Verificação e entrega

1. Importar os GLB num visualizador real e conferir materiais, normais, escala e eixos; não aceitar somente o script terminar sem erro.
2. Validar nomes, nove vãos, apoios e exclusão do apoio pós-guerra contra o JSON do mapa. Um verificador deve rejeitar escala errada ou peças em falta.
3. Produzir capturas do conjunto, do portal oeste, da treliça e da região do apoio 06; demonstrar os três LODs e a separação dos escombros.
4. Entregar relatório com referências por detalhe, incertezas, dimensões medidas, polígonos, ficheiros, autor/licença e comandos para reproduzir a exportação e a verificação.
5. Abrir PR para `main`, indicando que os modelos são provisórios e ainda não foram jogados em M01. Não fazer merge automaticamente.

Se algum modelo ou textura não puder ser produzido ou licenciado, registar a falta e entregar o que foi realmente verificado. Não substituir a entrega por uma lista de candidatos.
