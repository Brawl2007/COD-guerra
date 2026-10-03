import test from 'node:test';
import assert from 'node:assert/strict';
import map from '../missions/m01-tczew/map-layout.json' with {type:'json'};
import {M01Simulation} from '../src/game/m01-simulation.js';
import {TczewWorld} from '../src/world/tczew-world.js';
import {M01_YARD_WAGON_PLAN,yardWagonLod,yardWagonState,yardWagonPosition,yardWagonFireDamage} from '../src/render/m01-yard-wagons.js';

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

test('wounded_dragged owns station_wagon_fire and snapshot restore preserves it without renderer state',()=>{
  const sim=new M01Simulation();sim.scene=null;sim.clock=12;
  sim.consume(E('wounded_dragged'));
  assert.ok(sim.destruction.includes('station_wagon_fire'));
  assert.equal(yardWagonState(M01_YARD_WAGON_PLAN[2],sim.destruction),'burned');
  const saved=sim.snapshot(),restored=new M01Simulation();restored.restoreSnapshot(saved);
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
