// Pré-visualização texturizada (desenvolvimento): corpo + fardamento + mãos + uma cabeça, atlas pintado.
// Uso: node dev/textured.mjs pl|de [variante] [tamanho] → .cache/textured_<nação>.glb
import { buildHuman, GAME_BONES } from '../src/human.mjs';
import { computeNormals, skinArrays } from '../src/meshops.mjs';
import { writeCharacter } from '../src/glb.mjs';
import { buildOutfit, STYLES } from '../src/outfit.mjs';
import { buildHead, buildHands } from '../src/head.mjs';
import { HEADS } from '../src/variants.mjs';
import { makePainters } from '../src/paint.mjs';
import { bakeAtlas } from '../src/textures.mjs';
import { writeFileSync } from 'node:fs';

const nat = process.argv[2] ?? 'pl', vid = process.argv[3] ?? HEADS[nat][0].id, size = +(process.argv[4] ?? 1024);
const macro = { gender: 1, age: 0.55, muscle: 0.6, weight: 0.45, height: 0.5 };
const h = buildHuman({ macro });
const style = STYLES[nat], o = buildOutfit(h, style);
const variant = HEADS[nat].find(v => v.id === vid);
const hd = buildHead(h, macro, variant, style);
const hands = buildHands(h, style);
const parts = [...o.parts, hands, hd.head, hd.hair, ...hd.eyes];
for (const p of parts) if (!p.normals) computeNormals(p, p.src ?? null);
const painters = makePainters({ nat, J: h.joints, lm: o.lm, heads: [{ variant, lm: hd.lm }] });
console.time('atlas');
const atlas = bakeAtlas(parts, painters, { size, ormSize: size / 2, normalSize: size / 2 });
console.timeEnd('atlas');
console.log('densidade px/m', atlas.density.toFixed(0), 'ilhas', atlas.islands);
writeFileSync(new URL(`../.cache/atlas_${nat}.jpg`, import.meta.url), atlas.images.color.data);
writeFileSync(new URL(`../.cache/atlas_${nat}_n.png`, import.meta.url), atlas.images.normal.data);
const meshes = parts.map(p => { const sk = skinArrays(p.skin); return { name: p.name, material: 'atlas', positions: p.positions, normals: p.normals, uvs: p.atlasUV, indices: p.indices, joints: sk.joints, weights: sk.weights }; });
const materials = { atlas: { baseColor: atlas.images.color, metallicRoughness: atlas.images.orm, normal: atlas.images.normal, roughness: 1, metallic: 1 } };
const out = new URL(`../.cache/textured_${nat}.glb`, import.meta.url).pathname;
const r = await writeCharacter(out, { name: `textured_${nat}`, bones: GAME_BONES, joints: h.joints, materials, meshes });
console.log(out, 'bytes', r.bytes, 'triângulos', r.meshes.reduce((s, m) => s + m.triangles, 0));
