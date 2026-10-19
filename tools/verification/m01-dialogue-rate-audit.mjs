// M01-DIALOGUE-V1: how much the dialogue talks. Lines per minute, reactive lines ("barks") per minute, the busiest 60 s window, the longest silence while the fight is on, one subtitle
// at a time (no scripted line starts over another) and at most two reactive voices alive, on the two golden routes (seed 19390901 control and seed 7 with the covering-fire pilot, the
// routes of every golden) and on a probe route (not a golden) where the player holds the squad post beside Kowal, Bąk and Zieliński so that every rule bound to a speaker in earshot is live.
// It only reads sim.subtitle and sim.dialogueQueue after each tick of the real pilots (tests/helpers/m01-route.js): nothing is simulated twice, nothing draws from a random stream.
//   node tools/verification/m01-dialogue-rate-audit.mjs [--before <checkout of the predecessor> [--before-label <commit>]] [--out <file>] [--timeline]
// `--before` runs the same measurement on another tree (git archive of the predecessor, node_modules linked) so that the account carries before and after side by side.
// Definitions: a LINE starts the first tick its subtitle (id, until) appears; "combat" is the real-time stretch in which the battle clock is between 04:45:00 and 06:10:00 (the silence is
// counted from the start of that stretch to its end, so the edges count); "busiest 60 s" is the largest number of line starts in any [t, t+60) real seconds.
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const arg=name=>{const i=process.argv.indexOf(name);return i>0?process.argv[i+1]:null;};
const LIVE=resolve(new URL('../..',import.meta.url).pathname),BEFORE=arg('--before')?resolve(arg('--before')):null;
const OUT=resolve(arg('--out')??join(LIVE,'docs/verification/m01-runtime/dialogue-2026-10-19/LINE_RATE.json'));
const COMBAT=['04:45:00','06:10:00'],ROUTES=[{seed:19390901,support:false},{seed:7,support:true}];
const r2=n=>Math.round(n*100)/100;

async function load(root){
  const sim=await import(pathToFileURL(join(root,'src/game/m01-simulation.js'))),helper=await import(pathToFileURL(join(root,'tests/helpers/m01-route.js')));
  return {...sim,...helper};
}
/** Records every line of a run: `drive(onStep)` plays the pilot and returns the final simulation. */
async function record(root,drive){
  const tree=await load(root),{seconds,clockText}=tree,from=seconds(COMBAT[0]),to=seconds(COMBAT[1]);
  const lines=[],mark={from:null,to:null};let last=null,voices=0;
  const sim=drive(tree,({sim})=>{
    if(mark.from===null&&sim.battleClock>=from)mark.from=sim.clock;
    if(mark.to===null&&sim.battleClock>=to)mark.to=sim.clock;
    const s=sim.subtitle;
    if(s&&(!last||last.id!==s.id||last.until!==s.until))lines.push({id:s.id,speaker:s.speaker,at:r2(s.until-s.duration),duration:r2(s.duration),bark:Boolean(s.bark),priority:s.priority??null,battle:clockText(sim.battleClock),text:s.text});
    last=s?{id:s.id,until:s.until}:null;
    voices=Math.max(voices,(s?.bark?1:0)+sim.dialogueQueue.filter(l=>l.bark).length);
  });
  return {lines,mark,voices,real:sim.clock,complete:sim.mission.complete};
}
function busiest(list){   // list is in time order
  let best=0,from=0;
  for(let i=0;i<list.length;i++){let n=0;while(i+n<list.length&&list[i+n].at<list[i].at+60)n++;if(n>best){best=n;from=list[i].at;}}
  return {n:best,from};
}
function silence(lines,mark){   // longest stretch of the combat window with no subtitle on screen, edges included
  if(mark.from===null)return null;
  const to=mark.to??Infinity;let cursor=mark.from,best=0,where=mark.from;
  for(let i=0;i<lines.length;i++){
    const next=lines[i+1]?.at??Infinity,end=Math.min(lines[i].at+lines[i].duration,next);
    if(lines[i].at>=to)break;
    if(end<=mark.from)continue;
    const gap=lines[i].at-cursor;if(gap>best){best=gap;where=cursor;}
    cursor=Math.max(cursor,end);
  }
  if(Number.isFinite(to)&&to-cursor>best){best=to-cursor;where=cursor;}
  return {longestSec:r2(best),startsAtReal:r2(where)};
}
function summary(run,{timeline}={}){
  const {lines,mark,voices,real}=run,barks=lines.filter(l=>l.bark);
  const inCombat=lines.filter(l=>mark.from!==null&&l.at>=mark.from&&l.at<(mark.to??Infinity));
  const combatSec=(mark.to??real)-(mark.from??real);
  let scriptedOverlaps=0,barkCuts=0;
  for(let i=1;i<lines.length;i++)if(lines[i].at<lines[i-1].at+lines[i-1].duration-1e-6){if(lines[i-1].bark)barkCuts++;else scriptedOverlaps++;}
  const byId={};for(const b of barks)byId[b.id.replace('dlg_m01_','')]=(byId[b.id.replace('dlg_m01_','')]??0)+1;
  const minGap=list=>{let m=Infinity;for(let i=1;i<list.length;i++)m=Math.min(m,list[i].at-list[i-1].at);return m===Infinity?null:r2(m);};
  const out={realSeconds:r2(real),all:{lines:lines.length,perMinute:r2(lines.length/(real/60)),busiest60s:lines.length?busiest(lines):null,minStartGapSec:minGap(lines)},
    barks:{lines:barks.length,perMinute:r2(barks.length/(real/60)),busiest60s:barks.length?busiest(barks):null,minStartGapSec:minGap(barks),byPriority:{1:barks.filter(b=>b.priority===1).length,2:barks.filter(b=>b.priority===2).length,3:barks.filter(b=>b.priority===3).length},distinct:Object.keys(byId).length,perLine:byId},
    combat:{from:COMBAT[0],to:COMBAT[1],realSeconds:r2(combatSec),lines:inCombat.length,perMinute:combatSec>0?r2(inCombat.length/(combatSec/60)):null,silence:silence(lines,mark)},
    maxReactiveVoicesAlive:voices,scriptedStartedOverAnother:scriptedOverlaps,reactiveCutByTheNextLine:barkCuts};
  if(timeline)out.timeline=lines.map(l=>`${String(l.at).padStart(7)} ${l.battle} ${l.bark?'B'+l.priority:'  '} ${l.id.replace('dlg_m01_','').padEnd(30)} ${l.speaker.slice(0,16).padEnd(16)} ${l.text.slice(0,50)}`);
  return out;
}
const routeDrive=({seed,support})=>({route},onStep)=>route(seed,{support,onStep}).sim;
/** Not a golden route: the control route, but the player holds the squad post during the repair and the hold. */
const probeDrive=({driver,toRepair},onStep)=>{
  const d=toRepair(driver(19390901,{support:false,onStep})),{sim,step,until,walk}=d;
  walk(-73,24);step({crouch:true});until(()=>sim.active('hold_access'),500);step({crouch:true});
  walk(-115,32);walk(-30,40);walk(-10,40);walk(30,40);until(()=>sim.consumedEvent('evt_m01_east_demolition'),500);
  walk(-15,40);walk(-115,27);walk(-275,27);walk(-292,26);until(()=>sim.consumedEvent('evt_m01_west_demolition'),500);
  return sim;
};

const timeline=process.argv.includes('--timeline');
const sha=root=>createHash('sha256').update(readFileSync(join(root,'src/game/m01-simulation.js'))).digest('hex');
const account={task:'M01-DIALOGUE-V1',trees:{after:{simulationSha256:sha(LIVE)},...(BEFORE?{before:{label:arg('--before-label'),simulationSha256:sha(BEFORE)}}:{})},what:'lines per minute, reactive lines per minute, busiest 60 s, longest silence in combat, voices alive; deterministic (no clock, no path)',
  definitions:{scriptedLines:'with --before: every scripted line the predecessor said is still said, in order (lost must be empty, orderKept true)',line:'first tick a subtitle (id, until) appears',combat:`real time while the battle clock is in [${COMBAT[0]}, ${COMBAT[1]}), edges included`,busiest60s:'largest number of line starts in any [t, t+60) real seconds'},
  routes:[],probe:null};
/** The scripted lines (no bark rule) the predecessor said are all still said, in the same order; `gained` are the ones that were wired (030/035/036 have rules, 042/047/067 events). */
function scriptedCheck(before,after){
  const sb=before.lines.map(l=>l.id),sa=after.lines.filter(l=>!l.bark).map(l=>l.id);
  const count=list=>list.reduce((m,id)=>(m[id]=(m[id]??0)+1,m),{}),cb=count(sb),ca=count(sa);
  let matched=0;for(const id of sa)if(id===sb[matched])matched++;
  return {before:sb.length,after:sa.length,lost:Object.keys(cb).filter(id=>(ca[id]??0)<cb[id]),gained:Object.keys(ca).filter(id=>(cb[id]??0)<ca[id]),orderKept:matched===sb.length};
}
for(const {seed,support} of ROUTES){
  const now=await record(LIVE,routeDrive({seed,support})),row={seed,support,after:summary(now,{timeline})};
  if(BEFORE){const was=await record(BEFORE,routeDrive({seed,support}));row.before=summary(was,{timeline});row.scriptedLines=scriptedCheck(was,now);}
  account.routes.push(row);
  console.log(JSON.stringify({seed,support,after:{...row.after,barks:{...row.after.barks,perLine:undefined},timeline:undefined},before:row.before&&{...row.before,timeline:undefined}}));
}
account.probe={route:'control route, player at the squad post during the repair and the hold (not a golden)',after:summary(await record(LIVE,probeDrive),{timeline})};
console.log(JSON.stringify({probe:{...account.probe.after,barks:{...account.probe.after.barks,perLine:undefined},timeline:undefined}}));
if(timeline)for(const row of [...account.routes.map(r=>r.after),account.probe.after])console.log(row.timeline.join('\n')+'\n');
if(!timeline||process.argv.includes('--out')){mkdirSync(dirname(OUT),{recursive:true});writeFileSync(OUT,JSON.stringify(account,null,1)+'\n');console.log('written',OUT);}
