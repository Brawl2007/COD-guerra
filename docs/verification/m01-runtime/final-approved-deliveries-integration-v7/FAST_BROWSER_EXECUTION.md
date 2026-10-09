# Execução integral local em paralelo — V7

Estado inicial: execução ainda não iniciada; não é um resultado PASS.

A alternativa usa o mesmo corpus integral de 84 casos, sem filtros, os mesmos testes e asserções, viewport 1280×720, renderer SwiftShader, orçamentos CI e zero retries. `playwright.config.js` continua intacto. A configuração adicional `tools/verification/m01-v7-browser-fast.config.mjs` altera somente:

- Dois workers entre ficheiros independentes; a ordem dentro de cada ficheiro continua serial (`fullyParallel:false`).
- Trace de falha com acções/fontes, sem snapshots DOM nem filmstrip por chamada. Todas as capturas explícitas dos testes e capturas automáticas em falhas continuam activas.
- Caminhos de teste e servidor relativos à raiz, para permitir a configuração adicional.

Os inventários standard e adicional foram carregados com sucesso e comparados em ordem: mesmos 84 títulos/ficheiros/projectos/estados esperados, zero erros e retries 0. Uma primeira tentativa local de inventário encontrou apenas um JSON omitido pelo sparse checkout; o ficheiro original versionado foi recuperado, sem alterar os testes ou fixtures.

O executor local tem quota de oito CPUs e limite de memória de 8 GiB. Não é hardware Chromebook e esta execução não mede FPS. Chromium local 153.0.8010.0 difere do Chromium 145 do CI. O CI integral 37862528016 continua independente; os seus resultados não serão misturados com a execução local para fabricar um total verde.

## Reprodução

Executar a partir da raiz da V7, com Node 24, dependências fixadas e Chromium instalado:

```sh
npm ci
npm run build
CI=1 PLAYWRIGHT_JSON_OUTPUT_FILE=/tmp/m01-v7-full.json SOLDIER_EVIDENCE_DIR=/tmp/m01-v7-soldiers AUDIO_EVIDENCE_DIR=/tmp/m01-v7-audio npx playwright test --config=tools/verification/m01-v7-browser-fast.config.mjs --reporter=list,json --output=/tmp/m01-v7-full-results
```

Para usar um Chromium já instalado, definir `CHROME_EXECUTABLE` com o caminho absoluto. O próprio Playwright inicia o preview de produção. Não iniciar outro servidor na porta 4173.

Aceitação: uma única invocação integral com 84 resultados esperados, 0 inesperados, 0 skips, 0 flaky, 0 erros globais e todos os índices de retry iguais a 0. Resultados focados e as duas execuções CI históricas vermelhas permanecem evidências separadas. O relatório final deve identificar o HEAD realmente executado, versão do navegador, inventário, fingerprints das fontes/build, duração e limitações de diagnóstico do trace reduzido.
