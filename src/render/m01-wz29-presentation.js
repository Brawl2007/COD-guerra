import * as THREE from 'three';

// Asset landmarks, metres in the weapon bone frame. Rear is the GLB socket;
// front is the existing blade tip (weapon.mjs), not a new gameplay sight/ray.
export const WZ29_VISUAL=Object.freeze({rear:Object.freeze([0,.056,-.29]),front:Object.freeze([0,.065,-.752]),
  muzzle:Object.freeze([0,.032,-.765]),rearDepth:.74,near:.03,adsTolerancePixels:.5,flashToleranceMetres:1e-8});
const clamp=THREE.MathUtils.clamp,smooth=THREE.MathUtils.smoothstep;
export function recoilEnvelope(clock,lastShot){
  if(!Number.isFinite(lastShot))return 0;
  const age=clock-lastShot/1000;
  if(age<=0||age>=.42)return 0;
  // Finite damped impulse: no integration drift, RNG, timers or camera changes.
  return (1-Math.exp(-age/ .012))*Math.exp(-age/.085)*(1-smooth(age,.28,.42));
}
export function reloadEnvelope(sample){return smooth(sample,0,.3)-smooth(sample,2.75,3.4);}
export function advanceVisualBlend(value,target,dt,seconds){
  const next=THREE.MathUtils.lerp(value,target,1-Math.exp(-Math.max(0,dt)/seconds));
  return Math.abs(next-target)<.0001?target:next;
}
export function presentationPose({clock,lastShot,aim,move,run,reload,phase}){
  const kick=recoilEnvelope(clock,lastShot),hip=1-aim,active=1-reload;
  const bob=move*hip*active,breath=Math.sin(clock*1.7)*.0012*hip*active;
  const position=new THREE.Vector3(.145*hip,-.175*hip,-WZ29_VISUAL.rearDepth);
  position.x+=Math.sin(phase)*.003*bob;position.y+=Math.sin(phase*2)*(.004+.004*run)*bob+breath;
  position.y-=.065*run*hip;position.z-=.025*run*hip;
  position.lerp(new THREE.Vector3(.045,-.10,-.92),reload);
  position.y+=kick*(aim?.006:.013);position.z+=kick*(aim?.012:.022);
  const rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(-.06*hip-.13*run*hip-.18*reload+kick*(aim?.009:.024),
    .15*hip+.04*reload,-.055*hip-.13*run*hip-.22*reload));
  return {position,rotation,kick};
}

// Align the PRESENTATION clone's sight line with camera -Z, then apply the pose.
// Keep all source hand/bolt/clip relationships; never edit a shared skeleton or clip.
export function placeWz29(root,weapon,pose){
  root.updateMatrixWorld(true);
  const rear=weapon.localToWorld(new THREE.Vector3(...WZ29_VISUAL.rear));
  const front=weapon.localToWorld(new THREE.Vector3(...WZ29_VISUAL.front));
  const forward=front.sub(rear).normalize(),up=new THREE.Vector3(0,1,0).transformDirection(weapon.matrixWorld);
  const right=new THREE.Vector3().crossVectors(forward,up).normalize();
  up.crossVectors(right,forward).normalize();
  const basis=new THREE.Matrix4().makeBasis(right,up,forward.negate());
  root.quaternion.copy(pose.rotation).multiply(new THREE.Quaternion().setFromRotationMatrix(basis).invert());
  root.position.copy(pose.position).sub(rear.applyQuaternion(root.quaternion));
  root.updateMatrixWorld(true);
}

// First-person-only two-segment arm placement. The source rig's shoulders are at
// the world character's head; place their sleeve ends below this camera instead.
// Mechanical hand targets/orientations still come from the sampled GLB clip.
export function placeViewArms(root,weapon,gripWeight){
  const quaternion=new THREE.Quaternion();
  const worldQuaternion=bone=>bone.getWorldQuaternion(new THREE.Quaternion());
  const setWorldQuaternion=(bone,q)=>bone.quaternion.copy(worldQuaternion(bone.parent).invert().multiply(q));
  for(const side of ['l','r']){
    const upper=root.getObjectByName(`upperarm_${side}`),lower=root.getObjectByName(`lowerarm_${side}`),hand=root.getObjectByName(`hand_${side}`);
    const oldShoulder=upper.getWorldPosition(new THREE.Vector3()),oldElbow=lower.getWorldPosition(new THREE.Vector3()),oldHand=hand.getWorldPosition(new THREE.Vector3());
    const uq=worldQuaternion(upper),lq=worldQuaternion(lower),hq=worldQuaternion(hand);
    const a=oldShoulder.distanceTo(oldElbow),b=oldElbow.distanceTo(oldHand);
    const target=oldHand.clone();
    if(side==='r'&&gripWeight>0){
      const grip=weapon.localToWorld(new THREE.Vector3(.055,-.025,.065));target.lerp(grip,gripWeight);
    }
    const shoulder=weapon.localToWorld(new THREE.Vector3(side==='l'?-.30:.32,side==='l'?-.32:-.30,side==='l'?.01:.10));
    const direction=target.clone().sub(shoulder).normalize();
    let distance=shoulder.distanceTo(target);
    // Preserve exact hand contact even during the original pouch reach. Move only
    // the off-screen sleeve anchor when the two existing bones cannot span it.
    const reach=a+b-.001;if(distance>reach){shoulder.addScaledVector(direction,distance-reach);distance=reach;}
    const along=(a*a-b*b+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along));
    const pole=new THREE.Vector3(side==='l'?-.4:.4,-1,.15);
    pole.addScaledVector(direction,-pole.dot(direction)).normalize();
    const elbow=shoulder.clone().addScaledVector(direction,along).addScaledVector(pole,height);
    upper.position.copy(upper.parent.worldToLocal(shoulder.clone()));
    quaternion.setFromUnitVectors(oldElbow.clone().sub(oldShoulder).normalize(),elbow.clone().sub(shoulder).normalize()).multiply(uq);
    setWorldQuaternion(upper,quaternion);root.updateMatrixWorld(true);
    quaternion.setFromUnitVectors(oldHand.clone().sub(oldElbow).normalize(),target.clone().sub(elbow).normalize()).multiply(lq);
    setWorldQuaternion(lower,quaternion);root.updateMatrixWorld(true);setWorldQuaternion(hand,hq);root.updateMatrixWorld(true);
  }
}

export function riflePresentationMaterial(source){
  const material=source.clone();material.name='wz29_first_person_atlas';
  material.color.multiply(new THREE.Color(.94,.92,.89));material.normalScale?.multiplyScalar(.65);
  // Preserve baked wood grain, wear and metal masks, with restrained highlights.
  material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>',
    '#include <metalnessmap_fragment>\nroughnessFactor = max(roughnessFactor, mix(0.70, 0.55, metalnessFactor));\nmetalnessFactor = min(metalnessFactor, 0.74);');};
  material.customProgramCacheKey=()=> 'm01-wz29-presentation-v1';
  return material;
}
