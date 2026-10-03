# Validação — M01 Chromebook benchmark V1

Base fixa: `2cfa9520a09c68629e3d98d6e7f4dc0d8f9e6732`.

## Testes focados

Comando:

```sh
node --test tests/m01-chromebook-benchmark.test.js
```

Resultado final: **7/7 passed**, zero fail/skip.

Cobertura:
- cálculo de FPS;
- percentis;
- buckets >16.67 / >33.33 / >50 / >100 ms;
- descarte do warm-up;
- `performance.memory` ausente;
- SwiftShader/software/unknown;
- serialização JSON sem NaN/Infinity;
- erro claro para amostra vazia/inválida.

## npm test

Comando:

```sh
npm test
```

Executado com Node 24. Resultado: **185/185 passed**, zero fail/cancelled/skipped/todo. Duração reportada: **24162.537275 ms**.

## Build

```sh
npm run build
```

Resultado: PASS, Vite 8.3.1.

Build reportado:
- `dist/index.html`: 3.99 kB / 1.79 kB gzip;
- CSS: 8.12 kB / 2.69 kB gzip;
- JS: 1,041.65 kB / 270.37 kB gzip.

Aviso existente de chunk >500 kB; não é resultado de performance do Chromebook.

## Browser smoke real da ferramenta

Comando executado no ambiente cloud disponível:

```sh
CHROME_EXECUTABLE=/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell \
node tools/m01-chromebook-benchmark.mjs \
  --quality low \
  --scenario all \
  --warmup 0.5 \
  --duration 1 \
  --headless \
  --environment CI/cloud
```

Resultado:
- os quatro cenários abriram e produziram JSON;
- `start` e `bridge`: `scenarioSource=checkpoint`;
- `repair` e `withdrawal`: `scenarioSource=saved-snapshot`;
- browser: HeadlessChrome 149.0.7827.55;
- resolução/viewport: 1280×720;
- DPR: 1;
- WebGL renderer: `ANGLE (... SwiftShader Device ... SwiftShader driver)`;
- `softwareRenderer=true`;
- `rendererClass=software`.

Os valores de FPS desta execução **não são desempenho de Chromebook** e não devem orientar optimização. O smoke serve apenas para provar que o instrumento abre o build, mede deltas rAF e serializa o resultado.

O JSON temporário do ambiente cloud não foi adicionado ao Git.


## Revisão do capitão após o handoff

O handoff original foi entregue no commit `32877fc3196133e8cf12ac8fc92a23add4948638`.

A revisão encontrou um bug isolado no modo `--url`: com servidor local ausente, `server?.exitCode !== null` tratava `null/undefined` como processo encerrado e abortava antes de testar a URL externa.

Correção:
- `4fd16cf6cc94681331dc1ba2759195565f1eee3b` — corrige a detecção de processo local;
- `5bd851939756e1502f82872dff5d19114520f40c` — adiciona teste de regressão.

Os resultados 7/7, 185/185, build e smoke documentados acima pertencem ao handoff anterior à correção. O ambiente do capitão não conseguiu reexecutar a suíte porque não possui acesso de rede ao GitHub nem a dependência `@playwright/test` instalada. Portanto, não atribuir esses números ao novo HEAD até nova execução.

A correção é tooling-only e não altera `src/**`, missão, mapa, assets, saves ou workflows.
