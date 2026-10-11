// 240 Hz clip audit for the clip library: real three.js GLTFLoader + AnimationMixer on the exported GLB, ankle bones
// (`foot_l` / `foot_r`) as the foot proxy, exactly the instrument of the rifleman locomotion pilot
// (tools/verification/m01-rifleman-clip-audit.mjs on codex/m01-rifleman-locomotion-runtime):
//   locomotion clips: ankle <= minY + 15 mm, local Z velocity > 0.2 m/s (backward support) and under max(0.05, 6 % of the nominal
//   speed) in the root-compensated frame, windows > 25 ms;
//   static / transition clips: ankle at most 0.13 m high and slower than 0.10 m/s in the root-compensated frame.
// Root compensation: locomotion clips add the nominal forward travel, turn clips the linear body yaw.
// Everything here is a pure function of the GLB; the numbers are written into the clips' `extras` and re-measured by
// tests/m01-soldiers-glb.test.js.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const HZ = 240;
const rounded = (x, d = 6) => Number(x.toFixed(d));
const mm = x => rounded(x * 1000, 3);
export const POSE_BONES = ['hips', 'spine_03', 'head', 'hand_l', 'hand_r', 'foot_l', 'foot_r', 'weapon', 'thigh_l', 'thigh_r'];
const QUAT_BONES = ['hips', 'spine_03', 'head', 'weapon', 'upperarm_l', 'upperarm_r', 'thigh_l', 'thigh_r'];
const Y = new THREE.Vector3(0, 1, 0);

export async function parseGLB(buffer) {
  globalThis.ProgressEvent ??= class { constructor(type, init) { this.type = type; Object.assign(this, init); } };
  const bytes = buffer.buffer ? buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) : buffer;
  return new GLTFLoader().parseAsync(bytes, '');
}

/** 240 Hz samples of one clip: ankle / key-bone world positions, key quaternions and the root transform. */
export function sampleClip(scene, mixer, clip, hz = HZ) {
  mixer.stopAllAction();
  const action = mixer.clipAction(clip); action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play();
  const bones = Object.fromEntries([...new Set([...POSE_BONES, ...QUAT_BONES, 'root'])].map(n => [n, scene.getObjectByName(n)]));
  const n = Math.max(2, Math.ceil(clip.duration * hz)), samples = [], v = new THREE.Vector3(), qq = new THREE.Quaternion();
  for (let i = 0; i <= n; i++) {
    const t = i * clip.duration / n; action.reset().play(); mixer.setTime(t); scene.updateMatrixWorld(true);
    const s = { t, pos: {}, quat: {} };
    for (const b of POSE_BONES) s.pos[b] = bones[b].getWorldPosition(v).toArray();
    for (const b of QUAT_BONES) s.quat[b] = bones[b].getWorldQuaternion(qq).normalize().toArray();
    s.root = bones.root.getWorldPosition(v).toArray(); s.rootQuat = bones.root.getWorldQuaternion(qq).toArray();
    samples.push(s);
  }
  mixer.stopAllAction(); mixer.uncacheClip(clip);
  return samples;
}

const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const quatAngle = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3])));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Foot position in the frame that stays on the ground when the actor moves / turns as the model assumes. */
function compensated(sample, bone, model, duration) {
  const p = new THREE.Vector3().fromArray(sample.pos[bone]);
  if (model.mode === 'locomotion') p.z -= model.speedMps * sample.t;
  if (model.yawDeg) p.applyAxisAngle(Y, THREE.MathUtils.degToRad(model.yawDeg * sample.t / duration));
  return p;
}

function contactWindows(samples, side, model, duration) {
  const bone = `foot_${side}`, windows = [], dt = samples[1].t - samples[0].t, ys = samples.map(s => s.pos[bone][1]), minY = Math.min(...ys);
  const supportVelocities = [];
  let start = null;
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i], b = samples[i + 1];
    let plant;
    if (model.mode === 'locomotion') {
      const velocity = (b.pos[bone][2] - a.pos[bone][2]) / dt;
      // Pilot rule, plus: stationary on the ground in the compensated frame (drops the trailing push-off of a swing).
      const pa = compensated(a, bone, model, duration), pb = compensated(b, bone, model, duration);
      plant = a.pos[bone][1] <= minY + 0.015 && b.pos[bone][1] <= minY + 0.015 && velocity > 0.2 && Math.hypot(pb.x - pa.x, pb.z - pa.z) / dt < Math.max(0.05, 0.06 * model.speedMps);
      if (plant) supportVelocities.push(velocity);
    } else {
      const pa = compensated(a, bone, model, duration), pb = compensated(b, bone, model, duration);
      plant = Math.max(a.pos[bone][1], b.pos[bone][1]) <= 0.13 && Math.hypot(pb.x - pa.x, pb.z - pa.z) / dt < 0.10 && Math.abs(pb.y - pa.y) / dt < 0.10;
    }
    if (plant && start === null) start = i;
    if (start !== null && (!plant || i === samples.length - 2)) {
      const end = plant ? i + 1 : i;
      if (samples[end].t - samples[start].t > 0.025) windows.push({ start, end });
      start = null;
    }
  }
  const out = windows.map(w => {
    const pts = []; for (let i = w.start; i <= w.end; i++) pts.push(compensated(samples[i], bone, model, duration));
    const xs = pts.map(p => p.x), zs = pts.map(p => p.z), yv = pts.map(p => p.y);
    return { startS: rounded(samples[w.start].t), endS: rounded(samples[w.end].t), driftM: Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)), liftM: Math.max(...yv) - Math.min(...yv) };
  });
  return { windows: out, supportVelocities, minY };
}

/**
 * Audit of one clip. `model` = { mode: 'locomotion' | 'planted', speedMps?, cycleM?, yawDeg? } (stored in the clip extras),
 * `loop` closes the seam check, `stillS` asks for a stationary tail, `refs` maps 'name t0' to a pose signature.
 */
export function auditSamples(samples, clip, { model, loop, stillS = 0 }) {
  const duration = clip.duration, dt = samples[1].t - samples[0].t, result = { sampleHz: HZ, samples: samples.length, durationS: rounded(duration) };
  let rootRange = 0;
  for (const s of samples) rootRange = Math.max(rootRange, dist(s.root, samples[0].root), quatAngle(s.rootQuat, samples[0].rootQuat));
  result.rootDisplacementM = rounded(rootRange, 9);
  const contacts = {}, drift = {}, lift = {}; let support = [];
  for (const side of ['l', 'r']) {
    const c = contactWindows(samples, side, model, duration);
    contacts[side] = c.windows.map(w => [w.startS, w.endS]);
    drift[side] = mm(Math.max(0, ...c.windows.map(w => w.driftM))); lift[side] = mm(Math.max(0, ...c.windows.map(w => w.liftM)));
    support = support.concat(c.supportVelocities);
  }
  result.contacts = contacts; result.footDriftMm = drift; result.footLiftMm = lift;
  result.maxContactDriftMm = Math.max(drift.l, drift.r, lift.l, lift.r);
  if (model.mode === 'locomotion' && support.length) {
    result.supportSpeedMps = { min: rounded(Math.min(...support)), median: rounded(median(support)), max: rounded(Math.max(...support)) };
    result.measuredNominalSpeedMps = rounded(median(support));
  }
  if (loop) {
    const last = samples.length - 1;
    let pos = 0, ang = 0, vel = 0;
    for (const b of POSE_BONES) {
      pos = Math.max(pos, dist(samples[0].pos[b], samples[last].pos[b]));
      for (let k = 0; k < 3; k++) vel = Math.max(vel, Math.abs((samples[1].pos[b][k] - samples[0].pos[b][k]) / dt - (samples[last].pos[b][k] - samples[last - 1].pos[b][k]) / dt));
    }
    for (const b of QUAT_BONES) ang = Math.max(ang, quatAngle(samples[0].quat[b], samples[last].quat[b]));
    result.loopSeam = { positionMm: mm(pos), angleRad: rounded(ang), velocityMps: rounded(vel) };
  }
  // Largest per-sample jump of any key bone (a pop shows up here); metres per second.
  let jump = 0; for (let i = 1; i < samples.length; i++) for (const b of POSE_BONES) jump = Math.max(jump, dist(samples[i].pos[b], samples[i - 1].pos[b]) / dt);
  result.maxBoneSpeedMps = rounded(jump, 3);
  if (stillS > 0) {
    const from = samples.findIndex(s => s.t >= duration - stillS - 1e-9); let m = 0;
    for (const b of POSE_BONES) for (let i = from; i < samples.length; i++) m = Math.max(m, dist(samples[i].pos[b], samples.at(-1).pos[b]));
    result.finalStillMm = mm(m);
  }
  return result;
}

/** Pose signature for junction checks: key-bone positions and quaternions of one sample. */
export const signature = s => ({ pos: s.pos, quat: s.quat });
export function junction(a, b) {
  let pos = 0, ang = 0;
  for (const k of POSE_BONES) pos = Math.max(pos, dist(a.pos[k], b.pos[k]));
  for (const k of QUAT_BONES) ang = Math.max(ang, quatAngle(a.quat[k], b.quat[k]));
  return { positionMm: mm(pos), angleRad: rounded(ang) };
}
