import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {m02VisualActor} from '../src/render/m02-presentation.js';
import {stepActorNavigation} from '../src/game/m02-combat-ai.js';

function evacuation(){const s=new M02BenchSimulation();s.enterAreaCC09();s.startC10OrderChanges();s.detonateC10FixedArtillery();s.enemies=[];s.allies=[];return s;}
test('C11 respects the authored stagger and presents mobile wounded men walking unarmed rather than sliding in a lying pose',()=>{
 const sim=evacuation(),last=sim.areaC.lastGroup.at(-1),start=[last.x,last.z];
 for(let i=0;i<40;i++)sim.tick(.05,{});
 assert.deepEqual([last.x,last.z],start);assert.equal(last.moving,false);assert.equal(sim.areaC.lastGroup[0].moving,true);
 const wounded=sim.areaC.lastGroup.find(a=>a.wounded),visual=m02VisualActor({...wounded,weapon:'wz29'},'ally',sim.clock);
 assert.equal(visual.role,'MEDIC');assert.equal(visual.state,'ADVANCE');assert.ok(visual.motion.speed>0&&visual.motion.odometer>0);
 const underFire=m02VisualActor({...wounded,weapon:'wz29',suppressed:1},'ally',sim.clock);
 assert.equal(underFire.suppressedUntil,0,'presentation cannot turn a physically walking man into a pinned crouched body');
});

test('all twelve evacuate through the real C11 solids and portals, including when the direct door has closed',()=>{
 const sim=evacuation();sim.world.setDoorState('door_b09_east_yard','closed');
 for(let i=0;i<2000&&!sim.areaC.lastGroup.every(a=>a.evacuated);i++){
  sim.tick(.05,{});
  for(const actor of sim.areaC.lastGroup)for(const ob of sim.world.obstacles){
   if(ob.walkThrough||ob.max.y<=actor.y+.1||ob.min.y>=actor.y+1.75)continue;
   const distance=Math.hypot(Math.max(ob.min.x-actor.x,0,actor.x-ob.max.x),Math.max(ob.min.z-actor.z,0,actor.z-ob.max.z));
   assert.ok(distance>=actor.radius-.02,`${actor.id} intersects ${ob.id}`);
  }
 }
 assert.equal(sim.flags['m02.last_group_survivors'],12);assert.equal(sim.areaC.lastGroup.filter(a=>a.evacuated).length,12);
});

test('C11 movement and door queues resume identically; corrupted optional routes fail before mutating the mission',()=>{
 const sim=evacuation();for(let i=0;i<300;i++)sim.tick(.05,{});
 const saved=sim.snapshot();sim.drainEvents();for(let i=0;i<100;i++)sim.tick(.05,{});
 const expected=sim.snapshot(),events=sim.drainEvents();sim.restoreSnapshot(saved);sim.drainEvents();for(let i=0;i<100;i++)sim.tick(.05,{});
 assert.deepEqual(sim.snapshot(),expected);assert.deepEqual(sim.drainEvents(),events);
 const bad=structuredClone(saved);bad.areaC.lastGroup[0].navCorners=[{x:Infinity,z:0}];assert.throws(()=>sim.restoreSnapshot(bad),/inválid/);assert.deepEqual(sim.snapshot(),expected);
 const legacy=structuredClone(saved);for(const a of legacy.areaC.lastGroup){delete a.motionDistance;delete a.effectiveSpeed;delete a.navCorners;}assert.doesNotThrow(()=>sim.restoreSnapshot(legacy));
});

test('physical movement drives stance animation and spread input: a player or soldier wedged against a wall is stationary',()=>{
 const sim=new M02BenchSimulation();sim.enemies=[];sim.allies=[];sim.teleportPlayer(0,-173,Math.PI/2,0);
 for(let i=0;i<20;i++)sim.tick(.05,{forward:1});assert.equal(sim.player.moving,false);
 const actor={id:'blocked',x:0,y:0,z:-173,radius:.36,alive:true,suppressed:0,goal:{x:0,z:-169},navCorners:[{x:0,z:-169}],navGoalKey:'0.00,-169.00',navRevision:sim.world.revision};
 for(let i=0;i<10;i++)stepActorNavigation(sim,actor,.05);assert.equal(actor.moving,false);assert.equal(actor.effectiveSpeed,0);
});
