import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {m02ExposedLastGroup} from '../src/game/m02-evacuation-targets.js';

function scene(){
 const sim=new M02BenchSimulation();sim.enterAreaCC09();sim.startC10OrderChanges();sim.detonateC10FixedArtillery();
 const gun=sim.enemies.find(e=>e.weapon==='mg34')??sim.enemies[0];sim.enemies=[gun];sim.allies=[];
 Object.assign(gun,{x:70,y:0,z:-100,weapon:'kar98k',facing:0,mag:5,reserve:10,suppressed:0,goal:null,nextFireAt:0});
 Object.assign(sim.player,{x:-100,y:0,z:100});
 for(const actor of sim.areaC.lastGroup)actor.evacuated=true;
 const man=sim.areaC.lastGroup[0];Object.assign(man,{x:80,y:0,z:-100,health:1,alive:true,evacuated:false});
 sim.drainEvents();return {sim,gun,man};
}

test('a real enemy round can kill an exposed last-group member, with a surviving count carried into M03',()=>{
 const {sim,gun,man}=scene(),save=sim.snapshot();
 const shot=sim.fireActorBurst(gun,man,{x:man.x,y:1.25,z:man.z},'enemy');
 assert.equal(shot.traces[0].hitId,man.id);assert.equal(man.alive,false);assert.equal(man.health,0);
 assert.equal(m02ExposedLastGroup(sim).includes(man),false);
 const events=sim.drainEvents(),after=sim.snapshot();
 sim.restoreSnapshot(save);sim.drainEvents();sim.fireActorBurst(sim.enemies[0],sim.areaC.lastGroup[0],{x:80,y:1.25,z:-100},'enemy');
 assert.deepEqual(sim.snapshot(),after);assert.deepEqual(sim.drainEvents(),events);
 const result=sim.completeC12Epilogue({lisOutcome:'missing'});
 assert.equal(result.flags['m02.last_group_survivors'],11);assert.equal(result.m03ImportState.lastGroupSurvivorsCount,11);
});

test('evacuated men are safe from bullets and blasts while an exposed member takes physical blast damage',()=>{
 const {sim,gun,man}=scene();man.health=100;man.evacuated=true;
 const shot=sim.fireActorBurst(gun,man,{x:man.x,y:1.25,z:man.z},'enemy');
 assert.notEqual(shot.traces[0].hitId,man.id);assert.equal(man.health,100);
 let blast=sim.detonateGrenadeAt(man.x+1,.5,man.z,6.5);
 assert.equal(blast.affectedActors.some(a=>a.id===man.id),false);assert.equal(man.health,100);
 man.evacuated=false;blast=sim.detonateGrenadeAt(man.x+3,.5,man.z,6.5);
 assert.ok(blast.affectedActors.find(a=>a.id===man.id)?.damage>0);assert.ok(man.health>0&&man.health<=50);
 assert.equal(man.wounded,true);assert.equal(man.speed,3.8);
});

test('enemy perception can acquire a visible exposed member and stops tracking him once evacuated',()=>{
 const {sim,gun,man}=scene();man.health=100;
 sim.tick(.05,{});assert.equal(gun.seeingTargetId,man.id);
 man.evacuated=true;sim.tick(.05,{});assert.notEqual(gun.seeingTargetId,man.id);
});

test('a survivor is counted after crossing B12 but remains at risk until the rally point',()=>{
 const {sim,man}=scene();sim.enemies=[];
 Object.assign(man,{x:-54,y:0,z:63,health:100,waypointIdx:17,evacuated:false});
 sim.tick(.05,{});assert.equal(man.waypointIdx,18);assert.equal(man.evacuated,false);
 assert.equal(sim.flags['m02.last_group_survivors'],12);
 sim.detonateGrenadeAt(man.x+.5,.5,man.z,6.5);assert.equal(man.alive,false);
 sim.tick(.05,{});assert.equal(sim.flags['m02.last_group_survivors'],11);
});
