# M01 — encaixe dos vagões do pátio oeste

Base fixa: `beec7cd9333cfac38fdc361da481ad4a942e1e37`  
Branch independente: `codex/m01-yard-wagon-fit`  
Estado da missão: **PROTÓTIPO JOGÁVEL**.

Esta tarefa não liga nenhum vagão ao renderer nem à simulação. Só mede os GLB reais, compara-os com `freight_wagons_west`, `cv_wagon_1/2` e o terreno/collision contract actual, e deixa verificador/testes para uma integração futura.

## Resultado

O encaixe **horizontal** é determinável sem inventar dados:

- raiz de cada GLB: origem no topo do carril, centro da via e meio do vagão;
- eixo longitudinal local: Z; broadside local: X;
- `cv_wagon_1` e `cv_wagon_2` estão exactamente em `(+2, 0, +3)` relativamente aos dois primeiros pontos do pátio e têm normal `[1,0,0]`;
- portanto `rotation.y = 0` mantém a normal de cobertura no lado +X do vagão e o deslocamento +3 m ao longo do corpo;
- escala segura: `[1,1,1]`; não há motivo para esticar os modelos.

A integração visual completa **não está pronta** porque a cota vertical do mapa não tem suporte compatível com o terreno actual. Os pontos autorados usam `y=0`, que corresponde correctamente ao pivot “topo do carril” dos assets, mas:

- vagão 1 cruza a encosta do aterro: os quatro contactos de roda, usando bitola 1,435 m e entre-eixos 4 m, encontram terreno entre `0` e `-1.1528 m`; uma caixa rígida teria até **1,1528 m** de diferença de apoio;
- vagões 2 e 3 têm terreno plano em `y=-3`, portanto a raiz autorada em `y=0` fica **3,0 m** acima do terreno;
- baixar os três para o terreno por inferência também não é seguro: no primeiro seria necessário inclinar o vagão numa rampa ferroviariamente implausível e isso abandonaria a cota explícita do mapa.

Conclusão: **X/Z, yaw e escala estão prontos; Y está bloqueado** até existir uma decisão autoritativa sobre o desvio/apoio ferroviário do pátio. Não se deve compensar isso com scale, pitch ou offsets arbitrários.

## Medições dos GLB reais

Foram lidos os chunks JSON dos **18 GLB** dos dois kits: 6 intactos + 12 queimados/danificados. As caixas abaixo vêm dos accessors POSITION dos ficheiros reais, acumulando a tradução dos nós.

| LOD0 | min (m) | max (m) | tamanho (m) |
| --- | --- | --- | --- |
| intacto coberto | `[-1.590,-0.035,-4.550]` | `[1.590,3.850,4.550]` | `[3.180,3.885,9.100]` |
| intacto aberto | `[-1.500,-0.035,-4.550]` | `[1.500,2.840,4.550]` | `[3.000,2.875,9.100]` |
| queimado coberto | `[-1.590,-0.035,-4.550]` | `[1.601972,3.711058,4.550]` | `[3.191972,3.746058,9.100]` |
| danificado coberto | `[-1.590,-0.035,-4.550]` | `[1.956476,3.850,4.550]` | `[3.546476,3.885,9.100]` |
| queimado aberto | `[-1.569987,-0.035,-4.550]` | `[1.603654,2.840,4.550]` | `[3.173642,2.875,9.100]` |
| danificado aberto | `[-1.500,-0.035,-4.550]` | `[1.974492,2.841397,4.550]` | `[3.474492,2.876397,9.100]` |

Todos preservam os pivôs dos rodados: `wheelset_1=[0,0.5,-2]`, `wheelset_2=[0,0.5,2]`. No LOD0 a geometria da roda chega aproximadamente de `y=-0.035` a `1.035`; a pequena extensão abaixo de zero é a geometria de flange. O contrato do asset continua sendo **raiz em y=0 = topo do carril**, não “bbox mínima no chão”. LOD1/2 simplificados têm mínimo geométrico próximo de `+0.005724`, sem deslocar a raiz.

As variantes danificadas podem ultrapassar a caixa intacta em +X por porta/tábuas deformadas. Isso é apenas apresentação e **não pode virar collider**.

## Posição e cobertura

| posição | root autorado | yaw | escala | cover associado | terreno nos contactos | decisão |
| --- | --- | ---: | --- | --- | --- | --- |
| yard 1 | `[-320,0,-6]` | 0 | `[1,1,1]` | `cv_wagon_1`, delta `[2,0,3]` | `0, 0, -1.1528, -1.1045` | vertical bloqueada |
| yard 2 | `[-340,0,8]` | 0 | `[1,1,1]` | `cv_wagon_2`, delta `[2,0,3]` | `-3,-3,-3,-3` | vertical bloqueada, gap 3 m |
| yard 3 | `[-352,0,8]` | 0 | `[1,1,1]` | nenhum | `-3,-3,-3,-3` | vertical bloqueada, gap 3 m |

A orientação zero também explica os cover nodes: no LOD0 coberto, o lado está a ~1,59 m da raiz, então o cover node a +2 m em X fica ~0,41 m para fora da lateral; o +3 m em Z continua dentro dos ±4,55 m de comprimento. O aberto deixa ~0,50 m. Com yaw ±90° essa relação broadside/normal deixa de fazer sentido.

## Colisão actual

`TczewWorld` mantém `cv_wagon_1/2` em `coverNodes`, mas exclui `VEHICLE` de `world.covers`; os IDs também não são adicionados a `world.obstacles`. Portanto esta tarefa não cria nem altera collider. Uma futura integração visual deve preservar exactamente isso até existir uma decisão separada de colisão.

O bbox do asset, especialmente das variantes danificadas, não é uma fonte válida para colisão.

## O que não foi decidido

- Não foi escolhido `covered` ou `open` para nenhum dos três pontos. O mapa não fornece esse dado.
- `station_wagon_fire` continua sem ID de vagão; nenhum dos três foi marcado como queimado/danificado.
- O trem 963 de 65 vagões não foi alterado nem reutilizado como pátio.
- Não foi criada via, plataforma, ballast, collider, terreno ou suporte visual para esconder a diferença vertical.

## Ferramenta e testes

`tools/verify-m01-yard-wagon-fit.mjs` lê os GLB reais sem Three.js, valida GLB2/chunk JSON, mede bbox/nós/rodados, lê os dados reais do mapa e usa `TczewWorld` para os contactos de terreno. O relatório separa `verificationOk` de `integrationReady`: detectar correctamente o bloqueio vertical é uma verificação válida, não uma falha do script.

`tests/m01-yard-wagon-fit.test.js` cobre 18 assets, pivôs/rodados, medidas LOD0, caixas de dano, yaw zero, offsets/normais de `cv_wagon_1/2`, ausência de colisão VEHICLE, os gaps verticais e a proibição de escolher tipo/estado/alvo.

Dados medidos em formato de máquina: `measurements.json`. A tabela de transforms e handoff ficam no mesmo directório.

## Proveniência lida

- `map-layout.json` blob `188c2857294d0aee368a5c94eea67bd6bd2b468a`
- `tczew-world.js` blob `82d7e6aacf453e69384c8acd647db74b868cdaa5`
- `m01-view.js` blob `06f4fafe32e135b033c9adfea7f1d83db86ee2c8`
- manifesto intacto blob `d724cdf572fc8fa1bf6f7766d27e81c85575ce22`
- manifesto de dano blob `4cbcc86cf6698a8454ac9dc68668aebf646366bc`

`src/render/m01-view.js` não contém `freight_wagons_west` nem `cv_wagon_1/2`; o único sistema de wagon actualmente ligado ali é o trem 963 por `m01-train-wagons.js`. Este trabalho não o modifica.
