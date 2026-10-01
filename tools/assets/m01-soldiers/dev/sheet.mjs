// Folha de contacto de clips: node dev/sheet.mjs <glb> <saída.png> clip:t1,t2,... [clip:...]  (tempos em fracção 0..1)
// Opções por variável: VIEW=front|side|back|3q, SHOW=malha1,malha2 ; CARRY=1 junta o "carried" ao carry_socket.
import { openStage } from '../render/stage.mjs';
const [url, out, ...specs] = process.argv.slice(2);
const cells = specs.flatMap(s => { const [clip, ts] = s.split(':'); return (ts ?? '0').split(',').map(t => [clip, +t]); });
const st = await openStage({ width: Math.min(1800, 300 * cells.length + 100), height: 640 });
const res = await st.eval(async ([u, cells, view, show]) => {
  const s = window.stage, gap = 1.0, info = [];
  const yaw = { front: 0, side: Math.PI / 2, back: Math.PI, '3q': Math.PI / 5 }[view] ?? 0;
  for (const [i, [clip, f]] of cells.entries()) {
    await s.load(u);
    const dur = s.clips(u).find(c => c.name === clip).duration;
    const a = await s.add(u, { position: [-(i - (cells.length - 1) / 2) * gap, 0, 0], rotationY: yaw, clip, time: Math.min(dur - 1e-3, f * dur), show: show ? show.split(',') : null });
    info.push([clip, f, s.bbox(a)]);
  }
  s.camera([0, 1.0, -2.2 - cells.length * 0.55], [0, 0.75, 0], 32);
  return info;
}, ['/' + url, cells, process.env.VIEW ?? 'front', process.env.SHOW ?? null]);
for (const [c, f, b] of res) console.log(c, f, 'min', b.min.map(x => x.toFixed(2)).join(','), 'max', b.max.map(x => x.toFixed(2)).join(','));
await st.shot(out);
if (st.errors.length) console.error(st.errors);
await st.close();
