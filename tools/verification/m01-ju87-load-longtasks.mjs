// Custo de carregamento do Ju 87: soma das tarefas longas (PerformanceObserver 'longtask') desde o início da página
// até 4 s depois de os três LOD do Ju 87 estarem carregados, no menu de M01, para uma qualidade escolhida.
// Corre o build de produção servido em baseURL (vite preview). Chromium/SwiftShader: não é medição de Chromebook.
// Uso: CHROME_EXECUTABLE=… node tools/verification/m01-ju87-load-longtasks.mjs <baseURL> <rótulo> [qualidades] [repetições]
import { createRequire } from 'node:module';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const [base, label, qualities = 'low,high', reps = '2'] = process.argv.slice(2);
const { chromium } = createRequire(join(ROOT, 'package.json'))('@playwright/test');
const browser = await chromium.launch({ ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const out = [];
for (const quality of qualities.split(',')) for (let r = 0; r < Number(reps); r++) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(q => {
    localStorage.setItem('cod-guerra:visual-quality', q);
    window.__longtasks = [];
    new PerformanceObserver(list => { for (const e of list.getEntries()) window.__longtasks.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true });
  }, quality);
  await page.goto(base + '?debug=1');
  await page.waitForFunction(() => window.gameDiagnostics?.().m01?.models.length === 9, null, { timeout: 300000 });
  await page.waitForFunction(() => window.gameDiagnostics().m01.aircraft.loaded.length === 3, null, { timeout: 300000 });
  const loadedAt = await page.evaluate(() => performance.now());
  await page.waitForTimeout(4000);
  const tasks = await page.evaluate(() => window.__longtasks);
  const total = tasks.reduce((s, [, d]) => s + d, 0), max = tasks.reduce((m, [, d]) => Math.max(m, d), 0);
  const afterLoad = tasks.filter(([t]) => t >= loadedAt - 50).reduce((s, [, d]) => s + d, 0);
  out.push({ label, quality, rep: r, longtasks: tasks.length, total_ms: Math.round(total), max_ms: Math.round(max), after_aircraft_loaded_ms: Math.round(afterLoad), aircraft_loaded_at_ms: Math.round(loadedAt) });
  console.log(JSON.stringify(out.at(-1)));
  await page.close();
}
await browser.close();
