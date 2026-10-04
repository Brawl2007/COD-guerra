# HANDOFF — M01 Visual Placeholder Asset Audit V1

## TASK_ID
`M01-VISUAL-PLACEHOLDER-ASSET-AUDIT-V1`

## MODELO
GPT-5.6 Sol

## ESFORÇO
HIGH

## BASE
`codex/m01-schema2-determinism-audit@5f3cc34f53c61beec52255d67f8babd7194c9f7f`

## BRANCH
`codex/m01-visual-placeholder-asset-audit`

## HEAD FINAL
This handoff is the final content commit. Resolve the branch after this commit for the immutable SHA; the exact remote HEAD is reported externally to the captain.

## FILES CHANGED
Expected final diff is docs/tools only:
- `docs/NEXT_CHAT_CONTEXT.md`
- `docs/verification/m01-runtime/visual-placeholder-audit-2026-10-04/PLACEHOLDER_MATRIX.md`
- `docs/verification/m01-runtime/visual-placeholder-audit-2026-10-04/UNWIRED_ASSETS.md`
- `docs/verification/m01-runtime/visual-placeholder-audit-2026-10-04/P0_BACKLOG.md`
- `docs/verification/m01-runtime/visual-placeholder-audit-2026-10-04/SCREENSHOT_AUDIT.md`
- `docs/verification/m01-runtime/visual-placeholder-audit-2026-10-04/HANDOFF.md`
- `tools/verification/m01-visual-placeholder-audit.mjs`

No `src/**`, GLB, texture, simulation, renderer or gameplay file is intentionally changed.

## TOTAL VISUAL ITEMS AUDITED
**48**

Audit units are visible responsibilities/runtime paths, not individual meshes.

## REAL_ASSETS
**12**

Key normal-path real assets:
- intact wagon GLB path;
- first-raid Ju 87;
- PL soldier GLB path;
- DE soldier GLB path;
- selected wounded/corpse soldier GLBs;
- first-person Wz.29;
- player arms/hands;
- Wz.29 bolt/sights/stock/barrel;
- reload clip presentation;
- MG34;
- embedded rkm wz.28;
- ckm wz.30.

## PROCEDURAL_ACCEPTABLE
**10**

Examples:
- deformed terrain topology/material technique;
- grass/reeds;
- small rocks;
- sandbags at current scale;
- far/over-budget combat soldier simplification;
- single-round reload cartridge;
- muzzle flash/gun smoke at small scale;
- bullet impacts;
- sky/cloud field;
- contact shadows.

These should not be replaced merely because they use primitives/procedural art.

## PROCEDURAL_NEEDS_POLISH
**8**

- sleepers;
- ballast;
- water;
- trees;
- station facade/roof detail;
- distant procedural wounded/corpse presentation;
- smoke/demolition clouds;
- explosion flash.

## VISIBLE_PLACEHOLDERS
**10**

- station main architecture;
- sapper hut/barracão;
- approach rails;
- crates/timber hero-scale props near objective;
- fences/posts;
- train 963 locomotive;
- Panzerzug;
- second-raid aircraft;
- civilians;
- world grenade sphere.

## FALLBACK_ONLY
**3**

- first-raid Ju 87 primitive proxy;
- soldier optional-asset/clip fallback;
- legacy procedural first-person Wz.29/arms.

Important: these are not normal visual debt when the normal asset path is healthy.

## MISSING_ASSETS
**4**

Audit interpretation includes “asset exists but runtime has no dedicated path”:
1. dedicated distant-battle visual layer;
2. intact wagon LOD0/1 runtime selection;
3. damaged/burned wagon states;
4. standalone dedicated rkm wz.28 runtime path.

## HISTORICAL_UNVERIFIED
**1**

Bridge/portal GLB family.

It is a real wired asset, but its own `bridges.manifest.json` status says:
- provisional blocking/placeholder geometry;
- not final;
- not compared with photographs.

Therefore it must not be called historical-final merely because it is a GLB.

## P0 ITEMS
**8**
1. station architecture;
2. sapper hut/barracão;
3. approach rails;
4. tree/canopy repetition;
5. train 963 locomotive;
6. Panzerzug;
7. smoke/demolition cloud;
8. explosion flash.

Full rationale/strategy:
`P0_BACKLOG.md`

## P1 ITEMS
**28**

Includes bridge historical quality, sleepers/ballast/water, props/fences, distant battlefield, intact wagon GLB path and missing higher LOD wiring, damaged wagons, second raid aircraft, combat soldier real paths, civilian placeholder, first-person/crew weapons and other medium-impact items.

## P2 ITEMS
**12**

Includes grass/rocks, fallback-only paths, small grenade, distant procedural casualty treatment, single reload round, small muzzle/impact FX, sky and contact shadows.

## STATION
Current:
- one large `station` box in `tczew-world.js`;
- procedural window/frame/roof/chimney detail in `m01-environment.js`;
- rendered through instanced building boxes.

Classification:
**VISIBLE_PLACEHOLDER / P0**

Asset exists?
**No station GLB found.**

Strategy:
**C + D** — new shell after historical/source lock, preserving collider/open-route authority.

## RAILWAY
Current:
- rails = instanced box segments along authoritative polylines;
- sleepers = repeated wood boxes every ~1.35 m;
- ballast = repeated low-poly dodecahedra.

Classification:
- rails **VISIBLE_PLACEHOLDER / P0**;
- sleepers/ballast **PROCEDURAL_NEEDS_POLISH / P1**.

The bridge rail GLB must not be blindly repurposed as approach-track geometry.

Strategy:
**B** first: improve procedural profile/variation while preserving terrain/polyline authority.

## BRIDGE
Assets:
- rail bridge LOD0/1/2;
- road bridge LOD0/1/2;
- Lisewo portal LOD0/1/2;
- separate collider GLBs/JSON.

Wiring:
**Yes**, through `M01View.loadKit()` and bridge manifest/state.

Manifest material definitions:
10 entries including painted steel, rail steel, brick, masonry, timber, road surface, openings, gate material, rubble and collider debug material.

Tri counts:
not provided by bridge manifest; do not invent.

Classification:
**HISTORICAL_UNVERIFIED / P1**.

## VEGETATION
Trees:
- cylinder trunk/branch recipe;
- repeated leaf planes;
- deterministic placement/variation;
- 17 authored solid trees plus additional decorative generation.

Classification:
**PROCEDURAL_NEEDS_POLISH / P0**.

Grass/reeds:
custom lightweight BufferGeometry, instanced in large count.
Classification:
**PROCEDURAL_ACCEPTABLE / P2**.

Small rocks:
varied dodeca instances.
Classification:
**PROCEDURAL_ACCEPTABLE / P2**.

## TERRAIN
Not flat in topology:
- PlaneGeometry 2000 × 650;
- subdivisions 400 × 130;
- every vertex height sampled from `world.terrainHeightAt`;
- normal recomputation;
- metre-space procedural texture projection.

Classification:
**PROCEDURAL_ACCEPTABLE / P1**.

Main future improvement is visual richness/ground blending, not replacement merely because it is a PlaneGeometry.

## TRAIN
### Locomotive
Normal path:
- one dark box body;
- two cylinder wheel groups.

Code explicitly calls it original placeholder because locomotive identification remains open P16.

Classification:
**VISIBLE_PLACEHOLDER / P0**.

No dedicated locomotive asset found.
Strategy **C + D**.

### Intact wagons
Real covered/open GLBs exist:
- covered: LOD0 2,332 tris; LOD1 1,128; LOD2 516;
- open: LOD0 1,948; LOD1 846; LOD2 364.

Runtime loads **LOD2 only**.

Classification:
normal visible wagon = **REAL_ASSET / P1**;
unused close/medium path = **MISSING_ASSET / P1**.

## PANZERZUG
Current normal path:
- five metal boxes;
- two cylinders.

Classification:
**VISIBLE_PLACEHOLDER / P0**.

No Panzerzug GLB found.
Strategy **C + D**: historical configuration before modeling.

## AIRCRAFT
### First Ju 87 raid
Real GLBs:
- LOD0 13,102 tris;
- LOD1 4,730;
- LOD2 1,636.

Animations in manifest:
- `propeller_spin`;
- `dive_brakes_extend`.

Runtime:
- all three LODs loaded;
- propeller animation wired;
- optional bomb hidden intentionally due historical uncertainty.

Classification:
**REAL_ASSET / P1**.

Its initial box proxy is **FALLBACK_ONLY**, not the normal path after successful load.

### Second raid
Separate `raidPlane` remains primitive and is not replaced by the GLB loader.

Classification:
**VISIBLE_PLACEHOLDER / P1**.

## SOLDIERS
### Real GLB selection
Polish:
- LOD0 14,861 visible tris;
- LOD1 6,022;
- LOD2 1,895.

German:
- LOD0 16,055;
- LOD1 6,446;
- LOD2 2,059.

Shared soldier animation file:
**25 clips**.

Runtime selection:
- low: up to 18 GLB actors, far limit 100 m; PL can use LOD1/2, DE normally LOD2;
- medium: up to 24, far limit 130 m;
- high: up to 28, near/mid thresholds 14/45 m, far 160 m;
- existing MG gunners get special priority/range handling.

Outside selected GLB budget, `M01View.updateActors()` renders the same authoritative pose using procedural instanced body parts.

Important:
- normal close/mid combat soldiers are **REAL_ASSET**;
- far/budget simplification is **PROCEDURAL_ACCEPTABLE**;
- asset/clip failure path is **FALLBACK_ONLY**;
- civilians are excluded from skinned candidate selection and are **VISIBLE_PLACEHOLDER** if seen close.

## FIRST PERSON WEAPON
Normal path is `M01ViewModel`, not the legacy primitive gun.

It:
- clones the PL soldier GLB;
- exposes `rifle` + clip;
- extracts only skinned arm vertices from the soldier body;
- uses real shared `aim`, `reload_clip`, `fire_bolt` animations;
- uses the rig's weapon/clip nodes;
- uses a small procedural cylinder only for one cartridge during partial/single-round reload.

Therefore:
- Wz.29 body: **REAL_ASSET**;
- arms/hands: **REAL_ASSET**;
- bolt/sights/stock/barrel: **REAL_ASSET**;
- normal clip reload: **REAL_ASSET**;
- single round: **PROCEDURAL_ACCEPTABLE**;
- old procedural gun/arms in `M01View.createWeapon()`: **FALLBACK_ONLY**.

This is a major false-positive correction.

## CREW WEAPONS
### MG34
- LOD0 2,432 tris;
- LOD1 1,262;
- LOD2 368;
- aim/burst/reload clips;
- prone extension reuses same kit.

**REAL_ASSET**, wired.

### rkm wz.28
Current Kowal runtime:
- real rkm mesh embedded in PL soldier GLB;
- shared `rkm_*` character clips.

A dedicated standalone kit also exists:
- LOD0 1,476;
- LOD1 744;
- LOD2 234;
- animation kit: carry/aim/burst.

Standalone path is **unwired** and must be compared for sockets/animation compatibility before replacement.

### ckm wz.30
- LOD0 3,904;
- LOD1 2,298;
- LOD2 754;
- one material atlas according to manifest;
- 5 gun animation states;
- 10 gunner/loader character clips;
- tripod/belt/free belt/ammo box modeled.

**REAL_ASSET**, wired.

## SMOKE
Current:
- shared generated puff texture;
- camera-facing instanced quads;
- 17 puffs normal damage / 30 demolition;
- deterministic vertical/dispersal formula;
- bounded 112/192/256 quality capacity.

Classification:
**PROCEDURAL_NEEDS_POLISH / P0**.

The approach is valid; improvement should remain procedural and bounded.

## EXPLOSIONS
Current:
- one additive sprite;
- 12 m aerial or 30 m larger ground scale;
- 0.7 / 1.4 s duration;
- smoke handled separately.

Classification:
**PROCEDURAL_NEEDS_POLISH / P0**.

Recommended future fix:
layered procedural hot core + sparks/debris + dust + smoke transition, without creating gameplay events.

## UNWIRED ASSETS
Highest-value:
- intact wagon LOD0/1 (4 GLBs);
- damaged/burned wagon family (12 GLBs);
- standalone rkm wz.28 LOD0/1/2 + animation GLB.

Partially unwired capabilities:
- Ju 87 `dive_brakes_extend`;
- wagon `wheels_roll` / `doors_open`.

The latter are intentionally waiting for authoritative state and should not be animated from renderer-only timers.

Full:
`UNWIRED_ASSETS.md`

## ASSETS THAT ALREADY EXIST
Real/wired:
- bridges/portal;
- PL/DE soldiers;
- station casualty/drag clips;
- MG34;
- MG34 prone clips;
- ckm;
- Ju 87 first-raid;
- intact wagon LOD2;
- embedded Wz.29/wz.98a/rkm on soldier kit.

Real but unwired/partially wired:
- intact wagon LOD0/1;
- wagon damage states;
- standalone rkm;
- selected optional animation capabilities listed above.

## NEW ASSETS REQUIRED
Assuming parallel environment work does not already replace them:
- station shell;
- sapper hut shell if procedural pass remains insufficient;
- locomotive;
- Panzerzug;
- civilian character art;
- possibly a modular approach-track kit only if procedural improvement is inadequate.

Historical research is required before locomotive/Panzerzug/final station work.

## SCREENSHOT EVIDENCE
**No new screenshots captured.**

The exact branch cannot be checked out locally because the container cannot resolve `github.com`; there is no available agent-browser CLI; the public Pages endpoint was not available through the current reader and would not prove the branch HEAD anyway.

Existing asset-gallery screenshots are not presented as this branch's runtime evidence.

Full:
`SCREENSHOT_AUDIT.md`

## TOOLS
Added:
`tools/verification/m01-visual-placeholder-audit.mjs`

The tool:
- scans the eight requested renderer files;
- reports primitive/instancing/asset/fallback/proxy candidates;
- enumerates GLBs when a local checkout exists;
- explicitly warns that candidates are **not semantic quality verdicts**.

## TESTS
Local tool verification:
- `node --check`: **PASS**
- `--self-test`: **3/3 PASS**

Self-test proves:
1. primitive + asset/fallback/proxy detection;
2. missing requested source detection;
3. local GLB enumeration.

Remote semantic-equivalent scan of the exact branch's 8 requested renderer files:
- box candidates 47;
- sphere 23;
- cylinder 20;
- plane 4;
- capsule 1;
- InstancedMesh 13;
- asset-load/GLB refs 14;
- fallback word 1;
- proxy word 5;
- placeholder word 1;
- procedural word 5.

Those candidates were then manually reviewed. They are not the final classification.

### Tests not run
- actual scanner against a complete local repository checkout;
- `npm test`;
- `npm run build`;
- browser tests.

Reason: local container cannot resolve `github.com`, so no complete checkout exists. No result is invented.

## LIMITATIONS
- no branch-specific browser screenshot evidence;
- no direct visual measurement of “looks bad” from pixels; P0/P1/P2 uses runtime prominence, scale, frequency and primitive-vs-asset evidence;
- bridge historical/visual final quality is limited by its own provisional manifest;
- public/deployed build was not used as evidence because it cannot prove this branch/base;
- no FPS/GPU/Chromebook claim;
- no external asset search/download was performed;
- parallel GPT-6.1 environment production work may already supersede some WORLD/FX P0 items when reviewed later.

## TOP 10 VISUAL FIXES BY IMPACT
Order to review after the parallel environment pass:

1. **Station architecture** — replace/blockout shell only after checking what GPT-6.1 already changed.
2. **Panzerzug** — historically source and create proper vehicle/car assets.
3. **Train 963 locomotive** — resolve P16 identity, then create correct LOD asset.
4. **Approach railway** — improve rail cross-section + sleeper/ballast repetition while retaining authoritative polylines.
5. **Tree/canopy variety** — several procedural silhouettes, not one repeated recipe.
6. **Sapper hut/barracão** — improve/replace close objective shell without route/collider mismatch.
7. **Smoke/demolition cloud** — richer bounded procedural plume.
8. **Explosion flash** — layered procedural explosion rather than one giant sprite.
9. **Use existing wagon detail/state assets** — LOD0/1 selection and damaged/burned kit after authority checks.
10. **Replace remaining close primitive characters/set-piece proxies** — civilians first; then second-raid plane if still visible/important.

## RECOMMENDATION TO CAPTAIN
**Approve this branch as an audit/triage checkpoint only. Do not integrate visual fixes from it.**

Most important conclusion:

M01 is no longer “everything is boxes.” Several visually critical systems already have real GLBs:
- bridges;
- combat soldiers;
- first-person Wz.29/arms;
- MG34;
- rkm;
- ckm;
- first-raid Ju 87;
- intact wagons.

The strongest remaining prototype contrast comes from **mixing those real assets with a few large normal-path primitives**:
- station/hut;
- rails;
- locomotive;
- Panzerzug;
- second raid plane;
- civilians;
- large FX.

Before issuing any environment fix from this audit, compare with the GPT-6.1 `M01-ENVIRONMENT-VISUAL-QUALITY-RUNTIME-PASS-V1` branch and remove already-solved items. Independent follow-up work should favor locomotive/Panzerzug research/assets or wiring already-built wagon assets, because those can avoid conflict with the environment branch.

## STOP
Do not implement fixes.
Do not integrate.
Do not merge.
Do not touch `main`.
Do not start another task automatically.
