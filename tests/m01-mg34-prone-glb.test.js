import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// MG 34 deitada (atirador e municiador) gerada por tools/assets/m01-mg34-prone (node build.mjs): clips novos sobre o rig
// do soldado alemão, nós móveis da MG 34, rajada de 7, recarga com passagem do tambor, contactos e mixer do three.js.
const DIR = 'assets/models/provisional/m01/weapons/mg34-prone/';
const FILE = 'm01_mg34_prone_animations.glb';
const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url));
const manifest = JSON.parse(read(`${DIR}manifest.json`));
function glb(path) {
  const buf = read(path), len = buf.readUInt32LE(12);
  assert.equal(buf.readUInt32LE(0), 0x46546c67); assert.equal(buf.readUInt32LE(8), buf.length);
  const json = JSON.parse(buf.subarray(20, 20 + len).toString('utf8')), bin = buf.subarray(28 + len);
  const floats = i => { const a = json.accessors[i], v = json.bufferViews[a.bufferView], n = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type], st = v.byteStride ?? n * 4;
    return Array.from({ length: a.count * n }, (_, k) => bin.readFloatLE((v.byteOffset ?? 0) + (a.byteOffset ?? 0) + Math.floor(k / n) * st + (k % n) * 4)); };
  const name = c => json.nodes[c.target.node].name;
  const track = (a, node, path) => { const c = a.channels.find(c => name(c) === node && c.target.path === path); if (!c) return null; const s = a.samplers[c.sampler]; return { t: floats(s.input), v: floats(s.output), interpolation: s.interpolation ?? 'LINEAR' }; };
  return { buf, json, floats, name, track, node: n => json.nodes.find(x => x.name === n), anim: n => json.animations.find(a => a.name === n) };
}
const MOVING = ['mg34_feed_cover', 'mg34_cocking_handle', 'mg34_drum', 'mg34_belt', 'mg34_bipod_folded', 'mg34_bipod_open'];
const GUNNER = { mg34_prone_enter: 1.9, mg34_prone_idle: 4, mg34_prone_aim: 2, mg34_prone_fire_burst: 1.02, mg34_prone_reload: 4.8, mg34_prone_exit: 1.9 };
const LOADER = { mg34_loader_prone_idle: 4, mg34_loader_prone_feed: 4.8, mg34_loader_prone_leave: 1.8 };
const at = (tr, time, n) => { const i = tr.t.findIndex(x => x >= time - 1e-4); return tr.v.slice(i * n, i * n + n); };
const last = (tr, n) => tr.v.slice(-n);

test('M01 MG 34 deitada: nomes novos, kit da MG 34 e soldados reutilizados sem alterações (hashes do manifesto)', () => {
  for (const [path, info] of Object.entries(manifest.reuse.reused_files)) {
    const buf = read(path);
    assert.equal(createHash('sha256').update(buf).digest('hex'), info.sha256, `${path} mudou`);
    assert.equal(buf.length, info.bytes, path);
  }
  const g = glb(DIR + FILE);
  assert.deepEqual(g.json.animations.map(a => a.name), [...Object.keys(GUNNER), ...Object.keys(LOADER)]);
  const existing = ['weapons/mg34/m01_mg34_animations.glb', 'characters/m01_soldier_animations.glb', 'weapons/rkm_wz28/m01_rkm_wz28_animations.glb']
    .flatMap(f => glb(`assets/models/provisional/m01/${f}`).json.animations.map(a => a.name));
  for (const a of g.json.animations) assert.ok(!existing.includes(a.name), `${a.name} já existe`);
  // Os clips de pé do kit continuam lá.
  assert.deepEqual(glb('assets/models/provisional/m01/weapons/mg34/m01_mg34_animations.glb').json.animations.map(a => a.name), ['mg34_aim', 'mg34_fire_burst', 'mg34_reload']);
  assert.equal(fs.statSync(new URL(`../${DIR}${FILE}`, import.meta.url)).size, manifest.files[FILE].bytes);
  for (const k of ['status', 'license', 'author', 'units', 'scale', 'pair', 'posture', 'bipod', 'sockets', 'nodes', 'fire', 'reload', 'sources']) assert.ok(manifest[k], `manifesto: ${k}`);
  assert.match(manifest.status, /PROTÓTIPO JOGÁVEL/);
  assert.match(manifest.status, /sem playtest/);
  assert.ok(manifest.sources.estimates.length >= 3);
});

test('M01 MG 34 deitada: alvos do rig e da arma, valores finitos, quaternões unitários e durações', () => {
  const g = glb(DIR + FILE), soldier = glb('assets/models/provisional/m01/characters/m01_soldier_de_lod0.glb'), weapon = glb('assets/models/provisional/m01/weapons/mg34/m01_mg34_lod0.glb');
  const joints = new Set(soldier.json.skins[0].joints.map(j => soldier.json.nodes[j].name));
  // Nós móveis: filhos de `weapon` no GLB dos clips, com o pivô do kit, e presentes na cena da arma.
  const weaponNode = g.node('weapon');
  for (const n of MOVING) {
    const i = g.json.nodes.findIndex(x => x.name === n);
    assert.ok(weaponNode.children.includes(i), `${n} filho de weapon`);
    assert.ok(weapon.node(n), `${n} na MG 34`);
    assert.deepEqual(weapon.node(n).translation ?? [0, 0, 0], manifest.nodes.find(x => x.node === n).pivot, `pivô de ${n}`);
  }
  for (const a of g.json.animations) {
    const want = GUNNER[a.name] ?? LOADER[a.name];
    const dur = Math.max(...a.samplers.map(s => g.json.accessors[s.input].max[0]));
    assert.ok(Math.abs(dur - want) < 1e-3, `${a.name}: ${dur}`);
    assert.equal(manifest.files[FILE].clips.find(c => c.name === a.name).duration, want);
    for (const c of a.channels) {
      const n = g.name(c), s = a.samplers[c.sampler], v = g.floats(s.output), t = g.floats(s.input);
      assert.ok(joints.has(n) || (MOVING.includes(n) && a.name in GUNNER), `${a.name}: alvo ${n}`);
      assert.ok(v.every(Number.isFinite) && t.every(Number.isFinite), `${a.name}/${n}/${c.target.path}: valores finitos`);
      assert.ok(t.every((x, i) => i === 0 || x > t[i - 1]), `${a.name}/${n}: tempos crescentes`);
      if (c.target.path === 'rotation') for (let i = 0; i < v.length; i += 4) assert.ok(Math.abs(Math.hypot(v[i], v[i + 1], v[i + 2], v[i + 3]) - 1) < 1e-4, `${a.name}/${n}: quaternião unitário`);
    }
    // Uma só arma: a MG 34 no osso weapon do atirador; municiador sem arma; clipe da Kar98k sempre escondido.
    const ws = g.track(a, 'weapon', 'scale').v, cs = g.track(a, 'weapon_clip', 'scale').v;
    assert.ok(ws.every(x => x === (a.name in GUNNER ? 1 : 0)), `${a.name}: escala de weapon`);
    assert.ok(cs.every(x => x === 0), `${a.name}: clipe escondido`);
    assert.equal(a.extras.role, a.name in GUNNER ? 'gunner' : 'loader');
  }
  for (const n of Object.keys(LOADER)) assert.deepEqual(g.anim(n).extras.root_offset_from_gunner_m, manifest.pair.loader.root_offset_m);
});

test('M01 MG 34 deitada: rajada de 7 a 0,075 s, janela e cortes; bípode aberto/dobrado; recarga coordenada', () => {
  const g = glb(DIR + FILE), A = n => g.anim(n);
  const fire = A('mg34_prone_fire_burst').extras;
  assert.equal(fire.events.fire.length, 7);
  fire.events.fire.forEach((t, i) => assert.ok(Math.abs(t - i * 0.075) < 1e-9, `tiro ${i + 1} em ${t}`));
  assert.equal(manifest.fire.shot_interval_s, 0.075);
  assert.deepEqual(fire.fire_window_s, [0, 0.525]);
  assert.equal(fire.interrupt.after_shots[4], 0.3);
  assert.equal(fire.interrupt.after_shots[6], 0.45);
  assert.ok(fire.interrupt.after_shots[4] > fire.events.fire[3] && fire.interrupt.after_shots[4] <= fire.events.fire[4]);
  assert.ok(fire.interrupt.after_shots[6] > fire.events.fire[5] && fire.interrupt.after_shots[6] <= fire.events.fire[6]);
  // Bípode: deitado sempre aberto (STEP); a entrada troca o dobrado pelo aberto em bipod_open e a saída ao contrário.
  for (const n of ['mg34_prone_idle', 'mg34_prone_aim', 'mg34_prone_fire_burst', 'mg34_prone_reload']) {
    assert.ok(g.track(A(n), 'mg34_bipod_open', 'scale').v.every(x => x === 1), `${n}: bípode aberto`);
    assert.ok(g.track(A(n), 'mg34_bipod_folded', 'scale').v.every(x => x === 0), `${n}: bípode dobrado escondido`);
  }
  const enter = A('mg34_prone_enter'), open = g.track(enter, 'mg34_bipod_open', 'scale'), folded = g.track(enter, 'mg34_bipod_folded', 'scale');
  assert.equal(open.interpolation, 'STEP');
  assert.equal(at(open, 0, 3)[0], 0); assert.equal(at(folded, 0, 3)[0], 1);
  assert.equal(at(open, enter.extras.events.bipod_open + 0.04, 3)[0], 1); assert.equal(at(folded, enter.extras.events.bipod_open + 0.04, 3)[0], 0);
  const exit = A('mg34_prone_exit');
  assert.equal(at(g.track(exit, 'mg34_bipod_open', 'scale'), 0, 3)[0], 1); assert.equal(last(g.track(exit, 'mg34_bipod_folded', 'scale'), 3)[0], 1);
  // Recarga: tampa, tambor (sai, pousa, volta pelo municiador, engata), cinta e alavanca; municiador sincronizado.
  const R = A('mg34_prone_reload'), ev = R.extras.events, F = A('mg34_loader_prone_feed');
  assert.deepEqual(ev, manifest.reload.events);
  const order = ['cover_open', 'drum_off', 'drum_down', 'drum_from_assistant', 'drum_handoff', 'drum_on', 'belt_in', 'cover_closed', 'handle_back', 'handle_forward'];
  order.forEach((k, i) => assert.ok(i === 0 || ev[k] > ev[order[i - 1]], `ordem ${k}`));
  assert.equal(F.extras.events.drum_handoff, ev.drum_handoff);
  assert.equal(F.extras.events.drum_from_assistant, ev.drum_from_assistant);
  const pivot = n => manifest.nodes.find(x => x.node === n).pivot, dist = (a, b) => Math.hypot(...a.map((x, k) => x - b[k]));
  const cover = g.track(R, 'mg34_feed_cover', 'rotation'), angle = qq => 2 * Math.asin(Math.min(1, Math.abs(qq[0]))) * 180 / Math.PI;
  assert.ok(angle(at(cover, ev.cover_open + 0.3, 4)) > 60, 'tampa aberta');
  assert.ok(angle(last(cover, 4)) < 0.01, 'tampa fechada no fim');
  const drum = g.track(R, 'mg34_drum', 'translation');
  assert.ok(dist(at(drum, ev.drum_down + 0.05, 3), pivot('mg34_drum')) > 0.15, 'tambor vazio pousado longe da arma');
  assert.ok(dist(at(drum, ev.drum_handoff, 3), pivot('mg34_drum')) > 0.1, 'tambor novo na mão do municiador');
  assert.ok(dist(at(drum, ev.drum_on + 0.02, 3), pivot('mg34_drum')) < 1e-4, 'tambor novo engatado');
  assert.ok(dist(last(drum, 3), pivot('mg34_drum')) < 1e-5);
  const handle = g.track(R, 'mg34_cocking_handle', 'translation');
  assert.ok(dist(at(handle, ev.handle_back, 3), pivot('mg34_cocking_handle')) > 0.1, 'alavanca atrás');
  assert.ok(dist(last(handle, 3), pivot('mg34_cocking_handle')) < 1e-5, 'alavanca à frente');
  const belt = g.track(R, 'mg34_belt', 'scale');
  assert.equal(last(belt, 3)[0], 1);
});

test('M01 MG 34 deitada: continuidade com mg34_aim do kit e entre clips deitados', () => {
  const g = glb(DIR + FILE), kit = glb('assets/models/provisional/m01/weapons/mg34/m01_mg34_animations.glb');
  const first = (G, a, n, p) => { const tr = G.track(a, n, p); return tr && tr.v.slice(0, p === 'rotation' ? 4 : 3); };
  const end = (G, a, n, p) => { const tr = G.track(a, n, p); return tr && last(tr, p === 'rotation' ? 4 : 3); };
  const same = (Ga, a, fa, Gb, b, fb, label) => {
    let n = 0;
    for (const c of a.channels) {
      const bone = Ga.name(c), p = c.target.path;
      if (p === 'scale' || bone.startsWith('mg34_')) continue;
      const x = fa(Ga, a, bone, p), y = fb(Gb, b, bone, p);
      if (!x || !y) continue;
      const d = Math.min(Math.max(...x.map((v, k) => Math.abs(v - y[k]))), Math.max(...x.map((v, k) => Math.abs(v + y[k]))));
      assert.ok(d < 2e-4, `${label}: ${bone}.${p} difere ${d}`); n++;
    }
    assert.ok(n > 30, `${label}: ${n} faixas comparadas`);
  };
  const aim = kit.anim('mg34_aim'), A = n => g.anim(n);
  same(g, A('mg34_prone_enter'), first, kit, aim, first, 'enter[0] = mg34_aim[0]');
  same(g, A('mg34_prone_exit'), end, kit, aim, first, 'exit[fim] = mg34_aim[0]');
  for (const [n, f] of [['mg34_prone_enter', end], ['mg34_prone_fire_burst', first], ['mg34_prone_fire_burst', end], ['mg34_prone_reload', first], ['mg34_prone_reload', end], ['mg34_prone_exit', first]])
    same(g, A(n), f, g, A('mg34_prone_aim'), first, `${n} = mg34_prone_aim[0]`);
  for (const n of ['mg34_prone_idle', 'mg34_prone_aim', 'mg34_loader_prone_idle']) same(g, A(n), end, g, A(n), first, `${n}: ciclo fechado`);
  for (const [n, f] of [['mg34_loader_prone_feed', first], ['mg34_loader_prone_feed', end], ['mg34_loader_prone_leave', first]])
    same(g, A(n), f, g, A('mg34_loader_prone_idle'), first, `${n} = mg34_loader_prone_idle[0]`);
});

test('M01 MG 34 deitada: AnimationMixer do three.js — contactos, passagem do tambor e pausa/retoma no mesmo frame', async () => {
  const buf = read(DIR + FILE), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
  const load = () => new Promise((ok, ko) => new GLTFLoader().parse(ab, '', ok, ko));
  const gun = await load(), ldr = await load(), clips = Object.fromEntries(gun.animations.map(c => [c.name, c]));
  ldr.scene.position.fromArray(manifest.pair.loader.root_offset_m);
  const mixers = [new THREE.AnimationMixer(gun.scene), new THREE.AnimationMixer(ldr.scene)];
  const play = (m, name) => { m.stopAllAction(); const a = m.clipAction(clips[name]); a.reset().play(); return a; };
  const update = () => { gun.scene.updateMatrixWorld(true); ldr.scene.updateMatrixWorld(true); };
  const world = (scene, n, p = [0, 0, 0]) => new THREE.Vector3(...p).applyMatrix4(scene.getObjectByName(n).matrixWorld);
  const snap = scene => { const out = []; scene.traverse(o => out.push(...o.matrixWorld.elements)); return out; };
  const S = manifest.sockets;

  // Pontaria deitada: patas do bípode no chão, coronha ao ombro, olho na linha de mira, cotovelos/joelhos baixos.
  play(mixers[0], 'mg34_prone_aim'); mixers[0].setTime(0); update();
  assert.ok(Math.abs(world(gun.scene, 'weapon', S.bipod_feet).y) < 0.003, 'patas do bípode em y≈0');
  assert.ok(world(gun.scene, 'weapon', S.muzzle).z < -0.9, 'cano para −Z, à frente do atirador');
  assert.ok(world(gun.scene, 'weapon', S.butt).distanceTo(world(gun.scene, 'upperarm_r')) < 0.12, 'coronha ao ombro');
  assert.ok(world(gun.scene, 'weapon', S.cheek).distanceTo(world(gun.scene, 'eye_r')) < 0.08, 'face na coronha');
  for (const b of ['lowerarm_l', 'lowerarm_r', 'calf_l', 'calf_r']) assert.ok(world(gun.scene, b).y < 0.1, `${b} perto do chão (${world(gun.scene, b).y})`);
  for (const b of ['hand_r', 'hand_l']) assert.ok(world(gun.scene, b).y > 0.02, `${b} acima do chão`);

  // Recarga e alimentação ao mesmo relógio: na passagem o tambor novo (nó da arma do atirador) está na mão do municiador.
  const ev = manifest.reload.events;
  play(mixers[0], 'mg34_prone_reload'); play(mixers[1], 'mg34_loader_prone_feed');
  for (const t of [ev.drum_from_assistant + 0.1, ev.drum_handoff]) {
    mixers.forEach(m => m.setTime(t)); update();
    const d = world(gun.scene, 'mg34_drum').distanceTo(world(ldr.scene, 'hand_r'));
    assert.ok(d < 0.15, `tambor na mão do municiador em ${t} s (${d.toFixed(3)} m)`);
  }
  mixers.forEach(m => m.setTime(ev.drum_on + 0.05)); update();
  assert.ok(world(gun.scene, 'mg34_drum').distanceTo(world(gun.scene, 'weapon', S.drum_center)) < 1e-3, 'tambor engatado no centro do socket');

  // Pausar e retomar o tempo do mixer dá o mesmo frame, em todos os clips.
  for (const name of Object.keys(clips)) {
    const [m, scene] = name in LOADER ? [mixers[1], ldr.scene] : [mixers[0], gun.scene];
    const action = play(m, name), t = clips[name].duration * 0.37;
    m.setTime(t); update(); const a = snap(scene);
    action.paused = true; m.update(0.5); update();
    assert.deepEqual(snap(scene), a, `${name}: pausado não avança`);
    action.paused = false; m.setTime(clips[name].duration * 0.8); m.setTime(t); update();
    const b = snap(scene);
    assert.ok(a.every((v, i) => Number.isFinite(v) && Math.abs(v - b[i]) < 1e-6), `${name}: retoma no mesmo frame`);
  }
});
