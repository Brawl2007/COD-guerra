import test from 'node:test';
import assert from 'node:assert/strict';
import {SIM_STEP,M01_MAX_CATCHUP_STEPS,frameSimBudget,frameSimSteps,playDueSounds} from '../src/game/frame-catchup.js';
import {M01Simulation} from '../src/game/m01-simulation.js';

// The loop in game.js is: remaining=frameSimBudget(dt,m01); while(remaining>1e-7){step=min(SIM_STEP,remaining);tick(step);remaining-=step}.
// Mirror it here against the real simulation so the test proves the sim result, not only the helper.
function runFrame(sim,dt,m01=true){let remaining=frameSimBudget(dt,m01),steps=0;while(remaining>1e-7){const step=Math.min(SIM_STEP,remaining);sim.tick(step,{});remaining-=step;steps++;}return steps;}

test('catch-up cap: M01 runs at most 3 fixed 0.05 s steps (150 ms) per rendered frame and drops the excess real time',()=>{
  assert.equal(SIM_STEP,.05);assert.equal(M01_MAX_CATCHUP_STEPS,3);
  for(const [dt,steps] of [[0,0],[.016,1],[.05,1],[.051,2],[.1,2],[.15,3],[.16,3],[.25,3],[1,3]])
    assert.equal(frameSimSteps(frameSimBudget(dt,true)),steps,`dt ${dt}`);
  assert.ok(frameSimBudget(.25,true)<=.15+1e-12,'a hitch can never schedule more than 150 ms of simulation');
  // not M01 (bench): one step, as before
  assert.equal(frameSimBudget(.25,false),.05);assert.equal(frameSimBudget(.01,false),.01);assert.equal(frameSimBudget(-1,true),0);
});

test('catch-up cap: a hitch does not snowball; a frame under the cap is simulated exactly as before (bit-identical clock and state)',()=>{
  const a=new M01Simulation(19390901),b=new M01Simulation(19390901);
  // ordinary frames (all <= 0.15 s) are untouched by the cap: same steps, same state as ticking the whole dt in 0.05 chunks
  for(const dt of [.016,.033,.07,.1,.12,.15,.016]){
    runFrame(a,dt);let remaining=dt;while(remaining>1e-7){const step=Math.min(.05,remaining);b.tick(step,{});remaining-=step;}
  }
  assert.equal(a.clock,b.clock);assert.deepEqual(a.snapshot(),b.snapshot());
  // a 250 ms hitch costs 3 ticks (150 ms) instead of 5
  const before=a.clock,steps=runFrame(a,.25);
  assert.equal(steps,3);assert.ok(Math.abs(a.clock-before-.15)<1e-9,`advanced ${a.clock-before}`);
  // and the next normal frame is a normal frame (nothing carried over)
  assert.equal(runFrame(a,.016),1);
});

test('playDueSounds: plays due sounds in order, compacts the rest in place without allocating a new array, nothing lost or reordered',()=>{
  const queue=[{id:'a',at:5},{id:'b',at:1},{id:'c',at:9},{id:'d',at:2},{id:'e',at:5}],same=queue,played=[];
  const left=playDueSounds(queue,5,s=>played.push(s.id));
  assert.deepEqual(played,['a','b','d','e']);assert.deepEqual(queue.map(s=>s.id),['c']);assert.equal(left,1);assert.equal(queue,same);
  assert.equal(playDueSounds(queue,8.99,()=>assert.fail('not due')),1);
  assert.equal(playDueSounds(queue,9,s=>played.push(s.id)),0);assert.deepEqual(played.at(-1),'c');assert.equal(queue.length,0);
  assert.equal(playDueSounds([],1,()=>assert.fail()),0);
});
