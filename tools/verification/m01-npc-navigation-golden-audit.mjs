// M01-NPC-NAVIGATION-V1: golden AMENDMENT 04 of the combined tree. Not invoked by npm test.
//
// The change under audit: M01 actors get a deterministic, data-only navigation (src/world/m01-navigation.js, m01-nav-layout.js) in the simulation's one
// walking routine (moveActor): a man whose straight walk is free walks it exactly as before; otherwise he follows the corners of a route round the solids
// (saved in his own `nav`), he steers round the men in his way, a crowd at one goal queues instead of standing inside each other, and the ckm emplacement is
// open at the rear. src/game/m01-simulation.js changed, so the source lock of the T47 golden (tests/fixtures/m01-t47-gameplay-baseline.json) is history:
// that file is KEPT byte for byte and pinned by sha256, and this tool writes the golden of the live simulation, tests/fixtures/m01-npc-navigation-gameplay-baseline.json.
//
// Proof, per golden route (the two routes of the T47 golden), with exact numbers (no epsilon):
//   1. LOCKSTEP. The predecessor (f6913a0, the combined tree of candidate #80 as the owner played it: golden T47 amendment 03) runs on the SAME controls as the live
//      simulation. Every tick the two gameplay frames (all gameplay bytes, the presentation fields stripped) are compared. The tick of the first difference, and its
//      path, are recorded: it must be a navigation field of one actor (x, y, z, facing, state, crouched or the new `nav` route) and until then the two are byte identical.
//   2. WHAT FOLLOWS is timing, never the plot: each side then runs on its OWN route (`route(seed,{Simulation})`) and the end of the mission is compared: the 12 objective
//      states, the four checkpoints, the consumed event ids, the survivors and the final battle clock must be identical; the clock of every event that moved is listed.
//   3. THE MEASURED EFFECT, on the live route and on the predecessor's own: clipping events of tests/helpers/m01-clipping.js (actors in walls, girders, sandbags) and
//      pairs of men standing inside each other, and which men ever followed a saved route.
// The JSON is deterministic (no clocks, no paths), so re-running reproduces the committed files. x86_64 only (D11/D30): exact gameplay golden regeneration is never
// done from aarch64.
//   node tools/verification/m01-npc-navigation-golden-audit.mjs [--write]        (M01_NPC_AUDIT_OUT overrides the evidence folder)
// Without --write nothing is written: the regenerated account and golden must equal the committed files byte for byte.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,symlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {route} from '../../tests/helpers/m01-route.js';
import {firstDifference} from '../../tests/helpers/m01-determinism.js';
import {GameplayDigest,gameplayFrame} from '../../tests/helpers/m01-animation-contract.js';
import {clippingAudit,stackingAudit,CLOSED_EMPLACEMENT} from '../../tests/helpers/m01-clipping.js';

const write=process.argv.includes('--write');
const root=resolve(import.meta.dirname,'../..');
assert.equal(process.arch,'x64','exact gameplay golden regeneration requires x86 (same rule as D30)');
const PREDECESSOR='f6913a0dae3ae227ab0421c6b59f992e8685e9a6';   // candidate #80 + PR #90 + #89 as played: the combined tree whose golden is T47 amendment 03
const EVIDENCE='docs/verification/m01-runtime/npc-navigation-2026-10-18';
const out=resolve(process.env.M01_NPC_AUDIT_OUT??join(root,EVIDENCE));if(write)mkdirSync(out,{recursive:true});
const ACCOUNT=join(out,'GOLDEN_AMENDMENT_04.json'),GOLDEN=join(root,'tests/fixtures/m01-npc-navigation-gameplay-baseline.json');
const hash=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
const previousFile='m01-t47-gameplay-baseline.json',previousPath=join(root,'tests/fixtures',previousFile),previous=JSON.parse(readFileSync(previousPath));
const NAVIGATION_FIELDS=/^\$\.(state|checkpoint)\.actors\.\d+\.(x|y|z|facing|state|crouched|nav)$/;

function predecessorTree(){
  const given=process.env.M01_NPC_BASELINE;
  if(given){assert.equal(execFileSync('git',['-C',given,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),PREDECESSOR,'immutable predecessor ref');return given;}
  const dir=mkdtempSync(join(tmpdir(),'m01-npc-predecessor-'));
  // The simulation modules import JSON data (mission, map, colliders, manifests, weapon profile): archive every .json of assets and research with src, missions and tests/helpers.
  const data=execFileSync('git',['-C',root,'ls-tree','-r','--name-only',PREDECESSOR,'assets','research'],{encoding:'utf8',maxBuffer:1<<26}).split('\n').filter(p=>p.endsWith('.json'));
  const tar=execFileSync('git',['-C',root,'archive','--format=tar',PREDECESSOR,'src','missions',...data],{maxBuffer:1<<29});
  execFileSync('tar',['-x','-C',dir],{input:tar});symlinkSync(join(root,'node_modules'),join(dir,'node_modules'));
  return dir;
}
const tree=predecessorTree();
const predecessorSource=readFileSync(join(tree,'src/game/m01-simulation.js'));
assert.equal(hash(predecessorSource),previous.sourceSha256,'the predecessor simulation is exactly the source pinned by the T47 golden (source lock chain)');
const {M01Simulation:Before}=await import(pathToFileURL(join(tree,'src/game/m01-simulation.js')));
const liveSource=readFileSync(join(root,'src/game/m01-simulation.js'));
assert.notEqual(hash(liveSource),previous.sourceSha256,'the live simulation moved');

const sorted=o=>Object.fromEntries(Object.entries(o).sort());
const endState=(sim)=>({ticks:Math.round(sim.clock/.05),battleClock:sim.battleClock,survivors:sim.flags['m01.east_platoon_survivors'],checkpoints:[...sim.checkpointsReached],complete:sim.mission.complete,
  playerHealth:sim.player.health,objectives:Object.fromEntries(Object.entries(sim.objectives).map(([id,o])=>[id.replace('obj_m01_',''),o.state])),
  consumedEventIds:Object.keys(sim.consumed).sort(),consumed:sorted(sim.consumed)});
const clipSummary=audit=>({ticks:audit.ticks,events:audit.events.length,list:audit.report()});

const report={task:'M01-NPC-NAVIGATION-V1',amendment:'amendment-04',predecessor:PREDECESSOR,predecessorSourceSha256:hash(predecessorSource),sourceSha256:hash(liveSource),
  previousGolden:{task:previous.task,file:'tests/fixtures/'+previousFile,sha256:hash(readFileSync(previousPath)),sourceSha256:previous.sourceSha256},
  navigationFields:NAVIGATION_FIELDS.source,routes:[]};
const golden={task:'M01-NPC-NAVIGATION-V1',generationStage:'NPC navigation on the combined tree (candidate #80 + PR #90 + #89): routes round the solids, steering round men, queue at a crowded goal, open ckm emplacement; golden amendment 04',
  predecessor:PREDECESSOR,predecessorSourceSha256:previous.sourceSha256,
  previousGolden:{task:previous.task,file:'tests/fixtures/'+previousFile,sha256:hash(readFileSync(previousPath))},
  historicalGoldenSha256:previous.historicalGoldenSha256,sourceSha256:hash(liveSource),routes:[]};
const cases=previous.routes.map(r=>({seed:r.seed,support:r.support}));   // the same routes as the golden it replaces

for(const {seed,support} of cases){
  const a=new Before(seed);a.drainEvents();
  const digest=new GameplayDigest(),row={seed,support,oldTicks:previous.routes.find(r=>r.seed===seed&&r.support===support).ticks,newTicks:0,firstDifference:null,identicalTicksBeforeIt:null,identicalBlocks:0,routeWindows:{}};
  const clip=clippingAudit(),stack=stackingAudit();
  const result=route(seed,{support,onStep:(step)=>{
    const {sim,controls,dt,events}=step;row.newTicks++;
    a.tick(dt,structuredClone(controls));const ea=a.drainEvents();
    const live=gameplayFrame(sim,events);
    if(!row.firstDifference){
      const d=firstDifference(gameplayFrame(a,ea),live);
      if(d){const m=/^\$\.(?:state|checkpoint)\.actors\.(\d+)\./.exec(d.path);
        row.firstDifference={tick:row.newTicks,clock:sim.clock,path:d.path,actor:m?sim.actors[Number(m[1])].id:null,predecessor:d.a??null,live:d.b??null,missing:d.missing??false};
        row.identicalTicksBeforeIt=row.newTicks-1;console.log(JSON.stringify({seed,support,firstDifference:row.firstDifference}));}
    }
    for(const x of sim.actors)if(x.nav){const w=row.routeWindows[x.id]??={firstClock:sim.clock,lastClock:sim.clock,ticks:0};w.lastClock=sim.clock;w.ticks++;}
    clip.observe(step);stack.observe(step);digest.add(live);
  }});
  const sim=result.sim,fin=digest.finish();
  assert.ok(row.firstDifference,'the live simulation differs from the predecessor on this route');
  assert.match(row.firstDifference.path,NAVIGATION_FIELDS,'1. the first difference is a navigation field of one actor');
  assert.ok(sim.mission.complete&&sim.checkpointsReached.length===4,'the mission still completes with its four checkpoints');
  // The predecessor on its own route (proof 2) and the measured effect (proof 3).
  const clipOld=clippingAudit({layout:CLOSED_EMPLACEMENT}),stackOld=stackingAudit();   // the predecessor's emplacement is still closed on four sides
  const own=route(seed,{support,Simulation:Before,onStep:(step)=>{clipOld.observe(step);stackOld.observe(step);}}).sim;
  const endOld=endState(own),endNew=endState(sim);
  row.identicalBlocks=0;for(let i=0;i<Math.min(fin.blocks.length,previous.routes.find(r=>r.seed===seed&&r.support===support).blocks.length)
    &&JSON.stringify(fin.blocks[i])===JSON.stringify(previous.routes.find(r=>r.seed===seed&&r.support===support).blocks[i]);i++)row.identicalBlocks++;
  row.endState={identical:{objectives:JSON.stringify(endOld.objectives)===JSON.stringify(endNew.objectives),checkpoints:JSON.stringify(endOld.checkpoints)===JSON.stringify(endNew.checkpoints),
    consumedEventIds:JSON.stringify(endOld.consumedEventIds)===JSON.stringify(endNew.consumedEventIds),survivors:endOld.survivors===endNew.survivors,
    finalBattleClock:endOld.battleClock===endNew.battleClock,complete:endOld.complete&&endNew.complete},
    predecessorOwnRoute:{ticks:endOld.ticks,battleClock:endOld.battleClock,survivors:endOld.survivors,playerHealth:endOld.playerHealth},
    live:{ticks:endNew.ticks,battleClock:endNew.battleClock,survivors:endNew.survivors,playerHealth:endNew.playerHealth},
    movedEvents:endNew.consumedEventIds.filter(id=>endOld.consumed[id]!==endNew.consumed[id]).map(id=>({event:id,predecessorOwnRoute:endOld.consumed[id],live:endNew.consumed[id],shiftSec:endNew.consumed[id]-endOld.consumed[id]}))};
  row.measured={clipping:{predecessor:clipSummary(clipOld),live:clipSummary(clip)},stacked:{predecessor:stackOld.summary(),live:stack.summary()}};
  report.routes.push(row);golden.routes.push({seed,support,...fin});
  const e=row.endState.identical;
  assert.ok(e.objectives,'all 12 objectives end as in the predecessor on its own route');
  assert.ok(e.checkpoints&&e.consumedEventIds&&e.survivors&&e.finalBattleClock&&e.complete,'same checkpoints, same consumed events, same survivors and final battle clock as the predecessor on its own route');
  assert.equal(row.measured.clipping.live.events,0,'the live route has no clipping event');
  assert.equal(row.measured.stacked.live.pairs,0,'the live route has no men standing inside each other');
  console.log(JSON.stringify({seed,support,ticks:row.newTicks,firstDifferenceClock:row.firstDifference.clock,identicalBlocks:row.identicalBlocks,movers:Object.keys(row.routeWindows),
    clippingBefore:row.measured.clipping.predecessor.events,clippingAfter:0,stackedBefore:row.measured.stacked.predecessor.pairs,stackedAfter:0}));
}
const accountText=JSON.stringify(report,null,2)+'\n';
golden.auditSha256=hash(accountText);golden.audit=EVIDENCE+'/GOLDEN_AMENDMENT_04.json';
const goldenText=JSON.stringify(golden,null,2)+'\n';
if(write){writeFileSync(ACCOUNT,accountText);writeFileSync(GOLDEN,goldenText);}
else{
  assert.equal(readFileSync(ACCOUNT,'utf8'),accountText,'GOLDEN_AMENDMENT_04.json equals the regenerated account (check mode writes nothing; --write regenerates it)');
  assert.equal(readFileSync(GOLDEN,'utf8'),goldenText,'the golden equals the regenerated one');
}
