# M01-FINAL-PRODUCTION-CONSOLIDATION-V6

**Estado final: READY_FOR_CAPTAIN_REVIEW.** A V5 foi conservada, as incompatibilidades demonstradas foram corrigidas e as falhas posteriores do harness receberam regressões focadas. M01 continua **PROTÓTIPO JOGÁVEL**. Esta entrega não declara certificação artística, hardware físico ou um relatório único 84/84 verde.

## Identidade e aprovação

- Branch: `codex/m01-final-production-consolidation-v6`.
- Base: `codex/m01-ready-deliveries-consolidation-v5` @ `d277b06937170aa433bc418ef5b83b2925c6d6de`, confirmada remotamente.
- PR [#57](https://github.com/Brawl2007/COD-guerra/pull/57), **draft contra V5**, nunca main. O HEAD exato final do pacote está na descrição da PR; não se tenta inserir o hash do próprio commit dentro deste ficheiro.
- Produção validada: `2a2a56734861b0801234d7ddf3cda66c0100f326`. A continuação não mudou src/assets/packages/config; apenas duas fixtures browser, workflows próprios e provas.
- HEAD final de código e fixtures: `edefda544c702962ad3e378d06fb1bd7e792254e`; o pacote posterior altera só workflows/provas/documentação.
- Fixtures finais: rig `24cf351bfa7a560fdae9a8eeaff5e31577101d56`; FX `edefda544c702962ad3e378d06fb1bd7e792254e`.
- Main: `72bbcdd156603c9399801c95d43d9365ba50fc82`; deploy: `cb400355c056955d1d6d0b22e92bd7be2443a10c`. Sem Pages, dispatch, force-push, reset destrutivo ou escrita nas branches de origem.
- Autoridade: [issue #55, comentário 6057373984](https://github.com/Brawl2007/COD-guerra/issues/55#issuecomment-6057373984), reconsultado na continuação. Nenhuma aprovação nova foi encontrada.

## Matriz de entregas

A matriz completa com nomes, branches, HEADs remotos, checkpoints herdados, dependências e decisões está em [DELIVERY_MATRIX.md](DELIVERY_MATRIX.md); o inventário inicial preserva 113 branches, 102 comparações, 50 PRs e 18 auditorias de reviews/comentários.

| Entrega | Decisão | Dependência / aprovação |
| --- | --- | --- |
| Station Architecture V2 e Bridge Structural V2 | Herdadas da V5, preservadas | Cinco volumes, 140 vãos, LODs, envelopes e colliders existentes |
| Vegetação, folhagem e 30 clusters de props | Preservados | Composição, grounding e rotas conservados |
| 65 vagões/acoplamentos, locomotiva 963 e Panzerzug | Preservados | Identidades, entidades, transformações e autoridade existentes |
| Ju87, HUD cinematográfico e áudio | Preservados | Eventos reais, ciclo de vida, pausa/restore e sincronização |
| Armas/ViewModel, battlefield FX e decals da V5 | Preservados | Sem alterações de gameplay, densidade ou TTL dos FX |
| Contrato determinístico e seis clips de soldados | Preservados | **Animation Resolver continua ausente**, não implementado nesta tarefa |
| Station V3, PR #54 @ 271413f26efc1dbccefc39ac401f4495928a2493 | Excluída | Zero reviews/comentários; READY não equivale a aprovação expressa |
| Diagnóstico FX, PR #53 @ a4dc9a8df5792df74cb6b7583f00819a380423d9 | Evidência usada; branch conservada | Sem merge ou sobrescrita do trabalho de origem |
| Direção criativa, PR #56 @ 03b61a380c2624ba2b704299a789749a50dc6a93 | Excluída | Draft, sem aprovação expressa; documentação separada |
| Deltas posteriores de Ju87, armas e decals | Excluídos | Não aprovados; HEAD posterior de decals 12a70220ecdd0e2e3488a1c8a2e5f3cca0a78416 |
| Quatro tarefas WIP | Isoladas | Nomes não identificados com segurança; não foram inventados |

Não houve merge adicional de produção ou conflito textual abandonado. As correções foram por função/hunk, preservando a integração semântica da V5.

## Correções e causa

| Alteração | Causa e resultado | Prova |
| --- | --- | --- |
| Game.rebuildSounds / metadata XYZ | Restore perdia aerial/shake de blasts ainda em trânsito. Restitui metadata por IDs Schema 2 existentes e normaliza o ponto live a XYZ | Eventos reais, metadata live/restored e rota equivalente |
| Fallback de muzzle | Contador antigo sobrevivia a restart; agora reinicia e requer marcador real de flash para evitar replay restaurado | Primeiro shot repetido, frame 100 ms atrasado e restore |
| Dispose de portal | InstancedMesh removidos antes do traverse não libertavam buffers próprios | Nove lotes, três recriações; dispose único, materiais partilhados conservados |
| Qualidade inicial de áudio | Menu só atualizava renderer; a alocação inicial podia usar qualidade anterior | Web Audio Low real e lifecycle browser |
| pagehide persistido | Game era destruído numa página preservada | Pausa/resume por PageTransitionEvent; admissão BFCache real não certificada |
| Fixture MG34 | Teste não criava fireColor exigida pelos FX integrados | Três falhas da base corrigidas sem relaxar asserts |
| Captura FX da #53 | Observador tardio, round distante sem impacto e corrida do restore | Observador armado antes de Continue; ID/round correlacionado, idade < .76 s e pools vazios no relógio restaurado |
| Rig após Resume | READY não garante pointer lock. Input rejeita o clique sem controlo e é limpo por pointerlockchange | Guarda de controlo e correlação shotCount; reprodução com API nativa e 3/3 cenários completos |
| Comparação Low/High FX | Capturas de idades distintas: Low 3 dust a ~.37–.42 s, High 2 a .20 s | Agora High→Low→High no mesmo relógio/câmara/snapshot pausados; smoke/dust positivos, Low≤High e High restaurado igual |
| Orçamento smoke no harness | SwiftShader mediu ~26.9 s entre aquisição de controlo e fase sem core/fire; limite 30 s era estreito | Somente smoke aguarda até 120 s; asserções de fase, dano, pause/restore, limites e HTTP/JS mantidas |

Commits principais: `f43a2585977c9894015a0c9b97c15cf6d92233b7` (correções de produção/fixtures), `2a2a56734861b0801234d7ddf3cda66c0100f326` (CI e comparação), `24cf351...` (rig), `edefda5...` (FX). [RUNTIME_REVIEW.md](RUNTIME_REVIEW.md), [TEST_DELTA_PROOF.json](TEST_DELTA_PROOF.json) e [CONTINUATION_RESULTS.json](CONTINUATION_RESULTS.json) detalham âmbito e validação.

## Battlefield FX: separação das causas

[FX_FAILURE_DIAGNOSIS.md](FX_FAILURE_DIAGNOSIS.md) e [FX_REMOTE_EVIDENCE.json](FX_REMOTE_EVIDENCE.json) preservam os traces e resultados da #53/V5. Madeira: impacto/marca ocorreram; primeira amostra ~1.224 s após chegada, além de .76 s dos chips. Granada observada a ~1.2001 s e demolição Low a ~1.3833 s, depois das fases quentes. Esses três jobs terminaram FAIL, não cancelamento. Cancelamentos de runner anteriores estão separados.

A execução crítica posterior 37812593960 deu 5/6 PASS: timeout de smoke de 30 s. A screenshot pós-falha mostra PAUSADO às 06:10:10; isso isoladamente não prova a causa da pausa. O diagnóstico seguinte preservou ciclo de vida/frame/contadores: **3/3 smoke, pausa e reset corretos**, mas **2/3 cenários completos falharam** por comparar dust em idades diferentes. Não se atribuiu essa inversão à densidade do renderer. O orçamento de smoke foi ajustado com base no tempo observado; o timeout original não tinha probe final e essa limitação permanece documentada.

Nenhum efeito, evento, relógio, RNG ou lifetime foi alongado/injetado para obter PASS.

## Validação real

| Verificação | Resultado | Prova |
| --- | --- | --- |
| Node V5 inicial | 454 PASS / 3 FAIL, 457 | NODE_INITIAL.json; fixture MG34 |
| Node V6 local | **460/460 PASS** | NODE_FINAL.json; 287910.030599 ms |
| Node CI anterior | **460/460 PASS** | CI_RESULTS.json; 166803.246172 ms |
| Node/build mais recentes | **460/460 PASS, build PASS** | Run 37821714679; log/metadata em CONTINUATION_RESULTS.json |
| Build local/CI/V5 isolada | **PASS** | Logs; bundle >500 kB continua aviso |
| Browser crítico anterior | **6/6 PASS** | Run 37782266838 |
| Browser integral CI | **83 PASS / 1 FAIL**, 84, 0 skips/flaky/retries/erros globais | BROWSER_FULL_CI.json.gz + SUMMARY; run 37802820440; 3994039.777 ms |
| Rig corrigido completo | **3/3 PASS**, sem retries | RIG_FOLLOWUP.json; run 37813098794; API nativa em RIG_POINTER_LOCK_PROOF.json |
| Diagnóstico smoke original | **1 PASS / 2 FAIL** | SMOKE_DIAGNOSIS.json; inversão de dust; 3 capturas smoke/reset aprovadas |
| FX corrigido independente | **2/2 PASS, sem retries** | FX_FOLLOWUP.json; run 37822021393 |
| Browser crítico final | **6/6 PASS, sem retries, 9.1 min** | Run 37821714679 |
| Cauda recuperada da execução local perdida | **3/3 PASS** | BROWSER_RECOVERY.json; run 37796261400 |
| Conteúdo protegido | **264 ficheiros byte-idênticos à V5** | INVARIANTS.json e FINAL_EVIDENCE_CHECK.json |
| Rotas completas | **PASS** seeds 19390901 e 7 | Snapshots, eventos, CP-A..D, Schema 2 e outro equivalentes |
| Visual High/Medium/Low | **30/30 pares PASS**, 60 PNGs | VISUAL_REVIEW.md, VISUAL_PAIRS.json; estado/pixels/recursos iguais |

A execução integral CI terminou e preserva um relatório global real. A falha rig foi corrigida e verificada focadamente; os restantes casos ficaram preservados. A continuação tem cobertura de **84 casos distintos com PASS observado**, sem alegar que o relatório histórico 83/1 se tornou 84/84. Não foi repetida outra suíte integral depois das correções exclusivamente de fixtures.

O executor local perdido e Chromium SIGSEGV antes do lançamento do jogo foram tratados como infraestrutura, não PASS. A branch remota é a entrega autoritativa. Os stashes/checkouts antigos foram conservados; não aplicar o stash da fixture já publicada.

## Evidência e integridade

O ZIP de recuperação 11559960166 (54337529 B) foi finalmente descarregado e verificado: SHA256 `029029f6ba3f05dbec8f4f9bf766a6a0970ad077844e452af9cdd2a010dd71ac`, CRC íntegro, 99 ficheiros iguais ao commit visual e 30 pares recomputados pixel-idênticos. O ZIP integral 11564978354 (88181261 B) também teve SHA256/CRC verificados: `5fc478f3b9265f8082d5e12829b597799f79c0934bde337b90ae6d9717fa3df2`. O artefacto crítico anterior 11552374346 já fora verificado. Os digests dos artefactos posteriores são identificados como fornecidos pelo GitHub quando não descarregados localmente.

Provas de falha não foram apagadas. `fx-critical-failure/` preserva screenshot/contexto e streams exatos do trace, não um trace Playwright autónomo; a cópia completa está no artefacto do run. As provas finais incluem capturas originais e metadata de qualidade no mesmo clock, com [inspeção e limites de enquadramento](FX_FINAL_VISUAL_REVIEW.md).

## Comparação visual e custo

[VISUAL_REVIEW.md](VISUAL_REVIEW.md) documenta inspeção das seis folhas, dos 30 pares e imagens originais, à altura do jogador. Sem crescimento medido de calls/triângulos/texturas/geometrias/instâncias nos estados V5/V6:

| Qualidade | Draw calls | Triângulos |
| --- | ---: | ---: |
| Low | 48–226 | 384047–512906 |
| Medium | 53–280 | 428618–767211 |
| High | 56–315 | 484908–951720 |

Station conserva 7 calls, LOD0/1/2 30881/28707/13382 triângulos, 21 geometrias, 10 mapas, 5 volumes, 140 aberturas e zero colliders novos. Sem alteração dos 30 clusters. Recursos são contadores residentes, não bytes de VRAM ou FPS.

Permanecem repetição de tijolo/roof na Station, materiais escuros em underframes, contacto visual duvidoso de alguns vagões no declive e ocultações nas câmaras das pontes/963, iguais à V5. Sem ornamentação nova nem alegação de acabamento Station V3. Sem FPS no Chromebook, medição física GPU/VRAM, playtest humano ou certificação BFCache real.

## Reprodução e integração

```sh
npm ci
node --test --test-concurrency=2 tests/*.test.js
npm run build
npx playwright install --with-deps chromium
CI=1 npx playwright test tests/browser/m01-battlefield-fx-polish-v3.spec.js tests/browser/m01-consolidation-lifecycle.spec.js tests/browser/m01-station-architecture.spec.js --workers=1 --retries=0
CI=1 npx playwright test tests/browser/m01.spec.js --grep 'licensed character rigs' --repeat-each=3 --workers=1 --retries=0
CI=1 npx playwright test tests/browser/m01-battlefield-fx-polish-v3.spec.js --grep 'distance smoke lifecycle' --repeat-each=2 --workers=1 --retries=0
```

A comparação usa V5 isolada no SHA indicado, previews distintos e `tools/verification/m01-final-consolidation-v6.mjs`: primeiro `M01_V5_CHECKOUT=/caminho/v5 ... --invariants`, depois URLs M01_V5_URL/M01_V6_URL e CHROME_EXECUTABLE. Os estados vêm de controlos reais.

O Capitão deve rever a PR draft contra V5 e integrar por hunks, conservando metadata de blasts, reset/marcador de muzzle, dispose dos lotes, qualidade áudio e pagehide. Não substituir os renderers por ficheiros de outras branches. Decidir #54/#56 e WIP separadamente; essas inclusões exigem validação combinada nova. O timeout smoke original tem observabilidade limitada, apesar dos três retestes smoke/reset corretos e do CI final verde; nenhuma causa nativa da pausa pós-falha foi inventada. Os warnings SwiftShader KHR_parallel_shader_compile e o fallback PCFSoftShadowMap→PCFShadowMap permanecem avisos do renderer, não erros JS. Uma futura certificação integral pode executar `CI=1 npx playwright test --workers=1 --retries=0 --reporter=list,json` em runner estável; não é pré-requisito inventado nem PASS declarado desta entrega. Merge e publicação não foram feitos.
