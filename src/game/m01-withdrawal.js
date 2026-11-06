// R4 INC-3 (2026-11-04): the withdrawal of Act VII-c «Ordem ~17:00 e retirada» (missions/m01-tczew/areas/np/act-vii-c.json, docs/direction/M01_R4_VII_BC_DESIGN.md §3). The counterpart of m01-shell-blast.js for
// VII-b: the plan of the withdrawal validated once (a typo stops the game instead of changing it), the saved record of its state and the validator of that record. The steps themselves are in
// m01-area-sim.js (stepWithdrawal), which applies them through the paths it already has: walk, the squad machinery of m01-act-factories.js (makeSquadPlan / squadStep: the same bounds the current act's
// squad makes in its own withdrawal), say, saveCheckpoint.
//
// GAMEPLAY_DRAMATIZATION throughout, except the order and the withdrawal at dusk themselves (T03, MÉDIA): the sources say that an order to leave Tczew at dusk came at about 17:00 and that the battalion left
// between 18:00 and 20:00, and nothing about who brought the order, by which way, in which order, or whether anyone was met on the way. There is therefore NOBODY on the other side in this act, and the
// German probe of the design (D-5) is not built: its flag lives in the data as `probe.enabled:false` and a plan that sets it to true is refused.
// No world, no clock, no stream: a function of the data and of the saved record only. Nothing here is drawn from any random stream.
import {makeSquadPlan,validSquadRecord} from './m01-act-factories.js';

const num=(v,lo,hi)=>Number.isFinite(v)&&v>=lo&&v<=hi;
const deepFreeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.freeze(v);for(const x of Object.values(v))deepFreeze(x);}return v;};
const copy=v=>JSON.parse(JSON.stringify(v));
const near=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);

/** The block's keys (anything else is a typo). */
const WITHDRAWAL_KEYS=Object.freeze(['classification','note','exit','messenger','line','rear','outGraceSec','lag','probe']);
const EXIT_KEYS=Object.freeze(['minX','maxX','minZ','maxZ','note']);
const MESSENGER_KEYS=Object.freeze(['id','from','to','pace','speakSec','classification','note']);
const LAG_KEYS=Object.freeze(['distanceM','afterSec','note']);
export const MESSENGER_STATES=Object.freeze(['idle','walking','speaking','leaving','gone']);
/** The two squad records of a withdrawal in sim.timers, besides the section's own (`squad`): the line's bounds and the rear guard's. */
export const WITHDRAWAL_SQUAD_KEYS=Object.freeze(['line','rear']);
const MIN_SLOT_GAP_M=1.3;

/** Is the point inside the exit band (a rectangle), `margin` metres in from its edges? */
export const inBand=(band,p,margin=0)=>p.x>=band.minX+margin&&p.x<=band.maxX-margin&&p.z>=band.minZ+margin&&p.z<=band.maxZ-margin;

/**
 * Where the two men of the ckm crew stand round the gun root (the offsets of the current act's posts turned from east to north, the arithmetic of M01AreaSimulation.makeActors): the stage of the line's squad
 * plan for them, which has to be exactly where they start (tests/m01-act-vii-c.test.js checks it).
 */
export function ckmCrewStage(root,ids){
  const [rx,,rz]=root,posts=[[-.794,-.029],[.08,-.52]];
  return Object.fromEntries(ids.map((id,i)=>{const [dx,dz]=posts[i];return [id,{x:rx+dz,z:rz-dx}];}));
}

/**
 * `spec`: act.withdrawal. `ctx`: {playable (the area's rectangle), label, lineIds (the line's men then the ckm crew, in the roster's order), lineStage ({id: {x, z}} where each stands when the act opens),
 * section (the plan of the section's squad: its teams, whose last post is the parapet where the rear guard stands before it leaves)}.
 * Returns the frozen plan {exit, messenger, line, rear, lineStage, rearStage, ids: {line, rear}, outGraceSec, lag, probe}: `line` and `rear` are squad plans (makeSquadPlan) whose men all end in the exit band.
 */
export function makeWithdrawalPlan(spec,{playable,label='M01 withdrawal',lineIds,lineStage,section}){
  const fail=m=>{throw new Error(`${label}: ${m}`);};
  if(!spec||typeof spec!=='object'||Array.isArray(spec))fail('withdrawal: an object, or leave it out');
  const extra=Object.keys(spec).find(k=>!WITHDRAWAL_KEYS.includes(k));if(extra!==undefined)fail(`unknown key ${extra}`);
  const inArea=(x,z,m=0)=>Number.isFinite(x)&&Number.isFinite(z)&&x>=playable.minX-m&&x<=playable.maxX+m&&z>=playable.minZ-m&&z<=playable.maxZ+m;
  // the exit band: a rectangle inside the playable area, big enough to hold the whole column
  const e=spec.exit;
  if(!e||typeof e!=='object'||Array.isArray(e)||Object.keys(e).some(k=>!EXIT_KEYS.includes(k))||![e.minX,e.maxX,e.minZ,e.maxZ].every(Number.isFinite)||e.minX>=e.maxX||e.minZ>=e.maxZ||
    e.minX<playable.minX||e.maxX>playable.maxX||e.minZ<playable.minZ||e.maxZ>playable.maxZ||e.maxX-e.minX<20||e.maxZ-e.minZ<6)
    fail('exit {minX, maxX, minZ, maxZ} inside the playable area, at least 20 x 6 m (the act ends in it, before any count of leaving the bounds)');
  // the messenger: a fictional man with a way in and a way out
  const m=spec.messenger;
  if(!m||typeof m!=='object'||Array.isArray(m)||Object.keys(m).some(k=>!MESSENGER_KEYS.includes(k))||typeof m.id!=='string'||!/^np_[a-z0-9_]+$/.test(m.id))fail('messenger.id (np_...)');
  const pt=p=>Array.isArray(p)&&p.length===2&&inArea(p[0],p[1]);
  if(!pt(m.from)||!pt(m.to)||!num(m.pace,1,8)||!num(m.speakSec,1,12))fail('messenger from / to inside the area, pace 1-8, speakSec 1-12');
  if(near(m.from,m.to)<10)fail('messenger: from and to at least 10 m apart');
  // the squads
  const line=makeSquadPlan(spec.line,`${label} line`),rear=makeSquadPlan(spec.rear,`${label} rear`);
  const ids=(plan)=>plan.teams.flat(),same=(a,b)=>a.length===b.length&&[...a].sort().join()===[...b].sort().join();
  if(!same(ids(line),lineIds))fail(`line: its teams are exactly the line's ${lineIds.length} men and the ckm crew (${lineIds.join(', ')})`);
  if(!same(ids(rear),ids(section)))fail(`rear: its teams are exactly the section's (${ids(section).join(', ')})`);
  if(!ids(section).includes('marek_zielinski'))fail('the section\'s squad moves its leader too (marek_zielinski in a team): the rear guard leaves from where it stopped');
  const margin=Math.max(line.arriveM,rear.arriveM)+.05,xs=[];
  for(const [name,plan] of [['line',line],['rear',rear]]){
    for(const [k,p] of plan.posts.entries()){
      if(!p)continue;
      const last=k===plan.posts.length-1,list=Object.entries(p.slots);
      for(const [id,[x,z]] of list){
        if(!inArea(x,z))fail(`${name}: ${p.id}: slot of ${id} outside the area`);
        if(last&&!inBand(e,{x,z},margin))fail(`${name}: ${p.id}: slot of ${id} at least ${margin.toFixed(2)} m inside the exit band (the man leaves the field when he arrives, and arriving means being in the band)`);
        if(last)xs.push([id,x,z]);
      }
      for(let i=0;i<list.length;i++)for(let j=0;j<i;j++)if(near(list[i][1],list[j][1])<MIN_SLOT_GAP_M)fail(`${name}: ${p.id}: ${list[i][0]} and ${list[j][0]} less than ${MIN_SLOT_GAP_M} m apart`);
    }
    // every team's last move goes to the last post: the whole column ends in the exit band
    plan.teams.forEach((t,i)=>{const mine=plan.moves.filter(x=>x.team===i);if(!mine.length||mine.at(-1).to!==plan.posts.length-1)fail(`${name}: team ${i}'s last move goes to the last post (the exit band)`);});
  }
  for(let i=0;i<xs.length;i++)for(let j=0;j<i;j++)if(Math.hypot(xs[i][1]-xs[j][1],xs[i][2]-xs[j][2])<MIN_SLOT_GAP_M)fail(`exit band: ${xs[i][0]} and ${xs[j][0]} less than ${MIN_SLOT_GAP_M} m apart`);
  for(const id of lineIds)if(!lineStage[id])fail(`lineStage: where ${id} stands when the act opens`);
  // the rest
  if(!num(spec.outGraceSec,10,300))fail('outGraceSec 10-300 (seconds after the last bound began that a man who has not reached the band is taken off the field: a man stuck on something cannot hold the act for ever)');
  const lag=spec.lag;
  if(!lag||typeof lag!=='object'||Array.isArray(lag)||Object.keys(lag).some(k=>!LAG_KEYS.includes(k))||!num(lag.distanceM,10,300)||!num(lag.afterSec,0,300))fail('lag {distanceM 10-300, afterSec 0-300}');
  const pr=spec.probe;
  if(pr!==undefined){
    if(!pr||typeof pr!=='object'||Array.isArray(pr)||typeof pr.enabled!=='boolean'||Object.keys(pr).some(k=>k!=='enabled'&&k!=='note'))fail('probe: {enabled: false, note}, or leave it out');
    if(pr.enabled)fail('probe.enabled: D-5 (a German probe during the withdrawal) has no source and is not built; keep it false until the owner decides D-5 and the probe exists');
  }
  const rearStage=Object.fromEntries(Object.entries(section.posts.at(-1).slots).map(([id,[x,z]])=>[id,{x,z}]));
  return deepFreeze({exit:{minX:e.minX,maxX:e.maxX,minZ:e.minZ,maxZ:e.maxZ},messenger:{id:m.id,from:[...m.from],to:[...m.to],pace:m.pace,speakSec:m.speakSec},line,rear,
    lineStage:Object.fromEntries(Object.entries(lineStage).map(([id,p])=>[id,{x:p.x,z:p.z}])),rearStage,ids:{line:ids(line),rear:ids(rear)},outGraceSec:spec.outGraceSec,lag:copy({distanceM:lag.distanceM,afterSec:lag.afterSec}),probe:{enabled:false}});
}

/**
 * The saved record of the withdrawal (sim.timers.withdrawal). `messenger`: where the courier is in his errand (idle until the dusk card ends, walking in, speaking, leaving, gone); `since`: when it began;
 * `orderAt`: when the order was given (the messenger arrived); `lineOutAt`: when the last man of the line and the ckm crew left the field; `rearGoAt`: when the rear guard began its bounds; `rearOutAt`:
 * when its last man left; `exitedAt`: when the player, in the band, saw the rear guard out (the act's end); `out`: the ids of the men who have left the field, in the order they left.
 */
export const WITHDRAWAL_RECORD_KEYS=Object.freeze(['exitedAt','lineOutAt','messenger','orderAt','out','rearGoAt','rearOutAt','since']);
export function freshWithdrawalRecord(){return {messenger:'idle',since:0,orderAt:null,lineOutAt:null,rearGoAt:null,rearOutAt:null,exitedAt:null,out:[]};}
/**
 * A saved record this machine could have written: its keys, the stages in order (a stage cannot be later than the one before it is missing), the times between the clock's start and now and in the order
 * of the plot, the men who are out the men of the plan, inactive and in the band; those who are not out still on the field; a messenger on the field exactly while he walks, speaks or leaves. Never throws.
 * `actors`: the saved actors.
 */
export function validWithdrawalRecord(plan,rec,clock,actors){
  if(!rec||typeof rec!=='object'||Array.isArray(rec)||Object.keys(rec).sort().join()!==WITHDRAWAL_RECORD_KEYS.join())return false;
  const at=(v,lo)=>v===null||num(v,lo,clock+1e-9);
  if(!MESSENGER_STATES.includes(rec.messenger)||!num(rec.since,0,clock+1e-9))return false;
  const spoke=['speaking','leaving','gone'].includes(rec.messenger);
  if(spoke!==(rec.orderAt!==null)||!at(rec.orderAt,0))return false;
  if(rec.messenger==='speaking'&&rec.since!==rec.orderAt)return false;
  if(spoke&&rec.since<rec.orderAt-1e-9)return false;
  // the stages of the plot, each after the one before it
  const stages=[rec.orderAt,rec.lineOutAt,rec.rearGoAt,rec.rearOutAt,rec.exitedAt];
  for(let i=1;i<stages.length;i++){
    if(stages[i]!==null&&(stages[i-1]===null||!num(stages[i],stages[i-1]-1e-9,clock+1e-9)))return false;
  }
  if(!Array.isArray(rec.out)||rec.out.length>plan.ids.line.length+plan.ids.rear.length||new Set(rec.out).size!==rec.out.length)return false;
  const byId=new Map((Array.isArray(actors)?actors:[]).map(a=>[a?.id,a])),men=[...plan.ids.line,...plan.ids.rear];
  if(rec.out.some(id=>!men.includes(id)))return false;
  if((rec.lineOutAt!==null)!==plan.ids.line.every(id=>rec.out.includes(id))||(rec.rearOutAt!==null)!==plan.ids.rear.every(id=>rec.out.includes(id)))return false;
  if(rec.rearGoAt===null&&plan.ids.rear.some(id=>rec.out.includes(id)))return false;
  for(const id of men){
    const a=byId.get(id);if(!a||typeof a.active!=='boolean')return false;
    const out=rec.out.includes(id);
    if(out===a.active||(out&&!inBand(plan.exit,a)))return false;
  }
  const mes=byId.get(plan.messenger.id);
  return Boolean(mes)&&mes.active===['walking','speaking','leaving'].includes(rec.messenger);
}

/** The saved squad records of the withdrawal (the line's and the rear guard's): the same record as the section's. Never throws. */
export function validWithdrawalSquads(plan,timers,clock){
  return validSquadRecord(plan.line,timers?.line,clock)&&validSquadRecord(plan.rear,timers?.rear,clock);
}
