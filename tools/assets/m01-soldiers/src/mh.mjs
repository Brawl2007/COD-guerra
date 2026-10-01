// Leitores próprios dos formatos de dados do MakeHuman (CC0): OBJ da malha base hm08, .target, .mhskel e .mhw.
// Unidades do MakeHuman: decímetros, +Y para cima, frente em +Z. A conversão para metros/−Z fica em human.mjs.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const MH_DATA = process.env.MH_DATA ?? new URL('../.cache/makehuman/makehuman/data/', import.meta.url).pathname;
const data = p => join(MH_DATA, p);
export const hasMakeHuman = () => existsSync(data('3dobjs/base.obj'));

/** base.obj: posições (dm), UVs e faces (quads/tris) com o grupo de cada face. */
export function loadBaseMesh() {
  const text = readFileSync(data('3dobjs/base.obj'), 'utf8');
  const pos = [], uv = [], faces = [];
  let group = '';
  for (const line of text.split('\n')) {
    if (line.startsWith('v ')) { const [, x, y, z] = line.split(/\s+/); pos.push(+x, +y, +z); }
    else if (line.startsWith('vt ')) { const [, u, v] = line.split(/\s+/); uv.push(+u, +v); }
    else if (line.startsWith('g ')) group = line.slice(2).trim();
    else if (line.startsWith('f ')) {
      const parts = line.slice(2).trim().split(/\s+/).map(t => t.split('/').map(n => +n - 1));
      faces.push({ group, v: parts.map(p => p[0]), t: parts.map(p => p[1]) });
    }
  }
  return { positions: Float64Array.from(pos), uvs: Float64Array.from(uv), faces, vertexCount: pos.length / 3 };
}

const targetCache = new Map();
/** .target: linhas "índice dx dy dz" (dm). */
export function loadTarget(rel) {
  if (targetCache.has(rel)) return targetCache.get(rel);
  const idx = [], d = [];
  for (const line of readFileSync(data(`targets/${rel}`), 'utf8').split('\n')) {
    if (!line || line[0] === '#') continue;
    const [i, x, y, z] = line.trim().split(/\s+/);
    if (z === undefined) continue;
    idx.push(+i); d.push(+x, +y, +z);
  }
  const t = { idx: Int32Array.from(idx), d: Float64Array.from(d) };
  targetCache.set(rel, t);
  return t;
}
export const targetExists = rel => existsSync(data(`targets/${rel}`));

/** Soma de alvos ponderados; mask(i) opcional limita o efeito por vértice (0..1). */
export function applyTargets(positions, list, mask = null) {
  const out = Float64Array.from(positions);
  for (const [rel, w] of list) {
    if (!w) continue;
    const { idx, d } = loadTarget(rel);
    for (let k = 0; k < idx.length; k++) {
      const i = idx[k], m = w * (mask ? mask(i) : 1);
      if (!m) continue;
      out[i * 3] += d[k * 3] * m; out[i * 3 + 1] += d[k * 3 + 1] * m; out[i * 3 + 2] += d[k * 3 + 2] * m;
    }
  }
  return out;
}

const split3 = (v, a, b, names) => v < a ? [[names[0], 1 - v / a], [names[1], v / a]] : [[names[1], 1 - (v - a) / (b - a)], [names[2], (v - a) / (b - a)]];
/**
 * Pesos dos alvos macro do MakeHuman 1.1 (mesma convenção dos sliders, 0..1):
 * género (1 = masculino), idade (0,5 = 25 anos, 1 = 90), músculo, peso, altura, etnia.
 */
export function macroTargets({ gender = 1, age = 0.5, muscle = 0.5, weight = 0.5, height = 0.5, ethnic = { caucasian: 1 } }) {
  const genders = [['female', 1 - gender], ['male', gender]].filter(g => g[1] > 0);
  const ages = age < 0.1875 ? [['baby', 1 - age / 0.1875], ['child', age / 0.1875]]
    : age < 0.5 ? [['child', 1 - (age - 0.1875) / 0.3125], ['young', (age - 0.1875) / 0.3125]]
      : [['young', 1 - (age - 0.5) / 0.5], ['old', (age - 0.5) / 0.5]];
  const muscles = split3(muscle, 0.5, 1, ['minmuscle', 'averagemuscle', 'maxmuscle']);
  const weights = split3(weight, 0.5, 1, ['minweight', 'averageweight', 'maxweight']);
  const heights = height < 0.5 ? [['minheight', (0.5 - height) / 0.5]] : [['maxheight', (height - 0.5) / 0.5]];
  const out = [];
  for (const [g, gw] of genders) for (const [a, aw] of ages) {
    if (!aw) continue;
    for (const [e, ew] of Object.entries(ethnic)) out.push([`macrodetails/${e}-${g}-${a}.target`, gw * aw * ew]);
    for (const [m, mw] of muscles) for (const [w, ww] of weights) {
      const base = gw * aw * mw * ww;
      if (!base) continue;
      out.push([`macrodetails/universal-${g}-${a}-${m}-${w}.target`, base]);
      for (const [h, hw] of heights) if (hw) out.push([`macrodetails/height/${g}-${a}-${m}-${w}-${h}.target`, base * hw]);
    }
  }
  return out.filter(([, w]) => w > 1e-6);
}

/** Esqueleto: articulações = média dos vértices de cada grupo (posições já com os alvos aplicados). */
export function loadSkeleton(positions) {
  const s = JSON.parse(readFileSync(data('rigs/default.mhskel'), 'utf8'));
  const joint = name => {
    const vs = s.joints[name], p = [0, 0, 0];
    for (const i of vs) { p[0] += positions[i * 3]; p[1] += positions[i * 3 + 1]; p[2] += positions[i * 3 + 2]; }
    return p.map(c => c / vs.length);
  };
  const bones = {};
  for (const [name, b] of Object.entries(s.bones)) bones[name] = { name, parent: b.parent, head: joint(b.head), tail: joint(b.tail) };
  return { bones, joint, license: s.license };
}

/** Pesos simétricos do esqueleto por omissão: osso → [[vértice, peso], …]. */
export function loadWeights() {
  const w = JSON.parse(readFileSync(data('rigs/default_weights.mhw'), 'utf8'));
  return { weights: w.weights, license: w.license };
}
