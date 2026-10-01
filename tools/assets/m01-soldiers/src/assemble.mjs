// Montagem de uma nação: corpo + fardamento + mãos, cabeças variantes, capacetes/boné, conjuntos de equipamento,
// arma e clipe → atlas único → malhas fundidas por grupo alternável → LODs (meshoptimizer) → descrição para glb.mjs.
import { MeshoptSimplifier } from 'meshoptimizer';
import { buildHuman, GAME_BONES, LIGHT_DROP, bodyHeight } from './human.mjs';
import { computeNormals, skinArrays, v3 } from './meshops.mjs';
import { buildOutfit, STYLES } from './outfit.mjs';
import { buildHead, buildHands } from './head.mjs';
import { buildGear } from './gear.mjs';
import { buildRifle, buildClip, buildRkm, buildRag, placeWeapon, RIFLES, RKM } from './weapon.mjs';
import { HEADS } from './variants.mjs';
import { makePainters } from './paint.mjs';
import { bakeAtlas } from './textures.mjs';

export const MACRO = { gender: 1, age: 0.55, muscle: 0.6, weight: 0.45, height: 0.5 };
export const RIFLE_OF = { pl: 'wz29', de: 'kar98k' };
// Armas alternativas (malhas escondidas por omissão, mesmo atlas): Bąk com kb wz.98a, Kowal com rkm wz.28.
export const EXTRA_WEAPONS = { pl: ['wz98a', 'rkm_wz28'], de: [] };

/** Peças de uma nação (pose de ligação, metros) agrupadas pelas malhas finais. */
export function buildNation(nat, { heads = HEADS[nat] } = {}) {
  const h = buildHuman({ macro: MACRO }), style = STYLES[nat];
  const o = buildOutfit(h, style), hands = buildHands(h, style);
  const headParts = heads.map(v => ({ variant: v, ...buildHead(h, MACRO, v, style) }));
  const gear = buildGear(nat, h, o);
  const rifle = buildRifle(RIFLE_OF[nat]), clip = buildClip();
  const J = h.joints, R = RIFLES[RIFLE_OF[nat]];
  // Arma: punho na mão direita (pose de ligação); ferrolho no eixo do ferrolho; clipe na mão.
  placeWeapon(rifle.parts, J.weapon); placeWeapon(clip, J.weapon_clip);
  J.weapon_bolt = [J.weapon[0], J.weapon[1] + R.boltY, J.weapon[2] + R.boltZ];
  J.weapon_mag = v3.add(J.weapon, RKM.mag);
  const extra = [], sockets = { [RIFLE_OF[nat]]: rifle.sockets };
  if (EXTRA_WEAPONS[nat].includes('wz98a')) {
    const r = buildRifle('wz98a'); placeWeapon(r.parts, J.weapon); sockets.wz98a = r.sockets;
    extra.push({ name: 'rifle_wz98a', parts: r.parts, visible: false });
  }
  if (EXTRA_WEAPONS[nat].includes('rkm_wz28')) {
    const k = buildRkm(), rag = buildRag(); sockets.rkm_wz28 = k.sockets;
    for (const ps of [k.parts, k.mag, k.bipodOpen, k.bipodFolded]) placeWeapon(ps, J.weapon);
    placeWeapon(rag, J.weapon_clip);
    extra.push({ name: 'rkm_wz28', parts: [...k.parts, ...k.mag], visible: false }, { name: 'rkm_bipod_open', parts: k.bipodOpen, visible: false },
      { name: 'rkm_bipod_folded', parts: k.bipodFolded, visible: false }, { name: 'rag', parts: rag, visible: false });
  }
  for (const p of [...rifle.parts, ...clip, ...extra.flatMap(g => g.parts)]) p.skin = Array.from({ length: p.positions.length / 3 }, () => [[p.bone, 1]]);

  const groups = [
    { name: 'body', parts: [...o.parts, hands], visible: true },
    ...headParts.map((hp, i) => ({ name: `head_${hp.variant.id}`, parts: [hp.head, hp.hair, ...hp.eyes], visible: i === 0, variant: hp.variant })),
    ...Object.entries(gear.sets).map(([k, parts]) => ({ name: k, parts, visible: ['helmet_wz31', 'helmet_m35', 'gear'].includes(k) })),
    { name: 'rifle', parts: rifle.parts, visible: true },
    { name: 'clip', parts: clip, visible: true },
    ...extra,
  ];
  for (const g of groups) for (const p of g.parts) if (!p.normals) computeNormals(p, p.src ?? null);
  const painters = makePainters({ nat, J, lm: o.lm, heads: headParts.map(hp => ({ variant: hp.variant, lm: hp.lm })) });
  return { nat, h, J, o, groups, painters, rifle, sockets, height: bodyHeight(h), fit: gear.fit };
}

/** Funde as peças de um grupo (já com atlasUV) numa malha com pesos. */
export function mergeGroup(g, { dropInner = false } = {}) {
  const positions = [], normals = [], uvs = [], indices = [], skin = [];
  for (const p of g.parts) {
    const base = positions.length / 3;
    positions.push(...p.positions); normals.push(...p.normals); uvs.push(...p.atlasUV);
    for (let t = 0; t < p.indices.length; t += 3) {
      if (dropInner && p.innerTris?.[t / 3]) continue;
      indices.push(p.indices[t] + base, p.indices[t + 1] + base, p.indices[t + 2] + base);
    }
    skin.push(...p.skin);
  }
  return { name: g.name, positions, normals, uvs, indices, skin, visible: g.visible };
}

/** Simplificação com meshoptimizer (posição + normal + UV), remove vértices não usados. */
export async function simplify(mesh, ratio, { error = 0.02, flags = [] } = {}) {
  if (ratio >= 1) return mesh;
  await MeshoptSimplifier.ready;
  const n = mesh.positions.length / 3;
  const pos = Float32Array.from(mesh.positions), attr = new Float32Array(n * 5);
  for (let i = 0; i < n; i++) attr.set([mesh.normals[i * 3], mesh.normals[i * 3 + 1], mesh.normals[i * 3 + 2], mesh.uvs[i * 2], mesh.uvs[i * 2 + 1]], i * 5);
  const target = Math.max(36, Math.floor(mesh.indices.length * ratio / 3) * 3);
  const [idx] = MeshoptSimplifier.simplifyWithAttributes(Uint32Array.from(mesh.indices), pos, 3, attr, 5, [0.4, 0.4, 0.4, 2, 2], null, target, error, flags);
  const remap = new Map(), out = { ...mesh, positions: [], normals: [], uvs: [], indices: [], skin: [] };
  for (const i of idx) {
    if (!remap.has(i)) {
      remap.set(i, remap.size);
      out.positions.push(mesh.positions[i * 3], mesh.positions[i * 3 + 1], mesh.positions[i * 3 + 2]);
      out.normals.push(mesh.normals[i * 3], mesh.normals[i * 3 + 1], mesh.normals[i * 3 + 2]);
      out.uvs.push(mesh.uvs[i * 2], mesh.uvs[i * 2 + 1]);
      out.skin.push(mesh.skin[i]);
    }
    out.indices.push(remap.get(i));
  }
  return out;
}

/** Pesos para o esqueleto leve: ossos de LIGHT_DROP sobem ao primeiro antepassado mantido. */
export function liftWeights(skin) {
  const parent = Object.fromEntries(GAME_BONES.map(b => [b.name, b.parent]));
  const keep = b => { while (LIGHT_DROP.has(b)) b = parent[b]; return b; };
  return skin.map(list => { const m = new Map(); for (const [b, w] of list) m.set(keep(b), (m.get(keep(b)) ?? 0) + w); return [...m.entries()]; });
}

/**
 * LODs: razão de triângulos por categoria de malha, erro máximo (relativo ao tamanho da malha) e opções do
 * simplificador. LOD2 (Chromebook/longe) aceita colapsar costuras de UV ('Permissive') e usa o esqueleto leve.
 */
export const LODS = [
  { id: 'lod0', ratio: { body: 0.33, head: 0.3, helmet: 0.45, gear: 0.6, rifle: 0.8, clip: 0.4 }, error: 0.01, flags: [], color: 2048, orm: 1024, normal: 1024, bones: 'full' },
  { id: 'lod1', ratio: { body: 0.12, head: 0.1, helmet: 0.15, gear: 0.3, rifle: 0.3, clip: 0.2 }, error: 0.05, flags: [], color: 1024, orm: 512, normal: null, bones: 'full' },
  { id: 'lod2', ratio: { body: 0.045, head: 0.035, helmet: 0.06, gear: 0.08, rifle: 0.1, clip: 0.1 }, error: 0.3, flags: ['Permissive'], color: 512, orm: null, normal: null, bones: 'light' },
];
const category = name => name === 'body' ? 'body' : name.startsWith('head_') ? 'head' : /^(helmet|cap)_/.test(name) ? 'helmet'
  : /^(rifle|rkm_wz28)/.test(name) ? 'rifle' : /^(clip|rag|rkm_bipod)/.test(name) ? 'clip' : 'gear';

/** Atlas da nação (uma vez) e malhas de cada LOD, prontos para writeCharacter. */
export async function bakeNation(N, { size = 2048 } = {}) {
  const parts = N.groups.flatMap(g => g.parts);
  const atlas = bakeAtlas(parts, N.painters, { size, ormSize: 1024, normalSize: 1024, extraSizes: [1024, 512], ormExtra: [512] });
  const lods = [];
  for (const L of LODS) {
    const meshes = [];
    for (const g of N.groups) {
      // Capacetes: nos LOD1/LOD2 sai a cúpula interior (escondida pela cabeça; atravessaria a exterior ao simplificar).
      const m = mergeGroup(g, { dropInner: L.id !== 'lod0' });
      const s = await simplify(m, L.ratio[category(g.name)], { error: L.error, flags: L.flags });
      if (L.bones === 'light') s.skin = liftWeights(s.skin);
      const sk = skinArrays(s.skin);
      const skinBones = L.bones === 'light' ? GAME_BONES.map(b => b.name).filter(b => !LIGHT_DROP.has(b)) : undefined;
      meshes.push({ name: g.name, material: 'atlas', positions: s.positions, normals: s.normals, uvs: s.uvs, indices: s.indices, joints: sk.joints, weights: sk.weights,
        visible: g.visible, skinBones, extras: g.variant ? { variant: g.variant.id, label: g.variant.name } : undefined });
    }
    const img = atlas.images;
    const material = L.id === 'lod0' ? { baseColor: img.color, metallicRoughness: img.orm, normal: img.normal, roughness: 1, metallic: 1 }
      : L.id === 'lod1' ? { baseColor: img.color_1024, metallicRoughness: img.orm_512, roughness: 1, metallic: 1 }
        : { baseColor: img.color_512, roughness: 0.85, metallic: 0 };
    lods.push({ id: L.id, meshes, materials: { atlas: material } });
  }
  return { atlas, lods };
}
