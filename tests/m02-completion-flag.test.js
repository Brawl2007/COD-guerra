import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';

test('securing the farm and entering B/C do not complete the campaign mission',()=>{
 const sim=new M02BenchSimulation(),wounded=sim.enemies.find(e=>e.c04Candidate);sim.enemies=[wounded];sim.allies=[];
 Object.assign(wounded,{x:1,y:0,z:35,alive:true,state:'WOUNDED_UNARMED',nonCombatant:true});sim.teleportPlayer(0,44,0,0);sim.updateTacticalContext();
 assert.equal(sim.objective.id,'COMPLETE');assert.equal(sim.flags['m02.completed'],false);
 const payload=sim.triggerTransitionTAB();assert.equal(payload.flags['m02.completed'],false);
 sim.enterAreaBC06();assert.equal(sim.flags['m02.completed'],false);sim.enterAreaCC09();assert.equal(sim.flags['m02.completed'],false);
 const result=sim.completeC12Epilogue({lisOutcome:'missing'});assert.equal(result.completed,true);assert.equal(result.flags['m02.completed'],true);
 const completed=sim.snapshot();sim.restoreSnapshot(completed);assert.equal(sim.flags['m02.completed'],true);
});

test('legacy intermediate checkpoints repair only the premature completion flags',()=>{
 for(const cell of ['A','B','C']){
  const sim=new M02BenchSimulation();sim.player.health=73;sim.weapon.mag=3;sim.flags['m02.pomar_wounded_water']=true;
  sim.triggerTransitionTAB();if(cell==='B')sim.enterAreaBC06();if(cell==='C')sim.enterAreaCC09();
  const legacy=sim.snapshot();legacy.flags['m02.completed']=true;legacy.transitionTABPayload.flags['m02.completed']=true;
  const unchanged=structuredClone(legacy),expected=structuredClone(legacy);
  expected.flags['m02.completed']=false;expected.transitionTABPayload.flags['m02.completed']=false;
  sim.restoreSnapshot(legacy);assert.deepEqual(sim.snapshot(),expected);assert.deepEqual(legacy,unchanged,'restore must not mutate saved input');
 }
});
