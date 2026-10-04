# M01 environment visual audit — 2026-10-04

M01 remains a playable prototype. Original procedural art only. No external texture, borrowed map or new historical claim.

| Review item | Candidate change | Remaining visible limitation |
|---|---|---|
| Scene depth / grounding | Lower skylight, stronger low-angle sun, coherent fog, receiving shadows on fallback actor batches | Pre-sunrise probes intentionally have no directional sun shadows; no screen-space AO |
| Terrain breakup | World-space stains, damp masks, green margins and compacted-soil colour patches | Repeated terrain ridges remain: changing heights/collision is outside this task |
| Vegetation | Dense irregular leaf masks, varied cards and branches, fuller distant crowns | Cards remain visible at some angles; these are not authored tree meshes |
| Rail | Grounded sleepers, metal fastenings, darker stone ballast and individual small chips | Ballast uses low-poly instances; switch mechanisms and detailed rail cross-sections remain provisional |
| Station | Smaller masonry scale, lower dirt band, plinth, pilasters, string courses, shallow window depth, roof seams, downpipes | Existing rectangular roof mass is preserved; no invented roof reconstruction or entrances |
| Atmosphere / smoke | Irregular opacity, turbulent drift, darker base and lighter rising smoke, finite fade | Transparent billboards have approximate ordering; no volumetric lighting |
| Explosions / dust | Real damage produces bounded ballistic chips and a short pressure-dust skirt; existing event flash retained; real round-impact dust grows/rises more clearly | Grenade flashes keep the previous short sprite implementation; chips/dust skirt apply to damage records supplied by simulation |
| Water | Rough non-metallic surface, view-dependent colour response and clock-sampled subtle ripple motion | No reflection pass, refraction or shoreline simulation |
| Materials | Multi-scale grime, differentiated roughness/metalness, reduced excessive bump | Procedural wood and stone remain recognisable at close range |
| Long distance | Stronger foliage colour/silhouette masses, low-angle shadows and broken soil margins | Distant terrain boundary and sparse composition remain provisional |

No foliage was inserted into the cleared rail corridor or the sapper objective area. New meadow clusters stay at ankle height beyond the corridors and avoid the hut objective. New clutter is beside the existing hut or station wall; it creates no collider. Existing trunks and physical infrastructure retain their simulation geometry. Additional presentation smoke is sourced only from actual damage records; bullet puffs still require actual impact events.

The technical and visual gates are separate. Passing tests alone does not establish visual approval. Review the paired full-resolution captures in BEFORE_AFTER.md, especially A (facade), B (sleepers/ballast), C (masonry/tree silhouette), D (morning shadow depth) and E (bridge after demolition). The supplemental F records a genuine repair-area bomb impact while its pressure dust and chips are still active.

Next recommended visual pass: authored original vegetation meshes with cheaper alpha coverage, then station roof/weathering and terrain material blending. Soldier locomotion remains a separate task.
