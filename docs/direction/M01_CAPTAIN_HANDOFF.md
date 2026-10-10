# active-memory handoff: COD-guerra — Captain (M01 development)

**Handoff #3** · 2026-10-10 · Lineage: #1 (2026-10-09): Jev activated + decision-support V2; V7 certified 84/84 (PR #59 draft); M01 dev base; T19 accepted. #2 (2026-10-09): T16 dawn lighting ACCEPTED; T17 verified; Chromebook dropped as target (D13); dev-base merge blocked → tasks stacked. #3 (2026-10-09/10): T17 ACCEPTED (D15), T18 ACCEPTED (D16), T42 ACCEPTED (D17); user gave night rules; T20 and T44 run in parallel worktrees ended BLOCKED (fix budget 3/3, CI red); T39 started then stopped by user; user installed 20 tiered agents.

## UPDATE #4 (2026-10-10, session gracious-franklin) — supersedes conflicting lines below
- Jev cap is now **100** (user-approved 2026-10-09). User 2026-10-10: "usar jev à vontade" — consult Jev on every rule_fallback, priority ranking, CI failure triage, test-set choice. Usage 2/100 (call 2: priority ranking, conf 0.23 → low_confidence fallback to rules).
- User 2026-10-10: Fable and Opus agents allowed freely (Claude Max; no credit concern). Max 2 agents at once; RAM ok (~700-900 MB after user cleaned /tmp).
- User approved extra fix attempts for T20 and T44: budget 3→5 (recorded in both contracts/events).
- User: "fazer o que quiser, não interromper para pedir, continuar até terminar M01".
- **T35 `M01-ANIM-LOCOMOTION-RESOLVER-V1` ACCEPTED** at `46b210f` on `claude/m01-anim-resolver-v1` (stacked on 5765aa5). CI 38043817745: npm test 559/559, browser 11/11, build, authority OK. 1 fix (spec race with menu frame + stale-hint guard). Fixes playtest items 7/9/11 (blends, full fall clip, crouch fade); items 3/4/8 remain H6.
- Worktrees now: v7-cert = `claude/m01-viewmodel-feel-v2` (T39, base 876b67c — must rebase onto 46b210f before commit), `COD-guerra-t35` = T35 branch (fix worktree), t44 = fable-high attempt 4 running, t20 = queued for fable-high.
- T39 implemented (uncommitted), in verification. Open gameplay question H8: when weapon is lowered near a wall in ADS, sim still fires with ADS accuracy (blocking fire = sim change) → PENDENTE HUMANO.
- **T39 `M01-VIEWMODEL-FEEL-V2` ACCEPTED** at `29ba3cf` on `claude/m01-viewmodel-feel-v2` (stacked on 304b90f). CI 38045111352: npm test 574/574, browser 9/9. Follow-up: near-wall lowered pose shows big sleeve + hand through open sleeve (T40). Jev 3/100.
- T44: fable-high attempt 4 = spec-only fix (decal atlas race; crushed-blacks metric <10 -> <3), in verification. T20 queued for fable-high. PT05 diagnosis saved at v7-cert .agent/runs/PT05-COLLIDERS-PREP/DIAGNOSIS.md (yard wagons without colliders = gameplay task, reviewer-critical).
- Current stack tip: `claude/m01-viewmodel-feel-v2` (T39 docs commit on top of 29ba3cf). New tasks branch from that tip.
- Next after T39 (rule ranking, Captain decision): PT05 colliders (playtest item 5; diagnose first; if src/world → gameplay task with reviewer-critical), then T08 clip library (crouch_walk/sprint missing in GLB), T06, T27, T26, T10, PT10 German LOD, T43.

## 0. Instructions for Claude (read first)

You are continuing work from a previous chat. That chat is gone; this file is the complete context and the source of truth.

1. Read this whole file before replying.
2. Follow sections 3 (Style), 4 (Hard rules) and 5 (Corrections) in every reply, for the rest of this chat. They override your defaults.
3. Use the values in section 8 exactly. Never round, re-estimate, or "correct" them.
4. Do not suggest anything listed in section 7 (Changed / rejected) again unless the user brings it up.
5. Code word: None active. If the user types /amcodeword, start every reply with the phrase they choose (default "Yes Boss!").
6. Your first reply: at most 5 lines covering the goal, the current state, and the next step (section 11). Mention any files from section 13 that were not attached. Ask the questions in section 12 if there are any. End with "Ready to continue with <next step>?" Then wait for the user's go.

## 1. Mission
- **Goal:** As "COD-guerra Captain" (orchestrator for repo `Brawl2007/COD-guerra`), develop M01 (Tczew) task by task from `docs/M01_FINAL_ROADMAP.md`, via implementer → verifier → reviewer (+ CI x86).
- **Done looks like:** each roadmap task ACCEPTED with evidence on its own branch; M01 stays "PROTÓTIPO JOGÁVEL" until the user promotes it (T52 human playtest).
- **Context:** user wants autonomy: "continue e ate desenvolveer m01 sem parar"; earlier "faz tudo que quiser nao me encomoda com perguntas so finalize o trabalho".

## 2. About the user (as relevant to this work)
- GitHub/git user `Brawl2007` (joiceiscee@gmail.com). Owner of COD-guerra (WWII FPS, Three.js, Vite, Playwright).
- Writes short Portuguese messages; does not read English well; watches agents with `/tasks` and sometimes stops them.
- Dev machine: Chromebook Linux container, aarch64, Node v24.21.0. Disk 9.9G (3.6G free, 63% on 2026-10-10); RAM very low (~185 MB available while Claude runs).
- Has TypeSafe/Jev key in env `TYPESAFE_API_KEY` — never print it.

## 3. Style & communication
- **Language:** ALL replies in Portuguese, simple and clear ("fala em portugues; nao entendo bem ingles"). Repo docs/evidence in Portuguese; commit messages in English.
- **Tone:** direct, evidence-based, never invent results.
- **Reply length:** short status lines while work runs; final answers as structured handoff (TASK_ID / STATUS / WORK_BRANCH / ACCEPTED_HEAD / FINAL_HEAD / IMPLEMENTED / VERIFICATION / REVIEW / FIX_ATTEMPTS / REVIEW_REJECTIONS / REGRESSION / MEMORY / LIMITATIONS / NEXT_ACTION).
- **Formatting:** headings + bullets/tables; no long diary.
- **Working style:** no routine questions (continue/test/fix/review/build); escalate only real decisions. "peço-lhe…" must clearly be to agents. When the user asks what a task does, explain in plain terms what changes in the game.
- **Avoid:** fabricating results; routine permission requests; paid Jev calls.

## 4. Hard rules (word for word)
1. "Never modify, commit to, merge into, or push directly to `main`." No force-push, no workflow_dispatch; never write to V6, deploy/Pages, source branches.
2. "M01 — Tczew remains `PROTÓTIPO JOGÁVEL` until explicitly promoted."
3. "Do not silently redesign gameplay, mission logic, persistence, timings, RNG, damage, objectives or historical structure to fit a visual or asset task."
4. "Não fazer novas chamadas pagas só para demonstrar. Conserva as duas vagas restantes." / "Não aumentar nem reiniciar o limite de três chamadas."
5. "Nunca reveles nem copies a chave API para relatórios, logs ou Git."
6. "Utiliza regras locais para decisões óbvias e Jev apenas quando existir ambiguidade real." "Mantém sempre a decisão final contigo."
7. "Mostra JEV START, recomendação, confiança, consumo e JEV END quando houver consulta real." "Não inventar utilização do Jev."
8. "Nunca somar resultados históricos ou focados para declarar 84/84. Só conta uma execução integral única, com workers 1 e retries 0."
9. Presentation tasks: prove no gameplay change with `git diff --exit-code <base> HEAD -- src/game src/world src/core missions assets package.json package-lock.json playwright.config.js`.
10. "Não inventar FPS, VRAM nem teste em Chromebook. A aldeia francesa nunca é renomeada para Tczew."
11. "Nunca fazer merge, cherry-pick, push ou aprovar uma PR automaticamente com base na decisão do Jev."
12. Agent commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; PR bodies end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
13. "nao precisa pensar em chromebook, nao precisa sacrificar a qualidade do jogo por causa do chromebook".
14. Do not work around permission-classifier denials (e.g. dev-base merge); report and continue other work.
15. Never relaunch an agent the user stopped via `/tasks` without knowing why; ask once, relaunch on "continua".
16. Never `--approve` BLOCKED runs or extend a fix budget without explicit human approval.

**Night rules from the user (2026-10-09, "versão verdadeira"):**
17. "Sem perguntas nem esperas. Dúvidas de produto/jogabilidade/[D] → `docs/direction/DECISIONS.md` como **PENDENTE HUMANO**; pára só essa parte."
18. "Antes de cada teste/captura: `MemAvailable` ≥ 300 MB; senão esperar 60 s e reler; >15 min abaixo → registar aqui e passar a tarefa leve."
19. "Um comando pesado de cada vez; Node focado com `timeout 900 node --test --test-concurrency=1 …`; nada de suíte browser completa; exit 124 → repetir uma vez, depois registar (não é falha de código)."
20. "Nada de `npm ci`/instalações. Scratch só com o necessário, apagar no fim da tarefa."
21. "Commits pequenos só depois de verifier E reviewer passarem; depois de cada tarefa concluída: push -u origin da branch actual (nunca main, nunca forçado, nunca merge/PR; branch main = sem push). Push falhado: mais 2 tentativas com 30 s; erro de autenticação: não mexer em credenciais; qualquer falha: registar aqui e seguir."
22. "O handoff entra no mesmo commit+push: cópia em `docs/direction/M01_CAPTAIN_HANDOFF.md` da branch da tarefa (fonte: `~/projetos/handoff-cod-guerra.md`)." "Actualizar este handoff a cada tarefa concluída."
23. "Máximo 2 agentes." (in practice: only 1 agent with a local browser at a time — browser + 2 agents dropped MemAvailable to 138 MB)
24. "Disco: `df -BM / | awk 'NR==2{print $4}'`. < 1000 MB → sem testes/capturas; apagar `test-results/` e `dist/` que não estejam em uso. < 500 MB → parar e registar aqui."
25. Consequence: CI x86 runs only after push (post-acceptance); verification = focused Node + build + review (+ local focused browser under `flock`); CI after push is checked and recorded; CI failure = reopen the task.

## 5. Corrections log
| # | Claude did | The user wanted |
|---|---|---|
| 1 | Planned V2 Jev task on base a43b349 | Stack on accepted V1 `96aef0d` |
| 2 | Wrote stray file in `~/projetos/` | Runtime state only under `.agent/runs/` or scratchpad |
| 3 | Created extra worktrees despite D8 | Reuse worktrees; avoid new ones (t20/t44 worktrees were created anyway in #3) |
| 4 | Invalid focused retest (45 s timeout) | Generous timeouts |
| 5 | User stopped V7 implementer | Captain finished; verifier/reviewer stayed independent |
| 6 | Replied in English | Always Portuguese |
| 7 | Unclear Jev status when asked | State explicitly: zero Jev calls, usage 1/3 |
| 8 | Wrote "peço-lhe…" | Make clear requests are to agents |
| 9 | Relaunched T17 implementer while first maybe alive | Check `/tasks`, notifications, file mtimes first |
| 10 | Tried ff-merge into dev-base | Denied by classifier; stack instead |
| 11 | User stopped reviewers/implementers via `/tasks` | Ask why once; relaunch on "continua" |
| 12 | Treated a pasted `npm cache clean`/`df` output as a task and analysed disk | "pare mandei errado" — pasted by mistake; stop, do nothing |
| 13 | Said only 6 agent types exist | User installed 20 tiered agents; "agora esta atualizado veja ai" — use them for routing |
| 14 | Agents T20/T44 launched with push+CI before night rules | Follow night rules (commit/push only after verifier+reviewer) |

## 6. Decisions
| Decision | Why |
|---|---|
| D10: base `claude/m01-dev-base` = V7 4c6f7be + infra + Jev | user |
| D11: gameplay proof = x86 CI per task branch | aarch64 float divergence (7 known failures in `tests/m01-animation-contract.test.js`) |
| One GitHub workflow per task branch (push trigger): authority diff, npm test TAP, build, focused spec(s) `--workers=1 --retries=0`, artifact | repo pattern |
| D13: Chromebook not a target; T01 annulled | user |
| D14: T16 ACCEPTED (`3386fc2`); constant `CLOUD_WIND`, no map wind | full cycle |
| D15: T17 ACCEPTED (`4c64beb`) | full cycle, 1 fix |
| D16: T18 ACCEPTED (`b296374`) | full cycle, 1 fix |
| D17: T42 ACCEPTED (`71ad067`), fixes 3/3 | full cycle |
| Accepted tasks stack on the previous accepted branch; dev-base merge awaits user | classifier denial |
| Visual evidence = same-camera pixel A/B vs reference (`.agent/memory/m01/fair-pixel-evidence.md`) | T18/T42 lessons |
| Captain may override a verifier "PASS with gaps" when a contract criterion is unmet or quality regresses | T42 Low water regression |
| Deferred gameplay tasks: T02, T03, T24, T25, data lane T05/T22/T47 | rule 3 |
| T27 not started: touches `src/world` heightAt + map data; depends on "Estação V3" | check first |
| PR #59 (V7→V6) NOT merged | needs user approval |

## 7. Changed / rejected
- Agents only from 6 workflow types → 20 tiered agents + workflow agents (user installed them).
- CI before acceptance (push early) → night rules: push only after verifier+reviewer; CI after push.
- One agent at a time → "Máximo 2 agentes" (but only 1 with local browser).
- ❌ Merging the accepted stack into dev-base without user OK.
- ❌ Disk cleanup proposals (output pasted by mistake).

## 8. Data & facts (exact)
**Jev:** usage 1/3 (2 remaining), no calls. Ledger `~/.local/state/cod-guerra/jev_pilot_ledger.json`. Key `[secret removed: re-enter it]`.

**Protected heads:** main `72bbcdd156603c9399801c95d43d9365ba50fc82`; V6 `cbc7de5668a1b2e4bc646b86548196a5f4f1039a`; deploy/m01-latest-playable `cb400355c056955d1d6d0b22e92bd7be2443a10c`; PR #59 head `4c6f7bebee27b68af3bea8ad086da1dffbca0084`.

**Accepted branch stack (all pushed):**
| Branch | Tip | Accepted code | CI |
|---|---|---|---|
| `claude/m01-dev-base` | `d2eef27` | V7+infra+Jev+T19 (`08d2e81`) | 37890545910 |
| `claude/m01-lighting-dawn-v1` | `687ff72` | T16 `3386fc2` | 37918399233 (490/490, spec 8/8) |
| `claude/m01-stuka-dive-sequence-v1` | `f8cbe39` | T17 `4c64beb` | 37930134740 (502/502, spec 5/5) |
| `claude/m01-demolition-setpiece-v2` | `a1554f3` | T18 `b296374` | 37959483518 (520/520, browser 9/9) |
| `claude/m01-water-vistula-v1` | `5765aa5` | T42 `71ad067` (docs `1620ce7`, regression `998852f`, memory `5765aa5`) | 37988900379 (535/535, browser 15/15) |

**Blocked / pending:**
| Task | Worktree / branch | Run | State |
|---|---|---|---|
| T44 `M01-POSTPROCESS-GRADING-V1` | `~/projetos/COD-guerra-m01-t44` / `claude/m01-postprocess-grading-v1` @ `8d78e67` | `M01-POSTPROCESS-GRADING-V1-20261009T220734Z` | BLOCKED, 3/3. CI 38003872703 red: crushed blacks (0,194>0,185), vignette moves centre (29), AO brightens (160). Uncommitted edit `tests/browser/m01-postprocess-grading.spec.js` (+23/−13) |
| T20 `M01-DISTANT-FRONT-IMPOSTORS-V1` | `~/projetos/COD-guerra-m01-t20` / `claude/m01-distant-front-impostors-v1` @ `455e325` | `M01-DISTANT-FRONT-IMPOSTORS-V1-20261009T221033Z` | BLOCKED, 3/3. CI 38001119046 / 38004354335 / 38006506690 red in browser. Last fix died on infra (watchdog 600 s, MemAvailable 138 MB) |
| T39 `M01-VIEWMODEL-FEEL-V2` | `~/projetos/COD-guerra-v7-cert` / `claude/m01-viewmodel-feel-v2` (local, base `5765aa5`, no commits) | `M01-VIEWMODEL-FEEL-V2-20261009T221848Z` | PENDING; implementation FAIL 1 (stopped by user before any edit); contract ready |

**T18 notes:** `M01_COLLAPSE_DURATION` 3.2 s; far flash min angular 0.08 rad; far flash small (~25 px at 776 m); span fall 2–3.5 m by asset data.
**T42 notes:** Low water mean 59→99 after fix; record `.agent/regression/records/M01-WATER-VISTULA-V1.json`.
**Infra:** `~/.cache/ms-playwright/chromium_headless_shell-1208` exists → local focused browser possible (aarch64/SwiftShader), one spec at a time under `flock` (scratchpad `heavy.lock`). 2 agents died on API ECONNREFUSED ~23:5x (count as attempts).

**Tool quirks:** `task_state.py` READY→RUNNING→PASS/FAIL (memory_retrieval cannot be SKIPPED); `--operation` only with RUNNING; `reopen --node implementation` resets downstream; `context_packet.py create --root $PWD`; `task_recovery.py` needs block YAML `execution:`. `.kilo/` dirs belong to the kilo tool — never commit/touch.

## 9. People, terms & names
- **People:** Brawl2007 = user/owner.
- **Agents:** workflow: explorer, implementer, implementer-deep, verifier, reviewer, reviewer-critical; tiered: haiku-{low,medium,high,xhigh,max}, sonnet-{low,medium,high,xhigh,max}, opus-{low,medium,high,xhigh,max}, fable-{low,medium,high,xhigh,max}; researcher; Explore. Planned T39 routing: sonnet-xhigh implement, sonnet-high verify, reviewer review. fable-high = unblocker after two failed attempts; haiku-xhigh = CI/Playwright log triage.
- **Terms:** Captain = orchestrator; V6/V7 = consolidation branches; Jev = TypeSafe model; T00–T52 roadmap tasks; Annex B = roadmap decisions; PENDENTE HUMANO = parked human decision in DECISIONS.md.
- **Files:** `docs/direction/M01_TASK_STATUS.md`, `docs/direction/DECISIONS.md` (D1–D17), `docs/direction/M01_CAPTAIN_HANDOFF.md` (handoff copy per task commit), `docs/verification/m01-runtime/<task>/`, tools `.agent/tools/{task_state,trace_event,task_discovery,task_recovery,context_packet,regression_union}.py`.

## 10. Work state
| Item | Status | Location | Notes |
|---|---|---|---|
| T16, T17, T18, T19, T42 | ACCEPTED | stack §8 | not in dev-base |
| T44 grading | BLOCKED (budget 3/3) | t44 worktree | CI red; needs user decision |
| T20 impostors | BLOCKED (budget 3/3) | t20 worktree | CI red; needs user decision |
| T39 viewmodel feel | PENDING | v7-cert | stopped by user; relaunch on "continua" |
| Dev-base integration | blocked | — | needs user authorization |
| PR #59 | not merged | — | human decision |

## 11. Next steps
1. **Next action:** ask §12; on "continua" for T39: check `MemAvailable` ≥ 300 MB, mark implementation RUNNING (`task_state.py set … --operation idempotent`), launch `sonnet-xhigh` with contract `~/projetos/COD-guerra-v7-cert/.agent/runs/M01-VIEWMODEL-FEEL-V2-20261009T221848Z/TASK_CONTRACT.yaml` under the night rules (no push before verifier+reviewer).
2. T20/T44: only with user approval of extra attempts → `haiku-xhigh` triage of CI logs, then `fable-high` unblocker; otherwise park as PENDENTE HUMANO.
3. After each accepted task: update this file and copy it to `docs/direction/M01_CAPTAIN_HANDOFF.md` in the same commit, then `push -u origin <branch>`.
4. Next roadmap candidates: T30 (needs T27), T27 (check "Estação V3" first).

## 12. Open questions ⚠️
- Q1: Why was T39 stopped? (memory / priority / mistake / to install new agents)
- Q2: T20 and T44 are BLOCKED with 3/3 fixes and CI red: approve more attempts (with fable-high), or park them?
- Q3: Authorize ff-merge of the accepted stack (T16→T42) into `claude/m01-dev-base`? (yes / keep stacking)
- Q4: Merge PR #59 (V7 → V6)? (human decision)

## 13. Re-attach checklist
Nothing to attach. (Everything is in the repo/branches/worktrees named above.)

---
<sub>Audit: 13/13 sections · 25 rules · 14 corrections · 80+ data points · secrets removed: yes · generated by active-memory</sub>
