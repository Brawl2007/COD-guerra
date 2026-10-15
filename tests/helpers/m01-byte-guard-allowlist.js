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
 // T23 (M01-EAST-FRONT-VISIBLE-V1): the east platoon holds the deck and six reserve men fall by attrition rounds. The mission data (hold, attrition,
 // display profiles) and the round kinds (m01-fire.js) change by design; the per-tick gameplay golden was re-baselined on x86 for it.
 'missions/m01-tczew/mission.json','src/game/m01-fire.js',
 // PT05 (D33): yard-wagon colliders change world collision only (4-line hunk); gameplay is locked by the per-tick golden traces (animation-contract) and tests/m01-yard-wagon-colliders.test.js.
 'src/world/tczew-world.js',
 // T50 (loading/bundle, PR #66) modifies asset transfer observability only; original loader API is guarded
 // separately by tests/m01-loading-and-bundle-t50.test.js.
 'src/assets/asset-manager.js',
 // Argon Animation Resolver V1/V2 (PRs #62/#64): presentation-only pose (motion-driven gait, torso twist, hit/duck,
 // support-arm hints); renderer-only module, covered by tests/m01-animation-resolver*.test.js.
 'src/render/m01-actor-pose.js',
 // Touch controls (PR #74): Input gains a separate virtual channel (touchForward/Side/Sprint, setMove/addLook/setFire/tap);
 // with no touch input forwardAxis/sideAxis/sprinting equal the previous keyboard expressions. Covered by tests/touch.test.js
 // and tests/browser/touch.spec.js; desktop pointer-lock input stays covered by tests/browser/game.spec.js.
 'src/core/input.js',
 'src/core/audio.js','src/game/game.js','src/main.js','src/styles.css',
 // T02-min + T03-lite/T25: aircraft target prediction mirrors grounded authoritative impacts; per-tick deltas audited in tools/verification/m01-continuity-raid-audit.mjs.
 'src/render/m01-aircraft.js',
 'src/render/m01-atmosphere.js','src/render/m01-characters.js','src/render/m01-environment.js','src/render/m01-surfaces.js',
 // T09 materials atlas (M01-T09-T28-MATERIALS-CLOSEOUT-V1, merged from claude/m01-integration @ 8a0c362): registry only;
 // the original surface() is locked by tests/m01-material-authority.test.js.
 'src/render/materials.js',
 'src/render/m01-train-wagons.js','src/render/m01-view.js','src/render/m01-viewmodel.js','src/render/three-renderer.js',
 // Ju 87 production closeout: the raid's presentation-only aircraft art was regenerated (path/events unchanged).
 ...[0,1,2].map(lod=>`assets/models/provisional/m01-aircraft/m01_ju87_b1_lod${lod}.glb`),'assets/models/provisional/m01-aircraft/manifest.json'
]);
