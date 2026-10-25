import * as THREE from 'three';
import {protractClavicleTowardTarget} from './m01-hand-pin.js';
import {refreshBone,worldPosition,worldQuaternion,setWorldQuaternion,solveTwoBoneIk} from './m01-foot-ik.js';

// M01 opening life, presentation (R1-b, 2026-10-25): the procedural pose of the acts (m01-opening-pose.js `openingPose`) on top of the clip the mixer has sampled and the foot IK has corrected: a forward lean
// of the torso (spine_01 and spine_02 about the soldier's right axis), the head's pitch (the neck), and two-bone arm IK with the pole of the elbow to hand targets given along the soldier's own axes.
// Presentation only: it writes bone transforms of the rig and nothing else; the caller captures the clip pose first (captureIkPose) so that the next frame's restoreIkPose undoes all of this, exactly as it
// undoes the foot IK. Scratch objects at module scope: nothing is allocated per man per frame.
const _R=new THREE.Vector3(),_U=new THREE.Vector3(),_F=new THREE.Vector3();
const _a=new THREE.Vector3(),_t=new THREE.Vector3(),_p=new THREE.Vector3(),_s=new THREE.Vector3();
const _q=new THREE.Quaternion(),_r=new THREE.Quaternion(),_X=new THREE.Vector3(1,0,0),_Y=new THREE.Vector3(0,1,0),_Z=new THREE.Vector3(0,0,-1);

/** Rotates a bone about a world axis by `angle` (radians), keeping its parent chain. */
function turn(bone,axis,angle){
  if(!bone||!angle)return;
  worldQuaternion(bone,_q);_r.setFromAxisAngle(axis,angle);
  setWorldQuaternion(bone,_r.multiply(_q));refreshBone(bone);
}
function anchorOf(rig,root,name,out){
  if(name==='root')return out.setFromMatrixPosition(root.matrixWorld);
  const bone=name==='head'?rig.head:name==='chest'?rig.spine_03:name==='hips'?rig.hips:name==='shoulder_r'?rig.upperarm_r:rig.upperarm_r;
  return bone?worldPosition(bone,out):out.setFromMatrixPosition(root.matrixWorld);
}
function reach(rig,root,side,spec){
  if(!spec||!(spec.w>.001))return;
  const upper=side==='l'?rig.upperarm_l:rig.upperarm_r,lower=side==='l'?rig.lowerarm_l:rig.lowerarm_r,hand=side==='l'?rig.hand_l:rig.hand_r,clavicle=side==='l'?rig.clavicle_l:rig.clavicle_r;
  if(!upper||!lower||!hand||!clavicle)return;
  worldPosition(upper,_s);
  if(spec.dir){_t.set(spec.dir[0],spec.dir[1],spec.dir[2]).normalize().multiplyScalar(spec.len).add(_s);}
  else{anchorOf(rig,root,spec.a,_a);_t.copy(_a).addScaledVector(_R,spec.o[0]).addScaledVector(_U,spec.o[1]).addScaledVector(_F,spec.o[2]);}
  _p.copy(_s).addScaledVector(_R,spec.p[0]).addScaledVector(_U,spec.p[1]).addScaledVector(_F,spec.p[2]);
  protractClavicleTowardTarget(clavicle,upper,lower,hand,_t);
  solveTwoBoneIk(upper,lower,hand,_t,_p,Math.min(1,spec.w));
}
/**
 * Applies the pose to one instance: `v.root` and `v.ikRig` (bindCharacterIkRig), `spec` the record of openingPose. The root's world matrices must be current; they are again when this returns.
 * Returns true when something was written.
 */
export function applyOpeningPose(v,spec){
  const rig=v.ikRig,root=v.root;
  if(!rig||!rig.hasArmIk||!spec||!(spec.lean||spec.head||spec.l||spec.r))return false;
  root.updateMatrixWorld(true);
  _R.copy(_X).transformDirection(root.matrixWorld);_U.copy(_Y).transformDirection(root.matrixWorld);_F.copy(_Z).transformDirection(root.matrixWorld);
  // the soldier's forward is -z: a positive lean bends the torso forward (a turn of -lean about the right axis), a positive head pitch looks up (a turn of +pitch)
  if(spec.lean){turn(rig.spine_01,_R,-spec.lean*.5);root.updateMatrixWorld(true);turn(rig.spine_02,_R,-spec.lean*.5);root.updateMatrixWorld(true);}   // (a child's world matrix is refreshed before it turns: it follows its parent's new lean)
  if(spec.head){turn(rig.neck,_R,spec.head);root.updateMatrixWorld(true);}
  reach(rig,root,'l',spec.l);reach(rig,root,'r',spec.r);
  root.updateMatrixWorld(true);
  return true;
}
