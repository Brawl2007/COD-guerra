# M01 soldier animation variety (2026-10-18)

Owner playtest complaints: "few soldier animations", "repeated movements" (soldiers look like clones moving in lockstep).
Renderer-side only; the simulation, saves, goldens and gameplay are untouched. Branch `claude/busy-ritchie-3fkvk2-anim`.

## Method (reproducible)

`measure.mjs` replays the real M01 route headlessly (`tests/helpers/m01-route.js`, seed 19390901, support pilot, 1070.9 s of sim clock) and every
0.25 s of sim time asks the real `M01Characters.describe()` + `resolveAnimation()` (the path `M01Characters.update()` uses) what every active
soldier would play. It tallies clips per actor state and, for every group of 5+ soldiers in the same state and clip at the same instant, how far
apart their loop phases are.

```
node docs/verification/m01-runtime/anim-variety-2026-10-18/measure.mjs after  <out.json> --lib    # this branch, clip library loaded
M01_ROOT=<HEAD export of src/> node .../measure.mjs before <out.json>                              # f6913a0, the 8 packs the runtime loaded
```

Raw results: `measure-before.json`, `measure-after.json`. "Lockstep pair" = two soldiers in the same state+clip at the same instant whose loop
phases differ by less than 2 % of a cycle (random placement gives 4 %).

## Findings (before)

* 66 clips loaded at runtime, 40 ever selected in the whole route. `clip-library-v2` (T08, 43 clips, 39 new names) was delivered with
  `runtime_loaded:false` and never wired: no idle variant, fidget, directional hit, directional death, cover idle or posture transition could play.
* 99 % of standing-idle samples = one clip (`standing_idle`); 87 % of kneeling = `crouched_idle`; 99 % of corpses = `fallen`; every hit = `hit_front`.
* Root cause of the lockstep, `src/render/m01-animation-resolver.js` (`actorHash(id)%1000/250`, used as loop offset by `genericCandidate`,
  `resolveStrideSample`, `M01Characters.sample/describe`): `actorHash` is `n*31+charCode`, so `pl_east_0`, `pl_east_1`, ... hash to consecutive
  integers and their loops start 4 ms apart (0.14 % of a 3 s cycle). Median smallest phase gap inside a same-state group: 0.0013.
  Every time-driven loop also ran at exactly rate 1.0 and every sprinting man had the same stride length.
* 22 % of same-state pairs were within 2 % of a cycle; 100 % of time-driven pairs shared the same playback rate; sprint 47 % of pairs in lockstep.

## Results (after, same route, same sim)

| state | samples | clips before | top clip before | clips after | top clip after |
| --- | ---: | ---: | --- | ---: | --- |
| idle-standing | 112757 | 7 | standing_idle 99% | 14 | standing_idle 59% (+ idle_b/idle_c 18% each, 4 fidgets 4%) |
| idle-crouched | 81946 | 9 | crouched_idle 87% | 14 | crouched_idle 50% (+ crouched_idle_b 34%, cover_low_idle, stand_to_crouch/crouch_to_stand) |
| dead | 17230 | 2 | fallen 99% | 5 | fallen 38% (MG34 gunner / prone corpses keep it), death_left/right/crumple |
| pinned (near misses) | 4807 | 3 | near_miss_duck 93% | 4 | near_miss_duck 71% (+ blast_duck 22%) |
| prone | 5568 | 5 | prone_idle 97% | 6 | prone_idle 96% (+ prone_flinch) |
| aiming / firing / reload / sprint / run / walk | - | unchanged | | unchanged | (one authored clip per state; phase and stride vary) |

* Clips loaded 66 -> 101; clips selected over the route 40 -> 56 (16 library clips now play).
* Lockstep pairs 22 % -> 4.1 % (= the random baseline); sprint 47 % -> 3.9 %; time-driven pairs sharing one rate 100 % -> 0.1 %.
* Cohort of 5+ soldiers: mean share of distinct 5 %-phase bins 0.28 -> 0.78.
* Deliberate hard switches (exact crew/station clips) 9 -> 9; crossfaded transitions 7149 -> 9438. No new snap.
* Only 12 soldiers die in this pilot route (most by script), so the death split is not representative: the directional table is tested in
  `tests/m01-animation-variety.test.js` and on the real rig; in real play the player's own shots record `hitYaw`.

### Foot-skate guard (found in review, fixed before the follow-up commit)

The library's idles and one-shots are authored on different foot marks (measured on the real LOD1 rig, model space): `standing_idle_b` 4.9 cm and
`standing_idle_c` 7.3 cm from `standing_idle`; `crouched_idle_b` 0.76 m (other knee) and `cover_low_idle` 0.48 m from `crouched_idle`;
`stand_to_crouch` ends and `crouch_to_stand` starts exactly on `crouched_idle` (0 mm); every fidget starts and ends exactly on `standing_idle` (0 mm).
The first commit re-rolled the idle variant every 12-20 s and fidgeted / transitioned from any variant, which would cross-fade feet over those distances.
Now: one resting variant per (soldier, posture) and never re-rolled; fidgets only from the base standing idle; the authored stand<->crouch clips only
for soldiers whose kneeling idle is the base one (the others keep the plain 0.3 s posture cross-fade, as before). Real-rig tests: stationary soldiers move
their feet 0.0 mm per frame in every resting idle and fidget (except the authored boot step of `fidget_shift`), and stand -> kneel -> stand stays within
1.25x the authored transition peak and rests still afterwards.

## Validation commands (real results)

* `node --test tests/m01-animation-variety.test.js` : 27 / 27.
* `node --test tests/m01-animation-variety-real-rig.test.js` : 7 / 7 (real LOD0..2 pl+de rigs: library bound with no PropertyBinding warning, corpses lie on the ground, 8 neighbours spread, no foot skate, hit clip follows the shooter's side and pushes the head away).
* Focused regression batch, 27 files (animation resolver V1/V2/T35, player, contract, characters, T37 IK + frozen pre-T37 oracle, poses, soldier GLB/motion clips, fp-arms hash locks, MG34/CKM/station/support runtime, LOD, idempotence, asset manifests): 274 / 274, 0 failed (242 s). The one failure seen on the very first batch (frozen T37 IK-off oracle, bit-exact bones) is why the layer is on only when the library is loaded. Full `npm test` was not run (instruction).
* `npm run build` : ok (vite, no errors). Browser smoke, `tests/browser/m01-anim-resolver.spec.js -g "every visible soldier"` (production UI, real GLBs, pause/reload determinism) on port 4181 under flock: run 1 (first commit) passed; run 2 (final code) failed once at `expect(#pause).toBeVisible()` after 5 s while the page snapshot already showed PAUSADO (load: other agents' suites, load average 4-6); run 3 (final code, `0c5a1b2`) passed in 56 s. Image from run 3: `smoke-anim-resolver-paused.jpg`. The MG34 gunner cold-load death spec in the same file (`clip==='fallen'`) was NOT run in a browser; its clip choice was checked in Node on the real route (`fallen`, see the guard in `deathVariant`).

## Deliberate ceilings (`ponytail:` in `src/render/m01-animation-variety.js`)

* One authored clip per gait (walk/run/sprint) and per aim/reload/fire: only phase and stride length vary there.
* No skeleton-level additive head/breath layer (needs bone caches in `M01Characters` and ordering with foot IK/hand pin). The idle variants and fidgets carry the weight shift, glances and helmet/rifle checks.
* `blast_duck` is a seeded 25 % of near misses: an actor carries no "explosion nearby" flag.
* `cover_*_peek_fire` clips are not used: the clip's fire frame (0.52 s) would trail the simulation's `firedAt` muzzle flash.
* Hit direction uses `hitYaw` vs the current `facing`; a turn during the 0.76 s reaction near a sector boundary can switch hit clip (cross-faded).
