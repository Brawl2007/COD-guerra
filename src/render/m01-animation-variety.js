// M01 animation variety: pure, deterministic per-actor presentation choices. No THREE, no RNG state, no wall clock, no history.
//
// Why this exists (owner playtest 2026-10: "few soldier animations", "repeated movements"): the resolver used `actorHash(id) % 1000 / 250` as the
// loop offset of every soldier. actorHash is `n*31 + charCode`, so the sequential ids the mission uses (pl_east_0, pl_east_1, ...) hash to
// consecutive integers and their loops started 4 ms apart: whole platoons breathed, aimed and strode in lockstep, all at exactly the same rate,
// and 99 % of the standing soldiers played one clip. Everything here is a pure function of (actor id, sim time, sim stamps) so a paused
// frame, a load, an LOD swap or a rewound clock rebuilds the same pose. Nothing in this file decides gameplay: it only chooses which of the
// already-authored clips a soldier shows and where in the clip it is.
//
// The clip names that are not in the loaded clip set are never chosen: a missing optional pack degrades to the previous single-clip behaviour.

const imul=Math.imul;
const finite=Number.isFinite;

/** MurmurHash3 finaliser: every input bit flips about half of the output bits (consecutive integers become unrelated). */
export function mix32(h){
  h^=h>>>16;h=imul(h,0x85ebca6b);h^=h>>>13;h=imul(h,0xc2b2ae35);h^=h>>>16;return h>>>0;
}
/** FNV-1a over the id's UTF-16 units, then the finaliser. Used only for animation choices; actorHash (skins, heads) is deliberately untouched. */
export function animationSeed(id){
  const s=String(id??'');let h=0x811c9dc5;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=imul(h,0x01000193);}
  return mix32(h);
}
/** Independent uniform sample in [0,1) for (seed, salt). Salt may be any integer (slot index, purpose code, ...). */
export const unit=(seed,salt)=>mix32((seed+imul((salt|0)+1,0x9e3779b1))>>>0)/4294967296;

export const VARIETY=Object.freeze({
  rate:.05,            // +-5 % playback rate on time driven loops (idle, aim, pinned...): neighbours drift apart instead of re-syncing
  stride:.035,         // +-3.5 % stride length on odometer driven locomotion; the foot IK absorbs the residual slide
  slotMin:12,slotSpan:8,// fidget slots: each actor has one slot length in 12..20 s, a slot holds at most one fidget
  fidgetChance:.6,     // chance that an idle slot contains one fidget
  fidgetMargin:1,      // a fidget starts at least this long after the slot starts and ends this long before it ends
  alertSeconds:8,      // no fidgets this long after the soldier fired, was hit or was shot at
  crumpleChance:.25,   // share of directional kills shown as the undirected crumple (a clone-free front/back mix)
  duckBlastChance:.25  // share of near-miss ducks shown as the violent blast duck
});

// ponytail: ceiling - one library clip per idle family member. A skeleton-level additive head/breath layer would add continuous
// micro-variation, but it needs bone caches in M01Characters (skin agent file) and the foot-ik/hand-pin snapshot order; not attempted here.
export const STAND_IDLES=Object.freeze(['standing_idle','standing_idle_b','standing_idle_c']);
export const CROUCH_IDLES=Object.freeze(['crouched_idle','crouched_idle_b','cover_low_idle']);
export const FIDGETS=Object.freeze(['fidget_look','fidget_shift','fidget_helmet','fidget_check_rifle']);
export const DEATHS=Object.freeze({front:'death_front',back:'death_back',left:'death_left',right:'death_right',crumple:'death_crumple'});
const DEATH_KEYS=Object.freeze(Object.keys(DEATHS));
export const HITS=Object.freeze({front:'hit_front',back:'hit_back',left:'hit_left',right:'hit_right'});
export const isDeathClip=name=>typeof name==='string'&&name.startsWith('death_');
export const POSTURE_TRANSITIONS=Object.freeze({toCrouch:'stand_to_crouch',toStand:'crouch_to_stand'});

const wrapAngle=rad=>Math.atan2(Math.sin(rad),Math.cos(rad));
const wrapTime=(t,d)=>d>0?(t>=0?t%d:((t%d)+d)%d):0;

/** Per-actor constants. Built once per id (the roster is a few dozen fixed ids) and frozen: nothing is allocated per frame. */
const PROFILES=new Map();
export function varietyOf(id){
  const key=id==null?'':String(id);
  let p=PROFILES.get(key);
  if(!p){
    if(PROFILES.size>=1024)PROFILES.clear();   // ids are bounded by the roster; the guard only protects a pathological caller
    const seed=animationSeed(key),slotLength=VARIETY.slotMin+VARIETY.slotSpan*unit(seed,4);
    p=Object.freeze({seed,
      phase:unit(seed,1),                                   // fraction of a cycle, applied to every loop of this actor
      rate:1+(unit(seed,2)*2-1)*VARIETY.rate,               // playback-rate multiplier of time driven loops
      stride:1+(unit(seed,3)*2-1)*VARIETY.stride,           // stride-length multiplier of odometer driven locomotion
      slotLength,slotShift:unit(seed,5)*slotLength});
    PROFILES.set(key,p);
  }
  return p;
}

/** Time inside a loop of `duration` s for this actor: rate-scaled sim time plus the actor's own phase. */
export const loopTime=(v,time,duration)=>wrapTime(time*v.rate+v.phase*duration,duration);

const has=(clips,name)=>!clips||typeof clips.has!=='function'||clips.size===0?false:clips.has(name);
/** The variety layer ships with the T08 clip library: it is on exactly when the library is loaded (`standing_idle_b` is its marker clip).
 *  Without the library (pack missing, plain fixtures, the frozen pre-T37 oracle) the renderer keeps its previous output bit for bit. */
export const varietyActive=clips=>has(clips,'standing_idle_b');
const durationOf=(clips,name,fallback)=>clips?.info?.(name)?.duration??clips?.get?.(name)?.duration??fallback;

/** Where a sim stamp (hitAt, suppressedAt, ...) places `time`: age in seconds, or Infinity when the stamp is unset or in the future. */
const ageOf=(stamp,time)=>finite(stamp)&&stamp>=0&&time>=stamp?time-stamp:Infinity;

/** The incoming-fire sector of an actor: 'front'|'back'|'left'|'right', from the sim's hitYaw (toward the shooter) relative to `reference` yaw.
 *  Left is reference-90 degrees: in the renderer the soldier's forward is facing, and his left-hand side is facing - PI/2. */
export function impactSector(hitYaw,reference){
  if(!finite(hitYaw)||!finite(reference))return 'front';
  const rel=wrapAngle(hitYaw-reference),abs=Math.abs(rel);
  if(abs<=Math.PI/4)return 'front';
  if(abs>=Math.PI*3/4)return 'back';
  return rel<0?'left':'right';
}

/** Hit reaction clip for a living soldier: the directional library clip when it is loaded, else the original hit_front. */
export function hitReactionClip(actor,clips){
  const name=HITS[impactSector(actor?.hitYaw,actor?.facing)];
  return name&&(name==='hit_front'||has(clips,name))?name:'hit_front';
}
/** Near-miss reaction: the round-passing duck, or (a share of the time, per sim stamp) the violent blast duck. ponytail: the actor carries no
 *  "explosion nearby" flag, so the choice is a deterministic variety roll, not a claim about the cause. */
export function duckReactionClip(actor,clips){
  if(has(clips,'blast_duck')&&finite(actor?.suppressedAt)&&
     unit(varietyOf(actor.id).seed,Math.floor(actor.suppressedAt*100)+77)<VARIETY.duckBlastChance)return 'blast_duck';
  return 'near_miss_duck';
}

/** Death clip: directed by the killing shot's side when the sim recorded one at the moment of death (a share stays the undirected crumple), else a
 *  seeded pick over all five, so corpses with no recorded shot (scripted wounds, pre-placed dead) do not all lie in the same pose. */
export function deathVariant(actor,clips){
  // The library deaths fall from standing. A soldier who was lying prone keeps the original 'fallen' clip: suppressed sappers (posture 'prone') and the MG34
  // crew, whose mg34Prone block the sim removes on death (the corpse keeps weapon 'mg34' / role SUPPORT and the loaders their group).
  if(!has(clips,'death_front')||actor?.posture==='prone'||actor?.mg34Prone||actor?.weapon==='mg34'||actor?.group==='grp_mg34_loaders')return 'fallen';
  const v=varietyOf(actor?.id),hasShot=finite(actor?.hitAt)&&actor.hitAt>=0&&finite(actor?.diedAt)&&Math.abs(actor.diedAt-actor.hitAt)<=.25;
  let key;
  if(hasShot)key=unit(v.seed,91)<VARIETY.crumpleChance?'crumple':impactSector(actor.hitYaw,finite(actor.deathYaw)?actor.deathYaw:actor.facing);
  else key=DEATH_KEYS[Math.floor(unit(v.seed,92)*DEATH_KEYS.length)];
  const name=DEATHS[key];
  return has(clips,name)?name:has(clips,DEATHS.crumple)?DEATHS.crumple:'fallen';
}

/** An actor's resting variant per posture, rolled ONCE per (id, posture): nothing re-rolls while he stands or kneels, so the feet never slide
 *  between two idles' different foot placements (standing_idle_b/c differ 5-7 cm from the base idle, crouched_idle_b 0.76 m and cover_low_idle
 *  0.48 m: the left/right knee and the squat). Index into STAND_IDLES / CROUCH_IDLES. */
export function restingVariant(actor,family,coverLow=false){
  const r=unit(varietyOf(actor.id).seed,family==='stand'?11:12);
  if(family==='stand')return r<.5?0:r<.75?1:2;
  return coverLow?(r<.25?0:r<.5?1:2):(r<.5?0:1);
}
const idle={clip:'',fidget:'',fidgetAge:0};   // scratch result of idleChoice (module-level: no per-frame object)
/** Resting clip and, when one is due, the fidget in progress, as a pure function of (actor, time). Result object is reused: read it at once.
 *  family 'stand' | 'crouch'. Fidgets are authored from and back to the exact base standing_idle pose (feet on their marks), so only soldiers whose
 *  standing variant IS the base idle fidget; each actor's 12..20 s slot may hold one fidget that starts and ends inside it. */
export function idleChoice(actor,time,family,clips,{coverLow=false,alert=false}={}){
  const pick=restingVariant(actor,family,coverLow);
  idle.fidget='';idle.fidgetAge=0;
  if(family==='stand'){
    idle.clip=has(clips,STAND_IDLES[pick])?STAND_IDLES[pick]:STAND_IDLES[0];
    if(pick===0&&!alert){
      const v=varietyOf(actor.id),L=v.slotLength,x=(time+v.slotShift)/L,slot=Math.floor(x),s=(x-slot)*L,seed=v.seed,base=slot*8;
      if(unit(seed,base+101)<VARIETY.fidgetChance){
        const name=FIDGETS[Math.floor(unit(seed,base+102)*FIDGETS.length)];
        if(has(clips,name)){
          const dur=durationOf(clips,name,2),room=L-dur-2*VARIETY.fidgetMargin;
          if(room>0){const f0=VARIETY.fidgetMargin+unit(seed,base+103)*room;
            if(s>=f0&&s<f0+dur){idle.fidget=name;idle.fidgetAge=s-f0;}}
        }
      }
    }
  }else idle.clip=has(clips,CROUCH_IDLES[pick])?CROUCH_IDLES[pick]:CROUCH_IDLES[0];
  return idle;
}

/** Behind low cover (<= 1.2 m of sandbag / low wall) a kneeling soldier may use the squat idle. */
export const coverLowOf=actor=>Boolean(actor?.cover&&finite(actor.cover.height)&&actor.cover.height<=1.2);

/** The authored stand<->crouch transition clip while a posture change is younger than the clip, else null. stand_to_crouch ends on, and
 *  crouch_to_stand starts from, the BASE kneeling pose (right knee): a soldier whose own kneeling variant is the left-knee or cover idle keeps the
 *  plain cross-fade (a 0.5-0.8 m foot swap would otherwise run inside 0.1-0.2 s). Engineers use the prone path instead (their posture flips to
 *  and from 'prone'). */
export function postureTransition(actor,time,clips){
  if(actor?.role==='ENGINEER'||!finite(actor?.postureSince)||actor.postureSince<=0)return null;
  if(actor.posture!=='crouch'&&actor.posture!=='stand')return null;
  const name=actor.posture==='crouch'?POSTURE_TRANSITIONS.toCrouch:POSTURE_TRANSITIONS.toStand;
  if(!has(clips,name)||restingVariant(actor,'crouch',coverLowOf(actor))!==0)return null;
  const age=time-actor.postureSince;
  return age>=0&&age<durationOf(clips,name,.45)?{clip:name,age}:null;
}

/** True while this soldier should not look relaxed: he fired, was hit or was shot at in the last VARIETY.alertSeconds of sim time. */
export const isAlert=(actor,time)=>Math.min(ageOf(actor?.firedAt,time),ageOf(actor?.hitAt,time),ageOf(actor?.suppressedAt,time))<VARIETY.alertSeconds;

/** A prone soldier flinches (prone_flinch, once) for 0.45 s after the sim stamps a near miss or a hit on him, else his candidate is unchanged.
 *  The prone idle's own time comes from postureSince (sim stamp driven), so it is not a time+offset loop and varyLoop never sees it. */
export function proneReaction(c,actor,time,clips){
  if(c.clip!=='prone_idle'||!has(clips,'prone_flinch'))return c;
  const age=Math.min(ageOf(actor.suppressedAt,time),ageOf(actor.hitAt,time));
  return age<durationOf(clips,'prone_flinch',.45)?{clip:'prone_flinch',time:age,loop:false}:c;
}

/**
 * Picks among the authored clips for a soldier the generic selection left on a plain time driven loop.
 * `c` is the raw/refined candidate ({clip,time,loop}); returns it unchanged, or a replacement {clip,time,loop[,rate]}.
 * Only called for candidates whose time is exactly `time + offset` (the generic time-driven loops), so exact crew / station / MG34 clips
 * and everything driven by a sim stamp are never touched.
 */
export function varyLoop(c,{actor,pose,time,clips}){
  const v=varietyOf(actor.id),name=c.clip;
  let clip=name,family=null;
  if(name==='standing_idle'&&pose.name==='standing')family='stand';
  else if(name==='crouched_idle'&&pose.name==='crouched')family='crouch';
  if(family){
    const tr=postureTransition(actor,time,clips);
    if(tr)return {clip:tr.clip,time:tr.age,loop:false};
    const choice=idleChoice(actor,time,family,clips,{coverLow:coverLowOf(actor),alert:isAlert(actor,time)});
    if(choice.fidget)return {clip:choice.fidget,time:choice.fidgetAge,loop:false};
    clip=choice.clip;
  }else if(name==='seated'&&has(clips,'seated_b')&&unit(v.seed,6)>=.5)clip='seated_b';
  const duration=durationOf(clips,clip,0);
  return duration>0?{clip,time:loopTime(v,time,duration),loop:true,rate:v.rate}:c;
}
