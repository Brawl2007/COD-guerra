import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import map from '../missions/m01-tczew/map-layout.json' with {type:'json'};
import {M01Simulation} from '../src/game/m01-simulation.js';
import {TczewWorld} from '../src/world/tczew-world.js';
import {driver,toRepair} from './helpers/m01-route.js';
import {M01YardWagons,M01_YARD_WAGON_PLAN,yardWagonLod,yardWagonState,yardWagonPosition,yardWagonFireDamage} from '../src/render/m01-yard-wagons.js';

const E=name=>`evt_m01_${name}`;

test('yard wagon plan uses the three reconstructed freight-wagon points and keeps collision authority separate',()=>{
  const feature=map.features.find(f=>f.id==='freight_wagons_west');
  assert.ok(feature);assert.equal(feature.classification,'RECONSTRUCTED');
  assert.deepEqual(M01_YARD_WAGON_PLAN.map(w=>w.position),feature.points);
  const covers=map.coverNodes.filter(c=>['cv_wagon_1','cv_wagon_2'].includes(c.id));
  assert.equal(covers.length,2);
  for(const wagon of M01_YARD_WAGON_PLAN.filter(w=>w.cover)){
    const cover=covers.find(c=>c.id===wagon.cover);assert.ok(cover);
    assert.equal(cover.position[1],0);
    assert.ok(Math.hypot(cover.position[0]-wagon.position[0],cover.position[2]-wagon.position[2])<4);
  }
  assert.equal(M01_YARD_WAGON_PLAN[2].cover,undefined,'the burned visual wagon must not invent a new cover collider');
});

test('only the third yard wagon switches to burned from the persisted station_wagon_fire state',()=>{
  const [a,b,c]=M01_YARD_WAGON_PLAN;
  assert.equal(yardWagonState(a,[]),'intact');
  assert.equal(yardWagonState(b,['station_wagon_fire']),'intact');
  assert.equal(yardWagonState(c,[]),'intact');
  assert.equal(yardWagonState(c,['station_wagon_fire']),'burned');
});

test('station_wagon_hit owns station_wagon_fire; the later casualty event does not create it',()=>{
  const sim=new M01Simulation();sim.scene=null;sim.clock=12;
  sim.consume(E('wounded_dragged'));
  assert.equal(sim.destruction.includes('station_wagon_fire'),false);
  const hit=new M01Simulation();hit.scene=null;hit.clock=12;
  hit.consume(E('station_wagon_hit'));
  assert.ok(hit.destruction.includes('station_wagon_fire'));
  assert.equal(yardWagonState(M01_YARD_WAGON_PLAN[2],hit.destruction),'burned');
  const saved=hit.snapshot(),restored=new M01Simulation();restored.restoreSnapshot(saved);
  assert.deepEqual(restored.destruction,saved.destruction);
  assert.equal(yardWagonState(M01_YARD_WAGON_PLAN[2],restored.destruction),'burned');
});

test('yard wagon LOD policy keeps low quality on LOD1 and does not alter the distant train LOD2 contract',()=>{
  assert.equal(yardWagonLod('low'),1);
  assert.equal(yardWagonLod('medium'),0);
  assert.equal(yardWagonLod('high'),0);
});


test('yard wagon visual roots use runtime terrain height instead of floating at the authored metadata y',()=>{
  const world=new TczewWorld();
  const positions=M01_YARD_WAGON_PLAN.map(w=>yardWagonPosition(w,world));
  positions.forEach((p,i)=>{
    assert.equal(p[0],M01_YARD_WAGON_PLAN[i].position[0]);
    assert.equal(p[2],M01_YARD_WAGON_PLAN[i].position[2]);
    assert.equal(p[1],world.heightAt(p[0],p[2]));
  });
  assert.equal(positions[1][1],-3);
  assert.equal(positions[2][1],-3);
  assert.notEqual(positions[1][1],M01_YARD_WAGON_PLAN[1].position[1],
    'metadata y=0 is not treated as a floating runtime ground plane');
});


test('station wagon fire presentation comes from persisted state, runtime terrain and authored asset sockets',()=>{
  const world=new TczewWorld(),wagon=M01_YARD_WAGON_PLAN[2];
  assert.equal(yardWagonFireDamage([],world,12),null);
  const damage=yardWagonFireDamage(['station_wagon_fire'],world,12),root=yardWagonPosition(wagon,world);
  assert.equal(damage.id,'station_wagon_fire');
  assert.equal(damage.x,root[0]);assert.equal(damage.z,root[2]);assert.equal(damage.started,12);assert.equal(damage.smokeVisible,true);
  assert.ok(Math.abs(damage.fireY-(root[1]+1.29))<1e-12);
  assert.ok(Math.abs((damage.y+3)-(root[1]+3.85))<1e-12);
});


test('the third-bomb beat, not the later station casualty event, owns the wagon hit',()=>{
  const {sim,step,until,walk}=driver();
  step({skip:true});
  walk(-66,26);walk(-15,26);walk(-15,2);walk(16,2);step({interact:true});
  until(()=>sim.consumedEvent(E('bombing_0434')),120);
  const bombingAt=sim.consumed[E('bombing_0434')];
  until(()=>sim.scene?.id==='cs_m01_bombing'&&sim.scene.elapsed>=8.55,20);
  assert.equal(sim.consumedEvent(E('wounded_dragged')),false,'the casualty event is later and cannot own the third bomb');
  assert.ok(sim.destruction.includes('station_wagon_fire'),'the t=8.5 third bomb must persist the wagon-fire state');
  const hit=sim.sectors.damage.filter(d=>d.id==='station_bomb');
  assert.equal(hit.length,1,'the third bomb creates one persisted station impact');
  assert.ok(hit[0].started-bombingAt>=8.45&&hit[0].started-bombingAt<8.7,
    `station impact must occur at the t=8.5 beat, got ${hit[0].started-bombingAt}`);
});


function reachThirdBomb(){
  const d=driver(),{sim,step,until,walk}=d;
  step({skip:true});walk(-66,26);walk(-15,26);walk(-15,2);walk(16,2);step({interact:true});
  until(()=>sim.consumedEvent(E('station_wagon_hit')),120);
  return d;
}

test('station wagon hit is idempotent: one state marker, one blast record and no second event/audio source',()=>{
  const {sim}=reachThirdBomb();sim.drainEvents();
  const before={marker:sim.destruction.filter(x=>x==='station_wagon_fire').length,
    damage:sim.sectors.damage.filter(d=>d.id==='station_bomb').length,
    consumed:sim.consumed[E('station_wagon_hit')]};
  assert.equal(sim.consume(E('station_wagon_hit')),false);
  assert.deepEqual({
    marker:sim.destruction.filter(x=>x==='station_wagon_fire').length,
    damage:sim.sectors.damage.filter(d=>d.id==='station_bomb').length,
    consumed:sim.consumed[E('station_wagon_hit')],
  },before);
  assert.deepEqual(sim.drainEvents(),[],'a repeated event emits no second m01-blast for Game audio/effects');
  assert.deepEqual(before,{marker:1,damage:1,consumed:before.consumed});
});

test('checkpoint before the third bomb restores intact; the real CP-B after it restores burned',()=>{
  const before=driver(),{sim,step,until,walk}=before;
  step({skip:true});
  assert.equal(sim.checkpoint.destruction.includes('station_wagon_fire'),false);
  walk(-66,26);walk(-15,26);walk(-15,2);walk(16,2);step({interact:true});
  until(()=>sim.consumedEvent(E('station_wagon_hit')),120);
  assert.ok(sim.destruction.includes('station_wagon_fire'));
  sim.restoreCheckpoint();
  assert.equal(sim.destruction.includes('station_wagon_fire'),false,'CP-A predates the hit');

  const after=toRepair(driver()).sim;
  assert.ok(after.checkpointsReached.includes('cp_m01_b_reorganizacao'));
  assert.ok(after.checkpoint.destruction.includes('station_wagon_fire'),'CP-B persists the third-bomb result');
  for(let i=0;i<20;i++)after.tick(.05);
  after.restoreCheckpoint();
  assert.ok(after.destruction.includes('station_wagon_fire'));
  assert.equal(yardWagonState(M01_YARD_WAGON_PLAN[2],after.destruction),'burned');
});

test('continuation snapshot and double restore keep one burned wagon without replaying its blast',()=>{
  const {sim}=reachThirdBomb(),saved=sim.snapshot();
  assert.ok(saved.destruction.includes('station_wagon_fire'));
  assert.equal(saved.sectors.damage.filter(d=>d.id==='station_bomb').length,1);
  const restored=new M01Simulation();
  assert.equal(restored.loadCheckpoint(JSON.stringify(saved)).ok,true);
  assert.equal(restored.loadCheckpoint(JSON.stringify(saved)).ok,true);
  assert.equal(restored.destruction.filter(x=>x==='station_wagon_fire').length,1);
  assert.equal(restored.sectors.damage.filter(d=>d.id==='station_bomb').length,1);
  restored.drainEvents();restored.processEvents();
  assert.equal(restored.consume(E('station_wagon_hit')),false);
  assert.deepEqual(restored.drainEvents(),[]);
});

test('the wagon visual state does not alter world colliders or the two authored wagon cover nodes',()=>{
  const sim=new M01Simulation();sim.scene=null;sim.clock=12;
  const beforeObstacles=structuredClone(sim.world.obstacles),beforeCovers=structuredClone(
    sim.world.coverNodes.filter(c=>['cv_wagon_1','cv_wagon_2'].includes(c.id)));
  sim.consume(E('station_wagon_hit'));
  assert.deepEqual(sim.world.obstacles,beforeObstacles);
  assert.deepEqual(sim.world.coverNodes.filter(c=>['cv_wagon_1','cv_wagon_2'].includes(c.id)),beforeCovers);
  assert.equal(M01_YARD_WAGON_PLAN[2].cover,undefined);
});

test('runtime has no separate damaged/burning selector: damaged GLBs are assets only and burned is the persistent visual state',()=>{
  const wagon=M01_YARD_WAGON_PLAN[2];
  assert.deepEqual(new Set([yardWagonState(wagon,[]),yardWagonState(wagon,['station_wagon_fire'])]),new Set(['intact','burned']));
});

test('blocking every yard GLB keeps all three wagons visible as procedural fallbacks and preserves burned state',async()=>{
  const paths=[],assets={load:async(_name,path)=>{paths.push(path);throw new Error('blocked by validation');}};
  const parent=new THREE.Group(),box=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,8);
  const wood=new THREE.MeshBasicMaterial(),metal=new THREE.MeshBasicMaterial();
  const view=new M01YardWagons(parent,assets,box,cylinder,wood,metal);
  await view.load('high');view.update(['station_wagon_fire'],'high',new TczewWorld());
  const diag=view.diagnostics;
  assert.equal(diag.wagons.length,3);
  assert.ok(diag.wagons.every(w=>w.key==='fallback'&&w.fallbackVisible&&!w.modelVisible));
  assert.equal(diag.wagons.find(w=>w.id==='yard_wagon_3').state,'burned');
  assert.ok(paths.some(p=>p.includes('m01_wagon_covered_burned_lod0.glb')));
  assert.equal(paths.some(p=>p.includes('_damaged_')),false,'damaged kits are not selected by this runtime');
  view.dispose();box.dispose();cylinder.dispose();wood.dispose();metal.dispose();
});

test('missing burned GLB falls back to the intact covered GLB without changing the semantic burned state',async()=>{
  const paths=[],assets={load:async(_name,path)=>{paths.push(path);if(path.includes('_burned_'))throw new Error('burned blocked');return{scene:new THREE.Group(),animations:[]};}};
  const parent=new THREE.Group(),box=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,8);
  const wood=new THREE.MeshBasicMaterial(),metal=new THREE.MeshBasicMaterial();
  const view=new M01YardWagons(parent,assets,box,cylinder,wood,metal);
  await view.load('high');view.update(['station_wagon_fire'],'high',new TczewWorld());
  const third=view.diagnostics.wagons.find(w=>w.id==='yard_wagon_3');
  assert.equal(third.state,'burned');
  assert.equal(third.key,'covered:intact:0');
  assert.equal(third.fallbackVisible,false);assert.equal(third.modelVisible,true);
  view.dispose();box.dispose();cylinder.dispose();wood.dispose();metal.dispose();
});
