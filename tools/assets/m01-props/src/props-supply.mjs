// Props de abastecimento: caixas, sacos de areia, barris, bidões e jerricans. Cada builder recebe (Model m, lod).
// LOD0 ≤ 1500 triângulos, LOD1 ≤ 300. Origem no contacto com o solo, metros, +Y para cima.
import { mix } from './mesh.mjs';
import { P } from './palette.mjs';
import { rng } from './util.mjs';

/** Caixa de munição de madeira (tipo Munitionskiste), 0,78 × 0,34 × 0,40 m, com cintas, pegas de corda e tampa. */
export function ammoCrateWood(m, lod) {
  const hi = lod === 0, r = rng(11);
  const W = 0.78, H = 0.30, D = 0.40;
  m.box('wood_painted', { size: [W, H, D], at: [0, H / 2, 0], color: P.oliveDrab, subdiv: hi ? [4, 2, 2] : 1, bump: hi ? 0.002 : 0, grain: 0, variance: 0.12, seed: 1 });
  m.box('wood_painted', { size: [W + 0.02, 0.04, D + 0.02], at: [0, H + 0.02, 0], color: mix(P.oliveDrab, P.woodGrey, 0.25), subdiv: hi ? [4, 1, 2] : 1, grain: 0, variance: 0.12, seed: 2 });
  if (hi) {
    // topes de madeira nas cabeceiras (cunhas) e faixa de estêncil desbotada na tampa
    for (const s of [-1, 1]) m.box('wood', { size: [0.04, H + 0.04, D + 0.02], at: [s * (W / 2 - 0.02), (H + 0.04) / 2 - 0.0, 0], color: P.woodMid, subdiv: [1, 2, 2], grain: 1, seed: 3 });
    m.box('cloth', { size: [0.30, 0.003, 0.11], at: [0.02, H + 0.0415, 0], color: P.whiteFaded, subdiv: [2, 1, 1], variance: 0.2, seed: 4 });
    for (const x of [-0.2, 0.2]) {
      m.box('steel_painted', { size: [0.04, 0.006, D + 0.026], at: [x, H + 0.043, 0], color: P.steelDark, subdiv: [1, 1, 3], variance: 0.15, seed: 5 });
      for (const s of [-1, 1]) m.box('steel_painted', { size: [0.04, H + 0.045, 0.006], at: [x, (H + 0.045) / 2, s * (D / 2 + 0.014)], color: P.steelDark, subdiv: [1, 2, 1], variance: 0.15, seed: 6 });
    }
    // pegas de corda nas cabeceiras
    for (const s of [-1, 1]) {
      const x = s * (W / 2 + 0.03), path = [];
      for (let i = 0; i <= 6; i++) { const t = i / 6; path.push([x + s * 0.03 * Math.sin(t * Math.PI), 0.24 - 0.025 * Math.sin(t * Math.PI) - 0.07 * (1 - Math.sin(t * Math.PI)) * 0, -0.08 + 0.16 * t]); }
      m.tube('rope', path, { r: 0.011, sides: 4, color: P.rope, variance: 0.1, seed: 7 });
    }
  } else {
    for (const x of [-0.2, 0.2]) m.box('steel_painted', { size: [0.04, 0.006, D + 0.026], at: [x, H + 0.043, 0], color: P.steelDark });
  }
  void r;
}

/** Caixa de mantimentos de tábuas com cantoneiras, 0,90 × 0,52 × 0,50 m; uma tábua partida. */
export function supplyCratePlanked(m, lod) {
  const hi = lod === 0, r = rng(21);
  const L = 0.90, H = 0.50, D = 0.50, t = 0.022, post = 0.05;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    m.box('wood', { size: [post, H, post], at: [sx * (L / 2 - post / 2), H / 2, sz * (D / 2 - post / 2)], color: P.woodMid, grain: 1, subdiv: hi ? [1, 2, 1] : 1, seed: 1 });
  }
  const n = hi ? 4 : 3, ph = (H - 0.02) / n;
  for (let k = 0; k < n; k++) {
    const y = 0.02 + ph * (k + 0.5), shade = mix(P.woodNew, P.woodOld, r());
    for (const s of [-1, 1]) {
      const broken = hi && s === 1 && k === 2;
      m.box('wood', { size: [L - 0.02, ph - 0.012, t], at: [0, y + (broken ? -0.012 : 0), s * (D / 2 - t / 2)], rot: broken ? [0, 0, 0.04] : null, color: shade, grain: 0, subdiv: hi ? [4, 1, 1] : 1, bump: hi ? 0.002 : 0, seed: 2 + k });
      if (!broken || !hi) m.box('wood', { size: [t, ph - 0.012, D - 2 * post], at: [s * (L / 2 - t / 2), y, 0], color: mix(shade, P.woodGrey, 0.2), grain: 2, subdiv: hi ? [1, 1, 2] : 1, seed: 9 + k });
    }
  }
  // tampa: tábuas transversais, uma levantada
  const np = hi ? 5 : 3, pw = L / np;
  for (let k = 0; k < np; k++) {
    const lift = hi && k === 3 ? 0.04 : 0;
    m.box('wood', { size: [pw - 0.01, 0.02, D + 0.02], at: [-L / 2 + pw * (k + 0.5), H + 0.01 + lift / 2, 0], rot: lift ? [0, 0, 0.11] : null, color: mix(P.woodNew, P.woodOld, r()), grain: 2, subdiv: hi ? [1, 1, 3] : 1, seed: 20 + k });
  }
  m.box('wood', { size: [L - 0.1, 0.02, D - 0.1], at: [0, 0.01, 0], color: P.woodDark });
  if (hi) {
    for (const x of [-0.3, 0.3]) m.box('wood', { size: [0.06, 0.018, D + 0.02], at: [x, H + 0.029, 0], color: P.woodDark, subdiv: [1, 1, 2], grain: 2, seed: 40 });
    m.box('cloth', { size: [0.22, 0.003, 0.14], at: [0.0, H + 0.0225, 0.06], color: P.whiteFaded, variance: 0.25, seed: 41 });
  }
}

/** Caixa de metal de munição (tipo Patronenkasten), 0,40 × 0,20 × 0,23 m, pega e dois fechos. */
export function ammoTinBox(m, lod) {
  const hi = lod === 0, W = 0.40, H = 0.20, D = 0.23;
  m.box('steel_painted', { size: [W, H * 0.55, D], at: [0, H * 0.275, 0], color: P.fieldGrey, subdiv: hi ? [3, 1, 2] : 1, bump: hi ? 0.0015 : 0, variance: 0.14, seed: 1 });
  m.box('steel_painted', { size: [W + 0.012, H * 0.45, D + 0.012], at: [0, H * 0.775, 0], color: mix(P.fieldGrey, P.rust, 0.18), subdiv: hi ? [3, 1, 2] : 1, bump: hi ? 0.0015 : 0, variance: 0.18, seed: 2 });
  m.box('steel', { size: [W - 0.04, 0.012, 0.03], at: [0, H + 0.006, 0], color: P.steelDark, subdiv: hi ? [2, 1, 1] : 1 });
  if (hi) {
    for (const x of [-0.14, 0.14]) m.box('steel', { size: [0.035, 0.07, 0.014], at: [x, H * 0.55, D / 2 + 0.008], color: P.steelLight, variance: 0.18, seed: 3 });
    for (const s of [-1, 1]) m.box('steel', { size: [0.012, H * 0.9, D - 0.02], at: [s * (W / 2 + 0.002), H * 0.45, 0], color: P.rust, subdiv: [1, 1, 2], variance: 0.2, seed: 5 });
    const path = [];
    for (let i = 0; i <= 7; i++) { const a = (i / 7) * Math.PI; path.push([-0.07 * Math.cos(a) , H + 0.012 + 0.045 * Math.sin(a), 0]); }
    m.tube('steel', path, { r: 0.006, sides: 4, color: P.steelDark });
  }
}

/** Saco de areia: superelipsoide achatado (0,60 × 0,30 × 0,15 m) com pontas apertadas. */
function bag(m, { at, rot = [0, 0, 0], tint = P.burlap, hi, seed, len = 0.6, depth = 0.3, split = false }) {
  const rx = len / 2, ry = 0.075, rz = depth / 2;
  m.blob('cloth', {
    rad: [rx, ry, rz], at, rot, nu: hi ? 8 : 6, nv: hi ? 4 : 3, e: [0.62, 0.7],
    shape: (p) => {
      const ex = Math.abs(p[0] / rx) ** 3;               // aperto nas pontas
      const sag = 1 - 0.1 * (p[0] / rx) ** 2;
      return [p[0], p[1] * (1 - 0.35 * ex) * sag * (split ? 0.7 : 1), p[2] * (1 - 0.4 * ex) * (1 + 0.04 * Math.sin(p[0] * 17 + seed))];
    },
    colorFn: (p, n) => {
      const ends = Math.abs((p[0] - at[0]) / rx);
      let c = m.tint(tint, p, { variance: 0.14, freq: 9, seed });
      if (ends > 0.86) c = mix(c, P.twine, 0.7);
      return c;
    },
  });
}

/** Fiadas de sacos: lista de {x,z,len,along} por fiada → sacos assentes em camadas. */
function wall(m, courses, hi, seed0) {
  const r = rng(seed0);
  courses.forEach((bags, k) => {
    bags.forEach(([x, z, along, len, depth], i) => {
      const jitter = hi ? 0.012 : 0.006;
      const tint = mix(P.burlap, P.burlapDark, r() * 0.9);
      bag(m, {
        at: [x + (r() - 0.5) * jitter, 0.075 + k * 0.145, z + (r() - 0.5) * jitter],
        rot: [0, (along ? Math.PI / 2 : 0) + (r() - 0.5) * 0.1, 0], tint, hi, seed: k * 31 + i, len, depth,
      });
    });
  });
}

/** Troço recto de parapeito: 1,8 m × 0,6 m × 0,56 m (4 fiadas, 2 sacos de espessura, ligação em quincôncio). */
export function sandbagRun(m, lod) {
  const hi = lod === 0, courses = [];
  const nC = hi ? 4 : 3;
  void nC;
  for (let k = 0; k < nC; k++) {
    const bags = [];
    for (const row of [0, 1]) {
      const off = (row + k) % 2 ? 0.3 : 0;
      for (let i = 0; i < 3; i++) bags.push([-0.6 + i * 0.6 + off - 0.15, -0.15 + row * 0.3, false]);
    }
    courses.push(bags);
  }
  if (!hi) {
    // LOD1: uma fiada por laje de 3 sacos com 2 de espessura, perfil de sacos por cor
    courses.length = 0;
    for (let k = 0; k < nC; k++) courses.push([[-0.45 + (k % 2) * 0.15, 0, false, 0.9, 0.6], [0.45 + (k % 2) * 0.15, 0, false, 0.9, 0.6]]);
  }
  wall(m, courses, hi, 31);
}

/** Canto em L: duas pernas de 1,2 m, 3 fiadas, 2 sacos de espessura. */
export function sandbagCorner(m, lod) {
  const hi = lod === 0, courses = [];
  for (let k = 0; k < 3; k++) {
    const bags = [];
    for (const row of [0, 1]) {
      const off = (row + k) % 2 ? 0.3 : 0;
      // perna A ao longo de +X (z = 0.15 / 0.45), perna B ao longo de +Z (x = 0.15 / 0.45)
      for (let i = 0; i < 2; i++) bags.push([0.3 + i * 0.6 + off, 0.15 + row * 0.3, false]);
      for (let i = 0; i < 2; i++) bags.push([0.15 + row * 0.3, 0.9 + i * 0.6 - (off ? 0.3 : 0), true]);
    }
    courses.push(bags);
  }
  if (!hi) {
    courses.length = 0;
    for (let k = 0; k < 3; k++) courses.push([[0.6 + (k % 2) * 0.3, 0.3, false, 1.2, 0.6], [0.3, 1.2, true, 1.2, 0.6]]);
  }
  wall(m, courses, hi, 41);
}

/** Parapeito rebentado: duas fiadas desfeitas, sacos caídos, areia derramada e um saco rasgado. */
export function sandbagBurst(m, lod) {
  const hi = lod === 0, r = rng(51);
  wall(m, [[[-0.6, 0, false], [0, 0, false], [0.6, 0.02, false]], [[-0.3, 0.01, false], [0.3, -0.02, false]]], hi, 52);
  // sacos caídos e inclinados
  const fallen = hi
    ? [[0.95, 0.42, [0.2, 0.5, 0.35]], [-0.8, 0.5, [0.1, -0.7, -0.3]], [0.3, 0.62, [0.05, 1.2, 0.2]], [-0.2, 0.45, [0.1, 0.3, -0.25]]]
    : [[0.95, 0.42, [0.2, 0.5, 0.35]], [-0.8, 0.5, [0.1, -0.7, -0.3]]];
  fallen.forEach(([x, z, rot], i) => bag(m, { at: [x, 0.12, z], rot, tint: mix(P.burlap, P.burlapDark, r()), hi, seed: 70 + i }));
  bag(m, { at: [0.0, 0.07, 0.9], rot: [0, 0.4, 0], tint: P.burlapDark, hi, seed: 90, split: true });
  // areia derramada
  const nu = hi ? 11 : 6, nv = hi ? 4 : 2, pts = [];
  for (let j = 0; j <= nv; j++) {
    const row = [];
    for (let i = 0; i < nu; i++) {
      const a = (i / nu) * Math.PI * 2, rr = j === 0 ? 0 : (0.2 + 0.55 * (j / nv)) * (1 + 0.25 * Math.sin(a * 3 + 1.3) + 0.12 * Math.sin(a * 5));
      row.push([0.05 + Math.cos(a) * rr * 1.15, j === nv ? 0.003 : 0.1 * (1 - j / nv) ** 1.3 + 0.01, 0.8 + Math.sin(a) * rr * 0.8]);
    }
    pts.push(row);
  }
  m.grid('earth', pts, { wrapU: true, flat: true, colorFn: (p) => m.tint(P.sand, p, { variance: 0.2, freq: 14, seed: 3 }) });
}

/** Barril de madeira de aduelas, ø médio 0,58 m × 0,88 m, quatro arcos de ferro. */
export function barrelWood(m, lod) {
  const hi = lod === 0, H = 0.88, rm = 0.29, re = 0.245;
  const prof = t => re + (rm - re) * (1 - (2 * t - 1) ** 2);
  const seg = hi ? 16 : 8;
  m.cyl('wood', {
    h: H, seg, rings: hi ? 6 : 2, r: prof, caps: 'both', flat: !hi,
    colorFn: (p, n) => {
      const a = Math.atan2(p[2], p[0]), stave = Math.floor(((a / (Math.PI * 2) + 1) % 1) * seg);
      const base = mix(P.woodMid, P.woodOld, ((stave * 37) % 11) / 11);
      return m.tint(base, p, { variance: 0.1, grain: 1, freq: 6, seed: stave });
    },
  });
  for (const t of hi ? [0.12, 0.3, 0.7, 0.88] : [0.2, 0.8]) {
    const y = t * H, rr = prof(t) + 0.006;
    m.cyl('steel_painted', { r0: rr, r1: rr, h: 0.035, seg, at: [0, y - 0.0175, 0], caps: 'none', color: mix(P.rust, P.steelDark, 0.4), variance: 0.2, seed: 5 });
  }
  if (hi) m.cyl('wood', { r0: re - 0.015, h: 0.02, seg, at: [0, H - 0.01, 0], caps: 'top', color: P.woodDark, seed: 9 });
}

/** Bidão de combustível de 200 l (≈ ø 0,585 m × 0,88 m): chapa pintada gasta, ferrugem, duas nervuras e dois bujões. */
export function drumFuel200(m, lod) {
  const hi = lod === 0, H = 0.88, R = 0.2925, seg = hi ? 20 : 10;
  const ribT = [0.28, 0.72];
  const prof = t => {
    let k = 1;
    for (const rt of ribT) k += 0.022 * Math.exp(-(((t - rt) / 0.028) ** 2));
    if (t < 0.025 || t > 0.975) k += 0.02;
    return R * k;
  };
  m.cyl('steel_painted', {
    h: H, seg, rings: hi ? 16 : 6, r: prof, caps: 'both',
    colorFn: (p, n) => {
      const rust = Math.max(0, m.tint([0.5, 0.5, 0.5], p, { variance: 0.9, freq: 4.5, seed: 8 })[0] - 0.5) * 1.6 * (0.4 + 0.6 * (1 - p[1] / H) + (n[1] > 0.5 ? 0.3 : 0));
      return mix(m.tint(P.oliveDrab, p, { variance: 0.1, freq: 7, grain: 1, seed: 4 }), P.rustLight, Math.min(0.75, rust));
    },
  });
  if (hi) {
    for (const [x, z, rr] of [[0.1, 0.05, 0.03], [-0.12, -0.08, 0.022]]) m.cyl('iron_cast', { r0: rr, h: 0.025, seg: 8, at: [x, H + 0.004, z], caps: 'top', color: P.steelDark });
    m.cyl('steel_painted', { r0: R * 1.0, r1: R * 1.0, h: 0.018, seg, at: [0, H - 0.01, 0], caps: 'none', color: P.steelDark });
  }
}

/** Três jerricans (Wehrmachtskanister de 20 l) 0,34 × 0,16 × 0,46 m; um deles deitado. */
export function jerrycans(m, lod) {
  const hi = lod === 0;
  const can = (at, rot, tint, seed) => {
    const tf = (p) => {
      const c = Math.cos(rot[1]), s = Math.sin(rot[1]);
      return [at[0] + p[0] * c + p[2] * s, at[1] + p[1], at[2] - p[0] * s + p[2] * c];
    };
    const o = { rot, color: tint, seed, variance: 0.16 };
    const lay = rot[2] ? 1 : 0;
    void lay; void tf;
    m.box('steel_painted', { size: [0.34, 0.40, 0.16], at: [at[0], at[1] + 0.2, at[2]], subdiv: hi ? [3, 3, 1] : 1, bump: hi ? 0.0015 : 0, ...o });
    m.box('steel_painted', { size: [0.34, 0.06, 0.16], at: [at[0], at[1] + 0.43, at[2]], subdiv: hi ? [3, 1, 1] : 1, ...o, color: mix(tint, P.rust, 0.15) });
    if (hi) {
      m.box('steel_painted', { size: [0.2, 0.02, 0.12], at: [at[0], at[1] + 0.46, at[2]], ...o });
      m.cyl('steel', { r0: 0.028, h: 0.04, seg: 8, at: [at[0] + 0.1, at[1] + 0.46, at[2]], color: P.steelDark, caps: 'top' });
      for (const x of [-0.08, 0.04]) m.box('steel_painted', { size: [0.025, 0.07, 0.12], at: [at[0] + x + 0.02, at[1] + 0.455, at[2]], ...o, color: P.steelDark });
      m.box('steel_painted', { size: [0.34, 0.012, 0.162], at: [at[0], at[1] + 0.2, at[2]], ...o, color: mix(tint, P.steelDark, 0.4) });
    }
  };
  can([-0.4, 0, 0.03], [0, 0, 0], mix(P.fieldGrey, P.rust, 0.08), 1);
  can([0.0, 0, -0.04], [0, 0, 0], mix(P.oliveDrab, P.woodGrey, 0.2), 2);
  can([0.4, 0, 0.05], [0, 0, 0], mix(P.fieldGrey, P.rust, 0.28), 3);
  // um quarto jerrican deitado diante da fila
  m.box('steel_painted', { size: [0.34, 0.16, 0.40], at: [0.1, 0.08, 0.42], rot: [0, 0.35, 0], color: mix(P.oliveDrab, P.rust, 0.12), subdiv: hi ? [3, 1, 3] : 1, bump: hi ? 0.0015 : 0, variance: 0.16, seed: 6 });
  if (hi) m.cyl('steel', { r0: 0.028, h: 0.04, seg: 8, at: [0.1, 0.16, 0.42], caps: 'top', color: P.steelDark });
}
