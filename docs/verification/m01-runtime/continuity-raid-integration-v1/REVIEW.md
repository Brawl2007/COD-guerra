# Revisão crítica independente — continuidade e raid M01

RESULTADO: **ACCEPT para commit e push da branch de trabalho revista.**

O fecho da entrega continua condicionado ao **Node integral final de 694 testes, build e browser focado verdes no CI**. Este ACCEPT não transforma a execução anterior 693/694 em PASS. Não houve nova execução integral local durante a revisão.

TASK_ID: `M01-CONTINUITY-RAID-INTEGRATION-V1`.
Branch revista: `codex/m01-continuity-raid-integration-v1`.
Base/HEAD antes do commit: `2d65dd0b9837d5e6f21fe24dd8a8b167ca76df55`; revisão do working tree, incluindo testes, ferramenta e workflow ainda não tracked.

## Conclusão técnica

Não foram encontrados bloqueadores de correção, segurança ou escopo no diff revisto. Nenhuma correção obrigatória é pedida.

- **T02-min:** a única mudança em `eastFire` é a elegibilidade pelos limites reais da área jogável. LOS, política dos atiradores do dique, cadências e algoritmo RNG conservam-se. O fogo adicional legítimo pode consumir RNG e mudar a continuação; a auditoria regista a primeira divergência apenas depois desse fogo. `dlg_m01_019` sai do relatório inicial e só é enfileirada depois do impacto que destrói o posto; o quase-acerto não anuncia destruição.
- **Grounding e segurança:** impactos aéreos consultam `heightAt` nas coordenadas finais, depois do `safeImpact` existente. A predição do avião segue a mesma ordem. A distância de segurança é horizontal, como na base, e continua ≥30 m. O envelope de 100 m a oeste suporta o deslocamento máximo de 70 m sem entrar na área jogável. Demolições não aéreas conservam a altura original.
- **Agenda determinística:** os seis IDs fechados e as seis horas em `mission.json` correspondem à agenda, ao renderer e à tabela dos nove impactos aéreos em `Game`. A agenda não usa RNG; consome cada entrada uma vez antes de terminar o raid e antes de libertar o CP-C existente. O primeiro ID mantém a âncora da passagem original. Alvos continuam identificados como dramatização de gameplay.
- **Persistência:** schema permanece 2. Saves com agenda exigem IDs/horas/ordem/pontos válidos, estado emitted coerente com battleClock, altura real, envelope limitado, danos correspondentes únicos e flag active/ended coerente. Campos extras em entradas/pontos, duplicações e inconsistências são rejeitados; backups também passam pelo validador antes da troca atómica da instância. Saves legacy sem agenda não recebem impactos retroactivos. A ambiguidade do primeiro ID legacy é documentada; os cinco novos sufixos exigem agenda.
- **Apresentação restaurada:** a correção de `AERIAL_BLAST_IDS` cobre exatamente os cinco IDs novos. O teste lifecycle existente foi reforçado, conservando comparação integral de som atrasado/classificação/shake, ausência de duplicação e imutabilidade do save/RNG. Não foi enfraquecida a asserção que descobriu a falha original.
- **Fumo:** lifetime persistente apenas nos seis IDs fechados do raid, com pools existentes. Os testes verificam instâncias/opacidade nos três níveis de qualidade, pausa e reconstrução idênticas. A captura real às 05:36 foi inspecionada: fumo visível sobre/atrás da estação, com sobreposição e oclusão. Não prova seis silhuetas separadas nem performance.
- **Golden/guardas:** proveniência histórica `base`/`sourceSha256` retida; o novo `approvedIntegration` exige o hash exato da simulação. A auditoria reproduz o golden original com os mesmos inputs nas duas rotas, conserva os quatro checkpoints e missão completa, e verifica métodos/ficheiros protegidos. O allowlist acrescenta somente a predição aérea afetada, com justificativa explícita. Não há remoção de uma guarda necessária para esconder uma regressão.
- **Escopo:** `src/world`, `src/core`, assets, wz.29, fire, package/lock e Playwright estão byte-idênticos à base, confirmado por diff read-only nesta revisão. Autoridades históricas, bancada francesa, objetivos, cadências, dano, gates e tempos históricos de eventos não foram alterados. O contrato de engenharia original foi preservado abaixo da secção nova. Workflow restrito à branch de trabalho, sem publicação e com permissões read-only.

## Evidência considerada

Li `AGENTS.md`, o estado/runbook/plano, o Task Contract e a fase Review de `.claude/skills/autonomous-task/SKILL.md`, o diff final, os novos ficheiros completos, `VERIFIER.md`, logs focados, auditoria por tick e captura/diagnóstico browser.

- Base integral: **683/683 PASS**.
- Candidata integral anterior: **693/694 PASS, 1 FAIL**, preservada em `VERIFIER-FIRST-FAIL.md` e `candidate-node-first-failed.log`.
- Novos/focados anteriores ainda válidos: **22/22 PASS**.
- Após a correção da tabela aérea: afetados **28/28 PASS**, build PASS, browser **1/1 PASS**, zero retries/skips/flaky/erros JS/HTTP; 171 puffs às 05:36, pausa confirmada.
- `git diff --check`: PASS nesta revisão. Não executei suites repetidas nem editei produção/testes.

O HANDOFF inicial ainda tem campos de gates pendentes; deve ser atualizado pelo coordenador depois deste ACCEPT e do CI real. Isso não constitui uma rejeição do código. Apenas a branch de trabalho está pronta para commit/push; main/deploy continuam fora desta autorização.

## SHA-256 dos ficheiros revistos

| Ficheiro | SHA-256 |
|---|---|
| `src/game/m01-simulation.js` | `e988fcd9b923a429657d1deeb820054694b5e9b046ff904faa190e14e020c4a6` |
| `src/game/game.js` | `95f2973cf2f6166cbc0814e5947ebcebfd02e1aeb4128205d4c449468d3394af` |
| `src/render/m01-aircraft.js` | `b8c6ec5ecb2abf5e7348b87a3bd69405de4e956e5b52e3fdbf8ef69878694e3d` |
| `src/render/m01-atmosphere.js` | `c596da1d7dcb4c1b7ee7a89dbd3d639df7b5031489407c1c0a1e053c0f2767ed` |
| `missions/m01-tczew/mission.json` | `7561f0ced350ea0a619060609b276e9fbac2fe02edadc9274f1daeedc11cbc16` |
| `missions/m01-tczew/ENGINE_CONTRACT.md` | `9b58af0bf68f6416deeb6bd3f1d1e51fcbfa2bace39f8227f004f872a316bb64` |
| `tests/fixtures/m01-anim-gameplay-baseline.json` | `e0fb4ecbc1e483f9d9e177fd63c8a5a063529787238500d5a8a91e80e696b958` |
| `tests/helpers/m01-byte-guard-allowlist.js` | `04aca3f8cab40eadb1c1d424b18660d5469dbe250d1f272b5fb6caa5c2d86690` |
| `tests/m01-animation-contract.test.js` | `ff3d6896c7d8b54a29bffea7362c27ef45896d16ca8815b55c49896d103d4d45` |
| `tests/m01-atmosphere-runtime.test.js` | `2013c85fd796f9ebd8dc7bae8438675c6f78dc2c1b37b8b490d6d9464c83189a` |
| `tests/m01-consolidation-lifecycle.test.js` | `f7cc6e96b71aa3c538b30c1c73df5bb37c972ea3ef2ddc0a893428ffc39dab5b` |
| `tests/m01-continuity-raid.test.js` | `731576187da7859f06b8fed19cb57edc346fb14b3f75702acee68a8ead4bad4e` |
| `tests/browser/m01-continuity-raid.spec.js` | `12fe2ce33c8d6cea720ed4c9ca0c87f8d93883129e8f690ef34d7ab3c8a401c5` |
| `tools/verification/m01-continuity-raid-audit.mjs` | `dc57d79cd166267da2c636883c1a0705580fc68d35d9b6e11886ec444f4270f6` |
| `.github/workflows/m01-continuity-raid-integration-v1.yml` | `7d1e84835b042b5a2526e66ac947793abb5fafb961736f3ede897b4d1dc3441e` |
| `gameplay-delta-audit.json` | `d5d58a3b79878a2e1d3fb199dc22496d4dc53f8a719457d02c4bd9dc9f954d68` |

Qualquer alteração posterior de produção/testes/golden exige confrontar estes hashes e revalidar proporcionalmente o delta. Sem alegação de playtest humano, FPS ou aprovação completa de M01.

## Gate remoto fechado — 2026-10-14

CI 38582392486 no commit `8387b5627b3b5482370c0915f018776d563e31ec`: SUCCESS. **694/694 Node**, build PASS e browser **1/1**, workers 1, retries 0, numa execução final própria; não é união com resultados anteriores. Provas: `CI_RESULT.json` e `ci-job.log`. Condição de fecho satisfeita; revisão seguinte só de documentos, sem mudanças no código validado.
