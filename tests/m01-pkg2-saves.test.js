import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {M01Simulation,validateM01Snapshot,seconds} from '../src/game/m01-simulation.js';
import {dustClouds,DUST} from '../src/game/m01-dust.js';
import {GARRISON_GROUP} from '../src/game/m01-garrison.js';

// Package 2 (2026-11-04, golden amendment 21): saves made BEFORE the dust, the first aid and the grenade tuning existed must load and play on. tests/fixtures/m01-pkg2-old-saves.json holds two real schema-2 saves of the
// control golden route (seed 19390901), written by the predecessor (57ba50f3): one at 04:42:00 (the bombs have wounded men of the garrison, the medic is still at the station), one at 06:05:30 (the deck assault).
const FIX=JSON.parse(readFileSync(new URL('./fixtures/m01-pkg2-old-saves.json',import.meta.url)));
const DT=.05,save=label=>structuredClone(FIX.saves.find(s=>s.label===label).snapshot);

test('the fixture is what it says: saves of the predecessor, with none of the new state',()=>{
  assert.equal(FIX.source,'57ba50f3305d18a0ddcad0d2c3563f14e293d7a7');
  for(const {snapshot:s} of FIX.saves){
    assert.equal(s.schema,2);assert.ok(s.sectors.damage.length>0&&s.sectors.damage.every(d=>d.dust===undefined),'no cloud on any crater');
    assert.ok(s.actors.every(a=>a.aid===undefined),'no aid record');assert.equal(s.timers.aid,undefined);assert.ok(s.actors.some(a=>a.id==='pl_west_5'),'the west garrison of R1-a is in it');
  }
});

test('a save of 04:42 validates, loads, gives the recent craters their default clouds, and goes on: the wounded get their record, the medic takes his job when he is free of the station',()=>{
  const raw=save('04:42:00');validateM01Snapshot(raw);
  const s=new M01Simulation(1);s.restoreSnapshot(raw);
  const expected=dustClouds(raw.sectors.damage,raw.clock);
  assert.deepEqual(s.renderState.dust,expected,'the clouds of an old save are the default of each crater\'s kind, for the craters still young enough');
  assert.ok(raw.sectors.damage.every(d=>raw.clock-d.started>=DUST.kinds[d.id.includes('demolition')?'demolition':d.id.startsWith('m01_grenade_')?'grenade':'bomb'].life)||expected.length>0);
  const wounded=s.actors.filter(a=>a.group===GARRISON_GROUP&&a.state==='WOUNDED').map(a=>a.id);assert.ok(wounded.length>=1,'the bombs of the old save had wounded a man');
  let job=null;
  for(let i=0;i<60/DT;i++){s.tick(DT,{});if(!job&&s.timers.aid)job={patient:s.timers.aid.patient,at:s.clock};}
  assert.ok(wounded.every(id=>s.actor(id).aid!==undefined),'each wounded man has his record');
  assert.ok(job,'the medic took a job');assert.ok(wounded.includes(job.patient));assert.ok(job.at>raw.clock+5,`not at once: he was at the station (${(job.at-raw.clock).toFixed(1)} s after the save)`);
  validateM01Snapshot(s.snapshot());
  // two restores of the same old save go on identically
  const a=new M01Simulation(2),b=new M01Simulation(3);a.restoreSnapshot(save('04:42:00'));b.restoreSnapshot(save('04:42:00'));
  for(let i=0;i<400;i++){a.tick(DT,{});b.tick(DT,{});}
  assert.deepEqual(a.snapshot(),b.snapshot());
});

test('a save of 06:05:30 (the deck assault in progress, made with safeX 250 and no grenade) validates, loads and plays on: the lines of the live data, no exception, a valid save at the end',()=>{
  const raw=save('06:05:30');validateM01Snapshot(raw);
  const s=new M01Simulation(1);s.restoreSnapshot(raw);
  assert.ok(s.actors.filter(a=>a.group==='grp_de_spans'&&a.deck).length>=6,'the assault is on the deck');
  for(let i=0;i<120/DT;i++){s.tick(DT,{});if(s.mission.complete)break;}
  validateM01Snapshot(s.snapshot());
  assert.ok(s.clock>raw.clock+100);
  assert.ok(s.actors.every(a=>!(a.team==='enemy'&&a.group==='grp_de_spans'&&a.deck!==undefined&&a.x<190)),'nobody west of the live safeX');
});
