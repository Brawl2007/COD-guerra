import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

// Vagões queimados e danificados de M01 gerados por tools/assets/m01-wagon-damage (node build.mjs): kit intacto
// inalterado, escala, pivôs, sockets, orçamentos, animações e restos só visuais.
const DIR = 'assets/models/provisional/m01-wagon-damage/', BASE = 'assets/models/provisional/m01-wagons/';
const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url));
const manifest = JSON.parse(read(`${DIR}manifest.json`)), intact = JSON.parse(read(`${BASE}manifest.json`));
function glb(path) {
  const buf = read(path), len = buf.readUInt32LE(12);
  assert.equal(buf.readUInt32LE(0), 0x46546c67); assert.equal(buf.readUInt32LE(8), buf.length);
  const json = JSON.parse(buf.subarray(20, 20 + len).toString('utf8')), bin = buf.subarray(28 + len);
  const floats = i => { const a = json.accessors[i], v = json.bufferViews[a.bufferView], n = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type], st = v.byteStride ?? n * 4;
    return Array.from({ length: a.count * n }, (_, k) => bin.readFloatLE((v.byteOffset ?? 0) + (a.byteOffset ?? 0) + Math.floor(k / n) * st + (k % n) * 4)); };
  const node = name => json.nodes.find(n => n.name === name);
  const box = name => { const n = node(name), a = json.accessors[json.meshes[n.mesh].primitives[0].attributes.POSITION], t = n.translation ?? [0, 0, 0]; return { min: a.min.map((v, k) => v + t[k]), max: a.max.map((v, k) => v + t[k]) }; };
  return { json, floats, node, box };
}
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} (esperado ${b} ± ${tol})`);
const TYPES = { covered: ['body', 'wheelset_1', 'wheelset_2', 'door_l', 'door_r', 'debris'], open: ['body', 'wheelset_1', 'wheelset_2', 'debris'] };
const STATES = ['burned', 'damaged'], LODS = ['lod0', 'lod1', 'lod2'];
const file = (type, state, lod) => `m01_wagon_${type}_${state}_${lod}.glb`;

test('M01 vagões danificados: o kit intacto não foi alterado (sha256 registados no manifesto)', () => {
  const files = Object.entries(manifest.base.sha256);
  assert.equal(files.length, 9);
  for (const [path, { sha256, bytes }] of files) {
    const buf = read(path);
    assert.equal(buf.length, bytes, path);
    assert.equal(createHash('sha256').update(buf).digest('hex'), sha256, path);
  }
});

test('M01 vagões danificados: metros, 9,10 m no LOD0, rodas no carril, pivôs do intacto e três LODs no orçamento', () => {
  for (const [type, nodes] of Object.entries(TYPES)) {
    const ref = glb(`${BASE}m01_wagon_${type}_lod0.glb`);
    for (const state of STATES) {
      let prev = Infinity;
      for (const lod of LODS) {
        const f = file(type, state, lod), g = glb(DIR + f), m = manifest.files[f];
        assert.equal(g.json.extras.units, 'meters', f);
        assert.equal(g.json.extras.state, state, f);
        for (const n of nodes) assert.ok(g.node(n)?.mesh !== undefined, `${f}: nó ${n}`);
        for (const n of nodes.filter(n => n !== 'debris')) assert.deepEqual(g.node(n).translation ?? [0, 0, 0], ref.node(n).translation ?? [0, 0, 0], `${f}: pivô ${n} igual ao intacto`);
        const b = g.box('body'), w = g.box('wheelset_1');
        if (lod === 'lod0') near(b.max[2] - b.min[2], 9.10, 0.02, `${f}: comprimento entre tampões`);
        assert.ok(b.min[1] >= -0.05 && b.max[1] <= intact.types[type].sockets.smoke_top[1] + 0.01, `${f}: altura ${b.min[1]}..${b.max[1]}`);
        near(w.min[1], -0.035, 0.05, `${f}: rodas no carril`);
        const tris = g.json.meshes.reduce((s, mesh) => s + g.json.accessors[mesh.primitives[0].indices].count / 3, 0);
        assert.ok(tris <= (lod === 'lod0' ? 2500 : prev) && tris < prev, `${f}: ${tris} triângulos`);
        assert.equal(tris, m.triangles, f);
        assert.equal(g.json.meshes.length, m.draw_calls, `${f}: draw calls`);
        prev = tris;
        assert.equal(g.json.materials.length, 1, `${f}: um material`);
        assert.ok(g.json.materials[0].pbrMetallicRoughness.baseColorTexture, `${f}: textura`);
        assert.ok(g.json.images.length <= 2, `${f}: texturas`);
        for (const mesh of g.json.meshes) for (const k of ['POSITION', 'NORMAL', 'TEXCOORD_0']) assert.ok(g.floats(mesh.primitives[0].attributes[k]).every(Number.isFinite), `${f}: ${k} finito`);
      }
    }
  }
  assert.match(manifest.identification.status, /P16/);
  assert.match(manifest.runtime.collision, /intacto/);
});

test('M01 vagões danificados: sockets iguais aos do intacto, mais impact só no danificado', () => {
  for (const type of Object.keys(TYPES)) for (const state of STATES) {
    const S = manifest.states[`${type}_${state}`].sockets, { impact, ...rest } = S;
    assert.deepEqual(rest, intact.types[type].sockets, `${type} ${state}`);
    if (state === 'burned') assert.equal(impact, undefined);
    else assert.ok(impact.every(Number.isFinite) && Math.abs(impact[0]) <= 1.5, `${type}: impact ${impact}`);
    for (const lod of LODS) assert.deepEqual(glb(DIR + file(type, state, lod)).json.nodes[0].extras.sockets, S, `${type} ${state} ${lod}`);
  }
});

test('M01 vagões danificados: wheels_roll igual ao intacto; doors_open só na porta esquerda do coberto danificado', () => {
  for (const type of Object.keys(TYPES)) {
    const ref = glb(`${BASE}m01_wagon_${type}_lod0.glb`), refRoll = ref.json.animations.find(a => a.name === 'wheels_roll');
    for (const state of STATES) {
      const g = glb(DIR + file(type, state, 'lod0')), anim = Object.fromEntries(g.json.animations.map(a => [a.name, a]));
      for (const ws of ['wheelset_1', 'wheelset_2']) {
        const out = (G, a) => { const c = a.channels.find(c => G.json.nodes[c.target.node].name === ws && c.target.path === 'rotation'); return [G.floats(a.samplers[c.sampler].input), G.floats(a.samplers[c.sampler].output)]; };
        assert.deepEqual(out(g, anim.wheels_roll), out(ref, refRoll), `${type} ${state}: ${ws}`);
      }
      if (type === 'covered' && state === 'damaged') {
        assert.deepEqual(anim.doors_open.channels.map(c => g.json.nodes[c.target.node].name), ['door_l']);
        const c = anim.doors_open.channels[0], v = g.floats(anim.doors_open.samplers[c.sampler].output), t0 = g.node('door_l').translation;
        near(v.at(-1) - t0[2], 1.95, 1e-5, 'door_l abre 1,95 m');
      } else assert.equal(anim.doors_open, undefined, `${type} ${state}: sem doors_open`);
    }
  }
});

test('M01 vagões danificados: restos só visuais no nó debris, alterações registadas e sem efeitos próprios', () => {
  for (const type of Object.keys(TYPES)) for (const state of STATES) {
    const st = manifest.states[`${type}_${state}`], ch = st.changes_vs_intact;
    assert.ok(ch.removed.length && ch.added.length, `${type} ${state}: alterações`);
    assert.equal(new Set(ch.removed).size, ch.removed.length, `${type} ${state}: removidas sem repetição`);
    assert.ok(st.nodes.find(n => n.node === 'debris').pieces.length > 0, `${type} ${state}: restos`);
    const g = glb(DIR + file(type, state, 'lod0'));
    assert.ok(!g.json.extensions?.KHR_lights_punctual && !(g.json.extensionsUsed ?? []).includes('KHR_lights_punctual'), 'sem luzes');
    assert.ok(g.json.animations.every(a => ['wheels_roll', 'doors_open'].includes(a.name)), `${type} ${state}: sem animações de fogo`);
  }
});
