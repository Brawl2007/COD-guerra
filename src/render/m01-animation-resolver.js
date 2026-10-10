// M01 animation resolver: pure presentation decisions. No THREE, no renderer objects, no RNG, no wall clock.
// Inputs are an actor record, the mission clock `time` (sim seconds, frozen by pause) and the previous blend record.
// Output is the clip stack to play: every pose is a function of (actor data, sim time, previous record), so the same
// state at the same sim time yields the same weights and clip times. Nothing here decides gameplay.

// Cross-fade lengths in sim seconds. Posture changes are the slow ones (stand <-> crouch, ~0.3 s).
export const FADE=Object.freeze({posture:.3,death:.2,fromLoco:.25,toFire:.08,fromFire:.15,toPinned:.15,fromPinned:.3,default:.2});
// A stopped gait is only trusted after this long: a mover pushed against cover alternates 0/non-zero distance every tick.
export const HOLD=.25;
// More than this long without seeing the actor (or going back in time after a load) resets the blend record.
export const GAP=1;
const MAX_LAYERS=4,EPS=1e-9,OFFSET_SPAN=4;

const finite=Number.isFinite;
const clamp=(x,lo,hi)=>x<lo?lo:x>hi?hi:x;
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

// What an ordinary soldier plays once no special adapter (MG34, CKM, station drag, carry, sapper, RKM) claims the actor: the pure
// mirror of the generic tail of M01Characters.sample(), which stays byte-identical to the approved base. tests/m01-animation-player
// holds the two together. Raw candidate: refineCandidate() adds rate, odometer phase and the death clock.
export function genericCandidate(actor,pose,time,offset,clips){
  if(pose.moving)return {clip:actor.group==='grp_east_platoon'?'run':'walk',time:time+offset,loop:true};
  const fireAge=time-actor.firedAt,boltDuration=clips.info('fire_bolt')?.duration??1.17;
  if(pose.aiming&&Number.isFinite(fireAge)&&fireAge>=0&&fireAge<boltDuration)return {clip:'fire_bolt',time:fireAge,loop:false};
  if(pose.aiming)return {clip:'aim',time:time+offset,loop:true};
  return {clip:actor.crouched?'crouched_idle':'standing_idle',time:time+offset,loop:true};
}

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
  else if(IDLE.has(cand.clip)&&actor.postureSince>0&&(actor.posture==='stand'||actor.posture==='crouch')){
    stamp=actor.postureSince;patch={crouched:!actor.crouched};plausible=f=>IDLE.has(f.clip)&&crouchedClip(f.clip)!==crouchedClip(cand.clip);
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
