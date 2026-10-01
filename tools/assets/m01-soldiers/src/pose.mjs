// Poses do esqueleto de jogo: quaterniões, FK, IK analítica de 2 ossos (braços e pernas), orientação das mãos e
// dos pés por direcções no mundo, flexão dos dedos. Os ossos têm os eixos do mundo na pose de ligação, por isso
// rotação local = inv(R_mundo(pai)) · R_mundo(osso). Convenção dos ângulos (graus) para "euler":
// pitch > 0 inclina para a frente, yaw > 0 roda para a esquerda do soldado, roll > 0 inclina para a esquerda.
import { GAME_BONES } from './human.mjs';
import { v3 } from './meshops.mjs';

export const q = {
  id: () => [0, 0, 0, 1],
  axis: (a, deg) => { const r = deg * Math.PI / 360, s = Math.sin(r), n = v3.norm(a); return [n[0] * s, n[1] * s, n[2] * s, Math.cos(r)]; },
  mul: (a, b) => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]],
  inv: a => [-a[0], -a[1], -a[2], a[3]],
  rot: (a, v) => { const u = [a[0], a[1], a[2]], s = a[3], t = v3.mul(v3.cross(u, v), 2); return v3.add(v3.add(v, v3.mul(t, s)), v3.cross(u, t)); },
  norm: a => { const l = Math.hypot(...a) || 1; return a.map(x => x / l); },
  slerp: (a, b, t) => {
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], bb = b;
    if (d < 0) { d = -d; bb = b.map(x => -x); }
    if (d > 0.9995) return q.norm(a.map((x, i) => x + (bb[i] - x) * t));
    const th = Math.acos(d), s = Math.sin(th);
    return a.map((x, i) => (x * Math.sin((1 - t) * th) + bb[i] * Math.sin(t * th)) / s);
  },
  /** Matriz 3×3 (colunas) → quaternião. */
  fromCols: ([X, Y, Z]) => {
    const m00 = X[0], m11 = Y[1], m22 = Z[2], tr = m00 + m11 + m22;
    let r;
    if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; r = [(Y[2] - Z[1]) / s, (Z[0] - X[2]) / s, (X[1] - Y[0]) / s, s / 4]; }
    else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; r = [s / 4, (Y[0] + X[1]) / s, (Z[0] + X[2]) / s, (Y[2] - Z[1]) / s]; }
    else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; r = [(Y[0] + X[1]) / s, s / 4, (Z[1] + Y[2]) / s, (Z[0] - X[2]) / s]; }
    else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; r = [(Z[0] + X[2]) / s, (Z[1] + Y[2]) / s, s / 4, (X[1] - Y[0]) / s]; }
    return q.norm(r);
  },
  /** Rotação que leva o par (a0, b0) ao par (a1, b1): a exacto, b ortogonalizado. */
  frame: (a0, b0, a1, b1) => {
    const basis = (a, b) => { const x = v3.norm(a), z = v3.norm(v3.cross(x, b)), y = v3.cross(z, x); return [x, y, z]; };
    const M0 = basis(a0, b0), M1 = basis(a1, b1);
    // R = M1 · M0ᵀ
    const col = k => [0, 1, 2].map(r => M1[0][r] * M0[0][k] + M1[1][r] * M0[1][k] + M1[2][r] * M0[2][k]);
    return q.fromCols([col(0), col(1), col(2)]);
  },
  euler: ({ pitch = 0, yaw = 0, roll = 0 } = {}) => q.mul(q.mul(q.axis([0, 1, 0], yaw), q.axis([1, 0, 0], -pitch)), q.axis([0, 0, 1], roll)),
};

const PARENT = Object.fromEntries(GAME_BONES.map(b => [b.name, b.parent]));
const ORDER = GAME_BONES.map(b => b.name);
export const lerp3 = v3.lerp;

/** Referências da pose de ligação (direcções dos ossos, palma, eixos de flexão dos dedos). */
export function rigInfo(J) {
  const info = { J, hand: {}, finger: {} };
  for (const s of ['l', 'r']) {
    const fdir = v3.norm(v3.sub(J[`middle_01_${s}`], J[`hand_${s}`]));
    // Normal da palma: perpendicular aos dedos, do lado oposto ao dorso (verificada pela posição do polegar).
    let palm = v3.norm(v3.cross(v3.sub(J[`index_01_${s}`], J[`pinky_01_${s}`]), fdir));
    if (s === 'l') palm = v3.mul(palm, -1);
    info.hand[s] = { fdir, palm };
    for (const f of ['thumb', 'index', 'middle', 'ring', 'pinky']) {
      const d = v3.norm(v3.sub(J[`${f}_02_${s}`], J[`${f}_01_${s}`]));
      const axis = f === 'thumb' ? v3.norm(v3.cross(d, v3.norm(v3.add(palm, v3.mul(fdir, 0.3))))) : v3.norm(v3.cross(d, palm));
      info.finger[`${f}_${s}`] = axis;
    }
  }
  return info;
}

/** FK: rotações locais + translações locais (opcionais) → posições e rotações no mundo. */
export function fk(J, local, trans = {}) {
  const W = {};
  for (const b of ORDER) {
    const p = PARENT[b], lr = local[b] ?? q.id();
    if (!p) { W[b] = { p: trans[b] ?? J[b], r: lr }; continue; }
    const P = W[p], off = trans[b] ?? v3.sub(J[b], J[p]);
    W[b] = { p: v3.add(P.p, q.rot(P.r, off)), r: q.mul(P.r, lr) };
  }
  return W;
}

/** IK de 2 ossos: articulação intermédia a partir da raiz S, alvo T, comprimentos a, b e direcção do pólo. */
export function twoBone(S, T, a, b, pole) {
  const d0 = v3.sub(T, S), len = Math.min(Math.max(v3.len(d0), Math.abs(a - b) + 1e-4), a + b - 1e-4), dir = v3.norm(d0);
  const cosA = (a * a + len * len - b * b) / (2 * a * len), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  let p = v3.sub(pole, v3.mul(dir, v3.dot(pole, dir)));
  if (v3.len(p) < 1e-6) p = [0, 0, 1];
  p = v3.norm(p);
  return { mid: v3.add(S, v3.add(v3.mul(dir, a * cosA), v3.mul(p, a * sinA))), end: v3.add(S, v3.mul(dir, len)), pole: p };
}

/**
 * Resolve uma pose de alto nível em rotações/translações locais:
 *  hips: {pos, rot(euler)}, spine: [euler×3], neck, head (euler), jaw (graus), clav: {l, r} (euler),
 *  hands: {l|r: {pos, fdir, palm, pole}}, feet: {l|r: {pos, rot(quat), pole, toe}}, fingers: {l|r: {curl, thumb, spread}},
 *  weapon: {pos, rot}, bolt: {turn, back}, clip: {pos, rot, scale}, local: {osso: quat} (sobrepõe).
 */
export function solve(R, pose) {
  const J = R.J, local = {}, trans = {};
  trans.root = J.root;
  if (pose.hips) { trans.hips = v3.sub(pose.hips.pos ?? J.hips, J.root); local.hips = pose.hips.q ?? q.euler(pose.hips.rot); }
  ['spine_01', 'spine_02', 'spine_03'].forEach((b, i) => { if (pose.spine?.[i]) local[b] = q.euler(pose.spine[i]); });
  if (pose.neck) local.neck = q.euler(pose.neck);
  if (pose.head) local.head = q.euler(pose.head);
  if (pose.jaw) local.jaw = q.axis([1, 0, 0], pose.jaw);
  for (const s of ['l', 'r']) if (pose.clav?.[s]) local[`clavicle_${s}`] = q.euler(pose.clav[s]);
  Object.assign(local, pose.local ?? {});
  let W = fk(J, local, trans);
  // Pernas: anca → joelho → tornozelo; pé com rotação no mundo.
  for (const s of ['l', 'r']) {
    const f = pose.feet?.[s];
    if (!f) continue;
    const th = `thigh_${s}`, ca = `calf_${s}`, fo = `foot_${s}`;
    const a = v3.dist(J[th], J[ca]), b = v3.dist(J[ca], J[fo]);
    const ik = twoBone(W[th].p, f.pos, a, b, f.pole ?? [0, 0, -1]);
    const rT = q.frame(v3.sub(J[ca], J[th]), [0, 0, -1], v3.sub(ik.mid, W[th].p), ik.pole);
    const rC = q.frame(v3.sub(J[fo], J[ca]), [0, 0, -1], v3.sub(ik.end, ik.mid), ik.pole);
    local[th] = q.mul(q.inv(W[`hips`].r), rT);
    local[ca] = q.mul(q.inv(rT), rC);
    local[fo] = q.mul(q.inv(rC), f.rot ?? q.id());
    if (f.toe) local[`ball_${s}`] = q.axis([1, 0, 0], f.toe);
  }
  W = fk(J, local, trans);
  // Braços: ombro → cotovelo → pulso; mão orientada por direcção dos dedos e normal da palma (mundo).
  for (const s of ['l', 'r']) {
    const hnd = pose.hands?.[s];
    if (!hnd) continue;
    const ua = `upperarm_${s}`, la = `lowerarm_${s}`, ha = `hand_${s}`;
    const a = v3.dist(J[ua], J[la]), b = v3.dist(J[la], J[ha]);
    const ik = twoBone(W[ua].p, hnd.pos, a, b, hnd.pole ?? [s === 'l' ? -0.5 : 0.5, -0.3, 0.8]);
    const rHand = hnd.q ?? q.frame(R.hand[s].fdir, R.hand[s].palm, hnd.fdir, hnd.palm);
    // Torção do antebraço: metade entre o pólo do cotovelo e a orientação da mão (evita o "papel de rebuçado").
    const fore = v3.norm(v3.sub(ik.end, ik.mid)), handRef = q.rot(rHand, [0, 0, 1]);
    let twist = v3.add(ik.pole, v3.mul(v3.norm(v3.sub(handRef, v3.mul(fore, v3.dot(handRef, fore)))), 0.6));
    if (v3.len(twist) < 1e-4) twist = ik.pole;
    const rU = q.frame(v3.sub(J[la], J[ua]), [0, 0, 1], v3.sub(ik.mid, W[ua].p), ik.pole);
    const rL = q.frame(v3.sub(J[ha], J[la]), [0, 0, 1], v3.sub(ik.end, ik.mid), twist);
    local[ua] = q.mul(q.inv(W[`clavicle_${s}`].r), rU);
    local[la] = q.mul(q.inv(rU), rL);
    local[ha] = q.mul(q.inv(rL), rHand);
  }
  // Dedos: flexão por falange (graus); polegar à parte.
  for (const s of ['l', 'r']) {
    const fg = pose.fingers?.[s];
    if (!fg) continue;
    for (const f of ['index', 'middle', 'ring', 'pinky']) {
      const c = (fg[f] ?? fg.curl ?? 0);
      [1, 0.9, 0.7].forEach((k, i) => { local[`${f}_0${i + 1}_${s}`] = q.axis(R.finger[`${f}_${s}`], c * k * 75); });
    }
    const t = fg.thumb ?? 0;
    [0.5, 0.8, 0.8].forEach((k, i) => { local[`thumb_0${i + 1}_${s}`] = q.axis(R.finger[`thumb_${s}`], t * k * 55); });
  }
  // Adereços: arma (filha da raiz), ferrolho (filho da arma), clipe (filho da raiz).
  if (pose.weapon) { trans.weapon = v3.sub(pose.weapon.pos, W.root.p); local.weapon = pose.weapon.rot; }
  trans.weapon_bolt = v3.sub(J.weapon_bolt, J.weapon); trans.weapon_clip = v3.sub(J.weapon_clip, J.root);
  if (pose.bolt) { trans.weapon_bolt = v3.add(v3.sub(J.weapon_bolt, J.weapon), [0, 0, pose.bolt.back ?? 0]); local.weapon_bolt = q.axis([0, 0, 1], pose.bolt.turn ?? 0); }
  if (pose.clip) { trans.weapon_clip = v3.sub(pose.clip.pos, W.root.p); local.weapon_clip = pose.clip.rot; }
  return { local, trans, scale: { weapon_clip: pose.clip?.scale ?? 0, weapon: pose.weaponScale ?? 1 }, W: fk(J, local, trans) };
}

/** Transforma um ponto/direcção do referencial da arma (origem no punho) para o mundo. */
export const weaponPoint = (w, p) => v3.add(w.pos, q.rot(w.rot, p));
export const weaponDir = (w, d) => q.rot(w.rot, d);
