// V-1 (2026-11-06): measures how long the player lives each element of M01 on the golden control routes, for the play weights of
// missions/m01-tczew/history-context.json. Read-only: it drives the real simulations with the existing test pilots (no event, clock or objective
// injection) and only observes state. Routes:
//   Act I   tests/helpers/m01-route.js route(19390901) — the gameplay golden's control route (no support pilot); it skips the two skippable
//           cutscenes (cs_m01_intro, cs_m01_roll_call), so their measured seconds are the floor, not what a human who watches them lives;
//   VII-a   tests/helpers/m01-act-route.js actRoute, mode 'active', seed 19390901, recruta (the active route of the act golden);
//   VII-b   tests/helpers/m01-act-b-route.js actBRoute, mode 'active' (idem);
//   VII-c   tests/helpers/m01-act-c-route.js actCRoute, mode 'prompt' (the first route of the act golden).
// 50 ms ticks: one tick = 0.05 s of real play time.
import {readFileSync} from 'node:fs';
import {M01AreaSimulation} from '../../src/game/m01-area-sim.js';
import {route} from '../../tests/helpers/m01-route.js';
import {actRoute} from '../../tests/helpers/m01-act-route.js';
import {actBRoute} from '../../tests/helpers/m01-act-b-route.js';
import {actCRoute} from '../../tests/helpers/m01-act-c-route.js';

const ROOT=new URL('../../',import.meta.url);
const json=f=>JSON.parse(readFileSync(new URL(f,ROOT),'utf8'));
const DT=.05;
const add=(o,k,v=DT)=>{if(k!=null)o[k]=(o[k]??0)+v;};
const r1=v=>Math.round(v*10)/10;

function recorder(eventIds,groups){
  const m={totalSec:0,objectives:{},scenes:{},lines:{},events:{},groups:{},phases:{},segments:{},lastEvent:null,eventWindows:{}};
  return {m,observe(sim){
    m.totalSec+=DT;
    for(const [id,o] of Object.entries(sim.objectives??{}))if(o.state==='active')add(m.objectives,id);
    if(sim.scene?.id)add(m.scenes,sim.scene.id);
    const sub=sim.subtitle;if(sub?.id&&(sub.until==null||sub.until>sim.clock-1e-9))add(m.lines,sub.id);
    add(m.phases,sim.mission?.phase);
    for(const id of eventIds)if(m.events[id]==null&&sim.consumedEvent(id)){m.events[id]=r1(m.totalSec);m.lastEvent=id;}
    add(m.eventWindows,m.lastEvent??'(antes do primeiro evento)');
    for(const [g,members] of Object.entries(groups)){
      const live=sim.actors.some(a=>(members?members.includes(a.id):a.group===g)&&a.alive&&a.active);if(live)add(m.groups,g);
    }
    return m;
  }};
}
function round(m){
  const out={totalSec:r1(m.totalSec)};
  for(const k of ['objectives','scenes','lines','groups','phases','segments','eventWindows'])out[k]=Object.fromEntries(Object.entries(m[k]).map(([a,b])=>[a,r1(b)]));
  out.events=m.events;return out;
}
export function measureAct1(){
  const mission=json('missions/m01-tczew/mission.json');
  const groups={};for(const g of mission.groups)groups[g.id]=g.members??null;
  groups.grp_west_garrison=null;groups.grp_station_yard=null;groups.grp_mg34_loaders=null;
  const rec=recorder(mission.events.map(e=>e.id),groups);
  const segs=mission.clock.segments.map(s=>({id:s.id,from:hms(s.from),to:hms(s.to)}));
  route(19390901,{onStep:({sim})=>{const m=rec.observe(sim);const s=segs.find(s=>sim.battleClock>=s.from&&sim.battleClock<s.to);add(m.segments,s?.id??'(fim 07:05)');}});
  return round(rec.m);
}
function hms(t){const [h,mi,s]=t.split(':').map(Number);return h*3600+mi*60+(s||0);}
export function measureArea(actId){
  const file={act_vii_a_north:'act.json',act_vii_b_north_day:'act-vii-b.json',act_vii_c_withdrawal:'act-vii-c.json'}[actId];
  const act=json(`missions/m01-tczew/areas/np/${file}`);
  const groups={grp_np_section:null,grp_np_line:null,grp_ckm_crew:null,grp_np_de:null,grp_np_medics:null,grp_np_messenger:null};
  const rec=recorder(act.events.map(e=>e.id),groups);
  const sim=new M01AreaSimulation(19390901,{difficulty:'recruta',actId});
  const onStep=({sim})=>rec.observe(sim);
  if(actId==='act_vii_a_north')actRoute(sim,{mode:'active',maxSec:600,onStep});
  else if(actId==='act_vii_b_north_day')actBRoute(sim,{mode:'active',maxSec:900,onStep});
  else actCRoute(sim,{mode:'prompt',maxSec:900,onStep});
  return round(rec.m);
}
export function measureAll(){
  return {act1:measureAct1(),act_vii_a_north:measureArea('act_vii_a_north'),act_vii_b_north_day:measureArea('act_vii_b_north_day'),act_vii_c_withdrawal:measureArea('act_vii_c_withdrawal')};
}
if(import.meta.url===`file://${process.argv[1]}`)console.log(JSON.stringify(measureAll(),null,1));
