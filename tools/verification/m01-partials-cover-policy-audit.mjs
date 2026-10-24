// CAPTAIN-AMENDMENT-03: retain every raw result; attribute additional real projectile exposure explicitly.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {coverRoute} from '../../tests/helpers/m01-cover.js';
const args=process.argv.slice(2),opt=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const baseRoot=resolve(opt('--baseline',process.env.M01_PARTIALS_BASELINE??'/workspace/scratch/COD-guerra-partials-baseline'));
const out=opt('--out','test-results/partials-correction-02/cover-policy-audit.json');
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
 player:structuredClone(result.sim.player),consumed:structuredClone(result.sim.consumed),complete:result.sim.mission.complete,failure:result.sim.failure,events:result.events,
 eventCounts:result.events.reduce((a,e)=>(a[e.type]=(a[e.type]??0)+1,a),{}),actors:result.sim.actors.filter(a=>!a.displayOnly).map(({id,health,alive})=>({id,health,alive}))});
// Only these three fields can differ from RAW; health is checked by an exact independently attributed equation below.
const invariantStats=({activeSeconds,enemyFire,health,...protectedStats})=>protectedStats;
function context(sim,candidateCarry){const b=sim.actor('jozef_bak');return {clock:sim.clock,battleClock:sim.battleClock,gate:structuredClone(sim.gate),player:structuredClone(sim.player),bak:{carry:structuredClone(b.carry??null),carriedBy:b.carriedBy??null},candidateCarryAtTickStart:candidateCarry??null};}
function traced(Base,trace,{beforeTick=()=>null,afterTick=()=>{}}={}){return class extends Base{
 tick(dt,controls){trace.controls.push([dt,structuredClone(controls)]);const health=this.player.health,start=trace.hits.length;this.auditCarry=beforeTick(this,dt,controls);trace.initialHealth??=health;trace.westReady.push(this.readiness('evt_m01_west_demolition'));
  const ret=super.tick(dt,controls),delta=this.player.health-health,attributed=trace.hits.slice(start).reduce((n,h)=>n+h.healthAfter-h.healthBefore,0);
  if(delta!==attributed)trace.unexplained.push({context:context(this,this.auditCarry),healthBefore:health,healthAfter:this.player.health,projectileDelta:attributed});
  trace.tickAuthority.push([this.clock,this.battleClock,this.rng.state,this.player.health,this.player.alive]);afterTick(this);return ret;}
 burst(...args){const first=this.enemyFire.nextId,c=context(this,this.auditCarry),n=this.events.length,ret=super.burst(...args);
  for(const r of this.enemyFire.rounds)if(Number(r.id.split('_').at(-1))>=first&&!trace.emissions[r.id])trace.emissions[r.id]={round:structuredClone(r),context:c,events:structuredClone(this.events.slice(n))};
  const rounds=[...this.enemyFire.rounds,...this.actors.flatMap(a=>a.mg34Prone?.burst?.plan??[])];
  for(const r of rounds)if(Number(r.id.split('_').at(-1))>=first)trace.issues[r.id]={round:structuredClone(r),context:c};return ret;}
 emitMG34Rounds(...args){const ids=new Set(this.enemyFire.rounds.map(r=>r.id)),c=context(this,this.auditCarry),n=this.events.length,ret=super.emitMG34Rounds(...args);
  for(const r of this.enemyFire.rounds)if(!ids.has(r.id))trace.emissions[r.id]={round:structuredClone(r),context:c,events:structuredClone(this.events.slice(n))};return ret;}
 landRound(r){const health=this.player.health,n=this.events.length,c=context(this,this.auditCarry),ret=super.landRound(r);
  const impact={...c,round:structuredClone(r),healthBefore:health,healthAfter:this.player.health,events:structuredClone(this.events.slice(n)),issue:trace.issues[r.id]??null,emission:trace.emissions[r.id]??null};
  if(trace.recordAllImpacts)trace.impacts[r.id]=impact;if(this.player.health!==health)trace.hits.push(impact);return ret;}
};}
// The immutable predecessor cover helper predates its Simulation injection option. Wrap its actual prototype
// only for the synchronous route call; restore every method even on failure (never edit predecessor bytes).
function runBefore(seed,mode,trace,options={},policyReady=null){
 const originals=Object.fromEntries(['tick','burst','landRound','emitMG34Rounds','readiness'].map(k=>[k,Before.prototype[k]]));
 class Original extends Before{};for(const key of ['tick','burst','landRound','emitMG34Rounds'])Original.prototype[key]=originals[key];
 const Traced=traced(Original,trace,options);
 try{for(const key of ['tick','burst','landRound','emitMG34Rounds'])Before.prototype[key]=Traced.prototype[key];
  if(policyReady)Before.prototype.readiness=function(id){return westCarryHoldReplay(originals.readiness.bind(this),id,policyReady());};
  return beforeCover(seed,mode);
 }finally{Object.assign(Before.prototype,originals);}
}
const newTrace=(recordAllImpacts=false)=>({recordAllImpacts,controls:[],tickAuthority:[],westReady:[],issues:{},emissions:{},impacts:{},hits:[],unexplained:[],holds:[]});
// Match every causal hit field; retain full events above. Only the two authorised finite-carry actors' suppression and the accepted
// presentation-only impact-pass field are reported, not mistaken for player damage authority.
const hitEvents=h=>h.events.map(e=>{if(e.type!=='round-impact')return e;const {pass,pinned,...rest}=e;return {...rest,pinned:pinned.filter(id=>!['jozef_bak','leon_dudek'].includes(id))};});
const hitAuthority=h=>({clock:h.clock,battleClock:h.battleClock,gate:h.gate,player:h.player,round:h.round,healthBefore:h.healthBefore,healthAfter:h.healthAfter,events:hitEvents(h),emission:h.emission&&{round:h.emission.round,clock:h.emission.context.clock,battleClock:h.emission.context.battleClock,gate:h.emission.context.gate,player:h.emission.context.player,events:h.emission.events},issue:h.issue&&{round:h.issue.round,clock:h.issue.context.clock,battleClock:h.issue.context.battleClock,gate:h.issue.context.gate,player:h.issue.context.player}});
const report={task:'M01-PARTIALS-COMPLETION-INTEGRATION-V1',amendment:'CAPTAIN-AMENDMENT-03',predecessor,seeds,
 policy:{source:westCarryHoldReplay.toString(),healthComparison:{source:hitAuthority.toString(),eventProjectionSource:hitEvents.toString(),scope:'Only hit-causality comparison projects impact events: T05 adds pass; T36 finite Bak/Dudek path can change only their pinned membership. Every other pinned ID and every player/health/projectile/impact/source/weapon/time/point/material/distance field remain exact. Full events and tick controls/health/RNG are retained, unmodified.'},authority:'Only predecessor WEST readiness is delayed from candidate carry/carriedBy at the beginning of the SAME numbered tick. No clock, RNG, health or event mask. Raw health is exactly raw minus separately identified extra real impacts.',sourceHashes:{current:sourceHashes('.'),predecessor:sourceHashes(baseRoot)}},
 rawPredecessor:{runs:[]},current:{runs:[]},policyReplayPredecessor:{runs:[]},routes:[]};
mkdirSync(dirname(out),{recursive:true});
const persist=()=>writeFileSync(out,JSON.stringify(report,null,2)+'\n');
const routeDir=out.replace(/\.json$/,'')+'-routes';mkdirSync(routeDir,{recursive:true});
for(const seed of seeds)for(const mode of ['help','ignore']){
 const row={seed,mode,result:'RUNNING',checks:[],diagnostics:{}};report.routes.push(row);persist();
 const check=(label,fn)=>{try{fn();row.checks.push({label,result:'PASS'});}catch(error){row.checks.push({label,result:'FAIL',error:error.message,actual:error.actual,expected:error.expected});}};
 try{
  const rawTrace=newTrace(true),currentTrace=newTrace(),policyTrace=newTrace(),schedule=[],intervals=[],currentControls=createHash('sha256');let openInterval=null;
  const raw=runBefore(seed,mode,rawTrace);
  const Candidate=traced(M01Simulation,currentTrace,{beforeTick(sim,dt,controls){const bak=sim.actor('jozef_bak'),carry={carry:structuredClone(bak.carry??null),carriedBy:bak.carriedBy??null},pending=Boolean(carry.carry||carry.carriedBy);schedule.push(carry);currentControls.update(JSON.stringify([dt,controls])+'\n');
   if(pending&&!openInterval){openInterval={startTick:schedule.length,startClock:sim.clock};intervals.push(openInterval);}if(!pending&&openInterval){openInterval.endTick=schedule.length-1;openInterval.endClock=sim.clock;openInterval=null;}return carry;
  },afterTick(sim){if(sim.gate?.id==='evt_m01_west_demolition')currentTrace.holds.push(context(sim,sim.auditCarry));}});
  const current=coverRoute(seed,mode,{Simulation:Candidate});let tick=0,pendingAtTickStart=false;const replayControls=createHash('sha256');
  const policyOptions={beforeTick(sim,dt,controls){assert.ok(tick<schedule.length,'replay cannot exceed candidate ticks');const carry=schedule[tick++];pendingAtTickStart=Boolean(carry.carry||carry.carriedBy);replayControls.update(JSON.stringify([dt,controls])+'\n');return carry;},afterTick(sim){if(sim.gate?.id==='evt_m01_west_demolition')policyTrace.holds.push(context(sim,sim.auditCarry));}};
  const replay=runBefore(seed,mode,policyTrace,policyOptions,()=>pendingAtTickStart),before=exposure(raw),after=exposure(current),policy=exposure(replay),controlSha256=currentControls.digest('hex'),policyControlSha256=replayControls.digest('hex');
  report.rawPredecessor.runs.push(raw.stats);report.current.runs.push(current.stats);report.policyReplayPredecessor.runs.push(replay.stats);
  Object.assign(row,{ticks:schedule.length,controlSha256,policyControlSha256,carryScheduleSha256:hash(schedule),carryIntervals:intervals,raw:before,current:after,policyReplay:policy,
   traces:{raw:rawTrace,current:currentTrace,policyReplay:policyTrace},rawDeltas:{health:after.player.health-before.player.health,realSeconds:after.clock-before.clock,activeSeconds:current.stats.activeSeconds-raw.stats.activeSeconds,enemyFire:current.stats.enemyFire-raw.stats.enemyFire,issuedRounds:after.issuedRounds-before.issuedRounds,rngBefore:before.rng,rngAfter:after.rng,
   eventCounts:Object.fromEntries([...new Set([...Object.keys(before.eventCounts),...Object.keys(after.eventCounts)])].map(k=>[k,(after.eventCounts[k]??0)-(before.eventCounts[k]??0)]))}});
  check('complete 1:1 dt/control replay',()=>{assert.equal(tick,schedule.length);assert.equal(policyControlSha256,controlSha256);});
  check('EVERY dt/control value and tick health/RNG/clocks exact',()=>{assert.deepEqual(currentTrace.controls,policyTrace.controls);assert.deepEqual(currentTrace.tickAuthority,policyTrace.tickAuthority);assert.deepEqual(currentTrace.westReady,policyTrace.westReady);row.tickAuthoritySha256=hash(currentTrace.tickAuthority);});
  check('EVERY policy outcome stat and full player state/health exact',()=>{assert.deepEqual(current.stats,replay.stats);assert.deepEqual(after.player,policy.player);});
  check('all other RAW outcome stats exact',()=>assert.deepEqual(invariantStats(current.stats),invariantStats(raw.stats)));
  check('all original RAW actor health/alive exact; all original policy actor health/alive exact',()=>{const ids=new Set(before.actors.map(a=>a.id));assert.deepEqual(after.actors.filter(a=>ids.has(a.id)),before.actors);assert.deepEqual(after.actors.filter(a=>ids.has(a.id)),policy.actors);});
  check('full policy clocks/RNG/issued round count exact',()=>{for(const key of ['clock','battleClock','rng','issuedRounds'])assert.equal(after[key],policy[key],key);});
  check('all health changes accounted for by actual player-hit + character impact',()=>{for(const [name,result,trace]of [['raw',raw,rawTrace],['current',current,currentTrace],['policy',replay,policyTrace]]){assert.deepEqual(trace.unexplained,[],name);assert.equal(trace.initialHealth+trace.hits.reduce((n,h)=>n+h.healthAfter-h.healthBefore,0),result.sim.player.health,name);assert.equal(result.events.filter(e=>e.type==='player-hit').length,trace.hits.length,name);for(const hit of trace.hits){assert.ok(hit.healthAfter<hit.healthBefore);assert.equal(hit.events.filter(e=>e.type==='player-hit').length,1);assert.ok(hit.events.some(e=>e.type==='round-impact'&&e.by===hit.round.by&&e.material==='character'));assert.ok(hit.issue,'identified actual projectile issue');assert.deepEqual(hit.issue.round,hit.round);assert.ok(hit.emission,'actual emitted projectile, not only a future burst plan');assert.deepEqual(hit.emission.round,hit.round);assert.ok(hit.emission.events.some(e=>e.type==='enemy-fire'&&e.weapon===hit.round.weapon));assert.ok(hit.emission.context.clock<=hit.clock);assert.ok(hit.round.firedAt<=hit.round.arriveAt&&hit.round.arriveAt<=hit.clock);}}});
  check('EVERY policy health change/projectile/source/issue/arrival/hit exact',()=>assert.deepEqual(currentTrace.hits.map(hitAuthority),policyTrace.hits.map(hitAuthority)));
  const rawIds=new Set(rawTrace.hits.map(h=>h.round.id)),shared=currentTrace.hits.filter(h=>rawIds.has(h.round.id)),extra=currentTrace.hits.filter(h=>!rawIds.has(h.round.id));
  row.attributedExtraImpacts=extra;row.attributedExtraDamage=extra.reduce((n,h)=>n+h.healthBefore-h.healthAfter,0);
  check('every RAW health change preserved exactly',()=>assert.deepEqual(shared.map(hitAuthority),rawTrace.hits.map(hitAuthority)));
  check('first RAW/current difference is ONLY existing WEST last60s slowdown with exact prior authority and controls',()=>{
   const i=rawTrace.tickAuthority.findIndex((v,i)=>JSON.stringify(v)!==JSON.stringify(currentTrace.tickAuthority[i]));assert.ok(i>0,'identified causal boundary');
   assert.deepEqual(rawTrace.tickAuthority.slice(0,i),currentTrace.tickAuthority.slice(0,i),'all prior clocks/RNG/health/alive exact');
   assert.deepEqual(rawTrace.controls.slice(0,i+1),currentTrace.controls.slice(0,i+1),'all controls through boundary exact');
   const previous=rawTrace.tickAuthority[i-1],rawAt=rawTrace.tickAuthority[i],currentAt=currentTrace.tickAuthority[i],dt=rawTrace.controls[i][0],carry=schedule[i];
   row.readinessBoundary={tick1Based:i+1,previous,raw:rawAt,current:currentAt,controls:rawTrace.controls[i],rawReady:rawTrace.westReady[i],currentReady:currentTrace.westReady[i],candidateCarry:carry};
   assert.equal(rawAt[0],currentAt[0]);assert.ok(previous[1]>=24240&&previous[1]<24270);assert.equal(rawTrace.westReady[i],true);assert.equal(currentTrace.westReady[i],false);assert.ok(carry.carry||carry.carriedBy);
   assert.equal(rawAt[1],previous[1]+dt*8.5);assert.equal(currentAt[1],previous[1]+dt);assert.deepEqual(rawAt.slice(2),currentAt.slice(2),'same RNG/health at first clock divergence');
  });
  check('extra impacts have exact real-projectile emission and measured WEST wait causality',()=>{
   assert.ok(row.readinessBoundary,'known causal boundary required');const west=before.consumed.evt_m01_west_demolition;assert.ok(Number.isFinite(west));
   const waitStage=c=>{assert.ok(c.candidateCarryAtTickStart?.carry||c.candidateCarryAtTickStart?.carriedBy);assert.ok(c.bak.carry||c.bak.carriedBy,'actual current Bak carry');
    assert.ok(c.battleClock>=24240&&c.battleClock<=24270);if(c.battleClock<24270){assert.equal(c.gate,null);return 'last60s-slowdown';}assert.equal(c.gate?.id,'evt_m01_west_demolition');assert.ok(c.gate.hold>=0);return 'frozen-west-gate';};
   for(const hit of extra){hit.exposure={rawWestConsumed:west,issueStage:waitStage(hit.emission.context),impactStage:waitStage(hit)};
    assert.ok(hit.emission.context.clock>=row.readinessBoundary.current[0]);assert.ok(hit.clock>=row.readinessBoundary.current[0]);assert.ok(hit.round.id&&hit.round.by&&hit.round.weapon);
    const rawIssue=rawTrace.issues[hit.round.id];
    if(!rawIssue){hit.exposure.kind='additional-issued';assert.ok(!rawTrace.emissions[hit.round.id]);assert.ok(hit.emission.context.clock>west,'new projectile emitted only after RAW WEST release');}
    else {hit.exposure.kind='shared-issued-additional-impact';const rawImpact=rawTrace.impacts[hit.round.id],rawEmission=rawTrace.emissions[hit.round.id];assert.ok(rawImpact&&rawEmission,'actual RAW emission and landRound required');
     hit.exposure.rawIssue=rawIssue;hit.exposure.rawEmission=rawEmission;hit.exposure.rawImpact=rawImpact;
     assert.deepEqual(rawIssue.round,hit.round);assert.deepEqual(rawEmission.round,hit.round);assert.deepEqual(rawImpact.round,hit.round);assert.deepEqual(rawIssue.context.player,hit.issue.context.player,'same player at planning; different battle clock retained');
     assert.equal(rawEmission.context.clock,hit.emission.context.clock);assert.deepEqual(rawEmission.context.player,hit.emission.context.player);assert.equal(rawImpact.clock,hit.clock);assert.equal(rawImpact.healthAfter,rawImpact.healthBefore);assert.ok(!rawImpact.events.some(e=>e.type==='player-hit'));
     assert.ok(rawImpact.events.some(e=>e.type==='round-impact'&&e.by===hit.round.by));assert.ok(rawImpact.clock>west);
     const exit=rawTrace.controls.findIndex((v,i)=>JSON.stringify(v)!==JSON.stringify(currentTrace.controls[i]));assert.ok(exit>=0);const exitClock=rawTrace.tickAuthority[exit][0];
     hit.exposure.rawExit={tick1Based:exit+1,clock:exitClock,rawControls:rawTrace.controls[exit],currentControls:currentTrace.controls[exit]};
     assert.ok(exitClock>west&&exitClock<rawImpact.clock);assert.equal(rawTrace.controls[exit][1].forward,1);assert.equal(rawTrace.controls[exit][1].sprint,true);
     const impactTick=currentTrace.tickAuthority.findIndex(v=>v[0]===hit.clock);assert.ok(impactTick>=exit);assert.ok(currentTrace.controls.slice(exit,impactTick+1).every(([,c])=>Object.keys(c).length===0),'current keeps waiting while RAW exits');
     assert.notDeepEqual([rawImpact.player.x,rawImpact.player.y,rawImpact.player.z],[hit.player.x,hit.player.y,hit.player.z],'measured paths explain actual hit versus miss');
    }
   }
  });
  check('EXACT current health = RAW health minus attributed extra real damage',()=>assert.equal(after.player.health,before.player.health-row.attributedExtraDamage));
  check('all routes complete without death/restore or unfinished carry',()=>{assert.equal(openInterval,null);for(const result of [raw,current,replay]){assert.equal(result.sim.mission.complete,true);assert.equal(result.sim.player.alive,true);assert.equal(result.sim.actor('jozef_bak').carriedBy,null);assert.equal(result.sim.actor('jozef_bak').carry,undefined);assert.ok(!result.events.some(e=>e.type==='restored'));}});
 }catch(error){row.checks.push({label:'route execution',result:'FAIL',error:error.stack});}
 row.result=row.checks.some(c=>c.result==='FAIL')?'FAIL':'PASS';
 const evidenceFile=resolve(routeDir,`${seed}-${mode}.json`);writeFileSync(evidenceFile,JSON.stringify(row,null,2)+'\n');
 // Full rows live beside the compact index: avoid a single >500MB JSON string aborting later seeds.
 const {raw,current,policyReplay,traces,...index}=row;report.routes[report.routes.length-1]={...index,evidenceFile:relative(dirname(resolve(out)),evidenceFile),evidenceSha256:hash(readFileSync(evidenceFile))};persist();console.log(JSON.stringify({seed,mode,result:row.result,healthDelta:row.rawDeltas?.health,extraDamage:row.attributedExtraDamage,failures:row.checks.filter(c=>c.result==='FAIL').map(c=>c.label)}));
}
for(const key of ['rawPredecessor','current','policyReplayPredecessor'])report[key].summary=summarize(report[key].runs);
try{assert.deepEqual(report.current.runs,report.policyReplayPredecessor.runs);assert.deepEqual(report.current.summary,report.policyReplayPredecessor.summary);report.exactStatsAndSummary='PASS';}catch(error){report.exactStatsAndSummary='FAIL';report.summaryError=error.message;}
report.result=report.routes.length===seeds.length*2&&report.routes.every(r=>r.result==='PASS')&&report.exactStatsAndSummary==='PASS'?'PASS':'FAIL';persist();
assert.equal(report.result,'PASS',`all ${seeds.length*2} complete routes require exact policy replay, RAW invariants and fully explained real health exposure; inspect ${out}`);
console.log(`PASS ${seeds.length} seeds / ${seeds.length*2} routes: full raw/current/policy reports and exact health attribution retained`);
