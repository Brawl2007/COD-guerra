import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { AssetManager } from '../assets/asset-manager.js';
import { actorPose } from './m01-actor-pose.js';
import {SoldierVisualVariations,soldierVisualVariant} from './m01-soldier-variation.js';
import { CKM_POSITION } from '../game/m01-simulation.js';
import {mg34ProneSample,MG34_MUZZLE_SOCKET,eyePosition,actorHitboxes,muzzlePosition} from '../world/spatial.js';
import {
  actorHash as hash,
  resolveAvailableClip,
  resolveCombatReaction,
  resolveLocomotionGait,
  resolveLodWithHysteresis,
  resolveStrideSample,
  resolveTorsoOrientation,
  resolveTransitionBlend,
  resolveTurnClip
} from './m01-animation-resolver.js';

const BASE='assets/models/provisional/m01/characters/';
const MG='assets/models/provisional/m01/weapons/mg34/';
const MG_PRONE='assets/models/provisional/m01/weapons/mg34-prone/';
const PRONE_CLIPS=['enter','idle','aim','fire_burst','exit'].map(n=>`mg34_prone_${n}`);
const CKM='assets/models/provisional/m01/weapons/ckm_wz30/';
const ckmRole=a=>a.group==='grp_ckm_crew'&&['ckm_gunner','ckm_loader'].includes(a.id);
const ckmAtPost=a=>ckmRole(a)&&a.ckm?.phase!=='retreat';
const LIMITS={low:{count:18,near:0,middle:15,far:100},medium:{count:24,near:0,middle:40,far:130},high:{count:28,near:14,middle:45,far:160}};
const named={marek_zielinski:'zielinski',pawel_krawiec:'krawiec',tadeusz_nowicki:'nowicki',jozef_bak:'bak',szymon_kowal:'kowal',leon_dudek:'dudek'};
const weaponParts=new Set(['rifle','clip','rifle_wz98a','rkm_wz28','rkm_bipod_open','rkm_bipod_folded','rkm_pouch','rag']);
const mgGunner=a=>a.team==='enemy'&&a.weapon==='mg34'&&['de_east_0','de_east_1'].includes(a.id);
const stationClips=['station_drag_medic_grab','station_drag_patient_grab','station_drag_medic_release','station_drag_patient_release','drag_wounded','crouched_idle','wounded'];
const SPINE_NAMES=['spine_02','spine_01','spine','chest','Spine2','Spine1','Spine'];
const UP_AXIS=new THREE.Vector3(0,1,0);

// Presentation only. Playback is sampled from the saved mission clock; no renderer timers enter saves.
export class M01Characters {
  constructor(scene,{visualVariation=true}={}){
    this.visuals=visualVariation?new SoldierVisualVariations():null;
    this.scene=scene;this.assets=new AssetManager();this.sources=new Map();this.pending=new Set();
    this.instances=new Map();this.clips=new Map();this.revision=0;this.disposed=false;this.stats={};
  }
  async load(quality='low'){
    await Promise.allSettled([
      this.assets.load('m01-clips',BASE+'m01_soldier_animations.glb').then(g=>{
        if(!this.disposed){g.animations.forEach(c=>this.clips.set(c.name,c));this.revision++;}
      }),
      // Six original motion clips live in a separate GLB in the V7 asset library.
      // Loading only the original animations GLB would silently fall back for all six.
      this.assets.load('m01-motion-clips',BASE+'motion-clips-v1/m01_soldier_motion_clips.glb').then(g=>{
        if(!this.disposed){g.animations.forEach(c=>this.clips.set(c.name,c));this.revision++;}
      }),
      this.assets.load('m01-station-clips',BASE+'m01_station_animations.glb').then(g=>{
        if(!this.disposed){g.animations.forEach(c=>this.clips.set(c.name,c));this.revision++;}
      }),
      this.assets.load('m01-station-transitions',BASE+'station-drag-transitions/m01_station_drag_transitions.glb').then(g=>{
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
    return this.clips.has('standing_idle')&&[0,1,2].some(l=>this.sources.has(`ckm:${l}`))&&['idle','abandon'].every(phase=>
      this.sources.get('ckm:2')?.animations.some(c=>c.name===`ckm_wz30_gun_${phase}`)&&
      ['gunner','loader'].every(role=>this.clips.has(`ckm_wz30_${role}_${phase}`)));
  }
  sample(actor,time,actors=[],pose=actorPose(actor,time),battleClock){
    const offset=(hash(actor.id)%1000)/250;
    if(pose.name==='fallen')return {clip:'fallen',time:Number.isFinite(actor.diedAt)&&time>=actor.diedAt?Math.min(1.4,time-actor.diedAt):1.4,loop:false};
    const prone=mg34ProneSample(actor,time);
    if(prone&&actor.mg34Prone.phase!=='standing'&&this.hasProne())return {clip:prone.clip,time:prone.time,loop:false};
    if(ckmAtPost(actor)&&this.hasCKM()&&!['wounded','carried'].includes(pose.name)){
      const phase=actor.ckm.phase,role=actor.id==='ckm_gunner'?'gunner':'loader';
      return {clip:`ckm_wz30_${role}_${phase}`,time:Math.max(0,time-actor.ckm.startedAt),loop:phase==='idle'};
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
    if(pose.name==='carried')return {clip:'carried',time:time+offset,loop:true};
    if(pose.name==='wounded')return {clip:'wounded',time:time+offset,loop:true};
    if(pose.name==='seated')return {clip:'seated',time:time+offset,loop:true};
    const patient=actors.find(a=>a.active&&a.carriedBy===actor.id);
    if(patient?.task==='station_wounded')return {clip:this.clips.has('drag_wounded')?'drag_wounded':'pinned',time:time+offset,loop:true};
    if(patient){
      const carryStride=resolveStrideSample(actor,'carry_wounded',time,this.clips);
      return {clip:'carry_wounded',time:carryStride.time,loop:true,stridePhase:carryStride.stridePhase};
    }
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
      if(battleClock<4*3600+33*60+10&&!Number.isFinite(actor.firedAt)&&!pose.moving)return {clip:'rkm_clean',time:time+offset,loop:true};
      const kGait=resolveLocomotionGait(actor,pose);
      if(kGait!=='idle'){
        const kClip=actor.state==='RETREAT'||kGait==='run'||kGait==='sprint'?'rkm_run':'rkm_walk';
        const s=resolveStrideSample(actor,kClip,time,this.clips);
        return {clip:kClip,time:s.time,loop:true,stridePhase:s.stridePhase};
      }
      return {clip:pose.aiming?'rkm_aim':actor.crouched?'rkm_crouched_idle':'rkm_standing_idle',time:time+offset,loop:true};
    }
    const fireAge=time-actor.firedAt,boltDuration=this.clips.get('fire_bolt')?.duration??1.17;
    if(pose.aiming&&Number.isFinite(fireAge)&&fireAge>=0&&fireAge<boltDuration)
      return {clip:'fire_bolt',time:fireAge,loop:false};
    if((actor.reloading||actor.state==='RELOAD_CLIP')&&(!this.clips.size||this.clips.has('reload_clip'))){
      const reloadDur=this.clips.get('reload_clip')?.duration??3.4;
      const reloadTime=typeof actor.reloadProgress==='function'?actor.reloadProgress()*reloadDur:(time+offset)%reloadDur;
      return {clip:'reload_clip',time:reloadTime,loop:false};
    }
    const gait=resolveLocomotionGait(actor,pose);
    if(gait!=='idle'){
      const preferred=gait==='crouch_walk'?'crouch_walk':gait==='sprint'?'sprint':gait==='run'?'run':'walk';
      const clipName=resolveAvailableClip(preferred,this.clips);
      const stride=resolveStrideSample(actor,clipName,time,this.clips);
      const primary={clip:clipName,time:stride.time,loop:true,stridePhase:stride.stridePhase,strideSynced:stride.strideSynced};
      const transition=resolveTransitionBlend(actor,pose,primary,time,this.clips);
      return transition?{...primary,...transition}:primary;
    }
    const orientation=resolveTorsoOrientation(actor,pose);
    const turn=resolveTurnClip(actor,pose,orientation.yawDelta,this.clips);
    if(turn)return turn;
    if(pose.aiming){
      const primary={clip:'aim',time:time+offset,loop:true};
      const transition=resolveTransitionBlend(actor,pose,primary,time,this.clips);
      return transition?{...primary,...transition}:primary;
    }
    const idleClip=actor.crouched||actor.posture==='crouch'?
      resolveAvailableClip('crouched_idle',this.clips):resolveAvailableClip('standing_idle',this.clips);
    const primary={clip:idleClip,time:time+offset,loop:true};
    const transition=resolveTransitionBlend(actor,pose,primary,time,this.clips);
    return transition?{...primary,...transition}:primary;
  }
  create(actor,key,weaponLOD){
    const root=clone(this.sources.get(key).scene),meshes=[];let weaponRoot=null;
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
      n.frustumCulled=false;n.receiveShadow=true;meshes.push(n);
    });
    if(this.visuals)this.visuals.apply(root,actor,key,visual);
    this.scene.add(root);
    const weapon=weaponRoot?'mg34':actor.id==='szymon_kowal'?'rkm_wz28':actor.id==='jozef_bak'?'wz98a':nation==='pl'?'wz29':'kar98k';
    const profile=root.getObjectByName(`m01_soldier_${nation}`)?.userData;
    let spineBone=null;
    for(const name of SPINE_NAMES){const b=root.getObjectByName(name);if(b){spineBone=b;break;}}
    const spineBaseQuat=spineBone?.quaternion?spineBone.quaternion.clone():null,spineBaseRotY=spineBone?.rotation?.y??0;
    const v={root,key,meshes,visual,weapon,weaponRoot,weaponLOD,spineBone,spineBaseQuat,spineBaseRotY,
      muzzle:weaponRoot?MG34_MUZZLE_SOCKET:profile?.weapons?.[weapon]?.muzzle??profile?.sockets?.muzzle??[0,.032,-.765],
      mixer:new THREE.AnimationMixer(root),action:null,blendAction:null,clip:null,blendClip:null};
    this.instances.set(actor.id,v);return v;
  }
  release(v){
    v.root.removeFromParent();v.mixer.stopAllAction();v.mixer.uncacheRoot(v.root);
    const skeletons=new Set(v.meshes.filter(n=>n.isSkinnedMesh).map(n=>n.skeleton));
    skeletons.forEach(s=>s.dispose());
    // Geometry, materials and atlases belong to the source cache, shared by all clones/LODs.
  }
  update(actors,time,player,quality='low',battleClock){
    const limits=LIMITS[quality]??LIMITS.low;
    if(quality==='high')for(const k of ['pl:0','de:0','de:1'])void this.loadSource(k);
    if(quality==='high')for(const lod of [0,1]){void this.loadMG(lod);void this.loadCKM(lod);}
    this.updateCKM(actors,time,player,quality);
    const selected=new Set(),visible=[],clips={};
    const availableMG=[0,1,2].some(l=>this.sources.has(`mg34:${l}`))&&this.clips.has('mg34_aim')&&this.clips.has('mg34_fire_burst');
    const candidates=actors.filter(a=>a.active&&!a.civilian&&(a.role!=='SUPPORT'||a.id==='szymon_kowal'||mgGunner(a)&&availableMG||ckmRole(a)))
      .map(a=>({a,d:Math.hypot(a.x-player.x,a.z-player.z)})).filter(p=>p.d<(mgGunner(p.a)?1800:limits.far))
      // Reserve two existing fire sources within the same 18/24/28 actor budget, including from the west bank.
      .sort((a,b)=>Number(mgGunner(b.a))-Number(mgGunner(a.a))||a.d-b.d||a.a.id.localeCompare(b.a.id)).slice(0,limits.count);
    if(this.clips.size)for(const {a,d}of candidates){
      const nation=a.team==='enemy'?'de':'pl';
      const prevInst=this.instances.get(a.id);
      const lod=resolveLodWithHysteresis(d,limits,prevInst?.key,nation,quality,this.sources);
      if(lod===3)continue;
      let weaponLOD=lod;
      if(mgGunner(a)){while(weaponLOD<3&&!this.sources.has(`mg34:${weaponLOD}`))weaponLOD++;if(weaponLOD===3)continue;}
      const key=`${nation}:${lod}`,pose=actorPose(a,time),sample=this.sample(a,time,actors,pose,battleClock),clip=this.clips.get(sample.clip);
      if(!clip)continue;
      if(a.id==='szymon_kowal'&&!this.sources.get(key).scene.getObjectByName('rkm_wz28'))continue;
      // Missing or partial optional clips use the existing procedural batches, sampled from the same posture.
      if(mgGunner(a)&&a.alive&&a.mg34Prone&&a.mg34Prone.phase!=='standing'&&!this.hasProne())continue;
      let v=prevInst;
      if(v&&(v.key!==key||mgGunner(a)&&v.weaponLOD!==weaponLOD)){this.release(v);this.instances.delete(a.id);v=null;}
      v??=this.create(a,key,weaponLOD);selected.add(a.id);
      // Specialist animated rigs retain the exact legacy sampling contract. In particular,
      // CKM, prone MG34 and station drag must reproduce identical bone matrices after
      // pause, save/reload and repeated render calls. The generic resolver must not
      // modify their root orientation, spine bones or action weighting.
      const legacySpecialist=/^(ckm_wz30_|mg34_prone_|station_drag_|drag_wounded$)/.test(sample.clip);
      if(legacySpecialist){
        this.scene.add(v.root);v.root.visible=true;
        v.root.position.set(a.x,a.y??0,a.z);
        v.root.rotation.set(0,-a.facing-Math.PI/2,0);
        if(v.clip!==sample.clip||v.blendClip){
          v.mixer.stopAllAction();
          v.action=v.mixer.clipAction(clip).setLoop(THREE.LoopOnce,1);
          v.action.clampWhenFinished=true;v.action.play();
          v.clip=sample.clip;v.blendClip=null;v.blendAction=null;
        }
        v.action.reset().play();
        v.mixer.setTime(sample.loop?sample.time%clip.duration:Math.min(sample.time,clip.duration));
      }else{
        const orientation=resolveTorsoOrientation(a,pose);
        const useSpineTwist=Boolean(v.spineBone&&orientation.torsoTwist!==0);
        const appliedRootYaw=useSpineTwist?orientation.rootYaw:orientation.facing;
        this.scene.add(v.root);v.root.visible=true;
        v.root.position.set(a.x,a.y??0,a.z);
        v.root.rotation.set(0,-appliedRootYaw-Math.PI/2,0);
        if(v.spineBone){if(v.spineBaseQuat)v.spineBone.quaternion.copy(v.spineBaseQuat);v.spineBone.rotation.y=v.spineBaseRotY;}
        const blendClipObj=sample.blend?this.clips.get(sample.blend.clip):null;
        if(blendClipObj&&blendClipObj!==clip&&sample.blend.weight>.01){
          if(v.clip!==sample.clip||v.blendClip!==sample.blend.clip){
            v.mixer.stopAllAction();
            v.blendAction=v.mixer.clipAction(blendClipObj);
            v.blendAction.setLoop(THREE.LoopOnce,1);v.blendAction.clampWhenFinished=true;v.blendAction.play();
            v.action=v.mixer.clipAction(clip);
            v.action.setLoop(THREE.LoopOnce,1);v.action.clampWhenFinished=true;v.action.play();
            v.clip=sample.clip;v.blendClip=sample.blend.clip;
          }
          const tFrom=sample.blend.loop?sample.blend.time%blendClipObj.duration:Math.min(sample.blend.time,blendClipObj.duration);
          const tTo=sample.loop?sample.time%clip.duration:Math.min(sample.time,clip.duration);
          v.blendAction.reset().play();v.blendAction.setEffectiveWeight?.(sample.blend.weight);
          v.action.reset().play();v.action.setEffectiveWeight?.(sample.weight??1);
          v.mixer.setTime(0);v.blendAction.time=tFrom;v.action.time=tTo;v.mixer.update?.(0);
        }else{
          if(v.clip!==sample.clip||v.blendClip){
            v.mixer.stopAllAction();v.action=v.mixer.clipAction(clip);v.action.setLoop(THREE.LoopOnce,1);
            v.action.clampWhenFinished=true;v.action.play();v.clip=sample.clip;v.blendClip=null;v.blendAction=null;
          }
          v.action.setEffectiveWeight?.(1);
          v.action.reset().play();
          v.mixer.setTime(sample.loop?sample.time%clip.duration:Math.min(sample.time,clip.duration));
        }
        if(useSpineTwist){
          v.spineBone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(UP_AXIS,-orientation.torsoTwist));
        }
      }
      const kowal=a.id==='szymon_kowal',bak=a.id==='jozef_bak';
      v.meshes.forEach(n=>{
        n.castShadow=quality!=='low'&&d<35;
        if(n.name==='mg34_bipod_open')n.visible=Boolean(a.alive&&a.mg34Prone&&a.mg34Prone.phase!=='standing'&&this.hasProne());
        if(!weaponParts.has(n.name))return;
        const armed=a.alive&&a.state!=='WOUNDED'&&!a.carriedBy&&a.role!=='MEDIC'&&!mgGunner(a)&&!(ckmAtPost(a)&&this.hasCKM()),kowal=a.id==='szymon_kowal',bak=a.id==='jozef_bak';
        const bipod=clip.userData?.bipod??'folded';
        n.visible=n.name==='rifle'?armed&&!kowal&&!bak:n.name==='clip'?armed&&!kowal:
          n.name==='rifle_wz98a'?armed&&bak:n.name==='rkm_wz28'?armed&&kowal:
          n.name==='rkm_pouch'?kowal:n.name==='rag'?armed&&kowal&&sample.clip==='rkm_clean':
          armed&&kowal&&n.name===`rkm_bipod_${bipod}`;
      });
      if(v.weaponRoot)v.weaponRoot.visible=a.alive&&a.state!=='WOUNDED'&&!a.carriedBy;
      v.root.updateMatrixWorld(true);clips[sample.clip]=(clips[sample.clip]??0)+1;
      visible.push({...((mgGunner(a)&&a.mg34Prone)?{prone:{phase:a.mg34Prone.phase,startedAt:a.mg34Prone.startedAt,progress:a.mg34Prone.progress,rounds:a.mg34Prone.burst?.rounds??0,emitted:a.mg34Prone.burst?.emitted??0,shot:a.shot,firedAt:a.firedAt,eye:eyePosition(a),hitboxes:actorHitboxes(a),muzzle:muzzlePosition(a,time)}}:{}),
        id:a.id,lod,key,visual:v.visual,clip:sample.clip,clipTime:v.action.time,loop:sample.loop,weapon:v.weapon,weaponLOD:v.weaponLOD,muzzle:this.muzzle(a.id)?.toArray(),
        ...(sample.blend?{blendClip:sample.blend.clip,blendWeight:sample.blend.weight}:{}),
        weaponMeshes:v.meshes.filter(n=>weaponParts.has(n.name)&&n.visible||n.name.startsWith('mg34_')&&n.visible&&v.weaponRoot?.visible).map(n=>n.name)});
    }
    for(const {a}of candidates)if(selected.has(a.id)&&a.carriedBy&&a.task!=='station_wounded'&&selected.has(a.carriedBy)){
      const v=this.instances.get(a.id),socket=this.instances.get(a.carriedBy).root.getObjectByName('carry_socket');
      socket.add(v.root);v.root.position.set(0,0,0);v.root.rotation.set(0,0,0);v.root.updateMatrixWorld(true);
    }
    for(const [id,v]of this.instances)if(!selected.has(id)){this.release(v);this.instances.delete(id);}
    this.stats={active:selected.size,limit:limits.count,instances:this.instances.size,clips,actors:visible};
    return selected;
  }
  updateCKM(actors,time,player,quality){
    const gunner=actors.find(a=>a.id==='ckm_gunner'),d=Math.hypot(player.x-CKM_POSITION.x,player.z-CKM_POSITION.z);
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
    const v=this.ckm,phase=gunner.ckm.phase==='idle'?'idle':'abandon',clip=v.clips.find(c=>c.name===`ckm_wz30_gun_${phase}`);
    if(!clip){v.root.visible=false;return;}
    v.root.visible=true;v.root.position.set(CKM_POSITION.x,CKM_POSITION.y,CKM_POSITION.z);v.root.rotation.y=-Math.PI/2;
    v.mixer.stopAllAction();const action=v.mixer.clipAction(clip).setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.reset().play();
    const age=gunner.ckm.phase==='retreat'?clip.duration:Math.max(0,time-gunner.ckm.startedAt);
    v.mixer.setTime(phase==='idle'?age%clip.duration:Math.min(age,clip.duration));v.clip=clip.name;v.time=action.time;v.root.updateMatrixWorld(true);
  }
  muzzle(id){
    const v=this.instances.get(id),bone=v?.root.getObjectByName('weapon');if(!bone)return null;
    v.root.updateMatrixWorld(true);return new THREE.Vector3().fromArray(v.muzzle).applyMatrix4(bone.matrixWorld);
  }
  get diagnostics(){return {...this.stats,visuals:this.visuals?.diagnostics??null,proneAvailable:this.hasProne(),ckm:this.ckm?{visible:this.ckm.root.visible,lod:this.ckm.lod,clip:this.ckm.clip,time:this.ckm.time,position:this.ckm.root.position.toArray()}:null,loaded:[...this.sources.keys()],failures:this.assets.failures};}
  dispose(){this.disposed=true;if(this.ckm){this.ckm.root.removeFromParent();this.ckm.mixer.stopAllAction();this.ckm.mixer.uncacheRoot(this.ckm.root);}this.instances.forEach(v=>this.release(v));this.instances.clear();this.visuals?.dispose();this.assets.dispose();}
}
