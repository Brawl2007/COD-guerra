# M02 — Estado real de recuperação

Data: 2026-10-25. Estado: **BLOQUEADA A CONTINUAÇÃO DO CLAUDE API; bancada Gemini executável, missão não concluída**.

## Git e origem

- Checkout inicial limpo: branch `work`, HEAD `6697956f3c684f06a856ddc4c6501bbb053bd438` (merge M01 PR #76). Não continha M02.
- Consulta real a `git ls-remote --heads origin '*m02*' '*M02*'`: encontrada `gemini/m02-01-quinta`, HEAD `56e98cbf774d3b717f4f228ce5f66a7194f4d7a5`. Não encontradas `api/m02-soldados-visual-v1` nem `api/m02-conclusao-v1`. Isso não demonstra que não existam noutro computador.
- Base Gemini recuperada por fetch; commits M02 preservados: `bef32e8`, `41d990d`, `df47781`, `bca39bd`, `56e98cb`, sobre `3c8e576`.
- Branch local de recuperação: `codex/m02-recovery-v1`, criada diretamente sobre a base Gemini. Sem merge em main, push, deploy, reset ou alteração de código de jogo.
- `M02_EXECUTION_STATE.md` não existia; o documento anterior disponível é `M02_HANDOFF.md`. As suas alegações de missão completa e desempenho não foram aceites como evidência atual.
- Foi solicitado ao proprietário o patch, ficheiros ou branch do Claude API, ou confirmação de que só existe a base Gemini. Aguardando resposta; não iniciar adaptação duplicada de soldados/armas/áudio antes de recuperar essa entrega.

## Ambiente e validação executada

- Node `v24.19.0`, npm `11.9.0`, Chromium `/usr/bin/chromium`.
- Primeiro `npm ci` falhou porque o cache predefinido `/home/agent/.npm` não era gravável. Resolvido com `npm ci --cache /workspace/.npm-cache --no-audit --no-fund`: 21 pacotes instalados. Lockfile, verificações de integridade e TLS preservados.
- `node --test tests/m02*.test.js`: **32 PASS, 0 FAIL, 0 SKIP**. Log da instância: `/tmp/cod-guerra-m02-tests.log`.
- `npm run build`: **PASS**, aviso de bundle grande. É build da aplicação principal: `dist/m02-01.html` NÃO é gerado. Não valida distribuição de produção da M02.
- `CHROME_EXECUTABLE=/usr/bin/chromium M02_ARTIFACT_DIR=/tmp/cod-guerra-m02-baseline npx playwright test -c tools/m02/playwright-m02-01.config.js`: **1 FAIL**, na asserção final `consoleErrors === []`, após produzir as 16 capturas e telemetria. Um erro HTTP 404; inspeção CDP posterior identificou `/favicon.ico`. Não modificar/enfraquecer a asserção. Log: `/tmp/cod-guerra-m02-browser.log`.
- Arranque com `PORT=4173 node tools/m02/run-m02-01.mjs`: HTTP **200**, `window.m02Bench` presente, HUD do objetivo O01 e amostras de render verificadas no Chromium. Este servidor de desenvolvimento deve ser reiniciado em cada tarefa.
- Capturas inspecionadas: `/tmp/cod-guerra-m02-boot.png` e `/tmp/cod-guerra-m02-baseline/m02-05-area-c-lesmierz-sp03.png`. Mostram bancada, soldados geométricos, arma simplificada, edifícios e cenário pouco detalhados. Não constitui playtest integral.
- A telemetria final do spec injeta `renderFrame(0.016, 0.5)`: os 62,5 FPS e 0,5 ms de simulação desse trecho são valores derivados dos argumentos, NÃO medições reais de desempenho. Não reutilizar essas alegações.
- Suíte M01 integral e playtest contínuo C01–C12 não executados nesta recuperação.
- Logs/capturas em `/tmp` são evidência desta instância, não artefactos Git nem prova de restauração futura.

## Lacunas confirmadas na base recuperada

1. `src/render/m02-01-renderer.js` constrói soldados com caixas/esferas e arma com caixa/cilindro; ainda não integra modelos GLB, clips e apresentação M01. O renderer já importa a política LOD M01, mas isso não equivale a reutilizar a biblioteca de personagens.
2. `M02AudiovisualDirector` regista eventos espaciais; o controlador M02 não liga um motor de áudio audível. Testes dos registos não comprovam som no navegador.
3. Interface de bancada expõe teletransportes e saltos diretos de cenas. A suíte usa teletransportes, chamadas diretas e snapshots; não demonstra progressão C01–C12 por controlos normais.
4. Falta entrada M02 no build de produção; o runner Vite de desenvolvimento funciona.
5. Falta favicon explícito em `m02-01.html`; o pedido automático gera o 404 que reprova a suíte.

## Configuração reutilizável guardada

Rascunho do ambiente com `install_script` (npm ci e cache gravável) e `start_skill` (checkout existente, sem worktree por defeito, recuperação Git, arranque M02, prontidão e comandos de testes com Chromium e diretório novo de capturas). Guardado com sucesso; revisão/gravação nas definições e publicação pelo proprietário ainda pendentes. Nenhuma alegação de publicação ou validação numa tarefa nova.

## Próxima ação

Obter a entrega Claude ou confirmação de inexistência antes de programar a continuação. Comparar ancestralidade e diffs, preservar autoria e integrar só o que falta numa candidata única. Depois reutilizar sistemas M01 por adaptadores de apresentação sem alterar autoridade da simulação M02; validar soldados/animações, armas, áudio audível, cenário e percurso real C01–C12. Preservar checkpoints, saves, RNG e testes. Corrigir o favicon no contexto da entrega recuperada e repetir o browser com um diretório de artefactos novo. Resolver a entrada de build antes de declarar distribuição de M02 pronta.
