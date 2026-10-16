// Original authored motion for the existing M01 bind pose. The curves describe
// support, compression, recovery and weapon carriage; the preserved two-bone
// solver bakes those constraints into ordinary glTF tracks. No runtime IK or RNG.
import * as THREE from 'three';
import { GAME_BONES } from '../src/human.mjs';
import { q, solve, weaponPoint, weaponDir } from '../src/pose.mjs';
import { v3 } from '../src/meshops.mjs';

const TAU = Math.PI * 2;
const clamp = x => Math.max(0, Math.min(1, x));
const ease = x => { const t = clamp(x); return t * t * t * (10 + t * (-15 + t * 6)); };
const blend = (u, a, b) => ease((u - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const wave = (u, points) => {
  if (u <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) if (u <= points[i][0]) return lerp(points[i - 1][1], points[i][1], blend(u, points[i - 1][0], points[i][0]));
  return points.at(-1)[1];
};
const rotate = (v, yaw) => q.rot(q.axis([0, 1, 0], yaw), v);

// Wrist offsets deliberately match the already shipped rifle grip profile.
// These are hand frames around the stock, not the centre-line muzzle sockets.
export const GRIPS = {
  r: { pos: [0.044, 0.020, 0.088], fdir: v3.norm([-0.3, -0.55, -0.78]), palm: v3.norm([-1, 0, 0.12]) },
  l: { pos: [-0.030, -0.034, -0.290], fdir: v3.norm([0.55, 0.12, -0.83]), palm: v3.norm([-0.25, 1, 0.05]) },
};

function boot(R, side, x, z, lift = 0, yaw = 0, pitch = 0) {
  const rot = q.mul(q.axis([0, 1, 0], yaw), q.axis([1, 0, 0], pitch));
  // Sole support envelope: compensate heel/toe rotation about the ankle instead
  // of rotating a planted sole through the floor. The actual skinned boots are
  // subsequently checked by GLTFLoader + AnimationMixer, including LOD2.
  const h = R.J[`foot_${side}`][1];
  const soleY = Math.max(...[-0.190, 0.100].map(zz => -q.rot(rot, [0, -h, zz])[1]));
  return { pos: [x, soleY + 0.004 + lift, z], rot, pole: v3.norm(v3.add(rotate([0, 0, -1], yaw), [side === 'l' ? -0.15 : 0.15, 0, 0])) };
}

function hold(R, body, mode = 'low', sway = 0, yawLead = 0) {
  const W = solve(R, body).W, chest = W[mode === 'port' ? 'spine_02' : 'spine_01'];
  const offset = mode === 'port' ? [0.11, -0.045 + 0.006 * sway, -0.19] : [0.13, 0.10, -0.13];
  const forward = mode === 'port' ? [-0.49, 0.60, -0.63] : [-0.60, -0.25, -0.76];
  const up = mode === 'port' ? [0.30, 0.60, -0.65] : [0.25, 1, 0];
  const orientation = q.mul(chest.r, q.axis([0, 1, 0], yawLead));
  const weapon = { pos: v3.add(chest.p, q.rot(chest.r, offset)), rot: q.frame([0, 0, -1], [0, 1, 0], q.rot(orientation, v3.norm(forward)), q.rot(orientation, v3.norm(up))) };
  const hands = {};
  for (const side of ['l', 'r']) hands[side] = {
    pos: weaponPoint(weapon, GRIPS[side].pos), fdir: weaponDir(weapon, GRIPS[side].fdir), palm: weaponDir(weapon, GRIPS[side].palm),
    pole: q.rot(chest.r, side === 'r' ? [0.7, -0.6, 0.35] : [-0.35, -1, 0.1]),
  };
  return { ...solve(R, { ...body, weapon, hands, fingers: { l: { curl: 0.62, thumb: 0.55 }, r: { curl: 0.72, index: 0.35, thumb: 0.6 } } }), authoredFeet: body.feet };
}

function ready(R) {
  return { hips: { pos: [0, 0.905, 0.062], rot: {} }, spine: [{ pitch: 1 }, {}, { pitch: 1 }], neck: { pitch: 2 }, head: { pitch: 2 },
    feet: { l: boot(R, 'l', -0.12, 0, 0, 8), r: boot(R, 'r', 0.12, 0.02, 0, -10) } };
}

// Support foot travels backwards at exactly nominal speed in local space.
// Adding the nominal forward actor displacement therefore makes it stationary.
// The airborne recovery is a cubic Hermite arc with matching end velocities;
// the lift has zero slope at landing/take-off, avoiding a saw-tooth knee snap.
function strideFoot(R, side, u, { stride, duty, lift, width, centre, pitch }) {
  const phase = (u + (side === 'r' ? 0.5 : 0)) % 1;
  const reach = stride * duty, yaw = side === 'l' ? 4 : -4;
  let z, height = 0, angle = 0;
  if (phase <= duty) z = centre - reach / 2 + stride * phase;
  else {
    const v = (phase - duty) / (1 - duty);
    const p0 = centre + reach / 2, p1 = centre - reach / 2, tangent = stride * (1 - duty);
    const hermite = (x, a, b, da, db) => { const x2 = x * x, x3 = x2 * x; return (2 * x3 - 3 * x2 + 1) * a + (x3 - 2 * x2 + x) * da + (-2 * x3 + 3 * x2) * b + (x3 - x2) * db; };
    // Keep the recovery within anatomical reach: a small trailing push and
    // forward placement, then a smooth recovery between them. A single Hermite
    // over the whole swing would overshoot and lock the knee.
    const edge = 0.13, overrun = stride > 1 ? 0.047 : 0.018;
    if (v < edge) z = hermite(v / edge, p0, p0 + overrun, tangent * edge, 0);
    else if (v > 1 - edge) z = hermite((v - 1 + edge) / edge, p1 - overrun, p1, 0, tangent * edge);
    else z = lerp(p0 + overrun, p1 - overrun, ease((v - edge) / (1 - 2 * edge)));
    height = lift * Math.pow(Math.sin(Math.PI * v), 2) * (1 + 0.18 * Math.sin(TAU * v));
    if (stride > 1 && v < 0.4) height += 0.110 * Math.pow(Math.sin(Math.PI * v / 0.4), 2);
    angle = pitch * Math.pow(Math.sin(Math.PI * v), 2) * Math.sin(Math.PI * (v - 0.15));
  }
  return boot(R, side, side === 'l' ? -width : width, z, height, yaw, angle);
}

function locomotion(R, name, u) {
  const sprint = name === 'sprint', phase = u === 1 ? 0 : u, a = Math.sin(TAU * phase), b = Math.cos(TAU * phase * 2);
  const cycle = sprint ? { stride: 3.20, duty: 0.24, lift: 0.235, width: 0.135, centre: 0.058, pitch: 13 } : { stride: 0.768, duty: 0.64, lift: 0.062, width: 0.15, centre: 0.064, pitch: 8 };
  const step = (phase * 2) % 1, flight = step > 0.48 ? Math.pow(Math.sin(Math.PI * (step - 0.48) / 0.52), 2) : 0;
  const supportCompression = step <= 0.48 ? Math.pow(Math.sin(Math.PI * step / 0.48), 2) : 0;
  const body = {
    hips: { pos: [0.020 * a + 0.003 * Math.sin(TAU * phase * 3), sprint ? 0.790 + 0.050 * flight - 0.007 * supportCompression : 0.590 + 0.008 * (1 - b), 0.062 + (sprint ? 0.011 : 0.005) * Math.sin(TAU * phase * 2)], rot: { yaw: (sprint ? 7 : 3) * a, roll: (sprint ? -3.5 : -2) * a, pitch: sprint ? 5 : 3 } },
    spine: [{ pitch: sprint ? 8 : 9, yaw: (sprint ? -4 : -1.8) * a }, { pitch: sprint ? 6 : 10, yaw: (sprint ? -5 : -2) * a, roll: 1.4 * a }, { pitch: sprint ? 4 : 7, yaw: (sprint ? -3 : -1.4) * a }],
    neck: { pitch: sprint ? -8 : -14, yaw: 2.5 * a, roll: 0.8 * a }, head: { pitch: sprint ? -6 : -10, yaw: 2.5 * a, roll: 1.2 * a },
    clav: { l: { roll: 1.8 * a, pitch: 1.5 * a }, r: { roll: -1.5 * a, pitch: -1.2 * a } },
    feet: { l: strideFoot(R, 'l', phase, cycle), r: strideFoot(R, 'r', phase, cycle) },
  };
  return hold(R, body, sprint ? 'port' : 'low', Math.sin(TAU * phase * 2 + 0.35), sprint ? -1.4 * Math.sin(TAU * phase + 0.3) : 0);
}

function turning(R, name, u) {
  const direction = name === 'turn_left' ? 1 : -1, yaw = 90 * direction * blend(u, 0.14, 0.88), look = 90 * direction * blend(u, 0.045, 0.78);
  const feet = {}, pivot = R.J.root;
  const lead = direction > 0 ? 'l' : 'r', swingWeight = {};
  for (const side of ['l', 'r']) {
    const [start, end] = side === lead ? [0.13, 0.49] : [0.49, 0.85], v = clamp((u - start) / (end - start)), progress = ease(v);
    const original = [side === 'l' ? -0.12 : 0.12, 0, (side === 'l' ? 0 : 0.02) - pivot[2]];
    const p = rotate(original, 90 * direction * progress), lift = 0.070 * Math.pow(Math.sin(Math.PI * v), 2);
    const outward = (side === 'l' ? -1 : 1) * 0.014 * Math.sin(Math.PI * v);
    feet[side] = boot(R, side, p[0] + outward, p[2] + pivot[2], lift, (side === 'l' ? 8 : -10) + 90 * direction * progress);
    swingWeight[side] = Math.pow(Math.sin(Math.PI * v), 2);
  }
  const transfer = 0.055 * (swingWeight.l - swingWeight.r), shift = rotate([transfer, 0, 0], yaw);
  const body = ready(R);
  body.hips = { pos: [shift[0], 0.905 - 0.014 * (swingWeight.l + swingWeight.r), pivot[2] + shift[2]], rot: { yaw, roll: -transfer * 35 } };
  body.spine = [{ pitch: 1, yaw: (look - yaw) * 0.20 }, { yaw: (look - yaw) * 0.25 }, { pitch: 1, yaw: (look - yaw) * 0.20 }];
  body.neck = { pitch: 2, yaw: (look - yaw) * 0.20 }; body.head = { pitch: 2, yaw: (look - yaw) * 0.15 };
  body.feet = feet;
  return hold(R, body);
}

function reaction(R, name, u) {
  const body = ready(R);
  if (name === 'hit_front') {
    const recoil = wave(u, [[0, 0], [0.055, 0.16], [0.17, 1], [0.36, 0.68], [0.72, -0.10], [1, 0]]);
    const settle = wave(u, [[0, 0], [0.20, 0.25], [0.43, 1], [0.80, 0.15], [1, 0]]);
    body.hips = { pos: [0.008 * recoil, 0.905 - 0.033 * settle, 0.062 + 0.042 * recoil], rot: { pitch: -4 * recoil, yaw: -3 * recoil } };
    body.spine = [{ pitch: -7 * recoil + 2 * settle, roll: 2 * recoil }, { pitch: -9 * recoil + 3 * settle }, { pitch: -5 * recoil + 2 * settle, yaw: 2 * recoil }];
    body.neck = { pitch: 2 + 6 * wave(u, [[0, 0], [0.25, 1], [0.55, 0.3], [1, 0]]) }; body.head = { pitch: 2 + 3 * settle, yaw: 3 * recoil };
    body.clav = { l: { pitch: -3 * recoil }, r: { pitch: -4 * recoil, roll: -2 * recoil } };
  } else {
    const duck = wave(u, [[0, 0], [0.055, 0.06], [0.23, 1], [0.39, 1], [0.77, 0.14], [1, 0]]);
    const glance = wave(u, [[0, 0], [0.17, -4], [0.38, 13], [0.64, 7], [1, 0]]);
    body.hips = { pos: [-0.018 * duck, 0.905 - 0.215 * duck, 0.062 + 0.018 * duck], rot: { pitch: 4 * duck, roll: -2 * duck } };
    body.spine = [{ pitch: 1 + 9 * duck }, { pitch: 11 * duck, yaw: 0.18 * glance }, { pitch: 1 + 7 * duck }];
    body.neck = { pitch: 2 - 8 * duck, yaw: 0.45 * glance }; body.head = { pitch: 2 - 5 * duck, yaw: 0.37 * glance, roll: -3 * duck };
    body.clav = { l: { pitch: -5 * duck, roll: 2 * duck }, r: { pitch: -6 * duck, roll: -2 * duck } };
  }
  return hold(R, body);
}

export const SPECS = [
  { name: 'sprint', duration_s: 0.64, loop: true, nominal_speed_mps: 5, cycle_distance_m: 3.20, step_distance_m: 1.60, contact_windows: { l: [[0, 0.24]], r: [[0.5, 0.74]] }, stance: 'standing', description: 'Armed sprint: compressed single support, flight, high knee recovery, pelvis/shoulder counter-rotation, secured port arms.' },
  { name: 'crouch_walk', duration_s: 0.96, loop: true, nominal_speed_mps: 0.8, cycle_distance_m: 0.768, step_distance_m: 0.384, contact_windows: { l: [[0, 0.64]], r: [[0, 0.14], [0.5, 1]] }, stance: 'crouched', description: 'Low centre of gravity, short strides, overlapping support and a low-ready rifle.' },
  { name: 'turn_left', duration_s: 1.14, loop: false, nominal_speed_mps: 0, cycle_distance_m: 0, step_distance_m: 0, body_yaw_delta_deg: 90, contact_windows: { l: [[0, 0.13], [0.49, 1]], r: [[0, 0.49], [0.85, 1]] }, stance: 'standing', description: 'Look, shoulder lead, left placement, weight transfer, right placement and settle.' },
  { name: 'turn_right', duration_s: 1.14, loop: false, nominal_speed_mps: 0, cycle_distance_m: 0, step_distance_m: 0, body_yaw_delta_deg: -90, contact_windows: { r: [[0, 0.13], [0.49, 1]], l: [[0, 0.49], [0.85, 1]] }, stance: 'standing', description: 'Mirrored foot order with the same two-handed rifle carriage; terminal body yaw -90 degrees.' },
  { name: 'hit_front', duration_s: 0.76, loop: false, nominal_speed_mps: 0, cycle_distance_m: 0, step_distance_m: 0, contact_windows: { l: [[0, 1]], r: [[0, 1]] }, stance: 'standing', presentation_event: 'hitAt', description: 'Short chest impulse, delayed head and knee compression, balance recovery to the starting ready pose. No damage/fire event.' },
  { name: 'near_miss_duck', duration_s: 0.98, loop: false, nominal_speed_mps: 0, cycle_distance_m: 0, step_distance_m: 0, contact_windows: { l: [[0, 1]], r: [[0, 1]] }, stance: 'standing', presentation_event: 'suppressedAt', description: 'Fast defensive compression, held low head/shoulders, brief glance and slower recovery. No suppression decision.' },
];

export function sampleMotion(R, name, u) {
  if (name === 'sprint' || name === 'crouch_walk') return locomotion(R, name, u);
  if (name.startsWith('turn_')) return turning(R, name, u);
  return reaction(R, name, u);
}

export function buildClips(R) {
  return SPECS.map(spec => {
    // Bake constrained locomotion at 120 Hz and the slower authored reactions
    // at 60 Hz. Constant tracks have just two endpoint keys.
    const bakeFps = spec.loop ? 120 : 60, count = Math.ceil(spec.duration_s * bakeFps), times = Array.from({ length: count + 1 }, (_, i) => spec.duration_s * i / count);
    const poses = times.map((_, i) => sampleMotion(R, spec.name, i / count)), tracks = [];
    const add = (name, type, values, width, interpolation = THREE.InterpolateLinear) => {
      const constant = values.every((v, i) => Math.abs(v - values[i % width]) < 1e-10);
      const t = constant ? [0, spec.duration_s] : times, data = constant ? [...values.slice(0, width), ...values.slice(0, width)] : values;
      tracks.push(new type(name, t, data, interpolation));
    };
    for (const b of GAME_BONES) {
      if (['root', 'carry_socket', 'jaw', 'eye_l', 'eye_r'].includes(b.name)) continue;
      const rotations = poses.map(p => p.local[b.name] ?? q.id());
      for (let i = 1; i < rotations.length; i++) if (rotations[i].reduce((s, x, k) => s + x * rotations[i - 1][k], 0) < 0) rotations[i] = rotations[i].map(x => -x);
      add(`${b.name}.quaternion`, THREE.QuaternionKeyframeTrack, rotations.flat(), 4);
      const translations = poses.map(p => p.trans[b.name]);
      if (translations.every(Boolean)) add(`${b.name}.position`, THREE.VectorKeyframeTrack, translations.flat(), 3);
    }
    for (const [bone, scale] of [['weapon', 1], ['weapon_mag', 1], ['weapon_clip', 0]]) add(`${bone}.scale`, THREE.VectorKeyframeTrack, [scale, scale, scale, scale, scale, scale], 3, THREE.InterpolateDiscrete);
    const clip = new THREE.AnimationClip(spec.name, spec.duration_s, tracks);
    const meta = { ...spec, in_place: true, root_motion: 'none; root bone has no channels', contact_phase_unit: 'cycle fraction', sampled_fps: bakeFps, samples: count + 1,
      phase_zero: spec.loop ? 'left foot strike' : 'ready pose', phase_source: spec.loop ? 'odometer' : 'persisted presentation timestamp / body-yaw transition',
      phase_formula: spec.loop ? 't = duration_s * fract((odometer_m - phase_origin_m) / cycle_distance_m)' : 't = clamp(mission_clock - event_or_transition_time, 0, duration_s)',
      blend_in_s: spec.loop ? 0.12 : 0.075, blend_out_s: spec.loop ? 0.12 : 0.12, endpoint: spec.name.startsWith('turn_') ? 'ready pose rotated by body_yaw_delta_deg about the fixed root' : spec.loop ? 'identical pose and periodic velocity' : 'same ready pose as the start',
      combat_events: [], weapon_profile: 'two-handed rifle (wz.29 / Kar98k / same wrist profile wz.98a); not MG34/RKM/transports', foot_strikes: spec.loop ? [{ side: 'l', phase: 0 }, { side: 'r', phase: 0.5 }] : [],
      ...(spec.name.startsWith('turn_') ? { authored_yaw_channel: 'hips.quaternion', presentation_group_yaw: 'bodyYaw - extracted authored hips yaw; do not rotate actor root/facing' } : {}),
    };
    return { clip, meta };
  });
}
