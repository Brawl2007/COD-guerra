// H9 D4 danger sweep (2026-10-22): the time to death of a player who stands in the open or crouches in cover in sight of the German MG34s, per difficulty level, over 12 seeds, and the
// proof that every lethal wound was telegraphed (rule F1). The scenarios and the bars are tests/helpers/m01-danger.js (docs/direction/H9_DIFICULDADE.md section 6). Read-only: nothing here
// changes a simulation; each run starts from the same state on every level (the phase start is reached on recruta and re-levelled).
//   node tools/verification/m01-danger-sweep.mjs [--levels recruta,soldado,veterano] [--seeds 19390901,1,...] [--scenarios exposed/repair,covered/repair,exposed/hold,covered/hold]
//     [--override '{"soldado":{"woundDamage":25}}'] [--jsonl <file>]
// One JSON line per run (stdout, and appended to --jsonl so a restart loses nothing), then a summary per scenario and level with the section 6 verdict. Deterministic (no clocks, no paths).
import {appendFileSync} from 'node:fs';
import {M01_DIFFICULTY,F1_TELEGRAPH_GAP_SEC} from '../../src/game/m01-difficulty.js';
import {runDanger,evaluateBand,median,DANGER_SEEDS,DANGER_SCENARIOS} from '../../tests/helpers/m01-danger.js';

const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const levels=(arg('--levels')??'recruta,soldado,veterano').split(',');
const seeds=(arg('--seeds')??DANGER_SEEDS.join(',')).split(',').map(Number);
const scenarios=(arg('--scenarios')??Object.keys(DANGER_SCENARIOS).join(',')).split(',');
const jsonl=arg('--jsonl');
const override=JSON.parse(arg('--override')??'{}');
const merge=(base,o)=>{if(!o||typeof o!=='object'||Array.isArray(o)||base===null||typeof base!=='object')return o??base;const out={...base};for(const [k,v] of Object.entries(o))out[k]=merge(base[k],v);return out;};
const candidate=level=>override[level]?Object.freeze(merge(M01_DIFFICULTY[level],override[level])):null;

const rows=[];
for(const scenario of scenarios)for(const level of levels)for(const seed of seeds){
  const row=runDanger({seed,difficulty:level,scenario,candidate:candidate(level)});rows.push(row);
  const line=JSON.stringify(row);console.log(line);if(jsonl)appendFileSync(jsonl,line+'\n');
}
const summary={};
for(const scenario of scenarios)for(const level of levels){
  const rs=rows.filter(r=>r.scenario===scenario&&r.difficulty===level),kind=scenario.split('/')[0],ttds=rs.map(r=>r.died?r.ttd:Infinity),deaths=rs.filter(r=>r.died);
  const lethal=deaths.map(r=>r.killedBy),verdict=evaluateBand(level,kind,rs);
  summary[`${scenario}/${level}`]={runs:rs.length,deaths:deaths.length,medianTtd:median(ttds)===Infinity?'no death within the limit':median(ttds),minTtd:deaths.length?Math.min(...deaths.map(r=>r.ttd)):null,
    maxTtd:deaths.length?Math.max(...deaths.map(r=>r.ttd)):null,diedWalking:deaths.filter(r=>r.diedWalking).length,woundsMedian:median(rs.map(r=>r.wounds)),collisionsMedian:median(rs.map(r=>r.collisions)),
    // rule F1: every lethal wound came from a shooter engaged for >= the grace, and some telegraph (flash, crack, callout) was within the last 6 s
    lethalWounds:lethal.length,f1:lethal.length?{minEngagedFor:Math.min(...lethal.map(k=>k.engagedFor??-1)),maxSinceTelegraph:Math.max(...lethal.map(k=>k.sinceTelegraph??Infinity)),
      lethalInCutscene:lethal.filter(k=>k.scene!==null).length,gapSec:F1_TELEGRAPH_GAP_SEC}:null,
    killers:Object.fromEntries(lethal.map(k=>k.by).sort().map(by=>[by,lethal.filter(k=>k.by===by).length])),verdict};
}
// The section 6 verdict (docs/direction/H9_DIFICULDADE.md): the scenario `exposed` is "standing at an MG-visible west-bank point during repair and during hold_access", so the exposed
// median is POOLED over the repair and the hold runs (12 seeds x 2 phases), and the covered minimum over both; the per-scenario lines above are the same runs one phase at a time.
const pooled={};
for(const level of levels)for(const kind of ['exposed','covered']){
  const rs=rows.filter(r=>r.difficulty===level&&r.scenario.startsWith(kind+'/'));if(!rs.length)continue;
  const deaths=rs.filter(r=>r.died),verdict=evaluateBand(level,kind,rs),ttds=rs.map(r=>r.died?r.ttd:Infinity);
  pooled[`${kind}/${level}`]={runs:rs.length,deaths:deaths.length,medianTtd:median(ttds)===Infinity?'no death within the limit':median(ttds),minTtd:deaths.length?Math.min(...deaths.map(r=>r.ttd)):null,verdict};
}
console.log(JSON.stringify({tool:'tools/verification/m01-danger-sweep.mjs',override,pooled,summary},null,1));
