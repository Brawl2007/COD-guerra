// Grandes planos de um clip, enquadrados num osso: node dev/close.mjs <glb> <saída.png> <osso> <clip:t1,t2,...> [dist] [az°] [el°]
// Cada tempo é uma imagem 400×400; o resultado junta-as na horizontal.
import { openStage } from '../render/stage.mjs';
import { PNG } from 'pngjs';
import { writeFileSync } from 'node:fs';
const [url, out, bone, spec, dist = '0.9', az = '40', el = '15'] = process.argv.slice(2);
const [clip, ts] = spec.split(':'), times = ts.split(',').map(Number);
const st = await openStage({ width: 400, height: 400 });
const tiles = [];
for (const f of times) {
  await st.eval(async ([u, clip, f, bone, d, az, el]) => {
    const s = window.stage; s.clear(); await s.load(u);
    const dur = s.clips(u).find(c => c.name === clip).duration;
    const a = await s.add(u, { clip, time: Math.min(dur - 1e-3, f * dur) });
    const p = s.bone(a, bone), A = az * Math.PI / 180, E = el * Math.PI / 180;
    s.camera([p[0] + d * Math.sin(A) * Math.cos(E), p[1] + d * Math.sin(E), p[2] - d * Math.cos(A) * Math.cos(E)], p, 35);
    s.label(`${clip} t=${(f * dur).toFixed(2)}s`);
  }, ['/' + url, clip, f, bone, +dist, +az, +el]);
  await st.page.evaluate(() => window.stage.render());
  tiles.push(PNG.sync.read(await st.page.screenshot()));
}
const W = tiles.reduce((s, t) => s + t.width, 0), H = tiles[0].height, img = new PNG({ width: W, height: H });
let x0 = 0;
for (const t of tiles) { for (let y = 0; y < H; y++) t.data.copy(img.data, (y * W + x0) * 4, y * t.width * 4, (y + 1) * t.width * 4); x0 += t.width; }
writeFileSync(out, PNG.sync.write(img));
if (st.errors.length) console.error(st.errors);
await st.close();
