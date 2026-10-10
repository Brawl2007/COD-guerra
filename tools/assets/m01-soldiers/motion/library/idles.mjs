// Idle variants and one-shot fidgets for the standing / kneeling soldier with the rifle at low ready.
// Loops use integer harmonics only, so the first and last keys are identical and the velocity is periodic.
// Fidgets start and end on the exact `standing_idle` junction pose and keep both feet on their idle marks
// (the step in `fidget_shift` leaves and returns to the same marks).
import { q, v3, N, TAU, mix, wave, bump, blend, clamp01, foot, standingBody, kneelBody, readyPose, compose, holdRifle, lowReady, handOn, GRIP_R, GRIP_L, fingersRifle, rifleFrame } from './common.mjs';

const standingBase = (o = {}) => {
  const b = standingBody(0);
  return { ...b, ...o, hips: { ...b.hips, ...o.hips }, feet: { ...b.feet, ...o.feet } };
};

export function idleClips(R) {
  const out = [];
  const add = (name, duration, fps, loop, poseAt, meta) => out.push({ name, duration, fps, loop, poseAt, meta: { pose: 'standing', family: 'low_ready', mask: 'full', interrupt: 'any', audit: { mode: 'planted' }, ...meta } });

  // standing_idle_b: weight on the right leg, left foot relaxed forward and turned out, slow scan of the horizon.
  add('standing_idle_b', 4, 30, true, u => {
    const b = Math.sin(u * TAU), s1 = Math.sin(u * TAU), s2 = Math.sin(u * TAU * 2 + 0.6);
    const body = standingBase({
      hips: { pos: [0.030 + 0.003 * s1, 0.897 + 0.004 * b, 0.066], rot: { roll: 2.2 + 0.4 * s1, yaw: -3 + 1.2 * s1 } },
      spine: [{ pitch: 1 + b, roll: -1.5 }, { pitch: 1.5 * b, roll: -1.2, yaw: 2 * s2 }, { pitch: 1 + b, roll: -0.8 }],
      neck: { pitch: 2, yaw: 5 * s1 + 2 * s2 }, head: { pitch: 2 + 0.8 * s2, yaw: 7 * s1, roll: 1 },
      feet: { l: foot(-0.14, -0.045, { yaw: 17 }), r: foot(0.10, 0.045, { yaw: -7 }) },
    });
    return readyPose(R, body, b);
  }, { semantic: 'standing weight on right leg, relaxed left foot', variant_of: 'standing_idle' });

  // standing_idle_c: feet apart, rifle carried higher on the chest, two glances.
  add('standing_idle_c', 4, 30, true, u => {
    const b = Math.sin(u * TAU), glance = wave(u, [[0, 0], [0.18, 1], [0.34, 1], [0.5, 0], [0.62, -0.8], [0.8, -0.8], [0.94, 0], [1, 0]]);
    const body = standingBase({
      hips: { pos: [-0.006 * Math.sin(u * TAU), 0.893 + 0.004 * b, 0.058], rot: { yaw: 1.5 * Math.sin(u * TAU), pitch: 1 } },
      spine: [{ pitch: 1.5 + b, yaw: 3 * glance }, { pitch: 1 + 1.4 * b, yaw: 2 * glance }, { pitch: 1 + b, yaw: 2 * glance }],
      neck: { pitch: 3, yaw: 14 * glance }, head: { pitch: 1.5, yaw: 12 * glance },
      feet: { l: foot(-0.19, 0.0, { yaw: 11 }), r: foot(0.19, 0.0, { yaw: -11 }) },
    });
    return compose(R, body, W => {
      const w = lowReady(W, b);
      const chest = v3.add(W.spine_02.p, q.rot(W.spine_02.r, [0.10, -0.04 + 0.004 * b, -0.17]));
      const raised = rifleFrame(chest, v3.add(chest, q.rot(W.spine_02.r, N([-0.5, 0.3, -0.8]))), q.rot(W.spine_02.r, N([0.3, 1, 0])));
      return holdRifle({ pos: mix(w.pos, raised.pos, 0.85), rot: q.slerp(w.rot, raised.rot, 0.85) });
    });
  }, { semantic: 'standing at ease, feet apart, rifle carried high, glances left and right', variant_of: 'standing_idle' });

  // crouched_idle_b: the other knee on the ground.
  add('crouched_idle_b', 3, 30, true, u => {
    const b = Math.sin(u * TAU), base = kneelBody(b);
    const mirror = {
      hips: { pos: [-0.02, base.hips.pos[1], 0.12], rot: { pitch: base.hips.rot.pitch, yaw: 6 } },
      spine: base.spine.map((s, i) => ({ ...s, yaw: [2, 1.5, 1][i] })), neck: { pitch: 4, yaw: -8 * Math.sin(u * TAU) }, head: { pitch: 2, yaw: -10 * Math.sin(u * TAU) },
      feet: { l: foot(-0.14, 0.5, { yaw: 8, y: 0.11, pitch: 40, toe: 45 }), r: foot(0.14, -0.26, { yaw: -6 }) },
    };
    return readyPose(R, mirror, b);
  }, { pose: 'crouched', semantic: 'kneeling on the left knee, rifle low ready', variant_of: 'crouched_idle' });

  // ——— one-shot fidgets ———
  // fidget_look: glance left, glance right, return. Lower body untouched (upper mask).
  add('fidget_look', 2, 30, false, u => {
    const g = wave(u, [[0, 0], [0.16, 1], [0.38, 1], [0.54, -1], [0.78, -1], [1, 0]]);
    const body = standingBase({ spine: [{ pitch: 1, yaw: 5 * g }, { pitch: 0, yaw: 6 * g }, { pitch: 1, yaw: 5 * g }], neck: { pitch: 2, yaw: 24 * g }, head: { pitch: 2 - 2 * Math.abs(g), yaw: 18 * g } });
    return readyPose(R, body, 0);
  }, { mask: 'upper', semantic: 'glance left then right', events: { look_left: 0.3, look_right: 0.75 }, reference: 'standing_idle t0' });

  // fidget_shift: weight to the left leg, right boot repositioned outward, weight back, boot returned to its mark.
  add('fidget_shift', 2, 30, false, u => {
    const step = bump(u, 0.12, 0.34, 0.70, 0.90), lift = Math.pow(Math.sin(Math.PI * clamp01(wave(u, [[0.12, 0], [0.34, 1]]))), 2) * (1 - blend(u, 0.34, 0.35)) + Math.pow(Math.sin(Math.PI * clamp01(wave(u, [[0.70, 0], [0.90, 1]]))), 2) * blend(u, 0.70, 0.71);
    const shift = bump(u, 0.04, 0.2, 0.62, 0.84), shrug = bump(u, 0.35, 0.48, 0.55, 0.7);
    const rf = foot(0.12 + 0.065 * step, 0.02 - 0.03 * step, { yaw: -10 - 6 * step, y: 0.072 + 0.045 * lift });
    const body = standingBase({
      hips: { pos: [-0.02 * shift, 0.905 - 0.006 * shift, 0.062], rot: { roll: -1.8 * shift, yaw: 2 * shift } },
      spine: [{ pitch: 1, roll: 1.5 * shift }, { pitch: 0.5 * shrug }, { pitch: 1 + 1.5 * shrug }], neck: { pitch: 2 }, head: { pitch: 2 + 2 * shrug, yaw: -5 * shift },
      clav: { l: { roll: -2 * shrug }, r: { roll: 2 * shrug, pitch: -1 * shrug } },
      feet: { r: rf },
    });
    return readyPose(R, body, shrug);
  }, { mask: 'full', semantic: 'shifts weight, resets the right boot, shrugs the rifle strap', events: { boot_lift: 0.25, boot_down: 0.34, boot_return: 0.8 }, reference: 'standing_idle t0' });

  // fidget_helmet: right hand leaves the grip, touches the helmet brim, returns. The left hand keeps the rifle.
  add('fidget_helmet', 2.2, 30, false, u => {
    const k = bump(u, 0.10, 0.32, 0.62, 0.86), tap = 0.012 * Math.sin(u * TAU * 3) * bump(u, 0.35, 0.42, 0.56, 0.62);
    const body = standingBase({ neck: { pitch: 2 + 2 * k }, head: { pitch: 2 + 3 * k, roll: -2 * k }, spine: [{ pitch: 1 }, { pitch: 0 }, { pitch: 1 - 1 * k }] });
    return compose(R, body, W => {
      const w = lowReady(W, 0), grip = handOn(w, GRIP_R);
      const brim = v3.add(W.head.p, q.rot(W.head.r, [0.055, 0.035 + tap, -0.135]));
      const hand = { pos: mix(grip.pos, brim, k), fdir: N(mix(grip.fdir, q.rot(W.head.r, N([-0.2, 0.85, 0.35])), k)), palm: N(mix(grip.palm, q.rot(W.head.r, N([-0.9, 0.1, -0.3])), k)), pole: mix([0.7, -0.6, 0.35], [0.9, -0.4, 0.1], k) };
      return { weapon: w, hands: { r: hand, l: { ...handOn(w, GRIP_L), pole: [-0.35, -1, 0.1] } }, fingers: { l: fingersRifle.l, r: { curl: mix(0.72, 0.15, k), index: mix(0.35, 0.05, k), thumb: mix(0.6, 0.2, k) } } };
    });
  }, { mask: 'upper', semantic: 'right hand to the helmet brim', events: { hand_on_helmet: 0.7 }, reference: 'standing_idle t0' });

  // fidget_check_rifle: rifle lifted across the chest, eyes on the action, set back to low ready.
  add('fidget_check_rifle', 2.4, 30, false, u => {
    const k = bump(u, 0.10, 0.34, 0.66, 0.90), bolt = bump(u, 0.40, 0.46, 0.52, 0.58);
    const body = standingBase({ neck: { pitch: 2 + 14 * k }, head: { pitch: 2 + 10 * k, yaw: -4 * k }, spine: [{ pitch: 1 + 2 * k }, { pitch: 3 * k }, { pitch: 1 + 3 * k }] });
    return compose(R, body, W => {
      const low = lowReady(W, 0), chest = v3.add(W.spine_03.p, q.rot(W.spine_03.r, [0.03, -0.22, -0.2]));
      const held = rifleFrame(chest, v3.add(chest, q.rot(W.spine_03.r, N([-0.3, 0.55, -0.78]))), q.rot(W.spine_03.r, N([0.5, 1, 0.1])));
      const w = { pos: mix(low.pos, held.pos, k), rot: q.slerp(low.rot, held.rot, k) };
      const r = handOn(w, GRIP_R);
      return { weapon: w, hands: { r: { ...r, pos: v3.add(r.pos, q.rot(w.rot, [0, 0, -0.012 * bolt])), pole: [0.7, -0.6, 0.35] }, l: { ...handOn(w, GRIP_L), pole: [-0.35, -1, 0.1] } }, fingers: fingersRifle };
    });
  }, { mask: 'upper', semantic: 'lifts the rifle to look it over, brief thumb on the safety', events: { rifle_up: 0.8, rifle_down: 1.9 }, reference: 'standing_idle t0' });

  return out;
}
