// Capturas de verificação do kit rkm wz.28 (Chromium + GLTFLoader/AnimationMixer oficiais do three.js), reutilizando
// o palco dos soldados (../m01-soldiers/render). A rkm é presa ao osso `weapon` de Kowal e os clips vêm do GLB
// m01_rkm_wz28_animations.glb, como no jogo. Saída: docs/assets/m01-rkm-wz28/*.png
// Uso: CHROME_EXECUTABLE=… node tools/assets/m01-rkm-wz28/render/capture.mjs [rkm_views|rkm_in_hands …]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from '../../m01-soldiers/node_modules/pngjs/lib/png.js';
import { openStage } from '../../m01-soldiers/render/stage.mjs';

const ROOT = new URL('../../../../', import.meta.url).pathname;
const OUT = join(ROOT, 'docs/assets/m01-rkm-wz28');
const W = '/assets/models/provisional/m01/weapons/rkm_wz28/', RKM = W + 'm01_rkm_wz28_lod0.glb', ANIM = W + 'm01_rkm_wz28_animations.glb';
const PL = '/assets/models/provisional/m01/characters/m01_soldier_pl_lod0.glb';
const KOWAL = ['body', 'gear', 'head_kowal', 'helmet_wz31', 'rank_st_strzelec'];   // sem `rifle` nem `clip`
mkdirSync(OUT, { recursive: true });
const st = await openStage({ width: 400, height: 400 });

async function scene(w, h, fn, arg) {
  await st.page.setViewportSize({ width: w, height: h });
  await st.eval(([w, h]) => { const s = window.stage; s.clear(); s.resize(w, h); s.label(''); s.ground(true); }, [w, h]);
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

// Arma sozinha, 1 m acima da grelha (quadrados de 0,5 m), câmara a d m com azimute/elevação em graus (0 = frente/boca).
const weaponTile = (url, show, d, az, el, label, target = [0, 1, -0.2], w = 600, h = 300) => scene(w, h, async ([url, show, d, az, el, label, target]) => {
  const s = window.stage, A = az * Math.PI / 180, E = el * Math.PI / 180;
  await s.add(url, { position: [0, 1, 0], ...(show ? { show } : {}) });
  s.camera([target[0] + d * Math.sin(A) * Math.cos(E), target[1] + d * Math.sin(E), target[2] - d * Math.cos(A) * Math.cos(E)], target, 30); s.label(label);
}, [url, show, d, az, el, label, target]);

// Kowal com a rkm presa ao osso `weapon`, num instante f (0..1) de um clip; câmara apontada a um osso.
const handsTile = (clip, f, bone, d, az, el, label, fov = 32) => scene(400, 400, async ([PL, RKM, ANIM, KOWAL, clip, f, bone, d, az, el, label, fov]) => {
  const s = window.stage; await s.load(ANIM);
  const dur = s.clips(ANIM).find(c => c.name === clip).duration;
  const a = await s.add(PL, { show: KOWAL, clip, time: Math.min(dur - 1e-3, f * dur), anims: ANIM });
  const r = await s.add(RKM); s.attach(r, a, 'weapon');
  const p = s.bone(a, bone), A = az * Math.PI / 180, E = el * Math.PI / 180;
  s.camera([p[0] + d * Math.sin(A) * Math.cos(E), p[1] + d * Math.sin(E), p[2] - d * Math.cos(A) * Math.cos(E)], p, fov); s.label(label);
}, [PL, RKM, ANIM, KOWAL, clip, f, bone, d, az, el, label, fov]);

const BODY = ['rkm_body', 'rkm_magazine', 'rkm_charging_handle'];
const VIEWS = {
  async rkm_views() {
    const tiles = [
      await weaponTile(RKM, null, 1.55, 90, 4, 'rkm wz.28 — lado direito (1,11 m; grelha de 0,5 m)'),
      await weaponTile(RKM, null, 1.55, -90, 4, 'lado esquerdo: alavanca de armar, selector'),
      await weaponTile(RKM, [...BODY, 'rkm_bipod_open'], 1.6, 60, 18, 'bípode aberto (patins)', [0, 0.95, -0.25]),
      await weaponTile(RKM, null, 1.4, 150, 32, '3/4 de trás: alça em quadro, coronha', [0, 1, -0.15]),
      await weaponTile(RKM, null, 0.55, 75, 12, 'caixa, punho de pistola, carregador de 20', [0, 0.97, -0.03]),
      await weaponTile(RKM, null, 0.45, 55, 15, 'tubo de gases, regulador, bípode, massa', [0, 1, -0.62]),
    ];
    for (const lod of ['lod0', 'lod1', 'lod2']) tiles.push(await weaponTile(W + `m01_rkm_wz28_${lod}.glb`, null, 1.55, 90, 4, lod));
    save('rkm_views.png', grid(tiles, 3));
  },
  async rkm_in_hands() {
    const tiles = [
      await handsTile('rkm_carry', 0, 'spine_02', 2.4, 25, 6, 'transporte (rkm_carry) — 3/4'),
      await handsTile('rkm_carry', 0.25, 'spine_02', 2.4, 90, 6, 'transporte — perfil'),
      await handsTile('rkm_carry', 0, 'hand_r', 0.6, 40, 10, 'transporte — mãos no punho e no fuste'),
      await handsTile('rkm_aim', 0, 'spine_02', 2.4, 60, 8, 'pontaria (rkm_aim)'),
      await handsTile('rkm_aim', 0, 'head', 0.65, 10, 4, 'face na coronha, olho na linha de mira'),
      await handsTile('rkm_fire_burst', 0.04, 'spine_02', 2.4, 60, 8, 'disparo (rkm_fire_burst, 1.º tiro: recuo)'),
      await handsTile('rkm_fire_burst', 0.3, 'hand_l', 0.75, 120, 10, 'rajada: 3.º tiro, subida da boca'),
      await handsTile('rkm_fire_burst', 0.04, 'weapon', 1.0, 35, 12, 'mão esquerda no fuste, direita no punho'),
    ];
    save('rkm_in_hands.png', grid(tiles, 4));
  },
};
const want = process.argv.slice(2);
for (const [k, fn] of Object.entries(VIEWS)) if (!want.length || want.includes(k)) await fn();
if (st.errors.length) { console.error(st.errors); process.exitCode = 1; }
await st.close();
