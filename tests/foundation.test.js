import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/world/world.js';
import { UNITS_PER_METRE } from '../src/config.js';
import { eyePosition, aimDirection, traceShot, toScene } from '../src/world/spatial.js';
import { Soldier } from '../src/game/actors.js';
import { Simulation } from '../src/game/simulation.js';
import { GrenadeSystem } from '../src/game/grenade.js';
import { SectorBattle } from '../src/game/sector-battle.js';
import { BattleDirector } from '../src/game/battle-director.js';

const arena=()=>new World(['111111','1P0E01','111111']);

test('planar y becomes scene z; height is independent',()=>{
  assert.deepEqual(toScene({x:64,y:96},1.5),{x:2,y:1.5,z:3});
});
test('horizontal head shot hits, aiming above the head misses',()=>{
  const w=arena(),p=w.spawns.P[0],enemy=new Soldier({...w.spawns.E[0],id:'target'});
  const hit=traceShot(w,eyePosition(p),aimDirection(0,0),[enemy],30);
  assert.equal(hit.actor,enemy);assert.equal(hit.part,'head');
  const miss=traceShot(w,eyePosition(p),aimDirection(0,.65),[enemy],30);
  assert.notEqual(miss?.actor,enemy);
});
test('nearest wall shields an enemy; lowering the aim hits terrain',()=>{
  const w=new World(['111111','1P1E01','111111']),enemy=new Soldier(w.spawns.E[0]);
  assert.equal(traceShot(w,eyePosition(w.spawns.P[0]),aimDirection(0),[enemy],30).kind,'world');
  const open=arena(),ground=traceShot(open,eyePosition(open.spawns.P[0]),aimDirection(0,-.8),[],20);
  assert.equal(ground.material,'earth');assert.ok(Math.abs(ground.point.y)<1e-8);
});
test('wall around muzzle blocks a clear camera sightline',()=>{
  const w={obstacles:[{min:{x:2,y:0,z:0},max:{x:3,y:3.4,z:4},material:'stone'}]};
  const enemy=new Soldier({x:32,y:320});
  const hit=traceShot(w,{x:1,y:1.64,z:5},{x:0,y:0,z:1},[enemy],20,{x:2.1,y:1.5,z:3.9});
  assert.equal(hit.kind,'world');assert.equal(hit.distance,0);
});
test('enemy in cover cannot cause damage through a wall',()=>{
  const w=new World(['111111','1P1E01','111111']),enemy=new Soldier(w.spawns.E[0]);
  enemy.cover={...enemy};enemy.tacticTimer=10;enemy.cooldown=0;enemy.state='SUPPRESS';
  for(let i=0;i<60;i++)assert.equal(enemy.update(1/60,w,w.spawns.P[0],i*16,[]),null);
});
test('unreachable destination reports failure and does not move through walls',()=>{
  const w=new World(['11111','1P101','11111']);
  assert.equal(w.nextStep(w.spawns.P[0],{x:224,y:96}),null);
});
test('wall shields blast damage but visible nearby actor takes damage',()=>{
  const w=new World(['111111','1P1E01','111111']),enemy=new Soldier(w.spawns.E[0]);
  const p={...w.spawns.P[0],alive:true,damage(){}};
  const grenade={...p,height:10,alive:true};let calls=0;
  new GrenadeSystem().explode(grenade,[enemy],p,()=>calls++,w);
  assert.equal(enemy.health,75);assert.equal(calls,1);
  const open=arena(),exposed=new Soldier(open.spawns.E[0]);
  new GrenadeSystem().explode({...open.spawns.P[0],height:10,alive:true},[exposed],p,()=>{},open);
  assert.ok(exposed.health<75);
});
test('JSON checkpoint restores actors, reload, grenade, phase, clock and RNG exactly',()=>{
  const s=new Simulation(15);s.clock=21;s.player.pitch=.3;s.weapon.shoot(20000);s.weapon.reload(20500);
  s.grenades.throw(s.player,21000);s.enemies[0].damage(90);s.enemies[5].active=true;
  s.mission.phase=1;s.director.wave=1;s.allies[0].cover=s.world.coverPoints[3];
  s.sectors.update(21,()=>{});
  const before=s.snapshot();s.checkpoint=before;
  s.clock=80;s.weapon.mag=0;s.grenades.ammo=0;s.mission.phase=3;s.enemies[0].alive=true;
  s.restoreCheckpoint();assert.deepEqual(s.snapshot(),before);
  assert.equal(s.weapon.reloading,true);assert.equal(s.enemies[0].alive,false);
});
test('corrupt and incompatible saves are rejected atomically',()=>{
  const s=new Simulation(),before=s.snapshot();
  assert.equal(s.loadCheckpoint('{bad json').ok,false);
  assert.equal(s.loadCheckpoint(JSON.stringify({...before,schema:99})).ok,false);
  assert.equal(s.loadCheckpoint(JSON.stringify({...before,weapon:{...before.weapon,mag:999}})).ok,false);
  assert.deepEqual(s.snapshot(),before);
});
test('death restores the last living checkpoint without reviving defeated enemies',()=>{
  const s=new Simulation(39);
  s.mission.phase=1;s.enemies[0].damage(100);s.weapon.shoot(0);
  s.clock=8;s.checkpoint=s.snapshot();const saved=s.snapshot();
  s.enemies[0].alive=true;s.clock=20;s.player.damage(100);
  s.tick(1/60);
  assert.deepEqual(s.snapshot(),saved);
  assert.equal(s.player.alive,true);assert.equal(s.enemies[0].alive,false);
  assert.deepEqual(s.drainEvents(),[{type:'restored'}]);
});
test('restored simulation reproduces future seeded decisions and events',()=>{
  const a=new Simulation(44),b=new Simulation(44);
  for(let i=0;i<60;i++)a.tick(1/60,{forward:1});
  b.restoreSnapshot(a.snapshot());a.drainEvents();
  for(let i=0;i<120;i++){const c={fire:i%25===0};a.tick(1/60,c);b.tick(1/60,c);}
  assert.deepEqual(a.snapshot(),b.snapshot());assert.deepEqual(a.drainEvents(),b.drainEvents());
});
test('two independent sectors evolve for 90 seconds with stable losses and unique events',()=>{
  const battle=new SectorBattle(()=>.5),events=[];
  for(let i=0;i<90;i++)battle.update(1,e=>events.push(e));
  assert.equal(battle.sectors.length,2);assert.ok(battle.sectors.every(s=>s.casualties===1));
  assert.equal(new Set(battle.consumed).size,battle.consumed.length);
  assert.equal(events.filter(e=>e.type==='sector-impact').length,2);
  const dead=battle.actors.filter(a=>!a.alive).map(a=>a.id);
  battle.update(20,()=>{});assert.deepEqual(battle.actors.filter(a=>!a.alive).map(a=>a.id),dead);
});
test('partial fourth reinforcement group activates and visible candidates remain hidden',()=>{
  const enemies=Array.from({length:14},(_,i)=>({alive:true,x:600+i*20,y:600}));
  const d=new BattleDirector(enemies,{ambience(){}});
  enemies.slice(0,12).forEach(e=>e.alive=false);
  d.update(1,{x:0,y:0},{phase:1},{lineOfSight:()=>false});
  assert.ok(enemies.slice(12).every(e=>e.active));
  const fresh=Array.from({length:8},(_,i)=>({alive:true,x:96+i,y:96}));
  const director=new BattleDirector(fresh,{ambience(){}});
  assert.equal(director.deployWave(1,{x:96,y:96},{lineOfSight:()=>true}),false);
});
test('zero time never advances reload or the battle',()=>{
  const s=new Simulation();s.weapon.shoot(0);s.weapon.reload(0);
  const before=s.snapshot();for(let i=0;i<100;i++)s.tick(0,{fire:true});
  assert.deepEqual(s.snapshot(),before);assert.equal(s.weapon.reloading,true);
});
