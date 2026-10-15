# T42 · M01-WATER-VISTULA-V1 — evidência aceite

- **Branch / HEAD aceite:** `claude/m01-water-vistula-v1` @ `71ad067` (base `a1554f3`, T18).
- **CI:** run 37988900379 (x86, ubuntu-24.04). Artefacto `m01-water-vistula-v1-71ad067…`.
- **Autoridade:** `git diff --exit-code a1554f3 71ad067 -- src/game src/world src/core missions assets package.json package-lock.json playwright.config.js` limpo (`authority.log`); nenhum módulo de simulação importa `m01-water`.
- **npm test:** 535/535 (`npm-test-summary.txt`). **Build:** ok.
- **Browser:** 15/15 com `--workers=1 --retries=0` (9 água + 6 regressão T18) (`browser.log`). BEFORE em `a1554f3`: 9/9 (`before/`).

## Medições (do verifier independente)

| Captura | BEFORE | AFTER |
|---|---|---|
| view12 04:30 (luminância média da água) | 36,8 | 75,3 |
| view12 06:05 | 43,9 | 90,0 |
| view13 04:30 | 33,3 | 116,4 |
| view13 06:05 | 54,8 | 147,6 |
| view13 06:05 **Low** | 59,26 | 99,05 |

A/B detalhe ligado/desligado no mesmo frame em pausa (06:05 High), controlo com `maxDiff 0`:

| Zona | meanAbs | píxeis alterados |
|---|---|---|
| anel do pilar | 13,93 | 29,1 % |
| esteira do pilar | 7,89 | 12,8 % |
| margem molhada | 7,91 | 20,9 % |

Pausa congela: `maxDiff 0` em todas as regiões. Sem render target, sem reflexo planar; Low sem termo de reflexo (só tom), 1 oitava.

## Limitações conhecidas (não bloqueantes)

- Espuma e margem molhada são subtis a olho nu (medíveis no A/B).
- Água em Low é lisa (pouca ondulação).
- Brilho do sol em view12 06:05 ligeiramente em blocos.
- `renderTargets`/`planar` nos diagnósticos são constantes (guardadas por grep e testes Node).

Ciclo: implementer → verifier (FAIL: Low escura, espuma invisível) → 3 correcções → verifier PASS → reviewer ACCEPT. Decisão D17.
