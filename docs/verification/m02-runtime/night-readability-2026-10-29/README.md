# M02 — legibilidade noturna em Łęczyca

`7bc5819` ajusta a luz ambiente, a luz direcional e a exposição do preset noturno T1, preservando o céu noturno, o grau M01, a hora do roteiro, a visão da IA e a simulação. Os presets de dia são testados sem alteração.

- [Antes](before.png) e [depois](after.png): mesma cena controlada com a dupla da wz.28, Chromium/SwiftShader High, 1280 × 720. A primeira imagem é anterior ao ajuste; a segunda usa o preset noturno efetivo do jogo. Na região retangular que contém a dupla, a média de luminância dos pixels passou de 20,04 para 44,48/255; a região contém também fundo, não é uma medição de reconhecimento humano.
- [Interior B05 em Low](night-b05-low.png), cenário controlado; [teste de navegador](browser-low.txt) e [testes M02](node.txt) passaram. O céu e os interiores ainda necessitam de polimento e avaliação em hardware real; esta comparação não demonstra qualidade AAA nem substitui playtest humano.
