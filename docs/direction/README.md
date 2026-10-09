# Direção do COD-guerra (Captain): ler primeiro

Ponto de entrada para qualquer sessão futura do Captain. Ordem de leitura:

1. Este ficheiro: procedimento de recuperação e último handoff.
2. `PROJECT_STATE.md`: branches/HEADs verificados, entregas, lacunas e limites do ambiente.
3. `DECISIONS.md`: decisões tomadas e pendentes de decisão humana.
4. `PROGRAM_GRAPH.json`: próximas tarefas, com dependências, agentes, critérios e provas.
5. `CAMPAIGN_PLAN.md`: direção, escada de estado, sistemas globais, 30 missões, fases.
6. `M01_TASK_STATUS.md`: estado de T00–T52 do roadmap do M01.
7. `AGENT_SETUP.md`: modelos dos agentes, arranque, Advisor Fable e verificação local.
8. `PLAYTEST_M01.md`: ficha do primeiro playtest humano (preencher no Chromebook e devolver no chat).

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
| Leitura/descoberta estreita | `explorer` / `Explore` (Haiku) |
| Documentação, licenças, fontes externas | `researcher` (Haiku) |
| Implementação com âmbito fechado | `implementer` (Sonnet) |
| Simulação/determinismo/falhas persistentes | `implementer-deep` |
| Verificação independente | `verifier` (Sonnet, high) |
| Revisão normal | `reviewer` |
| Simulação, saves, integração, arquitetura | `reviewer-critical` (Opus) |

Os agentes correm sequencialmente (Chromebook). O Explorer não tem Bash: com o checkout esparso, exportar
primeiro para o scratchpad os documentos de `docs/` de que ele precisa.

## Handoff mais recente: 2026-10-09 (playtest 1 da M01)

- **Onde está:** `docs/direction/PLAYTEST_M01.md`, secção 10, na branch `claude/gracious-franklin-u8kdin` (commits `2cc4f24` e `d1aef41`). Esta branch não está em `main`.
- **Para ver este estado:** `git fetch origin claude/gracious-franklin-u8kdin`, depois o bloco do topo de `docs/NEXT_CHAT_CONTEXT.md`.
- **Estado:** aguarda as respostas do utilizador (H7 em `DECISIONS.md`) e uma ordem para avançar. Nenhuma alteração de código por causa do playtest.
- **Decisão pendente:** escopo do resolvedor de animação e da cobertura dos soldados da M01 (H6 em `DECISIONS.md`).

## Handoff anterior: 2026-10-08

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
