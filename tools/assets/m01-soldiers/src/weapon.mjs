// Armas originais em loft/torno: karabinek wz.29 (alavanca recta), Kar98k (alavanca dobrada), karabin wz.98a (longo,
// alavanca recta), rkm wz.28 (Browning polaca, carregador de 20, bípode com patins) e clipe de 5.
// Referencial da arma: origem no punho (mão direita), cano para −Z, +Y para cima, lado direito em +X.
// Medidas: wz.29 1,10 m, cano 0,60 m (research/weapons/kb_wz29.md); Kar98k ~1,11 m, cano 0,60 m;
// wz.98a 1,25 m, cano 0,74 m (kb_wz98a.md); rkm wz.28 1,11 m, cano 0,611 m (rkm_wz28.md).
import { loft, lathe, cylinder, roundedBox, strap, place, axesFrom } from './geom.mjs';
import { orientOutward } from './garments.mjs';
import { v3 } from './meshops.mjs';

/** Secção arredondada (superelipse) no plano XY, centrada em (cx, cy) à cota z. */
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
const tag = (part, name, paint, bone = 'weapon') => Object.assign(part, { name, paint, bone });

/** Coronha (perfil ao longo de z): [z, centro y, largura, altura]. */
const STOCK = {
  wz29: [[0.335, -0.045, 0.042, 0.128], [0.30, -0.042, 0.043, 0.124], [0.2, -0.032, 0.040, 0.100], [0.09, -0.018, 0.036, 0.062],
    [0.035, -0.012, 0.034, 0.048], [-0.01, -0.006, 0.040, 0.056], [-0.08, -0.004, 0.044, 0.060], [-0.25, 0.004, 0.044, 0.050],
    [-0.45, 0.010, 0.040, 0.040], [-0.62, 0.014, 0.036, 0.034], [-0.685, 0.016, 0.032, 0.030]],
  kar98k: [[0.345, -0.046, 0.044, 0.13], [0.31, -0.043, 0.045, 0.126], [0.2, -0.032, 0.041, 0.102], [0.09, -0.018, 0.036, 0.062],
    [0.035, -0.012, 0.034, 0.048], [-0.01, -0.006, 0.041, 0.056], [-0.08, -0.004, 0.045, 0.060], [-0.25, 0.004, 0.044, 0.050],
    [-0.45, 0.010, 0.040, 0.040], [-0.6, 0.014, 0.036, 0.034], [-0.675, 0.016, 0.032, 0.030]],
  // wz.98a (Gew 98 polaca): coronha um pouco mais comprida e fuste até perto da boca.
  wz98a: [[0.355, -0.047, 0.044, 0.132], [0.32, -0.044, 0.045, 0.128], [0.2, -0.032, 0.041, 0.102], [0.09, -0.018, 0.036, 0.062],
    [0.035, -0.012, 0.034, 0.048], [-0.01, -0.006, 0.041, 0.056], [-0.08, -0.004, 0.045, 0.060], [-0.25, 0.004, 0.044, 0.050],
    [-0.5, 0.010, 0.040, 0.040], [-0.7, 0.014, 0.036, 0.034], [-0.8, 0.016, 0.032, 0.030], [-0.815, 0.017, 0.030, 0.028]],
};
// Fuste superior, braçadeiras [z, largura], ponteira [z0, z1], massa de mira (z, orelhas) e bandoleira [z0, z1].
const SHORT = { handguard: [-0.27, -0.45, -0.62], bands: [[-0.45, 0.014], [-0.625, 0.022]], nose: [-0.68, -0.705], fs: -0.752, sling: [-0.45, 0.2] };
export const RIFLES = {
  wz29: { name: 'kb wz.29', length: 1.10, muzzleZ: -0.765, handle: 'straight', boltY: 0.034, boltZ: 0.0, ears: true, ...SHORT },
  kar98k: { name: 'Kar98k', length: 1.11, muzzleZ: -0.765, handle: 'bent', boltY: 0.034, boltZ: 0.0, ears: true, ...SHORT },
  // Massa de mira em lâmina sem capuz nem orelhas (os encaixes do capuz são posteriores).
  wz98a: { name: 'kb wz.98a', length: 1.25, muzzleZ: -0.895, handle: 'straight', boltY: 0.034, boltZ: 0.0, ears: false,
    handguard: [-0.27, -0.52, -0.77], bands: [[-0.52, 0.014], [-0.775, 0.022]], nose: [-0.82, -0.845], fs: -0.882, sling: [-0.52, 0.2] },
};

/** Peças da arma (coordenadas locais). Cada peça indica o osso: 'weapon' ou 'weapon_bolt'. */
export function buildRifle(kind = 'wz29') {
  const R = RIFLES[kind], parts = [];
  const stock = loft(STOCK[kind].map(([z, y, w, h]) => section(0, y, z, w, h, { n: 18 })), { caps: 'both' });
  parts.push(tag(orientOutward(stock, q => [0, -0.01, q[2]]), 'rifle_stock', 'wood'));
  // Guarda-mão superior (madeira) do anel do alvo até à braçadeira superior.
  const hg = loft(R.handguard.map((z, k) => section(0, 0.036, z, 0.03 - k * 0.002, 0.018, { n: 12 })), { caps: 'both' });
  parts.push(tag(orientOutward(hg, q => [0, 0.03, q[2]]), 'rifle_handguard', 'wood'));
  // Cano, caixa da culatra, ponteira.
  parts.push(tag(tube(0.0125, 0.0092, -0.25, R.muzzleZ, 0.032), 'rifle_barrel', 'blued'));
  parts.push(tag(tube(0.0165, 0.0165, 0.035, -0.25, 0.03, { segments: 14 }), 'rifle_receiver', 'blued'));
  // Braçadeiras e ponteira (aço).
  for (const [z, len] of R.bands) {
    const b = loft([section(0, 0.012, z + len / 2, 0.048, 0.07, { n: 14, e: 0.6 }), section(0, 0.014, z - len / 2, 0.046, 0.066, { n: 14, e: 0.6 })], { caps: 'both' });
    parts.push(tag(orientOutward(b, q => [0, 0.015, q[2]]), `rifle_band${z}`, 'blued'));
  }
  const nose = loft([section(0, 0.02, R.nose[0], 0.034, 0.04, { n: 12 }), section(0, 0.024, R.nose[1], 0.028, 0.032, { n: 12 })], { caps: 'both' });
  parts.push(tag(orientOutward(nose, q => [0, 0.022, q[2]]), 'rifle_nosecap', 'blued'));
  // Massa de mira com orelhas (wz.29) / capuz em arco aberto (Kar98k sem capuz em 1939: base com orelhas baixas).
  const fs = roundedBox([0.018, 0.016, 0.02], { r: 0.003, segments: 12, rings: 3 });
  parts.push(tag(place(fs, [0, 0.046, R.fs]), 'rifle_frontsight_base', 'blued'));
  if (R.ears) for (const s of [-1, 1]) parts.push(tag(place(roundedBox([0.003, 0.016, 0.012], { r: 0.001, segments: 8, rings: 2 }), [s * 0.008, 0.058, R.fs]), `rifle_ear${s}`, 'blued'));
  parts.push(tag(place(roundedBox([0.002, 0.01, 0.004], { r: 0.0008, segments: 8, rings: 2 }), [0, 0.06, R.fs]), 'rifle_blade', 'blued'));
  // Alça tangente.
  parts.push(tag(place(roundedBox([0.026, 0.014, 0.07], { r: 0.004, segments: 12, rings: 3 }), [0, 0.048, -0.29]), 'rifle_rearsight', 'blued'));
  // Guarda-mato e gatilho; base do carregador.
  const tg = []; for (let k = 0; k <= 10; k++) { const a = Math.PI * k / 10; tg.push([0, -0.032 - Math.sin(a) * 0.028, -0.005 - k / 10 * 0.095]); }
  parts.push(tag(strap(tg, tg.map(() => [1, 0, 0]), { width: 0.006, thickness: 0.012 }), 'rifle_guard', 'blued'));
  parts.push(tag(place(roundedBox([0.03, 0.008, 0.085], { r: 0.003, segments: 12, rings: 2 }), [0, -0.036, -0.105]), 'rifle_floorplate', 'blued'));
  parts.push(tag(place(roundedBox([0.004, 0.022, 0.006], { r: 0.0015, segments: 8, rings: 2 }), [0, -0.035, -0.03]), 'rifle_trigger', 'blued'));
  // Chapa da coronha.
  parts.push(tag(place(roundedBox([0.044, 0.128, 0.006], { r: 0.012, segments: 14, rings: 2 }), [0, -0.045, STOCK[kind][0][0] + 0.003]), 'rifle_buttplate', 'blued'));
  // Bandoleira de couro: wz.29 por baixo; Kar98k pela fenda lateral esquerda da coronha.
  const sl = [], side = kind === 'kar98k' ? -0.024 : 0;
  const [s0, s1] = R.sling;
  for (let k = 0; k <= 14; k++) { const t = k / 14; sl.push([side, (kind === 'kar98k' ? -0.03 : -0.06) - Math.sin(Math.PI * t) * 0.07, s0 + t * (s1 - s0 + (kind === 'kar98k' ? -0.03 : 0))]); }
  parts.push(tag(strap(sl, sl.map(() => [kind === 'kar98k' ? -1 : 0, kind === 'kar98k' ? 0 : -1, 0]), { width: 0.025, thickness: 0.003 }), 'rifle_sling', 'leather'));
  // Ferrolho (osso weapon_bolt): corpo, peça de armar e alavanca (recta no wz.29, dobrada na Kar98k).
  const by = R.boltY, bz = R.boltZ;
  parts.push(tag(tube(0.0095, 0.0095, 0.075, -0.06, by, { segments: 12 }), 'rifle_bolt_body', 'bare_metal', 'weapon_bolt'));
  parts.push(tag(place(roundedBox([0.02, 0.022, 0.03], { r: 0.006, segments: 12, rings: 3 }), [0, by, 0.085]), 'rifle_bolt_shroud', 'blued', 'weapon_bolt'));
  const hp = R.handle === 'straight' ? [[0, by, bz + 0.03], [0.03, by, bz + 0.032], [0.06, by - 0.002, bz + 0.036]]
    : [[0, by, bz + 0.03], [0.026, by - 0.004, bz + 0.034], [0.04, by - 0.028, bz + 0.046], [0.044, by - 0.048, bz + 0.05]];
  parts.push(tag(strap(hp, hp.map(() => [0, 1, 0]), { width: 0.008, thickness: 0.007 }), 'rifle_bolt_handle', 'bare_metal', 'weapon_bolt'));
  const knob = lathe((t, phi) => { const th = t * Math.PI, r = 0.0105; return [Math.cos(phi) * r * Math.sin(th), -r * Math.cos(th), Math.sin(phi) * r * Math.sin(th)]; }, { rings: 6, segments: 10 });
  parts.push(tag(orientOutward(place(knob, hp.at(-1)), hp.at(-1)), 'rifle_bolt_knob', 'bare_metal', 'weapon_bolt'));
  for (const p of parts) p.texel = 0.9;
  return { parts, sockets: rifleSockets(R), info: R, kind };
}

/** Bloco barato (secção quase rectangular, 8 lados) centrado em c, de [largura, altura, comprimento em z]. */
function blk([w, h, d], c, e = 0.2) {
  const p = loft([section(c[0], c[1], c[2] + d / 2, w, h, { n: 8, e }), section(c[0], c[1], c[2] - d / 2, w, h, { n: 8, e })], { caps: 'both' });
  return orientOutward(p, c);
}

/** Haste/tubo de a a b (raio r0 → r1). */
function rod(a, b, r0, r1 = r0, segments = 10) {
  const d = v3.sub(b, a), L = v3.len(d), dir = v3.norm(d);
  const p = tube(r0, r1, 0, L, 0, { segments });
  place(p, a, axesFrom(dir, Math.abs(dir[1]) > 0.9 ? [0, 0, 1] : [0, 1, 0]));
  return orientOutward(p, q => v3.add(a, v3.mul(dir, v3.dot(v3.sub(q, a), dir))));
}
/** Loft de secções superelípticas ao longo de um caminho (eixo lateral fixo `side`): [centro, largura, altura]. */
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
  const part = loft(rings, { caps: 'both' });
  const P = path.map(x => x[0]);
  return orientOutward(part, q => { let best = P[0], bd = Infinity; for (const c of P) { const d = v3.dist(c, q); if (d < bd) { bd = d; best = c; } } return best; });
}

/**
 * rkm wz.28 (Browning BAR polaca): coronha de madeira, punho de pistola inclinado, caixa da culatra, carregador de
 * 20 por baixo (osso weapon_mag), fuste em volta do tubo de gases, cano à vista, bípode no tubo de gases logo atrás
 * do regulador com patins (aberto e dobrado em malhas separadas) e alavanca de armar à esquerda (osso weapon_bolt).
 * Ferrolho aberto: na pose de ligação a alavanca está atrás (armada); dispara indo à frente.
 */
export const RKM = { name: 'rkm wz.28', length: 1.11, muzzleZ: -0.755, boreY: 0.035, mag: [0, -0.03, -0.112], handleTravel: 0.1,
  bipod: { mount: [0, -0.004, -0.585], open: [0.12, -0.262, -0.655], folded: [0.017, -0.034, -0.33] } };
export function buildRkm() {
  const parts = [], B = RKM.boreY;
  // Coronha (madeira) da traseira da caixa à chapa.
  const stock = loft([[0.355, -0.025, 0.042, 0.125], [0.33, -0.024, 0.042, 0.123], [0.2, -0.012, 0.039, 0.097], [0.1, 0.0, 0.036, 0.072], [0.052, 0.007, 0.034, 0.058]]
    .map(([z, y, w, h]) => section(0, y, z, w, h, { n: 18, e: 0.5 })), { caps: 'both' });
  parts.push(tag(orientOutward(stock, q => [0, -0.01, q[2]]), 'rkm_stock', 'wood'));
  parts.push(tag(blk([0.044, 0.127, 0.008], [0, -0.025, 0.358]), 'rkm_buttplate', 'blued'));
  // Caixa da culatra (aço), quase rectangular, mais baixa atrás.
  const rec = loft([[0.06, 0.012, 0.034, 0.07], [0.0, 0.015, 0.034, 0.088], [-0.2, 0.015, 0.034, 0.09], [-0.236, 0.017, 0.032, 0.084]]
    .map(([z, y, w, h]) => section(0, y, z, w, h, { n: 16, e: 0.22 })), { caps: 'both' });
  parts.push(tag(orientOutward(rec, q => [0, 0.015, q[2]]), 'rkm_receiver', 'blued'));
  // Punho de pistola (madeira) inclinado para trás, com guarda-mato e gatilho à frente.
  const gTop = [0, -0.028, 0.03], gBot = [0, -0.128, 0.078];
  parts.push(tag(sweep([[gTop, 0.03, 0.04], [v3.lerp(gTop, gBot, 0.5), 0.032, 0.046], [gBot, 0.03, 0.044]], { n: 16, e: 0.55 }), 'rkm_grip', 'wood'));
  const tg = []; for (let k = 0; k <= 10; k++) { const a = Math.PI * k / 10; tg.push([0, -0.03 - Math.sin(a) * 0.03, 0.025 - k / 10 * 0.075]); }
  parts.push(tag(strap(tg, tg.map(() => [1, 0, 0]), { width: 0.007, thickness: 0.012 }), 'rkm_guard', 'blued'));
  parts.push(tag(blk([0.005, 0.024, 0.007], [0, -0.038, -0.01]), 'rkm_trigger', 'blued'));
  // Selector (tiro a tiro / contínuo) no lado esquerdo, acima do gatilho.
  parts.push(tag(blk([0.006, 0.012, 0.02], [-0.019, -0.012, -0.005]), 'rkm_selector', 'bare_metal'));
  // Cano à vista, tubo de gases por baixo, regulador e base da massa de mira.
  parts.push(tag(tube(0.0145, 0.011, -0.236, RKM.muzzleZ, B, { segments: 14 }), 'rkm_barrel', 'blued'));
  parts.push(tag(tube(0.0105, 0.0105, -0.236, -0.6, 0.0, { segments: 12 }), 'rkm_gas_tube', 'blued'));
  parts.push(tag(blk([0.026, 0.05, 0.032], [0, 0.016, -0.615]), 'rkm_gas_block', 'blued'));
  parts.push(tag(blk([0.024, 0.024, 0.026], [0, -0.003, -0.642]), 'rkm_regulator', 'bare_metal'));
  parts.push(tag(blk([0.026, 0.03, 0.02], [0, B + 0.012, -0.735]), 'rkm_frontsight_base', 'blued'));
  parts.push(tag(blk([0.004, 0.018, 0.012], [0, B + 0.034, -0.735]), 'rkm_frontsight', 'blued'));
  // Alça em quadro com entalhe triangular (300–1600 m) no topo traseiro da caixa.
  parts.push(tag(blk([0.026, 0.012, 0.05], [0, 0.065, 0.012]), 'rkm_rearsight_base', 'blued'));
  for (const s of [-1, 1]) parts.push(tag(blk([0.004, 0.026, 0.008], [s * 0.009, 0.081, 0.03]), `rkm_rearsight_frame${s}`, 'blued'));
  // Fuste de madeira à volta do tubo de gases (o cano fica à vista por cima).
  const fore = loft([[-0.24, -0.002, 0.046, 0.05], [-0.26, -0.004, 0.05, 0.056], [-0.45, -0.004, 0.05, 0.056], [-0.47, -0.002, 0.044, 0.048]]
    .map(([z, y, w, h]) => section(0, y, z, w, h, { n: 16, e: 0.6 })), { caps: 'both' });
  parts.push(tag(orientOutward(fore, q => [0, -0.003, q[2]]), 'rkm_forend', 'wood'));
  // Janela de ejecção (direita) e calha da alavanca (esquerda), em relevo escuro.
  parts.push(tag(blk([0.003, 0.018, 0.06], [0.0175, 0.03, -0.08]), 'rkm_port', 'bare_metal'));
  parts.push(tag(blk([0.003, 0.01, 0.13], [-0.0175, -0.004, -0.12]), 'rkm_handle_slot', 'bare_metal'));
  // Alavanca de armar (osso weapon_bolt): atrás na pose de ligação.
  parts.push(tag(rod([-0.017, -0.004, -0.07], [-0.042, -0.004, -0.07], 0.0045, 0.0045, 8), 'rkm_handle', 'bare_metal', 'weapon_bolt'));
  parts.push(tag(blk([0.012, 0.014, 0.014], [-0.046, -0.004, -0.07]), 'rkm_handle_knob', 'bare_metal', 'weapon_bolt'));
  // Abraçadeira do bípode no tubo de gases.
  const m = RKM.bipod.mount;
  parts.push(tag(blk([0.03, 0.03, 0.018], m), 'rkm_bipod_clamp', 'blued'));
  for (const p of parts) p.texel = 0.9;
  // Carregador de 20 (osso weapon_mag): topo na origem do osso, recto para baixo.
  const mag = [];
  const [mx, my, mz] = RKM.mag;
  mag.push(tag(blk([0.03, 0.118, 0.086], [mx, my - 0.059, mz]), 'rkm_mag', 'blued', 'weapon_mag'));
  mag.push(tag(blk([0.034, 0.008, 0.09], [mx, my - 0.12, mz]), 'rkm_mag_floor', 'blued', 'weapon_mag'));
  for (const s of [-1, 1]) mag.push(tag(blk([0.0025, 0.09, 0.012], [mx + s * 0.0152, my - 0.06, mz + 0.012]), `rkm_mag_rib${s}`, 'blued', 'weapon_mag'));
  for (const p of mag) p.texel = 0.8;
  // Bípode: pernas tubulares com patins (płozy) — aberto (apoiado) e dobrado para trás ao longo do fuste.
  const bipod = state => {
    const ps = [];
    for (const s of [-1, 1]) {
      const top = [s * 0.012, m[1] - 0.008, m[2]], f = RKM.bipod[state], foot = [s * f[0], f[1], f[2]];
      ps.push(tag(rod(top, foot, 0.0065, 0.0055), `rkm_leg${s}`, 'blued'));
      const along = state === 'open' ? [0, 0, -1] : v3.norm(v3.sub(foot, top));
      const skid = blk([0.018, 0.005, 0.07], [0, 0, 0]);
      place(skid, [0, 0, 0], axesFrom(v3.mul(along, -1)));
      ps.push(tag(place(skid, v3.add(foot, state === 'open' ? [0, -0.003, 0] : [0, -0.004, 0])), `rkm_skid${s}`, 'blued'));
    }
    for (const p of ps) p.texel = 0.8;
    return ps;
  };
  return { parts, mag, bipodOpen: bipod('open'), bipodFolded: bipod('folded'), sockets: rkmSockets(), info: RKM };
}
export function rkmSockets() {
  const b = RKM.bipod;
  return {
    grip_r: [0, -0.06, 0.05], grip_l: [0, -0.03, -0.36], muzzle: [0, RKM.boreY, RKM.muzzleZ], ejection_port: [0.018, 0.03, -0.08],
    bolt_handle: [-0.046, -0.004, -0.07], bolt_handle_forward: [-0.046, -0.004, -0.07 - RKM.handleTravel], mag_well: RKM.mag,
    rear_sight: [0, 0.088, 0.03], butt: [0, -0.025, 0.36], bipod_mount: b.mount, bipod_feet: [-b.open[0], b.open[1] - 0.006, b.open[2]],
  };
}

/** Pano de limpeza amarrotado (Kowal limpa a rkm na abertura), centrado na origem do osso weapon_clip. */
export function buildRag() {
  const r = roundedBox([0.095, 0.04, 0.075], { r: 0.018, segments: 16, rings: 6, bulge: 0.2 }), P = r.positions;
  for (let i = 0; i < P.length; i += 3) {
    const [x, y, z] = [P[i], P[i + 1], P[i + 2]], k = 1 + 0.18 * Math.sin(x * 160 + z * 90) * Math.cos(y * 210 - z * 70) + 0.1 * Math.sin(z * 260);
    P[i] = x * k; P[i + 1] = y * (1 + 0.25 * Math.sin(x * 120 + 1.3)); P[i + 2] = z * k;
  }
  return [Object.assign(orientOutward(r, [0, 0, 0]), { name: 'rag', paint: 'rag', bone: 'weapon_clip', texel: 0.7 })];
}

/** Pontos de referência (referencial da arma) para animação e jogo. */
export function rifleSockets(R) {
  return {
    grip_r: [0, -0.01, 0.03], grip_l: [0, 0.0, -0.36], muzzle: [0, 0.032, R.muzzleZ], ejection_port: [0.012, 0.045, -0.07],
    bolt_axis: [0, R.boltY, R.boltZ], bolt_handle: R.handle === 'straight' ? [0.06, R.boltY, R.boltZ + 0.036] : [0.044, R.boltY - 0.048, R.boltZ + 0.05],
    clip_guide: [0, 0.075, -0.075], rear_sight: [0, 0.056, -0.29], butt: [0, -0.045, 0.335],
  };
}

/** Clipe de 5 cartuchos 7,92×57 na orientação de inserção: balas para −Z, empilhadas em Y (centro na origem). */
export function buildClip() {
  const parts = [];
  for (let k = 0; k < 5; k++) {
    const y = (k - 2) * 0.0118;
    const prof = [[0, 0.0059], [0.002, 0.0059], [0.0025, 0.0052], [0.003, 0.0059], [0.052, 0.0055], [0.057, 0.0045], [0.063, 0.0043], [0.064, 0.0041], [0.08, 0.0026], [0.082, 0.0008]];
    const round = lathe((t, phi) => {
      const f = t * (prof.length - 1), i = Math.min(prof.length - 2, Math.floor(f)), u = f - i;
      const z = prof[i][0] + (prof[i + 1][0] - prof[i][0]) * u, r = prof[i][1] + (prof[i + 1][1] - prof[i][1]) * u;
      return [Math.cos(phi) * r, y + Math.sin(phi) * r, 0.008 - z];
    }, { rings: prof.length - 1, segments: 10, caps: 'both' });
    parts.push(tag(orientOutward(round, q => [0, y, q[2]]), `clip_round${k}`, 'brass', 'weapon_clip'));
  }
  parts.push(tag(place(roundedBox([0.014, 0.064, 0.004], { r: 0.0015, segments: 8, rings: 2 }), [0, 0, 0.0095]), 'clip_strip', 'blued', 'weapon_clip'));
  for (const p of parts) p.texel = 0.7;
  return parts;
}

/** Coloca as peças da arma no mundo na pose de ligação: punho em `origin`, eixos do mundo. */
export function placeWeapon(parts, origin) {
  for (const p of parts) place(p, origin, axesFrom([0, 0, 1]));
  return parts;
}
export { v3 };
