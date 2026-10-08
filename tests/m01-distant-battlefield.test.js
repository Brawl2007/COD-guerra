import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {DISTANT_SECTORS,DISTANT_LIMITS,MILESTONE_EVENTS,SAFE_DISTANCE,BUCKET,distanceFromMovementArea,distantMilestones,planDistantBattlefield,
  activeEvents,activeEventsUncached,bucketEvent,sectorLevel,sectorEnvelope,squadFigures,activeSquads,distantAircraft,kozlinyVehicles,fireColumns} from '../src/render/m01-distant-battlefield-plan.js';
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
// Every milestone at 0: all sectors at full phase (Koźliny included), for statistics independent of this route.
const OPEN=Object.freeze({planes:0,train:0,panzerzug:0,bombing530:0,north:0,withdraw:0,spans:0,kozliny:0});
const segmentDistance=(a,b,steps=24)=>{let d=Infinity;for(let i=0;i<=steps;i++){const k=i/steps;d=Math.min(d,distanceFromMovementArea({x:a.x+(b.x-a.x)*k,z:a.z+(b.z-a.z)*k}));}return d;};

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
      else{const [,trigger]=item.source.match(/^ambient:[a-z_]+<-(.+)$/)??[];assert.ok(triggers.has(trigger),`${item.id} ${item.source}`);}
      // Plain description only: no simulation handles, ids of real actors, damage or objective fields.
      for(const key of ['damage','health','alive','objective','actor','visible','hit'])assert.ok(!(key in item),`${item.id}.${key}`);
    }
  }
  // Before the train arrives the river is quiet; before north contact the north is silent (tense, unseen).
  for(const t of ALL(0,m.train,2))assert.equal(planDistantBattlefield(t,consumed).events.length,0);
  for(const t of ALL(0,m.north,1))assert.ok(activeEvents(t,m).every(e=>e.sector==='east_dike'));
  assert.ok(ALL(m.north+90,m.north+200,1).some(t=>activeEvents(t,m).some(e=>e.sector!=='east_dike')),'north front opens after its authoritative event');
});

test('pure and deterministic: same clock and milestones give the same plan; restore and cloned saves agree',()=>{
  for(const t of [m.train+12.3,m.north+44.1,m.eastDemolition+31.7,m.westDemolition+9.2]){
    const a=planDistantBattlefield(t,consumed),b=planDistantBattlefield(t,structuredClone(consumed));assert.deepEqual(a,b);
    assert.deepEqual(planDistantBattlefield(t,restored(run.sim.snapshot()).consumed),a);
  }
  const before=JSON.stringify(consumed);planDistantBattlefield(m.north+60,consumed);assert.equal(JSON.stringify(consumed),before);
});

test('the bucket cache changes nothing: cached and recomputed events agree over the route, also after a milestone changes',()=>{
  for(const t of ALL(m.train-30,m.westDemolition+120,1.37))assert.deepEqual(activeEvents(t,m),activeEventsUncached(t,m),`${t}`);
  // A newly consumed milestone is a new signature: never a stale cached event.
  const early={...m};delete early.eastDemolition;delete early.westDemolition;delete early.kozliny;
  for(const t of ALL(m.eastDemolition-5,m.eastDemolition+40,.7)){assert.deepEqual(activeEvents(t,early),activeEventsUncached(t,early));assert.deepEqual(activeEvents(t,m),activeEventsUncached(t,m));}
});

test('battlefield rhythm: Poisson-like arrivals, lulls and flare-ups, no periodicity, no repeated spot or burst',()=>{
  for(const name of ['east_dike','north_line']){
    const events=[];for(let b=0;b<(1800/BUCKET);b++){const e=bucketEvent(name,b,{...OPEN,kozliny:undefined});if(e)events.push(e);}
    const starts=events.map(e=>e.start);assert.ok(starts.length>200,`${name}: ${starts.length}`);
    const gaps=starts.slice(1).map((t,i)=>t-starts[i]),mean=gaps.reduce((a,b)=>a+b,0)/gaps.length,sd=Math.sqrt(gaps.reduce((a,g)=>a+(g-mean)**2,0)/gaps.length);
    assert.ok(sd/mean>.75&&sd/mean<2.2,`${name} gap CV ${sd/mean}`);
    // Counts per 2 s: no lag between 6 s and 120 s may correlate like a loop.
    const bins=new Array(900).fill(0);for(const t of starts)bins[Math.floor(t/2)]++;
    const avg=bins.reduce((a,b)=>a+b,0)/bins.length,v=bins.reduce((a,b)=>a+(b-avg)**2,0);
    for(let lag=3;lag<=60;lag++){let c=0;for(let i=0;i+lag<bins.length;i++)c+=(bins[i]-avg)*(bins[i+lag]-avg);assert.ok(c/v<.45,`${name} lag ${lag*2}s r=${c/v}`);}
    // Lulls and flare-ups exist: the busiest minute has at least three times the quietest one.
    const minutes=new Array(30).fill(0);for(const t of starts)minutes[Math.floor(t/60)]++;assert.ok(Math.max(...minutes)>=3*Math.max(1,Math.min(...minutes)),`${minutes}`);
    // No clone pattern: consecutive events rarely come from the same spot, and bursts vary in length.
    const near=events.slice(1).filter((e,i)=>e.origin&&events[i].origin&&Math.hypot(e.origin.x-events[i].origin.x,e.origin.z-events[i].origin.z)<20).length;
    assert.ok(near/events.length<.05,`${name}: ${near} consecutive events from one spot`);
    assert.ok(new Set(events.filter(e=>e.kind==='mg').map(e=>e.shots.length)).size>=4,`${name}: burst lengths`);
  }
});

test('every event a sector can start ends inside its scan window, so nothing active drops out early',()=>{
  for(const [name,sector]of Object.entries(DISTANT_SECTORS)){let longest=0,events=0;
    for(let b=0;b<20000;b++){const e=bucketEvent(name,b,OPEN);if(!e)continue;events++;longest=Math.max(longest,e.end-b*BUCKET);}
    assert.ok(events>300,`${name}: ${events}`);assert.ok(longest<=sector.scan,`${name}: an event lasts ${longest.toFixed(2)} s beyond the ${sector.scan} s scan`);
    // And the scan finds it: every event alive just before its end is listed by activeEvents.
    for(let b=0;b<4000;b++){const e=bucketEvent(name,b,OPEN);if(!e)continue;const t=e.end-1e-3,active=activeEvents(t,OPEN);
      assert.ok(active.some(x=>x.id===e.id)||active.length===DISTANT_LIMITS.events,`${e.id} missing at ${t}`);}
  }
});

test('no artificially synchronised explosions: heavy impacts in each sector land ≥0,3 s apart; sectors keep independent phases',()=>{
  const impacts={north_line:[],north_guns:[]};
  for(let b=0;b<(3600/BUCKET);b++)for(const name of Object.keys(impacts)){const e=bucketEvent(name,b,OPEN);if(e?.impact)impacts[name].push(e.impact.at);}
  for(const [name,times]of Object.entries(impacts)){times.sort((a,b)=>a-b);assert.ok(times.length>20,`${name}: ${times.length}`);
    // Compared on impact time: a shell fired earlier can land later than the next one.
    for(let i=1;i<times.length;i++)assert.ok(times[i]-times[i-1]>=.3-1e-9,`${name} ${times[i-1].toFixed(3)} ${times[i].toFixed(3)}`);}
  const cross=impacts.north_line.filter(t=>impacts.north_guns.some(u=>Math.abs(u-t)<.1)).length;
  assert.ok(cross/impacts.north_line.length<.03,`coincident cross-sector impacts ${cross}`);
  const env=n=>ALL(0,600,1).map(t=>sectorEnvelope(n,t));const a=env('east_dike'),b=env('north_line');
  const corr=(x,y)=>{const mx=x.reduce((s,v)=>s+v,0)/x.length,my=y.reduce((s,v)=>s+v,0)/y.length;let c=0,vx=0,vy=0;
    for(let i=0;i<x.length;i++){c+=(x[i]-mx)*(y[i]-my);vx+=(x[i]-mx)**2;vy+=(y[i]-my)**2;}return c/Math.sqrt(vx*vy);};
  assert.ok(Math.abs(corr(a,b))<.4,`sector envelopes move together ${corr(a,b)}`);
});

test('world-anchored and away from the player: fire and its paths keep their sector distance, the Lisewo skirmish and figures stay beyond the shot ray, aircraft ≥2 km',()=>{
  // By construction, not only on this route: every sector at full phase over two hours.
  for(let b=0;b<28800;b+=3)for(const [name,sector]of Object.entries(DISTANT_SECTORS)){const e=bucketEvent(name,b,OPEN);if(!e)continue;
    for(const p of [e.origin,e.target,e.reply?.origin,e.impact?.point].filter(Boolean))assert.ok(distanceFromMovementArea(p)>=sector.minDistance,`${e.id} ${JSON.stringify(p)}`);
    if(e.origin&&e.target)assert.ok(segmentDistance(e.origin,e.target)>=sector.minDistance,`${e.id} path`);
    if(e.reply)assert.ok(segmentDistance(e.reply.origin,e.reply.target)>=sector.minDistance,`${e.id} reply path`);}
  assert.ok(DISTANT_SECTORS.east_dike.minDistance>=SAFE_DISTANCE.ray&&SAFE_DISTANCE.ray>1200,'the floodplain skirmish is beyond the 1200 m player ray');
  for(const t of ALL(0,7200,7)){
    for(const a of distantAircraft(t,OPEN))assert.ok(distanceFromMovementArea(a)>=SAFE_DISTANCE.aircraft,`${a.id} ${distanceFromMovementArea(a)}`);
    assert.ok(distantAircraft(t,OPEN).length<=DISTANT_LIMITS.aircraft,'the aircraft pool holds every overlapping element');
  }
  for(const t of ALL(m.train,run.sim.clock+200,.75)){
    const plan=planDistantBattlefield(t,consumed);
    for(const s of plan.squads)for(const f of squadFigures(s,t))assert.ok(distanceFromMovementArea(f)>=SAFE_DISTANCE.figure,`${f.id}`);
    for(const v of plan.vehicles)assert.ok(distanceFromMovementArea(v)>=SAFE_DISTANCE.figure,v.id);
  }
  // Several directions are alive at once (not one show in front of the player): east of the river and north-west.
  const mixed=ALL(m.north+60,m.north+300,2).filter(t=>{const sectors=new Set(activeEvents(t,m).map(e=>e.sector));return sectors.has('east_dike')&&sectors.has('north_line');});
  assert.ok(mixed.length>=20,`east and north fronts are active together (${mixed.length}/120 samples)`);
  for(const t of mixed.slice(0,5)){const xs=activeEvents(t,m).map(e=>(e.origin??e.target).x);assert.ok(Math.min(...xs)<-600&&Math.max(...xs)>900,`${t}: ${xs}`);}
});

test('authoritative phases shape the rhythm: the 06:10 hush, the surge, then sporadic fire; squads turn back; Koźliny',()=>{
  const level=t=>sectorLevel('east_dike',t,m);
  assert.ok(level(m.eastDemolition+4)<.25*level(m.eastDemolition-2),'stunned hush after the blast');
  assert.ok(level(m.eastDemolition+12)>level(m.eastDemolition+4),'surge of fire');
  assert.ok(level(m.eastDemolition+240)<.45*level(m.eastDemolition-2),'sporadic afterwards');
  const before=activeSquads(m.eastDemolition-5,m),after=activeSquads(m.eastDemolition+120,m);
  assert.ok(before.length&&before.every(s=>s.to.x<s.from.x),'reinforcements walk west');
  assert.ok(after.some(s=>s.to.x>s.from.x),'groups pull back east after the demolition');
  assert.equal(kozlinyVehicles(m.kozliny-1,m).length,0);
  const v=kozlinyVehicles(m.kozliny+120,m);assert.equal(v.length,3);const hit=v.find(x=>Number.isFinite(x.hitAt));assert.ok(hit&&!hit.moving);
  // The gun's last shot leaves before the hit by the shell's flight; the three shots are not on a fixed cadence.
  const [a,b,c]=hit.gunShots,flight=hit.hitAt-c;assert.ok(flight>1&&flight<3,`${flight}`);assert.ok(a<b&&b<c&&Math.abs((b-a)-(c-b))>.05);
  assert.ok(fireColumns(m.kozliny+120,m).some(col=>col.black),'the hit vehicle burns');
  assert.ok(fireColumns(m.north+300,m).some(col=>col.id==='north_far')&&m.north+240<m.westDemolition,'the far column rises well before the roll call');
  assert.equal(distantAircraft(m.planes+10,m).length,0);
});

test('squad figures bound (rush and stop) instead of gliding; carriers keep their wounded comrade between them',()=>{
  const squad=activeSquads(m.eastDemolition-5,m)[0],samples=ALL(squad.start,squad.start+40,.25).map(t=>squadFigures(squad,t)[0]);
  const speeds=samples.slice(1).map((f,i)=>Math.hypot(f.x-samples[i].x,f.z-samples[i].z)/.25);
  assert.ok(speeds.some(v=>v<.05)&&speeds.some(v=>v>1),`${Math.min(...speeds)} ${Math.max(...speeds)}`);
  assert.ok(samples.some(f=>f.pose==='crouched')&&samples.some(f=>f.pose==='upright'));
  let carried=null;for(let t=m.eastDemolition+30;t<m.eastDemolition+1200&&!carried;t+=8)carried=activeSquads(t,m).find(s=>s.carried);
  assert.ok(carried,'a squad carries a wounded man after the demolition');
  for(const t of ALL(carried.start,carried.start+60,.5)){const [a,b]=squadFigures(carried,t),wounded=squadFigures(carried,t).find(f=>f.pose==='carried');
    assert.ok(Math.abs(Math.hypot(a.x-b.x,a.z-b.z)-1.2)<1e-6,'carriers stay 1,2 m apart');assert.ok(Math.hypot(wounded.x-(a.x+b.x)/2,wounded.z-(a.z+b.z)/2)<1e-9);}
});

// ——— Renderer: read-only, bounded, quality/camera independent schedule, frozen when paused ———
function render(sim,{cam=camera(),quality='low',r=new M01DistantBattlefield(new THREE.Scene())}={}){return {r,stats:r.update(sim,cam,quality,{daylight:.3,viewportHeight:720})};}

test('renderer never writes to the simulation and only reads ground height from its world',()=>{
  const sim=restored(shots.north),before=JSON.stringify(sim.snapshot()),calls=[],writes=[];
  const watch=(target,label,onCall)=>new Proxy(target,{get(t,key){const v=Reflect.get(t,key);if(typeof v==='function'&&onCall)return (...a)=>{onCall(String(key));return v.apply(t,a);};return v;},
    set(t,key,value){writes.push(`${label}.${String(key)}`);return Reflect.set(t,key,value);},defineProperty(t,key,d){writes.push(`${label}.${String(key)}`);return Reflect.defineProperty(t,key,d);},
    deleteProperty(t,key){writes.push(`${label}.${String(key)}`);return Reflect.deleteProperty(t,key);}});
  const world=watch(sim.world,'world',k=>calls.push(k)),consumedProxy=watch(sim.consumed,'consumed');
  const view=new Proxy(sim,{get(t,key){if(key==='world')return world;if(key==='consumed')return consumedProxy;return Reflect.get(t,key);},
    set(t,key,value){writes.push(`sim.${String(key)}`);return Reflect.set(t,key,value);}});
  const {r,stats}=render(view);
  try{assert.equal(JSON.stringify(sim.snapshot()),before);assert.deepEqual(writes,[]);assert.ok(calls.every(k=>k==='heightAt'),calls.join());assert.ok(stats.events>0||stats.squads>0);}
  finally{r.dispose();}
});

test('gameplay A/B: a route segment ticks to the same simulation state with and without the layer drawing every tick',()=>{
  const a=restored(shots.north),b=restored(shots.north),r=new M01DistantBattlefield(new THREE.Scene()),cam=camera();
  try{for(let i=0;i<400;i++){a.tick(.05,{});b.tick(.05,{});a.drainEvents();b.drainEvents();r.update(a,cam,'high',{daylight:.5,viewportHeight:720});}
    assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()));}finally{r.dispose();}
});

test('camera, player and quality never change which events exist; out-of-view actions keep running',()=>{
  const sim=restored(shots.north);
  const north=render(sim,{cam:camera(0,8,30,[-.4,0,-1])}),south=render(sim,{cam:camera(-200,4,90,[0,0,1]),quality:'high'});
  try{
    assert.deepEqual(south.stats.ids,north.stats.ids);assert.deepEqual(south.stats.kinds,north.stats.kinds);assert.deepEqual(south.stats.layers,north.stats.layers);
    assert.ok(south.stats.outOfView>0,'actions behind the player still happen');assert.notDeepEqual([south.stats.inView,south.stats.outOfView],[north.stats.inView,north.stats.outOfView]);
  }finally{north.r.dispose();south.r.dispose();}
});

test('pools never saturate on the route (nothing is silently dropped), distance bands and both layers in the late battle',()=>{
  for(const name of ['east','north','hush','surge','late']){
    const {r,stats}=render(restored(shots[name]),{quality:'high'});
    try{
      for(const [k,v]of Object.entries(stats.requested))assert.ok(v<=DISTANT_LIMITS[k],`${name} ${k} requested ${v} of ${DISTANT_LIMITS[k]}`);
      assert.deepEqual(stats.instances,stats.requested,name);assert.ok(stats.events<DISTANT_LIMITS.events);
      if(name!=='east')assert.ok(stats.layers.presentation>0,`${name} presentation`);
      assert.ok(stats.layers.ambient>0,`${name} ambient`);
      assert.ok(Object.values(stats.bands).reduce((a,b)=>a+b,0)>0);
    }finally{r.dispose();}
  }
});

test('pause and restore: the same clock renders the same frame; a restored or earlier world starts like a fresh renderer',()=>{
  const sim=restored(shots.surge),{r,stats}=render(sim);
  try{
    for(let i=0;i<3;i++)assert.deepEqual(r.update(sim,camera(),'low',{daylight:.3,viewportHeight:720}),stats);
    const copy=restored(sim.snapshot()),other=render(copy);assert.deepEqual(other.stats,stats);other.r.dispose();
    // A slow-frame history widens the flash window; a checkpoint restore (new world, earlier clock) must not keep it.
    const save=sim.snapshot();for(let i=0;i<4;i++)sim.tick(.05,{});sim.drainEvents();r.update(sim,camera(),'low',{daylight:.3,viewportHeight:720});
    for(let i=0;i<4;i++)sim.tick(.05,{});sim.drainEvents();assert.ok(r.update(sim,camera(),'low',{daylight:.3,viewportHeight:720}).window>.15);
    const back=restored(save),fresh=render(restored(save));assert.deepEqual(r.update(back,camera(),'low',{daylight:.3,viewportHeight:720}),fresh.stats);fresh.r.dispose();
  }finally{r.dispose();}
});
