# Wz.29 first-person runtime handoff

M01 remains **PROTÓTIPO JOGÁVEL**. Presentation-only pass, ready for final validation and captain review; no integration authorized or performed.

| Field | Delivery |
| --- | --- |
| TASK_ID | M01-FIRST-PERSON-WZ29-VIEWMODEL-VISUAL-RUNTIME-PASS-V1 |
| MODELO / ESFORÇO | Requested GPT-6.1 Sol / HIGH; no delegation |
| BASE | codex/m01-schema2-determinism-audit @ 5f3cc34f53c61beec52255d67f8babd7194c9f7f |
| BRANCH | codex/m01-wz29-viewmodel-visual-runtime |
| Production HEAD | 97298f8ae372b71cffaa854cba13a1b979530293 |
| HEAD FINAL | The documentation commit containing this file; exact SHA and final command results in the delivery message. No later source edits planned. |
| Commits | 5919983eeb9c4b8019401b0c4ee9d5757f09a49f (sights/arms/motion); 9d91e3be9b0bef1556aa3ffa1d47ed6a11edd386 (restore boundary); 97298f8ae372b71cffaa854cba13a1b979530293 (sleeve anchors/evidence tools); this evidence/handoff commit |

## Result visible to the player

The actual Polish GLB rifle and rig remain in use. Hip framing is lowered; complete ADS aligns the measured front blade with the rear socket and camera forward. Cloned arms retain authored mechanical hand targets, with a corrected READY grip and sleeve ends below the reload frame. Bolt, clip reload and single-cartridge reload use the real existing clips and original timing authority. Recoil returns within a bounded 0.42 s envelope; real movement/sprint drives restrained bob and stance, with mission-clock breath. The cloned rifle material keeps its atlas while reducing gloss. The original procedural fallback remains available.

Only production files changed: `src/render/m01-viewmodel.js` and new `src/render/m01-wz29-presentation.js`. All other additions are focused tests, verification tools and documentation. No environment reference merge, PR #41 edit, asset modification, gameplay modification or schema 2 change occurred. Main remains untouched.

## Audit and numerical contracts

See [AUDIT.md](AUDIT.md) for actual source path, rig, landmarks, clips, blending, fallback and reproducible measurement method. Measurements are LOCAL at 1280×720, weapon FOV 58°, near 0.03 m; no camera/FOV change.

| Measurement | BASE | CANDIDATE | Tolerance / interpretation |
| --- | ---: | ---: | --- |
| Idle ADS rear/front horizontal error | 0.521518 px | <0.000001 px | 0.5 px after ADS completes |
| Idle ADS rear/front vertical error | 8.691911 px | <0.000001 px | 0.5 px, outside recoil/reload |
| Muzzle socket / flash distance | 0 m | 0 m | 1e-8 m; existing invariant preserved |
| Captured candidate vertices behind near plane | — | 0 | All 39 candidate pose/preset samples |
| Closest captured candidate vertex | — | Z=-0.095234547 m | 0.065234547 m clearance |
| Dense Node pose sweep | — | 560 samples, no near violations | LOD0/1, hip/ADS, bolt/clip/single, move/run |
| Weapon idle triangles / draw calls | 3017 / 2 | 3017 / 2 | No geometry/call increase |
| Weapon idle materials / textures | 1 / 3 | 2 / 3 | One cloned material; no added texture |
| Clip reload triangles / draw calls | 3635 / 3 | 3635 / 3 | Unchanged |
| Single reload triangles / draw calls | 3049 / 3 | 3049 / 3 | Unchanged |

Clips measured from GLB: aim 2.0 s, fire_bolt 1.169999957 s, reload_clip 3.400000095 s. Authoritative bolt 1.05 s, clip 3.4 s and single cartridge 0.8 s remain unchanged. ADS/move/run visual time constants are 0.045/0.09/0.10 s. Pause freezes phase and blending. Save/checkpoint reconstruction detects the replaced world and rebuilds presentation; no mixer is saved.

## Gameplay equality

The focused suite compares exact snapshots and events over 600 identical gameplay ticks with BASE/CANDIDATE visuals. Player transform/facing, weapon state/ammo, shots, gameplay muzzle/rays, hitboxes, RNG, mission/checkpoint state and both clocks remain exact. The 132 protected source/asset/mission/workflow files in `protected-source-equality.json` are byte-identical to the base. No authoritative gameplay RNG is used by presentation. All 39 screenshot pairs also preserve player, weapon, gameplay muzzle, hitboxes, camera and clocks exactly. These are tested fixtures, not a claim about untested states.

## Browser evidence

[pairs.html](pairs.html) presents thirteen unmodified BASE/CANDIDATE screenshot pairs. `browser-metrics.json` records 78 captures across real LOW/MEDIUM/HIGH presets, all snapshot/pause comparisons true, no browser errors or failed requests. Candidate capture source is the committed 97298f8ae372b71cffaa854cba13a1b979530293.

| Pair | Case |
| --- | --- |
| A | Hip idle |
| B | Complete ADS |
| C | Recoil |
| D | Bolt cycle |
| E | Clip reload |
| F | Walking |
| G | Actual sprint |
| H | Muzzle flash |
| I | Single cartridge reload |
| J | ADS while walking |
| K | ADS firing |
| L | Save/restore |
| M | Checkpoint restore |

`fixtures.json` records genuine controlled simulation snapshots. Staging freezes clock/state/camera for a defensible pair; this is actual production rendering in a browser, not an uninterrupted manual playthrough. Full-scene and isolated weapon counters are separate. Counters are not FPS. **FPS EM CHROMEBOOK NÃO MEDIDO.**

## Tests, failures and final verification policy

15 focused Node tests cover real asset metadata, sights/grip, materials/source immutability, clipping, bounded recoil, phase/pause, fallback, restore, gameplay equality and preserved MG34/CKM/station paths. Three new browser tests cover LOW/MEDIUM/HIGH through the actual production continue UI.

The first full browser run produced 36 passes and three genuine failures: menu rendering left restored ADS at 0.670807 instead of 1. This was fixed in 9d91e3be9b0bef1556aa3ffa1d47ed6a11edd386 by rebuilding only presentation at the world restore boundary. `browser-initial-failed.log`, contexts and the LOW trace preserve the failure. Duplicate MEDIUM/HIGH traces are omitted; no failure is hidden as a pass.

After that fix, full Node was **257/257 PASS** (136.054 s), and full browser **39/39 PASS** (813.188 s), retries/skips/flaky/failures all zero. The raw Node log, browser log and compressed Playwright JSON here refer to source **9d91e3be9b0bef1556aa3ffa1d47ed6a11edd386**, before the final sleeve-anchor adjustment. `browser-fixed-source-summary.json` explicitly records that scope. The final source 97298f8ae372b71cffaa854cba13a1b979530293 additionally passed the 15 focused tests and all 78 final captures.

The four required commands are to be run again **after this documentation commit is published**, at its exact HEAD: `npm ci`, `npm test`, `npm run build`, `CHROME_EXECUTABLE=/tmp/chromium npm run test:browser`. Final counts, exit codes and SHA belong to the delivery message; the archived earlier logs must not be described as the final-HEAD run. No configuration, retry policy or timeout is increased. No CI, workflow dispatch or Chromebook performance result is claimed. Build's existing large-chunk warning is a warning, not a failed build.

## Limitations, next step and recommendation

Near-plane tests cover sampled referenced mesh vertices; they do not certify universal finger/rifle self-intersection avoidance. Hands remain faceted, fingers retain authored transforms and the simplified solid tangent sight has no newly modelled notch. Artistic and physical Chromebook review remain necessary. No historically perfect rifle or commercial-game-quality claim is made.

Recommendation: **READY_FOR_CAPTAIN_REVIEW only if the final published-HEAD validation is green**, otherwise BLOCKED with the actual failing command. Review the ADS/hip/reload pairs and material readability on the target device before approving a separate integration. Do not add upper-body layering, generic IK, new reload gameplay, environment changes or another runtime task. Do not merge or touch main.
