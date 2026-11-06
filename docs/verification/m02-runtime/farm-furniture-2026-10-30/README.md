# M02 — interiores B01

Código `0550d50`: a mesa, duas camas e fogão da casa B01 deixam de aparecer como quatro blocos genéricos. As peças usam materiais existentes da M01 e ficam dentro dos volumes físicos já definidos pelo roteiro. Não existia um asset M01 de mobiliário equivalente; estas formas são provisórias e continuam simples.

A simulação, navegação, posições e colisores não foram alterados. Em particular, o volume da mesa continua sólido até ao chão: não é possível passar ou disparar por baixo mesmo que a forma visual tenha espaço entre as pernas. Os detalhes são uma melhoria de leitura, não colisão detalhada ou arte final.

- [140 testes M02](node.log), [build](build.log.gz) e [três browser](browser.log) passaram. O teste Node mede os limites dos móveis e compara o snapshot; o browser verifica os objetos renderizados e a continuidade das ordens e passos.
- [Mesa em bloco](b01-table-block.png), [cozinha](b01-kitchen.png) e [quarto](b01-bedroom.png): Chromium/SwiftShader em High, cena controlada e identificada. A imagem do bloco é uma comparação controlada na build atual: o teste oculta temporariamente a mesa nova e desenha uma caixa com o material e as dimensões do colisor antigo; não é uma captura de outra build ou playtest humano.
- A [passagem integral congelada](native/report.json) da build `0550d50` confirmou sete ordens e concluiu C01–C12, epílogo e M03: zero mortes/erros, vida 50, giz, ambos os abastecimentos, Lis evacuado e 12/12. O piloto observa atores e geometria ocultos; não é avaliação humana. O perfil Low atingiu 20 vozes, com oito recusas globais, incluindo duas por limite da categoria `player`, e 28 substituições; o relatório não identifica quais sons foram recusados.
