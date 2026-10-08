// Custo de carregamento do Ju 87: soma das tarefas longas (PerformanceObserver 'longtask') desde o início da página
// até 4 s depois de os três LOD do Ju 87 estarem carregados, no menu de M01, para uma qualidade escolhida.
// Com MODE=raid, guarda o snapshot genuíno do instante em que os Stukas ficam visíveis, carrega-o com Continuar e mede
// também as tarefas longas e o intervalo entre frames (requestAnimationFrame) nos 8 s seguintes, que incluem o primeiro
// frame com os aviões visíveis.
// MODE=cover e MODE=repair medem o mesmo depois de Continuar nos snapshots dos testes de navegador "adjustment salvo at the
// gates" e "German fire on the repair" (Ju 87 já invisíveis), e o relógio da missão que avançou nesses 8 s.
// Corre o build de produção servido em baseURL (vite preview). Chromium/SwiftShader: não é medição de Chromebook.
// Uso: CHROME_EXECUTABLE=… [MODE=raid|cover|repair] node tools/verification/m01-ju87-load-longtasks.mjs <baseURL> <rótulo> [qualidades] [repetições]
import { createRequire } from 'node:module';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const MODE = process.env.MODE ?? '', RAID = MODE === 'raid';
const SNAPSHOTS = {
  raid: r => { const d = r.driver(); d.step({ skip: true }); d.until(() => d.sim.renderState.stukas, 200); return d.sim.snapshot(); },
  cover: r => r.toCoverAdjustment({ truss: false }).sim.snapshot(),
  repair: (r, seconds) => { const d = r.toRepair(r.driver()); d.walk(-134, 13); d.until(() => d.sim.battleClock >= seconds('04:45:40'), 120); return d.sim.snapshot(); },
};
if (MODE && !SNAPSHOTS[MODE]) throw new Error(`MODE desconhecido: ${MODE}`);
let snapshot = null;
if (MODE) snapshot = SNAPSHOTS[MODE](await import('../../tests/helpers/m01-route.js'), (await import('../../src/game/m01-simulation.js')).seconds);
const [base, label, qualities = 'low,high', reps = '2'] = process.argv.slice(2);
const { chromium } = createRequire(join(ROOT, 'package.json'))('@playwright/test');
const browser = await chromium.launch({ ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const out = [];
for (const quality of qualities.split(',')) for (let r = 0; r < Number(reps); r++) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(([q, snap]) => {
    localStorage.setItem('cod-guerra:visual-quality', q);
    if (snap) localStorage.setItem('cod-guerra:checkpoint:m01:v2', JSON.stringify(snap));
    window.__longtasks = []; window.__frames = [];
    const tick = t => { window.__frames.push(t); requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    new PerformanceObserver(list => { for (const e of list.getEntries()) window.__longtasks.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true });
  }, [quality, snapshot]);
  await page.goto(base + '?debug=1');
  await page.waitForFunction(() => window.gameDiagnostics?.().m01?.models.length === 9, null, { timeout: 300000 });
  await page.waitForFunction(() => window.gameDiagnostics().m01.aircraft.loaded.length === 3, null, { timeout: 300000 });
  const loadedAt = await page.evaluate(() => performance.now());
  await page.waitForTimeout(4000);
  const tasks = await page.evaluate(() => window.__longtasks);
  const total = tasks.reduce((s, [, d]) => s + d, 0), max = tasks.reduce((m, [, d]) => Math.max(m, d), 0);
  const afterLoad = tasks.filter(([t]) => t >= loadedAt - 50).reduce((s, [, d]) => s + d, 0);
  const row = { label, quality, rep: r, longtasks: tasks.length, total_ms: Math.round(total), max_ms: Math.round(max), after_aircraft_loaded_ms: Math.round(afterLoad), aircraft_loaded_at_ms: Math.round(loadedAt) };
  if (snapshot) {
    const clickAt = await page.evaluate(() => performance.now());
    await page.locator('#continue').click();
    if (RAID) await page.waitForFunction(() => !window.gameDiagnostics().paused && window.gameDiagnostics().m01.aircraft.planes.every(p => p.visible), null, { timeout: 120000 });
    else await page.waitForFunction(() => !window.gameDiagnostics().paused && window.gameDiagnostics().clock > .05 && document.pointerLockElement?.id === 'game', null, { timeout: 120000 });
    const clock0 = await page.evaluate(() => window.gameDiagnostics().clock);
    await page.waitForTimeout(8000);
    const end = await page.evaluate(() => { const g = window.gameDiagnostics(); return { clock: g.clock, ju87Visible: g.m01.aircraft.planes.some(p => p.visible) }; });
    const raid = (await page.evaluate(() => window.__longtasks)).filter(([t, d]) => t + d >= clickAt);
    const frames = (await page.evaluate(() => window.__frames)).filter(t => t >= clickAt), gaps = frames.slice(1).map((t, k) => t - frames[k]).sort((a, b) => a - b);
    Object.assign(row, { raid_longtasks: raid.length, raid_total_ms: Math.round(raid.reduce((s, [, d]) => s + d, 0)), raid_max_ms: Math.round(raid.reduce((m, [, d]) => Math.max(m, d), 0)),
      raid_frames: frames.length, raid_frame_median_ms: Math.round(gaps[gaps.length >> 1] ?? 0), raid_frame_max_ms: Math.round(gaps.at(-1) ?? 0) });
    if (!RAID) Object.assign(row, { mode: MODE, clock_advance_s: +(end.clock - clock0).toFixed(2), ju87_visible: end.ju87Visible });
  }
  out.push(row);
  console.log(JSON.stringify(out.at(-1)));
  await page.close();
}
await browser.close();
