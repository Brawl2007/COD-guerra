# M02 — legendas e direção do dano

Código `8fc54ef`: o menu permite ligar/desligar legendas e indicação de dano. A legenda respeita a opção existente da simulação. O indicador usa a posição do tiro ou explosão que realmente atingiu Piotr, acompanha a direção relativa ao jogador e desaparece com o relógio da missão. Não marca tiros contra aliados ou impactos bloqueados, e não altera mira, dano ou RNG. O restauro limpa a apresentação transitória, inclusive no mesmo relógio.

As escolhas feitas antes de iniciar são aplicadas ao checkpoint inicial; reiniciar ou continuar recupera as opções gravadas. Com os valores originais, um teste compara o snapshot e os eventos iniciais com o arranque anterior, incluindo um único evento de checkpoint. A cartela de localização foi deslocada para fora da área central da mira, com formato compacto para ecrãs baixos.

112 testes M02 PASS ([node.txt](node.txt)), build PASS ([build.txt](build.txt)), quatro browser PASS ([browser.txt](browser.txt)). O navegador verificou opções desativadas antes do início, checkpoint, dano real, direção, desativação e restauro; também mediu a cartela em 480 × 270 e 1280 × 720. A [captura](damage-direction.png) é um cenário controlado e identificado, com projétil real; não é um percurso contínuo nem avaliação humana. O código de apresentação fotografado corresponde ao deste commit; o teste Node final foi acrescentado depois da captura.

O último percurso completo continua o da build `a65dfb0` em [ammo-recovery-2026-10-28](../ammo-recovery-2026-10-28/README.md). Não foi repetido para este ajuste de interface; o teste de equivalência cobre o estado inicial padrão, não substitui o percurso. A missão ainda precisa de desenvolvimento gráfico, animação, combate e som antes da avaliação humana.
