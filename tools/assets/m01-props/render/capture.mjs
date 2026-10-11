// Capturas de verificação do kit de props (Chromium + GLTFLoader do three.js): uma PNG por prop (LOD0 | LOD1 lado a lado)
// e uma folha geral. Saída: docs/assets/m01-props/captures/. Uso: node tools/assets/m01-props/render/capture.mjs [id ...]
// Chromium: variável CHROME_EXECUTABLE (p. ex. /opt/pw-browsers/chromium-1194/chrome-linux/chrome).
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';

const ROOT = new URL('../../../../', import.meta.url).pathname;
const OUT = join(ROOT, 'docs/assets/m01-props/captures');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary' };
const manifest = JSON.parse(await readFile(join(ROOT, 'assets/models/provisional/m01/props/manifest.json'), 'utf8'));
const only = process.argv.slice(2);
await mkdir(OUT, { recursive: true });

const server = http.createServer(async (req, res) => {
  const path = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!path.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  try { res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(await readFile(path)); }
  catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const exe = process.env.CHROME_EXECUTABLE ?? ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(existsSync);
const { chromium } = createRequire(join(ROOT, 'package.json'))('@playwright/test');
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://127.0.0.1:${server.address().port}/tools/assets/m01-props/render/viewer.html`);
await page.waitForFunction(() => window.ready === true);

const base = '/assets/models/provisional/m01/props/';
const VIEW = { telegraph_wire_span: { az: 14, el: -9, zoom: 1.7 }, telegraph_pole: { zoom: 1.0 } };
const cellOf = p => ({ zoom: p.size_m.y > 2.5 ? 1.15 : 1.5, ...VIEW[p.id], urls: [base + p.files.lod0.file, base + p.files.lod1.file], label: `${p.id}  LOD0 ${p.files.lod0.triangles} tris | LOD1 ${p.files.lod1.triangles} tris  (${p.size_m.x.toFixed(2)} × ${p.size_m.y.toFixed(2)} × ${p.size_m.z.toFixed(2)} m)` });
const props = manifest.props.filter(p => !only.length || only.includes(p.id));
for (const p of props) {
  await page.setViewportSize({ width: 960, height: 480 });
  await page.evaluate(([c]) => window.stage.render([c], 1, 960, 480), [cellOf(p)]);
  await page.screenshot({ path: join(OUT, `${p.id}.png`) });
  console.log(p.id);
}
if (!only.length) {
  const cols = 3, cw = 560, ch = 360, rows = Math.ceil(manifest.props.length / cols);
  await page.setViewportSize({ width: cols * cw, height: rows * ch });
  await page.evaluate(([cells, cols, cw, ch]) => window.stage.render(cells, cols, cw, ch), [manifest.props.map(p => ({ urls: [base + p.files.lod0.file], label: `${p.id} (${p.files.lod0.triangles} tris)` })), cols, cw, ch]);
  await page.screenshot({ path: join(OUT, 'overview.png') });
  console.log('overview');
}
if (errors.length) { console.error('Erros na página:\n' + errors.join('\n')); process.exitCode = 1; }
await browser.close(); server.close();
