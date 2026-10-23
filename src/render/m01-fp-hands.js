import * as THREE from 'three';
import {refreshBone,setWorldQuaternion,worldPosition,worldQuaternion} from './m01-foot-ik.js';

// First-person hands and arms (R6-a). PRESENTATION ONLY: it reads the sampled clip pose and the weapon bone, and writes bone transforms of the
// private view-model clone. Nothing here reads or writes the simulation, a shared skeleton or a clip.
//
// The soldier clips were authored for a third-person body whose shoulders sit beside the head. In the view the camera is the head and the
// shoulders are not drawn, so the arms are re-solved from the hands outwards:
//   1. each hand keeps its authored weapon-relative pose (bolt knob, clip, forend contacts all survive), plus a per-weapon HOLD for the idle
//      grip: a wrist offset and finger flex/spread targets (trigger finger on the trigger, fingers wrapped round the forend instead of through it);
//   2. the elbow is placed on the circle of valid elbows of a shoulder anchor that lives in the VIEW frame (camera space), as close as possible to
//      the authored forearm. The anchor does not follow the rifle, so the elbows flex as the rifle moves between hip, shoulder and reload instead of
//      the whole arm turning rigidly with it;
//   3. the forearm never turns more than `wristLimit` away from its authored direction, so the hand does not fold back onto a re-aimed forearm.
//      When the limit binds the elbow follows the authored one and the sleeve start trails off the frame (never a cut end floating in view);
//   4. when the hand is out of reach the sleeve start slides along the shoulder-hand line.
// Bone lengths are an invariant: bones are only rotated and placed.

/** Finger bone names per hand. */
const FINGERS=['thumb','index','middle','ring','pinky'];
const SIDES=['r','l'];
const clamp=THREE.MathUtils.clamp;

/**
 * Per-weapon hand profile. Weapon-bone frame for `offset` (metres; +X right, +Y up, -Z towards the muzzle), view frame for `shoulders`
 * (eye at the origin, -Z forward). `curl` is the absolute flex (radians) of the three phalanges about each finger's own authored flex axis, `null`
 * keeps the authored value; `spread` (optional, radians) swings a finger sideways in the palm plane. `hold` blends the hand from the authored clip pose to
 * this hold (1 = fully held). The numbers were fitted to the real wz.29 mesh with tests/helpers/m01-fp-hand-metrics.js (see
 * docs/verification/m01-runtime/fp-hands-2026-10-23/README.md) and are checked by tests/m01-fp-hand-grip.test.js.
 */
export const WZ29_HANDS=Object.freeze({
  id:'wz29',
  shoulders:Object.freeze({r:Object.freeze([.24,-.36,-.12]),l:Object.freeze([-.24,-.36,-.12])}),
  // The sleeve start (cut end of the upper arm) must stay this far in front of the eye so it never meets the near plane or the lens.
  sleeveStartZ:-.12,
  // Largest turn (radians) of the forearm away from its authored direction, i.e. of the wrist angle: 35 degrees.
  wristLimit:.61,
  sleeveRadius:.05,
  hold:Object.freeze({
    r:Object.freeze({offset:Object.freeze([.0335,.0159,.0187]),spread:Object.freeze({index:-.206}),
      curl:Object.freeze({thumb:Object.freeze([.325,.52,.52]),index:Object.freeze([0,0,0]),middle:Object.freeze([.756,.68,.529]),ring:Object.freeze([.751,.676,.526]),pinky:Object.freeze([.95,.855,.665])})}),
    l:Object.freeze({offset:Object.freeze([.0113,-.0134,-.0054]),
      curl:Object.freeze({thumb:Object.freeze([.172,.274,.274]),index:Object.freeze([.236,.225,.305]),middle:Object.freeze([.873,.786,.611]),ring:Object.freeze([.826,.743,.578]),pinky:Object.freeze([1.077,.969,.754])})}),
  }),
});

const smooth01=x=>{const t=clamp(x,0,1);return t*t*(3-2*t);};
/**
 * How far a point (view frame) lies beyond the edge of the weapon camera's frame: >= 1 means a sleeve end of radius `radius` centred there
 * is outside the frame. Uses the 58 degree vertical field of view and the widest aspect the game allows (21:9), so it holds on any window.
 */
export function frameMargin(p,radius=.05){
  const depth=Math.max(.03,-p.z);
  return Math.max((Math.abs(p.x)-radius)/(1.3*depth),(Math.abs(p.y)-radius)/(.554*depth));
}

// Module scratch: nothing below allocates per frame.
const _sA=new THREE.Vector3(),_eA=new THREE.Vector3(),_wA=new THREE.Vector3(),_W=new THREE.Vector3(),_E=new THREE.Vector3(),_S=new THREE.Vector3();
const _fA=new THREE.Vector3(),_n=new THREE.Vector3(),_c=new THREE.Vector3(),_v=new THREE.Vector3(),_u=new THREE.Vector3();
const _dirA=new THREE.Vector3(),_dirB=new THREE.Vector3(),_off=new THREE.Vector3(),_id=new THREE.Quaternion(),_rq=new THREE.Quaternion();
const _uq=new THREE.Quaternion(),_lq=new THREE.Quaternion(),_hq=new THREE.Quaternion(),_q=new THREE.Quaternion(),_wq=new THREE.Quaternion(),_rel=new THREE.Quaternion();

export class ViewHands {
  /** root: the cloned first-person rig. Bones are cached once; `calibrate()` must run with the rig in an authored grip pose. */
  constructor(root,profile=WZ29_HANDS){
    this.root=root;this.profile=profile;this.arms={};this.fingers=[];
    for(const side of SIDES){
      const arm={upper:root.getObjectByName(`upperarm_${side}`),lower:root.getObjectByName(`lowerarm_${side}`),hand:root.getObjectByName(`hand_${side}`)};
      this.arms[side]=arm.upper&&arm.lower&&arm.hand?arm:null;   // a rig without arms (optional fallback body) is left alone
      for(const finger of FINGERS){
        const bones=[1,2,3].map(k=>root.getObjectByName(`${finger}_0${k}_${side}`));if(bones.some(b=>!b))continue;
        this.fingers.push({side,finger,bones,bind:bones.map(b=>b.quaternion.clone()),axis:bones.map(()=>new THREE.Vector3(1,0,0)),spread:new THREE.Vector3(0,1,0)});
      }
    }
    this.stats={elbow:{r:0,l:0},slid:{r:false,l:false},deviation:{r:0,l:0}};this.calibrated=false;
  }
  /** Learns each phalanx's flex axis from the bone's current (authored) rotation relative to its bind rotation. */
  calibrate(){
    for(const f of this.fingers)f.bones.forEach((bone,i)=>{
      _rel.copy(f.bind[i]).invert().multiply(bone.quaternion);
      if(_rel.w<0){_rel.x*=-1;_rel.y*=-1;_rel.z*=-1;_rel.w*=-1;}
      if(Math.hypot(_rel.x,_rel.y,_rel.z)>1e-3)f.axis[i].set(_rel.x,_rel.y,_rel.z).normalize();
    });
    // Spread axis of each finger's first phalanx: perpendicular to its flex axis and to its own direction (the palm normal), so a rotation
    // about it swings the finger sideways within the palm plane (a trigger finger leaving the other three).
    for(const f of this.fingers){_v.copy(f.bones[1].position).normalize();f.spread.copy(_v).cross(f.axis[0]).normalize();}
    this.calibrated=true;
  }
  /** Flex (rad) of a phalanx about its calibrated axis, from the bone's current local rotation. */
  flex(f,i){
    _rel.copy(f.bind[i]).invert().multiply(f.bones[i].quaternion);
    const a=f.axis[i];return 2*Math.atan2(_rel.x*a.x+_rel.y*a.y+_rel.z*a.z,_rel.w);
  }
  /**
   * Closes (or opens) the fingers of one hand towards the profile's curl, weighted by `weight`. Only the flex angle changes: the bone
   * keeps its bind rotation and its authored axis, so no phalanx twists or leaves the hand. `spread` (radians, first phalanx only) swings
   * a finger sideways within the palm plane.
   */
  curl(side,weight){
    const hold=this.profile.hold[side],target=hold.curl,spread=hold.spread;
    if(!(weight>0))return;
    for(const f of this.fingers){
      if(f.side!==side)continue;const goal=target[f.finger],swing=spread?.[f.finger]??0;if(!goal&&!swing)continue;
      f.bones.forEach((bone,i)=>{
        const authored=this.flex(f,i),angle=goal?authored+(goal[i]-authored)*weight:authored;
        bone.quaternion.copy(f.bind[i]);
        if(i===0&&swing)bone.quaternion.multiply(_q.setFromAxisAngle(f.spread,swing*weight));
        bone.quaternion.multiply(_q.setFromAxisAngle(f.axis[i],angle));
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
      if(!this.arms[side])continue;
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
      // 3b. wrist limit: never let the forearm turn further than `wristLimit` from the authored forearm. The elbow follows the authored one
      // as far as needed and the sleeve start trails off towards the anchor (its z stays behind the lens limit below).
      _dirA.subVectors(_W,_E).divideScalar(b);const deviation=_dirA.angleTo(_fA);
      if(deviation>profile.wristLimit){
        _q.setFromUnitVectors(_dirA,_fA);_rq.copy(_id.identity()).slerp(_q,1-profile.wristLimit/deviation);_dirA.applyQuaternion(_rq);
        _E.copy(_W).addScaledVector(_dirA,-b);
        // The sleeve start trails off towards the anchor; if that would leave a cut end inside the frame (a raised elbow), it goes outwards
        // along the line from the view axis through the elbow instead, blended by how far the anchor direction is from leaving the frame.
        _u.subVectors(_S,_E).normalize();_S.copy(_E).addScaledVector(_u,a);
        const m=frameMargin(_S,profile.sleeveRadius);
        if(m<1){
          const t=1-smooth01((m-.6)/.4);_v.set(_E.x,_E.y,0);if(_v.lengthSq()<1e-6)_v.set(0,-1,0);
          _v.normalize().multiplyScalar(.8);_v.z=.6;_u.multiplyScalar(1-t).addScaledVector(_v,t).normalize();_S.copy(_E).addScaledVector(_u,a);
        }
      }
      if(_S.z>profile.sleeveStartZ){
        _u.subVectors(_S,_E).divideScalar(a);const nz=clamp((profile.sleeveStartZ-_E.z)/a,-1,1),k=Math.sqrt(Math.max(0,1-nz*nz))/(Math.hypot(_u.x,_u.y)||1);
        _u.set(_u.x*k,_u.y*k,nz);_S.copy(_E).addScaledVector(_u,a);
      }
      this.stats.deviation[side]=deviation*180/Math.PI;
      // 4. write the three bones: upper arm swings (keeping its authored twist), forearm swings, hand keeps its authored orientation.
      upper.position.copy(upper.parent.worldToLocal(_u.copy(_S)));
      _dirA.subVectors(_eA,_sA).divideScalar(a);_dirB.subVectors(_E,_S).divideScalar(a);
      setWorldQuaternion(upper,_q.setFromUnitVectors(_dirA,_dirB).multiply(_uq));
      refreshBone(upper);refreshBone(lower);
      _dirA.subVectors(_wA,_eA).divideScalar(b);_dirB.subVectors(_W,_E).divideScalar(b);
      setWorldQuaternion(lower,_q.setFromUnitVectors(_dirA,_dirB).multiply(_lq));
      refreshBone(lower);refreshBone(hand);
      setWorldQuaternion(hand,_hq);refreshBone(hand);
      _n.subVectors(_S,_E);_v.subVectors(_W,_E);
      this.stats.elbow[side]=_n.angleTo(_v)*180/Math.PI;this.stats.slid[side]=slid;
    }
    root.updateMatrixWorld(true);
  }
}
