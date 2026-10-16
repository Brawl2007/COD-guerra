// Capturas de verificação do kit MG 34 (Chromium + GLTFLoader/AnimationMixer oficiais do three.js), reutilizando o
// palco dos soldados (../m01-soldiers/render). A MG 34 é presa ao osso `weapon` do soldado alemão actual, sem a Kar98k
// (`rifle`) nem o clipe, e os clips vêm de m01_mg34_animations.glb, como no jogo. Não é playtest nem medição de FPS.
// Saída: docs/assets/m01-mg34/*.png e import-report.json
// Uso: CHROME_EXECUTABLE=… node tools/assets/m01-mg34/render/capture.mjs [mg34_views|mg34_in_hands|mg34_reload|report …]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from '../../m01-soldiers/node_modules/pngjs/lib/png.js';
import { openStage } from '../../m01-soldiers/render/stage.mjs';

const ROOT = new URL('../../../../', import.meta.url).pathname;
const OUT = join(ROOT, 'docs/assets/m01-mg34');
const W = '/assets/models/provisional/m01/weapons/mg34/', MG = W + 'm01_mg34_lod0.glb', ANIM = W + 'm01_mg34_animations.glb';
const DE = '/assets/models/provisional/m01/characters/m01_soldier_de_lod0.glb';
const GUNNER = ['body', 'gear', 'head_de_a', 'helmet_m35'];   // sem `rifle` (Kar98k) nem `clip`: uma só arma visível
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

// Arma sozinha, 1 m acima da grelha (quadrados de 0,5 m); câmara a d m com azimute/elevação em graus (0 = frente/boca).
// `clip`/`t`: instante de um clip de m01_mg34_animations.glb aplicado só aos nós da arma (tampa, tambor, cinta).
const weaponTile = (o) => scene(o.w ?? 600, o.h ?? 300, async ([o, ANIM]) => {
  const s = window.stage, A = o.az * Math.PI / 180, E = o.el * Math.PI / 180, tg = o.target ?? [0, 1, -0.16];
  if (o.clip) await s.load(ANIM);
  await s.add(o.url, { position: [0, 1, 0], ...(o.show ? { show: o.show } : {}), ...(o.clip ? { clip: o.clip, time: o.t, anims: ANIM } : {}) });
  s.camera([tg[0] + o.d * Math.sin(A) * Math.cos(E), tg[1] + o.d * Math.sin(E), tg[2] - o.d * Math.cos(A) * Math.cos(E)], tg, o.fov ?? 30); s.label(o.label);
}, [o, ANIM]);

// Atirador alemão com a MG 34 presa ao osso `weapon`, no instante t (s) de um clip; câmara apontada a um osso.
const handsTile = (clip, t, bone, d, az, el, label, fov = 32, show = GUNNER) => scene(400, 400, async ([DE, MG, ANIM, GUNNER, clip, t, bone, d, az, el, label, fov]) => {
  const s = window.stage; await s.load(ANIM);
  const dur = s.clips(ANIM).find(c => c.name === clip).duration;
  const a = await s.add(DE, { show: GUNNER, clip, time: Math.min(dur - 1e-3, t), anims: ANIM });
  const g = await s.add(MG); s.attach(g, a, 'weapon');
  const p = s.bone(a, bone), A = az * Math.PI / 180, E = el * Math.PI / 180;
  s.camera([p[0] + d * Math.sin(A) * Math.cos(E), p[1] + d * Math.sin(E), p[2] - d * Math.cos(A) * Math.cos(E)], p, fov); s.label(label);
  return { soldier: s.info(a).meshes, weapon: s.info(g).meshes };
}, [DE, MG, ANIM, show, clip, t, bone, d, az, el, label, fov]);

const STOWED = ['mg34_body', 'mg34_feed_cover', 'mg34_cocking_handle', 'mg34_drum', 'mg34_belt'];
const VIEWS = {
  async mg34_views() {
    const side = { url: MG, d: 1.75, el: 4 };
    const tiles = [
      await weaponTile({ ...side, az: 90, label: 'MG 34 (1939) — lado direito: alavanca de armar (1,219 m; grelha de 0,5 m)' }),
      await weaponTile({ ...side, az: -90, label: 'lado esquerdo: tambor de cinta de 50 (Gurttrommel 34)' }),
      await weaponTile({ url: MG, show: [...STOWED, 'mg34_bipod_open'], d: 1.8, az: 60, el: 16, target: [0, 0.9, -0.2], label: 'bípode aberto (posição dianteira)' }),
      await weaponTile({ url: MG, d: 1.3, az: 150, el: 30, target: [0, 1, -0.1], label: '3/4 de trás: coronha, tampa, alça tangente' }),
      await weaponTile({ url: MG, d: 0.55, az: 70, el: 14, target: [0, 1.02, -0.6], label: 'manga perfurada, aro, reforçador de recuo, massa' }),
      await weaponTile({ url: MG, d: 0.5, az: -125, el: 38, target: [-0.05, 1.04, -0.03], clip: 'mg34_reload', t: 2.85, label: 'tampa aberta (dobradiça à frente), cinta na caixa' }),
    ];
    for (const lod of ['lod0', 'lod1', 'lod2']) tiles.push(await weaponTile({ ...side, url: W + `m01_mg34_${lod}.glb`, az: 90, label: lod }));
    save('mg34_views.png', grid(tiles, 3));
  },
  async mg34_in_hands() {
    const tiles = [
      await handsTile('mg34_aim', 0, 'spine_02', 2.6, 35, 6, 'mg34_aim — atirador alemão (só a MG 34 visível)'),
      await handsTile('mg34_aim', 0, 'spine_02', 2.4, 90, 4, 'mg34_aim — perfil'),
      await handsTile('mg34_aim', 0, 'head', 0.8, 70, 4, 'face na coronha, olho na linha de mira (sem capacete)', 32, ['body', 'gear', 'head_de_a']),
      await handsTile('mg34_aim', 0, 'weapon', 1.0, 40, 14, 'mão direita no punho, esquerda no bípode dobrado'),
      await handsTile('mg34_fire_burst', 0.02, 'spine_02', 2.4, 60, 6, 'mg34_fire_burst — 1.º tiro: recuo'),
      await handsTile('mg34_fire_burst', 0.47, 'spine_02', 2.4, 60, 6, '7.º tiro (0,45 s): subida da boca'),
      await handsTile('mg34_fire_burst', 0.47, 'hand_l', 0.9, -120, 10, '7.º tiro: lado esquerdo, tambor'),
      await handsTile('mg34_fire_burst', 1.02, 'spine_02', 2.4, 60, 6, 'fim da rajada (1,02 s): de volta à pontaria'),
    ];
    console.log('malhas visíveis:', JSON.stringify(tiles[0].out));
    save('mg34_in_hands.png', grid(tiles, 4));
  },
  async mg34_reload() {
    const R = (t, label, bone = 'weapon', d = 1.1, az = -55, el = 25) => handsTile('mg34_reload', t, bone, d, az, el, `mg34_reload ${t.toFixed(2)} s — ${label}`);
    const tiles = [
      await R(0.6, 'mão esquerda no fecho da tampa'),
      await R(0.85, 'tampa aberta (cover_open)'),
      await R(1.35, 'tambor vazio solto (drum_off)', 'spine_01', 1.6, -50, 15),
      await R(1.65, 'tambor largado a cair', 'spine_01', 1.8, -50, 10),
      await R(2.05, 'novo tambor recebido à esquerda', 'spine_01', 1.6, -50, 15),
      await R(2.75, 'tambor engatado, cinta na caixa (belt_in)'),
      await R(3.6, 'tampa fechada; mão direita puxa a alavanca', 'weapon', 1.0, 60, 25),
      await R(4.4, 'fim: de volta à pontaria', 'spine_02', 2.4, 40, 6),
    ];
    save('mg34_reload.png', grid(tiles, 4));
  },
  async report() {
    const out = {};
    for (const lod of ['lod0', 'lod1', 'lod2']) {
      const u = W + `m01_mg34_${lod}.glb`;
      out[`m01_mg34_${lod}.glb`] = await st.eval(async u => { const s = window.stage; s.clear(); const i = await s.add(u); return s.info(i); }, u);
    }
    out['m01_mg34_animations.glb'] = await st.eval(async u => { const s = window.stage; await s.load(u); return s.clips(u); }, ANIM);
    writeFileSync(join(OUT, 'import-report.json'), JSON.stringify({ viewer: 'three.js 0.186.1 GLTFLoader (Chromium/SwiftShader)', note: 'galeria isolada; não é playtest nem medição de FPS', files: out }, null, 2) + '\n');
    console.log(JSON.stringify(out));
  },
};
const want = process.argv.slice(2);
for (const [k, fn] of Object.entries(VIEWS)) if (!want.length || want.includes(k)) await fn();
if (st.errors.length) { console.error(st.errors); process.exitCode = 1; }
await st.close();
