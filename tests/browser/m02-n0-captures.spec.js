// M02 gate N0 (PDF section N5, pp. 47-49): SN1..SN5 x 2 lights x 3 quality profiles = 30 capture sets.
// Runs only through tools/m02/playwright-m02-01.config.js (the main playwright config ignores m02-*.spec.js).
// Output: <M02_ARTIFACT_DIR>/n0/n0-<SN>-<luz>-<perfil>.png + n0-manifest.json (never committed; test-results/ is ignored).
// This spec produces evidence and automatic "reading proof" checks; it does NOT approve N0 (Captain/owner decision).
import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ARTIFACT_DIR = process.env.M02_ARTIFACT_DIR || path.join(repoRoot, 'test-results', 'm02-artifacts');
const N0_DIR = path.join(ARTIFACT_DIR, 'n0');
const COMMIT = process.env.M02_COMMIT || process.env.GIT_COMMIT || 'unknown';

const layout = JSON.parse(fs.readFileSync(path.join(repoRoot, 'missions/m02-bzura/m02-01-quinta-layout.json'), 'utf8'));
const PDF_POINTS = Object.fromEntries(layout.slicePanoramaPoints.map((p) => [p.id, p]));

const SNS = ['SN1', 'SN2', 'SN3', 'SN4', 'SN5'];
// PDF N5: "luz de fim da tarde e luz de manha de revisao". Presets already in the renderer.
const LIGHTS = [
  { id: 'tarde', preset: 'afternoon_1939_09_09' },
  { id: 'manha', preset: 'morning_1939_09_10' },
];
const PROFILES = ['high', 'medium', 'low'];
// PDF N: «SN1-SN5: pontos de revisao 360 graus». Each capture set is 4 headings from the SN point.
const HEADINGS_DEG = [0, 90, 180, 270];
const MIN_NON_UNIFORM_HEADINGS = 4; // every heading of the 360-degree set

// Reading-proof thresholds (luminance 0..255, on the saved PNG).
const MIN_LUMA_STDDEV = 6; // image must not be flat / uniform
const MIN_LUMA_MEAN = 12; // not black
const MAX_LUMA_MEAN = 245; // not blown out
// Calibrated on the 2026-11-04 run (120 readable blockout frames, viewed): min stddev 20.7, min distinct buckets 12.
// Flat-shaded blockout surfaces give few luminance levels; a black/blank render gives stddev~0 and 1-2 buckets.
// (24 buckets flagged readable frames as uniform.) This is a broken-render guard, not a readability judgement.
const MIN_DISTINCT_LUMA = 8; // distinct 8-level luminance buckets

// Key element of each SN as 3D sample points (metres, x east / y up / z south). The check passes when at least
// one sample projects inside the frustum. It does not prove the element is unoccluded (human check pending).
const keyElements = (world) => ({
  SN1: {
    label: 'abertura MG34 oeste de B02',
    points: [[layout.mgEmplacement.x, 1.48, layout.mgEmplacement.z]],
  },
  SN2: {
    label: 'volume da casa B01',
    points: boxSamples(layout.buildings.find((b) => b.id === 'B01')),
  },
  SN3: {
    label: 'porta este de B01 (door_b01_east_main)',
    points: [[world.door.x, 1.05, world.door.z]],
  },
  SN4: {
    label: 'abertura MG34 oeste de B02',
    points: [[layout.mgEmplacement.x, 1.48, layout.mgEmplacement.z]],
  },
  SN5: {
    label: 'arvores do pomar (tree_orch_01..03)',
    points: layout.orchardTrees.slice(0, 3).map((t) => [t.x, (t.canopyY0 + t.canopyY1) / 2, t.z]),
  },
});

function boxSamples(b) {
  const [minX, maxX, minZ, maxZ] = b.bounds;
  const h = b.wallHeight ?? 2.8;
  const pts = [[(minX + maxX) / 2, h / 2, (minZ + maxZ) / 2]];
  for (const x of [minX, maxX]) for (const z of [minZ, maxZ]) for (const y of [0.1, h]) pts.push([x, y, z]);
  return pts;
}

test.describe('M02 N0 captures: 5 SN x 2 luzes x 3 perfis', () => {
  test.setTimeout(process.env.CI ? 2400000 : 1800000);

  test('generates the 30 capture sets, the manifest, and runs the automatic reading proof', async ({ browser }) => {
    fs.mkdirSync(N0_DIR, { recursive: true });
    const manifest = {
      schema: 'm02-n0-capture-manifest-v2',
      gate: 'N0 (PDF N5)',
      generatedAt: new Date().toISOString(),
      commit: COMMIT,
      expectedSets: SNS.length * LIGHTS.length * PROFILES.length,
      thresholds: { MIN_LUMA_STDDEV, MIN_LUMA_MEAN, MAX_LUMA_MEAN, MIN_DISTINCT_LUMA },
      notes: [
        'Reading proof is automatic and only guards against broken renders: per set, 4 headings from the PDF point (360-degree review), no black/blown-out heading, all 4 headings with non-uniform luminance (stddev>=6, >=8 luminance buckets), key element inside the frustum in at least one heading. Bench HUD hidden. Occlusion, interiors, human reading, playtest and frame times remain human/other-gate items.',
        'SwiftShader software WebGL: image fidelity and timings are not representative of a GPU.',
      ],
      browser: null,
      captures: [],
    };

    for (const profile of PROFILES) {
      // One page load per profile: antialias is fixed at renderer construction (low = no MSAA).
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => consoleErrors.push(String(err)));

      await page.goto(`/COD-guerra/m02-01.html?quality=${profile}`, { waitUntil: 'networkidle' });
      await page.waitForFunction(
        () => Boolean(window.m02Bench && window.m02Bench.getTelemetrySummary().sampleCount >= 3),
        null,
        { timeout: 120000 },
      );

      const env = await page.evaluate(() => {
        const gl = document.getElementById('m02-canvas').getContext('webgl2') || document.getElementById('m02-canvas').getContext('webgl');
        const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
        return {
          userAgent: navigator.userAgent,
          glVersion: gl?.getParameter(gl.VERSION) ?? null,
          glVendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : null,
          glRenderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null,
        };
      });
      manifest.browser ??= { ...env, browserVersion: browser.version() };

      const door = await page.evaluate(() => {
        const d = window.m02Bench.sim.world.doors.find((x) => x.id === 'door_b01_east_main');
        return { x: d.center.x, z: d.center.z };
      });
      const elements = keyElements({ door });

      for (const light of LIGHTS) {
        for (const sn of SNS) {
          // PDF N: SN1-SN5 are 360-degree review points. One set = 4 headings (bench heading + 90/180/270 degrees).
          const pdf = PDF_POINTS[sn];
          const el = elements[sn];
          const headings = [];
          let lightingApplied = true;
          let qualityApplied = true;
          let pose = null;
          for (const deg of HEADINGS_DEG) {
            const name = `n0-${sn}-${light.id}-${profile}-h${String(deg).padStart(3, '0')}.png`;
            const file = path.join(N0_DIR, name);
            const view = await page.evaluate(
              ({ sn, preset, deg }) => {
                const b = window.m02Bench;
                b.setLighting(preset);
                b.teleportToPanorama(sn);
                const base = b.sim.player;
                b.teleportPlayer(base.x, base.z, base.angle + (deg * Math.PI) / 180, base.pitch);
                // Two frames: the first applies pose/lighting, the second settles dynamic state.
                b.renderer.renderFrame(0.016, 0.5);
                b.renderer.renderFrame(0.016, 0.5);
                const cam = b.renderer.camera;
                const p = b.sim.player;
                return {
                  lightingApplied: b.renderer.lightingPreset.id,
                  qualityApplied: b.renderer.qualityProfile.id,
                  player: { x: p.x, y: p.y, z: p.z, angle: p.angle, pitch: p.pitch },
                  camera: {
                    position: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
                    yaw: cam.rotation.y,
                    pitch: cam.rotation.x,
                    fovDeg: cam.fov,
                    aspect: cam.aspect,
                  },
                  resolution: { width: b.renderer.canvas.width, height: b.renderer.canvas.height },
                };
              },
              { sn, preset: light.preset, deg },
            );
            lightingApplied &&= view.lightingApplied === light.preset;
            qualityApplied &&= view.qualityApplied === profile;
            pose ??= view;
            // Clean frame for N0: hide the bench HUD/debug overlays (the 3D view, viewmodel included, is unchanged).
            await page.addStyleTag({ content: '.hud-layer,#dialogue-banner,#cartela-banner,#door-prompt{visibility:hidden!important}' });
            await page.screenshot({ path: file });
            const buf = fs.readFileSync(file);
            const sha256 = crypto.createHash('sha256').update(buf).digest('hex');

            // Reading proof 1: luminance statistics of the saved PNG (decoded in the page).
            const luma = await page.evaluate(async (b64) => {
              const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
              const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
              const c = document.createElement('canvas');
              c.width = bmp.width;
              c.height = bmp.height;
              const ctx = c.getContext('2d', { willReadFrequently: true });
              ctx.drawImage(bmp, 0, 0);
              const { data } = ctx.getImageData(0, 0, c.width, c.height);
              let sum = 0;
              let sumSq = 0;
              const n = data.length / 4;
              const buckets = new Set();
              for (let i = 0; i < data.length; i += 4) {
                const y = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
                sum += y;
                sumSq += y * y;
                buckets.add(y >> 3);
              }
              const mean = sum / n;
              return { width: bmp.width, height: bmp.height, mean, stddev: Math.sqrt(Math.max(0, sumSq / n - mean * mean)), distinct: buckets.size };
            }, buf.toString('base64'));

            // Reading proof 2: key element projected into the frame (frustum test, no occlusion test).
            const proj = await page.evaluate((points) => {
              const cam = window.m02Bench.renderer.camera;
              cam.updateMatrixWorld(true);
              const v = cam.matrixWorldInverse.elements;
              const pr = cam.projectionMatrix.elements;
              return points.map(([x, y, z]) => {
                const vx = v[0] * x + v[4] * y + v[8] * z + v[12];
                const vy = v[1] * x + v[5] * y + v[9] * z + v[13];
                const vz = v[2] * x + v[6] * y + v[10] * z + v[14];
                const cx = pr[0] * vx + pr[4] * vy + pr[8] * vz + pr[12];
                const cy = pr[1] * vx + pr[5] * vy + pr[9] * vz + pr[13];
                const cw = pr[3] * vx + pr[7] * vy + pr[11] * vz + pr[15];
                const inFront = vz < 0 && cw > 0;
                const ndc = inFront ? { x: cx / cw, y: cy / cw } : null;
                return { point: [x, y, z], inFront, ndc, inFrame: Boolean(ndc && Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1), distanceM: Math.hypot(vx, vy, vz) };
              });
            }, el.points);

            headings.push({
              deg,
              name,
              camera: view.camera,
              player: view.player,
              resolution: { screenshot: { width: luma.width, height: luma.height }, canvas: view.resolution },
              sha256,
              bytes: buf.length,
              luminance: { mean: Number(luma.mean.toFixed(2)), stddev: Number(luma.stddev.toFixed(2)), distinctBuckets: luma.distinct },
              notUniform: luma.stddev >= MIN_LUMA_STDDEV && luma.distinct >= MIN_DISTINCT_LUMA,
              notBlack: luma.mean >= MIN_LUMA_MEAN,
              notBlownOut: luma.mean <= MAX_LUMA_MEAN,
              keyElementInFrame: proj.some((q) => q.inFrame),
              keySamples: proj.map((q) => ({ ...q, distanceM: Number(q.distanceM.toFixed(1)) })),
            });
          }

          const setName = `n0-${sn}-${light.id}-${profile}`;
          const nonUniform = headings.filter((h) => h.notUniform).length;
          const checks = {
            filesWritten: headings.length === HEADINGS_DEG.length && headings.every((h) => h.bytes > 0),
            lightingApplied,
            qualityApplied,
            noHeadingBlack: headings.every((h) => h.notBlack),
            noHeadingBlownOut: headings.every((h) => h.notBlownOut),
            headingsNotUniform: nonUniform >= MIN_NON_UNIFORM_HEADINGS,
            keyElementInSomeHeading: headings.some((h) => h.keyElementInFrame),
            // The capture must be taken from the PDF section N point (tolerance 0.5 m), not an offset bench view.
            atPdfPoint: Math.hypot(pose.player.x - pdf.x, pose.player.z - pdf.z) <= 0.5,
          };
          const passed = Object.values(checks).every(Boolean);
          manifest.captures.push({
            name: setName,
            sn,
            light: light.id,
            lightingPreset: light.preset,
            profile,
            pdfPoint: { x: pdf.x, z: pdf.z },
            offsetFromPdfPointM: Number(Math.hypot(pose.player.x - pdf.x, pose.player.z - pdf.z).toFixed(2)),
            keyElement: el.label,
            headings,
            uniformHeadings: headings.filter((h) => !h.notUniform).map((h) => h.deg),
            checks,
            passed,
            humanPending: ['oclusao do elemento-chave', 'leitura humana do enquadramento e da volta 360 graus'],
          });
        }
      }

      manifest.consoleErrors ??= {};
      manifest.consoleErrors[profile] = consoleErrors;
      await context.close();
    }

    manifest.summary = {
      generated: manifest.captures.length,
      passed: manifest.captures.filter((c) => c.passed).length,
      failed: manifest.captures.filter((c) => !c.passed).map((c) => c.name),
    };
    fs.writeFileSync(path.join(N0_DIR, 'n0-manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`[m02-n0] generated=${manifest.summary.generated}/30 passed=${manifest.summary.passed}/30 failed=${JSON.stringify(manifest.summary.failed)}`);

    expect(manifest.captures).toHaveLength(30);
    expect(new Set(manifest.captures.map((c) => c.name)).size).toBe(30);
    for (const c of manifest.captures) expect(c.headings).toHaveLength(HEADINGS_DEG.length);
    expect(manifest.summary.failed).toEqual([]);
    for (const errs of Object.values(manifest.consoleErrors)) expect(errs).toEqual([]);
  });
});
