import test from 'node:test';
import assert from 'node:assert/strict';
import { M01Simulation, seconds, validateM01Snapshot } from '../src/game/m01-simulation.js';
import { Wz29 } from '../src/game/wz29.js';
import { TczewWorld } from '../src/world/tczew-world.js';
import { eyePosition, traceShot, aimDirection } from '../src/world/spatial.js';
import { route } from './helpers/m01-route.js';
import { execFileSync } from 'node:child_process';
import { Game } from '../src/game/game.js';

const E=name=>'evt_m01_'+name;
let completed;
const full=()=>completed??=route();
const run=(sim,seconds,controls={})=>{for(let i=0;i<seconds*20;i++)sim.tick(.05,controls);};

test('the pure collision JSON remains reproducible from the checked GLB translations',()=>{
  assert.match(execFileSync(process.execPath,['tools/assets/m01-bridges/export-colliders.mjs','--check'],{encoding:'utf8'}),/Verified 83/);
});
test('debug diagnostics return copies; editing a returned gate or failure cannot change live state',()=>{
  const game=Object.create(Game.prototype);game.sim=new M01Simulation();game.sim.gate={id:E('west_demolition'),started:0,hold:1};
  const failures=[{path:'test.glb',message:'test failure'}];game.renderer={diagnostics:{assetFailures:failures},m01:{diagnostics:{models:[],assetFailures:failures}}};
  const before=game.sim.snapshot(),d=game.diagnostics;d.m01.gate.started=999;d.m01.objectives.obj_m01_deliver_message.state='done';d.assetFailures.length=0;
  assert.deepEqual(game.sim.snapshot(),before);assert.equal(failures.length,1);
});

test('wz.29 requires a bolt cycle; an empty magazine uses a clip of five, preserving ammunition',()=>{
  const w=new Wz29();
  for(let i=0;i<5;i++){
    const now=i*1200;assert.equal(w.shoot(now),true);assert.equal(w.shoot(now+300),false);
    w.update(now+1050);
  }
  assert.equal(w.mag,0);assert.equal(w.reload(6000),true);assert.equal(w.state,'RELOAD_CLIP');
  w.update(9399);assert.equal(w.mag,0);w.update(9400);assert.equal(w.mag,5);assert.equal(w.reserve,35);
  assert.equal(w.mag+w.reserve+w.shotCount,45);
});
test('wz.29 partial loading commits one round at a time and can be interrupted; in-progress saves resume it',()=>{
  const w=new Wz29();w.shoot(0);w.update(1050);w.shoot(1200);w.update(2250);w.reload(2300);
  assert.equal(w.state,'RELOAD_SINGLE');w.update(3100);assert.equal(w.mag,4);assert.equal(w.reserve,39);
  const restored=new Wz29().restore(structuredClone(w.snapshot()));assert.equal(restored.shoot(3200),true);
  assert.equal(restored.mag,3);assert.equal(restored.reserve,39);assert.equal(restored.state,'BOLT_CYCLE');
  assert.equal(restored.adjustSight(),500);assert.equal(restored.adjustSight(),800);
});
test('M01 complete control route reaches debrief, all required objectives, unique events and all four actual checkpoints',()=>{
  const {sim,checkpoints,events}=full();
  assert.equal(sim.mission.complete,true);assert.equal(sim.flags['m01.completed'],true);assert.equal(sim.battleClock,seconds('07:05'));
  assert.equal(Object.keys(sim.consumed).length,sim.definition.events.length);
  for(const o of sim.definition.objectives.filter(o=>o.required))assert.equal(sim.objectives[o.id].state,'done',o.id);
  assert.deepEqual(Object.keys(checkpoints),sim.definition.checkpoints.map(c=>c.id));
  assert.equal(events.filter(e=>e.type==='complete').length,1);
  assert.ok(sim.enemies.every(a=>a.x>=690));assert.equal(sim.flags['m01.nowicki_status'],'missing');
  const c=checkpoints.cp_m01_c_engenheiros,d=checkpoints.cp_m01_d_retirada;
  assert.ok(c.battleClock>=seconds('05:34'));assert.equal(c.flags['m01.second_raid_state'],'ended');
  assert.ok(d.battleClock>=seconds('06:10'));assert.ok(d.player.x<-20);assert.equal(d.player.carrying,null);
  for(const s of [...Object.values(checkpoints),sim.snapshot()])validateM01Snapshot(s);
});
test('every M01 checkpoint restores exact actors, ammunition, RNG, dialogue, destruction and real clocks after death',()=>{
  for(const [id,saved]of Object.entries(full().checkpoints)){
    const sim=new M01Simulation();sim.restoreSnapshot(saved);assert.deepEqual(sim.snapshot(),saved,id);
    sim.player.health=0;sim.player.alive=false;sim.tick(.05);
    assert.deepEqual(sim.snapshot(),saved,id);assert.equal(sim.drainEvents().filter(e=>e.type==='restored').length,1);
    assert.equal(JSON.stringify(saved).includes('isObject3D'),false);
  }
});
test('damaged bridge pieces and German casualties survive LOD changes and checkpoint restoration',()=>{
  const sim=new M01Simulation();sim.restoreSnapshot(full().checkpoints.cp_m01_d_retirada);
  const casualties=sim.enemies.filter(a=>!a.alive).map(a=>a.id),before=sim.renderState.parts;
  assert.ok(casualties.length>=4);
  sim.player.x=-440;const far=sim.renderState.parts;
  assert.deepEqual(Object.entries(before).filter(([,v])=>!v.visible).map(([k])=>k),Object.entries(far).filter(([,v])=>!v.visible).map(([k])=>k));
  sim.restoreCheckpoint();assert.deepEqual(sim.enemies.filter(a=>!a.alive).map(a=>a.id),casualties);
  assert.ok(sim.world.colliders.every(c=>c.destroyedBy!==E('east_demolition')));
});
test('overdue events use >=; delayed events wait active seconds; pause freezes both clocks and weapon work',()=>{
  const sim=new M01Simulation();sim.tick(.05,{skip:true});sim.drainEvents();
  sim.battleClock=seconds('04:34:05');sim.processEvents();assert.equal(sim.consumedEvent(E('bombing_0434')),true);
  assert.equal(sim.consumedEvent(E('forward_post_bombed')),false);
  run(sim,2.15);assert.equal(sim.consumedEvent(E('forward_post_bombed')),true);assert.equal(sim.consumedEvent(E('nowicki_lost')),false);
  const before=sim.snapshot();sim.tick(0,{fire:true,reload:true,skip:true});assert.deepEqual(sim.snapshot(),before);
  run(sim,3);assert.equal(sim.consumedEvent(E('nowicki_lost')),true);
  const consumed=structuredClone(sim.consumed);sim.processEvents();assert.deepEqual(sim.consumed,consumed);
});
test('a late message never rewinds battle time and every aerial impact stays at least thirty metres away',()=>{
  const sim=new M01Simulation();sim.tick(.05,{skip:true});
  sim.battleClock=seconds('04:33:30');sim.player.x=16;sim.player.z=2;sim.updateObjectives(0,true);
  assert.equal(sim.battleClock,seconds('04:33:30'));
  for(const point of [{...sim.player},{x:sim.player.x+12,y:0,z:sim.player.z}])assert.ok(Math.hypot(sim.safeImpact(point).x-sim.player.x,sim.safeImpact(point).z-sim.player.z)>=30);
  sim.consume(E('bombing_0434'));sim.player.x=18;sim.player.z=3;sim.consume(E('forward_post_bombed'));
  assert.equal(sim.flags['m01.forward_post_state'],'intact_near_miss');
  for(const d of sim.sectors.damage)if(d.id==='forward_post')assert.ok(Math.hypot(d.x-sim.player.x,d.z-sim.player.z)>=30);
});
test('west demolition waits inside the safety zone, then releases once the player and allies have left',()=>{
  const sim=new M01Simulation();sim.restoreSnapshot(full().checkpoints.cp_m01_d_retirada);
  for(const a of sim.allies)if(a.alive&&a.active&&!a.civilian){a.x=-170;a.z=22;}
  sim.player.x=-40;sim.player.z=32;sim.battleClock=seconds('06:44:30');
  run(sim,3);assert.equal(sim.battleClock,seconds('06:44:30'));assert.equal(sim.consumedEvent(E('west_demolition')),false);
  sim.player.x=-120;run(sim,4);assert.equal(sim.consumedEvent(E('west_demolition')),true);assert.ok(sim.player.alive);
});
test('boundary warning precedes failure and its eight second timer resets when the player returns',()=>{
  const sim=new M01Simulation();sim.tick(.05,{skip:true});sim.drainEvents();
  sim.player.x=280;sim.player.z=40;sim.boundaries(.05);assert.ok(sim.drainEvents().some(e=>e.type==='message'));
  sim.player.x=410;for(let i=0;i<150;i++)sim.boundaries(.05);assert.equal(sim.player.alive,true);
  sim.player.x=390;sim.boundaries(.05);assert.equal(sim.timers.boundary,0);
  sim.player.x=410;for(let i=0;i<161;i++)sim.boundaries(.05);assert.equal(sim.player.alive,false);assert.ok(sim.failure);
});
test('metre-space hitboxes, actual cover and bridge joints support shots and continuous travel',()=>{
  const world=new TczewWorld(),actor={id:'target',space:'metres',x:-10,y:-3,z:22,alive:true};
  const shooter={space:'metres',x:-20,y:-3,z:22};assert.equal(eyePosition(shooter).y,-1.36);
  assert.equal(traceShot(world,eyePosition(shooter),aimDirection(0),[actor],20)?.actor,actor);
  const hidden={...actor,x:-20,z:28},behind={...shooter,x:-30,z:28,crouched:true};
  assert.notEqual(traceShot(world,eyePosition(behind),aimDirection(0,-.04),[hidden],30)?.actor,hidden);
  for(let x=10;x<660;x+=.5)assert.equal(world.heightAt(x,40),0,`road joint ${x}`);
  world.refresh([E('west_demolition')]);assert.ok(world.heightAt(50,40)<-1);
});
test('corrupt M01 state is rejected atomically before an active scene, grenade or missing timer can crash the game',()=>{
  const sim=new M01Simulation();sim.restoreSnapshot(full().checkpoints.cp_m01_d_retirada);const before=sim.snapshot();
  for(const corrupt of [s=>delete s.timers.water,s=>s.actors.pop(),s=>s.actors[0].id='hist_janik',s=>s.weapon.mag=15,
    s=>s.scene={id:'unknown',elapsed:0,beats:[]},s=>s.grenades.active=[{id:'bad',fuse:2}],s=>s.sectors.sectors[0].state='unknown']){
    const data=structuredClone(before);corrupt(data);assert.equal(sim.loadCheckpoint(JSON.stringify(data)).ok,false);assert.deepEqual(sim.snapshot(),before);
  }
});
test('outro calls Nowicki twice as distinct beats and consumes completion once, including skip after partial playback',()=>{
  const sim=new M01Simulation();sim.restoreSnapshot(full().sim.snapshot());
  sim.mission.complete=false;sim.flags['m01.completed']=false;delete sim.consumed[E('debrief')];
  sim.sceneDone=sim.sceneDone.filter(id=>id!=='cs_m01_roll_call');sim.dialogueConsumed=sim.dialogueConsumed.filter(t=>!t.startsWith('cs_m01_roll_call:'));
  sim.startScene('cs_m01_roll_call');run(sim,36);
  assert.equal(sim.dialogueConsumed.filter(t=>t.endsWith(':dlg_m01_059')).length,2);
  sim.tick(.05,{skip:true});sim.tick(.05,{skip:true});assert.equal(sim.drainEvents().filter(e=>e.type==='complete').length,1);
  assert.equal(sim.sceneDone.filter(id=>id==='cs_m01_roll_call').length,1);
});
test('optional Bąk rescue cannot be taken away mid-carry; delivery chooses the player continuity branch',()=>{
  const sim=new M01Simulation();sim.restoreSnapshot(full().checkpoints.cp_m01_d_retirada);
  const bak=sim.actor('jozef_bak');assert.equal(sim.active('rescue_bak'),true);
  sim.player.x=bak.x;sim.player.z=bak.z;sim.updateObjectives(0,true);assert.equal(sim.player.carrying,'jozef_bak');
  sim.battleClock=seconds('06:15');sim.processEvents();assert.equal(sim.consumedEvent(E('dudek_retrieves_bak')),false);
  Object.assign(sim.player,sim.world.point('aid_position'));sim.updateObjectives(0,true);
  assert.equal(sim.flags['m01.bak_status'],'rescued_by_player');assert.equal(sim.flags['m01.dudek_status'],'unhurt');assert.equal(sim.player.carrying,null);
});
test('all five sectors keep their schedule and stable casualties for ninety seconds while the player looks away',()=>{
  const saved=structuredClone(full().checkpoints.cp_m01_c_engenheiros);saved.actors.find(a=>a.id==='de_east_0').alive=false;saved.actors.find(a=>a.id==='de_east_0').health=0;
  const front=new M01Simulation(),away=new M01Simulation();front.restoreSnapshot(saved);away.restoreSnapshot(saved);away.player.angle+=Math.PI;
  run(front,90);run(away,90);
  assert.deepEqual(front.sectors,away.sectors);assert.deepEqual(front.consumed,away.consumed);
  assert.equal(away.actor('de_east_0').alive,false);assert.equal(away.sectors.sectors.length,5);
  const resumed=new M01Simulation();resumed.restoreSnapshot(away.snapshot());assert.equal(resumed.actor('de_east_0').alive,false);
});
test('west hold timeout sends the sergeant to escort the player without demolition damage',()=>{
  const sim=new M01Simulation();sim.restoreSnapshot(full().checkpoints.cp_m01_d_retirada);
  sim.player.x=30;sim.player.z=40;sim.battleClock=seconds('06:44:30');run(sim,121);
  assert.equal(sim.consumedEvent(E('west_demolition')),false);assert.equal(sim.timers.escort,true);
  run(sim,160);assert.ok(sim.player.x<-90);assert.equal(sim.consumedEvent(E('west_demolition')),true);assert.ok(sim.player.alive);
});
test('grenade blast starts at its real height; solid cover shields a nearby actor and inactive actors stay unharmed',()=>{
  const sim=new M01Simulation(),shielded=sim.actor('de_east_0'),exposed=sim.actor('de_east_1'),inactive=sim.actor('de_east_2');
  Object.assign(shielded,{x:707,y:0,z:0,active:true});Object.assign(exposed,{x:696,y:0,z:0,active:true});Object.assign(inactive,{x:700,y:0,z:2});
  // Physics fixture on the eastern deck; both live targets are inside the eight metre radius.
  sim.world.obstacles.push({id:'test_solid_cover',min:{x:704,y:-1,z:-1},max:{x:705,y:3,z:1},material:'stone'});
  sim.grenades.active=[{id:'test_grenade',x:700,y:0,z:0,vx:0,vy:0,vz:0,fuse:.01}];
  sim.updateGrenades(.02,false);assert.equal(shielded.health,100);assert.ok(exposed.health<100);assert.equal(inactive.health,100);assert.equal(sim.grenades.active.length,0);
});
