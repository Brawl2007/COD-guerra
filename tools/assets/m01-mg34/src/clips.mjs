// Clips da MG 34 para o rig existente dos soldados (mesmos ossos e o mesmo solver FK + IK de 2 ossos de
// tools/assets/m01-soldiers/src/pose.mjs). A arma vai no osso `weapon`; as peças móveis da MG 34 são nós da própria
// cena da arma (mg34_feed_cover, mg34_cocking_handle, mg34_drum, mg34_belt) e os clips animam-nas pelo nome, por
// isso o rig não muda. Valores de GAMEPLAY: 800 tiros/min (intervalo de 0,075 s de src/game/m01-simulation.js) e
// rajada de 7, a mais longa da simulação; a afinar em playtest.
import { GAME_BONES } from '../../m01-soldiers/src/human.mjs';
import { q, solve, weaponPoint, weaponDir } from '../../m01-soldiers/src/pose.mjs';
import { v3, smoothstep, clamp } from '../../m01-soldiers/src/meshops.mjs';
import { foot, compose, frame } from '../../m01-rkm-wz28/src/clips.mjs';
import { MG34, PIVOTS, sockets } from './mg34.mjs';

const FPS = 30, N = v3.norm, deg = Math.PI / 180, S = sockets();
const seg = (t, a, b) => smoothstep(a, b, t);
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
// Mãos na arma (referencial da arma): pulso, direcção dos dedos e normal da palma. A esquerda segura as pernas do
// bípode dobrado por baixo da manga (a manga aquece).
export const MG34_GRIP = {
  r: { pos: [0.034, -0.03, 0.155], fdir: N([-0.3, -0.62, -0.72]), palm: N([-1, 0.05, 0.15]) },
  l: { pos: [-0.03, -0.03, -0.38], fdir: N([0.55, 0.12, -0.83]), palm: N([-0.25, 1, 0.05]) },
};
const handOn = (w, g) => ({ pos: weaponPoint(w, g.pos), fdir: weaponDir(w, g.fdir), palm: weaponDir(w, g.palm) });
/** Mão cujo ponto de contacto (dedos/palma) fica em `c` (mundo): o pulso fica atrás dos dedos e por trás da palma. */
const handAt = (c, fdir, palm) => ({ pos: v3.sub(c, v3.add(v3.mul(fdir, 0.07), v3.mul(palm, 0.025))), fdir, palm });
const blendHand = (a, b, t) => ({ pos: mix(a.pos, b.pos, t), fdir: N(mix(a.fdir, b.fdir, t)), palm: N(mix(a.palm, b.palm, t)) });
const FINGERS = { l: { curl: 0.72, thumb: 0.55 }, r: { curl: 0.72, index: 0.35, thumb: 0.6 } };

/** Pontaria de pé ao ombro (tiro de assalto com tambor): tronco inclinado para a frente contra os 12 kg e o recuo. */
function aimBody({ kick = 0 } = {}) {
  return {
    hips: { pos: [0.01, 0.885, 0.08], rot: { yaw: -30, pitch: 4 } },
    spine: [{ pitch: 4, yaw: -4 }, { pitch: 4, yaw: -4, roll: -2 }, { pitch: 3 - kick * 2, yaw: -3, roll: -3 }],
    neck: { yaw: 22, pitch: 10, roll: -6 }, head: { yaw: 18, pitch: 6, roll: -14 },
    clav: { r: { yaw: 10, roll: -8 }, l: { yaw: -6 } },
    feet: { l: foot(-0.11, -0.2, { yaw: -12 }), r: foot(0.18, 0.2, { yaw: -60 }) },
  };
}
/** Arma com o olho direito na linha de mira; kick empurra para trás, rise sobe a boca (graus). */
function aimWeapon(W, { sway = [0, 0], kick = 0, rise = 0 } = {}) {
  const F = N([Math.sin(sway[0] * deg), Math.sin((sway[1] + rise + kick * 3) * deg), -1]);
  const w0 = frame([0, 0, 0], F, N([0.06, 1, 0]));
  return { pos: v3.sub(v3.add(W.eye_r.p, [0, 0, kick * 0.022]), q.rot(w0.rot, S.cheek)), rot: w0.rot };
}
const hold = w => ({ weapon: w, hands: { r: { ...handOn(w, MG34_GRIP.r), pole: [0.7, -0.6, 0.35] }, l: { ...handOn(w, MG34_GRIP.l), pole: [-0.35, -1, 0.1] } }, fingers: FINGERS });
const aimPose = (R, o = {}) => compose(R, aimBody(o), W => hold(aimWeapon(W, o)));

const SHOT = 60 / MG34.rate_rpm;
/** Rajada de n a partir de 0: recuo (0..1) por disparo e subida acumulada (graus) que volta depois da rajada. */
function burst(t, n) {
  const k = Math.floor(t / SHOT), ph = t / SHOT - k, firing = k < n;
  return { kick: firing ? Math.sin(Math.min(1, ph * 1.6) * Math.PI) : 0, k, rise: 0.8 * Math.min(n, t / SHOT) * (1 - smoothstep(n * SHOT + 0.05, n * SHOT + 0.45, t)) };
}

/** Estado das peças móveis (local à arma): tampa (graus), alavanca (m para trás), tambor e cinta ({pos, rot, scale}). */
const REST = () => ({ cover: 0, handle: 0, drum: { pos: PIVOTS.mg34_drum, rot: q.id(), scale: 1 }, belt: { pos: PIVOTS.mg34_belt, scale: 1 } });
/** Mundo → referencial da arma. */
const toWeapon = (w, p) => q.rot(q.inv(w.rot), v3.sub(p, w.pos));

/**
 * Recarga de pé (4,4 s) com tambor de cinta: abrir a tampa, tirar o tambor vazio e largá-lo, receber o novo do
 * municiador à esquerda (o porta-tambores não está modelado), engatá-lo, pôr a cinta na caixa, fechar e armar.
 */
function reloadPose(R, t) {
  const body = aimBody();
  body.neck = { yaw: 10, pitch: 12 + 14 * (seg(t, 0.15, 0.45) - seg(t, 3.9, 4.3)), roll: -4 };
  body.head = { yaw: 8, pitch: 8 + 12 * (seg(t, 0.15, 0.45) - seg(t, 3.9, 4.3)), roll: -6 };
  const pre = solve(R, body).W, aim = aimWeapon(pre);
  // Arma baixada: coronha debaixo do braço direito, topo e lado esquerdo virados para a mão esquerda e para os olhos.
  const grip = v3.add(pre.spine_01.p, q.rot(pre.spine_01.r, [0.13, 0.05, -0.22]));
  const lowRot = frame([0, 0, 0], q.rot(pre.spine_01.r, N([-0.25, 0.22, -0.94])), q.rot(pre.spine_01.r, N([0.45, 1, 0]))).rot;
  const low = { pos: v3.sub(grip, q.rot(lowRot, [0, -0.03, 0.12])), rot: lowRot };
  const k = seg(t, 0.0, 0.35) - seg(t, 4.0, 4.4);
  const w = { pos: mix(aim.pos, low.pos, k), rot: q.slerp(aim.rot, low.rot, k) };
  const P = (p) => weaponPoint(w, p), D = (d) => weaponDir(w, N(d));
  const st = REST();

  // Tampa: dobradiça à frente, a traseira sobe 80° (0,6–0,85); fecha em 3,0–3,2.
  st.cover = MG34.cover.open * (seg(t, 0.6, 0.85) - seg(t, 3.0, 3.2));
  const hinge = MG34.cover.hinge, coverPt = (deg, off) => v3.add(hinge, q.rot(q.axis([1, 0, 0], -deg), v3.sub(off, hinge)));
  const latch = coverPt(st.cover, [0, 0.1, 0.05]);
  const onLatch = handAt(P(latch), D([0.25, -0.45, -0.85]), D([0, -1, 0.15]));
  // Tambor: engatado → solto (1,1–1,35) → largado, cai (1,4–1,75, desaparece) → novo na mão do municiador (1,85) → engatado (2,5).
  const dc = MG34.drum.center, handleTop = [0, MG34.drum.r + 0.03, 0];
  const out = [dc[0] - 0.09, dc[1] - 0.05, dc[2] + 0.04];
  const handoff = toWeapon(w, v3.add(pre.hips.p, q.rot(pre.hips.r, [-0.38, 0.0, -0.22])));
  const onDrum = (center, rotLocal = q.id()) => handAt(P(v3.add(center, q.rot(rotLocal, handleTop))), D(q.rot(rotLocal, [0.15, -0.45, -0.88])), D(q.rot(rotLocal, [0, -1, 0])));
  if (t >= 1.1 && t < 1.4) st.drum.pos = mix(dc, out, seg(t, 1.1, 1.35));
  else if (t >= 1.4 && t < 1.75) {
    // Largado: cai com gravidade e roda (mundo); o jogo pode deixar um adereço no chão em drum_drop.
    const dt = t - 1.4, p0 = P(out);
    const pw = v3.add(p0, [-0.15 * dt, -4.9 * dt * dt, 0.05 * dt]), rw = q.mul(w.rot, q.axis([0, 0, 1], 200 * dt));
    st.drum.pos = toWeapon(w, pw); st.drum.rot = q.mul(q.inv(w.rot), rw);
  } else if (t >= 1.75 && t < 1.85) st.drum = { pos: handoff, rot: q.id(), scale: 0 };
  else if (t >= 1.85 && t < 2.5) {
    const a = seg(t, 1.95, 2.4), near = [dc[0] - 0.02, dc[1] + 0.04, dc[2]];
    st.drum.pos = t < 2.4 ? mix(handoff, near, a) : mix(near, dc, seg(t, 2.4, 2.5));
  }
  // Cinta: sai com o tambor vazio (1,25) e volta com o novo, posta na caixa em 2,55–2,8.
  if (t >= 1.25 && t < 2.55) st.belt.scale = 0;
  else if (t >= 2.55 && t < 2.8) st.belt.pos = mix(v3.add(PIVOTS.mg34_belt, [-0.045, 0.006, 0]), PIVOTS.mg34_belt, seg(t, 2.55, 2.8));
  // Alavanca de armar (mão direita): atrás em 3,45–3,6, à frente em 3,7–3,9.
  st.handle = MG34.handleTravel * (seg(t, 3.45, 3.6) - seg(t, 3.7, 3.9));

  // Mão esquerda: pernas do bípode → fecho da tampa → tambor → largar → novo tambor → cinta → tampa → pernas.
  const atL = handOn(w, MG34_GRIP.l), beltPt = handAt(P(v3.add(st.belt.pos, [-0.02, 0.01, 0.01])), D([0.85, -0.3, -0.4]), D([0, -1, 0]));
  let L;
  if (t < 0.6) L = blendHand(atL, onLatch, seg(t, 0.3, 0.58));
  else if (t < 0.85) L = onLatch;
  else if (t < 1.1) L = blendHand(onLatch, onDrum(dc), seg(t, 0.88, 1.08));
  else if (t < 1.4) L = onDrum(st.drum.pos);
  else if (t < 1.85) { const from = onDrum(out), to = onDrum(handoff); L = blendHand(from, to, seg(t, 1.42, 1.82)); L.pos = v3.add(L.pos, [0, 0.05 * Math.sin(Math.PI * seg(t, 1.42, 1.82)), 0]); }
  else if (t < 2.5) L = onDrum(st.drum.pos);
  else if (t < 2.55) L = blendHand(onDrum(dc), beltPt, seg(t, 2.5, 2.55));
  else if (t < 2.85) L = beltPt;
  else if (t < 3.2) {
    const shut = handAt(P(coverPt(st.cover, [0, 0.1, -0.02])), D([0.2, -0.5, -0.84]), D([0, -1, 0.1]));
    L = blendHand(beltPt, shut, seg(t, 2.85, 3.0));
  } else L = blendHand(handAt(P(coverPt(0, [0, 0.1, -0.02])), D([0.2, -0.5, -0.84]), D([0, -1, 0.1])), atL, seg(t, 3.2, 3.5));
  // Mão direita: punho → alavanca (3,25–3,45) → puxa e empurra → punho (3,9–4,1).
  const atR = handOn(w, MG34_GRIP.r), knob = P(v3.add(MG34.handle, [0.032, -0.006, st.handle - 0.012]));
  const onKnob = handAt(knob, D([-0.85, -0.1, -0.5]), D([-0.5, 0, 0.86]));
  const Rh = blendHand(atR, onKnob, seg(t, 3.25, 3.45) - seg(t, 3.9, 4.1));
  const pose = solve(R, { ...body, weapon: w,
    hands: { r: { ...Rh, pole: [0.7, -0.6, 0.35] }, l: { ...L, pole: [-0.6, -0.8, 0.1] } },
    fingers: { r: { curl: 0.72, index: t > 3.3 && t < 4.0 ? 0.75 : 0.35, thumb: 0.6 }, l: { curl: t > 1.0 && t < 2.5 ? 0.85 : 0.6, thumb: 0.6 } } });
  return Object.assign(pose, { mg: st });
}

/** Amostra um clip: ossos do rig + nós da MG 34 (estado `mg` de cada pose; REST quando não há). */
function sample(R, name, duration, fn, extras) {
  const frames = Math.max(2, Math.round(duration * FPS) + 1), times = [], poses = [];
  for (let i = 0; i < frames; i++) { const t = Math.min(duration, i / FPS); times.push(t); poses.push(fn(t, t / duration)); }
  const tracks = [], moved = new Set(['root', 'hips', 'weapon', 'weapon_bolt', 'weapon_clip']);
  const cont = rots => { for (let i = 1; i < rots.length; i++) if (rots[i - 1].reduce((s, x, k) => s + x * rots[i][k], 0) < 0) rots[i] = rots[i].map(x => -x); return rots; };
  for (const b of GAME_BONES) {
    const rots = cont(poses.map(p => p.local[b.name] ?? q.id()));
    if (rots.some(r => Math.abs(r[3]) < 0.99999) || b.name === 'weapon') tracks.push({ bone: b.name, path: 'rotation', times, values: rots.flat() });
    if (moved.has(b.name) && poses.every(p => p.trans[b.name])) tracks.push({ bone: b.name, path: 'translation', times, values: poses.flatMap(p => p.trans[b.name]) });
  }
  // O clipe de 5 da Kar98k fica escondido (escala 0); a arma visível (escala 1).
  tracks.push({ bone: 'weapon_clip', path: 'scale', times: [0, duration], values: [0, 0, 0, 0, 0, 0], interpolation: 'STEP' });
  tracks.push({ bone: 'weapon', path: 'scale', times: [0, duration], values: [1, 1, 1, 1, 1, 1], interpolation: 'STEP' });
  // Peças da MG 34: faixas por nó; constantes (2 chaves) quando não mudam no clip.
  const mg = poses.map(p => p.mg ?? REST());
  const node = (bone, path, vals, interpolation) => {
    const same = vals.every(v => v.every((x, k) => Math.abs(x - vals[0][k]) < 1e-7));
    tracks.push(same ? { bone, path, times: [0, duration], values: [...vals[0], ...vals[0]] } : { bone, path, times, values: vals.flat(), ...(interpolation ? { interpolation } : {}) });
  };
  node('mg34_feed_cover', 'rotation', cont(mg.map(m => q.axis([1, 0, 0], -m.cover))));
  node('mg34_cocking_handle', 'translation', mg.map(m => v3.add(PIVOTS.mg34_cocking_handle, [0, 0, m.handle])));
  node('mg34_drum', 'translation', mg.map(m => m.drum.pos));
  node('mg34_drum', 'rotation', cont(mg.map(m => m.drum.rot)));
  node('mg34_drum', 'scale', mg.map(m => [m.drum.scale, m.drum.scale, m.drum.scale]), 'STEP');
  node('mg34_belt', 'translation', mg.map(m => m.belt.pos));
  node('mg34_belt', 'scale', mg.map(m => [m.belt.scale, m.belt.scale, m.belt.scale]), 'STEP');
  return { name, tracks, extras: { fps: FPS, weapon: 'mg34', bipod: 'folded', ...extras } };
}

/** mg34_aim (pontaria), mg34_fire_burst (rajada de 7) e mg34_reload (troca do tambor). R = rigInfo(J) do rig dos soldados. */
export function buildMg34Clips(R) {
  const n = 7, dur = +(n * SHOT + 0.5).toFixed(2), fire = Array.from({ length: n }, (_, i) => +(i * SHOT).toFixed(3));
  return [
    sample(R, 'mg34_aim', 2, (t, u) => aimPose(R, { sway: [0.7 * Math.sin(u * Math.PI * 2), 0.5 * Math.sin(u * Math.PI * 4)] }), { loop: true, pose: 'standing' }),
    sample(R, 'mg34_fire_burst', dur, t => {
      const f = burst(t, n), jitter = f.k < n ? Math.sin(f.k * 2.4) * 0.35 : 0;
      return aimPose(R, { kick: 0.6 * f.kick, sway: [jitter * f.kick + 0.15 * f.rise, 0], rise: f.rise });
    }, { loop: false, pose: 'standing', rounds: n, rate_rpm: MG34.rate_rpm, events: { fire } }),
    sample(R, 'mg34_reload', 4.4, t => reloadPose(R, t), { loop: false, pose: 'standing',
      events: { cover_open: 0.85, drum_off: 1.35, drum_drop: 1.75, drum_from_assistant: 1.85, drum_on: 2.5, belt_in: 2.8, cover_closed: 3.2, handle_back: 3.6, handle_forward: 3.9 },
      note: 'o tambor vazio cai e desaparece em drum_drop (o jogo pode deixar um adereço); o novo vem do municiador à esquerda (porta-tambores não modelado)' }),
  ];
}
