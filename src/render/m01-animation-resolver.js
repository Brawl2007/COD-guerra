// M01 Animation Resolver V1 + Argon V2: deterministic visual helpers, no gameplay authority.
export const STRIDE_METRES=Object.freeze({
  walk:1.54,run:2.88,sprint:3.2,crouch_walk:.768,
  rkm_walk:1.54,rkm_run:2.88,carry_wounded:1.4,drag_wounded:1.1
});

export const CLIP_DURATIONS=Object.freeze({
  standing_idle:4,crouched_idle:3,walk:1.1,run:.8,sprint:.64,crouch_walk:.96,
  turn_left:1.14,turn_right:1.14,hit_front:.76,near_miss_duck:.98,
  fire_bolt:1.17,reload_clip:3.4,rkm_fire_burst:.8,rkm_reload:3.4,
  pinned:2.4,sapper_work:3,sapper_work_pinned:2,
  carry_wounded:2.5,carried:2.5,drag_wounded:1.4,wounded:2,fallen:1.4,aim:2
});

export const CLIP_FALLBACKS=Object.freeze({
  sprint:['run','walk','standing_idle','idle'],
  run:['walk','standing_idle','idle'],
  walk:['run','standing_idle','idle'],
  crouch_walk:['crouched_idle','crouch_idle','pinned','standing_idle'],
  crouched_idle:['crouch_idle','pinned','standing_idle'],
  standing_idle:['idle'],
  turn_left:['aim','standing_idle','idle'],
  turn_right:['aim','standing_idle','idle'],
  hit_front:['pinned','crouched_idle','standing_idle'],
  near_miss_duck:['pinned','crouched_idle','standing_idle'],
  reload_clip:['reload','aim','standing_idle'],
  fire_bolt:['fire','aim','standing_idle'],
  drag_wounded:['drag','pinned','crouched_idle'],
  carry_wounded:['carry','walk','standing_idle']
});

export const BLEND_DURATION=.18;
export const TURN_THRESHOLD=.22;
export const MAX_TORSO_TWIST=.65;
export const LOD_HYSTERESIS_M=.5;

const BLENDABLE_CLIPS=new Set(['standing_idle','crouched_idle','walk','run','sprint','crouch_walk','aim','rkm_standing_idle','rkm_crouched_idle','rkm_walk','rkm_run','rkm_aim']);

export const actorHash=id=>[...String(id??'')].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
export const wrapAngle=rad=>Math.atan2(Math.sin(rad),Math.cos(rad));
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const smoothstep01=u=>{const x=clamp(u,0,1);return x*x*(3-2*x);};

export function resolveAvailableClip(preferred,clips){
  if(!clips||typeof clips.has!=='function'||clips.size===0||clips.has(preferred))return preferred;
  const fallbacks=CLIP_FALLBACKS[preferred];
  if(fallbacks)for(const alt of fallbacks)if(clips.has(alt))return alt;
  return preferred;
}

export function resolveLocomotionGait(actor,pose){
  if(!actor?.alive||pose?.underFire||actor?.shot>0||
     ['fallen','wounded','carried','seated','prone','pinned'].includes(pose?.name))return 'idle';
  if(actor.motion&&typeof actor.motion==='object'){
    const g=actor.motion.gait,spd=Number(actor.motion.speed)||0;
    if(g==='idle'||g==='carry'||g==='drag'||spd<=0)return 'idle';
    if(actor.crouched||actor.posture==='crouch'||pose?.name==='crouched'||g==='crouch_walk')return 'crouch_walk';
    if(g==='sprint'||spd>4.4)return 'sprint';
    if(g==='run'||spd>2.2)return 'run';
    return 'walk';
  }
  const moving=Boolean(pose?.moving||actor?.moving||
    (['ADVANCE','RETREAT'].includes(actor?.state)&&(pose?.name==='standing'||pose?.name==='crouched')));
  if(!moving)return 'idle';
  if(actor?.crouched||pose?.name==='crouched')return 'crouch_walk';
  if(actor?.sprinting)return 'sprint';
  if(actor?.running||actor?.group==='grp_east_platoon')return 'run';
  return 'walk';
}

export function resolveStrideSample(actor,clipName,time=0,clips=null){
  const h=actorHash(actor?.id),offset=(h%1000)/250,idPhase=(h%1000)/1000;
  const duration=clips?.get?.(clipName)?.duration??CLIP_DURATIONS[clipName]??1;
  const strideM=clips?.get?.(clipName)?.userData?.stride??STRIDE_METRES[clipName];
  const odo=actor?.motion?.odometer,spd=actor?.motion?.speed??0;
  if(strideM>0&&Number.isFinite(odo)&&(odo>0||spd>0)){
    const stridePhase=(((odo/strideM)+idPhase)%1+1)%1;
    return {time:stridePhase*duration,stridePhase,strideSynced:true};
  }
  const t=Math.max(0,time+offset);
  return {time:t,stridePhase:duration>0?((t%duration)+duration)%duration/duration:0,strideSynced:false};
}

export function resolveTorsoOrientation(actor,pose){
  const facing=Number.isFinite(actor?.facing)?actor.facing:0;
  const fixed=!actor?.alive||actor?.state==='WOUNDED'||Boolean(actor?.carriedBy)||actor?.pose==='seated'||
    ['fallen','wounded','carried','seated','prone'].includes(pose?.name)||
    Boolean(actor?.mg34Prone&&actor.mg34Prone.phase!=='standing')||
    Boolean(actor?.ckm&&actor.ckm.phase!=='retreat');
  if(fixed){
    const yaw=!actor?.alive&&Number.isFinite(actor?.deathYaw)?actor.deathYaw:facing;
    return {facing,bodyYaw:yaw,yawDelta:0,torsoTwist:0,rootYaw:yaw};
  }
  const bodyYaw=Number.isFinite(actor?.bodyYaw)?actor.bodyYaw:facing;
  const yawDelta=wrapAngle(facing-bodyYaw);
  const torsoTwist=clamp(yawDelta,-MAX_TORSO_TWIST,MAX_TORSO_TWIST);
  const rootYaw=wrapAngle(facing-torsoTwist);
  return {facing,bodyYaw,yawDelta,torsoTwist,rootYaw};
}


// Argon V2 presentation-only helpers. Optional hit metadata is never inferred
// from gameplay RNG, hitboxes or save fields.
export function resolveDirectionalImpact(actor,time=0,clips=null){
  const idle={active:false,pitch:0,roll:0,angle:0};
  if(!actor?.alive||!Number.isFinite(actor.hitAt))return idle;
  const duration=clips?.get?.('hit_front')?.duration??CLIP_DURATIONS.hit_front;
  const age=time-actor.hitAt;
  if(!Number.isFinite(duration)||duration<=0||age<0||age>=duration)return idle;
  const facing=Number.isFinite(actor.facing)?actor.facing:0;
  const angle=Number.isFinite(actor.hitYaw)?wrapAngle(actor.hitYaw-facing):0;
  const envelope=Math.sin(Math.PI*age/duration);
  return {active:true,pitch:Math.cos(angle)*.22*envelope,
    roll:-Math.sin(angle)*.18*envelope,angle};
}

// Animate a reload only when the authoritative actor explicitly signals one.
// A full magazine and cooldown do not, by themselves, prove a reload occurred.
export function resolveRiflemanReload(actor,time=0,pose=null,clips=null){
  if(!actor?.alive||actor.civilian||actor.role==='MEDIC'||
     actor.id==='szymon_kowal'||actor.weapon==='mg34'||
     actor.group==='grp_ckm_crew'||pose?.underFire||actor.shot>0)return null;
  if(!actor.reloading&&actor.state!=='RELOAD_CLIP')return null;
  if(clips?.size>0&&!clips.has('reload_clip'))return null;
  const duration=clips?.get?.('reload_clip')?.duration??CLIP_DURATIONS.reload_clip;
  const explicit=typeof actor.reloadProgress==='function'?
    clamp(actor.reloadProgress(),0,1)*duration:null;
  const offset=(actorHash(actor.id)%1000)/250;
  const timeInClip=explicit??((Math.max(0,time)+offset)%duration);
  return {clip:'reload_clip',time:timeInClip,loop:false};
}

// Bounded, approximate shoulder compensation in the existing rig.
// Not a two-bone IK solver: no runtime physics or attachment authority.
export function resolveSupportHandIK(actor,pose,orientation,sample=null){
  const disabled={active:false,shoulderPitch:0,shoulderYaw:0,elbowBend:0};
  if(!actor?.alive||actor.civilian||actor.role==='MEDIC'||
     actor.weapon==='mg34'||actor.group==='grp_ckm_crew'||
     actor.carriedBy||actor.state==='WOUNDED'||
     ['fallen','wounded','carried','seated','prone','pinned'].includes(pose?.name)||
     ['reload_clip','rkm_reload'].includes(sample?.clip))return disabled;
  const twist=Number.isFinite(orientation?.torsoTwist)?orientation.torsoTwist:0;
  // Keep offsets small enough to avoid moving the existing weapon sockets.
  const shoulderYaw=clamp(twist*.25,-.12,.12);
  const shoulderPitch=(pose?.aiming?.025:pose?.moving?-.04:0)-Math.abs(twist)*.04;
  return {active:true,shoulderPitch,shoulderYaw,
    elbowBend:clamp(Math.abs(twist)*.16,0,.12)};
}

export function resolveCombatReaction(actor,time=0,pose=null,clips=null){
  if(!actor?.alive||actor?.shot>0)return null;
  if(Number.isFinite(actor.hitAt)){
    const hitAge=time-actor.hitAt,hitDur=clips?.get?.('hit_front')?.duration??CLIP_DURATIONS.hit_front;
    if(hitAge>=0&&hitAge<hitDur&&(!clips||clips.size===0||clips.has('hit_front')))
      return {clip:'hit_front',time:hitAge,loop:false};
  }
  if(Number.isFinite(actor.suppressedAt)){
    const supAge=time-actor.suppressedAt,duckDur=clips?.get?.('near_miss_duck')?.duration??CLIP_DURATIONS.near_miss_duck;
    if(supAge>=0&&supAge<duckDur&&(!clips||clips.size===0||clips.has('near_miss_duck')))
      return {clip:'near_miss_duck',time:supAge,loop:false};
  }
  return null;
}

export function resolveTurnClip(actor,pose,yawDelta,clips=null){
  if(!actor?.alive||actor.crouched||actor.posture==='crouch'||pose?.name!=='standing'||
     pose?.underFire||actor.shot>0||resolveLocomotionGait(actor,pose)!=='idle')return null;
  if(!Number.isFinite(yawDelta)||Math.abs(yawDelta)<=TURN_THRESHOLD)return null;
  const name=yawDelta<0?'turn_left':'turn_right';
  if(clips&&clips.size>0&&!clips.has(name))return null;
  const dur=clips?.get?.(name)?.duration??CLIP_DURATIONS[name]??.45;
  const span=Math.max(.01,Math.PI*.65-TURN_THRESHOLD);
  const progress=clamp(1-(Math.abs(yawDelta)-TURN_THRESHOLD)/span,0,1);
  return {clip:name,time:progress*dur,loop:false};
}

function inferPriorLocomotionClip(actor,toClip){
  const gaitSince=Number(actor?.motion?.gaitSince)||0,postureSince=Number(actor?.postureSince)||0;
  const crouched=Boolean(actor?.crouched||actor?.posture==='crouch');
  if(postureSince>=gaitSince&&postureSince>0){
    if(crouched)return toClip==='crouch_walk'?'walk':'standing_idle';
    return ['walk','run','sprint'].includes(toClip)?'crouch_walk':'crouched_idle';
  }
  if(toClip==='sprint')return 'run';
  if(toClip==='run')return 'walk';
  if(toClip==='walk')return crouched?'crouch_walk':'standing_idle';
  if(toClip==='crouch_walk')return 'crouched_idle';
  if(toClip==='crouched_idle')return (actor?.motion?.odometer??0)>0?'crouch_walk':'standing_idle';
  if(toClip==='standing_idle'||toClip==='aim')return (actor?.motion?.odometer??0)>0?'walk':'standing_idle';
  return null;
}

export function resolveTransitionBlend(actor,pose,primary,time=0,clips=null){
  if(!primary||!primary.loop||!BLENDABLE_CLIPS.has(primary.clip))return null;
  let fromClip=null,fromTime=0,fromLoop=true,elapsed=-1;
  if(Number.isFinite(actor?.hitAt)){
    const hitDur=clips?.get?.('hit_front')?.duration??CLIP_DURATIONS.hit_front;
    const afterHit=time-actor.hitAt-hitDur;
    if(afterHit>=0&&afterHit<BLEND_DURATION&&(!clips||clips.size===0||clips.has('hit_front'))){
      fromClip='hit_front';fromTime=hitDur;fromLoop=false;elapsed=afterHit;
    }
  }
  if(!fromClip&&Number.isFinite(actor?.suppressedAt)){
    const duckDur=clips?.get?.('near_miss_duck')?.duration??CLIP_DURATIONS.near_miss_duck;
    const afterDuck=time-actor.suppressedAt-duckDur;
    if(afterDuck>=0&&afterDuck<BLEND_DURATION&&(!clips||clips.size===0||clips.has('near_miss_duck'))){
      fromClip='near_miss_duck';fromTime=duckDur;fromLoop=false;elapsed=afterDuck;
    }
  }
  if(!fromClip){
    const gaitSince=Number(actor?.motion?.gaitSince)||0,postureSince=Number(actor?.postureSince)||0;
    const transitionAt=Math.max(gaitSince,postureSince);
    if(transitionAt>0&&time>=transitionAt&&time-transitionAt<BLEND_DURATION){
      const candidate=inferPriorLocomotionClip(actor,primary.clip);
      if(candidate){
        fromClip=resolveAvailableClip(candidate,clips);
        elapsed=time-transitionAt;
      }
    }
  }
  if(!fromClip||fromClip===primary.clip||(clips&&clips.size>0&&!clips.has(fromClip)))return null;
  const wTo=smoothstep01((elapsed+.03)/(BLEND_DURATION+.03)),wFrom=1-wTo;
  if(wFrom<=.01)return null;
  if(fromLoop){
    if(STRIDE_METRES[fromClip]&&STRIDE_METRES[primary.clip]&&Number.isFinite(primary.stridePhase)){
      const fromDur=clips?.get?.(fromClip)?.duration??CLIP_DURATIONS[fromClip]??1;
      fromTime=primary.stridePhase*fromDur;
    }else{
      fromTime=resolveStrideSample(actor,fromClip,time,clips).time;
    }
  }
  return {weight:wTo,blend:{clip:fromClip,time:fromTime,loop:fromLoop,weight:wFrom}};
}

export function resolveLodWithHysteresis(distance,limits,currentKey,nation,quality,sources){
  let lod=distance<limits.near?0:distance<limits.middle?1:2;
  if(currentKey){
    const [curNation,curLodStr]=currentKey.split(':'),curLod=Number(curLodStr);
    if(curNation===nation&&Number.isInteger(curLod)){
      if(curLod===0&&lod===1&&limits.near>0&&distance<limits.near+LOD_HYSTERESIS_M)lod=0;
      else if(curLod===1&&lod===0&&limits.near>0&&distance>limits.near-LOD_HYSTERESIS_M)lod=1;
      else if(curLod===1&&lod===2&&distance<limits.middle+LOD_HYSTERESIS_M)lod=1;
      else if(curLod===2&&lod===1&&distance>limits.middle-LOD_HYSTERESIS_M)lod=2;
    }
  }
  if(nation==='de'&&quality!=='high'&&lod<2)lod=2;
  while(lod<3&&sources&&!sources.has(`${nation}:${lod}`))lod++;
  return lod;
}
