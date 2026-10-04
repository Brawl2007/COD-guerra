import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Ju 87 B-1 de M01 gerado por tools/assets/m01-aircraft (node build.mjs): escala, nós, LODs e animações.
const DIR = 'assets/models/provisional/m01-aircraft/';
const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url));
const manifest = JSON.parse(read(`${DIR}manifest.json`));
function glb(file) {
  const buf = read(DIR + file), len = buf.readUInt32LE(12);
  assert.equal(buf.readUInt32LE(0), 0x46546c67); assert.equal(buf.readUInt32LE(8), buf.length);
  const json = JSON.parse(buf.subarray(20, 20 + len).toString('utf8')), bin = buf.subarray(28 + len);
  const floats = i => { const a = json.accessors[i], v = json.bufferViews[a.bufferView], n = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type];
    return Array.from({ length: a.count * n }, (_, k) => bin.readFloatLE((v.byteOffset ?? 0) + (a.byteOffset ?? 0) + k * 4)); };
  const node = name => json.nodes.find(n => n.name === name);
  const box = name => { const n = node(name), a = json.accessors[json.meshes[n.mesh].primitives[0].attributes.POSITION], t = n.translation ?? [0, 0, 0]; return { min: a.min.map((v, k) => v + t[k]), max: a.max.map((v, k) => v + t[k]) }; };
  return { json, floats, node, box };
}
const NODES = ['fuselage', 'propeller', 'dive_brake_l', 'dive_brake_r', 'bomb_sc250'];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} (esperado ${b} ± ${tol})`);

test('M01 Ju 87 B-1: metres, nose to −Z, 11.10 × 13.80 m, stable nodes and three LODs within budget', () => {
  let prev = Infinity;
  for (const lod of ['lod0', 'lod1', 'lod2']) {
    const file = `m01_ju87_b1_${lod}.glb`, g = glb(file);
    assert.equal(g.json.extras.units, 'meters', file);
    for (const n of NODES) assert.ok(g.node(n)?.mesh !== undefined, `${file}: nó ${n}`);
    const f = g.box('fuselage'), p = g.box('propeller');
    near(f.max[2] - p.min[2], 11.10, 0.11, `${file}: comprimento (cubo → leme)`);
    assert.ok(p.min[2] < f.min[2] && f.max[2] > 6, `${file}: nariz em −Z`);
    near(f.max[0] - f.min[0], 13.80, 0.14, `${file}: envergadura`);
    near(f.max[1] - f.min[1], 4.24, 0.13, `${file}: altura (roda → deriva, atitude de voo)`);
    near(f.min[0] + f.max[0], 0, 0.01, `${file}: simetria`);
    const tris = g.json.meshes.reduce((s, m) => s + g.json.accessors[m.primitives[0].indices].count / 3, 0);
    assert.ok(tris <= (lod === 'lod0' ? 15000 : prev) && tris < prev, `${file}: ${tris} triângulos`);
    assert.equal(tris, manifest.files[file].triangles, file);
    prev = tris;
    assert.equal(g.json.materials.length, 1, `${file}: um material`);
    assert.ok(g.json.materials[0].pbrMetallicRoughness.baseColorTexture, `${file}: textura`);
  }
  assert.equal(manifest.variant.id, 'Ju 87 B-1');
  assert.ok(manifest.measures.some(m => m.estimated) && manifest.measures.find(m => m.id === 'length').source === 'T29');
});

test('M01 Ju 87 B-1: propeller turns a full revolution about Z; dive brakes open 90° about their hinge', () => {
  const g = glb('m01_ju87_b1_lod0.glb'), anim = Object.fromEntries(g.json.animations.map(a => [a.name, a]));
  const chan = (a, name) => a.channels.filter(c => g.json.nodes[c.target.node].name === name && c.target.path === 'rotation');
  const spin = anim.propeller_spin, [pc] = chan(spin, 'propeller'), q = g.floats(spin.samplers[pc.sampler].output);
  assert.equal(g.floats(spin.samplers[pc.sampler].input).at(-1), 1);
  for (let i = 0; i < q.length; i += 4) { near(q[i], 0, 1e-6, 'hélice: x'); near(q[i + 1], 0, 1e-6, 'hélice: y'); }
  near(Math.abs(q.at(-1)), 1, 1e-6, 'hélice: volta completa');
  near(q[3] * q[7] + q[2] * q[6], Math.cos(Math.PI / 4), 1e-6, 'hélice: 90° por quarto de segundo');
  const brakes = anim.dive_brakes_extend;
  for (const name of ['dive_brake_l', 'dive_brake_r']) {
    const [c] = chan(brakes, name), v = g.floats(brakes.samplers[c.sampler].output), base = g.node(name).rotation, last = v.slice(-4);
    assert.deepEqual(v.slice(0, 4).map(x => +x.toFixed(6)), base.map(x => +x.toFixed(6)), `${name}: começa recolhido`);
    near(base[0] * last[0] + base[1] * last[1] + base[2] * last[2] + base[3] * last[3], Math.cos(Math.PI / 4), 1e-5, `${name}: abre 90°`);
  }
});
