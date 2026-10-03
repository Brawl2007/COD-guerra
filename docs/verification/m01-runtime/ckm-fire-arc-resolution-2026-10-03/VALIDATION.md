# Validação — M01-CKM-FIRE-ARC-RESOLUTION-V1

Base: `fbaac1e4bce0ce62dc61415c338dd33ccd86a71b`.

## Ferramenta de arco

Com Node 24.21.0:

```sh
node tools/m01-ckm-fire-arc.mjs --out /tmp/arc-a.json
node tools/m01-ckm-fire-arc.mjs --out /tmp/arc-b.json
```

As duas execuções produziram conteúdo byte a byte idêntico:

`sha256 b74f957d640336dc49b40d8bc517b6afe1823be3496aad8db3a07dbb1716a1cc`

A evidência versionada usa 3751 raios (`-30°…+30°`, `-5°…+10°`) e os snapshots reais de reparo/retirada do helper de rota.

## Testes CKM focados

```sh
node --test tests/m01-ckm-*.test.js
```

Resultado real:

- 23 testes;
- 23 pass;
- 0 fail/cancelled/skipped/todo;
- 7914.385124 ms.

Inclui 6 testes novos do scanner, além dos testes CKM de asset/runtime/migração já existentes.

## npm test

```sh
npm test
```

Resultado real:

- 230 testes;
- 230 pass;
- 0 fail/cancelled/skipped/todo;
- 29193.817396 ms.

## Build

```sh
npm run build
```

Resultado: PASS com Vite 8.3.1, 51 módulos transformados.

- `dist/index.html`: 3.99 kB / 1.79 kB gzip
- CSS: 8.12 kB / 2.69 kB gzip
- JS: 1,108.66 kB / 292.51 kB gzip
- build: 529 ms

Permanece o aviso de chunk >500 kB; não é uma regressão desta ferramenta.

## Browser

Comando:

```sh
CI=1 CHROME_EXECUTABLE=/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell npm run test:browser
```

Resultado real do Playwright:

- **35/35 passed**;
- zero falhas reportadas;
- duração total: **15,6 min**;
- `tests/browser/m01.spec.js`: 13,1 min (aviso de ficheiro lento do Playwright).

Executado localmente com Chromium headless/SwiftShader, sem workflow/CI remoto e sem publicação. Esta execução valida regressões de browser; não é playtest humano nem benchmark de FPS.
