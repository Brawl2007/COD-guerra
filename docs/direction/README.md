# Direção do COD-guerra (Captain): ler primeiro

## Onze tarefas parciais aceites — 2026-10-16

O lote `M01-PARTIALS-COMPLETION-INTEGRATION-V1` fecha T02/T03/T05/T06/T07/T14/T24/T26/T34/T36/T41. Fonte aceite `e377a0739906507dee63cd4006a3428efd22c56b`, branch `codex/m01-partials-browser-sampling-repair-v1`; produção idêntica à certificada `9a679c50`. Verificador independente PASS e revisão crítica ACCEPT; provas, limites e histórico no `docs/verification/m01-runtime/partials-completion-integration-v1/HANDOFF.md`. Node874/874, tooling173, build,24rotas causais,24futuros ON/OFF,299ficheiros protegidos, controlos integrais das pontes0 e44regressões acopladas passaram. A captura Stuka foi corrigida e validada separadamente; os runs anteriores42/44 e13/14 continuam FAIL, sem alegar uma execução integral44/44. O handoff contém a execução final e os resultados exatos da correção.

**37 tarefas principais confirmadas;15 por fechar**, incluindo T53. T21/PR65 e T50/PR66 são candidatos existentes fora deste lote. M01 continua PROTÓTIPO JOGÁVEL; playtest humano e performance no PC-alvo pendentes. As variâncias T24-CAMERA-01 e T36-EXPOSURE-01 e os FAIL históricos permanecem explícitos; main não é modificada.

O conteúdo abaixo é histórico e conserva o estado da respetiva data.

Ponto de entrada para qualquer sessão futura do Captain. Ordem de leitura:

1. Este ficheiro: procedimento de recuperação e último handoff.
2. `PROJECT_STATE.md`: branches/HEADs verificados, entregas, lacunas e limites do ambiente.
3. `DECISIONS.md`: decisões tomadas e pendentes de decisão humana.
4. `PROGRAM_GRAPH.json`: próximas tarefas, com dependências, agentes, critérios e provas.
5. `CAMPAIGN_PLAN.md`: direção, escada de estado, sistemas globais, 30 missões, fases.
6. `M01_TASK_STATUS.md`: estado de T00–T52 do roadmap do M01.

## Recuperação (no início de cada sessão)

```bash
git fetch origin --prune
python3 .agent/tools/task_discovery.py            # runs a retomar (nunca re-init)
gh pr view 59 --json headRefOid,isDraft,state     # V7
gh run list --branch codex/m01-final-production-consolidation-v7 --limit 3
gh api repos/Brawl2007/COD-guerra/compare/main...<branch>   # clone shallow: usar API para relações com main
git -C ~/projetos/COD-guerra status --short        # as 8 alterações protegidas continuam lá? (só ler)
df -h ~                                            # espaço
```

Depois: escolher em `PROGRAM_GRAPH.json` o primeiro nó READY (dependências DONE, sem bloqueio humano).
Criar o Task Contract e um `RUN_ID`, e correr o skill `autonomous-task`
(implementer → verifier → reviewer). Atualizar o estado do nó e este handoff.

## Rotas dos agentes (perfis em `.claude/agents/`)

| Trabalho | Agente |
|---|---|
| Leitura/descoberta estreita | `explorer` (Haiku) |
| Implementação com âmbito fechado | `implementer` (Sonnet) |
| Simulação/determinismo/falhas persistentes | `implementer-deep` |
| Verificação independente | `verifier` (Sonnet, high) |
| Revisão normal | `reviewer` |
| Simulação, saves, integração, arquitetura | `reviewer-critical` (Opus) |

Os agentes correm sequencialmente (Chromebook). O Explorer não tem Bash: com o checkout esparso, exportar
primeiro para o scratchpad os documentos de `docs/` de que ele precisa.

## Branch de integração (2026-10-10)

`claude/m01-integration` = jogo da pilha T16→T17→T18→T42→T35→T39 (`m01-viewmodel-feel-v2`) + T20 (impostores da
frente distante) + T44 (grading) + a direção, os 30 agentes, os hooks e o `ci.yml` desta linha. É a versão que o
utilizador joga (`bash ~/jogar.sh claude/m01-integration`) e a base de todas as tarefas novas; cada tarefa ACEITE
entra aqui por merge (regra em `.claude/agents/captain.md`).

## Visão do utilizador (2026-10-10)

"Sentir a guerra, a sensação verdadeira, como se você fosse só mais 1 soldado no meio da grande guerra, sentindo o
impacto." Vale para as 30 missões. Detalhe, tarefas da M01 que a servem (T17, T20, T23, T25) e proposta H9
(escala histórica por missão) em `DECISIONS.md`.
Segundo pedido: dificuldade e perigo real, com fases difíceis em cada missão (H10).
Terceiro pedido: gráficos, som e animação ao nível de COD: World at War, sem copiar nada do COD (H11).
Quarto pedido: efeitos sonoros fortes e música sombria durante o jogo, com silêncios nos momentos certos (H12).
O computador de referência do jogo passa a ser o PC de teste do utilizador, que corre COD WaW; o Chromebook só
corre o Claude Code (H13).

## Último handoff: 2026-10-08

- **Estado:** PLANEAMENTO CONCLUÍDO; desenvolvimento **à espera do portão G-V7**.
- **Branch:** `claude/captain-direction-v1` (local, sem push). Base: V7 `7a5800e` + infra `2645f3f` (cherry-pick).
- **Feito:** auditoria de branches/PRs/V7; comparação das oito alterações protegidas; reconciliação de T00–T52;
  plano das 30 missões; grafo do programa.
- **Delegações:** explorer ×3 (uma BLOCKED por checkout esparso e repetida com o roteiro exportado), verifier ×1.
  Nenhum teste executado nesta sessão.
- **Próximo passo executável:** assim que o utilizador fornecer o HEAD validado da V7 (H1):
  1. `git switch -c claude/m01-dev-base-v1 <HEAD_V7>`
  2. `git cherry-pick 2645f3f <commits de docs/direction>`
  3. `npm ci && npm test`, só Node; antes de instalar, confirmar que há pelo menos 300 MB livres
  4. Nó `DOC-SYNC`
  5. Nó `M01-T03`
