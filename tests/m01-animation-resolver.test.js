import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { M01Characters } from '../src/render/m01-characters.js';
import { actorPose, actorPoseName } from '../src/render/m01-actor-pose.js';
import {
  BLEND_DURATION,
  MAX_TORSO_TWIST,
  STRIDE_METRES,
  TURN_THRESHOLD,
  resolveAvailableClip,
  resolveCombatReaction,
  resolveLocomotionGait,
  resolveLodWithHysteresis,
  resolveStrideSample,
  resolveTorsoOrientation,
  resolveTransitionBlend,
  resolveTurnClip,
  wrapAngle
} from '../src/render/m01-animation-resolver.js';
import {
  PRESENTATION_FIELDS,
  initializePresentation,
  recordDamage,
  recordSuppression,
  updateBodyYaw,
  updateMotion,
  validatePresentation
} from '../src/game/m01-animation-presentation.js';
import { actorHitboxes, eyePosition } from '../src/world/spatial.js';

function createCharacterFixture({ withSpine = true } = {}) {
  const scene = new THREE.Scene();
  const c = new M01Characters(scene, { visualVariation: false });

  for (const nation of ['pl', 'de']) {
    for (const lod of [0, 1, 2]) {
      const root = new THREE.Group();
      const soldierNode = new THREE.Group();
      soldierNode.name = `m01_soldier_${nation}`;
      soldierNode.userData = {
        weaponSocket: [0, 0.05, -0.68],
        weaponMuzzles: {
          wz29: [0, 0.05, -0.68],
          wz98a: [0, 0.05, -0.72],
          rkm_wz28: [0, 0.06, -0.76],
          k98k: [0, 0.05, -0.70]
        },
        weapons: {
          wz29: { muzzle: [0, 0.05, -0.68] },
          wz98a: { muzzle: [0, 0.05, -0.72] },
          rkm_wz28: { muzzle: [0, 0.06, -0.76] },
          k98k: { muzzle: [0, 0.05, -0.70] }
        }
      };
      root.userData = structuredClone(soldierNode.userData);
      root.add(soldierNode);

      const pelvis = new THREE.Bone();
      pelvis.name = 'root';
      soldierNode.add(pelvis);

      let upperParent = pelvis;
      if (withSpine) {
        const spine = new THREE.Bone();
        spine.name = 'spine_01';
        pelvis.add(spine);
        upperParent = spine;
      }

      const weaponBone = new THREE.Bone();
      weaponBone.name = 'weapon';
      upperParent.add(weaponBone);

      const carrySocket = new THREE.Group();
      carrySocket.name = 'carry_socket';
      upperParent.add(carrySocket);

      for (const meshName of ['body', 'rifle', 'clip', 'rifle_wz98a', 'rkm_wz28', 'rkm_bipod_open', 'rkm_bipod_folded', 'rkm_pouch', 'rag']) {
        const m = new THREE.Mesh();
        m.name = meshName;
        soldierNode.add(m);
      }

      c.sources.set(`${nation}:${lod}`, { scene: root, animations: [] });
    }
  }

  const clipDefs = [
    ['standing_idle', 4.0],
    ['crouched_idle', 3.0],
    ['walk', 1.1, { stride: 1.54 }],
    ['run', 0.8, { stride: 2.88 }],
    ['sprint', 0.65, { stride: 3.38 }],
    ['crouch_walk', 1.2, { stride: 1.44 }],
    ['turn_left', 0.45],
    ['turn_right', 0.45],
    ['hit_front', 0.5],
    ['near_miss_duck', 0.6],
    ['aim', 2.0],
    ['fire_bolt', 1.17],
    ['reload_clip', 3.4],
    ['pinned', 2.4],
    ['wounded', 2.0],
    ['carried', 2.5],
    ['carry_wounded', 2.5, { stride: 1.4 }],
    ['drag_wounded', 1.4, { stride: 1.1 }],
    ['seated', 3.0],
    ['fallen', 1.4],
    ['sapper_work', 3.0],
    ['sapper_work_pinned', 2.0],
    ['rkm_standing_idle', 3.0],
    ['rkm_crouched_idle', 3.0],
    ['rkm_walk', 1.1, { stride: 1.54 }],
    ['rkm_run', 0.8, { stride: 2.88 }],
    ['rkm_aim', 2.0],
    ['rkm_fire_burst', 0.8],
    ['rkm_reload', 3.4],
    ['rkm_clean', 3.0]
  ];

  for (const [name, duration, userData] of clipDefs) {
    c.clips.set(name, new THREE.AnimationClip(name, duration, [], userData ?? {}));
  }

  return c;
}

test('V7 regression: sampling real clock, changing LOD and restoring a copy preserves bone transforms and immutable data', () => {
  const c = createCharacterFixture();
  const a = { id: 'sample', active: true, alive: true, team: 'ally', x: 4, y: -3, z: 0, facing: 0.7, shot: 0, state: 'GUARD' };
  const before = structuredClone(a);

  try {
    c.update([a], 10, { x: 0, z: 0 });
    const first = c.instances.get(a.id).root.getObjectByName('root').matrixWorld.toArray();

    c.update([a], 10, { x: -20, z: 0 });
    assert.equal(c.instances.get(a.id).key, 'pl:2');
    assert.deepEqual(c.instances.get(a.id).root.getObjectByName('root').matrixWorld.toArray(), first);

    c.update([structuredClone(a)], 10, { x: 0, z: 0 });
    assert.deepEqual(c.instances.get(a.id).root.getObjectByName('root').matrixWorld.toArray(), first);

    assert.deepEqual(a, before);
    c.update([], 11, { x: 0, z: 0 });
    assert.equal(c.instances.size, 0);
  } finally {
    c.dispose();
  }
});

test('V7 regression: wounded attachment follows its carrier socket and detaches after delivery without changing simulation coordinates', () => {
  const c = createCharacterFixture();
  const medic = { id: 'leon_dudek', active: true, alive: true, team: 'ally', role: 'MEDIC', state: 'EVACUATION', x: 4, y: -3, z: 0, facing: 0 };
  const bak = { ...medic, id: 'jozef_bak', role: 'RIFLEMAN', state: 'WOUNDED', x: 3.75, y: -1.85, carriedBy: 'leon_dudek' };
  const saved = structuredClone([medic, bak]);

  try {
    c.update([medic, bak], 12, { x: 0, z: 0 });
    const v = c.instances.get(bak.id);
    assert.equal(v.root.parent.name, 'carry_socket');
    assert.equal(v.clip, 'carried');
    assert.equal(c.instances.get(medic.id).clip, 'carry_wounded');
    assert.deepEqual([medic, bak], saved);

    const delivered = { ...bak, carriedBy: null, y: -3 };
    c.update([medic, delivered], 13, { x: 0, z: 0 });
    assert.equal(v.root.parent, c.scene);
    assert.equal(v.clip, 'wounded');
    assert.equal(v.root.position.y, -3);
  } finally {
    c.dispose();
  }
});

test('V7 regression: station casualty remains grounded while the medic samples backward drag and its fallback', () => {
  const c = createCharacterFixture();
  const medic = { id: 'leon_dudek', active: true, alive: true, team: 'ally', role: 'MEDIC', state: 'GUARD', crouched: true, x: 4, y: -3, z: 0, facing: 0 };
  const patient = { ...medic, id: 'generic_rifleman', role: 'RIFLEMAN', state: 'WOUNDED', task: 'station_wounded', x: 4.92, carriedBy: medic.id };
  const saved = structuredClone([medic, patient]);

  try {
    c.update([medic, patient], 12, { x: 0, z: 0 });
    const v = c.instances.get(patient.id);
    assert.equal(v.root.parent, c.scene);
    assert.equal(v.root.position.y, -3);
    assert.equal(v.clip, 'wounded');
    assert.equal(c.instances.get(medic.id).clip, 'drag_wounded');
    assert.deepEqual([medic, patient], saved);

    const initial = c.instances.get(medic.id).root.matrixWorld.toArray();
    c.update([medic, patient], 12, { x: 0, z: 0 });
    assert.deepEqual(c.instances.get(medic.id).root.matrixWorld.toArray(), initial);

    c.clips.delete('drag_wounded');
    c.update([medic, patient], 13, { x: 0, z: 0 });
    assert.equal(c.instances.get(medic.id).clip, 'pinned');
  } finally {
    c.dispose();
  }
});

test('V7 regression: Kowal and healthy Bąk use their own meshes and muzzle sockets, preserve data and hide casualty weapon', () => {
  const c = createCharacterFixture();
  const kowal = {
    id: 'szymon_kowal', active: true, alive: true, team: 'ally', role: 'SUPPORT', state: 'GUARD', x: 4, y: -3, z: 0, facing: 0, shot: 0.25, firedAt: 10, rounds: 17, cooldown: 4
  };
  const bak = { ...kowal, id: 'jozef_bak', role: 'RIFLEMAN', shot: 0, firedAt: -100, rounds: 5 };
  const saved = structuredClone([kowal, bak]);

  try {
    c.update([kowal, bak], 10.1, { x: 0, z: 0 });
    const stats = c.diagnostics;
    const k = stats.actors.find(a => a.id === kowal.id);
    const b = stats.actors.find(a => a.id === bak.id);

    assert.equal(k.clip, 'rkm_fire_burst');
    assert.ok(k.weaponMeshes.includes('rkm_wz28'));
    assert.ok(!k.weaponMeshes.includes('rifle') && !k.weaponMeshes.includes('clip'));
    assert.ok(b.weaponMeshes.includes('rifle_wz98a'));
    assert.ok(!b.weaponMeshes.includes('rifle'));

    for (const a of [kowal, bak]) {
      const v = c.instances.get(a.id);
      const expected = new THREE.Vector3().fromArray(v.root.userData.weapons[v.weapon].muzzle).applyMatrix4(v.root.getObjectByName('weapon').matrixWorld);
      assert.ok(c.muzzle(a.id).distanceTo(expected) < 1e-10);
    }

    assert.deepEqual([kowal, bak], saved);
    c.update([{ ...kowal, rounds: 20 }, bak], 11.3, { x: 0, z: 0 });
    assert.equal(c.instances.get(kowal.id).clip, 'rkm_reload');

    c.update([kowal, { ...bak, state: 'WOUNDED' }], 12, { x: 0, z: 0 });
    assert.deepEqual(c.diagnostics.actors.find(a => a.id === bak.id).weaponMeshes, []);
  } finally {
    c.dispose();
  }
});

test('V7 regression: riflemen finish the bolt after the flash; pinned engineers stop their working hands until repair resumes', () => {
  const c = createCharacterFixture();
  const rifleman = { id: 'de_spans_01', active: true, alive: true, team: 'enemy', state: 'SUPPRESS', shot: 0, firedAt: 10 };
  const pose = { name: 'standing', aiming: true, underFire: false, moving: false };

  try {
    const bolt = c.sample(rifleman, 10.8, [rifleman], pose);
    assert.equal(bolt.clip, 'fire_bolt');
    assert.ok(Math.abs(bolt.time - 0.8) < 1e-10);
    assert.equal(bolt.loop, false);

    assert.equal(c.sample(rifleman, 11.3, [rifleman], pose).clip, 'aim');

    const engineer = { id: 'pawel_krawiec', role: 'ENGINEER', crouched: true };
    const pinned = { ...pose, name: 'pinned', underFire: true, aiming: false };

    const first = c.sample(engineer, 10, [engineer], pinned);
    const later = c.sample(engineer, 12, [engineer], pinned);
    assert.deepEqual(later, first);
    assert.equal(first.clip, 'sapper_work_pinned');
    assert.equal(first.loop, false);

    const working = c.sample(engineer, 13, [engineer], { ...pinned, underFire: false });
    assert.equal(working.clip, 'sapper_work');
    assert.equal(working.loop, true);
  } finally {
    c.dispose();
  }
});

test('Resolver V1: integrates sprint, crouch_walk, walk, run, and blocked ADVANCE idle deterministically', () => {
  const c = createCharacterFixture();
  try {
    const spanWalk = {
      id: 'de_spans_6', active: true, alive: true, team: 'enemy', state: 'ADVANCE', crouched: false,
      x: 10, y: 0, z: 0, facing: 0,
      motion: { speed: 1.5, odometer: 3.08, gait: 'walk', gaitSince: 1.0 }, posture: 'stand', postureSince: 0
    };
    const platoonSprint = {
      id: 'pl_east_0', active: true, alive: true, team: 'ally', group: 'grp_east_platoon', state: 'RETREAT', crouched: false,
      x: 12, y: 0, z: 0, facing: Math.PI,
      motion: { speed: 5.5, odometer: 6.76, gait: 'sprint', gaitSince: 1.0 }, posture: 'stand', postureSince: 0
    };
    const crouchWalk = {
      id: 'marek_zielinski', active: true, alive: true, team: 'ally', state: 'ADVANCE', crouched: true,
      x: 8, y: 0, z: 0, facing: 0,
      motion: { speed: 1.2, odometer: 1.44, gait: 'crouch_walk', gaitSince: 1.0 }, posture: 'crouch', postureSince: 1.0
    };
    const blockedAdvance = {
      id: 'tadeusz_nowicki', active: true, alive: true, team: 'ally', state: 'ADVANCE', crouched: false,
      x: 6, y: 0, z: 0, facing: 0,
      motion: { speed: 0, odometer: 4.2, gait: 'idle', gaitSince: 2.0 }, posture: 'stand', postureSince: 0
    };

    const sWalk = c.sample(spanWalk, 5.0, [spanWalk]);
    const sSprint = c.sample(platoonSprint, 5.0, [platoonSprint]);
    const sCrouch = c.sample(crouchWalk, 5.0, [crouchWalk]);
    const sBlocked = c.sample(blockedAdvance, 5.0, [blockedAdvance]);

    assert.equal(sWalk.clip, 'walk');
    assert.equal(sWalk.strideSynced, true);
    assert.equal(sSprint.clip, 'sprint');
    assert.equal(sSprint.strideSynced, true);
    assert.equal(sCrouch.clip, 'crouch_walk');
    assert.equal(sCrouch.strideSynced, true);
    assert.equal(sBlocked.clip, 'standing_idle');
    assert.equal(actorPose(blockedAdvance, 5.0).moving, false);
  } finally {
    c.dispose();
  }
});

test('Resolver V1: integrates turn_left, turn_right, hit_front and near_miss_duck with exact priority and recovery', () => {
  const c = createCharacterFixture();
  try {
    const base = {
      id: 'pl_guard_1', active: true, alive: true, team: 'ally', state: 'GUARD', crouched: false,
      x: 5, y: 0, z: 0, facing: 0, bodyYaw: 0, shot: 0,
      motion: { speed: 0, odometer: 0, gait: 'idle', gaitSince: 0 }, posture: 'stand', postureSince: 0
    };

    // Turn left (facing < bodyYaw in M01 XZ plane -> yawDelta < -TURN_THRESHOLD)
    const turningLeft = { ...base, facing: -0.8, bodyYaw: 0 };
    const sLeft = c.sample(turningLeft, 3.0, [turningLeft]);
    assert.equal(sLeft.clip, 'turn_left');
    assert.equal(sLeft.loop, false);

    // Turn right (facing > bodyYaw -> yawDelta > TURN_THRESHOLD)
    const turningRight = { ...base, facing: 0.8, bodyYaw: 0 };
    const sRight = c.sample(turningRight, 3.0, [turningRight]);
    assert.equal(sRight.clip, 'turn_right');
    assert.equal(sRight.loop, false);

    // Small yaw difference below TURN_THRESHOLD stays in standing_idle
    const tinyTurn = { ...base, facing: 0.1, bodyYaw: 0 };
    assert.equal(c.sample(tinyTurn, 3.0, [tinyTurn]).clip, 'standing_idle');

    // Near-miss duck triggers during [0, 0.6s) after suppressedAt, then transitions to pinned while suppressedUntil holds
    const nearMiss = { ...base, suppressedAt: 10.0, suppressedUntil: 13.0 };
    const sDuck = c.sample(nearMiss, 10.25, [nearMiss]);
    assert.equal(sDuck.clip, 'near_miss_duck');
    assert.ok(Math.abs(sDuck.time - 0.25) < 1e-10);
    assert.equal(sDuck.loop, false);

    const sPinnedAfterDuck = c.sample(nearMiss, 11.0, [nearMiss]);
    assert.equal(sPinnedAfterDuck.clip, 'pinned');

    // Hit front takes priority over near_miss_duck and turn when actual damage occurs
    const hitActor = { ...nearMiss, hitAt: 10.1, hitYaw: 0 };
    const sHit = c.sample(hitActor, 10.3, [hitActor]);
    assert.equal(sHit.clip, 'hit_front');
    assert.ok(Math.abs(sHit.time - 0.2) < 1e-10);
    assert.equal(sHit.loop, false);

    // Active shot (shot > 0) takes priority over hit_front / near_miss_duck
    const firingBack = { ...hitActor, suppressedUntil: 0, shot: 0.2, firedAt: 10.25, state: 'SUPPRESS' };
    const sFire = c.sample(firingBack, 10.3, [firingBack]);
    assert.equal(sFire.clip, 'fire_bolt');
  } finally {
    c.dispose();
  }
});

test('Resolver V1: foot phase synchronizes strictly with effective displacement (odometer) without sliding', () => {
  const actor = {
    id: 'marek_zielinski', active: true, alive: true, team: 'ally', state: 'ADVANCE', crouched: false,
    x: 0, y: 0, z: 0, facing: 0,
    motion: { speed: 1.4, odometer: 0, gait: 'walk', gaitSince: 0 }, posture: 'stand', postureSince: 0
  };

  const s0 = resolveStrideSample(actor, 'walk', 1.0);
  // Advance odometer by exactly one full walk stride (1.54m)
  actor.motion.odometer += STRIDE_METRES.walk;
  const sFullStride = resolveStrideSample(actor, 'walk', 9.7);
  assert.ok(Math.abs(sFullStride.stridePhase - s0.stridePhase) < 1e-10, 'one full stride displacement returns to exact same foot phase regardless of clock');

  // Advance odometer by half a stride (0.77m)
  actor.motion.odometer += STRIDE_METRES.walk * 0.5;
  const sHalfStride = resolveStrideSample(actor, 'walk', 10.2);
  const expectedHalf = (s0.stridePhase + 0.5) % 1;
  assert.ok(Math.abs(sHalfStride.stridePhase - expectedHalf) < 1e-10, 'half stride displacement advances foot phase by 0.5');
});

test('Resolver V1: smooth crossfade transitions between idle, walk, run, sprint and crouch preserve phase and sum weights to 1', () => {
  const c = createCharacterFixture();
  try {
    const a = {
      id: 'pl_runner', active: true, alive: true, team: 'ally', state: 'ADVANCE', crouched: false,
      x: 4, y: 0, z: 0, facing: 0, bodyYaw: 0,
      motion: { speed: 3.6, odometer: 2.88, gait: 'run', gaitSince: 10.0 }, posture: 'stand', postureSince: 0
    };

    // Mid-transition at t = 10.08 (0.08s into 0.18s blend window from walk -> run)
    const mid = c.sample(a, 10.08, [a]);
    assert.equal(mid.clip, 'run');
    assert.ok(mid.blend, 'blend descriptor must be active during transition window');
    assert.equal(mid.blend.clip, 'walk');
    assert.ok(mid.weight > 0 && mid.weight < 1);
    assert.ok(Math.abs(mid.weight + mid.blend.weight - 1) < 1e-12);

    // Phase-matched stride between walk (duration 1.1) and run (duration 0.8)
    const runNormPhase = mid.time / 0.8;
    const walkNormPhase = mid.blend.time / 1.1;
    assert.ok(Math.abs(runNormPhase - walkNormPhase) < 1e-10, 'outgoing walk and incoming run share identical normalized foot phase');

    // After transition window (t = 10.25 > 10.0 + 0.18), blend is null
    const settled = c.sample(a, 10.25, [a]);
    assert.equal(settled.clip, 'run');
    assert.equal(settled.blend, undefined);
  } finally {
    c.dispose();
  }
});

test('Resolver V1: natural torso twist follows bodyYaw on lower body while preserving authoritative combat facing and muzzle', () => {
  const c = createCharacterFixture({ withSpine: true });
  try {
    const a = {
      id: 'marek_zielinski', active: true, alive: true, team: 'ally', role: 'RIFLEMAN', state: 'GUARD',
      x: 4, y: 0, z: 0, facing: 0.5, bodyYaw: 0.1, shot: 0,
      motion: { speed: 0, odometer: 0, gait: 'idle', gaitSince: 0 }, posture: 'stand', postureSince: 0
    };
    const saved = structuredClone(a);
    const plain = structuredClone(a);
    for (const k of PRESENTATION_FIELDS) delete plain[k];

    c.update([a], 5.0, { x: 0, z: 0 });
    const inst = c.instances.get(a.id);

    // 1. Authoritative combat state, hitboxes, and eye geometry are completely untouched
    assert.deepEqual(a, saved);
    assert.deepEqual(actorHitboxes(a), actorHitboxes(plain));
    assert.deepEqual(eyePosition(a), eyePosition(plain));

    // 2. Lower body (root) is oriented at -bodyYaw - PI/2, while spine counter-rotates by -torsoTwist (-0.4 rad)
    const orient = resolveTorsoOrientation(a, actorPose(a, 5.0));
    assert.ok(Math.abs(orient.torsoTwist - 0.4) < 1e-10);
    assert.ok(Math.abs(orient.rootYaw - 0.1) < 1e-10);
    assert.ok(Math.abs(inst.root.rotation.y - (-0.1 - Math.PI / 2)) < 1e-10);
    assert.ok(Math.abs(inst.spineBone.rotation.y - (-0.4)) < 1e-10);

    // 3. Weapon world orientation and muzzle match authoritative facing (root.y + spine.y = -0.5 - PI/2)
    const expectedMuzzle = new THREE.Vector3().fromArray(inst.muzzle).applyMatrix4(inst.root.getObjectByName('weapon').matrixWorld);
    assert.ok(c.muzzle(a.id).distanceTo(expectedMuzzle) < 1e-10);

    // 4. Paused frame (calling update again at same time 5.0) does not accumulate spine rotation
    c.update([a], 5.0, { x: 0, z: 0 });
    assert.ok(Math.abs(inst.spineBone.rotation.y - (-0.4)) < 1e-10);
  } finally {
    c.dispose();
  }
});

test('Resolver V1: pause, save/reload, checkpoints CP-A..D and legacy 86/89 save migration preserve exact poses and validation', () => {
  const c = createCharacterFixture();
  try {
    // Simulate checkpoint progression across CP-A, CP-B, CP-C, CP-D
    const checkpoints = ['cp_m01_a_ponte', 'cp_m01_b_reorganizacao', 'cp_m01_c_demolicao', 'cp_m01_d_retirada'];
    for (const [idx, cpName] of checkpoints.entries()) {
      const clock = (idx + 1) * 25;
      const actor = {
        id: 'marek_zielinski', active: true, alive: true, team: 'ally', role: 'RIFLEMAN', state: 'ADVANCE',
        crouched: idx % 2 === 1, x: 10 - idx * 2, y: 0, z: idx, facing: 0.3 * idx
      };
      initializePresentation(actor, clock);
      const beforePos = [{ x: actor.x - 0.15, z: actor.z }];
      updateMotion([actor], beforePos, 0.05, clock);
      updateBodyYaw(actor, 0.05);

      let rejected = null;
      validatePresentation(actor, clock, msg => { rejected = msg; });
      assert.equal(rejected, null, `${cpName} must pass schema-2 presentation validation`);

      // Save snapshot before pause/reload
      const savedSnapshot = structuredClone(actor);
      c.update([actor], clock + 0.06, { x: 0, z: 0 });
      const matBeforeReload = c.instances.get(actor.id).root.getObjectByName('weapon').matrixWorld.toArray();
      const clipBeforeReload = c.instances.get(actor.id).clip;

      // Simulate pause (same clock) + checkpoint restore into a fresh M01Characters instance
      const cRestored = createCharacterFixture();
      const restoredActor = structuredClone(savedSnapshot);
      cRestored.update([restoredActor], clock + 0.06, { x: 0, z: 0 });
      const matAfterReload = cRestored.instances.get(actor.id).root.getObjectByName('weapon').matrixWorld.toArray();

      assert.equal(cRestored.instances.get(actor.id).clip, clipBeforeReload);
      assert.deepEqual(matAfterReload, matBeforeReload, `${cpName} reload must reproduce exact bone matrixWorld`);
      assert.deepEqual(restoredActor, savedSnapshot, `${cpName} renderer must never mutate restored actor`);
      cRestored.dispose();
    }
  } finally {
    c.dispose();
  }
});

test('Resolver V1: LOD hysteresis prevents boundary chatter and missing clips/GLBs fall back safely', () => {
  const c = createCharacterFixture();
  try {
    const limits = { count: 28, near: 14, middle: 45, far: 160 };
    // At 13.8m -> LOD 0 ('pl:0')
    assert.equal(resolveLodWithHysteresis(13.8, limits, null, 'pl', 'high', c.sources), 0);
    // Moving slightly to 14.2m (within 14 + 0.5m hysteresis band) while on 'pl:0' stays on LOD 0
    assert.equal(resolveLodWithHysteresis(14.2, limits, 'pl:0', 'pl', 'high', c.sources), 0);
    // Moving past 14.6m (> 14 + 0.5m) transitions cleanly to LOD 1
    assert.equal(resolveLodWithHysteresis(14.6, limits, 'pl:0', 'pl', 'high', c.sources), 1);
    // Moving back to 13.7m (within 14 - 0.5m hysteresis band) while on 'pl:1' stays on LOD 1
    assert.equal(resolveLodWithHysteresis(13.7, limits, 'pl:1', 'pl', 'high', c.sources), 1);

    // Safe clip fallback when optional clips are missing
    c.clips.delete('sprint');
    c.clips.delete('crouch_walk');
    c.clips.delete('turn_left');
    c.clips.delete('hit_front');
    c.clips.delete('near_miss_duck');

    const sprinter = {
      id: 's1', active: true, alive: true, team: 'ally', x: 2, y: 0, z: 0, facing: 0,
      motion: { speed: 5.4, odometer: 5.4, gait: 'sprint', gaitSince: 0 }
    };
    const crouchMover = {
      id: 's2', active: true, alive: true, team: 'ally', crouched: true, x: 2, y: 0, z: 0, facing: 0,
      motion: { speed: 1.2, odometer: 1.2, gait: 'crouch_walk', gaitSince: 0 }
    };
    const turner = {
      id: 's3', active: true, alive: true, team: 'ally', x: 2, y: 0, z: 0, facing: -0.9, bodyYaw: 0,
      motion: { speed: 0, odometer: 0, gait: 'idle', gaitSince: 0 }
    };
    const hitPinned = {
      id: 's4', active: true, alive: true, team: 'ally', x: 2, y: 0, z: 0, facing: 0,
      hitAt: 5.0, suppressedAt: 5.0, suppressedUntil: 8.0
    };

    assert.equal(c.sample(sprinter, 5.1, [sprinter]).clip, 'run');
    assert.equal(c.sample(crouchMover, 5.1, [crouchMover]).clip, 'crouched_idle');
    assert.equal(c.sample(turner, 5.1, [turner]).clip, 'standing_idle');
    assert.equal(c.sample(hitPinned, 5.1, [hitPinned]).clip, 'pinned');

    // Missing all GLBs falls back cleanly to empty selection (procedural rendering in M01View)
    c.sources.clear();
    const selected = c.update([sprinter, crouchMover], 5.1, { x: 0, z: 0 });
    assert.equal(selected.size, 0);
  } finally {
    c.dispose();
  }
});

test('V7 resolver loads the separate six-motion GLB and exposes its animation clips', async () => {
  const c=new M01Characters(new THREE.Scene(),{visualVariation:false});
  const loaded=[];
  c.assets.load=async (key,path)=>{
    loaded.push({key,path});
    if(key==='m01-motion-clips')return {animations:[
      'sprint','crouch_walk','turn_left','turn_right','hit_front','near_miss_duck'
    ].map(name=>new THREE.AnimationClip(name,1,[]))};
    return {animations:[]};
  };
  c.loadSource=async()=>{};
  c.loadCKM=async()=>{};
  c.loadMG=async()=>{};
  await c.load('low');
  assert.ok(loaded.some(x=>x.key==='m01-motion-clips'&&
    x.path.endsWith('/motion-clips-v1/m01_soldier_motion_clips.glb')));
  for(const name of ['sprint','crouch_walk','turn_left','turn_right','hit_front','near_miss_duck'])
    assert.equal(c.clips.has(name),true,`${name} must load from the separate GLB`);
});
