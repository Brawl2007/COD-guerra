import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {toCoverAdjustment} from './helpers/m01-route.js';

let flow;
const scenario=()=>flow??=toCoverAdjustment();
const load=snapshot=>{const s=new M01Simulation();s.restoreSnapshot(snapshot);return s;};

test('adjustment warning and HUD identify a real salvo; view direction changes the bearing without changing combat',()=>{
  const d=scenario(),s=d.sim,fire=s.timers.coverFire;
  assert.ok(s.enemyFire.rounds.some(r=>r.kind==='cover'&&r.by===fire.by&&r.firedAt===fire.at));
  assert.ok(d.events.some(e=>e.type==='message'&&e.message.startsWith('Zieliński: Metralhadora nos portões')));
  assert.match(s.mission.status,/Metralhadora nos portões de Lisewo · \d+ m, em frente · mude de cobertura/);
  const front=load(s.snapshot()),back=load(s.snapshot());
  back.tick(.05,{lookX:Math.PI/.0022});front.tick(.05,{});
  assert.match(back.mission.status,/atrás de si/);
  assert.deepEqual(front.enemyFire,back.enemyFire);assert.deepEqual(front.actors,back.actors);assert.equal(front.battleClock,back.battleClock);
});

test('a salvo from the dike behind the trusses identifies its actual origin, rather than the visible gate MG',()=>{
  const s=toCoverAdjustment({truss:true}).sim,fire=s.timers.coverFire;
  assert.ok(Number(fire.by.split('_').at(-1))>=14);
  assert.match(s.mission.status,/Salva do dique norte · \d+ m,/);
  assert.ok(s.enemyFire.rounds.some(r=>r.kind==='cover'&&r.by===fire.by&&r.ox===fire.x&&r.oz===fire.z));
});

test('an occluding wall prevents an adjustment warning and cover reservation, with a bounded retry',()=>{
  const s=load(scenario().beforeCoverAdjustment);
  s.world.obstacles.push({id:'origin-shield-test',min:{x:500,y:-30,z:-300},max:{x:510,y:50,z:300},material:'stone'});
  for(let i=0;i<48*20;i++)s.tick(.05,{});
  assert.equal(s.timers.coverFire,undefined);assert.equal(s.timers.coverCallIndex,0);
  assert.equal(s.flags['m01.suggested_cover'],undefined);
  assert.equal(s.enemyFire.rounds.some(r=>r.kind==='cover'),false);
  assert.equal(s.drainEvents().some(e=>e.type==='message'&&/mude de cobertura/i.test(e.message)),false);
  assert.ok(s.timers.nextCoverCall>s.clock&&s.timers.nextCoverCall<=s.clock+4);
});

test('saved origin restores as data, expires after eight active seconds, and invalid or legacy saves remain safe',()=>{
  const saved=scenario().sim.snapshot(),s=load(saved);
  assert.deepEqual(s.timers.coverFire,saved.timers.coverFire);assert.equal(s.coverFireStatus(),scenario().sim.coverFireStatus());
  s.tick(0,{});assert.equal(s.coverFireStatus(),scenario().sim.coverFireStatus());
  for(let i=0;i<9*20;i++)s.tick(.05,{});
  assert.equal(s.coverFireStatus(),'');
  const before=s.snapshot();
  for(const change of [{by:'jan_wrona'},{at:before.clock+1},{x:0},{z:Infinity}]){
    const bad=structuredClone(before);Object.assign(bad.timers.coverFire,change);
    assert.equal(s.loadCheckpoint(JSON.stringify(bad)).ok,false);assert.deepEqual(s.snapshot(),before);
  }
  const legacy=structuredClone(saved);delete legacy.timers.coverFire;
  assert.equal(load(legacy).coverFireStatus(),'');
});
