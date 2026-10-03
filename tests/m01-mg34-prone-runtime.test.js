import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {M01Simulation,validateM01Snapshot} from '../src/game/m01-simulation.js';

const GUNNER='de_east_0',TARGET={x:100,y:0,z:22};
function live(){
  const s=new M01Simulation();s.scene=null;
  const a=s.actor(GUNNER);a.active=true;a.cooldown=99;s.updateMG34Posture(a);
  return s;
}
function at(s,time){
  const dt=time-s.clock;s.clock=time;s.updateActors(dt);
  s.emitMG34Rounds(s.actor(GUNNER));
}
function ready(){const s=live();at(s,1.9);assert.equal(s.actor(GUNNER).mg34Prone.phase,'idle');return s;}
function firing(rounds=7){const s=ready();assert.equal(s.burst(s.actor(GUNNER),TARGET,'area',{rounds,bias:[1.2,.8],cone:[.7,.5],tracer:true}),true);return s;}
function restored(s){const r=new M01Simulation();assert.equal(r.restoreSnapshot(s.snapshot()),true);return r;}
const phase=s=>s.actor(GUNNER).mg34Prone?.phase;
const events=s=>s.drainEvents().filter(e=>e.type==='enemy-fire');

// This checkpoint covers simulation ownership. Socket/facing numerics are added with the spatial checkpoint.
test('existing MG34 gunners enter for exactly 1.9 seconds; other actors have no new posture',()=>{
  const s=live(),a=s.actor(GUNNER),rng=s.rng.state;
  assert.deepEqual(a.mg34Prone,{phase:'enter',startedAt:0,duration:1.9,progress:0});
  at(s,.95);assert.equal(a.mg34Prone.progress,.5);
  assert.equal(s.burst(a,TARGET,'area',{rounds:7}),false);
  assert.equal(s.enemyFire.nextId,0);assert.equal(s.rng.state,rng);
  at(s,1.9);assert.equal(phase(s),'idle');assert.equal(a.mg34Prone.progress,1);
  assert.ok(s.actors.filter(x=>!['de_east_0','de_east_1'].includes(x.id)).every(x=>!Object.hasOwn(x,'mg34Prone')));
  const b=s.actor('de_east_1');b.active=true;s.updateMG34Posture(b);assert.equal(b.mg34Prone.phase,'enter');
  at(s,3.8);assert.equal(b.mg34Prone.phase,'idle');
});

test('save and atomic restore preserve enter, idle, aim and exit and consume no RNG',()=>{
  const s=live();at(s,.8);
  for(const setup of [()=>{},()=>at(s,1.9),()=>{s.burst(s.actor(GUNNER),TARGET,'area',{rounds:4});at(s,2.21);},
    ()=>{s.actor(GUNNER).state='RETREAT';s.updateMG34Posture(s.actor(GUNNER));at(s,2.8);}]){
    setup();const save=s.snapshot(),raw=structuredClone(save),r=new M01Simulation();
    validateM01Snapshot(save);r.restoreSnapshot(save);
    assert.deepEqual(save,raw);assert.deepEqual(r.snapshot(),save);assert.equal(r.rng.state,s.rng.state);
  }
  assert.equal(phase(s),'exit');assert.equal(s.burst(s.actor(GUNNER),TARGET,'area',{rounds:7}),false);
  at(s,4.11);assert.equal(phase(s),'standing');
});

for(const emitted of [1,4,6])test(`save after shot ${emitted}: resume without duplicate/lost rounds, events, frames or RNG`,()=>{
  const s=firing(),a=s.actor(GUNNER),start=a.firedAt,planned=structuredClone(a.mg34Prone.burst.plan),rng=s.rng.state;
  const before=(emitted-1)*.075+.001;at(s,start+before);
  assert.equal(a.mg34Prone.burst.emitted,emitted);assert.equal(s.enemyFire.rounds.length,emitted);
  assert.equal(events(s).length,emitted);assert.equal(a.firedAt,start);
  const r=restored(s),copy=structuredClone(r.snapshot());
  assert.deepEqual(copy,s.snapshot());assert.deepEqual(events(r),[],'restoring cannot replay muzzle/audio events');
  for(let k=emitted;k<7;k++){
    const time=start+k*.075+.001;at(s,time);at(r,time);
    assert.deepEqual(r.snapshot(),s.snapshot());assert.deepEqual(events(r),events(s));
  }
  assert.deepEqual(s.enemyFire.rounds,planned);assert.equal(new Set(s.enemyFire.rounds.map(x=>x.id)).size,7);
  assert.equal(a.firedAt,start);assert.equal(s.rng.state,rng);assert.equal(r.rng.state,rng);
  at(s,start+.525);at(r,start+.525);assert.equal(phase(s),'aim');assert.deepEqual(r.snapshot(),s.snapshot());
});

test('4, 5, 6 and 7 shots preserve the requested count and real .075 cadence',()=>{
  for(const count of [4,5,6,7]){
    const s=firing(count),a=s.actor(GUNNER),start=s.clock,rng=s.rng.state;
    assert.equal(a.mg34Prone.burst.rounds,count);assert.equal(s.enemyFire.rounds.length,1);
    for(let k=1;k<count;k++){at(s,start+k*.075+.001);assert.equal(s.enemyFire.rounds.length,k+1);}
    at(s,start+count*.075+.001);assert.equal(phase(s),'aim');
    assert.deepEqual(s.enemyFire.rounds.map(x=>x.firedAt),Array.from({length:count},(_,k)=>start+k*.075));
    assert.equal(events(s).length,count);assert.equal(s.rng.state,rng);
  }
});

test('pause leaves posture, progress, shot, pending burst, RNG and complete snapshot exactly stable',()=>{
  for(const s of [live(),ready(),firing()]){
    const before=s.snapshot();s.tick(0);s.tick(Number.NaN);
    assert.deepEqual(s.snapshot(),before);const r=restored(s);r.tick(0);assert.deepEqual(r.snapshot(),before);
  }
});

for(const state of ['ADVANCE','RETREAT'])test(`${state} exits prone, blocks firing, then remains standing`,()=>{
  const s=firing(),a=s.actor(GUNNER),rounds=s.enemyFire.rounds.length;
  a.state=state;s.updateMG34Posture(a);assert.equal(phase(s),'exit');assert.equal(a.shot,0);
  assert.equal(a.mg34Prone.fromProgress,1);assert.ok(!a.mg34Prone.burst);
  assert.equal(s.burst(a,TARGET,'area',{rounds:7}),false);at(s,3.81);assert.equal(phase(s),'standing');
  assert.equal(s.enemyFire.rounds.length,rounds);assert.equal(events(s).length,1);
});

test('movement waits for exit; interrupted entry reverses its saved fractional progress',()=>{
  const s=live(),a=s.actor(GUNNER);at(s,.95);const before={x:a.x,z:a.z};
  a.target={x:a.x+10,z:a.z};s.updateMG34Posture(a);
  assert.equal(phase(s),'exit');assert.equal(a.mg34Prone.fromProgress,.5);
  at(s,1.8);assert.deepEqual({x:a.x,z:a.z},before);assert.equal(a.mg34Prone.progress,(1.8-.95)/1.9);
  at(s,2.9);assert.equal(phase(s),'standing');assert.ok(a.x>before.x);assert.equal(a.state,'ADVANCE');
});

test('suppression keeps the gunner low and cancels pending shots without cancelling those in flight',()=>{
  const s=firing(),a=s.actor(GUNNER);at(s,2.13);assert.equal(s.enemyFire.rounds.length,4);
  const flight=structuredClone(s.enemyFire.rounds),rng=s.rng.state;
  a.suppressedUntil=7;s.updateMG34Posture(a);
  assert.equal(phase(s),'idle');assert.equal(a.mg34Prone.progress,1);assert.equal(a.shot,0);assert.ok(!a.mg34Prone.burst);
  at(s,3);assert.deepEqual(s.enemyFire.rounds,flight);assert.equal(s.rng.state,rng);
  assert.equal(s.burst(a,TARGET,'area',{rounds:7}),false);assert.equal(events(s).length,4);
  assert.deepEqual(restored(s).snapshot(),s.snapshot());
});

for(const dyingPhase of ['enter','idle','fire_burst','exit'])test(`death during ${dyingPhase} immediately clears posture and future shots`,()=>{
  const s=dyingPhase==='enter'?live():dyingPhase==='idle'?ready():firing(),a=s.actor(GUNNER);
  if(dyingPhase==='exit'){a.state='RETREAT';s.updateMG34Posture(a);}
  assert.equal(phase(s),dyingPhase);const issued=s.enemyFire.rounds.length;
  a.alive=false;a.health=0;a.state='DOWN';s.updateMG34Posture(a);
  assert.equal(a.mg34Prone,undefined);assert.equal(a.shot,0);at(s,s.clock+2);
  assert.equal(s.enemyFire.rounds.length,issued);assert.ok(events(s).length<=1);
  assert.deepEqual(restored(s).snapshot(),s.snapshot());
});

test('inactivity discards pending combat and never creates a loader association',()=>{
  const s=firing(),a=s.actor(GUNNER);a.active=false;s.updateMG34Posture(a);
  assert.equal(a.mg34Prone,undefined);assert.equal(a.shot,0);
  assert.ok(s.actors.every(x=>!Object.hasOwn(x,'mg34Loader')&&!Object.hasOwn(x,'loaderFor')));
  assert.equal(s.actors.length,89);assert.equal(s.snapshot().schema,2);
});

test('legacy missing prone data resumes safely with no marker; 86 roster/CKM migration stays unchanged',()=>{
  const source=firing(),save=source.snapshot(),gun=save.actors.find(a=>a.id===GUNNER),plan=gun.mg34Prone.burst.plan;
  save.enemyFire.rounds=structuredClone(plan);delete gun.mg34Prone;const rng=save.rng,raw=structuredClone(save);
  const s=new M01Simulation();s.restoreSnapshot(save);
  assert.deepEqual(save,raw);assert.equal(s.rng.state,rng);assert.equal(s.actor(GUNNER).mg34Prone,undefined);
  assert.equal(s.actor(GUNNER).shot,0);assert.equal(s.enemyFire.rounds.length,1);
  s.updateMG34Posture(s.actor(GUNNER));assert.equal(phase(s),'enter');
  const oldest=new M01Simulation().snapshot();oldest.actors=oldest.actors.filter(a=>!a.ckm);
  const r=new M01Simulation();r.restoreSnapshot(oldest);
  assert.equal(r.actors.length,89);assert.deepEqual(r.actors.filter(a=>!a.ckm),oldest.actors);assert.equal(r.rng.state,oldest.rng);
});

test('invalid partial/impossible prone fields reject atomically without changing source or target',()=>{
  const valid=firing().snapshot(),alterations=[
    s=>delete s.actors.find(a=>a.id===GUNNER).mg34Prone.progress,
    s=>s.actors.find(a=>a.id===GUNNER).mg34Prone.startedAt=s.clock+1,
    s=>s.actors.find(a=>a.id===GUNNER).mg34Prone.progress=.5,
    s=>s.actors.find(a=>a.id===GUNNER).mg34Prone.duration=1.6,
    s=>s.actors.find(a=>a.id===GUNNER).state='ADVANCE',
    s=>s.actors.find(a=>a.id===GUNNER).alive=false,
    s=>s.actors.find(a=>a.id===GUNNER).mg34Prone.burst.emitted=4,
    s=>s.actors.find(a=>a.id===GUNNER).mg34Prone.burst.plan.pop(),
    s=>s.actors.find(a=>a.id===GUNNER).mg34Prone.burst.plan[1].firedAt+=.01,
    s=>s.actors.find(a=>a.id===GUNNER).mg34Prone.burst.plan[1].id=s.actors.find(a=>a.id===GUNNER).mg34Prone.burst.plan[0].id,
    s=>s.actors.find(a=>a.id===GUNNER).mg34Prone.fromProgress=.3,
    s=>s.actors.find(a=>a.id==='de_east_2').mg34Prone={phase:'idle',startedAt:0,duration:1.9,progress:1},
    s=>s.actors.find(a=>a.id===GUNNER).mg34Prone.phase='reload',
  ];
  for(const alter of alterations){
    const target=new M01Simulation(),before=target.snapshot(),bad=structuredClone(valid);alter(bad);const raw=structuredClone(bad);
    assert.throws(()=>target.restoreSnapshot(bad),/MG34/);assert.deepEqual(target.snapshot(),before);assert.deepEqual(bad,raw);
  }
});

test('movement and S3 station evacuation bodies remain byte-for-byte identical to the fixed base',()=>{
  const current=readFileSync(new URL('../src/game/m01-simulation.js',import.meta.url),'utf8');
  const base=execFileSync('git',['show','2cfa9520a09c68629e3d98d6e7f4dc0d8f9e6732:src/game/m01-simulation.js'],{encoding:'utf8'});
  for(const [start,end] of [['  moveActor(','  updateActors('],['  evacuateStation(','  evacuate(']]){
    const old=base.slice(base.indexOf(start),base.indexOf(end,base.indexOf(start)));
    const now=current.slice(current.indexOf(start),current.indexOf(end,current.indexOf(start)));
    // New posture methods precede updateActors, leaving moveActor itself intact.
    const body=now.slice(0,old.length);assert.equal(body,old);
  }
});
