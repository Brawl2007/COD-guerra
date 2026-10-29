import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {playM02GrenadeBounce} from '../src/render/m02-grenade-audio.js';
import {AudioManager} from '../src/core/audio.js';
import {FakeAudioContext} from './helpers/fake-audio-context.js';

test('a real grenade wall impact emits its actual material and location exactly on replay',()=>{
 const sim=new M02BenchSimulation();sim.enterAreaBC06();sim.allies=[];sim.enemies=[];
 const wall={id:'bounce-wall',min:{x:1,y:0,z:97},max:{x:1.2,y:3,z:103},material:'wood_thick'};
 sim.world.obstacles.push(wall);sim.throwGrenade({x:0,y:1.5,z:100},{x:1,y:0,z:0});
 const save=sim.snapshot();sim.drainEvents();for(let i=0;i<8;i++)sim.tick(.05,{});
 const events=sim.drainEvents(),hit=events.find(e=>e.type==='grenade-bounced');
 assert.equal(hit?.material,'wood_thick');assert.ok(Math.abs(hit.point.x-1)<1e-8);assert.ok(hit.speed>10);
 const expected=sim.snapshot();sim.restoreSnapshot(save);sim.world.obstacles.push(wall);sim.drainEvents();for(let i=0;i<8;i++)sim.tick(.05,{});
 assert.deepEqual(sim.snapshot(),expected);assert.deepEqual(sim.drainEvents(),events);
});

test('a resting grenade produces no repeated bounce events',()=>{
 const sim=new M02BenchSimulation();sim.enterAreaBC06();sim.allies=[];sim.enemies=[];
 sim.grenades=[{id:'resting',x:0,y:sim.world.heightAt(0,100)+.08,z:100,vx:0,vy:0,vz:0,spawnedAt:0,fuseAt:20,exploded:false}];
 sim.drainEvents();for(let i=0;i<100;i++)sim.tick(.05,{});
 assert.equal(sim.drainEvents().filter(e=>e.type==='grenade-bounced').length,0);
});

test('bounce audio follows material and position, muffles through walls and creates a bounded real voice',()=>{
 const audio=new AudioManager({contextFactory:()=>new FakeAudioContext(),quality:'low'});audio.init();
 try{
  const player={x:0,y:0,z:0,eyeHeight:1.65,space:'metres'},world={obstacles:[{min:{x:1,y:0,z:-1},max:{x:1.1,y:3,z:1}}]};
  const sim={clock:5,player,world},event={grenadeId:'g',point:{x:2,y:1,z:0},material:'wood_thick',speed:8,clock:5};
  const voice=playM02GrenadeBounce(audio,event,sim,()=>({pan:.8,distance:2,front:.2}));
  assert.ok(voice);assert.ok(voice.sources.size>0);assert.equal(voice.category,'foley');
  assert.equal(audio.diagnostics.eventCounts['grenade-bounce'],1);
  const record=audio.history.at(-1);assert.equal(record.detail.material,'wood');assert.equal(record.detail.blocked,true);
  assert.equal(playM02GrenadeBounce(audio,{...event,speed:.1},sim,()=>({pan:0,distance:2,front:1})),null);
  assert.equal(playM02GrenadeBounce(audio,event,{...sim,clock:6},()=>({pan:0,distance:2,front:1})),null);
  assert.equal(playM02GrenadeBounce(audio,event,sim,()=>({pan:0,distance:26,front:1})),null);
 }finally{audio.dispose();}
});
