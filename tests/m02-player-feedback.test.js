import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {M02Presentation,m02DamageIndicator} from '../src/render/m02-presentation.js';
import {AudioManager} from '../src/core/audio.js';
import {FakeAudioContext} from './helpers/fake-audio-context.js';
import {M01CombatFeedback} from '../src/render/m01-combat-feedback.js';

function setup(){
 const sim=new M02BenchSimulation();sim.enterAreaBC06();sim.allies=[];
 const gun=sim.enemies.find(e=>e.weapon==='mg34');sim.enemies=[gun];
 Object.assign(gun,{x:0,y:0,z:100,mag:50,suppressed:0});
 Object.assign(sim.player,{x:0,y:0,z:106,eyeHeight:1.65,health:100});sim.drainEvents();
 const audio=new AudioManager({contextFactory:()=>new FakeAudioContext(),quality:'low'});audio.init();
 const p=Object.create(M02Presentation.prototype);
 Object.assign(p,{audio,feedback:new M01CombatFeedback(),footsteps:{reset(){}},characters:{resetM02Pose(){}},resetClock:sim.clock,playerRecord:sim.player,presentationWorld:sim.world,fireTimes:new Map(),roundEvents:new Map()});
 return {sim,gun,audio,p};
}

test('a real hostile hit identifies the actual victim and plays the M01 critical cue under dense combat',()=>{
 const {sim,gun,audio,p}=setup();
 try{
  for(let i=0;i<12;i++)audio.weaponFire('kar98k',0,20,{key:`enemy-${i}`});
  for(let i=0;i<6;i++)audio.impact('wood',0,15,`impact-${i}`);
  for(let i=0;i<2;i++)audio.crack(0,1,`danger-${i}`);
  assert.equal(audio.voices.size,audio.maxVoices);
  const save=sim.snapshot();sim.fireActorBurst(gun,sim.player,{x:0,y:1.25,z:106},'enemy');
  const events=sim.drainEvents(),round=events.find(e=>e.type==='actor-burst');
  assert.ok(sim.player.health<100);assert.equal(round.traces[0].hitId,sim.player.id);
  const before=sim.snapshot();p.consume(events,sim);assert.deepEqual(sim.snapshot(),before);
  assert.equal(audio.diagnostics.eventCounts['player-hit'],1);
  assert.equal(p.feedback.counts.playerHit,1);assert.ok(p.feedback.sample(sim.clock,'low').overlayAlpha>0);
  assert.deepEqual(p.damageSource,{x:round.origin.x,z:round.origin.z,clock:round.clock});
  assert.equal(p.feedback.sample(sim.clock+2,'low').overlayAlpha,0,'the injury flash decays on mission time');
  assert.ok([...audio.voices].some(v=>v.kind==='player-hit'&&v.priority===100),'critical hit must enter a full voice pool');
  sim.restoreSnapshot(save);sim.drainEvents();sim.fireActorBurst(sim.enemies[0],sim.player,{x:0,y:1.25,z:106},'enemy');
  assert.deepEqual(sim.drainEvents().find(e=>e.type==='actor-burst').traces,round.traces,'restored RNG preserves the same impact and victim');
  p.syncSession(sim);assert.equal(p.feedback.counts.playerHit,0,'same-clock checkpoint restore removes stale impact feedback');assert.equal(p.damageSource,null);
 }finally{audio.dispose();}
});

test('an ally being hit, a wall stopping the round, and a blocked explosion do not sound a player hit',()=>{
 const {sim,audio,p}=setup();
 try{
  const before=sim.snapshot();
  for(const trace of [
   {hitKind:'actor',hitId:'pl_wierzba',point:{x:0,y:1,z:104},origin:{x:0,y:1,z:100}},
   {hitKind:'world',material:'stone',point:{x:0,y:1,z:104},origin:{x:0,y:1,z:100}},
  ])p.consume([{type:'actor-burst',side:'enemy',shooterId:'other',weapon:'kar98k',rounds:1,traces:[trace],origin:trace.origin}],sim);
  p.consume([{type:'grenade-exploded',center:{x:0,y:0,z:103},affectedActors:[{id:sim.player.id,damage:0,blockedByWall:true}]}],sim);
  assert.equal(audio.diagnostics.eventCounts['player-hit']??0,0);assert.equal(p.feedback.counts.playerHit,0);assert.equal(p.damageSource,undefined);assert.deepEqual(sim.snapshot(),before);
 }finally{audio.dispose();}
});

test('damage direction follows the physical source as the player turns and obeys the accessibility setting',()=>{
 const source={x:10,z:0,clock:5},player={x:0,z:0,angle:0};
 assert.equal(m02DamageIndicator(source,player,5).angle,0);
 player.angle=Math.PI/2;assert.equal(m02DamageIndicator(source,player,5.3).angle,-Math.PI/2);
 assert.ok(m02DamageIndicator(source,player,5.3).opacity<1);
 assert.equal(m02DamageIndicator(source,player,5.3,false),null);
 assert.equal(m02DamageIndicator(source,player,6.2),null);
});

test('real grenade damage and damaging landings use the existing M01 body and landing sounds',()=>{
 const {sim,audio,p}=setup();
 try{
  const blast=sim.detonateGrenadeAt(sim.player.x+2,sim.player.y+.5,sim.player.z);
  assert.ok(blast.affectedActors.find(a=>a.id===sim.player.id).damage>0);
  const events=sim.drainEvents(),before=sim.snapshot();p.consume(events,sim);
  assert.equal(audio.diagnostics.eventCounts['player-hit'],1);assert.equal(audio.diagnostics.eventCounts.explosion,1);
  p.consume([{type:'player-landing',speed:9,surface:'earth',damage:8,clock:2}],sim);
  assert.equal(audio.diagnostics.eventCounts['player-landing'],1);assert.deepEqual(sim.snapshot(),before);
 }finally{audio.dispose();}
});

test('a stationary landing applies real fall damage, emits one sound event, and restores deterministically',()=>{
 const {sim,audio,p}=setup();
 try{
  sim.enemies=[];Object.assign(sim.player,{x:0,z:106,y:7,health:100,fall:{vy:0,vx:0,vz:0,startY:7,t:0}});
  const save=sim.snapshot();sim.drainEvents();
  for(let i=0;i<50&&sim.player.fall;i++)sim.tick(.05,{});
  const expected=sim.snapshot(),events=sim.drainEvents(),landing=events.find(e=>e.type==='player-landing');
  assert.ok(landing?.damage>0);assert.equal(sim.player.health,100-landing.damage);
  assert.equal(events.filter(e=>e.type==='player-landing').length,1);
  const before=sim.snapshot();p.consume(events,sim);assert.equal(audio.diagnostics.eventCounts['player-landing'],1);assert.deepEqual(sim.snapshot(),before);
  sim.restoreSnapshot(save);sim.drainEvents();for(let i=0;i<50&&sim.player.fall;i++)sim.tick(.05,{});
  assert.deepEqual(sim.snapshot(),expected);assert.deepEqual(sim.drainEvents(),events);
 }finally{audio.dispose();}
});
