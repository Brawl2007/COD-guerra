# C11 — confirmação da retirada antecipada

`da6bb8a` exige uma segunda pressão de `F` ou toque em **CONFIRMAR** antes de deixar pessoas para trás. A primeira ação não termina a missão; o aviso mantém o número por evacuar e o estado de Lis. A confirmação é apenas estado de interface: pausa, movimento, outras ações, mudança da contagem/segurança de Lis ou restauro de checkpoint anulam-na. Os saves e a lógica de campanha não ganharam campos de confirmação.

Passaram [205 testes M02](node-m02.txt), build e [dois testes browser](browser.txt). O navegador verificou teclado (incluindo cancelamento por movimento) e toque (incluindo pausa/retoma, segunda pressão, desfecho e debrief). A [captura](c11-withdrawal-confirmation.png) é uma fixture controlada em Chromium/SwiftShader, não teste em iPhone físico. A passagem integral com saída normal da build `70c6031` é anterior a este ajuste de interface; não houve novo percurso integral neste marco.
