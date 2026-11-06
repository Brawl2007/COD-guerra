// Run from the candidate checkout after extracting the baseline with:
// git archive edc2c19 src research missions package.json | tar -x -C /tmp/m02-pre-grenade-baseline
// node docs/verification/m02-runtime/grenade-preparation-2026-10-31/compare-no-grenade.mjs /tmp/m02-pre-grenade-baseline
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const baseline=process.argv[2];
if(!baseline)throw Error('Provide the directory containing the extracted baseline.');
const simulation=dir=>import(pathToFileURL(resolve(dir,'src/game/m02-01-simulation.js')).href);
const {M02BenchSimulation:Previous}=await simulation(baseline);
const {M02BenchSimulation:Current}=await simulation(process.cwd());
for(const scene of ['C01','C02','B','C']){
 const older=new Previous(),newer=new Current();
 for(const sim of [older,newer]){
  if(scene==='C01'||scene==='C02')sim.reset(scene);
  if(scene==='B')sim.enterAreaBC06();
  if(scene==='C')sim.enterAreaCC09();
  sim.drainEvents();
 }
 let npc=0;
 for(let i=0;i<200;i++){
  const input={forward:i%80<30?1:0,side:i%100>=80?.3:0,aim:i%60<15,fire:i%35===0,reload:i%97===0};
  older.tick(.05,input);newer.tick(.05,input);
  const oldEvents=older.drainEvents(),newEvents=newer.drainEvents();npc+=newEvents.filter(e=>e.type==='actor-burst').length;
  try{assert.deepEqual(newer.snapshot(),older.snapshot());assert.deepEqual(newEvents,oldEvents);}catch(e){console.error(`${scene} diverged at tick ${i+1}`);throw e;}
 }
 console.log(`${scene}: 200 snapshots and event queues identical; ${npc} NPC rounds`);
}
