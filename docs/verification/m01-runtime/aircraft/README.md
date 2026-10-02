# Ju 87 — integração em produção, verificação por trechos

Três clones do kit original do Claude substituem as silhuetas no primeiro raid. LOD nativo pela distância, limites por qualidade, materiais/geometria partilhados e mixers independentes. Hélice derivada do relógio, pausa/restauro determinísticos. SC 250 oculta porque a carga real não foi confirmada. Trajectórias, eventos, saves, dano e segundo raid preservados.

`first-raid.jpg` é uma conversão sem recorte/resize de captura real 1280×720. `capture.json` conserva o hash do PNG original e o método. A captura continua um snapshot genuíno alcançado pela simulação, olha por input relativo e pausa via pointer lock; não é uma nova partida contínua ou playtest humano.

Node 132/132; build passa, aviso de chunk grande permanece. A prova parcial original e a interrupção da suíte durante o handoff ficam preservadas em `verification.json`. **Em 2026-10-02, a execução integral do commit `f758daab8817adf5382a6623b8be43d42f2e4321` terminou com 24/24 navegador em 538,6 s**, zero retries/skips/instáveis/erros globais. Inclui raid visível/pausa, falha opcional, a regressão corrigida de nove falhas obrigatórias das pontes e a bancada francesa. Relatório bruto, casos e nova captura do raid em `../asset-review-2026-10-02/`; são testes/continuações de checkpoint, não playtest humano.

Reprodução: `npm ci`, `npm test`, `npm run build`, `npm run test:browser` (Chromium opcional por `CHROME_EXECUTABLE`). Sem `workflow_dispatch`, merge em main ou publicação automática. M01 permanece PROTÓTIPO JOGÁVEL.
