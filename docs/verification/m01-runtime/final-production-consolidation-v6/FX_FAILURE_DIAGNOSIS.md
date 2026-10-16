# Diagnóstico concluído das falhas FX — consolidação V6

Auditoria independente em 2026-10-08, baseada em GitHub/Actions e leitura dos artefactos existentes. **As falhas demonstram observação tardia do harness; não demonstram defeito de produção que justifique alterar duração, densidade ou limites dos FX.** Os frames iniciais de todas as partículas não foram capturados, pelo que este diagnóstico não certifica visualmente todos os seus picos.

HEADs remotas reconfirmadas: PR [#53](https://github.com/Brawl2007/COD-guerra/pull/53) `a4dc9a8df5792df74cb6b7583f00819a380423d9`; PR [#52/V5](https://github.com/Brawl2007/COD-guerra/pull/52) `d277b06937170aa433bc418ef5b83b2925c6d6de`. Ambas abertas, draft, sem merge, comentários ou reviews. Base preferencial e regra de preservar o diagnóstico: [handoff #55](https://github.com/Brawl2007/COD-guerra/issues/55#issuecomment-6057373984).

## Execuções remotas concluídas

| Origem | Run / job | Resultado |
|---|---|---|
| #53, HEAD `a4dc9a8` | [37755734696 / 113239698090](https://github.com/Brawl2007/COD-guerra/actions/runs/37755734696/job/113239698090) | Node FX 8/8 e build verdes; browser 0 passaram / 3 falharam. Job terminou 09:25:26Z; sem cancelamento. |
| V5, HEAD `d277b06` | [37756029307 / 113241388774](https://github.com/Brawl2007/COD-guerra/actions/runs/37756029307/job/113241388774) | Build e os 11 jobs Node focados verdes; browser 7 passaram / 2 falharam: chip de madeira e espera da demolição leste Low. Teste dos perfis de explosão passou. Job terminou 09:41:10Z; sem cancelamento. |

| Artefacto inspecionado | SHA256 comunicado por GitHub / log de upload |
|---|---|
| [#53: 11540008886, m01-fx-harness-probes](https://github.com/Brawl2007/COD-guerra/actions/runs/37755734696/artifacts/11540008886), 35 211 052 bytes, criado 09:25:23Z | `92ed14e7d36d5a547ecec69c3d6bcf9deef40db81b86c66362e3d17e0a63b386` |
| [V5: 11540434478, m01-v5-browser-diagnostics](https://github.com/Brawl2007/COD-guerra/actions/runs/37756029307/artifacts/11540434478), 35 804 946 bytes, criado 09:41:08Z | `e68ccbeea21a3dca8ced3c397f28c8bb9cc67ae89ce1c45f70101122d3ad6b54` |

## Categorias de diagnóstico

| Nº | Categoria | Conclusão desta auditoria |
|---|---|---|
| 1 | Evento de simulação não emitido | Não demonstrado nas três falhas. O round `kind=east` da fixture de terra não emite impacto por contrato; a seleção incorreta pertence à categoria 4. |
| 2 | FX ausente apesar do evento | Não demonstrado. Há resíduos, feedback e/ou camadas sobreviventes. Picos iniciais completos continuam sem captura direta. |
| 3 | FX emitido e expirado antes da observação | Diagnóstico principal: observações posteriores às vidas das camadas exigidas. |
| 4 | Erro de observação/assert/fixture Playwright | Confirmado: observador armado tarde, waiter genérico e fixture de terra que pode escolher round não emissor. |
| 5 | Cancelamento do runner | Confirmado nos jobs históricos; distinto dos dois runs concluídos acima. |

## Evidência temporal da #53

| Falha | Fixture / evento | Primeira observação vs. vida | Evidência e classificação |
|---|---|---|---|
| Madeira High | Fixture `clock=386.65000000005364`; único round pendente `m01_round_373`, `kind=player`; `arriveAt=386.9927503943841`. | `clock=388.216600000054`: ~1,224s após chegada **agendada**, frente a vida de chips/poeira de 0,76s. Timestamp exato de emissão não registrado. | Decal `wood:1`, spawned/placed 1, errors 0; feedback nearImpact 1. Impacto real ocorreu. Probe 15 amostras; picos puff/spark/chip 0. Categorias 3/4. |
| Granada High | Dano autoritativo `m01_grenade_0`, started `4.099999999999993`. | `clock=5.300099999999996`, idade 1,2001s; core termina 0,28s, fire 0,54s, dust 1,02s. | Burst ativo, smoke inicial 5 e pico 6, resíduo e feedback de explosão 1. Categorias 3/4. |
| Demolição leste Low | Fixture `clock=741.0999999998737`; evento/dano `east_demolition` started `741.1499999998737`, consumed confirmado. | `clock=742.5332999998725`, idade 1,3833s; core termina 0,48s e fire 1,18s. | Burst ativo; dust 5, shard 5, smoke 1; core/fire 0. Categorias 3/4. |

Traces no artefacto #53, dentro de `test-results/`:

- `m01-battlefield-fx-polish--49185-ep-distinct-visual-language/trace.zip` → `2-trace.trace`: madeira.
- `m01-battlefield-fx-polish--ec2c9-w-distinct-layered-profiles/trace.zip` → `0-trace.trace`: granada.
- `m01-battlefield-fx-polish--6bcde-and-Low-High-remain-bounded/trace.zip` → `0-trace.trace`: demolição Low.

Na madeira, a espera de unpause `call@88` vai de 102546,603 a 119086,458ms (16,54s); instalar o probe, `call@90`, de 119097,448 a 134173,397ms (15,08s); o waiter só começa em 135633,011ms. **Estes tempos são monotónicos do trace, não UTC.** A V5 também captura madeira tarde: `clock=388.283300000054`, decal wood 1 e chip 0.

## Origem do patch e correção mínima

O patch concluído da #53 tem dois ficheiros alterados, dois commits e +75/−6 linhas: [teste Playwright](https://github.com/Brawl2007/COD-guerra/blob/a4dc9a8df5792df74cb6b7583f00819a380423d9/tests/browser/m01-battlefield-fx-polish-v3.spec.js) e [workflow de evidência](https://github.com/Brawl2007/COD-guerra/blob/a4dc9a8df5792df74cb6b7583f00819a380423d9/.github/workflows/m01-fx-browser-evidence-harness-v1.yml). O teste guarda primeira/última amostra, picos e estado autoritativo em timeout, e exige a família do material testado. Mantém thresholds. O workflow roda Node/build/browser e guarda resultados; sem dispatch/deploy. Nenhum código de produção foi alterado por este delta.

Proposta para o harness V6: preservar este diagnóstico, armar observador RAF antes de Continue, capturar o frame correspondente e pausar sincronamente pelo handler de blur já existente no Game. Excluir `kind=east` e correlacionar o round/superfície escolhido. Manter asserts de material, camadas simultâneas, budgets, qualidade e pause/restore. Corrigir também o campo do probe para `d.m01.battleClock`; `d.battleClock` aparece undefined nos traces.

A fixture de terra da #53 seleciona `m01_round_12`, `kind=east`, arriveAt `259.67468733571445`, num snapshot com oito rounds. [landRound](https://github.com/Brawl2007/COD-guerra/blob/a4dc9a8df5792df74cb6b7583f00819a380423d9/src/game/m01-simulation.js) retorna sem emitir impacto para esse kind. Assim, o teste pode passar por partículas de outro round: isso exige reforçar a fixture, não afrouxar o assert.

Vidas e regras de fase: [m01-battlefield-fx-profile.js](https://github.com/Brawl2007/COD-guerra/blob/a4dc9a8df5792df74cb6b7583f00819a380423d9/src/render/m01-battlefield-fx-profile.js), linhas 5–21 e 59; [m01-view.js](https://github.com/Brawl2007/COD-guerra/blob/a4dc9a8df5792df74cb6b7583f00819a380423d9/src/render/m01-view.js), chips 321–327 e fases 350–395.

## Cancelamentos anteriores

[V4 train 113220234675](https://github.com/Brawl2007/COD-guerra/actions/runs/37749772664/job/113220234675) e [V5 anterior train 113239724350](https://github.com/Brawl2007/COD-guerra/actions/runs/37755679286/job/113239724350) registram shutdown do runner, Node fail 0 / cancelled 1 e operação cancelada. Um job rotulado failure pode conter esta interrupção, sem assertion de gameplay.

Os runs V5 37755389302, 37755679286 e 37755906429 foram cancelados. **O primeiro também contém uma assertion real concluída dos motion clips** (11 passaram / 1 falhou), comparando ficheiros protegidos integrados contra base anterior; não classificar todos os resultados antigos como cancelamento. O sucesso de todos os jobs Node na HEAD V5 `d277b06` supera esse resultado histórico, sem transformar o browser em verde.

Esta auditoria não executou testes locais, browser, dispatch ou rerun. A correção do harness e sua validação pertencem à tarefa principal; não são resultados certificados por este documento. Valores e referências completos em [FX_REMOTE_EVIDENCE.json](FX_REMOTE_EVIDENCE.json).
