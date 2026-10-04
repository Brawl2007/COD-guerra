// Gera as variantes queimada e danificada dos vagões de M01 (coberto e aberto): GLB em metros com três LODs, rodados
// animados, manifest.json com triângulos, draw calls, bytes e caixas comparadas com o intacto.
// Uso: npm ci (aqui, em ../m01-wagons e em ../m01-soldiers) && node build.mjs [--out dir]
import { mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { MeshoptSimplifier } from 'meshoptimizer';
import { computeNormals } from '../m01-soldiers/src/meshops.mjs';
import { bakeAtlas } from '../m01-soldiers/src/textures.mjs';
import { TYPES, WAGON } from '../m01-wagons/src/wagons.mjs';
import { STATES, IMPACT, pivots, sockets, animations, DOORS_OPEN, painters } from './src/damage.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const ROOT = new URL('../../../', import.meta.url).pathname;
const OUT = opt('out', join(ROOT, 'assets/models/provisional/m01-wagon-damage'));
mkdirSync(OUT, { recursive: true });

/** Simplificação com meshoptimizer (posição + normal + UV), com os mesmos pesos do kit intacto. */
async function simplify(mesh, ratio, { error = 0.02, flags = [] } = {}) {
  if (ratio >= 1) return mesh;
  await MeshoptSimplifier.ready;
  const n = mesh.positions.length / 3, attr = new Float32Array(n * 5);
  for (let i = 0; i < n; i++) attr.set([mesh.normals[i * 3], mesh.normals[i * 3 + 1], mesh.normals[i * 3 + 2], mesh.uvs[i * 2], mesh.uvs[i * 2 + 1]], i * 5);
  const target = Math.max(36, Math.floor(mesh.indices.length * ratio / 3) * 3);
  const [idx] = MeshoptSimplifier.simplifyWithAttributes(Uint32Array.from(mesh.indices), Float32Array.from(mesh.positions), 3, attr, 5, [0.4, 0.4, 0.4, 2, 2], null, target, error, flags);
  const remap = new Map(), out = { name: mesh.name, positions: [], normals: [], uvs: [], indices: [] };
  for (const i of idx) {
    if (!remap.has(i)) { remap.set(i, remap.size); out.positions.push(...mesh.positions.slice(i * 3, i * 3 + 3)); out.normals.push(...mesh.normals.slice(i * 3, i * 3 + 3)); out.uvs.push(mesh.uvs[i * 2], mesh.uvs[i * 2 + 1]); }
    out.indices.push(remap.get(i));
  }
  return out;
}
const bboxOf = list => {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const [pos, t] of list) for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { const v = pos[i + k] + t[k]; min[k] = Math.min(min[k], v); max[k] = Math.max(max[k], v); }
  return { min: min.map(x => +x.toFixed(3)), max: max.map(x => +x.toFixed(3)) };
};
const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');

const LODS = [
  { id: 'lod0', ratio: 1, color: 'color', orm: 'orm', use: 'perto (< 60 m): pátio da estação, vagão de station_wagon_fire, desembarque' },
  { id: 'lod1', ratio: 0.4, error: 0.02, flags: ['Permissive', 'Prune'], color: 'color_512', orm: 'orm_256', use: 'médio (60–300 m)' },
  { id: 'lod2', ratio: 0.12, error: 0.05, flags: ['Permissive', 'Prune'], color: 'color_256', orm: null, use: 'longe: trem 963 a ~1,05–1,2 km; InstancedMesh; Chromebook' },
];
const LABELS = {
  body: 'caixa danificada, estrado, tampões, engates, caixas de eixo, molas, freios e degraus',
  wheelset_1: 'rodado dianteiro (−Z), igual ao intacto; roda em torno do X local',
  wheelset_2: 'rodado traseiro (+Z), igual ao intacto',
  door_r: 'porta direita (+X), pivô igual ao intacto',
  door_l: 'porta esquerda (−X), pivô igual ao intacto',
  debris: 'restos soltos (tábuas, lascas, cinza, carga ardida) dentro do vagão ou presos à caixa; só visuais',
};
const quat = (axis, a) => [axis[0] * Math.sin(a / 2), axis[1] * Math.sin(a / 2), axis[2] * Math.sin(a / 2), Math.cos(a / 2)];
const ANIMS = {
  wheels_roll: { duration: 1, loop: true, note: 'igual ao intacto: uma volta por segundo a rolar para −Z; timeScale = v / (π × 1,0 m)' },
  doors_open: { duration: 1.5, loop: false, note: 'só no coberto danificado e só a porta esquerda (a direita saiu da guia); corre +1,95 m em Z; fechar = timeScale −1' },
};

// Ficheiros do kit intacto (PR #29) reutilizados sem alteração: o teste confirma os hashes.
const INTACT_DIR = 'assets/models/provisional/m01-wagons/';
const REUSED = ['m01_wagon_covered_lod0.glb', 'm01_wagon_covered_lod1.glb', 'm01_wagon_covered_lod2.glb', 'm01_wagon_open_lod0.glb', 'm01_wagon_open_lod1.glb', 'm01_wagon_open_lod2.glb', 'manifest.json']
  .map(f => INTACT_DIR + f).concat(['tools/assets/m01-wagons/src/wagons.mjs', 'tools/assets/m01-wagons/build.mjs']);

const manifest = {
  asset: 'Vagões de mercadorias de dois eixos queimados e danificados — variantes genéricas para o trem 963 e o pátio da estação, M01',
  status: 'PROVISÓRIO VERIFICADO (galeria isolada; M01 continua PROTÓTIPO JOGÁVEL)',
  generator: 'tools/assets/m01-wagon-damage (node build.mjs)',
  author: 'Claude Code (geometria, pintura e animações geradas por código original neste repositório, a partir das peças do kit intacto)',
  license: 'Original do projecto; a licença global do repositório continua por decidir pelo proprietário (ASSET_CREDITS.md). Sem modelos, texturas ou fotografias de terceiros nem conteúdo de jogos.',
  tools: ['Node.js', '@gltf-transform/core 4.5.1 (MIT)', 'meshoptimizer 1.3.0 (MIT)', 'jpeg-js 0.4.4 (BSD-3)', 'pngjs 7.0.0 (MIT)', 'three.js 0.186.1 (MIT, verificação)', 'Playwright/Chromium (capturas)'],
  units: 'metros; +Y para cima; frente em −Z (vagões simétricos)',
  pivot: 'como no intacto: origem no topo do carril, ao centro da via e a meio do vagão; passo de 9,10 m entre faces dos tampões',
  base: { kit: INTACT_DIR, generator: 'tools/assets/m01-wagons/src/wagons.mjs (importado; não editado)', sha256: Object.fromEntries(REUSED.map(f => [f, { sha256: sha(join(ROOT, f)), bytes: statSync(join(ROOT, f)).size }])) },
  identification: {
    status: 'P16 ABERTA: variantes genéricas para composição; não afirmam quais vagões históricos arderam ou foram atingidos, nem a classe, o dono ou o país',
    not_modelled: ['locomotiva', 'inscrições de dono, número, classe e datas', 'fogo, brasas ou fumo próprios (o evento station_wagon_fire pertence à simulação; usar os sockets fire e smoke_top)', 'descarrilamento ou física das peças'],
  },
  runtime: {
    states: ['intact (kit de m01-wagons)', 'burned', 'damaged'],
    choice: 'a simulação decide o vagão e o estado (p. ex. station_wagon_fire → burned); o renderer só troca o GLB do mesmo tipo, na mesma posição e com o mesmo passo',
    collision: 'não inferir colisão de peças partidas ou de restos (nó debris): uma colisão futura deve usar a caixa do vagão intacto do mesmo tipo',
    no_autonomous_effects: 'os GLB não têm fogo, fumo, partículas, luzes nem temporizadores',
  },
  states: {},
  impact: IMPACT,
  animations: ANIMS,
  files: {},
};

for (const [state, S] of Object.entries(STATES)) for (const type of Object.keys(TYPES)) {
  const V = S[type], { parts, removed, added, deformed } = V.build();
  for (const p of parts) computeNormals(p, p.weld);
  const atlas = bakeAtlas(parts, painters(type, state), { size: 1024, ormSize: 512, normalSize: 16, extraSizes: [512, 256], ormExtra: [256] });
  const PIV = pivots(type), groups = Object.keys(PIV).filter(g => parts.some(p => p.group === g));
  const merged = groups.map(g => {
    const out = { name: g, positions: [], normals: [], uvs: [], indices: [] }, t = PIV[g].t;
    for (const p of parts.filter(q => q.group === g)) {
      const base = out.positions.length / 3;
      for (let i = 0; i < p.positions.length; i += 3) { out.positions.push(p.positions[i] - t[0], p.positions[i + 1] - t[1], p.positions[i + 2] - t[2]); out.normals.push(...p.normals.slice(i, i + 3)); }
      out.uvs.push(...p.atlasUV); out.indices.push(...p.indices.map(i => i + base));
    }
    return out;
  });
  const intact = TYPES[type].build(), intactBox = bboxOf([[intact.flatMap(p => p.positions), [0, 0, 0]]]);
  const key = `${type}_${state}`, anims = animations(type, state);
  manifest.states[key] = {
    type, state, label: `${TYPES[type].label}, ${S.label}`, summary: V.summary,
    changes_vs_intact: { removed, added, deformed },
    nodes: groups.map(g => ({ node: g, translation: PIV[g].t, contents: LABELS[g], pieces: parts.filter(p => p.group === g).map(p => p.name) })),
    sockets: sockets(type, state), animations: anims, ...(DOORS_OPEN[type]?.[state] ? { doors_open_nodes: DOORS_OPEN[type][state] } : {}),
    textures: { atlas_px: atlas.size, density_px_per_m: Math.round(atlas.density), painters: [...new Set(parts.map(p => p.paint))] },
    intact_lod0_bbox_m: intactBox,
  };

  for (const L of LODS) {
    const doc = new Document(), buf = doc.createBuffer(), acc = (t, a) => doc.createAccessor().setType(t).setArray(a).setBuffer(buf);
    const img = k => k && doc.createTexture(k).setImage(atlas.images[k].data).setMimeType(atlas.images[k].mime);
    const mat = doc.createMaterial(`wagon_${key}`).setBaseColorTexture(img(L.color)).setRoughnessFactor(L.orm ? 1 : 0.9).setMetallicFactor(L.orm ? 1 : 0.05);
    if (L.orm) mat.setMetallicRoughnessTexture(img(L.orm));
    const root = doc.createNode(`wagon_${key}`).setExtras({ lod: L.id, type, state, sockets: sockets(type, state), dimensions_m: { length_over_buffers: WAGON.lop, width: WAGON.width, intact_height: TYPES[type].height } });
    const nodes = {}, meshes = [], boxes = [];
    for (const m0 of merged) {
      const m = await simplify(m0, m0.name === 'body' ? L.ratio : Math.max(L.ratio, 0.2), { error: L.error, flags: L.flags ?? [] });
      const prim = doc.createPrimitive().setMaterial(mat).setIndices(acc('SCALAR', Uint16Array.from(m.indices)))
        .setAttribute('POSITION', acc('VEC3', Float32Array.from(m.positions))).setAttribute('NORMAL', acc('VEC3', Float32Array.from(m.normals))).setAttribute('TEXCOORD_0', acc('VEC2', Float32Array.from(m.uvs)));
      nodes[m0.name] = doc.createNode(m0.name).setTranslation(PIV[m0.name].t).setMesh(doc.createMesh(m0.name).addPrimitive(prim));
      root.addChild(nodes[m0.name]);
      meshes.push({ name: m0.name, triangles: m.indices.length / 3 });
      boxes.push([m.positions, PIV[m0.name].t]);
    }
    const kt = [0, 0.25, 0.5, 0.75, 1], roll = doc.createAnimation('wheels_roll').setExtras(ANIMS.wheels_roll);
    const rin = acc('SCALAR', Float32Array.from(kt)), rout = acc('VEC4', Float32Array.from(kt.flatMap(t => quat([-1, 0, 0], t * 2 * Math.PI))));
    for (const g of ['wheelset_1', 'wheelset_2']) {
      const s = doc.createAnimationSampler().setInput(rin).setOutput(rout).setInterpolation('LINEAR');
      roll.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(nodes[g]).setTargetPath('rotation').setSampler(s));
    }
    if (anims.includes('doors_open')) {
      const dt = Array.from({ length: 7 }, (_, i) => i * ANIMS.doors_open.duration / 6), open = doc.createAnimation('doors_open').setExtras(ANIMS.doors_open);
      const din = acc('SCALAR', Float32Array.from(dt)), ease = t => t * t * (3 - 2 * t);
      for (const g of DOORS_OPEN[type][state]) {
        const t0 = PIV[g].t, s = doc.createAnimationSampler().setInput(din).setInterpolation('LINEAR')
          .setOutput(acc('VEC3', Float32Array.from(dt.flatMap(t => [t0[0], t0[1], t0[2] + WAGON.covered.door.travel * ease(t / ANIMS.doors_open.duration)]))));
        open.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(nodes[g]).setTargetPath('translation').setSampler(s));
      }
    }
    doc.createScene(`wagon_${key}`).addChild(root);
    doc.getRoot().getAsset().generator = 'COD-guerra tools/assets/m01-wagon-damage (gltf-transform)';
    doc.getRoot().setExtras({ units: 'meters', license: manifest.license, state });
    const file = `m01_wagon_${key}_${L.id}.glb`, path = join(OUT, file);
    await new NodeIO().write(path, doc);
    const tris = meshes.reduce((s, m) => s + m.triangles, 0), size = k => k.includes('_') ? k.split('_')[1] : { color: 1024, orm: 512 }[k], bbox = bboxOf(boxes);
    manifest.files[file] = {
      type, state, lod: L.id, use: L.use, bytes: statSync(path).size, triangles: tris, visible_triangles: tris, draw_calls: meshes.length, materials: [`wagon_${key}`], meshes,
      textures: { baseColor: `${atlas.images[L.color].mime} ${size(L.color)}²`, ...(L.orm ? { metallicRoughness: `${atlas.images[L.orm].mime} ${size(L.orm)}²` } : {}) },
      bbox_m: bbox, bbox_delta_vs_intact_lod0_m: { min: bbox.min.map((v, k) => +(v - intactBox.min[k]).toFixed(3)), max: bbox.max.map((v, k) => +(v - intactBox.max[k]).toFixed(3)) },
    };
    console.log(file, (manifest.files[file].bytes / 1e3).toFixed(0), 'kB;', tris, 'triângulos;', meshes.length, 'draw calls; bbox', JSON.stringify(bbox));
  }
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
