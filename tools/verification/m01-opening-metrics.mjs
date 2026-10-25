// M01 R1-b: how the opening (04:30 to the first bombs of 04:34) reads from the player's own place, measured on three pilots of the real simulation. Read-only; deterministic (no wall clock, no paths).
//   node tools/verification/m01-opening-metrics.mjs [--rev <git rev>] [--pilots fast,rush,tourist] [--seeds 19390901,1,2] [--jsonl <file>] [--label <text>] [--series]
//   node tools/verification/m01-opening-metrics.mjs --summary <file.jsonl>
// Which tree is measured: the working tree by default; --rev <rev> extracts that commit (src, missions, the json data of assets / research) with `git archive`. The pilots, the visibility rule and the
// counting are always THIS tool's, so a before / after pair runs the same controls. One JSON line per (pilot, seed).
// Pilots (tools/verification/m01-opening-pilot.mjs; the controls of the player, nothing else is injected): fast (the golden route opening, the intro skipped), rush (the intro watched, then straight
// to the forward post and the message) and tourist (the intro watched, looks at the section, walks to the sappers camp, waits at the forward post for the planes).
// Measured (real seconds are the simulation's `clock`, battle seconds its `battleClock`):
//   stimuli   the first moments something of the war reaches the player: the planes heard (evt_m01_planes_heard), the first aircraft inside his field of view (the horizontal half angle of the
//             70 degree vertical FOV at 16:9 is 51.3 degrees; `m01-aircraft-path.js` positions), the first aerial bomb whose plume he can see (in view, line of sight to 25 m above the crater, within 1500 m),
//             the first casualty (killed / wounded by a bomb, `m01-blast` effects) he can see (in view, line of sight, within 150 m) and the first shot of any kind. `firstVisible` is the earliest of
//             bombVisible / casualtyVisible / shot: the first combat stimulus a player SEES (planes and sounds are listed apart).
//   census    once per real second until 20 s after the first bomb: the Polish soldiers (team ally, alive, present, not carried, not the player) that are in view (within 120 m, 51.3 degrees, line of
//             sight) and, apart, those within 60 m whatever the direction; for each its activity LABEL: the `act` of the opening record (sim.openingView) when the tree has one, else the state-derived label of
//             the tree before it (stand / kneel / walk / run / sapper_work / clean_rkm / ckm_<phase> / seated / pinned / wounded). Reported: the distinct labels in view per second (mean, maximum) and
//             over the whole opening, the same within 60 m, the number of soldiers in view (mean, maximum) and the label histogram.
import {execFileSync} from 'node:child_process';
import {mkdtempSync,symlinkSync,readFileSync,appendFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {openingPilot,OPENING_PILOTS} from './m01-opening-pilot.mjs';

const ROOT=resolve(import.meta.dirname,'../..');
const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const round=(v,n=2)=>v===null||v===undefined||!Number.isFinite(v)?null:Math.round(v*10**n)/10**n;
const mean=xs=>xs.length?round(xs.reduce((a,b)=>a+b,0)/xs.length,2):null;

if(arg('--summary')){
  const rows=readFileSync(arg('--summary'),'utf8').split('\n').filter(l=>l.trim()).map(l=>JSON.parse(l));
  const out={};
  for(const label of [...new Set(rows.map(r=>r.label))])for(const pilot of [...new Set(rows.map(r=>r.pilot))]){
    const rs=rows.filter(r=>r.label===label&&r.pilot===pilot);if(!rs.length)continue;
    out[`${label}/${pilot}`]={runs:rs.length,
      planesHeardReal:mean(rs.map(r=>r.stimuli.planesHeard?.real)),aircraftVisibleReal:mean(rs.map(r=>r.stimuli.aircraftVisible?.real)),
      bombVisibleReal:mean(rs.map(r=>r.stimuli.bombVisible?.real)),casualtyVisibleReal:mean(rs.map(r=>r.stimuli.casualtyVisible?.real)),firstVisibleReal:mean(rs.map(r=>r.stimuli.firstVisible?.real)),
      distinctInViewMean:mean(rs.map(r=>r.census.inView.distinctMean)),distinctInViewMax:Math.max(...rs.map(r=>r.census.inView.distinctMax)),distinctInViewTotal:mean(rs.map(r=>r.census.inView.distinctTotal)),
      distinctWithin60Mean:mean(rs.map(r=>r.census.within60.distinctMean)),distinctWithin60Max:Math.max(...rs.map(r=>r.census.within60.distinctMax)),distinctWithin60Total:mean(rs.map(r=>r.census.within60.distinctTotal)),
      soldiersInViewMean:mean(rs.map(r=>r.census.inView.countMean)),soldiersInViewMax:Math.max(...rs.map(r=>r.census.inView.countMax))};
  }
  console.log(JSON.stringify({tool:'tools/verification/m01-opening-metrics.mjs --summary',summary:out},null,1));
  process.exit(0);
}

const rev=arg('--rev'),jsonl=arg('--jsonl'),series=process.argv.includes('--series');
const label=arg('--label')??(rev??'working-tree');
const PILOTS=(arg('--pilots')??OPENING_PILOTS.join(',')).split(',');
const SEEDS=(arg('--seeds')??'19390901').split(',').map(Number);
function extract(at){
  const dir=mkdtempSync(join(tmpdir(),'m01-r1b-metrics-'));
  const data=execFileSync('git',['-C',ROOT,'ls-tree','-r','--name-only',at,'assets','research'],{encoding:'utf8',maxBuffer:1<<26}).split('\n').filter(p=>p.endsWith('.json'));
  const tar=execFileSync('git',['-C',ROOT,'archive','--format=tar',at,'src','missions',...data],{maxBuffer:1<<29});
  execFileSync('tar',['-x','-C',dir],{input:tar});symlinkSync(join(ROOT,'node_modules'),join(dir,'node_modules'));
  return dir;
}
const treeRoot=rev?extract(rev):ROOT;
const {M01Simulation:Sim,seconds,clockText}=await import(pathToFileURL(join(treeRoot,'src/game/m01-simulation.js')));
const aircraft=await import(pathToFileURL(join(treeRoot,'src/world/m01-aircraft-path.js')));
const done=new Set(jsonl&&existsSync(jsonl)?readFileSync(jsonl,'utf8').split('\n').filter(l=>l.trim()).map(l=>JSON.parse(l)).filter(r=>r.label===label).map(r=>`${r.pilot}:${r.seed}`):[]);

const HALF_FOV=51.3*Math.PI/180,VERT_HALF=35*Math.PI/180;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const hdist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
/** In the player's horizontal field of view. */
const inFov=(sim,p)=>Math.abs(wrap(Math.atan2(p.z-sim.player.z,p.x-sim.player.x)-sim.player.angle))<HALF_FOV;
const seen=(sim,p,y=0)=>sim.world.lineOfSight(sim.player,{x:p.x,y:(p.y??0)+y,z:p.z});
/** What the soldier is doing, as far as the tree knows: the opening record's act when there is one, else the state-derived label of the tree before it. */
function labelOf(sim,a){
  const act=sim.openingView?.acts?.[a.id]?.act;if(act)return act;
  if(a.state==='WOUNDED')return 'wounded';
  if(a.carriedBy)return 'carried';
  if(a.pose==='seated')return 'seated';
  if(sim.clock<a.suppressedUntil)return 'pinned';
  const g=a.motion?.gait;
  if(g&&g!=='idle'&&(a.motion.speed??0)>.05)return g==='crouch_walk'?'crouch_walk':g==='sprint'||g==='run'?'run':'walk';
  if(a.group==='grp_ckm_crew')return `ckm_${a.ckm?.phase??'idle'}`;
  if(a.id==='szymon_kowal')return sim.battleClock<seconds('04:33:10')&&!Number.isFinite(a.firedAt)?'clean_rkm':a.crouched?'rkm_kneel':'rkm_stand';
  if(a.role==='ENGINEER'&&a.crouched)return 'sapper_work';
  if(a.crouched)return 'kneel';
  return 'stand';
}
const polish=(sim,a)=>a.team==='ally'&&a.alive&&a.active&&!a.carriedBy&&a.state!=='DOWN';

function measure(seed,pilot){
  const sim=new Sim(seed);
  const o={planesHeard:null,aircraftVisible:null,bombVisible:null,casualtyVisible:null,shot:null,bomb:null,casualty:null,firstBomb:null};
  const rows=[];let lastCensus=-1;
  const stamp=()=>({real:round(sim.clock,2),battle:clockText(sim.battleClock)});
  function observe(events){
    if(o.planesHeard===null&&sim.consumedEvent('evt_m01_planes_heard'))o.planesHeard=stamp();
    if(o.planesHeard&&o.aircraftVisible===null){
      const state={consumed:sim.consumed,damage:sim.sectors.damage,battleClock:sim.battleClock},since=sim.clock-aircraft.m01StukaAnchor(sim.clock,state);
      for(let i=0;i<aircraft.M01_STUKA_COUNT;i++){
        if(!aircraft.m01StukaActive(since,i))continue;
        const p=aircraft.m01StukaPosition(since,i),h=hdist(p,sim.player),d=Math.hypot(h,p.y-1.6);
        if(h<6500&&inFov(sim,p)&&Math.abs(Math.atan2(p.y-1.6,h)-sim.player.pitch)<VERT_HALF&&d>0){o.aircraftVisible=stamp();break;}
      }
    }
    for(const e of events){
      if(['npc-shot','enemy-fire','ally-fire','player-shot','distant-shot'].includes(e.type)&&o.shot===null)o.shot={...stamp(),type:e.type};
      if(e.type==='m01-blast'&&e.aerial&&e.kind==='bomb'){
        o.bomb??={...stamp(),id:e.point&&`${Math.round(e.point.x)},${Math.round(e.point.z)}`,distance:round(hdist(e.point,sim.player),1)};
        if(o.bombVisible===null&&hdist(e.point,sim.player)<1500&&inFov(sim,e.point)&&seen(sim,e.point,25))o.bombVisible={...stamp(),distance:round(hdist(e.point,sim.player),1)};
        for(const how of ['killed','wounded'])for(const id of e.effects?.[how]??[]){
          const a=sim.actor(id);o.casualty??={...stamp(),id,how};
          if(o.casualtyVisible===null&&a&&hdist(a,sim.player)<150&&inFov(sim,a)&&seen(sim,a,1))o.casualtyVisible={...stamp(),id,how,distance:round(hdist(a,sim.player),1)};
        }
      }
    }
    // the census, once per real second, from the first tick of control until 20 s after the first bomb
    const second=Math.floor(sim.clock);
    if(second!==lastCensus&&(o.bomb===null||sim.clock-parseFloat(o.bomb.real)<20)&&sim.battleClock<seconds('04:35:00')){
      lastCensus=second;
      const inView=[],near=[];
      for(const a of sim.actors){
        if(a.displayOnly&&hdist(a,sim.player)>120)continue;
        if(!polish(sim,a))continue;
        const d=hdist(a,sim.player);
        if(d<=60)near.push({id:a.id,label:labelOf(sim,a),d:round(d,1)});
        if(d<=120&&inFov(sim,a)&&seen(sim,a,1))inView.push({id:a.id,label:labelOf(sim,a),d:round(d,1)});
      }
      rows.push({real:second,battle:clockText(sim.battleClock),scene:sim.scene?.id??null,inView,near});
    }
  }
  openingPilot(sim,pilot,(_,events)=>observe(events));
  const dist=(rowsList,key)=>rowsList.map(r=>new Set(r[key].map(x=>x.label)).size);
  const total=key=>new Set(rows.flatMap(r=>r[key].map(x=>x.label))).size;
  const histo=key=>{const h={};for(const r of rows)for(const x of r[key])h[x.label]=(h[x.label]??0)+1;return Object.fromEntries(Object.entries(h).sort((a,b)=>b[1]-a[1]));};
  const sum=key=>{const d=dist(rows,key),c=rows.map(r=>r[key].length);
    return {distinctMean:mean(d),distinctMax:Math.max(0,...d),distinctTotal:total(key),countMean:mean(c),countMax:Math.max(0,...c),labels:histo(key)};};
  const first=[o.bombVisible,o.casualtyVisible,o.shot].filter(Boolean).sort((a,b)=>a.real-b.real)[0]??null;
  const result={tool:'tools/verification/m01-opening-metrics.mjs',label,pilot,seed,
    stimuli:{planesHeard:o.planesHeard,aircraftVisible:o.aircraftVisible,firstBomb:o.bomb,bombVisible:o.bombVisible,casualtyAny:o.casualty,casualtyVisible:o.casualtyVisible,shot:o.shot,firstVisible:first},
    census:{seconds:rows.length,inView:sum('inView'),within60:sum('near')},
    end:{real:round(sim.clock,2),battle:clockText(sim.battleClock),delivered:sim.done('deliver_message')}};
  if(series)result.series=rows;
  return result;
}
for(const pilot of PILOTS)for(const seed of SEEDS){
  if(done.has(`${pilot}:${seed}`)){console.error(`skip ${pilot}:${seed} (${label})`);continue;}
  const row=measure(seed,pilot);console.log(JSON.stringify(row));
  if(jsonl)appendFileSync(jsonl,JSON.stringify(row)+'\n');
}
