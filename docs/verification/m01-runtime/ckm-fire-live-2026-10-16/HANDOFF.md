# T47 — handoff (2026-10-17, retoma Sonnet 5.5: testes, golden, build e browser)

**Estado: IMPLEMENTADA E VERIFICADA LOCALMENTE (Node completo, build, browser focado). A verificação independente continua pendente: não declarar a T47 concluída antes dela.** Reserva `claims/m01-t47`; PR #85 (draft), branch `claude/cool-mccarthy-viomu9`, empilhada sobre a candidata #80 (`813f163`, não alterada). Esta retoma trabalhou na worktree local `claude/busy-ritchie-3fkvk2-t47` (base = `94cb542` do PR #85 mais a correção do PR #89, `b449007`). **Nada foi publicado**: sem push, PR nem comentário.

## Commits desta retoma (locais)
- `ae69f9a` testes de emissores seguem a retirada do emissor `ae_s1_ckm_casemate` (audio-core, m01-tczew-data, director; helper `tests/helpers/m01-retired-casemate.js`).
- `4744135` emenda 01 do golden: auditoria e golden regenerados com a ferramenta do repo, cópias anteriores à emenda, `GOLDEN_AMENDMENT_01.json`, cadeia fixada em `m01-animation-contract`.
- `f84ff26` ENGINE_CONTRACT :10/:127, nota de `mission.json` e comentário de `m01.spec` seguem as correções e a auditoria nova.
- `58627b9` as saves do `m01-mg34-prone.spec` passam a ser construídas com a ckm silenciada (ver abaixo).
- o commit de documentação que contém este ficheiro (estado, ledger, registo).

## Os passos do handoff anterior, um a um
1. Testes de emissores (audio-core, tczew-data): reescritos sem afrouxar guardas; afirmam o que os dados têm agora (3 emissores, nenhum dramatizado, `s1_west_bridgehead` vazio) e falham se o emissor voltar. A regra da porta de tripulação continua testada, com o emissor tal como estava posto numa cópia da missão.
2. Auditoria e golden: `node tools/verification/m01-t47-ckm-fire-audit.mjs --write-golden` (EXIT 0). A emenda está documentada como a da T48 (`tools/verification/m01-t47-golden-amendment-audit.mjs --write` → `GOLDEN_AMENDMENT_01.json`): a semente 19390901 diverge da fonte anterior à revisão no tick 5320 (primeira ronda da ckm que suprime um MG34, `de_east_0`, campo `suppressedUntil`), a semente 7 com apoio é byte a byte igual nos 21 296 ticks, a fonte antiga nesta árvore reproduz o primeiro golden. Reexecutadas em modo de verificação (sem `--write`), as duas ferramentas passam e não alteram nenhum ficheiro (reprodutível).
3. ENGINE_CONTRACT :10/:127, nota de `mission.json`, `DEVELOPMENT_STATUS`, ledger, estado das tarefas e registo: feitos.
4. `npm test`, `npm run build` e os specs de browser: ver abaixo. O spec de MG34 deitada precisou de uma correção real da fixture (o tiro 6 já não existe na linha temporal com a ckm a disparar).
5. Verificação independente: **por fazer** (e a marcação CONCLUÍDA NA ORIGEM só depois dela).

## Verificado realmente (comandos e resultados)
- `npm test` completo, uma execução na árvore final: **978/978**, 0 falhas (antes de regenerar, em duas partes por causa da carga da máquina, ficheiros 1–76 e 77–110: só `m01-animation-contract` falhava, 7 testes, o golden e os 5 que dependem do seu resultado; os outros 109 ficheiros passavam).
- `npm run build`: PASS (vite 8.3.1; o aviso de chunk > 600 kB já existia).
- `python3 -m unittest discover -s .agent/tests`: 224/224.
- Browser (Playwright 1.58.2, `CI=1`, `CHROME_EXECUTABLE=/opt/pw-browsers/chromium`, SwiftShader, sobre o build final, sob `flock`):
  - `m01-ckm-fire` 2/2, `m01-combat-feedback` 3/3, `m01-mg34-prone` 4/4 (9/9);
  - `m01.spec`, `m01-animation-contract.spec`, `m01-field-structures.spec`, `m01-audio-offline-render.spec`: 32/34. Falharam `m01.spec.js:50` («M01 loads the nine bridge LODs…», `#mag` continua em «—» em vez de «5» 15 s depois de retomar; já registada no CI do PR #83) e `m01.spec.js:429` («German fire on the repair…», falha em `samples.some(pinned)&&samples.some(!pinned)`; é o teste que o PR #83 corrige com uma amostragem mais longa, e a sua janela começa 46 s de jogo antes da primeira ronda da ckm). Reexecutados em A/B (mesma retenção do `flock`, `--repeat-each=2`, T47 contra a candidata `813f163` construída à parte): «German fire on the repair…» falha 2/2 nas duas árvores, na mesma asserção, logo é anterior à T47; `m01.spec.js:50` passou 2/2 nas duas, logo foi intermitente.
- Não corrido: a suite Playwright completa dos 51 specs; CI do GitHub.

## O que mudou no jogo e o que não mudou
- Desde `ab98199` (implementação sem a correção da revisão): os dois MG34 deixam de ser imunes à zona batida da ckm. Na rota de referência o primeiro é suprimido aos 266,0 s; o reparo conclui 31,45 s mais cedo que o do antecessor (era 46,10 s) com `repairPins` 81→47 (era 37); uma morte, `de_east_5` (era `de_east_3`); a rota 7 com apoio não muda. O emissor de apresentação da ckm na casamata deixou de existir: a ckm soa só pelo evento `ally-fire`.
- Tudo o resto da T47 mantém-se como em `ab98199`. Em relação à candidata #80: o posto S2, o fogo real e a apresentação.

## Pendente / decisões humanas
- **Posto S2 (decisão histórica e de desenho).** A fase 0 (PR #85, issue #72 às 21:26 UTC de 2026-10-16) pediu aprovação humana para a opção (c), outro posto para a ckm. O contrato `T47_TASK_CONTRACT.md` regista «Autorização do proprietário (2026-10-16)» para investigar e corrigir o posto com fundamento histórico, e escolhe S2 (8, −3, 26). Não encontrei esse acordo nos comentários do PR #85 nem da issue #72, nem em `DECISIONS.md`. O local concreto é uma reconstrução (`RECONSTRUCTED`; nenhuma fonte dá a posição da ckm). Confirmar S2, ou indicar outro posto.
- **Equilíbrio.** O reparo 31,45 s mais cedo e os MG34 suprimíveis pela ckm precisam de uma sessão de jogo. Botão: `CKM_SUPPRESS_SEC` (2,5 s) ou o âmbito da supressão em `ckmImpact`.
- **Áudio.** Confirmar a retirada do emissor `ae_s1_ckm_casemate` e que o som da ckm só pelo evento convence (ninguém ouviu).
- **Verificação independente** e integração na candidata (só com autorização).
- Falhas de browser anteriores à T47 que não são desta tarefa: ver a linha do `m01.spec` acima e o PR #83 (corrige `m01.spec.js` «German fire on the repair…» e o `m01-mg34-prone` de recuo, só em testes).

## Próxima ação exata
1. Decisão do proprietário sobre o posto S2 e o equilíbrio (acima).
2. Verificação independente (sem nova revisão crítica completa): `npm ci`, `npm test`, `npm run build`, os specs de browser acima sob `flock`, e `node tools/verification/m01-t47-ckm-fire-audit.mjs` e `m01-t47-golden-amendment-audit.mjs` sem `--write` (têm de passar e não alterar ficheiros).
3. Só depois, marcar a T47 como `CONCLUÍDA NA ORIGEM` e pedir a integração na candidata.
