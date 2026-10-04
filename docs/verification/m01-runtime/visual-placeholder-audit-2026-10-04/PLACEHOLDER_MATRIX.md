# M01 Visual Placeholder Matrix

Task: `M01-VISUAL-PLACEHOLDER-ASSET-AUDIT-V1`  
Base audited: `codex/m01-schema2-determinism-audit@5f3cc34f53c61beec52255d67f8babd7194c9f7f`  
Audit unit: one player-visible visual responsibility/path, not one mesh and not one draw call.

## Classification

- `REAL_ASSET` — a real GLB/rig asset is the normal runtime path.
- `PROCEDURAL_ACCEPTABLE` — procedural geometry/FX is intentional and acceptable for its scale/distance/function.
- `PROCEDURAL_NEEDS_POLISH` — procedural is a valid approach but current repetition/flatness/simple treatment can still read as prototype.
- `VISIBLE_PLACEHOLDER` — primitive/proxy is part of the normal visible path and clearly stands in for a richer object.
- `FALLBACK_ONLY` — simplified visual is used only when optional/normal art is unavailable.
- `MISSING_ASSET` — the visual role/state has no dedicated wired asset, including cases where a better asset exists in-repo but is not wired.
- `HISTORICAL_UNVERIFIED` — visual asset exists and is wired, but its own manifest/research does not support historical-final status.

Priority is perceived visual impact, not implementation urgency for the parallel GPT-6.1 environment task.

## Inventory

| # | Element | File / runtime path | Current method | Real asset exists? | State | Impact | Priority |
|---:|---|---|---|---|---|---|---|
| 1 | Station architecture | `tczew-world.js`, `m01-view.js`, `m01-environment.js` | one large brick building box plus procedural windows, frames, roof/chimney detail | No station GLB found | **VISIBLE_PLACEHOLDER** | huge mission landmark; box silhouette is visible for long periods | **P0** |
| 2 | Sapper hut / barracão | same | four thin wall boxes + slats/roof seams/barrels | No dedicated hut GLB found | **VISIBLE_PLACEHOLDER** | objective area is visited at close range | **P0** |
| 3 | Rail/road bridges + Lisewo portal | `m01-view.js` + `bridges.manifest.json` | GLB LOD0/1/2 selected through manifest/state | Yes, wired | **HISTORICAL_UNVERIFIED** | central landmark; asset much better than primitive, but manifest calls it provisional blocking/placeholder geometry not compared to photographs | P1 |
| 4 | Approach rails | `m01-view.js` | 10 m segments of instanced `BoxGeometry` | No dedicated approach-track asset found | **VISIBLE_PLACEHOLDER** | core railway mission; rail cross-section remains rectangular primitive | **P0** |
| 5 | Sleepers | `m01-environment.js` | repeated instanced wood boxes at 1.35 m interval | No | **PROCEDURAL_NEEDS_POLISH** | repetition visible along long sightlines | P1 |
| 6 | Ballast | `m01-environment.js` | one low-poly dodeca rock per sleeper interval, scaled repeatedly | No | **PROCEDURAL_NEEDS_POLISH** | regular repeated pattern exposes procedural construction | P1 |
| 7 | Terrain | `m01-view.js`, `m01-surfaces.js` | 400×130 subdivided PlaneGeometry deformed by authoritative terrain height + metre-space procedural material | n/a | **PROCEDURAL_ACCEPTABLE** | not actually flat; main weakness is art/material richness, not placeholder topology | P1 |
| 8 | River/water | `m01-view.js`, `m01-surfaces.js` | very large thin box with generated water texture/bump | No dedicated water mesh | **PROCEDURAL_NEEDS_POLISH** | central under both bridges; physically flat/simple despite ripple texture | P1 |
| 9 | Trees | `m01-environment.js` | instanced cylinders for trunk/branches + repeated camera-independent leaf planes | No tree assets found | **PROCEDURAL_NEEDS_POLISH** | large count and repeated branch/leaf recipe strongly affects first impression | **P0** |
| 10 | Grass/reeds | `m01-environment.js` | custom two-crossed-triangle BufferGeometry, thousands of deterministic instances | No | **PROCEDURAL_ACCEPTABLE** | appropriate cheap vegetation at scale; local density/material variety can improve later | P2 |
| 11 | Small rocks | `m01-environment.js` | instanced DodecahedronGeometry with size/color rotation variation | No | **PROCEDURAL_ACCEPTABLE** | small-scale clutter, not a hero object | P2 |
| 12 | Crates / timber piles | `m01-environment.js` | boxes and cylinders | No dedicated prop kit found | **VISIBLE_PLACEHOLDER** | close to hut/objective; rectangular crates read as primitives | P1 |
| 13 | Sandbags | `m01-environment.js` | instanced CapsuleGeometry courses driven by cover state | No | **PROCEDURAL_ACCEPTABLE** | capsule silhouette is serviceable at normal distance; role/state integration is good | P1 |
| 14 | Fences / posts | `m01-environment.js` | wood cylinders + metal box rails | No | **VISIBLE_PLACEHOLDER** | long repeated straight bars are recognizable as primitives | P1 |
| 15 | Station facade/roof micro-detail | `m01-environment.js` | many procedural boxes layered over the station collider | No | **PROCEDURAL_NEEDS_POLISH** | adds useful scale but cannot fully hide giant box architecture | P1 |
| 16 | Distant battlefield visual layer | M01 event handling | `distant-shot` is audio-only; sector/contact events have no dedicated visual scene system in `M01View` | No dedicated visual asset/system found | **MISSING_ASSET** | distant war can sound present while horizon remains visually quiet | P1 |
| 17 | Train 963 locomotive | `m01-view.js:createTrains` | one box body + two cylinder wheel groups; code explicitly calls it original placeholder | No locomotive asset found | **VISIBLE_PLACEHOLDER** | large hero vehicle, clearly primitive | **P0** |
| 18 | Train 963 intact wagons | `m01-train-wagons.js` | real covered/open wagon GLB LOD2 instanced across 65-car plan | Yes, wired | **REAL_ASSET** | strong improvement over prior box consist | P1 |
| 19 | Wagon close/medium LOD path | same + `m01-wagons/manifest.json` | runtime loads only LOD2 although LOD0 and LOD1 exist | Yes, **not wired** | **MISSING_ASSET** | close wagons can remain unnecessarily low-detail | P1 |
| 20 | Burned/damaged wagons | `assets/models/provisional/m01-wagon-damage/` | 12 GLBs exist, but no load/use path found in audited renderer | Yes, **not wired** | **MISSING_ASSET** | bombing/damage can leave intact-looking stock where richer state art already exists | P1 |
| 21 | Panzerzug | `m01-view.js:createTrains` | five metal boxes + two cylinders | No Panzerzug GLB found | **VISIBLE_PLACEHOLDER** | major combat vehicle becomes unmistakable primitive | **P0** |
| 22 | First Ju 87 raid | `m01-view.js:loadAircraft` | real Ju 87 B-1 GLB LOD0/1/2 + propeller animation | Yes, wired | **REAL_ASSET** | normal first-raid path is not the box proxy | P1 |
| 23 | Ju 87 first-raid proxy | `m01-view.js:createAircraft` | box silhouette created before asset load, removed/replaced when GLBs load | Yes | **FALLBACK_ONLY** | correct resilience; do not count as normal-path visual debt | P2 |
| 24 | Second-raid aircraft | `m01-view.js:raidPlane` | separate box/cylinder-style silhouette; not replaced by Ju 87 GLBs | Ju 87 assets exist, but this path is separate | **VISIBLE_PLACEHOLDER** | visible set-piece plane still reads as block model | P1 |
| 25 | Polish combat soldiers in GLB budget | `m01-characters.js` | skinned PL LOD0/1/2 + 25 shared clips | Yes, wired | **REAL_ASSET** | close/mid named troops can use detailed rig | P1 |
| 26 | German combat soldiers in GLB budget | same | skinned DE LOD0/1/2; MG34 optional weapon GLB | Yes, wired | **REAL_ASSET** | no longer primitive when selected | P1 |
| 27 | Far / over-budget combat soldiers | `m01-view.js:updateActors` | instanced procedural body parts after GLB selector omits them | n/a | **PROCEDURAL_ACCEPTABLE** | deliberate far/budget representation; usually seen beyond detail threshold | P1 |
| 28 | Soldier asset/clip failure path | `m01-characters.js` | comments explicitly preserve procedural batches when optional character/weapon/clip art fails | Yes | **FALLBACK_ONLY** | correct fallback; should not be reported as main visual path | P2 |
| 29 | Civilians | `m01-characters.js` selector + `m01-view.js` batches | civilians are excluded from skinned candidate set and therefore use procedural actor shapes | No dedicated civilian GLB found | **VISIBLE_PLACEHOLDER** | can be encountered near station and contrast sharply with detailed soldiers | P1 |
| 30 | Wounded/corpses when selected as GLB | character clips | `wounded`, `fallen`, `carried` clips on real soldier rigs | Yes, wired | **REAL_ASSET** | coherent with source soldier identity | P1 |
| 31 | Wounded/corpses outside GLB selection | procedural actor-pose batches | cylinders/boxes/spheres sampled from same pose | n/a | **PROCEDURAL_NEEDS_POLISH** | acceptable far away; becomes obvious if budget leaves one near camera | P2 |
| 32 | First-person Wz.29 main body | `m01-viewmodel.js` | clone of real PL soldier GLB with `rifle` visible | Yes, wired | **REAL_ASSET** | the normal path is not the old primitive weapon | P1 |
| 33 | Player arms/hands | same | arm-only geometry extracted from skinned GLB body using skin weights | Yes, wired | **REAL_ASSET** | uses licensed/shared rig instead of spheres/finger boxes | P1 |
| 34 | Wz.29 bolt, sights, stock, barrel | soldier GLB weapon nodes + shared clips | real generated weapon geometry in normal viewmodel | Yes, wired | **REAL_ASSET** | mechanical components inherit same detailed asset | P1 |
| 35 | Reload clip presentation | `m01-viewmodel.js` + `reload_clip` | GLB clip + real rig animation | Yes, wired | **REAL_ASSET** | normal reload is asset-backed | P1 |
| 36 | Single-round reload cartridge | `m01-viewmodel.js` | tiny 8-sided CylinderGeometry inserted only for single-round state | No dedicated mesh needed | **PROCEDURAL_ACCEPTABLE** | tiny functional prop; primitive is proportionate | P2 |
| 37 | Legacy procedural first-person Wz.29/arms | `m01-view.js:createWeapon` | extruded stock + boxes/cylinders/spheres; hidden whenever `M01ViewModel.update()` succeeds | Better normal asset exists | **FALLBACK_ONLY** | important false-positive correction | P2 |
| 38 | Grenades in world | `m01-view.js:syncDamage` | small metal sphere | No dedicated grenade GLB found | **VISIBLE_PLACEHOLDER** | obvious if inspected close, but small/brief | P2 |
| 39 | MG34 | `m01-characters.js` + `m01/weapons/mg34` | GLB LOD0/1/2 + aim/burst/reload; prone clips reuse kit | Yes, wired | **REAL_ASSET** | crew weapon normal path is asset-backed | P1 |
| 40 | rkm wz.28 embedded on Kowal | soldier character GLB | embedded `rkm_wz28` mesh + shared rkm clips | Yes, wired | **REAL_ASSET** | visible runtime rkm is not a primitive | P1 |
| 41 | Standalone detailed rkm wz.28 kit | `assets/models/provisional/m01/weapons/rkm_wz28/` | dedicated LOD0/1/2 + animation GLB exists; no load path in `m01-characters.js` | Yes, **not wired** | **MISSING_ASSET** | potential richer replacement/upgrade already in repo | P1 |
| 42 | ckm wz.30 | `m01-characters.js` + ckm manifest | real weapon LOD0/1/2, box/belt/tripod model, 5 gun + 10 crew clips | Yes, wired | **REAL_ASSET** | crew-served weapon is not the old primitive path | P1 |
| 43 | Smoke / demolition cloud | `m01-atmosphere.js` | soft billboard texture on repeated instanced quads, deterministic plume recipe | n/a | **PROCEDURAL_NEEDS_POLISH** | very large set-piece plumes expose repeated puff structure | **P0** |
| 44 | Explosion flash | `m01-view.js:explosion` | one large additive sprite scaled to 12/30 m, with smoke handled separately | n/a | **PROCEDURAL_NEEDS_POLISH** | large, central event can look like a flat flash card before smoke develops | **P0** |
| 45 | Muzzle flash + gun smoke | `m01-view.js:createFireEffects`, `m01-viewmodel.js` | small sphere/sprite flash + billboard smoke pools | n/a | **PROCEDURAL_ACCEPTABLE** | short-lived, bounded, sourced from real shot positions | P2 |
| 46 | Bullet impacts | `m01-view.js:impact/updateFire` | short spark sphere + billboard dirt puff | n/a | **PROCEDURAL_ACCEPTABLE** | tiny transient; semantic/material distinction matters more than mesh detail | P2 |
| 47 | Sky/cloud field | `m01-atmosphere.js`, `m01-surfaces.js` | sky sphere shader + generated repeating cloud field texture | n/a | **PROCEDURAL_ACCEPTABLE** | legitimate procedural final-ish technique; can be tuned without new asset | P2 |
| 48 | Contact shadows | `m01-view.js` | instanced planes with puff texture under nearby actors | n/a | **PROCEDURAL_ACCEPTABLE** | invisible as geometry when tuned; improves grounding | P2 |

## Totals

The 48-item audit produces:

| Classification | Count |
|---|---:|
| REAL_ASSET | **12** |
| PROCEDURAL_ACCEPTABLE | **10** |
| PROCEDURAL_NEEDS_POLISH | **8** |
| VISIBLE_PLACEHOLDER | **10** |
| FALLBACK_ONLY | **3** |
| MISSING_ASSET | **4** |
| HISTORICAL_UNVERIFIED | **1** |
| **TOTAL** | **48** |

Priority distribution:
- **P0: 8**
- **P1: 28**
- **P2: 12**

These counts are audit units, not percentages of pixels, triangles or development completion.

## Current asset coverage by category

Count-based only; use as a directional map, not a precision KPI.

### WORLD — 16 audited responsibilities
- 5 VISIBLE_PLACEHOLDER (~31%)
- 5 PROCEDURAL_NEEDS_POLISH (~31%)
- 4 PROCEDURAL_ACCEPTABLE (~25%)
- 1 HISTORICAL_UNVERIFIED (~6%)
- 1 MISSING_ASSET (~6%)

Interpretation: world/environment is still the largest source of visible prototype character even though terrain materials, clutter and bridge GLBs have advanced.

### CHARACTERS — 7
- 3 REAL_ASSET (~43%)
- 1 PROCEDURAL_ACCEPTABLE (~14%)
- 1 PROCEDURAL_NEEDS_POLISH (~14%)
- 1 VISIBLE_PLACEHOLDER (~14%)
- 1 FALLBACK_ONLY (~14%)

Interpretation: combat soldiers are substantially asset-backed; civilians and distance/budget paths are the visual debt.

### WEAPONS — 11
- 7 REAL_ASSET (~64%)
- 1 PROCEDURAL_ACCEPTABLE (~9%)
- 1 VISIBLE_PLACEHOLDER (~9%)
- 1 FALLBACK_ONLY (~9%)
- 1 MISSING_ASSET (~9%)

Interpretation: weapon coverage is much stronger than first glance suggests. Wz.29, MG34, embedded rkm and ckm are real normal-path assets.

### VEHICLES — 8
- 2 REAL_ASSET (25%)
- 3 VISIBLE_PLACEHOLDER (~38%)
- 2 MISSING_ASSET (25%)
- 1 FALLBACK_ONLY (~12%)

Interpretation: vehicle inconsistency is severe: detailed Ju 87/wagons sit beside primitive locomotive/Panzerzug/second-raid plane.

### FX — 6
- 4 PROCEDURAL_ACCEPTABLE (~67%)
- 2 PROCEDURAL_NEEDS_POLISH (~33%)

Interpretation: procedural FX is appropriate in principle. Large smoke/explosion set pieces need quality work; small impacts/muzzle effects do not require GLBs.

## Important false positives

1. `three-renderer.js` contains many Box/Sphere/Cylinder constructions, but M01 uses `Renderer.renderMission() -> M01View.render()`. The generic sandbox world/actors/weapon are not the M01 visible path.
2. The old first-person procedural Wz.29 in `M01View.createWeapon()` still exists, but `M01ViewModel.update()` hides it when the real PL rig/rifle path is available.
3. Wagon boxes/cylinders in `M01TrainWagons` are fallback proxies. The normal intact-wagon path uses GLB LOD2.
4. First-raid Ju 87 box proxies are replaced when the aircraft GLBs load. The **separate second-raid plane** is the path that remains primitive.
5. Small spheres/cylinders used for flashes, particles and the single reload round are not automatically asset debt.

## Scanner raw signal

A regex-equivalent scan of the eight requested renderer files found candidate lines, before semantic review:

- box geometry/box mesh lines: **47**
- sphere geometry/sphere mesh lines: **23**
- cylinder geometry/cylinder mesh lines: **20**
- PlaneGeometry lines: **4**
- CapsuleGeometry lines: **1**
- InstancedMesh lines: **13**
- asset-load/GLB-reference lines: **14**
- literal fallback word: **1**
- proxy word: **5**
- placeholder word: **1**
- procedural word: **5**

These raw numbers are deliberately **not** treated as quality verdicts.
