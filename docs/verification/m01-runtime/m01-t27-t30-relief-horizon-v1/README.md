# T27/T30 relief and horizon V1

Accepted source: `4e5389b314f3e02b3197139cca953b79a5464d8f` (2026-10-13). Independent verifier PASS and reviewer ACCEPT are recorded in `VERIFIER.md` and `REVIEW.md`. This README is closeout metadata; the frozen 14-file source manifest records its earlier implementation-checkpoint text, while all 13 code/test/harness/workflow hashes remain unchanged.
Base: `claude/m01-integration` at `293a4f116b9b28818b7ff3bda4d83cc49b01014f`.

The renderer derives 61 protected rectangle hulls from playable bounds, all authored cover nodes, participant map
features/routes, mission firing ranges and the complete source destination families (inactive German actors,
platoon withdrawal/recovery, CKM retreat, casualty evacuation and roll-call). The union has a 20 m margin.
Fire-origin regions also include the three actual distant-shot origins; aircraft and the purely decorative rail
endpoint at Malbork are not ground participant routes. Source arithmetic which is private to the immutable
simulation is documented in `m01-terrain-envelope.js`; full-route verification checks every actor on every tick.

Physics remains in the unchanged world. The presentation sampler delegates to `heightAt` inside the envelope.
The extracted ground reconstructs the actual old 2,000 × 650 m, 5 m lattice: 104,000 triangles, 52,531 vertices.
Protected cells, crossing triangles and their 10 m normal/contact halo retain their original triangles and exact
Float32 position, normal and UV attributes. Even flat protected cells remain unsimplified to preserve rounded UVs.
Outside blocks collapse only after checking every source vertex lies on the same horizontal plane and has the
same exact normal; the original UV lattice is copied at retained corners. The borrowed macro/legacy materials
continue to receive the accepted T31 bounded contact hooks and debug material switching.

Seeded field waves, banks and berms consume no simulation RNG. Relief fades outside the envelope and to zero
at the extracted legacy perimeter. A separate coarser skirt reaches beyond the authored 420–2,800 m fog; its
river-channel edges retain the original bed instead of raising the river with noise. The terrain owner owns the
skirt. The three broad old filler boxes remain borrowed presentation objects, hidden with relief and restored
for Relief-off. Actual main-camera callbacks count both extracted/skirt triangles and visible filler submissions.
Shelter/field proxies, water and all previous renderer owners remain unchanged.

The first production gate found canonical 01's low relief fully occluded by the protected rail crest. Actual
paused-camera rays also identified the eastern field shoulder visible from the canonical 09 rail cut. The
corrected northern field ridge keeps a 20 m component and broad 110 m profile; its crest bends south from
z −245 toward the eastern shoulder near (550, −135). The 12 m shoulder component shares that exterior field.
Combined with the existing field/dike components, actual prepared geometry displacement ranges from −4.113
to +29.883 m; the maximum is at (550, −135), with surface elevation 24.883 m. This is estimated presentation
relief, not surveyed terrain. Protected geometry and the river channel remain exact. The component amplitudes
are not presented as the maximum combined displacement. Exterior skirt rows retain this same field profile.

The far owner merges original roofs, towers/chimneys, tree lines and altitude mist into five single-LOD meshes.
The original 32–44 m towers follow the north-west Tczew edge and the northern Lisewo edge; actual frozen
scene rays located the eastern skyline directions between the portal masses. Bodies and trees seat on the
actual submitted terrain triangles, including the skirt, through a constructor-only surface query.
All vertices are west of x −460 or east of x 1,800 and outside the complete participant envelope. T16 lighting,
clock, fog and sun are read unchanged. `farAnchors` provide true bearing references (+X east, +Z south), never
visible cities at their actual 39.7/15.8/36.1 km distances or invented sounds. This scenery is estimated original
art, not a surveyed reconstruction of 1939 buildings.

The owners build once, borrow no texture ownership, rebind world references/revisions and quality without
rebuilding, and release owned geometry/materials once. Their debug switches invalidate paused rendering.
Only the new owners and small view integration are production changes.

Final source CI: normal run `38376693678`, job `115226752483`: **669/669 Node**, **173 tooling**, build **92 modules**, PASS. Focused run `38376693616`, job `115226752605`: authority and production browser **2/2 PASS**, with compilation solely as browser prerequisite. The normal browser job was skipped and is not browser proof. Full local Node also passed669/669 but began during correction diagnosis; exact-source CI is the final full-source authority. Focused local29/29, tooling173, collider83 and route26events/four checkpoints/health92 passed. Independent verifier repeated focused23/23 plus terrain-material and collider checks; see its raw logs.

The final single local production browser run passed2/2 (13.3min). All six baseline/current route snapshots, cameras and clocks match. All ten separate feature comparisons have control maximum delta0 and no page/shader errors. Actual main-camera submissions and changed pixels:

| View | Ground triangles | Relief pixels | Far pixels |
|---|---:|---:|---:|
| 01-start-section-close | 14,368 | 2,595 | 281 |
| 09-repair-sappers | 37,240 | 65 | — |
| 10-repair-threat-lisewo-far | 37,288 | — | 30 |
| 17-panzerzug-daylight | 8,368 | 8,724 | 5,822 |
| supplement-west-banks | 13,808 | 2,076 | 10,184 |
| supplement-east-banks | 8,368 | 9,493 | 5,822 |

The unchanged ceiling is52,000 triangles per view, including all new ground submissions. Entire owner geometry is59,512 triangles, which is not a per-view count. Far isfive actual single-pass submissions/3,232triangles in all required views, within10. Canonical09 relief and10 skyline remain deliberately small behind unchanged rail/portal occlusion; supplemental bank angles add context, not substitute acceptance views. Low/High and four restores plus equally warmed reload preserve exact state and clock.05, with536 geometries/134 textures plateau. Cold High471/134, Low484/128, return High489/130 and geometry-toggle536/134 histories match initial/reload; compare equivalent residency histories, not cold versus warmed scenes.

No FPS, VRAM, human playtest, reference-PC or Chromebook performance claim is made. Triangle reduction alone does not prove frame-rate gains; existing scenes still have substantial draws, shadows and fill cost. M01 remains a playable prototype.

The former authority test located a generator string inside `M01View`; authorised extraction invalidated that
location assumption. Its replacement preserves the invariant by independently reconstructing/pinning the actual
original ground buffers, comparing actual protected position/normal/UV contact rays, and checking immutable
world, collider and track-owner bytes against integration. Resource verification now records the cold High/default
residency, all four Low/High steps and both geometry toggles, then repeats the same history after reload before
comparing exact residency. The four checkpoint plateau comparisons and exact save/clock checks remain required.
Independent verifier source/geometry probes check 621 frozen paths, 39,196 protected/crossing triangles,
20,986 exact halo attribute copies, 424,716 actual surface/normal/UV samples and 152 contact/range rays, all
with zero delta. The whole protected union has 444,600 physics/visual samples with zero delta; its 19,884 skirt
surface comparisons differ at most 4.44e−16 by interpolation arithmetic. Original legacy geometry remains
104,000 triangles; all prepared extracted/skirt geometry totals 59,512, with actual frustum submissions subject
to the unchanged 52,000 per-view ceiling. Far triangle interiors avoid the complete hull margin, with five
single-pass material owners. Collider check verifies 83 boxes; route verifies 26 events/four checkpoints/health92;
tooling passes 173 tests. Independent `verifier-final-*` probes repeat the original implementation-owned preliminary proofs. Physics/visual sampler equality outside the original Plane does not assert that old filler-box/void rendered geometry there was identical.

The final24 future executions use12 explicit seeds (19390901,2,7,41,99,1945,1,3,17,73,1234,4294967295), both existing support/no-support real-control routes. Every tick save and drained event matches exact base:490,051 comparisons and44,104,590 raw actor-hull samples. All120 paired checkpoint backups and24 final backups match. Disjoint final-a/final-b raw runs were completed against published4e5389b, then aggregated and audited independently. This is simulation control testing, not continuous browser playthrough.

Attempt1 source49a1886 and its actual failed CI logs remain in `attempt1/`: an obsolete source-location authority assertion, canonical01 hidden relief and unequal reload warming were corrected in one targeted fix (1/3); no review rejection. Historical first-source futures remain labelled historical. Their stream equality does not replace corrected-source final24 proof. `EVIDENCE_SHA256.json` inventories current durable evidence (excluding itself); source and first-attempt manifests remain provenance records, not mutable current-file manifests. See `FINAL_GATES.json`, `HANDOFF.md` and formal independent reports for status/integration.

Reproduction:

```sh
node --test tests/m01-terrain-envelope.test.js tests/m01-terrain-relief.test.js tests/m01-far-landscape.test.js tests/m01-terrain-material.test.js
npm run build
npx playwright test --config tools/verification/playwright.m01-relief-horizon.config.js
node tools/verification/m01-relief-horizon-futures.mjs --baseline /path/to/exact-base-checkout --out test-results/m01-relief-horizon-futures.json
```

The futures helper runs both existing real-control routes for 12 explicit seeds, comparing full continuation saves
and emitted events every tick against the exact base, with new presentation owners active. It records per-route
state/event/control streams, checkpoint/final hashes, actor sample counts, source hashes and both Git heads.
Every newly generated checkpoint backup is compared directly with the independently running base, with paired
candidate/base hashes, identifiers and ticks; the final checkpoint backup is compared and hashed again.
It is a simulation control test, not a continuous browser playthrough.

The browser harness copies the exact canonical 01/09/10/17 definitions and real route snapshots from the frozen
roadmap harness. Supplemental west/east bank angles add context. It tests Relief separately in 01/09/17 and Far
separately in 01/10/17, with the same paused save, clock and camera and an unchanged control patch. It records
actual submitted triangles/draws, Low/High, checkpoint/reload geometry/texture plateau and shader/page errors.
Actual baseline captures use the same candidate harness against the untouched base production build:

```sh
M01_RELIEF_BASELINE=1 M01_RELIEF_PREVIEW_ROOT=/path/to/exact-base-checkout M01_RELIEF_OUT=test-results/m01-relief-horizon/baseline npx playwright test --config tools/verification/playwright.m01-relief-horizon.config.js --grep canonical
```

`M01_RELIEF_VIEWS=01,10,17` optionally limits captures; it does not waive required views. Browser evidence lives
under `test-results/m01-relief-horizon/` unless `M01_RELIEF_OUT` selects a durable directory. Normal CI owns
Node/tooling/build validation. The focused workflow compiles a production preview solely as a browser prerequisite
because normal CI does not publish a build artifact; it adds browser and frozen-owner authority checks.

Archived `implementer-final-*` and `verifier-final-*` probe scripts retain their original runtime imports and output paths as raw provenance. To rerun them, restore the files and `authority-baseline.json` under `.agent/runs/M01-T27-T30-20261012/`, recreate the detached exact-base checkout there, and run from repository root. The maintained focused tests/harnesses above are the normal reproduction entry points.
