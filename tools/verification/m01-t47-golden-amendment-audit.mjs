// T47 (M01-T47-CKM-LIVE-FIRE-V1) golden AMENDMENT 01. Not invoked by npm test.
//
// The critical review of the first implementation (BEFORE = ab98199, the head published on PR #85 with the first T47 golden) was applied in 1817dee and the commits after it. They change
// src/game/m01-simulation.js, which the T47 golden source-locks (tests/m01-animation-contract.test.js), so the golden moves. The change that can reach a route is one:
//   - a round of the ckm beaten zone that lands within 3 m of one of the two MG34 gunners now suppresses or hits him like any other German (they are only never CHOSEN as the target);
//     BEFORE shielded them. Everything else (a legacy 'disabled' burst plan is dropped at the first tick, the validator checks the flight arc of the eight rounds of a burst, the casemate
//     emitter left mission.json) cannot change a gameplay byte on these routes, and this audit proves it instead of asserting it.
// This is the documented way to move a source-locked golden, in the pattern of tools/verification/m01-german-retreat-golden-audit.mjs (T48 amendment 02):
//   1. BEFORE's simulation source, golden and delta audit are read from git and hashed; the golden and the audit are kept as byte copies (...-before-amendment-01), saved once, never overwritten;
//   2. for both golden routes BEFORE's simulation drives the real route and the current simulation is ticked in lockstep with the very same controls. Every tick the complete gameplay frame
//      (all gameplay bytes: state, nested checkpoint, events) must be byte-identical until the first tick at which a landed ckm round touches an MG34 gunner in the current simulation (a probe
//      records it), where the first difference must appear, and it must be a field of an MG34 gunner. Without any such tick on a route, the whole route must be byte-identical;
//   3. BEFORE's digest on this tree equals its own golden (so the tree, mission.json included, reproduces the old golden with the old source: nothing but the source moved), the 512-tick
//      blocks before the one holding the first difference are the old ones, and the current simulation's own route reproduces the current golden (tests/fixtures/m01-t47-gameplay-baseline.json),
//      which is why this tool runs AFTER `m01-t47-ckm-fire-audit.mjs --write-golden`.
// The JSON is deterministic (no clocks, no paths): re-running it reproduces the committed file. x86_64 only (D11/D30): exact gameplay golden regeneration is never done from aarch64.
//   node tools/verification/m01-t47-golden-amendment-audit.mjs [--write]        (M01_T47_AUDIT_OUT overrides the output folder)
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,join} from 'node:path';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {route} from '../../tests/helpers/m01-route.js';
import {firstDifference} from '../../tests/helpers/m01-determinism.js';
import {GameplayDigest,gameplayFrame} from '../../tests/helpers/m01-animation-contract.js';

const BEFORE_COMMIT='ab98199c7b50a6682a5deef2e461dc83b7737247';   // PR #85 head with the first T47 golden (the implementation before the critical review)
const BEFORE_SOURCE_SHA='0c6e4eb354f7643e416e72a5c077c5bc362873fd8139fcbd6f15bea375ecfe8c';
const BLOCK=512;
const FIXTURES=new URL('../../tests/fixtures/',import.meta.url);
const GOLDEN=fileURLToPath(new URL('m01-t47-gameplay-baseline.json',FIXTURES)),BEFORE_GOLDEN=fileURLToPath(new URL('m01-t47-gameplay-baseline-before-amendment-01.json',FIXTURES));
const OUT=resolve(process.env.M01_T47_AUDIT_OUT??fileURLToPath(new URL('../../docs/verification/m01-runtime/ckm-fire-live-2026-10-16/',import.meta.url)));
const BEFORE_AUDIT=join(OUT,'PREDECESSOR_DELTA_AUDIT_BEFORE_AMENDMENT_01.json'),AUDIT=join(OUT,'PREDECESSOR_DELTA_AUDIT.json'),REPORT=join(OUT,'GOLDEN_AMENDMENT_01.json');
const write=process.argv.includes('--write');
assert.equal(process.arch,'x64','D11/D30: exact gameplay golden regeneration requires x86_64');
const sha=v=>createHash('sha256').update(v).digest('hex');
const git=path=>execFileSync('git',['show',`${BEFORE_COMMIT}:${path}`],{maxBuffer:1<<26});

const baseSource=git('src/game/m01-simulation.js');
assert.equal(sha(baseSource),BEFORE_SOURCE_SHA,'BEFORE source is the one the first T47 golden locks');
// The first golden and its delta audit are byte copies from git, saved once and never overwritten.
const baseGolden=git('tests/fixtures/m01-t47-gameplay-baseline.json'),baseAudit=git('docs/verification/m01-runtime/ckm-fire-live-2026-10-16/PREDECESSOR_DELTA_AUDIT.json');
mkdirSync(OUT,{recursive:true});
for(const [file,bytes] of [[BEFORE_GOLDEN,baseGolden],[BEFORE_AUDIT,baseAudit]]){
  if(!existsSync(file)){assert.ok(write,`${file} does not exist yet: run with --write`);writeFileSync(file,bytes);}
  assert.deepEqual(readFileSync(file),bytes,'the before-amendment copy is byte-identical to the file at BEFORE');
}
const before=JSON.parse(baseGolden),after=JSON.parse(readFileSync(GOLDEN)),beforeAudit=JSON.parse(baseAudit),afterAudit=JSON.parse(readFileSync(AUDIT));
assert.equal(before.sourceSha256,BEFORE_SOURCE_SHA);
assert.equal(before.auditSha256,sha(baseAudit),'the first golden cites exactly the delta audit kept as its copy');
assert.equal(after.auditSha256,sha(readFileSync(AUDIT)),'the current golden cites the committed delta audit');
assert.equal(after.sourceSha256,sha(readFileSync(new URL('../../src/game/m01-simulation.js',import.meta.url))),'the current golden pins the current source');
assert.notEqual(after.sourceSha256,before.sourceSha256);
assert.deepEqual(after.routes.map(r=>[r.seed,r.support]),before.routes.map(r=>[r.seed,r.support]),'the same routes');

// The current simulation, recording the first landed ckm round that touches an MG34 gunner (read-only: it only compares fields before and after the real implementation ran).
class Probe extends M01Simulation{
  ckmImpact(r){
    const gunners=this.enemies.filter(a=>a.weapon==='mg34'),was=gunners.map(a=>({id:a.id,health:a.health,until:a.suppressedUntil}));
    super.ckmImpact(r);
    for(const [i,a] of gunners.entries())if(!this.firstMg34Effect&&(a.health<was[i].health||a.suppressedUntil>was[i].until))
      this.firstMg34Effect={tick:this.tickNo,clock:this.clock,round:r.id,id:a.id,effect:a.health<was[i].health?'hit':'suppressed'};
  }
}
const temp=fileURLToPath(new URL('../../src/game/.m01-t47-amendment-base.js',import.meta.url));
writeFileSync(temp,baseSource);
const report={task:'M01-T47-CKM-LIVE-FIRE-V1',amendment:'amendment-01',beforeCommit:BEFORE_COMMIT,beforeSourceSha256:BEFORE_SOURCE_SHA,
  beforeFixture:'tests/fixtures/m01-t47-gameplay-baseline-before-amendment-01.json',beforeFixtureSha256:sha(baseGolden),
  beforeAudit:'docs/verification/m01-runtime/ckm-fire-live-2026-10-16/PREDECESSOR_DELTA_AUDIT_BEFORE_AMENDMENT_01.json',beforeAuditSha256:sha(baseAudit),
  afterSourceSha256:after.sourceSha256,afterFixtureSha256:sha(readFileSync(GOLDEN)),afterAuditSha256:after.auditSha256,
  change:'A round of the ckm beaten zone that lands within 3 m of one of the two MG34 gunners suppresses or hits him like any other German (they are still never chosen as the target); BEFORE shielded them.',
  rule:'Per-tick gameplay frames (state, nested checkpoint, events; presentation fields removed as in the golden) are byte-identical until the first tick at which a landed ckm round touches an MG34 gunner, where the first difference is a field of that MG34 gunner; on a route where none does, every tick of the route is byte-identical. The old simulation on this tree reproduces the first golden, so nothing but the source moved.',
  routes:[]};
try{
  const {M01Simulation:Before}=await import(pathToFileURL(temp));
  for(const [index,{seed,support,ticks,blocks}] of before.routes.entries()){
    const candidate=new Probe(seed),oldDigest=new GameplayDigest();
    assert.deepEqual(gameplayFrame(candidate),gameplayFrame(new Before(seed)),'the two simulations start identical');
    let tick=0,identical=0,divergence=null;
    route(seed,{support,Simulation:Before,onStep:({sim,controls,events,dt})=>{
      tick++;const a=gameplayFrame(sim,events);oldDigest.add(a);
      candidate.tickNo=tick;candidate.tick(dt,structuredClone(controls));const b=gameplayFrame(candidate,candidate.drainEvents());
      if(divergence)return;
      if(JSON.stringify(a)===JSON.stringify(b)){identical++;return;}
      const difference=firstDifference(a,b),actor=candidate.actors[Number(/\.actors\.(\d+)\./.exec(difference.path)?.[1])];
      divergence={tick,clock:sim.clock,battleClock:sim.battleClock,difference,actor:actor?.id??null,weapon:actor?.weapon??null};
    }});
    // (3) BEFORE on this tree reproduces its own golden.
    assert.deepEqual(oldDigest.finish(),{ticks,blocks},'BEFORE reproduces the first golden for this route on this tree');
    // (2) where the two parted, and why.
    const effect=candidate.firstMg34Effect??null;
    if(effect){
      assert.ok(divergence,'a landed ckm round touched an MG34 gunner, so the two simulations must part');
      assert.equal(divergence.tick,effect.tick,'they part exactly at the first landed ckm round that touches an MG34 gunner');
      assert.equal(divergence.weapon,'mg34','the first differing field belongs to an MG34 gunner');
      assert.equal(divergence.actor,effect.id,'and it is the gunner that round touched');
      assert.equal(identical,divergence.tick-1,'every tick before it is byte-identical');
    }else{
      assert.equal(divergence,null,'no landed ckm round touched an MG34 gunner: the whole route is byte-identical');
      assert.equal(identical,tick);
    }
    // The current simulation's own route reproduces the current golden, and keeps BEFORE's blocks until the block that holds the first difference.
    const next=new GameplayDigest(),mine=route(seed,{support,onStep:({sim,events})=>next.add(gameplayFrame(sim,events))}),own=next.finish();
    assert.deepEqual(own,{ticks:after.routes[index].ticks,blocks:after.routes[index].blocks},'the current simulation reproduces the current golden');
    const oldBlocks=blocks,first=divergence?Math.ceil(divergence.tick/BLOCK)-1:own.blocks.length;
    for(let i=0;i<first;i++)assert.deepEqual(own.blocks[i],oldBlocks[i],`block ${i} (ticks up to ${(i+1)*BLOCK}) precedes the first difference and equals the first golden`);
    if(divergence)assert.notEqual(own.blocks[first].sha256,oldBlocks[first].sha256,'the block holding the first difference differs');
    else assert.deepEqual(own,{ticks,blocks},'nothing moved on this route');
    const liveOf=audit=>{const row=audit.routes[index];return {bursts:row.live.bursts,roundsIssued:row.live.roundsIssued,hits:row.live.hits,kills:row.live.kills,menHit:row.live.men.hit,menSuppressed:row.live.men.suppressed,
      suppressionEvents:row.live.suppressionEvents,repairPins:row.summaries.live.repairPins,repairCompleteSec:row.endStateAgainstPredecessorOwnRoute.repairCompleteSec.live};};
    report.routes.push({seed,support,firstMg34Effect:effect,firstDivergenceTick:divergence?.tick??null,identicalTicksBeforeIt:identical,firstDifferencePath:divergence?.difference.path??null,
      firstDifferenceActor:divergence?.actor??null,firstDifferenceWeapon:divergence?.weapon??null,identicalBlocks:first,firstDifferingBlockTick:divergence?own.blocks[first].tick:null,
      oldTicks:ticks,newTicks:own.ticks,oldBlocks:oldBlocks.length,newBlocks:own.blocks.length,complete:mine.sim.mission.complete,checkpoints:mine.sim.checkpointsReached,
      liveBefore:liveOf(beforeAudit),liveAfter:liveOf(afterAudit)});
    console.log(JSON.stringify(report.routes.at(-1)));
  }
}finally{unlinkSync(temp);}
const text=JSON.stringify(report,null,2)+'\n';
if(write){mkdirSync(OUT,{recursive:true});writeFileSync(REPORT,text);}
else assert.equal(readFileSync(REPORT,'utf8'),text,'GOLDEN_AMENDMENT_01.json equals the regenerated report');
