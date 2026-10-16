// Primitivas das peças danificadas, com faces planas e UV em metros como as do kit intacto (o atlas fica com a área
// real). `box`/`bar` seguem a construção de tools/assets/m01-wagons/src/wagons.mjs, que não as exporta; `slab`
// extruda contornos não convexos (bordos queimados e furos de impacto) por ear clipping.
import { v3 } from '../../m01-soldiers/src/meshops.mjs';

export const tag = (part, name, paint, group = 'body') => Object.assign(part, { name, paint, group });

/** Paralelepípedo de centro c, eixos unitários directos [ax, ay, az] e dimensões s (24 vértices). */
function cuboid(c, [ax, ay, az], s) {
  const positions = [], uvs = [], indices = [], h = s.map(x => x / 2);
  for (const [d, u, w] of [[0, 1, 2], [1, 2, 0], [2, 0, 1]]) for (const sg of [-1, 1]) {
    const base = positions.length / 3;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const k = [0, 0, 0]; k[d] = sg * h[d]; k[u] = a * h[u]; k[w] = b * h[w];
      positions.push(...v3.add(c, v3.add(v3.mul(ax, k[0]), v3.add(v3.mul(ay, k[1]), v3.mul(az, k[2])))));
      uvs.push((a + 1) / 2 * s[u], (b + 1) / 2 * s[w]);
    }
    indices.push(...(sg > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]).map(i => base + i));
  }
  return { positions, uvs, indices };
}
export const box = (s, c) => cuboid(c, [[1, 0, 0], [0, 1, 0], [0, 0, 1]], s);
/** Barra de secção [w, h] de a a b; w segue `side` (projectado na perpendicular), h a terceira direcção. */
export function bar(a, b, [w, h], side = [1, 0, 0]) {
  const az = v3.norm(v3.sub(b, a)), ax = v3.norm(v3.sub(side, v3.mul(az, v3.dot(side, az))));
  return cuboid(v3.mul(v3.add(a, b), 0.5), [ax, v3.cross(az, ax), az], [w, h, v3.dist(a, b)]);
}
/** Barra dobrada: uma barra por troço da linha `pts` (aço empenado pelo calor ou pelo impacto). */
export function bent(pts, section, side) {
  const out = { positions: [], uvs: [], indices: [] };
  for (let i = 0; i + 1 < pts.length; i++) append(out, bar(pts[i], pts[i + 1], section, side));
  return out;
}
export function append(out, m) {
  const base = out.positions.length / 3;
  out.positions.push(...m.positions); out.uvs.push(...m.uvs); out.indices.push(...m.indices.map(i => i + base));
  return out;
}

const area2 = pts => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);
const cross2 = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
/** Triangulação de um polígono simples (ear clipping); devolve índices no sentido anti-horário. */
export function earcut(pts) {
  const idx = pts.map((_, i) => i);
  if (area2(pts) < 0) idx.reverse();
  const tris = [];
  const inside = (p, a, b, c) => cross2(a, b, p) > 1e-12 && cross2(b, c, p) > 1e-12 && cross2(c, a, p) > 1e-12;
  let guard = 0;
  while (idx.length > 3 && guard++ < 10000) {
    let cut = false;
    for (let k = 0; k < idx.length; k++) {
      const i0 = idx[(k + idx.length - 1) % idx.length], i1 = idx[k], i2 = idx[(k + 1) % idx.length];
      const a = pts[i0], b = pts[i1], c = pts[i2];
      if (cross2(a, b, c) <= 1e-12) continue;
      if (idx.some(j => j !== i0 && j !== i1 && j !== i2 && inside(pts[j], a, b, c))) continue;
      tris.push(i0, i1, i2); idx.splice(k, 1); cut = true; break;
    }
    if (!cut) throw new Error(`earcut: polígono degenerado (${pts.length} pontos)`);
  }
  tris.push(...idx);
  return tris;
}

/**
 * Placa extrudada: contorno simples [u, v] (não precisa de ser convexo) entre w0 e w1, colocado por `map` (afim).
 * As arestas em `skip` não têm face lateral (costuras escondidas, bordo assente no estrado); os vértices em `smooth`
 * partilham a normal entre as faces laterais vizinhas (part.weld), como o tejadilho em arco do kit intacto. A
 * orientação de cada triângulo segue a normal exterior, qualquer que seja a orientação de `map`.
 */
export function slab(outline, w0, w1, { map = p => p, skip = [], smooth = [] } = {}) {
  const positions = [], uvs = [], indices = [], weld = [], n = outline.length, ccw = area2(outline) > 0;
  const put = (p, uv, key = `u${positions.length}`) => { positions.push(...map(p)); uvs.push(...uv); weld.push(key); return positions.length / 3 - 1; };
  const tri = (t, want) => {
    const P = j => positions.slice(j * 3, j * 3 + 3), [A, B, C] = t.map(P);
    indices.push(...(v3.dot(v3.cross(v3.sub(B, A), v3.sub(C, A)), want) >= 0 ? t : [t[0], t[2], t[1]]));
  };
  const dirW = v3.sub(map([0, 0, w1]), map([0, 0, w0]));
  const cap = earcut(outline);
  for (const [w, sg] of [[w0, -1], [w1, 1]]) {
    const base = positions.length / 3;
    outline.forEach(p => put([p[0], p[1], w], [p[0], p[1]]));
    for (let t = 0; t < cap.length; t += 3) tri([base + cap[t], base + cap[t + 1], base + cap[t + 2]], v3.mul(dirW, sg));
  }
  let s = 0;
  for (let i = 0; i < n; i++) {
    const a = outline[i], b = outline[(i + 1) % n], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (skip.includes(i) || len < 1e-6) { s += len; continue; }
    const out2 = ccw ? [(b[1] - a[1]) / len, -(b[0] - a[0]) / len] : [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, w0], want = v3.sub(map([m[0] + out2[0] * 0.01, m[1] + out2[1] * 0.01, w0]), map(m));
    const j = (i + 1) % n, ka = smooth.includes(i) ? `s${i}` : `e${i}a`, kb = smooth.includes(j) ? `s${j}` : `e${i}b`;
    const q = [put([a[0], a[1], w0], [s, 0], `${ka}0`), put([b[0], b[1], w0], [s + len, 0], `${kb}0`), put([b[0], b[1], w1], [s + len, w1 - w0], `${kb}1`), put([a[0], a[1], w1], [s, w1 - w0], `${ka}1`)];
    tri([q[0], q[1], q[2]], want); tri([q[0], q[2], q[3]], want);
    s += len;
  }
  return { positions, uvs, indices, weld };
}

/** Aplica fn a cada vértice (deformações e rotações de peças existentes, que mantêm os índices). */
export function warp(part, fn) {
  for (let i = 0; i < part.positions.length; i += 3) {
    const p = fn([part.positions[i], part.positions[i + 1], part.positions[i + 2]]);
    part.positions[i] = p[0]; part.positions[i + 1] = p[1]; part.positions[i + 2] = p[2];
  }
  return part;
}
/** Rotação de `deg` graus em torno do eixo unitário `axis` que passa por `o` (Rodrigues). */
export function rotateAbout(o, axis, deg) {
  const k = v3.norm(axis), a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return p => {
    const d = v3.sub(p, o), kd = v3.dot(k, d);
    return v3.add(o, v3.add(v3.add(v3.mul(d, c), v3.mul(v3.cross(k, d), s)), v3.mul(k, kd * (1 - c))));
  };
}

/** Arco do tejadilho (mesma construção do kit intacto): centro e raio pela corda à altura do beiral e pela flecha. */
export function roofArc(half, eave, crest, steps = 8) {
  const R = (half * half + (crest - eave) ** 2) / (2 * (crest - eave)), cy = crest - R, a0 = Math.asin(half / R);
  return Array.from({ length: steps + 1 }, (_, k) => { const a = Math.PI / 2 - a0 + (2 * a0) * k / steps; return [R * Math.cos(a), cy + R * Math.sin(a)]; });
}
