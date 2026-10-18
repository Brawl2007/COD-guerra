// M01 combat feel metrics (owner playtest P1 "combat is boring"). Read-only measurement over the real test routes (tests/helpers/m01-route.js):
// nothing here changes a simulation; every number of docs/direction/COD_WAW_WWII_BENCHMARK.md "Combate e IA" comes from this file.
//   node tools/verification/m01-combat-ai-metrics.mjs [--rev <git rev>] [--routes 19390901:0,7:1]
// --rev extracts that commit's simulation (src, missions, json data of assets/research) with `git archive` and measures it with THIS tree's pilot,
// so a before/after pair runs the same controls logic. Output: one JSON object on stdout (deterministic: no wall clock, no paths).
// What is measured, per route:
//   cadence      per shooter, the intervals between the starts of his shots/bursts (gameplay bursts, attrition rounds, Kowal rkm, ckm wz.30, and the visual-only
//                display bursts). cv = std/mean of the intervals (0 = a metronome); `fixed` = share of intervals within 0.05 s of the shooter's previous interval.
//   shots        gameplay rounds by kind, split into AIMED (at a real man or at the player) and SCRIPTED/AREA (fixed-time attrition, the east bridgehead block that never
//                lands, the forward-post area) plus the visual-only display rounds.
//   distance     nearest living active German to the player, by mission phase (sampled every 0.5 s of real time).
//   los          share of real time in which the player has a line of sight to at least one living active German (world.lineOfSight, the game's own test), and
//                the share in which one is also inside the 60 degree half-angle used by inView.
//   idle         share of real time with no German within 100 m; and the longest stretch (real s) between two "contact moments" from train 963 to the east
//                demolition, a contact moment being an enemy round that lands within 25 m of the player or cracks past him (round-impact crack).
import {execFileSync} from 'node:child_process';
import {mkdtempSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {route} from '../../tests/helpers/m01-route.js';

const ROOT=resolve(import.meta.dirname,'../..');
const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const rev=arg('--rev');
const routes=(arg('--routes')??'19390901:0,7:1').split(',').map(s=>{const [seed,support]=s.split(':');return {seed:Number(seed),support:support==='1'};});
function extract(at){
  const dir=mkdtempSync(join(tmpdir(),'m01-combat-metrics-'));
  const data=execFileSync('git',['-C',ROOT,'ls-tree','-r','--name-only',at,'assets','research'],{encoding:'utf8',maxBuffer:1<<26}).split('\n').filter(p=>p.endsWith('.json'));
  const tar=execFileSync('git',['-C',ROOT,'archive','--format=tar',at,'src','missions',...data],{maxBuffer:1<<29});
  execFileSync('tar',['-x','-C',dir],{input:tar});symlinkSync(join(ROOT,'node_modules'),join(dir,'node_modules'));
  return dir;
}
const simPath=rev?join(extract(rev),'src/game/m01-simulation.js'):join(ROOT,'src/game/m01-simulation.js');
const {M01Simulation:Base}=await import(pathToFileURL(simPath));

const round=(v,n=2)=>v===null||v===undefined||!Number.isFinite(v)?null:Math.round(v*10**n)/10**n;
const quant=(xs,q)=>{if(!xs.length)return null;const s=[...xs].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(q*(s.length-1)+.5))];};
const stats=xs=>{if(!xs.length)return {n:0};const m=xs.reduce((a,b)=>a+b,0)/xs.length,sd=Math.sqrt(xs.reduce((a,b)=>a+(b-m)**2,0)/xs.length);
  return {n:xs.length,mean:round(m),cv:round(sd/m,3),min:round(Math.min(...xs)),p50:round(quant(xs,.5)),max:round(Math.max(...xs))};};
const AIMED=new Set(['repair','player','squad','platoon','cover']),SCRIPTED=new Set(['east','attrition','area']);
const classOf=id=>/^de_east_[01]$/.test(id)?'mg34':/^de_east_([2-9]|1[0-3])$/.test(id)?'gate_rifle':/^de_east_/.test(id)?'dike_rifle':/^de_spans_/.test(id)?'spans_rifle':
  id==='szymon_kowal'?'kowal_rkm':id==='ckm_gunner'?'ckm_wz30':/^pl_east_[01]$/.test(id)?'display_pl_ckm':/^pl_east_/.test(id)?'display_pl_rifle':'other';

async function measure({seed,support}){
  const starts={},rounds={},display={rounds:0,bursts:0},samples={},contacts=[];let window=null,last=null,tick=0,displayLast={};
  const push=(id,t)=>{(starts[id]??=[]).push(t);};
  class Probe extends Base{
    burst(a,target,kind,opts){const ok=super.burst(a,target,kind,opts);if(ok){push(a.id,this.clock);rounds[kind]=(rounds[kind]??0)+(opts?.rounds??1);}return ok;}
  }
  const seenAttrition=new Set();
  route(seed,{support,Simulation:Probe,onStep:({sim,events})=>{
    tick++;last=sim;
    for(const e of events){
      if(e.type==='npc-shot'&&e.weapon==='rkm_wz28')push('szymon_kowal',sim.clock);
      if(e.type==='ally-fire'&&e.by==='ckm_gunner')push('ckm_gunner',e.at);
      if(e.type==='round-impact'&&window&&!window.end&&(e.crack||e.distance<=25))contacts.push(sim.clock);
    }
    for(const r of sim.enemyFire.rounds)if(r.kind==='attrition'&&!seenAttrition.has(r.id)){seenAttrition.add(r.id);push(r.by,r.firedAt);rounds.attrition=(rounds.attrition??0)+1;}
    // display bursts: a shooter's flash time jumping by more than 0.5 s starts a new burst
    for(const [who,t] of Object.entries(sim.display.firedAt)){if(displayLast[who]===undefined||t-displayLast[who]>.5){if(t!==displayLast[who]){push('display:'+who,t);display.bursts++;}}displayLast[who]=t;}
    display.rounds=sim.display.nextId;
    if(!window&&sim.consumedEvent('evt_m01_train963_arrives'))window={start:sim.clock};
    if(window&&!window.end&&sim.consumedEvent('evt_m01_east_demolition'))window.end=sim.clock;
    if(tick%10)return;
    const p=sim.player,phase=sim.mission.phase,live=sim.enemies.filter(a=>a.alive&&a.active);
    const s=samples[phase]??={n:0,distances:[],los:0,losInView:0,within100:0};s.n++;
    if(!live.length)return;
    let near=Infinity,los=false,inView=false;
    for(const a of live){const d=Math.hypot(a.x-p.x,a.z-p.z);near=Math.min(near,d);
      if(sim.world.lineOfSight(p,a)){los=true;const ang=Math.atan2(a.z-p.z,a.x-p.x)-p.angle;if(Math.abs(Math.atan2(Math.sin(ang),Math.cos(ang)))<Math.PI/3)inView=true;}}
    s.distances.push(near);if(los)s.los++;if(inView)s.losInView++;if(near<=100)s.within100++;
  }});
  const cadence={};
  for(const [id,ts] of Object.entries(starts)){
    const base=id.startsWith('display:')?classOf(id.slice(8)):classOf(id),cls=id.startsWith('display:')&&!base.startsWith('display_')?'display_'+base:base,iv=ts.slice(1).map((t,i)=>t-ts[i]).filter(x=>x>1e-9);
    const fixed=iv.slice(1).filter((x,i)=>Math.abs(x-iv[i])<=.05).length;
    const c=cadence[cls]??={shooters:0,intervals:[],fixedPairs:0,pairs:0,perShooterCv:[]};
    c.shooters++;c.intervals.push(...iv);c.fixedPairs+=fixed;c.pairs+=Math.max(0,iv.length-1);
    if(iv.length>=3){const st=stats(iv);c.perShooterCv.push(st.cv);}
  }
  const cadenceOut=Object.fromEntries(Object.entries(cadence).sort().map(([k,c])=>[k,{shooters:c.shooters,intervals:stats(c.intervals),
    medianShooterCv:round(quant(c.perShooterCv,.5),3),repeatShare:c.pairs?round(c.fixedPairs/c.pairs,3):null}]));
  const aimed=Object.entries(rounds).filter(([k])=>AIMED.has(k)).reduce((a,[,v])=>a+v,0),scripted=Object.entries(rounds).filter(([k])=>SCRIPTED.has(k)).reduce((a,[,v])=>a+v,0);
  const phases=Object.fromEntries(Object.entries(samples).map(([ph,s])=>[ph,{realSec:round(s.n*.5,1),nearestGermanM:{min:round(quant(s.distances,0),0),p50:round(quant(s.distances,.5),0),max:round(quant(s.distances,1),0)},
    losShare:round(s.los/s.n,3),losInViewShare:round(s.losInView/s.n,3),noGermanWithin100mShare:round(1-s.within100/s.n,3)}]));
  const gaps=[];if(window){const pts=[window.start,...contacts,window.end??last.clock];for(let i=1;i<pts.length;i++)gaps.push(pts[i]-pts[i-1]);}
  return {seed,support,realSec:round(last.clock,1),cadence:cadenceOut,shots:{gameplayRoundsByKind:Object.fromEntries(Object.entries(rounds).sort()),aimedRounds:aimed,scriptedOrAreaRounds:scripted,
      displayRounds:display.rounds,displayBursts:display.bursts,aimedShareOfAllRounds:round(aimed/(aimed+scripted+display.rounds),3)},
    phases,contact:{windowRealSec:window?round((window.end??last.clock)-window.start,1):null,contactMoments:contacts.length,longestGapRealSec:round(Math.max(0,...gaps),1),
      gapsOver30s:gaps.filter(g=>g>30).length,medianGapRealSec:round(quant(gaps,.5),1)}};
}
const out={tool:'tools/verification/m01-combat-ai-metrics.mjs',rev:rev??'working-tree',routes:[]};
for(const r of routes)out.routes.push(await measure(r));
console.log(JSON.stringify(out,null,1));
