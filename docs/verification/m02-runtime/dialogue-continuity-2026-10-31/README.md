# Continuidade do diálogo — 31 de outubro de 2026

`9b4f034` volta a verificar o estado do emissor quando uma fala sai da fila: Lis desaparecido ou um soldado presente mas incapacitado já não recebem uma fala futura. Se Lis ou Wierzba deixarem de estar disponíveis enquanto a ordem `bz39_c03_01` espera, é usada a alternativa já prevista no roteiro. A fila continua para a próxima fala disponível; snapshots antigos continuam aceites. Os registos consumidos continuam a impedir repetição.

Uma primeira comparação revelou uma regressão: a fala de partida de Lis em C08 era suprimida após o diretor o separar da secção. `7c9ad85` preserva explicitamente essa fala quando Lis está vivo e parte para a ligação. O teste exercita a fila C08; a [comparação](parity.log) encontrou snapshots e eventos idênticos a `705776f` em 200 passos para cada um de C01, C02, B e C, sem cobrir todas as possibilidades de combate.

[180 testes M02](node.log), [build](build.log) e [um caso browser](browser.log) passaram na versão corrigida. A [captura](dialogue.png) mostra uma fixture controlada em que Lis é marcado ausente e Wierzba apresenta a sua fala; não é um percurso contínuo. Os testes verificam restauro determinístico e que uma alternativa dirigida a outros não autoriza um emissor incapacitado a falar. As falas continuam em texto, sem novas vozes gravadas.

A [passagem automatizada `7c9ad85`](native-7c/report.json) chegou à transição M03 sem mortes do jogador nem erros de página, com saúde 92, C04 e giz, água e munições, Lis evacuado e 12/12 no último grupo; Małek ficou abalado e Wierzba apto. Confirmou sete ordens e sete aliados a reagir à granada. O piloto lê atores e geometria ocultos e não substitui avaliação humana.
