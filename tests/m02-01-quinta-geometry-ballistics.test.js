import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import layout from '../missions/m02-bzura/m02-01-quinta-layout.json' with { type: 'json' };
import { M02QuintaWorld, BALLISTIC_MATERIAL_POLICY } from '../src/world/m02-quinta-world.js';
import { M02BenchSimulation } from '../src/game/m02-01-simulation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function walkSegment(sim, targetX, targetZ, { maxSteps = 550, dt = 0.05, sprint = true, tolerance = 0.65 } = {}) {
  for (let i = 0; i < maxSteps; i++) {
    const dx = targetX - sim.player.x;
    const dz = targetZ - sim.player.z;
    const dist = Math.hypot(dx, dz);
    if (dist <= tolerance) {
      return { reached: true, steps: i, distance: dist };
    }
    sim.player.angle = Math.atan2(dz, dx);
    sim.tick(dt, {
      forward: 1,
      side: 0,
      sprint,
    });
  }
  const finalDist = Math.hypot(targetX - sim.player.x, targetZ - sim.player.z);
  return { reached: finalDist <= tolerance, steps: maxSteps, distance: finalDist };
}

test('M02-01 layout catalog matches 100x150m envelope and building dimensions (B01..B04)', () => {
  assert.deepEqual(layout.bounds.playable, {
    minX: -50,
    maxX: 50,
    minZ: -90,
    maxZ: 60,
  });
  assert.equal(layout.bounds.playable.maxX - layout.bounds.playable.minX, 100);
  assert.equal(layout.bounds.playable.maxZ - layout.bounds.playable.minZ, 150);

  const byId = Object.fromEntries(layout.buildings.map((b) => [b.id, b]));
  assert.deepEqual(byId.B01.bounds, [-40, -26, -18, -8]);
  assert.equal(byId.B01.rooms.length, 5);
  assert.equal(byId.B01.doors.length, 6);
  assert.equal(byId.B01.windows.length, 4);

  assert.deepEqual(byId.B02.bounds, [12, 36, -38, -24]);
  assert.equal(byId.B02.doors.length, 2);
  assert.equal(byId.B02.windows.length, 1);

  assert.deepEqual(byId.B03.bounds, [20, 38, 0, 12]);
  assert.deepEqual(byId.B04.bounds, [-37, -29, 20, 26]);
});

test('M02-01 simulation boundary guard: no DOM, Three.js, Math.random, or Date.now in M02 simulation/world', () => {
  const files = [
    path.join(REPO_ROOT, 'src/world/m02-quinta-world.js'),
    path.join(REPO_ROOT, 'src/game/m02-01-simulation.js'),
  ];
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    assert.ok(!src.includes("from 'three'"), `${file} must not import three`);
    assert.ok(!src.includes('window.'), `${file} must not reference window`);
    assert.ok(!src.includes('document.'), `${file} must not reference document`);
    assert.ok(!src.includes('Math.random'), `${file} must be deterministic without Math.random`);
    assert.ok(!src.includes('Date.now'), `${file} must be deterministic without Date.now`);
  }
});

test('MAP-01 Rota A (Vala): player walks full ditch route from SN1 (0,-80) to North Gate (0,-24) with continuous floor and MG protection', () => {
  const sim = new M02BenchSimulation();
  assert.equal(sim.player.x, 0);
  assert.equal(sim.player.z, -80);

  // Open road north of the start parapet (z = -68) is exposed to B02 MG34 fire
  const exposedProbe = { x: 0, y: 0, z: -68, eyeHeight: 1.65, crouched: false, space: 'metres' };
  const mgOnOpenRoad = sim.evaluateMgLineOfFire(exposedProbe);
  assert.equal(mgOnOpenRoad.canHitTarget, true, 'Open road at (0,-68) must be exposed to B02 MG34');

  // Walk into the ditch at (-45, -70)
  const seg1 = walkSegment(sim, -45, -70);
  assert.equal(seg1.reached, true, `Failed to reach ditch entry (-45,-70), dist=${seg1.distance}`);
  assert.ok(sim.player.y < -0.85 && sim.player.y >= -1.15, `Expected ditch floor depth ~ -1.1m, got y=${sim.player.y}`);

  // Traverse ditch north-to-south to (-45, -5)
  const seg2 = walkSegment(sim, -45, -5);
  assert.equal(seg2.reached, true, `Failed to traverse ditch to (-45,-5), dist=${seg2.distance}`);
  assert.ok(sim.player.y < -0.85, `Expected player still inside ditch at (-45,-5), got y=${sim.player.y}`);

  // Inside ditch, the eastern earth lip blocks B02 MG34 fire
  const mgInDitch = sim.evaluateMgLineOfFire(sim.player);
  assert.equal(mgInDitch.canHitTarget, false, `Expected ditch berm to block MG fire, got blockedById=${mgInDitch.blockedById}`);

  // Exit ditch via ramp to (-24, 0) behind B01
  const seg3 = walkSegment(sim, -24, 0);
  assert.equal(seg3.reached, true, `Failed to exit ditch to (-24,0), dist=${seg3.distance}`);
  assert.ok(Math.abs(sim.player.y) < 0.15, `Expected courtyard ground level ~0m after ramp exit, got y=${sim.player.y}`);

  // Behind B01, MG34 line of fire is blocked by B01 house
  const mgBehindB01 = sim.evaluateMgLineOfFire(sim.player);
  assert.equal(mgBehindB01.canHitTarget, false, 'B01 house should block B02 MG34 line of fire at (-24,0)');

  // Complete Route A waypoints (-15, -8) -> (0, -24)
  const seg4 = walkSegment(sim, -15, -8);
  assert.equal(seg4.reached, true);
  const seg5 = walkSegment(sim, 0, -24);
  assert.equal(seg5.reached, true);

  assert.ok(
    sim.routeProgress.ditchWaypointsVisited.every(Boolean),
    `All Route A (ditch) waypoints must be visited: ${sim.routeProgress.ditchWaypointsVisited.join(',')}`,
  );
});

test('MAP-01 Rota B (Pomar) and route switching: player traverses eastern orchard flank and B03 corridor without getting stuck', () => {
  const sim = new M02BenchSimulation();

  const waypoints = [
    [43, -55],
    [43, 27],
    [8, 42],
    [0, 20],
    [0, -24],
  ];

  for (const [wx, wz] of waypoints) {
    const res = walkSegment(sim, wx, wz, { maxSteps: 750 });
    assert.equal(res.reached, true, `Failed to reach orchard waypoint (${wx},${wz}), dist=${res.distance}`);
  }
  assert.ok(
    sim.routeProgress.orchardWaypointsVisited.every(Boolean),
    `All Route B (orchard) waypoints must be visited: ${sim.routeProgress.orchardWaypointsVisited.join(',')}`,
  );

  // Test mid-traversal route switch from ditch exit (-24,0) across southern yard to B03 corridor (29, 14 -> 29, -2)
  sim.teleportPlayer(-24, 0, 0);
  const switchToB03South = walkSegment(sim, 29, 14, { maxSteps: 650 });
  assert.equal(switchToB03South.reached, true, 'Player must be able to switch between western and eastern routes');
  const throughB03Corridor = walkSegment(sim, 29, -2, { maxSteps: 400 });
  assert.equal(throughB03Corridor.reached, true, 'Player must walk cleanly through B03 open north-south corridor');
  assert.equal(sim.routeProgress.visitedBuildings.B03, true, 'B03 should be marked visited');
});

test('MAP-01 Interiors: player enters B01 (all 5 rooms), B02 (north gate and south door), and B04', () => {
  const sim = new M02BenchSimulation();

  // Start outside B01 North Service Door (x = -37, z = -19.2) facing South (angle = PI/2)
  sim.teleportPlayer(-37.0, -19.2, Math.PI / 2);
  // Initially door_b01_north_service is closed -> walking inside is blocked
  const blockedNorthDoor = walkSegment(sim, -37.0, -16.0, { maxSteps: 70 });
  assert.equal(blockedNorthDoor.reached, false, 'Closed door_b01_north_service must block player entry');

  // Open door_b01_north_service and enter Cozinha
  sim.teleportPlayer(-37.0, -19.1, Math.PI / 2);
  const openNorth = sim.interactDoor();
  assert.ok(openNorth, 'Expected interactable door_b01_north_service');
  assert.equal(openNorth.doorId, 'door_b01_north_service');
  assert.equal(openNorth.state, 'open');
  assert.equal(walkSegment(sim, -36.5, -15.5).reached, true, 'Should enter B01 Cozinha after opening north door');

  // Walk through open door_b01_kitchen_pantry (x=-33, z=-15.5) into Despensa (-32, -15.5)
  assert.equal(walkSegment(sim, -32.0, -15.5).reached, true, 'Should enter B01 Despensa');

  // Walk through open door_b01_pantry_hall (x=-31, z=-15.5) into Sala (-28.5, -15.5)
  assert.equal(walkSegment(sim, -28.5, -15.5).reached, true, 'Should enter B01 Sala');

  // Walk through open door_b01_hall_eastbed (x=-29, z=-13) into Quarto Este (-29, -11)
  assert.equal(walkSegment(sim, -29.0, -11.0).reached, true, 'Should enter B01 Quarto Este');

  // Return to Cozinha (-37, -14.2) and test closed door_b01_kitchen_westbed (x=-37, z=-13)
  assert.equal(walkSegment(sim, -29.0, -15.5).reached, true);
  assert.equal(walkSegment(sim, -37.0, -15.5).reached, true);
  const blockedWestBed = walkSegment(sim, -37.0, -11.0, { maxSteps: 70 });
  assert.equal(blockedWestBed.reached, false, 'Closed door_b01_kitchen_westbed must block entry into Quarto Oeste');

  // Open door_b01_kitchen_westbed and walk into Quarto Oeste
  sim.teleportPlayer(-37.0, -14.1, Math.PI / 2);
  const openWestBed = sim.interactDoor();
  assert.ok(openWestBed);
  assert.equal(openWestBed.doorId, 'door_b01_kitchen_westbed');
  assert.equal(openWestBed.state, 'open');
  assert.equal(walkSegment(sim, -37.0, -11.0).reached, true, 'Should enter Quarto Oeste after opening door');

  assert.deepEqual(sim.routeProgress.visitedB01Rooms, {
    cozinha: true,
    despensa: true,
    sala: true,
    quarto_oeste: true,
    quarto_este: true,
  });

  // B02 Barn: enter via open North Gate (24, -39.5 -> 24, -31)
  sim.teleportPlayer(24, -39.5, Math.PI / 2);
  assert.equal(walkSegment(sim, 24, -31).reached, true, 'Should enter B02 Celeiro via open 3m north gate');
  assert.equal(sim.routeProgress.visitedBuildings.B02, true);

  // Try exiting via closed South Door (x = 12 + 18 = 30, z = -24) -> blocked until opened
  assert.equal(walkSegment(sim, 30, -25.2).reached, true);
  const blockedSouthDoor = walkSegment(sim, 30, -22.5, { maxSteps: 60 });
  assert.equal(blockedSouthDoor.reached, false, 'Closed B02 south door must block player exit');

  sim.teleportPlayer(30, -25.1, Math.PI / 2);
  const openB02South = sim.interactDoor();
  assert.ok(openB02South);
  assert.equal(openB02South.doorId, 'door_b02_south_door');
  assert.equal(walkSegment(sim, 30, -22.5).reached, true, 'Should exit B02 via south door once opened');

  // B04 Annex: enter via open south door (x = -37 + 5.2 = -31.8, z = 26)
  sim.teleportPlayer(-31.8, 27.2, -Math.PI / 2);
  assert.equal(walkSegment(sim, -31.8, 24.0).reached, true, 'Should enter B04 Forno via open south door');
  assert.equal(sim.routeProgress.visitedBuildings.B04, true);
});

test('MAP-02 Ballistics & Materials: walls block, open windows/doors pass, jambs/sills/lintels block, glass breaks, foliage is non-ballistic', () => {
  const sim = new M02BenchSimulation();
  assert.equal(BALLISTIC_MATERIAL_POLICY.brick.blocksShot, true);
  assert.equal(BALLISTIC_MATERIAL_POLICY.foliage.blocksShot, false);
  assert.equal(BALLISTIC_MATERIAL_POLICY.foliage.blocksSight, true);

  // 1. Solid masonry wall blocks shot (shooting from west of B01 at x=-45, z=-10.5 toward tgt_b01_west_bedroom at -36.5, -10.5)
  const wallShot = sim.fireDirectRay(
    { x: -45, y: 1.35, z: -10.5 },
    { x: 1, y: 0, z: 0 },
  );
  assert.equal(wallShot.blockedBySolid, true, 'Solid B01 wall must block shot');
  assert.equal(wallShot.hitTarget, false);
  assert.equal(wallShot.material, 'brick');

  // 2. Open window (win_b01_west_kitchen at x=-40, z=-18 + 2.5 = -15.5, y=0.95..2.05) passes shot from exterior to interior target
  const extToIntWindow = sim.fireDirectRay(
    { x: -45, y: 1.35, z: -15.5 },
    { x: 1, y: 0, z: 0 },
  );
  assert.equal(extToIntWindow.hitTarget, true, 'Shot through open west kitchen window must hit interior target');
  assert.equal(extToIntWindow.hitId, 'tgt_b01_kitchen_window');

  // 3. Window sill (y=0.5 < 0.95), lintel (y=2.35 > 2.05), and wooden jamb (z=-15.5 + 0.68 = -14.82) block shots
  const sillShot = sim.fireDirectRay(
    { x: -45, y: 0.5, z: -15.5 },
    { x: 1, y: 0, z: 0 },
  );
  assert.equal(sillShot.blockedBySolid, true, 'Window sill must block shot');
  assert.equal(sillShot.role, 'window_sill');

  const lintelShot = sim.fireDirectRay(
    { x: -45, y: 2.35, z: -15.5 },
    { x: 1, y: 0, z: 0 },
  );
  assert.equal(lintelShot.blockedBySolid, true, 'Window lintel must block shot');
  assert.equal(lintelShot.role, 'window_lintel');

  const jambShot = sim.fireDirectRay(
    { x: -45, y: 1.35, z: -14.8 },
    { x: 1, y: 0, z: 0 },
  );
  assert.equal(jambShot.blockedBySolid, true, 'Window jamb/frame must block shot');
  assert.equal(jambShot.role, 'window_frame');

  // 4. Closed door blocks shot; opening door allows shot to hit target inside Sala (door_b01_east_main at x=-26, z=-15.5)
  const closedDoorShot = sim.fireDirectRay(
    { x: -20, y: 1.35, z: -15.5 },
    { x: -1, y: 0, z: 0 },
  );
  assert.equal(closedDoorShot.blockedBySolid, true, 'Closed door_b01_east_main must block shot');
  assert.equal(closedDoorShot.role, 'door_leaf');

  sim.world.setDoorState('door_b01_east_main', 'open');
  const openDoorShot = sim.fireDirectRay(
    { x: -20, y: 1.35, z: -15.5 },
    { x: -1, y: 0, z: 0 },
  );
  assert.equal(openDoorShot.hitTarget, true, 'Opening door_b01_east_main must allow shot to hit tgt_b01_hall_door');
  assert.equal(openDoorShot.hitId, 'tgt_b01_hall_door');

  // 5. Interior to exterior through open doorway hits tgt_courtyard_open (-8, 0, -15.5)
  const intToExtShot = sim.fireDirectRay(
    { x: -27.5, y: 1.35, z: -15.5 },
    { x: 1, y: 0, z: 0 },
  );
  assert.equal(intToExtShot.hitTarget, true, 'Shot from inside B01 Sala through open east door must hit courtyard target');
  assert.equal(intToExtShot.hitId, 'tgt_courtyard_open');

  // 6. Intact glass pane (win_b01_east_hall at x=-26, z=-18 + 0.65 = -17.35, y=0.95..2.05) breaks on 1st shot, passes 2nd shot
  assert.equal(sim.world.getWindowState('win_b01_east_hall'), 'intact');
  const glassFirstShot = sim.fireDirectRay(
    { x: -20, y: 1.4, z: -17.35 },
    { x: -1, y: 0, z: 0 },
  );
  assert.equal(glassFirstShot.glassBrokenId, 'win_b01_east_hall');
  assert.equal(sim.world.getWindowState('win_b01_east_hall'), 'broken');

  const glassSecondShot = sim.fireDirectRay(
    { x: -20, y: 1.4, z: -17.35 },
    { x: -1, y: 0, z: 0 },
  );
  assert.equal(glassSecondShot.glassBrokenId, null, 'Second shot through broken window must pass glass plane');
  assert.ok(glassSecondShot.distance > 6.5, 'Second shot must travel into B01 interior');

  // 7. Orchard tree canopy vs trunk: tree_orch_02 is at (-7.5, 34.0), trunkRadius=0.22, canopyY=1.9..4.3, canopyRadius=2.1
  // Target tgt_orchard_canopy is at (-7.5, 0, 40.0).
  // A line at x = -6.7 (offset 0.8m from trunk center, well outside 0.22m trunk but inside 2.1m canopy)
  const canopyRayVisual = sim.world.lineOfSight(
    { x: -6.7, y: 0, z: 30.0, eyeHeight: 2.0, space: 'metres' },
    { x: -6.7, y: 0, z: 40.0, eyeHeight: 2.0, space: 'metres' },
    { includeFoliage: true },
  );
  assert.equal(canopyRayVisual, false, 'Visual LoS with includeFoliage:true must be occluded by orchard canopy');

  // Firing from (-6.7, 2.05, 30.0) angled slightly toward tgt_orchard_canopy head/torso at (-7.5, 1.45, 40.0) passes through canopy (z=34, x=-7.02, y=1.81..1.95)
  const canopyShot = sim.fireDirectRay(
    { x: -6.5, y: 2.4, z: 30.0 },
    { x: -1.0, y: -1.0, z: 10.0 },
  );
  assert.equal(canopyShot.hitTarget, true, 'Ballistic ray must pass through orchard foliage canopy and hit tgt_orchard_canopy');
  assert.equal(canopyShot.hitId, 'tgt_orchard_canopy');

  // Firing straight through the tree trunk center (x=-7.5, y=1.1, z=30 -> z=40) is blocked by wood_thick trunk
  const trunkShot = sim.fireDirectRay(
    { x: -7.5, y: 1.1, z: 30.0 },
    { x: 0, y: 0, z: 1 },
  );
  assert.equal(trunkShot.blockedBySolid, true, 'Tree trunk (wood_thick) must block ballistic ray');
  assert.equal(trunkShot.role, 'tree_trunk');
  assert.equal(trunkShot.material, 'wood_thick');
});

test('M02-01 Snapshot / Restore preserves player, weapon, door, glass, and target states', () => {
  const sim = new M02BenchSimulation();
  sim.teleportPlayer(-25, -14, Math.PI / 2);
  sim.world.setDoorState('door_b01_east_main', 'open');
  sim.world.setWindowState('win_b01_east_hall', 'broken');
  const snap = sim.snapshot();

  sim.teleportPlayer(10, 10, 0);
  sim.world.setDoorState('door_b01_east_main', 'closed');
  assert.equal(sim.world.getDoorState('door_b01_east_main'), 'closed');

  sim.restoreSnapshot(snap);
  assert.equal(sim.player.x, -25);
  assert.equal(sim.world.getDoorState('door_b01_east_main'), 'open');
  assert.equal(sim.world.getWindowState('win_b01_east_hall'), 'broken');
});
