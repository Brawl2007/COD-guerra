import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACT_DIR = process.env.M02_ARTIFACT_DIR || '/home/joiceiscee/.gemini/antigravity-cli/brain/2ab1907b-7bcf-4991-9f99-127eaab64c49';
const TELEMETRY_OUT = path.join(ARTIFACT_DIR, 'scratch/m02-01-browser-telemetry.json');

test.describe('M02-01 & M02-02 Quinta da Bzura (100x150m) — Browser Verification & Captures', () => {
  test('Boots m02-01.html without errors, verifies doors/ballistics/routes/squad-combat/grenades/C04, captures screenshots, and records telemetry', async ({ page }) => {
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

    const snapIfMissing = async (fileName) => {
      const target = path.join(ARTIFACT_DIR, fileName);
      if (!fs.existsSync(target)) {
        await page.screenshot({ path: target });
      }
    };

    // 1. Capture SN1 (Start at 0, -80) with Polish squad & dialogue banner
    await page.evaluate(() => {
      window.m02Bench.teleportToPanorama('SN1');
      window.m02Bench.renderer.renderFrame(0.016, 0.5);
    });
    await snapIfMissing('m02-01-sn1-start.png');

    // 2. Capture SN2 (Western Ditch at -45, -5) and verify ditch depth + MG protection
    await page.evaluate(() => {
      window.m02Bench.teleportToPanorama('SN2');
      window.m02Bench.renderer.renderFrame(0.016, 0.5);
    });
    const sn2State = await page.evaluate(() => window.m02Bench.getStateSummary());
    expect(sn2State.player.y).toBeLessThan(-0.85);
    expect(sn2State.mgState.canHitPlayer).toBe(false);
    await snapIfMissing('m02-01-sn2-ditch.png');

    // 3. Capture SN3 (East facade of B01) and test door prompt + closed vs open door ballistics
    await page.evaluate(() => {
      window.m02Bench.teleportPlayer(-24.2, -15.5, Math.PI, 0);
      window.m02Bench.renderer.renderFrame(0.016, 0.5);
    });
    await snapIfMissing('m02-01-sn3-b01-exterior.png');

    const nearDoorState = await page.evaluate(() => window.m02Bench.getStateSummary());
    expect(nearDoorState.doorPrompt).not.toBeNull();
    expect(nearDoorState.doorPrompt.doorId).toBe('door_b01_east_main');
    expect(nearDoorState.doors.door_b01_east_main).toBe('closed');

    // Firing at closed door_b01_east_main must be blocked by solid door_leaf
    const shotClosed = await page.evaluate(() => window.m02Bench.fireWeapon());
    expect(shotClosed.blockedBySolid).toBe(true);
    expect(shotClosed.hitTarget).toBe(false);

    // Open door with KeyE and fire again -> hits DE-A08 / tgt_b01_hall_door inside Sala
    await page.keyboard.press('KeyE');
    await page.waitForFunction(() => window.m02Bench.getStateSummary().doors.door_b01_east_main === 'open');
    const afterOpenState = await page.evaluate(() => window.m02Bench.getStateSummary());
    expect(afterOpenState.doors.door_b01_east_main).toBe('open');
    const shotOpen = await page.evaluate(() => window.m02Bench.fireWeapon());
    expect(shotOpen.hitTarget).toBe(true);
    expect(['DE-A08', 'tgt_b01_hall_door']).toContain(shotOpen.hitId);

    // 4. Teleport inside B01 Cozinha (-34.8, -14.8) facing west window & stove and capture interior
    await page.evaluate(() => {
      window.m02Bench.teleportPlayer(-34.8, -14.8, Math.PI, -0.04);
      window.m02Bench.renderer.renderFrame(0.016, 0.5);
    });
    await snapIfMissing('m02-01-b01-kitchen-interior.png');

    // 5. Capture SN4 (Barn B02 west MG aperture & interior view)
    await page.evaluate(() => {
      window.m02Bench.teleportToPanorama('SN4');
      window.m02Bench.renderer.renderFrame(0.016, 0.5);
    });
    await snapIfMissing('m02-01-sn4-b02-barn.png');

    // 6. Capture SN5 (Southern Orchard looking north)
    await page.evaluate(() => {
      window.m02Bench.teleportToPanorama('SN5');
      window.m02Bench.renderer.renderFrame(0.016, 0.5);
    });
    await snapIfMissing('m02-01-sn5-orchard.png');

    // 7. M02-02 Capture 1: Polish squad assault around B01 & courtyard with causal fire
    await page.evaluate(() => {
      for (let i = 0; i < 240; i++) window.m02Bench.sim.tick(0.05, {});
      window.m02Bench.teleportPlayer(-18.5, -14.0, -2.85, -0.02);
      window.m02Bench.sim.dialogue.trigger('bz39_c03_01', window.m02Bench.sim, { allowRepeat: true });
      window.m02Bench.sim.dialogue.update(window.m02Bench.sim);
      window.m02Bench.renderer.renderFrame(0.016, 0.5);
    });
    await snapIfMissing('m02-02-squad-ditch-assault.png');

    // 8. M02-02 Capture 2: Grenade detonation breaching southern wooden fence (cov_south_fence_west)
    await page.evaluate(() => {
      window.m02Bench.teleportPlayer(-11.5, 13.5, Math.PI / 2, -0.06);
      window.m02Bench.detonateGrenadeAt(-11.5, 0.5, 19.9, 6.5);
      window.m02Bench.renderer.renderFrame(0.016, 0.5);
    });
    const fenceState = await page.evaluate(() => window.m02Bench.getStateSummary());
    expect(fenceState.fences.cov_south_fence_west).toBe('breached');
    await snapIfMissing('m02-02-courtyard-grenade-breach.png');

    // 9. M02-02 Capture 3: Scene C04 (Pomar e Água) — Wounded unarmed German soldier & white chalk mark on orchard post
    await page.evaluate(() => {
      for (const e of window.m02Bench.sim.enemies) {
        if (!e.c04Candidate) {
          e.health = 0;
          e.alive = false;
        }
      }
      window.m02Bench.sim.tick(0.1, {});
      window.m02Bench.teleportPlayer(-5.2, 33.2, Math.PI / 2, -0.08);
      window.m02Bench.markWoundedSoldierWithChalk();
      window.m02Bench.sim.dialogue.update(window.m02Bench.sim);
      window.m02Bench.renderer.renderFrame(0.016, 0.5);
    });
    const c04State = await page.evaluate(() => window.m02Bench.getStateSummary());
    expect(c04State.flags['m02.pomar_wounded_marked']).toBe(true);
    expect(c04State.flags['m02.completed']).toBe(true);
    await snapIfMissing('m02-02-c04-orchard-chalk.png');

    // 10. M02-03 Capture 1: Scene C01 Start at P1 (0, -175) with opening cartela & squad in northern trench
    await page.evaluate(() => {
      window.m02Bench.sim.reset();
      window.m02Bench.startAreaAFullC01();
      window.m02Bench.renderer.renderFrame(0.016, 0.5);
    });
    const c01StartState = await page.evaluate(() => window.m02Bench.getStateSummary());
    expect(c01StartState.c01Active).toBe(true);
    expect(c01StartState.player.z).toBe(-175);
    expect(c01StartState.objective.id).toBe('O00');
    expect(c01StartState.activeCartela?.text).toBe('Setor de Łęczyca — 9 de setembro de 1939 — fim da tarde');
    await snapIfMissing('m02-03-c01-p1-start.png');

    // 11. M02-03 Capture 2: EA0 Outpost Combat at transverse trench (-18, -110) with Horizon N2 smoke
    await page.evaluate(() => {
      for (let i = 0; i < 160; i++) window.m02Bench.sim.tick(0.05, { forward: 1 });
      window.m02Bench.teleportPlayer(-12.0, -124.0, 1.82, -0.03);
      window.m02Bench.renderer.renderFrame(0.016, 0.5);
    });
    await snapIfMissing('m02-03-ea0-outpost-combat.png');

    // 12. M02-03 Capture 3: Scene C05 / Transition T-AB (Night T1 lighting + cartela + Gruca order)
    await page.evaluate(() => {
      window.m02Bench.teleportToPanorama('SN5');
      window.m02Bench.triggerTransitionTAB({ skip: false });
      window.m02Bench.sim.dialogue.update(window.m02Bench.sim);
      window.m02Bench.renderer.renderFrame(0.016, 0.5);
    });
    const tabState = await page.evaluate(() => window.m02Bench.getStateSummary());
    expect(tabState.objective.id).toBe('T-AB');
    expect(tabState.horizon.temporalState).toBe('T1');
    expect(tabState.transitionTABPayload.targetArea).toBe('AREA_B_LECZYCA');
    await snapIfMissing('m02-03-c05-night-transition.png');

    // 13. M02-04 Capture 1: Area B (Acessos de Łęczyca · C06–C08) with Supply Cart & B05/B06/B07/B08
    await page.evaluate(() => {
      window.m02Bench.enterAreaBC06();
      window.m02Bench.teleportPlayer(-6.5, 48.0, -Math.PI / 2 + 0.12, -0.04);
      window.m02Bench.renderer.renderFrame(0.016, 0.5);
    });
    const areaBState = await page.evaluate(() => window.m02Bench.getStateSummary());
    expect(areaBState.activeCellId).toBe('B');
    expect(areaBState.streaming.residentCellsCount).toBeLessThanOrEqual(2);
    expect(areaBState.objective.id).toBe('O04');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'm02-04-area-b-supply-cart.png') });

    // 14. M02-05 Capture 1: Area C (Acessos de Leśmierz · C09–C11) with SP03 Artillery Crater & Last Group Evacuation
    await page.evaluate(() => {
      window.m02Bench.deliverSupplyVolume('vol_water');
      window.m02Bench.deliverSupplyVolume('vol_ammo');
      window.m02Bench.completeC07Reorganization();
      window.m02Bench.enterAreaCC09();
      window.m02Bench.startC10OrderChanges();
      window.m02Bench.detonateC10FixedArtillery();
      for (let i = 0; i < 40; i++) window.m02Bench.sim.tick(0.05, {});
      window.m02Bench.teleportPlayer(-12.0, -8.0, 0.85, -0.05);
      window.m02Bench.renderer.renderFrame(0.016, 0.5);
    });
    const areaCState = await page.evaluate(() => window.m02Bench.getStateSummary());
    expect(areaCState.activeCellId).toBe('C');
    expect(areaCState.streaming.residentCellsCount).toBeLessThanOrEqual(2);
    expect(areaCState.areaC.corridorExteriorBlocked).toBe(true);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'm02-05-area-c-lesmierz-sp03.png') });

    // 15. M02-05 Capture 2: Scene C12 Epilogue & Campaign Bridge M02 -> M03 inside/near B12 Aid House
    await page.evaluate(() => {
      window.m02Bench.completeC12Epilogue({ lisOutcome: 'wounded_evacuated' });
      window.m02Bench.teleportPlayer(-48.0, 44.0, 2.35, -0.04);
      window.m02Bench.renderer.renderFrame(0.016, 0.5);
    });
    const c12State = await page.evaluate(() => window.m02Bench.getStateSummary());
    expect(c12State.flags['m02.completed']).toBe(true);
    expect(c12State.flags['m02.lis_status']).toBe('wounded_evacuated');
    expect(c12State.m03ExportPackage.nextMissionId).toBe('M03');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'm02-05-c12-epilogue-m03-bridge.png') });

    // 16. M02-06 Document L & Accessibility + Weapon Clearance Verification in Browser
    await page.evaluate(() => {
      window.m02Bench.sim.reset();
      window.m02Bench.setAccessibilityOptions({
        subtitlesEnabled: true,
        directionalIndicatorsEnabled: true,
        reducedCameraShake: true,
        reducedDynamicRange: true,
        tinnitusIntensity: 0.0,
      });
      window.m02Bench.teleportPlayer(-25.5, -12.0, Math.PI, 0);
      window.m02Bench.renderer.renderFrame(0.016, 0.5);
    });
    const a11ySummary = await page.evaluate(() => window.m02Bench.getStateSummary());
    expect(a11ySummary.audiovisual.accessibility.reducedCameraShake).toBe(true);
    expect(a11ySummary.audiovisual.accessibility.tinnitusIntensity).toBe(0.0);

    const clearanceNear = await page.evaluate(() => window.m02Bench.evaluateWeaponClearance());
    expect(clearanceNear.clearanceState).toBe('LOWERED_NEAR_OBSTACLE');

    await page.evaluate(() => {
      window.m02Bench.teleportPlayer(-24.5, -12.0, Math.PI, 0);
      window.m02Bench.renderer.renderFrame(0.016, 0.5);
    });
    const clearanceFar = await page.evaluate(() => window.m02Bench.evaluateWeaponClearance());
    expect(clearanceFar.clearanceState).toBe('READY');

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'm02-06-accessibility-weapon-clearance.png') });

    // Restore T0 afternoon lighting before telemetry collection
    await page.evaluate(() => window.m02Bench.setTemporalState('T0'));

    // 13. Collect telemetry across all 3 scalable quality profiles (high, medium, low)
    const profilesTelemetry = {};
    for (const profileId of ['high', 'medium', 'low']) {
      await page.evaluate((p) => {
        window.m02Bench.setQuality(p);
        window.m02Bench.renderer.telemetryWindow.length = 0;
        for (let i = 0; i < 10; i++) {
          window.m02Bench.renderer.renderFrame(0.016, 0.5);
        }
      }, profileId);
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
