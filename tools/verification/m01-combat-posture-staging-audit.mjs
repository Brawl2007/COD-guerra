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
// x86 only (D11/D30: aarch64 floats differ). With --candidate <sha> the commit that carries this simulation is recorded after checking that its
// src/game/m01-simulation.js hashes to the pinned source; when the fixture already exists the regenerated digests must be byte-identical to it.
//
//   git worktree add --detach /tmp/t38-pred ef35c7ab24d75d87ca6435891f1977fd14d7a52c && ln -s "$PWD/node_modules" /tmp/t38-pred/node_modules
//   M01_T38_BASELINE=/tmp/t38-pred node tools/verification/m01-combat-posture-staging-audit.mjs --write-golden [--candidate <sha>]
//   M01_T38_BASELINE=/tmp/t38-pred node tools/verification/m01-combat-posture-staging-audit.mjs            # verify only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {M01Simulation,seconds,clockText,eastFrontPlan} from '../../src/game/m01-simulation.js';
import {route} from '../../tests/helpers/m01-route.js';
import {GameplayDigest,gameplayFrame} from '../../tests/helpers/m01-animation-contract.js';

const PREDECESSOR='ef35c7ab24d75d87ca6435891f1977fd14d7a52c';
const FIXTURE='tests/fixtures/m01-t38-gameplay-baseline.json',PARTIALS='tests/fixtures/m01-partials-gameplay-baseline.json',HISTORICAL='tests/fixtures/m01-anim-gameplay-baseline.json';
const out=process.env.M01_T38_AUDIT_OUT??'docs/verification/m01-runtime/t38-combat-posture-staging-v1';mkdirSync(out,{recursive:true});
const hash=v=>createHash('sha256').update(v).digest('hex');
const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};

assert.equal(process.arch,'x64','D11/D30: the gameplay golden is generated and verified on x86 only');
const baselineRoot=process.env.M01_T38_BASELINE;assert.ok(baselineRoot,'M01_T38_BASELINE must point at a checkout of the predecessor');
assert.equal(execFileSync('git',['-C',baselineRoot,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),PREDECESSOR,'immutable predecessor ref');
assert.equal(execFileSync('git',['-C',baselineRoot,'status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),'','the predecessor checkout is clean');
const partials=JSON.parse(readFileSync(PARTIALS,'utf8'));
const predecessorSource=readFileSync(baselineRoot+'/src/game/m01-simulation.js');
assert.equal(hash(predecessorSource),partials.sourceSha256,'the predecessor simulation is the one the partials golden pins');
const {M01Simulation:Before}=await import(pathToFileURL(baselineRoot+'/src/game/m01-simulation.js'));
const source=readFileSync('src/game/m01-simulation.js'),sourceSha256=hash(source);
// Everything the per-tick gameplay bytes depend on besides the simulation source (data, posture, aim, fire, world): recorded for provenance and
// used to prove reproducibility (same inputs => byte-identical digests), not pinned by the test.
const INPUTS=['src/game/m01-simulation.js','missions/m01-tczew/mission.json','missions/m01-tczew/map-layout.json','src/game/m01-animation-presentation.js',
  'src/game/m01-aim.js','src/game/m01-fire.js','src/game/m01-display-fire.js','src/game/m01-yard-life.js','src/world/spatial.js','src/world/tczew-world.js'];
const gameplayInputsSha256=hash(INPUTS.map(f=>`${f} ${hash(readFileSync(f))}\n`).join(''));
const candidate=arg('--candidate');
if(candidate)assert.equal(hash(execFileSync('git',['show',candidate+':src/game/m01-simulation.js'])),sourceSha256,`${candidate} carries this simulation`);

const E=name=>`evt_m01_${name}`,FRONT=eastFrontPlan();
const FIXED=['train963_arrives','order_demolish','east_platoon_withdraws','germans_on_east_spans','bak_wounded'];
function outcome(Simulation,seed,support){
  const deaths={},times={};let withdrawFlag=null;
  const r=route(seed,{support,Simulation,onStep:({sim})=>{
    for(let i=0;i<24;i++){const a=sim.actor(`pl_east_${i}`);if(!a.alive&&deaths[a.id]===undefined)deaths[a.id]=sim.battleClock;}
    // battle clock at which each event was consumed (the real clock legitimately shifts with the repair duration)
    for(const id of Object.keys(sim.consumed))if(times[id]===undefined)times[id]=clockText(sim.battleClock);
    if(withdrawFlag===null&&sim.consumedEvent(E('east_platoon_withdraws')))withdrawFlag=sim.flags['m01.east_platoon_survivors'];
  }}),s=r.sim;
  return {battleTimes:Object.fromEntries(Object.entries(times).map(([k,v])=>[k.replace('evt_m01_',''),v])),complete:s.mission.complete,finalBattleClock:clockText(s.battleClock),checkpoints:s.checkpointsReached,
    objectives:Object.fromEntries(Object.entries(s.objectives).map(([k,v])=>[k,v.state])),withdrawFlag,finalSurvivors:s.flags['m01.east_platoon_survivors'],
    flags:s.flags,attrition:FRONT.attrition.map(e=>({victim:e.victim,at:clockText(e.at),fellAfterSec:deaths[e.victim]===undefined?null:+(deaths[e.victim]-e.at).toFixed(2)})),
    dlg049:s.dialogueConsumed.includes('dlg_m01_049'),consumedOrder:Object.keys(s.consumed),repairDoneObjective:s.objectives.obj_m01_cover_repair.state,
    playerHealth:s.player.health,rng:s.rng.state,issuedRounds:s.enemyFire.nextId,realClock:+s.clock.toFixed(2),
    events:Object.fromEntries(['enemy-fire','round-impact','npc-shot','player-hit'].map(t=>[t,r.events.filter(e=>e.type===t).length]))};
}
const SEEDS=(process.env.M01_T38_AUDIT_SEEDS??'19390901,1,2,3,4,5,6,7,8,9,10,11').split(',').map(Number);
const report={task:'M01-COMBAT-POSTURE-STAGING-V1',predecessor:PREDECESSOR,predecessorSourceSha256:partials.sourceSha256,sourceSha256,candidate,
  gameplayInputsSha256,node:process.version,arch:process.arch,invariants:'equal to the predecessor: completion, final battle clock, checkpoints, objective states, consumed-event order, battle-clock time of train963_arrives, order_demolish, east_platoon_withdraws, germans_on_east_spans, bak_wounded, east_demolition, west_demolition, roll_call and debrief, the 06:00 survivors flag, the final survivors, dlg_m01_049; absolute: repair_complete before 05:30, each attrition fall 0 to 5 s of battle clock after its fixed time',routes:[]};
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
  console.log(JSON.stringify({seed,support,complete:after.complete,survivors:[before.finalSurvivors,after.finalSurvivors],repair:[tb.repair_complete,ta.repair_complete],
    falls:after.attrition.map(a=>a.fellAfterSec)}));
}
const golden={task:'M01-COMBAT-POSTURE-STAGING-V1',generationStage:'gameplay re-baseline by design after the invariant audit against the exact predecessor',
  predecessor:PREDECESSOR,predecessorSourceSha256:partials.sourceSha256,...(candidate?{candidate}:{}),sourceSha256,gameplayInputs:INPUTS,gameplayInputsSha256,
  partialsGoldenSha256:hash(readFileSync(PARTIALS)),historicalGoldenSha256:hash(readFileSync(HISTORICAL)),routes:[]};
for(const {seed,support} of partials.routes){
  const digest=new GameplayDigest();
  route(seed,{support,onStep:({sim,events})=>digest.add(gameplayFrame(sim,events))});
  golden.routes.push({seed,support,...digest.finish()});
}
writeFileSync(out+'/GOLDEN_AUDIT.json',JSON.stringify(report,null,2)+'\n');
if(existsSync(FIXTURE)){
  const committed=JSON.parse(readFileSync(FIXTURE,'utf8'));
  if(committed.gameplayInputsSha256===gameplayInputsSha256)assert.deepEqual(golden.routes,committed.routes,'same gameplay inputs, same per-tick digests (reproducible)');
}
if(process.argv.includes('--write-golden'))writeFileSync(FIXTURE,JSON.stringify(golden,null,2)+'\n');
else{const committed=JSON.parse(readFileSync(FIXTURE,'utf8'));const {candidate:_,...a}=committed,{candidate:__,...b}=golden;assert.deepEqual(a,b);}
console.log(JSON.stringify({fixture:FIXTURE,sourceSha256,routes:golden.routes.map(r=>({seed:r.seed,support:r.support,ticks:r.ticks,blocks:r.blocks.length}))}));
