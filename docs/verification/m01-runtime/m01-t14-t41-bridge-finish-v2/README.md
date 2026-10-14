# M01 T14 + T41 — implemented, blocked before integration

STATUS: **BLOCKED**, 2026-10-14. Neither task is accepted.

- Task: `M01-T14-T41-BRIDGE-FINISH-V2`; stable run `M01-T14-T41-20261013`.
- Base and current playable integration: `claude/m01-integration` at `8a0c3622f5375f2c5b5e847db71f4f6e8352ae39`.
- Published work branch: `codex/m01-t14-t41-bridge-finish-v2`.
- Examined source: `b36ad7470ce977deeecab1ae193e51592d4aaf72`.
- Frozen source: 145 files, SHA-256 `d597f5d79be75be53e98d4589a9e74024b50adb38d6e957d708e1de7d135fa2c`.
- Accepted head: **NONE**. No merge, reviewer acceptance, new accepted regression record or CURRENT memory note.

The source adds eight original material families (albedo, normal and ORM, High/Low), metre-space bridge mapping, separate material/LOD ownership and original-geometry-derived side/top truss cards. Existing portal, structure and track owners remain unchanged. The sole existing production file changed is the narrow integration in `m01-view.js`. All twelve original GLBs retain their exact bytes and unresolved original licence. The new raster manifest distinguishes new code from the underlying provisional meshes; it is currently missing required author metadata.

## What passed

New meaningful Node tests: **9/9**. Original authority guard: **552 files** exact against the base. Material and impostor generators reproduce exactly. Dedicated production game/viewer fixture builds and material viewer **2/2** pass. The unchanged collider check reports **83** volumes and the critical route completes with **26 events / 4 checkpoints**. The 173 tooling tests passed on the intermediate checkout; exact-source normal CI skipped tooling and the generic build after its Node failure, so those CI steps are not claimed as passed.

All **24 full real-control CPU futures** (12 seeds, both support routes) completed with the new bridge owner active on decoded generated PNGs and nine original bridge GLBs. Every tick's full state, events and complete parts match the untouched base; all **490051 ticks**, **120 checkpoint pairs**, final saves and backups match. All four independent subprocesses exit **0**. This is an actual-asset CPU renderer fixture, not GPU playtesting.

The exact-base production matrix passed locally and on CI, with nine captures: six editorial views 04/12/13 across two phases, two full-frame controls and a Low view. Constructor phase is exactly **04:30:00**, simulation clock zero. The later fixture is genuine route retreat following east demolition at actual **06:13:15.075**, 22.95 simulation seconds after the blast; its `0610` filename denotes the demolition phase, not an exact 06:10 clock. The supplement derives real damage ages from the preserved full `sectors.damage` records, because the original annotation read the wrong destruction representation.

Local current production browser: **2 PASS / 2 FAIL**. Actual delayed readiness and all-503 optional fallback pass. Low/Medium/High churn, four real checkpoint restores, equally warmed reload and material toggles pass their existing assertions. Warmed global texture/geometry counts remain **163/474**; full saves and clocks remain exact. Toggle control pixels are zero and re-enabled pixels match. These existing assertions did not detect the disabled-card bug reproduced by the independent verifier.

Recorded far Low/Medium/High frames submit **2 calls / 4 triangles per logical card**, zero card-shadow calls. Owned decoded RGBA8 is **2.0625 MiB Low / 15 MiB Medium and High**, with calculated full mip chains separately reported. Structural capacity is 18 roots / 36 planes, separate from actual frame submissions. No FPS, physical VRAM, reference-PC measurement or human playtest is claimed.

## Confirmed blockers

1. Normal CI [38528756419](https://github.com/Brawl2007/COD-guerra/actions/runs/38528756419) fails **1 of 686 tests**: the new impostor manifest lacks `author`; 685 pass, none skipped/cancelled/todo. Generator and regenerated manifest must add the field without changing the original GLBs/licences or weakening the manifest test.
2. The disabled finish owner revives cached far cards on its next selection frame. The independent synthetic controller reproduction records card count `1 → 0 → 1` across enabled, immediate disable and next frame; borrowed original material is restored but original truss visibility becomes false again. Real disabled-view native submissions corroborate **12 card calls / 24 triangles**. Card submission needs an enabled guard and a post-disable-frame regression assertion.
3. Steady-frame allocations in native-counter resets, selection predicate and new view call records violate the performance contract. The independent performance audit is **FAIL**. No confirmed texture leak was found. Its additional redundant fragment-sampling concern is an unmeasured optimization concern, not an asserted FPS regression.
4. The visual harness reads state before the requested operation finishes. Local pause DOM becomes visible just after its 5000 ms deadline; the stationary-before raw record still contains the previous camera after a fixed 300 ms wait. Focused CI [38528756490](https://github.com/Brawl2007/COD-guerra/actions/runs/38528756490) instead passes **3/4 current cases** but samples distance **380.084** when **760** was requested. Wait for the actual pause and requested last-drawn camera/frame, retaining full-state, ten-second stationarity and pixel assertions.
5. Both new configs inherit Playwright's root `test-results` output directory, which is cleaned on every invocation. CI therefore deletes prior base/viewer/frozen-source evidence. Its SHA-verified ZIP has 59 files and complete current phase raw captures, but no same-run base/viewer/source files. Use dedicated browser artifact directories with surviving capture/source/future siblings. The six-pair comparator, far destruction/return and coupled regressions remain incomplete. Current CI raw states match retained local base raw states; cross-GPU PNGs are not accepted pixel evidence.

Independent **VERIFIER_STATUS: FAIL**, **PERF_AUDIT_STATUS: FAIL**. Evidence suffices to establish these failures and the completed futures; it does not suffice for acceptance. Reviewer was not run because verification failed.

## Continuation

The Task Contract's correction budget is **3/3 consumed**, with **0/2 review rejections**. A user exception to raise it to four was requested and remains **unanswered**. Neither prepared patch has been applied. The consolidated next round must cover metadata, disabled-card selection, allocation cleanup, real-frame waits and artifact-directory preservation, then obtain fresh required proof, independent verification/PERF PASS, reviewer ACCEPT and exact-source green CI. Only afterward may the work branch be merged with `--no-ff`; full `npm test` and `npm run build` must run on that actual merge before publishing the integration.

The operational graph preserves `verification=FAIL`; the state tool rejects a direct FAIL-to-BLOCKED transition, so no reset/retry was used to hide the failure. The overall task is BLOCKED by exhausted correction budget. The original run, attempt ledger and trace are preserved and must not be reinitialized.

`blocked-proof/` contains raw logs, independent reports, complete future reports, selected raw images/states and unapplied proposals. `evidence-sha256.json` indexes exact bytes. The archived original reproduction retains its original runtime-relative import; `blocked-proof/replay-disable-from-root.mjs` adapts only that import for replay from this durable location.
