// M01-CKM-JAM-V1 (2026-10-22, golden amendment 13): what the ckm stoppages do, on the two golden routes and on the 24 audit routes (12 seeds x {control route, covering-fire pilot}), driven by
// the real test pilot (tests/helpers/m01-route.js). Read-only: nothing here changes a simulation. Not run by npm test. Deterministic JSON (no clocks, no paths).
//   node tools/verification/m01-ckm-jam-audit.mjs [--jobs 4] [--seeds 19390901,1,...,11] [--out <file>]
// Every route is run twice from the same seed and the same pilot: WITH the stoppage table (the live simulation) and WITHOUT it (the same class with ckmJamDue() switched off, which is,
// tick for tick, the amendment 12 simulation: the golden routes reproduce its 23746 / 21660 ticks). The difference between the two is the measured effect of the stoppages.
// Per run: the stoppages (battle clock, real clock, the bursts fired before, the player's distance to the gunner), the lines 114 / 115 that reached the screen, and what the gun did: bursts,
// rounds, the Germans it hit and killed and how often its rounds pinned one (CKM_SUPPRESS_SEC), plus the length of the route and the survivors. Routes are chaotic (any change of timing moves
// every later draw of the Germans), so a single route proves little about the size of an effect: the means over the 24 routes, with their spread, are the measure.
// On the two golden routes a third run, `p2`, is a WHAT-IF and not part of the shipped game: the live simulation with the priority of line 115 raised from 3 to 2 (patched in the compiled rule, in that child only), to
// show how much of the director's silence on the answer is its priority-3 budget (5 lines in 60 s, the call itself counting one). The data of mission.json is not touched.
// Child processes (one route each, `--one seed support variant`) run `--jobs` at a time.
import {spawn} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {M01Simulation,seconds,clockText,CKM_STOPPAGES} from '../../src/game/m01-simulation.js';
import {BARK_RULES} from '../../src/game/m01-barks.js';
import {route} from '../../tests/helpers/m01-route.js';

const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const ROOT=resolve(import.meta.dirname,'../..'),SELF=import.meta.filename;
const r1=v=>Math.round(v*10)/10,r2=v=>Math.round(v*100)/100;
const FROM=seconds('04:46:00'),TO=seconds('06:09:30');

/** The live simulation, or the same with the stoppages switched off, recording what each of the gun's rounds did (the same observer as tests/m01-ckm-live-fire.test.js). */
function makeSimulation(variant){
  class Recording extends M01Simulation{
    ckmImpact(r){
      const before=new Map(this.enemies.map(a=>[a.id,{health:a.health,until:a.suppressedUntil,alive:a.alive}]));
      super.ckmImpact(r);
      const log=this.ckmLog??=[];
      for(const a of this.enemies){const b=before.get(a.id);
        if(a.health<b.health)log.push(b.alive&&!a.alive?'kill':'hit');
        if(a.suppressedUntil>b.until)log.push('suppressed');}
    }
  }
  return variant==='nojam'?class extends Recording{ckmJamDue(){return false;}}:Recording;
}
function runOne(seed,support,variant){
  if(variant==='p2')BARK_RULES.get('dlg_m01_115').priority=2;
  const stoppages=[],lines=[];let bursts=0,stoppedSec=0;const shown=new Set();
  const result=route(seed,{support,Simulation:makeSimulation(variant),onStep:({sim,events})=>{
    const g=sim.actor('ckm_gunner');
    for(const e of events){
      if(e.type==='ckm_stoppage')stoppages.push({n:e.n,battle:clockText(sim.battleClock),clock:r2(e.at),sec:r2(e.clearAt-e.at),burstsBefore:g.ckmFire.bursts,
        playerM:r1(Math.hypot(sim.player.x-g.x,sim.player.z-g.z))});
      if(e.type==='ckm_stoppage_cleared'){stoppages.at(-1).clearedAt=r2(e.at);stoppedSec+=e.at-stoppages.at(-1).clock;}
      if(e.type==='ally-fire')bursts++;
    }
    const s=sim.subtitle;
    if(s&&/^dlg_m01_11[45]$/.test(s.id)&&!shown.has(s.id+s.until)){shown.add(s.id+s.until);lines.push({id:s.id,at:r2(s.until-s.duration),stoppage:stoppages.length});}
  }});
  const sim=result.sim,log=sim.ckmLog??[],count=k=>log.filter(x=>x===k).length;
  // The window of fire in real seconds is not a constant (the hold is compressed 24x): measured from the first burst allowed to the last.
  // The plot, to compare run with run: the 12 objective states, the checkpoints in order, the events consumed, the plot flags (the rotating cover hint left out), the final battle clock.
  const plot=Object.fromEntries(Object.entries(sim.flags).filter(([k])=>k!=='m01.suggested_cover').sort());
  return {seed,support,variant,ticks:Math.round(sim.clock/.05),realSec:r1(sim.clock),complete:sim.mission.complete,survivors:sim.flags['m01.east_platoon_survivors'],playerHealth:sim.player.health,
    bursts,rounds:bursts*8,hits:count('hit')+count('kill'),kills:count('kill'),pinned:count('suppressed'),stoppages,stoppedRealSec:r2(stoppedSec),lines,
    plot:{objectives:Object.fromEntries(Object.entries(sim.objectives).map(([id,o])=>[id.replace('obj_m01_',''),o.state])),checkpoints:[...sim.checkpointsReached],
      consumed:Object.keys(sim.consumed).sort(),flags:plot,finalBattleClock:clockText(sim.battleClock)}};
}

if(arg('--one')!==null||process.argv.includes('--one')){
  const i=process.argv.indexOf('--one'),[seed,support,variant]=process.argv.slice(i+1,i+4);
  console.log(JSON.stringify(runOne(Number(seed),support==='1',variant)));
}else{
  const jobs=Number(arg('--jobs')??4),seeds=(arg('--seeds')??'19390901,1,2,3,4,5,6,7,8,9,10,11').split(',').map(Number);
  const OUT=resolve(arg('--out')??join(ROOT,'docs/verification/m01-runtime/ckm-jam-2026-10-22/CKM_JAM_ROUTES.json'));
  // The two golden routes first (seed 19390901 control, seed 7 with the covering-fire pilot), then the 24 audit routes (the golden control route is one of them).
  const plan=[[19390901,false],[7,true],...seeds.flatMap(seed=>[false,true].map(support=>[seed,support]))];
  const unique=plan.filter(([seed,support],i)=>plan.findIndex(([s,p])=>s===seed&&p===support)===i);
  const golden=new Set(['19390901/false','7/true']);   // the what-if (p2) runs on the two golden routes only: it changes what is said, never what happens
  const queue=unique.flatMap(([seed,support])=>['jam','nojam',...(golden.has(`${seed}/${support}`)?['p2']:[])].map(variant=>({seed,support,variant}))),done=new Map();
  await new Promise((resolveAll,rejectAll)=>{
    let running=0;
    const next=()=>{
      if(!queue.length&&running===0)return resolveAll();
      while(running<jobs&&queue.length){
        const job=queue.shift();running++;
        const child=spawn(process.execPath,[SELF,'--one',String(job.seed),job.support?'1':'0',job.variant],{stdio:['ignore','pipe','inherit']});
        let out='';child.stdout.on('data',d=>{out+=d;});
        child.on('close',code=>{
          running--;
          if(code!==0)return rejectAll(new Error(`route ${job.seed} support ${job.support} ${job.variant} failed (${code})`));
          const row=JSON.parse(out.trim().split('\n').at(-1));done.set(`${job.seed}/${job.support}/${job.variant}`,row);
          console.error(`done ${done.size}/${unique.length*2+golden.size}: ${job.seed} support ${job.support} ${job.variant}`);next();
        });
      }
    };
    next();
  });
  const pair=([seed,support])=>({seed,support,jam:done.get(`${seed}/${support}/jam`),nojam:done.get(`${seed}/${support}/nojam`),...(done.has(`${seed}/${support}/p2`)?{whatIf115Priority2:done.get(`${seed}/${support}/p2`)}:{})});
  const rows=unique.map(pair);
  const delta=(a,b)=>({ticks:a.ticks-b.ticks,realSec:r1(a.realSec-b.realSec),bursts:a.bursts-b.bursts,rounds:a.rounds-b.rounds,hits:a.hits-b.hits,kills:a.kills-b.kills,pinned:a.pinned-b.pinned});
  for(const row of rows)row.delta=delta(row.jam,row.nojam);
  const stat=(xs)=>{const n=xs.length,mean=xs.reduce((a,b)=>a+b,0)/n,sd=Math.sqrt(xs.reduce((a,b)=>a+(b-mean)**2,0)/Math.max(1,n-1));return {n,mean:r2(mean),sd:r2(sd),min:Math.min(...xs),max:Math.max(...xs)};};
  const pick=k=>rows.map(r=>r.delta[k]);
  const summary={routes:rows.length,
    stoppagesPerRoute:stat(rows.map(r=>r.jam.stoppages.length)),
    stoppagesInWindow:rows.every(r=>r.jam.stoppages.every(s=>seconds(s.battle)>=FROM&&seconds(s.battle)<TO)),
    stoppedRealSec:stat(rows.map(r=>r.jam.stoppedRealSec)),
    withStoppages:{bursts:stat(rows.map(r=>r.jam.bursts)),hits:stat(rows.map(r=>r.jam.hits)),kills:stat(rows.map(r=>r.jam.kills)),pinned:stat(rows.map(r=>r.jam.pinned))},
    withoutStoppages:{bursts:stat(rows.map(r=>r.nojam.bursts)),hits:stat(rows.map(r=>r.nojam.hits)),kills:stat(rows.map(r=>r.nojam.kills)),pinned:stat(rows.map(r=>r.nojam.pinned))},
    delta:{bursts:stat(pick('bursts')),rounds:stat(pick('rounds')),hits:stat(pick('hits')),kills:stat(pick('kills')),pinned:stat(pick('pinned')),realSec:stat(pick('realSec'))},
    allComplete:rows.every(r=>r.jam.complete&&r.nojam.complete),
    survivorsEqual:rows.every(r=>r.jam.survivors===r.nojam.survivors),
    // The invariants of the amendment, on every route: the same 12 objective states, CP-A..D, events, plot flags and 07:05:00 with and without the stoppages.
    plotEqual:rows.filter(r=>JSON.stringify(r.jam.plot)!==JSON.stringify(r.nojam.plot)).map(r=>`${r.seed}/${r.support}`),
    lines:{l114:rows.reduce((n,r)=>n+r.jam.lines.filter(l=>l.id==='dlg_m01_114').length,0),l115:rows.reduce((n,r)=>n+r.jam.lines.filter(l=>l.id==='dlg_m01_115').length,0),
      stoppages:rows.reduce((n,r)=>n+r.jam.stoppages.length,0)},
    whatIf115Priority2:{routes:rows.filter(r=>r.whatIf115Priority2).length,
      l114:rows.reduce((n,r)=>n+(r.whatIf115Priority2?.lines.filter(l=>l.id==='dlg_m01_114').length??0),0),l115:rows.reduce((n,r)=>n+(r.whatIf115Priority2?.lines.filter(l=>l.id==='dlg_m01_115').length??0),0),
      stoppages:rows.reduce((n,r)=>n+(r.whatIf115Priority2?.stoppages.length??0),0)}};
  for(const r of rows){r.plotEqual=JSON.stringify(r.jam.plot)===JSON.stringify(r.nojam.plot);for(const v of [r.jam,r.nojam,r.whatIf115Priority2])if(v)delete v.plot;}   // (kept in the output as one flag per route)
  const text=JSON.stringify({task:'M01-CKM-JAM-V1',what:'the ckm stoppage table (CKM_STOPPAGES) against the same routes without it; deterministic, no clock, no path',table:CKM_STOPPAGES,summary,routes:rows},null,2)+'\n';
  mkdirSync(dirname(OUT),{recursive:true});writeFileSync(OUT,text);console.log(`written ${OUT}`);
}
