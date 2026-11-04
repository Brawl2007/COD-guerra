# C11 — confirmação da retirada antecipada

`da6bb8a` exige uma segunda pressão de `F` ou toque em **CONFIRMAR** antes de deixar pessoas para trás. A primeira ação não termina a missão; o aviso mantém o número por evacuar e o estado de Lis. A confirmação é apenas estado de interface: pausa, movimento, outras ações, mudança da contagem/segurança de Lis ou restauro de checkpoint anulam-na. Os saves e a lógica de campanha não ganharam campos de confirmação.

Passaram [205 testes M02](node-m02.txt), build e [dois testes browser](browser.txt). O navegador verificou teclado (incluindo cancelamento por movimento) e toque (incluindo pausa/retoma, segunda pressão, desfecho e debrief). A [captura](c11-withdrawal-confirmation.png) é uma fixture controlada em Chromium/SwiftShader, não teste em iPhone físico. A passagem integral com saída normal da build `70c6031` é anterior a este ajuste de interface; não houve novo percurso integral neste marco.

## Passagem contínua com retirada antecipada

O piloto da build `6643816` percorreu as áreas A–C, usando teclado e rato em Chromium/SwiftShader, com granada, sete ordens, água ao ferido e giz. Após duas mortes em C:O06, retomou do checkpoint e completou C12: o [relatório](native-early/report.json) regista 12 homens por localizar, nenhum evacuado do último grupo e Lis desaparecido na transferência para a M03; água e ambos os abastecimentos foram preservados. Não houve erros de página. O [debrief](native-early/debrief.png) é uma captura autêntica; o piloto lê estado interno para planear e não substitui teste humano. A build e [206 testes M02](node-m02-6643816.txt) passaram.

A [primeira tentativa](native-first-attempt/report.json) chegou ao epílogo, mas o piloto expirou enquanto aguardava que o relógio da simulação avançasse depois de C12; a [captura](native-first-attempt/epilogue-at-timeout.png) mostra esse estado. `6643816` corrigiu a espera do próprio piloto para reconhecer a conclusão; não alterou o jogo nem mascarou essa falha inicial. Não há teste físico em iPhone.
