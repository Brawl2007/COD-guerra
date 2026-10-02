// Clips deitados da MG 34 para o rig actual dos soldados alemães (mesmos ossos e o mesmo solver FK + IK de 2 ossos de
// tools/assets/m01-soldiers/src/pose.mjs), com nomes novos: os clips de pé do kit (mg34_aim, mg34_fire_burst,
// mg34_reload) ficam como estão. Atirador: uma só MG 34 no osso `weapon`, bípode aberto e patas no chão. Municiador:
// sem arma visível (Kar98k e clipe com escala 0); passa o tambor novo ao atirador. As peças móveis da MG 34 são nós da
// cena da arma (mg34_feed_cover, mg34_cocking_handle, mg34_drum, mg34_belt, mg34_bipod_folded, mg34_bipod_open) e os
// clips do atirador animam-nas pelo nome. Os eventos dos clips são só apresentação: a simulação continua a decidir
// tiros, dano e munição (src/game/m01-simulation.js). Valores de GAMEPLAY a afinar em playtest.
import { GAME_BONES } from '../../m01-soldiers/src/human.mjs';
import { q, solve, weaponPoint, weaponDir } from '../../m01-soldiers/src/pose.mjs';
import { v3, smoothstep } from '../../m01-soldiers/src/meshops.mjs';
import { foot, frame } from '../../m01-rkm-wz28/src/clips.mjs';
import { MG34, PIVOTS } from '../../m01-mg34/src/mg34.mjs';
import { MG34_GRIP } from '../../m01-mg34/src/clips.mjs';
import { buildNation } from '../../m01-soldiers/src/assemble.mjs';
import { skinSet, lowest } from './skin.mjs';
import { N, deg, S, mix, handOn, handAt, blendHand, BUTT_L, GB, PRONE_FEET, gunnerBody, FINGERS_AIM, POLES, aimHands, gunnerAim } from './prone.mjs';

export const FPS = 30, SHOT = 60 / MG34.rate_rpm;
const seg = (t, a, b) => smoothstep(a, b, t);
const lerp = (a, b, t) => a + (b - a) * t;
/** Raiz do municiador no referencial da raiz do atirador (m): à esquerda e um pouco atrás, mesma orientação. */
export const LOADER_OFFSET = [-0.72, 0, 0.35];

// ——— Curvas de chaves: interpolação de Hermite (Catmull-Rom com tempos não uniformes) sobre árvores de números. ———
const zip = (f, ...xs) => typeof xs[0] === 'number' ? f(...xs) : Array.isArray(xs[0]) ? xs[0].map((_, i) => zip(f, ...xs.map(x => x[i])))
  : Object.fromEntries(Object.keys(xs[0]).map(k => [k, zip(f, ...xs.map(x => x[k]))]));
/** keys: [{t, v, stop?}]; velocidade nula nas pontas e nas chaves `stop`. */
export function track(keys, t) {
  const L = keys.length;
  if (t <= keys[0].t) return keys[0].v;
  if (t >= keys[L - 1].t) return keys[L - 1].v;
  let i = 0; while (keys[i + 1].t < t) i++;
  const A = keys[i], B = keys[i + 1], h = B.t - A.t, u = (t - A.t) / h, u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  const nb = j => (j <= 0 || j >= L - 1 || keys[j].stop) ? [keys[j], keys[j], 1] : [keys[j - 1], keys[j + 1], keys[j + 1].t - keys[j - 1].t];
  const [pa, na, da] = nb(i), [pb, nbk, db] = nb(i + 1);
  return zip((a, b, ap, an, bp, bn) => h00 * a + h01 * b + h10 * h * (an - ap) / da + h11 * h * (bn - bp) / db, A.v, B.v, pa.v, na.v, pb.v, nbk.v);
}

// ——— Corpo em números (para interpolar): eulers em graus [pitch, yaw, roll]; pés [x, y, z, yaw, pitch, toe, pólo×3]. ———
const E = (e = {}) => [e.pitch ?? 0, e.yaw ?? 0, e.roll ?? 0];
const eul = a => ({ pitch: a[0], yaw: a[1], roll: a[2] });
const standFoot = (x, z, yaw) => { const f = foot(x, z, { yaw }); return [x, f.pos[1], z, yaw, 0, 0, ...f.pole]; };
const proneFootB = (side, y = GB.fy) => { const [x, z, yaw] = PRONE_FEET[side]; return [x, y, z + GB.fz, yaw, GB.fp, GB.ft, side === 'l' ? -0.3 : 0.3, -1, 0]; };
const fromBody = (b, feet, poles) => ({ hips: [...b.hips.pos, ...E(b.hips.rot)], s: b.spine.map(E), neck: E(b.neck), head: E(b.head), cr: E(b.clav.r), cl: E(b.clav.l), fl: feet.l, fr: feet.r, pr: poles.r, pl: poles.l });
const footPose = f => ({ pos: f.slice(0, 3), rot: q.mul(q.axis([0, 1, 0], f[3]), q.axis([1, 0, 0], f[4])), pole: N(f.slice(6, 9)), toe: f[5] });
const toBody = B => ({
  hips: { pos: B.hips.slice(0, 3), rot: eul(B.hips.slice(3)) }, spine: B.s.map(eul), neck: eul(B.neck), head: eul(B.head),
  clav: { r: eul(B.cr), l: eul(B.cl) }, feet: { l: footPose(B.fl), r: footPose(B.fr) },
});

/**
 * solve() com contacto com o chão: sobe o pé se a pele da bota (vértices do pé e dos dedos, LBS como no GLB) ficar abaixo
 * de SOLE_MIN ou os dedos (ball) abaixo de TOE_MIN, e afasta o pé para trás (+Z) se o joelho (calf) descer abaixo de
 * KNEE_MIN, até 12 iterações. Só mexe nos pés; o resto da pose fica igual. SOLE_MIN é a mesma folga das poses deitadas
 * paradas (sola/biqueira até 1,3 cm abaixo do plano), para não criar saltos ao chegar a elas.
 */
export const KNEE_MIN = 0.07, TOE_MIN = 0.008, SOLE_MIN = -0.013;
let BOOTS = null;
function boots() {
  if (BOOTS) return BOOTS;
  const set = skinSet(buildNation('de', { heads: [] }), ['body', 'gear'], 1);
  BOOTS = Object.fromEntries(['l', 'r'].map(s => [s, set.map(g => {
    const keep = g.B.map((b, i) => (b.includes(`foot_${s}`) || b.includes(`ball_${s}`) ? i : -1)).filter(i => i >= 0);
    return { ...g, P: keep.map(i => g.P[i]), B: keep.map(i => g.B[i]), Wt: keep.map(i => g.Wt[i]) };
  })]));
  return BOOTS;
}
const soleY = (W, s) => Math.min(...Object.values(lowest(boots()[s], W)).map(x => x[0]));
function groundSolve(R, pose) {
  const feet = { l: { ...pose.feet.l, pos: [...pose.feet.l.pos] }, r: { ...pose.feet.r, pos: [...pose.feet.r.pos] } };
  for (let i = 0; i < 12; i++) {
    const W = solve(R, { ...pose, hands: undefined, feet }).W;
    let ok = true;
    for (const s of ['l', 'r']) {
      const dt = Math.max(TOE_MIN - W[`ball_${s}`].p[1], SOLE_MIN - soleY(W, s)), dk = KNEE_MIN - W[`calf_${s}`].p[1];
      if (dt > 1e-4) { feet[s].pos[1] += dt; ok = false; }
      if (dk > 1e-4) { feet[s].pos[2] += 2 * dk; ok = false; }
    }
    if (ok) break;
  }
  return solve(R, { ...pose, feet });
}

// ——— Pontaria de pé do kit (cópia dos valores de m01-mg34/src/clips.mjs, mg34_aim no instante 0), para continuidade. ———
const STAND_FINGERS = { l: { curl: 0.72, thumb: 0.55 }, r: { curl: 0.72, index: 0.35, thumb: 0.6 } };
const STAND_POLES = { r: [0.7, -0.6, 0.35], l: [-0.35, -1, 0.1] };
const standBody = () => ({
  hips: { pos: [0.01, 0.885, 0.08], rot: { yaw: -30, pitch: 4 } },
  spine: [{ pitch: 4, yaw: -4 }, { pitch: 4, yaw: -4, roll: -2 }, { pitch: 3, yaw: -3, roll: -3 }],
  neck: { yaw: 22, pitch: 10, roll: -6 }, head: { yaw: 18, pitch: 6, roll: -14 },
  clav: { r: { yaw: 10, roll: -8 }, l: { yaw: -6 } },
});
function standAim(R) {
  const B = fromBody(standBody(), { l: standFoot(-0.11, -0.2, -12), r: standFoot(0.18, 0.2, -60) }, STAND_POLES);
  const W = solve(R, toBody(B)).W, w0 = frame([0, 0, 0], N([0, 0, -1]), N([0.06, 1, 0]));
  return { B, w: { pos: v3.sub(W.eye_r.p, q.rot(w0.rot, S.cheek)), rot: w0.rot } };
}

// ——— Estado das peças móveis (local à arma). fold: rotação do bípode dobrado em X (graus); open: bípode aberto visível. ———
const REST = () => ({ cover: 0, handle: 0, drum: { pos: PIVOTS.mg34_drum, rot: q.id(), scale: 1 }, belt: { pos: PIVOTS.mg34_belt, scale: 1 }, fold: 0, open: 1 });
const toWeapon = (w, p) => q.rot(q.inv(w.rot), v3.sub(p, w.pos));
/** Rotação do bípode dobrado à volta do suporte até ficar na direcção das pernas abertas (para baixo e para a frente). */
export const FOLD_SWING = 99;
const swing = (p, a) => v3.add(MG34.bipod.mount, q.rot(q.axis([1, 0, 0], a), v3.sub(p, MG34.bipod.mount)));
/** Arma rodada à volta de um ponto da arma `pivot` (referencial da arma) que fica fixo no mundo. */
const pivotWeapon = (w, pivot, rot) => { const p = weaponPoint(w, pivot); return { pos: v3.sub(p, q.rot(rot, pivot)), rot }; };
const alignQ = (a, b) => (a.reduce((s, x, k) => s + x * b[k], 0) < 0 ? b.map(x => -x) : b);

// ——— Entrar em posição deitada: de mg34_aim (de pé, bípode dobrado) até mg34_prone_aim (deitado, bípode aberto). ———
export const ENTER = { dur: 1.9, swing: [0.45, 0.8], land: 1.2, settle: 1.6 };
function enterKeys(R) {
  const st = standAim(R), pr = gunnerAim(R), Bp = fromBody(gunnerBody(), { l: proneFootB('l'), r: proneFootB('r') }, POLES);
  // Patas do bípode no chão (mundo): fixas desde `land`; a coronha desce até ao ombro rodando a arma à volta delas.
  const land = { rot: q.mul(q.axis(weaponDir(pr.w, [1, 0, 0]), -14), pr.w.rot) };
  Object.assign(land, pivotWeapon(pr.w, S.bipod_feet, land.rot));
  const wq = (pos, yaw, pitch) => ({ pos, rot: frame([0, 0, 0], N([Math.sin(yaw * deg), Math.sin(pitch * deg), -Math.cos(pitch * deg)])).rot });
  const K1 = wq([0.16, 0.72, -0.3], -6, -8), K2 = wq([0.15, 0.48, -0.5], -4, -18);
  const body = [
    { t: 0, v: st.B },
    { t: 0.4, v: { hips: [0.03, 0.72, 0.1, 18, -22, 0], s: [[8, -3, 0], [8, -2, 0], [6, -2, 0]], neck: [0, 10, -3], head: [-4, 8, -6], cr: [0, 12, -10], cl: [0, -8, 0],
      fl: standFoot(-0.13, -0.22, -14), fr: [0.2, 0.072, 0.3, -45, -20, 0, 0.3, 0, -1], pr: [0.7, -0.7, 0.2], pl: [-0.5, -1, 0.1] } },
    { t: 0.8, v: { hips: [0.04, 0.5, 0.22, 26, -18, 0], s: [[10, -2, 0], [10, -2, 0], [8, -1, 0]], neck: [-6, 6, -2], head: [-8, 4, -4], cr: [0, 14, -12], cl: [0, -10, 4],
      fl: [-0.18, 0.11, 0.55, 10, -95, 0, -0.1, -0.3, -1], fr: [0.2, 0.11, 0.6, -10, -95, 0, 0.1, -0.3, -1], pr: [0.6, -0.9, 0.1], pl: [-0.5, -1, 0] } },
    { t: ENTER.land, v: { hips: [0.05, 0.3, 0.42, 58, -20, 2], s: [[-4, 1, 0], [-6, 2, 0], [-2, 2, 0]], neck: [-12, 3, -2], head: [-2, 3, -6], cr: [0, 18, -12], cl: [0, -16, 6],
      fl: [-0.28, 0.12, 0.98, 20, -110, 0, -0.25, -1, -0.3], fr: [0.2, 0.12, 1.02, -14, -110, 0, 0.25, -1, -0.3], pr: [0.3, -1, 0.1], pl: [-0.5, -1, 0.1] } },
    { t: ENTER.settle, v: Bp, stop: true },
  ];
  const weapon = [{ t: 0, v: st.w }, { t: 0.4, v: K1 }, { t: 0.8, v: K2 }, { t: ENTER.land, v: land, stop: true }];
  for (let i = 1; i < weapon.length; i++) weapon[i].v.rot = alignQ(weapon[i - 1].v.rot, weapon[i].v.rot);
  return { st, pr, land, body, weapon };
}
/** Pose da entrada no instante t (0..ENTER.dur). A saída é a mesma curva ao contrário. */
function enterPose(R, K, t) {
  if (t >= ENTER.settle) return Object.assign(gunnerAim(R, { b: 0 }), { mg: REST() });
  const B = track(K.body, t);
  let w;
  if (t < ENTER.land) {
    const v = track(K.weapon, t); w = { pos: v.pos, rot: q.norm(v.rot) };
    // As patas do bípode não entram no chão antes de assentarem: a arma sobe o que faltar (nulo em `land`).
    const dy = -weaponPoint(w, S.bipod_feet)[1];
    if (dy > 0) w.pos = v3.add(w.pos, [0, dy, 0]);
  }
  else w = pivotWeapon(K.land, S.bipod_feet, q.slerp(K.land.rot, K.pr.w.rot, seg(t, ENTER.land, ENTER.settle)));
  const mg = REST(), a = FOLD_SWING * seg(t, ...ENTER.swing);
  if (t < ENTER.swing[1]) { mg.fold = a; mg.open = 0; }
  // Mão esquerda: pernas do bípode dobrado (roda-as para baixo) → apoio no chão → por baixo da coronha.
  const g = MG34_GRIP.l, onLegs = { pos: weaponPoint(w, swing(g.pos, a)), fdir: weaponDir(w, q.rot(q.axis([1, 0, 0], a), g.fdir)), palm: weaponDir(w, q.rot(q.axis([1, 0, 0], a), g.palm)) };
  const W0 = solve(R, toBody(B)).W, ground = handAt(v3.add(W0.upperarm_l.p, [-0.06, 0, -0.32]).map((x, i) => (i === 1 ? 0.05 : x)), N([0.25, 0, -1]), [0, -1, 0]);
  let L;
  if (t < 0.85) L = onLegs;
  else if (t < ENTER.land) L = blendHand(onLegs, ground, seg(t, 0.85, 1.05));
  else L = blendHand(ground, handOn(w, BUTT_L), seg(t, ENTER.land + 0.05, ENTER.settle - 0.05));
  const k = seg(t, 0.2, ENTER.land);
  const fingers = { r: { curl: lerp(0.72, FINGERS_AIM.r.curl, k), index: lerp(0.35, FINGERS_AIM.r.index, k), thumb: 0.6 }, l: { curl: t < 0.85 ? 0.72 : lerp(0.25, FINGERS_AIM.l.curl, seg(t, ENTER.land, ENTER.settle)), thumb: lerp(0.55, FINGERS_AIM.l.thumb, k) } };
  return Object.assign(groundSolve(R, { ...toBody(B), weapon: w, hands: { r: { ...handOn(w, MG34_GRIP.r), pole: B.pr }, l: { ...L, pole: B.pl } }, fingers }), { mg });
}

// ——— Pontaria, espera e rajada deitado (arma no bípode). ———
/** Arma de base com balanço à volta das patas do bípode (graus): as patas ficam no sítio. */
const swayed = (w, yaw, pitch) => pivotWeapon(w, S.bipod_feet, q.mul(q.mul(q.axis([0, 1, 0], yaw), q.axis(weaponDir(w, [1, 0, 0]), pitch)), w.rot));
function proneAim(R, { b = 0, yaw = 0, pitch = 0, lift = 0, fingers = FINGERS_AIM } = {}) {
  const body = gunnerBody({ b, lift }), base = gunnerAim(R).w, w = swayed(base, yaw, pitch);
  return Object.assign(solve(R, { ...body, weapon: w, hands: aimHands(w), fingers }), { mg: REST(), w });
}
/** Rajada de n a partir de 0: recuo (0..1) por disparo e subida acumulada (graus) que volta depois da rajada. */
function burst(t, n) {
  const k = Math.floor(t / SHOT), ph = t / SHOT - k, firing = k < n;
  return { kick: firing ? Math.sin(Math.min(1, ph * 1.6) * Math.PI) : 0, k, rise: 0.28 * Math.min(n, t / SHOT) * (1 - smoothstep(n * SHOT + 0.05, n * SHOT + 0.45, t)) };
}
function proneFire(R, t, n) {
  const f = burst(t, n), body = gunnerBody({ kick: f.kick }), base = gunnerAim(R).w;
  // A boca sobe à volta da coronha (as patas do bípode saltam um pouco) e a arma recua ao longo do cano.
  const jitter = f.k < n ? Math.sin(f.k * 2.4) * 0.25 * f.kick : 0;
  const rot = q.mul(q.mul(q.axis([0, 1, 0], jitter), q.axis(weaponDir(base, [1, 0, 0]), f.rise + 0.35 * f.kick)), base.rot);
  const w0 = pivotWeapon(base, S.butt, rot), w = { pos: v3.add(w0.pos, weaponDir(base, [0, 0, 0.012 * f.kick])), rot };
  return Object.assign(solve(R, { ...body, weapon: w, hands: aimHands(w), fingers: FINGERS_AIM }), { mg: REST(), w });
}

// ——— Municiador deitado à esquerda do atirador (referencial da sua raiz, deslocada LOADER_OFFSET). ———
export const LB = { hy: 0.28, hz: 0.45, hp: 95, hyaw: 6, s: [-1.7, -15.4, -9.9], n: -6.9, h: 10, hr: 4, fy: 0.153, fz: -0.047, fp: -124.4, ft: 2.9, cr: [-4.6, -21.7], cl: [28, 25.1] };
const LOADER_FEET = { l: [-0.26, 1.32, 18], r: [0.24, 1.3, -20] };
function loaderBody({ b = 0, lift = 0, look = 0 } = {}) {
  const g = LB, lf = s => { const [x, z, yaw] = LOADER_FEET[s]; return footPose([x, g.fy, z + g.fz, yaw, g.fp, g.ft, s === 'l' ? -0.3 : 0.3, -1, 0]); };
  return {
    hips: { pos: [0, g.hy + 0.004 * b, g.hz], rot: { pitch: g.hp, yaw: g.hyaw, roll: -2 } },
    spine: [{ pitch: g.s[0] + 0.6 * b, yaw: -2 }, { pitch: g.s[1] - 5 * lift, yaw: -3 - 1.5 * look, roll: -2 * look }, { pitch: g.s[2] + 0.6 * b - 4 * lift, yaw: -3 - 1.5 * look, roll: -2 * look }],
    neck: { pitch: g.n, yaw: -10 - 14 * look }, head: { pitch: g.h, yaw: -8 - 12 * look, roll: g.hr },
    clav: { r: { yaw: g.cr[0], roll: g.cr[1] }, l: { yaw: g.cl[0], roll: g.cl[1] } }, feet: { l: lf('l'), r: lf('r') },
  };
}
const LOADER_POLES = { r: [0.5, -1, 0.1], l: [-0.5, -1, 0.1] };
/** Antebraços no chão, mãos à frente do peito (palmas para baixo). */
const loaderRestHands = b => ({
  l: { ...handAt([-0.13, 0.05, -0.26 + 0.004 * b], N([0.35, 0, -1]), [0, -1, 0]), pole: LOADER_POLES.l },
  r: { ...handAt([0.12, 0.05, -0.28], N([-0.3, 0, -1]), [0, -1, 0]), pole: LOADER_POLES.r },
});
const LOADER_FINGERS = { l: { curl: 0.3, thumb: 0.3 }, r: { curl: 0.3, thumb: 0.3 } };
const loaderIdle = (R, b = 0, look = 0) => solve(R, { ...loaderBody({ b, look }), hands: loaderRestHands(b), fingers: LOADER_FINGERS });

// ——— Recarga deitada (atirador) e passagem do tambor (municiador), sincronizadas pelo mesmo relógio. ———
export const RELOAD = {
  dur: 4.8,
  events: { cover_open: 0.8, drum_off: 1.3, drum_down: 1.6, drum_from_assistant: 1.7, drum_handoff: 2.15, drum_on: 2.75, belt_in: 3.05, cover_closed: 3.35, handle_back: 3.85, handle_forward: 4.15 },
};
const ev = RELOAD.events, HANDLE_TOP = [0, MG34.drum.r + 0.03, 0];
/** Mão do municiador (mundo do atirador) e ponto de contacto por baixo do tambor novo. */
function loaderFeed(R, t) {
  const body = loaderBody({ b: 0, lift: seg(t, 0.3, 0.8) - seg(t, 2.4, 3.0), look: seg(t, 0.2, 0.7) - seg(t, 3.6, 4.4) });
  const rest = loaderRestHands(0), pre = solve(R, body).W;
  // Porta-tambores (não modelado) à direita da anca do municiador; a mão vai lá, tira o tambor e estende-o ao atirador.
  const carrier = handAt(v3.add(pre.hips.p, q.rot(pre.hips.r, [0.24, 0.02, -0.06])), N([0.1, -0.3, -1]), N([1, -0.2, 0]));
  const gun = gunnerAim(R).w, handoffW = weaponPoint(gun, v3.add(MG34.drum.center, [-0.2, -0.03, 0.06]));
  const under = v3.sub(handoffW, LOADER_OFFSET);   // tambor (centro) no referencial do municiador
  const below = handAt(v3.add(under, [0, -MG34.drum.r - 0.005, 0]), N([0.95, 0.1, -0.2]), [0, 1, 0]);
  let Rh;
  if (t < 0.45) Rh = rest.r;
  else if (t < 1.0) Rh = blendHand(rest.r, carrier, seg(t, 0.45, 0.95));
  else if (t < ev.drum_from_assistant) Rh = { ...carrier, pos: v3.add(carrier.pos, [0, 0.015 * Math.sin((t - 1) * 18), 0]) };
  else if (t < ev.drum_handoff) Rh = blendHand(carrier, below, seg(t, ev.drum_from_assistant, ev.drum_handoff - 0.05));
  else if (t < ev.drum_handoff + 0.12) Rh = below;
  else Rh = blendHand(below, rest.r, seg(t, ev.drum_handoff + 0.12, ev.drum_handoff + 0.7));
  const P = solve(R, { ...body, hands: { l: rest.l, r: { ...Rh, pole: LOADER_POLES.r } }, fingers: { l: LOADER_FINGERS.l, r: { curl: 0.3 + 0.45 * (seg(t, 0.85, 1.0) - seg(t, ev.drum_handoff + 0.05, ev.drum_handoff + 0.25)), thumb: LOADER_FINGERS.r.thumb } } });
  // Centro do tambor quando está na mão do municiador: na palma (por cima dela), no referencial do atirador.
  const palmUp = v3.add(P.W.hand_r.p, v3.add(v3.mul(Rh.fdir, 0.07), [0, 0.025 + MG34.drum.r + 0.005, 0]));
  return Object.assign(P, { drumW: v3.add(palmUp, LOADER_OFFSET), handoffW });
}
function reloadPose(R, t) {
  const lift = seg(t, 0.0, 0.4) - seg(t, 4.2, 4.6);
  const body = gunnerBody({ lift }), w = gunnerAim(R).w, P = p => weaponPoint(w, p), D = d => weaponDir(w, N(d));
  const st = REST(), dc = MG34.drum.center;
  // Tampa (dobradiça à frente): abre 0,55–0,8, fecha 3,1–3,35.
  st.cover = MG34.cover.open * (seg(t, 0.55, ev.cover_open) - seg(t, 3.1, ev.cover_closed));
  const hinge = MG34.cover.hinge, coverPt = (a, off) => v3.add(hinge, q.rot(q.axis([1, 0, 0], -a), v3.sub(off, hinge)));
  const onLatch = handAt(P(coverPt(st.cover, [0, 0.1, 0.05])), D([0.25, -0.45, -0.85]), D([0, -1, 0.15]));
  const onDrum = c => handAt(P(v3.add(c, HANDLE_TOP)), D([0.15, -0.45, -0.88]), D([0, -1, 0]));
  // Tambor: sai (1,05–1,3), é pousado no chão à esquerda da arma (1,3–1,6) e some; o novo aparece na mão do
  // municiador (1,7), passa para a mão esquerda do atirador (2,15) e é engatado (2,75).
  const out = [dc[0] - 0.09, dc[1] - 0.04, dc[2] + 0.04], down = toWeapon(w, v3.add(P(out), [-0.06, 0, 0.04]).map((x, i) => (i === 1 ? MG34.drum.r + 0.002 : x)));
  const L0 = loaderFeed(R, t), hand = toWeapon(w, L0.drumW), near = [dc[0] - 0.02, dc[1] + 0.04, dc[2]];
  const handoff = toWeapon(w, loaderFeed(R, ev.drum_handoff).drumW);
  if (t >= 1.05 && t < ev.drum_off) st.drum.pos = mix(dc, out, seg(t, 1.05, ev.drum_off));
  else if (t >= ev.drum_off && t < ev.drum_down) st.drum.pos = v3.add(mix(out, down, seg(t, ev.drum_off, ev.drum_down)), [0, 0.03 * Math.sin(Math.PI * seg(t, ev.drum_off, ev.drum_down)), 0]);
  else if (t >= ev.drum_down && t < ev.drum_from_assistant) st.drum = { pos: hand, rot: q.id(), scale: 0 };
  else if (t >= ev.drum_from_assistant && t < ev.drum_handoff) st.drum.pos = hand;
  else if (t >= ev.drum_handoff && t < ev.drum_on) st.drum.pos = t < ev.drum_on - 0.1 ? mix(handoff, near, seg(t, ev.drum_handoff, ev.drum_on - 0.1)) : mix(near, dc, seg(t, ev.drum_on - 0.1, ev.drum_on));
  // Cinta: sai com o tambor vazio e volta com o novo, posta na caixa em 2,8–3,05.
  if (t >= 1.15 && t < 2.8) st.belt.scale = 0;
  else if (t >= 2.8 && t < ev.belt_in) st.belt.pos = mix(v3.add(PIVOTS.mg34_belt, [-0.045, 0.006, 0]), PIVOTS.mg34_belt, seg(t, 2.8, ev.belt_in));
  st.handle = MG34.handleTravel * (seg(t, 3.7, ev.handle_back) - seg(t, 3.95, ev.handle_forward));

  // Mão esquerda: coronha → fecho → tambor → pousa → mão do municiador → engata → cinta → tampa → coronha.
  const atL = handOn(w, BUTT_L), beltPt = handAt(P(v3.add(st.belt.pos, [-0.02, 0.01, 0.01])), D([0.85, -0.3, -0.4]), D([0, -1, 0]));
  const shut = a => handAt(P(coverPt(a, [0, 0.1, -0.02])), D([0.2, -0.5, -0.84]), D([0, -1, 0.1]));
  let L;
  if (t < 0.55) L = blendHand(atL, onLatch, seg(t, 0.2, 0.52));
  else if (t < ev.cover_open + 0.02) L = onLatch;
  else if (t < 1.05) L = blendHand(onLatch, onDrum(dc), seg(t, 0.82, 1.02));
  else if (t < ev.drum_down) L = onDrum(st.drum.pos);
  else if (t < ev.drum_handoff) L = blendHand(onDrum(down), onDrum(handoff), seg(t, ev.drum_down + 0.05, ev.drum_handoff - 0.03));
  else if (t < ev.drum_on) L = onDrum(st.drum.pos);
  else if (t < 2.8) L = blendHand(onDrum(dc), beltPt, seg(t, ev.drum_on, 2.8));
  else if (t < 3.1) L = blendHand(beltPt, shut(MG34.cover.open), seg(t, ev.belt_in, 3.1));
  else if (t < ev.cover_closed) L = shut(st.cover);
  else L = blendHand(shut(0), atL, seg(t, ev.cover_closed, 3.75));
  // Mão direita: punho → alavanca de armar (3,5–3,7) → puxa e empurra → punho (4,15–4,45).
  const atR = handOn(w, MG34_GRIP.r), knob = P(v3.add(MG34.handle, [0.032, -0.006, st.handle - 0.012]));
  const Rh = blendHand(atR, handAt(knob, D([-0.85, -0.1, -0.5]), D([-0.5, 0, 0.86])), seg(t, 3.5, 3.7) - seg(t, ev.handle_forward, 4.45));
  const pose = solve(R, { ...body, weapon: w, hands: { r: { ...Rh, pole: POLES.r }, l: { ...L, pole: POLES.l } },
    fingers: { r: { curl: FINGERS_AIM.r.curl, index: t > 3.55 && t < 4.3 ? 0.75 : FINGERS_AIM.r.index, thumb: 0.6 }, l: t < 0.2 || t > ev.cover_closed + 0.3 ? FINGERS_AIM.l : { curl: t > 1.0 && t < ev.drum_on ? 0.85 : 0.6, thumb: 0.55 } } });
  return Object.assign(pose, { mg: st, w });
}

// ——— Municiador sai: apoia as mãos, põe-se de joelhos e fica agachado sobre o joelho direito, pronto a sair. ———
export const LEAVE = { dur: 1.8 };
function leavePose(R, K, t) {
  if (t <= 0) return loaderIdle(R);
  const B = track(K, t), W = solve(R, toBody(B)).W;
  const push = s => handAt([W[`upperarm_${s}`].p[0] * 1.05, 0.05, W[`upperarm_${s}`].p[2] - 0.12], N([s === 'l' ? 0.2 : -0.2, 0, -1]), [0, -1, 0]);
  const rest = loaderRestHands(0), up = seg(t, 0.95, 1.5);
  const thighR = v3.add(W.calf_r.p, [0.02, 0.08, 0.12]), thighL = v3.add(W.thigh_l.p, [0.0, 0.06, -0.18]);
  const hands = {
    l: { ...blendHand(blendHand(rest.l, push('l'), seg(t, 0.05, 0.45)), handAt(thighL, N([0.2, -0.3, -1]), N([0, -1, 0.2])), up), pole: mix([-0.5, -1, 0.1], [-0.6, -0.5, 0.4], up) },
    r: { ...blendHand(blendHand(rest.r, push('r'), seg(t, 0.05, 0.45)), handAt(thighR, N([-0.2, -0.3, -1]), N([0, -1, 0.2])), up), pole: mix([0.5, -1, 0.1], [0.6, -0.5, 0.4], up) },
  };
  return groundSolve(R, { ...toBody(B), hands, fingers: { l: { curl: lerp(0.3, 0.5, up), thumb: lerp(0.3, 0.4, up) }, r: { curl: lerp(0.3, 0.5, up), thumb: lerp(0.3, 0.4, up) } } });
}
function leaveKeys(R) {
  const b0 = loaderBody(), fl = s => { const [x, z, yaw] = LOADER_FEET[s]; return [x, LB.fy, z + LB.fz, yaw, LB.fp, LB.ft, s === 'l' ? -0.3 : 0.3, -1, 0]; };
  const B0 = fromBody(b0, { l: fl('l'), r: fl('r') }, LOADER_POLES);
  return [
    { t: 0, v: B0 },
    { t: 0.6, v: { ...B0, hips: [0, 0.42, 0.42, 62, 4, 0], s: [[6, -2, 0], [6, -2, 0], [4, -2, 0]], neck: [-24, -6, 0], head: [-6, -6, 0],
      fl: [-0.2, 0.12, 0.9, 10, -100, 0, -0.1, -1, -0.3], fr: [0.2, 0.12, 0.9, -10, -100, 0, 0.1, -1, -0.3] } },
    { t: 1.2, v: { ...B0, hips: [0, 0.6, 0.3, 22, 0, 0], s: [[4, 0, 0], [4, 0, 0], [2, 0, 0]], neck: [-4, -4, 0], head: [0, -6, 0],
      fl: [-0.16, 0.072, -0.1, 4, 0, 0, -0.25, 0, -1], fr: [0.16, 0.11, 0.42, -6, -95, 0, 0.1, -0.3, -1] } },
    { t: LEAVE.dur, v: { ...B0, hips: [0, 0.66, 0.2, 18, 0, 0], s: [[4, 0, 0], [4, 0, 0], [2, 0, 0]], neck: [0, -2, 0], head: [2, -4, 0],
      fl: [-0.16, 0.072, -0.2, 4, 0, 0, -0.25, 0, -1], fr: [0.16, 0.11, 0.38, -6, -95, 0, 0.1, -0.3, -1] }, stop: true },
  ];
}

// ——— Amostragem: ossos do rig + nós da MG 34 (atirador) ou arma escondida (municiador). ———
const cont = rots => { for (let i = 1; i < rots.length; i++) if (rots[i - 1].reduce((s, x, k) => s + x * rots[i][k], 0) < 0) rots[i] = rots[i].map(x => -x); return rots; };
function sample(name, duration, fn, extras, { role = 'gunner' } = {}) {
  const frames = Math.max(2, Math.round(duration * FPS) + 1), times = [], poses = [];
  for (let i = 0; i < frames; i++) { const t = Math.min(duration, i / FPS); times.push(t); poses.push(fn(t, t / duration)); }
  const tracks = [], moved = new Set(['root', 'hips', 'weapon', 'weapon_bolt', 'weapon_clip']);
  for (const b of GAME_BONES) {
    const rots = cont(poses.map(p => p.local[b.name] ?? q.id()));
    if (rots.some(r => Math.abs(r[3]) < 0.99999) || b.name === 'weapon') tracks.push({ bone: b.name, path: 'rotation', times, values: rots.flat() });
    if (moved.has(b.name) && poses.every(p => p.trans[b.name])) tracks.push({ bone: b.name, path: 'translation', times, values: poses.flatMap(p => p.trans[b.name]) });
  }
  // Clipe de 5 da Kar98k sempre escondido; a arma do osso `weapon` só é visível no atirador (a MG 34).
  const ws = role === 'gunner' ? 1 : 0;
  tracks.push({ bone: 'weapon_clip', path: 'scale', times: [0, duration], values: [0, 0, 0, 0, 0, 0], interpolation: 'STEP' });
  tracks.push({ bone: 'weapon', path: 'scale', times: [0, duration], values: [ws, ws, ws, ws, ws, ws], interpolation: 'STEP' });
  if (role === 'gunner') {
    const mg = poses.map(p => p.mg ?? REST());
    const node = (bone, path, vals, interpolation) => {
      const same = vals.every(v => v.every((x, k) => Math.abs(x - vals[0][k]) < 1e-7));
      tracks.push(same ? { bone, path, times: [0, duration], values: [...vals[0], ...vals[0]], ...(interpolation ? { interpolation } : {}) } : { bone, path, times, values: vals.flat(), ...(interpolation ? { interpolation } : {}) });
    };
    node('mg34_feed_cover', 'rotation', cont(mg.map(m => q.axis([1, 0, 0], -m.cover))));
    node('mg34_cocking_handle', 'translation', mg.map(m => v3.add(PIVOTS.mg34_cocking_handle, [0, 0, m.handle])));
    node('mg34_drum', 'translation', mg.map(m => m.drum.pos));
    node('mg34_drum', 'rotation', cont(mg.map(m => m.drum.rot)));
    node('mg34_drum', 'scale', mg.map(m => [m.drum.scale, m.drum.scale, m.drum.scale]), 'STEP');
    node('mg34_belt', 'translation', mg.map(m => m.belt.pos));
    node('mg34_belt', 'scale', mg.map(m => [m.belt.scale, m.belt.scale, m.belt.scale]), 'STEP');
    node('mg34_bipod_folded', 'rotation', cont(mg.map(m => q.axis([1, 0, 0], m.fold))));
    node('mg34_bipod_folded', 'scale', mg.map(m => Array(3).fill(1 - m.open)), 'STEP');
    node('mg34_bipod_open', 'scale', mg.map(m => Array(3).fill(m.open)), 'STEP');
  }
  // Contactos aproximados (centros das articulações; a pele fica ~3–6 cm abaixo): osso mais baixo e pontos da arma.
  const stats = { min_joint: ['', Infinity], weapon_min_y: role === 'gunner' ? Infinity : null };
  for (const p of poses) {
    for (const [k, v] of Object.entries(p.W)) if (!k.startsWith('weapon') && k !== 'root' && !k.startsWith('mg34') && v.p[1] < stats.min_joint[1]) stats.min_joint = [k, v.p[1]];
    if (role === 'gunner') { const w = { pos: p.W.weapon.p, rot: p.W.weapon.r }; for (const k of ['muzzle', 'butt', 'grip_r', ...((p.mg ?? REST()).open ? ['bipod_feet'] : [])]) stats.weapon_min_y = Math.min(stats.weapon_min_y, weaponPoint(w, S[k])[1]); }
  }
  return { name, tracks, stats, extras: { fps: FPS, role, weapon: role === 'gunner' ? 'mg34' : 'nenhuma (Kar98k escondida)', pose: 'prone', ...extras } };
}

/** Os 9 clips deitados: 6 do atirador e 3 do municiador. R = rigInfo(J) do rig dos soldados alemães. */
export function buildMg34ProneClips(R) {
  const n = 7, burstDur = +(n * SHOT + 0.5).toFixed(2), fire = Array.from({ length: n }, (_, i) => +(i * SHOT).toFixed(3));
  const K = enterKeys(R), D = ENTER.dur, LK = leaveKeys(R);
  const bip = { bipod: 'open', bipod_feet_on_ground: true };
  return [
    sample('mg34_prone_enter', D, t => enterPose(R, K, t), { loop: false, from: 'mg34_aim (instante 0, de pé)', to: 'mg34_prone_aim', bipod: 'folded → open',
      events: { bipod_swing: ENTER.swing[0], bipod_open: ENTER.swing[1], bipod_on_ground: ENTER.land, settled: ENTER.settle } }),
    sample('mg34_prone_idle', 4, (t, u) => proneAim(R, { b: Math.sin(u * Math.PI * 2), lift: 0.35 + 0.05 * Math.sin(u * Math.PI * 2), fingers: { r: { curl: 0.7, index: 0, thumb: 0.6 }, l: FINGERS_AIM.l } }),
      { loop: true, ...bip, note: 'cabeça levantada da coronha, dedo fora do gatilho' }),
    sample('mg34_prone_aim', 2, (t, u) => proneAim(R, { b: 0.5 * Math.sin(u * Math.PI * 2), yaw: 0.6 * Math.sin(u * Math.PI * 2), pitch: 0.3 * Math.sin(u * Math.PI * 4) }),
      { loop: true, ...bip, note: 'face na coronha; o balanço roda a arma à volta das patas do bípode (fixas)' }),
    sample('mg34_prone_fire_burst', burstDur, t => proneFire(R, t, n), { loop: false, ...bip, rounds: n, rate_rpm: MG34.rate_rpm, shot_interval_s: SHOT, events: { fire },
      fire_window_s: [0, +(n * SHOT).toFixed(3)],
      interrupt: { after_shots: { 4: +(4 * SHOT).toFixed(3), 6: +(6 * SHOT).toFixed(3) }, fade_s: 0.2, to: 'mg34_prone_aim',
        note: 'para cortar a rajada depois de 4 ou 6 tiros: cruzar para mg34_prone_aim no instante indicado (antes do 5.º/7.º evento); os eventos seguintes não são emitidos' } }),
    sample('mg34_prone_reload', RELOAD.dur, t => reloadPose(R, t), { loop: false, ...bip, events: RELOAD.events, pair: 'mg34_loader_prone_feed',
      note: 'o tambor vazio é pousado à esquerda da arma e some em drum_down (o jogo pode deixar um adereço); o novo aparece na mão do municiador em drum_from_assistant e passa ao atirador em drum_handoff' }),
    sample('mg34_prone_exit', D, t => enterPose(R, K, D - t), { loop: false, from: 'mg34_prone_aim', to: 'mg34_aim (instante 0, de pé)', bipod: 'open → folded',
      events: { bipod_lift: +(D - ENTER.land).toFixed(3), bipod_folded: +(D - ENTER.swing[1]).toFixed(3), standing: D } }),
    sample('mg34_loader_prone_idle', 4, (t, u) => loaderIdle(R, Math.sin(u * Math.PI * 2), 0.25 * (1 - Math.cos(u * Math.PI * 2))),
      { loop: true, root_offset_from_gunner_m: LOADER_OFFSET }, { role: 'loader' }),
    sample('mg34_loader_prone_feed', RELOAD.dur, t => loaderFeed(R, t), { loop: false, root_offset_from_gunner_m: LOADER_OFFSET, pair: 'mg34_prone_reload',
      events: { reach_carrier: 0.95, drum_from_assistant: ev.drum_from_assistant, drum_handoff: ev.drum_handoff },
      note: 'tocar ao mesmo tempo que mg34_prone_reload; o tambor visível é o nó mg34_drum da arma do atirador (porta-tambores não modelado)' }, { role: 'loader' }),
    sample('mg34_loader_prone_leave', LEAVE.dur, t => leavePose(R, LK, t), { loop: false, root_offset_from_gunner_m: LOADER_OFFSET, from: 'mg34_loader_prone_idle', to: 'agachado no joelho direito (sem deslocar a raiz)' }, { role: 'loader' }),
  ];
}
export { enterKeys, enterPose, standAim, loaderFeed, reloadPose, proneFire, proneAim, loaderIdle, leaveKeys, leavePose };
