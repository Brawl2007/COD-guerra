# C04 — ajuda opcional

O roteiro Astra permite marcar o ferido, dar água ou seguir. `e2894a9` corrige o objetivo que ordenava marcar com giz, embora a mecânica já permitisse seguir: agora informa que ajudar é opcional. Após oferecer água, o indicador aponta para a saída, mantendo a marcação disponível. A lógica de vitória, o estado do ferido e os checkpoints não foram alterados.

Os [191 testes M02](node-m02.txt) passaram antes do ajuste final do indicador; depois desse ajuste passaram oito testes focados de escolha, água e piloto, build e o [teste browser](browser.txt). Os testes incluem seguir sem ferir ou marcar, e oferecer água sem tornar o giz obrigatório. A [captura](c04-before-water.png) é de uma fixture controlada com toque simulado em Chromium/SwiftShader; não é playtest humano nem teste em iPhone físico. A passagem integral `ed24ac6` é anterior a esta alteração de interface.
