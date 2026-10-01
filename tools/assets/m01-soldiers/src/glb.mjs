// Escreve um personagem riggado em GLB: hierarquia de articulações (eixos do mundo na pose de ligação),
// uma skin partilhada por todas as malhas e LODs, materiais com texturas, morph targets e clips.
import { Document, NodeIO } from '@gltf-transform/core';
import { stat } from 'node:fs/promises';

/**
 * character = {
 *   name, extras, bones: [{name, parent}], joints: {name: [x,y,z]} (mundo, metros),
 *   materials: {name: {baseColor: {mime, data}|null, color, metallicRoughness: {mime,data}|null, roughness, metallic, doubleSided}},
 *   meshes: [{name, material, positions, normals, uvs, joints (Uint16 n*4, índices do esqueleto), weights, indices,
 *             visible, extras, morphs: [{name, positions(delta)}]}],
 *   animations: [{name, extras, tracks: [{bone, path: 'rotation'|'translation'|'scale', times, values}]}],
 * }
 */
export async function writeCharacter(path, character) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const acc = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
  const textures = new Map();
  const texture = (key, img) => {
    if (!img) return null;
    if (!textures.has(key)) textures.set(key, doc.createTexture(key).setImage(img.data).setMimeType(img.mime));
    return textures.get(key);
  };
  const materials = new Map();
  for (const [name, m] of Object.entries(character.materials)) {
    const mat = doc.createMaterial(name).setBaseColorFactor([...(m.color ?? [1, 1, 1]), 1])
      .setRoughnessFactor(m.roughness ?? 0.9).setMetallicFactor(m.metallic ?? 0).setDoubleSided(Boolean(m.doubleSided));
    const bc = texture(`${name}_baseColor`, m.baseColor);
    if (bc) mat.setBaseColorTexture(bc);
    const mr = texture(`${name}_metallicRoughness`, m.metallicRoughness);
    if (mr) mat.setMetallicRoughnessTexture(mr);
    const nm = texture(`${name}_normal`, m.normal);
    if (nm) mat.setNormalTexture(nm);
    if (m.extras) mat.setExtras(m.extras);
    materials.set(name, mat);
  }

  const root = doc.createNode(character.name).setExtras(character.extras ?? {});
  const nodes = new Map();
  for (const b of character.bones) {
    const p = character.joints[b.name], pp = b.parent ? character.joints[b.parent] : [0, 0, 0];
    const node = doc.createNode(b.name).setTranslation([p[0] - pp[0], p[1] - pp[1], p[2] - pp[2]]);
    if (b.extras) node.setExtras(b.extras);
    nodes.set(b.name, node);
    (b.parent ? nodes.get(b.parent) : root).addChild(node);
  }
  const skinFor = new Map();
  const makeSkin = (boneNames) => {
    const key = boneNames.join(',');
    if (skinFor.has(key)) return skinFor.get(key);
    const ibm = new Float32Array(boneNames.length * 16);
    boneNames.forEach((n, i) => {
      const p = character.joints[n];
      ibm.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -p[0], -p[1], -p[2], 1], i * 16);
    });
    const skin = doc.createSkin(`${character.name}_skin${skinFor.size || ''}`).setSkeleton(nodes.get(boneNames[0])).setInverseBindMatrices(acc('MAT4', ibm));
    for (const n of boneNames) skin.addJoint(nodes.get(n));
    skinFor.set(key, skin);
    return skin;
  };
  const allBones = character.bones.map(b => b.name);
  const stats = [];
  for (const m of character.meshes) {
    const vcount = m.positions.length / 3;
    const prim = doc.createPrimitive().setMaterial(materials.get(m.material))
      .setAttribute('POSITION', acc('VEC3', Float32Array.from(m.positions)))
      .setAttribute('NORMAL', acc('VEC3', Float32Array.from(m.normals)))
      .setIndices(acc('SCALAR', vcount > 65535 ? Uint32Array.from(m.indices) : Uint16Array.from(m.indices)));
    if (m.uvs) prim.setAttribute('TEXCOORD_0', acc('VEC2', Float32Array.from(m.uvs)));
    // Índices de articulação relativos à skin desta malha (as malhas leves usam um subconjunto dos ossos).
    const skinBones = m.skinBones ?? allBones;
    const remap = new Map(skinBones.map((n, i) => [allBones.indexOf(n), i]));
    const j = new Uint16Array(vcount * 4);
    for (let i = 0; i < j.length; i++) j[i] = remap.get(m.joints[i]) ?? 0;
    prim.setAttribute('JOINTS_0', acc('VEC4', j.every(v => v < 256) ? Uint8Array.from(j) : j));
    prim.setAttribute('WEIGHTS_0', acc('VEC4', Float32Array.from(m.weights)));
    const mesh = doc.createMesh(m.name).addPrimitive(prim);
    if (m.morphs?.length) {
      for (const t of m.morphs) prim.addTarget(doc.createPrimitiveTarget(t.name).setAttribute('POSITION', acc('VEC3', Float32Array.from(t.positions))));
      mesh.setWeights(m.morphs.map(() => 0)).setExtras({ targetNames: m.morphs.map(t => t.name) });
    }
    const node = doc.createNode(m.name).setMesh(mesh).setSkin(makeSkin(skinBones)).setExtras({ visible: m.visible !== false, ...(m.extras ?? {}) });
    root.addChild(node);
    stats.push({ name: m.name, material: m.material, triangles: m.indices.length / 3, vertices: vcount, bones: skinBones.length, visible: m.visible !== false, morphs: m.morphs?.length ?? 0 });
  }
  for (const a of character.animations ?? []) {
    const anim = doc.createAnimation(a.name);
    if (a.extras) anim.setExtras(a.extras);
    for (const t of a.tracks) {
      const sampler = doc.createAnimationSampler().setInput(acc('SCALAR', Float32Array.from(t.times)))
        .setOutput(acc(t.path === 'rotation' ? 'VEC4' : 'VEC3', Float32Array.from(t.values))).setInterpolation(t.interpolation ?? 'LINEAR');
      anim.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(nodes.get(t.bone)).setTargetPath(t.path).setSampler(sampler));
    }
  }
  doc.createScene(character.name).addChild(root);
  doc.getRoot().getAsset().generator = 'COD-guerra tools/assets/m01-soldiers (gltf-transform)';
  doc.getRoot().setExtras({ units: 'meters', axes: 'Y altura; personagem virado para −Z (convenção de missions/m01-tczew/ASSETS.md)', ...(character.rootExtras ?? {}) });
  await new NodeIO().write(path, doc);
  return { bytes: (await stat(path)).size, meshes: stats, animations: (character.animations ?? []).map(a => a.name) };
}
