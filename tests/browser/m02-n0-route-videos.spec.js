// M02 gate N0 (PDF section N5, pp. 47-49): continuous video of the two routes (vala and pomar) from SN1 to the quinta.
// Runs only through tools/m02/playwright-m02-01.config.js (the main playwright config ignores m02-*.spec.js).
// Piotr is driven by real game inputs on the bench page: KeyW / ShiftLeft keydown+keyup events for movement and pointer-locked
// mousemove events (movementX/Y, the same handler the player's mouse uses) for aiming. The decisions (navigator route, waypoint order)
// reuse tests/m02-mission-bot.js (MissionBot.walkControls) imported in the page through the Vite dev server. No simulation shortcut
// (teleport, tick, scene jump) is called. Output: <M02_ARTIFACT_DIR>/routes/*.webm|png|json (never committed from here; test-results/ is ignored).
// This spec produces evidence; it does NOT approve N0 (Captain/owner decision). SwiftShader: timings are not GPU timings, no FPS claimed.
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ARTIFACT_DIR = process.env.M02_ARTIFACT_DIR || path.join(repoRoot, 'test-results', 'm02-artifacts');
const OUT_DIR = path.join(ARTIFACT_DIR, 'routes');
const COMMIT = process.env.M02_COMMIT || process.env.GIT_COMMIT || 'unknown';
// «low» keeps the SwiftShader frame rate usable (the bench caps one simulation step at 0.05 s, so a slow renderer plays in slow motion).
const QUALITY = process.env.M02_ROUTE_QUALITY || 'low';
const VIDEO_SIZE = { width: 960, height: 540 };
const ENGAGE_RANGE_M = Number(process.env.M02_ROUTE_ENGAGE_RANGE_M || 90);
const ENGAGE_MAX_SIM_SEC = Number(process.env.M02_ROUTE_ENGAGE_MAX_SIM_SEC || 25);
const ROUTE_WALL_LIMIT_MS = Number(process.env.M02_ROUTE_WALL_LIMIT_MS || 900000);

const layout = JSON.parse(fs.readFileSync(path.join(repoRoot, 'missions/m02-bzura/m02-01-quinta-layout.json'), 'utf8'));
const ROUTES = [
  { id: 'vala', label: 'Rota da vala (A)', waypoints: layout.routes.ditch },
  { id: 'pomar', label: 'Rota do pomar (B)', waypoints: layout.routes.orchard },
];

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const ffprobeDuration = (file) => {
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' });
    return Number(Number(out.trim()).toFixed(2));
  } catch {
    return null;
  }
};

/** Runs inside the page: installs the input driver (key events + pointer-locked mousemove) that walks the waypoints. */
async function installDriver({ waypoints, ENGAGE_RANGE_M, ENGAGE_MAX_SIM_SEC }) {
  const { MissionBot } = await import('/COD-guerra/tests/m02-mission-bot.js');
  const { sim } = window.m02Bench;
  const bot = new MissionBot(sim, { dt: 0.05 });
  const held = new Set();
  const setKey = (code, down) => {
    if (held.has(code) === down) return;
    if (down) held.add(code);
    else held.delete(code);
    window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true, cancelable: true }));
  };
  const carry = { x: 0, y: 0 };
  const MAX_TURN_RAD = 0.1; // per frame: a visible turn, not a snap
  const mouseLook = (yawRad, pitchRad) => {
    const yaw = Math.max(-MAX_TURN_RAD, Math.min(MAX_TURN_RAD, yawRad));
    // handler: angle += movementX * 0.0024 ; pitch -= movementY * 0.0022
    const wantX = yaw / 0.0024 + carry.x;
    const wantY = pitchRad / 0.0022 + carry.y;
    const mx = Math.round(wantX);
    const my = Math.round(wantY);
    carry.x = wantX - mx;
    carry.y = wantY - my;
    if (mx !== 0 || my !== 0) window.dispatchEvent(new MouseEvent('mousemove', { movementX: mx, movementY: my, bubbles: true }));
  };
  const state = {
    done: false,
    stopReason: null,
    waypointIndex: 0,
    waypointsTotal: waypoints.length,
    startedClock: sim.clock,
    endedClock: null,
    pointerLocked: document.pointerLockElement === document.getElementById('m02-canvas'),
    frames: 0,
    engagedSimSec: 0,
    inputs: { forwardFrames: 0, sprintFrames: 0, mouseLookEvents: 0, interactPresses: 0, firePresses: 0, reloadPresses: 0 },
  };
  window.__routeDriver = state;
  let lastProgressClock = sim.clock;
  let lingerUntil = null;
  const finish = (reason) => {
    for (const code of [...held]) setKey(code, false);
    state.done = true;
    state.stopReason = reason;
    state.endedClock = sim.clock;
  };
  const frame = () => {
    if (state.done) return;
    state.frames++;
    const p = sim.player;
    if (sim.missionFailed) return finish('mission-failed');
    if (!(p.health > 0)) return finish('player-down');
    if (lingerUntil !== null) {
      setKey('KeyW', false);
      setKey('ShiftLeft', false);
      if (sim.clock >= lingerUntil) return finish('route-complete');
      return requestAnimationFrame(frame);
    }
    const wp = waypoints[state.waypointIndex];
    const goal = { x: wp[0], z: wp[1] };
    const last = state.waypointIndex === waypoints.length - 1;
    if (Math.hypot(goal.x - p.x, goal.z - p.z) <= (last ? 1.5 : 2.0)) {
      state.waypointIndex++;
      lastProgressClock = sim.clock;
      bot.corners = null;
      if (state.waypointIndex >= waypoints.length) {
        lingerUntil = sim.clock + 2.5; // short hold at the farm for the closing frames
        return requestAnimationFrame(frame);
      }
      return requestAnimationFrame(frame);
    }
    if (sim.clock - lastProgressClock > 60) return finish('no-progress-60s-sim');
    // Engage a hostile Piotr can actually hit (clear line to chest/head/hip, <= ENGAGE_RANGE_M): stand, aim with the mouse, fire with Space.
    // At most ENGAGE_MAX_SIM_SEC per route leg, then keep walking (a transit video must not stall in a fight).
    const target = state.engagedSimSec < ENGAGE_MAX_SIM_SEC ? bot.nearestHittableHostile(ENGAGE_RANGE_M) : null;
    if (target) {
      const a = bot.aimAtPoint(target.aim);
      mouseLook(a.lookX, a.lookY);
      setKey('KeyW', false);
      setKey('ShiftLeft', false);
      const aligned = Math.abs(a.lookX) < 0.02 && Math.abs(a.lookY) < 0.03;
      state.engagedSimSec += 0.05;
      if (aligned && a.fire) {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }));
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ', bubbles: true }));
        state.inputs.firePresses++;
      } else if (a.reload) {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', key: 'r', bubbles: true }));
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyR', key: 'r', bubbles: true }));
        state.inputs.reloadPresses++;
      }
      lastProgressClock = sim.clock;
      return requestAnimationFrame(frame);
    }
    const c = bot.walkControls(goal, { sprint: true });
    mouseLook(c.lookX, p.pitch); // pitch is levelled to the horizon while walking
    if (c.lookX !== 0) state.inputs.mouseLookEvents++;
    setKey('KeyW', true);
    setKey('ShiftLeft', true);
    state.inputs.forwardFrames++;
    state.inputs.sprintFrames++;
    if (sim.currentDoorPrompt()?.state === 'closed') {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e', bubbles: true }));
      state.inputs.interactPresses++;
    }
    return requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return true;
}

test.describe('M02 N0 route videos: vala and pomar, SN1 to the quinta', () => {
  test.setTimeout(process.env.CI ? 2400000 : 2000000);

  for (const route of ROUTES) {
    test(`records the ${route.id} route with real game inputs`, async ({ browser }) => {
      fs.mkdirSync(OUT_DIR, { recursive: true });
      const videoTmp = path.join(OUT_DIR, `.tmp-${route.id}`);
      fs.rmSync(videoTmp, { recursive: true, force: true });
      const context = await browser.newContext({
        viewport: VIDEO_SIZE,
        recordVideo: { dir: videoTmp, size: VIDEO_SIZE },
      });
      const page = await context.newPage();
      const t0 = Date.now();
      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => consoleErrors.push(String(err)));

      await page.goto(`/COD-guerra/m02-01.html?quality=${QUALITY}`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => Boolean(window.m02Bench && window.m02Bench.getTelemetrySummary().sampleCount >= 5), null, { timeout: 180000 });
      // Debug HUD hidden (panels, buttons, telemetry). In-game UI stays: reticle, cartela, dialogue, subtitles, prompts, direction ring.
      await page.addStyleTag({ content: '.hud-layer{visibility:hidden!important}' });

      // Pointer lock through a user-gesture evaluation (the same lock the bench takes on the first mouse click, without firing a shot).
      const cdp = await context.newCDPSession(page);
      await cdp.send('Runtime.evaluate', { expression: "document.getElementById('m02-canvas').requestPointerLock()", userGesture: true });
      await page.waitForFunction(() => document.pointerLockElement === document.getElementById('m02-canvas'), null, { timeout: 10000 });

      const env = await page.evaluate(() => {
        const gl = document.getElementById('m02-canvas').getContext('webgl2') || document.getElementById('m02-canvas').getContext('webgl');
        const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
        return { glRenderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null, quality: window.m02Bench.renderer.qualityProfile.id, lighting: window.m02Bench.renderer.lightingPreset.id };
      });
      const startSnapshot = await page.evaluate(() => {
        const s = window.m02Bench.sim;
        return { clock: s.clock, scene: s.script.sceneId, x: s.player.x, z: s.player.z, health: s.player.health };
      });
      expect(startSnapshot.x).toBeCloseTo(0, 1);
      expect(startSnapshot.z).toBeCloseTo(-80, 1);

      const driverStartWallMs = Date.now() - t0;
      await page.evaluate(installDriver, { waypoints: route.waypoints.slice(1), ENGAGE_RANGE_M, ENGAGE_MAX_SIM_SEC });

      const shots = {};
      const snap = async (name) => {
        const file = path.join(OUT_DIR, `route-${route.id}-${name}.png`);
        await page.screenshot({ path: file });
        shots[name] = path.basename(file);
      };
      const trace = [];
      let midTaken = false;
      let startTaken = false;
      const deadline = Date.now() + ROUTE_WALL_LIMIT_MS;
      let drv;
      for (;;) {
        await page.waitForTimeout(1000);
        const sample = await page.evaluate(() => {
          const s = window.m02Bench.sim;
          const d = window.__routeDriver;
          return {
            clock: Number(s.clock.toFixed(2)),
            scene: s.script.sceneId,
            objective: s.objective.id,
            x: Number(s.player.x.toFixed(2)),
            y: Number(s.player.y.toFixed(2)),
            z: Number(s.player.z.toFixed(2)),
            health: s.player.health,
            mgCanHitPlayer: s.mgState.canHitPlayer,
            hostilesAlive: s.enemies.filter((e) => e.alive && !e.nonCombatant).length,
            waypointIndex: d.waypointIndex,
            done: d.done,
          };
        });
        trace.push({ wallMs: Date.now() - t0, ...sample });
        if (!startTaken && sample.clock - startSnapshot.clock > 1.5) {
          await snap('start');
          startTaken = true;
        }
        if (!midTaken && sample.waypointIndex >= Math.ceil((route.waypoints.length - 1) / 2) + 0) {
          await snap('mid');
          midTaken = true;
        }
        if (sample.done) break;
        if (Date.now() > deadline) break;
      }
      await snap('end');
      drv = await page.evaluate(() => structuredClone(window.__routeDriver));
      const final = await page.evaluate(() => {
        const s = window.m02Bench.sim;
        return {
          clock: s.clock,
          scene: s.script.sceneId,
          objective: s.objective.id,
          player: { x: s.player.x, y: s.player.y, z: s.player.z, health: s.player.health },
          missionFailed: s.missionFailed ? structuredClone(s.missionFailed) : null,
          routeProgress: structuredClone(s.routeProgress),
          shotsFiredByPlayer: s.shotLog.length,
          pointerLocked: document.pointerLockElement === document.getElementById('m02-canvas'),
        };
      });
      const wallMs = Date.now() - t0;
      const video = page.video();
      await context.close();
      const rawPath = path.join(OUT_DIR, `route-${route.id}-raw.webm`);
      await video.saveAs(rawPath);
      fs.rmSync(videoTmp, { recursive: true, force: true });

      // Trim the page-load lead-in (blank/loading frames before the driver starts) and cap the bitrate so the committed copy stays small.
      const trimmedPath = path.join(OUT_DIR, `route-${route.id}.webm`);
      let trimmed = false;
      try {
        execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(Math.max(0, driverStartWallMs / 1000 - 0.5).toFixed(2)), '-i', rawPath, '-c:v', 'libvpx', '-b:v', '350k', '-crf', '32', '-an', trimmedPath]);
        trimmed = true;
      } catch {
        fs.copyFileSync(rawPath, trimmedPath);
      }

      const entry = {
        schema: 'm02-n0-route-video-v1',
        gate: 'N0 (PDF N5)',
        route: route.id,
        label: route.label,
        commit: COMMIT,
        generatedAt: new Date().toISOString(),
        waypoints: route.waypoints,
        browser: { version: browser.version(), ...env },
        recorder: { size: VIDEO_SIZE, quality: QUALITY },
        timing: { wallClockMs: wallMs, driverStartWallMs, simulatedSeconds: Number((final.clock - startSnapshot.clock).toFixed(2)) },
        files: {
          video: { name: path.basename(trimmedPath), bytes: fs.statSync(trimmedPath).size, sha256: sha256(trimmedPath), durationSec: ffprobeDuration(trimmedPath), trimmedLeadIn: trimmed },
          rawVideo: { name: path.basename(rawPath), bytes: fs.statSync(rawPath).size, sha256: sha256(rawPath), durationSec: ffprobeDuration(rawPath) },
          frames: shots,
        },
        driver: drv,
        start: startSnapshot,
        final,
        consoleErrors,
        trace,
        notes: [
          'Inputs: KeyW + ShiftLeft key events and pointer-locked mousemove (movementX/Y); KeyE if a closed door blocks. No teleport, tick or scene jump.',
          'The bench runs one simulation step per rendered frame capped at 0.05 s; on SwiftShader the video therefore plays slower than real time (simulated seconds in timing). No FPS is claimed.',
          'Evidence only: human reading of the video and the N0 decision remain with the Captain/owner.',
        ],
      };
      fs.writeFileSync(path.join(OUT_DIR, `route-${route.id}.json`), JSON.stringify(entry, null, 2));
      console.log(`[m02-routes] ${route.id}: stop=${drv.stopReason} wp=${drv.waypointIndex}/${drv.waypointsTotal} sim=${entry.timing.simulatedSeconds}s wall=${(wallMs / 1000).toFixed(0)}s video=${entry.files.video.bytes}B scene=${final.scene} hp=${final.player.health}`);

      expect(consoleErrors).toEqual([]);
      expect(final.pointerLocked).toBe(true);
      expect(entry.files.video.bytes).toBeGreaterThan(10000);
      expect(drv.stopReason).toBe('route-complete');
      expect(drv.waypointIndex).toBe(drv.waypointsTotal);
      const visited = route.id === 'vala' ? final.routeProgress.ditchWaypointsVisited : final.routeProgress.orchardWaypointsVisited;
      expect(visited.every(Boolean)).toBe(true);
    });
  }
});
