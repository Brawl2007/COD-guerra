// Locomotion: sprint and crouch walk (taken unchanged from the reviewed motion package), turn in place, carry walk.
// The locomotion clips are in place: the support foot moves backwards at exactly the nominal speed, so adding the
// actor's displacement keeps it still on the ground. Turn clips assume the actor's body yaw advances linearly while
// the clip plays (`yaw` in the metadata); the planted boots are authored against that yaw.
import { buildClips as motionClips } from '../clips.mjs';
import { q, v3, N, TAU, bump, blend, ease, foot, standingBody, readyPose, compose, slung } from './common.mjs';

const lerp = (a, b, t) => a + (b - a) * t;
const rotY = (v, yawDeg) => q.rot(q.axis([0, 1, 0], yawDeg), v);

/** Boot target with the lowest sole point 4 mm above ground whatever the pitch (same rule as the motion package). */
function boot(R, side, x, z, lift = 0, yaw = 0, pitch = 0) {
  const rot = q.mul(q.axis([0, 1, 0], yaw), q.axis([1, 0, 0], pitch));
  const h = R.J[`foot_${side}`][1];
  const soleY = Math.max(...[-0.190, 0.100].map(zz => -q.rot(rot, [0, -h, zz])[1]));
  return { pos: [x, soleY + 0.004 + lift, z], rot, pole: N(v3.add(rotY([0, 0, -1], yaw), [side === 'l' ? -0.15 : 0.15, 0, 0])) };
}
/** Support travels back at cycle/period m/s, swing is a Hermite arc with matching end tangents. */
function strideFoot(R, side, u, { cycle, duty, lift, width, centre, pitch, knee = 0 }) {
  const phase = (u + (side === 'r' ? 0.5 : 0)) % 1, reach = cycle * duty, yaw = side === 'l' ? 4 : -4;
  let z, height = 0, angle = 0;
  if (phase <= duty) z = centre - reach / 2 + cycle * phase;
  else {
    const v = (phase - duty) / (1 - duty), p0 = centre + reach / 2, p1 = centre - reach / 2, tangent = cycle * (1 - duty);
    const hermite = (x, a, b, da, db) => { const x2 = x * x, x3 = x2 * x; return (2 * x3 - 3 * x2 + 1) * a + (x3 - 2 * x2 + x) * da + (-2 * x3 + 3 * x2) * b + (x3 - x2) * db; };
    const edge = 0.13, overrun = cycle > 1 ? 0.047 : 0.018;
    if (v < edge) z = hermite(v / edge, p0, p0 + overrun, tangent * edge, 0);
    else if (v > 1 - edge) z = hermite((v - 1 + edge) / edge, p1 - overrun, p1, 0, tangent * edge);
    else z = lerp(p0 + overrun, p1 - overrun, ease((v - edge) / (1 - 2 * edge)));
    height = lift * Math.pow(Math.sin(Math.PI * v), 2) * (1 + 0.18 * Math.sin(TAU * v));
    if (knee && v < 0.4) height += knee * Math.pow(Math.sin(Math.PI * v / 0.4), 2);
    angle = pitch * Math.pow(Math.sin(Math.PI * v), 2) * Math.sin(Math.PI * (v - 0.15));
  }
  return boot(R, side, side === 'l' ? -width : width, z, height, yaw, angle);
}

export function locomotionClips(R) {
  const out = [], motion = motionClips(R);
  // ——— taken unchanged (same keys, same bytes of track data) from the motion package ———
  const verbatim = {
    sprint: { family: 'port', mask: 'full', pose: 'standing', semantic: 'armed sprint, rifle at port arms', interrupt: 'any' },
    crouch_walk: { family: 'low_ready', mask: 'full', pose: 'crouched', semantic: 'crouched advance, rifle low ready', interrupt: 'any' },
    hit_front: { family: 'low_ready', mask: 'additive', pose: 'standing', semantic: 'chest impulse from the front', interrupt: 'none', reference: 'frame 0' },
    near_miss_duck: { family: 'low_ready', mask: 'additive', pose: 'standing', semantic: 'defensive duck as a round passes', interrupt: 'none', reference: 'frame 0' },
  };
  for (const [name, meta] of Object.entries(verbatim)) {
    const m = motion.find(x => x.meta.name === name), loco = m.meta.loop;
    out.push({ name, clip: m.clip, duration: m.meta.duration_s, fps: m.meta.sampled_fps, loop: m.meta.loop, source: 'motion-clips-v1 (identical track data)',
      meta: { ...meta, audit: loco ? { mode: 'locomotion', speedMps: m.meta.nominal_speed_mps, cycleM: m.meta.cycle_distance_m } : { mode: 'planted' },
        ...(loco ? { locomotion: { gait: name, speedMps: m.meta.nominal_speed_mps, cycleM: m.meta.cycle_distance_m, stepM: m.meta.step_distance_m } } : {}),
        ...(m.meta.presentation_event ? { presentation_event: m.meta.presentation_event } : {}) } });
  }

  // ——— turn in place: 90 degrees in 0.5 s (the 180 deg/s body-yaw limit of the contract) ———
  const TURN_T = 0.5;
  for (const dir of [1, -1]) {
    const name = dir > 0 ? 'turn_left_90' : 'turn_right_90', lead = dir > 0 ? 'l' : 'r', trail = dir > 0 ? 'r' : 'l';
    const ready = standingBody(0), marks = { l: ready.feet.l, r: ready.feet.r };
    const swingWin = { [lead]: [0.06, 0.46], [trail]: [0.50, 0.92] };
    out.push({ name, duration: TURN_T, fps: 60, loop: false, meta: {
      family: 'low_ready', mask: 'lower', pose: 'standing', interrupt: 'none', semantic: `in-place step turn ${dir > 0 ? 'left' : 'right'}; the rotation comes from bodyYaw`,
      yaw: { deltaDeg: 90 * dir, profile: 'linear', startS: 0, endS: TURN_T }, reference_start: 'standing_idle t0', reference_end: 'standing_idle t0 (actor rotated by bodyYaw)',
      audit: { mode: 'planted', yawDeg: 90 * dir }, events: { lead_foot_down: +(swingWin[lead][1] * TURN_T).toFixed(3), trail_foot_down: +(swingWin[trail][1] * TURN_T).toFixed(3) } },
    poseAt: u => {
      const yaw = 90 * dir * u, feet = {}, swingK = {};
      for (const s of ['l', 'r']) {
        const [a, b] = swingWin[s], k = blend(u, a, b), mark = marks[s];
        // World boot path: planted on its mark, one arc to the mark rotated by the full turn, planted again.
        const w0 = mark.pos, wf = rotY(mark.pos, 90 * dir), world = [lerp(w0[0], wf[0], k), 0, lerp(w0[2], wf[2], k)];
        const yawMark = (s === 'l' ? 8 : -10), footYaw = yawMark + 90 * dir * k - yaw;
        const p = rotY(world, -yaw), lift = 0.055 * Math.pow(Math.sin(Math.PI * k), 2);
        feet[s] = foot(p[0], p[2], { yaw: footYaw, y: 0.072 + lift });
        swingK[s] = Math.pow(Math.sin(Math.PI * k), 2);
      }
      const transfer = 0.045 * (swingK.l - swingK.r), look = bump(u, 0, 0.18, 0.55, 0.95);
      const body = { ...ready, hips: { pos: [transfer, 0.905 - 0.012 * (swingK.l + swingK.r), 0.062], rot: { yaw: 6 * dir * look, roll: -transfer * 30 } },
        spine: [{ pitch: 1, yaw: 6 * dir * look }, { yaw: 6 * dir * look }, { pitch: 1, yaw: 5 * dir * look }], neck: { pitch: 2, yaw: 18 * dir * look }, head: { pitch: 2, yaw: 12 * dir * look }, feet };
      return readyPose(R, body, 0);
    } });
  }

  // ——— carry walk: carrier with a casualty on the right shoulder (partner clip `carried`, socket `carry_socket`) ———
  const CARRY = { T: 1.1, speed: 1.6 };
  const carryCycle = CARRY.speed * CARRY.T, cfg = { cycle: carryCycle, duty: 0.64, lift: 0.075, width: 0.14, centre: 0.06, pitch: 8, knee: 0.02 };
  out.push({ name: 'carry_walk', duration: CARRY.T, fps: 120, loop: true, meta: {
    family: 'carry', mask: 'full', pose: 'standing', interrupt: 'any', semantic: 'fireman carry, 1.6 m/s: re-authored carry_wounded (kept intact), casualty clip `carried` attaches to carry_socket',
    attach_partner: 'carried', partner_socket: 'carry_socket', audit: { mode: 'locomotion', speedMps: CARRY.speed, cycleM: carryCycle }, locomotion: { gait: 'carry', speedMps: CARRY.speed, cycleM: carryCycle, stepM: carryCycle / 2 } },
  poseAt: u => {
    const ph = u === 1 ? 0 : u, a = Math.sin(TAU * ph), b = Math.cos(TAU * ph * 2);
    const body = { hips: { pos: [0.014 * a, 0.800 + 0.010 * (1 - b), 0.082], rot: { pitch: 4.5, yaw: 3.5 * a, roll: -2.2 * a } },
      spine: [{ pitch: 5, roll: 3, yaw: -2.5 * a }, { pitch: 5, roll: 3, yaw: -2 * a }, { pitch: 3.5, roll: 2 }], neck: { pitch: -5 }, head: { pitch: -5 },
      clav: { r: { roll: -8 } }, feet: { l: strideFoot(R, 'l', ph, cfg), r: strideFoot(R, 'r', ph, cfg) } };
    return compose(R, body, W => {
      const sh = W.upperarm_r.p;
      return { weapon: slung(R, body),
        hands: { r: { pos: v3.add(sh, q.rot(W.spine_03.r, [0.0, -0.12, -0.24])), fdir: q.rot(W.spine_03.r, N([-0.3, 0.4, -0.85])), palm: q.rot(W.spine_03.r, N([-0.6, -0.7, 0.2])), pole: [0.9, -0.2, 0.3] },
          l: { pos: v3.add(W.spine_02.p, q.rot(W.spine_02.r, [0.0, 0.0, -0.28 + 0.02 * a])), fdir: q.rot(W.spine_02.r, N([0.8, -0.2, -0.5])), palm: q.rot(W.spine_02.r, N([0.1, 0.2, 1])), pole: [-0.8, -0.5, 0.2] } },
        fingers: { l: { curl: 0.7, thumb: 0.6 }, r: { curl: 0.75, thumb: 0.5 } } };
    });
  } });
  return out;
}
