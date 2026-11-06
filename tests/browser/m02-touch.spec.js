// M02 bancada por toque (iPhone/Safari): HUD compacto, joystick, olhar por arrasto, botões, F5/F9, menu «☰ Bancada», retrato.
// Corre em Chromium com emulação de dispositivo iPhone 13 (hasTouch, isMobile): prova a ligação toque -> controlos -> simulação,
// NÃO prova o comportamento do Safari/iOS real (WebAudio, barra de endereços, gestos do sistema). Não é playtest.
import { test, expect, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SHOT_DIR = process.env.M02_TOUCH_SHOTS || path.join(repoRoot, 'test-results', 'm02-touch');
const SAVE_KEY = 'cod-guerra:m02:bench:v2';

// O descritor traz defaultBrowserType 'webkit'; aqui só há Chromium (não se instala nada).
const { defaultBrowserType: _l, ...LANDSCAPE } = devices['iPhone 13 landscape'];
const { defaultBrowserType: _p, ...PORTRAIT } = devices['iPhone 13'];

async function boot(page, errors) {
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/COD-guerra/m02-01.html?quality=low', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.m02Bench && window.m02Bench.getTelemetrySummary().sampleCount >= 5));
}

/** Fração do ecrã coberta por HUD/botões visíveis (união de retângulos, amostragem de 4 px). */
async function hudCoverage(page) {
  return page.evaluate(() => {
    const sel = [
      '.t-btn:not([hidden])', '.t-chip', '.t-objective', '.hud-layer .panel', '#dialogue-banner', '#subtitle-banner .sub-line',
      '#door-prompt', '.t-toast:not([hidden])', '.t-rotate', '#mission-failed:not([hidden])', '#hud-save-warning:not([hidden])', '#cartela-banner',
    ].join(',');
    const rects = [];
    for (const el of document.querySelectorAll(sel)) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) rects.push(r);
    }
    const W = window.innerWidth;
    const H = window.innerHeight;
    let covered = 0;
    let total = 0;
    for (let y = 2; y < H; y += 4) {
      for (let x = 2; x < W; x += 4) {
        total++;
        if (rects.some((r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)) covered++;
      }
    }
    return { covered: covered / total, rects: rects.length, W, H };
  });
}

const state = (page) =>
  page.evaluate(() => {
    const s = window.m02Bench.sim;
    return { x: s.player.x, z: s.player.z, angle: s.player.angle, pitch: s.player.pitch, sprinting: s.player.sprinting, clock: s.clock, shots: s.shotLog.length, mag: s.weapon.mag, reloading: s.weapon.reloading, crouched: s.player.crouched, aiming: s.player.aiming };
  });
const waitSimSeconds = async (page, sec) => {
  const t0 = (await state(page)).clock;
  await page.waitForFunction((t) => window.m02Bench.sim.clock > t, t0 + sec, { timeout: 60000 });
};

function touchApi(cdp) {
  const send = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p) => ({ x: p.x, y: p.y, id: p.id })) });
  return { start: (pts) => send('touchStart', pts), move: (pts) => send('touchMove', pts), end: () => send('touchEnd', []) };
}

async function checkButtonsAreBigEnough(page) {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('.t-btn:not([hidden])')]
      .map((b) => ({ id: b.id, ...b.getBoundingClientRect().toJSON() }))
      .filter((r) => r.width < 44 || r.height < 44)
      .map((r) => `${r.id} ${r.width}x${r.height}`),
  );
  expect(small, `alvos < 44 px: ${small.join(', ')}`).toEqual([]);
}

test.describe('M02 bancada por toque · iPhone 13 em paisagem', () => {
  test.use({ ...LANDSCAPE });

  test('HUD compacto, joystick, olhar, multitoque, disparar, [E], F5/F9 e menu da bancada', async ({ page }) => {
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    const errors = [];
    await boot(page, errors);
    const cdp = await page.context().newCDPSession(page);
    const touch = touchApi(cdp);

    // 1. modo toque e HUD compacto
    expect(await page.evaluate(() => window.m02Bench.touchMode)).toBe(true);
    expect(await page.evaluate(() => document.body.classList.contains('touch'))).toBe(true);
    expect(await page.locator('meta[name=viewport]').getAttribute('content')).toMatch(/maximum-scale=1.*user-scalable=no/);
    await expect(page.locator('#hud-tactical')).toBeHidden();
    await expect(page.locator('.telemetry-panel')).toBeHidden();
    await expect(page.locator('.mission-header h1')).toBeHidden();
    await expect(page.locator('#btn-start-c01')).toBeHidden();
    await expect(page.locator('#t-health')).toBeVisible();
    await expect(page.locator('#t-ammo')).toContainText('5 / 45');
    await expect(page.locator('#t-objective')).not.toBeEmpty();
    await expect(page.locator('#t-btn-interact')).toBeHidden(); // sem prompt
    await expect(page.locator('#t-rotate')).toBeHidden(); // paisagem
    const cov = await hudCoverage(page);
    console.log(`[m02-touch] paisagem ${cov.W}x${cov.H}: HUD+botões cobrem ${(cov.covered * 100).toFixed(1)} % (${cov.rects} retângulos)`);
    expect(cov.covered).toBeLessThan(0.3); // canvas >= 70 % visível
    await checkButtonsAreBigEnough(page);
    await page.screenshot({ path: path.join(SHOT_DIR, 'landscape-01-hud-compacto.png') });

    // 2. joystick: empurrar para a frente move o Piotr; empurrar até ao fim corre; largar pára
    // Merge M02 único: `sprinting` só fica ativo com deslocação real (Codex dd8358bf: correr encostado a um obstáculo não é correr).
    // Do início da bancada (0, −80) o parapeito de partida (z −78,6) parava o Piotr antes do fim do curso; a prova passa para campo
    // aberto na aproximação norte, virado a sul, com mais de 20 m livres à frente.
    await page.evaluate(() => window.m02Bench.sim.teleportPlayer(0, -100, Math.PI / 2, 0));
    await waitSimSeconds(page, 0.2);
    const before = await state(page);
    await touch.start([{ x: 140, y: 270, id: 1 }]);
    await touch.move([{ x: 140, y: 240, id: 1 }]);
    await waitSimSeconds(page, 0.6);
    const walking = await state(page);
    expect(Math.hypot(walking.x - before.x, walking.z - before.z)).toBeGreaterThan(0.3);
    expect(walking.sprinting).toBe(false); // meio curso = andar
    await touch.move([{ x: 140, y: 212, id: 1 }]); // até ao fim (58 px) = correr
    await waitSimSeconds(page, 0.5);
    const running = await state(page);
    expect(Math.hypot(running.x - walking.x, running.z - walking.z)).toBeGreaterThan(0.3); // continua a andar de verdade
    expect(running.sprinting).toBe(true);
    await page.screenshot({ path: path.join(SHOT_DIR, 'landscape-02-joystick-correr.png') });
    await touch.end();
    await waitSimSeconds(page, 0.3);
    const stopped1 = await state(page);
    await waitSimSeconds(page, 0.5);
    const stopped2 = await state(page);
    expect(Math.hypot(stopped2.x - stopped1.x, stopped2.z - stopped1.z)).toBeLessThan(0.01);
    expect(stopped2.sprinting).toBe(false);

    // 3. arrastar no lado direito roda a câmara (yaw e pitch)
    const camBefore = await state(page);
    await touch.start([{ x: 480, y: 200, id: 2 }]);
    for (let i = 1; i <= 5; i++) await touch.move([{ x: 480 + i * 20, y: 200 - i * 6, id: 2 }]);
    await waitSimSeconds(page, 0.2);
    await touch.end();
    const camAfter = await state(page);
    expect(camAfter.angle - camBefore.angle).toBeGreaterThan(0.3); // ~100 px x 0.0046
    expect(camAfter.pitch).not.toBeCloseTo(camBefore.pitch, 2);

    // 4. multitoque: joystick e olhar em simultâneo
    const mt0 = await state(page);
    await touch.start([{ x: 140, y: 270, id: 1 }, { x: 480, y: 200, id: 2 }]);
    await touch.move([{ x: 140, y: 230, id: 1 }, { x: 480, y: 200, id: 2 }]);
    for (let i = 1; i <= 4; i++) await touch.move([{ x: 140, y: 230, id: 1 }, { x: 480 - i * 20, y: 200, id: 2 }]);
    await waitSimSeconds(page, 0.5);
    await touch.end();
    const mt1 = await state(page);
    expect(Math.hypot(mt1.x - mt0.x, mt1.z - mt0.z)).toBeGreaterThan(0.2);
    expect(mt0.angle - mt1.angle).toBeGreaterThan(0.2); // arrastar para a esquerda = rodar para o outro lado

    // 5. Disparar aumenta shotLog; Recarregar; Agachar; Mirar
    const f0 = await state(page);
    await page.locator('#t-btn-fire').tap();
    await page.waitForFunction((n) => window.m02Bench.sim.shotLog.length > n, f0.shots);
    const f1 = await state(page);
    expect(f1.shots).toBe(f0.shots + 1);
    expect(f1.mag).toBe(f0.mag - 1);
    // a arma é de ferrolho: só recarrega depois de rearmar (regra da simulação, não do toque)
    await page.waitForFunction(() => window.m02Bench.sim.weapon.state === 'READY', null, { timeout: 60000 });
    await page.locator('#t-btn-reload').tap();
    await page.waitForFunction(() => window.m02Bench.sim.weapon.reloading || window.m02Bench.sim.weapon.mag === 5);
    await page.locator('#t-btn-crouch').tap();
    await page.waitForFunction(() => window.m02Bench.sim.player.crouched === true);
    await page.locator('#t-btn-crouch').tap();
    await page.waitForFunction(() => window.m02Bench.sim.player.crouched === false);
    await page.locator('#t-btn-aim').tap();
    await page.waitForFunction(() => window.m02Bench.sim.player.aiming === true);
    await page.locator('#t-btn-aim').tap();
    await page.waitForFunction(() => window.m02Bench.sim.player.aiming === false);
    await page.locator('#t-btn-grenade').tap();
    await page.waitForFunction(() => window.m02Bench.sim.grenadeAmmo < 2);

    // 6. [E] só aparece com prompt e executa a interação da simulação
    await page.evaluate(() => window.m02Bench.teleportPlayer(-24.2, -15.5, Math.PI, 0));
    await expect(page.locator('#t-btn-interact')).toBeVisible();
    await checkButtonsAreBigEnough(page);
    await page.screenshot({ path: path.join(SHOT_DIR, 'landscape-03-interagir.png') });
    const door0 = await page.evaluate(() => window.m02Bench.sim.world.getDoorState('door_b01_east_main'));
    await page.locator('#t-btn-interact').tap();
    await page.waitForFunction((d) => window.m02Bench.sim.world.getDoorState('door_b01_east_main') !== d, door0);
    await page.evaluate(() => window.m02Bench.teleportToPanorama('SN1'));
    await expect(page.locator('#t-btn-interact')).toBeHidden();

    // 7. Ordens à secção por toque
    await page.locator('#t-btn-cover').tap();
    await page.waitForFunction(() => window.m02Bench.sim.lastOrderFeedback !== null && window.m02Bench.sim.lastOrderFeedback !== undefined);

    // 8. Gravar (F5) e Carregar (F9) por toque
    await page.evaluate(() => window.m02Bench.teleportPlayer(-12, -60, 1.1, 0));
    await waitSimSeconds(page, 0.2);
    await page.locator('#t-btn-save').tap();
    await expect(page.locator('#t-toast')).toContainText('gravado');
    const saved = await page.evaluate((k) => window.localStorage.getItem(k), SAVE_KEY);
    expect(saved).toBeTruthy();
    expect(await page.evaluate(() => window.m02Bench.sim.lastCheckpointPersist?.ok)).toBe(true);
    await page.evaluate(() => window.m02Bench.teleportPlayer(30, 40, 0.2, 0));
    await page.locator('#t-btn-load').tap();
    await expect(page.locator('#t-toast')).toContainText('carregado');
    await page.waitForFunction(() => Math.abs(window.m02Bench.sim.player.x + 12) < 1 && Math.abs(window.m02Bench.sim.player.z + 60) < 1);

    // 9. Primeiro toque desbloqueou o áudio (contexto criado e retomado; no iOS real isto só se prova no aparelho)
    const audio = await page.evaluate(() => window.m02Bench.getAudioSummary());
    expect(audio.available).toBe(true);
    expect(audio.state).not.toBe('none');

    // 10. Menu «☰ Bancada»: atalhos, «0: P1 C01», telemetria e painel tático ficam atrás do botão
    await page.locator('#t-menu').tap();
    await expect(page.locator('#btn-start-c01')).toBeVisible();
    await expect(page.locator('#hud-tactical')).toBeVisible();
    await expect(page.locator('.telemetry-panel')).toBeVisible();
    const startBox = await page.locator('#btn-start-c01').boundingBox();
    expect(startBox.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: path.join(SHOT_DIR, 'landscape-04-menu-bancada.png') });
    await page.locator('#btn-start-c01').tap();
    await page.waitForFunction(() => window.m02Bench.sim.player.z < -150);
    await page.locator('#t-menu').tap();
    await expect(page.locator('#btn-start-c01')).toBeHidden();
    await expect(page.locator('#t-btn-fire')).toBeVisible();
    await page.screenshot({ path: path.join(SHOT_DIR, 'landscape-05-depois-do-menu.png') });

    expect(errors).toEqual([]);
  });

  test('painel de falha cabe no ecrã e o reinício é tocável', async ({ page }) => {
    const errors = [];
    await boot(page, errors);
    await page.evaluate(() => {
      window.m02Bench.sim.player.health = 0;
      window.m02Bench.sim.player.alive = false;
    });
    await expect(page.locator('#mission-failed')).toBeVisible();
    const box = await page.locator('#btn-restart-checkpoint').boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    const vp = page.viewportSize();
    const panel = await page.locator('#mission-failed').boundingBox();
    expect(panel.y).toBeGreaterThanOrEqual(0);
    expect(panel.y + panel.height).toBeLessThanOrEqual(vp.height);
    await page.screenshot({ path: path.join(SHOT_DIR, 'landscape-06-falha.png') });
    expect(errors).toEqual([]);
  });
});

test.describe('M02 bancada por toque · iPhone 13 em retrato', () => {
  test.use({ ...PORTRAIT });

  test('mostra «Roda o telemóvel para paisagem» mas continua utilizável', async ({ page }) => {
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    const errors = [];
    await boot(page, errors);
    const cdp = await page.context().newCDPSession(page);
    const touch = touchApi(cdp);
    const vp = page.viewportSize();
    expect(vp.height).toBeGreaterThan(vp.width);

    await expect(page.locator('#t-rotate')).toBeVisible();
    await expect(page.locator('#t-rotate')).toHaveText('Roda o telemóvel para paisagem');
    await expect(page.locator('#hud-tactical')).toBeHidden();
    const cov = await hudCoverage(page);
    console.log(`[m02-touch] retrato ${cov.W}x${cov.H}: HUD+botões cobrem ${(cov.covered * 100).toFixed(1)} %`);
    expect(cov.covered).toBeLessThan(0.3);
    await checkButtonsAreBigEnough(page);
    // todos os botões dentro do ecrã
    const outside = await page.evaluate(() =>
      [...document.querySelectorAll('.t-btn:not([hidden])')]
        .map((b) => ({ id: b.id, ...b.getBoundingClientRect().toJSON() }))
        .filter((r) => r.left < 0 || r.top < 0 || r.right > window.innerWidth || r.bottom > window.innerHeight)
        .map((r) => r.id),
    );
    expect(outside).toEqual([]);
    await page.screenshot({ path: path.join(SHOT_DIR, 'portrait-01-hud-compacto.png') });

    // utilizável: joystick (zona esquerda, acima dos botões), olhar e disparar
    const h = vp.height;
    const before = await state(page);
    await touch.start([{ x: 50, y: h - 330, id: 1 }]);
    await touch.move([{ x: 50, y: h - 390, id: 1 }]);
    await waitSimSeconds(page, 0.6);
    await touch.end();
    const after = await state(page);
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(0.3);
    await touch.start([{ x: 200, y: 300, id: 2 }]);
    for (let i = 1; i <= 4; i++) await touch.move([{ x: 200 + i * 20, y: 300, id: 2 }]);
    await waitSimSeconds(page, 0.2);
    await touch.end();
    expect((await state(page)).angle - after.angle).toBeGreaterThan(0.2);
    const f0 = await state(page);
    await page.locator('#t-btn-fire').tap();
    await page.waitForFunction((n) => window.m02Bench.sim.shotLog.length > n, f0.shots);

    await page.locator('#t-menu').tap();
    await expect(page.locator('#btn-start-c01')).toBeVisible();
    await page.screenshot({ path: path.join(SHOT_DIR, 'portrait-02-menu-bancada.png') });
    expect(errors).toEqual([]);
  });
});
