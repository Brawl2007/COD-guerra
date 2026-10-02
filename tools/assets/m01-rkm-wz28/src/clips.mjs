// Clips da rkm wz.28 para o rig existente dos soldados (mesmos 60 ossos e o mesmo solver FK + IK de 2 ossos de
// tools/assets/m01-soldiers/src/pose.mjs). A arma vai no osso `weapon`: as mãos seguem o punho de pistola e o fuste da
// rkm (perfil RKM_GRIP) e o olho fica na linha de mira. Valores de GAMEPLAY: rajada de 3 a 600 tiros/min, como a
// simulação gasta por rajada de Kowal (src/game/m01-simulation.js); a afinar em playtest.
import { GAME_BONES } from '../../m01-soldiers/src/human.mjs';
import { q, solve, weaponPoint, weaponDir } from '../../m01-soldiers/src/pose.mjs';
import { v3, smoothstep } from '../../m01-soldiers/src/meshops.mjs';
import { RKM, sockets } from './rkm.mjs';

const FPS = 30, N = v3.norm, deg = Math.PI / 180, S = sockets();
// Mãos na arma (referencial da arma): pulso, direcção dos dedos e normal da palma.
export const RKM_GRIP = {
  r: { pos: [0.034, -0.032, 0.1], fdir: N([-0.3, -0.62, -0.72]), palm: N([-1, 0.05, 0.15]) },
  l: { pos: [-0.03, -0.05, -0.37], fdir: N([0.55, 0.12, -0.83]), palm: N([-0.25, 1, 0.05]) },
};
const handOn = (w, g) => ({ pos: weaponPoint(w, g.pos), fdir: weaponDir(w, g.fdir), palm: weaponDir(w, g.palm) });
const fingers = { l: { curl: 0.62, thumb: 0.55 }, r: { curl: 0.72, index: 0.35, thumb: 0.6 } };
const hold = w => ({ weapon: w, hands: { r: { ...handOn(w, RKM_GRIP.r), pole: [0.7, -0.6, 0.35] }, l: { ...handOn(w, RKM_GRIP.l), pole: [-0.35, -1, 0.1] } }, fingers });
const frame = (pos, F, up = [0, 1, 0]) => ({ pos, rot: q.frame([0, 0, -1], [0, 1, 0], N(F), up) });

function foot(x, z, { yaw = 0, y = 0.072 } = {}) {
  const rot = q.axis([0, 1, 0], yaw), fwd = q.rot(rot, [0, 0, -1]);
  return { pos: [x, y, z], rot, pole: N(v3.add(fwd, [Math.sign(x) * 0.25, 0, 0])) };
}
/** Corpo primeiro (para conhecer olho e tronco), depois arma e mãos. */
const compose = (R, body, extra) => solve(R, { ...body, ...extra(solve(R, body).W) });

/** Transporte: rkm pronta em baixo (punho de pistola à anca direita, boca para baixo e para a esquerda), respiração. */
function carryPose(R, b) {
  const body = { hips: { pos: [0, 0.9 + 0.004 * b, 0.062], rot: { pitch: -1 } }, feet: { l: foot(-0.12, 0, { yaw: 8 }), r: foot(0.12, 0.02, { yaw: -10 }) },
    spine: [{ pitch: 0.5 + b, roll: 1 }, { pitch: 1.5 * b }, { pitch: 1 + b }], neck: { pitch: 2 }, head: { pitch: 2 } };
  return compose(R, body, W => {
    const grip = v3.add(W.spine_01.p, q.rot(W.spine_01.r, [0.13, 0.1 + b * 0.01, -0.13]));
    return hold(frame(grip, q.rot(W.spine_01.r, N([-0.6, -0.25, -0.76])), q.rot(W.spine_01.r, N([0.25, 1, 0]))));
  });
}

/** Pontaria de pé: tronco de lado, face na coronha, olho na linha de mira; kick empurra a arma para trás e para cima. */
function aimPose(R, { sway = [0, 0], kick = 0, rise = 0 } = {}) {
  const body = {
    hips: { pos: [0.01, 0.89, 0.07], rot: { yaw: -32, pitch: 3 } },
    spine: [{ pitch: 3, yaw: -4 }, { pitch: 3, yaw: -4, roll: -2 }, { pitch: 2 - kick * 1.5, yaw: -3, roll: -3 }],
    neck: { yaw: 22, pitch: 10, roll: -6 }, head: { yaw: 18, pitch: 6, roll: -14 },
    clav: { r: { yaw: 10, roll: -8 }, l: { yaw: -6 } },
    feet: { l: foot(-0.1, -0.16, { yaw: -10 }), r: foot(0.17, 0.2, { yaw: -60 }) },
  };
  return compose(R, body, W => {
    const F = N([Math.sin(sway[0] * deg), Math.sin((sway[1] + rise + kick * 3) * deg), -1]);
    const w0 = frame([0, 0, 0], F, N([0.06, 1, 0]));
    return hold({ pos: v3.sub(v3.add(W.eye_r.p, [0, 0, kick * 0.018]), q.rot(w0.rot, S.cheek)), rot: w0.rot });
  });
}

const SHOT = 60 / RKM.rate_rpm;
/** Rajada de n a partir de 0: recuo (0..1) por disparo e subida acumulada (graus) que volta depois da rajada. */
function burst(t, n) {
  const k = Math.floor(t / SHOT), ph = t / SHOT - k, firing = k < n;
  return { kick: firing ? Math.sin(Math.min(1, ph * 1.6) * Math.PI) : 0, rise: 0.9 * Math.min(n, t / SHOT) * (1 - smoothstep(n * SHOT + 0.05, n * SHOT + 0.45, t)) };
}

function sample(R, name, duration, fn, extras) {
  const frames = Math.max(2, Math.round(duration * FPS) + 1), times = [], poses = [];
  for (let i = 0; i < frames; i++) { const t = Math.min(duration, i / FPS); times.push(t); poses.push(fn(t, t / duration)); }
  const tracks = [], moved = new Set(['root', 'hips', 'weapon', 'weapon_bolt', 'weapon_clip']);
  for (const b of GAME_BONES) {
    const rots = poses.map(p => p.local[b.name] ?? q.id());
    for (let i = 1; i < rots.length; i++) if (rots[i - 1].reduce((s, x, k) => s + x * rots[i][k], 0) < 0) rots[i] = rots[i].map(x => -x);
    if (rots.some(r => Math.abs(r[3]) < 0.99999) || b.name === 'weapon') tracks.push({ bone: b.name, path: 'rotation', times, values: rots.flat() });
    if (moved.has(b.name) && poses.every(p => p.trans[b.name])) tracks.push({ bone: b.name, path: 'translation', times, values: poses.flatMap(p => p.trans[b.name]) });
  }
  // O clipe de 5 da espingarda fica escondido (escala 0); a arma visível (escala 1).
  tracks.push({ bone: 'weapon_clip', path: 'scale', times: [0, duration], values: [0, 0, 0, 0, 0, 0], interpolation: 'STEP' });
  tracks.push({ bone: 'weapon', path: 'scale', times: [0, duration], values: [1, 1, 1, 1, 1, 1], interpolation: 'STEP' });
  return { name, tracks, extras: { fps: FPS, weapon: 'rkm_wz28', ...extras } };
}

/** rkm_carry (transporte), rkm_aim (pontaria) e rkm_fire_burst (rajada de 3). R = rigInfo(J) do rig dos soldados. */
export function buildRkmClips(R) {
  const n = 3, dur = +(n * SHOT + 0.5).toFixed(2), fire = Array.from({ length: n }, (_, i) => +(i * SHOT).toFixed(3));
  return [
    sample(R, 'rkm_carry', 4, (t, u) => carryPose(R, Math.sin(u * Math.PI * 2)), { loop: true, pose: 'standing', bipod: 'folded' }),
    sample(R, 'rkm_aim', 2, (t, u) => aimPose(R, { sway: [0.6 * Math.sin(u * Math.PI * 2), 0.45 * Math.sin(u * Math.PI * 4)] }), { loop: true, pose: 'standing', bipod: 'folded' }),
    sample(R, 'rkm_fire_burst', dur, t => { const f = burst(t, n); return aimPose(R, { kick: 0.55 * f.kick, sway: [0.25 * f.kick, 0], rise: f.rise }); },
      { loop: false, pose: 'standing', bipod: 'folded', rounds: n, rate_rpm: RKM.rate_rpm, events: { fire } }),
  ];
}
