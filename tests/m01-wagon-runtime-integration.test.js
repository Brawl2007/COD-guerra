import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import map from '../missions/m01-tczew/map-layout.json' with {type:'json'};
import {M01Simulation} from '../src/game/m01-simulation.js';
import {TczewWorld} from '../src/world/tczew-world.js';
import {M01TrainWagons,M01_TRAIN_WAGON_PLAN,chooseWagonLod,wagonLodCandidates} from '../src/render/m01-train-wagons.js';
import {M01YardWagons,M01_YARD_WAGON_PLAN,chooseYardWagonLod,yardWagonState,yardWagonPosition,yardWagonFireDamage,yardWagonSourceCandidates} from '../src/render/m01-yard-wagons.js';

const E=name=>`evt_m01_${name}`;
const source=()=>{const scene=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial());mesh.name='body';scene.add(mesh);return {scene,animations:[]};};
class FakeAssets{
  constructor(fail=()=>false){this.fail=fail;this.calls=[];}
  async load(name,path){this.calls.push(path);if(this.fail(path))throw new Error('forced '+path);return source();}
}
const geometry=()=>[new THREE.BoxGeometry(1,1,1),new THREE.CylinderGeometry(1,1,1,6),new THREE.MeshStandardMaterial(),new THREE.MeshStandardMaterial()];

test('train and yard LOD selectors cover 0/1/2 with hysteresis and stable identities',()=>{
  for(const quality of ['low','medium','high']){
    assert.equal(chooseWagonLod(0,quality,null),0);assert.equal(chooseWagonLod(1e4,quality,null),2);
    assert.equal(chooseYardWagonLod(0,quality,null),0);assert.equal(chooseYardWagonLod(1e4,quality,null),2);
  }
  assert.equal(chooseWagonLod(85,'medium',0),0);assert.equal(chooseWagonLod(101,'medium',0),1);
  assert.equal(chooseYardWagonLod(70,'medium',0),0);assert.equal(chooseYardWagonLod(80,'medium',0),1);
  assert.equal(new Set(M01_TRAIN_WAGON_PLAN.map(w=>w.id)).size,65);assert.equal(new Set(M01_YARD_WAGON_PLAN.map(w=>w.id)).size,3);
  assert.deepEqual(wagonLodCandidates(0),[0,1,2]);assert.deepEqual(wagonLodCandidates(1),[1,2,0]);assert.deepEqual(wagonLodCandidates(2),[2,1,0]);
});

test('yard authority is only intact/burned; damaged art is never invented',()=>{
  const feature=map.features.find(f=>f.id==='freight_wagons_west');assert.deepEqual(M01_YARD_WAGON_PLAN.map(w=>w.position),feature.points);
  const [a,b,c]=M01_YARD_WAGON_PLAN;
  assert.equal(yardWagonState(a,['station_wagon_fire']),'intact');assert.equal(yardWagonState(b,['station_wagon_fire']),'intact');
  assert.equal(yardWagonState(c,[]),'intact');assert.equal(yardWagonState(c,['station_wagon_fire']),'burned');
  assert.ok(yardWagonSourceCandidates('covered','burned',0).every(k=>!k.includes('damaged')));
  assert.ok(yardWagonSourceCandidates('covered','intact',0).every(k=>!k.includes('damaged')&&!k.includes('burned')));
});

test('authoritative marker survives save/reload and checkpoint restore chooses the saved visual state',()=>{
  const sim=new M01Simulation();sim.scene=null;const before=sim.snapshot(false);
  sim.consume(E('wounded_dragged'));assert.ok(sim.destruction.includes('station_wagon_fire'));
  const burned=sim.snapshot(false),restored=new M01Simulation();restored.restoreSnapshot(burned);
  assert.equal(yardWagonState(M01_YARD_WAGON_PLAN[2],restored.destruction),'burned');
  restored.restoreSnapshot(before);assert.equal(yardWagonState(M01_YARD_WAGON_PLAN[2],restored.destruction),'intact');
  restored.restoreSnapshot(burned);assert.equal(yardWagonState(M01_YARD_WAGON_PLAN[2],restored.destruction),'burned');
});

test('yard positions/covers stay authoritative and fire/smoke use authored sockets',()=>{
  const world=new TczewWorld(),covers=map.coverNodes.filter(c=>['cv_wagon_1','cv_wagon_2'].includes(c.id));
  assert.equal(covers.length,2);assert.equal(M01_YARD_WAGON_PLAN[2].cover,undefined);
  for(const wagon of M01_YARD_WAGON_PLAN){const p=yardWagonPosition(wagon,world);assert.equal(p[1],world.heightAt(p[0],p[2]));}
  assert.equal(yardWagonFireDamage([],world),null);
  const fire=yardWagonFireDamage(['station_wagon_fire'],world),root=yardWagonPosition(M01_YARD_WAGON_PLAN[2],world);
  assert.equal(fire.id,'station_wagon_fire');assert.equal(fire.x,root[0]);assert.equal(fire.z,root[2]);assert.equal(fire.smokeVisible,true);
  assert.ok(Math.abs(fire.fireY-(root[1]+1.29))<1e-12);assert.ok(Math.abs((fire.y+3)-(root[1]+3.85))<1e-12);
});

test('yard renderer falls back to the best loaded asset, then procedural proxy, without changing semantic state',async()=>{
  const [box,cyl,wood,metal]=geometry(),parent=new THREE.Group();
  const partial=new M01YardWagons(parent,new FakeAssets(p=>/covered_burned_lod[01]/.test(p)),box,cyl,wood,metal,null);
  await partial.load();partial.update(['station_wagon_fire'],'high',new TczewWorld(),{x:-352,z:8},10);
  const burned=partial.diagnostics.wagons.find(w=>w.id==='yard_wagon_3');
  assert.equal(burned.state,'burned');assert.equal(burned.lod,0);assert.equal(burned.key,'covered:burned:2');assert.equal(burned.fire,true);partial.dispose();

  const total=new M01YardWagons(parent,new FakeAssets(()=>true),box,cyl,wood,metal,null);
  await total.load();total.update(['station_wagon_fire'],'high',new TczewWorld(),{x:-352,z:8},10);
  const fallback=total.diagnostics.wagons.find(w=>w.id==='yard_wagon_3');assert.equal(fallback.state,'burned');assert.equal(fallback.key,'fallback');assert.equal(fallback.fire,true);total.dispose();
  box.dispose();cyl.dispose();wood.dispose();metal.dispose();
});

test('train renderer uses all three real LODs and retains procedural fallback when every asset fails',async()=>{
  const [box,cyl,wood,metal]=geometry(),parent=new THREE.Group(),assets=new FakeAssets();
  const train=new M01TrainWagons(parent,assets,box,cyl,wood,metal);await train.load();
  train.update({x:1090,z:-2.5},'high');let d=train.diagnostics;assert.ok(d.lodDistribution[0]>0&&d.lodDistribution[1]>0&&d.lodDistribution[2]>0);assert.equal(d.proxies,0);
  assert.ok(d.loaded.includes('covered:0')&&d.loaded.includes('covered:1')&&d.loaded.includes('covered:2'));train.dispose();

  const failed=new M01TrainWagons(parent,new FakeAssets(()=>true),box,cyl,wood,metal);await failed.load();failed.update({x:1090,z:-2.5},'high');
  assert.equal(failed.diagnostics.proxies,65);failed.dispose();box.dispose();cyl.dispose();wood.dispose();metal.dispose();
});

test('missing individual LODs choose the closest real train asset and missing burned art falls back to intact GLB',async()=>{
  for(const [missing,expected] of [[0,1],[1,2],[2,1]]){
    const [box,cyl,wood,metal]=geometry(),parent=new THREE.Group();
    const assets=new FakeAssets(p=>new RegExp(`_lod${missing}\\.glbimport test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import map from '../missions/m01-tczew/map-layout.json' with {type:'json'};
import {M01Simulation} from '../src/game/m01-simulation.js';
import {TczewWorld} from '../src/world/tczew-world.js';
import {M01TrainWagons,M01_TRAIN_WAGON_PLAN,chooseWagonLod,wagonLodCandidates} from '../src/render/m01-train-wagons.js';
import {M01YardWagons,M01_YARD_WAGON_PLAN,chooseYardWagonLod,yardWagonState,yardWagonPosition,yardWagonFireDamage,yardWagonSourceCandidates} from '../src/render/m01-yard-wagons.js';

const E=name=>`evt_m01_${name}`;
const source=()=>{const scene=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial());mesh.name='body';scene.add(mesh);return {scene,animations:[]};};
class FakeAssets{
  constructor(fail=()=>false){this.fail=fail;this.calls=[];}
  async load(name,path){this.calls.push(path);if(this.fail(path))throw new Error('forced '+path);return source();}
}
const geometry=()=>[new THREE.BoxGeometry(1,1,1),new THREE.CylinderGeometry(1,1,1,6),new THREE.MeshStandardMaterial(),new THREE.MeshStandardMaterial()];

test('train and yard LOD selectors cover 0/1/2 with hysteresis and stable identities',()=>{
  for(const quality of ['low','medium','high']){
    assert.equal(chooseWagonLod(0,quality,null),0);assert.equal(chooseWagonLod(1e4,quality,null),2);
    assert.equal(chooseYardWagonLod(0,quality,null),0);assert.equal(chooseYardWagonLod(1e4,quality,null),2);
  }
  assert.equal(chooseWagonLod(85,'medium',0),0);assert.equal(chooseWagonLod(101,'medium',0),1);
  assert.equal(chooseYardWagonLod(70,'medium',0),0);assert.equal(chooseYardWagonLod(80,'medium',0),1);
  assert.equal(new Set(M01_TRAIN_WAGON_PLAN.map(w=>w.id)).size,65);assert.equal(new Set(M01_YARD_WAGON_PLAN.map(w=>w.id)).size,3);
  assert.deepEqual(wagonLodCandidates(0),[0,1,2]);assert.deepEqual(wagonLodCandidates(1),[1,2,0]);assert.deepEqual(wagonLodCandidates(2),[2,1,0]);
});

test('yard authority is only intact/burned; damaged art is never invented',()=>{
  const feature=map.features.find(f=>f.id==='freight_wagons_west');assert.deepEqual(M01_YARD_WAGON_PLAN.map(w=>w.position),feature.points);
  const [a,b,c]=M01_YARD_WAGON_PLAN;
  assert.equal(yardWagonState(a,['station_wagon_fire']),'intact');assert.equal(yardWagonState(b,['station_wagon_fire']),'intact');
  assert.equal(yardWagonState(c,[]),'intact');assert.equal(yardWagonState(c,['station_wagon_fire']),'burned');
  assert.ok(yardWagonSourceCandidates('covered','burned',0).every(k=>!k.includes('damaged')));
  assert.ok(yardWagonSourceCandidates('covered','intact',0).every(k=>!k.includes('damaged')&&!k.includes('burned')));
});

test('authoritative marker survives save/reload and checkpoint restore chooses the saved visual state',()=>{
  const sim=new M01Simulation();sim.scene=null;const before=sim.snapshot(false);
  sim.consume(E('wounded_dragged'));assert.ok(sim.destruction.includes('station_wagon_fire'));
  const burned=sim.snapshot(false),restored=new M01Simulation();restored.restoreSnapshot(burned);
  assert.equal(yardWagonState(M01_YARD_WAGON_PLAN[2],restored.destruction),'burned');
  restored.restoreSnapshot(before);assert.equal(yardWagonState(M01_YARD_WAGON_PLAN[2],restored.destruction),'intact');
  restored.restoreSnapshot(burned);assert.equal(yardWagonState(M01_YARD_WAGON_PLAN[2],restored.destruction),'burned');
});

test('yard positions/covers stay authoritative and fire/smoke use authored sockets',()=>{
  const world=new TczewWorld(),covers=map.coverNodes.filter(c=>['cv_wagon_1','cv_wagon_2'].includes(c.id));
  assert.equal(covers.length,2);assert.equal(M01_YARD_WAGON_PLAN[2].cover,undefined);
  for(const wagon of M01_YARD_WAGON_PLAN){const p=yardWagonPosition(wagon,world);assert.equal(p[1],world.heightAt(p[0],p[2]));}
  assert.equal(yardWagonFireDamage([],world),null);
  const fire=yardWagonFireDamage(['station_wagon_fire'],world),root=yardWagonPosition(M01_YARD_WAGON_PLAN[2],world);
  assert.equal(fire.id,'station_wagon_fire');assert.equal(fire.x,root[0]);assert.equal(fire.z,root[2]);assert.equal(fire.smokeVisible,true);
  assert.ok(Math.abs(fire.fireY-(root[1]+1.29))<1e-12);assert.ok(Math.abs((fire.y+3)-(root[1]+3.85))<1e-12);
});

test('yard renderer falls back to the best loaded asset, then procedural proxy, without changing semantic state',async()=>{
  const [box,cyl,wood,metal]=geometry(),parent=new THREE.Group();
  const partial=new M01YardWagons(parent,new FakeAssets(p=>/covered_burned_lod[01]/.test(p)),box,cyl,wood,metal,null);
  await partial.load();partial.update(['station_wagon_fire'],'high',new TczewWorld(),{x:-352,z:8},10);
  const burned=partial.diagnostics.wagons.find(w=>w.id==='yard_wagon_3');
  assert.equal(burned.state,'burned');assert.equal(burned.lod,0);assert.equal(burned.key,'covered:burned:2');assert.equal(burned.fire,true);partial.dispose();

  const total=new M01YardWagons(parent,new FakeAssets(()=>true),box,cyl,wood,metal,null);
  await total.load();total.update(['station_wagon_fire'],'high',new TczewWorld(),{x:-352,z:8},10);
  const fallback=total.diagnostics.wagons.find(w=>w.id==='yard_wagon_3');assert.equal(fallback.state,'burned');assert.equal(fallback.key,'fallback');assert.equal(fallback.fire,true);total.dispose();
  box.dispose();cyl.dispose();wood.dispose();metal.dispose();
});

test('train renderer uses all three real LODs and retains procedural fallback when every asset fails',async()=>{
  const [box,cyl,wood,metal]=geometry(),parent=new THREE.Group(),assets=new FakeAssets();
  const train=new M01TrainWagons(parent,assets,box,cyl,wood,metal);await train.load();
  train.update({x:1090,z:-2.5},'high');let d=train.diagnostics;assert.ok(d.lodDistribution[0]>0&&d.lodDistribution[1]>0&&d.lodDistribution[2]>0);assert.equal(d.proxies,0);
  assert.ok(d.loaded.includes('covered:0')&&d.loaded.includes('covered:1')&&d.loaded.includes('covered:2'));train.dispose();

  const failed=new M01TrainWagons(parent,new FakeAssets(()=>true),box,cyl,wood,metal);await failed.load();failed.update({x:1090,z:-2.5},'high');
  assert.equal(failed.diagnostics.proxies,65);failed.dispose();box.dispose();cyl.dispose();wood.dispose();metal.dispose();
});

).test(p));
    const train=new M01TrainWagons(parent,assets,box,cyl,wood,metal);await train.load();
    assert.equal(train.bestSource('covered',missing)?.lod,expected,`missing LOD${missing}`);
    assert.equal(train.bestSource('open',missing)?.lod,expected,`open missing LOD${missing}`);
    train.dispose();box.dispose();cyl.dispose();wood.dispose();metal.dispose();
  }

  const [box,cyl,wood,metal]=geometry(),parent=new THREE.Group();
  const yard=new M01YardWagons(parent,new FakeAssets(p=>p.includes('_burned_')),box,cyl,wood,metal,null);
  await yard.load();yard.update(['station_wagon_fire'],'high',new TczewWorld(),{x:-352,z:8},10);
  const w=yard.diagnostics.wagons.find(x=>x.id==='yard_wagon_3');
  assert.equal(w.state,'burned');assert.equal(w.lod,0);assert.equal(w.key,'covered:intact:0');assert.equal(w.fire,true);
  yard.dispose();box.dispose();cyl.dispose();wood.dispose();metal.dispose();
});

test('late GLB completion after dispose cannot reattach or populate yard sources',async()=>{
  let release;const gate=new Promise(resolve=>release=resolve);
  class DeferredAssets{async load(){await gate;return source();}}
  const [box,cyl,wood,metal]=geometry(),parent=new THREE.Group(),yard=new M01YardWagons(parent,new DeferredAssets(),box,cyl,wood,metal,null);
  const loading=yard.load();yard.dispose();release();await loading;
  assert.equal(yard.sources.size,0);assert.equal(yard.group.parent,null);assert.equal(yard.diagnostics.loaded.length,0);
  box.dispose();cyl.dispose();wood.dispose();metal.dispose();
});
