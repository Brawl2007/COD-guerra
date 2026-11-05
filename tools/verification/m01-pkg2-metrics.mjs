// M01 package 2 (2026-11-04, golden amendment 21): what the dust, the first aid and the grenade tuning do on the real test routes (tests/helpers/m01-route.js). Read-only: nothing here changes a
// simulation. Deterministic (no wall clock, no paths in the numbers).
//   node tools/verification/m01-pkg2-metrics.mjs [--routes 19390901:0,7:1,...] [--jsonl <file>] [--label <text>]
//   node tools/verification/m01-pkg2-metrics.mjs --summary <file.jsonl>
// Routes: seed:mode with mode 0 = the golden control route, 1 = the support pilot; the default is the 24 audit routes (12 seeds x both pilots). One JSON line per route. What is measured:
//   dust      the sight questions the AI asked that met a cloud (`sim.dustRays.checked`), the ones the cloud answered "no" to (`blocked`), the clouds that stood (distinct craters), and when the first ray was blocked
//   aid       the wounded men of the garrison (state WOUNDED at any time), the calls they made, those the director let the player hear (dlg_m01_220-222 on the subtitle), the men treated, carried and laid, the
//             medic's jobs, and where the medic stood at 06:00 and at 06:03:30 (he must be free at the aid post for Bąk)
//   fire      the stick grenades thrown and exploded, the searches (deck-tactic `search`), the closest the assault came to a Polish body on the deck, and (golden amendment 22) `lostSight`: how often a man of the
//             deck assault asked for the search because he had no Pole in sight (deckSearch is called), how many of them were on their deepest line (nowhere left to go) and how many searched
import {readFileSync,appendFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {route} from '../../tests/helpers/m01-route.js';
import {M01Simulation,seconds} from '../../src/game/m01-simulation.js';
import {deckLines,deckLineNumber} from '../../src/game/m01-deck-assault.js';

const ROOT=resolve(import.meta.dirname,'../..');
const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const round=(v,n=2)=>v===null||v===undefined||!Number.isFinite(v)?null:Math.round(v*10**n)/10**n;
const mean=xs=>xs.length?round(xs.reduce((a,b)=>a+b,0)/xs.length,2):null;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

if(arg('--summary')){
  const rows=readFileSync(arg('--summary'),'utf8').split('\n').filter(l=>l.trim()).map(l=>JSON.parse(l));
  const out={};
  for(const mode of [false,true]){
    const rs=rows.filter(r=>r.support===mode),pick=f=>rs.map(f);if(!rs.length)continue;
    out[mode?'support':'control']={routes:rs.length,
      dust:{raysChecked:mean(pick(r=>r.dust.checked)),raysBlocked:mean(pick(r=>r.dust.blocked)),routesWithABlockedRay:rs.filter(r=>r.dust.blocked>0).length,cloudsPerRoute:mean(pick(r=>r.dust.clouds))},
      aid:{woundedPerRoute:mean(pick(r=>r.aid.wounded)),callsPerRoute:mean(pick(r=>r.aid.calls)),callsHeardPerRoute:mean(pick(r=>r.aid.callsHeard)),treatedPerRoute:mean(pick(r=>r.aid.treated)),carriedPerRoute:mean(pick(r=>r.aid.carried)),
        routesWithATreatedMan:rs.filter(r=>r.aid.treated>0).length,medicFreeAtBak:rs.filter(r=>r.aid.at0603&&r.aid.at0603.task===null&&r.aid.at0603.job===false&&r.aid.at0603.distToPostM<3).length},
      fire:{grenadesThrownPerRoute:mean(pick(r=>r.fire.grenades)),routesWithAGrenade:rs.filter(r=>r.fire.grenades>0).length,searchesPerRoute:mean(pick(r=>r.fire.searches)),routesWithASearch:rs.filter(r=>r.fire.searches>0).length,
        lostSight:{askedPerRoute:mean(pick(r=>r.fire.lostSight?.calls??0)),routesThatAsked:rs.filter(r=>(r.fire.lostSight?.calls??0)>0).length,askedOnTheDeepestLine:pick(r=>r.fire.lostSight?.atDeepestLine??0).reduce((a,b)=>a+b,0),asked:pick(r=>r.fire.lostSight?.calls??0).reduce((a,b)=>a+b,0)},
        closestToAPostM:{mean:mean(pick(r=>r.fire.closestToPostM)),min:Math.min(...pick(r=>r.fire.closestToPostM))}},
      completeRoutes:rs.filter(r=>r.complete).length,survivors:[...new Set(pick(r=>r.survivors))]};
  }
  console.log(JSON.stringify(out,null,2));process.exit(0);
}

const DEFAULT_ROUTES=[19390901,1,2,3,4,5,6,7,8,9,10,11].flatMap(seed=>[`${seed}:0`,`${seed}:1`]).join(',');
const routes=(arg('--routes')??DEFAULT_ROUTES).split(',').map(s=>{const [seed,mode]=s.split(':');return {seed:Number(seed),support:mode==='1',key:`${seed}:${mode}`};});
const label=arg('--label')??'pkg2',jsonl=arg('--jsonl');
/** Golden amendment 22: counts the calls of deckSearch (a man of the deck assault with no Pole in sight at his trigger) without changing what it does. */
let asked={calls:0,atDeepestLine:0,searched:0};
class Counting extends M01Simulation{
  deckSearch(a){
    const deepest=deckLineNumber(a)===deckLines(a).length-1,r=super.deckSearch(a);   // (the line before the call: a search from hold changes it)
    asked.calls++;if(deepest)asked.atDeepestLine++;if(r)asked.searched++;return r;
  }
}
const done=new Set(jsonl&&existsSync(jsonl)?readFileSync(jsonl,'utf8').split('\n').filter(l=>l.trim()).map(l=>JSON.parse(l)).filter(r=>r.label===label).map(r=>r.key):[]);

for(const r of routes){
  if(done.has(r.key))continue;
  asked={calls:0,atDeepestLine:0,searched:0};
  const wounded=new Set(),heard=new Set(),clouds=new Set(),treated=new Set(),carried=new Set(),laid=new Set(),jobs=new Set();
  let calls=0,callsHeard=0,grenades=0,exploded=0,searches=0,closest=Infinity,firstBlocked=null,at0600=null,at0603=null,lastN=new Map(),lastSub=null;
  const result=route(r.seed,{support:r.support,Simulation:Counting,onStep:({sim,events})=>{
    for(const e of events){
      if(e.type==='enemy-grenade')grenades++;
      if(e.type==='m01-blast'&&e.kind==='grenade'&&e.by!==undefined)exploded++;
      if(e.type==='deck-tactic'&&e.kind==='search')searches++;
    }
    for(const d of sim.sectors.damage)if(sim.clock-d.started<(d.dust?.life??40))clouds.add(d.id);
    if(firstBlocked===null&&sim.dustRays.blocked>0)firstBlocked={clock:round(sim.clock),battle:sim.battleClock};
    for(const a of sim.actors){
      if(a.group!=='grp_west_garrison')continue;
      if(a.state==='WOUNDED')wounded.add(a.id);
      if(a.aid){const n=lastN.get(a.id)??0;if(a.aid.n>n){calls+=a.aid.n-n;lastN.set(a.id,a.aid.n);}
        if(a.aid.t!==undefined)treated.add(a.id);if(a.aid.rest!==undefined)laid.add(a.id);}
      if(a.carriedBy==='leon_dudek')carried.add(a.id);
    }
    if(sim.timers.aid)jobs.add(`${sim.timers.aid.patient}`);
    const sub=sim.subtitle;if(sub&&/^dlg_m01_22[0-2]$/.test(sub.id)){const k=sub.id+'@'+round(sub.until,1);if(k!==lastSub){lastSub=k;callsHeard++;}}
    if(sim.consumedEvent('evt_m01_germans_on_east_spans')&&!sim.consumedEvent('evt_m01_east_demolition')){
      const poles=sim.actors.filter(a=>a.team==='ally'&&a.alive&&a.active&&!a.displayOnly&&a.x>0&&a.x<700);
      for(const g of sim.actors)if(g.group==='grp_de_spans'&&g.deck&&g.alive&&g.active&&g.deck.phase!=='clear')for(const p of poles){const d=dist(g,p);if(d<closest)closest=d;}
    }
    const d=sim.actor('leon_dudek'),post=sim.world.point('aid_position');
    if(at0600===null&&sim.battleClock>=seconds('06:00:00'))at0600={task:d.task??null,job:Boolean(sim.timers.aid),distToPostM:round(dist(d,post))};
    if(at0603===null&&sim.battleClock>=seconds('06:03:30'))at0603={task:d.task??null,job:Boolean(sim.timers.aid),distToPostM:round(dist(d,post))};
  }});
  const sim=result.sim;
  const row={label,key:r.key,seed:r.seed,support:r.support,
    dust:{checked:sim.dustRays.checked,blocked:sim.dustRays.blocked,clouds:clouds.size,firstBlocked},
    aid:{wounded:wounded.size,calls,callsHeard,treated:treated.size,carried:carried.size,laid:laid.size,jobs:jobs.size,at0600,at0603},
    fire:{grenades,exploded,searches,closestToPostM:round(closest,1),lostSight:{...asked}},
    complete:sim.mission.complete,survivors:sim.flags['m01.east_platoon_survivors'],playerHealth:sim.player.health,routeRealSec:round(sim.clock,1)};
  console.log(JSON.stringify(row));
  if(jsonl)appendFileSync(jsonl,JSON.stringify(row)+'\n');
}
