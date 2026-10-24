// M01 R2-a: how the Polish section behaves in the main combat window, measured on the real test routes (tests/helpers/m01-route.js). Read-only: nothing here changes a simulation.
//   node tools/verification/m01-squad-coordination-metrics.mjs [--rev <git rev>] [--routes 19390901:0,7:1,...] [--jsonl <file>] [--label <text>] [--audit]
//   node tools/verification/m01-squad-coordination-metrics.mjs --summary <file.jsonl> [--label <text>]
// --rev extracts that commit's simulation (src, missions, json data of assets/research) with `git archive` and measures it with THIS tree's pilot and THIS tool's definitions, so a
// before/after pair runs the same controls and the same counting. Routes: seed:mode with mode 0 = the golden control route, 1 = the golden support pilot; the default is the 24 audit routes
// (12 seeds x both pilots; the two golden routes 19390901:0 and 7:1 are among them). One JSON line per route on stdout (and appended to --jsonl, so a restart loses nothing; a route already
// in the file under the same label is skipped). --summary prints the per-label aggregates of such a file. Deterministic: no wall clock, no paths.
// The window is 05:30:00 to 06:10:00 of the battle clock (the main combat: hold_access, the platoon's withdrawal, the deck assault, the gate hold at 06:09:30); every rate is per REAL minute
// of the time the route spends inside it (the compressed clock is not the player's time). What is counted:
//   lines        every subtitle SHOWN in the window (a new subtitle record) and, of those, the reactive ones (a `bark` rule) said by a Pole; distinct ids; the most one id repeats.
//   callouts     `section-callout` events (R2-a: a Pole sees a new threat), by kind and caller; orders (`section-order`) and casualty calls (`section-casualty`); the tree before R2-a has none.
//   patterns     the distinct reaction signatures of the callouts (kind + what each listener did), so a section that always does the same thing counts 1.
//   rounds       Polish shots in the window: Kowal's rkm bursts, the ckm gunner's bursts, the allied rifle shots (npc-shot weapon ally_rifle); and those AT A CALLED TARGET: a shot whose target is
//                the German a Pole called in the last CALLED_SEC seconds (the allied rifle shots carry `target`; Kowal's burst is read from his ai.target).
//   moves        episodes in which a man of the section (Kowal, Pawlak, the platoon voice, Zielinski) walks (motion.speed > MOVE_MPS after a second of standing), and the metres they walk in the
//                window: cover moves between posts. Scripted walkers (Bak to the deck, the sappers, Dudek, Nowicki) are not counted.
//   quiet        the longest stretch (real s) of the window with no allied action within NEAR_M of the player: a Polish shot (any source), a reactive line said by a Pole standing that near (an
//                anonymous voice counts as near), a section order/callout/move that began that near. Edges count.
//   danger       the player's wounds and health (player-hit events, lowest health, final health), the German rounds that landed within 25 m of him in the window.
//   integrity    mission completion, the 12 objective states, the four checkpoints, the survivors; with --audit also the clipping events and the men standing inside each other over the whole
//                route (tests/helpers/m01-clipping.js: it checks every man against every solid on every tick, minutes per route, so it is off by default and the golden audit tool runs it).
import {execFileSync} from 'node:child_process';
import {mkdtempSync,symlinkSync,readFileSync,existsSync,appendFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {route} from '../../tests/helpers/m01-route.js';
import {clippingAudit,stackingAudit} from '../../tests/helpers/m01-clipping.js';

const ROOT=resolve(import.meta.dirname,'../..');
const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const round=(v,n=2)=>v===null||v===undefined||!Number.isFinite(v)?null:Math.round(v*10**n)/10**n;
const NEAR_M=80,MOVE_MPS=.3,CALLED_SEC=25;   // (25 s = the section's focusWindowSec: the sergeant's focus order names a German called in the last 25 s)
const SECTION_MEN=['szymon_kowal','staszek_pawlak','east_platoon_voice','marek_zielinski'];

if(arg('--summary')){
  const label=arg('--label'),rows=readFileSync(arg('--summary'),'utf8').split('\n').filter(l=>l.trim()).map(l=>JSON.parse(l)).filter(r=>!label||r.label===label);
  const labels=[...new Set(rows.map(r=>r.label))];
  const mean=xs=>xs.length?round(xs.reduce((a,b)=>a+b,0)/xs.length,2):null,median=xs=>{const s=[...xs].sort((a,b)=>a-b);return s.length?s[Math.floor((s.length-1)/2+.5)]:null;};
  // The reactive lines that CALL something (a threat, a man down, a man pinned): the alerts that already existed (110-111 the ckm, 120-124 the MG34s, 128-135 the gates and the deck, 138-139, 143, 160 and the
  // callout «Metralhadora no dique!») and the new calls of R2-a (164-185). The rest of 164-199 are the answers, the orders and the arrival of the pair.
  const CALLS=/^(co_m01_enemy_mg_fire_on_squad|dlg_m01_(110|111|12[0-4]|13[0-5]|138|139|143|160|16[4-9]|17\d|18[0-5]))$/,ORDERS=/^dlg_m01_(18[6-9]|19\d)$/;
  const countOf=(r,re)=>Object.entries(r.lines.reactiveIds).filter(([id])=>re.test(id)).reduce((a,[,n])=>a+n,0);
  const out={};
  for(const l of labels){
    const rs=rows.filter(r=>r.label===l),pick=f=>rs.map(f);
    const patterns=new Set(rs.flatMap(r=>r.patterns.list));
    const perMin=(r,re)=>r.windowRealSec>0?countOf(r,re)/(r.windowRealSec/60):0;
    out[l]={routes:rs.length,windowRealSec:{mean:mean(pick(r=>r.windowRealSec))},
      reactiveLinesPerMin:{mean:mean(pick(r=>r.lines.reactivePerMin)),min:Math.min(...pick(r=>r.lines.reactivePerMin)),max:Math.max(...pick(r=>r.lines.reactivePerMin))},
      callLinesPerMin:{mean:mean(pick(r=>perMin(r,CALLS))),min:round(Math.min(...pick(r=>perMin(r,CALLS)))),max:round(Math.max(...pick(r=>perMin(r,CALLS))))},
      orderAnswerLinesPerMin:{mean:mean(pick(r=>perMin(r,ORDERS)))},
      maxRepeatOfOneReactiveId:{mean:mean(pick(r=>Math.max(0,...Object.values(r.lines.reactiveIds)))),max:Math.max(...pick(r=>Math.max(0,...Object.values(r.lines.reactiveIds))))},
      distinctReactiveIds:{mean:mean(pick(r=>Object.keys(r.lines.reactiveIds).length)),acrossAllRoutes:new Set(rs.flatMap(r=>Object.keys(r.lines.reactiveIds))).size},
      calloutEventsPerMin:{mean:mean(pick(r=>r.callouts.perMin)),min:Math.min(...pick(r=>r.callouts.perMin)),max:Math.max(...pick(r=>r.callouts.perMin))},
      distinctLineIds:{mean:mean(pick(r=>r.lines.distinctIds))},maxRepeatOfOneId:{max:Math.max(...pick(r=>r.lines.maxRepeatOfOneId)),mean:mean(pick(r=>r.lines.maxRepeatOfOneId))},
      patternsPerRoute:{mean:mean(pick(r=>r.patterns.distinct)),min:Math.min(...pick(r=>r.patterns.distinct)),max:Math.max(...pick(r=>r.patterns.distinct))},patternsAcrossAllRoutes:patterns.size,
      rkmBursts:{mean:mean(pick(r=>r.rounds.rkmBursts))},ckmBursts:{mean:mean(pick(r=>r.rounds.ckmBursts))},rifleShots:{mean:mean(pick(r=>r.rounds.rifleShots)),min:Math.min(...pick(r=>r.rounds.rifleShots)),max:Math.max(...pick(r=>r.rounds.rifleShots))},
      roundsAtCalledTarget:{mean:mean(pick(r=>r.rounds.atCalledTarget)),min:Math.min(...pick(r=>r.rounds.atCalledTarget)),max:Math.max(...pick(r=>r.rounds.atCalledTarget))},
      coverMoves:{mean:mean(pick(r=>r.moves.episodes)),min:Math.min(...pick(r=>r.moves.episodes)),max:Math.max(...pick(r=>r.moves.episodes))},
      longestQuietNearPlayerRealSec:{mean:mean(pick(r=>r.quiet.longestStretchRealSec)),median:median(pick(r=>r.quiet.longestStretchRealSec)),max:Math.max(...pick(r=>r.quiet.longestStretchRealSec))},
      playerHitEvents:{mean:mean(pick(r=>r.danger.playerHitEvents)),max:Math.max(...pick(r=>r.danger.playerHitEvents))},minHealth:{min:Math.min(...pick(r=>r.danger.minHealth)),mean:mean(pick(r=>r.danger.minHealth))},
      germanRoundsNear25m:{mean:mean(pick(r=>r.danger.germanRoundsNear25m))},
      complete:`${rs.filter(r=>r.integrity.complete).length}/${rs.length}`,checkpoints4:`${rs.filter(r=>r.integrity.checkpoints===4).length}/${rs.length}`,
      survivors:Object.fromEntries([...new Set(rs.map(r=>r.integrity.survivors))].sort().map(v=>[v,rs.filter(r=>r.integrity.survivors===v).length])),
      clippingEvents:rs.some(r=>r.integrity.clipping===null)?null:rs.reduce((a,r)=>a+r.integrity.clipping,0),stackedPairs:rs.some(r=>r.integrity.stackedPairs===null)?null:rs.reduce((a,r)=>a+r.integrity.stackedPairs,0),
      routeRealSec:{mean:mean(pick(r=>r.routeRealSec))}};
  }
  console.log(JSON.stringify({tool:'tools/verification/m01-squad-coordination-metrics.mjs --summary',summary:out},null,1));
  process.exit(0);
}

const rev=arg('--rev'),jsonl=arg('--jsonl'),label=arg('--label')??(rev??'working-tree'),audit=process.argv.includes('--audit');
const DEFAULT_ROUTES=[19390901,1,2,3,4,5,6,7,8,9,10,11].flatMap(seed=>[`${seed}:0`,`${seed}:1`]).join(',');
const routes=(arg('--routes')??DEFAULT_ROUTES).split(',').map(s=>{const [seed,mode]=s.split(':');return {seed:Number(seed),support:mode==='1',key:`${seed}:${mode}`};});
function extract(at){
  const dir=mkdtempSync(join(tmpdir(),'m01-r2a-metrics-'));
  const data=execFileSync('git',['-C',ROOT,'ls-tree','-r','--name-only',at,'assets','research'],{encoding:'utf8',maxBuffer:1<<26}).split('\n').filter(p=>p.endsWith('.json'));
  const tar=execFileSync('git',['-C',ROOT,'archive','--format=tar',at,'src','missions',...data],{maxBuffer:1<<29});
  execFileSync('tar',['-x','-C',dir],{input:tar});symlinkSync(join(ROOT,'node_modules'),join(dir,'node_modules'));
  return dir;
}
const treeRoot=rev?extract(rev):ROOT;
const {M01Simulation:Base,seconds}=await import(pathToFileURL(join(treeRoot,'src/game/m01-simulation.js')));
const definition=JSON.parse(readFileSync(join(treeRoot,'missions/m01-tczew/mission.json'),'utf8'));
const speakerOf=new Map([...definition.dialogue,...definition.callouts.lines].filter(l=>l.id).map(l=>[l.id,l.speaker]));
const FROM=seconds('05:30:00'),TO=seconds('06:10:00');

function measure({seed,support}){
  const o={shown:[],reactiveByPole:[],callouts:[],orders:[],casualties:[],shots:{rkm:[],ckm:[],rifle:[]},calledShots:0,calledKowal:0,moves:[],walked:{},actions:[],real:0,tick:0,t0:null,t1:null};
  const called=new Map();   // German id -> clock it was last called
  const walking={},stoodSince={};
  let lastSub=null,hits=0,minHealth=100,near25=0;const patterns=new Set();
  const clip=audit?clippingAudit():null,stack=audit?stackingAudit():null;
  class Probe extends Base{}
  const result=route(seed,{support,Simulation:Probe,onStep:step=>{
    const {sim,events}=step;o.tick++;if(audit){clip.observe(step);stack.observe(step);}
    const inWin=sim.battleClock>=FROM&&sim.battleClock<TO,p=sim.player,clock=sim.clock;
    if(sim.player.health<minHealth)minHealth=sim.player.health;
    for(const e of events){
      if(e.type==='player-hit')hits++;
      if(!inWin)continue;
      if(e.type==='round-impact'&&(e.crack||e.distance<=25))near25++;
      if(e.type==='section-callout'){
        o.callouts.push({at:clock,kind:e.kind,by:e.by,target:e.target??null});if(e.target)called.set(e.target,clock);
        if(e.reactions)patterns.add(`${e.kind}|${e.reactions.map(r=>Array.isArray(r)?r.join(':'):`${r.id}:${r.react}`).join(',')}`);
        const from=e.from??e.point;if(from&&Math.hypot(from.x-p.x,from.z-p.z)<=NEAR_M)o.actions.push(clock);
      }
      if(e.type==='section-order'){o.orders.push({at:clock,kind:e.kind});const from=e.from??e.point;if(from&&Math.hypot(from.x-p.x,from.z-p.z)<=NEAR_M)o.actions.push(clock);}
      if(e.type==='section-casualty')o.casualties.push({at:clock,victim:e.victim});
      if(e.type==='npc-shot'){
        const where=e.point,near=where&&Math.hypot(where.x-p.x,where.z-p.z)<=NEAR_M;
        if(e.weapon==='rkm_wz28'){o.shots.rkm.push(clock);const t=sim.actor('szymon_kowal')?.ai?.target;if(t&&called.has(t)&&clock-called.get(t)<=CALLED_SEC){o.calledShots+=e.rounds??1;o.calledKowal+=e.rounds??1;}}
        else{o.shots.rifle.push(clock);if(e.target&&called.has(e.target)&&clock-called.get(e.target)<=CALLED_SEC)o.calledShots+=e.rounds??1;}
        if(near)o.actions.push(clock);
      }
      if(e.type==='ally-fire'){o.shots.ckm.push(clock);if(e.origin&&Math.hypot(e.origin.x-p.x,e.origin.z-p.z)<=NEAR_M)o.actions.push(clock);}
    }
    if(!inWin)return;
    o.real+=.05;if(o.t0===null)o.t0=clock;o.t1=clock;
    const s=sim.subtitle;
    if(s&&(!lastSub||lastSub.id!==s.id||lastSub.until!==s.until)){
      lastSub={id:s.id,until:s.until};o.shown.push({at:clock,id:s.id,bark:s.bark===true});
      if(s.bark===true){
        const who=speakerOf.get(s.id),a=who&&who!=='jan_wrona'?sim.actor(who):null;
        // an anonymous voice (any_pl) has no body: counted as near, it is the soldiers around him
        const near=!a||Math.hypot(a.x-p.x,a.z-p.z)<=NEAR_M;
        if(who!=='jan_wrona'){o.reactiveByPole.push({at:clock,id:s.id,speaker:who??null,near});if(near)o.actions.push(clock);}
      }
    }
    for(const id of SECTION_MEN){
      const a=sim.actor(id);if(!a||!a.alive||!a.active)continue;
      const moving=(a.motion?.speed??0)>MOVE_MPS;
      if(moving){
        if(!walking[id]&&(stoodSince[id]===undefined||clock-stoodSince[id]>=1)){walking[id]=true;o.moves.push({at:clock,id,x:a.x,z:a.z});if(Math.hypot(a.x-p.x,a.z-p.z)<=NEAR_M)o.actions.push(clock);}
        o.walked[id]=(o.walked[id]??0)+(a.motion.speed*.05);stoodSince[id]=undefined;
      }else{walking[id]=false;if(stoodSince[id]===undefined)stoodSince[id]=clock;}
    }
  }});
  return {sim:result.sim,o,hits,minHealth,near25,patterns,clip,stack};
}
function summarise(key,{seed,support},m){
  const {sim,o,hits,minHealth,near25,patterns,clip,stack}=m;
  const real=o.real,perMin=n=>real>0?round(n/(real/60),2):null;
  const reactive=o.reactiveByPole,ids=new Map();for(const l of o.shown)ids.set(l.id,(ids.get(l.id)??0)+1);
  const acts=[...o.actions].sort((a,b)=>a-b);
  let gap=0,prev=o.t0,gapAt=null;for(const t of [...acts.filter(t=>t>=o.t0&&t<=o.t1),o.t1]){if(t-prev>gap){gap=t-prev;gapAt=prev;}prev=t;}
  const kindCounts=Object.fromEntries([...new Set(o.callouts.map(c=>c.kind))].sort().map(k=>[k,o.callouts.filter(c=>c.kind===k).length]));
  const callers=Object.fromEntries([...new Set(o.callouts.map(c=>c.by))].sort().map(k=>[k,o.callouts.filter(c=>c.by===k).length]));
  const objectives=Object.fromEntries(Object.entries(sim.objectives).map(([id,x])=>[id.replace('obj_m01_',''),x.state]));
  const reactiveIds=reactive.reduce((acc,l)=>acc.set(l.id,(acc.get(l.id)??0)+1),new Map());
  return {key,seed,support,windowRealSec:round(real,1),
    lines:{shown:o.shown.length,reactiveByPole:reactive.length,reactivePerMin:perMin(reactive.length),distinctIds:ids.size,maxRepeatOfOneId:Math.max(0,...ids.values()),reactiveIds:Object.fromEntries([...reactiveIds].sort())},
    callouts:{events:o.callouts.length,perMin:perMin(o.callouts.length),byKind:kindCounts,byCaller:callers,orders:o.orders.length,
      ordersByKind:Object.fromEntries([...new Set(o.orders.map(c=>c.kind))].sort().map(k=>[k,o.orders.filter(c=>c.kind===k).length])),casualtyCalls:o.casualties.length},
    patterns:{distinct:patterns.size,list:[...patterns].sort()},
    rounds:{rkmBursts:o.shots.rkm.length,ckmBursts:o.shots.ckm.length,rifleShots:o.shots.rifle.length,atCalledTarget:o.calledShots,atCalledTargetByKowal:o.calledKowal},
    moves:{episodes:o.moves.length,byMan:Object.fromEntries(SECTION_MEN.map(id=>[id,o.moves.filter(m=>m.id===id).length])),walkedM:Object.fromEntries(Object.entries(o.walked).map(([k,v])=>[k,round(v,1)]))},
    quiet:{nearM:NEAR_M,actionsNearPlayer:acts.filter(t=>t>=o.t0&&t<=o.t1).length,longestStretchRealSec:round(gap,1),startsAtRealSec:round(gapAt,1)},
    danger:{playerHitEvents:hits,minHealth:round(minHealth,2),finalHealth:round(sim.player.health,2),germanRoundsNear25m:near25},
    integrity:{complete:sim.mission.complete,finalBattleClock:sim.battleClock,checkpoints:sim.checkpointsReached.length,survivors:sim.flags['m01.east_platoon_survivors'],objectives,
      clipping:clip?clip.events.length:null,stackedPairs:stack?stack.summary().pairs:null},
    routeRealSec:round(sim.clock,1),ticks:o.tick};
}
const done=new Set();
if(jsonl&&existsSync(jsonl))for(const line of readFileSync(jsonl,'utf8').split('\n')){if(!line.trim())continue;try{const r=JSON.parse(line);if(r.label===label)done.add(r.key);}catch{/* a torn last line */}}
for(const r of routes){
  if(done.has(r.key)){console.error(`skip ${r.key} (done)`);continue;}
  const row={...summarise(r.key,r,measure(r)),label};
  const line=JSON.stringify(row);console.log(line);if(jsonl)appendFileSync(jsonl,line+'\n');
}
