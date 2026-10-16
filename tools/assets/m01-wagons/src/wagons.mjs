// Vagões de mercadorias de dois eixos para o trem 963 e o pátio de M01: coberto (tipo G, portas de correr) e aberto
// (tipo O). Genéricos da época com proporções da construção normalizada alemã (Verbandsbauart): a composição do
// trem 963 continua por identificar (P16), por isso nenhum modelo afirma uma classe. Original; metros; +Y para
// cima; frente em −Z (os vagões são simétricos); origem no topo do carril, ao centro da via e a meio do vagão.
import { v3, smoothstep } from '../../m01-soldiers/src/meshops.mjs';
import { fbm, hash } from '../../m01-soldiers/src/noise.mjs';

// ——— Dimensões (as estimadas estão marcadas em MEASURES) ———
export const WAGON = {
  lop: 9.10,                  // comprimento entre faces dos tampões
  frame: 7.86,                // comprimento do estrado (entre travessas de topo)
  width: 2.90,                // largura da caixa
  wheelbase: 4.0, wheelR: 0.5, gauge: 1.435, tread: 0.75,   // rodados: meia distância entre círculos de rolamento
  journal: 1.0,               // centro das caixas de eixo
  buffer: { x: 0.875, y: 1.04, length: 0.62 },
  floor: 1.24,                // topo do soalho
  covered: { eave: 3.30, height: 3.85, door: { width: 1.80, height: 2.0, leaf: 1.95, travel: 1.95 } },
  open: { wall: 1.55, height: 2.84, door: 1.50 },
};
const HZ = WAGON.frame / 2, HX = WAGON.width / 2, AXLES = [-WAGON.wheelbase / 2, WAGON.wheelbase / 2];
// Folha da porta: de 1,18 m (sobre o carril de baixo) ao beiral; centro usado também como pivô do nó.
const DOOR_H = WAGON.covered.eave - 1.18, DOOR_Y = 1.18 + DOOR_H / 2;

export const MEASURES = [
  { id: 'gauge', value_m: 1.435, estimated: false, source: 'bitola normal europeia (PKP, DRG e Cidade Livre de Danzig)' },
  { id: 'length_over_buffers', value_m: WAGON.lop, estimated: true, source: 'proporções da Verbandsbauart (G 10 / O); assets-m01.json: ~9–10 m a confirmar (P16)' },
  { id: 'frame_length', value_m: WAGON.frame, estimated: true, source: 'comprimento entre tampões menos 2 × 0,62 m de tampão' },
  { id: 'body_width', value_m: WAGON.width, estimated: true, source: 'proporções gerais; com as portas de correr e os puxadores, o coberto mede 3,18 m' },
  { id: 'wheelbase', value_m: WAGON.wheelbase, estimated: true, source: 'proporções da Verbandsbauart' },
  { id: 'wheel_diameter', value_m: 1.0, estimated: true, source: 'valor corrente de vagões de mercadorias da época' },
  { id: 'buffer_height', value_m: WAGON.buffer.y, estimated: true, source: 'valor corrente (≈1,04 m sobre o carril)' },
  { id: 'buffer_spacing', value_m: 2 * WAGON.buffer.x, estimated: true, source: 'valor corrente (1,75 m entre centros)' },
  { id: 'floor_height', value_m: WAGON.floor, estimated: true, source: 'proporções gerais' },
  { id: 'covered_height', value_m: WAGON.covered.height, estimated: true, source: 'tejadilho em arco; proporções gerais do G 10' },
  { id: 'covered_door', value_m: [WAGON.covered.door.width, WAGON.covered.door.height], estimated: true, source: 'uma porta de correr por lado, abertura estimada' },
  { id: 'open_wall_height', value_m: WAGON.open.wall, estimated: true, source: 'altura dos taipais acima do soalho, estimada' },
  { id: 'count_train_963', value: 65, estimated: false, source: 'T07, T08 (65 vagões; tipos desconhecidos, P16)' },
];

// ——— Primitivas com faces planas e UV em metros (as ilhas do atlas ficam com a área real) ———
const tag = (part, name, paint, group = 'body') => Object.assign(part, { name, paint, group });

/** Paralelepípedo de centro c, eixos unitários directos [ax, ay, az] e dimensões s (24 vértices). */
function cuboid(c, [ax, ay, az], s) {
  const positions = [], uvs = [], indices = [], h = s.map(x => x / 2);
  for (const [d, u, w] of [[0, 1, 2], [1, 2, 0], [2, 0, 1]]) for (const sg of [-1, 1]) {
    const base = positions.length / 3;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const k = [0, 0, 0]; k[d] = sg * h[d]; k[u] = a * h[u]; k[w] = b * h[w];
      positions.push(...v3.add(c, v3.add(v3.mul(ax, k[0]), v3.add(v3.mul(ay, k[1]), v3.mul(az, k[2])))));
      uvs.push((a + 1) / 2 * s[u], (b + 1) / 2 * s[w]);
    }
    indices.push(...(sg > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]).map(i => base + i));
  }
  return { positions, uvs, indices };
}
const box = (s, c) => cuboid(c, [[1, 0, 0], [0, 1, 0], [0, 0, 1]], s);
/** Barra de secção [w, h] de a a b; w segue `side` (projectado na perpendicular), h a terceira direcção. */
function bar(a, b, [w, h], side = [1, 0, 0]) {
  const az = v3.norm(v3.sub(b, a)), ax = v3.norm(v3.sub(side, v3.mul(az, v3.dot(side, az))));
  return cuboid(v3.mul(v3.add(a, b), 0.5), [ax, v3.cross(az, ax), az], [w, h, v3.dist(a, b)]);
}

/**
 * Prisma de contorno convexo [u, v] (anti-horário) entre w0 e w1, colocado por `map` (rotação). Faces planas;
 * os vértices em `smooth` partilham a normal (part.weld) entre as faces laterais vizinhas.
 */
function prism(outline, w0, w1, { map = p => p, smooth = [] } = {}) {
  const positions = [], uvs = [], indices = [], weld = [], n = outline.length, L = w1 - w0;
  const put = (p, uv, key) => { positions.push(...map(p)); uvs.push(...uv); weld.push(key); return positions.length / 3 - 1; };
  let s = 0;
  for (let i = 0; i < n; i++) {
    const a = outline[i], b = outline[(i + 1) % n], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ka = smooth.includes(i) ? `s${i}` : `e${i}a`, kb = smooth.includes((i + 1) % n) ? `s${(i + 1) % n}` : `e${i}b`;
    const q = [put([a[0], a[1], w0], [s, 0], `${ka}0`), put([b[0], b[1], w0], [s + len, 0], `${kb}0`), put([b[0], b[1], w1], [s + len, L], `${kb}1`), put([a[0], a[1], w1], [s, L], `${ka}1`)];
    indices.push(q[0], q[1], q[2], q[0], q[2], q[3]);
    s += len;
  }
  for (const [w, sg] of [[w0, -1], [w1, 1]]) {
    const base = positions.length / 3;
    outline.forEach((p, i) => put([p[0], p[1], w], [p[0], p[1]], `c${w}${i}`));
    for (let i = 1; i < n - 1; i++) indices.push(...(sg > 0 ? [base, base + i, base + i + 1] : [base, base + i + 1, base + i]));
  }
  return { positions, uvs, indices, weld };
}

/**
 * Sólido de revolução: polígono fechado [a, r] (a ao longo de `axis`, r radial) em torno do eixo por c.
 * Cada aresta é uma faixa com vértices próprios (arestas vivas entre faixas, liso em volta do eixo); as
 * arestas em `skip` não são geradas. A orientação de cada triângulo segue a normal exterior do polígono.
 */
function revolve(profile, c, axis, { segments = 12, skip = [] } = {}) {
  const az = v3.norm(axis), e1 = v3.norm(v3.cross(Math.abs(az[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], az)), e2 = v3.cross(az, e1);
  const n = profile.length, positions = [], uvs = [], indices = [];
  const area = profile.reduce((s, p, i) => { const q = profile[(i + 1) % n]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);
  const pt = (a, r, phi) => v3.add(c, v3.add(v3.mul(az, a), v3.add(v3.mul(e1, r * Math.cos(phi)), v3.mul(e2, r * Math.sin(phi)))));
  for (let i = 0; i < n; i++) {
    if (skip.includes(i)) continue;
    const p = profile[i], q = profile[(i + 1) % n], len = Math.hypot(q[0] - p[0], q[1] - p[1]), rmax = Math.max(p[1], q[1]);
    const na = (area > 0 ? 1 : -1) * (q[1] - p[1]), nr = (area > 0 ? -1 : 1) * (q[0] - p[0]);   // normal exterior no plano (a, r)
    const base = positions.length / 3;
    for (let k = 0; k <= segments; k++) {
      const phi = k / segments * Math.PI * 2;
      positions.push(...pt(p[0], p[1], phi), ...pt(q[0], q[1], phi));
      uvs.push(phi * rmax, 0, phi * rmax, len);
    }
    const P = j => positions.slice((base + j) * 3, (base + j) * 3 + 3);
    for (let k = 0; k < segments; k++) for (const tri of [[0, 2, 3], [0, 3, 1]]) {
      const t = tri.map(j => base + k * 2 + j), [A, B, C] = t.map(j => P(j - base));
      const nrm = v3.cross(v3.sub(B, A), v3.sub(C, A));
      if (v3.len(nrm) < 1e-10) continue;
      const m = v3.mul(v3.add(v3.add(A, B), C), 1 / 3), rad = v3.sub(v3.sub(m, c), v3.mul(az, v3.dot(v3.sub(m, c), az)));
      const want = v3.add(v3.mul(az, na), v3.mul(v3.norm(rad), nr));
      indices.push(...(v3.dot(nrm, want) >= 0 ? t : [t[0], t[2], t[1]]));
    }
  }
  return { positions, uvs, indices };
}

// Perfis [a, r]: roda de raio 0,5 m com aro cónico e verdugo do lado de dentro; tampão de prato redondo.
const WHEEL = [[0.07, 0.08], [0.07, 0.475], [-0.065, 0.5], [-0.065, 0.535], [-0.09, 0.53], [-0.09, 0.08]];
const BUFFER = [[0, 0], [0, 0.1], [0.36, 0.1], [0.36, 0.075], [0.56, 0.075], [0.56, 0.185], [0.6, 0.185], [0.62, 0]];

/** Estrado, rodados, molas, freios, tampões e engates (comuns aos dois tipos). */
function underframe(parts) {
  const B = WAGON.buffer;
  for (const zs of [-1, 1]) parts.push(tag(box([WAGON.width, 0.34, 0.22], [0, 1.03, zs * (HZ - 0.11)]), `headstock_${zs < 0 ? 'f' : 'r'}`, 'black'));
  for (const s of [-1, 1]) parts.push(tag(box([0.08, 0.3, 2 * HZ - 0.44], [s * 0.98, 1.01, 0]), `solebar_${s < 0 ? 'l' : 'r'}`, 'black'));
  for (const z of [-1.0, 1.0]) parts.push(tag(box([1.88, 0.2, 0.12], [0, 1.06, z]), `crossmember_${z < 0 ? 'f' : 'r'}`, 'black'));
  parts.push(tag(box([WAGON.width, 0.08, 2 * HZ], [0, WAGON.floor - 0.04, 0]), 'floor', 'wood'));
  AXLES.forEach((z, i) => {
    const g = `wheelset_${i + 1}`, zs = Math.sign(z);
    for (const s of [-1, 1]) {
      const side = s < 0 ? 'l' : 'r', c = [s * WAGON.tread, WAGON.wheelR, z];
      parts.push(Object.assign(tag(revolve(WHEEL, c, [s, 0, 0], { segments: 16, skip: [5] }), `wheel_${i + 1}${side}`, 'wheel', g), { c, axis: [s, 0, 0] }));
      parts.push(tag(box([0.2, 0.3, 0.32], [s * WAGON.journal, WAGON.wheelR, z]), `axlebox_${i + 1}${side}`, 'black'));
      for (const dz of [-0.2, 0.2]) parts.push(tag(box([0.04, 0.42, 0.06], [s * WAGON.journal, 0.65, z + dz]), `axleguard_${i + 1}${side}${dz < 0 ? 'f' : 'r'}`, 'black'));
      const spring = [[-0.6, 0.74], [-0.3, 0.655], [0, 0.63], [0.3, 0.655], [0.6, 0.74], [0.6, 0.8], [-0.6, 0.8]];
      parts.push(tag(prism(spring, -0.045, 0.045, { map: ([u, v, w]) => [s * WAGON.journal - w, v, z + u] }), `spring_${i + 1}${side}`, 'black'));
      parts.push(tag(box([0.08, 0.32, 0.08], [s * WAGON.tread, WAGON.wheelR, z - zs * 0.53]), `brake_shoe_${i + 1}${side}`, 'black'));
    }
    parts.push(tag(revolve([[-0.98, 0], [-0.98, 0.065], [0.98, 0.065], [0.98, 0]], [0, WAGON.wheelR, z], [1, 0, 0], { segments: 8, skip: [3] }), `axle_${i + 1}`, 'black', g));
    parts.push(tag(box([1.6, 0.06, 0.06], [0, WAGON.wheelR, z - zs * 0.58]), `brake_beam_${i + 1}`, 'black'));
  });
  for (const zs of [-1, 1]) {
    const end = zs < 0 ? 'f' : 'r';
    for (const s of [-1, 1]) {
      parts.push(tag(revolve(BUFFER, [s * B.x, B.y, zs * HZ], [0, 0, zs], { segments: 10, skip: [0, 7] }), `buffer_${end}${s < 0 ? 'l' : 'r'}`, 'buffer'));
      parts.push(tag(box([0.35, 0.03, 0.12], [s * B.x, 0.62, zs * (HZ + 0.06)]), `shunter_step_${end}${s < 0 ? 'l' : 'r'}`, 'black'));
    }
    parts.push(tag(box([0.06, 0.14, 0.3], [0, B.y, zs * (HZ + 0.15)]), `hook_${end}`, 'black'));
    for (const x of [-0.05, 0.05]) parts.push(tag(bar([x, B.y, zs * (HZ + 0.28)], [x, 0.86, zs * (HZ + 0.42)], [0.025, 0.04]), `coupling_link_${end}${x < 0 ? 'l' : 'r'}`, 'black'));
  }
}

/** Arco do tejadilho: centro e raio pela corda à altura do beiral e pela flecha até ao cume. */
function roofArc(half, eave, crest, steps = 8) {
  const R = (half * half + (crest - eave) ** 2) / (2 * (crest - eave)), cy = crest - R, a0 = Math.asin(half / R);
  return Array.from({ length: steps + 1 }, (_, k) => { const a = Math.PI / 2 - a0 + (2 * a0) * k / steps; return [R * Math.cos(a), cy + R * Math.sin(a)]; });
}

/** Vagão coberto (tipo G): caixa de tábuas com montantes e diagonais de aço, tejadilho em arco, porta de correr por lado. */
export function buildCovered() {
  const parts = [], C = WAGON.covered, D = C.door, hd = D.width / 2, wallY = (1.16 + C.eave) / 2, wallH = C.eave - 1.16;
  underframe(parts);
  for (const s of [-1, 1]) {
    const side = s < 0 ? 'l' : 'r', x = s * (HX - 0.025);
    for (const zs of [-1, 1]) parts.push(tag(box([0.05, wallH, HZ - hd], [x, wallY, zs * (HZ + hd) / 2]), `side_${side}_${zs < 0 ? 'f' : 'r'}`, 'wood'));
    parts.push(tag(box([0.05, C.eave - WAGON.floor - D.height, D.width], [x, (WAGON.floor + D.height + C.eave) / 2, 0]), `lintel_${side}`, 'wood'));
    for (const z of [-hd - 0.05, hd + 0.05, -2.45, 2.45]) parts.push(tag(box([0.04, wallH, 0.1], [s * (HX + 0.02), wallY, z]), `post_${side}_${z.toFixed(2)}`, 'brown'));
    for (const zs of [-1, 1]) for (const [z0, z1] of [[hd + 0.1, 2.4], [2.5, HZ - 0.06]])
      parts.push(tag(bar([s * (HX + 0.02), 1.22, zs * z0], [s * (HX + 0.02), C.eave - 0.06, zs * z1], [0.04, 0.08]), `brace_${side}_${zs < 0 ? 'f' : 'r'}${z0 > 2 ? 'o' : 'i'}`, 'brown'));
    for (const zs of [-1, 1]) parts.push(tag(box([0.03, 0.28, 0.45], [s * (HX + 0.02), C.eave - 0.25, zs * 3.35]), `vent_${side}_${zs < 0 ? 'f' : 'r'}`, 'brown'));
    for (const [y, h] of [[C.eave + 0.03, 0.06], [1.14, 0.05]]) parts.push(tag(box([0.06, h, 2 * hd + D.travel + 0.1], [s * (HX + 0.05), y, D.travel / 2]), `door_rail_${side}_${y > 2 ? 'top' : 'bottom'}`, 'black'));
    // Porta (nó próprio): fechada sobre a abertura, corre para +Z por fora dos montantes.
    parts.push(tag(box([0.04, DOOR_H, D.leaf], [s * (HX + 0.09), DOOR_Y, 0]), `door_${side}_leaf`, 'door', `door_${side}`));
    parts.push(tag(box([0.03, 0.25, 0.04], [s * (HX + 0.125), 2.1, -0.85]), `door_${side}_handle`, 'black', `door_${side}`));
  }
  const arc = roofArc(HX, C.eave, C.height - 0.05);
  for (const zs of [-1, 1]) {
    const end = zs < 0 ? 'f' : 'r';
    parts.push(tag(prism([[-HX, 1.16], [HX, 1.16], ...arc], zs < 0 ? -HZ : HZ - 0.05, zs < 0 ? -HZ + 0.05 : HZ), `end_${end}`, 'wood'));
    for (const x of [-0.6, 0.6]) parts.push(tag(box([0.1, 2.44, 0.04], [x, 2.38, zs * (HZ + 0.02)]), `end_post_${end}${x < 0 ? 'l' : 'r'}`, 'brown'));
    for (const s of [-1, 1]) parts.push(tag(box([0.08, wallH + 0.04, 0.08], [s * (HX + 0.01), wallY, zs * (HZ - 0.02)]), `corner_${end}${s < 0 ? 'l' : 'r'}`, 'brown'));
    for (const s of [-1, 1]) parts.push(tag(bar([s * 1.25, 1.3, zs * (HZ + 0.06)], [s * 1.25, 1.8, zs * (HZ + 0.06)], [0.03, 0.03]), `grab_${end}${s < 0 ? 'l' : 'r'}`, 'black'));
  }
  const roof = roofArc(HX + 0.05, C.eave + 0.024, C.height);
  parts.push(tag(prism([[-HX - 0.05, C.eave - 0.03], [HX + 0.05, C.eave - 0.03], ...roof], -HZ - 0.1, HZ + 0.1, { smooth: roof.map((_, i) => i + 2).slice(1, -1) }), 'roof', 'roof'));
  return parts;
}

/** Vagão aberto (tipo O): taipais de tábuas com montantes, cantoneira no topo e portas de duas folhas fixas. */
export function buildOpen() {
  const parts = [], O = WAGON.open, top = WAGON.floor + O.wall, wallY = (1.16 + top) / 2, wallH = top - 1.16, hd = O.door / 2;
  underframe(parts);
  for (const s of [-1, 1]) {
    const side = s < 0 ? 'l' : 'r';
    parts.push(tag(box([0.05, wallH, 2 * HZ], [s * (HX - 0.025), wallY, 0]), `side_${side}`, 'wood'));
    parts.push(tag(box([0.1, 0.08, 2 * HZ + 0.04], [s * (HX - 0.01), top + 0.01, 0]), `top_rail_${side}`, 'brown'));
    for (const z of [-hd - 0.04, hd + 0.04, -2.35, 2.35]) parts.push(tag(box([0.04, wallH, 0.08], [s * (HX + 0.02), wallY, z]), `post_${side}_${z.toFixed(2)}`, 'brown'));
  }
  for (const zs of [-1, 1]) {
    const end = zs < 0 ? 'f' : 'r';
    parts.push(tag(box([WAGON.width - 0.1, wallH, 0.05], [0, wallY, zs * (HZ - 0.025)]), `end_${end}`, 'wood'));
    parts.push(tag(box([WAGON.width + 0.08, 0.08, 0.1], [0, top + 0.01, zs * (HZ - 0.01)]), `top_rail_${end}`, 'brown'));
    for (const x of [-0.6, 0.6]) parts.push(tag(box([0.1, wallH, 0.04], [x, wallY, zs * (HZ + 0.02)]), `end_post_${end}${x < 0 ? 'l' : 'r'}`, 'brown'));
    for (const s of [-1, 1]) parts.push(tag(box([0.08, wallH + 0.04, 0.08], [s * (HX + 0.01), wallY, zs * (HZ - 0.02)]), `corner_${end}${s < 0 ? 'l' : 'r'}`, 'brown'));
  }
  return parts;
}

export const TYPES = {
  covered: { build: buildCovered, label: 'vagão coberto (tipo G), portas de correr', height: WAGON.covered.height },
  open: { build: buildOpen, label: 'vagão aberto (tipo O)', height: WAGON.open.height },
};

/** Pivôs dos nós móveis: rodados no eixo, portas no centro da porta fechada. */
export function pivots(type) {
  const p = { body: { t: [0, 0, 0] }, wheelset_1: { t: [0, WAGON.wheelR, AXLES[0]] }, wheelset_2: { t: [0, WAGON.wheelR, AXLES[1]] } };
  if (type === 'covered') for (const s of [-1, 1]) p[`door_${s < 0 ? 'l' : 'r'}`] = { t: [s * (HX + 0.09), DOOR_Y, 0] };
  return p;
}

export function sockets(type) {
  const L = WAGON.lop / 2, s = {
    coupler_front: [0, WAGON.buffer.y, -L], coupler_rear: [0, WAGON.buffer.y, L],
    wheelset_1: [0, WAGON.wheelR, AXLES[0]], wheelset_2: [0, WAGON.wheelR, AXLES[1]],
    fire: [0, WAGON.floor + 0.05, 0], smoke_top: [0, TYPES[type].height, 0],
  };
  if (type === 'covered') Object.assign(s, { door_r: [HX, WAGON.floor, 0], door_l: [-HX, WAGON.floor, 0], disembark_r: [HX + 0.9, 0, 0], disembark_l: [-HX - 0.9, 0, 0] });
  else s.load = [0, WAGON.floor, 0];
  return s;
}

// ——— Pintura (original): castanho-avermelhado de vagão de mercadorias, estrado preto, tejadilho cinzento ———
// Sem inscrições de dono, número ou classe: não há fonte para os vagões do trem 963 (P16).
const BROWN = [0.43, 0.2, 0.16], BLACK = [0.14, 0.13, 0.12], ROOF = [0.3, 0.3, 0.29], RAW = [0.27, 0.21, 0.15], STEEL = [0.46, 0.46, 0.45];
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const grime = (p, c, k = 1) => mix(c.map(x => x * (1 + fbm(p, 2.5, 3) * 0.1)), [0.12, 0.1, 0.08], k * (0.3 * smoothstep(1.9, 1.0, p[1]) + 0.12 * Math.max(0, fbm(p, 0.8, 2))));
/** Interior da caixa: faces viradas para dentro (paredes, topos, soalho, face de baixo do tejadilho). */
const inside = (p, n) => (Math.abs(n[0]) > 0.7 && n[0] * p[0] < 0 && Math.abs(p[0]) < HX - 0.02) || (Math.abs(n[2]) > 0.7 && n[2] * p[2] < 0 && Math.abs(p[2]) < HZ - 0.02)
  || (n[1] > 0.7 && p[1] < WAGON.floor + 0.01 && p[1] > WAGON.floor - 0.01) || (n[1] < -0.7 && p[1] > WAGON.covered.eave - 0.1);
/** Tábuas de 0,145 m: juntas escuras e tom por tábua. */
function boards(coord, seed) {
  const w = 0.145, i = Math.floor(coord / w), f = coord / w - i;
  return (1 - 0.5 * (1 - smoothstep(0, 0.05, Math.min(f, 1 - f)))) * (1 + (hash(i, seed) - 0.5) * 0.14);
}
export const PAINTERS = {
  wood: ({ p, n }) => {
    if (inside(p, n)) { const k = boards(n[1] > 0.7 ? p[0] : p[1], 7); return { c: RAW.map(x => x * k * (1 + fbm(p, 6, 2) * 0.15)), r: 0.95, m: 0, h: 0 }; }
    const k = boards(Math.abs(n[1]) > 0.7 ? p[0] : p[1], 3);
    return { c: grime(p, BROWN.map(x => x * k)), r: 0.85, m: 0, h: 0 };
  },
  door: ({ p, n }) => {
    const k = boards(p[2], 5), brace = Math.abs(Math.abs(p[2]) * 0.95 - Math.abs(p[1] - 2.25)) < 0.05 ? 0.85 : 1;   // tábuas verticais e cruz de reforço
    return { c: grime(p, BROWN.map(x => x * k * brace)), r: 0.85, m: 0, h: 0 };
  },
  brown: ({ p }) => ({ c: grime(p, BROWN.map(x => x * 0.92), 0.8), r: 0.7, m: 0, h: 0 }),
  black: ({ p }) => ({ c: mix(BLACK, [0.3, 0.22, 0.15], Math.max(0, fbm(p, 4, 3)) * 0.6), r: 0.75, m: 0, h: 0 }),   // preto com pó e ferrugem
  roof: ({ p, n }) => {
    if (n[1] < -0.7) return { c: RAW.map(x => x * 0.6), r: 0.95, m: 0, h: 0 };
    const seam = Math.abs(((p[2] + 0.25) % 0.5 + 0.5) % 0.5 - 0.25) < 0.012 ? 0.8 : 1;   // ripas da cobertura
    return { c: ROOF.map(x => x * seam * (1 + fbm(p, 3, 3) * 0.12)), r: 0.9, m: 0, h: 0 };
  },
  buffer: ({ p, n }) => {
    const face = Math.abs(n[2]) > 0.6 && Math.abs(p[2]) > HZ + 0.58;   // prato do tampão, polido pelo contacto
    return face ? { c: STEEL, r: 0.4, m: 0.5, h: 0 } : { c: BLACK, r: 0.7, m: 0, h: 0 };
  },
  wheel: ({ p, n, part }) => {
    const d = v3.sub(p, part.c), r = Math.hypot(d[1], d[2]), radial = Math.abs(v3.dot(n, part.axis)) < 0.5;
    if (radial && r > 0.47) return { c: STEEL, r: 0.4, m: 0.5, h: 0 };   // aro e verdugo de aço polido
    // Roda de raios (10), pintada nas faces planas: raios e cubo pretos, vãos escuros.
    const t = ((Math.atan2(d[2], d[1]) / (Math.PI / 5)) % 1 + 1) % 1, spoke = Math.min(t, 1 - t) < 0.2 - 0.08 * (r / 0.42);
    const gap = !radial && r > 0.15 && r < 0.42 && !spoke;
    return { c: gap ? [0.02, 0.018, 0.016] : mix(BLACK, [0.34, 0.26, 0.18], 0.4 + Math.max(0, fbm(p, 6, 2)) * 0.4), r: 0.75, m: 0, h: 0 };
  },
};
