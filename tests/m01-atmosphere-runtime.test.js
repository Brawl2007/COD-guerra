import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01Atmosphere} from '../src/render/m01-atmosphere.js';
import {M01DustVolumes,DUST_VOLUME_K,DUST_VOLUME_ORDER,DUST_VOLUME_OPAQUE} from '../src/render/m01-dust-volume.js';
import {DUST} from '../src/game/m01-dust.js';
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

test('package 2: the clouds of dust the simulation reports (state.dust) are drawn as volumes at their place, size and density, within the pools; the farthest beyond the pool keep soft puffs; no cloud, nothing; the state is never mutated',()=>{
 const original=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})};
 const a=new M01Atmosphere(new THREE.Scene()),b=new M01Atmosphere(new THREE.Scene());
 try{
  const cloud=(over={})=>({id:'bomb_test',x:-130,y:-3,z:26,r:16,h:12,density:1,...over});
  const vol=atm=>atm.dustVolumes;
  a.update({damage:[],dust:[]},10,'high');assert.equal(a.count,0,'no cloud, no puff');assert.equal(vol(a).drawn,0);assert.equal(vol(a).mesh.visible,false);
  a.update({damage:[]},10,'high');assert.equal(a.count,0,'a state without the field (an older caller) draws nothing');assert.equal(vol(a).drawn,0);
  const state={damage:[],dust:[cloud(),cloud({id:'m01_grenade_1',x:-50,z:40,r:4.5,h:3.5,density:.5}),cloud({id:'east_demolition',x:800,y:0,z:20,r:42,h:32,density:.25})]},saved=structuredClone(state);
  a.update(state,10,'high');
  assert.equal(a.count,0,'every cloud is inside the pool: volumes, no puffs');assert.equal(vol(a).drawn,3);assert.equal(vol(a).mesh.count,3);assert.equal(vol(a).mesh.visible,true);
  assert.deepEqual(state,saved,'the state is the simulation\'s: never written');
  // each instance is the cloud's own cylinder box: centre, 2r x (h + .5 m under the crater's floor) x 2r, and its density
  const m=vol(a).mesh.instanceMatrix.array,dens=vol(a).density.array;
  state.dust.forEach((c,i)=>{const o=i*16;assert.ok(Math.abs(m[o]-2*c.r)<1e-4&&Math.abs(m[o+5]-(c.h+.5))<1e-4&&Math.abs(m[o+10]-2*c.r)<1e-4,`cloud ${i} box size`);
    assert.ok(Math.abs(m[o+12]-c.x)<1e-4&&Math.abs(m[o+13]-(c.y-.5+(c.h+.5)/2))<1e-4&&Math.abs(m[o+14]-c.z)<1e-4,`cloud ${i} box centre`);assert.ok(Math.abs(dens[i]-c.density)<1e-6,`cloud ${i} density`);});
  // pools: the quality's cap (low 4 / medium 6 / high 8) is a number of volumes; the clouds beyond it, the farthest from the eye, keep the soft puffs
  const many=Array.from({length:10},(_,i)=>cloud({id:`bomb_${i}`,x:-130+i*40,z:26}));
  for(const [q,cap] of [['low',4],['medium',6],['high',8]]){
    a.update({damage:[],dust:many},10,q,{eye:{x:-130,y:0,z:26}});assert.equal(vol(a).drawn,cap,`${q}: ${cap} volumes`);
    const per=Math.min(q==='low'?9:q==='medium'?14:20,Math.max(3,Math.round(16*16/20)));assert.equal(a.count,(many.length-cap)*per,`${q}: the rest keeps its puffs`);
    const picked=Array.from(vol(a).pickIndex).slice(0,cap);assert.deepEqual(picked,Array.from({length:cap},(_,i)=>i),`${q}: the nearest to the eye first`);
  }
  a.update({damage:[],dust:many},10,'high',{eye:{x:-130+9*40,y:0,z:26}});assert.equal(vol(a).pickIndex[0],9,'the eye decides which are nearest');
  // the cloud that hides a man is drawn before the lingering smoke columns, which would fill the pool alone (30 craters at high: 256 puffs)
  const crowded={damage:Array.from({length:30},(_,i)=>({id:`${i}_demolition`,smokeVisible:true,started:10,x:i*10,y:0,z:0})),dust:[cloud()]};
  a.update(crowded,11,'high');assert.equal(a.count,256);assert.equal(vol(a).drawn,1,'the volume does not compete with the smoke for the puff pool');
  // beyond the pool the puffs are the old ones: one per slot of the cloud, at .62 x density, inside its cylinder, before the smoke columns
  a.update({damage:[],dust:[cloud(),cloud({x:900}),cloud({x:1000}),cloud({x:1100}),cloud({id:'far',x:1200,density:.5})]},10,'low',{eye:{x:-130,y:0,z:26}});
  assert.equal(vol(a).drawn,4);assert.equal(a.count,9);assert.ok(Array.from(a.fade.array).slice(0,9).every(v=>Math.abs(v-.31)<1e-6),'the overflow cloud keeps the half-density puffs');
  const p=a.puffs.instanceMatrix.array;for(let i=0;i<9;i++)assert.ok(Math.hypot(p[i*16+12]-1200,p[i*16+14]-26)<=16+1e-6,`overflow puff ${i} inside its cloud`);
  a.update(state,10,'high');
  b.update(structuredClone(state),10,'high');assert.deepEqual(Array.from(b.dustVolumes.mesh.instanceMatrix.array).slice(0,48),Array.from(a.dustVolumes.mesh.instanceMatrix.array).slice(0,48),'reconstructible: the same state draws the same volumes');
 }finally{a.dispose();b.dispose();globalThis.document=original;}
});

test('dust volumes: the optical depth the shader integrates is the simulation\'s thickness (density x chord): 3 m of density-1 cloud, the sight line the AI cannot cross, is nearly opaque; a thin cloud stays thin; no allocation per update',()=>{
 const scene=new THREE.Scene(),v=new M01DustVolumes(scene);
 try{
  const alphaAt=thickness=>1-Math.exp(-DUST_VOLUME_K*.45*thickness);   // the mean of the shader's soft profile
  assert.ok(alphaAt(DUST.blockAt)>.93,'the thickness that blocks the AI draws as an opaque curtain');
  assert.ok(alphaAt(DUST.blockAt*.3)<.65,'a thin cloud (a third of the blocking thickness) is still see-through');
  const clouds=[{x:0,y:0,z:0,r:16,h:12,density:1},{x:50,y:0,z:0,r:8,h:7,density:.4}];
  v.update(clouds,2,'low',1,1);
  const buffer=v.mesh.instanceMatrix.array;
  for(let i=0;i<50;i++){v.pick(clouds,4,{x:0,y:0,z:0});v.update(clouds,2,'high',i,1);}
  assert.ok(v.mesh.instanceMatrix.array===buffer,'the buffers are the ones built once');
  assert.equal(v.material.uniforms.uSteps.value,9);v.update(clouds,2,'low',1,1);assert.equal(v.material.uniforms.uSteps.value,4);
  assert.equal(v.material.side,THREE.DoubleSide);assert.equal(v.material.depthWrite,false);
 }finally{v.dispose();}
});

test('dust volumes: drawn before the particle batches (renderOrder 0), with a depth pass after the colour pass, so effects in front of a cloud composite over it and effects behind its near-opaque part are rejected',()=>{
 const scene=new THREE.Scene(),v=new M01DustVolumes(scene);
 try{
  // three.js draws the transparent list by renderOrder first, then by distance: the sprites of flash/fire/smoke/dust and the smoke columns (billboardBatch) are renderOrder 0
  assert.ok(v.mesh.renderOrder<0,'the colour pass is drawn before every renderOrder-0 particle batch');
  assert.ok(v.depthMesh.renderOrder>v.mesh.renderOrder&&v.depthMesh.renderOrder<0,'the depth pass follows the colour pass, still before the particle batches');
  assert.equal(v.mesh.renderOrder,DUST_VOLUME_ORDER.color);assert.equal(v.depthMesh.renderOrder,DUST_VOLUME_ORDER.depth);
  assert.ok(v.mesh.renderOrder>-1,'after the ground marks and embers (renderOrder -3..-1)');
  assert.equal(v.material.depthWrite,false,'the colour pass writes no depth (thin dust lets what is behind it show through)');
  assert.equal(v.depthMaterial.depthWrite,true);assert.equal(v.depthMaterial.colorWrite,false);assert.equal(v.depthMaterial.transparent,true,'in the transparent list, after the colour pass');
  assert.ok(v.depthMaterial.uniforms===v.material.uniforms,'one set of uniforms (steps, noise, time) for both passes');
  assert.ok(v.depthMesh.instanceMatrix===v.mesh.instanceMatrix&&v.depthMesh.geometry===v.mesh.geometry,'the same instances');
  assert.ok('DEPTH_PASS' in v.depthMaterial.defines&&!('DEPTH_PASS' in (v.material.defines??{})));
  assert.ok(v.depthMaterial.fragmentShader.includes('#ifdef DEPTH_PASS')&&v.depthMaterial.fragmentShader.includes('DUST_OPAQUE'));
  assert.ok(Number(v.depthMaterial.defines.DUST_OPAQUE)>.5&&Math.abs(Number(v.depthMaterial.defines.DUST_OPAQUE)-DUST_VOLUME_OPAQUE)<1e-3);
  const clouds=[{x:0,y:0,z:0,r:16,h:12,density:1}];
  v.update(clouds,1,'high',1,1);assert.equal(v.depthMesh.count,1);assert.equal(v.depthMesh.visible,true);
  v.update(clouds,0,'high',1,1);assert.equal(v.depthMesh.count,0);assert.equal(v.depthMesh.visible,false);
 }finally{v.dispose();}
 assert.equal(scene.children.length,0,'dispose removes both passes');
});
