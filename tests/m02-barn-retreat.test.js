import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {updateGermanGarrison} from '../src/game/m02-combat-ai.js';

function scene(){
 const sim=new M02BenchSimulation(19390909),loader=sim.enemies.find(e=>e.id==='DE-A06');
 for(const e of sim.enemies)if(e!==loader){e.alive=false;e.health=0;}
 sim.allies=[];return {sim,loader};
}
function step(sim){sim.clock=Number((sim.clock+.05).toFixed(3));updateGermanGarrison(sim,.05);}

test('the barn loader physically opens and crosses the south door before surrendering',()=>{
 const {sim,loader}=scene(),start={x:loader.x,z:loader.z},door=()=>sim.world.doors.find(d=>d.id==='door_b02_south_door');
 step(sim);assert.equal(loader.state,'RETREAT_B02');assert.ok(Math.hypot(loader.x-start.x,loader.z-start.z)<.3);
 let crossed=false,doorOpened=false;
 for(let i=0;i<300&&!loader.nonCombatant;i++){
  const before={x:loader.x,z:loader.z};step(sim);
  assert.ok(Math.hypot(loader.x-before.x,loader.z-before.z)<.3,'actor must move rather than teleport');
  doorOpened ||= door().state==='open';
  if(before.z < -24 && loader.z >= -24){crossed=true;assert.ok(Math.abs(loader.x-30)<.6);assert.equal(door().state,'open');}
 }
 assert.ok(doorOpened);assert.ok(crossed);assert.equal(loader.state,'SURRENDERED');assert.ok(loader.z>-24);
 assert.ok(sim.combatLog.some(e=>e.type==='enemy_retreat_b02'&&e.actorId===loader.id));
});

test('a blocked south exit ends in surrender and checkpoint replay remains deterministic',()=>{
 const {sim,loader}=scene();
 sim.doorLocks.set('door_b02_south_door',{actorId:'blocking-actor',expiresAt:1000});
 for(let i=0;i<50;i++)step(sim);
 const checkpoint=sim.snapshot();
 for(let i=0;i<270;i++)step(sim);
 const expected=sim.snapshot();assert.equal(loader.state,'SURRENDERED');assert.ok(loader.z < -24);
 sim.restoreSnapshot(checkpoint);
 for(let i=0;i<270;i++)step(sim);
 assert.deepEqual(sim.snapshot(),expected);
 const invalid=structuredClone(checkpoint);invalid.enemies.find(e=>e.id==='DE-A06').m02BarnRetreat.startedAt=-1;
 assert.throws(()=>sim.restoreSnapshot(invalid),/inválida/);
});
