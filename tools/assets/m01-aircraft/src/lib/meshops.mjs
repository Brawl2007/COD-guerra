// Utilidades vectoriais e de malha (subconjunto de tools/assets/m01-soldiers/src/meshops.mjs e garments.mjs, sem pesos).
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

/** Normais suaves ponderadas por área (sem soldadura: as costuras de UV ficam com normais próprias). */
export function computeNormals(mesh) {
  const n = mesh.positions.length / 3, acc = new Float64Array(n * 3), P = mesh.positions, I = mesh.indices;
  for (let t = 0; t < I.length; t += 3) {
    const [a, b, c] = [I[t], I[t + 1], I[t + 2]];
    const pa = [P[a * 3], P[a * 3 + 1], P[a * 3 + 2]], fn = v3.cross(v3.sub([P[b * 3], P[b * 3 + 1], P[b * 3 + 2]], pa), v3.sub([P[c * 3], P[c * 3 + 1], P[c * 3 + 2]], pa));
    for (const v of [a, b, c]) { acc[v * 3] += fn[0]; acc[v * 3 + 1] += fn[1]; acc[v * 3 + 2] += fn[2]; }
  }
  mesh.normals = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const l = Math.hypot(acc[i * 3], acc[i * 3 + 1], acc[i * 3 + 2]) || 1; for (let k = 0; k < 3; k++) mesh.normals[i * 3 + k] = acc[i * 3 + k] / l; }
  return mesh;
}

/** Orienta os triângulos para fora em relação a um centro (ponto ou função do ponto). */
export function orientOutward(part, center = null) {
  const P = part.positions, I = part.indices;
  let c = center;
  if (!c) { c = [0, 0, 0]; for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) c[k] += P[i + k] * 3 / P.length; }
  let score = 0;
  for (let t = 0; t < I.length; t += 3) {
    const a = [P[I[t] * 3], P[I[t] * 3 + 1], P[I[t] * 3 + 2]], b = [P[I[t + 1] * 3], P[I[t + 1] * 3 + 1], P[I[t + 1] * 3 + 2]], d = [P[I[t + 2] * 3], P[I[t + 2] * 3 + 1], P[I[t + 2] * 3 + 2]];
    const m = v3.mul(v3.add(v3.add(a, b), d), 1 / 3);
    score += v3.dot(v3.cross(v3.sub(b, a), v3.sub(d, a)), v3.sub(m, typeof c === 'function' ? c(m) : c));
  }
  if (score < 0) for (let t = 0; t < I.length; t += 3) [I[t + 1], I[t + 2]] = [I[t + 2], I[t + 1]];
  return part;
}
