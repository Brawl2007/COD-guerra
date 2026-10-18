// T47 (M01-T47-CKM-LIVE-FIRE-V1): per-tick delta audit of the live ckm fire against the immutable predecessor, in the style of
// tools/verification/m01-partials-completion-audit.mjs. Three simulations run in lockstep on the SAME controls, which come from the candidate itself:
//   A  the predecessor (8c6328c: the combined staging = candidate #80 + #89 + T48 German retreat + T40 first-person arms + T38 combat postures; its simulation source is
//      the one pinned by tests/fixtures/m01-t38-gameplay-baseline.json, the T38 golden of its amendment 02, which stays what it was as history). Until the merge 3c9cab7
//      the predecessor was 813f163 (PR #80 head); that audit and its golden (T47 amendment 01) are kept as ...BEFORE_AMENDMENT_02 / ...-before-amendment-02.
//      Amendment 03 keeps this predecessor; the delta audit and golden of bc4523f (amendment 02) are kept as ...BEFORE_AMENDMENT_03 / ...-before-amendment-03.
//   G  the candidate with the gun firing for real but its rounds changing no German (tests/helpers/m01-ckm-neutral.js, CkmGhostSimulation)
//   L  the candidate as shipped (live fire; the golden is the per-tick digest of L)
// Proof, every tick, with exact numbers (no epsilon):
//   1. A == G apart from the NAMED deltas below: the infrastructure (post, crew, phases, burst plans, own random stream, belt, events) disturbs nothing else.
//   2. G == L until the first landed ckm round that changes a German; that tick, and the first differing field, are that German's. Everything after is what follows.
//   3. What follows is only timing, never the plot: a German who fires less pins the sappers less, so the repair (and every gate after it) comes earlier. Because A and G
//      are driven by L's controls they lag that new timeline, so the end of the mission is compared with the predecessor on its OWN route (`route(seed,{Simulation:Before})`):
//      same 12 objective states, same four checkpoints, same consumed event ids, same survivors, same final battle clock. The shift of every event is listed (`timeline`).
// NAMED deltas (anything else differing is a failure):
//   crew        x, y, z, facing, state, suppressedUntil, ckm, ckmFire and every presentation field of ckm_gunner, ckm_loader, ckm_reserve (they stand at S2, run the
//               fire cycle, walk another way out, and German rounds pass within 3 m of that post, not of the casemate: they pin the crew, never hurt it)
//   events      `ally-fire` (the burst event; no predecessor has it) and the crew ids inside the `pinned` list of `round-impact`
//   germans     health / suppressedUntil / state of the Germans a landed ckm round hits or passes within 3 m of (the two MG34 gunners included: they are never CHOSEN as the target, but the
//               beaten zone does not spare them), and what follows from that (L only)
//   cadence     (amendment 03) the withdrawal cadence of T23 counted from the landing of the lethal round, not from its shot (mission.json cover_withdrawal.mechanic: «a baixa só
//               conta quando o tiro chega, com intervalo mínimo de 20 s de relógio entre baixas»). The fix is not the gun's, so the predecessor A runs with that one rule
//               applied from outside (withCadence: after each tick in which a lethal round was in flight from the spans, timers.withdrawalCasualty = battleClock, which is
//               exactly what the fixed updateActors does), and the predecessor as it was (P) runs beside it: P == A until the first tick at which the timer differs
//               (cadenceFirstDifference, whose path must be $.state.timers.withdrawalCasualty), so the rule is the only thing the emulation adds.
// Run order on the combined tree: this tool first (--write-golden writes the delta audit and the live golden of the combined tree, tests/fixtures/m01-t47-gameplay-baseline.json),
// then m01-t47-golden-amendment-audit.mjs --amendment 03 --write (keeps the T47 golden and audit it replaces and writes GOLDEN_AMENDMENT_03.json; --amendment 02 re-checks the
// previous amendment as history). The T38 golden and the T38 and T48 audit tools are
// history since the merge: they are re-run from git at the staging commit (see their headers) and nothing here rewrites them.
// History since the P2 pacing amendment 04 (tools/verification/m01-pacing-golden-amendment.mjs, 2026-10-18): the live golden is no longer this tool's; its check mode reproduces
// PREDECESSOR_DELTA_AUDIT.json and the golden kept as tests/fixtures/m01-t47-gameplay-baseline-before-amendment-04.json in a checkout of f6913a0, not in the working tree.
// Usage: node tools/verification/m01-t47-ckm-fire-audit.mjs [--write | --write-golden]          (x86 only; the predecessor tree is extracted with `git archive`)
//   Without a flag (check mode) NOTHING is written: the regenerated delta audit must equal the committed PREDECESSOR_DELTA_AUDIT.json byte for byte and the regenerated golden must
//   equal tests/fixtures/m01-t47-gameplay-baseline.json. Only --write (alias --write-golden) writes PREDECESSOR_DELTA_AUDIT.json and the golden.
//   M01_T47_AUDIT_OUT   folder of PREDECESSOR_DELTA_AUDIT.json (default docs/verification/m01-runtime/ckm-fire-live-2026-10-16)
//   M01_T47_BASELINE    an existing checkout of the predecessor instead of the automatic `git archive`
//   M01_T47_AUDIT_SEEDS comma list of seeds; each one is run twice, without and with the support pilot (default: the two golden routes)
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,symlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {M01Simulation,seconds,CKM_BELT} from '../../src/game/m01-simulation.js';
import {PRESENTATION_FIELDS} from '../../src/game/m01-animation-presentation.js';
import {route} from '../../tests/helpers/m01-route.js';
import {firstDifference} from '../../tests/helpers/m01-determinism.js';
import {GameplayDigest,gameplayFrame} from '../../tests/helpers/m01-animation-contract.js';
import {CkmGhostSimulation} from '../../tests/helpers/m01-ckm-neutral.js';

const write=process.argv.includes('--write')||process.argv.includes('--write-golden');
const root=resolve(import.meta.dirname,'../..');
const out=resolve(process.env.M01_T47_AUDIT_OUT??join(root,'docs/verification/m01-runtime/ckm-fire-live-2026-10-16'));if(write)mkdirSync(out,{recursive:true});
const auditFile=join(out,'PREDECESSOR_DELTA_AUDIT.json');
assert.equal(process.arch,'x64','exact gameplay golden regeneration requires x86 (same rule as D30)');
const PREDECESSOR='8c6328c947e92041f237b5990142dd110aee8e71';   // the combined staging (T38 + T48 + T40 on the candidate #80 + #89); before the merge 3c9cab7 it was 813f163 (PR #80 head)
const BEFORE_COMMIT='bc4523fc2e8161846828b77e7c1a49697f3372e8';   // the combined tree before amendment 03: its golden (amendment 02) and delta audit are what amendment 03 replaces
// Amendment 03 (T47 x T38 interaction, docs/verification/m01-runtime/ckm-fire-live-2026-10-16/T47_T38_INTERACTION.md): the gun is laid on the standing man who fired (ckmAim no longer reads
// `crouched`), CKM_SUPPRESS_SEC 2.5 -> 1.5 s, and the T23 withdrawal cadence counts from the landing of the lethal round (named delta `cadence`).
const hash=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
const fixture=name=>join(root,'tests/fixtures',name);
// The golden of the predecessor: the T38 golden of its amendment 02, the golden of the staging 8c6328c. It stays what it was (history, pinned by sha256 in tests/m01-animation-contract.test.js).
const previousFile='m01-t38-gameplay-baseline.json';
const previous=JSON.parse(readFileSync(fixture(previousFile)));
const gitShow=(rev,path)=>execFileSync('git',['-C',root,'show',`${rev}:${path}`],{maxBuffer:1<<26});
const beforeGolden=gitShow(BEFORE_COMMIT,'tests/fixtures/m01-t47-gameplay-baseline.json'),beforeAudit=gitShow(BEFORE_COMMIT,'docs/verification/m01-runtime/ckm-fire-live-2026-10-16/PREDECESSOR_DELTA_AUDIT.json');

function predecessorTree(){
  const given=process.env.M01_T47_BASELINE;
  if(given){assert.equal(execFileSync('git',['-C',given,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),PREDECESSOR,'immutable predecessor ref');return given;}
  const dir=mkdtempSync(join(tmpdir(),'m01-t47-predecessor-'));
  // The simulation modules import JSON data (mission, map, colliders, manifests, weapon profile): archive every .json of assets and research with src and missions.
  const data=execFileSync('git',['-C',root,'ls-tree','-r','--name-only',PREDECESSOR,'assets','research'],{encoding:'utf8',maxBuffer:1<<26}).split('\n').filter(p=>p.endsWith('.json'));
  const tar=execFileSync('git',['-C',root,'archive','--format=tar',PREDECESSOR,'src','missions',...data],{maxBuffer:1<<29});
  execFileSync('tar',['-x','-C',dir],{input:tar});symlinkSync(join(root,'node_modules'),join(dir,'node_modules'));
  return dir;
}
const tree=predecessorTree();
const predecessorSource=readFileSync(join(tree,'src/game/m01-simulation.js'));
assert.equal(hash(predecessorSource),previous.sourceSha256,'the predecessor simulation is exactly the source pinned by the T38 golden (sourceLock chain)');
const {M01Simulation:Plain}=await import(pathToFileURL(join(tree,'src/game/m01-simulation.js')));
// Named delta `cadence`: the predecessor with the amendment-03 withdrawal rule and nothing else. updateActors runs after advanceBattle and before landRounds and processEvents,
// so the rounds in flight, the consumed events and the battle clock it sees are those before the tick (rounds, events) and after it (battle clock); a tick that returns early
// (mission complete, a dead player restoring his checkpoint) never reaches updateActors and is left alone.
const SPANS_EVENT='evt_m01_germans_on_east_spans',DEMOLITION_EVENT='evt_m01_east_demolition';
const withCadence=Base=>class extends Base{
  tick(dt,controls){
    const runs=Number.isFinite(dt)&&dt>0&&!this.mission.complete&&this.player.alive;
    const waits=runs&&this.consumedEvent(SPANS_EVENT)&&!this.consumedEvent(DEMOLITION_EVENT)&&this.enemyFire.rounds.some(r=>r.victim);
    const out=super.tick(dt,controls);
    if(waits)this.timers.withdrawalCasualty=this.battleClock;
    return out;
  }
};
const Before=withCadence(Plain);

const CREW=['ckm_gunner','ckm_loader','ckm_reserve'];
// suppressedUntil: German rounds aimed at the repair site or the player pass within 3 m of the new post (they never hurt an ally, only pin him), which the casemate never saw.
const CREW_DELTA=['x','y','z','facing','state','suppressedUntil','ckm','ckmFire'];
function projection(raw){
  const s=structuredClone(raw);delete s.resumeCheckpoint;
  for(const a of s.actors)if(CREW.includes(a.id))for(const k of [...CREW_DELTA,...PRESENTATION_FIELDS])delete a[k];
  return s;
}
const eventProjection=events=>structuredClone(events).filter(e=>e.type!=='ally-fire').map(e=>{if(e.type==='round-impact')e.pinned=e.pinned.filter(id=>!CREW.includes(id));return e;});
const frame=(sim,events)=>({state:projection(sim.snapshot(false)),checkpoint:projection(sim.checkpoint),events:eventProjection(events)});
const tally=(into,events)=>{for(const e of events)into[e.type]=(into[e.type]??0)+1;return into;};
const sorted=o=>Object.fromEntries(Object.entries(o).sort());
const summary=(sim,eventCounts)=>({ticks:Math.round(sim.clock/.05),clock:sim.clock,battleClock:sim.battleClock,rng:sim.rng.state,issuedGermanRounds:sim.enemyFire.nextId,eventCounts:sorted(eventCounts),
  consumedEvents:Object.keys(sim.consumed).length,checkpoints:[...sim.checkpointsReached],survivors:sim.flags['m01.east_platoon_survivors'],repairPins:sim.timers.repairPins??0,
  playerHealth:sim.player.health,objectives:Object.fromEntries(Object.entries(sim.objectives).map(([id,o])=>[id.replace('obj_m01_',''),o.state])),
  germans:sim.enemies.filter(a=>a.group==='grp_de_east'||a.group==='grp_de_spans').map(({id,health,alive})=>({id,health,alive}))});

// The candidate as shipped, recording (reads only) what each landed ckm round does to a German.
class Live extends M01Simulation{
  ckmImpact(r){
    const before=new Map(this.enemies.map(a=>[a.id,{health:a.health,until:a.suppressedUntil,alive:a.alive}]));
    super.ckmImpact(r);
    const log=this.ckmLog??=[];
    for(const a of this.enemies){
      const b=before.get(a.id);
      if(a.health<b.health)log.push({clock:this.clock,round:r.id,id:a.id,effect:b.alive&&!a.alive?'kill':'hit',health:a.health});
      if(a.suppressedUntil>b.until)log.push({clock:this.clock,round:r.id,id:a.id,effect:'suppressed'});
    }
  }
}

const report={task:'M01-T47-CKM-LIVE-FIRE-V1',predecessor:PREDECESSOR,predecessorSourceSha256:hash(predecessorSource),
  namedDeltas:{crew:{actors:CREW,fields:[...CREW_DELTA,...PRESENTATION_FIELDS],why:'the gun stands at S2 (CKM_POSITION 7.17,-3,26), the three men stand round it and run the fire cycle, and walk west along the embankment instead of under the deck'},
    cadence:{fields:['timers.withdrawalCasualty and what follows from it (the withdrawal lethal shots, their RNG draws and casualties)'],predecessorWith:'withCadence (this file): after a tick in which a lethal round of the withdrawal was in flight, timers.withdrawalCasualty = battleClock',
      why:'amendment 03: the T23 count of 20 s of battle clock restarts when the lethal round lands, so casualties are at least 20 s apart also when the clock drops from 8x to 1x during the flight (06:09:00). Not the gun: applied to the predecessor, proved per route by cadenceFirstDifference (plain predecessor against it)'},
    events:{types:['ally-fire'],pinnedCrewIdsRemoved:CREW,why:'one event per ckm burst; no predecessor emits it. A round-impact lists the allies it passed within 3 m of: S2 is not where the casemate was'},
    germans:{fields:['health','suppressedUntil','state','crouched','cooldown','suppressedAt','hitAt','hitYaw','diedAt','deathYaw'],why:'only a landed ckm round that hits or passes within NEAR_MISS (3 m) of a German (the two MG34 gunners included: the gun never chooses them as its target, but the beaten zone does not spare them); L only, from the causal onset'},
    timeline:{fields:['clock of every consumed event after the first pin difference','player health','rng state','issued German rounds','repair pins'],why:'a suppressed or wounded German fires less, so fewer rounds pin the sappers (timers.repairPins) and the repair finishes earlier; the clock-gated beats after it shift by the same amount. The plot is unchanged: see endStateAgainstPredecessorOwnRoute'}},
  projectionSource:projection.toString(),eventProjectionSource:eventProjection.toString(),routes:[]};
const golden={task:'M01-T47-CKM-LIVE-FIRE-V1',generationStage:'T47 on the combined staging: implementation candidate after the critical review (amendments 01 and 02), the T47 x T38 interaction fix (amendment 03) and the per-tick predecessor delta audit',
  predecessor:PREDECESSOR,predecessorSourceSha256:previous.sourceSha256,
  previousGolden:{task:previous.task,file:'tests/fixtures/'+previousFile,sha256:hash(readFileSync(fixture(previousFile)))},
  historicalGoldenSha256:hash(readFileSync(fixture('m01-anim-gameplay-baseline.json'))),sourceSha256:hash(readFileSync(join(root,'src/game/m01-simulation.js'))),
  // Amendment 03: the T47 x T38 interaction (T47_T38_INTERACTION.md) moved the simulation of the combined tree. The golden and delta audit it replaces (bc4523f: amendment 02,
  // against the same staging) are kept as byte copies, read from git, by tools/verification/m01-t47-golden-amendment-audit.mjs --amendment 03, which also writes GOLDEN_AMENDMENT_03.json;
  // tests/m01-animation-contract.test.js asserts the chain (amendments 02 and 01 live in the kept goldens).
  amendment03:{task:'M01-T47-CKM-LIVE-FIRE-V1',beforeCommit:BEFORE_COMMIT,beforeSourceSha256:JSON.parse(beforeGolden).sourceSha256,
    beforeFixture:'tests/fixtures/m01-t47-gameplay-baseline-before-amendment-03.json',beforeFixtureSha256:hash(beforeGolden),
    beforeAudit:'docs/verification/m01-runtime/ckm-fire-live-2026-10-16/PREDECESSOR_DELTA_AUDIT_BEFORE_AMENDMENT_03.json',beforeAuditSha256:hash(beforeAudit),
    audit:'docs/verification/m01-runtime/ckm-fire-live-2026-10-16/GOLDEN_AMENDMENT_03.json'},
  routes:[]};
const cases=process.env.M01_T47_AUDIT_SEEDS?process.env.M01_T47_AUDIT_SEEDS.split(',').map(Number).flatMap(seed=>[false,true].map(support=>({seed,support}))):[{seed:19390901,support:false},{seed:7,support:true}];

for(const {seed,support} of cases){
  const a=new Before(seed),g=new CkmGhostSimulation(seed),p=new Plain(seed);a.drainEvents();g.drainEvents();p.drainEvents();
  const digest=new GameplayDigest(),row={seed,support,ticks:0,predecessorVsGhost:{result:'PASS',firstDifference:null},cadenceFirstDifference:null,causalOnset:null,afterOnsetTicksDiffering:0};
  const countsA={},countsG={},countsL={};let onsetDone=false,lastBelt=CKM_BELT,refills=0,lastBurstBattleClock=null;
  const result=route(seed,{support,Simulation:Live,onStep:({sim,controls,dt,events})=>{
    row.ticks++;
    a.tick(dt,structuredClone(controls));const ea=a.drainEvents();g.tick(dt,structuredClone(controls));const eg=g.drainEvents();
    let ep=null;if(!row.cadenceFirstDifference){p.tick(dt,structuredClone(controls));ep=p.drainEvents();}
    tally(countsA,ea);tally(countsG,eg);tally(countsL,events);
    const belt=sim.actor('ckm_gunner').ckmFire.belt;if(belt>lastBelt)refills++;lastBelt=belt;
    for(const e of events)if(e.type==='ally-fire')lastBurstBattleClock=sim.battleClock;
    const fa=frame(a,ea),fg=frame(g,eg);
    if(ep){const d0=firstDifference(frame(p,ep),fa);if(d0){row.cadenceFirstDifference={tick:row.ticks,clock:sim.clock,battleClock:a.battleClock,difference:d0};console.log(JSON.stringify({cadence:row.cadenceFirstDifference}));}}
    const d1=firstDifference(fa,fg);
    if(d1&&!row.predecessorVsGhost.firstDifference){row.predecessorVsGhost={result:'FAIL',firstDifference:{tick:row.ticks,clock:sim.clock,difference:d1}};console.log(JSON.stringify(row.predecessorVsGhost));}
    if(!onsetDone){
      const fl=frame(sim,events),d2=firstDifference(fg,fl);
      if(d2){
        onsetDone=true;
        const landed=(sim.ckmLog??[]).filter(x=>x.clock===sim.clock),m=/^\$\.state\.actors\.(\d+)\./.exec(d2.path),actor=m?sim.actors[Number(m[1])].id:null;
        row.causalOnset={tick:row.ticks,clock:sim.clock,battleClock:sim.battleClock,firstDifferencePath:d2.path,firstDifferenceActor:actor,
          landedThisTick:landed,consistent:Boolean(actor&&landed.some(x=>x.id===actor))};
        console.log(JSON.stringify(row.causalOnset));
      }
    }else if(firstDifference(fg,frame(sim,events)))row.afterOnsetTicksDiffering++;
    digest.add(gameplayFrame(sim,events));
  }});
  const sim=result.sim,log=sim.ckmLog??[];
  const summaries={predecessor:summary(a,countsA),ghost:summary(g,countsG),live:summary(sim,countsL)};
  // The predecessor on its own controls: the reference for the END of the mission (proof 3).
  const own=route(seed,{support,Simulation:Before}).sim;summaries.predecessorOwnRoute=summary(own,{});
  const gunner=sim.actor('ckm_gunner');
  row.live={bursts:gunner.ckmFire.bursts,roundsIssued:gunner.ckmFire.bursts*8,beltAtEnd:gunner.ckmFire.belt,beltRefills:refills,hits:log.filter(x=>x.effect==='hit'||x.effect==='kill').length,
    kills:log.filter(x=>x.effect==='kill').map(x=>x.id),men:{hit:[...new Set(log.filter(x=>x.effect!=='suppressed').map(x=>x.id))],suppressed:[...new Set(log.filter(x=>x.effect==='suppressed').map(x=>x.id))]},
    suppressionEvents:log.filter(x=>x.effect==='suppressed').length,firstBurstClock:result.events.find(e=>e.type==='ally-fire')?.at??null,
    lastBurstBattleClock,allyFireEvents:result.events.filter(e=>e.type==='ally-fire').length,complete:sim.mission.complete,checkpoints:sim.checkpointsReached};
  row.summaries=summaries;
  // What differs at the end, by name: the German states, the counters that follow from them, never anything else.
  const diffOf=(x,y)=>({eventCounts:Object.fromEntries([...new Set([...Object.keys(x.eventCounts),...Object.keys(y.eventCounts)])].sort().map(k=>[k,(y.eventCounts[k]??0)-(x.eventCounts[k]??0)]).filter(([,v])=>v!==0)),
    germansDiffering:y.germans.filter((m,i)=>m.health!==x.germans[i].health||m.alive!==x.germans[i].alive).map(m=>m.id),ticks:y.ticks-x.ticks,rngDiffers:y.rng!==x.rng,
    issuedGermanRounds:y.issuedGermanRounds-x.issuedGermanRounds,repairPins:y.repairPins-x.repairPins,survivors:y.survivors-x.survivors,playerHealth:y.playerHealth-x.playerHealth,
    objectivesIdentical:JSON.stringify(y.objectives)===JSON.stringify(x.objectives),checkpointsIdentical:JSON.stringify(y.checkpoints)===JSON.stringify(x.checkpoints),consumedEventsIdentical:y.consumedEvents===x.consumedEvents});
  row.deltaGhostAgainstPredecessor=diffOf(summaries.predecessor,summaries.ghost);
  row.deltaLiveAgainstPredecessor=diffOf(summaries.predecessor,summaries.live);
  // Timeline: every event consumed at a different clock (or only by one of them) when the live route ended. A is behind L from the first shifted event onwards, so a
  // null on the predecessor side means "not yet when L's route ended", not "never".
  const consumedOf=x=>Object.fromEntries(Object.entries(x.consumed).sort());
  const ca=consumedOf(a),cg=consumedOf(g),cl=consumedOf(sim);
  assert.deepEqual(cg,ca,'ghost and predecessor consume the same events at the same clocks (events are not part of the named deltas)');
  row.timeline=[...new Set([...Object.keys(ca),...Object.keys(cl)])].sort().filter(id=>ca[id]!==cl[id])
    .map(id=>({event:id,predecessor:ca[id]??null,live:cl[id]??null,shiftSec:ca[id]!==undefined&&cl[id]!==undefined?cl[id]-ca[id]:null})).sort((x,y)=>(x.live??1e9)-(y.live??1e9));
  const ownSummary=summaries.predecessorOwnRoute,liveSummary=summaries.live,ownEvents=Object.keys(own.consumed).sort(),liveEvents=Object.keys(sim.consumed).sort();
  row.endStateAgainstPredecessorOwnRoute={ticks:{predecessor:ownSummary.ticks,live:liveSummary.ticks},objectivesIdentical:JSON.stringify(ownSummary.objectives)===JSON.stringify(liveSummary.objectives),
    checkpointsIdentical:JSON.stringify(ownSummary.checkpoints)===JSON.stringify(liveSummary.checkpoints),consumedEventIdsIdentical:JSON.stringify(ownEvents)===JSON.stringify(liveEvents),
    survivorsIdentical:ownSummary.survivors===liveSummary.survivors,finalBattleClockIdentical:own.battleClock===sim.battleClock,
    repairCompleteSec:{predecessorOwnRoute:own.consumed['evt_m01_repair_complete']??null,predecessorOnLiveControls:ca['evt_m01_repair_complete']??null,live:cl['evt_m01_repair_complete']??null},
    repairPins:{predecessorOwnRoute:ownSummary.repairPins,predecessorOnLiveControls:summaries.predecessor.repairPins,live:liveSummary.repairPins}};
  report.routes.push(row);golden.routes.push({seed,support,...digest.finish()});
  if(write)writeFileSync(auditFile,JSON.stringify(report,null,2)+'\n');   // check mode never touches the committed evidence
  // The proof obligations.
  assert.equal(row.predecessorVsGhost.result,'PASS','1. predecessor == infrastructure-only candidate, apart from the named deltas, at every tick');
  assert.ok(row.cadenceFirstDifference===null||row.cadenceFirstDifference.difference.path==='$.state.timers.withdrawalCasualty','cadence: the emulated rule first changes only the withdrawal timer');
  assert.ok(row.causalOnset,'the live gun changed at least one German on this route');
  assert.ok(row.causalOnset.consistent,'2. the first live-vs-ghost difference is the German that a landed round hit or passed');
  assert.ok(sim.mission.complete&&sim.checkpointsReached.length===4,'the mission still completes with its four checkpoints');
  const end=row.endStateAgainstPredecessorOwnRoute;
  assert.ok(end.objectivesIdentical,'3. all 12 objectives end as in the predecessor on its own route');
  assert.ok(end.checkpointsIdentical&&end.consumedEventIdsIdentical&&end.survivorsIdentical&&end.finalBattleClockIdentical,'3. same checkpoints, same consumed events, same survivors and final battle clock as the predecessor on its own route');
  console.log(JSON.stringify({seed,support,ticks:row.ticks,onset:row.causalOnset.clock,bursts:row.live.bursts,hits:row.live.hits,kills:row.live.kills,suppressionEvents:row.live.suppressionEvents}));
}
const auditText=JSON.stringify(report,null,2)+'\n';
if(!write)assert.equal(readFileSync(auditFile,'utf8'),auditText,'PREDECESSOR_DELTA_AUDIT.json equals the regenerated delta audit (check mode writes nothing; --write regenerates it)');
golden.auditSha256=hash(auditText);
if(write)writeFileSync(fixture('m01-t47-gameplay-baseline.json'),JSON.stringify(golden,null,2)+'\n');
else assert.deepEqual(JSON.parse(readFileSync(fixture('m01-t47-gameplay-baseline.json'))),golden);
