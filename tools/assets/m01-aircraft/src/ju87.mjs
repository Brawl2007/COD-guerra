// Junkers Ju 87 B-1 (1939) em loft/torno, original. Metros; +Y para cima; nariz para −Z; asa direita (estibordo) em
// +X. Origem = centro de gravidade estimado sobre o eixo de tracção (pivô de voo). Sem coordenadas de Tczew.
// Medidas de T29 (comprimento 11,10 m, envergadura 13,80 m, altura 4,24 m); o resto é estimado (ver MEASURES).
import { loft, lathe } from '../../m01-soldiers/src/geom.mjs';
import { v3, clamp, smoothstep } from '../../m01-soldiers/src/meshops.mjs';
import { orientOutward } from '../../m01-soldiers/src/garments.mjs';
import { fbm, hash } from '../../m01-soldiers/src/noise.mjs';

const deg = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
/** Interpola uma tabela [[x, ...valores]] em x (linear, com extremos fixos). */
function table(rows) {
  return x => {
    if (x <= rows[0][0]) return rows[0].slice(1);
    for (let i = 1; i < rows.length; i++) if (x <= rows[i][0]) { const t = (x - rows[i - 1][0]) / (rows[i][0] - rows[i - 1][0]); return rows[i].slice(1).map((v, k) => lerp(rows[i - 1][k + 1], v, t)); }
    return rows.at(-1).slice(1);
  };
}
const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);
/** Secção superelíptica no plano XY à cota z. */
function section(cx, cy, z, w, h, { n = 16, e = 0.7 } = {}) {
  return Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); return [cx + Math.sign(c) * Math.abs(c) ** e * w / 2, cy + Math.sign(s) * Math.abs(s) ** e * h / 2, z]; });
}
/** Perfil NACA 00xx fechado com espaçamento em cosseno: [meia-espessura com sinal, fracção da corda]. */
function airfoil(t, n = 24) {
  return Array.from({ length: n }, (_, i) => {
    const th = i / n * Math.PI * 2, x = (1 + Math.cos(th)) / 2;
    const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    return [th <= Math.PI ? yt : -yt, 1 - x];
  });
}
const tag = (part, name, paint, group = 'fuselage') => Object.assign(part, { name, paint, group });
const mirror = p => { const P = p.positions; for (let i = 0; i < P.length; i += 3) P[i] = -P[i]; for (let t = 0; t < p.indices.length; t += 3) [p.indices[t + 1], p.indices[t + 2]] = [p.indices[t + 2], p.indices[t + 1]]; return p; };
const mirrored = (p, name) => mirror(Object.assign({ ...p, positions: [...p.positions], uvs: [...p.uvs], indices: [...p.indices] }, { name }));
function blk([w, h, d], c, e = 0.25) {
  return orientOutward(loft([section(c[0], c[1], c[2] + d / 2, w, h, { n: 8, e }), section(c[0], c[1], c[2] - d / 2, w, h, { n: 8, e })], { caps: 'both' }), c);
}
function rod(a, b, r, segments = 8) {
  const d = v3.norm(v3.sub(b, a)), x = v3.norm(v3.cross(Math.abs(d[1]) > 0.9 ? [0, 0, 1] : [0, 1, 0], d)), y = v3.cross(d, x);
  const ring = c => Array.from({ length: segments }, (_, i) => { const t = i / segments * Math.PI * 2; return v3.add(c, v3.add(v3.mul(x, Math.cos(t) * r), v3.mul(y, Math.sin(t) * r))); });
  return orientOutward(loft([ring(a), ring(b)], { caps: 'both' }), q => v3.add(a, v3.mul(d, v3.dot(v3.sub(q, a), d))));
}
/** Roda (pneu) de raio r e largura w, eixo X, centrada em c. */
function wheel(c, r, w, segments = 20) {
  const p = lathe((t, phi) => { const a = t * Math.PI * 2, rr = r - w / 2 + Math.cos(a) * w / 2; return [c[0] + Math.sin(a) * w / 2, c[1] + Math.cos(phi) * rr, c[2] + Math.sin(phi) * rr]; }, { rings: 12, segments });
  return orientOutward(p, q => { const d = Math.hypot(q[1] - c[1], q[2] - c[2]) || 1; return [c[0], c[1] + (q[1] - c[1]) / d * (r - w / 2), c[2] + (q[2] - c[2]) / d * (r - w / 2)]; });
}

// ——— Planta e alçado ———
export const FUSE = table([   // z, centro y, largura, altura
  [-4.40, 0.02, 0.62, 0.62], [-4.25, 0.02, 0.86, 0.92], [-3.90, 0.0, 1.0, 1.18], [-3.30, -0.02, 1.06, 1.30], [-2.60, 0.0, 1.08, 1.40],
  [-2.0, 0.05, 1.08, 1.50], [-1.0, 0.08, 1.06, 1.52], [0.0, 0.10, 1.04, 1.48], [1.2, 0.12, 0.96, 1.36], [2.4, 0.16, 0.80, 1.14],
  [3.6, 0.22, 0.62, 0.90], [4.8, 0.30, 0.44, 0.66], [5.8, 0.36, 0.28, 0.46], [6.5, 0.40, 0.10, 0.24]]);
const fuseTop = z => { const [cy, , h] = FUSE(z); return cy + h / 2; };
const fuseBottom = z => { const [cy, , h] = FUSE(z); return cy - h / 2; };
const HALF_SPAN = 6.9, CRANK_X = 1.95, MG17_X = 2.6, PITOT_X = 5.7, ANTENNA_Z = 0.3, ANTENNA_FIN_Y = 1.5;
/** Capota: [z, largura, altura acima do topo da fuselagem]; aros nas cotas CANOPY_FRAMES. */
const CANOPY = [[-2.02, 0.6, 0.04], [-1.88, 0.72, 0.40], [-1.5, 0.76, 0.52], [0.4, 0.76, 0.52], [1.0, 0.72, 0.47], [1.35, 0.6, 0.3], [1.48, 0.38, 0.06]], CANOPY_E = 0.62;
const CANOPY_FRAMES = [-1.86, -1.62, -1.2, -0.72, -0.28, 0.12, 0.48, 0.86, 1.22];
const canopyTable = table(CANOPY), canopyAt = z => canopyTable(z);
/** Ponto da secção da capota em z e ângulo a (0 = lado direito, π/2 = topo), afastado por escala s + folga d. */
function canopyPoint(z, a, s = 1, d = 0) { const [w, h] = canopyAt(z), c = Math.cos(a), sn = Math.sin(a), H = h + 0.08, cy = fuseTop(z) - 0.08 + H / 2;
  return [Math.sign(c) * Math.abs(c) ** CANOPY_E * (w * s + d) / 2, cy + Math.sign(sn) * Math.abs(sn) ** CANOPY_E * (H + d) / 2, z]; }
/** Deriva [y, corda, bordo de ataque] e estabilizador [x, corda, bordo de ataque]. */
const FIN_ROWS = [[0.3, 1.6, 4.95], [0.8, 1.42, 5.08], [1.2, 1.18, 5.25], [1.48, 0.92, 5.48], [1.58, 0.6, 5.72], [1.6, 0.2, 5.95]];
const TAIL_ROWS = [[0.0, 1.25, 5.25], [0.6, 1.2, 5.28], [1.6, 1.0, 5.38], [2.2, 0.8, 5.5], [2.45, 0.45, 5.68]];
const finAt = table(FIN_ROWS), tailAt = table(TAIL_ROWS);
/** Asa em gaivota invertida: y do plano médio, bordo de ataque, corda e espessura relativa em cada x (> 0). */
export function wingAt(x) {
  // Inclinação −11° na secção interior e +7,8° na exterior, com o cotovelo arredondado em ±0,3 m (integração numérica).
  let y = -0.5;
  for (let k = 0, steps = 60, dx = (x - 0.5) / steps; k < steps; k++) y += dx * lerp(-Math.tan(11 * deg), Math.tan(7.8 * deg), smoothstep(CRANK_X - 0.3, CRANK_X + 0.3, 0.5 + (k + 0.5) * dx));
  const cLin = lerp(3.0, 1.6, clamp((x - 0.5) / 5.9)), tip = x > 6.0 ? Math.sqrt(Math.max(0.03, 1 - ((x - 6.0) / 0.92) ** 2)) : 1;
  const chord = cLin * tip, le = -1.2 + (x - 0.5) * 0.055 + (cLin - chord) * 0.4;
  return { y, le, chord, t: lerp(0.165, 0.10, clamp((x - 0.5) / 6.4)) };
}

/** Pontos de referência e pivôs (metros, referencial do avião). */
export const JU87 = {
  length: 11.10, span: 13.80, height: 4.24, wingArea_m2: 31.9,
  hub: [0, 0, -4.35], prop: { blades: 3, radius: 1.7 }, crank: CRANK_X,
  brakes: { x0: 2.65, x1: 4.35, chord: 0.24, frac: 0.16 }, bomb: [0, -1.06, -0.55], cg: [0, 0, 0],
};
const brakeHinge = x => { const w = wingAt(x), f = JU87.brakes.frac, th = airfoil(w.t, 96).filter(([s]) => s < 0).reduce((b, p) => Math.abs(p[1] - f) < Math.abs(b[1] - f) ? p : b)[0]; return [x, w.y + th * w.chord - 0.012, w.le + f * w.chord]; };
export const BRAKE = (() => {
  const a = brakeHinge(JU87.brakes.x0), b = brakeHinge(JU87.brakes.x1), d = v3.sub(b, a);
  return { a, length: v3.len(d), roll: Math.atan2(d[1], d[0]) };   // rotação em Z que leva +X ao eixo da dobradiça
})();

/**
 * Proveniência das medidas (manifest.json → measures). T29 é RESUMO (flugzeuginfo.net/airpages.ru); estimated: true
 * quando a medida foi desenhada por proporção com vistas de três lados genéricas do Ju 87 B.
 */
export const MEASURES = [
  { id: 'length', value_m: 11.10, source: 'T29', estimated: false, note: 'da ponta do cubo da hélice ao bordo de fuga do leme' },
  { id: 'wingspan', value_m: 13.80, source: 'T29', estimated: false, note: 'pontas das asas (x = ±6,90)' },
  { id: 'height', value_m: 4.24, source: 'T29', estimated: true, note: 'publicada provavelmente em atitude de solo; o modelo mede ~4,27 m da roda ao topo da deriva em atitude de voo' },
  { id: 'wing_area', value_m2: 31.9, source: 'conhecimento geral (sem fonte lida)', estimated: true, note: 'só orienta a planta; a do modelo é calculada no manifesto' },
  { id: 'gull_wing', value_deg: [-11, 7.8], source: 'vistas de frente genéricas', estimated: true, note: 'anedro da secção interior e diedro da exterior; cotovelo a x = ±1,95 m' },
  { id: 'chords', value_m: [3.0, 1.6], source: 'proporção', estimated: true, note: 'corda na raiz e antes da ponta arredondada' },
  { id: 'propeller', value_m: 3.4, source: 'proporção', estimated: true, note: 'hélice tripá de passo variável; diâmetro estimado' },
  { id: 'tailplane_span', value_m: 4.9, source: 'proporção', estimated: true, note: 'estabilizador escorado por montantes por baixo' },
  { id: 'track', value_m: 3.9, source: 'proporção', estimated: true, note: 'bitola do trem fixo carenado (rodas a x = ±1,95)' },
  { id: 'dive_brakes', value_m: [1.70, 0.24], source: 'proporção', estimated: true, note: 'grelhas sob as asas exteriores, rodam 90° na dobradiça dianteira' },
  { id: 'mg17', value_m: 2.6, source: 'conhecimento geral (sem fonte lida)', estimated: true, note: 'duas MG 17 nas asas, por fora do trem; posição x = ±2,6 m estimada' },
  { id: 'pitot', value_m: -5.7, source: 'vistas genéricas', estimated: true, note: 'tubo de Pitot sob o bordo de ataque da asa esquerda; posição estimada' },
  { id: 'antenna', value_m: [0.3, 5.55], source: 'vistas genéricas', estimated: true, note: 'mastro curto na espinha da secção fixa central da capota (z = 0,3) e fio até ao bordo de ataque da deriva (y = 1,5); disposição estimada' },
  { id: 'canopy_frames', value_m: [-1.86, 1.22], source: 'proporção', estimated: true, note: 'nove aros e três calhas; número e posição estimados' },
  { id: 'sc250', value_m: [1.64, 0.368], source: 'conhecimento geral (sem fonte lida)', estimated: true, note: 'bomba SC 250 no garfo ventral; carga do raid de Tczew não documentada' },
];

/** Peças por grupo (nó final): fuselage (célula), propeller, dive_brake_l/r, bomb_sc250. */
export function buildJu87() {
  const parts = [];
  // Fuselagem (capota do motor incluída) e cone de cauda.
  const zs = [...range(-4.4, -2.6, 6), ...range(-2.3, 6.5, 22)];
  parts.push(tag(orientOutward(loft(zs.map(z => { const [cy, w, h] = FUSE(z); return section(0, cy, z, w, h, { n: 40, e: 0.72 }); }), { caps: 'both' }), q => [0, FUSE(q[2])[0], q[2]]), 'fuselage', 'airframe'));
  // Radiador sob o motor (B: banheira grande debaixo do nariz) e escape (6 tubos por lado), entrada do compressor à esquerda.
  const rad = [[-4.15, -0.62, 0.56, 0.38], [-3.75, -0.69, 0.66, 0.54], [-3.1, -0.67, 0.64, 0.5], [-2.7, -0.58, 0.5, 0.3]];
  parts.push(tag(orientOutward(loft(rad.map(([z, y, w, h]) => section(0, y, z, w, h, { n: 20, e: 0.55 })), { caps: 'both' }), q => [0, -0.65, q[2]]), 'radiator', 'airframe'));
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) parts.push(tag(blk([0.07, 0.055, 0.11], [s * 0.535, 0.13, -3.85 + i * 0.2]), `exhaust_${s < 0 ? 'l' : 'r'}${i}`, 'exhaust'));
  parts.push(tag(blk([0.08, 0.11, 0.24], [-0.56, -0.2, -3.05]), 'supercharger_intake', 'airframe'));
  // Capota envidraçada (piloto à frente, atirador atrás) e MG 15 traseira.
  // A capota é um nó próprio com material de vidro (fora do atlas); armações, tripulação e cabine vêem-se através dela.
  parts.push(tag(orientOutward(loft(CANOPY.map(([z, w, h]) => section(0, fuseTop(z) - 0.08 + (h + 0.08) / 2, z, w, h + 0.08, { n: 28, e: CANOPY_E })), { caps: 'both' }), q => [0, fuseTop(q[2]), q[2]]), 'canopy', 'glass', 'canopy'));
  for (const z of CANOPY_FRAMES) {   // aros: faixas finas por fora do vidro (pára-brisas, secções deslizantes do piloto e do atirador)
    const ring = dz => { const [w, h] = canopyAt(z + dz); return section(0, fuseTop(z + dz) - 0.08 + (h + 0.08) / 2, z + dz, w * 1.03 + 0.012, h + 0.08 + 0.016, { n: 28, e: CANOPY_E }); };
    parts.push(tag(orientOutward(loft([ring(-0.018), ring(0.018)]), q => [0, fuseTop(q[2]) + 0.2, q[2]]), `canopy_frame_${z}`, 'frame'));
  }
  for (const a of [0.52, Math.PI - 0.52, Math.PI / 2]) {   // calhas laterais e espinha superior
    const zs = range(-1.86, 1.3, 14).map(z => canopyPoint(z, a, 1.03, 0.012));
    parts.push(tag(orientOutward(loft(zs.map((c, i) => { const d = v3.norm(v3.sub(zs[Math.min(i + 1, zs.length - 1)], zs[Math.max(i - 1, 0)])), x = v3.norm(v3.cross([0, 1, 0], d)), y = v3.cross(d, x);
      return [0, 1, 2, 3].map(k => v3.add(c, v3.add(v3.mul(x, Math.cos(k * Math.PI / 2 + Math.PI / 4) * 0.016), v3.mul(y, Math.sin(k * Math.PI / 2 + Math.PI / 4) * 0.016)))); }), { caps: 'both' }), q => q), `canopy_rail_${a.toFixed(2)}`, 'frame'));
  }
  // Tripulação (silhuetas simples) e cabine: piloto virado para a frente, atirador para trás, encosto blindado, painel.
  for (const [z, face, y] of [[-0.95, -1, 1.12], [0.78, 1, 1.05]]) {
    const head = lathe((t, phi) => { const th = t * Math.PI; return [Math.cos(phi) * Math.sin(th) * 0.105, y + Math.cos(th) * 0.12, z + Math.sin(phi) * Math.sin(th) * 0.115]; }, { rings: 7, segments: 12 });
    parts.push(Object.assign(tag(orientOutward(head, [0, y, z]), face < 0 ? 'pilot_head' : 'gunner_head', 'crew'), { face, centre: [0, y, z] }));
    parts.push(Object.assign(tag(blk([0.42, 0.2, 0.24], [0, y - 0.21, z - face * 0.04], 0.45), face < 0 ? 'pilot_torso' : 'gunner_torso', 'crew'), { face: 0 }));
  }
  parts.push(tag(blk([0.34, 0.32, 0.05], [0, 1.05, -0.74], 0.3), 'pilot_headrest', 'interior'), tag(blk([0.5, 0.2, 0.04], [0, 0.98, -1.6], 0.3), 'instrument_panel', 'interior'));
  const mg = [0, fuseTop(1.2) + 0.3, 1.15];
  parts.push(tag(rod(mg, v3.add(mg, [0, 0.12, 0.7]), 0.016), 'mg15_barrel', 'exhaust'));
  parts.push(tag(blk([0.1, 0.12, 0.22], v3.add(mg, [0, 0.0, 0.05])), 'mg15_body', 'exhaust'));
  // Asas em gaivota invertida e flaperons Junkers (Doppelflügel) por baixo e atrás do bordo de fuga.
  const xs = [...range(0.45, 1.6, 4), ...range(1.7, 2.2, 5), ...range(2.4, 6.0, 9), ...range(6.15, HALF_SPAN, 5)];
  const wingRing = x => { const w = wingAt(x); return airfoil(w.t, 32).map(([s, f]) => [x, w.y + s * w.chord + 0.012 * w.chord * Math.sin(Math.PI * f), w.le + f * w.chord]); };
  const wingR = orientOutward(loft(xs.map(wingRing), { caps: 'both' }), q => { const w = wingAt(Math.max(0.45, q[0])); return [q[0], w.y, w.le + w.chord * 0.4]; });
  parts.push(tag(wingR, 'wing_r', 'airframe'), tag(mirrored(wingR, 'wing_l'), 'wing_l', 'airframe'));
  const fx = range(0.95, 6.45, 14), flapRing = x => { const w = wingAt(x), c = 0.2 * w.chord + 0.04; return airfoil(0.12, 16).map(([s, f]) => [x, w.y - 0.07 + s * c, w.le + w.chord - 0.05 + f * c]); };
  const flapR = orientOutward(loft(fx.map(flapRing), { caps: 'both' }), q => { const w = wingAt(q[0]); return [q[0], w.y - 0.07, w.le + w.chord + 0.1]; });
  parts.push(tag(flapR, 'flaperon_r', 'airframe'), tag(mirrored(flapR, 'flaperon_l'), 'flaperon_l', 'airframe'));
  // MG 17 nas asas, por fora do trem (canos e tubos de protecção à frente do bordo de ataque) e tubo de Pitot na asa esquerda.
  { const w = wingAt(MG17_X), c = [MG17_X, w.y - 0.01, w.le + 0.02];
    const gun = [rod(c, v3.add(c, [0, 0, -0.16]), 0.022, 8), rod(v3.add(c, [0, 0, -0.1]), v3.add(c, [0, 0, -0.34]), 0.011, 6)];
    gun.forEach((p, i) => parts.push(tag(p, `mg17_r${i}`, 'exhaust'), tag(mirrored(p, `mg17_l${i}`), `mg17_l${i}`, 'exhaust'))); }
  { const w = wingAt(PITOT_X), c = [-PITOT_X, w.y - 0.03, w.le + 0.05];
    parts.push(tag(rod(c, v3.add(c, [0, 0, -0.42]), 0.011, 6), 'pitot', 'exhaust'), tag(rod(v3.add(c, [0, 0.03, 0.05]), v3.add(c, [0, 0, -0.05]), 0.02, 6), 'pitot_mast', 'exhaust')); }
  // Antena: mastro curto assente na espinha da secção fixa central da capota e fio, por cima do atirador e da MG 15,
  // até ao bordo de ataque da deriva (entra 2 cm na deriva).
  { const base = canopyPoint(ANTENNA_Z, Math.PI / 2, 1.03, 0.012), top = v3.add(base, [0, 0.2, 0.06]), fin = [0, ANTENNA_FIN_Y, finAt(ANTENNA_FIN_Y)[1] + 0.02];
    parts.push(tag(rod(v3.add(base, [0, -0.02, 0]), top, 0.014, 6), 'antenna_mast', 'frame'), tag(rod(top, fin, 0.006, 4), 'antenna_wire', 'exhaust')); }
  // Trem fixo carenado ("calças"), rodas e sirenes (Jericho-Trompete) à frente das carenagens.
  const spat = [[-0.8, -0.55, 0.30, 1.10], [-1.1, -0.62, 0.24, 0.80], [-1.5, -0.70, 0.22, 0.62], [-1.85, -0.78, 0.30, 0.95], [-2.2, -0.82, 0.34, 1.20], [-2.45, -0.84, 0.30, 1.05], [-2.58, -0.84, 0.14, 0.55]];
  const spatR = orientOutward(loft(spat.map(([y, cz, w, d]) => Array.from({ length: 20 }, (_, i) => { const a = i / 20 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); return [CRANK_X + Math.sign(c) * Math.abs(c) ** 0.8 * w / 2, y, cz + Math.sign(s) * Math.abs(s) ** 0.8 * d / 2 * (s > 0 ? 1.15 : 0.85)]; })), { caps: 'both' }), q => [CRANK_X, q[1], -0.75]);
  parts.push(tag(spatR, 'gear_fairing_r', 'airframe'), tag(mirrored(spatR, 'gear_fairing_l'), 'gear_fairing_l', 'airframe'));
  const wR = wheel([CRANK_X, -2.25, -0.85], 0.42, 0.17);
  parts.push(tag(wR, 'wheel_r', 'tire'), tag(mirrored(wR, 'wheel_l'), 'wheel_l', 'tire'));
  const sirenR = [blk([0.15, 0.15, 0.26], [CRANK_X, -1.3, -1.17], 0.9), rod([CRANK_X, -1.3, -1.32], [CRANK_X, -1.3, -1.26], 0.03)];
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; sirenR.push(blk([0.03, 0.12, 0.015], [CRANK_X + Math.cos(a) * 0.065, -1.3 + Math.sin(a) * 0.065, -1.33])); }
  sirenR.forEach((p, i) => { parts.push(tag(p, `siren_r${i}`, 'exhaust'), tag(mirrored(p, `siren_l${i}`), `siren_l${i}`, 'exhaust')); });
  // Cauda: deriva + leme, estabilizador escorado por montantes, roda de cauda.
  parts.push(tag(orientOutward(loft(FIN_ROWS.map(([y, c, le]) => airfoil(0.09, 24).map(([s, f]) => [s * c, y, le + f * c])), { caps: 'both' }), q => [0, q[1], 5.6]), 'fin_rudder', 'airframe'));
  const stabR = orientOutward(loft(TAIL_ROWS.map(([x, c, le]) => airfoil(0.1, 24).map(([s, f]) => [x, 0.42 + s * c, le + f * c])), { caps: 'both' }), q => [q[0], 0.42, 5.8]);
  parts.push(tag(stabR, 'tailplane_r', 'airframe'), tag(mirrored(stabR, 'tailplane_l'), 'tailplane_l', 'airframe'));
  const strutR = rod([0.16, fuseBottom(5.55) + 0.05, 5.55], [1.25, 0.37, 5.78], 0.025);
  parts.push(tag(strutR, 'tail_strut_r', 'airframe'), tag(mirrored(strutR, 'tail_strut_l'), 'tail_strut_l', 'airframe'));
  parts.push(tag(rod([0, fuseBottom(5.55) + 0.03, 5.5], [0, -0.36, 5.72], 0.04), 'tailwheel_leg', 'airframe'), tag(wheel([0, -0.36, 5.72], 0.16, 0.08, 14), 'tailwheel', 'tire'));
  // Garfo ventral (Trapez) da bomba.
  for (const s of [-1, 1]) parts.push(tag(rod([s * 0.2, fuseBottom(-0.1) + 0.04, -0.05], [s * 0.1, -0.9, -0.6], 0.025), `bomb_crutch_${s < 0 ? 'l' : 'r'}`, 'exhaust'));

  // Hélice (nó próprio, pivô no cubo): cone e 3 pás com passo decrescente para a ponta.
  const spin = lathe((t, phi) => { const r = 0.31 * Math.sqrt(Math.max(0, Math.sin(t * Math.PI / 2))); return [Math.cos(phi) * r, Math.sin(phi) * r, -0.2 + t * 0.26]; }, { rings: 8, segments: 24, caps: 'end' });
  parts.push(tag(orientOutward(spin, q => [0, 0, q[2]]), 'spinner', 'propeller', 'propeller'));
  for (let b = 0; b < 3; b++) {
    const rot = b * 2 * Math.PI / 3, rs = range(0.22, JU87.prop.radius, 12);
    const rings = rs.map(r => {
      const u = r / JU87.prop.radius, c = (0.22 + 0.12 * Math.sin(Math.min(1, u * 1.4) * Math.PI)) * (u > 0.9 ? Math.sqrt(Math.max(0.05, 1 - ((u - 0.9) / 0.1) ** 2)) : 1);
      const beta = Math.atan(0.6 / Math.max(r, 0.3)), t = lerp(0.14, 0.05, u);
      return airfoil(t, 16).map(([s, f]) => { const cc = (f - 0.35) * c, th = s * c; const p = [cc * Math.cos(beta) - th * Math.sin(beta), r, -cc * Math.sin(beta) - th * Math.cos(beta)]; return [p[0] * Math.cos(rot) - p[1] * Math.sin(rot), p[0] * Math.sin(rot) + p[1] * Math.cos(rot), p[2]]; });
    });
    parts.push(tag(orientOutward(loft(rings, { caps: 'both' }), q => { const r = Math.hypot(q[0], q[1]) || 1; const k = Math.min(r, 1.6) / r; return [q[0] * k, q[1] * k, 0]; }), `blade_${b}`, 'propeller', 'propeller'));
  }
  // Disco de hélice (nó próprio, material translúcido fora do atlas): a hélice a ~1500 rpm lê-se como um disco ténue.
  { const seg = 40, R0 = 0.3, R1 = JU87.prop.radius + 0.02, positions = [], uvs = [], indices = [];
    for (let i = 0; i < seg; i++) for (const r of [R0, R1]) { const a = i / seg * Math.PI * 2, x = Math.cos(a) * r, y = Math.sin(a) * r; positions.push(x, y, -0.03); uvs.push(0.5 + x / (2 * R1), 0.5 - y / (2 * R1)); }
    for (let i = 0; i < seg; i++) { const a = i * 2, b = ((i + 1) % seg) * 2; indices.push(a, a + 1, b, b, a + 1, b + 1); }
    parts.push(tag({ positions, uvs, indices }, 'propeller_disc', 'disc', 'propeller_disc')); }
  // Freios de mergulho (nós próprios, pivô na dobradiça dianteira, +X ao longo da dobradiça): recolhidos = planos.
  const plate = orientOutward(loft([[0, 0], [BRAKE.length, 0]].map(([x]) => [[x, -0.018, 0], [x, 0, 0], [x, 0, JU87.brakes.chord], [x, -0.018, JU87.brakes.chord]]), { caps: 'both' }), [BRAKE.length / 2, -0.009, JU87.brakes.chord / 2]);
  { const c = Math.cos(BRAKE.roll), sn = Math.sin(BRAKE.roll), P = plate.positions;   // dobradiça direita no referencial do avião
    for (let i = 0; i < P.length; i += 3) { const [x, y] = [P[i], P[i + 1]]; P[i] = BRAKE.a[0] + x * c - y * sn; P[i + 1] = BRAKE.a[1] + x * sn + y * c; P[i + 2] += BRAKE.a[2]; } }
  parts.push(tag(plate, 'dive_brake_r', 'brake', 'dive_brake_r'), tag(mirrored(plate, 'dive_brake_l'), 'dive_brake_l', 'brake', 'dive_brake_l'));
  // SC 250 (nó próprio): ogiva, corpo, cone de cauda e 4 aletas.
  const prof = [[0, 0], [0.08, 0.1], [0.25, 0.17], [0.4, 0.184], [1.0, 0.184], [1.25, 0.15], [1.45, 0.09], [1.64, 0.06]];
  const body = lathe((t, phi) => { const f = t * (prof.length - 1), i = Math.min(prof.length - 2, Math.floor(f)), u = f - i; const z = lerp(prof[i][0], prof[i + 1][0], u), r = lerp(prof[i][1], prof[i + 1][1], u); return [Math.cos(phi) * r, Math.sin(phi) * r, z - 0.82]; }, { rings: prof.length - 1, segments: 18, caps: 'end' });
  parts.push(tag(orientOutward(body, q => [0, 0, q[2]]), 'sc250_body', 'bomb', 'bomb_sc250'));
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; parts.push(tag(blk(i % 2 ? [0.012, 0.3, 0.32] : [0.3, 0.012, 0.32], [Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.62]), `sc250_fin${i}`, 'bomb', 'bomb_sc250')); }
  // Hélice e bomba foram desenhadas em torno da origem: colocá-las no cubo e no garfo (referencial do avião).
  for (const p of parts) if (p.group === 'propeller' || p.group === 'propeller_disc' || p.group === 'bomb_sc250') { const t = p.group === 'bomb_sc250' ? JU87.bomb : JU87.hub; for (let i = 0; i < p.positions.length; i += 3) for (let k = 0; k < 3; k++) p.positions[i + k] += t[k]; }
  for (const p of parts) p.texel = p.group === 'fuselage' ? 1 : 1.4;
  return parts;
}

/** Pivôs dos nós (a geometria do grupo exporta-se relativa ao pivô; os freios também rodados por `roll`). */
export const PIVOTS = {
  fuselage: { t: [0, 0, 0] }, canopy: { t: [0, 0, 0] }, propeller: { t: JU87.hub }, propeller_disc: { t: JU87.hub }, bomb_sc250: { t: JU87.bomb },
  dive_brake_r: { t: BRAKE.a, roll: BRAKE.roll }, dive_brake_l: { t: [-BRAKE.a[0], BRAKE.a[1], BRAKE.a[2]], roll: -BRAKE.roll, mirror: true },
};

export function sockets() {
  return {
    cg: JU87.cg, propeller_hub: JU87.hub, bomb_release: JU87.bomb, cockpit_eye: [0, fuseTop(-1.0) + 0.3, -1.0], gunner_mg15: [0, fuseTop(1.2) + 0.35, 1.85],
    siren_r: [CRANK_X, -1.3, -1.33], siren_l: [-CRANK_X, -1.3, -1.33], wheel_r: [CRANK_X, -2.67, -0.85], wheel_l: [-CRANK_X, -2.67, -0.85], tailwheel: [0, -0.52, 5.72],
    exhaust_r: [0.6, 0.13, -2.85], exhaust_l: [-0.6, 0.13, -2.85], wingtip_r: [HALF_SPAN, wingAt(HALF_SPAN).y, wingAt(HALF_SPAN).le], wingtip_l: [-HALF_SPAN, wingAt(HALF_SPAN).y, wingAt(HALF_SPAN).le],
  };
}

// ——— Pintura (original): RLM 70/71 em lascas por cima, RLM 65 por baixo, cruzes de 1939 sem a suástica da deriva ———
const RLM = { 70: [0.16, 0.2, 0.15], 71: [0.26, 0.29, 0.21], 65: [0.58, 0.67, 0.73] };
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
/** Padrão em lascas: paridade de três famílias de rectas rodadas no plano (u, v). */
const splinter = (u, v) => [[25, 1.7], [-55, 1.35], [80, 2.2]].reduce((k, [a, s]) => k + Math.floor((u * Math.cos(a * deg) + v * Math.sin(a * deg)) / s), 0) & 1;
/** Balkenkreuz de 1939 (preta com filetes brancos) centrada em (u, v) com envergadura S: 1 = preto, 2 = branco, 0 = fora. */
function cross(u, v, S) {
  const inC = (a, b) => (Math.abs(u) < S / 2 + b && Math.abs(v) < a + b) || (Math.abs(v) < S / 2 + b && Math.abs(u) < a + b);
  return inC(S * 0.1, 0) ? 1 : inC(S * 0.1, S * 0.055) ? 2 : 0;
}
const lineDist = (v, P, o = 0) => { const m = (((v - o) % P) + P) % P; return Math.min(m, P - m); };
const groove = (d, w) => 1 - smoothstep(w * 0.45, w, d);   // 1 no centro da junta, 0 a partir de w
const near = (v, list) => Math.min(...list.map(x => Math.abs(v - x)));
/**
 * Juntas da célula (estimadas, por proporção): g = linha de painel, hinge = folga de superfície de controlo,
 * fast = parafusos da capota do motor, cell = painel (variação de tom), exp = exposição ao desgaste (0..1).
 */
function panels(p, n, name) {
  const out = { g: 0, hinge: 0, fast: 0, cell: 0, exp: 0, walk: 0 };
  const top = n[1] > 0.25;
  if (name === 'fuselage') {
    const z = p[2], [cy, w, h] = FUSE(z), th = Math.atan2((p[1] - cy) / (h / 2), Math.abs(p[0]) / (w / 2)), r = (w + h) / 4;
    const rings = z < -2.3 ? [-4.05, -3.3, -2.45] : [];
    const dz = z < -2.3 ? near(z, rings) : lineDist(z, 0.9, -0.25), dth = near(th, [0.62, -0.5]) * r;
    out.g = Math.max(groove(dz, 0.012), z > -4.2 ? groove(dth, 0.012) : 0);
    const ring = z < -2.3 ? rings.findIndex(x => x > z) : 4 + Math.floor((z + 0.25) / 0.9);
    out.cell = ring * 4 + (th > 0.62 ? 0 : th > -0.5 ? 1 : 2);
    if (z < -2.3) { const s = th * r; out.fast = (lineDist(s, 0.11) < 0.009 && Math.abs(dz - 0.03) < 0.009) ? 1 : 0; out.exp = 0.4; }
    if (Math.abs(z + 1.9) < 0.25 || Math.abs(z - 1.42) < 0.2) out.exp = Math.max(out.exp, 0.45);   // bordos da cabine (mãos, botas)
  } else if (/^wing_/.test(name)) {
    const x = Math.abs(p[0]), w = wingAt(x), f = (p[2] - w.le) / w.chord, xs = [1.05, CRANK_X, 2.95, 3.95, 4.95, 5.9];
    out.g = Math.max(groove(Math.abs(f - 0.12) * w.chord, 0.012), groove(Math.abs(f - 0.62) * w.chord, 0.012), groove(near(x, xs), Math.abs(x - CRANK_X) < 0.05 ? 0.016 : 0.012));
    out.cell = xs.filter(v => v < x).length * 3 + (f < 0.12 ? 0 : f < 0.62 ? 1 : 2);
    out.exp = f < 0.06 ? 0.8 : 0;
    if (top && x > 0.55 && x < 1.6 && f > 0.2 && f < 0.72) { out.walk = 1; out.exp = 1; }
  } else if (/^flaperon_/.test(name)) {
    const x = Math.abs(p[0]);
    out.hinge = groove(Math.abs(x - 3.65), 0.014); out.cell = x < 3.65 ? 0 : 1; out.exp = 0.2;
  } else if (/^tailplane_/.test(name)) {
    const x = Math.abs(p[0]), [c, le] = tailAt(x), f = (p[2] - le) / c;
    out.hinge = groove(Math.abs(f - 0.58) * c, 0.012);
    const tab = x > 0.35 && x < 1.15 && f > 0.86;
    out.g = Math.max(groove(Math.abs(f - 0.86) * c, 0.008) * (x > 0.35 && x < 1.15 ? 1 : 0), f > 0.86 ? groove(near(x, [0.35, 1.15]), 0.008) : 0);
    out.cell = f < 0.58 ? 0 : tab ? 2 : 1;
  } else if (name === 'fin_rudder') {
    const [c, le] = finAt(p[1]), f = (p[2] - le) / c;
    out.hinge = p[1] > 0.32 ? groove(Math.abs(f - 0.5) * c, 0.012) : 0;
    out.g = Math.max(p[1] > 0.35 && p[1] < 0.85 ? groove(Math.abs(f - 0.86) * c, 0.008) : 0, f > 0.86 ? groove(near(p[1], [0.35, 0.85]), 0.008) : 0);
    out.cell = f < 0.5 ? 0 : 1;
  } else if (/^gear_fairing_/.test(name)) {
    out.g = groove(Math.abs(p[1] + 1.85), 0.012); out.cell = p[1] > -1.85 ? 0 : 1;
  }
  return out;
}
/** Interior da cabine visto pelo vidro: o topo da fuselagem dentro da planta da capota. */
const inCockpit = (p, n) => p[2] > -1.98 && p[2] < 1.42 && n[1] > 0.15 && Math.abs(p[0]) < canopyAt(p[2])[0] * 0.48 && p[1] > fuseTop(p[2]) - 0.1;
const INTERIOR = [0.2, 0.21, 0.19], ALU = [0.6, 0.61, 0.6];
function camo(p, n, name) {
  if (name === 'fuselage' && inCockpit(p, n)) return { c: INTERIOR.map(x => x * (1 + fbm(p, 9, 2) * 0.1)), r: 0.82, m: 0, h: 0 };
  const under = n[1] < -0.3, side = Math.abs(n[0]) > Math.abs(n[1]);
  let c = under ? RLM[65] : RLM[splinter(...(side ? [p[2], p[1]] : [p[0], p[2]])) ? 70 : 71];
  // Cruzes: asas (em cima e em baixo, x = ±5,0) e lados da fuselagem (z = 2,7).
  let k = 0;
  if (/^wing_/.test(name)) { const w = wingAt(5.0); k = cross(Math.abs(p[0]) - 5.0, p[2] - (w.le + w.chord * 0.45), 1.0); }
  if (name === 'fuselage' && side) k = cross(p[2] - 2.7, p[1] - 0.2, 0.72);
  if (k) c = k === 1 ? [0.03, 0.03, 0.03] : [0.86, 0.86, 0.84];
  const P = panels(p, n, name), seed = [...name].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  // Tom por painel (repintura/lotes de tinta) e desbotamento suave nas superfícies de cima.
  c = c.map(x => x * (0.955 + hash(P.cell, seed) * 0.09) * (1 + fbm(p, 3, 3) * 0.06));
  if (!under && n[1] > 0.3) c = mix(c, [0.5, 0.52, 0.46], 0.07 * (0.5 + 0.5 * fbm(p, 0.6, 2)));
  if (P.walk) c = c.map(x => x * 0.8);
  let r = 0.64 + fbm(p, 5, 2) * 0.06, m = 0.05;
  // Fuligem dos escapes ao longo dos lados, a abrir e a esbater para trás; óleo e poeira na barriga e nas calças.
  if (name === 'fuselage' && side && !under) {
    const t = clamp((p[2] + 3.95) / 5.8), centre = 0.13 - t * 0.28, width = 0.1 + t * 0.32;
    const soot = p[2] > -3.95 ? Math.exp(-(((p[1] - centre) / width) ** 2)) * (1 - smoothstep(0.15, 1, t)) * (0.7 + 0.3 * fbm([p[0] * 2, p[1] * 16, p[2] * 1.1], 1, 3)) : 0;
    c = mix(c, [0.05, 0.045, 0.04], soot * 0.75); r = lerp(r, 0.88, soot);
  }
  if (name === 'fuselage' && under) {
    const oil = clamp(1 - Math.abs(p[0]) / 0.42) * (1 - smoothstep(-2.6, 3.8, p[2])) * (p[2] > -2.7 ? 1 : 0) * clamp(0.5 + fbm([p[0] * 18, p[1] * 18, p[2] * 0.7], 1, 3) * 1.4);
    c = mix(c, [0.12, 0.1, 0.07], oil * 0.6); r = lerp(r, 0.34, oil);
  }
  if (p[1] < -1.6 || (under && p[2] > 3)) c = mix(c, [0.42, 0.37, 0.29], 0.28 * clamp((-1.6 - p[1]) / 0.8 + (under && p[2] > 3 ? 0.5 : 0)) * (0.6 + 0.4 * fbm(p, 6, 2)));
  // Lascas até ao alumínio onde há mãos, botas e erosão (raiz da asa, bordos de ataque, capota do motor, cabine).
  // Cobertura medida (amostragem do ruído): ~5 % com exp = 1, ~1 % com 0,5, quase nada abaixo de 0,3.
  const wear = P.exp ? 0.5 + 0.5 * fbm(p, 22, 3) + P.exp * 0.22 * smoothstep(0.45, 0.75, 0.5 + 0.5 * fbm(p, 2.5, 2)) : 0;
  const chip = smoothstep(0.72, 0.76, wear), rim = smoothstep(0.69, 0.72, wear) - chip;
  c = c.map(x => x * (1 - 0.3 * rim)); if (chip) { c = mix(c, ALU, chip); r = lerp(r, 0.36, chip); m = lerp(m, 0.85, chip); }
  // Juntas: mais escuras e em relevo negativo; folgas das superfícies de controlo mais fundas; parafusos em relevo.
  c = c.map(x => x * (1 - 0.24 * P.g) * (1 - 0.45 * P.hinge) * (1 + 0.12 * P.fast));
  if (P.walk) r = 0.86;
  return { c, r, m, h: -0.0025 * P.g - 0.0045 * P.hinge + 0.0007 * P.fast + (P.walk ? fbm(p, 60, 1) * 0.0004 : 0) };
}
export const PAINTERS = {
  airframe: ({ p, n, part }) => camo(p, n, part.name),
  frame: ({ p, n }) => { const c = RLM[splinter(p[0], p[2]) ? 70 : 71].map(x => x * (1 + fbm(p, 9, 2) * 0.08)), chip = smoothstep(0.66, 0.7, 0.5 + 0.5 * fbm(p, 22, 2));
    return { c: mix(c, ALU, chip), r: lerp(0.6, 0.36, chip), m: lerp(0.08, 0.85, chip), h: 0 }; },
  interior: ({ p }) => ({ c: INTERIOR.map(x => x * (1 + fbm(p, 12, 2) * 0.12)), r: 0.8, m: 0.1, h: 0 }),
  crew: ({ p, n, part }) => {
    // Cabeça: rosto na direcção em que o tripulante olha, capacete de couro no resto; tronco em fato de voo.
    if (!part.face) return { c: [0.3, 0.27, 0.2].map(x => x * (1 + fbm(p, 10, 2) * 0.1)), r: 0.85, m: 0, h: 0 };
    const face = n[2] * part.face > 0.35 && p[1] < part.centre[1] + 0.035;
    return face ? { c: [0.55, 0.4, 0.32], r: 0.7, m: 0, h: 0 } : { c: [0.2, 0.14, 0.09].map(x => x * (1 + fbm(p, 14, 2) * 0.15)), r: 0.55, m: 0, h: 0 };
  },
  exhaust: ({ p }) => { const heat = 0.5 + 0.5 * fbm(p, 30, 2);
    return { c: mix([0.12, 0.1, 0.09], [0.26, 0.15, 0.09], heat * 0.6).map(x => x * (1 + fbm(p, 50, 1) * 0.2)), r: 0.6, m: 0.55, h: 0 }; },
  tire: ({ p }) => ({ c: mix([0.06, 0.06, 0.06], [0.3, 0.27, 0.22], 0.25 + 0.15 * fbm(p, 8, 2)), r: 0.92, m: 0, h: 0 }),
  propeller: ({ p, part }) => {
    const r = Math.hypot(p[0], p[1]), base = RLM[70].map(x => x * (1 + fbm(p, 12, 2) * 0.1));
    if (part.name === 'spinner') return { c: base, r: 0.45, m: 0.15, h: 0 };
    const chip = r > 1.45 ? smoothstep(0.7, 0.74, 0.5 + 0.5 * fbm(p, 26, 2) + (r - 1.45) * 0.4) : 0;
    return { c: mix(base, ALU, chip), r: lerp(0.55, 0.35, chip), m: lerp(0.2, 0.85, chip), h: 0 };
  },
  brake: ({ p, uv }) => ({ c: (Math.sin(uv[1] * Math.PI * 26) > 0.3 ? RLM[65].map(x => x * 0.45) : RLM[65]).map(x => x * (1 + fbm(p, 10, 2) * 0.08)), r: 0.6, m: 0.2, h: 0 }),
  bomb: ({ p }) => ({ c: [0.22, 0.24, 0.2].map(x => x * (1 + fbm(p, 20, 2) * 0.12)), r: 0.6, m: 0.2, h: 0 }),
};
