# Inventário somente leitura — união M01 mais recente

Snapshot UTC: 2026-10-16T21:03:08+00:00. Inventário/recomendação, **sem aceitação**, integração, commits, push, claims ou CAS. Nenhuma suíte repetida. Fonte: fetch explícito de todas as refs, Git ancestralidade/diffs, PRs/checks atuais, AGENTS local/main/#80/#84, Captain e issue #72. Único ficheiro criado por este explorador: este relatório ignorado.

## Conclusão executável

Aproveitar **a candidata existente #80**, nunca criar consolidação paralela. #76 já chegou à main; #78 já chegou a #80. O velho `claude/m01-integration` é uma fotografia antiga `d151a97`, não contém os trabalhos Claude/Argon já presentes na main. Não voltar a integrar as mesmas entregas históricas. **Nenhuma entrega nova satisfaz atualmente a fila READY**: o coordenador remoto executado em memória, só `status`/`queue`, devolve `ready_prs: []`.

Não ativar o integrador: coordenação continua **PAUSED**, não há prova de handoff de todos os escritores antigos da #80 e o CI integral de #84 ainda está pendente. #80 recebeu commit `813f163` às 20:52/20:53 UTC, posterior à criação do estado PAUSED. Passagem de tempo não é handoff.

## Heads exatos e compatibilidade

`M` = ancestral de main; `C` = ancestral de #80; `P` = ancestral do antigo playable. Ancestor prova inclusão de commits, não que cada versão original do ficheiro prevaleceu após conflitos.

| Origem e HEAD | M/C/P | Conteúdo / evidência | Sobreposição real com T40/T50 e próximo gate |
|---|---|---|---|
| main `6697956f3c684f06a856ddc4c6501bbb053bd438` | sim/sim/não | #76 merged 2026-10-16 17:38:09 UTC; V2–V7, #62/#64, #65/#70, #66, #63, touch #74 e pilha ambiente | É base de #80. Main tem falha browser conhecida, correção #83 ainda separada. Não tocar main. |
| #80 `813f163deceb551e0e4504b30958580cb67d3a76`, `claude/quirky-heisenberg-9l4m7b` | não/sim/não | Única candidata; #78 unido por `c24ee0b`, T46 `a11f2b8`, regra #77 `c05cca0`. Body reporta Node944/944 e build no merge, **não prova o novo HEAD**; quatro specs resolvidas precisam de CI. | Alto: 13 caminhos comuns com delta de #79; ver lista abaixo. Draft, CI vermelho/pendente e escritor antigo sem handoff. |
| #78 / playable antigo `d151a97239a54dc3f92b594e88ae5933c6bdfa06` | não/sim/sim | Lote aceito de 11 tarefas; origem anterior `e377a07`, docs finais d151. #80 preserva ancestralidade real. | Não unir outra vez. Correções de #80 ao lote precisam preservar provas/asserções. |
| #79 T40/T50 `bea4149ba71d5a06f33d1d456671a51bc6c4c888` | não/não/não | Nosso trabalho sobre #78; CI atual node-build FAIL, production FAIL, browser SKIPPED. Verificação local independente em curso: 9/9 novos, mas full879/881 + regressão6/9 conforme handoff recebido; duas correções usadas/3. | Reutilizar esta implementação, aguardar diagnóstico já atribuído; não duplicar. Só entregar inteira após gates, reviewer e SHA/CI exatos. |
| #81 T43 fatia1 `7e247babdc754f4a134e21be511cc77589bb9d50`, `claude/quirky-heisenberg-eldlky` | não/não/não | Módulo LOD/histerese; autor reporta Node952/952, build, browser16/16 antes de reverter train-wagons para original. Faltam fade/dither ligado, atores/vegetação, contadores e câmara10s. | Delta próprio não intersecta ficheiros T40/T50: field-structures, locomotive, lod-policy, panzerzug, props-runtime, yard-wagons + testes/registo. Fase seguinte tocará view/atores: sequenciar após #79. Draft/fatia: **não READY**. |
| #82 T38 fatia1 `ef35c7ab24d75d87ca6435891f1977fd14d7a52c`, `claude/quirky-heisenberg-iytxsy` | não/não/não | Base comum #80 `c05cca0`; poses/yaw do pelotão. Autor reporta Node960/960, novo16/16 com12sementes, cover10/10, build; sem browser. Sem fila completa/portões/secção/sapadores ainda falta; hitboxes permanecem em pé. | Delta próprio: mission.json, animation-presentation, animation-resolver, teste e registo; sem conflito direto de ficheiros #79, mas interage com personagens/render, cradle, reload e pins de missão. Fatia2 sim/goldens exige revisão crítica/x86. **Não READY**. |
| #83 teste reparação `e9a3d9ce4499e9970ba12dd7aeba8a8118717462`, `claude/quirky-heisenberg-rc9m3g` | não/não/não | Apenas tests/browser/m01.spec.js; expectativa pinned→prone com baseline/ciclo causal. Autor: local3/3 e Node935/935; validate CI PASS; browser pendente. | Sem interseção direta #79; pré-requisito provável para CI da candidata. Rever preservação de asserções, aguardar CI exato. Draft, sem READY. |
| #84 infra `de55f299b3b6870a84f218f5207d0253668749aa`, `infra/m01-single-integrator-v1` | não/não/não | Lock CAS, guia/regras,16testes; lease-offline-tests PASS, Python PASS, validate PASS; quatro shards browser pendentes. Body ainda desatualizado sobre checks. | Sem interseção T40/T50. Conflito esperado de política/documentos AGENTS com #80; consolidar regra vigente, não repor candidata #76. Draft, migração não ativada. |

### Delta concorrente #80 contra base d151 de #79

Caminhos comuns: `ASSET_CREDITS.md`, `docs/direction/M01_TASK_STATUS.md`, `index.html`, `src/assets/asset-manager.js`, `src/assets/asset-progress.js`, `src/main.js`, `src/render/m01-characters.js`, `src/render/m01-viewmodel.js`, `src/styles-t50-loading.css`, `src/ui/m01-loading-controller.js`, `tests/helpers/m01-byte-guard-allowlist.js`, `tools/verify-t50-bundle.mjs`, `vite.config.js`.

Isto é superfície de conflito, **não declaração de conflito textual confirmado**. A simulação somente leitura `git merge-tree` foi limitada a45s e terminou por timeout; não há resultado de merge a certificar. #80 já tem T50 Argon (#66), loading/progress/retry/dynamic Game import; #79 estende T50 e braços/carry. Não substituir integralmente ficheiros pelo nosso lado: preservar touch e mistura T46 em main/index, progresso/loading da #66 e requisitos novos da #79; reconciliar API de asset-progress e ownership das cargas, chunks/bundle, viewmodel/characters e allowlists. #79 contém novos GLBs/fontes/licenças que não existem em #80. Testar regressões de loaded/late FP, save/reload/carry, browser touch, opções áudio persistentes e tarefa de loading/bundle. Os pins de fonte/proveniência/goldens têm de continuar verificáveis; não editar pins para esconder diferenças.

## Inclusão histórica comprovada e limites

Ancestrais exatos de main E #80: PRs #70, #66, #65, #64, #63, #62, #59, #57, #52, #51, #50, #49, #45, #43, #42, #41, #37. Os antigos PRs ainda abertos não significam trabalho ausente. Na velha playable d151 faltam #62/#64/#65/#66/#70; estas funcionalidades já estão no destino #80.

Não ancestrais de nenhum dos três destinos: #75, #61, #58, #56, #54, #53, #48, #47, #44, #40, #39 (além dos PRs recentes na tabela). Isto **não autoriza integrá-los cegamente**: #61 é duplicado de #62 segundo ledger; #44/#56/#58 são propostas de documentação/campanha; #48/#53 são ferramentas de verificação; #39/#40 são protótipos/harness; #47/#54 foram retrabalhados na consolidação. Checks patch-equivalentes `git cherry #80 branch`: #47 0 equivalentes/6 patches distintos; #54 0/3; #61 3equivalentes/3distintos; #48 0/1. Não concluir que esses patches ausentes são entregas novas: podem estar superados por versões posteriores. Inspecionar proveniência por comportamento antes de qualquer inclusão. A consulta de #53 não terminou por Git promisor/HTTP503; não há prova patch-equivalente para #53/#75.

## CI atual (HEADs acima; não somar execuções)

- #80 run38965430705 validate + browser1–4 IN_PROGRESS; Python38965430790 PASS. Authority38965430736 FAIL: ENOENT `.github/workflows/ci.yml` em `m01-bridge-finish-v2-authority.mjs:12`; confirmado no log, não apenas atribuído ao autor. Necessita reconciliar guard com CI atual preservando autoridade.
- #81 run38956801628 validate PASS, browser2/4 PASS e1/3 IN_PROGRESS; Python PASS; guards T13/T32 (38956801525) e T31/T33 (38956801848) FAIL.
- #82 somente checks Vercel; **sem prova de GitHub Node/browser no HEAD** na lista atual.
- #83 run38962818630 validate PASS e browser1–4 IN_PROGRESS.
- #84 run38963168396 lease-offline-tests PASS; run38963168298 Python PASS; run38963170815 validate PASS e browser1–4 IN_PROGRESS.
- #79 run38933065832 node-build FAIL/browser SKIPPED; run38933065746 production FAIL. O diagnóstico local continua com o verificador já designado.

Preview Vercel SUCCESS não substitui os gates acima. Ledger de #80 diz integração sem validação de jogo para #78/T46. Registo e M01_INTEGRATION_CANDIDATE antigos contêm estados desatualizados; Git/PR atual prevalece. Sem totalizar aceites novos ou fechar tarefas com base só em PR.

## Exclusividade: condições que ainda faltam

Estado remoto `.agent/coordination/m01-integrator.json` na branch `coordination/m01-integration-state`: PAUSED, generation1, owner=null, blobSHA `ad14c1ce41ad286df5dd9dce5cf6f26c4290c432`; candidate_sha antigo `c05cca016bb3818a6224cbf8584d280855c9cd21` diverge do verdadeiro #80 `813f163`. Confirmado por API. A branch de coordenação não é jogo nem se funde em main.

1. Completar/rever checks aplicáveis da #84 no HEAD exato e adotar a política nas sessões.
2. **Obter evidência concreta de que TODOS os escritores antigos da candidata terminaram/fizeram handoff**, com sessão/dono e SHA final; nenhum comentário da issue72 até 20:34:49 contém essa confirmação. O comentário mais recente é explicitamente preparação/NÃO ativada. Handoffs de fatias T38/T43 não provam término dos escritores #80. Não há condição atual para ativar PAUSED.
3. Só com isso, futuro integrador autorizado revalida #80/sucessor e faz PAUSED→FREE via CAS do blob atual, repinando candidate_sha. Este explorador não executou isso.
4. Havendo entrega inteira READY, acquire exclusivo; antes de cada push guard(owner/token + HEAD); avanço normal sem force, verificação do SHA integrado, advance/heartbeat e handoff/release. HELD não expira por uma hora. #79/#81/#82 não podem entrar como prontas enquanto incompletas.

Claims existentes preservadas: T38 @c05cca0, T43/T46 @6697956. Script registry do #84 ainda indexa candidata #76 e estados NOT_DEVELOPED para T38/T43/T46; checks live devolvem EXISTING_REMOTE_WORK. Para T40 AUDIT_EXISTING_FIRST e T50 REUSE_OR_REVIEW_EXISTING. No índice mais recente da #80, T46 já é IN_CANDIDATE_UNVERIFIED/REUSE_OR_REVIEW_EXISTING, mas T38/T43 continuam NOT_DEVELOPED com EXISTING_REMOTE_WORK via live; T40 AUDIT_EXISTING_FIRST e T50 REUSE_OR_REVIEW_EXISTING confirmados. Ler índice da #80 e Git live antes de qualquer nova tarefa; nunca duplicar por registro stale.

## Próximo passo recomendado

Concluir o diagnóstico já em curso da #79 dentro do contrato/budget atual, preservar trabalho e evidência; não reiniciar implementação. Em paralelo lógico, recolher os resultados pendentes já iniciados de #80/#83/#84 e o handoff verificável do escritor #80. Depois da migração e reserva exclusiva, incorporar somente entregas completas na #80 e validar a união no novo SHA. #81/#82 continuam com seus autores/fatias; T46 já está fisicamente na candidata, mas a sessão humana de áudio10min continua pendente. T45/T51/T52 continuam humanas. A autorização do utilizador para continuar/integrar não é evidência de handoff e não autoriza ignorar PAUSED.
