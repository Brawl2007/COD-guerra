import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {DISTANT_SECTORS,DISTANT_LIMITS,MILESTONE_EVENTS,SAFE_DISTANCE,BUCKET,distanceFromMovementArea,distantMilestones,planDistantBattlefield,
  activeEvents,bucketEvent,sectorLevel,sectorEnvelope,squadFigures,activeSquads,distantAircraft,kozlinyVehicles,fireColumns} from '../src/render/m01-distant-battlefield-plan.js';
import {M01DistantBattlefield} from '../src/render/m01-distant-battlefield.js';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {route} from './helpers/m01-route.js';

// One genuine route through the real simulation (controls only): authoritative milestones and snapshots come from it.
const shots={};
const run=route(19390901,{onStep:({sim})=>{
  const c=sim.consumed,at=(id,dt)=>Number.isFinite(c[id])&&sim.clock>=c[id]+dt;
  for(const [name,id,dt]of [['east',MILESTONE_EVENTS.train,40],['north',MILESTONE_EVENTS.north,60],['hush',MILESTONE_EVENTS.eastDemolition,4],
    ['surge',MILESTONE_EVENTS.eastDemolition,30],['late',MILESTONE_EVENTS.westDemolition,5]])if(!shots[name]&&at(id,dt))shots[name]=sim.snapshot();
}});
const consumed=run.sim.consumed,m=distantMilestones(consumed);
const restored=s=>{const sim=new M01Simulation();sim.restoreSnapshot(s);return sim;};
const camera=(x=0,y=8,z=30,look=[1,0,0])=>{const c=new THREE.PerspectiveCamera(70,16/9,.05,7500);c.position.set(x,y,z);c.lookAt(x+look[0],y+look[1],z+look[2]);c.updateMatrixWorld();return c;};
const ALL=(t0,t1,dt=.5)=>{const out=[];for(let t=t0;t<t1;t+=dt)out.push(t);return out;};

test('the route consumed every milestone the layer reads, in mission order',()=>{
  for(const id of Object.values(MILESTONE_EVENTS))assert.ok(Number.isFinite(consumed[id]),id);
  assert.ok(m.planes<m.train&&m.train<m.panzerzug&&m.panzerzug<=m.bombing530&&m.bombing530<m.north&&m.north<m.withdraw&&m.withdraw<m.eastDemolition&&m.eastDemolition<m.westDemolition);
  for(const name of ['east','north','hush','surge','late'])assert.ok(shots[name],name);
});

test('three layers stay separate: presentation needs a consumed trigger, ambient is marked, nothing invents authority',()=>{
  const triggers=new Set(Object.values(MILESTONE_EVENTS));
  for(const t of ALL(0,run.sim.clock+120,1.5)){
    const plan=planDistantBattlefield(t,consumed);
    for(const item of [...plan.events,...plan.squads,...plan.vehicles,...plan.columns,...plan.aircraft]){
      assert.ok(['presentation','ambient'].includes(item.layer),item.id);
      if(item.layer==='presentation'){assert.ok(triggers.has(item.source),`${item.id} ${item.source}`);assert.ok(t>=consumed[item.source],`${item.id} before its trigger`);}
      else assert.ok(item.source.startsWith('ambient:'),item.id);
      // Plain description only: no simulation handles, ids of real actors, damage or objective fields.
      for(const key of ['damage','health','alive','objective','actor','visible','hit'])assert.ok(!(key in item),`${item.id}.${key}`);
    }
  }
  // Before the train arrives the river is quiet; before north contact the north is silent (tense, unseen).
  for(const t of ALL(0,m.train,2))assert.equal(planDistantBattlefield(t,consumed).events.length,0);
  for(const t of ALL(0,m.north,1))assert.ok(activeEvents(t,m).every(e=>e.sector==='east_dike'));
  for(const t of ALL(m.north+90,m.north+200,1))if(activeEvents(t,m).some(e=>e.sector!=='east_dike'))return;
  assert.fail('north front never opened after its authoritative event');
});

test('pure and deterministic: same clock and milestones give the same plan; restore and cloned saves agree',()=>{
  for(const t of [m.train+12.3,m.north+44.1,m.eastDemolition+31.7,m.westDemolition+9.2]){
    const a=planDistantBattlefield(t,consumed),b=planDistantBattlefield(t,structuredClone(consumed));assert.deepEqual(a,b);
    assert.deepEqual(planDistantBattlefield(t,restored(run.sim.snapshot()).consumed),a);
  }
  const before=JSON.stringify(consumed);planDistantBattlefield(m.north+60,consumed);assert.equal(JSON.stringify(consumed),before);
});

test('battlefield rhythm: Poisson-like arrivals, lulls and flare-ups, no periodicity, no cloned events',()=>{
  const all={...m};for(const k of Object.keys(all))all[k]=0;all.eastDemolition=all.westDemolition=all.kozliny=Infinity;
  for(const name of ['east_dike','north_line']){
    const starts=[];for(let b=0;b<(1800/BUCKET);b++){const e=bucketEvent(name,b,{...all,eastDemolition:undefined,westDemolition:undefined,kozliny:undefined});if(e)starts.push(e.start);}
    assert.ok(starts.length>200,`${name}: ${starts.length}`);
    const gaps=starts.slice(1).map((t,i)=>t-starts[i]),mean=gaps.reduce((a,b)=>a+b,0)/gaps.length,sd=Math.sqrt(gaps.reduce((a,g)=>a+(g-mean)**2,0)/gaps.length);
    assert.ok(sd/mean>.75&&sd/mean<2.2,`${name} gap CV ${sd/mean}`);
    // Counts per 2 s: no lag between 6 s and 120 s may correlate like a loop.
    const bins=new Array(900).fill(0);for(const t of starts)bins[Math.floor(t/2)]++;
    const avg=bins.reduce((a,b)=>a+b,0)/bins.length,v=bins.reduce((a,b)=>a+(b-avg)**2,0);
    for(let lag=3;lag<=60;lag++){let c=0;for(let i=0;i+lag<bins.length;i++)c+=(bins[i]-avg)*(bins[i+lag]-avg);assert.ok(c/v<.45,`${name} lag ${lag*2}s r=${c/v}`);}
    // Lulls and flare-ups exist: the busiest minute has at least three times the quietest one.
    const minutes=new Array(30).fill(0);for(const t of starts)minutes[Math.floor(t/60)]++;assert.ok(Math.max(...minutes)>=3*Math.max(1,Math.min(...minutes)),`${minutes}`);
  }
  const signatures=new Set();
  for(let b=0;b<4000;b++)for(const name of Object.keys(DISTANT_SECTORS)){const e=bucketEvent(name,b,{...all,eastDemolition:undefined,westDemolition:undefined,kozliny:undefined});
    if(!e)continue;const sig=JSON.stringify([e.kind,e.origin,e.target,e.shots?.length]);assert.ok(!signatures.has(sig),'cloned event');signatures.add(sig);}
});

test('no artificially synchronised explosions: heavy impacts in a sector keep ≥0,3 s; sectors keep independent phases',()=>{
  const all={north:0,kozliny:0,train:0,panzerzug:0,bombing530:0,withdraw:0,spans:0};
  const impacts={north_line:[],north_guns:[]};
  for(let b=0;b<(3600/BUCKET);b++)for(const name of Object.keys(impacts)){const e=bucketEvent(name,b,all);if(e?.impact)impacts[name].push(e.impact.at);}
  for(const [name,times]of Object.entries(impacts)){times.sort((a,b)=>a-b);assert.ok(times.length>20,name);
    for(let i=1;i<times.length;i++)if(name==='north_line')assert.ok(times[i]-times[i-1]>=.3-1e-9,`${name} ${times[i-1]} ${times[i]}`);}
  const cross=impacts.north_line.filter(t=>impacts.north_guns.some(u=>Math.abs(u-t)<.1)).length;
  assert.ok(cross/impacts.north_line.length<.03,`coincident cross-sector impacts ${cross}`);
  const env=n=>ALL(0,600,1).map(t=>sectorEnvelope(n,t));const a=env('east_dike'),b=env('north_line');
  const corr=(x,y)=>{const mx=x.reduce((s,v)=>s+v,0)/x.length,my=y.reduce((s,v)=>s+v,0)/y.length;let c=0,vx=0,vy=0;
    for(let i=0;i<x.length;i++){c+=(x[i]-mx)*(y[i]-my);vx+=(x[i]-mx)**2;vy+=(y[i]-my)**2;}return c/Math.sqrt(vx*vy);};
  assert.ok(Math.abs(corr(a,b))<.4,`sector envelopes move together ${corr(a,b)}`);
});

test('world-anchored and away from the player: fire ≥380 m, figures ≥1250 m, aircraft ≥2 km from the play area',()=>{
  for(const t of ALL(m.train,run.sim.clock+200,.75)){
    const plan=planDistantBattlefield(t,consumed);
    for(const e of plan.events)for(const p of [e.origin,e.target,e.reply?.origin,e.impact?.point].filter(Boolean))
      assert.ok(distanceFromMovementArea(p)>=SAFE_DISTANCE.fire,`${e.id} ${JSON.stringify(p)}`);
    for(const s of plan.squads)for(const f of squadFigures(s,t))assert.ok(distanceFromMovementArea(f)>=SAFE_DISTANCE.figure,`${f.id}`);
    for(const v of plan.vehicles)assert.ok(distanceFromMovementArea(v)>=SAFE_DISTANCE.figure,v.id);
    for(const a of plan.aircraft)assert.ok(distanceFromMovementArea(a)>=SAFE_DISTANCE.aircraft,a.id);
  }
  // Several directions are alive at once (not one show in front of the player).
  const plan=planDistantBattlefield(m.north+180,consumed),dirs=new Set(plan.events.map(e=>Math.sign((e.origin??e.target).x)));
  assert.ok(dirs.size>=1&&plan.events.length>0);
  const mixed=ALL(m.north+60,m.north+300,2).some(t=>{const sectors=new Set(activeEvents(t,m).map(e=>e.sector));return sectors.has('east_dike')&&sectors.has('north_line');});
  assert.ok(mixed,'east and north fronts are active together');
});

test('authoritative phases shape the rhythm: the 06:10 hush, the surge, then sporadic fire; squads turn back',()=>{
  const level=t=>sectorLevel('east_dike',t,m);
  assert.ok(level(m.eastDemolition+4)<.25*level(m.eastDemolition-2),'stunned hush after the blast');
  assert.ok(level(m.eastDemolition+12)>level(m.eastDemolition+4),'surge of fire');
  assert.ok(level(m.eastDemolition+240)<.45*level(m.eastDemolition-2),'sporadic afterwards');
  const before=activeSquads(m.eastDemolition-5,m),after=activeSquads(m.eastDemolition+120,m);
  assert.ok(before.length&&before.every(s=>s.to.x<s.from.x),'reinforcements walk west');
  assert.ok(after.some(s=>s.to.x>s.from.x),'groups pull back east after the demolition');
  assert.equal(kozlinyVehicles(m.kozliny-1,m).length,0);
  const late={...m,kozliny:m.kozliny};const v=kozlinyVehicles(m.kozliny+120,late);assert.equal(v.length,3);assert.ok(v.some(x=>!x.moving&&Number.isFinite(x.hitAt)));
  assert.ok(fireColumns(m.kozliny+120,late).some(c=>c.black),'the hit vehicle burns');
  assert.equal(distantAircraft(m.planes+10,m).length,0);
});

test('squad figures bound (rush and drop) instead of gliding, and stay on their path',()=>{
  const squad=activeSquads(m.eastDemolition-5,m)[0],samples=ALL(squad.start,squad.start+40,.25).map(t=>squadFigures(squad,t)[0]);
  const speeds=samples.slice(1).map((f,i)=>Math.hypot(f.x-samples[i].x,f.z-samples[i].z)/.25);
  assert.ok(speeds.some(v=>v<.05)&&speeds.some(v=>v>1),`${Math.min(...speeds)} ${Math.max(...speeds)}`);
  assert.ok(samples.some(f=>f.pose==='crouched')&&samples.some(f=>f.pose==='upright'));
});

// ——— Renderer: read-only, bounded, quality/camera independent schedule, frozen when paused ———
function render(sim,{cam=camera(),quality='low',r=new M01DistantBattlefield(new THREE.Scene())}={}){return {r,stats:r.update(sim,cam,quality,{daylight:.3,viewportHeight:720})};}

test('renderer never mutates the simulation and only reads ground height from its world',()=>{
  const sim=restored(shots.north),before=JSON.stringify(sim.snapshot()),calls=[];
  sim.world=new Proxy(sim.world,{get(target,key){const v=Reflect.get(target,key);if(typeof v==='function')return (...a)=>{calls.push(String(key));return v.apply(target,a);};return v;}});
  const {r,stats}=render(sim);
  try{assert.equal(JSON.stringify(sim.snapshot()),before);assert.ok(calls.every(k=>k==='heightAt'),calls.join());assert.ok(stats.events>0||stats.squads>0);}finally{r.dispose();}
});

test('camera, player and quality never change which events exist; out-of-view actions keep running',()=>{
  const sim=restored(shots.north);
  const north=render(sim,{cam:camera(0,8,30,[-.4,0,-1])}),south=render(sim,{cam:camera(-200,4,90,[0,0,1]),quality:'high'});
  try{
    assert.deepEqual(south.stats.ids,north.stats.ids);assert.deepEqual(south.stats.kinds,north.stats.kinds);assert.deepEqual(south.stats.layers,north.stats.layers);
    assert.ok(south.stats.outOfView>0,'actions behind the player still happen');assert.notDeepEqual([south.stats.inView,south.stats.outOfView],[north.stats.inView,north.stats.outOfView]);
    assert.ok(north.stats.instances.puffs<=DISTANT_LIMITS.puffs&&south.stats.instances.puffs<=DISTANT_LIMITS.puffs);
  }finally{north.r.dispose();south.r.dispose();}
});

test('bounded pools, distance bands and both layers present in the late battle',()=>{
  for(const name of ['east','north','hush','surge','late']){
    const {r,stats}=render(restored(shots[name]),{quality:'high'});
    try{
      for(const [k,v]of Object.entries(stats.instances))assert.ok(v<=DISTANT_LIMITS[k],`${name} ${k} ${v}`);
      assert.ok(stats.events<=DISTANT_LIMITS.events);
      if(name!=='east')assert.ok(stats.layers.presentation>0,`${name} presentation`);
      assert.ok(stats.layers.ambient>0,`${name} ambient`);
      assert.ok(stats.bands.mid+stats.bands.far+stats.bands.horizon>0);
    }finally{r.dispose();}
  }
});

test('pause and restore: the same clock renders the same frame; a restored simulation renders the same plan',()=>{
  const sim=restored(shots.surge),{r,stats}=render(sim);
  try{
    for(let i=0;i<3;i++)assert.deepEqual(r.update(sim,camera(),'low',{daylight:.3,viewportHeight:720}),stats);
    const copy=restored(sim.snapshot()),other=render(copy);assert.deepEqual(other.stats,stats);other.r.dispose();
  }finally{r.dispose();}
});
