import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  LOCOMOTIVE_PLACEMENT,
  TRAIN_963_ARRIVAL,
  trainArrivalOffset,
  trainX,
  isTrain963Visible,
  train963Kinematics,
  M01Locomotive,
} from '../src/render/m01-locomotive.js';
import {
  PANZERZUG_PLACEMENT,
  PANZERZUG_ARRIVAL,
  panzerzugArrivalOffset,
  panzerzugX,
  isPanzerzugVisible,
  panzerzugKinematics,
  M01Panzerzug,
} from '../src/render/m01-panzerzug.js';
import {
  M01_TRAIN_WAGON_PLAN,
  M01TrainWagons,
} from '../src/render/m01-train-wagons.js';
import {
  RAILWAY_PUFF_BUDGET,
  RAILWAY_SMOKE_ANCHOR_X,
  M01Atmosphere,
} from '../src/render/m01-atmosphere.js';
import { M01TrainLife, TRAIN_ARRIVALS, TRAIN_PUFF_CAP, TRAIN_HEADLAMP_OFFSET, trainX as lifeX } from '../src/render/m01-train-life.js';
import {
  SOUND_SPEED_MS,
  computeAcousticDelay,
  M01TrainAudioController,
} from '../src/audio/m01-train-audio.js';

test('T24.1 — trainX(battleClock) é estritamente monótono entre 04:43:30 e 04:45:00 e pára exatamente em x=1075', () => {
  assert.equal(TRAIN_963_ARRIVAL.startClock, 17010);
  assert.equal(TRAIN_963_ARRIVAL.stopClock, 17100);
  assert.equal(isTrain963Visible(17009, false), false);
  assert.equal(isTrain963Visible(17010, false), true);

  let prevX = trainX(17010);
  assert.equal(prevX, 1075 + 360);
  for (let clock = 17011; clock <= 17100; clock += 1) {
    const curX = trainX(clock);
    assert.ok(curX < prevX, `trainX(${clock})=${curX} deve ser menor que trainX(${clock - 1})=${prevX}`);
    prevX = curX;
  }
  assert.equal(trainX(17100), 1075);
  assert.equal(trainX(17500), 1075);
  assert.equal(trainArrivalOffset(17100), 0);
  assert.equal(trainArrivalOffset(null), 0);
});

test('T24.2 — panzerzugX(battleClock) é estritamente monótono entre 04:51:00 e 04:52:00 e pára exatamente em x=1119', () => {
  assert.equal(PANZERZUG_ARRIVAL.startClock, 17460);
  assert.equal(PANZERZUG_ARRIVAL.stopClock, 17520);
  assert.equal(isPanzerzugVisible(17459, false), false);
  assert.equal(isPanzerzugVisible(17460, false), true);

  let prevX = panzerzugX(17460);
  assert.equal(prevX, 1119 + 240);
  for (let clock = 17461; clock <= 17520; clock += 1) {
    const curX = panzerzugX(clock);
    assert.ok(curX < prevX, `panzerzugX(${clock})=${curX} deve ser menor que panzerzugX(${clock - 1})=${prevX}`);
    prevX = curX;
  }
  assert.equal(panzerzugX(17520), 1119);
  assert.equal(panzerzugArrivalOffset(17520), 0);
  assert.equal(panzerzugArrivalOffset(null), 0);
});

test('T24.3 — 65 vagões autoritativos preservados e deslocamento de chegada idempotente às 04:44:30 e 04:46:00', () => {
  assert.equal(M01_TRAIN_WAGON_PLAN.length, 65);
  assert.equal(M01_TRAIN_WAGON_PLAN[0].id, 'train963_wagon_01');
  assert.equal(M01_TRAIN_WAGON_PLAN[0].x, 1090);
  assert.equal(M01_TRAIN_WAGON_PLAN[64].id, 'train963_wagon_65');
  assert.equal(M01_TRAIN_WAGON_PLAN[64].x, 1090 + 64 * 9.1);

  const parent = new THREE.Group();
  const box = new THREE.BoxGeometry();
  const cyl = new THREE.CylinderGeometry();
  const mat = new THREE.MeshStandardMaterial();
  const wagons = new M01TrainWagons(parent, { load: async () => null }, box, cyl, mat, mat);

  // Continuação às 04:44:30 (17070 s): comboio ainda em chegada (offset = 40 m)
  wagons.update({ x: -320, z: 20 }, 'high', 17070);
  assert.equal(wagons.group.position.x, 40);
  assert.equal(wagons.diagnostics.arrivalOffset, 40);

  // Continuação às 04:46:00 (17160 s): comboio parado na posição autoritativa exata (offset = 0)
  wagons.update({ x: -320, z: 20 }, 'high', 17160);
  assert.equal(wagons.group.position.x, 0);
  assert.equal(wagons.diagnostics.arrivalOffset, 0);

  // Chamada sem battleClock (compatibilidade com tests/m01-train-consist-polish.test.js)
  wagons.update({ x: -320, z: 20 }, 'high');
  assert.equal(wagons.group.position.x, 0);
});

test('T24.4 — Lanterna frontal fog:false, fornalha ativa e rotação de rodas em M01Locomotive e M01Panzerzug', () => {
  const parent = new THREE.Group();
  const box = new THREE.BoxGeometry();
  const cyl = new THREE.CylinderGeometry();
  const mat = new THREE.MeshStandardMaterial();

  const loco = new M01Locomotive(parent, { load: async () => null }, box, cyl, mat, mat);
  loco.update({ x: -320, z: 20 }, 17070, false);
  assert.equal(loco.diagnostics.headlampFogFree, true);
  assert.equal(loco.diagnostics.fireboxActive, true);
  assert.equal(loco.diagnostics.motion, 'arriving_decelerating');
  assert.equal(loco.root.position.x, 1115);

  loco.update({ x: -320, z: 20 }, 17100, true);
  assert.equal(loco.diagnostics.motion, 'stationary');
  assert.equal(loco.root.position.x, 1075);

  const pz = new M01Panzerzug(parent, { load: async () => null }, box, cyl, mat);
  pz.update({ x: -320, z: 20 }, 17490, false);
  assert.equal(pz.diagnostics.headlampFogFree, true);
  assert.equal(pz.diagnostics.motion, 'arriving_decelerating');
  assert.equal(pz.root.position.x, 1179);

  pz.update({ x: -320, z: 20 }, 17520, true);
  assert.equal(pz.diagnostics.motion, 'stationary');
  assert.equal(pz.root.position.x, 1119);
});

// The puff/cloud textures need a canvas; the headless stub mirrors tests/m01-atmosphere-runtime.test.js.
function withCanvasStub(fn){
  const original=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})};
  try{return fn();}finally{globalThis.document=original;}
}

test('T24.5 — Pool de fumo/vapor ferroviário em M01Atmosphere respeita os tectos estritos 12 / 18 / 24', () => withCanvasStub(() => {
  const scene = new THREE.Group();
  const atmo = new M01Atmosphere(scene);
  const state = { battleClock: 17495, train963: true, panzerzug: true, damage: [] };
  try {
    for (const [quality, budget] of [['low', 12], ['medium', 18], ['high', 24]]) {
      assert.equal(RAILWAY_PUFF_BUDGET[quality], budget);
      atmo.update(state, 1295, quality);
      assert.equal(atmo.diagnostics.railwayBudget, budget);
      assert.equal(atmo.diagnostics.railwayPuffs, budget);
      assert.equal(atmo.count, budget);
      assert.equal(atmo.diagnostics.puffBatches, 1, 'railway smoke reuses the existing puff pool: no extra draw call');
    }
  } finally { atmo.dispose(); }
}));

test('T24.5b — West stopped-shunting column sits at x=-292,z=-18; the pool stays bounded with heavy damage; bare fixtures are unchanged', () => withCanvasStub(() => {
  const atmo = new M01Atmosphere(new THREE.Group());
  const read = () => ({ count: atmo.count, m: Array.from(atmo.puffs.instanceMatrix.array.slice(0, atmo.count * 16)) });
  try {
    // Before 04:43:30 and with no sim flags only the west column is alive (2 puffs), far from the trains.
    atmo.update({ battleClock: 16200, damage: [] }, 10, 'medium');
    assert.equal(atmo.diagnostics.railwayPuffs, 2);
    const { m } = read();
    for (let i = 0; i < 2; i++) {
      assert.ok(Math.abs(m[i * 16 + 12] + 292) < 12, 'puff x near -292');
      assert.ok(Math.abs(m[i * 16 + 14] + 18) < 6, 'puff z near -18');
    }
    // 30 demolition columns fill the pool; railway puffs still fit inside the 256 capacity.
    const damage = Array.from({ length: 30 }, (_, i) => ({ id: `${i}_demolition`, smokeVisible: true, started: 10, x: i * 10, y: 0, z: 0 }));
    atmo.update({ battleClock: 17495, train963: true, panzerzug: true, damage }, 11, 'high');
    assert.equal(atmo.count, 256);
    assert.equal(atmo.diagnostics.railwayPuffs, 24);
    // Presentation is deterministic for the same state and clock.
    const a = read(); atmo.update({ battleClock: 17495, train963: true, panzerzug: true, damage }, 11, 'high'); assert.deepEqual(read(), a);
    // A bare damage fixture (no battleClock) emits no railway puff at all, so existing damage presentation is bit-identical.
    atmo.update({ damage: damage.slice(0, 1) }, 11, 'high');
    assert.equal(atmo.diagnostics.railwayPuffs, 0);
  } finally { atmo.dispose(); }
}));

test('T24.6 — Eventos sonoros veh.train.* respeitam o atraso acústico físico (distance / 343 m/s)', () => {
  const delayInfo = computeAcousticDelay(1075, -2.5, { x: -320, z: 20 });
  assert.ok(delayInfo.distanceM > 1390 && delayInfo.distanceM < 1400);
  assert.ok(delayInfo.delaySec > 4.0 && delayInfo.delaySec < 4.15);

  const emitted = [];
  const controller = new M01TrainAudioController({
    audio: { emit: (id, cue) => emitted.push({ id, cue }) },
  });

  // Às 04:43:32 (17012 s) o comboio apita a ~1,7 km; o som ainda está em propagação acústica
  controller.update(17012, { x: -320, z: 20 });
  assert.ok(controller.diagnostics.queued >= 2);
  assert.equal(emitted.length, 0);

  // 6 segundos depois (17018 s), a frente de onda sonora já chegou à margem oeste
  controller.update(17018, { x: -320, z: 20 });
  assert.ok(emitted.some((e) => e.id === 'veh.train.approach'));
  assert.ok(emitted.some((e) => e.id === 'veh.train.whistle'));
});

test('T24.7 — Simulation flags still force visibility; the arrival clock only adds earlier visibility (sim authority preserved)', () => {
  assert.equal(isTrain963Visible(16000, true), true);
  assert.equal(isTrain963Visible(16000, false), false);
  assert.equal(isTrain963Visible(17010, false), true);
  assert.equal(isPanzerzugVisible(17000, true), true);
  assert.equal(isPanzerzugVisible(17000, false), false);
  const k = train963Kinematics(17010, false);
  assert.equal(k.x, 1435);
  assert.equal(k.arriving, true);
  const stopped = train963Kinematics(17100, true);
  assert.equal(stopped.stopped, true);
  assert.equal(stopped.speed, 0);
  assert.equal(panzerzugKinematics(17460, false).x, 1359);
  assert.equal(panzerzugKinematics(17520, true).x, 1119);
  assert.deepEqual(LOCOMOTIVE_PLACEMENT.position, [1075, 0, -2.5]);
  assert.deepEqual(PANZERZUG_PLACEMENT.position, [1119, 0, 2.5]);
});

test('T24.8 — Lighting fixtures are one merged mesh each, fog-free, and release their GPU resources on dispose', () => {
  const parent = new THREE.Group();
  const box = new THREE.BoxGeometry(), cyl = new THREE.CylinderGeometry(), mat = new THREE.MeshStandardMaterial();
  const loco = new M01Locomotive(parent, { load: async () => null }, box, cyl, mat, mat);
  const pz = new M01Panzerzug(parent, { load: async () => null }, box, cyl, mat);
  assert.equal(loco.lightingFixture.isMesh, true);
  assert.equal(loco.lightingFixture.material.fog, false);
  assert.ok(loco.lightingFixture.geometry.attributes.color, 'vertex colours carry lamps/firebox/brake glow in one draw call');
  assert.equal(pz.lampFixture.material.fog, false);
  // The dawn beam widens away from the lamp and fades out: faint near the lens, nothing at its far end (the source had it inverted and opaque).
  const col = loco.lightingFixture.geometry.attributes.color, pos = loco.lightingFixture.geometry.attributes.position;
  assert.equal(col.itemSize, 4);
  let nearA = 0, farA = 1, beamSeen = false;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    if (z < -8.3 && pos.getY(i) > 0 && col.getW(i) < 0.5 && Math.abs(col.getX(i) - 0.62) < 1e-6) { beamSeen = true; if (z > -8.4) nearA = Math.max(nearA, col.getW(i)); if (z < -23.5) farA = Math.min(farA, col.getW(i)); }
  }
  assert.ok(beamSeen && nearA > 0.1 && nearA <= 0.2001 && farA < 0.01, `beam alpha near ${nearA} far ${farA}`);
  let disposed = 0;
  loco.lightingFixture.geometry.addEventListener('dispose', () => disposed++);
  pz.lampFixture.geometry.addEventListener('dispose', () => disposed++);
  loco.dispose(); pz.dispose();
  assert.equal(disposed, 2);
  assert.equal(loco.lightingFixture.parent, null);
  // Without a clock the locomotive and Panzerzug stay exactly on their authoritative anchors (pre-T24 behaviour).
  const l2 = new M01Locomotive(parent, { load: async () => null }, box, cyl, mat, mat); l2.update({ x: 0, z: 0 });
  assert.deepEqual(l2.root.position.toArray(), [1075, 0, -2.5]); l2.dispose();
  const p2 = new M01Panzerzug(parent, { load: async () => null }, box, cyl, mat); p2.update({ x: 0, z: 0 });
  assert.deepEqual(p2.root.position.toArray(), [1119, 0, 2.5]); p2.dispose();
});

test('T24.9 — Reconciliation with the partials M01TrainLife: one canonical curve, one transform owner per train, one puff cap', () => withCanvasStub(() => {
  assert.equal(TRAIN_PUFF_CAP, RAILWAY_PUFF_BUDGET, 'a single puff-cap constant (aliased), not two copies');
  assert.deepEqual(TRAIN_ARRIVALS.train963, { from: 17010, until: 17100, distance: 360, finalX: 1075, z: -2.5 });
  assert.deepEqual(TRAIN_ARRIVALS.panzerzug, { from: 17460, until: 17520, distance: 240, finalX: 1119, z: 2.5 });
  const scene = new THREE.Scene(), train = new THREE.Group(), pzParent = new THREE.Group(); scene.add(train, pzParent);
  const box = new THREE.BoxGeometry(), cyl = new THREE.CylinderGeometry(), mat = new THREE.MeshStandardMaterial(), assets = { load: async () => null };
  const loco = new M01Locomotive(train, assets, box, cyl, mat, mat), wagons = new M01TrainWagons(train, assets, box, cyl, mat, mat);
  const pz = new M01Panzerzug(pzParent, assets, box, cyl, mat), life = new M01TrainLife(train, pzParent), player = { x: -320, z: 20 };
  const world = o => { scene.updateMatrixWorld(true); return new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).x; };
  for (const clock of [17009, 17010, 17040, 17070, 17099.5, 17100, 17460, 17490, 17520, 18000]) {
    life.update(clock, { train963: false, panzerzug: false }); wagons.update(player, 'high', clock); loco.update(player, clock, false); pz.update(player, clock, false);
    assert.equal(train.position.x, 0, 'the 963 parent group never moves (no double offset)');
    assert.equal(pzParent.position.x, 0, 'the Panzerzug parent group never moves (no double offset)');
    assert.equal(world(loco.root), lifeX(clock, 'train963'), `locomotive world x at ${clock}`);
    assert.equal(world(loco.root), trainX(clock));
    assert.equal(world(wagons.group), trainArrivalOffset(clock), 'wagons travel exactly once with the engine');
    assert.equal(world(pz.root), lifeX(clock, 'panzerzug'));
    assert.ok(Math.abs(world(life.lamps[0]) - (world(loco.root) + TRAIN_HEADLAMP_OFFSET)) < 1e-9, '1 km halo stays in front of the moving engine');
    assert.ok(Math.abs(world(life.lamps[1]) - (world(pz.root) + TRAIN_HEADLAMP_OFFSET)) < 1e-9);
    assert.equal(life.sources[0].x, trainX(clock) + RAILWAY_SMOKE_ANCHOR_X.train963);
    assert.equal(life.sources[1].x, panzerzugX(clock) + RAILWAY_SMOKE_ANCHOR_X.panzerzug);
    assert.equal(train.visible, isTrain963Visible(clock, false)); assert.equal(pzParent.visible, isPanzerzugVisible(clock, false));
    assert.equal(life.diagnostics.trains[0].offset, trainArrivalOffset(clock));
  }
  // Authoritative flags still force visibility before the presentation clock (restored saves, skipped segments).
  life.update(16300, { train963: true, panzerzug: true }); assert.equal(train.visible, true); assert.equal(pzParent.visible, true);
  life.update(16300, {}); assert.equal(train.visible, false); assert.equal(pzParent.visible, false);
  // The train-life sources gate the single railway emitter: inactive sources leave only the west shunting column.
  const atmo = new M01Atmosphere(new THREE.Group());
  try {
    atmo.update({ battleClock: 16300, damage: [] }, 10, 'high', { trainSources: life.sources });
    assert.equal(atmo.diagnostics.railwayPuffs, 2); assert.equal(atmo.diagnostics.trainPuffs, 0);
    life.update(17495, {});
    atmo.update({ battleClock: 17495, damage: [] }, 11, 'high', { trainSources: life.sources });
    assert.equal(atmo.diagnostics.railwayPuffs, 24); assert.equal(atmo.diagnostics.trainPuffs, 22);
    atmo.update({ battleClock: 17495, damage: [] }, 11, 'high', { trainSources: life.sources, railwaySmoke: false });
    assert.equal(atmo.diagnostics.railwayPuffs, 0); assert.equal(atmo.diagnostics.trainPuffs, 0);
  } finally { atmo.dispose(); }
  life.dispose(); loco.dispose(); pz.dispose(); wagons.dispose();
}));

test('T24.10 — Exactly one lamp mesh per train is drawn: the near merged fixture or the far 1 km halo (hysteresis), never both', () => {
  const scene = new THREE.Scene(), train = new THREE.Group(), pzParent = new THREE.Group(); scene.add(train, pzParent);
  const box = new THREE.BoxGeometry(), cyl = new THREE.CylinderGeometry(), mat = new THREE.MeshStandardMaterial(), assets = { load: async () => null };
  const loco = new M01Locomotive(train, assets, box, cyl, mat, mat), pz = new M01Panzerzug(pzParent, assets, box, cyl, mat);
  const life = new M01TrainLife(train, pzParent, { fixtures: [loco.lightingFixture, pz.lampFixture] }), camera = new THREE.PerspectiveCamera();
  const drawn = () => [[life.lamps[0].visible, loco.lightingFixture.visible], [life.lamps[1].visible, pz.lampFixture.visible]];
  life.update(17100, {}); loco.update({ x: 0, z: 0 }, 17100, true); pz.update({ x: 0, z: 0 }, 17520, true); life.update(17520, {});
  camera.position.set(1061, 2, 3.5); life.beginFrame(camera);   // the close front shot: both engines within ~60 m
  assert.deepEqual(drawn(), [[false, true], [false, true]]);
  assert.deepEqual(life.diagnostics.trains.map(t => [t.headlamp, t.lampArt]), [[true, 'fixture_near'], [true, 'fixture_near']]);
  camera.position.set(1066.35 - 150, 2, -2.5); life.beginFrame(camera);   // inside the hysteresis band: stays near
  assert.deepEqual(drawn()[0], [false, true]);
  camera.position.set(75, 35, -90); life.beginFrame(camera);   // ~1 km (partials browser pose): only the fog-free halo
  assert.deepEqual(drawn(), [[true, false], [true, false]]);
  camera.position.set(1066.35 - 150, 2, -2.5); life.beginFrame(camera);   // hysteresis: stays far until < 140 m
  assert.deepEqual(drawn()[0], [true, false]);
  life.lampsEnabled = false; life.beginFrame(camera);   // debug A/B "lamp off" hides every lamp mesh
  assert.deepEqual(drawn(), [[false, false], [false, false]]);
  assert.equal(life.diagnostics.trains[0].headlamp, false);
  life.dispose(); assert.equal(loco.lightingFixture.visible, true); loco.dispose(); pz.dispose();
});
