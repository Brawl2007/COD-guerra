// Usage (from the repo root): node docs/verification/m01-runtime/anim-variety-2026-10-18/measure.mjs <label> <outfile> [--lib]
// M01_ROOT=<tree> measures another checkout's src/ (the 'before' numbers were taken from a HEAD export with the library not wired).
// Replays the real M01 route headlessly; every 0.25 s of sim time asks the real M01Characters.describe()/resolveAnimation()
// (the exact path M01Characters.update() uses) what every active soldier would play, and tallies it. No gameplay is modified.
import fs from 'node:fs';
import * as THREE from 'three';
import {loadPack} from './clips-node.mjs';
const ROOT=process.env.M01_ROOT??new URL('../../../../',import.meta.url).pathname.replace(/\/$/,'');
const {M01Characters}=await import(ROOT+'/src/render/m01-characters.js');
const {actorPose}=await import(ROOT+'/src/render/m01-actor-pose.js');
const {resolveAnimation,GAP,fadeDuration}=await import(ROOT+'/src/render/m01-animation-resolver.js');
const {route}=await import(ROOT+'/tests/helpers/m01-route.js');
const [label,out,...flags]=process.argv.slice(2);
const packs=['base','motion','station','stationTr','crews','mg34','mg34p','ckm'];
if(flags.includes('--lib'))packs.push('lib');
const chars=new M01Characters(new THREE.Scene(),{visualVariation:false});
for(const p of packs)for(const c of await loadPack(p))chars.clips.set(c.name,c);
const loaded=[...chars.clips.keys()].sort();
const stateOf=(a,p)=>{
  if(!a.alive)return 'dead';
  if(p.name!=='standing'&&p.name!=='crouched')return p.name;                       // pinned/prone/seated/wounded/carried
  if(p.moving)return (p.name==='crouched'?'crouch-':'')+p.gait;
  if(p.firing)return 'firing';if(p.aiming)return 'aiming';
  if(a.reload||a.reloading||a.state==='RELOAD_CLIP')return 'reload';
  return p.name==='crouched'?'idle-crouched':'idle-standing';
};
const stats={clipsLoaded:loaded.length,perState:{},perClip:{},snaps:0,fades:0,transitions:0,cohort:[],cohortSamples:0};
const prev=new Map();let lastT=-1;const cohorts=[];
const sample=(sim)=>{
  const t=sim.clock,actors=sim.actors.filter(a=>a.active&&!a.civilian&&!a.displayOnly);
  const per=new Map();
  for(const a of actors){
    const pose=actorPose(a,t),s=chars.describe(a,t,sim.actors,pose,sim.battleClock,undefined);
    const st=stateOf(a,pose);
    ((stats.perState[st]??={n:0,clips:{}}).clips[s.clip]=(stats.perState[st].clips[s.clip]??0)+1);stats.perState[st].n++;
    stats.perClip[s.clip]=(stats.perClip[s.clip]??0)+1;
    const pv=prev.get(a.id),plan=resolveAnimation({actor:a,time:t,candidate:s,prev:pv&&t>=pv.t&&t-pv.t<=GAP?pv:null,alt:null});
    if(pv&&pv.target!==plan.state.target&&t-pv.t<=GAP){stats.transitions++;if(fadeDuration(pv.target,plan.state.target)>0)stats.fades++;else{stats.snaps++;const k=pv.target+'->'+plan.state.target;(stats.snapPairs??={})[k]=(stats.snapPairs[k]??0)+1;}}
    prev.set(a.id,plan.state);
    const dur=s.duration||chars.clips.get(s.clip)?.duration||1;
    const k=st+'|'+s.clip;(per.get(k)??per.set(k,[]).get(k)).push({id:a.id,phase:s.loop?(((s.time%dur)+dur)%dur)/dur:null,rate:s.rate,clip:s.clip,state:st,team:a.team});
  }
  for(const g of per.values())if(g.length>=5&&g[0].phase!==null)cohorts.push(g);
};
const sim=route(19390901,{support:true,onStep:({sim})=>{if(Math.round(sim.clock*20)%5===0&&sim.clock!==lastT){lastT=sim.clock;sample(sim);}}}).sim;
// Cohort metrics: actors in the SAME state+clip at the SAME instant (5+ of them).
const gaps=g=>{const p=g.map(x=>x.phase).sort((a,b)=>a-b);let m=1;for(let i=1;i<p.length;i++)m=Math.min(m,p[i]-p[i-1]);return m;};
const distinct=(g,q)=>new Set(g.map(x=>Math.round(x.phase/q))).size;
const rates=g=>new Set(g.map(x=>x.rate?.toFixed(4))).size;
const circ=(a,b)=>{const d=Math.abs(a-b)%1;return Math.min(d,1-d);};
let pairs=0,lock=0,pairsT=0,lockT=0;const pc={};
for(const g of cohorts)for(let i=0;i<g.length;i++)for(let j=i+1;j<g.length;j++){pairs++;const cl=g[i].clip,e=pc[cl]??={pairs:0,lockstep:0};e.pairs++;if(circ(g[i].phase,g[j].phase)<.02){lock++;e.lockstep++;}
  if(Math.abs(g[i].rate-g[j].rate)<1e-4&&g[i].clip!=='sprint'&&g[i].clip!=='run'&&g[i].clip!=='walk'){pairsT++;lockT++;}else if(g[i].clip!=='sprint'&&g[i].clip!=='run'&&g[i].clip!=='walk')pairsT++;}
const sum={groups:cohorts.length,actors:cohorts.reduce((n,g)=>n+g.length,0),
  meanDistinctPhase05:+(cohorts.reduce((n,g)=>n+distinct(g,.05)/g.length,0)/Math.max(1,cohorts.length)).toFixed(3),
  meanDistinctPhase02:+(cohorts.reduce((n,g)=>n+distinct(g,.02)/g.length,0)/Math.max(1,cohorts.length)).toFixed(3),
  medianMinGap:+[...cohorts.map(gaps)].sort((a,b)=>a-b)[Math.floor(cohorts.length/2)]?.toFixed(4),
  pairs,pairsInLockstep2pct:lock,lockstepByClip:Object.fromEntries(Object.entries(pc).map(([k,e])=>[k,{pairs:e.pairs,fraction:+(e.lockstep/e.pairs).toFixed(4)}])),lockstepPairFraction:+(lock/pairs).toFixed(4),timeLoopPairs:pairsT,timeLoopPairsSameRate:lockT,
  groupsWithAllSameRate:cohorts.filter(g=>rates(g)===1).length,
  groupsWithMinGapUnder1pct:cohorts.filter(g=>gaps(g)<.01).length,
  byClip:{}};
for(const g of cohorts){const c=g[0].clip,b=sum.byClip[c]??={groups:0,actors:0,distinct05:0,sameRate:0,minGapUnder1pct:0};
  b.groups++;b.actors+=g.length;b.distinct05+=distinct(g,.05);b.sameRate+=rates(g)===1?1:0;b.minGapUnder1pct+=gaps(g)<.01?1:0;}
const used=Object.keys(stats.perClip).sort();
const result={label,packs,clipsLoaded:loaded.length,loadedClips:loaded,distinctClipsSelected:used.length,selectedClips:Object.fromEntries(used.map(c=>[c,stats.perClip[c]])),
  neverSelectedLoaded:loaded.filter(c=>!stats.perClip[c]),
  perState:Object.fromEntries(Object.entries(stats.perState).map(([k,v])=>[k,{samples:v.n,distinctClips:Object.keys(v.clips).length,clips:v.clips}])),
  snapPairs:stats.snapPairs,transitions:stats.transitions,crossfaded:stats.fades,hardSnaps:stats.snaps,cohort:sum,finalClock:sim.clock};
fs.writeFileSync(out,JSON.stringify(result,null,1));
console.log(label,'clipsLoaded',result.clipsLoaded,'selected',result.distinctClipsSelected,'neverSelected',result.neverSelectedLoaded.length,'snaps',stats.snaps,'fades',stats.fades);
