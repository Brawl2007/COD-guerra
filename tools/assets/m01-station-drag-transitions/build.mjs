// Transições originais do arrasto da estação (M01) sobre o rig actual: o médico agarra/solta o ferido e o paciente é
// erguido/pousado. Gera m01_station_drag_transitions.glb (quatro clips, sem malhas) e manifest.json. Só usa dados do
// repositório, o solver dos soldados e three.js; determinístico.
// Uso: node tools/assets/m01-station-drag-transitions/build.mjs
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GAME_BONES } from '../m01-soldiers/src/human.mjs';
import { loadRig, sampled, BONES } from './src/rig.mjs';
import { build, TIMING, FPS, PATIENT_OFFSET, HOLD, SHOULDER_GRIP, CONTACT_SLACK } from './src/clips.mjs';
import { gaps, ground } from './src/body.mjs';
import { worldPose, localPose } from './src/fk.mjs';

const ROOT = new URL('../../../', import.meta.url);
const CHAR = 'assets/models/provisional/m01/characters/';
const OUT_DIR = `${CHAR}station-drag-transitions/`;
const FILE = 'm01_station_drag_transitions.glb';
const path = p => new URL(p, ROOT).pathname;
const sha = buf => createHash('sha256').update(buf).digest('hex');
const REUSED = [`${CHAR}m01_soldier_pl_lod1.glb`, `${CHAR}m01_soldier_animations.glb`, `${CHAR}m01_station_animations.glb`, `${CHAR}station-animations.manifest.json`];
const before = Object.fromEntries(REUSED.map(f => { const b = readFileSync(path(f)); return [f, { bytes: b.length, sha256: sha(b) }]; }));

const rig = loadRig(path(`${CHAR}m01_soldier_pl_lod1.glb`));
const files = { soldierClips: path(`${CHAR}m01_soldier_animations.glb`), stationClips: path(`${CHAR}m01_station_animations.glb`) };
const B = build(rig, files);
const frames = B.frames();
const times = frames.map(f => f.t), T = TIMING.duration, n = frames.length - 1;

// ——— Extremos: os frames 0 e final são exactamente as poses amostradas dos GLB reais ———
const exact = (fr, L) => { for (const b of BONES) { fr.local[b] = L[b].r; if (fr.trans[b]) fr.trans[b] = L[b].t; } };
exact(frames[0].medic, B.crouch.L); exact(frames[n].medic, B.drag.L);
exact(frames[0].patient, B.wounded.L);
const TRANS = ['root', 'hips', 'weapon', 'weapon_bolt', 'weapon_mag', 'weapon_clip'];

/** Clip three.js a partir de uma sequência de poses (rotações de todos os ossos, translações das raízes e adereços). */
function makeClip(name, poses, userData) {
  const tracks = [];
  for (const b of BONES) {
    const values = poses.map(p => [...p.local[b]]);
    for (let i = 1; i < values.length; i++) if (values[i].reduce((s, v, k) => s + v * values[i - 1][k], 0) < 0) values[i] = values[i].map(v => -v);
    tracks.push(new THREE.QuaternionKeyframeTrack(`${b}.quaternion`, times, values.flat()));
    if (TRANS.includes(b)) tracks.push(new THREE.VectorKeyframeTrack(`${b}.position`, times, poses.flatMap(p => p.trans[b] ?? rig.skel[b].t)));
  }
  // Médico sem arma visível e paciente desarmado: weapon e clipe escondidos (degrau); carregador da rkm na escala 1.
  for (const [b, s] of [['weapon', 0], ['weapon_clip', 0], ['weapon_mag', 1]]) tracks.push(new THREE.VectorKeyframeTrack(`${b}.scale`, [0, T], [s, s, s, s, s, s], THREE.InterpolateDiscrete));
  const clip = new THREE.AnimationClip(name, T, tracks);
  clip.userData = userData;
  return clip;
}

const r4 = x => Math.round(x * 1e4) / 1e4, v4 = a => a.map(r4);
const ev = { grab: { hands_contact: TIMING.hands_contact, grip_ready: TIMING.grip_ready }, release: { hands_release: r4(T - TIMING.grip_ready), settled: T } };
const medicPoses = frames.map(f => f.medic), patientPoses = frames.map(f => f.patient);
const START = { medic: { file: 'm01_soldier_animations.glb', clip: 'crouched_idle', time: 0 }, drag: { file: 'm01_station_animations.glb', clip: 'drag_wounded', time: 0 },
  wounded: { file: 'm01_soldier_animations.glb', clip: 'wounded', time: 0 }, hold: { file: FILE, clip: 'station_drag_patient_grab', time: T } };
const common = { duration: T, fps: FPS, loop: false, in_place: true, estimated: true, patient_root_offset_m: PATIENT_OFFSET };
const CLIPS = [
  makeClip('station_drag_medic_grab', medicPoses, { ...common, role: 'medic', pair: 'station_drag_patient_grab', events: ev.grab, from: START.medic, to: START.drag }),
  makeClip('station_drag_patient_grab', patientPoses, { ...common, role: 'patient', pair: 'station_drag_medic_grab', events: ev.grab, from: START.wounded, to: START.hold }),
  makeClip('station_drag_medic_release', [...medicPoses].reverse(), { ...common, role: 'medic', pair: 'station_drag_patient_release', events: ev.release, from: START.drag, to: START.medic }),
  makeClip('station_drag_patient_release', [...patientPoses].reverse(), { ...common, role: 'patient', pair: 'station_drag_medic_release', events: ev.release, from: START.hold, to: START.wounded }),
];

// ——— Esqueleto sem malhas (os nomes e a hierarquia do rig) ———
const scene = new THREE.Scene(), bones = new Map();
for (const b of GAME_BONES) {
  const bone = new THREE.Bone(); bone.name = b.name; bone.position.fromArray(rig.skel[b.name].t); bones.set(b.name, bone);
  if (b.parent) bones.get(b.parent).add(bone); else scene.add(bone);
}
scene.userData = { units: 'metres', forward: '-Z', author: 'COD Guerra original procedural animation', in_place: true };
// O GLTFExporter precisa da API FileReader do navegador para os Blob, sem DOM.
globalThis.FileReader = class { readAsArrayBuffer(blob) { blob.arrayBuffer().then(v => { this.result = v; this.onloadend?.(); }); } };
const glb = Buffer.from(await new GLTFExporter().parseAsync(scene, { binary: true, animations: CLIPS, onlyVisible: false }));

// ——— Medidas para o manifesto (no referencial do médico; paciente com a raiz em PATIENT_OFFSET) ———
const CONTACT = ['hand_l', 'hand_r', 'forearm_l', 'forearm_r'];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const handToShoulder = f => Math.max(...['l', 'r'].map(s => dist(f.medic.W[`hand_${s}`].p, f.patient.Wm[`upperarm_${s}`].p)));
const worst = (list, keep) => list.filter(keep).reduce((m, x) => (x.gap < m.gap ? x : m), { gap: Infinity });
const report = frames.map(f => {
  const g = gaps(f.medic.W, f.patient.Wm);
  return { t: f.t, contact: worst(g, x => CONTACT.includes(x.a)), other: worst(g, x => !CONTACT.includes(x.a)), hand_shoulder: handToShoulder(f),
    ik: Math.max(...['l', 'r'].map(s => dist(f.medic.W[`hand_${s}`].p, f.targets[s]))), ground: ground(f.patient.Wm) };
});
const atT = t => report[Math.round(t * FPS)];
const wc = report.reduce((m, r) => (r.contact.gap < m.gap ? { ...r.contact, t: r.t } : m), { gap: Infinity });
const wo = report.reduce((m, r) => (r.other.gap < m.gap ? { ...r.other, t: r.t } : m), { gap: Infinity });
const woundedGap = Math.max(...['l', 'r'].map(s => dist(B.drag.W[`hand_${s}`].p, B.flat.Wm[`upperarm_${s}`].p)));
const contactPhase = report.filter(r => r.t >= TIMING.hands_contact - 1e-9);
const endpoints = [
  ['crouched_idle t0 + wounded t0', B.crouch.W, B.flat.Wm], ['drag_wounded t0 + pose de arrasto', B.drag.W, B.hold.Wm],
].map(([name, M, P]) => { const g = gaps(M, P)[0]; return { pair: name, closest: `${g.a}/${g.b}`, gap_m: r4(g.gap) }; });
// Arrasto em ciclo com o paciente parado na pose de arrasto (último frame do agarrar).
const dragClip = sampled(rig, files.stationClips, 'drag_wounded', 0).clip, loop = [];
for (let i = 0; i <= 42; i++) {
  const W = worldPose(rig.skel, localPose(rig.skel, dragClip, i / FPS));
  loop.push({ hand: Math.max(...['l', 'r'].map(s => dist(W[`hand_${s}`].p, B.socketAt(B.hold.Wm, s, B.sockets[s].grip)))), gap: gaps(W, B.hold.Wm)[0] });
}

await mkdir(path(OUT_DIR), { recursive: true });
await writeFile(path(OUT_DIR + FILE), glb);
const after = Object.fromEntries(REUSED.map(f => { const b = readFileSync(path(f)); return [f, { bytes: b.length, sha256: sha(b) }]; }));
for (const f of REUSED) if (after[f].sha256 !== before[f].sha256) throw new Error(`${f} mudou durante a geração`);

const manifest = {
  status: 'PROTÓTIPO JOGÁVEL — kit provisório de apresentação; sem playtest humano nem medição no Chromebook',
  license: 'Original do projecto COD Guerra (animação procedimental); licença final do projecto pendente da decisão do dono',
  author: 'COD Guerra — clips procedimentais originais; solver e rig do kit M01 dos soldados preservado',
  units: 'metres', up: '+Y', forward: '-Z', fps: FPS,
  files: { [FILE]: { bytes: glb.length, sha256: sha(glb), clips: CLIPS.map(c => ({ name: c.name, ...c.userData })) } },
  reused: Object.fromEntries(REUSED.map(f => [f.replace(CHAR, ''), after[f]])),
  rig: { source: 'm01_soldier_pl_lod1.glb', bones: BONES.length, bind: 'nós do GLB sem alterações; eixos de ligação alinhados com o mundo', unchanged: true },
  timing: {
    duration_s: T, estimated: true, clock: 'O par grab (médico + paciente) e o par release partilham duração e relógio: iniciar os dois no mesmo instante.',
    grab: { approach: [0, TIMING.hands_contact], hands_contact: TIMING.hands_contact, grip: [TIMING.hands_contact, TIMING.grip_ready], grip_ready: TIMING.grip_ready, lift: [TIMING.grip_ready, T] },
    release: { lower: [0, r4(T - TIMING.grip_ready)], hands_release: r4(T - TIMING.grip_ready), open_and_clear: [r4(T - TIMING.grip_ready), r4(T - TIMING.hands_contact)], hands_clear: r4(T - TIMING.hands_contact), settled: T, return: [r4(T - TIMING.hands_contact), T] },
    events: {
      hands_contact: 'as mãos do médico pousam nos ombros do ferido deitado',
      grip_ready: 'pega fechada; começa a erguer o tronco do ferido',
      hands_release: 'o ferido volta a ficar de costas no chão; a pega abre (as mãos largam os ombros em hands_clear)',
      settled: 'ambos nas poses de chegada: médico em crouched_idle t=0, ferido em wounded t=0',
    },
    note: 'Eventos de apresentação em extras de cada clip. A simulação continua a decidir associação, trajecto, entrega e baixa; não há gameplay, horários nem flags nos clips.',
  },
  endpoints: {
    station_drag_medic_grab: 'crouched_idle t=0 → drag_wounded t=0 (frames exactos)',
    station_drag_patient_grab: 'wounded t=0 → pose de arrasto (tronco erguido pelos sovacos, bacia e pernas no chão, de costas)',
    station_drag_medic_release: 'drag_wounded t=0 → crouched_idle t=0 (percurso inverso)',
    station_drag_patient_release: 'pose de arrasto → wounded t=0 (percurso inverso; fica de costas no chão)',
    patient_drag_pose: `Último frame de station_drag_patient_grab = primeiro de station_drag_patient_release. O renderer actual mantém o paciente em 'wounded' durante drag_wounded: as mãos do médico ficam a ${r4(woundedGap)} m dos ombros. Com a pose de arrasto ficam a ${r4(atT(T).hand_shoulder)} m; para manter o contacto, a integração deve segurar o último frame do agarrar (clampWhenFinished) enquanto dura o arrasto.`,
  },
  pair: {
    patient_root_offset_m: PATIENT_OFFSET,
    patient_facing: 'igual à do médico (cabeça do ferido para o médico, +Z do paciente)',
    runtime: 'M01Simulation: paciente em medic + 0,92 m na direcção facing; raiz renderizada com rotação −facing − π/2 (rig virado para −Z).',
    root_motion: `nenhum: o osso root fica na translação de ligação [${rig.skel.root.t.map(r4)}] e sem rotação em todos os frames; a anca move-se só dentro do corpo`,
  },
  sockets: {
    frame: 'osso upperarm_l/upperarm_r do paciente (posição e rotação no mundo); offsets em metros nesse referencial',
    shoulder_on_ground: { l: v4(B.sockets.l.shoulder), r: v4(B.sockets.r.shoulder), from_upperarm_world: SHOULDER_GRIP, note: 'mão em cima do ombro do ferido deitado (hands_contact)' },
    armpit_grip: { l: v4(B.sockets.l.grip), r: v4(B.sockets.r.grip), note: 'posição exacta das mãos do frame 0 de drag_wounded com o paciente na pose de arrasto (debaixo dos sovacos, por trás)' },
    carry_socket: 'não usado (não é o transporte ao ombro de Bąk)',
  },
  patient_drag_pose: { hips_tilt_deg: HOLD.hips_tilt_deg, spine_pitch_deg: HOLD.spine_pitch_deg, legs: 'pés e mãos com os alvos de wounded t=0 (mãos na coxa direita)', supine: true },
  checks: {
    method: 'cápsulas entre ossos (src/body.mjs; raios estimados com fardamento) medidas em todos os frames; FK própria e AnimationMixer nos testes',
    contact_slack_m: CONTACT_SLACK,
    hands_contact: { hand_to_shoulder_m: r4(atT(TIMING.hands_contact).hand_shoulder) },
    grip_ready: { hand_to_shoulder_m: r4(atT(TIMING.grip_ready).hand_shoulder) },
    drag_pose: { hand_to_shoulder_m: r4(atT(T).hand_shoulder) },
    max_hand_to_shoulder_after_contact_m: r4(Math.max(...contactPhase.map(r => r.hand_shoulder))),
    max_ik_error_m: r4(Math.max(...report.map(r => r.ik))),
    worst_contact_overlap: { pair: `${wc.a}/${wc.b}`, t: r4(wc.t), gap_m: r4(wc.gap), note: 'mão/antebraço do médico contra o corpo do ferido; inclui o aperto da pega' },
    worst_other_overlap: { pair: `${wo.a}/${wo.b}`, t: r4(wo.t), gap_m: r4(wo.gap), note: 'o pé esquerdo do médico junto ao ombro esquerdo do ferido já existe nas poses reais dos extremos (ver endpoints_existing)' },
    endpoints_existing: endpoints,
    patient_ground_min_m: r4(Math.min(...report.map(r => r.ground))),
    drag_loop_with_patient_hold: { frames: loop.length, max_hand_to_grip_m: r4(Math.max(...loop.map(l => l.hand))), worst_gap_m: r4(Math.min(...loop.map(l => l.gap.gap))) },
  },
  sources: {
    estimates: [
      'Durações (1,6 s) e instantes dos eventos estimados, sem captura de movimento.',
      'Pega pelos sovacos por trás (arrasto de costas) inferida do clip drag_wounded existente e da posição do paciente na simulação; não é uma técnica documentada para 1939.',
      'Raios das cápsulas de contacto estimados para o soldado provisório.',
    ],
  },
  note: 'Apresentação apenas. Não altera rig, malhas, clips anteriores, src/, simulação ou engine. Galeria em docs/assets/m01-station-drag-transitions/ não é playtest nem medição de FPS.',
};
await writeFile(path(`${OUT_DIR}manifest.json`), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ file: FILE, bytes: glb.length, sha256: sha(glb), clips: CLIPS.map(c => c.name), frames: frames.length, checks: manifest.checks }, null, 1));
