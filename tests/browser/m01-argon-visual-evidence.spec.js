import { test, expect } from '@playwright/test';

// EVIDÊNCIA: browser real do jogo na branch do PR, não imagens geradas.
// Captura um vídeo curto (Playwright) e dois frames; nunca altera a simulação.
test.use({ video: 'on' });

test('COD-guerra M01 real: menu, soldados animados, câmera e pausa', async ({ page }, info) => {
  test.setTimeout(process.env.CI ? 180000 : 90000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('?debug=1');
  await page.waitForFunction(() => window.gameDiagnostics?.().m01?.models?.length === 9, null, { timeout: 60000 });
  await expect(page.locator('#error')).toBeHidden();
  await page.screenshot({ path: info.outputPath('m01-menu-real.png') });
  await page.locator('#start').click();
  await page.waitForFunction(() => !window.gameDiagnostics().paused && window.gameDiagnostics().clock > .2, null, { timeout: 60000 });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.gameDiagnostics()?.m01?.characters?.active > 0, null, { timeout: 60000 });
  // Registrar movimento no renderer real, não apenas imagens estáticas.
  await page.waitForTimeout(3000);
  const before = await page.evaluate(() => window.gameDiagnostics());
  await page.screenshot({ path: info.outputPath('m01-soldados-jogo-real.png') });
  // Usar o input de olhar real do jogo para captar uma segunda perspectiva.
  await page.evaluate(() => window.dispatchEvent(new MouseEvent('mousemove', {
    movementX: 130, movementY: 0, bubbles: true
  })));
  await page.waitForTimeout(2500);
  const after = await page.evaluate(() => window.gameDiagnostics());
  await page.screenshot({ path: info.outputPath('m01-soldados-segunda-vista.png') });
  await page.evaluate(() => document.exitPointerLock());
  await page.waitForFunction(() => window.gameDiagnostics().paused, null, { timeout: 30000 });
  const frozen = await page.evaluate(() => window.gameDiagnostics());
  await page.waitForTimeout(200);
  const still = await page.evaluate(() => window.gameDiagnostics());
  expect(still.clock).toBe(frozen.clock);
  const summary = {
    branch: 'argon/m01-animation-resolver-v1-v7-integration',
    source: 'Playwright Chromium/SwiftShader; execução real do jogo M01',
    snapshots: [
      { clock: before.clock, characters: before.m01.characters },
      { clock: after.clock, characters: after.m01.characters }
    ],
    errors
  };
  await info.attach('m01-animation-resolver-browser-diagnostics', {
    body: JSON.stringify(summary), contentType: 'application/json'
  });
  expect(before.m01.characters.active).toBeGreaterThan(0);
  expect(after.m01.characters.active).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
