import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation,M02_GRENADE_PREPARE_SECONDS} from '../src/game/m02-01-simulation.js';
import {m02PlayerAction} from '../src/game/m02-player-actions.js';

function openField(){
 const sim=new M02BenchSimulation();sim.enterAreaBC06();sim.enemies=[];sim.allies=[];
 sim.teleportPlayer(0,100,0,0);sim.drainEvents();return sim;
}

test('grenade input reserves one item and releases only after preparation on the mission clock',()=>{
 const sim=openField();sim.clock=.0004;sim.tick(.05,{grenade:true,aim:true});
 assert.equal(sim.grenadeAmmo,1);assert.equal(sim.grenades.length,0);assert.equal(sim.player.aiming,false);
 assert.equal(sim.drainEvents().filter(e=>e.type==='grenade-preparing').length,1);
 assert.equal(sim.playerGrenadeAction.releaseAt-sim.playerGrenadeAction.startedAt,M02_GRENADE_PREPARE_SECONDS);
 for(let i=0;i<9;i++)sim.tick(.05,{grenade:true,fire:true,reload:true});
 assert.equal(sim.grenades.length,0);assert.equal(sim.grenadeAmmo,1);assert.equal(sim.weapon.shotCount,0);
 assert.equal(sim.weapon.mag,5);assert.equal(m02PlayerAction(sim),null);
 sim.tick(.05,{grenade:true,fire:true,reload:true,lookX:Math.PI/2});
 const events=sim.drainEvents(),thrown=events.filter(e=>e.type==='grenade-thrown');
 assert.equal(thrown.length,1);assert.equal(thrown[0].throwerId,sim.player.id);
 assert.ok(Math.abs(thrown[0].grenade.vx)<1e-8);assert.ok(thrown[0].grenade.vz>14.9);
 assert.equal(sim.grenadeAmmo,1);assert.equal(sim.grenades.length,1);assert.equal(sim.playerGrenadeAction,null);
 assert.deepEqual([sim.grenades[0].x,sim.grenades[0].y,sim.grenades[0].z],
  [thrown[0].grenade.x,thrown[0].grenade.y,thrown[0].grenade.z],'release does not simulate a tick before the projectile exists');
 assert.equal(sim.weapon.shotCount,0);assert.equal(events.some(e=>e.type==='shot-fired'),false);
});

test('the prepared player release cannot appear through a wall beside the hand',()=>{
 const sim=openField();sim.world.obstacles.push({id:'release-wall',min:{x:.25,y:0,z:99},max:{x:.35,y:3,z:101},material:'brick'});
 sim.tick(.05,{grenade:true});for(let i=0;i<10;i++)sim.tick(.05,{});
 const thrown=sim.drainEvents().find(e=>e.type==='grenade-thrown');assert.ok(thrown);
 assert.ok(thrown.grenade.x<.25);assert.ok(sim.grenades[0].x<.25);
 sim.tick(.05,{});assert.ok(sim.grenades[0].x<.25);assert.ok(sim.grenades[0].vx<0);
});

test('a checkpoint during preparation resumes the exact release, physics and RNG',()=>{
 const sim=openField();sim.tick(.05,{grenade:true});sim.tick(.1,{});sim.drainEvents();const save=sim.snapshot();
 assert.ok(save.playerGrenadeAction);assert.equal(save.grenades.length,0);
 const run=()=>{for(let i=0;i<14;i++)sim.tick(.05,{});return {snapshot:sim.snapshot(),events:sim.drainEvents()};};
 const first=run();sim.restoreSnapshot(save);sim.drainEvents();assert.deepEqual(run(),first);
 const before=sim.snapshot(),bad=structuredClone(save);bad.playerGrenadeAction.releaseAt=NaN;
 assert.throws(()=>sim.restoreSnapshot(bad),/inválid/);assert.deepEqual(sim.snapshot(),before);
 const legacy=structuredClone(save);delete legacy.playerGrenadeAction;
 assert.doesNotThrow(()=>sim.restoreSnapshot(legacy));assert.equal(sim.playerGrenadeAction,null);
});

test('a grenade pressed during the bolt cycle waits for the real rifle and survives a checkpoint',()=>{
 const sim=openField();sim.tick(.05,{fire:true});assert.equal(sim.weapon.boltCycling,true);
 const boltReady=sim.weapon.until/1000;sim.tick(.05,{grenade:true});
 assert.equal(sim.grenadeAmmo,1);assert.equal(sim.playerGrenadeAction.startedAt,boltReady);assert.equal(sim.grenades.length,0);
 const save=sim.snapshot(),run=()=>{
  while(sim.clock+1e-8<boltReady)sim.tick(.05,{fire:true});
  assert.equal(sim.weapon.boltCycling,false);assert.equal(sim.weapon.shotCount,1);assert.equal(sim.grenades.length,0);
  while(sim.playerGrenadeAction)sim.tick(.05,{fire:true});
  return {snapshot:sim.snapshot(),events:sim.drainEvents()};
 };
 sim.drainEvents();const first=run();sim.restoreSnapshot(save);sim.drainEvents();assert.deepEqual(run(),first);
 const invalid=structuredClone(save);invalid.playerGrenadeAction.startedAt+=.1;invalid.playerGrenadeAction.releaseAt+=.1;
 assert.throws(()=>sim.restoreSnapshot(invalid),/inválid/);
});

test('death cancels a reserved grenade without creating a projectile or losing ammunition',()=>{
 const sim=openField();sim.tick(.05,{grenade:true});sim.drainEvents();sim.player.health=20;
 const blast=sim.detonateGrenadeAt(sim.player.x,1,sim.player.z);assert.ok(blast.affectedActors.find(a=>a.id===sim.player.id).damage>=20);
 assert.equal(sim.player.health,0);assert.equal(sim.playerGrenadeAction,null);assert.equal(sim.grenadeAmmo,2);
 assert.equal(sim.grenades.length,0);assert.equal(sim.drainEvents().some(e=>e.type==='grenade-thrown'),false);
 assert.doesNotThrow(()=>sim.restoreSnapshot(sim.snapshot()));
});

test('a grenade pressed during reload waits until the real reload finishes, including after a checkpoint',()=>{
 const reloading=openField();reloading.weapon.mag=3;const reserve=reloading.weapon.reserve;assert.equal(reloading.weapon.reload(0),true);
 reloading.tick(.05,{grenade:true});assert.equal(reloading.grenadeAmmo,1);assert.equal(reloading.playerGrenadeAction.waitingForReload,true);
 assert.equal(reloading.throwGrenade(null,null,{reserved:true}),null);
 const save=reloading.snapshot();reloading.drainEvents();
 const run=()=>{while(reloading.weapon.reloading){reloading.tick(.05,{fire:true,grenade:true});assert.equal(reloading.grenades.length,0);}
  assert.equal(reloading.weapon.mag,5);assert.equal(reloading.weapon.reserve,reserve-2);assert.equal(reloading.weapon.shotCount,0);
  assert.ok(Number.isFinite(reloading.playerGrenadeAction.startedAt));
  while(reloading.playerGrenadeAction)reloading.tick(.05,{});return {snapshot:reloading.snapshot(),events:reloading.drainEvents()};};
 const first=run();reloading.restoreSnapshot(save);reloading.drainEvents();assert.deepEqual(run(),first);
 const bad=structuredClone(save);delete bad.grenadeAmmo;assert.throws(()=>reloading.restoreSnapshot(bad),/inválid/);
});

test('carried supplies and duplicate presses cannot spend an unavailable grenade',()=>{
 const carrying=openField();carrying.player.carryingVolumeId='vol_water';carrying.tick(.05,{grenade:true});
 assert.equal(carrying.grenadeAmmo,2);assert.equal(carrying.playerGrenadeAction,null);
 const pending=openField();pending.tick(.05,{grenade:true});assert.equal(pending.throwGrenade(),null);
 assert.equal(pending.throwGrenade(null,null,{reserved:true}),null);assert.equal(pending.grenadeAmmo,1);
});
