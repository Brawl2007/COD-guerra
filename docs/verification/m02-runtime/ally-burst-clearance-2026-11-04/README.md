# M02 — segurança das rajadas aliadas

Código verificado: `5140dd131c2f8dceee8a205f15624bcc3c89ac68`. Cada ronda pendente de uma rajada aliada volta a consultar a regra de linha de tiro existente, no momento em que seria disparada. Se o jogador ou outro aliado vivo estiver no caminho, interrompe a rajada sem gastar munição nem emitir um tiro. Uma passagem momentânea antes da próxima ronda não a cancela antecipadamente.

Os [182 testes M02](node-m02.txt) e a [build](build.txt) passaram. Os testes incluem o jogador e outro aliado a entrar na linha, a continuação desobstruída e o restauro determinístico de um checkpoint. A regra reutilizada é uma faixa horizontal aproximada: não considera altura, silhueta precisa ou cobertura entre os atores. Não acrescenta dano de fogo amigo nem altera as rajadas alemãs.

A [passagem automatizada](native/report.json) usou a build congelada, teclado e rato do jogo e um piloto que consulta posições e geometria internas. Chegou ao debrief e ao pacote M03 com zero mortes do jogador e zero erros de página, giz C04, água e munições, Lis evacuado, Małek abatido, Wierzba apto e **11/12** sobreviventes no último grupo. Confirmou sete ordens e quatro aliados a reagir à granada. A [captura do debrief](native/debrief.png) é da execução, em Chromium/SwiftShader; não é um playtest humano nem uma avaliação visual ou de áudio da missão. A diferença de sobreviventes em relação à passagem anterior não foi isolada causalmente.

A M02 continua em desenvolvimento: persistem limitações visuais, de animação, IA e áudio, sem vozes narrativas gravadas. O complemento integral do PROMPT MESTRE continua indisponível.
