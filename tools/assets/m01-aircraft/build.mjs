// Gera o Ju 87 B-1 de M01: GLB em metros com três LODs, hélice e freios de mergulho animados, e manifest.json.
// Uso: npm ci && node build.mjs [--out dir]
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { MeshoptSimplifier } from 'meshoptimizer';
import { computeNormals } from './src/lib/meshops.mjs';
import { bakeAtlas } from './src/lib/textures.mjs';
import { buildJu87, PIVOTS, PAINTERS, JU87, MEASURES, sockets, BRAKE } from './src/ju87.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const ROOT = new URL('../../../', import.meta.url).pathname;
const OUT = opt('out', join(ROOT, 'assets/models/provisional/m01-aircraft'));
mkdirSync(OUT, { recursive: true });

const parts = buildJu87();
for (const p of parts) computeNormals(p);
const atlas = bakeAtlas(parts, PAINTERS, { size: 2048, ormSize: 1024, normalSize: 16, extraSizes: [1024, 512], ormExtra: [512] });
const GROUPS = [
  { name: 'fuselage', label: 'célula: fuselagem e capota do motor, radiador, escapes, capota envidraçada, MG 15, asas em gaivota, flaperons Junkers, trem carenado com sirenes, cauda escorada, roda de cauda, garfo da bomba' },
  { name: 'propeller', label: 'cone e hélice tripá (roda em torno do seu Z local)' },
  { name: 'dive_brake_r', label: 'freio de mergulho direito (roda em torno do seu X local, a dobradiça)' },
  { name: 'dive_brake_l', label: 'freio de mergulho esquerdo' },
  { name: 'bomb_sc250', label: 'bomba SC 250 no garfo ventral (o jogo esconde-a ao largar)' },
];
const merged = GROUPS.map(g => {
  const ps = parts.filter(p => p.group === g.name), pv = PIVOTS[g.name], out = { name: g.name, positions: [], normals: [], uvs: [], indices: [] };
  const c = Math.cos(-(pv.roll ?? 0)), s = Math.sin(-(pv.roll ?? 0));   // geometria no referencial do nó: subtrai o pivô e desfaz a rotação
  const local = (v, isPos) => { const [x, y, z] = isPos ? [v[0] - pv.t[0], v[1] - pv.t[1], v[2] - pv.t[2]] : v; return [x * c - y * s, x * s + y * c, z]; };
  for (const p of ps) {
    const base = out.positions.length / 3;
    for (let i = 0; i < p.positions.length; i += 3) { out.positions.push(...local(p.positions.slice(i, i + 3), true)); out.normals.push(...local(Array.from(p.normals.slice(i, i + 3)), false)); }
    out.uvs.push(...p.atlasUV); out.indices.push(...p.indices.map(i => i + base));
  }
  return out;
});

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
  { id: 'lod0', ratio: 1, color: 'color', orm: 'orm', use: 'perto (< 150 m), capturas, mergulho sobre o jogador' },
  { id: 'lod1', ratio: 0.35, error: 0.01, flags: ['Permissive'], color: 'color_1024', orm: 'orm_512', use: 'médio (150–600 m)' },
  { id: 'lod2', ratio: 0.1, error: 0.05, flags: ['Permissive'], color: 'color_512', orm: null, use: 'longe (> 600 m); Chromebook' },
];
const quat = (axis, a) => [axis[0] * Math.sin(a / 2), axis[1] * Math.sin(a / 2), axis[2] * Math.sin(a / 2), Math.cos(a / 2)];
const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const nodeRot = g => quat([0, 0, 1], PIVOTS[g].roll ?? 0);

const manifest = {
  asset: 'Junkers Ju 87 B-1 (3./StG 1) — raid das 04:34 sobre Tczew, M01',
  status: 'PROVISÓRIO VERIFICADO (galeria isolada; M01 continua PROTÓTIPO JOGÁVEL)',
  generator: 'tools/assets/m01-aircraft (node build.mjs)',
  author: 'Claude Code (geometria, pintura e animações geradas por código original neste repositório)',
  license: 'Original do projecto; a licença global do repositório continua por decidir pelo proprietário (ASSET_CREDITS.md). Sem modelos, texturas ou fotografias de terceiros nem conteúdo de jogos.',
  tools: ['Node.js', '@gltf-transform/core 4.5.1 (MIT)', 'meshoptimizer 1.3.0 (MIT)', 'jpeg-js 0.4.4 (BSD-3)', 'pngjs 7.0.0 (MIT)', 'three.js 0.186.1 (MIT, verificação)', 'Playwright/Chromium (capturas)'],
  units: 'metros; +Y para cima; nariz para −Z; asa direita em +X',
  pivot: 'origem = centro de gravidade estimado sobre o eixo de tracção (voo: rodar/inclinar em torno da origem); sem coordenadas globais de Tczew',
  variant: {
    id: 'Ju 87 B-1', confirmed_by: ['T12: três Ju 87 B da 3./StG 1 (Dilley, Schiller, Grenzel), Elbing, 04:34–04:35', 'research/equipment-timeline.json ju87b'],
    features: ['asa em gaivota invertida com flaperons Junkers (Doppelflügel)', 'trem fixo com carenagens grandes ("calças") e sirenes à frente', 'radiador grande debaixo do motor Jumo 211 (o D tem radiadores sob as asas e capota do motor diferente)', 'capota comprida com atirador e uma MG 15', 'estabilizador escorado por montantes', 'freios de mergulho sob as asas exteriores'],
    not_modelled: ['variantes D/G', 'código da unidade e letras', 'suástica da deriva (omitida de propósito, política dos soldados)'],
    certainty: 'MÉDIA: variante B pela fonte T12 (resumo); traços do B-1 por conhecimento geral, sem fonte primária lida neste ambiente',
  },
  sources: {
    T29: ['https://www.flugzeuginfo.net/acdata_php/acdata_ju87_en.php', 'airpages.ru (Ju 87 B-1)'],
    T12: ['https://en.wikipedia.org/wiki/Sturzkampfgeschwader_1'],
    T10: ['https://polskieradio24.pl/artykul/2360661,1-wrzesnia-1939-o-godzinie-434-bomby-spadly-na-tczew'],
    note: 'Só resumos: flugzeuginfo.net, wikipedia.org e Sketchfab (WAF) sem acesso neste ambiente; airpages.ru 403. Os candidatos CC-BY do Sketchfab de assets-m01.json não foram usados nem verificados.',
  },
  measures: MEASURES,
  nodes: GROUPS.map(g => ({ node: g.name, translation: PIVOTS[g.name].t, rotation_z_rad: PIVOTS[g.name].roll ?? 0, contents: g.label, pieces: parts.filter(p => p.group === g.name).map(p => p.name) })),
  sockets: sockets(),
  animations: [
    { name: 'propeller_spin', duration: 1, loop: true, node: 'propeller', note: 'uma volta por segundo em torno de −Z (sentido horário visto do piloto); no jogo usar timeScale = rpm/60 (~1500 rpm na hélice em cruzeiro: valor estimado)' },
    { name: 'dive_brakes_extend', duration: 1.2, loop: false, nodes: ['dive_brake_l', 'dive_brake_r'], note: '0 → 90° em torno da dobradiça; recolher = tocar ao contrário (timeScale −1)' },
  ],
  textures: { atlas_px: atlas.size, density_px_per_m: Math.round(atlas.density), painters: Object.keys(PAINTERS), camouflage: 'RLM 70/71 em lascas por cima, RLM 65 por baixo (cores aproximadas em sRGB)' },
  files: {},
};

for (const L of LODS) {
  const doc = new Document(), buf = doc.createBuffer(), acc = (type, a) => doc.createAccessor().setType(type).setArray(a).setBuffer(buf);
  const img = k => k && doc.createTexture(k).setImage(atlas.images[k].data).setMimeType(atlas.images[k].mime);
  const mat = doc.createMaterial('ju87_b1').setBaseColorTexture(img(L.color)).setRoughnessFactor(L.orm ? 1 : 0.72).setMetallicFactor(L.orm ? 1 : 0.05);
  if (L.orm) mat.setMetallicRoughnessTexture(img(L.orm));
  const root = doc.createNode('ju87_b1').setExtras({ lod: L.id, variant: 'Ju 87 B-1', sockets: sockets(), dimensions_m: { length: JU87.length, span: JU87.span, height: JU87.height } });
  const nodes = {}, meshes = [];
  for (const m0 of merged) {
    const m = await simplify(m0, m0.name === 'fuselage' ? L.ratio : Math.max(L.ratio, 0.25), { error: L.error, flags: L.flags ?? [] });
    const prim = doc.createPrimitive().setMaterial(mat).setIndices(acc('SCALAR', Uint16Array.from(m.indices)))
      .setAttribute('POSITION', acc('VEC3', Float32Array.from(m.positions))).setAttribute('NORMAL', acc('VEC3', Float32Array.from(m.normals))).setAttribute('TEXCOORD_0', acc('VEC2', Float32Array.from(m.uvs)));
    nodes[m0.name] = doc.createNode(m0.name).setTranslation(PIVOTS[m0.name].t).setRotation(nodeRot(m0.name)).setMesh(doc.createMesh(m0.name).addPrimitive(prim)).setExtras({ visible: true });
    root.addChild(nodes[m0.name]);
    meshes.push({ name: m0.name, triangles: m.indices.length / 3 });
  }
  // Animações: hélice (1 volta/s, 4 chaves para o slerp seguir o sentido) e freios (0 → 90°).
  const spin = doc.createAnimation('propeller_spin').setExtras(manifest.animations[0]);
  const st = [0, 0.25, 0.5, 0.75, 1], sampler = doc.createAnimationSampler().setInput(acc('SCALAR', Float32Array.from(st))).setOutput(acc('VEC4', Float32Array.from(st.flatMap(t => quat([0, 0, -1], t * 2 * Math.PI))))).setInterpolation('LINEAR');
  spin.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(nodes.propeller).setTargetPath('rotation').setSampler(sampler));
  const brk = doc.createAnimation('dive_brakes_extend').setExtras(manifest.animations[1]), bt = [0, 0.3, 0.6, 0.9, 1.2];
  for (const g of ['dive_brake_r', 'dive_brake_l']) {
    const s = doc.createAnimationSampler().setInput(acc('SCALAR', Float32Array.from(bt))).setOutput(acc('VEC4', Float32Array.from(bt.flatMap(t => qmul(nodeRot(g), quat([1, 0, 0], (t / 1.2) * Math.PI / 2)))))).setInterpolation('LINEAR');
    brk.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(nodes[g]).setTargetPath('rotation').setSampler(s));
  }
  doc.createScene('ju87_b1').addChild(root);
  doc.getRoot().getAsset().generator = 'COD-guerra tools/assets/m01-aircraft (gltf-transform)';
  doc.getRoot().setExtras({ units: 'meters', license: manifest.license });
  const file = `m01_ju87_b1_${L.id}.glb`, path = join(OUT, file);
  await new NodeIO().write(path, doc);
  const tris = meshes.reduce((s, m) => s + m.triangles, 0);
  manifest.files[file] = { lod: L.id, use: L.use, bytes: statSync(path).size, triangles: tris, draw_calls: meshes.length, materials: ['ju87_b1'], meshes,
    textures: { baseColor: `${atlas.images[L.color].mime} ${L.color === 'color' ? 2048 : L.color.split('_')[1]}²`, ...(L.orm ? { metallicRoughness: `${atlas.images[L.orm].mime} ${L.orm === 'orm' ? 1024 : L.orm.split('_')[1]}²` } : {}) } };
  console.log(file, (manifest.files[file].bytes / 1e3).toFixed(0), 'kB;', tris, 'triângulos');
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('travão: dobradiça', BRAKE.a.map(v => v.toFixed(3)).join(', '), 'comprimento', BRAKE.length.toFixed(3));
