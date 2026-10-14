import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation,seconds,validateM01Snapshot} from '../src/game/m01-simulation.js';
import {compareContinuation} from './helpers/m01-determinism.js';

const E=n=>'evt_m01_'+n;
const active=()=>{const s=new M01Simulation(17);s.tick(.05,{skip:true});s.drainEvents();return s;};

test('T02 firing post and shelter route receive real LOS fire with the existing cadence and RNG algorithm',()=>{
  for(const [x,z] of [[-292,26],[-460,140]]){
    const s=active(),control=active();Object.assign(s.player,{x,z,y:s.world.heightAt(x,z)});
    Object.assign(control.player,{x:-100,z:26,y:-3});
    const a=s.actor('de_east_12'),b=control.actor('de_east_12');
    assert.equal(s.world.lineOfSight(a,s.player),true,'actual map LOS');
    s.eastFire(a,true,false);control.eastFire(b,true,false);
    assert.equal(s.enemyFire.rounds.length,1);assert.equal(s.enemyFire.rounds[0].kind,'player');
    assert.equal(a.cooldown,b.cooldown);assert.equal(s.rng.state,control.rng.state);
  }
});

test('T02 eligibility follows real playable bounds, preserves LOS and excludes the east bridgehead/dike shooters',()=>{
  const s=active();
  for(const [x,z] of [[1055,20],[441,26],[-461,26],[-292,141],[-292,-81]]){
    Object.assign(s.player,{x,z,y:s.world.heightAt(x,z)});s.enemyFire.rounds=[];
    s.eastFire(s.actor('de_east_12'),true,false);assert.equal(s.enemyFire.rounds.length,0);
  }
  Object.assign(s.player,{x:-292,y:-3,z:26});s.eastFire(s.actor('de_east_14'),true,false);
  assert.equal(s.enemyFire.rounds.length,0,'dike riflemen keep their existing target policy');
  for(const [x,z] of [[-292,68],[-262,70]]){
    Object.assign(s.player,{x,z,y:s.world.heightAt(x,z)});assert.equal(s.world.lineOfSight(s.actor('de_east_12'),s.player),false);
    s.eastFire(s.actor('de_east_12'),true,false);assert.equal(s.enemyFire.rounds.length,0,'terrain shelters the route despite its spatial eligibility');
  }
  Object.assign(s.player,{x:-292,y:-3,z:26});
  s.world.obstacles.push({id:'test_wall',min:{x:-290,y:-50,z:-100},max:{x:-289,y:100,z:200}});
  assert.equal(s.world.lineOfSight(s.actor('de_east_12'),s.player),false);
  s.eastFire(s.actor('de_east_12'),true,false);assert.equal(s.enemyFire.rounds.length,0);
});

test('T02 dialogue 019 follows the actual destruction impact and never the early railway report',()=>{
  const s=active();s.consume(E('railway_worker_report'));
  assert.ok(!s.dialogueQueue.some(d=>d.id==='dlg_m01_019'));
  let impactRecorded=false;const original=s.impact.bind(s);s.impact=(...args)=>{const result=original(...args);impactRecorded=true;return result;};
  const line=s.line.bind(s);s.line=(id,...args)=>{if(id==='dlg_m01_019')assert.equal(impactRecorded,true);return line(id,...args);};
  s.consume(E('forward_post_bombed'));assert.ok(s.dialogueQueue.some(d=>d.id==='dlg_m01_019'));
  assert.equal(s.consume(E('forward_post_bombed')),false);
  const near=active();Object.assign(near.player,{x:18,z:3});near.consume(E('forward_post_bombed'));
  assert.equal(near.flags['m01.forward_post_state'],'intact_near_miss');
  assert.ok(!near.dialogueQueue.some(d=>d.id==='dlg_m01_019'),'a saved intact post is not described as destroyed');
});

const startRaid=()=>{const s=active();s.battleClock=seconds('05:30:00');s.consume(E('bombing_0530'));s.drainEvents();return s;};

test('T03-lite aerial impacts ground after the safety shift; non-aerial demolition levels stay unchanged',()=>{
  const s=active();
  for(const [id,x,z] of [['station_bomb',-300,-40],['forward_post',0,-40],['repair_crater',-45,12]]){
    Object.assign(s.player,{x,z,y:s.world.heightAt(x,z)});const before=s.rng.state;
    s.impact(id,{x,y:123,z},true);const hit=s.sectors.damage.at(-1);
    assert.equal(hit.y,s.world.heightAt(hit.x,hit.z));assert.ok(Math.hypot(hit.x-x,hit.z-z)>=30);
    assert.equal(s.rng.state,before);
  }
  s.impact('east_demolition',{x:800,y:0,z:20},false);assert.equal(s.sectors.damage.at(-1).y,0);
});

test('T25 six fixed-time city targets stay outside gameplay and safe, without drawing combat RNG',()=>{
  for(const seed of [1,17,19390901]){
    const s=new M01Simulation(seed);s.tick(.05,{skip:true});s.battleClock=seconds('05:30:00');
    const before=s.rng.state;s.consume(E('bombing_0530'));const schedule=s.timers.raidSchedule;
    assert.equal(schedule.length,6);assert.equal(schedule.filter(t=>t.emitted).length,1);
    assert.deepEqual(schedule.map(t=>t.at),[19800,19840,19880,19920,19960,20000]);
    for(const t of schedule){
      s.battleClock=t.at-.001;s.updateRaidSchedule();assert.equal(s.sectors.damage.filter(d=>d.id===t.id).length,t.emitted?1:0);
      s.battleClock=t.at;s.updateRaidSchedule();const d=s.sectors.damage.find(d=>d.id===t.id),b=s.world.layout.bounds.playable;
      assert.equal(d.y,s.world.heightAt(d.x,d.z));assert.ok(d.x<b.minX||d.x>b.maxX||d.z<b.minZ||d.z>b.maxZ);
      assert.ok(Math.hypot(d.x-s.player.x,d.z-s.player.z)>=30);
    }
    s.battleClock=seconds('05:34:00');s.tick(.05);
    assert.equal(s.flags['m01.second_raid_state'],'ended');assert.equal(s.sectors.damage.filter(d=>d.id.startsWith('raid_0530')).length,6);
    // Only schedule/impact code is claimed to preserve RNG; an actual tick also runs existing combat/display.
    const isolated=startRaid(),rng=isolated.rng.state;isolated.battleClock=seconds('05:33:20');isolated.updateRaidSchedule();assert.equal(isolated.rng.state,rng);
    assert.equal(before,s.rng.state,'inactive starting cast uses no combat draws in this single tick');
  }
});

test('T25 existing safeImpact replacement remains safe and grounded when a player is beside an estimated target',()=>{
  const s=active();Object.assign(s.player,{x:-600,y:-3,z:100});s.battleClock=seconds('05:30:00');s.consume(E('bombing_0530'));
  const hit=s.sectors.damage[0];assert.ok(Math.hypot(hit.x-s.player.x,hit.z-s.player.z)>=30);
  assert.ok(hit.x<s.world.layout.bounds.playable.minX);assert.equal(hit.y,s.world.heightAt(hit.x,hit.z));
  validateM01Snapshot(s.snapshot());
});

test('T25 jump consumes due impacts in order once; pause/double restore resumes identical schedule and RNG',()=>{
  const s=startRaid();s.battleClock=seconds('05:31:00');s.updateRaidSchedule();
  const saved=s.snapshot();s.drainEvents();assert.equal(saved.schema,2);assert.equal(saved.sectors.damage.length,2);validateM01Snapshot(saved);
  const a=active();a.restoreSnapshot(saved);assert.deepEqual(a.snapshot(false),s.snapshot(false));
  const paused=a.snapshot();a.tick(0);a.tick(NaN);assert.deepEqual(a.snapshot(),paused);assert.deepEqual(a.drainEvents(),[]);
  const continued=active();continued.restoreSnapshot(saved);compareContinuation(continued,{label:'raid-mid-schedule',ticks:250,doubleAt:[1,40,100],dt:t=>t%11===0?0:.05});
  for(const candidate of [s,a]){candidate.battleClock=seconds('05:33:20');candidate.updateRaidSchedule();candidate.updateRaidSchedule();}
  assert.deepEqual(a.sectors.damage,s.sectors.damage);assert.equal(new Set(a.sectors.damage.map(d=>d.id)).size,6);
  assert.deepEqual(a.drainEvents().map(e=>e.point),s.drainEvents().map(e=>e.point));
  s.clock+=400;s.battleClock=seconds('05:36:00');s.flags['m01.second_raid_state']='ended';
  assert.equal(s.renderState.damage.filter(d=>d.id.startsWith('raid_0530')&&d.smokeVisible).length,6);
});

test('T25 legacy schema-2 pending/active/ended saves load without replaying historical raid impacts',()=>{
  for(const state of ['pending','active','ended']){
    const s=state==='pending'?active():startRaid();
    if(state==='ended'){s.battleClock=seconds('05:36:00');s.flags['m01.second_raid_state']='ended';}
    const save=s.snapshot(false);delete save.timers.raidSchedule;const before=structuredClone(save),a=active();a.restoreSnapshot(save);
    assert.deepEqual(save,before);assert.equal(a.rng.state,save.rng);assert.equal(a.timers.raidSchedule,undefined);
    a.updateRaidSchedule();assert.deepEqual(a.sectors.damage,save.sectors.damage);assert.deepEqual(a.drainEvents(),[]);
  }
});

test('T25 corrupt schedules reject atomically including nested checkpoint, preserving input/live state',()=>{
  const source=startRaid().snapshot(false);
  const reordered=structuredClone(source),p=reordered.timers.raidSchedule[1].point;reordered.timers.raidSchedule[1].point={z:p.z,y:p.y,x:p.x};
  validateM01Snapshot(reordered);
  const changes=[s=>s.timers.raidSchedule=null,s=>s.timers.raidSchedule.pop(),s=>s.timers.raidSchedule.push(s.timers.raidSchedule[0]),
    s=>s.timers.raidSchedule[1].id='raid_0530',s=>s.timers.raidSchedule[1].at+=1,s=>s.timers.raidSchedule[1].point.x=0,
    s=>s.timers.raidSchedule[1].point.y=100,s=>s.timers.raidSchedule[1].point.z=Infinity,s=>s.timers.raidSchedule[1].emitted=true,
    s=>s.timers.raidSchedule[0].emitted=false,s=>s.timers.raidSchedule[0].point.x-=100,s=>s.timers.raidSchedule[0].extra=1,
    s=>delete s.timers.raidSchedule[1].point.z,s=>s.sectors.damage.push({...s.sectors.damage[0]}),s=>s.sectors.damage[0].y=10,
    s=>delete s.consumed[E('bombing_0530')],s=>s.flags['m01.second_raid_state']='ended',s=>{s.sectors.damage.push({...s.sectors.damage[0],id:'raid_0530_1'});delete s.timers.raidSchedule;}];
  for(const nested of [false,true])for(const change of changes){
    const bad=structuredClone(source);if(nested)bad.resumeCheckpoint=structuredClone(source);change(nested?bad.resumeCheckpoint:bad);
    const raw=structuredClone(bad),target=active(),before=target.snapshot();assert.throws(()=>target.restoreSnapshot(bad),/Checkpoint M01 inválido/);
    assert.deepEqual(target.snapshot(),before);assert.deepEqual(bad,raw);
  }
});
