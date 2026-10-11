// Single allowlist shared by the three byte-guard tests (m01-locomotive, m01-panzerzug, m01-soldier-visual-variation).
// A task that legitimately changes a locked src/missions/assets file adds it here once, with a comment naming the task and the evidence.
export const integratedPresentation=new Set([
 // Simulation presentation additions are checked against immutable per-tick gameplay traces in m01-animation-contract.test.js.
 'src/game/m01-simulation.js',
 // T23 (M01-EAST-FRONT-VISIBLE-V1): the east platoon holds the deck and six reserve men fall by attrition rounds. The mission data (hold, attrition,
 // display profiles) and the round kinds (m01-fire.js) change by design; the per-tick gameplay golden was re-baselined on x86 for it.
 'missions/m01-tczew/mission.json','src/game/m01-fire.js',
 // PT05 (D33): yard-wagon colliders change world collision only (4-line hunk); gameplay is locked by the per-tick golden traces (animation-contract) and tests/m01-yard-wagon-colliders.test.js.
 'src/world/tczew-world.js',
 'src/core/audio.js','src/game/game.js','src/main.js','src/styles.css',
 'src/render/m01-atmosphere.js','src/render/m01-characters.js','src/render/m01-environment.js','src/render/m01-surfaces.js',
 'src/render/m01-train-wagons.js','src/render/m01-view.js','src/render/m01-viewmodel.js','src/render/three-renderer.js',
 // Ju 87 production closeout: the raid's presentation-only aircraft art was regenerated (path/events unchanged).
 ...[0,1,2].map(lod=>`assets/models/provisional/m01-aircraft/m01_ju87_b1_lod${lod}.glb`),'assets/models/provisional/m01-aircraft/manifest.json'
]);
