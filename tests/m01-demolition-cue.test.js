import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {route} from './helpers/m01-route.js';

let result;
const flow=()=>result??=route();
const load=snapshot=>{const sim=new M01Simulation();sim.restoreSnapshot(snapshot);return sim;};
const turn=(sim,angle)=>sim.tick(.05,{lookX:Math.atan2(Math.sin(angle-sim.player.angle),Math.cos(angle-sim.player.angle))/.0022});

test('demolition bearing follows the actual impact and player view without changing the event or camera',()=>{
  const snapshot=flow().combatSnapshots.eastDemolition,front=load(snapshot),back=load(snapshot);
  const impact=front.sectors.damage.find(d=>d.id==='east_demolition');
  const angle=Math.atan2(impact.z-front.player.z,impact.x-front.player.x);
  turn(front,angle);turn(back,angle+Math.PI);
  const metres=Math.round(Math.hypot(impact.x-front.player.x,impact.z-front.player.z));
  assert.equal(front.mission.status,`Demolição leste · ${metres} m, em frente · recue para o posto de disparo`);
  assert.match(back.mission.status,/atrás de si/);
  assert.ok(Math.abs(Math.atan2(Math.sin(front.player.angle-angle),Math.cos(front.player.angle-angle)))<1e-10);
  assert.equal(front.player.pitch,snapshot.player.pitch);
  assert.deepEqual(front.consumed,back.consumed);assert.deepEqual(front.destruction,back.destruction);
  assert.deepEqual(front.flags,back.flags);assert.deepEqual(front.sectors,back.sectors);
  assert.equal(front.battleClock,back.battleClock);
});

test('demolition cue restores from data, expires on active time, and distinguishes the west blast',()=>{
  const snapshots=flow().combatSnapshots;
  for(const [name,duration]of [['east',12],['west',15]]){
    const snapshot=snapshots[`${name}Demolition`],sim=load(snapshot);
    assert.match(sim.demolitionStatus(),new RegExp(`^Demolição ${name==='east'?'leste':'oeste'} ·`));
    assert.equal(sim.demolitionStatus(),load(JSON.parse(JSON.stringify(sim.snapshot()))).demolitionStatus());
    const clock=sim.clock,status=sim.demolitionStatus();
    sim.tick(0,{});assert.equal(sim.clock,clock);assert.equal(sim.demolitionStatus(),status);
    for(let i=0;i<(duration+1)*20;i++)sim.tick(.05,{});
    assert.equal(sim.demolitionStatus(),'');
    assert.equal(sim.player.health,snapshot.player.health);
  }
  assert.equal(load(flow().checkpoints.cp_m01_c_engenheiros).demolitionStatus(),'');
});
