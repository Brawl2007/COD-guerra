# Estado verificado do projeto

## Onze tarefas parciais aceites — 2026-10-16

O lote `M01-PARTIALS-COMPLETION-INTEGRATION-V1` fecha T02/T03/T05/T06/T07/T14/T24/T26/T34/T36/T41. Fonte aceite `e377a0739906507dee63cd4006a3428efd22c56b`, branch `codex/m01-partials-browser-sampling-repair-v1`; produção idêntica à certificada `9a679c50`. Verificador independente PASS e revisão crítica ACCEPT; provas, limites e histórico no `docs/verification/m01-runtime/partials-completion-integration-v1/HANDOFF.md`. Node874/874, tooling173, build,24rotas causais,24futuros ON/OFF,299ficheiros protegidos, controlos integrais das pontes0 e44regressões acopladas passaram. A captura Stuka foi corrigida e validada separadamente; os runs anteriores42/44 e13/14 continuam FAIL, sem alegar uma execução integral44/44. O handoff contém a execução final e os resultados exatos da correção.

**37 tarefas principais confirmadas;15 por fechar**, incluindo T53. T21/PR65 e T50/PR66 são candidatos existentes fora deste lote. M01 continua PROTÓTIPO JOGÁVEL; playtest humano e performance no PC-alvo pendentes. As variâncias T24-CAMERA-01 e T36-EXPOSURE-01 e os FAIL históricos permanecem explícitos; main não é modificada.

O conteúdo abaixo é histórico e conserva o estado da respetiva data.

Fonte de verdade: Git, depois provas ligadas a um HEAD. Este ficheiro é um retrato datado.
Antes de agir, revalidar com os comandos de `README.md`. Nunca usar este ficheiro como autoridade
sobre o estado mutável sem reverificar.

**Auditoria:** 2026-10-08, Captain (Claude Code), sessão `COD-GUERRA-CAPTAIN-PRODUCTION-TAKEOVER-V1`.

## Referências Git verificadas

| Referência | SHA | Estado verificado |
|---|---|---|
| `main` | `72bbcdd` (2026-10-01) | Antecessora da V7: a V7 está **340 à frente, 0 atrás** (GitHub compare API). Integração futura linear. **Não tocar sem autorização.** |
| V6 `codex/m01-final-production-consolidation-v6`, PR #57 → V5 | `cbc7de5` | Ancestral da V7. Node 460/460, CI crítico 6/6. Fallback documentado. |
| **V7** `codex/m01-final-production-consolidation-v7`, PR #59 → V6 | `7a5800e` | **VALIDATION_IN_PROGRESS.** O run browser integral 37851294926 (HEAD testado `13b14fe`) estava `in_progress`. **Não aprovada.** Owner: GPT Sol/Codex. |
| Infra Capitão V3 | `2645f3f` (sobre `99309d9`) | Commit só de adições (`.agent/`, `.claude/`), ausente da V7. |
| Branch de direção (esta) | `claude/captain-direction-v1` = `7a5800e` + cherry-pick da infra | Só documentação de planeamento. **Não é base de implementação.** Sem push. |

Relações provadas: `V6 ⊂ V7`. `src/game`, `src/world` e `missions/` são **byte-idênticos V6↔V7**:
o delta da V7 são sete módulos de render, testes, CI e docs.

O clone local é **shallow**: `git merge-base` não encontra a `main`. Para relações com a `main`,
usar a API (`gh api repos/Brawl2007/COD-guerra/compare/A...B`).

## Entregas (matriz da V7, `docs/verification/m01-runtime/final-approved-deliveries-integration-v7/DELIVERY_MATRIX.md`)

| Estado | Entregas |
|---|---|
| Integradas na cadeia V5→V6 | Animation contract (`src/game/m01-animation-presentation.js`), seis clips de soldado, vegetação/folhagem, áudio de batalha (`src/core/battlefield-audio.js`), HUD cinemático (`src/ui/m01-hud.js`), FX V3, pontes V2, Ju 87 da V6, MG34 deitada (simulação desde `fbaac1e4`) |
| Admitidas na V7 (pendentes de CI) | Station Visual Fidelity V3 (#54); armas só até `7dbc0a5`; decals de dano ambiental |
| Excluídas, com motivo | Quatro commits de armas após `7dbc0a5` (falha de recarga); Ju 87 `e145027` (55/61 browser); Distant Battlefield (54/63, sem áudio sincronizado); pilotos authority/RNG/locomotion; Animation Resolver (não existe) |
| Só documentação, fora do trunk | PR #58 M02–M30 (`7849522`, 29 dossiês + 29 mapas + roadmap técnico); PR #44 narrativa 30 missões (`3fc04b2`); PR #56 direção criativa M01 (`03b61a3`) |
| Isolados | Quatro WIP da issue #55: identidade não estabelecida |

## Lacunas de jogo confirmadas no código da V7

- **ckm wz.30:** guarnição, idle/abandono e retirada na simulação. **Sem disparo nem munição.**
  Grep em todas as branches remotas, `src/game`: nenhuma implementação. Assets e clips existem.
- Playtest humano: nunca feito. Só playthroughs automáticos.
- FPS no Chromebook: nunca medido. Só SwiftShader.
- Animation Resolver: ausente (pré-requisito transversal S17).

### Documentação desatualizada (corrigir na base validada, não antes)

- `DEVELOPMENT_STATUS.md` (secção histórica do ckm/MG34): diz "motor não tem pose `prone`".
  **Falso:** a simulação tem `proneGunner`, `canMG34Fire` e `updateMG34Posture`, com testes
  `tests/m01-mg34-prone-*.test.js`. A ligação do municiador não foi reverificada.

## Oito alterações pendentes da M01 original (PROTEGIDAS: não tocar)

Worktree `~/projetos/COD-guerra`, branch `codex/m01-battlefield-fx-capture-timing-fix-v1` @ `99309d9`, por commitar.

| Ficheiro | Comparação com a V7 (blob) |
|---|---|
| `src/render/m01-atmosphere.js`, `m01-battlefield-fx-profile.js`, `m01-fx-textures.js`, `tests/m01-battlefield-fx-polish-v3.test.js`, `tests/m01-battlefield-fx.test.js` | **Idênticos** à V7 |
| `src/render/m01-view.js` | Difere: a V7 tem a versão evoluída |
| `tests/browser/m01-battlefield-fx-polish-v3.spec.js` | Difere: a V7 tem `armFxCapture` e diagnóstico de timeout (superset aparente). Índice ≠ worktree. |
| `.github/workflows/m01-battlefield-fx-capture-timing-fix-v1.yml` | Untracked. Workflow da própria branch. |

Conclusão provisória: o conteúdo parece absorvido pela V7. Mesmo assim fica preservado até
decisão humana. Nunca fazer stash, reset ou checkout nessa worktree.

## Limites do ambiente

- Disco: cerca de 1,3 GB livres (81 %). Dez worktrees. **Não criar mais worktrees.**
  `node_modules` tem cerca de 92 MB por worktree.
- Checkout esparso nesta worktree: `docs/` excluído (exceto `docs/direction/`) e `*.glb` excluídos.
  Ler o resto com `git show HEAD:<path>`.
- Chromium do Playwright em cache (`chromium-1208`). O browser local é SwiftShader: não serve para medir FPS.
- Chromebook: correr os agentes **sequencialmente**. Testes browser integrais longos ficam para o CI do GitHub.
- Sem push nem merge sem autorização. `main` e deploy são do utilizador.
