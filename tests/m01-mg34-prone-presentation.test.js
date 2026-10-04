import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {M01View} from '../src/render/m01-view.js';
import {M01Characters} from '../src/render/m01-characters.js';
import {actorPose} from '../src/render/m01-actor-pose.js';
import {actorHitboxes,eyePosition,muzzlePosition,mg34ProneSample} from '../src/world/spatial.js';
const loader=new GLTFLoader().register(()=>({name:'CPU_NO_TEXTURE',loadTexture:()=>Promise.resolve(null)}));
async function load(path){const b=fs.readFileSync(new URL('../assets/models/provisional/m01/'+path,import.meta.url));return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
async function characters(){
 const c=new M01Characters(new THREE.Scene());
 for(const [key,path] of [['de:2','characters/m01_soldier_de_lod2.glb'],['mg34:2','weapons/mg34/m01_mg34_lod2.glb']])c.sources.set(key,await load(path));
 for(const path of ['characters/m01_soldier_animations.glb','weapons/mg34/m01_mg34_animations.glb','weapons/mg34-prone/m01_mg34_prone_animations.glb'])for(const clip of (await load(path)).animations)c.clips.set(clip.name,clip);
 return c;
}
function at(s,time){const dt=time-s.clock;s.clock=time;s.updateActors(dt);s.emitMG34Rounds(s.actor('de_east_0'));}
function live(){const s=new M01Simulation();s.scene=null;const a=s.actor('de_east_0');a.active=true;a.cooldown=99;s.updateMG34Posture(a);return s;}
function firing(){const s=live();at(s,1.9);s.burst(s.actor('de_east_0'),s.player,'area',{rounds:7});return s;}
const matrices=v=>{const values=[];v.root.traverse(n=>values.push(...n.matrixWorld.elements));return values;};

test('actual renderer samples enter, idle, burst and exit from simulation and matches its muzzle within 2 mm',async()=>{
 const c=await characters(),s=live(),a=s.actor('de_east_0');
 try{
   for(const time of [.7,1.9,2.03,2.5,3.2]){
     if(time===2.03)s.burst(a,s.player,'area',{rounds:7});
     if(time===2.5){a.state='RETREAT';s.updateMG34Posture(a);}
     at(s,time);const before=s.snapshot(),sample=mg34ProneSample(a,time);
     c.update(s.actors,time,s.player);const v=c.instances.get(a.id);
     assert.equal(v.clip,sample.clip);assert.ok(Math.abs(v.action.time-sample.time)<1e-6);
     const expected=muzzlePosition(a,time);assert.ok(c.muzzle(a.id).distanceTo(new THREE.Vector3(expected.x,expected.y,expected.z))<=.002,JSON.stringify({time,clip:v.clip,socket:v.muzzle,actual:c.muzzle(a.id).toArray(),expected}));
     const frame=matrices(v);for(let i=0;i<3;i++){c.update(s.actors,time,s.player);assert.deepEqual(matrices(v),frame);}
     assert.deepEqual(s.snapshot(),before);assert.ok(!/reload|feed|loader/.test(v.clip));
   }
 }finally{c.dispose();}
});

for(const emitted of [1,4,6])test(`renderer save after ${emitted} shots restores same frame and flash without replay or RNG draws`,async()=>{
 const c=await characters(),s=firing();at(s,s.clock+(emitted-1)*.075+.01);
 const a=s.actor('de_east_0'),save=s.snapshot();s.drainEvents();
 try{
   c.update(s.actors,s.clock,s.player);const frame=matrices(c.instances.get(a.id)),beforeFlash=actorPose(a,s.clock).firing;
   const r=new M01Simulation();r.restoreSnapshot(save);c.update(r.actors,r.clock,r.player);
   assert.deepEqual(matrices(c.instances.get(a.id)),frame);assert.equal(actorPose(r.actor(a.id),r.clock).firing,beforeFlash);
   assert.deepEqual(r.drainEvents(),[]);assert.equal(r.rng.state,s.rng.state);
   at(s,s.clock+.066);at(r,r.clock+.066);assert.deepEqual(r.snapshot(),s.snapshot());assert.deepEqual(r.drainEvents(),s.drainEvents());
   c.update(r.actors,r.clock,r.player);assert.deepEqual(r.snapshot(),s.snapshot());
 }finally{c.dispose();}
});

test('missing prone GLB uses existing procedural batches without changing gameplay, hitboxes, save, RNG or real shots',async()=>{
 const c=await characters(),s=firing(),r=new M01Simulation();r.restoreSnapshot(s.snapshot());s.drainEvents();
 for(const n of [...c.clips.keys()])if(n.startsWith('mg34_prone_'))c.clips.delete(n);
 try{
   for(let i=0;i<8;i++){
     const a=r.actor('de_east_0'),before=r.snapshot(),geometry={eye:eyePosition(a),boxes:actorHitboxes(a),muzzle:muzzlePosition(a,r.clock)};
     const selected=c.update(r.actors,r.clock,r.player);assert.ok(!selected.has(a.id));assert.equal(actorPose(a,r.clock).name,'prone');
     assert.deepEqual(r.snapshot(),before);assert.deepEqual({eye:eyePosition(a),boxes:actorHitboxes(a),muzzle:muzzlePosition(a,r.clock)},geometry);
     at(s,s.clock+.075);at(r,r.clock+.075);assert.deepEqual(r.snapshot(),s.snapshot());assert.deepEqual(r.drainEvents(),s.drainEvents());
   }
 }finally{c.dispose();}
});

for(const phase of ['enter','idle','fire_burst','exit'])test(`rendered death during ${phase} has no residual prone frame, weapon, flash or loader`,async()=>{
 const c=await characters(),s=phase==='fire_burst'||phase==='exit'?firing():live(),a=s.actor('de_east_0');
 if(phase==='idle')at(s,1.9);if(phase==='exit'){a.state='RETREAT';s.updateMG34Posture(a);}
 try{
   c.update(s.actors,s.clock,s.player);a.alive=false;a.health=0;a.state='DOWN';s.updateMG34Posture(a);
   c.update(s.actors,s.clock,s.player);const v=c.instances.get(a.id);
   assert.equal(v.clip,'fallen');assert.equal(v.weaponRoot.visible,false);assert.equal(actorPose(a,s.clock).firing,false);assert.equal(a.mg34Prone,undefined);
   s.drainEvents();at(s,s.clock+2);assert.deepEqual(s.drainEvents(),[]);assert.ok(s.actors.every(x=>!x.loaderFor&&!x.mg34Loader));
 }finally{c.dispose();}
});

function realFireEffects(s){
 const geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial();
 const view=Object.create(M01View.prototype);Object.assign(view,{camera:{position:new THREE.Vector3()},fireDummy:new THREE.Object3D(),characters:null,impacts:[],fireBatches:{}});
 for(const name of ['muzzle','tracer','puff','spark','smoke'])view.fireBatches[name]=new THREE.InstancedMesh(geometry,material,64);
 view.updateFire(s);const result={counts:structuredClone(view.fx),matrices:Array.from(view.fireBatches.muzzle.instanceMatrix.array)};
 geometry.dispose();material.dispose();return result;
}
for(const emitted of [1,4,6])test(`actual muzzle effect after shot ${emitted} has no extra flash in the .06/.075 gap or restore`,()=>{
 const s=firing();at(s,s.clock+(emitted-1)*.075+.02);const save=s.snapshot(),before=realFireEffects(s);
 assert.equal(before.counts.muzzle,1);assert.deepEqual(realFireEffects(s),before,'paused effect frame');assert.deepEqual(s.snapshot(),save);
 const r=new M01Simulation();r.restoreSnapshot(save);assert.deepEqual(realFireEffects(r),before,'restored effect frame');
 at(s,s.clock+.041);at(r,r.clock+.041);assert.equal(s.actor('de_east_0').shot,0);
 assert.equal(realFireEffects(s).counts.muzzle,0);assert.equal(realFireEffects(r).counts.muzzle,0);assert.deepEqual(r.snapshot(),s.snapshot());
});
test('actual muzzle batches have no post-death flash during all four prone phases',()=>{
 for(const phase of ['enter','idle','fire_burst','exit']){
   const s=phase==='fire_burst'||phase==='exit'?firing():live(),a=s.actor('de_east_0');
   if(phase==='idle')at(s,1.9);if(phase==='exit'){a.state='RETREAT';s.updateMG34Posture(a);}
   a.alive=false;a.health=0;a.state='DOWN';s.updateMG34Posture(a);
   assert.equal(realFireEffects(s).counts.muzzle,0);at(s,s.clock+.05);assert.equal(realFireEffects(s).counts.muzzle,0);
 }
});
