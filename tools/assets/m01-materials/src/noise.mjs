// Ruído periódico (tileável) só com aritmética exacta (+ - * / sqrt floor): sem Math.sin/cos/pow, para que o resultado
// seja idêntico entre versões de Node e plataformas.
export const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
export const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const mix = (a, b, t) => a + (b - a) * t;

export function hash(x, y, s) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(s | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/** Gerador xorshift32: sequências repetíveis para carimbos (seixos, folhas de erva, palha). */
export class Rng {
  constructor(seed) { this.s = (seed >>> 0) || 1; }
  next() { let x = this.s; x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; this.s = x; return x / 4294967296; }
  range(a, b) { return a + (b - a) * this.next(); }
}

const tables = new Map();
const lattice = (px, py, seed) => {
  const key = `${px},${py},${seed}`; let t = tables.get(key);
  if (!t) { t = new Float32Array(px * py); for (let y = 0; y < py; y++) for (let x = 0; x < px; x++) t[y * px + x] = hash(x, y, seed); tables.set(key, t); }
  return t;
};
/** Ruído de valor periódico em [0,1]; u,v em [0,1) (a textura inteira); px,py = células por textura. */
export function vnoise(u, v, px, py, seed) {
  const t = lattice(px, py, seed), x = u * px, y = v * py, xi = Math.floor(x), yi = Math.floor(y), fx = fade(x - xi), fy = fade(y - yi);
  const x0 = ((xi % px) + px) % px, x1 = (x0 + 1) % px, y0 = ((yi % py) + py) % py, y1 = (y0 + 1) % py;
  const a = t[y0 * px + x0], b = t[y0 * px + x1], c = t[y1 * px + x0], d = t[y1 * px + x1];
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}
export function fbm(u, v, p, octaves, seed, gain = 0.5) {
  let sum = 0, amp = 1, norm = 0, period = p;
  for (let o = 0; o < octaves; o++) { sum += amp * vnoise(u, v, period, period, seed + o * 101); norm += amp; amp *= gain; period *= 2; }
  return sum / norm;
}

const jitters = new Map();
const jitter = (p, seed) => {
  const key = `${p},${seed}`; let t = jitters.get(key);
  if (!t) { t = new Float32Array(p * p * 3); for (let y = 0; y < p; y++) for (let x = 0; x < p; x++) { const i = (y * p + x) * 3; t[i] = 0.12 + 0.76 * hash(x, y, seed + 1); t[i + 1] = 0.12 + 0.76 * hash(x, y, seed + 2); t[i + 2] = hash(x, y, seed + 3); } jitters.set(key, t); }
  return t;
};
/** Worley periódico com p×p células. Devolve f1, f2 (em células) e o valor aleatório da célula mais próxima. */
export function worley(u, v, p, seed, out) {
  const t = jitter(p, seed), x = u * p, y = v * p, xi = Math.floor(x), yi = Math.floor(y);
  let f1 = 9, f2 = 9, id = 0, r2 = 0, nx = 0, ny = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = xi + i, cy = yi + j, wx = ((cx % p) + p) % p, wy = ((cy % p) + p) % p, k = (wy * p + wx) * 3;
    const dx = cx + t[k] - x, dy = cy + t[k + 1] - y, d = Math.sqrt(dx * dx + dy * dy);
    if (d < f1) { f2 = f1; f1 = d; id = t[k + 2]; r2 = hash(wx, wy, seed + 4); nx = dx; ny = dy; } else if (d < f2) f2 = d;
  }
  out.f1 = f1; out.f2 = f2; out.id = id; out.id2 = r2; out.dx = nx; out.dy = ny; return out;
}
