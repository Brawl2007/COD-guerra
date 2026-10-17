// T38 M01-COMBAT-POSTURE-STAGING-V1: audited gameplay re-baseline. Not run by npm test.
//
// T38 changes gameplay BY DESIGN (staggered waiting slots as mission data; the platoon, the gate riflemen, the section and the sappers kneel or
// lie prone in GAMEPLAY, so hitboxes, eyes, aim points and shot origins follow the posture that is drawn). The RNG stream therefore diverges from
// the predecessor after the first changed line of sight or hit, and a per-tick authority projection against it (as the partials audit did) is not
// possible. Instead this audit:
//   1. runs the exact predecessor checkout (M01_T38_BASELINE, at PREDECESSOR, whose simulation is the one pinned by the partials golden) and the
//      candidate on the real control route, 12 seeds x {no support, support}, and requires the mission invariants to be identical: completion,
//      checkpoints, objective states, the fixed battle-clock events, the 18 survivors at 06:00, the final survivors (12 / 18), the six attrition
//      falls within 5 s of battle clock of their fixed times, cover_repair done before the 05:30 order, dlg_m01_049;
//   2. writes (--write-golden) or verifies the candidate's per-tick gameplay digests for the same two routes as the partials golden, into
//      tests/fixtures/m01-t38-gameplay-baseline.json, pinned to the sha256 of src/game/m01-simulation.js (m01-animation-contract.test.js).
// The audit also MEASURES (does not assert) how the MG34 gunners' fire moves with the lines of sight: per route and per gunner the bursts by kind of
// target (player, Kowal = 'squad', the forward post = 'area', ...) and the calls of the callout co_m01_enemy_mg_fire_on_squad, predecessor against candidate.
// x86 only (D11/D30: aarch64 floats differ). With --candidate <sha> the commit that carries this simulation is recorded after checking that its
// src/game/m01-simulation.js hashes to the pinned source; when the fixture already exists the regenerated digests must be byte-identical to it.
//
// PREDECESSOR is the head T38 is audited against. It was ef35c7a (T38 slice 1 on the partials candidate, whose simulation the partials golden pinned as
// 00964436) until the T48 German retreat joined this branch (merge f02e06b); it is now 5a169ba (candidate #80 + #89 + T48), whose simulation c06c1b1b is
// the one the partials golden pins since its amendment 02. The report of the earlier audit is kept as GOLDEN_AUDIT_PRE_T48.json.
//
// HISTORY since the merge of T47 (3c9cab7). The live tree is now the staging PLUS the live fire of the ckm wz.30, whose golden is tests/fixtures/m01-t47-gameplay-baseline.json
// (tools/verification/m01-t47-ckm-fire-audit.mjs). This tool's golden, tests/fixtures/m01-t38-gameplay-baseline.json (amendment 02), stays what it was: the golden of the staging
// 8c6328c. The tool is therefore bound to that tree and re-runs it FROM GIT: the candidate simulation and its data are extracted with `git archive` at CANDIDATE_COMMIT (as the
// T47 tool extracts its predecessor), the 24-route invariants audit and the golden are computed on that extraction, and in verify mode the golden, GOLDEN_AUDIT.json and the
// amendment record come out byte for byte. Why the live tree is not audited by this tool any more, with numbers: docs/verification/m01-runtime/ckm-fire-live-2026-10-16/
// (the T47 gun changes the final survivors of one of the 24 routes, seed 3 with support, 18 -> 17, which this audit asserts equal to the predecessor).
//
// --amendment NN (with --write-golden to write, without it to verify) is a golden amendment, in the pattern of the T48 tool: the golden it replaces is
// kept byte for byte, read from git at AMENDMENTS[NN].before and never overwritten, as tests/fixtures/m01-t38-gameplay-baseline-before-amendment-NN.json,
// and GOLDEN_AMENDMENT_NN.json is derived from the two fixtures (header keys before/after, per route the ticks, the leading identical 512-tick blocks,
// the first block that differs and the tick of the east demolition). Nothing in a fixture or a record is typed by hand.
//
//   git worktree add --detach /tmp/t38-pred 5a169babb638d1d09608f9a2bb84d1528f1aab4b && ln -s "$PWD/node_modules" /tmp/t38-pred/node_modules
//   M01_T38_BASELINE=/tmp/t38-pred node tools/verification/m01-combat-posture-staging-audit.mjs --write-golden [--candidate <sha>] [--amendment 02]
//   M01_T38_BASELINE=/tmp/t38-pred node tools/verification/m01-combat-posture-staging-audit.mjs --candidate 9f7945b3ba66f57871aef61a13699960acc953a8 --amendment 02    # verify only
//   node tools/verification/m01-combat-posture-staging-audit.mjs --live    # evidence only: see below
// --live runs the 24 invariants on the LIVE tree (staging + the T47 gun) against the predecessor 5a169ba, whose side is read from the committed GOLDEN_AUDIT.json (that report
// was made by a real run of the predecessor and is byte-checked by the verify mode above), COLLECTS the violations instead of asserting, writes only
// docs/verification/m01-runtime/ckm-fire-live-2026-10-16/INVARIANTS_24_ROUTES.json (M01_T47_AUDIT_OUT overrides the folder) and exits 0: it is the evidence of why this audit
// stopped being the guard of the live tree, not a gate.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {mkdtempSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {route} from '../../tests/helpers/m01-route.js';
import {GameplayDigest,gameplayFrame} from '../../tests/helpers/m01-animation-contract.js';

const PREDECESSOR='5a169babb638d1d09608f9a2bb84d1528f1aab4b';   // candidate #80 + #89 + T48; before the merge f02e06b: ef35c7ab24d75d87ca6435891f1977fd14d7a52c
const CANDIDATE_COMMIT='8c6328c947e92041f237b5990142dd110aee8e71';   // the staging that carries this golden's simulation (candidate #80 + #89 + T48 + T40 + T38); the tool audits this tree, from git
const FIXTURE='tests/fixtures/m01-t38-gameplay-baseline.json',PARTIALS='tests/fixtures/m01-partials-gameplay-baseline.json',HISTORICAL='tests/fixtures/m01-anim-gameplay-baseline.json';
const out=process.env.M01_T38_AUDIT_OUT??'docs/verification/m01-runtime/t38-combat-posture-staging-v1';mkdirSync(out,{recursive:true});
const hash=v=>createHash('sha256').update(v).digest('hex');
const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};

assert.equal(process.arch,'x64','D11/D30: the gameplay golden is generated and verified on x86 only');
const live=process.argv.includes('--live');
const baselineRoot=process.env.M01_T38_BASELINE;
if(!live){
  assert.ok(baselineRoot,'M01_T38_BASELINE must point at a checkout of the predecessor');
  assert.equal(execFileSync('git',['-C',baselineRoot,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),PREDECESSOR,'immutable predecessor ref');
  assert.equal(execFileSync('git',['-C',baselineRoot,'status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),'','the predecessor checkout is clean');
}
const partials=JSON.parse(readFileSync(PARTIALS,'utf8'));
if(!live)assert.equal(hash(readFileSync(baselineRoot+'/src/game/m01-simulation.js')),partials.sourceSha256,'the predecessor simulation is the one the partials golden pins');
const Before=live?null:(await import(pathToFileURL(baselineRoot+'/src/game/m01-simulation.js'))).M01Simulation;
// The candidate: the staging, extracted from git with its own data (src, missions and every .json of assets and research). The working tree is never read for it (except with --live).
const repoRoot=resolve(import.meta.dirname,'../..');
const treeRoot=live?repoRoot:mkdtempSync(join(tmpdir(),'m01-t38-candidate-'));
if(!live){
  const data=execFileSync('git',['-C',repoRoot,'ls-tree','-r','--name-only',CANDIDATE_COMMIT,'assets','research'],{encoding:'utf8',maxBuffer:1<<26}).split('\n').filter(p=>p.endsWith('.json'));
  execFileSync('tar',['-x','-C',treeRoot],{input:execFileSync('git',['-C',repoRoot,'archive','--format=tar',CANDIDATE_COMMIT,'src','missions',...data],{maxBuffer:1<<29})});
  symlinkSync(join(repoRoot,'node_modules'),join(treeRoot,'node_modules'));
}
const {M01Simulation,seconds,clockText,eastFrontPlan}=await import(pathToFileURL(treeRoot+'/src/game/m01-simulation.js'));
const source=readFileSync(treeRoot+'/src/game/m01-simulation.js'),sourceSha256=hash(source);
// Everything the per-tick gameplay bytes depend on besides the simulation source (data, posture, aim, fire, world): recorded for provenance and
// used to prove reproducibility (same inputs => byte-identical digests), not pinned by the test.
const INPUTS=['src/game/m01-simulation.js','missions/m01-tczew/mission.json','missions/m01-tczew/map-layout.json','src/game/m01-animation-presentation.js',
  'src/game/m01-aim.js','src/game/m01-fire.js','src/game/m01-display-fire.js','src/game/m01-yard-life.js','src/world/spatial.js','src/world/tczew-world.js'];
const gameplayInputsSha256=hash(INPUTS.map(f=>`${f} ${hash(readFileSync(treeRoot+'/'+f))}\n`).join(''));
const candidate=arg('--candidate');
if(candidate)assert.equal(hash(execFileSync('git',['show',candidate+':src/game/m01-simulation.js'])),sourceSha256,`${candidate} carries this simulation`);

const E=name=>`evt_m01_${name}`,FRONT=eastFrontPlan();
const FIXED=['train963_arrives','order_demolish','east_platoon_withdraws','germans_on_east_spans','bak_wounded'];
const MG_SQUAD_LINE='co_m01_enemy_mg_fire_on_squad';
/**
 * The MG34 gunners' bursts counted by the kind of target they were aimed at (eastFire: the player, Kowal = 'squad', the forward post = 'area',
 * the sappers = 'repair', the withdrawing platoon, ...), and every call of the callout co_m01_enemy_mg_fire_on_squad. It only observes: both
 * overrides delegate to the simulation and touch neither its RNG nor its state, so the route is the one the plain class plays (the committed
 * per-tick golden is generated without it). Works on the predecessor's class and on the candidate's alike.
 */
function withMg34Tally(Simulation,tally){
  return class extends Simulation{
    burst(a,target,kind,options){
      const fired=super.burst(a,target,kind,options);
      if(a.weapon==='mg34'){const g=tally.byGunner[a.id]??={};const key=fired?kind:'refused';g[key]=(g[key]??0)+1;}
      return fired;
    }
    line(id,token){if(id===MG_SQUAD_LINE)tally.fireOnSquadCalls++;return super.line(id,token);}
  };
}
const kindTotals=byGunner=>{
  const kinds={};for(const g of Object.values(byGunner))for(const [k,n] of Object.entries(g))if(k!=='refused')kinds[k]=(kinds[k]??0)+n;
  return Object.fromEntries(Object.entries(kinds).sort(([a],[b])=>a<b?-1:1));
};
const squadAreaOthers=kinds=>({squad:kinds.squad??0,area:kinds.area??0,others:Object.entries(kinds).filter(([k])=>k!=='squad'&&k!=='area').reduce((n,[,v])=>n+v,0)});
function outcome(Simulation,seed,support){
  const deaths={},times={},dialogues={},DLG=['dlg_m01_022','dlg_m01_026','dlg_m01_027','dlg_m01_029','dlg_m01_040','dlg_m01_049'];let withdrawFlag=null;
  const tally={byGunner:{},fireOnSquadCalls:0};
  const r=route(seed,{support,Simulation:withMg34Tally(Simulation,tally),onStep:({sim})=>{
    for(let i=0;i<24;i++){const a=sim.actor(`pl_east_${i}`);if(!a.alive&&deaths[a.id]===undefined)deaths[a.id]=sim.battleClock;}
    // battle clock at which each event was consumed (the real clock legitimately shifts with the repair duration)
    for(const id of Object.keys(sim.consumed))if(times[id]===undefined)times[id]=clockText(sim.battleClock);
    for(const id of DLG)if(dialogues[id]===undefined&&sim.dialogueConsumed.some(t=>t===id||t.startsWith(id+':')))dialogues[id]={clock:+sim.clock.toFixed(2),battleClock:clockText(sim.battleClock)};
    if(withdrawFlag===null&&sim.consumedEvent(E('east_platoon_withdraws')))withdrawFlag=sim.flags['m01.east_platoon_survivors'];
  }}),s=r.sim;
  return {dialogues,repairCompleteRealClock:+(s.consumed['evt_m01_repair_complete']??NaN).toFixed(2),battleTimes:Object.fromEntries(Object.entries(times).map(([k,v])=>[k.replace('evt_m01_',''),v])),complete:s.mission.complete,finalBattleClock:clockText(s.battleClock),checkpoints:s.checkpointsReached,
    objectives:Object.fromEntries(Object.entries(s.objectives).map(([k,v])=>[k,v.state])),withdrawFlag,finalSurvivors:s.flags['m01.east_platoon_survivors'],
    flags:s.flags,attrition:FRONT.attrition.map(e=>({victim:e.victim,at:clockText(e.at),fellAfterSec:deaths[e.victim]===undefined?null:+(deaths[e.victim]-e.at).toFixed(2)})),
    dlg049:s.dialogueConsumed.includes('dlg_m01_049'),consumedOrder:Object.keys(s.consumed),repairDoneObjective:s.objectives.obj_m01_cover_repair.state,
    playerHealth:s.player.health,rng:s.rng.state,issuedRounds:s.enemyFire.nextId,realClock:+s.clock.toFixed(2),
    events:Object.fromEntries(['enemy-fire','round-impact','npc-shot','player-hit'].map(t=>[t,r.events.filter(e=>e.type===t).length])),
    mg34:mg34Report(tally)};
}
function mg34Report(tally){
  const kinds=kindTotals(tally.byGunner);
  return {bursts:squadAreaOthers(kinds),kinds,refused:Object.values(tally.byGunner).reduce((n,g)=>n+(g.refused??0),0),
    byGunner:Object.fromEntries(Object.entries(tally.byGunner).sort(([a],[b])=>a<b?-1:1).map(([id,g])=>[id,squadAreaOthers(Object.fromEntries(Object.entries(g).filter(([k])=>k!=='refused')))])),
    fireOnSquadCalls:tally.fireOnSquadCalls};
}
// Golden amendments of tests/fixtures/m01-t38-gameplay-baseline.json, generated with --amendment NN (see the header). Amendment 01 (the twelve gate places
// moved, 25ed12f) predates this table: its record GOLDEN_AMENDMENT_01.json was assembled by hand-run analysis and the golden it replaced is kept as
// tests/fixtures/m01-t38-gameplay-baseline-before-amendment-01.json. `before` is the revision whose committed golden an amendment replaces.
const AMENDMENTS={
  '02':{before:'65145c905209d47da6931aad11c0beeebe597291',
    reason:'The T48 German retreat (BX-09; candidate #80 + #89 + T48 = 5a169ba) was merged into this branch (f02e06b). The simulation of the combined tree has a new source hash, '+
      'and from the east demolition on the Germans of the spans fall back with their fallen and regroup by 06:12, so the golden of the T38 simulation (amendment 01, the head 65145c9) no longer describes the branch. '+
      'Combined T38 positions and postures + T48 retreat: the T38 places, postures and mission data are unchanged (missions/m01-tczew/mission.json is not among the changed gameplay inputs). '+
      'The audit predecessor moves from ef35c7a to 5a169ba, whose simulation the partials golden pins since its amendment 02. The save migration of the gate riflemen no longer moves a fallen man '+
      '(it runs only when a save is restored: no per-tick effect). The causal proof that the retreat only changes the Germans of the spans from the east demolition tick on is '+
      'docs/verification/m01-runtime/german-retreat-regroup-v1/GOLDEN_AMENDMENT_03.json.'},
};
const SEEDS=(process.env.M01_T38_AUDIT_SEEDS??'19390901,1,2,3,4,5,6,7,8,9,10,11').split(',').map(Number);
const report={task:'M01-COMBAT-POSTURE-STAGING-V1',predecessor:PREDECESSOR,predecessorSourceSha256:partials.sourceSha256,sourceSha256,candidate,
  gameplayInputsSha256,node:process.version,arch:process.arch,invariants:'equal to the predecessor: completion, final battle clock, checkpoints, objective states, consumed-event order, battle-clock time of train963_arrives, order_demolish, east_platoon_withdraws, germans_on_east_spans, bak_wounded, east_demolition, west_demolition, roll_call and debrief, the 06:00 survivors flag, the final survivors, dlg_m01_049; absolute: repair_complete before 05:30, each attrition fall 0 to 5 s of battle clock after its fixed time',
  measured:'not invariants, they legitimately move with the lines of sight: per route and per MG34 gunner the bursts by kind of target (squad = Kowal, area = the forward post, others = player, repair, platoon, ...) and the calls of the callout co_m01_enemy_mg_fire_on_squad',routes:[]};
if(live){
  const committed=JSON.parse(readFileSync(`${out}/GOLDEN_AUDIT.json`,'utf8'));
  assert.equal(committed.predecessor,PREDECESSOR,'the committed report is the one made against the predecessor');
  const rows=[];
  for(const support of [false,true])for(const seed of SEEDS){
    const before=committed.routes.find(r=>r.seed===seed&&r.support===support).before,after=outcome(M01Simulation,seed,support),tb=before.battleTimes,ta=after.battleTimes,violations=[];
    for(const k of ['complete','finalBattleClock','checkpoints','objectives','withdrawFlag','finalSurvivors','dlg049','consumedOrder','repairDoneObjective'])
      if(JSON.stringify(after[k])!==JSON.stringify(before[k]))violations.push({invariant:k,predecessor:before[k],live:after[k]});
    if(JSON.stringify(Object.keys(ta))!==JSON.stringify(Object.keys(tb)))violations.push({invariant:'event order',predecessor:Object.keys(tb),live:Object.keys(ta)});
    for(const id of [...FIXED,'east_demolition','west_demolition','roll_call','debrief'])if(ta[id]!==tb[id])violations.push({invariant:`battle-clock time of ${id}`,predecessor:tb[id],live:ta[id]});
    if(!(seconds(ta.repair_complete)<seconds('05:30:00')))violations.push({invariant:'repair before the order',live:ta.repair_complete});
    for(const a of after.attrition)if(!(a.fellAfterSec!==null&&a.fellAfterSec>=0&&a.fellAfterSec<5))violations.push({invariant:'attrition fall 0 to 5 s after its fixed time',victim:a.victim,fellAfterSec:a.fellAfterSec});
    rows.push({seed,support,violations,finalSurvivors:{predecessor:before.finalSurvivors,live:after.finalSurvivors},withdrawFlag:{predecessor:before.withdrawFlag,live:after.withdrawFlag},
      repairComplete:{predecessor:tb.repair_complete,live:ta.repair_complete},attritionFallsSec:after.attrition.map(a=>a.fellAfterSec),playerHealth:{predecessor:before.playerHealth,live:after.playerHealth}});
    console.log(JSON.stringify(rows.at(-1)));
  }
  const folder=process.env.M01_T47_AUDIT_OUT??'docs/verification/m01-runtime/ckm-fire-live-2026-10-16';mkdirSync(folder,{recursive:true});
  const evidence={task:'M01-T47-CKM-LIVE-FIRE-V1',what:'The invariants audit of tools/verification/m01-combat-posture-staging-audit.mjs run on the LIVE tree (the staging plus the T47 gun) against the exact predecessor 5a169ba, collecting the violations instead of asserting them',
    predecessor:PREDECESSOR,predecessorSideFrom:'docs/verification/m01-runtime/t38-combat-posture-staging-v1/GOLDEN_AUDIT.json (the staging against 5a169ba; the verify mode of the tool checks it byte for byte)',
    predecessorSourceSha256:partials.sourceSha256,liveSourceSha256:hash(readFileSync(repoRoot+'/src/game/m01-simulation.js')),node:process.version,arch:process.arch,invariants:report.invariants,seeds:SEEDS,
    summary:{routes:rows.length,violatingRoutes:rows.filter(r=>r.violations.length).map(r=>`${r.seed}/${r.support?'support':'no support'}`)},routes:rows};
  writeFileSync(`${folder}/INVARIANTS_24_ROUTES.json`,JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify(evidence.summary));process.exit(0);
}
for(const support of [false,true])for(const seed of SEEDS){
  const before=outcome(Before,seed,support),after=outcome(M01Simulation,seed,support);
  const tb=before.battleTimes,ta=after.battleTimes;
  for(const k of ['complete','finalBattleClock','checkpoints','objectives','withdrawFlag','finalSurvivors','dlg049','consumedOrder','repairDoneObjective'])
    assert.deepEqual(after[k],before[k],`seed ${seed} support ${support}: ${k}`);
  assert.deepEqual(Object.keys(ta),Object.keys(tb),`seed ${seed} support ${support}: event order`);
  for(const id of [...FIXED,'east_demolition','west_demolition','roll_call','debrief'])assert.equal(ta[id],tb[id],`seed ${seed} support ${support}: ${id} at ${tb[id]}`);
  assert.ok(seconds(ta.repair_complete)<seconds('05:30:00'),`seed ${seed} support ${support}: repair before the order`);
  for(const a of after.attrition)assert.ok(a.fellAfterSec!==null&&a.fellAfterSec>=0&&a.fellAfterSec<5,`seed ${seed} support ${support}: ${a.victim} +${a.fellAfterSec}`);
  report.routes.push({seed,support,before,after});
  const mb=before.mg34,ma=after.mg34;
  console.log(JSON.stringify({seed,support,complete:after.complete,survivors:[before.finalSurvivors,after.finalSurvivors],repair:[tb.repair_complete,ta.repair_complete],
    falls:after.attrition.map(a=>a.fellAfterSec),
    mg34:{squad:[mb.bursts.squad,ma.bursts.squad],area:[mb.bursts.area,ma.bursts.area],others:[mb.bursts.others,ma.bursts.others],fireOnSquadCalls:[mb.fireOnSquadCalls,ma.fireOnSquadCalls]}}));
}
const mg34Sum=(side,pick)=>report.routes.reduce((n,r)=>n+pick(r[side].mg34),0);
report.mg34Totals=Object.fromEntries(['before','after'].map(side=>[side,{squad:mg34Sum(side,m=>m.bursts.squad),area:mg34Sum(side,m=>m.bursts.area),others:mg34Sum(side,m=>m.bursts.others),
  fireOnSquadCalls:mg34Sum(side,m=>m.fireOnSquadCalls)}]));
console.log(JSON.stringify({mg34Totals:report.mg34Totals}));
const golden={task:'M01-COMBAT-POSTURE-STAGING-V1',generationStage:'gameplay re-baseline by design after the invariant audit against the exact predecessor',
  predecessor:PREDECESSOR,predecessorSourceSha256:partials.sourceSha256,...(candidate?{candidate}:{}),sourceSha256,gameplayInputs:INPUTS,gameplayInputsSha256,
  partialsGoldenSha256:hash(readFileSync(PARTIALS)),historicalGoldenSha256:hash(readFileSync(HISTORICAL)),routes:[]};
const demolitionTicks={};
for(const {seed,support} of partials.routes){
  const digest=new GameplayDigest();let tick=0,demolition=null;
  route(seed,{support,Simulation:M01Simulation,onStep:({sim,events})=>{tick++;digest.add(gameplayFrame(sim,events));if(demolition===null&&sim.consumedEvent(E('east_demolition')))demolition=tick;}});
  golden.routes.push({seed,support,...digest.finish()});demolitionTicks[`${seed}/${support}`]=demolition;
}
writeFileSync(out+'/GOLDEN_AUDIT.json',JSON.stringify(report,null,2)+'\n');
const write=process.argv.includes('--write-golden');
if(existsSync(FIXTURE)){
  const committed=JSON.parse(readFileSync(FIXTURE,'utf8'));
  if(committed.gameplayInputsSha256===gameplayInputsSha256)assert.deepEqual(golden.routes,committed.routes,'same gameplay inputs, same per-tick digests (reproducible)');
}
const amendment=arg('--amendment'),spec=amendment?AMENDMENTS[amendment]:null;
if(amendment)assert.ok(spec,`unknown amendment ${amendment}`);
// The golden an amendment replaces: kept byte for byte (from git at spec.before), never overwritten, never taken from the working tree.
const keptPath=amendment?`tests/fixtures/m01-t38-gameplay-baseline-before-amendment-${amendment}.json`:null,
  oldBytes=amendment?execFileSync('git',['show',`${spec.before}:${FIXTURE}`],{maxBuffer:1<<26}):null;
if(amendment){
  if(!existsSync(keptPath)){assert.ok(write,`${keptPath} does not exist yet: run with --write-golden`);writeFileSync(keptPath,oldBytes);}
  assert.deepEqual(readFileSync(keptPath),oldBytes,'the replaced golden is kept byte for byte');
}
if(write)writeFileSync(FIXTURE,JSON.stringify(golden,null,2)+'\n');
else{const committed=JSON.parse(readFileSync(FIXTURE,'utf8'));const {candidate:_,...a}=committed,{candidate:__,...b}=golden;assert.deepEqual(a,b);}
if(amendment){
  const record=amendmentRecord(amendment,spec,keptPath,oldBytes,readFileSync(FIXTURE),demolitionTicks),file=`${out}/GOLDEN_AMENDMENT_${amendment}.json`;
  if(write)writeFileSync(file,JSON.stringify(record,null,2)+'\n');
  else assert.deepEqual(JSON.parse(readFileSync(file,'utf8')),record,`${file} equals the regenerated amendment record`);
  console.log(JSON.stringify({amendment:record.amendment,beforeFixtureSha256:record.beforeFixtureSha256,afterFixtureSha256:record.afterFixtureSha256,routes:record.routes}));
}
console.log(JSON.stringify({fixture:FIXTURE,sourceSha256,routes:golden.routes.map(r=>({seed:r.seed,support:r.support,ticks:r.ticks,blocks:r.blocks.length}))}));

/** GOLDEN_AMENDMENT_NN.json, derived from the two fixtures and git only: what changed in the header, per route the ticks and the 512-tick blocks, the gameplay inputs that differ. */
function amendmentRecord(no,spec,keptPath,oldBytes,newBytes,demolitionTicks){
  const old=JSON.parse(oldBytes),now=JSON.parse(newBytes);
  const header=Object.fromEntries([...new Set([...Object.keys(old),...Object.keys(now)])].filter(k=>k!=='routes').map(k=>
    [k,JSON.stringify(old[k])===JSON.stringify(now[k])?{unchanged:true}:{before:old[k]??null,after:now[k]??null}]));
  const routes=now.routes.map((r,i)=>{
    const o=old.routes[i];assert.deepEqual([o.seed,o.support],[r.seed,r.support],'the same routes in the same order');
    let same=0;while(same<Math.min(o.blocks.length,r.blocks.length)&&JSON.stringify(o.blocks[same])===JSON.stringify(r.blocks[same]))same++;
    return {seed:r.seed,support:r.support,oldTicks:o.ticks,newTicks:r.ticks,oldBlocks:o.blocks.length,newBlocks:r.blocks.length,identicalBlocks:same,
      firstDifferingBlockTick:r.blocks[same]?.tick??null,eastDemolitionTick:demolitionTicks[`${r.seed}/${r.support}`]};
  });
  const gitBlob=f=>hash(execFileSync('git',['show',`${spec.before}:${f}`],{maxBuffer:1<<26})),changed=INPUTS.filter(f=>gitBlob(f)!==hash(readFileSync(treeRoot+'/'+f)));
  return {task:'M01-COMBAT-POSTURE-STAGING-V1',amendment:`amendment-${no}`,base:now.candidate??null,beforeCommit:spec.before,beforeSourceSha256:old.sourceSha256,
    beforeGameplayInputsSha256:old.gameplayInputsSha256,beforeFixture:keptPath,beforeFixtureSha256:hash(oldBytes),afterFixture:FIXTURE,afterFixtureSha256:hash(newBytes),
    afterSourceSha256:now.sourceSha256,afterGameplayInputsSha256:now.gameplayInputsSha256,candidateRecordedInFixture:now.candidate??null,
    authority:'Regenerated only with tools/verification/m01-combat-posture-staging-audit.mjs --write-golden --amendment '+no+' (x86), after its invariant audit against the exact predecessor; never edited by hand. '+
      'This file is derived from the two fixture files and from git (the golden it replaces is read from the revision named in beforeCommit); no value in it is typed.',
    reason:spec.reason,changedGameplayInputs:changed,unchangedGameplayInputs:INPUTS.filter(f=>!changed.includes(f)),
    rule:'Same two routes and the same digest scheme (sha256 per 512 ticks of the whole gameplay frame: state, nested checkpoint and events, presentation fields removed). '+
      'identicalBlocks counts the leading 512-tick blocks equal to the replaced golden; firstDifferingBlockTick is the end tick of the first block that differs.',
    header,routes,
    invariantsAudit:{file:'GOLDEN_AUDIT.json',predecessor:PREDECESSOR,predecessorSourceSha256:partials.sourceSha256,routes:report.routes.length,seeds:SEEDS,
      invariants:report.invariants,mg34Totals:report.mg34Totals}};
}
