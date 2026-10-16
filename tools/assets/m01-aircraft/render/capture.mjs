// Galeria isolada do Ju 87 B-1 (Chromium + GLTFLoader/AnimationMixer oficiais do three.js): vistas, pormenores,
// silhueta à distância de voo e relatório de importação. Não é playtest nem medição de FPS.
// Saída: docs/assets/m01-aircraft/*.png e import-report.json
// Uso: CHROME_EXECUTABLE=… node tools/assets/m01-aircraft/render/capture.mjs [views|details|flight|report …]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { openStage } from './stage.mjs';

const ROOT = new URL('../../../../', import.meta.url).pathname;
const OUT = join(ROOT, 'docs/assets/m01-aircraft');
const B = '/assets/models/provisional/m01-aircraft/', LOD0 = B + 'm01_ju87_b1_lod0.glb';
const ON_GROUND = [0, 2.67, 0];   // rodas na grelha (a origem do avião é o centro de gravidade)
mkdirSync(OUT, { recursive: true });
const st = await openStage({ width: 600, height: 338 });

async function scene(w, h, fn, arg) {
  await st.page.setViewportSize({ width: w, height: h });
  await st.eval(([w, h]) => { const s = window.stage; s.clear(); s.resize(w, h); s.label(''); s.ground(true); s.background('#8d969a'); }, [w, h]);
  await st.eval(fn, arg);
  await st.page.evaluate(() => window.stage.render());
  return PNG.sync.read(await st.page.screenshot());
}
function grid(tiles, cols) {
  const tw = tiles[0].width, th = tiles[0].height, rows = Math.ceil(tiles.length / cols), img = new PNG({ width: tw * cols, height: th * rows });
  tiles.forEach((t, i) => { const x0 = (i % cols) * tw, y0 = Math.floor(i / cols) * th; for (let y = 0; y < th; y++) t.data.copy(img.data, ((y0 + y) * img.width + x0) * 4, y * tw * 4, (y + 1) * tw * 4); });
  return img;
}
const save = (name, png) => { writeFileSync(join(OUT, name), PNG.sync.write(png)); console.log(name, `${png.width}×${png.height}`); };

/** Avião em `pos`, câmara a d m do alvo (avião + off) com azimute/elevação em graus (az 0 = de frente, 90 = lado direito). */
const tile = (o) => scene(o.w ?? 600, o.h ?? 338, async (o) => {
  const s = window.stage; if (o.ground === false) s.ground(false); if (o.sky) s.background(o.sky);
  await s.load(o.url);
  const dur = o.clip ? s.clips(o.url).find(c => c.name === o.clip).duration : 0;
  await s.add(o.url, { position: o.pos, rotation: o.rot ?? null, clip: o.clip ?? null, time: Math.min(o.t ?? 0, dur - 1e-4), runtime: o.runtime ?? false });
  const p = o.pos.map((v, k) => v + (o.off?.[k] ?? 0)), A = o.az * Math.PI / 180, E = o.el * Math.PI / 180;
  const cam = o.cam ?? [p[0] + o.d * Math.sin(A) * Math.cos(E), p[1] + o.d * Math.sin(E), p[2] - o.d * Math.cos(A) * Math.cos(E)];
  s.camera(cam, p, o.fov ?? 30); s.label(o.label);
}, o);

const VIEWS = {
  async views() {
    const g = { url: LOD0, pos: ON_GROUND, d: 26 };
    const tiles = [
      await tile({ ...g, az: 0, el: 3, label: 'frente: gaivota invertida, trem carenado, radiador' }),
      await tile({ ...g, az: 90, el: 2, label: 'lado direito (11,10 m; grelha de 1 m)' }),
      await tile({ ...g, az: 0, el: 88, label: 'cima: envergadura 13,80 m, cruzes, lascas RLM 70/71' }),
      await tile({ ...g, az: 35, el: 20, label: '3/4 frente' }),
      await tile({ ...g, az: 150, el: 15, label: '3/4 trás: deriva sem suástica (omitida)' }),
      await tile({ url: LOD0, pos: [0, 4, 0], rot: [0, 0, Math.PI], d: 24, az: 140, el: 35, ground: false, clip: 'dive_brakes_extend', t: 1.2, label: 'por baixo (avião invertido para a luz): RLM 65, freios abertos' }),
    ];
    for (const lod of ['lod0', 'lod1', 'lod2']) tiles.push(await tile({ ...g, url: B + `m01_ju87_b1_${lod}.glb`, az: 60, el: 10, d: 24, label: lod }));
    save('ju87_views.png', grid(tiles, 3));
  },
  async details() {
    const g = { url: LOD0, pos: ON_GROUND, w: 400, h: 400 };
    const hub = [0, 0, -4.35];
    const inv = { url: LOD0, w: 400, h: 400, pos: [0, 4, 0], rot: [0, 0, Math.PI], ground: false };   // invertido: a luz chega à parte de baixo
    const tiles = [
      await tile({ ...g, off: [0, -0.2, -3.0], d: 6, az: 50, el: 10, label: 'Jumo 211: radiador sob o motor, escapes' }),
      await tile({ ...g, off: [0, 1.0, -0.2], d: 7, az: 70, el: 20, label: 'capota, atirador, MG 15' }),
      await tile({ ...g, off: [1.95, -1.5, -1.0], d: 4.5, az: 40, el: 5, label: 'trem carenado e sirene' }),
      await tile({ ...g, off: [0, 0.4, 5.6], d: 6.5, az: 120, el: 15, label: 'cauda: montantes, roda de cauda' }),
      await tile({ ...inv, off: [-3.5, 0.9, -0.6], d: 4.5, az: 120, el: 35, label: 'freio de mergulho recolhido (invertido)' }),
      await tile({ ...inv, off: [-3.5, 0.9, -0.6], d: 4.5, az: 120, el: 35, clip: 'dive_brakes_extend', t: 1.2, label: 'freio de mergulho aberto, 90° (invertido)' }),
      await tile({ ...g, off: hub, d: 7, az: 0, el: 2, clip: 'propeller_spin', t: 0, label: 'hélice: propeller_spin t = 0' }),
      await tile({ ...g, off: hub, d: 7, az: 0, el: 2, clip: 'propeller_spin', t: 1 / 12, label: 'hélice: t = 1/12 s (30°)' }),
    ];
    save('ju87_details.png', grid(tiles, 4));
  },
  async flight() {
    const f = { w: 640, h: 360, ground: false, sky: '#b9c6cf', cam: [0, 0, 0], clip: 'propeller_spin', t: 0.3, runtime: true };
    const tiles = [];
    const shots = [
      ['lod1', 300, 120, [0, -Math.PI / 2, 0], 'nivelado a 300 m (LOD1)'],
      ['lod2', 800, 300, [0, -Math.PI / 2.4, 0], 'a 800 m (LOD2)'],
      ['lod1', 400, 250, [-70 * Math.PI / 180, Math.PI, 0], 'mergulho a 70° a 400 m (LOD1, freios abertos)'],
    ];
    // Linha 1: tamanho real com FOV vertical de 60°; linha 2: a mesma cena com FOV de 15° (ampliação ~4×).
    for (const fov of [60, 15]) for (const [lod, dist, alt, rot, label] of shots) tiles.push(await tile({ ...f, fov, url: B + `m01_ju87_b1_${lod}.glb`, pos: [0, alt, -Math.sqrt(dist * dist - alt * alt)], rot,
      ...(label.includes('freios') ? { clip: 'dive_brakes_extend', t: 1.2 } : {}), label: `${label}, FOV ${fov}°${fov === 15 ? ' (ampliado)' : ''} — galeria, materiais do jogo` }));
    save('ju87_flight.png', grid(tiles, 3));
  },
  async report() {
    const out = {};
    for (const lod of ['lod0', 'lod1', 'lod2']) {
      const url = B + `m01_ju87_b1_${lod}.glb`;
      out[`m01_ju87_b1_${lod}.glb`] = await st.eval(async url => { const s = window.stage; s.clear(); await s.load(url); const i = await s.add(url); return s.report(i); }, url);
    }
    writeFileSync(join(OUT, 'import-report.json'), JSON.stringify({ viewer: 'three.js 0.186.1 GLTFLoader (Chromium/SwiftShader)', note: 'galeria isolada; não é playtest nem medição de FPS', files: out }, null, 2) + '\n');
    console.log('import-report.json', Object.entries(out).map(([k, v]) => `${k}: ${v.triangles} tris, finito ${v.finite}, bbox ${v.bbox.min.map(x => x.toFixed(2))} → ${v.bbox.max.map(x => x.toFixed(2))}`).join('\n'));
  },
};
const want = process.argv.slice(2);
for (const [k, fn] of Object.entries(VIEWS)) if (!want.length || want.includes(k)) await fn();
if (st.errors.length) { console.error(st.errors); process.exitCode = 1; }
await st.close();
