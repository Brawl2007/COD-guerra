import assert from 'node:assert/strict';
import {M01Simulation} from '../../src/game/m01-simulation.js';

// Exact numbers and key membership; no epsilon, rounded clocks or omitted gameplay fields.
export function firstDifference(a,b,path='$'){
  if(Object.is(a,b))return null;
  if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return {path,a,b};
  if(Array.isArray(a)!==Array.isArray(b))return {path,a,b};
  for(const key of new Set([...Object.keys(a),...Object.keys(b)])){
    if(!Object.hasOwn(a,key)||!Object.hasOwn(b,key))return {path:`${path}.${key}`,a:a[key],b:b[key],missing:true};
    const diff=firstDifference(a[key],b[key],`${path}.${key}`);if(diff)return diff;
  }
  return null;
}
export const json=value=>JSON.parse(JSON.stringify(value));
export const observation=s=>({state:s.snapshot(false),checkpoint:json(s.checkpoint)});
export function equalFuture(a,b,eventsA,eventsB,{label,tick,dt,controls}){
  const left={...observation(a),events:json(eventsA)},right={...observation(b),events:json(eventsB)};
  // Fast path avoids walking identical trees; detailed traversal happens only on a mismatch.
  if(JSON.stringify(left)===JSON.stringify(right))return;
  const difference=firstDifference(left,right);
  if(difference)assert.fail(JSON.stringify({label,firstDivergenceTick:tick,dt,controls,clockA:a.clock,clockB:b.clock,difference}));
}
export function restore(s){const raw=s.snapshot(),before=JSON.stringify(raw),b=new M01Simulation(1);b.restoreSnapshot(raw);
  assert.equal(JSON.stringify(raw),before,'restore cannot edit supplied save');
  assert.deepEqual(b.drainEvents(),[],'restore cannot replay transient events');return b;}
export function compareContinuation(a,{label,ticks=200,input=()=>({}),dt=()=>.05,doubleAt=[]}={}){
  a.drainEvents();let b=restore(a);let compared=0;
  equalFuture(a,b,[],[],{label,tick:0,dt:0,controls:{}});
  for(let tick=1;tick<=ticks;tick++){
    const controls=json(input(tick,a)),step=dt(tick);
    a.tick(step,controls);b.tick(step,json(controls));
    equalFuture(a,b,a.drainEvents(),b.drainEvents(),{label,tick,dt:step,controls});compared++;
    if(doubleAt.includes(tick)){b=restore(b);b=restore(b);equalFuture(a,b,[],[],{label,tick,dt:0,controls:{}});}
  }
  return {label,ticks:compared,firstDivergence:null,clock:a.clock,rng:a.rng.state};
}
