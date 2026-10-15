import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {M01Simulation,seconds} from '../../src/game/m01-simulation.js';
import {route} from '../../tests/helpers/m01-route.js';
import {PRESENTATION_FIELDS} from '../../src/game/m01-animation-presentation.js';
import {AUXILIARY_IDS} from '../../src/game/m01-yard-life.js';
import {compareContinuation} from '../../tests/helpers/m01-determinism.js';
import {firstDifference} from '../../tests/helpers/m01-determinism.js';
import {closestApproach} from '../../src/game/m01-fire.js';
import {GameplayDigest,gameplayFrame} from '../../tests/helpers/m01-animation-contract.js';
const out=process.env.M01_PARTIALS_AUDIT_OUT??'docs/verification/m01-runtime/partials-completion-integration-v1';mkdirSync(out,{recursive:true});
const baselineRoot=process.env.M01_PARTIALS_BASELINE??'/workspace/scratch/COD-guerra-partials-baseline';
assert.equal(process.arch,'x64','D30: exact gameplay golden regeneration requires x86');
assert.equal(execFileSync('git',['-C',baselineRoot,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),'bc8f6a21a57ccd926d4e0655481908d90d6b1978','immutable predecessor ref');
const {M01Simulation:Before}=await import(pathToFileURL(baselineRoot+'/src/game/m01-simulation.js'));
const historical=JSON.parse(readFileSync('tests/fixtures/m01-anim-gameplay-baseline.json'));
const hash=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
const golden={task:'M01-PARTIALS-COMPLETION-INTEGRATION-V1',generationStage:'implementation candidate after exact predecessor authority comparison',predecessor:'bc8f6a21a57ccd926d4e0655481908d90d6b1978',
 sourceSha256:hash(readFileSync('src/game/m01-simulation.js')),historicalGoldenSha256:hash(readFileSync('tests/fixtures/m01-anim-gameplay-baseline.json')),routes:[]};
// Exact approved deltas only. Full player, RNG, clocks, gates, objectives, flags, damage/rounds and old combatants remain compared.
function projection(raw){const s=structuredClone(raw);delete s.resumeCheckpoint;
 for(const key of ['dialogueConsumed','dialogueQueue','subtitle','scene','sceneDone'])delete s[key];
 s.actors=s.actors.filter(a=>!AUXILIARY_IDS.includes(a.id));
 const carrying=Object.hasOwn(raw.consumed,'evt_m01_dudek_retrieves_bak')||raw.flags['m01.bak_status']==='rescued_by_player';
 const exiting=Object.hasOwn(raw.consumed,'evt_m01_east_demolition');
 for(const a of s.actors){for(const key of PRESENTATION_FIELDS)delete a[key];
  // T36 loader/belt/reload/fade are optional presentation data; issued rounds remain exact below.
  delete a.mg34Prone;
  if(a.weapon==='kar98k')delete a.rounds;
  if(carrying&&['jozef_bak','leon_dudek'].includes(a.id)){for(const k of ['x','y','z','state','facing','carriedBy','task','target','crouched','suppressedUntil'])delete a[k];}
  if(a.ckm){delete a.ckm;if(exiting)for(const k of ['x','y','z','state','facing'])delete a[k];}
 }
 for(const d of s.sectors.damage)delete d.smokeSeconds;
 return s;
}
function eventProjection(events,sim){const transport=Object.hasOwn(sim.consumed,'evt_m01_dudek_retrieves_bak')||sim.flags['m01.bak_status']==='rescued_by_player';
 const preActions=sim.definition.cutscenes.flatMap(c=>c.preRoll?.timeline??[]).map(b=>b.action).filter(Boolean);
 return structuredClone(events).filter(e=>!e.continuity&&!(e.type==='message'&&preActions.includes(e.message))).map(e=>{
  if(e.type==='m01-blast')delete e.kind;if(e.type==='npc-shot')delete e.weapon;if(e.type==='round-impact'){delete e.pass;if(transport)e.pinned=e.pinned.filter(id=>!['jozef_bak','leon_dudek'].includes(id));}return e;
 });
}
const report={task:golden.task,predecessor:golden.predecessor,historicalGoldenSha256:golden.historicalGoldenSha256,projectionSource:projection.toString(),eventProjectionSource:eventProjection.toString(),routes:[]};
const cases=process.env.M01_PARTIALS_AUDIT_SEEDS?process.env.M01_PARTIALS_AUDIT_SEEDS.split(',').map(Number).flatMap(seed=>[false,true].map(support=>({seed,support}))):[{seed:19390901,support:false},{seed:7,support:true}];
for(const {seed,support}of cases){
 const old=new Before(seed),digest=new GameplayDigest(),row={seed,support,ticks:0,strictAuthority:'PASS',firstDifference:null,phaseTimes:{},cueContinuations:[],carrySpatialSuppression:[],continuity:[],dialogues:{},westReadyAt:null};old.drainEvents();
 const result=route(seed,{support,onStep:({sim,controls,dt,events})=>{
  const flights=structuredClone(old.enemyFire.rounds.filter(r=>r.arriveAt<=old.clock+dt));old.tick(dt,structuredClone(controls));const oldEvents=old.drainEvents();row.ticks++;
  const oldDudek=old.actor('leon_dudek'),newDudek=sim.actor('leon_dudek');
  if(oldEvents.some(e=>e.type==='round-impact'&&e.pinned?.includes('leon_dudek'))&&!events.some(e=>e.type==='round-impact'&&e.pinned?.includes('leon_dudek'))&&row.carrySpatialSuppression.length<5)row.carrySpatialSuppression.push({tick:row.ticks,clock:sim.clock,battleClock:sim.battleClock,oldDudek:structuredClone(oldDudek),newDudek:structuredClone(newDudek),oldBak:structuredClone(old.actor('jozef_bak')),newBak:structuredClone(sim.actor('jozef_bak')),oldEvents,newEvents:events,flights:flights.map(r=>({...r,oldApproach:closestApproach(r,1,{x:oldDudek.x,y:oldDudek.y+.9,z:oldDudek.z}),newApproach:closestApproach(r,1,{x:newDudek.x,y:newDudek.y+.9,z:newDudek.z})}))});
  const difference=firstDifference({state:projection(old.snapshot(false)),events:eventProjection(oldEvents,old)},{state:projection(sim.snapshot(false)),events:eventProjection(events,sim)});
  if(difference&&!row.firstDifference){row.strictAuthority='FAIL';row.firstDifference={tick:row.ticks,clock:sim.clock,difference};}
  digest.add(gameplayFrame(sim,events));
  for(const at of ['04:34:30','04:44:30','04:46:00','06:38:30'])if(sim.battleClock>=seconds(at)&&!row.cueContinuations.some(c=>c.label===at)){const continued=new M01Simulation();continued.restoreSnapshot(sim.snapshot());row.cueContinuations.push(compareContinuation(continued,{label:at,ticks:12,doubleAt:[4]}));}
  for(const [id,at]of Object.entries(sim.consumed))if(row.phaseTimes[id]===undefined)row.phaseTimes[id]={clock:at,battleClock:sim.battleClock};
  for(const e of events)if(e.continuity)row.continuity.push({clock:sim.clock,battleClock:sim.battleClock,...e.continuity,text:e.message});
  for(const id of ['018','019','038','048','049','051'])if(!row.dialogues[id]&&[sim.subtitle,...sim.dialogueQueue].some(l=>l?.id==='dlg_m01_'+id))row.dialogues[id]={clock:sim.clock,battleClock:sim.battleClock};
  if(row.westReadyAt===null&&sim.readiness('evt_m01_west_demolition'))row.westReadyAt=sim.battleClock;
 }});
 const times=[seconds('04:46:00'),...row.continuity.map(c=>c.battleClock).filter(t=>t>=seconds('04:46:00')&&t<=seconds('06:45:00')),seconds('06:45:00')].sort((a,b)=>a-b);
 row.maxNarrativeGapSec=Math.max(...times.slice(1).map((t,i)=>t-times[i]));row.activityDefinition='Authored task-specific narrative messages only; excludes bullets, distant emitters, simulation ticks and RNG-driven ambient events.';
 row.final={rng:result.sim.rng.state,checkpoints:result.sim.checkpointsReached,westDemolition:row.phaseTimes.evt_m01_west_demolition,complete:result.sim.mission.complete};
 report.routes.push(row);golden.routes.push({seed,support,...digest.finish()});writeFileSync(out+'/PREDECESSOR_DELTA_AUDIT.json',JSON.stringify(report,null,2)+'\n');
 if(row.firstDifference)console.log(JSON.stringify(row.firstDifference));
 assert.equal(row.strictAuthority,'PASS','strict authority projection must match predecessor every tick');assert.ok(row.maxNarrativeGapSec<=60.1);assert.ok(row.westReadyAt<=seconds('06:45:00'));
 console.log(JSON.stringify({seed,support,ticks:row.ticks,maxNarrativeGapSec:row.maxNarrativeGapSec,westReadyAt:row.westReadyAt}));
}
if(process.argv.includes('--write-golden'))writeFileSync('tests/fixtures/m01-partials-gameplay-baseline.json',JSON.stringify(golden,null,2)+'\n');
else assert.deepEqual(JSON.parse(readFileSync('tests/fixtures/m01-partials-gameplay-baseline.json')),golden);
