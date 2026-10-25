import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { AssetManager } from '../assets/asset-manager.js';
import { actorPose } from './m01-actor-pose.js';
import { AnimationPlayer } from './m01-animation-player.js';
import {SoldierVisualVariations,soldierVisualVariant} from './m01-soldier-variation.js';
import {lodProfile,selectConsumerLod,createLodCounters,tallyLod,lodCounterTotals,actorPoseQuantum,actorPoseDue} from './m01-lod-policy.js';
import { CKM_POSITION, CKM_FEED_SEC } from '../game/m01-simulation.js';
import {mg34ProneSample,MG34_MUZZLE_SOCKET,eyePosition,actorHitboxes,muzzlePosition} from '../world/spatial.js';
import {
  actorHash as hash,
  resolveCombatReaction,
  resolveLocomotionGait,
  resolveSupportHandIK,
  resolveLodWithHysteresis,
  resolveStrideSample,
  resolveTorsoOrientation,
  GAP,
  genericCandidate,
  refineCandidate,
  resolveAnimation
} from './m01-animation-resolver.js';
import { animationSeed, unit as animationUnit } from './m01-animation-variety.js';
import {SoldierMergeCache,batchSoldier} from './m01-soldier-batching.js';
import { bindCharacterIkRig, captureIkPose, createIkDiagnosticsState, formatIkDiagnostics, restoreIkPose, updateActorsIk } from './m01-hand-pin.js';
import { sapperSample } from './m01-sapper-pose.js';
import { SapperKit } from './m01-sapper-kit.js';
import { openingSample, openingPose, openingProps, kowalCleans, HANDS_BUSY } from './m01-opening-pose.js';
import { OpeningKit } from './m01-opening-kit.js';
import { applyOpeningPose } from './m01-opening-ik.js';

const BASE='assets/models/provisional/m01/characters/';
const MG='assets/models/provisional/m01/weapons/mg34/';
const MG_PRONE='assets/models/provisional/m01/weapons/mg34-prone/';
const PRONE_CLIPS=['enter','idle','aim','fire_burst','exit','reload'].map(n=>`mg34_prone_${n}`);
const CKM='assets/models/provisional/m01/weapons/ckm_wz30/';
const ckmRole=a=>a.group==='grp_ckm_crew'&&['ckm_gunner','ckm_loader'].includes(a.id);
const ckmAtPost=a=>ckmRole(a)&&a.ckm?.phase!=='retreat';
/**
 * The authored ckm clip phase a saved ckm record plays at `time`, and the time in it: the saved phase and its start, nothing else. A stoppage (CKM_STOPPAGES) reuses the `feed` drill (belt tip
 * in, handle back twice, `ready` at 3.0 s of 3.2 s), placed at the END of the clearance (clearAt - CKM_FEED_SEC) so that `ready` lands as the loader says 115; in the lead before it
 * (0.6 / 1.4 s) the crew holds the aim pose while the gunner calls it. Presentation only: the simulation decided when it clears.
 */
export function ckmClipPhase(c,time){
  const age=Math.max(0,time-c.startedAt);
  if(c.phase!=='stoppage')return {phase:c.phase,time:age};
  const lead=Number.isFinite(c.clearAt)?Math.max(0,c.clearAt-c.startedAt-CKM_FEED_SEC):0;   // (a record always carries its clearAt: the simulation validates it)
  return age<lead?{phase:'aim',time:age}:{phase:'feed',time:age-lead};
}
// Distances come from the single LOD policy (m01-lod-policy.js 'actors'); only the skinning budgets (18/24/28) live here.
const actorLimits=(preset,count)=>{const [near,middle,far]=lodProfile('actors',preset).bands;return {count,near,middle,far};};
// High keeps skinned bodies up to the impostor hand-off (350 m) for 48 actors, so no actor in normal combat range is a box proxy.
export const ACTOR_BUDGET={low:18,medium:24,high:48};
const LIMITS={low:actorLimits('low',ACTOR_BUDGET.low),medium:actorLimits('medium',ACTOR_BUDGET.medium),high:actorLimits('high',ACTOR_BUDGET.high)};
const instanceLod=v=>v?Number(v.key.slice(v.key.indexOf(':')+1)):null;   // LOD band of a live instance (0..2); null = none yet
const named={marek_zielinski:'zielinski',pawel_krawiec:'krawiec',tadeusz_nowicki:'nowicki',jozef_bak:'bak',szymon_kowal:'kowal',leon_dudek:'dudek'};
const weaponParts=new Set(['rifle','clip','rifle_wz98a','rkm_wz28','rkm_bipod_open','rkm_bipod_folded','rkm_pouch','rag']);
// Civilians (Lipski, station-yard railwaymen and aid staff) are drawn with the soldier body in workwear (no new asset). The yard patient and the cart keep
// the procedural stretcher/cart layouts of m01-view.js, which a rigged soldier cannot reproduce.
const dressedCivilian=a=>Boolean(a.civilian)&&a.task!=='cart'&&a.task!=='yard_patient';
// R1-a (2026-10-23): the hand lantern hangs from the instance root, not from a bone, so on a railwayman a bomb has killed or wounded (lying where he fell) it would float 0.8 m above the ground
// beside the body. It is lit only while its carrier stands. Presentation only, read from the actor's state each frame, before the held-pose shortcut.
const lanternLit=a=>a.alive&&a.state!=='WOUNDED'&&!a.carriedBy;
const setLantern=(v,a)=>{const lit=lanternLit(a);for(const m of v.lantern)m.visible=lit;};
const civilianHidden=n=>n==='gear'||n==='sapper'||n==='nco'||n==='cap_wz37'||n.startsWith('helmet_')||n.startsWith('rank_')||weaponParts.has(n);
const mgLoader=a=>a.team==='enemy'&&a.mg34Loader&&['de_mg34_loader_0','de_mg34_loader_1'].includes(a.id)&&a.loaderFor===`de_east_${a.id.at(-1)}`;
const mgCrew=a=>mgGunner(a)||mgLoader(a);
const mgGunner=a=>a.team==='enemy'&&a.weapon==='mg34'&&['de_east_0','de_east_1'].includes(a.id);
const stationClips=['station_drag_medic_grab','station_drag_patient_grab','station_drag_medic_release','station_drag_patient_release','drag_wounded','crouched_idle','wounded'];
const SPINE_NAMES=['spine_02','spine_01','spine','chest','Spine2','Spine1','Spine'];
const SUPPORT_ARM_NAMES=['upperarm_l','arm_l','LeftArm','mixamorigLeftArm'];
// R1-b: the procedural pose of the opening acts (lean, head, arm IK) runs within this distance of the player, per quality preset, for at most OPEN_IK_MAX men a frame (nearest first, as the candidates are).
const OPEN_IK_M={low:22,medium:45,high:75},OPEN_IK_MAX=14;
const POSE_HOLD_MAX_DRIFT_M=1.5;   // a walking/running soldier moves < 0.5 m in the longest hold (0.067 s); anything more is not a normal frame
const UP_AXIS=new THREE.Vector3(0,1,0);
// Per-frame scratch of update() (single-threaded, never retained across calls).
const _twist=new THREE.Quaternion(),_muzzle=new THREE.Vector3();
// Optional high-tier sources requested by update(); the key prefix selects the loader (loadSource / loadMG / loadCKM).
const HIGH_SOURCES=['pl:0','de:0','de:1','mg34:0','ckm:0','mg34:1','ckm:1'];
// Candidate order: reserved MG34 gunners, then their loaders, then nearest first, ties by id (a total order, so the in-place sort is deterministic).
const byCandidate=(a,b)=>Number(mgGunner(b.a))-Number(mgGunner(a.a))||Number(mgLoader(b.a))-Number(mgLoader(a.a))||a.d-b.d||a.a.id.localeCompare(b.a.id);
const unarmedKind=a=>Boolean(a.civilian)||a.role==='MEDIC'||mgCrew(a);   // never carries the rifle: its weapon parts are not batched (decided at create, recreated if it ever changes)
const NO_NAMES=[],RIFLE_ARMED=['rifle','clip'],BAK_ARMED=['clip','rifle_wz98a'],KOWAL_ARMED=['rkm_wz28'];   // parts whose visibility is exactly `armed` (see the update loop)
const sameBones=(a,b)=>a===b||a.length===b.length&&a.every((bone,i)=>bone===b[i]);
const sameInverses=(a,b)=>a===b||a.length===b.length&&a.every((m,i)=>m.equals(b[i]));
/** SkeletonUtils.clone() gives every skinned mesh its own Skeleton, although all meshes of one soldier come from the same source skin (same bones,
 *  same inverse bind matrices). Rebind the meshes of each such group to the group's first Skeleton: the bone matrices are computed and uploaded once per
 *  soldier instead of once per mesh. Each mesh keeps its own bindMatrix, so the skinned result is bit-identical. Returns the distinct Skeletons. */
export function shareSkeletons(root){
  const leaders=[];
  root.traverse(m=>{
    if(!m.isSkinnedMesh)return;
    const own=m.skeleton,leader=leaders.find(l=>sameBones(l.bones,own.bones)&&sameInverses(l.boneInverses,own.boneInverses));
    if(!leader)leaders.push(own);
    else if(leader!==own)m.bind(leader,m.bindMatrix);
  });
  return leaders;
}
const debugEnabled=()=>typeof window!=='undefined'&&typeof location!=='undefined'&&new URLSearchParams(location.search).has('debug');

// Presentation only. Playback is sampled from the saved mission clock; no renderer timers enter saves.
/** The GLB 'extras' (weapons/sockets) live on a child of the empty `m01_soldier_<nation>` Group (e.g. `m01_soldier_pl_1`): first descendant that carries them. Presentation only. */
export function soldierProfile(root,nation){
  const top=root.getObjectByName(`m01_soldier_${nation}`)??root;let found=null;
  top.traverse(n=>{if(!found&&(n.userData?.weapons||n.userData?.sockets))found=n.userData;});
  return found;
}
export class M01Characters {
  constructor(scene,{visualVariation=true,ik=true,world=null,debug=debugEnabled(),ikMeasure=debug,batching=true}={}){
    this.visuals=visualVariation?new SoldierVisualVariations():null;
    // R8-a: the visible skinned parts of a soldier are drawn as 2 merged meshes (body, weapon) instead of one mesh per part. `batching:false` keeps the former per-part path (A/B, tests).
    this.batching=Boolean(batching);this.mergeCache=new SoldierMergeCache();
    this.scene=scene;this.assets=new AssetManager();this.sources=new Map();this.pending=new Set();
    this.instances=new Map();this.clips=new Map();this.revision=0;this.disposed=false;this.stats={};
    // R3-a: the phase of the sappers' operation (sim.sapperOps, set by update()) and the props the sappers hold (m01-sapper-kit.js); presentation only.
    this.ops=null;this.sapperKit=null;
    // R1-b: the props of the opening life's acts (m01-opening-kit.js) and the men whose procedural pose (m01-opening-ik.js) is applied after the foot IK this frame; presentation only.
    this.openingKit=null;this.openList=[];
    // T37 foot IK / ramp lean / hand pin (m01-foot-ik.js, m01-hand-pin.js). Presentation only; off = plain clip output, bit-identical.
    this.ikEnabled=Boolean(ik);this.ikMeasure=Boolean(ikMeasure);this.world=world;this.ikState=createIkDiagnosticsState();this.ikEntries=[];
    if(debug&&typeof window!=='undefined'){this.ikDebug={setEnabled:on=>this.setIkEnabled(on),isEnabled:()=>this.ikEnabled};window.m01CharacterIkDebug=this.ikDebug;}
    // Cross-fade records by actor id (pure data from the resolver). They outlive LOD swaps; they never enter a save.
    this.anim=new Map();
    // Per-preset tally of the band an actor switched into (T43 diagnostics); presentation only, never saved.
    this.lodCounters=createLodCounters();this.lodSwitches=0;
    // Reduced pose rate of distant actors (m01-lod-policy.js). Cumulative counters feed the diagnostics; carriers is a reused scratch set.
    this.poseStats={applied:0,held:0,boneUploads:0,boneSkips:0};this.lastUpdateTime=NaN;this.carriers=new Set();
    // update() scratch, reused every frame: candidate records/array, player layer records and the `alt` resolver callback with its per-actor context.
    this.cands=[];this.candPool=[];this.layers=[];this.layerPool=[];this.altActors=null;this.altActor=null;this.altTime=0;this.altClock=undefined;
    this.altDescribe=patch=>{const b={...this.altActor,...patch},s=this.describe(b,this.altTime,this.altActors,actorPose(b,this.altTime),this.altClock);return this.clips.has(s.clip)?s:null;};
  }
  /** Fog colour for the German distance rim (presentation only). */
  setRimFog(fog){this.visuals?.setFog(fog);}
  setIkEnabled(on){const next=Boolean(on);if(this.ikEnabled!==next){this.ikEnabled=next;this.revision++;}return this.ikEnabled;}
  async load(quality='low'){
    // Optional private FP variants never hold the mandatory bridge/menu readiness.
    // Revision is already part of the paused render invalidation key.
    for(const [key,file]of [['fp:0','m01_fp_arms_v2.glb'],['fp:patient','m01_fp_patient_v2.glb']]){
      this.assets.load(key,BASE+'fp-arms-v2/'+file).then(g=>{
        if(!this.disposed){this.sources.set(key,g);this.revision++;}
      }).catch(()=>{/* Existing optional first-person fallback remains playable. */});
    }
    await Promise.allSettled([
      this.assets.load('m01-clips',BASE+'m01_soldier_animations.glb').then(g=>{
        if(!this.disposed){g.animations.forEach(c=>this.clips.set(c.name,c));this.revision++;}
      }),
      // Six original motion clips live in a separate GLB in the V7 asset library.
      // Loading only the original animations GLB would silently fall back for all six.
      this.assets.load('m01-motion-clips',BASE+'motion-clips-v1/m01_soldier_motion_clips.glb').then(g=>{
        if(!this.disposed){g.animations.forEach(c=>this.clips.set(c.name,c));this.revision++;}
      }),
      // T08 clip library V2 (idle variants, fidgets, directional hits/deaths...): the 4 names it shares with the packs above are byte-identical, so load order is irrelevant.
      this.assets.load('m01-clip-library',BASE+'clip-library-v2/m01_soldier_clip_library_v2.glb').then(g=>{
        if(!this.disposed){g.animations.forEach(c=>this.clips.set(c.name,c));this.revision++;}
      }),
      this.assets.load('m01-station-clips',BASE+'m01_station_animations.glb').then(g=>{
        if(!this.disposed){g.animations.forEach(c=>this.clips.set(c.name,c));this.revision++;}
      }),
      this.assets.load('m01-station-transitions',BASE+'station-drag-transitions/m01_station_drag_transitions.glb').then(g=>{
        if(!this.disposed){g.animations.forEach(c=>this.clips.set(c.name,c));this.revision++;}
      }),
      this.assets.load('m01-crews-evacuation',BASE+'crews-evacuation/m01_crews_evacuation.glb').then(g=>{
        if(!this.disposed){g.animations.forEach(c=>this.clips.set(c.name,c));this.revision++;}
      }),
      this.assets.load('mg34-clips',MG+'m01_mg34_animations.glb').then(g=>{
        if(!this.disposed){g.animations.forEach(c=>this.clips.set(c.name,c));this.revision++;}
      }),
      this.assets.load('mg34-prone-clips',MG_PRONE+'m01_mg34_prone_animations.glb').then(g=>{
        if(!this.disposed){g.animations.forEach(c=>this.clips.set(c.name,c));this.revision++;}
      }),
      this.assets.load('ckm-clips',CKM+'m01_ckm_wz30_animations.glb').then(g=>{
        if(!this.disposed){g.animations.forEach(c=>this.clips.set(c.name,c));this.revision++;}
      }),
      this.loadCKM(2),...(quality==='high'?[this.loadCKM(0),this.loadCKM(1)]:[]),
      this.loadMG(2),...(quality==='high'?[this.loadMG(0),this.loadMG(1)]:[]),
      // The hands and rifle are centimetres from the camera: their LOD0 is shared with the viewmodel on every preset.
      ...['pl:0','pl:1','pl:2','de:2',...(quality==='high'?['de:0','de:1']:[])].map(k=>this.loadSource(k))
    ]);
  }
  /** Idle once everything is loaded or pending: the async loaders are only entered (and a Promise only created) for a source never requested. */
  requestHighSources(){
    if(this.disposed)return;
    for(let i=0;i<HIGH_SOURCES.length;i++){
      const key=HIGH_SOURCES[i];if(this.pending.has(key)||this.sources.has(key))continue;
      const colon=key.indexOf(':'),kind=key.slice(0,colon),lod=Number(key.slice(colon+1));
      void(kind==='mg34'?this.loadMG(lod):kind==='ckm'?this.loadCKM(lod):this.loadSource(key));
    }
  }
  async loadSource(key){
    if(this.pending.has(key)||this.sources.has(key)||this.disposed)return;
    this.pending.add(key);const [nation,lod]=key.split(':');
    try{
      const g=await this.assets.load(key,`${BASE}m01_soldier_${nation}_lod${lod}.glb`);
      if(!this.disposed){this.sources.set(key,g);this.revision++;}
    }catch{/* Procedural actors remain playable if an optional character asset fails. */}
  }
  async loadMG(lod){
    const key=`mg34:${lod}`;if(this.pending.has(key)||this.sources.has(key)||this.disposed)return;
    this.pending.add(key);
    try{
      const g=await this.assets.load(key,`${MG}m01_mg34_lod${lod}.glb`);
      if(!this.disposed){this.sources.set(key,g);this.revision++;}
    }catch{/* Keep the existing procedural support if its weapon or clips fail. */}
  }
  async loadCKM(lod){
    const key=`ckm:${lod}`;if(this.pending.has(key)||this.sources.has(key)||this.disposed)return;
    this.pending.add(key);
    try{
      const g=await this.assets.load(key,`${CKM}m01_ckm_wz30_lod${lod}.glb`);
      if(!this.disposed){this.sources.set(key,g);this.revision++;}
    }catch{/* The existing procedural actors remain available without the optional kit. */}
  }
  hasProne(){return PRONE_CLIPS.every(n=>this.clips.has(n));}
  hasCKM(){
    // T47: the live phases aim / fire_burst / feed are played from the saved gunner phase, so the whole kit (gun and both crew roles) must be there.
    return this.clips.has('standing_idle')&&[0,1,2].some(l=>this.sources.has(`ckm:${l}`))&&['idle','aim','fire_burst','feed','abandon'].every(phase=>
      this.sources.get('ckm:2')?.animations.some(c=>c.name===`ckm_wz30_gun_${phase}`)&&
      ['gunner','loader'].every(role=>this.clips.has(`ckm_wz30_${role}_${phase}`)));
  }
  // Read-only clip view for the pure resolver: has/get/size for the clip selection, info() for the GLB extras (duration and the
  // nominal ground speed or cycle distance) used by the cross-fade's odometer phase.
  get clipView(){
    const clips=this.clips;
    return this._clipView??={has:n=>clips.has(n),get:n=>clips.get(n),get size(){return clips.size;},info:n=>{const c=clips.get(n);
      return c?{duration:c.duration,speed_mps:c.userData?.speed_mps,cycle_distance_m:c.userData?.cycle_distance_m}:undefined;}};
  }
  // sample() below (adapter precedence, then the resolver's genericCandidate) picks the clip; refineCandidate() then adds rate,
  // exactness, death clock and real-motion locomotion. `hint` is the previous target, used to keep a clip across a one-tick gait glitch.
  describe(actor,time,actors,pose,battleClock,hint){
    return refineCandidate(this.sample(actor,time,actors,pose,battleClock),{actor,pose,time,offset:(hash(actor.id)%1000)/250,clips:this.clipView,hint});
  }
  sample(actor,time,actors=[],pose=actorPose(actor,time),battleClock){
    const offset=(hash(actor.id)%1000)/250;
    if(pose.name==='fallen')return {clip:'fallen',time:Number.isFinite(actor.diedAt)&&time>=actor.diedAt?Math.min(1.4,time-actor.diedAt):1.4,loop:false};
    // R1-b: the act of a man of the opening (actor.act, until the first bomb of 04:34) chooses his clip; null for every other man, for the walking acts and while he is shaken or hit.
    const opening=openingSample(actor,time,offset,this.clipView,pose);if(opening)return opening;
    if(actor.mg34Loader){const phase=actor.mg34Loader.phase,name=`mg34_loader_prone_${phase}`;
      if(this.clips.has(name))return {clip:name,time:Math.max(0,time-actor.mg34Loader.startedAt),loop:phase==='idle'};
      return {clip:phase==='leave'?'walk':'pinned',time:time+offset,loop:true};}
    const prone=mg34ProneSample(actor,time);
    if(prone&&actor.mg34Prone.phase!=='standing'&&this.hasProne())return {clip:prone.clip,time:prone.time,loop:false};
    if(ckmAtPost(actor)&&this.hasCKM()&&!['wounded','carried'].includes(pose.name)){
      const role=actor.id==='ckm_gunner'?'gunner':'loader',{phase,time:age}=ckmClipPhase(actor.ckm,time);
      const name=`ckm_wz30_${role}_${phase}`;
      return {clip:this.clips.has(name)?name:`ckm_wz30_${role}_idle`,time:age,loop:phase==='idle'||phase==='aim'};
    }
    const stationPatient=actor.id==='generic_rifleman'?actor:actors.find(a=>a.id==='generic_rifleman'&&a.carriedBy===actor.id);
    const stationMedic=stationPatient&&actors.find(a=>a.id===stationPatient.carriedBy);
    if(stationPatient?.alive&&stationPatient.active&&stationPatient.task==='station_wounded'&&stationMedic?.alive&&stationMedic.active){
      const transport=stationPatient.stationDrag,phase=transport?.phase??'drag',isPatient=actor===stationPatient;
      if(stationClips.every(n=>this.clips.has(n))){
        if(phase==='drag')return isPatient?{clip:'station_drag_patient_grab',time:this.clips.get('station_drag_patient_grab').duration,loop:false}:
          {clip:'drag_wounded',time:transport?Math.max(0,time-transport.startedAt):time+offset,loop:true};
        const name=`station_drag_${isPatient?'patient':'medic'}_${phase}`;
        return {clip:name,time:Math.max(0,Math.min(1,(time-transport.startedAt)/transport.duration))*this.clips.get(name).duration,loop:false};
      }
      // A missing/partial optional kit falls back for both roles; never play half of a pair.
      if(isPatient)return {clip:'wounded',time:0,loop:false};
      return phase==='drag'?{clip:this.clips.has('drag_wounded')?'drag_wounded':'pinned',time:time+offset,loop:true}:
        {clip:this.clips.has('crouched_idle')?'crouched_idle':'pinned',time:0,loop:false};
    }
    const bak=actor.id==='jozef_bak'?actor:actors.find(a=>a.id==='jozef_bak'&&a.carriedBy===actor.id);
    if(bak?.carry&&bak.alive){const phase=bak.carry.phase,patient=actor===bak;
      if(phase!=='carry'){const name=`carry_${phase}_${patient?'patient':'carrier'}`;
        if(this.clips.has(name))return {clip:name,time:Math.min(1.6,Math.max(0,time-bak.carry.startedAt)),loop:false};
        return {clip:patient?'wounded':'crouched_idle',time:0,loop:false};}
      if(patient)return {clip:'carried',time:time+offset,loop:true};
      if(this.clips.has('carry_walk')){const duration=this.clips.get('carry_walk').duration,phase=(actor.motion?.odometer??0)/(1.6*duration);
        return {clip:'carry_walk',time:(phase-Math.floor(phase))*duration,loop:true,rate:(actor.motion?.speed??1.6)/1.6};}
    }
    if(actor.posture==='prone'&&!actor.mg34Prone){const age=Math.max(0,time-actor.postureSince),clip=age<1.2?'prone_enter':'prone_idle';
      if(this.clips.has(clip))return {clip,time:age<1.2?age:age-1.2,loop:age>=1.2};
      return {clip:'pinned',time:0,loop:false};}
    if(actor.reload&&this.clips.has('reload_clip'))return {clip:'reload_clip',time:Math.min(3.4,time-actor.reload.startedAt),loop:false};
    if(pose.name==='carried')return {clip:'carried',time:time+offset,loop:true};
    if(pose.name==='wounded')return {clip:'wounded',time:time+offset,loop:true};
    if(pose.name==='seated')return {clip:'seated',time:time+offset,loop:true};
    const patient=actors.find(a=>a.active&&a.carriedBy===actor.id);
    if(patient?.task==='station_wounded')return {clip:this.clips.has('drag_wounded')?'drag_wounded':'pinned',time:time+offset,loop:true};
    if(patient){
      const carryStride=resolveStrideSample(actor,'carry_wounded',time,this.clips);
      return {clip:'carry_wounded',time:carryStride.time,loop:true,stridePhase:carryStride.stridePhase};
    }
    // R3-a: from the call to the retreat the sappers play the clip of the phase of their operation and role (m01-sapper-pose.js); the camp and the retreat keep the rules below.
    if(actor.role==='ENGINEER'&&this.ops){const s=sapperSample(actor,this.ops,time,offset,this.clipView,pose);if(s)return s;}
    if(actor.role==='ENGINEER'&&(actor.crouched||actor.posture==='crouch')){
      const sapperMoving=actor.motion&&actor.motion.gait==='crouch_walk'&&actor.motion.speed>.05&&actor.task!=='repair_bridge'&&actor.state!=='REPAIR';
      if(!sapperMoving){
        // The repair has stopped under fire. Hold the sheltered pose instead of replaying working hands.
        return pose.underFire?{clip:'sapper_work_pinned',time:.8,loop:false}:
          {clip:'sapper_work',time:time+offset,loop:true};
      }
    }
    if(!mgGunner(actor)&&actor.id!=='szymon_kowal'){
      const reaction=resolveCombatReaction(actor,time,pose,this.clips);
      if(reaction)return reaction;
    }
    if(pose.underFire)return {clip:'pinned',time:time+offset,loop:true};
    if(mgGunner(actor)){
      const age=time-actor.firedAt;
      // shot includes 0.06 s of muzzle decay. Cut the seven-shot clip at the real burst length,
      // before any extra recoil; do not invent ammunition, reloads or a prone combat posture.
      if(age>=0&&actor.shot>.06&&age<(this.clips.get('mg34_fire_burst')?.duration??0))
        return {clip:'mg34_fire_burst',time:age,loop:false};
      return {clip:'mg34_aim',time:0,loop:false};
    }
    if(actor.id==='szymon_kowal'){
      const age=time-actor.firedAt,burst=this.clips.get('rkm_fire_burst')?.duration??.8;
      if(Number.isFinite(age)&&age>=0&&age<burst)return {clip:'rkm_fire_burst',time:age,loop:false};
      // The existing simulation refills the magazine and waits five seconds. Presentation samples that same interval.
      const reload=this.clips.get('rkm_reload')?.duration??3.4;
      if(actor.rounds===20&&actor.cooldown>0&&age>=burst&&age<burst+reload)return {clip:'rkm_reload',time:age-burst,loop:false};
      if(kowalCleans(actor,battleClock,pose.moving))return {clip:'rkm_clean',time:time+offset,loop:true};   // R1-b: while the opening has him, the cleaning is one of his acts
      const kGait=resolveLocomotionGait(actor,pose,time);
      if(kGait!=='idle'){
        const kClip=actor.state==='RETREAT'||kGait==='run'||kGait==='sprint'?'rkm_run':'rkm_walk';
        const s=resolveStrideSample(actor,kClip,time,this.clips);
        return {clip:kClip,time:s.time,loop:true,stridePhase:s.stridePhase};
      }
      // T38: kneeling behind the squad-post sandbags (gameplay `crouched`) he is drawn kneeling; he rises to aim and fire (m01-simulation stageSection).
      return {clip:actor.crouched&&this.clips.has('rkm_crouched_idle')?'rkm_crouched_idle':pose.aiming?'rkm_aim':actor.crouched?'rkm_crouched_idle':'rkm_standing_idle',time:time+offset,loop:true};
    }
    // Ordinary soldiers: the pure selection shared with the resolver (bolt, explicit reload, gait/stride, turn, aim, idle).
    return genericCandidate(actor,pose,time,offset,this.clipView);
  }
  create(actor,key,weaponLOD){
    const root=clone(this.sources.get(key).scene),meshes=[];let weaponRoot=null;
    shareSkeletons(root);
    if(mgGunner(actor)){
      weaponRoot=this.sources.get(`mg34:${weaponLOD}`).scene.clone(true);
      root.getObjectByName('weapon').add(weaponRoot);
    }
    const nation=actor.team==='enemy'?'de':'pl',visual=this.visuals?soldierVisualVariant(actor):null,head=visual?.head??named[actor.id]??(nation==='de'?`de_${'abc'[hash(actor.id)%3]}`:'pl_a');
    root.traverse(n=>{
      if(!n.isMesh)return;
      n.visible=n.userData.visible!==false;
      if(n.name.startsWith('head_'))n.visible=n.name===`head_${head}`;
      if(n.name==='helmet_cover_wz31')n.visible=actor.role==='ENGINEER';
      if(n.name==='helmet_wz31')n.visible=actor.role!=='ENGINEER';
      if(n.name==='sapper')n.visible=actor.role==='ENGINEER';
      if(n.name==='nco'||n.name==='rank_sierzant')n.visible=actor.id==='marek_zielinski';
      if(n.name==='rank_kapral')n.visible=actor.id==='pawel_krawiec';
      if(n.name==='rank_st_strzelec')n.visible=actor.id==='szymon_kowal';
      if(actor.civilian&&civilianHidden(n.name))n.visible=false;
      n.frustumCulled=false;n.receiveShadow=true;meshes.push(n);
    });
    if(this.visuals)this.visuals.apply(root,actor,key,visual);
    if(actor.civilian)this.addCivilianProps(root,actor);
    const batch=this.batching?this.batchParts(meshes,actor):{batches:[],loose:meshes.filter(n=>!n.name.startsWith('mg34_')),looseWeapon:meshes.filter(n=>n.name.startsWith('mg34_'))};
    const lantern=actor.civilian&&actor.lantern?root.children.filter(n=>n.name==='civilian_lantern'):null;
    this.scene.add(root);
    const weaponBone=root.getObjectByName('weapon')??null;
    const weapon=weaponRoot?'mg34':actor.id==='szymon_kowal'?'rkm_wz28':actor.id==='jozef_bak'?'wz98a':nation==='pl'?'wz29':'kar98k';
    const profile=soldierProfile(root,nation);
    let spineBone=null,supportArmBone=null;
    for(const name of SPINE_NAMES){const b=root.getObjectByName(name);if(b){spineBone=b;break;}}
    for(const name of SUPPORT_ARM_NAMES){const b=root.getObjectByName(name);if(b?.isBone){supportArmBone=b;break;}}
    const spineBaseQuat=spineBone?.quaternion?spineBone.quaternion.clone():null,spineBaseRotY=spineBone?.rotation?.y??0;
    const armBaseQuat=supportArmBone?.quaternion.clone()??null;
    const v={id:actor.id,root,key,unarmed:unarmedKind(actor),meshes,batches:batch.batches,loose:batch.loose,looseWeapon:batch.looseWeapon,visual,weapon,weaponRoot,weaponLOD,spineBone,spineBaseQuat,spineBaseRotY,lantern,
      supportArmBone,armBaseQuat,
      // Cache the clip-sampled pose BEFORE any additive torso/arm correction,
      // so repeated rendering of the same simulation time is bit-identical.
      spineClipQuat:spineBaseQuat?.clone()??null,armClipQuat:armBaseQuat?.clone()??null,
      muzzle:weaponRoot?MG34_MUZZLE_SOCKET:profile?.weapons?.[weapon]?.muzzle??profile?.sockets?.muzzle??[0,.032,-.765],
      mixer:new THREE.AnimationMixer(root),action:null,clip:null,ikRig:bindCharacterIkRig(root),ik:null,ikApplied:false,
      // Snapshot read by the diagnostics getter (see snapshot()); the entries are built only when someone reads them.
      weaponBone,dMuzzle:[0,0,0],dMuzzleOk:false,dProne:null,dBlend:null,dTime:0,dLoop:false,dIk:false};
    v.player=new AnimationPlayer(v.mixer);
    if(actor.role==='ENGINEER')v.kit=(this.sapperKit??=new SapperKit()).attach(root);   // R3-a: pliers, tester, coil and crate on the bones, hidden until a phase asks for them
    v.okit=(this.openingKit??=new OpeningKit()).attach(root,actor.id);   // R1-b: binoculars, cigarette, mug, map, note, handset and phone, ammunition box, bag, meter and coil, hidden until an act asks for them (null for a man with none)
    v.dAct=null;v.dOpen=false;
    // Reduced pose rate (far actors): while `hold.frozen` the bone-matrix recompute and texture upload of an already uploaded pose are skipped.
    // `serial` counts applied poses, so a pose is always uploaded at least once before any frame may reuse it.
    v.posePhase=animationUnit(animationSeed(actor.id),11);v.appliedTime=-Infinity;v.hold={frozen:false,serial:0};v.view=null;v.sampleClip=null;
    const stats=this.poseStats;
    for(const skeleton of new Set(meshes.filter(n=>n.isSkinnedMesh).map(n=>n.skeleton))){
      let uploaded=-1;const real=skeleton.update;
      skeleton.update=function(){if(v.hold.frozen&&uploaded===v.hold.serial){stats.boneSkips++;return;}uploaded=v.hold.serial;stats.boneUploads++;real.call(this);};
    }
    this.instances.set(actor.id,v);return v;
  }
  /** R8-a: merges the skinned parts that are drawn for good (body, one head, helmet, gear, badges) into one SkinnedMesh and the parts that follow `armed`
   *  (rifle + clip, wz.98a, rkm) into a second one, once, at instantiation. The logical parts stay in `meshes` (name, geometry, material, `visible`) for the
   *  update rules and the diagnostics but move under an invisible holder (not drawn, still found by name); the rkm bipods and rag (own visibility rules, one soldier) and the MG34 kit stay individual meshes. */
  batchParts(meshes,actor){
    const kowal=actor.id==='szymon_kowal',bak=actor.id==='jozef_bak';
    const armedNames=unarmedKind(actor)?NO_NAMES:kowal?KOWAL_ARMED:bak?BAK_ARMED:RIFLE_ARMED;
    const fixed=[],switched=[];
    for(const n of meshes){
      if(!n.isSkinnedMesh||n.name.startsWith('mg34_'))continue;
      if(armedNames.includes(n.name))switched.push(n);
      else if(n.visible&&!weaponParts.has(n.name)||kowal&&n.name==='rkm_pouch')fixed.push(n);
    }
    const merged=batchSoldier(fixed,switched,this.mergeCache,this.visuals),batches=[];
    for(const r of merged.fixed)if(r.merged)batches.push(r);
    for(const r of merged.switched)if(r.merged)batches.push(r);
    // Parts that can never be drawn for this actor (other heads, ranks, rkm kit of everybody but Kowal, rifle of a medic...) join them under the holder.
    if(merged.holder)for(const n of meshes){
      if(!n.isSkinnedMesh||n.parent===merged.holder||n.name.startsWith('mg34_')||fixed.includes(n)||switched.includes(n))continue;
      if(weaponParts.has(n.name)?!kowal:!n.visible)merged.holder.add(n);   // the update loop keeps these false (weapon parts follow `armed` / Kowal only)
    }
    const loose=[],looseWeapon=[];
    for(const n of meshes)if(n.parent!==merged.holder)(n.name.startsWith('mg34_')?looseWeapon:loose).push(n);   // merged parts sit under the invisible holder; the rest keeps its own draw call
    return {batches,loose,looseWeapon};
  }
  /** Meshes handed to the GPU for this instance in its current state: merged batches, remaining individual parts and, when shown, the MG34 kit parts. */
  drawCallsOf(v){
    let n=0;const b=v.batches,l=v.loose,w=v.looseWeapon;
    for(let i=0;i<b.length;i++)if(b[i].mesh.visible)n++;
    for(let i=0;i<l.length;i++)if(l[i].visible)n++;
    if(v.weaponRoot?.visible)for(let i=0;i<w.length;i++)if(w[i].visible)n++;
    return n;
  }
  // Station-yard props of the civilians that the procedural body used to draw (hand lantern, aid armband), on the rig's own bones so they follow the clip.
  // Geometry/materials are shared by every civilian and owned by this instance (disposed in dispose()).
  civilianKit(){
    return this._civilianKit??={lantern:new THREE.BoxGeometry(.06,.2,.06),glow:new THREE.BoxGeometry(.105,.11,.105),band:new THREE.CylinderGeometry(.058,.058,.07,12,1,true),stripe:new THREE.CylinderGeometry(.061,.061,.02,12,1,true),
      iron:new THREE.MeshStandardMaterial({color:'#242824',roughness:.8}),flame:new THREE.MeshBasicMaterial({color:'#ffc778',toneMapped:false,fog:false}),
      cloth:new THREE.MeshStandardMaterial({color:'#dfd8c8',roughness:.9,side:THREE.DoubleSide}),red:new THREE.MeshStandardMaterial({color:'#914539',roughness:.9,side:THREE.DoubleSide})};
  }
  addCivilianProps(root,actor){
    const kit=this.civilianKit();
    if(actor.lantern){
      // Carried at the right side, clear of the torso. It hangs from the root rather than a bone: the clips move the fist, and a bone-parented lantern
      // ends up inside the chest in the idle and walk poses. Root space: +x is the soldier's right, -z forward.
      const body=new THREE.Mesh(kit.lantern,kit.iron),glow=new THREE.Mesh(kit.glow,kit.flame);
      body.position.set(.33,.8,-.1);glow.position.copy(body.position);body.name=glow.name='civilian_lantern';body.frustumCulled=glow.frustumCulled=false;root.add(body,glow);
    }
    if(actor.role==='MEDIC'){
      const arm=root.getObjectByName('upperarm_l'),forearm=arm?.getObjectByName('lowerarm_l');
      if(arm&&forearm){
        const dir=forearm.position.clone(),at=dir.clone().multiplyScalar(.45),q=new THREE.Quaternion().setFromUnitVectors(UP_AXIS,dir.normalize());
        for(const [geometry,material]of [[kit.band,kit.cloth],[kit.stripe,kit.red]]){const m=new THREE.Mesh(geometry,material);m.position.copy(at);m.quaternion.copy(q);m.name='civilian_armband';m.frustumCulled=false;arm.add(m);}
      }
    }
  }
  release(v){
    v.root.removeFromParent();v.player.dispose();
    const skeletons=new Set(v.meshes.filter(n=>n.isSkinnedMesh).map(n=>n.skeleton));
    skeletons.forEach(s=>s.dispose());
    // Geometry, materials and atlases belong to the source cache, shared by all clones/LODs.
  }
  update(actors,time,player,quality='low',battleClock,world=this.world,ops=null){
    this.ops=ops;   // R3-a: the sappers' operation (sim.sapperOps), null for a caller that has none
    const limits=LIMITS[quality]??LIMITS.low,preset=LIMITS[quality]?quality:'low';
    const ikOn=this.ikEnabled&&Boolean(world);let ikCount=0;
    if(quality==='high')this.requestHighSources();
    this.updateCKM(actors,time,player,quality);
    const selected=new Set(),visible=[],clips={},bands=[0,0,0];let submitted=0,drawCalls=0;
    this.carriers.clear();for(let i=0;i<actors.length;i++)if(actors[i].carriedBy)this.carriers.add(actors[i].carriedBy);
    const availableMG=[0,1,2].some(l=>this.sources.has(`mg34:${l}`))&&this.clips.has('mg34_aim')&&this.clips.has('mg34_fire_burst');
    // Candidates live in a reused record pool and array (no filter/map/slice chain per frame); the sort is in place.
    const cands=this.cands,pool=this.candPool;cands.length=0;
    for(let i=0;i<actors.length;i++){
      const a=actors[i];
      if(!(a.active&&(!a.civilian||dressedCivilian(a))&&(a.role!=='SUPPORT'||a.id==='szymon_kowal'||mgGunner(a)&&availableMG||ckmRole(a))))continue;
      const d=Math.hypot(a.x-player.x,a.z-player.z);
      if(!(mgCrew(a)?d<1800:selectConsumerLod('actors',d,preset,instanceLod(this.instances.get(a.id)))<3))continue;
      const rec=pool[cands.length]??={a:null,d:0};rec.a=a;rec.d=d;cands.push(rec);
    }
    // Reserve the two real fire sources and their linked loaders within the existing 18/24/28 actor budget.
    cands.sort(byCandidate);const candidateCount=Math.min(cands.length,limits.count);
    if(this.clips.size)for(let ci=0;ci<candidateCount;ci++){
      const {a,d}=cands[ci];
      const nation=a.team==='enemy'?'de':'pl';
      const prevInst=this.instances.get(a.id);
      if(prevInst?.lantern)setLantern(prevInst,a);
      const lod=resolveLodWithHysteresis(d,limits,prevInst?.key,nation,quality,this.sources);
      if(lod===3)continue;
      let weaponLOD=lod;
      if(mgGunner(a)){while(weaponLOD<3&&!this.sources.has(`mg34:${weaponLOD}`))weaponLOD++;if(weaponLOD===3)continue;}
      // Distant actors re-pose at a reduced rate (staggered by actor); a held actor keeps its last pose, root transform and bone upload.
      if(prevInst&&prevInst.key===`${nation}:${lod}`&&this.poseHeld(prevInst,a,d,time,quality,ikOn)){
        selected.add(a.id);bands[lod]++;prevInst.hold.frozen=true;this.poseStats.held++;
        for(let i=0;i<prevInst.meshes.length;i++)if(prevInst.meshes[i].visible)submitted++;if(prevInst.weaponRoot?.visible)submitted++;
        drawCalls+=this.drawCallsOf(prevInst);
        clips[prevInst.sampleClip]=(clips[prevInst.sampleClip]??0)+1;visible.push(prevInst);continue;
      }
      const key=`${nation}:${lod}`,pose=actorPose(a,time),pv=this.anim.get(a.id),
        sample=this.describe(a,time,actors,pose,battleClock,pv&&time>=pv.t&&time-pv.t<=GAP?pv.target:undefined),clip=this.clips.get(sample.clip);
      if(!clip)continue;
      if(a.id==='szymon_kowal'&&!this.sources.get(key).scene.getObjectByName('rkm_wz28'))continue;
      // Missing or partial optional clips use the existing procedural batches, sampled from the same posture.
      if(mgGunner(a)&&a.alive&&a.mg34Prone&&a.mg34Prone.phase!=='standing'&&!this.hasProne())continue;
      if(mgLoader(a)&&a.alive&&!this.clips.has(`mg34_loader_prone_${a.mg34Loader.phase}`))continue;
      let v=prevInst;
      // A new LOD gets new actions but keeps the actor's blend record (this.anim), so a fade survives the swap.
      if(v&&(v.key!==key||mgGunner(a)&&v.weaponLOD!==weaponLOD||v.unarmed!==unarmedKind(a))){this.release(v);this.instances.delete(a.id);v=null;}
      if(prevInst&&prevInst.key!==key){this.lodSwitches++;tallyLod(this.lodCounters,preset,lod);}   // a camera-driven band change (first appearance is not a switch)
      v??=this.create(a,key,weaponLOD);if(v.lantern)setLantern(v,a);selected.add(a.id);bands[lod]++;
      v.hold.frozen=false;v.hold.serial++;v.appliedTime=time;v.appliedX=a.x;v.appliedZ=a.z;v.appliedQuality=quality;v.appliedIk=ikOn;this.poseStats.applied++;
      // Undo last frame's IK first: the mixer only rewrites a track whose value changed, and the caches below hold the clip pose.
      if(v.ikApplied){restoreIkPose(v.ikRig);v.ikApplied=false;}
      // Specialist animated rigs (CKM, prone MG34, station drag) keep their authored pose: the torso twist and support-arm hint
      // never touch their root orientation or spine bones. Their clips are exact in the resolver: one layer, no cross-fade.
      const specialist=/^(ckm_wz30_|mg34_prone_|station_drag_|drag_wounded$)/.test(sample.clip);
      // Remove last frame's additive rotations before AnimationMixer samples.
      // Restoring the original bind pose loses untracked clip bones and caused
      // ckm_reserve spine drift even with a paused/frozen simulation clock.
      if(v.spineBone&&v.spineClipQuat)v.spineBone.quaternion.copy(v.spineClipQuat);
      if(v.supportArmBone&&v.armClipQuat)v.supportArmBone.quaternion.copy(v.armClipQuat);
      const orientation=specialist?null:resolveTorsoOrientation(a,pose);
      const useSpineTwist=Boolean(orientation&&v.spineBone&&orientation.torsoTwist!==0);
      const appliedRootYaw=specialist?a.facing:useSpineTwist?orientation.rootYaw:orientation.facing;
      // Always return a previously attached wounded actor to scene before sampling an updated carrier.
      this.scene.add(v.root);v.root.visible=true;
      v.root.position.set(a.x,a.y??0,a.z);
      v.root.rotation.set(0,-appliedRootYaw-Math.PI/2,0);
      // Pure resolver -> clip stack with weights (cross-fades from sim time); the player writes it to persistent actions.
      // `alt` is one reused callback that reads this per-actor context (no closure per actor per frame).
      this.altActors=actors;this.altTime=time;this.altClock=battleClock;this.altActor=a;
      const plan=resolveAnimation({actor:a,time,candidate:sample,prev:this.anim.get(a.id),alt:this.altDescribe});
      this.altActors=this.altActor=null;
      const fade=a.mg34Prone?.fade;
      if(a.alive&&fade&&time>=fade.startedAt&&time<fade.startedAt+.2&&this.clips.has('mg34_prone_fire_burst')){
        const u=(time-fade.startedAt)/.2,w=u*u*(3-2*u);
        plan.blend=[{clip:'mg34_prone_fire_burst',time:fade.rounds*.075,weight:1-w,loop:false},
          {clip:sample.clip,time:sample.time,weight:w,loop:sample.loop,target:true}];
      }
      this.anim.set(a.id,plan.state);
      // Layers for the player: reused records (apply() reads them immediately and keeps none).
      const layers=this.layers,planBlend=plan.blend;let layerCount=0;
      for(let i=0;i<planBlend.length;i++){
        const b=planBlend[i],c=this.clips.get(b.clip);if(!c)continue;
        const layer=this.layerPool[layerCount]??={clip:null,time:0,weight:0,loop:false,target:false};
        layer.clip=c;layer.time=b.time;layer.weight=b.weight;layer.loop=b.loop;layer.target=Boolean(b.target);layers[layerCount++]=layer;
      }
      layers.length=layerCount;
      v.player.apply(layers);
      if(v.kit)this.sapperKit.sync(v.kit,this.ops?.roles?.[a.id],this.ops);
      if(v.okit)this.openingKit.sync(v.okit,openingProps(a,time),time);   // R1-b: the props of the act the man is in
      v.action=v.player.target;v.clip=plan.clip;
      // Cache the clip-sampled pose BEFORE any additive torso/arm correction, so a repeated sim time is bit-identical.
      if(v.spineBone&&v.spineClipQuat)v.spineClipQuat.copy(v.spineBone.quaternion);
      if(v.supportArmBone&&v.armClipQuat)v.armClipQuat.copy(v.supportArmBone.quaternion);
      if(useSpineTwist){
        v.spineBone.quaternion.multiply(_twist.setFromAxisAngle(UP_AXIS,-orientation.torsoTwist));
      }
      if(!specialist&&v.supportArmBone){
        const hint=resolveSupportHandIK(a,pose,orientation,sample);
        if(hint.active&&Math.abs(hint.shoulderYaw)>.001){
          // Approximate upper-arm correction; combat facing and weapon muzzle stay untouched.
          v.supportArmBone.quaternion.multiply(_twist.setFromAxisAngle(UP_AXIS,hint.shoulderYaw));
        }
      }
      const meshes=v.meshes,proneUp=a.mg34Prone&&a.mg34Prone.phase!=='standing'&&this.hasProne();
      // (R1-b: an act that puts both hands to work slings the rifle: its mesh is not drawn while the act lasts)
      const armed=a.alive&&a.state!=='WOUNDED'&&!a.carriedBy&&a.role!=='MEDIC'&&!a.civilian&&!mgCrew(a)&&!(ckmAtPost(a)&&this.hasCKM())&&!(a.act&&HANDS_BUSY.has(a.act.k)),
        kowal=a.id==='szymon_kowal',bak=a.id==='jozef_bak',bipod=clip.userData?.bipod??'folded',castShadow=quality!=='low'&&d<35;
      for(let i=0;i<meshes.length;i++){
        const n=meshes[i];
        n.castShadow=castShadow;
        if(n.name==='mg34_bipod_open')n.visible=Boolean(a.alive&&proneUp);
        if(!weaponParts.has(n.name))continue;
        n.visible=n.name==='rifle'?armed&&!kowal&&!bak:n.name==='clip'?armed&&!kowal:
          n.name==='rifle_wz98a'?armed&&bak:n.name==='rkm_wz28'?armed&&kowal:
          n.name==='rkm_pouch'?kowal:n.name==='rag'?armed&&kowal&&sample.clip==='rkm_clean':
          armed&&kowal&&n.name===`rkm_bipod_${bipod}`;
      }
      if(v.weaponRoot)v.weaponRoot.visible=a.alive&&a.state!=='WOUNDED'&&!a.carriedBy;
      // Merged batches: a batch is drawn when any of its logical parts is, and casts a shadow like its parts (all decided above).
      for(let i=0;i<v.batches.length;i++){
        const b=v.batches[i],parts=b.parts;let any=false;
        for(let k=0;k<parts.length;k++)if(parts[k].visible){any=true;break;}
        b.mesh.visible=any;b.mesh.castShadow=castShadow;
      }
      drawCalls+=this.drawCallsOf(v);
      for(let i=0;i<meshes.length;i++)if(meshes[i].visible)submitted++;if(v.weaponRoot?.visible)submitted++;   // meshes handed to the GPU this frame
      v.root.updateMatrixWorld(true);clips[sample.clip]=(clips[sample.clip]??0)+1;v.sampleClip=sample.clip;
      // Diagnostics snapshot of this applied pose; the entry itself is built by the stats getter. The muzzle is taken here, before IK moves the bones.
      v.dBlend=plan.blend;v.dTime=v.action.time;v.dLoop=sample.loop;v.dIk=ikOn;v.dMuzzleOk=Boolean(v.weaponBone);
      if(v.weaponBone){_muzzle.fromArray(v.muzzle).applyMatrix4(v.weaponBone.matrixWorld);v.dMuzzle[0]=_muzzle.x;v.dMuzzle[1]=_muzzle.y;v.dMuzzle[2]=_muzzle.z;}
      v.dProne=(mgGunner(a)&&a.mg34Prone)?{phase:a.mg34Prone.phase,startedAt:a.mg34Prone.startedAt,progress:a.mg34Prone.progress,rounds:a.mg34Prone.burst?.rounds??0,emitted:a.mg34Prone.burst?.emitted??0,shot:a.shot,firedAt:a.firedAt,eye:eyePosition(a),hitboxes:actorHitboxes(a),muzzle:muzzlePosition(a,time)}:null;
      visible.push(v);
      if(ikOn){const e=this.ikEntries[ikCount]??={actor:null,inst:null,distance:0,view:null};e.actor=a;e.inst=v;e.distance=d;e.view=null;ikCount++;}
      v.dAct=a.act?.k??null;v.dOpen=false;
      if(ikOn&&a.act&&d<=OPEN_IK_M[preset]&&this.openList.length<OPEN_IK_MAX){v.openActor=a;this.openList.push(v);}   // R1-b: the procedural pose of the act, after the foot IK below
    }
    // Foot IK, ramp lean and hand pin run after every clip/additive correction, on the already sampled pose of the selected actors.
    if(ikOn){updateActorsIk(this.ikEntries,ikCount,quality,time,world,this.ikState,this.ikMeasure);for(let i=0;i<ikCount;i++){const e=this.ikEntries[i];e.actor=e.inst=e.view=null;}}
    else this.ikState.recordDisabled(selected.size,quality);
    // R1-b: the lean, the head and the hands of the opening acts, on top of the clip and the foot IK; captured first (when the IK pass has not) so that the next frame's restoreIkPose undoes it.
    if(this.openList.length){
      for(let i=0;i<this.openList.length;i++){
        const v=this.openList[i],a=v.openActor,spec=a?openingPose(a,time):null;v.openActor=null;
        if(spec){if(!v.ikApplied){captureIkPose(v.ikRig);v.ikApplied=true;}v.dOpen=applyOpeningPose(v,spec);}
      }
      this.openList.length=0;
    }
    for(let ci=0;ci<candidateCount;ci++){
      const a=cands[ci].a;
      if(selected.has(a.id)&&a.carriedBy&&a.task!=='station_wounded'&&(!a.carry||a.carry.phase==='carry')&&selected.has(a.carriedBy)){
        const v=this.instances.get(a.id),socket=this.instances.get(a.carriedBy).root.getObjectByName('carry_socket');
        socket.add(v.root);v.root.position.set(0,0,0);v.root.rotation.set(0,0,0);v.root.updateMatrixWorld(true);
      }
    }
    for(let i=0;i<cands.length;i++)cands[i].a=null;cands.length=0;   // do not keep the actor records alive between frames
    for(const [id,v]of this.instances)if(!selected.has(id)){this.release(v);this.instances.delete(id);}
    // A record older than GAP (or from a later clock after a load) would be reset anyway: drop it.
    for(const [id,r]of this.anim)if(!(time>=r.t&&time-r.t<=GAP))this.anim.delete(id);
    this.lastUpdateTime=time;
    // `actors` (the per-actor diagnostics entries) is built on first read from the snapshots stored on the instances above.
    let built=null;const chars=this;
    this.stats={poseUpdates:this.poseStats.applied,heldPoses:this.poseStats.held,boneUploads:this.poseStats.boneUploads,boneSkips:this.poseStats.boneSkips,active:selected.size,limit:limits.count,instances:this.instances.size,clips,
      get actors(){return built??=chars.diagnosticsViews(visible);},
      lodPreset:preset,lodBands:bands,submittedMeshes:submitted,submittedDrawCalls:drawCalls,lodSwitches:this.lodSwitches,
      lodCounters:{low:lodCounterTotals(this.lodCounters,'low'),medium:lodCounterTotals(this.lodCounters,'medium'),high:lodCounterTotals(this.lodCounters,'high')}};
    return selected;
  }
  /** Diagnostics entries of the instances drawn by one update: same fields and values as the former eagerly built `stats.actors`. */
  diagnosticsViews(instances){
    const out=new Array(instances.length);
    for(let i=0;i<instances.length;i++)out[i]=this.diagnosticsView(instances[i]);
    return out;
  }
  diagnosticsView(v){
    const blend=v.dBlend;let fading=null;
    for(let i=0;i<blend.length;i++){const b=blend[i];if(!b.target&&(!fading||b.weight>fading.weight))fading=b;}
    const weaponMeshes=[];
    for(let i=0;i<v.meshes.length;i++){const n=v.meshes[i];if(weaponParts.has(n.name)&&n.visible||n.name.startsWith('mg34_')&&n.visible&&v.weaponRoot?.visible)weaponMeshes.push(n.name);}
    const entry={...(v.dProne?{prone:v.dProne}:{}),
      id:v.id,lod:instanceLod(v),key:v.key,visual:v.visual,clip:v.sampleClip,clipTime:v.dTime,loop:v.dLoop,blend:blend.map(({clip,weight,time})=>({clip,weight,time})),
      // Strongest outgoing layer of the cross-fade actually drawn (diagnostics only).
      ...(fading?{blendClip:fading.clip,blendWeight:fading.weight}:{}),
      weapon:v.weapon,weaponLOD:v.weaponLOD,muzzle:v.dMuzzleOk?[v.dMuzzle[0],v.dMuzzle[1],v.dMuzzle[2]]:undefined,weaponMeshes};
    if(v.dIk&&v.ik)entry.ik=v.ik;   // the live per-actor IK record, as before
    if(v.dAct){const props=[];if(v.okit)for(const k in v.okit)if(v.okit[k].visible)props.push(k);entry.opening={act:v.dAct,pose:v.dOpen,props};}   // R1-b: the act drawn, whether its procedural pose was applied, and the props shown
    return entry;
  }
  /** True when this far instance keeps its previous pose this frame. Never for carried/carrying actors, MG34/CKM crews, the prone MG34 gunner and
   *  its loader (their rigs are attached or authored per phase). A repeated update at the same clock (pause, second render) refreshes any stale pose. */
  poseHeld(v,a,distance,time,quality,ikOn){
    const quantum=actorPoseQuantum(distance);
    if(v.appliedQuality!==quality||v.appliedIk!==ikOn)return false;   // a quality tier / IK switch changes the pose pipeline: re-pose at once
    if(!(quantum>0)||a.carriedBy||this.carriers.has(a.id)||mgCrew(a)||ckmRole(a)||a.mg34Prone||a.mg34Loader)return false;
    if(Math.abs(a.x-v.appliedX)+Math.abs(a.z-v.appliedZ)>POSE_HOLD_MAX_DRIFT_M)return false;   // teleport / restore to the same clock: re-pose at once
    if(time===v.appliedTime)return true;
    if(time===this.lastUpdateTime)return false;
    return !actorPoseDue(time,v.appliedTime,quantum,v.posePhase*quantum);
  }
  updateCKM(actors,time,player,quality){
    // R4 INC-1: a new act places its own gun (gunner.ckm.root / yaw, M01AreaSimulation); the current act's record has neither, so its gun stays at CKM_POSITION facing east.
    const gunner=actors.find(a=>a.id==='ckm_gunner'),at=gunner?.ckm?.root??CKM_POSITION,yaw=Number.isFinite(gunner?.ckm?.yaw)?gunner.ckm.yaw:-Math.PI/2,d=Math.hypot(player.x-at.x,player.z-at.z);
    if(!gunner?.ckm?.visible||!this.hasCKM()||d>(LIMITS[quality]??LIMITS.low).far){
      if(this.ckm)this.ckm.root.visible=false;return;
    }
    let lod=quality==='high'&&d<14?0:quality==='high'&&d<45?1:2;
    while(lod<3&&!this.sources.has(`ckm:${lod}`))lod++;
    if(lod===3)return;
    if(this.ckm?.lod!==lod){
      if(this.ckm){this.ckm.root.removeFromParent();this.ckm.mixer.stopAllAction();this.ckm.mixer.uncacheRoot(this.ckm.root);}
      const source=this.sources.get(`ckm:${lod}`),root=source.scene.clone(true);
      this.scene.add(root);this.ckm={root,lod,mixer:new THREE.AnimationMixer(root),clips:source.animations};
    }
    const v=this.ckm,drawn=ckmClipPhase(gunner.ckm,time),phase=['idle','aim','fire_burst','feed'].includes(drawn.phase)?drawn.phase:'abandon',clip=v.clips.find(c=>c.name===`ckm_wz30_gun_${phase}`)??v.clips.find(c=>c.name==='ckm_wz30_gun_idle');
    if(!clip){v.root.visible=false;return;}
    v.root.visible=true;v.root.position.set(at.x,at.y,at.z);v.root.rotation.y=yaw;
    v.mixer.stopAllAction();const action=v.mixer.clipAction(clip).setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.reset().play();
    const age=gunner.ckm.phase==='retreat'?clip.duration:drawn.time;
    v.mixer.setTime(phase==='idle'?age%clip.duration:Math.min(age,clip.duration));v.clip=clip.name;v.time=action.time;v.root.updateMatrixWorld(true);
  }
  muzzle(id){
    const v=this.instances.get(id),bone=v?.root.getObjectByName('weapon');if(!bone)return null;
    v.root.updateMatrixWorld(true);return new THREE.Vector3().fromArray(v.muzzle).applyMatrix4(bone.matrixWorld);
  }
  get diagnostics(){return {...this.stats,ik:formatIkDiagnostics(this.ikState,this.ikEnabled),visuals:this.visuals?.diagnostics??null,proneAvailable:this.hasProne(),ckm:this.ckm?{visible:this.ckm.root.visible,lod:this.ckm.lod,clip:this.ckm.clip,time:this.ckm.time,position:this.ckm.root.position.toArray()}:null,loaded:[...this.sources.keys()],failures:this.assets.failures};}
  dispose(){this.disposed=true;if(this.ckm){this.ckm.root.removeFromParent();this.ckm.mixer.stopAllAction();this.ckm.mixer.uncacheRoot(this.ckm.root);}this.instances.forEach(v=>this.release(v));this.instances.clear();this.anim.clear();if(this._civilianKit){for(const o of Object.values(this._civilianKit))o.dispose();this._civilianKit=null;}this.visuals?.dispose();this.mergeCache.dispose();this.sapperKit?.dispose();this.openingKit?.dispose();this.assets.dispose();
    if(typeof window!=='undefined'&&this.ikDebug&&window.m01CharacterIkDebug===this.ikDebug)delete window.m01CharacterIkDebug;}
}
