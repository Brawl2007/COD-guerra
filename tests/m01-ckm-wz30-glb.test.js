import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// ckm wz.30 da casamata de M01 gerada por tools/assets/m01-ckm-wz30 (node build.mjs): escala, peças com pivô, LODs,
// clips da arma e ligação dos clips ckm_wz30_* da guarnição ao rig polaco actual.
const DIR = 'assets/models/provisional/m01/weapons/ckm_wz30/';
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
const PARTS = ['ckm_tripod', 'ckm_traverse', 'ckm_elevate', 'ckm_cocking_handle', 'ckm_feed_belt', 'ckm_belt_spent', 'ckm_belt_free', 'ckm_ammo_box', 'ckm_ammo_box_lid'];
const MOVING = ['ckm_traverse', 'ckm_elevate', 'ckm_cocking_handle', 'ckm_feed_belt', 'ckm_belt_spent', 'ckm_belt_free'];
const LODS = { lod0: 6000, lod1: 2800, lod2: 1000 };
const KINDS = { idle: 4, aim: 3, fire_burst: 1.3, feed: 3.2, abandon: 3 };
const finite = xs => xs.every(Number.isFinite);
const near = (a, b, eps = 1e-4) => a.every((x, k) => Math.abs(x - b[k]) < eps);

test('M01 ckm wz.30: metros, +Y, cano para −Z, 1,2 m ±2 %, hierarquia de pivôs e três LODs no orçamento', () => {
  let prev = Infinity;
  for (const [lod, budget] of Object.entries(LODS)) {
    const file = `m01_ckm_wz30_${lod}.glb`, g = glb(DIR + file);
    assert.equal(g.json.extras.units, 'meters', file);
    let tris = 0;
    for (const name of PARTS) {
      const n = g.node(name), part = manifest.parts.find(p => p.node === name);
      assert.ok(n?.mesh !== undefined, `${file}: ${name}`);
      for (const k of ['translation', 'rotation', 'scale']) assert.ok(finite(n[k] ?? [0]), `${file}: ${name}.${k} finito`);
      assert.ok(near(n.translation ?? [0, 0, 0], part.translation_local), `${file}: pivô de ${name}`);
      const parent = g.json.nodes.find(p => p.children?.includes(g.json.nodes.indexOf(n)));
      assert.equal(parent.name, part.parent, `${file}: pai de ${name}`);
      const prim = g.json.meshes[n.mesh].primitives[0];
      assert.ok(finite(g.json.accessors[prim.attributes.POSITION].min) && finite(g.json.accessors[prim.attributes.POSITION].max));
      tris += g.json.accessors[prim.indices].count / 3;
    }
    // Arma (nó de elevação): comprimento e boca do tapa-chamas em −Z no referencial dos munhões.
    const el = g.json.accessors[g.json.meshes[g.node('ckm_elevate').mesh].primitives[0].attributes.POSITION];
    const length = el.max[2] - el.min[2];
    assert.ok(Math.abs(length - 1.2) / 1.2 < 0.02, `${file}: comprimento ${length}`);
    assert.ok(Math.abs(el.min[2] - manifest.sockets.gun.muzzle_flash[2]) < 0.005, `${file}: boca em −Z (${el.min[2]})`);
    assert.ok(el.max[0] - el.min[0] < 0.2, `${file}: largura da arma`);
    // Tripé: pés no chão (+Y para cima; só os espigões entram no solo) e eixo do cano a ~0,64 m.
    const tri = g.json.accessors[g.json.meshes[g.node('ckm_tripod').mesh].primitives[0].attributes.POSITION];
    assert.ok(tri.min[1] > -0.04 && tri.min[1] < 0.01 && tri.max[1] < 0.6, `${file}: tripé ${tri.min[1]}..${tri.max[1]}`);
    assert.ok(Math.abs(manifest.sockets.scene.gun_muzzle[1] - 0.64) < 0.01);
    // Caixa de munição à esquerda (−X), com a tampa aberta 110° em X.
    assert.ok(g.node('ckm_ammo_box').translation[0] < -0.2, `${file}: caixa à esquerda`);
    const lid = g.node('ckm_ammo_box_lid').rotation;
    assert.ok(Math.abs(2 * Math.asin(lid[0]) * 180 / Math.PI - 110) < 0.5, `${file}: tampa a 110°`);
    assert.ok(tris <= budget && tris < prev, `${file}: ${tris} triângulos`);
    assert.equal(tris, manifest.files[file].triangles, file);
    assert.equal(g.json.meshes.length, 9, `${file}: 9 malhas`);
    assert.equal(fs.statSync(new URL(`../${DIR}${file}`, import.meta.url)).size, manifest.files[file].bytes, `${file}: bytes no manifesto`);
    prev = tris;
    assert.equal(g.json.materials.length, 1, `${file}: um material`);
    assert.ok(g.json.materials[0].pbrMetallicRoughness.baseColorTexture, `${file}: textura de cor`);
    assert.equal(Boolean(g.json.materials[0].normalTexture), lod === 'lod0', `${file}: normal só no LOD0`);
    const root = g.node('ckm_wz30').extras;
    for (const k of ['muzzle', 'muzzle_flash', 'trunnion', 'grip_r', 'grip_l', 'eye', 'trigger', 'charging_handle', 'feed_entry', 'feed_exit', 'rear_sight', 'front_sight']) assert.ok(finite(root.sockets_gun[k]), `${file}: socket ${k}`);
    for (const k of ['pintle', 'box_mouth', 'elevating_handwheel']) assert.ok(finite(root.sockets_scene[k]), `${file}: socket de cena ${k}`);
    assert.equal(root.sockets_scene.tripod_feet.length, 3);
  }
  // Medidas: comprimento, cano, cinta e caixa de T34; estimativas marcadas.
  for (const id of ['length_total', 'barrel', 'belt', 'ammo_box']) assert.equal(manifest.measures.find(m => m.id === id).estimated, false, id);
  assert.equal(manifest.measures.find(m => m.id === 'barrel').value_m, 0.72);
  assert.deepEqual(manifest.measures.find(m => m.id === 'ammo_box').value_m, [0.355, 0.175, 0.085]);
  assert.ok(manifest.measures.filter(m => m.estimated).length >= 5);
  for (const k of ['scale', 'frame', 'variant', 'materials', 'textures', 'sources', 'author', 'license', 'crew', 'hands']) assert.ok(manifest[k], `manifesto: ${k}`);
});

test('M01 ckm wz.30: clips da arma animam os nós móveis; rajada de 8 a 600/min; alimentação puxa a ponta e arma duas vezes', () => {
  const g = glb(DIR + 'm01_ckm_wz30_lod0.glb'), want = Object.fromEntries(Object.entries(KINDS).map(([k, d]) => [`ckm_wz30_gun_${k}`, d]));
  assert.deepEqual(g.json.animations.map(a => a.name), Object.keys(want));
  for (const a of g.json.animations) {
    const dur = Math.max(...a.samplers.map(s => g.json.accessors[s.input].max[0]));
    assert.ok(Math.abs(dur - want[a.name]) < 1e-3, `${a.name}: ${dur}`);
    for (const c of a.channels) assert.ok(MOVING.includes(g.json.nodes[c.target.node].name), `${a.name}: alvo ${g.json.nodes[c.target.node].name}`);
    for (const s of a.samplers) assert.ok(finite(g.floats(s.output)), `${a.name}: valores finitos`);
  }
  const by = Object.fromEntries(g.json.animations.map(a => [a.name, a]));
  const track = (a, node, path) => { const c = a.channels.find(c => g.json.nodes[c.target.node].name === node && c.target.path === path); return { t: g.floats(a.samplers[c.sampler].input), v: g.floats(a.samplers[c.sampler].output) }; };
  const at = (tr, time, n) => { const i = tr.t.findIndex(x => x >= time - 1e-4); return tr.v.slice(i * n, i * n + n); };
  const pivot = name => manifest.parts.find(p => p.node === name).translation_local;
  assert.deepEqual(by.ckm_wz30_gun_fire_burst.extras.events.fire, [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]);
  // Rajada: a alavanca recua com o ferrolho (até ~0,055 m) e a fita anda 8 passos de 16 mm para a direita.
  const hb = track(by.ckm_wz30_gun_fire_burst, 'ckm_cocking_handle', 'translation'), h0 = pivot('ckm_cocking_handle');
  const back = Math.max(...hb.v.filter((_, k) => k % 3 === 2)) - h0[2];
  assert.ok(back > 0.04 && back < 0.06, `recuo da alavanca ${back}`);
  const fb = track(by.ckm_wz30_gun_fire_burst, 'ckm_feed_belt', 'translation'), f0 = pivot('ckm_feed_belt');
  assert.ok(Math.abs(at(fb, 1.3, 3)[0] - f0[0]) < 1e-4, 'fita volta ao pivô depois do 8.º tiro (serra)');
  // Alimentação: fita fora à esquerda no início, saída vazia escondida até a ponta ser puxada, alavanca 0,10 m atrás.
  const F = by.ckm_wz30_gun_feed, ev = F.extras.events;
  assert.ok(at(track(F, 'ckm_feed_belt', 'translation'), 0, 3)[0] < f0[0] - 0.1, 'ponta da fita fora da caixa da culatra');
  const spent = track(F, 'ckm_belt_spent', 'scale');
  assert.equal(at(spent, 0.5, 3)[0], 0); assert.equal(at(spent, 3.2, 3)[0], 1);
  const hf = track(F, 'ckm_cocking_handle', 'translation');
  for (const t of ev.handle_back) assert.ok(Math.abs(at(hf, t, 3)[2] - h0[2] - 0.1) < 0.005, `alavanca atrás em ${t}`);
  assert.ok(near(at(hf, 3.2, 3), h0, 1e-4), 'alavanca à frente no fim');
});

test('M01 ckm wz.30: clips ckm_wz30_* do atirador e do municiador ligam-se ao rig polaco, não repetem nomes e mostram uma só arma', () => {
  const soldier = glb('assets/models/provisional/m01/characters/m01_soldier_pl_lod0.glb'), anim = glb(DIR + 'm01_ckm_wz30_animations.glb');
  const bones = new Set(soldier.json.skins[0].joints.map(j => soldier.json.nodes[j].name));
  const names = Object.keys(KINDS).flatMap(k => [`ckm_wz30_gunner_${k}`, `ckm_wz30_loader_${k}`]);
  assert.deepEqual(anim.json.animations.map(a => a.name), names);
  const existing = ['characters/m01_soldier_animations.glb', 'weapons/rkm_wz28/m01_rkm_wz28_animations.glb'].flatMap(f => glb(`assets/models/provisional/m01/${f}`).json.animations.map(a => a.name));
  for (const name of names) assert.ok(!existing.includes(name), `${name} já existe`);
  for (const a of anim.json.animations) {
    const [, role, kind] = a.name.match(/^ckm_wz30_(gunner|loader)_(.+)$/);
    const dur = Math.max(...a.samplers.map(s => anim.json.accessors[s.input].max[0]));
    assert.ok(Math.abs(dur - KINDS[kind]) < 1e-3, `${a.name}: ${dur}`);
    for (const c of a.channels) assert.ok(bones.has(anim.json.nodes[c.target.node].name), `${a.name}: osso ${anim.json.nodes[c.target.node].name}`);
    for (const s of a.samplers) assert.ok(finite(anim.floats(s.output)), `${a.name}: valores finitos`);
    // Uma só arma: a espingarda e o clipe do soldado ficam com escala 0 em todo o clip.
    for (const bone of ['weapon', 'weapon_clip']) {
      const c = a.channels.find(c => anim.json.nodes[c.target.node].name === bone && c.target.path === 'scale');
      assert.ok(c && anim.floats(a.samplers[c.sampler].output).every(v => v === 0), `${a.name}: ${bone} escondido`);
    }
    assert.equal(a.extras.weapon, 'ckm_wz30'); assert.equal(a.extras.role, role);
    assert.equal(a.extras.sync, `ckm_wz30_gun_${kind}`);
    assert.ok(near([...a.extras.crew.pos, a.extras.crew.yaw], [...manifest.crew[role].pos, manifest.crew[role].yaw]), `${a.name}: lugar da guarnição`);
  }
  // O atirador fica atrás da arma (+Z) com o olho à altura da linha de mira; o municiador à esquerda, do lado da cinta.
  assert.ok(manifest.crew.gunner.pos[2] > 0.5 && Math.abs(manifest.crew.gunner.pos[0]) < 0.1);
  assert.ok(manifest.crew.loader.pos[0] < -0.3);
});
