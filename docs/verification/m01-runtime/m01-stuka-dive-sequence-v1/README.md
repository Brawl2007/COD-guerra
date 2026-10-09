# M01-STUKA-DIVE-SEQUENCE-V1 (T17) — evidência

- Commit aceite: `4c64bebc9cd197a87daa608dea58ae911ff2bceb` (base `687ff72`, T16).
- CI x86: run 37930134740, artefacto 11616385444.
  - Autoridade (só apresentação): `git diff` limpo contra `687ff72` em src/game, missions, assets, package*.json, playwright.config.js e src/world excepto `m01-aircraft-path.js`; nenhum import de `m01-aircraft-path.js` em `src/game`; nenhum `time%` nos ficheiros dos aviões (`authority.log`).
  - `npm test`: 502/502 (`npm-test-summary.txt`).
  - `npm run build`: PASS.
  - Spec focada `tests/browser/m01-stuka-dive.spec.js`: 5 passed, workers 1, retries 0 (`browser.log`).
- Verifier: PASS (após 1 correcção de 3). Reviewer: ACCEPT (sem correcções obrigatórias).

## Capturas

| Ficheiro | O que se vê (inspecção do verifier) |
|---|---|
| `m01-stuka-formation.png` | Três Ju 87 em formação, a 308–495 m (15–25 px) |
| `m01-stuka-bomb.png` | Ju 87 (~47 px, 165 m) e bomba separada a cair (~12,7 px, 81 m), 1,5 s antes do rebentamento |
| `m01-stuka-gone.png` | 45 s depois: céu vazio, os aviões partiram para leste e não voltam |
| `m01-stuka-0435.png` | Restauro às 04:35: posições ancoradas ao bombardeamento gravado |

Cada captura tem o `*-diagnostics.json` com posições, atitude e estado das bombas.

## Limitações

- Bombas visíveis terminam no ponto autoritativo actual (T03, ancoragem ao terreno, fora do âmbito).
- Sirene por avião (T06) fora do âmbito.
- Nenhum FPS medido nem declarado.
