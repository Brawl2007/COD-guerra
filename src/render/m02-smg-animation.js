import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {solveTwoBoneIk,setWorldQuaternion} from './m01-foot-ik.js';
import {protractClavicleTowardTarget} from './m01-hand-pin.js';

const smooth=(a,b,t)=>THREE.MathUtils.smoothstep(t,a,b),mix=(a,b,t)=>a.map((n,i)=>n+(b[i]-n)*t);
export const MP38_GRIP=Object.freeze({r:[.034,-.045,.075],l:[-.03,-.045,-.18]});
const SEATED=[0,-.025,-.15],POUCH=[-.12,-.255,.06],LOW=[0,-.255,-.15];

// Presentation timeline, in seconds of the authoritative 2.7 s reload. One
// magazine node represents the old and new box, with a hidden exchange at the
// pouch. It never refills the weapon or advances simulation time.
export function mp38ReloadPose(time){
 const t=THREE.MathUtils.clamp(time,0,2.7);
 let position=SEATED,scale=1,phase='reach';
 if(t>=.5&&t<.85){position=mix(SEATED,LOW,smooth(.5,.85,t));phase='extract';}
 else if(t>=.85&&t<1.1){position=mix(LOW,POUCH,smooth(.85,1.1,t));phase='stow';}
 else if(t>=1.1&&t<1.2){position=POUCH;scale=0;phase='exchange';}
 else if(t>=1.2&&t<1.65){position=mix(POUCH,LOW,smooth(1.2,1.65,t));phase='new-magazine';}
 else if(t>=1.65&&t<1.95){position=mix(LOW,SEATED,smooth(1.65,1.95,t));phase='insert';}
 else if(t>=1.95)phase=t<2.5?'charge':'ready';
 const onMag=[position[0]-.035,position[1]-.025,position[2]+.025],charge=[-.04,.033,-.02];
 const handleZ=.08*(smooth(2.13,2.27,t)-smooth(2.28,2.4,t));charge[2]+=handleZ;
 let left=onMag;
 if(t<.5)left=mix(MP38_GRIP.l,onMag,smooth(.15,.48,t));
 else if(t>=1.95&&t<2.13)left=mix(onMag,charge,smooth(1.95,2.13,t));
 else if(t>=2.13&&t<2.4)left=charge;
 else if(t>=2.4)left=mix(charge,MP38_GRIP.l,smooth(2.4,2.65,t));
 return {position:[...position],scale,handleZ,left,phase};
}

// Bake only the six arm/wrist rotations on a clone of the real M01 rig.
// Body, feet, weapon motion and fingers come from authored M01 clips. The
// existing M01 IK solver keeps bone lengths; source clips/meshes stay untouched.
export function retargetSMGClip(source,rig,name,{reload=false}={}){
 if(!source||!rig)return null;
 const root=clone(rig),mixer=new THREE.AnimationMixer(root),action=mixer.clipAction(source);
 const weapon=root.getObjectByName('weapon'),tracks=[],arms={};
 const times=Array.from({length:Math.ceil(source.duration*30)+1},(_,i)=>Math.min(i/30,source.duration));
 const target=new THREE.Vector3(),rotation=new THREE.Quaternion();
 for(const side of ['l','r'])arms[side]=['upperarm','lowerarm','hand'].map(n=>root.getObjectByName(`${n}_${side}`));
 const clavicles=['l','r'].map(s=>root.getObjectByName(`clavicle_${s}`)),bind=clavicles.map(b=>b.quaternion.clone());
 const values=new Map([...Object.values(arms).flat(),...clavicles].map(b=>[b.name,[]]));
 for(const time of times){
  mixer.stopAllAction();clavicles.forEach((b,i)=>b.quaternion.copy(bind[i]));action.reset().setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(time);root.updateMatrixWorld(true);
  for(const side of ['l','r']){
   const [upper,lower,hand]=arms[side];hand.getWorldQuaternion(rotation);
   const local=side==='l'&&reload?mp38ReloadPose(time/source.duration*2.7).left:MP38_GRIP[side];
   weapon.localToWorld(target.fromArray(local));
   protractClavicleTowardTarget(root.getObjectByName(`clavicle_${side}`),upper,lower,hand,target);
   solveTwoBoneIk(upper,lower,hand,target);setWorldQuaternion(hand,rotation);root.updateMatrixWorld(true);
   for(const bone of [...arms[side],root.getObjectByName(`clavicle_${side}`)])values.get(bone.name).push(...bone.quaternion.toArray());
  }
 }
 const replaced=new Set([...values.keys()].map(n=>`${n}.quaternion`));
 for(const track of source.tracks)if(!replaced.has(track.name))tracks.push(track.clone());
 for(const [bone,v]of values)tracks.push(new THREE.QuaternionKeyframeTrack(`${bone}.quaternion`,times,v));
 mixer.stopAllAction();mixer.uncacheRoot(root);
 const clip=new THREE.AnimationClip(name,source.duration,tracks);clip.userData={...source.userData,m02DerivedFrom:source.name,weapon:'mp38',m02Grip:MP38_GRIP};return clip;
}
