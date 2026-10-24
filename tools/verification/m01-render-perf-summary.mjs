// Summarises the JSON lines written by m01-render-perf-bench.mjs (one object per run): per quality tier and batching on/off, the median over runs
// of every metric. Usage: node tools/verification/m01-render-perf-summary.mjs bench-runs.jsonl
import {readFileSync} from 'node:fs';
const rows=readFileSync(process.argv[2],'utf8').trim().split('\n').map(l=>JSON.parse(l));
const median=a=>{const s=[...a].sort((x,y)=>x-y);return s[s.length>>1];};
const groups=new Map();
for(const r of rows){const k=`${r.quality}|${r.batching?'after':'before'}`;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
const out=[];
for(const q of ['high','medium','low'])for(const mode of ['before','after']){
  const g=groups.get(`${q}|${mode}`);if(!g)continue;
  const m=f=>median(g.map(f));
  out.push({quality:q,mode,runs:g.length,instances:g[0].instances,lodBands:g[0].lodBands.join('/'),
    drawCallsTotal:g[0].drawCalls.total,drawCallsPerSoldier:g[0].drawCalls.perSoldierMean,triangles:g[0].triangles.total,
    updateMedianMs:+m(r=>r.updateMs.median).toFixed(4),updateMeanMs:+m(r=>r.updateMs.mean).toFixed(4),updateP95Ms:+m(r=>r.updateMs.p95).toFixed(4),
    heapBytesPerUpdate:m(r=>r.heapBytesPerUpdate),updateMedianRange:[+Math.min(...g.map(r=>r.updateMs.median)).toFixed(3),+Math.max(...g.map(r=>r.updateMs.median)).toFixed(3)]});
}
console.table(out.map(o=>({...o,updateMedianRange:o.updateMedianRange.join('..')})));
console.log(JSON.stringify(out));
