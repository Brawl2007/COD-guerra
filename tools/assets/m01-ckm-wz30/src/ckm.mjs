// ckm wz.30 (cópia polaca da Browning M1917, arrefecida a água) no tripé de 1939, com a fita de tecido de 330 e a
// caixa de munição, em loft/torno, original. Referencial da cena: origem no chão sob o pião do tripé, +Y para cima,
// cano para −Z, lado direito da arma em +X. A arma tem o seu próprio referencial (nó ckm_elevate): origem no eixo dos
// munhões, os mesmos eixos. As medidas marcadas [T34] vêm das fontes; as restantes são estimativas (ver MEASURES).
import { loft, lathe, strap, place, axesFrom } from '../../m01-soldiers/src/geom.mjs';
import { orientOutward } from '../../m01-soldiers/src/garments.mjs';
import { v3, clamp, smoothstep } from '../../m01-soldiers/src/meshops.mjs';
import { fbm } from '../../m01-soldiers/src/noise.mjs';
import { section, tube, blk, rod, sweep } from '../../m01-rkm-wz28/src/rkm.mjs';

const tag = (part, name, paint, group) => Object.assign(part, { name, paint, group });
/** Orienta cada triângulo para fora do centróide da peça (peças convexas); igual ao gerador da MG 34. */
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

/**
 * Pontos-chave (metros). `head` e `trunnion` estão na cena; o resto da arma está no referencial da arma (origem no
 * eixo dos munhões). Tripé na posição baixa, para o atirador sentado (linha de mira a ~0,74 m do chão).
 */
export const CKM = {
  length: 1.2, barrel: 0.72, mass_kg: 13.6, belt_rounds: 330, rate_rpm: 600, water_l: 3,
  head: [0, 0.55, 0], trunnion: [0, 0.6, 0],
  boreY: 0.04, breechZ: 0.04, muzzleZ: -0.68, funnelZ: -0.83, buttZ: 0.37,
  jacket: { r: 0.042, z0: -0.025, z1: -0.64 },
  // Alavanca de armar à direita: acompanha o ferrolho (recua a cada tiro); puxa-se à mão, palma para cima, para armar.
  handle: [0.031, 0, 0.13], handleTravel: 0.1, handleRecoil: 0.055,
  // Fita: entra pela esquerda à altura `feed[1]`, cartuchos com o eixo em Z (bala para −Z), passo `pitch`.
  feed: { y: 0.055, z: 0.08, entry: -0.03, exit: 0.03 }, pitch: 0.016,
  // Caixa da fita (cena): 355 × 175 × 85 mm [T34]; o comprimento corre em X, a largura (85) no eixo dos cartuchos.
  box: { center: [-0.33, 0, 0.08], size: [0.355, 0.175, 0.085], lidOpen: 110 },
  // Tripé (cena): pé da frente, dois pés de trás, barra de pontaria horizontal entre as pernas de trás.
  tripod: { front: [0, 0, -0.75], rear: [0.42, 0, 0.52], bar: { y: 0.21, z: 0.3 } },
};
const B = CKM.boreY, F = CKM.feed;
/** Arma → cena na posição de repouso (sem pontaria). */
export const G = p => v3.add(CKM.trunnion, p);
const boxMouth = () => [CKM.box.center[0] + CKM.box.size[0] / 2 - 0.035, CKM.box.size[1], CKM.box.center[2]];

/**
 * Proveniência de cada medida (manifest.json → measures). source: fonte de research/SOURCES.md (T34, só por RESUMO de
 * busca); estimated: true quando a medida foi desenhada por proporção, sem cota publicada.
 */
export const MEASURES = [
  { id: 'length_total', value_m: 1.2, source: 'T34', estimated: false, note: 'comprimento total 1200 mm com o tapa-chamas cónico (do punho à boca do cone)' },
  { id: 'barrel', value_m: 0.72, source: 'T34', estimated: false, note: 'cano 720 mm, da culatra (z 0,04 na caixa) à boca (z −0,68, dentro do cone)' },
  { id: 'mass', value_kg: [13.6, 65], source: 'T34', estimated: false, note: 'arma 13,6 kg sem água; ~65 kg em combate com tripé, água e munição; não afecta a geometria' },
  { id: 'rate', value_rpm: [600, 450], source: 'T34', estimated: false, note: '600 tiros/min teóricos, 400–450 práticos; os clips usam 600 (intervalo de 0,1 s)' },
  { id: 'belt', value: 330, source: 'T34', estimated: false, note: 'fita de tecido de 330 cartuchos, alimentação pela esquerda (como a M1917); passo de 16 mm e largura da fita estimados' },
  { id: 'ammo_box', value_m: [0.355, 0.175, 0.085], source: 'T34 (mhki.kielce.eu, polski-kolekcjoner.pl)', estimated: false, note: 'caixa de aço pintada de caqui, pegas em cima e nos lados; tampa com dobradiça ao comprido; fecho e posição da dobradiça estimados' },
  { id: 'water_jacket', value_m: [0.084, 0.615], source: 'T34', estimated: true, note: 'manga de água de ~3 l [T34]; diâmetro 84 mm e comprimento 615 mm estimados para dar ~3 l à volta do cano' },
  { id: 'flash_funnel', value_m: 0.15, source: 'T34', estimated: true, note: 'tapa-chamas cónico ("lejek") incluído no comprimento [T34]; diâmetros e comprimento estimados' },
  { id: 'receiver', value_m: [0.06, 0.13, 0.33], source: 'fotografias (resumo)', estimated: true, note: 'caixa da culatra rectangular com tampa articulada, largura × altura × comprimento' },
  { id: 'grip', value_m: 0.11, source: 'fotografias (resumo)', estimated: true, note: 'punho de pistola de madeira sob a chapa de trás, gatilho à frente; forma do mecanismo de 1938 por confirmar' },
  { id: 'sights', value_m: [0.095, 0.095], source: 'T34', estimated: true, note: 'alça em quadro até 2000 m [T34] e massa na frente da manga; alturas acima do eixo (95 mm) estimadas' },
  { id: 'tripod', value_m: 0.88, source: 'T34', estimated: true, note: 'tripé wz.30 de 29,3 kg, altura máxima 880 mm (wz.34: 26,3 kg) [T34]; modelado na posição baixa (pião a 0,55 m, cano a 0,64 m); pernas, sapatas e barra estimadas; adaptador antiaéreo não modelado' },
  { id: 'cocking_handle', value_m: 0.1, source: 'M1917 (resumo)', estimated: true, note: 'alavanca à direita, acompanha o ferrolho; curso de 0,10 m à mão e 0,055 m por tiro estimados' },
];

/** Pivôs dos nós (cena, na posição de repouso). A geometria de cada grupo é exportada relativa ao seu pivô. */
export const PIVOTS = {
  ckm_tripod: [0, 0, 0], ckm_traverse: CKM.head, ckm_elevate: CKM.trunnion,
  ckm_cocking_handle: G(CKM.handle), ckm_feed_belt: G([F.entry, F.y, F.z]), ckm_belt_spent: G([F.exit, F.y, F.z]),
  ckm_belt_free: G([F.entry - 0.1, F.y, F.z]), ckm_ammo_box: CKM.box.center,
  ckm_ammo_box_lid: v3.add(CKM.box.center, [0, CKM.box.size[1], CKM.box.size[2] / 2]),
};
/** Hierarquia (pai de cada nó; null = filho da raiz ckm_wz30). */
export const PARENTS = {
  ckm_tripod: null, ckm_traverse: null, ckm_elevate: 'ckm_traverse', ckm_cocking_handle: 'ckm_elevate', ckm_feed_belt: 'ckm_elevate',
  ckm_belt_spent: 'ckm_elevate', ckm_belt_free: null, ckm_ammo_box: null, ckm_ammo_box_lid: 'ckm_ammo_box',
};
/** Rotação de repouso dos nós (graus, eixo): só a tampa da caixa, aberta (geometria modelada fechada). */
export const REST_ROT = { ckm_ammo_box_lid: { axis: [1, 0, 0], deg: CKM.box.lidOpen } };

const OPEN_SHAPES = new Set(['belt_free_fabric', 'belt_spent_fabric', 'trigger_guard', 'box_handle_top', 'box_handle_l', 'box_handle_r']);

/** Cartucho 7,92×57 com o eixo em Z (bala para −Z), centrado no meio do estojo em c; estojo e bala separados. */
function round(c, name, group, segments = 6) {
  const [x, y, z] = c, out = [];
  const caseP = lathe((t, phi) => {
    const zz = z + 0.032 - t * 0.057, r = t < 0.82 ? 0.0059 : t < 0.9 ? 0.0059 - (t - 0.82) / 0.08 * 0.0013 : 0.0046;
    return [x + Math.cos(phi) * r, y + Math.sin(phi) * r, zz];
  }, { rings: 3, segments, caps: 'both' });
  out.push(tag(orientOutward(caseP, q => [x, y, q[2]]), `${name}_case`, 'brass', group));
  out.push(tag(tube(0.0041, 0.0012, z - 0.025, z - 0.048, y, { segments, x }), `${name}_bullet`, 'bullet', group));
  return out;
}

/** Tubo de faces planas ao longo de Z em (x, y): perfil [[z, r], …]; tampos poligonais (n − 2 triângulos, sem vértice central). */
function prismZ(x, y, profile, segments, { capStart = false, capEnd = false } = {}) {
  const rings = profile.map(([z, r]) => Array.from({ length: segments }, (_, i) => { const a = i / segments * Math.PI * 2; return [x + Math.cos(a) * r, y + Math.sin(a) * r, z]; }));
  const part = loft(rings);
  const cap = (ring, atEnd) => {
    const s = part.positions.length / 3;
    ring.forEach((p, i) => { part.positions.push(...p); part.uvs.push(0.5 + 0.02 * Math.cos(i / segments * 6.283), atEnd ? 1 : 0); });
    for (let i = 1; i + 1 < segments; i++) part.indices.push(s, s + i, s + i + 1);
  };
  if (capStart) cap(rings[0], false);
  if (capEnd) cap(rings.at(-1), true);
  return part;
}
/**
 * Cartucho do LOD0 leve: só o que fica fora do tecido (|z − zc| > 13/21 mm). Fundo do estojo (aro) com tampo, e a frente
 * — fim do estojo e ombro num só cone até ao gargalo, e a bala — numa só peça com a ponta fechada; a junção estojo/bala
 * é pintada (round_tip).
 */
function leanRound(c, name, group, segments) {
  const [x, y, z] = c;
  return [
    tag(prismZ(x, y, [[z + 0.019, 0.0059], [z + 0.032, 0.0059]], segments, { capEnd: true }), `${name}_case`, 'brass', group),
    tag(prismZ(x, y, [[z - 0.011, 0.0057], [z - 0.025, 0.0046], [z - 0.048, 0.0012]], segments, { capEnd: true }), `${name}_bullet`, 'round_tip', group),
  ];
}

/** Troço livre da fita (cena, repouso): da boca da caixa até à entrada, arco no plano XY à cota z da alimentação. */
export function freeBeltPath() {
  const m0 = boxMouth(), top = G([-0.13, F.y, F.z]);
  const ctrl = [[m0[0], m0[1] - 0.04], [m0[0], m0[1] + 0.1], [m0[0] + 0.005, m0[1] + 0.25], [m0[0] + 0.03, m0[1] + 0.37], [top[0] - 0.03, top[1] - 0.025], [top[0], top[1]]];
  const path = [];
  for (let i = 0; i < ctrl.length - 1; i++) for (let s = 0; s < 6; s++) { const t = s / 6; path.push([ctrl[i][0] + (ctrl[i + 1][0] - ctrl[i][0]) * t, ctrl[i][1] + (ctrl[i + 1][1] - ctrl[i][1]) * t, top[2]]); }
  path.push(top);
  return path.map((p, i) => i === 0 || i === path.length - 1 ? p : v3.mul(v3.add(v3.add(path[i - 1], p), path[i + 1]), 1 / 3));
}

/** Douglas–Peucker: tira os pontos a menos de `eps` da corda (o troço livre é quase recto entre os pontos de controlo). */
function simplifyPath(pts, eps) {
  if (pts.length < 3) return pts;
  const ds = (p, a, b) => { const ab = v3.sub(b, a), t = clamp(v3.dot(v3.sub(p, a), ab) / v3.dot(ab, ab)); return v3.dist(p, v3.add(a, v3.mul(ab, t))); };
  let k = 0, d = 0;
  for (let i = 1; i < pts.length - 1; i++) { const e = ds(pts[i], pts[0], pts.at(-1)); if (e > d) { d = e; k = i; } }
  return d <= eps ? [pts[0], pts.at(-1)] : [...simplifyPath(pts.slice(0, k + 1), eps).slice(0, -1), ...simplifyPath(pts.slice(k), eps)];
}

/**
 * Peças por grupo (ver PIVOTS e PARENTS). Tudo na cena, na posição de repouso, com a tampa da caixa fechada.
 * `lean`: variante do LOD0 (orçamento de 4000 triângulos) — cartuchos sem as partes escondidas no tecido e com tampos
 * poligonais, aros da manga abertos (a manga tapa o interior) e o tecido do troço livre só com as secções que mudam a forma
 * (Douglas–Peucker a 0,2 mm). Mesmos
 * nomes de peças, grupos, pivôs e silhueta; LOD1 e LOD2 continuam a sair da variante completa.
 */
export function buildCkm({ lean = false } = {}) {
  const parts = [], J = CKM.jacket, add = (p, name, paint, group) => parts.push(tag(p, name, paint, group));
  const gun = 'ckm_elevate';
  // ——— Arma (referencial da arma convertido para a cena com G) ———
  // Bloco dos munhões e caixa da culatra (rectangular), tampa por cima com o fecho atrás, chapa de trás.
  add(blk([0.078, 0.11, 0.05], G([0, 0.02, 0]), 0.25), 'trunnion_block', 'steel', gun);
  add(rod(G([-0.05, 0, 0]), G([0.05, 0, 0]), 0.011, 0.011, 10), 'trunnion_pin', 'bare_metal', gun);
  add(blk([0.06, 0.13, 0.33], G([0, 0.02, 0.19]), 0.12), 'receiver', 'steel', gun);
  add(blk([0.064, 0.012, 0.3], G([0, 0.09, 0.18]), 0.3), 'cover', 'steel', gun);
  add(blk([0.02, 0.014, 0.022], G([0, 0.1, 0.32]), 0.3), 'cover_latch', 'bare_metal', gun);
  add(blk([0.072, 0.145, 0.016], G([0, 0.02, 0.362]), 0.2), 'backplate', 'steel', gun);
  // Boca da alimentação (esquerda) e saída da fita vazia (direita): rebordos à volta da passagem da fita.
  add(blk([0.008, 0.026, 0.05], G([-0.033, F.y, F.z]), 0.2), 'feedway_l', 'bare_metal', gun);
  add(blk([0.008, 0.026, 0.05], G([0.033, F.y, F.z]), 0.2), 'feedway_r', 'bare_metal', gun);
  // Rasgo e guia da alavanca de armar (direita).
  add(blk([0.003, 0.012, 0.13], G([0.0305, 0, 0.185])), 'handle_slot', 'bare_metal', gun);
  // Punho de pistola de madeira, gatilho e guarda-mato.
  const gTop = [0, -0.05, 0.325], gBot = [0, -0.155, 0.36];
  add(sweep([[G(gTop), 0.032, 0.042], [G(v3.lerp(gTop, gBot, 0.5)), 0.034, 0.046], [G(gBot), 0.032, 0.044]], { n: 14, e: 0.55 }), 'grip', 'wood', gun);
  add(blk([0.03, 0.02, 0.07], G([0, -0.052, 0.3]), 0.3), 'trigger_housing', 'steel', gun);
  add(blk([0.007, 0.022, 0.008], G([0, -0.07, 0.29])), 'trigger', 'bare_metal', gun);
  const tg = []; for (let k = 0; k <= 8; k++) { const a = Math.PI * k / 8; tg.push(G([0, -0.058 - Math.sin(a) * 0.032, 0.315 - k / 8 * 0.06])); }
  add(strap(tg, tg.map(() => [1, 0, 0]), { width: 0.007, thickness: 0.006 }), 'trigger_guard', 'steel', gun);
  // Manga de água (~3 l): tubo com aros, bujão de enchimento em cima, tubo de vapor e bujão de esgoto em baixo.
  add(tube(J.r, J.r, J.z1, J.z0, CKM.trunnion[1] + B, { segments: 18 }), 'jacket', 'jacket', gun);
  for (const z of [-0.035, -0.33, -0.63]) if (lean) add(prismZ(0, CKM.trunnion[1] + B, [[z - 0.006, J.r + 0.003], [z + 0.006, J.r + 0.003]], 18), `jacket_band_${Math.round(-z * 100)}`, 'steel', gun);
  else add(tube(J.r + 0.003, J.r + 0.003, z - 0.006, z + 0.006, CKM.trunnion[1] + B, { segments: 18 }), `jacket_band_${Math.round(-z * 100)}`, 'steel', gun);
  add(rod(G([0, B + J.r - 0.004, -0.09]), G([0, B + J.r + 0.014, -0.09]), 0.011, 0.011, 10), 'water_fill', 'bare_metal', gun);
  add(rod(G([0, B - J.r + 0.004, -0.06]), G([0, B - J.r - 0.026, -0.07]), 0.007, 0.007, 8), 'steam_tube', 'bare_metal', gun);
  add(rod(G([0, B - J.r + 0.004, -0.6]), G([0, B - J.r - 0.012, -0.6]), 0.008, 0.008, 8), 'water_drain', 'bare_metal', gun);
  // Bucim da frente, tapa-chamas cónico ("lejek") e a boca do cano dentro dele.
  add(tube(0.03, 0.03, CKM.muzzleZ, J.z1, CKM.trunnion[1] + B, { segments: 16 }), 'muzzle_gland', 'steel', gun);
  add(tube(0.016, 0.034, CKM.muzzleZ, CKM.funnelZ, CKM.trunnion[1] + B, { segments: 16 }), 'flash_funnel', 'steel', gun);
  add(tube(0.0065, 0.0065, CKM.muzzleZ - 0.004, CKM.muzzleZ + 0.002, CKM.trunnion[1] + B, { segments: 10 }), 'bore', 'bore', gun);
  // Miras: massa na frente da manga; alça em quadro (até 2000 m) no topo da tampa, com o entalhe a 95 mm do eixo.
  add(blk([0.014, 0.014, 0.03], G([0, B + J.r + 0.006, -0.615])), 'front_sight_base', 'steel', gun);
  add(blk([0.003, 0.04, 0.008], G([0, B + J.r + 0.033, -0.615])), 'front_sight', 'steel', gun);
  add(blk([0.034, 0.012, 0.04], G([0, 0.102, 0.3])), 'rear_sight_base', 'steel', gun);
  for (const s of [-1, 1]) add(blk([0.004, 0.034, 0.006], G([s * 0.014, 0.123, 0.3])), `rear_sight_frame_${s < 0 ? 'l' : 'r'}`, 'steel', gun);
  add(blk([0.024, 0.006, 0.006], G([0, 0.132, 0.3])), 'rear_sight_notch', 'steel', gun);
  // Berço (no nó de direcção): pião, garfo dos munhões e o fuso de elevação até à barra de pontaria.
  const tr = 'ckm_traverse', H = CKM.head;
  add(rod(v3.add(H, [0, -0.06, 0]), v3.add(H, [0, 0.02, 0]), 0.02, 0.02, 12), 'pintle', 'steel', tr);
  add(blk([0.13, 0.016, 0.07], v3.add(H, [0, 0.016, 0]), 0.3), 'cradle', 'steel', tr);
  for (const s of [-1, 1]) add(blk([0.012, 0.06, 0.05], v3.add(H, [s * 0.058, 0.044, 0]), 0.3), `yoke_${s < 0 ? 'l' : 'r'}`, 'steel', tr);
  const bar = CKM.tripod.bar;
  add(rod([0, bar.y + 0.02, bar.z], G([0, -0.045, 0.24]), 0.011, 0.011, 10), 'elevating_screw', 'bare_metal', tr);
  add(blk([0.05, 0.04, 0.03], [0, bar.y + 0.02, bar.z], 0.3), 'traverse_slide', 'steel', tr);
  add(rod([-0.04, bar.y + 0.13, bar.z - 0.03], [0.04, bar.y + 0.13, bar.z - 0.03], 0.005, 0.005, 8), 'elevating_handwheel_axle', 'steel', tr);
  const wheel = tube(0.032, 0.032, -0.005, 0.005, 0, { segments: 14 });
  place(wheel, [0.045, bar.y + 0.13, bar.z - 0.03], axesFrom([1, 0, 0]));
  add(wheel, 'elevating_handwheel', 'steel', tr);
  // ——— Tripé (estático) ———
  const tp = 'ckm_tripod', T = CKM.tripod;
  const head = lathe((t, phi) => [Math.cos(phi) * (0.05 - t * 0.008), H[1] - 0.09 + t * 0.09, Math.sin(phi) * (0.05 - t * 0.008)], { rings: 1, segments: 16, caps: 'both' });
  add(orientOutward(head, q => [0, q[1], 0]), 'tripod_head', 'tripod', tp);
  const dial = lathe((t, phi) => [Math.cos(phi) * 0.068, H[1] - 0.012 + t * 0.012, Math.sin(phi) * 0.068], { rings: 1, segments: 20, caps: 'both' });
  add(orientOutward(dial, q => [0, q[1], 0]), 'traversing_dial', 'steel', tp);
  const legs = [['front', [0, H[1] - 0.07, -0.04], T.front], ['rear_l', [-0.035, H[1] - 0.07, 0.03], [-T.rear[0], 0, T.rear[2]]], ['rear_r', [0.035, H[1] - 0.07, 0.03], T.rear]];
  for (const [n, a, b] of legs) {
    add(rod(a, v3.add(b, [0, 0.03, 0]), 0.017, 0.014, 10), `leg_${n}`, 'tripod', tp);
    add(blk([0.03, 0.03, 0.06], v3.add(b, [0, 0.015, 0]), 0.3), `shoe_${n}`, 'tripod', tp);
    add(rod(v3.add(b, [0, 0.01, 0]), v3.add(b, [0, -0.03, 0]), 0.006, 0.002, 6), `spike_${n}`, 'bare_metal', tp);
    add(blk([0.03, 0.03, 0.03], v3.add(a, [0, 0.012, 0]), 0.3), `leg_clamp_${n}`, 'tripod', tp);
  }
  // Barra de pontaria: une as pernas de trás à altura do fuso de elevação.
  const legAt = (b, y) => { const a = [0, H[1] - 0.07, 0.03], t = (a[1] - y) / (a[1] - b[1]); return v3.lerp(a, b, t); };
  const bl = legAt([-T.rear[0], 0, T.rear[2]], bar.y), br = legAt(T.rear, bar.y), mid = [0, bar.y, bar.z];
  add(sweep([[bl, 0.022, 0.014], [v3.lerp(bl, mid, 0.5), 0.022, 0.014], [mid, 0.022, 0.014], [v3.lerp(mid, br, 0.5), 0.022, 0.014], [br, 0.022, 0.014]], { n: 8, e: 0.3, side: [0, 1, 0] }), 'traversing_bar', 'tripod', tp);
  // ——— Alavanca de armar (direita) ———
  const h = G(CKM.handle);
  add(rod(h, v3.add(h, [0.022, 0, 0]), 0.005, 0.005, 8), 'handle', 'bare_metal', 'ckm_cocking_handle');
  add(blk([0.014, 0.022, 0.03], v3.add(h, [0.027, 0, 0]), 0.3), 'handle_knob', 'bare_metal', 'ckm_cocking_handle');
  // ——— Fita: troço recto na alimentação (7 cartuchos e a ponta), troço livre até à caixa, fita vazia à direita ———
  const fy = G([0, F.y, F.z]);
  const fabricRun = (x0, x1, name, group) => add(blk([x1 - x0, 0.013, 0.034], [(x0 + x1) / 2, fy[1], fy[2] + 0.004], 0.15), name, 'fabric', group);
  fabricRun(G([-0.13, 0, 0])[0], G([0.0, 0, 0])[0], 'belt_feed_fabric', 'ckm_feed_belt');
  add(blk([0.028, 0.006, 0.026], [G([0.014, 0, 0])[0], fy[1], fy[2] + 0.004], 0.2), 'belt_tab', 'bare_metal', 'ckm_feed_belt');
  const rnd = lean ? (c, name, group, segments = 6) => leanRound(c, name, group, segments) : round;
  for (let k = 0; k < 7; k++) parts.push(...rnd([G([F.entry - k * CKM.pitch, 0, 0])[0], fy[1], fy[2]], `feed_round_${k}`, 'ckm_feed_belt'));
  // Troço livre: da boca da caixa (tampa aberta) até à entrada, num arco no plano XY (cartuchos sempre em Z).
  const smooth = freeBeltPath();
  // Tecido: 13 mm de espessura no plano XY (envolve os estojos), 34 mm de largura em Z.
  const fabPath = lean ? simplifyPath(smooth, 0.0002) : smooth;
  const fab = place(strap(fabPath, fabPath.map(() => [0, 0, 1]), { width: 0.013, thickness: 0.034 }), [0, 0, -0.013]);
  add(fab, 'belt_free_fabric', 'fabric', 'ckm_belt_free');
  let acc = 0;
  for (let i = 1, k = 0; i < smooth.length; i++) {
    const seg = v3.dist(smooth[i - 1], smooth[i]);
    acc += seg;
    while (acc >= CKM.pitch && i < smooth.length - 1) { acc -= CKM.pitch; const p = v3.lerp(smooth[i], smooth[i - 1], acc / seg); parts.push(...rnd(p, `free_round_${k++}`, 'ckm_belt_free', 4)); }
  }
  // Fita vazia: sai pela direita, dobra e cai ao lado da arma.
  const ex = G([F.exit, F.y, F.z]);
  const sp = [[0, 0], [0.03, 0.002], [0.06, -0.01], [0.08, -0.04], [0.09, -0.09], [0.094, -0.16], [0.09, -0.24]].map(([dx, dy]) => [ex[0] + dx, ex[1] + dy, ex[2] + 0.004]);
  const spN = sp.map((p, i) => { const t = v3.norm(v3.sub(sp[Math.min(i + 1, sp.length - 1)], sp[Math.max(i - 1, 0)])); return [-t[1], t[0], 0]; });
  add(strap(sp, spN, { width: 0.034, thickness: 0.004 }), 'belt_spent_fabric', 'fabric', 'ckm_belt_spent');
  // ——— Caixa da fita (aço caqui) com tampa ao comprido, pegas em cima e nos topos ———
  const bx = CKM.box, [bw, bh, bd] = bx.size, c = bx.center;
  add(blk([bw, bh - 0.004, bd], [c[0], (bh - 0.004) / 2, c[2]], 0.08), 'box_body', 'box', 'ckm_ammo_box');
  for (const s of [-1, 1]) {
    const hx = c[0] + s * (bw / 2 + 0.002), hp = [];
    for (let k = 0; k <= 6; k++) { const a = Math.PI * k / 6; hp.push([hx + s * Math.sin(a) * 0.016, bh * 0.72, c[2] - 0.028 + 0.056 * k / 6]); }
    add(strap(hp, hp.map(() => [0, 1, 0]), { width: 0.008, thickness: 0.005 }), `box_handle_${s < 0 ? 'l' : 'r'}`, 'bare_metal', 'ckm_ammo_box');
  }
  add(blk([bw + 0.004, 0.012, bd + 0.004], [c[0], bh + 0.002, c[2]], 0.08), 'box_lid', 'box', 'ckm_ammo_box_lid');
  const th = []; for (let k = 0; k <= 8; k++) { const a = Math.PI * k / 8; th.push([c[0] - 0.06 + 0.12 * k / 8, bh + 0.008 + Math.sin(a) * 0.022, c[2]]); }
  add(strap(th, th.map(() => [0, 0, 1]), { width: 0.008, thickness: 0.006 }), 'box_handle_top', 'bare_metal', 'ckm_ammo_box_lid');
  add(blk([0.02, 0.03, 0.006], [c[0] + bw / 2 - 0.02, bh - 0.01, c[2] - bd / 2 - 0.004]), 'box_latch', 'bare_metal', 'ckm_ammo_box_lid');
  add(rod([c[0] - bw / 2 + 0.01, bh, c[2] + bd / 2], [c[0] + bw / 2 - 0.01, bh, c[2] + bd / 2], 0.004, 0.004, 6), 'box_hinge', 'bare_metal', 'ckm_ammo_box');
  for (const p of parts) { p.texel = 1; (OPEN_SHAPES.has(p.name) ? strapOut : solid)(p); }
  return parts;
}

/** Pontos de referência no referencial da arma (nó ckm_elevate, origem nos munhões). */
export function gunSockets() {
  const h = CKM.handle;
  return {
    muzzle: [0, B, CKM.muzzleZ], muzzle_flash: [0, B, CKM.funnelZ], trunnion: [0, 0, 0],
    grip_r: [0, -0.1, 0.342], grip_l: [-0.036, 0.05, 0.33], eye: [0, 0.132, 0.56],
    trigger: [0, -0.07, 0.29], charging_handle: [h[0] + 0.03, h[1], h[2]], charging_handle_back: [h[0] + 0.03, h[1], h[2] + CKM.handleTravel],
    feed_entry: [F.entry, F.y, F.z], feed_exit: [F.exit, F.y, F.z], rear_sight: [0, 0.132, 0.3], front_sight: [0, B + CKM.jacket.r + 0.053, -0.615],
    water_fill: [0, B + CKM.jacket.r + 0.014, -0.09], steam_outlet: [0, B - CKM.jacket.r - 0.026, -0.07], ejection: [0, -0.045, 0.1],
  };
}
/** Pontos de referência na cena (raiz ckm_wz30, posição de repouso). */
export function sceneSockets() {
  const T = CKM.tripod, bx = CKM.box;
  return {
    pintle: CKM.head, trunnion: CKM.trunnion, tripod_feet: [T.front, [-T.rear[0], 0, T.rear[2]], T.rear],
    box_mouth: boxMouth(), box_handle: [bx.center[0], bx.size[1] + 0.03, bx.center[2]], elevating_handwheel: [0.05, T.bar.y + 0.13, T.bar.z - 0.03],
    ...Object.fromEntries(Object.entries(gunSockets()).map(([k, p]) => [`gun_${k}`, G(p)])),
  };
}

const mul = (a, s) => a.map(x => x * s);
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
/** Pintores procedurais (originais): aço oxidado escuro, tripé e caixa pintados, madeira, tecido caqui, latão. */
export const PAINTERS = {
  steel: ({ p, n }) => {
    const w = fbm(p, 50, 3), wear = clamp((fbm(p, 140, 2) - 0.25) * 3) * (n ? clamp(1 - Math.abs(n[0]) * 1.4) : 0.5);
    return { c: mix(mul([0.2, 0.205, 0.215], 1 + w * 0.25), [0.44, 0.44, 0.45], wear * 0.3), r: 0.48 + w * 0.1 - wear * 0.1, m: 0.3, h: 0 };
  },
  // Manga de água: chapa oxidada com manchas de calor.
  jacket: (ctx) => {
    const s = PAINTERS.steel(ctx), heat = 0.5 + 0.5 * fbm([0, ctx.p[1] * 0.3, ctx.p[2]], 12, 2);
    return { c: mix(mul(s.c, 0.9 + 0.15 * heat), [0.33, 0.3, 0.26], 0.12 * heat), r: s.r + 0.05, m: s.m, h: 0 };
  },
  tripod: ({ p, n }) => {
    const w = fbm(p, 30, 3), chip = clamp((fbm(p, 110, 2) - 0.42) * 4) * (n ? clamp(1 - Math.abs(n[1]) * 0.8) : 0.5), mud = smoothstep(0.12, 0, p[1]);
    return { c: mix(mix(mul([0.25, 0.27, 0.19], 0.9 + w * 0.2), [0.36, 0.36, 0.36], chip * 0.6), [0.22, 0.18, 0.13], mud * 0.7), r: 0.7 - chip * 0.2, m: chip * 0.3, h: 0 };
  },
  // Caixa: aço pintado de caqui [T34], cantos gastos até ao metal e rebordos estampados.
  box: ({ p, n }) => {
    const w = fbm(p, 25, 3), chip = clamp((fbm(p, 130, 2) - 0.45) * 4);
    const ridge = Math.abs(n?.[2] ?? 0) > 0.7 ? 0.5 + 0.5 * Math.cos((p[0] - CKM.box.center[0]) * 120) : 0.5;
    return { c: mix(mul([0.38, 0.35, 0.22], 0.9 + w * 0.18), [0.42, 0.42, 0.42], chip * 0.5), r: 0.68 - chip * 0.2, m: chip * 0.35, h: (ridge - 0.5) * 0.0004 };
  },
  wood: ({ p }) => {
    const g = 0.5 + 0.5 * Math.sin((p[1] * 260 + fbm(p, 20, 3) * 6)), dirt = clamp(fbm(p, 50, 2) * 0.8 + 0.2);
    return { c: mix(mul([0.36, 0.2, 0.1], 0.85 + 0.25 * g), [0.14, 0.09, 0.06], 0.3 * dirt), r: 0.5 + 0.1 * dirt, m: 0, h: (g - 0.5) * 0.0001 };
  },
  // Fita de tecido de algodão caqui: trama fina e as costuras dos bolsos entre cartuchos.
  fabric: ({ p }) => {
    const weave = 0.5 + 0.25 * (Math.sin(p[0] * 2400) + Math.sin(p[2] * 2400)), dirt = clamp(fbm(p, 35, 3) * 0.9 + 0.1);
    const seam = smoothstep(0.85, 1, Math.abs(Math.cos(p[0] / CKM.pitch * Math.PI)));
    return { c: mix(mul([0.55, 0.5, 0.36], 0.92 + 0.1 * weave), [0.3, 0.27, 0.2], 0.35 * dirt + 0.25 * seam), r: 0.92, m: 0, h: (weave - 0.5) * 0.0002 - seam * 0.0004 };
  },
  bare_metal: ({ p }) => ({ c: mul([0.5, 0.5, 0.51], 1 + fbm(p, 80, 2) * 0.1), r: 0.35, m: 0.5, h: 0 }),
  brass: ({ p }) => ({ c: mul([0.7, 0.52, 0.24], 0.9 + fbm(p, 200, 2) * 0.2), r: 0.35, m: 0.4, h: 0 }),
  // Bala de jaqueta de tombak (cor de cobre).
  bullet: ({ p }) => ({ c: mul([0.6, 0.36, 0.22], 0.9 + fbm(p, 200, 2) * 0.2), r: 0.38, m: 0.4, h: 0 }),
  // LOD0 leve: frente do cartucho numa peça; latão até ao gargalo, tombak na bala.
  round_tip: (ctx) => (ctx.p[2] > CKM.feed.z - 0.025 ? PAINTERS.brass : PAINTERS.bullet)(ctx),
  bore: () => ({ c: [0.03, 0.03, 0.035], r: 0.8, m: 0, h: 0 }),
};
