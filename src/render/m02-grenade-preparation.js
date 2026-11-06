import * as THREE from 'three';
import {solveTwoBoneIk,setWorldQuaternion} from './m01-foot-ik.js';

// The existing M01 hand rig and projectile geometry remain owned by their
// original renderers. This adapter only poses the private first-person clone.
const DOWN=new THREE.Vector3(.40,-.54,-.24);
const READY=new THREE.Vector3(.27,-.12,-.39);
export const M02_GRENADE_RELEASE_HAND=new THREE.Vector3(.20,-.07,-.52);
const EASE=t=>THREE.MathUtils.smoothstep(THREE.MathUtils.clamp(t,0,1),0,1);
const GRIP=Object.freeze({
 thumb:[1.15,.52,.05],index:[.75,.72,.60],middle:[.80,.72,.58],
 ring:[.86,.77,.61],pinky:[.88,.78,.62],
});

export class M02GrenadePreparation {
 constructor(geometry,material){
  this.mesh=geometry&&material?new THREE.Mesh(geometry,material):null;
  if(this.mesh){this.mesh.name='M02 grenade in hand';this.mesh.scale.setScalar(.07);this.mesh.visible=false;}
  this.saved=[];this.target=new THREE.Vector3();this.base=new THREE.Vector3();this.orientation=new THREE.Quaternion();
 }
 restore(){
  if(this.mesh){this.mesh.visible=false;this.mesh.removeFromParent();}
  for(const {bone,quaternion}of this.saved)bone.quaternion.copy(quaternion);
  this.saved=[];
 }
 reset(){this.restore();}
 apply(view,action,clock){
  const root=view?.root,upper=root?.getObjectByName('upperarm_r'),lower=root?.getObjectByName('lowerarm_r'),hand=root?.getObjectByName('hand_r');
  if(!this.mesh||!action||!Number.isFinite(action.startedAt)||!Number.isFinite(action.releaseAt)||!upper||!lower||!hand||clock<action.startedAt||clock>=action.releaseAt)return null;
  const t=THREE.MathUtils.clamp((clock-action.startedAt)/(action.releaseAt-action.startedAt),0,1);
  for(const bone of [upper,lower,hand])this.saved.push({bone,quaternion:bone.quaternion.clone()});
  root.updateMatrixWorld(true);hand.getWorldPosition(this.base);hand.getWorldQuaternion(this.orientation);
  if(t<.2)this.target.copy(this.base).lerp(DOWN,EASE(t/.2));
  else if(t<.65)this.target.copy(DOWN).lerp(READY,EASE((t-.2)/.45));
  else this.target.copy(READY).lerp(M02_GRENADE_RELEASE_HAND,EASE((t-.65)/.35));
  solveTwoBoneIk(upper,lower,hand,this.target);setWorldQuaternion(hand,this.orientation);
  const hands=view.hands;
  if(hands?.profile&&hands.calibrated){
   for(const finger of hands.fingers)if(finger.side==='r')for(const bone of finger.bones)this.saved.push({bone,quaternion:bone.quaternion.clone()});
   const original=hands.profile;hands.profile={...original,hold:{...original.hold,r:{...original.hold.r,curl:GRIP}}};
   try{hands.curl('r',1);}finally{hands.profile=original;}
  }
  // The long axis lies across the curled fingers; it is the same mesh and
  // scale as the projectile that will leave this hand.
  hand.add(this.mesh);this.mesh.position.set(-.02,-.065,-.07);this.mesh.rotation.set(0,0,Math.PI/2);this.mesh.visible=t>=.2;
  root.updateMatrixWorld(true);
  return {progress:t,held:this.mesh.visible};
 }
}
