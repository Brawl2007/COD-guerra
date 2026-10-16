// Galeria isolada dos vagões queimados e danificados de M01 (Chromium + GLTFLoader/AnimationMixer oficiais do three.js):
// intacto/queimado/danificado lado a lado, interiores, rodas e engates, sockets, três LODs, leitura do LOD2 à distância
// e relatório de importação. Não é playtest nem medição de FPS.
// Saída: docs/assets/m01-wagon-damage/*.png e import-report.json
// Uso: CHROME_EXECUTABLE=… node tools/assets/m01-wagon-damage/render/capture.mjs [compare|interiors|details|sockets|lods|train|report …]
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { openStage } from './stage.mjs';

const ROOT = new URL('../../../../', import.meta.url).pathname;
const OUT = join(ROOT, 'docs/assets/m01-wagon-damage');
const DIR = '/assets/models/provisional/m01-wagon-damage/', manifest = JSON.parse(readFileSync(join(ROOT, DIR, 'manifest.json')));
const url = (type, state = 'intact', lod = 'lod0') => state === 'intact' ? `/assets/models/provisional/m01-wagons/m01_wagon_${type}_${lod}.glb` : `${DIR}m01_wagon_${type}_${state}_${lod}.glb`;
const NAME = { intact: 'intacto', burned: 'queimado', damaged: 'danificado' }, TYPE = { covered: 'coberto', open: 'aberto' };
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

/** Vagões em `cars` ([url, [x, y, z]]); câmara a d m do alvo `at` com azimute/elevação em graus (az 0 = de frente, −Z; 90 = lado direito, +X), no referencial do vagão. */
const tile = (o) => scene(o.w ?? 600, o.h ?? 338, async (o) => {
  const s = window.stage; if (o.ground === false) s.ground(false); if (o.sky) s.background(o.sky);
  // flip: vagões rodados 180° em Y e câmara do outro lado, para ver o lado direito (+X) com o sol do palco.
  const f = o.flip ? -1 : 1, fp = p => [f * p[0], p[1], f * p[2]];
  for (const [u, pos] of o.cars) {
    await s.load(u);
    const dur = o.clip ? (s.clips(u).find(c => c.name === o.clip)?.duration ?? 0) : 0;
    await s.add(u, { position: fp(pos), rotationY: o.flip ? Math.PI : 0, show: o.show ?? null, clip: dur ? o.clip : null, time: Math.min(o.t ?? 0, dur - 1e-4) });
  }
  if (o.marks) s.markers(o.marks.map(fp), o.markColor);
  const p = fp(o.at), A = (o.az + (o.flip ? 180 : 0)) * Math.PI / 180, E = o.el * Math.PI / 180;
  s.camera([p[0] + o.d * Math.sin(A) * Math.cos(E), p[1] + o.d * Math.sin(E), p[2] - o.d * Math.cos(A) * Math.cos(E)], p, o.fov ?? 30); s.label(o.label);
}, o);
const one = (type, state, lod = 'lod0') => [[url(type, state, lod), [0, 0, 0]]];
const STATES = ['intact', 'burned', 'damaged'];

const VIEWS = {
  async compare() {
    const tiles = [];
    for (const type of ['covered', 'open']) {
      const at = [0, type === 'covered' ? 1.9 : 1.4, 0];
      for (const state of STATES) tiles.push(await tile({ flip: true, cars: one(type, state), at, d: 16, az: 55, el: 14, label: `${TYPE[type]} ${NAME[state]}: 3/4 frente, lado direito (+X)` }));
      for (const state of STATES) tiles.push(await tile({ cars: one(type, state), at, d: 16, az: -125, el: 10, label: `${TYPE[type]} ${NAME[state]}: 3/4 traseira, lado esquerdo` }));
    }
    save('damage_compare.png', grid(tiles, 3));
    // Lado a lado na mesma via, encostados pelos tampões (passo de 9,10 m): intacto, queimado, danificado.
    const row = [];
    for (const type of ['covered', 'open']) {
      const cars = STATES.map((s, i) => [url(type, s), [0, 0, (i - 1) * 9.1]]);
      row.push(await tile({ flip: true, w: 1200, h: 338, cars, at: [0, 1.6, 0], d: 31, fov: 16, az: 90, el: 5, label: `${TYPE[type]}, lado direito (+X): danificado (+Z), queimado, intacto (−Z), da esquerda para a direita;\nencostados pelos tampões com passo de 9,10 m; grelha de 1 m` }));
    }
    save('damage_side_by_side.png', grid(row, 1));
  },
  async interiors() {
    const tiles = [
      await tile({ cars: one('covered', 'burned'), at: [0, 1.6, 0], d: 11, az: 30, el: 62, label: 'coberto queimado: interior de cima (sem tejadilho), cinza e tábuas caídas' }),
      await tile({ cars: one('covered', 'burned'), at: [-0.3, 1.9, 0], d: 6.5, az: 90, el: 14, label: 'coberto queimado: pela porta direita, arco do tejadilho caído' }),
      await tile({ cars: one('covered', 'damaged'), at: [1.0, 2.0, 1.7], d: 3.6, az: 70, el: 6, label: 'coberto danificado: interior pelo furo de impacto' }),
      await tile({ cars: one('covered', 'damaged'), at: [-1.0, 2.0, 0.7], d: 8, az: -70, el: 12, clip: 'doors_open', t: 1.5, label: 'coberto danificado: doors_open (só a porta esquerda), interior' }),
      await tile({ cars: one('open', 'burned'), at: [0, 1.4, 0], d: 12, az: 120, el: 50, label: 'aberto queimado: carga carbonizada, taipais ardidos' }),
      await tile({ cars: one('open', 'damaged'), at: [0, 1.4, -0.5], d: 11, az: -60, el: 50, label: 'aberto danificado: interior, rombo no taipal direito' }),
    ];
    save('damage_interiors.png', grid(tiles, 3));
  },
  async details() {
    const w = 400, h = 400, tiles = [
      await tile({ w, h, flip: true, cars: one('covered', 'burned'), at: [1.0, 0.6, -2.0], d: 3.4, az: 60, el: 8, label: 'queimado: rodado com ferrugem e fuligem leves\n(à sombra da caixa quase não se distingue)' }),
      await tile({ w, h, flip: true, cars: one('covered', 'intact'), at: [1.0, 0.6, -2.0], d: 3.4, az: 60, el: 8, label: 'intacto: o mesmo rodado (referência)' }),
      await tile({ w, h, flip: true, cars: one('covered', 'damaged'), at: [0.4, 1.0, 4.4], d: 3.0, az: 150, el: 12, label: 'danificado: tampão traseiro direito\namolgado; gancho e tensor' }),
      await tile({ w, h, cars: one('covered', 'burned'), at: [0, 1.0, -4.4], d: 3.2, az: -25, el: 12, label: 'queimado: tampões, gancho, degrau\ne topo ardido' }),
      await tile({ w, h, flip: true, cars: one('covered', 'damaged'), at: [1.45, 2.1, 1.72], d: 2.6, az: 95, el: 4, label: 'danificado: furo com lascas, estilhaços,\nfuligem e diagonal empurrada' }),
      await tile({ w, h, flip: true, cars: one('covered', 'damaged'), at: [1.5, 2.3, -0.2], d: 4.2, az: 40, el: 8, label: 'danificado: porta direita fora da guia;\ncobertura do tejadilho levantada' }),
      await tile({ w, h, flip: true, cars: one('covered', 'burned'), at: [1.5, 2.6, 0.9], d: 4.6, az: 75, el: 10, label: 'queimado: porta carbonizada,\ncarril de cima cedido' }),
      await tile({ w, h, flip: true, cars: one('open', 'damaged'), at: [1.5, 2.0, -0.7], d: 4.2, az: 70, el: 10, label: 'aberto danificado: taipal rebentado,\ntábuas a pender, cantoneira dobrada' }),
    ];
    save('damage_details.png', grid(tiles, 4));
  },
  async sockets() {
    const tiles = [];
    for (const type of ['covered', 'open']) for (const state of ['burned', 'damaged']) {
      const S = manifest.states[`${type}_${state}`].sockets, marks = Object.values(S);
      tiles.push(await tile({ cars: one(type, state), marks, at: [0, 1.6, 0], d: 15, az: 60, el: 22, label: `${TYPE[type]} ${NAME[state]}: sockets (amarelo)\n${Object.keys(S).join(', ')}` }));
    }
    save('damage_sockets.png', grid(tiles, 2));
  },
  async lods() {
    const tiles = [];
    for (const type of ['covered', 'open']) for (const state of ['burned', 'damaged']) for (const lod of ['lod0', 'lod1', 'lod2'])
      tiles.push(await tile({ cars: one(type, state, lod), at: [0, 1.7, 0], d: 15, az: 60, el: 12, label: `${TYPE[type]} ${NAME[state]} ${lod}: ${manifest.files[`m01_wagon_${type}_${state}_${lod}.glb`].triangles} triângulos` }));
    save('damage_lods.png', grid(tiles, 3));
  },
  async train() {
    // 12 vagões LOD2 (intactos, queimados e danificados misturados) encostados pelos tampões, como da secção de Jan.
    const mixState = ['intact', 'burned', 'intact', 'damaged', 'intact', 'intact', 'burned', 'damaged', 'intact', 'burned', 'intact', 'damaged'];
    const cars = mixState.map((s, i) => [url(i % 3 === 2 ? 'open' : 'covered', s, 'lod2'), [0, 0, (i - 5.5) * 9.1]]);
    const f = { w: 640, h: 360, ground: false, sky: '#b9c6cf', cars, at: [0, 1.9, 0] };
    const tiles = [];
    for (const fov of [60, 15]) for (const [d, az, el, label] of [[1050, 90, 0.6, 'de lado a 1050 m'], [1200, 60, 0.5, 'a 1200 m, 30° fora do través']])
      tiles.push(await tile({ ...f, d, az, el, fov, label: `12 vagões LOD2 (4 intactos/queimados/danificados alternados) ${label}, FOV ${fov}°${fov === 15 ? ' (~4×)' : ''}` }));
    tiles.push(await tile({ ...f, cars: cars.map(([u, p]) => [u.replace('lod2', 'lod1'), p]), d: 120, az: 70, el: 4, fov: 30, label: 'LOD1 a 120 m' }));
    tiles.push(await tile({ ...f, cars: cars.map(([u, p]) => [u.replace('lod2', 'lod0'), p]), d: 40, az: 55, el: 6, fov: 40, label: 'LOD0 a 40 m' }));
    save('damage_train.png', grid(tiles, 2));
  },
  async report() {
    const out = {};
    for (const file of Object.keys(manifest.files)) {
      out[file] = await st.eval(async u => { const s = window.stage; s.clear(); await s.load(u); const i = await s.add(u); return s.report(i); }, DIR + file);
    }
    writeFileSync(join(OUT, 'import-report.json'), JSON.stringify({ viewer: 'three.js 0.186.1 GLTFLoader (Chromium/SwiftShader)', note: 'galeria isolada; não é playtest nem medição de FPS', files: out }, null, 2) + '\n');
    console.log(Object.entries(out).map(([k, v]) => `${k}: ${v.triangles} tris, finito ${v.finite}, bbox ${v.bbox.min.map(x => x.toFixed(2))} → ${v.bbox.max.map(x => x.toFixed(2))}`).join('\n'));
  },
};
const want = process.argv.slice(2);
for (const [k, fn] of Object.entries(VIEWS)) if (!want.length || want.includes(k)) await fn();
if (st.errors.length) { console.error(st.errors); process.exitCode = 1; }
await st.close();
