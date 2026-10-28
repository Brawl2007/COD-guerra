# M02 — revisão de qualidade após avaliação do proprietário

2026-10-28, mesma candidata `codex/m02-recovery-v1`, base `4aab5bb`. Trabalho reaberto por rejeição visual; não declarar a missão aprovada.

`before/` é a apresentação anterior, `lighting/` a F1 com volumes de sombra a seguir o observador, cascatas/modelo de luz/grade/AO M01 e contacto sob os atores. Mesmas fixtures, posição, relógio e resolução; `report.json` identifica fontes/árvore suja. Capturas reais de Chromium/SwiftShader, High, 1280 × 720, explicitamente rotuladas como inspeções controladas. Não são playtest contínuo ou benchmark de GPU.

F1: 81 testes M02 PASS e build PASS, logs nesta pasta. A prova unitária atravessa as áreas A/B/C, exige alvo de sombra no jogador, distância da luz e intensidade total corretas, postprocess em High/libertação em Low e snapshot/RNG/eventos idênticos. M01 não alterada; a adaptação reutiliza os seus componentes. As fotografias mantêm o terreno vazio visível: este defeito não foi declarado resolvido pela iluminação.

Próxima implementação em curso: efeitos causais por ronda e composição da paisagem. Provas de F1 não validam alterações posteriores. Sem main, deploy ou force-push.
