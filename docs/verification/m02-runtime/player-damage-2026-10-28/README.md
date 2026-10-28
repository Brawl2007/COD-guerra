# M02 — dano de Piotr

Em `508b8f8`, os rastos NPC passam a identificar o ator realmente atingido; o adaptador reproduz a reação visual e o som de ferimento da M01 apenas quando esse ator é Piotr. Dano de explosão usa o resultado de `affectedActors`; obstáculos e baixas de aliados não geram falso ferimento no jogador. A reação é reiniciada ao restaurar um snapshot, mesmo no mesmo instante. A simulação decide sempre o dano.

Em `dd8358b`, uma aterragem danosa deixa de ser ignorada quando não há input de movimento. O evento de aterragem aciona o som M01. O teste verifica dano real, um único evento e replay determinístico após restauro.

94 testes M02 PASS ([node.txt](node.txt)); build PASS e três casos browser PASS ([browser.txt](browser.txt)). No cenário controlado e pausado [antes](before-hit.png) / [depois](after-hit.png), uma bala real reduziu vida de 100 para 83 e produziu uma reação M01 e um evento sonoro; a apresentação não alterou o snapshot. O restauro devolveu vida 100 e removeu a reação. O menu foi ocultado na inspeção, e o cenário está identificado na captura. O teste também confirmou admissão da reação sonora crítica com o orçamento de vozes cheio; não prova que todas as vozes de combate são ouvidas.

Percurso contínuo da build `dd8358bf4f8bf59904f35a591f55c37b2e3d57fc`: C01–C12, debrief e M03, zero mortes e erros, vida 46, eixo pomar, giz, água e munições entregues, Lis evacuado, 12/12 e Małek incapacitado. [Registo e capturas](native/) do piloto: observa posições mesmo ocultas e envia controlos, sem escrever a simulação. Low/480 × 270, debrief 1280 × 720. Esta build é anterior à vulnerabilidade do último grupo: não atribuir a ela os resultados dessa alteração.
