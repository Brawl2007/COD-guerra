# Transforms propostos — pátio oeste

Estes são os **transforms autorados horizontalmente** que preservam os pontos do mapa e o contrato dos GLB. Não são autorização para integrar enquanto a cota vertical continuar sem suporte.

| ID de trabalho | posição | rotation.y | scale | tipo | estado | cobertura |
| --- | --- | ---: | --- | --- | --- | --- |
| `yard_wagon_1` | `[-320,0,-6]` | `0` | `[1,1,1]` | não decidido | não decidido | `cv_wagon_1` |
| `yard_wagon_2` | `[-340,0,8]` | `0` | `[1,1,1]` | não decidido | não decidido | `cv_wagon_2` |
| `yard_wagon_3` | `[-352,0,8]` | `0` | `[1,1,1]` | não decidido | não decidido | — |

## Por que yaw = 0

O asset é longitudinal em Z. Nos dois pares já definidos pelo mapa:

- `cv_wagon_1 - freight[0] = [2,0,3]`
- `cv_wagon_2 - freight[1] = [2,0,3]`
- normal dos dois covers = `[1,0,0]`

Com yaw zero, +X continua sendo a lateral do vagão e +3 Z fica ao longo do corpo. Isso mantém o ponto de cover do lado +X, ligeiramente para fora da caixa, sem scale ou offset lateral artificial.

## Cota Y

A origem dos GLB é o topo do carril. Por isso a interpretação literal dos pontos do mapa é root Y=0. Porém o terreno actual não fornece esse apoio:

- yard 1: contactos das rodas em terreno `0,0,-1.1528,-1.1045`;
- yard 2: `-3,-3,-3,-3`;
- yard 3: `-3,-3,-3,-3`.

Não substituir Y=0 por `terrainHeightAt(center)`, não inclinar o vagão 1 e não acrescentar scale Y. A próxima integração precisa primeiro de um contrato explícito para a via/desvio do pátio ou de uma revisão autoritativa das cotas do mapa.
