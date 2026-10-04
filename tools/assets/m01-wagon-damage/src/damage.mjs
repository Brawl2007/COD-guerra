// Estados queimado e danificado dos vagões de M01 (coberto tipo G e aberto tipo O). Partem das peças do kit intacto
// (tools/assets/m01-wagons/src/wagons.mjs, importado e não editado): retiram a madeira que ardeu ou partiu, empenam
// o aço e acrescentam bordos queimados, furos de impacto, tábuas soltas e restos. Metros, +Y para cima, frente em −Z,
// origem no topo do carril; os rodados, os pivôs e os sockets do kit intacto ficam iguais. Sem fogo nem fumo próprios:
// o evento `station_wagon_fire` e a escolha do vagão pertencem à simulação. P16 continua aberta: são variantes genéricas.
import { v3, smoothstep, clamp } from '../../m01-soldiers/src/meshops.mjs';
import { fbm, hash } from '../../m01-soldiers/src/noise.mjs';
import { WAGON, TYPES, PAINTERS, pivots as basePivots, sockets as baseSockets } from '../../m01-wagons/src/wagons.mjs';
import { tag, bar, bent, slab, warp, rotateAbout, roofArc } from './shapes.mjs';

const HZ = WAGON.frame / 2, HX = WAGON.width / 2, C = WAGON.covered, O = WAGON.open, FLOOR = WAGON.floor;
const DOOR_H = C.eave - 1.18, DOOR_Y = 1.18 + DOOR_H / 2, OPEN_TOP = FLOOR + O.wall;

/** Ponto de impacto (centro do furo, na face exterior) e raio aproximado do furo, por tipo. */
export const IMPACT = {
  covered: { p: [HX, 2.1, 1.72], r: 0.45, side: 'r' },
  open: { p: [HX, 2.25, -0.7], r: 0.6, side: 'r' },
};

/**
 * Bordo superior queimado de uma parede, de u1 para u0 (para fechar o contorno no sentido anti-horário depois da
 * aresta de baixo). As tábuas horizontais ardem de cima para baixo: o bordo é uma sucessão de patamares à altura de
 * uma junta de tábua (0,145 m), com as pontas carbonizadas em rampa entre eles. A madeira resiste mais junto aos
 * montantes de aço (`posts`), que a protegem.
 */
function jag(u0, u1, { base, amp = 0.3, step = 0.6, seed, posts = [], postH = 0.55, top = Infinity, min = 1.32 }) {
  const level = u => {
    let h = base + amp * fbm([u * 0.6, seed * 1.7, 0.5], 1, 2) * 1.8;
    for (const q of posts) h += postH * Math.exp(-(((u - q) / 0.3) ** 2));
    return clamp(1.16 + Math.round((h - 1.16) / 0.145) * 0.145 + 0.03 * (hash(seed, Math.round(u * 10)) - 0.5), min, top);
  };
  const pts = [];
  for (let u = u1, k = 0; u > u0 + 0.05; k++) {
    const w = Math.min(step * (0.6 + 0.8 * hash(seed, k)), u - u0), h = level(u - w / 2), ramp = w * (0.18 + 0.14 * hash(seed, k, 2));
    pts.push([u, h]);
    if (u - w > u0 + 0.05) pts.push([u - w + ramp, h + 0.02 * (hash(seed, k, 4) - 0.5)]);
    u -= w;
  }
  pts.push([u0, level(u0 + 0.1)]);
  return pts;
}

/** Furo de impacto num contorno (u, v): pontos com raio alternado (lascas ao longo das tábuas horizontais). */
function holeRing(cu, cv, ru, rv, seed, m = 10) {
  return Array.from({ length: m }, (_, k) => {
    const a = -Math.PI / 2 - k * 2 * Math.PI / m, spike = k % 2 ? 0.78 + 0.12 * hash(seed, k) : 1.08 + 0.2 * hash(seed, k, 1);
    return [cu + Math.cos(a) * ru * spike * (1 + 0.25 * Math.abs(Math.cos(a))), cv + Math.sin(a) * rv * spike];
  });
}

/** Monte baixo de cinza e restos no soalho: placa de contorno irregular. */
function heap(cx, cz, rx, rz, h, seed) {
  const pts = Array.from({ length: 6 }, (_, k) => { const a = k / 6 * Math.PI * 2, r = 0.75 + 0.3 * hash(seed, k); return [cx + Math.cos(a) * rx * r, cz + Math.sin(a) * rz * r]; });
  return slab(pts, FLOOR - 0.01, FLOOR + h, { map: ([u, v, w]) => [u, w, v] });
}
const plank = (a, b, w = 0.145, t = 0.03, side = [0, 1, 0]) => bar(a, b, [w, t], side);

const byName = (parts, re) => parts.filter(p => re.test(p.name));
// No kit intacto do aberto há dois `top_rail_r` (cantoneira do lado direito e do topo traseiro): as cantoneiras
// laterais distinguem-se pela extensão em Z, para não levar a do topo traseiro.
const zSpan = p => { let a = Infinity, b = -Infinity; for (let i = 2; i < p.positions.length; i += 3) { a = Math.min(a, p.positions[i]); b = Math.max(b, p.positions[i]); } return b - a; };
const dropped = (re, p) => re.test(p.name) && !(/^top_rail_[lr]$/.test(p.name) && zSpan(p) < 2);
const drop = (parts, re) => ({ parts: parts.filter(p => !dropped(re, p)), gone: parts.filter(p => dropped(re, p)).map(p => p.name) });
const repaint = (parts, from, to) => { for (const p of parts) if (p.paint === from) p.paint = to; };

// ——— Coberto queimado: caixa de madeira ardida até ~1,8–2,6 m, sem tejadilho, aço empenado e cinza no soalho ———
function coveredBurned() {
  let { parts, gone } = drop(TYPES.covered.build(), /^(roof|side_|lintel_|vent_|door_[lr]_leaf|end_[fr]$|door_rail_[lr]_top)/);
  const hd = C.door.width / 2, added = [], deformed = [];
  const add = p => { parts.push(p); added.push(p.name); };
  for (const s of [-1, 1]) {
    const side = s < 0 ? 'l' : 'r', x0 = s * (HX - 0.05), x1 = s * HX, w = [Math.min(x0, x1), Math.max(x0, x1)];
    for (const zs of [-1, 1]) {
      const [z0, z1] = zs < 0 ? [-HZ, -hd] : [hd, HZ], seed = 11 + (s + 1) * 2 + (zs + 1);
      const top = jag(z0, z1, { base: zs * s > 0 ? 1.95 : 1.75, seed, step: 0.9, posts: [zs * 0.95, zs * 2.45, zs * (HZ - 0.02)], top: C.eave - 0.05 });
      add(tag(slab([[z0, 1.16], [z1, 1.16], ...top], w[0], w[1], { map: ([u, v, x]) => [x, v, u], skip: [0] }), `burnt_side_${side}_${zs < 0 ? 'f' : 'r'}`, 'char'));
    }
    // Porta carbonizada, ainda no carril de baixo; sem doors_open (a folha e o carril de cima empenaram).
    const dx = [s * (HX + 0.07), s * (HX + 0.11)].sort((a, b) => a - b);
    const dtop = jag(-C.door.leaf / 2, C.door.leaf / 2, { base: 2.0, amp: 0.25, step: 0.75, seed: 40 + s, posts: [-0.85], postH: 0.3, top: C.eave, min: 1.5 });
    add(tag(slab([[-C.door.leaf / 2, 1.18], [C.door.leaf / 2, 1.18], ...dtop], dx[0], dx[1], { map: ([u, v, x]) => [x, v, u] }), `burnt_door_${side}`, 'char', `door_${side}`));
    // Carril de cima da porta: perdeu o apoio na madeira e cede para trás.
    const xr = s * (HX + 0.05), zr0 = -hd - 0.05, zr1 = hd + C.door.travel + 0.05;
    add(tag(bent([[xr, C.eave + 0.03, zr0], [xr, C.eave - 0.05, 0.9], [xr + s * 0.04, C.eave - 0.3, zr1]], [0.06, 0.06]), `sagging_door_rail_${side}`, 'brown'));
  }
  for (const zs of [-1, 1]) {
    const end = zs < 0 ? 'f' : 'r', wz = zs < 0 ? [-HZ, -HZ + 0.05] : [HZ - 0.05, HZ];
    const top = jag(-HX, HX, { base: 2.05, step: 0.8, seed: 60 + zs, posts: [-0.6, 0.6, -HX + 0.02, HX - 0.02], postH: 0.7, top: C.eave + 0.2 });
    add(tag(slab([[-HX, 1.16], [HX, 1.16], ...top], wz[0], wz[1], { skip: [0] }), `burnt_end_${end}`, 'char'));
  }
  // Arcos de aço do tejadilho sobre os montantes de ±2,45 m: o da frente de pé, o de trás partido e caído para dentro.
  const hoop = roofArc(HX + 0.02, C.eave, C.height - 0.12, 3).map(([x, y]) => [x, y, -2.45]);
  add(tag(bent(hoop, [0.05, 0.06], [0, 0, 1]), 'roof_hoop_f', 'brown'));
  add(tag(bent([[-HX - 0.02, C.eave, 2.45], [-0.55, C.height - 0.2, 2.45], [0.3, C.eave + 0.12, 2.5], [0.7, 2.5, 2.62]], [0.05, 0.06], [0, 0, 1]), 'roof_hoop_r_collapsed', 'brown'));
  // Montantes da porta inclinados pelo calor.
  for (const [name, deg] of [['post_l_0.95', 4], ['post_r_-0.95', -3]]) {
    const p = parts.find(q => q.name === name), x = p.positions[0] > 0 ? HX + 0.02 : -HX - 0.02;
    warp(p, rotateAbout([x, 1.16, +name.split('_').at(-1)], [0, 0, 1], x > 0 ? deg : -deg)); deformed.push(name);
  }
  repaint(parts, 'wood', 'char_floor');
  // Restos soltos (nó `debris`): tábuas do tejadilho caídas e montes de cinza no soalho.
  for (const [i, a, b] of [[1, [-1.15, FLOOR + 0.05, -1.5], [0.25, FLOOR + 0.42, -2.85]], [2, [0.6, FLOOR + 0.03, 1.2], [1.25, FLOOR + 0.6, 2.95]]])
    add(tag(plank(a, b, 0.3, 0.04, v3.norm([b[2] - a[2], 0, a[0] - b[0]])), `fallen_roof_board_${i}`, 'char', 'debris'));
  add(tag(heap(-0.35, -2.9, 0.9, 0.7, 0.12, 71), 'ash_heap_f', 'ash', 'debris'));
  add(tag(heap(0.45, 2.3, 0.8, 0.9, 0.1, 72), 'ash_heap_r', 'ash', 'debris'));
  return { parts, removed: gone, added, deformed };
}

// ——— Aberto queimado: taipais ardidos, cantoneiras do topo cedidas, carga carbonizada ———
function openBurned() {
  let { parts, gone } = drop(TYPES.open.build(), /^(side_[lr]$|end_[fr]$|top_rail_[lr]$)/);
  const added = [], deformed = [], add = p => { parts.push(p); added.push(p.name); };
  for (const s of [-1, 1]) {
    const side = s < 0 ? 'l' : 'r', w = [s * (HX - 0.05), s * HX].sort((a, b) => a - b);
    const top = jag(-HZ, HZ, { base: s < 0 ? 1.72 : 1.6, amp: 0.26, step: 0.65, seed: 80 + s, posts: [-HZ + 0.02, -2.35, -0.79, 0.79, 2.35, HZ - 0.02], postH: 0.5, top: OPEN_TOP - 0.03, min: 1.3 });
    add(tag(slab([[-HZ, 1.16], [HZ, 1.16], ...top], w[0], w[1], { map: ([u, v, x]) => [x, v, u], skip: [0] }), `burnt_side_${side}`, 'char'));
    // Cantoneira do topo: sem a madeira, cede entre os montantes e torce para fora.
    const x = s * (HX - 0.01);
    add(tag(bent([[x, OPEN_TOP + 0.01, -HZ - 0.02], [x + s * 0.03, OPEN_TOP - 0.1, -1.6], [x + s * 0.08, OPEN_TOP - 0.2, 0.6], [x, OPEN_TOP + 0.01, HZ + 0.02]], [0.1, 0.08]), `sagging_top_rail_${side}`, 'brown'));
  }
  for (const zs of [-1, 1]) {
    const end = zs < 0 ? 'f' : 'r', wz = zs < 0 ? [-HZ, -HZ + 0.05] : [HZ - 0.05, HZ];
    const top = jag(-HX + 0.05, HX - 0.05, { base: 1.8, amp: 0.2, step: 0.55, seed: 90 + zs, posts: [-0.6, 0.6], postH: 0.45, top: OPEN_TOP - 0.03 });
    add(tag(slab([[-HX + 0.05, 1.16], [HX - 0.05, 1.16], ...top], wz[0], wz[1], { skip: [0] }), `burnt_end_${end}`, 'char'));
  }
  for (const [name, deg] of [['post_l_0.79', 5], ['post_r_-2.35', -4]]) {
    const p = parts.find(q => q.name === name), x = p.positions[0] > 0 ? HX + 0.02 : -HX - 0.02;
    warp(p, rotateAbout([x, 1.16, +name.split('_').at(-1)], [0, 0, 1], x > 0 ? deg : -deg)); deformed.push(name);
  }
  repaint(parts, 'wood', 'char_floor');
  add(tag(heap(-0.2, -1.6, 1.0, 1.3, 0.22, 91), 'charred_load_f', 'ash', 'debris'));
  add(tag(heap(0.3, 1.9, 0.95, 1.1, 0.16, 92), 'charred_load_r', 'ash', 'debris'));
  for (const [i, a, b] of [[1, [-1.0, FLOOR + 0.2, -2.6], [0.7, FLOOR + 0.05, -1.2]], [2, [-0.4, FLOOR + 0.3, -0.7], [0.9, FLOOR + 0.12, -2.4]], [3, [-1.1, FLOOR + 0.06, 0.6], [0.6, FLOOR + 0.25, 1.4]], [4, [1.05, FLOOR + 0.04, 0.2], [0.2, FLOOR + 0.5, 2.9]]])
    add(tag(plank(a, b, 0.16, 0.08, v3.norm([b[2] - a[2], 0, a[0] - b[0]])), `charred_beam_${i}`, 'char', 'debris'));
  return { parts, removed: gone, added, deformed };
}

// ——— Coberto danificado: furo de impacto com lascas, diagonal empurrada, porta saída da guia, tampão amolgado ———
function coveredDamaged() {
  const I = IMPACT.covered, hd = C.door.width / 2;
  let { parts, gone } = drop(TYPES.covered.build(), /^(side_r_r|brace_r_ri)$/);
  const added = [], deformed = [], add = p => { parts.push(p); added.push(p.name); };
  // Painel com o furo, em duas metades pela vertical do centro (costuras sem face).
  const [cz, cy] = [I.p[2], I.p[1]], ring = holeRing(cz, cy, 0.42, 0.36, 21, 10), m = ring.length / 2;
  const bot = ring[0], topP = ring[m], left = ring.slice(1, m), right = ring.slice(m + 1).reverse();
  const w = [HX - 0.05, HX], map = ([u, v, x]) => [x, v, u];
  add(tag(slab([[hd, 1.16], [cz, 1.16], [cz, bot[1]], ...left, [cz, topP[1]], [cz, C.eave], [hd, C.eave]], w[0], w[1], { map, skip: [0, 1, 3 + left.length] }), 'holed_side_r_r1', 'wood_hit'));
  add(tag(slab([[cz, 1.16], [HZ, 1.16], [HZ, C.eave], [cz, C.eave], [cz, topP[1]], ...right.slice().reverse(), [cz, bot[1]]], w[0], w[1], { map, skip: [0, 3, 5 + right.length] }), 'holed_side_r_r2', 'wood_hit'));
  // Diagonal interior do painel, empurrada 0,17 m para dentro pelo rebentamento.
  const xb = HX + 0.02;
  add(tag(bent([[xb, 1.22, hd + 0.1], [xb - 0.17, cy + 0.05, cz - 0.05], [xb, C.eave - 0.06, 2.4]], [0.04, 0.08]), 'bent_brace_r_ri', 'brown'));
  // Porta direita saída da guia de baixo: pende do carril de cima, com o fundo para fora (fica fora de doors_open).
  for (const p of byName(parts, /^door_r_/)) { warp(p, rotateAbout([HX + 0.09, C.eave, 0], [0, 0, 1], 8)); warp(p, rotateAbout([HX + 0.09, C.eave, -C.door.leaf / 2], [0, 1, 0], 3)); deformed.push(p.name); }
  // Tampão traseiro direito amolgado: prato recuado 5 cm e inclinado.
  const buf = parts.find(p => p.name === 'buffer_rr'), z0 = HZ + 0.3;
  warp(buf, p => p[2] > z0 ? rotateAbout([WAGON.buffer.x, WAGON.buffer.y, z0], [1, 0, 0], 7)(v3.add(p, [0, 0, -0.05 * (p[2] - z0) / 0.32])) : p); deformed.push('buffer_rr');
  // Cobertura do tejadilho levantada por cima do furo.
  const h = HX + 0.05, d = C.height - C.eave - 0.024, R = (h * h + d * d) / (2 * d), arc = x => C.height - R + Math.sqrt(R * R - x * x);   // face de cima do tejadilho intacto
  add(tag(bar([1.05, arc(1.05) + 0.015, cz], [1.62, arc(1.4) + 0.24, cz + 0.12], [0.85, 0.012], [0, 0, 1]), 'torn_roof_cover', 'roof_torn'));
  // Restos (nó `debris`): tábua arrancada a pender para fora, lascas no bordo e tábuas no soalho.
  add(tag(plank([HX + 0.01, cy - 0.12, cz - 0.42], [HX + 0.42, cy - 0.5, cz + 0.2], 0.145, 0.025), 'hanging_plank', 'splinter', 'debris'));
  add(tag(plank([HX - 0.03, cy + 0.2, cz + 0.35], [HX - 0.32, cy + 0.33, cz - 0.05], 0.06, 0.02), 'splinter_in', 'splinter', 'debris'));
  add(tag(plank([-0.2, FLOOR + 0.02, 1.0], [1.1, FLOOR + 0.03, 2.1], 0.145, 0.025, [0, 0, 1]), 'blown_plank_1', 'splinter', 'debris'));
  add(tag(plank([0.4, FLOOR + 0.02, 2.6], [1.25, FLOOR + 0.2, 1.5], 0.145, 0.025, [-1, 0, 0]), 'blown_plank_2', 'splinter', 'debris'));
  return { parts, removed: gone, added, deformed };
}

// ——— Aberto danificado: taipal direito rebentado de cima, tábuas a pender para fora, cantoneira e montante dobrados ———
function openDamaged() {
  const I = IMPACT.open;
  let { parts, gone } = drop(TYPES.open.build(), /^(side_r|top_rail_r)$/);
  const added = [], deformed = [], add = p => { parts.push(p); added.push(p.name); };
  const brk = [[0.28, OPEN_TOP], [0.18, 2.48], [0.02, 2.2], [-0.18, 2.02], [-0.42, 1.8], [-0.66, 1.9], [-0.88, 1.72], [-1.1, 1.98], [-1.3, 2.18], [-1.48, 2.5], [-1.6, OPEN_TOP]];
  add(tag(slab([[-HZ, 1.16], [HZ, 1.16], [HZ, OPEN_TOP], ...brk, [-HZ, OPEN_TOP]], HX - 0.05, HX, { map: ([u, v, x]) => [x, v, u], skip: [0] }), 'broken_side_r', 'wood_hit'));
  const x = HX - 0.01;
  add(tag(bent([[x, OPEN_TOP + 0.01, -HZ - 0.02], [x, OPEN_TOP + 0.01, -1.95], [x + 0.3, OPEN_TOP - 0.16, -0.8], [x + 0.02, OPEN_TOP + 0.01, 0.45], [x, OPEN_TOP + 0.01, HZ + 0.02]], [0.1, 0.08]), 'bent_top_rail_r', 'brown'));
  const post = parts.find(q => q.name === 'post_r_-0.79');
  warp(post, rotateAbout([HX + 0.02, 1.16, -0.79], [0, 0, 1], -13)); deformed.push(post.name);
  // Restos (nó `debris`): tábuas a pender para fora do rombo e tábuas soltas no soalho.
  add(tag(plank([HX + 0.01, 1.83, -1.45], [HX + 0.5, 1.42, -0.45]), 'hanging_plank_1', 'splinter', 'debris'));
  add(tag(plank([HX + 0.01, 1.95, 0.0], [HX + 0.42, 2.32, -0.92]), 'hanging_plank_2', 'splinter', 'debris'));
  add(tag(plank([HX + 0.01, 1.76, -0.85], [HX + 0.27, 1.5, -0.25], 0.12, 0.03), 'hanging_plank_3', 'splinter', 'debris'));
  for (const [i, a, b] of [[1, [-0.6, FLOOR + 0.02, -1.8], [0.9, FLOOR + 0.02, -0.6]], [2, [0.2, FLOOR + 0.02, 0.1], [1.2, FLOOR + 0.25, -1.1]], [3, [-1.0, FLOOR + 0.02, 0.8], [-0.1, FLOOR + 0.02, 2.2]]])
    add(tag(plank(a, b, 0.145, 0.03, [0, 0, 1]), `blown_plank_${i}`, 'splinter', 'debris'));
  return { parts, removed: gone, added, deformed };
}

export const STATES = {
  burned: {
    label: 'queimado',
    covered: { build: coveredBurned, summary: 'caixa de madeira ardida até 1,6–2,7 m, sem tejadilho; portas carbonizadas no carril; um arco do tejadilho caído, carril de cima da porta cedido, montantes da porta inclinados; tábuas do tejadilho e cinza no soalho' },
    open: { build: openBurned, summary: 'taipais ardidos até 1,3–2,3 m; cantoneiras do topo cedidas e torcidas; dois montantes inclinados; carga carbonizada (vigas e cinza) no soalho' },
  },
  damaged: {
    label: 'danificado',
    covered: { build: coveredDamaged, summary: 'furo de impacto de ~1 × 0,8 m no painel traseiro direito, com lascas, estilhaços e fuligem; diagonal empurrada para dentro; porta direita saída da guia de baixo; tampão traseiro direito amolgado; cobertura do tejadilho levantada; tábuas soltas' },
    open: { build: openDamaged, summary: 'taipal direito rebentado de cima numa extensão de ~1,9 m, com tábuas a pender para fora; cantoneira do topo e montante da porta dobrados para fora; estilhaços e fuligem; tábuas soltas no soalho' },
  },
};

/** Pivôs: os do kit intacto mais `debris` (restos soltos), a meio do soalho. */
export function pivots(type) { return { ...basePivots(type), debris: { t: [0, FLOOR, 0] } }; }
/** Sockets: iguais aos do kit intacto; o danificado acrescenta `impact` (centro do furo, face exterior). */
export function sockets(type, state) { return { ...baseSockets(type), ...(state === 'damaged' ? { impact: IMPACT[type].p } : {}) }; }
/** Animações por variante: rodados sempre; doors_open só no coberto danificado e só na porta esquerda. */
export const animations = (type, state) => ['wheels_roll', ...(type === 'covered' && state === 'damaged' ? ['doors_open'] : [])];
export const DOORS_OPEN = { covered: { damaged: ['door_l'] } };

// ——— Pintura (original): carvão com fissuras, aço sem tinta com ferrugem e fuligem, cinza, madeira lascada ———
const BROWN = [0.43, 0.2, 0.16], RAW = [0.27, 0.21, 0.15];
const SOOT = [0.045, 0.04, 0.036], CHAR = [0.085, 0.07, 0.056], ASH = [0.5, 0.49, 0.46], RUST = [0.37, 0.19, 0.1], BLISTER = [0.19, 0.1, 0.075], SPLINTER = [0.64, 0.5, 0.33];
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const lum = (c, k) => c.map(x => x * k);
function boards(coord, seed) {
  const w = 0.145, i = Math.floor(coord / w), f = coord / w - i;
  return (1 - 0.5 * (1 - smoothstep(0, 0.05, Math.min(f, 1 - f)))) * (1 + (hash(i, seed) - 0.5) * 0.14);
}
/** Fissuras de carvão (“pele de crocodilo”): células alongadas no sentido do veio; 1 na fissura. */
function crackle(along, across) {
  const row = Math.floor(across / 0.036), off = hash(row, 9), cu = along / 0.08 + off, iu = Math.floor(cu);
  const du = Math.min(cu - iu, 1 - cu + iu) * 0.08 * (0.7 + 0.6 * hash(iu, row)), fv = across / 0.036 - row, dv = Math.min(fv, 1 - fv) * 0.036;
  return 1 - smoothstep(0.0015, 0.005, Math.min(du, dv));
}
const grain = (p, n) => Math.abs(n[1]) > 0.7 ? [p[2], p[0]] : Math.abs(n[0]) > 0.7 ? [p[2], p[1]] : [p[0], p[1]];

function charWood({ p, n }, burntBias = 0) {
  const [along, across] = grain(p, n), k = boards(across, 3), cr = crackle(along, across);
  const burnt = clamp(smoothstep(1.3, 1.95, p[1] + 0.45 * fbm(p, 1.6, 3)) + burntBias);
  const blister = mix(lum(BROWN, 0.55 + 0.2 * fbm(p, 7, 2)), BLISTER, smoothstep(-0.2, 0.3, fbm(p, 5, 3)));
  let c = mix(blister, mix(CHAR, SOOT, cr), burnt);
  if (n[1] > 0.6) c = mix(c, ASH, 0.45 * smoothstep(-0.25, 0.4, fbm(p, 4, 2)));
  return { c: lum(c, k), r: 0.95, m: 0, h: -cr * 0.4 };
}
/** Aço com a tinta queimada: fuligem e ferrugem, mais fortes em cima (o calor sobe); o aro das rodas fica mais limpo. */
const scorch = (base, k = 0.85) => ctx => {
  const r = base(ctx), rust = smoothstep(-0.05, 0.35, fbm(ctx.p, 2.3, 3)), f = k * (0.55 + 0.45 * smoothstep(0.4, 1.6, ctx.p[1]));
  let c = mix(r.c, mix(SOOT, RUST, rust * 0.85), f);
  if (ctx.n[1] > 0.6) c = mix(c, ASH, 0.3 * Math.max(0, fbm(ctx.p, 5, 2)));
  return { c, r: clamp((r.r ?? 0.8) + 0.15 * f), m: (r.m ?? 0) * (1 - 0.7 * f), h: 0 };
};
/** Fuligem do rebentamento e furos de estilhaço à volta do impacto (só perto dele; o resto fica como no intacto). */
const hit = (base, I) => ctx => {
  const r = base(ctx), d = v3.dist(ctx.p, I.p) + 0.25 * fbm(ctx.p, 3, 2);
  if (d > 2.6) return r;
  let c = mix(r.c, SOOT, 0.8 * (1 - smoothstep(I.r * 0.7, I.r * 2.4, d)));
  const [a, b] = grain(ctx.p, ctx.n), cell = 0.09, ia = Math.floor(a / cell), ib = Math.floor(b / cell);
  const hx = (ia + 0.2 + 0.6 * hash(ia, ib, 5)) * cell, hy = (ib + 0.2 + 0.6 * hash(ia, ib, 6)) * cell, rad = 0.007 + 0.013 * hash(ia, ib, 7);
  const dens = 0.55 * (1 - smoothstep(I.r * 0.8, 2.4, d)), dh = Math.hypot(a - hx, b - hy);
  if (hash(ia, ib, 8) < dens) { if (dh < rad) c = [0.02, 0.017, 0.014]; else if (dh < rad * 1.9) c = mix(c, SPLINTER, 0.6); }
  return { ...r, c };
};
const splinter = ({ p, n }) => {
  const [along] = grain(p, n), streak = fbm([along * 2, p[1] * 40, p[0] * 40], 1, 3);
  return { c: lum(SPLINTER, 0.85 + 0.25 * streak), r: 0.9, m: 0, h: 0 };
};

export function painters(type, state) {
  if (state === 'burned') {
    return {
      char: ctx => charWood(ctx),
      char_floor: ctx => {
        const r = charWood(ctx, 0.75), [a, b] = grain(ctx.p, ctx.n);
        const hole = fbm([a * 1.4, b * 1.4, 3.1], 1, 3) > 0.42 ? 0.25 : 1;   // tábuas ardidas até ao fim, com vãos escuros
        return { ...r, c: lum(r.c, hole) };
      },
      ash: ({ p, n }) => ({ c: mix(mix(CHAR, ASH, smoothstep(-0.3, 0.35, fbm(p, 6, 3))), SOOT, n[1] < 0.3 ? 0.6 : 0), r: 1, m: 0, h: 0 }),
      brown: scorch(PAINTERS.brown), black: scorch(PAINTERS.black, 0.7), buffer: scorch(PAINTERS.buffer, 0.75), wheel: scorch(PAINTERS.wheel, 0.6),
    };
  }
  const I = IMPACT[type], out = Object.fromEntries(Object.entries(PAINTERS).map(([k, f]) => [k, hit(f, I)]));
  return Object.assign(out, {
    splinter,
    // Painel partido: faces das lascas (bordo do furo) em madeira crua; as faces da parede como no intacto, com estilhaços.
    wood_hit: ctx => Math.abs(ctx.n[0]) < 0.5 && v3.dist(ctx.p, I.p) < I.r * 3 ? splinter(ctx) : out.wood(ctx),
    roof_torn: ctx => ctx.n[1] < 0 ? { c: lum(RAW, 0.5), r: 0.95, m: 0, h: 0 } : out.roof(ctx),
  });
}
