// Read the preserved game bind pose. No MakeHuman download or asset rebuild is needed.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GAME_BONES } from '../src/human.mjs';
import { rigInfo } from '../src/pose.mjs';
import { v3 } from '../src/meshops.mjs';

export const CHARACTER_DIR = new URL('../../../../assets/models/provisional/m01/characters/', import.meta.url);
export const PACKAGE_DIR = new URL('motion-clips-v1/', CHARACTER_DIR);
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const VARIANTS = ['pl', 'de'].flatMap(nation => [0, 1, 2].map(lod => ({ nation, lod, file: `m01_soldier_${nation}_lod${lod}.glb` })));

export function unpackGLB(bytes) {
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) throw new Error('Invalid GLB header');
  const size = bytes.readUInt32LE(12);
  return { json: JSON.parse(bytes.subarray(20, 20 + size)), binary: bytes.subarray(28 + size) };
}

export async function preservedRig(file = 'm01_soldier_pl_lod1.glb') {
  const bytes = await readFile(new URL(file, CHARACTER_DIR)), { json } = unpackGLB(bytes);
  const J = {}, offsets = {}, bones = new Map(), scene = new THREE.Scene();
  for (const b of GAME_BONES) {
    const matches = json.nodes.filter(n => n.name === b.name);
    if (matches.length !== 1) throw new Error(`Rig requires a unique ${b.name}`);
    const node = matches[0], offset = node.translation ?? [0, 0, 0];
    if (node.rotation?.some((v, i) => Math.abs(v - (i === 3 ? 1 : 0)) > 1e-9) || node.scale?.some(v => v !== 1)) throw new Error('Expected the locked world-aligned bind axes');
    offsets[b.name] = offset;
    J[b.name] = b.parent ? v3.add(J[b.parent], offset) : offset;
    const bone = new THREE.Bone(); bone.name = b.name; bone.position.fromArray(offset); bones.set(b.name, bone);
    (b.parent ? bones.get(b.parent) : scene).add(bone);
  }
  return { bytes, json, offsets, bones, scene, J, R: rigInfo(J) };
}

// Node has no image decoder. Keep the real mesh, skin, indices and animations;
// only texture bindings are removed here. The browser validator keeps textures.
export async function loadGLB(file, directory = CHARACTER_DIR) {
  const bytes = await readFile(new URL(file, directory)), { json, binary } = unpackGLB(bytes);
  json.buffers[0].uri = `data:application/octet-stream;base64,${binary.toString('base64')}`;
  for (const material of json.materials ?? []) {
    for (const key of ['normalTexture', 'occlusionTexture', 'emissiveTexture']) delete material[key];
    for (const key of ['baseColorTexture', 'metallicRoughnessTexture']) if (material.pbrMetallicRoughness) delete material.pbrMetallicRoughness[key];
  }
  globalThis.ProgressEvent ??= class { constructor(type, init) { this.type = type; Object.assign(this, init); } };
  return new GLTFLoader().parseAsync(JSON.stringify(json), '');
}
