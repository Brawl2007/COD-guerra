import * as THREE from 'three';
import {WEAPON_PRESENTATION,weaponRecoil,idleSway} from './first-person-weapon-fx.js';

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

// ——— T39 weapon feel. Presentation only: every term below is read from the simulation clock and the player's own
// state after the simulation has decided it. Nothing here feeds aim, spread, hits, cadence or the saved state. ———
export const WZ29_FEEL=Object.freeze({
  // Aim transition in simulation seconds (linear progress, eased once by adsEase) and the world field of view it drives.
  ads:Object.freeze({in:.30,out:.22,fov:Object.freeze({hip:70,ads:48})}),
  // Wall lowering: parallel probes along the aim, in the eye frame [right, up] metres. `reach` is the muzzle's reach (1.215 m
  // at the sights) plus a margin; at `full` or closer the rifle is held across the body, muzzle dropped to the left, which
  // draws it at most 0.71 m in front of the eye and keeps every vertex of rifle, hands and sleeves beyond the 0.03 m near plane.
  wall:Object.freeze({reach:1.45,full:.8,probes:Object.freeze([[0,0],[-.14,0],[.2,0],[.145,-.17],[0,.1]].map(p=>Object.freeze(p))),
    tauIn:.05,tauOut:.2,pitch:1.35,yaw:1.35,roll:.2,back:.04,drop:.05,across:.02}),
  // Step rate (rad/s of the first harmonic) and amplitudes in metres/radians per gait.
  gait:Object.freeze({walk:Object.freeze({rate:9,x:.003,y:.004,roll:.006,pitch:.002}),run:Object.freeze({rate:14,x:.005,y:.0085,roll:.013,pitch:.005}),
    crouch:Object.freeze({rate:6.5,x:.0022,y:.0026,roll:.004,pitch:.0014})}),
});
/** One ease for the whole aim transition: weapon pose and field of view read the same curve. Exactly 0 at 0 and 1 at 1. */
export const adsEase=progress=>{const x=clamp(progress,0,1);return x*x*(3-2*x);};
/** Linear progress 0..1 towards the aim state: 0.30 s in, 0.22 s out of mission time. A repeated clock (dt 0) cannot move it. */
export function advanceAdsProgress(progress,aiming,dt,{in:seconds_in,out:seconds_out}=WZ29_FEEL.ads){
  if(!(dt>0))return progress;
  const step=dt/(aiming?seconds_in:seconds_out);
  return aiming?Math.min(1,progress+step):Math.max(0,progress-step);
}
/** World field of view for an aim progress; the same ease as the weapon pose, 70 at the hip and 48 down the sights. */
export function adsFieldOfView(progress,{hip,ads}=WZ29_FEEL.ads.fov){return hip+(ads-hip)*adsEase(progress);}
/** Chest rise and fall (closed form of the clock): vertical lift with a little muzzle pitch. Hip only; the ADS line stays exact. */
export function breathSway(clock){
  const s=Math.sin(clock*1.7);
  return {y:s*.0012+Math.sin(clock*3.4+.8)*.0003,pitch:Math.sin(clock*1.7-.4)*.0028};
}
/**
 * Step bob as a function of the clock, the gait weights and nothing else. Each gait is its own closed-form oscillator
 * and the gaits are cross-faded by their weights, so changing gait never pops a phase. `run` and `crouch` are 0..1.
 */
export function gaitBob(clock,{run=0,crouch=0}={}){
  const g=WZ29_FEEL.gait,wr=clamp(run,0,1),wc=(1-wr)*clamp(crouch,0,1),ww=1-wr-wc,out={x:0,y:0,roll:0,pitch:0,phase:0};
  for(const [weight,a] of [[ww,g.walk],[wr,g.run],[wc,g.crouch]]){
    if(!(weight>0))continue;
    const p=clock*a.rate;
    out.x+=weight*Math.sin(p)*a.x;out.y+=weight*Math.sin(2*p)*a.y;out.roll+=weight*Math.sin(p)*a.roll;out.pitch-=weight*Math.cos(2*p)*a.pitch;
    out.phase+=weight*(p%(2*Math.PI));
  }
  return out;
}
/** First entry distance of a ray into an axis-aligned box ({min,max}, metres), or null past `limit`. Render-side slab test; reads only. */
function boxEntry(origin,direction,min,max,limit){
  let near=0,far=limit;
  for(const axis of ['x','y','z']){
    if(Math.abs(direction[axis])<1e-9){if(origin[axis]<min[axis]||origin[axis]>max[axis])return null;continue;}
    const a=(min[axis]-origin[axis])/direction[axis],b=(max[axis]-origin[axis])/direction[axis];
    near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
    if(near>far)return null;
  }
  return near;
}
/**
 * Read-only wall probe from the view: `frame` is the render camera's {origin, forward, right, up} (unit vectors, metres) and
 * `obstacles` the world's collision box list ({min,max}, as the shot trace reads it). Nothing is written. Returns the nearest
 * distance (m) from the eye to a box along the aim, probed on a few parallel rays, or Infinity when the way is clear.
 */
export function wallClearance(obstacles,frame,{reach,probes}=WZ29_FEEL.wall){
  const {origin:o,forward:f,right:r,up:u}=frame??{};
  if(!obstacles?.length||![o?.x,o?.y,o?.z,f?.x,f?.y,f?.z,r?.x,r?.y,r?.z,u?.x,u?.y,u?.z].every(Number.isFinite))return Infinity;
  const slack=reach+.3;let nearest=Infinity;
  for(const b of obstacles){
    if(b.max.x<o.x-slack||b.min.x>o.x+slack||b.max.z<o.z-slack||b.min.z>o.z+slack||b.max.y<o.y-slack||b.min.y>o.y+slack)continue;
    for(const [right,up] of probes){
      const d=boxEntry({x:o.x+r.x*right+u.x*up,y:o.y+r.y*right+u.y*up,z:o.z+r.z*right+u.z*up},f,b.min,b.max,reach);
      if(d!==null&&d<nearest)nearest=d;
    }
  }
  return nearest;
}
/** Steady-state lowering for a clearance: 0 beyond the muzzle's reach, 1 at `full` or closer, linear between. */
export function wallLowerTarget(clearance,{reach,full}=WZ29_FEEL.wall){
  if(!(clearance<reach))return 0;
  return clamp((reach-clearance)/(reach-full),0,1);
}
/** Lower fast when the wall arrives, raise slowly once it is clear; exponential in simulation seconds. */
export function advanceWallLower(value,target,dt,{tauIn,tauOut}=WZ29_FEEL.wall){return advanceVisualBlend(value,target,dt,target>value?tauIn:tauOut);}

export function presentationPose({clock,lastShot,aim,move,run,reload,phase:_phase,shot=0,look=null,mechanical=0,stroke=0,crouch=0,wall=0,wallPose=WZ29_FEEL.wall,profile=WEAPON_PRESENTATION.wz29}){
  // Presentation offsets only. At rest in full ADS every extra term is zero, so the measured sight line is exact.
  // `phase` is accepted for older callers; the step bob is now a function of the clock and gait weights (gaitBob).
  const recoil=weaponRecoil(profile,clock-lastShot/1000,aim,shot),eased=adsEase(aim),hip=1-eased,active=1-reload;
  const arc=4*aim*(1-aim)*active*(1-stroke),bob=move*hip*active,breath=breathSway(clock),gait=gaitBob(clock,{run,crouch});
  // Down the sights the rifle follows the view exactly, also while turning: the sights show where the round goes.
  const hold=hip*active*(1-.65*Math.min(1,move)),sway=idleSway(clock),lag=(1-eased)*active;
  const yawLag=(look?.yaw??0)*lag,pitchLag=(look?.pitchLag??0)*lag;
  const position=new THREE.Vector3(.145*hip,-.175*hip,-WZ29_VISUAL.rearDepth);
  position.x+=gait.x*bob+sway.x*hold-yawLag*.05;
  position.y+=gait.y*bob+breath.y*hip*active+sway.y*hold-.010*arc+pitchLag*.04;
  position.y-=.065*run*hip;position.z-=.025*run*hip;
  position.lerp(new THREE.Vector3(.045,-.10,-.92),reload);
  position.y+=recoil.rise-.018*stroke;position.z+=recoil.back+mechanical*.004;
  // Raising to the shoulder dips and cants the rifle mid-way; the lag trails mouse look; recoil/settle are per weapon.
  const euler=new THREE.Euler(
    -.06*hip-.13*run*hip-.18*reload+recoil.pitch+sway.pitch*hold-.016*arc+pitchLag-mechanical*.006+gait.pitch*bob+breath.pitch*hip*active,
    .15*hip+.04*reload+recoil.yaw+sway.yaw*hold+yawLag,
    -.055*hip-.13*run*hip-.22*reload+recoil.roll+sway.roll*hold+.05*arc-yawLag*.5+gait.roll*bob-.10*stroke);
  // Held low near a wall: pulled back and down, canted across the body with the muzzle dropped to the floor. wall = 0 adds exact zeros.
  if(wall>0){
    const w=adsEase(wall),k=wallPose;
    position.x-=k.across*w;position.y-=k.drop*w;position.z+=k.back*w;
    euler.x-=k.pitch*w;euler.y+=k.yaw*w;euler.z-=k.roll*w;
  }
  return {position,rotation:new THREE.Quaternion().setFromEuler(euler),kick:recoil.kick,gait};
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
export const VIEW_SHOULDERS=Object.freeze({l:Object.freeze([-.30,-.43,-.10]),r:Object.freeze([.32,-.40,0])});
export function placeViewArms(root,weapon,gripWeight,shoulders=VIEW_SHOULDERS){
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
    const shoulder=weapon.localToWorld(new THREE.Vector3(...shoulders[side]));
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
  // Preserve baked wood grain, wear and metal masks. The weapon pass now has a low sky/ground reflection
  // environment, so blued steel may read as metal (sheen) while oiled wood stays satin, never mirror-like.
  material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>',
    '#include <metalnessmap_fragment>\nroughnessFactor = max(roughnessFactor, mix(0.62, 0.46, metalnessFactor));\nmetalnessFactor = min(metalnessFactor, 0.86);'+
    // The atlas paints steel at ~0.03 linear, which a PBR metal turns into a black hole; lift only metal texels to a blued-steel reflectance.
    '\ndiffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 3.2 + vec3(0.025), metalnessFactor);');};
  // Reflection strength is the weapon pass's scene.environmentIntensity (three ignores envMapIntensity without an own envMap).
  material.customProgramCacheKey=()=> 'm01-wz29-presentation-v3';
  return material;
}
/** Hands/sleeves/clip use a private atlas copy: the eye pass has its own environment and must not flip the world soldiers' programs. */
export function viewAtlasMaterial(source){
  const material=source.clone();material.name='m01_first_person_atlas';return material;
}
