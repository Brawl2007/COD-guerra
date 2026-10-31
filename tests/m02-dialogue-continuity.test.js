import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {M02DialogueDirector,M02_DIALOGUE_CATALOG} from '../src/game/m02-combat-ai.js';

test('queued speech skips a missing Lis and continues with the next available line',()=>{
 const sim=new M02BenchSimulation();sim.dialogue=new M02DialogueDirector();sim.drainEvents();
 sim.dialogue.trigger('bz39_c01_01',sim);sim.dialogue.update(sim);
 sim.dialogue.trigger('bz39_c02_02',sim);sim.dialogue.trigger('bz39_c02_03',sim);
 sim.flags['m02.lis_status']='missing';const saved=sim.snapshot();sim.drainEvents();
 const run=()=>{sim.clock=5;sim.dialogue.update(sim);return {dialogue:sim.dialogue.snapshot(),events:sim.drainEvents()};};
 const first=run();assert.equal(first.dialogue.activeLine.id,'bz39_c02_03');
 assert.equal(first.events.filter(e=>e.type==='dialogue-line').length,1);
 assert.equal(first.dialogue.history.some(line=>line.id==='bz39_c02_02'),false);
 sim.restoreSnapshot(saved);sim.drainEvents();assert.deepEqual(run(),first);
});

test('a queued order uses the existing fallback when its addressee becomes unavailable',()=>{
 const sim=new M02BenchSimulation();sim.dialogue=new M02DialogueDirector();sim.drainEvents();
 sim.dialogue.trigger('bz39_c01_01',sim);sim.dialogue.update(sim);
 assert.equal(sim.dialogue.trigger('bz39_c03_01',sim),true);
 const lis=sim.allies.find(a=>a.id==='pl_lis');lis.state='DOWN';sim.clock=5;sim.dialogue.update(sim);
 assert.equal(sim.dialogue.activeLine.id,'bz39_c03_01');assert.equal(sim.dialogue.activeLine.text,M02_DIALOGUE_CATALOG.bz39_c03_01.fallbackText);
});

test('an incapacitated speaker cannot use an addressee fallback to speak',()=>{
 const sim=new M02BenchSimulation();sim.dialogue=new M02DialogueDirector();
 const speaker=sim.allies.find(a=>a.id==='pl_gruca');speaker.alive=false;speaker.state='DOWN';
 assert.equal(sim.dialogue.trigger('bz39_c03_01',sim),false);assert.equal(sim.dialogue.queue.length,0);
});
