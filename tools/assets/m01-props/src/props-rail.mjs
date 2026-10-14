// Equipamento ferroviário e montes: alavanca de agulha, semáforo mecânico, grua de água, carvão, travessas.
import { mix, noise3, clamp } from './mesh.mjs';
import { P } from './palette.mjs';
import { rng } from './util.mjs';

/** Alavanca de agulha de mão (Handweiche), 1,2 m: base, fuso, alvo de duas faces, lanterna, braço com contrapeso. */
export function pointLever(m, lod) {
  const hi = lod === 0;
  m.box('earth', { size: [0.56, 0.12, 0.44], at: [0, 0.06, 0], color: P.concrete, subdiv: hi ? [2, 1, 2] : 1, bump: hi ? 0.004 : 0, variance: 0.14, seed: 1 });
  m.box('iron_cast', { size: [0.36, 0.07, 0.3], at: [0, 0.155, 0], color: P.steelDark, subdiv: hi ? [2, 1, 1] : 1, variance: 0.16, seed: 2 });
  m.cyl('iron_cast', { r0: 0.034, r1: 0.024, h: 0.26, seg: hi ? 10 : 6, at: [0, 0.19, 0], caps: 'none', color: P.steelDark, seed: 3 });
  m.cyl('steel', { r0: 0.018, h: 0.78, seg: hi ? 8 : 5, at: [0, 0.4, 0], caps: 'top', color: P.steelDark, grain: 1, seed: 4 });
  // alvo (disco vertical de duas faces) e lanterna
  m.cyl('steel_painted', {
    r0: 0.17, h: 0.012, seg: hi ? 14 : 8, at: [0, 1.0, -0.006], rot: [Math.PI / 2, 0, 0], caps: 'both',
    colorFn: (p, n) => m.tint(n[2] < 0 ? P.redFaded : P.whiteFaded, p, { variance: 0.16, freq: 8, seed: 5 }),
  });
  m.box('steel_painted', { size: [0.12, 0.16, 0.12], at: [0, 1.2, 0], color: P.dullBlack, subdiv: hi ? [1, 2, 1] : 1, variance: 0.14, seed: 6 });
  m.cyl('glass', { r0: 0.036, h: 0.012, seg: hi ? 10 : 6, at: [0, 1.2, 0.058], rot: [Math.PI / 2, 0, 0], caps: 'both', color: P.glassDirty, seed: 7 });
  // braço e contrapeso
  const ang = 0.5;
  m.box('iron_cast', { size: [0.74, 0.03, 0.036], at: [Math.cos(ang) * 0.3, 0.52, -Math.sin(ang) * 0.3], rot: [0, ang, 0], color: P.steelDark, subdiv: hi ? [4, 1, 1] : 1, variance: 0.2, seed: 8 });
  m.blob('iron_cast', { rad: [0.062, 0.062, 0.062], at: [Math.cos(ang) * 0.67, 0.52, -Math.sin(ang) * 0.67], nu: hi ? 10 : 6, nv: hi ? 6 : 4, color: P.steelDark, variance: 0.2, seed: 9 });
  m.cyl('leather', { r0: 0.018, h: 0.22, seg: hi ? 8 : 5, at: [-Math.cos(ang) * 0.06, 0.52, Math.sin(ang) * 0.06], rot: [0, 0, 0], caps: 'top', color: P.leather, seed: 10 });
  // tirante da agulha para o carril (±Z), na altura das travessas
  m.box('steel', { size: [0.03, 0.03, 0.9], at: [0.0, 0.2, 0.62], color: P.rust, subdiv: hi ? [1, 1, 3] : 1, variance: 0.2, seed: 11 });
  if (hi) m.box('iron_cast', { size: [0.1, 0.08, 0.1], at: [0, 0.2, 0.2], color: P.steelDark, seed: 12 });
}

/** Semáforo mecânico de via (Formsignal), 5,6 m: mastro tubular, escada, braço a 0° (parar), lanterna de espectáculo. */
export function semaphoreSignal(m, lod) {
  const hi = lod === 0, H = 5.3;
  m.box('earth', { size: [0.56, 0.22, 0.56], at: [0, 0.11, 0], color: P.concrete, subdiv: hi ? [2, 1, 2] : 1, bump: hi ? 0.004 : 0, variance: 0.14, seed: 1 });
  m.cyl('iron_cast', {
    r0: 0.1, r1: 0.062, h: H, seg: hi ? 12 : 6, rings: hi ? 3 : 1, at: [0, 0.22, 0], caps: 'top',
    colorFn: (p) => m.tint(p[1] < 1.4 ? P.creosote : P.fieldGrey, p, { variance: 0.12, grain: 1, freq: 5, seed: 2 }),
  });
  for (const [i, y] of (hi ? [0.45, 2.2, 4.0, 5.1] : [0.45, 5.1]).entries()) m.cyl('iron_cast', { r0: 0.112 - y * 0.006, h: 0.05, seg: hi ? 12 : 6, at: [0, y, 0], caps: 'both', color: P.steelDark, seed: 3 + i });
  // escada de gato junto ao mastro (lado −Z)
  for (const x of [-0.17, 0.17]) m.box('steel_painted', { size: [0.035, 4.7, 0.035], at: [x, 0.22 + 2.35, -0.19], color: P.steelDark, subdiv: hi ? [1, 6, 1] : 1, variance: 0.16, seed: 10 });
  if (hi) {
    for (let k = 0; k < 10; k++) m.box('steel_painted', { size: [0.35, 0.025, 0.025], at: [0, 0.5 + k * 0.46, -0.19], color: P.steelDark, variance: 0.16, seed: 20 + k });
    for (const x of [-0.17, 0.17]) m.box('steel_painted', { size: [0.025, 0.025, 0.16], at: [x, 1.6, -0.115], color: P.steelDark });
  }
  // braço (horizontal = Fahrt verboten) com faixa branca, pivô e contrapeso
  const ay = 4.75;
  m.box('wood_painted', {
    size: [1.25, 0.18, 0.024], at: [0.78, ay, 0.1], subdiv: hi ? [10, 1, 1] : [4, 1, 1], bump: 0,
    colorFn: (p) => {
      const x = p[0] - 0.155;
      const stripe = (x > 0.5 && x < 0.66) || x > 1.15 ? 1 : 0;   // listras desbotadas
      return m.tint(stripe ? P.whiteFaded : P.redFaded, p, { variance: 0.16, freq: 9, grain: 0, seed: 30 });
    },
  });
  m.box('steel_painted', { size: [0.12, 0.26, 0.05], at: [0.0, ay, 0.07], color: P.steelDark, seed: 31 });
  m.box('iron_cast', { size: [0.3, 0.05, 0.045], at: [-0.17, ay - 0.06, 0.1], rot: [0, 0, -0.35], color: P.steelDark, seed: 32 });
  m.blob('iron_cast', { rad: [0.07, 0.07, 0.07], at: [-0.31, ay - 0.11, 0.1], nu: hi ? 8 : 6, nv: hi ? 5 : 3, color: P.steelDark, variance: 0.2, seed: 33 });
  // lanterna de espectáculo atrás do braço
  m.box('steel_painted', { size: [0.3, 0.34, 0.2], at: [0.0, ay - 0.5, 0.0], color: P.dullBlack, subdiv: hi ? [2, 2, 1] : 1, variance: 0.14, seed: 34 });
  m.cyl('glass', { r0: 0.075, h: 0.02, seg: hi ? 12 : 6, at: [0, ay - 0.5, 0.1], rot: [Math.PI / 2, 0, 0], caps: 'both', color: P.glassDirty, seed: 35 });
  if (hi) {
    m.cyl('steel_painted', { r0: 0.04, r1: 0.02, h: 0.14, seg: 8, at: [0, ay - 0.33, 0], caps: 'top', color: P.dullBlack, seed: 36 });
    m.cyl('steel', { r0: 0.006, h: 4.1, seg: 3, at: [0.09, 0.55, 0.095], caps: 'none', color: P.steelDark, seed: 37 });     // transmissão por arame
  }
  m.cyl('iron_cast', { r0: 0.07, r1: 0.0, h: 0.2, seg: hi ? 8 : 6, at: [0, H + 0.17, 0], caps: 'bottom', color: P.steelDark, seed: 38 });
  m.sockets = { arm_pivot: [0, ay, 0.1], lamp_lens: [0, ay - 0.5, 0.11], arm_direction: 'arm_vertical_axis_is_Z; arm points +X (stop)' };
}

/** Grua de água (Wasserkran), 4,6 m: pedestal, coluna de ferro fundido, braço em pescoço de cisne e manga de lona. */
export function waterCrane(m, lod) {
  const hi = lod === 0;
  m.cyl('earth', { r0: 0.42, r1: 0.36, h: 0.36, seg: hi ? 8 : 6, caps: 'top', flat: true, color: P.concrete, variance: 0.16, seed: 1 });
  m.cyl('iron_cast', {
    r0: 0.2, r1: 0.14, h: 3.9, seg: hi ? 12 : 7, rings: hi ? 3 : 1, at: [0, 0.36, 0], caps: 'none',
    colorFn: (p) => m.tint(mix(P.steelDark, P.rust, clamp((p[1] - 1) * 0.1, 0, 0.3)), p, { variance: 0.14, grain: 1, freq: 5, seed: 2 }),
  });
  for (const [i, y] of (hi ? [0.5, 1.5, 2.9, 4.2] : [0.5, 4.2]).entries()) m.cyl('iron_cast', { r0: 0.23 - y * 0.014, h: 0.07, seg: hi ? 12 : 7, at: [0, y, 0], caps: 'both', color: P.steelDark, seed: 3 + i });
  m.cyl('iron_cast', { r0: 0.17, r1: 0.12, h: 0.16, seg: hi ? 12 : 7, at: [0, 4.26, 0], caps: 'top', color: P.steelDark, seed: 9 });
  // braço em pescoço de cisne (para +X)
  const n = hi ? 10 : 5;
  const arm = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    arm.push([0.0 + 2.7 * t, 4.4 + 0.22 * Math.sin(t * Math.PI) - 0.5 * t ** 3, 0]);
  }
  m.tube('iron_cast', arm, { r: t => 0.1 - 0.025 * t, sides: hi ? 8 : 5, color: P.steelDark, variance: 0.16, seed: 10 });
  m.cyl('iron_cast', { r0: 0.1, r1: 0.12, h: 0.06, seg: hi ? 10 : 6, at: [2.7, 3.97, 0], caps: 'both', color: P.steelDark, seed: 11 });
  // manga de lona pendente
  m.cyl('cloth', {
    r: t => 0.115 - 0.025 * t + (hi ? 0.014 * Math.sin(t * 38) : 0), h: 1.0, seg: hi ? 10 : 6, rings: hi ? 16 : 3, at: [2.7, 2.97, 0], caps: 'bottom', color: P.canvas, variance: 0.18, grain: 1, seed: 12,
  });
  if (hi) {
    // roda da válvula e braseiro anti-gelo
    const circ = [];
    for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; circ.push([0.25, 1.25 + 0.14 * Math.cos(a), 0.14 * Math.sin(a)]); }
    m.tube('iron_cast', circ, { r: 0.011, sides: 4, closed: true, color: P.rust, variance: 0.2, seed: 13 });
    m.box('iron_cast', { size: [0.14, 0.02, 0.02], at: [0.25, 1.25, 0], color: P.rust, seed: 14 });
    m.box('iron_cast', { size: [0.02, 0.02, 0.28], at: [0.25, 1.25, 0], color: P.rust, seed: 15 });
    m.cyl('iron_cast', { r0: 0.014, h: 0.1, seg: 6, at: [0.2, 1.25, 0], rot: [0, 0, -Math.PI / 2], caps: 'none', color: P.rust, seed: 16 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      m.cyl('rust', { r0: 0.009, h: 0.6, seg: 4, at: [0.75 + Math.cos(a) * 0.2, 0.0, Math.sin(a) * 0.2], caps: 'none', color: P.rust, variance: 0.2, seed: 20 + i });
    }
    const ring = [];
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; ring.push([0.75 + Math.cos(a) * 0.2, 0.6, Math.sin(a) * 0.2]); }
    m.tube('rust', ring, { r: 0.012, sides: 4, closed: true, color: P.rust, variance: 0.2, seed: 30 });
    m.blob('coal', { rad: [0.17, 0.09, 0.17], at: [0.75, 0.1, 0], nu: 8, nv: 4, color: P.coalBrown, variance: 0.3, seed: 31 });
  }
  m.sockets = { spout_tip: [2.7, 2.0, 0], swing: 'arm swings about the vertical column axis' };
}

/** Monte de carvão (Steinkohle), ≈ 3,0 × 2,2 m e 1,1 m de altura, facetado e sujo, com uma pá cravada. */
export function coalPile(m, lod) {
  const hi = lod === 0, nx = hi ? 15 : 7, nz = hi ? 11 : 5, rx = 1.55, rz = 1.15, r = rng(81), pts = [];
  const hfun = (u, v) => {
    const d = Math.hypot(u, v);
    const base = Math.max(0, 1 - d * d) ** 0.8;
    const rough = noise3(u * 3.2 + 4, v * 3.2, 1.7) * 0.18 + noise3(u * 8, v * 8, 3) * 0.07;
    return Math.max(0, 1.12 * base + (base > 0.02 ? rough * Math.min(1, base * 3) : 0) + 0.2 * Math.max(0, 0.5 - Math.hypot(u - 0.35, v + 0.1)) ** 1.2 * 0);
  };
  for (let j = 0; j <= nz; j++) {
    const row = [];
    for (let i = 0; i <= nx; i++) {
      const u = (i / nx - 0.5) * 2, v = (j / nz - 0.5) * 2;
      const edge = Math.hypot(u, v) > 0.98;
      const jx = hi ? (r() - 0.5) * 0.04 : 0, jz = hi ? (r() - 0.5) * 0.04 : 0;
      const wob = 1 + 0.12 * noise3(u * 2 + 9, v * 2, 5);
      row.push([u * rx * wob + jx, edge ? 0.0 : hfun(u * wob * 0.97, v * wob * 0.97), v * rz * wob + jz]);
    }
    pts.push(row);
  }
  m.grid('coal', pts, {
    flat: true,
    colorFn: (p, n, i) => {
      const k = noise3(p[0] * 6 + 2, p[1] * 6, p[2] * 6);
      const base = k > 0.25 ? P.coalBlue : k < -0.25 ? P.coalBrown : P.coal;
      return m.tint(base, p, { variance: 0.35, freq: 12, seed: i % 7 });
    },
  });
  if (hi) {
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2, d = 0.9 + r() * 0.8;
      const ry = 0.04 + r() * 0.04;
      m.blob('coal', { rad: [0.05 + r() * 0.07, ry, 0.05 + r() * 0.06], at: [Math.cos(a) * d * 1.1, ry + 0.012, Math.sin(a) * d * 0.8], rot: [r() * 0.3, r() * 3, r() * 0.3], nu: 6, nv: 3, color: P.coal, variance: 0.3, seed: 40 + i });
    }
    // pá cravada
    m.box('iron_cast', { size: [0.22, 0.02, 0.27], at: [-0.5, 0.52, 0.16], rot: [-0.9, 0.2, 0.08], color: P.steelDark, variance: 0.25, seed: 60 });
    m.cyl('wood', { r0: 0.016, h: 0.9, seg: 6, at: [-0.48, 0.55, 0.0], rot: [-0.9, 0.2, 0.08], caps: 'top', color: P.woodOld, grain: 1, seed: 61 });
  }
}

/** Pilha de travessas de via (2,6 × 0,26 × 0,15 m cada): 8 fiadas de 4, com 3 pares de travessas em cruz e extremos desalinhados. */
export function sleeperStack(m, lod) {
  const hi = lod === 0, r = rng(91), SL = 2.6, SW = 0.26, SH = 0.15;
  const layers = 8;
  for (let k = 0; k < layers; k++) {
    if (hi) {
      for (let i = 0; i < 4; i++) {
        const dx = (r() - 0.5) * 0.12, dz = (r() - 0.5) * 0.015;
        const dark = r() < 0.4;
        m.box('wood', { size: [SL, SH, SW - 0.01], at: [dx, SH / 2 + k * SH, (i - 1.5) * (SW + 0.012) + dz], color: dark ? P.creosote : mix(P.woodOld, P.creosote, r() * 0.7), subdiv: [4, 1, 1], bump: 0.003, grain: 0, variance: 0.16, seed: k * 7 + i });
      }
    } else {
      m.box('wood', { size: [SL, SH, 4 * SW + 0.02], at: [0, SH / 2 + k * SH, 0], color: mix(P.woodOld, P.creosote, 0.4 + 0.1 * (k % 3)), subdiv: k === layers - 1 ? [1, 1, 4] : 1, grain: 0, variance: 0.16, seed: k });
    }
  }
  // calços em cruz sobre a pilha (um par), mais duas travessas cruzadas na base
  const top = layers * SH;
  if (hi) {
    for (const x of [-0.95, 0.95]) m.box('wood', { size: [SW, SH, 4 * SW + 0.04], at: [x, top + SH / 2, 0], color: mix(P.woodOld, P.creosote, 0.5), subdiv: [1, 1, 3], grain: 2, variance: 0.16, seed: 70 });
    m.box('wood', { size: [SL * 0.95, SH, SW], at: [0.2, top + SH + SH / 2, 0.1], rot: [0, 0.04, 0], color: mix(P.woodNew, P.creosote, 0.6), subdiv: [3, 1, 1], grain: 0, variance: 0.16, seed: 71 });
  } else {
    for (const x of [-0.95, 0.95]) m.box('wood', { size: [SW, SH, 4 * SW + 0.04], at: [x, top + SH / 2, 0], color: mix(P.woodOld, P.creosote, 0.5) });
  }
  // travessa solta, caída ao lado
  m.box('wood', { size: [SL, SH, SW], at: [0.35, SH / 2, 0.85], rot: [0, 0.2, 0], color: P.woodGrey, subdiv: hi ? [3, 1, 1] : 1, grain: 0, variance: 0.16, seed: 80 });
}
