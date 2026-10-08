import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import golden from './fixtures/m01-anim-gameplay-baseline.json' with {type:'json'};
import {M01Simulation,validateM01Snapshot} from '../src/game/m01-simulation.js';
import {PRESENTATION_FIELDS} from '../src/game/m01-animation-presentation.js';
import {actorHitboxes,eyePosition,mg34ProneGeometry} from '../src/world/spatial.js';
import {route,driver,toStationEvacuation} from './helpers/m01-route.js';
import {compareContinuation,json} from './helpers/m01-determinism.js';
import {gameplaySnapshot,gameplayFrame,GameplayDigest} from './helpers/m01-animation-contract.js';

const report={task:'M01-ANIM-CONTRACT-SIM-V1',cases:[]};
after(()=>{if(process.env.M01_ANIM_CONTRACT_REPORT)writeFileSync(process.env.M01_ANIM_CONTRACT_REPORT,JSON.stringify(report,null,2)+'\n');});
const record=(s,options)=>report.cases.push(compareContinuation(s,options));
let completed;
const wrap=n=>Math.atan2(Math.sin(n),Math.cos(n));
const active=()=>{const s=new M01Simulation(17);s.tick(.05,{skip:true});return s;};

test('schema 2 initializes all 89 IDs; diagnostics are detached, small presentation records',()=>{
  const s=new M01Simulation(),ids=s.actors.map(a=>a.id),diag=s.animationPresentation;
  assert.equal(s.snapshot().schema,2);assert.equal(ids.length,89);assert.deepEqual(diag.actors.map(a=>a.id),ids);
  for(const a of s.actors){assert.deepEqual(a.motion,{speed:0,odometer:0,gait:'idle',gaitSince:0});assert.equal(a.bodyYaw,a.facing);
    assert.equal(a.posture,'stand');assert.equal(a.postureSince,0);assert.equal(a.hitAt,undefined);assert.equal(a.diedAt,undefined);assert.equal(a.suppressedAt,undefined);}
  diag.actors[0].motion.odometer=99;assert.equal(s.actors[0].motion.odometer,0);
  assert.ok(diag.actors.every(a=>!Object.hasOwn(a,'health')&&!Object.hasOwn(a,'target')));
  validateM01Snapshot(s.snapshot());
});

for(const expected of golden.routes)test(`all gameplay bytes hashed each tick against approved base: seed ${expected.seed}, support ${expected.support}`,()=>{
  const trace=new GameplayDigest(),seen=new Set();let maxSpeed=0;
  const result=route(expected.seed,{support:expected.support,onStep:({sim,events})=>{
    trace.add(gameplayFrame(sim,events));
    for(const a of sim.actors){maxSpeed=Math.max(maxSpeed,a.motion.speed);for(const k of ['hitAt','diedAt','suppressedAt'])if(a[k]!==undefined)seen.add(k);}
  }});
  assert.deepEqual(trace.finish(),{ticks:expected.ticks,blocks:expected.blocks});
  assert.equal(result.sim.actors.length,89);assert.equal(result.sim.checkpointsReached.length,4);
  assert.ok(seen.has('hitAt')&&seen.has('diedAt')&&seen.has('suppressedAt'));
  assert.ok(maxSpeed>8,'existing carry attachment displacement is measured, never clamped');
  report.cases.push({label:'gameplay-baseline',seed:expected.seed,support:expected.support,ticks:trace.ticks,blocks:trace.blocks.length,maxSpeed});
  if(!expected.support)completed=result;
});

test('odometer equals accumulated effective XZ displacement, including collision slide; gait is real speed',()=>{
  const s=active(),a=s.actor('marek_zielinski');a.target={x:a.x-24,z:a.z+8};
  let odometer=a.motion.odometer;
  for(let i=0;i<150;i++){
    const before={x:a.x,z:a.z},dt=i%3===0?.013:.05;s.tick(dt);
    const distance=Math.hypot(a.x-before.x,a.z-before.z);odometer+=distance;
    assert.equal(a.motion.speed,distance/dt);assert.equal(a.motion.odometer,odometer);
    assert.equal(a.motion.gait,distance===0?'idle':a.motion.speed<=2.2?'walk':a.motion.speed<=4.4?'run':'sprint');
    assert.ok(a.motion.gaitSince<=s.clock);
  }
  assert.ok(odometer>0);
});

test('blocked ADVANCE publishes idle and zero speed instead of commanded speed',()=>{
  const s=active(),a=s.actor('marek_zielinski');a.target={x:a.x-10,z:a.z};s.world.move=()=>{};
  s.tick(.05);assert.equal(a.state,'ADVANCE');assert.equal(a.motion.speed,0);assert.equal(a.motion.odometer,0);assert.equal(a.motion.gait,'idle');
});

test('direct German spans movement, platoon sprint and crouch walk publish distinct effective gaits',()=>{
  const s=active(),span=s.actor('de_spans_6'),platoon=s.actor('pl_east_0'),crouched=s.actor('marek_zielinski');
  Object.assign(span,{active:true,cooldown:100});platoon.active=true;crouched.crouched=true;crouched.target={x:crouched.x-10,z:crouched.z};
  s.tick(.05);assert.equal(span.motion.gait,'walk');assert.ok(Math.abs(span.motion.speed-1.5)<1e-10);
  assert.equal(platoon.motion.gait,'sprint');assert.ok(Math.abs(platoon.motion.speed-5.5)<1e-10);
  assert.equal(crouched.motion.gait,'crouch_walk');assert.equal(crouched.posture,'crouch');assert.equal(crouched.postureSince,s.clock);
  const at=span.motion.gaitSince;s.tick(.05);assert.equal(span.motion.gaitSince,at);
  span.suppressedUntil=s.clock+5;s.tick(.05);assert.equal(span.motion.gait,'idle');assert.equal(span.motion.gaitSince,s.clock);
});

test('idle bodyYaw follows the shortest arc at 180 degrees/s and preserves combat facing',()=>{
  for(const [from,to] of [[0,Math.PI/2],[0,Math.PI],[0,-Math.PI/2],[3.1,-3.1],[-3.1,3.1]]){
    const a=active(),b=active(),left=a.actor('marek_zielinski'),right=b.actor('marek_zielinski');
    Object.assign(left,{bodyYaw:from,facing:to});Object.assign(right,{bodyYaw:from,facing:to});
    const expected=Math.abs(wrap(to-from))<=Math.PI*.05?to:wrap(from+Math.sign(wrap(to-from))*Math.PI*.05);
    a.tick(.05);b.tick(.05);assert.equal(left.bodyYaw,expected);assert.equal(left.bodyYaw,right.bodyYaw);assert.equal(left.facing,to);
  }
});

test('moving bodyYaw turns at 360 degrees/s; hitboxes and eye geometry still use authoritative facing',()=>{
  const s=active(),a=s.actor('marek_zielinski');a.target={x:a.x-12,z:a.z};s.tick(.05);
  assert.ok(a.motion.speed>0);assert.equal(a.facing,Math.PI);assert.equal(a.bodyYaw,Math.PI*2*.05);
  const plain=json(a);for(const k of PRESENTATION_FIELDS)delete plain[k];
  assert.deepEqual(actorHitboxes(a),actorHitboxes(plain));assert.deepEqual(eyePosition(a),eyePosition(plain));
});

test('pause/invalid dt does not touch timestamps, motion, yaw, RNG, checkpoint or events',()=>{
  const s=active();s.actor('marek_zielinski').target={x:-160,z:24};s.tick(.05);s.drainEvents();
  const before=s.snapshot();for(const dt of [0,-1,NaN,Infinity])s.tick(dt,{forward:1,fire:true,grenade:true,crouch:true,lookX:500});
  assert.deepEqual(s.snapshot(),before);assert.deepEqual(s.drainEvents(),[]);
});

test('real script wounds and demolition deaths have stable timestamps; unseen reserve losses have unknown history',()=>{
  const s=active();s.clock=10;s.consume('evt_m01_wounded_dragged');
  const patient=s.actor('generic_rifleman');assert.equal(patient.hitAt,10);assert.equal(patient.hitYaw,undefined);
  s.consume('evt_m01_east_platoon_withdraws');assert.equal(s.actor('pl_east_23').diedAt,undefined);
  s.clock=11;s.consume('evt_m01_east_demolition');
  for(let i=0;i<4;i++){const a=s.actor('de_spans_'+i);assert.equal(a.diedAt,11);assert.equal(a.deathYaw,0);}
  s.clock=12;s.consume('evt_m01_east_demolition');assert.equal(s.actor('de_spans_0').diedAt,11);
});

test('actual grenade damage records only exposed living actors; repeat ticks do not replay impacts',()=>{
  const s=active(),shielded=s.actor('de_east_0'),exposed=s.actor('de_east_1'),inactive=s.actor('de_east_2');
  Object.assign(shielded,{x:707,y:0,z:0,active:true});Object.assign(exposed,{x:696,y:0,z:0,active:true,health:10});
  Object.assign(inactive,{x:700,y:0,z:2});s.world.obstacles.push({id:'test_solid_cover',min:{x:704,y:-1,z:-1},max:{x:705,y:3,z:1},material:'stone'});
  s.grenades.active=[{id:'test_grenade',x:700,y:0,z:0,vx:0,vy:0,vz:0,fuse:.01}];
  s.updateGrenades(.02,false);assert.equal(shielded.hitAt,undefined);assert.equal(inactive.hitAt,undefined);
  assert.equal(exposed.hitAt,s.clock);assert.equal(exposed.diedAt,s.clock);assert.equal(exposed.hitYaw,0);
  const at=exposed.hitAt;s.tick(.05);assert.equal(exposed.hitAt,at);assert.equal(exposed.diedAt,at);
});

test('player rifle hit/death and real near-miss suppression stamp only the existing combat outcomes',()=>{
  const s=active(),a=s.actor('de_east_14');s.clock=5;
  Object.assign(a,{x:696,y:0,z:0,active:true});Object.assign(s.player,{x:690,y:0,z:0,angle:0,pitch:Math.atan2(-.5,6),aiming:true});
  s.fire();assert.equal(a.health,0);assert.equal(a.state,'DOWN');assert.equal(a.hitAt,5);assert.equal(a.diedAt,5);assert.equal(a.hitYaw,Math.PI);
  s.clock=7;s.weapon.update(7000);s.fire();assert.equal(a.hitAt,5);assert.equal(a.diedAt,5);
  const near=active(),target=near.actor('de_east_14');near.clock=5;
  Object.assign(target,{x:696,y:0,z:2,active:true});Object.assign(near.player,{x:690,y:0,z:0,angle:0,pitch:0,aiming:true});
  near.fire();assert.equal(target.health,100);assert.equal(target.hitAt,undefined);assert.equal(target.suppressedAt,5);assert.equal(target.suppressedUntil,10);
  near.tick(0);assert.equal(target.suppressedAt,5);
});

test('gait and bodyYaw resume identically at each real CP-A..D, including death recovery',()=>{
  for(const [id,cp] of Object.entries(completed.checkpoints)){
    const s=new M01Simulation();s.restoreSnapshot(cp);assert.deepEqual(s.snapshot(false),cp);
    record(s,{label:id,ticks:180,doubleAt:[1,40,100],dt:t=>t%17===0?0:t%3===0?.013:.05,
      input:t=>({forward:t<30?1:0,lookX:t%15===0?12:0,fire:t===10,reload:t===40}),
      fault:(t,a)=>{if(t===80){a.player.health=0;a.player.alive=false;}}});
  }
});

for(const phase of ['grab','drag','release'])test(`station ${phase} adapter retains exact data and motion after pause/double restore`,()=>{
  const {sim}=toStationEvacuation(driver(29),{phase}),patient=sim.actor('generic_rifleman'),medic=sim.actor('leon_dudek');
  assert.equal(patient.bodyYaw,patient.facing);assert.equal(patient.stationDrag.phase,phase);
  if(phase==='drag'){assert.equal(medic.motion.gait,'drag');assert.equal(patient.motion.gait,'drag');}
  record(sim,{label:'station-'+phase,ticks:120,doubleAt:[1,30,80],dt:t=>t%9===0?0:.05});
});

test('Bąk carry and CKM/MG34 specialized adapters do not lose identity, timestamps or presentation on reload',()=>{
  const s=new M01Simulation();s.restoreSnapshot(completed.checkpoints.cp_m01_d_retirada);
  for(let i=0;i<6000&&!s.actor('jozef_bak').carriedBy;i++)s.tick(.05);
  const bak=s.actor('jozef_bak');assert.equal(bak.carriedBy,'leon_dudek');assert.equal(bak.motion.gait,'carry');assert.equal(bak.bodyYaw,bak.facing);
  record(s,{label:'bak-carry',ticks:180,doubleAt:[1,50,100]});
  const gun=new M01Simulation(29);gun.scene=null;Object.assign(gun.actor('de_east_0'),{active:true,cooldown:100});
  for(let i=0;i<40;i++)gun.tick(.05);
  const a=gun.actor('de_east_0');assert.equal(a.posture,'prone');assert.equal(a.bodyYaw,a.facing);
  gun.burst(a,{x:100,y:0,z:22},'area',{rounds:7});const raw=json(a);for(const k of PRESENTATION_FIELDS)delete raw[k];
  assert.deepEqual(mg34ProneGeometry(a,gun.clock),mg34ProneGeometry(raw,gun.clock));
  record(gun,{label:'mg34-prone-burst',ticks:100,doubleAt:[1,15,40],dt:()=>.025});
  assert.ok(s.actors.filter(a=>a.ckm).every(a=>a.id.startsWith('ckm_')));
});

test('legacy 86/89 schema-2 saves initialize without inventing events, mutating input or drawing RNG',()=>{
  for(const count of [86,89]){
    const legacy=gameplaySnapshot(completed.checkpoints.cp_m01_b_reorganizacao);
    if(count===86)legacy.actors=legacy.actors.filter(a=>!a.ckm);
    const before=json(legacy),s=new M01Simulation();s.restoreSnapshot(legacy);
    assert.deepEqual(legacy,before);assert.equal(s.rng.state,legacy.rng);assert.equal(s.actors.length,89);
    assert.deepEqual(s.actors.slice(0,86).map(a=>a.id),legacy.actors.slice(0,86).map(a=>a.id));
    for(const a of s.actors){assert.equal(a.motion.odometer,0);assert.equal(a.motion.speed,0);assert.equal(a.bodyYaw,a.facing);
      assert.equal(a.diedAt,undefined);assert.equal(a.hitAt,undefined);assert.equal(a.suppressedAt,undefined);}
    record(s,{label:'legacy-'+count,ticks:160,doubleAt:[1,50,100],input:t=>({fire:t===2,reload:t===50})});
  }
});

test('optional partial migration preserves present fields byte for byte and defaults only missing fields',()=>{
  const raw=json(completed.checkpoints.cp_m01_b_reorganizacao),a=raw.actors[0];
  delete a.posture;delete a.postureSince;const oldMotion=json(a.motion),oldYaw=a.bodyYaw,s=new M01Simulation();
  s.restoreSnapshot(raw);assert.deepEqual(s.actors[0].motion,oldMotion);assert.equal(s.actors[0].bodyYaw,oldYaw);
  assert.equal(s.actors[0].postureSince,Math.max(0,s.clock-1));assert.equal(s.snapshot().schema,2);
});

test('corrupt presentation rejects atomically in current state and nested checkpoint',()=>{
  const source=completed.checkpoints.cp_m01_b_reorganizacao;
  const changes=[a=>a.motion=null,a=>a.motion=[],a=>a.motion.speed=-1,a=>a.motion.speed=null,a=>a.motion.odometer=-.1,
    a=>a.motion.gait='teleport',a=>a.motion.gaitSince=-1,a=>a.motion.gaitSince=source.clock+1,a=>delete a.motion.speed,
    a=>a.motion.unknown=1,a=>a.motion.health=0,a=>a.bodyYaw='0',a=>a.bodyYaw=null,a=>a.posture='flying',
    a=>a.postureSince=-1,a=>a.suppressedAt=source.clock+1,a=>a.hitAt=-1,a=>a.hitYaw=1,
    a=>a.diedAt=source.clock,a=>a.deathYaw=1,a=>a.hitAt=source.clock+1,a=>a.deathYaw=null];
  for(const nested of [false,true])for(const [i,change] of changes.entries()){
    const target=active(),bad=json(source);if(nested)bad.resumeCheckpoint=json(source);
    change((nested?bad.resumeCheckpoint:bad).actors[0]);const before=target.snapshot(),input=json(bad);
    assert.throws(()=>target.restoreSnapshot(bad),/Checkpoint M01 inválido/);
    assert.deepEqual(target.snapshot(),before);assert.deepEqual(bad,input);
    if(i===0)record(target,{label:'atomic-'+nested,ticks:40,input:t=>({forward:t<5?1:0})});
  }
  report.cases.push({label:'corruption',mutations:changes.length*2,atomic:true});
});
