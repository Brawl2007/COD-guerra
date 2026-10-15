// Props de linha e cerca: poste de telégrafo com isoladores, vão de fio, cercas e lanterna ferroviária.
import { mix, clamp } from './mesh.mjs';
import { P } from './palette.mjs';
import { rng } from './util.mjs';
import * as pm from './pmath.mjs';

export const POLE_HEIGHT = 7.0;
export const POLE_INSULATORS = [[0.62, 6.74], [0.25, 6.74], [-0.25, 6.74], [-0.62, 6.74], [0.4, 6.22], [-0.4, 6.22]];  // [z, y do topo do braço]
const INS_TOP = 0.11;   // altura do topo do isolador acima do braço
export const wireAnchors = () => POLE_INSULATORS.map(([z, y]) => [0, y + INS_TOP, z]);

/** Poste de telégrafo de madeira, 7,0 m, dois braços e seis isoladores de porcelana (fios ao longo de X). */
export function telegraphPole(m, lod) {
  const hi = lod === 0, H = POLE_HEIGHT;
  m.cyl('wood', {
    r0: 0.125, r1: 0.085, h: H, seg: hi ? 10 : 6, rings: hi ? 4 : 1, caps: 'top', flat: !hi,
    colorFn: (p, n) => {
      const base = p[1] < 2.2 ? mix(P.creosote, P.woodOld, p[1] / 2.2 * 0.5) : P.woodGrey;
      return m.tint(base, p, { variance: 0.14, grain: 1, freq: 5, seed: 3 });
    },
  });
  // braços (ao longo de Z) com parafusos e escoras
  m.box('wood', { size: [0.1, 0.1, 1.6], at: [0, 6.69, 0], color: P.woodOld, grain: 2, subdiv: hi ? [1, 1, 4] : 1, seed: 4 });
  m.box('wood', { size: [0.1, 0.1, 1.2], at: [0, 6.17, 0], color: P.woodOld, grain: 2, subdiv: hi ? [1, 1, 3] : 1, seed: 5 });
  for (const s of [-1, 1]) {
    m.box('wood', { size: [0.05, 0.06, 0.62], at: [0.0, 6.4, s * 0.28], rot: [-s * 0.78, 0, 0], color: P.woodMid, grain: 2, seed: 6 });
  }
  if (hi) {
    for (const s of [-1, 1]) m.box('wood', { size: [0.05, 0.06, 0.5], at: [0.0, 5.96, s * 0.22], rot: [-s * 0.78, 0, 0], color: P.woodMid, grain: 2, seed: 7 });
    for (const [i, y] of [2.0, 2.45, 2.9, 3.35, 3.8].entries()) m.box('iron_cast', { size: [0.05, 0.03, 0.14], at: [(i % 2 ? 1 : -1) * 0.1, y, 0.0], rot: [0, (i % 2 ? 1 : -1) * 0.6, 0], color: P.steelDark, variance: 0.2, seed: 8 });
    m.box('steel_painted', { size: [0.016, 0.1, 0.07], at: [0.1, 3.0, 0.03], color: P.whiteFaded, variance: 0.2, seed: 9 });  // chapa de numeração
  }
  POLE_INSULATORS.forEach(([z, y], i) => {
    const ay = y;   // topo do braço
    if (hi) {
      m.cyl('steel', { r0: 0.009, h: 0.12, seg: 6, at: [0, ay, z], color: P.steelDark, caps: 'top' });
      m.cyl('porcelain', { r0: 0.05, r1: 0.032, h: 0.05, seg: 8, at: [0, ay + 0.012, z], caps: 'bottom', color: P.porcelainBrown, variance: 0.18, seed: 10 + i });
      m.cyl('porcelain', { r0: 0.04, r1: 0.022, h: 0.05, seg: 8, at: [0, ay + 0.06, z], caps: 'top', color: P.porcelainBrown, variance: 0.18, seed: 20 + i });
    } else {
      m.cyl('porcelain', { r0: 0.045, r1: 0.022, h: 0.1, seg: 6, at: [0, ay + 0.012, z], caps: 'top', color: P.porcelainBrown });
    }
  });
  m.sockets = { wire_anchors: wireAnchors().map(p => p.map(v => +v.toFixed(3))) };
}

/** Vão de fio de 12 m entre dois postes iguais (ancoragens em x=0 e x=12), flecha 0,28 m; seis fios separados. */
export const WIRE_SPAN = 12;
export function wireSpan(m, lod) {
  const hi = lod === 0, segs = hi ? 8 : 4, sag = 0.28;
  m.dirt = 0;
  for (const [i, a] of wireAnchors().entries()) {
    const path = [];
    for (let k = 0; k <= segs; k++) {
      const t = k / segs;
      path.push([a[0] + WIRE_SPAN * t, a[1] - 4 * sag * t * (1 - t) + 0.0, a[2]]);
    }
    m.tube('wire', path, { r: 0.006, sides: 3, caps: false, color: mix(P.steelDark, P.steelLight, (i % 3) / 6), variance: 0.1, seed: i });
  }
  m.sockets = { span_end_anchors: wireAnchors().map(p => [WIRE_SPAN, +p[1].toFixed(3), +p[2].toFixed(3)]), start_anchors: wireAnchors().map(p => p.map(v => +v.toFixed(3))) };
}

/** Cerca de ripas de madeira, 3,0 m × 1,15 m: três postes, duas travessas, ripas pontiagudas (algumas em falta ou tortas). */
export function fenceWood(m, lod) {
  const hi = lod === 0, r = rng(61), L = 3.0;
  for (const x of [-1.45, 0, 1.45]) m.box('wood', { size: [0.1, 1.15, 0.1], at: [x, 0.575, 0], rot: [0, 0, x === 0 ? 0.02 : 0], color: P.woodOld, subdiv: hi ? [1, 3, 1] : 1, grain: 1, bump: hi ? 0.002 : 0, seed: 1 });
  for (const y of [0.3, 0.8]) m.box('wood', { size: [L - 0.1, 0.06, 0.04], at: [0, y, -0.07], color: P.woodMid, subdiv: hi ? [6, 1, 1] : 1, grain: 0, seed: 2 });
  const n = hi ? 20 : 8, pw = hi ? 0.1 : 0.27, gap = (L - 0.2 - n * pw) / (n - 1);
  for (let i = 0; i < n; i++) {
    if (hi && (i === 7 || i === 13)) continue;           // ripas em falta
    const lean = hi && i === 12 ? 0.18 : (r() - 0.5) * 0.03;
    const h = 0.95 - (hi ? r() * 0.05 : 0), x = -L / 2 + 0.1 + pw / 2 + i * (pw + gap);
    m.box('wood', { size: [pw, h, 0.022], at: [x, 0.15 + h / 2, -0.115], rot: [0, 0, lean], color: mix(P.woodNew, P.woodGrey, r() * 0.7), grain: 1, subdiv: hi ? [1, 2, 1] : 1, seed: 10 + i, variance: 0.12 });
    if (hi) m.prism('wood', [[-pw / 2, 0], [pw / 2, 0], [0, 0.05]], 0.022, { at: [x + pm.sin(lean) * -h / 2, 0.15 + h + 0.0 - (1 - pm.cos(lean)) * h / 2, -0.115], rot: [0, 0, lean], color: mix(P.woodNew, P.woodGrey, 0.5), seed: 40 + i });
  }
}

/** Cerca de arame farpado, 3,0 m × 1,25 m: estacas inclinadas, quatro fios com flecha e farpas. */
export function fenceBarbed(m, lod) {
  const hi = lod === 0, r = rng(71), xs = [-1.5, 0, 1.5];
  xs.forEach((x, i) => m.cyl('wood', { r0: 0.05, r1: 0.032, h: 1.3, seg: hi ? 7 : 5, rings: 1, at: [x, 0, 0], rot: [0, 0, (i - 1) * 0.04 + (i === 2 ? 0.05 : 0)], caps: 'top', flat: !hi, color: i === 1 ? P.woodGrey : P.woodOld, grain: 1, seed: 3 + i }));
  const ys = hi ? [0.28, 0.54, 0.80, 1.06, 1.22] : [0.3, 0.65, 1.0, 1.2];
  for (const [j, y] of ys.entries()) {
    const path = [], segsPerBay = hi ? 5 : 2;
    for (let b = 0; b < 2; b++) for (let k = (b ? 1 : 0); k <= segsPerBay; k++) {
      const t = k / segsPerBay, x = xs[b] + (xs[b + 1] - xs[b]) * t;
      path.push([x, y - 0.04 * pm.sin(t * Math.PI) * (j % 2 ? 1.0 : 1.5) - (j === 2 && b === 1 && hi ? 0.16 * pm.sin(t * Math.PI) : 0), 0.045]);
    }
    m.tube('wire', path, { r: 0.0045, sides: 3, caps: false, color: mix(P.steelDark, P.rust, 0.22 + 0.2 * (j % 2)), variance: 0.15, seed: j });
    if (hi) {
      for (let k = 1; k < path.length - 1; k += 1) {
        if ((k + j) % 2) continue;
        const [x, yy, z] = path[k];
        const q = [[x - 0.004, yy, z], [x + 0.004, yy, z], [x + 0.012, yy + 0.022, z], [x, yy, z - 0.004], [x, yy, z + 0.004], [x, yy - 0.022, z + 0.012]];
        m.mesh('wire', q, [0, 1, 2, 3, 4, 5], { flat: true, color: P.steelDark });
      }
    }
  }
  if (hi) {
    // rolo de arame farpado caído junto à estaca da direita
    const path = [];
    for (let k = 0; k <= 24; k++) { const a = (k / 24) * Math.PI * 6; path.push([1.1 + 0.16 * pm.cos(a), 0.03 + 0.14 * Math.abs(pm.sin(a * 0.5)) + 0.01 * k / 24, 0.28 + 0.12 * pm.sin(a) + 0.01 * k]); }
    m.tube('wire', path, { r: 0.0045, sides: 3, caps: false, color: P.steelDark, variance: 0.2, seed: 9 });
  }
  else {
    const ring = [];
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; ring.push([1.1 + 0.16 * pm.cos(a), 0.1 + 0.07 * pm.sin(a * 2), 0.33 + 0.16 * pm.sin(a)]); }
    m.tube('wire', ring, { r: 0.006, sides: 3, closed: true, caps: false, color: P.steelDark });
  }
  void r;
}

/** Lanterna de mão ferroviária (tipo Eisenbahnlaterne), 0,28 m + alça (0,36 m): depósito, vidro, grelha e alça. */
export function railwayLantern(m, lod) {
  const hi = lod === 0, seg = hi ? 12 : 8;
  m.cyl('steel_painted', { r0: 0.064, r1: 0.058, h: 0.07, seg, caps: 'bottom', color: P.dullBlack, variance: 0.16, seed: 1 });
  m.cyl('steel_painted', { r0: 0.07, h: 0.012, seg, at: [0, 0.07, 0], caps: 'both', color: P.steelDark, seed: 2 });
  m.cyl('glass', { r0: 0.052, r1: 0.045, h: 0.125, seg, at: [0, 0.082, 0], caps: 'none', color: P.glassDirty, variance: 0.2, seed: 3 });
  m.cyl('steel_painted', { r0: 0.07, r1: 0.03, h: 0.04, seg, at: [0, 0.207, 0], caps: 'both', color: P.dullBlack, seed: 4 });
  m.cyl('steel_painted', { r0: 0.02, h: 0.04, seg: hi ? 8 : 6, at: [0, 0.247, 0], caps: 'top', color: P.rust, variance: 0.2, seed: 5 });
  const bars = hi ? 4 : 2;
  for (let i = 0; i < bars; i++) {
    const a = (i / bars) * Math.PI * 2 + 0.4;
    m.cyl('steel', { r0: 0.0045, h: 0.14, seg: hi ? 4 : 3, at: [pm.cos(a) * 0.058, 0.075, pm.sin(a) * 0.058], caps: hi ? 'top' : 'none', color: P.steelDark });
  }
  const path = [];
  for (let i = 0; i <= (hi ? 10 : 5); i++) { const a = (i / (hi ? 10 : 5)) * Math.PI; path.push([-pm.cos(a) * 0.07, 0.17 + pm.sin(a) * 0.19 * (i === 0 || i === (hi ? 10 : 5) ? 0.3 : 1), 0]); }
  m.tube('steel', path, { r: 0.0055, sides: hi ? 5 : 3, color: P.steelDark, caps: hi });
  void clamp;
}
