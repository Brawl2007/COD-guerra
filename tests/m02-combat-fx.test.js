import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M02CombatFX} from '../src/render/m02-combat-fx.js';
import {M01Atmosphere} from '../src/render/m01-atmosphere.js';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';

function fixture(){
 const scene=new THREE.Scene(),material=new THREE.ShaderMaterial({uniforms:{cloud:{value:null}}}),quad=new THREE.PlaneGeometry(1,1);
 const atmosphere={quad,material,dustMaterial:material,puffBatches:[],billboardBatch:M01Atmosphere.prototype.billboardBatch,stylePuff:M01Atmosphere.prototype.stylePuff};
 const fx=new M02CombatFX(scene,atmosphere),sim=new M02BenchSimulation(),camera=new THREE.PerspectiveCamera(68,16/9,.12,8000);
 return {fx,sim,camera,dispose(){fx.dispose();for(const b of atmosphere.puffBatches)b.geometry.dispose();quad.dispose();material.dispose();}};
}

test('NPC impact FX use the actual obstructed round, not tactical aim; presentation preserves snapshot and RNG',()=>{
 const f=fixture(),{fx,sim,camera}=f;
 try{
  sim.enterAreaBC06();sim.allies=[];const gun=sim.enemies.find(a=>a.weapon==='mg34');sim.enemies=[gun];
  Object.assign(gun,{x:0,y:0,z:100,mag:50,suppressed:0});Object.assign(sim.player,{x:0,y:0,z:120,eyeHeight:1.65});
  sim.world.obstacles.push({id:'fx-wall',min:{x:-3,y:0,z:101},max:{x:3,y:3,z:101.3},material:'stone'});
  sim.fireActorBurst(gun,sim.player,{x:0,y:1.25,z:120},'enemy');
  const events=sim.drainEvents(),e=events.find(e=>e.type==='actor-burst');
  assert.equal(e.traces.length,1);assert.equal(e.traces[0].hitKind,'world');assert.equal(e.traces[0].material,'stone');
  assert.ok(e.traces[0].point.z<=101.3);assert.equal(e.target.z,120);assert.equal(sim.player.health,100);
  const before=sim.snapshot();fx.consume(events,sim);fx.update(sim,camera,'high',{daylight:1});
  assert.deepEqual(sim.snapshot(),before);assert.equal(fx.shots[0].point.z,e.traces[0].point.z);
  sim.clock+=.2;const later=sim.snapshot();fx.update(sim,camera,'high',{daylight:1});
  assert.equal(fx.counts.flash,0);assert.equal(fx.counts.tracer,0);assert.ok(fx.counts.dust>0);
  assert.deepEqual(sim.snapshot(),later);
  sim.restoreSnapshot(later);fx.update(sim,camera,'high',{daylight:1});
  assert.equal(fx.shots.length,0,'same-clock restore must clear effects from the replaced session');
 }finally{f.dispose();}
});

test('sustained fire keeps bounded M01 particle batches and expires without persistent laser lines or hit spheres',()=>{
 const f=fixture(),{fx,sim,camera}=f;
 try{
  fx.sync(sim);const geometries=Object.values(fx.batches).map(b=>b.geometry),childCount=fx.root.children.length;
  for(let i=0;i<512;i++)fx.shot({origin:{x:0,y:1,z:0},point:{x:0,y:1,z:100},hitKind:'none',material:'air'},0,{weapon:'mg34',shooterId:`gun${i%8}`,roundIndex:i});
  assert.equal(fx.shots.length,128);assert.equal(fx.dropped,384);
  sim.clock=.08;fx.update(sim,camera,'high',{daylight:1});
  assert.equal(fx.counts.flash,0);assert.ok(fx.counts.tracer>0);assert.equal(fx.counts.dust,0,'a miss in air cannot invent a ground impact');
  for(const b of Object.values(fx.batches))assert.ok(b.count<=b.instanceMatrix.count);
  assert.deepEqual(Object.values(fx.batches).map(b=>b.geometry),geometries);assert.equal(fx.root.children.length,childCount);
  sim.clock=5;fx.update(sim,camera,'high',{daylight:1});
  assert.equal(fx.shots.length,0);assert.equal(Object.values(fx.counts).reduce((a,b)=>a+b,0),0);
 }finally{f.dispose();}
});

test('rounded M02 event timestamps keep the current muzzle/blast alive at a fixed-tick floating-point boundary',()=>{
 const f=fixture(),{fx,sim,camera}=f;
 try{
  sim.clock=10.0999999999;
  fx.consume([
   {type:'actor-burst',clock:10.1,weapon:'mg34',shooterId:'clock-fixture',traces:[{origin:{x:0,y:1,z:0},point:{x:0,y:1,z:5},hitKind:'none',material:'air'}]},
   {type:'grenade-exploded',clock:10.1,center:{x:0,y:0,z:3}},
  ],sim);
  fx.update(sim,camera,'high',{daylight:1});
  assert.equal(fx.shots.length,1);assert.equal(fx.blasts.length,1);assert.equal(fx.counts.flash,2);
  sim.clock=10.2;fx.update(sim,camera,'high',{daylight:1});assert.equal(fx.counts.flash,0);
 }finally{f.dispose();}
});
