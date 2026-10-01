// Vestuário derivado do corpo: classificação da pele visível, cascas de pano (túnica, calças) com espessura e
// suavização, e peças em loft por secções do corpo (gola, aba da túnica, cinto, botas, perneiras).
import { fromBase, computeNormals, v3, smoothstep, pointGrid, transferSkin } from './meshops.mjs';
import { hullRings, frame, loft } from './geom.mjs';

const ARM = /^(clavicle|upperarm|lowerarm|hand|thumb|index|middle|ring|pinky)_/;
const HANDISH = /^(hand|thumb|index|middle|ring|pinky)_/;
const LEG = /^(thigh|calf|foot|ball)_/;
const HEADISH = /^(head|jaw|eye_)/;

/** Normais do corpo inteiro por vértice original (para deslocar as cascas). */
export function bodyNormals(h, positions = h.positions) {
  const body = computeNormals(fromBase(h, h.base.faces.filter(f => f.group === 'body'), positions));
  const N = new Float64Array(h.base.vertexCount * 3);
  body.src.forEach((s, i) => N.set([body.normals[i * 3], body.normals[i * 3 + 1], body.normals[i * 3 + 2]], s * 3));
  return N;
}

/** Medidas de referência do corpo para o vestuário (metros, pose de ligação). */
export function landmarks(h) {
  const J = h.joints, P = i => [h.positions[i * 3], h.positions[i * 3 + 1], h.positions[i * 3 + 2]];
  let crotch = Infinity;
  const bodyVerts = new Set();
  for (const f of h.base.faces) if (f.group === 'body') f.v.forEach(v => bodyVerts.add(v));
  // Entrepernas: o vértice mais baixo do tronco perto do plano médio.
  for (const v of bodyVerts) { const p = P(v); if (Math.abs(p[0]) < 0.012 && Math.abs(p[2] - J.hips[2]) < 0.12 && p[1] > 0.5) crotch = Math.min(crotch, p[1]); }
  return {
    waistY: J.hips[1] + 0.105,           // linha do cinto (cintura natural, um pouco acima da anca)
    crotchY: crotch,
    neck: J.neck, shoulderY: J.upperarm_l[1],
    bodyVerts: [...bodyVerts],
  };
}

/** Peso somado por expressão de osso, por vértice original. */
const sumW = (h, re) => h.skin.map(list => list.reduce((s, [b, w]) => s + (re.test(b) ? w : 0), 0));

/**
 * Classifica os vértices do corpo: 'skin' (cabeça/pescoço acima da gola e mãos além do punho),
 * 'tunic', 'legs' (calças), 'foot' (dentro da bota). Inclui margens de sobreposição.
 */
export function classify(h, lm, { cuff = -0.012, collarFront = 0.012, collarBack = 0.05, overlap = 0.025 } = {}) {
  const J = h.joints, n = h.base.vertexCount;
  const arm = sumW(h, ARM), hand = sumW(h, HANDISH), leg = sumW(h, LEG), head = sumW(h, HEADISH), neck = sumW(h, /^neck$/);
  const footW = sumW(h, /^(foot|ball)_/);
  const out = { skinCore: new Uint8Array(n), skinVisible: new Uint8Array(n), tunic: new Uint8Array(n), legs: new Uint8Array(n), foot: new Uint8Array(n), t: new Float64Array(n) };
  const nz = J.neck[2], r = 0.065;
  const collarY = z => J.neck[1] + (collarFront + collarBack) / 2 + Math.max(-1, Math.min(1, (z - nz) / r)) * (collarBack - collarFront) / 2;
  for (const v of lm.bodyVerts) {
    const p = [h.positions[v * 3], h.positions[v * 3 + 1], h.positions[v * 3 + 2]];
    // Mãos: distância ao longo do antebraço a partir do pulso.
    let handT = -Infinity;
    if (arm[v] > 0.4) for (const s of ['l', 'r']) {
      const a = v3.norm(v3.sub(J[`hand_${s}`], J[`lowerarm_${s}`]));
      if (Math.sign(p[0]) === Math.sign(J[`hand_${s}`][0])) handT = Math.max(handT, v3.dot(v3.sub(p, J[`hand_${s}`]), a));
    }
    const upper = head[v] + neck[v] > 0.3 && arm[v] < 0.3;
    const above = p[1] - collarY(p[2]);
    out.t[v] = handT;
    if ((upper && above > 0) || (arm[v] > 0.4 && handT > cuff)) out.skinCore[v] = 1;
    if ((upper && above > -overlap) || (arm[v] > 0.4 && handT > cuff - overlap)) out.skinVisible[v] = 1;
    if (footW[v] > 0.5 || (leg[v] > 0.5 && p[1] < 0.075)) { out.foot[v] = 1; continue; }
    if (leg[v] > 0.5 || (arm[v] < 0.4 && p[1] < lm.waistY + 0.03)) out.legs[v] = 1;
    if (!out.skinCore[v] && (arm[v] >= 0.4 || (leg[v] <= 0.5 && p[1] > lm.waistY - 0.03))) out.tunic[v] = 1;
  }
  return out;
}


/** Cópia das posições do corpo com alisamento laplaciano só onde mask(v) — base das cascas de pano (sem anatomia fina). */
export function smoothedBody(h, mask, iterations = 30) {
  const P = Float64Array.from(h.positions), nbr = new Map();
  for (const f of h.base.faces) if (f.group === 'body') for (let k = 0; k < f.v.length; k++) {
    const a = f.v[k], b = f.v[(k + 1) % f.v.length];
    if (!nbr.has(a)) nbr.set(a, new Set()); if (!nbr.has(b)) nbr.set(b, new Set());
    nbr.get(a).add(b); nbr.get(b).add(a);
  }
  const moving = [...nbr.keys()].filter(v => mask(v));
  // Taubin (λ/μ): alisa sem encolher o volume (o laplaciano simples estreitava o tronco).
  for (let it = 0; it < iterations * 2; it++) {
    const lambda = it % 2 ? -0.53 : 0.5, next = new Map();
    for (const v of moving) {
      const ns = [...nbr.get(v)], avg = [0, 0, 0];
      for (const u of ns) for (let k = 0; k < 3; k++) avg[k] += P[u * 3 + k] / ns.length;
      next.set(v, avg.map((a, k) => P[v * 3 + k] + lambda * (a - P[v * 3 + k])));
    }
    for (const [v, p] of next) P.set(p, v * 3);
  }
  return P;
}

/** Faces do corpo em que todos os vértices satisfazem a máscara. */
export const facesWhere = (h, mask) => h.base.faces.filter(f => f.group === 'body' && f.v.every(v => mask[v]));

/**
 * Casca de pano: faces do corpo deslocadas pela normal (espessura por vértice), suavizadas (Taubin) para
 * apagar a anatomia, sem nunca entrar no corpo (espessura mínima). Mantém os UV da malha base.
 */
export function shell(h, faces, N, thickness, { iterations = 10, minThickness = 0.004, minFn = null, pin = null, adjust = null, post = null, base = h.positions } = {}) {
  const m = fromBase(h, faces);
  const uniq = [...new Set(m.src)], at = new Map(uniq.map((s, i) => [s, i]));
  let P = uniq.map(s => { const t = thickness(s); return [0, 1, 2].map(k => base[s * 3 + k] + N[s * 3 + k] * t); });
  if (adjust) P = P.map((p, i) => adjust(uniq[i], p));
  const nbr = uniq.map(() => new Set());
  const edgeCount = new Map();
  for (const f of faces) for (let k = 0; k < f.v.length; k++) {
    const a = f.v[k], b = f.v[(k + 1) % f.v.length];
    nbr[at.get(a)].add(at.get(b)); nbr[at.get(b)].add(at.get(a));
    const key = a < b ? `${a},${b}` : `${b},${a}`; edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
  }
  const border = new Set();
  for (const [key, c] of edgeCount) if (c === 1) key.split(',').forEach(x => border.add(at.get(+x)));
  const step = (lambda, only = null) => {
    const next = P.map(p => [...p]);
    for (let i = 0; i < P.length; i++) {
      if (border.has(i) || pin?.(uniq[i]) || (only && !only(uniq[i], i))) continue;
      const ns = [...nbr[i]];
      if (!ns.length) continue;
      const avg = [0, 0, 0];
      for (const j of ns) for (let k = 0; k < 3; k++) avg[k] += P[j][k] / ns.length;
      for (let k = 0; k < 3; k++) next[i][k] = P[i][k] + lambda * (avg[k] - P[i][k]);
    }
    for (let i = 0; i < P.length; i++) P[i] = next[i];
  };
  for (let it = 0; it < iterations; it++) { step(0.5); step(-0.53); }
  if (adjust) for (let i = 0; i < P.length; i++) if (!border.has(i)) P[i] = adjust(uniq[i], P[i], true);
  const laplace = (n, only) => { for (let it = 0; it < n; it++) step(0.5, only); };
  if (post) { post(P, uniq, border, laplace); for (let it = 0; it < 3; it++) { step(0.5); step(-0.53); } post(P, uniq, border, laplace); }
  for (let it = 0; it < 2; it++) { step(0.5); step(-0.53); }
  for (let i = 0; i < P.length; i++) {
    const s = uniq[i], n = [N[s * 3], N[s * 3 + 1], N[s * 3 + 2]], b = [base[s * 3], base[s * 3 + 1], base[s * 3 + 2]];
    const d = v3.dot(v3.sub(P[i], b), n), want = minFn ? minFn(s) : Math.max(minThickness, Math.min(thickness(s), minThickness * 3));
    if (d < want) P[i] = v3.add(P[i], v3.mul(n, want - d));
  }
  m.positions = [];
  for (const s of m.src) m.positions.push(...P[at.get(s)]);
  m.skin = m.src.map(s => h.skin[s]);
  m.border = border; m.uniq = uniq; m.shellPos = P; m.at = at;
  return m;
}

/** Bainha interior nas aberturas (punhos): faixa da borda da casca até à pele, para não se ver através. */
export function cuffLips(h, sh, selectBorder) {
  const positions = [], uvs = [], indices = [], skin = [];
  const edges = [];
  const I = sh.indices;
  const count = new Map();
  for (let t = 0; t < I.length; t += 3) for (let k = 0; k < 3; k++) {
    const a = sh.src[I[t + k]], b = sh.src[I[t + (k + 1) % 3]];
    const key = a < b ? `${a},${b}` : `${b},${a}`; count.set(key, (count.get(key) ?? 0) + 1);
    if (!count.has(`${key}:dir`)) count.set(`${key}:dir`, [a, b]);
  }
  for (const [key, c] of count) if (!key.includes(':') && c === 1) edges.push(count.get(`${key}:dir`));
  for (const [a, b] of edges) {
    if (!selectBorder(a) || !selectBorder(b)) continue;
    const pa = sh.shellPos[sh.at.get(a)], pb = sh.shellPos[sh.at.get(b)];
    const ia = [h.positions[a * 3], h.positions[a * 3 + 1], h.positions[a * 3 + 2]], ib = [h.positions[b * 3], h.positions[b * 3 + 1], h.positions[b * 3 + 2]];
    const base = positions.length / 3;
    positions.push(...pa, ...pb, ...v3.lerp(pb, ib, 0.85), ...v3.lerp(pa, ia, 0.85));
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
    skin.push(h.skin[a], h.skin[b], h.skin[b], h.skin[a]);
  }
  return { positions, uvs, indices, skin, size: [0.3, 0.02] };
}

/** Pontos do corpo (metros) cujo índice satisfaz o filtro. */
export const bodyPoints = (h, lm, filter) => lm.bodyVerts.filter(filter).map(v => [h.positions[v * 3], h.positions[v * 3 + 1], h.positions[v * 3 + 2]]);

/** Pesos de pele para peças em loft: vizinhos mais próximos no corpo (com filtro de região opcional). */
export function skinFromBody(h, lm, part, filter = null, k = 6) {
  const verts = filter ? lm.bodyVerts.filter(filter) : lm.bodyVerts;
  const pts = verts.map(v => [h.positions[v * 3], h.positions[v * 3 + 1], h.positions[v * 3 + 2]]);
  part.skin = transferSkin(part.positions, pts, verts.map(v => h.skin[v]), { k, grid: pointGrid(pts, 0.04) });
  return part;
}

/** Orienta os triângulos para fora (em relação ao centróide ou a um eixo) — partes convexas em loft. */
export function orientOutward(part, center = null) {
  const P = part.positions, I = part.indices;
  let c = center;
  if (!c) { c = [0, 0, 0]; for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) c[k] += P[i + k] * 3 / P.length; }
  let score = 0;
  for (let t = 0; t < I.length; t += 3) {
    const a = [P[I[t] * 3], P[I[t] * 3 + 1], P[I[t] * 3 + 2]], b = [P[I[t + 1] * 3], P[I[t + 1] * 3 + 1], P[I[t + 1] * 3 + 2]], d = [P[I[t + 2] * 3], P[I[t + 2] * 3 + 1], P[I[t + 2] * 3 + 2]];
    const n = v3.cross(v3.sub(b, a), v3.sub(d, a)), m = v3.mul(v3.add(v3.add(a, b), d), 1 / 3);
    score += v3.dot(n, v3.sub(m, typeof c === 'function' ? c(m) : c));
  }
  if (score < 0) for (let t = 0; t < I.length; t += 3) [I[t + 1], I[t + 2]] = [I[t + 2], I[t + 1]];
  return part;
}

export { hullRings, frame, loft, smoothstep };
