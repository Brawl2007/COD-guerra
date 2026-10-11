// Shared authoring helpers for the M01 soldier clip library V2. Pure functions of the locked bind pose: no RNG, no
// clock, no root motion. The rifle carriage, foot placement and kneeling body are the ones of the shipped
// `standing_idle` / `crouched_idle` (tools/assets/m01-soldiers/src/clips.mjs), repeated here because that module keeps
// them private and its source is pinned by other packages; `tests/m01-soldiers-glb.test.js` proves the junctions.
import * as THREE from 'three';
import { GAME_BONES } from '../../src/human.mjs';
import { q, solve, weaponPoint, weaponDir } from '../../src/pose.mjs';
import { v3 } from '../../src/meshops.mjs';

export { THREE, q, solve, weaponPoint, weaponDir, v3 };
export const TAU = Math.PI * 2;
export const deg = Math.PI / 180;
export const N = v3.norm;
export const clamp01 = x => Math.max(0, Math.min(1, x));
export const ease = x => { const t = clamp01(x); return t * t * t * (10 + t * (-15 + t * 6)); };
export const blend = (u, a, b) => ease((u - a) / (b - a));
export const mix = (a, b, t) => Array.isArray(a) ? a.map((x, i) => x + (b[i] - x) * t) : a + (b - a) * t;
/** Piecewise eased curve through [u, value] points. */
export const wave = (u, points) => {
  if (u <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) if (u <= points[i][0]) return mix(points[i - 1][1], points[i][1], blend(u, points[i - 1][0], points[i][0]));
  return points.at(-1)[1];
};
/** Smooth bump: 0 outside [a, d], 1 on [b, c]. */
export const bump = (u, a, b, c, d) => blend(u, a, b) * (1 - blend(u, c, d));

// ——— Rifle carriage (same wrist profile as the shipped clips) ———
export const GRIP_R = { pos: [0.044, 0.02, 0.088], fdir: N([-0.3, -0.55, -0.78]), palm: N([-1, 0, 0.12]) };
export const GRIP_L = { pos: [-0.03, -0.034, -0.29], fdir: N([0.55, 0.12, -0.83]), palm: N([-0.25, 1, 0.05]) };
export const fingersRifle = { l: { curl: 0.62, thumb: 0.55 }, r: { curl: 0.72, index: 0.35, thumb: 0.6 } };
export const rifleFrame = (grip, fore, up = [0, 1, 0]) => ({ pos: grip, rot: q.frame([0, 0, -1], [0, 1, 0], N(v3.sub(fore, grip)), up) });
export const rifleAt = (pos, F, up = [0, 1, 0]) => ({ pos, rot: q.frame([0, 0, -1], [0, 1, 0], N(F), up) });
export const handOn = (w, g) => ({ pos: weaponPoint(w, g.pos), fdir: weaponDir(w, g.fdir), palm: weaponDir(w, g.palm) });
export const holdRifle = w => ({ weapon: w, hands: { r: { ...handOn(w, GRIP_R), pole: [0.7, -0.6, 0.35] }, l: { ...handOn(w, GRIP_L), pole: [-0.35, -1, 0.1] } }, fingers: fingersRifle });
export const lowReady = (W, k = 0) => {
  const grip = v3.add(W.spine_01.p, q.rot(W.spine_01.r, [0.13, 0.1 + k * 0.01, -0.13]));
  const fore = v3.add(grip, q.rot(W.spine_01.r, N([-0.6, -0.25, -0.76])));
  return rifleFrame(grip, fore, q.rot(W.spine_01.r, N([0.25, 1, 0])));
};
export const portArms = W => {
  const grip = v3.add(W.spine_02.p, q.rot(W.spine_02.r, [0.11, -0.08, -0.17]));
  const fore = v3.add(grip, q.rot(W.spine_02.r, N([-0.55, 0.62, -0.38])));
  return rifleFrame(grip, fore, q.rot(W.spine_02.r, N([0.3, 0.3, -1])));
};
/** Rifle on the back (sling), relative to spine_03. */
export function slung(R, base) {
  const W = solve(R, base).W.spine_03;
  return rifleAt(v3.add(W.p, q.rot(W.r, [0.05, -0.12, 0.17])), q.rot(W.r, N([-0.45, 0.88, 0.1])), q.rot(W.r, [0, 0, 1]));
}

/** Foot on the ground: ankle at (x, z) with yaw (deg) and optional pitch / toe roll; knee pole points forward. */
export function foot(x, z, { yaw = 0, y = 0.072, pitch = 0, toe = 0, out = 0.25 } = {}) {
  const rot = q.mul(q.axis([0, 1, 0], yaw), q.axis([1, 0, 0], -pitch));
  const fwd = q.rot(rot, [0, 0, -1]);
  return { pos: [x, y, z], rot, pole: N(v3.add(fwd, [Math.sign(x) * out, 0, 0])), toe };
}

/** Two-pass solve: body first (to know eye / shoulders), then rifle and hands. */
export const compose = (R, body, extra) => {
  const pre = solve(R, body);
  return solve(R, { ...body, ...extra(pre.W) });
};

// ——— Body descriptors copied from the shipped idles ———
export const STAND = () => ({ hips: { pos: [0, 0.905, 0.062], rot: {} }, feet: { l: foot(-0.12, 0.0, { yaw: 8 }), r: foot(0.12, 0.02, { yaw: -10 }) } });
/** `standing_idle` at phase u (u = 0 is the junction pose). */
export function standingBody(u = 0) {
  const b = Math.sin(u * TAU), sh = Math.sin(u * TAU * 0.5);
  return { ...STAND(), hips: { pos: [0.012 * sh, 0.905 + 0.004 * b, 0.062], rot: { roll: -1.5 * sh, yaw: 2 * sh } },
    spine: [{ pitch: 1 + b }, { pitch: 1.5 * b }, { pitch: 1 + b }], neck: { pitch: 2, yaw: -3 * sh }, head: { pitch: 2, yaw: 4 * sh } };
}
/** `crouched_idle` body (right knee on the ground). */
export function kneelBody(b = 0, { low = 0, bend = 10 } = {}) {
  return {
    hips: { pos: [0.02, 0.5 - low + 0.004 * b, 0.12], rot: { pitch: 6 + bend * 0.3, yaw: -6 } },
    spine: [{ pitch: bend * 0.4 + b }, { pitch: bend * 0.35 }, { pitch: bend * 0.25 + b * 0.5 }], neck: { pitch: 4 }, head: { pitch: 2 },
    feet: { l: foot(-0.14, -0.26, { yaw: 6 }), r: foot(0.14, 0.5, { yaw: -8, y: 0.11, pitch: 40, toe: 45 }) },
  };
}
export const readyPose = (R, body, k = 0) => compose(R, body, W => holdRifle(lowReady(W, k)));
export const portPose = (R, body) => compose(R, body, W => holdRifle(portArms(W)));

// ——— Descriptor interpolation (IK is solved after mixing, so feet stay on their targets) ———
const keysOf = (...o) => [...new Set(o.flatMap(x => Object.keys(x ?? {})))];
const mixEuler = (a, b, t) => Object.fromEntries(keysOf(a, b).map(k => [k, mix(a?.[k] ?? 0, b?.[k] ?? 0, t)]));
function mixFoot(a, b, t) {
  const pos = mix(a.pos, b.pos, t), rot = q.slerp(a.rot ?? q.id(), b.rot ?? q.id(), t);
  return { pos, rot, pole: N(mix(a.pole, b.pole, t)), toe: mix(a.toe ?? 0, b.toe ?? 0, t) };
}
/** Interpolates two body descriptors ({hips:{pos,rot}, spine[3], neck, head, clav, jaw, feet}). */
export function mixBody(a, b, t) {
  const out = { hips: { pos: mix(a.hips.pos, b.hips.pos, t), rot: mixEuler(a.hips.rot, b.hips.rot, t) },
    spine: [0, 1, 2].map(i => mixEuler(a.spine?.[i], b.spine?.[i], t)), neck: mixEuler(a.neck, b.neck, t), head: mixEuler(a.head, b.head, t),
    clav: { l: mixEuler(a.clav?.l, b.clav?.l, t), r: mixEuler(a.clav?.r, b.clav?.r, t) }, feet: { l: mixFoot(a.feet.l, b.feet.l, t), r: mixFoot(a.feet.r, b.feet.r, t) } };
  if (a.jaw !== undefined || b.jaw !== undefined) out.jaw = mix(a.jaw ?? 0, b.jaw ?? 0, t);
  return out;
}

// ——— Baking ———
const SKIP_BONES = new Set(['root', 'carry_socket', 'eye_l', 'eye_r']);
/**
 * Samples `poseAt(u, t)` (u = t / duration) at `fps` and returns a THREE.AnimationClip. Rotation tracks carry the sign
 * of the previous key (no flips); constant tracks keep two endpoint keys; weapon / magazine / clip scales are STEP.
 * The final key is evaluated at u = 1 exactly, so a periodic generator gives identical first and last keys.
 */
export function bakeClip(name, duration, fps, poseAt) {
  const count = Math.max(2, Math.round(duration * fps)), times = Array.from({ length: count + 1 }, (_, i) => duration * i / count);
  const poses = times.map((t, i) => poseAt(i / count, t));
  const tracks = [];
  const add = (track, Type, values, width, interpolation = THREE.InterpolateLinear) => {
    const constant = values.every((v, i) => Math.abs(v - values[i % width]) < 1e-9);
    tracks.push(new Type(track, constant ? [0, duration] : times, constant ? [...values.slice(0, width), ...values.slice(0, width)] : values, interpolation));
  };
  for (const b of GAME_BONES) {
    if (SKIP_BONES.has(b.name)) continue;
    const rotations = poses.map(p => p.local[b.name] ?? q.id());
    if (b.name === 'jaw' && rotations.every(r => Math.abs(r[3]) > 0.9999999)) continue;
    for (let i = 1; i < rotations.length; i++) if (rotations[i].reduce((s, x, k) => s + x * rotations[i - 1][k], 0) < 0) rotations[i] = rotations[i].map(x => -x);
    add(`${b.name}.quaternion`, THREE.QuaternionKeyframeTrack, rotations.flat(), 4);
    const translations = poses.map(p => p.trans[b.name]);
    if (translations.every(Boolean)) add(`${b.name}.position`, THREE.VectorKeyframeTrack, translations.flat(), 3);
  }
  for (const [bone, rest] of [['weapon', 1], ['weapon_mag', 1], ['weapon_clip', 0]]) {
    const s = poses.map(p => p.scale?.[bone] ?? rest);
    add(`${bone}.scale`, THREE.VectorKeyframeTrack, s.flatMap(v => [v, v, v]), 3, THREE.InterpolateDiscrete);
  }
  return new THREE.AnimationClip(name, duration, tracks);
}
