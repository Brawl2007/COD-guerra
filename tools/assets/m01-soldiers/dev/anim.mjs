// Desenvolvimento: soldado LOD0 (atlas 1024) com os clips embutidos, para ver no viewer → .cache/anim_<nação>.glb
import { buildNation, bakeNation } from '../src/assemble.mjs';
import { buildClips } from '../src/clips.mjs';
import { writeCharacter } from '../src/glb.mjs';
import { GAME_BONES } from '../src/human.mjs';
const nat = process.argv[2] ?? 'pl';
const N = buildNation(nat, { heads: undefined });
const { lods } = await bakeNation(N, { size: 1024 });
console.time('clips'); const clips = buildClips(N); console.timeEnd('clips');
const out = new URL(`../.cache/anim_${nat}.glb`, import.meta.url).pathname;
const L = lods[0];
const r = await writeCharacter(out, { name: `anim_${nat}`, bones: GAME_BONES, joints: N.J, materials: L.materials, meshes: L.meshes, animations: clips });
console.log(out, (r.bytes / 1e6).toFixed(2), 'MB', r.animations.join(' '));
