# M01-FINAL-PRODUCTION-CONSOLIDATION-V6

**Estado: READY_FOR_CAPTAIN_REVIEW_WITH_KNOWN_FAILURES.** As correções, Node/build, cobertura browser recuperada e comparação visual estão entregues. A falha conhecida é de infraestrutura: o executor local perdeu-se após 81 PASS observados, sem acesso ao exit/report global. M01 continua **PROTÓTIPO JOGÁVEL**; não está totalmente certificada.

## Identidade e destino

- Repositório: `Brawl2007/COD-guerra`.
- Branch: `codex/m01-final-production-consolidation-v6`.
- Base remota confirmada: `codex/m01-ready-deliveries-consolidation-v5` @ `d277b06937170aa433bc418ef5b83b2925c6d6de`.
- HEAD executável/CI: `2a2a56734861b0801234d7ddf3cda66c0100f326`. Os commits posteriores de evidência não alteram a árvore executável; o HEAD exato final do pacote com este handoff é registado na descrição da [PR draft #57](https://github.com/Brawl2007/COD-guerra/pull/57).
- Destino da PR: a branch V5, **nunca main**. Sem deploy, Pages, workflow_dispatch, force-push ou modificação de branches de origem.
- `main` auditada: `72bbcdd156603c9399801c95d43d9365ba50fc82`; deploy auditado: `cb400355c056955d1d6d0b22e92bd7be2443a10c`.

## Entregas e aprovação

Ver [DELIVERY_MATRIX.md](DELIVERY_MATRIX.md) e [REMOTE_INVENTORY.json](REMOTE_INVENTORY.json): 113 branches, 102 comparações de HEADs, 50 PRs e reviews/comentários de #37–54. A atualização mais recente inspecionada da [issue #55](https://github.com/Brawl2007/COD-guerra/issues/55#issuecomment-6057373984) autoriza conservar a V5 e exige aprovação expressa para #54.

Todos os sistemas já presentes na base foram conservados: Station V2, Bridge V2, folhagem, 65 vagões/acoplamentos, locomotiva 963, Panzerzug, Ju87, HUD, áudio, armas/ViewModel, FX/danos ambientais, contrato de apresentação e os seis clips adicionais. Não foram duplicados nem substituídos.

Nenhum delta independente posterior tem aprovação expressa comprovada na auditoria. Station V3 #54 @ `271413f26efc1dbccefc39ac401f4495928a2493` permanece isolada; READY é um pedido de revisão. As versões posteriores de Ju87, armas, decals e V2 divergente também não foram importadas. As quatro WIP não têm identificação inequívoca: não se inventaram nomes nem se integraram candidatas por semelhança. Os clips existem; o **Animation Resolver não está implementado** e continua dependência separada.

## Commits e integração semântica

- `f43a2585977c9894015a0c9b97c15cf6d92233b7`: correções de ciclo de vida/restore e captura dos FX.
- `2a2a56734861b0801234d7ddf3cda66c0100f326`: CI limitada a esta branch e ferramenta de comparação V5/V6.
- `be8041043e4e538af5ae577f5b4a562479281cab`: matriz, diagnóstico e evidência remota durável.

Não houve merge de produção novo nem conflito textual para resolver. Foram feitas alterações por função/hunk, preservando integração de Station/Bridge, importações e os demais sistemas.

| Correção | Causa demonstrada | Validação |
| --- | --- | --- |
| Delayed blast após restore | `rebuildSounds` perdia `aerial`/`shake`, impedindo pull-out Ju87 e vibração quando o som ainda estava em voo | Eventos reais da rota e da granada; metadata live/restored igual; sem replay ou mutação do save |
| Clarão em fallback | O contador do disparo anterior sobrevivia ao restart; limpar sem marcador real podia repetir um disparo restaurado antes de .2 s | FX real: primeiro frame 100 ms atrasado, contador repetido e restore sem novo evento |
| InstancedMesh dos portais | Os lotes eram removidos antes do traverse final, deixando buffers de instância sem evento dispose | Nove lotes, três recriações, cada dispose exatamente uma vez; material partilhado conservado |
| Áudio Low antes de Start | A seleção do menu só atualizava renderer, deixando a resposta inicial de reverberação na qualidade anterior | Web Audio real: seleção High→Low, impulse 1.2 s e estado Low |
| `pagehide.persisted` | O cache de navegação guardava uma página com Game já destruído | Pausa, relógio congelado e dois resumes com PageTransitionEvent; navegação BFCache real não certificada |
| Fixture MG34 | Teste real do renderer não criava `fireColor`, introduzida pelos FX integrados | Três falhas da base corrigidas sem alterar as asserções ou produção |
| Captura FX e restore | Observador armado tarde; fixture de terra escolhia round distante sem impacto; checkpoint pré-demolição retomava até gerar outro blast | Observador antes de Continue; round escolhido consumido; idade < .76 s; pausa real síncrona; pools vazios no relógio restaurado |

O renderer continua apresentação. Não foram alterados `M01Simulation`, RNG, Schema 2, eventos, horários, armas autoritativas, hitboxes, colliders, âncoras, spawns, paths ou rotas. Não se alteraram tempos/densidades/limites dos FX para obter testes verdes.

## Battlefield FX: diagnóstico fechado

[FX_FAILURE_DIAGNOSIS.md](FX_FAILURE_DIAGNOSIS.md) e [FX_REMOTE_EVIDENCE.json](FX_REMOTE_EVIDENCE.json) preservam runs, jobs, artefactos e timestamps dos traces da #53 e V5. Madeira: impacto e marca ocorreram, mas a primeira amostra chegou ~1.224 s depois da chegada; chips duram .76 s. Granada foi observada aos ~1.2001 s; demolição Low aos ~1.3833 s, após as fases quentes. Os três casos da #53 terminaram FAIL, sem cancelamento; cancelamentos antigos de runner são registados separadamente, incluindo a falha Node real de uma guarda obsoleta numa execução anterior.

O observador V6 acompanha frames reais e usa a pausa existente. Mantém as asserções de material, camadas, orçamento, qualidade e limpeza; acrescenta correlação ao round/ID de dano. O CI do código final passou os três casos FX.

## Resultados já concluídos

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| Node integral da V5 | **454 PASS / 3 FAIL**, 457, zero skips | [NODE_INITIAL.json](NODE_INITIAL.json), log inicial; fixture MG34 incompleta |
| Primeira tentativa FX local | **2 PASS / 1 FAIL** | Log `fx-focused.log`; corrida do restore seguida de blast legítimo |
| Primeiro teste novo de metadata | **15 PASS / 1 FAIL** | `lifecycle-focused.log`; live guardava campos de movimento da granada no ponto; ponto normalizado a XYZ |
| Node integral V6 local | **460/460 PASS**, zero skips/cancelamentos, 287910.030599 ms | [NODE_FINAL.json](NODE_FINAL.json), `logs/node-all-recovery.log` |
| Node integral V6 CI | **460/460 PASS**, zero skips/cancelamentos, 166803.246172 ms | [CI_RESULTS.json](CI_RESULTS.json), `logs/ci-node-build.log` |
| Build de produção local e CI | **PASS** | Logs de build; aviso de bundle >500 kB permanece |
| Browser crítico V6 CI | **6/6 PASS**, zero retries, 7.5 min | [run 37782266838](https://github.com/Brawl2007/COD-guerra/actions/runs/37782266838), `logs/ci-critical-browser.log` |
| Proteção de conteúdos | **264 ficheiros byte-idênticos à V5** | [INVARIANTS.json](INVARIANTS.json): assets, fontes de assets e toda produção fora dos quatro ficheiros corrigidos |
| Comparação de duas rotas completas | **PASS**, seeds 19390901/7; snapshots, eventos, CP-A..D e outro iguais | [INVARIANTS.json](INVARIANTS.json), `logs/invariants-final.log` |
| Browser integral local | **81 PASS observados / 3 finais não verificáveis na execução original; exit global UNVERIFIED** | [BROWSER_COMBINED_COVERAGE.json](BROWSER_COMBINED_COVERAGE.json), [BROWSER_TRANSPORT_INTERRUPTION.json](BROWSER_TRANSPORT_INTERRUPTION.json) |
| Browser de recuperação | **3/3 PASS**, 0 retries/skips/flaky, 210185.155 ms | [BROWSER_RECOVERY.json](BROWSER_RECOVERY.json), run 37796261400 |
| Comparação visual High/Medium/Low | **30/30 pares PASS**, 60 PNGs, snapshots/pixels/recursos idênticos, zero erros | [VISUAL_REVIEW.md](VISUAL_REVIEW.md), [VISUAL_PAIRS.json](VISUAL_PAIRS.json) |

A manutenção automática interrompeu uma tentativa local intermediária e recuperou um snapshot anterior do workspace. Logs incompletos e sessões desaparecidas não foram considerados PASS. Código, auditorias e resultados CI foram recuperados do GitHub; a execução integral local acima foi concluída posteriormente. Foi verificado o SHA256 do artefacto CI `11552374346`: `0bd589c7cfc976cae92c2a2efdfa115eb03cb41d446877fdcdcf0ab5ba8aeec1`.

## Reproduzir

```sh
npm ci
node --test --test-concurrency=2 tests/*.test.js
npm run build
npx playwright install --with-deps chromium
CI=1 npx playwright test --workers=1
```

Para comparação: checkout V5 isolado em `d277b06`, build separado e URLs de preview distintas. `M01_V5_CHECKOUT=/caminho/v5 node tools/verification/m01-final-consolidation-v6.mjs --invariants`; depois definir `CHROME_EXECUTABLE`, `M01_V5_URL`, `M01_V6_URL` e executar a mesma ferramenta sem `--invariants`. Os snapshots vêm de controlos reais; captura usa câmaras à altura do jogador e pausa nativa, sem avançar a simulação.

## Limites e ações do Capitão

- A aprovação desta consolidação não certifica a arte como FPS acabado nem substitui playtest humano.
- Sem FPS de Chromebook ou medição de GPU nesse hardware. Os contadores do renderer são medidas de chamadas, triângulos e recursos, não FPS.
- Station V2 ainda tem materiais/cobertura repetitivos; V3 requer aprovação própria. Resolver de animações e as quatro entregas WIP permanecem dependências.
- Navegação BFCache real depende de admissão do browser; foi testado somente o caminho do evento persistido.
- Rever a PR #57 contra V5, a matriz e os resultados completos. Nenhum merge ou deploy automático faz parte desta tarefa.

## Encerramento, infraestrutura e HEADs de evidência

- Pacote de comparação publicado em `377add30489247045fd028deb8ea9823acd41bc9`, produzido pelo [run de recuperação 37796261400](https://github.com/Brawl2007/COD-guerra/actions/runs/37796261400) / job `113376384865`, sobre `78be3498d89291437b0fb713dfa196a6830b0931`. O guard Git confirmou árvore src/tests/assets/packages/config idêntica à CI `2a2a567...`. Os commits posteriores são workflow/provas/documentação; nenhuma mudança executável após a validação Node/CI.
- Commits de recuperação: `974209445c0af06a8897d17a732541b2c6b2d4a5` e `78be3498d89291437b0fb713dfa196a6830b0931`; não usam dispatch, deploy ou push forçado. O job publica somente evidência nesta branch por fast-forward normal. A primeira publicação não criou run observado; a atualização pela Contents API acionou o run registado.
- A suíte completa foi iniciada **uma vez**. O transporte devolveu `exec-server transport disconnected; failed to resume exec-server session: recovery timed out after 25s` após os 81 PASS. Novas sondagens de execução/leitura ficaram sem resposta. Não se inventou exit 0 ou duração integral.
- Foram executados **somente os três casos finais** num runner CI independente: ambiente/recursos, abandono CKM e fallback CKM. Cobertura conjunta: **84 casos distintos com PASS observado**, zero falhas de asserção observadas. Isso **não é um relatório global 84/84 certificado de uma única execução**. A certificação integral continua limitada pela perda do executor.
- O run de recuperação passou guard, build, três casos, 60 capturas, comparação e publicação. Artefacto `11559960166`, 54337529 bytes, digest SHA256 fornecido pelo GitHub `029029f6ba3f05dbec8f4f9bf766a6a0970ad077844e452af9cdd2a010dd71ac`. Esse novo ZIP não foi descarregado/verificado localmente porque o executor ficou inacessível; os PNGs/JSONs foram lidos e inspecionados diretamente do commit Git. O ZIP crítico anterior teve checksum verificado como descrito acima.

O [manifesto](EVIDENCE_MANIFEST.json) identifica blobs Git e tamanhos das provas; [RECOVERY_CI_RESULTS.json](RECOVERY_CI_RESULTS.json) guarda os resultados do job. O log bruto integral de browser local e imagens locais não publicadas após a perda do executor **não estão disponíveis no pacote**. As linhas PASS 1–71 sobreviveram em Git; 72–81 foram preservadas dos outputs reais da sessão, com proveniência explícita. Não são um JSON bruto reconstruído.

## Comparação V5/V6 e limitações de arte

As 30 comparações, à altura do jogador, são pixel-idênticas e não apresentam crescimento de calls/triângulos/texturas/geometrias/instâncias. [VISUAL_REVIEW.md](VISUAL_REVIEW.md) documenta a inspeção de todos os pares e os contadores. As correções são de estabilidade/apresentação transitória; não se declara novo acabamento arquitetónico da Station ou melhoria artística que não existe.

Permanecem materiais/roof repetitivos na Station, materiais escuros do comboio/Panzerzug, contacto visual duvidoso de alguns vagões no declive e câmaras com ocultação da treliça/portal. São limitações presentes também na V5. Station V3 requer aprovação própria; Animation Resolver não foi criado. Navegação BFCache real, playtest humano e FPS/VRAM físicos permanecem não certificados.

## Integração e ação do Capitão

1. Rever esta PR draft contra **V5**, as correções por hunk em [RUNTIME_REVIEW.md](RUNTIME_REVIEW.md), o diagnóstico #53 e as provas. O HEAD exato final do pacote está na descrição da PR #57; implementação/CI exata `2a2a56734861b0801234d7ddf3cda66c0100f326`.
2. Se aprovada, integrar preservando os hunks de rebuildSounds, marcador/reset de fallback, dispose de InstancedMesh, qualidade inicial do áudio e pagehide persistido. Não substituir ficheiros centrais por versões de outras branches. Bridge Structural V2 e Station V2 continuam os da V5.
3. Para **certificação integral**, obter uma execução completa com relatório/exit global num executor estável. A V6 não repetiu a suíte completa; recuperou apenas a cauda necessária. Não converter cobertura combinada em alegação de full-suite PASS certificado.
4. Decidir separadamente sobre #54, #56, Decals posterior e demais exclusões. A integração de novas entregas requer nova evidência combinada; não inferir as quatro WIP nem implementar o Resolver nesta tarefa.
5. Main/Pages/deploy permanecem intocados. Merge final e publicação não foram feitos.

O checkout local deixou de responder antes do encerramento e não pôde ser reconciliado com os commits finais de prova. A branch remota/PR é a entrega autoritativa. Ao recuperar esse checkout, confirmar git status, fazer fetch da branch V6 e fast-forward seguro; conservar logs locais que reapareçam. Não usar reset destrutivo nem aplicar o stash antigo de recuperação.
