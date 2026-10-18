// T47 (M01-T47-CKM-LIVE-FIRE-V1) golden AMENDMENTS 02 and 03. Not invoked by npm test.
//
// Amendment 03 (the default, `--amendment 03`): the T47 x T38 interaction fix (docs/verification/m01-runtime/ckm-fire-live-2026-10-16/T47_T38_INTERACTION.md) moved the simulation
// of the combined tree once more, on the same staging predecessor 8c6328c. BEFORE is bc4523f (the combined tree with the golden of amendment 02); its golden and delta audit are kept
// as ...-before-amendment-03 / ..._BEFORE_AMENDMENT_03 and GOLDEN_AMENDMENT_03.json is the account, built exactly as the account of amendment 02 below (same chain checks, same runs,
// same record), plus the per-route first difference of the withdrawal cadence (the named delta `cadence` of the delta audit).
// `--amendment 02` re-checks amendment 02 as HISTORY: its AFTER is bc4523f, so the golden and the delta audit it described are read from their kept copies
// (byte copies of bc4523f) and its live side is the simulation of bc4523f extracted from git, never the working tree; GOLDEN_AMENDMENT_02.json must come out byte for byte.
//
// History. Amendment 01 (this file at 602a5ee, GOLDEN_AMENDMENT_01.json) was the per-tick account of what the critical review of T47 changed in the golden of the T47 branch
// (candidate #80, 813f163, + T47). The T47 branch was then merged onto the combined staging 8c6328c (candidate #80 + #89 + T48 German retreat + T40 first-person arms + T38
// combat postures; merge 3c9cab7), so the golden moved again, for a reason that no lockstep against 602a5ee can isolate: the staging changes gameplay DATA from tick 1 (T38
// places and postures), so the two simulations differ from the first tick and a "byte-identical until X" proof against 602a5ee would be empty. The causal proof of the T47 part is
// the per-tick delta audit against the exact staging predecessor (tools/verification/m01-t47-ckm-fire-audit.mjs: the infrastructure disturbs nothing else apart from the named
// deltas, and the first landed round that changes a German is the first difference). What this tool adds is the account of the replaced golden, derived from git and the fixtures:
//   1. the T47 golden and delta audit of BEFORE (602a5ee) are read from git, hashed and kept as byte copies (...-before-amendment-02), saved once, never overwritten;
//   2. the chain is checked: the kept golden cites exactly the kept audit, the new golden cites the committed audit and pins this tree's simulation, the new golden's predecessor is
//      the staging (whose simulation the T38 golden pins) and both goldens audit the same two routes;
//   3. the simulation of BEFORE (extracted from git with its own data) drives each golden route through the live test pilot: its digest must equal the kept golden (so the kept
//      golden is faithfully the simulation of 602a5ee), the live simulation runs the same route and its digest must equal the new golden; the record lists where the two first
//      differ (tick 1: which actors and fields, i.e. the T38 places and postures; then the first tick at which the clock, the main RNG, the rounds, the events or the player's
//      health differ);
//   4. per route the 512-tick blocks of the kept and the new golden are compared (identical leading blocks, first differing block) and the T47 live-fire figures of the old and the
//      new delta audit are put side by side; the gameplay inputs that changed since BEFORE and since the staging are listed.
// The T38 golden (amendment 02) and the T38 and T48 audit tools are history since the merge and are not rewritten: the live golden of the combined tree is this one.
// The JSON is deterministic (no clocks, no paths), so re-running reproduces the committed file. x86_64 only (D11/D30): exact gameplay golden regeneration is never done from aarch64.
//   node tools/verification/m01-t47-golden-amendment-audit.mjs [--amendment 02|03] [--write]        (M01_T47_AUDIT_OUT overrides the output folder)
// Without --write nothing is written: the kept copies and GOLDEN_AMENDMENT_NN.json must equal what is regenerated. Run it AFTER m01-t47-ckm-fire-audit.mjs --write-golden.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,mkdtempSync,symlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {resolve,join} from 'node:path';
import {route} from '../../tests/helpers/m01-route.js';
import {GameplayDigest,gameplayFrame} from '../../tests/helpers/m01-animation-contract.js';
import {M01Simulation as WorkingTree,clockText} from '../../src/game/m01-simulation.js';

const ROOT=resolve(import.meta.dirname,'../..');
const PREDECESSOR='8c6328c947e92041f237b5990142dd110aee8e71';    // the combined staging T47 is audited against
const amendmentArg=(()=>{const i=process.argv.indexOf('--amendment');return i<0?'03':process.argv[i+1];})();
// before: the commit whose golden and delta audit the amendment replaced (beforePredecessor: the predecessor that golden was audited against); after: null = the working tree,
// or the commit whose golden and delta audit the amendment wrote (history: both are read from the byte copies the NEXT amendment kept, the simulation from git at that commit).
const AMENDMENTS={
  '02':{before:'602a5ee89920283d360a1bdad6177922666b2936',beforePredecessor:'813f163deceb551e0e4504b30958580cb67d3a76',after:'bc4523fc2e8161846828b77e7c1a49697f3372e8',
    afterGolden:'tests/fixtures/m01-t47-gameplay-baseline-before-amendment-03.json',afterAudit:'PREDECESSOR_DELTA_AUDIT_BEFORE_AMENDMENT_03.json'},
  // History since the P2 pacing amendment 04 (tools/verification/m01-pacing-golden-amendment.mjs): AFTER is f6913a0, whose golden is kept as ...-before-amendment-04.
  '03':{before:'bc4523fc2e8161846828b77e7c1a49697f3372e8',beforePredecessor:PREDECESSOR,after:'f6913a0dae3ae227ab0421c6b59f992e8685e9a6',
    afterGolden:'tests/fixtures/m01-t47-gameplay-baseline-before-amendment-04.json',afterAudit:'PREDECESSOR_DELTA_AUDIT.json'}};
const CFG=AMENDMENTS[amendmentArg];if(!CFG)throw new Error(`--amendment ${amendmentArg}: 02 or 03`);
const BEFORE_COMMIT=CFG.before,KEY=`amendment${amendmentArg}`;
const INPUTS=['src/game/m01-simulation.js','missions/m01-tczew/mission.json','missions/m01-tczew/map-layout.json','src/game/m01-animation-presentation.js',
  'src/game/m01-aim.js','src/game/m01-fire.js','src/game/m01-display-fire.js','src/game/m01-yard-life.js','src/world/spatial.js','src/world/tczew-world.js'];   // as in the T38 tool
const GOLDEN_PATH='tests/fixtures/m01-t47-gameplay-baseline.json',BEFORE_GOLDEN_PATH=`tests/fixtures/m01-t47-gameplay-baseline-before-amendment-${amendmentArg}.json`;
const STAGING_GOLDEN_PATH='tests/fixtures/m01-t38-gameplay-baseline.json';   // the T38 golden of amendment 02 = the golden of the staging; history, unchanged by the merge
const EVIDENCE='docs/verification/m01-runtime/ckm-fire-live-2026-10-16';
const OUT=resolve(process.env.M01_T47_AUDIT_OUT??join(ROOT,EVIDENCE));
const AUDIT=join(OUT,CFG.afterAudit),BEFORE_AUDIT=join(OUT,`PREDECESSOR_DELTA_AUDIT_BEFORE_AMENDMENT_${amendmentArg}.json`),REPORT=join(OUT,`GOLDEN_AMENDMENT_${amendmentArg}.json`);
const write=process.argv.includes('--write');
assert.equal(process.arch,'x64','D11/D30: exact gameplay golden regeneration requires x86_64');
const sha=v=>createHash('sha256').update(v).digest('hex');
const show=(rev,path)=>execFileSync('git',['-C',ROOT,'show',`${rev}:${path}`],{maxBuffer:1<<26});
const read=path=>readFileSync(join(ROOT,path));

// 1. The replaced golden and delta audit: byte copies from git, saved once, never overwritten.
const oldGolden=show(BEFORE_COMMIT,GOLDEN_PATH),oldAudit=show(BEFORE_COMMIT,`${EVIDENCE}/PREDECESSOR_DELTA_AUDIT.json`);
mkdirSync(OUT,{recursive:true});
for(const [file,bytes] of [[join(ROOT,BEFORE_GOLDEN_PATH),oldGolden],[BEFORE_AUDIT,oldAudit]]){
  if(!existsSync(file)){assert.ok(write,`${file} does not exist yet: run with --write`);writeFileSync(file,bytes);}
  assert.deepEqual(readFileSync(file),bytes,'the before-amendment copy is byte-identical to the file at BEFORE');
}

// 2. The chain.
const afterGoldenBytes=read(CFG.afterGolden),afterSource=CFG.after?show(CFG.after,'src/game/m01-simulation.js'):read('src/game/m01-simulation.js');
const before=JSON.parse(oldGolden),after=JSON.parse(afterGoldenBytes),beforeAudit=JSON.parse(oldAudit),afterAuditBytes=readFileSync(AUDIT),afterAudit=JSON.parse(afterAuditBytes);
const staging=JSON.parse(read(STAGING_GOLDEN_PATH));
assert.equal(before.auditSha256,sha(oldAudit),'the replaced golden cites exactly the delta audit kept as its copy');
assert.equal(before.predecessor,CFG.beforePredecessor);
assert.equal(after.predecessor,PREDECESSOR);assert.equal(afterAudit.predecessor,PREDECESSOR);
assert.equal(after.predecessorSourceSha256,staging.sourceSha256,'the staging simulation is the one the T38 golden pins');
assert.equal(afterAudit.predecessorSourceSha256,staging.sourceSha256);
assert.equal(after.auditSha256,sha(afterAuditBytes),'the new golden cites the committed delta audit');
assert.equal(after.sourceSha256,sha(afterSource),'the new golden pins the source of AFTER (the working tree, or the history commit)');
assert.notEqual(after.sourceSha256,before.sourceSha256,'the amendment moved the source lock');
assert.equal(after[KEY].beforeFixtureSha256,sha(oldGolden));assert.equal(after[KEY].beforeAuditSha256,sha(oldAudit));assert.equal(after[KEY].beforeSourceSha256,before.sourceSha256);
assert.equal(after[KEY].beforeCommit,BEFORE_COMMIT);
assert.deepEqual(after.routes.map(r=>[r.seed,r.support]),before.routes.map(r=>[r.seed,r.support]),'the same two routes');

// 3. BEFORE's simulation, extracted from git with its own data, drives the golden routes through the live pilot.
function extract(rev){
  const dir=mkdtempSync(join(tmpdir(),'m01-t47-before-'));
  const data=execFileSync('git',['-C',ROOT,'ls-tree','-r','--name-only',rev,'assets','research'],{encoding:'utf8',maxBuffer:1<<26}).split('\n').filter(p=>p.endsWith('.json'));
  const tar=execFileSync('git',['-C',ROOT,'archive','--format=tar',rev,'src','missions','tests/helpers','tools/m01-ckm-fire-arc.mjs',...data],{maxBuffer:1<<29});
  execFileSync('tar',['-x','-C',dir],{input:tar});symlinkSync(join(ROOT,'node_modules'),join(dir,'node_modules'));
  return dir;
}
const tree=extract(BEFORE_COMMIT);
assert.equal(sha(readFileSync(join(tree,'src/game/m01-simulation.js'))),before.sourceSha256,'the extracted tree carries the simulation the kept golden pins');
const {M01Simulation:Before}=await import(pathToFileURL(join(tree,'src/game/m01-simulation.js')));
// The test pilot: the working tree's for amendment 03; for a history amendment the pilot as it was at AFTER (D43 taught the support pilot to ask Kowal for clips,
// which changes the support route of 602a5ee), so the history is reproduced with the controls that made it.
let Live=WorkingTree,pilot=route,afterTree=null;
if(CFG.after){afterTree=extract(CFG.after);assert.equal(sha(readFileSync(join(afterTree,'src/game/m01-simulation.js'))),after.sourceSha256,'the history AFTER tree carries the simulation its golden pins');
  Live=(await import(pathToFileURL(join(afterTree,'src/game/m01-simulation.js')))).M01Simulation;
  pilot=(await import(pathToFileURL(join(afterTree,'tests/helpers/m01-route.js')))).route;}

const LEAF_CAP=4000;
/** Every leaf path at which two JSON values differ (capped), as the T38 divergence tool lists them. */
function diff(a,b,path='$',out=[]){
  if(out.length>=LEAF_CAP||a===b||(Number.isNaN(a)&&Number.isNaN(b)))return out;
  if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[k],b[k],`${path}.${k}`,out);return out;}
  out.push(path);return out;
}
function run(Simulation,seed,support){
  const sig=[],digest=new GameplayDigest();let tick=0,first=null,ids=null,groups=null;
  pilot(seed,{support,Simulation,onStep:({sim,events})=>{
    tick++;digest.add(gameplayFrame(sim,events));
    sig.push([sim.clock,sim.rng.state,sim.enemyFire.nextId,sim.enemyFire.rounds.length,sim.player.health,events.length,sim.battleClock]);
    if(tick===1){first=gameplayFrame(sim,events);ids=sim.actors.map(a=>a.id);groups=Object.fromEntries(sim.actors.map(a=>[a.id,a.group??a.team]));}
  }});
  return {sig,first,ids,groups,digest:digest.finish()};
}
const routes=[];
for(const [index,{seed,support,ticks,blocks}] of before.routes.entries()){
  const old=run(Before,seed,support),now=run(Live,seed,support);
  // The kept golden is the digest of BEFORE's simulation on this tree's pilot; the new golden is the digest of the live one.
  assert.deepEqual(old.digest,{ticks,blocks},'BEFORE reproduces the kept golden for this route on this tree');
  assert.deepEqual(now.digest,{ticks:after.routes[index].ticks,blocks:after.routes[index].blocks},'the live simulation reproduces the new golden');
  assert.deepEqual(old.ids,now.ids,'the same 97 actors in the same order');
  // Where the two simulations first differ: tick 1 by leaf (actor and field), then the first tick at which the shared counters part.
  const paths=diff(old.first,now.first),leaves=paths.map(path=>{const m=/^\$\.(state|checkpoint)\.actors\.(\d+)\.(.+)$/.exec(path);return m?{actor:now.ids[Number(m[2])],field:m[3]}:{other:path};});
  const byGroup={};
  for(const l of leaves)if(l.actor){const g=now.groups[l.actor];(byGroup[g]??={actors:new Set(),fields:new Set()});byGroup[g].actors.add(l.actor);byGroup[g].fields.add(l.field);}
  const len=Math.min(old.sig.length,now.sig.length),at=t=>t===null?null:{tick:t,clock:+now.sig[t-1][0].toFixed(2),battleClock:clockText(now.sig[t-1][6])};
  const firstTick=pick=>{for(let i=0;i<len;i++)if(pick(old.sig[i],now.sig[i]))return i+1;return null;};
  // Leading 512-tick blocks equal to the replaced golden.
  const mine=after.routes[index];let same=0;while(same<Math.min(blocks.length,mine.blocks.length)&&JSON.stringify(blocks[same])===JSON.stringify(mine.blocks[same]))same++;
  const liveOf=audit=>{const row=audit.routes[index];return {bursts:row.live.bursts,roundsIssued:row.live.roundsIssued,hits:row.live.hits,kills:row.live.kills,menHit:row.live.men.hit,menSuppressed:row.live.men.suppressed,
    suppressionEvents:row.live.suppressionEvents,repairPins:row.summaries.live.repairPins,repairCompleteSec:row.endStateAgainstPredecessorOwnRoute.repairCompleteSec.live,
    causalOnset:row.causalOnset?{tick:row.causalOnset.tick,clock:row.causalOnset.clock,actor:row.causalOnset.firstDifferenceActor}:null};};
  routes.push({seed,support,oldTicks:ticks,newTicks:mine.ticks,oldBlocks:blocks.length,newBlocks:mine.blocks.length,identicalBlocks:same,firstDifferingBlockTick:mine.blocks[same]?.tick??null,
    firstDifferenceFromBefore:{tick1:{leafDifferences:leaves.length,leafCapReached:leaves.length>=LEAF_CAP,actorsDiffering:[...new Set(leaves.filter(l=>l.actor).map(l=>l.actor))].sort(),
        groups:Object.fromEntries(Object.entries(byGroup).sort(([a],[b])=>a<b?-1:1).map(([g,v])=>[g,{actors:v.actors.size,fields:[...v.fields].sort()}])),other:leaves.filter(l=>l.other).map(l=>l.other)},
      firstTickWhere:{mainRngStateDiffers:at(firstTick((o,n)=>o[1]!==n[1])),roundsIssuedOrInFlightDiffer:at(firstTick((o,n)=>o[2]!==n[2]||o[3]!==n[3])),
        eventCountDiffers:at(firstTick((o,n)=>o[5]!==n[5])),playerHealthDiffers:at(firstTick((o,n)=>o[4]!==n[4])),realClockDiffers:at(firstTick((o,n)=>o[0]!==n[0]))}},
    liveFireBefore:liveOf(beforeAudit),liveFireAfter:liveOf(afterAudit),
    ...(amendmentArg==='03'?{cadenceFirstDifferenceAfter:afterAudit.routes[index].cadenceFirstDifference}:{})});
  console.log(JSON.stringify(routes.at(-1)).slice(0,1200));
}

// 3b. Amendment 03 only (D43): the S2 visibility count pinned by tests/m01-ckm-live-fire.test.js ('post S2 is confirmed in the production trace', strictClearEntries) is
// re-measured with the repo tool (tools/m01-ckm-fire-arc.mjs collectWindowTargets + evaluateCandidate at the real muzzle, gun neutral, seed 19390901, every 20 ticks) on
// BEFORE (extracted from git, with its own tool and pilot) and on the working tree. It moves with the T23 withdrawal cadence, which changes the neutral route after 06:05.
function windowCount(dir){
  const url=f=>JSON.stringify(pathToFileURL(join(dir,f)).href);
  // Also the window and shortlist figures pinned by tests/m01-ckm-candidate-posts.test.js (same window, same functions).
  const code=`import {collectWindowTargets,evaluateCandidate,describeCandidate,SHORTLIST} from ${url('tools/m01-ckm-fire-arc.mjs')};import {ckmMuzzle} from ${url('src/game/m01-simulation.js')};`+
    `const w=await collectWindowTargets({everyTicks:20}),e=evaluateCandidate(w,ckmMuzzle());`+
    `const pick=d=>({strictClearEntries:d.strictClearEntries,productionClearEntries:d.productionClearEntries,throughBridgeEntries:d.throughBridgeEntries,minGapToBridgeM:d.minGapToBridgeM,minClearanceM:d.minClearanceM,minTargetDistanceM:d.minTargetDistanceM,maxTargetDistanceM:d.maxTargetDistanceM});`+
    `const shortlist=Object.fromEntries(SHORTLIST.map(c=>[c.id,pick(describeCandidate(w,c))]));`+
    `const muzzleHeights=Object.fromEntries([.6,.9].map(above=>[above,{S1:describeCandidate(w,SHORTLIST[0],{above}).strictClearEntries,S2:describeCandidate(w,SHORTLIST[1],{above}).strictClearEntries}]));`+
    `console.log(JSON.stringify({samples:w.samples,enemySamples:w.enemySamples,phaseSamples:w.phaseSamples,phaseActors:w.phaseActors,entries:w.entries.length,productionClearEntries:e.productionClearEntries,strictClearEntries:e.strictClearEntries,throughBridgeEntries:e.throughBridgeEntries,shortlist,muzzleHeights}));`;
  return JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',code],{cwd:dir,encoding:'utf8',maxBuffer:1<<26}).trim().split('\n').at(-1));
}
const s2Visibility=amendmentArg==='03'?{tool:'tools/m01-ckm-fire-arc.mjs collectWindowTargets({everyTicks:20}) + evaluateCandidate(window, ckmMuzzle()) + describeCandidate(window, SHORTLIST[i])',
  tests:['tests/m01-ckm-live-fire.test.js: post S2 is confirmed in the production trace','tests/m01-ckm-candidate-posts.test.js: whole-route window'],
  before:windowCount(tree),after:windowCount(afterTree??ROOT)}:null;
if(s2Visibility)console.log(JSON.stringify({s2Visibility}));

// 4. The record.
// A gameplay input that did not exist at `rev` (src/game/m01-aim.js came with T38) counts as changed.
const blobAt=(rev,f)=>{try{return sha(execFileSync('git',['-C',ROOT,'show',`${rev}:${f}`],{maxBuffer:1<<26,stdio:['ignore','pipe','ignore']}));}catch{return null;}};
const current=f=>CFG.after?blobAt(CFG.after,f):sha(read(f));
const changedSince=rev=>INPUTS.filter(f=>blobAt(rev,f)!==current(f));
const sincePredecessor=changedSince(PREDECESSOR);
const header=Object.fromEntries([...new Set([...Object.keys(before),...Object.keys(after)])].filter(k=>k!=='routes').map(k=>
  [k,JSON.stringify(before[k])===JSON.stringify(after[k])?{unchanged:true}:{before:before[k]??null,after:after[k]??null}]));
const REASON_03='The T47 x T38 interaction (T47_T38_INTERACTION.md in this folder; the three findings of D42) was fixed in the simulation of the combined tree, on the same staging '+
  'predecessor 8c6328c. Three changes, in the order the route meets them: (1) the ckm is laid on the standing man who fired (ckmAim and the clear-shot line of sight no longer read '+
  '`crouched`), so the gun no longer depends on the T38 gate postures, which the T23 attrition volleys change (the T22 twin of tests/m01-east-front.test.js): the first difference is '+
  'the first burst laid on a kneeling rifleman, inside the crew delta, and then the first landed round whose beaten zone changes a German; (2) CKM_SUPPRESS_SEC 2.5 -> 1.5 s, the 1.5 s '+
  'that a German near miss pins an ally who is not working (landRound), so the player keeps the duel with the gate MG during the repair; (3) the T23 withdrawal cadence counts its 20 s '+
  'from the landing of the lethal round (named delta `cadence` of the delta audit, emulated on the predecessor and proved per route: cadenceFirstDifferenceAfter), so casualties are at '+
  'least 20 s of battle clock apart when the clock drops from 8x to 1x during a flight (06:09:00). The replaced golden and delta audit (bc4523f, amendment 02) are kept byte for byte.';
const report={task:'M01-T47-CKM-LIVE-FIRE-V1',amendment:`amendment-${amendmentArg}`,beforeCommit:BEFORE_COMMIT,predecessor:PREDECESSOR,predecessorSourceSha256:staging.sourceSha256,
  beforeSourceSha256:before.sourceSha256,beforeFixture:BEFORE_GOLDEN_PATH,beforeFixtureSha256:sha(oldGolden),
  beforeAudit:`${EVIDENCE}/PREDECESSOR_DELTA_AUDIT_BEFORE_AMENDMENT_${amendmentArg}.json`,beforeAuditSha256:sha(oldAudit),
  afterFixture:GOLDEN_PATH,afterFixtureSha256:sha(afterGoldenBytes),afterSourceSha256:after.sourceSha256,afterAudit:`${EVIDENCE}/PREDECESSOR_DELTA_AUDIT.json`,afterAuditSha256:after.auditSha256,
  authority:(amendmentArg==='02'?'Written only by tools/verification/m01-t47-golden-amendment-audit.mjs --write (x86)':'Written only by tools/verification/m01-t47-golden-amendment-audit.mjs --amendment 03 --write (x86)')+', after tools/verification/m01-t47-ckm-fire-audit.mjs --write-golden; never edited by hand. '+
    'Derived from git (the replaced golden and delta audit are read from beforeCommit), the two fixtures, the two delta audits and two runs of each golden route; no value in it is typed.',
  reason:amendmentArg==='03'?REASON_03:'T47 was merged onto the combined staging 8c6328c (candidate #80 + #89 + T48 German retreat + T40 first-person arms + T38 combat postures; merge 3c9cab7). The golden of the T47 branch '+
    '(602a5ee: candidate #80 + T47, amendment 01) pinned a simulation and mission data that no longer exist as such, so it was regenerated for staging + T47 and the replaced golden and '+
    'delta audit are kept byte for byte. Why the new golden differs from the replaced one, in the order the route meets it: (1) from tick 1 the T38 places and postures (gameplay data: '+
    'the east platoon, the twelve gate riflemen, the section and the sappers kneel or lie at staggered places; listed under firstDifferenceFromBefore.tick1 and proved by the T38 '+
    'amendment records); (2) from the first changed line of sight the main RNG path parts (firstTickWhere), because a kneeling German is a different target; (3) from the east '+
    'demolition the T48 German retreat and regroup (german-retreat-regroup-v1/GOLDEN_AMENDMENT_03.json); (4) the T47 live fire itself, now over the staging: the per-tick delta audit '+
    'against 8c6328c shows that the new post, crew, phases, burst plans, own random stream, belt and events disturb nothing else apart from the named deltas, and that the first '+
    'landed round that changes a German is the first difference (liveFireAfter.causalOnset). The T47 head had the same live-fire code; its figures (liveFireBefore) differ from '+
    'the new ones because the Germans it answers now stand, kneel and shoot as the T38 staging has them.',
  rule:'Same two routes and the same digest scheme (sha256 per 512 ticks of the whole gameplay frame: state, nested checkpoint and events, presentation fields removed). identicalBlocks counts '+
    'the leading 512-tick blocks equal to the replaced golden; firstDifferingBlockTick is the end tick of the first block that differs. firstDifferenceFromBefore runs the simulation of '+
    'beforeCommit (extracted from git with its own data) and the live one through the same test pilot.',
  changedGameplayInputsSinceBefore:changedSince(BEFORE_COMMIT),changedGameplayInputsSincePredecessor:sincePredecessor,unchangedGameplayInputsSincePredecessor:INPUTS.filter(f=>!sincePredecessor.includes(f)),
  header,routes,...(s2Visibility?{s2Visibility}:{})};
const text=JSON.stringify(report,null,2)+'\n';
if(write){mkdirSync(OUT,{recursive:true});writeFileSync(REPORT,text);}
else assert.equal(readFileSync(REPORT,'utf8'),text,`GOLDEN_AMENDMENT_${amendmentArg}.json equals the regenerated report`);
