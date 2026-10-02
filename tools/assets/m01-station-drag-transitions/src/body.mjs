// Volumes aproximados do corpo (cápsulas entre ossos) para medir contactos e interpenetração entre médico e paciente,
// e a folga ao chão. Raios estimados para o soldado provisório (fardamento incluído); não substituem a malha.
import { qrot } from './fk.mjs';

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const CAPSULES = [
  ['pelvis', 'hips', 'spine_01', 0.13], ['belly', 'spine_01', 'spine_02', 0.13], ['chest', 'spine_02', 'spine_03', 0.13], ['upper_chest', 'spine_03', 'neck', 0.1],
  ['neck', 'neck', 'head', 0.05], ['skull', 'head', 'head+', 0.1],
  ...['l', 'r'].flatMap(s => [
    [`upperarm_${s}`, `upperarm_${s}`, `lowerarm_${s}`, 0.05], [`forearm_${s}`, `lowerarm_${s}`, `hand_${s}`, 0.04], [`hand_${s}`, `hand_${s}`, `middle_02_${s}`, 0.03],
    [`thigh_${s}`, `thigh_${s}`, `calf_${s}`, 0.075], [`shin_${s}`, `calf_${s}`, `foot_${s}`, 0.055], [`foot_${s}`, `foot_${s}`, `ball_${s}`, 0.045],
  ]),
];
// Centro do crânio: 9 cm acima do osso `head` no referencial da cabeça.
const point = (W, n) => n === 'head+' ? add(W.head.p, qrot(W.head.r, [0, 0.09, 0.01])) : W[n].p;

/** Pontos mais próximos entre os segmentos [p0,p1] e [q0,q1] e a distância entre eles. */
export function segClosest(p0, p1, q0, q1) {
  const d1 = sub(p1, p0), d2 = sub(q1, q0), r = sub(p0, q0), a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r);
  let s, t;
  const c = dot(d1, r), b = dot(d1, d2), den = a * e - b * b;
  s = den > 1e-12 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0;
  t = e > 1e-12 ? (b * s + f) / e : 0;
  if (t < 0) { t = 0; s = a > 1e-12 ? Math.min(1, Math.max(0, -c / a)) : 0; } else if (t > 1) { t = 1; s = a > 1e-12 ? Math.min(1, Math.max(0, (b - c) / a)) : 0; }
  const cp = add(p0, d1.map(x => x * s)), cq = add(q0, d2.map(x => x * t));
  return { d: Math.hypot(...sub(cp, cq)), cp, cq };
}
export const segDist = (p0, p1, q0, q1) => segClosest(p0, p1, q0, q1).d;

export const capsules = W => CAPSULES.map(([name, a, b, r]) => ({ name, a: point(W, a), b: point(W, b), r }));

/** Folgas entre dois corpos: lista ordenada {a, b, gap} (gap < 0 = sobreposição das cápsulas). */
export function gaps(WA, WB) {
  const A = capsules(WA), B = capsules(WB), out = [];
  for (const x of A) for (const y of B) out.push({ a: x.name, b: y.name, gap: segDist(x.a, x.b, y.a, y.b) - x.r - y.r });
  return out.sort((u, v) => u.gap - v.gap);
}

/**
 * Empurrão que afasta as cápsulas `names` de WA de todas as cápsulas de WB até à folga `min` (soma dos défices ao longo
 * da direcção de separação; vector nulo se não há sobreposição).
 */
export function push(WA, WB, names, min = 0) {
  const A = capsules(WA).filter(c => names.includes(c.name)), B = capsules(WB), out = [0, 0, 0];
  for (const x of A) for (const y of B) {
    const c = segClosest(x.a, x.b, y.a, y.b), deficit = min - (c.d - x.r - y.r);
    if (deficit <= 0 || c.d < 1e-9) continue;
    const n = sub(c.cp, c.cq).map(v => v / c.d);
    for (let k = 0; k < 3; k++) out[k] = Math.abs(n[k] * deficit) > Math.abs(out[k]) ? n[k] * deficit : out[k];
  }
  return out;
}

/** Folga mínima ao chão (y = 0) das cápsulas de um corpo. */
export const ground = W => Math.min(...capsules(W).map(c => Math.min(c.a[1], c.b[1]) - c.r));
