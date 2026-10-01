// Renderiza as vistas de revisão dos GLB em PNG com Chromium (Playwright) e o mesmo GLTFLoader do three.js.
// Uso: npm run render [-- vista1 vista2 ...]
// Playwright não é dependência deste pacote: usa o do repositório (@playwright/test) ou um global
// (PLAYWRIGHT_MODULE_BASE=/caminho/para/package.json).
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..', '..');
const out = join(repo, 'docs', 'assets', 'm01-bridges');
const VIEWS = ['overview', 'west', 'towers', 'road_elevation', 'pier_detail', 'rail_elevation', 'extension_elevation', 'plan_measured', 'destroyed_west', 'destroyed_east', 'lisewo', 'lod1', 'lod2', 'destroyed_west_lod1', 'destroyed_west_lod2', 'destroyed_east_lod1', 'destroyed_east_lod2'];
const args = process.argv.slice(2), selected = args.filter(a => a !== '--verify');
const wanted = selected.length ? selected : args.includes('--verify') ? [] : VIEWS;
const layout = JSON.parse(await readFile(join(repo, 'missions/m01-tczew/map-layout.json'), 'utf8'));
const EAST = 'evt_m01_east_demolition', WEST = 'evt_m01_west_demolition';

let pw;
for (const base of [import.meta.url, join(repo, 'package.json'), process.env.PLAYWRIGHT_MODULE_BASE].filter(Boolean)) {
  for (const mod of ['playwright', '@playwright/test']) {
    try { pw = createRequire(base)(mod); break; } catch { /* tenta o próximo */ }
  }
  if (pw) break;
}
if (!pw) throw new Error('Playwright não encontrado: instale as devDependencies do repositório ou defina PLAYWRIGHT_MODULE_BASE.');

const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary' };
const server = createServer(async (req, res) => {
  try {
    if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
    if (path.startsWith('..')) throw new Error('fora do repositório');
    const body = await readFile(join(repo, path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(0, '127.0.0.1');
await new Promise(r => server.once('listening', r));
const port = server.address().port;

await mkdir(out, { recursive: true });
let browser;
const errors = [];
const url = `http://127.0.0.1:${port}/tools/assets/m01-bridges/render/viewer.html`;
const newPage = async viewport => {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', req => errors.push(`${req.url()}: ${req.failure()?.errorText}`));
  return page;
};
const waitReady = async page => {
  await page.waitForFunction(() => window.__done === true || window.__error, null, { timeout: 180000 });
  const failure = await page.evaluate(() => window.__error);
  if (failure) errors.push(failure);
  assert.deepEqual(errors, [], 'Erros no visualizador');
};
const sortedIds = (diagnostics, key) => diagnostics.parts.filter(p => key === 'hidden' ? !p.showAfterEvent && !p.visible : p.showAfterEvent && p.visible).map(p => p.id).sort();
const stateSignature = d => ({ hidden: sortedIds(d, 'hidden'), destroyed: sortedIds(d, 'destroyed'), colliders: d.colliderStates });
try {
  browser = await pw.chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const view of wanted) {
    const page = await newPage({ width: view === 'plan_measured' ? 1800 : 1600, height: view === 'plan_measured' ? 520 : 900 });
    await page.goto(`${url}?view=${view}`);
    await waitReady(page);
    await page.screenshot({ path: join(out, `${view}.png`) });
    console.log('ok', view);
    await page.close();
  }
  const page = await newPage({ width: 1600, height: 900 });
  await page.goto(`${url}?view=overview`);
  await waitReady(page);
  const review = { schemaVersion: 1, verifiedAt: new Date().toISOString(), browser: await browser.version(),
    rendering: 'Chromium WebGL / SwiftShader; revisão de assets, sem medição de desempenho em hardware real',
    gameplay: 'M01 PLANEJADA; não ligada à engine e não jogada', screenshots: wanted.map(v => `${v}.png`), states: [] };
  let expectedIds;
  for (const [state, events] of [['intact', []], ['east', [EAST]], ['west', [EAST, WEST]]]) {
    await page.selectOption('#review-state', state);
    let signature;
    for (const lod of [0, 1, 2, 0]) {
      await page.selectOption('#review-lod', String(lod));
      await page.waitForFunction(l => window.bridgeReview.diagnostics().lod === l, lod);
      const d = await page.evaluate(() => window.bridgeReview.diagnostics());
      assert.equal(d.invalidNormals, 0);
      assert.deepEqual(d.consumedEventIds, events);
      const ids = d.parts.map(p => p.id).sort();
      if (expectedIds) assert.deepEqual(ids, expectedIds); else expectedIds = ids;
      for (const p of d.parts) {
        const visible = p.showAfterEvent ? events.includes(p.showAfterEvent) : !events.includes(p.destroyedBy);
        assert.equal(p.visible, visible, `${state}/LOD${lod}: ${p.id}`);
      }
      for (const prefix of ['rail', 'road']) {
        assert.equal(d.colliderStates[`${prefix}_collider_deck_span_06`], !events.includes(EAST));
        assert.equal(d.colliderStates[`${prefix}_collider_deck_span_01`], !events.includes(WEST));
        const f = layout.features.find(f => f.id === `${prefix}_bridge`);
        const portal = layout.features.find(f => f.id === `portal_${prefix}_west`);
        assert.ok(Math.abs(d.portalBounds[`${prefix}_portal_west`].size[1] - portal.heightM) < 0.001);
        for (let i = 0; i < 10; i++) {
          const p = d.supportPositions[`${prefix}_support_${String(i).padStart(2, '0')}`];
          assert.ok(Math.abs(p[0] - f.supportsX[i]) < 0.001);
          assert.ok(Math.abs(p[2] - f.polyline[0][2]) < 0.001);
        }
      }
      if (state === 'intact') for (const bounds of Object.values(d.towerBounds)) assert.ok(Math.abs(bounds.size[1] - 23) < 0.001);
      const current = stateSignature(d);
      if (signature) assert.deepEqual(current, signature, `${state}: persistência ao trocar LOD`); else signature = current;
      if (lod !== 0 || !review.states.some(s => s.state === state && s.lod === lod)) review.states.push({ state, ...d });
    }
  }
  // Simula só a fronteira do save: persiste IDs em JSON e aplica-os a objectos acabados de importar.
  await page.evaluate(() => localStorage.setItem('m01-bridge-review-save', JSON.stringify({ consumedEventIds: window.bridgeReview.diagnostics().consumedEventIds })));
  const before = stateSignature(await page.evaluate(() => window.bridgeReview.diagnostics()));
  await page.reload();
  await waitReady(page);
  await page.evaluate(() => window.bridgeReview.setEvents(JSON.parse(localStorage.getItem('m01-bridge-review-save')).consumedEventIds));
  await page.selectOption('#review-lod', '2');
  await page.waitForFunction(() => window.bridgeReview.diagnostics().lod === 2);
  const restored = await page.evaluate(() => window.bridgeReview.diagnostics());
  assert.deepEqual(stateSignature(restored), before);
  assert.deepEqual(errors, []);
  review.saveRestoration = { format: 'JSON contendo apenas consumedEventIds', fromLod: 0, toLod: 2, passed: true };
  review.checks = { lodRoundTrips: 3, lodStateCombinations: 9, stableIds: true, worldSupportPlacement: true,
    separateTowerHeights: true, westPortalHeights: true, unitNormals: true, eventLinkedVisibility: true, removedDeckColliders: true, browserErrors: 0 };
  await writeFile(join(out, 'review-results.json'), JSON.stringify(review, null, 2) + '\n');
  console.log('ok browser verification: 9 state/LOD combinations, reload/JSON restoration, zero errors');
  await page.close();
} finally {
  await browser?.close();
  server.close();
}
