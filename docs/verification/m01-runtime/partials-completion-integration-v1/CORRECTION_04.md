# Correction 04 — pre-armed Stuka capture

Prospective `CAPTAIN_EXTENSION_04.json`, same RUN `M01-PARTIALS-COMPLETION-20261014`, isolated branch `codex/m01-partials-browser-sampling-repair-v1`. Formal **4/4** is consumed; original 3/3 and unchanged-source CI retry 1/1 remain spent in ignored `correction_budget.json`. Historical verifier FAIL4 and both 9a Stuka failures remain unchanged.

The old helper awaited Continue before installing the live callback. The first failed-job trace installed it 2.810308 s late and sampled the authoritative impact endpoint (`clock196`, `s=1`, Y−3), failing the original airborne assertion. The new helper awaits installation of an in-page `requestAnimationFrame` sampler **before** Continue. It requires native game pointer lock and a running, actually drawn restored frame, stores the actual diagnostics, and calls native `exitPointerLock()` in that same callback. After Continue returns, Playwright only retrieves that stored sample. No gameplay clock, RNG, event, state or framing change occurs.

All five test bodies and all original assertion lines are byte-identical to `9a679c50cdbe9a19330aba72961cb51cda808a5d`, including trajectory, airborne height, projected world ROI/size, timing and pause drift. A raw sample is written before assertions for diagnostics.

The new isolated workflow accepts pushes only on this branch (metadata-only changes ignored) plus manual dispatch restricted to this branch. It uses Node24, npm ci, production build, Chromium, the **full five-case Stuka spec**, workers1/retries0, and a JSON guard requiring expected5/unexpected0/flaky0/skipped0. Strict production/assets/missions/tools/package* identity against 9a is checked before and after. Logs, JSON, PNG and failure traces upload with `always()`. The existing 44-case workflow remains byte-identical.

Local implementation checks:

- Syntax, workflow YAML/isolation guards, complete assertion/test-body identity and strict production identity: PASS.
- Production build: PASS.
- One focused real bomb browser case: **1/1 PASS**, 40.9 s, workers1/retries0. No extra local flight cases were repeated; full5 and fresh Node/build remain independent CI requirements.
- Live/paused clock `195.4667000000102` / `195.4667000000102`: drift 0. Flight `s=0.6444666647706375`, Y `72.75213157989839` > target Y `-3`. Live and frozen plane/bomb projections are inside, respectively 46.7/12.6 px (original minima10/7).
- The first local CLI used anchored grep `^bomb:` and selected zero tests; retained `bomb.log` is invocation-error evidence, not test proof. Only the corrected focused invocation above is counted.

Evidence retained locally:

| Evidence | SHA256 |
| --- | --- |
| `test-results/partials-correction-04-runner/m01-stuka-dive-bomb-the-fi-8e837-oint-1-5-s-before-its-blast/m01-stuka-bomb-diagnostics.json` | `a621eaa30d8c77394291b6fcaa0993ef3cef4a149a9c87113a3606627f083e44` |
| `test-results/partials-correction-04-runner/m01-stuka-dive-bomb-the-fi-8e837-oint-1-5-s-before-its-blast/m01-stuka-bomb.png` | `ac2087a74c114eca19541c3cfee4d32be7089e0116362cc4050a67bcdf2bf6c8` |
| `test-results/partials-correction-04/bomb-report.json` | `786b3ad86f62ee96cd13518deec8ef060a1eaf3dfcceeb00ae6f453097ba8d35` |
| `/workspace/scratch/m01-partials-correction4/static-validation.json` | `2b707435b9618ec37d18203d175e3277c5201e3eee31469a82062e5c8aff474f` |

Build and focused logs/config remain under `/workspace/scratch/m01-partials-correction4/`. `git diff 9a679c50cdbe9a19330aba72961cb51cda808a5d -- src missions assets tools 'package*.json'` is empty. This correction does not claim a single full44 PASS, final certification, review acceptance or integration. Verifier must assess fresh full5/Node/build and exact source identity before reusing other passed 9a gates.

Provenance clarification after independent phase5: the first failed-job delay is2.810308s; the actual bounded retry trace delay is2.913842s. Both raw traces and both FAILs remain retained. This corrects the trace attribution only.
