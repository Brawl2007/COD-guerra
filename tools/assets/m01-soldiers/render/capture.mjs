// Capturas de verificação dos GLB entregues (Chromium + GLTFLoader/AnimationMixer oficiais do three.js), com os
// clips lidos do GLB de animações separado, como no jogo. Saída: docs/assets/m01-soldiers/*.png
// Uso (na raiz do repo ou nesta pasta): node tools/assets/m01-soldiers/render/capture.mjs [nome ...]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { openStage } from './stage.mjs';

const ROOT = new URL('../../../../', import.meta.url).pathname;
const OUT = join(ROOT, 'docs/assets/m01-soldiers');
const B = '/assets/models/provisional/m01/characters/', ANIM = B + 'm01_soldier_animations.glb';
const PL = B + 'm01_soldier_pl_lod0.glb', DE = B + 'm01_soldier_de_lod0.glb';
mkdirSync(OUT, { recursive: true });
const st = await openStage({ width: 400, height: 400 });

/** Captura uma cena (fn corre na página com window.stage) num PNG W×H. */
async function scene(w, h, fn, arg) {
  await st.page.setViewportSize({ width: w, height: h });
  await st.eval(([w, h]) => { window.stage.clear(); window.stage.resize(w, h); window.stage.label(''); }, [w, h]);
  await st.eval(fn, arg);
  await st.page.evaluate(() => window.stage.render());
  return PNG.sync.read(await st.page.screenshot());
}
/** Junta imagens em grelha (cols colunas). */
function grid(tiles, cols) {
  const tw = tiles[0].width, th = tiles[0].height, rows = Math.ceil(tiles.length / cols), img = new PNG({ width: tw * cols, height: th * rows });
  tiles.forEach((t, i) => { const x0 = (i % cols) * tw, y0 = Math.floor(i / cols) * th; for (let y = 0; y < th; y++) t.data.copy(img.data, ((y0 + y) * img.width + x0) * 4, y * tw * 4, (y + 1) * tw * 4); });
  return img;
}
const save = (name, png) => { writeFileSync(join(OUT, name), PNG.sync.write(png)); console.log(name, `${png.width}×${png.height}`); };

// Actor único, câmara apontada a um osso (distância, azimute e elevação em graus; azimute 0 = de frente).
const actorTile = (url, opts, bone, d, az, el, label, fov = 32) => scene(400, 400, async ([url, opts, bone, d, az, el, label, fov, anim]) => {
  const s = window.stage; await s.load(url); if (opts.clip) await s.load(anim);
  let time = 0;
  if (opts.clip) time = Math.min(s.clips(anim).find(c => c.name === opts.clip).duration - 1e-3, opts.f * s.clips(anim).find(c => c.name === opts.clip).duration);
  const a = await s.add(url, { ...opts, time, anims: opts.clip ? anim : null });
  const p = s.bone(a, bone), A = az * Math.PI / 180, E = el * Math.PI / 180;
  s.camera([p[0] + d * Math.sin(A) * Math.cos(E), p[1] + d * Math.sin(E), p[2] - d * Math.cos(A) * Math.cos(E)], p, fov);
  s.label(label);
}, [url, opts, bone, d, az, el, label, fov, ANIM]);

const VIEWS = {
  async lineup_pl() {
    const vis = ['body', 'gear', 'rifle', 'clip'];
    const tiles = [];
    for (const [label, az, show] of [
      ['Strzelec (wz.31) — frente', 0, [...vis, 'head_wrona', 'helmet_wz31']], ['3/4', 40, [...vis, 'head_wrona', 'helmet_wz31']], ['costas', 180, [...vis, 'head_wrona', 'helmet_wz31']],
      ['Wrona com rogatywka wz.37', 20, [...vis, 'head_wrona', 'cap_wz37']], ['Krawiec, sapador (capa, bolsa)', 20, [...vis, 'head_krawiec', 'helmet_wz31', 'helmet_cover_wz31', 'sapper', 'rank_kapral']],
      ['Zieliński, sierżant (Vis wz.35)', 20, [...vis, 'head_zielinski', 'helmet_wz31', 'nco', 'rank_sierzant']]]) {
      tiles.push(await actorTile(PL, { show }, 'spine_02', 2.6, az, 6, label));
    }
    save('lineup_pl.png', grid(tiles, 6));
  },
  async lineup_de() {
    const tiles = [];
    for (const [label, az] of [['Infantaria alemã 1939 (M35, M36) — frente', 0], ['3/4', 40], ['perfil', 90], ['costas', 180]]) tiles.push(await actorTile(DE, {}, 'spine_02', 2.6, az, 6, label));
    save('lineup_de.png', grid(tiles, 4));
  },
  async heads() {
    const tiles = [];
    for (const [url, ids, hat] of [[PL, ['wrona', 'zielinski', 'krawiec', 'nowicki', 'bak', 'kowal', 'dudek', 'pl_a'], 'helmet_wz31'], [DE, ['de_a', 'de_b', 'de_c'], 'helmet_m35']]) {
      for (const id of ids) tiles.push(await actorTile(url, { show: ['body', `head_${id}`] }, 'head', 0.62, 18, 4, id, 30));
      tiles.push(await actorTile(url, { show: ['body', `head_${ids[0]}`, hat] }, 'head', 0.7, 25, 6, hat, 30));
    }
    save('heads.png', grid(tiles, 6));
  },
  async lods() {
    const tiles = [];
    for (const nat of ['pl', 'de']) for (const lod of ['lod0', 'lod1', 'lod2']) tiles.push(await actorTile(B + `m01_soldier_${nat}_${lod}.glb`, {}, 'spine_02', 2.5, 25, 6, `${nat} ${lod}`));
    for (const nat of ['pl', 'de']) for (const lod of ['lod0', 'lod1', 'lod2']) tiles.push(await actorTile(B + `m01_soldier_${nat}_${lod}.glb`, {}, 'head', 0.75, 25, 5, `${nat} ${lod} (rosto)`));
    save('lods.png', grid(tiles, 6));
  },
  async weapons() {
    const tiles = [];
    for (const [url, name] of [[PL, 'kb wz.29 (alavanca recta)'], [DE, 'Kar98k (alavanca dobrada)']]) {
      tiles.push(await scene(800, 400, async ([url, name]) => {
        const s = window.stage; s.ground(false);
        const a = await s.add(url, { show: ['rifle'] }), p = s.bone(a, 'weapon');
        s.camera([p[0] + 0.95, p[1] + 0.12, p[2] - 0.22], [p[0], p[1] + 0.02, p[2] - 0.2], 40); s.label(name);
      }, [url, name]));
      tiles.push(await scene(800, 400, async ([url, name]) => {
        const s = window.stage; s.ground(false);
        const a = await s.add(url, { show: ['rifle', 'clip'] }), p = s.bone(a, 'weapon_bolt');
        s.camera([p[0] + 0.22, p[1] + 0.12, p[2] - 0.05], [p[0], p[1], p[2] - 0.06], 40); s.label(`${name}: ferrolho e clipe de 5`);
      }, [url, name]));
    }
    await st.eval(() => { window.stage.ground(true); });
    save('weapons.png', grid(tiles, 2));
  },
  async clip_poses() {
    const tiles = [];
    for (const [clip, f, az] of [['standing_idle', 0, 25], ['aim', 0, 60], ['crouched_idle', 0, 40], ['pinned', 0.4, 40], ['seated', 0, 30], ['wounded', 0, 70], ['fallen', 0.35, 70], ['fallen', 1, 70]])
      tiles.push(await actorTile(PL, { clip, f }, 'root', 2.7, az, 10, `${clip} ${f ? `(${Math.round(f * 100)} %)` : ''}`));
    save('clip_poses.png', grid(tiles, 4));
  },
  async clip_locomotion() {
    const tiles = [];
    for (const clip of ['walk', 'run']) for (const f of [0, 0.25, 0.5, 0.75]) tiles.push(await actorTile(PL, { clip, f }, 'root', 2.6, 90, 8, `${clip} ${f * 100} %`));
    save('clip_locomotion.png', grid(tiles, 4));
  },
  async clip_fire_bolt() {
    const tiles = [];
    for (const [f, txt] of [[0.04, 'disparo'], [0.3, 'mão à alavanca'], [0.4, 'levantar'], [0.6, 'recuar (ejecta)'], [0.82, 'avançar'], [1, 'baixar, punho']])
      tiles.push(await actorTile(PL, { clip: 'fire_bolt', f }, 'weapon_bolt', 0.75, 70, 25, `fire_bolt — ${txt}`));
    tiles.push(await actorTile(PL, { clip: 'fire_bolt', f: 0.6 }, 'root', 2.6, 60, 10, 'fire_bolt (corpo)'));
    tiles.push(await actorTile(DE, { clip: 'fire_bolt', f: 0.6 }, 'weapon_bolt', 0.75, 70, 25, 'Kar98k: mesmo clip'));
    save('clip_fire_bolt.png', grid(tiles, 4));
  },
  async clip_reload() {
    const tiles = [];
    for (const [f, txt] of [[0.1, 'abrir ferrolho'], [0.2, 'à cartucheira'], [0.27, 'clipe na mão'], [0.3, 'clipe na guia'], [0.45, 'empurrar 5'], [0.6, 'fechar ferrolho'], [0.72, 'clipe expelido'], [0.95, 'reassentar']])
      tiles.push(await actorTile(PL, { clip: 'reload_clip', f }, f > 0.17 && f < 0.25 ? 'hand_r' : 'weapon_bolt', 0.85, 55, 28, `reload_clip — ${txt}`));
    save('clip_reload.png', grid(tiles, 4));
  },
  async clip_sappers() {
    const tiles = [];
    const show = ['body', 'gear', 'rifle', 'clip', 'head_krawiec', 'helmet_wz31', 'helmet_cover_wz31', 'sapper', 'rank_kapral'];
    for (const [clip, f, az] of [['sapper_work', 0, 30], ['sapper_work', 0.3, 90], ['sapper_work_pinned', 0, 30], ['sapper_work_pinned', 0.4, 90]])
      tiles.push(await actorTile(PL, { clip, f, show }, 'root', 2.2, az, 14, clip));
    save('clip_sappers.png', grid(tiles, 4));
  },
  async clip_carry() {
    const tiles = [];
    for (const [az, f] of [[25, 0], [90, 0.25], [160, 0.5], [270, 0.75]]) tiles.push(await scene(400, 400, async ([url, anim, az, f]) => {
      const s = window.stage; await s.load(url); await s.load(anim);
      const d1 = s.clips(anim).find(c => c.name === 'carry_wounded').duration, d2 = s.clips(anim).find(c => c.name === 'carried').duration;
      const a = await s.add(url, { clip: 'carry_wounded', time: f * d1, anims: anim, show: ['body', 'gear', 'rifle', 'clip', 'head_wrona', 'helmet_wz31'] });
      const b = await s.add(url, { clip: 'carried', time: f * d2, anims: anim, show: ['body', 'gear', 'rifle', 'clip', 'head_bak', 'helmet_wz31'] });
      s.attach(b, a, 'carry_socket');
      const A = az * Math.PI / 180; s.camera([Math.sin(A) * 3, 1.3, -Math.cos(A) * 3], [0, 0.95, 0], 34);
      s.label(`Wrona carrega Bąk (carry_wounded + carried) ${Math.round(f * 100)} %`);
    }, [PL, ANIM, az, f]));
    save('clip_carry.png', grid(tiles, 4));
  },
};
const want = process.argv.slice(2);
for (const [k, fn] of Object.entries(VIEWS)) if (!want.length || want.includes(k)) await fn();
if (st.errors.length) { console.error(st.errors); process.exitCode = 1; }
await st.close();
