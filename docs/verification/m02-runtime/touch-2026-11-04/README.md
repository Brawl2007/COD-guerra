# Controlos táteis M02

Código `3ccfb05` adapta `TouchState` e o joystick existentes da M01 à sessão M02. Movimento analógico e corrida, olhar, mira mantida, disparo por toque, recarga, granada, interação, agachar, ordens e pausa usam os controlos da missão. Em modo tátil não é pedido pointer lock. A desativação limpa controlos pendentes; saves e simulação mantêm o mesmo formato.

A [captura](touch-landscape.png) e o [teste](browser-touch.txt) usam Chromium/SwiftShader, 844 × 390 e eventos táteis simulados por CDP: mover, olhar, disparar, pausar e retomar sem pointer lock. O [teste de desktop](browser-desktop.txt) também passou. Passaram 182 testes M02, oito testes de input/touch M01 e build. Não foi testado em Safari ou iPhone físico; desempenho, ergonomia, multitouch real, diferentes orientações e todas as interações da missão ainda precisam de verificação. O teste de unidade M01 cobre mapeamento de dedos independentes, mas não substitui o dispositivo real.

O servidor Vite deste ambiente está ligado a 127.0.0.1:5173 e não há encaminhamento público disponível nesta sessão. Não há URL de teste acessível ao iPhone nem foi feito deploy. O próximo passo é usar uma pré-visualização acessível e testar em Safari num iPhone, sem promover a produção.
