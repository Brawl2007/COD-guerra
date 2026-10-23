// M01-BOMB-EFFECTS-V1 (R1-a, 2026-10-23, golden amendment 16): what the aerial bombs of the 04:34 raid do on the two golden routes and on 12 more routes (6 seeds x {control route, covering-fire pilot}),
// driven by the real test pilot (tests/helpers/m01-route.js). Read-only: nothing here changes a simulation. Not run by npm test. Deterministic JSON (no clocks, no paths).
//   node tools/verification/m01-bomb-effects-audit.mjs [--jobs 4] [--seeds 19390901,1,2,3,4,5,6] [--out <file>]
// Every route is run twice from the same seed and the same pilot: WITH the bomb effects and the 04:34 schedule (the live simulation) and WITHOUT them (the same class with updateEarlyRaid() and
// bombEffects() switched off, which is the simulation of amendment 15 for the plot: no man is touched, the player is not stunned, the ten extra impacts do not fall). The difference is the measured
// effect; the invariants of the plot (the 12 objective states, CP-A..D, the events consumed, the plot flags, the survivors, 07:05:00) must be the same with and without.
// Per route and per impact of the window 04:33:59-04:44:30: the battle and real clock, where it fell, how far from the player, how hard it stunned him, and whom it killed, wounded and shook. Casualties
// are GAMEPLAY_DRAMATIZATION (no source gives Polish losses): these numbers are the behaviour of the simulation on a test pilot, never a count of anything real.
import {spawn} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import definition from '../../missions/m01-tczew/mission.json' with {type:'json'};
import {M01Simulation,seconds,clockText} from '../../src/game/m01-simulation.js';
import {castIds} from '../../src/game/m01-blast.js';
import {route} from '../../tests/helpers/m01-route.js';

const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const ROOT=resolve(import.meta.dirname,'../..'),SELF=import.meta.filename;
const r1=v=>Math.round(v*10)/10,r2=v=>Math.round(v*100)/100,r3=v=>Math.round(v*1000)/1000;
const FROM=seconds('04:33:59'),TO=seconds('04:44:30'),CAST=castIds(definition);

/** The live simulation, or the same with the bombs' effects and the extra schedule switched off (the simulation of amendment 15 for everything the plot reads). */
function makeSimulation(variant){
  return variant==='nobombs'?class extends M01Simulation{
    updateEarlyRaid(){}
    bombEffects(){return {casualties:{killed:[],wounded:[],suppressed:[]},concussion:0};}
  }:M01Simulation;
}
function runOne(seed,support,variant){
  const impacts=[];let stunTicks=0,maxStun=0,minDistance=Infinity;const bodies=new Map();
  const result=route(seed,{support,Simulation:makeSimulation(variant),onStep:({sim,events})=>{
    const inWindow=sim.battleClock>=FROM&&sim.battleClock<TO;
    if(inWindow&&sim.concussion>0){stunTicks++;maxStun=Math.max(maxStun,sim.concussion);}
    for(const e of events){
      if(e.type!=='m01-blast'||!e.aerial||!inWindow)continue;
      const hit=sim.sectors.damage.at(-1),distance=Math.hypot(e.point.x-sim.player.x,e.point.z-sim.player.z);
      if(hit.id!=='station_bomb')minDistance=Math.min(minDistance,distance);
      impacts.push({id:hit.id,battle:clockText(sim.battleClock),real:r2(sim.clock),x:r1(e.point.x),z:r1(e.point.z),playerM:r1(distance),concussion:r3(e.concussion??0),
        killed:e.effects?.killed??[],wounded:e.effects?.wounded??[],suppressed:e.effects?.suppressed??[]});
    }
    if(inWindow)for(const a of sim.actors)if(!a.alive||a.state==='WOUNDED')bodies.set(a.id,{state:a.state,health:Math.round(a.health)});
  }});
  const sim=result.sim,all=k=>impacts.flatMap(i=>i[k]),plot=Object.fromEntries(Object.entries(sim.flags).filter(([k])=>k!=='m01.suggested_cover').sort());
  return {seed,support,variant,ticks:Math.round(sim.clock/.05),realSec:r1(sim.clock),complete:sim.mission.complete,survivors:sim.flags['m01.east_platoon_survivors'],playerHealth:sim.player.health,
    impactsInWindow:impacts.length,raidImpacts:impacts.filter(i=>/^raid_0434_/.test(i.id)).length,nearestImpactM:Number.isFinite(minDistance)?r1(minDistance):null,
    stunnedRealSec:r2(stunTicks*.05),maxConcussion:r3(maxStun),
    killed:all('killed').length,wounded:all('wounded').length,shaken:all('suppressed').length,
    castKilledOrWounded:[...all('killed'),...all('wounded')].filter(id=>CAST.has(id)),
    bodies:Object.fromEntries([...bodies].sort(([a],[b])=>a<b?-1:1)),impacts,
    plot:{objectives:Object.fromEntries(Object.entries(sim.objectives).map(([id,o])=>[id.replace('obj_m01_',''),o.state])),checkpoints:[...sim.checkpointsReached],
      consumed:Object.keys(sim.consumed).sort(),flags:plot,finalBattleClock:clockText(sim.battleClock)}};
}

if(process.argv.includes('--one')){
  const i=process.argv.indexOf('--one'),[seed,support,variant]=process.argv.slice(i+1,i+4);
  console.log(JSON.stringify(runOne(Number(seed),support==='1',variant)));
}else{
  const jobs=Number(arg('--jobs')??4),seeds=(arg('--seeds')??'19390901,1,2,3,4,5,6').split(',').map(Number);
  const OUT=resolve(arg('--out')??join(ROOT,'docs/verification/m01-runtime/bomb-effects-2026-10-23/BOMB_EFFECTS_ROUTES.json'));
  const plan=[[19390901,false],[7,true],...seeds.flatMap(seed=>[false,true].map(support=>[seed,support]))];
  const unique=plan.filter(([seed,support],i)=>plan.findIndex(([s,p])=>s===seed&&p===support)===i);
  const queue=unique.flatMap(([seed,support])=>['bombs','nobombs'].map(variant=>({seed,support,variant}))),done=new Map();
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
          console.error(`done ${done.size}/${unique.length*2}: ${job.seed} support ${job.support} ${job.variant}`);next();
        });
      }
    };
    next();
  });
  const rows=unique.map(([seed,support])=>({seed,support,bombs:done.get(`${seed}/${support}/bombs`),nobombs:done.get(`${seed}/${support}/nobombs`)}));
  const stat=xs=>{const n=xs.length,mean=xs.reduce((a,b)=>a+b,0)/n,sd=Math.sqrt(xs.reduce((a,b)=>a+(b-mean)**2,0)/Math.max(1,n-1));return {n,mean:r2(mean),sd:r2(sd),min:Math.min(...xs),max:Math.max(...xs)};};
  for(const r of rows){r.plotEqual=JSON.stringify(r.bombs.plot)===JSON.stringify(r.nobombs.plot);r.deltaRealSec=r1(r.bombs.realSec-r.nobombs.realSec);}
  const summary={routes:rows.length,
    allComplete:rows.every(r=>r.bombs.complete&&r.nobombs.complete),playerNeverHurt:rows.every(r=>r.bombs.playerHealth>0),
    plotEqual:rows.filter(r=>!r.plotEqual).map(r=>`${r.seed}/${r.support}`),survivorsEqual:rows.every(r=>r.bombs.survivors===r.nobombs.survivors),
    castKilledOrWounded:rows.flatMap(r=>r.bombs.castKilledOrWounded),
    impactsInWindow:stat(rows.map(r=>r.bombs.impactsInWindow)),
    nearestImpactM:stat(rows.map(r=>r.bombs.nearestImpactM)),minimumOverAllRoutesM:Math.min(...rows.map(r=>r.bombs.nearestImpactM)),
    stunnedRealSec:stat(rows.map(r=>r.bombs.stunnedRealSec)),maxConcussion:stat(rows.map(r=>r.bombs.maxConcussion)),
    killed:stat(rows.map(r=>r.bombs.killed)),wounded:stat(rows.map(r=>r.bombs.wounded)),shaken:stat(rows.map(r=>r.bombs.shaken)),
    routesWithAGenericCasualty:rows.filter(r=>r.bombs.killed+r.bombs.wounded>0).length,
    deltaRealSec:stat(rows.map(r=>r.deltaRealSec)),ticksWithBombs:stat(rows.map(r=>r.bombs.ticks)),ticksWithout:stat(rows.map(r=>r.nobombs.ticks))};
  for(const r of rows){for(const v of [r.bombs,r.nobombs])delete v.plot;delete r.nobombs.impacts;}
  const text=JSON.stringify({task:'M01-BOMB-EFFECTS-V1',what:'the aerial bombs of the 04:34 raid (effects on men, concussion, the extra schedule) against the same routes without them; deterministic, no clock, no path',
    window:'04:33:59-04:44:30 (battle clock)',summary,routes:rows},null,2)+'\n';
  mkdirSync(dirname(OUT),{recursive:true});writeFileSync(OUT,text);console.log(`written ${OUT}`);
}
