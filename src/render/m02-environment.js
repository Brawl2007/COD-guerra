import * as THREE from 'three';
import { artTexture } from './m01-surfaces.js';
import { GeoBuilder, hash01, valueNoise } from './m01-area-geo.js';
import { AREA_LIFT_M, createFieldMaterial } from './m01-area-field.js';
import { createStubble } from './m01-area-stubble.js';
import { buildTreeLine, createTreeMaterial, treeDrawRange, TREE_SHARE } from './m01-area-trees.js';
import {
  buildBermGeometry,
  buildClodGeometry,
  buildClodInstances,
  buildCraterRimGeometry,
  buildMoundGeometry,
  buildMoundInstances,
  createBermMaterial,
  createEarthMaterial,
} from './m01-area-earthworks.js';
import {
  HORIZON_L3_LANDMARKS,
  HORIZON_L3_LAYERS,
  HORIZON_L3_FAR_M,
  horizonAzimuthToWorld,
  horizonHazeMix,
} from '../world/m02-horizon-system.js';
import {
  M02_CART_TRACK,
  M02_STUBBLE_PATCHES,
  M02_TERRAIN_MESH,
  M02_TREE_LINES,
  createM02FieldArea,
  isFieldCell,
  mirrorBoxesZ,
  orchardTreeSpecs,
  selectEarthworkCovers,
  semanticGroundRects,
  terrainMeshBounds,
  treeLineLocal,
} from '../world/m02-environment-area.js';

// M02 «Operação Bzura» — ambiente (secção G) e horizonte distante L3 (secção H). SÓ APRESENTAÇÃO: nada aqui decide dano, visibilidade, eventos ou missão.
// Reutiliza (importa, sem editar) os módulos de ambiente da M01, que desenham em METROS Three.js (x/z solo, y altura):
//   - m01-area-field    -> campo agrícola procedural (talhões, sulcos, carreiro com rodeiras) sobre a malha de terreno;
//   - m01-area-stubble  -> restolho instanciado que segue a câmara (1 draw call por mancha);
//   - m01-area-trees    -> linhas de árvores num só geometry (pinheiros/choupos/folhosas, sub-bosque);
//   - m01-area-earthworks -> bermas de parapeito e montículos de terra (caixas do mundo) e crateras.
// Não reutilizado: m01-area-dressing (orquestrador acoplado a `world.area` da M01: parapeitos/ treeLine/ wreck do layout M01) nem m01-area-wreck.
// Os descritores M02 (em metros) vêm de src/world/m02-environment-area.js (puro, testado em Node).
// Disposal: esta classe é dona de todas as geometrias, materiais e texturas que cria e liberta-os em dispose()/rebuild.

const FIELD_COLOUR_RGB = [0.36, 0.39, 0.25]; // mesma cor base «campo» do terreno do renderer
const NO_BAND = [1e5, 1e5, 1e5, 1e5]; // faixa pisada do M01 desligada (centro do M02 não tem parapeito M01)
const L3_BOTTOM_Y = -3; // base das silhuetas: abaixo do chão (escondida pela moldura de chão)
const STUBBLE_RADIUS_M = 13;
const CRATER_RADIUS_M = 3.4;

/** Fator de luz (0.25..1.2) das silhuetas sem iluminação (MeshBasic): escurece à noite com a mesma intensidade das luzes do preset. */
export function l3LightScale(preset) {
  const raw = (preset.hemiIntensity * 0.55 + preset.sunIntensity * 0.35) / 0.88;
  return Math.max(0.25, Math.min(1.2, raw));
}

/** Recolore um atributo de cor: out = lerp(base * lightScale, fog, hazeMix(dist)). Escreve in-place; sem alocação. */
export function recolourHaze(colourAttr, base, dist, fog, hazeDistM, lightScale) {
  const a = colourAttr.array;
  for (let i = 0; i < dist.length; i++) {
    const mix = horizonHazeMix(dist[i], hazeDistM);
    a[i * 3] = base[i * 3] * lightScale * (1 - mix) + fog.r * mix;
    a[i * 3 + 1] = base[i * 3 + 1] * lightScale * (1 - mix) + fog.g * mix;
    a[i * 3 + 2] = base[i * 3 + 2] * lightScale * (1 - mix) + fog.b * mix;
  }
  colourAttr.needsUpdate = true;
}

/** Anel de silhueta de uma camada L3: faixa vertical contínua com linha de topo irregular (ruído de valor semeado). Devolve vértices/triângulos em `b`. */
export function buildSilhouetteRing(b, layer, seedBase, distOut) {
  const [h0, h1] = layer.heightsM;
  const n = layer.segments;
  const first = b.vertexCount;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const x = Math.cos(a) * layer.radiusM;
    const z = Math.sin(a) * layer.radiusM;
    const low = valueNoise(k * 0.11, seedBase, seedBase + 1);
    const high = valueNoise(k * 0.9, seedBase * 3, seedBase + 5);
    const gap = valueNoise(k * 0.045, seedBase + 9, seedBase + 7) < 0.2 ? 0.28 : 1; // clareiras: campo aberto no horizonte
    const h = (h0 + (h1 - h0) * (0.7 * low + 0.3 * high)) * gap;
    const shade = 0.82 + 0.3 * hash01(k, seedBase);
    const [r, g, bl] = layer.rgb;
    b.vertex(x, L3_BOTTOM_Y, z, r * shade * 0.7, g * shade * 0.7, bl * shade * 0.7);
    b.vertex(x, h, z, r * shade, g * shade, bl * shade);
    distOut.push(layer.radiusM, layer.radiusM);
  }
  for (let k = 0; k < n; k++) {
    const k2 = (k + 1) % n;
    b.quad(first + k * 2, first + k * 2 + 1, first + k2 * 2 + 1, first + k2 * 2);
  }
}

/** Uma caixa (8 vértices, 12 triângulos) com cor por vértice (base escura, topo claro). Para impostores L3. */
function pushBox(b, cx, cy, cz, w, h, d, yaw, colour, distance, distOut) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const first = b.vertexCount;
  for (const [sx, sy, sz] of [[-1, 0, -1], [1, 0, -1], [1, 0, 1], [-1, 0, 1], [-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]]) {
    const lx = (sx * w) / 2;
    const lz = (sz * d) / 2;
    const k = sy ? 1 : 0.65;
    b.vertex(cx + lx * c + lz * s, cy + sy * h, cz - lx * s + lz * c, colour[0] * k, colour[1] * k, colour[2] * k);
    distOut.push(distance);
  }
  b.quad(first + 0, first + 1, first + 5, first + 4);
  b.quad(first + 1, first + 2, first + 6, first + 5);
  b.quad(first + 2, first + 3, first + 7, first + 6);
  b.quad(first + 3, first + 0, first + 4, first + 7);
  b.quad(first + 4, first + 5, first + 6, first + 7);
}

export class M02Environment {
  /**
   * `parent` = THREE.Group onde o ambiente vive. `world` = M02QuintaWorld (A/B/C): `terrainHeightAt(x,z)`, `obstacles`, `layout`.
   * `quality` = 'low'|'medium'|'high'. Constrói uma vez; `setWorld` reconstrói só o que depende do mundo (campo, bermas).
   */
  constructor(parent, world, { quality = 'medium', cellId = 'A' } = {}) {
    this.parent = parent;
    this.quality = quality;
    this.cellId = cellId;
    this.group = new THREE.Group();
    this.group.name = 'm02-environment';
    parent.add(this.group);

    this.area = createM02FieldArea();
    this.soilTexture = null; // criado com o campo (precisa de DOM canvas): dono = esta classe
    this.fieldGroup = new THREE.Group();
    this.worldGroup = new THREE.Group(); // bermas/montículos/crateras: dependem do mundo
    this.treesGroup = new THREE.Group();
    this.stubbleGroup = new THREE.Group();
    this.l3Follow = new THREE.Group(); // anéis centrados na câmara (x/z)
    this.l3Fixed = new THREE.Group(); // marcos provisórios fixos no mundo
    this.group.add(this.fieldGroup, this.worldGroup, this.treesGroup, this.stubbleGroup, this.l3Follow, this.l3Fixed);

    this.disposables = []; // geometrias/materiais/texturas de vida longa
    this.worldDisposables = []; // dependentes do mundo
    this.craterDisposables = [];
    this.replaced = new Set();
    this.stubblePatches = [];
    this.treeLines = [];
    this.fieldMesh = null;
    this.fieldMaterial = null;
    this.berms = [];
    this.clods = null;
    this.craterMeshes = null;
    this.craterKey = '';
    this.l3 = null;
    this.l3Landmarks = null;
    this.diagnostics = { fieldCells: 0, fieldCellsTotal: 0 };

    this.#buildStubble();
    this.#buildTrees();
    this.#buildHorizonL3();
    this.setWorld(world, cellId);
    this.setQuality(quality);
  }

  // ---- campo + terraplenos (dependem do mundo) -------------------------------------------------------------------------------------------------------

  /** Reconstrói o campo e os terraplenos para o mundo (célula A/B/C). Liberta o que foi substituído. */
  setWorld(world, cellId = this.cellId) {
    this.cellId = cellId;
    this.#disposeList(this.worldDisposables);
    this.#disposeList(this.craterDisposables);
    this.fieldGroup.clear();
    this.worldGroup.clear();
    this.replaced.clear();
    this.berms.length = 0;
    this.clods = null;
    this.craterMeshes = null;
    this.craterKey = '';
    this.#buildField(world);
    this.#buildEarthworks(world);
    this.#buildOrchard(world);
    this.#applyCellVisibility();
    this.setQuality(this.quality);
  }

  #buildField(world) {
    const mesh = M02_TERRAIN_MESH;
    const b = terrainMeshBounds(mesh);
    const rects = semanticGroundRects(world.layout);
    const cols = mesh.segX;
    const rows = mesh.segZ;
    const position = new Float32Array((cols + 1) * (rows + 1) * 3);
    let v = 0;
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++) {
        const x = b.minX + (mesh.widthM * i) / cols;
        const z = b.minZ + (mesh.lengthM * j) / rows;
        position[v++] = x;
        position[v++] = world.terrainHeightAt(x, z) + AREA_LIFT_M;
        position[v++] = z;
      }
    }
    const index = [];
    let total = 0;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        total++;
        const x0 = b.minX + (mesh.widthM * i) / cols;
        const x1 = b.minX + (mesh.widthM * (i + 1)) / cols;
        const z0 = b.minZ + (mesh.lengthM * j) / rows;
        const z1 = b.minZ + (mesh.lengthM * (j + 1)) / rows;
        if (!isFieldCell(rects, x0, x1, z0, z1)) continue;
        const a = j * (cols + 1) + i;
        const c = a + cols + 1;
        index.push(a, c, a + 1, c, c + 1, a + 1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    this.worldDisposables.push(geometry);
    this.diagnostics.fieldCells = index.length / 6;
    this.diagnostics.fieldCellsTotal = total;

    if (!this.soilTexture) {
      this.soilTexture = artTexture('soil', 256);
      this.disposables.push(this.soilTexture);
    }
    const field = createFieldMaterial(this.soilTexture, {
      track: M02_CART_TRACK,
      band: NO_BAND,
      origin: [(b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2],
      quality: this.quality,
    });
    Object.assign(field.material, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
    this.fieldMaterial = field;
    this.worldDisposables.push(field.material);
    const fieldMesh = new THREE.Mesh(geometry, field.material);
    fieldMesh.name = 'm02-field';
    fieldMesh.renderOrder = -1;
    fieldMesh.receiveShadow = true;
    this.fieldGroup.add(fieldMesh);
    this.fieldMesh = fieldMesh;
  }

  #buildEarthworks(world) {
    const { parapets, mounds } = selectEarthworkCovers(world.obstacles);
    const earth = createEarthMaterial();
    this.worldDisposables.push(earth);

    // Bermas: a M01 põe a face de madeira (revetment) virada para +z; no M02 o jogador avança de norte (-z) para sul, por isso a berma é construída
    // com as caixas espelhadas em z e o mesh tem scale.z = -1 (o three.js inverte o winding sozinho quando o determinante é negativo).
    for (const box of parapets) {
      const [mirrored] = mirrorBoxesZ([box]);
      const geometry = buildBermGeometry([mirrored]);
      const berm = createBermMaterial({ base: box.min.y, z: (box.min.z + box.max.z) / 2, quality: this.quality });
      const mesh = new THREE.Mesh(geometry, berm.material);
      mesh.name = `m02-berm:${box.id}`;
      mesh.scale.z = -1;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.worldGroup.add(mesh);
      this.worldDisposables.push(geometry, berm.material);
      this.berms.push(berm);
      this.replaced.add(box.id);
    }
    if (mounds.length) {
      const geometry = buildMoundGeometry(3, { seg: 18, detail: 1 });
      const mesh = buildMoundInstances(mounds, geometry, earth);
      mesh.name = 'm02-mounds';
      this.worldGroup.add(mesh);
      this.worldDisposables.push(geometry);
      for (const m of mounds) this.replaced.add(m.id);
    }
    if (mounds.length || parapets.length) {
      const clodGeometry = buildClodGeometry();
      this.clods = buildClodInstances(mounds, parapets, clodGeometry, earth);
      this.clods.name = 'm02-clods';
      this.worldGroup.add(this.clods);
      this.worldDisposables.push(clodGeometry);
    }
  }

  /**
   * Pomar: as árvores candidatas (macieiras por confirmar, G1) desenhadas com os blocos da M01 (GeoBuilder: tronco dobrado + copa irregular), numa só geometria
   * e num só draw call, em vez de 7 icosaedros. Troncos e copas da simulação (caixas) continuam a ser colisão/bloqueio de vista; aqui só se desenha.
   */
  #buildOrchard(world) {
    const specs = orchardTreeSpecs(world.trees);
    if (!specs.length) return;
    const b = new GeoBuilder();
    specs.forEach((spec, n) => {
      const { trunk, crown } = spec;
      const top = b.trunk(trunk.x, trunk.y, trunk.z, trunk.height, trunk.radius * 1.15, trunk.radius * 0.8, { sides: 6, rings: 3, bend: [(hash01(n, 601) - 0.5) * 0.3, (hash01(n, 602) - 0.5) * 0.3], color: [0.2, 0.14, 0.09], seed: n });
      void top;
      const g = [0.11 + 0.03 * hash01(n, 603), 0.17 + 0.03 * hash01(n, 604), 0.07]; // verdes de folhosa em fim de verão, mais claros que os pinheiros da M01 (copa baixa, pomar)
      b.blob(crown.cx, crown.cy, crown.cz, crown.rx, crown.ry, crown.rz, {
        detail: 1,
        seed: 90 + n,
        lump: 0.1,
        bottom: [g[0] * 0.45, g[1] * 0.45, g[2] * 0.45],
        top: [g[0] * 1.7, g[1] * 1.65, g[2] * 1.4],
        yaw: hash01(n, 605) * 6.28,
      });
      for (const id of spec.replacesIds) this.replaced.add(id);
    });
    const geometry = b.build();
    const material = createTreeMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'm02-orchard-candidates';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.worldGroup.add(mesh);
    this.worldDisposables.push(geometry, material);
  }

  /** true para as caixas da simulação que este módulo desenha como terra (o renderer não as desenha como caixas). */
  replaces(id) {
    return this.replaced.has(id);
  }

  /**
   * Cratera do impacto fixo HS-C2/SP03 (posição lida de `sim.horizon.hsC2`, nunca inventada). Disco chamuscado + aro de terra, instanciados, 2 draws.
   * Chamar com `null` para remover. Idempotente.
   */
  syncCrater(spot) {
    const key = spot ? `${spot.x},${spot.z}` : '';
    if (key === this.craterKey) return;
    this.craterKey = key;
    if (this.craterMeshes) {
      this.worldGroup.remove(this.craterMeshes.discs, this.craterMeshes.rims);
      this.craterMeshes = null;
    }
    this.#disposeList(this.craterDisposables);
    if (!spot) return;
    const disc = new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2);
    const rim = buildCraterRimGeometry();
    const soot = new THREE.MeshStandardMaterial({ color: '#2a251d', roughness: 1, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const earth = createEarthMaterial();
    this.craterDisposables.push(disc, rim, soot, earth);
    const discs = new THREE.InstancedMesh(disc, soot, 1);
    const rims = new THREE.InstancedMesh(rim, earth, 1);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    p.set(spot.x, 0.03, spot.z);
    s.set(CRATER_RADIUS_M, 1, CRATER_RADIUS_M * 0.86);
    discs.setMatrixAt(0, m.compose(p, q, s));
    p.set(spot.x, 0, spot.z);
    s.set(CRATER_RADIUS_M * 1.02, 0.4, CRATER_RADIUS_M * 0.9);
    rims.setMatrixAt(0, m.compose(p, q, s));
    discs.name = 'm02-crater-disc';
    rims.name = 'm02-crater-rim';
    rims.castShadow = true;
    this.worldGroup.add(discs, rims);
    this.craterMeshes = { discs, rims };
  }

  // ---- restolho + árvores (dependem da célula, não do mundo) ------------------------------------------------------------------------------------------

  #buildStubble() {
    const b = terrainMeshBounds();
    for (const patch of M02_STUBBLE_PATCHES) {
      const stubble = createStubble({ bounds: patch.bounds, groundY: AREA_LIFT_M, origin: [(b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2], radius: STUBBLE_RADIUS_M });
      stubble.mesh.name = `m02-stubble:${patch.id}`;
      this.stubbleGroup.add(stubble.mesh);
      this.stubblePatches.push({ id: patch.id, bounds: patch.bounds, stubble, allocated: stubble.mesh.count });
    }
  }

  #buildTrees() {
    const material = createTreeMaterial();
    this.disposables.push(material);
    for (const line of M02_TREE_LINES) {
      const { T, rotationY, worldOf } = treeLineLocal(line);
      // As linhas ficam nas margens da malha (x = ±110, z = 96), onde terrainHeightAt = groundY em todas as células: chão plano, sem consulta ao mundo.
      void worldOf;
      const built = buildTreeLine(T, () => M02_TERRAIN_MESH.groundY);
      const mesh = new THREE.Mesh(built.geometry, material);
      mesh.name = `m02-trees:${line.id}`;
      mesh.rotation.y = rotationY;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      this.treesGroup.add(mesh);
      this.disposables.push(built.geometry);
      this.treeLines.push({ id: line.id, mesh, trees: built.trees, total: built.total, triangles: built.geometry.index.count / 3 });
    }
  }

  // ---- horizonte L3 (1,5-8 km): impostores de baixo custo --------------------------------------------------------------------------------------------

  #buildHorizonL3() {
    // 1) moldura de chão: do limite da malha de terreno até HORIZON_L3_FAR_M (usa o nevoeiro da cena: por isso funde com o terreno sem costura).
    const t = terrainMeshBounds();
    const far = HORIZON_L3_FAR_M;
    const inner = [[t.minX, t.minZ], [t.maxX, t.minZ], [t.maxX, t.maxZ], [t.minX, t.maxZ]];
    const outer = [[t.minX - far, t.minZ - far], [t.maxX + far, t.minZ - far], [t.maxX + far, t.maxZ + far], [t.minX - far, t.maxZ + far]];
    const pos = [];
    for (const [x, z] of [...inner, ...outer]) pos.push(x, -0.02, z);
    const idx = [];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      idx.push(i, 4 + j, 4 + i, i, j, 4 + j); // winding virado para +y (normal +y verificada em teste)
    }
    const frame = new THREE.BufferGeometry();
    frame.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    frame.setIndex(idx);
    frame.computeVertexNormals();
    const frameMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(...FIELD_COLOUR_RGB), roughness: 0.96, metalness: 0.02 });
    const frameMesh = new THREE.Mesh(frame, frameMat);
    frameMesh.name = 'm02-l3-ground-frame';
    frameMesh.frustumCulled = false;
    this.group.add(frameMesh); // fixa no mundo (costura com a malha de terreno); NÃO segue a câmara
    this.disposables.push(frame, frameMat);

    // 2) anéis de silhueta (3 camadas) num só geometry, cores por vértice recoloridas por preset (neblina + luz).
    const b = new GeoBuilder();
    const dist = [];
    HORIZON_L3_LAYERS.forEach((layer, i) => buildSilhouetteRing(b, layer, 40 + i * 17, dist));
    const rings = this.#finishL3Mesh(b, dist, 'm02-l3-silhouettes');
    rings.mesh.frustumCulled = false;
    this.l3Follow.add(rings.mesh);
    this.l3 = rings;

    // 3) marcos PROVISÓRIOS + quintas distantes (detalhe L3; escondido em qualidade baixa). Posições fixas no mundo (azimute/distância de horizon-system).
    const d = new GeoBuilder();
    const dd = [];
    const lm = HORIZON_L3_LANDMARKS;
    for (const mark of lm) {
      const p = horizonAzimuthToWorld(mark.azimuthDeg, mark.distanceM);
      const yaw = Math.atan2(-p.x, -p.z); // eixo local x do volume = tangente ao horizonte (perpendicular à direção origem->marco)
      if (mark.towers === 0) {
        // massa urbana baixa: fila de volumes de alturas variadas (sem torre inventada)
        const n = Math.round(mark.widthM / 34);
        for (let k = 0; k < n; k++) {
          const off = (k - (n - 1) / 2) * 34;
          const h = mark.heightM * (0.38 + 0.62 * hash01(k, 71));
          const ox = Math.cos(yaw) * off;
          const oz = -Math.sin(yaw) * off;
          pushBox(d, p.x + ox, 0, p.z + oz, 30, h, 20, yaw, [0.09, 0.1, 0.1], mark.distanceM, dd);
        }
      } else {
        // volume de estudo: nave + duas torres (provisório; sem pretensão de fidelidade)
        const nave = [mark.widthM * 0.55, mark.heightM * 0.5, 36];
        pushBox(d, p.x, 0, p.z, nave[0], nave[1], nave[2], yaw, [0.1, 0.11, 0.11], mark.distanceM, dd);
        for (const side of [-1, 1]) {
          const off = side * mark.widthM * 0.42;
          pushBox(d, p.x + Math.cos(yaw) * off, 0, p.z - Math.sin(yaw) * off, 12, mark.heightM, 12, yaw, [0.1, 0.11, 0.11], mark.distanceM, dd);
        }
      }
    }
    // quintas distantes: 9 grupos de 3-4 volumes a 1,6-2,6 km, azimutes pseudo-aleatórios determinísticos (sem repetição idêntica)
    for (let g = 0; g < 9; g++) {
      const az = hash01(g, 311) * 360;
      const dist2 = 1600 + hash01(g, 312) * 1000;
      const c = horizonAzimuthToWorld(az, dist2);
      const n = 3 + Math.floor(hash01(g, 313) * 2);
      for (let k = 0; k < n; k++) {
        const bw = 9 + hash01(g * 7 + k, 314) * 10;
        const bh = 5 + hash01(g * 7 + k, 315) * 5;
        pushBox(d, c.x + (hash01(g * 7 + k, 316) - 0.5) * 70, 0, c.z + (hash01(g * 7 + k, 317) - 0.5) * 70, bw, bh, 8 + hash01(g * 7 + k, 318) * 6, hash01(g * 7 + k, 319) * 3.14, [0.1, 0.095, 0.085], dist2, dd);
      }
    }
    const landmarks = this.#finishL3Mesh(d, dd, 'm02-l3-landmarks');
    landmarks.mesh.frustumCulled = false;
    this.l3Fixed.add(landmarks.mesh);
    this.l3Landmarks = landmarks;
  }

  #finishL3Mesh(builder, dist, name) {
    const geometry = builder.build();
    geometry.deleteAttribute('normal'); // MeshBasic: sem iluminação
    const colour = geometry.getAttribute('color');
    const base = new Float32Array(colour.array); // cor base (antes de neblina/luz)
    const distances = Float32Array.from(dist);
    const material = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    this.disposables.push(geometry, material);
    return { mesh, geometry, colour, base, distances, triangles: geometry.index.count / 3 };
  }

  /** Aplica neblina/luz do preset às silhuetas L3 (apenas no preset change; nunca por frame). `preset.hazeDistM` = visibilidade em metros. */
  applyAtmosphere(preset) {
    const fog = new THREE.Color(preset.fogColor);
    const scale = l3LightScale(preset);
    const haze = preset.hazeDistM ?? 9000;
    for (const part of [this.l3, this.l3Landmarks]) {
      if (part) recolourHaze(part.colour, part.base, part.distances, fog, haze, scale);
    }
  }

  // ---- qualidade, célula e frame -------------------------------------------------------------------------------------------------------------------

  /** Escala o que é desenhado com o nível (nunca cobertura nem leitura de combate): restolho (alta/média), árvores (fração), clods, detalhe L3. */
  setQuality(quality) {
    this.quality = quality;
    this.fieldMaterial?.setQuality(quality);
    for (const berm of this.berms) berm.setQuality(quality);
    const share = TREE_SHARE[quality] ?? TREE_SHARE.low;
    for (const line of this.treeLines) {
      const r = treeDrawRange(line.trees, share);
      line.mesh.geometry.setDrawRange(r.start, r.count);
      line.drawn = r.trees;
    }
    const tufts = { high: 3400, medium: 1400, low: 0 }[quality] ?? 0;
    for (const p of this.stubblePatches) p.tufts = Math.min(p.allocated, tufts);
    if (this.clods) this.clods.count = Math.max(1, Math.round(this.clods.userData.total * ({ low: 0.45, medium: 0.7, high: 1 }[quality] ?? 0.45)));
    if (this.l3Landmarks) this.l3Landmarks.mesh.visible = quality !== 'low';
    this.#applyCellVisibility();
  }

  #applyCellVisibility() {
    const inA = this.cellId === 'A';
    this.treesGroup.visible = inA;
    this.stubbleGroup.visible = inA;
  }

  /**
   * Por frame (sem alocações): os anéis L3 seguem a câmara em x/z; o restolho só é desenhado perto da câmara (o shader dá a volta ao azulejo em torno dela).
   * Só lê a posição da câmara.
   */
  update(camera) {
    this.l3Follow.position.x = camera.position.x;
    this.l3Follow.position.z = camera.position.z;
    const cx = camera.position.x;
    const cz = camera.position.z;
    for (const p of this.stubblePatches) {
      const [minX, maxX, minZ, maxZ] = p.bounds;
      const dx = Math.max(minX - cx, 0, cx - maxX);
      const dz = Math.max(minZ - cz, 0, cz - maxZ);
      const n = p.tufts ?? 0;
      p.stubble.mesh.count = Math.max(1, n);
      p.stubble.mesh.visible = n > 0 && dx * dx + dz * dz < STUBBLE_RADIUS_M * STUBBLE_RADIUS_M;
    }
  }

  get stats() {
    let triangles = this.fieldMesh ? this.fieldMesh.geometry.index.count / 3 : 0;
    let drawCalls = this.fieldMesh ? 1 : 0;
    for (const line of this.treeLines) {
      if (!this.treesGroup.visible) break;
      triangles += line.mesh.geometry.drawRange.count / 3;
      drawCalls++;
    }
    for (const p of this.stubblePatches) {
      if (this.stubbleGroup.visible && p.stubble.mesh.visible) {
        triangles += (p.stubble.mesh.count * p.stubble.triangles) / p.allocated;
        drawCalls++;
      }
    }
    for (const mesh of this.worldGroup.children) {
      if (!mesh.visible) continue;
      drawCalls++;
      const g = mesh.geometry;
      triangles += ((g.index ? g.index.count : g.attributes.position.count) / 3) * (mesh.isInstancedMesh ? mesh.count : 1);
    }
    for (const part of [this.l3, this.l3Landmarks]) {
      if (part && part.mesh.visible) {
        drawCalls++;
        triangles += part.triangles;
      }
    }
    drawCalls += 1; // moldura de chão
    triangles += 8;
    return { drawCalls, triangles: Math.round(triangles), fieldCells: this.diagnostics.fieldCells, fieldCellsTotal: this.diagnostics.fieldCellsTotal };
  }

  #disposeList(list) {
    for (const item of list) item.dispose();
    list.length = 0;
  }

  dispose() {
    this.#disposeList(this.worldDisposables);
    this.#disposeList(this.craterDisposables);
    this.#disposeList(this.disposables);
    for (const p of this.stubblePatches) p.stubble.dispose();
    this.stubblePatches.length = 0;
    this.treeLines.length = 0;
    this.group.removeFromParent();
    this.group.clear();
  }
}
