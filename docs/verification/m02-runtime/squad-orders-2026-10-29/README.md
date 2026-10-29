# M02 — ordens da secção na quinta

`899a8f5` torna efetivas as ordens já expostas no menu. `Z` mantém a fase de cobertura em que a ordem foi dada; os soldados continuam a deslocar-se fisicamente para os pontos já atribuídos e a disparar conforme perceção e munição. `X` escolhe o próximo ponto da rota, ainda através do navegador/colisão existente. `B` conserva a rota de flanco pelo pomar. A confirmação aparece brevemente no HUD e o menu identifica estas ordens como disponíveis na quinta. Não se implementou comando tático equivalente nas áreas B/C.

- [135 testes M02](node.txt), build e [teste browser final](browser-final.txt) passaram. O browser enviou `Z`, `X` e `B` normalmente e verificou os destinos reais; [captura](squad-order-advance.png) é uma cena controlada. O teste de simulação verifica posição física e restauro da ordem.
- [Comparação automática](auto-compare.txt): 800 passos com o elenco inimigo presente e outros 800 sem ele, comparando snapshots e eventos de `updatePolishSquad` com o código anterior `c1b8ec9` no modo automático. É uma comparação dirigida de secção, não uma partida integral.
- A [primeira tentativa do percurso com teclas](native-first/report.json) falhou na verificação de `Z`: o piloto podia observar um frame anterior à tecla e verificar o resultado antes do próximo tick. Não é um percurso aprovado nem prova isolada de falha do jogo. `0068321` corrige o piloto para aguardar a mudança real de `squadOrder` antes de confirmar; não injeta estado nem reduz as asserções.

As ordens não substituem a IA tática completa: ainda não há cobertura coordenada por geometria para todas as situações nem comandos de secção nas áreas B/C.
