# Continuação atual — consolidação M01 V6 (2026-10-08)

Esta secção prevalece sobre o histórico. TASK_ID `M01-FINAL-PRODUCTION-CONSOLIDATION-V6`. **READY_FOR_CAPTAIN_REVIEW**, [PR draft #57](https://github.com/Brawl2007/COD-guerra/pull/57) contra V5 `d277b06937170aa433bc418ef5b83b2925c6d6de`, nunca main. Branch `codex/m01-final-production-consolidation-v6`; confirmar HEAD remoto. HEAD final de código/fixtures `edefda544c702962ad3e378d06fb1bd7e792254e`; produção igual ao executável validado `2a2a56734861b0801234d7ddf3cda66c0100f326`. O pacote posterior só acrescenta workflows/evidência/docs; HEAD exato na PR.

CI final run **37821714679: 460/460 Node, build PASS, 6/6 browser crítico PASS**. O integral real run 37802820440 foi **83/84 PASS**, não foi cancelado; relatório bruto gzip e resumo estão em Git. Falha rig: Resume ainda não garantia pointer lock; corrigida com guarda de controlo e shotCount, prova nativa e **3/3 PASS** (37813098794). Falha FX posterior: timeout de smoke e comparação de contagens em idades distintas; orçamento smoke fundamentado no tempo observado, comparação High→Low→High no mesmo snapshot/clock pausados. **2/2 PASS** no follow-up 37822021393, mais os seis críticos verdes. **84 casos distintos com PASS entre runs; não existe single-full-suite 84/84 verde. Não repetir a suíte completa sem uma mudança relevante.**

Auditoria final run 37823137002 confirma **264 ficheiros byte-idênticos à V5**, integridade do relatório integral, 30 pares/60 PNGs pixel-idênticos, oito capturas FX finais e duas comparações de qualidade. Fonte/RNG/Schema2/12 objetivos/CP-A..D/25 eventos/colliders/paths/assets/envelopes/30 clusters conservados. Capturas e limites visuais inspecionados; FX distantes ocultados pela treliça não são prova de qualidade artística.

Ler HANDOFF, DELIVERY_MATRIX, CONTINUATION_RESULTS, FINAL_EVIDENCE_CHECK e BROWSER_COMBINED_COVERAGE_FINAL em `docs/verification/m01-runtime/final-production-consolidation-v6/`. #54 Station V3 ainda sem aprovação expressa (0 reviews/0 comentários), #56 e outros deltas excluídos; seis clips não são Animation Resolver. As quatro WIP não estão mapeadas. Main `72bbcdd...`, deploy `cb400355...` intocados; sem dispatch, force-push ou publicação. M01 permanece **PROTÓTIPO JOGÁVEL**.

O executor local perdeu-se e um Chromium local falhou antes de lançar o jogo; a entrega remota é autoritativa. Checkouts/stashes antigos preservados: fazer fetch e fast-forward seguro quando regressarem; não aplicar o stash da fixture já publicada nem reset destrutivo.

---

# Contrato de apresentação das animações — 2026-10-08 UTC

TASK_ID `M01-ANIM-CONTRACT-SIM-V1`; branch `codex/m01-anim-contract-sim-v1`, base remota confirmada `99309d9cb023cc94a07d41ff863e1362e4460570`. Confirmar o HEAD final remoto antes de continuar. Plano Claude `5583a4ab854a2e64dad85460bfd40031c3406ccc` e piloto `93aaa5c4a5651f22b4c696005501a2ac1014860a` lidos sem merge/cherry-pick.

Implementado contrato schema-2 opcional por NPC: motion/odómetro/gait/instante, bodyYaw independente de facing, postureSince e timestamps de eventos reais. Gameplay da base exacto em 41.083 ticks de duas rotas completas, incluindo eventos/checkpoints/RNG; A/B com campos novos 61.055 + 1.760 comparações. Build PASS, browser restore 86/89 com pausa/reload/CP 2/2 PASS. `npm test` executado uma vez: 343/344, único vermelho numa guarda antiga de hash integral do viewmodel. Guarda corrigida com hash da base imutável mantido; quatro ficheiros afectados 38/38 PASS depois, produção idêntica. Sem nova execução completa; estado formal `READY_FOR_CAPTAIN_REVIEW_WITH_KNOWN_FAILURES`. Handoff/provas em `docs/verification/m01-runtime/anim-contract-sim-v1/`; contrato em `docs/architecture/M01_ANIMATION_PRESENTATION_CONTRACT.md`.

Renderer/GLBs/HUD/Train/Bridge/Station/FX, velocidades, transporte, combate, RNG e resultados da missão não foram alterados. Não há Animation Resolver implementado nesta tarefa. Prone genérico/recarga/speed de Bąk/novas fases/política ckm ficam pendentes. Main `72bbcdd156603c9399801c95d43d9365ba50fc82` e deploy `cb400355c056955d1d6d0b22e92bd7be2443a10c` intocados. M01 continua **PROTÓTIPO JOGÁVEL**. Aguardar revisão do capitão; não integrar ou iniciar outra tarefa sem ordem.


---

# Estado atual — Station Architecture Production V2 (2026-10-07)

Esta secção prevalece para a tarefa atual; o conteúdo abaixo é histórico. M01 continua **PROTÓTIPO JOGÁVEL**.

- TASK_ID `M01-STATION-ARCHITECTURE-PRODUCTION-V2`; modelo/esforço pedido GPT-6.1 Sol HIGH; sem delegação.
- Base remota confirmada `codex/m01-bridge-portal-material-detail-polish-v1` @ `99309d9cb023cc94a07d41ff863e1362e4460570`.
- Branch isolada `codex/m01-station-architecture-production-v2`; confirmar HEAD remoto. Estado **READY_FOR_CAPTAIN_REVIEW**.
- Cinco volumes, cobertura inclinada com cumeeiras/chaminés, marquise e 140 vãos com profundidade física. Módulo próprio `src/render/m01-station-architecture.js`, sem assets externos obrigatórios. Malhas agrupadas por material, três LODs; portas/vidros fechados, sem salas ou colliders novos.
- 28/28 Node focados e build PASS; três casos browser focados verdes em duas execuções, timeout inicial de fixture preservado; 22 pares finais antes/depois com hashes de estado iguais e zero erros. Não houve suíte browser integral nesta tarefa.
- 133 ficheiros de gameplay/world/core/missão/assets/bridge/train/personagens/props byte a byte; rota completa, saves, checkpoints, clocks e RNG iguais à base. Os 30 clusters de props mantêm posições e contagens.
- Orçamento Station: 7 lotes, 21 geometrias para os três LODs, 10 mapas 128²; LOD0/1/2 30.881/28.707/13.382 triângulos. Sem FPS/hardware físico aprovados. P4 e medidas exatas da planta histórica continuam pendentes; fotos do acervo municipal sustentam a composição, com estimativas explicitamente marcadas.
- Handoff/capturas/custos/limites: `docs/verification/m01-runtime/station-architecture-production-v2-2026-10-07/`.
- A tarefa de bridge structural do Claude NÃO foi integrada. Nesta entrega `m01-view.js` muda somente remoção das janelas antigas, exclusão VISUAL do bloco Station em syncSolids e diagnóstico; `m01-environment.js` muda o trecho Station de buildArchitecture e sync/dispose. Preservar mudanças da ponte e fazer integração sem substituir esses ficheiros completos.
- Main continua `72bbcdd156603c9399801c95d43d9365ba50fc82`; sem deploy/workflow_dispatch/merge/Graphify. Parar após handoff; próxima certificação combinada pertence ao checkpoint autorizado pelo capitão.

---

# Estado actual — auditoria de determinismo schema 2 (2026-10-03)

Esta secção prevalece sobre o histórico abaixo para a tarefa actual. M01 continua **PROTÓTIPO JOGÁVEL**. Não recomeçar a MG34 aprovada nem Graphify.

- TASK_ID: `M01-SCHEMA2-CROSS-SYSTEM-DETERMINISM-AUDIT-V1`; modelo/esforço solicitado GPT-6.1 Sol HIGH; sem delegação.
- Base remota confirmada: `codex/m01-mg34-prone-runtime` @ `fbaac1e4bce0ce62dc61415c338dd33ccd86a71b`.
- Branch independente: `codex/m01-schema2-determinism-audit`.
- Revisão aberta: [PR draft #37](https://github.com/Brawl2007/COD-guerra/pull/37), base `codex/m01-mg34-prone-runtime`; nenhuma integração.
- Último HEAD funcional/testes: `44419b1adc7aa1e7c2740e62ffbba69c725860ab`. Os commits seguintes só documentam evidência; confirmar HEAD remoto antes de continuar.
- Encontrado/provado/corrigido: restore de continuação perdia o checkpoint anterior. `snapshot()` guarda `resumeCheckpoint` opcional plano; CP-A..D/reset/debrief usam `snapshot(false)`. Legacy sem campo mantém o estado carregado como CP. Schema permanece 2. Backups inválidos/futuros/recursivos rejeitados atomicamente.
- Encontrado/provado/corrigido: payload extra da arma podia sobrescrever métodos/perfil via Object.assign. Whitelist dos campos reais da wz.29, RNG uint32 e fases conhecidas no validador. Nenhuma alteração ao algoritmo de RNG ou arma.
- Auditoria A/B por tick, com diagnóstico do primeiro campo/tick de divergência: **61.055 comparações**, 37 casos registados e 34 janelas. Duas rotas completas sem re-restaurar B: seeds 19390901 sem apoio (20.976 ticks) e 7 com apoio (20.107 ticks). MG após 1/4/6 tiros, rounds/casualties, granadas/arma, estação, Bąk, gates/demolições, OUTRO, legacy 86/89/MG e 17 mutações corrompidas. Death/recovery entre cada CP-A..D, double load, dt variável e pausa. Nos casos testados, nenhuma divergência.
- Validação final Node: **242/242**, incluindo 18/18 novos; build PASS; diff check PASS. Provas verdes em `427358ab74a7dd7aadd20293dc301c46ac29f879`. Produção é a árvore de `d241e2069f984a47a9d41190f0b53c26833cc28a`; Node final é `1f15b58436c11d70c44195ebf181d710f876a3a4`.
- Browser focado final: **4/4**, sem retries/skips. Fixtures visuais que pretendem um CP próprio usam snapshot plano; asserções de raízes/baixas/migração intactas, nenhum timeout aumentado. Novo teste UI confirma continuação seguida de Restart exacto ao CP-A anterior. Grab/release inspecionam o frame pausado enquanto clips opcionais carregam, fechando uma corrida da fixture.
- **Browser integral final: 36/36 PASS**, zero retries/skips/falhas/flaky, 1.182,745 s (19,7 min). Exit code 0; relatório bruto completo `browser.json.gz`, resumo individual `browser-summary.json` e log integral preservados. Código de produção/Node permaneceu idêntico às execuções verdes acima. Auditoria concluída para revisão do capitão; confirmar HEAD remoto.
- Execuções falhadas iniciais preservadas e identificadas, não apresentadas como verdes: primeiro Node 238/240 por duas fixtures de checkpoint; browser inicial interrompido depois de duas fixtures de Restart; revisão focada 3/4 antes do freeze. ZIP completo/capturas da falha inicial não publicados; traces textuais/JSON/contexto com omissões explícitas em manifesto.
- Handoff/provas: `docs/verification/m01-runtime/schema2-determinism-audit-2026-10-03/HANDOFF.md` e ficheiros dessa pasta. Relatórios JSON browser são brutos comprimidos.
- Produção alterada só em `src/game/m01-simulation.js` (persistência/validação). `tick`, movimento, evacuação, renderer/world/core/assets/missão/francês/RNG/gates/demolições/IDs e Graphify preservados. Main `72bbcdd156603c9399801c95d43d9365ba50fc82` e base aprovada intactos. Sem integração/deploy/workflow_dispatch/M02.
- Chromebook físico, loader/reload/feed MG34, vagões de outra branch e arco real CKM continuam pendentes. Não iniciar outra frente nem integrar sem ordem concreta.

---

## Histórico anterior — não substitui a auditoria acima

# Estado atual — MG34 prone runtime V2 (2026-10-03)

Esta secção prevalece sobre o histórico abaixo para a tarefa MG34. Não recomeçar código, investigação ou extrações. M01 continua **PROTÓTIPO JOGÁVEL**.

- TASK_ID `M01-MG34-PRONE-RUNTIME-V2`; esforço HIGH; modelo solicitado GPT-6.1 Sol, agente de simulação/revisão configurado explicitamente.
- Base exata `codex/m01-ckm-placement-migration` @ `2cfa9520a09c68629e3d98d6e7f4dc0d8f9e6732`.
- Branch independente publicada: `codex/m01-mg34-prone-runtime`.
- HEAD implementação/testes: `8d55ae554b54f2fc0758189395936bb8c41a7c40`. Os commits seguintes só documentam; confirmar HEAD final remoto ao rever.
- Checkpoints remotos: 1 `435d962`; 2 `151ef325`; 3 `7cf2dec`; 4 browser `152df763` + prova FX `8d55ae5`. Publicados imediatamente em cada etapa por ligação GitHub; checkout reconciliado com remote, sem force-push.
- Implementados apenas os dois gunners `de_east_0/1`: postura, rajada real, spatial, renderer e fallback. Enter/exit 1,9 s; 4–7 tiros a 0,075 s. Schema 2, campos opcionais `mg34Prone`; planos/IDs/RNG pertencem à simulação.
- Hitboxes orientadas pelo eixo corporal em 0/PI/2/PI/-PI/2, também nas transições. Socket real `[0,0.03,-0.769]`: 2.496 comparações GLB, erro máximo 0,038402 mm, tolerância 2 mm. Nenhum asset recriado.
- Save após 1/4/6 tiros: plano, frame, shot/firedAt, IDs e RNG iguais; sem tiros perdidos/duplicados ou eventos extra. Morte enter/idle/burst/exit limpa futuros tiros e postura; método real dos efeitos comprova ausência de clarão extra/na morte. Pausa estável. Kit prone ausente preserva gameplay.
- Loader/reload/feed não ligados: não há associação/evento real na simulação. Nenhum ator/loader fictício.
- Corrigidos bugs reproduzidos: hitbox do tick anterior no tiro do jogador; save com record emitido em voo ausente/alterado; OUTRO durante burst; target alcançado reescrevendo SUPPRESS.
- Validação final: **46/46 focados novos**, **224/224 Node**, build PASS, **4/4 browser focados**, **35/35 browser integral**, 0 retries/skips, saída reportou 12,3 min. Sem aumentar timeouts. O teste de evacuação da estação passou com espera interna de 120 s intacta.
- O workspace foi substituído após os testes verdes e antes dos docs. Checkpoints recuperados do GitHub sem reimplementar. Node/focados/build repetidos para recuperar logs brutos; browser não repetido. Logs JSON/capturas brutos browser desapareceram; resumo explicitamente reconstruído da saída confirmada de ferramenta na conversa, não fabricado como log bruto.
- Browser validou `152df763`; `8d55ae5` só acrescentou quatro testes Node. Árvores src/browser iguais: `0761b6675e9f71d1a2b5440907c571541068497b` / `51fe1a560f62e17c302988c816c2f8b4cec303eb`.
- `moveActor` e `evacuateStation` byte a byte; schema 2, CP-A..D, baixas por ID, RNG, clocks/gates/timers/demolições e bancada francesa preservados. Renderer só amostra simulação.
- Refs protegidos intactos: main `72bbcdd156603c9399801c95d43d9365ba50fc82`; runtime/assets-review `beec7cd9333cfac38fdc361da481ad4a942e1e37`; base CKM `2cfa9520a09c68629e3d98d6e7f4dc0d8f9e6732`.
- Sem integração/deploy/workflow_dispatch/M02/Graphify. Outras branches de ponte/pátio/CKM não integradas. Asserção CKM browser atualizada para a posição que já existia na base; nenhum runtime CKM alterado.
- HANDOFF e lista de ficheiros/provas: `docs/verification/m01-runtime/mg34-prone-runtime-v2-2026-10-03/HANDOFF.md`.
- Estado: pronta para revisão e decisão de integração do capitão, com a limitação documental browser explícita. Humano/Chromebook e loader/reload/feed pendentes. **PARAR após este handoff; não integrar nem iniciar outra tarefa sem nova ordem concreta.**

---

## Histórico anterior (não substitui o estado atual acima)

# Contexto para continuar COD-guerra

Continuar sem reiniciar. Ler primeiro este ficheiro, `AGENTS.md` e `docs/WORKING_CONTEXT.md`; consultar apenas o sistema afectado. Repo Brawl2007/COD-guerra. Branch actual `codex/m01-support-runtime`; candidato do PR #32 em `codex/m01-assets-review`, entregue em staging `codex/m01-runtime`. Âncora do runtime validado `a83bd8c960e853278ffb0a2293776099e05d3d86`, tree `6885264ee93579bcabb9602813ee875d58421d66`; o commit seguinte actualiza apenas estas âncoras de contexto. Confirmar refs antes de escrever.

## Intenção e limites

M01 — Tczew permanece **PROTÓTIPO JOGÁVEL**, marco 2 não aprovado. Integrações em staging e PRs autorizados; merge em main/publicação pertencem ao utilizador. Não usar workflow_dispatch. Preservar bancada francesa (32 unidades/m), schema 2, CP-A..D, RNG, baixas por ID, relógios/gates e segurança das demolições. Renderer lê dados e não decide combate. Playtest humano e FPS no Chromebook continuam pendentes.

## Validação e integração concluídas

- Handoff original f758daa preservado: **132/132 Node**, build e **24/24 navegador**, 538,6 s, sem retries. #29/#30 integrados anteriormente: 136/136 Node e build. Provas em `docs/verification/m01-runtime/asset-review-2026-10-02/`.
- CI anterior do PR #32, head dcffd4a, run 37063392650: **136/136 Node**, build e **24/24 browser**, 20,8 min, deploy ignorado. Este resultado pertence à revisão anterior; novo CI será separado.
- Nesta continuação: #31 ckm (head 4170eea) revisto/integrado por ec87e3f; #33 MG34 deitada (c6e5ed4) por 26c803c. Runtime local bf59e6f / remoto equivalente 456d216, tree ec27af68ec9c25f9603a2329437ee4891ace8319, passou **148/148 Node**, build e **26/26 navegador**, **552,1 s**, zero retries/skips/instáveis/erros globais.
- #34 vagões queimados/danificados (11554d9) revisto/integrado por e6f4bdc. Após esse kit isolado: **153/153 Node** e build; src/, browser tests, workflows e Graphify conservados; JS de produção idêntico ao runtime testado, SHA-256 **6e8d87a1653f4495add54fa4176c9da41cb1416c3362f2615b17cc16116c56fa**. Não declarar outra execução dos 26 no candidato com assets. Build 1034,23 kB / 268,17 kB gzip, aviso de chunk grande.
- Provas, relatório bruto comprimido, snapshots de diagnóstico e capturas originais do build em `docs/verification/m01-runtime/support-runtime-2026-10-02/`. Capturas novas são continuações de estados alcançados por controlos na simulação, vista da margem oeste; contagens/modelos confirmados também por diagnóstico/testes. Galerias dos kits são entregas originais, não novas extracções/playtests.

- Continuação #35: ckm LOD0 **5004 → 3904**, orçamento 4000; LOD1/2 e clips intactos. Merge 83e2129, **154/154 Node** e build; src/browser/workflows/Graphify/JS idênticos ao candidato anterior. Evidências em `docs/verification/m01-runtime/ckm-budget-2026-10-02/`. CI anterior de **23c403b**, run **37071814929**, terminou com **153/153 Node, build e 26/26 navegador** (14,9 min), deploy ignorado. Novo CI após esta entrega é separado.

## O que já aparece no runtime

- Ju 87: três aviões, LODs, hélices/pausa, cache/fallback e trajectórias preservados; SC 250 oculta. Segundo raid conservado. Somente as nove pontes obrigatórias bloqueiam M01.
- Trem 963: **65 vagões**, passo **9,10 m**, LOD2 instanciado com geometria/material partilhados, fallback por tipo ou total. Composição genérica provisória de 49 cobertos/16 abertos; P16 aberta. Locomotiva placeholder preservada. Sem inventar velocidade/portas/fogo.
- MG34: **de_east_0/1**, uma arma presa antes do mixer, Kar98k/clipe escondidos, boca real, LOD e reserva dentro dos mesmos 18/24/28 actores. Rajada lê firedAt/shot e corta aos 4–7 tiros reais; pausa/restauro/supressão/baixa e fallback preservados. Sem recarga ou deitado inventados no renderer.
- Não mudou src/game, src/world, src/core, saves, RNG, horários/gates, trajectórias de demolição ou bancada francesa.

## Trabalho do Claude e pendências

O utilizador pediu mais trabalho depois do #34. `docs/CLAUDE_NEXT_TASK.md` dá **duas novas tarefas independentes**: (1) reduzir apenas ckm LOD0 de 5004 para no máximo 4000 triângulos, preservando LOD1/2 e clips; (2) quatro clips emparelhados de agarrar/soltar no arrasto de S3, preservando os 61 ossos e clips existentes, sem src/. Especificações anteriores em `docs/CLAUDE_CKM_TASK_REFERENCE.md` e `docs/CLAUDE_MG34_WAGON_TASK_REFERENCE.md`. A tarefa (1) chegou no **#35**, head e65ce73, foi revista e integrada; não repetir. A tarefa (2), transições do arrasto, continua pendente com Claude. Não repetir os kits entregues nem enviar mensagens ao Claude por ferramentas.

Pendências: guarnição ckm ainda não cria actores na simulação; MG34 deitada/municiador também precisam de dados de postura/guarnição; pátio oeste exige rever alturas do kit versus cv_wagon_1/2 sem inferir colisão; estado/vagão danificado ou incendiado precisa de identificação da simulação. Arte, transições, áudio, fontes históricas, playtest humano e Chromebook continuam pendentes. Não iniciar M02.

## Graphify pausado

Ordem explícita do utilizador. Preservar `graphify-out/extraction-checkpoint.json.gz`, SHA-256 54647d13cc9b860c18b777cbd3d4cdc693d4a2af0cb015082171c2667dd32e32. AST 1537 nós/3558 edges; dois chunks de documentos e 120/151 imagens iniciais extraídos. Faltam 31 iniciais + quatro imagens suplementares e documentos novos/alterados, merge/diagnóstico/grafo/HTML/benchmark. Não repetir extracções nem declarar grafo completo. Headroom/context-compressor só têm medições locais, não poupança/facturação do ChatGPT.

## Continuação sem Claude — 2026-10-02

O utilizador informou que Claude atingiu o limite semanal e pediu continuidade sem esperar cinco dias. Codex assume as tarefas pendentes. Encontrada entrega completa na branch `claude/m01-station-drag-transitions`, head `27353ef207c5d0d97102db5b60d1d4fd16943194`, sem PR. Kit de quatro clips revisto e integrado como asset: 158/158 Node e build, regeneração byte a byte idêntica, galeria original inspeccionada; rig/clips anteriores conservados. Provas em `docs/verification/m01-runtime/station-drag-review-2026-10-02/`. Sem alteração de src/browser/workflows/saves ou Graphify; JavaScript de produção idêntico. Os clips ainda não são tocados pelo runtime. Próximo passo do Codex: ligar entrada/saída e pose segura ao estado real da evacuação, com pausa/restauro/fallback; não inventar relógios ou sucesso do resgate no renderer. Claude está em pausa; as tarefas anteriores de orçamento e criação dos clips estão entregues.

## S3 — transições ligadas ao runtime (2026-10-03 UTC)

Continuação de `44ee7822a295ac840bce70c4ca9897c064becce9`, sem reconstruir sistemas. `M01Simulation.evacuateStation` guarda no paciente `stationDrag = {phase, startedAt, duration}`; fases `grab`/`release` duram 1,6 s estimados, e `drag` conserva 0,65 m/s e o offset de 0,92 m. O par fica imóvel durante as transições, chega ao ponto de entrega antes de soltar e só é entregue após a libertação. `moveActor` permanece byte a byte igual; a chegada exacta é limitada à evacuação de S3. Interrupção por baixa/inactividade/reatribuição limpa o par; nenhum clip decide transporte, dano ou sucesso.

`M01Characters.sample` usa o mesmo instante guardado para os dois papéis. No arrasto, segura o último frame real de `station_drag_patient_grab`; o médico usa `drag_wounded`. A falta de qualquer clip do kit causa fallback conjunto. Rig de 61 ossos, GLBs, clips anteriores e toda a produção fora dos dois ficheiros afectados permanecem idênticos. Saves/schema 2 conservados, saves antigos em trânsito retomam sem repetir a pega; validação de fases é atómica.

Validação: 165/165 Node e build; 5/5 casos focados de navegador (110,492 s), sem skips/retries/instáveis. A suíte integral passou 29/29 casos em 583.108 s, sem falhas, retries, skips, instáveis ou erros globais. Provas, capturas originais do navegador de produção e substituições literais: `docs/verification/m01-runtime/station-drag-runtime-2026-10-03/`. São continuações de snapshots alcançados por controlos reais, não playtest humano.

CI da base `44ee782`: run 37077052752, 158/158 Node, build e 26/26 browser em 21,3 min, deploy skipped. CI de `2ccd451`: run 37076161531 cancelled durante browser; não aprovado. Estas execuções pertencem aos commits anteriores. A CI do próximo head será acompanhada separadamente. Main continua `72bbcdd156603c9399801c95d43d9365ba50fc82`; PR #32 permanece draft; sem publicação/workflow_dispatch/M02. Graphify continua pausado, checkpoint SHA-256 54647d13cc9b860c18b777cbd3d4cdc693d4a2af0cb015082171c2667dd32e32 preservado. Claude continua em pausa; guarnição ckm, prone/loader MG34 e estado dos vagões exigem dados reais da simulação.


## Ponto de continuação — guarnição ckm, 2026-10-03

Código guardado em `f4703350e950e5f70bd87d3190b4dc2a1cf0ef04`, tree `c5323de90866e5d7980664847390e3e67a3f1c46`, parent `b734cb0703013c36416f4cda269d558ae0602394`. O commit seguinte guarda este contexto/evidências. Confirmar refs; candidato PR #32 e staging não foram avançados nesta pausa.

Alterados apenas dois ficheiros de produção: `src/game/m01-simulation.js` e `src/render/m01-characters.js`. Três IDs novos: ckm_gunner, ckm_loader, ckm_reserve. Estado persistido `ckm={phase,startedAt,visible}`, fases idle/abandon/retreat. Abandono 3 s depois do evento existente east_demolition; locomoção até fora da zona oeste; gate original conserva a segurança. Arma/operadores sincronizados, terceiro homem usa clips existentes; corpo abatido/restauro/kit opcional conservados. HasCKM exige standing_idle e clips completos: sem animações base o fallback continua procedural.

Schema 2 aceita exactos 86 actores legados ou 89 novos; rejeita grupos parciais/campos ilegais atomicamente. Normaliza só o grupo ausente, em posição segura se a demolição leste já aconteceu; não modifica os actores anteriores ou RNG. MoveActor e assets intactos. Posicionamento [22,-3,43] sob o tabuleiro e caminho/subida provisórios; altura da seteira/plataforma ainda por confirmar.

Não foi implementado disparo/munição da ckm: aim/fire_burst/feed pendentes. ae_s2_ckm_east [1045,0,30] é outro emissor, não foi deslocado. MG34 prone/loader e estados de vagões continuam pendentes. Sem M02, main, publicação, workflow_dispatch ou Graphify.

Validação final confirmada desta etapa: 168/168 Node + build; 3/3 navegador focado após corrigir a regressão do kit base, 80,748 s. Suíte integral final iniciada mas relatório /tmp/ckm-browser-final.json desapareceu entre turnos; NÃO declarar 31/31. Próximo passo concreto: npm run test:browser com Chromium local, rever resultado e só então avançar candidato/staging/PR #32. CI b734cb run 37081592590 passou, deploy skipped; não é CI da nova entrega.

Evidência em `docs/verification/m01-runtime/ckm-crew-runtime-2026-10-03/`: REPORT.md, fallback-regression.json, 12 blocos reais // SUBSTITUIR ISTO: / // POR ISTO: em substituicoes.txt/json, hashes de 111 ficheiros conservados e captura original. Os blocos reproduzem os dois fontes byte a byte sobre b734cb. Logs /tmp não estão disponíveis; captura mostra a ponte, não a guarnição em grande plano. Não repetir extrações nem reconstruir código. Claude continua indisponível.


## Branch independente — migração da posição ckm, 2026-10-03

Base fixa `beec7cd9333cfac38fdc361da481ad4a942e1e37`; branch de revisão `codex/m01-ckm-placement-migration`. Não integrada. A raiz ckm passa para `[24.17,-3,43]`, mantendo os três offsets da guarnição com deslocamento rígido `+2.17 m` em X. O socket real `gun_muzzle_flash [0,.64,-.83]` com yaw `-π/2` fica em `[25,-2.36,43]`, alinhado em X/Z à seteira sul.

Migração schema 2 sem marcador novo: actores ckm em `idle`/`abandon` só são deslocados se ainda coincidirem exactamente com o seu posto antigo; `retreat` nunca é movido; depois de `west_demolition` nenhuma posição guardada é reescrita. Saves de 86 actores continuam a usar a migração do grupo ausente, agora com os novos postos antes da demolição leste e retirada segura depois dela. `startedAt`, fase, mortos, RNG, actores não-ckm, gates/relógios e schema 2 não são alterados. `moveActor` foi comparado com a base e permanece byte a byte igual; renderer não foi editado.

Produção alterada apenas em `src/game/m01-simulation.js`; novo teste `tests/m01-ckm-placement-migration.test.js`. Evidência e blocos literais em `docs/verification/m01-runtime/ckm-placement-migration-2026-10-03/`. Validação local disponível nesta sessão: `node --check` do novo teste e harness Node da regra exacta 10/10. O checkout completo não pôde executar `npm test` porque o shell não resolve github.com; não foi disparado CI/workflow_dispatch. Executar o teste de repositório num checkout com dependências antes de integrar.
