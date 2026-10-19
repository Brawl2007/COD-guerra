import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {toCoverAdjustment} from './helpers/m01-route.js';
import {newBarkState,barkTrigger,barkChannelOpen} from '../src/game/m01-barks.js';

let flow;
const scenario=()=>flow??=toCoverAdjustment();
const load=snapshot=>{const s=new M01Simulation();s.restoreSnapshot(snapshot);return s;};

test('adjustment warning and HUD identify a real salvo; view direction changes the bearing without changing combat',()=>{
  const d=scenario(),s=d.sim,fire=s.timers.coverFire;
  assert.ok(s.enemyFire.rounds.some(r=>r.kind==='cover'&&r.by===fire.by&&r.firedAt===fire.at));
  // The order to change cover is a spoken line (the node of the first rotation, the sandbag, has the generic callout); the HUD message is only what is left when no voice can be said.
  assert.deepEqual(s.dialogueConsumed.filter(t=>/^(co_m01_cover_rotation|dlg_m01_(035|136|137))#/.test(t)),['co_m01_cover_rotation#1']);
  assert.equal(s.flags['m01.suggested_cover'],'cv_sandbag_mid_2');
  assert.equal(d.events.some(e=>e.type==='message'&&e.message.startsWith('Zieliński:')),false,'a voice was said: no duplicate message');
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

test('when no voice can be said the adjustment warning is still the HUD message, and no line is invented',()=>{
  const s=load(scenario().beforeCoverAdjustment);
  // eight lines in the last minute: the budget of the channel is spent for every priority
  s.timers.barks={...newBarkState(),last:s.clock-1,recent:Array.from({length:8},(_,i)=>s.clock-8+i)};
  s.drainEvents();
  for(let i=0;i<70*20&&!s.timers.coverFire;i++)s.tick(.05,{});
  assert.ok(s.timers.coverFire,'the salvo came');
  assert.equal(s.dialogueConsumed.some(t=>/^(co_m01_cover_rotation|dlg_m01_(035|136|137))#/.test(t)),false);
  assert.ok(s.drainEvents().some(e=>e.type==='message'&&e.message.startsWith('Zieliński: Metralhadora nos portões')));
  assert.match(s.mission.status,/mude de cobertura/);
});

test('the rotation names the node: portal, truss and tower have their own lines, the sandbag has the callout; none repeats inside 20 s of another',()=>{
  // From a quiet moment of the same state: the restore point is inside the order scene (voices are shut for 12 s) and the minute is busy with the continuity cues and other voices, whose
  // global limits (gap, budget) have their own tests (tests/m01-barks.test.js); here only the node decides.
  const quiet=()=>{
    const s=load(scenario().beforeCoverAdjustment);
    for(let i=0;i<20*20&&!barkChannelOpen(s);i++)s.tick(.05,{});
    assert.equal(barkChannelOpen(s),true,'the order scene is over');assert.equal(s.timers.coverFire,undefined,'before the first salvo');
    s.timers.barks=newBarkState();s.subtitle=null;s.dialogueQueue=[];
    return s;
  };
  const rows=[['cv_sandbag_mid_2','co_m01_cover_rotation'],['cv_portal_road_n','dlg_m01_136'],['cv_road_truss_1','dlg_m01_137'],['cv_road_truss_3','dlg_m01_137'],['cv_tower_p1_n','dlg_m01_035']];
  for(const [node,expected] of rows){
    const s=quiet();s.flags['m01.suggested_cover']=node;
    const before=s.dialogueConsumed.length;
    assert.equal(barkTrigger(s,'coverRotation',{node}),true,node);
    assert.deepEqual(s.dialogueConsumed.slice(before).filter(t=>/^(co_m01_cover_rotation|dlg_m01_(035|136|137))#/.test(t)),[`${expected}#1`],node);
  }
  const s=quiet();
  assert.equal(barkTrigger(s,'coverRotation',{node:'cv_portal_road_n'}),true);
  s.clock+=10;
  assert.equal(barkTrigger(s,'coverRotation',{node:'cv_tower_p1_n'}),false,'035 does not speak 10 s after 136');
  s.clock+=12;
  assert.equal(barkTrigger(s,'coverRotation',{node:'cv_tower_p1_n'}),true);
});
