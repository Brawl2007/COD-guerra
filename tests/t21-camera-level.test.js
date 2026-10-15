import test from 'node:test';
import assert from 'node:assert/strict';
import {levelCameraClosedLoop} from '../tools/t21-camera-level.mjs';

function delayedSimulation(initialPitch) {
  let pitch = initialPitch;
  let queued = 0;
  let waiting = false;
  const movements = [];
  const traceEntries = [];
  return {
    readPitch: async () => pitch,
    sendMovement: async delta => {
      assert.equal(waiting, false, 'must wait for previous frame before another mouse event');
      assert.ok(Math.abs(delta) <= 65, 'mouse input is bounded to avoid pitch clamp');
      waiting = true;
      queued += delta;
      movements.push(delta);
    },
    waitForChange: async () => {
      // Simulate four delayed browser frames before the input is consumed.
      for (let n=0;n<4;n++) await Promise.resolve();
      pitch = Math.max(-1.25, Math.min(1.25, pitch - queued*0.0022));
      queued = 0;
      waiting = false;
      return pitch;
    },
    trace: entry => traceEntries.push(entry),
    movements, traceEntries,
  };
}

test('level camera converges from lower pitch clamp with delayed frames', async () => {
  const sim = delayedSimulation(-1.25);
  const final = await levelCameraClosedLoop(sim);
  assert.ok(Math.abs(final) <= 0.18, String(final));
  assert.ok(sim.movements.length >= 8, 'must use small feedback-confirmed steps');
  assert.equal(sim.traceEntries.length, sim.movements.length);
  assert.ok(sim.traceEntries.every(entry => entry.status === 'confirmed'));
});

test('level camera converges from upper pitch clamp with delayed frames', async () => {
  const sim = delayedSimulation(1.25);
  const final = await levelCameraClosedLoop(sim);
  assert.ok(Math.abs(final) <= 0.18, String(final));
  assert.ok(sim.movements.every(delta => delta > 0));
});

test('no mouse event when camera is already level', async () => {
  const sim = delayedSimulation(0.024);
  const final = await levelCameraClosedLoop(sim);
  assert.equal(final, 0.024);
  assert.equal(sim.movements.length, 0);
});

test('missing or stale diagnostics fail visibly', async () => {
  const bad = delayedSimulation(NaN);
  await assert.rejects(() => levelCameraClosedLoop(bad), /diagnostics unavailable/);
  const stuck = delayedSimulation(-1.25);
  stuck.waitForChange = async () => { throw Error('simulated timeout'); };
  await assert.rejects(() => levelCameraClosedLoop(stuck), /input not confirmed/);
  assert.equal(stuck.traceEntries[0].status, 'no-confirmation');
});

test('incorrect input direction is rejected rather than retried in a queue', async () => {
  const sim = delayedSimulation(1.25);
  sim.waitForChange = async () => 1.25;
  await assert.rejects(() => levelCameraClosedLoop(sim), /did not move pitch towards level/);
  assert.equal(sim.movements.length, 1);
});

// Playwright pointer actions under pointer lock can inject trusted relative movement that the
// game also applies to pitch. Model: `stray` extra movementY lands in the same frame as our event.
function disturbedSimulation(initialPitch, strayPerAttempt) {
  let pitch = initialPitch, external = 0, attempts = 0, sent = 0;
  const traceEntries = [];
  return {
    readPitch: async () => pitch,
    readExternalLook: async () => external,
    sendMovement: async delta => { assert.ok(Math.abs(delta) <= 65); sent = delta; },
    waitForChange: async () => {
      const stray = strayPerAttempt[attempts++] ?? 0;
      external += stray;
      // our event and the foreign one are consumed together, clamped by the simulation
      pitch = Math.max(-1.25, Math.min(1.25, pitch - (sent + stray) * 0.0022));
      return pitch;
    },
    trace: entry => traceEntries.push(entry), traceEntries,
  };
}

test('foreign mouse input in the window is traced as disturbed and the loop still converges', async () => {
  const sim = disturbedSimulation(1.0008, [-300, 0]);   // first window pushes the view to the +1.25 clamp
  const final = await levelCameraClosedLoop(sim);
  assert.ok(Math.abs(final) <= 0.18, String(final));
  assert.equal(sim.traceEntries[0].status, 'disturbed');
  assert.equal(sim.traceEntries[0].after, 1.25);
  assert.ok(sim.traceEntries.slice(1).every(entry => entry.status === 'confirmed'));
});

test('without observed foreign input the wrong-direction check stays strict', async () => {
  const sim = disturbedSimulation(1.0008, [-300]);
  sim.readExternalLook = async () => 0;                  // nothing observed: must fail honestly
  await assert.rejects(() => levelCameraClosedLoop(sim), /did not move pitch towards level/);
});

test('endless foreign input fails visibly instead of looping forever', async () => {
  const sim = disturbedSimulation(1.25, Array(40).fill(-5));
  await assert.rejects(() => levelCameraClosedLoop(sim), /kept being disturbed|still not level/);
});
