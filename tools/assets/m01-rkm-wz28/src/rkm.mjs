// rkm wz.28 (Browning BAR polaca, 1928–1939) em loft/torno, original. Referencial da arma = referencial do osso
// `weapon` do rig dos soldados (tools/assets/m01-soldiers): origem perto do punho, cano para −Z, +Y para cima, lado
// direito da arma em +X. As medidas marcadas [T31] vêm das fontes; as restantes são estimativas (ver MEASURES).
import { loft, lathe, strap, place, axesFrom } from '../../m01-soldiers/src/geom.mjs';
import { orientOutward } from '../../m01-soldiers/src/garments.mjs';
import { v3, clamp } from '../../m01-soldiers/src/meshops.mjs';
import { fbm, noise3 } from '../../m01-soldiers/src/noise.mjs';

/** Secção superelíptica no plano XY, centrada em (cx, cy) à cota z. */
function section(cx, cy, z, w, h, { n = 16, e = 0.45 } = {}) {
  const r = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    r.push([cx + Math.sign(c) * Math.abs(c) ** e * w / 2, cy + Math.sign(s) * Math.abs(s) ** e * h / 2, z]);
  }
  return r;
}
const tube = (r0, r1, z0, z1, y, { segments = 12, x = 0 } = {}) => {
  const p = lathe((t, phi) => { const r = r0 + (r1 - r0) * t; return [x + Math.cos(phi) * r, y + Math.sin(phi) * r, z0 + (z1 - z0) * t]; }, { rings: 1, segments, caps: 'both' });
  return orientOutward(p, q => [x, y, q[2]]);
};
const tag = (part, name, paint, group = 'rkm_body') => Object.assign(part, { name, paint, group });
/** Bloco de 8 lados (cantos boleados) [w, h, d] centrado em c. */
function blk([w, h, d], c, e = 0.2) {
  const p = loft([section(c[0], c[1], c[2] + d / 2, w, h, { n: 8, e }), section(c[0], c[1], c[2] - d / 2, w, h, { n: 8, e })], { caps: 'both' });
  return orientOutward(p, c);
}
/** Haste de a a b (raio r0 → r1). */
function rod(a, b, r0, r1 = r0, segments = 10) {
  const d = v3.sub(b, a), L = v3.len(d), dir = v3.norm(d);
  const p = tube(r0, r1, 0, L, 0, { segments });
  place(p, a, axesFrom(dir, Math.abs(dir[1]) > 0.9 ? [0, 0, 1] : [0, 1, 0]));
  return orientOutward(p, q => v3.add(a, v3.mul(dir, v3.dot(v3.sub(q, a), dir))));
}
/** Loft de secções ao longo de um caminho: [centro, largura, altura]. */
function sweep(path, { n = 14, e = 0.45, side = [1, 0, 0] } = {}) {
  const rings = path.map(([c, w, h], k) => {
    const t = v3.norm(v3.sub(path[Math.min(k + 1, path.length - 1)][0], path[Math.max(k - 1, 0)][0]));
    const x = v3.norm(v3.sub(side, v3.mul(t, v3.dot(side, t)))), y = v3.cross(t, x), r = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a);
      r.push(v3.add(c, v3.add(v3.mul(x, Math.sign(cs) * Math.abs(cs) ** e * w / 2), v3.mul(y, Math.sign(sn) * Math.abs(sn) ** e * h / 2))));
    }
    return r;
  });
  const P = path.map(x => x[0]);
  return orientOutward(loft(rings, { caps: 'both' }), q => P.reduce((b, c) => v3.dist(c, q) < v3.dist(b, q) ? c : b, P[0]));
}

/** Pontos-chave (metros, referencial da arma). Pivôs das peças móveis: carregador, alavanca de armar, bípode. */
export const RKM = {
  length: 1.11, barrel: 0.611, mass_kg: 9.0, rounds: 20, rate_rpm: 600,
  muzzleZ: -0.755, buttZ: 0.362, breechZ: -0.144, boreY: 0.035,
  mag: [0, -0.03, -0.112], handle: [-0.017, -0.004, -0.07], handleTravel: 0.1,
  bipod: { mount: [0, -0.004, -0.585], open: [0.12, -0.262, -0.655], folded: [0.017, -0.034, -0.33] },
};

/**
 * Proveniência de cada medida (manifest.json → measures). source: fonte da tabela de research/SOURCES.md (T31, ainda
 * RESUMO); estimated: true quando a medida foi desenhada por comparação visual com o BAR/FN de referência.
 */
export const MEASURES = [
  { id: 'length_total', value_m: 1.11, source: 'T31', estimated: false, note: 'comprimento total 1110 mm (certeza MÉDIA)' },
  { id: 'barrel', value_m: 0.611, source: 'T31', estimated: false, note: 'cano 611 mm, da face da culatra (z −0,144, dentro da caixa) à boca' },
  { id: 'mass', value_kg: 9.0, source: 'T31', estimated: false, note: 'massa vazia 9,0 kg (há fontes com 9,5 kg); não afecta a geometria' },
  { id: 'magazine', value_m: [0.03, 0.118, 0.086], source: 'BAR M1918 (proporções)', estimated: true, note: '20 cartuchos 7,92×57 [T31]; largura × saliência × profundidade estimadas' },
  { id: 'bipod_position', value_m: -0.585, source: 'T31', estimated: true, note: 'no tubo de gases logo atrás do regulador [T31]; cota z estimada' },
  { id: 'bipod_legs', value_m: 0.27, source: 'fotos de museu (resumo)', estimated: true, note: 'pernas tubulares com patins (płozy) [T31]; comprimento e abertura estimados' },
  { id: 'stock', value_m: 0.31, source: 'BAR M1918 (proporções)', estimated: true, note: 'coronha de madeira do fim da caixa à chapa' },
  { id: 'receiver', value_m: [0.034, 0.09, 0.296], source: 'BAR M1918 (proporções)', estimated: true, note: 'caixa da culatra, largura × altura × comprimento' },
  { id: 'pistol_grip', value_m: 0.11, source: 'T31', estimated: true, note: 'punho de pistola inclinado para trás (tipo Colt Monitor) [T31]; ângulo e comprimento estimados' },
  { id: 'sights', value_m: [0.088, 0.069], source: 'T31', estimated: true, note: 'alça em quadro 300–1600 m e massa prismática [T31]; alturas acima do eixo estimadas' },
  { id: 'muzzle', value_m: null, source: null, estimated: true, note: 'boca lisa com base da massa; tapa-chamas/forma exacta por confirmar' },
];

/** Peças por grupo (malha final): rkm_body, rkm_magazine, rkm_charging_handle, rkm_bipod_folded, rkm_bipod_open. */
export function buildRkm() {
  const parts = [], B = RKM.boreY;
  // Coronha (madeira) da traseira da caixa à chapa; linha recta com o cano (herdada do BAR).
  const stock = loft([[0.355, -0.025, 0.042, 0.125], [0.33, -0.024, 0.042, 0.123], [0.2, -0.012, 0.039, 0.097], [0.1, 0.0, 0.036, 0.072], [0.052, 0.007, 0.034, 0.058]]
    .map(([z, y, w, h]) => section(0, y, z, w, h, { n: 18, e: 0.5 })), { caps: 'both' });
  parts.push(tag(orientOutward(stock, q => [0, -0.01, q[2]]), 'stock', 'wood'));
  parts.push(tag(blk([0.044, 0.127, 0.008], [0, -0.025, 0.358]), 'buttplate', 'blued'));
  // Caixa da culatra (aço), quase rectangular, mais baixa atrás.
  const rec = loft([[0.06, 0.012, 0.034, 0.07], [0.0, 0.015, 0.034, 0.088], [-0.2, 0.015, 0.034, 0.09], [-0.236, 0.017, 0.032, 0.084]]
    .map(([z, y, w, h]) => section(0, y, z, w, h, { n: 16, e: 0.22 })), { caps: 'both' });
  parts.push(tag(orientOutward(rec, q => [0, 0.015, q[2]]), 'receiver', 'blued'));
  // Punho de pistola (madeira) inclinado para trás, guarda-mato e gatilho à frente, selector à esquerda.
  const gTop = [0, -0.028, 0.03], gBot = [0, -0.128, 0.078];
  parts.push(tag(sweep([[gTop, 0.03, 0.04], [v3.lerp(gTop, gBot, 0.5), 0.032, 0.046], [gBot, 0.03, 0.044]], { n: 16, e: 0.55 }), 'grip', 'wood'));
  const tg = []; for (let k = 0; k <= 10; k++) { const a = Math.PI * k / 10; tg.push([0, -0.03 - Math.sin(a) * 0.03, 0.025 - k / 10 * 0.075]); }
  parts.push(tag(strap(tg, tg.map(() => [1, 0, 0]), { width: 0.007, thickness: 0.012 }), 'trigger_guard', 'blued'));
  parts.push(tag(blk([0.005, 0.024, 0.007], [0, -0.038, -0.01]), 'trigger', 'blued'));
  parts.push(tag(blk([0.006, 0.012, 0.02], [-0.019, -0.012, -0.005]), 'selector', 'bare_metal'));
  // Cano à vista, tubo de gases por baixo, regulador e base da massa de mira.
  parts.push(tag(tube(0.0145, 0.011, -0.236, RKM.muzzleZ, B, { segments: 14 }), 'barrel', 'blued'));
  parts.push(tag(tube(0.0105, 0.0105, -0.236, -0.6, 0.0, { segments: 12 }), 'gas_tube', 'blued'));
  parts.push(tag(blk([0.026, 0.05, 0.032], [0, 0.016, -0.615]), 'gas_block', 'blued'));
  parts.push(tag(blk([0.024, 0.024, 0.026], [0, -0.003, -0.642]), 'gas_regulator', 'bare_metal'));
  parts.push(tag(blk([0.026, 0.03, 0.02], [0, B + 0.012, -0.735]), 'front_sight_base', 'blued'));
  parts.push(tag(blk([0.004, 0.018, 0.012], [0, B + 0.034, -0.735]), 'front_sight', 'blued'));
  // Alça em quadro com entalhe (300–1600 m) no topo traseiro da caixa.
  parts.push(tag(blk([0.026, 0.012, 0.05], [0, 0.065, 0.012]), 'rear_sight_base', 'blued'));
  for (const s of [-1, 1]) parts.push(tag(blk([0.004, 0.026, 0.008], [s * 0.009, 0.081, 0.03]), `rear_sight_frame_${s < 0 ? 'l' : 'r'}`, 'blued'));
  // Fuste de madeira à volta do tubo de gases (o cano fica à vista por cima).
  const fore = loft([[-0.24, -0.002, 0.046, 0.05], [-0.26, -0.004, 0.05, 0.056], [-0.45, -0.004, 0.05, 0.056], [-0.47, -0.002, 0.044, 0.048]]
    .map(([z, y, w, h]) => section(0, y, z, w, h, { n: 16, e: 0.6 })), { caps: 'both' });
  parts.push(tag(orientOutward(fore, q => [0, -0.003, q[2]]), 'forend', 'wood'));
  // Janela de ejecção (direita) e calha da alavanca (esquerda), em relevo escuro; abraçadeira do bípode.
  parts.push(tag(blk([0.003, 0.018, 0.06], [0.0175, 0.03, -0.08]), 'ejection_port', 'bare_metal'));
  parts.push(tag(blk([0.003, 0.01, 0.13], [-0.0175, -0.004, -0.12]), 'handle_slot', 'bare_metal'));
  const m = RKM.bipod.mount;
  parts.push(tag(blk([0.03, 0.03, 0.018], m), 'bipod_clamp', 'blued'));
  // Alavanca de armar (lado esquerdo): atrás = armada (ferrolho aberto); avança `handleTravel` em cada disparo.
  const h = RKM.handle;
  parts.push(tag(rod(h, [h[0] - 0.025, h[1], h[2]], 0.0045, 0.0045, 8), 'handle', 'bare_metal', 'rkm_charging_handle'));
  parts.push(tag(blk([0.012, 0.014, 0.014], [h[0] - 0.029, h[1], h[2]]), 'handle_knob', 'bare_metal', 'rkm_charging_handle'));
  // Carregador de 20: topo no poço, recto para baixo.
  const [mx, my, mz] = RKM.mag;
  parts.push(tag(blk([0.03, 0.118, 0.086], [mx, my - 0.059, mz]), 'magazine', 'blued', 'rkm_magazine'));
  parts.push(tag(blk([0.034, 0.008, 0.09], [mx, my - 0.12, mz]), 'magazine_floor', 'blued', 'rkm_magazine'));
  for (const s of [-1, 1]) parts.push(tag(blk([0.0025, 0.09, 0.012], [mx + s * 0.0152, my - 0.06, mz + 0.012]), `magazine_rib_${s < 0 ? 'l' : 'r'}`, 'blued', 'rkm_magazine'));
  // Bípode: pernas tubulares com patins (płozy), aberto (apoiado) e dobrado para trás ao longo do fuste.
  for (const state of ['open', 'folded']) for (const s of [-1, 1]) {
    const top = [s * 0.012, m[1] - 0.008, m[2]], f = RKM.bipod[state], foot = [s * f[0], f[1], f[2]], g = `rkm_bipod_${state}`;
    parts.push(tag(rod(top, foot, 0.0065, 0.0055), `leg_${s < 0 ? 'l' : 'r'}`, 'blued', g));
    const skid = blk([0.018, 0.005, 0.07], [0, 0, 0]);
    place(skid, [0, 0, 0], axesFrom(v3.mul(state === 'open' ? [0, 0, -1] : v3.norm(v3.sub(foot, top)), -1)));
    parts.push(tag(place(skid, v3.add(foot, [0, state === 'open' ? -0.003 : -0.004, 0])), `skid_${s < 0 ? 'l' : 'r'}`, 'blued', g));
  }
  for (const p of parts) p.texel = 1;
  return parts;
}

/** Pivôs dos nós móveis (a geometria do grupo é exportada relativa ao pivô). */
export const PIVOTS = { rkm_body: [0, 0, 0], rkm_magazine: RKM.mag, rkm_charging_handle: RKM.handle, rkm_bipod_folded: RKM.bipod.mount, rkm_bipod_open: RKM.bipod.mount };

/** Pontos de referência (referencial da arma), para mãos, efeitos e jogo. */
export function sockets() {
  const b = RKM.bipod;
  return {
    grip_r: [0, -0.06, 0.05], grip_l: [0, -0.03, -0.36], cheek: [0, 0.088, 0.205], muzzle: [0, RKM.boreY, RKM.muzzleZ],
    ejection_port: [0.018, 0.03, -0.08], charging_handle: [-0.046, -0.004, -0.07], charging_handle_forward: [-0.046, -0.004, -0.07 - RKM.handleTravel],
    mag_well: RKM.mag, rear_sight: [0, 0.088, 0.03], front_sight: [0, RKM.boreY + 0.043, -0.735], butt: [0, -0.025, 0.362],
    bipod_mount: b.mount, bipod_feet: [0, b.open[1] - 0.006, b.open[2]],
  };
}

const mul = (a, s) => a.map(x => x * s);
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
/** Pintores procedurais (originais): nogueira envernizada gasta, aço oxidado a azul com desgaste nas arestas, aço polido. */
export const PAINTERS = {
  wood: ({ p }) => {
    const warp = fbm(p, 7, 3), ring = Math.sin((p[0] * 30 + p[1] * 70 + warp * 9) * Math.PI) * 0.5 + 0.5;
    const pores = Math.max(0, noise3(p[0] * 900, p[1] * 900, p[2] * 90)) ** 3, dirt = clamp(fbm(p, 25, 3) * 0.8 + 0.2);
    const c = mix(mul([0.33, 0.19, 0.095], 0.82 + 0.3 * ring), [0.17, 0.11, 0.07], 0.25 * dirt + 0.4 * pores);
    return { c, r: 0.5 + ring * 0.12 + dirt * 0.1, m: 0, h: (ring - 0.5) * 0.00008 - pores * 0.00015 };
  },
  blued: ({ p, n }) => {
    const w = fbm(p, 50, 3), wear = clamp((fbm(p, 140, 2) - 0.25) * 3) * (n ? clamp(1 - Math.abs(n[0]) * 1.4) : 0.5);
    return { c: mix(mul([0.19, 0.195, 0.21], 1 + w * 0.25), [0.45, 0.45, 0.46], wear * 0.35), r: 0.42 + w * 0.1 - wear * 0.08, m: 0.55, h: 0 };
  },
  bare_metal: ({ p }) => ({ c: mul([0.5, 0.5, 0.51], 1 + fbm(p, 80, 2) * 0.1), r: 0.3, m: 0.7, h: 0 }),
};
