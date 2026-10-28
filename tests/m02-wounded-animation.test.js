import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {viewModelFixture,loadCharacterGLB} from './helpers/m01-viewmodel-fixture.js';
import {woundedClip} from '../src/render/m02-wounded-animation.js';
import {m02CharacterSample} from '../src/render/m02-character-adapter.js';
import {m02VisualActor} from '../src/render/m02-presentation.js';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';

test('wounded gait uses the real M01 rig, retains gait tracks and keeps the hand at the torso',async()=>{
 const fixture=await viewModelFixture(),rig=fixture.sources.get('pl:0').scene,source=fixture.clips.get('walk');
 try{
  const before=source.tracks.map(t=>Array.from(t.values)),clip=woundedClip(source,rig,'m02_wounded_walk',1.54);
  for(const name of ['hips.position','thigh_l.quaternion','calf_l.quaternion','foot_l.quaternion']){
   assert.deepEqual(Array.from(clip.tracks.find(t=>t.name===name).values),Array.from(source.tracks.find(t=>t.name===name).values));
  }
  const root=clone(rig),mixer=new THREE.AnimationMixer(root),action=mixer.clipAction(clip);action.play();
  for(const fraction of [.1,.35,.65,.9]){
   mixer.setTime(clip.duration*fraction);root.updateMatrixWorld(true);
   const target=root.getObjectByName('hips').localToWorld(new THREE.Vector3(0,.16,-.18));
   assert.ok(root.getObjectByName('hand_l').getWorldPosition(new THREE.Vector3()).distanceTo(target)<.025);
  }
  assert.deepEqual(source.tracks.map(t=>Array.from(t.values)),before);
  const visual=m02VisualActor({id:'pl_lis',alive:true,state:'WALKING_SUPPORTED',moving:true,weapon:'wz29',motionDistance:3,effectiveSpeed:1.8},'ally',4);
  const sample=m02CharacterSample(visual,4,new Map([[clip.name,clip]]));assert.equal(sample.clip,'m02_wounded_walk');assert.ok(Number.isFinite(sample.stridePhase));
  const sim=new M02BenchSimulation(),snapshot=sim.snapshot();m02VisualActor({...sim.allies[0],state:'WALKING_SUPPORTED'},'ally',sim.clock);assert.deepEqual(sim.snapshot(),snapshot);
 }finally{fixture.dispose();}
});
