import test from 'node:test';
import assert from 'node:assert/strict';
import definition from '../missions/m01-tczew/mission.json' with {type:'json'};
import {M01Simulation,seconds} from '../src/game/m01-simulation.js';
import {eastHoldStage,holdStageSlot} from '../src/game/m01-animation-presentation.js';
import {actorPoseName} from '../src/render/m01-actor-pose.js';
import {driver,toRepair} from './helpers/m01-route.js';
import {json} from './helpers/m01-determinism.js';
import {gameplaySnapshot} from './helpers/m01-animation-contract.js';

// T38 M01-COMBAT-POSTURE-STAGING-V1, slice 1 (presentation only). While the east platoon waits on the road deck (hold.from .. hold.until)
// nobody is drawn standing in a row under fire: each man still on his slot is posture 'crouch' and his body is turned by hold.stage.yaw[i].
// Gameplay is untouched: `crouched`, x/z, facing, hitboxes, aim heights and the RNG stream are the same (also locked per tick by the
// golden traces of m01-animation-contract.test.js). Environment: M01_STAGING_SEEDS=19390901,1  run only these seeds (default: 12 seeds).
const E=name=>`evt_m01_${name}`;
const SEEDS=process.env.M01_STAGING_SEEDS?process.env.M01_STAGING_SEEDS.split(',').map(Number):[19390901,1,2,3,4,5,6,7,8,9,10,11];
const STAGE=eastHoldStage();
const angle=x=>Math.atan2(Math.sin(x),Math.cos(x));
const platoon=sim=>Array.from({length:24},(_,i)=>sim.actor(`pl_east_${i}`));
const layout=definition.groups.find(g=>g.id==='grp_east_platoon').hold.layout;

/** The pre-T38 presentation for the platoon (standing, body on the facing) forced before every tick: gameplay must not notice. */
class UnstagedPresentation extends M01Simulation{
  tick(dt,controls){for(const a of this.actors)if(a.group==='grp_east_platoon'){a.posture='stand';a.bodyYaw=a.facing;}return super.tick(dt,controls);}
}
const restoreAs=(Sim,save)=>{const s=new Sim(1);s.restoreSnapshot(json(save));s.drainEvents();return s;};

// ---------------------------------------------------------------- data
test('the stage data: crouch, one bounded yaw per man, varied along every rank; a data error stops the load',()=>{
  assert.equal(STAGE.posture,'crouch');assert.equal(STAGE.yaw.length,24);
  assert.ok(STAGE.yaw.every(y=>Math.abs(y)<=.4));
  for(let r=0;r<4;r++){
    const rank=STAGE.yaw.slice(r*6,r*6+6);
    assert.equal(new Set(rank).size,6,`rank ${r}: six different turns`);
    for(let k=1;k<6;k++)assert.ok(Math.abs(rank[k]-rank[k-1])>=.1,`rank ${r}: neighbours ${k-1}/${k} turn visibly differently`);
  }
  for(let c=0;c<6;c++)assert.equal(new Set([0,1,2,3].map(r=>STAGE.yaw[r*6+c])).size,4,`file ${c}: four different turns`);
  const broken=edit=>{const d=json(definition),h=d.groups.find(g=>g.id==='grp_east_platoon').hold;edit(h);return ()=>eastHoldStage(d);};
  for(const [name,edit] of Object.entries({missing:h=>{delete h.stage;},stand:h=>{h.stage.posture='stand';},prone:h=>{h.stage.posture='prone';},
    short:h=>{h.stage.yaw.pop();},wide:h=>{h.stage.yaw[3]=.5;},nan:h=>{h.stage.yaw[0]=null;},layout:h=>{delete h.layout.dz;}}))
    assert.throws(broken(edit),/M01 east hold stage/,name);
});

test('the staging box is exactly the east rifles\' aim block, and every one of the 24 slots is inside it',()=>{
  const s=new M01Simulation(),b=STAGE.box,ones=1-2**-53;
  // eastBridgeheadPoint draws (band, x, z): all-zero draws give the block's low corner, all-max draws its high corner.
  const low=s.eastBridgeheadPoint(()=>0),high=s.eastBridgeheadPoint(()=>ones);
  assert.equal(low.x,b.x0);assert.equal(low.z,b.z0);
  assert.ok(Math.abs(high.x-b.x1)<1e-9&&Math.abs(high.z-b.z1)<1e-9,JSON.stringify({high,b}));
  for(const a of platoon(s)){assert.ok(a.x>=b.x0&&a.x<=b.x1&&a.z>=b.z0&&a.z<=b.z1,a.id);assert.equal(a.x,layout.x0+Number(a.id.slice(8))%6*layout.dx);}
});

test('only a waiting man is staged: active, still, on the block, not crouched by gameplay, not wounded or carried; nobody else changes',()=>{
  const s=new M01Simulation(),a=platoon(s)[7];
  assert.equal(holdStageSlot(a),-1,'off stage before the train');
  a.active=true;assert.equal(holdStageSlot(a),7);
  for(const [name,patch] of Object.entries({moving:{motion:{...a.motion,speed:.4}},crouched:{crouched:true},wounded:{state:'WOUNDED'},carried:{carriedBy:'x'},
    west:{x:1030},north:{z:44}}))assert.equal(holdStageSlot({...a,...patch}),-1,name);
  const other=s.actors.filter(x=>x.group!=='grp_east_platoon');
  for(const x of other)assert.equal(holdStageSlot({...x,x:1035,z:39,active:true}),-1,x.id);
  assert.equal(holdStageSlot({...s.actor('de_spans_0'),x:1035,z:39,group:'grp_de_spans'}),-1);
  // the renderer reads the staged posture through the existing pose path; gameplay `crouched` stays false
  assert.equal(actorPoseName({...a,posture:'crouch',suppressedUntil:0},10),'crouched');assert.equal(a.crouched,false);
});

// ---------------------------------------------------------------- the real route, per seed
function stagedRoute(seed){
  const stats={staged:0,standingWaiters:0,turned:0,twins:0,deaths:0},saves=[];let holdTicks=0;
  const d=toRepair(driver(seed,{onStep:({sim})=>{
    if(!sim.holdingEast())return;
    holdTicks++;
    for(const a of platoon(sim)){
      if(!a.active||!a.alive)continue;
      const i=Number(a.id.slice(8));
      assert.equal(a.crouched,false,`${a.id}: gameplay crouch is not touched`);
      assert.equal(a.motion.speed,0,`${a.id} waits still on his slot`);
      assert.equal(holdStageSlot(a),i);
      if(a.posture!=='crouch')stats.standingWaiters++;else stats.staged++;
      if(sim.clock-a.postureSince>=1){assert.equal(a.bodyYaw,angle(a.facing+STAGE.yaw[i]),`${a.id} body turned by yaw[${i}]`);stats.turned++;}
    }
    if(holdTicks%1500===200)saves.push(sim.snapshot());
  }}));
  const {sim,step,until,walk}=d;
  walk(-115,27);walk(-28,28);step({crouch:true});until(()=>sim.active('hold_access'),500);step({crouch:true});
  walk(-115,32);walk(-10,32);walk(-10,40);walk(30,40);
  until(()=>sim.consumedEvent(E('east_platoon_withdraws')),500);
  assert.equal(sim.flags['m01.east_platoon_survivors'],18,'18 survivors at the withdrawal, as before');
  stats.deaths=platoon(sim).slice(18).filter(a=>!a.alive).length;
  for(let i=0;i<40;i++)step({});
  // after the withdrawal the eighteen run west standing (the staging is only for waiting men); the reserves are off stage
  platoon(sim).forEach((a,i)=>{assert.equal(holdStageSlot(a),-1,a.id);if(i<18)assert.equal(a.posture,'stand',a.id);});
  assert.equal(stats.standingWaiters,0,'nobody waits standing on the block');
  assert.ok(stats.staged>holdTicks*12&&stats.turned>holdTicks*10,JSON.stringify({stats,holdTicks}));
  assert.equal(stats.deaths,6,'the six reserves fell during the hold');
  // A/B: from saves inside the hold, forcing the pre-T38 platoon presentation every tick leaves gameplay, RNG and events identical.
  assert.ok(saves.length>=3,`saves in the hold: ${saves.length}`);
  for(const save of saves){
    const a=restoreAs(M01Simulation,save),b=restoreAs(UnstagedPresentation,save);
    for(let t=0;t<40;t++){
      a.tick(.05,{});b.tick(.05,{});
      assert.deepEqual(b.drainEvents(),a.drainEvents());
      assert.equal(JSON.stringify(gameplaySnapshot(b.snapshot(false))),JSON.stringify(gameplaySnapshot(a.snapshot(false))),`gameplay diverged at tick ${t} of the save at ${a.battleClock}`);
    }
    assert.equal(b.rng.state,a.rng.state);stats.twins++;
  }
  return {stats,holdTicks};
}
for(const seed of SEEDS)test(`staged hold, seed ${seed}: every waiting man crouched and turned, none standing; outcomes and gameplay identical to the unstaged presentation`,()=>{
  const r=stagedRoute(seed);assert.ok(r.holdTicks>5000&&r.stats.twins>=3,JSON.stringify(r));
});

test('the hold window used above is the mission\'s own: from train 963 to the 06:00 withdrawal',()=>{
  const at=id=>seconds(definition.events.find(e=>e.id===id).trigger.at);
  assert.ok(at(E('train963_arrives'))<at(E('east_platoon_withdraws')));
});
