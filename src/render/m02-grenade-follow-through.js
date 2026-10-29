import * as THREE from 'three';

const X=new THREE.Vector3(1,0,0);

// The grenade has already left the hand at the simulation event. This is only
// the returning arm, not a wind-up or a second projectile. M01 owns the rig;
// restore its sampled pose before asking it for another frame.
export class M02GrenadeFollowThrough {
  constructor(){this.startedAt=null;this.saved=[];this.rotation=new THREE.Quaternion();}
  begin(clock){if(Number.isFinite(clock))this.startedAt=clock;}
  restore(){for(const {bone,quaternion} of this.saved)bone.quaternion.copy(quaternion);this.saved=[];}
  reset(){this.restore();this.startedAt=null;}
  apply(root,clock,eligible=true){
    const age=clock-this.startedAt;
    if(this.startedAt===null||!eligible||!root||age<0||age>=.45){this.startedAt=null;return 0;}
    const upper=root.getObjectByName('upperarm_r'),lower=root.getObjectByName('lowerarm_r');
    if(!upper||!lower){this.startedAt=null;return 0;}
    const t=THREE.MathUtils.clamp(age/.45,0,1),weight=1-THREE.MathUtils.smoothstep(t,0,1);
    for(const [bone,angle] of [[upper,.6],[lower,-.8]]){
      if(!this.saved.some(s=>s.bone===bone))this.saved.push({bone,quaternion:bone.quaternion.clone()});
      bone.quaternion.multiply(this.rotation.setFromAxisAngle(X,angle*weight));
    }
    root.updateMatrixWorld(true);
    return weight;
  }
}
