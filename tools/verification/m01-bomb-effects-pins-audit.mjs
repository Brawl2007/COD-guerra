// M01-BOMB-EFFECTS-V1 (R1-a, 2026-10-23, golden amendment 16): the repair pins and the share of the repair in which the gate MG is kept down, of the two cover routes of tests/helpers/m01-cover.js
// (`help`: keeps the gate MG down; `ignore`: never fires), over the 12 audited seeds, with the bombs' effects and the 04:34 schedule (the live simulation) and without them (the same class with
// updateEarlyRaid() and bombEffects() switched off, which is the amendment 15 simulation for everything these routes read). The stun delays the pilot by a few seconds before the repair, and a route is
// chaotic (any change of timing moves every later draw of the Germans), so a single seed's pins and MG share are not a property: what is compared is the distribution over the seeds. Read-only; not run by npm test.
//   node tools/verification/m01-bomb-effects-pins-audit.mjs [--jobs 2] [--seeds 19390901,1,...,11] [--out <file>]
// Child processes (one route each, `--one seed mode variant`) run `--jobs` at a time. The JSON is deterministic (no clocks, no paths); rows are sorted by seed, variant and mode.
import {spawn} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {coverRoute} from '../../tests/helpers/m01-cover.js';

const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const ROOT=resolve(import.meta.dirname,'../..'),SELF=import.meta.filename;
const SEEDS=(arg('--seeds')??'19390901,1,2,3,4,5,6,7,8,9,10,11').split(',').map(Number);
const OUT=resolve(ROOT,arg('--out')??'docs/verification/m01-runtime/bomb-effects-2026-10-23/COVER_PINS_12_SEEDS.json');
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length,sd=a=>{const m=mean(a);return Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/(a.length-1));};
const r1=v=>Math.round(v*10)/10;

if(process.argv[2]==='--one'){
  const [seed,mode,variant]=[Number(process.argv[3]),process.argv[4],process.argv[5]];
  class NoBombs extends M01Simulation{updateEarlyRaid(){}bombEffects(){return {casualties:{killed:[],wounded:[],suppressed:[]},concussion:0};}}
  const {sim,stats}=coverRoute(seed,mode,{Simulation:variant==='nobombs'?NoBombs:M01Simulation});
  console.log(JSON.stringify({seed,mode,variant,pins:stats.repair.pins,realSeconds:stats.repair.realSeconds,end:stats.repair.end,mgSuppressedPct:stats.repairMgSuppressedPct,survivors:stats.survivors,
    shots:stats.shots,deliveredAt:Math.round(stats.repair.deliveredAt*100)/100}));
}else{
  const jobs=Number(arg('--jobs')??2),todo=[];
  for(const seed of SEEDS)for(const variant of ['bombs','nobombs'])for(const mode of ['help','ignore'])todo.push([seed,mode,variant]);
  const rows=[];let next=0,running=0;
  const finish=()=>{
    const by=new Map();for(const r of rows)by.set(`${r.seed}/${r.variant}/${r.mode}`,r);
    const per=(variant)=>SEEDS.map(seed=>{const h=by.get(`${seed}/${variant}/help`),i=by.get(`${seed}/${variant}/ignore`);
      return {seed,helpPins:h.pins,ignorePins:i.pins,pinsGap:i.pins-h.pins,helpSeconds:h.realSeconds,ignoreSeconds:i.realSeconds,secondsGap:r1(i.realSeconds-h.realSeconds),
        helpMgPct:h.mgSuppressedPct,ignoreMgPct:i.mgSuppressedPct,helpShots:h.shots};});
    const summary=variant=>{const p=per(variant),g=p.map(x=>x.pinsGap);
      return {perSeed:p,pinsGap:{mean:r1(mean(g)),sd:r1(sd(g)),min:Math.min(...g),max:Math.max(...g),seedsAtLeast11:g.filter(v=>v>=11).length,seedsAtLeast5:g.filter(v=>v>=5).length},
        secondsGap:{mean:r1(mean(p.map(x=>x.secondsGap))),coveringFaster:p.filter(x=>x.secondsGap>0).length},
        helpMgPct:{mean:r1(mean(p.map(x=>x.helpMgPct))),min:Math.min(...p.map(x=>x.helpMgPct)),seedsAtLeast80:p.filter(x=>x.helpMgPct>=80).length},
        ignoreMgPct:{mean:r1(mean(p.map(x=>x.ignoreMgPct))),max:Math.max(...p.map(x=>x.ignoreMgPct)),seedsAtMost20:p.filter(x=>x.ignoreMgPct<=20).length}};};
    const bombs=summary('bombs'),nobombs=summary('nobombs'),d=bombs.perSeed.map((x,i)=>x.pinsGap-nobombs.perSeed[i].pinsGap);
    const result={task:'M01-BOMB-EFFECTS-V1',what:'repair pins and gate-MG share of tests/helpers/m01-cover.js (help / ignore) over the audited seeds, with (bombs) and without (nobombs) the bombs\' effects and the 04:34 schedule',seeds:SEEDS,bombs,nobombs,
      pairedPinsGapDifference:{mean:r1(mean(d)),standardError:r1(sd(d)/Math.sqrt(d.length))},
      rows:rows.slice().sort((a,b)=>a.seed-b.seed||a.variant.localeCompare(b.variant)||a.mode.localeCompare(b.mode))};
    mkdirSync(dirname(OUT),{recursive:true});writeFileSync(OUT,JSON.stringify(result,null,1)+'\n');console.log(`written ${OUT}`);
  };
  const launch=()=>{
    while(running<jobs&&next<todo.length){
      const job=todo[next++];running++;
      const child=spawn(process.execPath,[SELF,'--one',...job.map(String)],{cwd:ROOT});
      let out='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>out+=d);
      child.on('close',code=>{running--;
        if(code!==0){console.error(`child ${job.join(' ')} failed: ${out.slice(-400)}`);process.exit(1);}
        rows.push(JSON.parse(out.trim().split('\n').at(-1)));
        if(next>=todo.length&&running===0)finish();else launch();});
    }
  };
  launch();
}
