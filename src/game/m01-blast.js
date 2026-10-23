// M01 bomb effects on people (R1-a, 2026-10-23; golden amendment 16). Until now an aerial impact (m01-simulation.js impact()) only pushed a crater into sectors.damage and emitted
// `m01-blast`: the men beside it were untouched. This module is the pure part of what a bomb does to a man: no world, no clock, no random stream, no write. The simulation asks it
// "what does a blast at distance d do to this man?" and applies the answer through the paths that already exist (recordDamage, recordDeath, suppressedUntil, the WOUNDED state).
//
// GAMEPLAY VALUES, NOT BALLISTICS. The radii below are tuned for a Ju 87 B bomb of about 250 kg (HISTORICAL_RESEARCH.md: the Stukas bombed the station, the west bank and the barracks at
// 04:34). They are chosen so that a man in the open dies close to the crater, is hurt farther out, and a man behind cover or lying down survives what would kill a man standing. No
// source gives Polish casualties for this raid: every casualty this module produces is GAMEPLAY_DRAMATIZATION and must never be shown as a number or told as a fact.
//
// Everything is a pure function of its arguments. The only "variation" is a per-pair jitter derived from the ids (blastJitter), the way the code derives other variation from ids and clocks.
import {aimPoint} from './m01-aim.js';

const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
const lerp=(a,b,t)=>a+(b-a)*t;

/**
 * Effective distances in metres for a man standing in the open with the blast in his line of sight. A man's effective distance is his real distance times what shelters him
 * (cover, posture) times his own jitter, so the same bomb kills the man in the open at 12 m and lets the man behind a bank live at 7 m.
 *   d_eff <= lethalM  killed (the crater and its blast: certain death in the open)
 *   d_eff <= woundM   wounded (down, alive; health falls but never to zero)
 *   d_eff <= shakenM  shaken: pinned to the ground by the existing suppression, for suppressSec[1] at the core of the ring down to suppressSec[0] at its edge
 */
export const BOMB_BLAST=Object.freeze({
  lethalM:12,woundM:24,shakenM:50,
  coverMul:1.8,                                         // the blast has no line of sight to the man's chest (terrain, a wall, a bank, a sandbag line): 1.8 times farther
  postureMul:Object.freeze({stand:1,crouch:1.25,prone:1.6}),   // lying flat is the best defence a man has without cover
  jitter:.12,                                           // +/-12 % on the effective distance, from the (man, impact) pair: two men at the same place are not always the same casualty
  woundLoss:Object.freeze([80,45]),                     // health lost at the lethal edge and at the wound edge of the ring; the wound is clamped to leave at least 1
  suppressSec:Object.freeze([2,7]),                     // seconds pinned at the shaken edge and at the core
  sourceHeight:.4,                                      // the blast centre above the ground it fell on
});
/** The farthest a man can be affected: shakenM over the smallest factor (no cover, standing, the luckiest jitter). */
export const BOMB_REACH_M=Math.ceil(BOMB_BLAST.shakenM/(1-BOMB_BLAST.jitter));

/** The player: never wounded or killed by a bomb (F4/F1 fairness), but a near blast leaves him stunned for a few seconds: reduced sprint and a less steady rifle. */
export const CONCUSSION=Object.freeze({
  reachM:60,fullM:30,                                   // intensity 0 at reachM (scaled by cover and posture), 1 at fullM, the nearest a bomb can fall (safeImpact)
  coverMul:1.35,crouchMul:1.25,                         // a bank between the player and the crater (the rail embankment's crest) takes a quarter off the distance, no more: the shock goes over it
  minSec:2,maxSec:6,                                    // length of the effect at intensity 0+ and 1
  sprintCut:.45,walkCut:.12,                            // fraction of the speed lost at full strength
  sprintOffAt:.6,                                       // above this the player cannot sprint at all
  aimSway:2.5,                                          // the rifle's dispersion is multiplied by 1 + aimSway x level
});

/** 0..1 from a string pair, the same for the same pair on every machine (FNV-1a). */
export function blastJitter(actorId,impactId){
  let h=0x811c9dc5;const text=`${actorId}|${impactId}`;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}
  return h/4294967296;
}

/**
 * Who a bomb may never kill or wound (only shake): every member of the mission's cast (the script, the objectives, the cutscenes, the B4 rule and the squad's bounds need them
 * alive, and the survivors of the east platoon are counted by id), the east platoon and the ckm crew by group, the MG34 gunners (the repair-fire design), a man carried, and the
 * scenery with a procedural layout (the stretcher patient and the cart of the station yard). Returns the reason, or null for a man who may become a casualty.
 */
export function blastProtection(a,cast){
  if(cast.has(a.id))return 'cast';
  if(a.group==='grp_east_platoon')return 'platoon';
  if(a.group==='grp_ckm_crew')return 'ckm';
  if(a.weapon==='mg34'&&/^de_east_[01]$/.test(a.id))return 'mg34';
  if(a.carriedBy||a.carry)return 'carried';
  if(a.task==='yard_patient'||a.task==='cart')return 'scenery';
  return null;
}
/** The cast ids of a mission definition, as the set blastProtection reads. */
export const castIds=definition=>new Set(definition.cast.map(c=>c.id));

/** How a man lies for a blast: prone (flat, or a man already down), crouch or stand. The player has no posture field, only `crouched`. */
export function blastPosture(a){
  if(a.state==='WOUNDED'||a.posture==='prone')return 'prone';
  return a.posture==='crouch'||a.crouched?'crouch':'stand';
}
/** The point of a man the blast must see to hurt him: his torso (the aim point of the shots at him), or just above the ground for a man lying down. */
export function blastTarget(a){
  if(a.state==='WOUNDED'&&a.posture!=='prone')return {x:a.x,y:a.y+.3,z:a.z};
  return aimPoint(a);
}
/** A point as the object the world's line of sight takes (spatial.js eyePosition reads y + eyeHeight). */
export const sightPoint=p=>({space:'metres',x:p.x,y:p.y,z:p.z,eyeHeight:0});

/**
 * What a blast does to one man.
 *   distance   metres from the blast centre to his torso (3D)
 *   covered    the blast has no line of sight to his torso
 *   posture    'stand' | 'crouch' | 'prone'
 *   protectedBy  null for a man who may become a casualty, else why not (blastProtection): he is only ever shaken
 *   u          blastJitter of the pair, 0..1
 * Returns {outcome:'kill'|'wound'|'suppress'|'none', effective, suppressSec, healthLoss}. For a protected man a kill or wound outcome becomes the strongest shake.
 */
export function blastOutcome({distance,covered,posture,protectedBy=null,u=.5}){
  const B=BOMB_BLAST,effective=distance*(covered?B.coverMul:1)*(B.postureMul[posture]??1)*(1+B.jitter*(2*u-1));
  let outcome=effective<=B.lethalM?'kill':effective<=B.woundM?'wound':effective<=B.shakenM?'suppress':'none';
  const strongest=outcome==='kill'||outcome==='wound';
  const suppressSec=outcome==='none'?0:strongest?B.suppressSec[1]:lerp(B.suppressSec[1],B.suppressSec[0],clamp((effective-B.woundM)/(B.shakenM-B.woundM),0,1));
  let healthLoss=0;
  if(protectedBy!==null){if(strongest)outcome='suppress';}
  else if(outcome==='wound')healthLoss=lerp(B.woundLoss[0],B.woundLoss[1],clamp((effective-B.lethalM)/(B.woundM-B.lethalM),0,1));
  return {outcome,effective,suppressSec,healthLoss};
}

/** The player's concussion at the moment of a blast: peak intensity 0..1 (0 beyond reach) from the real distance, cover and crouch. */
export function concussionPeak({distance,covered=false,crouched=false}){
  const C=CONCUSSION,d=distance*(covered?C.coverMul:1)*(crouched?C.crouchMul:1);
  return clamp((C.reachM-d)/(C.reachM-C.fullM),0,1);
}
/** How long a concussion of this peak lasts, in seconds of the real clock. */
export const concussionSeconds=peak=>CONCUSSION.minSec+(CONCUSSION.maxSec-CONCUSSION.minSec)*peak;
/**
 * The level now (0..1): the saved peak falling linearly to zero over its length, ending at `concussedUntil`. Both fields are absent when nothing is wrong with him.
 * Pure function of the player's saved fields and the clock.
 */
export function concussionLevel(player,clock){
  const peak=player.concussion;if(!(peak>0))return 0;
  const left=player.concussedUntil-clock;if(!(left>0))return 0;
  return peak*Math.min(1,left/concussionSeconds(peak));
}
/**
 * A new blast against the effect already on the player: the stronger of the two, never a sum (a second bomb does not stack into a longer stun than the nearest one gives).
 * Returns the fields to write, or null when the effect he already has is stronger from now on.
 */
export function mergeConcussion(player,clock,peak){
  if(!(peak>0))return null;
  if(concussionLevel(player,clock)>=peak)return null;
  return {concussion:peak,concussedUntil:clock+concussionSeconds(peak)};
}

/**
 * Where a scheduled impact of the 04:34 raid really falls. The planned point if the player is at least 30 m from it (safeImpact's rule) and it is free (inside the playable area, not in the
 * river or a building, 20 m from the places the objectives use). Otherwise the nearest of the points 40 m from the player (the distance safeImpact would give) on bearings turned away from
 * the planned one by 0, +-30, +-60... degrees, the first that is free: so a crater is never forced onto the repair site, the rally point or the shed by the safety shift. Null when none is free,
 * and the caller falls back to safeImpact. The result is never more than 70 m from the planned point (the player stands within 30 m of it, the shift is 40 m): the validator's envelope.
 * Pure geometry; `free(x,z)` is the caller's test of the map.
 */
export const SAFE_IMPACT_M=30,SHIFTED_IMPACT_M=40;
export function earlyRaidPoint(planned,player,free){
  const away=Math.hypot(planned.x-player.x,planned.z-player.z);
  if(away>=SAFE_IMPACT_M)return free(planned.x,planned.z)?{x:planned.x,z:planned.z}:null;
  const base=Math.atan2(planned.z-player.z,planned.x-player.x);
  for(const k of [0,1,-1,2,-2,3,-3,4,-4,5,-5,6]){
    const a=base+k*Math.PI/6,x=player.x+Math.cos(a)*SHIFTED_IMPACT_M,z=player.z+Math.sin(a)*SHIFTED_IMPACT_M;
    if(free(x,z))return {x,z};
  }
  return null;
}
