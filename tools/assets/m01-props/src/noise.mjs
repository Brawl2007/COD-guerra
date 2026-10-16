// Ruído procedural determinístico (gradiente 3D tipo Perlin + fBm + células) para pintar texturas em 3D.
const P = new Uint8Array(512);
{
  let s = 1939;
  const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
}
const G = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;

/** Ruído de gradiente em [-1, 1] aproximadamente. */
export function noise3(x, y, z) {
  const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
  x -= X; y -= Y; z -= Z;
  const xi = X & 255, yi = Y & 255, zi = Z & 255;
  const g = (h, dx, dy, dz) => { const v = G[h % 12]; return v[0] * dx + v[1] * dy + v[2] * dz; };
  const a = P[xi] + yi, aa = P[a] + zi, ab = P[a + 1] + zi, b = P[xi + 1] + yi, ba = P[b] + zi, bb = P[b + 1] + zi;
  const u = fade(x), v = fade(y), w = fade(z);
  return lerp(
    lerp(lerp(g(P[aa], x, y, z), g(P[ba], x - 1, y, z), u), lerp(g(P[ab], x, y - 1, z), g(P[bb], x - 1, y - 1, z), u), v),
    lerp(lerp(g(P[aa + 1], x, y, z - 1), g(P[ba + 1], x - 1, y, z - 1), u), lerp(g(P[ab + 1], x, y - 1, z - 1), g(P[bb + 1], x - 1, y - 1, z - 1), u), v),
    w);
}

/** Soma de oitavas (fBm), em [-1, 1] aproximadamente. */
export function fbm(p, freq = 1, octaves = 4, gain = 0.5) {
  let s = 0, a = 1, n = 0, f = freq;
  for (let o = 0; o < octaves; o++) { s += a * noise3(p[0] * f + o * 17.1, p[1] * f + o * 31.7, p[2] * f + o * 7.3); n += a; a *= gain; f *= 2.03; }
  return s / n;
}

/** Hash escalar determinístico em [0, 1) para inteiros. */
export function hash(...k) {
  let h = 2166136261;
  for (const v of k) { h ^= (v | 0) + 0x9e3779b9; h = Math.imul(h, 16777619); h ^= h >>> 13; }
  return ((h >>> 0) % 100000) / 100000;
}
