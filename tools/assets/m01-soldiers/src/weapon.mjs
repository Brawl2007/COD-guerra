// Armas originais em loft/torno: karabinek wz.29 (alavanca recta) e Kar98k (alavanca dobrada), clipe de 5.
// Referencial da arma: origem no punho (mão direita), cano para −Z, +Y para cima, lado direito em +X.
// Medidas: wz.29 1,10 m, cano 0,60 m (research/weapons/kb_wz29.md); Kar98k ~1,11 m, cano 0,60 m.
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
};
export const RIFLES = {
  wz29: { name: 'kb wz.29', length: 1.10, muzzleZ: -0.765, handle: 'straight', boltY: 0.034, boltZ: 0.0 },
  kar98k: { name: 'Kar98k', length: 1.11, muzzleZ: -0.765, handle: 'bent', boltY: 0.034, boltZ: 0.0 },
};

/** Peças da arma (coordenadas locais). Cada peça indica o osso: 'weapon' ou 'weapon_bolt'. */
export function buildRifle(kind = 'wz29') {
  const R = RIFLES[kind], parts = [];
  const stock = loft(STOCK[kind].map(([z, y, w, h]) => section(0, y, z, w, h, { n: 18 })), { caps: 'both' });
  parts.push(tag(orientOutward(stock, q => [0, -0.01, q[2]]), 'rifle_stock', 'wood'));
  // Guarda-mão superior (madeira) do anel do alvo até à braçadeira superior.
  const hg = loft([-0.27, -0.45, -0.62].map((z, k) => section(0, 0.036, z, 0.03 - k * 0.002, 0.018, { n: 12 })), { caps: 'both' });
  parts.push(tag(orientOutward(hg, q => [0, 0.03, q[2]]), 'rifle_handguard', 'wood'));
  // Cano, caixa da culatra, ponteira.
  parts.push(tag(tube(0.0125, 0.0092, -0.25, R.muzzleZ, 0.032), 'rifle_barrel', 'blued'));
  parts.push(tag(tube(0.0165, 0.0165, 0.035, -0.25, 0.03, { segments: 14 }), 'rifle_receiver', 'blued'));
  // Braçadeiras e ponteira (aço).
  for (const [z, len] of [[-0.45, 0.014], [-0.625, 0.022]]) {
    const b = loft([section(0, 0.012, z + len / 2, 0.048, 0.07, { n: 14, e: 0.6 }), section(0, 0.014, z - len / 2, 0.046, 0.066, { n: 14, e: 0.6 })], { caps: 'both' });
    parts.push(tag(orientOutward(b, q => [0, 0.015, q[2]]), `rifle_band${z}`, 'blued'));
  }
  const nose = loft([section(0, 0.02, -0.68, 0.034, 0.04, { n: 12 }), section(0, 0.024, -0.705, 0.028, 0.032, { n: 12 })], { caps: 'both' });
  parts.push(tag(orientOutward(nose, q => [0, 0.022, q[2]]), 'rifle_nosecap', 'blued'));
  // Massa de mira com orelhas (wz.29) / capuz em arco aberto (Kar98k sem capuz em 1939: base com orelhas baixas).
  const fs = roundedBox([0.018, 0.016, 0.02], { r: 0.003, segments: 12, rings: 3 });
  parts.push(tag(place(fs, [0, 0.046, -0.752]), 'rifle_frontsight_base', 'blued'));
  for (const s of [-1, 1]) parts.push(tag(place(roundedBox([0.003, 0.016, 0.012], { r: 0.001, segments: 8, rings: 2 }), [s * 0.008, 0.058, -0.752]), `rifle_ear${s}`, 'blued'));
  parts.push(tag(place(roundedBox([0.002, 0.01, 0.004], { r: 0.0008, segments: 8, rings: 2 }), [0, 0.06, -0.752]), 'rifle_blade', 'blued'));
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
  for (let k = 0; k <= 14; k++) { const t = k / 14; sl.push([side, (kind === 'kar98k' ? -0.03 : -0.06) - Math.sin(Math.PI * t) * 0.07 + t * 0.0, -0.45 + t * (kind === 'kar98k' ? 0.62 : 0.65)]); }
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
  return { parts, sockets: rifleSockets(R), info: R };
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
