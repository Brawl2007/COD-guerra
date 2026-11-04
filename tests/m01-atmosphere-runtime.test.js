import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01Atmosphere} from '../src/render/m01-atmosphere.js';
test('damage presentation is bounded, frozen at pause, reconstructible and never mutates source state',()=>{
 const original=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})};
 const scene=new THREE.Scene(),a=new M01Atmosphere(scene),b=new M01Atmosphere(new THREE.Scene());
 try{
  const state={damage:Array.from({length:30},(_,i)=>({id:`${i}_demolition`,smokeVisible:true,started:10,x:i*10,y:0,z:0}))},saved=structuredClone(state);
  const read=v=>({count:v.count,puffs:Array.from(v.puffs.instanceMatrix.array),colors:Array.from(v.puffs.instanceColor.array),fade:Array.from(v.fade.array),debrisCount:v.debris.count,debris:Array.from(v.debris.instanceMatrix.array)});
  a.update(state,11,'high');const frame=read(a);assert.equal(frame.count,256);assert.equal(frame.debrisCount,64);
  a.update(state,11,'high');assert.deepEqual(read(a),frame);b.update(structuredClone(state),11,'high');assert.deepEqual(read(b),frame);
  a.update(state,12,'medium');assert.ok(a.count<=192);a.update(state,12,'low');assert.ok(a.count<=112);
  a.update(state,260,'high');assert.equal(a.debris.count,0);assert.deepEqual(state,saved);
 }finally{a.dispose();b.dispose();globalThis.document=original;}
 assert.equal(scene.children.length,0);
});

test('T25 all six raid smoke columns survive 05:36 with bounded pools and identical pause/reconstruction',()=>{
 const original=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})};
 const a=new M01Atmosphere(new THREE.Scene()),b=new M01Atmosphere(new THREE.Scene());
 try{
  const state={damage:Array.from({length:6},(_,i)=>({id:`raid_0530${i?'_'+i:''}`,smokeVisible:true,started:40*i,x:-600-70*i,y:-3,z:100}))},saved=structuredClone(state);
  const read=v=>({count:v.count,puffs:Array.from(v.puffs.instanceMatrix.array),fade:Array.from(v.fade.array),colors:Array.from(v.puffs.instanceColor.array)});
  // Real clock 05:36 when one battle second equals one active second: older than the old 240 s lifetime.
  for(const quality of ['high','medium','low']){
   const each=Math.round(22*(quality==='low'?.58:quality==='medium'?.80:1));
   for(const damage of state.damage){
    a.update({damage:[damage]},360,quality);assert.equal(a.count,each);
    assert.ok(Array.from(a.fade.array).slice(0,each).some(n=>n>.05),`${damage.id} has visible opacity`);
   }
   a.update(state,360,quality);assert.equal(a.count,6*each);assert.ok(a.count<=a.capacity);
   const frame=read(a);a.update(state,360,quality);assert.deepEqual(read(a),frame);
   b.update(structuredClone(state),360,quality);assert.deepEqual(read(b),frame);
  }
  a.update({damage:[{id:'forward_post',smokeVisible:true,started:0,x:0,y:-3,z:0}]},360,'high');
  assert.ok(Array.from(a.fade.array).slice(0,a.count).every(n=>n===0),'unrelated smoke keeps its previous lifetime');
  assert.deepEqual(state,saved);
 }finally{a.dispose();b.dispose();globalThis.document=original;}
});

test('package 2: the clouds of dust the simulation reports (state.dust) are drawn at their place, size and density, within the pools; no cloud, no puff; the state is never mutated',()=>{
 const original=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})};
 const a=new M01Atmosphere(new THREE.Scene()),b=new M01Atmosphere(new THREE.Scene());
 try{
  const cloud=(over={})=>({id:'bomb_test',x:-130,y:-3,z:26,r:16,h:12,density:1,...over});
  a.update({damage:[],dust:[]},10,'high');assert.equal(a.count,0,'no cloud, no puff');
  a.update({damage:[]},10,'high');assert.equal(a.count,0,'a state without the field (an older caller) draws nothing');
  const state={damage:[],dust:[cloud(),cloud({id:'m01_grenade_1',x:-50,z:40,r:4.5,h:3.5,density:.5}),cloud({id:'east_demolition',x:800,y:0,z:20,r:42,h:32,density:.25})]},saved=structuredClone(state);
  a.update(state,10,'high');
  const each=[Math.min(20,Math.max(3,Math.round(16*16/20))),Math.min(20,Math.max(3,Math.round(4.5*4.5/20))),Math.min(20,Math.max(3,Math.round(42*42/20)))];
  assert.equal(a.count,each[0]+each[1]+each[2],'one puff per slot of each cloud: the bigger the cloud the more, to the quality\'s cap');
  assert.deepEqual(state,saved,'the state is the simulation\'s: never written');
  const fade=Array.from(a.fade.array).slice(0,a.count);
  assert.ok(fade.slice(0,each[0]).every(v=>Math.abs(v-.62)<1e-6),'full density: .62');
  assert.ok(fade.slice(each[0],each[0]+each[1]).every(v=>Math.abs(v-.31)<1e-6),'half density, half the opacity');
  assert.ok(fade.slice(each[0]+each[1]).every(v=>Math.abs(v-.155)<1e-6));
  // the puffs lie inside the cylinder of the first cloud
  const m=a.puffs.instanceMatrix.array;for(let i=0;i<each[0];i++){const x=m[i*16+12],y=m[i*16+13],z=m[i*16+14];assert.ok(Math.hypot(x+130,z-26)<=16+1e-6&&y>=-3&&y<=-3+12+1,`puff ${i} inside the cloud`);}
  // pools: the quality's cap per cloud and the pool's capacity
  a.update(state,10,'low');assert.ok(a.count<=112);a.update(state,10,'medium');assert.ok(a.count<=192);
  a.update(state,10,'high');
  b.update(structuredClone(state),10,'high');assert.deepEqual(Array.from(b.puffs.instanceMatrix.array).slice(0,16*each[0]),Array.from(a.puffs.instanceMatrix.array).slice(0,16*each[0]),'reconstructible: the same state draws the same puffs');
 }finally{a.dispose();b.dispose();globalThis.document=original;}
});
