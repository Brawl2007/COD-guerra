import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import * as THREE from 'three';
import layout from '../missions/m01-tczew/map-layout.json' with {type:'json'};
import mission from '../missions/m01-tczew/mission.json' with {type:'json'};
import {M01Simulation,seconds} from '../src/game/m01-simulation.js';
import {M01View} from '../src/render/m01-view.js';
import {ju87Attitude,ju87Fade,m01BombFlights,predictedBlastPoint,JU87_BOMB_RUN,JU87_BOMB_FALL_S} from '../src/render/m01-aircraft.js';
import {
  M01_STUKA_OFFSETS,M01_STUKA_PATH_AT_BOMBING,M01_STUKA_PATH_END,M01_STUKA_DEPARTURE_SECONDS,M01_BOMBING_BATTLE_SECONDS,
  M01_RAID_PASS,M01_RAID_PASS_SECONDS,stukaPathSample,m01StukaAnchor,m01StukaSince,m01StukaPathTime,m01StukaActive,
  m01StukaPosition,m01StukaVelocity,m01RaidPlanePosition,m01RaidPlaneActive,m01RaidSince
} from '../src/world/m01-aircraft-path.js';
import {driver} from './helpers/m01-route.js';

const near=(a,b,eps=1e-6)=>Math.abs(a-b)<=eps;
const same=(p,q,eps=1e-6)=>near(p.x,q.x,eps)&&near(p.y,q.y,eps)&&near(p.z,q.z,eps);
const BOMBING='evt_m01_bombing_0434';

// One run through the real simulation up to well after the bombing; per-tick state is recorded as the renderer would see it.
function recordBombing(){
  const d=driver(),ticks=[];d.step({skip:true});
  d.until(()=>d.sim.renderState.stukas,200);
  const heard=d.sim.consumed.evt_m01_planes_heard;
  while(!d.sim.consumedEvent(BOMBING)||d.sim.clock-d.sim.consumed[BOMBING]<12){
    d.step();const {sim}=d;
    ticks.push({clock:sim.clock,battleClock:sim.battleClock,state:structuredClone(sim.renderState),player:{x:sim.player.x,z:sim.player.z},consumed:sim.consumed[BOMBING]});
    assert.ok(ticks.length<20*400,'the bombing must arrive');
  }
  return {d,ticks,heard};
}
let recorded;const run=()=>recorded??=recordBombing();

test('constants agree with the mission data they mirror',()=>{
  assert.equal(M01_BOMBING_BATTLE_SECONDS,seconds('04:34:00'));
  const bombing=mission.events.find(e=>e.id===BOMBING);assert.equal(seconds(bombing.trigger.at),M01_BOMBING_BATTLE_SECONDS);
  assert.equal(layout.stukaPath.event,BOMBING);
  const delay=id=>mission.events.find(e=>e.id===id).trigger.delaySec;
  assert.equal(JU87_BOMB_RUN[1].delay,delay('evt_m01_forward_post_bombed'));assert.equal(JU87_BOMB_RUN[2].delay,delay('evt_m01_nowicki_lost'));
  assert.equal(JU87_BOMB_RUN[0].delay,0);assert.deepEqual([...M01_STUKA_OFFSETS],[0,3.5,7]);
  assert.equal(M01_STUKA_PATH_END,layout.stukaPath.points.at(-1).t);
  assert.equal(JU87_BOMB_FALL_S,1.5);
});

test('every Ju 87 lies on stukaPath at known instants after the bombing event, offset 0/3.5/7 s',()=>{
  for(const {t,pos} of layout.stukaPath.points)for(let i=0;i<3;i++){
    const since=t-M01_STUKA_PATH_AT_BOMBING+M01_STUKA_OFFSETS[i];
    assert.ok(same(m01StukaPosition(since,i),{x:pos[0],y:pos[1],z:pos[2]},1e-6),`plane ${i} at path t=${t}`);
    assert.ok(same(m01StukaPosition(since,i),stukaPathSample(t),1e-9));
  }
  // The planes trail the leader by exactly their offset.
  for(const since of [-20,-3.3,0,1.7,8,17.25])for(let i=1;i<3;i++)
    assert.ok(same(m01StukaPosition(since,i),m01StukaPosition(since-M01_STUKA_OFFSETS[i],0),1e-9));
  assert.equal(m01StukaPathTime(0,0),M01_STUKA_PATH_AT_BOMBING);
  // Continuous and finite everywhere (no teleports): step below 400 m between samples 0.05 s apart.
  let previous=null;for(let since=-60;since<=60;since+=.05){
    const p=m01StukaPosition(since,0);assert.ok(Number.isFinite(p.x+p.y+p.z));
    if(previous)assert.ok(Math.hypot(p.x-previous.x,p.y-previous.y,p.z-previous.z)<30,`jump at ${since}`);previous=p;
  }
  assert.ok(m01StukaPosition(0,0).y>0&&Math.min(...Array.from({length:1400},(_,k)=>m01StukaPosition(-30+k*.05,0).y))>100,'never grazes the ground');
});

test('the approach comes from the east, then the formation departs east, hides and never repeats',()=>{
  const first=layout.stukaPath.points[0].pos;
  // Before the path starts the plane waits at (and extrapolates beyond) the first point: far east, outside the 7.5 km camera range.
  assert.ok(m01StukaPosition(-M01_STUKA_PATH_AT_BOMBING-10,0).x>=first[0]);
  assert.ok(Math.hypot(...['x','z'].map(a=>m01StukaPosition(-M01_STUKA_PATH_AT_BOMBING,0)[a]))>9000);
  assert.ok(m01StukaActive(-M01_STUKA_PATH_AT_BOMBING,0)&&m01StukaActive(0,0),'present while approaching and diving');
  const gone=M01_STUKA_PATH_END-M01_STUKA_PATH_AT_BOMBING+M01_STUKA_DEPARTURE_SECONDS;   // since at which plane 0 is hidden
  assert.ok(m01StukaActive(gone-.01,0)&&!m01StukaActive(gone+.01,0));
  for(let i=1;i<3;i++)assert.ok(m01StukaActive(gone+M01_STUKA_OFFSETS[i]-.01,i)&&!m01StukaActive(gone+M01_STUKA_OFFSETS[i]+.01,i),'later planes leave later');
  // After the last point they fly east (and slightly away), strictly away from the player area; +60 s/+90 s differ from the earlier pass.
  const out=[0,2,4,6,8].map(k=>m01StukaPosition(M01_STUKA_PATH_END-M01_STUKA_PATH_AT_BOMBING+k,0));
  for(let k=1;k<out.length;k++)assert.ok(out[k].x>out[k-1].x+100,'departing east');
  for(const base of [0,2.1,5,10,20]){
    for(const later of [60,90]){
      const a=m01StukaPosition(base,0),b=m01StukaPosition(base+later,0);
      assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)>1000,`no repetition at +${later} s from ${base}`);
      assert.ok(!m01StukaActive(base+later,2)||base+later<gone+7,'inactive well after the pass');
    }
  }
  assert.ok([60,90,150].every(s=>[0,1,2].every(i=>!m01StukaActive(s,i))),'hidden for good +60 s after the bombing');
  // The fade no longer wraps every 90 s: 1 everywhere without a heard time, only the entry eases in after planes_heard.
  assert.deepEqual([0,1,89.95,90,90.05,180,181.25,270].map(t=>ju87Fade(t)),Array(8).fill(1));
  assert.equal(ju87Fade(100,100),0);assert.equal(ju87Fade(103,100),1);assert.equal(ju87Fade(400,100),1);
});

test('attitude comes from the path tangent: nose down in the dive, heading north then west, east on departure',()=>{
  // Plane 0 at path t=40 is descending towards the embankment (south of it, flying north); the nose is -Z, so yaw ~ 0.
  const dive=ju87Attitude(40-M01_STUKA_PATH_AT_BOMBING,0);
  assert.ok(dive.pitch<-.4,'nose down while diving');assert.ok(Math.abs(dive.yaw)<.4,'heading north');
  const out=ju87Attitude(45-M01_STUKA_PATH_AT_BOMBING,0);assert.ok(out.yaw>1&&out.yaw<2.4&&out.pitch>0,'pulling out towards the west');
  const east=ju87Attitude(M01_STUKA_PATH_END-M01_STUKA_PATH_AT_BOMBING+3,0);assert.ok(east.yaw<-.4&&east.yaw>-1.3,'departing east-north-east');
  for(let since=-40;since<=40;since+=.7)for(let i=0;i<3;i++){
    const a=ju87Attitude(since,i);assert.ok(Math.abs(a.bank)<=.8+1e-9&&Math.abs(a.pitch)<=Math.PI/2&&Number.isFinite(a.yaw));
    const v=m01StukaVelocity(since,i);assert.ok(near(Math.atan2(v.y,Math.hypot(v.x,v.z)),a.pitch,1e-12));
  }
  // The tangent matches the finite difference of the position.
  const e=1e-4,p=m01StukaPosition(1.3,1),q=m01StukaPosition(1.3+e,1),v=m01StukaVelocity(1.3,1);
  assert.ok(near((q.y-p.y)/e,v.y,.2)&&near((q.x-p.x)/e,v.x,.2)&&near((q.z-p.z)/e,v.z,.2));
});

test('second raid: one high pass from the raid start, crossing once, then hidden',()=>{
  assert.equal(M01_RAID_PASS.y,1100);
  const start=m01RaidPlanePosition(0),end=m01RaidPlanePosition(M01_RAID_PASS_SECONDS);
  assert.deepEqual(start,{x:M01_RAID_PASS.x,y:1100,z:M01_RAID_PASS.fromZ});assert.equal(end.z,M01_RAID_PASS.toZ);
  let z=Infinity;for(let s=0;s<=M01_RAID_PASS_SECONDS+400;s+=1){const p=m01RaidPlanePosition(s);assert.ok(p.z<=z,'monotonic: never turns back');z=p.z;assert.equal(p.y,1100);}
  assert.ok(m01RaidPlaneActive(0)&&m01RaidPlaneActive(M01_RAID_PASS_SECONDS)&&!m01RaidPlaneActive(M01_RAID_PASS_SECONDS+.5));
  assert.ok(!m01RaidPlaneActive(M01_RAID_PASS_SECONDS+150),'no second crossing 150 s later (the old loop)');
  assert.ok(m01RaidPlanePosition(M01_RAID_PASS_SECONDS/2).z>-200&&m01RaidPlanePosition(M01_RAID_PASS_SECONDS/2).z<200,'overhead mid-pass');
  assert.equal(m01RaidSince(500,{damage:[{id:'raid_0530',started:480}]}),20);assert.equal(m01RaidSince(500,{damage:[]}),0);
});

test('the anchor is the consumed time of the bombing event: predicted before it, authoritative after; restore reproduces it',()=>{
  const {d,ticks,heard}=run(),sim=d.sim,consumed=sim.consumed[BOMBING];
  assert.equal(typeof consumed,'number');assert.equal(sim.sectors.damage.find(x=>x.id==='station_bomb').started,consumed,'station_bomb is emitted in the same tick');
  const before=ticks.filter(t=>t.clock<consumed),after=ticks.filter(t=>t.clock>=consumed);
  assert.ok(before.length>20&&after.length>20);
  // Continuous: the prediction from the battle clock (scale 1.0 before 04:34) never differs from the consumed time by a tick.
  for(const t of before.filter(t=>t.state.stukas))assert.ok(Math.abs(m01StukaAnchor(t.clock,t.state)-consumed)<=.051,`prediction at ${t.clock}`);
  for(const t of after)assert.equal(m01StukaAnchor(t.clock,t.state),consumed);
  assert.ok(Math.abs(consumed-heard-50)<=.1+(M01_BOMBING_BATTLE_SECONDS-seconds('04:34:00')),'planes are heard ~50 s before the bombing');
  // Pure function of the saved state: a restored simulation gives identical positions and bomb flights.
  const restored=new M01Simulation();assert.equal(restored.restoreSnapshot(structuredClone(sim.snapshot())),true);
  assert.equal(restored.consumed[BOMBING],consumed);
  const world=sim.world;
  for(const dt of [-1.4,-.3,0,3,9]){
    const clock=sim.clock+dt,a=sim.renderState,b=restored.renderState;
    for(let i=0;i<3;i++)assert.deepEqual(m01StukaPosition(m01StukaSince(clock,a),i),m01StukaPosition(m01StukaSince(clock,b),i));
    assert.deepEqual(m01BombFlights({clock,state:a,world,player:sim.player}),m01BombFlights({clock,state:b,world:restored.world,player:restored.player}));
  }
  // Positions only depend on (clock, state): the same call twice, and with the cloned state, is identical.
  const t=after[after.length>>1];assert.deepEqual(m01StukaPosition(m01StukaSince(t.clock,t.state),1),m01StukaPosition(m01StukaSince(t.clock,structuredClone(t.state)),1));
});

test('bombs appear 1.5 s before each aerial blast and land at the authoritative point at its instant',()=>{
  const {d,ticks}=run(),sim=d.sim,world=sim.world;
  assert.equal(JU87_BOMB_RUN.length,3);
  for(const runInfo of JU87_BOMB_RUN){
    const hit=sim.sectors.damage.find(x=>x.id===runInfo.id);assert.ok(hit,runInfo.id+' was emitted');
    const consumed=sim.consumed[BOMBING];
    assert.ok(hit.started>=consumed+runInfo.delay&&hit.started<=consumed+runInfo.delay+.0501,'blast follows the mission delay by at most one tick');
    // Ticks in which this bomb is drawn: exactly the 1.5 s before the blast (to the tick), and none after.
    const seen=ticks.map(t=>({t,f:m01BombFlights({clock:t.clock,state:t.state,world,player:t.player}).find(f=>f.id===runInfo.id)})).filter(x=>x.f);
    assert.ok(seen.length>=Math.floor(JU87_BOMB_FALL_S/.05)-1&&seen.length<=Math.ceil(JU87_BOMB_FALL_S/.05)+2,`${runInfo.id}: ${seen.length} frames`);
    assert.ok(seen[0].t.clock>=hit.started-JU87_BOMB_FALL_S-.051&&seen[0].t.clock<=hit.started-JU87_BOMB_FALL_S+.051,'first frame ~1.5 s before the blast');
    assert.ok(seen.every(x=>x.t.clock<=hit.started+1e-9),'never drawn after landing');
    // Predicted and authoritative flights agree: the tick that emits the blast lands exactly on the damage point.
    const last=seen.at(-1);assert.equal(last.f.plane,runInfo.plane);
    for(const x of seen.filter(x=>x.t.clock<hit.started))assert.ok(Math.hypot(x.f.target.x-hit.x,x.f.target.z-hit.z)<1e-9,'prediction equals the authoritative point');
    // At the exact blast instant (damage in the list) the bomb is at the point, one flight, not predicted.
    const landing=m01BombFlights({clock:hit.started,state:{damage:sim.renderState.damage,battleClock:sim.battleClock},world,player:sim.player}).find(f=>f.id===runInfo.id);
    assert.ok(landing&&!landing.predicted&&landing.s===1);
    assert.ok(same(landing.position,{x:hit.x,y:hit.y,z:hit.z},1e-9),'lands at the authoritative point');
    assert.ok(!m01BombFlights({clock:hit.started+.01,state:sim.renderState,world,player:sim.player}).some(f=>f.id===runInfo.id),'hidden after landing');
    const release=m01BombFlights({clock:hit.started-JU87_BOMB_FALL_S,state:sim.renderState,world,player:sim.player}).find(f=>f.id===runInfo.id);
    const carrier=m01StukaPosition(hit.started-JU87_BOMB_FALL_S-consumed,runInfo.plane);
    assert.ok(release&&release.s===0&&same(release.position,{x:carrier.x,y:carrier.y-1.2,z:carrier.z},1e-9),'released from its carrier');
    assert.ok(!m01BombFlights({clock:hit.started-JU87_BOMB_FALL_S-.01,state:sim.renderState,world,player:sim.player}).some(f=>f.id===runInfo.id),'not before release');
  }
  // Falling, never below the target before landing, finite, at most one bomb per carrier.
  for(const t of ticks){
    const flights=m01BombFlights({clock:t.clock,state:t.state,world,player:t.player});assert.ok(flights.length<=3);
    assert.equal(new Set(flights.map(f=>f.plane)).size,flights.length);
    for(const f of flights){assert.ok(Object.values(f.position).every(Number.isFinite));assert.ok(f.position.y>=f.target.y-1e-6,'above the ground until it lands');assert.ok(f.s>=0&&f.s<=1);}
  }
  // Without bombing data (partial states) there is nothing to draw and nothing throws.
  assert.deepEqual(m01BombFlights({clock:10,state:{damage:[]},world,player:sim.player}),[]);
  assert.deepEqual(m01BombFlights({clock:10,state:undefined,world,player:sim.player}),[]);
  // raid_0530 has no carrier in the scene when it fires: it is not a visible bomb.
  assert.ok(!JU87_BOMB_RUN.some(r=>r.id==='raid_0530'));
});

test('the predicted blast points mirror the simulation (including the forward-post near miss and the 30 m rule)',()=>{
  const world=new M01Simulation().world,far={x:-70,z:22};
  assert.deepEqual(predictedBlastPoint(JU87_BOMB_RUN[0],world,far),world.point('tczew_station'));
  assert.deepEqual(predictedBlastPoint(JU87_BOMB_RUN[1],world,far),world.point('forward_post'));
  assert.deepEqual(predictedBlastPoint(JU87_BOMB_RUN[1],world,{x:20,z:5}).z<0,true,'near miss lands 40 m north in the river');
  const near30=predictedBlastPoint(JU87_BOMB_RUN[2],world,{x:-45,z:12});assert.ok(Math.hypot(near30.x+45,near30.z-12)>=39.99,'never closer than 30 m to the player');
  // Same rule as M01Simulation.impact on a live simulation with the player next to the forward post.
  const sim=new M01Simulation();sim.player.x=20;sim.player.z=5;
  sim.consumed.evt_m01_bombing_0434=sim.clock;const p=predictedBlastPoint(JU87_BOMB_RUN[1],sim.world,sim.player);
  sim.consume('evt_m01_forward_post_bombed');const hit=sim.sectors.damage.find(x=>x.id==='forward_post');
  assert.ok(near(hit.x,p.x)&&near(hit.z,p.z)&&near(hit.y,p.y));
});

test('simulation never imports the presentation path and no time wrap remains in the aircraft presentation',()=>{
  const dir=new URL('../src/game/',import.meta.url);
  for(const file of readdirSync(dir).filter(f=>f.endsWith('.js')))assert.ok(!/m01-aircraft-path/.test(readFileSync(new URL(file,dir),'utf8')),`src/game/${file}`);
  for(const rel of ['../src/render/m01-aircraft.js','../src/render/m01-view.js','../src/world/m01-aircraft-path.js'])
    assert.ok(!/time%/.test(readFileSync(new URL(rel,import.meta.url),'utf8')),rel+' has no time%');
  const pathSource=readFileSync(new URL('../src/world/m01-aircraft-path.js',import.meta.url),'utf8');
  assert.ok(!/from '\.\.\/game|Math\.random|Random/.test(pathSource),'path stays free of simulation imports and RNG');
});

function viewFixture(){
  const view=Object.create(M01View.prototype);
  Object.assign(view,{scene:new THREE.Scene(),owner:{quality:'low'},box:new THREE.BoxGeometry(),sphere:new THREE.SphereGeometry(1,6,4),cylinder:new THREE.CylinderGeometry(1,1,1,6),
    materials:{dark:new THREE.MeshStandardMaterial()},disposed:false});
  view.createAircraft();return view;
}

test('the view draws a bounded bomb pool from the flights and reports path/bomb diagnostics',()=>{
  const {d,ticks}=run(),sim=d.sim,view=viewFixture();
  assert.equal(view.bombs.length,3);assert.ok(view.bombs.every(b=>!b.visible));
  const consumed=sim.consumed[BOMBING],hit=sim.sectors.damage.find(x=>x.id==='station_bomb');
  const tick=ticks.find(t=>t.clock>=hit.started-.7&&t.clock<hit.started-.6);assert.ok(tick,'a tick inside the first flight');
  view.updateAircraft(tick.state,tick.clock,tick.player);view.updateBombs(tick.state,tick.clock,tick.player,sim.world);
  assert.equal(view.bombs.filter(b=>b.visible).length,view.bombState.visible);assert.ok(view.bombs[0].visible&&view.bombState.visible>=1);
  const flight=view.bombState.flights.find(f=>f.id==='station_bomb');assert.deepEqual(view.bombs[0].position.toArray(),flight.position);
  assert.ok(flight.s>0&&flight.s<1&&Math.abs(flight.at-hit.started)<.051);
  const nose=new THREE.Vector3(0,0,-1).applyQuaternion(view.bombs[0].quaternion),v=m01BombFlights({clock:tick.clock,state:tick.state,world:sim.world,player:tick.player}).find(f=>f.id==='station_bomb').velocity;
  const speed=Math.hypot(v.x,v.y,v.z);assert.ok(nose.x*v.x/speed+nose.y*v.y/speed+nose.z*v.z/speed>.999,'nose follows the velocity');
  assert.ok(nose.y<-.2,'falling nose first');
  // Planes: all three on their path, lead plane diving; diagnostics expose the path phase and time.
  const diving=ticks.find(t=>t.clock>=consumed+0&&t.clock<consumed+.05);view.updateAircraft(diving.state,diving.clock,diving.player);
  const since=m01StukaSince(diving.clock,diving.state);
  view.planes.forEach((plane,i)=>{assert.ok(plane.visible);assert.deepEqual(plane.position.toArray(),Object.values(m01StukaPosition(since,i)));
    const att=ju87Attitude(since,i);assert.deepEqual([plane.rotation.x,plane.rotation.y,plane.rotation.z],[att.pitch,att.yaw,att.bank]);});
  assert.equal(view.aircraftPath.phase,'dive');assert.ok(near(view.aircraftPath.since,since,1e-12));
  // After the last bomb has landed the pool is empty again.
  const late=ticks.at(-1);view.updateAircraft(late.state,late.clock,late.player);view.updateBombs(late.state,late.clock,late.player,sim.world);
  assert.ok(view.bombs.every(b=>!b.visible)&&view.bombState.visible===0);
  // Not shown when the formation is not in the scene.
  view.updateBombs({...tick.state,stukas:false},tick.clock,tick.player,sim.world);assert.ok(view.bombs.every(b=>!b.visible));
  // Raid plane: from the raid state, once.
  const raid={stukas:false,secondRaid:true,damage:[{id:'raid_0530',started:100}]};
  view.updateAircraft(raid,100,{x:0,y:0,z:0});assert.ok(view.raidPlane.visible);assert.equal(view.raidPlane.position.y,1100);assert.equal(view.raidPlane.position.z,M01_RAID_PASS.fromZ);
  view.updateAircraft(raid,100+M01_RAID_PASS_SECONDS+10,{x:0,y:0,z:0});assert.ok(!view.raidPlane.visible);
  assert.ok(view.planes.every(p=>!p.visible));
});
