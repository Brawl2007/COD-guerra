import * as THREE from 'three';
import { eyePosition } from '../world/spatial.js';
import { m02MgMuzzle } from '../world/m02-quinta-world.js';
import { selectConsumerLod } from './m01-lod-policy.js';
import { HORIZON_CAMERA_FAR_M, horizonImpostorScale } from '../world/m02-horizon-system.js';
import { M02_TERRAIN_MESH } from '../world/m02-environment-area.js';
import { hash01 } from './m01-area-geo.js';
import { M02Environment } from './m02-environment.js';
// Merge M02 único: camada de apresentação da linha Codex (personagens GLB da M01, arma em primeira pessoa, gestos de granada e de
// água, áudio M01 partilhado) e projéteis de granada visíveis. Só LEEM a simulação.
import { M02Presentation } from './m02-presentation.js';
import { M02Grenades } from './m02-grenades.js';
import { m02LightingModel } from './m02-lighting.js';
import { shadowHalfHeightM, solarFromSunPosition, sunPositionFromSolar } from './m02-solar-lighting.js';

export const M02_QUALITY_PROFILES = Object.freeze({
  high: Object.freeze({
    id: 'high',
    label: 'Máxima (Desktop / GPU dedicada)',
    pixelRatioCap: 1.5,
    shadows: true,
    shadowMapSize: 1024,
    horizonDetails: true,
    decorativeTufts: 90,
    lodPreset: 'high',
  }),
  medium: Object.freeze({
    id: 'medium',
    label: 'Equilibrada (Portátil / iGPU)',
    pixelRatioCap: 1.25,
    shadows: true,
    shadowMapSize: 512,
    horizonDetails: true,
    decorativeTufts: 40,
    lodPreset: 'medium',
  }),
  low: Object.freeze({
    id: 'low',
    label: 'Otimizada (Chromebook / WebGL leve)',
    pixelRatioCap: 1.0,
    shadows: false,
    shadowMapSize: 512,
    horizonDetails: false,
    decorativeTufts: 0,
    lodPreset: 'low',
  }),
});

export const M02_LIGHTING_PRESETS = Object.freeze({
  afternoon_1939_09_09: Object.freeze({
    id: 'afternoon_1939_09_09',
    temporalId: 'T0',
    label: 'T0 · Fim de tarde · 9 Set 1939 (Bzura)',
    skyColor: 0x9aa9b8,
    fogColor: 0xaab4bc,
    fogNear: 55,
    fogFar: 320,
    hazeDistM: 9000, // L3: visibilidade (m) para a perspetiva atmosférica do horizonte 1,5-8 km
    hemiSky: 0xc8d4e0,
    hemiGround: 0x564d3e,
    hemiIntensity: 0.72,
    sunColor: 0xffdfb0,
    // TIME-01: 9/9 17:00 CET em Łęczyca = 10,7° / 265° (antes 30,5° / 247°). Sol baixo: a intensidade sobe para o chão continuar legível (cos do ângulo de incidência).
    lightSource: 'sun',
    solar: Object.freeze({ source: 'TIME-01', momentCET: '1939-09-09T17:00', elevationDeg: 10.7, azimuthDeg: 265 }),
    sunIntensity: 2.0,
    sunPosition: sunPositionFromSolar(10.7, 265),
  }),
  night_1939_09_09: Object.freeze({
    id: 'night_1939_09_09',
    temporalId: 'T1',
    label: 'T1 · Noite de 9–10 Set 1939 (Acessos Łęczyca) · lua não calculada (placeholder)',
    skyColor: 0x161d29,
    fogColor: 0x1c2432,
    fogNear: 38,
    fogFar: 230,
    hazeDistM: 3500, // L3: visibilidade (m) para a perspetiva atmosférica do horizonte 1,5-8 km
    hemiSky: 0x3b4d6b,
    hemiGround: 0x1c1a17,
    hemiIntensity: 0.36,
    // TIME-01: às 23:00 CET de 9/9 o sol está ABAIXO do horizonte. A única luz direcional da noite NÃO é um sol: é um placeholder de luar (lua não calculada;
    // fase e posição por fazer). A direção abaixo é arbitrária e fixa; não representa nenhum azimute histórico.
    lightSource: 'moon_placeholder',
    moonLabel: 'lua não calculada (placeholder)',
    // Preenchimento de luar do Codex (d4bc202e/7bc58191) sobre o T1 desta linha: luz de leitura (placeholder, sem lua calculada),
    // usada pelo modelo de iluminação M02 (m02LightingModel). Não altera o ambiente TIME-01 acima.
    moonFill: Object.freeze({ hemiSky: 0x8ea1bd, hemiGround: 0x3f4653, hemiIntensity: 2.25 }),
    solar: Object.freeze({ source: 'TIME-01', momentCET: '1939-09-09T23:00', sunBelowHorizon: true }),
    sunColor: 0x8aa8d6,
    sunIntensity: 0.4,
    sunPosition: [40, 62, -45],
  }),
  morning_1939_09_10: Object.freeze({
    id: 'morning_1939_09_10',
    temporalId: 'T2',
    label: 'T2 · Manhã de 10 Set 1939 (Neblina baixa)',
    skyColor: 0xb8c5ce,
    fogColor: 0xc4cfd6,
    fogNear: 42,
    fogFar: 250,
    hazeDistM: 4500, // L3: visibilidade (m) para a perspetiva atmosférica do horizonte 1,5-8 km
    hemiSky: 0xdce6ed,
    hemiGround: 0x585245,
    hemiIntensity: 0.82,
    sunColor: 0xfff0d4,
    // TIME-01: 10/9 07:30 CET = 20,8° / 109° (antes 28,9° / 71°: o sol estava a ENE em vez de ESE).
    lightSource: 'sun',
    solar: Object.freeze({ source: 'TIME-01', momentCET: '1939-09-10T07:30', elevationDeg: 20.8, azimuthDeg: 109 }),
    sunIntensity: 1.55,
    sunPosition: sunPositionFromSolar(20.8, 109),
  }),
  afternoon_1939_09_10: Object.freeze({
    id: 'afternoon_1939_09_10',
    temporalId: 'T3',
    label: 'T3 · Tarde de 10 Set 1939 (Fumo denso)',
    skyColor: 0x8c877e,
    fogColor: 0x968f84,
    fogNear: 48,
    fogFar: 260,
    hazeDistM: 5500, // L3: visibilidade (m) para a perspetiva atmosférica do horizonte 1,5-8 km
    hemiSky: 0xb8b0a4,
    hemiGround: 0x4a4236,
    hemiIntensity: 0.66,
    sunColor: 0xffc58a,
    // TIME-01: 10/9 16:00 CET = 19,3° / 253° (antes 30,9° / 248°).
    lightSource: 'sun',
    solar: Object.freeze({ source: 'TIME-01', momentCET: '1939-09-10T16:00', elevationDeg: 19.3, azimuthDeg: 253 }),
    sunIntensity: 1.7,
    sunPosition: sunPositionFromSolar(19.3, 253),
  }),
  neutral_review: Object.freeze({
    id: 'neutral_review',
    temporalId: null,
    label: 'Luz técnica neutra (Inspeção)',
    skyColor: 0xcad4de,
    fogColor: 0xcad4de,
    fogNear: 120,
    fogFar: 460,
    hazeDistM: 12000, // L3: visibilidade (m) para a perspetiva atmosférica do horizonte 1,5-8 km
    hemiSky: 0xffffff,
    hemiGround: 0x7c7870,
    hemiIntensity: 1.05,
    sunColor: 0xfff8ec,
    sunIntensity: 1.0,
    lightSource: 'technical',
    solar: null, // luz técnica de inspeção: não representa nenhum momento histórico
    sunPosition: [-40, 85, -20],
  }),
});

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return sorted[idx];
}

export class M02BenchRenderer {
  constructor(canvas, sim, { quality = 'medium', lighting = 'afternoon_1939_09_09' } = {}) {
    this.canvas = canvas;
    this.sim = sim;
    this.world = sim.world;
    this.qualityProfile = M02_QUALITY_PROFILES[quality] ?? M02_QUALITY_PROFILES.medium;
    this.lightingPreset = M02_LIGHTING_PRESETS[lighting] ?? M02_LIGHTING_PRESETS.afternoon_1939_09_09;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.qualityProfile.id !== 'low',
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.12, HORIZON_CAMERA_FAR_M);
    this.camera.rotation.order = 'YXZ';

    this.materials = this.#createMaterials();
    this.staticGroup = new THREE.Group();
    this.dynamicDoorsGroup = new THREE.Group();
    this.dynamicWindowsGroup = new THREE.Group();
    this.targetsGroup = new THREE.Group();
    this.horizonGroup = new THREE.Group();
    this.decorativeGroup = new THREE.Group();
    this.roofsGroup = new THREE.Group();
    this.debugGroup = new THREE.Group();
    this.tracersGroup = new THREE.Group();

    this.scene.add(
      this.staticGroup,
      this.dynamicDoorsGroup,
      this.dynamicWindowsGroup,
      this.targetsGroup,
      this.horizonGroup,
      this.decorativeGroup,
      this.roofsGroup,
      this.debugGroup,
      this.tracersGroup,
    );

    this.viewModel = this.#createViewModel();
    this.camera.add(this.viewModel);
    this.scene.add(this.camera);

    this.lastWorldRevision = -1;
    this.lastRenderedCellId = this.sim.activeCellId ?? 'A';
    this.lastArtilleryDetonated = false;
    this.lastSyncedTemporalState = null;
    this.targetMeshes = new Map();
    this.allyMeshes = new Map();
    this.enemyMeshes = new Map();
    this.lastGroupMeshes = new Map();
    this.supplyCartMesh = null;
    this.supplyVolumeMeshes = new Map();
    this.hsA1Meshes = new Map();
    this.hsA2Meshes = new Map();
    this.hsA3Meshes = new Map();
    this.roofMeshes = new Map();
    this.activeTracers = [];
    this.debugLoSVisible = false;

    this.telemetryWindow = [];
    this.lastFrameMetrics = {
      frameTimeMs: 16.6,
      simMs: 0.4,
      renderMs: 4.0,
      drawCalls: 0,
      triangles: 0,
    };

    this.#setupLights();
    // Ambiente M02 (campo, restolho, árvores, terraplenos, horizonte L3): reutiliza m01-area-*; criado ANTES do mundo estático (que consulta replaces()).
    this.environment = new M02Environment(this.scene, this.world, {
      quality: this.qualityProfile.id,
      cellId: this.sim.activeCellId ?? 'A',
    });
    this.frameEvents = []; // eventos da simulação drenados neste frame (reutilizado; consumidores de apresentação em m02-01-main.js)
    // Codex: granadas em voo à escala dos projéteis da M01 e a apresentação em primeira pessoa/personagens (carregam GLB em segundo
    // plano; até lá ficam os bonecos de caixa e a arma de caixa desta bancada).
    this.grenadeViews = new M02Grenades(this.scene, this.materials.grenade_body);
    this.presentation = new M02Presentation(this.scene, this.camera, sim, {
      grenadeGeometry: this.grenadeViews.geometry,
      grenadeMaterial: this.materials.grenade_body,
    });
    this.presentationLightKey = null;
    this.presentationDaylight = 1;
    this.#buildStaticWorld();
    this.#rebuildDynamicOpenings();
    this.#buildTargets();
    this.#buildHorizonRing();
    this.#buildDebugOverlay();
    this.applyQualityProfile(this.qualityProfile.id);
    this.applyLightingPreset(this.lightingPreset.id);
    this.resize();
  }

  #createMaterials() {
    return {
      brick_B01: new THREE.MeshStandardMaterial({ color: 0xd8d1c2, roughness: 0.88, metalness: 0.04 }),
      brick_B04: new THREE.MeshStandardMaterial({ color: 0xc9b9a4, roughness: 0.9, metalness: 0.04 }),
      brick_cover: new THREE.MeshStandardMaterial({ color: 0xa6674c, roughness: 0.9, metalness: 0.05 }),
      wood_thick: new THREE.MeshStandardMaterial({ color: 0x604631, roughness: 0.87, metalness: 0.05 }),
      wood_frame: new THREE.MeshStandardMaterial({ color: 0x473323, roughness: 0.82, metalness: 0.06 }),
      wood_thin: new THREE.MeshStandardMaterial({ color: 0x7e5d3f, roughness: 0.84, metalness: 0.04 }),
      door_open: new THREE.MeshStandardMaterial({ color: 0x6f5238, roughness: 0.82, metalness: 0.05 }),
      door_closed: new THREE.MeshStandardMaterial({ color: 0x5c3e26, roughness: 0.84, metalness: 0.05 }),
      stone: new THREE.MeshStandardMaterial({ color: 0x7d7a74, roughness: 0.92, metalness: 0.05 }),
      earth: new THREE.MeshStandardMaterial({ color: 0x524432, roughness: 0.96, metalness: 0.02 }),
      foliage: new THREE.MeshStandardMaterial({ color: 0x455e33, roughness: 0.9, metalness: 0.02 }),
      roof_thatch: new THREE.MeshStandardMaterial({ color: 0x8a754d, roughness: 0.95, metalness: 0.02, side: THREE.DoubleSide }),
      roof_wood: new THREE.MeshStandardMaterial({ color: 0x4b3828, roughness: 0.9, metalness: 0.04, side: THREE.DoubleSide }),
      roof_tile: new THREE.MeshStandardMaterial({ color: 0x8f4935, roughness: 0.85, metalness: 0.06, side: THREE.DoubleSide }),
      glass_intact: new THREE.MeshPhysicalMaterial({
        color: 0xaed4e6,
        transparent: true,
        opacity: 0.42,
        roughness: 0.15,
        metalness: 0.05,
      }),
      glass_shard: new THREE.MeshBasicMaterial({ color: 0xcbe7f5, transparent: true, opacity: 0.65 }),
      polish_uniform: new THREE.MeshStandardMaterial({ color: 0x665e3b, roughness: 0.84, metalness: 0.08 }),
      polish_helmet: new THREE.MeshStandardMaterial({ color: 0x4b4b2f, roughness: 0.62, metalness: 0.28 }),
      target_uniform: new THREE.MeshStandardMaterial({ color: 0x485249, roughness: 0.8, metalness: 0.1 }),
      target_mg: new THREE.MeshStandardMaterial({ color: 0x3b443e, roughness: 0.72, metalness: 0.2 }),
      target_helmet: new THREE.MeshStandardMaterial({ color: 0x2c322f, roughness: 0.55, metalness: 0.35 }),
      target_hit: new THREE.MeshStandardMaterial({ color: 0xc94a38, roughness: 0.6, metalness: 0.1 }),
      target_hit_reduced: new THREE.MeshStandardMaterial({ color: 0xb9b08a, roughness: 0.7, metalness: 0.1 }),
      target_wounded: new THREE.MeshStandardMaterial({ color: 0x6e5246, roughness: 0.85, metalness: 0.06 }),
      target_surrendered: new THREE.MeshStandardMaterial({ color: 0x5c665e, roughness: 0.85, metalness: 0.05 }),
      target_down: new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.9, metalness: 0.05 }),
      chalk_white: new THREE.MeshBasicMaterial({ color: 0xf7f7f0 }),
      grenade_body: new THREE.MeshStandardMaterial({ color: 0x3e4a33, roughness: 0.6, metalness: 0.35 }),
      gun_metal: new THREE.MeshStandardMaterial({ color: 0x25282a, roughness: 0.42, metalness: 0.75 }),
      gun_wood: new THREE.MeshStandardMaterial({ color: 0x5e3c22, roughness: 0.72, metalness: 0.08 }),
      horizon_treeline: new THREE.MeshStandardMaterial({ color: 0x394934, roughness: 0.95, metalness: 0.0 }),
      horizon_study: new THREE.MeshBasicMaterial({ color: 0x6d7782, wireframe: false, transparent: true, opacity: 0.55 }),
      horizon_smoke: new THREE.MeshBasicMaterial({ color: 0x4e4a44, transparent: true, opacity: 0.52 }),
      horizon_flash: new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.85 }),
    };
  }

  #setupLights() {
    this.hemiLight = new THREE.HemisphereLight(0xc8d4e0, 0x564d3e, 0.72);
    this.sunLight = new THREE.DirectionalLight(0xffdfb0, 1.35);
    this.sunLight.position.set(-75, 48, 32);
    this.sunLight.castShadow = this.qualityProfile.shadows;
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 210;
    this.sunLight.shadow.camera.left = -65;
    this.sunLight.shadow.camera.right = 65;
    this.sunLight.shadow.camera.top = 75;
    this.sunLight.shadow.camera.bottom = -95;
    this.sunLight.shadow.bias = -0.0005;
    this.b01InteriorLight = new THREE.PointLight(0xffe4b8, 0.85, 18);
    this.b01InteriorLight.position.set(-33, 2.45, -13);
    this.b02InteriorLight = new THREE.PointLight(0xffddb0, 0.9, 26);
    this.b02InteriorLight.position.set(22, 3.1, -31);
    this.scene.add(this.hemiLight, this.sunLight, this.b01InteriorLight, this.b02InteriorLight);
  }

  #createViewModel() {
    const group = new THREE.Group();
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.08, 0.58), this.materials.gun_wood);
    stock.position.set(0.22, -0.21, -0.42);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.66, 8), this.materials.gun_metal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.22, -0.165, -0.62);
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.026, 0.02), this.materials.gun_metal);
    sight.position.set(0.22, -0.145, -0.88);
    group.add(stock, barrel, sight);
    return group;
  }

  #buildStaticWorld() {
    this.staticGroup.clear();
    this.roofsGroup.clear();
    this.decorativeGroup.clear();
    this.roofMeshes.clear();

    // 1. Terrain mesh with ditch depression, C01 northern approach (P1 at Z=-175, EA0 at Z=-110), and vertex colors
    const width = M02_TERRAIN_MESH.widthM;
    const length = M02_TERRAIN_MESH.lengthM;
    const segX = M02_TERRAIN_MESH.segX;
    const segZ = M02_TERRAIN_MESH.segZ;
    const terrainGeo = new THREE.PlaneGeometry(width, length, segX, segZ);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const color = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i) + M02_TERRAIN_MESH.centreZ; // centrada em Z = -65 (cobre -235..+105)
      pos.setZ(i, vz);
      const vy = this.world.terrainHeightAt(vx, vz);
      pos.setY(i, vy);

      if (vx >= -48.5 && vx <= -41.5 && vz >= -85 && vz <= 48) {
        // Wet ditch bottom and muddy banks
        color.setHex(vy < -0.75 ? 0x353126 : 0x4d4331);
      } else if (vx >= -27.0 && vx <= -8.5 && vz >= -113.0 && vz <= -108.5) {
        // EA0 northern outpost transverse trench
        color.setHex(0x3e3729);
      } else if (Math.abs(vx) <= 3.1 && vz <= 20) {
        // North-south cart track (from C01 P1 Z=-175 down to farmstead)
        color.setHex(0x6e5d45);
      } else if (vx >= -22 && vx <= 16 && vz >= -20 && vz <= 20) {
        // Farmstead packed-earth courtyard
        color.setHex(0x695c47);
      } else if (vx >= -24 && vx <= 12 && vz >= 28 && vz <= 62) {
        // Southern orchard grass
        color.setHex(0x4c5f38);
      } else {
        // Agricultural fields with subtle furrow variation
        const furrow = Math.sin(vx * 1.4) * 0.03;
        color.setRGB(0.36 + furrow, 0.39 + furrow, 0.25);
      }
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.96,
      metalness: 0.02,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    this.staticGroup.add(terrainMesh);

    // 2. Floor slabs inside B01, B02, B03, B04
    for (const b of this.world.layout.buildings) {
      const [minX, maxX, minZ, maxZ] = b.bounds;
      const bw = maxX - minX;
      const bd = maxZ - minZ;
      const floorGeo = new THREE.BoxGeometry(bw - 0.1, 0.08, bd - 0.1);
      const floorMat = b.id === 'B01' ? this.materials.wood_thin : this.materials.earth;
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.set(minX + bw / 2, 0.02, minZ + bd / 2);
      floorMesh.receiveShadow = true;
      this.staticGroup.add(floorMesh);

      // Pitched gable roof
      const roofGroup = this.#createGableRoof(b);
      this.roofMeshes.set(b.id, roofGroup);
      this.roofsGroup.add(roofGroup);
    }

    // 3. Static obstacles from world.obstacles (excluding dynamic door_leaf, window_glass, and destructible fences)
    for (const ob of this.world.obstacles) {
      if (ob.role === 'door_leaf' || ob.role === 'window_glass') continue;
      if (ob.id === 'cov_south_fence_west' || ob.id === 'cov_south_fence_east') continue;
      if (this.environment.replaces(ob.id)) continue; // parapeitos/montículos de terra: desenhados por m02-environment (berma/montículo da M01)
      const sx = ob.max.x - ob.min.x;
      const sy = ob.max.y - ob.min.y;
      const sz = ob.max.z - ob.min.z;
      if (sx <= 0 || sy <= 0 || sz <= 0) continue;

      let mat = this.materials.brick_B01;
      if (ob.role === 'window_frame' || ob.role === 'door_frame' || ob.role === 'post') {
        mat = this.materials.wood_frame;
      } else if (ob.material === 'brick') {
        mat = ob.buildingId === 'B04'
          ? this.materials.brick_B04
          : ob.buildingId === 'B01'
            ? this.materials.brick_B01
            : this.materials.brick_cover;
      } else if (ob.material === 'wood_thick') {
        mat = this.materials.wood_thick;
      } else if (ob.material === 'wood_thin') {
        mat = this.materials.wood_thin;
      } else if (ob.material === 'stone') {
        mat = this.materials.stone;
      } else if (ob.material === 'earth') {
        mat = this.materials.earth;
      }

      const geo = ob.role === 'tree_trunk'
        ? new THREE.CylinderGeometry(sx * 0.48, sx * 0.55, sy, 8)
        : new THREE.BoxGeometry(sx, sy, sz);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (ob.min.x + ob.max.x) / 2,
        (ob.min.y + ob.max.y) / 2,
        (ob.min.z + ob.max.z) / 2,
      );
      mesh.castShadow = ob.role !== 'terrain_bank';
      mesh.receiveShadow = true;
      this.staticGroup.add(mesh);
    }

    // 4. Orchard tree canopies (visual sight-blockers, non-ballistic)
    for (const sb of this.world.sightBlockers) {
      if (this.environment.replaces(sb.id)) continue; // copas candidatas: desenhadas por m02-environment (blocos de árvore da M01)
      const rx = (sb.max.x - sb.min.x) / 2;
      const ry = (sb.max.y - sb.min.y) / 2;
      const crownGeo = new THREE.IcosahedronGeometry(1, 1);
      crownGeo.scale(rx, ry, rx);
      const crownMesh = new THREE.Mesh(crownGeo, this.materials.foliage);
      crownMesh.position.set(
        (sb.min.x + sb.max.x) / 2,
        (sb.min.y + sb.max.y) / 2,
        (sb.min.z + sb.max.z) / 2,
      );
      crownMesh.castShadow = true;
      this.staticGroup.add(crownMesh);
    }

    this.supplyCartMesh = null;
    this.supplyVolumeMeshes.clear();
    const cellId = this.sim.activeCellId ?? 'A';

    if (cellId === 'A') {
      // 5. MG34 weapon fixture inside B02 west aperture. A boca vem da fonte única (layout.mgEmplacement, PDF F3 p. 24 «MG a (12,-30)»):
      // o cano de 1,05 m estende-se da boca para dentro do celeiro, o bipé assenta no peitoril do vão.
      const mgMuzzle = m02MgMuzzle(this.sim.mgState);
      const mgBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.05, 8), this.materials.gun_metal);
      const mgGroup = new THREE.Group();
      mgBarrel.rotation.z = Math.PI / 2;
      mgBarrel.position.set(mgMuzzle.x + 0.525, mgMuzzle.y, mgMuzzle.z);
      const mgBipod = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 0.28), this.materials.gun_metal);
      mgBipod.position.set(mgMuzzle.x + 0.1, mgMuzzle.y - 0.26, mgMuzzle.z);
      mgGroup.add(mgBarrel, mgBipod);
      this.staticGroup.add(mgGroup);

      // 6. C04 Southern Orchard wooden post & white chalk sign next to wounded German soldier (-4.6, 36.2)
      const c04Post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.45, 0.18), this.materials.wood_frame);
      c04Post.position.set(-4.6, 0.725, 36.2);
      c04Post.castShadow = true;
      this.c04ChalkMesh = new THREE.Group();
      const chalkBarA = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.32, 0.05), this.materials.chalk_white);
      chalkBarA.rotation.x = 0.65;
      const chalkBarB = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.32, 0.05), this.materials.chalk_white);
      chalkBarB.rotation.x = -0.65;
      this.c04ChalkMesh.add(chalkBarA, chalkBarB);
      this.c04ChalkMesh.position.set(-4.6, 1.12, 36.2);
      this.c04ChalkMesh.visible = false;
      this.staticGroup.add(c04Post, this.c04ChalkMesh);
    } else if (cellId === 'B' && this.sim.areaB?.supplyCart) {
      // Cell B: Supply cart (SP02 — A Carroça Não Passa Sozinha) and 2 crates (vol_water & vol_ammo)
      const cartData = this.sim.areaB.supplyCart;
      const cartGroup = new THREE.Group();
      const bed = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.55, 3.2), this.materials.wood_thick);
      bed.position.y = 0.72;
      const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.14, 12);
      wheelGeo.rotateZ(Math.PI / 2);
      const wheelFL = new THREE.Mesh(wheelGeo, this.materials.wood_frame);
      wheelFL.position.set(-1.12, 0.45, -1.0);
      const wheelFR = new THREE.Mesh(wheelGeo, this.materials.wood_frame);
      wheelFR.position.set(1.12, 0.45, -1.0);
      const wheelRL = new THREE.Mesh(wheelGeo, this.materials.wood_frame);
      wheelRL.position.set(-1.12, 0.45, 1.0);
      const wheelRR = new THREE.Mesh(wheelGeo, this.materials.wood_frame);
      wheelRR.position.set(1.12, 0.45, 1.0);
      cartGroup.add(bed, wheelFL, wheelFR, wheelRL, wheelRR);
      cartGroup.position.set(cartData.x, 0, cartData.z);
      this.supplyCartMesh = cartGroup;
      this.staticGroup.add(cartGroup);

      for (const vol of cartData.volumes) {
        const crateGroup = new THREE.Group();
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.48, 0.68), this.materials.wood_thin);
        box.position.y = 0.24;
        const bandMat = new THREE.MeshBasicMaterial({
          color: vol.type === 'water' ? 0x4fc3f7 : 0x9ccc65,
        });
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.7), bandMat);
        band.position.y = 0.34;
        crateGroup.add(box, band);
        crateGroup.position.set(vol.x, 1.0, vol.z);
        this.supplyVolumeMeshes.set(vol.id, crateGroup);
        this.staticGroup.add(crateGroup);
      }
    } else if (cellId === 'C') {
      // Cell C: SP03 artillery crater smoke when detonated. As 2 macas de B12 são os props `prop_b12_stretcher_*` do layout
      // (desenhados com o resto dos obstáculos do edifício; antes havia 2 macas fixas por cima, noutras posições).
      if (this.sim.areaC?.artilleryDetonated) {
        const craterGroup = new THREE.Group();
        craterGroup.position.set(4.0, 0.1, 18.0);
        const ember = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 2.6, 0.35, 12), this.materials.horizon_flash);
        const plume = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 1.8, 9.5, 10), this.materials.horizon_smoke);
        plume.position.y = 4.8;
        craterGroup.add(ember, plume);
        this.staticGroup.add(craterGroup);
      }
    }
  }

  #createGableRoof(b) {
    const [minX, maxX, minZ, maxZ] = b.bounds;
    const w = maxX - minX + 0.7;
    const d = maxZ - minZ + 0.7;
    const eaveY = b.wallHeight ?? 2.8;
    const ridgeH = Math.max(0.8, (b.ridgeHeight ?? eaveY + 1.8) - eaveY);
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;

    const group = new THREE.Group();
    const slopeLen = Math.hypot(d / 2, ridgeH);
    const slopeAngle = Math.atan2(ridgeH, d / 2);
    const mat = b.roofMaterial === 'thatch'
      ? this.materials.roof_thatch
      : b.roofMaterial === 'tile'
        ? this.materials.roof_tile
        : this.materials.roof_wood;

    const northSlope = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, slopeLen), mat);
    northSlope.position.set(cx, eaveY + ridgeH / 2, cz - d / 4);
    northSlope.rotation.x = -slopeAngle;

    const southSlope = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, slopeLen), mat);
    southSlope.position.set(cx, eaveY + ridgeH / 2, cz + d / 4);
    southSlope.rotation.x = slopeAngle;

    // Gable triangular end walls (west and east tympanums) so the attic is enclosed
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-d / 2, 0);
    gableShape.lineTo(d / 2, 0);
    gableShape.lineTo(0, ridgeH);
    gableShape.closePath();
    const gableGeo = new THREE.ShapeGeometry(gableShape);
    const westGable = new THREE.Mesh(gableGeo, mat);
    westGable.rotation.y = -Math.PI / 2;
    westGable.position.set(minX, eaveY, cz);
    const eastGable = new THREE.Mesh(gableGeo, mat);
    eastGable.rotation.y = Math.PI / 2;
    eastGable.position.set(maxX, eaveY, cz);

    group.add(northSlope, southSlope, westGable, eastGable);
    return group;
  }

  #rebuildDynamicOpenings() {
    this.dynamicDoorsGroup.clear();
    this.dynamicWindowsGroup.clear();

    for (const door of this.world.doors) {
      const isHoriz = door.orientation === 'H';
      const w = door.width;
      const h = door.height;
      const t = 0.07;

      const pivot = new THREE.Group();
      pivot.position.set(door.hinge.x, 0, door.hinge.z);

      const leafGeo = isHoriz
        ? new THREE.BoxGeometry(w, h, t)
        : new THREE.BoxGeometry(t, h, w);
      const leafMat = door.state === 'open' ? this.materials.door_open : this.materials.door_closed;
      const leafMesh = new THREE.Mesh(leafGeo, leafMat);
      if (isHoriz) {
        leafMesh.position.set(w / 2, h / 2, 0);
      } else {
        leafMesh.position.set(0, h / 2, w / 2);
      }

      if (door.state === 'open') {
        pivot.rotation.y = isHoriz ? -Math.PI * 0.46 : Math.PI * 0.46;
      }

      pivot.add(leafMesh);
      this.dynamicDoorsGroup.add(pivot);
    }

    for (const win of this.world.windows) {
      const isHoriz = win.orientation === 'H';
      const h = win.lintelY - win.sillY;
      const w = win.width;
      if (win.state === 'intact') {
        const paneGeo = isHoriz
          ? new THREE.BoxGeometry(w, h, 0.03)
          : new THREE.BoxGeometry(0.03, h, w);
        const pane = new THREE.Mesh(paneGeo, this.materials.glass_intact);
        pane.position.set(win.center.x, win.center.y, win.center.z);
        this.dynamicWindowsGroup.add(pane);
      } else if (win.state === 'broken') {
        // Small glass shards along the sill to visually confirm shattered glass
        for (let i = -1; i <= 1; i++) {
          const shard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.03), this.materials.glass_shard);
          shard.position.set(
            win.center.x + (isHoriz ? i * 0.25 : 0),
            win.sillY + 0.07,
            win.center.z + (isHoriz ? 0 : i * 0.25),
          );
          shard.rotation.z = i * 0.35;
          this.dynamicWindowsGroup.add(shard);
        }
      }
    }

    // Destructible wooden fences (intact vs breached)
    for (const fence of this.world.fences ?? []) {
      const sx = fence.max.x - fence.min.x;
      const sy = fence.max.y - fence.min.y;
      const sz = fence.max.z - fence.min.z;
      const cx = (fence.min.x + fence.max.x) / 2;
      const cz = (fence.min.z + fence.max.z) / 2;
      if (fence.state === 'intact') {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), this.materials.wood_thin);
        mesh.position.set(cx, sy / 2, cz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.dynamicDoorsGroup.add(mesh);
      } else {
        // Breached fence: render low splintered posts on the edges and a wide gap in the center
        const stubLeft = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.36, sz), this.materials.wood_thin);
        stubLeft.position.set(fence.min.x + 0.7, 0.18, cz);
        stubLeft.rotation.z = -0.18;
        const stubRight = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.36, sz), this.materials.wood_thin);
        stubRight.position.set(fence.max.x - 0.7, 0.18, cz);
        stubRight.rotation.z = 0.22;
        this.dynamicDoorsGroup.add(stubLeft, stubRight);
      }
    }

    this.lastWorldRevision = this.world.revision;
  }

  #createSoldierMesh({ isPolish = false, isMg = false, isRkm = false } = {}) {
    const group = new THREE.Group();
    const uniformMat = isPolish
      ? this.materials.polish_uniform
      : isMg
        ? this.materials.target_mg
        : this.materials.target_uniform;
    const helmetMat = isPolish ? this.materials.polish_helmet : this.materials.target_helmet;

    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.78, 0.24), uniformMat);
    legs.position.y = 0.39;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.62, 0.26), uniformMat);
    torso.position.y = 1.09;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), this.materials.brick_B01);
    head.position.y = 1.54;
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.148, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58),
      helmetMat,
    );
    helmet.position.y = 1.56;

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.12), uniformMat);
    leftArm.position.set(-0.29, 1.12, -0.08);
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.12), uniformMat);
    rightArm.position.set(0.29, 1.12, -0.08);

    const weaponGroup = new THREE.Group();
    const gunStock = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.08, isRkm ? 0.72 : 0.58),
      this.materials.gun_wood,
    );
    gunStock.position.set(0.18, 1.12, -0.28);
    const gunBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.016, isRkm ? 0.68 : 0.54, 6),
      this.materials.gun_metal,
    );
    gunBarrel.rotation.x = Math.PI / 2;
    gunBarrel.position.set(0.18, 1.14, -0.58);
    weaponGroup.add(gunStock, gunBarrel);

    group.add(legs, torso, head, helmet, leftArm, rightArm, weaponGroup);
    return { group, legs, torso, head, helmet, leftArm, rightArm, weaponGroup, uniformMat };
  }

  #buildTargets() {
    this.targetsGroup.clear();
    this.targetMeshes.clear();
    this.allyMeshes.clear();
    this.enemyMeshes.clear();
    this.lastGroupMeshes.clear();

    // Build Polish squad meshes (7 allies)
    for (const a of this.sim.allies ?? []) {
      const soldier = this.#createSoldierMesh({
        isPolish: true,
        isRkm: a.weapon === 'rkm_wz28',
      });
      soldier.group.position.set(a.x, a.y, a.z);
      soldier.group.rotation.y = -(a.facing ?? 0) + Math.PI / 2;
      soldier.group.visible = !a.detachedOutOfCell;
      this.targetsGroup.add(soldier.group);
      this.allyMeshes.set(a.id, soldier);
    }

    // Build German defender meshes (EA0/EA1/EB1/EC1/EC2)
    for (const e of this.sim.enemies ?? []) {
      const soldier = this.#createSoldierMesh({
        isPolish: false,
        isMg: e.weapon === 'mg34',
      });
      soldier.group.position.set(e.x, e.y, e.z);
      soldier.group.rotation.y = -(e.facing ?? 0) + Math.PI / 2;
      this.targetsGroup.add(soldier.group);
      this.enemyMeshes.set(e.id, soldier);
    }

    // Build 12 Last Group survivor meshes (LG01..LG12) when in Cell C
    if ((this.sim.activeCellId ?? 'A') === 'C' && this.sim.areaC?.lastGroup) {
      for (const lg of this.sim.areaC.lastGroup) {
        const soldier = this.#createSoldierMesh({ isPolish: true });
        soldier.group.position.set(lg.x, lg.y ?? 0, lg.z);
        soldier.group.rotation.y = -(lg.facing ?? 0) + Math.PI / 2;
        this.targetsGroup.add(soldier.group);
        this.lastGroupMeshes.set(lg.id, soldier);
      }
    }
  }

  #buildHorizonRing() {
    this.horizonGroup.clear();
    this.hsA1Meshes.clear();
    this.hsA2Meshes.clear();
    this.hsA3Meshes.clear();

    // L2: anel de linha de árvores a ~285 m (dentro do nevoeiro de jogo), 32 blocos SEM padrão periódico (largura, altura, raio e rumo semeados por hash).
    // O horizonte L3 (1,5-8 km: silhuetas, marcos provisórios de Tum/Łęczyca, quintas distantes) é de m02-environment.js; os antigos volumes «de estudo» a
    // ~340-382 m (que contradiziam o PDF H2/H3, com torre inventada em Łęczyca) foram removidos daqui.
    const ringCount = 32;
    for (let i = 0; i < ringCount; i++) {
      const a = ((i + (hash01(i, 21) - 0.5) * 0.6) / ringCount) * Math.PI * 2;
      const radius = 270 + hash01(i, 22) * 30;
      const hx = Math.cos(a) * radius;
      const hz = Math.sin(a) * radius - 55;
      const w = 30 + hash01(i, 23) * 40;
      const h = 9 + hash01(i, 24) * 12;
      const treeBlock = new THREE.Mesh(new THREE.BoxGeometry(w, h, 6 + hash01(i, 25) * 6), this.materials.horizon_treeline);
      treeBlock.position.set(hx, h / 2 - 1, hz);
      treeBlock.rotation.y = -a + Math.PI / 2;
      this.horizonGroup.add(treeBlock);
    }

    // HS-A1: 6 persistent Polish support soldiers on west flank (promote L2 <-> L1)
    for (const actor of this.sim.horizon?.hsA1.actors ?? []) {
      const soldier = this.#createSoldierMesh({ isPolish: true });
      soldier.group.position.set(actor.x, 0, actor.z);
      soldier.group.rotation.y = -(actor.facing ?? 0) + Math.PI / 2;
      this.horizonGroup.add(soldier.group);
      this.hsA1Meshes.set(actor.id, soldier);
    }

    // HS-A2: 5 finite distant barrage/smoke events (L3)
    for (const ev of this.sim.horizon?.hsA2.events ?? []) {
      const group = new THREE.Group();
      group.position.set(ev.x, 0, ev.z);
      const flash = new THREE.Mesh(new THREE.SphereGeometry(7.5, 10, 8), this.materials.horizon_flash);
      flash.position.y = 8;
      flash.visible = false;

      const plume = new THREE.Group();
      const colLow = new THREE.Mesh(new THREE.CylinderGeometry(8, 5, 34, 8), this.materials.horizon_smoke);
      colLow.position.y = 17;
      const colHigh = new THREE.Mesh(new THREE.SphereGeometry(14, 10, 8), this.materials.horizon_smoke);
      colHigh.position.y = 38;
      plume.add(colLow, colHigh);
      plume.visible = false;

      group.add(flash, plume);
      // L3 (1,5-8 km): flash e coluna são ampliados com a distância (tamanho angular legível); só apresentação, o estado vem de sim.horizon.
      group.scale.setScalar(horizonImpostorScale(ev.distanceFromOriginM ?? Math.hypot(ev.x, ev.z)));
      this.horizonGroup.add(group);
      this.hsA2Meshes.set(ev.id, { group, flash, plume });
    }

    // HS-A3: 3 rear logistics carts passing once at Z = -245
    for (const v of this.sim.horizon?.hsA3.vehicles ?? []) {
      const cart = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.3, 1.8), this.materials.wood_thick);
      body.position.y = 0.85;
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.9, 1.7), this.materials.roof_thatch);
      canopy.position.y = 1.65;
      cart.add(body, canopy);
      cart.position.set(v.x, 0, v.z);
      cart.visible = Boolean(v.visible);
      this.horizonGroup.add(cart);
      this.hsA3Meshes.set(v.id, cart);
    }
  }

  #buildDebugOverlay() {
    this.debugGroup.clear();
    // MG34 sector lines and Route A / Route B guide markers when debugLoSVisible is toggled
    const ditchPts = this.world.layout.routes.ditch.map(([x, z]) => new THREE.Vector3(x, this.world.terrainHeightAt(x, z) + 0.25, z));
    const ditchLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(ditchPts),
      new THREE.LineBasicMaterial({ color: 0x4fc3f7 }),
    );
    const orchardPts = this.world.layout.routes.orchard.map(([x, z]) => new THREE.Vector3(x, this.world.terrainHeightAt(x, z) + 0.25, z));
    const orchardLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(orchardPts),
      new THREE.LineBasicMaterial({ color: 0x81c784 }),
    );
    const mgMuzzle = m02MgMuzzle(this.sim.mgState);
    const mgRayPts = [
      new THREE.Vector3(mgMuzzle.x, mgMuzzle.y, mgMuzzle.z),
      new THREE.Vector3(-42.0, 1.2, -55.0),
      new THREE.Vector3(mgMuzzle.x, mgMuzzle.y, mgMuzzle.z),
      new THREE.Vector3(-35.0, 1.2, -5.0),
    ];
    const mgArcLine = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(mgRayPts),
      new THREE.LineBasicMaterial({ color: 0xff5252 }),
    );
    this.debugGroup.add(ditchLine, orchardLine, mgArcLine);
    this.debugGroup.visible = this.debugLoSVisible;
  }

  toggleDebugOverlay(force = null) {
    this.debugLoSVisible = force !== null ? Boolean(force) : !this.debugLoSVisible;
    this.debugGroup.visible = this.debugLoSVisible;
    return this.debugLoSVisible;
  }

  applyQualityProfile(profileId) {
    const next = M02_QUALITY_PROFILES[profileId] ?? M02_QUALITY_PROFILES.medium;
    this.qualityProfile = next;
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    this.renderer.setPixelRatio(Math.min(dpr, next.pixelRatioCap));
    this.renderer.shadowMap.enabled = next.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.sunLight.castShadow = next.shadows;
    this.horizonGroup.visible = true;
    this.environment?.setQuality(next.id);
    return this.qualityProfile;
  }

  applyLightingPreset(presetId) {
    const next = M02_LIGHTING_PRESETS[presetId] ?? M02_LIGHTING_PRESETS.afternoon_1939_09_09;
    this.lightingPreset = next;
    this.scene.background = new THREE.Color(next.skyColor);
    this.scene.fog = new THREE.Fog(next.fogColor, next.fogNear, next.fogFar);
    this.hemiLight.color.setHex(next.hemiSky);
    this.hemiLight.groundColor.setHex(next.hemiGround);
    this.hemiLight.intensity = next.hemiIntensity;
    this.sunLight.color.setHex(next.sunColor);
    this.sunLight.intensity = next.sunIntensity;
    this.sunLight.position.set(...next.sunPosition);
    // Volume de sombras ao longo do «cima» da luz: concentrado quando o sol está baixo (TIME-01), para não gastar o mapa em altura que não existe.
    const half = shadowHalfHeightM(solarFromSunPosition(next.sunPosition).elevationDeg);
    this.sunLight.shadow.camera.top = half;
    this.sunLight.shadow.camera.bottom = -half;
    this.sunLight.shadow.camera.updateProjectionMatrix();
    this.environment?.applyAtmosphere(next);
    return this.lightingPreset;
  }

  spawnShotVisual(shotRecord, colorHex = null) {
    const color = colorHex ?? (
      shotRecord.hitTarget
        ? 0x66bb6a
        : shotRecord.glassBrokenId
          ? 0x4dd0e1
          : 0xffb74d
    );
    const pts = [
      new THREE.Vector3(shotRecord.origin.x, shotRecord.origin.y - 0.06, shotRecord.origin.z),
      new THREE.Vector3(shotRecord.point.x, shotRecord.point.y, shotRecord.point.z),
    ];
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color }),
    );
    const impact = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 6),
      new THREE.MeshBasicMaterial({ color }),
    );
    impact.position.set(shotRecord.point.x, shotRecord.point.y, shotRecord.point.z);
    this.tracersGroup.add(line, impact);
    this.activeTracers.push({ line, impact, expiresAt: this.sim.clock + 1.4 });
  }

  resize() {
    const width = this.canvas.clientWidth || 1280;
    const height = this.canvas.clientHeight || 720;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  renderFrame(dt, simMs = 0) {
    const renderStart = performance.now();

    const currentCellId = this.sim.activeCellId ?? 'A';
    const currentArtilleryDetonated = Boolean(this.sim.areaC?.artilleryDetonated);
    if (
      currentCellId !== this.lastRenderedCellId ||
      currentArtilleryDetonated !== this.lastArtilleryDetonated
    ) {
      this.world = this.sim.world;
      if (currentCellId !== this.lastRenderedCellId) this.environment.setWorld(this.world, currentCellId);
      this.lastRenderedCellId = currentCellId;
      this.lastArtilleryDetonated = currentArtilleryDetonated;
      this.#buildStaticWorld();
      this.#rebuildDynamicOpenings();
      this.#buildTargets();
      // Cratera SP03 (HS-C2): posição lida de sim.horizon.hsC2 (nunca inventada); só existe na célula C depois do impacto.
      const spot = this.sim.horizon?.hsC2;
      this.environment.syncCrater(currentCellId === 'C' && currentArtilleryDetonated && spot ? { x: spot.x, z: spot.z } : null);
    }

    if (this.world.revision !== this.lastWorldRevision) {
      this.#rebuildDynamicOpenings();
    }

    // Rebuild actor meshes if enemy/ally roster count changed (e.g. C01 EA0 or C10 EC2 added)
    if (
      this.enemyMeshes.size !== (this.sim.enemies?.length ?? 0) ||
      this.allyMeshes.size !== (this.sim.allies?.length ?? 0)
    ) {
      this.#buildTargets();
    }

    // Update Cell B supply cart and volume crates
    if (currentCellId === 'B' && this.sim.areaB?.supplyCart) {
      const cartData = this.sim.areaB.supplyCart;
      if (this.supplyCartMesh) {
        this.supplyCartMesh.position.set(cartData.x, 0, cartData.z);
        this.supplyCartMesh.rotation.z = cartData.wheelDamaged ? -0.14 : 0;
      }
      for (const vol of cartData.volumes) {
        const crate = this.supplyVolumeMeshes.get(vol.id);
        if (!crate) continue;
        crate.visible = !vol.lost;
        const vy = vol.state === 'ON_CART' ? 1.0 : vol.state === 'CARRIED' ? 1.15 : 0.1;
        crate.position.set(vol.x, vy, vol.z);
      }
    }

    // Update Cell C Last Group survivors (LG01..LG12)
    if (currentCellId === 'C' && this.sim.areaC?.lastGroup) {
      for (const lg of this.sim.areaC.lastGroup) {
        const entry = this.lastGroupMeshes.get(lg.id);
        if (!entry) continue;
        entry.group.visible = Boolean(this.sim.areaC.c10Started && lg.alive) && !this.presentation?.hasCharacter(lg.id);
        entry.group.position.set(lg.x, lg.y ?? 0, lg.z);
        entry.group.rotation.y = -(lg.facing ?? 0) + Math.PI / 2;
      }
    }

    // Auto-sync temporal lighting preset (T0..T3) unless user selected neutral_review
    if (
      this.sim.horizon?.temporalState &&
      this.sim.horizon.temporalState !== this.lastSyncedTemporalState
    ) {
      this.lastSyncedTemporalState = this.sim.horizon.temporalState;
      if (this.lightingPreset.id !== 'neutral_review') {
        this.applyLightingPreset(this.sim.horizon.lightingPreset);
      }
    }

    // Update Horizon N2 visual representations (HS-A1, HS-A2, HS-A3)
    for (const actor of this.sim.horizon?.hsA1.actors ?? []) {
      const entry = this.hsA1Meshes.get(actor.id);
      if (!entry) continue;
      entry.group.position.set(actor.x, this.world.terrainHeightAt(actor.x, actor.z), actor.z);
      entry.group.rotation.y = -(actor.facing ?? 0) + Math.PI / 2;
      entry.group.userData.lodBand = actor.representation;
    }
    for (const ev of this.sim.horizon?.hsA2.events ?? []) {
      const entry = this.hsA2Meshes.get(ev.id);
      if (!entry) continue;
      entry.flash.visible = Boolean(ev.flashed && !ev.soundPlayed);
      entry.plume.visible = Boolean(ev.smokeActive);
    }
    for (const v of this.sim.horizon?.hsA3.vehicles ?? []) {
      const cart = this.hsA3Meshes.get(v.id);
      if (!cart) continue;
      cart.visible = Boolean(v.visible);
      cart.position.set(v.x, 0, v.z);
    }

    // Drain simulation events to spawn shot tracers, actor bursts, grenade blasts, or MG bursts
    const events = this.sim.drainEvents();
    this.frameEvents.length = 0;
    for (const evt of events) this.frameEvents.push(evt);
    this.presentation.consume(events, this.sim);
    this.grenadeViews.update(this.sim);
    for (const evt of events) {
      if (evt.type === 'shot-fired' && evt.shot) {
        this.spawnShotVisual(evt.shot);
      } else if (evt.type === 'actor-burst' && evt.origin && evt.target) {
        this.spawnShotVisual(
          {
            origin: evt.origin,
            point: evt.target,
            hitTarget: evt.hitAny,
          },
          evt.side === 'ally' ? 0xffe082 : 0xff6e40,
        );
      } else if (evt.type === 'grenade-exploded' && evt.center) {
        const ring = new THREE.Mesh(
          new THREE.SphereGeometry(1.6, 12, 10),
          new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.55 }),
        );
        ring.position.set(evt.center.x, evt.center.y, evt.center.z);
        const core = new THREE.Mesh(
          new THREE.SphereGeometry(0.45, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xfff3b0 }),
        );
        core.position.set(evt.center.x, evt.center.y, evt.center.z);
        this.tracersGroup.add(ring, core);
        this.activeTracers.push({ line: ring, impact: core, expiresAt: this.sim.clock + 1.1 });
      } else if (evt.type === 'mg-burst') {
        this.spawnShotVisual(
          {
            origin: evt.origin,
            point: evt.target,
            hitTarget: false,
          },
          0xff5252,
        );
      }
    }

    if (this.c04ChalkMesh) {
      this.c04ChalkMesh.visible = Boolean(this.sim.flags?.['m02.pomar_wounded_marked']);
    }

    // Clean expired tracers
    for (let i = this.activeTracers.length - 1; i >= 0; i--) {
      if (this.sim.clock >= this.activeTracers[i].expiresAt) {
        const item = this.activeTracers[i];
        this.tracersGroup.remove(item.line, item.impact);
        item.line.geometry.dispose();
        item.impact.geometry.dispose();
        this.activeTracers.splice(i, 1);
      }
    }

    // Update Polish squad meshes (7 allies) and German EA1 defender meshes (10 defenders)
    const player = this.sim.player;
    this.presentation.update(this.sim, this.qualityProfile.id);
    for (const a of this.sim.allies ?? []) {
      const entry = this.allyMeshes.get(a.id);
      if (!entry) continue;
      // Personagem GLB da M01 carregada (Codex): o boneco de caixa fica escondido.
      if (this.presentation.hasCharacter(a.id)) {
        entry.group.visible = false;
        continue;
      }
      entry.group.visible = !a.detachedOutOfCell;
      const dist = Math.hypot(a.x - player.x, a.z - player.z);
      entry.group.userData.lodBand = selectConsumerLod('actors', dist, this.qualityProfile.lodPreset);
      entry.group.position.set(a.x, a.y, a.z);
      entry.group.rotation.y = -(a.facing ?? 0) + Math.PI / 2;

      if (!a.alive || a.state === 'DOWN') {
        entry.group.rotation.x = -Math.PI / 2.2;
        entry.torso.material = this.materials.target_down;
      } else {
        entry.group.rotation.x = 0;
        const crouchDrop = a.crouched ? -0.32 : 0;
        const stride = a.moving ? Math.sin(this.sim.clock * 9.5 + a.x) * 0.04 : 0;
        entry.torso.position.y = 1.09 + crouchDrop + stride;
        entry.head.position.y = 1.54 + crouchDrop + stride;
        entry.helmet.position.y = 1.56 + crouchDrop + stride;
        entry.leftArm.position.y = 1.12 + crouchDrop + stride;
        entry.rightArm.position.y = 1.12 + crouchDrop + stride;
        entry.weaponGroup.position.y = crouchDrop + stride;
        entry.torso.material = entry.uniformMat;
      }
    }

    for (const e of this.sim.enemies ?? []) {
      const entry = this.enemyMeshes.get(e.id);
      if (!entry) continue;
      if (this.presentation.hasCharacter(e.id)) {
        entry.group.visible = false;
        continue;
      }
      entry.group.visible = true;
      const dist = Math.hypot(e.x - player.x, e.z - player.z);
      entry.group.userData.lodBand = selectConsumerLod('actors', dist, this.qualityProfile.lodPreset);
      entry.group.position.set(e.x, e.y, e.z);
      entry.group.rotation.y = -(e.facing ?? 0) + Math.PI / 2;

      if (!e.alive || e.state === 'DEAD') {
        entry.group.rotation.x = -Math.PI / 2.2;
        entry.torso.material = this.materials.target_down;
        entry.weaponGroup.visible = false;
      } else if (e.state === 'WOUNDED_UNARMED') {
        // Seated unarmed posture in southern orchard (Scene C04)
        entry.group.rotation.x = 0;
        entry.legs.position.y = 0.2;
        entry.legs.rotation.x = Math.PI / 2.2;
        entry.torso.position.y = 0.58;
        entry.head.position.y = 0.98;
        entry.helmet.position.y = 1.0;
        entry.leftArm.position.y = 0.58;
        entry.rightArm.position.y = 0.58;
        entry.leftArm.rotation.x = 0.35;
        entry.rightArm.rotation.x = 0.35;
        entry.weaponGroup.visible = false;
        entry.torso.material = this.materials.target_wounded;
      } else if (e.state === 'SURRENDERED') {
        entry.group.rotation.x = 0;
        entry.legs.position.y = 0.39;
        entry.legs.rotation.x = 0;
        entry.torso.position.y = 1.09;
        entry.head.position.y = 1.54;
        entry.helmet.position.y = 1.56;
        entry.leftArm.position.y = 1.38;
        entry.rightArm.position.y = 1.38;
        entry.leftArm.rotation.x = Math.PI * 0.85;
        entry.rightArm.rotation.x = Math.PI * 0.85;
        entry.weaponGroup.visible = false;
        entry.torso.material = this.materials.target_surrendered;
      } else {
        entry.group.rotation.x = 0;
        entry.legs.position.y = 0.39;
        entry.legs.rotation.x = 0;
        const crouchDrop = e.crouched ? -0.32 : 0;
        entry.torso.position.y = 1.09 + crouchDrop;
        entry.head.position.y = 1.54 + crouchDrop;
        entry.helmet.position.y = 1.56 + crouchDrop;
        entry.leftArm.position.y = 1.12 + crouchDrop;
        entry.rightArm.position.y = 1.12 + crouchDrop;
        entry.leftArm.rotation.x = 0;
        entry.rightArm.rotation.x = 0;
        entry.weaponGroup.position.y = crouchDrop;
        entry.weaponGroup.visible = true;
        // reducedViolence (L2/accessibilidade): o estado «atingido» mantém-se na simulação; só a marca visual deixa de ser vermelha.
        const hitMat = this.sim.audiovisual?.accessibility.reducedViolence ? this.materials.target_hit_reduced : this.materials.target_hit;
        entry.torso.material = e.hitsReceived > 0 ? hitMat : entry.uniformMat;
      }
    }

    // Camera pose from simulation player
    const eye = eyePosition(player);
    this.camera.position.set(eye.x, eye.y, eye.z);
    // In COD-Guerra spatial.js: +X is cos(angle), +Z is sin(angle).
    // Three.js camera looks down -Z when rotation.y = 0, so yaw = -angle - PI/2.
    this.camera.rotation.y = -player.angle - Math.PI / 2;
    this.camera.rotation.x = player.pitch;

    // Consumidores reais do M02AudiovisualDirector (só leitura): tremor de câmara limitado (já reduzido por reducedCameraShake no diretor), e a arma
    // baixada/recuada perto de obstáculos (weaponKinematics). Oscilação determinista a partir do relógio da simulação, sem aleatoriedade.
    const av = this.sim.audiovisual;
    const shake = av?.cameraShake.amplitudeRad ?? 0;
    if (shake > 0) {
      this.camera.rotation.x += shake * Math.sin(this.sim.clock * 61.0);
      this.camera.rotation.y += shake * Math.sin(this.sim.clock * 47.0 + 1.3);
    }
    const wk = av?.weaponKinematics;

    // Subtle weapon viewmodel bob and ADS offset
    const bob = player.moving ? Math.sin(this.sim.clock * (player.sprinting ? 11 : 7.5)) * 0.012 : 0;
    this.viewModel.position.set(
      player.aiming ? -0.14 : 0,
      bob,
      (player.aiming ? 0.08 : 0) + (wk ? wk.pullBackM + wk.recoilKickBackM : 0),
    );
    this.viewModel.rotation.x = wk ? wk.recoilPitchRad - wk.lowerPitchRad : 0;
    this.environment.update(this.camera);
    // Arma em primeira pessoa da M01 (Codex): quando está carregada substitui a arma de caixa; a luz da arma segue o preset ativo.
    const lightKey = `${this.lightingPreset.id}:${this.sim.horizon?.temporalState}`;
    if (lightKey !== this.presentationLightKey) {
      this.presentationLightKey = lightKey;
      this.presentationDaylight = m02LightingModel(this.sim.horizon?.temporalState ?? 'T0', this.lightingPreset).daylight ?? 1;
    }
    this.presentation.weaponLighting.sync({
      sky: this.hemiLight,
      sun: this.sunLight,
      camera: this.camera,
      daylight: this.presentationDaylight,
      pitch: player.pitch,
    });
    this.viewModel.visible = !this.presentation.updateWeapon(this.sim, this.qualityProfile.id);

    this.renderer.render(this.scene, this.camera);
    this.presentation.renderWeapon(this.renderer);

    const renderMs = performance.now() - renderStart;
    const frameTimeMs = dt * 1000;
    this.lastFrameMetrics = {
      frameTimeMs: Number(frameTimeMs.toFixed(2)),
      simMs: Number(simMs.toFixed(2)),
      renderMs: Number(renderMs.toFixed(2)),
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
    };
    this.telemetryWindow.push(this.lastFrameMetrics);
    if (this.telemetryWindow.length > 240) this.telemetryWindow.shift();

    return this.lastFrameMetrics;
  }

  /** Libertar recursos GPU (ambiente M02 e renderer). Chamar ao sair da bancada. */
  dispose() {
    this.environment?.dispose();
    this.renderer.dispose();
  }

  getEnvironmentStats() {
    return this.environment.stats;
  }

  getTelemetrySummary() {
    const frames = this.telemetryWindow.map((m) => m.frameTimeMs).sort((a, b) => a - b);
    const renders = this.telemetryWindow.map((m) => m.renderMs).sort((a, b) => a - b);
    const sims = this.telemetryWindow.map((m) => m.simMs).sort((a, b) => a - b);
    const p50 = percentile(frames, 50);
    const p95 = percentile(frames, 95);
    const p99 = percentile(frames, 99);
    return {
      qualityProfile: this.qualityProfile.id,
      lightingPreset: this.lightingPreset.id,
      sampleCount: this.telemetryWindow.length,
      fpsP50: p50 > 0 ? Number((1000 / p50).toFixed(1)) : 0,
      frameTimeMs: {
        p50: Number(p50.toFixed(2)),
        p95: Number(p95.toFixed(2)),
        p99: Number(p99.toFixed(2)),
      },
      simMsP50: Number(percentile(sims, 50).toFixed(2)),
      renderMsP50: Number(percentile(renders, 50).toFixed(2)),
      drawCalls: this.lastFrameMetrics.drawCalls,
      triangles: this.lastFrameMetrics.triangles,
      environment: this.environment.stats,
    };
  }
}
