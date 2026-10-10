---
name: threejs-conventions
description: COD-guerra renderer conventions for Three.js 0.186 — resource disposal, no per-frame allocation, instancing and LOD, quality tiers and the performance budget of the reference PC (Intel HD 5500, 1366x768). Use before writing or reviewing code in src/render/ or any Three.js scene, material, FX or asset-loading code.
user-invocable: false
---

# Three.js conventions (COD-guerra)

Applies to `src/render/`, the viewmodel, FX, materials, asset loaders and their tests. Project rules in
`AGENTS.md` still win: the renderer never decides damage, visibility, events or mission state, and x/z are
ground, y is height in metres.

## Reference machine

- Performance target (H12 in `docs/direction/DECISIONS.md`): Acer TravelMate P645-S, i5-5200U (2 cores,
  4 threads), 8 GB RAM, **Intel HD Graphics 5500** integrated, **1366x768**, Chrome or Edge on Windows 10.
- Never state FPS without a measurement on that PC. Headless/SwiftShader numbers are not FPS evidence.
- Fill rate and overdraw are the first limit on this GPU: full-screen passes, large transparent particles and
  high pixel ratio cost more than vertex count.

## Quality tiers

- Tiers live in `src/render/three-renderer.js` (`QUALITY`: low/medium/high with `ratio`, `shadows`,
  `particles`) and FX density in `src/render/m01-view.js` (`FX_DENSITY`). Read them; never hardcode a second
  copy of these numbers.
- Every new costly feature (shadows, post-processing, particles, extra lights, high-resolution textures)
  scales with the tier or has an off switch on `low`. Gameplay-relevant cues (tracers, warnings, enemy
  silhouettes, cover readability) never depend on the tier.
- The tier is a renderer setting only; it must not change simulation results.

## Disposal

- Whoever creates a geometry, material, texture or render target owns it and disposes it: `geometry.dispose()`,
  `material.dispose()`, every texture slot (`map`, `normalMap`, `roughnessMap`, `aoMap`, ...),
  `renderTarget.dispose()`.
- Shared resources (cached materials, atlases, GLB kits) are disposed once by their cache owner, never by each
  user. Mark ownership in the code that builds the cache.
- Removing an object from the scene is not disposal. Restore from checkpoint, mission exit and quality change
  must not leak: dispose what was replaced.

## No allocation per frame

- No `new THREE.Vector3/Matrix4/Quaternion/Color`, arrays, closures or object literals inside `update()`,
  `render()` or per-actor loops. Use module-level or instance scratch objects and reuse them.
- No `clone()` of materials or geometries during play; create variants at load time.
- Pools for particles, decals, tracers and bombs (the existing pattern: fixed-size pools such as
  `JU87_BOMB_POOL`); a pool never grows at runtime.

## Draw calls and instancing

- Many copies of the same mesh (vegetation, sleepers, rivets, sandbags, debris, distant soldiers) use
  `InstancedMesh`, as `m01-environment.js`, `m01-damage-decals.js` and `m01-train-consist-detail.js` do.
- Merge static geometry that shares a material; keep the number of distinct materials low.
- Distant actors and vehicles use LOD levels or impostors (`THREE.LOD` in `m01-locomotive.js` and
  `m01-panzerzug.js`; distant-front impostors in T20). Full skinned soldiers are the most expensive object:
  only those near the player are LOD0.
- Check `renderer.info.render.calls`, `.triangles` and `renderer.info.memory` before and after a change and
  report both numbers in the evidence.

## Lights, shadows, transparency

- One shadow-casting directional light at a time (the sun); shadow map 1024² unless the tier says otherwise.
  Do not add shadow casters for small or distant objects.
- Prefer baked or vertex lighting and emissive textures to extra dynamic lights.
- Transparent sprites (smoke, dust, fire) are sorted and small on screen; large overlapping transparent
  quads are the main overdraw risk on the HD 5500.

## Textures and assets

- Power-of-two textures, mipmaps on, atlases where the pipeline already makes them
  (`tools/assets/...`); 2048² is the upper limit per texture unless measured.
- Every asset has author, licence, scale and animations recorded in its manifest (`AGENTS.md`). Nothing taken
  from Call of Duty.

## Evidence for renderer changes

- Node tests for pure logic (resolvers, profiles, pools); a focused Playwright check for what must be seen.
- Before/after `renderer.info` numbers, and screenshots at 1366x768 for visual changes.
- `git diff --exit-code` on simulation authority files when the task is presentation-only.
