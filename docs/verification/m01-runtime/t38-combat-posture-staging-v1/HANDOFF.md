# HANDOFF T38 — `M01-COMBAT-POSTURE-STAGING-V1` (estado: PARCIAL, NÃO APROVADO)

Branch `claude/quirky-heisenberg-iytxsy` · PR #82 (draft, base `claude/quirky-heisenberg-9l4m7b` = candidata #80) · reserva `claims/m01-t38`.
Interrompido por ordem do proprietário em 2026-10-17. Retomar numa única sessão Sonnet a partir do último commit WIP desta branch.

## Commits
- `ef35c7a` — fatia 1 (apresentação). Substituída pela fatia 2.
- `8bb0372` — fatia 2 WIP: posturas de jogo (pelotão leste, atiradores dos portões, secção, sapadores), `src/game/m01-aim.js`, golden `tests/fixtures/m01-t38-gameplay-baseline.json`, ferramenta de auditoria, capturas. Local: `npm test` 964/964, build OK. **Revisão crítica: REJECT.**
- `d3ac3b2` e o commit WIP final: ronda de correções incompleta (ver abaixo).

## Defeitos da revisão crítica: estado comunicado pelo implementador ao parar (não verificado de forma independente)
1. Kowal ajoelha (já não fica deitado): **feito**. A spec da rkm de `m01.spec.js`, `m01-mg34-prone` e `m01-anim-resolver` passaram (estado antes da última mudança dos portões).
2. Specs de browser: **parcial**. Browser 37 PASS / 10 FAIL, antes da mudança dos portões:
   - 9 de `m01-postprocess-grading`: precisam de `M01_GRADING_BEFORE_DIR`; também falham na base `ef35c7a`.
   - 1 de `m01.spec.js` «German fire on the repair»: também falha em `ef35c7a` nesta máquina.
   - `distant-front-impostors` view10: falhava com as posições antigas; passa com os portões em x ≥ 1053; também falha em `ef35c7a`.
3. Envelope do terreno: **feito**.
4. Secção atrás dos sacos, verificada por linha de visão: **feito**.
5. Casos negativos, validação de dados e «back rank» estrito: **feito**.
6. Atirador de atrição de pé: **feito**.
7. Profundidade dos portões (x 1053–1058,3, mesmas linhas de visão): **feito**. Cobertura real vinda de oeste é impossível sem novos props de cobertura (decisão de design pendente).
8. Sapadores ajoelhados em x −170: **feito**.
9. README: **parcial**. Falta a secção de capturas; a tabela é anterior à mudança dos portões.
10. Saves antigos recolocados nos seus lugares ao restaurar: **feito**.

Últimos números (antes da mudança dos portões): `npm test` 967/967. Depois da mudança: staging (1 seed) 12/12, east-front + continuity-raid 27/27. Capturas `before/after` no repositório são o conjunto antigo.

## AVISO sobre o golden
As posições dos portões mudaram **depois** da última geração do golden. A regeneração (`--write-golden`) foi interrompida antes de escrever. **Considerar `tests/fixtures/m01-t38-gameplay-baseline.json` e `GOLDEN_AUDIT.json` desatualizados.** Não há resultados de testes válidos para o commit final.

## Próximo passo exato (sessão Sonnet)
1. `git checkout claude/quirky-heisenberg-iytxsy && npm ci`.
2. Correr os testes focados: `node --test tests/m01-combat-posture-staging.test.js tests/m01-east-front.test.js tests/m01-cover-threat.test.js tests/m01-animation-contract.test.js`. Concluir os itens 4, 5, 8 e 10 até ficarem verdes, sem afrouxar asserções.
3. Fazer commit da simulação final (S). Regenerar o golden em x86 a partir do predecessor `ef35c7a`:
   `git worktree add --detach /tmp/t38-pred ef35c7a && ln -s "$PWD/node_modules" /tmp/t38-pred/node_modules`
   `M01_T38_BASELINE=/tmp/t38-pred node tools/verification/m01-combat-posture-staging-audit.mjs --write-golden --candidate "$(git rev-parse HEAD)"`
   Correr uma segunda vez sem `--write-golden` (verificação byte a byte) e fazer commit da fixture e do `GOLDEN_AUDIT.json`.
4. `npm run build` e as specs `tests/browser/m01.spec.js`, `m01-mg34-prone.spec.js` e `m01-anim-resolver.spec.js`.
5. Regenerar as capturas: `npx playwright test -c tools/verification/playwright.t38.config.js` (com `T38_OUT`) e inspecionar a vista 22 (portões).
6. Correr `npm test` uma vez. Depois, uma revisão crítica única.
7. Atualizar o README, o registo T00–T52 (T38 continua `DELIVERED_BRANCH` até ser aceite) e a issue #72.

Sem merge na `main`, alterações na #80 nem deploy.
