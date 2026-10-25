import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACT_DIR = process.env.M02_ARTIFACT_DIR || '/home/joiceiscee/.gemini/antigravity-cli/brain/2ab1907b-7bcf-4991-9f99-127eaab64c49';
const TELEMETRY_OUT = path.join(ARTIFACT_DIR, 'scratch/m02-01-browser-telemetry.json');

test.describe('M02-01 Bancada da Quinta (100x150m) — Browser Verification & Captures', () => {
  test('Boots m02-01.html without errors, verifies doors/ballistics/routes, captures SN1-SN5 + interiors, and records telemetry across profiles', async ({ page }) => {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
    });

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/COD-guerra/m02-01.html?quality=medium', { waitUntil: 'networkidle' });

    await page.waitForFunction(() => Boolean(window.m02Bench && window.m02Bench.getTelemetrySummary().sampleCount >= 10));

    // 1. Capture SN1 (Start at 0, -80)
    await page.evaluate(() => window.m02Bench.teleportToPanorama('SN1'));
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'm02-01-sn1-start.png') });

    // 2. Capture SN2 (Western Ditch at -45, -5) and verify ditch depth + MG protection
    await page.evaluate(() => window.m02Bench.teleportToPanorama('SN2'));
    await page.waitForTimeout(250);
    const sn2State = await page.evaluate(() => window.m02Bench.getStateSummary());
    expect(sn2State.player.y).toBeLessThan(-0.85);
    expect(sn2State.mgState.canHitPlayer).toBe(false);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'm02-01-sn2-ditch.png') });

    // 3. Capture SN3 (East facade of B01) and test door prompt + closed vs open door ballistics
    await page.evaluate(() => window.m02Bench.teleportPlayer(-24.2, -15.5, Math.PI, 0));
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'm02-01-sn3-b01-exterior.png') });

    // At distance 1.8m from door_b01_east_main (-26, -15.5), door prompt must be visible
    const nearDoorState = await page.evaluate(() => window.m02Bench.getStateSummary());
    expect(nearDoorState.doorPrompt).not.toBeNull();
    expect(nearDoorState.doorPrompt.doorId).toBe('door_b01_east_main');
    expect(nearDoorState.doors.door_b01_east_main).toBe('closed');

    // Firing at closed door_b01_east_main must be blocked by solid door_leaf
    const shotClosed = await page.evaluate(() => window.m02Bench.fireWeapon());
    expect(shotClosed.blockedBySolid).toBe(true);
    expect(shotClosed.hitTarget).toBe(false);

    // Open door with KeyE and fire again -> hits tgt_b01_hall_door inside Sala
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(150);
    const afterOpenState = await page.evaluate(() => window.m02Bench.getStateSummary());
    expect(afterOpenState.doors.door_b01_east_main).toBe('open');
    const shotOpen = await page.evaluate(() => window.m02Bench.fireWeapon());
    expect(shotOpen.hitTarget).toBe(true);
    expect(shotOpen.hitId).toBe('tgt_b01_hall_door');

    // 4. Teleport inside B01 Cozinha (-35.2, -14.8) facing west window & stove and capture interior
    await page.evaluate(() => window.m02Bench.teleportPlayer(-34.8, -14.8, Math.PI, -0.04));
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'm02-01-b01-kitchen-interior.png') });

    // 5. Capture SN4 (Barn B02 west MG aperture & interior view)
    await page.evaluate(() => window.m02Bench.teleportToPanorama('SN4'));
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'm02-01-sn4-b02-barn.png') });

    // 6. Capture SN5 (Southern Orchard looking north)
    await page.evaluate(() => window.m02Bench.teleportToPanorama('SN5'));
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'm02-01-sn5-orchard.png') });

    // 7. Collect telemetry across all 3 scalable quality profiles (high, medium, low)
    const profilesTelemetry = {};
    for (const profileId of ['high', 'medium', 'low']) {
      await page.evaluate((p) => {
        window.m02Bench.setQuality(p);
        window.m02Bench.renderer.telemetryWindow.length = 0;
      }, profileId);
      await page.waitForFunction(() => window.m02Bench.getTelemetrySummary().sampleCount >= 8, null, { timeout: 25000 });
      profilesTelemetry[profileId] = await page.evaluate(() => window.m02Bench.getTelemetrySummary());
      expect(profilesTelemetry[profileId].drawCalls).toBeGreaterThan(0);
      expect(profilesTelemetry[profileId].triangles).toBeGreaterThan(0);
    }

    fs.mkdirSync(path.dirname(TELEMETRY_OUT), { recursive: true });
    fs.writeFileSync(
      TELEMETRY_OUT,
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          profiles: profilesTelemetry,
        },
        null,
        2,
      ),
    );

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
