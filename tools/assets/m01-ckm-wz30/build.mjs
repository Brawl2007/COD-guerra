// Gera o kit da ckm wz.30 da casamata de M01: GLB em metros com três LODs (arma, tripé, fita e caixa em nós com pivô,
// mais os clips ckm_wz30_gun_* desses nós), os clips ckm_wz30_{gunner,loader}_* para o rig dos soldados e
// manifest.json. Uso: node build.mjs [--out dir]. Precisa de `npm ci` aqui e em ../m01-soldiers (e `npm run fetch` lá
// para os clips da guarnição).
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { computeNormals, v3 } from '../m01-soldiers/src/meshops.mjs';
import { bakeAtlas } from '../m01-soldiers/src/textures.mjs';
import { mergeGroup, simplify, buildNation } from '../m01-soldiers/src/assemble.mjs';
import { writeCharacter } from '../m01-soldiers/src/glb.mjs';
import { GAME_BONES } from '../m01-soldiers/src/human.mjs';
import { q, rigInfo } from '../m01-soldiers/src/pose.mjs';
import { hasMakeHuman } from '../m01-soldiers/src/mh.mjs';
import { buildCkm, PIVOTS, PARENTS, REST_ROT, PAINTERS, CKM, MEASURES, gunSockets, sceneSockets } from './src/ckm.mjs';
import { buildCkmClips, CKM_GRIP, LOADER } from './src/clips.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const ROOT = new URL('../../../', import.meta.url).pathname;
const OUT = opt('out', join(ROOT, 'assets/models/provisional/m01/weapons/ckm_wz30'));
mkdirSync(OUT, { recursive: true });

// Peças → atlas único (cor sRGB JPEG; ORM: G rugosidade, B metal; normal) → malhas por grupo, relativas ao pivô.
const parts = buildCkm();
for (const p of parts) { computeNormals(p); p.skin = Array(p.positions.length / 3).fill(null); }
const atlas = bakeAtlas(parts, PAINTERS, { size: 1024, ormSize: 512, normalSize: 512, extraSizes: [512, 256], ormExtra: [256] });
const GROUPS = [
  { name: 'ckm_tripod', moving: null, label: 'tripé de três pernas (posição baixa): cabeça com prato de direcção, pernas com sapatas e espigões, barra de pontaria' },
  { name: 'ckm_traverse', moving: 'rotação em Y (direcção) no pião', label: 'pião, berço com o garfo dos munhões, fuso e volante de elevação, corrediça na barra' },
  { name: 'ckm_elevate', moving: 'rotação em X (elevação) nos munhões; + = boca para cima', label: 'arma: caixa da culatra, tampa, chapa de trás, punho de madeira e gatilho, manga de água com bujões e tubo de vapor, bucim, tapa-chamas cónico, miras' },
  { name: 'ckm_cocking_handle', moving: `translação em +Z: ${CKM.handleRecoil} m por tiro (acompanha o ferrolho) e ${CKM.handleTravel} m à mão`, label: 'alavanca de armar (direita)' },
  { name: 'ckm_feed_belt', moving: `translação em X: +${CKM.pitch} m por tiro (serra) e entrada pela esquerda na alimentação`, label: 'troço recto da fita na entrada (7 cartuchos) com a ponta' },
  { name: 'ckm_belt_spent', moving: 'translação em X por tiro; escala 0 antes de a ponta ser puxada', label: 'fita vazia a sair pela direita' },
  { name: 'ckm_belt_free', moving: 'translação (folga e entrada da fita)', label: 'troço livre da fita da caixa à entrada' },
  { name: 'ckm_ammo_box', moving: null, label: 'caixa da fita de 330 (aço caqui) com pegas nos topos e dobradiça' },
  { name: 'ckm_ammo_box_lid', moving: `rotação em X na dobradiça de trás; repouso aberta a ${CKM.box.lidOpen}° (modelada fechada)`, label: 'tampa da caixa com pega e fecho' },
];
const LODS = [
  { id: 'lod0', ratio: 1, error: 0, color: 'color', orm: 'orm', normal: 'normal', use: 'perto (< 15 m) e capturas' },
  { id: 'lod1', ratio: 0.45, error: 0.03, flags: ['Permissive'], color: 'color_512', orm: 'orm_256', normal: null, use: 'médio (15–40 m)' },
  { id: 'lod2', ratio: 0.15, error: 0.2, flags: ['Permissive'], color: 'color_256', orm: null, normal: null, use: 'longe (outra margem) / Chromebook' },
];
const merged = GROUPS.map(g => {
  const m = mergeGroup({ ...g, parts: parts.filter(p => p.group === g.name) }), [px, py, pz] = PIVOTS[g.name];
  for (let i = 0; i < m.positions.length; i += 3) { m.positions[i] -= px; m.positions[i + 1] -= py; m.positions[i + 2] -= pz; }
  return m;
});
const localT = n => v3.sub(PIVOTS[n], PARENTS[n] ? PIVOTS[PARENTS[n]] : [0, 0, 0]);
const restQ = n => REST_ROT[n] ? q.axis(REST_ROT[n].axis, REST_ROT[n].deg) : q.id();
/** Ponto local de um nó → cena, na pose de repouso. */
const toScene = (n, p) => { let x = p; for (let k = n; k; k = PARENTS[k]) x = v3.add(localT(k), q.rot(restQ(k), x)); return x; };

const people = hasMakeHuman() ? buildCkmClips(rigInfo({ ...buildNation('pl', { heads: [] }).J })) : null;
if (!people) console.warn('Sem malha base do MakeHuman: correr `npm run fetch` em ../m01-soldiers para gerar os clips.');
const sec = c => +Math.max(...c.tracks.map(t => t.times.at(-1))).toFixed(3);

const manifest = {
  asset: 'ckm wz.30 (1939) no tripé, com fita e caixa — metralhadora da casamata de M01 Tczew (grp_ckm_crew)',
  status: 'PROVISÓRIO VERIFICADO (M01 continua PROTÓTIPO JOGÁVEL)',
  generator: 'tools/assets/m01-ckm-wz30 (node build.mjs)',
  author: 'Claude Code (geometria, texturas e clips gerados por código original neste repositório)',
  license: 'Original do projecto; a licença global do repositório continua por decidir pelo proprietário (ASSET_CREDITS.md). Sem conteúdo de terceiros nem de jogos.',
  tools: ['Node.js', '@gltf-transform/core 4.5.1 (MIT)', 'meshoptimizer 1.3.0 (MIT)', 'jpeg-js 0.4.4 (BSD-3)', 'pngjs 7.0.0 (MIT)', 'three.js 0.186.1 (MIT, capturas)', 'Playwright/Chromium (capturas)'],
  units: 'metros; +Y para cima; cano para −Z; lado direito da arma em +X',
  scale: { unit_m: 1, length_m: CKM.length, measured: 'ver files.*.gun_length_m e bbox_m' },
  frame: 'raiz ckm_wz30 no chão, por baixo do pião do tripé; a arma (nó ckm_elevate) tem origem nos munhões, a 0,60 m do chão',
  variant: 'ckm wz.30 (Browning M1917 polaca, 7,92 mm) de produção 1931–1939, manga de água e tapa-chamas cónico, no tripé de 1939 (wz.30/wz.34) na posição baixa, com fita de tecido de 330 e a caixa de aço caqui. Sem o adaptador antiaéreo, a lata de água e a mangueira de condensação',
  sources: {
    T34: ['https://en.wikipedia.org/wiki/Ckm_wz._30', 'https://muzeum.skarzysko.pl/encyklopedia/item/518-ciezki-karabin-maszynowy-wz-30-browning.html', 'https://opisybroni.pl/ciezki-karabin-maszynowy-browning-wz-30/',
      'http://www.1939.pl/uzbrojenie/polskie/bron-strzelecka/ckm_792mm_wz30_browning/index.html', 'https://dobroni.pl/artykul/ciezki-karabin-maszynowy-n565088', 'https://mhki.kielce.eu/zawartosc/polska-skrzynka-amunicyjna-do-ckm-wz',
      'https://polski-kolekcjoner.pl/2020/03/16/skrzynka-na-tasme-ckm-wz-30-1937/', 'https://www.imfdb.org/wiki/Wz._30_Browning', 'https://en.wikipedia.org/wiki/M1917_Browning_machine_gun',
      'https://www.americanrifleman.org/content/mr-browning-s-gun-the-u-s-model-of-1917-browning-machine-gun/'],
    note: 'T34 só por resumos concordantes de busca (2026-10-02): wikipedia.org, opisybroni.pl, 1939.pl, muzeum.skarzysko.pl, mhki.kielce.eu e archive.org estão bloqueados neste ambiente. Nenhuma página foi lida por inteiro.',
  },
  specs: { caliber: '7,92×57 mm Mauser', belt: CKM.belt_rounds, feed: 'fita de tecido de 330, da esquerda para a direita', rate_rpm: [600, '400–450 práticos'], mass_kg: CKM.mass_kg, water_l: CKM.water_l,
    action: 'recuo curto, ferrolho fechado; alavanca de armar à direita acompanha o ferrolho', sights: 'alça em quadro até 2000 m; massa na frente da manga', tripod: 'wz.30 (29,3 kg, até 880 mm) ou wz.34 (26,3 kg)' },
  measures: MEASURES,
  parts: GROUPS.map(g => ({ node: g.name, parent: PARENTS[g.name] ?? 'ckm_wz30', pivot_scene: PIVOTS[g.name], translation_local: localT(g.name), rest_rotation: REST_ROT[g.name] ?? null,
    moving: g.moving, contents: g.label, pieces: parts.filter(p => p.group === g.name).map(p => p.name) })),
  sockets: { gun: gunSockets(), scene: sceneSockets(), note: 'gun: referencial do nó ckm_elevate (origem nos munhões); scene: raiz ckm_wz30 na pose de repouso. muzzle = boca do cano (dentro do cone); muzzle_flash = boca do tapa-chamas' },
  hands: { gunner: { right: CKM_GRIP.r, left: CKM_GRIP.l }, note: 'pulso, direcção dos dedos e normal da palma no referencial da arma: direita no punho, esquerda encostada ao lado esquerdo da caixa; o municiador segura a fita (ver clips)' },
  crew: people ? people.crew : { loader: LOADER },
  crew_note: 'pos no chão e yaw (graus, 0 = virado para −Z) de cada soldado no referencial da cena; pôr a raiz do GLB m01_soldier_pl_* aí e tocar o clip com o mesmo sufixo do clip da arma',
  materials: [{ name: 'ckm_wz30', painters: Object.keys(PAINTERS), note: 'um material com atlas; aço oxidado escuro, tripé verde-caqui, caixa caqui [T34], madeira, tecido caqui, latão e balas de tombak' }],
  textures: { atlas_px: atlas.size, density_px_per_m: Math.round(atlas.density) },
  files: {},
};

for (const L of LODS) {
  const doc = new Document(), buf = doc.createBuffer(), acc = (type, a) => doc.createAccessor().setType(type).setArray(a).setBuffer(buf);
  const img = k => k && doc.createTexture(k).setImage(atlas.images[k].data).setMimeType(atlas.images[k].mime);
  const mat = doc.createMaterial('ckm_wz30').setBaseColorTexture(img(L.color)).setRoughnessFactor(L.orm ? 1 : 0.6).setMetallicFactor(L.orm ? 1 : 0.15);
  if (L.orm) mat.setMetallicRoughnessTexture(img(L.orm));
  if (L.normal) mat.setNormalTexture(img(L.normal));
  const root = doc.createNode('ckm_wz30').setExtras({ lod: L.id, sockets_gun: gunSockets(), sockets_scene: sceneSockets(), pivots: PIVOTS, crew: manifest.crew,
    attach: 'pôr no chão da casamata, com −Z para a seteira; os clips ckm_wz30_gun_* animam os nós por nome' });
  const nodes = {}, meshes = [], min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  let gunMin = Infinity, gunMax = -Infinity;
  for (const m0 of merged) {
    const n = m0.name, m = await simplify(m0, L.ratio, { error: L.error, flags: L.flags ?? [] });
    const prim = doc.createPrimitive().setMaterial(mat).setIndices(acc('SCALAR', Uint16Array.from(m.indices)))
      .setAttribute('POSITION', acc('VEC3', Float32Array.from(m.positions))).setAttribute('NORMAL', acc('VEC3', Float32Array.from(m.normals)))
      .setAttribute('TEXCOORD_0', acc('VEC2', Float32Array.from(m.uvs)));
    nodes[n] = doc.createNode(n).setTranslation(localT(n)).setRotation(restQ(n)).setMesh(doc.createMesh(n).addPrimitive(prim));
    meshes.push({ name: n, triangles: m.indices.length / 3 });
    for (let i = 0; i < m.positions.length; i += 3) {
      const v = toScene(n, [m.positions[i], m.positions[i + 1], m.positions[i + 2]]);
      for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], v[k]); max[k] = Math.max(max[k], v[k]); }
      if (n === 'ckm_elevate') { gunMin = Math.min(gunMin, v[2]); gunMax = Math.max(gunMax, v[2]); }
    }
  }
  for (const g of GROUPS) (PARENTS[g.name] ? nodes[PARENTS[g.name]] : root).addChild(nodes[g.name]);
  // Clips dos nós da arma (mesmos nomes de sufixo e durações dos clips da guarnição).
  for (const c of people?.gun ?? []) {
    const anim = doc.createAnimation(c.name).setExtras(c.extras);
    for (const t of c.tracks) {
      const s = doc.createAnimationSampler().setInput(acc('SCALAR', Float32Array.from(t.times))).setOutput(acc(t.path === 'rotation' ? 'VEC4' : 'VEC3', Float32Array.from(t.values)))
        .setInterpolation(t.interpolation ?? 'LINEAR');
      anim.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(nodes[t.node]).setTargetPath(t.path).setSampler(s));
    }
  }
  doc.createScene('ckm_wz30').addChild(root);
  doc.getRoot().getAsset().generator = 'COD-guerra tools/assets/m01-ckm-wz30 (gltf-transform)';
  doc.getRoot().setExtras({ units: 'meters', license: manifest.license });
  const file = `m01_ckm_wz30_${L.id}.glb`, path = join(OUT, file);
  await new NodeIO().write(path, doc);
  const bytes = statSync(path).size, tris = meshes.reduce((s, m) => s + m.triangles, 0);
  manifest.files[file] = { lod: L.id, use: L.use, bytes, triangles: tris, draw_calls: meshes.length, meshes, gun_length_m: +(gunMax - gunMin).toFixed(4),
    bbox_m: { min: min.map(x => +x.toFixed(4)), max: max.map(x => +x.toFixed(4)) },
    textures: Object.fromEntries([['baseColor', L.color], ['metallicRoughness', L.orm], ['normal', L.normal]].filter(([, k]) => k).map(([n, k]) => [n, `${atlas.images[k].mime} ${k === 'color' ? 1024 : +(k.split('_')[1] ?? 512)}²`])),
    animations: (people?.gun ?? []).map(c => c.name) };
  console.log(file, (bytes / 1e3).toFixed(0), 'kB;', tris, 'triângulos; arma', (gunMax - gunMin).toFixed(3), 'm');
}

if (people) {
  // Só o esqueleto do soldado polaco e os clips da guarnição; ligar por nome aos GLB m01_soldier_pl_*.
  const J = { ...buildNation('pl', { heads: [] }).J }, file = 'm01_ckm_wz30_animations.glb';
  const r = await writeCharacter(join(OUT, file), { name: 'm01_ckm_wz30_animations', bones: GAME_BONES, joints: J, materials: {}, meshes: [], animations: people.people,
    extras: { note: 'Só esqueleto e clips da guarnição; ligar por nome aos GLB m01_soldier_pl_*, com a raiz em crew.<papel> da cena da ckm', crew: people.crew } });
  manifest.files[file] = { bytes: r.bytes, clips: people.people.map(c => ({ name: c.name, role: c.extras.role, duration: sec(c), loop: c.extras.loop, events: c.extras.events, sync: c.extras.sync })) };
  manifest.gun_clips = people.gun.map(c => ({ name: c.name, duration: sec(c), loop: c.extras.loop, events: c.extras.events }));
  console.log(file, (r.bytes / 1e3).toFixed(0), 'kB;', people.people.map(c => c.name).join(', '));
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
