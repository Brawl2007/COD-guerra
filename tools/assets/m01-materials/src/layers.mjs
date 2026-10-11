// Camadas de solo do terreno M01 (1939), pintura procedural original. Cada camada devolve { luma, height } em Float32Array N×N,
// tileáveis. Nada vem de Call of Duty nem de fotos: ruído, Worley e carimbos com sementes fixas.
import { Rng, fbm, vnoise, worley, smoothstep, clamp, mix, hash } from './noise.mjs';
const hash2 = (a, b, s) => hash(Math.floor(a * 65536), Math.floor(b * 65536), s);

const field = (N) => ({ luma: new Float32Array(N * N), height: new Float32Array(N * N) });
const wrap = (v, N) => ((v % N) + N) % N;

/** Cúpula (seixo/torrão) com sombra do lado oposto à luz (luz de cima-esquerda). Altura = max, luma = mistura. */
function dome(L, H, N, cx, cy, r, tone, hAmp, cover = 1) {
  const R = Math.ceil(r) + 1;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const d2 = (dx * dx + dy * dy) / (r * r); if (d2 >= 1) continue;
    const i = wrap(Math.round(cy) + dy, N) * N + wrap(Math.round(cx) + dx, N), h = Math.sqrt(1 - d2) * hAmp;
    const lit = clamp(0.5 - (dx + dy) / (2 * r) * 0.35, 0, 1);
    if (h >= H[i] * 0.6) { L[i] = mix(L[i], tone * (0.55 + 0.7 * lit), cover * smoothstep(1, 0.8, d2)); }
    if (h > H[i]) H[i] = mix(H[i], h, cover);
  }
}
/** Folha de erva / palha: traço curvo estreito com ponta afilada. */
function stroke(L, H, N, x, y, dx, dy, len, bend, value, hAmp) {
  const steps = Math.ceil(len * 2);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps, k = t * len, px = x + dx * k - dy * bend * t * t * len, py = y + dy * k + dx * bend * t * t * len;
    const i = wrap(Math.round(py), N) * N + wrap(Math.round(px), N), taper = 1 - t * 0.55;
    if (value * taper > L[i]) { L[i] = value * taper; H[i] = Math.max(H[i], hAmp * taper); }
  }
}
const unitVector = (rng) => { for (;;) { const a = rng.range(-1, 1), b = rng.range(-1, 1), m = a * a + b * b; if (m > 0.04 && m <= 1) { const s = Math.sqrt(m); return [a / s, b / s]; } } };
const scaleCount = (n, N) => Math.max(1, Math.round(n * (N / 1024) * (N / 1024)));
const tmp = { f1: 0, f2: 0, id: 0, id2: 0 }, tmp2 = { f1: 0, f2: 0, id: 0, id2: 0 };

/** Terra lavrada e seca: torrões, fendas, seixos. */
export function fieldLayer(N) {
  const { luma, height } = field(N), rng = new Rng(1101);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = (x + 0.5) / N, v = (y + 0.5) / N, i = y * N + x;
    const wu = u + 0.045 * (fbm(u, v, 4, 3, 201) - 0.5), wv = v + 0.045 * (fbm(u, v, 4, 3, 202) - 0.5);
    const big = fbm(u, v, 5, 5, 11), w = worley(wu, wv, 14, 21, tmp), w2 = worley(wv, wu, 31, 25, tmp2);
    const clod = Math.sqrt(Math.max(0, 1 - (w.f1 / 0.75) ** 2)) * (0.3 + 0.7 * w.id), clod2 = Math.sqrt(Math.max(0, 1 - (w2.f1 / 0.7) ** 2)) * (0.3 + 0.7 * w2.id);
    const gate = smoothstep(0.62, 0.8, fbm(u, v, 3, 3, 203)), crack = smoothstep(0.06, 0.0, w.f2 - w.f1) * gate, fine = fbm(u, v, 96, 2, 31);
    height[i] = 0.34 * big + 0.14 * clod + 0.26 * clod2 + 0.18 * fine - crack * 0.12;
    luma[i] = 0.30 + 0.46 * big + 0.06 * clod + 0.16 * clod2 + 0.18 * fine + 0.03 * (w.id - 0.5) - crack * 0.14;
  }
  for (let k = 0; k < scaleCount(150, N); k++) dome(luma, height, N, rng.range(0, N), rng.range(0, N), rng.range(2.2, 5.5) * N / 1024, rng.range(0.55, 0.95), rng.range(0.55, 0.95));
  return { luma, height };
}

/** Prado seco de fim de verão: folhas de erva sobre tufos. */
export function meadowLayer(N) {
  const { luma, height } = field(N), rng = new Rng(2202);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = (x + 0.5) / N, v = (y + 0.5) / N, i = y * N + x, tuft = fbm(u, v, 9, 4, 41), under = fbm(u, v, 48, 2, 51);
    height[i] = 0.12 + 0.3 * tuft; luma[i] = 0.10 + 0.20 * tuft + 0.08 * under;
  }
  const scale = N / 1024;
  for (let k = 0; k < scaleCount(52000, N); k++) {
    const [dx, dy] = unitVector(rng), x = rng.range(0, N), y = rng.range(0, N), tone = rng.range(0.38, 0.95), len = rng.range(7, 20) * scale;
    stroke(luma, height, N, x, y, dx, dy, len, rng.range(-0.35, 0.35), tone, rng.range(0.4, 1));
  }
  return { luma, height };
}

/** Lama revolvida: ondulação, cristas, poças planas e escuras. */
export function mudLayer(N) {
  const { luma, height } = field(N), rng = new Rng(3303);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = (x + 0.5) / N, v = (y + 0.5) / N, i = y * N + x;
    const a = fbm(u, v, 3, 5, 61), b = fbm(u, v, 7, 4, 71), ridge = 1 - Math.abs(2 * b - 1), fine = fbm(u, v, 80, 3, 81);
    const dry = smoothstep(0.30, 0.42, a), h = 0.5 * a + 0.38 * ridge * ridge + 0.12 * fine;
    height[i] = mix(0.16, h, dry);
    luma[i] = mix(0.16 + 0.05 * fine, 0.24 + 0.55 * h, dry);
  }
  for (let k = 0; k < scaleCount(40, N); k++) dome(luma, height, N, rng.range(0, N), rng.range(0, N), rng.range(2, 4.5) * N / 1024, rng.range(0.45, 0.8), rng.range(0.4, 0.8));
  return { luma, height };
}

/** Terra batida do caminho: compacta, fendas finas, cascalho miúdo. */
export function trackLayer(N) {
  const { luma, height } = field(N), rng = new Rng(4404);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = (x + 0.5) / N, v = (y + 0.5) / N, i = y * N + x;
    const wu = u + 0.05 * (fbm(u, v, 5, 3, 211) - 0.5), wv = v + 0.05 * (fbm(u, v, 5, 3, 212) - 0.5);
    const a = fbm(u, v, 6, 5, 91), b = fbm(u, v, 40, 3, 101), c = fbm(u, v, 110, 2, 102), w = worley(wu, wv, 17, 111, tmp);
    height[i] = 0.5 * a + 0.3 * b + 0.12 * c + 0.14 * w.id * (1 - w.f1);
    luma[i] = 0.34 + 0.36 * a + 0.22 * b + 0.10 * c + 0.07 * (w.id - 0.5);
  }
  for (let k = 0; k < 130; k++) dome(luma, height, N, rng.range(0, N), rng.range(0, N), rng.range(1.8, 5), rng.range(0.6, 1), rng.range(0.5, 0.9));
  return { luma, height };
}

/** Balastro: pedra britada angulosa com vazios escuros. */
export function ballastLayer(N) {
  const { luma, height } = field(N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = (x + 0.5) / N, v = (y + 0.5) / N, i = y * N + x;
    const wu = u + 0.03 * (fbm(u, v, 6, 3, 221) - 0.5), wv = v + 0.03 * (fbm(u, v, 6, 3, 222) - 0.5), w = worley(wu, wv, 34, 121, tmp), w2 = worley(wv, wu, 19, 125, tmp2);
    // Pedra britada: cada célula é uma faceta inclinada (normal própria), arestas escuras estreitas, pedras maiores esparsas por cima.
    const ga = hash2(w.id, w.id2, 1) - 0.5, gb = hash2(w.id2, w.id, 2) - 0.5, facet = (w.dx * ga + w.dy * gb) * 2.2;
    const big = smoothstep(0.62, 0.8, w2.id) * smoothstep(0.0, 0.1, w2.f2 - w2.f1) * (0.4 + 0.6 * w2.id2);
    const d = Math.sqrt(Math.max(0, 1 - (w.f1 / 0.9) ** 2)), edge = smoothstep(0.0, 0.1, w.f2 - w.f1), grain = vnoise(u, v, 200, 200, 131);
    height[i] = (0.3 + 0.35 * w.id + facet * 0.8 + 0.12 * d) * (0.5 + 0.5 * edge) + 0.3 * big;
    luma[i] = ((0.25 + 0.5 * w.id + facet * 0.8) * (0.55 + 0.45 * d) * (0.6 + 0.4 * edge) + 0.1 * grain) * (1 - 0.25 * big) + 0.12 * big * (w2.id - 0.4);
  }
  return { luma, height };
}

/** Margem molhada: limo escuro, sulcos do rio, seixos arredondados. */
export function wetbankLayer(N) {
  const { luma, height } = field(N), rng = new Rng(5505);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = (x + 0.5) / N, v = (y + 0.5) / N, i = y * N + x;
    const a = fbm(u, v, 4, 5, 141), ripple = vnoise(u, v, 6, 40, 151) * 0.5 + vnoise(u, v, 24, 24, 152) * 0.5, fine = fbm(u, v, 90, 2, 161);
    height[i] = 0.6 * a + 0.3 * ripple + 0.1 * fine; luma[i] = 0.22 + 0.4 * a + 0.22 * ripple + 0.08 * fine;
  }
  for (let k = 0; k < scaleCount(70, N); k++) dome(luma, height, N, rng.range(0, N), rng.range(0, N), rng.range(2.5, 6) * N / 1024, rng.range(0.4, 0.75), rng.range(0.5, 0.9));
  return { luma, height };
}

/** Detritos de guerra, em dois mapas de cobertura 0..1: palha clara e fuligem/carvão. */
export function litterLayers(N) {
  const straw = new Float32Array(N * N), soot = new Float32Array(N * N), sh = new Float32Array(N * N), rng = new Rng(6606), scale = N / 512;
  for (let k = 0; k < 900; k++) {
    const [dx, dy] = unitVector(rng);
    stroke(straw, sh, N, rng.range(0, N), rng.range(0, N), dx, dy, rng.range(8, 26) * scale, rng.range(-0.3, 0.3), rng.range(0.55, 1), 0.5);
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = (x + 0.5) / N, v = (y + 0.5) / N, gate = smoothstep(0.52, 0.7, fbm(u, v, 5, 3, 171)), spec = vnoise(u, v, 150, 150, 181);
    soot[y * N + x] = gate * smoothstep(0.55, 0.85, spec);
  }
  for (let k = 0; k < 260; k++) dome(soot, sh, N, rng.range(0, N), rng.range(0, N), rng.range(0.9, 2.4) * scale, 1, 0.5);
  return { straw, soot };
}
