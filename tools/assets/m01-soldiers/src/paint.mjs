// Pintores procedurais do atlas (originais): pano de lã com bolsos, carcela, platinas e botões em relevo; pele,
// rosto (lábios, sobrancelhas, barba, rugas, sardas, graxa), olhos, cabelo; couro, botas, perneiras; equipamento
// (aço pintado, lona, couro, madeira, metal). Cada pintor recebe {p, n, uv, a, part} em metros na pose de
// ligação (frente −Z, lado esquerdo do soldado em −X) e devolve {c: sRGB 0..1, r, m, h (relevo em m)}.
import { fbm, noise3, hash } from './noise.mjs';
import { v3, smoothstep, clamp } from './meshops.mjs';

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const tint = (a, b) => [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
/** Distância com sinal a um rectângulo de cantos arredondados (centro c, meia-largura hw, meia-altura hh). */
const sdBox = (x, y, cx, cy, hw, hh, r = 0.004) => {
  const dx = Math.abs(x - cx) - hw + r, dy = Math.abs(y - cy) - hh + r;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r;
};
/** Linha de pesponto (tracejado) a `inset` dentro de uma borda dada pela distância com sinal d. */
const stitch = (d, inset, along) => {
  const line = 1 - smoothstep(0.0006, 0.0014, Math.abs(d + inset));
  return line * (Math.sin(along * Math.PI * 2 / 0.005) > -0.2 ? 1 : 0);
};
/** Botão abaulado: relevo e máscara a partir da distância ao centro. */
const button = (d, r) => d > r ? null : { h: 0.0022 * Math.sqrt(1 - (d / r) ** 2) + 0.0008, rim: smoothstep(r * 0.55, r * 0.75, d) * (1 - smoothstep(r * 0.8, r, d)), k: d / r };

const NATIONS = {
  // Polaco 1939: túnica wz.36 cáqui-esverdeada, botões de metal oxidado, patches azul-marinho com vivo verde-claro.
  pl: { cloth: [0.39, 0.38, 0.26], trousers: [0.37, 0.36, 0.25], lining: [0.24, 0.22, 0.17], button: [0.50, 0.44, 0.28], buttonMetal: 0.7,
    patch: [0.09, 0.11, 0.24], piping: [0.42, 0.62, 0.38], belt: [0.33, 0.20, 0.10], boot: [0.30, 0.18, 0.09], sole: [0.10, 0.08, 0.06],
    puttee: [0.40, 0.38, 0.27], flap: 'pointed', buckle: [0.45, 0.45, 0.43], skin: [0.80, 0.62, 0.51] },
  // Alemão 1939: túnica M36 feldgrau, gola verde-escura com Litzen cinzentas, calças cinza-pedra, botas pretas.
  de: { cloth: [0.38, 0.40, 0.34], trousers: [0.36, 0.36, 0.34], lining: [0.22, 0.22, 0.20], button: [0.40, 0.41, 0.38], buttonMetal: 0.5,
    patch: [0.14, 0.19, 0.17], litzen: [0.62, 0.63, 0.58], belt: [0.06, 0.055, 0.05], boot: [0.07, 0.065, 0.06], sole: [0.06, 0.05, 0.04],
    flap: 'scalloped', buckle: [0.52, 0.53, 0.52], skin: [0.80, 0.62, 0.51] },
};

/** Pano de lã: variação de cor, fio (sarja), borbotos e sujidade de baixo para cima. */
function wool(p, base, { dirt = 0.3, seed = 0 } = {}) {
  const lo = fbm([p[0] + seed, p[1], p[2]], 6, 3), mid = fbm(p, 40, 2), fine = noise3(p[0] * 700, p[1] * 700, p[2] * 700);
  const twill = Math.sin((p[0] * 0.7 + p[1] + p[2] * 0.7) * Math.PI * 2 / 0.004) * 0.5 + 0.5;
  let c = mul(base, 1 + lo * 0.07 + mid * 0.05 + fine * 0.03 + (twill - 0.5) * 0.025);
  const mud = smoothstep(0.55, 0.05, p[1]) * dirt * (0.6 + 0.4 * fbm(p, 9, 3));
  c = mix(c, [0.30, 0.25, 0.18], clamp(mud));
  return { c, r: 0.92 - mid * 0.03, m: 0, h: (twill - 0.5) * 0.00012 + fine * 0.00008 };
}

/**
 * Pintores para uma nação. ctx: { nat, J (articulações), lm (landmarks do vestuário), heads: [{variant, lm}] }.
 */
export function makePainters({ nat, J, lm, heads = [] }) {
  const N = NATIONS[nat];
  const front = (p, n) => n[2] < -0.3 && p[2] < J.spine_02[2] + 0.02;
  const chestTop = J.spine_03[1] + 0.085;
  const pockets = [
    ...[-1, 1].map(s => ({ cx: s * 0.094, top: chestTop, hw: 0.056, hh: 0.066, flap: 0.044 })),
    ...[-1, 1].map(s => ({ cx: s * 0.118, top: lm.waistY - 0.032, hw: 0.073, hh: 0.085, flap: 0.054 })),
  ];
  const buttonsY = [J.neck[1] - 0.06, J.neck[1] - 0.155, J.neck[1] - 0.25, J.neck[1] - 0.345, lm.waistY - 0.085];

  /** Elementos do peito/aba: devolve alterações de cor e relevo. */
  function tunicFront(p, n, out) {
    if (!front(p, n)) return out;
    const x = p[0], y = p[1];
    for (const pk of pockets) {
      const cy = pk.top - pk.hh, d = sdBox(x, y, pk.cx, cy, pk.hw, pk.hh, 0.006);
      if (d > 0.006) continue;
      const dx = x - pk.cx, u = Math.abs(dx) / pk.hw;
      const flapBottom = N.flap === 'pointed' ? pk.top - pk.flap * (0.72 + 0.28 * (1 - u))
        : pk.top - pk.flap * (0.7 + 0.18 * Math.abs(Math.sin(u * Math.PI)) + 0.3 * Math.max(0, 1 - u * 4));
      const inFlap = y > flapBottom && y < pk.top + 0.006 && Math.abs(dx) < pk.hw + 0.004;
      if (d < 0) {
        out.h += 0.0014;
        // Prega central da bolsa.
        const pleat = Math.abs(Math.abs(dx) - 0.016);
        if (!inFlap) { out.h -= 0.0006 * (1 - smoothstep(0.0005, 0.002, pleat)); out.c = mul(out.c, 1 - 0.18 * (1 - smoothstep(0.0005, 0.0018, pleat))); }
        out.c = mul(out.c, 1 - 0.25 * stitch(d, 0.003, y + x));
      } else out.c = mul(out.c, 1 - 0.3 * (1 - smoothstep(0, 0.004, d)));    // sombra junto à costura
      if (inFlap) {
        const df = Math.max(-(y - flapBottom), Math.abs(dx) - pk.hw - 0.004, y - pk.top - 0.006);
        out.h += 0.0018 + 0.0008 * smoothstep(0, -0.004, df);
        out.c = mul(out.c, (1 - 0.3 * stitch(df, 0.003, x * 1.3 + y)) * 1.04);
      } else if (y < flapBottom && y > flapBottom - 0.01 && d < 0) out.c = mul(out.c, 1 - 0.28 * (1 - smoothstep(0, 0.008, flapBottom - y)));
      const b = button(Math.hypot(dx, y - (pk.top - pk.flap * 0.78)), 0.0085);
      if (b) Object.assign(out, buttonPaint(out, b));
    }
    // Carcela: costura da abertura e botões de frente.
    const placket = x + 0.014;
    if (y > lm.waistY - 0.17 && y < J.neck[1]) {
      out.c = mul(out.c, 1 - 0.35 * (1 - smoothstep(0.0007, 0.0022, Math.abs(placket))));
      out.h -= 0.0007 * (1 - smoothstep(0.0007, 0.002, Math.abs(placket)));
      out.c = mul(out.c, 1 - 0.2 * stitch(placket, -0.012, y));
    }
    for (const by of buttonsY) { const b = button(Math.hypot(x, y - by), 0.0095); if (b) Object.assign(out, buttonPaint(out, b)); }
    return out;
  }
  function buttonPaint(out, b) {
    const base = mul(N.button, 0.75 + 0.35 * (1 - b.k) - 0.25 * b.rim);
    return { c: base, r: 0.45, m: N.buttonMetal, h: out.h + b.h };
  }
  /** Platinas (dragonas) nos ombros, com botão junto à gola. */
  function shoulderStraps(p, n, out) {
    if (n[1] < 0.25) return out;
    for (const s of [-1, 1]) {
      const along = s * p[0], zc = J.upperarm_l[2] + 0.005;
      if (along < 0.055 || along > 0.2) continue;
      const d = Math.max(Math.abs(p[2] - zc) - 0.022, 0.06 - along, along - 0.185);
      if (d > 0.004) continue;
      if (d < 0) { out.h += 0.0018; out.c = mul(out.c, (1 - 0.25 * stitch(d, 0.0025, along)) * 1.03); if (N.litzen) out.c = mix(out.c, N.patch, 0.85); }
      else out.c = mul(out.c, 0.8);
      const b = button(Math.hypot(along - 0.075, p[2] - zc), 0.0075);
      if (b) Object.assign(out, buttonPaint(out, b));
    }
    return out;
  }
  /** Sombra/ desgaste: sob o cinto e a gola, cotovelos e joelhos gastos. */
  const wear = (p, base) => {
    const elbow = Math.min(v3.dist(p, J.lowerarm_l), v3.dist(p, J.lowerarm_r)), knee = Math.min(v3.dist(p, J.calf_l), v3.dist(p, J.calf_r));
    const w = Math.max(1 - smoothstep(0.02, 0.07, elbow), 1 - smoothstep(0.03, 0.09, knee)) * (0.5 + 0.5 * fbm(p, 30, 2));
    return mix(base, mul(base, 1.18), clamp(w) * 0.6);
  };
  const cuff = (p, out) => {
    for (const s of ['l', 'r']) {
      const ax = v3.norm(v3.sub(J[`hand_${s}`], J[`lowerarm_${s}`])), t = v3.dot(v3.sub(p, J[`hand_${s}`]), ax);
      if (Math.sign(p[0]) !== Math.sign(J[`hand_${s}`][0]) || t < -0.16 || t > 0.02) continue;
      const line = 1 - smoothstep(0.0006, 0.0016, Math.abs(t + 0.075));
      out.c = mul(out.c, 1 - 0.3 * line); out.h -= 0.0005 * line;
      out.c = mul(out.c, 1 - 0.18 * stitch(t + 0.075, 0.004, Math.atan2(p[2], p[1]) * 0.03));
    }
    return out;
  };

  const painters = {
    tunic: ({ p, n }) => {
      let o = wool(p, N.cloth, { dirt: 0.2 });
      o.c = wear(p, o.c);
      const belt = Math.abs(p[1] - lm.waistY);
      o.c = mul(o.c, 0.8 + 0.2 * smoothstep(0.024, 0.045, belt));
      // Costura das mangas (cava) e costas.
      const seam = Math.min(...['l', 'r'].map(s => Math.abs(v3.dist(p, v3.add(J[`upperarm_${s}`], [0, 0.01, 0])) - 0.085)));
      if (Math.abs(p[0]) > 0.13) { o.c = mul(o.c, 1 - 0.25 * (1 - smoothstep(0.0008, 0.0022, seam))); o.h -= 0.0004 * (1 - smoothstep(0.0008, 0.002, seam)); }
      if (n[2] > 0.3 && Math.abs(p[0]) < 0.004) o.c = mul(o.c, 0.8);
      o = tunicFront(p, n, o); o = shoulderStraps(p, n, o); o = cuff(p, o);
      return o;
    },
    tunic_inner: ({ p }) => ({ ...wool(p, N.lining, { dirt: 0 }), r: 0.95 }),
    trousers: ({ p, n }) => {
      const o = wool(p, N.trousers, { dirt: 0.45, seed: 7 });
      o.c = wear(p, o.c);
      // Vinco lateral (costura exterior) e entrepernas.
      const side = Math.abs(n[0]) > 0.6 ? 1 - smoothstep(0.0008, 0.002, Math.abs(p[2] - (J.thigh_l[2] - 0.005))) : 0;
      o.c = mul(o.c, 1 - 0.22 * side);
      return o;
    },
    collar: ({ p, n }) => {
      let o = wool(p, nat === 'de' ? N.patch : N.cloth, { dirt: 0 });
      const ax = Math.abs(p[0]), fr = p[2] < J.neck[2] - 0.035 && n[2] < 0.2;
      if (nat === 'pl' && fr && ax > 0.012 && ax < 0.07) {
        // Patch azul-marinho com vivo verde-claro nas pontas da gola (certeza média: ASSETS.md, fonte T22).
        const top = J.neck[1] + 0.012, d = Math.max(0.014 - ax, ax - 0.066, p[1] - top);
        o.c = d > -0.0028 ? N.piping : mul(N.patch, 1 + fbm(p, 60, 2) * 0.08); o.h += 0.0005;
      }
      if (nat === 'de' && fr && ax > 0.016 && ax < 0.06) {
        // Litzen (galões duplos) cinzentos sobre fundo verde-escuro.
        const top = p[1] - J.neck[1], bars = [-0.019, -0.005].map(y0 => 1 - smoothstep(0.0022, 0.0036, Math.abs(top - y0)));
        const m = Math.max(...bars) * (1 - smoothstep(0.052, 0.058, ax));
        o.c = mix(o.c, N.litzen, m * 0.9); o.h += 0.0006 * m;
      }
      return o;
    },
    belt: ({ p, n }) => leatherBand(p, n, (p[1] - lm.waistY) / 0.024, N.belt, nat),
    boot: ({ p }) => {
      const lo = fbm(p, 14, 3), crease = Math.abs(Math.sin((p[1] * 1.0 + fbm(p, 20, 2) * 0.01) * Math.PI * 2 / 0.012));
      const ankle = 1 - smoothstep(0.06, 0.16, Math.abs(p[1] - 0.13));
      let c = mul(N.boot, 1 + lo * 0.15 - 0.2 * ankle * (1 - crease));
      c = mix(c, [0.32, 0.27, 0.2], smoothstep(0.1, 0.0, p[1]) * 0.35 * (0.5 + 0.5 * fbm(p, 25, 2)));
      return { c, r: 0.55 + lo * 0.1 + 0.2 * smoothstep(0.08, 0, p[1]), m: 0, h: -0.0004 * ankle * (1 - crease) };
    },
    sole: ({ p }) => ({ c: mul(N.sole, 1 + fbm(p, 30, 2) * 0.2), r: 0.9, m: 0, h: 0 }),
    puttee: ({ p }) => {
      const s = p[0] < 0 ? 'l' : 'r', c0 = J[`calf_${s}`];
      const ang = Math.atan2(p[0] - c0[0], p[2] - c0[2]), ph = (p[1] + ang / (Math.PI * 2) * 0.045 * (s === 'l' ? 1 : -1)) / 0.045;
      const f = ph - Math.floor(ph), edge = smoothstep(0, 0.12, f) * smoothstep(1, 0.88, f);
      const o = wool(p, N.puttee ?? N.cloth, { dirt: 0.6, seed: 3 });
      o.c = mul(o.c, 0.78 + 0.22 * edge); o.h += 0.0012 * edge;
      return o;
    },
    hands: ({ p, n, a }) => {
      const s = p[0] < 0 ? 'l' : 'r', out = Math.sign(p[0]);
      let c = skinBase(p, N.skin, {});
      const nail = smoothstep(0.55, 0.85, a.tip) * smoothstep(0.2, 0.6, n[0] * out) * (1 - smoothstep(0.5, 0.95, v3.dist(p, J[`hand_${s}`]) / 0.2));
      c = mix(c, [0.82, 0.68, 0.62], nail * 0.8);
      const grime = smoothstep(0.1, 0.6, fbm(p, 25, 3) + 0.15) * 0.35;
      c = mix(c, [0.25, 0.2, 0.15], grime);
      return { c, r: 0.6 - nail * 0.25, m: 0, h: 0 };
    },
    ...gearPainters(nat),
  };
  for (const { variant, lm: flm } of heads) {
    painters[`head:${variant.id}`] = ctx => headPaint(ctx, variant, flm);
    painters[`hair:${variant.id}`] = ({ p }) => hairPaint(p, variant);
    painters[`eye:${variant.id}`] = ({ uv, p }) => eyePaint(uv, p, variant);
  }
  return painters;
}

/** Couro: grão, bordas escurecidas; `across` vai de −1 a 1 na largura da correia. Fivela frontal no cinto. */
function leatherBand(p, n, across, color, nat) {
  const grain = fbm(p, 120, 2), lo = fbm(p, 10, 3);
  let c = mul(color, 1 + lo * 0.15 + grain * 0.06), h = grain * 0.0001, r = 0.55 + lo * 0.1, m = 0;
  const edge = 1 - Math.abs(across);
  c = mul(c, 1 - 0.25 * (1 - smoothstep(0.06, 0.16, edge)));
  c = mul(c, 1 - 0.2 * (1 - smoothstep(0.01, 0.03, Math.abs(edge - 0.14))));
  // Fivela frontal (alemã: chapa lisa, sem a águia; polaca: armação rectangular com travessa).
  if (nat !== 'none' && n[2] < -0.5 && Math.abs(p[0]) < 0.034) {
    const ax = Math.abs(p[0]), ay = Math.abs(across);
    if (nat === 'de') { const d = Math.max(ax - 0.031, ay - 0.95); c = mul([0.52, 0.53, 0.52], 1 + grain * 0.05 - 0.25 * (1 - smoothstep(-0.004, 0, d))); r = 0.4; m = 0.8; h += 0.002; }
    else if (ax > 0.025 || ay > 0.8 || ax < 0.003) { c = mul([0.45, 0.45, 0.43], 1 + grain * 0.05); r = 0.45; m = 0.8; h += 0.002; }
  }
  return { c, r, m, h };
}

function skinBase(p, base, v) {
  const lo = fbm(p, 18, 3), pores = noise3(p[0] * 900, p[1] * 900, p[2] * 900);
  let c = mul(base, 1 + lo * 0.04 + pores * 0.015);
  c = mix(c, [0.78, 0.45, 0.38], clamp(0.12 + lo * 0.1));
  if (v.sunburn) c = mix(c, [0.68, 0.42, 0.30], v.sunburn * 0.35);
  return c;
}

function headPaint({ p, n, a }, v, flm) {
  let c = skinBase(p, v.skin, v), h = 0, r = 0.55;
  // Rubor: bochechas, nariz, orelhas; lábios.
  c = mix(c, [0.78, 0.42, 0.38], clamp(a.cheeks * 0.25 + a.nose * 0.15 + a.ears * 0.2) * (1 + (v.sunburn ?? 0)));
  c = mix(c, [0.62, 0.36, 0.34], a.lips * 0.65); r -= a.lips * 0.15;
  // Órbitas e pálpebras: sombra (cansaço).
  const eyeD = Math.min(v3.dist(p, flm.eyeL), v3.dist(p, flm.eyeR));
  const socket = (1 - smoothstep(0.012, 0.03, eyeD)) * (p[1] < flm.eyeMid[1] ? 1 : 0.5);
  c = mul(c, 1 - socket * (0.12 + 0.2 * (v.tired ?? 0)));
  c = mix(c, [0.5, 0.36, 0.38], socket * 0.25 * (v.tired ?? 0));
  const hairC = mix(v.hair, [0.6, 0.6, 0.58], v.grey ?? 0);
  // Sobrancelhas: fios em direcção à têmpora.
  const strands = noise3(p[0] * 600, p[1] * 2500, p[2] * 600) * 0.5 + 0.5;
  c = mix(c, mul(hairC, 0.8), clamp(a.brows * (0.55 + 0.45 * strands)));
  // Barba (por fazer), bigode e couro cabeludo sob a casca de cabelo.
  const speck = hash(Math.floor(p[0] * 1500), Math.floor(p[1] * 1500), Math.floor(p[2] * 1500));
  c = mix(c, mix(mul(hairC, 0.7), [0.30, 0.30, 0.32], 0.3), clamp(a.beard * (v.stubble ?? 0) * (0.45 + 0.35 * speck)));
  if (v.moustache) { c = mix(c, mul(hairC, 0.85), clamp(a.moustache * v.moustache * (0.7 + 0.3 * strands))); h += a.moustache * v.moustache * 0.0012; }
  c = mix(c, mul(hairC, 0.75), clamp(a.hair * 1.2));
  // Rugas na testa e pés-de-galinha.
  if (v.wrinkles) {
    const fy = p[1] - flm.eyeMid[1];
    const forehead = smoothstep(0.03, 0.04, fy) * smoothstep(0.075, 0.06, fy) * smoothstep(0.05, 0.02, Math.abs(p[0])) * (n[2] < -0.5 ? 1 : 0);
    const lines = Math.max(0, Math.sin(fy * Math.PI * 2 / 0.0085 + fbm(p, 40, 2) * 2)) ** 3;
    const crow = (1 - smoothstep(0.035, 0.05, eyeD)) * smoothstep(0.03, 0.04, Math.abs(p[0])) * Math.max(0, Math.sin(Math.atan2(p[1] - flm.eyeMid[1], Math.abs(p[0])) * 18)) ** 4;
    const w = v.wrinkles * (forehead * lines + crow * 0.6);
    h -= w * 0.0006; c = mul(c, 1 - w * 0.12);
  }
  if (v.freckles) {
    const cell = hash(Math.floor(p[0] * 400), Math.floor(p[1] * 400), Math.floor(p[2] * 400) + 11);
    const zone = smoothstep(0.03, 0.0, Math.abs(p[1] - (flm.eyeMid[1] - 0.025))) * (n[2] < -0.3 ? 1 : 0);
    c = mix(c, [0.55, 0.33, 0.2], (cell > 0.8 ? 0.45 : 0) * zone * v.freckles);
  }
  if (v.grime) {
    const g = smoothstep(0.15, 0.45, fbm([p[0] + 3, p[1], p[2]], 22, 3)) * v.grime;
    c = mix(c, [0.2, 0.17, 0.13], g * 0.55); r += g * 0.1;
  }
  return { c, r, m: 0, h };
}

function hairPaint(p, v) {
  const hairC = mix(v.hair, [0.6, 0.6, 0.58], v.grey ?? 0);
  const s = noise3(p[0] * 900, p[1] * 300, p[2] * 300) * 0.5 + 0.5, lo = fbm(p, 30, 2);
  const greyHair = (v.grey ?? 0) * (hash(Math.floor(p[0] * 2000), Math.floor(p[1] * 700), Math.floor(p[2] * 2000)) > 0.6 ? 1 : 0);
  return { c: mix(mul(hairC, 0.7 + 0.45 * s + lo * 0.1), [0.7, 0.7, 0.68], greyHair * 0.6), r: 0.6, m: 0, h: (s - 0.5) * 0.0003 };
}

function eyePaint(uv, p, v) {
  // v local do loft ≈ (1 − cos θ)/2, com θ medido a partir do pólo da frente.
  const th = Math.acos(clamp(1 - 2 * uv[1], -1, 1));
  if (th < 0.2) return { c: [0.02, 0.02, 0.02], r: 0.05, m: 0, h: 0 };
  if (th < 0.5) {
    const rad = noise3(Math.atan2(p[1], p[0]) * 30, th * 40, 0) * 0.5 + 0.5, ring = smoothstep(0.42, 0.5, th);
    return { c: mul(v.eyes, (0.75 + 0.5 * rad) * (1 - ring * 0.55) * (th < 0.27 ? 0.8 : 1)), r: 0.08, m: 0, h: 0 };
  }
  const vein = smoothstep(0.9, 1.6, th) * 0.25;
  return { c: mix([0.86, 0.83, 0.78], [0.8, 0.55, 0.5], vein), r: 0.1, m: 0, h: 0 };
}

/** Equipamento e armas (peças em loft; uv local). */
function gearPainters(nat) {
  const steel = nat === 'pl' ? [0.33, 0.34, 0.24] : [0.33, 0.36, 0.33];
  return {
    // Capacete: aço pintado mate; textura granulada (wz.31 polaco mais rugoso), lascas de tinta e aço por baixo.
    helmet: ({ p }) => {
      const grit = noise3(p[0] * 800, p[1] * 800, p[2] * 800), lo = fbm(p, 12, 3), chip = fbm([p[0] + 9, p[1], p[2]], 60, 3);
      const chipped = smoothstep(0.42, 0.5, chip);
      return { c: mix(mul(steel, 1 + lo * 0.12 + grit * (nat === 'pl' ? 0.06 : 0.03)), [0.28, 0.27, 0.26], chipped * 0.8),
        r: nat === 'pl' ? 0.82 : 0.68, m: chipped * 0.8, h: grit * (nat === 'pl' ? 0.0002 : 0.00008) - chipped * 0.0002 };
    },
    helmet_inner: ({ p }) => ({ c: mul([0.22, 0.15, 0.09], 1 + fbm(p, 40, 2) * 0.2), r: 0.6, m: 0, h: 0 }),
    cap: ({ p }) => wool(p, NATIONS[nat].cloth, { dirt: 0 }),
    // Rogatywka de campanha wz.37: cinta do mesmo pano, um pouco mais escura (a cinta azul é do boné de passeio).
    cap_band: ({ p }) => wool(p, mul(NATIONS[nat].cloth, 0.82), { dirt: 0 }),
    badge: ({ p }) => ({ c: mul([0.7, 0.7, 0.68], 1 + fbm(p, 200, 2) * 0.1), r: 0.35, m: 0.9, h: 0.0006 }),
    leather: ({ p, uv }) => leatherBand(p, [0, 1, 0], uv[1] * 2 - 1, nat === 'pl' ? NATIONS.pl.belt : NATIONS.de.belt, 'none'),
    leather_light: ({ p, uv }) => leatherBand(p, [0, 1, 0], uv[1] * 2 - 1, nat === 'pl' ? [0.42, 0.27, 0.13] : NATIONS.de.belt, 'none'),
    canvas: ({ p, uv }) => {
      const base = nat === 'pl' ? [0.40, 0.37, 0.25] : [0.37, 0.34, 0.25];
      const weave = (Math.sin(uv[0] * 900) * Math.sin(uv[1] * 900)) * 0.5 + 0.5;
      return { c: mul(base, 1 + fbm(p, 20, 3) * 0.12 + weave * 0.04), r: 0.95, m: 0, h: weave * 0.00015 };
    },
    canteen_cloth: ({ p }) => wool(p, nat === 'pl' ? [0.36, 0.34, 0.24] : [0.33, 0.31, 0.24], { dirt: 0 }),
    painted_metal: ({ p }) => ({ c: mul(steel, 1 + fbm(p, 25, 3) * 0.1), r: 0.7, m: 0.15, h: 0 }),
    blued: ({ p }) => { const w = fbm(p, 50, 3); return { c: mul([0.13, 0.13, 0.14], 1 + w * 0.25), r: 0.38 + w * 0.1, m: 0.85, h: 0 }; },
    bare_metal: ({ p }) => ({ c: mul([0.45, 0.45, 0.46], 1 + fbm(p, 80, 2) * 0.1), r: 0.3, m: 1, h: 0 }),
    brass: ({ p }) => ({ c: mul([0.72, 0.56, 0.28], 1 + fbm(p, 80, 2) * 0.12), r: 0.3, m: 1, h: 0 }),
    wood: ({ p }) => {
      // Nogueira/faia envernizada: veios ao longo do eixo da arma (−Z) com anéis deformados por ruído.
      const ring = Math.sin((p[0] * 40 + p[1] * 120 + fbm(p, 8, 3) * 6) * Math.PI) * 0.5 + 0.5;
      const base = nat === 'pl' ? [0.36, 0.20, 0.10] : [0.40, 0.24, 0.12];
      return { c: mul(base, 0.8 + 0.3 * ring + fbm(p, 60, 2) * 0.08), r: 0.45 + ring * 0.1, m: 0, h: (ring - 0.5) * 0.00006 };
    },
    // Pano de linho cru, sujo de óleo e pó (limpeza da rkm).
    rag: ({ p }) => {
      const oil = smoothstep(0.1, 0.5, fbm([p[0] + 3, p[1], p[2]], 30, 3)), weave = fbm(p, 400, 1);
      return { c: mix(mul([0.74, 0.70, 0.6], 1 + weave * 0.08), [0.25, 0.22, 0.18], oil * 0.7), r: 0.9 - oil * 0.3, m: 0, h: weave * 0.0002 };
    },
    shovel_handle: ({ p }) => ({ c: mul([0.50, 0.38, 0.24], 0.85 + fbm(p, 40, 3) * 0.2), r: 0.7, m: 0, h: 0 }),
    rank: ({ p }) => ({ c: mul([0.78, 0.74, 0.6], 1 + fbm(p, 100, 2) * 0.1), r: 0.5, m: 0.4, h: 0.0004 }),
  };
}

export { NATIONS };
