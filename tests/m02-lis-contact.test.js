import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {m02PlayerAction,performM02PlayerAction} from '../src/game/m02-player-actions.js';

function scene(){
 const sim=new M02BenchSimulation();sim.enterAreaCC09();sim.startC10OrderChanges();sim.detonateC10FixedArtillery();
 const lis=sim.allies.find(a=>a.id==='pl_lis');sim.allies=[lis];sim.enemies=[];
 Object.assign(lis,{x:0,y:0,z:100,alive:true,health:46,state:'WOUNDED_LIAISON',detachedOutOfCell:false});
 Object.assign(sim.player,{x:-1.5,y:0,z:100,health:100,eyeHeight:1.65,carryingVolumeId:null});
 sim.drainEvents();return {sim,lis};
}

test('Lis needs a deliberate reachable interaction; proximity alone cannot trigger his rescue',()=>{
 const {sim,lis}=scene();sim.tick(.05,{});
 assert.equal(sim.areaC.lisContactedInC11,false);assert.equal(lis.state,'WOUNDED_LIAISON');
 const action=m02PlayerAction(sim);assert.equal(action?.id,'assist-lis');assert.equal(action.distance,1.5);
 const save=sim.snapshot();sim.drainEvents();assert.equal(performM02PlayerAction(sim),true);
 assert.equal(sim.areaC.lisContactedInC11,true);assert.equal(lis.state,'WALKING_SUPPORTED');
 assert.equal(sim.flags['m02.lis_status'],'wounded_walking');assert.equal(sim.dialogue.hasTriggered('dlg_m02_003'),true);
 assert.deepEqual([lis.x,lis.z],[0,100]);assert.notEqual(m02PlayerAction(sim)?.id,'assist-lis');
 const expected=sim.snapshot(),events=sim.drainEvents();sim.restoreSnapshot(save);sim.drainEvents();performM02PlayerAction(sim);
 assert.deepEqual(sim.snapshot(),expected);assert.deepEqual(sim.drainEvents(),events);
});

test('solid cover, distance, full hands or an incapacitated Lis prevent the contact action',()=>{
 const {sim,lis}=scene();
 sim.world.obstacles.push({id:'contact-wall',min:{x:-.8,y:0,z:99},max:{x:-.7,y:3,z:101},material:'brick'});
 assert.equal(m02PlayerAction(sim),null);sim.tick(.05,{});assert.equal(sim.areaC.lisContactedInC11,false);
 sim.world.obstacles.pop();sim.player.x=-2.1;assert.equal(m02PlayerAction(sim),null);
 sim.player.x=-1.5;sim.player.carryingVolumeId='vol_water';assert.equal(m02PlayerAction(sim),null);sim.player.carryingVolumeId=null;
 lis.state='DOWN';assert.equal(m02PlayerAction(sim),null);lis.state='WOUNDED_LIAISON';lis.alive=false;assert.equal(m02PlayerAction(sim),null);
});
