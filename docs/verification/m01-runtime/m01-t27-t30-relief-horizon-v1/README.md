# T27/T30 relief and horizon V1

Implementation checkpoint, pending independent production browser, full regression, verifier and reviewer gates.
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

Targeted correction checks: 29 focused Node tests pass (new envelope/ground/far contracts, existing terrain
material/track lifecycle and amended original authority test); production build passes with 92 modules. Tests pin independently recorded actual source
buffer hashes, retain every protected/crossing source triangle and attribute, exhaust the 1 m protected grid,
check fixed-seed/river behavior, camera-frustum triangle ceilings and once-only borrowed resource teardown.
Exact canonical route-fixture camera/frustum buffer submissions were 14,192 / 35,680 / 6,840 triangles for
01 / 09 / 17 (10 submitted 35,712); these are not browser results. Production callbacks are the authority for
final budgets and skyline pixel evidence.
No FPS, VRAM, human playtest or Chromebook claim is made.

The former authority test located a generator string inside `M01View`; authorised extraction invalidated that
location assumption. Its replacement preserves the invariant by independently reconstructing/pinning the actual
original ground buffers, comparing actual protected position/normal/UV contact rays, and checking immutable
world, collider and track-owner bytes against integration. Resource verification now records the cold High/default
residency, all four Low/High steps and both geometry toggles, then repeats the same history after reload before
comparing exact residency. The four checkpoint plateau comparisons and exact save/clock checks remain required.
Implementation-owned source/geometry repeats check 621 frozen paths, 39,196 protected/crossing triangles,
20,986 exact halo attribute copies, 424,716 actual surface/normal/UV samples and 152 contact/range rays, all
with zero delta. The whole protected union has 444,600 physics/visual samples with zero delta; its 19,884 skirt
surface comparisons differ at most 4.44e−16 by interpolation arithmetic. Original legacy geometry remains
104,000 triangles; all prepared extracted/skirt geometry totals 59,512, with actual frustum submissions subject
to the unchanged 52,000 per-view ceiling. Far triangle interiors avoid the complete hull margin, with five
single-pass material owners. Collider check verifies 83 boxes; route verifies 26 events/four checkpoints/health92;
tooling passes 173 tests. These are implementer preliminary proofs, not independent acceptance.

Corrected production probes preserve exact save/camera/clock and an unchanged control patch: canonical 09
Relief changes 65 pixels and canonical 10 Far changes 30 pixels, above the unchanged >20 criterion. Earlier
01/17 and supplemental corrections passed separately. The mandatory single full six-view plus resource run
is in progress against frozen source; full normal regression, exact published-head CI, all 12-seed both-route
futures and independent verifier/reviewer acceptance remain gates pending at this checkpoint.

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
