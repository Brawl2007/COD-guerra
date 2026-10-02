// Copiado de tools/assets/m01-soldiers/src/geom.mjs (main, 72bbcdd): codex/m01-runtime ainda não tem o gerador dos soldados.
// Primitivas geométricas originais: secções por casco convexo, loft de anéis, torno, caixas arredondadas e tiras.
// Cada parte devolve {positions, uvs (UV local 0..1 da ilha), indices, size: [largura, altura] em metros da ilha}.
import { v3 } from './meshops.mjs';

/** Casco convexo 2D (monotone chain). */
export function hull2(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
/** Raio do casco na direcção angle a partir do centro c (intersecção raio–polígono). */
export function hullRadius(h, c, angle) {
  const d = [Math.cos(angle), Math.sin(angle)];
  let best = 0;
  for (let i = 0; i < h.length; i++) {
    const a = h[i], b = h[(i + 1) % h.length];
    const e = [b[0] - a[0], b[1] - a[1]], w = [a[0] - c[0], a[1] - c[1]];
    const den = d[0] * e[1] - d[1] * e[0];
    if (Math.abs(den) < 1e-12) continue;
    const t = (w[0] * e[1] - w[1] * e[0]) / den, s = (w[0] * d[1] - w[1] * d[0]) / den;
    if (t > 0 && s >= -1e-9 && s <= 1 + 1e-9) best = Math.max(best, t);
  }
  return best;
}
export const centroid2 = h => { let x = 0, y = 0; for (const p of h) { x += p[0]; y += p[1]; } return [x / h.length, y / h.length]; };

/** Referencial ortonormal a partir de uma tangente e de um vector "frente" aproximado. */
export function frame(origin, tangent, hint = [0, 0, -1]) {
  const t = v3.norm(tangent);
  let b = v3.cross(t, hint);
  if (v3.len(b) < 1e-6) b = v3.cross(t, [1, 0, 0]);
  b = v3.norm(b);
  const n = v3.norm(v3.cross(b, t));
  return { o: origin, t, n, b };   // n ~ hint (frente), b lateral
}

/**
 * Anéis de secção a partir de pontos (p. ex. vértices do corpo): para cada referencial, os pontos a ±slab
 * projectados no plano (n,b) dão um casco; o anel tem `segments` raios (+offset, função opcional por ângulo).
 */
export function hullRings(points, frames, { slab = 0.012, segments = 32, offset = 0, shape = null, minPts = 5 } = {}) {
  const rings = [];
  for (const [k, f] of frames.entries()) {
    let sel = [];
    for (let s = slab; sel.length < minPts && s < 0.2; s *= 1.6) {
      sel = points.filter(p => Math.abs(v3.dot(v3.sub(p, f.o), f.t)) < s);
    }
    const proj = sel.map(p => { const d = v3.sub(p, f.o); return [v3.dot(d, f.n), v3.dot(d, f.b)]; });
    const h = hull2(proj), c = centroid2(h);
    const ring = [];
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      let r = hullRadius(h, c, a) + (typeof offset === 'function' ? offset(a, k) : offset);
      let x = c[0] + Math.cos(a) * r, y = c[1] + Math.sin(a) * r;
      if (shape) [x, y] = shape(x, y, a, k, c);
      ring.push(v3.add(f.o, v3.add(v3.mul(f.n, x), v3.mul(f.b, y))));
    }
    rings.push(ring);
  }
  return rings;
}

/**
 * Loft de anéis (todos com o mesmo número de pontos) num tubo; u ao redor (costura em u=0/1), v ao longo.
 * caps: 'start' | 'end' | 'both' fecha com leque. Tamanho da ilha = perímetro médio × comprimento.
 */
export function loft(rings, { closed = true, caps = null, flip = false } = {}) {
  const n = rings[0].length, positions = [], uvs = [], indices = [];
  const lengths = [0];
  for (let k = 1; k < rings.length; k++) {
    const c0 = rings[k - 1].reduce((s, p) => v3.add(s, p), [0, 0, 0]), c1 = rings[k].reduce((s, p) => v3.add(s, p), [0, 0, 0]);
    lengths.push(lengths[k - 1] + v3.dist(v3.mul(c0, 1 / n), v3.mul(c1, 1 / n)));
  }
  const total = lengths.at(-1) || 1;
  let perim = 0;
  for (const r of rings) for (let i = 0; i < n; i++) perim += v3.dist(r[i], r[(i + 1) % n]) / rings.length;
  const cols = closed ? n + 1 : n;
  rings.forEach((ring, k) => {
    for (let i = 0; i < cols; i++) { const p = ring[i % n]; positions.push(...p); uvs.push(i / (cols - 1), lengths[k] / total); }
  });
  for (let k = 0; k + 1 < rings.length; k++) for (let i = 0; i + 1 < cols; i++) {
    const a = k * cols + i, b = a + 1, c = a + cols, d = c + 1;
    if (flip) indices.push(a, b, c, b, d, c); else indices.push(a, c, b, b, c, d);
  }
  const cap = (ring, atEnd) => {
    const c = ring.reduce((s, p) => v3.add(s, p), [0, 0, 0]).map(x => x / n);
    const ci = positions.length / 3;
    positions.push(...c); uvs.push(0.5, atEnd ? 1 : 0);
    const start = positions.length / 3;
    for (let i = 0; i < n; i++) { positions.push(...ring[i]); uvs.push(0.5 + 0.02 * Math.cos(i / n * 6.283), (atEnd ? 1 : 0) + 0.0001); }
    for (let i = 0; i < n; i++) {
      const a = start + i, b = start + (i + 1) % n;
      if (atEnd !== flip) indices.push(ci, a, b); else indices.push(ci, b, a);
    }
  };
  if (caps === 'start' || caps === 'both') cap(rings[0], false);
  if (caps === 'end' || caps === 'both') cap(rings.at(-1), true);
  return { positions, uvs, indices, size: [Math.max(perim, 0.01), Math.max(total, 0.01)] };
}

/** Superfície de revolução genérica: profile(t) → [raio, altura] e azimute com r/h dependentes de phi. */
export function lathe(fn, { rings = 16, segments = 32, caps = null, flip = false } = {}) {
  const rs = [];
  for (let k = 0; k <= rings; k++) {
    const t = k / rings, ring = [];
    for (let i = 0; i < segments; i++) { const phi = (i / segments) * Math.PI * 2; ring.push(fn(t, phi)); }
    rs.push(ring);
  }
  return loft(rs, { caps, flip });
}

/** Caixa de cantos arredondados (superelipse por secção) — bolsas, cantis, caixas de máscara. */
export function roundedBox([w, h, d], { r = 0.01, segments = 24, rings = 6, bulge = 0 } = {}) {
  const rr = Math.min(r, w / 2, d / 2);
  const section = (y, s) => {
    const pts = [];
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2, cx = Math.cos(a), cz = Math.sin(a);
      const ex = w / 2 - rr, ez = d / 2 - rr;
      const sx = Math.sign(cx) * ex + cx * rr, sz = Math.sign(cz) * ez + cz * rr;
      const b = 1 + bulge * Math.cos(a) ** 2 * (1 - (2 * y / h) ** 2);
      pts.push([sx * s * b, y, sz * s]);
    }
    return pts;
  };
  const rs = [];
  for (let k = 0; k <= rings; k++) {
    const t = k / rings, y = -h / 2 + t * h;
    const edge = Math.min(t, 1 - t) * h;
    const s = edge < rr ? Math.sqrt(Math.max(0, 1 - ((rr - edge) / rr) ** 2)) * 0.85 + 0.15 : 1;
    rs.push(section(y, s));
  }
  return loft(rs, { caps: 'both' });
}

/** Cilindro simples (eixo Y) com raio por posição. */
export function cylinder(radius, length, { segments = 16, rings = 1, caps = 'both', profile = null } = {}) {
  return lathe((t, phi) => { const r = profile ? profile(t) * radius : radius; return [Math.cos(phi) * r, -length / 2 + t * length, Math.sin(phi) * r]; },
    { rings, segments, caps });
}

/** Tira (correia) ao longo de um caminho de pontos, com normal de superfície por ponto: largura e espessura. */
export function strap(path, normals, { width = 0.04, thickness = 0.004 } = {}) {
  const rings = [];
  for (let k = 0; k < path.length; k++) {
    const t = v3.norm(v3.sub(path[Math.min(k + 1, path.length - 1)], path[Math.max(k - 1, 0)]));
    const n = v3.norm(normals[k]), b = v3.norm(v3.cross(t, n));
    const c = path[k], hw = width / 2;
    rings.push([
      v3.add(c, v3.add(v3.mul(b, -hw), v3.mul(n, thickness))), v3.add(c, v3.add(v3.mul(b, hw), v3.mul(n, thickness))),
      v3.add(c, v3.mul(b, hw)), v3.add(c, v3.mul(b, -hw)),
    ]);
  }
  const part = loft(rings, { caps: 'both' });
  part.size = [width * 2 + thickness * 2, part.size[1]];
  return part;
}

/** Aplica rotação (matriz 3×3 em colunas: eixos x,y,z) e translação a uma parte. */
export function place(part, origin, axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
  const p = part.positions;
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i], y = p[i + 1], z = p[i + 2];
    p[i] = origin[0] + axes[0][0] * x + axes[1][0] * y + axes[2][0] * z;
    p[i + 1] = origin[1] + axes[0][1] * x + axes[1][1] * y + axes[2][1] * z;
    p[i + 2] = origin[2] + axes[0][2] * x + axes[1][2] * y + axes[2][2] * z;
  }
  return part;
}
/** Eixos a partir de "frente" (eixo +Z local vai para `forward`) e "cima". */
export function axesFrom(forward, up = [0, 1, 0]) {
  const z = v3.norm(forward), x = v3.norm(v3.cross(up, z)), y = v3.cross(z, x);
  return [x, y, z];
}
