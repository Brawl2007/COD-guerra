// Gera o kit da MG 34 dos alemães de M01: GLB em metros com três LODs, clips mg34_* para o rig dos soldados e
// manifest.json. Uso: node build.mjs [--out dir]. Precisa de `npm ci` aqui e em ../m01-soldiers (e `npm run fetch` lá
// para os clips).
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { computeNormals, v3 } from '../m01-soldiers/src/meshops.mjs';
import { bakeAtlas } from '../m01-soldiers/src/textures.mjs';
import { mergeGroup, simplify, buildNation } from '../m01-soldiers/src/assemble.mjs';
import { writeCharacter } from '../m01-soldiers/src/glb.mjs';
import { GAME_BONES } from '../m01-soldiers/src/human.mjs';
import { rigInfo } from '../m01-soldiers/src/pose.mjs';
import { hasMakeHuman } from '../m01-soldiers/src/mh.mjs';
import { buildMg34, PIVOTS, PAINTERS, MG34, MEASURES, sockets } from './src/mg34.mjs';
import { buildMg34Clips, MG34_GRIP } from './src/clips.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const ROOT = new URL('../../../', import.meta.url).pathname;
const OUT = opt('out', join(ROOT, 'assets/models/provisional/m01/weapons/mg34'));
mkdirSync(OUT, { recursive: true });

// Peças → atlas único (cor sRGB JPEG; ORM: G rugosidade, B metal; normal) → malhas por grupo, relativas ao pivô.
const parts = buildMg34();
for (const p of parts) { computeNormals(p); p.skin = Array(p.positions.length / 3).fill(null); }
const atlas = bakeAtlas(parts, PAINTERS, { size: 1024, ormSize: 512, normalSize: 512, extraSizes: [512, 256], ormExtra: [256] });
const GROUPS = [
  { name: 'mg34_body', visible: true, moving: null, label: 'coronha, caixa, caixa de alimentação, punho e gatilho E/D, manga perfurada, reforçador de recuo, miras, abraçadeira do bípode' },
  { name: 'mg34_feed_cover', visible: true, moving: 'rotação em X na dobradiça da frente; a traseira sobe (−80° = aberta)', label: 'tampa da alimentação com fecho' },
  { name: 'mg34_cocking_handle', visible: true, moving: `translação em +Z até ${MG34.handleTravel} m (atrás = puxada)`, label: 'alavanca de armar (direita), à frente em repouso' },
  { name: 'mg34_drum', visible: true, moving: 'translação, rotação e escala (troca do tambor)', label: 'tambor de cinta de 50 (Gurttrommel 34), à esquerda' },
  { name: 'mg34_belt', visible: true, moving: 'translação e escala (cinta na caixa)', label: 'início da cinta na caixa de alimentação (5 cartuchos)' },
  { name: 'mg34_bipod_folded', visible: true, moving: null, label: 'bípode dobrado para trás por baixo da manga' },
  { name: 'mg34_bipod_open', visible: false, moving: null, label: 'bípode aberto, patas no chão (alternativa ao dobrado)' },
];
const LODS = [
  { id: 'lod0', ratio: 1, error: 0, color: 'color', orm: 'orm', normal: 'normal', use: 'perto (< 15 m), primeira pessoa e capturas' },
  { id: 'lod1', ratio: 0.45, error: 0.03, flags: ['Permissive'], color: 'color_512', orm: 'orm_256', normal: null, use: 'médio (15–40 m)' },
  { id: 'lod2', ratio: 0.15, error: 0.2, flags: ['Permissive'], color: 'color_256', orm: null, normal: null, use: 'longe (dique a ~1,2 km) / Chromebook' },
];
const merged = GROUPS.map(g => {
  const m = mergeGroup({ ...g, parts: parts.filter(p => p.group === g.name) }), [px, py, pz] = PIVOTS[g.name];
  for (let i = 0; i < m.positions.length; i += 3) { m.positions[i] -= px; m.positions[i + 1] -= py; m.positions[i + 2] -= pz; }
  return m;
});

const manifest = {
  asset: 'MG 34 (1939) — metralhadoras alemãs de M01 Tczew (grp_de_east, Panzerzug 7)',
  status: 'PROVISÓRIO VERIFICADO (M01 continua PROTÓTIPO JOGÁVEL)',
  generator: 'tools/assets/m01-mg34 (node build.mjs)',
  author: 'Claude Code (geometria, texturas e clips gerados por código original neste repositório)',
  license: 'Original do projecto; a licença global do repositório continua por decidir pelo proprietário (ASSET_CREDITS.md). Sem conteúdo de terceiros nem de jogos.',
  tools: ['Node.js', '@gltf-transform/core 4.5.1 (MIT)', 'meshoptimizer 1.3.0 (MIT)', 'jpeg-js 0.4.4 (BSD-3)', 'pngjs 7.0.0 (MIT)', 'three.js 0.186.1 (MIT, capturas)', 'Playwright/Chromium (capturas)'],
  units: 'metros; +Y para cima; cano para −Z; lado direito da arma em +X',
  scale: { unit_m: 1, length_m: MG34.length, measured: 'ver files.*.bbox_m' },
  frame: 'referencial do osso `weapon` dos soldados (origem perto do punho): prender a cena ao osso com transformação nula',
  variant: 'MG 34 de produção de 1939: manga perfurada, coronha fixa, gatilho E/D, bípode na posição dianteira, tambor de cinta de 50 à esquerda. Não é a MG 42 (proibida em M01) nem a MG 34 de carro (manga blindada sem furos)',
  sources: {
    T33: ['https://en.wikipedia.org/wiki/MG_34', 'https://www.lonesentry.com/manuals/german-infantry-weapons/mg34-machine-gun.html', 'https://www.militaryfactory.com/smallarms/detail.php?smallarms_id=63',
      'https://modernfirearms.net/en/machineguns/germany-machineguns/mg-34-eng/', 'https://www.apexgunparts.com/mg42-53-ammo-drum-german-gd.html', 'https://forum.axishistory.com/viewtopic.php?t=143065&start=15'],
    note: 'T33 só por resumos concordantes de busca (2026-10-02): wikipedia.org, lonesentry.com, modernfirearms.net, ww2db.com e dday-overlord.com estão bloqueados neste ambiente. Nenhuma página foi lida por inteiro.',
  },
  specs: { caliber: '7,92×57 mm Mauser', rounds: MG34.rounds, feed: 'cinta de 50/250 (Patronengurt 34) ou tambor de cinta de 50 (Gurttrommel 34) à esquerda', rate_rpm: [800, 900], mass_kg: MG34.mass_kg,
    action: 'recuo com reforçador na boca, ferrolho rotativo, ferrolho aberto', trigger: 'crescente de duas partes: E (Einzelfeuer, tiro a tiro), D (Dauerfeuer, contínuo)', sights: 'alça tangente rebatível 200–2000 m; massa rebatível; mira antiaérea não modelada' },
  measures: MEASURES,
  parts: GROUPS.map(g => ({ node: g.name, visible: g.visible, pivot: PIVOTS[g.name], moving: g.moving, contents: g.label, pieces: parts.filter(p => p.group === g.name).map(p => p.name) })),
  sockets: sockets(),
  hands: { right: MG34_GRIP.r, left: MG34_GRIP.l, note: 'pulso, direcção dos dedos e normal da palma no referencial da arma (usados pelos clips): direita no punho, esquerda nas pernas do bípode dobrado' },
  materials: [{ name: 'mg34', painters: Object.keys(PAINTERS), note: 'um material com atlas; aço fosfatado escuro, baquelite, tambor pintado, latão; furos da manga pintados (cor escura e relevo no mapa normal)' }],
  textures: { atlas_px: atlas.size, density_px_per_m: Math.round(atlas.density) },
  files: {},
};

for (const L of LODS) {
  const doc = new Document(), buf = doc.createBuffer(), acc = (type, a) => doc.createAccessor().setType(type).setArray(a).setBuffer(buf);
  const img = k => k && doc.createTexture(k).setImage(atlas.images[k].data).setMimeType(atlas.images[k].mime);
  const mat = doc.createMaterial('mg34').setBaseColorTexture(img(L.color)).setRoughnessFactor(L.orm ? 1 : 0.55).setMetallicFactor(L.orm ? 1 : 0.15);
  if (L.orm) mat.setMetallicRoughnessTexture(img(L.orm));
  if (L.normal) mat.setNormalTexture(img(L.normal));
  const root = doc.createNode('mg34').setExtras({ lod: L.id, sockets: sockets(), pivots: PIVOTS, cover_open_deg: MG34.cover.open, handle_travel_m: MG34.handleTravel,
    attach: 'osso weapon do rig m01_soldier_*', bipod: { folded: 'mg34_bipod_folded', open: 'mg34_bipod_open' } });
  const meshes = [], min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const m0 of merged) {
    const m = await simplify(m0, L.ratio, { error: L.error, flags: L.flags ?? [] });
    const prim = doc.createPrimitive().setMaterial(mat).setIndices(acc('SCALAR', Uint16Array.from(m.indices)))
      .setAttribute('POSITION', acc('VEC3', Float32Array.from(m.positions))).setAttribute('NORMAL', acc('VEC3', Float32Array.from(m.normals)))
      .setAttribute('TEXCOORD_0', acc('VEC2', Float32Array.from(m.uvs)));
    root.addChild(doc.createNode(m0.name).setTranslation(PIVOTS[m0.name]).setMesh(doc.createMesh(m0.name).addPrimitive(prim)).setExtras({ visible: m0.visible }));
    meshes.push({ name: m0.name, triangles: m.indices.length / 3, visible: m0.visible });
    if (m0.visible) for (let i = 0; i < m.positions.length; i += 3) for (let k = 0; k < 3; k++) {
      const v = m.positions[i + k] + PIVOTS[m0.name][k]; min[k] = Math.min(min[k], v); max[k] = Math.max(max[k], v);
    }
  }
  doc.createScene('mg34').addChild(root);
  doc.getRoot().getAsset().generator = 'COD-guerra tools/assets/m01-mg34 (gltf-transform)';
  doc.getRoot().setExtras({ units: 'meters', license: manifest.license });
  const file = `m01_mg34_${L.id}.glb`, path = join(OUT, file);
  await new NodeIO().write(path, doc);
  const bytes = statSync(path).size, tris = meshes.filter(m => m.visible).reduce((s, m) => s + m.triangles, 0);
  manifest.files[file] = { lod: L.id, use: L.use, bytes, triangles_visible: tris, draw_calls_visible: meshes.filter(m => m.visible).length, meshes,
    bbox_m: { min: min.map(x => +x.toFixed(4)), max: max.map(x => +x.toFixed(4)) },
    textures: Object.fromEntries([['baseColor', L.color], ['metallicRoughness', L.orm], ['normal', L.normal]].filter(([, k]) => k).map(([n, k]) => [n, `${atlas.images[k].mime} ${k === 'color' ? 1024 : +(k.split('_')[1] ?? 512)}²`])) };
  console.log(file, (bytes / 1e3).toFixed(0), 'kB;', tris, 'triângulos visíveis; comprimento', (max[2] - min[2]).toFixed(3), 'm');
}

if (hasMakeHuman()) {
  // Esqueleto do soldado alemão + os nós móveis da MG 34 (filhos de `weapon`, no pivô), para os clips os animarem por nome.
  const J = { ...buildNation('de', { heads: [] }).J }, clips = buildMg34Clips(rigInfo(J)), file = 'm01_mg34_animations.glb';
  const MOVING = ['mg34_feed_cover', 'mg34_cocking_handle', 'mg34_drum', 'mg34_belt'];
  for (const n of MOVING) J[n] = v3.add(J.weapon, PIVOTS[n]);
  const r = await writeCharacter(join(OUT, file), { name: 'm01_mg34_animations', bones: [...GAME_BONES, ...MOVING.map(name => ({ name, parent: 'weapon' }))], joints: J, materials: {}, meshes: [], animations: clips,
    extras: { note: 'Só esqueleto, nós móveis da MG 34 e clips; ligar por nome aos GLB m01_soldier_* com a cena m01_mg34_lod* presa ao osso weapon' } });
  manifest.files[file] = { bytes: r.bytes, clips: clips.map(c => ({ name: c.name, duration: +Math.max(...c.tracks.map(t => t.times.at(-1))).toFixed(3), loop: c.extras.loop, events: c.extras.events ?? null })) };
  console.log(file, (r.bytes / 1e3).toFixed(0), 'kB;', clips.map(c => c.name).join(', '));
} else console.warn('Sem malha base do MakeHuman: correr `npm run fetch` em ../m01-soldiers para gerar os clips.');
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
