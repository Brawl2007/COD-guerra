// Combat AI slice 1 (M01-COMBAT-AI-SLICE-1, owner playtest P1 "combat is boring"; docs/direction/COD_WAW_WWII_BENCHMARK.md, «Combate e IA»): the per-tick gameplay
// golden of the live simulation and the account of what it replaced. Not invoked by npm test.
//   1. The predecessor is the M01 candidate f6913a0, whose simulation the T47 golden (tests/fixtures/m01-t47-gameplay-baseline.json) pins. That golden is kept byte
//      for byte as history; the predecessor tree, extracted from git, must reproduce it on this tree's pilot (tests/helpers/m01-route.js, unchanged by the slice).
//   2. The live simulation runs the same two routes; its per-tick digest (GameplayDigest of gameplayFrame, 512-tick blocks) is the new golden.
//   3. The mission invariants are compared, per route, between the predecessor on its own route and the live one: the 12 objective states, the four checkpoints,
//      the consumed event ids, the battle clock at which every battleClock-triggered (fixed historical) event was consumed, the east platoon survivors, the
//      completion and the final battle clock. The slice changes only WHEN and AT WHOM Germans and Kowal fire, so everything after the first changed shot may move
//      in real time (the repair, the gates it opens); the plot may not. Any invariant that differs fails the tool.
// The JSON is deterministic (no wall clock, no paths). x86_64 only (D11/D30), like every exact golden regeneration of M01.
//   node tools/verification/m01-combat-ai-golden.mjs [--write]          (without --write nothing is written: the committed golden must equal the regenerated one)
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,symlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {resolve,join} from 'node:path';
import {route} from '../../tests/helpers/m01-route.js';
import {GameplayDigest,gameplayFrame} from '../../tests/helpers/m01-animation-contract.js';
import {M01Simulation as Live,clockText} from '../../src/game/m01-simulation.js';

const ROOT=resolve(import.meta.dirname,'../..');
const PREDECESSOR='f6913a0dae3ae227ab0421c6b59f992e8685e9a6';
const PREVIOUS='tests/fixtures/m01-t47-gameplay-baseline.json',GOLDEN='tests/fixtures/m01-combat-ai-gameplay-baseline.json';
const write=process.argv.includes('--write');
assert.equal(process.arch,'x64','D11/D30: exact gameplay golden regeneration requires x86_64');
const sha=v=>createHash('sha256').update(v).digest('hex');
const read=path=>readFileSync(join(ROOT,path));
const definition=JSON.parse(read('missions/m01-tczew/mission.json'));
const fixedTimeEvents=new Set(definition.events.filter(e=>e.trigger?.type==='battleClock').map(e=>e.id));

function extract(rev){
  const dir=mkdtempSync(join(tmpdir(),'m01-combat-ai-before-'));
  const data=execFileSync('git',['-C',ROOT,'ls-tree','-r','--name-only',rev,'assets','research'],{encoding:'utf8',maxBuffer:1<<26}).split('\n').filter(p=>p.endsWith('.json'));
  const tar=execFileSync('git',['-C',ROOT,'archive','--format=tar',rev,'src','missions',...data],{maxBuffer:1<<29});
  execFileSync('tar',['-x','-C',dir],{input:tar});symlinkSync(join(ROOT,'node_modules'),join(dir,'node_modules'));
  return dir;
}
const previousBytes=read(PREVIOUS),previous=JSON.parse(previousBytes),tree=extract(PREDECESSOR);
const predecessorSource=readFileSync(join(tree,'src/game/m01-simulation.js'));
assert.equal(sha(predecessorSource),previous.sourceSha256,'the predecessor carries exactly the simulation the T47 golden pins');
assert.equal(sha(execFileSync('git',['-C',ROOT,'show',`${PREDECESSOR}:${PREVIOUS}`],{maxBuffer:1<<26})),sha(previousBytes),'the T47 golden is byte for byte the one of the predecessor');
const {M01Simulation:Before}=await import(pathToFileURL(join(tree,'src/game/m01-simulation.js')));

function run(Simulation,seed,support){
  const digest=new GameplayDigest(),consumedAt={};let known=0;
  const {sim}=route(seed,{support,Simulation,onStep:({sim,events})=>{
    digest.add(gameplayFrame(sim,events));
    const ids=Object.keys(sim.consumed);if(ids.length!==known){for(const id of ids)consumedAt[id]??=sim.battleClock;known=ids.length;}
  }});
  return {sim,digest:digest.finish(),consumedAt};
}
const end=({sim,consumedAt})=>({ticks:Math.round(sim.clock/.05),complete:sim.mission.complete,finalBattleClock:clockText(sim.battleClock),checkpoints:[...sim.checkpointsReached],
  objectives:Object.fromEntries(Object.entries(sim.objectives).map(([id,o])=>[id.replace('obj_m01_',''),o.state])),consumedEvents:Object.keys(sim.consumed).sort(),
  fixedTimeEvents:Object.fromEntries(Object.entries(consumedAt).filter(([id])=>fixedTimeEvents.has(id)).sort().map(([id,t])=>[id.replace('evt_m01_',''),clockText(t)])),
  survivors:sim.flags['m01.east_platoon_survivors'],flags:Object.fromEntries(Object.entries(sim.flags).sort()),repairCompleteAt:consumedAt.evt_m01_repair_complete!==undefined?clockText(consumedAt.evt_m01_repair_complete):null,
  repairCompleteRealSec:sim.consumed.evt_m01_repair_complete??null,repairPins:sim.timers.repairPins??0,playerHealth:sim.player.health});

const golden={task:'M01-COMBAT-AI-SLICE-1',predecessor:PREDECESSOR,predecessorSourceSha256:previous.sourceSha256,
  previousGolden:{task:previous.task,file:PREVIOUS,sha256:sha(previousBytes)},historicalGoldenSha256:previous.historicalGoldenSha256,
  sourceSha256:sha(read('src/game/m01-simulation.js')),
  inputs:Object.fromEntries(['src/game/m01-simulation.js','src/game/m01-display-fire.js','missions/m01-tczew/mission.json'].map(f=>[f,{before:sha(readFileSync(join(tree,f))),after:sha(read(f))}])),
  rule:'Per route: the predecessor reproduces the T47 golden on this pilot; the live digest is this golden; the predecessor on its own route and the live route end with the same '+
    'objective states, checkpoints, consumed event ids, battle clock of every fixed-time (battleClock) event, survivors, flags and final battle clock. Real-time positions '+
    '(ticks, repair completion, pins, player health) may move: they are listed, not required.',
  routes:[],account:[]};
for(const {seed,support,ticks,blocks} of previous.routes){
  const old=run(Before,seed,support);
  assert.deepEqual(old.digest,{ticks,blocks},`the predecessor reproduces the T47 golden (seed ${seed}, support ${support})`);
  const now=run(Live,seed,support),a=end(old),b=end(now);
  let same=0;while(same<Math.min(blocks.length,now.digest.blocks.length)&&blocks[same].sha256===now.digest.blocks[same].sha256)same++;
  for(const k of ['complete','finalBattleClock','checkpoints','objectives','consumedEvents','fixedTimeEvents','survivors','flags'])
    assert.deepEqual(b[k],a[k],`mission invariant ${k} (seed ${seed}, support ${support})`);
  golden.routes.push({seed,support,...now.digest});
  golden.account.push({seed,support,identicalLeadingBlocks:same,firstDifferingBlockTick:now.digest.blocks[same]?.tick??null,invariantsIdentical:true,
    predecessor:{ticks:a.ticks,repairCompleteAt:a.repairCompleteAt,repairCompleteRealSec:a.repairCompleteRealSec,repairPins:a.repairPins,playerHealth:a.playerHealth},
    live:{ticks:b.ticks,repairCompleteAt:b.repairCompleteAt,repairCompleteRealSec:b.repairCompleteRealSec,repairPins:b.repairPins,playerHealth:b.playerHealth},
    shared:{finalBattleClock:b.finalBattleClock,checkpoints:b.checkpoints,survivors:b.survivors,fixedTimeEvents:b.fixedTimeEvents}});
  console.log(JSON.stringify(golden.account.at(-1)));
}
const text=JSON.stringify(golden,null,2)+'\n';
if(write)writeFileSync(join(ROOT,GOLDEN),text);
else assert.equal(read(GOLDEN).toString('utf8'),text,'the committed combat AI golden equals the regenerated one');
