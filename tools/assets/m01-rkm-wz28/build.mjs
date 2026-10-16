// Gera o kit da rkm wz.28 de Kowal: GLB em metros com três LODs, clips para o rig dos soldados e manifest.json.
// Uso: node build.mjs [--out dir]. Precisa de `npm ci` aqui e em ../m01-soldiers (e `npm run fetch` lá para os clips).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { computeNormals } from '../m01-soldiers/src/meshops.mjs';
import { bakeAtlas } from '../m01-soldiers/src/textures.mjs';
import { mergeGroup, simplify, buildNation } from '../m01-soldiers/src/assemble.mjs';
import { writeCharacter } from '../m01-soldiers/src/glb.mjs';
import { GAME_BONES } from '../m01-soldiers/src/human.mjs';
import { rigInfo } from '../m01-soldiers/src/pose.mjs';
import { hasMakeHuman } from '../m01-soldiers/src/mh.mjs';
import { buildRkm, PIVOTS, PAINTERS, RKM, MEASURES, sockets } from './src/rkm.mjs';
import { buildRkmClips, RKM_GRIP } from './src/clips.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const ROOT = new URL('../../../', import.meta.url).pathname;
const OUT = opt('out', join(ROOT, 'assets/models/provisional/m01/weapons/rkm_wz28'));
mkdirSync(OUT, { recursive: true });

// Peças → atlas único (cor sRGB JPEG; ORM: G rugosidade, B metal; normal) → malhas por grupo, relativas ao pivô.
const parts = buildRkm();
for (const p of parts) { computeNormals(p); p.skin = Array(p.positions.length / 3).fill(null); }
const atlas = bakeAtlas(parts, PAINTERS, { size: 1024, ormSize: 512, normalSize: 512, extraSizes: [512, 256], ormExtra: [256] });
const GROUPS = [
  { name: 'rkm_body', visible: true, label: 'coronha, caixa, punho, cano, tubo de gases, fuste, miras, abraçadeira' },
  { name: 'rkm_magazine', visible: true, label: 'carregador de 20' },
  { name: 'rkm_charging_handle', visible: true, label: 'alavanca de armar (esquerda), atrás = armada' },
  { name: 'rkm_bipod_folded', visible: true, label: 'bípode dobrado ao longo do fuste' },
  { name: 'rkm_bipod_open', visible: false, label: 'bípode aberto, patins no chão' },
];
const LODS = [
  { id: 'lod0', ratio: 1, error: 0, color: 'color', orm: 'orm', normal: 'normal', use: 'perto (< 15 m) e capturas' },
  { id: 'lod1', ratio: 0.45, error: 0.03, flags: ['Permissive'], color: 'color_512', orm: 'orm_256', normal: null, use: 'médio (15–40 m)' },
  { id: 'lod2', ratio: 0.14, error: 0.2, flags: ['Permissive'], color: 'color_256', orm: null, normal: null, use: 'longe / Chromebook' },
];
const merged = GROUPS.map(g => {
  const m = mergeGroup({ ...g, parts: parts.filter(p => p.group === g.name) }), [px, py, pz] = PIVOTS[g.name];
  for (let i = 0; i < m.positions.length; i += 3) { m.positions[i] -= px; m.positions[i + 1] -= py; m.positions[i + 2] -= pz; }
  return m;
});

const manifest = {
  asset: 'rkm wz.28 (Browning polaca) — Szymon Kowal, M01 Tczew',
  status: 'PROVISÓRIO VERIFICADO (M01 continua PROTÓTIPO JOGÁVEL)',
  generator: 'tools/assets/m01-rkm-wz28 (node build.mjs)',
  author: 'Claude Code (geometria, texturas e clips gerados por código original neste repositório)',
  license: 'Original do projecto; a licença global do repositório continua por decidir pelo proprietário (ASSET_CREDITS.md). Sem conteúdo de terceiros nem de jogos.',
  tools: ['Node.js', '@gltf-transform/core 4.5.1 (MIT)', 'meshoptimizer 1.3.0 (MIT)', 'jpeg-js 0.4.4 (BSD-3)', 'pngjs 7.0.0 (MIT)', 'three.js 0.186.1 (MIT, capturas)', 'Playwright/Chromium (capturas)'],
  units: 'metros; +Y para cima; cano para −Z; lado direito da arma em +X',
  frame: 'referencial do osso `weapon` dos soldados (origem perto do punho): prender a cena ao osso com transformação nula',
  sources: {
    T31: ['https://en.wikipedia.org/wiki/Rkm_wz._28', 'https://pl.wikipedia.org/wiki/Karabin_maszynowy_Browning_wz._28', 'https://opisybroni.pl/browning-wz-28/',
      'http://www.1939.pl/uzbrojenie/polskie/bron-strzelecka/rkm_792mm_wz28_browning/index.html', 'https://ioh.pl/artykuly/pokaz/rczny-karabin-maszynowy-wz,1023/'],
    H30: ['https://www.muzeum1939.pl/aktualnosci/umundurowanie-i-wyposazenie-polskich-zolnierzy-we-wrzesniu-1939-roku--m2wswirtualnie-11339'],
    note: 'T31 só por resumos concordantes de busca: as páginas estão bloqueadas neste ambiente (wikipedia.org e opisybroni sem ligação, 1939.pl 403). H30 lida (confirma a rkm como arma da secção, sem ficha técnica).',
  },
  specs: { caliber: '7,92×57 mm Mauser', rounds: RKM.rounds, rate_rpm: RKM.rate_rpm, rate_note: 'teórica; prática 80–400', mass_kg: RKM.mass_kg, action: 'gases, ferrolho aberto; selector tiro a tiro / contínuo', sights: 'alça em quadro 300–1600 m; massa prismática' },
  measures: MEASURES,
  parts: GROUPS.map(g => ({ node: g.name, visible: g.visible, pivot: PIVOTS[g.name], contents: g.label, pieces: parts.filter(p => p.group === g.name).map(p => p.name) })),
  sockets: sockets(),
  hands: { right: RKM_GRIP.r, left: RKM_GRIP.l, note: 'pulso, direcção dos dedos e normal da palma no referencial da arma (usados pelos clips)' },
  textures: { atlas_px: atlas.size, density_px_per_m: Math.round(atlas.density), painters: Object.keys(PAINTERS) },
  files: {},
};

for (const L of LODS) {
  const doc = new Document(), buf = doc.createBuffer(), acc = (type, a) => doc.createAccessor().setType(type).setArray(a).setBuffer(buf);
  const img = k => k && doc.createTexture(k).setImage(atlas.images[k].data).setMimeType(atlas.images[k].mime);
  const mat = doc.createMaterial('rkm_wz28').setBaseColorTexture(img(L.color)).setRoughnessFactor(L.orm ? 1 : 0.55).setMetallicFactor(L.orm ? 1 : 0.4);
  if (L.orm) mat.setMetallicRoughnessTexture(img(L.orm));
  if (L.normal) mat.setNormalTexture(img(L.normal));
  const root = doc.createNode('rkm_wz28').setExtras({ lod: L.id, sockets: sockets(), pivots: PIVOTS, handle_travel_m: RKM.handleTravel, attach: 'osso weapon do rig m01_soldier_*', bipod: { folded: 'rkm_bipod_folded', open: 'rkm_bipod_open' } });
  const meshes = [];
  for (const m0 of merged) {
    const m = await simplify(m0, L.ratio, { error: L.error, flags: L.flags ?? [] });
    const prim = doc.createPrimitive().setMaterial(mat).setIndices(acc('SCALAR', Uint16Array.from(m.indices)))
      .setAttribute('POSITION', acc('VEC3', Float32Array.from(m.positions))).setAttribute('NORMAL', acc('VEC3', Float32Array.from(m.normals)))
      .setAttribute('TEXCOORD_0', acc('VEC2', Float32Array.from(m.uvs)));
    root.addChild(doc.createNode(m0.name).setTranslation(PIVOTS[m0.name]).setMesh(doc.createMesh(m0.name).addPrimitive(prim)).setExtras({ visible: m0.visible }));
    meshes.push({ name: m0.name, triangles: m.indices.length / 3, visible: m0.visible });
  }
  doc.createScene('rkm_wz28').addChild(root);
  doc.getRoot().getAsset().generator = 'COD-guerra tools/assets/m01-rkm-wz28 (gltf-transform)';
  doc.getRoot().setExtras({ units: 'meters', license: manifest.license });
  const file = `m01_rkm_wz28_${L.id}.glb`, path = join(OUT, file);
  await new NodeIO().write(path, doc);
  const bytes = (await import('node:fs')).statSync(path).size;
  const tris = meshes.filter(m => m.visible).reduce((s, m) => s + m.triangles, 0);
  manifest.files[file] = { lod: L.id, use: L.use, bytes, triangles_visible: tris, draw_calls_visible: meshes.filter(m => m.visible).length, meshes,
    textures: Object.fromEntries([['baseColor', L.color], ['metallicRoughness', L.orm], ['normal', L.normal]].filter(([, k]) => k).map(([n, k]) => [n, `${atlas.images[k].mime} ${k === 'color' ? 1024 : +(k.split('_')[1] ?? 512)}²`])) };
  console.log(file, (bytes / 1e3).toFixed(0), 'kB;', tris, 'triângulos visíveis');
}

if (hasMakeHuman()) {
  const J = buildNation('pl', { heads: [] }).J, clips = buildRkmClips(rigInfo(J)), file = 'm01_rkm_wz28_animations.glb';
  const r = await writeCharacter(join(OUT, file), { name: 'm01_rkm_wz28_animations', bones: GAME_BONES, joints: J, materials: {}, meshes: [], animations: clips,
    extras: { note: 'Só esqueleto e clips; ligar por nome de osso aos GLB m01_soldier_* com a rkm presa ao osso weapon' } });
  manifest.files[file] = { bytes: r.bytes, clips: clips.map(c => ({ name: c.name, duration: +Math.max(...c.tracks.map(t => t.times.at(-1))).toFixed(3), loop: c.extras.loop, events: c.extras.events ?? null })) };
  console.log(file, (r.bytes / 1e3).toFixed(0), 'kB;', clips.map(c => c.name).join(', '));
} else console.warn('Sem malha base do MakeHuman: correr `npm run fetch` em ../m01-soldiers para gerar os clips.');
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
