# Correction 03/03 — M01 T40/T50

Implementation source: `a1ed6ff77ff8cf0bfdff7930f33bf2a2a72ee084` on `codex/m01-t40-t50-fp-loading-v1`, parent `bea4149ba71d5a06f33d1d456671a51bc6c4c888`.
Context check before edits: `PACKET=VALID REASONS=none`. Required project/captain guidance and exact attempt-2 independent report read. Routing: assigned implementer-deep, inherited supported model, source=rule, no paid Jev, no subagents, no push/integration/main writes.

## Exact corrections

1. New FP manifest and generator record truthful project authorship, metres, and both generated GLB filenames, bytes and SHA-256. Existing MakeHuman CC0 provenance and pending project-art licence retained. Running the generator reproduced existing FP GLB bytes exactly; only manifest metadata changed. All third-person bytes remain protected.
2. Visible mesh diagnostics and native draw callbacks count absent index/position as zero, preserving indexed and nonindexed real counts. Existing empty reload fixture is unchanged.
3. Physical redraw reset key moved from exposed `native.frame` to internal `this.nativeFrame`. Real per-frame callback resets, clock, mesh listing, calls and triangle observations remain live. Existing feel deep equality, FOV, clock and pixel assertions unchanged. No m01-view.js edits or frozen synthetic metrics.
4. Only lifecycle harness changed for accepted preexisting A/B audio behavior. It captures both actual convolvers, asserts zero menu allocations at high and after Low selection, asserts exactly two low durations A=1.2/B=.45, and verifies no reallocation/duration change across persisted pagehide/resume. Original low-quality, persisted lifecycle, frozen clock, resume/audio, loop uniqueness and pageerror assertions preserved. Production audio bytes untouched.

## Local checks

- Focused Node: `node --test tests/assets-manifests.test.js tests/m01-character-assets.test.js tests/m01-fp-arms.test.js tests/m01-loading.test.js tests/m01-wz29-viewmodel.test.js tests/m01-viewmodel-feel.test.js`: PASS 50/50, no skipped/cancelled/todo. `CORRECTION_03_NODE.log`.
- Production `npm run build`: PASS. Existing chunk-size advisory retained. `CORRECTION_03_BUILD.log`.
- Direct actual draw callback check: empty/indexed/nonindexed geometry 0/1/2 triangles, actual report total 3, calls 3, clock retained; native report identical after renderer frame advances 1→2 while internal key advances: PASS. `CORRECTION_03_DIAGNOSTICS.log`.
- Generator: PASS, FP GLBs byte-identical to predecessor; manifest bytes/SHA generated from actual outputs. `CORRECTION_03_GENERATOR.log`.
- `git diff --check`: PASS.
- Postcommit source/protected audit: PASS, 67 protected files and 121 source files exact HEAD. `CORRECTION_03_SOURCE.json`.
- Single prescribed existing browser run: FAIL 2/3, exactly one execution per test, workers=1/retries=0, Chromium154 `/usr/bin/chromium`, task port4187 initially free and preview auto-cleaned by Playwright. No processes killed. `CORRECTION_03_BROWSER.log`, `CORRECTION_03_BROWSER.json`, `correction03-browser/`.
  - Lifecycle PASS42.6s, including both real A/B buffers and strengthened allocation/resume checks.
  - Near-wall feel PASS55.3s, including full frozen diagnostics, pixel equality, wall lowering and raised-again checks.
  - Hip/mid-ADS feel FAIL1.5m: `tests/browser/m01-viewmodel-feel.spec.js:106`, `page.waitForFunction(()=>window.__feel.mid,null,{timeout:60000})` timed out after real right-button down. Initial hip pause full diagnostics/FOV/clock/pixel checks completed; mid-ADS and later ADS/curve assertions were not reached. No native.frame diff remains in this failure. Preserve trace and error context under `correction03-browser/m01-viewmodel-feel-hip-mid-c0af1-e-freezes-the-weapon-region/`. No retry, timing/test change, scope expansion or further implementation attempted. Root notified immediately; exact failure requires independent assessment on CI.
- Source/protected audit repeated after browser: PASS67 protected /121 exact committed source. Tracked working tree clean. No main/integration/push by implementer.

## Honest history and remaining gates

This is final bounded correction03/03; no counter resets/extensions and no acceptance claim. Prior attempt1 FAIL and attempt2 FAIL remain preserved, including bea CI full Node879/881 and existing browser6/9; bea new9/9 and native E/W/E1/1 remain attributed only to bea. Root owns fresh full Node/tooling/build CI and new9+existing9 source-pinned production gate, then independent verifier and critical review. No full-suite pass inferred from focused local results. Budget: fix03/03, review rejection0/2.
