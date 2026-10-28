import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {m02PlayerAction,performM02PlayerAction,m02RifleAmmoSources} from '../src/game/m02-player-actions.js';
import {M02MissionPilot} from '../tools/m02/mission-pilot.mjs';
import {eyePosition,muzzlePosition,traceShot} from '../src/world/spatial.js';

function scene(){
 const sim=new M02BenchSimulation();sim.enterAreaBC06();sim.allies=[];
 const enemy=sim.enemies.find(e=>e.weapon==='kar98k');sim.enemies=[enemy];
 Object.assign(enemy,{x:1,y:0,z:100,alive:false,state:'DEAD',nonCombatant:false,mag:3,reserve:12});
 Object.assign(sim.player,{x:0,y:0,z:100,health:100,eyeHeight:1.65});sim.weapon.mag=0;sim.weapon.reserve=30;sim.drainEvents();
 return {sim,enemy};
}

test('7.92 mm ammunition is transferred from a dead rifleman, bounded by real inventory and checkpoint state',()=>{
 const {sim,enemy}=scene(),saved=sim.snapshot();
 assert.equal(m02PlayerAction(sim)?.id,'rifle-ammo');assert.equal(m02PlayerAction(sim).distance,1);assert.equal(performM02PlayerAction(sim),true);
 assert.equal(sim.weapon.reserve,40);assert.equal(enemy.reserve,2);assert.equal(enemy.mag,3);
 assert.equal(sim.weapon.reserve+enemy.mag+enemy.reserve,45,'no rounds are created');
 assert.equal(performM02PlayerAction(sim),false,'a full reserve cannot consume the body');
 const expected=sim.snapshot(),events=sim.drainEvents();assert.deepEqual(events.map(e=>[e.type,e.rounds]),[['rifle-ammo-collected',10]]);
 sim.restoreSnapshot(saved);sim.drainEvents();assert.equal(performM02PlayerAction(sim),true);
 assert.deepEqual(sim.snapshot(),expected);assert.deepEqual(sim.drainEvents(),events);
});

test('ammunition cannot be collected through a wall, from the living, wounded or surrendered, or from an incompatible weapon',()=>{
 const {sim,enemy}=scene();sim.world.obstacles.push({id:'ammo-wall',min:{x:.45,y:0,z:99},max:{x:.55,y:3,z:101},material:'brick'});
 assert.equal(m02PlayerAction(sim),null);sim.world.obstacles.pop();
 sim.player.carryingVolumeId='vol_water';assert.equal(m02PlayerAction(sim),null);sim.player.carryingVolumeId=null;
 for(const variant of [
  {alive:true,state:'ACTIVE',nonCombatant:false,weapon:'kar98k'},
  {alive:true,state:'WOUNDED_UNARMED',nonCombatant:true,weapon:'kar98k'},
  {alive:true,state:'SURRENDERED',nonCombatant:true,weapon:'kar98k'},
  {alive:false,state:'DEAD',nonCombatant:false,weapon:'mp38'},
  {alive:false,state:'DEAD',nonCombatant:true,weapon:'kar98k'},
 ]){Object.assign(enemy,variant);assert.equal(m02PlayerAction(sim),null);}
 assert.equal(sim.weapon.reserve,30);assert.equal(enemy.mag+enemy.reserve,15);
});

test('the browser pilot seeks a physical ammunition source when its rifle is empty',()=>{
 const {sim,enemy}=scene();sim.weapon.reserve=0;enemy.x=8;
 const armed={...enemy,id:'DE-B-test',x:12,z:100,alive:true,state:'HOLD_SECTOR',mag:5,reserve:10};sim.enemies.push(armed);
 sim.clock=30;const pilot=new M02MissionPilot();pilot.lastCell='B';pilot.enteredAt=0;
 assert.equal(m02RifleAmmoSources(sim)[0].id,enemy.id);
 const decision=pilot.decide(sim);assert.deepEqual(decision.goal,[8,100]);assert.notEqual(decision.target,armed.id);
});

test('the browser pilot does not shoot through a parapet that hides the muzzle but leaves the eye clear',()=>{
 const {sim}=scene();sim.clock=30;sim.weapon.mag=5;sim.weapon.reserve=30;
 const enemy=sim.enemies[0];Object.assign(enemy,{x:10,y:0,z:100,alive:true,state:'HOLD_SECTOR',health:100});
 sim.world.obstacles.push({id:'muzzle-wall',min:{x:1.1,y:1.3,z:99.7},max:{x:1.3,y:1.6,z:100.3},material:'brick'});
 const eye=eyePosition(sim.player),point={x:enemy.x,y:1.58,z:enemy.z},d=Math.hypot(point.x-eye.x,point.y-eye.y),dir={x:(point.x-eye.x)/d,y:(point.y-eye.y)/d,z:0};
 const aimed={...sim.player,angle:0,pitch:Math.atan2(point.y-eye.y,point.x-eye.x),aiming:true};
 assert.equal(traceShot(sim.world,eye,dir,[enemy],220)?.kind,'actor');
 assert.equal(traceShot(sim.world,eye,dir,[enemy],220,muzzlePosition(aimed,sim.clock))?.kind,'world');
 const pilot=new M02MissionPilot();pilot.lastCell='B';pilot.enteredAt=0;
 const decision=pilot.decide(sim);assert.notEqual(decision.target,enemy.id);assert.notEqual(decision.controls.fire,true);
});
