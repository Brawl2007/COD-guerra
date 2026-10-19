// M01 NPC navigator cost per simulation tick. Not run by npm test; x86_64 Node (the same routes and walks as the goldens), wall-clock numbers are of the machine they ran on.
//
// What it measures, on a tree (the working tree, or any tree extracted from git with its data: --root DIR; the simulation, the pilot and the walk pairs all come from that tree):
//   routes  the two golden routes of tests/helpers/m01-route.js (seed 19390901 without support, seed 7 with the covering-fire pilot), the simulation tick only (the pilot's own work is outside);
//   free    the 150 deterministic free-play walks of tests/m01-npc-navigation.test.js (the same pairs, the same time allowed), one fresh simulation each;
//   queue   (not in `all`) the 24 routes of the posture-staging invariants audit (seeds 19390901 and 1..11, with and without the covering-fire pilot): how many route() calls a tick ever has,
//           and how many requests the one-route-per-tick queue refused (0 on a tree that has no queue). Not timed.
// per group: ticks, the tick time (mean, p50, p99, p99.9, max, how many ticks over 5 / 16 / 50 / 100 ms), the route() calls (total, the most in one tick, their total and longest time),
// the slowest ticks (what else they did: events, route calls) and the construction and first-tick time of a simulation (free walks).
// --mode alloc  adds the bytes allocated per tick (heap + external buffers, before and after the tick). Run it with
//               node --expose-gc --min-semi-space-size=256 --max-semi-space-size=256 so that no scavenge falls inside a tick; a tick that still saw one is counted in `discarded`, not averaged.
// --mode gc     the same, with a full collection before every 20th tick and only those ticks counted (an independent check of the figure above).
// --ticks PREFIX writes the raw time of every tick (Float32, little endian) to PREFIX.route0.f32, .route1.f32 and .free.f32 so that tools/verification/m01-nav-perf-merge.mjs can take the
// per-tick minimum over several runs of the same deterministic simulation (a tick is the same work in every run; what a loaded machine adds to it is not).
//   node tools/verification/m01-nav-perf.mjs [--root DIR] [--mode time|alloc|gc] [--what routes|free|all|queue] [--walks 150] [--slow 5] [--out FILE] [--ticks PREFIX]
import v8 from 'node:v8';
import os from 'node:os';
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {join,resolve} from 'node:path';

const arg=(k,d)=>{const i=process.argv.indexOf(k);return i<0?d:process.argv[i+1];};
const ROOT=resolve(arg('--root',join(import.meta.dirname,'../..'))),MODE=arg('--mode','time'),WHAT=arg('--what','all'),OUT=arg('--out'),TICKS=arg('--ticks'),WALKS=Number(arg('--walks','150')),SLOW=Number(arg('--slow','5'));
const imp=f=>import(pathToFileURL(join(ROOT,f)));
const {M01Simulation}=await imp('src/game/m01-simulation.js');
const {route}=await imp('tests/helpers/m01-route.js');
if(MODE!=='time'&&typeof globalThis.gc!=='function'&&MODE==='gc')throw new Error('--mode gc needs node --expose-gc');
const heap=()=>{const h=v8.getHeapStatistics();return h.used_heap_size+h.external_memory;};
const round=(v,d=3)=>+v.toFixed(d);

class Meter {
  constructor(){this.ms=[];this.bytes=[];this.discarded=0;this.routeCalls=0;this.routeMs=0;this.routeMax=0;this.maxInTick=0;this.inTick=0;this.slowest=[];this.sampled=0;this.muted=false;}
  stat(a){const s=[...a].sort((x,y)=>x-y),q=p=>s.length?s[Math.min(s.length-1,Math.floor(p*s.length))]:0;return {n:s.length,mean:s.reduce((x,y)=>x+y,0)/(s.length||1),p50:q(.5),p99:q(.99),p999:q(.999),max:s.at(-1)??0};}
  noteSlow(ms,sim){
    if(this.slowest.length<SLOW||ms>this.slowest.at(-1).ms){
      this.slowest.push({ms:round(ms),clock:round(sim.clock,2),battle:Math.round(sim.battleClock),routes:this.inTick,events:[...new Set(sim.events.map(e=>e.type))].slice(0,6)});
      this.slowest.sort((a,b)=>b.ms-a.ms);this.slowest.length=Math.min(this.slowest.length,SLOW);
    }
  }
  report(){
    const t=this.stat(this.ms),b=this.stat(this.bytes);
    return {ticks:t.n,tickMs:{mean:round(t.mean,4),p50:round(t.p50,4),p99:round(t.p99,4),p999:round(t.p999,4),max:round(t.max)},
      over:{ms5:this.ms.filter(x=>x>5).length,ms16:this.ms.filter(x=>x>16).length,ms50:this.ms.filter(x=>x>50).length,ms100:this.ms.filter(x=>x>100).length},
      route:{calls:this.routeCalls,maxPerTick:this.maxInTick,totalMs:round(this.routeMs,2),maxMs:round(this.routeMax,2)},slowest:this.slowest,
      allocBytesPerTick:MODE==='time'?null:{sampled:b.n,mean:Math.round(b.mean),p50:Math.round(b.p50),p99:Math.round(b.p99),max:Math.round(b.max),discarded:this.discarded}};
  }
}
function timedClass(meter){
  return class Timed extends M01Simulation {
    constructor(...a){super(...a);this.hook();}
    hook(){
      const nav=this.navigator;if(nav.__hooked)return;nav.__hooked=true;const real=nav.route.bind(nav);
      nav.route=(...args)=>{const t=performance.now(),r=real(...args),d=performance.now()-t;meter.routeCalls++;meter.inTick++;meter.routeMs+=d;if(d>meter.routeMax)meter.routeMax=d;return r;};
    }
    tick(dt,c){
      if(!this.navigator.__hooked)this.hook();
      if(meter.muted)return super.tick(dt,c);
      meter.inTick=0;meter.sampled++;
      const sample=MODE==='alloc'||MODE==='gc'&&meter.sampled%20===0;
      if(MODE==='gc'&&sample)globalThis.gc();
      const h0=sample?heap():0,t=performance.now();super.tick(dt,c);const d=performance.now()-t;
      if(sample){const b=heap()-h0;if(b<0)meter.discarded++;else meter.bytes.push(b);}
      meter.ms.push(d);if(meter.inTick>meter.maxInTick)meter.maxInTick=meter.inTick;meter.noteSlow(d,this);
    }
  };
}
const results={tool:'tools/verification/m01-nav-perf.mjs',root:ROOT.replace(/^.*\//,''),mode:MODE,node:process.version,arch:process.arch,cpus:os.cpus().length,loadAverageAtStart:os.loadavg().map(v=>round(v,2)),routes:[],free:null};
if(WHAT==='routes'||WHAT==='all')for(const [seed,support] of [[19390901,false],[7,true]]){
  const meter=new Meter(),Timed=timedClass(meter),t0=performance.now();
  route(seed,{support,Simulation:Timed});
  const r={seed,support,...meter.report(),wallSec:round((performance.now()-t0)/1000,1)};results.routes.push(r);console.error(JSON.stringify(r));
  if(TICKS)writeFileSync(`${TICKS}.route${results.routes.length-1}.f32`,Buffer.from(Float32Array.from(meter.ms).buffer));
}
if(WHAT==='free'||WHAT==='all'){
  // The 150 pairs of tests/m01-npc-navigation.test.js: the same stream, the same filters, the same time allowed per walk.
  let seed=12345;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const probe=new M01Simulation(17);probe.tick(.05,{skip:true});const nav=probe.navigator,free=(x,z)=>{const y=probe.world.heightAt(x,z);return y>-6&&!nav.blockedAt(x,z,.45,y);};
  const pairs=[];
  while(pairs.length<WALKS){
    const a=[-440+rnd()*445,-12+rnd()*87],b=[-440+rnd()*445,-12+rnd()*87],d=Math.hypot(a[0]-b[0],a[1]-b[1]);
    if(!free(...a)||!free(...b)||d<15||d>160)continue;
    const ya=probe.world.heightAt(...a),yb=probe.world.heightAt(...b);if(Math.abs(ya-yb)>1.5)continue;
    const way=nav.route({x:a[0],z:a[1],y:ya,radius:.3},{x:b[0],z:b[1]});
    if(way)pairs.push({a,b,length:way.reduce((sum,q,i)=>sum+Math.hypot(q[0]-(i?way[i-1][0]:a[0]),q[1]-(i?way[i-1][1]:a[1])),0)});
  }
  const meter=new Meter(),Timed=timedClass(meter),ctor=[],first=[];let failed=0,arrivedTicks=0;const t0=performance.now();
  for(const p of pairs){
    const c0=performance.now(),s=new Timed(17);ctor.push(performance.now()-c0);
    const f0=performance.now();meter.muted=true;s.tick(.05,{skip:true});meter.muted=false;first.push(performance.now()-f0);   // the set-up tick is not a walk
    const man=s.actor('staszek_pawlak');
    Object.assign(man,{x:p.a[0],z:p.a[1],y:s.world.heightAt(p.a[0],p.a[1]),target:{x:p.b[0],z:p.b[1]},state:'GUARD'});
    const limit=Math.ceil((Math.max(Math.hypot(p.a[0]-p.b[0],p.a[1]-p.b[1]),p.length)/3.6*2.2+10)/.05);let arrived=false,i=0;
    for(;i<limit&&!arrived;i++){s.tick(.05,{});arrived=Math.hypot(man.x-p.b[0],man.z-p.b[1])<.8;}
    if(!arrived)failed++;arrivedTicks+=i;
  }
  const stat=a=>{const s=[...a].sort((x,y)=>x-y);return {mean:round(s.reduce((x,y)=>x+y,0)/s.length),p50:round(s[Math.floor(s.length/2)]),max:round(s.at(-1))};};
  results.free={walks:pairs.length,failed,arrivedTicksTotal:arrivedTicks,...meter.report(),constructionMs:stat(ctor),firstTickMs:stat(first),wallSec:round((performance.now()-t0)/1000,1)};
  console.error(JSON.stringify(results.free));
  if(TICKS)writeFileSync(`${TICKS}.free.f32`,Buffer.from(Float32Array.from(meter.ms).buffer));
}
if(WHAT==='queue'){
  results.queue=[];
  for(const support of [false,true])for(const seed of [19390901,1,2,3,4,5,6,7,8,9,10,11]){
    const q={seed,support,ticks:0,routeCalls:0,maxRoutesInOneTick:0,refusedRequests:0,ticksWithARefusal:0};let inTick=0,refusedInTick=0;
    class Counted extends M01Simulation {
      constructor(...a){super(...a);const nav=this.navigator,real=nav.route.bind(nav);nav.route=(...args)=>{q.routeCalls++;inTick++;return real(...args);};}
      takeRouteSlot(){const ok=super.takeRouteSlot();if(!ok){q.refusedRequests++;refusedInTick++;}return ok;}
      tick(dt,c){inTick=0;refusedInTick=0;super.tick(dt,c);q.ticks++;if(inTick>q.maxRoutesInOneTick)q.maxRoutesInOneTick=inTick;if(refusedInTick)q.ticksWithARefusal++;}
    }
    route(seed,{support,Simulation:Counted});results.queue.push(q);console.error(JSON.stringify(q));
  }
  results.queueSummary={routes:results.queue.length,routeCalls:results.queue.reduce((n,q)=>n+q.routeCalls,0),maxRoutesInOneTick:Math.max(...results.queue.map(q=>q.maxRoutesInOneTick)),
    refusedRequests:results.queue.reduce((n,q)=>n+q.refusedRequests,0)};
  console.error(JSON.stringify(results.queueSummary));
}
results.loadAverageAtEnd=os.loadavg().map(v=>round(v,2));
if(OUT)writeFileSync(OUT,JSON.stringify(results,null,1)+'\n');
