// MG 34 de 1939 (Maschinengewehr 34, metralhadora ligeira com bípode e tambor de cinta de 50), em loft/torno, original.
// Referencial da arma = referencial do osso `weapon` do rig dos soldados (tools/assets/m01-soldiers): origem perto do
// punho, cano para −Z, +Y para cima, lado direito da arma em +X. As medidas marcadas [T33] vêm das fontes; as
// restantes são estimativas (ver MEASURES).
import { loft, strap, place, axesFrom } from '../../m01-soldiers/src/geom.mjs';
import { orientOutward } from '../../m01-soldiers/src/garments.mjs';
import { v3, clamp, smoothstep } from '../../m01-soldiers/src/meshops.mjs';
import { fbm, noise3 } from '../../m01-soldiers/src/noise.mjs';
import { section, tube, blk, rod, sweep } from '../../m01-rkm-wz28/src/rkm.mjs';

const tag = (part, name, paint, group = 'mg34_body') => Object.assign(part, { name, paint, group });
/**
 * Orienta cada triângulo para fora do centróide da peça (peças convexas). O loft partilhado fecha as tampas com a
 * orientação oposta à das paredes num dos sentidos de enrolamento, e orientOutward só vira a peça inteira: em peças
 * curtas e largas, como o tambor, as tampas ficavam viradas para dentro.
 */
function solid(part) {
  const P = part.positions, I = part.indices, c = [0, 0, 0];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) c[k] += P[i + k] * 3 / P.length;
  for (let t = 0; t < I.length; t += 3) {
    const g = k => [P[I[t + k] * 3], P[I[t + k] * 3 + 1], P[I[t + k] * 3 + 2]], a = g(0), b = g(1), d = g(2);
    const n = v3.cross(v3.sub(b, a), v3.sub(d, a)), m = v3.sub(v3.mul(v3.add(v3.add(a, b), d), 1 / 3), c);
    if (v3.dot(n, m) < -0.2 * v3.len(n) * v3.len(m)) [I[t + 1], I[t + 2]] = [I[t + 2], I[t + 1]];
  }
  return part;
}
/** Tiras curvas (o centróide fica fora da peça): vira a peça inteira se o volume com sinal for negativo. */
function strapOut(part) {
  const P = part.positions, I = part.indices, g = i => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];
  let vol = 0;
  for (let t = 0; t < I.length; t += 3) vol += v3.dot(g(I[t]), v3.cross(g(I[t + 1]), g(I[t + 2])));
  if (vol < 0) for (let t = 0; t < I.length; t += 3) [I[t + 1], I[t + 2]] = [I[t + 2], I[t + 1]];
  return part;
}
const OPEN_SHAPES = new Set(['trigger_guard', 'drum_handle']);

/** Pontos-chave (metros, referencial da arma). Pivôs das peças móveis: tampa, alavanca, tambor, cinta, bípode. */
export const MG34 = {
  length: 1.219, barrel: 0.627, mass_kg: 12.1, rounds: 50, rate_rpm: 800,
  boreY: 0.03, buttZ: 0.45, muzzleZ: -0.769, breechZ: -0.127, jacket: { r: 0.024, z0: -0.118, z1: -0.7 },
  // Tampa da alimentação: dobradiça à frente (roda em X, a traseira sobe); abre `coverOpen` graus.
  cover: { hinge: [0, 0.072, -0.106], open: 80 },
  // Alavanca de armar à direita: à frente em repouso; puxa-se `handleTravel` para trás e volta-se à mão.
  handle: [0.031, 0.012, -0.035], handleTravel: 0.12,
  // Tambor de cinta (Gurttrommel 34): eixo em Z, à esquerda da caixa de alimentação; pivô no centro.
  drum: { center: [-0.105, -0.008, -0.035], r: 0.07, depth: 0.12 },
  belt: [-0.03, 0.061, -0.035], pitch: 0.0135,
  bipod: { mount: [0, 0.004, -0.645], open: [0.16, -0.33, -0.7], folded: [0.019, -0.004, -0.33] },
};

/**
 * Proveniência de cada medida (manifest.json → measures). source: fonte da tabela de research/SOURCES.md (T33, só por
 * RESUMO de busca); estimated: true quando a medida foi desenhada por proporção, sem cota publicada.
 */
export const MEASURES = [
  { id: 'length_total', value_m: 1.219, source: 'T33', estimated: false, note: 'comprimento total 1219 mm (da chapa da coronha à boca do reforçador de recuo)' },
  { id: 'barrel', value_m: 0.627, source: 'T33', estimated: false, note: 'cano 627 mm, da face da culatra (z −0,127, dentro da caixa) à boca' },
  { id: 'mass', value_kg: 12.1, source: 'T33', estimated: false, note: 'massa 12,1 kg com bípode; não afecta a geometria' },
  { id: 'rate', value_rpm: [800, 900], source: 'T33', estimated: false, note: 'cadência 800–900 tiros/min; os clips usam 800 (intervalo de 0,075 s de src/game/m01-simulation.js)' },
  { id: 'drum', value_m: [0.152, 0.14, 0.121], source: 'T33 (Gurttrommel 34)', estimated: false, note: 'tambor de cinta de 50 à esquerda; 6 × 5,5 × 4,75 pol (comprimento × altura × largura) num anúncio de peça; orientação e ganchos estimados' },
  { id: 'jacket', value_m: [0.048, 0.582], source: 'T33', estimated: true, note: 'manga do cano perfurada [T33]; diâmetro, comprimento e o padrão de furos ovais estimados' },
  { id: 'stock', value_m: 0.33, source: 'fotografias (resumo)', estimated: true, note: 'coronha em linha com o cano; material (baquelite ou madeira) por confirmar para 1939' },
  { id: 'receiver', value_m: [0.05, 0.06, 0.23], source: 'fotografias (resumo)', estimated: true, note: 'caixa da culatra cilíndrica, largura × altura × comprimento' },
  { id: 'feed_cover', value_m: 0.166, source: 'fotografias (resumo)', estimated: true, note: 'tampa da alimentação com dobradiça à frente e fecho atrás; comprimento e abertura (80°) estimados' },
  { id: 'trigger', value_m: null, source: 'T33', estimated: true, note: 'gatilho em crescente de duas partes: E (tiro a tiro, em cima) e D (contínuo, em baixo) [T33]; formas estimadas' },
  { id: 'sights', value_m: [0.085, 0.08], source: 'T33', estimated: true, note: 'alça tangente rebatível 200–2000 m e massa rebatível [T33]; alturas acima do eixo estimadas; sem a mira antiaérea' },
  { id: 'bipod', value_m: 0.35, source: 'T33', estimated: true, note: 'bípode à frente da manga (posição dianteira; havia também a posição junto à caixa) [T33]; pernas e abertura estimadas' },
  { id: 'cocking_handle', value_m: 0.12, source: 'fotografias (resumo)', estimated: true, note: 'alavanca de armar à direita, não acompanha o ferrolho; curso estimado' },
];

/** Peças por grupo: mg34_body, mg34_feed_cover, mg34_cocking_handle, mg34_drum, mg34_belt, mg34_bipod_folded, mg34_bipod_open. */
export function buildMg34() {
  const parts = [], B = MG34.boreY, J = MG34.jacket;
  // Coronha (baquelite) em linha com o cano: dorso quase recto, ventre curvo até à chapa.
  const stock = loft([[0.444, -0.026, 0.042, 0.136], [0.42, -0.024, 0.042, 0.134], [0.32, -0.008, 0.04, 0.1], [0.22, 0.008, 0.037, 0.068], [0.16, 0.016, 0.036, 0.054], [0.118, 0.02, 0.042, 0.054]]
    .map(([z, y, w, h]) => section(0, y, z, w, h, { n: 18, e: 0.5 })), { caps: 'both' });
  parts.push(tag(orientOutward(stock, q => [0, 0, q[2]]), 'stock', 'bakelite'));
  parts.push(tag(blk([0.044, 0.14, 0.01], [0, -0.026, 0.445]), 'buttplate', 'steel'));
  // Caixa da culatra: tubo, com a caixa de alimentação por cima (fixa) e a tampa (móvel) sobre ela.
  const rec = loft([[0.122, 0.018, 0.05, 0.06], [0.1, 0.02, 0.054, 0.064], [-0.09, 0.02, 0.054, 0.064], [-0.118, 0.024, 0.056, 0.062]]
    .map(([z, y, w, h]) => section(0, y, z, w, h, { n: 16, e: 0.55 })), { caps: 'both' });
  parts.push(tag(orientOutward(rec, q => [0, 0.02, q[2]]), 'receiver', 'steel'));
  parts.push(tag(blk([0.054, 0.02, 0.17], [0, 0.058, -0.022], 0.3), 'receiver_top', 'steel'));
  parts.push(tag(blk([0.11, 0.016, 0.07], [0, 0.058, -0.04], 0.15), 'feed_tray', 'steel'));
  for (const s of [-1, 1]) parts.push(tag(blk([0.022, 0.012, 0.012], [s * 0.06, 0.06, -0.075]), `drum_ear_${s < 0 ? 'l' : 'r'}`, 'steel'));
  parts.push(tag(blk([0.003, 0.012, 0.13], [0.0285, 0.012, 0.025]), 'handle_slot', 'bare_metal'));
  parts.push(tag(blk([0.022, 0.003, 0.05], [0, -0.0125, -0.03]), 'ejection_port', 'bare_metal'));
  // Punho de pistola (baquelite) inclinado para trás, caixa do gatilho, guarda-mato e gatilho E/D em crescente.
  parts.push(tag(blk([0.03, 0.022, 0.12], [0, -0.016, 0.05], 0.3), 'trigger_housing', 'steel'));
  const gTop = [0, -0.026, 0.085], gBot = [0, -0.132, 0.122];
  parts.push(tag(sweep([[gTop, 0.03, 0.044], [v3.lerp(gTop, gBot, 0.5), 0.033, 0.048], [gBot, 0.031, 0.046]], { n: 16, e: 0.55 }), 'grip', 'bakelite'));
  const tg = []; for (let k = 0; k <= 10; k++) { const a = Math.PI * k / 10; tg.push([0, -0.026 - Math.sin(a) * 0.034, 0.074 - k / 10 * 0.085]); }
  parts.push(tag(strap(tg, tg.map(() => [1, 0, 0]), { width: 0.008, thickness: 0.01 }), 'trigger_guard', 'steel'));
  parts.push(tag(blk([0.008, 0.018, 0.007], [0, -0.036, 0.034]), 'trigger_e', 'bare_metal'));
  parts.push(tag(blk([0.008, 0.016, 0.007], [0, -0.052, 0.04]), 'trigger_d', 'bare_metal'));
  // Manga do cano perfurada (furos pintados), aro da frente, reforçador de recuo com cone tapa-chamas.
  parts.push(tag(tube(J.r, J.r, J.z1, J.z0, B, { segments: 16 }), 'jacket', 'jacket'));
  parts.push(tag(tube(0.0265, 0.0265, -0.718, -0.692, B, { segments: 16 }), 'jacket_front', 'steel'));
  parts.push(tag(tube(0.015, 0.017, MG34.muzzleZ + 0.02, -0.718, B, { segments: 14 }), 'recoil_booster', 'steel'));
  parts.push(tag(tube(0.0195, 0.013, MG34.muzzleZ, MG34.muzzleZ + 0.02, B, { segments: 14 }), 'muzzle_cone', 'steel'));
  parts.push(tag(tube(0.0065, 0.0065, MG34.muzzleZ, MG34.muzzleZ + 0.004, B, { segments: 10 }), 'bore', 'bore'));
  // Miras: massa rebatível sobre o aro da frente; alça tangente (200–2000 m) no topo da caixa, à frente da tampa.
  parts.push(tag(blk([0.012, 0.014, 0.022], [0, B + 0.03, -0.704]), 'front_sight_base', 'steel'));
  parts.push(tag(blk([0.003, 0.022, 0.008], [0, B + 0.046, -0.704]), 'front_sight', 'steel'));
  parts.push(tag(blk([0.032, 0.012, 0.05], [0, 0.058, -0.14]), 'rear_sight_base', 'steel'));
  parts.push(tag(blk([0.026, 0.004, 0.056], [0, 0.068, -0.146]), 'rear_sight_leaf', 'steel'));
  parts.push(tag(blk([0.02, 0.016, 0.005], [0, 0.077, -0.12]), 'rear_sight_notch', 'steel'));
  // Abraçadeira do bípode (posição dianteira) e argolas da bandoleira.
  parts.push(tag(blk([0.058, 0.02, 0.022], [0, B - 0.012, MG34.bipod.mount[2]], 0.6), 'bipod_clamp', 'steel'));
  parts.push(tag(blk([0.006, 0.02, 0.012], [-0.02, -0.062, 0.33]), 'sling_rear', 'steel'));
  // Tampa da alimentação (móvel): dorso arredondado, guia da cinta e fecho atrás.
  const c = MG34.cover.hinge;
  const cov = loft([[-0.106, 0.064], [-0.09, 0.07], [0.04, 0.07], [0.058, 0.064]].map(([z, w]) => section(0, 0.084, z, w, 0.03, { n: 14, e: 0.35 })), { caps: 'both' });
  parts.push(tag(orientOutward(cov, q => [0, 0.08, q[2]]), 'cover', 'steel', 'mg34_feed_cover'));
  parts.push(tag(blk([0.012, 0.012, 0.016], [0, 0.098, 0.05]), 'cover_latch', 'bare_metal', 'mg34_feed_cover'));
  parts.push(tag(rod([-0.03, c[1], c[2]], [0.03, c[1], c[2]], 0.006, 0.006, 8), 'cover_hinge', 'steel', 'mg34_feed_cover'));
  // Alavanca de armar (direita): haste e punho em gancho.
  const h = MG34.handle;
  parts.push(tag(rod(h, [h[0] + 0.022, h[1], h[2]], 0.005, 0.005, 8), 'handle', 'bare_metal', 'mg34_cocking_handle'));
  parts.push(tag(blk([0.012, 0.03, 0.016], [h[0] + 0.026, h[1] - 0.006, h[2]], 0.3), 'handle_knob', 'bare_metal', 'mg34_cocking_handle'));
  // Tambor de cinta de 50 (Gurttrommel 34): lata de eixo em Z, boca de saída para a caixa, pega em arco e fecho.
  const D = MG34.drum, dc = D.center;
  const can = loft([dc[2] + D.depth / 2, dc[2] + D.depth / 2 - 0.006, dc[2] - D.depth / 2 + 0.006, dc[2] - D.depth / 2]
    .map((z, k) => section(dc[0], dc[1], z, (k % 3 ? 2 : 1.9) * D.r, (k % 3 ? 2 : 1.9) * D.r, { n: 20, e: 0.9 })), { caps: 'both' });
  parts.push(tag(orientOutward(can, q => [dc[0], dc[1], q[2]]), 'drum_can', 'drum', 'mg34_drum'));
  parts.push(tag(blk([0.05, 0.03, 0.09], [-0.052, 0.046, dc[2]], 0.3), 'drum_mouth', 'drum', 'mg34_drum'));
  const arc = []; for (let k = 0; k <= 8; k++) { const a = Math.PI * k / 8; arc.push([dc[0] - 0.035 + 0.07 * k / 8, dc[1] + D.r + 0.004 + Math.sin(a) * 0.026, dc[2]]); }
  parts.push(tag(strap(arc, arc.map(() => [0, 0, 1]), { width: 0.006, thickness: 0.005 }), 'drum_handle', 'steel', 'mg34_drum'));
  parts.push(tag(blk([0.03, 0.014, 0.01], [dc[0] - 0.03, dc[1] - 0.02, dc[2] - D.depth / 2 - 0.004]), 'drum_latch', 'steel', 'mg34_drum'));
  // Cinta: cartuchos na caixa de alimentação (só se vêem com a tampa aberta), da boca do tambor ao alimentador.
  for (let k = 0; k < 5; k++) {
    const x = MG34.belt[0] - 0.026 + k * MG34.pitch, y = MG34.belt[1], z = MG34.belt[2];
    parts.push(tag(tube(0.0058, 0.0058, z + 0.017, z + 0.04, y, { segments: 6, x }), `round_${k}`, 'brass', 'mg34_belt'));
    parts.push(tag(tube(0.0045, 0.0018, z - 0.016, z + 0.017, y, { segments: 6, x }), `bullet_${k}`, 'bullet', 'mg34_belt'));
    parts.push(tag(blk([0.011, 0.004, 0.03], [x, y - 0.006, z + 0.022]), `link_${k}`, 'steel', 'mg34_belt'));
  }
  // Bípode: pernas tubulares com patas em pá, aberto (apoiado) e dobrado para trás por baixo da manga.
  const m = MG34.bipod.mount;
  for (const state of ['open', 'folded']) for (const s of [-1, 1]) {
    const top = [s * 0.014, m[1] - 0.009, m[2]], f = MG34.bipod[state], foot = [s * f[0], f[1], f[2]], g = `mg34_bipod_${state}`;
    parts.push(tag(rod(top, foot, 0.0068, 0.0058), `leg_${s < 0 ? 'l' : 'r'}`, 'steel', g));
    const pad = blk([0.026, 0.006, 0.034], [0, 0, 0]);
    place(pad, [0, 0, 0], axesFrom(state === 'open' ? [0, 0, -1] : v3.norm(v3.sub(foot, top))));
    parts.push(tag(place(pad, v3.add(foot, [0, state === 'open' ? -0.003 : -0.005, 0])), `foot_${s < 0 ? 'l' : 'r'}`, 'steel', g));
  }
  for (const p of parts) { p.texel = 1; (OPEN_SHAPES.has(p.name) ? strapOut : solid)(p); }
  return parts;
}

/** Pivôs dos nós móveis (a geometria do grupo é exportada relativa ao pivô). */
export const PIVOTS = {
  mg34_body: [0, 0, 0], mg34_feed_cover: MG34.cover.hinge, mg34_cocking_handle: MG34.handle, mg34_drum: MG34.drum.center,
  mg34_belt: MG34.belt, mg34_bipod_folded: MG34.bipod.mount, mg34_bipod_open: MG34.bipod.mount,
};

/** Pontos de referência (referencial da arma), para mãos, efeitos e jogo. */
export function sockets() {
  const b = MG34.bipod, h = MG34.handle;
  return {
    grip_r: [0, -0.07, 0.1], grip_l: [0, -0.03, -0.42], cheek: [0, 0.084, 0.22], muzzle: [0, MG34.boreY, MG34.muzzleZ],
    ejection_port: [0, -0.014, -0.03], charging_handle: [h[0] + 0.03, h[1], h[2]], charging_handle_back: [h[0] + 0.03, h[1], h[2] + MG34.handleTravel],
    feed_cover_hinge: MG34.cover.hinge, feed_cover_latch: [0, 0.104, 0.05], feed_tray: [-0.03, 0.064, -0.04], drum_center: MG34.drum.center,
    rear_sight: [0, 0.085, -0.12], front_sight: [0, MG34.boreY + 0.057, -0.704], butt: [0, -0.026, 0.453],
    bipod_mount: b.mount, bipod_feet: [0, b.open[1] - 0.006, b.open[2]],
  };
}

const mul = (a, s) => a.map(x => x * s);
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
/** Furos ovais da manga: 8 em volta (alternados), em filas ao longo de z. Devolve 0..1 (1 = dentro do furo). */
function perforation(p) {
  const J = MG34.jacket, z = p[2];
  if (z > J.z0 - 0.04 || z < J.z1 + 0.035) return 0;
  const a = Math.atan2(p[1] - MG34.boreY, p[0]) / (Math.PI * 2) * 8, row = Math.floor((z - J.z1) / 0.036), shift = row % 2 ? 0.5 : 0;
  const du = (((a + shift) % 1) + 1) % 1 - 0.5, dz = ((z - J.z1) / 0.036 % 1) - 0.5;
  const d = Math.hypot(du / 0.22, dz / 0.36);
  return 1 - smoothstep(0.8, 1, d);
}
/** Pintores procedurais (originais): aço fosfatado/oxidado cinzento-escuro, baquelite castanha, latão, tambor pintado. */
export const PAINTERS = {
  steel: ({ p, n }) => {
    const w = fbm(p, 50, 3), wear = clamp((fbm(p, 140, 2) - 0.25) * 3) * (n ? clamp(1 - Math.abs(n[0]) * 1.4) : 0.5);
    return { c: mix(mul([0.25, 0.255, 0.265], 1 + w * 0.25), [0.46, 0.46, 0.47], wear * 0.35), r: 0.5 + w * 0.1 - wear * 0.1, m: 0.25, h: 0 };
  },
  jacket: (ctx) => {
    const s = PAINTERS.steel(ctx), hole = perforation(ctx.p);
    // Furo: fundo escuro (vê-se o cano a 1 cm), aresta polida pelo uso.
    const rim = clamp(1 - Math.abs(hole - 0.5) * 2) * 0.35;
    return { c: mix(mix(s.c, [0.42, 0.42, 0.43], rim), [0.035, 0.035, 0.04], hole), r: s.r, m: s.m * (1 - hole), h: -0.0012 * hole };
  },
  bakelite: ({ p }) => {
    const swirl = fbm(p, 18, 3), dirt = clamp(fbm(p, 40, 3) * 0.9 + 0.1), pits = Math.max(0, noise3(p[0] * 700, p[1] * 700, p[2] * 700)) ** 4;
    const c = mix(mul([0.23, 0.12, 0.07], 0.85 + 0.3 * swirl), [0.1, 0.07, 0.05], 0.3 * dirt + 0.5 * pits);
    return { c, r: 0.42 + dirt * 0.15, m: 0, h: -pits * 0.0001 };
  },
  drum: ({ p, n }) => {
    const w = fbm(p, 30, 3), chip = clamp((fbm(p, 120, 2) - 0.45) * 4) * (n ? clamp(1 - Math.abs(n[2]) * 1.2) : 0.5);
    // Rebordo estampado nas faces e no corpo, a cada 3 cm.
    const ridge = Math.abs(n?.[2] ?? 0) > 0.7 ? 0.5 + 0.5 * Math.cos(Math.hypot(p[0] - MG34.drum.center[0], p[1] - MG34.drum.center[1]) * 210) : 0.5;
    return { c: mix(mul([0.25, 0.26, 0.24], 0.9 + w * 0.2), [0.42, 0.41, 0.4], chip * 0.6), r: 0.62 - chip * 0.15, m: chip * 0.3, h: (ridge - 0.5) * 0.0003 };
  },
  bare_metal: ({ p }) => ({ c: mul([0.5, 0.5, 0.51], 1 + fbm(p, 80, 2) * 0.1), r: 0.35, m: 0.5, h: 0 }),
  brass: ({ p }) => ({ c: mul([0.7, 0.52, 0.24], 0.9 + fbm(p, 200, 2) * 0.2), r: 0.35, m: 0.4, h: 0 }),
  bullet: ({ p }) => ({ c: mul([0.5, 0.42, 0.33], 0.9 + fbm(p, 200, 2) * 0.2), r: 0.4, m: 0.35, h: 0 }),
  bore: () => ({ c: [0.03, 0.03, 0.035], r: 0.8, m: 0, h: 0 }),
};
