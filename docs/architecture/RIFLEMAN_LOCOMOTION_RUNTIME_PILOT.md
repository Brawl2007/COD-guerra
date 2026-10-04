# Rifleman locomotion runtime pilot

M01 remains **PROTÓTIPO JOGÁVEL**. Four-ID production presentation pilot based on `5f3cc34f53c61beec52255d67f8babd7194c9f7f`. Soldier Animation reference `cd91d65f0c022678ed24785eb44233bab137eb3c` was read, not merged. Real measurements/method: `docs/verification/m01-runtime/rifleman-locomotion-2026-10-03/ASSET_AUDIT.md`.

## Ownership and scope

`M01Characters` opts in only `de_spans_6/7` and `pl_east_0/1`, when the existing specialized resolver returns standing idle/walk/run and the actor is standing, active and alive. Shooting/aim, crouch, suppression, wounds, casualties and transports continue through the existing resolver. No upper-body blend is introduced. MG34, CKM, station patient/medic, Bąk and named critical actors never enter the pilot.

`RiflemanLocomotion` observes x/z displacement and mission time before camera, LOD, quality, skin budget or asset selection. It stores at most four presentation records, never writes actor data, imports no simulation/spatial/RNG code and is absent from snapshots. Model position and rotation retain the exact existing authoritative assignments. Visual muzzle is diagnostic only; spatial gameplay muzzle is untouched.

## Speed and gait

| Setting | Value / rule |
| --- | --- |
| walk nominal | 1.099945 m/s, measured support velocity |
| run nominal | 3.251546 m/s, measured support velocity |
| playback | actual horizontal speed / nominal speed |
| safe range | .5–1.8 ×; clamp is diagnosed |
| stop | speed < .04 m/s → idle |
| enter run | speed > 1.75 × walk nominal = 1.92490375 m/s |
| return walk | running and speed < 1.5 × walk nominal = 1.6499175 m/s |
| fresh history | one idle observation; no inferred displacement/velocity |
| discontinuity | backward clock, different actor data object (restore), or gap > .5 s rebuilds presentation history |

Actual mission speeds give walk ~1.364 × (1.5 m/s) and run ~1.692 × (5.5 m/s). Thresholds overlap safe playback ranges and provide hysteresis. The 3.6 m/s case is a controlled fixture, not a new mission speed. Very slow/extreme speeds can retain sliding after clamping; animation never changes gameplay speed.

## Crossfade and phase

Idle/walk/run transitions use **.22 s** with mission-time smoothstep weights summing to one. At transition start old weights remain intact and the new clip has zero weight; interrupted fades capture the entire previous weight vector. Diagnostics expose duration, start time, old/new clip weights, source vector and shared normalized phase. Three actions bind once per skin instance and sample explicitly with `mixer.update(0)`; no `stopAllAction`, wall-clock mixer update or action reset occurs during pilot gait swaps.

Walk/run share normalized phase without gait-change reset. Each observation integrates bounded playback rate / clip duration. Actor-ID hashing supplies deterministic initial phase without gameplay RNG or random rate variation. Idle breath derives from mission time and ID. This aligns phase between provisional clips, not foot locking; support lengths differ.

Records persist through LOD replacement/culling; the new mixer samples the same phase/weights. Actors outside the rendered set remain observed, so camera/budget do not determine semantic movement. Paused mission time freezes phase/fade. A fresh renderer/restored actor object reconstructs cosmetic phase and acquires speed at the next observation; exact old foot pose/crossfade is **not saved**. Schema 2/checkpoint semantics are unchanged.

Leaving the pilot for a legacy action stops pilot actions and invokes the existing sampler. Crossfades to aim/fire/crouch/death are outside scope. Full/partial failure of the three required clips removes the skinned pilot from selection and retains the existing procedural presentation/gameplay; movement continues.

## Foot-slide proof

The exact baseline renderer source is extracted from the base commit into a temporary verification module, deleted when the fixture closes. Both renderers use the same GLBs, trajectories and steps. The gallery has two display lanes; the numerical experiment has no display offset.

Sample left/right ankle **world horizontal displacement** at 120 Hz for 6 s per case. Exclude first 1 s, transitions, wraps and intervals outside measured support at either endpoint. Report mean, P95, maximum drift velocity, counts and raw intervals. Acceptance for straight/flat fixtures: candidate mean <=35% of base, mean <.10 m/s, P95 <.25 m/s. This average support metric does not declare zero sliding. Spikes, toe/sole contact, curved paths/slopes and acceleration require further review.

Actual mission UI continuation uses a naturally reached schema 2 snapshot at clock 947.8 s. Only stored camera yaw is oriented toward the observed soldiers; positions/actors/mission/RNG/weapon are preserved. Pause/resume/page reload use real controls. Diagnostics/screenshots are separate from the isolated gait fixture.

```sh
node tools/verification/m01-rifleman-clip-audit.mjs
node --test tests/m01-rifleman-locomotion.test.js
npm test
npm run build
CHROME_EXECUTABLE=/path/to/chromium CI=1 npm run test:browser
CHROME_EXECUTABLE=/path/to/chromium node tools/verification/verify-m01-rifleman-locomotion.mjs test-results/rifleman-gallery
```

Focused config `tools/verification/rifleman-playwright.config.mjs` isolates the real-save UI case on port 5185 with separate output. The ordinary browser suite also discovers the test. Evidence is automated Chromium/SwiftShader, not human playtest, CI or Chromebook FPS. Review four actors before expanding scope or adding clips.
