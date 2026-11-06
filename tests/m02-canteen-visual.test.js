import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01ViewModel,fpFixture,fakeSim} from './helpers/m01-fp-hand-metrics.js';
import {M02GrenadePreparation} from '../src/render/m02-grenade-preparation.js';
import {m02CanteenGeometry} from '../src/render/m02-canteen.js';

test('the provisional canteen uses the M01 hand, stays on screen during the offer and restores its pose',async()=>{
 const characters=await fpFixture(),view=new M01ViewModel(new THREE.Scene(),characters,new THREE.Texture()),sim=fakeSim();
 const material=new THREE.MeshStandardMaterial(),geometry=m02CanteenGeometry(),pose=new M02GrenadePreparation(geometry,material);
 const camera=new THREE.PerspectiveCamera(58,16/9,.03,6);camera.updateProjectionMatrix();
 try{
  for(const age of [.9,1.35]){
   sim.clock=20+age;view.update(sim,'high',0);const upper=view.root.getObjectByName('upperarm_r'),lower=view.root.getObjectByName('lowerarm_r'),hand=view.root.getObjectByName('hand_r');
   const base=[upper,lower,hand].map(b=>b.quaternion.clone()),length=upper.getWorldPosition(new THREE.Vector3()).distanceTo(lower.getWorldPosition(new THREE.Vector3()));
   const action={startedAt:20,releaseAt:21.5};assert.equal(pose.apply(view,action,sim.clock).held,true);assert.equal(pose.mesh.parent,hand);
   const position=pose.mesh.getWorldPosition(new THREE.Vector3()),screen=position.clone().project(camera);
   assert.ok(Math.abs(screen.x)<1&&Math.abs(screen.y)<1,'canteen must be visible during the offer');
   assert.ok(Math.abs(upper.getWorldPosition(new THREE.Vector3()).distanceTo(lower.getWorldPosition(new THREE.Vector3()))-length)<1e-6);
   pose.restore();for(const [i,bone]of [upper,lower,hand].entries())assert.deepEqual(bone.quaternion.toArray(),base[i].toArray());
   view.update(sim,'high',0);pose.apply(view,action,sim.clock);assert.ok(pose.mesh.getWorldPosition(new THREE.Vector3()).distanceTo(position)<1e-6);
   pose.restore();
  }
 }finally{pose.restore();geometry.dispose();material.dispose();view.dispose();characters.dispose();}
});
