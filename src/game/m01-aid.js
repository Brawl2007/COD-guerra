// M01 first aid for the wounded of the west bank (package 2, 2026-11-04; golden amendment 21).
//
// Since R1-a a bomb of the 04:34 raid can wound a man of the west garrison (m01-garrison.js, m01-blast.js): he lies where he fell, in the WOUNDED pose, and stayed there for the rest of the mission.
// Now he calls out, the medic of the post, Dudek (non-essential, idle at the aid point from the bombing to 06:04), runs to him, kneels, treats him for a few seconds, picks him up and carries him to cover (or
// the aid post) and goes back to his post. Everything the medic does is a pure function of the clock and of saved state; nothing is drawn from a random stream (the little variation there is, is
// derived from the ids with blastJitter, as the bombs' own).
//
// SAFETY. The medic never starts, and stops where he is, while a bomb of the raid's schedule is due within bombHoldSec of the battle clock within bombM of him or of the wounded man (he hears the aircraft:
// the planned points are public data, mission.json raidTargets0434), and while he is shaken (suppressedUntil: a bomb or a round that cracked past him, the existing suppression) he drops, and runs to
// the nearest box cover within coverM when he is in the open. A wounded man he has treated is carried to the nearest cover of the west bank (never the sappers' sandbag rows, the squad post, the crater)
// or the aid post within carryM; one who already lies within restM of a cover is left where he is.
//
// WHO FIGHTS. Nobody who is WOUNDED fights: the state excludes a man from every shot, target and defender rule of the act, and the garrison is displayOnly (no weapon) in any case. Treatment gives
// health back (heal, up to healTo) and a record (`aid.t`); it does not make him a fighter, and a bomb that falls on the lot does not wound a man who is being carried (blast skips carriedBy).
//
// STATE (all optional, validated, absent in every save made before this module): `actor.aid` of a wounded garrison man {n calls made, at when he calls next, t when he was treated, rest when he
// was put down in cover}; `timers.aid` the one job of the medic {patient, phase go|treat|carry, since, left (treat), dest (carry)}. The medic's `task` is 'aid' while the job lasts; the man he carries
// has `carriedBy` and `carry` as Bąk has, so the renderer draws the same carry.
//
// Certainty: that a medic tended the wounded of the raid is GAMEPLAY_DRAMATIZATION (no source; the casualties themselves are, m01-blast.js); the lines (dlg_m01_220-226) are written by an AI agent,
// Polish to be reviewed by a native speaker.
import definition from '../../missions/m01-tczew/mission.json' with { type: 'json' };
import {blastJitter} from './m01-blast.js';
import {GARRISON_GROUP} from './m01-garrison.js';
import {barkTrigger} from './m01-barks.js';

const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
const lerp=(range,u)=>range[0]+(range[1]-range[0])*u;
const secs=text=>{const v=text.split(':').map(Number);return v[0]*3600+v[1]*60+(v[2]??0);};
const NOT_A_BOX=Object.freeze(['WINDOW','WALL_CORNER','BUILDING_CORNER','VEHICLE']);
// The battle clock runs faster than the real one in 04:34-04:45 (3.5x) and after (9x, 27x): the schedule of the bombs is in battle seconds, the medic's caution is in real ones.
const SEGMENTS=definition.clock.segments.map(g=>({from:secs(g.from),to:secs(g.to),scale:g.scale}));

export const AID=Object.freeze({
  medic:'leon_dudek',
  // The window of the battle clock in which he is free to go: after he has brought the station casualty in (04:35:30 + the walk), until 05:30 (the end of the repair segment), well before Bąk's wound (06:04), so that he is at the aid post for it.
  fromBattle:secs('04:36:30'),untilBattle:secs('05:30:00'),
  call:Object.freeze({firstSec:[3,7],everySec:[14,22],max:3}),   // a wounded man calls 3-7 s after the wound, then every 14-22 s, three times at most, until he is treated
  reachM:260,           // the medic answers the nearest wounded man within this distance of him
  kneelM:1.0,arriveM:1.9,   // where he kneels (from the patient) and how near he must be to begin: moveActor stops a walker 0.8 m short of his target
  runSpeed:4.2,carrySpeed:1.5,
  treatSec:Object.freeze([6,10]),   // by the wound: the deeper the longer
  heal:30,healTo:85,    // health given back, and the most a treated man has
  pickupSec:1.6,putdownSec:1.6,   // the same as Bąk's carry
  carryM:70,restM:4,restSide:1.4,restStep:1.0,   // the farthest he is carried; within restM of a cover he is not carried; where he is laid, west of the cover and a step along it for each man already there
  bombHoldSec:10,bombM:50,   // a bomb due within this many REAL seconds (the schedule is in battle seconds: divided by the segment's scale) within this many metres holds the medic (BOMB_BLAST.shakenM)
  coverM:12,            // when shaken in the open he makes for a cover node within this distance
  noCover:Object.freeze(['cv_cable_fault','cv_cable_second','cv_crater_1','cv_squad_post']),   // lanes of the sappers and the squad: no wounded man is laid there
  carryEastX:-20,       // nothing east of this is a place to lay a wounded man (the bridge heads are in sight of the east bank)
});
export const AID_PHASES=Object.freeze(['go','treat','carry']);

/** A man the medic can tend: a wounded man of the west garrison, alive and present, who has not been taken up by anyone. */
export const isPatient=a=>a.group===GARRISON_GROUP&&a.alive&&a.active&&a.state==='WOUNDED';

/** The medic is free to go: alive, on his feet, with no job of the script (the station casualty, Bąk), inside his window, and the mission has not reached the roll call. */
export function medicFree(sim){
  const m=sim.actor(AID.medic);
  return Boolean(m)&&m.alive&&m.active&&m.state!=='WOUNDED'&&m.task==null&&!m.carriedBy&&!m.carry&&sim.mission.phase!=='OUTRO'&&sim.battleClock>=AID.fromBattle&&sim.battleClock<AID.untilBattle;
}

/** A bomb of the raid's schedule that has not fallen and is due within bombHoldSec real seconds within bombM of one of the points: the medic waits (the planned points are public: mission.json). */
export function bombDue(sim,points){
  const seg=SEGMENTS.find(g=>sim.battleClock>=g.from&&sim.battleClock<g.to),scale=seg?.scale??1;
  for(const list of [sim.timers.raidSchedule0434,sim.timers.raidSchedule]){
    if(!list)continue;
    for(const t of list){
      if(t.emitted)continue;
      const wait=(t.at-sim.battleClock)/scale;   // real seconds
      if(wait<-1||wait>AID.bombHoldSec)continue;
      for(const p of points)if(dist(p,t.point)<=AID.bombM)return true;
    }
  }
  return false;
}

/** The box cover nearest to a point within maxM (not a window, a corner or a vehicle; not a node the sappers or the squad use unless `any`): the node, or null. */
export function aidCover(world,p,maxM,{any=false}={}){
  let node=null,best=maxM;
  for(const c of world.coverNodes){
    if(c.partial||NOT_A_BOX.includes(c.type)||(!any&&AID.noCover.includes(c.id)))continue;
    const d=Math.hypot(p.x-c.position[0],p.z-c.position[2]);
    if(d<best){best=d;node=c;}
  }
  return node;
}
/** The lee (west) side of a cover node: where a man lies behind it. `slot` is how many men already lie there (a step along the node for each). */
export const coverSpot=(node,z=node.position[2],slot=0)=>({x:node.position[0]-AID.restSide,z:node.position[2]+clamp(z-node.position[2],-1.2,1.2)+slot*AID.restStep});

/**
 * Where the treated man is laid: the nearest of the covers of the west bank (not the sappers' or the squad's lanes, x west of carryEastX) and the aid post within carryM of him, or null (leave him
 * where he is) when he already lies within restM of a cover or nothing is near enough. A man already laid at a node counts: the next one lies a step along it.
 */
export function restPoint(sim,patient){
  const taken=node=>sim.actors.filter(b=>b!==patient&&b.aid?.rest!==undefined&&Math.hypot(b.x-(node.position[0]-AID.restSide),b.z-node.position[2])<=AID.restStep*3+1.2).length;
  let best=null,bd=AID.carryM;
  for(const c of sim.world.coverNodes){
    if(c.partial||NOT_A_BOX.includes(c.type)||AID.noCover.includes(c.id)||c.position[0]>AID.carryEastX)continue;
    const d=Math.hypot(patient.x-c.position[0],patient.z-c.position[2]);
    if(d<AID.restM)return null;   // he already lies by a cover
    if(d<bd){bd=d;best=c;}
  }
  const aid=sim.world.point('aid_position'),da=dist(patient,aid);
  if(da<bd){   // the aid post: a man is laid west of the medic's place, a step along it for each man already there (as Bąk is laid, 1.2 m west and .6 m south of it)
    const n=sim.actors.filter(b=>b!==patient&&b.aid?.rest!==undefined&&Math.hypot(b.x-aid.x,b.z-aid.z)<=AID.restStep*3+2).length;
    return {x:aid.x-1.2-n*AID.restStep,z:aid.z+.6,aidPost:true};
  }
  if(!best)return null;
  const spot=coverSpot(best,patient.z,taken(best));return {x:spot.x,z:spot.z};
}

const treatSeconds=patient=>lerp(AID.treatSec,clamp((100-patient.health)/60,0,1));
const callDelay=(id,n)=>n===0?lerp(AID.call.firstSec,blastJitter(id,'aid-first')):lerp(AID.call.everySec,blastJitter(id,'aid-call-'+n));
const point=a=>({x:a.x,y:a.y,z:a.z});

/** Ends the job: the patient is put down where he is if he was being carried, the medic goes back to the aid post. */
function endJob(sim,medic,patient,{aborted=false}={}){
  if(patient&&patient.carriedBy===medic.id){patient.carriedBy=null;delete patient.carry;patient.y=sim.world.heightAt(patient.x,patient.z);}
  Object.assign(medic,{task:null,crouched:false,state:'GUARD',target:sim.world.point('aid_position')});
  delete medic.nav;delete sim.timers.aid;
  return aborted;
}

/** A shaken or held medic: he makes for the nearest box cover within coverM (its lee side) if he is in the open, else he drops where he is. */
function takeCover(sim,medic,dt){
  const node=aidCover(sim.world,medic,AID.coverM,{any:true});
  if(node){
    const spot=coverSpot(node,medic.z);
    if(dist(medic,spot)>.9){sim.moveActor(medic,spot,dt,AID.runSpeed);return;}
  }
  medic.state='GUARD';medic.crouched=true;
}

/**
 * One tick of the aid, called by M01Simulation.updateActors before the men are walked: the wounded call out (a bark through the director, 3 calls at most each), and the medic's job goes on
 * or begins. Returns nothing; writes the garrison men's `aid` record, `timers.aid` and the medic and the patient.
 */
export function updateAid(sim,dt){
  const clock=sim.clock;
  // 1. The wounded: their record the first tick they are seen wounded, and their calls until they are treated. A man carried says nothing.
  for(const a of sim.actors){
    if(!isPatient(a))continue;
    const r=a.aid??=({n:0,at:clock+callDelay(a.id,0)});
    if(r.t===undefined&&r.n<AID.call.max&&clock>=r.at&&!a.carriedBy){
      r.n++;r.at=clock+callDelay(a.id,r.n);
      barkTrigger(sim,'aid',{node:'call',point:point(a)});
    }
  }
  const medic=sim.actor(AID.medic),job=sim.timers.aid;
  if(!medic)return;
  // 2. No job: take the nearest untreated wounded man within reach, unless a bomb is due at him or at the medic.
  if(!job){
    if(!medicFree(sim))return;
    let best=null,bd=AID.reachM;
    for(const a of sim.actors){
      if(!isPatient(a)||a.carriedBy||a.task!=null||a.aid?.t!==undefined)continue;
      const d=dist(medic,a);if(d<bd){bd=d;best=a;}
    }
    if(!best||bombDue(sim,[medic,best]))return;
    // He sets out from a clear place: just brought the station casualty in, he stands 0.9 m from him, and the first strides toward the wounded man would brush past the body (the old walk back to the aid post
    // steers round it in a few ticks; the navigation audit counts two men closer than 0.35 m).
    if(sim.bodiesNear(medic,medic.x,medic.z,1.2).some(b=>Math.hypot(b.x-medic.x,b.z-medic.z)<1.1))return;
    sim.timers.aid={patient:best.id,phase:'go',since:clock};
    Object.assign(medic,{task:'aid',target:null,crouched:false});delete medic.nav;
    return runJob(sim,medic,best,sim.timers.aid,dt);
  }
  // 3. A job: the patient, the medic and the window must still be what they were.
  const patient=sim.actor(job.patient);
  if(!patient||!isPatient(patient)||!medic.alive||!medic.active||medic.state==='WOUNDED'||sim.mission.phase==='OUTRO'||sim.battleClock>=AID.untilBattle){endJob(sim,medic,patient,{aborted:true});return;}
  runJob(sim,medic,patient,job,dt);
}

function runJob(sim,medic,patient,job,dt){
  const clock=sim.clock,shaken=clock<medic.suppressedUntil,bomb=bombDue(sim,[medic,patient]);
  const held=shaken||bomb;
  if(job.phase==='go'){
    if(held){takeCover(sim,medic,dt);return;}
    medic.crouched=false;
    const d=dist(medic,patient);
    if(d<=AID.arriveM){
      job.phase='treat';job.since=clock;job.left=treatSeconds(patient);
      Object.assign(medic,{crouched:true,state:'GUARD',facing:Math.atan2(patient.z-medic.z,patient.x-medic.x)});delete medic.nav;
      barkTrigger(sim,'aid',{node:'arrive',point:point(medic)});
      return;
    }
    // He kneels on the side he comes from, not on the other side of the body.
    const u=d>1e-6?AID.kneelM/d:0,k={x:patient.x+(medic.x-patient.x)*u,z:patient.z+(medic.z-patient.z)*u};
    sim.moveActor(medic,k,dt,AID.runSpeed);
    return;
  }
  if(job.phase==='treat'){
    medic.facing=Math.atan2(patient.z-medic.z,patient.x-medic.x);
    if(held){takeCover(sim,medic,dt);return;}
    if(dist(medic,patient)>AID.arriveM){job.phase='go';job.since=clock;delete job.left;return;}   // he took cover away from the man: he goes back to him and begins the treatment again
    medic.crouched=true;medic.state='GUARD';
    job.left-=dt;
    if(job.left>0)return;
    delete job.left;
    // treated: health back, the record, and the way out
    patient.health=Math.min(AID.healTo,Math.max(patient.health,0)+AID.heal);
    patient.aid.t=clock;
    const dest=restPoint(sim,patient);
    if(!dest){endJob(sim,medic,patient);return;}
    job.phase='carry';job.since=clock;job.dest={x:dest.x,z:dest.z};
    patient.carriedBy=medic.id;patient.carry={phase:'pickup',startedAt:clock,duration:AID.pickupSec};
    medic.crouched=false;
    barkTrigger(sim,'aid',{node:'carry',point:point(medic)});
    return;
  }
  // carry
  const carry=patient.carry;
  if(!carry||patient.carriedBy!==medic.id){endJob(sim,medic,patient,{aborted:true});return;}
  if(carry.phase==='pickup'){
    if(clock-carry.startedAt>=carry.duration)patient.carry={phase:'carry',startedAt:carry.startedAt+carry.duration,duration:AID.pickupSec};
    return;
  }
  if(carry.phase==='putdown'){
    if(clock-carry.startedAt<carry.duration)return;
    patient.carriedBy=null;delete patient.carry;
    patient.x=job.dest.x;patient.z=job.dest.z;patient.y=sim.world.heightAt(patient.x,patient.z);patient.facing=medic.facing;patient.aid.rest=clock;
    barkTrigger(sim,'aid',{node:'delivered',point:point(medic)});
    endJob(sim,medic,patient);return;
  }
  if(held){takeCover(sim,medic,dt);return;}
  medic.crouched=false;
  if(dist(medic,job.dest)<1.2){patient.carry={phase:'putdown',startedAt:clock,duration:AID.putdownSec};medic.state='GUARD';return;}
  sim.moveActor(medic,job.dest,dt,AID.carrySpeed);
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// Saves. Everything is optional and validated; a save made before this module has none of it and loads as it is (the wounded get their record, and the medic his job, in the next tick).
const finite=(v,min=0,max=Infinity)=>Number.isFinite(v)&&v>=min&&v<=max;

/** `actor.aid` of a wounded garrison man: {n, at, t?, rest?}. */
export function validateAidActor(a,s,reject){
  const r=a.aid,keys=r&&typeof r==='object'&&!Array.isArray(r)?Object.keys(r):[];
  if(a.group!==GARRISON_GROUP||keys.length===0||keys.some(k=>!['n','at','t','rest'].includes(k))||!Number.isInteger(r.n)||r.n<0||r.n>AID.call.max||
    !finite(r.at,0,s.clock+AID.call.everySec[1]+1e-6)||(r.t!==undefined&&!finite(r.t,0,s.clock))||(r.rest!==undefined&&(r.t===undefined||!finite(r.rest,r.t,s.clock))))reject('primeiros socorros '+a.id);
}

/** `timers.aid`, the medic's one job: {patient, phase, since, left? (treat), dest? (carry)}, consistent with the medic, the patient and his carry. */
export function validateAidRecord(j,s,reject){
  const medic=s.actors.find(a=>a.id===AID.medic),patient=s.actors.find(a=>a.id===j?.patient),keys=j&&typeof j==='object'&&!Array.isArray(j)?Object.keys(j):[];
  if(!j||keys.some(k=>!['patient','phase','since','left','dest'].includes(k))||!AID_PHASES.includes(j.phase)||!finite(j.since,0,s.clock)||!patient||patient.group!==GARRISON_GROUP||
    !medic||!medic.alive||!medic.active||medic.task!=='aid'||medic.state==='WOUNDED'||!patient.alive||!patient.active||patient.state!=='WOUNDED'||!patient.aid)reject('trabalho do socorrista');
  if((j.phase==='treat')!==(j.left!==undefined)||(j.left!==undefined&&!finite(j.left,0,AID.treatSec[1]+1e-6)))reject('trabalho do socorrista: tratamento');
  if(j.phase==='carry'){
    const d=j.dest;
    if(!d||typeof d!=='object'||Object.keys(d).length!==2||!finite(d.x,-1000,1000)||!finite(d.z,-1000,1000)||patient.aid.t===undefined||patient.aid.rest!==undefined||patient.carriedBy!==medic.id||!patient.carry||
      !['pickup','carry','putdown'].includes(patient.carry.phase))reject('trabalho do socorrista: transporte');
  }else if(j.dest!==undefined||patient.carriedBy!=null||patient.carry||patient.aid.t!==undefined)reject('trabalho do socorrista: fase');   // (go, treat: the man is not treated yet)
}
