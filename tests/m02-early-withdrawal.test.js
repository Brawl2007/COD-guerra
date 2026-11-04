import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {m02EarlyWithdrawalPrompt,performM02EarlyWithdrawal,m02PlayerAction,performM02PlayerAction} from '../src/game/m02-player-actions.js';

function scene(){
 const sim=new M02BenchSimulation();sim.enterAreaCC09();sim.startC10OrderChanges();sim.detonateC10FixedArtillery();sim.enemies=[];
 sim.teleportPlayer(-55,54,0,0);sim.drainEvents();return sim;
}

test('early withdrawal records only physically evacuated men and leaves the rest unaccounted for',()=>{
 const sim=scene(),group=sim.areaC.lastGroup;
 group.forEach((man,i)=>{man.evacuated=i<7;if(i>=10){man.alive=false;man.health=0;}});
 const before=group.slice(7,10).map(a=>({id:a.id,x:a.x,z:a.z})),prompt=m02EarlyWithdrawalPrompt(sim);
 assert.equal(prompt.count,3);assert.equal(prompt.lisUnsafe,true);assert.match(prompt.prompt,/3 por evacuar/);
 assert.equal(performM02EarlyWithdrawal(sim),true);assert.equal(sim.areaC.c12Completed,true);
 assert.equal(sim.flags['m02.last_group_survivors'],7);assert.equal(sim.flags['m02.last_group_unaccounted'],3);
 assert.equal(sim.m03ExportPackage.m03ImportState.lastGroupSurvivorsCount,7);assert.equal(sim.m03ExportPackage.m03ImportState.lastGroupUnaccountedCount,3);
 assert.equal(sim.flags['m02.lis_status'],'missing');assert.deepEqual(sim.areaC.leftBehindIds,before.map(a=>a.id));
 for(const [i,old]of before.entries()){const man=group[i+7];assert.equal(man.alive,true);assert.equal(man.evacuated,false);assert.equal(man.leftBehind,true);assert.deepEqual({id:man.id,x:man.x,z:man.z},old);}
 assert.equal(performM02EarlyWithdrawal(sim),false);const saved=sim.snapshot();sim.restoreSnapshot(saved);assert.deepEqual(sim.snapshot(),saved);
 const corrupt=structuredClone(saved);corrupt.flags['m02.last_group_unaccounted']=2;assert.throws(()=>sim.restoreSnapshot(corrupt),/inválid/);assert.deepEqual(sim.snapshot(),saved);
 const corruptIds=structuredClone(saved);corruptIds.areaC.leftBehindIds[0]='unknown';assert.throws(()=>sim.restoreSnapshot(corruptIds),/inválid/);assert.deepEqual(sim.snapshot(),saved);
 sim.tick(.05,{});assert.equal(sim.flags['m02.last_group_survivors'],7);assert.deepEqual(sim.areaC.leftBehindIds,before.map(a=>a.id));
});

test('withdrawal is unavailable outside the aid house or before the last group is in motion',()=>{
 const sim=new M02BenchSimulation();sim.enterAreaCC09();sim.teleportPlayer(-55,54,0,0);assert.equal(m02EarlyWithdrawalPrompt(sim),null);
 sim.startC10OrderChanges();sim.detonateC10FixedArtillery();sim.teleportPlayer(-70,54,0,0);assert.equal(m02EarlyWithdrawalPrompt(sim),null);
 assert.equal(performM02EarlyWithdrawal(sim),false);assert.equal(sim.areaC.c12Completed,false);
 sim.teleportPlayer(-55,54,0,0);sim.player.health=0;assert.equal(m02EarlyWithdrawalPrompt(sim),null);
});

test('an outdated O09 cannot bypass the explicit warning while men remain unaccounted for',()=>{
 const sim=scene();sim.objective.id='O09';assert.ok(m02EarlyWithdrawalPrompt(sim));
 assert.notEqual(m02PlayerAction(sim)?.id,'epilogue');assert.equal(performM02PlayerAction(sim),false);assert.equal(sim.areaC.c12Completed,false);
});

test('leaving while Lis is still walking records him as missing without moving him to safety',()=>{
 const sim=scene(),lis=sim.allies.find(a=>a.id==='pl_lis');sim.assistLisInC11('wounded_walking');
 sim.areaC.lastGroup.forEach(a=>a.evacuated=true);sim.objective.id='O09';const before={x:lis.x,z:lis.z};
 assert.match(m02PlayerAction(sim).prompt,/Lis ainda a caminho; ficará para trás/);assert.equal(performM02PlayerAction(sim),true);
 assert.equal(sim.flags['m02.lis_status'],'missing');assert.deepEqual({x:lis.x,z:lis.z},before);
 assert.equal(sim.m03ExportPackage.m03ImportState.lisEntry.presentInShelter,false);
});

test('Lis evacuated before C11 remains evacuated without being moved or rescued a second time',()=>{
 const sim=scene(),lis=sim.allies.find(a=>a.id==='pl_lis');
 Object.assign(lis,{alive:true,state:'EVACUATED',x:-30,z:-10});sim.areaC.lisContactedInC11=false;sim.flags['m02.lis_status']='active';
 const before={x:lis.x,z:lis.z};assert.equal(m02EarlyWithdrawalPrompt(sim).lisUnsafe,false);
 assert.equal(performM02EarlyWithdrawal(sim),true);assert.equal(sim.flags['m02.lis_status'],'wounded_evacuated');
 assert.deepEqual({x:lis.x,z:lis.z},before);assert.equal(sim.areaC.lisContactedInC11,false);
 assert.equal(sim.m03ExportPackage.m03ImportState.lisEntry.presentInShelter,true);
});
