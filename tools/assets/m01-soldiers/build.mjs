// Gera os soldados de 1939 (GLB por nação e por LOD) e o GLB de animações partilhado.
// Uso: node build.mjs [pl|de|anim ...] [--out dir] [--size 2048] [--lod lod0,lod1,lod2]
// Por omissão escreve em assets/models/provisional/m01/characters/ e actualiza manifest.json.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { buildNation, bakeNation, LODS, RIFLE_OF } from './src/assemble.mjs';
import { writeCharacter } from './src/glb.mjs';
import { GAME_BONES } from './src/human.mjs';
import { hasMakeHuman } from './src/mh.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const flagVals = new Set(['--out', '--size', '--lod'].flatMap(k => { const i = args.indexOf(k); return i >= 0 ? [args[i + 1]] : []; }));
const targets = args.filter(a => !a.startsWith('--') && !flagVals.has(a));
const which = targets.length ? targets : ['pl', 'de', 'anim'];
const ROOT = new URL('../../../', import.meta.url).pathname;
const OUT = opt('out', join(ROOT, 'assets/models/provisional/m01/characters'));
const SIZE = +opt('size', 2048), LOD_IDS = opt('lod', LODS.map(l => l.id).join(',')).split(',');
if (!hasMakeHuman()) { console.error('Falta a malha base do MakeHuman: correr primeiro `npm run fetch`.'); process.exit(1); }
mkdirSync(OUT, { recursive: true });

const manifestPath = join(OUT, 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
manifest.generator = 'tools/assets/m01-soldiers (node build.mjs)';
manifest.units = 'metros; +Y para cima; personagem e cano da arma para −Z';
manifest.files ??= {};

const t0 = Date.now();
for (const nat of which.filter(w => w === 'pl' || w === 'de')) {
  const N = buildNation(nat);
  console.log(nat, 'altura', N.height.toFixed(3), 'm;', N.groups.length, 'malhas');
  const { atlas, lods } = await bakeNation(N, { size: SIZE });
  console.log(nat, 'atlas', `${SIZE}²`, 'densidade', atlas.density.toFixed(0), 'px/m', `(${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  for (const L of lods.filter(l => LOD_IDS.includes(l.id))) {
    const file = `m01_soldier_${nat}_${L.id}.glb`;
    const r = await writeCharacter(join(OUT, file), {
      name: `m01_soldier_${nat}`, bones: GAME_BONES, joints: N.J, materials: L.materials, meshes: L.meshes,
      extras: { nation: nat, lod: L.id, rifle: RIFLE_OF[nat], sockets: N.rifle.sockets },
      rootExtras: { license: 'CC0 (malha base MakeHuman) + geometria, texturas e animações originais; ver ASSET_CREDITS.md' },
    });
    const visible = r.meshes.filter(m => m.visible);
    manifest.files[file] = {
      nation: nat, lod: L.id, bytes: r.bytes, height_m: +N.height.toFixed(3), bones: L.meshes[0].skinBones?.length ?? GAME_BONES.length,
      triangles_visible: visible.reduce((s, m) => s + m.triangles, 0), draw_calls_visible: visible.length,
      textures: Object.fromEntries(Object.entries(L.materials.atlas).filter(([, v]) => v?.mime).map(([k, v]) => [k, v.mime])),
      meshes: r.meshes.map(m => ({ name: m.name, triangles: m.triangles, visible: m.visible })),
    };
    console.log(' ', file, (r.bytes / 1e6).toFixed(2), 'MB;', manifest.files[file].triangles_visible, 'triângulos visíveis;', visible.length, 'draw calls');
  }
}
if (which.includes('anim')) {
  const { buildClips } = await import('./src/clips.mjs');
  const N = buildNation('pl', { heads: [] });
  const clips = buildClips(N);
  const file = 'm01_soldier_animations.glb';
  const r = await writeCharacter(join(OUT, file), { name: 'm01_soldier_animations', bones: GAME_BONES, joints: N.J, materials: {}, meshes: [], animations: clips,
    extras: { note: 'Só esqueleto e clips; ligar por nome de osso a qualquer GLB m01_soldier_*' } });
  manifest.files[file] = { bytes: r.bytes, clips: clips.map(c => ({ name: c.name, duration: +Math.max(...c.tracks.map(t => t.times.at(-1))).toFixed(3), loop: c.extras?.loop ?? false })) };
  console.log(' ', file, (r.bytes / 1e6).toFixed(2), 'MB;', clips.length, 'clips');
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('manifest', relative(ROOT, manifestPath), `${((Date.now() - t0) / 1000).toFixed(0)} s`);
