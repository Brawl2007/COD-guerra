import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {updatePolishSquad} from '../src/game/m02-combat-ai.js';

function farm(){
 const sim=new M02BenchSimulation();sim.enemies=[];sim.allies=sim.allies.filter(a=>a.id==='pl_gruca');
 sim.clock=10;sim.ea1StartedAt=0;sim.c01Active=false;sim.drainEvents();return {sim,leader:sim.allies[0]};
}

test('suppress holds the current cover phase instead of advancing on a timer',()=>{
 const {sim,leader}=farm();sim.issueSquadOrder('suppress');updatePolishSquad(sim,.05);
 assert.equal(leader.goal.nodeId,'cv_ditch_mid_a');const saved=sim.snapshot();
 sim.clock=40;updatePolishSquad(sim,.05);assert.equal(leader.goal.nodeId,'cv_ditch_mid_a');
 const expected=sim.snapshot();sim.restoreSnapshot(saved);sim.clock=40;updatePolishSquad(sim,.05);
 assert.deepEqual(sim.snapshot(),expected,'order and saved issue time reproduce the same route');
});

test('advance selects the next cover node but the soldier still walks there physically',()=>{
 const {sim,leader}=farm();updatePolishSquad(sim,.05);assert.equal(leader.goal.nodeId,'cv_ditch_mid_a');
 sim.issueSquadOrder('advance');const before=[leader.x,leader.z];updatePolishSquad(sim,.05);
 assert.equal(leader.goal.nodeId,'cv_b01_north_wall');
 assert.ok(Math.hypot(leader.x-before[0],leader.z-before[1])<=4.1*.05+.01,'no position teleport');
});

test('flank still chooses the orchard route even when the earlier route was the ditch',()=>{
 const {sim,leader}=farm();sim.flags['m02.axis']='ditch';sim.issueSquadOrder('flank_east');updatePolishSquad(sim,.05);
 assert.equal(leader.goal.nodeId,'cv_orchard_bank_e');assert.equal(sim.flags['m02.axis'],'ditch');
});
