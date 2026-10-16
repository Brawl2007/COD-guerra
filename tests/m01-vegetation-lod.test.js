import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {M01_TREES} from '../src/world/m01-decoration-layout.js';
import {TczewWorld} from '../src/world/tczew-world.js';
import {driver,toRepair} from './helpers/m01-route.js';
import {chooseVegetationTier} from '../src/render/m01-vegetation-runtime.js';
import {M01_VEGETATION_LOD,M01_LEGACY_LEAF_CARD_ESTIMATE,vegetationNoise,chooseVegetationLod} from '../src/render/m01-environment.js';

test('vegetation variation is deterministic, visual-only and does not consume gameplay RNG',()=>{
  for(const seed of [0,1,19390901,0xffffffff]){
    const a=Array.from({length:96},(_,i)=>vegetationNoise(seed,i));
    const b=Array.from({length:96},(_,i)=>vegetationNoise(seed,i));
    assert.deepEqual(a,b);assert.ok(a.every(n=>n>=0&&n<1));assert.ok(new Set(a).size>90);
  }
  const source=readFileSync(new URL('../src/render/m01-environment.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/Math\.random\s*\(/);assert.doesNotMatch(source,/src\/core\/random|from ['"].*random\.js['"]/);
  const a=new M01Simulation(19390901),b=new M01Simulation(19390901);
  for(let tick=0;tick<180;tick++){
    const controls=tick===0?{skip:true}:tick%37===0?{lookX:2.5}:{};
    a.tick(.05,controls);for(let i=0;i<80;i++)vegetationNoise(0x51a7+tick,i);b.tick(.05,controls);
  }
  assert.deepEqual(a.snapshot(false),b.snapshot(false));
});

test('actual four-tier kit LOD uses 120m impostors, bounded hysteresis and 40m grass in every quality',()=>{
 assert.equal(M01_LEGACY_LEAF_CARD_ESTIMATE,1513);assert.deepEqual(Object.keys(M01_VEGETATION_LOD),['low','medium','high']);
 for(const [quality,q]of Object.entries(M01_VEGETATION_LOD)){assert.equal(q.mid,120);assert.deepEqual(q.grassFade,[34,40]);assert.equal(q.hysteresis,4);assert.equal(chooseVegetationTier(q.near-1,quality),0);assert.equal(chooseVegetationTier(q.near+3,quality,0),0);assert.equal(chooseVegetationTier(q.near+5,quality,0),1);assert.equal(chooseVegetationTier(q.lod1+5,quality,1),2);assert.equal(chooseVegetationTier(120,quality,2),3);assert.equal(chooseVegetationTier(117,quality,3),3);assert.equal(chooseVegetationTier(115,quality,3),2);assert.equal(chooseVegetationLod(120,quality),'far');assert.equal(chooseVegetationLod(116,quality,'far'),'far');assert.equal(chooseVegetationLod(115,quality,'far'),'mid');}
 assert.ok(M01_VEGETATION_LOD.low.densityStep>M01_VEGETATION_LOD.medium.densityStep);assert.ok(M01_VEGETATION_LOD.medium.densityStep>M01_VEGETATION_LOD.high.densityStep);
});

test('approved tree colliders and critical route remain unchanged by the visual pass',()=>{
  const expected=[
    [-36,-9,12],[-8,63,15],[-40,-24,16],[-79,-22,18],[-122,-28,17],[-169,-23,14],
    [-215,-29,16],[-265,-24,18],[-319,-30,15],[-365,-21,17],[-411,-27,15],
    [-49,77,16],[-103,69,18],[-159,73,15],[-207,88,17],[-349,82,18],[-406,74,14]
  ];
  assert.deepEqual(M01_TREES.map(t=>[t.x,t.z,t.height]),expected);
  for(let i=0;i<M01_TREES.length;i++)assert.equal(M01_TREES[i].radius,.25+(i%3)*.045);
  const world=new TczewWorld();assert.equal(world.trees.length,17);assert.equal(world.treeObstacles.length,17);
  for(let i=0;i<world.trees.length;i++){
    const t=world.trees[i],o=world.treeObstacles[i];
    assert.equal(o.id,t.id);assert.equal(o.min.x,t.x-t.radius);assert.equal(o.max.x,t.x+t.radius);
    assert.equal(o.min.z,t.z-t.radius);assert.equal(o.max.z,t.z+t.radius);assert.equal(o.min.y,t.y);assert.equal(o.max.y,t.y+t.height*.78);
  }
  const d=toRepair(driver());assert.equal(d.sim.active('cover_repair'),true);assert.equal(d.sim.world.treeObstacles.length,17);
});
