import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {m02ObjectivePresentation} from '../src/m02/m02-objective-presentation.js';

function orchard(){
 const sim=new M02BenchSimulation(),wounded=sim.enemies.find(e=>e.c04Candidate);sim.enemies=[wounded];sim.allies=[];
 Object.assign(wounded,{x:1,y:0,z:35,health:40,alive:true,state:'WOUNDED_UNARMED',nonCombatant:true});sim.teleportPlayer(0,35,0,0);
 sim.updateTacticalContext();return {sim,wounded};
}

test('C04 tells the player that helping is optional and permits continuing without harm or chalk',()=>{
 const {sim}=orchard();assert.equal(sim.objective.id,'C04');assert.match(m02ObjectivePresentation(sim).title,/opcional/);
 sim.teleportPlayer(0,44,0,0);sim.updateTacticalContext();
 assert.equal(sim.objective.id,'COMPLETE');assert.equal(sim.flags['m02.pomar_wounded_marked'],false);
 assert.equal(sim.flags['m02.fired_on_wounded'],false);assert.equal(sim.flags['m02.pomar_wounded_water'],undefined);
});

test('C04 permits the water choice without making chalk mandatory',()=>{
 const {sim}=orchard();assert.deepEqual(m02ObjectivePresentation(sim).point,[-5,38]);assert.ok(sim.currentWoundedWaterPrompt());sim.tick(.05,{giveWater:true});
 for(let i=0;i<40&&sim.playerWaterAction;i++)sim.tick(.05,{});
 assert.equal(sim.flags['m02.pomar_wounded_water'],true);assert.equal(sim.flags['m02.pomar_wounded_marked'],false);assert.deepEqual(m02ObjectivePresentation(sim).point,[0,50]);
 sim.teleportPlayer(0,44,0,0);sim.updateTacticalContext();assert.equal(sim.objective.id,'COMPLETE');
 assert.equal(sim.flags['m02.fired_on_wounded'],false);
});
