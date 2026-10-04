# M01 rifleman locomotion runtime pilot — handoff

| Field | Result |
| --- | --- |
| TASK_ID | `M01-RIFLEMAN-LOCOMOTION-RUNTIME-PILOT-V1` |
| MODELO | GPT-6.1 Sol requested; runtime tools do not independently attest model identity |
| ESFORÇO | HIGH requested; no delegation |
| BASE | `codex/m01-schema2-determinism-audit` @ `5f3cc34f53c61beec52255d67f8babd7194c9f7f` |
| BRANCH | `codex/m01-rifleman-locomotion-runtime` |
| HEAD FINAL | Exact final evidence commit supplied in final delivery / remote branch ref; production validated at `489f71af14619aefbcc3e76f44f332e4010eb0af`, follow-up harness/full browser at `72100c733a6e93e31105d2ba7a881c2bd32433b3` |
| COMMITS | Six commits from production base; last two only test synchronization and evidence/docs |
| ACTORS PILOT | `de_spans_6`, `de_spans_7`, `pl_east_0`, `pl_east_1`; four ordinary noncritical riflemen |
| CLIPS MEASURED | Actual unchanged `m01_soldier_animations.glb`: standing_idle 4 s, walk 1 s, run .68 s; all in-place |
| FOOT CONTACTS | Approximate left/right ankle support at 240 Hz, within 15 mm of minimum and backward velocity >.2 m/s; full windows below |
| NOMINAL SPEED/CADENCE | walk 1.099945 m/s /120 steps/min; run 3.251546 m/s /176.470586 steps/min; idle breath .25 Hz |
| PLAYBACK POLICY | observed x/z displacement / mission dt / measured nominal; bounded .5–1.8 ×; no root motion |
| CROSSFADE POLICY | .22 s mission-time smoothstep, normalized weights, interrupted fade retains source vector; only idle/walk/run |
| PHASE POLICY | shared walk/run normalized phase; deterministic ID offset, no gameplay RNG; preserved through LOD/culling; reconstructed on restore |
| FOOT-SLIDE METRIC BEFORE | mean ankle horizontal support drift .407107 m/s (walk1.5), .355154 (run3.6), 2.254805 (run5.5) |
| FOOT-SLIDE METRIC AFTER | .017683 / .040144 / .053646 m/s respectively; identical LOD0/LOD2 results; nonzero residual drift |
| GAMEPLAY TRANSFORM EQUALITY | exact x/y/z and authoritative facing equality ON/OFF; complete-route samples and 400 independent continuation ticks with same inputs |
| HITBOX EQUALITY | exact numeric spatial hitboxes in those samples/ticks; `src/world/spatial.js` byte-identical |
| RNG EQUALITY | exact entire snapshots, including RNG/HP/shots/mission/weapon, per independent continuation tick; visual hash only |
| SAVE/RESTORE | schema 2 unchanged; real mission snapshot at clock947.8, actual UI pause/resume/page reload; same authoritative state; cosmetic phase reconstruction allowed |
| PAUSE | same mission time freezes mixer feet and fade weights; actual game UI freezes clocks; no wall-clock animation updates |
| LOD | existing near/high LOD0 and distant/low LOD2 measured; all three qualities resolve same semantics; skinning budget/far fallback preserved |
| FALLBACK | missing complete/partial locomotion kit removes skinned pilot from selection; existing procedural actors remain; gameplay position/movement unchanged |
| MG34 PRESERVED | IDs excluded; specialized sampling byte-identical; existing tests preserved |
| STATION PRESERVED | patient/medic IDs excluded; sampling byte-identical; existing station/drag tests preserved |
| NODE | **253/253 PASS**, including focused **11/11 PASS** |
| BUILD | PASS; inherited >500 kB chunk warning; no package/config/asset changes |
| BROWSER | Latest fresh full regression **37/37 PASS** (12.9 min), zero retries/skips; focused input synchronization2/2 PASS (31.3 s). Historical36/1 failure and initial36/36 retained; real-save/gallery PASS |
| LIMITATIONS | ankle proxy/support-window metric, flat/straight fixtures, residual spikes; no exact visual phase persistence; first observation/re-entry warmup; specialized/nonlocomotion transitions remain legacy |
| NEXT STEP | Captain visual review of four IDs; scope expansion only by separate order |
| RECOMMENDATION | Automated regression passed; submit bounded visual pilot for captain review. Retain M01 as **PROTÓTIPO JOGÁVEL**; no integration or expansion |

## Commits and anchors

1. `44e1898bda487aacf0d1d2b0011876f160e6c5d8` — real clip audit, measurement tool, naturally reached snapshot.
2. `44817e7f3a23953a12cb68799b302cb971a09227` — four-ID production renderer pilot and 11 specific tests.
3. `489f71af14619aefbcc3e76f44f332e4010eb0af` — real baseline gallery, objective drift metric, real-save browser test.
4. Final documentation/evidence commit is the branch HEAD reported in final delivery. Source/runtime/tests above are unchanged by that final commit.

Reference architecture: `codex/m01-soldier-locomotion-animation` @ `cd91d65f0c022678ed24785eb44233bab137eb3c`, read without merge. No Combat AI/Authority Lease/BattleSector integration. `main` was not changed. No deployment, CI claim, human playtest, FPS or Chromebook measurement.

## Contact and drift data

| Clip | Left contact seconds | Right contact seconds |
| --- | --- | --- |
| standing_idle | 0–4 | 0–4 |
| walk | .037500–.529167 | 0–.029167; .537500–1 (wrap) |
| run | .029024–.219756 | .364878–.559756 |

15 mm is an ankle-height classification tolerance, not an accepted final sole-ground art gap. Original keyframes are 30 Hz; these windows are detected on a 240 Hz interpolated sampling grid. `ASSET_AUDIT.md` explains root displacement, support velocity and why 6 mm fragmented the provisional run rig.

| Actual / fixture speed | Base mean drift m/s | Candidate mean drift m/s | Reduction | Base P95 m/s | Candidate P95 m/s |
| --- | ---: | ---: | ---: | ---: | ---: |
| walk1.5, mission German spans | .407107 | .017683 | 95.66% | .522593 | .062225 |
| run3.6, controlled gait fixture | .355154 | .040144 | 88.70% | .436737 | .145461 |
| run5.5, mission east platoon | 2.254805 | .053646 | 97.62% | 2.336594 | .186183 |

Each row independently repeats at existing LOD0/high and LOD2/low with identical numbers. Six seconds per case at120 Hz, first second and transitions/wraps excluded. Contact counts differ as speed matching changes cadence. Acceptance: mean <=35% of baseline, mean <.10 m/s, P95 <.25 m/s. Raw per-interval samples include maxima (candidate .173/.462/.563 m/s); the result is **not zero sliding**. Averages cannot approve stance edges, boot-sole contacts, turning/slopes or acceleration. No IK or asset modification was introduced to conceal residuals.

## Evidence and reproduction

- `clip-audit.json`, `ASSET_AUDIT.md`: real GLB SHA-256, durations/keyframes, contact windows, displacement/cadence/calibration.
- `foot-slide.csv`, `visual/metric-*-lod*.json`, `visual/browser-gallery.json`: summaries/raw objective drift and per-frame fade/phase diagnostics, including pause/LOD/restore/fallback.
- `visual/00-idle.png` through `10-stop-idle.png`: real GLB/production renderer fixture, exact baseline source extracted from production base. Display lanes are offset; numerical metric has no offset. This is not a mission playtest.
- `locomotion-snapshot.json`: snapshot reached by actual simulation control route. UI test only changes camera yaw for viewing, not actor positions or mission. `visual/production-save-restore.json` and production PNGs: actual game continuation/pause/reload.
- `preservation.json`: protected tree/source hashes and byte-identical specialized sample/CKM methods.
- `focused-tests.log`, `node-tests.log`, `build.log`, `browser-initial-36.log`, `browser-focused.log`, `browser-tests.log`, `gallery.log`: actual tool outputs. Final counts are in `verification.json`.

```sh
npm ci
node tools/verification/m01-rifleman-clip-audit.mjs
node --test tests/m01-rifleman-locomotion.test.js
npm test
npm run build
CHROME_EXECUTABLE=/path/to/chromium CI=1 M01_RIFLEMAN_EVIDENCE=test-results/rifleman-evidence npm run test:browser
CHROME_EXECUTABLE=/path/to/chromium node tools/verification/verify-m01-rifleman-locomotion.mjs test-results/rifleman-gallery
```

The environment's standard Playwright browser download failed with a truncated archive. Actual testing uses Chromium153.0.8010.0 extracted from `@sparticuz/chromium@153.0.0` outside the repository, with SwiftShader. No dependency or browser setting was altered. Focused UI test additionally ran through the separate dev-server config; final regression uses the built preview.

Only production files changed: `src/render/m01-characters.js`, new `src/render/m01-rifleman-locomotion.js`. Simulation, spatial, mission scripts, weapons, schema2, GLBs, MG34/station/CKM assets and French sandbox source are preserved. Specialized source equality and existing tests do not substitute for a human visual/art review. Stop after handoff; no integration.

## Historical browser regression failure retained

Previous full suite at `0236b097`: 36 passed / 1 failed, no automatic retry. Existing `adjustment salvo behind the truss ... follows mouse look` timed out after 5000 ms waiting for HUD “atrás de si”; it still read “em frente” during the assertion. The captured after-failure diagnostics/page snapshot already read “atrás de si”, and no pilot actors were rendered in this scene. This supports a late-update hypothesis; it does not prove the pilot could never affect scheduling. Simulation/input/HUD and the existing test were unchanged at that revision. `browser-failure-trace-extract.json`, `browser-failure-raw/*.trace`, `browser-failure-diagnostics.json` and `browser-failure-error-context.md` retain the failure. The original full zip was not republished; raw event records and decisive diagnostics are retained. Separate candidate/base controls are explicit reruns, not a replacement green full-suite claim. No timeout/assertion was changed in that historical run.

Controlled checks completed unchanged: candidate2/2 PASS (1.4min), clean exact-base2/2 PASS (52.1s). They do not establish a root cause or replace the final36-pass/1-fail result. Node253/253 and focused11/11 passed. Source code/tooling was unchanged during final validations and control checks.

## Follow-up — 2026-10-04

The captain requested continuation after handoff. Commit `72100c733a6e93e31105d2ba7a881c2bd32433b3` changes only the two existing salvo direction cases in `tests/browser/m01.spec.js`. Mouse input is queued by `Input` and consumed in the next gameplay frame, before rendering and HUD updates. The test now acknowledges that frame by waiting for the exact authoritative angle implied by the delivered `MouseEvent.movementX` (which can truncate fractional input), within1e-7 radians modulo2π. It does not resend input or write gameplay/camera state. The acknowledgement is bounded at30 s; existing HUD assertion remains5 s, total test180 s on CI, retries0. This is an explicit frame synchronization budget, not a claim that the original scheduling cause is conclusively proven.

Focused two direction cases passed in31.3 s. A **new complete `npm run test:browser` execution passed37/37 in12.9 min**, exit0, no retries/skips. Raw full output: `browser-followup-37.log`; focused tool-output transcript: `browser-input-sync.log`. These results supersede the earlier final approval status without deleting its failure, trace or control results.

Production source and built JS are unchanged from the validated pilot: bundle SHA-256 `f83bd6260ad57f1229597d73e2c9621fc72ae6b48ba1882032a1ba334c29fcac`. Existing253/253 Node and build PASS therefore remain applicable; they were not rerun during this test-only follow-up. MG34/station/CKM cases passed in the fresh browser suite. Protected remote heads reconfirmed: main `72bbcdd156603c9399801c95d43d9365ba50fc82`, production base `5f3cc34f53c61beec52255d67f8babd7194c9f7f`, animation reference `cd91d65f0c022678ed24785eb44233bab137eb3c`. No merge, deployment, CI, human playtest or FPS claim.

Recommendation: captain visual review of this four-actor pilot. Automated regression is now green; limitations of the ankle metric, visual phase reconstruction and flat fixtures remain. Stop here; do not add crouch walk, crawl, IK or upper-body animation.
