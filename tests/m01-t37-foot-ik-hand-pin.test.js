import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import v8 from 'node:v8';
import vm from 'node:vm';
import * as THREE from 'three';
import { TczewWorld } from '../src/world/tczew-world.js';
import { M01Simulation } from '../src/game/m01-simulation.js';
import { actorHitboxes, eyePosition } from '../src/world/spatial.js';
import {
  ANKLE_SOLE_OFFSET,
  BALL_SOLE_OFFSET,
  BOOT_TOLERANCE_M,
  isFootIkEligible,
  sampleContinuousGroundY,
  sampleRampInclination,
  solveTwoBoneIk
} from '../src/render/m01-foot-ik.js';
import {
  HAND_PIN_TOLERANCE_M,
  M01_IK_TIER_POLICY,
  bindCharacterIkRig,
  resolveIkTierMode,
  updateActorsIk
} from '../src/render/m01-hand-pin.js';
import { boneSnapshot, createIkCharacters, loadIkAssets } from './helpers/m01-ik-fixture.js';
import { driver, toRepair } from './helpers/m01-route.js';

const world = new TczewWorld();
const P = (inst, name, out = new THREE.Vector3()) => inst.root.getObjectByName(name).getWorldPosition(out);
const groundAt = p => world.heightAt(p.x, p.z);

function soldier(id, x, z, extra = {}) {
  return {
    id, active: true, alive: true, team: 'ally', role: 'RIFLEMAN', state: 'SUPPRESS', crouched: false, suppressedUntil: 0,
    x, y: world.heightAt(x, z), z, facing: 0.35, bodyYaw: 0.35, shot: 0, firedAt: -100, rounds: 5, ...extra
  };
}

// Real M01 terrain: the 2:1 rail embankment / road approach flanks (26.6 deg), a 0.6 deg road crest, and the flat west bank.
const SPOTS = [
  { name: 'rail embankment south flank', x: -50, z: 9 },
  { name: 'rail embankment north flank', x: -50, z: -9 },
  { name: 'rail embankment curve west', x: -260, z: -15 },
  { name: 'road approach north flank', x: -40, z: 32 },
  { name: 'road approach south flank', x: -40, z: 48 },
  { name: 'road crest', x: -210, z: 52 },
  { name: 'far west embankment', x: -300, z: 0 }
];
const POSTURES = [
  { label: 'standing_idle', extra: { state: 'GUARD' }, stationary: true },
  { label: 'aim', extra: { state: 'SUPPRESS' }, stationary: true },
  { label: 'crouched_idle', extra: { state: 'GUARD', crouched: true }, stationary: true },
  { label: 'pinned', extra: { state: 'TAKE_COVER', crouched: true, suppressedUntil: 99 }, stationary: true },
  { label: 'walk', extra: { state: 'ADVANCE', motion: { speed: 1.4, odometer: 0.33, gait: 'walk', gaitSince: 0 } }, stationary: false },
  { label: 'run', extra: { state: 'RETREAT', motion: { speed: 3.3, odometer: 0.5, gait: 'run', gaitSince: 0 } }, stationary: false }
];

test('T37 constants and API match the shipped soldier rig (bone names, ankle/ball sole offsets, sockets, all LODs)', async () => {
  const { sources } = await loadIkAssets();
  const bones = ['hips', 'spine_01', 'spine_02', 'spine_03', 'neck', 'head', 'clavicle_l', 'upperarm_l', 'lowerarm_l', 'hand_l', 'clavicle_r', 'upperarm_r', 'lowerarm_r', 'hand_r',
    'thigh_l', 'calf_l', 'foot_l', 'ball_l', 'thigh_r', 'calf_r', 'foot_r', 'ball_r', 'weapon', 'weapon_bolt'];
  for (const [key, gltf] of sources) {
    gltf.scene.updateMatrixWorld(true);
    for (const name of bones) assert.ok(gltf.scene.getObjectByName(name), `${key} lacks bone ${name}`);
    // Bind pose: root at the origin, boots on the plane.
    assert.ok(Math.abs(P({ root: gltf.scene }, 'foot_l').y - ANKLE_SOLE_OFFSET) < 1e-3, `${key} ankle offset`);
    assert.ok(Math.abs(P({ root: gltf.scene }, 'ball_l').y - BALL_SOLE_OFFSET) < 1e-3, `${key} ball offset`);
    const rig = bindCharacterIkRig(gltf.scene);
    assert.ok(rig.hasLegIk && rig.hasArmIk, `${key} rig must support leg and arm IK`);
  }
  let profile;
  sources.get('pl:0').scene.traverse(n => { if (n.userData?.weapons) profile = n.userData; });
  for (const weapon of ['wz29', 'wz98a', 'rkm_wz28']) for (const socket of ['grip_l', 'grip_r', 'muzzle']) assert.ok(Array.isArray(profile.weapons[weapon][socket]), `${weapon}.${socket}`);
  assert.equal(typeof world.heightAt, 'function');
  assert.equal(typeof world.terrainHeightAt, 'function');
});

test('T37 two-bone solver preserves both segment lengths, reaches a reachable target, and clamps an unreachable one', () => {
  const root = new THREE.Group();
  const upper = new THREE.Bone();
  const mid = new THREE.Bone();
  const end = new THREE.Bone();
  root.add(upper); upper.add(mid); mid.add(end);
  mid.position.set(0, -0.42, 0.02);
  end.position.set(0, -0.44, -0.02);
  upper.position.set(0, 1, 0);
  root.updateMatrixWorld(true);
  const a = mid.position.length();
  const b = end.position.length();
  const target = new THREE.Vector3(0.1, 0.35, 0.2);
  assert.equal(solveTwoBoneIk(upper, mid, end, target, new THREE.Vector3(0, 0.6, 1)), true);
  const wp = bone => bone.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.abs(wp(upper).distanceTo(wp(mid)) - a) < 1e-6);
  assert.ok(Math.abs(wp(mid).distanceTo(wp(end)) - b) < 1e-6);
  assert.ok(wp(end).distanceTo(target) < 1e-5, 'reachable target is hit');
  const knee = wp(mid);
  assert.ok(knee.z > 0.05, 'pole hint decides the bend side');
  solveTwoBoneIk(upper, mid, end, new THREE.Vector3(0, -5, 0), null);
  assert.ok(wp(upper).distanceTo(wp(end)) <= a + b + 1e-6, 'unreachable target stays within the chain length');
});

test('T37 A1: boots sit within 2 cm of the real M01 terrain on every slope/posture; planted feet and bone lengths are untouched', async () => {
  const ik = await createIkCharacters({ world });
  const ref = await createIkCharacters({ world, ik: false });
  let worstStance = 0;
  let worstBoth = 0;
  let steepest = 0;
  try {
    for (const spot of SPOTS) for (const facing of [0.2, 1.7, 3.3, -1.2]) for (const p of POSTURES) {
      const a = soldier('marek_zielinski', spot.x, spot.z, { facing, bodyYaw: facing, ...p.extra });
      ik.update([a], 6.0, { x: spot.x, z: spot.z }, 'high', null, world);
      ref.update([a], 6.0, { x: spot.x, z: spot.z }, 'high', null, world);
      const i = ik.instances.get(a.id);
      const r = ref.instances.get(a.id);
      const label = `${spot.name} facing ${facing} ${p.label}`;
      assert.equal(i.ik.mode, 'full', label);
      ik.scene.updateMatrixWorld(true); ref.scene.updateMatrixWorld(true);
      steepest = Math.max(steepest, i.ik.footIk.slopeDeg);

      const clearance = (inst, foot, ball) => {
        const f = P(inst, foot); const b = P(inst, ball);
        return Math.max(Math.abs((f.y - ANKLE_SOLE_OFFSET) - groundAt(f)), Math.abs((b.y - BALL_SOLE_OFFSET) - groundAt(b)));
      };
      const cl = clearance(i, 'foot_l', 'ball_l');
      const cr = clearance(i, 'foot_r', 'ball_r');
      worstStance = Math.max(worstStance, Math.min(cl, cr));
      assert.ok(Math.min(cl, cr) <= BOOT_TOLERANCE_M, `${label}: planted boot ${(Math.min(cl, cr) * 100).toFixed(2)} cm above terrain`);
      if (p.stationary) {
        worstBoth = Math.max(worstBoth, cl, cr);
        assert.ok(cl <= BOOT_TOLERANCE_M && cr <= BOOT_TOLERANCE_M, `${label}: both boots must be planted (L ${(cl * 100).toFixed(2)} R ${(cr * 100).toFixed(2)} cm)`);
      }
      // The module's own counter agrees with the independent measurement.
      assert.ok(Math.abs(i.ik.footIk.stanceClearanceM - Math.min(cl, cr)) < 1e-4, `${label}: reported stance clearance`);
      // The clip plants the feet: IK changes their height only.
      for (const n of ['foot_l', 'foot_r']) {
        const d = P(i, n), e = P(r, n);
        assert.ok(Math.hypot(d.x - e.x, d.z - e.z) < 1e-4, `${label}: ${n} slid horizontally`);
      }
      for (const [u, m] of [['thigh_l', 'calf_l'], ['calf_l', 'foot_l'], ['thigh_r', 'calf_r'], ['calf_r', 'foot_r'], ['upperarm_l', 'lowerarm_l'], ['lowerarm_l', 'hand_l'], ['upperarm_r', 'lowerarm_r'], ['lowerarm_r', 'hand_r']]) {
        assert.ok(Math.abs(P(i, u).distanceTo(P(i, m)) - P(r, u).distanceTo(P(r, m))) < 1e-5, `${label}: ${u}->${m} length`);
      }
      // The torso moves less than a hand-span; the head never leaves its envelope (I7: <= 0.25 m).
      assert.ok(P(i, 'head').distanceTo(P(r, 'head')) < 0.12, `${label}: head displaced ${P(i, 'head').distanceTo(P(r, 'head')).toFixed(3)} m`);
    }
    assert.ok(steepest > 26, `the matrix must include the real 26.6 deg embankment flank (got ${steepest})`);
    assert.ok(worstStance <= BOOT_TOLERANCE_M && worstBoth <= BOOT_TOLERANCE_M);
  } finally { ik.dispose(); ref.dispose(); }
});

test('T37 A1b: the body leans INTO the slope (pelvis forward on rising ground ahead, toward the rising side) and head stays near upright', async () => {
  const ik = await createIkCharacters({ world });
  const ref = await createIkCharacters({ world, ik: false });
  try {
    const x = -50; const z = 9;
    // facing +x is along the embankment (cross slope); facing pi/2 points along +z (down/up the flank).
    for (const facing of [Math.PI / 2, -Math.PI / 2]) {
      const a = soldier('marek_zielinski', x, z, { facing, bodyYaw: facing, state: 'GUARD' });
      const slope = sampleRampInclination(a, world);
      ik.update([a], 6, { x, z }, 'high', null, world);
      ref.update([a], 6, { x, z }, 'high', null, world);
      const up = inst => { const q = inst.root.getObjectByName('hips').getWorldQuaternion(new THREE.Quaternion()); return new THREE.Vector3(0, 1, 0).applyQuaternion(q); };
      const fwd = new THREE.Vector3(Math.cos(facing), 0, Math.sin(facing));
      const leanIk = up(ik.instances.get(a.id)).dot(fwd);
      const leanRef = up(ref.instances.get(a.id)).dot(fwd);
      assert.ok(Math.abs(slope.slopeForward) > 0.4, 'facing straight up/down the flank');
      assert.ok(Math.sign(leanIk - leanRef) === Math.sign(slope.slopeForward), `pelvis lean must follow slopeForward ${slope.slopeForward.toFixed(2)} (lean ${(leanIk - leanRef).toFixed(3)})`);
      assert.ok(Math.abs(leanIk - leanRef) > 0.05 && Math.abs(leanIk - leanRef) < 0.25, 'damped lean magnitude');
      const headIk = ik.instances.get(a.id).root.getObjectByName('head').getWorldQuaternion(new THREE.Quaternion());
      const headRef = ref.instances.get(a.id).root.getObjectByName('head').getWorldQuaternion(new THREE.Quaternion());
      assert.ok(headIk.angleTo(headRef) < 0.1, 'neck keeps the gaze near the horizon');
    }
  } finally { ik.dispose(); ref.dispose(); }
});

test('T37 A2 (I8): hands keep their authored weapon grip (<= 1.5 cm) and the palm stays on the socket (R <= 3 cm, L <= 5 cm) on slopes', async () => {
  const ik = await createIkCharacters({ world });
  const ref = await createIkCharacters({ world, ik: false });
  const flat = await createIkCharacters({ world, ik: false });
  try {
    const roster = [
      { id: 'marek_zielinski', team: 'ally', weapon: 'wz29' },
      { id: 'jozef_bak', team: 'ally', weapon: 'wz98a' },
      { id: 'szymon_kowal', team: 'ally', role: 'SUPPORT', weapon: 'rkm_wz28' },
      { id: 'de_rifle_1', team: 'enemy', weapon: 'kar98k' }
    ];
    let profile;
    (await loadIkAssets()).sources.get('pl:0').scene.traverse(n => { if (n.userData?.weapons) profile = n.userData; });
    const deProfile = (await loadIkAssets()).sources.get('de:0').scene;
    let deData; deProfile.traverse(n => { if (n.userData?.weapons) deData = n.userData; });

    for (const r of roster) for (const state of ['GUARD', 'SUPPRESS']) for (const f of [0.35, 2.1, -1.4]) {
      const mk = (x, z) => soldier(r.id, x, z, { team: r.team, role: r.role ?? 'RIFLEMAN', state, facing: f, bodyYaw: f, rounds: r.weapon === 'rkm_wz28' ? 18 : 5 });
      // Authored palm offset (hand-local) calibrated on the road crest (0.6 deg), IK off.
      const calib = mk(-210, 52);
      flat.update([calib], 6, { x: -210, z: 52 }, 'high', null, world);
      const fi = flat.instances.get(r.id);
      assert.equal(fi.weapon, r.weapon);
      const sock = (r.team === 'enemy' ? deData : profile).weapons[r.weapon];
      flat.scene.updateMatrixWorld(true);
      const palm = {};
      for (const side of ['l', 'r']) {
        const g = new THREE.Vector3().fromArray(sock[`grip_${side}`]).applyMatrix4(fi.root.getObjectByName('weapon').matrixWorld);
        palm[side] = fi.root.getObjectByName(`hand_${side}`).worldToLocal(g);
      }
      const palmError = (inst, side) => {
        inst.root.updateMatrixWorld(true);
        const hand = inst.root.getObjectByName(`hand_${side}`);
        const g = new THREE.Vector3().fromArray(sock[`grip_${side}`]).applyMatrix4(inst.root.getObjectByName('weapon').matrixWorld);
        return hand.localToWorld(palm[side].clone()).distanceTo(g);
      };
      for (const spot of SPOTS.slice(0, 5)) {
        const a = mk(spot.x, spot.z);
        ik.update([a], 6, { x: spot.x, z: spot.z }, 'high', null, world);
        ref.update([a], 6, { x: spot.x, z: spot.z }, 'high', null, world);
        const i = ik.instances.get(r.id); const rr = ref.instances.get(r.id);
        const label = `${r.id}/${state}/${f} @ ${spot.name}`;
        assert.equal(i.ik.mode, 'full', label);
        assert.ok(i.ik.handPin.active, label);
        assert.ok(i.ik.handPin.maxErrorM <= HAND_PIN_TOLERANCE_M, `${label}: pin error ${i.ik.handPin.maxErrorM}`);
        for (const side of ['l', 'r']) {
          const drift = P(i, `hand_${side}`).distanceTo(P(rr, `hand_${side}`));
          assert.ok(drift <= HAND_PIN_TOLERANCE_M, `${label}: hand_${side} drifted ${(drift * 100).toFixed(2)} cm from the authored grip`);
          assert.ok(i.root.getObjectByName(`hand_${side}`).getWorldQuaternion(new THREE.Quaternion()).angleTo(rr.root.getObjectByName(`hand_${side}`).getWorldQuaternion(new THREE.Quaternion())) < 0.01, `${label}: wrist orientation`);
        }
        assert.ok(palmError(i, 'r') <= 0.03, `${label}: right palm ${(palmError(i, 'r') * 100).toFixed(2)} cm from grip_r`);
        assert.ok(palmError(i, 'l') <= 0.05, `${label}: left palm ${(palmError(i, 'l') * 100).toFixed(2)} cm from grip_l`);
        // The weapon (and so the muzzle the tracers use) never moves.
        assert.deepEqual(ik.muzzle(r.id).toArray(), ref.muzzle(r.id).toArray(), `${label}: muzzle`);
        assert.deepEqual(i.root.getObjectByName('weapon').matrixWorld.toArray(), rr.root.getObjectByName('weapon').matrixWorld.toArray(), `${label}: weapon bone`);
      }
    }
  } finally { ik.dispose(); ref.dispose(); flat.dispose(); }
});

test('T37 A2b: bolt cycling, rifle reload and BAR burst keep the animated hands on their authored path while the body leans', async () => {
  const ik = await createIkCharacters({ world });
  const ref = await createIkCharacters({ world, ik: false });
  try {
    const { x, z } = SPOTS[0];
    const cases = [
      { a: soldier('marek_zielinski', x, z, { state: 'SUPPRESS', firedAt: 10, rounds: 4 }), t: 10.2, clip: 'fire_bolt' },
      { a: soldier('marek_zielinski', x, z, { state: 'SUPPRESS', reload: { startedAt: 8, duration: 3.4, mode: 'clip' } }), t: 9.5, clip: 'reload_clip' },
      { a: soldier('szymon_kowal', x, z, { role: 'SUPPORT', state: 'SUPPRESS', firedAt: 10, shot: 0.15, rounds: 17 }), t: 10.3, clip: 'rkm_fire_burst' }
    ];
    for (const c of cases) {
      ik.update([c.a], c.t, { x, z }, 'high', null, world);
      ref.update([c.a], c.t, { x, z }, 'high', null, world);
      const i = ik.instances.get(c.a.id); const r = ref.instances.get(c.a.id);
      assert.equal(i.clip, c.clip);
      assert.equal(i.ik.mode, 'full');
      for (const side of ['l', 'r']) assert.ok(P(i, `hand_${side}`).distanceTo(P(r, `hand_${side}`)) <= HAND_PIN_TOLERANCE_M, `${c.clip} hand_${side}`);
      assert.ok(i.ik.footIk.stanceClearanceM <= BOOT_TOLERANCE_M, c.clip);
    }
  } finally { ik.dispose(); ref.dispose(); }
});

test('T37 A3 (oracle): IK off is bit-identical to the current output, also after ON -> OFF, and with no world', async () => {
  const [oracle, off, toggled, noWorld, on] = await Promise.all([
    createIkCharacters({ world, ik: false }), createIkCharacters({ world, ik: false }), createIkCharacters({ world, ik: true }), createIkCharacters({ ik: true }), createIkCharacters({ world, ik: true })
  ]);
  try {
    const { x, z } = SPOTS[0];
    const roster = [
      soldier('marek_zielinski', x, z, { facing: 0.4 }),
      soldier('szymon_kowal', x - 3, z, { role: 'SUPPORT', state: 'ADVANCE', facing: 0.9, rounds: 20, motion: { speed: 1.4, odometer: 0.4, gait: 'walk', gaitSince: 0 } }),
      soldier('pawel_krawiec', x - 6, z, { role: 'ENGINEER', state: 'GUARD', crouched: true, facing: -0.3 }),
      soldier('de_rifle_1', x + 3, z, { team: 'enemy', facing: Math.PI })
    ];
    const frame = (c, t) => c.update(roster, t, { x, z }, 'high', null, c === noWorld ? undefined : world);
    for (const t of [5.0, 5.4, 5.8]) { frame(toggled, t); frame(on, t); }
    assert.equal(toggled.diagnostics.ik.counts.activeIk, 4);
    toggled.setIkEnabled(false);
    assert.equal(toggled.diagnostics.ik.enabled, false);
    for (const t of [6.0, 6.2]) for (const c of [oracle, off, toggled, noWorld, on]) frame(c, t);
    for (const a of roster) {
      const base = boneSnapshot(oracle.instances.get(a.id));
      assert.deepEqual(boneSnapshot(off.instances.get(a.id)), base, `ik:false must equal the oracle for ${a.id}`);
      assert.deepEqual(boneSnapshot(toggled.instances.get(a.id)), base, `ON->OFF must equal the oracle for ${a.id}`);
      assert.deepEqual(boneSnapshot(noWorld.instances.get(a.id)), base, `no world must equal the oracle for ${a.id}`);
      assert.deepEqual(toggled.muzzle(a.id).toArray(), oracle.muzzle(a.id).toArray());
      assert.notDeepEqual(boneSnapshot(on.instances.get(a.id)), base, `IK on must actually change ${a.id} on a 26 deg flank`);
    }
    const strip0 = c => c.stats.actors.map(({ ik, ...rest }) => rest);
    assert.deepEqual(strip0(toggled), strip0(oracle), 'diagnostics entries are unchanged apart from the ik block');
    // OFF -> ON again: the IK pose is recomputed from the clip and equals a continuously-on instance at the same clock.
    toggled.setIkEnabled(true);
    for (const c of [toggled, on]) frame(c, 6.4);
    for (const a of roster) assert.deepEqual(boneSnapshot(toggled.instances.get(a.id)), boneSnapshot(on.instances.get(a.id)), `OFF->ON must equal a continuous IK instance for ${a.id}`);
    assert.equal(toggled.diagnostics.ik.counts.activeIk, 4);
    assert.equal(oracle.stats.actors.some(e => 'ik' in e), false);
    assert.equal(oracle.diagnostics.ik.counts.activeIk, 0);
  } finally { for (const c of [oracle, off, toggled, noWorld, on]) c.dispose(); }
});

test('T37 A4: same clock re-render, constant clip tracks and pauses are bit-identical with IK on (no accumulation)', async () => {
  const c = await createIkCharacters({ world });
  try {
    const { x, z } = SPOTS[0];
    const roster = [soldier('marek_zielinski', x, z, { state: 'GUARD' }), soldier('szymon_kowal', x - 2, z, { role: 'SUPPORT', facing: 1.1, rounds: 18 })];
    c.update(roster, 8.5, { x, z }, 'high', null, world);
    const first = roster.map(a => boneSnapshot(c.instances.get(a.id)));
    for (let k = 0; k < 4; k++) c.update(roster, 8.5, { x, z }, 'high', null, world);
    roster.forEach((a, k) => assert.deepEqual(boneSnapshot(c.instances.get(a.id)), first[k], `${a.id} drifted on a paused re-render`));
    // Walk away and come back to the same clock: same pose.
    c.update(roster, 12.0, { x, z }, 'high', null, world);
    c.update(roster, 8.5, { x, z }, 'high', null, world);
    roster.forEach((a, k) => assert.deepEqual(boneSnapshot(c.instances.get(a.id)), first[k], `${a.id} not a pure function of the clock`));
  } finally { c.dispose(); }
});

test('T37 A5 (I7/I8): exact crew/station/prone/casualty/dead actors keep the authored pose bit-for-bit and no gameplay data is touched', async () => {
  const ik = await createIkCharacters({ world });
  const ref = await createIkCharacters({ world, ik: false });
  try {
    const { x, z } = SPOTS[0];
    const rifleman = soldier('marek_zielinski', x, z, { bodyYaw: 0.2 });
    const wounded = soldier('jozef_bak', x - 6, z, { state: 'WOUNDED' });
    const dead = soldier('de_fallen_1', x - 8, z, { team: 'enemy', alive: false, diedAt: 2, deathYaw: 1.1 });
    const prone = soldier('pawel_krawiec', x - 4, z, { posture: 'prone', postureSince: 1 });
    const actors = [rifleman, wounded, dead, prone];
    const saved = structuredClone(actors);
    const hitboxes = actors.map(a => actorHitboxes(a));
    const eyes = actors.map(a => eyePosition(a));
    ik.update(actors, 8.5, { x, z }, 'high', null, world);
    ref.update(actors, 8.5, { x, z }, 'high', null, world);
    assert.deepEqual(actors, saved, 'actors are never mutated');
    assert.deepEqual(actors.map(a => actorHitboxes(a)), hitboxes);
    assert.deepEqual(actors.map(a => eyePosition(a)), eyes);
    assert.deepEqual(ik.muzzle(rifleman.id).toArray(), ref.muzzle(rifleman.id).toArray());
    for (const a of [wounded, dead, prone]) {
      const inst = ik.instances.get(a.id);
      if (!inst) continue; // dead actors may be culled by the existing selection; they must never reach IK anyway
      assert.equal(inst.ik.mode, 'bypassed_exact', `${a.id} (${inst.clip})`);
      assert.deepEqual(boneSnapshot(inst), boneSnapshot(ref.instances.get(a.id)), `${a.id} (${inst.clip}) must stay bit-identical to the clip`);
    }
    assert.equal(ik.instances.get(rifleman.id).ik.mode, 'full');
    // Eligibility gate (pure): exact families and casualties.
    const live = soldier('x', 0, 0);
    for (const clip of ['mg34_prone_fire_burst', 'mg34_loader_prone_idle', 'ckm_wz30_gunner_aim', 'station_drag_medic_grab', 'drag_wounded', 'wounded', 'carried', 'fallen', 'seated', 'prone_idle', 'prone_enter', 'carry_pickup_carrier', 'rkm_prone', null]) {
      assert.equal(isFootIkEligible(live, clip), false, String(clip));
    }
    for (const clip of ['standing_idle', 'aim', 'fire_bolt', 'reload_clip', 'walk', 'run', 'sprint', 'crouch_walk', 'crouched_idle', 'pinned', 'sapper_work', 'carry_walk', 'rkm_walk', 'rkm_aim', 'turn_left', 'hit_front']) {
      assert.equal(isFootIkEligible(live, clip), true, clip);
    }
    assert.equal(isFootIkEligible({ ...live, carriedBy: 'jozef_bak' }, 'walk'), false);
    assert.equal(isFootIkEligible({ ...live, alive: false }, 'walk'), false);
    assert.equal(isFootIkEligible({ ...live, posture: 'prone' }, 'walk'), false);
  } finally { ik.dispose(); ref.dispose(); }
});

test('T37 A6: fidelity tiers - distance/actor budgets, LOD1/LOD2 actors stay planted, slope_only never moves feet, counters per tier', async () => {
  const c = await createIkCharacters({ world });
  const ref = await createIkCharacters({ world, ik: false });
  try {
    const player = { x: -50, z: 9 };
    const actors = Array.from({ length: 30 }, (_, i) => {
      const dist = 3 + i * 5.3;
      const x = player.x - dist; const z = player.z + ((i % 3) - 1) * 1.5;
      return soldier(`tier_actor_${String(i).padStart(2, '0')}`, x, z, { team: i % 2 ? 'enemy' : 'ally', role: i % 5 === 0 ? 'SUPPORT' : 'RIFLEMAN', state: i % 2 ? 'ADVANCE' : 'SUPPRESS', crouched: i % 4 === 0, facing: 0.2 * (i % 4) });
    });
    for (const tier of ['high', 'medium', 'low']) {
      c.update(actors, 12.0, player, tier, null, world);
      ref.update(actors, 12.0, player, tier, null, world);
      const ikd = c.diagnostics.ik;
      const policy = M01_IK_TIER_POLICY[tier];
      assert.equal(ikd.enabled, true);
      assert.equal(ikd.tier, tier);
      assert.deepEqual(ikd.policy, policy);
      assert.equal(ikd.counts.skinned, c.stats.active);
      assert.ok(ikd.counts.full <= policy.maxFullIkActors);
      assert.ok(ikd.counts.full + ikd.counts.footSlope <= policy.maxFootIkActors);
      assert.ok(ikd.counts.full + ikd.counts.footSlope + ikd.counts.slopeOnly <= policy.maxSlopeActors);
      assert.equal(ikd.counts.full + ikd.counts.footSlope + ikd.counts.slopeOnly + ikd.counts.clipOnly + ikd.counts.bypassedExact, ikd.counts.skinned);
      assert.ok(ikd.counts.activeIk <= ikd.counts.full + ikd.counts.footSlope + ikd.counts.slopeOnly);
      assert.ok(ikd.counts.full > 0 && ikd.counts.footSlope + ikd.counts.slopeOnly + ikd.counts.clipOnly > 0, `${tier} must exercise several modes`);
      for (const k of ['lastTotalMs', 'lastFootIkMs', 'lastHandPinMs']) assert.ok(Number.isFinite(ikd.cost[k]) && ikd.cost[k] >= 0, k);
      assert.ok(ikd.accuracy.maxBootClearanceM <= BOOT_TOLERANCE_M && ikd.accuracy.maxHandErrorM <= HAND_PIN_TOLERANCE_M, `${tier} accuracy`);
      assert.equal('fps' in ikd, false);
      assert.equal('fps' in ikd.cost, false);
      for (const [id, i] of c.instances) {
        const r = ref.instances.get(id);
        const mode = i.ik?.mode;
        c.scene.updateMatrixWorld(true); ref.scene.updateMatrixWorld(true);
        const dist = Math.hypot(i.root.position.x - player.x, i.root.position.z - player.z);
        if (mode === 'full') assert.ok(dist <= policy.fullIkMaxDistance * 1.1);
        if (mode === 'full' || mode === 'foot_slope') {
          const fl = Math.min(
            Math.abs(P(i, 'foot_l').y - ANKLE_SOLE_OFFSET - groundAt(P(i, 'foot_l'))),
            Math.abs(P(i, 'foot_r').y - ANKLE_SOLE_OFFSET - groundAt(P(i, 'foot_r'))));
          assert.ok(fl <= BOOT_TOLERANCE_M, `${tier} ${id} ${mode} (${i.key}) planted boot ${(fl * 100).toFixed(2)} cm`);
        } else if (mode === 'slope_only') {
          for (const n of ['foot_l', 'foot_r', 'ball_l', 'ball_r']) assert.equal(P(i, n).distanceTo(P(r, n)), 0, `${tier} ${id}: slope_only must not move ${n}`);
          assert.ok(P(i, 'head').distanceTo(P(r, 'head')) > 0 || i.ik.footIk.pitch === 0, 'slope_only leans the upper body');
        } else if (mode === 'clip_only' || mode === 'bypassed_exact') {
          assert.deepEqual(boneSnapshot(i), boneSnapshot(r), `${tier} ${id} ${mode} untouched`);
        }
      }
    }
    const by = c.diagnostics.ik.byTier;
    assert.ok(by.high.fullIkActors > by.medium.fullIkActors && by.medium.fullIkActors > by.low.fullIkActors, 'full-IK actors: high > medium > low');
    assert.ok(by.high.footIkSolved > by.medium.footIkSolved && by.medium.footIkSolved > by.low.footIkSolved, 'foot-IK actors: high > medium > low');
    assert.ok(by.low.clipOnlyActors > 0, 'low hands distant actors to zero-cost clip_only');
    assert.ok(by.high.frames === 1 && by.medium.frames === 1 && by.low.frames === 1);
  } finally { c.dispose(); ref.dispose(); }
});

test('T37 A6b: tier resolver is deterministic, budgeted and has distance hysteresis', () => {
  const actor = soldier('x', 0, 0);
  const counters = { full: 0, foot: 0, slope: 0 };
  assert.equal(resolveIkTierMode(actor, 10, 'high', counters, 'walk'), 'full');
  assert.equal(resolveIkTierMode(actor, 70, 'high', counters, 'walk'), 'foot_slope');
  assert.equal(resolveIkTierMode(actor, 130, 'high', counters, 'walk'), 'slope_only');
  assert.equal(resolveIkTierMode(actor, 200, 'high', counters, 'walk'), 'clip_only');
  assert.deepEqual(counters, { full: 1, foot: 2, slope: 3 });
  assert.equal(resolveIkTierMode(actor, 10, 'high', { full: 0, foot: 0, slope: 0 }, 'mg34_aim'), 'bypassed_exact');
  const full = { full: M01_IK_TIER_POLICY.low.maxFullIkActors, foot: 0, slope: 0 };
  assert.equal(resolveIkTierMode(actor, 5, 'low', full, 'walk'), 'foot_slope', 'budget exhausted falls to the next tier');
  assert.equal(resolveIkTierMode(actor, 46, 'high', { full: 0, foot: 0, slope: 0 }, 'walk'), 'foot_slope');
  assert.equal(resolveIkTierMode(actor, 46, 'high', { full: 0, foot: 0, slope: 0 }, 'walk', 'full'), 'full', 'hysteresis keeps the better tier near the boundary');
  assert.equal(resolveIkTierMode(actor, 60, 'high', { full: 0, foot: 0, slope: 0 }, 'walk', 'full'), 'foot_slope');
});

test('T37 A7: live M01 simulation frames - accuracy bounds hold at every tier and the simulation is untouched', async () => {
  const d = toRepair(driver());
  const sim = d.sim;
  const c = await createIkCharacters({ world: sim.world });
  try {
    for (const tier of ['high', 'medium', 'low']) {
      for (let f = 0; f < 30; f++) {
        sim.tick(0.05, {});
        const before = JSON.stringify(sim.snapshot());
        c.update(sim.actors, sim.clock, sim.player, tier, sim.battleClock, sim.world);
        assert.equal(JSON.stringify(sim.snapshot()), before, 'characters.update must not touch the simulation');
        const ikd = c.diagnostics.ik;
        assert.ok(ikd.accuracy.maxBootClearanceM <= BOOT_TOLERANCE_M, `${tier} frame ${f}: ${ikd.accuracy.maxBootClearanceM}`);
        assert.ok(ikd.accuracy.maxHandErrorM <= HAND_PIN_TOLERANCE_M, `${tier} frame ${f}: ${ikd.accuracy.maxHandErrorM}`);
      }
      const ikd = c.diagnostics.ik;
      assert.equal(ikd.tier, tier);
      assert.ok(ikd.counts.skinned > 0 && ikd.counts.activeIk > 0, `${tier}: real roster must produce IK work`);
      assert.ok(ikd.byTier[tier].frames >= 30);
    }
  } finally { c.dispose(); }
});

test('T37 A8: no THREE object is constructed inside the IK hot path (module scratch only) and the per-frame garbage stays at boxed-number level', async () => {
  // Static guard (threejs-conventions: no new Vector3/Quaternion per actor per frame). Only bindCharacterIkRig (once per instance) may construct.
  for (const file of ['m01-foot-ik.js', 'm01-hand-pin.js']) {
    const lines = readFileSync(new URL(`../src/render/${file}`, import.meta.url), 'utf8').split('\n');
    let fn = '';
    lines.forEach((line, n) => {
      const top = /^(?:export )?(?:async )?(?:function|class) ([A-Za-z0-9_]+)/.exec(line);
      if (top) fn = top[1];
      else if (/^(?:export )?const /.test(line)) fn = '';
      if (/\bnew THREE\./.test(line) && /^\s/.test(line)) {
        assert.equal(fn, 'bindCharacterIkRig', `${file}:${n + 1} constructs a THREE object inside ${fn || 'a hot path'}`);
      }
    });
  }
  const c = await createIkCharacters({ world });
  try {
    const player = { x: -50, z: 9 };
    const actors = Array.from({ length: 16 }, (_, i) => soldier(`alloc_${String(i).padStart(2, '0')}`, player.x - 3 - i * 2, player.z + (i % 3), {
      team: i % 2 ? 'enemy' : 'ally', state: i % 2 ? 'ADVANCE' : 'SUPPRESS', facing: 0.3 * i, bodyYaw: 0.3 * i,
      ...(i % 2 ? { motion: { speed: 1.4, odometer: 0.2 * i, gait: 'walk', gaitSince: 0 } } : {})
    }));
    c.update(actors, 12.0, player, 'high', null, world);
    assert.ok(c.diagnostics.ik.counts.activeIk >= 12);
    const entries = actors.map(a => ({ actor: a, inst: c.instances.get(a.id), distance: Math.hypot(a.x - player.x, a.z - player.z), view: null }));
    // TczewWorld.heightAt itself allocates (simulation-side code, ~0.3-0.8 KB per call); a plane sampler isolates the IK modules.
    const plane = (x, z) => -1.7 + 0.5 * (z - 9) - 0.002 * (x + 50);
    v8.setFlagsFromString('--expose-gc');
    const gc = vm.runInNewContext('gc');
    const newSpace = () => v8.getHeapSpaceStatistics().find(s => s.space_name === 'new_space').space_used_size;
    const frame = () => updateActorsIk(entries, entries.length, 'high', 12, plane, c.ikState);
    for (let k = 0; k < 2000; k++) frame(); // JIT warm-up
    gc();
    const before = newSpace();
    const calls = 40;
    for (let k = 0; k < calls; k++) frame();
    const perCall = (newSpace() - before) / calls;
    assert.ok(perCall < 96 * 1024, `updateActorsIk produces ${(perCall / 1024).toFixed(1)} KB of garbage per 16-actor frame`);
  } finally { c.dispose(); }
});

test('T37 A9: dispose removes the debug hook and only the debug switch exposes it', async () => {
  const c = await createIkCharacters({ world, debug: false });
  assert.equal(typeof globalThis.window, 'undefined');
  assert.equal(c.ikDebug, undefined);
  assert.equal(c.setIkEnabled(false), false);
  assert.equal(c.setIkEnabled(true), true);
  c.dispose();
  globalThis.window = {};
  try {
    const d = await createIkCharacters({ world, debug: true });
    assert.equal(typeof window.m01CharacterIkDebug.setEnabled, 'function');
    window.m01CharacterIkDebug.setEnabled(false);
    assert.equal(d.diagnostics.ik.enabled, false);
    d.dispose();
    assert.equal('m01CharacterIkDebug' in window, false);
  } finally { delete globalThis.window; }
});
