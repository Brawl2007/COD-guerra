# M01 T13 / T32 original field structures

Four original structures have three LODs each: a railway shed with a gable roof, chimney, six metre west door, surface-mounted window and work bench; a timber-lined shelter with a north entrance and L return; an earth/timber forward parapet with an independent destroyed variant; and a concrete casemate below the road deck, with two east embrasures and an earth cap. These are artistic reconstructions of map features, not a measured historical survey. Station architecture is unchanged.

Generated GLBs and vertex colours are CC0-1.0, authored procedurally for COD-guerra, without third-party meshes or textures. The new kit's licence does not change the repository's global licence or the licences of previous assets. The generator, manifest and GLB extras record authorship, metres, +Y up, anchors, bounds and SHA-256.

| Structure | LOD0 triangles | LOD1 triangles | LOD2 triangles |
| --- | ---: | ---: | ---: |
| Railway shed | 1120 | 208 | 112 |
| Shelter | 528 | 156 | 84 |
| Forward post intact | 1248 | 96 | 12 |
| Forward post destroyed | 384 | 96 | 12 |
| Casemate | 828 | 180 | 144 |
| Per structure budget | 5000 | 1500 | 300 |

The manifest explicitly separates `visualBounds` from `collisionSurfaces`. Each collision surface includes its authoritative world ID, local bounds, material and vertex range. Tests inspect the actual binary POSITION data for those ranges and compare all axes against current `TczewWorld` boxes within 0.05m. Decorative geometry is not exported as physics.

| Structure | Anchor (world metres) | Collision-backed surfaces | Decorative limits |
| --- | --- | --- | --- |
| Shed | [-260,-3,20] | hut_north, hut_east, hut_south, hut_west_n, hut_west_s | Roof/gables/chimney and surface-mounted closed window sit outside wall boxes. Existing collider walls have no window hole; the visual pane is explicitly decorative. West opening remains z18..24, six metres wide, with no geometry across it below the lintel. |
| Shelter | [-260,-4,70] | cv_shelter_entrance: x-258.45..-257.55, y-4..-1.8, z64.5..67.5 | Interior timber, roof, dark floor and L return are artistic decoration. The north entry and west side of the L return remain open. No additional invisible wall or walkable surface is introduced. |
| Forward post | [18,0,3] | cv_forward_post: x17.55..18.45, z1.5..4.5, y0..1.1 intact / y0..0.45 destroyed | Timber seams and sandbag courses dress the unchanged earth cover. All LODs have distinct intact/destroyed assets. |
| Casemate | [13,-7,40] | None | References the map feature [0,-7,34]..[26,-1,46], which is not a solid collider. Earth cap may extend slightly beyond the feature bounds, as recorded in visualBounds. Every LOD remains below road deck y0. Two embrasures face east near z37/43. |

Runtime controller `M01FieldStructures` owns a single kit root and four structure roots. It loads 15 files once; a structure becomes resident atomically only after every required LOD/state arrives. Its original environment shells and `M01View` box proxies remain until that structure is resident, and remain on failure. Resident art replaces those opaque proxies. Other covers, dressing, station and gameplay authority are preserved.

High uses LOD0 within 90m and LOD1 within 260m; Medium uses 55m/180m; Low uses LOD1 within 100m and LOD2 beyond. Hysteresis avoids boundary churn. Runtime sync reads current world reference/revision and the actual forward-post cover height; it does not decide damage. World restoration, a missing cover, an async arrival or the debug presentation toggle invalidates paused rendering/proxy sync. The debug hook exists only for `?debug`, and controls presentation only.

Loaded, partial and late assets are exclusively owned. A first rejected sibling immediately releases partial successes, even if another download hangs. Dispose releases fulfilled in-flight assets immediately; later arrivals close once and never attach. Stable frames perform no downloads, mesh construction or field-controller allocations. Resource/diagnostic arrays are produced only at load, disposal and explicit diagnostics requests.

Reproduction: `node tools/assets/m01-field-structures/build.mjs --check`. Focused binary/runtime tests: `node --test tests/m01-field-structures.test.js`. Authoring viewer/capture instructions are in [the generator README](../../../tools/assets/m01-field-structures/README.md).

Production browser evidence uses the real renderer, route snapshots and controls-derived destruction. It compares the same paused clock/state with `window.m01FieldStructuresDebug.setEnabled(false/true)` in views03/04/15/16, all four closeups and a destroyed post; quality, reload, checkpoint, toggle churn, optional failure and late paused readiness are also checked. Screenshots are evidence of presentation, not a human playtest or an FPS measurement. The initial roadmap views retain the actual pre-dawn lighting; the gallery uses isolated inspection lighting. Integration and independent image-review results belong in the task verification report.
