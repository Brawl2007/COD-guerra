---
MEMORY_VERSION: 1
TASK_ID: "M01-T10-T29-VEGETATION-V2"
CATEGORY: "vegetation renderer ownership"
STATUS: CURRENT
DATE: "2026-10-13"
BRANCH: "codex/m01-t10-t29-vegetation-v2"
SOURCE_HEAD: "cc3f459cea8cf7ad1f797808cb0461d142d20a79"
SUPERSEDES: ""
SUPERSEDED_BY: ""
---

# Summary

Vegetation has a dedicated presentation owner consuming actual original GLB primitive buffers. Preserve physical receiver geometry, truthful submission accounting and asynchronous paused revisions when changing the renderer.

# Confirmed facts

The CC0 kit contains 43 distinct models: eight trees with LOD0/1/2/crossed impostor, six shrubs and five ground forms. One 512 RGBA alpha atlas owns 1048576 decoded bytes plus 349524 mip bytes. Heterogeneous source batching submits padded indices; actual main callbacks count every submitted index, while empty instance callbacks must be ignored. Shadow work and structural capacity are separate measurements.

All 17 physical trees retain exact baseline trunkGeometry(9) Lathe buffers: 60 vertices/90 triangles, not the stale Cylinder 10 description in the immutable decal comment. Keep their original transforms and complete descriptor fields. Generated wood skips these receivers while actual kit canopy remains. All 195 decorative trees, 716 shrubs and 23038 ground entries including 900 reeds retain immutable x/z/seeds. Outside the protected union, presentation y comes from submitted T27 triangles; physical y remains original.

Impostors enter 120m and return below 116m. Ground fades 34..40m and CPU/shader both cease at 40m. Wind samples mission clock only. Loader residency/revision synchronizes before paused-frame caching. A 120s optional deadline accommodates real cold/held loads; short Node deadlines prove hung/late cleanup. Failure fallback remains visibly degraded and never claims kit residency. Exclusive geometry/material/texture/bitmap closes once, borrowed bark stays with the environment.

Restores reuse same-capacity attributes. Compare resource plateaus only after equal Low/Medium/High warmup. Old Medium fixtures need an actual near tree: the unchanged initial start is 43.14m away, beyond its 35m boundary; the real rail checkpoint at (-135,4) supplies a 34.54m tree within documented hysteresis. Wait for actual pause/render/residency rather than changing clocks or positions.

# Evidence and constraints

Evidence lives in docs/verification/m01-runtime/m01-t10-t29-vegetation-v2/. Source CI and full 24 active-owner futures are pinned to SOURCE_HEAD; verifier/reviewer and actual merge proof are separate gates. Preserve the regression record and prior terrain/rail/props/material obligations. Resource counts establish budgets and ownership, not FPS, VRAM or human playtest results.
