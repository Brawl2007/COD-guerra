import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {M01ViewModel} from '../src/render/m01-viewmodel.js';
import {Wz29} from '../src/game/wz29.js';
import {loadCharacterGLB,viewModelFixture,geometryReport} from './helpers/m01-viewmodel-fixture.js';
const base='fp-arms-v2/m01_fp_arms_v2.glb';
async function fixture(){
 const c=await viewModelFixture();
 for(const [key,file]of [['fp:0',base],['fp:patient','fp-arms-v2/m01_fp_patient_v2.glb'],['pl:1','m01_soldier_pl_lod1.glb'],['pl:2','m01_soldier_pl_lod2.glb']])c.sources.set(key,await loadCharacterGLB(file));
 for(const clip of (await loadCharacterGLB('crews-evacuation/m01_crews_evacuation.glb')).animations)c.clips.set(clip.name,clip);
 return c;
}
// Third-person soldier kit and clip files accepted before T40 (pinned at fork point d151a97) stay byte-identical; FP files are additions only.
const protectedCharacterFiles={
 "clip-library-v2/m01_soldier_clip_library_v2.glb":"1b84d8670e59a5048f4eead58ed6106f4bbf3b2990631fd068b4e11eb61d6881",
 "clip-library-v2/manifest.json":"36ffe872ba9c798a17015836e919abfbcec514811e36ff29a41b76bdf1321769",
 "crews-evacuation/m01_crews_evacuation.glb":"d084885f740f3136f458bc1751dfd336a4c7f81fd719608dd678266da83e42cc",
 "crews-evacuation/manifest.json":"c16aab35da5a05f72a0713d493b9d162c01076f19141d9220b6cdea27a6e9fc2",
 "m01_soldier_animations.glb":"481d6114f4481ae0f99e162a4bbfdbe8e1d74cffc2460836a2b525bf93b0202d",
 "m01_soldier_de_lod0.glb":"15082783b5a18ed93934e6eb47b9b07632d91e13478d9d7a450a7af2a9eb5b54",
 "m01_soldier_de_lod1.glb":"5c7294586cd75d0cd96eb757452854a5d8d19a93349fdf9d00d80d52d640a29f",
 "m01_soldier_de_lod2.glb":"6e04d5a34ee64ad8f142ada447e565314b45f4da8b2f123fa3ffeff6fd6c66d4",
 "m01_soldier_pl_lod0.glb":"9c98adb2eace9e4ac0558146b7cdc85a37374809a090208c0b51f42b4c87ae4d",
 "m01_soldier_pl_lod1.glb":"d4e7565b92c6e266487a43af3c5a739b9f0a98328656662940ed0fe9fa361d8f",
 "m01_soldier_pl_lod2.glb":"d1a59032549e07973684942aeac993d72c7427811db5061bba57c0bcf3fa15de",
 "m01_station_animations.glb":"504d4d84859149e3557da345e9572279a360d471e6c55c8550625ea5415ca9e5",
 "manifest.json":"2f8e29ccf8894d40b7746abb4540105323650f4dbd9feab3d41908099c96eda6",
 "motion-clips-v1/m01_soldier_motion_clips.glb":"dbcb3e56015c1902d691c9fdb1783997e86c0a69e7c2abc29135ea773611031c",
 "motion-clips-v1/manifest.json":"1269ec5fdb115f69af111beb23c32427954250b8be36d3eb4e69535808e6a78c",
 "station-animations.manifest.json":"05e132bfa87f1626359fe3577e5cbc6eb4da67bc0756ac65ff8dab76af360a87",
 "station-drag-transitions/m01_station_drag_transitions.glb":"5b59af9c0410f7747bed478a3c009ae54e916d7c38053530769f38a1d2c9eb6c",
 "station-drag-transitions/manifest.json":"9dbbed8028b9828de0b6e487622c385774be863e5ac7157f74ccf57721a57017"
};
test('T40 original third-person soldier files and clips remain byte-identical',()=>{
 for(const [file,expected]of Object.entries(protectedCharacterFiles)){const path='assets/models/provisional/m01/characters/'+file;
  assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),expected,path);}
});
test('T40 dedicated GLB closes all welded source cuts and retains articulated finger weights',async()=>{
 const c=await fixture(),root=c.sources.get('fp:0').scene,body=root.getObjectByName('body'),caps=root.getObjectByName('fp_sleeve_caps');
 try{
  const edges=new Map();
  for(const mesh of [body,caps,root.getObjectByName('fp_hands')]){const pos=mesh.geometry.getAttribute('position'),idx=mesh.geometry.index.array;
   const key=i=>[pos.getX(i),pos.getY(i),pos.getZ(i)].map(v=>Math.round(v*1e6)).join(',');
   for(let t=0;t<idx.length;t+=3)for(let k=0;k<3;k++){const keys=[key(idx[t+k]),key(idx[t+(k+1)%3])].sort();const e=keys.join('/');edges.set(e,(edges.get(e)??0)+1);}}
  assert.equal([...edges.values()].filter(n=>n===1).length,0,'no open geometric sleeve/skin boundary');
  const hands=root.getObjectByName('fp_hands'),j=hands.geometry.getAttribute('skinIndex'),weights=hands.geometry.getAttribute('skinWeight'),used=new Set();for(const i of new Set(hands.geometry.index.array))[j.getX(i),j.getY(i),j.getZ(i),j.getW(i)].forEach((v,k)=>{if([weights.getX(i),weights.getY(i),weights.getZ(i),weights.getW(i)][k]>0)used.add(hands.skeleton.bones[v].name);});
  for(const side of ['l','r'])for(const finger of ['thumb','index','middle','ring','pinky'])for(const segment of [1,2,3])assert.ok(used.has(`${finger}_0${segment}_${side}`),`${side} ${finger} segment ${segment} actually weighted`);
  assert.equal(hands.material.name,'FP skin');
  for(const name of ['fp_cuffs','fp_straps'])assert.ok(root.getObjectByName(name));
 }finally{c.dispose();}
});
test('T40 actual full FP mesh budget and near clearance through real ADS/reload/carry clips',async()=>{
 const c=await fixture(),v=new M01ViewModel(new THREE.Scene(),c,new THREE.Texture()),s={clock:10,world:{},player:{id:'player',aiming:false,moveBlend:0,sprinting:false},weapon:new Wz29(),renderState:{weaponVisible:true},actors:[]};
 try{
  for(const aiming of [false,true])for(const state of ['READY','BOLT_CYCLE','RELOAD_CLIP','RELOAD_SINGLE'])for(let i=0;i<=34;i++){
   s.clock=20+i*.05;s.player.aiming=aiming;s.weapon.state=state;s.weapon.started=s.clock*1000-i/34*(state==='BOLT_CYCLE'?1050:3400);s.weapon.until=s.weapon.started+(state==='BOLT_CYCLE'?1050:3400);v.visual=null;v.update(s,'high',0);
   assert.equal(v.stats.fpVariant,'fp-arms-v2');assert.ok(v.stats.drawnTriangles<=6000,JSON.stringify(v.stats.drawnMeshes));
   for(const [name,g]of Object.entries(geometryReport(v)))assert.equal(g.nearViolations,0,`${state}/${aiming}/${i}/${name}: ${g.maxZ}`);
  }
  s.player.carrying='jozef_bak';s.actors=[{id:'jozef_bak',carriedBy:'player',carry:{phase:'pickup',startedAt:30}}];
  for(const phase of ['pickup','carry','putdown'])for(let i=0;i<=32;i++){
   s.clock=30+i*.05;s.actors[0].carry.phase=phase;v.update(s,'high',0);assert.ok(v.stats.drawnTriangles<=6000,`${phase} ${v.stats.drawnTriangles}`);
   assert.equal(v.stats.clip,phase==='carry'?'carry_walk':`carry_${phase}_carrier`);
   const joints=v.stats.carryFrame.patientJoints;assert.ok(joints.head[0]<joints.hips[0]);for(const side of ['l','r']){assert.ok(joints[`foot_${side}`][0]>joints.hips[0]);assert.ok(joints[`foot_${side}`][1]<joints.hips[1]);}
   if(phase==='carry'){const camera=new THREE.PerspectiveCamera(58,1280/720,.03,6),hands=v.root.getObjectByName('fp_hands'),position=hands.geometry.getAttribute('position'),point=new THREE.Vector3();for(const vertex of new Set(hands.geometry.index.array)){point.fromBufferAttribute(position,vertex);hands.applyBoneTransform(vertex,point).applyMatrix4(hands.matrixWorld).project(camera);assert.ok(Math.abs(point.x)<1&&Math.abs(point.y)<1,'whole articulated hand stays within carry frame');}}
   for(const [name,g]of Object.entries(geometryReport(v)))assert.equal(g.nearViolations,0,`${phase}/${i}/${name}: ${g.maxZ}`);
  }
  const frozen=structuredClone(v.stats);v.update(s,'high',0);assert.deepEqual(v.stats,frozen);
  const restored=new M01ViewModel(new THREE.Scene(),c,new THREE.Texture());try{restored.update(s,'high',0);assert.deepEqual(restored.stats.carryFrame,v.stats.carryFrame);assert.equal(restored.stats.clipTime,v.stats.clipTime);}finally{restored.dispose();}
 }finally{v.dispose();c.dispose();}
});

test('T40 completed carry restores the same carrier bones and rifle as a fresh view in every weapon pose',async()=>{
 const c=await fixture(),v=new M01ViewModel(new THREE.Scene(),c,new THREE.Texture());
 const s={clock:10,world:{},player:{id:'player',aiming:false,moveBlend:0,sprinting:false},weapon:new Wz29(),renderState:{weaponVisible:true},actors:[]};
 const bones=root=>{const result={};root.traverse(n=>{if(n.isBone)result[n.name]=n.matrixWorld.toArray();});return result;};
 try{
  v.update(s,'high',0);const carrierWeapon=v.root.getObjectByName('weapon');
  for(let cycle=0;cycle<2;cycle++){
   s.player.carrying='jozef_bak';s.actors=[{id:'jozef_bak',carriedBy:'player',carry:{phase:'pickup',startedAt:s.clock}}];
   for(const phase of ['pickup','carry','putdown']){
    s.actors[0].carry={phase,startedAt:s.clock};
    for(let i=0;i<=32;i++){s.clock+=.05;v.update(s,'high',0);}
    assert.equal(v.root.getObjectByName('weapon'),carrierWeapon,'carrier lookups never enter the patient rig');
   }
   s.player.carrying=null;s.actors=[];
   for(const [aiming,moveBlend,sprinting]of [[false,0,false],[false,1,false],[false,1,true],[true,0,false]]){
    Object.assign(s.player,{aiming,moveBlend,sprinting});
    for(const state of ['READY','BOLT_CYCLE','RELOAD_CLIP','RELOAD_SINGLE']){
     s.clock+=1;s.weapon.state=state;s.weapon.started=s.clock*1000-700;s.weapon.until=s.weapon.started+(state==='BOLT_CYCLE'?1050:3400);
     // Isolate reconstruction from the documented transient ADS/run interpolation.
     v.visual=null;v.update(s,'high',0);
     const restored=new M01ViewModel(new THREE.Scene(),c,new THREE.Texture());
     try{
      restored.update(s,'high',0);assert.deepEqual(bones(v.root),bones(restored.root),`${cycle}/${state}/${aiming}/${sprinting}`);
      assert.deepEqual(v.stats.visualSights,restored.stats.visualSights);
      assert.equal(v.wounded.root.visible,false);
      const frozen=bones(v.root);v.update(s,'high',0);assert.deepEqual(bones(v.root),frozen,'pause');
     }finally{restored.dispose();}
    }
   }
  }
  const patient=v.wounded.root;v.dispose();assert.equal(patient.parent,null,'independent patient is released');
 }finally{if(v.root)v.dispose();c.dispose();}
});

test('sapper crate uses the same articulated rig with hand contact through movement and restores the rifle',async()=>{
 const c=await fixture(),v=new M01ViewModel(new THREE.Scene(),c,new THREE.Texture());
 const s={clock:10,world:{},player:{id:'player',aiming:false,moveBlend:0,sprinting:false,carrying:'sapper_crate'},weapon:new Wz29(),renderState:{weaponVisible:false},actors:[]};
 try{
  for(const move of [0,1])for(const sprint of [false,true])for(let i=0;i<20;i++){
   s.clock+=.05;s.player.moveBlend=move;s.player.sprinting=sprint;v.update(s,'high',0);
   assert.equal(v.stats.cargo,'sapper_crate');assert.equal(v.root.visible,true);assert.equal(v.root.getObjectByName('rifle').visible,false);assert.equal(v.wounded,null);
   const bob=move*Math.sin(s.clock*(sprint?14:9))*.014*1.5;
   for(const [index,hand]of v.stats.carryFrame.hands.entries())for(const [axis,want]of [index===0?-.245:.245,-.28+bob,-.57].entries())assert.ok(Math.abs(hand[axis]-want)<1e-6);
   for(const [name,g]of Object.entries(geometryReport(v)))assert.equal(g.nearViolations,0,name);
  }
  s.player.carrying=null;s.renderState.weaponVisible=true;s.player.moveBlend=0;s.player.sprinting=false;s.clock+=.05;v.update(s,'high',0);
  assert.equal(v.stats.cargo,null);assert.equal(v.root.getObjectByName('rifle').visible,true);
  const restored=new M01ViewModel(new THREE.Scene(),c,new THREE.Texture());try{restored.update(s,'high',0);assert.deepEqual(v.stats.visualSights,restored.stats.visualSights);}finally{restored.dispose();}
 }finally{v.dispose();c.dispose();}
});
