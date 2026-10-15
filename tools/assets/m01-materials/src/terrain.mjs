// Monta os PNG do terreno M01 (família "terreno" do T09): 4 texturas de detalhe/normal com camadas empacotadas em canais RGBA.
//   terrain-detail-a  (tile 4 m)   R campo lavrado · G prado · B lama · A margem molhada      (luma 0..1, média 0.5; o shader multiplica por 2)
//   terrain-detail-b  (tile 1,6 m) R balastro · G caminho batido · B palha (cobertura) · A fuligem (cobertura)
//   terrain-normal-a  (tile 4 m)   RG normal xy do campo · BA normal xy da lama (também usadas pelo prado e pela margem)
//   terrain-normal-b  (tile 1,6 m) RG normal xy do caminho · BA normal xy do balastro
// A cor vem dos uniformes de tinta do shader (dados históricos), não do PNG: a luma só dá o detalhe.
import { clamp } from './noise.mjs';
import { fieldLayer, meadowLayer, mudLayer, trackLayer, ballastLayer, wetbankLayer, litterLayers } from './layers.mjs';

/** Metros por tile no mundo (o shader usa os mesmos valores, ver src/render/m01-terrain-material.js). */
export const TILE_METRES = Object.freeze({ detailA: 4, detailB: 1.6, normalA: 4, normalB: 1.6 });
export const SIZES = Object.freeze({ high: Object.freeze({ a: 1024, b: 512 }), low: Object.freeze({ a: 512, b: 512 }) });

/** Afina média e desvio da luma para o alvo, de modo a que as camadas tenham contraste comparável. */
function levels(luma, mean = 0.5, std = 0.16) {
  let s = 0, s2 = 0; for (let i = 0; i < luma.length; i++) { s += luma[i]; s2 += luma[i] * luma[i]; }
  const m = s / luma.length, sd = Math.sqrt(Math.max(1e-9, s2 / luma.length - m * m)), g = std / sd, out = new Float32Array(luma.length);
  for (let i = 0; i < luma.length; i++) out[i] = clamp(mean + (luma[i] - m) * g);
  return out;
}
/** Gradiente central periódico da altura, escalado para que a inclinação média absoluta seja `target`. Devolve nx, ny em [-1,1] já normalizados. */
function normalsXY(height, N, target) {
  const gx = new Float32Array(N * N), gy = new Float32Array(N * N); let sum = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, dx = height[y * N + ((x + 1) % N)] - height[y * N + ((x + N - 1) % N)], dy = height[((y + 1) % N) * N + x] - height[((y + N - 1) % N) * N + x];
    gx[i] = dx; gy[i] = dy; sum += Math.sqrt(dx * dx + dy * dy);
  }
  const k = target / Math.max(1e-6, sum / (N * N)), nx = new Float32Array(N * N), ny = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) {
    const a = -gx[i] * k, b = -gy[i] * k, m = Math.sqrt(a * a + b * b + 1);   // v cresce com a linha (flipY=false): d/dv = d/dy
    nx[i] = a / m; ny[i] = b / m;
  }
  return { nx, ny };
}
const byte = (v) => Math.round(clamp(v) * 255);
const enc = (n) => byte(n * 0.5 + 0.5);

function boxDown(src, N) {   // RGBA N×N → N/2, média 2×2 (mantém tileabilidade)
  const M = N / 2, out = new Uint8Array(M * M * 4);
  for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) for (let c = 0; c < 4; c++) {
    const a = ((2 * y) * N + 2 * x) * 4 + c, b = a + 4, d = a + N * 4, e = d + 4;
    out[(y * M + x) * 4 + c] = (src[a] + src[b] + src[d] + src[e] + 2) >> 2;
  }
  return out;
}

/** @returns {{file:string, width:number, height:number, pixels:Uint8Array, channels:string[], tileMetres:number, role:string}[]} */
export function buildTerrainTextures() {
  const A = SIZES.high.a, B = SIZES.high.b;
  const field = fieldLayer(A), meadow = meadowLayer(A), mud = mudLayer(A), wet = wetbankLayer(A);
  const ballast = ballastLayer(B), track = trackLayer(B), litter = litterLayers(B);
  const detailA = new Uint8Array(A * A * 4), L = [levels(field.luma), levels(meadow.luma, 0.5, 0.2), levels(mud.luma, 0.5, 0.2), levels(wet.luma, 0.5, 0.17)];
  for (let i = 0; i < A * A; i++) for (let c = 0; c < 4; c++) detailA[i * 4 + c] = byte(L[c][i]);
  const detailB = new Uint8Array(B * B * 4), LB = [levels(ballast.luma, 0.5, 0.2), levels(track.luma, 0.5, 0.16)];
  for (let i = 0; i < B * B; i++) { detailB[i * 4] = byte(LB[0][i]); detailB[i * 4 + 1] = byte(LB[1][i]); detailB[i * 4 + 2] = byte(litter.straw[i]); detailB[i * 4 + 3] = byte(litter.soot[i]); }
  const nf = normalsXY(field.height, A, 0.38), nm = normalsXY(mud.height, A, 0.5), normalA = new Uint8Array(A * A * 4);
  for (let i = 0; i < A * A; i++) { normalA[i * 4] = enc(nf.nx[i]); normalA[i * 4 + 1] = enc(nf.ny[i]); normalA[i * 4 + 2] = enc(nm.nx[i]); normalA[i * 4 + 3] = enc(nm.ny[i]); }
  const nt = normalsXY(track.height, B, 0.42), nb = normalsXY(ballast.height, B, 0.85), normalB = new Uint8Array(B * B * 4);
  for (let i = 0; i < B * B; i++) { normalB[i * 4] = enc(nt.nx[i]); normalB[i * 4 + 1] = enc(nt.ny[i]); normalB[i * 4 + 2] = enc(nb.nx[i]); normalB[i * 4 + 3] = enc(nb.ny[i]); }
  const chA = ['field', 'meadow', 'mud', 'wetbank'], chB = ['ballast', 'track', 'straw', 'soot'];
  return [
    { file: 'terrain-detail-a-1024.png', width: A, height: A, pixels: detailA, channels: chA, role: 'detail-a', tileMetres: TILE_METRES.detailA },
    { file: 'terrain-detail-a-512.png', width: A / 2, height: A / 2, pixels: boxDown(detailA, A), channels: chA, role: 'detail-a', tileMetres: TILE_METRES.detailA },
    { file: 'terrain-detail-b-512.png', width: B, height: B, pixels: detailB, channels: chB, role: 'detail-b', tileMetres: TILE_METRES.detailB },
    { file: 'terrain-normal-a-1024.png', width: A, height: A, pixels: normalA, channels: ['field.nx', 'field.ny', 'mud.nx', 'mud.ny'], role: 'normal-a', tileMetres: TILE_METRES.normalA },
    { file: 'terrain-normal-a-512.png', width: A / 2, height: A / 2, pixels: boxDown(normalA, A), channels: ['field.nx', 'field.ny', 'mud.nx', 'mud.ny'], role: 'normal-a', tileMetres: TILE_METRES.normalA },
    { file: 'terrain-normal-b-512.png', width: B, height: B, pixels: normalB, channels: ['track.nx', 'track.ny', 'ballast.nx', 'ballast.ny'], role: 'normal-b', tileMetres: TILE_METRES.normalB },
  ];
}
