# M01-DEMOLITION-SETPIECE-V2 (T18) — evidência

- Commit aceite: `b296374d4c4f4f091f17331d9232e7483ca9d711` (base `f8cbe39`, T17).
- CI x86: run 37959483518 (artefacto `m01-demolition-setpiece-v2-b296374…`, com as imagens de referência e de diferença).
  - Autoridade (só apresentação): `git diff` limpo contra `f8cbe39` em src/game, src/world, src/core, missions, assets, package*.json, playwright.config.js; nenhuma referência a `m01-demolition` nesses directórios (`authority.log`).
  - `npm test`: 520/520 (`npm-test-summary.txt`). `npm run build`: PASS.
  - Navegador: 9 passed, workers 1, retries 0 — spec nova `tests/browser/m01-demolition-setpiece.spec.js` + regressão `m01-battlefield-fx-polish-v3.spec.js` (`browser.log`).
- Verifier: PASS após 1 correcção de 3 (a primeira entrega tinha o clarão tapado pela treliça e fraco demais). Reviewer: ACCEPT.

## Prova por píxeis

Cada captura é comparada com uma referência da mesma câmara e do mesmo relógio antes da explosão; píxel alterado = diferença ≥ 24/255; caixa de controlo no céu ≤ 80 píxeis. Valores em `*-pixels.json`.

| Captura | Distância | O que se vê | Píxeis alterados (limite) |
|---|---|---|---|
| `m01-demolition-east-flash-776m.png` | 776 m | Brilho laranja pequeno (~25 px) no horizonte, entre os portais | 336 (≥150) |
| `m01-demolition-east-midcollapse.png` | ~190 m, 2,6 s, progresso 0,66 | Coluna de fumo escura, fogo na base, torres do portal leste caídas | 7846 (≥300) |
| `m01-demolition-east-restore-settled.png` | restauro a 6,8 s | Nuvem de poeira sobre os vãos assentes, sem tremor repetido | 9905 (≥200) |
| `m01-demolition-west-flash-363m.png` | 363 m | Brilho amarelo-laranja entre a ponte e o portal (inclui portais removidos) | 2420 (≥150) |
| `m01-demolition-west-fall-splash.png` | ~190–265 m, 3,55 s | Coluna de fumo, portais caídos, névoa de salpicos nas bases | 9083 (≥600) |
| `m01-demolition-west-earth-rain.png` | 62 m do posto | ~12 torrões de terra no ar sobre o posto de disparo | 181 (≥60) |

## Limitações

- Clarão a 776 m pequeno (visível mas discreto); salpicos fracos.
- A queda dos vãos é só de 2–3,5 m porque as poses colapsadas dos assets são assim (não se alteraram assets).
- 2 s de silêncio: só gancho (`demolitionSilenceWindow` nos diagnósticos); áudio não alterado.
- Camadas extra do clarão distante não escalam com a qualidade (limitadas ao pool de 16).
- Nenhum FPS medido nem declarado.
