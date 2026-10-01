// Renderiza as vistas de revisão dos GLB em PNG com Chromium (Playwright) e o mesmo GLTFLoader do three.js.
// Uso: npm run render [-- vista1 vista2 ...]
// Playwright não é dependência deste pacote: usa o do repositório (@playwright/test) ou um global
// (PLAYWRIGHT_MODULE_BASE=/caminho/para/node_modules/).
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..', '..');
const out = join(repo, 'docs', 'assets', 'm01-bridges');
const VIEWS = ['overview', 'west', 'towers', 'road_elevation', 'pier_detail', 'rail_elevation', 'extension_elevation', 'plan_measured', 'destroyed_west', 'destroyed_east', 'lisewo', 'lod1'];
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : VIEWS;

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
const browser = await pw.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  for (const view of wanted) {
    const page = await browser.newPage({ viewport: { width: view === 'plan_measured' ? 1800 : 1600, height: view === 'plan_measured' ? 520 : 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://127.0.0.1:${port}/tools/assets/m01-bridges/render/viewer.html?view=${view}`);
    await page.waitForFunction(() => window.__done === true || window.__error, null, { timeout: 180000 });
    const failure = await page.evaluate(() => window.__error);
    if (failure) errors.push(failure);
    if (errors.length) throw new Error(`${view}: ${errors.join(' | ')}`);
    await page.screenshot({ path: join(out, `${view}.png`) });
    console.log('ok', view);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
