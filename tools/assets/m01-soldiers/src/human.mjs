// Corpo humano a partir da malha base CC0 hm08: morfologia (alvos macro e do rosto), metros com frente em −Z,
// esqueleto de jogo (~60 ossos, eixos alinhados com o mundo na pose de ligação) e pesos fundidos (4 por vértice).
import { loadBaseMesh, applyTargets, macroTargets, loadSkeleton, loadWeights, targetExists } from './mh.mjs';

// Esqueleto de jogo: nome → { pai, articulação (osso MH cuja cabeça dá a posição), ossos MH fundidos }.
// L/R seguem o lado do próprio soldado.
const SIDES = [['l', 'L'], ['r', 'R']];
export const GAME_BONES = (() => {
  const b = [
    { name: 'root', parent: null, at: 'ground' },
    { name: 'hips', parent: 'root', at: 'root', mh: ['root', 'pelvis.L', 'pelvis.R', 'spine05'] },
    { name: 'spine_01', parent: 'hips', at: 'spine04', mh: ['spine04', 'spine03'] },
    { name: 'spine_02', parent: 'spine_01', at: 'spine02', mh: ['spine02', 'breast.L', 'breast.R'] },
    { name: 'spine_03', parent: 'spine_02', at: 'spine01', mh: ['spine01'] },
    { name: 'neck', parent: 'spine_03', at: 'neck01', mh: ['neck01', 'neck02', 'neck03'] },
    { name: 'head', parent: 'neck', at: 'head', mh: ['head'] },
    { name: 'jaw', parent: 'head', at: 'jaw', mh: ['jaw'] },
  ];
  for (const [s, S] of SIDES) {
    b.push(
      { name: `eye_${s}`, parent: 'head', at: `eye.${S}`, mh: [`eye.${S}`] },
      { name: `clavicle_${s}`, parent: 'spine_03', at: `clavicle.${S}`, mh: [`clavicle.${S}`], split: { [`shoulder01.${S}`]: 0.5 } },
      { name: `upperarm_${s}`, parent: `clavicle_${s}`, at: `upperarm01.${S}`, mh: [`upperarm01.${S}`, `upperarm02.${S}`], split: { [`shoulder01.${S}`]: 0.5 } },
      { name: `lowerarm_${s}`, parent: `upperarm_${s}`, at: `lowerarm01.${S}`, mh: [`lowerarm01.${S}`, `lowerarm02.${S}`] },
      { name: `hand_${s}`, parent: `lowerarm_${s}`, at: `wrist.${S}`, mh: [`wrist.${S}`, ...[1, 2, 3, 4].map(i => `metacarpal${i}.${S}`)] },
    );
    ['thumb', 'index', 'middle', 'ring', 'pinky'].forEach((f, i) => {
      for (let k = 1; k <= 3; k++) b.push({ name: `${f}_0${k}_${s}`, parent: k === 1 ? `hand_${s}` : `${f}_0${k - 1}_${s}`, at: `finger${i + 1}-${k}.${S}`, mh: [`finger${i + 1}-${k}.${S}`] });
    });
    b.push(
      { name: `thigh_${s}`, parent: 'hips', at: `upperleg01.${S}`, mh: [`upperleg01.${S}`, `upperleg02.${S}`] },
      { name: `calf_${s}`, parent: `thigh_${s}`, at: `lowerleg01.${S}`, mh: [`lowerleg01.${S}`, `lowerleg02.${S}`] },
      { name: `foot_${s}`, parent: `calf_${s}`, at: `foot.${S}`, mh: [`foot.${S}`] },
      { name: `ball_${s}`, parent: `foot_${s}`, at: `toes.${S}`, mhPrefix: `toe`, side: S },
    );
  }
  // Ossos de adereço (sem pesos): arma, ferrolho e carregador animados nos clips; encaixe para transportar um ferido.
  b.push(
    { name: 'weapon', parent: 'root', at: 'prop' },
    { name: 'weapon_bolt', parent: 'weapon', at: 'prop' },
    { name: 'weapon_clip', parent: 'root', at: 'prop' },
    { name: 'carry_socket', parent: 'spine_03', at: 'prop' },
  );
  return b;
})();
export const BONE_INDEX = Object.fromEntries(GAME_BONES.map((b, i) => [b.name, i]));
// Esqueleto leve (LOD2): sem dedos, olhos nem maxilar; os pesos sobem para o osso pai.
export const LIGHT_DROP = new Set(GAME_BONES.filter(b => /^(thumb|index|middle|ring|pinky)_|^eye_|^jaw$/.test(b.name)).map(b => b.name));

const FACE_ROOT = 'head';
/** Mapa osso MH → [[osso de jogo, fracção]] (ossos faciais vão para head ou jaw conforme a cadeia). */
function boneMap(mhBones) {
  const map = {};
  for (const gb of GAME_BONES) {
    for (const m of gb.mh ?? []) (map[m] ??= []).push([gb.name, 1]);
    for (const [m, f] of Object.entries(gb.split ?? {})) (map[m] ??= []).push([gb.name, f]);
    if (gb.mhPrefix) for (const m of Object.keys(mhBones)) if (m.startsWith(gb.mhPrefix) && m.endsWith('.' + gb.side)) (map[m] ??= []).push([gb.name, 1]);
  }
  const chain = n => { const c = []; for (let b = n; b; b = mhBones[b].parent) c.push(b); return c; };
  for (const m of Object.keys(mhBones)) {
    if (map[m]) continue;
    const c = chain(m);
    if (c.includes('jaw') || c.includes('special04') || /^tongue/.test(m)) map[m] = [['jaw', 1]];
    else if (c.includes(FACE_ROOT)) map[m] = [['head', 1]];
    else throw new Error(`osso MH sem destino: ${m}`);
  }
  return map;
}

export const toMeters = (p, minY) => [-p[0] / 10, (p[1] - minY) / 10, -p[2] / 10];

/**
 * Corpo: morfologia macro + rosto opcional (só cabeça, com máscara pelos pesos da cabeça).
 * Devolve posições em metros (frente −Z), faces MH, UVs, esqueleto de jogo e pesos por vértice.
 */
export function buildHuman({ macro, face = [], headMask = null }) {
  const base = loadBaseMesh();
  let pos = applyTargets(base.positions, macroTargets(macro));
  const { weights } = loadWeights();
  // Máscara do rosto: soma dos pesos dos ossos da cabeça (0 no pescoço → 1 na cabeça), calculada uma vez.
  const headW = new Float64Array(base.vertexCount);
  const mhSkelRest = loadSkeleton(pos);
  const map = boneMap(mhSkelRest.bones);
  for (const [mb, list] of Object.entries(weights)) {
    if (!map[mb].some(([g]) => g === 'head' || g === 'jaw' || g.startsWith('eye_'))) continue;
    for (const [v, w] of list) headW[v] += w;
  }
  const mask = i => Math.min(1, Math.max(0, (headW[i] - 0.35) / 0.5));
  for (const t of face) if (!targetExists(t[0])) throw new Error(`alvo inexistente: ${t[0]}`);
  if (face.length) pos = applyTargets(pos, face, headMask ?? mask);
  const body = new Set();
  for (const f of base.faces) if (f.group === 'body') f.v.forEach(v => body.add(v));
  let minY = Infinity;
  for (const i of body) minY = Math.min(minY, pos[i * 3 + 1]);
  const mhSkel = loadSkeleton(pos);
  const P = new Float64Array(base.vertexCount * 3);
  for (let i = 0; i < base.vertexCount; i++) P.set(toMeters([pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]], minY), i * 3);

  // Posições das articulações de jogo (metros).
  const joints = {};
  const mhHead = n => toMeters(mhSkel.bones[n].head, minY);
  for (const gb of GAME_BONES) {
    if (gb.at === 'ground' || gb.at === 'prop') continue;
    if (gb.at.startsWith('toes.')) {
      const S = gb.at.slice(5), heads = [1, 2, 3, 4, 5].map(i => mhHead(`toe${i}-1.${S}`));
      joints[gb.name] = [0, 1, 2].map(k => heads.reduce((s, h) => s + h[k], 0) / heads.length);
    } else joints[gb.name] = mhHead(gb.at);
  }
  joints.root = [0, 0, joints.hips[2]];
  // Adereços: arma junto à mão direita na pose de ligação, ferrolho na arma; encaixe de transporte no ombro direito.
  joints.weapon = [...joints.hand_r]; joints.weapon_bolt = [...joints.hand_r]; joints.weapon_clip = [...joints.hand_r];
  joints.carry_socket = [joints.clavicle_r[0] * 0.5 + joints.upperarm_r[0] * 0.5, joints.upperarm_r[1] + 0.12, joints.spine_03[2]];

  // Pesos fundidos: até 4 ossos por vértice, normalizados.
  const acc = Array.from({ length: base.vertexCount }, () => new Map());
  for (const [mb, list] of Object.entries(weights)) for (const [g, f] of map[mb]) for (const [v, w] of list) {
    const m = acc[v]; m.set(g, (m.get(g) ?? 0) + w * f);
  }
  const skin = acc.map(m => {
    const top = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4), s = top.reduce((t, e) => t + e[1], 0);
    return s > 0 ? top.map(([g, w]) => [g, w / s]) : [];
  });
  return { base, positions: P, joints, skin, headWeight: headW, minY, mhSkel, toM: p => toMeters(p, minY) };
}

/** Altura medida (m) do corpo: do ponto mais baixo ao mais alto dos vértices do grupo body. */
export function bodyHeight(h) {
  let max = -Infinity;
  for (const f of h.base.faces) if (f.group === 'body') for (const v of f.v) max = Math.max(max, h.positions[v * 3 + 1]);
  return max;
}
