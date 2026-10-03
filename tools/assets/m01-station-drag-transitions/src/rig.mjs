// Ponte entre os GLB reais (rig e clips amostrados por fk.mjs) e o solver dos soldados: extrai de uma pose amostrada
// os parâmetros que `solve` reproduz (anca, rotações locais, pés e mãos no mundo com o pólo do joelho/cotovelo),
// mistura parâmetros e devolve rotações/translações locais para os 61 ossos.
import { GAME_BONES } from '../../m01-soldiers/src/human.mjs';
import { rigInfo, solve, q } from '../../m01-soldiers/src/pose.mjs';
import { v3 } from '../../m01-soldiers/src/meshops.mjs';
import { readGLB, skeleton, clip, localPose, worldPose } from './fk.mjs';

export const BONES = GAME_BONES.map(b => b.name);
const LIMB = new Set(['hips', 'root', 'thigh_l', 'calf_l', 'foot_l', 'thigh_r', 'calf_r', 'foot_r', 'upperarm_l', 'lowerarm_l', 'hand_l', 'upperarm_r', 'lowerarm_r', 'hand_r']);
export const PROPS = ['weapon', 'weapon_bolt', 'weapon_mag', 'weapon_clip'];
// Ossos cujas rotações locais passam directamente (tronco, cabeça, clavículas, dedos, pontas dos pés, socket).
export const FREE = BONES.filter(b => !LIMB.has(b) && !PROPS.includes(b));

export function loadRig(rigPath) {
  const glb = readGLB(rigPath), skel = skeleton(glb, GAME_BONES), J = {};
  for (const b of GAME_BONES) {
    const n = skel[b.name];
    if (n.r.some((v, i) => Math.abs(v - (i === 3 ? 1 : 0)) > 1e-6)) throw new Error('O solver exige os eixos de ligação alinhados com o mundo');
    J[b.name] = b.parent ? v3.add(J[b.parent], n.t) : n.t;
  }
  return { glb, skel, J, R: rigInfo(J) };
}

/** Pose local (osso → {t, r}) de um clip de um GLB no instante t, mais o mundo no referencial da raiz. */
export function sampled(rig, glbPath, name, t) {
  const g = readGLB(glbPath), c = clip(g, name), L = localPose(rig.skel, c, t);
  return { clip: c, L, W: worldPose(rig.skel, L) };
}

/** Parâmetros reproduzíveis por `solve` a partir de uma pose amostrada. */
export function extract(rig, { L, W }) {
  const r = L.root;
  if (v3.dist(r.t, rig.J.root) > 1e-6 || Math.abs(Math.abs(r.r[3]) - 1) > 1e-6) throw new Error('raiz animada: fora do contrato in-place');
  const local = Object.fromEntries(FREE.map(b => [b, L[b].r]));
  const side = s => ({
    foot: { pos: W[`foot_${s}`].p, rot: W[`foot_${s}`].r, pole: v3.sub(W[`calf_${s}`].p, W[`thigh_${s}`].p) },
    hand: { pos: W[`hand_${s}`].p, q: W[`hand_${s}`].r, pole: v3.sub(W[`lowerarm_${s}`].p, W[`upperarm_${s}`].p) },
  });
  const l = side('l'), rr = side('r');
  return { hips: { pos: W.hips.p, q: L.hips.r }, local, feet: { l: l.foot, r: rr.foot }, hands: { l: l.hand, r: rr.hand },
    props: Object.fromEntries(PROPS.map(b => [b, { t: L[b].t, r: L[b].r }])) };
}

const lerp = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const mixFoot = (a, b, t) => ({ pos: lerp(a.pos, b.pos, t), rot: q.slerp(a.rot, b.rot, t), pole: lerp(a.pole, b.pole, t) });
const mixHand = (a, b, t) => ({ pos: lerp(a.pos, b.pos, t), q: q.slerp(a.q, b.q, t), pole: lerp(a.pole, b.pole, t) });
/** Mistura de parâmetros (posições por lerp, rotações por slerp, pólos por lerp). */
export function mix(A, B, t) {
  return {
    hips: { pos: lerp(A.hips.pos, B.hips.pos, t), q: q.slerp(A.hips.q, B.hips.q, t) },
    local: Object.fromEntries(FREE.map(b => [b, q.slerp(A.local[b], B.local[b], t)])),
    feet: { l: mixFoot(A.feet.l, B.feet.l, t), r: mixFoot(A.feet.r, B.feet.r, t) },
    hands: { l: mixHand(A.hands.l, B.hands.l, t), r: mixHand(A.hands.r, B.hands.r, t) },
    props: Object.fromEntries(PROPS.map(b => [b, { t: lerp(A.props[b].t, B.props[b].t, t), r: q.slerp(A.props[b].r, B.props[b].r, t) }])),
  };
}

/** Parâmetros → pose local completa {local: osso → quat, trans: osso → vec3} e mundo W (referencial da raiz). */
export function pose(rig, P) {
  const S = solve(rig.R, { hips: P.hips, local: P.local, feet: P.feet, hands: P.hands });
  const local = {}, trans = {};
  for (const b of BONES) local[b] = S.local[b] ?? q.id();
  for (const b of PROPS) { local[b] = P.props[b].r; trans[b] = P.props[b].t; }
  trans.root = S.trans.root; trans.hips = S.trans.hips;
  // Mundo com os adereços tal como ficam (a arma está escondida, mas o osso existe).
  const L = Object.fromEntries(BONES.map(b => [b, { t: trans[b] ?? rig.skel[b].t, r: local[b] }]));
  return { local, trans, L, W: worldPose(rig.skel, L) };
}
