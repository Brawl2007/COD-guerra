import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TczewWorld } from '../src/world/tczew-world.js';
import { M01TerrainMaterial, TERRAIN_MATERIAL_ID, TERRAIN_TEXTURE_SETS, TERRAIN_SAMPLERS, textureGpuBytes, tierOf } from '../src/render/m01-terrain-material.js';
import { MASK_SIZES, sampleMask } from '../src/render/m01-terrain-mask.js';
import { M01View } from '../src/render/m01-view.js';

// Presentation-only terrain material: tier policy, resource ownership and the shader patch points (no GL context needed).
const world = new TczewWorld();
const fakeLoad = (log = []) => async (url) => { log.push(url.split('/').pop()); const n = /1024/.test(url) ? 1024 : 512; return { width: n, height: n, close() {} }; };

test('tier policy: low = macro mask only, medium/high = mask + detail + normals', async () => {
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
  t.sync('low'); await t.ready; assert.equal(lowDisposed, low.length); assert.equal(t.diagnostics.files.length, 0);
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
  assert.equal(t.tier, 'low'); assert.deepEqual(Object.keys(t.textures), []); t.dispose();
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
  assert.equal(t.material.customProgramCacheKey(), TERRAIN_MATERIAL_ID + '-high');
  assert.equal(t.material.map, null); assert.equal(t.material.bumpMap, null);
  assert.ok(!/Math\.random/.test(String(M01TerrainMaterial)), 'no Math.random in the material');
  t.dispose();
});

test('gpu byte accounting matches the texture sizes', () => {
  assert.equal(textureGpuBytes(2048, 640), [2048 * 640, 1024 * 320, 512 * 160, 256 * 80, 128 * 40, 64 * 20, 32 * 10, 16 * 5, 8 * 2, 4 * 1, 2 * 1, 1 * 1].reduce((a, b) => a + b, 0) * 4);
});

const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
test('out-of-order loads and failures never poison the current tier; every bitmap closes once', async () => {
  const requests=[],images=[],updates=[];
  const t=new M01TerrainMaterial({quality:'high',load:url=>{const gate=deferred();requests.push({url,gate});return gate.promise;},onUpdate:()=>updates.push(t.tier)});
  const high=t.ready;t.sync('medium');const medium=t.ready;
  const makeImage=()=>{const image={width:512,height:512,closed:0,close(){this.closed++;}};images.push(image);return image;};
  // Current medium finishes first; High later fails while its remaining bitmaps resolve.
  for(const {gate} of requests.slice(4))gate.resolve(makeImage());await medium;
  const currentTextures=Object.values(t.textures);for(const texture of currentTextures)texture.userData.disposes=0;
  for(const texture of currentTextures)texture.addEventListener('dispose',()=>texture.userData.disposes++);
  requests[0].gate.reject(new Error('stale failure'));for(const {gate} of requests.slice(1,4))gate.resolve(makeImage());await high;
  assert.deepEqual(t.diagnostics.failures,[]);assert.equal(t.diagnostics.files.length,4);assert.deepEqual(updates,['medium']);
  assert.ok(images.slice(4).every(image=>image.closed===1),'stale decoded images close immediately');
  t.sync('low');await t.ready;assert.ok(images.every(image=>image.closed===1));assert.ok(currentTextures.every(texture=>texture.userData.disposes===1));assert.equal(t.gpu.textures,0);t.dispose();
});
test('dispose during pending load is idempotent; no callbacks, resources or world mutations after disposal', async () => {
  const requests=[],images=[];let updates=0;
  const t=new M01TerrainMaterial({quality:'high',load:()=>{const gate=deferred();requests.push(gate);return gate.promise;},onUpdate:()=>updates++});
  t.setWorld(world);const ready=t.ready,mask=t.mask,flat=Object.values(t.flat);let disposals=0;
  for(const resource of [t.material,mask,...flat])resource.addEventListener('dispose',()=>disposals++);
  t.dispose();t.dispose();const count=updates;t.sync('medium');t.setWorld(world);t.bakeMask();
  for(const gate of requests){const image={width:512,height:512,closed:0,close(){this.closed++;}};images.push(image);gate.resolve(image);}await ready;
  assert.equal(updates,count);assert.equal(disposals,flat.length+2);assert.equal(t.world,null);assert.equal(t.mask,null);assert.equal(t.gpu.textures,0);assert.ok(images.every(image=>image.closed===1));
});
test('steep slope patch samples three projections; Low shader constant-folds all detail', async () => {
  const t=new M01TerrainMaterial({quality:'low',load:()=>assert.fail('Low must not fetch detail')});await t.ready;
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};t.material.onBeforeCompile(shader);
  for(const projection of ['p.yz','p.xz','p.xy'])assert.ok(shader.fragmentShader.includes(projection));
  assert.ok(shader.fragmentShader.includes('const bool m01Low=true;'));assert.equal(t.diagnostics.samplers,1);t.dispose();
});

test('world replacement updates mask ownership and later tier rebakes without rebuilding ground geometry', async () => {
  const makeWorld=z=>({features:new Map([['road_approach_west',{polyline:[[-80,0,z],[80,0,z]]}]]),revision:0,buildings:[],covers:[],joints:[]});
  const first=makeWorld(0),replacement=makeWorld(80),before=JSON.stringify([...first.features]),after=JSON.stringify([...replacement.features]);
  const terrain=new M01TerrainMaterial({quality:'low',load:fakeLoad()});await terrain.ready;terrain.setWorld(first);
  const oldMask=terrain.mask;let oldDisposals=0;oldMask.addEventListener('dispose',()=>oldDisposals++);
  const geometry=new THREE.PlaneGeometry(2,2),view={world:first,solidWorld:first,revision:0,terrain,geometry:[geometry],solidGroup:new THREE.Group(),buildTerrain:()=>assert.fail('replacement must not rebuild geometry')};
  const at=(texture,x,z)=>sampleMask(texture.image.data,texture.image.width,texture.image.height,x,z).track;
  assert.ok(at(oldMask,0,0)<1);
  M01View.prototype.syncSolids.call(view,replacement);
  assert.equal(view.world,replacement);assert.equal(terrain.world,replacement);assert.equal(oldDisposals,1);assert.equal(view.geometry[0],geometry);
  assert.ok(at(terrain.mask,0,0)>3.9);assert.ok(at(terrain.mask,0,80)<1);
  const updated=Buffer.from(terrain.mask.image.data);terrain.sync('medium');await terrain.ready;
  assert.deepEqual(Buffer.from(terrain.mask.image.data),updated,'same-size tier rebake follows the replacement world');
  assert.equal(JSON.stringify([...first.features]),before);assert.equal(JSON.stringify([...replacement.features]),after);
  terrain.dispose();geometry.dispose();
});

test('partial fulfilled loads release immediately on Low or dispose while another request remains pending', async () => {
  for (const action of ['low','dispose']) {
    const requests=[],images=[];let updates=0;
    const terrain=new M01TerrainMaterial({quality:'high',load:()=>{const request=deferred();requests.push(request);return request.promise;},onUpdate:()=>updates++});
    const high=terrain.ready;
    const makeImage=()=>{const image={width:512,height:512,closes:0,close(){this.closes++;}};images.push(image);return image;};
    requests[0].resolve(makeImage());await Promise.resolve();
    const batch=[...terrain.pendingLoads][0],texture=batch.a;assert.ok(texture,'one texture decoded while three requests remain unresolved');
    let disposals=0;texture.addEventListener('dispose',()=>disposals++);
    assert.equal(images[0].closes,0);assert.equal(updates,0,'partial batch must not publish');
    // Assert cleanup before any of the other requests finishes (one can stay pending forever).
    if(action==='low')terrain.sync('low');else terrain.dispose();
    assert.equal(disposals,1);assert.equal(images[0].closes,1);assert.deepEqual(Object.keys(batch),[],'released batch no longer retains images');
    assert.equal(Object.keys(terrain.textures).length,0);
    if(action==='low')await terrain.ready;
    const currentUpdates=updates;
    for(const request of requests.slice(1))request.resolve(makeImage());await high;
    assert.ok(images.every(image=>image.closes===1),'late stale decoded images close exactly once');
    assert.equal(disposals,1,'completed stale batch cannot dispose the early texture twice');assert.equal(updates,currentUpdates);assert.equal(terrain.pendingLoads.size,0);
    terrain.dispose();terrain.dispose();assert.equal(disposals,1);assert.ok(images.every(image=>image.closes===1));
  }
});
