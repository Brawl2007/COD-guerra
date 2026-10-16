// Galeria isolada dos vagões de M01 (Chromium + GLTFLoader/AnimationMixer oficiais do three.js): vistas,
// pormenores, composição à distância da secção de Jan e relatório de importação. Não é playtest nem medição de FPS.
// Saída: docs/assets/m01-wagons/*.png e import-report.json
// Uso: CHROME_EXECUTABLE=… node tools/assets/m01-wagons/render/capture.mjs [views|details|train|report …]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { openStage } from './stage.mjs';

const ROOT = new URL('../../../../', import.meta.url).pathname;
const OUT = join(ROOT, 'docs/assets/m01-wagons');
const B = '/assets/models/provisional/m01-wagons/', url = (type, lod = 'lod0') => `${B}m01_wagon_${type}_${lod}.glb`;
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

/** Vagões em `cars` ([url, z]); câmara a d m do alvo `at` com azimute/elevação em graus (az 0 = de frente, −Z; 90 = lado direito). */
const tile = (o) => scene(o.w ?? 600, o.h ?? 338, async (o) => {
  const s = window.stage; if (o.ground === false) s.ground(false); if (o.sky) s.background(o.sky);
  for (const [u, z] of o.cars) {
    await s.load(u);
    const dur = o.clip ? (s.clips(u).find(c => c.name === o.clip)?.duration ?? 0) : 0;
    await s.add(u, { position: [0, 0, z], show: o.show ?? null, clip: dur ? o.clip : null, time: Math.min(o.t ?? 0, dur - 1e-4) });
  }
  const p = o.at, A = o.az * Math.PI / 180, E = o.el * Math.PI / 180;
  s.camera([p[0] + o.d * Math.sin(A) * Math.cos(E), p[1] + o.d * Math.sin(E), p[2] - o.d * Math.cos(A) * Math.cos(E)], p, o.fov ?? 30); s.label(o.label);
}, o);
const one = (type, lod = 'lod0') => [[url(type, lod), 0]];
const MID = [0, 1.9, 0];

const VIEWS = {
  async views() {
    const c = { cars: one('covered'), at: MID, d: 17 }, o = { cars: one('open'), at: [0, 1.4, 0], d: 16 };
    const tiles = [
      await tile({ ...c, az: -35, el: 12, label: 'coberto (tipo G): 3/4 frente' }),
      await tile({ ...c, az: -90, el: 2, label: 'coberto: lado esquerdo (9,10 m entre tampões; grelha de 1 m)' }),
      await tile({ ...c, az: 0, el: 3, d: 12, label: 'coberto: topo, tampões a 1,75 m, tejadilho em arco' }),
      await tile({ ...c, az: -70, el: 12, d: 12, clip: 'doors_open', t: 1.5, label: 'coberto: doors_open (porta corrida 1,95 m), interior' }),
      await tile({ ...o, az: -35, el: 18, label: 'aberto (tipo O): 3/4 frente' }),
      await tile({ ...o, az: 120, el: 45, d: 13, label: 'aberto: interior dos taipais' }),
    ];
    for (const lod of ['lod0', 'lod1', 'lod2']) tiles.push(await tile({ cars: one('covered', lod), at: MID, d: 15, az: -60, el: 10, label: `coberto ${lod}` }));
    save('wagons_views.png', grid(tiles, 3));
  },
  async details() {
    const c = { cars: one('covered'), w: 400, h: 400 };
    const tiles = [
      await tile({ ...c, at: [-1.0, 0.6, -2.0], d: 3.4, az: -60, el: 8, label: 'rodado, caixa de eixo, mola, sapata' }),
      await tile({ ...c, at: [0, 1.0, -4.4], d: 3.2, az: -25, el: 12, label: 'tampões, gancho e tensor, degrau' }),
      await tile({ ...c, at: [-1.5, 2.2, 0.6], d: 5, az: -70, el: 6, label: 'porta de correr fechada' }),
      await tile({ ...c, at: [-1.5, 2.2, 0.6], d: 5, az: -70, el: 6, clip: 'doors_open', t: 1.5, label: 'porta aberta: abertura de 1,80 m' }),
      await tile({ ...c, at: [-0.75, 0.5, -2.0], d: 2.4, az: -90, el: 0, show: ['wheelset_1'], clip: 'wheels_roll', t: 0, label: 'wheels_roll t = 0 (só o rodado, sem a sombra da caixa)' }),
      await tile({ ...c, at: [-0.75, 0.5, -2.0], d: 2.4, az: -90, el: 0, show: ['wheelset_1'], clip: 'wheels_roll', t: 1 / 12, label: 'wheels_roll t = 1/12 s (30°)' }),
      await tile({ ...c, at: [0, 3.2, -3.9], d: 6, az: -30, el: 30, label: 'tejadilho, topo, montantes, ventiladores' }),
      await tile({ cars: one('open'), w: 400, h: 400, at: [0, 1.5, -0.5], d: 7, az: -50, el: 55, label: 'aberto: soalho e portas fixas' }),
    ];
    save('wagons_details.png', grid(tiles, 4));
  },
  async train() {
    // 12 vagões alternados (LOD2) encostados pelos tampões, vistos a 1050 m e a 1200 m como da secção de Jan.
    const cars = Array.from({ length: 12 }, (_, i) => [url(i % 3 === 2 ? 'open' : 'covered', 'lod2'), (i - 5.5) * 9.1]);
    const f = { w: 640, h: 360, ground: false, sky: '#b9c6cf', cars, at: [0, 1.9, 0], clip: 'wheels_roll', t: 0 };
    const tiles = [];
    for (const fov of [60, 15]) for (const [d, az, el, label] of [[1050, -90, 0.6, 'de lado a 1050 m'], [1200, -60, 0.5, 'a 1200 m, 30° fora do través']])
      tiles.push(await tile({ ...f, d, az, el, fov, label: `12 vagões LOD2 ${label}, FOV ${fov}°${fov === 15 ? ' (ampliado ~4×)' : ''} — galeria isolada` }));
    tiles.push(await tile({ ...f, cars: cars.map(([u, z]) => [u.replace('lod2', 'lod1'), z]), d: 120, az: -70, el: 4, fov: 30, label: 'LOD1 a 120 m (pátio, margem oeste)' }));
    tiles.push(await tile({ ...f, cars: cars.map(([u, z]) => [u.replace('lod2', 'lod0'), z]), d: 40, az: -55, el: 6, fov: 40, label: 'LOD0 a 40 m' }));
    save('wagons_train.png', grid(tiles, 2));
  },
  async report() {
    const out = {};
    for (const type of ['covered', 'open']) for (const lod of ['lod0', 'lod1', 'lod2']) {
      const u = url(type, lod);
      out[`m01_wagon_${type}_${lod}.glb`] = await st.eval(async u => { const s = window.stage; s.clear(); await s.load(u); const i = await s.add(u); return s.report(i); }, u);
    }
    writeFileSync(join(OUT, 'import-report.json'), JSON.stringify({ viewer: 'three.js 0.186.1 GLTFLoader (Chromium/SwiftShader)', note: 'galeria isolada; não é playtest nem medição de FPS', files: out }, null, 2) + '\n');
    console.log(Object.entries(out).map(([k, v]) => `${k}: ${v.triangles} tris, finito ${v.finite}, bbox ${v.bbox.min.map(x => x.toFixed(2))} → ${v.bbox.max.map(x => x.toFixed(2))}`).join('\n'));
  },
};
const want = process.argv.slice(2);
for (const [k, fn] of Object.entries(VIEWS)) if (!want.length || want.includes(k)) await fn();
if (st.errors.length) { console.error(st.errors); process.exitCode = 1; }
await st.close();
