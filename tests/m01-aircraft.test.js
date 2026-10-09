import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  M01_BOMBING_BATTLE_SECONDS,M01_STUKA_COUNT,M01_STUKA_DEPARTURE_SECONDS,M01_STUKA_OFFSETS,M01_STUKA_PATH_AT_BOMBING,M01_STUKA_PATH_END,
  M01_STUKA_PATH_START,M01_RAID_PASS,M01_RAID_PASS_SECONDS,m01RaidPlaneActive,m01RaidPlanePosition,m01RaidSince,m01StukaActive,
  m01StukaAnchor,m01StukaPathTime,m01StukaPosition,m01StukaSince,m01StukaVelocity,stukaPathSample,
} from '../src/world/m01-aircraft-path.js';

const read=file=>JSON.parse(readFileSync(new URL(file,import.meta.url)));
const layout=read('../missions/m01-tczew/map-layout.json'),mission=read('../missions/m01-tczew/mission.json');
const seconds=clock=>clock.split(':').reduce((sum,part)=>sum*60+Number(part),0);
const near=(a,b,eps=1e-6)=>Math.abs(a-b)<=eps;

test('the path is anchored to the mission data: event id, bombing time, offsets and the three-plane formation',()=>{
  assert.equal(layout.stukaPath.event,'evt_m01_bombing_0434');
  const bombing=mission.events.find(e=>e.id==='evt_m01_bombing_0434');
  assert.equal(M01_BOMBING_BATTLE_SECONDS,seconds(bombing.trigger.at),'04:34:00 in battle seconds');
  assert.equal(M01_STUKA_COUNT,3);assert.deepEqual([...M01_STUKA_OFFSETS],[0,3.5,7],'3-5 s between aircraft (stukaPath note)');
  assert.equal(M01_STUKA_PATH_START,layout.stukaPath.points[0].t);assert.equal(M01_STUKA_PATH_END,layout.stukaPath.points.at(-1).t);
  // The dive bottom (t=44) of the first aircraft comes right after the first blast instant and before the last one.
  const bottom=layout.stukaPath.points.find(p=>p.pos[1]<200).t;
  assert.ok(M01_STUKA_PATH_AT_BOMBING>=bottom-1&&M01_STUKA_PATH_AT_BOMBING<=bottom+2);
});

test('every aircraft lies exactly on the layout points at the instants where its offset path time hits them',()=>{
  for(let i=0;i<M01_STUKA_COUNT;i++)for(const p of layout.stukaPath.points){
    const since=p.t-M01_STUKA_PATH_AT_BOMBING+M01_STUKA_OFFSETS[i],got=m01StukaPosition(since,i);
    assert.ok(near(got.x,p.pos[0],1e-6)&&near(got.y,p.pos[1],1e-6)&&near(got.z,p.pos[2],1e-6),`plane ${i} at path point t=${p.t}`);
  }
  // Offsets: at the same instant the aircraft are 3.5 and 7 s further back along the same curve.
  for(const since of [-20,-1,0,2.1,5,12]){
    for(let i=0;i<3;i++)assert.equal(m01StukaPathTime(since,i),m01StukaPathTime(since-M01_STUKA_OFFSETS[i],0));
    for(let i=1;i<3;i++){const a=m01StukaPosition(since,i),b=m01StukaPosition(since-M01_STUKA_OFFSETS[i],0);assert.deepEqual(a,b);}
  }
});

test('positions between points are continuous, finite and the velocity matches the finite difference',()=>{
  for(let i=0;i<3;i++){
    let previous=null;
    for(let since=-60;since<=60;since+=.05){
      const p=m01StukaPosition(since,i);assert.ok(Object.values(p).every(Number.isFinite));
      if(previous)assert.ok(Math.hypot(p.x-previous.x,p.y-previous.y,p.z-previous.z)<20,`no jump near ${since.toFixed(2)} s`);
      previous=p;
    }
    for(const since of [-30,-10,-2,0.3,3,10,20]){
      const h=.001,a=m01StukaPosition(since-h,i),b=m01StukaPosition(since+h,i),v=m01StukaVelocity(since,i);
      assert.ok(near(v.x,(b.x-a.x)/(2*h),.05)&&near(v.y,(b.y-a.y)/(2*h),.05)&&near(v.z,(b.z-a.z)/(2*h),.05),`velocity of plane ${i} at ${since}`);
    }
  }
  const dive=m01StukaVelocity(-1.5,0);assert.ok(dive.y<-20,'steep descent into the dive');
  const pull=m01StukaVelocity(1.5,0);assert.ok(pull.y>0,'and the climb out after the bottom');
});

test('after the last point the aircraft leave east and are hidden; later instants never repeat the dive',()=>{
  for(let i=0;i<3;i++){
    const gone=M01_STUKA_PATH_END+M01_STUKA_DEPARTURE_SECONDS-m01StukaPathTime(0,i);
    assert.equal(m01StukaActive(gone-.01,i),true);assert.equal(m01StukaActive(gone+.01,i),false);
    for(const later of [60,90,150]){
      assert.equal(m01StukaActive(later,i),false,`hidden at +${later} s`);
      const p=m01StukaPosition(later,i),first=m01StukaPosition(0,i);
      assert.ok(p.x>2500&&p.y>800,`east of the last point at +${later} s`);
      assert.ok(Math.hypot(p.x-first.x,p.z-first.z)>3000,`+${later} s differs from the bombing position`);
    }
    assert.notDeepEqual(m01StukaPosition(60,i),m01StukaPosition(150,i),'+60 and +150 s are different, coherent points (no wrap)');
    assert.ok(m01StukaPosition(150,i).x>m01StukaPosition(60,i).x,'still flying away east');
  }
  // Before the start of the path the aircraft is further east on the same bearing, not looping back from somewhere else.
  const early=m01StukaPosition(-70,0),start=layout.stukaPath.points[0].pos;
  assert.ok(early.x>start[0]);
});

test('the anchor is the saved bombing instant when known, otherwise derived from the battle clock; pure and restore-safe',()=>{
  const state={consumed:{evt_m01_bombing_0434:812.5},damage:[{id:'station_bomb',started:812.5}],battleClock:M01_BOMBING_BATTLE_SECONDS+30};
  assert.equal(m01StukaAnchor(900,state),812.5);assert.equal(m01StukaSince(900,state),87.5);
  assert.equal(m01StukaAnchor(900,{damage:[{id:'station_bomb',started:812.5}]}),812.5,'renderState has the damage list but no consumed map');
  // Before the bombing: the remaining battle seconds at scale 1.0 (prelude segment) put the anchor in the future.
  const before={battleClock:M01_BOMBING_BATTLE_SECONDS-50,damage:[]};
  assert.equal(m01StukaAnchor(100,before),150);assert.equal(m01StukaSince(100,before),-50);
  assert.equal(m01StukaAnchor(100,undefined),100);assert.equal(m01StukaSince(100,{}),0);
  // Pure function of (clock, state): a structured clone (what a checkpoint restore rebuilds) gives identical aircraft.
  const clone=structuredClone(state);
  for(const clock of [790,812.5,820,845,900])for(let i=0;i<3;i++){
    assert.deepEqual(m01StukaPosition(m01StukaSince(clock,state),i),m01StukaPosition(m01StukaSince(clock,clone),i));
    assert.deepEqual(m01StukaPosition(m01StukaSince(clock,state),i),m01StukaPosition(m01StukaSince(clock,state),i));
  }
  assert.deepEqual(stukaPathSample(10),stukaPathSample(10));
});

test('second raid: one high pass that starts with the raid, crosses once and does not loop',()=>{
  const state={damage:[{id:'raid_0530',started:2000}]};
  assert.equal(m01RaidSince(2000,state),0);assert.equal(m01RaidSince(2010,state),10);assert.equal(m01RaidSince(5,{damage:[]}),0);
  const start=m01RaidPlanePosition(0),mid=m01RaidPlanePosition(M01_RAID_PASS_SECONDS/2),end=m01RaidPlanePosition(M01_RAID_PASS_SECONDS);
  assert.ok(start.y>=1000&&start.y===M01_RAID_PASS.y,'high altitude');
  assert.ok(start.z>mid.z&&mid.z>end.z,'moves one way');assert.equal(start.z,M01_RAID_PASS.fromZ);
  assert.ok(near(end.z,M01_RAID_PASS.toZ,1e-6));
  assert.equal(m01RaidPlaneActive(0),true);assert.equal(m01RaidPlaneActive(M01_RAID_PASS_SECONDS-.01),true);
  assert.equal(m01RaidPlaneActive(M01_RAID_PASS_SECONDS+.01),false,'hidden after the pass; never wraps to the start');
  assert.deepEqual(m01RaidPlanePosition(M01_RAID_PASS_SECONDS+500),end,'clamped at the exit, not repeated');
  // The raid state lasts 05:30 -> 05:34 at 8x: the pass fits inside it (about 30 s of mission clock).
  assert.ok(M01_RAID_PASS_SECONDS<=(seconds('05:34:00')-seconds('05:30:00'))/8);
});

test('no time modulo remains in the render or path sources',()=>{
  for(const file of ['../src/world/m01-aircraft-path.js','../src/render/m01-aircraft.js','../src/render/m01-view.js']){
    assert.doesNotMatch(readFileSync(new URL(file,import.meta.url),'utf8'),/time\s*%/,file);
  }
});
