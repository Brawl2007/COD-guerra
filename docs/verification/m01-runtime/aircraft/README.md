# Ju 87 — integração em produção, verificação por trechos

Três clones do kit original do Claude substituem as silhuetas no primeiro raid. LOD nativo pela distância, limites por qualidade, materiais/geometria partilhados e mixers independentes. Hélice derivada do relógio, pausa/restauro determinísticos. SC 250 oculta porque a carga real não foi confirmada. Trajectórias, eventos, saves, dano e segundo raid preservados.

`first-raid.jpg` é uma conversão sem recorte/resize de captura real 1280×720. `capture.json` conserva o hash do PNG original e o método. A captura continua um snapshot genuíno alcançado pela simulação, olha por input relativo e pausa via pointer lock; não é uma nova partida contínua ou playtest humano.

Node 132/132; build passa, aviso de chunk grande permanece. Os dois casos novos de navegador passaram: raid visível/pausa e falha opcional com missão jogável. Uma regressão antiga esperava nove falhas totais; corrigida para nove falhas das pontes. A suíte de 24 foi interrompida antes do fim durante a passagem de contexto e ainda precisa de execução integral, incluindo esse caso corrigido. Ver `verification.json`.

Reprodução: `npm ci`, `npm test`, `npm run build`, `npm run test:browser` (Chromium opcional por `CHROME_EXECUTABLE`). Sem `workflow_dispatch`, merge em main ou publicação automática. M01 permanece PROTÓTIPO JOGÁVEL.
