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
test('T40 immutable authority and original soldier assets remain exact',()=>{
 const protectedFiles=JSON.parse(readFileSync('docs/verification/m01-runtime/m01-t40-t50-fp-loading-v1/PROTECTED_BASELINE.json')).files;
 for(const [path,expected]of Object.entries(protectedFiles))assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),expected,path);
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
