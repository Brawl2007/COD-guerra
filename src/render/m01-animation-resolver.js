// M01 animation resolver: pure presentation decisions. No THREE, no renderer objects, no RNG, no wall clock. Nothing here decides gameplay.
// One module, two layers that meet in M01Characters:
//  * Clip selection (Argon Animation Resolver V1/V2, PRs #62/#64): motion-driven gait and odometer stride, turn clips, hit_front /
//    near_miss_duck reactions, explicit rifle reload, torso twist, bounded support-arm hint, LOD hysteresis. genericCandidate() is the
//    ordinary-soldier tail of M01Characters.sample() and is called by it, so the pure selection and the renderer cannot drift apart.
//  * Cross-fade (T35, sim-time blended resolver): refineCandidate() adds rate, odometer phase from GLB extras and the death clock, and
//    resolveAnimation() turns (actor data, mission clock, previous blend record) into a weighted clip stack. The same state at the same
//    sim time yields the same weights and clip times; pause, LOD swaps and reloads rebuild the same pose.

import {selectLodBand,LOD_ACTOR_HYSTERESIS_M} from './m01-lod-policy.js';

// ================================ clip selection (Argon V1/V2) ================================
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
export const LOD_HYSTERESIS_M=LOD_ACTOR_HYSTERESIS_M;

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

// `time` (optional, sim seconds) enables the T35 HOLD: a labelled mover (pose.moving) whose saved gait went idle less than HOLD ago
// keeps the label's gait, because a mover pushed against cover alternates 0/non-zero distance every tick. Without `time` the
// saved gait is trusted at once (V1 behaviour).
export function resolveLocomotionGait(actor,pose,time){
  if(!actor?.alive||pose?.underFire||actor?.shot>0||
     ['fallen','wounded','carried','seated','prone','pinned'].includes(pose?.name))return 'idle';
  const m=actor.motion;
  const held=Boolean(m&&typeof m==='object'&&m.gait==='idle'&&pose?.moving&&Number.isFinite(time)&&
    Number.isFinite(m.gaitSince)&&time-m.gaitSince<HOLD);
  if(m&&typeof m==='object'&&!held){
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

// `phaseOffset` (optional) replaces the per-actor time offset of the unsynchronised fallback; M01Characters passes the same value.
export function resolveStrideSample(actor,clipName,time=0,clips=null,phaseOffset){
  const h=actorHash(actor?.id),offset=Number.isFinite(phaseOffset)?phaseOffset:(h%1000)/250,idPhase=(h%1000)/1000;
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
  // near/middle bands through the single LOD policy (T43); the cull edge is decided by the caller (selectConsumerLod('actors')).
  let previous=null;
  if(currentKey){const [curNation,curLodStr]=currentKey.split(':'),curLod=Number(curLodStr);if(curNation===nation&&Number.isInteger(curLod))previous=curLod;}
  let lod=selectLodBand(distance,[limits.near,limits.middle],previous,{hysteresis:LOD_HYSTERESIS_M});
  if(nation==='de'&&quality!=='high'&&lod<2)lod=2;
  while(lod<3&&sources&&!sources.has(`${nation}:${lod}`))lod++;
  return lod;
}

// What an ordinary soldier plays once no special adapter (fallen, MG34, CKM, station drag, carry, sapper, combat reaction, pinned,
// RKM) claims the actor. M01Characters.sample() ends with this call, and tests/m01-animation-player holds the two together.
// `clips` needs has(name) plus get(name) (THREE clip: duration, userData) or info(name) (duration, GLB extras); size is optional.
// Raw candidate: refineCandidate() then adds rate, the GLB odometer phase and the death clock.
export function genericCandidate(actor,pose,time,offset,clips){
  const boltDuration=clips?.info?.('fire_bolt')?.duration??clips?.get?.('fire_bolt')?.duration??1.17;
  const fireAge=time-actor.firedAt;
  if(pose.aiming&&Number.isFinite(fireAge)&&fireAge>=0&&fireAge<boltDuration)return {clip:'fire_bolt',time:fireAge,loop:false};
  const explicitReload=resolveRiflemanReload(actor,time,pose,clips);
  if(explicitReload)return explicitReload;
  const gait=resolveLocomotionGait(actor,pose,time);
  if(gait!=='idle'){
    const preferred=gait==='crouch_walk'?'crouch_walk':gait==='sprint'?'sprint':gait==='run'?'run':'walk';
    const clipName=resolveAvailableClip(preferred,clips);
    const stride=resolveStrideSample(actor,clipName,time,clips,offset);
    const primary={clip:clipName,time:stride.time,loop:true,stridePhase:stride.stridePhase,strideSynced:stride.strideSynced};
    const transition=resolveTransitionBlend(actor,pose,primary,time,clips);
    return transition?{...primary,...transition}:primary;
  }
  const orientation=resolveTorsoOrientation(actor,pose);
  const turn=resolveTurnClip(actor,pose,orientation.yawDelta,clips);
  if(turn)return turn;
  const idle=pose.aiming?'aim':actor.crouched||actor.posture==='crouch'?
    resolveAvailableClip('crouched_idle',clips):resolveAvailableClip('standing_idle',clips);
  const primary={clip:idle,time:time+offset,loop:true};
  const transition=resolveTransitionBlend(actor,pose,primary,time,clips);
  return transition?{...primary,...transition}:primary;
}

// ================================ cross-fade (T35) ================================

// Cross-fade lengths in sim seconds. Posture changes are the slow ones (stand <-> crouch, ~0.3 s).
export const FADE=Object.freeze({posture:.3,death:.2,fromLoco:.25,toFire:.08,fromFire:.15,toPinned:.15,fromPinned:.3,default:.2});
// A stopped gait is only trusted after this long: a mover pushed against cover alternates 0/non-zero distance every tick.
export const HOLD=.25;
// More than this long without seeing the actor (or going back in time after a load) resets the blend record.
export const GAP=1;
const MAX_LAYERS=4,EPS=1e-9,OFFSET_SPAN=4;

const finite=Number.isFinite;
export const smoothstep=x=>{const t=clamp(x,0,1);return t*t*(3-2*t);};
export const wrapTime=(t,d)=>d>0?(t>=0?t%d:((t%d)+d)%d):0;

const IDLE=new Set(['standing_idle','crouched_idle','rkm_standing_idle','rkm_crouched_idle']);
const LOCO=new Set(['walk','run','sprint','crouch_walk','rkm_walk','rkm_run']);
const CROUCHED=new Set(['crouched_idle','rkm_crouched_idle','pinned','crouch_walk','sapper_work','sapper_work_pinned','rkm_reload']);
// Authored, simulation-synchronised clips (MG34 prone/burst, CKM crew, station drag pairs): muzzle and partner timing must not drift.
const EXACT=/^(mg34_|ckm_wz30_|station_drag_)/;
export const isExactClip=name=>EXACT.test(name);
export const isLocomotionClip=name=>LOCO.has(name);
export const isIdleClip=name=>IDLE.has(name);
const crouchedClip=name=>CROUCHED.has(name);

// Seconds of cross-fade when the target clip changes from `from` to `to`; 0 means a deliberate hard switch.
export function fadeDuration(from,to){
  if(to==='fallen')return FADE.death;
  if(isExactClip(from)||isExactClip(to))return 0;
  if(to==='fire_bolt'||to==='rkm_fire_burst')return FADE.toFire;
  if(from==='fire_bolt'||from==='rkm_fire_burst')return FADE.fromFire;
  if(to==='pinned')return FADE.toPinned;
  if(from==='pinned')return FADE.fromPinned;
  if(crouchedClip(from)!==crouchedClip(to))return FADE.posture;
  if(LOCO.has(from)&&!LOCO.has(to))return FADE.fromLoco;
  return FADE.default;
}

// ---- locomotion: foot phase from the saved odometer -------------------------------------------------------------
// Metres travelled per clip loop at the clip's nominal speed.
export function strideCycle(info){
  if(!info)return 0;
  if(finite(info.cycle_distance_m)&&info.cycle_distance_m>0)return info.cycle_distance_m;
  return finite(info.speed_mps)&&info.speed_mps>0&&info.duration>0?info.speed_mps*info.duration:0;
}
// With schema-2 motion data the clip phase is odometer/cycle: feet advance exactly as far as the root, whatever the speed.
// Without it (legacy saves, plain fixtures) the old wall-free `time+offset` playback is kept.
export function locomotionSample(name,info,actor,time,offset){
  const cycle=strideCycle(info),m=actor.motion;
  if(cycle>0&&m&&finite(m.odometer)){
    const phase=m.odometer/cycle+offset/OFFSET_SPAN;
    return {clip:name,time:(phase-Math.floor(phase))*info.duration,loop:true,rate:finite(m.speed)?m.speed/cycle*info.duration:1,source:'odometer'};
  }
  return {clip:name,time:time+offset,loop:true,rate:1,source:'time'};
}
// Locomotion is the pose label AND real motion; a label with a gait that has been idle for HOLD seconds means "blocked".
export function isLocomoting(actor,pose,time){
  if(!pose.moving)return false;
  const m=actor.motion;
  return !m||m.gait!=='idle'||!(time-m.gaitSince>=HOLD);
}
export function locomotionClip(actor,clips,{rkm=false,hint}={}){
  const gait=actor.motion?.gait,prefix=rkm?'rkm_':'';
  if(gait==='sprint'&&!rkm&&clips.has('sprint'))return 'sprint';
  if(gait==='run'||gait==='sprint')return prefix+'run';
  if(gait==='walk')return prefix+'walk';
  if(LOCO.has(hint)&&hint.startsWith('rkm_')===rkm)return hint; // held gait: keep the clip that was playing
  if(rkm)return actor.state==='RETREAT'?'rkm_run':'rkm_walk';
  return actor.group==='grp_east_platoon'?'run':'walk';
}
export const nominalSpeed=info=>{const c=strideCycle(info);return c>0?c/info.duration:0;};

// The clip chosen by M01Characters.sample() (adapter precedence, unchanged) becomes a resolver candidate:
// real motion decides which locomotion clip plays and where its feet are in the cycle, a body that is blocked
// stands instead of marching on the spot, a corpse gets a fall clock, and each clip says how fast its time runs.
const MOVER=new Set(['walk','run','rkm_walk','rkm_run']);
// Non-looping clips driven by "age" (time since a sim stamp) advance in real sim time; held frames do not.
const AGE_DRIVEN=/^(fire_bolt|rkm_fire_burst|rkm_reload|mg34_|ckm_wz30_|station_drag_)/;
export function refineCandidate(s,{actor,pose,time,offset,clips,hint}){
  let c=s;
  if(pose.name==='fallen'&&s.clip==='fallen'){
    c={clip:'fallen',time:s.time,loop:false,rate:0,kind:'death',...(finite(actor.diedAt)?{since:actor.diedAt}:{})};
  }else if(MOVER.has(s.clip)&&pose.moving){
    const rkm=s.clip.startsWith('rkm_');
    if(isLocomoting(actor,pose,time)){
      const name=locomotionClip(actor,clips,{rkm,hint}),use=clips.has(name)?name:s.clip;
      c=locomotionSample(use,clips.info(use),actor,time,offset);
    }else{
      const idle=rkm?'rkm_standing_idle':'standing_idle'; // a moving pose is never crouched or aiming
      if(clips.has(idle))c={clip:idle,time:time+offset,loop:true,rate:1};
    }
  }else if(s.clip==='crouched_idle'&&pose.name==='crouched'&&!pose.underFire&&actor.motion?.gait==='crouch_walk'&&clips.has('crouch_walk')){
    c=locomotionSample('crouch_walk',clips.info('crouch_walk'),actor,time,offset);
  }
  const loop=Boolean(c.loop);
  return {...c,loop,duration:clips.info(c.clip)?.duration??0,rate:finite(c.rate)?c.rate:loop||AGE_DRIVEN.test(c.clip)?1:0,exact:isExactClip(c.clip)};
}
export const selectGeneric=({actor,pose,time,offset,clips,hint})=>
  refineCandidate(genericCandidate(actor,pose,time,offset,clips),{actor,pose,time,offset,clips,hint});

// ---- blend record ---------------------------------------------------------------------------------------------------
// state = {t, target, start, dur, alive, deadAt, layers:[{clip,loop,duration,t0,time0,rate,w0}]}
// While a fade runs (progress c = smoothstep((T-start)/dur)) the target weighs w0+(1-w0)c and every other layer w0(1-c),
// where w0 is the layer weight when the fade began. Weights always sum to 1, a retarget in mid-fade does not pop, and
// each layer's clip time is extrapolated from its last sample with its own rate: no dt accumulation anywhere.
const progress=(st,T)=>st.dur>0?smoothstep((T-st.start)/st.dur):1;
export function layerWeights(st,T){
  const c=progress(st,T);
  return st.layers.map(l=>l.clip===st.target?l.w0+(1-l.w0)*c:l.w0*(1-c));
}
export function layerTime(l,T){
  const raw=l.time0+l.rate*(T-l.t0);
  return l.loop?wrapTime(raw,l.duration):clamp(raw,0,l.duration);
}
const layer=(c,w0,T)=>({clip:c.clip,loop:c.loop,duration:c.duration,t0:T,time0:c.time,rate:c.rate,w0});
const normalize=c=>({...c,loop:Boolean(c.loop),duration:c.duration>0?c.duration:0,rate:finite(c.rate)?c.rate:c.loop?1:0});
const fresh=(c,T)=>({target:c.clip,start:T,dur:0,layers:[layer(c,1,T)]});

function prune(layers,target){
  let kept=layers.filter(l=>l.clip===target||l.w0>=1e-3);
  while(kept.length>MAX_LAYERS){
    let worst=-1;
    kept.forEach((l,i)=>{if(l.clip!==target&&(worst<0||l.w0<kept[worst].w0))worst=i;});
    kept=kept.filter((_,i)=>i!==worst);
  }
  const sum=kept.reduce((s,l)=>s+l.w0,0);
  if(sum>0&&Math.abs(sum-1)>EPS)kept=kept.map(l=>({...l,w0:l.w0/sum}));
  else if(!(sum>0))kept=kept.map(l=>({...l,w0:l.clip===target?1:0}));
  return kept;
}

// Which sim timestamp explains this clip change, if any (the fade then starts when the sim says it happened).
function transitionStamp(from,cand,actor,deadAt){
  if(cand.kind==='death')return deadAt;
  if(crouchedClip(from)!==crouchedClip(cand.clip)&&finite(actor.postureSince))return actor.postureSince;
  if(!LOCO.has(from)&&LOCO.has(cand.clip))return actor.motion?.gaitSince;
  return NaN;
}

// Rebuild an in-flight fade from sim data alone (fresh renderer after a load, or a new instance with no history).
// `alt(patch)` is the same clip selection for the actor as if the earlier state still held.
function derive(actor,T,cand,deadAt,alt){
  if(!alt)return null;
  let stamp=NaN,patch=null,plausible=()=>true;
  if(cand.kind==='death'){stamp=deadAt??NaN;patch={alive:true};}
  // postureSince/gaitSince default to clock-1 (or 0 at mission start) when unknown: only a stamp > 0 is a real event.
  // The earlier posture flips both the flag and the saved posture: the clip selection reads either (actorPoseName, genericCandidate).
  else if(IDLE.has(cand.clip)&&actor.postureSince>0&&(actor.posture==='stand'||actor.posture==='crouch')){
    stamp=actor.postureSince;patch={crouched:!actor.crouched,posture:actor.posture==='crouch'?'stand':'crouch'};plausible=f=>IDLE.has(f.clip)&&crouchedClip(f.clip)!==crouchedClip(cand.clip);
  }else if(LOCO.has(cand.clip)&&actor.motion?.gaitSince>0){
    stamp=actor.motion.gaitSince;patch={state:'GUARD',motion:{...actor.motion,gait:'idle'}};plausible=f=>!LOCO.has(f.clip);
  }
  if(!patch||!(stamp<=T)||T-stamp>=FADE.posture+EPS)return null;
  const from=alt(patch);
  if(!from||from.clip===cand.clip||!plausible(from))return null;
  const dur=fadeDuration(from.clip,cand.clip);
  if(!(dur>0)||T-stamp>=dur)return null;
  return {target:cand.clip,start:stamp,dur,layers:[layer(normalize(from),1,T),layer(cand,0,T)]};
}

function retarget(prev,cand,T,actor,deadAt){
  const dur=fadeDuration(prev.target,cand.clip);
  if(!(dur>0))return fresh(cand,T);
  const stamp=transitionStamp(prev.target,cand,actor,deadAt);
  // Only a timestamp inside this observation interval can have caused the change; anything older is unrelated.
  const start=finite(stamp)&&stamp>=prev.t-EPS&&stamp<=T?stamp:T;
  const w=layerWeights(prev,start);
  let layers=prev.layers.map((l,i)=>({...l,w0:w[i]}));
  const at=layers.findIndex(l=>l.clip===cand.clip);
  if(at>=0)layers[at]={...layers[at],loop:cand.loop,duration:cand.duration,t0:T,time0:cand.time,rate:cand.rate};
  else layers.push(layer(cand,0,T));
  return {target:cand.clip,start,dur,layers:prune(layers,cand.clip)};
}

/**
 * @param {{actor:object,time:number,candidate:{clip:string,time:number,loop:boolean,duration:number,rate?:number,
 *   kind?:string,since?:number},prev?:object|null,alt?:(patch:object)=>object|null}} input
 * @returns {{clip:string,time:number,loop:boolean,blend:Array<{clip:string,weight:number,time:number,loop:boolean,target:boolean}>,
 *   state:object,fade:{progress:number,dur:number}}}
 */
export function resolveAnimation({actor,time:T,candidate,prev=null,alt=null}){
  const cand=normalize(candidate);
  const cont=Boolean(prev)&&finite(prev.t)&&T>=prev.t-EPS&&T-prev.t<=GAP&&prev.layers?.length>0;
  const dead=cand.kind==='death';
  // Death clock: the simulation's diedAt when it exists; otherwise the sim time this renderer first saw the actor dead
  // (kept in the blend record, so it is a function of sim time and never of the wall clock); otherwise the final pose.
  let deadAt=null;
  if(dead){
    if(finite(cand.since))deadAt=Math.min(cand.since,T);
    else if(cont)deadAt=prev.alive?T:prev.deadAt;
    const age=deadAt===null?cand.duration:clamp(T-deadAt,0,cand.duration);
    cand.time=age;cand.rate=age<cand.duration?1:0;
  }
  let st;
  if(!cont)st=derive(actor,T,cand,deadAt,alt)??fresh(cand,T);
  else if(prev.target===cand.clip){
    const layers=prev.layers.map(l=>l.clip===cand.clip?{...l,loop:cand.loop,duration:cand.duration,t0:T,time0:cand.time,rate:cand.rate}:l);
    st={target:prev.target,start:prev.start,dur:prev.dur,layers};
  }else st=retarget(prev,cand,T,actor,deadAt);
  st.t=T;st.alive=!dead;st.deadAt=deadAt;
  const c=progress(st,T);
  if(c>=1&&st.layers.length>1){ // fade finished: only the target survives
    const own=st.layers.find(l=>l.clip===st.target);
    st.layers=[{...own,w0:1}];st.start=T;st.dur=0;
  }
  const weights=layerWeights(st,T),blend=[];
  st.layers.forEach((l,i)=>{
    const target=l.clip===st.target;
    if(weights[i]>0||target)blend.push({clip:l.clip,weight:weights[i],time:layerTime(l,T),loop:l.loop,target});
  });
  const own=blend.find(b=>b.target);
  return {clip:st.target,time:own.time,loop:own.loop,blend,state:st,fade:{progress:c,dur:st.dur}};
}
