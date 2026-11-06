# C04 — som do gesto de água

`8227c80` liga grãos sintetizados de tecido e equipamento da M01 ao evento real `c04-water-started`. Só toca enquanto a ação do mesmo ferido está ativa e o evento é recente; restaurar um checkpoint intermédio não emite novo início. A apresentação não altera a simulação. Não há som de líquido, fala gravada ou som comprovado de contacto físico.

Passaram [189 testes M02](node-m02.txt), build e o [teste browser](browser.txt). Em Chromium/SwiftShader o teste criou a ação na simulação, isolou a saída Web Audio e gravou [water-handling.webm](water-handling.webm); pico medido 0,0891, com um evento e sem mutação do snapshot. A gravação isolada prova saída audível nessa configuração, não que o som seja sempre percetível sob combate ou em Safari/iPhone. A passagem integral com água de `ed24ac6` é anterior a esta alteração sonora; nenhum percurso integral novo foi executado neste marco.
