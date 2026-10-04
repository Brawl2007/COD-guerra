// Clips da guarnição da ckm wz.30 para o rig existente dos soldados (mesmos ossos e o mesmo solver FK + IK de 2 ossos
// de tools/assets/m01-soldiers/src/pose.mjs) e clips dos nós da arma. A arma não vai no osso `weapon`: fica no tripé,
// no chão. Cada soldado é posto em CREW (referencial da cena da ckm) e as mãos seguem a arma, a fita e a alavanca. O
// osso `weapon` fica com escala 0 nestes clips (a espingarda não aparece): uma só arma por atirador.
// Valores de GAMEPLAY: 600 tiros/min [T34] e rajada de 8; a afinar em playtest.
import { GAME_BONES } from '../../m01-soldiers/src/human.mjs';
import { q, solve } from '../../m01-soldiers/src/pose.mjs';
import { v3, smoothstep } from '../../m01-soldiers/src/meshops.mjs';
import { CKM, PIVOTS, G, gunSockets, freeBeltPath } from './ckm.mjs';

const FPS = 30, N = v3.norm, S = gunSockets(), FREE = freeBeltPath();
const seg = (t, a, b) => smoothstep(a, b, t);
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const lerpN = (a, b, t) => a + (b - a) * t;
const yawQ = deg => q.axis([0, 1, 0], deg);

// ——— Estado da arma (nós) e referenciais ———
/** Estado dos nós móveis: direcção e elevação (graus), alavanca (m para trás), fita (m em X), fita vazia, troço livre. */
const REST = () => ({ traverse: 0, elevate: 0, handle: 0, feed: 0, spent: 1, spentX: 0, free: [0, 0, 0] });
/** Referencial da arma (nó ckm_elevate) na cena para um estado. */
export function gunWorld(st) {
  const ry = yawQ(st.traverse), re = q.axis([1, 0, 0], st.elevate);
  return { pos: v3.add(CKM.head, q.rot(ry, v3.sub(CKM.trunnion, CKM.head))), rot: q.mul(ry, re) };
}
const gp = (w, p) => v3.add(w.pos, q.rot(w.rot, p)), gd = (w, d) => q.rot(w.rot, d);

/**
 * Lugares da guarnição na cena da ckm (pos no chão, yaw em graus; 0 = virado para −Z como a arma). O atirador é
 * calculado em crewFor(R) para o olho direito ficar na linha de mira; o municiador ajoelha à esquerda, de frente para
 * a entrada da fita, junto à caixa.
 */
export const LOADER = { pos: [-0.52, 0, -0.08], yaw: -112 };
const toLocal = (crew) => {
  const inv = q.inv(yawQ(crew.yaw));
  return { p: x => q.rot(inv, v3.sub(x, crew.pos)), d: x => q.rot(inv, x), r: r => q.mul(inv, r) };
};

// ——— Pés e corpos ———
/** Pés no chão (como em m01-soldiers/src/clips.mjs): tornozelo em (x, z), yaw, pitch e flexão dos dedos (graus). */
function foot(x, z, { yaw = 0, y = 0.072, pitch = 0, toe = 0, out = 0.25 } = {}) {
  const rot = q.mul(q.axis([0, 1, 0], yaw), q.axis([1, 0, 0], -pitch));
  const fwd = q.rot(rot, [0, 0, -1]);
  return { pos: [x, y, z], rot, pole: N(v3.add(fwd, [Math.sign(x) * out, 0, 0])), toe };
}
/** Corpo em parâmetros numéricos (interpoláveis): anca, coluna, pescoço, cabeça, clavículas e pés. */
const spec = (o) => ({ hips: [0, 0.9, 0.06], hrot: [0, 0, 0], spine: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], neck: [0, 0, 0], head: [0, 0, 0],
  clavR: [0, 0, 0], clavL: [0, 0, 0], feet: { l: [-0.1, 0.05, 0, 0.072, 0, 0], r: [0.1, 0.08, 0, 0.072, 0, 0] }, ...o });
const lerpSpec = (a, b, t) => (Array.isArray(a) ? a.map((x, i) => lerpSpec(x, b[i], t)) : typeof a === 'number' ? lerpN(a, b, t)
  : Object.fromEntries(Object.keys(a).map(k => [k, lerpSpec(a[k], b[k], t)])));
const eul = ([pitch, yaw, roll]) => ({ pitch, yaw, roll });
/** Especificação → pedido de pose do solver. Pés: [x, z, yaw, y, pitch, toe]. */
const body = (s) => ({
  hips: { pos: s.hips, rot: eul(s.hrot) }, spine: s.spine.map(eul), neck: eul(s.neck), head: eul(s.head),
  clav: { r: eul(s.clavR), l: eul(s.clavL) },
  feet: Object.fromEntries(['l', 'r'].map(k => { const [x, z, yaw, y, pitch, toe] = s.feet[k]; return [k, foot(x, z, { yaw, y, pitch, toe })]; })),
});

/** Atirador sentado no chão atrás do tripé, joelhos levantados entre as pernas de trás; lean inclina o tronco. */
const gunnerSpec = (lean, b = 0, look = [0, 0]) => spec({
  hips: [0, 0.13 + 0.003 * b, 0.2], hrot: [-8 + lean * 0.4, 0, 0],
  spine: [[12 + lean * 0.3 + b, 0, 0], [10 + lean * 0.3, 0, 0], [6 + b * 0.5, 0, 0]],
  neck: [-(16 + lean) * 0.5 + look[1] * 0.5, look[0] * 0.5, 0], head: [-(16 + lean) * 0.5 + look[1] * 0.5, look[0] * 0.5, 0],
  clavR: [0, 6, -4], clavL: [0, -6, 0],
  feet: { l: [-0.16, -0.31, 14, 0.072, 0, 0], r: [0.17, -0.29, -14, 0.072, 0, 0] },
});
/** Municiador de joelho direito no chão (a postura `kneel` dos soldados), tronco inclinado para a fita. */
const loaderSpec = (bend, b = 0, look = [0, 0]) => spec({
  hips: [0.02, 0.5 + 0.004 * b, 0.12], hrot: [6 + bend * 0.3, -6, 0],
  spine: [[bend * 0.4 + b, 0, 0], [bend * 0.35, 0, 0], [bend * 0.25 + b * 0.5, 0, 0]],
  neck: [4 + look[1], look[0] * 0.5, 0], head: [2 + look[1], look[0] * 0.5, 0], clavR: [0, 4, 0], clavL: [0, -4, 0],
  feet: { l: [-0.14, -0.26, 6, 0.072, 0, 0], r: [0.14, 0.5, -8, 0.11, 40, 45] },
});
const standSpec = (yaw = 0) => spec({ hrot: [0, yaw, 0], spine: [[1, 0, 0], [1, 0, 0], [1, 0, 0]], neck: [2, 0, 0], head: [2, 0, 0],
  feet: { l: [-0.11, 0.05, 8 + yaw, 0.072, 0, 0], r: [0.12, 0.08, -10 + yaw, 0.072, 0, 0] } });

/** Posição do atirador: o olho direito no entalhe da alça prolongado (S.eye) com a arma em repouso. */
export function crewFor(R) {
  const eye = G(S.eye);
  let lo = -10, hi = 40, lean = 10;
  for (let i = 0; i < 30; i++) {
    lean = (lo + hi) / 2;
    const y = solve(R, body(gunnerSpec(lean))).W.eye_r.p[1];
    if (y > eye[1]) lo = lean; else hi = lean;
  }
  const e = solve(R, body(gunnerSpec(lean))).W.eye_r.p, r3 = x => +x.toFixed(3);
  return { gunner: { pos: [r3(eye[0] - e[0]), 0, r3(eye[2] - e[2])], yaw: 0, lean: +lean.toFixed(2) }, loader: LOADER };
}

// ——— Mãos ———
/** Mão cujo ponto de contacto (dedos/palma) fica em `c`: o pulso fica atrás dos dedos e por trás da palma. */
const handAt = (c, fdir, palm) => ({ pos: v3.sub(c, v3.add(v3.mul(fdir, 0.07), v3.mul(palm, 0.025))), fdir, palm });
const blendHand = (a, b, t) => ({ pos: mix(a.pos, b.pos, t), fdir: N(mix(a.fdir, b.fdir, t)), palm: N(mix(a.palm, b.palm, t)) });
/** Mãos do atirador no referencial da arma: direita no punho, esquerda encostada ao lado esquerdo da caixa, atrás. */
export const CKM_GRIP = {
  r: { pos: [0.034, -0.054, 0.395], fdir: N([-0.3, -0.62, -0.72]), palm: N([-1, 0.05, 0.15]) },
  l: handAt([-0.036, 0.03, 0.315], N([0.12, -0.2, -0.97]), N([1, -0.05, 0.05])),
};
const onGun = (w, g) => ({ pos: gp(w, g.pos), fdir: gd(w, g.fdir), palm: gd(w, g.palm) });
/** Braços caídos (mãos junto às coxas), no referencial da anca. */
const armsDown = (W, s) => {
  const k = s === 'r' ? 1 : -1;
  return { pos: v3.add(W.hips.p, q.rot(W.hips.r, [k * 0.21, -0.06, 0.02])), fdir: q.rot(W.hips.r, N([0, -1, -0.1])), palm: q.rot(W.hips.r, [-k, 0, 0]) };
};
const toCrew = (L, h) => ({ pos: L.p(h.pos), fdir: L.d(h.fdir), palm: L.d(h.palm) });
/** Ponto do troço livre da fita (u = 0 na caixa, 1 na entrada), com o deslocamento do nó ckm_belt_free. */
const freeAt = (st, u) => { const f = u * (FREE.length - 1), i = Math.min(FREE.length - 2, Math.floor(f)); return v3.add(mix(FREE[i], FREE[i + 1], f - i), st.free); };
/** Mãos do municiador na fita (cena): esquerda por baixo do troço livre, direita a guiar junto à entrada. */
function loaderOnBelt(st, w, { lift = 0 } = {}) {
  const lpt = v3.add(freeAt(st, 0.62), [0, -0.012 + lift, 0]), rpt = v3.add(gp(w, [F_ENTRY - 0.075 + st.feed, CKM.feed.y, CKM.feed.z]), [0, 0.012, 0.02]);
  return {
    l: handAt(lpt, N([0.6, 0.15, 0.78]), N([0.1, 1, 0])),
    r: handAt(rpt, N([0.75, -0.25, -0.6]), N([0.05, -1, 0.15])),
  };
}
const F_ENTRY = CKM.feed.entry;

// ——— Rajada ———
const SHOT = 60 / CKM.rate_rpm, ROUNDS = 8;
/** Fase do disparo k (0..1), recuo (0..1) e serra da fita (0..1 por tiro) durante a rajada. */
function burst(t) {
  const k = Math.floor(t / SHOT), ph = t / SHOT - k, firing = k < ROUNDS;
  return { k, firing, kick: firing ? Math.sin(Math.min(1, ph * 2) * Math.PI) : 0, saw: firing ? smoothstep(0.15, 0.6, ph) : 0 };
}

// ——— Clips: cada um devolve, para t, o estado da arma; os papéis usam esse estado ———
const CLIPS = {
  idle: { dur: 4, loop: true, gun: (t, u) => REST(),
    gunner: (R, C, t, u, st) => gunnerPose(R, C, st, { lean: C.gunner.lean - 8, b: Math.sin(u * Math.PI * 2), look: [6 * Math.sin(u * Math.PI * 2 * 0.5), 10] }),
    loader: (R, C, t, u, st) => loaderPose(R, st, { bend: 18, b: Math.sin(u * Math.PI * 2), look: [10 * Math.sin(u * Math.PI * 2 * 0.5), -4] }) },
  aim: { dur: 3, loop: true, gun: (t, u) => ({ ...REST(), traverse: 1.2 * Math.sin(u * Math.PI * 2), elevate: 0.35 * Math.sin(u * Math.PI * 4) }),
    gunner: (R, C, t, u, st) => gunnerPose(R, C, st, { lean: C.gunner.lean, b: 0.3 * Math.sin(u * Math.PI * 2) }),
    loader: (R, C, t, u, st) => loaderPose(R, st, { bend: 24, b: 0.5 * Math.sin(u * Math.PI * 2), look: [-6, -8] }) },
  fire_burst: { dur: +(ROUNDS * SHOT + 0.5).toFixed(2), loop: false, gun: (t) => {
      const f = burst(t), j = f.firing ? Math.sin(f.k * 2.4) : 0;
      return { ...REST(), traverse: 0.12 * j * f.kick, elevate: 0.25 * f.kick, handle: CKM.handleRecoil * f.kick, feed: CKM.pitch * f.saw, spentX: CKM.pitch * f.saw,
        free: [CKM.pitch * 0.5 * f.saw, 0.003 * f.kick, 0] };
    },
    gunner: (R, C, t, u, st) => gunnerPose(R, C, st, { lean: C.gunner.lean + 0.6 * burst(t).kick, index: 0.8 }),
    loader: (R, C, t, u, st) => loaderPose(R, st, { bend: 24, look: [-6, -8] }),
    events: { fire: Array.from({ length: ROUNDS }, (_, i) => +(i * SHOT).toFixed(3)) } },
  feed: { dur: 3.2, loop: false, gun: (t) => {
      // Fita fora (−0,12) → ponta metida pelo municiador (0,2–0,8) → puxada pelo atirador (1,0–1,3); duas puxadas na alavanca.
      const dx = t < 0.8 ? lerpN(-0.12, -0.02, seg(t, 0.2, 0.8)) : lerpN(-0.02, 0, seg(t, 1.0, 1.3));
      const pull = (a) => CKM.handleTravel * (seg(t, a, a + 0.2) - seg(t, a + 0.22, a + 0.3));
      return { ...REST(), feed: dx, free: [dx, 0, 0], spent: t < 1.3 ? 0 : 1, handle: pull(1.5) + pull(2.05) };
    },
    gunner: (R, C, t, u, st) => gunnerFeed(R, C, t, st), loader: (R, C, t, u, st) => loaderFeed(R, t, st),
    events: { belt_in: 0.8, belt_pulled: 1.3, handle_back: [1.7, 2.25], ready: 3.0 } },
  abandon: { dur: 3, loop: false, gun: () => REST(),
    gunner: (R, C, t, u, st) => leave(R, C, t, st, 'gunner'), loader: (R, C, t, u, st) => leave(R, C, t, st, 'loader'),
    events: { released: 0.4, standing: 1.6, leave: 2.2 } },
};

function gunnerPose(R, C, st, { lean, b = 0, look = [0, 0], index = 0.35, hands = null }) {
  const L = toLocal(C.gunner), w = gunWorld(st);
  const H = hands ?? { r: onGun(w, CKM_GRIP.r), l: onGun(w, CKM_GRIP.l) };
  return solve(R, { ...body(gunnerSpec(lean, b, look)),
    hands: { r: { ...toCrew(L, H.r), pole: [0.7, -0.5, 0.3] }, l: { ...toCrew(L, H.l), pole: [-0.8, -0.5, 0.2] } },
    fingers: { r: { curl: 0.72, index, thumb: 0.6 }, l: { curl: 0.45, thumb: 0.2 } }, weaponScale: 0 });
}
function loaderPose(R, st, { bend, b = 0, look = [0, 0], hands = null }) {
  const L = toLocal(LOADER), H = hands ?? loaderOnBelt(st, gunWorld(st));
  return solve(R, { ...body(loaderSpec(bend, b, look)),
    hands: { r: { ...toCrew(L, H.r), pole: [0.6, -0.7, 0.2] }, l: { ...toCrew(L, H.l), pole: [-0.7, -0.6, 0.1] } },
    fingers: { r: { curl: 0.6, thumb: 0.5 }, l: { curl: 0.55, thumb: 0.4 } }, weaponScale: 0 });
}

/** Alimentação, atirador: espera, puxa a ponta da fita para a direita, arma duas vezes (palma para cima), volta ao punho. */
function gunnerFeed(R, C, t, st) {
  const w = gunWorld(st), grip = onGun(w, CKM_GRIP.r);
  const tab = handAt(gp(w, [CKM.feed.exit + 0.012, CKM.feed.y + 0.006, CKM.feed.z]), gd(w, N([-0.55, -0.35, -0.75])), gd(w, N([0, -1, 0.1])));
  const pulled = handAt(gp(w, [CKM.feed.exit + 0.06, CKM.feed.y - 0.01, CKM.feed.z]), gd(w, N([-0.55, -0.35, -0.75])), gd(w, N([0, -1, 0.1])));
  const knob = handAt(gp(w, [CKM.handle[0] + 0.03, CKM.handle[1] - 0.012, CKM.handle[2] + st.handle + 0.008]), gd(w, N([-0.75, 0.15, -0.65])), gd(w, N([0, 1, 0.1])));
  let r;
  if (t < 0.6) r = grip;
  else if (t < 0.95) r = blendHand(grip, tab, seg(t, 0.6, 0.95));
  else if (t < 1.3) r = blendHand(tab, pulled, seg(t, 1.0, 1.3));
  else if (t < 1.5) r = blendHand(pulled, knob, seg(t, 1.3, 1.5));
  else if (t < 2.4) r = knob;
  else r = blendHand(knob, grip, seg(t, 2.4, 2.8));
  const look = [-14 * (seg(t, 0.5, 0.9) - seg(t, 2.4, 2.8)), 8 * (seg(t, 0.5, 0.9) - seg(t, 2.4, 2.8))];
  return gunnerPose(R, C, st, { lean: C.gunner.lean - 2, look, index: t > 2.6 ? 0.35 : 0.1, hands: { r, l: onGun(w, CKM_GRIP.l) } });
}
/** Alimentação, municiador: segura a ponta da fita, mete-a na entrada pela esquerda e volta a guiar a fita. */
function loaderFeed(R, t, st) {
  const w = gunWorld(st), belt = loaderOnBelt(st, w);
  const end = handAt(v3.add(gp(w, [F_ENTRY - 0.02 + st.feed, CKM.feed.y, CKM.feed.z]), [0, 0.012, 0.018]), gd(w, N([0.85, -0.2, -0.45])), gd(w, N([0.05, -1, 0.1])));
  const r = t < 0.85 ? end : blendHand(end, belt.r, seg(t, 0.85, 1.25));
  return loaderPose(R, st, { bend: 26 - 4 * seg(t, 0.9, 1.4), look: [-10, -12], hands: { r, l: belt.l } });
}

/** Abandono do posto: larga a arma, levanta-se, roda para trás e dá dois passos; a arma e a caixa ficam. */
function leave(R, C, t, st, role) {
  const gunner = role === 'gunner', start = gunner ? gunnerSpec(C.gunner.lean) : loaderSpec(24);
  const crouch = gunner
    ? spec({ hips: [0, 0.48, 0.12], hrot: [34, 0, 0], spine: [[18, 0, 0], [14, 0, 0], [8, 0, 0]], neck: [-12, 0, 0], head: [-10, 0, 0],
      feet: { l: [-0.14, 0.02, 10, 0.072, 0, 0], r: [0.15, 0.1, -10, 0.072, 0, 0] } })
    : spec({ hips: [0.02, 0.62, 0.1], hrot: [20, -4, 0], spine: [[12, 0, 0], [8, 0, 0], [6, 0, 0]], neck: [-4, 0, 0], head: [-2, 0, 0],
      feet: { l: [-0.14, -0.2, 6, 0.072, 0, 0], r: [0.14, 0.24, -8, 0.072, 10, 20] } });
  const up = standSpec(), [a, b2] = gunner ? [0.4, 1.0] : [0.4, 0.9];
  let s = t < b2 ? lerpSpec(start, crouch, seg(t, a, b2)) : lerpSpec(crouch, up, seg(t, b2, 1.6));
  // Rodar e sair: o gunner roda para a esquerda (para trás da casamata), o municiador para a direita; dois passos.
  const Y = gunner ? 160 : -70, uT = seg(t, 1.7, 2.9), fwd = q.rot(yawQ(Y), [0, 0, -1]);
  if (t > 1.6) {
    s = JSON.parse(JSON.stringify(s));
    const pivot = [s.hips[0], 0, s.hips[2]];
    s.hrot[1] += Y * seg(t, 1.7, 2.3);
    s.hips = v3.add(s.hips, v3.mul(fwd, 0.55 * seg(t, 2.0, 2.9)));
    for (const [k, y0, y1, d0, d1] of [['l', 1.7, 2.1, 2.0, 2.45], ['r', 1.9, 2.3, 2.45, 2.9]]) {
      const f = s.feet[k], ry = Y * seg(t, y0, y1), base = v3.sub([f[0], 0, f[1]], pivot), p = v3.add(v3.add(pivot, q.rot(yawQ(ry), base)), v3.mul(fwd, (k === 'l' ? 0.4 : 0.55) * seg(t, d0, d1)));
      const lift = 0.07 * (Math.sin(Math.PI * seg(t, y0, y1)) + Math.sin(Math.PI * seg(t, d0, d1)));
      s.feet[k] = [p[0], p[2], f[2] + ry, f[3] + lift, 0, 0];
    }
  }
  const pre = solve(R, body(s)).W, L = toLocal(C[role]), w = gunWorld(st), rel = seg(t, 0, a);
  const held = gunner ? { r: toCrew(L, onGun(w, CKM_GRIP.r)), l: toCrew(L, onGun(w, CKM_GRIP.l)) }
    : (({ r, l }) => ({ r: toCrew(L, r), l: toCrew(L, l) }))(loaderOnBelt(st, w));
  const hand = k => blendHand(held[k], armsDown(pre, k), seg(t, 0.05, a + 0.35));
  return solve(R, { ...body(s), hands: { r: { ...hand('r'), pole: [0.5, -0.4, 0.6] }, l: { ...hand('l'), pole: [-0.5, -0.4, 0.6] } },
    fingers: { r: { curl: 0.72 * (1 - rel) + 0.3, thumb: 0.4 }, l: { curl: 0.5 * (1 - rel) + 0.3, thumb: 0.3 } }, weaponScale: 0 });
}

// ——— Amostragem ———
const cont = rots => { for (let i = 1; i < rots.length; i++) if (rots[i - 1].reduce((s, x, k) => s + x * rots[i][k], 0) < 0) rots[i] = rots[i].map(x => -x); return rots; };
const timesFor = dur => Array.from({ length: Math.max(2, Math.round(dur * FPS) + 1) }, (_, i) => Math.min(dur, i / FPS));

/** Clip de um soldado: ossos do rig; `weapon` e `weapon_clip` com escala 0 (sem espingarda nem clipe). */
function sampleRole(R, C, name, def, role) {
  const times = timesFor(def.dur), poses = times.map(t => def[role](R, C, t, t / def.dur, def.gun(t, t / def.dur)));
  const tracks = [], moved = new Set(['root', 'hips', 'weapon', 'weapon_bolt', 'weapon_clip']);
  for (const b of GAME_BONES) {
    const rots = cont(poses.map(p => p.local[b.name] ?? q.id()));
    if (rots.some(r => Math.abs(r[3]) < 0.99999) || b.name === 'weapon') tracks.push({ bone: b.name, path: 'rotation', times, values: rots.flat() });
    if (moved.has(b.name) && poses.every(p => p.trans[b.name])) tracks.push({ bone: b.name, path: 'translation', times, values: poses.flatMap(p => p.trans[b.name]) });
  }
  tracks.push({ bone: 'weapon_clip', path: 'scale', times: [0, def.dur], values: [0, 0, 0, 0, 0, 0], interpolation: 'STEP' });
  tracks.push({ bone: 'weapon', path: 'scale', times: [0, def.dur], values: [0, 0, 0, 0, 0, 0], interpolation: 'STEP' });
  return { name, tracks, extras: { fps: FPS, weapon: 'ckm_wz30', role, crew: C[role], loop: def.loop, events: def.events ?? null,
    pose: role === 'gunner' ? 'seated' : 'crouched', sync: `ckm_wz30_gun_${name.split('_').slice(3).join('_')}` } };
}
/** Clip dos nós da arma (local ao pai de cada nó); faixas constantes com 2 chaves. */
function sampleGun(name, def) {
  const times = timesFor(def.dur), S0 = times.map(t => def.gun(t, t / def.dur)), tracks = [];
  const node = (n, path, vals, interpolation) => {
    const same = vals.every(v => v.every((x, k) => Math.abs(x - vals[0][k]) < 1e-7));
    tracks.push(same ? { node: n, path, times: [0, def.dur], values: [...vals[0], ...vals[0]], ...(interpolation ? { interpolation } : {}) }
      : { node: n, path, times, values: vals.flat(), ...(interpolation ? { interpolation } : {}) });
  };
  const local = n => v3.sub(PIVOTS[n], { ckm_elevate: PIVOTS.ckm_traverse, ckm_cocking_handle: PIVOTS.ckm_elevate, ckm_feed_belt: PIVOTS.ckm_elevate, ckm_belt_spent: PIVOTS.ckm_elevate }[n] ?? [0, 0, 0]);
  node('ckm_traverse', 'rotation', cont(S0.map(s => yawQ(s.traverse))));
  node('ckm_elevate', 'rotation', cont(S0.map(s => q.axis([1, 0, 0], s.elevate))));
  node('ckm_cocking_handle', 'translation', S0.map(s => v3.add(local('ckm_cocking_handle'), [0, 0, s.handle])));
  node('ckm_feed_belt', 'translation', S0.map(s => v3.add(local('ckm_feed_belt'), [s.feed, 0, 0])));
  node('ckm_belt_spent', 'translation', S0.map(s => v3.add(local('ckm_belt_spent'), [s.spentX, 0, 0])));
  node('ckm_belt_spent', 'scale', S0.map(s => [s.spent, s.spent, s.spent]), 'STEP');
  node('ckm_belt_free', 'translation', S0.map(s => v3.add(local('ckm_belt_free'), s.free)));
  return { name, tracks, extras: { fps: FPS, loop: def.loop, events: def.events ?? null } };
}

/** Clips: {crew, people: [ckm_wz30_{gunner,loader}_*] (rig), gun: [ckm_wz30_gun_*] (nós da arma)}. R = rigInfo(J). */
export function buildCkmClips(R) {
  const C = crewFor(R), people = [], gun = [];
  for (const [k, def] of Object.entries(CLIPS)) {
    for (const role of ['gunner', 'loader']) people.push(sampleRole(R, C, `ckm_wz30_${role}_${k}`, def, role));
    gun.push(sampleGun(`ckm_wz30_gun_${k}`, def));
  }
  return { crew: C, people, gun };
}
export const CLIP_KINDS = Object.keys(CLIPS);
/** Estados de repouso e por clip, para capturas e testes. */
export const gunStateAt = (kind, t) => CLIPS[kind].gun(t, t / CLIPS[kind].dur);
export const CLIP_DUR = Object.fromEntries(Object.entries(CLIPS).map(([k, d]) => [k, d.dur]));
