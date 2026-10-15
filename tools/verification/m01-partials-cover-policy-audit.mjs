// CAPTAIN-AMENDMENT-01: preserve raw predecessor exposure; compare the same approved WEST hold exactly.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {coverRoute} from '../../tests/helpers/m01-cover.js';
const args=process.argv.slice(2),opt=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const baseRoot=resolve(opt('--baseline',process.env.M01_PARTIALS_BASELINE??'/workspace/scratch/COD-guerra-partials-baseline'));
const out=opt('--out','test-results/partials-correction-01/cover-policy-audit.json');
const seeds=opt('--seeds','19390901,1,2,3,4,5,6,7,8,9,10,11').split(',').map(Number);
const predecessor='bc8f6a21a57ccd926d4e0655481908d90d6b1978';
assert.equal(execFileSync('git',['-C',baseRoot,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),predecessor);
assert.equal(execFileSync('git',['-C',baseRoot,'status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),'','immutable predecessor must be clean');
const {M01Simulation:Before}=await import(pathToFileURL(baseRoot+'/src/game/m01-simulation.js'));
const {coverRoute:beforeCover}=await import(pathToFileURL(baseRoot+'/tests/helpers/m01-cover.js'));
const hash=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
function westCarryHoldReplay(originalReady,id,pendingAtTickStart){return originalReady(id)&&(id!=='evt_m01_west_demolition'||!pendingAtTickStart);}
const helperPaths=['src/game/m01-simulation.js','tests/helpers/m01-cover.js','tests/helpers/m01-route.js'];
const sourceHashes=root=>Object.fromEntries(helperPaths.map(p=>[p,hash(readFileSync(resolve(root,p)))]));
const range=(runs,mode,pick)=>{const v=runs.filter(r=>r.mode===mode).map(pick);return [Math.min(...v),Math.max(...v)];};
function summarize(runs){return Object.fromEntries(['help','ignore'].map(mode=>[mode,{
 repairRealSeconds:range(runs,mode,r=>r.repair.realSeconds),repairEnd:[...new Set(runs.filter(r=>r.mode===mode).map(r=>r.repair.end))].sort(),
 repairPins:range(runs,mode,r=>r.repair.pins),gateMgSuppressedPct:range(runs,mode,r=>r.repairMgSuppressedPct),
 survivors:range(runs,mode,r=>r.survivors),health:range(runs,mode,r=>r.health),activeSeconds:range(runs,mode,r=>r.activeSeconds)}]));}
const exposure=result=>({clock:result.sim.clock,battleClock:result.sim.battleClock,rng:result.sim.rng.state,issuedRounds:result.sim.enemyFire.nextId,
 eventCounts:result.events.reduce((a,e)=>(a[e.type]=(a[e.type]??0)+1,a),{}),actors:result.sim.actors.filter(a=>!a.displayOnly).map(({id,health,alive})=>({id,health,alive}))});
const invariantStats=({activeSeconds,enemyFire,...protectedStats})=>protectedStats;
const report={task:'M01-PARTIALS-COMPLETION-INTEGRATION-V1',amendment:'CAPTAIN-AMENDMENT-01',predecessor,seeds,
 policy:{source:westCarryHoldReplay.toString(),authority:'Candidate carry/carriedBy at the beginning of the SAME numbered tick; only predecessor WEST readiness is delayed. No clock, RNG, health, event or stats mask.',sourceHashes:{current:sourceHashes('.'),predecessor:sourceHashes(baseRoot)}},
 rawPredecessor:{runs:[]},current:{runs:[]},policyReplayPredecessor:{runs:[]},routes:[]};
mkdirSync(dirname(out),{recursive:true});
for(const seed of seeds)for(const mode of ['help','ignore']){
 const raw=beforeCover(seed,mode),schedule=[],intervals=[],currentControls=createHash('sha256');let openInterval=null;
 class Candidate extends M01Simulation{tick(dt,controls){const bak=this.actor('jozef_bak'),pending=Boolean(bak.carry||bak.carriedBy);schedule.push(pending);currentControls.update(JSON.stringify([dt,controls])+'\n');
  if(pending&&!openInterval){openInterval={startTick:schedule.length,startClock:this.clock};intervals.push(openInterval);}if(!pending&&openInterval){openInterval.endTick=schedule.length-1;openInterval.endClock=this.clock;openInterval=null;}return super.tick(dt,controls);}}
 const current=coverRoute(seed,mode,{Simulation:Candidate});assert.equal(openInterval,null,'carry must finish');
 const originalTick=Before.prototype.tick,originalReady=Before.prototype.readiness;let tick=0,pendingAtTickStart=false;const replayControls=createHash('sha256');let replay;
 try{
  Before.prototype.tick=function(dt,controls){assert.ok(tick<schedule.length,'replay cannot exceed candidate ticks');pendingAtTickStart=schedule[tick++];replayControls.update(JSON.stringify([dt,controls])+'\n');return originalTick.call(this,dt,controls);};
  Before.prototype.readiness=function(id){return westCarryHoldReplay(originalReady.bind(this),id,pendingAtTickStart);};
  replay=beforeCover(seed,mode);
 }finally{Before.prototype.tick=originalTick;Before.prototype.readiness=originalReady;}
 assert.equal(tick,schedule.length,'same complete control route duration');const controlSha256=currentControls.digest('hex');assert.equal(replayControls.digest('hex'),controlSha256,'same dt and actual controls each tick');
 assert.deepEqual(current.stats,replay.stats,'EVERY outcome stat equals explicit policy replay');
 assert.deepEqual(invariantStats(current.stats),invariantStats(raw.stats),'raw repair, health, survivors, player shots, casualty times, historical battle instants, checkpoints and lethal rounds stay exact');
 const before=exposure(raw),after=exposure(current),policy=exposure(replay);
 // New optional loader/yard actors are separately recorded; every prior combatant health/alive remains exact.
 const oldIds=new Set(before.actors.map(a=>a.id));assert.deepEqual(after.actors.filter(a=>oldIds.has(a.id)),before.actors);
 assert.equal(after.clock,policy.clock);assert.equal(after.battleClock,policy.battleClock);assert.equal(after.rng,policy.rng);assert.equal(after.issuedRounds,policy.issuedRounds);
 report.rawPredecessor.runs.push(raw.stats);report.current.runs.push(current.stats);report.policyReplayPredecessor.runs.push(replay.stats);
 report.routes.push({seed,mode,ticks:schedule.length,controlSha256,carryScheduleSha256:hash(schedule),carryIntervals:intervals,raw:before,current:after,policyReplay:policy,
 rawDeltas:{realSeconds:after.clock-before.clock,activeSeconds:current.stats.activeSeconds-raw.stats.activeSeconds,enemyFire:current.stats.enemyFire-raw.stats.enemyFire,issuedRounds:after.issuedRounds-before.issuedRounds,rngBefore:before.rng,rngAfter:after.rng,
 eventCounts:Object.fromEntries([...new Set([...Object.keys(before.eventCounts),...Object.keys(after.eventCounts)])].map(k=>[k,(after.eventCounts[k]??0)-(before.eventCounts[k]??0)]))},exactStatsAndSummary:'PENDING summary'});
 writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({seed,mode,ticks:tick,rawExtraSeconds:after.clock-before.clock,rawExtraRounds:after.issuedRounds-before.issuedRounds,exactPolicyStats:'PASS'}));
}
for(const key of ['rawPredecessor','current','policyReplayPredecessor'])report[key].summary=summarize(report[key].runs);
assert.deepEqual(report.current.runs,report.policyReplayPredecessor.runs);assert.deepEqual(report.current.summary,report.policyReplayPredecessor.summary);
for(const row of report.routes)row.exactStatsAndSummary='PASS';report.result='PASS';writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(`PASS ${seeds.length} seeds / ${seeds.length*2} routes: complete raw reports retained; exact stats/summary under explicitly recorded WEST policy`);
