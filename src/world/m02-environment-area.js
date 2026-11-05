// M02 «Operação Bzura» — dados PUROS do ambiente (secção G do PDF; auditoria G.md): ponte entre o mundo M02 (METROS) e os módulos de ambiente da M01
// (src/render/m01-area-field/stubble/trees/earthworks, que desenham em metros Three.js: x/z solo, y altura). Sem Three.js, sem DOM, sem aleatoriedade:
// só descritores e classificação, para o renderer (src/render/m02-environment.js) e para testes em Node.
//
// UNIDADES: o gameplay M02 está em METROS. A M01 legada usa 32 unidades = 1 m só no seu motor antigo (AGENTS.md); os módulos m01-area-* já são
// em metros (alturas de árvores 11-26 m, relva 0,1-0,2 m). Nada aqui divide ou multiplica por 32: LEGACY_UNITS_PER_METRE só existe para o teste
// de ponte (tests/m02-22-environment-horizon-units.test.js) que prova que nenhum valor foi aplicado com a escala errada.

export const LEGACY_UNITS_PER_METRE = 32;
/** Converte unidades legadas da M01 (32 u = 1 m) em metros. Só para pontes/testes; o ambiente M02 nunca recebe unidades legadas. */
export const legacyUnitsToMetres = (units) => units / LEGACY_UNITS_PER_METRE;

/** Malha de terreno do renderer M02 (m): 240 x 340, centrada em z = -65 (cobre x -120..120, z -235..105). Fonte única para renderer e ambiente. */
export const M02_TERRAIN_MESH = Object.freeze({
  widthM: 240,
  lengthM: 340,
  segX: 64,
  segZ: 90,
  centreX: 0,
  centreZ: -65,
  groundY: 0,
});

export function terrainMeshBounds(mesh = M02_TERRAIN_MESH) {
  return {
    minX: mesh.centreX - mesh.widthM / 2,
    maxX: mesh.centreX + mesh.widthM / 2,
    minZ: mesh.centreZ - mesh.lengthM / 2,
    maxZ: mesh.centreZ + mesh.lengthM / 2,
  };
}

/** Carreiro de carroça N-S (C01 P1 z=-175 até à quinta): usado como rodeiras/desgaste no shader do campo (polilinha [x,z] em m, 2 segmentos). */
export const M02_CART_TRACK = Object.freeze([Object.freeze([0, -235]), Object.freeze([0, -100]), Object.freeze([0, 20])]);

/** Trincheira transversal EA0 (C01) — mesma caixa que o terreno usa em terrainHeightAt (m). */
export const M02_OUTPOST_TRENCH = Object.freeze({ minX: -26.5, maxX: -9.0, minZ: -112.5, maxZ: -109.2 });

/**
 * Descritor de «área» no formato que m01-area-field espera (`area.ground`, `area.groundY`, `area.bounds.playable/terrainRegion`), em metros.
 * `terrainRegion` vazia (min > max): o chão M02 NÃO é plano (vala, trincheira, micro-relevo), por isso a malha do campo segue sempre `base(x,z)`.
 * `playable` = a própria malha de terreno: o deslocamento visual `areaReliefOffset` é 0 em todo o campo, ou seja, o chão desenhado é o da simulação.
 */
export function createM02FieldArea(mesh = M02_TERRAIN_MESH) {
  const b = terrainMeshBounds(mesh);
  const region = Object.freeze({ ...b });
  return Object.freeze({
    area: 'm02-bzura',
    groundY: mesh.groundY,
    ground: region,
    bounds: Object.freeze({
      playable: Object.freeze({ minX: b.minX - 8, maxX: b.maxX + 8, minZ: b.minZ - 8, maxZ: b.maxZ + 8 }),
      terrainRegion: Object.freeze({ minX: 1, maxX: -1, minZ: 1, maxZ: -1 }),
    }),
  });
}

const overlaps = (a, minX, maxX, minZ, maxZ, margin = 0) =>
  a.minX - margin < maxX && a.maxX + margin > minX && a.minZ - margin < maxZ && a.maxZ + margin > minZ;

/**
 * Zonas «semânticas» do terreno M02 onde o campo agrícola NÃO deve ser desenhado: continuam com a cor de vértice do terreno (vala húmida, trincheira,
 * pátio, pomar relvado, chão de edifícios). Devolve retângulos {minX,maxX,minZ,maxZ} em metros a partir do layout do mundo (A, B ou C).
 */
export function semanticGroundRects(layout) {
  const rects = [];
  for (const b of layout?.buildings ?? []) {
    const [minX, maxX, minZ, maxZ] = b.bounds;
    rects.push({ minX: minX - 1.5, maxX: maxX + 1.5, minZ: minZ - 1.5, maxZ: maxZ + 1.5 });
  }
  const z = layout?.zones ?? {};
  if (z.courtyard) rects.push({ minX: z.courtyard.minX, maxX: z.courtyard.maxX, minZ: z.courtyard.minZ, maxZ: z.courtyard.maxZ });
  if (z.ditch) rects.push({ minX: z.ditch.minX - 2.5, maxX: z.ditch.maxX + 2.5, minZ: z.ditch.minZ - 2, maxZ: z.ditch.maxZ + 2 });
  if (z.orchard) rects.push({ minX: z.orchard.minX, maxX: z.orchard.maxX, minZ: z.orchard.minZ, maxZ: z.orchard.maxZ });
  rects.push({ ...M02_OUTPOST_TRENCH, minX: M02_OUTPOST_TRENCH.minX - 1.5, maxX: M02_OUTPOST_TRENCH.maxX + 1.5, minZ: M02_OUTPOST_TRENCH.minZ - 1.5, maxZ: M02_OUTPOST_TRENCH.maxZ + 1.5 });
  return rects;
}

/** true se a célula [minX,maxX]x[minZ,maxZ] da malha de terreno deve receber o campo agrícola (não toca nenhuma zona semântica). */
export function isFieldCell(rects, minX, maxX, minZ, maxZ) {
  for (const r of rects) if (overlaps(r, minX, maxX, minZ, maxZ)) return false;
  return true;
}

/**
 * Manchas de restolho (m01-area-stubble) sobre chão PLANO (y = groundY): o shader do restolho usa um y uniforme, logo só pode cobrir onde o terreno
 * da simulação é plano (terrainHeightAt = 0). Norte (aproximação C01, abaixo da trincheira EA0) e oeste (além da vala, fora do pátio). `bounds` = [minX,maxX,minZ,maxZ].
 */
export const M02_STUBBLE_PATCHES = Object.freeze([
  Object.freeze({ id: 'stubble_north', bounds: Object.freeze([-117, 117, -232, -116]) }),
  Object.freeze({ id: 'stubble_west', bounds: Object.freeze([-117, -53, -104, 100]) }),
]);

/**
 * Linhas de árvores (m01-area-trees): {minX,maxX,z,depthM,count} em metros, ao longo de x a z constante. Só nas margens sul/oeste/este da malha, em
 * segmentos curtos que NÃO tapam o corredor C01 a norte, a coluna HS-A3 (z=-245) nem a linha de vista para o horizonte este (eventos HS-A2). Ilustrativas:
 * a vegetação real da zona não tem fonte (G1); NÃO são macieiras nem têm colisão.
 */
export const M02_TREE_LINES = Object.freeze([
  Object.freeze({ id: 'sebe_sul', axis: 'x', fixed: 96, from: -112, to: 112, depthM: 10, count: 22 }),
  Object.freeze({ id: 'sebe_oeste', axis: 'z', fixed: -110, from: 4, to: 92, depthM: 9, count: 9 }),
  Object.freeze({ id: 'sebe_este', axis: 'z', fixed: 110, from: 60, to: 92, depthM: 8, count: 5 }),
]);

/**
 * Descritor `{minX,maxX,z,depthM,count}` de m01-area-trees.buildTreeLine para uma linha de M02_TREE_LINES, em coordenadas LOCAIS do mesh.
 * axis 'x': local = mundo. axis 'z': o renderer roda o mesh +90 graus em y (x' = v, z' = -u), logo u = -z e v = x; `worldOf(u, v)` devolve {x,z} do mundo.
 */
export function treeLineLocal(line) {
  if (line.axis === 'x') {
    return { T: { minX: line.from, maxX: line.to, z: line.fixed, depthM: line.depthM, count: line.count }, rotationY: 0, worldOf: (u, v) => ({ x: u, z: v }) };
  }
  return { T: { minX: -line.to, maxX: -line.from, z: line.fixed, depthM: line.depthM, count: line.count }, rotationY: Math.PI / 2, worldOf: (u, v) => ({ x: v, z: -u }) };
}

/**
 * Das caixas do mundo (obstáculos), escolhe as de terra que a M01 desenha como terraplenos: parapeitos longos e baixos (berma) e montículos.
 * Mantém as caixas da simulação como colisão: o renderer só as substitui visualmente. IDs lidos do mundo, não inventados.
 */
export function selectEarthworkCovers(obstacles) {
  const parapets = [];
  const mounds = [];
  for (const o of obstacles ?? []) {
    if (o.role !== 'cover' || o.material !== 'earth') continue;
    const w = o.max.x - o.min.x;
    const d = o.max.z - o.min.z;
    const h = o.max.y - o.min.y;
    if (h <= 0 || h > 1.6) continue;
    if (w >= 4 && d <= 1.2) parapets.push(o);
    else mounds.push(o);
  }
  return { parapets, mounds };
}

/** Fração da caixa de visão (sight blocker) que a copa desenhada ocupa: a irregularidade (lump) absorve o resto, para a copa visível nunca sair do que a simulação trata como bloqueio. */
export const ORCHARD_CROWN_FIT = 0.86;

/**
 * Árvores do pomar (as 7 «macieiras» são CANDIDATAS: o layout marca-as `status: "candidata"` e nenhuma fonte fixa a espécie, G1). Dados puros para o renderer
 * desenhar com os blocos da M01 (GeoBuilder.trunk/blob), em metros: tronco = caixa balística da simulação; copa = elipsoide inscrito na caixa de visão
 * (sightBlocker) e reduzido por ORCHARD_CROWN_FIT. A simulação continua a usar só as caixas.
 */
export function orchardTreeSpecs(trees) {
  return (trees ?? []).map((t) => {
    const cr = t.canopyRadius ?? 1.9;
    const y0 = t.y + (t.canopyY0 ?? 1.85);
    const y1 = t.y + (t.canopyY1 ?? 4.1);
    return {
      id: t.id,
      candidate: t.status === 'candidata',
      trunk: { x: t.x, y: t.y, z: t.z, radius: t.trunkRadius ?? 0.2, height: t.trunkHeight ?? 2.1 },
      crown: { cx: t.x, cy: (y0 + y1) / 2, cz: t.z, rx: cr * ORCHARD_CROWN_FIT, ry: ((y1 - y0) / 2) * ORCHARD_CROWN_FIT, rz: cr * ORCHARD_CROWN_FIT },
      replacesIds: [`${t.id}_trunk`, `${t.id}_canopy`],
    };
  });
}

/** Espelha caixas em z (z' = -z) para berma com a face de madeira virada para -z; o renderer aplica scale.z = -1 ao mesh. */
export function mirrorBoxesZ(boxes) {
  return boxes.map((o) => ({
    id: o.id,
    min: { x: o.min.x, y: o.min.y, z: -o.max.z },
    max: { x: o.max.x, y: o.max.y, z: -o.min.z },
  }));
}
