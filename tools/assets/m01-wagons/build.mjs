// Gera os vagões de M01 (coberto e aberto): GLB em metros com três LODs, rodados e portas animados, e manifest.json.
// Uso: npm ci (aqui e em ../m01-soldiers) && node build.mjs [--out dir]
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { MeshoptSimplifier } from 'meshoptimizer';
import { computeNormals } from '../m01-soldiers/src/meshops.mjs';
import { bakeAtlas } from '../m01-soldiers/src/textures.mjs';
import { TYPES, WAGON, MEASURES, PAINTERS, pivots, sockets } from './src/wagons.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const ROOT = new URL('../../../', import.meta.url).pathname;
const OUT = opt('out', join(ROOT, 'assets/models/provisional/m01-wagons'));
mkdirSync(OUT, { recursive: true });

/** Simplificação com meshoptimizer (posição + normal + UV). */
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

const LODS = [
  { id: 'lod0', ratio: 1, color: 'color', orm: 'orm', use: 'perto (< 60 m): pátio da estação, cobertura cv_wagon_*, desembarque dos pioneiros' },
  { id: 'lod1', ratio: 0.4, error: 0.02, flags: ['Permissive', 'Prune'], color: 'color_512', orm: 'orm_256', use: 'médio (60–300 m)' },
  { id: 'lod2', ratio: 0.12, error: 0.05, flags: ['Permissive', 'Prune'], color: 'color_256', orm: null, use: 'longe: trem 963 a ~1,05–1,2 km; InstancedMesh; Chromebook' },
];
const LABELS = {
  body: 'caixa, estrado, tampões, engates, caixas de eixo, molas, freios e degraus',
  wheelset_1: 'rodado dianteiro (−Z): duas rodas de raios e eixo; roda em torno do X local',
  wheelset_2: 'rodado traseiro (+Z)',
  door_r: 'porta de correr direita (+X); desliza +1,95 m em Z por fora dos montantes',
  door_l: 'porta de correr esquerda (−X)',
};
const quat = (axis, a) => [axis[0] * Math.sin(a / 2), axis[1] * Math.sin(a / 2), axis[2] * Math.sin(a / 2), Math.cos(a / 2)];
const ANIMS = {
  wheels_roll: { duration: 1, loop: true, note: 'uma volta por segundo, a rolar para −Z; no jogo timeScale = v / (π × 1,0 m) (v em m/s; negativo para recuar)' },
  doors_open: { duration: 1.5, loop: false, note: 'as duas portas correm +1,95 m em Z; fechar = tocar ao contrário (timeScale −1). Só o coberto.' },
};

const manifest = {
  asset: 'Vagões de mercadorias de dois eixos — trem 963 (65 vagões) e pátio da estação de Tczew, M01',
  status: 'PROVISÓRIO VERIFICADO (galeria isolada; M01 continua PROTÓTIPO JOGÁVEL)',
  generator: 'tools/assets/m01-wagons (node build.mjs)',
  author: 'Claude Code (geometria, pintura e animações geradas por código original neste repositório)',
  license: 'Original do projecto; a licença global do repositório continua por decidir pelo proprietário (ASSET_CREDITS.md). Sem modelos, texturas ou fotografias de terceiros nem conteúdo de jogos.',
  tools: ['Node.js', '@gltf-transform/core 4.5.1 (MIT)', 'meshoptimizer 1.3.0 (MIT)', 'jpeg-js 0.4.4 (BSD-3)', 'pngjs 7.0.0 (MIT)', 'three.js 0.186.1 (MIT, verificação)', 'Playwright/Chromium (capturas)'],
  units: 'metros; +Y para cima; frente em −Z (vagões simétricos)',
  pivot: 'origem no topo do carril, ao centro da via e a meio do vagão (entre os rodados); sem coordenadas globais de Tczew',
  identification: {
    status: 'P16 ABERTA: só se sabe o número do trem (963) e os 65 vagões (T07, T08); a classe da locomotiva e os tipos de vagão continuam por identificar',
    choice: 'dois tipos genéricos da época com proporções da construção normalizada alemã (Verbandsbauart): coberto tipo G (G 10) e aberto tipo O. Não afirmam classe, dono nem país; servem também os vagões comuns do pátio oeste (freight_wagons_west, cv_wagon_1/2).',
    not_modelled: ['inscrições de dono, número, classe e datas (sem fonte)', 'garita do guarda-freio e plataforma de freio de mão', 'carga dentro do vagão aberto', 'locomotiva (depois de P16)'],
  },
  sources: {
    T07: ['https://de.wikipedia.org/wiki/Angriff_auf_die_Weichselbr%C3%BCcke_bei_Dirschau'],
    T08: ['https://www.konflikty.pl/historia/druga-wojna-swiatowa/walka-o-tczewskie-mosty-1-wrzesnia-1939-roku/'],
    note: 'Só resumos (research/SOURCES.md). As medidas dos vagões vêm de conhecimento geral da Verbandsbauart e estão marcadas como estimadas; nenhuma ficha técnica foi lida neste ambiente.',
  },
  measures: MEASURES,
  dimensions_m: WAGON,
  types: {},
  animations: ANIMS,
  files: {},
};

for (const [type, T] of Object.entries(TYPES)) {
  const parts = T.build();
  for (const p of parts) computeNormals(p, p.weld);
  const atlas = bakeAtlas(parts, PAINTERS, { size: 1024, ormSize: 512, normalSize: 16, extraSizes: [512, 256], ormExtra: [256] });
  const PIV = pivots(type), groups = Object.keys(PIV);
  const merged = groups.map(g => {
    const out = { name: g, positions: [], normals: [], uvs: [], indices: [] }, t = PIV[g].t;
    for (const p of parts.filter(q => q.group === g)) {
      const base = out.positions.length / 3;
      for (let i = 0; i < p.positions.length; i += 3) { out.positions.push(p.positions[i] - t[0], p.positions[i + 1] - t[1], p.positions[i + 2] - t[2]); out.normals.push(...p.normals.slice(i, i + 3)); }
      out.uvs.push(...p.atlasUV); out.indices.push(...p.indices.map(i => i + base));
    }
    return out;
  });
  manifest.types[type] = {
    label: T.label, nodes: groups.map(g => ({ node: g, translation: PIV[g].t, contents: LABELS[g], pieces: parts.filter(p => p.group === g).map(p => p.name) })),
    sockets: sockets(type), animations: Object.keys(ANIMS).filter(a => a !== 'doors_open' || type === 'covered'),
    textures: { atlas_px: atlas.size, density_px_per_m: Math.round(atlas.density), painters: [...new Set(parts.map(p => p.paint))] },
  };

  for (const L of LODS) {
    const doc = new Document(), buf = doc.createBuffer(), acc = (t, a) => doc.createAccessor().setType(t).setArray(a).setBuffer(buf);
    const img = k => k && doc.createTexture(k).setImage(atlas.images[k].data).setMimeType(atlas.images[k].mime);
    const mat = doc.createMaterial(`wagon_${type}`).setBaseColorTexture(img(L.color)).setRoughnessFactor(L.orm ? 1 : 0.85).setMetallicFactor(L.orm ? 1 : 0.1);
    if (L.orm) mat.setMetallicRoughnessTexture(img(L.orm));
    const root = doc.createNode(`wagon_${type}`).setExtras({ lod: L.id, type, sockets: sockets(type), dimensions_m: { length_over_buffers: WAGON.lop, width: WAGON.width, height: T.height } });
    const nodes = {}, meshes = [];
    for (const m0 of merged) {
      const m = await simplify(m0, m0.name === 'body' ? L.ratio : Math.max(L.ratio, 0.2), { error: L.error, flags: L.flags ?? [] });
      const prim = doc.createPrimitive().setMaterial(mat).setIndices(acc('SCALAR', Uint16Array.from(m.indices)))
        .setAttribute('POSITION', acc('VEC3', Float32Array.from(m.positions))).setAttribute('NORMAL', acc('VEC3', Float32Array.from(m.normals))).setAttribute('TEXCOORD_0', acc('VEC2', Float32Array.from(m.uvs)));
      nodes[m0.name] = doc.createNode(m0.name).setTranslation(PIV[m0.name].t).setMesh(doc.createMesh(m0.name).addPrimitive(prim));
      root.addChild(nodes[m0.name]);
      meshes.push({ name: m0.name, triangles: m.indices.length / 3 });
    }
    // Rodados: uma volta por segundo a rolar para −Z (rotação negativa em X); 4 chaves para o slerp seguir o sentido.
    const kt = [0, 0.25, 0.5, 0.75, 1], roll = doc.createAnimation('wheels_roll').setExtras(ANIMS.wheels_roll);
    const rin = acc('SCALAR', Float32Array.from(kt)), rout = acc('VEC4', Float32Array.from(kt.flatMap(t => quat([-1, 0, 0], t * 2 * Math.PI))));
    for (const g of ['wheelset_1', 'wheelset_2']) {
      const s = doc.createAnimationSampler().setInput(rin).setOutput(rout).setInterpolation('LINEAR');
      roll.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(nodes[g]).setTargetPath('rotation').setSampler(s));
    }
    if (type === 'covered') {
      const dt = Array.from({ length: 7 }, (_, i) => i * ANIMS.doors_open.duration / 6), open = doc.createAnimation('doors_open').setExtras(ANIMS.doors_open);
      const din = acc('SCALAR', Float32Array.from(dt)), ease = t => t * t * (3 - 2 * t);
      for (const g of ['door_r', 'door_l']) {
        const t0 = PIV[g].t, s = doc.createAnimationSampler().setInput(din).setInterpolation('LINEAR')
          .setOutput(acc('VEC3', Float32Array.from(dt.flatMap(t => [t0[0], t0[1], t0[2] + WAGON.covered.door.travel * ease(t / ANIMS.doors_open.duration)]))));
        open.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(nodes[g]).setTargetPath('translation').setSampler(s));
      }
    }
    doc.createScene(`wagon_${type}`).addChild(root);
    doc.getRoot().getAsset().generator = 'COD-guerra tools/assets/m01-wagons (gltf-transform)';
    doc.getRoot().setExtras({ units: 'meters', license: manifest.license });
    const file = `m01_wagon_${type}_${L.id}.glb`, path = join(OUT, file);
    await new NodeIO().write(path, doc);
    const tris = meshes.reduce((s, m) => s + m.triangles, 0), size = k => k.includes('_') ? k.split('_')[1] : { color: 1024, orm: 512 }[k];
    manifest.files[file] = { type, lod: L.id, use: L.use, bytes: statSync(path).size, triangles: tris, draw_calls: meshes.length, materials: [`wagon_${type}`], meshes,
      textures: { baseColor: `${atlas.images[L.color].mime} ${size(L.color)}²`, ...(L.orm ? { metallicRoughness: `${atlas.images[L.orm].mime} ${size(L.orm)}²` } : {}) } };
    console.log(file, (manifest.files[file].bytes / 1e3).toFixed(0), 'kB;', tris, 'triângulos');
  }
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
