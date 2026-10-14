import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01Characters} from '../src/render/m01-characters.js';
import {actorPose} from '../src/render/m01-actor-pose.js';
import {
  resolveDirectionalImpact,
  resolveRiflemanReload,
  resolveSupportHandIK,
  resolveTorsoOrientation
} from '../src/render/m01-animation-resolver.js';

const actor=(extra={})=>({
  id:'pl_test_v2',active:true,alive:true,team:'ally',role:'RIFLEMAN',
  state:'GUARD',weapon:'wz29',facing:0,bodyYaw:-.45,shot:0,
  x:0,y:0,z:0,crouched:false,posture:'stand',cooldown:0,rounds:5,
  ...extra
});

test('V2 directional impacts: frontal pitch, side roll, no invented hit data',()=>{
  const front=actor({hitAt:5,hitYaw:0});
  const side=actor({hitAt:5,hitYaw:Math.PI/2});
  const early=resolveDirectionalImpact(front,4.99);
  assert.equal(early.active,false);
  const f=resolveDirectionalImpact(front,5.25);
  const s=resolveDirectionalImpact(side,5.25);
  assert.equal(f.active,true);assert.ok(f.pitch>.1);
  assert.ok(Math.abs(f.roll)<1e-10);
  assert.ok(Math.abs(s.roll)>.08);
  assert.ok(Math.abs(s.pitch)<1e-10);
  assert.equal(resolveDirectionalImpact(actor(),5.25).active,false);
  assert.equal(resolveDirectionalImpact(front,15).active,false);
});

test('V2 actorPose: directional roll metadata only with supplied hit vector',()=>{
  const a=actor({hitAt:5,hitYaw:Math.PI/2});
  const saved=structuredClone(a);
  const pose=actorPose(a,5.25);
  assert.ok(Math.abs(pose.torso.hitRoll)>.08);
  assert.ok(pose.ik.active);
  assert.deepEqual(a,saved);
  const baseline=actorPose(actor(),5.25);
  assert.equal(baseline.torso.hitRoll,0);
});

test('V2 support-arm compensation is bounded, excludes MG34, casualties and reloads',()=>{
  const a=actor(),p=actorPose(a,8);
  const rot=resolveTorsoOrientation(a,p);
  const ik=resolveSupportHandIK(a,p,rot);
  assert.ok(ik.active);
  assert.ok(ik.shoulderYaw>0&&ik.shoulderYaw<=.12);
  assert.equal(resolveSupportHandIK(a,p,rot,{clip:'reload_clip'}).active,false);
  assert.equal(resolveSupportHandIK(actor({weapon:'mg34'}),p,rot).active,false);
  assert.equal(resolveSupportHandIK(actor({alive:false}),p,rot).active,false);
  assert.equal(resolveSupportHandIK(actor({group:'grp_ckm_crew'}),p,rot).active,false);
});

test('V2 rifle reload: only explicit simulation signal, no fake reload from rounds=5',()=>{
  const a=actor({firedAt:10,cooldown:2.5,rounds:5});
  const p=actorPose(a,12);
  assert.equal(resolveRiflemanReload(a,12,p,new Map([['reload_clip',{duration:3.4}]])),null);
  a.state='RELOAD_CLIP';a.reloadProgress=()=>.5;
  const result=resolveRiflemanReload(a,12,p,new Map([['reload_clip',{duration:3.4}]]));
  assert.equal(result.clip,'reload_clip');
  assert.ok(Math.abs(result.time-1.7)<1e-10);
  assert.equal(result.loop,false);
  assert.equal(resolveRiflemanReload(actor({role:'MEDIC',state:'RELOAD_CLIP'}),12,p),null);
});

test('V2 M01Characters samples an explicit rifle reload without changing gameplay',()=>{
  const c=new M01Characters(new THREE.Scene());
  const a=actor({state:'RELOAD_CLIP',reloading:true,firedAt:-100});
  const baseline=structuredClone(a);
  c.clips.set('standing_idle',{duration:4});c.clips.set('reload_clip',{duration:3.4});
  try{
    const v=c.sample(a,12,[a],actorPose(a,12));
    assert.equal(v.clip,'reload_clip');assert.equal(v.loop,false);
    assert.deepEqual(a,baseline);
  }finally{c.dispose();}
});
