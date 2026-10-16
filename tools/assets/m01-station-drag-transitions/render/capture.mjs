// Capturas de verificação das transições do arrasto da estação (Chromium + GLTFLoader/AnimationMixer oficiais do
// three.js), no palco dos soldados (../m01-soldiers/render). Médico e paciente são o soldado polaco actual sem
// espingarda nem clipe; o paciente tem a raiz em +0,92 m na direcção do facing do médico. Galeria isolada: não é
// playtest nem medição de FPS, e não corre a partida.
// Saída: docs/assets/m01-station-drag-transitions/*.png e import-report.json
// Uso: CHROME_EXECUTABLE=… node tools/assets/m01-station-drag-transitions/render/capture.mjs [grab|release|contacts|pause|report …]
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from '../../m01-soldiers/node_modules/pngjs/lib/png.js';
import { openStage } from '../../m01-soldiers/render/stage.mjs';

const ROOT = new URL('../../../../', import.meta.url).pathname;
const OUT = join(ROOT, 'docs/assets/m01-station-drag-transitions');
const PL = '/assets/models/provisional/m01/characters/m01_soldier_pl_lod0.glb';
const SOLDIER = '/assets/models/provisional/m01/characters/m01_soldier_animations.glb';
const STATION = '/assets/models/provisional/m01/characters/m01_station_animations.glb';
const ANIM = '/assets/models/provisional/m01/characters/station-drag-transitions/m01_station_drag_transitions.glb';
const MANIFEST = JSON.parse(readFileSync(join(ROOT, 'assets/models/provisional/m01/characters/station-drag-transitions/manifest.json'), 'utf8'));
const OFFSET = MANIFEST.pair.patient_root_offset_m, T = MANIFEST.timing.duration_s;
const MEDIC = ['body', 'gear', 'head_pl_a', 'helmet_wz31'];      // sem `rifle` nem `clip`
const PATIENT = ['body', 'gear', 'head_nowicki', 'helmet_wz31'];
const CENTER = [0, 0.4, -0.5];
mkdirSync(OUT, { recursive: true });
const st = await openStage({ width: 400, height: 340 });

async function scene(w, h, fn, arg) {
  await st.page.setViewportSize({ width: w, height: h });
  await st.eval(([w, h]) => { const s = window.stage; s.clear(); s.resize(w, h); s.label(''); s.ground(true); }, [w, h]);
  const out = await st.eval(fn, arg);
  await st.page.evaluate(() => window.stage.render());
  return Object.assign(PNG.sync.read(await st.page.screenshot()), { out });
}
function grid(tiles, cols) {
  const tw = tiles[0].width, th = tiles[0].height, rows = Math.ceil(tiles.length / cols), img = new PNG({ width: tw * cols, height: th * rows });
  tiles.forEach((t, i) => { const x0 = (i % cols) * tw, y0 = Math.floor(i / cols) * th; for (let y = 0; y < th; y++) t.data.copy(img.data, ((y0 + y) * img.width + x0) * 4, y * tw * 4, (y + 1) * tw * 4); });
  return img;
}
const save = (name, png) => { writeFileSync(join(OUT, name), PNG.sync.write(png)); console.log(name, `${png.width}×${png.height}`); };

/**
 * Par no instante: médico com `medic` = [url, clip, t] e paciente com `patient` = [url, clip, t] (raiz em OFFSET).
 * Câmara a d m de CENTER com azimute/elevação em graus (az 0 = à frente do médico; 90 = lado direito do médico).
 */
const VIEW = { side: { az: 90, el: 8, d: 3.7 }, front: { az: 0, el: 16, d: 3.5 }, top: { az: 90, el: 82, d: 3.4 }, close: { az: 60, el: 25, d: 2.0 } };
const pairTile = o => scene(o.w ?? 400, o.h ?? 340, async ([o, PL, MEDIC, PATIENT, OFFSET, CENTER]) => {
  const s = window.stage;
  const dur = (url, c) => { const x = s.clips(url).find(k => k.name === c); return x.duration; };
  for (const u of new Set([o.medic[0], o.patient[0]])) await s.load(u);
  const m = await s.add(PL, { show: MEDIC, clip: o.medic[1], time: Math.min(dur(o.medic[0], o.medic[1]), o.medic[2]), anims: o.medic[0] });
  const p = await s.add(PL, { show: PATIENT, clip: o.patient[1], time: Math.min(dur(o.patient[0], o.patient[1]), o.patient[2]), anims: o.patient[0], position: OFFSET });
  const c = o.target ?? CENTER, A = o.view.az * Math.PI / 180, E = o.view.el * Math.PI / 180, d = o.view.d;
  s.camera([c[0] + d * Math.sin(A) * Math.cos(E), c[1] + d * Math.sin(E), c[2] - d * Math.cos(A) * Math.cos(E) + (o.view.el > 60 ? 0.001 : 0)], c, o.fov ?? 30); s.label(o.label);
  const b = n => s.bone(m, n), q = n => s.bone(p, n);
  return { hands: { l: b('hand_l'), r: b('hand_r') }, shoulders: { l: q('upperarm_l'), r: q('upperarm_r') }, medicRoot: b('root'), patientRoot: q('root'), meshes: [s.info(m).meshes, s.info(p).meshes] };
}, [o, PL, MEDIC, PATIENT, OFFSET, CENTER]);

const fmt = t => `${t.toFixed(2)} s`;
const eventAt = (events, t) => Object.entries(events).filter(([, v]) => Math.abs(v - t) < 1e-6).map(([k]) => k).join(', ');
async function sequence(kind, times) {
  const tiles = [], ev = MANIFEST.files['m01_station_drag_transitions.glb'].clips.find(c => c.name === `station_drag_medic_${kind}`).events;
  for (const [vn, view] of Object.entries({ side: VIEW.side, front: VIEW.front, top: VIEW.top }))
    for (const t of times) {
      const e = eventAt(ev, t);
      tiles.push(await pairTile({ view, medic: [ANIM, `station_drag_medic_${kind}`, t], patient: [ANIM, `station_drag_patient_${kind}`, t], label: `${kind} ${fmt(t)} · ${vn}${e ? `\n${e}` : ''}` }));
    }
  return grid(tiles, times.length);
}

const VIEWS = {
  async grab() { save('drag_grab_sequence.png', await sequence('grab', [0, 0.35, MANIFEST.timing.grab.hands_contact, MANIFEST.timing.grab.grip_ready, 1.3, T])); },
  async release() { save('drag_release_sequence.png', await sequence('release', [0, 0.35, MANIFEST.timing.release.hands_release, MANIFEST.timing.release.hands_clear, 1.25, T])); },
  async contacts() {
    const tiles = [];
    const g = MANIFEST.timing.grab;
    for (const [t, label] of [[g.hands_contact, 'hands_contact'], [g.grip_ready, 'grip_ready'], [1.3, 'a erguer'], [T, 'fim do agarrar = pose de arrasto']])
      tiles.push(await pairTile({ view: VIEW.close, target: [0, 0.38, -0.45], medic: [ANIM, 'station_drag_medic_grab', t], patient: [ANIM, 'station_drag_patient_grab', t], label: `${label} (${fmt(t)})` }));
    // Durante o ciclo drag_wounded: paciente parado na pose de arrasto (último frame do agarrar) e, para comparação, o
    // renderer actual com o paciente em `wounded`.
    for (const t of [0, 0.35, 0.7, 1.05])
      tiles.push(await pairTile({ view: VIEW.close, target: [0, 0.38, -0.45], medic: [STATION, 'drag_wounded', t], patient: [ANIM, 'station_drag_patient_grab', T], label: `drag_wounded ${fmt(t)} + pose de arrasto` }));
    tiles.push(await pairTile({ view: VIEW.side, medic: [STATION, 'drag_wounded', 0], patient: [SOLDIER, 'wounded', 0], label: 'actual: drag_wounded + wounded\n(mãos longe dos ombros)' }));
    tiles.push(await pairTile({ view: VIEW.side, medic: [STATION, 'drag_wounded', 0], patient: [ANIM, 'station_drag_patient_grab', T], label: 'drag_wounded + pose de arrasto' }));
    tiles.push(await pairTile({ view: VIEW.side, medic: [SOLDIER, 'crouched_idle', 0], patient: [SOLDIER, 'wounded', 0], label: 'extremo real: crouched_idle + wounded' }));
    tiles.push(await pairTile({ view: VIEW.side, medic: [ANIM, 'station_drag_medic_grab', 0], patient: [ANIM, 'station_drag_patient_grab', 0], label: 'grab t=0 (deve ser igual)' }));
    save('drag_contacts.png', grid(tiles, 4));
  },
  /** Pausa e restauro: o mesmo instante renderizado directamente e depois de saltar para outro tempo e voltar. */
  async pause() {
    const tiles = [], diffs = [];
    for (const kind of ['grab', 'release']) {
      const t = 1.1, other = 0.2;
      const shot = async (seq) => scene(400, 340, async ([seq, PL, MEDIC, PATIENT, OFFSET, ANIM, kind]) => {
        const s = window.stage; await s.load(ANIM);
        const m = await s.add(PL, { show: MEDIC, clip: `station_drag_medic_${kind}`, time: seq[0], anims: ANIM });
        const p = await s.add(PL, { show: PATIENT, clip: `station_drag_patient_${kind}`, time: seq[0], anims: ANIM, position: OFFSET });
        for (const x of seq.slice(1)) { s.setTime(m, x); s.setTime(p, x); }
        s.camera([2.4, 1.1, -0.45], [0, 0.32, -0.45], 30); s.label(`${kind} ${seq.join(' → ')} s`);
        return null;
      }, [seq, PL, MEDIC, PATIENT, OFFSET, ANIM, kind]);
      const a = await shot([t]), b = await shot([t, other, t]);
      // Comparação sem a etiqueta (faixa de cima).
      let diff = 0; for (let y = 40; y < a.height; y++) for (let x = 0; x < a.width; x++) { const k = (y * a.width + x) * 4; if (a.data[k] !== b.data[k] || a.data[k + 1] !== b.data[k + 1] || a.data[k + 2] !== b.data[k + 2]) diff++; }
      diffs.push({ clip_pair: kind, time: t, via: other, differing_pixels: diff });
      tiles.push(a, b);
    }
    save('drag_pause_restore.png', grid(tiles, 4));
    return diffs;
  },
  async report(pause) {
    const r = await st.eval(async ([ANIM, PL]) => {
      const s = window.stage; await s.load(ANIM); await s.load(PL);
      return { clips: s.clips(ANIM) };
    }, [ANIM, PL]);
    const g = MANIFEST.timing.grab, at = {};
    for (const [k, t] of [['hands_contact', g.hands_contact], ['grip_ready', g.grip_ready], ['drag_pose', T]]) {
      const o = (await pairTile({ view: VIEW.side, medic: [ANIM, 'station_drag_medic_grab', t], patient: [ANIM, 'station_drag_patient_grab', t] })).out;
      const d = s => Math.hypot(...o.hands[s].map((x, i) => x - o.shoulders[s][i]));
      at[k] = { hand_to_shoulder_m: { l: +d('l').toFixed(4), r: +d('r').toFixed(4) }, medic_root: o.medicRoot, patient_root: o.patientRoot.map(x => +x.toFixed(4)) };
    }
    const report = {
      note: 'Importação real no Chromium (GLTFLoader + AnimationMixer + SkeletonUtils do three.js) sobre m01_soldier_pl_lod0.glb. Galeria isolada; não é playtest nem medição de FPS.',
      three: (await st.eval(() => window.THREE_REVISION ?? null)) ?? 'ver package.json (three 0.186.1)',
      clips: r.clips, rendered_contacts: at, pause_restore: pause, errors: st.errors,
    };
    writeFileSync(join(OUT, 'import-report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('import-report.json', JSON.stringify(report.pause_restore), st.errors.length, 'erros');
  },
};

const want = process.argv.slice(2);
const run = want.length ? want : ['grab', 'release', 'contacts', 'pause', 'report'];
let pause = null;
for (const v of run) { const out = await VIEWS[v](pause); if (v === 'pause') pause = out; }
if (run.includes('report') && !pause) console.log('(report sem pause: corre os dois juntos para registar a pausa)');
await st.close();
