// Capturas de verificação do kit ckm wz.30 (Chromium + GLTFLoader/AnimationMixer oficiais do three.js), reutilizando o
// palco dos soldados (../m01-soldiers/render). A ckm fica no chão com o seu clip ckm_wz30_gun_*; o atirador e o
// municiador são o soldado polaco actual, postos nos lugares `crew` do manifesto, com os clips de
// m01_ckm_wz30_animations.glb, como no jogo. As malhas `rifle` e `clip` ficam ligadas: os clips escalam-nas a 0
// (uma só arma visível). Galeria isolada: não é playtest nem medição de FPS.
// Saída: docs/assets/m01-ckm-wz30/*.png e import-report.json
// Uso: CHROME_EXECUTABLE=… node tools/assets/m01-ckm-wz30/render/capture.mjs [ckm_views|ckm_lods|ckm_hands|ckm_crew|ckm_clips|report …]
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from '../../m01-soldiers/node_modules/pngjs/lib/png.js';
import { openStage } from '../../m01-soldiers/render/stage.mjs';

const ROOT = new URL('../../../../', import.meta.url).pathname;
const OUT = join(ROOT, 'docs/assets/m01-ckm-wz30');
const W = '/assets/models/provisional/m01/weapons/ckm_wz30/', CKM = W + 'm01_ckm_wz30_lod0.glb', ANIM = W + 'm01_ckm_wz30_animations.glb';
const PL = '/assets/models/provisional/m01/characters/m01_soldier_pl_lod0.glb';
const CREW = JSON.parse(readFileSync(join(ROOT, W, 'manifest.json'))).crew;
const SHOW = { gunner: ['body', 'gear', 'head_pl_a', 'helmet_wz31', 'rifle', 'clip'], loader: ['body', 'gear', 'head_pl_a', 'helmet_wz31', 'rifle', 'clip'] };
mkdirSync(OUT, { recursive: true });
const st = await openStage({ width: 400, height: 400 });

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
 * Cena: a ckm (url) no chão com o clip ckm_wz30_gun_<kind> no instante t e, se `crew`, o atirador e o municiador nos
 * lugares do manifesto com os clips do mesmo sufixo. Câmara: alvo tg, distância d, azimute/elevação em graus
 * (0 = à frente da boca, 90 = lado direito da arma).
 */
const tile = (o) => scene(o.w ?? 480, o.h ?? 360, async ([o, CKM, ANIM, PL, CREW, SHOW]) => {
  const s = window.stage, A = o.az * Math.PI / 180, E = o.el * Math.PI / 180, tg = o.target ?? [0, 0.45, -0.1], kind = o.kind;
  const out = {};
  if (o.crew) {
    await s.load(ANIM);
    const dur = s.clips(ANIM).find(c => c.name === `ckm_wz30_gunner_${kind}`).duration, t = Math.min(dur - 1e-3, o.t ?? 0);
    for (const role of o.crew) {
      const c = CREW[role], i = await s.add(PL, { show: SHOW[role], clip: `ckm_wz30_${role}_${kind}`, time: t, anims: ANIM, position: c.pos, rotationY: c.yaw * Math.PI / 180 });
      out[role] = s.info(i).meshes;
    }
  }
  const g = await s.add(o.url ?? CKM, kind ? { clip: `ckm_wz30_gun_${kind}`, time: o.t ?? 0 } : {});
  out.ckm = s.info(g);
  const target = o.bone ? s.bone(o.boneActor ?? 0, o.bone) : tg;
  s.camera([target[0] + o.d * Math.sin(A) * Math.cos(E), target[1] + o.d * Math.sin(E), target[2] - o.d * Math.cos(A) * Math.cos(E)], target, o.fov ?? 30); s.label(o.label);
  return out;
}, [o, CKM, ANIM, PL, CREW, SHOW]);

const VIEWS = {
  async ckm_views() {
    const tiles = [
      await tile({ d: 3.2, az: 90, el: 6, label: 'ckm wz.30 no tripé — lado direito (arma 1,2 m; grelha de 0,5 m)' }),
      await tile({ d: 3.2, az: -90, el: 6, label: 'lado esquerdo: fita de 330 e caixa de aço caqui' }),
      await tile({ d: 2.6, az: -40, el: 22, label: '3/4 da frente: manga de água, tapa-chamas cónico' }),
      await tile({ d: 2.4, az: 150, el: 28, label: '3/4 de trás: punho, alça, fuso de elevação, barra' }),
      await tile({ d: 0.75, az: -60, el: 35, target: [-0.08, 0.66, 0.08], label: 'alimentação pela esquerda; alavanca à direita' }),
      await tile({ d: 0.7, az: 120, el: 30, target: [0.06, 0.62, 0.15], label: 'saída da fita vazia e alavanca de armar (direita)' }),
      await tile({ d: 0.7, az: 60, el: 12, target: [0, 0.64, -0.68], label: 'bucim, massa e tapa-chamas ("lejek")' }),
      await tile({ d: 1.0, az: -120, el: 30, target: [-0.33, 0.15, 0.08], label: 'caixa 355 × 175 × 85 mm, tampa aberta (110°)' }),
      await tile({ d: 0.9, az: 170, el: 12, target: [0, 0.55, 0.3], label: 'punho de madeira, gatilho, alça em quadro' }),
    ];
    save('ckm_views.png', grid(tiles, 3));
  },
  async ckm_lods() {
    const tiles = [];
    for (const lod of ['lod0', 'lod1', 'lod2']) {
      const t = await tile({ url: W + `m01_ckm_wz30_${lod}.glb`, d: 2.8, az: -60, el: 18, label: lod });
      t.out.lod = lod; tiles.push(t);
    }
    for (const lod of ['lod0', 'lod1', 'lod2']) tiles.push(await tile({ url: W + `m01_ckm_wz30_${lod}.glb`, d: 0.9, az: -60, el: 30, target: [-0.1, 0.6, 0.1], label: `${lod} — alimentação` }));
    for (const t of tiles.slice(0, 3)) console.log(t.out.lod, t.out.ckm.triangles, 'triângulos', t.out.ckm.drawCalls, 'draw calls');
    save('ckm_lods.png', grid(tiles, 3));
  },
  async ckm_hands() {
    const G = { crew: ['gunner'] }, L = { crew: ['loader'] }, B = { crew: ['gunner', 'loader'] };
    const tiles = [
      await tile({ ...G, kind: 'aim', bone: 'hand_r', d: 0.75, az: 110, el: 20, label: 'atirador: mão direita no punho, dedo no gatilho' }),
      await tile({ ...G, kind: 'aim', bone: 'hand_l', d: 0.75, az: -110, el: 25, label: 'atirador: mão esquerda no lado da caixa' }),
      await tile({ ...G, kind: 'aim', bone: 'head', d: 0.9, az: 90, el: 4, label: 'olho direito na linha de mira (alça–massa)' }),
      await tile({ ...G, kind: 'feed', t: 1.2, bone: 'hand_r', d: 0.75, az: 120, el: 30, label: 'alimentação 1,2 s: puxa a ponta da fita para a direita' }),
      await tile({ ...G, kind: 'feed', t: 1.7, bone: 'hand_r', d: 0.75, az: 120, el: 25, label: 'alimentação 1,7 s: alavanca atrás (palma para cima)' }),
      await tile({ ...L, kind: 'aim', bone: 'hand_r', d: 1.1, az: -10, el: 60, label: 'municiador: mãos na fita (esquerda por baixo)' }),
      await tile({ ...L, kind: 'feed', t: 0.5, bone: 'hand_r', d: 0.85, az: 45, el: 55, label: 'alimentação 0,5 s: municiador mete a ponta pela esquerda' }),
      await tile({ ...B, kind: 'fire_burst', t: 0.42, bone: 'hand_r', d: 1.1, az: -150, el: 40, label: 'rajada 0,42 s: alavanca recua, fita avança' }),
      await tile({ ...B, kind: 'feed', t: 0.95, bone: 'hand_r', d: 1.2, az: 180, el: 45, label: 'alimentação 0,95 s: as duas mãos na fita' }),
    ];
    console.log('malhas visíveis:', JSON.stringify(tiles[0].out.gunner));
    save('ckm_hands.png', grid(tiles, 3));
  },
  async ckm_crew() {
    const B = { crew: ['gunner', 'loader'], target: [-0.2, 0.55, 0.25] };
    const tiles = [
      await tile({ ...B, kind: 'aim', d: 4.2, az: -45, el: 18, label: 'ckm_wz30_*_aim — atirador sentado, municiador de joelho' }),
      await tile({ ...B, kind: 'aim', d: 4.0, az: -100, el: 8, label: 'aim — lado esquerdo (fita e caixa entre os dois)' }),
      await tile({ ...B, kind: 'aim', d: 4.0, az: 160, el: 22, label: 'aim — por trás' }),
      await tile({ ...B, kind: 'idle', t: 1.5, d: 4.2, az: -45, el: 18, label: 'ckm_wz30_*_idle — espera' }),
      await tile({ ...B, kind: 'fire_burst', t: 0.4, d: 4.0, az: 60, el: 14, label: 'ckm_wz30_*_fire_burst — 5.º tiro (0,4 s)' }),
      await tile({ ...B, kind: 'abandon', t: 2.4, d: 4.6, az: -60, el: 22, label: 'ckm_wz30_*_abandon — 2,4 s: a sair do posto' }),
    ];
    console.log('malhas visíveis:', JSON.stringify(tiles[0].out));
    save('ckm_crew.png', grid(tiles, 3));
  },
  async ckm_clips() {
    const B = { crew: ['gunner', 'loader'], target: [-0.2, 0.55, 0.25], d: 3.6, az: -70, el: 20 };
    const tiles = [];
    for (const t of [0, 0.8, 1.3, 1.7, 2.25, 3.2]) tiles.push(await tile({ ...B, kind: 'feed', t, d: 3.3, az: 30, el: 38, target: [-0.15, 0.55, 0.15], label: `ckm_wz30_*_feed ${t.toFixed(2)} s` }));
    for (const t of [0, 0.4, 1.0, 1.6, 2.2, 3.0]) tiles.push(await tile({ ...B, kind: 'abandon', t, d: 4.6, label: `ckm_wz30_*_abandon ${t.toFixed(2)} s` }));
    save('ckm_clips.png', grid(tiles, 6));
  },
  async report() {
    const out = {};
    for (const lod of ['lod0', 'lod1', 'lod2']) {
      const u = W + `m01_ckm_wz30_${lod}.glb`;
      out[`m01_ckm_wz30_${lod}.glb`] = await st.eval(async u => { const s = window.stage; s.clear(); const i = await s.add(u); return { ...s.info(i), clips: s.clips(u) }; }, u);
    }
    out['m01_ckm_wz30_animations.glb'] = await st.eval(async u => { const s = window.stage; await s.load(u); return s.clips(u); }, ANIM);
    writeFileSync(join(OUT, 'import-report.json'), JSON.stringify({ viewer: 'three.js 0.186.1 GLTFLoader (Chromium/SwiftShader)', note: 'galeria isolada; não é playtest nem medição de FPS', files: out }, null, 2) + '\n');
    console.log(JSON.stringify(out).slice(0, 400));
  },
};
const want = process.argv.slice(2);
for (const [k, fn] of Object.entries(VIEWS)) if (!want.length || want.includes(k)) await fn();
if (st.errors.length) { console.error(st.errors); process.exitCode = 1; }
await st.close();
