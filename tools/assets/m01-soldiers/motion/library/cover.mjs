// Cover: low cover (0.9 m: sandbags, trench lip; the soldier squats below the edge) and high cover (1.6 m: wall,
// portal; the soldier stands against it). Idles loop; peeks / leans are one-shots that start and end on the
// matching idle pose, fire at mid-clip and return. `cover_return` takes cover from the exposed standing ready pose,
// `cover_leave` is its reverse. Feet stay on their marks during the peek (the boots only move in the transitions).
import { q, v3, N, TAU, deg, mix, wave, bump, blend, clamp01, foot, standingBody, mixBody, readyPose, compose, holdRifle, portArms, handOn, rifleAt, rifleFrame, GRIP_R, GRIP_L, fingersRifle, lowReady } from './common.mjs';
import { swing } from './posture.mjs';

const RIFLE_EYE = [0, 0.064, 0.19];
/** Rifle shouldered with the eye on the sight line (same relation as the shipped `aim` clip). */
function shoulder(W, { kick = 0, yaw = 0 } = {}) {
  const F = N([Math.sin(yaw * deg), Math.sin(kick * 5 * deg), -1]), w0 = rifleAt([0, 0, 0], F, N([0.06, 1, 0]));
  return { pos: v3.sub(v3.add(W.eye_r.p, [0, 0, kick * 0.03]), q.rot(w0.rot, RIFLE_EYE)), rot: w0.rot };
}
/** Torso of the shipped aim pose with the feet left to the caller. */
const aimTorso = () => ({
  hips: { pos: [0.01, 0.89, 0.07], rot: { yaw: -32, pitch: 3 } },
  spine: [{ pitch: 3, yaw: -4 }, { pitch: 3, yaw: -4, roll: -2 }, { pitch: 2, yaw: -3, roll: -3 }], neck: { yaw: 22, pitch: 10, roll: -6 }, head: { yaw: 18, pitch: 6, roll: -14 },
  clav: { r: { yaw: 10, roll: -8 }, l: { yaw: -6 } },
});
const lowFeet = () => ({ l: foot(-0.17, -0.12, { yaw: -8 }), r: foot(0.17, 0.02, { yaw: -22 }) });
const highFeet = () => ({ l: foot(-0.14, -0.10, { yaw: -10 }), r: foot(0.19, 0.16, { yaw: -48 }) });

/** Squat behind low cover: both boots flat, torso leaning on the knees, rifle across the chest. */
const squatBody = (b = 0, look = 0) => ({
  hips: { pos: [0.01, 0.37 + 0.004 * b, 0.20], rot: { pitch: 22, yaw: -6 } },
  spine: [{ pitch: 18 + b, yaw: 2 }, { pitch: 14 + 0.6 * b }, { pitch: 8 + b }], neck: { pitch: 8, yaw: 10 * look }, head: { pitch: 4, yaw: 14 * look },
  clav: { l: { pitch: 4 }, r: { pitch: 4 } }, feet: lowFeet(),
});
/** Standing at a high wall: right foot back, torso turned, rifle at high port. */
const wallBody = (b = 0, look = 0) => ({
  hips: { pos: [0.0, 0.895 + 0.004 * b, 0.07], rot: { yaw: -26, pitch: 2 } },
  spine: [{ pitch: 1.5 + b, yaw: -4 }, { pitch: 1 + b, yaw: -4 }, { pitch: 1 + b, yaw: -2 }], neck: { pitch: 3, yaw: 12 * look }, head: { pitch: 2, yaw: 14 * look },
  clav: { r: { yaw: 6 }, l: { yaw: -4 } }, feet: highFeet(),
});
const portPose = (R, body, k = 0) => compose(R, body, W => holdRifle(portArms(W)));

export function coverClips(R) {
  const out = [];
  const add = (name, duration, fps, loop, poseAt, meta) => out.push({ name, duration, fps, loop, poseAt, meta: { family: 'cover', mask: 'full', pose: 'crouched', interrupt: 'none', audit: { mode: 'planted' }, ...meta } });

  add('cover_low_idle', 3, 30, true, u => { const b = Math.sin(u * TAU), look = Math.sin(u * TAU); return portPose(R, squatBody(b, look)); },
    { interrupt: 'any', cover_height_m: 0.9, semantic: 'squatting below a 0.9 m sandbag line, rifle across the chest, slow look along the cover' });
  add('cover_high_idle', 3, 30, true, u => { const b = Math.sin(u * TAU), look = Math.sin(u * TAU); return portPose(R, wallBody(b, look)); },
    { pose: 'standing', interrupt: 'any', cover_height_m: 1.6, semantic: 'standing against a 1.6 m wall, rifle at high port, slow look along the wall' });

  // Peek / lean: rise from the idle pose, shoulder the rifle on the open side, fire, drop back.
  const peek = (name, base, feetOf, { side, rise, lateral, aim, label, cover }) => add(name, 1.2, 60, false, u => {
    const e = bump(u, 0.10, 0.40, 0.66, 0.92), recoil = Math.max(0, Math.sin(Math.PI * clamp01((u - 0.50) / 0.14))), a = aimTorso(), b0 = base(0, 0);
    const up = e;
    const body = mixBody(b0, { ...a, hips: { pos: [b0.hips.pos[0] + side * lateral, b0.hips.pos[1] + rise, b0.hips.pos[2] - 0.02], rot: { yaw: -30 + 10 * side, pitch: 3 } },
      spine: a.spine.map((s, i) => ({ ...s, roll: (s.roll ?? 0) + side * 4 * (i + 1) })), neck: { ...a.neck, roll: a.neck.roll + side * 3 }, feet: feetOf() }, up);
    return compose(R, body, W => {
      const p = portArms(W), s = shoulder(W, { kick: recoil, yaw: 0 }), k = blend(u, 0.16, 0.38) * (1 - blend(u, 0.70, 0.88));
      return holdRifle({ pos: mix(p.pos, s.pos, k), rot: q.slerp(p.rot, s.rot, k) });
    });
  }, { family: 'cover', pose: label, cover_height_m: cover, peek_side: side < 0 ? 'left' : 'right', semantic: aim, events: { shoulder: 0.38, fire: 0.52, shouldered_down: 0.8 }, reference_start: name.startsWith('cover_low') ? 'cover_low_idle t0' : 'cover_high_idle t0', reference_end: name.startsWith('cover_low') ? 'cover_low_idle t0' : 'cover_high_idle t0' });
  peek('cover_low_peek_fire_l', squatBody, lowFeet, { side: -1, rise: 0.30, lateral: 0.16, label: 'crouched', cover: 0.9, aim: 'rises on the left edge of low cover, fires one aimed shot, drops back' });
  peek('cover_low_peek_fire_r', squatBody, lowFeet, { side: 1, rise: 0.30, lateral: 0.16, label: 'crouched', cover: 0.9, aim: 'rises on the right edge of low cover, fires one aimed shot, drops back' });
  peek('cover_high_lean_l', wallBody, highFeet, { side: -1, rise: 0, lateral: 0.17, label: 'standing', cover: 1.6, aim: 'leans out past the left edge of high cover, fires one aimed shot, leans back' });
  peek('cover_high_lean_r', wallBody, highFeet, { side: 1, rise: 0, lateral: 0.17, label: 'standing', cover: 1.6, aim: 'leans out past the right edge of high cover, fires one aimed shot, leans back' });

  // cover_return: exposed standing ready -> low cover idle; cover_leave: the reverse.
  const A = standingBody(0), B = squatBody(0, 0);
  const intoCover = u => {
    const body = mixBody(A, B, blend(u, 0.08, 0.92));
    body.feet = { l: swing(A.feet.l, B.feet.l, blend(u, 0.06, 0.52), 0.05), r: swing(A.feet.r, B.feet.r, blend(u, 0.40, 0.90), 0.05) };
    return compose(R, body, W => {
      const lo = lowReady(W, 0), p = portArms(W), k = blend(u, 0.2, 0.7);
      return holdRifle({ pos: mix(lo.pos, p.pos, k), rot: q.slerp(lo.rot, p.rot, k) });
    });
  };
  add('cover_return', 1.2, 60, false, intoCover, { pose: 'standing->crouched', cover_height_m: 0.9, semantic: 'exposed ready stance to squatting behind low cover', reference_start: 'standing_idle t0', reference_end: 'cover_low_idle t0', events: { boots_set: 0.9 } });
  add('cover_leave', 1.2, 60, false, u => intoCover(1 - u), { pose: 'crouched->standing', cover_height_m: 0.9, semantic: 'rises from low cover to the exposed ready stance', reference_start: 'cover_low_idle t0', reference_end: 'standing_idle t0', events: { boots_set: 0.1 } });
  return out;
}
