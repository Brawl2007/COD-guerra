// P2 of the owner's playtest (2026-10-18): dead time, clock gates and objective clarity (src/game/m01-pacing.js, mission.json clock.segments[].compress,
// pacing.interludes, continuityCues[].requires). State-level route measurements, not a human playtest.
import test from 'node:test';
import assert from 'node:assert/strict';
import definition from '../missions/m01-tczew/mission.json' with { type: 'json' };
import { M01Simulation, seconds } from '../src/game/m01-simulation.js';
import { pacingDataErrors, HOLD_POSITION, WEST_SAFE_X, CONTINUITY_MIN_GAP_SEC } from '../src/game/m01-pacing.js';
import { markerScreen } from '../src/ui/m01-hud.js';
import { route } from './helpers/m01-route.js';

const E=name=>'evt_m01_'+name;
// One real route, observed tick by tick: when each event fired (battle clock), real time at 06:00, continuity messages, the longest compressed stretch.
let observed;
const full=()=>observed??=(()=>{
  const fired={},continuity=[],tempo=[];let at0600=null;
  const result=route(19390901,{onStep:({sim,events})=>{
    for(const id of Object.keys(sim.consumed))fired[id]??=sim.battleClock;
    for(const e of events)if(e.type==='message'&&e.continuity&&e.continuity.kind!=='bak_delivery_hold')continuity.push({clock:sim.clock,kind:e.continuity.kind});
    if(at0600===null&&sim.battleClock>=seconds('06:00:00'))at0600=sim.clock;
    if(sim.tempo.compressed)tempo.push(sim.clock);
  }});
  return {...result,fired,continuity,tempo,at0600};
})();

test('pacing data is consistent: compression windows inside their segment, known conditions, real interludes and cue objectives',()=>{
  assert.deepEqual(pacingDataErrors(),[]);
  const compressed=definition.clock.segments.filter(s=>s.compress).map(s=>s.id);
  assert.deepEqual(compressed,['seg_hold','seg_climax']);
});

test('the hold clock compresses only while the player holds the deck after the raid, and never past 05:59',()=>{
  const sim=new M01Simulation();sim.tick(.05,{skip:true});
  sim.battleClock=seconds('05:40:00');sim.objectives.obj_m01_hold_access.state='active';sim.flags['m01.second_raid_state']='ended';
  Object.assign(sim.player,{x:HOLD_POSITION.x,z:HOLD_POSITION.z});
  sim.advanceBattle(1);assert.equal(sim.battleClock,seconds('05:40:08'),'not yet in position: the segment scale (8x)');
  sim.timers.holdAccessVisited=true;sim.advanceBattle(1);assert.equal(sim.battleClock,seconds('05:40:32'),'in position: 24x');
  assert.equal(sim.tempo.compressed,true);assert.match(sim.tempo.label,/Mais tarde/);
  Object.assign(sim.player,{x:-120,z:20});sim.advanceBattle(1);assert.equal(sim.battleClock,seconds('05:40:40'),'off the deck: back to 8x');
  assert.equal(sim.tempo.compressed,false);
  Object.assign(sim.player,{x:HOLD_POSITION.x,z:HOLD_POSITION.z});sim.battleClock=seconds('05:58:50');sim.advanceBattle(1);
  assert.equal(sim.battleClock,seconds('05:59:00'),'the compression stops at compress.to');
});

test('a real route keeps every historical event at its battle-clock time, the 12 objectives, CP-A..D and 07:05',()=>{
  const {sim,fired}=full();
  for(const e of definition.events){
    const t=[e.trigger,...(e.trigger.of??[])].find(t=>t.type==='battleClock');if(!t||!(e.id in fired))continue;
    if(definition.clock.segments.find(s=>seconds(t.at)>=seconds(s.from)&&seconds(t.at)<seconds(s.to))?.jump)continue;   // 06:45-07:05: the existing fade to 07:05
    // A tick moves the clock by at most 0.05 s x 30; an event that waits for its own condition (e.g. the 05:30 order) can only be later, never earlier.
    assert.ok(fired[e.id]>=seconds(t.at)-1e-6,`${e.id} antes de ${t.at}`);
    if(e.trigger.type==='battleClock'&&!e.trigger.gate)assert.ok(fired[e.id]-seconds(t.at)<=1.5+1e-6,`${e.id} às ${t.at}, disparou ${fired[e.id]}`);
  }
  assert.equal(sim.mission.complete,true);assert.equal(sim.battleClock,seconds('07:05:00'));
  assert.equal(Object.keys(sim.objectives).length,12);
  for(const o of definition.objectives.filter(o=>o.required))assert.equal(sim.objectives[o.id].state,'done',o.id);
  assert.deepEqual(sim.checkpointsReached,['cp_m01_a_orientacao','cp_m01_b_reorganizacao','cp_m01_c_engenheiros','cp_m01_d_retirada']);
  assert.ok(sim.flags['m01.east_platoon_survivors']>=12&&sim.flags['m01.east_platoon_survivors']<=18);
});

test('measured on the control route: 06:00 within 10 real minutes and the whole mission within 15 (was 11.5 and 18.2)',()=>{
  const {sim,at0600,tempo}=full();
  assert.ok(at0600<600,`06:00 aos ${at0600.toFixed(1)} s reais`);
  assert.ok(sim.clock<900,`missão em ${sim.clock.toFixed(1)} s reais`);
  assert.ok(tempo.length>0,'the compressed clock is presented (sim.tempo) while it runs');
});

test('continuity cues speak only with their objective active and at least 20 real seconds apart',()=>{
  const {continuity}=full();
  assert.ok(continuity.length>0);
  for(let i=1;i<continuity.length;i++)assert.ok(continuity[i].clock-continuity[i-1].clock>=CONTINUITY_MIN_GAP_SEC-1e-9,JSON.stringify(continuity.slice(i-1,i+1)));
});

test('the west charge waits for Bąk to be out of the zone, not for the walk to the station; the roll call finds the carry finished',()=>{
  const {checkpoints}=full(),sim=new M01Simulation();sim.restoreSnapshot(checkpoints.cp_m01_d_retirada);
  Object.assign(sim.player,{x:-291,y:-3,z:26});
  const bak=sim.actor('jozef_bak'),dudek=sim.actor('leon_dudek');
  for(let i=0;i<20*600&&!sim.consumedEvent(E('west_demolition'));i++)sim.tick(.05);
  assert.equal(sim.consumedEvent(E('west_demolition')),true);
  assert.ok(bak.x<WEST_SAFE_X&&dudek.x<WEST_SAFE_X,`Bąk em ${bak.x.toFixed(0)}, Dudek em ${dudek.x.toFixed(0)}`);
  // Straight to the roll call (the 07:05 fade): Bąk is put down at the station, never left on a shoulder.
  sim.consume(E('roll_call'));
  assert.equal(bak.carriedBy,null);assert.equal(bak.carry,undefined);assert.ok(bak.x<-300&&bak.active&&bak.alive);
  assert.equal(dudek.task,sim.flags['m01.bak_status']==='rescued_by_dudek'?'stay_with_bak':null);
});

test('objective clarity: the marker names where to go for the bridge defence and for Bąk, with distance and bearing; status says why',()=>{
  const {checkpoints}=full(),sim=new M01Simulation();sim.restoreSnapshot(checkpoints.cp_m01_c_engenheiros);
  Object.assign(sim.player,{x:-120,y:-3,z:20,angle:0});sim.tick(.05);
  assert.equal(sim.active('hold_access'),true);
  let m=sim.objectiveMarker;assert.equal(m.label,'Posição no tabuleiro rodoviário');assert.ok(m.distance>100&&Number.isFinite(m.bearing));
  assert.match(sim.mission.status,/^Tome posição no tabuleiro rodoviário · \d+ m, /);
  Object.assign(sim.player,{x:HOLD_POSITION.x,y:0,z:HOLD_POSITION.z});
  for(let i=0;i<40;i++)sim.tick(.05);
  assert.equal(sim.objectiveMarker,null,'in position nothing to point at');
  for(let i=0;i<20*400&&!sim.active('rescue_bak');i++)sim.tick(.05);
  const bak=sim.actor('jozef_bak');assert.equal(sim.active('rescue_bak'),true);
  m=sim.objectiveMarker;assert.equal(m.label,'Bąk ferido');assert.ok(Math.abs(m.distance-Math.hypot(bak.x-sim.player.x,bak.z-sim.player.z))<1e-9);
  Object.assign(sim.player,{x:bak.x,z:bak.z});sim.drainEvents();sim.tick(.05,{interact:true});
  assert.equal(sim.player.carrying,'jozef_bak');
  assert.ok(sim.drainEvents().some(e=>e.type==='message'&&/^Bąk está consigo\. Leve-o ao socorrista Dudek: \d+ m, /.test(e.message)));
  sim.tick(.05);
  assert.equal(sim.objectiveMarker.label,'Socorrista Dudek');assert.match(sim.mission.status,/A carregar Bąk · socorrista Dudek no posto de socorro, \d+ m/);
});

test('HUD marker placement: centre ahead, perspective-correct on screen, pinned to the edge with the side when behind',()=>{
  assert.equal(markerScreen(0).x,.5);assert.equal(markerScreen(0).side,null);
  assert.ok(markerScreen(.3).x>.5&&markerScreen(-.3).x<.5);
  assert.deepEqual(markerScreen(2.5),{x:.95,side:'right'});assert.deepEqual(markerScreen(-2.5),{x:.05,side:'left'});
});

test('saves without the continuity timer load; a corrupt one is rejected',()=>{
  const sim=new M01Simulation();sim.tick(.05,{skip:true});
  const save=sim.snapshot();delete save.timers.continuityAt;
  assert.equal(new M01Simulation().loadCheckpoint(JSON.stringify(save)).ok,true);
  assert.equal(new M01Simulation().loadCheckpoint(JSON.stringify({...save,timers:{...save.timers,continuityAt:save.clock+5}})).ok,false);
});
