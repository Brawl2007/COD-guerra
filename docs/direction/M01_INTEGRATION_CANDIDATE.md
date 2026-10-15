# M01 — branch candidata de integração (Capitão, 2026-10-15)

Branch: `claude/adoring-cannon-ggrwxa`. Base: V7 (#59, 4c6f7be). Main inalterada (ecaebd3).

## Correção ao inventário anterior
V7 **tem** evidência: `M01 V7 combined browser certification` run 37876099475 (e0bb04e) = sucesso, 84/84 casos;
`M01 V7 Node and production build` run 37831786923 = sucesso. 4c6f7be acrescenta só documentação sobre e0bb04e.

## Conteúdo (merges em ordem, sem force-push)
| Pacote | PR | Estado |
|---|---|---|
| V2–V7 (base) | #59 | INTEGRADO (84/84 browser CI no PR) |
| Argon V1+V2 (IK, recarga, impactos) | #62→#64 | INTEGRADO+TESTADO (Node local) |
| T50 loading/bundle | #66 | INTEGRADO+TESTADO (Node local); conflito só em 3 listas de testes, resolvido por união |
| T21 campo de batalha vivo | #65 | INTEGRADO+TESTADO (Node local) |
| T21 correção de câmara | #70 | BLOQUEADO (CI vermelho, ver issue #72) |
| #61 | duplicado de #62 | EXCLUÍDO |
| #63 continuidade/raid | base fora da cadeia | por reconciliar |
| #74 touch iPhone | independente | por integrar depois |

## Evidência local (HEAD da candidata)
`npm ci`; `node --test tests/*.test.js` -> 502/502 pass; `npm run build` OK (chunk game 740 kB, aviso pré-existente).
Browser/Playwright **ainda não corrido** nesta candidata (CI não dispara em branch claude/*).

## Próximo
Correr Playwright na candidata; depois #70, #63 e #74.
