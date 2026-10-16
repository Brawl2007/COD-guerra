import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// rkm wz.28 de Kowal gerada por tools/assets/m01-rkm-wz28 (node build.mjs): escala, peças, LODs, texturas e clips.
const DIR = 'assets/models/provisional/m01/weapons/rkm_wz28/';
const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url));
const manifest = JSON.parse(read(`${DIR}manifest.json`));
function glb(path) {
  const buf = read(path), len = buf.readUInt32LE(12);
  assert.equal(buf.readUInt32LE(0), 0x46546c67); assert.equal(buf.readUInt32LE(8), buf.length);
  const json = JSON.parse(buf.subarray(20, 20 + len).toString('utf8')), bin = buf.subarray(28 + len);
  const floats = i => { const a = json.accessors[i], v = json.bufferViews[a.bufferView], n = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type];
    return Array.from({ length: a.count * n }, (_, k) => bin.readFloatLE((v.byteOffset ?? 0) + (a.byteOffset ?? 0) + k * 4)); };
  return { json, floats, node: name => json.nodes.find(n => n.name === name) };
}
const PARTS = ['rkm_body', 'rkm_magazine', 'rkm_charging_handle', 'rkm_bipod_folded', 'rkm_bipod_open'];
const LODS = { lod0: 2000, lod1: 1000, lod2: 300 };

test('M01 rkm wz.28: metres, barrel to −Z, 1.11 m ±2 %, movable parts and three LODs within budget', () => {
  let prev = Infinity;
  for (const [lod, budget] of Object.entries(LODS)) {
    const file = `m01_rkm_wz28_${lod}.glb`, g = glb(DIR + file), min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    assert.equal(g.json.extras.units, 'meters', file);
    let tris = 0;
    for (const name of PARTS) {
      const n = g.node(name); assert.ok(n?.mesh !== undefined, `${file}: ${name}`);
      assert.equal(n.extras.visible, name !== 'rkm_bipod_open', `${file}: ${name} visível por omissão`);
      const prim = g.json.meshes[n.mesh].primitives[0], a = g.json.accessors[prim.attributes.POSITION], t = n.translation ?? [0, 0, 0];
      if (n.extras.visible) { tris += g.json.accessors[prim.indices].count / 3; for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], a.min[k] + t[k]); max[k] = Math.max(max[k], a.max[k] + t[k]); } }
    }
    const length = max[2] - min[2];
    assert.ok(Math.abs(length - 1.11) / 1.11 < 0.02, `${file}: comprimento ${length}`);
    assert.ok(Math.abs(min[2] - manifest.sockets.muzzle[2]) < 0.005, `${file}: boca em −Z (${min[2]})`);
    assert.ok(max[0] - min[0] < 0.12 && max[1] - min[1] < 0.3, `${file}: largura/altura ${max[0] - min[0]} × ${max[1] - min[1]}`);
    assert.ok(tris <= budget && tris < prev, `${file}: ${tris} triângulos`);
    assert.equal(tris, manifest.files[file].triangles_visible, file);
    prev = tris;
    const mat = g.json.materials[0];
    assert.ok(mat.pbrMetallicRoughness.baseColorTexture, `${file}: textura de cor`);
    assert.equal(Boolean(mat.normalTexture), lod === 'lod0', `${file}: normal só no LOD0`);
    for (const k of ['muzzle', 'grip_r', 'grip_l', 'cheek', 'mag_well', 'charging_handle', 'bipod_mount']) assert.ok(g.node('rkm_wz28').extras.sockets[k], `${file}: socket ${k}`);
  }
  // Medidas estimadas identificadas e proveniência das medidas documentadas.
  assert.ok(manifest.measures.some(m => m.estimated) && manifest.measures.find(m => m.id === 'length_total').source === 'T31');
});

test('M01 rkm wz.28: clips bind to the soldier skeleton; burst fires 3 rounds; rifle clip hidden', () => {
  const soldier = glb('assets/models/provisional/m01/characters/m01_soldier_pl_lod0.glb'), anim = glb(DIR + 'm01_rkm_wz28_animations.glb');
  const bones = new Set(soldier.json.skins[0].joints.map(j => soldier.json.nodes[j].name));
  const want = { rkm_carry: 4, rkm_aim: 2, rkm_fire_burst: 0.8 };
  assert.deepEqual(anim.json.animations.map(a => a.name), Object.keys(want));
  for (const a of anim.json.animations) {
    const dur = Math.max(...a.samplers.map(s => anim.json.accessors[s.input].max[0]));
    assert.ok(Math.abs(dur - want[a.name]) < 1e-3, `${a.name}: ${dur}`);
    for (const c of a.channels) assert.ok(bones.has(anim.json.nodes[c.target.node].name), `${a.name}: osso ${anim.json.nodes[c.target.node].name}`);
    const clip = a.channels.find(c => anim.json.nodes[c.target.node].name === 'weapon_clip' && c.target.path === 'scale');
    assert.ok(anim.floats(a.samplers[clip.sampler].output).every(v => v === 0), `${a.name}: clipe de 5 escondido`);
    assert.equal(a.extras.weapon, 'rkm_wz28');
  }
  const burst = anim.json.animations.find(a => a.name === 'rkm_fire_burst');
  assert.equal(burst.extras.events.fire.length, burst.extras.rounds);
  assert.equal(burst.extras.rounds, 3);   // src/game/m01-simulation.js gasta 3 cartuchos por rajada de Kowal
});
