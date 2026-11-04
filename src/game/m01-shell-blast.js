// R4 INC-2 (2026-11-04): artillery with an effect by radius, for Act VII-b «Norte, durante o dia» (missions/m01-tczew/areas/np/act-vii-b.json). The shell of this module is the counterpart of
// the bomb of m01-blast.js (R1-a): a pure part (what a blast at distance d does to a man, where a shell falls, the plan and the saved record of a barrage) that M01AreaSimulation applies through the
// paths it already has (recordDamage, suppressedUntil, the WOUNDED state, sectors.damage, the m01-blast event). m01-blast.js is act 1's and is read, never changed: blastOutcome there is the
// bomb's alone (it takes no spec), so shellOutcome below is the same arithmetic with the spec as a parameter, and tests/m01-act-vii-b.test.js proves that shellOutcome with BOMB_BLAST is blastOutcome.
//
// GAMEPLAY VALUES, NOT BALLISTICS, and no calibre, type or battery anywhere (HISTORICAL_RESEARCH.md: the sources say «apoio de artilharia» and nothing else, T16 BAIXA, T03 MÉDIA). Every casualty this
// produces is GAMEPLAY_DRAMATIZATION and is never shown as a number or told as a fact. The player is NEVER wounded or killed by a shell (only stunned, CONCUSSION of m01-blast.js, exactly as for the
// bombs of the 04:34 raid), and no shell falls within SAFE_IMPACT_M of him.
// No world, no clock, no stream of its own beyond the record's `rng`: a barrage is a function of its saved record, the player's position and the men's.
import {SAFE_IMPACT_M,blastJitter,BOMB_BLAST} from './m01-blast.js';

const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const num=(v,lo,hi)=>Number.isFinite(v)&&v>=lo&&v<=hi;
const deepFreeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.freeze(v);for(const x of Object.values(v))deepFreeze(x);}return v;};
const copy=v=>JSON.parse(JSON.stringify(v));

/** Effective distances in metres, as BOMB_BLAST (m01-blast.js) but for a shell: a smaller kill radius and a smaller shaken ring. A man's effective distance is his real distance times what shelters him. */
export const SHELL_BLAST=Object.freeze({
  lethalM:4,woundM:9,shakenM:20,
  coverMul:1.8,                                         // the blast has no line of sight to the man's chest (the parapet, the wreck, turned earth): 1.8 times farther
  postureMul:Object.freeze({stand:1,crouch:1.25,prone:1.6}),
  jitter:.12,                                           // +/-12 % on the effective distance, from the (man, impact) pair (blastJitter)
  woundLoss:Object.freeze([80,45]),                     // health lost at the lethal edge and at the wound edge; the wound leaves at least 1
  suppressSec:Object.freeze([2,6]),                     // seconds pinned at the shaken edge and at the core
  sourceHeight:.4,                                      // the blast centre above the ground it fell on
});
/** The specs a barrage may name (act.barrages[].spec). */
export const SHELL_SPECS=Object.freeze({SHELL_BLAST});
/** The farthest a man can be affected by a shell: shakenM over the smallest factor. */
export const SHELL_REACH_M=Math.ceil(SHELL_BLAST.shakenM/(1-SHELL_BLAST.jitter));
export {SAFE_IMPACT_M};
/** The distance a shell is PLANNED from the player (SAFE_IMPACT_M plus what he can run in the warning: 6 m/s for 1.5 s, and a margin), so that the one rule that counts, SAFE_IMPACT_M at the landing, holds without a shift. */
export const PLANNED_IMPACT_M=SAFE_IMPACT_M+12;

/**
 * What a blast of `spec` does to one man: the arithmetic of blastOutcome (m01-blast.js) with the spec as a parameter.
 *   distance  metres from the blast centre to his torso (3D); covered  the blast has no line of sight to his torso; posture  'stand' | 'crouch' | 'prone';
 *   protectedBy  null for a man who may become a casualty, else why not (shellProtection): a kill or wound becomes the strongest shake; u  blastJitter of the (man, impact) pair, 0..1.
 * Returns {outcome:'kill'|'wound'|'suppress'|'none', effective, suppressSec, healthLoss}.
 */
export function shellOutcome({distance,covered,posture,protectedBy=null,u=.5,spec=SHELL_BLAST}){
  const B=spec,effective=distance*(covered?B.coverMul:1)*(B.postureMul[posture]??1)*(1+B.jitter*(2*u-1));
  let outcome=effective<=B.lethalM?'kill':effective<=B.woundM?'wound':effective<=B.shakenM?'suppress':'none';
  const strongest=outcome==='kill'||outcome==='wound';
  const suppressSec=outcome==='none'?0:strongest?B.suppressSec[1]:lerp(B.suppressSec[1],B.suppressSec[0],clamp((effective-B.woundM)/(B.shakenM-B.woundM),0,1));
  let healthLoss=0;
  if(protectedBy!==null){if(strongest)outcome='suppress';}
  else if(outcome==='wound')healthLoss=lerp(B.woundLoss[0],B.woundLoss[1],clamp((effective-B.lethalM)/(B.woundM-B.lethalM),0,1));
  return {outcome,effective,suppressSec,healthLoss};
}
export {BOMB_BLAST,blastJitter};

/** Who a shell may never kill or wound (only shake): the named men and the ckm crew (`essential`, the plot needs them) and the stretcher-bearers. The line may take casualties. Returns the reason, or null. */
export function shellProtection(a){
  if(a.essential)return 'cast';
  if(a.role==='MEDIC')return 'medic';
  if(a.carriedBy)return 'carried';
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The plan of the barrages of an act (act.barrages), validated once: a typo stops the game instead of changing it.
const BARRAGE_KEYS=Object.freeze(['id','from','durationSec','impacts','intervalSec','band','warnSec','spec','casualty','callout','note']);
const FROM_KEYS=Object.freeze(['echelonBroken','afterSec']);
const CASUALTY_KEYS=Object.freeze(['impact','near','offsetM']);
/**
 * `spec`: act.barrages. `ctx`: {playable (the area's rectangle), objectives (the act's ids), echelons (how many), line (the ids of the men of the line), label}. Returns the frozen plan {barrages, byId}.
 * `from`: an objective id (the barrage begins when it is done) or {echelonBroken: k, afterSec} (that long after the k-th echelon broke).
 */
export function makeBarragePlan(spec,{playable,objectives,echelons,line,label='M01 barrage'}){
  const fail=m=>{throw new Error(`${label}: ${m}`);};
  if(!Array.isArray(spec)||!spec.length)fail('barrages: a non-empty array, or leave it out');
  const out=[],ids=new Set();
  for(const b of spec){
    const name=`barrage ${typeof b?.id==='string'?b.id:'#'+(out.length+1)}`;
    if(!b||typeof b!=='object'||Array.isArray(b)||typeof b.id!=='string'||!/^brg_[a-z0-9_]+$/.test(b.id)||ids.has(b.id))fail(`${name}: id (brg_..., different from the others')`);
    const extra=Object.keys(b).find(k=>!BARRAGE_KEYS.includes(k));if(extra!==undefined)fail(`${name}: unknown key ${extra}`);
    ids.add(b.id);
    const f=b.from;
    if(typeof f==='string'){if(!objectives.includes(f))fail(`${name}: from ${f} is not an objective of the act`);}
    else{
      if(!f||typeof f!=='object'||Array.isArray(f)||Object.keys(f).some(k=>!FROM_KEYS.includes(k))||!Number.isInteger(f.echelonBroken)||f.echelonBroken<0||f.echelonBroken>=echelons-1||!num(f.afterSec,0,120))
        fail(`${name}: from (an objective id, or {echelonBroken: the index of an echelon that another follows, afterSec 0-120})`);
    }
    if(!num(b.durationSec,5,120)||!Number.isInteger(b.impacts)||b.impacts<1||b.impacts>40||!Array.isArray(b.intervalSec)||b.intervalSec.length!==2||!num(b.intervalSec[0],.5,30)||!num(b.intervalSec[1],b.intervalSec[0],30))
      fail(`${name}: durationSec 5-120 / impacts 1-40 / intervalSec [lo, hi] 0.5-30`);
    if(!num(b.warnSec,.5,4))fail(`${name}: warnSec 0.5-4 (the whistle before each impact)`);
    if(b.impacts*b.intervalSec[0]>b.durationSec)fail(`${name}: ${b.impacts} impacts at least ${b.intervalSec[0]} s apart do not fit in ${b.durationSec} s`);
    if(!SHELL_SPECS[b.spec])fail(`${name}: spec ${b.spec} (one of ${Object.keys(SHELL_SPECS).join(', ')})`);
    const q=b.band;
    if(!q||typeof q!=='object'||Object.keys(q).sort().join()!=='maxX,maxZ,minX,minZ'||![q.minX,q.maxX,q.minZ,q.maxZ].every(Number.isFinite)||q.minX<playable.minX||q.maxX>playable.maxX||q.minZ<playable.minZ||q.maxZ>playable.maxZ||q.maxX-q.minX<100||q.maxZ-q.minZ<60)
      fail(`${name}: band {minX, maxX, minZ, maxZ} inside the playable area, at least 100 x 60 m (so that a safe place always exists)`);
    if(b.callout!==undefined&&(typeof b.callout!=='string'||!b.callout))fail(`${name}: callout (the key of the warning line)`);
    let casualty=null;
    if(b.casualty!==undefined){
      const c=b.casualty;
      if(!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).some(k=>!CASUALTY_KEYS.includes(k))||!Number.isInteger(c.impact)||c.impact<0||c.impact>=b.impacts||!line.includes(c.near)||
        !Array.isArray(c.offsetM)||c.offsetM.length!==2||!c.offsetM.every(v=>num(v,-12,12)))
        fail(`${name}: casualty {impact: the index of one of its impacts, near: a man of the line, offsetM: [dx, dz] within 12 m}`);
      casualty=copy(c);
    }
    out.push({id:b.id,from:typeof f==='string'?f:copy(f),durationSec:b.durationSec,impacts:b.impacts,intervalSec:[...b.intervalSec],band:copy(q),warnSec:b.warnSec,spec:b.spec,casualty,callout:b.callout??null});
  }
  return deepFreeze({barrages:out,byId:Object.fromEntries(out.map(b=>[b.id,b]))});
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The stream of one barrage (the LCG of the per-man streams of m01-area-sim.js: the record's `rng`, never the simulation's main stream).
export const barrageSeed=(seed,index)=>Math.imul(((seed>>>0)^0x6e70b4a2)+Math.imul(index+1,0x9e3779b9)|0,2654435761)>>>0;
export function barrageNext(rec){rec.rng=(Math.imul(1664525,rec.rng)+1013904223)>>>0;return rec.rng/4294967296;}
/**
 * Where a shell is PLANNED to fall (at launch, from the player's position then): the first of eight draws in the band that is at least PLANNED_IMPACT_M from the player; if none is,
 * the corner or edge midpoint of the band farthest from him (a band of at least 100 x 60 m always has a place farther than that). `next()` draws 0..1.
 */
export function pickShellPoint(next,band,player,safeM=PLANNED_IMPACT_M){
  for(let i=0;i<8;i++){
    const x=band.minX+(band.maxX-band.minX)*next(),z=band.minZ+(band.maxZ-band.minZ)*next();
    if(Math.hypot(x-player.x,z-player.z)>=safeM)return {x,z};
  }
  const mx=(band.minX+band.maxX)/2,mz=(band.minZ+band.maxZ)/2;
  const spots=[[band.minX,band.minZ],[band.maxX,band.minZ],[band.minX,band.maxZ],[band.maxX,band.maxZ],[mx,band.minZ],[mx,band.maxZ],[band.minX,mz],[band.maxX,mz]];
  let best=spots[0],far=-1;
  for(const s of spots){const d=Math.hypot(s[0]-player.x,s[1]-player.z);if(d>far){far=d;best=s;}}
  return {x:best[0],z:best[1]};
}
/**
 * Where a shell really lands: the planned point, unless the player has come within SAFE_IMPACT_M of it since (a jump, a restored position...): then 40 m from him on the same bearing
 * (the safeImpact rule of the 04:34 raid). Returns {x, z, shifted}.
 */
export function landingPoint(planned,player,shiftedM=40){
  const d=Math.hypot(planned.x-player.x,planned.z-player.z);
  if(d>=SAFE_IMPACT_M)return {x:planned.x,z:planned.z,shifted:false};
  const a=d>1e-9?Math.atan2(planned.z-player.z,planned.x-player.x):0;
  return {x:player.x+Math.cos(a)*shiftedM,z:player.z+Math.sin(a)*shiftedM,shifted:true};
}

/** The saved record of the barrages (sim.timers.barrage): {done: {id: endedAt}, run: null | {id, startedAt, rng, k, nextLaunchAt, shells: [{n, x, z, launchedAt, landAt}]}}. */
export const BARRAGE_RECORD_KEYS=Object.freeze(['done','run']);
export const BARRAGE_RUN_KEYS=Object.freeze(['id','k','nextLaunchAt','rng','shells','startedAt']);
export const BARRAGE_SHELL_KEYS=Object.freeze(['landAt','launchedAt','n','x','z']);
export function freshBarrageRecord(){return {done:{},run:null};}
/** A saved barrage record this machine could have written. `box`: the area a point must lie in (a margin round it). Never throws. */
export function validBarrageRecord(plan,rec,clock,box){
  const record=(o,keys)=>Boolean(o)&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join()===keys.join();
  if(!record(rec,BARRAGE_RECORD_KEYS)||!rec.done||typeof rec.done!=='object'||Array.isArray(rec.done))return false;
  for(const [id,at] of Object.entries(rec.done))if(!plan.byId[id]||!num(at,0,clock))return false;
  const r=rec.run;
  if(r===null)return true;
  if(!record(r,BARRAGE_RUN_KEYS))return false;
  const b=plan.byId[r.id];
  if(!b||Object.hasOwn(rec.done,r.id)||!num(r.startedAt,0,clock)||!Number.isInteger(r.rng)||r.rng<0||r.rng>4294967295||!Number.isInteger(r.k)||r.k<0||r.k>b.impacts||!Number.isFinite(r.nextLaunchAt)||r.nextLaunchAt<r.startedAt)return false;
  if(!Array.isArray(r.shells)||r.shells.length>r.k||r.shells.length>8)return false;
  for(const s of r.shells){
    if(!record(s,BARRAGE_SHELL_KEYS)||!Number.isInteger(s.n)||s.n<0||s.n>=r.k||!Number.isFinite(s.x)||!Number.isFinite(s.z)||s.x<box.minX||s.x>box.maxX||s.z<box.minZ||s.z>box.maxZ)return false;
    if(!num(s.launchedAt,r.startedAt,clock)||Math.abs(s.landAt-s.launchedAt-b.warnSec)>1e-6||!(s.landAt>clock-1e-9))return false;
  }
  return new Set(r.shells.map(s=>s.n)).size===r.shells.length;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The stretcher-bearers (act.medics): two men of the stretcher service who come for a wounded man of the line and carry him south, off the slice. NPC only: the player never carries anyone.
const MEDIC_KEYS=Object.freeze(['ids','from','exit','pace','runPace','maxCasualties','pickupM','classification','note']);
export function makeMedicPlan(spec,{playable,label='M01 medics'}){
  const fail=m=>{throw new Error(`${label}: ${m}`);};
  if(!spec||typeof spec!=='object'||Array.isArray(spec))fail('medics: an object, or leave it out');
  const extra=Object.keys(spec).find(k=>!MEDIC_KEYS.includes(k));if(extra!==undefined)fail(`unknown key ${extra}`);
  const pt=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=playable.minX&&p[0]<=playable.maxX&&p[1]>=playable.minZ&&p[1]<=playable.maxZ+30;
  if(!Array.isArray(spec.ids)||spec.ids.length!==2||new Set(spec.ids).size!==2||!spec.ids.every(id=>/^np_maqueiro_\d+$/.test(id)))fail('ids: two different np_maqueiro_N');
  if(!pt(spec.from)||!pt(spec.exit))fail('from / exit: [x, z] in the area (the south edge may be left by up to 30 m)');
  if(!num(spec.pace,.8,5)||!num(spec.runPace,spec.pace,8)||!Number.isInteger(spec.maxCasualties)||spec.maxCasualties<1||spec.maxCasualties>2||!num(spec.pickupM,.5,3))fail('pace 0.8-5 / runPace pace-8 / maxCasualties 1-2 / pickupM 0.5-3');
  return deepFreeze({ids:[...spec.ids],from:[...spec.from],exit:[...spec.exit],pace:spec.pace,runPace:spec.runPace,maxCasualties:spec.maxCasualties,pickupM:spec.pickupM});
}
export const MEDIC_STATES=Object.freeze(['idle','toPatient','carry']);
export const MEDIC_RECORD_KEYS=Object.freeze(['handled','patient','since','state']);
export function freshMedicRecord(){return {state:'idle',patient:null,handled:0,since:0};}
/** A saved medic record: its keys, a known state, the patient a man of the line while the bearers are on their way or carrying, a count within the act's limit. Never throws. */
export function validMedicRecord(plan,rec,clock,lineIds){
  if(!rec||typeof rec!=='object'||Array.isArray(rec)||Object.keys(rec).sort().join()!==MEDIC_RECORD_KEYS.join())return false;
  if(!MEDIC_STATES.includes(rec.state)||!Number.isInteger(rec.handled)||rec.handled<0||rec.handled>plan.maxCasualties||!num(rec.since,0,clock))return false;
  return rec.state==='idle'?rec.patient===null:lineIds.includes(rec.patient)&&rec.handled<plan.maxCasualties;
}
