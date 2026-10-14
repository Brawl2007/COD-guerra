// Construtor de malhas do kit de props M01: primitivas originais (caixa subdividida, cilindro/cone, elipsoide,
// tubo, grelha de relevo) que escrevem vértices com normais e cor de vértice (sem UV nem texturas).
// Cores em sRGB 0..1; a conversão para linear (glTF COLOR_0) é feita ao escrever o GLB.
// Tudo é determinístico: o ruído vem de noise.mjs e não há Math.random.
import { noise3, hash } from './noise.mjs';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const v3 = { sub, add, mul, dot, cross, norm };
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const hex = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

/** Rotação Euler (ordem Z, X, Y) de um vector. */
export function rotate(p, [rx = 0, ry = 0, rz = 0]) {
  let [x, y, z] = p;
  if (rz) { const c = Math.cos(rz), s = Math.sin(rz); [x, y] = [x * c - y * s, x * s + y * c]; }
  if (rx) { const c = Math.cos(rx), s = Math.sin(rx); [y, z] = [y * c - z * s, y * s + z * c]; }
  if (ry) { const c = Math.cos(ry), s = Math.sin(ry); [x, z] = [x * c + z * s, -x * s + z * c]; }
  return [x, y, z];
}

/** Material do GLB: parâmetros PBR. A cor vem sempre da cor de vértice. */
export const MATERIALS = {
  wood: { roughness: 0.92, metallic: 0 },
  wood_painted: { roughness: 0.8, metallic: 0 },
  steel: { roughness: 0.6, metallic: 0.45 },
  steel_painted: { roughness: 0.75, metallic: 0.15 },
  iron_cast: { roughness: 0.8, metallic: 0.35 },
  rust: { roughness: 0.9, metallic: 0.2 },
  cloth: { roughness: 1, metallic: 0 },
  rope: { roughness: 1, metallic: 0 },
  porcelain: { roughness: 0.35, metallic: 0 },
  glass: { roughness: 0.25, metallic: 0 },
  coal: { roughness: 0.65, metallic: 0.05 },
  earth: { roughness: 1, metallic: 0 },
  leather: { roughness: 0.85, metallic: 0 },
  wire: { roughness: 0.55, metallic: 0.5, doubleSided: true },
  brass: { roughness: 0.5, metallic: 0.5 },
};

export class Model {
  constructor(id, lod, seed = 0) {
    this.id = id; this.lod = lod; this.seed = seed; this.parts = new Map();
    this.dirt = 1;        // 0 desliga a lama junto ao chão (peças no ar)
    this.sockets = {};    // pontos de ligação em metros (fios, isoladores...)
  }
  part(mat) {
    if (!MATERIALS[mat]) throw new Error(`material desconhecido ${mat}`);
    if (!this.parts.has(mat)) this.parts.set(mat, { pos: [], nrm: [], col: [], idx: [] });
    return this.parts.get(mat);
  }
  /** Ruído de cor: variação multiplicativa em torno de 1 com grão opcional ao longo de um eixo (0,1,2). */
  tint(base, p, { variance = 0.1, freq = 5, grain = -1, seed = 0 } = {}) {
    const f = [freq, freq, freq];
    if (grain >= 0) { f.fill(freq * 3.4); f[grain] = freq * 0.45; }
    const s = this.seed + seed * 13.7;
    const n = noise3(p[0] * f[0] + s, p[1] * f[1] + s * 0.3, p[2] * f[2] - s * 0.7);
    const k = 1 + variance * 2 * n;
    return [clamp(base[0] * k), clamp(base[1] * k), clamp(base[2] * k)];
  }
  /**
   * Núcleo: positions [[x,y,z]], indices (triângulos CCW vistos de fora). flat = normais por face; senão suaves.
   * color(p, n) opcional devolve sRGB; caso contrário usa opts.color com ruído.
   */
  mesh(mat, positions, indices, { color = [0.5, 0.5, 0.5], flat = false, variance = 0.1, freq = 5, grain = -1, seed = 0, colorFn = null } = {}) {
    const P = this.part(mat), base = P.pos.length / 3;
    const col = (p, n, i) => colorFn ? colorFn(p, n, i) : this.tint(color, p, { variance, freq, grain, seed });
    if (flat) {
      for (let t = 0; t < indices.length; t += 3) {
        const [a, b, c] = [indices[t], indices[t + 1], indices[t + 2]].map(i => positions[i]);
        const cr = cross(sub(b, a), sub(c, a));
        if (Math.hypot(...cr) < 1e-10) continue;   // triângulo degenerado
        const n = norm(cr), o = P.pos.length / 3;
        for (const [k, p] of [a, b, c].entries()) { P.pos.push(...p); P.nrm.push(...n); P.col.push(...col(p, n, indices[t + k])); }
        P.idx.push(o, o + 1, o + 2);
      }
      return;
    }
    const acc = positions.map(() => [0, 0, 0]);
    for (let t = 0; t < indices.length; t += 3) {
      const [i, j, k] = [indices[t], indices[t + 1], indices[t + 2]];
      const n = cross(sub(positions[j], positions[i]), sub(positions[k], positions[i]));
      for (const v of [i, j, k]) acc[v] = add(acc[v], n);
    }
    // só os vértices usados (os pólos colapsados de blob() ficam de fora)
    const remap = new Map();
    for (const i of indices) {
      if (!remap.has(i)) {
        const p = positions[i], n = norm(acc[i]), o = remap.size;
        remap.set(i, base + o); P.pos.push(...p); P.nrm.push(...n); P.col.push(...col(p, n, i));
      }
    }
    for (const i of indices) P.idx.push(remap.get(i));
  }
  /** Grelha rows×cols de pontos → triângulos (wrapU fecha as colunas, wrapV as linhas). */
  grid(mat, pts, { wrapU = false, wrapV = false, flipped = false, ...o } = {}) {
    const rows = pts.length, cols = pts[0].length, positions = pts.flat(), idx = [];
    const ix = (r, c) => r * cols + (c % cols);
    for (let r = 0; r < (wrapV ? rows : rows - 1); r++) for (let c = 0; c < (wrapU ? cols : cols - 1); c++) {
      const r2 = (r + 1) % rows;
      const a = ix(r, c), b = ix(r, c + 1), d = ix(r2, c), e = ix(r2, c + 1);
      if (flipped) idx.push(a, b, d, b, e, d); else idx.push(a, d, b, b, d, e);
    }
    this.mesh(mat, positions, idx, o);
  }
  fan(mat, ring, center, flipped, o) {
    const positions = [center, ...ring], idx = [];
    for (let i = 0; i < ring.length; i++) { const a = 1 + i, b = 1 + (i + 1) % ring.length; if (flipped) idx.push(0, b, a); else idx.push(0, a, b); }
    this.mesh(mat, positions, idx, { flat: true, ...o });
  }

  /**
   * Caixa centrada em `at` com tamanho `size`, subdivisão por eixo `subdiv` ([nx,ny,nz]), relevo `bump` (m) nos
   * vértices interiores, rotação `rot`. skip: lista de faces a omitir ('+x','-x','+y','-y','+z','-z').
   */
  box(mat, { size, at = [0, 0, 0], rot = null, subdiv = 1, bump = 0, skip = [], ...o }) {
    const sd = Array.isArray(subdiv) ? subdiv : [subdiv, subdiv, subdiv];
    const faces = [['+x', 0, 1, 2], ['-x', 0, 1, 2], ['+y', 1, 2, 0], ['-y', 1, 2, 0], ['+z', 2, 0, 1], ['-z', 2, 0, 1]];
    const tf = p => { const q = rot ? rotate(p, rot) : p; return [q[0] + at[0], q[1] + at[1], q[2] + at[2]]; };
    for (const [name, ax, ua, va] of faces) {
      if (skip.includes(name)) continue;
      const sign = name[0] === '+' ? 1 : -1, nu = sd[ua], nv = sd[va];
      const pts = [];
      for (let j = 0; j <= nv; j++) {
        const row = [];
        for (let i = 0; i <= nu; i++) {
          const p = [0, 0, 0];
          p[ax] = sign * size[ax] / 2; p[ua] = (i / nu - 0.5) * size[ua]; p[va] = (j / nv - 0.5) * size[va];
          if (bump && i > 0 && i < nu && j > 0 && j < nv) p[ax] += sign * bump * noise3(p[0] * 9 + this.seed, p[1] * 9, p[2] * 9);
          row.push(tf(p));
        }
        pts.push(row);
      }
      // orientação: (ax,ua,va) é cíclica para +, invertida para −; a ordem das grelhas já dá CCW com o sinal certo
      const cyc = (ax + 1) % 3 === ua;
      this.grid(mat, pts, { flipped: (sign > 0) === cyc, ...o });
    }
  }
  /** Prisma por extrusão de um polígono 2D (plano XY, extrudido em Z de −d/2 a +d/2). */
  prism(mat, poly, depth, { at = [0, 0, 0], rot = null, ...o } = {}) {
    const n = poly.length, positions = [], idx = [];
    const tf = p => { const q = rot ? rotate(p, rot) : p; return [q[0] + at[0], q[1] + at[1], q[2] + at[2]]; };
    for (const z of [-depth / 2, depth / 2]) for (const [x, y] of poly) positions.push(tf([x, y, z]));
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; idx.push(i, j, n + i, j, n + j, n + i); }
    for (let i = 1; i + 1 < n; i++) { idx.push(n, n + i, n + i + 1); idx.push(0, i + 1, i); }
    this.mesh(mat, positions, idx, { flat: true, ...o });
  }
  /**
   * Cilindro/cone no eixo local Y de 0 a h; `at` é o centro da base. r pode ser função de t∈[0,1].
   * caps: 'both' | 'top' | 'bottom' | 'none'. flat = faces planas (aspecto de chapa/madeira facetada).
   */
  cyl(mat, { r0 = 0.1, r1 = r0, h = 1, seg = 12, rings = 1, at = [0, 0, 0], rot = null, caps = 'both', r = null, flat = false, squash = 1, ...o }) {
    const tf = p => { const q = rot ? rotate(p, rot) : p; return [q[0] + at[0], q[1] + at[1], q[2] + at[2]]; };
    const radius = t => (r ? r(t) : r0 + (r1 - r0) * t);
    const pts = [];
    for (let k = 0; k <= rings; k++) {
      const t = k / rings, row = [];
      for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2; row.push(tf([Math.cos(a) * radius(t), t * h, Math.sin(a) * radius(t) * squash])); }
      pts.push(row);
    }
    this.grid(mat, pts, { wrapU: true, flat, ...o });
    if (caps === 'both' || caps === 'bottom') this.fan(mat, pts[0], tf([0, 0, 0]), false, o);
    if (caps === 'both' || caps === 'top') this.fan(mat, pts[rings], tf([0, h, 0]), true, o);
  }
  /** Superelipsoide (sacos, pedras, esferas): meios-eixos rad, expoentes e, nu×nv. `shape(p)` pode deformar. */
  blob(mat, { rad, at = [0, 0, 0], rot = null, nu = 8, nv = 5, e = [1, 1], shape = null, ...o }) {
    const pw = (x, p) => Math.sign(x) * Math.abs(x) ** p;
    const pts = [];
    for (let j = 0; j <= nv; j++) {
      const th = -Math.PI / 2 + (j / nv) * Math.PI, row = [];
      for (let i = 0; i < nu; i++) {
        const ph = (i / nu) * Math.PI * 2;
        let p = [rad[0] * pw(Math.cos(th), e[0]) * pw(Math.cos(ph), e[1]), rad[1] * pw(Math.sin(th), e[0]), rad[2] * pw(Math.cos(th), e[0]) * pw(Math.sin(ph), e[1])];
        if (shape) p = shape(p, th, ph);
        const q = rot ? rotate(p, rot) : p;
        row.push([q[0] + at[0], q[1] + at[1], q[2] + at[2]]);
      }
      pts.push(row);
    }
    // os pólos colapsam: manter as linhas, os triângulos degenerados são removidos abaixo
    const cols = nu, positions = pts.flat(), idx = [];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = j * cols + i, b = j * cols + (i + 1) % cols, c = (j + 1) * cols + i, d = (j + 1) * cols + (i + 1) % cols;
      if (j > 0) idx.push(a, c, b);
      if (j < nv - 1) idx.push(b, c, d);
    }
    this.mesh(mat, positions, idx, o);
  }
  /**
   * Tubo ao longo de um caminho (transporte paralelo). r = número ou t→raio; sides ≥3; closed = anel fechado.
   */
  tube(mat, path, { r = 0.01, sides = 5, closed = false, caps = true, ...o }) {
    const n = path.length, rings = [];
    let up = Math.abs(path[1][1] - path[0][1]) > 0.9 * Math.hypot(...sub(path[1], path[0])) ? [1, 0, 0] : [0, 1, 0];
    let prevT = null, nrm = null;
    for (let k = 0; k < n; k++) {
      const a = path[closed ? (k + n - 1) % n : Math.max(k - 1, 0)], b = path[closed ? (k + 1) % n : Math.min(k + 1, n - 1)];
      const t = norm(sub(b, a));
      if (!nrm) nrm = norm(cross(cross(t, up), t));
      else if (prevT) { // transporte paralelo
        const ax = cross(prevT, t), s = Math.hypot(...ax);
        if (s > 1e-6) { const ang = Math.asin(clamp(s, -1, 1)) * Math.sign(dot(prevT, t) || 1); const u = norm(ax); nrm = rotAxis(nrm, u, ang); }
      }
      prevT = t;
      const bin = norm(cross(t, nrm)), rad = typeof r === 'function' ? r(k / (n - 1)) : r, ring = [];
      for (let i = 0; i < sides; i++) { const ang = (i / sides) * Math.PI * 2; ring.push(add(path[k], add(mul(nrm, Math.cos(ang) * rad), mul(bin, Math.sin(ang) * rad)))); }
      rings.push(ring);
    }
    this.grid(mat, rings, { wrapU: true, wrapV: closed, flipped: true, ...o });
    if (!closed && caps) { this.fan(mat, rings[0], path[0], true, o); this.fan(mat, rings[n - 1], path[n - 1], false, o); }
  }
  /** Fita plana (faixa) ao longo de um caminho, largura w na direcção `side` — para arame e ripas finas. */
  ribbon(mat, path, { w = 0.01, side = [0, 1, 0], ...o }) {
    const L = path.map(p => add(p, mul(side, -w / 2))), R = path.map(p => add(p, mul(side, w / 2)));
    this.grid(mat, [L, R], { flipped: true, ...o });
  }
}

function rotAxis(v, u, a) {
  const c = Math.cos(a), s = Math.sin(a), d = dot(u, v) * (1 - c), x = cross(u, v);
  return [v[0] * c + x[0] * s + u[0] * d, v[1] * c + x[1] * s + u[1] * d, v[2] * c + x[2] * s + u[2] * d];
}

/** Envelhecimento comum a todos os props: lama junto ao chão, pó nas faces viradas para cima, baixo mais escuro. */
export function weather(model, { mud = hex('#4a4034'), dust = hex('#8b8470') } = {}) {
  for (const P of model.parts.values()) {
    for (let i = 0; i < P.pos.length / 3; i++) {
      const p = [P.pos[i * 3], P.pos[i * 3 + 1], P.pos[i * 3 + 2]], n = [P.nrm[i * 3], P.nrm[i * 3 + 1], P.nrm[i * 3 + 2]];
      let c = [P.col[i * 3], P.col[i * 3 + 1], P.col[i * 3 + 2]];
      const nz = noise3(p[0] * 7 + 3.1, p[1] * 7, p[2] * 7 - model.seed);
      if (model.dirt) c = mix(c, mud, clamp((0.42 - p[1]) / 0.42, 0, 1) ** 1.5 * (0.45 + 0.25 * nz) * model.dirt);
      c = mix(c, dust, clamp(n[1], 0, 1) ** 2 * (0.12 + 0.05 * nz));
      const down = clamp(-n[1], 0, 1);
      c = mul(c, 1 - 0.3 * down);
      // dessaturação ligeira: nenhuma cor saturada ao amanhecer
      const g = (c[0] + c[1] + c[2]) / 3;
      c = mix([g, g, g], c, 0.9);
      P.col[i * 3] = clamp(c[0]); P.col[i * 3 + 1] = clamp(c[1]); P.col[i * 3 + 2] = clamp(c[2]);
    }
  }
  return model;
}

export { noise3, hash };
