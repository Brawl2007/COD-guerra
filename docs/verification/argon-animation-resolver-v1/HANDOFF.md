# Animation Resolver V1 — Argon / V7 integration candidate

Base: `codex/m01-final-production-consolidation-v7` at `4c6f7bebee27b68af3bea8ad086da1dffbca0084`, PR #59.
Candidate branch: `argon/m01-animation-resolver-v1-integration`, targeting V7 (NOT main).

Source: Argon delivery `argon-m01-animation-resolver-v1.zip`; reconstructed base was incomplete, so integration used exact V7 Git blobs for `m01-characters.js` and `m01-actor-pose.js`. The patch was reconciled with MG34 prone, CKM, S3 drag, Kowal RKM, fallback and resource disposal. Changes are presentation-only. Existing gameplay authority, clocks, save schema, mission, French benchmark, and historical assets must remain unchanged.

New resolver handles gait/odometer sampling, scripted hit and suppression reactions, torso orientation, one-shot turns, transition blending and LOD hysteresis. The six original motion clips are loaded from the existing `motion-clips-v1/m01_soldier_motion_clips.glb`; their published authoring durations and stride lengths are respected as fallback metadata.

Local verification (subset only): Node 22.16, 12/12 pure JavaScript smoke tests PASS, four JS syntax checks PASS, `git diff --check` PASS. The test file additionally covers the separate motion GLB loading path. These smoke tests do **not** substitute for the tests importing Three.js.

NOT EXECUTED here: `npm ci`, the integrated `node --test` tests, complete `npm test`, `npm run build`, Playwright, browser playthrough, visual review, or GPU/FPS measurement on Chromebook. Local terminal has no GitHub/DNS network access or project `node_modules`. The V7 browser workflow targets main PRs and does not automatically validate this V7-targeted draft PR. No single 12/12 full integrated suite is claimed.

Before approval, run Node 24 + npm ci, focused tests `node --test tests/m01-animation-resolver.test.js`, npm test and build, then representative browser/regression tests and visual comparison for skinned clips, MG34, CKM, rescue and 86/89 reload. Check migration, save/reload and LOD fallback. Avoid a costly 95-minute full browser suite until focused checks pass. Do not merge or deploy without explicit user approval. Keep M01 **PROTÓTIPO JOGÁVEL**.
