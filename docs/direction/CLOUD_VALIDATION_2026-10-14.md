# Validação real dos agentes na cloud — 2026-10-14

Sessão Claude Code cloud (`CLAUDE_CODE_ENTRYPOINT=remote`, ambiente `cloud_default`, Claude Code 2.1.300),
branch `claude/vigilant-clarke-p0qknc` = `origin/main` = `3a3b3ff` (merge do PR #60). Diagnóstico só de leitura:
sem merge, deploy, alterações à `main`, `npm ci` nem publicação de checkpoints. Nenhum `fable-*` executado.
O teste de fumo local dos 20 agentes (2026-10-09, Chromebook) não foi repetido.

## Resultado por etapa do `CLOUD_ROLLOUT_CHECKLIST.md`

| # | Verificação | Resultado | Evidência |
|---|---|---|---|
| 2 | Repo e commit esperados | OK | `git rev-parse HEAD` = `3a3b3ff7b276ed7a8bfa48b4c1a355ef1de11c81`, igual a `origin/main` |
| 2 | Agentes carregados | OK, 30/30 perfis listados como tipos de subagente (inclui os 20 `<modelo>-<esforço>`) | lista de agentes da sessão; `claude_setup_check.py`: `[OK] 20 combination agents`, 0 avisos |
| 2 | Skills | OK, as 7 skills do projeto disponíveis; `context-audit` carregou dentro do subagente `captain` | lista de skills da sessão; relato do `captain` |
| 2 | Hook `SessionStart` | OK, só leitura: sem `COD_GUERRA_AUTOINSTALL_DEPS`, não instalou (`node_modules` ausente) | `env`, `ls node_modules` |
| 2 | Hook `git-safety` (PreToolUse) | OK na sessão principal **e** em subagente | `git push --dry-run origin HEAD:main` → `BLOCKED by COD-guerra Git Safety: direct push to main is forbidden` (principal e `sonnet-low`) |
| 3 | Modelo/esforço reais | OK | `agent_models_report.py --hours 2`: `haiku-low` claude-haiku-5-5×2 low×2; `sonnet-low` claude-sonnet-5-5×2 low×2; `captain` claude-opus-5-5×2 high×2; principal claude-opus-5-5 high |
| 4 | Delegação read-only para Haiku | OK, ~9,5 k tokens, 3 s | `haiku-low` listou 3 ficheiros de `src/game` |
| 4 | Delegação para Sonnet | OK, ~11,7 k tokens, 6 s | `sonnet-low` reportou branch/HEAD e o bloqueio do hook |
| 3 | `Agent(...)` do Captain | **FALHA** como subagente: o `captain` não tem a ferramenta Agent | relato do `captain` (~29 k tokens); causa abaixo |
| 5 | Checkpoints | `list` → `[]`, sem ref `cod-guerra/*` no remoto | `cloud_checkpoint.py list`; `git ls-remote origin 'refs/heads/cod-guerra/*'` vazio |
| 5 | Permissão de escrita em `cod-guerra/cloud-state` | **Não provada** (o `--dry-run` passou, mas não autentica a escrita real) | `git push --dry-run origin HEAD:refs/heads/cod-guerra/cloud-state` → exit 0 |
| — | Testes offline do sistema agentic | OK, 192 testes; sintaxe Bash e `settings.json` OK | `python3 -m unittest discover -s .agent/tests` (103 s) |
| — | Jev pago (TypeSafe) | **FALHA**: HTTP 401, recuo seguro para as regras | 1 chamada, run `cloud-diag-20261014`, ledger `calls 1/10 outcome=http_401` |

## O que falta (por prioridade)

1. **O Captain não orquestra na cloud.** A sessão cloud arranca como agente por omissão, não como `captain`.
   Como subagente, o `captain` não recebe a ferramenta Agent porque o ambiente define
   `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1` (subagentes não criam subagentes). Os gates implementer → verifier →
   reviewer só funcionam se a **thread principal** delegar. Opções (por decidir):
   - a) `"agent": "captain"` em `.claude/settings.json` (documentado em sub-agents.md como equivalente a
     `--agent captain`; o efeito na cloud não está documentado). Afeta também as sessões locais. Testar numa sessão
     cloud nova antes de considerar a opção concluída.
   - b) Manter a sessão principal (Opus) como Captain por instrução, como neste diagnóstico. Funciona hoje, mas
     a allowlist `Agent(...)` não se aplica.
2. **Jev pago inoperante na cloud.** `check-key` → `missing`; o proxy não injeta a credencial em
   `POST /v1/systemone` (401, mesmo com uma chave marcador) nem em `GET /v1/models` (401). Também o ambiente
   define `COD_JEV_LIMIT=10`, que limita a 10 a autorização sem teto de 2026-10-13. Correção na configuração do
   ambiente (não no repo): segredo `TYPESAFE_API_KEY` nas variáveis do ambiente cloud, ou rever a injeção do
   proxy para `api.typesafe.ai`; retirar `COD_JEV_LIMIT` se o teto não for intencional.
3. **Guarda `pre-push` (camada 2) ausente no clone cloud.** `.git/hooks/pre-push` não existe; só a camada 1
   (hook do Claude Code) protege a `main`. Proposta: o `SessionStart` corre `install-git-guards.sh` (local, sem
   rede), ou ativar a proteção da `main` no GitHub (camada 3).
4. **Continuidade entre sessões não provada.** Não há checkpoints nem ref de estado; a permissão real de escrita
   no ref só se prova com o primeiro `publish --init`, que precisa de autorização separada. Depois disso: duas
   sessões, a segunda faz `get` e retoma (checklist, etapa 6).
   *Atualização (mesmo dia, 21:34 UTC):* o utilizador criou a ref fora desta sessão (`6487334`, checkpoint
   `CLOUD-STATE-SMOKE-20261014`, `ACCEPTED`); `list` passou a devolvê-lo. A escrita a partir da sessão cloud continua
   por provar. Procedimento em `CLOUD_ENV_SETUP.md`.
5. **Jogo não testável sem opt-in.** Sem `node_modules`; `npm test`/`build` exigem `COD_GUERRA_AUTOINSTALL_DEPS=1`.
   Node na cloud: v22.22.0 (cumpre >=22.12; o CI usa 24).
6. **Cadência e quota do Max 5x** (etapa 7): não verificáveis numa sessão isolada.

## Custo desta validação

Subagentes: haiku-low ~9,5 k, sonnet-low ~11,7 k, captain ~29 k, claude-code-guide ~69 k tokens (consulta à
documentação oficial). Jev: 1 chamada, sem tokens cobrados (401). Fable: nenhum.

## Seguimento (mesma sessão, decisões do utilizador)

Decisão 1: a sessão principal (Opus) continua a ser o Captain e delega diretamente; `.claude/settings.json` não muda.
Decisão 2: a publicação de checkpoints a partir da cloud continua pendente de autorização.

| Item | Estado | Evidência |
|---|---|---|
| Guarda `pre-push` neste clone | Instalada (não havia `pre-push` nem `core.hooksPath`) | `install-git-guards.sh --check` OK; hook direto: ref `main` → exit 1 `BLOCKED`, branch de trabalho → exit 0. Efémera: repetir em cada sessão |
| Autenticação TypeSafe na cloud | Código pronto; falta a configuração do utilizador | `COD_JEV_AUTH=proxy` (sem chave, sem header `Authorization`); travão: 401/403 depois do último sucesso bloqueia chamadas pagas até `--retry-auth`. Nenhuma chamada nova feita; o ledger desta sessão mostra `auth: BLOCKED after http_401` |
| `COD_JEV_LIMIT=10` | Documentado | `CLOUD_ENV_SETUP.md` §1 |
| `__pycache__/`, `*.pyc` no `.gitignore` | Feito | `git check-ignore -v` → `.gitignore:12`/`:13` |
| Procedimento de checkpoints | `cloud_checkpoint.py validate` (só leitura) + testes | contra `origin`: `{"requires_init": false, "task_id": "CLOUD-ROLLOUT-1", "valid": true}`, `ls-remote` inalterado |
| Testes | 192 → 207 OK (15 novos: 3 checkpoint, 12 Jev) | `python3 -m unittest discover -s tests -p 'test_*.py'` em `.agent`, 105 s |

Gates: implementação por `sonnet-medium`/`sonnet-low`, leitura por `haiku-medium`/`researcher`, `verifier` PASS,
`reviewer` APPROVE. O achado LOW do reviewer (travão solto por erro de rede depois de `--retry-auth`) foi corrigido.
Fica por corrigir um LOW: dois `route` em paralelo podem passar o travão antes de o primeiro gravar o 401.
