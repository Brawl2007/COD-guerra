// R7-a: repetition audit of the synthesized battlefield audio on the full control route (seed 19390901, the route of every golden), headless and sim-driven.
// The real simulation is driven by tests/helpers/m01-route.js; every audible event is mapped to the same AudioManager calls that src/game/game.js makes (immediately or after
// distance/343 s) and the real M01AudioDirector adds the emitters and the footsteps. The AudioManager runs on a fake AudioContext (tests/helpers/fake-audio-context.js): nothing is
// rendered, the audit records the structural variant each plan chose (VariantTracker log) plus the bark/subtitle ids. Nobody listened to anything: this measures the structure of the
// choices, not how they sound.
//   node tools/verification/m01-audio-repetition-audit.mjs [--out <file>]
// Without the guard (variantGuard:false) the manager reproduces the previous stateless hash choice; with it, no group repeats the same variant twice in a row. Both are measured in the same run.
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {AudioManager} from '../../src/core/audio.js';
import {M01AudioDirector} from '../../src/game/audio-director-m01.js';
import {enemyFireSoundPlan} from '../../src/game/m01-audio-events.js';
import {roundImpactSoundPlan} from '../../src/core/battlefield-audio.js';
import {FakeAudioContext} from '../../tests/helpers/fake-audio-context.js';
import {route} from '../../tests/helpers/m01-route.js';

const arg=name=>{const i=process.argv.indexOf(name);return i>0?process.argv[i+1]:null;};
const ROOT=resolve(new URL('../..',import.meta.url).pathname);
const OUT=resolve(arg('--out')??join(ROOT,'docs/verification/m01-runtime/audio-layers-r7a-2026-10-25/REPETITION_AUDIT.json'));

/** Longest run of one value, and the longest period p>=2 such that a window of p items is immediately repeated (xx pattern, "short cycle"). */
export function repetitionStats(seq){
  let run=1,maxRun=seq.length?1:0;
  for(let i=1;i<seq.length;i++){run=seq[i]===seq[i-1]?run+1:1;if(run>maxRun)maxRun=run;}
  let maxSquare=0;
  for(let p=2;p<=12;p++)for(let i=0;i+2*p<=seq.length;i++){let ok=true;for(let j=0;j<p;j++)if(seq[i+j]!==seq[i+p+j]){ok=false;break;}if(ok){maxSquare=p;break;}}
  let back=0;for(let i=1;i<seq.length;i++)if(seq[i]===seq[i-1])back++;
  let abab=0;for(let i=0;i+4<=seq.length;i++)if(seq[i]===seq[i+2]&&seq[i+1]===seq[i+3]&&seq[i]!==seq[i+1])abab++;
  return {n:seq.length,maxRun,abab,backToBack:back,backToBackPct:seq.length>1?Math.round(back/(seq.length-1)*1000)/10:0,maxSquarePeriod:maxSquare};
}
const sectionOf=group=>group.startsWith('shot:mg34')||group.startsWith('shot:rkm')||group.startsWith('shot:ckm')?'mg-bursts':group.startsWith('shot:')?'rifle-shots':group.startsWith('impact:')?'impacts':group.startsWith('step:')?'footsteps':group.startsWith('blast:')?'explosions':group.startsWith('pass:')?'bullet-passes':group.startsWith('phit')?'player-hit':'other';

function run(variantGuard){
  const ctx=new FakeAudioContext(),audio=new AudioManager({contextFactory:()=>ctx,variantGuard,variantLog:true});audio.init();
  const director=new M01AudioDirector(audio),pending=[],barks=[];let lastSub=null;
  const spatialOf=(sim,p)=>{const dx=p.x-sim.player.x,dz=p.z-sim.player.z,a=Math.atan2(dz,dx)-sim.player.angle;return {distance:Math.hypot(dx,dz),pan:Math.sin(a),front:Math.cos(a),dy:0};};
  const sim=route(19390901,{support:false,onStep:({sim,events})=>{
    ctx.currentTime=sim.clock;
    for(const e of events){
      const clock=sim.clock.toFixed(3);
      if(e.type==='player-shot'){
        audio.wz29Shot(0,0,`wz29:${sim.weapon.shotCount}`);audio.wz29Mechanism('bolt',`bolt:${sim.weapon.shotCount}`);
        if(e.material&&e.material!=='character'){const s=spatialOf(sim,e.point);pending.push({...s,at:sim.clock+s.distance/343,kind:'impact',material:e.material,key:`player:${sim.weapon.shotCount}`});}
      }
      if(e.type==='npc-shot'){const s=spatialOf(sim,e.point);pending.push(e.rounds>1?{...s,at:sim.clock+s.distance/343,kind:'fire',weapon:'rkm_wz28',rounds:e.rounds,interval:.11,key:`kowal:${clock}`}:{...s,at:sim.clock+s.distance/343,kind:'fire',weapon:'ally_rifle',key:`ally:${clock}`});}
      if(e.type==='enemy-fire'||e.type==='ally-fire'){const s=enemyFireSoundPlan(e,sim.player),source=`${e.weapon}@${Math.round(e.origin.x)},${Math.round(e.origin.z)}`;pending.push({...s,kind:'fire',rounds:e.rounds,interval:e.interval,weapon:e.weapon,source,key:`${source}:${e.at.toFixed(3)}`});}
      if(e.type==='round-impact'){
        const s=spatialOf(sim,e.point),key=`${e.by}:${clock}`;
        if(e.crack)audio.crack(s.pan,Math.min(12,e.distance),key,s.front);
        const plan=roundImpactSoundPlan(e.distance,sim.clock);
        if(plan.audible){if(plan.immediate)audio.impact(e.material,s.pan,e.distance,key,s.front);else pending.push({...s,distance:e.distance,at:plan.at,kind:'impact',material:e.material,key,front:s.front});}
      }
      if(e.type==='player-hit')audio.hit(`hit:${clock}`);
      if(e.type==='m01-blast'){const s=spatialOf(sim,e.point);pending.push({...s,at:e.soundAt,kind:'blast',scale:e.kind==='grenade'?'small':e.kind==='demolition'?'demolition':'large',key:`blast:${e.soundAt.toFixed(3)}`});}
      director.handleEvent(e,sim);
    }
    for(let i=pending.length-1;i>=0;i--){const p=pending[i];if(p.at>sim.clock)continue;pending.splice(i,1);
      if(p.kind==='fire')audio.weaponFire(p.weapon??'kar98k',p.pan,p.distance,{rounds:p.rounds,interval:p.interval,key:p.key,front:p.front,source:p.source,water:p.water});
      else if(p.kind==='impact')audio.impact(p.material,p.pan,p.distance,p.key,p.front??1);
      else if(p.kind==='blast')audio.explosion(p.pan,p.distance,{scale:p.scale,key:p.key});}
    director.update(sim);
    audio.updateM01Presentation({clock:sim.clock,state:sim.renderState,spatial:point=>spatialOf(sim,point),phase:sim.mission.phase,listener:sim.player});
    // Completed voices are released by the real graph on `onended`; the fake context never ends them, so finish them here to keep the voice cap from hiding the choices.
    for(const s of ctx.sources)if(s.started&&!s.stopped&&!s.loop&&s.stopAt<=sim.clock)s.finish?.();
    const sub=sim.subtitle;if(sub&&sub.bark&&(!lastSub||lastSub.id!==sub.id||lastSub.until!==sub.until))barks.push(sub.id);lastSub=sub?{id:sub.id,until:sub.until}:null;
  }}).sim;
  const groups={};for(const {group,variant} of audio.variants.log)(groups[group]??=[]).push(variant);
  const sections={};
  for(const [group,seq] of Object.entries(groups)){const sec=sectionOf(group);(sections[sec]??={sequence:[],groups:{}});sections[sec].groups[group]=repetitionStats(seq);}
  // A section is judged on its worst group (the structural choice a listener hears in sequence), plus the interleaved sequence of the whole section in event order.
  const order={};for(const {group,variant} of audio.variants.log){const sec=sectionOf(group);(order[sec]??=[]).push(`${group}#${variant}`);}
  const report={};
  for(const [sec,v] of Object.entries(sections)){
    const stats=Object.values(v.groups);
    report[sec]={events:stats.reduce((a,s)=>a+s.n,0),groups:v.groups,worstMaxRun:Math.max(...stats.map(s=>s.maxRun)),worstBackToBackPct:Math.max(...stats.map(s=>s.backToBackPct)),worstSquarePeriod:Math.max(...stats.map(s=>s.maxSquarePeriod)),abab:stats.reduce((a,s)=>a+s.abab,0),
      sectionInterleaved:repetitionStats(order[sec])};
  }
  return {report,barks:{lines:barks.length,...repetitionStats(barks)},adjusted:audio.variants.adjusted,clock:sim.clock,complete:sim.mission.complete,
    events:Object.fromEntries([...audio.events.entries()].sort()),railAmbience:audio.events.get('rail-ambience')??0};
}

const before=run(false),after=run(true);
const account={task:'R7-a audio repetition audit',route:'control route seed 19390901 (support:false)',note:'structure of variant choices only; nobody listened. before = stateless hash choice (variantGuard:false), after = VariantTracker guard.',before,after};
mkdirSync(dirname(OUT),{recursive:true});writeFileSync(OUT,JSON.stringify(account,null,1)+'\n');
const line=r=>Object.entries(r.report).map(([k,v])=>`${k.padEnd(14)} n=${String(v.events).padStart(6)} worstRun=${v.worstMaxRun} worstBackToBack=${v.worstBackToBackPct}% worstSquare=${v.worstSquarePeriod} ABAB=${v.abab}`).join('\n');
console.log('BEFORE\n'+line(before)+`\nbarks ${JSON.stringify(before.barks)}\nAFTER\n`+line(after)+`\nbarks ${JSON.stringify(after.barks)}\nadjusted ${after.adjusted}; rail-ambience events ${after.railAmbience}\nwritten ${OUT}`);
