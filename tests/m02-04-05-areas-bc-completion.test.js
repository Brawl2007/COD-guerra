import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import { M02_DIALOGUE_CATALOG } from '../src/game/m02-combat-ai.js';
import { MAX_RESIDENT_CELLS } from '../src/world/m02-zone-streamer.js';
import { M02_TR_CARTELAS } from '../src/game/m02-acts-director.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

describe('M02-04 & M02-05 — Área B (Łęczyca), Área C (Leśmierz), Epílogo C12 e Ponte M02→M03', () => {
  test('M02-04/05 Boundary Guard — m02-zone-streamer.js and m02-acts-director.js are pure deterministic simulation', () => {
    for (const rel of ['src/world/m02-zone-streamer.js', 'src/game/m02-acts-director.js']) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.equal(/from\s+['"]three['"]/.test(src), false, `${rel} must not import Three.js`);
      assert.equal(/\b(window|document|requestAnimationFrame)\b/.test(src), false, `${rel} must not reference DOM`);
      assert.equal(/\bMath\.random\s*\(/.test(src), false, `${rel} must not call Math.random()`);
      assert.equal(/\bDate\.now\s*\(/.test(src), false, `${rel} must not call Date.now()`);
    }
  });

  test('STREAM-01 & PERF-02 — M02ZoneStreamer enforces <= 2 resident cells across A -> B -> C transitions and checkpoint restores', () => {
    const sim = new M02BenchSimulation(19390909, { startScene: 'C01' });
    assert.equal(MAX_RESIDENT_CELLS, 2);
    assert.equal(sim.zoneStreamer.getStreamingMetrics().residentCellsCount, 1);

    // Preload B while in A -> 2 resident cells
    sim.zoneStreamer.preloadCell('B');
    assert.equal(sim.zoneStreamer.getStreamingMetrics().residentCellsCount, 2);

    // Switch to B -> still <= 2 resident cells
    sim.enterAreaBC06();
    assert.equal(sim.activeCellId, 'B');
    assert.ok(sim.zoneStreamer.getStreamingMetrics().residentCellsCount <= 2);

    // Switch to C -> evicts oldest non-active cell, keeping residentCellsCount <= 2
    sim.enterAreaCC09();
    const metricsC = sim.zoneStreamer.getStreamingMetrics();
    assert.equal(sim.activeCellId, 'C');
    assert.ok(metricsC.residentCellsCount <= 2, `Expected <= 2 resident cells, got ${metricsC.residentCellsCount}`);
    assert.ok(metricsC.disposedCellsCount >= 1, 'Expected at least 1 unloaded cell to be disposed');

    // Restore checkpoint from Area A -> switches back to A cleanly with <= 2 resident cells
    sim.restoreCheckpoint('cp_m02_a_preparacao');
    assert.equal(sim.activeCellId, 'A');
    assert.ok(sim.zoneStreamer.getStreamingMetrics().residentCellsCount <= 2);
  });

  test('M02-04 (Área B · Łęczyca) — EB1 (12 defenders), B05..B08 rules, SP02 Supply Cart (2/1/0 volumes & damaged wheel), and TR02 reorganization', () => {
    // 1. Full 2-volume delivery via intact cart once corridor is cleared
    const sim = new M02BenchSimulation(19390909, { startScene: 'C01' });
    sim.enterAreaBC06();
    assert.equal(sim.activeCellId, 'B');
    assert.equal(sim.horizon.temporalState, 'T1');
    assert.equal(sim.enemies.length, 12, 'EB1 must have 12 finite defenders (DE-B01..DE-B12)');
    assert.equal(sim.objective.id, 'O04');

    // Verify B05, B06, B07 have doors while B08 is an opaque closed dwelling (0 doors)
    const b08 = sim.world.layout.buildings.find((b) => b.id === 'B08');
    assert.ok(b08, 'Building B08 must exist in Cell B');
    assert.equal(b08.doors.length, 0, 'B08 must be opaque/closed with 0 enterable doors');

    // While EB1 defenders are active and unsuppressed, cart waits
    sim.tick(1.0);
    assert.equal(sim.areaB.supplyCart.state, 'WAITING_CLEAR_CORRIDOR');

    // Neutralize EB1 defenders so corridor is clear and advance cart to goal
    for (const e of sim.enemies) {
      e.alive = false;
      e.health = 0;
      e.state = 'DEAD';
    }
    for (let i = 0; i < 650; i++) {
      sim.tick(0.1);
      if (sim.areaB.supplyCart.state === 'DELIVERED') break;
    }
    assert.equal(sim.areaB.supplyCart.state, 'DELIVERED');
    assert.equal(sim.flags['m02.supply_reached'], 2);
    assert.equal(sim.supplies.waterDelivered, true);
    assert.equal(sim.supplies.ammoDelivered, true);
    assert.equal(sim.flags['m02.corridor_held'], true);
    assert.equal(sim.objective.id, 'O05');

    // Complete C07 reorganization (TR02 -> T2 morning + cp_m02_c_reorganizacao)
    sim.player.health = 65;
    const reserveBefore = sim.weapon.reserve;
    const tr02 = sim.completeC07Reorganization();
    assert.equal(tr02.temporalState, 'T2');
    assert.equal(tr02.cartela, M02_TR_CARTELAS.TR02);
    assert.ok(sim.weapon.reserve > reserveBefore, 'Delivered ammo volume must replenish reserve in C07');
    assert.equal(sim.player.health, 75, 'Delivered water volume provides bounded recovery (+10, never magical 100%)');
    assert.ok(sim.checkpoints.has('cp_m02_c_reorganizacao'), 'Checkpoint cp_m02_c_reorganizacao must be saved');

    // 2. Damaged cart wheel (SP02 contingency) + manual transport (1 volume delivered, 1 lost) + SAVE-02 anti-duplication
    const simPartial = new M02BenchSimulation(19390909);
    simPartial.enterAreaBC06();
    assert.equal(simPartial.damageCartWheel(), true);
    assert.equal(simPartial.areaB.supplyCart.state, 'IMMOBILIZED');
    assert.equal(simPartial.dialogue.hasTriggered('bz39_c06_03'), true);
    assert.equal(simPartial.dialogue.hasTriggered('bz39_c06_04'), true);

    // Piotr picks up water volume; attempting to pick up second volume while carrying first must be rejected
    assert.equal(simPartial.pickupSupplyVolume('vol_water', 'piotr_sokol'), true);
    assert.equal(simPartial.pickupSupplyVolume('vol_ammo', 'piotr_sokol'), false, 'Single carrier cannot carry 2 volumes simultaneously');

    // Validate SAVE-02 rejects corrupted snapshot with duplicate carrier
    const badSnap = simPartial.snapshot();
    badSnap.areaB.supplyCart.volumes[1].carriedBy = 'piotr_sokol';
    const checkBad = validateM02Snapshot(badSnap);
    assert.equal(checkBad.valid, false, 'SAVE-02 must reject duplicate carrier in supplyCart volumes');

    // Deliver water volume and lose ammo volume -> supply_reached === 1
    assert.equal(simPartial.deliverSupplyVolume('vol_water'), true);
    assert.equal(simPartial.loseSupplyVolume('vol_ammo'), true);
    assert.equal(simPartial.flags['m02.supply_reached'], 1);
    assert.equal(simPartial.supplies.waterDelivered, true);
    assert.equal(simPartial.supplies.ammoDelivered, false);

    // 3. Zero volumes delivered (supply_reached === 0) still allows mission progression once corridor is held
    const simZero = new M02BenchSimulation(19390909);
    simZero.enterAreaBC06();
    simZero.loseSupplyVolume('vol_water');
    simZero.loseSupplyVolume('vol_ammo');
    for (const e of simZero.enemies) {
      e.alive = false;
      e.state = 'DEAD';
    }
    simZero.tick(0.1);
    assert.equal(simZero.flags['m02.supply_reached'], 0);
    assert.equal(simZero.flags['m02.corridor_held'], true);
  });

  test('M02-05 (Área C · Leśmierz) — 46 total hostiles, C08 Lis liaison, dlg_m02_002, SP03 fixed artillery impact, dlg_m02_003, and 3 Lis outcomes into M03', () => {
    const sim = new M02BenchSimulation(19390909, { startScene: 'C01' });
    // After C01 + EA1: 4 + 10 = 14 hostiles
    assert.equal(sim.totalHostilesSpawned, 14);

    // Enter Area B (EB1 adds 12 -> 26)
    sim.enterAreaBC06();
    assert.equal(sim.totalHostilesSpawned, 26);
    sim.deliverSupplyVolume('vol_water');
    sim.deliverSupplyVolume('vol_ammo');
    sim.completeC07Reorganization();

    // Enter Area C (C08 detaches Lis, EC1 adds 8 -> 34)
    sim.enterAreaCC09();
    assert.equal(sim.activeCellId, 'C');
    assert.equal(sim.horizon.temporalState, 'T3');
    assert.equal(sim.totalHostilesSpawned, 34);
    const lisInC09 = sim.allies.find((a) => a.id === 'pl_lis');
    assert.equal(lisInC09.detachedOutOfCell, true, 'Lis must be detached on liaison outside the cell during C09-C10');

    // Start C10 (EC2 adds 12 -> exact 46 total mission hostiles!)
    sim.startC10OrderChanges();
    assert.equal(sim.totalHostilesSpawned, 46, 'Total identified hostiles across EA0+EA1+EB1+EC1+EC2 must equal 46');
    assert.equal(sim.dialogue.hasTriggered('dlg_m02_002'), true);
    assert.equal(
      M02_DIALOGUE_CATALOG.dlg_m02_002.text,
      'O grupo da direita recuou. Nossa ordem mudou.',
      'Protected literal line dlg_m02_002 must remain exact',
    );
    assert.ok(sim.checkpoints.has('cp_m02_d_cobertura_retirada'), '4th canonical checkpoint cp_m02_d_cobertura_retirada must be saved');

    // SP03 Fixed Artillery Impact at (4, 0, 18) blocks exterior street and starts C11
    const blast = sim.detonateC10FixedArtillery();
    assert.ok(blast, 'SP03 fixed artillery impact must detonate');
    assert.equal(blast.center.x, 4);
    assert.equal(blast.center.z, 18);
    assert.equal(sim.areaC.corridorExteriorBlocked, true);
    assert.equal(sim.areaC.c11Started, true);
    assert.equal(lisInC09.detachedOutOfCell, false, 'Lis returns in C11 wounded by fragmentation');
    assert.equal(lisInC09.state, 'WOUNDED_LIAISON');
    assert.equal(sim.allies.filter((a) => a.id === 'pl_lis').length, 1, 'Lis must never be duplicated');

    // Advance simulation so Last Group (LG01..LG12) traverses B09 -> B12
    for (let i = 0; i < 450; i++) {
      sim.tick(0.1);
    }
    assert.ok(sim.flags['m02.last_group_survivors'] > 0, 'Last group survivors must advance and evacuate to B12');

    // Outcome A: wounded_evacuated
    const pkgEvac = sim.completeC12Epilogue({ lisOutcome: 'wounded_evacuated' });
    assert.equal(sim.dialogue.hasTriggered('dlg_m02_003'), true);
    assert.equal(
      M02_DIALOGUE_CATALOG.dlg_m02_003.text,
      'Você vem conosco. A arma eu levo.',
      'Protected literal line dlg_m02_003 must remain exact',
    );
    assert.equal(pkgEvac.flags['m02.lis_status'], 'wounded_evacuated');
    assert.equal(pkgEvac.m03ImportState.lisEntry.presentInShelter, true);
    assert.equal(pkgEvac.m03ImportState.lisEntry.combatCapableNormalPatrol, false);
    assert.equal(pkgEvac.m03ImportState.lisEntry.canSpeakCanonicalWaterLine, true);
    assert.equal(pkgEvac.m03ImportState.waterReserveBonus, 'small_water_reserve_available');

    // Outcome B: wounded_walking
    const pkgWalk = sim.completeC12Epilogue({ lisOutcome: 'wounded_walking' });
    assert.equal(pkgWalk.flags['m02.lis_status'], 'wounded_walking');
    assert.equal(pkgWalk.m03ImportState.lisEntry.presentInShelter, true);
    assert.equal(pkgWalk.m03ImportState.lisEntry.requiresSupportWalking, true);
    assert.equal(pkgWalk.m03ImportState.lisEntry.canSpeakCanonicalWaterLine, true);

    // Outcome C (NAR-02): missing -> Lis never speaks in C12 or M03, and Wierzba speaks "Lis…"
    const simMissing = new M02BenchSimulation(19390909);
    const pkgMissing = simMissing.completeC12Epilogue({ lisOutcome: 'missing' });
    assert.equal(pkgMissing.flags['m02.lis_status'], 'missing');
    assert.equal(simMissing.dialogue.hasTriggered('bz39_c12_01'), false, 'Absent Lis must never speak bz39_c12_01');
    assert.equal(simMissing.dialogue.hasTriggered('bz39_c12_02'), true, 'Wierzba must speak bz39_c12_02 ("Lis…") when Lis is missing');
    assert.equal(pkgMissing.m03ImportState.lisEntry.presentInShelter, false);
    assert.equal(pkgMissing.m03ImportState.lisEntry.canSpeakCanonicalWaterLine, false);
    assert.equal(pkgMissing.m03ImportState.lisEntry.canonicalWaterLineSpeaker, null);
  });

  test('HIST-TEST-01 — Historical invariant: morning of 10 September 1939 is never represented as a general retreat of Army Poznań', () => {
    const sim = new M02BenchSimulation(19390909, { startScene: 'C01' });
    const pkg = sim.completeC12Epilogue({ lisOutcome: 'wounded_evacuated' });
    assert.equal(pkg.historicalDates.generalRetreatOnMorningSept10, false);
    assert.equal(pkg.historicalDates.reorganizationMorning, '1939-09-10');
    assert.equal(pkg.historicalDates.operationalShift, '1939-09-12/13');

    // Check all cartelas and dialogue lines for morning of 10 September (C07 / TR02)
    assert.equal(/retirada geral/i.test(M02_TR_CARTELAS.TR02), false);
    for (const id of ['bz39_c07_01', 'bz39_c07_02', 'bz39_c07_03']) {
      assert.equal(/retirada geral/i.test(M02_DIALOGUE_CATALOG[id].text), false);
    }
    assert.match(M02_TR_CARTELAS.TR04, /12–13 de setembro: a operação muda de direção/);
  });
});
