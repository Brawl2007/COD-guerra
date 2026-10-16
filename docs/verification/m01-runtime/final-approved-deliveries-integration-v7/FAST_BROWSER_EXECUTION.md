# Tentativa local em paralelo — excluída da certificação

**INFRASTRUCTURE_INCOMPLETE.** A invocação iniciou-se em 2026-10-09 00:24:48 UTC, HEAD `0bbffba78cbe96da9a4de24449ab3ac9470ba0db`, com os mesmos 84 casos, sem filtros, dois workers entre ficheiros, ordem serial dentro de cada ficheiro, viewport 1280×720, renderer SwiftShader, orçamentos CI e zero retries. O inventário foi comparado em ordem com o original: 84 títulos/ficheiros/projectos/estados esperados idênticos, zero erros.

A sessão do executor ficou indisponível antes do relatório final. O log contém **19 casos PASS e nenhuma asserção FAIL reportada**; os restantes 65 não foram certificados. `write_stdin` devolveu `Unknown process id 11050`. Não existe JSON final do Playwright nem código de saída observado. Não há prova suficiente para atribuir a causa exata a OOM, timeout ou erro de M01. A observação de cgroup registou zero `oom`/`oom_kill`; não é uma medição do pico do processo perdido.

O [config experimental exato](https://github.com/Brawl2007/COD-guerra/blob/0bbffba78cbe96da9a4de24449ab3ac9470ba0db/tools/verification/m01-v7-browser-fast.config.mjs) mantinha as asserções e capturas explícitas/falhas, retirando somente snapshots DOM/filmstrip do trace. Foi retirado da árvore final para não apresentar uma alternativa incompleta como executor validado. `playwright.config.js` sempre permaneceu intacto. O CI integral independente 37862528016 continua com o executor original, um worker e trace completo.

`LOCAL_PARALLEL_ATTEMPT.json`, identidade, ambos os inventários comprimidos sem perdas e `logs/browser-local-parallel-incomplete.log` preservam a tentativa. Os seus 19 resultados **não são somados** ao CI nem aos focados. Chromium local 153.0.8010.0 difere do Chromium 145 do CI. Não é hardware Chromebook e não mede FPS.

Uma tentativa inicial do inventário encontrou um JSON omitido pelo sparse checkout; foi recuperado o ficheiro original versionado, sem alterar testes ou fixtures. Isso foi resolvido antes de iniciar esta execução e não é a causa demonstrada da perda da sessão.
