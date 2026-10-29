import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {m02MachineGunCover} from '../src/game/m02-machinegun-team.js';
import {updateGermanGarrison,updatePolishSquad} from '../src/game/m02-combat-ai.js';

function scene(){
 const sim=new M02BenchSimulation();sim.enterAreaBC06();sim.clock=10;
 const gunner=sim.allies.find(a=>a.id==='pl_aux_01'),assistant=sim.allies.find(a=>a.id==='pl_aux_02');
 const near=sim.enemies.find(a=>a.id==='DE-B02'),target=sim.enemies.find(a=>a.id==='DE-B01');
 Object.assign(gunner,{x:-1,y:0,z:100,mag:0,reloadingUntil:14,lastShotAt:9,m02LastEngagedTargetId:target.id,goal:null});
 Object.assign(assistant,{x:0,y:0,z:100,mag:5,reserve:30,reloadingUntil:0,nextFireAt:0,suppressed:0,goal:null});
 Object.assign(near,{x:0,y:0,z:108,alive:true,nonCombatant:false});
 Object.assign(target,{x:0,y:0,z:120,alive:true,nonCombatant:false});
 Object.assign(sim.player,{x:-10,y:0,z:100});sim.allies=[gunner,assistant];sim.enemies=[near,target];sim.drainEvents();
 return {sim,gunner,assistant,near,target};
}

test('a real wz.28 shot records the target that the loader can cover on the next reload',()=>{
 const {sim,gunner,assistant,near,target}=scene();
 delete gunner.m02LastEngagedTargetId;Object.assign(gunner,{mag:1,reloadingUntil:0,nextFireAt:0});assistant.nextFireAt=100;
 target.health=1000;sim.enemies=[target];updatePolishSquad(sim,.05);
 const rkm=sim.drainEvents().find(e=>e.type==='actor-burst'&&e.shooterId===gunner.id);
 assert.equal(rkm?.targetId,target.id);assert.equal(gunner.m02LastEngagedTargetId,target.id);assert.equal(gunner.mag,0);
 sim.enemies.push(near);assistant.nextFireAt=0;updatePolishSquad(sim,.05);
 assert.ok(gunner.reloadingUntil>sim.clock);
 const covered=sim.drainEvents().find(e=>e.type==='actor-burst'&&e.shooterId===assistant.id);
 assert.equal(covered?.targetId,target.id);assert.equal(covered.crewCoverFor,gunner.id);
});

test('the actual Polish loader covers the last real rkm target while the gunner reloads',()=>{
 const {sim,assistant,gunner,target}=scene();
 assert.deepEqual(m02MachineGunCover(sim,assistant,'ally'),{gunnerId:gunner.id,targetId:target.id});
 const before=sim.snapshot();updatePolishSquad(sim,.05);
 const fired=sim.drainEvents().find(e=>e.shooterId===assistant.id&&e.type==='actor-burst');
 assert.equal(fired?.targetId,target.id);assert.equal(fired.crewCoverFor,gunner.id);
 assert.equal(assistant.mag,4);assert.equal(gunner.mag,0);assert.equal(gunner.reserve,before.allies.find(a=>a.id===gunner.id).reserve);
 const result=sim.snapshot();sim.restoreSnapshot(before);sim.drainEvents();updatePolishSquad(sim,.05);
 assert.deepEqual(sim.snapshot(),result);assert.deepEqual(sim.drainEvents().find(e=>e.shooterId===assistant.id&&e.type==='actor-burst'),fired);
 const legacy=structuredClone(before);delete legacy.allies.find(a=>a.id===gunner.id).m02LastEngagedTargetId;
 assert.doesNotThrow(()=>sim.restoreSnapshot(legacy));assert.equal(m02MachineGunCover(sim,sim.allies.find(a=>a.id===assistant.id),'ally'),null);
 const invalid=structuredClone(before);invalid.allies.find(a=>a.id===gunner.id).m02LastEngagedTargetId={};
 const safe=sim.snapshot();assert.throws(()=>sim.restoreSnapshot(invalid),/inválido/);assert.deepEqual(sim.snapshot(),safe);
});

test('cover stops when the gunner is absent, separated, behind a wall, done reloading or the loader is unable to fight',()=>{
 const {sim,gunner,assistant}=scene();assert.ok(m02MachineGunCover(sim,assistant,'ally'));
 gunner.alive=false;assert.equal(m02MachineGunCover(sim,assistant,'ally'),null);gunner.alive=true;
 gunner.x=-7;assert.equal(m02MachineGunCover(sim,assistant,'ally'),null);gunner.x=-1;
 sim.world.obstacles.push({id:'crew-wall',min:{x:-.6,y:0,z:99},max:{x:-.4,y:3,z:101},material:'brick'});
 assert.equal(m02MachineGunCover(sim,assistant,'ally'),null);sim.world.obstacles.pop();
 gunner.reloadingUntil=10;assert.equal(m02MachineGunCover(sim,assistant,'ally'),null);gunner.reloadingUntil=14;
 assistant.reloadingUntil=12;assert.equal(m02MachineGunCover(sim,assistant,'ally'),null);assistant.reloadingUntil=0;
 assistant.suppressed=.9;assert.equal(m02MachineGunCover(sim,assistant,'ally'),null);assistant.suppressed=0;
 gunner.lastShotAt=1;assert.equal(m02MachineGunCover(sim,assistant,'ally'),null);
 gunner.lastShotAt=11;assert.equal(m02MachineGunCover(sim,assistant,'ally'),null);
});

test('the German assistant covers only a target it can itself see',()=>{
 const sim=new M02BenchSimulation();sim.enterAreaBC06();sim.clock=10;
 const gunner=sim.enemies.find(e=>e.id==='DE-B05'),assistant=sim.enemies.find(e=>e.id==='DE-B06');
 const target=sim.allies.find(a=>a.id==='pl_gruca');
 Object.assign(gunner,{x:-1,y:0,z:100,reloadingUntil:14,mag:0,seeingTargetId:target.id});
 Object.assign(assistant,{x:0,y:0,z:100,facing:Math.PI/2,reloadingUntil:0,mag:5,nextFireAt:0,suppressed:0,seeingTargetId:sim.player.id,targetAcquiredAt:0});
 Object.assign(target,{x:0,y:0,z:120,alive:true,state:'ACTIVE'});Object.assign(sim.player,{x:-4,y:0,z:105,alive:true});
 sim.enemies=[assistant,gunner];sim.allies=[target];sim.drainEvents();
 const before=sim.snapshot();updateGermanGarrison(sim,.05);
 const shot=sim.drainEvents().find(e=>e.shooterId===assistant.id&&e.type==='actor-burst');
 assert.equal(shot?.targetId,target.id);assert.equal(shot.crewCoverFor,gunner.id);
 sim.restoreSnapshot(before);sim.world.obstacles.push({id:'hidden-target-wall',min:{x:-1,y:0,z:110},max:{x:1,y:3,z:111},material:'brick'});
 updateGermanGarrison(sim,.05);
 const blocked=sim.drainEvents().find(e=>e.shooterId===assistant.id&&e.type==='actor-burst');
 assert.equal(blocked?.targetId,sim.player.id);assert.equal(blocked.crewCoverFor,undefined);
});

test('all three authored German teams use their own gunner, without adding soldiers or ammunition',()=>{
 for(const [cell,gunnerId,assistantId] of [['A','DE-A05','DE-A06'],['B','DE-B05','DE-B06'],['C','DE-C04','DE-C05']]){
  const s=new M02BenchSimulation();if(cell==='B')s.enterAreaBC06();if(cell==='C')s.enterAreaCC09();
  const gunner=s.enemies.find(a=>a.id===gunnerId),assistant=s.enemies.find(a=>a.id===assistantId);
  Object.assign(gunner,{x:0,y:0,z:100,reloadingUntil:5,seeingTargetId:s.player.id});Object.assign(assistant,{x:1,y:0,z:100});
  const before=s.snapshot();assert.deepEqual(m02MachineGunCover(s,assistant,'enemy'),{gunnerId,targetId:s.player.id});
  assert.deepEqual(s.snapshot(),before);
 }
});
