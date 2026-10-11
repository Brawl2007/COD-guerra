// Matemática portável do gerador: só + − × ÷, sqrt, floor/round/abs/min/max e constantes, que a norma IEEE 754
// arredonda de forma exacta em qualquer CPU e motor. Math.sin/cos/pow/exp/log/atan2/asin/hypot NÃO são exactas:
// o resultado depende do libm do V8 (fdlibm, glibc, FMA, arquitectura), o que fazia os GLB diferirem em 1 ulp entre
// aarch64 e x86 (ruído de ~1e-18 em normais que deviam ser 0). O gerador usa só estas funções, que têm precisão
// ≈1e-15 (de sobra para geometria em metros) e dão os mesmos bits em todo o lado. Ver o teste m01-props-kit.
const LN2 = 0.6931471805599453, LN2_HI = 0.6931471803691238, LN2_LO = 1.9082149292705877e-10;   // ln2 em 2 partes (fdlibm)
// π/2 em três partes de 33 bits (fdlibm: pio2_1, pio2_2, pio2_2t): k·parte é exacto para |k| < 2^20.
const PIO2_1 = 1.5707963267341256, PIO2_2 = 6.077100506303966e-11, PIO2_2T = 2.0222662487959506e-21;
const TWO_OVER_PI = 0.6366197723675814;

/** Núcleo sin(r) para |r| ≤ π/4: série de Taylor com termos suficientes (erro < 1e-28). */
function sinK(r) {
  const r2 = r * r;
  let term = r, sum = r;
  for (let n = 1; n <= 12; n++) { term = -term * r2 / ((2 * n) * (2 * n + 1)); sum += term; }
  return sum;
}
/** Núcleo cos(r) para |r| ≤ π/4. */
function cosK(r) {
  const r2 = r * r;
  let term = 1, sum = 1;
  for (let n = 1; n <= 12; n++) { term = -term * r2 / ((2 * n - 1) * (2 * n)); sum += term; }
  return sum;
}
/** Reduz x ao intervalo [−π/4, π/4]: devolve [r, quadrante 0..3]. */
function reduce(x) {
  if (!(Math.abs(x) < 1e5)) throw new RangeError(`pmath: argumento trigonométrico fora de gama (${x})`);
  const k = Math.round(x * TWO_OVER_PI);
  const r = ((x - k * PIO2_1) - k * PIO2_2) - k * PIO2_2T;
  return [r, ((k % 4) + 4) % 4];
}

export function sin(x) {
  const [r, q] = reduce(x);
  return q === 0 ? sinK(r) : q === 1 ? cosK(r) : q === 2 ? -sinK(r) : -cosK(r);
}
export function cos(x) {
  const [r, q] = reduce(x);
  return q === 0 ? cosK(r) : q === 1 ? -sinK(r) : q === 2 ? -cosK(r) : sinK(r);
}

/** atan(t) para t ≥ 0: duas bissecções do ângulo (t → t/(1+√(1+t²))) e Taylor em |t| ≤ 0,2. */
function atanPos(t) {
  if (t > 1) return Math.PI / 2 - atanPos(1 / t);
  const t1 = t / (1 + Math.sqrt(1 + t * t)), t2 = t1 / (1 + Math.sqrt(1 + t1 * t1)), u = t2 * t2;
  let term = t2, sum = t2;
  for (let n = 1; n <= 14; n++) { term = -term * u; sum += term / (2 * n + 1); }
  return 4 * sum;
}
export function atan2(y, x) {
  if (x === 0 && y === 0) return 0;
  const ax = Math.abs(x), ay = Math.abs(y);
  let a = ax >= ay ? atanPos(ay / ax) : Math.PI / 2 - atanPos(ax / ay);
  if (x < 0) a = Math.PI - a;
  return y < 0 ? -a : a;
}

/** ln(x) para x > 0 finito: x = m·2^e (escala exacta), ln m = 2·atanh((m−1)/(m+1)). */
export function log(x) {
  if (!(x > 0) || !Number.isFinite(x)) throw new RangeError(`pmath.log: ${x}`);
  let m = x, e = 0;
  while (m >= 2) { m /= 2; e++; }
  while (m < 1) { m *= 2; e--; }
  if (m > 1.4142135623730951) { m /= 2; e++; }
  const s = (m - 1) / (m + 1), s2 = s * s;
  let term = s, sum = s;
  for (let n = 1; n <= 14; n++) { term *= s2; sum += term / (2 * n + 1); }
  return e * LN2 + 2 * sum;
}
/** e^z: z = k·ln2 + r, série de Taylor em |r| ≤ 0,35 e escala exacta por 2^k. */
export function exp(z) {
  if (!(z < 700)) throw new RangeError(`pmath.exp: ${z}`);
  if (z < -700) return 0;   // underflow para 0 (valores ≤ 1e-304 são irrelevantes aqui)
  const k = Math.round(z / LN2), r = (z - k * LN2_HI) - k * LN2_LO;
  let term = 1, sum = 1;
  for (let n = 1; n <= 20; n++) { term = term * r / n; sum += term; }
  for (let i = 0; i < Math.abs(k); i++) sum = k > 0 ? sum * 2 : sum / 2;
  return sum;
}
/** x^y para x ≥ 0 (y real): 0^y = 0 para y > 0. */
export function pow(x, y) {
  if (x === 0) { if (y > 0) return 0; throw new RangeError('pmath.pow: 0^y com y ≤ 0'); }
  if (!(x > 0)) throw new RangeError(`pmath.pow: base negativa (${x})`);
  return exp(y * log(x));
}
/** Norma euclidiana (ordem de soma fixa; sem a heurística de escala do Math.hypot). */
export function hypot(...v) {
  let s = 0;
  for (const a of v) s += a * a;
  return Math.sqrt(s);
}
/** asin(s) para |s| ≤ 1, via atan2 (sem Math.asin). */
export function asin(s) {
  return atan2(s, Math.sqrt(1 - s * s));
}
/** x², x³ e x^1,5 exactos (só multiplicações e sqrt), em vez de `**`. */
export const sq = x => x * x;
export const cube = x => x * x * x;
export const pow15 = x => x * Math.sqrt(x);
