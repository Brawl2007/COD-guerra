# T40/T50 implementation candidate

Base: accepted playable `d151a97239a54dc3f92b594e88ae5933c6bdfa06`. Work branch: `codex/m01-t40-t50-fp-loading-v1`. Implementation code commit: `c17cb40333b58b4164eeab097932094789c0c09e`; narrow browser seed correction: `6fa19741abf45c18279fc574c6b59d1bd7df9df5` (no production byte changes). This document records implementation work, not task acceptance or integration.

T40 adds two private GLBs under `characters/fp-arms-v2/`, produced by a readonly transform in `build-fp-arms.mjs`. It retains the accepted rig/socket/finger bindings and source sleeve atlas, closes seven welded geometric boundaries, adds original rounded palms and thirty separately weighted finger segments on a skin material, plus closed wrist bands and leather tabs. The patient uses the accepted detailed LOD1 face/body/helmet and compact LOD2 webbing with explicit bone-name remapping. Original third-person files, clips and variation remain byte-identical. The private carry pass samples the accepted carrier/patient pickup/putdown and walk clips, then folds the private patient limbs into a low horizontal cradle with two-bone support contacts; 1.6-second phases and saved-clock sampling remain authoritative.

Arm/cap/cuff/strap/finger meshes total **1850 triangles**. Arms + rifle = **3264**, plus visible clip = **3882**; private patient + arms = **5869**. The renderer reports actual complete weapon-scene draw callbacks, including sprites, fallback, clip/cartridge and patient, separately from geometry totals. Optional FP fetches run in the existing character registry, do not block mandatory readiness, and increment its existing paused-frame revision on residency. No `m01-view.js` frame-cache changes; both damage texture version keys remain intact.

T50 selectively reuses the older candidate's progress store, menu controller and layout. The current AssetManager reports real loader progress/settlement once per cache record, clears ownership on dispose and safely releases late values. No timer drives progress. Existing mandatory bridge readiness/failure and optional actor fallbacks remain authoritative. Main dynamically imports the existing Game only after exposing the loading shell; pointer-lock continues to be requested by native start/continue/resume gestures. Three core, loaders and French simulation are separate chunks. The static entry + transitive imports + explicit HTML JS preload graph is measured by `verify-t50-bundle.mjs`, not just the entry filename.

Barlow Regular is self-hosted with complete OFL 1.1, source URL/date and SHA-256. A font gate exposes successful UI with its final face; rejection or a 3-second bound exposes the existing readable fallback. It makes no external font requests.

## Local verification and limits

- Focused original viewmodel/feel + new GLB/loading tests: 36/36 at the recorded intermediate source; new final GLB/font/loading checks: 7/7. Logs retained in `local-checks/`.
- Build and entire static initial graph: PASS, 10883 raw JS bytes at current build; dynamic game/Three graph is explicitly excluded and reported separately.
- Native production ADS05 + delayed real bridge loading/required failure/French recovery: 2/2 PASS. The earlier two FAIL results remain preserved: the new spec's default 5-second locator expectation expired on software WebGL; 30-second task expectation allows the same assertions.
- Exact saved-clock canonical01/05/14: baseline3/3 and final candidate3/3 PASS. Frozen pickup/carry/putdown: baseline1/1 and final candidate1/1 PASS (three phases each). All six paired captures pass exact complete snapshot/checkpoint/events, player/camera and clock comparison in `local-checks/exact-before-after.json`. Native totals are3264/3264/3882 for01/05/14 and5869 for each carried phase.
- Final corrected native ADS/midreload save/reload and late-FP paused residency/optional failure: 2/2 PASS on6fa. Native before/after residency is3017→3264 triangles at the same0.05 clock with complete authority equality and a real renderer frame increase; all post-residency meshes include the new `fp_hands` draw.
- Original 67 protected authoritative/third-person files remain SHA-identical. `m01-loading.test.js` separately pins the authorized AssetManager predecessor/current revision; the old guard manifests/goldens are unchanged.

No human playtest or device FPS claim. Independent full Node/tooling/build, production browser verification and critical review remain required before acceptance/integration. Original private rounded palm/finger geometry replaces the predecessor hand surfaces; the large pink foreground triangles in ADS are the inherited rifle stock, confirmed by actual-mesh raycast in `local-checks/inherited-stock-raycast.json`; face art remains stylistically provisional; this task does not claim historical uniform approval.

## Raw attempt history

`browser-initial-FAIL.log` preserves two5-second locator expectation failures; `browser-second-PASS.log` records their same-assertion30-second rerun. `native-pointer-race-INTERRUPTED.log` preserves the early lock-before-input-clear harness race. `superseded-carry-functional-PASS-visual-rejected.log` remains a functional PASS with visual defects, superseded by the final horizontal cradle captures. The next native reload attempt restored the initial seed instead of its newly saved checkpoint; trace showed the test init script overwriting localStorage on reload. Commit6fa applies the seed only once per session, preserving all timing/equality assertions. The immediate post-interrupt rerun hit the old server while it was shutting down (setup-only failure, no tests executed); its log is retained. The next isolated native save/late-FP run passed2/2. These earlier attempts are not reclassified as final PASS. Raw traces remain in the isolated `test-results/t40-t50-*` folders.

`source-before-commit.json` is an intermediate uncommitted implementation inventory, not a certification. The later committed-source reports assert each file hash equals `git show HEAD:path`, in addition to all67 protected files.

## Reproduce

```sh
npm run build
node tools/verify-t50-bundle.mjs
CHROME_EXECUTABLE=/usr/bin/chromium npx playwright test -c tools/verification/playwright.m01-t40-t50.config.js --workers=1 --retries=0 --output=test-results/t40-t50-candidate
# Against a separately built immutable baseline worktree:
T40_BASELINE_ROOT=/absolute/baseline npx playwright test -c tools/verification/playwright.m01-t40-t50.config.js --output=test-results/t40-t50-baseline
node tools/verify-t40-comparison.mjs test-results/t40-t50-baseline test-results/t40-t50-candidate test-results/t40-t50-comparison.json
node tools/verify-t40-t50-source.mjs test-results/t40-t50-source.json
```

Regeneration only: `npm ci --prefix tools/assets/m01-soldiers --ignore-scripts` then `node tools/assets/m01-soldiers/build-fp-arms.mjs`. This generator writes only the new private variant directory.
