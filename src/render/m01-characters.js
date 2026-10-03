import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { AssetManager } from '../assets/asset-manager.js';
import { actorPose } from './m01-actor-pose.js';

const BASE='assets/models/provisional/m01/characters/';
const MG='assets/models/provisional/m01/weapons/mg34/';
const CKM='assets/models/provisional/m01/weapons/ckm_wz30/';
const LIMITS={low:{count:18,near:0,middle:15,far:100},medium:{count:24,near:0,middle:40,far:130},high:{count:28,near:14,middle:45,far:160}};
const named={marek_zielinski:'zielinski',pawel_krawiec:'krawiec',tadeusz_nowicki:'nowicki',jozef_bak:'bak',szymon_kowal:'kowal',leon_dudek:'dudek'};
const hash=id=>[...id].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
const weaponParts=new Set(['rifle','clip','rifle_wz98a','rkm_wz28','rkm_bipod_open','rkm_bipod_folded','rkm_pouch','rag']);
const mgGunner=a=>a.team==='enemy'&&a.weapon==='mg34'&&['de_east_0','de_east_1'].includes(a.id);
const ckmCrew=a=>a.group==='grp_ckm_crew',ckmGunner=a=>ckmCrew(a)&&a.ckmRole==='gunner',ckmOperator=a=>ckmCrew(a)&&['gunner','loader'].includes(a.ckmRole);
const ckmCrewClips=['ckm_wz30_gunner_idle','ckm_wz30_loader_idle','ckm_wz30_gunner_abandon','ckm_wz30_loader_abandon'];
const ckmGunClips=['ckm_wz30_gun_idle','ckm_wz30_gun_abandon'];
const stationClips=['station_drag_medic_grab','station_drag_patient_grab','station_drag_medic_release','station_drag_patient_release','drag_wounded','crouched_idle','wounded'];

// Presentation only. Playback is sampled from the saved mission clock; no renderer timers enter saves.
export class M01Characters {
  constructor(scene){
    this.scene=scene;this.assets=new AssetManager();this.sources=new Map();this.pending=new Set();
    this.instances=new Map();this.clips=new Map();this.revision=0;this.disposed=false;this.stats={};
  }
  async load(quality='low'){
    await Promise.allSettled([
      this.assets.load('m01-clips',BASE+'m01_soldier_animations.glb').then(g=>{
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
      this.assets.load('ckm-clips',CKM+'m01_ckm_wz30_animations.glb').then(g=>{
        if(!this.disposed){g.animations.forEach(c=>this.clips.set(c.name,c));this.revision++;}
      }),
      this.loadMG(2),this.loadCKM(2),...(quality==='high'?[this.loadMG(0),this.loadMG(1),this.loadCKM(0),this.loadCKM(1)]:[]),
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
    }catch{/* Keep ordinary Polish soldier presentation if the optional ckm kit fails. */}
  }
  ckmReady(){
    const source=[0,1,2].map(l=>this.sources.get(`ckm:${l}`)).find(g=>g&&ckmGunClips.every(name=>g.animations.some(c=>c.name===name)));
    return Boolean(source)&&ckmCrewClips.every(name=>this.clips.has(name));
  }
  sample(actor,time,actors,pose,battleClock){
    const offset=(hash(actor.id)%1000)/250;
    if(pose.name==='fallen')return {clip:'fallen',time:1.4,loop:false};
    if(ckmOperator(actor)&&actor.ckmPhase!=='moving'){
      if(this.ckmReady()){
        const suffix=actor.ckmPhase==='abandon'?'abandon':'idle',elapsed=suffix==='abandon'?Math.max(0,time-actor.ckmStartedAt):time+offset;
        return {clip:`ckm_wz30_${actor.ckmRole}_${suffix}`,time:elapsed,loop:suffix==='idle',
          ...(ckmGunner(actor)?{weaponClip:`ckm_wz30_gun_${suffix}`,weaponTime:elapsed,weaponLoop:suffix==='idle'}:{})};
      }
      return {clip:this.clips.has('crouched_idle')?'crouched_idle':'standing_idle',time:time+offset,loop:true};
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
    if(patient)return {clip:'carry_wounded',time:time+offset,loop:true};
    if(actor.role==='ENGINEER'&&actor.crouched){
      // The repair has stopped under fire. Hold the sheltered pose instead of replaying working hands.
      return pose.underFire?{clip:'sapper_work_pinned',time:.8,loop:false}:
        {clip:'sapper_work',time:time+offset,loop:true};
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
      if(pose.moving)return {clip:actor.state==='RETREAT'?'rkm_run':'rkm_walk',time:time+offset,loop:true};
      return {clip:pose.aiming?'rkm_aim':actor.crouched?'rkm_crouched_idle':'rkm_standing_idle',time:time+offset,loop:true};
    }
    if(pose.moving)return {clip:actor.group==='grp_east_platoon'?'run':'walk',time:time+offset,loop:true};
    const fireAge=time-actor.firedAt,boltDuration=this.clips.get('fire_bolt')?.duration??1.17;
    if(pose.aiming&&Number.isFinite(fireAge)&&fireAge>=0&&fireAge<boltDuration)
      return {clip:'fire_bolt',time:fireAge,loop:false};
    if(pose.aiming)return {clip:'aim',time:time+offset,loop:true};
    return {clip:actor.crouched?'crouched_idle':'standing_idle',time:time+offset,loop:true};
  }
  create(actor,key,weaponLOD){
    const root=clone(this.sources.get(key).scene),meshes=[];let weaponRoot=null,weaponMixer=null;
    if(ckmGunner(actor)&&this.ckmReady()&&this.sources.has(`ckm:${weaponLOD}`)){
      weaponRoot=this.sources.get(`ckm:${weaponLOD}`).scene.clone(true);this.scene.add(weaponRoot);weaponMixer=new THREE.AnimationMixer(weaponRoot);
    }else if(mgGunner(actor)){
      weaponRoot=this.sources.get(`mg34:${weaponLOD}`).scene.clone(true);
      root.getObjectByName('weapon').add(weaponRoot);
    }
    const nation=actor.team==='enemy'?'de':'pl',head=named[actor.id]??(nation==='de'?`de_${'abc'[hash(actor.id)%3]}`:'pl_a');
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
    this.scene.add(root);
    const weapon=weaponMixer?'ckm_wz30':weaponRoot?'mg34':actor.id==='szymon_kowal'?'rkm_wz28':actor.id==='jozef_bak'?'wz98a':nation==='pl'?'wz29':'kar98k';
    const profile=root.getObjectByName(`m01_soldier_${nation}`)?.userData;
    const v={root,key,meshes,weapon,weaponRoot,weaponLOD,muzzle:weaponRoot?.getObjectByName('mg34')?.userData.sockets?.muzzle??profile?.weapons?.[weapon]?.muzzle??profile?.sockets?.muzzle??[0,.032,-.765],
      mixer:new THREE.AnimationMixer(root),action:null,clip:null,weaponMixer,weaponAction:null,weaponClip:null};
    this.instances.set(actor.id,v);return v;
  }
  release(v){
    v.root.removeFromParent();v.mixer.stopAllAction();v.mixer.uncacheRoot(v.root);
    if(v.weaponMixer){v.weaponMixer.stopAllAction();v.weaponMixer.uncacheRoot(v.weaponRoot);v.weaponRoot.removeFromParent();}
    const skeletons=new Set(v.meshes.filter(n=>n.isSkinnedMesh).map(n=>n.skeleton));
    skeletons.forEach(s=>s.dispose());
    // Geometry, materials and atlases belong to the source cache, shared by all clones/LODs.
  }
  update(actors,time,player,quality='low',battleClock){
    const limits=LIMITS[quality]??LIMITS.low;
    if(quality==='high')for(const k of ['pl:0','de:0','de:1'])void this.loadSource(k);
    if(quality==='high')for(const lod of [0,1]){void this.loadMG(lod);void this.loadCKM(lod);}
    const selected=new Set(),visible=[],clips={},availableCKM=this.ckmReady();
    const availableMG=[0,1,2].some(l=>this.sources.has(`mg34:${l}`))&&this.clips.has('mg34_aim')&&this.clips.has('mg34_fire_burst');
    const candidates=actors.filter(a=>a.active&&!a.civilian&&(a.role!=='SUPPORT'||a.id==='szymon_kowal'||ckmCrew(a)||mgGunner(a)&&availableMG))
      .map(a=>({a,d:Math.hypot(a.x-player.x,a.z-player.z),gunD:ckmGunner(a)&&a.ckmGunVisible?Math.hypot(a.ckmPost.x-player.x,a.ckmPost.z-player.z):Infinity}))
      .filter(p=>Math.min(p.d,p.gunD)<(mgGunner(p.a)?1800:limits.far))
      // Reserve real support crews inside the same actor budget; presentation never creates gameplay actors.
      .sort((a,b)=>Number(ckmOperator(b.a))-Number(ckmOperator(a.a))||Number(mgGunner(b.a))-Number(mgGunner(a.a))||a.d-b.d||a.a.id.localeCompare(b.a.id)).slice(0,limits.count);
    if(this.clips.size)for(const {a,d,gunD}of candidates){
      const nation=a.team==='enemy'?'de':'pl';let lod=d<limits.near?0:d<limits.middle?1:2;
      while(lod<3&&!this.sources.has(`${nation}:${lod}`))lod++;
      if(lod===3)continue;
      let weaponLOD=lod;
      if(mgGunner(a)){while(weaponLOD<3&&!this.sources.has(`mg34:${weaponLOD}`))weaponLOD++;if(weaponLOD===3)continue;}
      if(ckmGunner(a)&&availableCKM){const wanted=gunD<15?0:gunD<40?1:2;weaponLOD=[wanted,2,1,0].find((l,i,list)=>list.indexOf(l)===i&&this.sources.has(`ckm:${l}`));}
      const key=`${nation}:${lod}`,pose=actorPose(a,time),sample=this.sample(a,time,actors,pose,battleClock),clip=this.clips.get(sample.clip);
      if(!clip)continue;
      if(a.id==='szymon_kowal'&&!this.sources.get(key).scene.getObjectByName('rkm_wz28'))continue;
      let v=this.instances.get(a.id),wantsCkm=ckmGunner(a)&&availableCKM;
      if(v&&(v.key!==key||mgGunner(a)&&v.weaponLOD!==weaponLOD||ckmGunner(a)&&(v.weaponLOD!==weaponLOD||(v.weapon==='ckm_wz30')!==wantsCkm))){
        this.release(v);this.instances.delete(a.id);v=null;
      }
      v??=this.create(a,key,weaponLOD);selected.add(a.id);
      // Always return a previously attached wounded actor to scene before sampling an updated carrier.
      this.scene.add(v.root);v.root.visible=true;v.root.position.set(a.x,a.y,a.z);v.root.rotation.set(0,-a.facing-Math.PI/2,0);
      if(v.clip!==sample.clip){
        v.mixer.stopAllAction();v.action=v.mixer.clipAction(clip);v.action.setLoop(THREE.LoopOnce,1);
        v.action.clampWhenFinished=true;v.action.play();v.clip=sample.clip;
      }
      v.action.reset().play();v.mixer.setTime(sample.loop?sample.time%clip.duration:Math.min(sample.time,clip.duration));
      if(v.weapon==='ckm_wz30'){
        v.weaponRoot.visible=Boolean(a.ckmGunVisible);v.weaponRoot.position.set(a.ckmPost.x,a.ckmPost.y,a.ckmPost.z);v.weaponRoot.rotation.set(0,a.ckmPost.yaw,0);
        const weaponName=sample.weaponClip??'ckm_wz30_gun_idle',weaponClip=this.sources.get(`ckm:${v.weaponLOD}`).animations.find(c=>c.name===weaponName),
          weaponTime=sample.weaponTime??time,weaponLoop=sample.weaponLoop??true;
        if(v.weaponRoot.visible&&weaponClip){
          if(v.weaponClip!==weaponName){v.weaponMixer.stopAllAction();v.weaponAction=v.weaponMixer.clipAction(weaponClip);v.weaponAction.setLoop(THREE.LoopOnce,1);v.weaponAction.clampWhenFinished=true;v.weaponAction.play();v.weaponClip=weaponName;}
          v.weaponAction.reset().play();v.weaponMixer.setTime(weaponLoop?weaponTime%weaponClip.duration:Math.min(weaponTime,weaponClip.duration));
        }
      }
      v.meshes.forEach(n=>{
        n.castShadow=quality!=='low'&&d<35;
        if(!weaponParts.has(n.name))return;
        const armed=a.alive&&a.state!=='WOUNDED'&&!a.carriedBy&&a.role!=='MEDIC'&&!mgGunner(a)&&!(ckmOperator(a)&&availableCKM&&a.ckmPhase!=='moving'),kowal=a.id==='szymon_kowal',bak=a.id==='jozef_bak';
        const bipod=clip.userData?.bipod??'folded';
        n.visible=n.name==='rifle'?armed&&!kowal&&!bak:n.name==='clip'?armed&&!kowal:
          n.name==='rifle_wz98a'?armed&&bak:n.name==='rkm_wz28'?armed&&kowal:
          n.name==='rkm_pouch'?kowal:n.name==='rag'?armed&&kowal&&sample.clip==='rkm_clean':
          armed&&kowal&&n.name===`rkm_bipod_${bipod}`;
      });
      if(v.weaponRoot&&v.weapon!=='ckm_wz30')v.weaponRoot.visible=a.alive&&a.state!=='WOUNDED'&&!a.carriedBy;
      v.root.updateMatrixWorld(true);v.weaponRoot?.updateMatrixWorld(true);clips[sample.clip]=(clips[sample.clip]??0)+1;
      visible.push({id:a.id,lod,clip:sample.clip,clipTime:v.action.time,loop:sample.loop,weapon:v.weapon,weaponLOD:v.weaponLOD,muzzle:this.muzzle(a.id)?.toArray(),
        weaponMeshes:[...v.meshes.filter(n=>weaponParts.has(n.name)&&n.visible||n.name.startsWith('mg34_')&&n.visible&&v.weaponRoot?.visible).map(n=>n.name),
          ...(v.weapon==='ckm_wz30'&&v.weaponRoot?.visible?['ckm_wz30']:[])]});
    }
    for(const {a}of candidates)if(selected.has(a.id)&&a.carriedBy&&a.task!=='station_wounded'&&selected.has(a.carriedBy)){
      const v=this.instances.get(a.id),socket=this.instances.get(a.carriedBy).root.getObjectByName('carry_socket');
      socket.add(v.root);v.root.position.set(0,0,0);v.root.rotation.set(0,0,0);v.root.updateMatrixWorld(true);
    }
    for(const [id,v]of this.instances)if(!selected.has(id)){this.release(v);this.instances.delete(id);}
    this.stats={active:selected.size,limit:limits.count,instances:this.instances.size,clips,actors:visible};
    return selected;
  }
  muzzle(id){
    const v=this.instances.get(id);if(v?.weapon==='ckm_wz30')return null;
    const bone=v?.root.getObjectByName('weapon');if(!bone)return null;
    v.root.updateMatrixWorld(true);return new THREE.Vector3().fromArray(v.muzzle).applyMatrix4(bone.matrixWorld);
  }
  get diagnostics(){return {...this.stats,loaded:[...this.sources.keys()],failures:this.assets.failures};}
  dispose(){this.disposed=true;this.instances.forEach(v=>this.release(v));this.instances.clear();this.assets.dispose();}
}
