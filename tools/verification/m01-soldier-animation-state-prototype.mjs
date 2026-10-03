// Isolated mathematical/state prototype for M01-SOLDIER-LOCOMOTION-ANIMATION-ARCHITECTURE-V1.
// It does not load GLBs and is not imported by production code.

const TAU=Math.PI*2,DEG=Math.PI/180;
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const shortestAngle=a=>{let x=(a+Math.PI)%TAU;if(x<0)x+=TAU;return x-Math.PI;};
export const moveTowardsAngle=(current,target,maxStep)=>current+clamp(shortestAngle(target-current),-maxStep,maxStep);
const clone=v=>structuredClone(v);

export const DEFAULT_ANIMATION_PROFILE=Object.freeze({
  idleEpsilonMps:.08,
  gaitSwitchMps:2.7,
  locomotion:Object.freeze({
    walk:Object.freeze({nominalSpeedMps:1.8,cycleDuration:1,safePlayback:[.8,1.2]}),
    run:Object.freeze({nominalSpeedMps:4.2,cycleDuration:.68,safePlayback:[.82,1.18]}),
    crouch_walk:Object.freeze({nominalSpeedMps:1.2,cycleDuration:1.1,safePlayback:[.8,1.2]}),
    prone_crawl:Object.freeze({nominalSpeedMps:.55,cycleDuration:1.4,safePlayback:[.8,1.2]}),
    backpedal:Object.freeze({nominalSpeedMps:1.2,cycleDuration:1.1,safePlayback:[.8,1.2]}),
    strafe_left:Object.freeze({nominalSpeedMps:1.5,cycleDuration:1.05,safePlayback:[.8,1.2]}),
    strafe_right:Object.freeze({nominalSpeedMps:1.5,cycleDuration:1.05,safePlayback:[.8,1.2]})
  }),
  postureTransitions:Object.freeze({
    'STAND>CROUCH':.35,'CROUCH>STAND':.35,
    'CROUCH>PRONE':.65,'PRONE>CROUCH':.65,
    'STAND>PRONE':1,'PRONE>STAND':1
  }),
  maxVisualTurnRate:300*DEG,
  turnInPlaceThreshold:48*DEG,
  movingTurnThreshold:70*DEG,
  maxUpperBodyTwist:55*DEG,
  maxAimPitch:45*DEG,
  minAimPitch:-35*DEG,
  detailRateRange:[.97,1.03]
});

function hash32(text){let h=2166136261>>>0;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
export function deterministicVariation(actorId){
  const h=hash32(actorId),h2=hash32(`${actorId}:detail`);
  const phase01=(h&0xffff)/65536,idleVariant=(h>>>16)%3,t=(h2&0xffff)/65535;
  return {phase01,idleVariant,detailRate:.97+t*.06};
}

export function createAnimationState(actorId,{now=0,posture='STAND',bodyYaw=0}={}){
  const variation=deterministicVariation(actorId);
  return {prototypeSchema:1,actorId,lastNow:now,posture,postureTransition:null,visualBodyYaw:bodyYaw,
    baseLocomotion:'idle',phaseCycles:variation.phase01,lastPlaybackRate:1,upperBodyWeapon:'none',reaction:'none'};
}

function speedFrom(actor){
  if(Number.isFinite(actor.worldSpeedMps))return Math.max(0,actor.worldSpeedMps);
  const v=actor.velocity??{x:0,y:0,z:0};return Math.hypot(v.x??0,v.y??0,v.z??0);
}
function movementYawFrom(actor,intent){
  if(Number.isFinite(intent?.movementYaw))return intent.movementYaw;
  const v=actor.velocity??{};if(Math.hypot(v.x??0,v.z??0)>.0001)return Math.atan2(v.z,v.x);
  return actor.facing??0;
}
function acceptedPosture(actor){return ['STAND','CROUCH','PRONE','MOUNTED','DRAGGING'].includes(actor.posture)?actor.posture:'STAND';}

export function selectLocomotionSemantic(actor,intent={},profile=DEFAULT_ANIMATION_PROFILE){
  if(!actor.alive)return 'fallen';
  const posture=acceptedPosture(actor),speed=speedFrom(actor);
  if(posture==='MOUNTED')return 'mounted';
  if(posture==='DRAGGING')return speed>profile.idleEpsilonMps?'drag_move':'drag_idle';
  if(posture==='PRONE')return speed>profile.idleEpsilonMps?'prone_crawl':'prone';
  if(posture==='CROUCH')return speed>profile.idleEpsilonMps?'crouch_walk':'crouch_idle';
  if(speed<=profile.idleEpsilonMps)return 'idle';
  const moveYaw=movementYawFrom(actor,intent),delta=shortestAngle(moveYaw-(actor.facing??0)),abs=Math.abs(delta);
  if(abs>135*DEG)return 'backpedal';
  if(abs>55*DEG)return delta>0?'strafe_right':'strafe_left';
  return speed>=profile.gaitSwitchMps?'run':'walk';
}

export function playbackForLocomotion(semantic,speed,profile=DEFAULT_ANIMATION_PROFILE){
  const meta=profile.locomotion[semantic];if(!meta)return {rate:1,rawRate:1,withinSafeBand:true,nominalSpeedMps:0,cycleDuration:1};
  const raw=speed/meta.nominalSpeedMps,[min,max]=meta.safePlayback;
  return {rate:clamp(raw,min,max),rawRate:raw,withinSafeBand:raw>=min&&raw<=max,nominalSpeedMps:meta.nominalSpeedMps,cycleDuration:meta.cycleDuration};
}

function transitionDuration(from,to,profile){return profile.postureTransitions[`${from}>${to}`]??.4;}
function updatePostureState(state,target,now,profile){
  let t=state.postureTransition;
  if(t&&target!==t.to){t={from:t.to,to:target,startedAt:now,duration:transitionDuration(t.to,target,profile)};}
  else if(!t&&target!==state.posture)t={from:state.posture,to:target,startedAt:now,duration:transitionDuration(state.posture,target,profile)};
  if(t){const progress=clamp((now-t.startedAt)/t.duration,0,1);if(progress>=1){state.posture=t.to;state.postureTransition=null;}else state.postureTransition={...t,progress};}
  return state.postureTransition;
}

function upperBodyLayer(input){
  const actor=input.actor,weapon=input.weapon??{},intent=input.intent??{};
  if(!actor.alive)return {state:'death',blocks:[]};
  if(weapon.reloading)return {state:'reload',blocks:['aim','fire'],allowLocomotion:weapon.reloadPolicy?.allowLocomotion??'weapon-specific'};
  if(weapon.boltCycling)return {state:'bolt',blocks:['fire'],allowLocomotion:true};
  if(weapon.firing)return {state:'fire',blocks:[],allowLocomotion:true,recoilAdditive:true};
  if(intent.fireMode&&intent.fireMode!=='NONE')return {state:'aim',blocks:[],allowLocomotion:true};
  return {state:'carry',blocks:[],allowLocomotion:true};
}

function reactionLayer(input){
  const c=input.condition??{};if(!input.actor.alive)return {state:'none'};
  if(c.hitReaction)return {state:'hit',direction:c.hitReaction.direction??null,intensity:clamp(c.hitReaction.intensity??1,0,1),startedAt:c.hitReaction.startedAt??input.now};
  if(c.pinned||c.suppressed)return {state:c.pinned?'pinned-flinch':'suppression-flinch',direction:c.sourceDirection??null,intensity:c.pinned?1:.45};
  return {state:'none'};
}

export function resolveAnimationFrame(previous,input,profile=DEFAULT_ANIMATION_PROFILE){
  const beforeActor=clone(input.actor),state=clone(previous),paused=Boolean(input.paused);
  if(state.actorId!==input.actorId)throw new Error('animation state actor mismatch');
  const effectiveNow=paused?state.lastNow:input.now;
  if(!Number.isFinite(effectiveNow)||effectiveNow<state.lastNow)throw new Error('animation clock moved backwards');
  const dt=paused?0:effectiveNow-state.lastNow,speed=speedFrom(input.actor),posture=acceptedPosture(input.actor);
  updatePostureState(state,posture,effectiveNow,profile);

  let semantic=selectLocomotionSemantic(input.actor,input.intent,profile);
  const aimYaw=Number.isFinite(input.intent?.aimYaw)?input.intent.aimYaw:(input.actor.facing??0);
  const aimPitch=clamp(input.intent?.aimPitch??0,profile.minAimPitch,profile.maxAimPitch);
  const authoritativeYaw=input.actor.facing??0,rawAimFromBody=shortestAngle(aimYaw-authoritativeYaw);
  const needsBodyFollow=Math.abs(rawAimFromBody)>profile.maxUpperBodyTwist;
  const followYaw=needsBodyFollow?aimYaw-Math.sign(rawAimFromBody)*profile.maxUpperBodyTwist:authoritativeYaw;
  // Presentation may lead the authoritative body only slightly; larger aim error remains a signal that gameplay/AI facing must catch up.
  const maxLead=20*DEG,lead=clamp(shortestAngle(followYaw-authoritativeYaw),-maxLead,maxLead),visualTarget=authoritativeYaw+lead;
  const previousYaw=state.visualBodyYaw;
  state.visualBodyYaw=moveTowardsAngle(state.visualBodyYaw,visualTarget,profile.maxVisualTurnRate*dt);
  const visualTurnError=shortestAngle(visualTarget-previousYaw);
  if(speed<=profile.idleEpsilonMps&&Math.abs(visualTurnError)>=profile.turnInPlaceThreshold)
    semantic=visualTurnError>0?'turn_left':'turn_right';

  const aimOffsetYaw=clamp(shortestAngle(aimYaw-state.visualBodyYaw),-profile.maxUpperBodyTwist,profile.maxUpperBodyTwist);
  const playback=playbackForLocomotion(semantic,speed,profile),oldBase=state.baseLocomotion;
  if(dt>0){
    const movingMeta=profile.locomotion[semantic];
    const cycle=movingMeta?.cycleDuration??(semantic==='idle'||semantic==='crouch_idle'||semantic==='prone'?4:1);
    const rate=movingMeta?playback.rate:deterministicVariation(state.actorId).detailRate;
    state.phaseCycles+=dt*rate/cycle;
  }
  state.baseLocomotion=semantic;state.lastPlaybackRate=playback.rate;state.upperBodyWeapon=upperBodyLayer(input).state;state.reaction=reactionLayer(input).state;
  if(!paused)state.lastNow=effectiveNow;

  const variation=deterministicVariation(state.actorId),upperBody=upperBodyLayer(input),reaction=reactionLayer(input);
  const plan={
    actorId:state.actorId,
    baseLocomotion:semantic,
    previousBaseLocomotion:oldBase,
    posture:state.posture,
    acceptedPosture:posture,
    desiredPosture:input.intent?.desiredPosture??posture,
    postureRequestPending:(input.intent?.desiredPosture??posture)!==posture,
    postureTransition:state.postureTransition?clone(state.postureTransition):null,
    worldSpeedMps:speed,
    playback,
    phase01:((state.phaseCycles%1)+1)%1,
    visualBodyYaw:state.visualBodyYaw,
    authoritativeBodyYaw:authoritativeYaw,
    turnInPlace:semantic==='turn_left'||semantic==='turn_right'?semantic:null,
    aimOffset:{yaw:aimOffsetYaw,pitch:aimPitch,needsBodyFollow,requestedFollowYaw:followYaw},
    upperBody,
    reaction,
    suppression:{suppressed:Boolean(input.condition?.suppressed),pinned:Boolean(input.condition?.pinned),sourceDirection:clone(input.condition?.sourceDirection??null)},
    cover:clone(input.intent?.cover??null),
    additive:{recoil:Boolean(input.weapon?.firing),detailPhase01:(variation.phase01+effectiveNow*variation.detailRate*.1)%1},
    ik:{
      rightHand:clone(input.weapon?.sockets?.grip_r??null),
      leftHand:clone(input.weapon?.sockets?.grip_l??null),
      butt:clone(input.weapon?.sockets?.butt??null),
      mount:clone(input.weapon?.mountTarget??null),
      feet:clone(input.terrain?.feet??null)
    },
    specialized:input.specialized??null,
    paused
  };
  if(JSON.stringify(input.actor)!==JSON.stringify(beforeActor))throw new Error('animation resolver mutated authoritative actor');
  return {state,plan};
}

export function animationFidelityPolicy({quality='medium',distance=0}={}){
  const q=['low','medium','high'].includes(quality)?quality:'medium';
  let tier=distance<20?'near':distance<65?'mid':'far';
  if(q==='low'&&tier==='near')tier='mid';
  if(q==='medium'&&tier==='near'&&distance>12)tier='mid';
  const table={
    near:{skeleton:'full',prototypeUpdateHz:60,footIK:true,handIK:true,secondary:true,additive:'full'},
    mid:{skeleton:'asset-dependent',prototypeUpdateHz:30,footIK:false,handIK:'weapon-critical',secondary:false,additive:'important'},
    far:{skeleton:'reduced',prototypeUpdateHz:12,footIK:false,handIK:false,secondary:false,additive:'coarse'}
  };
  return {quality,distance,tier,...table[tier],note:'prototype fidelity budget; not measured renderer/GPU performance'};
}

export function snapshotAnimationState(state){return clone(state);}
export function validateAnimationState(s){
  const fail=m=>{throw new Error(`invalid animation prototype state: ${m}`);};
  if(!s||s.prototypeSchema!==1||typeof s.actorId!=='string'||!s.actorId)fail('header');
  if(!Number.isFinite(s.lastNow)||!Number.isFinite(s.visualBodyYaw)||!Number.isFinite(s.phaseCycles)||!Number.isFinite(s.lastPlaybackRate))fail('numbers');
  if(!['STAND','CROUCH','PRONE','MOUNTED','DRAGGING'].includes(s.posture))fail('posture');
  if(s.postureTransition){const t=s.postureTransition;if(!['STAND','CROUCH','PRONE','MOUNTED','DRAGGING'].includes(t.from)||!['STAND','CROUCH','PRONE','MOUNTED','DRAGGING'].includes(t.to)||
    !Number.isFinite(t.startedAt)||!Number.isFinite(t.duration)||t.duration<=0||!Number.isFinite(t.progress)||t.progress<0||t.progress>1)fail('posture transition');}
  return true;
}
export function restoreAnimationState(target,raw){const candidate=clone(raw);validateAnimationState(candidate);for(const k of Object.keys(target))delete target[k];Object.assign(target,candidate);return target;}

export function semanticPlanFingerprint(plan){
  const copy=clone(plan);delete copy.paused;return JSON.stringify(copy);
}

export function prototypeInput(overrides={}){
  const base={now:0,paused:false,actorId:'pl_test_0',actor:{position:{x:0,y:0,z:0},facing:0,alive:true,health:100,posture:'STAND',worldSpeedMps:0,weaponId:'kb_wz29'},
    intent:{action:'IDLE',desiredPosture:'STAND',movementYaw:0,aimYaw:0,aimPitch:0,fireMode:'NONE',cover:null},
    weapon:{firing:false,boltCycling:false,reloading:false,reloadPolicy:{allowLocomotion:'slow'},sockets:{grip_r:[0,0,0],grip_l:[0,0,-.36],butt:[0,-.045,.335]}},
    condition:{suppressed:false,pinned:false,sourceDirection:null,hitReaction:null},terrain:{feet:null},specialized:null};
  const out=clone(base);
  for(const [k,v] of Object.entries(overrides))out[k]=v&&typeof v==='object'&&!Array.isArray(v)&&base[k]&&typeof base[k]==='object'?{...base[k],...clone(v)}:clone(v);
  return out;
}

export function runPrototypeScenarios(){
  let state=createAnimationState('pl_test_0');
  let input=prototypeInput({now:.1});let r=resolveAnimationFrame(state,input);const idle=r.plan.baseLocomotion;state=r.state;
  input=prototypeInput({now:.2,actor:{worldSpeedMps:1.8},intent:{action:'MOVE_TO_COVER',desiredPosture:'STAND',movementYaw:0,aimYaw:0}});r=resolveAnimationFrame(state,input);const walk={semantic:r.plan.baseLocomotion,rate:r.plan.playback.rate};state=r.state;
  input=prototypeInput({now:.3,actor:{worldSpeedMps:4.2},intent:{action:'BOUND_MOVE',desiredPosture:'STAND',movementYaw:0,aimYaw:0}});r=resolveAnimationFrame(state,input);const run={semantic:r.plan.baseLocomotion,rate:r.plan.playback.rate};

  let c=createAnimationState('pl_crouch');c=resolveAnimationFrame(c,prototypeInput({actorId:'pl_crouch',now:.1,actor:{posture:'CROUCH',worldSpeedMps:1.2},intent:{desiredPosture:'CROUCH',movementYaw:0,aimYaw:0}})).state;
  const crouch=resolveAnimationFrame(c,prototypeInput({actorId:'pl_crouch',now:.3,actor:{posture:'CROUCH',worldSpeedMps:1.2},intent:{desiredPosture:'CROUCH',movementYaw:0,aimYaw:0}})).plan;

  let turn=createAnimationState('de_turn',{bodyYaw:0});const turnPlan=resolveAnimationFrame(turn,prototypeInput({actorId:'de_turn',now:.2,actor:{facing:Math.PI,worldSpeedMps:0},intent:{aimYaw:Math.PI,desiredPosture:'STAND'}})).plan;
  return {idle,walk,run,crouch:{semantic:crouch.baseLocomotion,transition:crouch.postureTransition},turn:{semantic:turnPlan.baseLocomotion,aimOffsetYaw:turnPlan.aimOffset.yaw,needsBodyFollow:turnPlan.aimOffset.needsBodyFollow}};
}

export function benchmarkPrototype(iterations=100000){
  let state=createAnimationState('bench_0'),checksum=0;const start=performance.now();
  for(let i=1;i<=iterations;i++){
    const speed=i%4===0?0:i%3===0?4.2:1.8,aim=(i%120-60)*DEG;
    const input=prototypeInput({actorId:'bench_0',now:i/60,actor:{worldSpeedMps:speed,facing:Math.sin(i*.001)*.2,posture:i%500<40?'CROUCH':'STAND'},
      intent:{desiredPosture:i%500<40?'CROUCH':'STAND',movementYaw:0,aimYaw:aim,fireMode:i%17===0?'AIM':'NONE'},weapon:{firing:i%37===0}});
    const r=resolveAnimationFrame(state,input);state=r.state;checksum=(checksum+Math.round((r.plan.phase01+r.plan.visualBodyYaw+10)*1e5))>>>0;
  }
  const elapsedMs=performance.now()-start;return {iterations,elapsedMs,usPerDecision:elapsedMs*1000/iterations,checksum};
}

if(process.argv[1]&&import.meta.url===new URL(`file://${process.argv[1]}`).href){
  const i=process.argv.indexOf('--benchmark');
  process.stdout.write(JSON.stringify(i>=0?benchmarkPrototype(Number(process.argv[i+1]??100000)):runPrototypeScenarios(),null,2)+'\n');
}
