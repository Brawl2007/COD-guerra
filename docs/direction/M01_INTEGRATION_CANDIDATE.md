# M01 — candidata única de integração (PR #76, issue #72)

Branch `claude/adoring-cannon-ggrwxa`. Base V7 (#59, 4c6f7be) + `main` (ecaebd3). Sem merge na main, sem deploy, sem force-push.
Registo central de tarefas: `.agent/m01-task-registry.json` (`python3 .agent/tools/m01_task_registry.py list`).

## Como jogar a candidata

```bash
git fetch origin claude/adoring-cannon-ggrwxa && git checkout claude/adoring-cannon-ggrwxa
npm ci
npm run dev        # http://localhost:5173/COD-guerra/   (desenvolvimento)
npm run build && npm run preview   # http://127.0.0.1:4173/COD-guerra/ (produção)
```
Desktop: clicar no canvas (pointer lock), WASD, rato, R recarregar, G granada, E usar, C agachar, V alça, Espaço saltar cena.
iPhone/tablet: modo tátil automático (`pointer:coarse`) ou forçado com `?touch=1`; joystick à esquerda, olhar à direita, botões FOGO/MIRA/REC/GRN/USAR/ALÇA/AGA/SKIP/pausa.

## O que está integrado (merges reais, ordem)

| Pacote | Origem | Estado na candidata |
|---|---|---|
| V2–V7 | #59 | integrado (84/84 browser no PR #59) |
| Argon Animation Resolver V1+V2 (IK braço de apoio, recarga, impactos) | #62→#64 | integrado |
| T50 loading real e bundle | #66 | integrado |
| T21 campo de batalha vivo | #65 | integrado |
| `main` (gate de deploy manual, infra cloud) | ecaebd3 | integrado |
| Correção do CI: checkout com histórico completo | 67c3cda | 10 falhas de byte-guard por clone raso reproduzidas e corrigidas |
| Pilha #63: T16, T17, T18, T42, T20, T44, T35, T39, T19, T22, **T23 (Gemini)**, PT05, T08, T12, T02-min, T03-lite, T25 | #63 @ 529e7de | integrado (merge 9149de7). Resolver T35 e Argon unificados num só módulo |
| Áudio T05a, T06a, T06b | `claude/m01-audio-director-music-v1` @ af81657 | integrado (6f1c6d9) |
| Controlos táteis iPhone | #74 | integrado; `input.js` registado na allowlist partilhada |
| Ferramenta de prova da câmara T21 | #70 + correção local 9b6988f | integrado; causa: movimento real do rato do Playwright sob pointer lock; captura CI por reprovar |
| Registo T00–T52 e carta do Capitão | #73 | integrado e actualizado |
| T09/T28 materiais e terreno, T13/T32 estruturas, T31/T33 via e props, T27/T30 relevo e horizonte, T10/T29 vegetação | `claude/m01-integration` @ 8a0c362 | integrado (merge 9928bdc). Workflows arquivados por essa pilha foram mantidos activos; T12 mantém a versão independente da arquitectura; geradores T13 congelados para reproduzir os GLB aceites byte a byte |
| Teste de fronteira da simulação | autorização do utilizador (2026-10-15) | regex só apanha globais do navegador (`event.window.from` do raid era falso positivo); nova regra para `globalThis` mantém o teste pelo menos tão estrito |
| H9-D1 dificuldade (dados) | `claude/m01-h9-d1-difficulty-data-v1` @ 5745e48 | integrado. Só dados: opção `difficulty` em snapshot/restore/validate, nada lê a tabela; saves recruta byte a byte iguais. Rotas por tick da golden histórica passaram sem alteração antes de mover o bloqueio de fonte: novo registo `sourceLock` na golden, proveniência histórica mantida e fixada |
| Lote parciais T02/T03/T05/T06/T07/T14/T24/T26/T34/T36/T41 | `codex/m01-partials-completion-integration-v1` @ 9a1535b | integrado com caveats. Golden separada `m01-partials-gameplay-baseline.json` regenerada só nos metadados de fonte após auditoria por tick contra o predecessor bc8f6a2 (mesma simulação da candidata). A branch tinha 26 testes Node vermelhos no próprio HEAD; correcções da junção: `M01ViewModel` lê `sim.actor` só se existir, mortos deixam de ser desenhados em prone genérico, lotes procedurais com capacidade para o elenco de 97, e 10 ficheiros de teste antigos actualizados ao comportamento autorizado sem largar invariantes (ver D39). T14/T41 continuam BLOCKED para aceitação (verifier/perf FAIL na fonte, sem nova verificação independente); T24 mantém a cláusula da vista 10 por provar; nenhum dos onze tem verifier/reviewer independentes |
| T24 Gemini/Argon (`M01-TRAIN-ARRIVAL-AND-LIFE-V1`, port manual) reconciliada com a T24 do lote partials | `integ-t24` @ ae0f453 (local) | integrado numa só junção. Cinemática canónica única = Gemini (963 1435→1075 m 04:43:30→04:45:00; Panzerzug 1359→1119 m 04:51:00→04:52:00); `M01TrainLife` usa essas funções e deixou de mover os grupos pai (um só dono de transformação por comboio). Uma só malha de lanterna desenhada por comboio (fixture perto, halo de 1 km longe, histerese 140/160 m) para manter ≤ 12 chamadas nativas; um só emissor/tecto de fumo 12/18/24. Só renderer: nenhuma golden de gameplay alterada. Áudio `veh.train.*` testado mas não ligado; vista 10 e verificação independente por fazer |

Evidência local no HEAD enviado: Node completo, `npm run build`, testes Python do sistema agentic, `tests/browser/touch.spec.js`.
A suite Playwright completa é validada pelo CI do PR (o contentor cloud corre o SwiftShader a ~0,1× e dá timeouts falsos).

## Desenvolvido mas ainda fora do PR

| Entrega | Motivo |
|---|---|
| Branches pré-V7 excluídas pela V7 (autoridade near/far, RNG por formação, locomoção de fuzileiros, sectores distantes, Ju 87 closeout…) | Protótipos ou falhas por resolver; ver auditoria na issue #72. |
| `claude/m01-audio-real-v1` (T45) | WIP não verificado; SFX exigem revisão de licença. |

## Pendentes reais (não desenvolvidos)
T38 posturas de combate, T43 política de LOD, T46 mistura/opções de áudio, T47 fogo do ckm, T48 retirada alemã;
mais T37 e a cláusula da vista 10 de T24. As outras parciais entraram pelo lote partials, ainda sem verificação independente; T14/T41 continuam BLOCKED para aceitação. T51/T52 são humanos.

## Retomar daqui (2026-10-16, modo de economia)
- Último CI completo (998d6d0): validate verde; browser 151 PASS / 23 FAIL. As 23 falhas foram corrigidas localmente em `fix-shard2` (grupos A–H, ver `DEVELOPMENT_STATUS.md`) e em `integ-full` (4 de `m01.spec.js`). Nenhuma asserção foi removida; só `environmentProps.runtime.revision` passou a `>0`, porque conta passagens de re-instanciação.
- Merge 27e3b96: Node 935/935, `npm run build` OK. Playwright completo: só no CI, com 4 shards.
- Corrigido no produto: a ordem dos materiais do bridge-finish deixa de depender da chegada dos GLB (`kitsSettled`); `environmentInstances` volta a contar a vegetação.
- Dívida: o custo por frame em software é ~1,4× o da V7 (track bed ~14 %, bridge finish ~15 %). Os orçamentos de tempo do CI de :112 e :310 subiram, sem otimização.
- Ainda por decidir pelo humano: workflows `browser-authority*` (restringir à branch de origem), T48 real, T14/T41 (perf FAIL na fonte).
