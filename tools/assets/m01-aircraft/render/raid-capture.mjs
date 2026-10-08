// Capturas do primeiro raid no jogo de produção (vite preview): checkpoint genuíno da simulação no momento em que
// os Stukas ficam visíveis, input relativo do rato para olhar para cada avião e pausa por pointer lock.
// Não é playtest humano nem medição de FPS. Uso (com `npm run build && npm run preview` a correr):
//   CHROME_EXECUTABLE=… node tools/assets/m01-aircraft/render/raid-capture.mjs [baseURL] [saída] [qualidades]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { PNG } from 'pngjs';
import { driver } from '../../../../tests/helpers/m01-route.js';

const ROOT = new URL('../../../../', import.meta.url).pathname;
const [base = 'http://127.0.0.1:4173/COD-guerra/', out = join(ROOT, 'docs/verification/m01-runtime/ju87-aircraft-closeout-2026-10-08/captures'), qualities = 'low,medium,high'] = process.argv.slice(2);
const KEY = 'cod-guerra:checkpoint:m01:v2';
mkdirSync(out, { recursive: true });
const d = driver(); d.step({ skip: true }); d.until(() => d.sim.renderState.stukas, 200);
const snapshot = d.sim.snapshot();
const { chromium } = createRequire(join(ROOT, 'package.json'))('@playwright/test');
const browser = await chromium.launch({ ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const report = { base, snapshotClock: snapshot.clock, battleClock: snapshot.battleClock, shots: [] };
for (const quality of qualities.split(',')) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(({ KEY, snapshot, quality }) => { localStorage.setItem(KEY, JSON.stringify(snapshot)); localStorage.setItem('cod-guerra:visual-quality', quality); }, { KEY, snapshot, quality });
  await page.goto(base + '?debug=1');
  await page.waitForFunction(() => window.gameDiagnostics?.().m01?.models.length === 9, null, { timeout: 120000 });
  await page.locator('#continue').click();
  await page.waitForFunction(() => !window.gameDiagnostics().paused && document.pointerLockElement?.id === 'game');
  await page.waitForFunction(() => window.gameDiagnostics().m01.aircraft.loaded.length === 3, null, { timeout: 120000 });
  // Deixa passar a entrada (3 s de relógio do jogo) antes de olhar; CAPTURE_DELAY espera mais (outro ângulo do passe).
  const t0 = (await page.evaluate(() => window.gameDiagnostics())).clock, wait = Number(process.env.CAPTURE_DELAY ?? 4);
  await page.waitForFunction(([t, w]) => window.gameDiagnostics().clock > t + w, [t0, wait], { timeout: 600000 });
  for (const plane of [0]) {
    const before = await page.evaluate(() => window.gameDiagnostics()), target = before.m01.aircraft.planes[plane].position;
    const dx = target[0] - before.player.x, dz = target[2] - before.player.z, angle = Math.atan2(dz, dx), pitch = Math.atan2(target[1] - before.player.y - 1.6, Math.hypot(dx, dz));
    await page.evaluate(({ x, y }) => {
      document.dispatchEvent(new MouseEvent('mousemove', { movementX: 0, movementY: 0, bubbles: true }));
      document.dispatchEvent(new MouseEvent('mousemove', { movementX: x, movementY: y, bubbles: true }));
    },
      { x: Math.atan2(Math.sin(angle - before.player.angle), Math.cos(angle - before.player.angle)) / .0022, y: (before.player.pitch - pitch) / .0022 });
    await page.waitForFunction(() => window.gameDiagnostics().player.pitch > .2);
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => document.exitPointerLock()); await page.locator('#pause').waitFor();
  const diag = await page.evaluate(() => window.gameDiagnostics());
  const tag = process.env.CAPTURE_DELAY ? `-t${process.env.CAPTURE_DELAY}` : '', file = `raid-${quality}${tag}.png`, buf = await page.screenshot({ path: join(out, file), style: '#pause { visibility:hidden !important; }' });
  // Recorte 1:1 de 320×180 centrado no avião visado (centróide dos píxeis escuros no céu à volta do centro),
  // ampliado ×3 por vizinho mais próximo; os píxeis não são retocados.
  const src = PNG.sync.read(buf), crop = new PNG({ width: 960, height: 540 }), lum = k => 0.3 * src.data[k] + 0.59 * src.data[k + 1] + 0.11 * src.data[k + 2];
  let sx = 0, sy = 0, n = 0;
  for (let y = 200; y < 460; y++) for (let x = 480; x < 800; x++) if (lum((y * src.width + x) * 4) < 70) { sx += x; sy += y; n++; }
  const cx = Math.round(Math.min(1120, Math.max(160, n ? sx / n : 640))), cy = Math.round(Math.min(630, Math.max(90, n ? sy / n : 360)));
  for (let y = 0; y < 540; y++) for (let x = 0; x < 960; x++) { const s = ((cy - 90 + Math.floor(y / 3)) * src.width + cx - 160 + Math.floor(x / 3)) * 4; crop.data.set(src.data.subarray(s, s + 4), (y * 960 + x) * 4); }
  writeFileSync(join(out, `raid-${quality}${tag}-crop3x.png`), PNG.sync.write(crop));
  report.shots.push({ quality, file, crop: `raid-${quality}${tag}-crop3x.png`, cropCentre: [cx, cy], render: { quality: diag.quality, drawCalls: diag.drawCalls, triangles: diag.triangles, geometries: diag.geometries, textures: diag.textures }, clock: diag.clock, battleClock: diag.m01.battleClock, player: diag.player, aircraft: diag.m01.aircraft, errors });
  await page.close();
}
writeFileSync(join(out, `raid-capture${process.env.CAPTURE_DELAY ? `-t${process.env.CAPTURE_DELAY}` : ''}.json`), JSON.stringify(report, null, 2) + '\n');
console.log(report.shots.map(s => `${s.quality}: lod ${s.aircraft.planes.map(p => p.lod)} fade ${s.aircraft.planes.map(p => p.fade?.toFixed?.(2))} calls ${s.render.drawCalls} tris ${s.render.triangles} textures ${s.render.textures} errors ${s.errors.length}`).join('\n'));
await browser.close();
