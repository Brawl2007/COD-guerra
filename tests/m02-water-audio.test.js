import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {playM02WaterHandling} from '../src/render/m02-water-audio.js';
import {AudioManager} from '../src/core/audio.js';
import {FakeAudioContext} from './helpers/fake-audio-context.js';

test('the water foley is caused by the live handoff and does not replay after checkpoint restore',()=>{
 const sim=new M02BenchSimulation(),w=sim.enemies.find(e=>e.c04Candidate);sim.enemies=[w];sim.allies=[];
 Object.assign(w,{x:1,y:0,z:-60,health:40,alive:true,state:'WOUNDED_UNARMED',nonCombatant:true});sim.teleportPlayer(0,-60,0,0);
 sim.drainEvents();sim.tick(.05,{giveWater:true});const event=sim.drainEvents().find(e=>e.type==='c04-water-started');assert.ok(event);
 const saved=sim.snapshot(),audio=new AudioManager({contextFactory:()=>new FakeAudioContext(),quality:'low'});audio.init();
 try{
  const voice=playM02WaterHandling(audio,event,sim);assert.ok(voice);assert.equal(voice.category,'player');assert.equal(voice.sources.size,3);
  assert.equal(audio.diagnostics.eventCounts['water-handling'],1);assert.deepEqual(sim.snapshot(),saved);
  assert.equal(playM02WaterHandling(audio,{...event,actorId:'other'},sim),null);
  assert.equal(playM02WaterHandling(audio,event,{...sim,clock:sim.clock+1}),null);
  sim.restoreSnapshot(saved);sim.drainEvents();sim.tick(.05,{});assert.equal(sim.drainEvents().some(e=>e.type==='c04-water-started'),false);
  sim.tick(.05,{forward:1});assert.equal(playM02WaterHandling(audio,event,sim),null);
 }finally{audio.dispose();}
});
