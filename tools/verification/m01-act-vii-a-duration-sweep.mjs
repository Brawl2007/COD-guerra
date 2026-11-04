// Act VII-a duration sweep (Captain's decision 2026-11-04): the pilots of tests/helpers/m01-act-route.js over many seeds and the three levels, one route per job, on worker threads.
// It measures; it writes nothing. The fight is wave start -> repelled (timers.wave.repelledAt - at, the clock of the last life: a death goes back to CP-E or CP-F and the clock with it); the act
// is done when the end card has gone (sim.clock). Pilots are not players: a number here is not a playtest.
//   node tools/verification/m01-act-vii-a-duration-sweep.mjs [--mode active|passive|both] [--levels recruta,soldado,veterano] [--set core15|held20 | --seeds 1,2,3]
//                                                              [--threads 4] [--audit] [--rows] [--out file.jsonl] [--limit 110] [--endmax 360]
//   --audit adds the clipping and stacking audits of the 18 routes (slower). Exit code 1 if the active pilot misses --limit on more than 10 % of its routes or a passive act ends after --endmax.
import {Worker,isMainThread,parentPort} from 'node:worker_threads';
import {writeFileSync} from 'node:fs';
import {ACT_SEEDS,ACT_HELD_OUT_SEEDS,MIN_FIGHT_SEC,MIN_SHARE,PASSIVE_LIMIT_SEC} from '../../tests/helpers/m01-act-seeds.js';

const r1=v=>Math.round(v*10)/10;
if(isMainThread){
  const argv=process.argv,arg=(name,def)=>{const i=argv.indexOf('--'+name);return i<0?def:argv[i+1];},flag=name=>argv.includes('--'+name);
  const modes=arg('mode','active')==='both'?['active','passive']:[arg('mode','active')],levels=arg('levels','recruta,soldado,veterano').split(',');
  const seeds=arg('seeds',null)?arg('seeds').split(',').map(Number):arg('set','core15')==='held20'?ACT_HELD_OUT_SEEDS:ACT_SEEDS;
  const limit=Number(arg('limit',MIN_FIGHT_SEC)),endMax=Number(arg('endmax',PASSIVE_LIMIT_SEC));
  const jobs=[];for(const mode of modes)for(const level of levels)for(const seed of seeds)jobs.push({mode,level,seed,audit:flag('audit')});
  const rows=[];let next=0;
  await new Promise(resolve=>{
    for(let i=0;i<Math.min(Number(arg('threads','4')),jobs.length);i++){
      const w=new Worker(new URL(import.meta.url)),feed=()=>w.postMessage(next<jobs.length?jobs[next++]:null);
      w.on('message',m=>{rows.push(m);if(rows.length===jobs.length)resolve();feed();});w.on('error',e=>{console.error(e);process.exit(1);});feed();
    }
  });
  rows.sort((a,b)=>a.mode.localeCompare(b.mode)||levels.indexOf(a.level)-levels.indexOf(b.level)||a.seed-b.seed);
  if(arg('out',null))writeFileSync(arg('out'),rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
  if(flag('rows'))for(const r of rows)console.log(JSON.stringify(r));
  let fail=false;
  for(const mode of modes){
    const R=rows.filter(r=>r.mode===mode),fights=R.map(r=>r.fight).sort((a,b)=>a-b),ok=R.filter(r=>r.fight>=limit).length,q=p=>fights[Math.min(fights.length-1,Math.floor(fights.length*p))];
    console.log(`${mode}: ${R.length} routes, ${R.filter(r=>r.complete).length} complete | fight min ${fights[0]} p10 ${q(.1)} median ${q(.5)} max ${fights.at(-1)} | >= ${limit} s: ${ok}/${R.length} (${r1(ok/R.length*100)} %) | act ends at most ${Math.max(...R.map(r=>r.end))} s | deaths ${R.reduce((n,r)=>n+r.deaths,0)}`+
      (flag('audit')?` | clipping events ${R.reduce((n,r)=>n+r.clipping,0)}, stacked pairs ${R.reduce((n,r)=>n+r.stacked,0)}`:''));
    for(const level of levels){const L=R.filter(r=>r.level===level),v=L.map(r=>r.fight).sort((a,b)=>a-b);console.log(`   ${level}: fight ${v[0]}..${v.at(-1)}, under ${limit} s: ${L.filter(r=>r.fight<limit).length}/${L.length}, act ends at most ${Math.max(...L.map(r=>r.end))} s`);}
    if(mode==='active'&&ok/R.length<MIN_SHARE)fail=true;
    if(mode==='passive'&&R.some(r=>!r.complete||r.end>endMax))fail=true;
  }
  process.exit(fail?1:0);
}else{
  const {M01AreaSimulation}=await import('../../src/game/m01-area-sim.js');
  const {actControls,ACT_TICK}=await import('../../tests/helpers/m01-act-route.js');
  const {areaClippingAudit}=await import('../../tests/helpers/m01-act-audit.js');
  const {stackingAudit}=await import('../../tests/helpers/m01-clipping.js');
  parentPort.on('message',job=>{
    if(job===null)process.exit(0);
    const {mode,level,seed,audit}=job,sim=new M01AreaSimulation(seed,{difficulty:level}),state={arrived:false,lastHealth:100},clip=audit?areaClippingAudit():null,stack=audit?stackingAudit():null;
    let deaths=0,guard=0,lullBursts=0;
    while(!sim.mission.complete&&guard++<60000){
      sim.tick(ACT_TICK,actControls(sim,mode,state));if(clip){clip.observe({sim});stack.observe({sim});}
      const W=sim.timers.wave;
      for(const e of sim.drainEvents()){if(e.type==='player-down')deaths++;if(e.type==='enemy-fire'&&e.kind==='area'&&W&&W.echs[0].brokenAt!==null&&W.ech===0)lullBursts++;}
    }
    const W=sim.timers.wave,E=W.echs;
    parentPort.postMessage({mode,level,seed,complete:sim.mission.complete,fight:r1(W.repelledAt-W.at),end:r1(sim.clock),first:r1(E[0].brokenAt-E[0].at),pause:E[1]?r1(E[1].at-E[0].brokenAt):null,second:E[1]?r1(E[1].brokenAt-E[1].at):null,
      deaths,germansDown:W.casualties,polesDown:sim.allies.filter(a=>!a.alive).length,lullBursts,checkpoints:[...sim.checkpointsReached],clipping:clip?clip.report().length:null,stacked:stack?stack.summary().pairs:null});
  });
}
