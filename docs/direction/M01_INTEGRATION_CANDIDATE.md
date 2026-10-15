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

Evidência local no HEAD enviado: Node completo, `npm run build`, testes Python do sistema agentic, `tests/browser/touch.spec.js`.
A suite Playwright completa é validada pelo CI do PR (o contentor cloud corre o SwiftShader a ~0,1× e dá timeouts falsos).

## Desenvolvido mas ainda fora do PR

| Entrega | Motivo |
|---|---|
| `claude/m01-integration` @ 8a0c362: T09/T28, T13/T32, T31/T33, T27/T30, T10/T29 | Merge pronto localmente (9928bdc; 865/866 Node). O teste `m01-simulation-boundary` dá falso positivo em `event.window.from` (janela temporal do raid, não o `window` do navegador). A correção da regex aguarda decisão humana. Falta também a linha da vegetação T10 em `ASSET_CREDITS.md`. |
| H9-D1 dificuldade (`claude/m01-h9-d1-difficulty-data-v1`) | Só dados, mas altera `m01-simulation.js`, cujo SHA-256 está bloqueado pela golden do #63. Integrar exige mover esse bloqueio com prova por tick; adiado. |
| `codex/m01-partials-completion-integration-v1` | Integração concorrente de 2026-10-15 (B+C+áudio+T14/T41 bloqueadas+trabalho novo em parciais); os dois CI estão vermelhos. Não integrada. |
| T14/T41 pontes (`codex/m01-t14-t41-bridge-finish-v2`) | BLOCKED na própria fonte (verifier/perf FAIL, CI vermelho). |
| Branches pré-V7 excluídas pela V7 (autoridade near/far, RNG por formação, locomoção de fuzileiros, sectores distantes, Ju 87 closeout…) | Protótipos ou falhas por resolver; ver auditoria na issue #72. |
| `claude/m01-audio-real-v1` (T45) | WIP não verificado; SFX exigem revisão de licença. |

## Pendentes reais (não desenvolvidos)
T38 posturas de combate, T43 política de LOD, T46 mistura/opções de áudio, T47 fogo do ckm, T48 retirada alemã;
mais as partes em falta das parciais (T02b, T03, T05, T06, T07, T24, T26, T34, T36, T37). T51/T52 são humanos.
