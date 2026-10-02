// Operações de malha usadas pelo gerador: extracção de faces da malha base, normais, pesos, fusão e utilidades vectoriais.
import { BONE_INDEX } from './human.mjs';

export const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
};
export const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

/**
 * Faces da malha base → malha triangulada com UV por canto (vértice duplicado por par posição/UV).
 * `src` guarda o índice original de cada vértice novo (para pesos, máscaras e soldaduras).
 */
export function fromBase(h, faces, positions = h.positions) {
  const key = new Map(), pos = [], uv = [], src = [], idx = [];
  const vert = (v, t) => {
    const k = v * 100000 + t;
    let i = key.get(k);
    if (i === undefined) {
      i = src.length; key.set(k, i); src.push(v);
      pos.push(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]);
      uv.push(h.base.uvs[t * 2], 1 - h.base.uvs[t * 2 + 1]);
    }
    return i;
  };
  for (const f of faces) {
    const c = f.v.map((v, k) => vert(v, f.t[k]));
    for (let k = 1; k + 1 < c.length; k++) idx.push(c[0], c[k], c[k + 1]);
  }
  return { positions: pos, uvs: uv, src, indices: idx };
}

/** Normais suaves; vértices com o mesmo `weld` (p. ex. índice original) partilham a normal (sem costuras visíveis). */
export function computeNormals(mesh, weld = mesh.src) {
  const n = mesh.positions.length / 3, acc = new Float64Array(n * 3), P = mesh.positions;
  const groupOf = weld ? (() => { const m = new Map(); const g = new Int32Array(n); for (let i = 0; i < n; i++) { const k = weld[i]; if (!m.has(k)) m.set(k, i); g[i] = m.get(k); } return g; })() : null;
  const I = mesh.indices;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t], b = I[t + 1], c = I[t + 2];
    const pa = [P[a * 3], P[a * 3 + 1], P[a * 3 + 2]], pb = [P[b * 3], P[b * 3 + 1], P[b * 3 + 2]], pc = [P[c * 3], P[c * 3 + 1], P[c * 3 + 2]];
    const fn = v3.cross(v3.sub(pb, pa), v3.sub(pc, pa));   // área ponderada
    for (const v of [a, b, c]) { const g = groupOf ? groupOf[v] : v; acc[g * 3] += fn[0]; acc[g * 3 + 1] += fn[1]; acc[g * 3 + 2] += fn[2]; }
  }
  const N = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const g = groupOf ? groupOf[i] : i, l = Math.hypot(acc[g * 3], acc[g * 3 + 1], acc[g * 3 + 2]) || 1;
    N[i * 3] = acc[g * 3] / l; N[i * 3 + 1] = acc[g * 3 + 1] / l; N[i * 3 + 2] = acc[g * 3 + 2] / l;
  }
  mesh.normals = N;
  return mesh;
}

/** Pesos [[osso, peso]…] por vértice → arrays JOINTS_0/WEIGHTS_0 (4 influências). */
export function skinArrays(list) {
  const n = list.length, J = new Uint16Array(n * 4), W = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const top = [...list[i]].sort((a, b) => b[1] - a[1]).slice(0, 4), s = top.reduce((t, e) => t + e[1], 0) || 1;
    top.forEach(([b, w], k) => { const j = BONE_INDEX[b]; if (j === undefined) throw new Error(`osso desconhecido ${b}`); J[i * 4 + k] = j; W[i * 4 + k] = w / s; });
    if (!top.length) { J[i * 4] = BONE_INDEX.hips; W[i * 4] = 1; }
  }
  return { joints: J, weights: W };
}

/** Funde várias malhas (mesmo material) numa só, somando índices. */
export function merge(list) {
  const out = { positions: [], normals: [], uvs: [], indices: [], skin: [] };
  for (const m of list) {
    const base = out.positions.length / 3;
    out.positions.push(...m.positions); out.normals.push(...m.normals); out.uvs.push(...m.uvs);
    for (const i of m.indices) out.indices.push(i + base);
    out.skin.push(...m.skin);
  }
  return out;
}

/** Índice espacial simples (grelha) para vizinhos mais próximos entre milhares de pontos. */
export function pointGrid(points, cell = 0.03) {
  const map = new Map(), key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  points.forEach((p, i) => { const k = key(...p); if (!map.has(k)) map.set(k, []); map.get(k).push(i); });
  return {
    nearest(p, k = 1, maxR = 6) {
      const cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell), cz = Math.floor(p[2] / cell);
      for (let r = 1; r <= maxR; r++) {
        const found = [];
        for (let x = cx - r; x <= cx + r; x++) for (let y = cy - r; y <= cy + r; y++) for (let z = cz - r; z <= cz + r; z++) {
          for (const i of map.get(`${x},${y},${z}`) ?? []) found.push([i, v3.dist(points[i], p)]);
        }
        if (found.length >= k) return found.sort((a, b) => a[1] - b[1]).slice(0, k);
      }
      return points.map((q, i) => [i, v3.dist(q, p)]).sort((a, b) => a[1] - b[1]).slice(0, k);
    },
  };
}

/** Transfere pesos de pele de uma malha de referência (pontos + pesos) por vizinhos mais próximos ponderados. */
export function transferSkin(targetPositions, refPoints, refSkin, { k = 4, grid = pointGrid(refPoints), filter = null } = {}) {
  const out = [];
  for (let i = 0; i < targetPositions.length / 3; i++) {
    const p = [targetPositions[i * 3], targetPositions[i * 3 + 1], targetPositions[i * 3 + 2]];
    const near = grid.nearest(p, k * (filter ? 4 : 1)).filter(([j]) => !filter || filter(j)).slice(0, k);
    const acc = new Map();
    for (const [j, d] of near) { const w = 1 / (d + 0.004); for (const [b, bw] of refSkin[j]) acc.set(b, (acc.get(b) ?? 0) + bw * w); }
    out.push([...acc.entries()]);
  }
  return out;
}
