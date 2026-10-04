# Current browser harness audit — M01

TASK_ID: `M01-BROWSER-REGRESSION-HARNESS-HARDENING-V1`

Base: `codex/m01-schema2-determinism-audit` @ `5f3cc34f53c61beec52255d67f8babd7194c9f7f`.

The base is already functionally strong: 36/36 browser passed in the reviewed determinism audit, retries are zero, workers are one, screenshots are retained on failure and traces are retained on failure. This task does not change gameplay.

## Audit classification

| Area | Classification | Finding |
|---|---|---|
| Playwright retries | SAFE | `retries:0`; flaky is not hidden by retry. |
| test concurrency | SAFE | `fullyParallel:false`, `workers:1`; shared preview is not concurrently mutated by M01 tests. |
| failure screenshot/trace | SAFE / WEAK DIAGNOSTIC | Playwright already keeps screenshot/trace on failure, but custom diagnostic attachment contains only full `gameDiagnostics()` and not browser/pointer/network/localStorage context. |
| preview port | POTENTIAL FALSE GREEN / REAL RACE | `npm run preview` uses Vite default 4173 without `--strictPort`. If 4173 is occupied, Vite may move to another port while Playwright's readiness URL can hit a stale server already on 4173. |
| server lifecycle | ENVIRONMENT DEPENDENT | Playwright owns the preview child and `reuseExistingServer:false`, which is good. Final validation still needs to prove no port/process remains after the suite. |
| pointer lock start | WEAK DIAGNOSTIC | Core helpers wait for pointer lock + clock but raw `waitForFunction` failure says little about paused state, menu state or lock owner. |
| pointer-lock freeze capture | REAL RACE, currently controlled | MG34/checkpoint visual tests intentionally intercept the native `pointerlockchange` before Game unpauses to inspect the exact restored frame. The technique is valid but deserves labelled timeout diagnostics because a missed native lock otherwise looks like a generic timeout. |
| pause | SAFE assertions / WEAK DIAGNOSTIC | Several tests compare frozen clocks/character state after 250–350 ms. The assertions are strong; timeout paths do not explain pointer lock/pause state. |
| localStorage save preload | SAFE by Playwright isolation / WEAK DIAGNOSTIC | Each test gets a fresh BrowserContext, so localStorage does not normally leak between tests. Failures currently do not record whether the checkpoint key existed, schema/clock summary, or whether `#continue` was enabled. |
| checkpoint Restart | SAFE assertions / WEAK DIAGNOSTIC | Tests verify exact clocks/checkpoints/parts in important cases. Raw wait on pointer lock/state can still hide why Restart did not complete. |
| page reload/Continue | SAFE assertions / WEAK DIAGNOSTIC | Genuine snapshot continuation is exercised. No shared helper labels which phase failed (models ready, Continue enabled, pointer lock, clock advance). |
| mission complete/debrief | SAFE but narrow | The actual outro snapshot is driven through UI and debrief is checked. Failure context should include mission `complete`, scene, clocks and menu visibility. |
| optional asset failure injection | POTENTIAL FALSE GREEN | Routes are explicit, but several use `route.abort()` and no harness assertion proves the intended URL was actually requested. A test could pass its fallback assertion for another reason while the forced failure route was never hit. |
| optional 404 accounting | POTENTIAL FALSE GREEN | Some tests intentionally create 404s but omit the returned `failed` array instead of distinguishing expected vs unexpected network failures. |
| required asset failure test | SAFE intent / WEAK DIAGNOSTIC | Explicit `**/*.glb -> 404` proves required bridge failure/fallback to French sandbox. Harness should mark those failures as expected, not let them mask unrelated failures. |
| console/page errors | MISSING ASSERTION / WEAK DIAGNOSTIC | Most tests collect `pageerror`; only some collect console errors. There is no suite-wide fail-fast rule for unexpected page/console/request failures. |
| HTTP/request failures | MISSING ASSERTION | `open()` collects status >=400 in two specs, but not all tests assert the arrays, and `requestfailed` is not generally captured. |
| raw `waitForFunction` | WEAK DIAGNOSTIC | Many conditions are meaningful, but a timeout only reports source location/timeout, not current mission state. |
| long per-test timeouts | OVERBROAD TIMEOUT in places | Several tests set 120–240 s because software WebGL/browser runs are slow. Do not raise them further. Harden inner waits/diagnostics first; retain known budgets until measured evidence justifies reducing them. |
| screenshot timeouts | ENVIRONMENT DEPENDENT | 90–120 s screenshot caps exist for known software-rendering cost. They are not gameplay waits; changing them without measured screenshot timings risks infrastructure-only failures. |
| station evacuation wait | ENVIRONMENT DEPENDENT + WEAK DIAGNOSTIC | Genuine simulation continuation can take significant wall time on SwiftShader; labelled state diagnostics should explain whether simulation is paused, assets failed or delivery condition is simply not reached. |
| MG34 prone | SAFE assertions / WEAK DIAGNOSTIC | Tests strongly verify phase, emitted rounds, low eye/muzzle, numerical visual muzzle agreement, pause and reload. Optional asset test explicitly 404s the prone kit but should prove interception hit. |
| CKM optional assets | SAFE intent / POTENTIAL FALSE GREEN | Explicit route exists but interception hit is not asserted. |
| station optional transition | SAFE intent / POTENTIAL FALSE GREEN | Same: fallback is checked but route-hit proof is absent. |
| test order | POTENTIAL HIDDEN DEPENDENCY | Fresh BrowserContexts reduce risk, but critical save/fallback subsets have not been explicitly run in alternate sequences as harness evidence. |
| browser close | SAFE framework ownership / ENVIRONMENT DEPENDENT | Playwright fixture owns browser/page lifecycle. Final shell validation should check no preview on 4173 and no suite-owned child process remains. |
| diagnostics pending sounds | MISSING EXPOSURE | `Game.pendingSounds` exists but is not included in the public read-only `gameDiagnostics()`. Because production `src/**` is forbidden in this task, harness cannot truthfully dump it. Document rather than bypass the debug boundary. |

## High-value hardening selected

1. Make preview bind **4173 strictly**, eliminating stale-server/port-shift ambiguity.
2. Add a browser harness helper that records compact state on labelled wait failure:
   - document state;
   - pointer lock owner;
   - visible menu/pause/complete/error controls;
   - checkpoint localStorage summary;
   - mission/clock/battle clock/player transform;
   - objectives/checkpoints/gate/scene;
   - required/optional asset failures;
   - character/viewmodel/station/MG-related diagnostics already exposed by `gameDiagnostics()`;
   - console errors, page errors, request failures and HTTP >=400.
3. Fail a nominally green test if the harness sees an **unexpected** browser/network error.
4. Replace random-network-style `abort()` fallback injection with deterministic explicit HTTP 404 responses through one helper.
5. Require every forced asset-failure registration to record at least one actual intercepted request.
6. Wrap high-risk waits (startup, pointer lock, optional assets, station, checkpoint/reload and MG34) with labelled fail-fast diagnostics rather than increasing the outer test timeout.
7. Prove critical save/fallback subsets independently and in alternate command sequences.
8. Validate port/process cleanup after full suites.

## Explicit non-goals

- No gameplay changes.
- No RNG, hitbox, MG34, CKM, BattleSector, Combat AI, Authority Lease, mission or asset changes.
- No retries.
- No pixel-identical determinism requirement.
- No FPS claims.
