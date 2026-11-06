// M01 SP-08 escort + squad coordination metrics (owner order 2026-10-22). Read-only measurement over the real test routes (tests/helpers/m01-route.js): nothing here changes a
// simulation. Every number of docs/verification/m01-runtime/escort-coordination-2026-10-22/README.md comes from this file.
//   node tools/verification/m01-escort-coordination-metrics.mjs [--rev <git rev>] [--routes 19390901:0,7:1,3:0,3:1,7:0,19390901:1]
// --rev extracts that commit's simulation (src, missions, json data of assets/research) with `git archive` and drives it with THIS tree's pilot: the pilot's corridor controls
// (corridorControls) give a simulation without the SP-08 task no control at all, so a predecessor keeps the old wait at the post. Output: one JSON object on stdout
// (deterministic: no wall clock, no paths). Measured per route (all in real seconds of the simulation clock):
//   timeline   east demolition, the player at the firing point (obj_m01_leave_bridge done), the escort order, Bąk on Dudek's shoulder and delivered, the west demolition, the end;
//   idle       corridorIdleSec: time in obj_m01_hold_corridor with the player standing (moveBlend <= 0.1) within 15 m of the firing point while every man of the platoon has
//              passed (nothing left to count) and nobody is escorted; longestStillSec: the longest unbroken stretch standing still anywhere from the firing point to the west demolition;
//   contact    a contact moment is an enemy round that lands within 25 m of the player or cracks past him (round-impact crack), as m01-combat-ai-metrics.mjs; the longest stretch
//              without one from the east demolition to the west demolition (edges included), and from train 963 to the west demolition;
//   escort     share of the escort phase with the player within 10 m of Dudek, ticks Dudek stood under fire, 'squad' rounds fired at him;
//   squad      each bound of the section (start, end), the corridor callouts that were said, Kowal's covering bursts (npc-shot after the east demolition);
//   guard      clipping events and men standing inside each other (tests/helpers/m01-clipping.js), the lowest player health.
import {execFileSync} from 'node:child_process';
import {mkdtempSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {route} from '../../tests/helpers/m01-route.js';
import {clippingAudit,stackingAudit} from '../../tests/helpers/m01-clipping.js';

const ROOT=resolve(import.meta.dirname,'../..');
const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const rev=arg('--rev');
const routes=(arg('--routes')??'19390901:0,7:1,3:0,3:1,7:0,19390901:1').split(',').map(s=>{const [seed,mode]=s.split(':');return {seed:Number(seed),support:mode==='1'};});
function extract(at){
  const dir=mkdtempSync(join(tmpdir(),'m01-escort-metrics-'));
  const data=execFileSync('git',['-C',ROOT,'ls-tree','-r','--name-only',at,'assets','research'],{encoding:'utf8',maxBuffer:1<<26}).split('\n').filter(p=>p.endsWith('.json'));
  const tar=execFileSync('git',['-C',ROOT,'archive','--format=tar',at,'src','missions',...data],{maxBuffer:1<<29});
  execFileSync('tar',['-x','-C',dir],{input:tar});symlinkSync(join(ROOT,'node_modules'),join(dir,'node_modules'));
  return dir;
}
const {M01Simulation:Simulation}=await import(pathToFileURL(rev?join(extract(rev),'src/game/m01-simulation.js'):join(ROOT,'src/game/m01-simulation.js')));
const round=(v,n=1)=>v===null||v===undefined||!Number.isFinite(v)?null:Math.round(v*10**n)/10**n;
const gap=(from,to,moments)=>{if(from===null||to===null)return null;const pts=[from,...moments.filter(t=>t>=from&&t<=to),to];let g=0;for(let i=1;i<pts.length;i++)g=Math.max(g,pts[i]-pts[i-1]);return round(g);};
const NEW_LINES=/^dlg_m01_(15[5-9]|16[0-3])$/;

function measure({seed,support}){
  const t={east:null,firingPoint:null,escortOrder:null,pickup:null,delivered:null,west:null,train963:null};
  const contacts=[],bounds=[],said=[],clip=clippingAudit(),stack=stackingAudit();
  let idle=0,still=0,longestStill=0,escortTicks=0,escortNear=0,dudekDown=0,squadRounds=0,coverBursts=0,minHealth=100,lastSub=null,move=null;
  const result=route(seed,{support,Simulation,onStep:step=>{
    const {sim,events,dt}=step;clip.observe(step);stack.observe(step);
    const mark=(k,c)=>{if(c&&t[k]===null)t[k]=sim.clock;};
    mark('train963',sim.consumedEvent('evt_m01_train963_arrives'));mark('east',sim.consumedEvent('evt_m01_east_demolition'));
    mark('firingPoint',sim.objectives.obj_m01_leave_bridge.state==='done');mark('west',sim.consumedEvent('evt_m01_west_demolition'));
    const bak=sim.actor('jozef_bak'),dudek=sim.actor('leon_dudek');
    mark('pickup',bak.carriedBy==='leon_dudek');mark('delivered',t.pickup!==null&&!bak.carriedBy&&!bak.carry);
    minHealth=Math.min(minHealth,sim.player.health);
    for(const e of events){
      if(e.type==='round-impact'&&(e.crack||e.distance<=25))contacts.push(sim.clock);
      if(e.type==='round-impact'&&e.kind==='squad'&&t.east!==null)squadRounds++;
      if(e.type==='npc-shot'&&e.weapon==='rkm_wz28'&&t.east!==null)coverBursts++;
    }
    if(sim.subtitle&&sim.subtitle!==lastSub){lastSub=sim.subtitle;if(t.east!==null&&NEW_LINES.test(sim.subtitle.id))said.push({id:sim.subtitle.id,at:round(sim.clock)});}
    const task=sim.corridorTask??null,q=sim.timers.squad;
    if(task?.phase==='escort'&&t.escortOrder===null)t.escortOrder=sim.clock;
    if(q){const k=q.moving?q.move:null;if(k!==move){if(move!==null)bounds[bounds.length-1].end=round(sim.clock);if(k!==null)bounds.push({move:k,start:round(sim.clock),end:null});move=k;}}
    if(task?.phase==='escort'){escortTicks++;if(task.escorted)escortNear++;if(bak.carriedBy===dudek.id&&dudek.state==='GUARD'&&sim.clock<dudek.suppressedUntil)dudekDown++;}
    if(t.firingPoint!==null&&t.west===null){
      const standing=sim.player.moveBlend<=.1,fp=sim.world.point('firing_point'),atPost=Math.hypot(sim.player.x-fp.x,sim.player.z-fp.z)<=15;
      const passing=sim.actors.some(a=>a.group==='grp_east_platoon'&&a.alive&&a.active&&a.x>-275);
      if(standing&&atPost&&!passing&&!(task&&(task.phase==='count'||task.escorted)))idle+=dt;
      still=standing?still+dt:0;longestStill=Math.max(longestStill,still);
    }
  }});
  const sim=result.sim;
  return {seed,support,
    timeline:{eastDemolition:round(t.east),atFiringPoint:round(t.firingPoint),escortOrder:round(t.escortOrder),bakOnShoulder:round(t.pickup),bakDelivered:round(t.delivered),
      westDemolition:round(t.west),missionEnd:round(sim.clock),missionMin:round(sim.clock/60,2),corridorSec:round(t.west-t.east)},
    idle:{corridorIdleSec:round(idle),longestStillSec:round(longestStill)},
    contact:{corridorMoments:contacts.filter(c=>c>=t.east&&c<=t.west).length,longestGapEastToWestSec:gap(t.east,t.west,contacts),
      longestGapFiringPointToWestSec:gap(t.firingPoint,t.west,contacts),longestGapTrain963ToWestSec:gap(t.train963,t.west,contacts)},
    escort:escortTicks?{escortedShare:round(escortNear/escortTicks,3),dudekDownUnderFireSec:round(dudekDown*.05),squadRoundsAtDudek:squadRounds}:null,
    squad:{bounds,linesSaid:said,kowalCoverBursts:coverBursts},
    guard:{clipping:clip.events.length,stacked:stack.summary().pairs,minPlayerHealth:round(minHealth),survivors:sim.flags['m01.east_platoon_survivors'],
      bak:sim.flags['m01.bak_status'],complete:sim.mission.complete}};
}
console.log(JSON.stringify({tool:'tools/verification/m01-escort-coordination-metrics.mjs',rev:rev??'working tree',routes:routes.map(measure)},null,1));
