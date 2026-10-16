import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Vagões de M01 gerados por tools/assets/m01-wagons (node build.mjs): escala, nós, LODs e animações.
const DIR = 'assets/models/provisional/m01-wagons/';
const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url));
const manifest = JSON.parse(read(`${DIR}manifest.json`));
function glb(file) {
  const buf = read(DIR + file), len = buf.readUInt32LE(12);
  assert.equal(buf.readUInt32LE(0), 0x46546c67); assert.equal(buf.readUInt32LE(8), buf.length);
  const json = JSON.parse(buf.subarray(20, 20 + len).toString('utf8')), bin = buf.subarray(28 + len);
  const floats = i => { const a = json.accessors[i], v = json.bufferViews[a.bufferView], n = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type], st = v.byteStride ?? n * 4;
    return Array.from({ length: a.count * n }, (_, k) => bin.readFloatLE((v.byteOffset ?? 0) + (a.byteOffset ?? 0) + Math.floor(k / n) * st + (k % n) * 4)); };
  const node = name => json.nodes.find(n => n.name === name);
  const box = name => { const n = node(name), a = json.accessors[json.meshes[n.mesh].primitives[0].attributes.POSITION], t = n.translation ?? [0, 0, 0]; return { min: a.min.map((v, k) => v + t[k]), max: a.max.map((v, k) => v + t[k]) }; };
  return { json, floats, node, box };
}
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} (esperado ${b} ± ${tol})`);
const TYPES = { covered: { height: 3.85, nodes: ['body', 'wheelset_1', 'wheelset_2', 'door_l', 'door_r'] }, open: { height: 2.84, nodes: ['body', 'wheelset_1', 'wheelset_2'] } };

test('M01 vagões: metros, 9,10 m entre tampões no LOD0, rodas no carril, nós estáveis e três LODs no orçamento', () => {
  for (const [type, T] of Object.entries(TYPES)) {
    let prev = Infinity;
    for (const lod of ['lod0', 'lod1', 'lod2']) {
      const file = `m01_wagon_${type}_${lod}.glb`, g = glb(file);
      assert.equal(g.json.extras.units, 'meters', file);
      for (const n of T.nodes) assert.ok(g.node(n)?.mesh !== undefined, `${file}: nó ${n}`);
      const b = g.box('body'), w = g.box('wheelset_1');
      if (lod === 'lod0') near(b.max[2] - b.min[2], 9.10, 0.02, `${file}: comprimento entre tampões`);
      near(b.max[1], T.height, 0.05, `${file}: altura sobre o carril`);
      near(b.min[0] + b.max[0], 0, 0.01, `${file}: simetria`);
      near(w.min[1], -0.035, 0.05, `${file}: rodas no carril (verdugo abaixo do topo)`);
      near(g.node('wheelset_1').translation[2], -2, 1e-6, `${file}: rodado 1 em −Z`);
      const tris = g.json.meshes.reduce((s, m) => s + g.json.accessors[m.primitives[0].indices].count / 3, 0);
      assert.ok(tris <= (lod === 'lod0' ? 2500 : prev) && tris < prev, `${file}: ${tris} triângulos`);
      assert.equal(tris, manifest.files[file].triangles, file);
      prev = tris;
      assert.equal(g.json.materials.length, 1, `${file}: um material`);
      assert.ok(g.json.materials[0].pbrMetallicRoughness.baseColorTexture, `${file}: textura`);
    }
  }
  assert.match(manifest.identification.status, /P16/);
  assert.ok(manifest.measures.some(m => m.estimated) && manifest.measures.find(m => m.id === 'gauge').value_m === 1.435);
});

test('M01 vagões: rodados dão uma volta por segundo em X; portas do coberto correm 1,95 m em Z', () => {
  for (const type of Object.keys(TYPES)) {
    const g = glb(`m01_wagon_${type}_lod0.glb`), anim = Object.fromEntries(g.json.animations.map(a => [a.name, a]));
    const chan = (a, name, path) => a.channels.find(c => g.json.nodes[c.target.node].name === name && c.target.path === path);
    for (const ws of ['wheelset_1', 'wheelset_2']) {
      const c = chan(anim.wheels_roll, ws, 'rotation'), q = g.floats(anim.wheels_roll.samplers[c.sampler].output);
      assert.equal(g.floats(anim.wheels_roll.samplers[c.sampler].input).at(-1), 1);
      for (let i = 0; i < q.length; i += 4) { near(q[i + 1], 0, 1e-6, `${ws}: y`); near(q[i + 2], 0, 1e-6, `${ws}: z`); }
      near(Math.abs(q.at(-1)), 1, 1e-6, `${ws}: volta completa`);
      near(q[4], -Math.sin(Math.PI / 4), 1e-6, `${ws}: −90° em X ao primeiro quarto (rola para −Z)`);
    }
    if (type === 'open') { assert.equal(anim.doors_open, undefined); continue; }
    for (const d of ['door_l', 'door_r']) {
      const c = chan(anim.doors_open, d, 'translation'), v = g.floats(anim.doors_open.samplers[c.sampler].output), t0 = g.node(d).translation;
      assert.deepEqual(v.slice(0, 3).map(x => +x.toFixed(5)), t0.map(x => +x.toFixed(5)), `${d}: começa fechada`);
      near(v.at(-1) - t0[2], 1.95, 1e-5, `${d}: abre 1,95 m`);
      near(v.at(-3), t0[0], 1e-6, `${d}: não sai do plano`);
    }
  }
});
