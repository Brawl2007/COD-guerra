// Offline gallery for the clip library V2: contact sheets and the clip table, from the committed GLB and manifest.
//   node tools/assets/m01-soldiers/render/gallery-v2.mjs [--out docs/assets/m01-soldiers]
// Needs no browser: the skinned LOD1 mesh is posed by the real three.js AnimationMixer and flat-shaded by a small
// z-buffer rasteriser (side and front views, 6 phases per clip, ankles in red = left, blue = right). These sheets are
// a review aid, not Chromium captures: the viewer-based capture (render/capture-motion.mjs) stays for CI / a human.
import fs from 'node:fs';
import zlib from 'node:zlib';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { loadGLB } from '../motion/rig.mjs';
import { parseGLB } from '../motion/library/audit.mjs';
import { LIBRARY_DIR, LIBRARY_FILE } from '../build-clip-library-v2.mjs';

const SCALE = 75, FRAMES = 6, COLS = 3;
const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); }
function png(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgb.buffer, rgb.byteOffset + y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const PALETTE = { body: [196, 160, 130], gear: [90, 100, 70], helmet: [70, 80, 60], rifle: [110, 70, 40], clip: [150, 150, 150], head: [196, 160, 130] };
const colourOf = name => PALETTE[Object.keys(PALETTE).find(k => name.includes(k))] ?? [120, 120, 130];
const VIEWS = {
  side: { W: Math.round(3.4 * SCALE), H: Math.round(2.5 * SCALE), sx: v => 1.7 * SCALE - v[2] * SCALE, sy: v => 2.15 * SCALE - v[1] * SCALE, depth: v => v[0], cam: [1, 0, 0] },
  front: { W: Math.round(1.7 * SCALE), H: Math.round(2.5 * SCALE), sx: v => 0.85 * SCALE - v[0] * SCALE, sy: v => 2.15 * SCALE - v[1] * SCALE, depth: v => -v[2], cam: [0, 0, -1] },
};

function posedTriangles(model) {
  const tris = [], p = new THREE.Vector3();
  for (const mesh of model.meshes) {
    const pos = mesh.geometry.attributes.position, idx = mesh.geometry.index.array, V = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { mesh.getVertexPosition(i, p).applyMatrix4(mesh.matrixWorld); V[i * 3] = p.x; V[i * 3 + 1] = p.y; V[i * 3 + 2] = p.z; }
    const col = colourOf(mesh.name);
    for (let i = 0; i < idx.length; i += 3) tris.push({ a: idx[i] * 3, b: idx[i + 1] * 3, c: idx[i + 2] * 3, V, col });
  }
  return tris;
}
function renderView(tris, markers, name) {
  const { W, H, sx, sy, depth, cam } = VIEWS[name], img = new Uint8Array(W * H * 3).fill(238), zb = new Float32Array(W * H).fill(-1e9);
  const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) { const o = (y * W + x) * 3; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; } };
  for (let x = 0; x < W; x++) put(x, Math.round(2.15 * SCALE), [150, 150, 150]);
  for (const t of tris) {
    const A = [t.V[t.a], t.V[t.a + 1], t.V[t.a + 2]], B = [t.V[t.b], t.V[t.b + 1], t.V[t.b + 2]], C = [t.V[t.c], t.V[t.c + 1], t.V[t.c + 2]];
    const n = [(B[1] - A[1]) * (C[2] - A[2]) - (B[2] - A[2]) * (C[1] - A[1]), (B[2] - A[2]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[2] - A[2]), (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0])];
    const shade = 0.35 + 0.65 * Math.abs((n[0] * cam[0] + n[1] * cam[1] + n[2] * cam[2]) / (Math.hypot(...n) || 1)), col = t.col.map(c => Math.round(c * shade));
    const ax = sx(A), ay = sy(A), bx = sx(B), by = sy(B), cx = sx(C), cy = sy(C), da = depth(A), db = depth(B), dc = depth(C);
    const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(den) < 1e-9) continue;
    for (let y = Math.max(0, Math.floor(Math.min(ay, by, cy))); y <= Math.min(H - 1, Math.ceil(Math.max(ay, by, cy))); y++) for (let x = Math.max(0, Math.floor(Math.min(ax, bx, cx))); x <= Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx))); x++) {
      const l1 = ((by - cy) * (x + 0.5 - cx) + (cx - bx) * (y + 0.5 - cy)) / den, l2 = ((cy - ay) * (x + 0.5 - cx) + (ax - cx) * (y + 0.5 - cy)) / den, l3 = 1 - l1 - l2;
      if (l1 < 0 || l2 < 0 || l3 < 0) continue;
      const d = l1 * da + l2 * db + l3 * dc, o = y * W + x;
      if (d > zb[o]) { zb[o] = d; put(x, y, col); }
    }
  }
  for (const m of markers) for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) put(Math.round(sx(m.p)) + dx, Math.round(sy(m.p)) + dy, m.c);
  return { W, H, img };
}
function sheet(frames) {
  const tiles = frames.map(f => ['side', 'front'].map(v => renderView(f.tris, f.markers, v))), tw = tiles[0].reduce((s, t) => s + t.W + 3, 0), th = tiles[0][0].H + 3, rows = Math.ceil(tiles.length / COLS);
  const W = tw * COLS, H = th * rows, out = new Uint8Array(W * H * 3).fill(255);
  tiles.forEach((tile, i) => { let ox = (i % COLS) * tw; const oy = Math.floor(i / COLS) * th; for (const t of tile) { for (let y = 0; y < t.H; y++) out.set(t.img.subarray(y * t.W * 3, (y + 1) * t.W * 3), ((oy + y) * W + ox) * 3); ox += t.W + 3; } });
  return png(W, H, out);
}

export async function renderGallery(outDir) {
  const lib = await parseGLB(await readFile(new URL(LIBRARY_FILE, LIBRARY_DIR))), manifest = JSON.parse(await readFile(new URL('manifest.json', LIBRARY_DIR)));
  const gltf = await loadGLB('m01_soldier_pl_lod1.glb'), scene = gltf.scene, meshes = [], mixer = new THREE.AnimationMixer(scene);
  scene.traverse(o => { if (o.isSkinnedMesh && o.userData.visible !== false) meshes.push(o); });
  const model = { meshes }, feet = ['foot_l', 'foot_r'].map(n => scene.getObjectByName(n)), dir = resolve(outDir, 'clip-library-v2');
  await mkdir(dir, { recursive: true });
  for (const clip of lib.animations) {
    const action = mixer.clipAction(clip); action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play();
    const loop = clip.userData.loop, frames = [];
    for (let i = 0; i < FRAMES; i++) {
      mixer.setTime(clip.duration * i / (loop ? FRAMES : FRAMES - 1)); scene.updateMatrixWorld(true);
      frames.push({ tris: posedTriangles(model), markers: feet.map((f, k) => ({ p: f.getWorldPosition(new THREE.Vector3()).toArray(), c: k ? [0, 0, 255] : [255, 0, 0] })) });
    }
    mixer.stopAllAction(); mixer.uncacheClip(clip);
    await writeFile(resolve(dir, `${clip.name}.png`), sheet(frames));
  }
  const rows = manifest.clips.map(c => {
    const drift = c.audit.maxContactDriftMm, seam = c.audit.loopSeam ? `${c.audit.loopSeam.positionMm} mm / ${c.audit.loopSeam.angleRad} rad` : '-';
    const contacts = `l ${c.contacts.l.length}, r ${c.contacts.r.length}`;
    return `| \`${c.name}\` | ${c.family} | ${c.mask} | ${c.durationS} | ${c.loop ? 'loop' : 'once'} | ${c.fps} | ${c.nominalSpeedMps || '-'} | ${contacts} | ${drift} | ${seam} | ${c.semantic} |`;
  });
  const table = `# M01 soldier clip library V2 (T08)\n\nGenerated by \`tools/assets/m01-soldiers/render/gallery-v2.mjs\` from \`${manifest.file}\` (${manifest.bytes} bytes, sha256 \`${manifest.sha256}\`). Durations in seconds; speed in m/s; contacts = number of ankle contact windows measured at 240 Hz; drift = largest ankle drift inside a contact window (limit ${manifest.audit.limits.contactDriftMm} mm); seam = largest bone position / orientation step between the last and the first key of a loop.\n\nContact sheets (\`clip-library-v2/<name>.png\`): software-rasterised skinned LOD1, side and front, ankles red = left / blue = right, ${FRAMES} phases per clip. Browser captures are left to CI or a human reviewer.\n\n| Clip | Family | Mask | Duration | Mode | fps | Nominal | Contacts | Drift mm | Loop seam | Description |\n| --- | --- | --- | ---: | --- | ---: | ---: | --- | ---: | --- | --- |\n${rows.join('\n')}\n`;
  await writeFile(resolve(outDir, 'clip-library-v2.md'), table);
  return manifest.clips.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--out');
  console.log(await renderGallery(i >= 0 ? process.argv[i + 1] : fileURLToPath(new URL('../../../../docs/assets/m01-soldiers', import.meta.url))), 'clips');
}
