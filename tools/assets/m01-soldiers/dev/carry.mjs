// Transporte de Bąk: transportador (carry_wounded) com o ferido (carried) preso ao carry_socket, três vistas.
import { openStage } from '../render/stage.mjs';
const [url, out, f = '0.25'] = process.argv.slice(2);
const st = await openStage({ width: 1500, height: 650 });
await st.eval(async ([u, f]) => {
  const s = window.stage; await s.load(u);
  const dur = s.clips(u).find(c => c.name === 'carry_wounded').duration, dc = s.clips(u).find(c => c.name === 'carried').duration;
  for (const [k, yaw] of [0, Math.PI / 2, Math.PI].entries()) {
    const a = await s.add(u, { position: [(1 - k) * 1.3, 0, 0], rotationY: yaw, clip: 'carry_wounded', time: f * dur });
    const b = await s.add(u, { clip: 'carried', time: f * dc });
    s.attach(b, a, 'carry_socket');
  }
  s.camera([0, 1.1, -5.2], [0, 0.9, 0], 32);
}, ['/' + url, +f]);
await st.shot(out);
if (st.errors.length) console.error(st.errors);
await st.close();
