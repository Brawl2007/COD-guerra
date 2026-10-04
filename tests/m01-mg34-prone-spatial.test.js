import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {realMG34Rig,geometryContract} from '../tools/verification/m01-mg34-prone-geometry.mjs';
import contract from '../src/world/m01-mg34-prone-geometry.json' with {type:'json'};
import {M01Simulation} from '../src/game/m01-simulation.js';
import {actorHitboxes,eyePosition,muzzlePosition,mg34ProneSample,mg34ProneGeometry} from '../src/world/spatial.js';
const FACINGS=[0,Math.PI/2,Math.PI,-Math.PI/2];
const actor=(phase,facing=0,progress=1)=>({id:'de_east_0',weapon:'mg34',space:'metres',alive:true,active:true,x:1055,y:2,z:32,facing,
 mg34Prone:{phase,startedAt:3,duration:1.9,progress,...(phase==='exit'?{fromProgress:1}:{})}});
const center=b=>['x','y','z'].map(k=>(b.min[k]+b.max[k])/2);
const vec=p=>new THREE.Vector3(p.x,p.y,p.z);
const rotate=(a,p)=>new THREE.Vector3(...p).applyAxisAngle(new THREE.Vector3(0,1,0),-a.facing-Math.PI/2).add(new THREE.Vector3(a.x,a.y,a.z));

test('numeric muzzle proof against real attached soldier/weapon GLBs for all phases and four facings',async()=>{
 const rig=await realMG34Rig();let max=0,comparisons=0;
 for(const phase of ['enter','idle','aim','fire_burst','exit'])for(const facing of FACINGS){
   const end=['enter','exit'].includes(phase)?1.9:phase==='fire_burst'?.524:0;
   for(let i=0;i<=Math.ceil(end/.007);i++){
     const t=Math.min(end,i*.007),a=actor(phase,facing,['enter','exit'].includes(phase)?t/1.9:1);
     const sample=mg34ProneSample(a,3+t),actual=rotate(a,rig.sample(sample.clip,sample.time).slice(0,3));
     const d=actual.distanceTo(vec(muzzlePosition(a,3+t)));max=Math.max(max,d);comparisons++;
     assert.ok(d<=contract.tolerance,`${phase} facing=${facing} t=${t}: ${d} m exceeds ${contract.tolerance}`);
   }
 }
 console.log(`MG34 muzzle proof: ${comparisons} comparisons, max=${max.toFixed(9)} m, tolerance=${contract.tolerance} m`);
});

test('geometry table is derived reproducibly from the exact real GLBs, without a graphics or asset dependency in simulation',async()=>{
 assert.deepEqual(await geometryContract(),contract);
});

for(const facing of FACINGS)test(`head/torso/legs move along body axis facing=${facing} during prone and transitions`,()=>{
 for(const phase of ['enter','idle','exit'])for(const progress of [.25,.5,.75,1]){
   const a=actor(phase,facing,progress),reference=actor(phase,0,progress),boxes=actorHitboxes(a),zero=actorHitboxes(reference);
   for(let i=0;i<3;i++){
     const [rx,ry,rz]=center(zero[i]),[x,y,z]=center(boxes[i]);
     const dx=rx-a.x,dz=rz-a.z;
     assert.ok(Math.abs(x-(a.x+Math.cos(facing)*dx-Math.sin(facing)*dz))<1e-9);
     assert.ok(Math.abs(z-(a.z+Math.sin(facing)*dx+Math.cos(facing)*dz))<1e-9);
     assert.equal(y,ry);
   }
 }
 const a=actor('idle',facing),projection=actorHitboxes(a).map(b=>{const [x,,z]=center(b);return (x-a.x)*Math.cos(facing)+(z-a.z)*Math.sin(facing);});
 assert.ok(projection[0]>projection[1]&&projection[1]>projection[2],`head front, torso centre, legs rear: ${projection}`);
 assert.ok(projection[0]-projection[2]>.7,'body is elongated along facing, rather than centred lowered boxes');
});

test('partial entry interruption reverses the actual enter clip continuously instead of jumping to an unrelated exit frame',()=>{
 for(const facing of FACINGS)for(const progress of [.2,.5,.8]){
   const a=actor('enter',facing,progress),before={eye:eyePosition(a),muzzle:muzzlePosition(a),boxes:actorHitboxes(a)};
   a.mg34Prone={phase:'exit',startedAt:4,duration:1.9,progress:0,fromProgress:progress};
   assert.deepEqual({eye:eyePosition(a),muzzle:muzzlePosition(a),boxes:actorHitboxes(a)},before);
   assert.equal(mg34ProneSample(a).clip,'mg34_prone_enter');
   a.mg34Prone.progress=1;assert.equal(mg34ProneSample(a).time,0);
 }
});

test('real rounds start at the rendered prone socket at each of seven scheduled shot instants',async()=>{
 const s=new M01Simulation(),a=s.actor('de_east_0');a.active=true;s.updateMG34Posture(a);s.clock=1.9;s.updateMG34Posture(a);
 s.burst(a,{x:100,y:0,z:22},'area',{rounds:7});const rig=await realMG34Rig();
 for(const r of a.mg34Prone.burst.plan){
   const sample=mg34ProneSample(a,r.firedAt),actual=rotate(a,rig.sample(sample.clip,sample.time).slice(0,3));
   assert.ok(actual.distanceTo(new THREE.Vector3(r.ox,r.oy,r.oz))<=contract.tolerance);
   assert.ok(r.oy-a.y<.5,'no standing-height origin while lying down');
 }
});

test('pause keeps eye, hitboxes, muzzle and canonical clip frame exactly stable across all saved phases',()=>{
 for(const phase of ['enter','idle','aim','fire_burst','exit']){
   const a=actor(phase,Math.PI/2,.4),clock=3+(phase==='fire_burst'?.3:.76);
   const read=()=>({eye:eyePosition(a),boxes:actorHitboxes(a),muzzle:muzzlePosition(a,clock),sample:mg34ProneSample(a,clock),geometry:mg34ProneGeometry(a,clock)});
   const before=read();for(let i=0;i<10;i++)assert.deepEqual(read(),before);
 }
});
