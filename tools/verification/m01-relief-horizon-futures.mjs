import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {route} from '../../tests/helpers/m01-route.js';
import {M01TerrainRelief} from '../../src/render/m01-terrain-relief.js';
import {M01FarLandscape} from '../../src/render/m01-far-landscape.js';
import {lightingModel} from '../../src/render/m01-lighting.js';

const args=process.argv.slice(2),option=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const baseline=resolve(option('--baseline','.agent/runs/M01-T27-T30-20261012/baseline-checkout'));
const seeds=option('--seeds','19390901,1,2,3,7,17,41,73,99,1234,1945,4294967295').split(',').map(Number);
const out=resolve(option('--out','test-results/m01-relief-horizon-futures.json'));
const {M01Simulation:BaselineSimulation}=await import(pathToFileURL(`${baseline}/src/game/m01-simulation.js`).href);
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sourceFiles=['src/render/m01-terrain-envelope.js','src/render/m01-terrain-relief.js','src/render/m01-far-landscape.js','src/render/m01-view.js','src/game/m01-simulation.js','src/world/tczew-world.js'];
const report={baseline,baselineHead:execFileSync('git',['-C',baseline,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),candidateHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes:Object.fromEntries(sourceFiles.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),seeds,routes:[],kind:'real-control full tick futures, presentation owners active; not a browser playtest'};
for(const seed of seeds)for(const support of [false,true]){
  const baselineSim=new BaselineSimulation(seed),stateHash=createHash('sha256'),eventHash=createHash('sha256'),controlHash=createHash('sha256'),checkpointPairs=[];let ticks=0,actorSamples=0,owner=null,far=null,checkpointRef=null;const parent=new THREE.Group(),material=new THREE.MeshBasicMaterial();
  const result=route(seed,{support,onStep:({sim,controls,events,dt})=>{
    owner??=new M01TerrainRelief(parent,sim.world,material);far??=new M01FarLandscape(parent,sim.world,{surfaceY:(x,z)=>owner.surfaceHeightAt(x,z)});owner.sync(sim.world,support?'high':'low');far.sync(sim.world,support?'high':'low',sim.clock,lightingModel(5,95));
    for(const actor of [sim.player,...sim.actors]){let inside=false;for(const r of owner.envelope.regions)if(actor.x>=r.minX-.001&&actor.x<=r.maxX+.001&&actor.z>=r.minZ-.001&&actor.z<=r.maxZ+.001){inside=true;break;}assert.ok(inside,`seed ${seed}, support ${support}, actor ${actor.id} outside raw participant hull at tick ${ticks}`);actorSamples++;}
    baselineSim.tick(dt,controls);const before=baselineSim.drainEvents();assert.deepEqual(events,before,`events seed ${seed}, support ${support}, tick ${ticks}`);
    if(sim.checkpoint!==checkpointRef){assert.deepEqual(sim.checkpoint,baselineSim.checkpoint,`checkpoint backup seed ${seed}, support ${support}, tick ${ticks}`);checkpointPairs.push({tick:ticks,id:sim.checkpointsReached.at(-1)??'initial',candidateSha256:digest(sim.checkpoint),baselineSha256:digest(baselineSim.checkpoint)});checkpointRef=sim.checkpoint;}
    const current=sim.snapshot(false),original=baselineSim.snapshot(false);assert.deepEqual(current,original,`full future seed ${seed}, support ${support}, tick ${ticks}`);
    stateHash.update(JSON.stringify(current));eventHash.update(JSON.stringify(events));controlHash.update(JSON.stringify(controls));ticks++;
  }});
  assert.deepEqual(result.sim.checkpoint,baselineSim.checkpoint,`final checkpoint backup seed ${seed}, support ${support}`);
  report.routes.push({seed,support,ticks,actorSamples,fullStateStreamSha256:stateHash.digest('hex'),eventStreamSha256:eventHash.digest('hex'),controlStreamSha256:controlHash.digest('hex'),finalSha256:digest(result.sim.snapshot(false)),baselineFinalSha256:digest(baselineSim.snapshot(false)),checkpoints:Object.fromEntries(Object.entries(result.checkpoints).map(([id,s])=>[id,digest(s)])),checkpointPairs,finalCheckpointSha256:digest(result.sim.checkpoint),baselineFinalCheckpointSha256:digest(baselineSim.checkpoint),complete:result.sim.mission.complete,battleClock:result.sim.battleClock});
  owner.dispose();far.dispose();material.dispose();mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.routes.at(-1)));
}
assert.equal(report.routes.length,seeds.length*2);console.log(`PASS ${report.routes.length} complete real-control A/B futures: ${out}`);
