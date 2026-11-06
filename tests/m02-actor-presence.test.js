import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {friendlyFireClear,stepActorNavigation,updateGermanGarrison} from '../src/game/m02-combat-ai.js';
import {m02ActorPresent} from '../src/game/m02-actor-presence.js';
import {m02VisualActor} from '../src/render/m02-presentation.js';
import {m02ClearIncapableGrenadeThreat} from '../src/game/m02-grenade-awareness.js';

function lineScene(detached=true){
 const sim=new M02BenchSimulation();sim.enterAreaCC09();const lis=sim.allies.find(a=>a.id==='pl_lis'),gun=sim.enemies.find(a=>a.weapon==='mg34');
 sim.allies=[lis];sim.enemies=[gun];Object.assign(gun,{x:0,y:0,z:100,mag:50,suppressed:0,alive:true,goal:null,facing:Math.PI/2,reloadingUntil:0,nextFireAt:999});
 Object.assign(lis,{x:0,y:0,z:110,health:100,alive:true,detachedOutOfCell:detached,state:detached?'LIAISON_OUTSIDE_CELL':'ACTIVE'});
 Object.assign(sim.player,{x:0,y:0,z:120,health:100,alive:true,crouched:false,eyeHeight:1.65});sim.drainEvents();return {sim,lis,gun};
}

test('a detached ally is not a bullet target or a shield for someone behind him',()=>{
 const absent=lineScene(true),event=absent.sim.fireActorBurst(absent.gun,absent.sim.player,{x:0,y:1.25,z:120},'enemy');
 assert.equal(event.traces[0].hitId,absent.sim.player.id);assert.equal(absent.lis.health,100);assert.ok(absent.sim.player.health<100);
 const present=lineScene(false),hit=present.sim.fireActorBurst(present.gun,present.sim.player,{x:0,y:1.25,z:120},'enemy');
 assert.equal(hit.traces[0].hitId,present.lis.id);assert.ok(present.lis.health<100);assert.equal(present.sim.player.health,100);
});

test('local perception, explosions and friendly-fire clearance ignore absent actors',()=>{
 const {sim,lis,gun}=lineScene(true);sim.player.x=-100;sim.player.z=-100;sim.clock=10;gun.weapon='kar98k';gun.mag=5;
 updateGermanGarrison(sim,.05);assert.notEqual(gun.seeingTargetId,lis.id);
 assert.equal(friendlyFireClear(gun,{x:0,z:120},[lis]),true);
 const blast=sim.detonateGrenadeAt(lis.x,.95,lis.z);assert.equal(blast.affectedActors.some(a=>a.id===lis.id),false);assert.equal(lis.health,100);
 lis.detachedOutOfCell=false;lis.state='ACTIVE';gun.facing=Math.PI/2;gun.seeingTargetId=null;
 updateGermanGarrison(sim,.05);assert.equal(gun.seeingTargetId,lis.id);assert.equal(friendlyFireClear(gun,{x:0,z:120},[lis]),false);
 const hit=sim.detonateGrenadeAt(lis.x,.95,lis.z);assert.ok(hit.affectedActors.some(a=>a.id===lis.id&&a.damage>0));
});

test('an unfinished burst is cancelled if its target leaves the cell',()=>{
 const {sim,lis,gun}=lineScene(false);sim.fireActorBurst(gun,lis,{x:0,y:1.25,z:110},'enemy');assert.ok(gun.burst);
 const mag=gun.mag;lis.detachedOutOfCell=true;sim.drainEvents();sim.clock+=.2;sim.advanceActorBurst(gun);
 assert.equal(gun.burst,null);assert.equal(gun.mag,mag);assert.equal(sim.drainEvents().some(e=>e.type==='actor-burst'),false);
});

test('absent roster members cannot push a moving ally and remain visually absent in legacy states',()=>{
 function step(mode){
  const sim=new M02BenchSimulation();sim.enterAreaCC09();const actor=sim.allies.find(a=>a.id==='pl_gruca'),lis=sim.allies.find(a=>a.id==='pl_lis');
  sim.allies=mode==='none'?[actor]:[actor,lis];sim.enemies=[];
  Object.assign(actor,{x:0,y:0,z:80,alive:true,detachedOutOfCell:false,state:'ACTIVE',goal:{x:0,z:90}});
  Object.assign(lis,{x:.3,y:0,z:80,alive:true,detachedOutOfCell:mode==='absent',state:'ACTIVE'});
  stepActorNavigation(sim,actor,.05);return [actor.x,actor.z];
 }
 assert.deepEqual(step('absent'),step('none'));assert.notDeepEqual(step('present'),step('none'));
 assert.equal(m02VisualActor({state:'EVACUATED',alive:true},'ally',0).active,false);
 assert.equal(m02ActorPresent({state:'EVACUATED_B12',alive:true}),true,'Lis remains physically present at B12');
 assert.equal(m02ActorPresent({state:'EVACUATING',alive:true,evacuated:true}),false);
 const old={alive:true,state:'EVACUATED',m02GrenadeThreat:{id:'g'},goal:{nodeId:'grenade_escape_g'},moving:true};
 assert.equal(m02ClearIncapableGrenadeThreat(old),true);assert.equal(old.m02GrenadeThreat,undefined);assert.equal(old.goal,null);
});

test('an absent ally cannot trigger the farm advance objective from stale coordinates',()=>{
 const sim=new M02BenchSimulation(),lis=sim.allies.find(a=>a.id==='pl_lis');sim.allies=[lis];
 Object.assign(lis,{x:0,z:0,alive:true,detachedOutOfCell:true});sim.teleportPlayer(0,-80,0,0);sim.updateTacticalContext();
 assert.equal(sim.objective.id,'O01');lis.detachedOutOfCell=false;sim.updateTacticalContext();assert.equal(sim.objective.id,'O02');
});

test('an already evacuated Lis stays outside C11 and is not moved or duplicated',()=>{
 const sim=new M02BenchSimulation();sim.enterAreaBC06();const lis=sim.allies.find(a=>a.id==='pl_lis');
 Object.assign(lis,{alive:true,state:'DOWN',x:-15,z:36});sim.completeC07Reorganization();assert.equal(lis.state,'EVACUATED');
 const position=[lis.x,lis.z];sim.enterAreaCC09();assert.deepEqual([lis.x,lis.z],position);assert.equal(lis.detachedOutOfCell,true);
 const saved=sim.snapshot();sim.drainEvents();const run=()=>{sim.startC10OrderChanges();sim.detonateC10FixedArtillery();return {snapshot:sim.snapshot(),events:sim.drainEvents()};};
 const first=run();assert.equal(sim.allies.filter(a=>a.id==='pl_lis').length,1);assert.equal(lis.state,'EVACUATED');assert.equal(lis.detachedOutOfCell,true);assert.deepEqual([lis.x,lis.z],position);
 sim.restoreSnapshot(saved);sim.drainEvents();assert.deepEqual(run(),first);
});
