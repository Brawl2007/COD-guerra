// T48 (M01-GERMAN-RETREAT-AND-REGROUP-V1) golden AMENDMENT 02. Not invoked by npm test.
//
// The German withdrawal changes gameplay data from the east demolition on, so the per-tick golden has to move (src/game/m01-simulation.js is source-locked by
// tests/m01-animation-contract.test.js). This audit is the documented way, in the pattern of amendment 01:
//   1. the pre-change source (BASE, the candidate head before T48) is read from git, hashed and compared with the pre-change fixture
//      tests/fixtures/m01-partials-gameplay-baseline-before-amendment-02.json (a byte copy of the fixture as it was at BASE);
//   2. for both golden routes the BASE simulation drives the real route and the candidate is ticked in lockstep with the very same controls; every tick
//      the complete gameplay frame (all gameplay bytes: state, nested checkpoint, events) must be byte-identical until the first tick at or after
//      the east demolition, where the first difference must appear, and it must be a German (de_spans_*) actor field; with those actors removed from
//      both frames the lockstep stays byte-identical to the end of the route (the change is confined to them);
//   3. the BASE digest blocks must equal the pre-change fixture (the old code still reproduces the old golden) and the candidate's own route yields the
//      new blocks, whose 512-tick blocks before the one holding the east demolition tick must equal the old ones.
// With --write-golden it saves the pre-change fixture once (never overwriting an existing one) and writes the new fixture; without it the new fixture must
// already equal the regenerated one. The audit JSON is deterministic (no clocks, no paths), so re-running it must reproduce the committed file.
// x86_64 only (D11/D30): exact gameplay golden regeneration is never done from aarch64.
//   node tools/verification/m01-german-retreat-golden-audit.mjs [--write-golden]        (M01_GERMAN_RETREAT_AUDIT_OUT overrides the output folder)
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {route} from '../../tests/helpers/m01-route.js';
import {firstDifference} from '../../tests/helpers/m01-determinism.js';
import {GameplayDigest,gameplayFrame} from '../../tests/helpers/m01-animation-contract.js';

const BASE='813f163deceb551e0e4504b30958580cb67d3a76';   // PR #80 head, the candidate before T48
const BEFORE_SOURCE_SHA='00964436e079373887ca89c2128e8aa7f81a7f4ee9522c63b070f0e14f833f2a';
const FIXTURES=new URL('../../tests/fixtures/',import.meta.url);
const GOLDEN=new URL('m01-partials-gameplay-baseline.json',FIXTURES),BEFORE=new URL('m01-partials-gameplay-baseline-before-amendment-02.json',FIXTURES);
const OUT=process.env.M01_GERMAN_RETREAT_AUDIT_OUT??fileURLToPath(new URL('../../docs/verification/m01-runtime/german-retreat-regroup-v1/',import.meta.url));
const DEMOLITION='evt_m01_east_demolition',BLOCK=512;
const write=process.argv.includes('--write-golden');
assert.equal(process.arch,'x64','D11/D30: exact gameplay golden regeneration requires x86_64');
const sha=v=>createHash('sha256').update(v).digest('hex');

const baseSource=execFileSync('git',['show',BASE+':src/game/m01-simulation.js'],{encoding:'utf8',maxBuffer:1<<26});
assert.equal(sha(baseSource),BEFORE_SOURCE_SHA,'BASE source is the one the pre-change golden locks');
// The pre-change fixture is a byte copy of the golden as it was at BASE. Saved once, from git, never overwritten.
const baseGolden=execFileSync('git',['show',BASE+':tests/fixtures/m01-partials-gameplay-baseline.json'],{maxBuffer:1<<26});
if(!existsSync(BEFORE)){assert.ok(write,'the pre-change fixture does not exist yet: run with --write-golden');writeFileSync(BEFORE,baseGolden);}
assert.deepEqual(readFileSync(BEFORE),baseGolden,'the pre-change fixture is byte-identical to the golden at BASE');
const before=JSON.parse(baseGolden);
assert.equal(before.sourceSha256,BEFORE_SOURCE_SHA);

const temp=fileURLToPath(new URL('../../src/game/.m01-german-retreat-base.js',import.meta.url));
writeFileSync(temp,baseSource);
const report={task:'M01-GERMAN-RETREAT-AND-REGROUP-V1',amendment:'amendment-02',base:BASE,beforeSourceSha256:BEFORE_SOURCE_SHA,
  beforeFixture:'tests/fixtures/m01-partials-gameplay-baseline-before-amendment-02.json',beforeFixtureSha256:sha(baseGolden),
  rule:'Per-tick gameplay frames (state, nested checkpoint, events; presentation fields removed as in the golden) are byte-identical until the east demolition tick, where the first difference is a grp_de_spans actor field; with the grp_de_spans actors removed from both frames every tick of the whole route is byte-identical (confinedTicks equals the route length).',routes:[]};
const golden={...before,sourceSha256:sha(readFileSync(new URL('../../src/game/m01-simulation.js',import.meta.url))),routes:[]};
try{
  const {M01Simulation:Before}=await import(pathToFileURL(temp));
  for(const {seed,support,ticks,blocks} of before.routes){
    // (2) BASE drives the route; the candidate follows with the same controls until the first difference.
    const candidate=new M01Simulation(seed),oldDigest=new GameplayDigest();
    assert.deepEqual(gameplayFrame(candidate),gameplayFrame(new Before(seed)),'the two simulations start identical');
    // The same lockstep continues to the end of the route with the Germans of the spans (grp_de_spans, the only actors T48 moves) removed from both
    // frames: it proves the change is confined to them (player, RNG, clocks, rounds, events, every other actor and the nested checkpoint stay identical).
    const spansOnly=frame=>{const f=JSON.parse(JSON.stringify(frame));for(const s of [f.state,f.checkpoint])s.actors=s.actors.filter(a=>a.group!=='grp_de_spans'&&!/^de_spans_/.test(a.id));return JSON.stringify(f);};
    let tick=0,identical=0,divergence=null,demolitionTick=null,confined=0,leak=null;
    route(seed,{support,Simulation:Before,onStep:({sim,controls,events,dt})=>{
      tick++;const a=gameplayFrame(sim,events);oldDigest.add(a);
      if(demolitionTick===null&&sim.consumedEvent(DEMOLITION))demolitionTick=tick;
      candidate.tick(dt,controls);const b=gameplayFrame(candidate,candidate.drainEvents());
      if(JSON.stringify(a)===JSON.stringify(b)){if(!divergence)identical++;confined++;return;}
      if(!divergence){const difference=firstDifference(a,b);divergence={tick,difference,actor:candidate.actors[Number(/\.actors\.(\d+)\./.exec(difference.path)?.[1])]?.id??null};}
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
    const oldFinal=oldDigest.finish();
    assert.deepEqual(oldFinal,{ticks,blocks},'BASE reproduces the pre-change golden for this route');
    // (3) The candidate's own route, as tests/m01-animation-contract.test.js runs it.
    const newDigest=new GameplayDigest();let newDemolition=null,n=0;
    const result=route(seed,{support,onStep:({sim,events})=>{n++;newDigest.add(gameplayFrame(sim,events));if(newDemolition===null&&sim.consumedEvent(DEMOLITION))newDemolition=n;}});
    const next=newDigest.finish();
    assert.equal(newDemolition,demolitionTick,'the east demolition happens on the same tick in the candidate');
    const first=Math.ceil(demolitionTick/BLOCK)-1;   // index of the 512-tick block holding the east demolition tick
    for(let i=0;i<first;i++)assert.deepEqual(next.blocks[i],oldFinal.blocks[i],`block ${i} (ticks up to ${(i+1)*BLOCK}) precedes the east demolition and must equal the old golden`);
    assert.equal(next.blocks[first].tick,oldFinal.blocks[first].tick);
    assert.notEqual(next.blocks[first].sha256,oldFinal.blocks[first].sha256,'the block holding the east demolition tick differs');
    golden.routes.push({seed,support,...next});
    report.routes.push({seed,support,eastDemolitionTick:demolitionTick,identicalTicksBeforeIt:identical,firstDivergenceTick:divergence.tick,
      firstDifferencePath:divergence.difference.path,firstDifferenceActor:divergence.actor,confinedTicks:confined,identicalBlocks:first,firstDifferingBlockTick:next.blocks[first].tick,
      oldTicks:oldFinal.ticks,newTicks:next.ticks,oldBlocks:oldFinal.blocks.length,newBlocks:next.blocks.length,
      complete:result.sim.mission.complete,checkpoints:result.sim.checkpointsReached});
    console.log(JSON.stringify(report.routes.at(-1)));
  }
}finally{unlinkSync(temp);}
golden.amendment02={task:report.task,base:BASE,beforeFixture:'m01-partials-gameplay-baseline-before-amendment-02.json',
  eastDemolitionTicks:Object.fromEntries(report.routes.map(r=>[`${r.seed}/${r.support}`,r.eastDemolitionTick])),
  audit:'docs/verification/m01-runtime/german-retreat-regroup-v1/GOLDEN_AMENDMENT_02.json'};
mkdirSync(OUT,{recursive:true});
writeFileSync(OUT+'/GOLDEN_AMENDMENT_02.json',JSON.stringify(report,null,2)+'\n');
if(write)writeFileSync(GOLDEN,JSON.stringify(golden,null,2)+'\n');
else assert.deepEqual(JSON.parse(readFileSync(GOLDEN)),golden,'tests/fixtures/m01-partials-gameplay-baseline.json equals the regenerated golden');
