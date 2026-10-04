# Unused or Unwired Assets — M01

Task: `M01-VISUAL-PLACEHOLDER-ASSET-AUDIT-V1`

This file separates **asset exists but is not currently visible** from “asset does not exist”.

## Highest-value unwired assets

| Asset path | Intended role | Currently wired? | Why not visible / current runtime | Replacement strategy |
|---|---|---:|---|---|
| `assets/models/provisional/m01-wagons/m01_wagon_covered_lod0.glb` | close covered wagon | **No** | `M01TrainWagons.load()` loads only `lod2` for intact wagons | **A — wire existing asset** |
| `.../m01_wagon_covered_lod1.glb` | medium covered wagon | **No** | same | **A** |
| `.../m01_wagon_open_lod0.glb` | close open wagon | **No** | same | **A** |
| `.../m01_wagon_open_lod1.glb` | medium open wagon | **No** | same | **A** |
| `assets/models/provisional/m01-wagon-damage/m01_wagon_covered_burned_lod0.glb` | burned covered wagon close | **No** | no load/reference path found in audited renderer | **A**, after state-authority compatibility check |
| `...covered_burned_lod1.glb` | burned covered medium | **No** | same | **A** |
| `...covered_burned_lod2.glb` | burned covered far | **No** | same | **A** |
| `...open_burned_lod0.glb` | burned open close | **No** | same | **A** |
| `...open_burned_lod1.glb` | burned open medium | **No** | same | **A** |
| `...open_burned_lod2.glb` | burned open far | **No** | same | **A** |
| `...covered_damaged_lod0.glb` | damaged covered close | **No** | same | **A** |
| `...covered_damaged_lod1.glb` | damaged covered medium | **No** | same | **A** |
| `...covered_damaged_lod2.glb` | damaged covered far | **No** | same | **A** |
| `...open_damaged_lod0.glb` | damaged open close | **No** | same | **A** |
| `...open_damaged_lod1.glb` | damaged open medium | **No** | same | **A** |
| `...open_damaged_lod2.glb` | damaged open far | **No** | same | **A** |
| `assets/models/provisional/m01/weapons/rkm_wz28/m01_rkm_wz28_lod0.glb` | dedicated close rkm wz.28 | **No** | Kowal uses the rkm mesh embedded in the Polish soldier GLB; `m01-characters.js` does not load the standalone rkm directory | **A**, if attachment/sockets prove equivalent |
| `.../m01_rkm_wz28_lod1.glb` | dedicated medium rkm | **No** | same | **A** |
| `.../m01_rkm_wz28_lod2.glb` | dedicated far rkm | **No** | same | **A** |
| `.../m01_rkm_wz28_animations.glb` | dedicated rkm carry/aim/burst clips | **No** in the audited runtime | runtime uses shared character `rkm_*` clips instead | **A** only if it improves presentation without conflicting with existing locomotion |

### Why these matter

The intact wagon LOD0/1 set is the cleanest “already built, not used” opportunity. The normal runtime deliberately instantiates only LOD2, despite LOD0/1 existing in the same verified asset family.

The damage kit is larger: **12 GLBs** already cover:
- covered/open;
- damaged/burned;
- LOD0/1/2.

The audit does **not** recommend wiring them blindly. Their state choice must remain presentation of authoritative destruction state and must not compete with the separate wagon-state/runtime work.

The standalone rkm asset is a dedicated kit (LOD0 1,476 tris / LOD1 744 / LOD2 234) while the soldier manifest also contains an embedded rkm mesh. The dedicated kit should first be compared for sockets/hands/animation compatibility; “newer file exists” does not by itself justify replacing a working embedded weapon.

## Partially wired asset capabilities

### Ju 87 B-1

Path:
`assets/models/provisional/m01-aircraft/`

Wired:
- LOD0/1/2;
- `propeller_spin`.

Present in manifest but not used by `M01View.loadAircraft()`:
- `dive_brakes_extend`.

This is **not automatically a placeholder bug**. The runtime should only use dive-brake animation if the authoritative raid trajectory/state calls for it.

The model also includes optional `bomb_sc250`, which runtime deliberately hides because the exact payload/release is not established. That is a correct historical-uncertainty decision, not unused-asset debt.

### Intact wagons

Manifest declares:
- `wheels_roll`;
- `doors_open`.

`M01TrainWagons` instantiates mesh geometry and explicitly says there are no wheel/door timers because simulation does not yet provide train velocity/disembarkation data.

Classification: **capability intentionally unwired pending authoritative state**, not a visual placeholder by itself.

### Damaged wagons

Damage manifest also contains wheel/door animation definitions. Since the whole damage family is not loaded in this base branch, both mesh-state and animation capability are unwired.

## Assets confirmed wired

The following should **not** be placed on an “unused assets” backlog:

- `assets/models/provisional/m01/bridge_rail_1891_1912*.glb` — wired by bridge manifest;
- `bridge_road_lentze_1857_1912*.glb` — wired;
- `portal_lisewo_1912*.glb` — wired;
- Polish/German soldier LODs — wired;
- shared soldier animations — wired;
- station drag animation GLBs — wired;
- MG34 LOD0/1/2 + animation GLB — wired;
- MG34 prone animation GLB — wired;
- ckm wz.30 LOD0/1/2 + crew clips — wired;
- Ju 87 LOD0/1/2 — wired for the first raid;
- intact wagon LOD2 — wired.

## Files that look unused but are intentionally non-render assets

Do not wire these as visual art:

- bridge `*.colliders.glb`;
- `bridge-colliders.json`.

They are collision/physics authority, not missing decoration.

## Assets that do **not** exist in the audited tree

No dedicated M01 GLB was found for:
- station building;
- sapper hut/barracão;
- approach railway track/sleeper/ballast kit;
- locomotive of train 963;
- Panzerzug;
- civilian character;
- world grenade;
- dedicated distant-battle visual set.

These require **B/C/D** strategies rather than “just wire the file”.

## Strategy legend

- **A — existing asset, wire/use it** after authority/compatibility validation.
- **B — procedural path is valid; improve materials/shape/repetition.**
- **C — create a new asset.**
- **D — historical research/source lock required before art.**
