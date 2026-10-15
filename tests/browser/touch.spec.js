import { test, expect } from '@playwright/test';

// iPhone 11 landscape (CSS px). Emulated Chromium only: real Safari needs a human playtest.
test.use({ viewport: { width: 896, height: 414 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

async function touchStart(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('?debug=1');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 60000 });
  await page.locator('#start').tap();
  await page.waitForFunction(() => window.gameDiagnostics().clock > .05);
  await expect(page.locator('#touch-controls')).toBeVisible();
  return errors;
}
const diag = page => page.evaluate(() => window.gameDiagnostics());
async function cdp(page) {
  const session = await page.context().newCDPSession(page);
  const send = (type, points) => session.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p, i) => ({ x: p.x, y: p.y, id: p.id ?? i })) });
  return { send };
}

test('touch plays M01 without pointer lock: walk, look, fire, reload, pause/resume', async ({ page }, info) => {
  test.setTimeout(process.env.CI ? 240000 : 120000);
  const errors = await touchStart(page);
  expect(await page.evaluate(() => document.pointerLockElement)).toBeNull();
  await page.screenshot({ path: info.outputPath('touch-controls.png') });
  // The cinematic scenes lock movement: the on-screen SKIP button must clear them.
  for (let i = 0; i < 6 && (await diag(page)).m01.scene; i++) { await page.locator('#tb-skip').tap(); await page.waitForTimeout(300); }
  expect((await diag(page)).m01.scene).toBeNull();
  const before = await diag(page);
  const t = await cdp(page);
  // Left thumb pushes the stick up (forward) while the right thumb drags to look: two simultaneous fingers.
  await t.send('touchStart', [{ x: 100, y: 330, id: 1 }, { x: 600, y: 150, id: 2 }]);
  for (let i = 1; i <= 8; i++) await t.send('touchMove', [{ x: 100, y: 330 - i * 8, id: 1 }, { x: 600 + i * 12, y: 150, id: 2 }]);
  await page.waitForFunction(b => { const d = window.gameDiagnostics(); return Math.hypot(d.player.x - b.player.x, d.player.z - b.player.z) > .3 && d.player.angle !== b.player.angle; }, before, { timeout: 30000 });
  await t.send('touchEnd', []);
  const afterMove = await diag(page);
  await page.waitForTimeout(400);
  const settled = await diag(page);
  expect(Math.hypot(settled.player.x - afterMove.player.x, settled.player.z - afterMove.player.z)).toBeLessThan(.6);
  await page.locator('#tb-fire').tap();
  await expect(page.locator('#mag')).toHaveText('4');
  await page.waitForFunction(() => window.gameDiagnostics().m01.weapon.state === 'READY');
  await page.locator('#tb-reload').tap();
  await expect(page.locator('#mag')).toHaveText('—');
  await page.locator('#tb-pause').tap();
  await expect(page.locator('#pause')).toBeVisible();
  await expect(page.locator('#touch-controls')).toBeHidden();
  const frozen = await diag(page); await page.waitForTimeout(300);
  expect((await diag(page)).clock).toBe(frozen.clock);
  await page.locator('#resume').tap();
  await expect(page.locator('#touch-controls')).toBeVisible();
  await page.waitForFunction(c => window.gameDiagnostics().clock > c, frozen.clock);
  await page.screenshot({ path: info.outputPath('touch-resumed.png') });
  expect(await page.evaluate(() => document.pointerLockElement)).toBeNull();
  expect(errors).toEqual([]);
});
