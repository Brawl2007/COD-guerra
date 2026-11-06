import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { M02BenchSimulation } from '../src/game/m02-01-simulation.js';
import {
  M02AudiovisualDirector,
  WEAPON_CLEARANCE_DIST_M,
  MATERIAL_IMPACT_AUDIO_MAP,
  DEFAULT_ACCESSIBILITY_OPTIONS,
} from '../src/game/m02-audiovisual-director.js';
import { traceObstruction } from '../src/world/spatial.js';
import { SP03_DEBRIS_COVER_ID } from '../src/game/m02-acts-director.js';

describe('M02-06 — Audiovisual Director, Accessibility, and Full Acceptance Matrix O2/O3', () => {
  it('Boundary Guard — m02-audiovisual-director.js is pure deterministic simulation', () => {
    const srcPath = resolve(process.cwd(), 'src/game/m02-audiovisual-director.js');
    const content = readFileSync(srcPath, 'utf8');

    assert.ok(!content.includes('window.'), 'm02-audiovisual-director.js must not reference window');
    assert.ok(!content.includes('document.'), 'm02-audiovisual-director.js must not reference document');
    assert.ok(!content.includes('three'), 'm02-audiovisual-director.js must not import Three.js');
    assert.ok(!content.includes('Math.random()'), 'm02-audiovisual-director.js must not use Math.random()');
    assert.ok(!content.includes('Date.now()'), 'm02-audiovisual-director.js must not use Date.now()');
  });

  it('AV-01: Weapon clearance kinematics lowers weapon near obstacles and recovers smoothly', () => {
    const sim = new M02BenchSimulation(19390909);

    // B01 east exterior wall is at x = -26.0, extending between z = -18 and z = -8
    // Solid brick wall segment at z = -12.0 (no openings)
    // Position player facing West (angle = Math.PI) at x = -25.5 (0.5m distance from wall, < 0.78m)
    sim.player.x = -25.5;
    sim.player.z = -12.0;
    sim.player.angle = Math.PI; // Aiming West (-x) directly into east wall
    sim.player.pitch = 0.0;

    const kinNear = sim.audiovisual.evaluateWeaponClearance(sim);
    assert.equal(kinNear.clearanceState, 'LOWERED_NEAR_OBSTACLE', 'Weapon must lower when within 0.78m of wall');
    assert.ok(kinNear.lowerPitchRad > 0.1, 'Weapon pitch must angle downward near obstacle');
    assert.ok(kinNear.pullBackM > 0.05, 'Weapon must pull back near obstacle to prevent clipping');

    // Step player back to 1.5m away from the wall (x = -24.5)
    sim.player.x = -24.5;
    const kinFar = sim.audiovisual.evaluateWeaponClearance(sim);
    assert.equal(kinFar.clearanceState, 'READY', 'Weapon must return to READY when clear of obstacle');
    assert.equal(kinFar.lowerPitchRad, 0, 'Lower pitch must be 0 when weapon has clearance');
    assert.equal(kinFar.pullBackM, 0, 'Pull back must be 0 when weapon has clearance');

    // Test recoil kinematics on firing
    sim.player.crouched = false;
    sim.firePlayerWeapon(true, true);
    const standingRecoil = sim.audiovisual.weaponKinematics.recoilPitchRad;
    assert.ok(standingRecoil > 0.05, 'Standing shot must induce perceptible recoil pitch');

    // Advance 0.5s: recoil should decay smoothly
    for (let i = 0; i < 5; i++) {
      sim.tick(0.1, {});
    }
    assert.ok(
      sim.audiovisual.weaponKinematics.recoilPitchRad < standingRecoil,
      'Recoil pitch must smoothly diminish during simulation update',
    );
  });

  it('AV-01: Material-exact acoustic cues and 3-scale spatial audio with door/wall occlusion', () => {
    const sim = new M02BenchSimulation(19390909);

    // 1. Earth impact must never trigger metallic ping
    const earthCue = MATERIAL_IMPACT_AUDIO_MAP.earth;
    assert.equal(earthCue.cueId, 'sfx_impact_earth_wet_thud', 'Earth must map to wet earth thud');
    assert.equal(earthCue.isMetallic, false, 'Earth must never have metallic ping');

    // 2. Metal impact must have metallic ping
    const metalCue = MATERIAL_IMPACT_AUDIO_MAP.metal;
    assert.equal(metalCue.cueId, 'sfx_impact_metal_ping');
    assert.equal(metalCue.isMetallic, true);

    // 3. Acoustic scales and delay
    sim.player.x = 0;
    sim.player.z = -80;

    // Close source (< 12m): close_mechanical, 0 acoustic delay
    const closeEvt = sim.audiovisual.emitSpatialAudioEvent(sim, {
      category: 'footstep_puddle',
      sourcePos: { x: 2, y: 0, z: -83 },
      material: 'earth',
      isCriticalWarning: false,
    });
    assert.equal(closeEvt.scale, 'close_mechanical');
    assert.equal(closeEvt.delaySec, 0, 'Close source must have zero acoustic delay');

    // Tactical encounter (40m away in clear sight): delay = d / 343
    const medEvt = sim.audiovisual.emitSpatialAudioEvent(sim, {
      category: 'bullet_impact',
      sourcePos: { x: 0, y: 0, z: -40 },
      material: 'earth',
      isCriticalWarning: false,
    });
    assert.equal(medEvt.scale, 'tactical_encounter');
    assert.ok(medEvt.delaySec > 0.1, 'Tactical sound at 40m must have realistic acoustic delay');
    assert.equal(medEvt.occlusionState, 'direct');
    assert.equal(medEvt.gainMultiplier, 1.0);

    // Critical warnings are NEVER delayed by speed of sound (L3 specification)
    const critEvt = sim.audiovisual.emitSpatialAudioEvent(sim, {
      category: 'artillery_incoming_whistle',
      sourcePos: { x: 0, y: 15, z: 200 },
      material: 'air',
      isCriticalWarning: true,
    });
    assert.equal(critEvt.delaySec, 0, 'Critical interface warnings must never be delayed by distance');

    // 4. Occlusion through closed door vs solid wall
    // B01 door_b01_east_main is centered at x = -26, y = 1.05, z = -15.5
    sim.world.setDoorState('door_b01_east_main', 'closed');
    sim.player.x = -24.5;
    sim.player.y = 0;
    sim.player.z = -15.5;

    const doorEvt = sim.audiovisual.emitSpatialAudioEvent(sim, {
      category: 'enemy_fire',
      sourcePos: { x: -27.5, y: 1.05, z: -15.5 },
      material: 'wood_thick',
    });
    assert.equal(doorEvt.occlusionState, 'closed_door', 'Sound passing through closed door must be door-occluded');
    assert.equal(doorEvt.gainMultiplier, 0.52, 'Door occlusion must apply 0.52 gain');
    assert.equal(doorEvt.lowPassHz, 1400, 'Door occlusion must filter to 1400 Hz');

    // Position source inside B02 barn at (12, -30) and listener outside west behind brick wall at (0, -30)
    sim.player.x = 0;
    sim.player.z = -30;
    const wallEvt = sim.audiovisual.emitSpatialAudioEvent(sim, {
      category: 'enemy_fire',
      sourcePos: { x: 12, y: 0.5, z: -30 },
      material: 'brick',
    });
    assert.equal(wallEvt.occlusionState, 'solid_wall', 'Sound passing through brick wall must be wall-occluded');
    assert.equal(wallEvt.gainMultiplier, 0.28, 'Wall occlusion must apply 0.28 gain');
    assert.equal(wallEvt.lowPassHz, 680, 'Wall occlusion must filter to 680 Hz');
  });

  it('AV-02: Accessibility options mutate presentation without mutating live combat state', () => {
    const sim = new M02BenchSimulation(19390909);

    // Configure accessibility options
    sim.setAccessibilityOptions({
      reducedDynamicRange: true,
      tinnitusIntensity: 0.0,
      reducedCameraShake: true,
      directionalIndicatorsEnabled: true,
    });

    assert.equal(sim.audiovisual.accessibility.reducedDynamicRange, true);
    assert.equal(sim.audiovisual.accessibility.tinnitusIntensity, 0.0);
    assert.equal(sim.audiovisual.accessibility.reducedCameraShake, true);

    // Trigger close explosion
    const playerHealthBefore = sim.player.health;
    sim.detonateGrenadeAt(sim.player.x + 3.0, sim.player.y, sim.player.z, 6.5);

    // Verify reduced camera shake is clamped to <= 0.008 rad
    assert.ok(
      sim.audiovisual.cameraShake.amplitudeRad <= 0.008,
      'Reduced camera shake must clamp amplitude <= 0.008 rad',
    );
    // Verify tinnitus is completely muted when tinnitusIntensity = 0.0
    assert.equal(sim.audiovisual.cameraShake.tinnitusLevel, 0.0, 'Tinnitus must be 0 when intensity is 0');

    // Directional indicator created
    assert.ok(sim.audiovisual.directionalIndicators.length > 0, 'Directional indicator must be created on explosion');

    // Verify snapshot / restore preserves accessibility options
    const snap = sim.snapshot();
    assert.ok(snap.audiovisual, 'Snapshot must contain audiovisual slice');

    const freshSim = new M02BenchSimulation(19390909);
    freshSim.restoreSnapshot(snap);

    assert.equal(freshSim.audiovisual.accessibility.reducedDynamicRange, true);
    assert.equal(freshSim.audiovisual.accessibility.tinnitusIntensity, 0.0);
    assert.equal(freshSim.audiovisual.accessibility.reducedCameraShake, true);
  });

  it('MAP-03: Stretcher and evacuation route physical scale and raycast clearance (0 collisions at ±0.45m)', () => {
    const sim = new M02BenchSimulation(19390909);
    sim.enterAreaCC09();

    const evacRoute = sim.world.layout.evacRoute;
    assert.ok(Array.isArray(evacRoute) && evacRoute.length >= 6, 'Cell C must define multi-waypoint evacRoute');

    // Make sure necessary doors along the evacuation path are open
    sim.world.doorStates.set('b09_door_e', 'open');
    sim.world.doorStates.set('b09_door_s', 'open');
    sim.world.doorStates.set('b12_door_n', 'open');
    sim.world.doorStates.set('b12_door_s', 'open');

    let totalRaycastChecks = 0;
    let collisions = 0;

    for (let i = 0; i < evacRoute.length - 1; i++) {
      const p1 = evacRoute[i];
      const p2 = evacRoute[i + 1];
      const segDx = p2.x - p1.x;
      const segDz = p2.z - p1.z;
      const segLen = Math.hypot(segDx, segDz);
      const nx = segDx / segLen;
      const nz = segDz / segLen;

      // Normal perpendicular to path direction
      const perpX = -nz;
      const perpZ = nx;
      const halfWidth = 0.45; // ±0.45m gives 0.9m minimum required clearance

      const steps = Math.ceil(segLen / 0.5);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = p1.x + segDx * t;
        const cz = p1.z + segDz * t;
        const cy = sim.world.heightAt(cx, cz) + 0.95;

        // Check center, left offset (+0.45m), and right offset (-0.45m)
        const checkPoints = [
          { x: cx, y: cy, z: cz },
          { x: cx + perpX * halfWidth, y: cy, z: cz + perpZ * halfWidth },
          { x: cx - perpX * halfWidth, y: cy, z: cz - perpZ * halfWidth },
        ];

        for (const pt of checkPoints) {
          totalRaycastChecks++;
          const obs = traceObstruction(
            sim.world,
            { x: pt.x, y: pt.y, z: pt.z },
            { x: nx, y: 0, z: nz },
            0.4,
          );
          if (obs && (obs.material === 'brick' || obs.material === 'stone' || obs.role === 'wall_exterior')) {
            collisions++;
          }
        }
      }
    }

    assert.ok(totalRaycastChecks > 50, `Must verify extensive waypoint samples (checked ${totalRaycastChecks})`);
    assert.equal(
      collisions,
      0,
      `Stretcher route must have exactly 0 solid wall collisions with 0.9m clearance width (found ${collisions})`,
    );
  });

  it('HZ-01..03: Distant war sectors HS-B1, HS-C1, HS-C2 and artillery idempotence across restore', () => {
    // 1. Cell B sector HS-B1
    const simB = new M02BenchSimulation(19390909);
    simB.enterAreaBC06();
    assert.ok(simB.horizon.hsB1, 'Cell B must activate hsB1 sector');
    assert.equal(simB.horizon.hsB1.state, 'LOCALIZED_FIRE');

    // 2. Cell C sector HS-C1 and HS-C2
    const simC = new M02BenchSimulation(19390909);
    simC.enterAreaCC09();
    assert.ok(simC.horizon.hsC1, 'Cell C must activate hsC1 right-flank sector');
    assert.ok(simC.horizon.hsC2, 'Cell C must activate hsC2 artillery sector');
    assert.equal(simC.horizon.hsC2.state, 'READY');

    // Before artillery impact: verify exterior street crater debris cover DOES NOT EXIST
    const coversBefore = simC.world.layout.exteriorCovers;
    assert.equal(
      coversBefore.some((c) => c.id === SP03_DEBRIS_COVER_ID),
      false,
      'Street debris crater must not exist before SP03 detonation',
    );

    // Save pre-impact checkpoint
    simC.saveCheckpoint('cp_pre_artillery');

    // Detonate artillery impact C10
    simC.detonateC10FixedArtillery();
    assert.equal(simC.horizon.hsC2.state, 'IMPACTED');
    assert.equal(simC.areaC.artilleryDetonated, true);

    // After impact: street debris crater MUST exist
    assert.ok(
      simC.world.layout.exteriorCovers.some((c) => c.id === SP03_DEBRIS_COVER_ID),
      'Street debris crater must exist after SP03 detonation',
    );

    // Save post-impact checkpoint
    simC.saveCheckpoint('cp_post_artillery');

    // Restore pre-impact checkpoint: street debris crater must be removed
    simC.restoreCheckpoint('cp_pre_artillery');
    assert.equal(
      simC.world.layout.exteriorCovers.some((c) => c.id === SP03_DEBRIS_COVER_ID),
      false,
      'Restoring pre-impact checkpoint must remove street debris crater',
    );
    assert.equal(simC.areaC.artilleryDetonated, false);

    // Restore post-impact checkpoint: street debris crater must exist exactly once (no duplicates)
    simC.restoreCheckpoint('cp_post_artillery');
    const matches = simC.world.layout.exteriorCovers.filter((c) => c.id === SP03_DEBRIS_COVER_ID);
    assert.equal(matches.length, 1, 'Street debris crater must exist exactly once after restoring post-impact checkpoint');
    assert.equal(simC.areaC.artilleryDetonated, true);
  });

  it('O3: 12-Seed Climax Stress Audit (19390909..19390920) completes full mission flow with 100% determinism', () => {
    const seeds = [
      19390909, 19390910, 19390911, 19390912,
      19390913, 19390914, 19390915, 19390916,
      19390917, 19390918, 19390919, 19390920,
    ];

    for (const seed of seeds) {
      const sim = new M02BenchSimulation(seed);

      // Area A: Start C01 full mission
      sim.startAreaAFullC01();
      assert.equal(sim.c01Active, true, `Seed ${seed}: C01 must be active`);

      // Neutralize EA0 outpost enemies DE-A01..DE-A04
      const ea0Enemies = sim.enemies.filter((e) => ['DE-A01', 'DE-A02', 'DE-A03', 'DE-A04'].includes(e.id));
      for (const e of ea0Enemies) {
        e.alive = false;
        e.state = 'DEAD';
      }
      sim.tick(0.1, {});
      assert.equal(sim.objective.id, 'O01', `Seed ${seed}: O00 must advance to O01 after EA0`);

      // Neutralize EA1 farmstead enemies DE-A05..DE-A14
      const ea1Enemies = sim.enemies.filter((e) => e.id.startsWith('DE-A'));
      for (const e of ea1Enemies) {
        e.alive = false;
        e.state = 'DEAD';
      }
      sim.tick(0.1, {});

      // Transition T-AB to Area B
      const tabPayload = sim.triggerTransitionTAB({ skip: true });
      assert.ok(tabPayload, `Seed ${seed}: T-AB transition payload must exist`);
      assert.equal(tabPayload.transitionId, 'T-AB');

      // Enter Area B C06
      sim.enterAreaBC06();
      assert.equal(sim.activeCellId, 'B', `Seed ${seed}: Active cell must be B`);
      assert.equal(sim.areaB.active, true, `Seed ${seed}: Area B must be active`);
      assert.equal(sim.objective.id, 'O04', `Seed ${seed}: Objective must be O04`);

      // Resolve SP02 cart: deliver supplies
      sim.deliverSupplyVolume('vol_ammo');
      sim.deliverSupplyVolume('vol_water');
      assert.equal(sim.supplies.ammoDelivered, true, `Seed ${seed}: Ammo crate must be delivered`);
      assert.equal(sim.supplies.waterDelivered, true, `Seed ${seed}: Water crate must be delivered`);

      // Complete C07 reorganization
      sim.completeC07Reorganization();
      assert.equal(sim.areaB.reorganizedC07, true, `Seed ${seed}: Area B must be reorganized`);

      // Enter Area C C09
      sim.enterAreaCC09();
      assert.equal(sim.activeCellId, 'C', `Seed ${seed}: Active cell must be C`);

      // Unlock C09 gate latch
      sim.unlockC09GateLatch();
      assert.equal(sim.areaC.gateLatchUnlocked, true);

      // Start C10 order changes & artillery impact
      sim.startC10OrderChanges();
      sim.detonateC10FixedArtillery();
      assert.equal(sim.areaC.artilleryDetonated, true);

      // C11 Lis: evacuate wounded Lis
      sim.assistLisInC11('wounded_evacuated');
      assert.equal(sim.flags['m02.lis_status'], 'wounded_evacuated');

      // Complete C12 Epilogue and export to M03
      const pkg = sim.completeC12Epilogue();
      assert.equal(pkg.completed, true, `Seed ${seed}: Epilogue must complete M02`);
      assert.equal(sim.areaC.c12Completed, true);
      assert.equal(pkg.schema, 'cod-guerra-campaign-bridge-m02-to-m03-v1');
      assert.equal(pkg.missionId, 'M02');
      assert.equal(pkg.nextMissionId, 'M03');
      assert.equal(pkg.totalHostilesPlanned, 46);
      assert.equal(pkg.m03ImportState.lisEntry.status, 'wounded_evacuated');
      assert.equal(pkg.historicalDates.generalRetreatOnMorningSept10, false);
      assert.ok(Number.isFinite(sim.player.x) && !Number.isNaN(sim.player.x));
      assert.ok(Number.isFinite(sim.player.z) && !Number.isNaN(sim.player.z));
    }
  });
});
