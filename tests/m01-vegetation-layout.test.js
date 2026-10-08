import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TczewWorld} from '../src/world/tczew-world.js';
import {M01_TREES} from '../src/world/m01-decoration-layout.js';
import {route} from './helpers/m01-route.js';
import {
  buildM01VegetationLayout,vegetationKeepOut,tallClearance,lowClearance,inPlayableBounds,polylineDistance,
  M01_VEGETATION_BUDGET,M01_TREE_SPECIES,M01_SHRUB_SPECIES,interleaveForDensity,
  M01_IN_BOUNDS_SHRUB_HEIGHT,M01_IN_BOUNDS_GRASS_HEIGHT,GROUND_MAX_HEIGHT
} from '../src/render/m01-vegetation-layout.js';
import {M01_VEGETATION_LOD,chooseShrubLod,vegetationNoise as envNoise} from '../src/render/m01-environment.js';

const world=new TczewWorld(),layout=buildM01VegetationLayout(world),keep=vegetationKeepOut(world);
const nearest=(items,i)=>Math.min(...items.filter((_,j)=>j!==i).map(o=>Math.hypot(o.x-items[i].x,o.z-items[i].z)));

test('vegetation layout is deterministic, pure and leaves the approved solid trees untouched',()=>{
  const again=buildM01VegetationLayout(new TczewWorld());
  assert.deepEqual(again,layout);
  assert.equal(layout.solid.length,17);
  assert.deepEqual(layout.solid.map(t=>[t.id,t.x,t.z,t.height,t.radius]),M01_TREES.map(t=>[t.id,t.x,t.z,t.height,t.radius]));
  assert.ok(layout.solid.every(t=>t.solid&&M01_TREE_SPECIES[t.species]));
  // Building the layout never changes physics: same obstacles, same tree colliders.
  const fresh=new TczewWorld();buildM01VegetationLayout(fresh);
  assert.deepEqual(fresh.obstacles,new TczewWorld().obstacles);assert.equal(fresh.treeObstacles.length,17);
  for(const file of ['m01-vegetation-layout.js','m01-vegetation-art.js','m01-environment.js']){
    const source=readFileSync(new URL(`../src/render/${file}`,import.meta.url),'utf8');
    assert.doesNotMatch(source,/Math\.random\s*\(/);assert.doesNotMatch(source,/src\/core\/random|from ['"].*random\.js['"]/);
    assert.doesNotMatch(source,/obstacles\.push|treeObstacles\s*=|colliders\.push/);
  }
  assert.equal(envNoise(19390901,4),envNoise(19390901,4));
});

test('vegetation stays inside the browser budget and keeps Low cheaper',()=>{
  assert.ok(layout.visualTrees.length<=M01_VEGETATION_BUDGET.visualTrees+10);
  assert.ok(layout.shrubs.length<=M01_VEGETATION_BUDGET.shrubs);
  const ground=layout.ground.filter(g=>g.type!=='reed'),reeds=layout.ground.filter(g=>g.type==='reed');
  assert.ok(ground.length<=M01_VEGETATION_BUDGET.groundCover&&reeds.length<=M01_VEGETATION_BUDGET.reeds);
  const {low,medium,high}=M01_VEGETATION_LOD;
  assert.ok(low.grassFade[1]<medium.grassFade[1]&&medium.grassFade[1]<high.grassFade[1]);
  assert.ok(low.shrubMid<medium.shrubMid&&medium.shrubMid<high.shrubMid);
  assert.equal(chooseShrubLod(low.shrubNear-1,'low'),'near');assert.equal(chooseShrubLod(low.shrubMid+1,'low'),'culled');
  assert.equal(chooseShrubLod(medium.shrubNear+1,'medium'),'mid');
  // Interleaved order keeps every-other-tuft (Low) spatially even: both halves cover the same extent.
  const order=interleaveForDensity(ground),half=order.filter((_,i)=>i%2===0),other=order.filter((_,i)=>i%2===1);
  const meanX=a=>a.reduce((n,g)=>n+g.x,0)/a.length;assert.ok(Math.abs(meanX(half)-meanX(other))<8);
});

test('trees, shrubs and ground cover are varied, clustered and never laid out on a grid',()=>{
  const trees=layout.visualTrees,species=new Set(trees.map(t=>t.species));
  assert.ok(species.size>=7,`species ${[...species]}`);
  const snags=trees.filter(t=>t.species==='snag').length;assert.ok(snags>=4&&snags<=trees.length*.08);
  const dist=trees.map((_,i)=>nearest(trees,i)),mean=dist.reduce((a,b)=>a+b,0)/dist.length;
  const cv=Math.sqrt(dist.reduce((a,d)=>a+(d-mean)**2,0)/dist.length)/mean;
  assert.ok(Math.min(...dist)>3,'trees overlap');assert.ok(cv>.25,`nearest-neighbour spacing too regular (cv ${cv})`);
  // No two trees share a silhouette key: no clones.
  const keys=new Set(trees.map(t=>`${t.species}:${t.height.toFixed(1)}:${t.radius.toFixed(3)}`));assert.equal(keys.size,trees.length);
  // Shrubs are clumped, not evenly spread: their spacing varies at least as much as the trees'.
  const shrubs=layout.shrubs.slice(0,300),sd=shrubs.map((_,i)=>nearest(shrubs,i)),sm=sd.reduce((a,b)=>a+b,0)/sd.length;
  assert.ok(Math.sqrt(sd.reduce((a,d)=>a+(d-sm)**2,0)/sd.length)/sm>.3);
  const shrubSpecies=new Set(layout.shrubs.map(s=>s.species));assert.equal(shrubSpecies.size,Object.keys(M01_SHRUB_SPECIES).length);
  const types=new Set(layout.ground.map(g=>g.type));assert.deepEqual([...types].sort(),['dry','meadow','reed','tall','weed']);
  const heights=layout.shrubs.map(s=>s.height);assert.ok(Math.max(...heights)-Math.min(...heights)>1.4);
});

test('decoration respects corridors, objectives, covers and the playable bounds',()=>{
  for(const t of layout.visualTrees){
    assert.ok(tallClearance(keep,t.x,t.z),`${t.id} in a keep-out`);
    assert.ok(!inPlayableBounds(keep,t.x,t.z),`${t.id} walkable non-solid trunk`);
  }
  for(const s of layout.shrubs){
    assert.ok(tallClearance(keep,s.x,s.z),`shrub at ${s.x},${s.z}`);
    assert.ok(s.height<=2.4);
    for(const line of keep.rails)assert.ok(polylineDistance(s.x,s.z,line)>=10);
  }
  for(const g of layout.ground.filter(g=>g.type!=='reed'))assert.ok(lowClearance(keep,g.x,g.z),`${g.type} at ${g.x},${g.z}`);
  for(const g of layout.ground.filter(g=>g.type==='reed'))assert.ok(g.x<26||g.x>264);
  // Visual-only cover never hides a standing or crouched actor inside the playable area (AI LOS ignores it).
  for(const sh of layout.shrubs.filter(sh=>inPlayableBounds(keep,sh.x,sh.z)))assert.ok(sh.height<=M01_IN_BOUNDS_SHRUB_HEIGHT);
  for(const g of layout.ground.filter(g=>g.type!=='reed'&&inPlayableBounds(keep,g.x,g.z)))assert.ok(g.h*GROUND_MAX_HEIGHT[g.type]<=M01_IN_BOUNDS_GRASS_HEIGHT+1e-9);
});

test('no shrub or visual tree stands on a path actually walked in the scripted mission',()=>{
  const trail=[];let tick=0;
  route(19390901,{onStep:({sim})=>{
    if(tick++%10)return;
    for(const a of [sim.player,...sim.allies,...sim.enemies])if(a.active&&a.alive&&a.x<30)trail.push([a.x,a.z]);
  }});
  assert.ok(trail.length>1000);
  const cell=new Map(),key=(x,z)=>`${Math.floor(x/8)}:${Math.floor(z/8)}`;
  for(const [x,z]of trail){const k=key(x,z);if(!cell.has(k))cell.set(k,[]);cell.get(k).push([x,z]);}
  const near=(x,z,r)=>{for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(const [px,pz]of cell.get(key(x+i*8,z+j*8))??[])if(Math.hypot(px-x,pz-z)<r)return [px,pz];return null;};
  for(const s of layout.shrubs){const hit=near(s.x,s.z,s.width*.5+1.5);assert.equal(hit,null,`shrub ${s.species} at ${s.x.toFixed(1)},${s.z.toFixed(1)} on path ${hit}`);}
  for(const t of layout.visualTrees)assert.equal(near(t.x,t.z,4),null,`${t.id} on path`);
});
