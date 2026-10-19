// Combat slice 2b: the Polish rearguard of the deck assault (grp_east_platoon.rearguard, src/game/m01-rearguard.js). State-level tests of the simulation on the real test pilot
// (tests/helpers/m01-route.js); not a browser playthrough and not a playtest.
import test from 'node:test';
import assert from 'node:assert/strict';
import definition from '../missions/m01-tczew/mission.json' with { type: 'json' };
import { M01Simulation, seconds } from '../src/game/m01-simulation.js';
import { REARGUARD, rearguardPlan } from '../src/game/m01-rearguard.js';
import { HOLD_AREA } from '../src/game/m01-pacing.js';
import { traceShot } from '../src/world/spatial.js';
import { driver, toRepair, route } from './helpers/m01-route.js';

const MEN=REARGUARD.men;
const deckRoundsKey=sim=>sim.actors.filter(a=>a.group==='grp_de_spans'&&a.deck).map(a=>`${a.suppressedUntil}/${a.health}`).join();

/** Every rearguard round, checked as it leaves the muzzle: no friend (the player, any ally but the shooter) on the dispersed ray short of what it hit. */
class Watched extends M01Simulation{
  constructor(...args){super(...args);this.rearShots=[];}
  rearguardShot(a){this.shooting=a;try{super.rearguardShot(a);}finally{this.shooting=null;}}
  suppressAlong(origin,dir,hit){
    if(this.shooting){
      const a=this.shooting,friends=this.rearguardFriends(a),reach=hit?.distance??1200,onRay=traceShot(this.world,origin,dir,friends,reach);
      this.rearShots.push({by:a.id,clock:this.clock,friendOnRay:onRay?.kind==='actor'?onRay.actor.id:null,hit:hit?.actor?.id??null,battleClock:this.battleClock,holds:this.rearguardHolds()});
    }
    return super.suppressAlong(origin,dir,hit);
  }
}
/** The control route's steps to the deck post, then the clock until `until` holds (no firing). */
function toDeck(seed,Simulation,until){
  const d=toRepair(driver(seed,{Simulation})),{sim,step,walk}=d;
  walk(-115,27);walk(-28,28);step({crouch:true});d.until(()=>sim.active('hold_access'),500);step({crouch:true});
  walk(-115,32);walk(-30,40);walk(-10,40);walk(30,40);d.until(()=>until(sim),900);
  return d;
}
const allHolding=sim=>MEN.every(id=>sim.actor(id).rear?.phase==='hold')&&sim.rearShots?.length>=3;
let control,staged;
const controlRun=()=>control??=(()=>{const events=[];const r=route(19390901,{Simulation:Watched,onStep:({events:e})=>events.push(...e)});return {...r,all:events};})();
const holdState=()=>staged??=toDeck(19390901,Watched,allHolding);

test('rearguard data: three men who are never victims of the 20 s rule, posts on the deck outside the deck post, off the platoon file and the support pilot line',()=>{
  const g=definition.groups.find(x=>x.id==='grp_east_platoon');
  assert.deepEqual(MEN,['pl_east_0','pl_east_1','pl_east_2']);
  // The victim of the 20 s rule is pl_east_{n-1} with n > survivorsRange[0] (12), so every index below 12 survives it.
  for(const id of MEN)assert.ok(Number(id.slice(8))<g.survivorsRange[0],id);
  for(const p of REARGUARD.posts){
    assert.ok(p.x>HOLD_AREA.maxX,'outside the deck post (HOLD_AREA)');assert.ok(p.x<663,'west of the spans the east demolition fells');
    assert.ok(p.z-38.15>=.5,'a body clear of the running file (z 37.8 / 38.15, personal space 0.5 m)');
    assert.ok(41.7-p.z>=1.5,'clear of the support pilot line (z 41.7 at x 170, measured)');
  }
  const bad=structuredClone(definition);bad.groups.find(x=>x.id==='grp_east_platoon').rearguard.men=['pl_east_12','pl_east_1','pl_east_2'];
  assert.throws(()=>rearguardPlan(bad),/below the survivors floor/);
  const near=structuredClone(definition);near.groups.find(x=>x.id==='grp_east_platoon').rearguard.posts[1]=[165.5,38.7];
  assert.throws(()=>rearguardPlan(near),/1\.3 m apart/);
});

test('control route: the rearguard forms when the gate holds the clock for the deck, fires real rounds at the deck and never through a friend',()=>{
  const {sim}=controlRun(),shots=sim.rearShots;
  assert.ok(shots.length>=20,`rearguard rounds ${shots.length}`);
  for(const s of shots){assert.equal(s.friendOnRay,null,`${s.by} at ${s.clock.toFixed(2)}: a friend on the ray`);assert.equal(s.battleClock,seconds('06:09:30'),'only while the gate holds');assert.ok(s.holds);}
  assert.ok(shots.some(s=>s.hit?.startsWith('de_spans_')),'some round finds a German of the deck');
  assert.ok(new Set(shots.map(s=>s.by)).size===3,'all three men fire');
  for(const id of MEN){const a=sim.actor(id);assert.equal(a.alive,true,`${id} lives (the rearguard is never a casualty)`);assert.equal(a.rear.phase,'released');}
  assert.equal(sim.flags['m01.east_platoon_survivors'],12,'survivors unchanged: the 20 s rule runs on the battle clock, held during the gate');
});

test('the rearguard resumes the withdrawal once the deck is clear and is west of the firing point before the west demolition',()=>{
  const {sim,all}=controlRun();
  const released=sim.actors.filter(a=>MEN.includes(a.id)).map(a=>a.rear.since),blast=sim.consumed.evt_m01_east_demolition;
  for(const t of released)assert.ok(t<=blast,'released at the latest on the east demolition tick');
  for(const id of MEN)assert.ok(sim.actor(id).x<-90,`${id} reached the west (x ${sim.actor(id).x.toFixed(1)})`);
  assert.ok(all.filter(e=>e.type==='npc-shot'&&MEN.includes(e.by)).every(e=>Number.isFinite(e.point.x)&&e.point.x>160&&e.point.x<180),'every report from a post');
});

test('posture: kneeling at the post, up only to shoot (riseBeforeSec / holdAfterSec), down while suppressed',()=>{
  const d=holdState(),{sim}=d;let kneel=0,up=0;
  for(let i=0;i<20*30;i++){
    d.step({});
    for(const id of MEN){const a=sim.actor(id);if(a.rear.phase!=='hold')continue;
      if(sim.clock<a.suppressedUntil)assert.equal(a.crouched,true,`${id} suppressed is down`);
      if(a.firedAt===sim.clock)assert.equal(a.crouched,false,`${id} fires standing`);
      if(a.crouched)kneel++;else up++;}
  }
  assert.ok(kneel>up,`kneeling ${kneel} standing ${up}`);assert.ok(up>0);
});

test('line of fire: with the player standing in front of the posts the rearguard holds its fire; off the line it fires again',()=>{
  const {sim}=holdState(),saved=sim.snapshot(),run=(x,z)=>{
    const s=new Watched();s.restoreSnapshot(saved);Object.assign(s.player,{x,z,y:s.world.heightAt(x,z),crouched:false});
    const before=s.rearShots.length;for(let i=0;i<20*25;i++){s.player.x=x;s.player.z=z;s.tick(.05,{});}
    return s.rearShots.slice(before);
  };
  assert.equal(run(200,38.7).length,0,'nobody fires through the player');
  assert.ok(run(30,40).length>0,'back at the deck post, the rearguard fires');
});

test('restore-safe: a save in the hold plays out identically; corrupt rearguard records are rejected',()=>{
  const {sim}=holdState(),saved=sim.snapshot(),a=new M01Simulation(),b=new M01Simulation();
  assert.equal(a.loadCheckpoint(JSON.stringify(saved)).ok,true);b.restoreSnapshot(saved);
  for(let i=0;i<20*20;i++){a.tick(.05);b.tick(.05);}
  assert.deepEqual(a.snapshot(),b.snapshot());
  const i0=saved.actors.findIndex(x=>x.id==='pl_east_0');
  for(const corrupt of [s=>{s.actors[i0].rear.phase='fire';},s=>{delete s.actors[i0].ai;},s=>{s.actors[i0].rear.since=s.clock+5;},s=>{s.actors[i0].rear.extra=1;},
    s=>{const j=s.actors.findIndex(x=>x.id==='pl_east_7');s.actors[j].rear=structuredClone(s.actors[i0].rear);s.actors[j].ai=structuredClone(s.actors[i0].ai);},
    s=>{delete s.actors[i0].rear;},   // an AI stream on a platoon man without the record
    s=>{delete s.consumed.evt_m01_germans_on_east_spans;}]){
    const data=structuredClone(saved);corrupt(data);assert.equal(new M01Simulation().loadCheckpoint(JSON.stringify(data)).ok,false);
  }
  // A save made in the gate by the code before slice 2b (no records): the men get theirs on the next tick, from the saved main state (no draw), and form.
  const old=structuredClone(saved);for(const x of old.actors)if(MEN.includes(x.id)){delete x.rear;delete x.ai;}
  const c=new M01Simulation();assert.equal(c.loadCheckpoint(JSON.stringify(old)).ok,true);c.tick(.05);
  assert.ok(MEN.every(id=>c.actor(id).rear?.phase==='post'||c.actor(id).rear?.phase==='hold'));assert.equal(c.rng.state,old.rng);
});

test('deterministic: the same seed gives the same rearguard, round for round',()=>{
  const run=()=>toDeck(7,Watched,sim=>sim.consumedEvent('evt_m01_east_demolition')).sim;
  const one=run(),two=run();
  assert.ok(one.rearShots.length>0);
  assert.deepEqual(two.rearShots,one.rearShots);assert.deepEqual(two.snapshot(),one.snapshot());
});

test('passive player: summed over five seeds the deck fight resolves sooner with the rearguard than without it, and Polish rounds reach the deck',()=>{
  // The control pilot to the east demolition (never fires), with the rearguard and with it switched off (rearguardHolds false), on the same five seeds measured for the
  // dispersion (19390901, 7, 3, 4, 11). Not a per-seed claim: the fight's floor is maxSec (165 s after the entry) plus the ~92 s run back to clearX, and from x 165-175
  // the rearguard first fires ~130 s after the entry, so only kills shorten it; measured 2026-10-19: on 19390901 it is equal (262.3 s both ways), on the others 7-35 s shorter.
  class NoRearguard extends M01Simulation{rearguardHolds(){return false;}}
  const measure=(seed,Simulation)=>{let rounds=0;
    class Probe extends Simulation{rearguardShot(a){const k=deckRoundsKey(this);super.rearguardShot(a);if(deckRoundsKey(this)!==k)rounds++;}}
    const sim=toDeck(seed,Probe,s=>s.consumedEvent('evt_m01_east_demolition')).sim;
    return {fight:sim.consumed.evt_m01_east_demolition-sim.consumed.evt_m01_germans_on_east_spans,rounds};
  };
  let without=0,withIt=0,rounds=0;
  for(const seed of [19390901,7,3,4,11]){
    const a=measure(seed,NoRearguard),b=measure(seed,M01Simulation);assert.equal(a.rounds,0);
    assert.ok(b.fight<=a.fight+1e-6,`seed ${seed}: never longer (${a.fight.toFixed(1)} -> ${b.fight.toFixed(1)} s)`);
    without+=a.fight;withIt+=b.fight;rounds+=b.rounds;
  }
  assert.ok(withIt<without,`summed fight ${without.toFixed(1)} -> ${withIt.toFixed(1)} s`);assert.ok(rounds>=50,`rounds at the deck ${rounds}`);
});
