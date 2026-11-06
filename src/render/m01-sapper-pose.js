// M01 sapper operation, presentation (R3-a, 2026-10-24): which clip each sapper plays in each phase of the operation (src/game/m01-sappers.js), chosen from the existing T08 clip library
// (no clip is authored here): the kneeling work of sapper_work at the cable (slow while he examines and while he tests, full while he splices), the kneeling look-out of cover_low_idle,
// the shout with the cupped hand of call_out (the test that gives no passage, the report to the officer), the fireman's carry of carry_walk with the crate on the shoulder (the walk to the
// second cut), the idle variants of the library for the rest. Pure: no THREE, no renderer object, no random number, no wall clock; the same (saved sapper data, sim clock) gives the same clip.
// The simulation decides the phase and the places (sim.sapperOps); this module only draws them. Nothing here is saved.
import {resolveCombatReaction} from './m01-animation-resolver.js';

/** The clips the operation needs from the library; tests/m01-sappers-render.test.js checks that every one is in the T08 manifests. */
export const SAPPER_POSE_CLIPS=Object.freeze(['sapper_work','cover_low_idle','crouched_idle','crouched_idle_b','standing_idle','standing_idle_b','standing_idle_c','call_out','carry_walk','fidget_look']);
/** The rate each work stage plays sapper_work at: slow while examining and testing, full while splicing. */
export const WORK_RATE=Object.freeze({inspect:.55,inspect2:.55,splice:1,splice2:1,test:.35,test2:.35});
/** How long the shout of call_out lasts (the library clip is 2 s): a stage or a report starts with it, then the man stands. */
export const CALL_OUT_SEC=2;
const WORK=new Set(['inspect','splice','test','inspect2','splice2','test2']);

const has=(clips,name)=>!clips||typeof clips.has!=='function'||clips.size===0||clips.has(name);
/**
 * The clip candidate for a sapper in the operation, or null when the old rules should decide (the camp, the retreat, a man on the move, a reaction, a prone or carried man). `ops` is
 * sim.sapperOps; `time` the sim clock; `offset` the actor's own phase offset (a time-driven loop begins at the same place for nobody); `clips` the clip view (has/get/info).
 */
export function sapperSample(actor,ops,time,offset,clips,pose){
  if(!ops||actor.role!=='ENGINEER'||!actor.alive||actor.state==='WOUNDED'||actor.carriedBy)return null;
  const role=ops.roles?.[actor.id],id=ops.phase;
  if(!role||id==='camp'||id==='retreat'||id==='locate')return null;
  if(actor.posture==='prone'||pose?.name==='fallen'||pose?.name==='pinned')return null;   // lying down under fire: the library's prone clips
  const moving=(actor.motion?.speed??0)>.05&&actor.motion?.gait!=='idle';
  // The helper carries the crate on the shoulder to the second cut: the fireman's carry, the stride locked to the feet as for Bąk (m01-characters.js).
  if(id==='relocate'&&role==='helper'&&ops.box?.state==='carried'&&moving&&has(clips,'carry_walk')){
    const duration=clips?.get?.('carry_walk')?.duration??2.5,phase=(actor.motion?.odometer??0)/(1.6*duration);
    return {clip:'carry_walk',time:(phase-Math.floor(phase))*duration,loop:true,rate:(actor.motion?.speed??1.6)/1.6,source:'sapper'};
  }
  if(moving)return null;   // the others walk with the ordinary gait (crouch_walk while he creeps onto his place)
  const reaction=resolveCombatReaction(actor,time,pose??{},clips);   // a near miss or a blast is still a flinch
  if(reaction)return reaction;
  const t=time+offset;
  if(WORK.has(id)){
    if(role==='watch')return {clip:has(clips,'cover_low_idle')?'cover_low_idle':'crouched_idle',time:t,loop:true};
    if(role==='helper'&&(id==='test'||id==='test2'))return {clip:has(clips,'crouched_idle_b')?'crouched_idle_b':'crouched_idle',time:t,loop:true};
    const rate=WORK_RATE[id];
    return {clip:'sapper_work',time:t*rate,loop:true,rate,source:'sapper'};
  }
  const stand=name=>({clip:has(clips,name)?name:'standing_idle',time:t,loop:true});
  if(id==='fail'){
    if(role==='leader')return ops.t<CALL_OUT_SEC&&has(clips,'call_out')?{clip:'call_out',time:ops.t,loop:false}:stand('standing_idle_c');
    return role==='helper'?{clip:has(clips,'crouched_idle_b')?'crouched_idle_b':'crouched_idle',time:t,loop:true}:{clip:has(clips,'cover_low_idle')?'cover_low_idle':'crouched_idle',time:t,loop:true};
  }
  if(id==='standby'){
    if(role==='helper')return stand('standing_idle_c');
    return {clip:role==='leader'&&has(clips,'crouched_idle_b')?'crouched_idle_b':'crouched_idle',time:t,loop:true};
  }
  if(id==='report'){
    if(role==='leader')return ops.t<CALL_OUT_SEC&&has(clips,'call_out')?{clip:'call_out',time:ops.t,loop:false}:stand('standing_idle_c');
    return stand(role==='helper'?'standing_idle_b':'standing_idle');
  }
  if(id==='ready'){
    if(role==='leader')return {clip:has(clips,'crouched_idle_b')?'crouched_idle_b':'crouched_idle',time:t,loop:true};
    return stand(role==='helper'?'standing_idle_c':'standing_idle');
  }
  if(id==='verify'||id==='verify_west')return stand(role==='leader'?'standing_idle_c':role==='helper'?'standing_idle_b':'standing_idle');
  return null;
}
