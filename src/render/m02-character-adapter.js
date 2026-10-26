import * as THREE from 'three';
import {M01Characters} from './m01-characters.js';
import {genericCandidate} from './m01-animation-resolver.js';

const LOWER=/^(root|hips|thigh_[lr]|calf_[lr]|foot_[lr]|ball_[lr])\./;
const valueAt=(track,time)=>Array.from(track.createInterpolant().evaluate(time));

// Reuse authored upper-body motion without standing a crouched actor up.
// The weapon is a root-level bone in this rig, so it receives the same rigid
// hips transform as the arms. Merely subtracting height breaks hand contacts.
export function crouchedClip(source,base,name){
 if(!source||!base)return null;
 const target=new Map(base.tracks.map(t=>[t.name,t])),original=new Map(source.tracks.map(t=>[t.name,t]));
 const matrix=(map,time,prefix)=>new THREE.Matrix4().compose(
  new THREE.Vector3().fromArray(valueAt(map.get(`${prefix}.position`),time)),
  new THREE.Quaternion().fromArray(map.has(`${prefix}.quaternion`)?valueAt(map.get(`${prefix}.quaternion`),time):[0,0,0,1]),new THREE.Vector3(1,1,1));
 const hip=matrix(target,0,'hips'),times=Array.from({length:Math.ceil(source.duration*30)+1},(_,i)=>Math.min(i/30,source.duration));
 const tracks=source.tracks.map(track=>{
  if(LOWER.test(track.name)){
   const value=target.has(track.name)?valueAt(target.get(track.name),0):track.name.endsWith('.quaternion')?[0,0,0,1]:valueAt(track,0),copy=track.clone();
   copy.times=new Float32Array([0,source.duration]);copy.values=new Float32Array([...value,...value]);return copy;
  }
  if(/^(weapon|weapon_clip)\.(position|quaternion)$/.test(track.name)){
   const prefix=track.name.split('.')[0],values=[];
   for(const time of times){
    const transform=hip.clone().multiply(matrix(original,time,'hips').invert()).multiply(matrix(original,time,prefix));
    const position=new THREE.Vector3(),quaternion=new THREE.Quaternion(),scale=new THREE.Vector3();transform.decompose(position,quaternion,scale);
    values.push(...(track.name.endsWith('.position')?position.toArray():quaternion.toArray()));
   }
   return track.name.endsWith('.position')?new THREE.VectorKeyframeTrack(track.name,times,values):new THREE.QuaternionKeyframeTrack(track.name,times,values);
  }
  return track.clone();
 });
 for(const track of base.tracks)if(LOWER.test(track.name)&&!original.has(track.name)){
  const value=valueAt(track,0),copy=track.clone();copy.times=new Float32Array([0,source.duration]);copy.values=new Float32Array([...value,...value]);tracks.push(copy);
 }
 const clip=new THREE.AnimationClip(name,source.duration,tracks);
 clip.userData={...source.userData,m02DerivedFrom:[source.name,base.name]};return clip;
}

export function m02CharacterSample(actor,time,clips){
 if(!actor.alive||actor.state==='WOUNDED'||actor.role==='MEDIC')return null;
 const get=name=>clips.get(name);
 if(actor.reload){
  const name=actor.weapon==='rkm_wz28'||actor.weapon==='mp38'?'rkm_reload':actor.weapon==='mg34'?'m02_mg34_crouch_reload':'m02_rifle_crouch_reload';
  const clip=get(name);
  if(clip)return {clip:name,time:THREE.MathUtils.clamp((time-actor.reload.startedAt)/actor.reload.durationSec,0,1)*clip.duration,loop:false,rate:clip.duration/actor.reload.durationSec};
 }
 if(actor.moving)return null;
 if(actor.m02PreparationAction){
  const {clip:name,startedAt}=actor.m02PreparationAction,clip=get(name),age=time-startedAt;
  if(actor.crouched&&clip&&age>=0&&age<clip.duration&&!actor.shot&&actor.suppressed<.2)return {clip:name,time:age,loop:false,rate:1};
 }
 // SMGs do not cycle a rifle bolt after an automatic burst. The magazine
 // handling still needs a dedicated MP38 clip/model pass (documented partial).
 if(actor.weapon==='mp38'){
  const age=time-(actor.lastShotAt??-Infinity),name=age<.14?(actor.crouched?'m02_auto_crouch_fire':'rkm_fire_burst'):(actor.crouched?'crouched_idle':'aim');
  if(get(name))return {clip:name,time:age<.14?Math.max(0,time-actor.firedAt):0,loop:false,rate:age<.14?1:0};
 }
 if(actor.crouched&&actor.suppressed<.4){
  const age=time-actor.firedAt;
  let name;
  if(actor.weapon==='mg34')name=actor.shot>.06?'m02_mg34_crouch_fire':'m02_mg34_crouch_aim';
  else if(actor.weapon==='rkm_wz28'&&age>=0&&age<(get('rkm_fire_burst')?.duration??0))name='m02_auto_crouch_fire';
  else if(['wz29','kar98k'].includes(actor.weapon))name=age>=0&&age<(get('fire_bolt')?.duration??0)?'m02_rifle_crouch_fire':actor.state==='SUPPRESS'?'m02_rifle_crouch_aim':'crouched_idle';
  if(name&&get(name))return {clip:name,time:Math.max(0,Number.isFinite(age)?age:0),loop:false,rate:name.endsWith('_fire')?1:0};
 }
 return null;
}

export class M02Characters extends M01Characters{
 prepareM02Clips(){
  for(const [source,base,name]of [
   ['fidget_check_rifle','crouched_idle','m02_check_rifle'],
   ['fidget_look','crouched_idle','m02_scan_field'],
   ['reload_clip','crouched_idle','m02_rifle_crouch_reload'],
   ['mg34_reload','crouched_idle','m02_mg34_crouch_reload'],
   ['rkm_fire_burst','crouched_idle','m02_auto_crouch_fire'],
   ['fire_bolt','crouched_idle','m02_rifle_crouch_fire'],
   ['aim','crouched_idle','m02_rifle_crouch_aim'],
   ['mg34_fire_burst','crouched_idle','m02_mg34_crouch_fire'],
   ['mg34_aim','crouched_idle','m02_mg34_crouch_aim'],
  ]){
   const clip=crouchedClip(this.clips.get(source),this.clips.get(base),name);if(clip)this.clips.set(name,clip);
  }
  this.revision++;
 }
 sample(actor,time,actors,pose,battleClock){
  const adapted=m02CharacterSample(actor,time,this.clips);if(adapted)return adapted;
  // Keep the M01 gait rather than restarting a standing fire/bolt animation
  // while a machine gunner is physically moving.
  const sampled=actor.moving&&['mg34','rkm_wz28','mp38'].includes(actor.weapon)?{...actor,firedAt:-Infinity,shot:0}:actor;
  if(actor.moving&&actor.weapon==='mg34')return genericCandidate(sampled,pose,time,0,this.clipView);
  return super.sample(sampled,time,actors,pose,battleClock);
 }
}
