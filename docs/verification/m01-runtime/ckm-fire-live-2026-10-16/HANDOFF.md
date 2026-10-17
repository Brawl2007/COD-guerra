# T47 — handoff (2026-10-17, execução encerrada a pedido do proprietário)

**Estado: NÃO VALIDADA. Não declarar a T47 completa.** Reserva `claims/m01-t47`; PR #85 (draft), branch `claude/cool-mccarthy-viomu9`, empilhada sobre a candidata #80 (que não foi alterada).

## SHAs publicados
- `ab98199` — implementação T47 completa antes da revisão: posto S2 (8, −3, 26), fogo real, saves, auditoria e golden `m01-t47-gameplay-baseline`. Node 976/976, build PASS; spec de browser ckm-fire 2/2, local.
- `1817dee` — `wip(m01): T47 review fixes — NOT VALIDATED` (correções da revisão crítica), seguido do commit deste handoff.

## Correções feitas em 1817dee (revisão crítica: APPROVE WITH FIXES)
1. **Bloqueante, feito:** removida a imunidade dos MG34 às rondas da ckm; só `ckmTarget` deixa de lhes responder. O teste dos MG34 foi reescrito.
5. **Feito:** um `burstPlan` legado `disabled` é descartado no 1.º tick; `to()` só mantém planos `live`; teste novo.
6. **Feito:** a validação exige h e chegada iguais nas 8 rondas e h = ARC_K·R²; testes de rejeição.
4. **Parcial:** o emissor fantasma `ae_s1_ckm_casemate` foi retirado de `mission.json`, e os testes do director foram adaptados.

## Verificado realmente (em 1817dee)
- live-fire 16/16.
- Lote focado de 126 testes: cover, partials, migração, schema2, presentation, MG34.
- audio-director 31/31.
- Os testes de 5 e 6 falham sem a respetiva correção (controlo negativo).
- **Não corridos:** `npm test` completo, build e browser.

## Pendente / bloqueante
- **Golden e auditoria desatualizados:** `tests/m01-animation-contract.test.js` falha até se regenerar com `node tools/verification/m01-t47-ckm-fire-audit.mjs`, porque o sha256 de `m01-simulation.js` mudou.
- Ainda falham os testes de emissores `m01-audio-core` e `m01-tczew-data`, por causa da retirada do `ae_s1_ckm_casemate`; atualizá-los deliberadamente, sem afrouxar guardas.
- `ENGINE_CONTRACT.md`:
  - :10 deve trazer o delta do reparo da nova auditoria (o texto atual diz −31,45 s; a auditoria antiga dava −46,10 s);
  - :127, emissor retirado;
  - a redação sobre os MG34 também em `mission.json`.
- Atualizar `DEVELOPMENT_STATUS.md` (T47), o ledger e `PREDECESSOR_DELTA_AUDIT.json`.
- **Balanço por playtest:** repairPins 81→37 e o reparo cerca de 46 s mais cedo. O ajuste é `CKM_SUPPRESS_SEC`.

## Próxima ação exata (Sonnet, sonnet-max)
1. `git checkout claude/cool-mccarthy-viomu9`, `npm ci`.
2. Corrigir os testes de emissores (audio-core, tczew-data) para a retirada do `ae_s1_ckm_casemate`.
3. Correr `node tools/verification/m01-t47-ckm-fire-audit.mjs` e regenerar o golden e `PREDECESSOR_DELTA_AUDIT.json`.
4. Atualizar `ENGINE_CONTRACT` :10/:127, a nota de `mission.json`, `DEVELOPMENT_STATUS` e o ledger.
5. Correr `npm test`, `npm run build`, e as specs de browser ckm-fire, mg34-prone (a fixture do tiro 6 pode precisar da timeline com a arma silenciada) e combat-feedback.
6. Só depois disso, uma verificação independente (não uma nova revisão crítica completa), e marcar T47 como `CONCLUÍDA NA ORIGEM`.
