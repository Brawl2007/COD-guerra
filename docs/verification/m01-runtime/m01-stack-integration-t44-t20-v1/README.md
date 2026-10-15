# M01-STACK-INTEGRATION-T44-T20-V1 — evidência

Integração na pilha aceite (b0020cf: T16, T17, T18, T42, T35, T39) das tarefas aceites T44 (grading, 3d202ca) e T20
(impostores, 7ade323), por `git merge --no-ff` (sem reescrever branches publicadas).

| Item | Valor |
|---|---|
| Branch | `claude/m01-stack-integration-t44-t20-v1` |
| HEAD de código aceite | `909bf43` |
| CI x86 | run 38054298392 — success |
| Autoridade | `git diff --exit-code b0020cf HEAD -- src/game src/world src/core missions assets package.json package-lock.json playwright.config.js` vazio; b0020cf, 3d202ca, 7ade323 antecessores |
| npm test | 596/596 (0 falhas) |
| Build | OK |
| Captura ANTES (base b0020cf + 7ade323, sem T44) | 10 passed |
| Browser focado (`--workers=1 --retries=0`) | 30 passed: grading T44, impostores T20, viewmodel-feel T39, anim-resolver T35, água T42 |

Correcções: 1/3 ordem das chaves do frame em pausa (teste T44 fixa a adjacência), 2/3 CI com captura ANTES.
Revisão: reviewer-critical REJECT 1 (CI sem ANTES) → ACCEPT 2.

Limitações: o comentário em `tests/browser/m01-postprocess-grading.spec.js:27-28` ainda diz que a base ANTES é 71ad067
(a base real desta integração é b0020cf+7ade323). Não há imagens ANTES do T20 neste CI. Em ADS, os impostores usam o FOV
do frame anterior durante a transição (um frame; tarefa futura).
