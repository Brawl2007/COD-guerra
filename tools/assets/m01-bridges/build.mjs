// Gera os modelos provisórios das pontes de M01 (Tczew) a partir de missions/m01-tczew/map-layout.json.
// Uso: cd tools/assets/m01-bridges && npm ci && npm run build
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { railBridge, roadBridge, lisewoPortal } from './src/bridges.mjs';
import { writeGlb, MATERIALS } from './src/write-glb.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const layoutPath = join(repo, 'missions', 'm01-tczew', 'map-layout.json');
const outDir = join(repo, 'assets', 'models', 'provisional', 'm01');
const layoutText = await readFile(layoutPath, 'utf8');
const layout = JSON.parse(layoutText);
const layoutHash = createHash('sha256').update(layoutText).digest('hex').slice(0, 16);
await mkdir(outDir, { recursive: true });

const rail = layout.features.find(f => f.id === 'rail_bridge');
const road = layout.features.find(f => f.id === 'road_bridge');
const STATUS = 'PROVISÓRIO — geometria de bloqueio/placeholder; não é asset final nem comparado com fotografias';
const license = 'Original do projeto COD-guerra, gerado por código neste repositório, sem material de terceiros. Licença: a do repositório (ainda não escolhida pelo proprietário).';

const bridges = [
  { file: 'bridge_rail_1891_1912', label: 'Ponte ferroviária de Tczew (1891 + extensão 1910–1912)', build: railBridge, placement: [rail.polyline[0][0], 0, rail.polyline[0][2]], feature: rail },
  { file: 'bridge_road_lentze_1857_1912', label: 'Ponte rodoviária Lentze (1857 + extensão 1910–1912)', build: roadBridge, placement: [road.polyline[0][0], 0, road.polyline[0][2]], feature: road },
];

const manifest = {
  schemaVersion: 1,
  status: STATUS,
  generatedBy: 'tools/assets/m01-bridges/build.mjs',
  mapLayout: { path: 'missions/m01-tczew/map-layout.json', sha256_16: layoutHash },
  conventions: { units: 'metros', axes: 'X leste (eixo das pontes), Y altura, Z sul; frente −Z (three.js)', origin: 'cada ponte: x = 0 do mapa, y = 0 trilho/pavimento no portal oeste, z = 0 no eixo da ponte; aplicar `placement`' },
  license,
  materials: Object.fromEntries(Object.entries(MATERIALS).map(([k, v]) => [k, { ...v }])),
  files: [],
};

const groupsFor = (b, withDestroyed = true) => [
  ['intact', b.intact, { state: 'intact' }],
  ...(withDestroyed ? [['state_destroyed', b.destroyed, { state: 'destroyed', initiallyHidden: true, note: 'Mostrar cada nó quando o evento em extras.m01.replaces → destroyedBy ocorrer; ocultar a peça intacta.' }]] : []),
];

for (const b of bridges) {
  for (const lod of [0, 1]) {
    const built = b.build(layout, lod);
    const name = lod ? `${b.file}.lod1.glb` : `${b.file}.glb`;
    const stats = await writeGlb(join(outDir, name), {
      rootName: b.file,
      rootExtras: { m01: { label: b.label, status: STATUS, placement: { translation: b.placement }, lod, supportsX: b.feature.supportsX, spansM: b.feature.spansM, mapLayoutSha256_16: layoutHash, license } },
      groups: groupsFor(built, lod === 0),
    });
    manifest.files.push(fileEntry(name, b, lod, stats));
    if (lod === 0) {
      const colName = `${b.file}.colliders.glb`;
      const cstats = await writeGlb(join(outDir, colName), {
        rootName: `${b.file}_colliders`,
        rootExtras: { m01: { label: `${b.label} — colisores`, placement: { translation: b.placement }, status: STATUS, note: 'Caixas simples; extras.m01.collider = walkable | solid | partialCover. Ocultar na renderização.' } },
        groups: [['colliders', built.colliders, { colliders: true }]],
      });
      manifest.files.push(fileEntry(colName, b, 'colliders', cstats));
    }
  }
}

for (const lod of [0, 1]) {
  const lp = lisewoPortal(lod);
  const placement = [rail.supportsX.at(-1), 0, (rail.polyline[0][2] + road.polyline[0][2]) / 2];
  const name = lod ? 'portal_lisewo_1912.lod1.glb' : 'portal_lisewo_1912.glb';
  const stats = await writeGlb(join(outDir, name), {
    rootName: 'portal_lisewo_1912',
    rootExtras: { m01: { label: 'Portal comum de 1912, Lisewo', status: STATUS, placement: { translation: placement }, lod, license } },
    groups: [['intact', lp.intact, { state: 'intact' }]],
  });
  manifest.files.push(fileEntry(name, { label: 'Portal comum de 1912, Lisewo', placement }, lod, stats));
  if (lod === 0) {
    const cstats = await writeGlb(join(outDir, 'portal_lisewo_1912.colliders.glb'), {
      rootName: 'portal_lisewo_1912_colliders', rootExtras: { m01: { placement: { translation: placement }, status: STATUS } },
      groups: [['colliders', lp.colliders, { colliders: true }]],
    });
    manifest.files.push(fileEntry('portal_lisewo_1912.colliders.glb', { label: 'Portal comum de 1912 — colisores', placement }, 'colliders', cstats));
  }
}

function fileEntry(name, b, lod, stats) {
  const destructible = stats.nodes.filter(n => n.extras.destroyedBy).map(n => ({ node: n.name, destroyedBy: n.extras.destroyedBy, replacedBy: n.extras.replacedBy ?? [] }));
  const uncertain = stats.nodes.filter(n => [n.extras.appearanceCertainty, n.extras.existenceIn1939, n.extras.damageCertainty].includes('UNCERTAIN')).map(n => n.name);
  return {
    file: `assets/models/provisional/m01/${name}`, label: b.label, lod, placement: { translation: b.placement },
    bytes: stats.bytes, sceneTriangles: stats.sceneTriangles, uniqueTriangles: stats.uniqueTriangles, vertices: stats.vertices,
    nodes: stats.nodes.map(n => ({ name: n.name, group: n.group, triangles: n.triangles })),
    destructible, uncertainAppearance: uncertain,
  };
}

await writeFile(join(outDir, 'bridges.manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
for (const f of manifest.files) console.log(`${relative(repo, join(repo, f.file)).padEnd(70)} ${String(f.sceneTriangles).padStart(7)} tri  ${(f.bytes / 1024).toFixed(0).padStart(6)} KB`);
