// Ameaça em "Proteja o reparo" e "Cubra a retirada": fogo alemão com origem na margem leste, supressão real e HUD fiel.
// Testes de estado da simulação; a partida no navegador está em docs/verification/m01-runtime/continuous/round3/.
import test from 'node:test';
import assert from 'node:assert/strict';
import definition from '../missions/m01-tczew/mission.json' with { type: 'json' };
import { M01Simulation, seconds } from '../src/game/m01-simulation.js';
import { driver, toRepair } from './helpers/m01-route.js';
import { coverRoute } from './helpers/m01-cover.js';

const runs={};
const cover=mode=>runs[mode]??=coverRoute(19390901,mode);
const gateShooter=id=>/^de_east_(\d|1[0-3])$/.test(id);

test('German fire starts on the east bank; only shooters in sight of the west bank (the Lisewo gates) aim at it',()=>{
  const d=toRepair(driver()),{sim}=d,seen=new Set(),origins=[];
  for(let i=0;i<20*150;i++){
    d.step({});
    for(const r of sim.enemyFire.rounds){
      origins.push(r.ox);
      if(['repair','player','squad','area'].includes(r.kind))seen.add(r.by);
    }
  }
  assert.ok(origins.length>100);assert.ok(Math.min(...origins)>=1050,'no round from the west bank or the spans before 06:05');
  assert.ok(seen.has('de_east_0'),'the gate MG fires on the repair');
  for(const id of seen)assert.ok(gateShooter(id),`${id} is hidden behind the trusses and must not fire on the west bank`);
  const mg=definition.groups.find(g=>g.id==='grp_de_east').firePositions.find(f=>f.actor==='de_east_0').position;
  assert.deepEqual([sim.actor('de_east_0').x,sim.actor('de_east_0').y,sim.actor('de_east_0').z],mg);
});

test('rounds that pass within 3 m pin the sappers and stop the repair; the HUD line is exactly the simulation state',()=>{
  const d=toRepair(driver()),{sim}=d;
  d.until(()=>sim.battleClock>=seconds('04:45:30'),120);
  let pinnedTicks=0,workingTicks=0;
  for(let i=0;i<20*90&&sim.active('cover_repair');i++){
    const before=sim.objectives.obj_m01_cover_repair.progress;d.step({});
    const pinned=sim.clock<sim.timers.repairSuppressedUntil,progress=sim.objectives.obj_m01_cover_repair.progress;
    if(!sim.active('cover_repair'))break;
    assert.equal(sim.mission.status.includes('sapadores deitados'),pinned,sim.mission.status);
    assert.ok(sim.mission.status.startsWith(`Reparo ${Math.floor(progress)}%`),sim.mission.status);
    if(pinned){pinnedTicks++;assert.equal(progress,before,'no work while pinned');
      assert.ok(sim.actors.filter(a=>a.role==='ENGINEER').every(a=>a.suppressedUntil>=sim.timers.repairSuppressedUntil),'the whole crew takes cover');}
    else workingTicks++;
  }
  assert.ok(pinnedTicks>20&&workingTicks>20,`pinned ${pinnedTicks} working ${workingTicks}`);
  assert.ok(sim.timers.repairPins>0);assert.ok(sim.dialogueConsumed.includes('dlg_m01_022'),'Krawiec asks for room at the first real suppression');
  assert.ok(sim.dialogueConsumed.includes('dlg_m01_026'),'Zieliński points Kowal at the flashes');
});

test('keeping the gate MG down shortens the repair; ignoring it lets the sappers be pinned again and again',()=>{
  const help=cover('help').stats,ignore=cover('ignore').stats;
  assert.ok(help.repairMgSuppressedPct>=80&&ignore.repairMgSuppressedPct<=20,JSON.stringify([help.repairMgSuppressedPct,ignore.repairMgSuppressedPct]));
  assert.ok(help.repair.realSeconds<ignore.repair.realSeconds-15,JSON.stringify([help.repair,ignore.repair]));
  assert.ok(help.repair.pins+10<ignore.repair.pins,JSON.stringify([help.repair.pins,ignore.repair.pins]));
  for(const s of [help,ignore]){
    assert.ok(seconds(s.repair.end)<seconds('05:30:00'),'repair completes before the order');
    assert.equal(s.times.order_demolish,'05:30:00');
  }
});

test('covering fire on the Germans on the spans saves men; without it the platoon falls to the predicted minimum',()=>{
  const help=cover('help'),ignore=cover('ignore');
  assert.equal(ignore.stats.survivors,12);assert.ok(help.stats.survivors>=14,`help kept ${help.stats.survivors}`);
  for(const {sim,stats}of [help,ignore]){
    const n=sim.flags['m01.east_platoon_survivors'];
    assert.equal(stats.lethalRounds,18-n,'every casualty is a real round that landed');
    for(let i=0;i<24;i++){const a=sim.actor(`pl_east_${i}`);assert.equal(a.alive,i<n,a.id);assert.equal(a.active,i<18||a.alive,a.id);}
    const times=stats.casualties.map(seconds);
    assert.ok(times.every(t=>t>=seconds('06:05:20')),'the 20 s count starts when the Germans reach the spans');
    for(let i=1;i<times.length;i++)assert.ok(times[i]-times[i-1]>=19.9,'one casualty per 20 s of battle clock');
    assert.ok(n>=12&&n<=18);
  }
  assert.ok(ignore.sim.enemies.filter(a=>a.group==='grp_de_spans').every(a=>a.suppressedUntil===0),'Kowal never covers the withdrawal for the player');
});

test('historical times, checkpoints and demolition safety are unchanged in both routes',()=>{
  for(const mode of ['help','ignore']){
    const {sim,stats}=cover(mode);
    assert.deepEqual(stats.checkpoints,['cp_m01_a_orientacao','cp_m01_b_reorganizacao','cp_m01_c_engenheiros','cp_m01_d_retirada']);
    assert.equal(stats.times.east_platoon_withdraws,'06:00:00');assert.equal(stats.times.germans_on_east_spans,'06:05:00');
    assert.ok(stats.times.east_demolition>='06:10:00'&&stats.times.east_demolition<'06:11:00',stats.times.east_demolition);
    assert.ok(stats.times.west_demolition>='06:45:00'&&stats.times.west_demolition<'06:46:00',stats.times.west_demolition);
    assert.equal(sim.mission.complete,true);assert.ok(sim.player.health>0);
    assert.ok(sim.actors.filter(a=>a.group==='grp_east_platoon'&&a.alive).every(a=>a.x<660),'no survivor east of the blown spans');
  }
});

test('rounds in flight survive save and restore and play out identically; corrupt rounds are rejected',()=>{
  const d=toRepair(driver()),{sim}=d;
  d.until(()=>sim.battleClock>=seconds('04:46:00')&&sim.enemyFire.rounds.some(r=>r.kind==='repair'),120);
  const saved=sim.snapshot(),copy=new M01Simulation();copy.restoreSnapshot(saved);assert.deepEqual(copy.snapshot(),saved);
  for(let i=0;i<100;i++){sim.tick(.05);copy.tick(.05);}
  assert.deepEqual(copy.snapshot(),sim.snapshot());
  for(const corrupt of [s=>{s.enemyFire.rounds[0].ox=-120;},s=>{s.enemyFire.rounds[0].victim='jozef_bak';},s=>{s.enemyFire.rounds[0].by='marek_zielinski';},
    s=>{s.enemyFire.rounds=null;},s=>{s.enemyFire.rounds[0].arriveAt=Infinity;},s=>{s.timers.fireEase='yes';}]){
    const data=structuredClone(saved);corrupt(data);assert.equal(copy.loadCheckpoint(JSON.stringify(data)).ok,false);
  }
  const old=structuredClone(saved);delete old.enemyFire;assert.equal(copy.loadCheckpoint(JSON.stringify(old)).ok,true);assert.deepEqual(copy.enemyFire,{rounds:[],nextId:0});
});

test('after 120 s of continuous suppression the fire on the repair eases without warning until work resumes',()=>{
  const d=toRepair(driver()),{sim}=d;d.until(()=>sim.battleClock>=seconds('04:46:00'),120);
  // Fixture: a stall longer than any real one, to exercise the documented tolerance.
  sim.timers.repairSuppressedUntil=sim.clock+1e4;const progress=sim.objectives.obj_m01_cover_repair.progress;
  for(let i=0;i<20*119;i++)sim.tick(.05);assert.equal(sim.objectives.obj_m01_cover_repair.progress,progress);
  for(let i=0;i<20*3;i++)sim.tick(.05);
  assert.ok(sim.objectives.obj_m01_cover_repair.progress>progress,'work resumed');
  assert.equal(sim.drainEvents().filter(e=>e.type==='message'&&/cad[eê]ncia|toler/i.test(e.message)).length,0,'no announcement');
});

test('the withdrawal HUD line reports the real count by ID and whether the Germans on the spans are suppressed',()=>{
  const d=toRepair(driver()),{sim,walk,until}=d;
  walk(-115,27);walk(-28,28);until(()=>sim.active('hold_access'),500);
  walk(-115,32);walk(-10,32);walk(-10,40);walk(30,40);
  until(()=>sim.consumedEvent('evt_m01_east_platoon_withdraws'),500);d.step({});
  assert.equal(sim.mission.status,'Pelotão leste: 18 homens a atravessar o tabuleiro');
  until(()=>sim.flags['m01.east_platoon_survivors']<18,200);
  const n=sim.flags['m01.east_platoon_survivors'];
  assert.equal(sim.mission.status,`Pelotão leste: ${n} homens · alemães no tabuleiro a disparar sobre eles`);
  assert.equal(sim.withdrawingPlatoon().length,n);
  // Fixture: one German on the spans is down (as after a shot of the player within 3 m).
  sim.enemies.find(a=>a.group==='grp_de_spans'&&a.alive&&a.active).suppressedUntil=sim.clock+5;sim.updateObjectives(0,false);
  assert.equal(sim.mission.status,`Pelotão leste: ${n} homens · alemães no tabuleiro suprimidos`);
});
