// Exact D3 pressure baseline; --compare-only never re-runs gameplay. No table or gameplay overrides.
import {readFileSync,writeFileSync,mkdtempSync,symlinkSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const ROOT=resolve(import.meta.dirname,'../..'),commit='8ebc9086f8429fdc3197b88bd136411840d32cc4';
const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const file=arg('--baseline')??'/tmp/m01-d3-danger-baseline.json',afterFile=arg('--after'),out=arg('--out')??'/tmp/m01-danger-comparison.json';
const sha=b=>createHash('sha256').update(b).digest('hex');
if(!process.argv.includes('--compare-only')){
 const git=(...args)=>execFileSync('git',['-C',ROOT,...args],{maxBuffer:1<<29}),dir=mkdtempSync(join(tmpdir(),'m01-d4-pressure-before-'));
 const data=git('ls-tree','-r','--name-only',commit,'assets','research').toString().split('\n').filter(p=>p.endsWith('.json'));
 execFileSync('tar',['-x','-C',dir],{input:git('archive','--format=tar',commit,'src','missions','tests/helpers',...data)});symlinkSync(join(ROOT,'node_modules'),join(dir,'node_modules'));
 const {M01Simulation}=await import(pathToFileURL(join(dir,'src/game/m01-simulation.js'))),{route}=await import(pathToFileURL(join(dir,'tests/helpers/m01-route.js')));
 const rows=[];class Death extends Error{}
 for(const level of ['soldado','veterano'])for(const seed of [19390901,1,2,3,4,5,6,7,8,9,10,11])for(const support of [false,true]){
  let s=null,minHealth=100,error=null,complete=false;
  class Before extends M01Simulation{constructor(seed){super(seed,{difficulty:level});s=this;}woundPlayer(r){const health=this.player.health;super.woundPlayer(r);if(!this.player.alive)this.death={by:r.by,kind:r.kind,health,clock:this.clock};}}
  try{complete=route(seed,{support,Simulation:Before,onStep:({sim})=>{minHealth=Math.min(minHealth,sim.player.health);if(!sim.player.alive)throw new Death();}}).sim.mission.complete;}
  catch(e){if(!(e instanceof Death))error=e.message;}
  const end=s.snapshot(false);for(const e of Object.values(end.timers.telegraph??{}))delete e.cue;
  const row={level,seed,support,complete,died:!s.player.alive,clock:s.clock,health:s.player.health,minHealth,rngState:s.rng.state,endGameplayHash:sha(JSON.stringify(end)),death:s.death??null,error};rows.push(row);console.log(JSON.stringify(row));
 }
 writeFileSync(file,JSON.stringify({sourceCommit:commit,sourceSha256:sha(readFileSync(join(dir,'src/game/m01-simulation.js'))),method:'exact published D3 simulation and helper; normal controls, no HP/clock/event/LOS/table override; observer ends at first real death',rows},null,2)+'\n');
}
if(afterFile&&existsSync(afterFile)){
 const before=JSON.parse(readFileSync(file)),after=JSON.parse(readFileSync(afterFile));if(after.inputsSha256['src/game/m01-simulation.js']!==sha(readFileSync(join(ROOT,'src/game/m01-simulation.js'))))throw Error('comparison must use the audited current runtime');
 const rows=before.rows.map(b=>{const a=after.rows.find(a=>a.level===b.level&&a.seed===b.seed&&a.support===b.support);if(!a)throw Error('missing same-seed/level/control comparison');
  return {level:b.level,seed:b.seed,support:b.support,before:b,after:{complete:a.complete,died:a.died,clock:a.clock,health:a.health,minHealth:a.minHealth,rngState:a.rngState,endGameplayHash:a.endGameplayHash},newDeath:a.died&&!b.died,earlierDeath:a.died&&b.died&&a.clock<b.clock-1e-7,survivingRouteDifference:a.complete&&b.complete&&(a.endGameplayHash!==b.endGameplayHash||a.rngState!==b.rngState)};});
 const summary={routes:rows.length,newDeaths:rows.filter(r=>r.newDeath),earlierDeaths:rows.filter(r=>r.earlierDeath),survivingRouteDifferences:rows.filter(r=>r.survivingRouteDifference),rescuedRoutes:rows.filter(r=>r.before.died&&r.after.complete).map(r=>({level:r.level,seed:r.seed,support:r.support})),
  delayedDeaths:rows.filter(r=>r.before.died&&r.after.died&&r.after.clock>r.before.clock+1e-7).map(r=>({level:r.level,seed:r.seed,support:r.support,beforeClock:r.before.clock,afterClock:r.after.clock}))};
 writeFileSync(out,JSON.stringify({task:'M01-H9-D4-FAIR-DEATH-V1',beforeCommit:commit,beforeSourceSha256:before.sourceSha256,afterSourceSha256:after.inputsSha256['src/game/m01-simulation.js'],strippedForEndHash:['timers.telegraph[by].cue only; D2 engagement fields, HP, RNG, actors, objectives and clocks retained'],summary,rows},null,2)+'\n');console.log(JSON.stringify(summary));
 if(summary.newDeaths.length||summary.earlierDeaths.length||summary.survivingRouteDifferences.length)process.exitCode=1;
}
