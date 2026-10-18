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
//   closeness    (combat slice 2, 2026-10-18) the nearest living German to the player, sampled every 0.5 s: its distribution and the share of time under 600 / 300 / 150 m, over
//                the whole mission, the battle window (train 963 to the east demolition) and the deck window (evt_m01_germans_on_east_spans to the east demolition, the deck assault);
//                the player's damage (100 minus the lowest health, player-hit events) and the Germans the player killed (enemy_down_by_player events).
// Routes: seed:mode with mode 0 = the golden control route (never fires), 1 = the golden support pilot, 2 = FORWARD (this file only, not a golden pilot): the control route until
// the Germans enter the deck, then a player who walks up the road deck to x 255 (short of the 270 m warning) and shoots at the deck Germans within 400 m, aimed at the chest, until the east
// demolition, then the same way out as the route. It shows what the deck assault gives a player who advances; the golden pilots stand at x 29-37.
import {execFileSync} from 'node:child_process';
import {mkdtempSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {route,driver,toRepair,coverControls} from '../../tests/helpers/m01-route.js';
import {eyePosition} from '../../src/world/spatial.js';

const ROOT=resolve(import.meta.dirname,'../..');
const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const rev=arg('--rev');
const routes=(arg('--routes')??'19390901:0,7:1,19390901:2').split(',').map(s=>{const [seed,mode]=s.split(':');return {seed:Number(seed),support:mode==='1',forward:mode==='2'};});
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

// The FORWARD pilot (mode 2): the control route's steps to the deck, then up the deck to x 255 and aimed fire at the deck Germans (chest, no lift: by then the platoon is
// west of him or beside him and the rifle ray is traced against allies first). Controls only, like tests/helpers/m01-route.js; no state is written.
const FORWARD_HOLD_FIRE_M=400;
function forwardRoute(seed,{Simulation,onStep}){
  const d=toRepair(driver(seed,{support:false,onStep,Simulation})),{sim,step,until,walk}=d;
  walk(-115,27);walk(-28,28);step({crouch:true});until(()=>sim.active('hold_access'),500);step({crouch:true});
  walk(-115,32);walk(-30,40);walk(-10,40);walk(30,40);
  until(()=>sim.consumedEvent('evt_m01_germans_on_east_spans'),500);
  walk(60,38.6);walk(255,38.6);
  const aimed=()=>{
    if(!sim.weapon.mag)return {reload:true};
    // He lets them come: aimed fire only at a deck German within FORWARD_HOLD_FIRE_M (a perfect shot at 600 m wiped the assault during its run along the far spans).
    const p=sim.player,t=sim.enemies.filter(a=>a.alive&&a.active&&a.group==='grp_de_spans'&&Math.hypot(a.x-p.x,a.z-p.z)<FORWARD_HOLD_FIRE_M&&sim.world.lineOfSight(p,a))
      .sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
    if(!t)return {crouch:!p.crouched};
    const o=eyePosition(p),e=eyePosition(t),dest={x:e.x,y:e.y-.35,z:e.z},dx=dest.x-o.x,dz=dest.z-o.z,turn=Math.atan2(dz,dx)-p.angle,pitch=Math.atan2(dest.y-o.y,Math.hypot(dx,dz));
    return {aim:true,lookX:Math.atan2(Math.sin(turn),Math.cos(turn))/.0022,lookY:(p.pitch-pitch)/.0022,fire:sim.weapon.state==='READY'};
  };
  until(()=>sim.consumedEvent('evt_m01_east_demolition'),900,aimed);
  walk(60,38.6);walk(-15,40);walk(-115,27);walk(-275,27);walk(-292,26);
  until(()=>sim.consumedEvent('evt_m01_west_demolition'),500);
  walk(-263,58);walk(-263,70);until(()=>sim.scene?.id==='cs_m01_roll_call',30);step({skip:true});until(()=>sim.mission.complete,10);
  return {sim};
}
async function measure({seed,support,forward}){
  const starts={},rounds={},display={rounds:0,bursts:0},samples={},contacts=[];let window=null,last=null,tick=0,displayLast={};
  const push=(id,t)=>{(starts[id]??=[]).push(t);};
  class Probe extends Base{
    burst(a,target,kind,opts){const ok=super.burst(a,target,kind,opts);if(ok){push(a.id,this.clock);rounds[kind]=(rounds[kind]??0)+(opts?.rounds??1);}return ok;}
  }
  const seenAttrition=new Set(),close={mission:[],battle:[],deck:[]},player={minHealth:100,hits:0},kills=[],battleAt=[];
  (forward?forwardRoute:route)(seed,{support,Simulation:Probe,onStep:({sim,events})=>{
    tick++;last=sim;
    for(const e of events){
      if(e.type==='npc-shot'&&e.weapon==='rkm_wz28')push('szymon_kowal',sim.clock);
      if(e.type==='ally-fire'&&e.by==='ckm_gunner')push('ckm_gunner',e.at);
      if(e.type==='round-impact'&&window&&!window.end&&(e.crack||e.distance<=25))contacts.push(sim.clock);
      if(e.type==='player-hit')player.hits++;
      if(e.type==='enemy_down_by_player')kills.push({id:e.id,distanceM:round(e.distance,0),weapon:e.weapon});
    }
    for(const r of sim.enemyFire.rounds)if(r.kind==='attrition'&&!seenAttrition.has(r.id)){seenAttrition.add(r.id);push(r.by,r.firedAt);rounds.attrition=(rounds.attrition??0)+1;}
    // display bursts: a shooter's flash time jumping by more than 0.5 s starts a new burst
    for(const [who,t] of Object.entries(sim.display.firedAt)){if(displayLast[who]===undefined||t-displayLast[who]>.5){if(t!==displayLast[who]){push('display:'+who,t);display.bursts++;}}displayLast[who]=t;}
    display.rounds=sim.display.nextId;
    if(!window&&sim.consumedEvent('evt_m01_train963_arrives'))window={start:sim.clock};
    if(window&&!window.end&&sim.consumedEvent('evt_m01_east_demolition'))window.end=sim.clock;
    player.minHealth=Math.min(player.minHealth,sim.player.health);
    if(tick%20===0)battleAt.push([sim.clock,new Date(Math.round(sim.battleClock)*1000).toISOString().slice(11,19)]);
    if(tick%10)return;
    const p=sim.player,phase=sim.mission.phase,live=sim.enemies.filter(a=>a.alive&&a.active);
    {const n=live.length?Math.min(...live.map(a=>Math.hypot(a.x-p.x,a.z-p.z))):Infinity;close.mission.push(n);if(window&&!window.end)close.battle.push(n);
      if(sim.consumedEvent('evt_m01_germans_on_east_spans')&&!sim.consumedEvent('evt_m01_east_demolition'))close.deck.push(n);}
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
  const gaps=[],gapAt=[];if(window){const pts=[window.start,...contacts,window.end??last.clock];for(let i=1;i<pts.length;i++){gaps.push(pts[i]-pts[i-1]);gapAt.push(pts[i-1]);}}
  const longest=gaps.indexOf(Math.max(0,...gaps)),longestAt=longest<0?null:round(gapAt[longest],1),bcAt=longestAt===null?null:battleAt.find(([t])=>t>=longestAt)?.[1]??null;
  const share=(xs,m)=>xs.length?round(xs.filter(x=>x<m).length/xs.length,3):null;
  const closeness=Object.fromEntries(Object.entries(close).map(([k,xs])=>[k,{realSec:round(xs.length*.5,1),nearestGermanM:{min:round(quant(xs,0),0),p10:round(quant(xs,.1),0),p50:round(quant(xs,.5),0)},
    shareUnder600m:share(xs,600),shareUnder300m:share(xs,300),shareUnder150m:share(xs,150)}]));
  return {seed,support,forward,realSec:round(last.clock,1),closeness,player:{damageTaken:100-player.minHealth,finalHealth:last.player.health,hitEvents:player.hits},killsByPlayer:kills,cadence:cadenceOut,shots:{gameplayRoundsByKind:Object.fromEntries(Object.entries(rounds).sort()),aimedRounds:aimed,scriptedOrAreaRounds:scripted,
      displayRounds:display.rounds,displayBursts:display.bursts,aimedShareOfAllRounds:round(aimed/(aimed+scripted+display.rounds),3)},
    phases,contact:{windowRealSec:window?round((window.end??last.clock)-window.start,1):null,contactMoments:contacts.length,longestGapRealSec:round(Math.max(0,...gaps),1),
      longestGapStartsAt:{realSec:longestAt,battleClock:bcAt},
      gapsOver30s:gaps.filter(g=>g>30).length,medianGapRealSec:round(quant(gaps,.5),1)}};
}
const out={tool:'tools/verification/m01-combat-ai-metrics.mjs',rev:rev??'working-tree',routes:[]};
for(const r of routes)out.routes.push(await measure(r));
console.log(JSON.stringify(out,null,1));
