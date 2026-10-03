import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation,seconds,validateM01Snapshot} from '../src/game/m01-simulation.js';
import {driver,route,toStationEvacuation} from './helpers/m01-route.js';

const patient=s=>s.actor('generic_rifleman'),medic=s=>s.actor('leon_dudek');
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
test('the fictional station casualty starts in the yard and the clock triggers his injury only once',()=>{
  const d=driver(),s=d.sim;assert.equal(patient(s).x,-300);assert.equal(patient(s).z,30);assert.equal(patient(s).health,100);
  toStationEvacuation(d);
  assert.ok(s.battleClock>=seconds('04:35:30'));assert.equal(patient(s).state,'WOUNDED');assert.equal(patient(s).health,45);
  assert.ok(s.dialogueConsumed.includes('evt_m01_wounded_dragged:17'),'the medic speaks when reaching the casualty');
  const before=JSON.stringify(s.stationEvacuation);assert.equal(s.consume('evt_m01_wounded_dragged'),false);
  assert.equal(JSON.stringify(s.stationEvacuation),before,'consumption never relocates or reinjures the casualty');
});
test('the backward drag stays on the ground, completes outside the camera and returns Dudek to his post',()=>{
  const d=toStationEvacuation(),s=d.sim,p=patient(s),m=medic(s);
  assert.equal(s.inView(p),false,'the player remains at the bridge, looking east');
  for(let i=0;i<20;i++){
    const x=m.x;d.step();assert.ok(m.x<x);assert.ok(Math.cos(m.facing)>0,'the medic faces the casualty while walking west');
    assert.ok(p.x>m.x);assert.ok(Math.abs(p.y-s.world.heightAt(p.x,p.z))<1e-9);assert.ok(p.y<m.y+.3);
  }
  d.until(()=>s.stationEvacuation.delivered,100);
  assert.equal(p.carriedBy,null);assert.equal(p.state,'WOUNDED');assert.equal(p.x,-334);assert.equal(p.z,26.2);
  d.until(()=>distance(m,s.world.point('aid_position'))<1.2,180);
  assert.equal(m.task,null);assert.equal(s.flags['m01.bak_status'],'unhurt');validateM01Snapshot(s.snapshot());
});
test('changing the player look never changes the station evacuation or its delivery',()=>{
  const a=toStationEvacuation(),b=toStationEvacuation();b.step({lookX:Math.PI/.0022});a.step();
  for(let i=0;i<20*80;i++){a.step();b.step();}
  assert.deepEqual(a.sim.stationEvacuation,b.sim.stationEvacuation);assert.ok(a.sim.stationEvacuation.delivered);
});
test('a save during the drag restores the same actors, task and future positions with no scene objects',()=>{
  const d=toStationEvacuation(),s=d.sim,snapshot=s.snapshot(),copy=new M01Simulation();
  validateM01Snapshot(snapshot);copy.restoreSnapshot(JSON.parse(JSON.stringify(snapshot)));
  for(let i=0;i<20*80;i++){s.tick(.05);copy.tick(.05);}
  assert.deepEqual(copy.stationEvacuation,s.stationEvacuation);assert.equal(copy.stationEvacuation.delivered,true);
  assert.equal(copy.rng.state,s.rng.state);assert.equal(snapshot.schema,2);
  const bad=structuredClone(snapshot);bad.actors.find(a=>a.id==='marek_zielinski').task='station_wounded';
  assert.throws(()=>copy.restoreSnapshot(bad),/evacuação da estação/);assert.deepEqual(copy.stationEvacuation,s.stationEvacuation);
});
test('death or removal of a participant detaches the casualty instead of leaving an invalid or moving carrier reference',()=>{
  for(const victim of ['medic','patient'])for(const removed of [false,true]){
    const d=toStationEvacuation(),s=d.sim,p=patient(s),m=medic(s),a=victim==='medic'?m:p;
    Object.assign(a,removed?{active:false}:{health:0,alive:false,state:'DOWN'});d.step();assert.equal(p.carriedBy,null);
    assert.equal(p.y,s.world.heightAt(p.x,p.z));validateM01Snapshot(s.snapshot());
    const x=p.x;for(let i=0;i<20;i++)d.step();assert.equal(p.x,x,'a dead participant cannot keep dragging the casualty');
  }
});
test('legacy schema 2 saves with an already consumed station event do not replay an injury',()=>{
  const d=toStationEvacuation(),s=d.sim,legacy=s.snapshot();
  for(const a of legacy.actors)if(['generic_rifleman','leon_dudek'].includes(a.id)){delete a.task;delete a.carriedBy;delete a.stationDrag;a.crouched=false;}
  const old=legacy.actors.find(a=>a.id==='generic_rifleman');Object.assign(old,{health:100,state:'GUARD',x:-95,z:24});
  const copy=new M01Simulation();copy.restoreSnapshot(legacy);for(let i=0;i<100;i++)copy.tick(.05);
  assert.equal(patient(copy).health,100);assert.equal(patient(copy).task,undefined);assert.equal(medic(copy).task,undefined);
});
test('station care coexists with Bąk, all objectives, checkpoints and both historical demolitions on supported and ignored routes',()=>{
  for(const support of [false,true]){
    const {sim,checkpoints}=route(19390901,{support});assert.ok(sim.mission.complete);assert.equal(Object.keys(checkpoints).length,4);
    assert.equal(sim.stationEvacuation.delivered,true);assert.equal(patient(sim).state,'WOUNDED');assert.ok(patient(sim).x<-300);
    assert.equal(sim.battleClock,seconds('07:05:00'));assert.ok(sim.consumedEvent('evt_m01_east_demolition'));assert.ok(sim.consumedEvent('evt_m01_west_demolition'));
    assert.ok(sim.flags['m01.bak_status'].startsWith('rescued_by_'));assert.ok(sim.flags['m01.east_platoon_survivors']>=12);
    for(const o of sim.definition.objectives.filter(o=>o.required))assert.equal(sim.objectives[o.id].state,'done');
    validateM01Snapshot(sim.snapshot());
  }
});

test('grab and release last 1.6 mission seconds, hold both roots and deliver only after settling',()=>{
  const d=toStationEvacuation(driver(),{phase:'grab'}),s=d.sim,p=patient(s),m=medic(s);
  for(const phase of ['grab','release']){
    d.until(()=>p.stationDrag?.phase===phase,100);
    const initial=s.stationEvacuation,startedAt=p.stationDrag.startedAt;
    assert.equal(p.stationDrag.duration,1.6);assert.equal(initial.delivered,false);
    for(let i=0;i<31;i++){
      d.step();assert.equal(p.stationDrag.phase,phase);
      for(const a of [p,m])for(const axis of ['x','y','z','facing'])assert.equal(a[axis],initial[a===p?'patient':'medic'][axis]);
      assert.ok(Math.abs(p.x-m.x-Math.cos(m.facing)*.92)<1e-9);
      assert.ok(Math.abs(p.z-m.z-Math.sin(m.facing)*.92)<1e-9);
      assert.equal(s.stationEvacuation.delivered,false);
    }
    const paused=s.snapshot();s.tick(0,{skip:true,fire:true});assert.deepEqual(s.snapshot(),paused);
    d.step();assert.ok(Math.abs(s.clock-startedAt-1.6)<1e-7);
    if(phase==='grab')assert.equal(p.stationDrag.phase,'drag');
    else{
      assert.equal(s.stationEvacuation.delivered,true);assert.equal(p.carriedBy,null);assert.equal(p.stationDrag,undefined);
      assert.ok(distance(p,initial.patient)<.001,'delivery keeps the roots at the reached aid point');
    }
  }
});
test('schema 2 restores every station phase and its future clocks, actors and RNG exactly',()=>{
  for(const phase of ['grab','drag','release']){
    const d=toStationEvacuation(driver(),{phase}),s=d.sim;for(let i=0;i<11;i++)d.step();
    const saved=s.snapshot(),copy=new M01Simulation();copy.restoreSnapshot(saved);assert.deepEqual(copy.snapshot(),saved);
    for(let i=0;i<40;i++){s.tick(.05);copy.tick(.05);assert.deepEqual(copy.stationEvacuation,s.stationEvacuation);}
    assert.equal(copy.rng.state,s.rng.state);validateM01Snapshot(copy.snapshot());
    const data=s.stationEvacuation;if(data.patient.stationDrag)data.patient.stationDrag.startedAt=-99;
    assert.deepEqual(s.snapshot().actors,copy.snapshot().actors,'diagnostics do not expose live phase data');
  }
});
test('all station phases interrupt on casualty/medic death, removal or reassignment without delivery',()=>{
  for(const phase of ['grab','drag','release'])for(const interruption of ['medic_dead','patient_dead','medic_removed','patient_removed','reassigned']){
    const d=toStationEvacuation(driver(),{phase}),s=d.sim,p=patient(s),m=medic(s),a=interruption.startsWith('medic')?m:p;
    const position={x:p.x,z:p.z};
    if(interruption==='reassigned')m.task='evacuate_bak';
    else Object.assign(a,interruption.endsWith('removed')?{active:false}:{alive:false,health:0,state:'DOWN'});
    d.step();assert.equal(p.carriedBy,null);assert.equal(p.stationDrag,undefined);assert.equal(s.stationEvacuation.delivered,false);
    for(let i=0;i<20;i++)d.step();assert.equal(p.x,position.x);assert.equal(p.z,position.z);validateM01Snapshot(s.snapshot());
    if(interruption==='reassigned')assert.equal(m.task,'evacuate_bak','an unrelated simulation task is preserved');
  }
});
test('old schema 2 transit saves resume without a new grab and corrupt station phases are rejected atomically',()=>{
  const d=toStationEvacuation(),s=d.sim,legacy=s.snapshot();delete legacy.actors.find(a=>a.id==='generic_rifleman').stationDrag;
  const copy=new M01Simulation();copy.restoreSnapshot(legacy);assert.deepEqual(copy.snapshot(),legacy);copy.tick(.05);
  assert.equal(patient(copy).stationDrag.phase,'drag');assert.equal(patient(copy).carriedBy,'leon_dudek');
  const before=copy.snapshot();
  for(const corrupt of [
    a=>a.stationDrag.phase='unknown',a=>a.stationDrag.startedAt=before.clock+1,
    a=>a.stationDrag.startedAt=-1,a=>a.stationDrag.duration=.7,a=>a.stationDrag=null,
    a=>a.carriedBy=null,a=>a.stationDrag.localTimer=1
  ]){
    const bad=structuredClone(before);corrupt(bad.actors.find(a=>a.id==='generic_rifleman'));
    assert.throws(()=>copy.restoreSnapshot(bad),/evacuação da estação/);assert.deepEqual(copy.snapshot(),before);
  }
  const bad=structuredClone(before);bad.actors.find(a=>a.id==='leon_dudek').stationDrag={...patient(copy).stationDrag};
  assert.throws(()=>copy.restoreSnapshot(bad),/evacuação da estação/);assert.deepEqual(copy.snapshot(),before);
});
