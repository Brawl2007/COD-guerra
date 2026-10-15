// Calls and the seated roll-call beats (07:05): a standing shout, a seated idle variant and the canteen / cup beats.
// One-shots start and end on the neighbouring idle's t0 pose (`standing_idle` / `seated`); the rifle never moves
// (cupped hand on the mouth while the other keeps the grip; seated, the rifle stands between the knees).
import { q, v3, N, TAU, deg, mix, wave, bump, blend, foot, standingBody, readyPose, compose, holdRifle, lowReady, handOn, rifleAt, weaponPoint, GRIP_R, GRIP_L, fingersRifle } from './common.mjs';

const standingBase = (o = {}) => { const b = standingBody(0); return { ...b, ...o, hips: { ...b.hips, ...o.hips }, feet: { ...b.feet, ...o.feet } }; };

/** `seated` body (hips on the floor, knees up) at breathing phase b and head yaw. */
const seatedBody = (b = 0, headYaw = 0, o = {}) => ({
  hips: { pos: [0, 0.13, 0.2], rot: { pitch: -8, ...o.hipsRot } }, spine: o.spine ?? [{ pitch: 12 + b }, { pitch: 10 }, { pitch: 6 + b * 0.5 }],
  neck: { pitch: 8, ...o.neck }, head: { pitch: 4, yaw: headYaw, ...o.head }, clav: o.clav, feet: o.feet ?? { l: foot(-0.13, -0.32, { yaw: 12 }), r: foot(0.14, -0.3, { yaw: -12 }) },
});
/** Rifle upright between the knees, butt on the floor, both hands on it. */
function seatedRifle() {
  const butt = [0, 0, -0.18], w = rifleAt(v3.add(butt, [0, 0.33, 0]), N([0, 1, 0.12]), [0, 0, 1]), grip = weaponPoint(w, [0, 0, -0.12]);
  const weapon = { pos: v3.add(butt, q.rot(w.rot, [0, 0.045, -0.335])), rot: w.rot };
  return { weapon, hands: { r: { pos: v3.add(grip, [0.07, -0.05, 0.05]), fdir: N([-0.7, 0, -0.7]), palm: N([-0.5, 0, 0.7]), pole: [0.8, -0.3, 0.2] }, l: { pos: v3.add(grip, [-0.07, -0.02, 0.05]), fdir: N([0.7, 0, -0.7]), palm: N([0.5, 0, 0.7]), pole: [-0.8, -0.3, 0.2] } }, fingers: { l: { curl: 0.7, thumb: 0.5 }, r: { curl: 0.7, thumb: 0.5 } } };
}
const mixHand = (a, b, t) => ({ pos: mix(a.pos, b.pos, t), fdir: N(mix(a.fdir, b.fdir, t)), palm: N(mix(a.palm, b.palm, t)), pole: mix(a.pole, b.pole, t) });

export function callClips(R) {
  const out = [];
  const add = (name, duration, fps, loop, poseAt, meta) => out.push({ name, duration, fps, loop, poseAt, meta: { family: 'seated', mask: 'upper', pose: 'seated', interrupt: 'any', audit: { mode: 'planted' }, ...meta } });

  // call_out: left hand cupped at the mouth, head back, shout, hand down.
  add('call_out', 2.0, 30, false, u => {
    const k = bump(u, 0.10, 0.30, 0.68, 0.88), shout = wave(u, [[0, 0], [0.32, 0], [0.38, 1], [0.46, 0.35], [0.52, 1], [0.60, 0.3], [0.68, 0.8], [0.76, 0]]);
    const body = standingBase({ spine: [{ pitch: 1 - 2 * k }, { pitch: -3 * k }, { pitch: 1 - 3 * k }], neck: { pitch: 2 - 8 * k }, head: { pitch: 2 - 8 * k }, jaw: 16 * shout, clav: { l: { pitch: 3 * k } } });
    return compose(R, body, W => {
      const w = lowReady(W, 0), grip = handOn(w, GRIP_L);
      const mouth = { pos: v3.add(W.eye_r.p, q.rot(W.head.r, [-0.05, -0.085, -0.08])), fdir: q.rot(W.head.r, N([0.5, 0.75, -0.4])), palm: q.rot(W.head.r, N([0.9, 0.1, 0.3])), pole: [-0.8, -0.2, 0.2] };
      return { weapon: w, hands: { r: { ...handOn(w, GRIP_R), pole: [0.7, -0.6, 0.35] }, l: mixHand({ ...grip, pole: [-0.35, -1, 0.1] }, mouth, k) },
        fingers: { l: { curl: mix(0.62, 0.35, k), thumb: mix(0.55, 0.15, k) }, r: fingersRifle.r } };
    });
  }, { family: 'low_ready', pose: 'standing', semantic: 'shouts an order with the left hand cupped at the mouth', events: { shout_start: 0.76, shout_end: 1.5 }, reference_start: 'standing_idle t0', reference_end: 'standing_idle t0' });

  // seated_b: other knee posture, leaning on one side, two slow glances.
  add('seated_b', 4, 30, true, u => {
    const b = Math.sin(u * TAU), g = wave(u, [[0, 0], [0.2, 1], [0.38, 1], [0.55, 0], [0.7, -1], [0.88, -1], [1, 0]]);
    const body = seatedBody(b, 12 * g, { hipsRot: { roll: 3 }, spine: [{ pitch: 10 + b, roll: -3, yaw: 3 * g }, { pitch: 8, roll: -2 }, { pitch: 5 + b * 0.5 }], neck: { pitch: 7, yaw: 6 * g },
      feet: { l: foot(-0.20, -0.28, { yaw: 20 }), r: foot(0.10, -0.38, { yaw: -4 }) } });
    return compose(R, body, () => seatedRifle());
  }, { family: 'seated', mask: 'full', semantic: 'seated, feet apart, leaning, looking around' });

  // Canteen / cup beats: only the hands, torso and head move; boots, hips and rifle stay as in `seated`.
  const beat = (name, duration, label, events, stage) => add(name, duration, 30, false, u => {
    const s = stage(u), body = seatedBody(0, 0, { spine: [{ pitch: 12 + s.lean, yaw: s.turn, roll: s.roll ?? 0 }, { pitch: 10, yaw: s.turn * 0.6 }, { pitch: 6, yaw: s.turn * 0.5 }], neck: { pitch: 8 + (s.neckPitch ?? 0), yaw: s.look ?? 0 }, head: { pitch: 4 + (s.headPitch ?? 0), yaw: (s.look ?? 0) * 0.5 } });
    if (s.jaw) body.jaw = s.jaw;
    return compose(R, body, W => {
      const base = seatedRifle(), mouth = side => ({ pos: v3.add(W.eye_r.p, q.rot(W.head.r, [side * 0.03 - 0.03, -0.095, -0.08])), fdir: q.rot(W.head.r, N([0, 0.8, -0.5])), palm: q.rot(W.head.r, N([-side * 0.9, 0.1, 0.2])), pole: [side * 0.8, -0.3, 0.3] });
      const reach = (side, dx, dz, dy = -0.16) => ({ pos: v3.add(W[`upperarm_${side > 0 ? 'r' : 'l'}`].p, [dx, dy, dz]), fdir: N([side * 0.5, -0.1, -0.85]), palm: N([-side * 0.2, 1, 0.1]), pole: [side * 0.8, -0.3, 0.3] });
      const centre = side => ({ pos: v3.add(W.spine_02.p, q.rot(W.spine_02.r, [side * 0.045, -0.12, -0.24])), fdir: N([-side * 0.4, 0.5, -0.8]), palm: N([-side * 0.8, 0.3, 0.3]), pole: [side * 0.8, -0.5, 0.2] });
      const hands = {};
      for (const side of [-1, 1]) {
        const key = side > 0 ? 'r' : 'l', hs = s.hands[key];
        const targets = { grip: base.hands[key], out: reach(side, hs.dx ?? 0, hs.dz ?? 0), mouth: mouth(side), centre: centre(side) };
        let h = targets[hs.from];
        h = mixHand(h, targets[hs.to], hs.k);
        if (hs.then) h = mixHand(h, targets[hs.then], hs.k2 ?? 0);
        hands[key] = h;
      }
      return { weapon: base.weapon, hands, fingers: { l: { curl: 0.6, thumb: 0.4 }, r: { curl: 0.6, thumb: 0.4 } } };
    });
  }, { events, semantic: label, reference_start: 'seated t0', reference_end: 'seated t0' });

  beat('seated_pass_canteen', 3.6, 'passes a canteen to the soldier on the right', { reach: 0.3, release: 0.45 }, u => {
    const k = bump(u, 0.05, 0.28, 0.52, 0.78);
    return { turn: -14 * k, look: -20 * k, lean: 2 * k, hands: { l: { from: 'grip', to: 'grip', k: 0 }, r: { from: 'grip', to: 'out', k, dx: 0.40, dz: -0.20 } } };
  });
  beat('seated_receive_canteen', 4.0, 'takes a canteen from the soldier on the left and drinks', { receive: 0.25, drink: 0.5, lower: 0.78 }, u => {
    const out = blend(u, 0.06, 0.22) * (1 - blend(u, 0.30, 0.42)), mouth = bump(u, 0.30, 0.46, 0.60, 0.76);
    const k = Math.max(out, mouth);
    return { turn: 12 * out, look: 18 * out, headPitch: -16 * mouth, neckPitch: -6 * mouth, jaw: 8 * mouth, lean: -2 * mouth,
      hands: { r: { from: 'grip', to: 'grip', k: 0 }, l: { from: 'grip', to: 'out', k: out, dx: -0.38, dz: -0.18, then: 'mouth', k2: mouth } } };
  });
  beat('seated_cup_turn', 3.4, 'takes a cup from the left, turns, hands it to the right', { receive: 0.22, handover: 0.62 }, u => {
    const leftOut = bump(u, 0.04, 0.20, 0.26, 0.34), leftCentre = bump(u, 0.30, 0.42, 0.54, 0.66), rightCentre = bump(u, 0.34, 0.46, 0.54, 0.64), rightOut = bump(u, 0.54, 0.68, 0.76, 0.90);
    return { turn: 14 * leftOut - 14 * rightOut, look: 20 * leftOut - 20 * rightOut, lean: 2 * (leftOut + rightOut),
      hands: { l: { from: 'grip', to: 'out', k: leftOut, then: 'centre', k2: leftCentre, dx: -0.38, dz: -0.2 }, r: { from: 'grip', to: 'centre', k: rightCentre, then: 'out', k2: rightOut, dx: 0.40, dz: -0.2 } } };
  });
  return out;
}
