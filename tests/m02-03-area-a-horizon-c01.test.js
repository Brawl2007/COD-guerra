import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { M02BenchSimulation } from '../src/game/m02-01-simulation.js';
import {
  M02HorizonDirector,
  HORIZON_SECTORS_360,
  M02_TEMPORAL_STATES,
  SOUND_SPEED_MPS,
  LOD_PROMOTE_TO_L1_M,
  LOD_DEMOTE_TO_L2_M,
} from '../src/world/m02-horizon-system.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

describe('M02-03 — Área A Completa (Cena C01 + EA0 + Horizonte Vivo N2 + Transição T-AB)', () => {
  it('M02-03 Boundary Guard — m02-horizon-system.js is pure deterministic simulation (no DOM, Three.js, Math.random, or Date.now)', () => {
    const src = readFileSync(resolve(ROOT, 'src/world/m02-horizon-system.js'), 'utf8');
    assert.ok(!src.includes("from 'three'"), 'm02-horizon-system.js must not import three');
    assert.ok(!/\bwindow\b|\bdocument\b/.test(src), 'm02-horizon-system.js must not reference window or document');
    assert.ok(!src.includes('Math.random'), 'm02-horizon-system.js must not use Math.random');
    assert.ok(!src.includes('Date.now'), 'm02-horizon-system.js must not use Date.now');
  });

  it('C01 & EA0 — startAreaAFullC01() places Piotr at P1 (0, -175), squad engages EA0 (< 30 s), and clearing DE-A01..DE-A04 advances O00 -> O01', () => {
    const sim = new M02BenchSimulation();
    sim.startAreaAFullC01();

    assert.equal(sim.c01Active, true);
    assert.equal(sim.player.x, 0);
    assert.equal(sim.player.z, -175);
    assert.equal(sim.objective.id, 'O00');
    assert.equal(
      sim.activeCartela?.text,
      'Setor de Łęczyca — 9 de setembro de 1939 — fim da tarde',
      'C01 must display canonical opening cartela',
    );

    const ea0Defenders = sim.enemies.filter((e) => e.encounterId === 'EA0');
    assert.equal(ea0Defenders.length, 4, 'EA0 must have 4 finite outpost defenders (DE-A01..DE-A04)');
    for (const def of ea0Defenders) {
      const distFromP1 = Math.hypot(def.x - 0, def.z - -175);
      assert.ok(distFromP1 >= 55 && distFromP1 <= 85, `EA0 defender ${def.id} must be ~65-75m from P1`);
    }

    // Advance simulation for 12 seconds while player moves north->south along the approach track
    let actorBursts = 0;
    for (let i = 0; i < 240; i++) {
      sim.tick(0.05, { forward: 1 });
      for (const ev of sim.drainEvents()) {
        if (ev.type === 'actor-burst') actorBursts += 1;
      }
    }
    assert.ok(actorBursts > 0, 'Squad and EA0 outpost must exchange causal ballistic fire within < 15s');

    // Neutralize remaining EA0 defenders (simulating player/ally completion of EA0)
    for (const def of ea0Defenders) {
      def.alive = false;
      def.state = 'DEAD';
      def.health = 0;
    }
    sim.tick(0.05, {});

    assert.equal(sim.flags['m02.prep_avanco_ok'], true, 'Clearing EA0 must set m02.prep_avanco_ok');
    assert.equal(sim.flags['m02.ea0_posto_cleared'], true, 'Clearing EA0 must set m02.ea0_posto_cleared');
    assert.equal(sim.objective.id, 'O01', 'Clearing EA0 must immediately advance O00 -> O01');
    assert.ok(sim.checkpoints.has('cp_m02_a_preparacao'), 'Clearing EA0 must save cp_m02_a_preparacao');
  });

  it('HZ-01 & HZ-02 — 8 angular sectors of 45° and HS-A1 promotion/demotion L2 <-> L1 with 15% hysteresis preserving ID, health, and ammo', () => {
    assert.equal(HORIZON_SECTORS_360.length, 8, 'Horizon must define 8 angular sectors of 45 degrees');
    assert.equal(HORIZON_SECTORS_360[0].id, 'N');
    assert.equal(HORIZON_SECTORS_360[4].id, 'S');
    assert.equal(Object.keys(M02_TEMPORAL_STATES).length, 4, 'Horizon must define T0, T1, T2, T3');

    const horizon = new M02HorizonDirector();
    assert.equal(horizon.hsA1.actors.length, 6, 'HS-A1 must contain 6 persistent support soldiers');

    const targetActor = horizon.hsA1.actors[0]; // (-165, -140)
    targetActor.health = 84;
    targetActor.mag = 3;
    targetActor.reserve = 40;
    const events = [];

    // 1. Player far away (> 268m): actor stays in L2_impostor
    horizon.update(
      { clock: 2.0, player: { x: 130, y: 0, z: -140 }, objective: { id: 'O01' }, events },
      0.5,
    );
    assert.equal(targetActor.representation, 'L2_impostor');

    // 2. Player moves within <= 230m of targetActor (-165, -140): promotes to L1_actor
    horizon.update(
      { clock: 2.5, player: { x: 20, y: 0, z: -140 }, objective: { id: 'O01' }, events }, // dist = 185m <= 230m
      0.5,
    );
    assert.equal(targetActor.representation, 'L1_actor', 'Must promote to L1_actor when distance <= 230m');
    assert.ok(events.some((e) => e.type === 'horizon-actor-promoted' && e.actorId === 'hs_a1_01'));

    // 3. Player moves to 250m (between 230m and 268m hysteresis band): must NOT demote yet!
    horizon.update(
      { clock: 2.8, player: { x: 85, y: 0, z: -140 }, objective: { id: 'O01' }, events }, // dist = 250m (< 268m)
      0.5,
    );
    assert.equal(
      targetActor.representation,
      'L1_actor',
      `Hysteresis (${LOD_PROMOTE_TO_L1_M}m..${LOD_DEMOTE_TO_L2_M}m) must prevent premature demotion at 250m`,
    );

    // 4. Player moves beyond >= 268m: demotes cleanly to L2_impostor while preserving ID, health, mag, reserve
    horizon.update(
      { clock: 2.9, player: { x: 115, y: 0, z: -140 }, objective: { id: 'O01' }, events }, // dist = 280m >= 268m
      0.5,
    );
    assert.equal(targetActor.representation, 'L2_impostor', 'Must demote to L2_impostor when distance >= 268m');
    assert.ok(events.some((e) => e.type === 'horizon-actor-demoted' && e.actorId === 'hs_a1_01'));
    assert.equal(targetActor.id, 'hs_a1_01');
    assert.equal(targetActor.health, 84, 'Health must be preserved across L2 <-> L1 promotion/demotion');
    assert.equal(targetActor.mag, 3, 'Magazine ammo must be preserved across L2 <-> L1 promotion/demotion');
    assert.equal(targetActor.reserve, 40, 'Reserve ammo must be preserved across L2 <-> L1 promotion/demotion');
  });

  it('HZ-03 & Acoustic Delay — HS-A2 applies d / 343 m/s sound delay, settles into persistent smoke without looping, and HS-A3 passes once', () => {
    const horizon = new M02HorizonDirector();
    const player = { x: 0, y: 0, z: -80 };
    const firstEv = horizon.hsA2.events[0]; // flashAt: 2.5, pos: (340, 2, -210)
    const events = [];

    // At clock = 2.6s: visual flash must fire immediately, but acoustic sound must NOT have arrived yet
    horizon.update({ clock: 2.6, player, objective: { id: 'O01' }, events }, 0.1);
    const flashEv = events.find((e) => e.type === 'horizon-flash' && e.eventId === firstEv.id);
    assert.ok(flashEv, 'HS-A2 event must emit horizon-flash at flashAt');
    assert.equal(firstEv.flashed, true);
    assert.equal(firstEv.soundPlayed, false, 'Sound must not arrive instantaneously at ~364m');

    const expectedDelay = Math.hypot(firstEv.x - player.x, firstEv.y - player.y, firstEv.z - player.z) / SOUND_SPEED_MPS;
    assert.ok(
      Math.abs(flashEv.acousticDelaySec - expectedDelay) < 0.01,
      `Acoustic delay (${flashEv.acousticDelaySec}s) must match d / 343 m/s (${expectedDelay.toFixed(3)}s)`,
    );

    // Advance past soundArrivalAt
    events.length = 0;
    horizon.update({ clock: firstEv.soundArrivalAt + 0.05, player, objective: { id: 'O01' }, events }, 0.1);
    const soundEv = events.find((e) => e.type === 'horizon-acoustic-boom' && e.eventId === firstEv.id);
    assert.ok(soundEv, 'HS-A2 event must emit horizon-acoustic-boom after d / 343s');
    assert.equal(firstEv.soundPlayed, true);

    // Advance to clock = 90s with C04 / COMPLETE objective: HS-A1, HS-A2, HS-A3 reach terminal states
    for (let t = 5; t <= 90; t += 1.0) {
      horizon.update({ clock: t, player, objective: { id: 'COMPLETE' }, events }, 1.0);
    }

    assert.equal(horizon.hsA1.state, 'CONSOLIDATED', 'HS-A1 must reach terminal CONSOLIDATED state');
    assert.equal(horizon.hsA2.state, 'SETTLED_SMOKE', 'HS-A2 must reach terminal SETTLED_SMOKE state');
    assert.equal(horizon.hsA3.state, 'EXITED_SECTOR', 'HS-A3 logistics column must reach terminal EXITED_SECTOR state');

    // Verify no further explosions or vehicle loops ever occur after terminal states (HZ-03)
    const snap = horizon.snapshot();
    horizon.restore(snap);
    events.length = 0;
    horizon.update({ clock: 105.0, player, objective: { id: 'COMPLETE' }, events }, 5.0);
    assert.equal(events.length, 0, 'Completed horizon sectors must never restart or emit duplicate explosions');
  });

  it('NAR-01 (Cena C05 / T-AB) — watching vs skipping triggerTransitionTAB produces identical semantic state and T1 night transition', () => {
    const simWatch = new M02BenchSimulation();
    simWatch.flags['m02.celeiro_seguro'] = true;
    simWatch.flags['m02.pomar_c04_concluida'] = true;
    simWatch.player.health = 88;
    simWatch.weapon.mag = 4;
    simWatch.weapon.reserve = 35;
    simWatch.grenadeAmmo = 1;
    simWatch.saveCheckpoint('cp_pre_tab');

    const simSkip = new M02BenchSimulation();
    simSkip.checkpoints.set('cp_pre_tab', structuredClone(simWatch.checkpoints.get('cp_pre_tab')));
    simSkip.restoreCheckpoint('cp_pre_tab');

    const payloadWatched = simWatch.triggerTransitionTAB({ skip: false });
    const payloadSkipped = simSkip.triggerTransitionTAB({ skip: true });

    assert.deepEqual(
      payloadWatched,
      payloadSkipped,
      'NAR-01: Watching vs skipping C05 / T-AB must produce the exact same semantic transition payload',
    );
    assert.equal(payloadWatched.temporalState, 'T1');
    assert.equal(payloadWatched.cartela, 'Acessos de Łęczyca — noite de 9 para 10 de setembro');
    assert.equal(simWatch.horizon.temporalState, 'T1');
    assert.equal(simSkip.horizon.temporalState, 'T1');
    assert.equal(simWatch.flags['m02.transicao_tab_pronta'], true);
    assert.equal(simSkip.flags['m02.transicao_tab_pronta'], true);
  });
});
