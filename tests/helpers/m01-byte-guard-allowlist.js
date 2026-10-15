// Single allowlist shared by the three byte-guard tests (m01-locomotive, m01-panzerzug, m01-soldier-visual-variation).
// A task that legitimately changes a locked src/missions/assets file adds it here once, with a comment naming the task and the evidence.
export const integratedPresentation=new Set([
 // Simulation presentation additions are checked against immutable per-tick gameplay traces in m01-animation-contract.test.js.
 'src/game/m01-simulation.js',
 // T07 generic prone geometry only; standing/crouched slab/ray code is retained, with meaningful oriented-prone tests in m01-partials-completion.
 'src/world/spatial.js',
 // T36 adds a measured reload curve from the unchanged MG34 GLB; geometryContract() independently reproduces the whole file.
 'src/world/m01-mg34-prone-geometry.json',
 // T07/T34: generic prone and civilian task poses, and finite event-age wagon fire. Collider/yard placement guards remain exact.
 'src/render/m01-actor-pose.js','src/render/m01-yard-wagons.js',
 // T26: read-only data cues; tests/m01-partials-completion proves pause/reload and full simulation identity.
 'src/ui/m01-hud.js',
 // T09 adds the material registry. m01-material-authority.test.js independently asserts the ENTIRE original surface() function byte-for-byte.
 'src/render/materials.js',
 // T23 (M01-EAST-FRONT-VISIBLE-V1): the east platoon holds the deck and six reserve men fall by attrition rounds. The mission data (hold, attrition,
 // display profiles) and the round kinds (m01-fire.js) change by design; the per-tick gameplay golden was re-baselined on x86 for it.
 'missions/m01-tczew/mission.json','src/game/m01-fire.js',
 // PT05 (D33): yard-wagon colliders change world collision only (4-line hunk); gameplay is locked by the per-tick golden traces (animation-contract) and tests/m01-yard-wagon-colliders.test.js.
 'src/world/tczew-world.js',
 'src/core/audio.js','src/game/game.js','src/main.js','src/styles.css',
 // T02-min + T03-lite/T25: aircraft target prediction mirrors grounded authoritative impacts; per-tick deltas audited in tools/verification/m01-continuity-raid-audit.mjs.
 'src/render/m01-aircraft.js',
 'src/render/m01-atmosphere.js','src/render/m01-characters.js','src/render/m01-environment.js','src/render/m01-surfaces.js',
 'src/render/m01-train-wagons.js','src/render/m01-view.js','src/render/m01-viewmodel.js','src/render/three-renderer.js',
 // Ju 87 production closeout: the raid's presentation-only aircraft art was regenerated (path/events unchanged).
 ...[0,1,2].map(lod=>`assets/models/provisional/m01-aircraft/m01_ju87_b1_lod${lod}.glb`),'assets/models/provisional/m01-aircraft/manifest.json'
]);
