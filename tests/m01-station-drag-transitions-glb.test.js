import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { readGLB, skeleton, clip, localPose } from '../tools/assets/m01-station-drag-transitions/src/fk.mjs';
import { gaps } from '../tools/assets/m01-station-drag-transitions/src/body.mjs';
import { GAME_BONES } from '../tools/assets/m01-soldiers/src/human.mjs';

// Transições do arrasto da estação geradas por tools/assets/m01-station-drag-transitions (node build.mjs): quatro clips
// novos sobre o rig polaco actual, extremos iguais às poses reais, sem deslocação da raiz, contactos com o AnimationMixer.
const CHAR = 'assets/models/provisional/m01/characters/';
const DIR = `${CHAR}station-drag-transitions/`, FILE = 'm01_station_drag_transitions.glb';
const url = p => new URL(`../${p}`, import.meta.url);
const read = p => fs.readFileSync(url(p));
const manifest = JSON.parse(read(`${DIR}manifest.json`));
const info = manifest.files[FILE], T = manifest.timing.duration_s;
const NAMES = ['station_drag_medic_grab', 'station_drag_patient_grab', 'station_drag_medic_release', 'station_drag_patient_release'];
const g = readGLB(url(DIR + FILE).pathname), rig = readGLB(url(`${CHAR}m01_soldier_pl_lod1.glb`).pathname), skel = skeleton(rig, GAME_BONES);
const soldier = readGLB(url(`${CHAR}m01_soldier_animations.glb`).pathname), station = readGLB(url(`${CHAR}m01_station_animations.glb`).pathname);
const pose = (glb, name, t) => localPose(skel, clip(glb, name), t);
const sameRot = (a, b) => Math.abs(Math.abs(a.reduce((s, x, i) => s + x * b[i], 0)) - 1) < 1e-5;
const near = (a, b, e = 1e-5) => a.every((x, i) => Math.abs(x - b[i]) < e);

test('M01 arrasto da estação: ficheiros novos, rig e clips reutilizados sem alterações (SHA-256 do manifesto)', () => {
  const buf = read(DIR + FILE);
  assert.equal(buf.length, info.bytes);
  assert.equal(createHash('sha256').update(buf).digest('hex'), info.sha256);
  for (const [f, r] of Object.entries(manifest.reused)) {
    const b = read(CHAR + f);
    assert.equal(createHash('sha256').update(b).digest('hex'), r.sha256, `${f} mudou`);
    assert.equal(b.length, r.bytes, f);
  }
  assert.deepEqual(g.json.animations.map(a => a.name), NAMES);
  const existing = [...soldier.json.animations, ...station.json.animations].map(a => a.name);
  for (const n of NAMES) assert.ok(!existing.includes(n), `${n} já existe`);
  assert.deepEqual(station.json.animations.map(a => a.name), ['drag_wounded']);
  assert.ok(g.json.meshes === undefined || g.json.meshes.length === 0, 'sem malhas');
  assert.match(manifest.status, /PROTÓTIPO JOGÁVEL/);
  assert.match(manifest.status, /sem playtest/);
  assert.equal(manifest.rig.bones, 61);
  assert.deepEqual(manifest.pair.patient_root_offset_m, [0, 0, -0.92]);
  for (const s of ['l', 'r']) for (const k of ['shoulder_on_ground', 'armpit_grip']) assert.equal(manifest.sockets[k][s].length, 3);
  assert.ok(manifest.sources.estimates.length >= 3);
});

test('M01 arrasto da estação: alvos dos 61 ossos, valores finitos, quaternões unitários, relógio e eventos dos pares', () => {
  const bones = new Set(GAME_BONES.map(b => b.name));
  assert.equal(bones.size, 61);
  // A hierarquia do GLB é a do rig (mesmos nomes, pais e translações de ligação).
  for (const b of GAME_BONES) {
    const n = g.json.nodes.find(x => x.name === b.name);
    assert.ok(n, b.name);
    assert.ok(near(n.translation ?? [0, 0, 0], skel[b.name].t, 1e-6), `ligação de ${b.name}`);
    if (b.parent) assert.ok(g.json.nodes.find(x => x.name === b.parent).children.includes(g.json.nodes.indexOf(n)), `pai de ${b.name}`);
  }
  for (const a of g.json.animations) {
    const rot = new Set();
    for (const c of a.channels) {
      const node = g.json.nodes[c.target.node].name, s = a.samplers[c.sampler], t = g.acc(s.input).map(v => v[0]), v = g.acc(s.output);
      assert.ok(bones.has(node), `${a.name}: alvo ${node}`);
      assert.ok(t.every(Number.isFinite) && v.flat().every(Number.isFinite), `${a.name}/${node}: finitos`);
      assert.ok(t.every((x, i) => !i || x > t[i - 1]), `${a.name}/${node}: tempos crescentes`);
      assert.ok(Math.abs(t.at(-1) - T) < 1e-5, `${a.name}/${node}: duração`);
      if (c.target.path === 'rotation') { rot.add(node); for (const q of v) assert.ok(Math.abs(Math.hypot(...q) - 1) < 1e-4, `${a.name}/${node}: unitário`); }
      if (c.target.path === 'scale') assert.equal(s.interpolation, 'STEP');
    }
    assert.equal(rot.size, 61, `${a.name}: rotação de todos os ossos`);
    // Sem arma visível nem clipe.
    const c = clip(g, a.name);
    assert.ok(c.tracks.weapon.scale.values.every(x => x.every(k => k === 0)), `${a.name}: weapon escondida`);
    assert.ok(c.tracks.weapon_clip.scale.values.every(x => x.every(k => k === 0)), `${a.name}: clipe escondido`);
    const m = info.clips.find(x => x.name === a.name);
    assert.deepEqual(a.extras.events, m.events);
    assert.equal(a.extras.duration, T);
    assert.equal(a.extras.loop, false);
  }
  const ex = n => g.json.animations.find(a => a.name === n).extras;
  for (const [x, y] of [['station_drag_medic_grab', 'station_drag_patient_grab'], ['station_drag_medic_release', 'station_drag_patient_release']]) {
    assert.equal(ex(x).pair, y); assert.equal(ex(y).pair, x);
    assert.deepEqual(ex(x).events, ex(y).events, 'mesmo relógio');
  }
  assert.deepEqual(Object.keys(ex(NAMES[0]).events), ['hands_contact', 'grip_ready']);
  assert.deepEqual(Object.keys(ex(NAMES[2]).events), ['hands_release', 'settled']);
  const { hands_contact: hc, grip_ready: gr } = ex(NAMES[0]).events, { hands_release: hr, settled } = ex(NAMES[2]).events;
  assert.ok(0 < hc && hc < gr && gr < T);
  assert.ok(Math.abs(hr - (T - gr)) < 1e-4 && settled === T, 'libertação é o percurso inverso');
});

test('M01 arrasto da estação: extremos iguais às poses reais, percurso inverso e raiz sem deslocação', () => {
  const same = (A, B, label) => {
    for (const b of Object.keys(skel)) {
      assert.ok(sameRot(A[b].r, B[b].r), `${label}: rotação de ${b}`);
      assert.ok(near(A[b].t, B[b].t), `${label}: translação de ${b}`);
    }
  };
  const crouch = pose(soldier, 'crouched_idle', 0), drag = pose(station, 'drag_wounded', 0), wounded = pose(soldier, 'wounded', 0);
  same(pose(g, 'station_drag_medic_grab', 0), crouch, 'médico agarra t=0 = crouched_idle');
  same(pose(g, 'station_drag_medic_grab', T), drag, 'médico agarra fim = drag_wounded t=0');
  same(pose(g, 'station_drag_medic_release', 0), drag, 'médico solta t=0 = drag_wounded t=0');
  same(pose(g, 'station_drag_medic_release', T), crouch, 'médico solta fim = crouched_idle');
  same(pose(g, 'station_drag_patient_grab', 0), wounded, 'paciente agarra t=0 = wounded');
  same(pose(g, 'station_drag_patient_release', T), wounded, 'paciente solta fim = wounded');
  same(pose(g, 'station_drag_patient_release', 0), pose(g, 'station_drag_patient_grab', T), 'pose de arrasto partilhada');
  // A libertação é o agarrar ao contrário, frame a frame.
  for (const [a, b] of [['station_drag_medic_grab', 'station_drag_medic_release'], ['station_drag_patient_grab', 'station_drag_patient_release']])
    for (let i = 0; i <= 48; i += 4) same(pose(g, a, i / 30), pose(g, b, T - i / 30), `${b} em ${(T - i / 30).toFixed(2)}`);
  // Raiz: translação de ligação e sem rotação em todos os frames.
  for (const n of NAMES) {
    const r = clip(g, n).tracks.root;
    assert.ok(r.translation.values.every(v => near(v, skel.root.t, 1e-6)), `${n}: raiz parada`);
    assert.ok(r.rotation.values.every(v => sameRot(v, [0, 0, 0, 1])), `${n}: raiz sem rotação`);
  }
});

test('M01 arrasto da estação: AnimationMixer do three.js — contactos, paciente de costas, corpos e pausa/retoma', async () => {
  const buf = read(DIR + FILE), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
  const load = () => new Promise((ok, ko) => new GLTFLoader().parse(ab, '', ok, ko));
  const medic = await load(), patient = await load(), clips = Object.fromEntries(medic.animations.map(c => [c.name, c]));
  patient.scene.position.fromArray(manifest.pair.patient_root_offset_m);
  const mixers = [new THREE.AnimationMixer(medic.scene), new THREE.AnimationMixer(patient.scene)];
  const play = kind => { mixers.forEach((m, i) => { m.stopAllAction(); const a = m.clipAction(clips[`station_drag_${i ? 'patient' : 'medic'}_${kind}`]); a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; a.reset().play(); }); };
  const at = t => { mixers.forEach(m => m.setTime(t)); medic.scene.updateMatrixWorld(true); patient.scene.updateMatrixWorld(true); };
  const W = scene => { const out = {}; for (const b of GAME_BONES) { const o = scene.getObjectByName(b.name), p = new THREE.Vector3(), r = new THREE.Quaternion(); o.matrixWorld.decompose(p, r, new THREE.Vector3()); out[b.name] = { p: p.toArray(), r: r.toArray() }; } return out; };
  const dist = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
  const handShoulder = (M, P) => Math.max(...['l', 'r'].map(s => dist(M[`hand_${s}`].p, P[`upperarm_${s}`].p)));
  const C = manifest.checks, ev = manifest.timing;
  const endpoint = Math.min(...C.endpoints_existing.map(e => e.gap_m));

  for (const kind of ['grab', 'release']) {
    play(kind);
    for (let i = 0; i <= 48; i++) {
      const t = Math.min(T, i / 30); at(t);
      const M = W(medic.scene), P = W(patient.scene), g2 = gaps(M, P), label = `${kind} ${t.toFixed(2)}`;
      // Raízes no lugar: médico na origem, paciente a +0,92 m na direcção do facing (−Z).
      assert.ok(near(M.root.p, skel.root.t, 1e-5), `${label}: raiz do médico`);
      assert.ok(near(P.root.p, skel.root.t.map((x, k) => x + manifest.pair.patient_root_offset_m[k]), 1e-5), `${label}: raiz do paciente`);
      // Paciente de costas: frente do tronco (−Z local de spine_02) para cima; anca no chão; não sobe ao ombro.
      const front = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion(...P.spine_02.r));
      assert.ok(front.y > 0.5, `${label}: paciente de costas (${front.y.toFixed(2)})`);
      assert.ok(P.hips.p[1] < 0.16 && P.head.p[1] < 0.75, `${label}: paciente no chão`);
      assert.ok(Math.max(...Object.entries(P).filter(([n]) => !/^weapon|carry_socket/.test(n)).map(([, b]) => b.p[1])) < 0.8, `${label}: não é o transporte ao ombro`);
      // Corpos: mãos/antebraços só encostam; o resto nunca pior do que as poses reais dos extremos.
      const contact = g2.filter(x => /^(hand|forearm)_/.test(x.a)), other = g2.filter(x => !/^(hand|forearm)_/.test(x.a));
      assert.ok(contact[0].gap > -0.035, `${label}: ${contact[0].a}/${contact[0].b} ${contact[0].gap.toFixed(3)}`);
      assert.ok(other[0].gap >= endpoint - 1e-3, `${label}: ${other[0].a}/${other[0].b} ${other[0].gap.toFixed(3)}`);
      // Mãos perto dos ombros desde o contacto até largar.
      const grip = kind === 'grab' ? t >= ev.grab.hands_contact - 1e-6 : t <= ev.release.hands_clear + 1e-6;
      if (grip) assert.ok(handShoulder(M, P) < 0.2, `${label}: mãos a ${handShoulder(M, P).toFixed(3)} m dos ombros`);
    }
  }
  // Instantes dos eventos (agarrar) contra o manifesto e mãos do frame 0 do arrasto nos sockets debaixo dos sovacos.
  play('grab');
  at(ev.grab.hands_contact); assert.ok(Math.abs(handShoulder(W(medic.scene), W(patient.scene)) - C.hands_contact.hand_to_shoulder_m) < 2e-3);
  at(ev.grab.grip_ready); assert.ok(Math.abs(handShoulder(W(medic.scene), W(patient.scene)) - C.grip_ready.hand_to_shoulder_m) < 2e-3);
  at(T);
  const M = W(medic.scene), P = W(patient.scene);
  for (const s of ['l', 'r']) {
    const u = P[`upperarm_${s}`], k = new THREE.Vector3(...manifest.sockets.armpit_grip[s]).applyQuaternion(new THREE.Quaternion(...u.r)).add(new THREE.Vector3(...u.p));
    assert.ok(dist(M[`hand_${s}`].p, k.toArray()) < 2e-3, `mão ${s} no socket armpit_grip`);
  }
  assert.ok(C.drag_loop_with_patient_hold.max_hand_to_grip_m < 0.01, 'drag_wounded mantém as mãos na pega');

  // Pausa e retoma: o mesmo instante depois de saltar para outro tempo dá as mesmas matrizes.
  const snap = () => { const out = []; for (const s of [medic.scene, patient.scene]) s.traverse(o => out.push(...o.matrixWorld.elements)); return out; };
  for (const kind of ['grab', 'release']) {
    play(kind); at(1.1); const a = snap(); at(0.2); at(1.1); const b = snap();
    assert.ok(a.every((x, i) => Math.abs(x - b[i]) < 1e-9), `${kind}: pausa/retoma`);
  }
});
