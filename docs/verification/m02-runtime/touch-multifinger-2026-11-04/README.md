# M02 — feedback do joystick e toque simultâneo

`b253edb` acrescenta ao joystick uma marca que acompanha o dedo e regressa ao centro ao soltar, cancelar, pausar, rodar o ecrã ou perder foco; a indicação da recarga passa a dizer «RECARGA». A apresentação usa a mesma entrada tátil M01 e não altera a simulação ou saves.

Dois [testes browser](browser.txt) passaram em Chromium/SwiftShader: toque para movimento, olhar, disparo e pausa; e dois dedos para mover e olhar, depois manter e soltar a mira durante o movimento. O segundo verifica também que pausar limpa o movimento pendente. A [captura](two-finger-movement.png) é da execução simulada a 844 × 390, durante supressão no início da missão. Oito testes partilhados de toque/input e build passaram.

A primeira tentativa do teste de dois dedos foi interrompida e a seguinte falhou porque o teste indicava ao CDP o dedo que devia permanecer em vez do dedo libertado. Uma experiência isolada confirmou a semântica dos eventos; o teste foi corrigido e repetido, preservando as verificações. Não foi testado em iPhone/Safari físico, nem foi disponibilizado link público ou feito deploy.
