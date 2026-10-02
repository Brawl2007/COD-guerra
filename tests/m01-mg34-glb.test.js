import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// MG 34 de M01 gerada por tools/assets/m01-mg34 (node build.mjs): escala, peças, LODs, texturas e ligação dos clips mg34_*.
const DIR = 'assets/models/provisional/m01/weapons/mg34/';
const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url));
const manifest = JSON.parse(read(`${DIR}manifest.json`));
function glb(path) {
  const buf = read(path), len = buf.readUInt32LE(12);
  assert.equal(buf.readUInt32LE(0), 0x46546c67); assert.equal(buf.readUInt32LE(8), buf.length);
  const json = JSON.parse(buf.subarray(20, 20 + len).toString('utf8')), bin = buf.subarray(28 + len);
  const floats = i => { const a = json.accessors[i], v = json.bufferViews[a.bufferView], n = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type], st = v.byteStride ?? n * 4;
    return Array.from({ length: a.count * n }, (_, k) => bin.readFloatLE((v.byteOffset ?? 0) + (a.byteOffset ?? 0) + Math.floor(k / n) * st + (k % n) * 4)); };
  return { json, floats, node: name => json.nodes.find(n => n.name === name) };
}
const PARTS = ['mg34_body', 'mg34_feed_cover', 'mg34_cocking_handle', 'mg34_drum', 'mg34_belt', 'mg34_bipod_folded', 'mg34_bipod_open'];
const MOVING = ['mg34_feed_cover', 'mg34_cocking_handle', 'mg34_drum', 'mg34_belt'];
const LODS = { lod0: 4000, lod1: 1600, lod2: 500 };

test('M01 MG 34: metros, cano para −Z, 1,219 m ±2 %, peças móveis com pivô e três LODs no orçamento', () => {
  let prev = Infinity;
  for (const [lod, budget] of Object.entries(LODS)) {
    const file = `m01_mg34_${lod}.glb`, g = glb(DIR + file), min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    assert.equal(g.json.extras.units, 'meters', file);
    let tris = 0;
    for (const name of PARTS) {
      const n = g.node(name); assert.ok(n?.mesh !== undefined, `${file}: ${name}`);
      assert.equal(n.extras.visible, name !== 'mg34_bipod_open', `${file}: ${name} visível por omissão`);
      assert.deepEqual(n.translation ?? [0, 0, 0], manifest.parts.find(p => p.node === name).pivot, `${file}: pivô de ${name}`);
      const prim = g.json.meshes[n.mesh].primitives[0], a = g.json.accessors[prim.attributes.POSITION], t = n.translation ?? [0, 0, 0];
      if (n.extras.visible) { tris += g.json.accessors[prim.indices].count / 3; for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], a.min[k] + t[k]); max[k] = Math.max(max[k], a.max[k] + t[k]); } }
    }
    const length = max[2] - min[2];
    assert.ok(Math.abs(length - 1.219) / 1.219 < 0.02, `${file}: comprimento ${length}`);
    assert.ok(Math.abs(min[2] - manifest.sockets.muzzle[2]) < 0.005, `${file}: boca em −Z (${min[2]})`);
    assert.ok(max[0] - min[0] < 0.25 && max[1] - min[1] < 0.3, `${file}: largura/altura ${max[0] - min[0]} × ${max[1] - min[1]}`);
    assert.ok(min[0] < -0.15 && max[0] < 0.08, `${file}: tambor à esquerda (−X), alavanca à direita`);
    assert.ok(tris <= budget && tris < prev, `${file}: ${tris} triângulos`);
    assert.equal(tris, manifest.files[file].triangles_visible, file);
    assert.equal(fs.statSync(new URL(`../${DIR}${file}`, import.meta.url)).size, manifest.files[file].bytes, `${file}: bytes no manifesto`);
    prev = tris;
    assert.equal(g.json.materials.length, 1, `${file}: um material`);
    const mat = g.json.materials[0];
    assert.ok(mat.pbrMetallicRoughness.baseColorTexture, `${file}: textura de cor`);
    assert.equal(Boolean(mat.normalTexture), lod === 'lod0', `${file}: normal só no LOD0`);
    for (const k of ['muzzle', 'grip_r', 'grip_l', 'cheek', 'charging_handle', 'feed_cover_hinge', 'feed_tray', 'drum_center', 'bipod_mount', 'bipod_feet']) assert.ok(g.node('mg34').extras.sockets[k], `${file}: socket ${k}`);
  }
  // Medidas: comprimento e cano das fontes; estimativas marcadas; não é MG 42.
  assert.equal(manifest.measures.find(m => m.id === 'length_total').source, 'T33');
  assert.equal(manifest.measures.find(m => m.id === 'barrel').value_m, 0.627);
  assert.ok(manifest.measures.filter(m => m.estimated).length >= 5);
  assert.match(manifest.variant, /Não é a MG 42/);
  for (const k of ['scale', 'materials', 'textures', 'sources', 'author', 'license']) assert.ok(manifest[k], `manifesto: ${k}`);
});

test('M01 MG 34: clips mg34_* ligam-se ao rig do soldado alemão e aos nós da arma; rajada de 7 a 800/min; recarga do tambor', () => {
  const soldier = glb('assets/models/provisional/m01/characters/m01_soldier_de_lod0.glb'), anim = glb(DIR + 'm01_mg34_animations.glb'), weapon = glb(DIR + 'm01_mg34_lod0.glb');
  const targets = new Set([...soldier.json.skins[0].joints.map(j => soldier.json.nodes[j].name), ...MOVING]);
  for (const n of MOVING) assert.ok(weapon.node(n), `nó ${n} na arma`);
  const want = { mg34_aim: 2, mg34_fire_burst: 1.02, mg34_reload: 4.4 };
  assert.deepEqual(anim.json.animations.map(a => a.name), Object.keys(want));
  // Não substitui clips existentes: nenhum nome repete os do GLB de animações dos soldados nem os da rkm.
  const existing = ['characters/m01_soldier_animations.glb', 'weapons/rkm_wz28/m01_rkm_wz28_animations.glb'].flatMap(f => glb(`assets/models/provisional/m01/${f}`).json.animations.map(a => a.name));
  for (const name of Object.keys(want)) assert.ok(!existing.includes(name), `${name} já existe`);
  for (const a of anim.json.animations) {
    const dur = Math.max(...a.samplers.map(s => anim.json.accessors[s.input].max[0]));
    assert.ok(Math.abs(dur - want[a.name]) < 1e-3, `${a.name}: ${dur}`);
    for (const c of a.channels) assert.ok(targets.has(anim.json.nodes[c.target.node].name), `${a.name}: alvo ${anim.json.nodes[c.target.node].name}`);
    const clip = a.channels.find(c => anim.json.nodes[c.target.node].name === 'weapon_clip' && c.target.path === 'scale');
    assert.ok(anim.floats(a.samplers[clip.sampler].output).every(v => v === 0), `${a.name}: clipe da Kar98k escondido`);
    assert.equal(a.extras.weapon, 'mg34');
  }
  const by = Object.fromEntries(anim.json.animations.map(a => [a.name, a]));
  const track = (a, node, path) => { const c = a.channels.find(c => anim.json.nodes[c.target.node].name === node && c.target.path === path); return { t: anim.floats(a.samplers[c.sampler].input), v: anim.floats(a.samplers[c.sampler].output) }; };
  assert.equal(by.mg34_fire_burst.extras.rounds, 7);
  assert.deepEqual(by.mg34_fire_burst.extras.events.fire, [0, 0.075, 0.15, 0.225, 0.3, 0.375, 0.45]);   // intervalo de 0,075 s de src/game/m01-simulation.js
  // Recarga: a tampa abre (rotação em X) e fecha; o tambor desaparece e volta ao pivô; a alavanca vai atrás 0,12 m.
  const R = by.mg34_reload, ev = R.extras.events, at = (tr, time, n) => { const i = tr.t.findIndex(x => x >= time - 1e-4); return tr.v.slice(i * n, i * n + n); };
  const cover = track(R, 'mg34_feed_cover', 'rotation'), angle = qq => 2 * Math.asin(Math.abs(qq[0])) * 180 / Math.PI;
  assert.ok(Math.abs(angle(at(cover, ev.cover_open, 4)) - 80) < 1 && at(cover, ev.cover_open, 4)[0] < 0, 'tampa aberta 80° (traseira para cima)');
  assert.ok(angle(at(cover, 4.4, 4)) < 0.01, 'tampa fechada no fim');
  const drumS = track(R, 'mg34_drum', 'scale'), drumT = track(R, 'mg34_drum', 'translation'), pivot = manifest.parts.find(p => p.node === 'mg34_drum').pivot;
  assert.equal(at(drumS, ev.drum_drop + 0.04, 3)[0], 0, 'tambor vazio escondido depois de cair');
  assert.equal(at(drumS, ev.drum_on, 3)[0], 1);
  at(drumT, 4.4, 3).forEach((x, k) => assert.ok(Math.abs(x - pivot[k]) < 1e-5, 'tambor novo engatado no pivô'));
  const handle = track(R, 'mg34_cocking_handle', 'translation'), h0 = manifest.parts.find(p => p.node === 'mg34_cocking_handle').pivot;
  assert.ok(Math.abs(at(handle, ev.handle_back, 3)[2] - h0[2] - 0.12) < 1e-3, 'alavanca puxada 0,12 m');
  assert.ok(Math.abs(at(handle, 4.4, 3)[2] - h0[2]) < 1e-5, 'alavanca de volta à frente');
});
