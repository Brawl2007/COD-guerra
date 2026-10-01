// Pré-visualização dos GLB provisórios das pontes. Uso: viewer.html?view=<nome>
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { applyBridgeState } from '../src/state.mjs';

window.addEventListener('error', e => { window.__error = String(e.message ?? e); });
window.addEventListener('unhandledrejection', e => { window.__error = String(e.reason?.message ?? e.reason); });

const params = new URLSearchParams(location.search);
const viewName = params.get('view') ?? 'overview';
const W = +(params.get('w') ?? 1600), H = +(params.get('h') ?? 900);
const BASE = '/assets/models/provisional/m01/';
const measured = await (await fetch('/missions/m01-tczew/measurements.json')).json();
const layout = await (await fetch('/missions/m01-tczew/map-layout.json')).json();
const rail = layout.features.find(f => f.id === 'rail_bridge'), road = layout.features.find(f => f.id === 'road_bridge');

const RAIL = 'bridge_rail_1891_1912', ROAD = 'bridge_road_lentze_1857_1912', LISEWO = 'portal_lisewo_1912';
const all = [RAIL, ROAD, LISEWO];
const STATUS = 'PROVISÓRIO · geometria para integração · detalhes e poses de destruição ainda INCERTOS';

const views = {
  overview: { cam: { pos: [-260, 115, 340], target: [520, -4, 20], fov: 34 }, files: all, caption: 'Visão geral — ponte ferroviária (norte) e rodoviária Lentze (sul), 9 vãos cada; à direita o portal comum de 1912 em Lisewo.' },
  west: { cam: { pos: [-80, 20, 118], target: [70, 4, 18], fov: 42 }, files: all, caption: 'Cabeça de ponte oeste — encontros, portais (forma INCERTA), vãos 1–2 e torres do 1.º pilar.' },
  towers: { cam: { pos: [150, 8, 95], target: [272, 8, 40], fov: 38 }, files: [ROAD, RAIL], caption: 'Ponte Lentze — vigas de treliça múltipla e par de torres neogóticas no 2.º pilar.' },
  road_elevation: {
    ortho: { center: [205, 9], width: 470, axis: 'south' }, files: [ROAD], caption: 'Alçado (de sul) — ponte rodoviária, vãos 1–3: cotas documentadas × modelo.',
    dims: () => [
      { a: [200, -0.9, 52], b: [200, 7.78, 52], text: '8,68 m — altura da viga (T04) · modelo 8,68', cls: '' },
      { a: [road.supportsX[1], 14, 52], b: [road.supportsX[2], 14, 52], text: `vão: 130,9 m documentado (T04) · ${(road.supportsX[2] - road.supportsX[1]).toFixed(1)} m entre pilares medidos (G01)`, cls: 'meas' },
      { a: [road.supportsX[2] + 9, -1.2, 52], b: [road.supportsX[2] + 9, 21.8, 52], text: '23 m — torre (T04)', cls: '' },
      { a: [road.supportsX[1] - 2.65, 24, 52], b: [road.supportsX[1] + 2.65, 24, 52], text: 'Ø 5,3 m (T04)', cls: '' },
      { a: [-4, 14, 52], b: [-4, 14.01, 52], text: 'portal oeste: forma INCERTA', cls: 'warn' },
    ],
  },
  pier_detail: {
    ortho: { center: [road.supportsX[2], 9], width: 70, axis: 'south' }, files: [ROAD], caption: 'Detalhe (de sul) — 2.º pilar da ponte Lentze com o par de torres: cotas documentadas × modelo.',
    dims: () => [
      { a: [road.supportsX[2] - 14, -0.9, 52], b: [road.supportsX[2] - 14, 7.78, 52], text: '8,68 m (T04)', cls: '' },
      { a: [road.supportsX[2] + 6, -1.2, 52], b: [road.supportsX[2] + 6, 21.8, 52], text: '23 m (T04)', cls: '' },
      { a: [road.supportsX[2] - 2.65, 23.5, 52], b: [road.supportsX[2] + 2.65, 23.5, 52], text: 'Ø 5,3 m (T04)', cls: '' },
      { a: [road.supportsX[2], -9, 52], b: [road.supportsX[2], -9.01, 52], text: 'fundação e talha-mar: forma INCERTA', cls: 'warn' },
    ],
  },
  rail_elevation: {
    ortho: { center: [205, 2], width: 470, axis: 'north' }, files: [RAIL], caption: 'Alçado (de norte) — ponte ferroviária, vãos lenticulares 1–3: tipo DOCUMENTED, proporções SUPOSTAS.',
    dims: () => [
      { a: [rail.supportsX[1], 14, -12], b: [rail.supportsX[2], 14, -12], text: `vão: 129 m documentado (T05) · ${(rail.supportsX[2] - rail.supportsX[1]).toFixed(1)} m entre pilares medidos (G01)`, cls: 'meas' },
      { a: [206, -1, -12], b: [206, 10, -12], text: 'flecha superior 11 m — SUPOSIÇÃO', cls: 'warn' },
      { a: [212, -1, -12], b: [212, -6, -12], text: 'flecha inferior 5 m — SUPOSIÇÃO', cls: 'warn' },
    ],
  },
  extension_elevation: {
    ortho: { center: [880, 3], width: 470, axis: 'north' }, files: [RAIL, LISEWO], caption: 'Alçado (de norte) — vãos 6–9: antigo encontro leste (pilar 6, alvo das 06:10) e extensão de 1910–1912.',
    dims: () => [
      { a: [rail.supportsX[6], 16, -12], b: [rail.supportsX[9], 16, -12], text: '3 × 81,6 m documentados (T25) · tipo de treliça INCERTO', cls: 'warn' },
      { a: [rail.supportsX[6], 22, -12], b: [rail.supportsX[6], 22.01, -12], text: 'pilar 6 = antigo encontro leste (P13)', cls: 'meas' },
      { a: [rail.supportsX[9] + 14, 22, -12], b: [rail.supportsX[9] + 14, 22.01, -12], text: 'portal comum de 1912: forma INCERTA', cls: 'warn' },
    ],
  },
  plan_measured: {
    ortho: { center: [540, 20], width: 1180, axis: 'top' }, files: all, w: 1800, h: 520,
    caption: 'Planta — modelo sobre os pilares medidos (G01, measurements.json). Traços vermelhos: eixos de pilar medidos; tracejado: eixo rodoviário medido (38,8 m).',
    marks: () => [
      ...measured.railBridge.supportsX.map(x => (rail.postwarSupportsX.includes(x)
        ? { p: [x, 12, -33], text: `${x.toFixed(0)}: pilar pós-guerra, não existia em 1939`, cls: 'warn', tick: [[x, 12, -14], [x, 12, 14]] }
        : { p: [x, 12, -16], text: x.toFixed(0), cls: 'meas', tick: [[x, 12, -14], [x, 12, 14]] })),
      ...measured.roadBridge.supportsX.map(x => ({ p: [x, 12, 70], text: x.toFixed(0), cls: 'meas', tick: [[x, 12, 26], [x, 12, 54]] })),
    ],
    lines: () => [[[-30, 12, measured.roadBridge.axisOffsetZ], [1100, 12, measured.roadBridge.axisOffsetZ]]],
  },
  destroyed_west: { cam: { pos: [-40, 26, 120], target: [120, -7, 18], fov: 44 }, files: all, state: 'evt_m01_west_demolition', caption: 'Estado provisório após 06:45 — ambas as demolições consumidas; encontro oeste, pilar 1 e vãos 1–2 caídos (pose PLACEHOLDER).' },
  destroyed_east: { cam: { pos: [700, 30, 150], target: [800, -4, 18], fov: 42 }, files: all, state: 'evt_m01_east_demolition', caption: 'Estado provisório após 06:10 — pilar 6 (antigo encontro leste) e antigo portal demolidos, vãos 6–7 caídos (PLACEHOLDER).' },
  lisewo: { cam: { pos: [1175, 22, 105], target: [1063, 5, 20], fov: 44 }, files: all, caption: 'Portal comum de 1912 em Lisewo com os portões fechados (04:45, T07) — existência DOCUMENTED, forma INCERTA.' },
  lod1: { cam: { pos: [-260, 115, 340], target: [520, -4, 20], fov: 34 }, files: all, lod1: true, caption: 'LOD1 (para > ~400 m): treliças simplificadas — ponte Lentze como chapa, como a treliça densa "imitava viga de alma cheia" (T04).' },
  lod2: { cam: { pos: [-260, 115, 340], target: [520, -4, 20], fov: 34 }, files: all, lod: 2, caption: 'LOD2: silhueta distante, com os mesmos IDs e estados de destruição.' },
};

const baseViewName = viewName.replace(/_lod[12]$/, '');
const view = views[baseViewName];
if (!view) throw new Error(`Vista desconhecida: ${viewName}`);
let activeLod = +(params.get('lod') ?? viewName.match(/_lod([12])$/)?.[1] ?? view.lod ?? (view.lod1 ? 1 : 0));
let activeEvents = view.state === 'evt_m01_west_demolition' ? ['evt_m01_east_demolition', view.state] : view.state ? [view.state] : [];
const width = view.w ?? W, height = view.h ?? H;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(width, height);
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb9c6cf);
scene.fog = view.ortho ? null : new THREE.Fog(0xb9c6cf, 900, 2600);
scene.add(new THREE.HemisphereLight(0xdfe8f0, 0x5c5446, 1.25));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
const sunDir = new THREE.Vector3(Math.sin(2.1) * Math.cos(0.7), Math.sin(0.7), -Math.cos(2.1) * Math.cos(0.7));
const target = view.cam?.target ?? [view.ortho.center[0], 0, 20];
sun.position.set(target[0] + sunDir.x * 800, sunDir.y * 800, target[2] + sunDir.z * 800);
sun.target.position.set(...target);
sun.castShadow = !view.ortho;
const sc = sun.shadow.camera; sc.left = -260; sc.right = 260; sc.top = 260; sc.bottom = -260; sc.near = 10; sc.far = 2000;
sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);

// Terreno de referência (alturas aproximadas de MEASUREMENTS.md): margem oeste, canal, planície e dique.
const plane = (x0, x1, y, color, rough = 1) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 2400), new THREE.MeshStandardMaterial({ color, roughness: rough }));
  m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, 20); m.receiveShadow = true; scene.add(m);
};
plane(-900, 15, -3, 0x6f7a4f);
plane(15, 275, -10, 0x3f6170, 0.25);
plane(275, 1060, -5, 0x7d8a58);
plane(1075, 1900, -2, 0x76804f);
// Taludes entre os planos (evita frestas): margem oeste, margem leste do canal e dique.
const bank = (x0, x1, yLow, yHigh, color) => {
  const g = new THREE.BufferGeometry();
  const zA = -1180, zB = 1220;
  g.setAttribute('position', new THREE.Float32BufferAttribute([x0, yHigh, zA, x1, yLow, zA, x1, yLow, zB, x0, yHigh, zA, x1, yLow, zB, x0, yHigh, zB], 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 1, side: THREE.DoubleSide }));
  m.receiveShadow = true; scene.add(m);
};
bank(15, 25, -10.5, -3, 0x6b6a50);
bank(275, 265, -10.5, -5, 0x6b6a50);
bank(1075, 1060, -5, -2, 0x707a4c);

const loader = new GLTFLoader();
const cache = new Map();
let models = [], colliders = [];
const loaded = async name => {
  if (!cache.has(name)) cache.set(name, loader.loadAsync(BASE + name).then(gltf => {
    gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return gltf.scene;
  }));
  return cache.get(name);
};
const setEvents = eventIds => {
  const allowed = new Set(['evt_m01_east_demolition', 'evt_m01_west_demolition']);
  if (!Array.isArray(eventIds) || eventIds.some(id => !allowed.has(id))) throw new Error('Eventos de revisão inválidos.');
  activeEvents = [...new Set(eventIds)];
  for (const model of [...models, ...colliders]) applyBridgeState(model, activeEvents);
  if (camera) renderer.render(scene, camera);
};
const switchLod = async lod => {
  if (![0, 1, 2].includes(lod)) throw new Error('LOD inválido.');
  const next = await Promise.all(view.files.map(file => loaded(`${file}${lod ? `.lod${lod}` : ''}.glb`)));
  for (const model of models) scene.remove(model);
  models = next; activeLod = lod;
  for (const model of models) { applyBridgeState(model, activeEvents); scene.add(model); }
  if (camera) renderer.render(scene, camera);
};

let camera;
colliders = await Promise.all(view.files.map(file => loaded(`${file}.colliders.glb`)));
setEvents(activeEvents);
await switchLod(activeLod);
if (view.ortho) {
  const { center, width: wm, axis } = view.ortho;
  const hm = wm * height / width;
  camera = new THREE.OrthographicCamera(-wm / 2, wm / 2, hm / 2, -hm / 2, 1, 5000);
  if (axis === 'south') { camera.position.set(center[0], center[1], 1500); camera.lookAt(center[0], center[1], 0); }
  if (axis === 'north') { camera.position.set(center[0], center[1], -1500); camera.lookAt(center[0], center[1], 0); }
  if (axis === 'top') { camera.position.set(center[0], 1500, center[1]); camera.up.set(0, 0, -1); camera.lookAt(center[0], 0, center[1]); }
} else {
  camera = new THREE.PerspectiveCamera(view.cam.fov, width / height, 1, 6000);
  camera.position.set(...view.cam.pos); camera.lookAt(...view.cam.target);
}
camera.updateMatrixWorld();

const labels = document.getElementById('labels');
const project = p => { const v = new THREE.Vector3(...p).project(camera); return [(v.x + 1) / 2 * width, (1 - v.y) / 2 * height]; };
const addLabel = (p, text, cls) => { const [x, y] = project(p); const d = document.createElement('div'); d.className = `lbl ${cls ?? ''}`; d.textContent = text; d.style.left = `${x}px`; d.style.top = `${y}px`; labels.append(d); };
const lineMat = c => new THREE.LineBasicMaterial({ color: c, depthTest: false });
const addLine = (pts, color = 0x111111, dashed = false) => {
  const g = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(...p)));
  const l = new THREE.Line(g, dashed ? new THREE.LineDashedMaterial({ color, dashSize: 8, gapSize: 6, depthTest: false }) : lineMat(color));
  if (dashed) l.computeLineDistances();
  l.renderOrder = 10; scene.add(l);
};
for (const d of view.dims?.() ?? []) {
  addLine([d.a, d.b], d.cls === 'meas' ? 0xc0392b : d.cls === 'warn' ? 0xb7791f : 0x111111);
  addLabel([(d.a[0] + d.b[0]) / 2, (d.a[1] + d.b[1]) / 2 + 0.8, (d.a[2] + d.b[2]) / 2], d.text, d.cls);
}
for (const m of view.marks?.() ?? []) { if (m.tick) addLine(m.tick, 0xd0021b); addLabel(m.p, m.text, m.cls); }
for (const l of view.lines?.() ?? []) addLine(l, 0x1f5fbf, true);

document.getElementById('caption').innerHTML = `<b>M01 · Tczew — ${viewName}</b><br>${view.caption}<br><span class="st">${STATUS}</span>`;
renderer.render(scene, camera);
const visibleBounds = object => {
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  object.traverseVisible(child => {
    if (!child.isMesh) return;
    child.geometry.computeBoundingBox();
    bounds.union(child.geometry.boundingBox.clone().applyMatrix4(child.matrixWorld));
  });
  return { min: bounds.min.toArray(), max: bounds.max.toArray(), size: bounds.getSize(new THREE.Vector3()).toArray() };
};
window.bridgeReview = {
  switchLod, setEvents,
  diagnostics() {
    const parts = [], bounds = {}, supportPositions = {}, towerBounds = {}, portalBounds = {}, colliderStates = {};
    let invalidNormals = 0;
    for (const model of models) {
      let root;
      model.traverse(o => { if (o.userData?.m01?.placement) root = o; });
      bounds[root.name] = visibleBounds(model);
      model.traverse(o => {
        const m = o.userData?.m01;
        if (m?.logicalId && (m.kind || m.showAfterEvent)) {
          parts.push({ id: m.logicalId, visible: o.visible, destroyedBy: m.destroyedBy, showAfterEvent: m.showAfterEvent });
          if (m.supportIndex !== undefined && m.kind !== 'tower' && !m.showAfterEvent) supportPositions[m.logicalId] = o.getWorldPosition(new THREE.Vector3()).toArray();
          if (m.kind === 'tower') towerBounds[m.logicalId] = visibleBounds(o);
          if (m.kind === 'portal' && !m.showAfterEvent) portalBounds[m.logicalId] = visibleBounds(o);
        }
        if (o.isMesh) {
          const normal = o.geometry.attributes.normal;
          if (!normal) { invalidNormals++; return; }
          for (let i = 0; i < normal.count; i++) {
            const n = Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i));
            if (!Number.isFinite(n) || Math.abs(n - 1) > 0.001) invalidNormals++;
          }
        }
      });
    }
    for (const model of colliders) model.traverse(o => {
      if (o.userData?.m01?.collider) colliderStates[o.userData.m01.logicalId ?? o.name] = o.userData.colliderEnabled;
    });
    return { lod: activeLod, consumedEventIds: [...activeEvents], parts, bounds, supportPositions, towerBounds, portalBounds, colliderStates, invalidNormals,
      renderStats: { ...renderer.info.render } };
  },
};
document.querySelector('#review-lod').value = String(activeLod);
document.querySelector('#review-lod').addEventListener('change', async e => { await switchLod(+e.target.value); });
document.querySelector('#review-state').value = activeEvents.length === 2 ? 'west' : activeEvents.length ? 'east' : 'intact';
document.querySelector('#review-state').addEventListener('change', e => setEvents(e.target.value === 'west'
  ? ['evt_m01_east_demolition', 'evt_m01_west_demolition'] : e.target.value === 'east' ? ['evt_m01_east_demolition'] : []));
window.__done = true;
