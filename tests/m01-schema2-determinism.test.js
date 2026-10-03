import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {M01Simulation,validateM01Snapshot} from '../src/game/m01-simulation.js';
import {route,driver,toStationEvacuation} from './helpers/m01-route.js';
import {compareContinuation,equalFuture,firstDifference,restore,json} from './helpers/m01-determinism.js';

const report={task:'M01-SCHEMA2-CROSS-SYSTEM-DETERMINISM-AUDIT-V1',schema:2,cases:[]};
after(()=>{if(process.env.M01_DETERMINISM_REPORT)writeFileSync(process.env.M01_DETERMINISM_REPORT,JSON.stringify(report,null,2)+'\n');});
const record=(a,options)=>report.cases.push(compareContinuation(a,options));
const E=name=>'evt_m01_'+name;
const STEP=.05;
let completedRoute;

test('first divergence diagnostic detects exact tick, field, missing key and event changes',()=>{
  assert.deepEqual(firstDifference({rng:1},{rng:2}),{path:'$.rng',a:1,b:2});
  assert.equal(firstDifference({clock:1},{clock:1+Number.EPSILON}).path,'$.clock');
  assert.equal(firstDifference({a:undefined},{}).missing,true);
  const a=new M01Simulation(),b=restore(a);b.tick(.01);
  assert.throws(()=>equalFuture(a,b,[],[],{label:'canary',tick:17,dt:.01,controls:{}}),/"firstDivergenceTick":17.*"path":"\$\.state\.clock"/);
  b.restoreSnapshot(a.snapshot());assert.throws(()=>equalFuture(a,b,[],[{type:'extra'}],{label:'canary',tick:9}),/events/);
});

for(const [seed,support] of [[19390901,false],[7,true]])test(`full route A/B with CP-A..D, events, RNG and long continuation: seed ${seed}, support ${support}`,()=>{
  const initial=new M01Simulation(seed);initial.drainEvents();const long=restore(initial),windows=[],seen=new Set(),summaries=[];
  let tick=0,eventCount=0;
  const fork=(label,s)=>{
    if(seen.has(label))return;seen.add(label);const b=restore(s);
    equalFuture(s,b,[],[],{label,tick:0,dt:0,controls:{}});
    const summary={label,startTick:tick,clock:s.clock,battleClock:s.battleClock,rng:s.rng.state,ticks:0,doubleLoads:0,firstDivergence:null};
    windows.push({b,summary});summaries.push(summary);
  };
  const result=route(seed,{support,onStep:({sim,controls,events,dt})=>{
    tick++;eventCount+=events.length;long.tick(dt,json(controls));
    equalFuture(sim,long,events,long.drainEvents(),{label:'long-route',tick,dt,controls});
    for(const w of windows){
      w.b.tick(dt,json(controls));w.summary.ticks++;
      equalFuture(sim,w.b,events,w.b.drainEvents(),{label:w.summary.label,tick:w.summary.ticks,dt,controls});
      if(w.summary.ticks===100){w.b=restore(restore(w.b));w.summary.doubleLoads++;
        equalFuture(sim,w.b,[],[],{label:w.summary.label,tick:100,dt:0,controls:{}});}
    }
    for(let i=windows.length-1;i>=0;i--)if(windows[i].summary.ticks>=200)windows.splice(i,1);
    for(const e of events)if(e.type==='checkpoint')fork(e.id,sim);
    const patient=sim.actor('generic_rifleman'),gun=sim.actor('de_east_0'),bak=sim.actor('jozef_bak');
    if(patient.stationDrag)fork('station-'+patient.stationDrag.phase,sim);
    if(gun.mg34Prone){
      fork('mg34-'+gun.mg34Prone.phase,sim);
      if(gun.mg34Prone.phase==='fire_burst'&&gun.mg34Prone.burst.rounds===7&&[1,4,6].includes(gun.mg34Prone.burst.emitted))
        fork('mg34-seven-after-'+gun.mg34Prone.burst.emitted,sim);
    }
    if(sim.enemyFire.rounds.length)fork('rounds-in-flight',sim);
    if(sim.enemyFire.rounds.some(r=>r.victim))fork('casualty-round-in-flight',sim);
    if(events.some(e=>e.type==='round-impact'&&e.victim))fork('casualty-impact',sim);
    if(sim.gate)fork('gate-'+sim.gate.id,sim);
    if(sim.flags['m01.bak_status']==='wounded')fork('bak-wounded',sim);
    if(bak.carriedBy)fork('bak-carried-by-dudek',sim);
    if(sim.consumedEvent(E('east_demolition')))fork('east-demolition',sim);
    if(sim.consumedEvent(E('west_demolition')))fork('west-demolition',sim);
    if(sim.mission.phase==='OUTRO')fork('outro',sim);
  }});
  assert.ok(result.sim.mission.complete);assert.equal(result.sim.snapshot().schema,2);
  for(const name of ['cp_m01_a_orientacao','cp_m01_b_reorganizacao','cp_m01_c_engenheiros','cp_m01_d_retirada',
    'station-grab','station-drag','station-release','mg34-enter','mg34-idle',
    'rounds-in-flight','bak-wounded','bak-carried-by-dudek','east-demolition','west-demolition','outro'])assert.ok(seen.has(name),name);
  assert.ok(tick>10000,'long continuation must actually span the whole mission');
  report.cases.push({label:'full-route',seed,support,ticks:tick,events:eventCount,windows:summaries,firstDivergence:null});
  if(!support){completedRoute=result;assert.ok(seen.has('casualty-impact'));assert.ok(seen.has('mg34-fire_burst'));}
});

for(const emitted of [1,4,6])test(`MG34 seven-shot burst after ${emitted}, actual tick pipeline plus grenade, rifle RNG and double load`,()=>{
  const s=new M01Simulation(17);s.scene=null;
  const gun=s.actor('de_east_0');gun.active=true;gun.cooldown=99;
  for(let i=0;i<40;i++)s.tick(STEP);assert.equal(gun.mg34Prone.phase,'idle');
  const target={x:100,y:0,z:22};s.burst(gun,target,'area',{rounds:7,bias:[1.2,.8],cone:[.7,.5],tracer:true});
  for(let i=0;i<(emitted-1)*15;i++)s.tick(.005);
  assert.equal(gun.mg34Prone.burst.emitted,emitted);assert.equal(s.enemyFire.rounds.length,emitted);
  validateM01Snapshot(s.snapshot());
  record(s,{label:'mg34-after-'+emitted,ticks:200,dt:()=>.025,doubleAt:[3,19,99],
    input:t=>({lookY:t===1?-200:0,fire:t===2||t===80,grenade:t===4,reload:t===50})});
  assert.equal(s.grenades.active.length,0);assert.ok(s.weapon.shotCount>=1);assert.ok(s.enemyFire.nextId>=7);
});

for(const phase of ['grab','drag','release'])test(`station ${phase}: variable timestep, zero-dt pause, double save/load`,()=>{
  const {sim}=toStationEvacuation(driver(29),{phase});
  record(sim,{label:'station-'+phase,ticks:300,doubleAt:[1,50,200],dt:t=>t%31===0?0:t%3===0?.013:.05,
    input:t=>({lookX:t%10===0?4:0,aim:t%7===0})});
});

test('grenade bounce/fuse, rifle bolt and partial reload continue with exact RNG and events',()=>{
  const s=new M01Simulation(99);s.tick(STEP,{skip:true});s.tick(STEP,{fire:true,grenade:true,lookY:-150});
  for(let i=0;i<25;i++)s.tick(STEP);s.tick(STEP,{reload:true});
  assert.ok(s.grenades.active.length===1);assert.equal(s.weapon.state,'RELOAD_SINGLE');
  record(s,{label:'grenade-and-reload',ticks:240,doubleAt:[1,20,40,130],input:t=>({fire:t===15||t===100,reload:t===90})});
  assert.equal(s.grenades.active.length,0);assert.ok(s.sectors.damage.some(d=>d.id==='m01_grenade_0'));
});

test('Bąk player carry/late delivery followed by Dudek evacuation and both demolitions',()=>{
  assert.ok(completedRoute);const d=driver(19390901);d.sim.restoreSnapshot(completedRoute.checkpoints.cp_m01_d_retirada);
  const s=d.sim,bak=s.actor('jozef_bak');
  // Adversarial transport fixture: only player placement, then real interaction and simulation-owned evacuation.
  Object.assign(s.player,{x:bak.x,y:bak.y,z:bak.z});d.step({interact:true});assert.equal(s.player.carrying,'jozef_bak');
  record(s,{label:'bak-player-carry',ticks:200,doubleAt:[10,70]});
  Object.assign(s.player,s.world.point('aid_position'));d.step({interact:true});
  assert.equal(s.flags['m01.bak_status'],'rescued_by_player');
  Object.assign(s.player,{x:-292,y:-3,z:26});
  record(s,{label:'bak-late-delivery',ticks:8000,doubleAt:[50,1000,4000]});
  assert.ok(s.consumedEvent(E('west_demolition')));assert.ok(bak.alive);
});

test('legacy 86/89 actors, missing optional fields and old CKM placement migrate once then have identical futures',()=>{
  for(const roster of [86,89]){
    const legacy=new M01Simulation(123).snapshot(false);
    if(roster===86)legacy.actors=legacy.actors.filter(a=>!a.ckm);
    else legacy.actors.filter(a=>a.ckm).forEach((a,i)=>{a.x=[21.206,22.08,20.4][i];});
    delete legacy.enemyFire;delete legacy.weapon.received;
    for(const key of ['kowalRounds','lowAmmoHint','nextCombatCall'])delete legacy.timers[key];
    const before=json(legacy),a=new M01Simulation();a.restoreSnapshot(legacy);
    assert.deepEqual(legacy,before);assert.equal(a.rng.state,123);assert.equal(a.actors.length,89);
    record(a,{label:'legacy-'+roster,ticks:200,doubleAt:[1,50,150],input:t=>({skip:t===1,fire:t===30,reload:t===70})});
  }
});

test('corrupt cross-system states reject atomically and leave the destination future unchanged',()=>{
  const d=toStationEvacuation(driver(21),{phase:'grab'}),valid=d.sim.snapshot();
  const changes=[s=>s.rng=1.25,s=>s.actors.pop(),s=>s.grenades.active=[{id:'bad',fuse:1}],
    s=>s.actors.find(a=>a.id==='generic_rifleman').stationDrag.startedAt=s.clock+1,
    s=>s.sectors.damage.push({id:'bad'}),s=>s.pendingCheckpoint='bad',s=>s.weapon.mag=9,
    s=>s.resumeCheckpoint.clock=s.clock+1,s=>s.resumeCheckpoint.rng=1.25,
    s=>s.resumeCheckpoint.resumeCheckpoint=json(s.resumeCheckpoint),s=>s.resumeCheckpoint.player.health=0];
  for(const [i,change] of changes.entries()){
    const bad=json(valid);change(bad);const raw=json(bad),target=new M01Simulation(44),before=target.snapshot();
    assert.throws(()=>target.restoreSnapshot(bad));assert.deepEqual(bad,raw);assert.deepEqual(target.snapshot(),before);
    record(target,{label:'corrupt-rejection-'+i,ticks:30,input:t=>({skip:t===1,fire:t===2})});
  }
});

test('corrupt weapon method/profile, unsigned RNG and unknown phase reject before changing future gameplay',()=>{
  const changes=[s=>s.weapon.update=7,s=>s.weapon.shoot=7,s=>s.weapon.profile={},s=>s.rng=-1,s=>s.rng=2**32,
    s=>s.mission.phase='broken'];
  for(const [i,change] of changes.entries()){
    const target=new M01Simulation(57),before=target.snapshot(),bad=json(before);change(bad);const raw=json(bad);
    assert.throws(()=>target.restoreSnapshot(bad));assert.deepEqual(target.snapshot(),before);assert.deepEqual(bad,raw);
    record(target,{label:'weapon-rng-phase-rejection-'+i,ticks:60,input:t=>({skip:t===1,fire:t===2,reload:t===40})});
  }
});

test('OUTRO playback, skip, double load and completed no-op use the same dialogue/event future',()=>{
  const s=new M01Simulation();s.restoreSnapshot(completedRoute.outro);
  record(s,{label:'outro-playback',ticks:1400,doubleAt:[1,200,600]});assert.ok(s.mission.complete);
  const skipped=new M01Simulation();skipped.restoreSnapshot(completedRoute.outro);
  record(skipped,{label:'outro-skip',ticks:100,doubleAt:[1,30],input:t=>({skip:t===11})});assert.ok(skipped.mission.complete);
});

test('save between checkpoints preserves the future respawn destination',()=>{
  const a=new M01Simulation();a.tick(.05,{skip:true});a.drainEvents();
  for(let i=0;i<40;i++){a.tick(.05,{forward:1});a.drainEvents();}
  const saved=a.snapshot(),b=new M01Simulation();b.restoreSnapshot(saved);
  assert.ok(a.clock>a.checkpoint.clock);
  // Same adverse state in both branches, then the real tick performs recovery.
  for(const s of [a,b]){s.player.health=0;s.player.alive=false;}
  a.tick(.05);b.tick(.05);
  assert.deepEqual(b.snapshot(),a.snapshot(),'first divergence: recovery tick 1');
  assert.deepEqual(b.drainEvents(),a.drainEvents());
});
