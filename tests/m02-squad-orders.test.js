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

test('in B and C the squad holds its real positions and resumes the authored mission goals',()=>{
 for(const cell of ['B','C']){
  const sim=new M02BenchSimulation();if(cell==='B')sim.enterAreaBC06();else sim.enterAreaCC09();
  sim.enemies=[];sim.allies=sim.allies.filter(a=>a.id==='pl_gruca');const leader=sim.allies[0];sim.clock=10;
  const at=[leader.x,leader.z];sim.issueSquadOrder('suppress');const saved=sim.snapshot();
  for(let i=0;i<30;i++){sim.clock+=.05;updatePolishSquad(sim,.05);}
  assert.deepEqual([leader.x,leader.z],at,`${cell}: hold must not teleport or advance`);
  assert.equal(leader.goal.nodeId,'order_hold_pl_gruca');assert.equal(leader.crouched,true);
  const expected=sim.snapshot();sim.restoreSnapshot(saved);for(let i=0;i<30;i++){sim.clock+=.05;updatePolishSquad(sim,.05);}
  assert.deepEqual(sim.snapshot(),expected,`${cell}: hold resumes identically after restore`);
  const restored=sim.allies[0];sim.issueSquadOrder('advance');updatePolishSquad(sim,.05);
  assert.notEqual(restored.goal.nodeId,'order_hold_pl_gruca');assert.ok(Math.hypot(restored.x-at[0],restored.z-at[1])<=.22);
  const old=structuredClone(saved);delete old.squadOrder.issuedCell;delete old.squadOrder.holdPositions;
  assert.doesNotThrow(()=>sim.restoreSnapshot(old));updatePolishSquad(sim,.05);
  assert.notEqual(sim.allies[0].goal.nodeId,'order_hold_pl_gruca','old checkpoints retain their existing behaviour');
  const safe=sim.snapshot(),bad=structuredClone(safe);bad.squadOrder.holdPositions={pl_gruca:{x:NaN,z:0}};
  assert.throws(()=>sim.restoreSnapshot(bad),/inválid/);assert.deepEqual(sim.snapshot(),safe);
 }
});

test('holding the squad during C11 does not interrupt Lis walking to the aid station',()=>{
 const sim=new M02BenchSimulation();sim.enterAreaCC09();sim.startC10OrderChanges();sim.detonateC10FixedArtillery();sim.enemies=[];
 sim.assistLisInC11('wounded_walking');const lis=sim.allies.find(a=>a.id==='pl_lis'),before=[lis.x,lis.z];
 sim.issueSquadOrder('suppress');assert.equal(sim.squadOrder.holdPositions.pl_lis,undefined);
 updatePolishSquad(sim,.05);assert.deepEqual([lis.goal.x,lis.goal.z],[-58,52]);
 assert.notDeepEqual([lis.x,lis.z],before,'Lis continues moving through normal navigation');
});
