# Verificação independente — tentativa 1

STATUS: FAIL. EVIDÊNCIA SUFICIENTE PARA INTEGRAÇÃO: NÃO.

Branch `codex/m01-continuity-raid-integration-v1`; base/HEAD durante os checks `2d65dd0b9837d5e6f21fe24dd8a8b167ca76df55`. Produção, testes e golden permaneceram congelados durante a verificação; o verificador não os editou. Aplicados os skills locais `focused-verification` e fase de verificação de `autonomous-task`. Context packet confirmado VALID após refresh do Captain (a primeira leitura STALE resultou apenas da cópia de evidências).

- **Full Node candidato: FAIL**, executado uma vez com `node --test --test-concurrency=2 tests/*.test.js`: **693/694 PASS, 1 FAIL**, 510957 ms. Log bruto preservado em `/workspace/scratch/cod-candidate-node-full.log`.
- **Baseline anterior: PASS, 683/683**, log `baseline-node.log` e `/workspace/scratch/cod-baseline-node-complete-v2.log`. O teste que falhou no candidato passou no baseline.
- **Focused existente: PASS, 22/22**, `focused-node.log`: fogo real/LOS a oeste, dlg019 após destruição, grounding posterior à segurança, seis horários fixos, pause/reload/double restore, legado schema 2 sem replay e 18 corrupções tanto no estado corrente como no checkpoint aninhado com rejeição atómica.
- **Invariantes: PASS.** `git diff --check`; wz29/fire/spatial/random/world/package/lock/playwright byte-identical à base. Source hash exato da simulation continua obrigatório e igual ao golden; `base`/`sourceSha256` históricos mantidos. Auditoria compara ambas as rotas com os mesmos inputs, prova golden original EXACT na referência antes de gerar o novo em x64 e documenta que o RNG só diverge após novo fogo legal a oeste; agenda do raid não sorteia RNG.
- **Build existente: PASS**, `build.log`, sem alterações posteriores de produção durante os checks. Aviso de bundle grande sem erro.
- **Browser existente: PASS, 1/1**, `browser/run.log` e `browser/raid-0536.png`, ambos inspecionados. Attachment confirma seis IDs distintos no terreno, raid ended, 171 puffs, paused=true e relógio/damage/puffs congelados, sem errors. Screenshot mostra fumo distante. O primeiro timeout do evento de pausa está preservado em `browser-first-failed/`; a correção foi do harness, sem alteração de produção. Evidência é continuação de estado atingido por controlos reais na simulação, não playtest humano nem partida contínua no navegador.

## Falha necessária a corrigir

`tests/m01-consolidation-lifecycle.test.js:23` falha no assert de reload da linha 31: `actual M01 aerial/demolition/grenade events rebuild identical delayed sound, shake and pull-out metadata from Schema 2`.

Primeiro caso: `raid_0530_1`, distância `579.4454527887585`, som em `445.4393453434741`. Antes do reload: `aerial:true`, `shake:false`. Após `Game.rebuildSounds()`: `aerial:false`, `shake:true`. `src/game/game.js:12` classifica apenas `raid_0530` em `AERIAL_BLAST_IDS`; os cinco novos sufixos não são reconhecidos, aplicando o limite de shake não aéreo de 1000 m em vez de 500 m.

Reprodução mínima executada após descobrir a falha: `node --test --test-name-pattern='actual M01 aerial/demolition/grenade' tests/m01-consolidation-lifecycle.test.js`; FAIL idêntico, log `/workspace/scratch/cod-candidate-lifecycle-failure.log`. Nenhuma outra falha apareceu na suite completa.

Próximo passo: correção mínima da classificação dos novos IDs no reload, preservando o teste existente; nova verificação da falha e da integração. Captain confirmou extensão pontual do contrato para `src/game/game.js` e o teste de lifecycle. Não repetir o browser/build já válidos sem uma alteração ou risco concreto que o justifique; não enfraquecer guard/golden para fazer a suite passar.
