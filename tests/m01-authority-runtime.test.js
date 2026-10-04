import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {PILOT_IDS,PILOT_FORMATION,M01AuthorityCoordinator,activeCombat,pilotActor,copy,physicalBand} from '../src/game/m01-authority-coordinator.js';
import {createPilot,resolvePilotSector,pilotOperation,updatePilotWeapon} from '../src/game/m01-sector-runtime-adapter.js';
import {compareContinuation} from './helpers/m01-determinism.js';
import {eyePosition} from '../src/world/spatial.js';

function fixture({dead=0,empty=false}={}){
  const s=new M01Simulation(19390901);s.tick(.05,{skip:true});s.consume('evt_m01_train963_arrives');
  s.scene=null;for(const a of s.enemies)if(!pilotActor(a))a.active=false;
  Object.assign(s.player,{x:-150,y:-3,z:-50});
  if(empty)s.actor(PILOT_IDS[0]).rounds=0;
  const retainedDead=Array.from({length:dead},(_,i)=>({id:`${PILOT_FORMATION}/soldier/${i}`,status:'dead',health:0,position:{x:1090+i,y:-1,z:100+i}}));
  // Explicit adversarial initial fixture, not an authored historical casualty count.
  s.authorityPilot=createPilot(s,retainedDead);s.drainEvents();return s;
}
const state=s=>s.authorityPilot.snapshot();
const near=s=>{Object.assign(s.player,{x:-66,y:-3,z:80});s.tick(.05);assert.equal(s.authorityPilot.owner,'INDIVIDUAL');s.drainEvents();return s;};
const far=s=>{Object.assign(s.player,{x:-150,y:-3,z:-50});for(let i=0;i<120&&s.authorityPilot.owner!=='AGGREGATED';i++)s.tick(.05);
  assert.equal(s.authorityPilot.owner,'AGGREGATED');s.drainEvents();return s;};
const unchanged=(s,fn,pattern)=>{const before=s.snapshot(),actors=copy(s.actors);assert.throws(fn,pattern);assert.deepEqual(s.snapshot(),before);assert.deepEqual(s.actors,actors);};

test('real tick uses the fixed four anonymous actors and one active owner',()=>{
  const s=fixture(),before=state(s);assert.equal(before.owner,'AGGREGATED');near(s);
  assert.equal(s.authorityPilot.assertOwner(),'INDIVIDUAL');assert.equal(s.authorityPilot.diagnostics().individualMemberCount,4);
  assert.deepEqual(state(s).lease.memberIds,PILOT_IDS);assert.equal(s.actors.length,89);
  assert.deepEqual(state(s).sectorRng,before.sectorRng);assert.equal(s.burst(s.actor(PILOT_IDS[0]),s.player),false);
});
test('duplicate acquire and stale revision reject without state or actor publication',()=>{
  const s=fixture();unchanged(s,()=>s.authorityPilot.acquire(99),/stale/);s.authorityPilot.acquire();unchanged(s,()=>s.authorityPilot.acquire(),/duplicate/);
});
test('member 3 preparation failure rolls back actors 1/2, RNG, clocks, generation and owner',()=>{
  const s=fixture();let calls=0;
  unchanged(s,()=>s.authorityPilot.acquire(undefined,m=>{calls++;if(calls===3)throw Error('member 3 failure');return m;}),/member 3/);
  assert.equal(calls,3);unchanged(s,()=>s.authorityPilot.acquire(undefined,m=>({...m,health:17})),/changed descriptor/);
});
test('staging snapshot is unsafe; asynchronous materialization is rejected atomically',()=>{
  const s=fixture();unchanged(s,()=>s.authorityPilot.acquire(undefined,m=>{s.snapshot();return m;}),/unsafe transaction/);
  unchanged(s,()=>s.authorityPilot.acquire(undefined,async m=>m),/changed descriptor/);
});
test('return is complete and exact; malformed member 3 or missing members publish nothing',()=>{
  const s=near(fixture());for(const edit of [p=>p.combat.members.pop(),p=>p.combat.members[2].ammo.loaded++,p=>p.combat.members[2].position.x++,p=>p.combat.reserve++]){
    const p=s.authorityPilot.returnPayload();edit(p);unchanged(s,()=>s.authorityPilot.release(p),/complete roster|ammo conservation|altered return|combat scalar/);
  }
  unchanged(s,()=>s.authorityPilot.release(undefined,()=>{throw Error('return preflight failed');}),/preflight failed/);
});
test('stale fencing token and double release reject, including after reacquisition',()=>{
  const s=near(fixture()),p=s.authorityPilot.returnPayload();s.authorityPilot.release(p);
  unchanged(s,()=>s.authorityPilot.release(p),/stale return/);s.authorityPilot.acquire();assert.notEqual(s.authorityPilot.token,p.token);
  unchanged(s,()=>s.authorityPilot.release(p),/stale return/);
});
test('player rifle produces two actual deaths, 5→7 dead on exact return, with persistent IDs',()=>{
  const s=near(fixture({dead:5}));assert.equal(s.authorityPilot.diagnostics().counts.dead,5);
  // The player stands at a genuine clear west-bank ray, with normal rifle dispersion and collision.
  for(const id of PILOT_IDS.slice(0,2)){
    const a=s.actor(id);for(let i=0;i<12&&a.alive;i++){
      const origin=eyePosition(s.player);
      s.player.angle=Math.atan2(a.z-origin.z,a.x-origin.x);s.player.pitch=Math.atan2(a.y+1.55-origin.y,Math.hypot(a.x-origin.x,a.z-origin.z));s.player.aiming=true;
      s.fire();for(let k=0;k<24;k++)s.tick(.05);
      if(!s.weapon.mag){s.weapon.reload(s.clock*1000);for(let k=0;k<90;k++)s.tick(.05);}
    }
    assert.equal(a.alive,false,`${id}: collision-checked player fire must kill`);
  }
  assert.equal(s.authorityPilot.diagnostics().counts.dead,7);const bodies=PILOT_IDS.slice(0,2).map(id=>copy(s.actor(id)));
  far(s);assert.equal(s.authorityPilot.diagnostics().counts.dead,7);
  for(let i=0;i<100;i++)s.tick(.05);near(s);assert.equal(s.authorityPilot.diagnostics().counts.dead,7);
  bodies.forEach(a=>{const b=s.actor(a.id);assert.equal(b.alive,false);assert.deepEqual([b.x,b.y,b.z],[a.x,a.y,a.z]);});
});
test('reserve 100→73 through individual reload/fire; loaded is not double-counted and return never refills',()=>{
  const s=fixture({empty:true});s.authorityPilot.acquire();
  const id=PILOT_IDS[0],a=s.actor(id),aim={x:a.x-2,y:a.y+1.55,z:a.z};
  // Exact single-round reload commands on the real five-round NPC representation.
  for(let i=0;i<27;i++){
    pilotOperation(s,`reload:${i}`,[{type:'reload',memberId:id,amount:1}]);
    pilotOperation(s,`fire:${i}`,[{type:'fire',memberId:id,aim}]);
    // Hold the lease and suppress autonomous firing during this explicit ammo fixture.
    s.clock+=1.1;s.authorityPilot.advance(s.clock,s.battleClock,{distance:149,step:c=>{
      updatePilotWeapon(c.individual,c.individual.members[0],c.localClock);c.individual.updatedAt=c.localClock;return [];
    }});
  }
  assert.equal(s.authorityPilot.diagnostics().reserve,73);assert.equal(s.actor(id).rounds,0);assert.equal(s.authorityPilot.diagnostics().spent,27);
  s.authorityPilot.release();assert.equal(s.authorityPilot.diagnostics().reserve,73);s.authorityPilot.acquire();assert.equal(s.actor(id).rounds,0);
});
test('whole sector resolver and shared aggregate RNG are frozen under individual ownership',()=>{
  const s=near(fixture()),before=state(s).aggregate,rng=state(s).sectorRng;
  for(let i=0;i<100;i++)s.tick(.05);
  assert.deepEqual(state(s).aggregate,before);assert.deepEqual(state(s).sectorRng,rng);
  assert.throws(()=>resolvePilotSector(state(s),s.world,s.player),/sector locked/);
  assert.ok(state(s).individual.members.some(m=>m.rng.draws>0));
});
test('failed command after a staged RNG draw rolls back; duplicate event consumes no RNG',()=>{
  const s=near(fixture());const cmd={eventId:'one',owner:'INDIVIDUAL',token:s.authorityPilot.token,operations:[{type:'damage',memberId:PILOT_IDS[0],amount:5}]};
  pilotOperation(s,cmd.eventId,cmd.operations);const before=state(s);const result=pilotOperation(s,cmd.eventId,cmd.operations);assert.equal(result.applied,false);assert.deepEqual(state(s),before);
  unchanged(s,()=>s.authorityPilot.operate({...cmd,eventId:'bad'},c=>{c.individual.members[0].rng.draws++;throw Error('failed after draw');}),/failed after draw/);
  unchanged(s,()=>pilotOperation(s,'wrong',cmd.operations,{owner:'AGGREGATED',token:null}),/wrong\/stale owner/);
});
test('return resets local motion/cadence boundary and never catches up a long lease',()=>{
  const s=near(fixture());for(let i=0;i<200;i++)s.tick(.05);
  const before=s.authorityPilot.returnPayload();s.authorityPilot.release();const after=state(s);
  assert.equal(after.aggregate.updatedAt,s.clock);assert.equal(after.aggregate.nextAggregateAt,s.clock+2);
  assert.equal(after.aggregate.reserve,before.combat.reserve);assert.deepEqual(after.aggregate.members,before.combat.members);
});
test('hysteresis 149/151/148/152 acquires exactly once and only leaves above 170',()=>{
  const s=fixture();for(const distance of [149,151,148,152]){s.clock+=.05;s.authorityPilot.advance(s.clock,s.battleClock,{distance});}
  assert.equal(state(s).serial,1);assert.equal(s.authorityPilot.owner,'INDIVIDUAL');
  s.clock+=.05;s.authorityPilot.advance(s.clock,s.battleClock,{distance:170});assert.equal(state(s).serial,1);
  s.clock+=.05;s.authorityPilot.advance(s.clock,s.battleClock,{distance:170.01});assert.equal(s.authorityPilot.owner,'AGGREGATED');
  assert.equal(physicalBand(151,'NEAR'),'NEAR');
});
test('pause advances no clock/RNG/band and performs no hidden transfer',()=>{
  const s=fixture(),before=s.snapshot();s.tick(0,{fire:true,forward:1});assert.deepEqual(s.snapshot(),before);
  s.authorityPilot.advance(500,20000,{distance:149,paused:true});assert.deepEqual(s.snapshot(),before);
  near(s);const leased=s.snapshot();s.tick(0,{lookX:500});s.authorityPilot.advance(900,21000,{distance:1000,paused:true});assert.deepEqual(s.snapshot(),leased);
});
test('camera and render quality inputs do not change the authority future',()=>{
  const a=near(fixture()),b=new M01Simulation(1);b.restoreSnapshot(a.snapshot());
  for(let i=0;i<120;i++){a.tick(.05,{lookX:i%2?300:-300,quality:['LOW','MEDIUM','HIGH'][i%3]});b.tick(.05);assert.deepEqual(state(a),state(b));}
});
test('active-lease save/new simulation/restore/double restore keeps one owner and exact streams',()=>{
  const s=near(fixture()),raw=s.snapshot(),b=new M01Simulation(9);b.restoreSnapshot(raw);const once=b.snapshot();b.restoreSnapshot(b.snapshot());
  assert.deepEqual(b.snapshot(),once);assert.deepEqual(b.snapshot(),raw);assert.equal(b.authorityPilot.assertOwner(),'INDIVIDUAL');assert.deepEqual(b.drainEvents(),[]);
});
test('continuation retains old checkpoint; restart removes current lease and reacquires once',()=>{
  const s=fixture();s.checkpoint=s.snapshot(false);const cp=copy(s.checkpoint);near(s);const b=new M01Simulation(1);b.restoreSnapshot(s.snapshot());
  assert.deepEqual(b.checkpoint,cp);b.restoreCheckpoint();assert.equal(b.authorityPilot.assertOwner(),'AGGREGATED');assert.equal(state(b).serial,0);near(b);assert.equal(state(b).serial,1);
});
test('legacy schema 2 without pilot field loads additively and preserves existing deaths/RNG',()=>{
  const s=fixture(),raw=s.snapshot(false);delete raw.authorityPilot;const a=raw.actors.find(a=>a.id===PILOT_IDS[0]);Object.assign(a,{alive:false,health:0,state:'DOWN'});
  const b=new M01Simulation(1);b.restoreSnapshot(raw);assert.equal(b.rng.state,raw.rng);assert.equal(b.actor(a.id).alive,false);assert.equal(b.authorityPilot.owner,'AGGREGATED');
  assert.equal(b.snapshot().schema,2);assert.equal(b.authorityPilot.diagnostics().counts.dead,1);
});
test('corrupt pilot state rejects atomically and destination future remains unchanged',()=>{
  const source=near(fixture()),dest=fixture();for(const edit of [
    p=>p.version++,p=>p.owner='BOTH',p=>p.sectorRng.state=-1,p=>p.individual.members.pop(),p=>p.individual.reserve++,
    p=>p.lease.generation++,p=>p.lease.sourceRevision++,p=>p.lease.memberIds.reverse(),p=>p.individual.members[0].rng.state=0,p=>p.aggregate.members[0].position.x++,
    p=>p.individual.members[0].health=101,p=>p.individual.members[0].weaponId='other',p=>p.individual.extra=true]){
    const raw=source.snapshot();edit(raw.authorityPilot);const before=dest.snapshot();assert.throws(()=>dest.restoreSnapshot(raw),/authority pilot/);assert.deepEqual(dest.snapshot(),before);
  }
  compareContinuation(dest,{label:'corrupt restore destination future',ticks:100});
});
test('PR37 methodology compares future ticks after active lease, reload/fire, release and reacquire',()=>{
  const s=near(fixture());const report=compareContinuation(s,{label:'pilot active lease future',ticks:1200,doubleAt:[100,700],input:i=>({lookX:i%13===0?3:0,fire:i%61===0,reload:i%271===0}),
    fault:(i,a)=>{if(i===400)Object.assign(a.player,{x:-150,y:-3,z:-50});if(i===800)Object.assign(a.player,{x:-66,y:-3,z:80});}});
  assert.equal(report.firstDivergence,null);assert.equal(report.ticks,1200);
});
