import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { M02BenchSimulation } from '../src/game/m02-01-simulation.js';
import {
  HORIZON_CAMERA_FAR_M,
  HORIZON_HAZE_MAX_MIX,
  HORIZON_IMPOSTOR_SCALE_MAX,
  HORIZON_L3_FADE_MARGIN_M,
  HORIZON_L3_FAR_M,
  HORIZON_L3_LANDMARKS,
  HORIZON_L3_LAYERS,
  HORIZON_L3_NEAR_M,
  horizonAzimuthToWorld,
  horizonFadeAlpha,
  horizonHazeMix,
  horizonImpostorScale,
  horizonLayerForDistance,
} from '../src/world/m02-horizon-system.js';
import {
  LEGACY_UNITS_PER_METRE,
  M02_STUBBLE_PATCHES,
  M02_TERRAIN_MESH,
  M02_TREE_LINES,
  ORCHARD_CROWN_FIT,
  createM02FieldArea,
  isFieldCell,
  legacyUnitsToMetres,
  mirrorBoxesZ,
  orchardTreeSpecs,
  selectEarthworkCovers,
  semanticGroundRects,
  terrainMeshBounds,
  treeLineLocal,
} from '../src/world/m02-environment-area.js';
import { UNITS_PER_METRE } from '../src/config.js';
import { eyePosition, toScene } from '../src/world/spatial.js';
import { buildTreeLine } from '../src/render/m01-area-trees.js';
import { buildBermGeometry } from '../src/render/m01-area-earthworks.js';
import { GeoBuilder } from '../src/render/m01-area-geo.js';
import { buildSilhouetteRing, l3LightScale } from '../src/render/m02-environment.js';
import { M02_LIGHTING_PRESETS } from '../src/render/m02-01-renderer.js';

// Secções G (ambiente) e H (horizonte L3) do PDF M02. Testes de dados/geometria em Node (sem WebGL): provam unidades (metros, nunca 32 u = 1 m da M01
// aplicado ao M02), cobertura 1,5-8 km sem lacunas, fade/neblina monótonos e que os módulos reutilizados da M01 recebem e devolvem metros.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sim = new M02BenchSimulation();
const world = sim.world;

// ---------------------------------------------------------------- unidades -----------------------------------------------------------------------------

test('UNIDADES: a escala legada da M01 (32 u = 1 m) existe só na ponte e o ambiente M02 nunca a aplica', () => {
  assert.equal(LEGACY_UNITS_PER_METRE, 32);
  assert.equal(UNITS_PER_METRE, 32, 'spatial.js: constante legada da M01');
  assert.equal(legacyUnitsToMetres(32), 1);
  assert.equal(legacyUnitsToMetres(3200), 100);
  // O jogador da M02 vive em METROS (space = 'metres'): a posição do olho sai sem divisão por 32.
  assert.equal(sim.player.space, 'metres');
  const eye = eyePosition(sim.player);
  assert.ok(Math.abs(eye.x - sim.player.x) < 1e-9 && Math.abs(eye.z - sim.player.z) < 1e-9, 'olho M02 = x/z do jogador em metros');
  assert.ok(eye.y > 1.0 && eye.y < 2.0, `altura do olho em metros: ${eye.y}`);
  // Um ator no formato LEGADO (sem space:'metres') é convertido por 32; o mesmo número em metros não é.
  const legacy = toScene({ x: 3200, y: 6400 }, 0);
  assert.deepEqual([legacy.x, legacy.z], [100, 200]);
  const metric = toScene({ space: 'metres', x: 3200, y: 0, z: 6400 }, 0);
  assert.deepEqual([metric.x, metric.z], [3200, 6400], 'em metros nada se divide por 32');
});

test('UNIDADES: nenhum ficheiro de ambiente/horizonte M02 divide ou multiplica por 32', () => {
  for (const file of ['src/render/m02-environment.js', 'src/world/m02-environment-area.js', 'src/world/m02-horizon-system.js', 'src/render/m02-solar-lighting.js']) {
    const src = readFileSync(resolve(ROOT, file), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/[/*]\s*32\b|\b32\s*[/*]|UNITS_PER_METRE/.test(src.replace(/LEGACY_UNITS_PER_METRE/g, '')), `${file} não pode aplicar a escala legada`);
  }
});

test('UNIDADES: a malha de terreno do ambiente é a do renderer (metros, 240 x 340 centrada em z = −65)', () => {
  const b = terrainMeshBounds();
  assert.deepEqual([b.minX, b.maxX, b.minZ, b.maxZ], [-120, 120, -235, 105]);
  assert.ok(M02_TERRAIN_MESH.widthM >= 100 && M02_TERRAIN_MESH.lengthM >= 150, 'a bancada tem 100 x 150 m no mínimo');
  const area = createM02FieldArea();
  assert.equal(area.ground.minX, b.minX);
  assert.equal(area.bounds.terrainRegion.minX > area.bounds.terrainRegion.maxX, true, 'terrainRegion vazia: o chão M02 não é plano');
  const rendererSrc = readFileSync(resolve(ROOT, 'src/render/m02-01-renderer.js'), 'utf8');
  assert.ok(rendererSrc.includes('M02_TERRAIN_MESH.widthM') && rendererSrc.includes('M02_TERRAIN_MESH.centreZ'), 'o renderer lê a malha da fonte única');
});

// ---------------------------------------------- reutilização da M01 (módulos m01-area-*) em metros -------------------------------------------------------

test('PONTE M01: as árvores da m01-area-trees saem em metros (11-30 m), não em unidades legadas', () => {
  for (const line of M02_TREE_LINES) {
    const { T } = treeLineLocal(line);
    const built = buildTreeLine(T, () => M02_TERRAIN_MESH.groundY);
    built.geometry.computeBoundingBox();
    const bb = built.geometry.boundingBox;
    assert.equal(built.total, line.count);
    assert.ok(bb.max.y >= 9 && bb.max.y <= 32, `${line.id}: altura máxima ${bb.max.y.toFixed(1)} m (legado /32 daria <1 m; ×32 daria >300 m)`);
    assert.ok(bb.min.y >= -0.5, `${line.id}: base ao nível do chão`);
    // Extensão horizontal ao longo da linha ≈ comprimento em metros (+ sub-bosque e copas)
    const run = Math.abs(T.maxX - T.minX);
    assert.ok(bb.max.x - bb.min.x >= run * 0.6 && bb.max.x - bb.min.x <= run + 15, `${line.id}: extensão ${(bb.max.x - bb.min.x).toFixed(1)} m para uma linha de ${run} m`);
    built.geometry.dispose();
  }
});

test('PONTE M01: a berma de terra desenha-se sobre as caixas de parapeito do mundo M02 (mesmo x, y, z em metros)', () => {
  const { parapets, mounds } = selectEarthworkCovers(world.obstacles);
  assert.ok(parapets.length > 0 || mounds.length > 0, 'o mundo A tem terraplenos de terra a desenhar');
  for (const box of parapets) {
    assert.equal(box.role, 'cover');
    assert.equal(box.material, 'earth');
    assert.ok(box.max.y - box.min.y <= 1.6 && box.max.x - box.min.x >= 4);
    const [mirrored] = mirrorBoxesZ([box]);
    assert.equal(mirrored.min.z, -box.max.z);
    assert.equal(mirrored.max.z, -box.min.z);
    const geometry = buildBermGeometry([mirrored]);
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox;
    assert.ok(Math.abs(bb.min.x - box.min.x) < 0.01 && Math.abs(bb.max.x - box.max.x) < 0.01, `${box.id}: berma cobre o x da caixa`);
    assert.ok(bb.max.y <= box.max.y + 0.01 && bb.max.y >= box.min.y + (box.max.y - box.min.y) * 0.8, `${box.id}: coroa à altura da caixa (${bb.max.y} vs ${box.max.y})`);
    // a berma alarga-se um pouco (taludes) mas continua em metros: <3 m para lá da meia-largura da caixa
    const zc = (-box.max.z - box.min.z) / 2;
    assert.ok(bb.min.z >= zc - (box.max.z - box.min.z) / 2 - 3 && bb.max.z <= zc + (box.max.z - box.min.z) / 2 + 3, `${box.id}: largura da berma em metros`);
    geometry.dispose();
  }
  // A simulação continua dona das caixas: selectEarthworkCovers não altera os obstáculos.
  assert.ok(world.obstacles.some((o) => parapets.includes(o)));
});

test('PONTE M01: restolho só em chão plano (o shader da m01-area-stubble usa um y uniforme) e dentro da malha', () => {
  const b = terrainMeshBounds();
  for (const patch of M02_STUBBLE_PATCHES) {
    const [minX, maxX, minZ, maxZ] = patch.bounds;
    assert.ok(minX >= b.minX && maxX <= b.maxX && minZ >= b.minZ && maxZ <= b.maxZ, `${patch.id} dentro da malha`);
    for (let x = minX; x <= maxX; x += 6) {
      for (let z = minZ; z <= maxZ; z += 6) {
        assert.equal(world.terrainHeightAt(x, z), M02_TERRAIN_MESH.groundY, `${patch.id}: terreno não plano em (${x}, ${z})`);
      }
    }
  }
});

test('PONTE M01: as linhas de árvores ficam nas margens da malha, sobre chão plano, sem tapar o corredor C01 nem o eixo HS-A3', () => {
  const b = terrainMeshBounds();
  for (const line of M02_TREE_LINES) {
    const { worldOf, rotationY } = treeLineLocal(line);
    for (const [u, v] of [[line.from, line.fixed], [line.to, line.fixed], [(line.from + line.to) / 2, line.fixed]]) {
      const p = line.axis === 'x' ? worldOf(u, v) : worldOf(-u, line.fixed);
      assert.ok(p.x >= b.minX - 1 && p.x <= b.maxX + 1 && p.z >= b.minZ - 1 && p.z <= b.maxZ + 1, `${line.id} dentro da malha`);
      assert.equal(world.terrainHeightAt(p.x, p.z), M02_TERRAIN_MESH.groundY, `${line.id}: chão plano em (${p.x}, ${p.z})`);
      assert.ok(p.z > -100, `${line.id}: não entra na aproximação norte (C01, z < −100)`);
    }
    assert.equal(rotationY, line.axis === 'x' ? 0 : Math.PI / 2);
  }
});

test('CAMPO: o campo agrícola nunca cobre edifícios, pátio, vala, pomar relvado nem a trincheira EA0', () => {
  const rects = semanticGroundRects(world.layout);
  assert.ok(rects.length >= 5);
  const b01 = world.layout.buildings.find((x) => x.id === 'B01').bounds;
  assert.equal(isFieldCell(rects, b01[0], b01[1], b01[2], b01[3]), false);
  assert.equal(isFieldCell(rects, 200, 210, 200, 210), true, 'longe de tudo: campo');
});

test('POMAR: as 7 árvores candidatas são desenhadas dentro das caixas de visão da simulação e continuam marcadas candidatas', () => {
  const specs = orchardTreeSpecs(world.trees);
  assert.equal(specs.length, 7);
  for (const spec of specs) {
    assert.equal(spec.candidate, true, `${spec.id}: espécie por confirmar (G1), não «macieira» afirmada`);
    const canopy = world.sightBlockers.find((sb) => sb.treeId === spec.id);
    assert.ok(canopy, `${spec.id}: caixa de visão`);
    const { crown } = spec;
    // máximo da copa irregular = raio × (1 + lump·1,5) com lump = 0,1 (m02-environment.js) — tem de caber na caixa de visão
    const fit = 1 + 0.1 * 1.5;
    assert.ok(crown.cx - crown.rx * fit >= canopy.min.x - 1e-6 && crown.cx + crown.rx * fit <= canopy.max.x + 1e-6, `${spec.id}: x da copa dentro da caixa`);
    assert.ok(crown.cz - crown.rz * fit >= canopy.min.z - 1e-6 && crown.cz + crown.rz * fit <= canopy.max.z + 1e-6, `${spec.id}: z da copa dentro da caixa`);
    assert.ok(crown.cy - crown.ry * fit >= canopy.min.y - 1e-6 && crown.cy + crown.ry * fit <= canopy.max.y + 1e-6, `${spec.id}: y da copa dentro da caixa`);
    assert.deepEqual(spec.replacesIds, [`${spec.id}_trunk`, `${spec.id}_canopy`]);
    assert.ok(world.obstacles.some((o) => o.id === `${spec.id}_trunk`), 'o tronco continua como obstáculo balístico/movimento');
  }
  assert.ok(ORCHARD_CROWN_FIT > 0.5 && ORCHARD_CROWN_FIT < 1);
  // A mesma geometria de blob da M01, em metros: o bounding box da copa corresponde ao esperado.
  const b = new GeoBuilder();
  const c = specs[0].crown;
  b.blob(c.cx, c.cy, c.cz, c.rx, c.ry, c.rz, { detail: 1, seed: 90, lump: 0.1, bottom: [0, 0, 0], top: [1, 1, 1] });
  const g = b.build();
  assert.ok(g.boundingBox.max.y - g.boundingBox.min.y < (c.ry * 2) * 1.35 && g.boundingBox.max.y - g.boundingBox.min.y > c.ry * 1.4);
  g.dispose();
});

// -------------------------------------------------------------- horizonte L3 (1,5-8 km) --------------------------------------------------------------

test('L3: as camadas cobrem 1,5-8 km sem lacunas, em metros, com o raio dentro da banda', () => {
  assert.equal(HORIZON_L3_NEAR_M, 1500);
  assert.equal(HORIZON_L3_FAR_M, 8000);
  assert.equal(HORIZON_L3_LAYERS[0].nearM, HORIZON_L3_NEAR_M);
  assert.equal(HORIZON_L3_LAYERS.at(-1).farM, HORIZON_L3_FAR_M);
  for (let i = 0; i < HORIZON_L3_LAYERS.length; i++) {
    const l = HORIZON_L3_LAYERS[i];
    assert.ok(l.radiusM > l.nearM && l.radiusM < l.farM, `${l.id}: raio dentro da banda`);
    assert.ok(l.heightsM[0] < l.heightsM[1] && l.heightsM[1] <= 100, `${l.id}: alturas em metros`);
    assert.ok(l.segments >= 64, `${l.id}: segmentos suficientes para uma silhueta contínua`);
    if (i > 0) assert.equal(l.nearM, HORIZON_L3_LAYERS[i - 1].farM, 'sem lacunas nem sobreposição');
    if (i > 0) assert.ok(l.heightsM[1] > HORIZON_L3_LAYERS[i - 1].heightsM[1], 'camadas mais longe são mais altas (cumeada acima das sebes)');
  }
  assert.equal(horizonLayerForDistance(1499), null);
  assert.equal(horizonLayerForDistance(8001), null);
  assert.equal(horizonLayerForDistance(1500).id, HORIZON_L3_LAYERS[0].id);
  assert.equal(horizonLayerForDistance(8000).id, HORIZON_L3_LAYERS.at(-1).id);
  assert.equal(horizonLayerForDistance(3000).id, HORIZON_L3_LAYERS[1].id);
});

test('L3: camera.far cobre o raio máximo mais a margem do fade', () => {
  assert.ok(HORIZON_CAMERA_FAR_M >= HORIZON_L3_FAR_M + HORIZON_L3_FADE_MARGIN_M);
  const src = readFileSync(resolve(ROOT, 'src/render/m02-01-renderer.js'), 'utf8');
  assert.ok(src.includes('HORIZON_CAMERA_FAR_M'), 'o renderer usa a constante exportada');
});

test('L3: fade por distância sobe até 1,5 km, é 1 em [1,5; 8] km e cai a 0 em 8 km + margem (monótono)', () => {
  assert.equal(horizonFadeAlpha(HORIZON_L3_NEAR_M), 1);
  assert.equal(horizonFadeAlpha(HORIZON_L3_FAR_M), 1);
  assert.equal(horizonFadeAlpha(4000), 1);
  assert.equal(horizonFadeAlpha(HORIZON_L3_NEAR_M - HORIZON_L3_FADE_MARGIN_M), 0);
  assert.equal(horizonFadeAlpha(HORIZON_L3_FAR_M + HORIZON_L3_FADE_MARGIN_M), 0);
  let prev = -1;
  for (let d = HORIZON_L3_NEAR_M - HORIZON_L3_FADE_MARGIN_M; d <= HORIZON_L3_NEAR_M; d += 15) {
    const a = horizonFadeAlpha(d);
    assert.ok(a >= prev - 1e-12, `fade de entrada monótono em ${d}`);
    prev = a;
  }
  prev = 2;
  for (let d = HORIZON_L3_FAR_M; d <= HORIZON_L3_FAR_M + HORIZON_L3_FADE_MARGIN_M; d += 15) {
    const a = horizonFadeAlpha(d);
    assert.ok(a <= prev + 1e-12, `fade de saída monótono em ${d}`);
    prev = a;
  }
});

test('L3: neblina atmosférica é monótona na distância, limitada e dependente da visibilidade do preset', () => {
  assert.equal(horizonHazeMix(0, 5000), 0);
  assert.equal(horizonHazeMix(1000, 0), 0);
  let prev = -1;
  for (let d = 100; d <= HORIZON_L3_FAR_M; d += 250) {
    const m = horizonHazeMix(d, 4500);
    assert.ok(m >= prev && m <= HORIZON_HAZE_MAX_MIX);
    prev = m;
  }
  assert.ok(horizonHazeMix(6400, 3500) > horizonHazeMix(6400, 12000), 'menos visibilidade, mais neblina');
  assert.equal(horizonHazeMix(1e9, 100), HORIZON_HAZE_MAX_MIX, 'as silhuetas nunca desaparecem por completo');
  for (const preset of Object.values(M02_LIGHTING_PRESETS)) {
    assert.ok(preset.hazeDistM >= 3000 && preset.hazeDistM <= 15000, `${preset.id}: hazeDistM em metros`);
    const s = l3LightScale(preset);
    assert.ok(s >= 0.25 && s <= 1.2);
  }
  assert.ok(l3LightScale(M02_LIGHTING_PRESETS.night_1939_09_09) < l3LightScale(M02_LIGHTING_PRESETS.afternoon_1939_09_09), 'à noite as silhuetas escurecem');
});

test('L3: impostores de eventos distantes ampliam-se com a distância, com teto (tamanho angular legível)', () => {
  assert.equal(horizonImpostorScale(100), 1);
  assert.equal(horizonImpostorScale(300), 1);
  assert.ok(horizonImpostorScale(1500) > horizonImpostorScale(600));
  assert.equal(horizonImpostorScale(1e6), HORIZON_IMPOSTOR_SCALE_MAX);
});

test('L3: marcos provisórios — Tum só como volume de estudo rotulado, Łęczyca sem torre inventada, ambos entre 1,5 e 8 km', () => {
  const tum = HORIZON_L3_LANDMARKS.find((m) => m.id === 'L3_TUM_VOLUME_ESTUDO');
  const leczyca = HORIZON_L3_LANDMARKS.find((m) => m.id === 'L3_LECZYCA_MASSA_URBANA');
  assert.ok(tum && leczyca);
  for (const m of HORIZON_L3_LANDMARKS) {
    assert.equal(m.provisional, true, `${m.id}: provisório até GEO-01`);
    assert.ok(m.distanceM >= HORIZON_L3_NEAR_M && m.distanceM <= HORIZON_L3_FAR_M, `${m.id}: entre 1,5 e 8 km`);
    assert.match(m.label, /provisóri/i);
  }
  assert.match(tum.label, /Volume de estudo de Tum/);
  assert.equal(leczyca.towers, 0, 'sem torre inventada em Łęczyca (H3)');
  assert.ok(tum.towers <= 2);
});

test('L3: azimute + distância -> mundo (norte = −Z, este = +X) e HS-A2 colocados entre 1,5 e 8 km com camada L3', () => {
  assert.deepEqual(horizonAzimuthToWorld(0, 1000), { x: 0, z: -1000 });
  assert.deepEqual(horizonAzimuthToWorld(90, 1000), { x: 1000, z: 0 });
  assert.deepEqual(horizonAzimuthToWorld(180, 1000), { x: 0, z: 1000 });
  assert.deepEqual(horizonAzimuthToWorld(270, 1000), { x: -1000, z: 0 });
  const events = sim.horizon.hsA2.events;
  assert.equal(events.length, 5);
  let last = -1;
  for (const ev of events) {
    const d = Math.hypot(ev.x, ev.z);
    assert.equal(ev.layer, 'L3');
    assert.ok(d >= HORIZON_L3_NEAR_M && d <= HORIZON_L3_FAR_M, `${ev.id}: ${d.toFixed(0)} m`);
    assert.ok(Math.abs(d - ev.distanceFromOriginM) <= 1.5, `${ev.id}: distância declarada coerente com a posição (±arredondamento ao metro)`);
    assert.ok(ev.flashAt > last, 'eventos ordenados no tempo, finitos');
    last = ev.flashAt;
  }
});

test('L3: a silhueta de cada camada é determinista, em metros e contínua (sem Math.random)', () => {
  const build = (layer) => {
    const b = new GeoBuilder();
    const dist = [];
    buildSilhouetteRing(b, layer, 40, dist);
    return { b, dist };
  };
  for (const layer of HORIZON_L3_LAYERS) {
    const a = build(layer);
    const c = build(layer);
    assert.deepEqual(a.b.p, c.b.p, `${layer.id}: determinista`);
    assert.equal(a.dist.length, a.b.vertexCount);
    assert.equal(a.b.vertexCount, layer.segments * 2);
    let maxY = -Infinity;
    for (let i = 1; i < a.b.p.length; i += 3) maxY = Math.max(maxY, a.b.p[i]);
    assert.ok(maxY <= layer.heightsM[1] + 1e-6 && maxY >= layer.heightsM[0] * 0.5, `${layer.id}: alturas dentro do intervalo`);
    for (let i = 0; i < a.b.p.length; i += 6) {
      const r = Math.hypot(a.b.p[i], a.b.p[i + 2]);
      assert.ok(Math.abs(r - layer.radiusM) < 1, `${layer.id}: vértices no raio da camada`);
    }
  }
  const src = readFileSync(resolve(ROOT, 'src/render/m02-environment.js'), 'utf8');
  assert.ok(!/Math\.random|Date\.now/.test(src));
});

test('Fronteira: o ambiente e a luz solar são só apresentação (não importam simulação, nem mexem em estado)', () => {
  for (const file of ['src/render/m02-environment.js', 'src/render/m02-solar-lighting.js', 'src/world/m02-environment-area.js']) {
    const src = readFileSync(resolve(ROOT, file), 'utf8');
    assert.ok(!/game\/m02-01-simulation|m02-save-store|snapshot\(|restoreSnapshot/.test(src), `${file} não toca em simulação nem saves`);
  }
});
