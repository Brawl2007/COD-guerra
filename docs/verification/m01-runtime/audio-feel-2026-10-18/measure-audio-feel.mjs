// Mede a variedade (anti-robótico) dos planos sonoros puros e dos sons de AudioManager. Só Node, determinista, sem rede.
// Uso: node measure-audio-feel.mjs > before.txt   (a mesma ferramenta corre antes e depois da correção)
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
// AUDIO_SRC_ROOT = another checkout (the "before" tree, e.g. from `git archive 98f094f src missions`); default = this repository.
const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,'../../../..'),srcRoot=process.env.AUDIO_SRC_ROOT?path.resolve(process.env.AUDIO_SRC_ROOT):repo;
const B=await import(pathToFileURL(path.join(srcRoot,'src/core/battlefield-audio.js')).href);
const {AudioManager}=await import(pathToFileURL(path.join(srcRoot,'src/core/audio.js')).href);
const {FakeAudioContext}=await import(pathToFileURL(path.join(repo,'tests/helpers/fake-audio-context.js')).href);

const N=200,out=[];
const log=(...a)=>out.push(a.join(' '));
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const std=a=>{const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)));};
const cv=a=>{const m=mean(a);return m?std(a)/Math.abs(m):0;};
const q=(v,rel=.02)=>v===0?0:Math.round(Math.log(Math.abs(v))/Math.log(1+rel));   // 2 % bins ~ just-noticeable pitch/gain step
const fixed=(n,d=3)=>Number(n).toFixed(d);

function describePlans(title,make){
  const plans=Array.from({length:N},(_,i)=>make(`ev${i}`));
  const signatures=new Set(plans.map(p=>p.map(g=>g.layer).join('>')));
  // Pair test: two events are "the same sound" to a listener when the structure is equal and every grain is within a
  // just-noticeable difference: pitch/filter 60 cents, gain 1.5 dB, onset 4 ms, duration 15 %.
  const same=(x,y)=>x.length===y.length&&x.every((g,i)=>{const h=y[i];if(g.layer!==h.layer)return false;
    const fa=g.freq??g.filter?.freq,fb=h.freq??h.filter?.freq;
    if(Number.isFinite(fa)&&Math.abs(1200*Math.log2(fa/fb))>=60)return false;
    if(Math.abs(20*Math.log10((g.vol||1e-9)/(h.vol||1e-9)))>=1.5)return false;
    if(Math.abs((g.at??0)-(h.at??0))>=.004)return false;
    return Math.abs(Math.log((g.dur||1e-9)/(h.dur||1e-9)))<.14;});
  let pairs=0,alike=0;for(let i=0;i<plans.length;i++)for(let j=i+1;j<plans.length;j++){pairs++;if(same(plans[i],plans[j]))alike++;}
  const prints={size:`${fixed(100*alike/pairs,1)}% of event pairs indistinguishable`};
  const byLayer={};
  for(const p of plans)for(const g of p){(byLayer[g.layer]??=[]).push(g);}
  const rows=Object.entries(byLayer).map(([layer,gs])=>{
    const f=gs.map(g=>g.freq??g.filter?.freq).filter(Number.isFinite),v=gs.map(g=>g.vol),a=gs.map(g=>g.at??0);
    return `${layer.padEnd(10)} n=${String(gs.length).padStart(3)}/${N} freqCV=${f.length?fixed(cv(f)*100,1)+'%':'  -  '} gainSD=${fixed(20*std(v.map(x=>Math.log10(Math.max(1e-9,x)))),2)}dB atSD=${fixed(std(a)*1000,1)}ms`;
  });
  log(`## ${title}`);log(`   distinct layer structures: ${signatures.size}/${N}   ${prints.size}`);
  rows.forEach(r=>log('   '+r));
}

log('# Audio feel measurement, '+N+' events per class, distinct keys, deterministic\n');
for(const weapon of ['kb_wz29','kar98k','ally_rifle','mg34','rkm_wz28','ckm_wz30'])
  for(const d of weapon==='kb_wz29'?[1]:[15,150,600])describePlans(`single shot ${weapon} @${d} m`,key=>B.planWeaponShot(weapon,d,{key}));
// Burst timing: inter-round gap statistics
for(const [weapon,interval,rounds] of [['mg34',.075,7],['rkm_wz28',.11,5],['ckm_wz30',.1,6]]){
  const gaps=[];for(let i=0;i<N;i++){
    const g=B.planWeaponBurst(weapon,30,{rounds,interval,key:'b'+i}).filter(x=>x.layer==='crack').map(x=>x.at).sort((a,b)=>a-b);
    for(let k=1;k<g.length;k++)gaps.push(g[k]-g[k-1]);}
  log(`## burst ${weapon} interval ${interval}s: gap mean=${fixed(mean(gaps)*1000,2)}ms sd=${fixed(std(gaps)*1000,2)}ms (min ${fixed(Math.min(...gaps)*1000,1)} max ${fixed(Math.max(...gaps)*1000,1)})`);
}
// Display/background fire has no authoritative cadence: does the planner break the metronome there?
for(const [weapon,interval,rounds] of [['mg34',.075,8]]){
  const gaps=[];for(let i=0;i<N;i++){
    const g=B.planWeaponBurst(weapon,30,{rounds,interval,key:'d'+i,cadenceJitter:.06}).filter(x=>x.layer==='crack').map(x=>x.at).sort((a,b)=>a-b);
    for(let k=1;k<g.length;k++)gaps.push(g[k]-g[k-1]);}
  log(`## display-fire burst ${weapon} (cadenceJitter .06): gap mean=${fixed(mean(gaps)*1000,2)}ms sd=${fixed(std(gaps)*1000,2)}ms (min ${fixed(Math.min(...gaps)*1000,1)} max ${fixed(Math.max(...gaps)*1000,1)})`);
}
// Variant coverage (structural voicings per family), where the planner exposes them.
if(B.pickVariant){
  const cover=(family,count)=>{const h=Array(count).fill(0);for(let i=0;i<N;i++)h[B.pickVariant(family,'k'+i,count)]++;return h.join('/');};
  log('## variants per family over '+N+' events (counts per variant)');
  for(const id of ['kb_wz29','kar98k','ally_rifle','mg34','rkm_wz28','ckm_wz30'])log(`   shot ${id}: ${cover(id+':0',B.SHOT_VARIANTS)}`);
  for(const m of B.IMPACT_MATERIALS)log(`   impact ${m}: ${cover('impact:'+m,B.IMPACT_VARIANTS)}`);
  log(`   explosion: ${cover('blast:large',B.EXPLOSION_VARIANTS)}   bullet pass: ${cover('pass:crack',B.PASS_VARIANTS)}`);
}else log('## variants per family: none (every event of a class has one structure)');
for(const m of B.IMPACT_MATERIALS)describePlans(`impact ${m} @8 m`,key=>B.planImpact(m,8,{key}));
for(const s of ['small','large'])describePlans(`explosion ${s} @60 m`,key=>B.planExplosion(s,60,{key}));
describePlans('bullet crack (near miss)',key=>B.planBulletPass('crack',{key}));
describePlans('bullet whizz',key=>B.planBulletPass('whizz',{key}));

// Sounds that bypass the plans: what does the manager really schedule for the same call, repeated on ONE manager (as in a session)?
function managerFingerprints(title,call,repeat=40){
  const ctx=new FakeAudioContext(),audio=new AudioManager({contextFactory:()=>ctx,quality:'high'});audio.init();
  const prints=new Set();let sources=0,nodes=0;
  for(let i=0;i<repeat;i++){
    const base=ctx.sources.length,n0=audio.nodesCreated,t0=ctx.currentTime;call(audio,i);
    const mine=ctx.sources.slice(base);sources+=mine.length;nodes+=audio.nodesCreated-n0;
    // what a listener could tell apart: oscillator pitch (50 cents bins), start time (5 ms) and noise rate (2 %); the white-noise read offset is inaudible and not counted
    prints.add(mine.map(s=>[s.type,s.type==='oscillator'?Math.round(1200*Math.log2(Math.max(20,s.frequency?.events?.[0]?.[1]??s.frequency?.value??440))/50):Math.round(Math.log(s.playbackRate.value)/Math.log(1.02)),
      Math.round(((s.startAt??0)-t0)*200)].join(':')).join('|'));
    ctx.flush();ctx.currentTime+=1;
  }
  log(`## ${title}: ${prints.size}/${repeat} perceptually distinct renderings; ${fixed(sources/repeat,1)} sources and ${fixed(nodes/repeat,1)} new nodes per call`);
  audio.dispose();
}
managerFingerprints('wz29 bolt mechanism',a=>a.wz29Mechanism('bolt'));
managerFingerprints('wz29 reload clip',a=>a.wz29Mechanism('clip'));
managerFingerprints('wz29 reload (reload())',a=>a.reload());
managerFingerprints('player hit',a=>a.hit());
managerFingerprints('landing speed 6',a=>a.landing(6,'ground'));
managerFingerprints('wz29 shot (player)',a=>a.wz29Shot());
managerFingerprints('kar98k 150 m',(a,i)=>a.weaponFire('kar98k',.2,150,{key:'k'+i}));
managerFingerprints('footstep (if present)',(a,i)=>{if(typeof a.footstep==='function')a.footstep('earth',{key:'f'+i});});

// Distance model: monotonic?
log('## distance model (acousticShape, weapon): d gain filterHz send');
for(const d of [1,5,15,45,100,220,450,950,2000]){const s=B.acousticShape(d,{category:'weapon'});log(`   ${String(d).padStart(5)} m  gain=${fixed(s.gain,3)} lp=${Math.round(s.filter)} send=${fixed(s.send,2)} delay=${fixed(B.soundDelay(d)*1000,0)}ms band=${s.band}`);}
console.log(out.join('\n'));
