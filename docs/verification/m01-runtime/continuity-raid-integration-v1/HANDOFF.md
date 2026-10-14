# M01 — continuidade e raid das 05:30

TASK_ID: `M01-CONTINUITY-RAID-INTEGRATION-V1`.
STATUS: `ACCEPTED`.
CODE_HEAD_TESTED: `8387b5627b3b5482370c0915f018776d563e31ec`.
PR: [#63](https://github.com/Brawl2007/COD-guerra/pull/63).
CI: [38582392486 — SUCCESS](https://github.com/Brawl2007/COD-guerra/actions/runs/38582392486).
BASE_BRANCH: `claude/m01-stack-integration-t08-t12-v1`.
BASE_HEAD: `2d65dd0b9837d5e6f21fe24dd8a8b167ca76df55`.
WORK_BRANCH: `codex/m01-continuity-raid-integration-v1`.
FINAL_HEAD: consultar o HEAD desta branch no PR; este documento acompanha a entrega.

## Duas entregas integradas

1. **T02-min — continuidade.** O fogo sobre o jogador passa a admitir a área jogável completa, incluindo o posto de disparo. A linha de visão real continua obrigatória: o terreno protege a rota do abrigo. `dlg_m01_019` só anuncia a destruição do posto depois do impacto; um quase-acerto que o deixa intacto não anuncia destruição. Cadências, dano e algoritmo RNG conservados. O novo fogo legal consome as amostras usuais e pode mudar o estado RNG posterior.
2. **T03-lite + T25 — raid.** Seis impactos, com horas fixas entre 05:30:00 e 05:33:20, fora da área jogável a oeste. Os impactos aéreos e a predição visual assentam na altura do terreno depois da regra de segurança existente. O fumo das seis colunas persiste até ao fim da missão. A agenda opcional `timers.raidSchedule` conserva entradas consumidas no schema 2 e rejeita inconsistências atomicamente, incluindo backups de checkpoint.

Os alvos são estimativas de gameplay, marcadas `GAMEPLAY_DRAMATIZATION`. As horas fixas seguem H16/D30; a agenda não consome RNG de combate. O primeiro ID `raid_0530` conserva a âncora existente da passagem aérea. Saves antigos sem agenda continuam com o raid antigo, sem criar explosões retroactivas. Sufixos novos exigem a agenda; um save sem agenda e apenas o primeiro ID é indistinguível do legacy.

## Evidência disponível

| Verificação | Resultado | Prova |
|---|---|---|
| Base exacta: CI anterior | PASS | [run 38117931250](https://github.com/Brawl2007/COD-guerra/actions/runs/38117931250) |
| Base exacta: Node local integral | 683/683 PASS | `baseline-node.log` |
| Novos testes focados | 22/22 PASS | `focused-node.log` |
| Auditoria antes/depois por tick | duas rotas completas; baseline original igual ao golden histórico | `gameplay-delta-audit.json` |
| Build de produção | PASS; aviso de bundle >500 kB existente | `build.log` |
| Navegador focado final | 1/1 PASS, workers 1, retries 0, skips/flaky 0 | `browser/run.log` |
| Frame do raid às 05:36 | 6 IDs distintos; 171 puffs no pool; relógio e danos congelados; erros JS/HTTP 0 | `browser/frame-diagnostics.json`, `browser/raid-0536.png` |
| Primeiro Node integral da candidata | 693/694 PASS, 1 FAIL; regressão identificada e corrigida | `candidate-node-first-failed.log`, `VERIFIER-FIRST-FAIL.md` |
| Testes afetados depois da correção | 28/28 PASS | `final-focused-node.log`, `lifecycle-correction-attempt1.log` |
| CI integral final no CODE_HEAD_TESTED | **694/694 Node PASS, build PASS, browser 1/1 PASS**, workers 1, retries 0 | `CI_RESULT.json`, `ci-job.log`, run 38582392486 |
| Revisão crítica independente | **ACCEPT**, condição de CI final satisfeita | `REVIEW.md`, `CI_RESULT.json` |

A captura foi inspeccionada: fumo visível sobre/atrás da estação; algumas colunas sobrepõem-se ou ficam parcialmente ocultas. Os testes de instâncias/opacidade provam seis colunas nos três níveis de qualidade, dentro dos pools existentes. A imagem isolada não demonstra seis silhuetas completamente separadas.

O primeiro teste de navegador falhou na espera de 5 s pela confirmação assíncrona de pausa. A falha e o trace estão em `browser-first-failed/`; o primeiro reteste (`browser-before-audio-fix/`) conserva as asserções e espera pela pausa real, com produção idêntica à falha. Depois da correção de áudio abaixo, o build e o browser foram repetidos; `browser/` contém essa execução final 1/1 PASS. A screenshot usa o orçamento de readback de 120 s e oculta as sobreposições de UI somente para a captura.

O primeiro integral da candidata encontrou uma regressão real: `Game.rebuildSounds()` só classificava `raid_0530` como aéreo; os sufixos restauravam o limite errado de tremor. Uma correção acrescentou os cinco IDs à tabela fechada e reforçou a cobertura dos seis no teste existente. Os 28 testes afetados, build e browser final passaram; o integral anterior continua FAIL e não se soma ao reteste. O CI final executou a suíte inteira uma vez e passou 694/694, com build e browser verdes.

O primeiro baseline local foi interrompido explicitamente para mover os testes para uma cópia imutável. Uma tentativa nessa cópia falhou por ausência de `research/weapons`; a dependência foi reposta a partir da base exacta. Apenas a execução integral final 683/683 conta como baseline. Não se somam resultados parciais.

## Golden e invariantes

O golden histórico conserva `base` e `sourceSha256` originais como proveniência. `approvedIntegration` regista a base desta tarefa e o hash exacto da simulação alterada; o teste bloqueia esse hash. A regeneração foi feita em x86, depois de reproduzir o golden original por tick com os mesmos controlos em ambas as rotas. A auditoria regista a primeira divergência de fala, a primeira divergência RNG depois de fogo novo legítimo e os quatro checkpoints finais.

`src/world`, `src/core`, assets, wz.29, `m01-fire.js`, configuração de build e Playwright são byte-idênticos à base. Métodos `safeImpact`, `readiness`, `advanceBattle`, `burst`, `landRounds` e `spansFire` conservados; em `eastFire` só muda a expressão de elegibilidade espacial. O contrato original de engenharia permanece literal abaixo da secção acrescentada.

## Limites e reprodução

M01 continua **PROTÓTIPO JOGÁVEL**. T02b (outras falas/pré-roll), fumo efémero de granadas de T03, nova névoa/camada de ambiente T21, playtest humano e performance no PC de referência continuam pendentes. Estas duas entregas não certificam M01 inteira como produção.

```bash
npm ci
node --test --test-concurrency=2 tests/*.test.js
npm run build
CI=1 npx playwright test tests/browser/m01-continuity-raid.spec.js --workers=1 --retries=0
npm run dev
```

Jogo local: `http://127.0.0.1:5173/COD-guerra/`. Na máquina que já possui o script do utilizador: `bash ~/jogar.sh codex/m01-continuity-raid-integration-v1`.

Para verificar a auditoria sem regenerar o golden: exportar uma cópia imutável da base exacta com os seus `src`, `missions`, `tests`, `research`, assets e dependências; definir `M01_APPROVED_BASELINE` e executar `node tools/verification/m01-continuity-raid-audit.mjs`. `--write-golden` é reservado à regeneração controlada em x86 com revisão.

Branch publicada, PR #63 em rascunho dirigido à base T08/T12 e CI completo verde. A revisão posterior só acrescenta documentos/memória; produção e testes permanecem idênticos ao CODE_HEAD_TESTED. Próximo passo: jogar esta branch e escolher o próximo recorte pendente, sem repetir estas entregas nem regenerar golden para simples atualização de documentos. `main`, deploy e branches de origem pertencem aos respectivos donos e não receberam escritas.

O arquivo ZIP do artifact não foi baixado neste executor (403); o run remoto disponibiliza-o. O log completo foi obtido pela ligação GitHub e comprova as contagens e os três gates. Não se alega validação local de CRC/SHA do ZIP.
