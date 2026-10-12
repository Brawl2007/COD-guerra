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

The far owner merges original roofs, towers/chimneys, tree lines and altitude mist into five single-LOD meshes.
All vertices are west of x −460 or east of x 1,800 and outside the complete participant envelope. T16 lighting,
clock, fog and sun are read unchanged. `farAnchors` provide true bearing references (+X east, +Z south), never
visible cities at their actual 39.7/15.8/36.1 km distances or invented sounds. This scenery is estimated original
art, not a surveyed reconstruction of 1939 buildings.

The owners build once, borrow no texture ownership, rebind world references/revisions and quality without
rebuilding, and release owned geometry/materials once. Their debug switches invalidate paused rendering.
Only the new owners and small view integration are production changes.

Local implementation checks: 18 focused Node tests pass (new envelope/ground/far contracts plus existing terrain
material lifecycle); production build passes with 92 modules. Tests pin independently recorded actual source
buffer hashes, retain every protected/crossing source triangle and attribute, exhaust the 1 m protected grid,
check fixed-seed/river behavior, camera-frustum triangle ceilings and once-only borrowed resource teardown.
Exact canonical route-fixture camera/frustum buffer submissions were 14,192 / 35,680 / 6,840 triangles for
01 / 09 / 17 (10 submitted 35,712); these are not browser results. Production callbacks are the authority for
final budgets and skyline pixel evidence.
No FPS, VRAM, human playtest or Chromebook claim is made.

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
