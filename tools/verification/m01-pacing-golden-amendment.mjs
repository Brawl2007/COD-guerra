// P2 pacing (M01-P2-PACING-V1) golden AMENDMENT 04 of tests/fixtures/m01-t47-gameplay-baseline.json. Not invoked by npm test.
//
// The owner's playtest (2026-10-18, P2: dead time, forced wait for 06:00, unclear objectives) changed the mission flow by design: the battle clock is compressed once the
// player has done what a stretch needs (mission.json clock.segments[].compress), the west charge waits for Bąk to be out of the zone instead of at the station, continuity
// cues speak only with their objective active and 20 real seconds apart, and the objective panel/status lines changed (src/game/m01-pacing.js). So the per-tick golden moves.
// The T47 per-tick delta audit (m01-t47-ckm-fire-audit.mjs) cannot regenerate it: it proves "predecessor == candidate apart from the T47 named deltas", and a different clock
// is not one of them. This tool is the account of the move, in the style of m01-t47-golden-amendment-audit.mjs:
//   1. the golden of BEFORE (f6913a0, the M01 candidate this branch starts from) is read from git and kept byte for byte as ...-before-amendment-04.json (saved once);
//   2. BEFORE's simulation, extracted from git with its own data, drives each golden route through the live test pilot: its digest must equal the kept golden (the pilot did
//      not change); the live simulation runs the same route and its digest is the new golden;
//   3. the invariants, per route, BEFORE against live: the same 12 objective end states, the same four checkpoints in order, the same consumed event ids, the same flags
//      (survivors, Bąk, Dudek, Nowicki, forward post, completion), the same final battle clock 07:05:00, and every event with a battle-clock trigger fires at a battle clock
//      >= its historical time (non-gated ones within one tick: 0.05 s x 30). Any failure stops the tool: no golden is written;
//   4. the record: first differing tick (path), first tick where the battle clock and the main RNG part, real seconds to 06:00 and to the end, and the real-clock shift of
//      every consumed event.
// Deterministic JSON (no clocks, no paths). x86_64 only (D11/D30).
//   node tools/verification/m01-pacing-golden-amendment.mjs [--write]
// Without --write nothing is written: the kept copy, the golden and GOLDEN_AMENDMENT_04.json must equal what is regenerated.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,mkdtempSync,symlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {resolve,join} from 'node:path';
import {route} from '../../tests/helpers/m01-route.js';
import {GameplayDigest,gameplayFrame} from '../../tests/helpers/m01-animation-contract.js';
import {M01Simulation as Live,clockText,seconds} from '../../src/game/m01-simulation.js';

const ROOT=resolve(import.meta.dirname,'../..');
const BEFORE_COMMIT='f6913a0dae3ae227ab0421c6b59f992e8685e9a6';
const GOLDEN_PATH='tests/fixtures/m01-t47-gameplay-baseline.json',KEPT_PATH='tests/fixtures/m01-t47-gameplay-baseline-before-amendment-04.json';
const EVIDENCE='docs/verification/m01-runtime/pacing-p2-2026-10-18',REPORT=join(ROOT,EVIDENCE,'GOLDEN_AMENDMENT_04.json');
const INPUTS=['src/game/m01-simulation.js','src/game/m01-pacing.js','missions/m01-tczew/mission.json','missions/m01-tczew/map-layout.json','src/game/m01-animation-presentation.js',
  'src/game/m01-aim.js','src/game/m01-fire.js','src/game/m01-display-fire.js','src/game/m01-yard-life.js','src/world/spatial.js','src/world/tczew-world.js'];
const write=process.argv.includes('--write');
assert.equal(process.arch,'x64','D11/D30: exact gameplay golden regeneration requires x86_64');
const sha=v=>createHash('sha256').update(v).digest('hex');
const git=(...args)=>execFileSync('git',['-C',ROOT,...args],{maxBuffer:1<<29});
const fullBefore=git('rev-parse',BEFORE_COMMIT).toString().trim();assert.equal(fullBefore,BEFORE_COMMIT);

// 1. The replaced golden, kept byte for byte.
const oldGolden=git('show',`${BEFORE_COMMIT}:${GOLDEN_PATH}`),kept=join(ROOT,KEPT_PATH);
if(!existsSync(kept)){assert.ok(write,`${KEPT_PATH} does not exist yet: run with --write`);writeFileSync(kept,oldGolden);}
assert.deepEqual(readFileSync(kept),oldGolden,'the before-amendment copy is byte-identical to the golden at BEFORE');
const before=JSON.parse(oldGolden);

// 2. BEFORE's simulation from git (its own data), and the runs.
const tree=mkdtempSync(join(tmpdir(),'m01-p2-before-'));
const data=git('ls-tree','-r','--name-only',BEFORE_COMMIT,'assets','research').toString().split('\n').filter(p=>p.endsWith('.json'));
execFileSync('tar',['-x','-C',tree],{input:git('archive','--format=tar',BEFORE_COMMIT,'src','missions',...data)});symlinkSync(join(ROOT,'node_modules'),join(tree,'node_modules'));
assert.equal(sha(readFileSync(join(tree,'src/game/m01-simulation.js'))),before.sourceSha256,'the extracted tree carries the simulation the kept golden pins');
const {M01Simulation:Before}=await import(pathToFileURL(join(tree,'src/game/m01-simulation.js')));
const definition=JSON.parse(readFileSync(join(ROOT,'missions/m01-tczew/mission.json'),'utf8'));

function firstDiff(a,b,path='$'){
  if(a===b||(Number.isNaN(a)&&Number.isNaN(b)))return null;
  if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)])){const d=firstDiff(a[k],b[k],`${path}.${k}`);if(d)return d;}return null;}
  return path;
}
// Per-tick frame hashes (whole frames would not fit in memory); `capture` keeps the frame of one tick for the first-difference path.
function run(Simulation,seed,support,capture=null){
  const digest=new GameplayDigest(),frames=[],fired={},sig=[];let at0600=null,captured=null;
  const result=route(seed,{support,Simulation,onStep:({sim,events})=>{
    const frame=gameplayFrame(sim,events);digest.add(frame);frames.push(sha(JSON.stringify(frame)));if(frames.length===capture)captured=frame;
    sig.push([sim.battleClock,sim.rng.state,sim.clock]);
    for(const id of Object.keys(sim.consumed))fired[id]??={battle:sim.battleClock,real:+sim.clock.toFixed(2)};
    if(at0600===null&&sim.battleClock>=seconds('06:00:00'))at0600=+sim.clock.toFixed(2);
  }});
  const s=result.sim;
  return {digest:digest.finish(),frames,captured,fired,sig,at0600,end:{real:+s.clock.toFixed(2),battleClock:s.battleClock,complete:s.mission.complete,
    objectives:Object.fromEntries(Object.entries(s.objectives).map(([id,o])=>[id,o.state])),checkpoints:[...s.checkpointsReached],consumed:Object.keys(s.consumed).sort(),flags:{...s.flags}}};
}

const routes=[];
for(const [index,{seed,support,ticks,blocks}] of before.routes.entries()){
  const old=run(Before,seed,support);
  let firstTick=null;const probe=run(Live,seed,support);for(let i=0;i<Math.min(old.frames.length,probe.frames.length);i++)if(old.frames[i]!==probe.frames[i]){firstTick=i+1;break;}
  const now=firstTick?run(Live,seed,support,firstTick):probe,oldFrame=firstTick?run(Before,seed,support,firstTick).captured:null;
  assert.deepEqual(now.digest,probe.digest,'the live simulation is deterministic');
  assert.deepEqual(old.digest,{ticks,blocks},'BEFORE reproduces the kept golden for this route on this tree (the pilot did not change)');
  // 3. Invariants.
  assert.equal(now.end.complete,true);assert.equal(now.end.battleClock,seconds('07:05:00'));assert.equal(now.end.battleClock,old.end.battleClock);
  assert.equal(Object.keys(now.end.objectives).length,12);assert.deepEqual(now.end.objectives,old.end.objectives,'the same 12 objective end states');
  assert.deepEqual(now.end.checkpoints,old.end.checkpoints,'CP-A..D in order');assert.equal(now.end.checkpoints.length,4);
  assert.deepEqual(now.end.consumed,old.end.consumed,'the same consumed events');
  // m01.suggested_cover is the last of the rotating "mude de cobertura" hints (one per real salvo, 42 s of exposure): a shorter hold has fewer salvos. Not a plot flag; recorded.
  const plot=f=>Object.fromEntries(Object.entries(f).filter(([k])=>k!=='m01.suggested_cover'));
  assert.deepEqual(plot(now.end.flags),plot(old.end.flags),'the same flags: survivors, Bąk, Dudek, Nowicki, forward post, raid, completion');
  const clockEvents=[];
  for(const e of definition.events){
    const t=[e.trigger,...(e.trigger.of??[])].find(t=>t.type==='battleClock');if(!t)continue;
    const at=seconds(t.at),seg=definition.clock.segments.find(s=>at>=seconds(s.from)&&at<seconds(s.to)),n=now.fired[e.id],o=old.fired[e.id];
    assert.ok(n&&o,`${e.id} fired on both sides`);
    if(!seg?.jump){assert.ok(n.battle>=at-1e-6,`${e.id} never before ${t.at}`);
      if(e.trigger.type==='battleClock'&&!e.trigger.gate)assert.ok(n.battle-at<=1.5+1e-6,`${e.id} at ${t.at} (fired ${clockText(n.battle)})`);}
    clockEvents.push({id:e.id,at:t.at,battleBefore:clockText(o.battle),battleAfter:clockText(n.battle),realBefore:o.real,realAfter:n.real});
  }
  // 4. Record.
  const firstPath=firstTick?firstDiff(oldFrame,now.captured):null;
  const part=k=>{for(let i=0;i<Math.min(old.sig.length,now.sig.length);i++)if(old.sig[i][k]!==now.sig[i][k])return {tick:i+1,real:+now.sig[i][2].toFixed(2),battleClock:clockText(now.sig[i][0])};return null;};
  let same=0;while(same<Math.min(blocks.length,now.digest.blocks.length)&&blocks[same].sha256===now.digest.blocks[same].sha256)same++;
  routes.push({seed,support,oldTicks:ticks,newTicks:now.digest.ticks,identicalBlocks:same,
    firstDifference:firstTick?{tick:firstTick,real:+now.sig[firstTick-1][2].toFixed(2),battleClock:clockText(now.sig[firstTick-1][0]),path:firstPath}:null,
    firstTickWhere:{battleClockDiffers:part(0),mainRngStateDiffers:part(1)},
    realSeconds:{to0600:{before:old.at0600,after:now.at0600},end:{before:old.end.real,after:now.end.real}},
    invariants:{objectives:now.end.objectives,checkpoints:now.end.checkpoints,survivors:now.end.flags['m01.east_platoon_survivors'],bakStatus:now.end.flags['m01.bak_status'],
      finalBattleClock:clockText(now.end.battleClock),consumedEvents:now.end.consumed.length,suggestedCover:{before:old.end.flags['m01.suggested_cover']??null,after:now.end.flags['m01.suggested_cover']??null}},
    battleClockEvents:clockEvents,digest:now.digest});
  console.log(JSON.stringify({seed,support,ticks:[ticks,now.digest.ticks],to0600:[old.at0600,now.at0600],end:[old.end.real,now.end.real],first:routes.at(-1).firstDifference}));
}

const source=readFileSync(join(ROOT,'src/game/m01-simulation.js'));
const blobAt=f=>{try{return sha(execFileSync('git',['-C',ROOT,'show',`${BEFORE_COMMIT}:${f}`],{maxBuffer:1<<26,stdio:['ignore','pipe','ignore']}));}catch{return null;}};
const changed=INPUTS.filter(f=>blobAt(f)!==sha(readFileSync(join(ROOT,f))));
const report={task:'M01-P2-PACING-V1',amendment:'amendment-04',beforeCommit:BEFORE_COMMIT,beforeSourceSha256:before.sourceSha256,beforeFixture:KEPT_PATH,beforeFixtureSha256:sha(oldGolden),
  afterFixture:GOLDEN_PATH,afterSourceSha256:sha(source),
  authority:'Written only by tools/verification/m01-pacing-golden-amendment.mjs --write (x86); never edited by hand. Derived from git (the replaced golden and the BEFORE simulation are read from beforeCommit) and two runs of each golden route through the same test pilot.',
  reason:'Owner playtest 2026-10-18, P2: long stretches with nothing to do, a forced real-time wait for 06:00 and unclear objectives (bridge defence; Bąk to the medic). '+
    'Mission flow changes, in the order a route meets them: (1) objective panel and status text (pacing.interludes, clearer hold_access/hold_corridor texts, pacingStatus); '+
    '(2) continuity cues only with their objective active and >= 20 real s apart; (3) seg_hold 05:34-05:59 runs at 24x while the player holds the deck after the raid; '+
    '(4) the west charge waits for Bąk and Dudek to be west of x -90, not at the station, and seg_climax 06:12-06:44 runs at 30x once everyone is west; (5) the roll call '+
    'finishes a carry still under way (the 07:05 fade). Historical battle-clock times, the 12 objectives, CP-A..D, survivors and 07:05 are the invariants checked per route.',
  changedGameplayInputsSinceBefore:changed,routes:routes.map(({digest,...r})=>r)};
const reportText=JSON.stringify(report,null,2)+'\n';
const {amendment03,...header}=before;
const golden={...header,generationStage:before.generationStage+'; P2 pacing (amendment 04, tools/verification/m01-pacing-golden-amendment.mjs)',
  sourceSha256:sha(source),
  amendment04:{task:'M01-P2-PACING-V1',beforeCommit:BEFORE_COMMIT,beforeSourceSha256:before.sourceSha256,beforeFixture:KEPT_PATH,beforeFixtureSha256:sha(oldGolden),
    audit:`${EVIDENCE}/GOLDEN_AMENDMENT_04.json`,auditSha256:sha(reportText)},
  routes:routes.map(r=>({seed:r.seed,support:r.support,...r.digest})),auditSha256:before.auditSha256};
assert.ok(amendment03,'the kept golden carries amendment 03');
const goldenText=JSON.stringify(golden,null,2)+'\n';
if(write){mkdirSync(join(ROOT,EVIDENCE),{recursive:true});writeFileSync(REPORT,reportText);writeFileSync(join(ROOT,GOLDEN_PATH),goldenText);}
else{assert.equal(readFileSync(REPORT,'utf8'),reportText,'GOLDEN_AMENDMENT_04.json equals the regenerated report');assert.equal(readFileSync(join(ROOT,GOLDEN_PATH),'utf8'),goldenText,'the golden equals the regenerated one');}
console.log(write?'written':'check: identical');
