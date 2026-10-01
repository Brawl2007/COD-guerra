// Pré-visualização (desenvolvimento): constrói um soldado com cores lisas e um clip "test" de dobras,
// para verificar fardamento e deformação. Uso: node dev/preview.mjs pl|de → .cache/preview_<nação>.glb
import { buildHuman, GAME_BONES, bodyHeight } from '../src/human.mjs';
import { fromBase, computeNormals, skinArrays } from '../src/meshops.mjs';
import { writeCharacter } from '../src/glb.mjs';
import { buildOutfit, STYLES } from '../src/outfit.mjs';

const nat = process.argv[2] ?? 'pl';
const h = buildHuman({ macro: { gender: 1, age: 0.55, muscle: 0.6, weight: 0.45, height: 0.5 } });
console.log('altura', bodyHeight(h).toFixed(3));
const o = buildOutfit(h, STYLES[nat]);
const pl = nat === 'pl';
const colors = {
  skin: [0.72, 0.55, 0.45], tunic: pl ? [0.30, 0.29, 0.19] : [0.30, 0.32, 0.27], tunic_inner: [0.2, 0.2, 0.15],
  trousers: pl ? [0.30, 0.29, 0.19] : [0.25, 0.26, 0.25], belt: pl ? [0.25, 0.15, 0.08] : [0.05, 0.05, 0.05],
  collar: pl ? [0.30, 0.29, 0.19] : [0.12, 0.18, 0.14], boot: pl ? [0.2, 0.12, 0.06] : [0.04, 0.04, 0.04],
  puttee: [0.33, 0.31, 0.21], sole: [0.08, 0.06, 0.05],
};
const skin = computeNormals(fromBase(h, o.skinFaces));
skin.skin = skin.src.map(i => h.skin[i]); skin.name = 'skin'; skin.paint = 'skin';
const meshes = [];
for (const p of [skin, ...o.parts]) {
  if (p.name !== 'skin') computeNormals(p, p.src ?? null);
  const sk = skinArrays(p.skin);
  meshes.push({ name: p.name, material: p.paint, positions: p.positions, normals: p.normals, uvs: p.uvs, indices: p.indices, joints: sk.joints, weights: sk.weights });
  console.log(p.name, p.indices.length / 3);
}
const materials = Object.fromEntries(Object.entries(colors).map(([k, c]) => [k, { color: c, roughness: 0.85 }]));
const q = (ax, deg) => { const s = Math.sin(deg * Math.PI / 360); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(deg * Math.PI / 360)]; };
const bend = (bone, ax, deg) => ({ bone, path: 'rotation', times: [0, 1], values: [0, 0, 0, 1, ...q(ax, deg)] });
const test = { name: 'test', tracks: [bend('upperarm_l', [0, 0, 1], 40), bend('upperarm_r', [1, 0, 0], -70), bend('lowerarm_r', [1, 0, 0], -60),
  bend('thigh_r', [1, 0, 0], 50), bend('calf_r', [1, 0, 0], -70), bend('spine_02', [1, 0, 0], 20)] };
const out = new URL(`../.cache/preview_${nat}.glb`, import.meta.url).pathname;
const r = await writeCharacter(out, { name: `preview_${nat}`, bones: GAME_BONES, joints: h.joints, materials, meshes, animations: [test] });
console.log(out, 'bytes', r.bytes, 'triângulos', r.meshes.reduce((s, m) => s + m.triangles, 0));
