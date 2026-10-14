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
