import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation,M02_WATER_HANDOFF_SECONDS} from '../src/game/m02-01-simulation.js';

function scene(){
 const sim=new M02BenchSimulation();const wounded=sim.enemies.find(e=>e.c04Candidate);
 sim.enemies=[wounded];sim.allies=[];Object.assign(wounded,{x:1,y:0,z:-60,health:40,alive:true,state:'WOUNDED_UNARMED',nonCombatant:true});
 sim.teleportPlayer(0,-60,0,0);sim.drainEvents();return {sim,wounded};
}

test('C04 water is an optional once-only act, independent of chalk, health and supplies',()=>{
 const {sim,wounded}=scene(),health=sim.player.health,supplies=structuredClone(sim.supplies),flags=structuredClone(sim.flags),before=sim.snapshot();
 assert.equal(sim.currentWoundedWaterPrompt()?.actorId,wounded.id);sim.tick(.05,{giveWater:true});
 assert.ok(sim.playerWaterAction);assert.equal(wounded.c04WaterOfferedAt,undefined);assert.equal(sim.flags['m02.pomar_wounded_water'],undefined);
 sim.drainEvents();const mid=sim.snapshot();
 const finish=()=>{for(let i=0;i<40&&sim.playerWaterAction;i++)sim.tick(.05,{});return {snapshot:sim.snapshot(),events:sim.drainEvents()};};
 const first=finish();assert.equal(sim.playerWaterAction,null);assert.ok(sim.clock>=mid.playerWaterAction.startedAt+M02_WATER_HANDOFF_SECONDS-1e-7);
 assert.equal(first.events.filter(e=>e.type==='c04-wounded-water').length,1);
 sim.restoreSnapshot(mid);sim.drainEvents();assert.deepEqual(finish(),first);
 const offered=sim.enemies[0];assert.equal(offered.c04WaterOfferedAt,sim.clock);assert.equal(sim.flags['m02.pomar_wounded_water'],true);assert.equal(sim.player.health,health);assert.deepEqual(sim.supplies,supplies);
 assert.equal(sim.flags['m02.pomar_wounded_marked'],flags['m02.pomar_wounded_marked']);assert.equal(sim.currentWoundedWaterPrompt(),null);
 assert.equal(sim.giveWoundedWater(),null);
 const after=sim.snapshot();sim.restoreSnapshot(before);sim.drainEvents();sim.tick(.05,{giveWater:true});sim.drainEvents();finish();assert.deepEqual(sim.snapshot(),after);
 sim.restoreSnapshot(after);assert.equal(sim.currentWoundedWaterPrompt(),null);assert.ok(sim.currentChalkPrompt(),'water must not remove the separate chalk action');
 sim.enterAreaBC06();const later=sim.snapshot();assert.equal(later.flags['m02.pomar_wounded_water'],true);sim.restoreSnapshot(later);assert.equal(sim.flags['m02.pomar_wounded_water'],true);
});

test('moving away or urgent fire interrupts the unfinished water handoff without completing it',()=>{
 for(const controls of [{forward:1},{fire:true}]){
  const {sim}=scene();sim.tick(.05,{giveWater:true});assert.ok(sim.playerWaterAction);sim.drainEvents();
  sim.tick(.05,controls);assert.equal(sim.playerWaterAction,null);assert.equal(sim.flags['m02.pomar_wounded_water'],undefined);
  assert.equal(sim.drainEvents().some(e=>e.type==='c04-wounded-water'),false);assert.doesNotThrow(()=>sim.restoreSnapshot(sim.snapshot()));
 }
 const {sim}=scene();sim.tick(.05,{giveWater:true});const saved=sim.snapshot();
 const bad=structuredClone(saved);bad.playerWaterAction.finishAt+=1;assert.throws(()=>sim.restoreSnapshot(bad),/inválid/);
 assert.deepEqual(sim.snapshot(),saved);const legacy=structuredClone(saved);delete legacy.playerWaterAction;assert.doesNotThrow(()=>sim.restoreSnapshot(legacy));
});

test('a fatal explosion interrupts water preparation without recording a completed offer',()=>{
 const {sim}=scene();sim.tick(.05,{giveWater:true});assert.ok(sim.playerWaterAction);sim.drainEvents();
 sim.player.health=1;sim.detonateGrenadeAt(sim.player.x,1,sim.player.z);
 assert.equal(sim.player.health,0);assert.equal(sim.playerWaterAction,null);assert.equal(sim.flags['m02.pomar_wounded_water'],undefined);
 assert.equal(sim.drainEvents().some(e=>e.type==='c04-wounded-water'),false);assert.doesNotThrow(()=>sim.restoreSnapshot(sim.snapshot()));
});

test('C04 water requires a reachable living wounded person and rejects invalid checkpoint data',()=>{
 const {sim,wounded}=scene();sim.teleportPlayer(4,-60,0,0);assert.equal(sim.currentWoundedWaterPrompt(),null);
 sim.teleportPlayer(0,-60,0,0);const wall={id:'test_wall',min:{x:.4,y:0,z:-61},max:{x:.6,y:3,z:-59}};sim.world.obstacles.push(wall);
 assert.equal(sim.currentWoundedWaterPrompt(),null);sim.world.obstacles.pop();
 sim.player.carryingVolumeId='vol_water';assert.equal(sim.currentWoundedWaterPrompt(),null);sim.player.carryingVolumeId=null;
 wounded.alive=false;assert.equal(sim.currentWoundedWaterPrompt(),null);wounded.alive=true;
 wounded.state='SURRENDERED';assert.equal(sim.currentWoundedWaterPrompt(),null);wounded.state='WOUNDED_UNARMED';
 const legacy=sim.snapshot();assert.doesNotThrow(()=>sim.restoreSnapshot(legacy));
 const bad=structuredClone(legacy);bad.enemies[0].c04WaterOfferedAt='now';assert.throws(()=>sim.restoreSnapshot(bad),/inválid/);assert.deepEqual(sim.snapshot(),legacy);
 const badFlag=structuredClone(legacy);badFlag.flags['m02.pomar_wounded_water']='yes';assert.throws(()=>sim.restoreSnapshot(badFlag),/inválid/);assert.deepEqual(sim.snapshot(),legacy);
});
