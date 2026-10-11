// Comparison-only portability guard. Production GLB/manifest bytes are never rewritten.
// Float math can leave ~1e-14 residual NORMAL components on different CPU/Node platforms.
// Only Float32 NORMAL components strictly below 1e-12 become +0; every other byte stays exact.
import { createHash } from 'node:crypto';
export const NORMAL_ZERO_THRESHOLD = 1e-12;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const requireValid = (condition, message) => { if (!condition) throw new Error(`Invalid reproduction GLB: ${message}`); };
export function canonicalGlbForReproduction(input) {
  const bytes = Buffer.from(input);
  requireValid(bytes.length >= 28 && bytes.readUInt32LE(0) === 0x46546c67 && bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.length, 'header');
  let json, binOffset, binLength;
  for (let offset = 12; offset < bytes.length;) {
    requireValid(offset + 8 <= bytes.length, 'chunk header');
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4), start = offset + 8;
    requireValid(length % 4 === 0 && start + length <= bytes.length, 'chunk length');
    if (type === 0x4e4f534a) { requireValid(!json && offset === 12, 'JSON chunk'); json = JSON.parse(bytes.subarray(start, start + length).toString('utf8')); }
    if (type === 0x004e4942) { requireValid(binOffset === undefined, 'duplicate BIN'); binOffset = start; binLength = length; }
    offset = start + length;
  }
  requireValid(json && binOffset !== undefined, 'missing JSON/BIN');
  const normals = new Set(), otherAccessors = new Set();
  for (const mesh of json.meshes ?? []) for (const primitive of mesh.primitives ?? []) {
    for (const [semantic, accessor] of Object.entries(primitive.attributes ?? {})) (semantic === 'NORMAL' ? normals : otherAccessors).add(accessor);
    if (primitive.indices !== undefined) otherAccessors.add(primitive.indices);
    for (const target of primitive.targets ?? []) for (const accessor of Object.values(target)) otherAccessors.add(accessor);
  }
  const normalViews = new Set([...normals].map(index => json.accessors?.[index]?.bufferView));
  // This kit stores normals in dedicated views. Reject aliasing rather than mask position/colour/index bytes.
  for (const index of otherAccessors) requireValid(!normalViews.has(json.accessors?.[index]?.bufferView), 'NORMAL view aliases another semantic');
  for (const index of normals) {
    const accessor = json.accessors?.[index], view = json.bufferViews?.[accessor?.bufferView];
    requireValid(accessor?.componentType === 5126 && accessor.type === 'VEC3' && !accessor.sparse && view?.buffer === 0, 'unsupported NORMAL accessor');
    const count = accessor.count, stride = view.byteStride ?? 12, start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    requireValid(Number.isInteger(count) && count >= 0 && Number.isInteger(stride) && stride >= 12 && stride % 4 === 0 && start % 4 === 0 && start >= (view.byteOffset ?? 0), 'NORMAL layout');
    const end = count ? start + (count - 1) * stride + 12 : start;
    requireValid(end <= binLength && end <= (view.byteOffset ?? 0) + view.byteLength, 'NORMAL bounds');
    for (let vertex = 0; vertex < count; vertex++) for (let component = 0; component < 3; component++) {
      const offset = binOffset + start + vertex * stride + component * 4;
      if (Math.abs(bytes.readFloatLE(offset)) < NORMAL_ZERO_THRESHOLD) bytes.writeFloatLE(0, offset);
    }
  }
  return bytes;
}
export function glbReproductionEqual(left, right) {
  try { return canonicalGlbForReproduction(left).equals(canonicalGlbForReproduction(right)); }
  catch { return false; }
}
export function canonicalManifestForReproduction(manifest, files) {
  const copy = structuredClone(manifest);
  for (const prop of copy.props) for (const file of Object.values(prop.files)) {
    const bytes = files.get(file.file);
    if (!bytes || sha256(bytes) !== file.sha256) throw new Error(`Invalid raw manifest SHA: ${file.file}`);
    file.sha256 = sha256(canonicalGlbForReproduction(bytes));
  }
  return copy;
}
