# Independent verifier — T27/T30 relief and horizon V1

STATUS: PASS

TASK_ID: M01-T27-T30-RELIEF-HORIZON-V1
WORK_BRANCH: codex/m01-t27-t30-relief-horizon-v1
EXACT_SOURCE_HEAD: 4e5389b314f3e02b3197139cca953b79a5464d8f
IMMUTABLE_BASE: 293a4f116b9b28818b7ff3bda4d83cc49b01014f
EVIDENCE_SUFFICIENT: YES

This is the independent verifier and read-only renderer ownership/performance audit. It assesses the frozen source above and the settled evidence; it does not grant reviewer acceptance or integration. No production, test, helper, technical README, branch, task graph or context-packet changes were made. New probe scripts/data/logs use `verifier-final-*` under `.agent/runs/M01-T27-T30-20261012/`; this report is the sole documentation write.

CHECKS:

- **Authority and provenance — PASS.** Context packet checked VALID at entry and immediately before reporting. All 14 frozen source/test/harness/technical README hashes match both working files and published source HEAD. All 73 settled evidence-manifest entries verified. A fresh protected-owner `git diff --exit-code` against the immutable base is empty. The independent geometry probe verified 621 prior frozen paths; the view integration and specifically authorised superseded authority test are the two intentional exclusions. Game/core/world/mission/assets, collider data, lighting, previous renderer owners and controllers remain exact. The separate baseline worktree is at the immutable base with no tracked modifications.
- **Envelope completeness — PASS.** Reviewed immutable reset, inactive German cast, phase movement, withdrawal/recovery, engineer targets, CKM retreat, evacuation/carry offsets, roll-call, cover and distant firing origins against the renderer's 61 raw rectangle families plus 20 m union margin. A new independently transcribed family probe checks 326 actual initial/phase/cover/feature points, including inactive actors. Complete real-route evidence additionally checks every player/actor each tick against raw hulls. The envelope is presentation data and consumes no simulation RNG.
- **Actual original ground — PASS, freshly executed independent probes.** Reconstructed the original PlaneGeometry directly from baseline construction: 2000×650 m, 400×130 cells, rotation and translation (300,0,40), 104000 triangles and 52531 vertices. All four pinned position/normal/UV/index hashes match. Retention checks cover 39196 protected/crossing triangles including the 10 m halo and 20986 exact Float32 position/normal/UV vertex copies. Actual original-plane interpolations at 424716 protected 1 m samples have maximum attribute delta **0**. All 152 actual vertical/range ray comparisons have delta **0**. Source inspection confirms collapse only of unprotected blocks after checking every source vertex's flat plane, normal and affine UV lattice.
- **Whole union — PASS, freshly executed independent probe.** Separately imported immutable baseline World: 444600 protected 1 m physics/terrain/visual-sampler comparisons have maximum delta **0**. The 19884 protected samples outside the original plane have actual new-skirt terrain interpolation residual at most 4.44e−16. This latter result proves the baseline terrain-height field there; it does **not** claim nonexistent original-plane geometry or identity of the old broad filler boxes. World height functions and data remain byte identical everywhere.
- **Futures — PASS, settled runner execution independently audited.** Read the actual helper and real-control route semantics: no event/clock/objective injection; candidate terrain and far owners active, actual terrain seating, separately imported baseline Simulation, full `snapshot(false)` and drained events compared every tick. The two disjoint partitions each terminate PASS12. Their records match the aggregate by seed/support, source hashes and exact heads. Seeds: 19390901, 1, 2, 3, 7, 17, 41, 73, 99, 1234, 1945, 4294967295; both support routes for each. All 24 complete at battleClock25500, with 490051 full tick comparisons, 44104590 actor checks, four reached checkpoints per route, 120 exact paired checkpoint-backup hashes and 24 exact final backup/final-state pairs. These executions belong to their original runners; this verifier performed a new semantic/hash audit, not a relabelled rerun. They are simulation control tests, not continuous browser playthroughs.
- **Focused regressions — PASS, newly executed.** `node --test` on envelope, relief, far, amended material authority, track bed and props runtime: 23/23. Separate terrain-material suite: 11/11. Meaningful existing tests cover actual bridge-floor ray contacts, four receiving heads, material reveal bounds, borrowed textures, restore/disposal and runtime loading. Fresh collider `--check`: 83 boxes. Settled standard route report preserves 26 events/four checkpoints/health92/completion; the full route matrix supplies stronger continuation evidence without rerunning the CLI's shared report side effect.

BUILD / FULL REGRESSION / CI:

- Authoritative exact-source normal CI [38376693678](https://github.com/Brawl2007/COD-guerra/actions/runs/38376693678), job115226752483: 669/669 Node, 173 tooling, production build92 modules, SUCCESS. Raw decoded job log contains the full assessed source SHA. Its other browser job was SKIPPED and is not counted as browser proof.
- Exact-source focused CI [38376693616](https://github.com/Brawl2007/COD-guerra/actions/runs/38376693616), job115226752605: frozen-owner authority guard and production browser2/2, SUCCESS, 6.6 min. Its build is a browser prerequisite; normal CI owns build validation. Local settled production browser also passed2/2 (13.3 min). These valid expensive gates were inspected rather than redundantly executed by this verifier.

RUNTIME_OR_BROWSER: PASS

Directly viewed and compared the six original baseline PNGs, separate production feature-off/on images and Low/High images. Canonical definitions match the immutable roadmap fixtures. New independent pixel calculations and JSON comparisons confirm all six baseline/current snapshots, camera objects and clocks exactly equal, all page/shader error lists empty, and all ten unchanged control patches have maximum RGB delta0. Feature changes above RGB threshold2 are:

| View | Relief pixels | Far pixels | Main-camera ground triangles / submissions |
| --- | ---: | ---: | ---: |
| 01 start | 2595 | 281 | 14368 / 47 |
| 09 sappers | 65 | — | 37240 / 151 |
| 10 Lisewo | — | 30 | 37288 / 151 |
| 17 daylight train | 8724 | 5822 | 8368 / 54 |
| West bank | 2076 | 10184 | 13808 / 51 |
| East bank | 9493 | 5822 | 8368 / 54 |

A new independent frustum reconstruction from the recorded exact camera quaternions reproduces every ground/far count. All relevant new main-camera ground submissions, including skirt, meet the 52000 ceiling in required01/09/17. Total prepared ground59512 does not violate this per-view criterion. Original playable ground104000 is the measured reference.

Far geometry is 3232 triangles in five merged objects, zero material groups, singleLOD; all triangle bounding rectangles avoid raw hulls+20 m, so triangle interiors avoid the protected union. All vertices satisfy west x<−460 or east x>1800. Installed Three.js0.186.1 `ShaderMaterial.forceSinglePass` is true; inspecting the actual renderer dispatch confirms **five actual GL submissions including mist**, not six. Clock/T16 fog/daylight update the altitude mist; skirt belongs only to terrain. Actual terrain-triangle surface queries seat distant scenery during construction.

The foreground track, actors, weapon and immutable portals remain visually stable. View01's new relief is a modest horizon change; view09's relief and view10's skyline are small because protected terrain and portal masses occlude most distant scenery. View10 genuinely contains only a **30-pixel** far glimpse at unchanged canonical framing. It satisfies the unchanged >20 gate; it must not be described as a prominent skyline. View17 and supplemental bank views show the distant masses clearly. Production-default owners are enabled; debug switches only produce controlled A/B captures and do not create special showcase geometry.

RESOURCE / OWNERSHIP / PERFORMANCE AUDIT:

- Fresh independent 1000-sync checks preserve terrain/far geometry and material references, revisions under steady inputs, full Simulation/checkpoint/world/RNG data. Source `sync`/`beginFrame` paths construct no geometry or Three scratch objects; surface ray/intersection allocations occur only in constructor-time seating. On-demand diagnostics allocate reporting objects and are not evidence of allocation-free telemetry.
- Once-only disposal verified for478 terrain geometries,5 far geometries and5 far materials; borrowed material disposal0. Terrain material/texture ownership stays with its existing owner. World references/revisions and quality rebind without terrain rebuild; immutable terrain-height/layout data justify retaining prepared geometry across demolition/restore.
- Settled production plateau compares equivalent render histories: cold High471 geometries/134 textures; quality warmup489/130; both variants visited536/134. Four restores and identically warmed reload remain536/134 at clock0.05, with exact save comparisons and no steady paused renders. Low/High images were inspected. Prior T31/T33 browser suite was not repeated: those owners/assets/controllers are byte frozen, new actual protected-ground/contact tests pass, and current six-view production tests assert trackDraw4 and42 loaded prop files plus paused quality/restore. That combination addresses the actual changed coupling.
- Nonblocking performance limits: chunking reduces submitted triangles while increasing ground draw submissions versus the original single plane (`m01-terrain-relief.js:97–98`, up to151 in these views). Transparent mist boxes (`m01-far-landscape.js:37,49`) have fill/overdraw cost even with five total far submissions. Same far singleLOD remains on Low as specified. No new shadow caster, owned texture allocation, steady rebuild or leak found. Neither SwiftShader captures nor these counts establish reference-PC frame rate or overall speed improvement.

FAILURE_CONTEXT:

Attempt1 at49a188 remains durably archived as FAIL: obsolete generator-location source assertion, zero canonical01 relief pixels, and unequal warmed/cold reload histories. Current replacement authority test pins real original buffers, immutable colliders/world/track bytes and actual contact rays. Final geometry and same-history resource evidence resolve the three failures without lowering the budgets or pixel threshold. No current implementation failure observed. The independently written evidence-audit script initially assumed aggregate partition ordering; matching records by `(seed,support)` corrected that probe-only assumption and all data matched.

LIMITATIONS:

No human uninterrupted playtest, reference-PC FPS/VRAM measurement, World at War quality claim, surveyed field-profile claim or historical-building reconstruction claim. Terrain profile and distant art are estimated original scenery; the verified example (550,−135) lies outside the gameplay envelope, combines29.8825 m offset and actual Float32 surface24.8825 m. Existing `farAnchors` remain direction references, not visible true-distance cities or invented sounds. The source technical README is its frozen implementation checkpoint; this report and settled artifacts establish the final gates.

Independent raw evidence: `verifier-final-source-probe.{mjs,json,log}`, `verifier-final-envelope-probe.{mjs,json,log}`, `verifier-final-draw-family.{mjs,json,log}`, `verifier-final-evidence-audit.{py,json,log}`, and focused/material/collider logs in the runtime run directory. Independent source-probe JSON SHA256: `2ed7638cf6fe7e087964917b60b0d9be1dc19f8b9c4e8268277f7eb8621632c6`; evidence-audit JSON SHA256: `3c8a019b781fd172d37f553dda604218019ad60620b33ff97551e49879ebaba8`.

RECOMMENDED_NEXT_ACTION: Preserve source4e5389b314f3e02b3197139cca953b79a5464d8f, archive the new independent runtime artifacts, refresh the evidence manifest/context packet for this report, then perform the mandatory independent reviewer gate. Integration still requires reviewer ACCEPT and Captain's exact-head/base checks.
