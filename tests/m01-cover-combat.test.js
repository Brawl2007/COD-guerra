import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation,seconds} from '../src/game/m01-simulation.js';
import {route} from './helpers/m01-route.js';

let ignored,aided;
const scenarios=()=>({ignored:ignored??=route(),aided:aided??=route(19390901,{support:true})});
const run=(s,n)=>{for(let i=0;i<n*20;i++)s.tick(.05);};
const load=snapshot=>{const s=new M01Simulation();s.restoreSnapshot(snapshot);return s;};
const platoon=s=>s.allies.filter(a=>a.active&&a.alive&&a.group==='grp_east_platoon');
// Tiros alemães que chegaram a menos de 3 m de alguém (round-impact.pinned), por prefixo de ID.
const near=(events,id)=>events.filter(e=>e.type==='round-impact'&&e.pinned?.some(p=>p.startsWith(id)));

test('real control routes compare covering and ignoring: faster repair, fewer near misses and more survivors with support',()=>{
  const {ignored:i,aided:a}=scenarios();
  const repairTime=r=>r.sim.consumed.evt_m01_repair_complete-r.combatSnapshots.repair.clock;
  assert.ok(repairTime(a)<repairTime(i)-5,`${repairTime(a)} vs ${repairTime(i)}`);
  assert.ok(near(i.events,'pawel_krawiec').length>0);assert.ok(near(a.events,'pawel_krawiec').length<near(i.events,'pawel_krawiec').length);
  assert.ok(a.sim.flags['m01.east_platoon_survivors']>i.sim.flags['m01.east_platoon_survivors']);
  assert.ok(a.sim.weapon.shotCount>0);assert.ok(a.sim.weapon.mag+a.sim.weapon.reserve>0,'o piloto não depende de munição infinita');
  for(const r of [i,a]){
    assert.equal(r.sim.mission.complete,true);assert.equal(r.sim.battleClock,seconds('07:05'));
    assert.equal(Object.keys(r.sim.consumed).length,r.sim.definition.events.length);
    assert.equal(platoon(r.sim).length,r.sim.flags['m01.east_platoon_survivors']);
    assert.ok(r.sim.enemies.every(e=>e.x>=690));
  }
});

test('repair suppression requires a round that really arrives within 3 m; a solid wall shields the sappers',()=>{
  const s=load(scenarios().ignored.combatSnapshots.repairThreat),wall=load(s.snapshot());
  wall.world.obstacles.push({id:'shield-test',min:{x:650,y:-10,z:-300},max:{x:660,y:25,z:300},material:'stone'});
  run(s,20);run(wall,20);
  assert.ok(near(s.drainEvents(),'pawel_krawiec').length>0);assert.ok(s.objectives.obj_m01_cover_repair.progress<wall.objectives.obj_m01_cover_repair.progress);
  assert.equal(near(wall.drainEvents(),'pawel_krawiec').length,0);
  assert.ok(wall.timers.repairSuppressedUntil<wall.clock);
});

test('inactive or suppressed Germans on the spans cause no withdrawal losses; looking away does not stop combat',()=>{
  const snapshot=scenarios().ignored.combatSnapshots.withdrawal;
  for(const mode of ['inactive','suppressed']){
    const s=load(snapshot);
    for(const a of s.enemies.filter(a=>a.group==='grp_de_spans')){if(mode==='inactive')a.active=false;else a.suppressedUntil=s.clock+100;}
    run(s,25);assert.equal(s.flags['m01.east_platoon_survivors'],18);assert.equal(platoon(s).length,18);
    assert.equal(s.drainEvents().filter(e=>e.type==='round-impact'&&e.by?.startsWith('de_spans')).length,0);
  }
  const front=load(snapshot),away=load(snapshot);away.player.angle+=Math.PI;run(front,25);run(away,25);
  assert.ok(front.flags['m01.east_platoon_survivors']<18);assert.deepEqual(front.actors,away.actors);
  assert.deepEqual(front.sectors,away.sectors);assert.deepEqual(front.enemyFire,away.enemyFire);
});

test('casualty IDs and rounds in flight survive reload and checkpoint restore; invalid optional timers are rejected atomically',()=>{
  const s=load(scenarios().ignored.combatSnapshots.withdrawal);run(s,15);const saved=s.snapshot(),restored=load(saved);
  const dead=s.allies.filter(a=>a.group==='grp_east_platoon'&&a.active&&!a.alive).map(a=>a.id);assert.ok(dead.length>0);
  assert.deepEqual(restored.snapshot(),saved);run(s,10);run(restored,10);assert.deepEqual(restored.snapshot(),s.snapshot());
  restored.restoreCheckpoint();assert.deepEqual(restored.allies.filter(a=>a.group==='grp_east_platoon'&&a.active&&!a.alive).map(a=>a.id),dead);
  const before=restored.snapshot();
  // Timers opcionais também aceites de saves anteriores (withdrawalPressure do primeiro protótipo de cobertura).
  for(const [key,value] of [['withdrawalPressure',-1],['withdrawalPressure',.5],['withdrawalPressure',8],['nextCombatCall',-1],['repairPins',Infinity],['fireEase','sim']]){
    const bad=structuredClone(before);bad.timers[key]=value;assert.equal(restored.loadCheckpoint(JSON.stringify(bad)).ok,false,key);assert.deepEqual(restored.snapshot(),before);
  }
});

test('legacy schema 2 saves migrate and the six reserve slots stay outside the eighteen-man platoon',()=>{
  const old=structuredClone(scenarios().ignored.combatSnapshots.withdrawal);
  delete old.timers.nextCombatCall;delete old.enemyFire;
  for(const a of old.actors.filter(a=>a.group==='grp_east_platoon'))Object.assign(a,{active:true,alive:true,health:100,state:'ADVANCE'});
  const s=load(old);assert.equal(s.timers.nextCombatCall,0);assert.deepEqual(s.enemyFire,{rounds:[],nextId:0});assert.equal(platoon(s).length,18);
  run(s,5);assert.equal(s.loadCheckpoint(JSON.stringify(s.snapshot())).ok,true);
});

test('the air-raid cover instruction remains visible briefly even if the player was already in cover',()=>{
  const s=new M01Simulation();s.tick(.05,{skip:true});Object.assign(s.player,{x:-60,y:-3,z:22});
  s.consume('evt_m01_bombing_0434');assert.ok(s.world.coverAt(s.player));
  assert.ok(s.drainEvents().some(e=>e.type==='message'&&e.message.startsWith('Abrigue-se!')));
  run(s,2);assert.equal(s.active('take_cover'),true);assert.match(s.mission.text,/Abrigue-se/);
  run(s,1);assert.equal(s.done('take_cover'),true);assert.equal(s.active('follow_sergeant'),true);
});
