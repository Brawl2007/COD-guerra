import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTIONS,
  ORDERS,
  CoverReservations,
  applySuppression,
  canHelpWounded,
  canThrowGrenade,
  chooseCover,
  chooseGrenadeEvadePoint,
  chooseRetreatPoint,
  createPrototypeScenario,
  createSuppression,
  createThreatMemory,
  decayThreatMemory,
  decideImmediateAction,
  formationOffset,
  friendlyFireClear,
  observeThreat,
  protectionFromThreat,
  routeClear,
  runPrototypeTimeline,
  shouldFlank,
  stepToward,
  updateSuppression,
} from '../tools/verification/m01-combat-ai-prototype.mjs';

test('last known position does not magically track an invisible target', () => {
  let memory = observeThreat(createThreatMemory(), {
    kind: 'VISION', sourceId: 'player', perceivedPosition: { x: 10, z: 0 }, observedAt: 0, confidence: 1,
  });
  const hiddenGroundTruth = { x: 30, z: 0 };
  void hiddenGroundTruth;
  memory = decayThreatMemory(memory, 2);
  assert.deepEqual(memory.lastKnownPosition, { x: 10, z: 0 });
  assert.ok(memory.confidence < 1 && memory.confidence > 0);
});

test('cover protection is directional', () => {
  const node = { position: { x: 0, z: 0 }, protectionDirections: [{ x: 1, z: 0 }] };
  assert.ok(protectionFromThreat(node, { x: 10, z: 0 }) > .99);
  assert.equal(protectionFromThreat(node, { x: -10, z: 0 }), 0);
});

test('cover reservation prevents duplicate occupancy and expires', () => {
  const reservations = new CoverReservations();
  const node = { id: 'c', capacity: 1 };
  assert.ok(reservations.reserve(node, 'a', 0, 2));
  assert.equal(reservations.reserve(node, 'b', 1, 2), null);
  assert.ok(reservations.reserve(node, 'b', 2.01, 2));
  assert.deepEqual(reservations.owners('c', 2.01), ['b']);
});

test('suppression accumulates and retains source direction', () => {
  let state = createSuppression(0);
  state = applySuppression(state, { kind: 'NEAR_MISS', sourceDirection: { x: 1, z: 0 } }, .1);
  state = applySuppression(state, { kind: 'CLOSE_BURST', sourceDirection: { x: 1, z: 0 } }, .2);
  assert.ok(state.intensity > .5);
  assert.ok(state.sourceDirection.x > .99);
  assert.equal(state.suppressed, true);
});

test('suppression decays deterministically without new fire', () => {
  let state = createSuppression(0);
  state = applySuppression(state, { amount: .8, sourceDirection: { x: 1, z: 0 } }, 0);
  const a = updateSuppression(state, 2);
  const b = updateSuppression(state, 2);
  assert.deepEqual(a, b);
  assert.ok(a.intensity < state.intensity);
});

test('pinned uses hysteresis and recovers', () => {
  let state = createSuppression(0);
  state = applySuppression(state, { amount: .8 }, 0);
  assert.equal(state.pinned, true);
  assert.equal(updateSuppression(state, 1).pinned, true);
  assert.equal(updateSuppression(state, 4).pinned, false);
});

test('empty magazine prefers reload in cover and cover-seeking while exposed', () => {
  const scenario = createPrototypeScenario();
  const memory = observeThreat(createThreatMemory(), {
    kind: 'VISION', sourceId: 'e', perceivedPosition: { x: 18, z: 0 }, observedAt: 0, confidence: 1,
  });
  const base = {
    order: { type: ORDERS.HOLD, anchor: { x: -8, z: 0 }, radius: 20 },
    covers: scenario.covers, walls: [], allies: [], now: 0, threatMemory: memory,
    suppression: createSuppression(0), ammo: { mag: 0 },
  };
  assert.equal(decideImmediateAction({ ...base, actor: { ...scenario.allies[1], inCover: true } }).action, ACTIONS.RELOAD);
  assert.equal(decideImmediateAction({ ...base, actor: { ...scenario.allies[1], inCover: false } }).action, ACTIONS.SEEK_COVER);
});

test('flank requires permission, confidence, allies, route and tolerable exposure', () => {
  const actor = { id: 'a', x: 0, z: 0, alive: true };
  const memory = observeThreat(createThreatMemory(), { kind: 'VISION', perceivedPosition: { x: 10, z: 0 }, observedAt: 0, confidence: 1 });
  const allies = [{ alive: true }, { alive: true }];
  const route = [{ x: 0, z: 0 }, { x: 0, z: 5 }, { x: 6, z: 5 }];
  assert.equal(shouldFlank({ actor, order: { type: ORDERS.HOLD }, memory, allies, route, exposure: .2 }), false);
  assert.equal(shouldFlank({ actor, order: { type: ORDERS.ADVANCE }, memory, allies, route, exposure: .2 }), true);
  assert.equal(shouldFlank({ actor, order: { type: ORDERS.ADVANCE }, memory, allies, route, exposure: .9 }), false);
  assert.equal(shouldFlank({ actor, order: { type: ORDERS.ADVANCE }, memory, allies, route, exposure: .2, walls: [{ minX: -.2, maxX: .2, minZ: 2, maxZ: 3 }] }), false);
});

test('grenade reaction chooses reachable cover outside blast radius', () => {
  const actor = { id: 'a', x: 0, z: 0, alive: true, speed: 5 };
  const grenade = { x: 2, z: 0, fuse: 3, blastRadius: 3 };
  const covers = [
    { id: 'bad', position: { x: 4, z: 0 }, protectionDirections: [{ x: -1, z: 0 }] },
    { id: 'good', position: { x: -6, z: 0 }, protectionDirections: [{ x: 1, z: 0 }] },
  ];
  assert.equal(chooseGrenadeEvadePoint(actor, grenade, covers, { walls: [], speed: 5 })?.id, 'good');
});

test('grenade throw is rejected when an ally is in blast area', () => {
  const actor = { id: 'a', x: 0, z: 0, alive: true };
  const target = { x: 12, z: 0 };
  assert.equal(canThrowGrenade({ actor, target, allies: [{ id: 'b', x: 13, z: 0, alive: true }] }), false);
  assert.equal(canThrowGrenade({ actor, target, allies: [{ id: 'b', x: -10, z: 0, alive: true }] }), true);
});

test('retreat selects a plausible point away from threat and near rally', () => {
  const actor = { x: 0, z: 0 };
  const threat = { x: 10, z: 0 };
  const result = chooseRetreatPoint(actor, threat, [
    { id: 'east', x: 5, z: 0, exposure: .7 },
    { id: 'west', x: -12, z: 0, exposure: .1, cover: true },
  ], { rally: { x: -15, z: 0 }, friendlyAnchors: [{ x: -14, z: 1 }] });
  assert.equal(result.id, 'west');
});

test('formation spacing is deterministic and not identical for a squad', () => {
  const a = formationOffset(42, 'sq', 'a', 0);
  assert.deepEqual(a, formationOffset(42, 'sq', 'a', 0));
  const offsets = ['a', 'b', 'c', 'd'].map((id, i) => formationOffset(42, 'sq', id, i));
  assert.ok(new Set(offsets.map(x => `${x.lateral}:${x.longitudinal}`)).size > 1);
});

test('same seed and inputs produce the same prototype timeline', () => {
  assert.deepEqual(runPrototypeTimeline(99), runPrototypeTimeline(99));
});

test('camera does not affect decisions', () => {
  const scenario = createPrototypeScenario();
  const memory = observeThreat(createThreatMemory(), { kind: 'VISION', perceivedPosition: { x: 18, z: 0 }, observedAt: 0, confidence: 1 });
  const common = {
    actor: scenario.allies[1], order: { type: ORDERS.HOLD, anchor: { x: -8, z: 0 }, radius: 20 },
    covers: scenario.covers, walls: [], allies: [], now: 0, threatMemory: memory,
    suppression: createSuppression(0), ammo: { mag: 5 },
  };
  assert.deepEqual(
    decideImmediateAction({ ...common, camera: { x: 0, z: 0, yaw: 0 } }),
    decideImmediateAction({ ...common, camera: { x: 999, z: 999, yaw: 3 } }),
  );
});

test('quality does not affect decisions', () => {
  const scenario = createPrototypeScenario();
  const memory = observeThreat(createThreatMemory(), { kind: 'VISION', perceivedPosition: { x: 18, z: 0 }, observedAt: 0, confidence: 1 });
  const common = {
    actor: scenario.allies[1], order: { type: ORDERS.HOLD, anchor: { x: -8, z: 0 }, radius: 20 },
    covers: scenario.covers, walls: [], allies: [], now: 0, threatMemory: memory,
    suppression: createSuppression(0), ammo: { mag: 5 },
  };
  const decisions = ['LOW', 'MEDIUM', 'HIGH'].map(quality => decideImmediateAction({ ...common, quality }));
  assert.deepEqual(decisions[0], decisions[1]);
  assert.deepEqual(decisions[1], decisions[2]);
});

test('different actors cannot reserve the same single-capacity cover', () => {
  const reservations = new CoverReservations();
  const node = { id: 'single', capacity: 1 };
  assert.ok(reservations.reserve(node, 'a', 0));
  assert.equal(reservations.reserve(node, 'b', 0), null);
  assert.deepEqual(reservations.owners('single', 0), ['a']);
});

test('movement step never crosses a wall rectangle', () => {
  const wall = { minX: 2, maxX: 3, minZ: -1, maxZ: 1 };
  const actor = { id: 'a', x: 0, z: 0 };
  assert.equal(routeClear(actor, { x: 4, z: 0 }, [wall]), false);
  assert.deepEqual(stepToward(actor, { x: 4, z: 0 }, 1, 4, [wall]), actor);
});

test('friendly fire corridor blocks a shot through a squadmate', () => {
  const shooter = { id: 'a', x: 0, z: 0, alive: true };
  const target = { x: 10, z: 0 };
  assert.equal(friendlyFireClear(shooter, target, [{ id: 'b', x: 5, z: .1, alive: true }]), false);
  assert.equal(friendlyFireClear(shooter, target, [{ id: 'b', x: 5, z: 2, alive: true }]), true);
});

test('wounded help is gated by risk, squad firepower and route', () => {
  const helper = { id: 'm', x: 0, z: 0, alive: true };
  const casualty = { id: 'c', x: 5, z: 0, alive: true, healthState: 'INCAPACITATED' };
  const order = { type: ORDERS.HOLD };
  assert.equal(canHelpWounded({ helper, casualty, order, risk: .3, squadFirepower: 2 }), true);
  assert.equal(canHelpWounded({ helper, casualty, order, risk: .8, squadFirepower: 2 }), false);
  assert.equal(canHelpWounded({ helper, casualty, order, risk: .3, squadFirepower: 0 }), false);
});

test('cover choice respects order radius and route obstruction', () => {
  const actor = { id: 'a', x: 0, z: 0, role: 'RIFLEMAN' };
  const nodes = [
    { id: 'outside', position: { x: 30, z: 0 }, protectionDirections: [{ x: 1, z: 0 }] },
    { id: 'blocked', position: { x: 5, z: 0 }, protectionDirections: [{ x: 1, z: 0 }] },
    { id: 'valid', position: { x: 0, z: 5 }, protectionDirections: [{ x: 1, z: 0 }] },
  ];
  const order = { type: ORDERS.HOLD, anchor: { x: 0, z: 0 }, radius: 10 };
  const walls = [{ minX: 2, maxX: 3, minZ: -.5, maxZ: .5 }];
  assert.equal(chooseCover(actor, nodes, { x: 10, z: 0 }, { order, walls, allies: [] })?.id, 'valid');
});

test('prototype timeline demonstrates contact cover suppress movement reload and retreat',()=>{
  const actions=runPrototypeTimeline().map(step=>step.action);
  assert.deepEqual(actions,['MOVE_TO_COVER','SUPPRESS','MOVE_TO_COVER','PINNED','RELOAD','SHORT_WITHDRAW']);
});
