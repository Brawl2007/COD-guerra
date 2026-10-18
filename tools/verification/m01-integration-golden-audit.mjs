// M01 integration golden AMENDMENTS 06 (P2 pacing) and 07 (combat AI slice 1) of the combined tree. Not invoked by npm test.
//
// Same method as amendment 05 (tools/verification/m01-npc-navigation-golden-audit.mjs), with the two checks of the reverted branch tools that only an integration can make:
// each branch (claude/busy-ritchie-3fkvk2-pacing, -combat) wrote its own golden against f6913a0 and the Captain reverted it (5316718, a580b09) so the golden is moved once, here,
// on the integration tree, against the EXACT predecessor commit of the merge:
//   06  predecessor 66e47b2 (phys + npc + skin + anim + audio; its simulation is the one the NPC navigation golden, amendment 05, pins), named delta `pacing`;
//   07  predecessor = the amendment 06 commit (its simulation is the one the pacing golden pins), named delta `combat-ai`.
// The previous golden is KEPT byte for byte where it is and pinned by sha256; the new golden is a new fixture. Proof, per golden route (the two routes of the T47 golden):
//   0. PILOT. The predecessor's simulation, extracted from git with its own data, driven by the live test pilot (tests/helpers/m01-route.js), reproduces the previous golden.
//   1. LOCKSTEP. The predecessor runs on the SAME controls as the live simulation; every tick the two gameplay frames are compared. The first difference must be a path of the
//      named delta (CFG.deltaFields, measured and then pinned, never a catch-all) and until then the two are byte identical.
//   2. WHAT FOLLOWS is timing, never the plot: each side then runs on its own route; the 12 objective states, the four checkpoints in order, the consumed event ids, the plot
//      flags (m01.suggested_cover excluded: a rotating cover hint, one per salvo), the survivors and the final battle clock 07:05:00 must be identical. Every event with a
//      battle-clock trigger fires at a battle clock >= its historical time (non-gated: within one tick, 0.05 s x 30), outside the 06:45-07:05 jump.
//   3. NAVIGATION GUARD (amendment 05 kept): on the live route no clipping event and no men standing inside each other; same on seeds 3 and 7 with and without support.
//   4. RECORD: first difference, ticks, real seconds to 06:00 and to the end, the real-clock and battle-clock shift of every consumed event, German rounds per real minute (enemyFire.nextId).
// Deterministic JSON (no clocks, no paths). x86_64 only (D11/D30).
//   node tools/verification/m01-integration-golden-audit.mjs --amendment 06|07 [--write]
// Without --write nothing is written: the regenerated account and golden must equal the committed files byte for byte. When a later amendment has moved the simulation, an
// amendment is history: CFG.after names the commit whose simulation its golden pins, and the check runs that tree's simulation and pilot instead of the working tree's.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,symlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {M01Simulation as WorkingTree,seconds,clockText} from '../../src/game/m01-simulation.js';
import {route as workingPilot} from '../../tests/helpers/m01-route.js';
import {firstDifference} from '../../tests/helpers/m01-determinism.js';
import {GameplayDigest,gameplayFrame} from '../../tests/helpers/m01-animation-contract.js';
import {clippingAudit,stackingAudit} from '../../tests/helpers/m01-clipping.js';

const ROOT=resolve(import.meta.dirname,'../..');
const write=process.argv.includes('--write');
const amendmentArg=(()=>{const i=process.argv.indexOf('--amendment');return i<0?null:process.argv[i+1];})();
assert.equal(process.arch,'x64','exact gameplay golden regeneration requires x86 (same rule as D30)');
const AMENDMENTS={
  '06':{task:'M01-P2-PACING-V1',delta:'pacing',predecessor:'66e47b239a9e0bc586375481fb1a554e46b845e2',after:null,
    previousGolden:'tests/fixtures/m01-npc-navigation-gameplay-baseline.json',golden:'tests/fixtures/m01-pacing-gameplay-baseline.json',
    evidence:'docs/verification/m01-runtime/pacing-p2-2026-10-18',
    generationStage:'P2 pacing on the integration tree (phys + npc + skin + anim + audio): seg_hold 05:34-05:59 at 24x while the player holds the deck after the raid, objective marker and status, continuity cues gated to their objective and >= 20 real s apart; golden amendment 06',
    // Measured on both golden routes (first lockstep difference, tick 355, 04:33:10): the objective panel shows the pacing interlude after obj_m01_deliver_message
    // ("Mensagem entregue. Fique com o posto - avioes a norte") where the predecessor showed "Mantenha contacto com a seccao". Only the HUD text and status lines.
    deltaFields:/^\$\.state\.mission\.(text|status)$/},
  '07':{task:'M01-COMBAT-AI-V1',delta:'combat-ai',predecessor:null,after:null,
    previousGolden:'tests/fixtures/m01-pacing-gameplay-baseline.json',golden:'tests/fixtures/m01-combat-ai-gameplay-baseline.json',
    evidence:'docs/verification/m01-runtime/combat-ai-2026-10-18',
    generationStage:'Combat AI slice 1 on the pacing integration tree: per-actor actor.ai streams, rifle peeks, MG34 burst groups, line-of-sight and threat targets, suppression breaking peeks, Kowal 2-5 round bursts; golden amendment 07',
    deltaFields:null}};
const CFG=AMENDMENTS[amendmentArg];if(!CFG)throw new Error(`--amendment ${amendmentArg}: 06 or 07`);
assert.ok(CFG.predecessor,'the predecessor commit is pinned');assert.ok(CFG.deltaFields,'the named delta paths are pinned (measure them first)');
const KEY=`amendment-${amendmentArg}`,ACCOUNT_FILE=`GOLDEN_AMENDMENT_${amendmentArg}.json`;
const out=join(ROOT,CFG.evidence),ACCOUNT=join(out,ACCOUNT_FILE),GOLDEN=join(ROOT,CFG.golden);
const sha=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
const git=(...args)=>execFileSync('git',['-C',ROOT,...args],{maxBuffer:1<<29});
const INPUTS=['src/game/m01-simulation.js','src/game/m01-pacing.js','missions/m01-tczew/mission.json','missions/m01-tczew/map-layout.json','src/game/m01-animation-presentation.js',
  'src/game/m01-aim.js','src/game/m01-fire.js','src/game/m01-display-fire.js','src/game/m01-yard-life.js','src/world/spatial.js','src/world/tczew-world.js',
  'src/world/m01-navigation.js','src/world/m01-nav-layout.js','tests/helpers/m01-route.js'];

function extract(commit){
  const dir=mkdtempSync(join(tmpdir(),`m01-${amendmentArg}-${commit.slice(0,7)}-`));
  const data=git('ls-tree','-r','--name-only',commit,'assets','research').toString().split('\n').filter(p=>p.endsWith('.json'));
  execFileSync('tar',['-x','-C',dir],{input:git('archive','--format=tar',commit,'src','missions','tests/helpers',...data)});symlinkSync(join(ROOT,'node_modules'),join(dir,'node_modules'));
  return dir;
}
const previousText=readFileSync(join(ROOT,CFG.previousGolden)),previous=JSON.parse(previousText);
const tree=extract(CFG.predecessor),predecessorSource=readFileSync(join(tree,'src/game/m01-simulation.js'));
assert.equal(sha(predecessorSource),previous.sourceSha256,'the predecessor simulation is exactly the source the previous golden pins (source lock chain)');
const {M01Simulation:Before}=await import(pathToFileURL(join(tree,'src/game/m01-simulation.js')));
let Live=WorkingTree,route=workingPilot,liveRoot=ROOT;
if(CFG.after){liveRoot=extract(CFG.after);Live=(await import(pathToFileURL(join(liveRoot,'src/game/m01-simulation.js')))).M01Simulation;
  route=(await import(pathToFileURL(join(liveRoot,'tests/helpers/m01-route.js')))).route;}
const liveSource=readFileSync(join(liveRoot,'src/game/m01-simulation.js'));
const definition=JSON.parse(readFileSync(join(liveRoot,'missions/m01-tczew/mission.json'),'utf8'));
const blob=(commit,f)=>{try{return sha(execFileSync('git',['-C',ROOT,'show',`${commit}:${f}`],{maxBuffer:1<<26,stdio:['ignore','pipe','ignore']}));}catch{return null;}};
const changedInputs=INPUTS.filter(f=>{let now=null;try{now=sha(readFileSync(join(liveRoot,f)));}catch{}return blob(CFG.predecessor,f)!==now;});
assert.ok(changedInputs.length>0,'the live gameplay inputs moved');

const NOT_PLOT=new Set(['m01.suggested_cover']);
const plot=f=>Object.fromEntries(Object.entries(f).filter(([k])=>!NOT_PLOT.has(k)).sort());
function observer({audit=true}={}){
  const fired={},o={fired,at0600:null,clip:audit?clippingAudit():null,stack:audit?stackingAudit():null};
  o.step=step=>{const {sim,events}=step;
    for(const id of Object.keys(sim.consumed))fired[id]??={battle:sim.battleClock,real:+sim.clock.toFixed(2)};
    if(o.at0600===null&&sim.battleClock>=seconds('06:00:00'))o.at0600=+sim.clock.toFixed(2);
    if(audit){o.clip.observe(step);o.stack.observe(step);}};
  return o;
}
const endState=(sim,o)=>({ticks:Math.round(sim.clock/.05),real:+sim.clock.toFixed(2),battleClock:sim.battleClock,complete:sim.mission.complete,
  survivors:sim.flags['m01.east_platoon_survivors'],playerHealth:sim.player.health,checkpoints:[...sim.checkpointsReached],
  objectives:Object.fromEntries(Object.entries(sim.objectives).map(([id,x])=>[id.replace('obj_m01_',''),x.state])),consumedEventIds:Object.keys(sim.consumed).sort(),
  flags:plot(sim.flags),at0600:o.at0600});
function clockEvents(now,old){
  const rows=[];
  for(const e of definition.events){
    const t=[e.trigger,...(e.trigger.of??[])].find(t=>t.type==='battleClock');if(!t)continue;
    const at=seconds(t.at),seg=definition.clock.segments.find(s=>at>=seconds(s.from)&&at<seconds(s.to)),n=now[e.id],o=old[e.id];
    assert.ok(n&&o,`${e.id} fired on both sides`);
    const fixed=e.trigger.type==='battleClock'&&!e.trigger.gate;
    if(!seg?.jump){assert.ok(n.battle>=at-1e-6,`${e.id} never before ${t.at}`);if(fixed)assert.ok(n.battle-at<=1.5+1e-6,`${e.id} at ${t.at} (fired ${clockText(n.battle)})`);}
    rows.push({id:e.id,at:t.at,fixed,jump:Boolean(seg?.jump),battle:{predecessor:+o.battle.toFixed(2),live:+n.battle.toFixed(2)},real:{predecessor:o.real,live:n.real}});
  }
  return rows;
}

const report={task:CFG.task,amendment:KEY,delta:CFG.delta,predecessor:CFG.predecessor,predecessorSourceSha256:previous.sourceSha256,sourceSha256:sha(liveSource),
  previousGolden:{task:previous.task,file:CFG.previousGolden,sha256:sha(previousText),sourceSha256:previous.sourceSha256},deltaFields:CFG.deltaFields.source,
  authority:`Written only by tools/verification/m01-integration-golden-audit.mjs --amendment ${amendmentArg} --write (x86); never edited by hand.`,
  changedGameplayInputsSincePredecessor:changedInputs,routes:[]};
const golden={task:CFG.task,generationStage:CFG.generationStage,amendment:KEY,delta:CFG.delta,predecessor:CFG.predecessor,predecessorSourceSha256:previous.sourceSha256,
  previousGolden:{task:previous.task,file:CFG.previousGolden,sha256:sha(previousText)},historicalGoldenSha256:previous.historicalGoldenSha256,sourceSha256:sha(liveSource),
  inputsSha256:Object.fromEntries(INPUTS.map(f=>{try{return [f,sha(readFileSync(join(liveRoot,f)))];}catch{return [f,null];}})),routes:[]};

for(const {seed,support,ticks,blocks} of previous.routes){
  // 0. The predecessor on the live pilot reproduces the previous golden.
  const pd=new GameplayDigest(),po=observer({audit:false});
  const own=route(seed,{support,Simulation:Before,onStep:step=>{pd.add(gameplayFrame(step.sim,step.events));po.step(step);}}).sim;
  assert.deepEqual(pd.finish(),{ticks,blocks},'0. the predecessor reproduces the previous golden on the live pilot (the pilot did not move)');
  // 1. Lockstep on the live controls.
  const a=new Before(seed);a.drainEvents();
  const digest=new GameplayDigest(),lo=observer(),row={seed,support,oldTicks:ticks,newTicks:0,firstDifference:null,identicalTicksBeforeIt:null,identicalBlocks:0};
  const result=route(seed,{support,Simulation:Live,onStep:step=>{
    const {sim,controls,dt,events}=step;row.newTicks++;
    a.tick(dt,structuredClone(controls));const ea=a.drainEvents();const live=gameplayFrame(sim,events);
    if(!row.firstDifference){const d=firstDifference(gameplayFrame(a,ea),live);
      if(d){const m=/^\$\.(?:state|checkpoint)\.actors\.(\d+)\./.exec(d.path);
        row.firstDifference={tick:row.newTicks,clock:+sim.clock.toFixed(2),battleClock:clockText(sim.battleClock),path:d.path,actor:m?sim.actors[Number(m[1])].id:null,
          predecessor:d.a??null,live:d.b??null,missing:d.missing??false};
        row.identicalTicksBeforeIt=row.newTicks-1;console.log(JSON.stringify({seed,support,firstDifference:row.firstDifference}));}}
    digest.add(live);lo.step(step);
  }});
  const sim=result.sim,fin=digest.finish();
  assert.ok(row.firstDifference,'the live simulation differs from the predecessor on this route');
  assert.match(row.firstDifference.path,CFG.deltaFields,`1. the first difference is a path of the named delta \`${CFG.delta}\``);
  for(let i=0;i<Math.min(fin.blocks.length,blocks.length)&&JSON.stringify(fin.blocks[i])===JSON.stringify(blocks[i]);i++)row.identicalBlocks++;
  // 2. Invariants against the predecessor on its own route.
  const endOld=endState(own,po),endNew=endState(sim,lo);
  assert.equal(endNew.complete,true);assert.equal(endNew.battleClock,seconds('07:05:00'));assert.equal(endNew.battleClock,endOld.battleClock);
  assert.equal(Object.keys(endNew.objectives).length,12);assert.deepEqual(endNew.objectives,endOld.objectives,'2. the same 12 objective end states');
  assert.deepEqual(endNew.checkpoints,endOld.checkpoints,'CP-A..D in order');assert.equal(endNew.checkpoints.length,4);
  assert.deepEqual(endNew.consumedEventIds,endOld.consumedEventIds,'the same consumed events');
  assert.equal(endNew.survivors,endOld.survivors,'the same survivors');
  assert.deepEqual(endNew.flags,endOld.flags,'the same plot flags');
  row.battleClockEvents=clockEvents(lo.fired,po.fired);
  row.movedEvents=endNew.consumedEventIds.filter(id=>po.fired[id].real!==lo.fired[id].real).map(id=>({event:id,real:{predecessor:po.fired[id].real,live:lo.fired[id].real},
    battle:{predecessor:+po.fired[id].battle.toFixed(2),live:+lo.fired[id].battle.toFixed(2)}}));
  // 3. Navigation guard.
  assert.equal(lo.clip.events.length,0,'3. no clipping event on the live route');assert.equal(lo.stack.summary().pairs,0,'3. nobody inside another man on the live route');
  row.endState={predecessorOwnRoute:{ticks:endOld.ticks,real:endOld.real,to0600:endOld.at0600,survivors:endOld.survivors,playerHealth:endOld.playerHealth},
    live:{ticks:endNew.ticks,real:endNew.real,to0600:endNew.at0600,survivors:endNew.survivors,playerHealth:endNew.playerHealth},
    objectives:endNew.objectives,checkpoints:endNew.checkpoints,finalBattleClock:clockText(endNew.battleClock),consumedEvents:endNew.consumedEventIds.length,
    suggestedCover:{predecessor:own.flags['m01.suggested_cover']??null,live:sim.flags['m01.suggested_cover']??null}};
  row.measured={clipping:lo.clip.events.length,stacked:lo.stack.summary().pairs,germanRoundsPerRealMin:{predecessor:+(own.enemyFire.nextId/(own.clock/60)).toFixed(2),live:+(sim.enemyFire.nextId/(sim.clock/60)).toFixed(2)}};
  report.routes.push(row);golden.routes.push({seed,support,...fin});
  console.log(JSON.stringify({seed,support,ticks:[ticks,row.newTicks],to0600:[endOld.at0600,endNew.at0600],end:[endOld.real,endNew.real],identicalBlocks:row.identicalBlocks}));
}
// 3 (cont.). The navigation guard and the plot on the other audited seeds, each side on its own route. Not part of the golden.
report.otherRoutes=[];
for(const seed of [3,7])for(const support of [false,true]){
  const lo=observer(),po=observer({audit:false});
  const live=route(seed,{support,Simulation:Live,onStep:lo.step}).sim,own=route(seed,{support,Simulation:Before,onStep:po.step}).sim;
  const endOld=endState(own,po),endNew=endState(live,lo);
  const r={seed,support,clipping:lo.clip.events.length,stacked:lo.stack.summary().pairs,
    same:{objectives:JSON.stringify(endOld.objectives)===JSON.stringify(endNew.objectives),checkpoints:JSON.stringify(endOld.checkpoints)===JSON.stringify(endNew.checkpoints),
      consumedEventIds:JSON.stringify(endOld.consumedEventIds)===JSON.stringify(endNew.consumedEventIds),finalBattleClock:endOld.battleClock===endNew.battleClock},
    survivors:{predecessor:endOld.survivors,live:endNew.survivors},real:{predecessor:endOld.real,live:endNew.real},
    repairComplete:{predecessor:po.fired.evt_m01_repair_complete?.real??null,live:lo.fired.evt_m01_repair_complete?.real??null}};
  report.otherRoutes.push(r);
  assert.equal(r.clipping,0,`seed ${seed} support ${support}: no clipping`);assert.equal(r.stacked,0,`seed ${seed} support ${support}: nobody inside another man`);
  assert.equal(endNew.complete,true);assert.equal(endNew.checkpoints.length,4);
  console.log(JSON.stringify(r));
}
const accountText=JSON.stringify(report,null,2)+'\n';
golden.audit=`${CFG.evidence}/${ACCOUNT_FILE}`;golden.auditSha256=sha(accountText);
const goldenText=JSON.stringify(golden,null,2)+'\n';
if(write){mkdirSync(out,{recursive:true});writeFileSync(ACCOUNT,accountText);writeFileSync(GOLDEN,goldenText);console.log('written');}
else{assert.equal(readFileSync(ACCOUNT,'utf8'),accountText,`${ACCOUNT_FILE} equals the regenerated account`);assert.equal(readFileSync(GOLDEN,'utf8'),goldenText,'the golden equals the regenerated one');console.log('check: identical');}
