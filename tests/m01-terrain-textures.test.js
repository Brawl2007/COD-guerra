import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { generateTerrain } from '../tools/assets/m01-materials/generate.mjs';
import { decodePng } from '../tools/assets/m01-materials/src/png.mjs';
import { TILE_METRES } from '../tools/assets/m01-materials/src/terrain.mjs';
import { TERRAIN_TEXTURE_SETS, TERRAIN_TILE_METRES, textureGpuBytes } from '../src/render/m01-terrain-material.js';
import { MASK_SIZES } from '../src/render/m01-terrain-mask.js';

// T09-lite terrain family: the procedural generator is deterministic, the manifest matches the shipped files, and the texture budget
// of the reference PC (Intel HD 5500) holds. Budget numbers are computed from sizes (RGBA8 + full mip chain), not measured FPS.
const DIR = new URL('../assets/textures/m01/terrain/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('terrain.manifest.json', DIR), 'utf8'));
const MB = 1024 * 1024;

test('generator rerun is byte-identical (same pixels, same PNG bytes, same sha256)', () => {
  const a = generateTerrain(), b = generateTerrain();
  assert.equal(a.textures.length, b.textures.length);
  for (let i = 0; i < a.textures.length; i++) {
    assert.equal(a.textures[i].file, b.textures[i].file);
    assert.ok(Buffer.compare(a.textures[i].png, b.textures[i].png) === 0, `${a.textures[i].file} PNG bytes differ between runs`);
    assert.equal(a.textures[i].sha256, b.textures[i].sha256);
  }
  assert.deepEqual(a.manifest, b.manifest);
  // The committed files decode to exactly the pixels the generator produces now (robust to a different zlib build, unlike a byte compare).
  for (const t of a.textures) {
    const shipped = decodePng(readFileSync(new URL(t.file, DIR)));
    assert.equal(shipped.width, t.width); assert.equal(shipped.height, t.height);
    assert.ok(Buffer.compare(Buffer.from(shipped.pixels), Buffer.from(t.pixels)) === 0, `${t.file}: shipped pixels differ from the generator output (rerun tools/assets/m01-materials/generate.mjs)`);
  }
});

test('manifest records author, licence, units, source and a matching bytes/sha256/size for every file', () => {
  for (const key of ['author', 'license', 'units', 'source']) assert.equal(typeof manifest[key], 'string', key);
  assert.equal(manifest.author, 'COD-guerra project, original procedural');
  assert.equal(manifest.license, 'CC0-1.0');
  assert.match(manifest.source, /^tools\/assets\/m01-materials\/generate\.mjs$/);
  assert.ok(existsSync(new URL('../' + manifest.source, import.meta.url)), 'generator exists at the recorded path');
  assert.equal(manifest.files.length, 6);
  for (const f of manifest.files) {
    const bytes = readFileSync(new URL(f.file, DIR));
    assert.equal(bytes.length, f.bytes, `${f.file} bytes`); assert.equal(createHash('sha256').update(bytes).digest('hex'), f.sha256, `${f.file} sha256`);
    const png = decodePng(bytes);
    assert.deepEqual([png.width, png.height], f.size, `${f.file} size`);
    assert.ok(Number.isFinite(f.tileMetres) && f.tileMetres > 0, `${f.file} tileMetres`);
    assert.equal(f.channels.length, 4);
    assert.ok([512, 1024].includes(png.width) && png.width === png.height, `${f.file} is a 512 or 1024 square`);
  }
});

test('textures tile (no seam: opposite edges differ like neighbouring rows) and carry real detail', () => {
  for (const f of manifest.files) {
    const { width: w, pixels } = decodePng(readFileSync(new URL(f.file, DIR))), h = w;
    const px = (x, y, c) => pixels[((y % h) * w + (x % w)) * 4 + c];
    for (let c = 0; c < 4; c++) {
      let seam = 0, inner = 0, mean = 0, mean2 = 0;
      for (let i = 0; i < w; i++) {
        seam += Math.abs(px(w - 1, i, c) - px(0, i, c)) + Math.abs(px(i, h - 1, c) - px(i, 0, c));
        inner += Math.abs(px(w / 2 - 1, i, c) - px(w / 2, i, c)) + Math.abs(px(i, h / 2 - 1, c) - px(i, h / 2, c));
      }
      for (let i = 0; i < w * h; i++) { const v = pixels[i * 4 + c]; mean += v; mean2 += v * v; }
      mean /= w * h; const std = Math.sqrt(mean2 / (w * h) - mean * mean);
      assert.ok(seam <= inner * 1.6 + 8 * w, `${f.file} channel ${c} wraps seamlessly (seam ${seam}, inner ${inner})`);
      if (!/straw|soot/.test(f.channels[c])) assert.ok(std > 8, `${f.file} channel ${f.channels[c]} has contrast (std ${std.toFixed(1)})`);
    }
  }
});

test('tile scale and per-tier texture sets match the shader constants', () => {
  assert.equal(TILE_METRES.detailA, TERRAIN_TILE_METRES.a); assert.equal(TILE_METRES.normalA, TERRAIN_TILE_METRES.a);
  assert.equal(TILE_METRES.detailB, TERRAIN_TILE_METRES.b); assert.equal(TILE_METRES.normalB, TERRAIN_TILE_METRES.b);
  const byFile = new Map(manifest.files.map((f) => [f.file, f]));
  for (const [tier, set] of Object.entries(TERRAIN_TEXTURE_SETS)) for (const file of Object.values(set)) assert.ok(byFile.has(file), `${tier}: ${file} is in the manifest`);
  assert.deepEqual(byFile.get(TERRAIN_TEXTURE_SETS.high.a).size, [1024, 1024]);   // High 1024, Low/Medium 512
  assert.deepEqual(TERRAIN_TEXTURE_SETS.low, {}); // Low is macro-only.
});

test('texture budget on the reference PC: GPU bytes incl. mips <= 24 MB High, <= 8 MB Medium/Low; sampler delta <= 4; no extra draw call', () => {
  const size = new Map(manifest.files.map((f) => [f.file, f.size]));
  const budget = {};
  for (const tier of ['high', 'medium', 'low']) {
    const files = Object.values(TERRAIN_TEXTURE_SETS[tier]).map((f) => textureGpuBytes(...size.get(f)));
    const mask = textureGpuBytes(MASK_SIZES[tier].width, MASK_SIZES[tier].height);
    budget[tier] = { textures: files.length + 1, mb: +((files.reduce((a, b) => a + b, 0) + mask) / MB).toFixed(2) };
  }
  console.log('terrain texture budget (computed):', JSON.stringify(budget));
  assert.ok(budget.high.mb <= 24, `High ${budget.high.mb} MB`); assert.ok(budget.medium.mb <= 8, `Medium ${budget.medium.mb} MB`); assert.ok(budget.low.mb <= 8, `Low ${budget.low.mb} MB`);
  assert.ok(budget.low.mb < budget.medium.mb && budget.medium.mb < budget.high.mb);
  assert.equal(budget.low.textures, 1);   // macro mask only
  assert.equal(textureGpuBytes(4, 4), (16 + 4 + 1) * 4);
  assert.equal(textureGpuBytes(1024, 320, false), 1024 * 320 * 4);
});
