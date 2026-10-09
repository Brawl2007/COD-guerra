# Jev Decision Support (V2)

Complemento do piloto de roteamento (`JEV_ROUTING_PILOT.md`). Seis capacidades consultivas, um único motor: `.agent/tools/jev_decisions.py` (somente stdlib). **Regras locais primeiro**; o Jev só é consultado em casos ambíguos. O Capitão mantém a decisão final.

## Capacidades

| Comando | Entrada principal | Saída (`recommendation`) |
|---|---|---|
| `priority` | `tasks[]`: id, title, gameplay_impact, severity, blocked_by, regression_risk, effort, delivery_state, m01_benefit, evidence | ranking + tier `p0..p3`; bloqueadas = `deferred`; sem evidência = `insufficient_evidence` (fora do ranking) |
| `bug` | title, summary, files, symptoms, evidence | categoria (gameplay, rendering, animation, soldier_ai, assets, audio, tests_ci, infrastructure, integration), severidade, `route_to`; sempre `status: unverified`, `fixed: false` |
| `branch` | branch, head, tests, review, files_changed, dependencies, known_conflicts, base_compat | `review_candidate`, `needs_tests`, `potential_conflict`, `in_progress`, `eligible_for_integration_review`; sempre `actions_forbidden: [merge, cherry-pick, push, approve_pr]` |
| `risk` | files_changed, change_type, summary | `low`/`medium`/`high` |
| `verify` | files_changed, change_type | testes recomendados + `mandatory_checks` |
| `cost` | role, risk, complexity, fix_attempts, critical | `haiku`/`sonnet`/`sonnet_high_effort`/`opus` + `consult_jev` yes/no (reutiliza `jev_router.rule_decide/route`) |

Exemplo:

```
python3 .agent/tools/jev_decisions.py risk --input risk.json --json --offline
# risk.json: {"files_changed": ["src/save/store.js"], "change_type": "bugfix", "summary": "..."}
python3 .agent/tools/jev_decisions.py branch --input branch.json --json
# branch.json: {"branch": "claude/x", "head": "abc1234", "tests": "passed", "review": "approved",
#               "base_compat": "compatible", "known_conflicts": [], "files_changed": []}
python3 .agent/tools/jev_decisions.py usage
```

Flags: `--json --offline --dry-run --enable-jev --run-id ID --min-confidence 0.6 --limit N` (`verify` aceita `--mandatory "a,b"`).

## Formato do resultado

`capability`, `observed` (campos sanitizados realmente usados), `recommendation`, `confidence` (null sem resposta do Jev), `reason`, `source` (`rule`|`rule_fallback`|`jev`), `needs_review` (`human`|`technical`|`none`), `advisory: true`, `fallback_reason` quando aplicável, `usage` em chamada real. Evidência ausente: `recommendation: insufficient_evidence`, `needs_review: human`, nenhuma chamada ao Jev.

## Gate, orçamento e offline

Jev só é chamado se: caso ambíguo pelas regras locais **e** (`--enable-jev` ou `COD_JEV_PILOT=1`) **e** chave **e** orçamento **e** sem `--offline`. Motivos de fallback idênticos ao `route()`: `disabled`, `offline`, `no_key`, `insecure_key_file`, `ledger_unreadable`, `budget_exhausted`, `low_confidence`, `error`; mais `unsafe_jev_output` (resposta válida, mas barrada por um filtro de segurança). Vários questions (choice) vão em UMA requisição = UMA chamada paga. O ledger e o teto de 100 chamadas são **compartilhados** com o `jev_router` (`PILOT_MAX_PAID_CALLS = 100`). Sem retry; timeout 15 s; sem redirecionamento. Tudo funciona 100% offline com as regras.

## Segurança

- Payload: só campos de uma whitelist, strings truncadas (300), listas (50; `observed.files_truncated=true` quando cortada), caracteres de controle removidos. As regras (áreas críticas, piso de risco/severidade, conjuntos de verify, branch) rodam sobre os valores brutos-limpos (só controle e limite de tamanho), varrendo até 2000 itens e 1000 chars por caminho; acima de 2000 itens `needs_review=human` sem Jev e sem baixar o piso. A redação vale só para `observed` e o payload do Jev (entradas de caminho não sofrem a redação de tokens longos, só os padrões explícitos de chave); padrões de chave (`sk-...`, `Bearer ...`, `api_key=...`, tokens longos, a própria chave) são redigidos antes de montar o payload. Nunca conteúdo de arquivos.
- Resposta do Jev é não confiável: validada e depois limitada por filtros: risco nunca abaixo do piso da regra (áreas críticas: simulação, save/persistência, determinismo/RNG, arquitetura, integração; histórico/missão em código = high, em dados/docs/testes = medium); `eligible_for_integration_review` exige testes passed + review approved + sem conflitos + base compatível; checks obrigatórios: `npm test` sempre; `npm run build` é exigido por regra para mudanças de código e `npm run test:browser` para mudanças de runtime/visual, e o Jev nunca remove esses checks quando a regra os exige; `branch` com testes não passados nunca vira `review_candidate`/`eligible_for_integration_review` por resposta do Jev; severidade de bug em área crítica nunca abaixo de medium; bug nunca "fixed"; verifier/reviewer nunca removidos.
- O Jev nunca autoriza merge, push, aprovação de PR, operações destrutivas, pular testes ou revisão.
- Chamada real imprime em stderr `JEV START` / `JEV RESULT` / `JEV END` (stdout `--json` permanece JSON puro). Use `--dry-run` para ver o payload (`Bearer ***`).
