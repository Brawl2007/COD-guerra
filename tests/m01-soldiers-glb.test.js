import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { parseGLB, sampleClip, auditSamples, signature, junction } from '../tools/assets/m01-soldiers/motion/library/audit.mjs';
import { LIMITS, generateClipLibrary } from '../tools/assets/m01-soldiers/build-clip-library-v2.mjs';
import { loadGLB } from '../tools/assets/m01-soldiers/motion/rig.mjs';

// Soldados M01 de 1939 gerados por tools/assets/m01-soldiers (node build.mjs): escala, esqueleto, LODs, texturas e clips.
const DIR = 'assets/models/provisional/m01/characters/';
const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url));
const manifest = JSON.parse(read(`${DIR}manifest.json`));
const glb = file => glbOf(read(DIR + file));
function glbOf(buf) {
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
  // Raw float32 bytes of an accessor (for byte-level clip hashes).
  const raw = accessor => { const a = json.accessors[accessor], v = json.bufferViews[a.bufferView], n = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type], start = (v.byteOffset ?? 0) + (a.byteOffset ?? 0); return bin.subarray(start, start + a.count * n * 4); };
  return { json, bytes: buf.length, floats, nodeOf, meshNode, tris, bounds, raw };
}
const BONES = ['root', 'hips', 'spine_01', 'spine_02', 'spine_03', 'neck', 'head', 'jaw', 'eye_l', 'eye_r', ...['l', 'r'].flatMap(s => [
  `clavicle_${s}`, `upperarm_${s}`, `lowerarm_${s}`, `hand_${s}`, `thigh_${s}`, `calf_${s}`, `foot_${s}`, `ball_${s}`,
  ...['thumb', 'index', 'middle', 'ring', 'pinky'].flatMap(f => [1, 2, 3].map(k => `${f}_0${k}_${s}`))]), 'weapon', 'weapon_bolt', 'weapon_mag', 'weapon_clip', 'carry_socket'];
const CHARS = ['pl', 'de'].flatMap(nat => ['lod0', 'lod1', 'lod2'].map(lod => ({ nat, lod, file: `m01_soldier_${nat}_${lod}.glb` })));
const BUDGET = { lod0: 17000, lod1: 7000, lod2: 2300 };
const CLIPS = { standing_idle: 4, aim: 2, fire_bolt: 1.17, reload_clip: 3.4, walk: 1, run: 0.68, crouched_idle: 3, pinned: 2.4, sapper_work: 3, sapper_work_pinned: 2,
  carry_wounded: 1.25, carried: 2.5, wounded: 2, fallen: 1.4, seated: 4,
  rkm_standing_idle: 4, rkm_walk: 1.05, rkm_run: 0.72, rkm_aim: 2, rkm_fire_burst: 0.8, rkm_crouched_idle: 3, rkm_prone: 3, rkm_prone_fire: 0.8, rkm_reload: 3.4, rkm_clean: 6 };
const PL_EXTRA = ['rifle_wz98a', 'rkm_wz28', 'rkm_bipod_open', 'rkm_bipod_folded', 'rkm_pouch', 'rag'];

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
    if (c.nat === 'pl') for (const m of ['cap_wz37', 'helmet_cover_wz31', 'sapper', 'nco', 'rank_kapral', 'rank_sierzant', 'rank_st_strzelec', ...PL_EXTRA]) assert.equal(g.meshNode(m)?.extras.visible, false, `${c.file}: ${m} escondido por omissão`);
    if (c.nat === 'de') for (const m of PL_EXTRA) assert.equal(g.meshNode(m), undefined);
    // Kowal (rkm, bípode, bolsa) e Bąk (wz.98a) também cabem no orçamento de triângulos do LOD.
    if (c.nat === 'pl') for (const swap of [['rkm_wz28', 'rkm_bipod_open', 'rkm_pouch'], ['rifle_wz98a']]) {
      const names = ['body', 'gear', 'helmet_wz31', 'head_wrona', ...swap, ...(swap.length === 1 ? ['clip'] : [])];
      const tris = names.reduce((s, n) => s + g.tris(g.meshNode(n)), 0);
      assert.ok(tris <= BUDGET[c.lod], `${c.file}: ${swap[0]} ${tris} triângulos`);
    }
    const m = manifest.files[c.file];
    assert.equal(m.bytes, g.bytes); assert.equal(m.triangles_visible, triangles);
  }
});

test('M01 soldiers: weapons keep documented length (wz.29 1.10, Kar98k ~1.11, wz.98a 1.25, rkm wz.28 1.11 m) with bolt and magazine bones', () => {
  for (const [nat, mesh, len] of [['pl', 'rifle', 1.1], ['de', 'rifle', 1.11], ['pl', 'rifle_wz98a', 1.25], ['pl', 'rkm_wz28', 1.11]]) {
    const g = glb(`m01_soldier_${nat}_lod0.glb`), r = g.bounds(g.meshNode(mesh));
    const z = r.max[2] - r.min[2];
    assert.ok(Math.abs(z - len) / len < 0.03, `${mesh}: comprimento ${z}`);
  }
  const pl = glb('m01_soldier_pl_lod0.glb').nodeOf('m01_soldier_pl').extras.weapons;
  assert.deepEqual(Object.keys(pl).sort(), ['rkm_wz28', 'wz29', 'wz98a']);
  for (const k of ['muzzle', 'grip_r', 'mag_well', 'bolt_handle', 'bipod_feet']) assert.equal(pl.rkm_wz28[k].length, 3, `rkm ${k}`);
  for (const nat of ['pl', 'de']) {
    const g = glb(`m01_soldier_${nat}_lod0.glb`);
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
    assert.equal(shown, ['reload_clip', 'rkm_clean'].includes(anim.name), `${anim.name}: clipe (ou pano) visível só na recarga e na limpeza`);
    const track = (bone, path) => { const ch = anim.channels.find(c => a.json.nodes[c.target.node].name === bone && c.target.path === path); return a.floats(anim.samplers[ch.sampler].output); };
    if (['fire_bolt', 'reload_clip', 'rkm_fire_burst', 'rkm_prone_fire', 'rkm_reload', 'rkm_clean'].includes(anim.name)) {
      const z = track('weapon_bolt', 'translation').filter((_, i) => i % 3 === 2);
      assert.ok(Math.max(...z) - Math.min(...z) > 0.08, `${anim.name}: o ferrolho/alavanca move-se`);
    }
    const magShown = track('weapon_mag', 'scale');
    assert.equal(magShown.some(v => v < 0.5), anim.name === 'rkm_reload', `${anim.name}: carregador só some na troca`);
    if (anim.name.startsWith('rkm_')) {
      assert.equal(anim.extras.weapon, 'rkm_wz28');
      assert.ok(['open', 'folded'].includes(anim.extras.bipod));
    }
    if (anim.name.endsWith('_fire_burst') || anim.name === 'rkm_prone_fire') assert.equal(anim.extras.events.fire.length, anim.extras.rounds);
    if (['walk', 'run', 'carry_wounded'].includes(anim.name)) assert.ok(anim.extras.speed_mps > 0.3 && anim.extras.loop);
  }
  assert.equal(a.json.animations.find(x => x.name === 'carried').extras.attach, 'carry_socket');
  const carriedWeapon = a.json.animations.find(x => x.name === 'carried').channels.find(ch => a.json.nodes[ch.target.node].name === 'weapon' && ch.target.path === 'scale');
  assert.ok(a.floats(a.json.animations.find(x => x.name === 'carried').samplers[carriedWeapon.sampler].output).every(v => v === 0), 'arma do ferido escondida');
});

// ——— Clip library V2 (T08): animation-only GLB next to the untouched character files ———
const LIB_DIR = `${DIR}clip-library-v2/`, LIB_FILE = 'm01_soldier_clip_library_v2.glb';
const BASE_COMMIT = '11821bbb0e71a5e6a3447e00228754ff433d166a', BASE_ANIM_SHA = '481d6114f4481ae0f99e162a4bbfdbe8e1d74cffc2460836a2b525bf93b0202d';
// name: [duration s, loop, mask]
const LIB = {
  sprint: [0.64, true, 'full'], crouch_walk: [0.96, true, 'full'], hit_front: [0.76, false, 'additive'], near_miss_duck: [0.98, false, 'additive'],
  turn_left_90: [0.5, false, 'lower'], turn_right_90: [0.5, false, 'lower'], carry_walk: [1.1, true, 'full'],
  stand_to_crouch: [0.45, false, 'full'], crouch_to_stand: [0.45, false, 'full'], prone_enter: [1.2, false, 'full'], prone_exit: [1.2, false, 'full'],
  prone_idle: [4, true, 'full'], prone_flinch: [0.45, false, 'full'], prone_crawl: [1.4, true, 'full'],
  standing_idle_b: [4, true, 'full'], standing_idle_c: [4, true, 'full'], crouched_idle_b: [3, true, 'full'],
  fidget_look: [2, false, 'upper'], fidget_shift: [2, false, 'full'], fidget_helmet: [2.2, false, 'upper'], fidget_check_rifle: [2.4, false, 'upper'],
  hit_back: [0.76, false, 'additive'], hit_left: [0.76, false, 'additive'], hit_right: [0.76, false, 'additive'], blast_duck: [1, false, 'additive'],
  death_front: [1.6, false, 'full'], death_back: [1.5, false, 'full'], death_left: [1.5, false, 'full'], death_right: [1.5, false, 'full'], death_crumple: [1.8, false, 'full'],
  cover_low_idle: [3, true, 'full'], cover_high_idle: [3, true, 'full'], cover_low_peek_fire_l: [1.2, false, 'full'], cover_low_peek_fire_r: [1.2, false, 'full'],
  cover_high_lean_l: [1.2, false, 'full'], cover_high_lean_r: [1.2, false, 'full'], cover_return: [1.2, false, 'full'], cover_leave: [1.2, false, 'full'],
  call_out: [2, false, 'upper'], seated_b: [4, true, 'full'], seated_pass_canteen: [3.6, false, 'upper'], seated_receive_canteen: [4, false, 'upper'], seated_cup_turn: [3.4, false, 'upper'],
};
const LOCOMOTION = { sprint: 5, crouch_walk: 0.8, carry_walk: 1.6, prone_crawl: 0.3 };
const OVERLAP_WITH_MOTION_PACKAGE = ['sprint', 'crouch_walk', 'hit_front', 'near_miss_duck'];
const sha = buf => createHash('sha256').update(buf).digest('hex');
const libManifest = JSON.parse(read(`${LIB_DIR}manifest.json`));
const lib = glb(`clip-library-v2/${LIB_FILE}`);
const near = (a, b, e) => Math.abs(a - b) <= e;

// One real-mixer pass over the committed GLB, shared by the tests below (240 Hz, ankle proxy).
const measured = (async () => {
  const gltf = await parseGLB(read(LIB_DIR + LIB_FILE)), mixer = new THREE.AnimationMixer(gltf.scene), out = {};
  const base = await parseGLB(read(`${DIR}m01_soldier_animations.glb`)), baseMixer = new THREE.AnimationMixer(base.scene), refs = {};
  for (const name of ['standing_idle', 'crouched_idle', 'seated']) refs[`${name} t0`] = signature(sampleClip(base.scene, baseMixer, base.animations.find(c => c.name === name))[0]);
  for (const clip of gltf.animations) {
    const samples = sampleClip(gltf.scene, mixer, clip), x = clip.userData, still = x.audit.model.final_still_s ?? 0;
    out[clip.name] = { clip, samples, audit: auditSamples(samples, clip, { model: x.audit.model, loop: x.loop, stillS: still }) };
    refs[`${clip.name} t0`] = signature(samples[0]);
  }
  return { out, refs };
})();

test('clip library V2: manifest, roster, durations, loops and masks of every new clip; animation-only, in place', () => {
  const file = read(LIB_DIR + LIB_FILE);
  assert.equal(file.length, libManifest.bytes); assert.equal(sha(file), libManifest.sha256);
  assert.deepEqual(lib.json.animations.map(a => a.name), Object.keys(LIB));
  assert.deepEqual(libManifest.clips.map(c => c.name), Object.keys(LIB));
  for (const key of ['meshes', 'materials', 'images', 'textures', 'skins']) assert.equal(lib.json[key]?.length ?? 0, 0, key);
  assert.deepEqual(libManifest.audit.failures, []);
  for (const anim of lib.json.animations) {
    const [duration, loop, mask] = LIB[anim.name], x = anim.extras;
    const end = Math.max(...anim.samplers.map(s => lib.json.accessors[s.input].max[0]));
    assert.ok(near(end, duration, 1e-6), `${anim.name}: ${end}`); assert.equal(x.durationS, duration);
    assert.equal(x.loop, loop, anim.name); assert.equal(x.mask, mask, anim.name);
    assert.deepEqual(libManifest.clips.find(c => c.name === anim.name), { name: anim.name, ...x }, `${anim.name}: manifest entry = clip extras`);
    assert.ok(['port', 'low_ready', 'carry', 'prone', 'hands_free', 'cover', 'seated'].includes(x.family), `${anim.name}: ${x.family}`);
    assert.ok(['any', 'none'].includes(x.interrupt) && x.semantic.length > 10 && x.pose, anim.name);
    assert.ok(x.fps >= 30 && x.audit.sampleHz === 240, anim.name);
    for (const [event, t] of Object.entries(x.events)) assert.ok(t >= 0 && t <= duration, `${anim.name}.${event}`);
    // In place: no channel on the root, every channel binds to a real game bone; the rifle stays visible, the clip / rag hidden.
    for (const ch of anim.channels) { const bone = lib.json.nodes[ch.target.node].name; assert.ok(BONES.includes(bone) && bone !== 'root', `${anim.name}: ${bone}`); }
    const scale = bone => { const ch = anim.channels.find(c => lib.json.nodes[c.target.node].name === bone && c.target.path === 'scale'); assert.equal(anim.samplers[ch.sampler].interpolation, 'STEP'); return lib.floats(anim.samplers[ch.sampler].output); };
    assert.ok(scale('weapon_clip').every(v => v === 0) && scale('weapon_mag').every(v => v === 1) && scale('weapon').every(v => v === 1), `${anim.name}: weapon, magazine, clip scales`);
    for (const ch of anim.channels) { const t = lib.floats(anim.samplers[ch.sampler].input), v = lib.floats(anim.samplers[ch.sampler].output); assert.ok(t.every((x2, i) => Number.isFinite(x2) && (!i || x2 > t[i - 1])) && v.every(Number.isFinite), anim.name); }
  }
  // Names stay disjoint from every other animation package, except the four motion-package clips that are carried over unchanged.
  const others = ['m01_soldier_animations.glb', 'm01_station_animations.glb', 'motion-clips-v1/m01_soldier_motion_clips.glb', 'station-drag-transitions/m01_station_drag_transitions.glb']
    .flatMap(f => glb(f).json.animations.map(a => a.name)).concat(['weapons/mg34/m01_mg34_animations.glb', 'weapons/mg34-prone/m01_mg34_prone_animations.glb', 'weapons/rkm_wz28/m01_rkm_wz28_animations.glb', 'weapons/ckm_wz30/m01_ckm_wz30_animations.glb']
      .flatMap(f => glbOf(read(`assets/models/provisional/m01/${f}`)).json.animations.map(a => a.name)));
  assert.deepEqual(Object.keys(LIB).filter(n => others.includes(n)), OVERLAP_WITH_MOTION_PACKAGE);
});

test('the shipped clips and every preserved file are byte-identical to the base commit; per-clip hashes match the base GLB', () => {
  for (const [file, info] of Object.entries(libManifest.reused)) { const buf = read(file); assert.equal(buf.length, info.bytes, file); assert.equal(sha(buf), info.sha256, `${file} changed`); }
  assert.equal(sha(read(`${DIR}m01_soldier_animations.glb`)), BASE_ANIM_SHA);
  assert.deepEqual(Object.keys(libManifest.reused).filter(f => /m01_soldier_(pl|de)_lod\d\.glb$/.test(f)).length, 6, 'the six character LODs are listed');
  const clipHash = (g, anim) => {
    const h = createHash('sha256').update(JSON.stringify([anim.name, anim.extras]));
    for (const ch of anim.channels) { const s = anim.samplers[ch.sampler]; h.update(JSON.stringify([g.json.nodes[ch.target.node].name, ch.target.path, s.interpolation ?? 'LINEAR'])); h.update(g.raw(s.input)); h.update(g.raw(s.output)); }
    return h.digest('hex');
  };
  const now = glb('m01_soldier_animations.glb'), hashes = Object.fromEntries(now.json.animations.map(a => [a.name, clipHash(now, a)]));
  assert.deepEqual(Object.keys(hashes).sort(), Object.keys(CLIPS).sort());
  // Per-clip comparison with `git show <base>:<file>` whenever the base commit is reachable (CI checks out full history).
  if (spawnSync('git', ['cat-file', '-e', `${BASE_COMMIT}^{commit}`]).status === 0) {
    const show = file => { const r = spawnSync('git', ['show', `${BASE_COMMIT}:${file}`], { maxBuffer: 64 * 1024 * 1024 }); assert.equal(r.status, 0, r.stderr?.toString()); return r.stdout; };
    const before = glbOf(show(`${DIR}m01_soldier_animations.glb`));
    assert.equal(before.json.animations.length, 25);
    for (const a of before.json.animations) assert.equal(hashes[a.name], clipHash(before, a), `${a.name} differs from the base commit`);
    for (const file of [...CHARS.map(c => c.file), 'm01_station_animations.glb', 'manifest.json']) assert.deepEqual(read(DIR + file), show(DIR + file), `${file} differs from the base commit`);
  }
});

test('sprint, crouch walk, hit_front and near_miss_duck carry the motion package track data unchanged', () => {
  const motion = glb('motion-clips-v1/m01_soldier_motion_clips.glb');
  for (const name of OVERLAP_WITH_MOTION_PACKAGE) {
    const a = lib.json.animations.find(x => x.name === name), b = motion.json.animations.find(x => x.name === name);
    assert.equal(a.channels.length, b.channels.length, name);
    for (const ch of a.channels) {
      const bone = lib.json.nodes[ch.target.node].name, other = b.channels.find(c => motion.json.nodes[c.target.node].name === bone && c.target.path === ch.target.path);
      assert.ok(other, `${name}.${bone}`);
      assert.deepEqual([lib.floats(a.samplers[ch.sampler].input), lib.floats(a.samplers[ch.sampler].output)], [motion.floats(b.samplers[other.sampler].input), motion.floats(b.samplers[other.sampler].output)], `${name}.${bone}.${ch.target.path}`);
    }
  }
});

test('clip extras are the 240 Hz measurement of the real mixer: contacts, nominal speed, drift, loop seam, junctions', async () => {
  const { out, refs } = await measured;
  for (const [name, { clip, audit }] of Object.entries(out)) {
    const x = clip.userData, a = x.audit;
    assert.ok(near(audit.durationS, a.durationS, 1e-6) && audit.samples === a.samples, name);
    assert.ok(audit.rootDisplacementM < 1e-6, `${name}: in place`);
    for (const side of ['l', 'r']) {
      assert.equal(audit.contacts[side].length, x.contacts[side].length, `${name}: ${side} contact windows`);
      audit.contacts[side].forEach((w, i) => w.forEach((t, k) => assert.ok(near(t, x.contacts[side][i][k], 1 / 240 + 1e-6), `${name}.${side}[${i}]`)));
      assert.ok(near(audit.footDriftMm[side], a.footDriftMm[side], 0.05) && near(audit.footLiftMm[side], a.footLiftMm[side], 0.05), `${name}.${side} drift`);
    }
    // Feet stay put at their contacts: <= 15 mm (horizontal drift and vertical lift) in the root-compensated frame.
    assert.ok(audit.maxContactDriftMm <= LIMITS.contactDriftMm, `${name}: ${audit.maxContactDriftMm} mm`);
    assert.ok(audit.maxBoneSpeedMps <= LIMITS.maxBoneSpeedMps, `${name}: bone speed ${audit.maxBoneSpeedMps}`);
    if (x.audit.model.mode === 'locomotion') {
      assert.ok(Math.abs(audit.measuredNominalSpeedMps - x.audit.model.speedMps) / x.audit.model.speedMps <= LIMITS.nominalSpeedTolerance, `${name}: ${audit.measuredNominalSpeedMps}`);
      assert.ok(near(audit.measuredNominalSpeedMps, a.measuredNominalSpeedMps, 1e-3), name);
    }
    if (x.loop) { assert.ok(near(audit.loopSeam.positionMm, a.loopSeam.positionMm, 0.01) && near(audit.loopSeam.velocityMps, a.loopSeam.velocityMps, 1e-3), name); }
    if (audit.finalStillMm !== undefined) assert.ok(audit.finalStillMm <= LIMITS.finalStillMm, `${name}: final pose still moves ${audit.finalStillMm} mm`);
    for (const [key, j] of Object.entries(a.junction ?? {})) {
      const ref = j.ref === 'own frame 0' ? signature(out[name].samples[0]) : refs[j.ref], cur = junction(signature(out[name].samples[key === 'start' ? 0 : out[name].samples.length - 1]), ref);
      assert.ok(cur.positionMm <= LIMITS.junctionMm && cur.angleRad <= LIMITS.junctionRad, `${name}.${key} vs ${j.ref}: ${JSON.stringify(cur)}`);
    }
  }
  // Clips that must join a shipped clip do declare their junction (the table of annex B: extremes = idle t0).
  for (const [name, start, end] of [['stand_to_crouch', 'standing_idle t0', 'crouched_idle t0'], ['crouch_to_stand', 'crouched_idle t0', 'standing_idle t0'], ['prone_enter', 'crouched_idle t0', 'prone_idle t0'], ['prone_exit', 'prone_idle t0', 'crouched_idle t0'],
    ['turn_left_90', 'standing_idle t0', 'standing_idle t0'], ['turn_right_90', 'standing_idle t0', 'standing_idle t0'], ['fidget_look', 'standing_idle t0', 'standing_idle t0'], ['fidget_shift', 'standing_idle t0', 'standing_idle t0'],
    ['fidget_helmet', 'standing_idle t0', 'standing_idle t0'], ['fidget_check_rifle', 'standing_idle t0', 'standing_idle t0'], ['death_front', 'standing_idle t0'], ['death_crumple', 'standing_idle t0'], ['call_out', 'standing_idle t0', 'standing_idle t0'],
    ['seated_pass_canteen', 'seated t0', 'seated t0'], ['seated_cup_turn', 'seated t0', 'seated t0'], ['cover_return', 'standing_idle t0', 'cover_low_idle t0'], ['cover_low_peek_fire_l', 'cover_low_idle t0', 'cover_low_idle t0'], ['cover_high_lean_r', 'cover_high_idle t0', 'cover_high_idle t0']]) {
    const j = out[name].clip.userData.audit.junction; assert.equal(j.start?.ref, start, `${name} start`); if (end) assert.equal(j.end?.ref, end, `${name} end`);
  }
});

test('loops are continuous at the ends: identical first and last keys on every track, no seam in the measured pose', async () => {
  const { out } = await measured;
  for (const anim of lib.json.animations.filter(a => a.extras.loop)) {
    for (const ch of anim.channels) {
      const s = anim.samplers[ch.sampler], v = lib.floats(s.output), n = ch.target.path === 'rotation' ? 4 : 3;
      for (let k = 0; k < n; k++) assert.ok(near(v[k], v[v.length - n + k], 2e-5), `${anim.name}.${lib.json.nodes[ch.target.node].name}.${ch.target.path}[${k}]`);
    }
    const seam = out[anim.name].audit.loopSeam;
    assert.ok(seam.positionMm <= LIMITS.loopSeamMm && seam.angleRad <= LIMITS.loopSeamRad, `${anim.name}: ${JSON.stringify(seam)}`);
    assert.ok(seam.velocityMps <= Math.max(0.05, LIMITS.loopSeamVelocityShare * out[anim.name].audit.maxBoneSpeedMps), `${anim.name}: velocity seam ${seam.velocityMps}`);
  }
});

test('runtime keys: locomotion clips publish speed_mps and cycle_distance_m (resolver contract); gaits match the nominal speeds', () => {
  for (const [name, speed] of Object.entries(LOCOMOTION)) {
    const x = lib.json.animations.find(a => a.name === name).extras;
    assert.ok(x.loop && near(x.speed_mps, speed, 1e-9) && near(x.cycle_distance_m, speed * LIB[name][0], 1e-9), name);
    assert.ok(near(x.nominalSpeedMps, speed, 1e-9) && near(x.cycleDuration, LIB[name][0], 1e-9) && near(x.strideM * 2, x.cycle_distance_m, 1e-9), name);
  }
  assert.ok(LOCOMOTION.sprint > 4.4, 'sprint gait threshold of the simulation contract');
  assert.equal(lib.json.animations.filter(a => a.extras.speed_mps !== undefined).length, Object.keys(LOCOMOTION).length);
  const ex = name => lib.json.animations.find(a => a.name === name).extras;
  for (const name of ['turn_left_90', 'turn_right_90']) assert.deepEqual([ex(name).yaw.deltaDeg, ex(name).yaw.startS, ex(name).yaw.endS, ex(name).yaw.profile], [name.includes('left') ? 90 : -90, 0, 0.5, 'linear']);
  for (const d of ['front', 'back', 'left', 'right']) { assert.equal(ex(`hit_${d}`).impact_from, d); assert.equal(ex(`hit_${d}`).presentation_event, 'hitAt'); assert.equal(ex(`hit_${d}`).reference, 'frame 0'); }
  for (const [name, toward] of [['death_front', 'back'], ['death_back', 'front'], ['death_left', 'right'], ['death_right', 'left'], ['death_crumple', 'down']]) { assert.equal(ex(name).fall_toward, toward); assert.equal(ex(name).family, 'hands_free'); assert.ok(ex(name).durationS >= 1.4 && ex(name).durationS <= 1.8); assert.ok(ex(name).audit.finalStillMm <= LIMITS.finalStillMm); }
  assert.deepEqual(['cover_low_idle', 'cover_low_peek_fire_l', 'cover_high_idle', 'cover_high_lean_r'].map(n => ex(n).cover_height_m), [0.9, 0.9, 1.6, 1.6]);
  for (const name of ['prone_enter', 'prone_exit', 'prone_idle', 'prone_flinch', 'prone_crawl']) assert.equal(ex(name).family, 'prone');
  assert.equal(ex('prone_flinch').presentation_event, 'suppressedAt'); assert.equal(ex('near_miss_duck').presentation_event, 'suppressedAt'); assert.equal(ex('carry_walk').attach_partner, 'carried');
});

test('the skinned LOD1 body stays out of the ground in every new clip and the dead end flat on it', async () => {
  const gltf = await loadGLB('m01_soldier_pl_lod1.glb'), mixer = new THREE.AnimationMixer(gltf.scene), meshes = [], p = new THREE.Vector3();
  gltf.scene.traverse(o => { if (o.isSkinnedMesh && o.userData.visible !== false && o.name !== 'clip') meshes.push(o); });   // the cartridge clip is scaled to zero in these clips
  const lib2 = await parseGLB(read(LIB_DIR + LIB_FILE));
  for (const clip of lib2.animations) {
    const action = mixer.clipAction(clip); action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play();
    let minY = Infinity, endTop = 0;
    for (let k = 0; k <= 8; k++) {
      mixer.setTime(clip.duration * k / 8); gltf.scene.updateMatrixWorld(true); let top = -Infinity;
      for (const m of meshes) for (let i = 0; i < m.geometry.attributes.position.count; i += 3) { m.getVertexPosition(i, p).applyMatrix4(m.matrixWorld); minY = Math.min(minY, p.y); top = Math.max(top, p.y); }
      if (k === 8) endTop = top;
    }
    mixer.stopAllAction(); mixer.uncacheClip(clip);
    // Shipped clips go as deep as -0.28 m mid-fall (`fallen`) and -0.12 m prone / wounded; a new clip must not exceed 0.16 m.
    assert.ok(minY >= -0.16, `${clip.name}: lowest vertex ${minY}`);
    if (clip.name.startsWith('death_')) assert.ok(endTop < 0.55, `${clip.name}: still ${endTop} m high at the end`);
  }
});

test('manifest sources, preserved files and the clip table are in sync; regenerating reproduces the committed package', async () => {
  for (const g of libManifest.generation_sources) assert.equal(sha(read(g.file)), g.sha256, `${g.file} changed after the package was built`);
  const table = fs.readFileSync(new URL('../docs/assets/m01-soldiers/clip-library-v2.md', import.meta.url), 'utf8');
  for (const name of Object.keys(LIB)) { assert.ok(table.includes(`| \`${name}\` |`), `${name} missing from docs/assets/m01-soldiers/clip-library-v2.md`); assert.ok(fs.existsSync(new URL(`../docs/assets/m01-soldiers/clip-library-v2/${name}.png`, import.meta.url)), `${name}.png`); }
  assert.ok(table.includes(libManifest.sha256));
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'm01-clip-library-')), out = pathToFileURL(folder + '/');
  try {
    await generateClipLibrary(out);
    assert.deepEqual(fs.readFileSync(new URL(LIB_FILE, out)), read(LIB_DIR + LIB_FILE), 'GLB');
    assert.deepEqual(fs.readFileSync(new URL('manifest.json', out)), read(`${LIB_DIR}manifest.json`), 'manifest');
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
});
