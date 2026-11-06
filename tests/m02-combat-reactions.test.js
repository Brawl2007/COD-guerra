import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {M02Characters} from '../src/render/m02-character-adapter.js';
import {m02VisualActor} from '../src/render/m02-presentation.js';
import {actorPose} from '../src/render/m01-actor-pose.js';
import {viewModelFixture} from './helpers/m01-viewmodel-fixture.js';
import * as THREE from 'three';

test('actual M02 hits feed the shared M01 death clock, freeze the correct heading and survive checkpoint restore',async()=>{
 const sim=new M02BenchSimulation();sim.clock=10;sim.allies=[];
 const enemy=sim.enemies[0];Object.assign(enemy,{x:0,y:0,z:108,health:100,alive:true,facing:.7,crouched:false,eyeHeight:1.65});sim.enemies=[enemy];
 const shot=sim.fireDirectRay({x:0,y:1.3,z:100},{x:0,y:0,z:1},20);assert.equal(shot.hitId,enemy.id);
 assert.equal(enemy.alive,false);assert.equal(enemy.hitAt,10);assert.equal(enemy.diedAt,10);assert.equal(enemy.deathYaw,.7);
 const source=await viewModelFixture(),characters=new M02Characters(new THREE.Scene());characters.clips=source.clips;
 try{
  const visual=m02VisualActor(enemy,'enemy',10.2),sample=characters.sample(visual,10.2,[],actorPose(visual,10.2));
  assert.equal(sample.clip,'fallen');assert.ok(Math.abs(sample.time-.2)<.0001,'the body must fall over time instead of snapping to the final frame');
  const saved=sim.snapshot();sim.restoreSnapshot(saved);assert.equal(sim.enemies[0].diedAt,10);
  const before=sim.snapshot(),bad=structuredClone(saved);bad.enemies[0].diedAt=Infinity;assert.throws(()=>sim.restoreSnapshot(bad),/inválid/);assert.deepEqual(sim.snapshot(),before);
 }finally{characters.dispose();source.dispose();}
});

test('a wall-blocked round cannot manufacture a hit reaction or a death timestamp',()=>{
 const sim=new M02BenchSimulation();sim.clock=4;const enemy=sim.enemies.find(e=>e.id==='DE-A07');sim.enemies=[enemy];
 const hp=enemy.health;sim.fireDirectRay({x:-41,y:1.3,z:-16},{x:1,y:0,z:0},20);
 assert.equal(enemy.health,hp);assert.equal(enemy.hitAt,undefined);assert.equal(enemy.diedAt,undefined);
});

test('a bullet hitting the shooter\'s nearby wall cannot remotely suppress its target; impacts on the target cover can',()=>{
 for(const wallZ of [101,118]){
  const sim=new M02BenchSimulation();sim.enterAreaBC06();sim.allies=[];
  const gun=sim.enemies.find(a=>a.weapon==='mg34');sim.enemies=[gun];Object.assign(gun,{x:0,y:0,z:100,mag:50,suppressed:0});
  Object.assign(sim.player,{x:0,y:0,z:120,eyeHeight:1.65,suppressed:0});
  sim.world.obstacles.push({id:'suppression-fixture',min:{x:-3,y:0,z:wallZ},max:{x:3,y:3,z:wallZ+.3},material:'stone'});
  sim.fireActorBurst(gun,sim.player,{x:0,y:1.25,z:120},'enemy');
  assert.equal(sim.player.health,100);assert.equal(gun.mag,49);
  if(wallZ===101)assert.equal(sim.player.suppressed,0);else assert.ok(sim.player.suppressed>0);
 }
});
