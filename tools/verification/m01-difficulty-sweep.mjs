// H9 D2 calibration sweep (2026-10-19): the player's health and deaths per difficulty level over the 24 audit routes (12 seeds x {control route, support pilot}) of
// tools/verification/m01-combat-posture-staging-audit.mjs, driven by the real test pilot (tests/helpers/m01-route.js). Read-only: nothing here changes a simulation.
//   node tools/verification/m01-difficulty-sweep.mjs [--levels recruta,soldado,veterano] [--seeds 19390901,1,...] [--support both|0|1] [--jsonl <file>]
// One JSON line per route (stdout, and appended to --jsonl so a restart loses nothing), then a summary per level. Deterministic (no clocks, no paths).
// A death ends that route (the scripted pilot cannot resume sensibly from a checkpoint): it is recorded with the battle clock, the objective and the shooter.
// fightRealSec = the deck fight, evt_m01_germans_on_east_spans -> evt_m01_east_demolition, real seconds (the longest fight of the mission).
import {appendFileSync} from 'node:fs';
import {M01Simulation,clockText} from '../../src/game/m01-simulation.js';
import {route} from '../../tests/helpers/m01-route.js';

const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const levels=(arg('--levels')??'recruta,soldado,veterano').split(',');
const seeds=(arg('--seeds')??'19390901,1,2,3,4,5,6,7,8,9,10,11').split(',').map(Number);
const supportArg=arg('--support')??'both',supports=supportArg==='both'?[false,true]:[supportArg==='1'];
const jsonl=arg('--jsonl');
const round=(v,n=1)=>Math.round(v*10**n)/10**n;
const quant=(xs,q)=>{const s=[...xs].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(q*(s.length-1)+.5))];};

function run(difficulty,seed,support){
  let minHealth=100,minAt=null,wounds=0,deckFrom=null,deckTo=null,lastWound=null,woundsByPhase={};
  class Level extends M01Simulation{constructor(s){super(s,{difficulty});}
    woundPlayer(r){const before=this.player.health;super.woundPlayer(r);if(this.player.health<before){wounds++;lastWound={by:r.by,kind:r.kind,at:clockText(this.battleClock)};
      const ph=Object.entries(this.objectives).filter(([,o])=>o.state==='active').map(([id])=>id.replace('obj_m01_','')).join('+')||this.mission.phase;woundsByPhase[ph]=(woundsByPhase[ph]??0)+1;}}}
  const row={level:difficulty,seed,support};
  try{
    const {sim}=route(seed,{support,Simulation:Level,onStep:({sim})=>{
      if(sim.player.health<minHealth){minHealth=sim.player.health;minAt=clockText(sim.battleClock);}
      if(deckFrom===null&&sim.consumedEvent('evt_m01_germans_on_east_spans'))deckFrom=sim.clock;
      if(deckTo===null&&sim.consumedEvent('evt_m01_east_demolition'))deckTo=sim.clock;
    }});
    Object.assign(row,{died:false,complete:sim.mission.complete,finalHealth:sim.player.health,realSec:round(sim.clock)});
  }catch(e){
    const m=/^Route died at ([\d.]+)/.exec(e.message);if(!m)throw e;
    Object.assign(row,{died:true,diedAt:lastWound?.at??null,killedBy:lastWound?{by:lastWound.by,kind:lastWound.kind}:null,restoredTo:clockText(Number(m[1]))});
  }
  Object.assign(row,{minHealth:round(minHealth,2),minAt,wounds,woundsByPhase,fightRealSec:deckFrom!==null&&deckTo!==null?round(deckTo-deckFrom):null});
  return row;
}
const rows=[];
for(const level of levels)for(const seed of seeds)for(const support of supports){
  const row=run(level,seed,support);rows.push(row);const line=JSON.stringify(row);console.log(line);if(jsonl)appendFileSync(jsonl,line+'\n');
}
const summary={};
for(const level of levels){
  for(const support of supports){
    const rs=rows.filter(r=>r.level===level&&r.support===support),alive=rs.filter(r=>!r.died),f=rs.map(r=>r.fightRealSec).filter(x=>x!==null);
    summary[`${level}/${support?'support':'control'}`]={routes:rs.length,deaths:rs.length-alive.length,minHealth:Math.min(...rs.map(r=>r.minHealth)),
      medianMinHealth:quant(rs.map(r=>r.minHealth),.5),medianFinalHealth:alive.length?quant(alive.map(r=>r.finalHealth),.5):null,
      wounds:{median:quant(rs.map(r=>r.wounds),.5),max:Math.max(...rs.map(r=>r.wounds))},fightRealSec:f.length?{median:quant(f,.5),min:Math.min(...f),max:Math.max(...f)}:null};
  }
}
console.log(JSON.stringify({tool:'tools/verification/m01-difficulty-sweep.mjs',summary},null,1));
