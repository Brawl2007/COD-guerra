// M01 R3-a: how the sappers' operation unfolds (the repair of the ignition line), measured on the real test routes (tests/helpers/m01-route.js). Read-only; deterministic (no wall clock, no paths).
//   node tools/verification/m01-sappers-metrics.mjs [--rev <git rev>] [--routes 19390901:0,7:1,...] [--jsonl <file>] [--label <text>] [--audit]
//   node tools/verification/m01-sappers-metrics.mjs --summary <file.jsonl> [--label <text>] [--vs <label>]
// Which tree is measured: the working tree by default; --rev <rev> extracts that commit (src, missions, the json data of assets / research) with `git archive`. The pilot, the routes and the
// counting are always THIS tool's and THIS tree's tests/helpers/m01-route.js, so a before / after pair runs the same controls. Routes: seed:mode, mode 0 = the golden control route (the pilot
// never fires), 1 = the support pilot (he keeps the gate MG down); the default is the 24 audit routes (12 seeds x both pilots). One JSON line per route (stdout and --jsonl; a route already in
// the file under the same label is skipped).
// Measured per route, from the delivery of the crate (obj_m01_cover_repair active) to the repair complete:
//   timing      the real clock of the delivery and of evt_m01_repair_complete, the repair's real seconds (150 s of work plus what the pins cost), the battle clock of the end and its margin to
//               the order of 05:30 (the repair must be complete before it), the real seconds of the order, the east demolition and the route's end.
//   stages      (the stage is a function of the 0-100 bar, so the old tree is read in the same stages) the real seconds the bar spent in each stage of the plan and the work seconds in it,
//               and, in the new tree, the real clock each phase of the operation (locate, standby, ..., ready, verify) began.
//   interruptions  the episodes of timers.repairSuppressedUntil (a pin or a bomb stopped the bar): how many, how long, the stage each fell in, and who interrupted: the shooter of the
//               first round that pinned the crew (de_east_0 and _1 are the MG34s, 2-13 the gate riflemen, the rest the dike), or a bomb.
//   cover       the share of the time after train 963 (during the repair) that the gate MG (de_east_0) was suppressed or dead: the player's covering fire; and the pins.
//   integrity   completion, the four checkpoints, the survivors, the twelve objective states; with --audit the clipping events and the men standing inside each other over the whole route.
import {execFileSync} from 'node:child_process';
import {mkdtempSync,symlinkSync,readFileSync,appendFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {route} from '../../tests/helpers/m01-route.js';
import {clippingAudit,stackingAudit} from '../../tests/helpers/m01-clipping.js';
import {SAPPERS,sapperPhase} from '../../src/game/m01-sappers.js';

const ROOT=resolve(import.meta.dirname,'../..');
const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const round=(v,n=2)=>v===null||v===undefined||!Number.isFinite(v)?null:Math.round(v*10**n)/10**n;
const mean=xs=>xs.length?round(xs.reduce((a,b)=>a+b,0)/xs.length,2):null;
const IDS=['pawel_krawiec','sapper_2','sapper_3'],STAGES=SAPPERS.stages.map(s=>s.id);
const stageOf=p=>{const w=p/100*150;let i=SAPPERS.stages.length-1;while(i>0&&w<SAPPERS.stages[i].start-1e-9)i--;return SAPPERS.stages[i].id;};
const shooterClass=by=>by==='de_east_0'?'mg34_0':by==='de_east_1'?'mg34_1':/^de_east_([2-9]|1[0-3])$/.test(by)?'gate_rifle':/^de_east_/.test(by)?'dike_rifle':by?.startsWith('de_spans')?'deck':by??'unknown';

if(arg('--summary')){
  const file=arg('--summary'),label=arg('--label'),vs=arg('--vs');
  const all=readFileSync(file,'utf8').split('\n').filter(l=>l.trim()).map(l=>JSON.parse(l));
  const table=l=>{
    const rs=all.filter(r=>r.label===l);if(!rs.length)return null;
    const per=mode=>rs.filter(r=>r.support===(mode==='support'));
    const row=rs2=>({routes:rs2.length,repairSec:{mean:mean(rs2.map(r=>r.repair.sec)),min:Math.min(...rs2.map(r=>r.repair.sec)),max:Math.max(...rs2.map(r=>r.repair.sec))},
      completeBattle:{latest:rs2.map(r=>r.repair.endBattle).sort().at(-1),minMarginTo0530Sec:Math.min(...rs2.map(r=>r.repair.marginTo0530Sec)),beforeOrder:`${rs2.filter(r=>r.repair.marginTo0530Sec>0).length}/${rs2.length}`},
      pins:{mean:mean(rs2.map(r=>r.repair.pins)),min:Math.min(...rs2.map(r=>r.repair.pins)),max:Math.max(...rs2.map(r=>r.repair.pins))},
      episodes:{mean:mean(rs2.map(r=>r.interruptions.episodes)),meanSec:mean(rs2.map(r=>r.interruptions.meanSec)),stoppedSec:mean(rs2.map(r=>r.interruptions.stoppedSec))},
      mgSuppressedPct:mean(rs2.map(r=>r.cover.mgSuppressedPct)),
      byShooter:Object.fromEntries([...new Set(rs2.flatMap(r=>Object.keys(r.interruptions.byShooter)))].sort().map(k=>[k,mean(rs2.map(r=>r.interruptions.byShooter[k]??0))])),
      byStage:Object.fromEntries(STAGES.map(s=>[s,{episodes:mean(rs2.map(r=>r.interruptions.byStage[s]??0)),realSec:mean(rs2.map(r=>r.stages[s]?.realSec??0)),workSec:mean(rs2.map(r=>r.stages[s]?.workSec??0))}])),
      realMinutes:{orderReal:mean(rs2.map(r=>r.integrity.orderRealSec)),eastReal:mean(rs2.map(r=>r.integrity.eastRealSec)),routeReal:mean(rs2.map(r=>r.integrity.routeRealSec))},
      integrity:{complete:`${rs2.filter(r=>r.integrity.complete).length}/${rs2.length}`,checkpoints4:`${rs2.filter(r=>r.integrity.checkpoints===4).length}/${rs2.length}`,survivors:Object.fromEntries([...new Set(rs2.map(r=>r.integrity.survivors+(r.support?'s':'c')))].sort().map(v=>[v,rs2.filter(r=>r.integrity.survivors+(r.support?'s':'c')===v).length])),
        clipping:rs2.some(r=>r.integrity.clipping===null)?null:rs2.reduce((a,r)=>a+r.integrity.clipping,0),stackedPairs:rs2.some(r=>r.integrity.stackedPairs===null)?null:rs2.reduce((a,r)=>a+r.integrity.stackedPairs,0)}});
    const seeds=[...new Set(rs.map(r=>r.seed))],margins=seeds.map(seed=>{const c=rs.find(r=>r.seed===seed&&!r.support),s=rs.find(r=>r.seed===seed&&r.support);return c&&s?{seed,marginSec:round(c.repair.sec-s.repair.sec,1),pinsGap:c.repair.pins-s.repair.pins}:null;}).filter(Boolean);
    return {control:row(per('control')),support:row(per('support')),playerCover:{marginsIgnoreMinusHelp:margins,minMarginSec:Math.min(...margins.map(m=>m.marginSec)),meanMarginSec:mean(margins.map(m=>m.marginSec)),meanPinsGap:mean(margins.map(m=>m.pinsGap))}};
  };
  const out={};for(const l of [...new Set(all.map(r=>r.label))])if(!label||l===label||l===vs)out[l]=table(l);
  console.log(JSON.stringify({tool:'tools/verification/m01-sappers-metrics.mjs --summary',summary:out},null,1));
  process.exit(0);
}

const rev=arg('--rev'),jsonl=arg('--jsonl'),audit=process.argv.includes('--audit');
const label=arg('--label')??(rev??'working-tree');
const DEFAULT_ROUTES=[19390901,1,2,3,4,5,6,7,8,9,10,11].flatMap(seed=>[`${seed}:0`,`${seed}:1`]).join(',');
const routes=(arg('--routes')??DEFAULT_ROUTES).split(',').map(s=>{const [seed,mode]=s.split(':');return {seed:Number(seed),support:mode==='1',key:`${seed}:${mode}`};});
function extract(at){
  const dir=mkdtempSync(join(tmpdir(),'m01-r3a-metrics-'));
  const data=execFileSync('git',['-C',ROOT,'ls-tree','-r','--name-only',at,'assets','research'],{encoding:'utf8',maxBuffer:1<<26}).split('\n').filter(p=>p.endsWith('.json'));
  const tar=execFileSync('git',['-C',ROOT,'archive','--format=tar',at,'src','missions',...data],{maxBuffer:1<<29});
  execFileSync('tar',['-x','-C',dir],{input:tar});symlinkSync(join(ROOT,'node_modules'),join(dir,'node_modules'));
  return dir;
}
const treeRoot=rev?extract(rev):ROOT;
const {M01Simulation:Sim,seconds,clockText}=await import(pathToFileURL(join(treeRoot,'src/game/m01-simulation.js')));
const done=new Set(jsonl&&existsSync(jsonl)?readFileSync(jsonl,'utf8').split('\n').filter(l=>l.trim()).map(l=>JSON.parse(l)).filter(r=>r.label===label).map(r=>r.key):[]);

function measure({seed,support,key}){
  const o={delivered:null,complete:null,episodes:[],open:null,pinsAtTick:[],stageReal:{},stageWork:{},phaseAt:{},mgSup:0,mgTicks:0,
    events:{order:null,east:null,west:null},lastProgress:0,lastStage:null,pending:null};
  const clip=audit?clippingAudit():null,stack=audit?stackingAudit():null;
  const r=route(seed,{support,Simulation:Sim,onStep:step=>{
    const {sim,events}=step,t=sim.clock;
    if(audit){clip.observe(step);stack.observe(step);}
    if(o.delivered===null&&sim.active('cover_repair'))o.delivered=t;
    if(o.complete===null&&sim.done('cover_repair')){o.complete=t;o.completeBattle=sim.battleClock;}
    if(o.events.order===null&&sim.consumedEvent('evt_m01_order_demolish'))o.events.order=sim.consumed.evt_m01_order_demolish;
    if(o.events.east===null&&sim.consumedEvent('evt_m01_east_demolition'))o.events.east=sim.consumed.evt_m01_east_demolition;
    if(!rev){const ph=sapperPhase(sim).id;if(o.phaseAt[ph]===undefined)o.phaseAt[ph]=round(t,2);}   // the real clock each phase of the operation began
    if(sim.active('cover_repair')){
      const p=sim.objectives.obj_m01_cover_repair.progress,st=stageOf(p);
      o.stageReal[st]=(o.stageReal[st]??0)+.05;o.stageWork[st]=(o.stageWork[st]??0)+(p-o.lastProgress)/100*150;o.lastProgress=p;
      if(sim.consumedEvent('evt_m01_train963_arrives')){o.mgTicks++;const mg=sim.actor('de_east_0');if(!mg.alive||t<mg.suppressedUntil)o.mgSup++;}   // the gate MG34 neutralised: suppressed or dead (the support pilot kills it)
      const pinned=t<sim.timers.repairSuppressedUntil;
      // who interrupted: the shooter of the first round that pins the crew in this tick, or a bomb that shakes it
      for(const e of events){
        if(e.type==='round-impact'&&e.pinned?.some(x=>IDS.includes(x)))o.pending??={by:shooterClass(e.by),kind:'round'};
        if(e.type==='m01-blast'&&e.effects?.suppressed?.some(x=>IDS.includes(x)))o.pending??={by:'bomb',kind:'bomb'};
      }
      if(pinned&&!o.open){o.open={at:t,stage:st,by:o.pending?.by??'unknown'};}
      else if(!pinned&&o.open){o.episodes.push({...o.open,sec:round(t-o.open.at,2)});o.open=null;}
      o.pending=null;
    }
  }});
  const s=r.sim,sec=x=>x===null?null:round(x,2);
  const eps=o.episodes,byStage={},byShooter={};
  for(const e of eps){byStage[e.stage]=(byStage[e.stage]??0)+1;byShooter[e.by]=(byShooter[e.by]??0)+1;}
  return {tool:'tools/verification/m01-sappers-metrics.mjs',label,key,seed,support,
    repair:{deliveredAt:sec(o.delivered),completeAt:sec(o.complete),sec:sec(o.complete-o.delivered),endBattle:clockText(o.completeBattle),marginTo0530Sec:round(seconds('05:30:00')-o.completeBattle,1),pins:s.timers.repairPins??0},
    stages:Object.fromEntries(Object.keys(o.stageReal).map(k=>[k,{realSec:round(o.stageReal[k],2),workSec:round(o.stageWork[k],2)}])),
    phaseAt:rev?null:o.phaseAt,
    interruptions:{episodes:eps.length,meanSec:eps.length?round(eps.reduce((a,e)=>a+e.sec,0)/eps.length,2):0,stoppedSec:round(eps.reduce((a,e)=>a+e.sec,0),1),byStage,byShooter,list:eps.map(e=>[round(e.at-o.delivered,1),e.stage,e.by,e.sec])},
    cover:{mgSuppressedPct:round(100*o.mgSup/Math.max(1,o.mgTicks),1)},
    integrity:{complete:s.mission.complete,checkpoints:s.checkpointsReached.length,survivors:s.flags['m01.east_platoon_survivors'],objectives:Object.fromEntries(Object.entries(s.objectives).map(([k,v])=>[k.replace('obj_m01_',''),v.state])),
      orderRealSec:sec(o.events.order),eastRealSec:sec(o.events.east),routeRealSec:sec(s.clock),clipping:audit?clip.events.length:null,stackedPairs:audit?stack.summary().pairs:null}};
}
for(const rt of routes){
  if(done.has(rt.key)){console.error(`skip ${rt.key} (${label})`);continue;}
  const row=measure(rt);console.log(JSON.stringify(row));
  if(jsonl)appendFileSync(jsonl,JSON.stringify(row)+'\n');
}
