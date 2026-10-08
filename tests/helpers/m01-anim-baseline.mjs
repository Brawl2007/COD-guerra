// Reproduce the approved-source A/B proof; not invoked by npm test and never writes production history.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,unlinkSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {route} from './m01-route.js';
import {gameplayFrame,GameplayDigest} from './m01-animation-contract.js';
import {firstDifference} from './m01-determinism.js';

const base='99309d9cb023cc94a07d41ff863e1362e4460570';
const temp=fileURLToPath(new URL('../../src/game/.m01-anim-approved-base.js',import.meta.url));
const source=execFileSync('git',['show',base+':src/game/m01-simulation.js'],{encoding:'utf8'});
writeFileSync(temp,source);
const golden={base,sourceSha256:createHash('sha256').update(source).digest('hex'),routes:[]};
const report={task:'M01-ANIM-CONTRACT-SIM-V1',base,sourceSha256:golden.sourceSha256,routes:[],firstDivergence:null};
try{
  const {M01Simulation:ApprovedSimulation}=await import(pathToFileURL(temp));
  for(const [seed,support] of [[19390901,false],[7,true]]){
    const candidate=new M01Simulation(seed),trace=new GameplayDigest();let ticks=0,maxSpeed=0;
    assert.deepEqual(gameplayFrame(candidate),gameplayFrame(new ApprovedSimulation(seed)));
    const result=route(seed,{support,Simulation:ApprovedSimulation,onStep:({sim,controls,events,dt})=>{
      candidate.tick(dt,controls);const candidateEvents=candidate.drainEvents();ticks++;
      const a=gameplayFrame(sim,events),b=gameplayFrame(candidate,candidateEvents);
      if(JSON.stringify(a)!==JSON.stringify(b))assert.fail(JSON.stringify({seed,support,tick:ticks,difference:firstDifference(a,b)}));
      trace.add(a);
      for(const actor of candidate.actors)maxSpeed=Math.max(maxSpeed,actor.motion.speed);
    }});
    golden.routes.push({seed,support,...trace.finish()});
    report.routes.push({seed,support,ticks,gameplayBytesEqual:true,checkpoints:result.sim.checkpointsReached,
      actorIdsEqual:true,rngEqual:candidate.rng.state===result.sim.rng.state,finalClock:candidate.clock,maxEffectiveRootSpeed:maxSpeed});
    console.log(JSON.stringify(report.routes.at(-1)));
  }
  if(process.argv.includes('--write-golden')){
    mkdirSync(new URL('../fixtures/',import.meta.url),{recursive:true});
    writeFileSync(new URL('../fixtures/m01-anim-gameplay-baseline.json',import.meta.url),JSON.stringify(golden,null,2)+'\n');
  }else assert.deepEqual(JSON.parse(readFileSync(new URL('../fixtures/m01-anim-gameplay-baseline.json',import.meta.url))),golden);
  if(process.env.M01_ANIM_BASELINE_REPORT)writeFileSync(process.env.M01_ANIM_BASELINE_REPORT,JSON.stringify(report,null,2)+'\n');
}finally{unlinkSync(temp);}
