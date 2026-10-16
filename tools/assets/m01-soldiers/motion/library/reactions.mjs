// Hit reactions, blast duck and deaths for the standing rifleman.
// Reactions are full poses that start and end on the `standing_idle` junction pose (mask 'additive': a player may
// subtract frame 0). Direction naming follows the contract: `hit_<d>` / `death_<d>` = the impact arrives from <d>
// relative to the body, so the body is pushed / falls away from that side. Deaths end still, flat on the ground,
// with the rifle released next to the body.
import { PRONE_FOOT, PRONE_ANKLE, PRONE_HIPS } from './posture.mjs';
import { q, v3, N, TAU, mix, wave, bump, blend, clamp01, foot, standingBody, kneelBody, mixBody, readyPose, compose, holdRifle, lowReady, handOn, rifleAt, GRIP_R, GRIP_L, fingersRifle } from './common.mjs';

const standingBase = (o = {}) => { const b = standingBody(0); return { ...b, ...o, hips: { ...b.hips, ...o.hips }, feet: { ...b.feet, ...o.feet } }; };

export function reactionClips(R) {
  const out = [];
  const add = (name, duration, fps, loop, poseAt, meta) => out.push({ name, duration, fps, loop, poseAt, meta: { family: 'low_ready', mask: 'additive', pose: 'standing', interrupt: 'none', audit: { mode: 'planted' }, ...meta } });

  // ——— hit reactions (0.76 s, same envelope as hit_front of the motion package) ———
  const env = u => ({ recoil: wave(u, [[0, 0], [0.055, 0.16], [0.17, 1], [0.36, 0.68], [0.72, -0.10], [1, 0]]), settle: wave(u, [[0, 0], [0.20, 0.25], [0.43, 1], [0.80, 0.15], [1, 0]]), whip: wave(u, [[0, 0], [0.25, 1], [0.55, 0.3], [1, 0]]) });
  const hit = (name, label, f) => add(name, 0.76, 60, false, u => {
    const { recoil: r, settle: s, whip: w } = env(u), body = standingBase(f(r, s, w));
    return readyPose(R, body, 0);
  }, { semantic: label, presentation_event: 'hitAt', reference: 'frame 0', impact_from: name.slice(4), events: { peak: 0.13 } });
  hit('hit_back', 'impact in the back: shoulders thrown forward, knees give a little', (r, s, w) => ({
    hips: { pos: [0.004 * r, 0.905 - 0.03 * s, 0.062 - 0.042 * r], rot: { pitch: 4 * r, yaw: 3 * r } },
    spine: [{ pitch: 7 * r - 2 * s, roll: -2 * r }, { pitch: 9 * r - 3 * s }, { pitch: 5 * r - 2 * s, yaw: -2 * r }], neck: { pitch: 2 - 7 * w }, head: { pitch: 2 - 3 * s, yaw: -3 * r },
    clav: { l: { pitch: 3 * r }, r: { pitch: 4 * r, roll: 2 * r } } }));
  hit('hit_left', 'impact from the left: torso pushed to the right, head whips across', (r, s, w) => ({
    hips: { pos: [0.032 * r, 0.905 - 0.025 * s, 0.062], rot: { roll: -4 * r, yaw: 4 * r } },
    spine: [{ pitch: 1, roll: -6 * r, yaw: 2 * r }, { roll: -7 * r }, { pitch: 1, roll: -5 * r, yaw: -2 * r }], neck: { pitch: 2, roll: -7 * w }, head: { pitch: 2 + 2 * s, roll: -6 * r, yaw: -4 * r },
    clav: { l: { roll: 3 * r }, r: { roll: -3 * r } } }));
  hit('hit_right', 'impact from the right: torso pushed to the left, head whips across', (r, s, w) => ({
    hips: { pos: [-0.032 * r, 0.905 - 0.025 * s, 0.062], rot: { roll: 4 * r, yaw: -4 * r } },
    spine: [{ pitch: 1, roll: 6 * r, yaw: -2 * r }, { roll: 7 * r }, { pitch: 1, roll: 5 * r, yaw: 2 * r }], neck: { pitch: 2, roll: 7 * w }, head: { pitch: 2 + 2 * s, roll: 6 * r, yaw: 4 * r },
    clav: { l: { roll: 3 * r }, r: { roll: -3 * r } } }));

  // ——— blast duck: fast crouch with the rifle pulled in, held, then a slower recovery ———
  add('blast_duck', 1.0, 60, false, u => {
    const d = wave(u, [[0, 0], [0.10, 0.9], [0.18, 1], [0.52, 1], [0.92, 0.04], [1, 0]]), sh = wave(u, [[0, 0], [0.1, 1], [0.5, 0.8], [1, 0]]);
    const body = standingBase({
      hips: { pos: [-0.012 * d, 0.905 - 0.30 * d, 0.062 + 0.045 * d], rot: { pitch: 9 * d, roll: -2 * d } },
      spine: [{ pitch: 1 + 12 * d }, { pitch: 14 * d, yaw: 3 * d }, { pitch: 1 + 10 * d }], neck: { pitch: 2 + 9 * d }, head: { pitch: 2 + 14 * d, roll: -3 * d },
      clav: { l: { pitch: -6 * sh, roll: 5 * sh }, r: { pitch: -6 * sh, roll: -5 * sh } } });
    return compose(R, body, W => {
      const low = lowReady(W, 0), chest = v3.add(W.spine_02.p, q.rot(W.spine_02.r, [0.08, -0.14, -0.2]));
      const held = { pos: chest, rot: q.frame([0, 0, -1], [0, 1, 0], q.rot(W.spine_02.r, N([-0.35, 0.45, -0.82])), q.rot(W.spine_02.r, N([0.4, 1, 0.1]))) };
      const k = clamp01(d);
      return holdRifle({ pos: mix(low.pos, held.pos, k), rot: q.slerp(low.rot, held.rot, k) });
    });
  }, { semantic: 'violent crouch away from a nearby explosion, rifle clutched to the chest', presentation_event: 'blast', reference: 'frame 0', events: { peak: 0.18, hold_end: 0.52 } });

  // ——— deaths ———
  const G = 0.075;
  const lyingFeet = {
    supine: { l: { pos: [-0.22, G, -0.78], rot: q.mul(q.axis([1, 0, 0], 90), q.axis([0, 1, 0], 25)), pole: [-0.4, 1, 0], toe: 0 }, r: { pos: [0.14, G, -0.8], rot: q.mul(q.axis([1, 0, 0], 85), q.axis([0, 1, 0], -30)), pole: [0.4, 1, 0], toe: 0 } },
    prone: { l: { pos: [-0.2, PRONE_ANKLE, 1.32], rot: q.mul(q.axis([0, 1, 0], 22), q.axis([1, 0, 0], PRONE_FOOT)), pole: N([-0.3, -1, 0]), toe: 0 }, r: { pos: [0.19, PRONE_ANKLE, 1.34], rot: q.mul(q.axis([0, 1, 0], -16), q.axis([1, 0, 0], PRONE_FOOT)), pole: N([0.3, -1, 0]), toe: 0 } },
  };
  /**
   * One death. `buckle`/`final` are body descriptors; `hands` are shoulder-relative flings and absolute ground marks;
   * `rifle` is the ground rest of the weapon. Timing t = {b:[a,b] stagger, f:[a,b] fall, r: release, g: ground contact}.
   */
  const death = (name, label, o) => out.push({ name, duration: o.duration, fps: 60, loop: false, poseAt: u => {
    const start = standingBase(), p1 = blend(u, o.t.b[0], o.t.b[1]), p2 = blend(u, o.t.f[0], o.t.f[1]);
    const body = mixBody(mixBody(start, o.buckle, p1), o.final, p2);
    // Mid-fall limbs trail the torso: feet follow the same eased path as the body (they leave the ground at the stagger).
    return compose(R, body, W => {
      const low = lowReady(W, 0), hold = 1 - blend(u, o.t.r - 0.05, o.t.r + 0.07), toss = blend(u, o.t.r, o.t.g), settle = blend(u, o.t.g, o.t.g + 0.12);
      const rest = rifleAt(o.rifle.pos, o.rifle.dir, o.rifle.up);
      const arc = 0.22 * Math.sin(Math.PI * toss) * (1 - settle);
      const wFree = { pos: v3.add(mix(low.pos, rest.pos, toss), [0, arc, 0]), rot: q.slerp(low.rot, rest.rot, toss) };
      const w = hold > 0.999 ? low : wFree;
      const fl = blend(u, o.t.r - 0.05, o.t.r + 0.12), gd = blend(u, o.t.f[0] + 0.1, o.t.g);
      const hand = s => {
        const grip = handOn(w, s === 'r' ? GRIP_R : GRIP_L), sh = W[`upperarm_${s}`].p, off = o.hands.fling[s], gnd = o.hands.ground[s];
        const flung = { pos: v3.add(sh, off), fdir: N([s === 'r' ? 0.3 : -0.3, -0.7, -0.4]), palm: N([s === 'r' ? -0.8 : 0.8, 0.2, 0.3]) };
        const ground = { pos: gnd, fdir: N(o.hands.dir[s]), palm: [0, -1, 0] };
        const free = { pos: mix(flung.pos, ground.pos, gd), fdir: N(mix(flung.fdir, ground.fdir, gd)), palm: N(mix(flung.palm, ground.palm, gd)) };
        return { pos: mix(grip.pos, free.pos, fl), fdir: N(mix(grip.fdir, free.fdir, fl)), palm: N(mix(grip.palm, free.palm, fl)), pole: mix(s === 'r' ? [0.7, -0.6, 0.35] : [-0.35, -1, 0.1], s === 'r' ? [0.8, 0.2 + (o.hands.up ?? 0.8) * gd, 0.2] : [-0.8, 0.2 + (o.hands.up ?? 0.8) * gd, 0.2], fl) };
      };
      const curl = mix(0.7, 0.25, fl);
      return { weapon: w, hands: { r: hand('r'), l: hand('l') }, fingers: { l: { curl: mix(0.62, 0.3, fl), thumb: 0.3 }, r: { curl, index: mix(0.35, 0.2, fl), thumb: 0.3 } } };
    });
  }, meta: { family: 'hands_free', mask: 'full', pose: 'standing->fallen', interrupt: 'none', semantic: label, impact_from: o.from, fall_toward: o.toward, audit: { mode: 'planted', ground: true, final_still_s: o.still }, events: o.events, reference_start: 'standing_idle t0' } });

  const stagger = (b, extra) => ({ ...standingBase(b), ...extra });
  // death_front: impact from the front, thrown backwards onto the back (supine, head towards +Z).
  death('death_front', 'hit from the front: rocks back, knees give, falls onto the back and lies still; rifle slips away', {
    duration: 1.6, from: 'front', toward: 'back', still: 0.3, events: { release: 0.3, ground: 0.78 },
    t: { b: [0.04, 0.34], f: [0.26, 0.76], r: 0.30, g: 0.78 },
    buckle: standingBase({ hips: { pos: [0, 0.80, 0.20], rot: { pitch: -14, roll: 3 } }, spine: [{ pitch: -8 }, { pitch: -12 }, { pitch: -8 }], neck: { pitch: -8 }, head: { pitch: -14, yaw: 6 },
      feet: { l: foot(-0.12, 0.05, { yaw: 8 }), r: foot(0.12, 0.10, { yaw: -10 }) } }),
    final: { hips: { pos: [0, 0.112, 0.10], rot: { pitch: -90, roll: 8 } }, spine: [{ pitch: 0 }, { pitch: 0, roll: 4 }, { pitch: 0 }], neck: { pitch: 0, yaw: 25 }, head: { pitch: 0, yaw: 20 }, jaw: 6,
      clav: { l: { roll: 6 }, r: { roll: -6 } }, feet: lyingFeet.supine },
    hands: { fling: { l: [-0.34, 0.05, 0.18], r: [0.36, 0.05, 0.18] }, ground: { r: [0.45, 0.075, 0.28], l: [-0.42, 0.085, 0.05] }, dir: { r: [0.6, 0, 0.6], l: [-0.7, 0, -0.5] } },
    rifle: { pos: [0.55, 0.03, 0.0], dir: N([0.3, 0, -1]), up: [-1, 0, 0] } });
  // death_back: impact from behind, pitched forward onto the face (prone, head towards -Z).
  death('death_back', 'hit from behind: thrown forward, knees give, falls on the face and lies still; rifle skids ahead', {
    duration: 1.5, from: 'back', toward: 'front', still: 0.3, events: { release: 0.28, ground: 0.72 },
    t: { b: [0.04, 0.32], f: [0.24, 0.70], r: 0.28, g: 0.72 },
    buckle: standingBase({ hips: { pos: [0, 0.80, -0.03], rot: { pitch: 18, roll: -3 } }, spine: [{ pitch: 12 }, { pitch: 14 }, { pitch: 8 }], neck: { pitch: -8 }, head: { pitch: -12, yaw: -5 },
      feet: { l: foot(-0.12, -0.10, { yaw: 8 }), r: foot(0.12, -0.06, { yaw: -10 }) } }),
    final: { hips: { pos: [0, PRONE_HIPS, 0.30], rot: { pitch: 88, roll: -3, yaw: -6 } }, spine: [{ pitch: 3 }, { pitch: 3 }, { pitch: 3 }], neck: { pitch: -14, yaw: 55 }, head: { pitch: -10, yaw: 30, roll: -8 }, jaw: 5,
      clav: { l: { roll: 6 }, r: { roll: -6 } }, feet: lyingFeet.prone },
    hands: { fling: { l: [-0.22, -0.02, -0.34], r: [0.22, -0.02, -0.34] }, ground: { r: [0.40, 0.07, -0.34], l: [-0.36, 0.07, -0.22] }, dir: { r: [0.3, 0, -0.9], l: [-0.4, 0, -0.9] } },
    rifle: { pos: [0.34, 0.03, -0.62], dir: N([0.05, 0, -1]), up: [-1, 0, 0] } });

  // side falls: lying on the right (death_left, impact from the left) or the left side (death_right).
  const sideFall = (name, sgn, from, toward) => death(name, `hit from the ${from}: shoved away, legs fold, falls on the ${toward} side; rifle dropped`, {
    duration: 1.5, from, toward, still: 0.3, events: { release: 0.26, ground: 0.74 },
    t: { b: [0.04, 0.30], f: [0.22, 0.72], r: 0.26, g: 0.74 },
    buckle: standingBase({ hips: { pos: [0.07 * sgn, 0.79, 0.05], rot: { roll: -14 * sgn, yaw: 6 * sgn } }, spine: [{ pitch: 2, roll: -10 * sgn }, { roll: -12 * sgn }, { pitch: 2, roll: -8 * sgn }], neck: { roll: -10 * sgn }, head: { roll: -14 * sgn, pitch: 6 },
      feet: { l: foot(-0.12, 0.0, { yaw: 8 }), r: foot(0.12, 0.02, { yaw: -10 }) } }),
    final: { hips: { pos: [0.06 * sgn, 0.19, 0.06], rot: { roll: -90 * sgn, pitch: 12 } }, spine: [{ pitch: 4 }, { pitch: 6 }, { pitch: 4 }], neck: { pitch: 8, roll: 0 }, head: { pitch: 6, roll: -6 * sgn }, jaw: 4,
      clav: { l: { roll: 3 }, r: { roll: -3 } },
      feet: { l: { pos: [-0.56 * sgn, sgn > 0 ? 0.19 : 0.10, 0.10], rot: q.axis([0, 0, 1], -90 * sgn), pole: N([-0.1, 0.1, -1]), toe: 0 }, r: { pos: [-0.60 * sgn, sgn > 0 ? 0.10 : 0.19, 0.20], rot: q.axis([0, 0, 1], -90 * sgn), pole: N([-0.1, 0.1, -1]), toe: 0 } } },
    hands: { up: 0.25, fling: { l: [-0.30 * sgn - 0.05, 0.04, -0.2], r: [0.30 * sgn + 0.05, 0.04, -0.2] }, ground: sgn > 0 ? { r: [0.50, 0.15, -0.38], l: [0.30, 0.24, -0.18] } : { l: [-0.50, 0.15, -0.38], r: [-0.30, 0.24, -0.18] }, dir: { r: [0.5, 0, -0.8], l: [-0.5, 0, -0.8] } },
    rifle: { pos: [-0.25 * sgn, 0.03, -0.62], dir: N([0.1 * sgn, 0, -1]), up: [-1, 0, 0] } });
  sideFall('death_left', 1, 'left', 'right');
  sideFall('death_right', -1, 'right', 'left');

  // death_crumple: both knees give, slump forward onto the left side and curl up.
  death('death_crumple', 'no clear direction: knees buckle, the soldier folds and slumps onto the left side, curled', {
    duration: 1.8, from: 'any', toward: 'down', still: 0.35, events: { release: 0.30, ground: 0.72 },
    t: { b: [0.04, 0.40], f: [0.34, 0.72], r: 0.30, g: 0.72 },
    buckle: { hips: { pos: [0.0, 0.52, 0.14], rot: { pitch: 24, roll: -4 } }, spine: [{ pitch: 16 }, { pitch: 18 }, { pitch: 10 }], neck: { pitch: 10 }, head: { pitch: 22, yaw: 8 }, clav: { l: { pitch: 6 }, r: { pitch: 6 } },
      feet: { l: foot(-0.14, -0.22, { yaw: 6 }), r: foot(0.14, 0.46, { yaw: -8, y: 0.11, pitch: 40, toe: 45 }) } },
    final: { hips: { pos: [-0.04, 0.21, 0.10], rot: { roll: 90, pitch: 10 } }, spine: [{ pitch: 5 }, { pitch: 6 }, { pitch: 4 }], neck: { pitch: 4 }, head: { pitch: 2, roll: 6 }, jaw: 3,
      clav: { l: { roll: 4, pitch: 8 }, r: { roll: -4, pitch: 8 } },
      feet: { l: { pos: [0.02, 0.10, 0.36], rot: q.axis([0, 0, 1], 90), pole: N([0.1, 0.1, -1]), toe: 0 }, r: { pos: [0.10, 0.21, 0.30], rot: q.axis([0, 0, 1], 90), pole: N([0.1, 0.1, -1]), toe: 0 } } },
    hands: { up: 0.25, fling: { l: [-0.18, -0.1, -0.22], r: [0.18, -0.1, -0.22] }, ground: { l: [-0.50, 0.15, -0.36], r: [-0.28, 0.22, -0.30] }, dir: { r: [-0.5, 0, -0.8], l: [-0.6, 0, -0.7] } },
    rifle: { pos: [0.35, 0.03, -0.20], dir: N([0.08, 0, -1]), up: [-1, 0, 0] } });
  return out;
}
