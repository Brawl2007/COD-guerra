// Escritor GLB mínimo e determinístico (sem dependências): um nó, uma malha, uma primitiva por material,
// POSITION/NORMAL/COLOR_0 (linear, float) e índices. Sem texturas: a cor está nos vértices.
import { MATERIALS } from './mesh.mjs';

const toLinear = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const pad4 = (n) => (n + 3) & ~3;

/** Escreve o modelo num Buffer GLB e devolve {buffer, triangles, vertices, bounds, materials}. */
export function encodeGlb(model, extras = {}) {
  const chunks = [], views = [], accessors = [], prims = [], materials = [], matIndex = new Map();
  let offset = 0;
  const push = (data, target) => {
    const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    const start = pad4(offset);
    if (start > offset) chunks.push(Buffer.alloc(start - offset));
    chunks.push(buf);
    views.push({ buffer: 0, byteOffset: start, byteLength: buf.length, ...(target ? { target } : {}) });
    offset = start + buf.length;
    return views.length - 1;
  };
  const acc = (data, componentType, type, count, minmax) => {
    const view = push(data, componentType === 5125 || componentType === 5123 ? 34963 : 34962);
    accessors.push({ bufferView: view, componentType, count, type, ...(minmax ?? {}) });
    return accessors.length - 1;
  };
  let triangles = 0, vertices = 0;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const [name, P] of model.parts) {
    const n = P.pos.length / 3;
    if (!n || !P.idx.length) continue;
    const pos = Float32Array.from(P.pos), nrm = Float32Array.from(P.nrm), col = Float32Array.from(P.col, toLinear);
    const pmin = [Infinity, Infinity, Infinity], pmax = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { pmin[k] = Math.min(pmin[k], pos[i * 3 + k]); pmax[k] = Math.max(pmax[k], pos[i * 3 + k]); }
    for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], pmin[k]); max[k] = Math.max(max[k], pmax[k]); }
    const idx = n > 65535 ? Uint32Array.from(P.idx) : Uint16Array.from(P.idx);
    const a = {
      POSITION: acc(pos, 5126, 'VEC3', n, { min: pmin, max: pmax }),
      NORMAL: acc(nrm, 5126, 'VEC3', n),
      COLOR_0: acc(col, 5126, 'VEC3', n),
    };
    const indices = acc(idx, n > 65535 ? 5125 : 5123, 'SCALAR', idx.length);
    const m = MATERIALS[name];
    matIndex.set(name, materials.length);
    materials.push({
      name,
      pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: m.metallic, roughnessFactor: m.roughness },
      ...(m.doubleSided ? { doubleSided: true } : {}),
    });
    prims.push({ attributes: a, indices, material: matIndex.get(name), mode: 4 });
    triangles += idx.length / 3; vertices += n;
  }
  const body = Buffer.concat(chunks);
  const binLen = pad4(body.length);
  const json = {
    asset: { version: '2.0', generator: 'COD-guerra tools/assets/m01-props (gerador original sem dependências)' },
    extras: { units: 'meters', axes: '+Y para cima; origem no contacto com o solo', ...extras },
    scene: 0, scenes: [{ name: model.id, nodes: [0] }],
    nodes: [{ name: model.id, mesh: 0, extras: { id: model.id, lod: model.lod, sockets: model.sockets } }],
    meshes: [{ name: model.id, primitives: prims }],
    materials, accessors, bufferViews: views, buffers: [{ byteLength: binLen }],
  };
  let jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
  jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(pad4(jsonBuf.length) - jsonBuf.length, 0x20)]);
  const total = 12 + 8 + jsonBuf.length + 8 + binLen;
  const head = Buffer.alloc(20);
  head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(total, 8);
  head.writeUInt32LE(jsonBuf.length, 12); head.writeUInt32LE(0x4e4f534a, 16);
  const binHead = Buffer.alloc(8); binHead.writeUInt32LE(binLen, 0); binHead.writeUInt32LE(0x004e4942, 4);
  const buffer = Buffer.concat([head, jsonBuf, binHead, body, Buffer.alloc(binLen - body.length)]);
  return { buffer, triangles, vertices, bounds: { min, max }, materials: materials.map(m => m.name) };
}
