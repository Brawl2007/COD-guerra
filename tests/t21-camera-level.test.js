import test from 'node:test';
import assert from 'node:assert/strict';
import {levelCameraClosedLoop} from '../tools/t21-camera-level.mjs';

function delayedSimulation(initialPitch) {
  let pitch = initialPitch;
  let queued = 0;
  let waiting = false;
  const movements = [];
  const trace = [];
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
    trace: entry => trace.push(entry),
    movements, trace,
  };
}

test('level camera converges from lower pitch clamp with delayed frames', async () => {
  const sim = delayedSimulation(-1.25);
  const final = await levelCameraClosedLoop(sim);
  assert.ok(Math.abs(final) <= 0.18, String(final));
  assert.ok(sim.movements.length >= 8, 'must use small feedback-confirmed steps');
  assert.equal(sim.trace.length, sim.movements.length);
  assert.ok(sim.trace.every(entry => entry.status === 'confirmed'));
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
  assert.equal(stuck.trace[0].status, 'no-confirmation');
});

test('incorrect input direction is rejected rather than retried in a queue', async () => {
  const sim = delayedSimulation(1.25);
  sim.waitForChange = async () => 1.25;
  await assert.rejects(() => levelCameraClosedLoop(sim), /did not move pitch towards level/);
  assert.equal(sim.movements.length, 1);
});
