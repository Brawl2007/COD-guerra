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
const license = 'Malhas e materiais originais do projeto COD-guerra, gerados por código neste repositório, sem modelos, texturas ou fotografias de terceiros. Licença das criações: a do repositório (ainda não escolhida pelo proprietário). Medições G01: © OpenStreetMap contributors, via Overture Maps Foundation; ODbL, ver MEASUREMENTS.md.';

const bridges = [
  { file: 'bridge_rail_1891_1912', label: 'Ponte ferroviária de Tczew (1891 + extensão 1910–1912)', build: railBridge, placement: [rail.polyline[0][0], 0, rail.polyline[0][2]], feature: rail },
  { file: 'bridge_road_lentze_1857_1912', label: 'Ponte rodoviária Lentze (1857 + extensão 1910–1912)', build: roadBridge, placement: [road.polyline[0][0], 0, road.polyline[0][2]], feature: road },
];

const manifest = {
  schemaVersion: 2,
  status: STATUS,
  generatedBy: 'tools/assets/m01-bridges/build.mjs',
  mapLayout: { path: 'missions/m01-tczew/map-layout.json', sha256_16: layoutHash },
  conventions: { units: 'metros', axes: 'X leste (eixo das pontes), Y altura, Z sul; frente −Z (three.js)',
    origin: 'referencial do mapa; placement já aplicado ao nó raiz. Importar com transformação identidade.',
    state: 'Aplicar consumedEventIds através de src/state.mjs ao carregar, trocar LOD ou restaurar save. Extras não alteram visibilidade automaticamente.' },
  lodDistancesM: [0, 400, 800],
  license,
  materials: Object.fromEntries(Object.entries(MATERIALS).map(([k, v]) => [k, { ...v }])),
  files: [],
};

const groupsFor = b => [
  ['intact', b.intact, { state: 'intact' }],
  ['state_destroyed', b.destroyed, { stateContainer: true, note: 'Os filhos são controlados individualmente por extras.m01.showAfterEvent.' }],
];

for (const b of bridges) {
  for (const lod of [0, 1, 2]) {
    const built = b.build(layout, lod);
    const name = lod ? `${b.file}.lod${lod}.glb` : `${b.file}.glb`;
    const stats = await writeGlb(join(outDir, name), {
      rootName: b.feature.id, rootTranslation: b.placement,
      rootExtras: { m01: { logicalId: b.feature.id, mapFeatureId: b.feature.id, label: b.label, status: STATUS,
        placement: { translation: b.placement, appliedToRoot: true }, lod, supportsX: b.feature.supportsX,
        spansM: b.feature.spansM, mapLayoutSha256_16: layoutHash, license } },
      groups: groupsFor(built),
    });
    manifest.files.push(fileEntry(name, b, lod, stats));
    if (lod === 0) {
      const colName = `${b.file}.colliders.glb`;
      const cstats = await writeGlb(join(outDir, colName), {
        rootName: `${b.feature.id}_colliders`, rootTranslation: b.placement,
        rootExtras: { m01: { mapFeatureId: b.feature.id, label: `${b.label} — colisores`, placement: { translation: b.placement, appliedToRoot: true }, status: STATUS, note: 'Caixas simples; aplicar src/state.mjs para desactivar os afectados. Não renderizar.' } },
        groups: [['colliders', built.colliders, { colliders: true }]],
      });
      manifest.files.push(fileEntry(colName, b, 'colliders', cstats));
    }
  }
}

for (const lod of [0, 1, 2]) {
  const lp = lisewoPortal(lod);
  const placement = [rail.supportsX.at(-1), 0, (rail.polyline[0][2] + road.polyline[0][2]) / 2];
  const name = lod ? `portal_lisewo_1912.lod${lod}.glb` : 'portal_lisewo_1912.glb';
  const stats = await writeGlb(join(outDir, name), {
    rootName: 'lisewo_portal', rootTranslation: placement,
    rootExtras: { m01: { label: 'Portal comum de 1912, Lisewo', status: STATUS, placement: { translation: placement, appliedToRoot: true }, lod, license } },
    groups: [['intact', lp.intact, { state: 'intact' }]],
  });
  manifest.files.push(fileEntry(name, { label: 'Portal comum de 1912, Lisewo', placement }, lod, stats));
  if (lod === 0) {
    const cstats = await writeGlb(join(outDir, 'portal_lisewo_1912.colliders.glb'), {
      rootName: 'portal_lisewo_1912_colliders', rootTranslation: placement,
      rootExtras: { m01: { placement: { translation: placement, appliedToRoot: true }, status: STATUS } },
      groups: [['colliders', lp.colliders, { colliders: true }]],
    });
    manifest.files.push(fileEntry('portal_lisewo_1912.colliders.glb', { label: 'Portal comum de 1912 — colisores', placement }, 'colliders', cstats));
  }
}

function fileEntry(name, b, lod, stats) {
  const destructible = stats.nodes.filter(n => n.extras.destroyedBy).map(n => ({ node: n.name, destroyedBy: n.extras.destroyedBy, replacedBy: n.extras.replacedBy ?? [] }));
  const uncertain = stats.nodes.filter(n => [n.extras.appearanceCertainty, n.extras.existenceIn1939, n.extras.damageCertainty].includes('UNCERTAIN')).map(n => n.name);
  return {
    file: `assets/models/provisional/m01/${name}`, label: b.label, lod, placement: { translation: b.placement, appliedToRoot: true },
    bytes: stats.bytes, sceneTriangles: stats.sceneTriangles, uniqueTriangles: stats.uniqueTriangles, vertices: stats.vertices,
    drawCallsIntact: stats.nodes.filter(n => n.group === 'intact').reduce((s, n) => s + n.drawCalls, 0),
    intactTriangles: stats.nodes.filter(n => n.group === 'intact').reduce((s, n) => s + n.triangles, 0),
    nodes: stats.nodes.map(n => ({ name: n.name, logicalId: n.extras.logicalId ?? n.name,
      mapFeatureId: n.extras.mapFeatureId, group: n.group, triangles: n.triangles, pivot: n.pivot,
      showAfterEvent: n.extras.showAfterEvent, destroyedBy: n.extras.destroyedBy })),
    destructible, uncertainAppearance: uncertain,
  };
}

await writeFile(join(outDir, 'bridges.manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
for (const f of manifest.files) console.log(`${relative(repo, join(repo, f.file)).padEnd(70)} ${String(f.sceneTriangles).padStart(7)} tri  ${(f.bytes / 1024).toFixed(0).padStart(6)} KB`);
