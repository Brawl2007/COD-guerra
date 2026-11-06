import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01ViewModel,fpFixture,fakeSim,HandRig} from './helpers/m01-fp-hand-metrics.js';
import {M02GrenadePreparation} from '../src/render/m02-grenade-preparation.js';
import {M02GrenadeFollowThrough} from '../src/render/m02-grenade-follow-through.js';
import {M02Grenades} from '../src/render/m02-grenades.js';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {eyePosition} from '../src/world/spatial.js';

test('the prepared grenade uses the real M01 hand rig, preserves finger contact and resumes its sampled pose',async()=>{
 const characters=await fpFixture(),view=new M01ViewModel(new THREE.Scene(),characters,new THREE.Texture()),sim=fakeSim();
 const material=new THREE.MeshStandardMaterial(),projectiles=new M02Grenades(new THREE.Scene(),material),pose=new M02GrenadePreparation(projectiles.geometry,material);
 const camera=new THREE.PerspectiveCamera(58,16/9,.03,6);camera.updateProjectionMatrix();
 try{
  const action={startedAt:20,releaseAt:20.5};let releaseHand,releaseGrenade,releaseOrientation;
  assert.equal(pose.apply(view,{startedAt:null,releaseAt:null,waitingForReload:true},20),null);
  for(const age of [.3,.4,.4999]){
   pose.restore();sim.clock=20+age;view.update(sim,'high',0);
   const upper=view.root.getObjectByName('upperarm_r'),lower=view.root.getObjectByName('lowerarm_r'),hand=view.root.getObjectByName('hand_r');
   const base=[upper,lower,hand].map(b=>b.quaternion.clone()),lengths=[upper.getWorldPosition(new THREE.Vector3()).distanceTo(lower.getWorldPosition(new THREE.Vector3())),lower.getWorldPosition(new THREE.Vector3()).distanceTo(hand.getWorldPosition(new THREE.Vector3()))];
   const result=pose.apply(view,action,sim.clock);assert.equal(result.held,true);assert.equal(pose.mesh.parent,hand);
   const rig=new HandRig(view),vertices=new Float32Array(rig.hands.geometry.getAttribute('position').count*3);
   rig.skinned(rig.hands,vertices,'view');const centre=pose.mesh.getWorldPosition(new THREE.Vector3()),nearest={};let deepest=0;
   const profile=[[0,-.69],[.25,-.69],[.38,-.59],[.43,-.42],[.44,-.24],[.44,.25],[.40,.49],[.30,.59],[.18,.62],[0,.62]];
   for(const [name,ids]of rig.groups)if(name.endsWith('_r'))for(const i of ids){
    const point=new THREE.Vector3(vertices[i*3],vertices[i*3+1],vertices[i*3+2]);
    const d=point.distanceTo(centre),finger=name.split('_')[0],local=pose.mesh.worldToLocal(point);
    for(let j=1;j<profile.length;j++){
     const [r0,y0]=profile[j-1],[r1,y1]=profile[j];
     if(y1>y0&&local.y>=y0&&local.y<=y1){const radius=THREE.MathUtils.lerp(r0,r1,(local.y-y0)/(y1-y0));
      deepest=Math.max(deepest,(radius-Math.hypot(local.x,local.z))*.07);}
    }
    nearest[finger]=Math.min(nearest[finger]??Infinity,d);
   }
   assert.ok(deepest<.01,`hand intersects the grenade by ${(deepest*100).toFixed(1)} cm`);
   for(const finger of ['thumb','index','middle','ring','pinky'])assert.ok(nearest[finger]<.06,`${finger} is not near the grenade`);
   assert.ok(Math.abs(upper.getWorldPosition(new THREE.Vector3()).distanceTo(lower.getWorldPosition(new THREE.Vector3()))-lengths[0])<1e-6);
   assert.ok(Math.abs(lower.getWorldPosition(new THREE.Vector3()).distanceTo(hand.getWorldPosition(new THREE.Vector3()))-lengths[1])<1e-6);
   const screen=centre.clone().project(camera);assert.ok(Math.abs(screen.x)<1&&Math.abs(screen.y)<1);
   const captured=centre.clone();pose.restore();assert.equal(pose.mesh.parent,null);
   for(const [i,bone]of [upper,lower,hand].entries())assert.deepEqual(bone.quaternion.toArray(),base[i].toArray());
   view.update(sim,'high',0);pose.apply(view,action,sim.clock);
   assert.ok(pose.mesh.getWorldPosition(new THREE.Vector3()).distanceTo(captured)<1e-6,'same-clock pause/restore must reproduce the pose');
   if(age>.49){releaseHand=hand.getWorldPosition(new THREE.Vector3());releaseGrenade=pose.mesh.getWorldPosition(new THREE.Vector3());releaseOrientation=pose.mesh.getWorldQuaternion(new THREE.Quaternion());}
  }
  pose.restore();sim.clock=20.5;view.update(sim,'high',0);
  const follow=new M02GrenadeFollowThrough();follow.begin(sim.clock);follow.apply(view.root,sim.clock);
  assert.ok(view.root.getObjectByName('hand_r').getWorldPosition(new THREE.Vector3()).distanceTo(releaseHand)<.01,'the arm must continue from the release pose');
  follow.restore();

  const game=new M02BenchSimulation();game.enterAreaBC06();game.enemies=[];game.allies=[];game.teleportPlayer(0,100,0,0);
  game.tick(.05,{grenade:true});for(let i=0;i<10;i++)game.tick(.05,{});
  const projectile=game.grenades[0],eye=eyePosition(game.player);
  const cameraOffset=new THREE.Vector3(projectile.z-eye.z,projectile.y-eye.y,-(projectile.x-eye.x));
  assert.ok(cameraOffset.distanceTo(releaseGrenade)<.01,'the actual release starts at the visible hand position in open space');
  projectiles.update(game);const actual=projectiles.views.get(projectile.id).quaternion.clone();
  const inverseCamera=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,-Math.PI/2,0,'YXZ')).invert();
  assert.ok(inverseCamera.multiply(actual).angleTo(releaseOrientation)<.02,'the projectile keeps its hand orientation at release');
  for(let i=0;i<3;i++)game.tick(.05,{});const flight=game.snapshot();projectiles.update(game);
  const spinning=projectiles.views.get(projectile.id).quaternion.toArray();game.tick(.05,{});projectiles.update(game);
  game.restoreSnapshot(flight);projectiles.update(game);
  assert.deepEqual(projectiles.views.get(projectile.id).quaternion.toArray(),spinning,'restore reproduces the projectile orientation');
 }finally{pose.restore();projectiles.dispose();material.dispose();view.dispose();characters.dispose();}
});
