# M01 Integrated Visual Closeout V2 — Code inventory

Base runtime audited: `6bd69521aef18f00b2ab37ccd7ceeca6a4da3a2b`.

Only occurrences that materially affect production visuals are listed. Primitive geometry by itself is **not** considered a defect.

## A — PLACEHOLDER VISÍVEL

| Sistema | Ficheiro / função | Primitive / técnica | Normal? | Leitura visual atual | Prioridade |
|---|---|---|---|---|---|
| Station main mass | `src/world/tczew-world.js :: refresh()` | one large brick box/collider | sim | silhouette and depth read as a single rectangular block | P0 |
| Station facade/windows | `src/render/m01-environment.js :: buildArchitecture()`; `src/render/m01-view.js :: buildTerrain()` | repeated BoxGeometry strips + shallow dark window boxes | sim | facade has texture but windows/doors/trim remain shallow and repetitive | P0 |
| Station roof/annex/hut | `m01-environment.js :: buildArchitecture()` | box/trunk courses | sim | roof slab/seams and annex volumes lack believable construction depth | P0 |
| Terrain / yard base | `m01-view.js :: buildTerrain()` | deformed PlaneGeometry + very large ground/water boxes | sim | support mesh is acceptable technically, but exposed areas are visually empty | P0 composition |
| Railway bed | `m01-environment.js :: buildTracks()` | repeated wood/metal boxes + dodeca/tetra ballast | sim | repetitive sleepers/rail/ballast; little switch/hardware detail | P1 |
| Vegetation near | `m01-environment.js :: buildTreeBatches()/appendCanopy()` | cylinders + Icosahedron/Dodecahedron canopy | sim | close trees expose low-poly silhouette | P0 |
| Grass / meadow | `m01-environment.js :: buildVegetation()/buildGroundClusters()` | small procedural BufferGeometry, repeated instancing | sim | useful background fill; repetition visible close to camera | P2 |
| General clutter | `m01-environment.js :: buildClutter()` | rock/tetra/box/trunk instances | sim | improves scale but limited shape vocabulary remains obvious | P2 |
| Soldier animation sampling | `src/render/m01-characters.js :: sample()` | shared animation clips with phase offsets | sim | appearance varies; nearby groups still share same movement language/pose | P0 |
| Procedural actor presentation | `src/render/m01-view.js :: updateActors()` | sphere/box/cylinder articulated body | only when skinned actor is unavailable/not selected | sometimes | visible if character art falls outside budget/fails; normally secondary to GLBs | B when fallback; not a normal P0 |
| Smoke/dust | `src/render/m01-atmosphere.js :: billboardBatch()/update()` | camera-facing PlaneGeometry + one procedural puff texture | sim | layered and bounded, but repeated billboard language remains visible | P1 |
| Muzzle/impact particles | `m01-view.js :: createFireEffects()/updateFire()` | sphere/billboard pools + tetra chips | sim | readable but simple at close range | P1/P2 |
| Battlefield explosions | `m01-view.js :: updateBattlefieldFx()` + `m01-atmosphere.js` | layered billboard fire/smoke/dust + shards | sim | V2 improved shape/layering; repeated puff family still detectable | P1 |
| Yard wagon flame | `src/render/m01-yard-wagons.js` | one Sprite flame per burning wagon | sim when burning | 2D flame is obvious near camera | P1 |
| Bridge approach portal finish | `assets/models/provisional/m01/portal_lisewo_1912*.glb`; remap in `m01-view.js :: loadBridges()` | GLB, but provisional + common procedural materials | sim | dominant silhouette exists, surface/detail reads blocky/provisional | P0 |
| Large surface materials | `src/render/m01-surfaces.js :: artTexture()/texturedSurface()` | generated CanvasTexture + triplanar shader | sim | functional breakup, but tiling/material sameness appears on large brick/soil expanses | P1 |

## B — FALLBACK APROVADO

These are deliberately simple but should **not** be scheduled for production replacement while normal assets load:

| Sistema | Local | Fallback |
|---|---|---|
| Locomotive 963 | `src/render/m01-locomotive.js` | box body + cylinder wheels, `original_locomotive_fallback` |
| Panzerzug | `src/render/m01-panzerzug.js` | repeated box cars + cylinder caps |
| Train wagons | `src/render/m01-train-wagons.js` | 65 instanced body/wheel proxies |
| Yard wagons | `src/render/m01-yard-wagons.js` | box body + cylinder wheels |
| Soldiers | `src/render/m01-characters.js` / `m01-view.js` | procedural articulated actor if optional GLB/clips fail |
| Ju 87 raid | `src/render/m01-view.js :: createAircraft()` | box-based proxy silhouette |
| MG34/CKM support | character/weapon runtime | procedural support when optional kit/clips fail |

Normal integrated evidence: 6 train-wagon GLBs loaded and **0 train proxies** in the audited wagon scenario; production locomotive/Panzerzug diagnostics report loaded LODs when visible.

## C — GEOMETRIA PROCEDURAL ACEITÁVEL

No dedicated production task is justified for these by themselves:

- sky `SphereGeometry` in `m01-atmosphere.js`;
- contact-shadow `PlaneGeometry` in `m01-view.js`;
- terrain PlaneGeometry as a heightfield substrate;
- instancing itself;
- Wz.29 cartridge `CylinderGeometry` in `m01-viewmodel.js`;
- small tetra debris when read only as fast fragments;
- far grass cards/blades;
- generated cloud field as a sky input.

## D — DEBUG / TEST ONLY

Ignore for production quality:

- staging/inspection formation and neutral inspection lighting in `tests/browser/m01-soldier-visual-variation.spec.js`;
- forced GLB-failure screenshots;
- camera fixtures;
- browser debug overlays and diagnostic attachments.

## Repeated instancing / generated textures

Repeated instancing is a performance mechanism, not automatically a placeholder. It becomes a visual issue in the current M01 mainly where the same **shape language** is exposed repeatedly: sleepers/ballast, close canopy lobes, grass tufts and station trim.

Generated textures in `m01-surfaces.js` are acceptable for secondary surfaces, but large uninterrupted Station/portal/terrain surfaces expose their limited material vocabulary and therefore remain a P1 art-direction issue.

## Assets linked to remaining closeout work

- Station: **no dedicated production GLB**; current production image is procedural dressing over world volumes.
- Bridge/portals: `assets/models/provisional/m01/*.glb`.
- Soldiers/animation: `assets/models/provisional/m01/characters/*`.
- Locomotive: `assets/models/production/m01/locomotive/*`.
- Panzerzug: `assets/models/production/m01/panzerzug/*`.
- Wagons: `assets/models/provisional/m01-wagons/*`, `m01-wagon-damage/*`.
- MG34/CKM/Wz.29: `assets/models/provisional/m01/weapons/*`.
