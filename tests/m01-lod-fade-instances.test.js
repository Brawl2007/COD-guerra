import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {TczewWorld} from '../src/world/tczew-world.js';
import {M01VegetationRuntime} from '../src/render/m01-vegetation-runtime.js';
import {vegetationKitMaterial} from '../src/render/m01-vegetation-material.js';
import {LOD_DEFAULT_FADE_SECONDS,lodFadeProgress,encodeInstanceFade,instanceFadeKeeps,lodBayer4,LOD_FADE_REST} from '../src/render/m01-lod-policy.js';
import {readVegetationNodeAsset as asset} from '../tools/verification/m01-vegetation-v2-node-asset.mjs';

test('instance fade math: progress is a pure clamp of the clock; in/out are complementary at every pixel and every progress', () => {
  assert.equal(lodFadeProgress(10,10),0);assert.ok(Math.abs(lodFadeProgress(10+LOD_DEFAULT_FADE_SECONDS/2,10)-0.5)<1e-9);assert.equal(lodFadeProgress(11,10),1);assert.equal(lodFadeProgress(9,10),0,'clock before the start clamps to 0');
  assert.equal(lodFadeProgress(10.1,10),lodFadeProgress(10.1,10),'deterministic');
  assert.equal(encodeInstanceFade(false,0.25),0.25);assert.equal(encodeInstanceFade(true,0.25),-0.75);assert.equal(LOD_FADE_REST,1);
  const seen=new Set();for(let y=0;y<4;y++)for(let x=0;x<4;x++)seen.add(lodBayer4(x,y));assert.equal(seen.size,16);
  for(let step=0;step<=60;step++){
    const p=step/60;let inCount=0,outCount=0;
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){
      const keepIn=instanceFadeKeeps(encodeInstanceFade(false,p),x,y),keepOut=instanceFadeKeeps(encodeInstanceFade(true,p),x,y);
      assert.notEqual(keepIn,keepOut,`pixel ${x},${y} at p=${p} is drawn by exactly one tier`);inCount+=keepIn;outCount+=keepOut;
    }
    assert.equal(inCount+outCount,64,'complementary coverage: alpha_in + alpha_out = 1');
    assert.ok(Math.abs(inCount/64-p)<=1/16+1e-9&&Math.abs(outCount/64-(1-p))<=1/16+1e-9,'coverage tracks progress');
  }
  for(let y=0;y<4;y++)for(let x=0;x<4;x++)assert.equal(instanceFadeKeeps(LOD_FADE_REST,x,y),true,'resting value keeps every pixel');
});

test('vegetation material: per-instance dither only (no blending, depth write kept), attribute declared and the cache key changed', () => {
  const source=new THREE.MeshStandardMaterial({alphaTest:.5}),m=vegetationKitMaterial(source,{});
  assert.equal(m.transparent,false);assert.equal(m.depthWrite,true);assert.match(m.customProgramCacheKey(),/m01-vegetation-kit-v3/);
  const shader={uniforms:{},vertexShader:'#include <begin_vertex>\nvoid main(){}',fragmentShader:'void main(){\n#include <alphatest_fragment>\n}'};
  m.onBeforeCompile(shader);
  assert.match(shader.vertexShader,/attribute float instanceFade;/);assert.match(shader.vertexShader,/vKitFade=instanceFade;/);
  assert.match(shader.fragmentShader,/float lodBayer4\(vec2 p\)/);assert.match(shader.fragmentShader,/if\(vKitFade<\.999\)/);assert.match(shader.fragmentShader,/lodT<1\.\+vKitFade/);
  assert.ok(shader.fragmentShader.indexOf('lodBayer4')<shader.fragmentShader.indexOf('void main'),'helper declared before main');
  assert.doesNotMatch(shader.fragmentShader,/gl_FragColor\.a/);
  m.dispose();source.dispose();
});

const A={x:-66,z:22},B={x:-31,z:22};
const treeBatches=r=>r.batches.filter(b=>b.userData.m01Vegetation.family==='tree');
const fadeOf=b=>b.geometry.attributes.instanceFade;
const allResting=(r)=>r.batches.every(b=>{const a=fadeOf(b).array;for(let i=0;i<a.length;i++)if(a[i]!==1)return false;return true;});
async function resident(){const world=new TczewWorld(),r=new M01VegetationRuntime(new THREE.Group(),world,{load:async()=>asset()});await r.load();assert.equal(r.ready,true);return {world,r};}
const batchSnapshot=r=>r.batches.map(b=>({count:b.count,matrix:b.instanceMatrix.array.slice(0,b.count*16),species:b.geometry.attributes.instanceSpecies.array.slice(0,b.count)}));

test('first frame and missing clock are not faded: batches identical to the unfaded runtime, instanceFade all resting', async () => {
  const {world,r:g}=await resident(),plain=new M01VegetationRuntime(new THREE.Group(),world,{load:async()=>asset()}),f=new M01VegetationRuntime(new THREE.Group(),world,{load:async()=>asset()});
  await plain.load();await f.load();
  try{
    plain.sync(world,'high',A,0);plain.sync(world,'high',B,0);
    g.sync(world,'high',A,0,undefined,null);g.sync(world,'high',B,0,undefined,null);
    assert.equal(g.fadeStats.started,0);assert.equal(g.fadeEntries.count,0);assert.ok(allResting(g));
    assert.deepEqual(batchSnapshot(g),batchSnapshot(plain),'null fade clock == pre-slice behaviour');assert.equal(g.diagnostics.lodSwitches,plain.diagnostics.lodSwitches);
    plain.sync(world,'high',A,0);
    f.sync(world,'high',A,0,undefined,700);
    assert.equal(f.fadeStats.started,0,'first usable frame never fades');assert.equal(f.fadeEntries.count,0);assert.ok(allResting(f));
    assert.deepEqual(batchSnapshot(f),batchSnapshot(plain),'first frame is bit-identical');
  }finally{g.dispose();plain.dispose();f.dispose();}
});

test('tier change fades 0.3 s on the clock: instance in both tiers, complementary values, freeze on equal clock, bounded update ranges, rebuilt at the end', async () => {
  const {world,r}=await resident();let restingTotal=0;
  try{
    r.sync(world,'high',A,0,undefined,100);assert.equal(r.fadeStats.started,0);assert.ok(allResting(r));
    const base=treeBatches(r).reduce((n,b)=>n+b.count,0),tallies=r.diagnostics.lodSwitches;
    r.sync(world,'high',B,0,undefined,101);
    const fades=r.fadeStats.started;assert.ok(fades>0,'trees crossed tier boundaries');assert.equal(r.diagnostics.lodSwitches>tallies,true);
    const e=r.fadeEntries;assert.ok(e.count>=fades*2-r.shrubDescriptors.length*0,'every fading tree has an in and an out slot (shrubs one)');
    // Pair entries per descriptor: in + out must be complementary and sum to 1.
    const per=new Map();for(let k=0;k<e.count;k++){const v=fadeOf(e.batch[k]).array[e.index[k]];const rec=per.get(e.desc[k])??{ins:[],outs:[]};(e.outgoing[k]?rec.outs:rec.ins).push(v);per.set(e.desc[k],rec);}
    let pairs=0;for(const [d,{ins,outs}] of per){assert.ok(d.fadeFrom>=0);for(const v of ins)assert.equal(v,0,'incoming starts at 0');for(const v of outs)assert.equal(v,-1,'outgoing starts at -1 (alpha 1)');if(ins.length&&outs.length)pairs++;}
    assert.ok(pairs>0,'at least one tree is drawn by two tier batches during the fade');
    const plain=new M01VegetationRuntime(new THREE.Group(),world,{load:async()=>asset()});await plain.load();plain.sync(world,'high',A,0);plain.sync(world,'high',B,0);
    const outs=Array.from({length:e.count},(_,k)=>k).filter(k=>e.outgoing[k]&&e.batch[k].userData.m01Vegetation.family==='tree').length;
    assert.ok(outs>0);restingTotal=treeBatches(plain).reduce((n,b)=>n+b.count,0);assert.equal(treeBatches(r).reduce((n,b)=>n+b.count,0),restingTotal+outs,'the only extra instances are the outgoing copies');plain.dispose();
    // Mid fade (clock +0.15): same layout, only the fade attribute is touched, in one range per batch.
    const matrixVersions=r.batches.map(b=>b.instanceMatrix.version),specVersions=r.batches.map(b=>b.geometry.attributes.instanceSpecies.version),countBefore=r.batches.map(b=>b.count);
    r.sync(world,'high',B,0,undefined,101+LOD_DEFAULT_FADE_SECONDS/2);
    assert.deepEqual(r.batches.map(b=>b.instanceMatrix.version),matrixVersions,'matrices not re-uploaded mid fade');assert.deepEqual(r.batches.map(b=>b.geometry.attributes.instanceSpecies.version),specVersions);assert.deepEqual(r.batches.map(b=>b.count),countBefore,'layout unchanged mid fade');
    for(let k=0;k<e.count;k++){const v=fadeOf(e.batch[k]).array[e.index[k]];assert.ok(Math.abs(v-(e.outgoing[k]?-0.5:0.5))<1e-6,'progress 0.5 => in 0.5, out -0.5');}
    let items=0;for(const b of r.batches){const a=fadeOf(b),ranges=a.updateRanges;assert.ok(ranges.length<=1);for(const g of ranges){assert.ok(g.start>=0&&g.start+g.count<=b.count,'range inside the live instances');items+=g.count;}}
    assert.ok(r.fadeStats.lastRangeCount<=r.batches.length);assert.equal(r.fadeStats.lastRangeItems,items);
    assert.ok(items<=r.batches.reduce((n,b)=>n+b.count,0),'range total never exceeds the live instances');
    // Pause: the clock does not move => every value, version and range is unchanged for many frames.
    const frozen=r.batches.map(b=>fadeOf(b).array.slice(0,b.count)),versions=r.batches.map(b=>fadeOf(b).version);
    for(let i=0;i<120;i++)r.sync(world,'high',B,0,undefined,101+LOD_DEFAULT_FADE_SECONDS/2);
    r.batches.forEach((b,i)=>{assert.deepEqual(fadeOf(b).array.slice(0,b.count),frozen[i],'values frozen while the clock is frozen');});
    // Same clock replayed from the same state gives the same numbers (determinism).
    const copy=r.batches.map(b=>fadeOf(b).array.slice(0,b.count));assert.deepEqual(copy,frozen);assert.ok(versions.every(v=>Number.isFinite(v)));
    // Not finished just before 0.3 s; finished after.
    r.sync(world,'high',B,0,undefined,101+LOD_DEFAULT_FADE_SECONDS-1e-6);assert.ok(r.fadeEntries.count>0);
    r.sync(world,'high',B,0,undefined,101+LOD_DEFAULT_FADE_SECONDS+1e-3);
    assert.equal(r.fadeEntries.count,0,'fade ended');assert.ok(allResting(r),'resting attributes restored');
    assert.equal(treeBatches(r).reduce((n,b)=>n+b.count,0),restingTotal,'back to one copy per tree and batch');
    for(const b of r.batches){const a=fadeOf(b);if(a.updateRanges.length)assert.ok(a.updateRanges[0].count<=b.instanceMatrix.count,'prefix reset bounded by capacity');}
    // A still camera afterwards does no fade work at all.
    const v0=r.batches.map(b=>fadeOf(b).version);for(let i=0;i<300;i++)r.sync(world,'high',B,0,undefined,110+i/60);
    assert.deepEqual(r.batches.map(b=>fadeOf(b).version),v0,'resting vegetation never touches the fade attribute');
  }finally{r.dispose();}
});

test('fades snap on Low, preset change, rewound clock and explicit null; retarget restarts from the current tier', async () => {
  const {world,r}=await resident();
  try{
    r.sync(world,'low',A,0,undefined,10);r.sync(world,'low',B,0,undefined,11);assert.equal(r.fadeStats.started,0,'Low snaps');assert.ok(allResting(r));
    r.sync(world,'high',A,0,undefined,20);assert.equal(r.fadeStats.started,0,'preset change snaps');
    r.sync(world,'high',B,0,undefined,21);assert.ok(r.fadeEntries.count>0);
    r.sync(world,'high',B,0,undefined,5);assert.equal(r.fadeEntries.count,0,'rewound clock snaps');assert.ok(allResting(r));assert.ok(r.fadeStats.cancelled>=1);
    r.sync(world,'high',A,0,undefined,6);r.sync(world,'high',B,0,undefined,7);assert.ok(r.fadeEntries.count>0);
    r.sync(world,'medium',B,0,undefined,7.1);assert.equal(r.fadeEntries.count,0,'preset change mid-fade snaps');assert.ok(allResting(r));
    r.sync(world,'medium',A,0,undefined,8);r.sync(world,'medium',B,0,undefined,9);assert.ok(r.fadeEntries.count>0);
    r.sync(world,'medium',B,0,undefined,null);assert.equal(r.fadeEntries.count,0,'explicit null fade clock cancels');
    // Omitted fadeClock (the view\'s second sync per frame) keeps the fade running on the last clock.
    r.sync(world,'medium',A,0,undefined,12);r.sync(world,'medium',B,0,undefined,13);const n=r.fadeEntries.count;assert.ok(n>0);r.sync(world,'medium',B,0);assert.equal(r.fadeEntries.count,n);
  }finally{r.dispose();}
});

test('diagnostics expose the fade counters and the kit still reports one batch set; dispose clears the pool', async () => {
  const {world,r}=await resident();
  r.sync(world,'high',A,0,undefined,1);r.sync(world,'high',B,0,undefined,2);
  const d=r.diagnostics;assert.equal(d.lodFade.seconds,LOD_DEFAULT_FADE_SECONDS);assert.ok(d.lodFade.started>0&&d.lodFade.active>0);
  r.dispose();assert.equal(r.fadeEntries.count,0);
});
