import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {visualNoise} from '../src/render/m01-atmosphere.js';

test('battlefield FX visual noise is deterministic, bounded and independent from simulation RNG',()=>{
  for(const seed of [0,1,19390901,0xffffffff]){
    const a=Array.from({length:64},(_,i)=>visualNoise(seed,i)),b=Array.from({length:64},(_,i)=>visualNoise(seed,i));
    assert.deepEqual(a,b);assert.ok(a.every(n=>n>=0&&n<1));assert.ok(new Set(a).size>60);
  }
  const a=new M01Simulation(19390901),b=new M01Simulation(19390901);
  for(let tick=0;tick<240;tick++){
    const controls=tick===0?{skip:true}:tick%41===0?{lookX:3,aim:true}:{};
    a.tick(.05,controls);for(let i=0;i<50;i++)visualNoise(0xabc000+tick,i);b.tick(.05,controls);
  }
  assert.deepEqual(a.snapshot(false),b.snapshot(false));
});

test('battlefield FX stays presentation-only with explicit hard pool limits',()=>{
  const view=readFileSync(new URL('../src/render/m01-view.js',import.meta.url),'utf8');
  const atmosphere=readFileSync(new URL('../src/render/m01-atmosphere.js',import.meta.url),'utf8');
  assert.doesNotMatch(view,/src\/core\/random|Math\.random\s*\(/);assert.doesNotMatch(atmosphere,/src\/core\/random|Math\.random\s*\(/);
  for(const token of ['bursts:16','flash:16','core:48','fire:96','smoke:128','dust:128','shards:96','lights:1'])assert.match(view,new RegExp(token.replace(':','\\s*:\\s*')));
  assert.match(atmosphere,/this\.capacity=256/);assert.match(atmosphere,/InstancedMesh\(this\.debrisGeometry,this\.debrisMaterial,64\)/);
  assert.match(view,/state\.damage\.find/);assert.match(view,/battlefieldBlastKind\(id,b\.aerial\)/);
});


test('muzzle presentation telemetry latches only after a rendered muzzle frame and resets without simulation state',()=>{
  const view=readFileSync(new URL('../src/render/m01-view.js',import.meta.url),'utf8');
  assert.match(view,/this\.muzzlePresentation=\{frames:0,lastClock:null,lastFrame:null\}/);
  assert.match(view,/this\.engine\.render\(this\.scene,this\.camera\);\s*if\(this\.fx\.muzzle>0\)\{this\.muzzlePresentation\.frames\+\+;this\.muzzlePresentation\.lastClock=time;this\.muzzlePresentation\.lastFrame=this\.renderedFrames\?\?0;\}/);
  assert.match(view,/resetEffects\(\)[\s\S]*this\.muzzlePresentation=\{frames:0,lastClock:null,lastFrame:null\}/);
  assert.match(view,/fireEffects:\{\.\.\.this\.fx\},muzzlePresentation:\{\.\.\.this\.muzzlePresentation\}/);
  assert.doesNotMatch(view,/muzzlePresentation[\s\S]{0,120}(snapshot|saveCheckpoint|rng)/);
});
