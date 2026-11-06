# Forno B04 — 2026-10-31

`5682170` dá ao forno do anexo B04 uma frente identificável, com portas para cozedura e fogo, molduras e puxadores, usando os materiais já existentes da M01. A peça mantém-se dentro do volume sólido já criado pela missão; as portas são visuais, não abrem e não criam passagem nem cobertura nova. A colisão, navegação, saves e roteiro não foram alterados.

[Antes](before-high.png) e [depois](after-high.png) são capturas High autênticas no navegador: a sessão foi pausada num cenário controlado e o bloco original foi reproduzido para comparação no mesmo local e ângulo. A [primeira iteração](initial-oven-after-high.png) tinha placas escuras e pouco definidas; a captura final acrescenta molduras e reduz as proporções das portas. A iluminação interior e os materiais ainda precisam de polimento: esta geometria provisória não é uma avaliação artística final.

[172 testes M02](node.log), [build](build.log) e [um caso browser](browser.log) passaram na versão de código `5682170`. O teste verifica a forma e a ausência de alterações no snapshot; não mede o desempenho nem substitui uma passagem humana. O último percurso contínuo foi executado no código de simulação `f20faf3`, antes desta alteração visual e da correção de interface `ee686e7`; o [relatório e limites](../grenade-preparation-2026-10-31/README.md) identificam essa versão.
