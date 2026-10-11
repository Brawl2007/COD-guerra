import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { NORMAL_ZERO_THRESHOLD, canonicalGlbForReproduction, glbReproductionEqual, canonicalManifestForReproduction } from '../tools/assets/m01-props/src/reproducibility.mjs';

// Kit de props de M01 gerado por tools/assets/m01-props (node tools/assets/m01-props/build.mjs):
// determinismo, manifesto, orçamentos de triângulos, tamanhos reais, origem no solo, cores e GLB válidos.
const DIR = 'assets/models/provisional/m01/props/';
const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url));
const manifest = JSON.parse(read(`${DIR}manifest.json`).toString('utf8'));
const { generate } = await import('../tools/assets/m01-props/build.mjs');

function glb(buf) {
  assert.equal(buf.readUInt32LE(0), 0x46546c67, 'magic');
  assert.equal(buf.readUInt32LE(4), 2); assert.equal(buf.readUInt32LE(8), buf.length);
  const jlen = buf.readUInt32LE(12), json = JSON.parse(buf.subarray(20, 20 + jlen).toString('utf8'));
  const bin = buf.subarray(28 + jlen);
  const view = i => { const a = json.accessors[i], v = json.bufferViews[a.bufferView]; return { a, v }; };
  const floats = i => { const { a, v } = view(i), n = { SCALAR: 1, VEC3: 3 }[a.type];
    return Float32Array.from({ length: a.count * n }, (_, k) => bin.readFloatLE(v.byteOffset + (a.byteOffset ?? 0) + k * 4)); };
  const indices = i => { const { a, v } = view(i), w = a.componentType === 5125 ? 4 : 2;
    return Array.from({ length: a.count }, (_, k) => (w === 4 ? bin.readUInt32LE : bin.readUInt16LE).call(bin, v.byteOffset + (a.byteOffset ?? 0) + k * w)); };
  return { json, floats, indices };
}
function stats(buf) {
  const g = glb(buf), min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  let tris = 0;
  for (const prim of g.json.meshes[0].primitives) {
    const a = g.json.accessors[prim.attributes.POSITION];
    for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], a.min[k]); max[k] = Math.max(max[k], a.max[k]); }
    tris += g.json.accessors[prim.indices].count / 3;
  }
  return { g, tris, min, max, size: max.map((v, k) => v - min[k]) };
}

// Tamanhos plausíveis (m) de LOD0: [mín, máx] em X, Y, Z.
const SIZES = {
  ammo_crate_wood: [[0.6, 1.1], [0.25, 0.5], [0.3, 0.55]],
  supply_crate_planked: [[0.7, 1.1], [0.4, 0.7], [0.4, 0.65]],
  ammo_tin_box: [[0.3, 0.5], [0.15, 0.3], [0.18, 0.3]],
  sandbag_run: [[1.5, 2.5], [0.4, 0.8], [0.45, 0.8]],
  sandbag_corner: [[1.2, 2.2], [0.3, 0.7], [1.4, 2.2]],
  sandbag_burst: [[1.5, 3], [0.2, 0.6], [1, 2.2]],
  barrel_wood: [[0.5, 0.7], [0.8, 1.0], [0.5, 0.7]],
  drum_fuel_200l: [[0.55, 0.65], [0.85, 0.95], [0.55, 0.65]],
  jerrycans: [[0.6, 1.3], [0.4, 0.6], [0.4, 1.0]],
  telegraph_pole: [[0.2, 0.5], [6, 8], [1.2, 2]],
  telegraph_wire_span: [[11.9, 12.1], [0.4, 1.5], [0.8, 1.6]],
  fence_wood: [[2.8, 3.2], [1, 1.4], [0.1, 0.4]],
  fence_barbed: [[2.8, 3.4], [1.1, 1.5], [0.1, 0.9]],
  railway_lantern: [[0.1, 0.3], [0.25, 0.45], [0.1, 0.3]],
  hand_cart: [[0.9, 1.5], [0.8, 1.2], [2, 3]],
  horse_cart: [[1.2, 1.8], [1.2, 1.8], [3.5, 5]],
  point_lever: [[0.5, 1.2], [1, 1.5], [0.8, 1.8]],
  semaphore_signal: [[1, 2.2], [5, 6.5], [0.3, 0.8]],
  water_crane: [[2.5, 4], [4, 5.2], [0.5, 1.2]],
  coal_pile: [[2.5, 4], [0.8, 1.6], [1.8, 3]],
  sleeper_stack: [[2.5, 3.5], [1.2, 1.8], [1.2, 2.2]],
};
const AIR = new Set(['telegraph_wire_span']);   // vão de fio: não está no solo

test('o gerador reproduz GLB/manifesto entre plataformas, salvo resíduos NORMAL <1e-12; repetição local é byte-exacta', () => {
  const { files, manifest: m } = generate();
  assert.equal(files.size, 42);
  const disk = new Map([...files.keys()].map(name => [name, read(DIR + name)]));
  for (const [name, buf] of files) assert.ok(glbReproductionEqual(disk.get(name), buf), `${name} difere do gerador`);
  assert.equal(JSON.stringify(canonicalManifestForReproduction(m, files), null, 2), JSON.stringify(canonicalManifestForReproduction(manifest, disk), null, 2), 'manifest.json difere fora dos SHA canónicos');
  const again = generate();
  for (const [name, buf] of files) assert.ok(again.files.get(name).equals(buf), `${name} não é determinístico`);
  assert.deepEqual(again.manifest, m, 'manifesto local permanece byte-exacto');
});

test('manifesto: autor, licença, unidades, lista completa e ficheiros iguais (bytes, sha256, triângulos)', () => {
  for (const k of ['author', 'license', 'units', 'generator']) assert.ok(typeof manifest[k] === 'string' && manifest[k].trim(), k);
  assert.equal(manifest.units, 'metres');
  assert.equal(manifest.author, 'COD-guerra project, original procedural');
  assert.deepEqual(manifest.props.map(p => p.id).sort(), Object.keys(SIZES).sort(), 'lista de props');
  const onDisk = fs.readdirSync(new URL(`../${DIR}`, import.meta.url)).filter(f => f.endsWith('.glb')).sort();
  const listed = manifest.props.flatMap(p => [p.files.lod0.file, p.files.lod1.file]).sort();
  assert.deepEqual(onDisk, listed, 'todos os GLB em disco estão no manifesto e vice-versa');
  for (const p of manifest.props) {
    assert.ok(p.reference && p.description, `${p.id}: referência e descrição`);
    for (const lod of ['lod0', 'lod1']) {
      const f = p.files[lod], buf = read(DIR + f.file), s = stats(buf);
      assert.equal(buf.length, f.bytes, `${f.file}: bytes`);
      assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), f.sha256, `${f.file}: sha256`);
      assert.equal(s.tris, f.triangles, `${f.file}: triângulos`);
      for (let k = 0; k < 3; k++) { assert.ok(Math.abs(s.min[k] - f.bounds.min[k]) < 1e-3 && Math.abs(s.max[k] - f.bounds.max[k]) < 1e-3, `${f.file}: bounds`); }
    }
  }
});

test('orçamentos: LOD0 ≤ 1500 triângulos, LOD1 ≤ 300 e menor que o LOD0', () => {
  for (const p of manifest.props) {
    const a = stats(read(DIR + p.files.lod0.file)).tris, b = stats(read(DIR + p.files.lod1.file)).tris;
    assert.ok(a <= 1500, `${p.id} LOD0 ${a}`); assert.ok(b <= 300, `${p.id} LOD1 ${b}`); assert.ok(b < a, `${p.id}: LOD1 < LOD0`);
    assert.ok(a >= 20 && b >= 8, `${p.id}: vazio?`);
  }
});

test('tamanhos reais em metros, origem no solo e LOD1 com a mesma pegada que o LOD0', () => {
  for (const p of manifest.props) {
    const s0 = stats(read(DIR + p.files.lod0.file)), s1 = stats(read(DIR + p.files.lod1.file)), want = SIZES[p.id];
    for (let k = 0; k < 3; k++) assert.ok(s0.size[k] >= want[k][0] && s0.size[k] <= want[k][1], `${p.id} eixo ${'XYZ'[k]}: ${s0.size[k].toFixed(3)} m fora de [${want[k]}]`);
    if (!AIR.has(p.id)) assert.ok(s0.min[1] > -0.02 && s0.min[1] < 0.03 && s1.min[1] > -0.02 && s1.min[1] < 0.03, `${p.id}: base em y=0 (${s0.min[1]}, ${s1.min[1]})`);
    for (let k = 0; k < 3; k++) {
      const tol = Math.max(0.15, 0.12 * s0.size[k]);
      assert.ok(Math.abs(s0.size[k] - s1.size[k]) <= tol, `${p.id} LOD1 eixo ${'XYZ'[k]}: ${s1.size[k].toFixed(2)} vs ${s0.size[k].toFixed(2)}`);
    }
  }
  // caixas < 1,2 m; poste 6–8 m
  for (const id of ['ammo_crate_wood', 'supply_crate_planked', 'ammo_tin_box']) assert.ok(Math.max(...manifest.props.find(p => p.id === id).size_m ? Object.values(manifest.props.find(p => p.id === id).size_m) : [9]) < 1.2, id);
  const pole = manifest.props.find(p => p.id === 'telegraph_pole').size_m;
  assert.ok(pole.y >= 6 && pole.y <= 8);
});

test('GLB válidos: cor de vértice, sem texturas, normais unitárias, índices em limites, cores dessaturadas, PBR razoável', () => {
  for (const p of manifest.props) for (const lod of ['lod0', 'lod1']) {
    const name = p.files[lod].file, { g } = stats(read(DIR + name));
    assert.equal(g.json.extras.units, 'meters', name);
    assert.ok(!g.json.images && !g.json.textures, `${name}: sem texturas (cor de vértice)`);
    assert.equal(g.json.nodes[0].extras.id, p.id); assert.equal(g.json.nodes[0].extras.lod, lod === 'lod0' ? 0 : 1);
    assert.ok(g.json.materials.length >= 1 && g.json.materials.length <= 8, `${name}: ${g.json.materials.length} materiais`);
    for (const m of g.json.materials) {
      const pbr = m.pbrMetallicRoughness;
      assert.deepEqual(pbr.baseColorFactor, [1, 1, 1, 1]);
      assert.ok(pbr.roughnessFactor >= 0.2 && pbr.roughnessFactor <= 1 && pbr.metallicFactor >= 0 && pbr.metallicFactor <= 0.6, `${name}: ${m.name} PBR`);
    }
    for (const prim of g.json.meshes[0].primitives) {
      const pos = g.floats(prim.attributes.POSITION), nrm = g.floats(prim.attributes.NORMAL), col = g.floats(prim.attributes.COLOR_0), idx = g.indices(prim.indices);
      const n = pos.length / 3;
      assert.ok(nrm.length === pos.length && col.length === pos.length, `${name}: atributos`);
      assert.ok(pos.every(Number.isFinite) && nrm.every(Number.isFinite), `${name}: finitos`);
      assert.ok(idx.every(i => i >= 0 && i < n) && idx.length % 3 === 0, `${name}: índices`);
      let maxSat = 0, bad = 0;
      for (let i = 0; i < n; i++) {
        const l = Math.hypot(nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]);
        if (Math.abs(l - 1) > 1e-3) bad++;
        const c = [0, 1, 2].map(k => { const v = col[i * 3 + k]; return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055; });   // linear → sRGB
        const hi = Math.max(...c), lo = Math.min(...c);
        if (hi > 0.02) maxSat = Math.max(maxSat, (hi - lo) / hi);
      }
      assert.equal(bad, 0, `${name}: normais não unitárias`);
      assert.ok(maxSat <= 0.62, `${name}: cor demasiado saturada (${maxSat.toFixed(2)})`);
    }
  }
});

test('o vão de fio liga-se às âncoras do poste (sockets) e tem 12 m de comprimento', () => {
  const pole = manifest.props.find(p => p.id === 'telegraph_pole'), wire = manifest.props.find(p => p.id === 'telegraph_wire_span');
  assert.equal(pole.sockets.wire_anchors.length, 6);
  assert.deepEqual(wire.sockets.start_anchors, pole.sockets.wire_anchors);
  wire.sockets.span_end_anchors.forEach((a, i) => { assert.equal(a[0], 12); assert.deepEqual(a.slice(1), pole.sockets.wire_anchors[i].slice(1)); });
  // o topo do isolador do poste está a ≤ 0,02 m da âncora
  const top = stats(read(DIR + pole.files.lod0.file)).max[1];
  assert.ok(top >= Math.max(...pole.sockets.wire_anchors.map(a => a[1])) - 0.02);
});

test('comparação portátil normaliza só resíduos NORMAL: POSITION, cor, índices, JSON e normais reais continuam exactos', () => {
  const original = read(DIR + manifest.props[0].files.lod0.file), jsonLength = original.readUInt32LE(12), binStart = 28 + jsonLength;
  const document = JSON.parse(original.subarray(20, 20 + jsonLength).toString('utf8')), primitive = document.meshes[0].primitives[0];
  const offset = (index, component = 0) => { const accessor = document.accessors[index], view = document.bufferViews[accessor.bufferView]; return binStart + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0) + component * 4; };
  const zeroComponent = index => { const accessor = document.accessors[index]; for (let i = 0; i < accessor.count * 3; i++) if (Math.abs(original.readFloatLE(offset(index, i))) < NORMAL_ZERO_THRESHOLD) return offset(index, i); assert.fail('fixture needs a zero component'); };
  const normal = zeroComponent(primitive.attributes.NORMAL), position = zeroComponent(primitive.attributes.POSITION);
  const mutateFloat = (where, value) => { const changed = Buffer.from(original); changed.writeFloatLE(value, where); return changed; };
  const tiny = mutateFloat(normal, -2e-14);
  assert.ok(glbReproductionEqual(original, tiny));assert.ok(canonicalGlbForReproduction(original).equals(canonicalGlbForReproduction(tiny)));
  assert.ok(!original.equals(tiny));assert.equal(tiny.readFloatLE(normal), Math.fround(-2e-14), 'canonical comparison never mutates inputs');
  const threshold = Buffer.alloc(4);threshold.writeFloatLE(NORMAL_ZERO_THRESHOLD);threshold.writeUInt32LE(threshold.readUInt32LE() + 1);const real = threshold.readFloatLE();assert.ok(real >= NORMAL_ZERO_THRESHOLD);
  assert.equal(glbReproductionEqual(original, mutateFloat(normal, real)), false, 'NORMAL at/above the threshold stays strict');
  assert.equal(glbReproductionEqual(original, mutateFloat(position, 2e-14)), false, 'tiny POSITION changes are forbidden');
  for (const accessor of [primitive.attributes.COLOR_0, primitive.indices]) { const changed = Buffer.from(original);changed[offset(accessor)] ^= 1;assert.equal(glbReproductionEqual(original, changed), false); }
  const changedJson = Buffer.from(original), unitOffset = changedJson.indexOf('meters');assert.ok(unitOffset >= 20);changedJson[unitOffset] = 'M'.charCodeAt(0);assert.equal(glbReproductionEqual(original, changedJson), false);
});
test('manifest reproduction canonicalizes only matching raw file SHA; metadata and disk integrity remain strict', () => {
  const file = manifest.props[0].files.lod0.file, bytes = read(DIR + file), fixture = { props: [{ id: 'fixture', files: { lod0: { file, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), bounds: { min: [0, 0, 0] } } } }], units: 'metres' };
  const files = new Map([[file, bytes]]), canonical = canonicalManifestForReproduction(fixture, files);
  const jsonLength = bytes.readUInt32LE(12), doc = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'));
  const accessor = doc.accessors[doc.meshes[0].primitives[0].attributes.NORMAL], view = doc.bufferViews[accessor.bufferView];
  let normalOffset = 28 + jsonLength + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const normalEnd = normalOffset + accessor.count * 12;
  while (normalOffset < normalEnd && Math.abs(bytes.readFloatLE(normalOffset)) >= NORMAL_ZERO_THRESHOLD) normalOffset += 4;
  assert.ok(normalOffset < normalEnd);
  const noisyBytes = Buffer.from(bytes);noisyBytes.writeFloatLE(-2e-14, normalOffset);
  const noisyManifest = structuredClone(fixture);noisyManifest.props[0].files.lod0.sha256 = crypto.createHash('sha256').update(noisyBytes).digest('hex');
  assert.notEqual(noisyManifest.props[0].files.lod0.sha256, fixture.props[0].files.lod0.sha256);
  assert.deepEqual(canonicalManifestForReproduction(noisyManifest, new Map([[file, noisyBytes]])), canonical, 'only legitimate file SHA differences disappear');
  const changed = structuredClone(fixture);changed.props[0].files.lod0.bounds.min[0] = 2e-14;assert.notDeepEqual(canonicalManifestForReproduction(changed, files), canonical);
  changed.props[0].files.lod0.sha256 = '0'.repeat(64);assert.throws(() => canonicalManifestForReproduction(changed, files), /Invalid raw manifest SHA/);
  assert.equal(fixture.props[0].files.lod0.sha256, crypto.createHash('sha256').update(bytes).digest('hex'), 'manifest input is unchanged');
});
