import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {WEAPON_PROFILES} from '../src/game/m02-combat-ai.js';

function gunScene(weapon='mg34'){
 const sim=new M02BenchSimulation();sim.enterAreaBC06();sim.allies=[];
 const gun=sim.enemies.find(e=>e.weapon==='mg34');sim.enemies=[gun];
 Object.assign(gun,{weapon,x:0,y:0,z:100,facing:Math.PI/2,mag:WEAPON_PROFILES[weapon].magSize,reserve:100,suppressed:0});
 Object.assign(sim.player,{x:0,y:0,z:120,crouched:false,eyeHeight:1.65});sim.drainEvents();
 return {sim,gun};
}

test('ordinary wz29 controls use M01 dispersion; exact rays remain available to the calibration bench',()=>{
 const shots=[];
 for(const aim of [false,true]){
  const sim=new M02BenchSimulation();sim.enemies=[];sim.allies=[];
  sim.tick(.05,{fire:true,aim});shots.push(sim.shotLog.at(-1));
  assert.equal(sim.weapon.mag,4);assert.equal(sim.weapon.state,'BOLT_CYCLE');
 }
 const error=s=>Math.hypot(s.direction.x,s.direction.y);
 assert.ok(error(shots[0])>error(shots[1])*10,'hip fire cannot retain the calibration ray accuracy');
 const sim=new M02BenchSimulation();const shot=sim.firePlayerWeapon(true);
 assert.ok(Math.abs(shot.direction.x)<.0001&&Math.abs(shot.direction.y)<.0001);
});

test('wz29, wz28, MP38 and MG34 spend one round at each causal shot, with distinct burst cadence',()=>{
 for(const weapon of ['wz29','rkm_wz28','mp38','mg34']){
  const {sim,gun}=gunScene(weapon),profile=WEAPON_PROFILES[weapon],initial=gun.mag;
  sim.fireActorBurst(gun,sim.player,{x:0,y:1.25,z:120},'enemy');
  assert.equal(gun.mag,initial-1,'opening frame cannot spend the whole automatic burst');
  const events=sim.drainEvents().filter(e=>e.type==='actor-burst');
  for(let i=0;i<8;i++){sim.tick(.05,{});events.push(...sim.drainEvents().filter(e=>e.type==='actor-burst'));}
  assert.equal(events.length,profile.burstCount);assert.equal(gun.mag,initial-profile.burstCount);
  assert.ok(events.every(e=>e.rounds===1&&e.weapon===weapon));
  assert.equal(new Set(events.map(e=>e.burstId)).size,1);
  for(let i=1;i<events.length;i++){
   assert.ok(events[i].clock>events[i-1].clock,'rounds must not be simultaneous');
   assert.ok(Math.abs(events[i].clock-i*profile.burstGapSec)<=.051);
  }
 }
});

test('a closing solid door blocks the remaining MG rounds after the burst has started',()=>{
 const {sim,gun}=gunScene();Object.assign(gun,{x:-50,z:33});Object.assign(sim.player,{x:-50,z:39});
 sim.world.setDoorState('door_b07_north_service','open');
 sim.fireActorBurst(gun,sim.player,{x:-50,y:1.25,z:39},'enemy');
 assert.ok(sim.player.health<100,'first shot must actually reach the player through the open door');
 const health=sim.player.health;sim.drainEvents();sim.world.setDoorState('door_b07_north_service','closed');
 for(let i=0;i<8;i++)sim.tick(.05,{});
 assert.equal(sim.player.health,health);assert.equal(gun.mag,45);
 assert.ok(sim.drainEvents().filter(e=>e.type==='actor-burst').every(e=>!e.hitAny));
});

test('mid-burst checkpoint continues the exact pending rounds/RNG and rejects corrupted bursts atomically',()=>{
 const {sim,gun}=gunScene();sim.fireActorBurst(gun,sim.player,{x:0,y:1.25,z:120},'enemy');
 sim.tick(.05,{});sim.tick(.05,{});const saved=sim.snapshot();
 assert.ok(saved.enemies[0].burst.remaining>0);sim.drainEvents();
 for(let i=0;i<8;i++)sim.tick(.05,{});
 const expected=sim.snapshot(),events=sim.drainEvents();sim.restoreSnapshot(saved);sim.drainEvents();
 for(let i=0;i<8;i++)sim.tick(.05,{});
 assert.deepEqual(sim.snapshot(),expected);assert.deepEqual(sim.drainEvents(),events);
 const bad=structuredClone(saved);bad.enemies[0].burst.remaining=999999;
 assert.throws(()=>sim.restoreSnapshot(bad),/inválid/);assert.deepEqual(sim.snapshot(),expected);
 const legacy=structuredClone(saved);delete legacy.enemies[0].burst;delete legacy.enemies[0].burstSequence;
 assert.doesNotThrow(()=>sim.restoreSnapshot(legacy));
});

test('inactive B02 cannot emit phantom MG shots or suppression in cells B/C',()=>{
 for(const cell of ['B','C']){
  const {sim}=gunScene();if(cell==='C')sim.enterAreaCC09();sim.allies=[];sim.enemies=[];
  sim.tick(.05,{});const events=sim.drainEvents();
  assert.equal(sim.mgState.seeingPlayer,false);
  assert.equal(events.some(e=>e.type==='mg-burst'),false);
 }
});

test('D1 checkpoints retain their four-round wz28 burst when the current authored burst has three rounds',()=>{
 const {sim,gun}=gunScene('rkm_wz28');
 sim.fireActorBurst(gun,sim.player,{x:0,y:1.25,z:120},'enemy');
 const snapshot=sim.snapshot(),saved=snapshot.enemies[0];
 saved.burst.totalRounds=4;saved.burst.remaining=3;delete saved.burst.interval;
 sim.restoreSnapshot(snapshot);sim.drainEvents();
 for(let i=0;i<8;i++)sim.tick(.05,{});
 assert.equal(sim.enemies[0].shotsFired,4);assert.equal(sim.enemies[0].mag,16);
 assert.equal(sim.drainEvents().filter(e=>e.type==='actor-burst').length,3);
});
