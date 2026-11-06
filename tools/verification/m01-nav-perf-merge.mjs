// Merges runs of tools/verification/m01-nav-perf.mjs --ticks PREFIX into one figure per tick: the MINIMUM over the runs. The simulation is deterministic, so tick i is the same work in every
// run; on a machine that other jobs share, what separates the runs is the time the process spent waiting, not working, and the minimum is the closest the machine lets us get to the work.
// It is a lower bound: a hitch that exists in every run (a plan, a checkpoint) survives it, one that was only a preemption does not. Reported next to the worst single run, never instead of it.
//   node tools/verification/m01-nav-perf-merge.mjs --label NAME --out FILE PREFIX1 PREFIX2 ...
import {readFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(2);let label='',out=null;const prefixes=[];
for(let i=0;i<args.length;i++){if(args[i]==='--label')label=args[++i];else if(args[i]==='--out')out=args[++i];else prefixes.push(args[i]);}
const round=(v,d=3)=>+v.toFixed(d);
const load=file=>{const b=readFileSync(file);return new Float32Array(b.buffer,b.byteOffset,b.byteLength/4);};
const stat=a=>{const s=[...a].sort((x,y)=>x-y),q=p=>s[Math.min(s.length-1,Math.floor(p*s.length))];
  return {ticks:s.length,mean:round(s.reduce((x,y)=>x+y,0)/s.length,4),p50:round(q(.5),4),p99:round(q(.99),4),p999:round(q(.999),4),max:round(s.at(-1)),
    over5ms:s.filter(x=>x>5).length,over16ms:s.filter(x=>x>16).length};};
const result={tool:'tools/verification/m01-nav-perf-merge.mjs',label,runs:prefixes.length,groups:{}};
for(const group of ['route0','route1','free']){
  const runs=prefixes.map(p=>load(`${p}.${group}.f32`));
  if(new Set(runs.map(r=>r.length)).size!==1)throw new Error(`${group}: the runs have different tick counts (${runs.map(r=>r.length)}): not the same simulation`);
  const min=new Float32Array(runs[0].length).map((_,i)=>Math.min(...runs.map(r=>r[i])));
  result.groups[group]={perTickMinimum:stat(min),eachRun:runs.map(r=>stat(r))};
}
if(out)writeFileSync(out,JSON.stringify(result,null,1)+'\n');
console.log(JSON.stringify(result.groups,(k,v)=>k==='eachRun'?v.map(r=>`max ${r.max} p99 ${r.p99}`):v));
