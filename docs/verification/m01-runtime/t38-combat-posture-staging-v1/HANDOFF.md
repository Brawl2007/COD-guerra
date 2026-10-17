# HANDOFF T38 — `M01-COMBAT-POSTURE-STAGING-V1` (estado: PARCIAL, NÃO APROVADO)

Branch `claude/quirky-heisenberg-iytxsy` · PR #82 (draft, base `claude/quirky-heisenberg-9l4m7b` = candidata #80) · reserva `claims/m01-t38`.
Interrompido por ordem do proprietário em 2026-10-17. Retomar numa única sessão Sonnet a partir do último commit WIP desta branch.

## Commits
- `ef35c7a` — fatia 1 (apresentação). Substituída pela fatia 2.
- `8bb0372` — fatia 2 WIP: posturas de jogo (pelotão leste, atiradores dos portões, secção, sapadores), `src/game/m01-aim.js`, golden `tests/fixtures/m01-t38-gameplay-baseline.json`, ferramenta de auditoria, capturas. Local: `npm test` 964/964, build OK. **Revisão crítica: REJECT.**
- `d3ac3b2` e o commit WIP final: ronda de correções incompleta (ver abaixo).

## Defeitos da revisão crítica (estado conhecido)
1. **BLOQUEANTE:** o Kowal deitado quebrava `tests/browser/m01.spec.js:196` (rkm_fire_burst/recarga) e `m01-mg34-prone.spec.js:45`. Correção: o Kowal ajoelha como a secção. *Iniciada na ronda; não verificada.*
2. **BLOQUEANTE:** specs de browser nunca corridas na árvore final. *Não feito.*
3. Envelope do terreno (`src/render/m01-terrain-envelope.js`) a ler as novas `slots`/`positions`. *Editado em d3ac3b2; não verificado.*
4. `east_platoon_voice` (e qualquer membro da secção) fora da cobertura dos sacos (z 20,5–23,5); o teste deve verificar a extensão real ou a linha de visão. *Parcial.*
5. Repor a rigidez dos testes: casos negativos do helper de lugares e da validação; «back rank» estrito (reservas atrás de todos). *Parcial (testes em edição).*
6. Os disparos de atrição devem sair de um atirador de pé. *Descrito na nota do mission.json; não verificado.*
7. Atiradores dos portões ainda formam linha vista de frente: novas posições no commit final (x 1053,2–1058,3), **sem capturas novas**.
8. Os sapadores em x −170 depois da retirada não devem ficar deitados. *Estado desconhecido.*
9. README: divulgar o desvio do reparo (−209 s a +142 s), os acertos no jogador (ex. seed 8: 0→4, 100→68 HP), `dlg_m01_027`/`dlg_m01_040`; corrigir «norte» das reservas; não exagerar a cobertura. *Parcial.*
10. Saves antigos mantêm as posições antigas: recolocar ao restaurar ou documentar. *Não feito.*

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
