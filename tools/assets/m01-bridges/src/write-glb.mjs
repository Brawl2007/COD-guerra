// Escreve nós construídos por bridges.mjs num GLB (glTF 2.0 binário) com @gltf-transform/core.
import { Document, NodeIO } from '@gltf-transform/core';
import { stat } from 'node:fs/promises';

export const MATERIALS = {
  steel_painted: { color: [0.2, 0.22, 0.21], metallic: 0.55, roughness: 0.65, note: 'Cor da pintura de 1939 INCERTA' },
  steel_rail: { color: [0.42, 0.4, 0.38], metallic: 0.9, roughness: 0.35 },
  brick_red: { color: [0.47, 0.22, 0.15], metallic: 0, roughness: 0.9, note: 'Tijolo das torres/portais: tom INCERTO' },
  stone_masonry: { color: [0.56, 0.53, 0.48], metallic: 0, roughness: 0.95, note: 'Tipo de pedra dos pilares INCERTO' },
  timber: { color: [0.32, 0.23, 0.15], metallic: 0, roughness: 0.9 },
  road_surface: { color: [0.36, 0.34, 0.31], metallic: 0, roughness: 0.95, note: 'Pavimento de 1939 INCERTO' },
  opening_dark: { color: [0.03, 0.03, 0.03], metallic: 0, roughness: 1 },
  gate_timber_iron: { color: [0.24, 0.17, 0.11], metallic: 0.2, roughness: 0.8 },
  rubble_mixed: { color: [0.45, 0.42, 0.38], metallic: 0, roughness: 1 },
  collider: { color: [1, 0, 1], alpha: 0.25, metallic: 0, roughness: 1, note: 'Só para depuração: a engine deve ocultar colisores' },
};

export async function writeGlb(path, { rootName, rootExtras, rootTranslation = [0, 0, 0], groups }) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const mats = new Map();
  const material = name => {
    if (!mats.has(name)) {
      const d = MATERIALS[name];
      const m = doc.createMaterial(name).setBaseColorFactor([...d.color, d.alpha ?? 1]).setMetallicFactor(d.metallic).setRoughnessFactor(d.roughness);
      if (d.alpha !== undefined) m.setAlphaMode('BLEND').setDoubleSided(true);
      m.setExtras({ placeholder: true, ...(d.note ? { note: d.note } : {}) });
      mats.set(name, m);
    }
    return mats.get(name);
  };
  const meshes = new Map();
  const stats = { nodes: [], uniqueTriangles: 0, sceneTriangles: 0, vertices: 0 };
  const makeMesh = (name, part) => {
    const mesh = doc.createMesh(name);
    let tris = 0;
    for (const { material: mname, geometry } of part.build()) {
      const pos = geometry.attributes.position.array, nor = geometry.attributes.normal.array;
      const uv = geometry.attributes.uv?.array;
      const idx = geometry.index.array;
      const big = pos.length / 3 > 65535;
      const prim = doc.createPrimitive()
        .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buffer))
        .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(nor)).setBuffer(buffer))
        .setIndices(doc.createAccessor().setType('SCALAR').setArray(big ? new Uint32Array(idx) : new Uint16Array(idx)).setBuffer(buffer))
        .setMaterial(material(mname));
      if (uv) prim.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(uv)).setBuffer(buffer));
      mesh.addPrimitive(prim);
      tris += idx.length / 3;
      stats.vertices += pos.length / 3;
    }
    stats.uniqueTriangles += tris;
    meshes.set(name, { mesh, tris });
    meshes.get(name).drawCalls = mesh.listPrimitives().length;
    return meshes.get(name);
  };
  const root = doc.createNode(rootName).setExtras(rootExtras).setTranslation(rootTranslation);
  for (const [groupName, list, groupExtras] of groups) {
    const g = doc.createNode(`${rootName}_${groupName}`).setExtras(groupExtras ?? {});
    root.addChild(g);
    for (const n of list) {
      const node = doc.createNode(n.name).setExtras({ m01: n.extras ?? {} });
      if (n.translation) node.setTranslation(n.translation);
      if (n.rotation) node.setRotation(n.rotation);
      let tris = 0;
      if (n.part) tris = makeMesh(n.name, n.part).tris;
      else if (n.meshFrom) tris = meshes.get(n.meshFrom).tris;
      if (n.part || n.meshFrom) node.setMesh((meshes.get(n.part ? n.name : n.meshFrom)).mesh);
      stats.sceneTriangles += tris;
      stats.nodes.push({ name: n.name, group: groupName, triangles: tris,
        drawCalls: n.part || n.meshFrom ? meshes.get(n.part ? n.name : n.meshFrom).drawCalls : 0,
        pivot: n.translation ?? [0, 0, 0], extras: n.extras ?? {} });
      g.addChild(node);
    }
  }
  doc.createScene(`${rootName}_scene`).addChild(root);
  doc.getRoot().getAsset().generator = 'COD-guerra tools/assets/m01-bridges (gltf-transform)';
  doc.getRoot().setExtras({ units: 'meters', axes: 'X leste, Y altura, Z sul (frente −Z, three.js)' });
  await new NodeIO().write(path, doc);
  stats.bytes = (await stat(path)).size;
  return stats;
}
