import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Soldados M01 de 1939 gerados por tools/assets/m01-soldiers (node build.mjs): escala, esqueleto, LODs, texturas e clips.
const DIR = 'assets/models/provisional/m01/characters/';
const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url));
const manifest = JSON.parse(read(`${DIR}manifest.json`));
function glb(file) {
  const buf = read(DIR + file);
  assert.equal(buf.readUInt32LE(0), 0x46546c67); assert.equal(buf.readUInt32LE(4), 2); assert.equal(buf.readUInt32LE(8), buf.length);
  const len = buf.readUInt32LE(12), json = JSON.parse(buf.subarray(20, 20 + len).toString('utf8')), bin = buf.subarray(28 + len);
  const floats = accessor => {
    const a = json.accessors[accessor], v = json.bufferViews[a.bufferView], n = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type];
    assert.equal(a.componentType, 5126);
    return Array.from({ length: a.count * n }, (_, i) => bin.readFloatLE((v.byteOffset ?? 0) + (a.byteOffset ?? 0) + i * 4));
  };
  const nodeOf = name => json.nodes.find(n => n.name === name);
  const meshNode = name => json.nodes.find(n => n.mesh !== undefined && n.name === name);
  const tris = node => json.meshes[node.mesh].primitives.reduce((s, p) => s + json.accessors[p.indices].count / 3, 0);
  const bounds = node => { const a = json.accessors[json.meshes[node.mesh].primitives[0].attributes.POSITION]; return { min: a.min, max: a.max }; };
  return { json, bytes: buf.length, floats, nodeOf, meshNode, tris, bounds };
}
const BONES = ['root', 'hips', 'spine_01', 'spine_02', 'spine_03', 'neck', 'head', 'jaw', 'eye_l', 'eye_r', ...['l', 'r'].flatMap(s => [
  `clavicle_${s}`, `upperarm_${s}`, `lowerarm_${s}`, `hand_${s}`, `thigh_${s}`, `calf_${s}`, `foot_${s}`, `ball_${s}`,
  ...['thumb', 'index', 'middle', 'ring', 'pinky'].flatMap(f => [1, 2, 3].map(k => `${f}_0${k}_${s}`))]), 'weapon', 'weapon_bolt', 'weapon_clip', 'carry_socket'];
const CHARS = ['pl', 'de'].flatMap(nat => ['lod0', 'lod1', 'lod2'].map(lod => ({ nat, lod, file: `m01_soldier_${nat}_${lod}.glb` })));
const BUDGET = { lod0: 17000, lod1: 7000, lod2: 2300 };
const CLIPS = { standing_idle: 4, aim: 2, fire_bolt: 1.17, reload_clip: 3.4, walk: 1, run: 0.68, crouched_idle: 3, pinned: 2.4, sapper_work: 3, sapper_work_pinned: 2,
  carry_wounded: 1.25, carried: 2.5, wounded: 2, fallen: 1.4, seated: 4 };

test('M01 soldiers: metres, −Z facing, 1.65–1.85 m and the full game skeleton in every LOD', () => {
  for (const c of CHARS) {
    const g = glb(c.file), b0 = g.bounds(g.meshNode('body')), hd = g.bounds(g.meshNode(c.nat === 'pl' ? 'head_wrona' : 'head_de_a'));
    const body = { min: b0.min.map((v, i) => Math.min(v, hd.min[i])), max: b0.max.map((v, i) => Math.max(v, hd.max[i])) };   // corpo + cabeça (sem capacete)
    assert.equal(g.json.extras.units, 'meters', c.file);
    const height = body.max[1] - body.min[1];
    assert.ok(height > 1.65 && height < 1.85, `${c.file}: altura ${height}`);   // botas e cabelo incluídos; corpo 1,745 m no manifesto
    assert.ok(Math.abs(body.min[1]) < 0.01, `${c.file}: pés no chão`);
    for (const b of BONES) assert.ok(g.nodeOf(b), `${c.file}: osso ${b}`);
    // Frente em −Z: a ponta da bota está à frente (z menor) do calcanhar/anca.
    const ball = g.nodeOf('ball_l').translation;
    assert.ok(ball[2] < 0, `${c.file}: dedos para −Z`);
    const skinJoints = g.json.skins.map(s => s.joints.length);
    if (c.lod === 'lod2') assert.ok(Math.max(...skinJoints) < BONES.length - 30, `${c.file}: esqueleto leve`);
    else assert.equal(Math.max(...skinJoints), BONES.length);
  }
});

test('M01 soldiers: visible triangle budget, textures per LOD and togglable variants', () => {
  for (const c of CHARS) {
    const g = glb(c.file), visible = g.json.nodes.filter(n => n.mesh !== undefined && n.extras?.visible);
    const triangles = visible.reduce((s, n) => s + g.tris(n), 0);
    assert.ok(triangles <= BUDGET[c.lod], `${c.file}: ${triangles} triângulos visíveis`);
    assert.ok(visible.length <= 6, `${c.file}: ${visible.length} draw calls`);
    assert.deepEqual(visible.map(n => n.name).sort(), ['body', 'clip', 'gear', c.nat === 'pl' ? 'helmet_wz31' : 'helmet_m35', 'rifle', `head_${c.nat === 'pl' ? 'wrona' : 'de_a'}`].sort());
    assert.equal(g.json.materials.length, 1, 'um único material com atlas');
    assert.equal(g.json.images.length, { lod0: 3, lod1: 2, lod2: 1 }[c.lod], `${c.file}: imagens`);
    const heads = g.json.nodes.filter(n => n.name.startsWith('head_'));
    assert.equal(heads.length, c.nat === 'pl' ? 8 : 3);
    for (const h of heads) assert.ok(h.extras.variant && h.extras.label);
    if (c.nat === 'pl') for (const m of ['cap_wz37', 'helmet_cover_wz31', 'sapper', 'nco', 'rank_kapral', 'rank_sierzant', 'rank_st_strzelec']) assert.equal(g.meshNode(m)?.extras.visible, false, `${c.file}: ${m} escondido por omissão`);
    const m = manifest.files[c.file];
    assert.equal(m.bytes, g.bytes); assert.equal(m.triangles_visible, triangles);
  }
});

test('M01 soldiers: rifles keep documented length (wz.29 1.10 m, Kar98k ~1.11 m) with a separate bolt bone', () => {
  for (const [nat, len] of [['pl', 1.1], ['de', 1.11]]) {
    const g = glb(`m01_soldier_${nat}_lod0.glb`), r = g.bounds(g.meshNode('rifle'));
    const z = r.max[2] - r.min[2];
    assert.ok(Math.abs(z - len) / len < 0.03, `${nat}: comprimento ${z}`);
    const root = g.nodeOf(`m01_soldier_${nat}`).extras;
    assert.equal(root.rifle, nat === 'pl' ? 'wz29' : 'kar98k'); assert.equal(root.nation, nat);
    for (const k of ['muzzle', 'bolt_handle', 'clip_guide', 'grip_r', 'grip_l']) assert.equal(root.sockets[k].length, 3, `socket ${k}`);
    assert.equal(g.nodeOf('weapon_bolt').translation.length, 3);
  }
});

test('M01 soldier animations bind by bone name and keep kb_wz29 timings', () => {
  const a = glb('m01_soldier_animations.glb'), names = a.json.animations.map(x => x.name);
  assert.deepEqual(names.sort(), Object.keys(CLIPS).sort());
  for (const anim of a.json.animations) {
    const end = Math.max(...anim.samplers.map(s => a.json.accessors[s.input].max[0]));
    assert.ok(Math.abs(end - CLIPS[anim.name]) < 0.02, `${anim.name}: ${end}`);
    for (const ch of anim.channels) assert.ok(BONES.includes(a.json.nodes[ch.target.node].name));
    const clipScale = anim.channels.find(ch => a.json.nodes[ch.target.node].name === 'weapon_clip' && ch.target.path === 'scale');
    const shown = a.floats(anim.samplers[clipScale.sampler].output).some(v => v > 0.5);
    assert.equal(shown, anim.name === 'reload_clip', `${anim.name}: clipe visível só na recarga`);
    if (anim.name === 'fire_bolt' || anim.name === 'reload_clip') {
      const bolt = anim.channels.find(ch => a.json.nodes[ch.target.node].name === 'weapon_bolt' && ch.target.path === 'translation');
      const z = a.floats(anim.samplers[bolt.sampler].output).filter((_, i) => i % 3 === 2);
      assert.ok(Math.max(...z) - Math.min(...z) > 0.08, `${anim.name}: o ferrolho recua`);
    }
    if (['walk', 'run', 'carry_wounded'].includes(anim.name)) assert.ok(anim.extras.speed_mps > 0.3 && anim.extras.loop);
  }
  assert.equal(a.json.animations.find(x => x.name === 'carried').extras.attach, 'carry_socket');
  const carriedWeapon = a.json.animations.find(x => x.name === 'carried').channels.find(ch => a.json.nodes[ch.target.node].name === 'weapon' && ch.target.path === 'scale');
  assert.ok(a.floats(a.json.animations.find(x => x.name === 'carried').samplers[carriedWeapon.sampler].output).every(v => v === 0), 'arma do ferido escondida');
});
