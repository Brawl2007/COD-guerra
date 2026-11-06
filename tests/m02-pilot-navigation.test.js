import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {M02MissionPilot} from '../tools/m02/mission-pilot.mjs';

test('the verification pilot can reach a real firing position when an enemy room has no direct route',()=>{
 const sim=new M02BenchSimulation();sim.enterAreaCC09();sim.clock=30;sim.enemies=sim.enemies.filter(e=>e.id==='DE-C07');sim.allies=[];
 const enemy=sim.enemies[0];enemy.nextFireAt=1e5;
 Object.assign(sim.player,{x:-19.467,y:0,z:.433,angle:0,pitch:0,crouched:false,eyeHeight:1.65});
 assert.equal(sim.navigator.route(sim.player,enemy),null,'reproduces the unreachable direct destination');
 const pilot=new M02MissionPilot();pilot.lastCell='C';pilot.enteredAt=0;pilot.flanked=true;
 const before=sim.snapshot(),first=pilot.decide(sim);assert.ok(first.route>0);assert.equal(first.controls.forward,1);
 assert.deepEqual(sim.snapshot(),before,'planning cannot install a position or change the simulation');
 let acquired=false;
 for(let i=0;i<240;i++){
  const decision=pilot.decide(sim);if(decision.target===enemy.id){acquired=true;break;}
  sim.tick(.05,decision.controls);
 }
 assert.equal(acquired,true,'ordinary movement reaches a position with a real unobstructed shot');
 assert.equal(enemy.health,100,'the planner did not damage the target');
});

test('the optional pilot approaches the wounded man and completes water before marking chalk',()=>{
 const sim=new M02BenchSimulation(),wounded=sim.enemies.find(e=>e.c04Candidate);
 sim.enemies=[wounded];sim.allies=[];Object.assign(wounded,{x:1,y:0,z:-60,health:40,alive:true,state:'WOUNDED_UNARMED',nonCombatant:true});
 sim.teleportPlayer(4,-60,Math.PI,0);const pilot=new M02MissionPilot({offerWater:true});
 assert.ok(sim.currentChalkPrompt());assert.equal(sim.currentWoundedWaterPrompt(),null);
 const before=sim.snapshot(),first=pilot.decide(sim);assert.equal(first.approachingWounded,true);assert.deepEqual(sim.snapshot(),before);
 for(let i=0;i<150&&!sim.flags['m02.pomar_wounded_water'];i++){const d=pilot.decide(sim);sim.tick(.05,d.controls);}
 assert.equal(sim.flags['m02.pomar_wounded_water'],true);assert.equal(sim.flags['m02.pomar_wounded_marked'],false);
 assert.equal(pilot.decide(sim).controls.interact,true,'chalk remains a separate next action');
});

test('the early withdrawal pilot asks for a real input without changing the mission state',()=>{
 const sim=new M02BenchSimulation();sim.enterAreaCC09();sim.startC10OrderChanges();sim.detonateC10FixedArtillery();sim.enemies=[];
 sim.teleportPlayer(-55,54,0,0);const pilot=new M02MissionPilot({earlyWithdrawal:true});pilot.lastCell='C';pilot.enteredAt=-20;
 const before=sim.snapshot(),decision=pilot.decide(sim);
 assert.equal(decision.earlyWithdrawal,true);assert.equal(decision.pending,12);assert.equal(decision.controls.giveWater,true);
 assert.deepEqual(sim.snapshot(),before);assert.equal(sim.areaC.c12Completed,false);
});
