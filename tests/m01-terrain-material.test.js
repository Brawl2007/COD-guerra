import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TczewWorld } from '../src/world/tczew-world.js';
import { M01TerrainMaterial, TERRAIN_MATERIAL_ID, TERRAIN_TEXTURE_SETS, TERRAIN_SAMPLERS, textureGpuBytes, tierOf } from '../src/render/m01-terrain-material.js';
import { MASK_SIZES } from '../src/render/m01-terrain-mask.js';

// Presentation-only terrain material: tier policy, resource ownership and the shader patch points (no GL context needed).
const world = new TczewWorld();
const fakeLoad = (log = []) => async (url) => { log.push(url.split('/').pop()); const n = /1024/.test(url) ? 1024 : 512; return { width: n, height: n, close() {} }; };

test('tier policy: low = mask + one cheap texture, medium/high = mask + detail + normals', async () => {
  const sizes = {};
  for (const quality of ['low', 'medium', 'high']) {
    const log = [], t = new M01TerrainMaterial({ quality, load: fakeLoad(log) }); t.setWorld(world); await t.ready;
    const d = t.diagnostics; sizes[quality] = d;
    assert.equal(d.material, TERRAIN_MATERIAL_ID); assert.equal(d.quality, quality); assert.equal(d.tier, quality); assert.deepEqual(d.failures, []);
    assert.deepEqual(log.sort(), Object.values(TERRAIN_TEXTURE_SETS[quality]).sort());
    assert.equal(d.textures, Object.keys(TERRAIN_TEXTURE_SETS[quality]).length + 1);
    assert.deepEqual(d.mask, { ...MASK_SIZES[quality] });
    assert.equal(t.material.userData.m01LowDetail.value, quality === 'low' ? 1 : 0, 'same m01LowDetail contract as texturedSurface');
    t.dispose();
  }
  assert.ok(sizes.low.gpuBytes < sizes.medium.gpuBytes && sizes.medium.gpuBytes < sizes.high.gpuBytes);
  assert.ok(sizes.high.gpuBytes <= 24 * 1048576 && sizes.medium.gpuBytes <= 8 * 1048576 && sizes.low.gpuBytes <= 8 * 1048576);
  assert.equal(sizes.high.samplers - 2, TERRAIN_SAMPLERS - 2); assert.ok(TERRAIN_SAMPLERS - 2 <= 4, 'at most +4 samplers vs map+bumpMap');
  assert.equal(tierOf('ultra'), 'medium'); assert.equal(tierOf(undefined), 'medium');
});

test('quality change re-bakes the mask, swaps the set and disposes what it replaced (no leak)', async () => {
  const t = new M01TerrainMaterial({ quality: 'high', load: fakeLoad() }); t.setWorld(world); await t.ready;
  const oldMask = t.mask, oldTextures = Object.values(t.textures), disposed = [];
  for (const x of [oldMask, ...oldTextures]) x.addEventListener('dispose', () => disposed.push(x));
  t.sync('medium'); await t.ready;
  assert.equal(t.tier, 'medium'); assert.notEqual(t.mask, oldMask); assert.deepEqual(t.maskSize, { ...MASK_SIZES.medium });
  assert.equal(disposed.length, 1 + oldTextures.length, 'old mask and every old detail texture disposed');
  t.sync('medium'); assert.equal(disposed.length, 1 + oldTextures.length, 'same tier: nothing happens');
  const low = Object.values(t.textures); let lowDisposed = 0; for (const x of low) x.addEventListener('dispose', () => lowDisposed++);
  t.sync('low'); await t.ready; assert.equal(lowDisposed, low.length); assert.equal(t.diagnostics.files.length, 1);
  t.dispose(); t.dispose();
});

test('a failed texture load is reported, never thrown: the terrain falls back to the macro colour', async () => {
  const t = new M01TerrainMaterial({ quality: 'high', load: async (url) => { if (/normal-a/.test(url)) throw new Error('404'); return { width: 512, height: 512 }; } });
  t.setWorld(world); await t.ready;
  assert.equal(t.diagnostics.failures.length, 1); assert.match(t.diagnostics.failures[0], /normal-a/);
  assert.equal(t.uniforms.m01NrmA.value, t.flat.n, 'flat normal placeholder');
  assert.equal(t.diagnostics.files.length, 3); t.dispose();
});

test('a stale load (quality changed while fetching) is discarded and disposed', async () => {
  let release; const gate = new Promise((r) => { release = r; });
  const t = new M01TerrainMaterial({ quality: 'high', load: async () => { await gate; return { width: 512, height: 512 }; } });
  t.setWorld(world); const first = t.ready; t.sync('low'); release(); await Promise.all([first, t.ready]);
  assert.equal(t.tier, 'low'); assert.deepEqual(Object.keys(t.textures), ['a']); t.dispose();
});

test('shader patch: stock map / roughness / normal chunks are replaced, uniforms exposed, fog and shadows untouched', () => {
  const frag = THREE.ShaderLib.standard.fragmentShader, vert = THREE.ShaderLib.standard.vertexShader;
  for (const chunk of ['#include <map_fragment>', '#include <roughnessmap_fragment>', '#include <normal_fragment_maps>']) assert.ok(frag.includes(chunk), `three still has ${chunk}`);
  assert.ok(vert.includes('#include <begin_vertex>') && /objectNormal/.test(THREE.ShaderChunk.beginnormal_vertex));
  const t = new M01TerrainMaterial({ quality: 'high', load: fakeLoad() });
  const shader = { uniforms: {}, vertexShader: vert, fragmentShader: frag }; t.material.onBeforeCompile(shader, {});
  for (const u of ['m01Mask', 'm01DetA', 'm01DetB', 'm01NrmA', 'm01NrmB', 'm01Extent', 'm01Tiles', 'm01LowDetail']) assert.ok(u in shader.uniforms, u);
  assert.equal(shader.uniforms.m01LowDetail, t.material.userData.m01LowDetail, 'the shared quality uniform object');
  assert.ok(!shader.fragmentShader.includes('#include <map_fragment>') && !shader.fragmentShader.includes('#include <normal_fragment_maps>'));
  for (const kept of ['#include <fog_fragment>', '#include <lights_fragment_begin>', '#include <opaque_fragment>', '#include <colorspace_fragment>']) assert.ok(shader.fragmentShader.includes(kept), kept);
  assert.ok(/vM01Position=\(modelMatrix\*vec4\(transformed,1\.0\)\)/.test(shader.vertexShader));
  assert.equal(t.material.customProgramCacheKey(), TERRAIN_MATERIAL_ID);
  assert.equal(t.material.map, null); assert.equal(t.material.bumpMap, null);
  assert.ok(!/Math\.random/.test(String(M01TerrainMaterial)), 'no Math.random in the material');
  t.dispose();
});

test('gpu byte accounting matches the texture sizes', () => {
  assert.equal(textureGpuBytes(2048, 640), [2048 * 640, 1024 * 320, 512 * 160, 256 * 80, 128 * 40, 64 * 20, 32 * 10, 16 * 5, 8 * 2, 4 * 1, 2 * 1, 1 * 1].reduce((a, b) => a + b, 0) * 4);
});
