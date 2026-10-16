// One resolver module, two suites: Argon Animation Resolver V1 (clip selection, PRs #62/#64) and T35 (sim-time cross-fade).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
// T35 cross-fade layer of the same module.
import {FADE,GAP,HOLD,smoothstep,layerWeights,layerTime,fadeDuration,isExactClip,strideCycle,locomotionSample,
  isLocomoting,locomotionClip,selectGeneric,resolveAnimation} from '../src/render/m01-animation-resolver.js';
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

// ================================ T35: blended soldier animation resolver (sim-time cross-fade) ================================
// Clip metadata as shipped in m01_soldier_animations.glb (durations and speed_mps extras).
const INFO={standing_idle:{duration:4},crouched_idle:{duration:3},aim:{duration:2},fire_bolt:{duration:1.17},
  walk:{duration:1,speed_mps:1.1},run:{duration:.68,speed_mps:3.251},pinned:{duration:2.4},fallen:{duration:1.4},wounded:{duration:2},
  mg34_prone_idle:{duration:3},mg34_prone_aim:{duration:1}};
const clips={has:n=>n in INFO,info:n=>INFO[n]};
const OFFSET=.4;
function candidate(actor,time){
  const pose=actorPose(actor,time);
  if(pose.name==='fallen')return {clip:'fallen',time:1.4,loop:false,rate:0,kind:'death',duration:1.4,...(Number.isFinite(actor.diedAt)?{since:actor.diedAt}:{})};
  if(actor.task==='prone')return {clip:'mg34_prone_idle',time:time-actor.proneAt,loop:false,rate:1,exact:true,duration:3};
  if(pose.underFire)return {clip:'pinned',time:time+OFFSET,loop:true,rate:1,duration:2.4};
  const s=selectGeneric({actor,pose,time,offset:OFFSET,clips});
  return {...s,duration:INFO[s.clip].duration};
}
const resolve=(actor,time,prev=null)=>resolveAnimation({actor,time,candidate:candidate(actor,time),prev,alt:patch=>candidate({...actor,...patch},time)});
const base=(extra={})=>({id:'de_spans_01',team:'enemy',alive:true,active:true,state:'GUARD',shot:0,crouched:false,x:0,z:0,facing:0,...extra});
const total=blend=>blend.reduce((s,b)=>s+b.weight,0);
const weightOf=(r,clip)=>r.blend.find(b=>b.clip===clip)?.weight??0;
const near=(a,b,e=1e-9)=>Math.abs(a-b)<=e;
/** Run the resolver at 60 Hz, mutating the actor through `mutate(actor,t)`. */
function drive(actor,from,to,mutate=()=>{},prev=null,hz=60){
  const frames=[];
  for(let i=0,t=from;t<=to+1e-9;i++,t=from+i/hz){
    mutate(actor,t);const r=resolve(actor,t,prev);prev=r.state;frames.push({t,r});
  }
  return {frames,prev};
}

test('blend curve is monotonic, symmetric, flat at both ends and weights always sum to one',()=>{
  assert.equal(smoothstep(-1),0);assert.equal(smoothstep(0),0);assert.equal(smoothstep(1),1);assert.equal(smoothstep(2),1);
  assert.ok(near(smoothstep(.5),.5)&&near(smoothstep(.25)+smoothstep(.75),1));
  let last=0;for(let i=0;i<=100;i++){const v=smoothstep(i/100);assert.ok(v>=last);last=v;}
  assert.ok(smoothstep(.02)<.002&&smoothstep(.98)>.998,'zero slope at both ends: no velocity pop');
  const state={target:'b',start:10,dur:.3,layers:[{clip:'a',w0:1},{clip:'b',w0:0}]};
  for(let t=9.9;t<10.5;t+=.01){const w=layerWeights(state,t);assert.ok(near(w[0]+w[1],1));}
  assert.deepEqual(layerWeights(state,10),[1,0]);assert.deepEqual(layerWeights(state,10.3),[0,1]);
  // A fade that restarts from a half-blended pose keeps the instantaneous weights.
  const mid=layerWeights(state,10.15);assert.ok(near(mid[0],.5));
  const again={target:'a',start:10.15,dur:.3,layers:[{clip:'a',w0:mid[0]},{clip:'b',w0:mid[1]}]};
  assert.ok(near(layerWeights(again,10.15)[0],.5));assert.ok(near(layerWeights(again,10.3)[0]+layerWeights(again,10.3)[1],1));
});

test('stand to crouch blends over 0.3 s of sim time without a single hard cut, in both directions',()=>{
  const flip=(crouched,since)=>(a,t)=>{if(t>=10-1e-9&&a.crouched!==crouched){a.crouched=crouched;a.posture=crouched?'crouch':'stand';a.postureSince=since;}};
  for(const [crouched,from,to] of [[true,'standing_idle','crouched_idle'],[false,'crouched_idle','standing_idle']]){
    const a=base({crouched:!crouched,posture:crouched?'stand':'crouch',postureSince:1});
    const {frames}=drive(a,9.5,10.8,flip(crouched,10));
    let previous=null,worst=0;
    for(const {t,r} of frames){
      assert.ok(near(total(r.blend),1),`sum at ${t}`);
      const w=weightOf(r,to);if(previous!==null)worst=Math.max(worst,Math.abs(w-previous));previous=w;
      if(t<10-1e-9)assert.equal(r.clip,from);else assert.equal(r.clip,to);
      if(t<10-1e-9)assert.equal(w,0);
      if(t>=10.3+1e-9){assert.equal(w,1);assert.equal(r.blend.length,1,'finished fade keeps one layer');}
    }
    assert.ok(worst<=1.5/(FADE.posture*60)+1e-9,`largest per-frame weight step ${worst} (smoothstep peak slope 1.5/dur; a hard cut would be 1)`);
    const half=frames.find(f=>near(f.t,10.15,1e-6)).r;assert.ok(near(weightOf(half,to),.5,.02),'half way at 0.15 s');
  }
  assert.equal(FADE.posture,.3);assert.equal(fadeDuration('standing_idle','crouched_idle'),.3);assert.equal(fadeDuration('crouched_idle','standing_idle'),.3);
});

test('idle, aim, walk, run and pinned switch with short cross-fades; bolt and pinned entry are faster than posture',()=>{
  assert.equal(fadeDuration('standing_idle','aim'),FADE.default);
  assert.equal(fadeDuration('aim','fire_bolt'),FADE.toFire);assert.equal(fadeDuration('fire_bolt','aim'),FADE.fromFire);
  assert.equal(fadeDuration('standing_idle','pinned'),FADE.toPinned);assert.equal(fadeDuration('pinned','crouched_idle'),FADE.fromPinned);
  assert.equal(fadeDuration('walk','standing_idle'),FADE.fromLoco);assert.equal(fadeDuration('walk','run'),FADE.default);
  for(const [a,b] of [['standing_idle','walk'],['walk','run'],['aim','standing_idle'],['pinned','aim'],['wounded','standing_idle']]){
    const d=fadeDuration(a,b);assert.ok(d>=FADE.toFire&&d<=FADE.posture,`${a}->${b}: ${d}`);
  }
  // Death always fades into the fall, even out of an authored clip.
  assert.equal(fadeDuration('mg34_prone_idle','fallen'),FADE.death);
  for(const exact of ['mg34_prone_enter','mg34_aim','mg34_fire_burst','ckm_wz30_gunner_idle','station_drag_medic_grab'])assert.ok(isExactClip(exact),exact);
  for(const generic of ['aim','walk','rkm_fire_burst','drag_wounded','carry_wounded'])assert.ok(!isExactClip(generic),generic);
  assert.equal(fadeDuration('standing_idle','mg34_prone_idle'),0);assert.equal(fadeDuration('mg34_prone_idle','standing_idle'),0);
});

test('an authored (exact) clip is never cross-faded: one layer at full weight on both edges',()=>{
  const actor=base();
  const {frames}=drive(actor,5,6.4,(a,t)=>{if(t>=5.5-1e-9&&t<6-1e-9){a.task='prone';a.proneAt=5.5;}else delete a.task;});
  for(const {t,r} of frames){assert.equal(r.blend.length,1,`t=${t}`);assert.equal(r.blend[0].weight,1);}
  assert.ok(frames.some(f=>f.r.clip==='mg34_prone_idle')&&frames.some(f=>f.r.clip==='standing_idle'));
});

test('death falls over the sim clock from diedAt, cross-fading from the live pose and landing on the final frame',()=>{
  const actor=base({postureSince:1,posture:'stand'});
  const {frames}=drive(actor,19.5,22,(a,t)=>{if(t>=20-1e-9&&a.alive){a.alive=false;a.diedAt=20;a.deathYaw=0;}});
  for(const {t,r} of frames){
    assert.ok(near(total(r.blend),1),`sum at ${t}`);
    if(t<20-1e-9){assert.equal(r.clip,'standing_idle');continue;}
    assert.equal(r.clip,'fallen');
    assert.ok(near(r.time,Math.min(1.4,t-20),1e-9),`fall time follows sim time at ${t}: ${r.time}`);
    const w=weightOf(r,'fallen');
    if(t>=20.2+1e-9){assert.equal(w,1);assert.equal(r.blend.length,1);}
    if(near(t,20.1,1e-6))assert.ok(near(w,.5,.03));
  }
  const last=frames.at(-1).r;assert.equal(last.time,1.4,'final frame once the fall has played');assert.equal(last.state.alive,false);
  let previous=0,worst=0;for(const {r} of frames.filter(f=>f.t>=20)){const w=weightOf(r,'fallen');worst=Math.max(worst,w-previous);previous=w;}
  assert.ok(worst<=1.5/(FADE.death*60)+1e-9,`death never snaps: largest weight step ${worst}`);
});

test('death without a sim timestamp keys on the sim time the renderer first saw it, or lands on the final pose',()=>{
  // First seen alive then dead (no diedAt): the fall plays from that sim time.
  const a=base();
  const {frames}=drive(a,30,32,(x,t)=>{if(t>=30.5-1e-9)x.alive=false;});
  const first=frames.find(f=>f.r.clip==='fallen');
  assert.ok(near(first.t,30.5,1e-6));assert.ok(near(first.r.time,0,1e-6));assert.ok(near(weightOf(first.r,'fallen'),0,1e-6),'starts from the live pose');
  const later=frames.find(f=>near(f.t,31,1e-6)).r;assert.ok(near(later.time,.5,1e-6));assert.equal(later.blend.length,1);
  assert.ok(near(frames.at(-1).r.time,1.4,1e-6)||frames.at(-1).r.time===1.4,'the fall completes');
  // Never seen alive (legacy loss, restore): final pose at full weight, nothing invented.
  const dead=base({alive:false});
  const r=resolve(dead,50);assert.equal(r.clip,'fallen');assert.equal(r.time,1.4);assert.deepEqual(r.blend.map(b=>b.weight),[1]);
  // The same dead actor seen again after a long silence is still the final pose.
  const again=resolve(dead,50.5,r.state);assert.equal(again.time,1.4);assert.equal(again.blend.length,1);
  // A resurrected actor (restored earlier checkpoint, clock goes back) resets cleanly.
  const back=resolve(base(),10,again.state);assert.equal(back.clip,'standing_idle');assert.equal(back.blend.length,1);
});

test('reload rebuilds an in-flight posture, death and gait-start fade from sim data alone',()=>{
  const postured=(t)=>base({crouched:true,posture:'crouch',postureSince:10});
  const live=drive(base({posture:'stand',postureSince:1}),9.5,10.4,(a,t)=>{if(t>=10-1e-9){a.crouched=true;a.posture='crouch';a.postureSince=10;}});
  for(const {t,r} of live.frames.filter(f=>f.t>=10&&f.t<10.3-1e-9)){
    const fresh=resolve(postured(t),t,null);
    assert.equal(fresh.clip,r.clip);
    for(const b of r.blend){const o=fresh.blend.find(x=>x.clip===b.clip);assert.ok(o,`layer ${b.clip} at ${t}`);assert.ok(near(o.weight,b.weight,1e-9)&&near(o.time,b.time,1e-9),`${b.clip} at ${t}`);}
  }
  // Death.
  const dying=drive(base({posture:'stand',postureSince:1}),19.5,20.4,(a,t)=>{if(t>=20-1e-9&&a.alive){a.alive=false;a.diedAt=20;a.deathYaw=0;}});
  for(const {t,r} of dying.frames.filter(f=>f.t>=20)){
    const fresh=resolve(base({alive:false,diedAt:20,deathYaw:0}),t,null);
    assert.ok(near(fresh.time,r.time,1e-9),`fall time at ${t}`);
    for(const b of r.blend){const o=fresh.blend.find(x=>x.clip===b.clip);assert.ok(o);assert.ok(near(o.weight,b.weight,1e-9)&&near(o.time,b.time,1e-9),`${b.clip} at ${t}`);}
  }
  // Gait start (idle -> walk) with the odometer.
  const walker=(odo,gaitSince)=>base({state:'ADVANCE',group:'grp_x',motion:{speed:1,odometer:odo,gait:'walk',gaitSince}});
  const moving=drive(base({motion:{speed:0,odometer:0,gait:'idle',gaitSince:1}}),14.5,15.4,(a,t)=>{
    if(t>=15-1e-9){a.state='ADVANCE';a.group='grp_x';a.motion={speed:1,odometer:t-15+0,gait:'walk',gaitSince:15};}});
  for(const {t,r} of moving.frames.filter(f=>f.t>=15&&f.t<15.2-1e-9)){
    const fresh=resolve(walker(t-15,15),t,null);assert.equal(fresh.clip,'walk');
    for(const b of r.blend){const o=fresh.blend.find(x=>x.clip===b.clip);assert.ok(o,`${b.clip} at ${t}`);assert.ok(near(o.weight,b.weight,1e-9)&&near(o.time,b.time,1e-9),`${b.clip} at ${t}`);}
  }
  // Unknown or ancient stamps never invent a fade (defaults are clock-1 or 0).
  assert.equal(resolve(base({crouched:true,posture:'crouch',postureSince:0}),.1,null).blend.length,1);
  assert.equal(resolve(base({crouched:true,posture:'crouch',postureSince:9}),10,null).blend.length,1);
});

test('same actor data at the same sim time gives identical output; pause (repeated clock) freezes every layer',()=>{
  const actor=base({crouched:true,posture:'crouch',postureSince:10});
  const first=resolve(actor,10.1,null);
  const sameAgain=resolve(structuredClone(actor),10.1,null);
  assert.deepEqual(sameAgain.blend,first.blend);assert.deepEqual(sameAgain.state,first.state);
  // Pause: the clock stops, the renderer keeps calling. Nothing may advance.
  let prev=first.state;const frozen=structuredClone(first.blend);
  for(let i=0;i<50;i++){const r=resolve(actor,10.1,prev);prev=r.state;assert.deepEqual(r.blend,frozen);}
  assert.deepEqual(prev,first.state);
  // And resuming continues from the same record rather than restarting it.
  const resumed=resolve(actor,10.1+1/60,prev);assert.ok(weightOf(resumed,'crouched_idle')>weightOf(first,'crouched_idle'));
  // Evaluating late then early (clock goes back after a load) does not use the stale record.
  const back=resolve(actor,10.05,resumed.state);assert.ok(back.state.t===10.05);assert.ok(near(weightOf(back,'crouched_idle'),smoothstep(.05/.3),1e-9));
  // A long silence also resets: no fade is invented from an old record.
  const silent=resolve(base({crouched:true,posture:'crouch',postureSince:2}),10+GAP+1,resumed.state);assert.equal(silent.blend.length,1);
});

test('a retarget in mid-fade (A, B, A) is continuous: no pop, one layer per clip, weights sum to one',()=>{
  const a=base({posture:'stand',postureSince:1});
  const script=(x,t)=>{
    const crouch=(t>=10&&t<10.1)||t>=10.2; // stand, crouch, stand again after 0.1 s, crouch again 0.1 s later
    x.crouched=crouch;x.posture=crouch?'crouch':'stand';x.postureSince=t>=10.2?10.2:t>=10.1?10.1:t>=10?10:1;
  };
  const {frames}=drive(a,9.9,10.8,script);
  let previous=null,worst=0;
  for(const {t,r} of frames){
    assert.ok(near(total(r.blend),1,1e-9),`sum ${t}`);assert.equal(new Set(r.blend.map(b=>b.clip)).size,r.blend.length);
    const w=weightOf(r,'crouched_idle');if(previous!==null)worst=Math.max(worst,Math.abs(w-previous));previous=w;
  }
  assert.ok(worst<.1,`largest step across interrupted fades ${worst}`);
  assert.equal(frames.at(-1).r.blend.length,1);assert.equal(frames.at(-1).r.clip,'crouched_idle');
});

test('foot drift: locomotion phase comes from the odometer so mean planted-foot speed error stays under 0.10 m/s',()=>{
  const dt=1/60,speeds=[[0,1],[3.6,4],[0,1],[1.4,2],[4.5,3],[0,1],[5.5,3],[3.6,3],[0,1]];
  const run=(useOdometer)=>{
    const actor=base({state:'ADVANCE',group:'grp_east_platoon',motion:{speed:0,odometer:0,gait:'idle',gaitSince:0}});
    let t=0,prev=null,odo=0,error=0,frames=0,last=null,gaitSince=0,gait='idle';
    for(const [speed,seconds] of speeds)for(let i=0;i<seconds*60;i++){
      t+=dt;odo+=speed*dt;
      const g=speed===0?'idle':speed<=2.2?'walk':speed<=4.4?'run':'sprint';if(g!==gait){gait=g;gaitSince=t;}
      actor.state=speed===0?'GUARD':'ADVANCE';
      actor.motion=useOdometer?{speed,odometer:odo,gait,gaitSince}:undefined;
      const r=resolve(actor,t,prev);prev=r.state;
      const own=r.blend.find(b=>b.target),info=INFO[own.clip];
      if(last&&speed>0&&info.speed_mps&&last.clip===own.clip){
        let cycles=(own.time-last.time)/info.duration;cycles-=Math.round(cycles); // fraction of a loop advanced this frame
        // The planted foot moves back at cycles*cycleDistance/dt relative to the body; the body moves at `speed`.
        error+=Math.abs(cycles*strideCycle(info)/dt-speed);frames++;
      }
      last={clip:own.clip,time:own.time};
    }
    return {mean:frames?error/frames:0,frames};
  };
  const withOdometer=run(true),withoutOdometer=run(false);
  assert.ok(withOdometer.frames>600);
  assert.ok(withOdometer.mean<=.10,`mean drift ${withOdometer.mean}`);
  assert.ok(withoutOdometer.mean>.5,`the old fixed-rate playback slides: ${withoutOdometer.mean}`);
});

test('locomotion helpers: clip from gait, cycle distance from GLB extras, blocked movers go idle after HOLD',()=>{
  assert.ok(near(strideCycle({duration:1,speed_mps:1.1}),1.1));assert.equal(strideCycle({duration:.64,cycle_distance_m:3.2,speed_mps:5}),3.2);
  assert.equal(strideCycle(undefined),0);assert.equal(strideCycle({duration:2}),0);
  const motion=(gait,gaitSince=0)=>({speed:1,odometer:5,gait,gaitSince});
  assert.equal(locomotionClip({motion:motion('walk')},clips),'walk');assert.equal(locomotionClip({motion:motion('run')},clips),'run');
  assert.equal(locomotionClip({motion:motion('sprint')},clips),'run','no sprint clip shipped: run');
  assert.equal(locomotionClip({motion:motion('sprint')},{has:n=>n==='sprint',info:()=>undefined}),'sprint','sprint is used when present');
  assert.equal(locomotionClip({motion:motion('run')},clips,{rkm:true}),'rkm_run');assert.equal(locomotionClip({motion:motion('walk')},clips,{rkm:true}),'rkm_walk');
  assert.equal(locomotionClip({group:'grp_east_platoon'},clips),'run','legacy fallback keeps the group rule');
  assert.equal(locomotionClip({motion:motion('idle')},clips,{hint:'run'}),'run','held gait keeps the playing clip');
  const moving={moving:true};
  assert.equal(isLocomoting({motion:motion('idle',10)},moving,10+HOLD/2),true,'idle for less than HOLD: still moving');
  assert.equal(isLocomoting({motion:motion('idle',10)},moving,10+HOLD+.01),false,'blocked for longer than HOLD: stand still');
  assert.equal(isLocomoting({motion:motion('walk',10)},moving,99),true);assert.equal(isLocomoting({},moving,5),true);assert.equal(isLocomoting({motion:motion('walk')},{moving:false},5),false);
  // Odometer phase: continuous, wraps once per cycle and is zero-drift by construction; no motion data keeps the old playback.
  const a={id:'x',motion:{speed:3.251,odometer:0,gait:'run',gaitSince:0}};
  const one=locomotionSample('run',INFO.run,a,100,0);assert.equal(one.source,'odometer');assert.equal(one.time,0);
  const cycle=strideCycle(INFO.run);a.motion.odometer=cycle/2;assert.ok(near(locomotionSample('run',INFO.run,a,100,0).time,.34));
  a.motion.odometer=cycle*7+cycle/4;assert.ok(near(locomotionSample('run',INFO.run,a,100,0).time,.17));
  assert.ok(near(locomotionSample('run',INFO.run,a,100,0).rate,1),'rate = speed / nominal speed');
  const legacy=locomotionSample('walk',INFO.walk,{id:'x'},12,.5);assert.deepEqual(legacy,{clip:'walk',time:12.5,loop:true,rate:1,source:'time'});
  // Different actors start at different foot phases.
  assert.notEqual(locomotionSample('run',INFO.run,{motion:{odometer:0,speed:1}},0,.4).time,locomotionSample('run',INFO.run,{motion:{odometer:0,speed:1}},0,2.8).time);
});

test('a blocked mover fades out of walking instead of sliding in place, and weights stay bounded by the layer cap',()=>{
  const actor=base({state:'ADVANCE',group:'grp_east_platoon',motion:{speed:3.6,odometer:0,gait:'run',gaitSince:5}});
  let odo=0;
  const {frames}=drive(actor,5,8,(a,t)=>{
    const blocked=t>=6;if(!blocked)odo+=3.6/60;
    a.motion={speed:blocked?0:3.6,odometer:odo,gait:blocked?'idle':'run',gaitSince:blocked?6:5};
  });
  const at=t=>frames.find(f=>near(f.t,t,1e-6)).r;
  assert.equal(at(6.2).clip,'run','inside HOLD the run continues');
  assert.equal(at(6.4).clip,'standing_idle','after HOLD it stands (state label still says ADVANCE)');
  assert.equal(at(7.5).blend.length,1);
  // Pathological flapping between clips never builds more than the layer cap and weights remain valid.
  let prev=null;const names=['standing_idle','aim','pinned','wounded'];
  for(let i=0;i<120;i++){
    const c={clip:names[i%4],time:i/60,loop:true,rate:1,duration:2};
    const r=resolveAnimation({actor:base(),time:20+i/60,candidate:c,prev});prev=r.state;
    assert.ok(r.blend.length<=4+0);assert.ok(near(total(r.blend),1,1e-9));assert.ok(r.blend.every(b=>b.weight>=0&&b.weight<=1+1e-12));
  }
});

test('layer clip time follows its own rate from sim time and never uses the wall clock',()=>{
  const l={clip:'a',loop:true,duration:2,t0:10,time0:1.5,rate:1,w0:1};
  assert.equal(layerTime(l,10),1.5);assert.ok(near(layerTime(l,10.75),.25));
  assert.equal(layerTime({...l,loop:false},13),2,'one-shot clamps at its end');
  assert.equal(layerTime({...l,rate:0},50),1.5,'held clip');
});

test('the new presentation modules contain no RNG or wall clock, and nothing stops all actions on the generic path',()=>{
  const read=p=>readFileSync(new URL(`../src/render/${p}`,import.meta.url),'utf8');
  const strip=s=>s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:])\/\/.*$/gm,'$1');
  for(const file of ['m01-animation-resolver.js','m01-animation-player.js']){
    const code=strip(read(file));
    for(const banned of [/Math\.random/,/performance\.now/,/\bDate\b/,/requestAnimationFrame/,/setTimeout|setInterval/,/crypto/,/stopAllAction/])assert.ok(!banned.test(code),`${file}: ${banned}`);
  }
  assert.ok(!/from\s+['"]three/.test(read('m01-animation-resolver.js')),'the resolver is independent of THREE');
  const characters=strip(read('m01-characters.js'));
  // The generic actor path is create() .. update() .. release(): everything between `create(` and `updateCKM(`. The CKM gun prop
  // (updateCKM and the dispose clause for it) keeps its own authored mixer; it is not an actor and is outside this resolver.
  const from=characters.indexOf('create(actor,key,weaponLOD){'),to=characters.indexOf('updateCKM(actors,time,player,quality){');
  assert.ok(from>0&&to>from,'actor path located');
  const actorPath=characters.slice(from,to);
  assert.ok(/update\(actors,time,player/.test(actorPath)&&/release\(v\)\{/.test(actorPath));
  assert.ok(!/stopAllAction/.test(actorPath),'create/update/release never use a mixer-wide stop');
  assert.ok(!/\.setTime\(/.test(actorPath),'actors are not driven by mixer.setTime');
  assert.ok(!/Math\.random|performance\.now|\bDate\b/.test(characters),'pose code stays free of RNG and wall clocks');
  assert.ok(!/\bsetTime\b/.test(strip(read('m01-animation-player.js'))),'the player never uses mixer.setTime (it zeroes other actions)');
});
