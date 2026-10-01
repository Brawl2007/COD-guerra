// Captura de desenvolvimento no Chromium (SwiftShader) com o viewer oficial do three.js.
// Uso (a partir de qualquer pasta; o servidor serve a raiz do repositório):
//   node dev/shot.mjs <glb relativo à raiz do repo> <saída.png> [views|chest] [malhas,separadas,por,vírgula]
// "views": frente, perfil, costas e o clip "test" em t=0,99. "chest": grande plano do tronco. "face": rosto.
import { openStage } from '../render/stage.mjs';

const [url, out, mode = 'views', show] = process.argv.slice(2);
const st = await openStage(mode === 'views' ? { width: 1400, height: 800 } : { width: 900, height: 900 });
await st.eval(async ([u, mode, show]) => {
  const s = window.stage, only = show ? show.split(',') : null;
  if (mode === 'views') {
    await s.add(u, { position: [-0.9, 0, 0], show: only });
    await s.add(u, { position: [0, 0, 0], rotationY: Math.PI / 2, show: only });
    await s.add(u, { position: [0.9, 0, 0], rotationY: Math.PI, show: only });
    if (s.clips(u).some(c => c.name === 'test')) await s.add(u, { position: [1.8, 0, 0], clip: 'test', time: 0.99, show: only });
    s.camera([0.45, 1.25, -4.6], [0.45, 0.9, 0], 34);
  } else if (mode === 'face') {
    await s.add(u, { show: only });
    s.camera([0.12, 1.66, -0.55], [0, 1.6, 0], 30);
  } else {
    await s.add(u, { show: only });
    s.camera([0.5, 1.35, -1.5], [0, 1.2, 0], 30);
  }
}, ['/' + url, mode, show]);
await st.shot(out);
if (st.errors.length) console.error(st.errors);
await st.close();
