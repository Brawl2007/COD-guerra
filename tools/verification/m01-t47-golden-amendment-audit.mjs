// T47 (M01-T47-CKM-LIVE-FIRE-V1) golden AMENDMENT 02: T47 on the combined staging. Not invoked by npm test.
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
//   node tools/verification/m01-t47-golden-amendment-audit.mjs [--write]        (M01_T47_AUDIT_OUT overrides the output folder)
// Without --write nothing is written: the kept copies and GOLDEN_AMENDMENT_02.json must equal what is regenerated. Run it AFTER m01-t47-ckm-fire-audit.mjs --write-golden.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,mkdtempSync,symlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {resolve,join} from 'node:path';
import {route} from '../../tests/helpers/m01-route.js';
import {GameplayDigest,gameplayFrame} from '../../tests/helpers/m01-animation-contract.js';
import {M01Simulation as Live,clockText} from '../../src/game/m01-simulation.js';

const ROOT=resolve(import.meta.dirname,'../..');
const BEFORE_COMMIT='602a5ee89920283d360a1bdad6177922666b2936';   // the T47 head before the merge: candidate #80 + T47 (amendment 01), whose golden and delta audit this amendment replaces
const PREDECESSOR='8c6328c947e92041f237b5990142dd110aee8e71';    // the combined staging T47 is audited against
const INPUTS=['src/game/m01-simulation.js','missions/m01-tczew/mission.json','missions/m01-tczew/map-layout.json','src/game/m01-animation-presentation.js',
  'src/game/m01-aim.js','src/game/m01-fire.js','src/game/m01-display-fire.js','src/game/m01-yard-life.js','src/world/spatial.js','src/world/tczew-world.js'];   // as in the T38 tool
const GOLDEN_PATH='tests/fixtures/m01-t47-gameplay-baseline.json',BEFORE_GOLDEN_PATH='tests/fixtures/m01-t47-gameplay-baseline-before-amendment-02.json';
const STAGING_GOLDEN_PATH='tests/fixtures/m01-t38-gameplay-baseline.json';   // the T38 golden of amendment 02 = the golden of the staging; history, unchanged by the merge
const EVIDENCE='docs/verification/m01-runtime/ckm-fire-live-2026-10-16';
const OUT=resolve(process.env.M01_T47_AUDIT_OUT??join(ROOT,EVIDENCE));
const AUDIT=join(OUT,'PREDECESSOR_DELTA_AUDIT.json'),BEFORE_AUDIT=join(OUT,'PREDECESSOR_DELTA_AUDIT_BEFORE_AMENDMENT_02.json'),REPORT=join(OUT,'GOLDEN_AMENDMENT_02.json');
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
const before=JSON.parse(oldGolden),after=JSON.parse(read(GOLDEN_PATH)),beforeAudit=JSON.parse(oldAudit),afterAuditBytes=readFileSync(AUDIT),afterAudit=JSON.parse(afterAuditBytes);
const staging=JSON.parse(read(STAGING_GOLDEN_PATH));
assert.equal(before.auditSha256,sha(oldAudit),'the replaced golden cites exactly the delta audit kept as its copy');
assert.equal(before.predecessor,'813f163deceb551e0e4504b30958580cb67d3a76');
assert.equal(after.predecessor,PREDECESSOR);assert.equal(afterAudit.predecessor,PREDECESSOR);
assert.equal(after.predecessorSourceSha256,staging.sourceSha256,'the staging simulation is the one the T38 golden pins');
assert.equal(afterAudit.predecessorSourceSha256,staging.sourceSha256);
assert.equal(after.auditSha256,sha(afterAuditBytes),'the new golden cites the committed delta audit');
assert.equal(after.sourceSha256,sha(read('src/game/m01-simulation.js')),'the new golden pins the current source');
assert.notEqual(after.sourceSha256,before.sourceSha256,'the amendment moved the source lock');
assert.equal(after.amendment02.beforeFixtureSha256,sha(oldGolden));assert.equal(after.amendment02.beforeAuditSha256,sha(oldAudit));assert.equal(after.amendment02.beforeSourceSha256,before.sourceSha256);
assert.equal(after.amendment02.beforeCommit,BEFORE_COMMIT);
assert.deepEqual(after.routes.map(r=>[r.seed,r.support]),before.routes.map(r=>[r.seed,r.support]),'the same two routes');

// 3. BEFORE's simulation, extracted from git with its own data, drives the golden routes through the live pilot.
function extract(rev){
  const dir=mkdtempSync(join(tmpdir(),'m01-t47-before-'));
  const data=execFileSync('git',['-C',ROOT,'ls-tree','-r','--name-only',rev,'assets','research'],{encoding:'utf8',maxBuffer:1<<26}).split('\n').filter(p=>p.endsWith('.json'));
  const tar=execFileSync('git',['-C',ROOT,'archive','--format=tar',rev,'src','missions',...data],{maxBuffer:1<<29});
  execFileSync('tar',['-x','-C',dir],{input:tar});symlinkSync(join(ROOT,'node_modules'),join(dir,'node_modules'));
  return dir;
}
const tree=extract(BEFORE_COMMIT);
assert.equal(sha(readFileSync(join(tree,'src/game/m01-simulation.js'))),before.sourceSha256,'the extracted tree carries the simulation the kept golden pins');
const {M01Simulation:Before}=await import(pathToFileURL(join(tree,'src/game/m01-simulation.js')));

const LEAF_CAP=4000;
/** Every leaf path at which two JSON values differ (capped), as the T38 divergence tool lists them. */
function diff(a,b,path='$',out=[]){
  if(out.length>=LEAF_CAP||a===b||(Number.isNaN(a)&&Number.isNaN(b)))return out;
  if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[k],b[k],`${path}.${k}`,out);return out;}
  out.push(path);return out;
}
function run(Simulation,seed,support){
  const sig=[],digest=new GameplayDigest();let tick=0,first=null,ids=null,groups=null;
  route(seed,{support,Simulation,onStep:({sim,events})=>{
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
    liveFireBefore:liveOf(beforeAudit),liveFireAfter:liveOf(afterAudit)});
  console.log(JSON.stringify(routes.at(-1)).slice(0,1200));
}

// 4. The record.
// A gameplay input that did not exist at `rev` (src/game/m01-aim.js came with T38) counts as changed.
const blobAt=(rev,f)=>{try{return sha(execFileSync('git',['-C',ROOT,'show',`${rev}:${f}`],{maxBuffer:1<<26,stdio:['ignore','pipe','ignore']}));}catch{return null;}};
const changedSince=rev=>INPUTS.filter(f=>blobAt(rev,f)!==sha(read(f)));
const sincePredecessor=changedSince(PREDECESSOR);
const header=Object.fromEntries([...new Set([...Object.keys(before),...Object.keys(after)])].filter(k=>k!=='routes').map(k=>
  [k,JSON.stringify(before[k])===JSON.stringify(after[k])?{unchanged:true}:{before:before[k]??null,after:after[k]??null}]));
const report={task:'M01-T47-CKM-LIVE-FIRE-V1',amendment:'amendment-02',beforeCommit:BEFORE_COMMIT,predecessor:PREDECESSOR,predecessorSourceSha256:staging.sourceSha256,
  beforeSourceSha256:before.sourceSha256,beforeFixture:BEFORE_GOLDEN_PATH,beforeFixtureSha256:sha(oldGolden),
  beforeAudit:`${EVIDENCE}/PREDECESSOR_DELTA_AUDIT_BEFORE_AMENDMENT_02.json`,beforeAuditSha256:sha(oldAudit),
  afterFixture:GOLDEN_PATH,afterFixtureSha256:sha(read(GOLDEN_PATH)),afterSourceSha256:after.sourceSha256,afterAudit:`${EVIDENCE}/PREDECESSOR_DELTA_AUDIT.json`,afterAuditSha256:after.auditSha256,
  authority:'Written only by tools/verification/m01-t47-golden-amendment-audit.mjs --write (x86), after tools/verification/m01-t47-ckm-fire-audit.mjs --write-golden; never edited by hand. '+
    'Derived from git (the replaced golden and delta audit are read from beforeCommit), the two fixtures, the two delta audits and two runs of each golden route; no value in it is typed.',
  reason:'T47 was merged onto the combined staging 8c6328c (candidate #80 + #89 + T48 German retreat + T40 first-person arms + T38 combat postures; merge 3c9cab7). The golden of the T47 branch '+
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
  header,routes};
const text=JSON.stringify(report,null,2)+'\n';
if(write){mkdirSync(OUT,{recursive:true});writeFileSync(REPORT,text);}
else assert.equal(readFileSync(REPORT,'utf8'),text,'GOLDEN_AMENDMENT_02.json equals the regenerated report');
