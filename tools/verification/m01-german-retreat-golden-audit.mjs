// T48 (M01-GERMAN-RETREAT-AND-REGROUP-V1) golden AMENDMENT 03: the retreat over the T38 staging. Not invoked by npm test.
//
// History. Amendment 02 (GOLDEN_AMENDMENT_02.json, tests/fixtures/m01-partials-gameplay-baseline.json and its kept pre-change copy ...-before-amendment-02.json)
// moved the partials golden when the German withdrawal changed gameplay data from the east demolition on, on top of the candidate #80 (813f163); this tool
// produced it by the lockstep below. The T38 staging (combat postures and places, PR #82) was then merged into the same branch (merge f02e06b). From that
// merge the per-tick golden of the combined simulation is tests/fixtures/m01-t38-gameplay-baseline.json, written by
// tools/verification/m01-combat-posture-staging-audit.mjs (its amendment 02, after its invariant audit); the partials golden stays what it was, the
// golden of the candidate #80 + #89 + T48, kept as history and pinned by tests/m01-animation-contract.test.js.
// This tool now gives the CAUSAL proof of what the merge changes in that golden, in the pattern of amendment 02:
//   1. the pre-merge source (BASE, the T38 head 65145c9) is read from git, hashed and compared with the T38 golden it pins; the golden of BASE is compared with
//      the pre-change fixture tests/fixtures/m01-t38-gameplay-baseline-before-amendment-02.json (a byte copy of the golden as it was at BASE, kept once);
//   2. for both golden routes the BASE simulation drives the real route and the candidate (this tree) is ticked in lockstep with the very same controls; every
//      tick the complete gameplay frame (all gameplay bytes: state, nested checkpoint, events) must be byte-identical until the first tick at or after
//      the east demolition, where the first difference must appear, and it must be a German (de_spans_*) actor field; with those actors removed from
//      both frames the lockstep stays byte-identical to the end of the route (the change is confined to them);
//   3. the BASE digest blocks must equal the pre-change fixture (the old code still reproduces the old golden), and the candidate's own route must equal the
//      committed T38 golden route (verified, never written here); its 512-tick blocks before the one holding the east demolition tick equal the old ones.
// With --write-golden it saves the pre-change fixture once if the T38 audit tool has not (never overwriting an existing one) and writes GOLDEN_AMENDMENT_03.json;
// without it the committed record must equal the regenerated one. The record is deterministic (no clocks, no paths), so re-running it must reproduce the committed
// file. The T38 audit tool runs first: it is the only writer of the T38 golden.
// x86_64 only (D11/D30): exact gameplay golden regeneration is never done from aarch64.
//
// Since the merge of T47 (3c9cab7) the live tree is the staging PLUS the live fire of the ckm, which changes Germans long before the east demolition, so this proof can no longer
// be run on the live tree and it is not repeated there: it is bound to the tree it was made on, the staging 8c6328c, and it is re-run FROM GIT. The candidate (simulation and its
// data) is extracted with `git archive` (as tools/verification/m01-t47-ckm-fire-audit.mjs extracts its predecessor), the golden it must reproduce is the T38 golden of amendment 02,
// tests/fixtures/m01-t38-gameplay-baseline.json, which stays what it was as history, and the record GOLDEN_AMENDMENT_03.json must come out byte for byte: the history stays reproducible. What the retreat does inside the combined tree with T47 is covered by
// tests/m01-german-retreat.test.js, which drives the live simulation; the T47 part of the live golden is accounted for by tools/verification/m01-t47-ckm-fire-audit.mjs.
//   node tools/verification/m01-german-retreat-golden-audit.mjs [--write-golden]        (M01_GERMAN_RETREAT_AUDIT_OUT overrides the output folder)
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,existsSync,symlinkSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {route} from '../../tests/helpers/m01-route.js';
import {firstDifference} from '../../tests/helpers/m01-determinism.js';
import {GameplayDigest,gameplayFrame} from '../../tests/helpers/m01-animation-contract.js';

const BASE='65145c905209d47da6931aad11c0beeebe597291';   // the T38 head before the merge f02e06b: the simulation without the T48 retreat
const CANDIDATE='8c6328c947e92041f237b5990142dd110aee8e71';   // the staging (T38 + T48 + T40 on the candidate #80 + #89): the simulation whose golden this proof is about
const BEFORE_SOURCE_SHA='344a932f82a21bc4efe138968193a999f1d0efc17eceffea5ceb9a3d09a933a0';
const FIXTURES=new URL('../../tests/fixtures/',import.meta.url);
const GOLDEN=new URL('m01-t38-gameplay-baseline.json',FIXTURES),BEFORE=new URL('m01-t38-gameplay-baseline-before-amendment-02.json',FIXTURES);   // GOLDEN: the T38 golden of amendment 02 (history)
const HERE=new URL('../../docs/verification/m01-runtime/german-retreat-regroup-v1/',import.meta.url);
const OUT=process.env.M01_GERMAN_RETREAT_AUDIT_OUT??fileURLToPath(HERE);
const DEMOLITION='evt_m01_east_demolition',BLOCK=512;
const write=process.argv.includes('--write-golden');
assert.equal(process.arch,'x64','D11/D30: exact gameplay golden regeneration requires x86_64');
const sha=v=>createHash('sha256').update(v).digest('hex');

const baseSource=execFileSync('git',['show',BASE+':src/game/m01-simulation.js'],{encoding:'utf8',maxBuffer:1<<26});
assert.equal(sha(baseSource),BEFORE_SOURCE_SHA,'BASE source is the one the pre-change golden locks');
// The pre-change fixture is a byte copy of the golden as it was at BASE. Saved once, from git, never overwritten.
const baseGolden=execFileSync('git',['show',BASE+':tests/fixtures/m01-t38-gameplay-baseline.json'],{maxBuffer:1<<26});
if(!existsSync(BEFORE)){assert.ok(write,'the pre-change fixture does not exist yet: run with --write-golden');writeFileSync(BEFORE,baseGolden);}
assert.deepEqual(readFileSync(BEFORE),baseGolden,'the pre-change fixture is byte-identical to the golden at BASE');
const before=JSON.parse(baseGolden);
assert.equal(before.sourceSha256,BEFORE_SOURCE_SHA);
// The candidate is the staging, extracted from git with its own data; its golden is the T38 golden of amendment 02 (history, only verified here).
const goldenBytes=readFileSync(GOLDEN),golden=JSON.parse(goldenBytes);
const tree=mkdtempSync(join(tmpdir(),'m01-german-retreat-candidate-'));
{
  const data=execFileSync('git',['ls-tree','-r','--name-only',CANDIDATE,'assets','research'],{encoding:'utf8',maxBuffer:1<<26}).split('\n').filter(p=>p.endsWith('.json'));
  execFileSync('tar',['-x','-C',tree],{input:execFileSync('git',['archive','--format=tar',CANDIDATE,'src','missions',...data],{maxBuffer:1<<29})});
  symlinkSync(fileURLToPath(new URL('../../node_modules',import.meta.url)),join(tree,'node_modules'));
}
const candidateSource=sha(readFileSync(join(tree,'src/game/m01-simulation.js')));
assert.equal(golden.sourceSha256,candidateSource,'the T38 golden of amendment 02 pins the simulation of the staging');
const {M01Simulation}=await import(pathToFileURL(join(tree,'src/game/m01-simulation.js')));
assert.equal(golden.routes.length,before.routes.length);
// The east demolition ticks recorded by amendment 02 on the candidate #80, for the record of what the merge moved.
const previous=JSON.parse(readFileSync(new URL('GOLDEN_AMENDMENT_02.json',HERE),'utf8'));

const temp=join(tree,'src/game/.m01-german-retreat-base.js');   // BASE's source next to the candidate's data, as before (the data is the staging's)
writeFileSync(temp,baseSource);
const report={task:'M01-GERMAN-RETREAT-AND-REGROUP-V1',amendment:'amendment-03',base:BASE,beforeSourceSha256:BEFORE_SOURCE_SHA,
  beforeFixture:'tests/fixtures/m01-t38-gameplay-baseline-before-amendment-02.json',beforeFixtureSha256:sha(baseGolden),
  afterFixture:'tests/fixtures/m01-t38-gameplay-baseline.json',afterFixtureSha256:sha(goldenBytes),afterSourceSha256:candidateSource,
  reason:'The T48 German retreat (candidate #80 + #89 + T48, amendment 02) and the T38 staging (combat postures and places) were merged into one branch (f02e06b). The golden of the combined simulation is the T38 golden (tools/verification/m01-combat-posture-staging-audit.mjs, its amendment 02); this record is the causal proof of what the retreat changes in it: the T38 simulation (BASE) and the combined one are byte-identical until the east demolition tick and differ only in the Germans of the spans after it. The east demolition happens at other ticks than on the candidate #80 alone (previousEastDemolitionTicks) because the T38 places and postures change the course of the shooting before it; that is T38, not the retreat.',
  rule:'Per-tick gameplay frames (state, nested checkpoint, events; presentation fields removed as in the golden) are byte-identical until the east demolition tick, where the first difference is a grp_de_spans actor field; with the grp_de_spans actors removed from both frames every tick of the whole route is byte-identical (confinedTicks equals the route length).',
  previousEastDemolitionTicks:Object.fromEntries(previous.routes.map(r=>[`${r.seed}/${r.support}`,r.eastDemolitionTick])),routes:[]};
try{
  const {M01Simulation:Before}=await import(pathToFileURL(temp));
  for(const [index,{seed,support,ticks,blocks}] of before.routes.entries()){
    // (2) BASE drives the route; the candidate follows with the same controls until the first difference.
    const candidate=new M01Simulation(seed),oldDigest=new GameplayDigest();
    assert.deepEqual(gameplayFrame(candidate),gameplayFrame(new Before(seed)),'the two simulations start identical');
    // The same lockstep continues to the end of the route with the Germans of the spans (grp_de_spans, the only actors T48 moves) removed from both
    // frames: it proves the change is confined to them (player, RNG, clocks, rounds, events, every other actor and the nested checkpoint stay identical).
    const spansOnly=frame=>{const f=JSON.parse(JSON.stringify(frame));for(const s of [f.state,f.checkpoint])s.actors=s.actors.filter(a=>a.group!=='grp_de_spans'&&!/^de_spans_/.test(a.id));return JSON.stringify(f);};
    const differing=new Set();
    let tick=0,identical=0,divergence=null,demolitionTick=null,confined=0,leak=null;
    route(seed,{support,Simulation:Before,onStep:({sim,controls,events,dt})=>{
      tick++;const a=gameplayFrame(sim,events);oldDigest.add(a);
      if(demolitionTick===null&&sim.consumedEvent(DEMOLITION))demolitionTick=tick;
      candidate.tick(dt,controls);const b=gameplayFrame(candidate,candidate.drainEvents());
      if(JSON.stringify(a)===JSON.stringify(b)){if(!divergence)identical++;confined++;return;}
      if(!divergence){const difference=firstDifference(a,b);divergence={tick,difference,actor:candidate.actors[Number(/\.actors\.(\d+)\./.exec(difference.path)?.[1])]?.id??null};}
      a.state.actors.forEach((x,i)=>{if(JSON.stringify(x)!==JSON.stringify(b.state.actors[i]))differing.add(x.id);});
      if(leak)return;
      if(spansOnly(a)===spansOnly(b))confined++;else leak={tick,clock:sim.clock,battleClock:sim.battleClock};
    }});
    assert.ok(demolitionTick,'the BASE route reaches the east demolition');
    assert.ok(divergence,'the candidate must differ from BASE after the east demolition');
    assert.equal(divergence.tick,demolitionTick,'the first difference is the tick of the east demolition itself');
    assert.equal(identical,demolitionTick-1,'every tick before the east demolition is byte-identical');
    assert.match(divergence.actor??'',/^de_spans_\d$/,'the first differing field belongs to a German of the spans');
    assert.equal(leak,null,'outside the Germans of the spans every tick of the whole route is identical');
    assert.equal(confined,tick,'so all ticks are confined');
    assert.ok([...differing].every(id=>/^de_spans_\d$/.test(id)),`only Germans of the spans differ: ${[...differing]}`);
    const oldFinal=oldDigest.finish();
    assert.deepEqual(oldFinal,{ticks,blocks},'BASE reproduces the pre-change golden for this route');
    // (3) The candidate's own route, as tests/m01-animation-contract.test.js runs it.
    const newDigest=new GameplayDigest();let newDemolition=null,n=0;
    const result=route(seed,{support,Simulation:M01Simulation,onStep:({sim,events})=>{n++;newDigest.add(gameplayFrame(sim,events));if(newDemolition===null&&sim.consumedEvent(DEMOLITION))newDemolition=n;}});
    const next=newDigest.finish();
    assert.equal(newDemolition,demolitionTick,'the east demolition happens on the same tick in the candidate');
    const first=Math.ceil(demolitionTick/BLOCK)-1;   // index of the 512-tick block holding the east demolition tick
    for(let i=0;i<first;i++)assert.deepEqual(next.blocks[i],oldFinal.blocks[i],`block ${i} (ticks up to ${(i+1)*BLOCK}) precedes the east demolition and must equal the old golden`);
    assert.equal(next.blocks[first].tick,oldFinal.blocks[first].tick);
    assert.notEqual(next.blocks[first].sha256,oldFinal.blocks[first].sha256,'the block holding the east demolition tick differs');
    const committed=golden.routes[index];
    assert.deepEqual([committed.seed,committed.support],[seed,support]);
    assert.deepEqual({ticks:committed.ticks,blocks:committed.blocks},next,'the T38 golden of amendment 02 is the digest of the staging\'s own route');
    report.routes.push({seed,support,eastDemolitionTick:demolitionTick,identicalTicksBeforeIt:identical,firstDivergenceTick:divergence.tick,
      firstDifferencePath:divergence.difference.path,firstDifferenceActor:divergence.actor,differingActors:[...differing].sort(),confinedTicks:confined,identicalBlocks:first,
      firstDifferingBlockTick:next.blocks[first].tick,oldTicks:oldFinal.ticks,newTicks:next.ticks,oldBlocks:oldFinal.blocks.length,newBlocks:next.blocks.length,
      complete:result.sim.mission.complete,checkpoints:result.sim.checkpointsReached});
    console.log(JSON.stringify(report.routes.at(-1)));
  }
}finally{unlinkSync(temp);}
if(write){mkdirSync(OUT,{recursive:true});writeFileSync(OUT+'/GOLDEN_AMENDMENT_03.json',JSON.stringify(report,null,2)+'\n');}
else assert.deepEqual(JSON.parse(readFileSync(new URL('GOLDEN_AMENDMENT_03.json',HERE),'utf8')),report,'the committed GOLDEN_AMENDMENT_03.json equals the regenerated record');
