// Capturas de verificação da dupla da MG 34 deitada (Chromium + GLTFLoader/AnimationMixer oficiais do three.js),
// reutilizando o palco dos soldados (../m01-soldiers/render). Atirador: soldado alemão actual sem a Kar98k nem o clipe,
// com a MG 34 do kit presa ao osso `weapon` antes de ligar o clip. Municiador: soldado alemão sem arma, com a raiz em
// LOADER_OFFSET. Os clips vêm de m01_mg34_prone_animations.glb. Galeria isolada: não é playtest nem medição de FPS, e
// o motor não tem `pose: prone`.
// Saída: docs/assets/m01-mg34-prone/*.png e import-report.json
// Uso: CHROME_EXECUTABLE=… node tools/assets/m01-mg34-prone/render/capture.mjs [prone_pair|prone_details|prone_burst|prone_reload|prone_enter_exit|report …]
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from '../../m01-soldiers/node_modules/pngjs/lib/png.js';
import { openStage } from '../../m01-soldiers/render/stage.mjs';

const ROOT = new URL('../../../../', import.meta.url).pathname;
const OUT = join(ROOT, 'docs/assets/m01-mg34-prone');
const MG = '/assets/models/provisional/m01/weapons/mg34/m01_mg34_lod0.glb';
const ANIM = '/assets/models/provisional/m01/weapons/mg34-prone/m01_mg34_prone_animations.glb';
const DE = '/assets/models/provisional/m01/characters/m01_soldier_de_lod0.glb';
const MANIFEST = JSON.parse(readFileSync(join(ROOT, 'assets/models/provisional/m01/weapons/mg34-prone/manifest.json'), 'utf8'));
const OFFSET = MANIFEST.pair.loader.root_offset_m;
const GUNNER = ['body', 'gear', 'head_de_a', 'helmet_m35'];   // sem `rifle` (Kar98k) nem `clip`
const LOADER = ['body', 'gear', 'head_de_b', 'helmet_m35'];
const MGS = ['mg34_body', 'mg34_feed_cover', 'mg34_cocking_handle', 'mg34_drum', 'mg34_belt', 'mg34_bipod_folded', 'mg34_bipod_open'];   // o bípode aberto também: os clips decidem pela escala
mkdirSync(OUT, { recursive: true });
const st = await openStage({ width: 480, height: 400 });

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
 * Dupla no instante t: atirador com `clip` (e a MG 34 presa ao osso weapon) e, se `loader`, o municiador com o seu
 * clip no instante `lt` (por omissão t). Câmara a d m de `target` (ponto ou osso do atirador) com azimute/elevação em
 * graus (az 0 = à frente da dupla, a olhar para trás; 90 = lado direito).
 */
const pairTile = (o) => scene(o.w ?? 480, o.h ?? 400, async ([o, DE, MG, ANIM, GUNNER, LOADER, OFFSET, MGS]) => {
  const s = window.stage; await s.load(ANIM);
  const dur = c => s.clips(ANIM).find(x => x.name === c).duration, T = (c, t) => Math.min(dur(c) - 1e-3, t);
  let a = null, g = null, l = null;
  if (o.clip) {
    a = await s.add(DE, { show: o.gunnerShow ?? GUNNER, clip: o.clip, time: T(o.clip, o.t), anims: ANIM });
    g = await s.add(MG, { show: MGS }); s.attach(g, a, 'weapon');
  }
  if (o.loader) l = await s.add(DE, { show: LOADER, clip: o.loader, time: T(o.loader, o.lt ?? o.t), anims: ANIM, position: OFFSET });
  const p = typeof o.target === 'string' ? s.bone(a ?? l, o.target) : o.target, A = o.az * Math.PI / 180, E = o.el * Math.PI / 180;
  s.camera([p[0] + o.d * Math.sin(A) * Math.cos(E), p[1] + o.d * Math.sin(E), p[2] - o.d * Math.cos(A) * Math.cos(E)], p, o.fov ?? 32); s.label(o.label);
  return { gunner: a === null ? null : s.info(a).meshes, weapon: g === null ? null : s.info(g).meshes, loader: l === null ? null : s.info(l).meshes };
}, [o, DE, MG, ANIM, GUNNER, LOADER, OFFSET, MGS]);

const VIEWS = {
  async prone_pair() {
    const P = { clip: 'mg34_prone_aim', t: 0, loader: 'mg34_loader_prone_idle' };
    const tiles = [
      await pairTile({ ...P, target: [-0.1, 0.25, 0.3], d: 3.4, az: 90, el: 8, label: 'mg34_prone_aim + mg34_loader_prone_idle — lateral direita (grelha 0,5 m)' }),
      await pairTile({ ...P, target: [-0.1, 0.25, 0.3], d: 3.4, az: -90, el: 8, label: 'lateral esquerda: municiador à frente' }),
      await pairTile({ ...P, target: [-0.15, 0.25, 0], d: 3.2, az: 0, el: 6, label: 'frontal (boca para a câmara)' }),
      await pairTile({ ...P, target: [-0.15, 0.2, 0.3], d: 3.6, az: 0, el: 89, fov: 34, label: 'de cima: raiz do municiador em [−0,72, 0, 0,35]' }),
    ];
    console.log('malhas visíveis:', JSON.stringify(tiles[0].out));
    save('mg34_prone_pair.png', grid(tiles, 2));
  },
  async prone_details() {
    const A = { clip: 'mg34_prone_aim', t: 0 };
    const tiles = [
      await pairTile({ ...A, target: [0.15, 0.15, -0.6], d: 1.5, az: 35, el: 10, label: 'bípode aberto: patas no chão; cotovelos no chão' }),
      await pairTile({ ...A, target: 'lowerarm_l', d: 1.1, az: -60, el: 8, label: 'cotovelo esquerdo e mão sob a coronha' }),
      await pairTile({ ...A, target: 'head', d: 0.75, az: 75, el: 6, gunnerShow: ['body', 'gear', 'head_de_a'], label: 'face na coronha, olho na linha de mira (sem capacete)' }),
      await pairTile({ ...A, target: 'hand_r', d: 0.7, az: 120, el: 25, label: 'mão direita no punho, dedo no gatilho' }),
      await pairTile({ ...A, target: [0.1, 0.12, 0.9], d: 1.6, az: 150, el: 12, label: 'joelhos e pés: dedos no chão' }),
      await pairTile({ clip: 'mg34_prone_idle', t: 1, target: 'head', d: 1.3, az: 60, el: 10, label: 'mg34_prone_idle: cabeça levantada, dedo fora do gatilho' }),
    ];
    save('mg34_prone_details.png', grid(tiles, 3));
  },
  async prone_burst() {
    const B = (t, label, az = 90, d = 2.3, target = [0.2, 0.25, -0.2]) => pairTile({ clip: 'mg34_prone_fire_burst', t, target, d, az, el: 6, label: `mg34_prone_fire_burst ${t.toFixed(3)} s — ${label}` });
    const tiles = [
      await B(0, '1.º tiro (evento 0)'),
      await B(0.02, '1.º tiro: recuo'),
      await B(0.3, '5.º tiro (0,30 s; corte após 4)'),
      await B(0.47, '7.º tiro (0,45 s): subida máxima, patas no ar'),
      await B(0.47, '7.º tiro: frente', 20, 2.0),
      await B(1.02, 'fim: de volta à pontaria'),
    ];
    save('mg34_prone_burst.png', grid(tiles, 3));
  },
  async prone_reload() {
    const R = (t, label, o = {}) => pairTile({ clip: 'mg34_prone_reload', loader: 'mg34_loader_prone_feed', t, target: o.target ?? [-0.05, 0.22, -0.35], d: o.d ?? 1.6, az: o.az ?? -40, el: o.el ?? 32, label: `${t.toFixed(2)} s — ${label}` });
    const tiles = [
      await R(0.55, 'mão esquerda no fecho da tampa'),
      await R(0.8, 'tampa aberta (cover_open)'),
      await R(1.3, 'tambor vazio solto (drum_off)'),
      await R(1.55, 'tambor vazio pousado à esquerda'),
      await R(1.9, 'municiador traz o tambor novo', { target: [-0.35, 0.2, -0.1], d: 2.4, el: 35, az: -95 }),
      await R(2.15, 'passagem do tambor (drum_handoff)'),
      await R(2.75, 'tambor engatado (drum_on)'),
      await R(3.0, 'cinta na caixa (belt_in)'),
      await R(3.35, 'tampa fechada (cover_closed)'),
      await R(3.85, 'alavanca de armar atrás (handle_back)', { az: 50, el: 25, d: 1.3, target: [0.25, 0.25, -0.35] }),
      await R(4.15, 'alavanca à frente (handle_forward)', { az: 50, el: 25, d: 1.3, target: [0.25, 0.25, -0.35] }),
      await R(4.8, 'fim: pontaria; municiador em repouso', { target: [-0.1, 0.25, 0.2], d: 3.2, az: -60, el: 18 }),
    ];
    save('mg34_prone_reload.png', grid(tiles, 4));
  },
  async prone_enter_exit() {
    const E = (clip, t, label, o = {}) => pairTile({ clip, t, target: [0.05, 0.62, 0.05], d: 4.4, az: o.az ?? 90, el: o.el ?? 6, label: `${clip} ${t.toFixed(2)} s — ${label}` });
    const L = (t, label) => pairTile({ loader: 'mg34_loader_prone_leave', t, target: [OFFSET[0], 0.5, OFFSET[2]], d: 3.8, az: -90, el: 6, label: `mg34_loader_prone_leave ${t.toFixed(2)} s — ${label}` });
    const tiles = [
      await E('mg34_prone_enter', 0, 'de pé (= mg34_aim)'),
      await E('mg34_prone_enter', 0.4, 'baixa-se'),
      await E('mg34_prone_enter', 0.65, 'mão esquerda roda o bípode'),
      await E('mg34_prone_enter', 0.9, 'de joelhos, bípode aberto'),
      await E('mg34_prone_enter', 1.0, 'apoia a mão esquerda'),
      await E('mg34_prone_enter', 1.2, 'patas no chão'),
      await E('mg34_prone_enter', 1.4, 'coronha ao ombro'),
      await E('mg34_prone_enter', 1.9, 'deitado (= mg34_prone_aim)'),
      await E('mg34_prone_exit', 0.9, 'saída: de joelhos'),
      await E('mg34_prone_exit', 1.9, 'saída: de pé (= mg34_aim)'),
      await L(0.6, 'mãos e joelhos'),
      await L(1.8, 'agachado, pronto a sair'),
    ];
    save('mg34_prone_enter_exit.png', grid(tiles, 4));
  },
  async report() {
    // Altura mínima da malha (pele) por clip, amostrada a cada 0,05 s, e pausa/reposição do mixer no browser.
    const out = await st.eval(async ([DE, MG, ANIM, GUNNER, LOADER, MGS]) => {
      const s = window.stage; s.clear(); await s.load(ANIM);
      const clips = s.clips(ANIM), res = {};
      for (const c of clips) {
        const loader = c.name.startsWith('mg34_loader');
        s.clear();
        const a = await s.add(DE, { show: loader ? LOADER : GUNNER, clip: c.name, time: 0, anims: ANIM });
        if (!loader) { const g = await s.add(MG, { show: MGS }); s.attach(g, a, 'weapon'); }
        let minY = Infinity, at = 0;
        for (let t = 0; t <= c.duration + 1e-6; t += 0.05) { s.setTime(a, Math.min(t, c.duration - 1e-4)); const y = s.bbox(a).min[1]; if (y < minY) { minY = y; at = t; } }
        // Pausa e reposição: o mesmo instante dá a mesma pose depois de ir a outro.
        const probe = ['hand_l', 'hand_r', 'head', 'weapon', 'calf_l'];
        const tm = c.duration * 0.37; s.setTime(a, tm); const p0 = probe.map(b => s.bone(a, b));
        s.setTime(a, c.duration * 0.81); s.setTime(a, tm); const p1 = probe.map(b => s.bone(a, b));
        const drift = Math.max(...p0.flatMap((p, i) => p.map((x, k) => Math.abs(x - p1[i][k]))));
        res[c.name] = { duration: c.duration, tracks: c.tracks, skin_min_y_m: +minY.toFixed(3), at_s: +at.toFixed(2), pause_restore_max_drift_m: drift };
      }
      return res;
    }, [DE, MG, ANIM, GUNNER, LOADER, MGS]);
    writeFileSync(join(OUT, 'import-report.json'), JSON.stringify({ viewer: 'three.js 0.186.1 GLTFLoader + AnimationMixer (Chromium/SwiftShader)', note: 'galeria isolada; não é playtest nem medição de FPS; skin_min_y_m = vértice mais baixo da malha do soldado (sem a arma) no clip, amostrado a cada 0,05 s',
      gunner_meshes: GUNNER, loader_meshes: LOADER, loader_root_offset_m: OFFSET, clips: out }, null, 2) + '\n');
    console.log(JSON.stringify(out, null, 1));
  },
};
const want = process.argv.slice(2);
for (const [k, fn] of Object.entries(VIEWS)) if (!want.length || want.includes(k)) await fn();
if (st.errors.length) { console.error(st.errors); process.exitCode = 1; }
await st.close();
