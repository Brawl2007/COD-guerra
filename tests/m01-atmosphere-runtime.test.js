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
