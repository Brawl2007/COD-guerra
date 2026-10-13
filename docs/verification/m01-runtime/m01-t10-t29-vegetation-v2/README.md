# M01 T10/T29 vegetation runtime evidence

The production owner loads the original GLB with GLTFLoader and concatenates its actual primitive accessors into shared species batches. Vertex/fragment selectors discard other species within each batch. Every submitted index, including this heterogeneous padding and double-sided transparent passes, is counted by actual main-camera `onBeforeRender` callbacks. Shadow work is measured independently by `onBeforeShadow`. Structural capacity counters are also exposed and explicitly named; they are not GPU submissions.

| Preset | Main draw limit | Submitted triangle limit | Ground density stride | Near/LOD1 boundaries |
| --- | ---: | ---: | ---: | --- |
| Low | 24 | 120,000 | 4 | 20 m / 55 m |
| Medium | 36 | 220,000 | 2 | 35 m / 75 m |
| High | 48 | 350,000 | 1 | 50 m / 90 m |

All presets enter crossed impostors at 120 m. On return, an already selected impostor remains until below 116 m. Other tree boundaries use ±4 m hysteresis. Grass and reeds use the same strict 40 m CPU and shader cutoff, fading from 34 m, with the original bank/path keepouts and per-preset density strides. Low casts no vegetation shadows. Medium casts near kit wood and the exact 17 physical receivers. High additionally casts near kit foliage with the same alpha and mission-clock wind deformation in its depth material. No middle/far/impostor/grass foliage casts shadows; at most three batches cast.

The complete deterministic layout remains 17 physical + 195 visual trees, 34 eastern trees, 716 shrubs and 23,038 ground entries including 900 reeds. Ground density affects submitted entries only. Physical near trunks retain their actual `trunkGeometry(9)` LatheGeometry buffers, all 17 Float32 transforms and immutable damage-decal descriptors; generated kit wood is skipped for those trees. The [physical baseline](physical-trunk-baseline.json) records original bytes and descriptor values. Presentation canopy, visual trees, shrubs, grass and contact shadows seat through the T27 actual triangle sampler, outside its protected union. Physical trees keep their original positions.

The optional kit deadline is 120 seconds, allowing a real slow load to complete during a cold renderer startup. The earlier 15-second deadline expired during the deliberate held-response browser case; its raw failed attempt remains preserved. Explicit short-deadline Node tests independently prove hung/late teardown. While loading or failed, untextured, explicitly labelled degraded legacy tree crowns, all 195 decorative trunks and nearby shrub silhouettes remain visible on both banks. They are removed from submission when the actual GLB becomes ready and are never reported as GLB residency.

One owner retains loaded asset resources, merged geometry, material clones and one authored shared alpha atlas. Exclusive loaded bitmaps close once, borrowed bark resources stay with the environment. Failed/partial/timeout/late loads dispose their exclusive resources; a late successful load increments the paused-render revision before the view's early return. World reference/revision and relief sampler revision rebind prepared transforms. Same-capacity updates reuse matrix/species attributes and geometry. Mission-clock-only frames update wind uniforms; paused frames preserve the submitted counters from the last actual render.

Maintained harnesses:

```sh
node --test tests/m01-vegetation-*.test.js
CHROME_EXECUTABLE=/usr/bin/chromium npx playwright test --config tools/verification/m01-vegetation-v2-runtime.config.mjs
node tools/verification/m01-vegetation-v2-futures.mjs --baseline /path/to/exact-b2430fa-checkout --out test-results/m01-vegetation-v2-futures.json
```

The runtime harness uses the original 01/04/09/15/16 canonical saves/cameras plus eastern-bank, near-foliage and 116/120 m views. `?debug=1&visual-verify=1` records actual snapshot/checkpoint/events, camera and mission clock, with prior model/wagon/decal/field/props owners resident. It asserts actual preset budgets, zero unexpected errors, deliberate real-network failure and late paused completion, Low/High churn, four real checkpoint restores, equal warmup before reload, stable owner resources, frozen pixels and resumed foliage wind. PNG decoding and exact pixel differences live in the maintained helper. The futures helper reads real GLB accessors and material values in Node; its DataTexture models CPU ownership, and does not claim browser PNG decoding or GPU residency.

Use `M01_VEGETATION_OUTPUT_DIR` and `M01_VEGETATION_ARTIFACT_DIR` for unique raw-evidence directories. `M01_VEGETATION_BASELINE_MODE=1` and `M01_VEGETATION_BASELINE_ROOT` serve the untouched baseline using the same candidate harness. Final independent verification, source CI and integration acceptance are separate gates; this document does not assert that those gates have passed. No FPS, VRAM or reference-PC claim is made.
