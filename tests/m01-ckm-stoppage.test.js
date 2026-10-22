// 2026-10-22 (owner decision, golden amendment 13): the ckm wz.30 stops. A table of stoppages (CKM_STOPPAGES), the phase `stoppage` of the gunner's machine and its clearAt, the events
// `ckm_stoppage` / `ckm_stoppage_cleared`, the crew copying the gunner, the saves (older ones load; every malformed one is refused atomically), the window of fire, the demolition,
// and the proof that nothing is drawn and nothing but the gun and the voices is touched. State tests and Node routes: they prove the machine, not how it looks or sounds in a game.
// The dialogue half (114 and 115 on the events, priority, the two voices) is in tests/m01-barks.test.js; the clips in tests/m01-ckm-live-presentation.test.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation,validateM01Snapshot,seconds,clockText,ckmMuzzle,CKM_STOPPAGES,CKM_BELT,CKM_BURST_ROUNDS,CKM_FEED_SEC} from '../src/game/m01-simulation.js';
import {validateM01AudioEvent} from '../src/game/m01-audio-events.js';
import {route} from './helpers/m01-route.js';
import {compareContinuation,json,firstDifference} from './helpers/m01-determinism.js';
import {CkmGhostSimulation} from './helpers/m01-ckm-neutral.js';
import {firstStoppage} from './helpers/m01-ckm-scenario.js';

const E=name=>`evt_m01_${name}`;
const BLOCKED=/Checkpoint M01 inválido/;
const MUZZLE=ckmMuzzle();
const gunnerOf=s=>s.actors.find(a=>a.id==='ckm_gunner');
const crewOf=s=>['ckm_gunner','ckm_loader','ckm_reserve'].map(id=>s.actors.find(a=>a.id===id));
const restore=raw=>{const s=new M01Simulation();s.restoreSnapshot(structuredClone(raw));s.drainEvents();return s;};
const FROM=seconds('04:46:00'),CEASE=seconds('06:09:30');
const BELT_BURSTS=Math.floor(CKM_BELT/CKM_BURST_ROUNDS);   // 41 bursts of 8 leave 2 rounds of a belt of 330, which is then changed

let cachedFirst;const first=()=>cachedFirst??=firstStoppage();

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The table
test('the table of stoppages: one to three, in order, each cleared in at least the feed drill of the clips and at most 5 s, away from the belt change',()=>{
  assert.ok(Object.isFrozen(CKM_STOPPAGES)&&CKM_STOPPAGES.every(Object.isFrozen));
  assert.ok(CKM_STOPPAGES.length>=1&&CKM_STOPPAGES.length<=3,`${CKM_STOPPAGES.length} stoppages`);
  let previous=0;
  for(const s of CKM_STOPPAGES){
    assert.ok(Number.isInteger(s.after)&&s.after>previous,'slots are in order of the bursts they wait for');previous=s.after;
    assert.ok(s.sec>=CKM_FEED_SEC&&s.sec>=3&&s.sec<=5,`clearance ${s.sec} s: at least the 3.2 s feed drill of the clips, at most 5 s`);
    // 112 / 113 (the belt change) belong to burst 41 and 82: keep the two stories at least two bursts apart.
    const r=s.after%BELT_BURSTS;assert.ok(Math.min(r,BELT_BURSTS-r)>=2,`slot ${s.after} is within a burst of a belt change`);
  }
});

test('the event contract: both name the man, the clock, the muzzle and the stoppage of the mission, ckm_stoppage also its clearAt; anything else is refused',()=>{
  const stop={type:'ckm_stoppage',by:'ckm_gunner',at:12.5,clearAt:16.3,origin:{x:8,y:-2.36,z:26},n:1};
  const done={type:'ckm_stoppage_cleared',by:'ckm_loader',at:16.3,origin:{x:8,y:-2.36,z:26},n:1};
  assert.equal(validateM01AudioEvent(stop),stop);assert.equal(validateM01AudioEvent(done),done);
  for(const bad of [{...stop,at:Number.NaN},{...stop,clearAt:undefined},{...stop,clearAt:12.5},{...stop,clearAt:Number.NaN},{...stop,by:''},{...stop,by:3},{...stop,origin:undefined},{...stop,origin:{x:8,y:Number.NaN,z:26}},
    {...stop,n:0},{...stop,n:1.5},{...stop,n:undefined}])assert.throws(()=>validateM01AudioEvent(bad),/ckm_stoppage/);
  for(const bad of [{...done,at:Number.NaN},{...done,by:undefined},{...done,origin:undefined},{...done,n:0}])assert.throws(()=>validateM01AudioEvent(bad),/ckm_stoppage_cleared/);
  const {onset,cleared}=first();
  assert.equal(validateM01AudioEvent(structuredClone(onset.event)).type,'ckm_stoppage');assert.equal(validateM01AudioEvent(structuredClone(cleared.event)).type,'ckm_stoppage_cleared');
  assert.deepEqual(onset.event.origin,{x:MUZZLE.x,y:MUZZLE.y,z:MUZZLE.z});assert.deepEqual(cleared.event.origin,{x:MUZZLE.x,y:MUZZLE.y,z:MUZZLE.z});
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The first stoppage of the real control route, tick by tick
test('the first stoppage strikes instead of the burst it waits for: no round, the belt and the stream untouched, all three men in the phase with the same clearAt',{timeout:240000},()=>{
  const {pre,onset,mid}=first(),slot=CKM_STOPPAGES[0];
  assert.equal(onset.event.n,1);assert.equal(onset.event.by,'ckm_gunner');assert.equal(onset.event.at,onset.clock);assert.equal(onset.event.clearAt,onset.clock+slot.sec,'cleared in the slot\'s seconds');
  assert.ok(onset.battleClock>=FROM&&onset.battleClock<CEASE,`strikes inside the window of fire: ${clockText(onset.battleClock)}`);
  assert.equal(onset.bursts,slot.after,'the gun had fired exactly the bursts the slot waits for, and this one is not fired');
  // One tick before: the shape an OLDER build saved (nothing new in it); the decision tick produces the stoppage.
  const g0=gunnerOf(pre);assert.deepEqual(Object.keys(g0.ckmFire).sort(),['belt','bursts','engagedUntil','nextAt','rng'],'no jams key before the first stoppage');
  for(const a of crewOf(pre))assert.equal(a.ckm.clearAt,undefined);
  assert.equal(g0.ckmFire.bursts,slot.after);assert.equal(g0.ckm.burstPlan,undefined,'nothing in the air');
  const s=restore(pre);let struck=null;
  for(let i=0;i<4&&!struck;i++){s.tick(.05);const events=s.drainEvents();assert.ok(!events.some(e=>e.type==='ally-fire'),'no burst before or on the tick it strikes');struck=events.find(e=>e.type==='ckm_stoppage')??null;}
  assert.ok(struck,'the restored save strikes it');assert.equal(struck.at,s.clock);assert.equal(struck.clearAt,s.clock+slot.sec);
  const g=gunnerOf(s);
  assert.equal(g.ckm.phase,'stoppage');assert.equal(g.ckm.startedAt,s.clock);assert.equal(g.ckm.clearAt,s.clock+slot.sec);assert.equal(g.ckm.burstPlan,undefined);
  assert.equal(g.ckmFire.jams,1);assert.equal(g.ckmFire.bursts,slot.after,'the burst was not fired');assert.equal(g.ckmFire.belt,g0.ckmFire.belt,'not a round left the belt');
  assert.equal(g.ckmFire.rng,g0.ckmFire.rng,'nothing was drawn from the gun\'s own stream: the dispersion of every burst is what it was');
  for(const a of crewOf(s)){assert.equal(a.ckm.phase,'stoppage',a.id);assert.equal(a.ckm.startedAt,g.ckm.startedAt,a.id);assert.equal(a.ckm.clearAt,g.ckm.clearAt,a.id);}
  validateM01Snapshot(s.snapshot());
  // Two seconds in: still stopped, the same record on all three men.
  const m=restore(mid);assert.equal(gunnerOf(m).ckm.phase,'stoppage');assert.deepEqual(crewOf(m).map(a=>a.ckm.clearAt),Array(3).fill(onset.event.clearAt));
});

test('the gun is silent until the loader has cleared it, then says so once, and the burst it was about to fire follows at once',{timeout:240000},()=>{
  const {onset,cleared,between,next,after}=first(),slot=CKM_STOPPAGES[0];
  assert.deepEqual(between.filter(t=>t==='ally-fire'),[],'no burst between the stoppage and its clearance');
  assert.ok(cleared.clock>=onset.event.clearAt&&cleared.clock<onset.event.clearAt+.0501,`cleared at ${cleared.clock} for ${onset.event.clearAt}`);
  assert.equal(cleared.event.type,'ckm_stoppage_cleared');assert.equal(cleared.event.by,'ckm_loader');assert.equal(cleared.event.n,1);assert.equal(cleared.event.at,cleared.clock);
  assert.ok(next,'the gun fires again');assert.ok(next.clock>=cleared.clock,'never before it is cleared');assert.ok(next.clock-cleared.clock<=1+1e-9,`${next.clock-cleared.clock} s after: still laid on the German`);
  const g=gunnerOf(restore(after));assert.notEqual(g.ckm.phase,'stoppage');assert.equal(g.ckm.clearAt,undefined);assert.equal(g.ckmFire.jams,1,'the count stays');
  assert.ok([slot.after,slot.after+1].includes(g.ckmFire.bursts));
  assert.deepEqual(crewOf(restore(after)).map(a=>a.ckm.clearAt),[undefined,undefined,undefined]);
  validateM01Snapshot(after);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// Nothing is drawn; nothing but the gun and the voices is touched
const GhostNoJam=class extends CkmGhostSimulation{ckmJamDue(){return false;}};
test('a stoppage changes only the gun, its crew and the dialogue: with the rounds made harmless, the main random state and every other actor are identical tick by tick with and without it',{timeout:240000},()=>{
  const {pre}=first();
  const jam=new CkmGhostSimulation(),free=new GhostNoJam();jam.restoreSnapshot(structuredClone(pre));free.restoreSnapshot(structuredClone(pre));
  // The ledger and the queue are what the voices said (114 and 115 only in the world with the stoppage): set aside, like timers.barks in tests/m01-ckm-live-fire.test.js; the rest must be equal.
  const strip=s=>{const v=s.snapshot(false);v.actors=v.actors.filter(a=>!a.id.startsWith('ckm_'));for(const k of ['dialogueConsumed','dialogueQueue','subtitle','resumeCheckpoint'])delete v[k];delete v.timers.barks;return v;};
  let stoppages=0,clears=0;
  for(let i=0;i<500;i++){   // 25 s: the stoppage (3.8 s), the burst that follows, the next ones
    jam.tick(.05,{crouch:i===0});free.tick(.05,{crouch:i===0});
    for(const e of jam.drainEvents()){if(e.type==='ckm_stoppage')stoppages++;if(e.type==='ckm_stoppage_cleared')clears++;}free.drainEvents();
    assert.equal(jam.rng.state,free.rng.state,`main rng at tick ${i}`);
    if(i%5===0)assert.deepEqual(firstDifference(strip(jam),strip(free)),null,`world at tick ${i}`);
  }
  assert.equal(stoppages,1);assert.equal(clears,1);assert.equal(free.ckm.jams,0);assert.equal(jam.ckm.jams,1);
  assert.ok(free.ckm.bursts>=jam.ckm.bursts,'the gun without the stoppage has fired at least as many bursts');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// Saves
test('a save in the middle of a stoppage restores to the same state and continues identically, across its clearance and the burst after it; a double restore changes nothing',{timeout:240000},()=>{
  const {mid,pre}=first();
  const s=restore(mid);assert.deepEqual(s.snapshot(),json(mid),'restore is the identity');validateM01Snapshot(s.snapshot());
  compareContinuation(s,{label:'ckm-stoppage-mid',ticks:260,doubleAt:[1,20,38,39,60,120],dt:t=>t%7===0?.013:.05,input:()=>({})});
  compareContinuation(restore(pre),{label:'ckm-stoppage-pre',ticks:200,doubleAt:[1,2,40],input:t=>({crouch:t===0})});
});

test('save validation: a stoppage no machine could have produced is refused atomically, and the shapes it produces load',{timeout:240000},()=>{
  const {mid}=first(),target=new M01Simulation(),baseline=target.snapshot(),slot=CKM_STOPPAGES[0];
  validateM01Snapshot(structuredClone(mid));validateM01Snapshot(JSON.parse(JSON.stringify(mid)));
  const gun=raw=>raw.actors.find(a=>a.id==='ckm_gunner'),loader=raw=>raw.actors.find(a=>a.id==='ckm_loader'),reserve=raw=>raw.actors.find(a=>a.id==='ckm_reserve');
  const crew=raw=>[gun(raw),loader(raw),reserve(raw)];
  const mutations={
    'stoppage without a clearAt':raw=>{delete gun(raw).ckm.clearAt;},
    'clearAt on a phase that is not a stoppage':raw=>{for(const a of crew(raw))a.ckm.phase='aim';},
    'clearAt not a number':raw=>{gun(raw).ckm.clearAt='4';},
    'clearAt NaN':raw=>{gun(raw).ckm.clearAt=Number.NaN;},
    'clearance shorter than the feed drill':raw=>{for(const a of crew(raw))a.ckm.clearAt=a.ckm.startedAt+CKM_FEED_SEC-.2;},
    'clearance longer than 5 s':raw=>{for(const a of crew(raw))a.ckm.clearAt=a.ckm.startedAt+5.5;},
    'clearAt already past (a stoppage nobody cleared)':raw=>{for(const a of crew(raw)){a.ckm.startedAt=raw.clock-slot.sec-1;a.ckm.clearAt=a.ckm.startedAt+slot.sec;}},
    'the gunner\'s clearance is not his slot\'s':raw=>{for(const a of crew(raw))a.ckm.clearAt+=.4;},
    'no jams on the gunner':raw=>{delete gun(raw).ckmFire.jams;},
    'jams zero':raw=>{gun(raw).ckmFire.jams=0;},
    'jams fractional':raw=>{gun(raw).ckmFire.jams=1.5;},
    'jams above the table':raw=>{gun(raw).ckmFire.jams=CKM_STOPPAGES.length+1;},
    'jams struck before the bursts its slot waits for':raw=>{gun(raw).ckmFire.bursts=slot.after-1;},
    'jams on the loader':raw=>{loader(raw).ckmFire={...gun(raw).ckmFire};},
    'extra key on the fire record':raw=>{gun(raw).ckmFire.mood=1;},
    'the loader stopped with another clearAt':raw=>{loader(raw).ckm.clearAt+=.05;},
    'the loader stopped with another start':raw=>{loader(raw).ckm.startedAt-=.05;},
    'the loader stopped while the gunner fires':raw=>{gun(raw).ckm={phase:'aim',startedAt:raw.clock-1,visible:true};},
    'a burst plan on a stoppage':raw=>{gun(raw).ckm.burstPlan={policy:'disabled',startedAt:raw.clock-1,rounds:6,interval:.075,emitted:0};},
    'a stoppage on a dead gunner':raw=>{Object.assign(gun(raw),{alive:false,health:0,state:'DOWN'});},
    'a stoppage on a dead loader':raw=>{Object.assign(loader(raw),{alive:false,health:0,state:'DOWN'});},
    'a stoppage before the gun opens fire (04:46:00)':raw=>{raw.battleClock=seconds('04:45:59');},
    'an unknown key on the stoppage record':raw=>{gun(raw).ckm.extra=1;},
  };
  for(const [label,mutate] of Object.entries(mutations)){
    const bad=structuredClone(mid);mutate(bad);
    if(JSON.stringify(bad)===JSON.stringify(mid))continue;
    assert.throws(()=>validateM01Snapshot(structuredClone(bad)),BLOCKED,label);
    assert.throws(()=>target.restoreSnapshot(structuredClone(bad)),BLOCKED,label);
    assert.deepEqual(target.snapshot(),baseline,`${label}: the running simulation is untouched`);
  }
});

test('older saves load: every save before the first stoppage is valid as it is, and one made later with no jams record meets its stoppage at the next burst, once',{timeout:240000},()=>{
  const {pre}=first(),slot=CKM_STOPPAGES[0];
  // (a) The shape an older build saved is the shape of every save before the first stoppage: five keys, no clearAt anywhere. It loads, writes nothing new, and the stoppage comes when the table says.
  validateM01Snapshot(structuredClone(pre));
  const a=restore(pre);assert.deepEqual(a.snapshot(),json(pre),'restoring writes nothing new into it');
  let struck=false;for(let i=0;i<4&&!struck;i++){a.tick(.05);struck=a.drainEvents().some(e=>e.type==='ckm_stoppage');}assert.ok(struck);
  // (b) A save of an older build made later in the mission (more bursts than the slot waits for, no jams record, the gun in the quiet cycle): it loads and the NEXT burst is the stoppage.
  // A slot a save is already past is struck at the next burst; a save made later than the second slot too meets them one after the other (3.8 s, then 4.6 s of silence): nothing is lost
  // and nothing is struck twice, and the table is then used up.
  const lateAt=bursts=>{
    const raw=structuredClone(pre);gunnerOf(raw).ckmFire.bursts=bursts;gunnerOf(raw).ckmFire.belt=CKM_BELT-8*(bursts%BELT_BURSTS);validateM01Snapshot(structuredClone(raw));
    const sim=restore(raw),struck=[],cleared=[];let fired=0;
    for(let i=0;i<600;i++){sim.tick(.05,{crouch:i===0});for(const e of sim.drainEvents()){if(e.type==='ckm_stoppage')struck.push(e.n);if(e.type==='ckm_stoppage_cleared')cleared.push(e.n);if(e.type==='ally-fire')fired++;}}
    return {sim,struck,cleared,fired};
  };
  const one=lateAt(slot.after+3);
  assert.deepEqual(one.struck,[1],'one stoppage in 30 s');assert.deepEqual(one.cleared,[1]);assert.ok(one.fired>=1,'and the gun goes on firing');assert.equal(one.sim.ckm.jams,1);
  if(CKM_STOPPAGES.length>1){
    const both=lateAt(CKM_STOPPAGES[1].after+2);
    assert.deepEqual(both.struck,[1,2],'both overdue slots strike, in order');assert.deepEqual(both.cleared,[1,2]);assert.equal(both.sim.ckm.jams,2);assert.ok(both.fired>=1);
  }
  // (c) The pre-T47 saves (no fire record at all) keep loading: tests/m01-ckm-live-fire.test.js.
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The window of fire, the demolition, a man who falls
test('no stoppage outside the window of fire: not before 04:46:00, not from 06:09:30, whatever the table says; one under way when the window closes clears by the clock and no burst follows',()=>{
  const {pre,mid}=first(),slot=CKM_STOPPAGES[0];
  // The gun is laid on a live German and due, with the table waiting: only the clock of the battle decides. (Direct calls of the machine: nothing else of the world moves.)
  const probe=at=>{
    const s=restore(pre),g=gunnerOf(s),target=s.enemies.find(a=>a.group==='grp_de_east'&&a.alive);
    s.ckmTarget=()=>target;g.ckmFire.nextAt=0;g.ckmFire.engagedUntil=s.clock+5;g.ckmFire.bursts=slot.after;g.ckm={phase:'aim',startedAt:s.clock,visible:true};
    s.battleClock=at;s.updateCKMGunner(g,false);return {s,events:s.drainEvents(),g};
  };
  for(const [label,at,strikes] of [['a second before the gun opens',FROM-1,false],['when the gun opens',FROM,true],['a tick before the window closes',CEASE-.05,true],['when the window closes',CEASE,false],['after it',CEASE+10,false]]){
    const {events,g}=probe(at);
    assert.equal(events.some(e=>e.type==='ckm_stoppage'),strikes,`${label}: stoppage`);assert.equal(g.ckmFire.jams??0,strikes?1:0,label);
    assert.equal(events.some(e=>e.type==='ally-fire'),false,`${label}: not a burst either (the stoppage replaces it, or the window is shut)`);
  }
  // A stoppage under way when the window closes: it clears at its clearAt, nothing follows, and the quiet cycle takes over.
  const s=restore(mid),g=gunnerOf(s),clearAt=g.ckm.clearAt;
  s.battleClock=CEASE+1;s.clock=clearAt-.01;s.updateCKMGunner(g,false);assert.equal(g.ckm.phase,'stoppage');assert.deepEqual(s.drainEvents(),[]);
  s.clock=clearAt;s.updateCKMGunner(g,false);const events=s.drainEvents();
  assert.deepEqual(events.map(e=>e.type),['ckm_stoppage_cleared']);assert.notEqual(g.ckm.phase,'stoppage');assert.equal(g.ckm.clearAt,undefined);
});

test('the demolition during a stoppage: the crew leaves the jammed gun (abandon, then retreat) and nobody says it was cleared',()=>{
  const {mid}=first(),s=restore(mid);
  s.consume(E('east_demolition'));s.tick(.05);
  assert.deepEqual(crewOf(s).map(a=>a.ckm.phase),['abandon','abandon','abandon']);assert.deepEqual(crewOf(s).map(a=>a.ckm.clearAt),[undefined,undefined,undefined]);
  validateM01Snapshot(s.snapshot());
  const events=[];for(let i=0;i<100;i++){s.tick(.05);events.push(...s.drainEvents());}
  assert.deepEqual(crewOf(s).map(a=>a.ckm.phase),['retreat','retreat','retreat']);assert.ok(!events.some(e=>e.type==='ckm_stoppage_cleared'||e.type==='ally-fire'));
});

test('a man who falls in the middle of a stoppage does not keep it: the gunner\'s record goes back to aim, and the rest of the crew follows the quiet cycle',()=>{
  const {mid}=first(),s=restore(mid);
  Object.assign(gunnerOf(s),{alive:false,health:0,state:'DOWN'});s.tick(.05);
  assert.equal(gunnerOf(s).ckm.phase,'aim');assert.equal(gunnerOf(s).ckm.clearAt,undefined);
  for(const a of crewOf(s).slice(1))assert.notEqual(a.ckm.phase,'stoppage',a.id);
  validateM01Snapshot(s.snapshot());
  const events=[];for(let i=0;i<120;i++){s.tick(.05);events.push(...s.drainEvents());}
  assert.ok(!events.some(e=>e.type==='ckm_stoppage_cleared'||e.type==='ally-fire'),'a dead gunner fires nothing and clears nothing');
  // The loader down: the gunner\'s stoppage goes on (the clearance is the gun\'s clock, not a man\'s); the loader\'s own record is reset.
  const t=restore(mid);Object.assign(t.actors.find(a=>a.id==='ckm_loader'),{alive:false,health:0,state:'DOWN'});t.tick(.05);
  assert.equal(t.actors.find(a=>a.id==='ckm_loader').ckm.phase,'aim');assert.equal(gunnerOf(t).ckm.phase,'stoppage');validateM01Snapshot(t.snapshot());
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The two golden routes
const routes={};
function routeFixture(seed,support){
  const key=`${seed}/${support}`;if(routes[key])return routes[key];
  const rec={stops:[],cleared:[],bursts:[],lines:[],mismatch:0,silentViolations:0,ticks:0};let open=null,beltAtOnset=null;const shown=new Set();
  const result=route(seed,{support,onStep:({sim,events})=>{
    rec.ticks++;
    const [g,l,r]=crewOf(sim),f=g.ckmFire,p=g.ckm.phase;
    if(sim.battleClock>=FROM&&!sim.consumedEvent(E('east_demolition'))&&['idle','aim','feed','fire_burst','stoppage'].includes(p)&&
      (l.ckm.phase!==p||r.ckm.phase!==p||l.ckm.startedAt!==g.ckm.startedAt||r.ckm.startedAt!==g.ckm.startedAt||l.ckm.clearAt!==g.ckm.clearAt||r.ckm.clearAt!==g.ckm.clearAt))rec.mismatch++;
    for(const e of events){
      if(e.type==='ckm_stoppage'){open={n:e.n,at:e.at,clearAt:e.clearAt,battle:sim.battleClock,bursts:f.bursts,dist:Math.hypot(sim.player.x-g.x,sim.player.z-g.z)};beltAtOnset=f.belt;rec.stops.push(open);}
      if(e.type==='ckm_stoppage_cleared'){rec.cleared.push({n:e.n,at:e.at,clock:sim.clock,open});open=null;}
      if(e.type==='ally-fire'){rec.bursts.push({at:e.at,stopped:open!==null});if(open)rec.silentViolations++;}
    }
    if(open&&f.belt!==beltAtOnset)rec.silentViolations++;
    const s=sim.subtitle;if(s&&/^dlg_m01_11[45]$/.test(s.id)){const k=s.id+s.until;if(!shown.has(k)){shown.add(k);rec.lines.push({id:s.id,at:s.until-s.duration,stops:rec.stops.length});}}
  }});
  return routes[key]={rec,sim:result.sim};
}
for(const [seed,support] of [[19390901,false],[7,true]])test(`golden route ${seed}${support?' with the covering-fire pilot':''}: the table strikes in the window, one to three stoppages, each cleared in its slot, silent in between, the mission as before`,{timeout:300000},()=>{
  const {rec,sim}=routeFixture(seed,support),total=rec.bursts.length;
  assert.ok(sim.mission.complete&&sim.checkpointsReached.length===4);assert.equal(sim.battleClock,seconds('07:05:00'));
  assert.equal(Object.keys(sim.objectives).length,12);assert.ok(Object.values(sim.objectives).every(o=>['done','expired'].includes(o.state)));
  const due=CKM_STOPPAGES.filter(s=>s.after<total).length;
  assert.ok(rec.stops.length>=Math.max(1,due)&&rec.stops.length<=Math.min(3,CKM_STOPPAGES.length),`${rec.stops.length} stoppages for ${total} bursts`);
  assert.equal(rec.cleared.length,rec.stops.length,'every stoppage is cleared (none is cut by the demolition: the window closes 30 s of battle earlier)');
  rec.stops.forEach((s,i)=>{
    const slot=CKM_STOPPAGES[i],c=rec.cleared[i];
    assert.equal(s.n,i+1);assert.equal(s.bursts,slot.after,`stoppage ${i+1} came after ${slot.after} bursts`);assert.equal(s.clearAt,s.at+slot.sec);
    assert.ok(s.battle>=FROM&&s.battle<CEASE,`inside the window of fire: ${clockText(s.battle)}`);
    assert.equal(c.n,s.n);assert.ok(c.clock>=s.clearAt&&c.clock<s.clearAt+.0501,`cleared ${c.clock} for ${s.clearAt}`);
  });
  assert.equal(rec.mismatch,0,'the loader and the third man copy the gunner (phase, start, clearAt) every tick');
  assert.equal(rec.silentViolations,0,'no burst and no round from the belt while the gun is stopped');
  // The lines: only a player within 60 m of the speaker hears them; 115 only follows a 114 (the director\'s `after`); never more than one pair per stoppage.
  const l114=rec.lines.filter(l=>l.id==='dlg_m01_114'),l115=rec.lines.filter(l=>l.id==='dlg_m01_115');
  assert.ok(l114.length<=rec.stops.length&&l115.length<=l114.length);
  for(const l of l114){const s=rec.stops[l.stops-1];assert.ok(l.at>=s.at-1e-9&&l.at<=s.clearAt+5,'114 is said during the stoppage (or just after, if the channel was full)');assert.ok(s.dist<=60,`114 is only heard within 60 m: ${s.dist}`);}
  for(const l of l115)assert.ok(l114.some(x=>x.stops===l.stops&&l.at>x.at),'115 follows the 114 of the same stoppage');
});
