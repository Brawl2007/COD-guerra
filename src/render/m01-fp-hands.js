import * as THREE from 'three';
import {refreshBone,setWorldQuaternion,worldPosition,worldQuaternion} from './m01-foot-ik.js';

// First-person hands and arms (R6-a). PRESENTATION ONLY: it reads the sampled clip pose and the weapon bone, and writes bone transforms of the
// private view-model clone. Nothing here reads or writes the simulation, a shared skeleton or a clip.
//
// The soldier clips were authored for a third-person body whose shoulders sit beside the head. In the view the camera is the head and the
// shoulders are not drawn, so the arms are re-solved from the hands outwards:
//   1. the hand keeps its authored weapon-relative pose (plus the per-weapon hold below), so every authored contact (bolt knob, clip, forend)
//      survives;
//   2. the elbow is placed on the circle of valid elbows of a shoulder anchor that lives in the VIEW frame (camera space), as close as possible
//      to the authored forearm. The wrist angle therefore stays the authored one (no folded hand on a straight sleeve) and, because the anchor
//      does not follow the rifle, the elbows flex as the rifle moves between hip, shoulder and reload instead of the whole arm turning rigidly;
//   3. when the hand is out of reach the sleeve start slides along the shoulder-hand line, as before.

/** Finger bone names per hand. */
const FINGERS=['thumb','index','middle','ring','pinky'];
const SIDES=['r','l'];
const clamp=THREE.MathUtils.clamp;

/**
 * Per-weapon hand profile. Weapon-bone frame for `offset` (metres; +X right, +Y up, -Z towards the muzzle), view frame for `shoulders`
 * (eye at the origin, -Z forward). `curl` is the absolute flex (radians) of the three phalanges about each finger's own authored flex axis;
 * `null` keeps the authored value. `hold` blends the hand from the authored clip pose to this hold (1 = fully held).
 */
export const WZ29_HANDS=Object.freeze({
  id:'wz29',
  shoulders:Object.freeze({r:Object.freeze([.24,-.36,-.10]),l:Object.freeze([-.24,-.36,-.10])}),
  // The sleeve start (cut end of the upper arm) must stay this far in front of the eye so it never meets the near plane or the lens.
  sleeveStartZ:-.12,
  hold:Object.freeze({
    r:Object.freeze({offset:Object.freeze([0,0,0]),curl:Object.freeze({thumb:null,index:null,middle:null,ring:null,pinky:null})}),
    l:Object.freeze({offset:Object.freeze([0,0,0]),curl:Object.freeze({thumb:null,index:null,middle:null,ring:null,pinky:null})}),
  }),
});

// Module scratch: nothing below allocates per frame.
const _sA=new THREE.Vector3(),_eA=new THREE.Vector3(),_wA=new THREE.Vector3(),_W=new THREE.Vector3(),_E=new THREE.Vector3(),_S=new THREE.Vector3();
const _fA=new THREE.Vector3(),_n=new THREE.Vector3(),_c=new THREE.Vector3(),_v=new THREE.Vector3(),_u=new THREE.Vector3(),_anchor=new THREE.Vector3();
const _dirA=new THREE.Vector3(),_dirB=new THREE.Vector3(),_off=new THREE.Vector3();
const _uq=new THREE.Quaternion(),_lq=new THREE.Quaternion(),_hq=new THREE.Quaternion(),_q=new THREE.Quaternion(),_wq=new THREE.Quaternion(),_rel=new THREE.Quaternion();

export class ViewHands {
  /** root: the cloned first-person rig. Bones are cached once; `calibrate()` must run with the rig in an authored grip pose. */
  constructor(root,profile=WZ29_HANDS){
    this.root=root;this.profile=profile;this.arms={};this.fingers=[];
    for(const side of SIDES){
      this.arms[side]={upper:root.getObjectByName(`upperarm_${side}`),lower:root.getObjectByName(`lowerarm_${side}`),hand:root.getObjectByName(`hand_${side}`)};
      for(const finger of FINGERS){
        const bones=[1,2,3].map(k=>root.getObjectByName(`${finger}_0${k}_${side}`));
        this.fingers.push({side,finger,bones,bind:bones.map(b=>b.quaternion.clone()),axis:bones.map(()=>new THREE.Vector3(1,0,0))});
      }
    }
    this.stats={elbow:{r:0,l:0},slid:{r:false,l:false}};
  }
  /** Learns each phalanx's flex axis from the bone's current (authored) rotation relative to its bind rotation. */
  calibrate(){
    for(const f of this.fingers)f.bones.forEach((bone,i)=>{
      _rel.copy(f.bind[i]).invert().multiply(bone.quaternion);
      if(_rel.w<0){_rel.x*=-1;_rel.y*=-1;_rel.z*=-1;_rel.w*=-1;}
      if(Math.hypot(_rel.x,_rel.y,_rel.z)>1e-3)f.axis[i].set(_rel.x,_rel.y,_rel.z).normalize();
    });
    this.calibrated=true;
  }
  /** Flex (rad) of a phalanx about its calibrated axis, from the bone's current local rotation. */
  flex(f,i){
    _rel.copy(f.bind[i]).invert().multiply(f.bones[i].quaternion);
    const a=f.axis[i];return 2*Math.atan2(_rel.x*a.x+_rel.y*a.y+_rel.z*a.z,_rel.w);
  }
  /**
   * Closes (or opens) the fingers of one hand towards the profile's curl, weighted by `weight`. Only the flex angle changes: the bone
   * keeps its bind rotation and its authored axis, so no phalanx twists or leaves the hand.
   */
  curl(side,weight){
    const target=this.profile.hold[side].curl;
    if(!(weight>0))return;
    for(const f of this.fingers){
      if(f.side!==side)continue;const goal=target[f.finger];if(!goal)continue;
      f.bones.forEach((bone,i)=>{
        const authored=this.flex(f,i),angle=authored+(goal[i]-authored)*weight;
        bone.quaternion.copy(f.bind[i]).multiply(_q.setFromAxisAngle(f.axis[i],angle));
      });
    }
  }
  /**
   * Solves both arms. `weapon` is the weapon bone; `hold` = {r,l} blends the authored hand to the profile hold. The root's matrices must be
   * current (after the rigid weapon placement). Leaves every matrix current.
   */
  place(weapon,hold){
    const root=this.root,profile=this.profile;
    root.updateMatrixWorld(true);weapon.getWorldQuaternion(_wq);
    for(const side of SIDES){
      const {upper,lower,hand}=this.arms[side],h=profile.hold[side],w=hold[side]??0;
      worldPosition(upper,_sA);worldPosition(lower,_eA);worldPosition(hand,_wA);
      worldQuaternion(upper,_uq);worldQuaternion(lower,_lq);worldQuaternion(hand,_hq);
      const a=_sA.distanceTo(_eA),b=_eA.distanceTo(_wA);
      // 1. wrist target: authored position plus the hold offset (weapon frame -> view frame).
      _W.copy(_wA);if(w>0&&(h.offset[0]||h.offset[1]||h.offset[2]))_W.add(_off.fromArray(h.offset).multiplyScalar(w).applyQuaternion(_wq));
      // 2. shoulder anchor: a point of the view frame, slid along the anchor-wrist line when the wrist is out of reach.
      _S.fromArray(profile.shoulders[side]);
      let d=_S.distanceTo(_W);const reach=a+b-.001;let slid=false;
      if(d>reach){_n.subVectors(_W,_S).normalize();_S.copy(_W).addScaledVector(_n,-reach);d=reach;slid=true;}
      // 3. elbow: the point of the shoulder-wrist circle nearest to the authored forearm (wrist angle preserved).
      _fA.subVectors(_wA,_eA).divideScalar(b);_E.copy(_W).addScaledVector(_fA,-b);   // preferred elbow
      _n.subVectors(_W,_S).divideScalar(d);
      const along=(a*a-b*b+d*d)/(2*d),height=Math.sqrt(Math.max(0,a*a-along*along));
      _c.copy(_S).addScaledVector(_n,along);
      _v.subVectors(_E,_c);_v.addScaledVector(_n,-_v.dot(_n));
      if(_v.lengthSq()<1e-8)_v.set(side==='r'?.4:-.4,-1,.15).addScaledVector(_n,-_n.dot(_v.set(side==='r'?.4:-.4,-1,.15)));
      _E.copy(_c).addScaledVector(_v.normalize(),height);
      // 4. write the three bones: upper arm swings (keeping its authored twist), forearm swings, hand keeps its authored orientation.
      upper.position.copy(upper.parent.worldToLocal(_u.copy(_S)));
      _dirA.subVectors(_eA,_sA).divideScalar(a);_dirB.subVectors(_E,_S).divideScalar(a);
      setWorldQuaternion(upper,_q.setFromUnitVectors(_dirA,_dirB).multiply(_uq));
      refreshBone(upper);refreshBone(lower);
      _dirA.subVectors(_wA,_eA).divideScalar(b);_dirB.subVectors(_W,_E).divideScalar(b);
      setWorldQuaternion(lower,_q.setFromUnitVectors(_dirA,_dirB).multiply(_lq));
      refreshBone(lower);refreshBone(hand);
      setWorldQuaternion(hand,_hq);refreshBone(hand);
      this.stats.elbow[side]=Math.acos(clamp((a*a+b*b-d*d)/(2*a*b),-1,1))*180/Math.PI;this.stats.slid[side]=slid;
      void worldPosition;
    }
    root.updateMatrixWorld(true);
  }
}
