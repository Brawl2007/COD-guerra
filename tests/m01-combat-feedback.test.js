import test from 'node:test';
import assert from 'node:assert/strict';
import {M01CombatFeedback,M01_FEEDBACK_CAPS} from '../src/render/m01-combat-feedback.js';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {aimDirection} from '../src/world/spatial.js';

test('real player-hit presentation is clear, bounded and directional cue stays presentation-only',()=>{
  const f=new M01CombatFeedback();f.playerHit(10);let s=f.diagnostics(10,'medium');
  assert.equal(s.counts.playerHit,1);assert.equal(s.hitImpulse,1);assert.ok(s.overlayAlpha>0);assert.ok(s.shakeStrength>0);
  assert.equal(s.lastHitDirection,null);
  f.directionalHit(10,.8);s=f.diagnostics(10,'medium');
  assert.equal(s.lastHitDirection,.8);assert.ok(s.direction>0);assert.ok(Math.abs(s.cameraX)<=M01_FEEDBACK_CAPS.cameraOffset);
  assert.ok(Math.abs(s.roll)<=M01_FEEDBACK_CAPS.cameraRoll);assert.ok(s.overlayAlpha<=M01_FEEDBACK_CAPS.overlayAlpha);
});

test('near miss and close impact react while distant impact stays quiet',()=>{
  const near=new M01CombatFeedback();near.roundImpact({clock:4,distance:7,crack:true,direction:-.7,weapon:'kar98k',material:'stone'});
  const n=near.diagnostics(4,'medium');assert.equal(n.counts.nearMiss,1);assert.equal(n.counts.nearImpact,1);
  assert.ok(n.nearMissImpulse>0&&n.impactImpulse>0&&n.direction<0);
  const far=new M01CombatFeedback();far.roundImpact({clock:4,distance:130,crack:false,direction:.5,weapon:'kar98k',material:'earth'});
  const d=far.diagnostics(4,'medium');assert.equal(d.counts.nearMiss,0);assert.equal(d.counts.nearImpact,0);
  assert.equal(d.suppressionVisual,0);assert.equal(d.overlayAlpha,0);assert.equal(d.shakeStrength,0);
});

test('multiple real MG34 near rounds accumulate danger but obey every hard cap',()=>{
  const f=new M01CombatFeedback();
  for(let i=0;i<30;i++)f.roundImpact({clock:20+i*.01,distance:4+i%9,crack:i%2===0,direction:i%3===0?-.8:.8,weapon:'mg34',material:i%2?'earth':'metal'});
  const s=f.diagnostics(20.3,'high');
  assert.ok(s.counts.nearMiss>=15);assert.equal(s.counts.nearImpact,30);
  assert.ok(s.suppressionVisual<=M01_FEEDBACK_CAPS.suppressionVisual);
  assert.ok(s.nearMissImpulse<=M01_FEEDBACK_CAPS.nearMissImpulse);
  assert.ok(s.impactImpulse<=M01_FEEDBACK_CAPS.impactImpulse);
  assert.ok(s.overlayAlpha<=M01_FEEDBACK_CAPS.overlayAlpha);
  assert.ok(Math.abs(s.cameraX)<=M01_FEEDBACK_CAPS.cameraOffset);
  assert.ok(Math.abs(s.cameraY)<=M01_FEEDBACK_CAPS.cameraOffset);
  assert.ok(Math.abs(s.roll)<=M01_FEEDBACK_CAPS.cameraRoll);
});

test('near explosion has weight, distant explosion does not create exaggerated feedback',()=>{
  const near=new M01CombatFeedback();assert.equal(near.explosion({clock:8,distance:18,direction:.4}),true);
  const ns=near.diagnostics(8,'medium');assert.ok(ns.explosionImpulse>.7);assert.ok(ns.overlayAlpha>0);
  const far=new M01CombatFeedback();assert.equal(far.explosion({clock:8,distance:400,direction:.4}),false);
  const fs=far.diagnostics(8,'medium');assert.equal(fs.explosionImpulse,0);assert.equal(fs.shakeStrength,0);assert.equal(fs.overlayAlpha,0);
});

test('feedback decay is driven only by mission clock, so pause freezes and resume continues without duplication',()=>{
  const f=new M01CombatFeedback();f.playerHit(12,.2);f.roundImpact({clock:12,distance:5,crack:true,direction:.2,weapon:'mg34'});
  const pausedA=f.diagnostics(12.18,'medium'),pausedB=f.diagnostics(12.18,'medium');assert.deepEqual(pausedB,pausedA);
  const resumed=f.diagnostics(12.52,'medium');assert.ok(resumed.hitImpulse<pausedA.hitImpulse);assert.ok(resumed.suppressionVisual<pausedA.suppressionVisual);
  assert.equal(resumed.counts.playerHit,1);assert.equal(resumed.counts.nearMiss,1);
});

test('restart/checkpoint reset clears all transient combat presentation state',()=>{
  const f=new M01CombatFeedback();f.playerHit(3,-.4);f.roundImpact({clock:3,distance:3,crack:true,direction:-.4,weapon:'mg34'});f.explosion({clock:3,distance:22,direction:.1});
  assert.ok(f.diagnostics(3,'medium').activeEvents>0);f.reset();
  const s=f.diagnostics(3,'medium');assert.equal(s.activeEvents,0);assert.equal(s.overlayAlpha,0);assert.equal(s.suppressionVisual,0);
  assert.deepEqual(s.counts,{playerHit:0,nearMiss:0,nearImpact:0,explosion:0,directional:0});assert.equal(s.lastHitDirection,null);
});

test('quality tiers preserve danger reading while Low stays cheaper and omits exposure flash',()=>{
  const f=new M01CombatFeedback();f.playerHit(1,.5);f.explosion({clock:1,distance:25,direction:.5});
  const low=f.diagnostics(1,'low'),medium=f.diagnostics(1,'medium'),high=f.diagnostics(1,'high');
  assert.ok(low.overlayAlpha>0&&low.shakeStrength>0);assert.equal(low.exposureFlash,0);
  assert.ok(low.shakeStrength<medium.shakeStrength);assert.ok(medium.shakeStrength<=high.shakeStrength);
  assert.ok(low.overlayAlpha<medium.overlayAlpha);assert.ok(medium.overlayAlpha<=high.overlayAlpha);
});

test('combat presentation consumes no gameplay RNG and cannot alter snapshot, aim, position, HP or clocks',()=>{
  const sim=new M01Simulation(19390901),before=sim.snapshot(false),rng=sim.rng.state;
  const aimBefore=aimDirection(sim.player.angle,sim.player.pitch),position={x:sim.player.x,y:sim.player.y,z:sim.player.z},health=sim.player.health;
  const f=new M01CombatFeedback();
  f.playerHit(sim.clock,-.8);f.directionalHit(sim.clock,-.8);
  for(let i=0;i<8;i++)f.roundImpact({clock:sim.clock+i*.01,distance:5+i,crack:true,direction:i%2?.7:-.7,weapon:'mg34',material:'earth'});
  f.explosion({clock:sim.clock,distance:12,direction:.2});f.diagnostics(sim.clock+.2,'high');
  assert.equal(sim.rng.state,rng);assert.deepEqual(sim.snapshot(false),before);
  assert.deepEqual(aimDirection(sim.player.angle,sim.player.pitch),aimBefore);assert.deepEqual({x:sim.player.x,y:sim.player.y,z:sim.player.z},position);
  assert.equal(sim.player.health,health);assert.equal(sim.clock,before.clock);assert.equal(sim.battleClock,before.battleClock);
});
