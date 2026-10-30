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
