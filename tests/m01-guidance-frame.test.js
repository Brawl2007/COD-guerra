import test from 'node:test';
import assert from 'node:assert/strict';
import {guidanceFrame} from '../tools/verification/m01-guidance-frame.mjs';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {gameplayFrame} from './helpers/m01-animation-contract.js';
test('guidance proof projection is immutable and retains actor, RNG, clock, mission and shot changes',()=>{
 const s=new M01Simulation(),raw=gameplayFrame(s,[{type:'message',message:'test',priority:2,scope:{id:'a',state:'active'}},{type:'round-impact',distance:10}]),copy=structuredClone(raw);
 const result=guidanceFrame(raw,new Set());assert.deepEqual(raw,copy);assert.deepEqual(result.events,[{type:'message',message:'test'},{type:'round-impact',distance:10}]);
 for(const change of [f=>f.state.actors[0].health--,f=>f.state.rng++,f=>f.state.clock++,f=>f.state.mission.text='wrong',f=>f.events[1].distance++]){
  const other=structuredClone(raw);change(other);assert.notDeepEqual(guidanceFrame(other,new Set()),result,'no gameplay field is masked');
 }
 const allowed=structuredClone(raw);allowed.state.mission.status='new HUD status';allowed.state.flags['m01.suggested_cover']='cv_road_truss_1';allowed.state.timers.guideAt=500;
 assert.deepEqual(guidanceFrame(allowed,new Set()),result,'only the named presentation paths are removed');
});
