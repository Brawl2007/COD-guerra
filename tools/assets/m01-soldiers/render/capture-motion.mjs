// Isolated textured asset review. No game module is imported or modified.
import { mkdir, readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { openStage } from './stage.mjs';
import { PACKAGE_DIR, VARIANTS } from '../motion/rig.mjs';

const args = process.argv.slice(2), value = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const out = resolve(value('--out', 'docs/verification/m01-runtime/soldier-motion-clips-production-v1'));
const preview = args.includes('--preview'), videos = !args.includes('--no-video'), phases = [0, 0.25, 0.5, 0.75, 1];
const manifest = JSON.parse(await readFile(new URL('manifest.json', PACKAGE_DIR))), report = { task: manifest.task, package_sha256: manifest.sha256, kind: 'isolated GLTFLoader/AnimationMixer asset review, not gameplay/playtest/FPS', captures: [], videos: [], variants: [], errors: [] };
await mkdir(join(out, 'captures'), { recursive: true }); await mkdir(join(out, 'sequences'), { recursive: true });
const temporary = await mkdtemp(join(tmpdir(), 'm01-motion-frames-'));
const st = await openStage({ width: 1120, height: 760 });
try {
  await st.page.goto(st.page.url().replace('viewer.html', 'motion-viewer.html')); await st.page.waitForFunction(() => window.ready === true);
  report.browser = await st.page.context().browser().version();
  report.renderer = await st.eval(() => { const canvas = document.querySelector('canvas'), gl = canvas.getContext('webgl2'), ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable'; });
  for (const clip of manifest.clips) {
    for (const phase of phases) {
      const sample = await st.eval(async arg => window.motionStage.show(...arg), [clip.name, phase, 'pl', 0]);
      const file = `captures/${clip.name}-${String(Math.round(phase * 100)).padStart(3, '0')}.jpg`;
      await st.page.screenshot({ path: join(out, file), type: 'jpeg', quality: 88 });
      report.captures.push({ file, ...sample, views: ['front', 'right side'], comparison: true });
    }
    // Seek in reverse after the clamped final frame: history cannot freeze or
    // change a pose selected by an explicit timestamp.
    for (const phase of [...phases].reverse()) {
      const sample = await st.eval(async arg => window.motionStage.show(...arg), [clip.name, phase, 'pl', 0]);
      const forward = report.captures.find(c => c.name === clip.name && c.phase === phase);
      if (sample.candidatePoseSignature !== forward.candidatePoseSignature) throw new Error(`${clip.name}: seek-history-dependent pose at ${phase}`);
    }
    if (videos && !preview) {
      // Three cycles expose the loop seam. One-shots hold the last pose instead
      // of hiding a discontinuity by looping a 90-degree turn back to zero.
      const fps = 30, duration = clip.loop ? clip.duration_s * 3 : clip.duration_s + 0.40, frames = Math.ceil(duration * fps);
      const frameDir = join(temporary, clip.name); await mkdir(frameDir);
      const signatures = new Set();
      for (let i = 0; i < frames; i++) {
        const seconds = i / fps, phase = clip.loop ? (seconds % clip.duration_s) / clip.duration_s : Math.min(1, seconds / clip.duration_s);
        const sample = await st.eval(async arg => window.motionStage.show(...arg), [clip.name, phase, 'pl', 0]); signatures.add(sample.candidatePoseSignature);
        await st.page.screenshot({ path: join(frameDir, `${String(i).padStart(4, '0')}.png`) });
      }
      const file = `sequences/${clip.name}.mp4`;
      const result = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', String(fps), '-i', join(frameDir, '%04d.png'), '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(out, file)], { encoding: 'utf8' });
      if (result.status !== 0) throw new Error(`ffmpeg: ${result.stderr}`);
      if (signatures.size < 8) throw new Error(`${clip.name}: sequence did not contain moving poses`);
      report.videos.push({ file, fps, frames, distinct_pose_signatures: signatures.size, duration_s: frames / fps, content: 'real mixer samples in frontal/side views; base left, new right' });
      console.log(JSON.stringify({ clip: clip.name, captures: 5, sequence_frames: frames }));
    }
  }
  if (!preview) for (const variant of VARIANTS) {
    for (const clip of manifest.clips) {
      const phase = clip.name === 'hit_front' ? 0.17 : clip.name === 'near_miss_duck' ? 0.30 : 0.25;
      const result = await st.eval(async arg => window.motionStage.show(...arg), [clip.name, phase, variant.nation, variant.lod]);
      const file = `captures/compat-${variant.nation}-lod${variant.lod}-${clip.name}.jpg`;
      await st.page.screenshot({ path: join(out, file), type: 'jpeg', quality: 86 }); report.variants.push({ file, ...result });
    }
  }
  report.package = await st.eval(() => window.motionStage.packageInfo()); report.errors = st.errors;
  report.pass = report.errors.length === 0 && report.package.packageMeshes === 0 && report.package.additionalCalls === 0;
  await writeFile(join(out, 'browser-asset-review.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ pass: report.pass, captures: report.captures.length, variants: report.variants.length, videos: report.videos.length, errors: report.errors, additional_draw_calls: report.package.additionalCalls }));
  if (!report.pass) process.exitCode = 1;
} finally { await st.close(); await rm(temporary, { recursive: true, force: true }); }
