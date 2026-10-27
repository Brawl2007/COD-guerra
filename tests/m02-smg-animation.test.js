import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {viewModelFixture} from './helpers/m01-viewmodel-fixture.js';
import {generateMP38} from '../tools/assets/m02-mp38/build.mjs';
import {mp38ReloadPose,retargetSMGClip,MP38_GRIP} from '../src/render/m02-smg-animation.js';
import {M02Weapons} from '../src/render/m02-weapons.js';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';

const glb=async lod=>{const b=generateMP38(lod).buffer;return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
test('MP38 GLBs have a separate detachable magazine and preserve the scale and body while it moves',async()=>{
 for(const lod of [0,1]){
  const {scene}=await glb(lod),body=scene.getObjectByName('mp38_body'),mag=scene.getObjectByName('mp38_magazine');assert.ok(body&&mag);
  const before=new THREE.Box3().setFromObject(body);mag.position.fromArray(mp38ReloadPose(.8).position);scene.updateMatrixWorld(true);
  assert.deepEqual(new THREE.Box3().setFromObject(body),before);assert.ok(mag.position.y<-.24);
  assert.equal(mp38ReloadPose(1.15).scale,0);assert.deepEqual(mp38ReloadPose(2.7).position,[0,-.025,-.15]);
 }
});

test('MP38 retargeting uses the real M01 IK rig and holds its grip/magazine through every reload phase',async()=>{
 const c=await viewModelFixture(),rig=c.sources.get('pl:0').scene;
 try{
  for(const [name,reload]of [['aim',false],['rkm_fire_burst',false],['rkm_reload',true]]){
   const source=c.clips.get(name),original=JSON.stringify(source.toJSON()),clip=retargetSMGClip(source,rig,'mp38-test',{reload});
   const mixer=new THREE.AnimationMixer(rig);
   for(const phase of [0,.2,.4,.6,.8,.98]){
    mixer.stopAllAction();const a=mixer.clipAction(clip);a.clampWhenFinished=true;a.setLoop(THREE.LoopOnce,1).reset().play();mixer.setTime(phase*clip.duration);rig.updateMatrixWorld(true);
    const weapon=rig.getObjectByName('weapon');
    for(const side of ['l','r']){
     const local=side==='l'&&reload?mp38ReloadPose(phase*2.7).left:MP38_GRIP[side];
     const target=weapon.localToWorld(new THREE.Vector3(...local)),actual=rig.getObjectByName(`hand_${side}`).getWorldPosition(new THREE.Vector3());
     assert.ok(target.distanceTo(actual)<.025,`${name} ${phase} ${side}: ${target.distanceTo(actual)} m`);
    }
   }
   mixer.stopAllAction();mixer.uncacheRoot(rig);assert.equal(JSON.stringify(source.toJSON()),original);
  }
 }finally{c.dispose();}
});

test('MP38 moving parts reconstruct paused/reloaded presentation without changing actor ammunition or simulation',async()=>{
 const models=await Promise.all([glb(0),glb(1)]),adapter=Object.create(M02Weapons.prototype);adapter.models=models.map(g=>g.scene);
 const sim=new M02BenchSimulation();sim.enterAreaCC09();const before=sim.snapshot();
 const actor={id:'mp',weapon:'mp38',alive:true,reload:{startedAt:0,durationSec:2.7},mag:0,reserve:64};const actorBefore=structuredClone(actor);
 const instance=()=>({key:'de:0',root:{visible:true},weaponBone:new THREE.Bone(),meshes:[],batches:[]});
 const v=instance(),characters={instances:new Map([['mp',v]])};
 adapter.update(characters,[actor],.8);const first=v.m02MP38.getObjectByName('mp38_magazine').position.toArray();
 adapter.update(characters,[actor],.8);assert.deepEqual(v.m02MP38.getObjectByName('mp38_magazine').position.toArray(),first);
 const restored=instance();characters.instances.set('mp',restored);adapter.update(characters,[actor],.8);
 assert.deepEqual(restored.m02MP38.getObjectByName('mp38_magazine').position.toArray(),first);
 assert.deepEqual(actor,actorBefore);assert.deepEqual(sim.snapshot(),before);
});

test('B02 MG34 is outside its mount collision and retains a clear shot through its authored aperture',()=>{
 const sim=new M02BenchSimulation(),gun=sim.enemies.find(a=>a.id==='DE-A05'),mount=sim.world.obstacles.find(o=>o.id==='prop_b02_mg_mount');
 assert.ok(gun.x-.32>mount.max.x,'the gunner must stand behind the support, not inside it');
 const loader=sim.enemies.find(a=>a.id==='DE-A06');assert.ok(Math.hypot(gun.x-loader.x,gun.z-loader.z)>.8);
 assert.ok(sim.evaluateMgLineOfFire({x:3,y:0,z:-30,eyeHeight:1.65,space:'metres'}).hasVisualLoS);
});
