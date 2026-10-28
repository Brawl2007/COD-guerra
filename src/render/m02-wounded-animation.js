import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {solveTwoBoneIk,setWorldQuaternion} from './m01-foot-ik.js';
import {protractClavicleTowardTarget} from './m01-hand-pin.js';

// Keep the authored M01 gait/feet and use its existing arm solver to place one
// hand against the torso and the other at the side. Presentation only; the
// actor's simulated posture, route and movement remain authoritative.
export function woundedClip(source,rig,name,stride){
 if(!source||!rig)return null;
 const root=clone(rig),hips=root.getObjectByName('hips'),mixer=new THREE.AnimationMixer(root),action=mixer.clipAction(source);
 const sides=['l','r'],arms=Object.fromEntries(sides.map(side=>[side,['clavicle','upperarm','lowerarm','hand'].map(n=>root.getObjectByName(`${n}_${side}`))]));
 if(!hips||sides.some(side=>arms[side].some(b=>!b)))return null;
 const bones=sides.flatMap(side=>arms[side]),bind=bones.map(b=>b.quaternion.clone()),values=new Map(bones.map(b=>[b.name,[]]));
 const times=Array.from({length:Math.ceil(source.duration*30)+1},(_,i)=>Math.min(i/30,source.duration));
 const target=new THREE.Vector3(),rotation=new THREE.Quaternion();
 for(const time of times){
  mixer.stopAllAction();bones.forEach((b,i)=>b.quaternion.copy(bind[i]));action.reset().setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(time);root.updateMatrixWorld(true);
  for(const side of sides){
   const [clavicle,upper,lower,hand]=arms[side];hand.getWorldQuaternion(rotation);
   hips.localToWorld(target.fromArray(side==='l'?[0,.16,-.18]:[.24,.02,0]));
   protractClavicleTowardTarget(clavicle,upper,lower,hand,target);solveTwoBoneIk(upper,lower,hand,target);
   setWorldQuaternion(hand,rotation);root.updateMatrixWorld(true);
   for(const bone of arms[side])values.get(bone.name).push(...bone.quaternion.toArray());
  }
 }
 const replaced=new Set([...values.keys()].map(n=>`${n}.quaternion`));
 const tracks=source.tracks.filter(t=>!replaced.has(t.name)).map(t=>t.clone());
 for(const [bone,v]of values)tracks.push(new THREE.QuaternionKeyframeTrack(`${bone}.quaternion`,times,v));
 mixer.stopAllAction();mixer.uncacheRoot(root);
 const clip=new THREE.AnimationClip(name,source.duration,tracks);clip.userData={...source.userData,m02DerivedFrom:source.name,...(stride?{stride}:null)};return clip;
}
