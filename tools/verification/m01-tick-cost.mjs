// M01 simulation tick cost on the two golden routes (seed 19390901 control, seed 7 with the covering-fire pilot). Not run by npm test; wall-clock numbers of the machine they ran on.
// The simulation tick only (the pilot's work is outside the timer). Each route is run --runs times and every tick keeps its MINIMUM over the runs (the simulation is deterministic, so a
// tick is the same work in every run; what a loaded machine adds to it is not). Reports per route: ticks, mean, p99, max, ticks over 5 ms, the mean of the combat window
// (battle clock 04:45:00-06:10:00) and the five slowest ticks with their battle clock.
//   node tools/verification/m01-tick-cost.mjs [--rev <git rev>] [--runs 3]
import {execFileSync} from 'node:child_process';
import {mkdtempSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
const ROOT=resolve(import.meta.dirname,'../..');
const arg=(k,d)=>{const i=process.argv.indexOf(k);return i<0?d:process.argv[i+1];};
const rev=arg('--rev',null),runs=Number(arg('--runs','3'));
let root=ROOT;
if(rev){root=mkdtempSync(join(tmpdir(),'m01-tick-cost-'));
  const data=execFileSync('git',['-C',ROOT,'ls-tree','-r','--name-only',rev,'assets','research'],{encoding:'utf8',maxBuffer:1<<26}).split('\n').filter(p=>p.endsWith('.json'));
  execFileSync('tar',['-x','-C',root],{input:execFileSync('git',['-C',ROOT,'archive','--format=tar',rev,'src','missions','tests/helpers',...data],{maxBuffer:1<<29})});
  symlinkSync(join(ROOT,'node_modules'),join(root,'node_modules'));}
const {M01Simulation}=await import(pathToFileURL(join(root,'src/game/m01-simulation.js')));
const {route}=await import(pathToFileURL(join(root,'tests/helpers/m01-route.js')));
const clockText=s=>new Date(Math.round(s)*1000).toISOString().slice(11,19);
const out={tool:'tools/verification/m01-tick-cost.mjs',rev:rev??'working-tree',runs,routes:[]};
for(const [seed,support] of [[19390901,false],[7,true]]){
  let best=null,battle=null;
  for(let r=0;r<runs;r++){
    const times=[],bc=[];
    class Timed extends M01Simulation{tick(dt,c){const t=performance.now();super.tick(dt,c);times.push(performance.now()-t);bc.push(this.battleClock);}}
    route(seed,{support,Simulation:Timed});
    if(!best){best=times;battle=bc;}else for(let i=0;i<best.length;i++)best[i]=Math.min(best[i],times[i]);
  }
  const sorted=[...best].sort((a,b)=>a-b),mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length,r3=v=>+v.toFixed(3);
  const combat=best.filter((_,i)=>battle[i]>=4*3600+45*60&&battle[i]<6*3600+10*60);
  const slow=best.map((t,i)=>[t,i]).sort((a,b)=>b[0]-a[0]).slice(0,5).map(([t,i])=>({ms:r3(t),tick:i+1,battleClock:clockText(battle[i])}));
  out.routes.push({seed,support,ticks:best.length,meanMs:r3(mean(best)),p99Ms:r3(sorted[Math.floor(.99*(sorted.length-1))]),maxMs:r3(sorted.at(-1)),over5ms:best.filter(t=>t>5).length,
    combatWindowMeanMs:r3(mean(combat)),slowest:slow});
}
console.log(JSON.stringify(out,null,1));
