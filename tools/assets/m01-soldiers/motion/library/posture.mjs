// Posture transitions (stand <-> kneel <-> prone) and the prone rifleman (idle, crawl, flinch).
// Every transition starts and ends on the exact junction pose of the neighbouring state; feet that must plant are IK
// targets, steps are explicit arcs, so the contact windows come out of the data and are re-measured by the audit.
import { q, v3, N, TAU, mix, wave, bump, blend, clamp01, foot, standingBody, kneelBody, mixBody, readyPose, compose, holdRifle, lowReady, handOn, rifleAt, GRIP_R, GRIP_L, fingersRifle } from './common.mjs';

const deg = Math.PI / 180;
/** Prone boots: instep on the ground, toes pointing back and 28 degrees down, so the toe tip just touches the floor. */
export const PRONE_FOOT = -152, PRONE_ANKLE = 0.10, PRONE_HIPS = 0.215;
/** Foot interpolated from `a` to `b` with a vertical arc (m) and a sideways clearance (m) while s goes 0 -> 1. */
export function swing(a, b, s, lift = 0.06, side = 0) {
  const arc = Math.pow(Math.sin(Math.PI * clamp01(s)), 2);
  return { pos: [mix(a.pos[0], b.pos[0], s) + side * arc, mix(a.pos[1], b.pos[1], s) + lift * arc, mix(a.pos[2], b.pos[2], s)],
    rot: q.slerp(a.rot, b.rot, s), pole: N(mix(a.pole, b.pole, s)), toe: mix(a.toe ?? 0, b.toe ?? 0, s) };
}

/** Prone, face down, head to -Z, rifle on the ground in front of the face. */
export function proneBody(b = 0, { head = 0, press = 0 } = {}) {
  const rest = (s, yaw) => ({ pos: [s === 'l' ? -0.17 : 0.17, PRONE_ANKLE, 1.34], rot: q.mul(q.axis([0, 1, 0], yaw), q.axis([1, 0, 0], PRONE_FOOT)), pole: N([s === 'l' ? -0.3 : 0.3, -1, 0]), toe: 0 });
  return {
    hips: { pos: [0.02, PRONE_HIPS + 0.004 * b - 0.006 * press, 0.34], rot: { pitch: 86, yaw: -5, roll: 1 } },
    spine: [{ pitch: 3 + 0.6 * b + 2 * press, yaw: 1 }, { pitch: 3 + 2 * press, yaw: 2 }, { pitch: 3 + 0.6 * b + 2 * press, yaw: 2 }],
    neck: { pitch: -30 + 3 * press, yaw: 4 + head * 0.5 }, head: { pitch: -26 + 2 * press, yaw: 2 + head, roll: -4 },
    clav: { r: { yaw: 8, roll: -10 + 4 * press }, l: { yaw: -10, roll: 6 - 4 * press } },
    feet: { l: rest('l', 18), r: rest('r', -12) },
  };
}
/** Rifle lying forward on the ground, butt at the shoulder, both hands on it. */
/** Rifle hold with the elbow poles blended from low ready (k = 0) to elbows out and up, resting on the ground (k = 1). */
export function holdAt(w, k) {
  const h = holdRifle(w);
  return { ...h, hands: { r: { ...h.hands.r, pole: mix([0.7, -0.6, 0.35], [0.9, 0.3, 0.1], k) }, l: { ...h.hands.l, pole: mix([-0.35, -1, 0.1], [-0.9, 0.3, 0.1], k) } } };
}
export function proneRifle(W, { lift = 0, shift = 0 } = {}) {
  const sh = W.upperarm_r.p;
  return holdAt(rifleAt([sh[0] - 0.02 + shift, 0.135 + lift, sh[2] - 0.30], N([0, 0.02 + lift * 0.1, -1]), [0, 1, 0]), 1);
}
export const pronePose = (R, body, o) => compose(R, body, W => proneRifle(W, o));

export function postureClips(R) {
  const out = [];
  const add = (name, duration, fps, loop, poseAt, meta) => out.push({ name, duration, fps, loop, poseAt, meta: { family: 'low_ready', mask: 'full', interrupt: 'none', audit: { mode: 'planted' }, ...meta } });

  // ——— stand <-> kneel ———
  const A = standingBody(0), B = kneelBody(0);
  const standToKneel = u => {
    const k = blend(u, 0.12, 0.98);
    const body = mixBody(A, B, k);
    body.feet = { l: swing(A.feet.l, B.feet.l, blend(u, 0.04, 0.42), 0.05), r: swing(A.feet.r, B.feet.r, blend(u, 0.42, 0.94), 0.09) };
    return readyPose(R, body, 0);
  };
  add('stand_to_crouch', 0.45, 60, false, standToKneel, { pose: 'standing->crouched', semantic: 'drop to the right knee: left boot steps forward, right boot back', reference_start: 'standing_idle t0', reference_end: 'crouched_idle t0', events: { weight_on_knee: 0.38 } });
  add('crouch_to_stand', 0.45, 60, false, u => standToKneel(1 - u), { pose: 'crouched->standing', semantic: 'rise from the right knee to standing', reference_start: 'crouched_idle t0', reference_end: 'standing_idle t0', events: { weight_on_foot: 0.12 } });

  // ——— kneel <-> prone ———
  const K = kneelBody(0), P = proneBody(0);
  const kneelToProne = u => {
    const kb = blend(u, 0.10, 0.78), kw = blend(u, 0.08, 0.86);
    const body = mixBody(K, P, kb);
    body.feet = { l: swing(K.feet.l, P.feet.l, blend(u, 0.28, 0.80), 0.22, -0.24), r: swing(K.feet.r, P.feet.r, blend(u, 0.22, 0.74), 0.18, 0.20) };
    body.spine = body.spine.map((s, i) => ({ ...s, pitch: s.pitch + [4, 7, 4][i] * Math.sin(Math.PI * kb) }));
    return compose(R, body, W => {
      const low = lowReady(W, 0), prone = proneRifle(W).weapon;
      // The rifle rides above its straight path while the chest comes down, so the muzzle never digs in.
      const w = { pos: v3.add(mix(low.pos, prone.pos, kw), [0, 0.20 * Math.pow(Math.sin(Math.PI * kw), 2), 0]), rot: q.slerp(low.rot, prone.rot, blend(kw, 0, 0.7)) };
      return holdAt(w, kw);
    });
  };
  add('prone_enter', 1.2, 60, false, kneelToProne, { family: 'prone', pose: 'crouched->prone', semantic: 'kneeling to prone: legs thrown back, chest lowered, rifle laid forward', reference_start: 'crouched_idle t0', reference_end: 'prone_idle t0', events: { hands_down: 0.5, chest_down: 0.85 } });
  add('prone_exit', 1.2, 60, false, u => kneelToProne(1 - u), { family: 'prone', pose: 'prone->crouched', semantic: 'prone to kneeling', reference_start: 'prone_idle t0', reference_end: 'crouched_idle t0', events: { hands_down: 0.7, knee_down: 0.35 } });

  // ——— prone idle, flinch ———
  add('prone_idle', 4, 30, true, u => {
    const b = Math.sin(u * TAU), look = Math.sin(u * TAU) * 0.8 + Math.sin(u * TAU * 2) * 0.4;
    return pronePose(R, proneBody(b, { head: 8 * look }));
  }, { family: 'prone', pose: 'prone', semantic: 'prone, breathing, slow look along the front' });
  add('prone_flinch', 0.45, 60, false, u => {
    const k = bump(u, 0.0, 0.16, 0.26, 1);
    return pronePose(R, proneBody(0, { press: k }), { lift: 0, shift: 0.01 * k });
  }, { family: 'prone', mask: 'full', pose: 'prone', semantic: 'head ducks and chest presses into the ground', presentation_event: 'suppressedAt', reference: 'prone_idle t0', events: { peak: 0.1 } });

  // ——— prone crawl: alternating push and recovery with the feet, rifle cradled ———
  const crawlCycle = 1.4, crawlSpeed = 0.3, cycleM = crawlSpeed * crawlCycle, duty = 0.5;
  const crawlFoot = (side, u) => {
    const phase = (u + (side === 'r' ? 0.5 : 0)) % 1, reach = cycleM * duty, zc = 1.09;
    let z, y = PRONE_ANKLE, lift = 0, tuck = 0;
    if (phase < duty) z = zc - reach / 2 + cycleM * phase;
    else {
      // Swing: Hermite arc whose end tangents equal the support speed (no velocity jump at toe-down / toe-off).
      const v = (phase - duty) / (1 - duty), x2 = v * v, x3 = x2 * v, tangent = cycleM * (1 - duty), p0 = zc + reach / 2, p1 = zc - reach / 2;
      z = (2 * x3 - 3 * x2 + 1) * p0 + (x3 - 2 * x2 + v) * tangent + (-2 * x3 + 3 * x2) * p1 + (x3 - x2) * tangent;
      lift = Math.pow(Math.sin(Math.PI * v), 2);
      tuck = lift;
    }
    const sgn = side === 'l' ? -1 : 1, yaw = side === 'l' ? 18 : -12;
    return { pos: [sgn * (0.16 + 0.07 * tuck), y + 0.09 * lift, z - 0.16 * tuck], rot: q.mul(q.axis([0, 1, 0], yaw), q.axis([1, 0, 0], PRONE_FOOT + 25 * tuck)), pole: N([sgn * (0.5 + 0.6 * tuck), 0.5 + 0.8 * tuck, -0.3 * tuck]), toe: 0 };
  };
  add('prone_crawl', crawlCycle, 60, true, u => {
    const a = Math.sin(u * TAU), body = proneBody(Math.sin(u * TAU * 2));
    body.hips = { pos: [0.02 + 0.012 * a, PRONE_HIPS + 0.004 * Math.cos(u * TAU * 2), 0.34], rot: { pitch: 86, yaw: -5 + 5 * a, roll: 1 + 3 * a } };
    body.spine = [{ pitch: 3, yaw: -2.5 * a, roll: -1.5 * a }, { pitch: 3, yaw: -3 * a }, { pitch: 3, yaw: -2 * a, roll: -1 * a }];
    body.head = { pitch: -26, yaw: 2 - 3 * a, roll: -4 }; body.neck = { pitch: -30, yaw: 4 - 2 * a };
    body.feet = { l: crawlFoot('l', u), r: crawlFoot('r', u) };
    return pronePose(R, body, { shift: 0.008 * a });
  }, { family: 'prone', pose: 'prone', mask: 'full', audit: { mode: 'locomotion', speedMps: crawlSpeed, cycleM }, locomotion: { gait: 'crawl', speedMps: crawlSpeed, cycleM, stepM: cycleM / 2 }, semantic: 'leopard crawl: toes push alternately, rifle cradled in the forearms' });
  return out;
}
