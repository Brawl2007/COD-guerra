import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import * as THREE from 'three';
import definition from '../missions/m01-tczew/mission.json' with {type:'json'};
import {M01Simulation,eastFrontPlan,validateM01Snapshot,seconds,clockText} from '../src/game/m01-simulation.js';
import {M01View} from '../src/render/m01-view.js';
import {validRound,makeRound,ATTRITION_SHOOTER} from '../src/game/m01-fire.js';
import {displayProfiles} from '../src/game/m01-display-fire.js';
import {eyePosition} from '../src/world/spatial.js';
import {route,driver,toRepair} from './helpers/m01-route.js';
import {compareContinuation,json} from './helpers/m01-determinism.js';

// T23 M01-EAST-FRONT-VISIBLE-V1. The east platoon stands on the end of the road deck from the arrival of train 963 (04:45) to its withdrawal
// (06:00); its six reserve men (pl_east_18..23) fall at fixed times to rifle rounds of kind 'attrition' instead of off stage at 06:00; two-way
// display tracers (T22 profiles from the mission data) and the Panzerzug's display shells make the front visible. Environment switches:
//   M01_EAST_FRONT_SEEDS=19390901,1,2   run only these seeds in the `east front seed N` route tests (default: 19390901 and 1..11)
//   M01_EAST_FRONT_REPORT=<file>        write the per-seed outcomes (fall times, shooters, display counts) as JSON
const E=name=>`evt_m01_${name}`;
const SEEDS=process.env.M01_EAST_FRONT_SEEDS?process.env.M01_EAST_FRONT_SEEDS.split(',').map(Number):[19390901,1,2,3,4,5,6,7,8,9,10,11];
const report={task:'M01-EAST-FRONT-VISIBLE-V1',node:process.version,arch:process.arch,routes:[]};
after(()=>{if(process.env.M01_EAST_FRONT_REPORT)writeFileSync(process.env.M01_EAST_FRONT_REPORT,JSON.stringify(report,null,2)+'\n');});
const group=definition.groups.find(g=>g.id==='grp_east_platoon');
const platoon=sim=>Array.from({length:24},(_,i)=>sim.actor(`pl_east_${i}`));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const attritionRounds=sim=>sim.enemyFire.rounds.filter(r=>r.kind==='attrition');

/** What the simulation did before T23: nobody holds, nobody falls early, the old aim block, no display fire. The T23 logic is the only difference. */
class T22Logic extends M01Simulation{
  reset(seed){super.reset(seed);this.display.profiles=[];}
  holdingEast(){return false;}
  eastBridgeheadPoint(r){return r()<.5?{x:995+r()*45,y:.5,z:-3+r()*6}:{x:995+r()*45,y:.5,z:37.5+r()*5};}
}

// ---------------------------------------------------------------- data
test('the east front plan reads the mission data: six fixed times between the train and the withdrawal; every block is RECONSTRUCTED',()=>{
  const plan=eastFrontPlan();
  assert.deepEqual(plan.attrition.map(e=>e.victim),['pl_east_23','pl_east_22','pl_east_21','pl_east_20','pl_east_19','pl_east_18']);
  assert.deepEqual(plan.attrition.map(e=>clockText(e.at)),['04:53:00','05:04:00','05:16:00','05:27:00','05:38:00','05:49:00']);
  assert.equal(plan.hold.from,E('train963_arrives'));assert.equal(plan.hold.until,E('east_platoon_withdraws'));
  for(const e of plan.attrition){assert.ok(e.at>=seconds('04:45:00'));assert.equal(e.cutoff,seconds('05:56:00'));assert.ok(e.cutoff<=seconds('06:00:00')-3);}
  for(const block of [group.hold,...group.attrition,...definition.groups.flatMap(g=>g.displayFire??[])])assert.equal(block.classification,'RECONSTRUCTED',JSON.stringify(block).slice(0,60));
  assert.equal(group.attrition.length,6);
});

test('a data error stops the load: typos, duplicate or out-of-range victims, bad times and a broken hold are rejected',()=>{
  const edit=fn=>{const def=structuredClone(definition);fn(def.groups.find(g=>g.id==='grp_east_platoon'),def);return def;};
  assert.equal(eastFrontPlan(edit(()=>{})).attrition.length,6);
  const bad={
    'typo in a victim':g=>{g.attrition[0].victim='pl_east_24';},'victim outside the reserve':g=>{g.attrition[0].victim='pl_east_17';},
    'a victim twice':g=>{g.attrition[1].victim='pl_east_23';},'a Pole of another group':g=>{g.attrition[2].victim='jozef_bak';},
    'times out of order':g=>{[g.attrition[0].at,g.attrition[1].at]=[g.attrition[1].at,g.attrition[0].at];},
    'before the train arrives':g=>{g.attrition[0].at='04:44:00';},'cutoff not after at':g=>{g.attrition[0].cutoff=g.attrition[0].at;},
    'cutoff leaves no flight time before the withdrawal':g=>{g.attrition[5].cutoff='05:59:59';},'missing cutoff':g=>{delete g.attrition[3].cutoff;},
    'no list':g=>{g.attrition=[];},'no hold':g=>{delete g.hold;},'hold from not before until':g=>{g.hold.until=g.hold.from;},
    'hold from not a battle-clock event':g=>{g.hold.from=E('repair_complete');},
    // T38: the 6x4 layout became explicit staggered slots, one [x, z] per man, at least 1.2 m apart, and the hold posture is crouch.
    'no slots':g=>{delete g.hold.slots;},'a man without a slot':g=>{g.hold.slots.pop();},'two men on one spot':g=>{g.hold.slots[5]=[...g.hold.slots[4]];},
    'slots closer than 1.2 m':g=>{g.hold.slots[5]=[g.hold.slots[4][0]+.8,g.hold.slots[4][1]];},'a slot that is not [x, z]':g=>{g.hold.slots[2]=[1030];},
    'a NaN slot':g=>{g.hold.slots[7]=[null,40];},'standing hold':g=>{g.hold.stage.posture='stand';},
  };
  for(const [name,fn] of Object.entries(bad))assert.throws(()=>eastFrontPlan(edit(fn)),/east front/,name);
});

test('24 distinct slots on the road deck: nobody stands on another man, the six reserves wait at the back, the old four-point stack is gone',()=>{
  const sim=new M01Simulation(1),men=platoon(sim),deck=sim.world.colliders.find(c=>c.id==='road_collider_deck_span_09');
  assert.equal(new Set(men.map(a=>`${a.x},${a.z}`)).size,24);
  let closest=Infinity;for(const a of men)for(const b of men)if(a!==b)closest=Math.min(closest,dist(a,b));
  assert.ok(closest>=1.19,`closest pair ${closest} m`);
  for(const a of men){
    assert.ok(a.x>=deck.min.x&&a.x<=deck.max.x-.3&&a.z>=deck.min.z+.3&&a.z<=deck.max.z-.3,`${a.id} is on the deck`);
    assert.equal(sim.world.heightAt(a.x,a.z),a.y,`${a.id} stands on the deck, not above the bank`);
  }
  // T38: no rank any more (staggered slots), but the six reserves still wait at the back: all in the rear (north) 1.2 m strip of the block,
  // on average 2 m behind the other eighteen.
  const mean=v=>v.reduce((n,x)=>n+x,0)/v.length,rear=men.slice(18).map(a=>a.z),front=men.slice(0,18).map(a=>a.z);
  assert.ok(rear.every(z=>z>=40.6)&&mean(rear)-mean(front)>=2,`the reserves wait at the back: ${mean(rear).toFixed(2)} / ${mean(front).toFixed(2)}`);
  assert.ok(men.every(a=>!a.active&&a.alive&&a.state==='GUARD'&&a.group==='grp_east_platoon'),'off stage until the train arrives');
});

test('the east rifles aim into the platoon block with exactly three draws per call, as before',()=>{
  const sim=new M01Simulation(1),men=platoon(sim);
  let draws=0,state=12345;const r=()=>{draws++;state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const bands=new Set();let farthest=0;
  for(let i=0;i<4000;i++){
    draws=0;const p=sim.eastBridgeheadPoint(r);assert.equal(draws,3,'band, x and z');
    // T38: the block is the staggered slots' bounds (x 1028-1043, z 38.2-41.8) plus 1 m in x and 0.2 m in z, as T23 built it from the grid.
    assert.ok(p.x>=1027&&p.x<=1044&&p.z>=38&&p.z<=42&&p.y===.5,JSON.stringify(p));
    bands.add(p.z<40?'north':'south');farthest=Math.max(farthest,Math.min(...men.map(a=>dist(a,p))));
  }
  assert.deepEqual([...bands].sort(),['north','south']);assert.ok(farthest<=1.5,`the farthest aim point is ${farthest.toFixed(2)} m from the nearest man`);
});

test('the real display profiles are east only: no gate shooters, nothing aimed anywhere near the playable area, the train fires from a fixed origin',()=>{
  const sim=new M01Simulation(1),profiles=displayProfiles(definition,{actors:sim.actors}),playableMaxX=sim.world.layout.bounds.playable.maxX;
  assert.equal(profiles.length,4);
  for(const p of profiles){
    for(const who of p.shooters??[])
      assert.ok(/^pl_east_\d+$/.test(who)||/^de_east_(1[4-9]|[23]\d)$/.test(who),`${p.id}: ${who} must be a platoon man or a dike man (the gate men can see the west bank)`);
    if(p.targetGroup!==undefined)assert.ok(['grp_de_east','grp_east_platoon'].includes(p.targetGroup),p.id);
    if(p.targetBox)assert.ok(p.targetBox[0]-playableMaxX>=500,`${p.id}: the nearest aim point is ${p.targetBox[0]-playableMaxX} m east of the playable area`);
    if(p.origin)assert.ok(p.origin[0]>=1100&&p.weapon==='pz7_75mm'&&p.from===E('panzerzug_arrives'),p.id);
    assert.ok(p.from===E('train963_arrives')||p.from===E('panzerzug_arrives'));assert.equal(p.until,E('east_platoon_withdraws'),'displays end with the hold');
  }
});

test('validRound accepts an attrition round only from a rifleman of the dike or the gates at a reserve man; the older kinds keep their rules',()=>{
  const good={id:'m01_round_9',by:'de_east_2',weapon:'kar98k',kind:'attrition',ox:1053,oy:.6,oz:9.5,ax:1033,ay:1.1,az:41.8,h:.01,firedAt:5,arriveAt:5.06,tracer:true,victim:'pl_east_23'};
  assert.ok(validRound(good,5));
  for(const i of [2,9,10,29,30,39]){assert.ok(validRound({...good,by:`de_east_${i}`},5),`de_east_${i}`);assert.ok(ATTRITION_SHOOTER.test(`de_east_${i}`));}
  for(const [name,patch] of Object.entries({mg0:{by:'de_east_0'},mg1:{by:'de_east_1'},beyondTheRoster:{by:'de_east_40'},spans:{by:'de_spans_2'},polish:{by:'pl_east_3'},
    mgWeapon:{weapon:'mg34'},noVictim:{victim:null},reserveBelow:{victim:'pl_east_17'},reserveAbove:{victim:'pl_east_24'},squad:{victim:'jozef_bak'},west:{ox:-100},unknownKind:{kind:'invented'}}))
    assert.ok(!validRound({...good,...patch},5),name);
  assert.ok(validRound({...good,kind:'platoon',by:'de_spans_1',victim:'pl_east_3'},5),'the 20 s rule still takes any platoon man');
  assert.ok(validRound({...good,kind:'east',victim:null},5)&&validRound({...good,kind:'east',victim:'pl_east_20'},5),'only attrition is restricted to the reserve');
});

// ---------------------------------------------------------------- the simulation, one controlled scenario at a time
let memo;
/** A real route to 04:52:58 (two seconds before the first fall), with what it saw on the way; every scenario below restores its own copy. */
function before0453(){
  if(!memo){
    const d=toRepair(driver(19390901)),{sim}=d,seen={};
    seen.inactiveBeforeTrain=!sim.consumedEvent(E('train963_arrives'))&&platoon(sim).every(a=>!a.active&&a.alive);
    d.until(()=>sim.consumedEvent(E('train963_arrives')),120);d.step({});
    seen.standing=platoon(sim).every(a=>a.active&&a.alive&&a.state==='GUARD');seen.slots=platoon(sim).map(a=>[a.x,a.z]);seen.battleClock=sim.battleClock;
    d.until(()=>sim.battleClock>=seconds('04:52:58'),300);
    seen.after=platoon(sim).map(a=>[a.x,a.z]);seen.stateAfter=platoon(sim).map(a=>a.state);seen.speeds=platoon(sim).map(a=>a.motion.speed);
    memo={snapshot:json(sim.snapshot()),seen};
  }
  const sim=new M01Simulation(1);sim.restoreSnapshot(json(memo.snapshot));sim.drainEvents();return sim;
}
/** Ticks until the first attrition round appears; returns the battle clock before and after that tick. */
function untilFired(sim,limit=400){
  for(let i=0;i<limit;i++){
    const before=sim.battleClock;sim.tick(.05,{});sim.drainEvents();
    if(attritionRounds(sim).length)return {before,after:sim.battleClock};
  }
  throw new Error('no attrition round fired');
}
const shooterState=sim=>Array.from({length:40},(_,i)=>{const a=sim.actor(`de_east_${i}`);return JSON.stringify([a.cooldown,a.firedAt,a.shot,a.state,a.facing,a.suppressedUntil,a.crouched,a.x,a.z,a.alive,a.active]);});

test('before the train the platoon is off stage; from its arrival it stands, active and on guard, on its slots, and does not move until the withdrawal',()=>{
  before0453();const {seen}=memo;
  assert.ok(seen.inactiveBeforeTrain,'nobody stands before train 963');
  assert.ok(seen.standing,'all 24 are active, alive and on guard when the train arrives');
  assert.ok(seen.battleClock>=seconds('04:45:00')&&seen.battleClock<seconds('04:45:10'));
  assert.deepEqual(seen.after,seen.slots,'seven minutes of battle later nobody has moved');
  assert.ok(seen.stateAfter.every(s=>s==='GUARD')&&seen.speeds.every(v=>v===0));
  assert.equal(new Set(seen.slots.map(([x,z])=>`${x},${z}`)).size,24);
});

test('at the withdrawal the hold ends: the eighteen run west and the six reserves are off stage and dead',()=>{
  const s=before0453();
  s.consume(E('east_platoon_withdraws'));const x0=platoon(s).map(a=>a.x);
  for(let i=0;i<60;i++)s.tick(.05,{});
  platoon(s).forEach((a,i)=>{
    if(i<18)assert.ok(a.active&&a.alive&&x0[i]-a.x>5,`${a.id} runs west (${x0[i]-a.x} m)`);
    else assert.ok(!a.active&&!a.alive&&a.state==='DOWN',a.id);
  });
  assert.equal(s.flags['m01.east_platoon_survivors'],18);
});

test('the first fall is fired on the very tick that crosses 04:53:00: one rifleman, one traced round, a tracer, a display flash',()=>{
  const s=before0453();assert.ok(s.battleClock<seconds('04:53:00'));
  const {before,after}=untilFired(s),round=attritionRounds(s)[0];
  assert.ok(before<seconds('04:53:00')&&after>=seconds('04:53:00'),`fired between ${clockText(before)} and ${clockText(after)}`);
  assert.equal(attritionRounds(s).length,1);
  assert.equal(round.kind,'attrition');assert.equal(round.victim,'pl_east_23');assert.equal(round.weapon,'kar98k');assert.equal(round.tracer,true);
  assert.ok(ATTRITION_SHOOTER.test(round.by),`${round.by} is a rifleman, never the MG34 gunners 0 and 1`);
  assert.ok(validRound(round,s.clock)&&round.ox>=1053&&round.arriveAt-round.firedAt<.3);
  assert.equal(s.display.firedAt[round.by],round.firedAt,'his muzzle flash is published as display data');
  assert.ok(s.actor('pl_east_23').alive,'the round is still in flight');
  const ids=s.enemyFire.rounds.map(r=>r.id);assert.equal(new Set(ids).size,ids.length);
});

test('firing one is invisible to the main stream and to the shooter: no draw, no event, no write on him or the player but his display flash',()=>{
  const s=before0453(),victim=s.actor('pl_east_23');
  const before={rng:s.rng.state,next:s.enemyFire.nextId,rounds:s.enemyFire.rounds.length,events:s.events.length,shooters:shooterState(s),player:JSON.stringify(s.player)};
  s.shootAttrition(victim);
  assert.equal(s.rng.state,before.rng,'no draw from the main stream');assert.equal(s.enemyFire.nextId,before.next+1);assert.equal(s.enemyFire.rounds.length,before.rounds+1);
  assert.equal(s.events.length,before.events,'no event: no enemy-fire, no round-impact, no message');assert.equal(JSON.stringify(s.player),before.player);
  assert.deepEqual(shooterState(s),before.shooters,'his state, cooldown, firedAt and facing are untouched, so his eastFire cadence and Kowal\'s latest-flash pick stay as they were');
  const round=attritionRounds(s)[0];assert.equal(round.firedAt,s.clock);assert.equal(s.display.firedAt[round.by],s.clock);
});

test('the round lands: the man falls (DOWN, health 0, still active), the survivors flag stays 18, nobody else is touched, no event, no message, no wound roll',()=>{
  const s=before0453();untilFired(s);
  const round=attritionRounds(s)[0],victim=s.actor(round.victim),neighbours=platoon(s).filter(a=>a!==victim);
  const snapshot=()=>JSON.stringify(neighbours.map(a=>[a.suppressedUntil,a.state,a.alive,a.active,a.health,a.hitAt,a.suppressedAt]));
  const others=snapshot(),player=JSON.stringify(s.player);
  const events=[];for(let i=0;i<8&&victim.alive;i++){s.tick(.05,{});events.push(...s.drainEvents());}
  assert.equal(victim.alive,false);assert.equal(victim.health,0);assert.equal(victim.state,'DOWN');assert.equal(victim.active,true);
  assert.ok(Number.isFinite(victim.diedAt)&&Number.isFinite(victim.hitAt)&&Number.isFinite(victim.hitYaw),'death and hit are recorded for the presentation');
  assert.equal(s.flags['m01.east_platoon_survivors'],18);assert.equal(snapshot(),others,'his neighbours are not pinned or touched');
  assert.equal(events.filter(e=>e.type==='round-impact'&&(e.victim||e.by===round.by)).length,0);assert.ok(!events.some(e=>e.type==='player-hit'));
  assert.ok(!events.some(e=>e.type==='message'&&/caiu/i.test(e.message)),'no combatCall');
  assert.equal(JSON.stringify(s.player),player);assert.deepEqual(attritionRounds(s),[],'the round is gone');
  // the next one is not before its time (05:04:00): nothing is fired while the battle clock runs up to 05:03:30
  for(let i=0;i<600&&s.battleClock<seconds('05:03:30');i++)s.tick(.05,{});
  assert.deepEqual(attritionRounds(s),[]);assert.ok(s.actor('pl_east_22').alive||s.battleClock>=seconds('05:04:00'));
});

test('a wall, a miss or a dead target changes nothing: the tick retries every tick until the round gets through; no duplicate death',()=>{
  const s=before0453();
  const wall={id:'t23-wall',min:{x:1046,y:-10,z:-150},max:{x:1050,y:30,z:150},material:'stone'};
  s.world.obstacles.push(wall);
  for(let i=0;i<400&&s.battleClock<seconds('04:53:30');i++)s.tick(.05,{});
  assert.ok(s.battleClock>=seconds('04:53:30'));assert.deepEqual(attritionRounds(s),[],'no shooter can hit through the wall, so no round is fired');
  assert.ok(s.actor('pl_east_23').alive);
  s.world.obstacles.pop();s.tick(.05,{});assert.equal(attritionRounds(s).length,1,'the very next tick fires');
  // a wall put up while the round flies: the round lands on the wall, the man lives, and the tick fires again once the wall is gone
  s.world.obstacles.push(wall);
  for(let i=0;i<10;i++)s.tick(.05,{});
  assert.ok(s.actor('pl_east_23').alive&&s.actor('pl_east_23').diedAt===-1e9);assert.deepEqual(attritionRounds(s),[]);
  s.world.obstacles.pop();s.tick(.05,{});assert.equal(attritionRounds(s).length,1);
  for(let i=0;i<10;i++)s.tick(.05,{});
  const man=s.actor('pl_east_23');assert.equal(man.alive,false);const diedAt=man.diedAt,hitAt=man.hitAt;
  // a duplicate arrival (a hand-edited save) finds him dead: nothing is written again and nothing throws
  s.enemyFire.rounds.push(makeRound({id:'m01_round_dup',by:'de_east_2',weapon:'kar98k',kind:'attrition',origin:eyePosition(s.actor('de_east_2')),
    aim:{x:man.x,y:man.y+1.1,z:man.z},firedAt:s.clock,bias:[0,0],cone:[0,0],gauss:()=>0,tracer:true,victim:man.id}));
  for(let i=0;i<10;i++)s.tick(.05,{});
  assert.equal(man.diedAt,diedAt);assert.equal(man.hitAt,hitAt);assert.equal(s.flags['m01.east_platoon_survivors'],18);
});

test('no shot before its time, after its cutoff or after the withdrawal; a suppressed or dead rifleman is skipped; the MG34 gunners never shoot',()=>{
  const s=before0453();
  s.attritionTick();assert.deepEqual(attritionRounds(s),[],'04:52:58 is before 04:53:00');
  s.battleClock=seconds('04:53:00');
  for(const id of ['de_east_2','de_east_3'])s.actor(id).suppressedUntil=s.clock+30;s.actor('de_east_4').alive=false;s.actor('de_east_5').active=false;
  s.attritionTick();const first=attritionRounds(s)[0];
  assert.ok(first&&!['de_east_0','de_east_1','de_east_2','de_east_3','de_east_4','de_east_5'].includes(first.by),first?.by);
  s.enemyFire.rounds=[];
  s.battleClock=seconds('05:56:00');s.attritionTick();assert.deepEqual(attritionRounds(s),[],'the entry closes at its cutoff (05:56:00)');
  s.battleClock=seconds('04:53:00');
  for(const a of s.enemies.filter(a=>a.group==='grp_de_east'&&!['de_east_0','de_east_1'].includes(a.id)))a.alive=false;
  s.attritionTick();assert.deepEqual(attritionRounds(s),[],'only the MG34 gunners are left: nobody shoots');
  const t=before0453();t.battleClock=seconds('04:53:00');t.consume(E('east_platoon_withdraws'));t.attritionTick();assert.deepEqual(attritionRounds(t),[],'nothing after the withdrawal');
  // a round already in flight when the rule of 06:00 runs: the rule has killed the man, the arrival adds nothing
  const u=before0453();untilFired(u);const victim=u.actor(attritionRounds(u)[0].victim);u.consume(E('east_platoon_withdraws'));
  for(let i=0;i<10;i++)u.tick(.05,{});assert.equal(victim.alive,false);assert.equal(victim.diedAt,-1e9,'killed by the rule of 06:00, not by the round');
});

test('a save with the round in flight restores to the same continuation, exactly one death; the validator refuses a malformed attrition round',()=>{
  const s=before0453();untilFired(s);const round=attritionRounds(s)[0];
  const save=s.snapshot();validateM01Snapshot(save);
  assert.equal(save.enemyFire.rounds.filter(r=>r.kind==='attrition').length,1);
  const result=compareContinuation(s,{label:'attrition round in flight',ticks:160,doubleAt:[3]});
  assert.equal(result.firstDivergence,null);
  const man=s.actor(round.victim);assert.equal(man.alive,false);assert.ok(man.diedAt<=s.clock);
  const copy=new M01Simulation(1);copy.restoreSnapshot(json(save));for(let i=0;i<160;i++)copy.tick(.05,{});
  assert.equal(copy.actor(round.victim).diedAt,man.diedAt,'one death, at the same instant');assert.equal(copy.flags['m01.east_platoon_survivors'],18);
  const target=new M01Simulation(1),before=JSON.stringify(target.snapshot());
  for(const [name,patch] of Object.entries({mg:{by:'de_east_0'},spans:{by:'de_spans_1'},weapon:{weapon:'mg34'},victim:{victim:'pl_east_17'},none:{victim:null},squad:{victim:'jozef_bak'},kind:{kind:'bogus'}})){
    const bad=structuredClone(save);Object.assign(bad.enemyFire.rounds.find(r=>r.kind==='attrition'),patch);
    assert.equal(target.loadCheckpoint(JSON.stringify(bad)).ok,false,name);assert.equal(JSON.stringify(target.snapshot()),before,`${name}: nothing changed`);
  }
  assert.equal(target.loadCheckpoint(JSON.stringify(save)).ok,true);
  // a save made after the fall holds no round and the schedule moves on: nobody falls again before 05:04
  const after=new M01Simulation(1);after.restoreSnapshot(json(s.snapshot()));
  for(let i=0;i<1600&&after.battleClock<seconds('05:03:30');i++)after.tick(.05,{});
  assert.deepEqual(attritionRounds(after),[]);assert.equal(after.actor('pl_east_22').alive,true);assert.equal(after.actor('pl_east_23').alive,false);
});

test('saves from older code load: a hold-window save with the platoon off stage is brought into line on its next tick; the first schema-2 reserve migration is respected',()=>{
  const snap=before0453().snapshot();
  const old=structuredClone(snap);
  for(const a of old.actors.filter(a=>a.group==='grp_east_platoon')){const i=Number(a.id.split('_').at(-1));Object.assign(a,{active:false,state:'GUARD',x:1040+i%4*2,z:38+i%4*.65});}
  validateM01Snapshot(old);
  const s=new M01Simulation(1);s.restoreSnapshot(old);
  assert.ok(platoon(s).every(a=>!a.active&&a.alive),'as the older code saved them');
  s.tick(.05,{});
  assert.ok(platoon(s).every(a=>a.active&&a.alive&&a.state==='GUARD'),'the hold rule puts them on guard on the next tick, with no migration code and no draw');
  assert.deepEqual(platoon(s).map(a=>[a.x,a.z]),Array.from({length:24},(_,i)=>[1040+i%4*2,38+i%4*.65]),'positions kept');
  for(let i=0;i<300&&s.battleClock<seconds('04:54:00');i++)s.tick(.05,{});
  assert.equal(s.actor('pl_east_23').alive,false,'the schedule runs on a migrated save too');assert.equal(s.flags['m01.east_platoon_survivors'],18);
  // the first schema-2 saves have no enemyFire: the six reserve slots come back dead and off stage, the others hold, and nobody is shot twice
  const calm=before0453();for(let i=0;i<100&&(['de_east_0','de_east_1'].some(id=>calm.actor(id).mg34Prone?.phase==='fire_burst')||calm.enemyFire.rounds.length);i++)calm.tick(.05,{});
  const first=calm.snapshot();delete first.enemyFire;
  const m=new M01Simulation(1);m.restoreSnapshot(first);
  assert.ok(platoon(m).slice(18).every(a=>!a.alive&&!a.active&&a.state==='DOWN'));
  for(let i=0;i<500&&m.battleClock<seconds('04:55:00');i++)m.tick(.05,{});
  assert.ok(platoon(m).slice(0,18).every(a=>a.alive&&a.active));assert.deepEqual(attritionRounds(m),[],'the dead reserve is skipped');
  m.battleClock=seconds('05:50:00');m.attritionTick();assert.deepEqual(attritionRounds(m),[],'all six are down: nothing to shoot at');
  assert.equal(m.flags['m01.east_platoon_survivors'],18);
});

// ---------------------------------------------------------------- the renderer: the Panzerzug's flash, gun smoke and burst
function rig(){
  const geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial(),view=Object.create(M01View.prototype);
  Object.assign(view,{camera:{position:new THREE.Vector3()},fireDummy:new THREE.Object3D(),fireColor:new THREE.Color(),characters:null,impacts:[],fireBatches:{},owner:{quality:'high'}});
  for(const [name,n] of Object.entries({muzzle:96,tracer:48,puff:144,spark:96,smoke:64,chip:128}))view.fireBatches[name]=new THREE.InstancedMesh(geometry,material,n);
  return {view,draw(sim){view.updateFire(sim);return structuredClone(view.fx);},matrices(name){return Array.from(view.fireBatches[name].instanceMatrix.array.slice(0,view.fx[name]*16));},
    dispose(){Object.values(view.fireBatches).forEach(b=>b.dispose());geometry.dispose();material.dispose();}};
}
test('renderer: a fixed-origin shot draws a gun flash for 0.15 s, gun smoke for 3.2 s and a burst where the shell lands for 2.4 s, from the published data alone',()=>{
  const r=rig();
  try{
    const shot={ox:1121,oy:3,oz:2.5,ax:1030,ay:-4,az:20,weapon:'pz7_75mm',firedAt:10,arriveAt:10.2};
    const draw=(clock,fixed={dp:shot})=>r.draw({clock,actors:[],enemyFire:{rounds:[]},displayFire:{rounds:[],firedAt:{dp:10},fixed}});
    const at=Object.fromEntries([9.9,10,10.1,10.16,10.5,12.5,12.7,13.1,13.3].map(t=>[t,draw(t)]));
    assert.deepEqual([at[9.9].muzzle,at[9.9].smoke,at[9.9].puff],[0,0,0],'before the shot');
    assert.deepEqual([at[10].muzzle,at[10.1].muzzle,at[10.16].muzzle],[1,1,0],'flash window 0.15 s');
    assert.ok(at[10].smoke>=1&&at[13.1].smoke>=1&&at[13.3].smoke===0,'gun smoke for 3.2 s');
    assert.deepEqual([at[10].puff,at[10.1].puff],[0,0],'nothing lands before arriveAt');
    assert.ok(at[10.5].puff>=6,`a burst of puffs (${at[10.5].puff}) 0.3 s after the shell lands`);assert.ok(at[12.5].puff>=1&&at[12.7].puff===0,'burst for 2.4 s');
    assert.equal(draw(10.5,{}).puff,0);
    // nothing is stored: drawing the same clock twice, or after other clocks, gives the same matrices
    const first=draw(10.5),m1=r.matrices('puff');draw(11);draw(10.5);assert.deepEqual(r.matrices('puff'),m1);assert.deepEqual(draw(10.5),first);
    // spray over water, dust over the deck: both draw their profile's puffs
    const water=draw(10.5,{dp:{...shot,ay:-4}}),deck=draw(10.5,{dp:{...shot,ay:1}});assert.ok(water.puff>=1&&deck.puff>water.puff);
    // a simulation without the field (the T22 shape) still draws, and a deeply frozen display is only read
    assert.equal(r.draw({clock:10.05,actors:[],enemyFire:{rounds:[]},displayFire:{rounds:[],firedAt:{}}}).muzzle,0);
    const frozen=structuredClone({rounds:[],firedAt:{dp:10},fixed:{dp:shot}});
    for(const o of [frozen,frozen.fixed,frozen.fixed.dp,frozen.rounds,frozen.firedAt])Object.freeze(o);
    assert.equal(r.draw({clock:10.05,actors:[],enemyFire:{rounds:[]},displayFire:frozen}).muzzle,1);
  }finally{r.dispose();}
});

test('renderer: the real simulation publishes the Panzerzug shot and the view draws its flash on that very tick and its burst on arrival',()=>{
  const s=new M01Simulation(19390901);s.tick(.05,{skip:true});
  Object.assign(s.player,{x:-400,z:22,y:s.world.heightAt(-400,22)});   // far west: the gate men never take the player as a target
  s.consume(E('train963_arrives'));s.consume(E('panzerzug_arrives'));
  const r=rig(),facade=fixed=>({clock:s.clock,actors:s.actors,enemyFire:s.enemyFire,displayFire:{...s.displayFire,fixed}});
  try{
    let flashed=0,puffed=0,published=null;
    for(let i=0;i<20*400&&!(flashed&&puffed);i++){
      s.tick(.05,{});s.drainEvents();
      const shot=s.displayFire.fixed.dp_east_panzerzug;
      if(!shot)continue;
      if(!published){
        published=shot;assert.deepEqual([shot.ox,shot.oy,shot.oz,shot.weapon],[1121,3,2.5,'pz7_75mm']);assert.ok(shot.ax>=995&&shot.ax<=1046&&shot.az>=-6&&shot.az<=46);
        assert.equal(shot.firedAt,s.clock,'published on the tick it is fired');
        assert.equal(r.draw(facade(s.displayFire.fixed)).muzzle,r.draw(facade({})).muzzle+1,'its flash is drawn on that tick');flashed++;
      }
      if(s.clock>=shot.arriveAt&&s.clock<shot.arriveAt+2&&r.draw(facade(s.displayFire.fixed)).puff>r.draw(facade({})).puff)puffed++;
    }
    assert.ok(published,'the real profile fires within 400 s');assert.ok(flashed>0);assert.ok(puffed>0,'the burst is drawn after the shell lands');
  }finally{r.dispose();}
});

// ---------------------------------------------------------------- the whole route, 12 seeds (plus one with the player firing)
/** One full route against the T22 logic in lockstep: RNG, events, clocks, player, flags, objectives and every man outside the platoon equal at every tick. */
function eastFrontRoute(seed,support,{continuations=false}={}){
  const twin=new T22Logic(seed),victims=Array.from({length:6},(_,i)=>`pl_east_${23-i}`),plan=eastFrontPlan();
  const stats={seed,support,ticks:0,standing:null,slotsHeld:0,firstRound:{},deaths:{},shooters:[],displayRounds:0,windows:[],panzerzug:0,minDistanceToPlayer:Infinity,byProfile:{},
    withdrawAt:null,flagAtWithdraw:null,roundsAfterWithdraw:0};
  const realProfiles=displayProfiles(definition),owner=new Map(realProfiles.flatMap(p=>(p.shooters??[p.id]).map(who=>[who,p.id])));
  let slots=null,counted=0,trainAt=null;const seenRound=new Set(),tracerAt=[],saves={};
  const result=route(seed,{support,onStep:({sim,controls,events,dt})=>{
    stats.ticks++;twin.tick(dt,json(controls));const twinEvents=twin.drainEvents();
    // 1. the T22 logic is equal in everything the hold, the attrition and the display must not touch
    if(sim.rng.state!==twin.rng.state)assert.fail(`rng diverged at tick ${stats.ticks} (seed ${seed}): ${sim.rng.state} vs ${twin.rng.state}`);
    if(sim.clock!==twin.clock||sim.battleClock!==twin.battleClock)assert.fail(`clocks diverged at tick ${stats.ticks} (seed ${seed})`);
    if(JSON.stringify(events)!==JSON.stringify(twinEvents))assert.fail(`events diverged at tick ${stats.ticks} (seed ${seed}): ${JSON.stringify(events)} vs ${JSON.stringify(twinEvents)}`);
    const state=s=>JSON.stringify([s.player,s.flags,s.objectives,s.mission,s.consumed,s.sectors,s.timers,s.weapon.snapshot(),s.grenades,s.destruction,s.subtitle,s.dialogueQueue]);
    if(state(sim)!==state(twin))assert.fail(`state diverged at tick ${stats.ticks} (seed ${seed})`);
    // `facing` is left out on purpose: a rifleman turns to the point he fires at, and the east rifles now aim into the platoon block (by design).
    const man=a=>a.group==='grp_east_platoon'?null:[a.id,a.x,a.y,a.z,a.alive,a.active,a.state,a.health,a.suppressedUntil,a.cooldown,a.firedAt,a.shot];
    if(JSON.stringify(sim.actors.map(man))!==JSON.stringify(twin.actors.map(man)))assert.fail(`another man diverged at tick ${stats.ticks} (seed ${seed})`);
    // 'east' rounds (the rifles' show of fire at the east bridgehead) are left out: they now aim into the platoon block, so their flight time differs by design.
    const gameplay=s=>s.enemyFire.rounds.filter(r=>r.kind!=='attrition'&&r.kind!=='east').map(r=>[r.kind,r.by,r.firedAt,r.arriveAt]);
    if(JSON.stringify(gameplay(sim))!==JSON.stringify(gameplay(twin)))assert.fail(`rounds in flight diverged at tick ${stats.ticks} (seed ${seed})`);
    assert.equal(sim.threat.inFlight,sim.enemyFire.rounds.length,'the HUD threat counts the saved rounds only: display fire is a separate list');
    if(continuations)for(const [label,at] of [['04:47',seconds('04:47:00')],['05:55:50',seconds('05:55:50')]])if(!saves[label]&&sim.battleClock>=at)saves[label]=json(sim.snapshot());
    // 2. the hold: standing from the train, immobile until the withdrawal
    const consumed=id=>sim.consumedEvent(E(id)),holding=consumed('train963_arrives')&&!consumed('east_platoon_withdraws');
    if(consumed('train963_arrives')&&trainAt===null){trainAt=sim.clock;stats.standing=platoon(sim).every(a=>a.active&&a.alive&&a.state==='GUARD');slots=platoon(sim).map(a=>[a.x,a.z]);}
    if(holding&&stats.ticks%20===0){
      assert.deepEqual(platoon(sim).map(a=>[a.x,a.z]),slots,`the platoon stands still (tick ${stats.ticks})`);stats.slotsHeld++;
      assert.equal(sim.flags['m01.east_platoon_survivors'],18,'the flag is 18 until 06:00');
    }
    if(consumed('east_platoon_withdraws')&&stats.withdrawAt===null){
      stats.withdrawAt=sim.clock;stats.flagAtWithdraw=sim.flags['m01.east_platoon_survivors'];
      assert.ok(platoon(sim).slice(18).every(a=>!a.active&&!a.alive),'the reserves are off stage and dead at 06:00');
      assert.ok(platoon(sim).slice(0,18).every(a=>a.active&&a.alive),'the eighteen run on');
    }
    // 3. attrition rounds and falls
    for(const x of attritionRounds(sim)){
      if(seenRound.has(x.id))continue;seenRound.add(x.id);
      assert.ok(validRound(x,sim.clock));assert.ok(ATTRITION_SHOOTER.test(x.by)&&x.weapon==='kar98k',`${x.by} is a rifleman`);stats.shooters.push(x.by);
      stats.firstRound[x.victim]??={battle:clockText(sim.battleClock),clock:+sim.clock.toFixed(2),by:x.by};
      assert.ok(sim.battleClock<seconds('05:56:00'),`a round at ${clockText(sim.battleClock)}, after the cutoff`);
      if(stats.withdrawAt!==null)stats.roundsAfterWithdraw++;
    }
    for(const id of victims){
      const a=sim.actor(id);
      if(!a.alive&&!stats.deaths[id]&&!consumed('east_platoon_withdraws')){
        stats.deaths[id]={battle:clockText(sim.battleClock),clock:+sim.clock.toFixed(2),flag:sim.flags['m01.east_platoon_survivors'],active:a.active};
        assert.equal(a.state,'DOWN');assert.ok(Number.isFinite(a.diedAt)&&a.diedAt===sim.clock,'killed by a landing round (recordDeath), not by the rule of 06:00');
        assert.equal(sim.flags['m01.east_platoon_survivors'],18,'the flag does not move for an attrition fall');
      }
    }
    // 4. display fire, counted on the tick it is made: never near the player, by side, the train east only
    if(sim.display.nextId>counted){
      for(const r of sim.display.rounds){
        const n=Number(r.id.slice('m01_display_'.length));if(n<counted)continue;
        stats.displayRounds++;const p=owner.get(r.by);stats.byProfile[p]=(stats.byProfile[p]??0)+1;
        stats.minDistanceToPlayer=Math.min(stats.minDistanceToPlayer,dist(sim.player,{x:r.ox,z:r.oz}),dist(sim.player,{x:r.ax,z:r.az}));
        if(r.tracer)tracerAt.push([sim.clock,r.by.startsWith('pl_east')?'pl':'de']);
        if(r.weapon==='pz7_75mm'){stats.panzerzug++;assert.ok(r.ox===1121&&r.ax>=995&&r.ax<=1046&&r.az>=-6&&r.az<=46,'the Panzerzug fires east only');}
      }
      counted=sim.display.nextId;
    }
  }});
  const sim=result.sim;
  // falls: exactly six, in order, at the fixed times, by attrition rounds, before 05:56
  assert.deepEqual(Object.keys(stats.deaths),victims,'six falls, pl_east_23 first and pl_east_18 last');
  plan.attrition.forEach((e,i)=>{
    const d=stats.deaths[e.victim],round=stats.firstRound[e.victim];
    assert.ok(round,`${e.victim} was shot by an attrition round`);
    assert.ok(seconds(round.battle)>=e.at&&seconds(round.battle)<e.at+15,`${e.victim} is shot at ${round.battle} (due ${clockText(e.at)})`);
    assert.ok(d.clock>=round.clock&&d.clock-round.clock<1,`${e.victim} falls ${(d.clock-round.clock).toFixed(2)} s after the round`);
    assert.ok(seconds(d.battle)<seconds('05:56:00'),`${e.victim} falls before 05:56 (${d.battle})`);
    if(i)assert.ok(d.clock>stats.deaths[plan.attrition[i-1].victim].clock);
  });
  assert.equal(stats.flagAtWithdraw,18,'18 survivors at 06:00, then the existing rule applies');
  assert.equal(stats.roundsAfterWithdraw,0,'no attrition round after the withdrawal');
  assert.ok(stats.shooters.length>=6&&stats.shooters.every(by=>!['de_east_0','de_east_1'].includes(by)),'rifle rounds only, one per fall unless a wall made one retry');
  assert.ok(stats.standing&&stats.slotsHeld>50,JSON.stringify([stats.standing,stats.slotsHeld]));
  assert.ok(sim.mission.complete&&sim.player.health>0&&sim.flags['m01.east_platoon_survivors']>=12);
  // display: both sides trace across the river in every 90 s window of the hold; the train fires east only; nothing near the player
  const windows=Math.floor((stats.withdrawAt-trainAt)/90);
  for(let k=0;k<windows;k++){
    const inWindow=tracerAt.filter(([t])=>t>=trainAt+k*90&&t<trainAt+(k+1)*90),w={from:+(trainAt+k*90).toFixed(1),pl:inWindow.filter(([,s])=>s==='pl').length,de:inWindow.filter(([,s])=>s==='de').length};
    stats.windows.push(w);assert.ok(w.pl>=6&&w.de>=6,`90 s window ${JSON.stringify(w)} needs 6 tracers on each side`);
  }
  assert.ok(windows>=2,`the hold lasts ${(stats.withdrawAt-trainAt).toFixed(0)} s`);
  for(const p of realProfiles)assert.ok(stats.byProfile[p.id]>0,`${p.id} produced display rounds`);
  assert.ok(stats.panzerzug>=1&&sim.display.fixed.dp_east_panzerzug,'the Panzerzug fired at least once (display only)');
  assert.ok(stats.minDistanceToPlayer>=500,`display fire stays ${stats.minDistanceToPlayer.toFixed(0)} m from the player`);
  // saves taken during the route continue exactly as the original did: with the platoon holding at 04:47, and just before the withdrawal (through it)
  for(const [label,ticks] of [['04:47',200],['05:55:50',700]])if(continuations){
    assert.ok(saves[label],`a save at ${label}`);const copy=new M01Simulation(1);copy.restoreSnapshot(saves[label]);
    assert.equal(compareContinuation(copy,{label:`east front ${label}`,ticks,doubleAt:[7]}).firstDivergence,null);
    if(label==='05:55:50')assert.ok(copy.consumedEvent(E('east_platoon_withdraws'))&&platoon(copy).slice(0,18).every(a=>a.x<saves[label].actors.find(b=>b.id===a.id).x),'the continuation ran through the withdrawal');
  }
  report.routes.push({...stats,finalRng:sim.rng.state,finalClock:sim.clock,health:sim.player.health,survivors:sim.flags['m01.east_platoon_survivors'],attritionRounds:stats.shooters.length});
}
for(const seed of SEEDS)test(`east front seed ${seed}: route completes; six fixed falls by attrition rounds; against the T22 logic RNG, events and every other man are equal at every tick`,()=>eastFrontRoute(seed,false,{continuations:seed===SEEDS[0]}));
if(!process.env.M01_EAST_FRONT_SEEDS)test('east front with covering fire (seed 7, the golden support route): the same, with the player shooting the gate MG and the Germans on the spans',()=>eastFrontRoute(7,true));
