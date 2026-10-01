import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { AssetManager } from '../assets/asset-manager.js';
import { actorPose } from './m01-actor-pose.js';

const BASE='assets/models/provisional/m01/characters/';
const LIMITS={low:{count:18,near:0,middle:15,far:100},medium:{count:24,near:0,middle:40,far:130},high:{count:28,near:14,middle:45,far:160}};
const named={marek_zielinski:'zielinski',pawel_krawiec:'krawiec',tadeusz_nowicki:'nowicki',jozef_bak:'bak',szymon_kowal:'kowal',leon_dudek:'dudek'};
const hash=id=>[...id].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);

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
      ...['pl:1','pl:2','de:2',...(quality==='high'?['pl:0','de:0','de:1']:[])].map(k=>this.loadSource(k))
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
  sample(actor,time,actors,pose){
    const offset=(hash(actor.id)%1000)/250;
    if(pose.name==='fallen')return {clip:'fallen',time:1.4,loop:false};
    if(pose.name==='carried')return {clip:'carried',time:time+offset,loop:true};
    if(pose.name==='wounded')return {clip:'wounded',time:time+offset,loop:true};
    if(pose.name==='seated')return {clip:'seated',time:time+offset,loop:true};
    if(actors.some(a=>a.active&&a.carriedBy===actor.id))return {clip:'carry_wounded',time:time+offset,loop:true};
    if(actor.role==='ENGINEER'&&actor.crouched){
      // The repair has stopped under fire. Hold the sheltered pose instead of replaying working hands.
      return pose.underFire?{clip:'sapper_work_pinned',time:.8,loop:false}:
        {clip:'sapper_work',time:time+offset,loop:true};
    }
    if(pose.underFire)return {clip:'pinned',time:time+offset,loop:true};
    if(pose.moving)return {clip:actor.group==='grp_east_platoon'?'run':'walk',time:time+offset,loop:true};
    const fireAge=time-actor.firedAt,boltDuration=this.clips.get('fire_bolt')?.duration??1.17;
    if(pose.aiming&&Number.isFinite(fireAge)&&fireAge>=0&&fireAge<boltDuration)
      return {clip:'fire_bolt',time:fireAge,loop:false};
    if(pose.aiming)return {clip:'aim',time:time+offset,loop:true};
    return {clip:actor.crouched?'crouched_idle':'standing_idle',time:time+offset,loop:true};
  }
  create(actor,key){
    const root=clone(this.sources.get(key).scene),meshes=[];
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
      if(n.name==='rifle'||n.name==='clip')n.visible=actor.role!=='MEDIC'&&actor.id!=='jozef_bak';
      n.frustumCulled=false;n.receiveShadow=true;meshes.push(n);
    });
    this.scene.add(root);
    const v={root,key,meshes,mixer:new THREE.AnimationMixer(root),action:null,clip:null};
    this.instances.set(actor.id,v);return v;
  }
  release(v){
    v.root.removeFromParent();v.mixer.stopAllAction();v.mixer.uncacheRoot(v.root);
    const skeletons=new Set(v.meshes.filter(n=>n.isSkinnedMesh).map(n=>n.skeleton));
    skeletons.forEach(s=>s.dispose());
    // Geometry, materials and atlases belong to the source cache, shared by all clones/LODs.
  }
  update(actors,time,player,quality='low'){
    const limits=LIMITS[quality]??LIMITS.low;
    if(quality==='high')for(const k of ['pl:0','de:0','de:1'])void this.loadSource(k);
    const selected=new Set(),visible=[],clips={};
    const candidates=actors.filter(a=>a.active&&!a.civilian&&a.role!=='SUPPORT'&&
      (a.id!=='jozef_bak'||a.state==='WOUNDED'||a.carriedBy))
      .map(a=>({a,d:Math.hypot(a.x-player.x,a.z-player.z)})).filter(p=>p.d<limits.far)
      .sort((a,b)=>a.d-b.d||a.a.id.localeCompare(b.a.id)).slice(0,limits.count);
    if(this.clips.size)for(const {a,d}of candidates){
      const nation=a.team==='enemy'?'de':'pl';let lod=d<limits.near?0:d<limits.middle?1:2;
      while(lod<3&&!this.sources.has(`${nation}:${lod}`))lod++;
      if(lod===3)continue;
      const key=`${nation}:${lod}`,pose=actorPose(a,time),sample=this.sample(a,time,actors,pose),clip=this.clips.get(sample.clip);
      if(!clip)continue;
      let v=this.instances.get(a.id);
      if(v&&v.key!==key){this.release(v);this.instances.delete(a.id);v=null;}
      v??=this.create(a,key);selected.add(a.id);
      // Always return a previously attached wounded actor to scene before sampling an updated carrier.
      this.scene.add(v.root);v.root.visible=true;v.root.position.set(a.x,a.y,a.z);v.root.rotation.set(0,-a.facing-Math.PI/2,0);
      if(v.clip!==sample.clip){
        v.mixer.stopAllAction();v.action=v.mixer.clipAction(clip);v.action.setLoop(THREE.LoopOnce,1);
        v.action.clampWhenFinished=true;v.action.play();v.clip=sample.clip;
      }
      v.action.reset().play();v.mixer.setTime(sample.loop?sample.time%clip.duration:Math.min(sample.time,clip.duration));
      v.meshes.forEach(n=>{n.castShadow=quality!=='low'&&d<35;});
      v.root.updateMatrixWorld(true);clips[sample.clip]=(clips[sample.clip]??0)+1;
      visible.push({id:a.id,lod,clip:sample.clip});
    }
    for(const {a}of candidates)if(selected.has(a.id)&&a.carriedBy&&selected.has(a.carriedBy)){
      const v=this.instances.get(a.id),socket=this.instances.get(a.carriedBy).root.getObjectByName('carry_socket');
      socket.add(v.root);v.root.position.set(0,0,0);v.root.rotation.set(0,0,0);v.root.updateMatrixWorld(true);
    }
    for(const [id,v]of this.instances)if(!selected.has(id)){this.release(v);this.instances.delete(id);}
    this.stats={active:selected.size,limit:limits.count,instances:this.instances.size,clips,actors:visible};
    return selected;
  }
  muzzle(id){
    const v=this.instances.get(id),bone=v?.root.getObjectByName('weapon');if(!bone)return null;
    v.root.updateMatrixWorld(true);return new THREE.Vector3(0,.032,-.765).applyMatrix4(bone.matrixWorld);
  }
  get diagnostics(){return {...this.stats,loaded:[...this.sources.keys()],failures:this.assets.failures};}
  dispose(){this.disposed=true;this.instances.forEach(v=>this.release(v));this.instances.clear();this.assets.dispose();}
}
