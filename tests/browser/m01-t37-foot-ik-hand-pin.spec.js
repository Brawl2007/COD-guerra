import { test, expect } from '@playwright/test';
import { driver, toRepair } from '../helpers/m01-route.js';

// T37 smoke on the real game (?debug=1): production Continue from a real route checkpoint, the real soldier GLBs and the real renderer.
// Proves the IK pass runs with the mission world, reports its counters, respects the debug switch and raises no page error.
// Not a mission playtest and not an FPS measurement.
const key = 'cod-guerra:checkpoint:m01:v2';
const snapshot = toRepair(driver()).sim.snapshot(false);

test('real game: foot IK / ramp lean / hand pin counters, tier policy and the runtime IK switch', async ({ page }) => {
  test.setTimeout(420000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(({ key, snapshot }) => {
    localStorage.setItem(key, JSON.stringify(snapshot));
    localStorage.setItem('cod-guerra:visual-quality', 'high');
    // Headless Chromium cannot always grant pointer lock; the game pauses without it. Grant it so the mission runs.
    let locked = null;
    Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => locked });
    HTMLCanvasElement.prototype.requestPointerLock = function () {
      locked = this;
      document.dispatchEvent(new Event('pointerlockchange'));
      return Promise.resolve();
    };
    document.exitPointerLock = () => {
      locked = null;
      document.dispatchEvent(new Event('pointerlockchange'));
    };
  }, { key, snapshot });
  await page.goto('?debug=1');
  await page.waitForFunction(() => window.gameDiagnostics?.().m01?.characters?.loaded.includes('pl:2'), null, { timeout: 240000 });
  await expect(page.locator('#continue')).toBeEnabled({ timeout: 120000 });
  await page.locator('#continue').click();
  await page.waitForFunction(() => !window.gameDiagnostics().paused, null, { timeout: 120000 });
  await page.waitForFunction(() => {
    const ik = window.gameDiagnostics().m01.characters.ik;
    return ik.enabled && ik.counts.activeIk > 0 && ik.cost.samples > 2;
  }, null, { timeout: 120000 });

  const on = await page.evaluate(() => {
    const c = window.gameDiagnostics().m01.characters;
    return { ik: c.ik, actors: c.actors.map(a => ({ id: a.id, clip: a.clip, ik: a.ik ?? null })), debug: typeof window.m01CharacterIkDebug?.setEnabled };
  });
  expect(on.debug).toBe('function');
  expect(on.ik.enabled).toBe(true);
  expect(on.ik.tier).toBe('high');
  expect(on.ik.counts.skinned).toBeGreaterThan(0);
  expect(on.ik.counts.activeIk).toBeGreaterThan(0);
  expect(on.ik.counts.full).toBeLessThanOrEqual(on.ik.policy.maxFullIkActors);
  expect(on.ik.counts.full + on.ik.counts.footSlope).toBeLessThanOrEqual(on.ik.policy.maxFootIkActors);
  expect(on.ik.accuracy.maxBootClearanceM).toBeLessThanOrEqual(on.ik.accuracy.bootToleranceM);
  expect(on.ik.accuracy.maxHandErrorM).toBeLessThanOrEqual(on.ik.accuracy.handToleranceM);
  expect(Number.isFinite(on.ik.cost.lastTotalMs)).toBe(true);
  expect(on.ik.byTier.high.frames).toBeGreaterThan(0);
  expect('fps' in on.ik).toBe(false);
  expect('fps' in on.ik.cost).toBe(false);
  expect(on.actors.filter(a => a.ik).length).toBeGreaterThan(0);
  expect(on.actors.find(a => a.ik)?.ik.mode).toMatch(/^(full|foot_slope|slope_only|clip_only|bypassed_exact)$/);

  // The runtime switch gives back the plain clip output.
  await page.evaluate(() => window.m01CharacterIkDebug.setEnabled(false));
  await page.waitForFunction(() => {
    const ik = window.gameDiagnostics().m01.characters.ik;
    return !ik.enabled && ik.counts.activeIk === 0 && ik.counts.clipOnly === ik.counts.skinned;
  }, null, { timeout: 120000 });
  await page.evaluate(() => window.m01CharacterIkDebug.setEnabled(true));
  await page.waitForFunction(() => {
    const ik = window.gameDiagnostics().m01.characters.ik;
    return ik.enabled && ik.counts.activeIk > 0;
  }, null, { timeout: 120000 });

  // Quality presets use their own budget (real selector).
  for (const tier of ['medium', 'low']) {
    // The real quality control's change handler (the select sits in the menu, which is closed while the mission runs).
    await page.evaluate(t => { const s = document.querySelector('#quality'); s.value = t; s.dispatchEvent(new Event('change', { bubbles: true })); }, tier);
    await page.waitForFunction(t => window.gameDiagnostics().m01.characters.ik.tier === t && window.gameDiagnostics().m01.characters.ik.byTier[t].frames > 1, tier, { timeout: 120000 });
    const ik = await page.evaluate(() => window.gameDiagnostics().m01.characters.ik);
    expect(ik.counts.full).toBeLessThanOrEqual(ik.policy.maxFullIkActors);
    expect(ik.accuracy.maxBootClearanceM).toBeLessThanOrEqual(0.02);
    expect(ik.accuracy.maxHandErrorM).toBeLessThanOrEqual(0.015);
  }
  expect(errors).toEqual([]);
});
