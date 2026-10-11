// Carroças: carrinho de mão de duas rodas e carroça de cavalo (só o veículo, silhueta de campo polaco).
// Eixos: rodas ao longo de X; a frente (varais/timão) aponta para −Z.
import { mix } from './mesh.mjs';
import { P } from './palette.mjs';
import { rng } from './util.mjs';

/** Roda de raios de madeira com aro de ferro, no plano YZ, centro (x, cy, cz). */
function wheel(m, { x, cy, cz = 0, r, spokes, segs, hi, seed, width = 0.05, tyre = true }) {
  const rim = [];
  for (let i = 0; i < segs; i++) { const a = (i / segs) * Math.PI * 2; rim.push([x, cy + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  m.tube('wood', rim, { r: width / 2, sides: hi ? 4 : 3, closed: true, color: P.woodOld, variance: 0.14, seed });
  if (hi && tyre) m.tube('iron_cast', rim.map(p => [p[0], cy + (p[1] - cy) * (1 + 0.012 / r), cz + (p[2] - cz) * (1 + 0.012 / r)]), { r: width / 2 + 0.006, sides: 3, closed: true, color: mix(P.steelDark, P.rust, 0.35), variance: 0.2, seed: seed + 1 });
  if (hi) {
    m.cyl('wood', { r0: 0.055, r1: 0.05, h: 0.13, seg: tyre ? 8 : 6, at: [x - 0.065, cy, cz], rot: [0, 0, -Math.PI / 2], caps: 'both', color: P.woodDark, seed: seed + 2 });
  }
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * (hi ? 2 : 1) + 0.2, hubR = 0.06, len = r - hubR;
    if (hi) m.box('wood', { size: [0.03, len, 0.03], at: [x, cy + Math.cos(a) * (hubR + len / 2), cz + Math.sin(a) * (hubR + len / 2)], rot: [a, 0, 0], color: P.woodMid, grain: 1, seed: seed + 5 + i, variance: 0.12 });
    else m.box('wood', { size: [0.03, 2 * r - 0.03, 0.03], at: [x, cy, cz], rot: [a, 0, 0], skip: ['+y', '-y', '+z', '-z'], color: P.woodMid, grain: 1, seed: seed + 5 + i, variance: 0.12 });
  }
}

/** Carrinho de mão de estação (duas rodas, 0,95 m de aro), plataforma de tábuas, varais para −Z. Comprimento ≈ 2,5 m. */
export function handCart(m, lod) {
  const hi = lod === 0, r = rng(101), cy = 0.485, bedY = 0.62;
  for (const s of [-1, 1]) wheel(m, { x: s * 0.52, cy, r: 0.45, spokes: hi ? 8 : 2, segs: hi ? 12 : 8, hi, seed: 10 + s });
  m.cyl('iron_cast', { r0: 0.022, h: 1.16, seg: hi ? 8 : 5, at: [-0.58, cy, 0], rot: [0, 0, -Math.PI / 2], caps: 'none', color: P.steelDark, seed: 3 });
  // plataforma e taipais
  const bz0 = -0.2, bz1 = 1.15, bl = bz1 - bz0, bc = (bz0 + bz1) / 2;
  m.box('wood', { size: [0.92, 0.05, bl], at: [0, bedY, bc], color: P.woodMid, subdiv: hi ? [1, 1, 4] : 1, grain: 2, bump: hi ? 0.002 : 0, seed: 4 });
  for (const s of [-1, 1]) {
    m.box('wood', { size: [0.04, 0.22, bl], at: [s * 0.45, bedY + 0.135, bc], color: mix(P.woodNew, P.woodGrey, 0.3), subdiv: hi ? [1, 1, 3] : 1, grain: 2, seed: 5 + s });
  }
  m.box('wood', { size: [0.92, 0.22, 0.04], at: [0, bedY + 0.135, bz1 - 0.02], color: P.woodOld, subdiv: hi ? [2, 1, 1] : 1, seed: 7 });
  m.box('wood', { size: [0.5, 0.045, 0.1], at: [0, bedY - 0.05, bc], color: P.woodDark, seed: 8 });
  // varais com travessa de empurrar e pé de apoio
  for (const s of [-1, 1]) m.box('wood', { size: [0.05, 0.05, 1.5], at: [s * 0.33, bedY - 0.02 + (hi ? 0.0 : 0), bz0 - 0.55], rot: [-0.06, 0, 0], color: P.woodNew, grain: 2, subdiv: hi ? [1, 1, 3] : 1, seed: 9 + s });
  m.box('wood', { size: [0.8, 0.045, 0.045], at: [0, bedY + 0.0 - 0.02 + 0.125, bz0 - 1.3], rot: [0, 0, 0], color: P.woodOld, grain: 0, subdiv: hi ? [3, 1, 1] : 1, seed: 12 });
  if (hi) {
    m.box('wood', { size: [0.05, 0.4, 0.05], at: [0, 0.2, bz0 - 0.15], rot: [0.12, 0, 0], color: P.woodDark, seed: 13 });
    // carga: dois sacos e uma corda
    for (const [x, z, rot] of [[-0.15, 0.55, 0.3], [0.2, 0.2, -0.2]]) m.blob('cloth', { rad: [0.3, 0.1, 0.18], at: [x, bedY + 0.16, z], rot: [0, rot, 0], nu: 8, nv: 4, e: [0.7, 0.8], color: mix(P.burlap, P.burlapDark, r()), variance: 0.15, seed: 20 + Math.floor(z * 10) });
  }
}

/** Carroça de cavalo de escada (wóz drabiniasty), ≈ 4,2 m de comprimento com timão; rodas traseiras maiores. */
export function horseCart(m, lod) {
  const hi = lod === 0, r = rng(111);
  const bedY = 0.8, bz0 = -0.5, bz1 = 1.7, bc = (bz0 + bz1) / 2, bl = bz1 - bz0, bw = 1.1;
  // rodas: dianteiras (z=-0.1) mais pequenas, traseiras (z=1.25) maiores
  for (const s of [-1, 1]) {
    wheel(m, { x: s * 0.66, cy: 0.445, cz: -0.15, r: 0.42, spokes: hi ? 6 : 2, segs: hi ? 10 : 6, hi, seed: 20 + s, tyre: false });
    wheel(m, { x: s * 0.66, cy: 0.575, cz: 1.25, r: 0.55, spokes: hi ? 6 : 2, segs: hi ? 12 : 6, hi, seed: 30 + s, tyre: false });
  }
  for (const [z, cy] of [[-0.15, 0.445], [1.25, 0.575]]) m.cyl('wood', { r0: 0.04, h: 1.44, seg: hi ? 6 : 4, at: [-0.72, cy, z], rot: [0, 0, -Math.PI / 2], caps: 'none', color: P.woodDark, seed: 5, flat: true });
  // chassis e plataforma
  if (hi) for (const s of [-1, 1]) m.box('wood', { size: [0.09, 0.1, bl + 0.2], at: [s * 0.5, bedY - 0.1, bc], color: P.woodOld, subdiv: hi ? [1, 1, 4] : 1, grain: 2, seed: 6 + s });
  m.box('wood', { size: [bw, 0.04, bl], at: [0, bedY - 0.02, bc], color: P.woodMid, subdiv: hi ? [1, 1, 5] : 1, grain: 2, bump: hi ? 0.002 : 0, seed: 8 });
  // escadas laterais (travessa superior, inferior e prumos)
  const nst = hi ? 6 : 3;
  for (const s of [-1, 1]) {
    for (const y of hi ? [bedY + 0.05, bedY + 0.55] : [bedY + 0.55]) m.box('wood', { size: [0.05, 0.05, bl + 0.1], at: [s * (bw / 2 + 0.01), y, bc], color: P.woodNew, subdiv: hi ? [1, 1, 4] : 1, grain: 2, seed: 10 + s });
    for (let k = 0; hi && k < nst; k++) {
      const z = bz0 + 0.1 + k * (bl - 0.2) / (nst - 1);
      m.box('wood', { size: [0.04, 0.55, 0.04], at: [s * (bw / 2 + 0.01), bedY + 0.3, z], color: mix(P.woodMid, P.woodGrey, r() * 0.6), grain: 1, seed: 14 + k, variance: 0.12 });
    }
  }
  if (hi) m.box('wood', { size: [bw, 0.45, 0.04], at: [0, bedY + 0.25, bz1 + 0.04], color: P.woodOld, subdiv: hi ? [3, 1, 1] : 1, grain: 0, seed: 40 });
  // banco do cocheiro e tábua da frente
  m.box('wood', { size: [bw - 0.1, 0.045, 0.3], at: [0, bedY + 0.52, bz0 + 0.35], color: P.woodNew, grain: 0, seed: 41, subdiv: hi ? [3, 1, 1] : 1 });
  m.box('wood', { size: [bw, 0.35, 0.04], at: [0, bedY + 0.2, bz0 - 0.02], color: P.woodOld, seed: 42 });
  // timão e balança (para −Z)
  for (const s of [-1, 1]) m.box('wood', { size: [0.07, 0.07, 2.4], at: [s * 0.25, bedY - 0.28, bz0 - 1.0], rot: [0.08, s * 0.02, 0], color: P.woodNew, grain: 2, subdiv: hi ? [1, 1, 4] : 1, seed: 43 + s });
  if (hi) m.box('wood', { size: [1.1, 0.06, 0.06], at: [0, bedY - 0.37, bz0 - 2.22], color: P.woodOld, grain: 0, subdiv: hi ? [3, 1, 1] : 1, seed: 45 });
  if (hi) {
    // palha caída na plataforma e saco
    m.box('earth', { size: [0.9, 0.12, 0.8], at: [0.0, bedY + 0.06, 0.95], rot: [0, 0.1, 0], color: P.hay, subdiv: [3, 1, 3], bump: 0.025, variance: 0.25, seed: 50 });
    m.blob('cloth', { rad: [0.3, 0.11, 0.18], at: [-0.2, bedY + 0.14, 0.05], rot: [0, 0.3, 0], nu: 8, nv: 4, e: [0.7, 0.8], color: P.burlapDark, variance: 0.15, seed: 51 });
  }
}
