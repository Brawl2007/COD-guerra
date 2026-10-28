# M02 — granada visível

Código `0df6974`: o projétil já simulado era invisível. A apresentação usa uma esfera de raio 7 cm, como a vista da M01, e o material existente da M02; acompanha a posição de cada granada real, remove-a ao explodir e reconcilia os IDs ao restaurar. Uma geometria é partilhada e não se alteram física, dano, RNG ou saves.

99 testes M02 PASS ([node.txt](node.txt)), build PASS ([build.txt](build.txt)) e três testes de navegador PASS ([browser.txt](browser.txt)). O teste usa o comando normal `G`, confirma uma granada visível na coordenada física e munição 2 → 1; um restauro do snapshot anterior repõe munição 2 e remove a vista. Também verifica a apresentação de uma baixa C11 e a entrada/pausa/checkpoint. A [captura real](grenade-in-flight.png) mostra o projétil em voo: jogo pausado, menu oculto e cenário identificado. Não é percurso contínuo.

O último percurso completo é o da build `1eb75f1`, anterior a este commit, documentado em [evac-combat-2026-10-28](../evac-combat-2026-10-28/README.md). A simulação não mudou nesta etapa; não se declara uma nova passagem completa. O lançamento ainda não tem animação de mão dedicada, e esta esfera partilhada é uma representação simples, não um modelo final detalhado.
