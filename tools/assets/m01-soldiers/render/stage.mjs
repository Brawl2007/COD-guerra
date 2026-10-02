// Servidor estático mínimo + Chromium (Playwright) para abrir render/viewer.html sobre a raiz do repositório.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = new URL('../../../../', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg' };

export async function openStage({ width = 1280, height = 720 } = {}) {
  const server = http.createServer(async (req, res) => {
    const path = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!path.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    try { const body = await readFile(path); res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(body); }
    catch { res.writeHead(404).end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const { chromium } = createRequire(join(ROOT, 'package.json'))('@playwright/test');
  const browser = await chromium.launch({
    ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}),
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/tools/assets/m01-soldiers/render/viewer.html`);
  await page.waitForFunction(() => window.ready === true);
  return {
    page, errors,
    eval: (fn, arg) => page.evaluate(fn, arg),
    async shot(path, clip) { await page.evaluate(() => window.stage.render()); await page.screenshot({ path, ...(clip ? { clip } : {}) }); },
    async close() { await browser.close(); server.close(); },
  };
}
