// R2-a, squad coordination slice 4 (src/game/m01-section.js, the three entry points of src/game/m01-simulation.js, the section-callout / section-order rules of src/game/m01-barks.js):
// the Polish section in the main combat sees, calls, reacts and is ordered; the pair moves between posts. State and route tests of the simulation on the real golden routes
// (tests/helpers/m01-route.js) and on saves taken from them: not a browser playthrough, not a playtest. The fights themselves are the existing ones, and the neutrality test proves it.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import definition from '../missions/m01-tczew/mission.json' with {type:'json'};
import layout from '../missions/m01-tczew/map-layout.json' with {type:'json'};
import {M01Simulation,validateM01Snapshot,combatStagePlan,seconds} from '../src/game/m01-simulation.js';
import {SECTION,sectionSlot,sectionDataErrors,validateSectionRecord,newSection,sectionOn} from '../src/game/m01-section.js';
import {SQUAD} from '../src/game/m01-squad.js';
import {SECTION_CALLOUT_KINDS,SECTION_ORDER_KINDS,validateM01AudioEvent} from '../src/game/m01-audio-events.js';
import {route} from './helpers/m01-route.js';
import {compareContinuation,json} from './helpers/m01-determinism.js';

const STAGE=combatStagePlan();
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const WINDOW=[seconds('05:30:00'),seconds('06:10:00')];
const load=raw=>{const s=new M01Simulation(1);s.restoreSnapshot(raw);s.drainEvents();return s;};
const signature=e=>`${e.kind}|${e.reactions.map(r=>r.join(':')).join(',')}`;

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// One real route per pilot, observed every tick: the section's events, the shots, the pair's places, saves in the middle of a reaction, the lines said, the neutral digest.
// The digest is what the Germans and the player are: every tick the events (without the section's own, without the lists of Poles that a round pinned and without the HUD message that stands in for
// the order to change cover when the director cannot say it: dialogue, as in golden amendments 10 and 12), every 5th tick the state itself (the clock, the main stream, the player, his rifle, the
// grenades, the fire in flight, the objectives, the flags, the events consumed, the checkpoints and every German), from the first tick to the east demolition, where the section's window ends.
const memo=new Map();
const isDialogue=e=>e.type==='message'&&/^Zieliński: .*mude de cobertura/.test(e.message);
function neutralHash(){
  const h=createHash('sha256');let n=0;
  return {step(sim,events){
      h.update(JSON.stringify(events.filter(e=>!/^section-/.test(e.type)&&!(e.type==='npc-shot'&&e.target)&&!isDialogue(e)).map(e=>e.type==='round-impact'?{...e,pinned:null}:e))+'\n');
      if(n++%5)return;
      h.update(JSON.stringify([sim.clock,sim.battleClock,sim.rng.state,sim.player,sim.weapon.snapshot(),sim.grenades,sim.enemyFire,sim.objectives,sim.flags,sim.consumed,sim.checkpointsReached,
        sim.actors.filter(a=>a.team==='enemy')])+'\n');
    },digest:()=>h.digest('hex')};
}
class NoSection extends M01Simulation{stepSection(){return null;}afterSection(){}noteCasualty(){}}
function neutralRun(Simulation,seed,support){
  const hash=neutralHash();
  route(seed,{support,Simulation,onStep:({sim,events})=>{if(!sim.consumedEvent('evt_m01_east_demolition'))hash.step(sim,events);}});
  return hash.digest();
}
function observe(seed=19390901,support=false){
  const key=`${seed}:${support}`;if(memo.has(key))return memo.get(key);
  const o={callouts:[],orders:[],shots:[],lines:[],snaps:{},deck:null,after:null,realInWindow:0,hash:neutralHash(),validations:0};
  let tick=0,lastSub=null,demolishedAt=null;
  const r=route(seed,{support,onStep:({sim,events})=>{
    tick++;
    for(const e of events){
      if(e.type==='section-callout')o.callouts.push({...e,clock:sim.clock,battle:sim.battleClock});
      else if(e.type==='section-order')o.orders.push({...e,clock:sim.clock,battle:sim.battleClock});
      else if(e.type==='npc-shot'&&e.target)o.shots.push({...e,clock:sim.clock,battle:sim.battleClock});
      validateM01AudioEvent(e);
    }
    const s=sim.subtitle;if(s&&(!lastSub||lastSub.id!==s.id||lastSub.until!==s.until)){lastSub={id:s.id,until:s.until};o.lines.push({id:s.id,clock:sim.clock,bark:s.bark===true,battle:sim.battleClock});}
    if(!sim.consumedEvent('evt_m01_east_demolition'))o.hash.step(sim,events);
    if(sim.battleClock>=WINDOW[0]&&sim.battleClock<WINDOW[1])o.realInWindow+=.05;
    const q=sim.timers.section;
    if(q){
      if(!o.snaps.shooting&&q.shots.length)o.snaps.shooting=sim.snapshot();
      if(!o.snaps.moving&&SECTION.pair.some(id=>q.post[id].moving&&q.post[id].k!==SECTION.deckPost))o.snaps.moving=sim.snapshot();
      if(!o.snaps.toDeck&&SECTION.pair.some(id=>q.post[id].moving&&q.post[id].k===SECTION.deckPost))o.snaps.toDeck=sim.snapshot();
      if(!o.snaps.atDeck&&SECTION.pair.every(id=>q.post[id].k===SECTION.deckPost&&!q.post[id].moving))o.snaps.atDeck=sim.snapshot();
      if(!o.snaps.casualty&&q.cas.length)o.snaps.casualty=sim.snapshot();
      if(tick%25===0){validateM01Snapshot(sim.snapshot());o.validations++;}
      if(sim.battleClock>=seconds('06:09:40'))o.deck=SECTION.pair.map(id=>({id,k:q.post[id].k,moving:q.post[id].moving,slot:dist(sim.actor(id),sectionSlot(STAGE.squad.slots,id,q.post[id].k))}));
    }
    if(!o.snaps.cpC&&sim.checkpointsReached.includes('cp_m01_c_engenheiros'))o.snaps.cpC=sim.snapshot();
    // the east demolition is consumed at the end of a tick; the record ends at the next one and the retreat of slice 3 starts there
    if(demolishedAt===null&&sim.consumedEvent('evt_m01_east_demolition'))demolishedAt=tick;
    else if(demolishedAt!==null&&o.after===null)o.after={section:sim.timers.section,squad:sim.timers.squad,pair:SECTION.pair.map(id=>({id,x:sim.actor(id).x}))};
  }});
  o.sim=r.sim;o.neutral=o.hash.digest();memo.set(key,o);return o;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
test('data: the posts of the pair are clear of every solid, apart, on existing cover nodes and reachable; the streams, the kinds and the rules agree',()=>{
  const s=new M01Simulation(),nav=s.navigator,world=s.world;
  assert.deepEqual(sectionDataErrors(STAGE.squad.slots,{blockedAt:(x,z,r,y)=>nav.blockedAt(x,z,r,y),heightAt:(x,z)=>world.heightAt(x,z),hasNode:id=>layout.coverNodes.some(n=>n.id===id)}),[]);
  assert.deepEqual(SECTION.pair,SQUAD.teams[0],'the pair is team A of slice 3');
  assert.ok(SECTION.watchers.every(id=>SECTION.men.includes(id)));
  // five distinct streams, none of them an index of the combat AI (0-39 gate, 40 Kowal, 41-50 the deck, 51-74 the platoon)
  const idx=Object.values(SECTION.streams);assert.equal(new Set(idx).size,idx.length);assert.ok(idx.every(i=>i>=75));assert.deepEqual(Object.keys(SECTION.streams).sort(),[...SECTION.men].sort());
  // every post can be walked to from the squad post by the navigator, without a long detour
  for(const [k,post] of SECTION.posts.entries())if(post)for(const id of SECTION.pair){
    const home=sectionSlot(STAGE.squad.slots,id,0),slot=sectionSlot(STAGE.squad.slots,id,k),pts=nav.route({x:home.x,z:home.z,y:world.heightAt(home.x,home.z),radius:.3,space:'metres'},slot);
    assert.ok(pts,`${post.id}: ${id} has a way`);
    let length=0,prev=[home.x,home.z];for(const p of pts){length+=Math.hypot(p[0]-prev[0],p[1]-prev[1]);prev=p;}
    assert.ok(length<=1.35*dist(home,slot)+3,`${post.id}: ${id} walks ${length.toFixed(1)} m for ${dist(home,slot).toFixed(1)} m as the crow flies`);
  }
  // the deck post lies south of the platoon's file (z 37.8-38.15) and west of both pilots' posts (30, 40) and (38, 42.4)
  for(const id of SECTION.pair){const d=sectionSlot(STAGE.squad.slots,id,SECTION.deckPost);assert.ok(d.z>41&&d.x<24,`${id} deck slot`);}
  // every kind of call and every order has a line that can say it
  const rules=definition.dialogue.filter(l=>l.bark?.on==='section-callout'||l.bark?.on==='section-order');
  for(const kind of SECTION_CALLOUT_KINDS)assert.ok(rules.some(l=>l.bark.on==='section-callout'&&l.bark.when.callout.kind===kind),`a line for the call ${kind}`);
  for(const kind of SECTION_ORDER_KINDS)assert.ok(rules.some(l=>l.bark.on==='section-order'&&l.bark.when.order.kind===kind),`a line for the order ${kind}`);
  assert.ok(rules.every(l=>/R2-a/.test(l.note)&&/polaco por rever por falante nativo/.test(l.note)&&/^PL: /.test(l.note)),'every new line carries its Polish and the review flag');
});

test('the window and the record: absent before the first bomb and after the east demolition, validated, refused when malformed',()=>{
  const s=new M01Simulation(11);s.tick(.05,{skip:true});
  assert.equal(sectionOn(s),false);assert.equal(s.timers.section,undefined,'no record before the first bomb');
  const o=observe(),snap=o.snaps.cpC;assert.ok(snap.timers.section,'a checkpoint of the window carries the record');
  assert.doesNotThrow(()=>validateM01Snapshot(json(snap)));
  const reject=m=>{throw new Error(m);};
  const mutations=[q=>{q.v=2;},q=>{delete q.rng;},q=>{q.rng.marek_zielinski=-1;},q=>{q.rng.szymon_kowal=1.5;},q=>{delete q.rng.jozef_bak;},q=>{q.at.scan=snap.clock+1;},q=>{q.next.hold=-1;},q=>{q.seen.foo=1;},
    q=>{q.seen['mg:de_east_0']=snap.clock+5;},q=>{q.deckSig='xyz';},q=>{q.focus={target:'player',by:'x',kind:'mg',at:0};},q=>{q.shots=[{id:'nobody',target:'de_east_2',at:0,left:1}];},
    q=>{q.shots=[{id:'staszek_pawlak',target:'de_east_2',at:0,left:9}];},q=>{q.hold={staszek_pawlak:{k:'dance',until:1,yaw:null}};},q=>{q.hold={staszek_pawlak:{k:'look',until:snap.clock+99,yaw:null}};},
    q=>{q.pin.jozef_bak=1;},q=>{q.pins=new Array(20).fill([0,1]);},q=>{q.post.staszek_pawlak.k=9;},q=>{q.post.staszek_pawlak.moving='yes';},q=>{delete q.post.east_platoon_voice;},
    q=>{q.order={kind:'charge',at:0,until:0};},q=>{q.cas=[{id:'pl_west_0',how:'dead',by:'bomb',at:0,x:0,z:0,called:false,orderAt:null,done:false}];},q=>{q.recent=[['mg',0,'player']];},q=>{q.done={deck:'yes'};},
    q=>{q.say={node:'sing',at:0};},q=>{q.say={node:'arrive_deck'};},q=>{q.n.callouts=-1;},q=>{q.extra=true;}];
  mutations.forEach((mutate,i)=>{const bad=json(snap);mutate(bad.timers.section);
    assert.throws(()=>validateM01Snapshot(bad),/secção/,`mutation ${i}`);});
  // the window: a record before the first bomb, or after the east demolition, is not a record the machine writes
  const early=json(snap);delete early.consumed.evt_m01_bombing_0434;assert.throws(()=>validateSectionRecord(early.timers.section,early,reject),/janela/);
  const late=json(snap);late.consumed.evt_m01_east_demolition=late.clock;assert.throws(()=>validateSectionRecord(late.timers.section,late,reject),/janela/);
  // a fresh record is a valid record (every key present, the streams derived from the state of the main stream)
  const fresh=new M01Simulation(5);fresh.consumed.evt_m01_bombing_0434=0;const q=newSection(fresh);
  assert.doesNotThrow(()=>validateSectionRecord(q,{clock:fresh.clock+1,consumed:fresh.consumed},reject));
});

test('control route: the section calls what it sees, and every call is a well-formed event the director can use',()=>{
  const o=observe(),kinds=new Set(o.callouts.map(c=>c.kind));
  for(const k of ['mg','gate','dike','pinned','deck','advance','casualty'])assert.ok(kinds.has(k),`a ${k} call on the route`);
  for(const c of o.callouts){
    assert.ok(SECTION_CALLOUT_KINDS.includes(c.kind));assert.ok(SECTION.men.includes(c.by)||SECTION.casualtyCallers.includes(c.by),c.by);
    assert.ok(c.side===null||['left','right'].includes(c.side));if(c.side!==null)assert.ok(c.kind==='mg'||c.kind==='gate','only the gates have a side');
    assert.equal(c.landmark,{mg:'gate',gate:'gate',dike:'dike',deck:'deck',advance:'deck',fallback:'deck',down:'deck'}[c.kind]??null);
    assert.deepEqual(c.from,c.point);assert.ok(c.reactions.every(([id,r])=>SECTION.men.includes(id)&&id!==c.by&&['fire','look','drop'].includes(r)));
    if(c.kind==='mg')assert.match(c.target,/^de_east_[01]$/);
    if(c.kind==='pinned')assert.ok(SECTION.pair.includes(c.by)&&c.target===null);
  }
  assert.ok(o.callouts.some(c=>c.kind==='mg'&&c.side==='left')&&o.callouts.some(c=>c.kind==='mg'&&c.side==='right'),'both MG34s are called, on both sides of the gates');
  // the men our bombs hit in front of the section are called, and the sergeant gives the nearest man the victim's side
  const raid=o.callouts.filter(c=>c.kind==='casualty'&&c.battle<seconds('04:45:00'));assert.ok(raid.length>=2,`${raid.length} casualty calls in the raid`);
  assert.ok(raid.every(c=>/^pl_west_\d$/.test(c.target)&&c.reactions.length>0),'a man of the garrison, and the others react');
  assert.ok(o.orders.filter(x=>x.kind==='sector').length>=raid.length-1);
  // 05:30-06:10: more than three calls per real minute (the tree before R2-a had none, only the reactive alerts of Kowal and the sergeant)
  const inWindow=o.callouts.filter(c=>c.battle>=WINDOW[0]&&c.battle<WINDOW[1]);
  assert.ok(inWindow.length/(o.realInWindow/60)>=3,`${(inWindow.length/(o.realInWindow/60)).toFixed(2)} calls per real minute`);
});

test('reactions differ between events and between kinds; every answer is at a German somebody called, with the rifle\'s own clip',()=>{
  const o=observe(),sig=o.callouts.map(signature);
  assert.ok(new Set(sig).size>=15,`${new Set(sig).size} distinct reaction patterns on one route`);
  const byKind={};for(const c of o.callouts)(byKind[c.kind]??=new Set()).add(signature(c));
  for(const k of ['gate','pinned','dike'])assert.ok(byKind[k].size>=3,`${k}: the same kind of call does not always get the same answer (${byKind[k].size})`);
  assert.deepEqual([...new Set(o.callouts.flatMap(c=>c.reactions.map(r=>r[1])))].sort(),['drop','fire','look']);
  // every rifle shot of the section is at a German somebody called in the last 12 s, from a man of the pair or Bąk
  assert.ok(o.shots.length>=20,`${o.shots.length} shots`);
  const clips={};
  for(const s of o.shots){
    assert.equal(s.weapon,'ally_rifle');assert.ok(['staszek_pawlak','east_platoon_voice','jozef_bak'].includes(s.by),s.by);assert.match(s.target,/^de_(east|spans)_\d+$/);
    assert.ok(o.callouts.some(c=>c.target===s.target&&s.clock-c.clock>=0&&s.clock-c.clock<=12),`${s.by} fired at ${s.target} at ${s.clock.toFixed(1)} without a call`);
    (clips[s.by]??=[]).push(s.clock);
  }
  // a clip is five rounds and the sixth shot waits for the 3.4 s of the reload
  for(const [by,times] of Object.entries(clips))for(let i=5;i<times.length;i++)assert.ok(times[i]-times[i-5]>=4*1.7+3.4-1e-6||times[i]-times[i-1]>=3.4-1e-6,`${by}: six shots in ${(times[i]-times[i-5]).toFixed(1)} s`);
});

test('the pair moves between posts: a shift along the trench and back when it is pinned, and up to the road deck at the withdrawal, where it stays until the east demolition',()=>{
  for(const [seed,support] of [[19390901,false],[7,true]]){
    const o=observe(seed,support),shifts=o.orders.filter(x=>x.kind==='shift').length,back=o.orders.filter(x=>x.kind==='return').length;
    assert.ok(back<=shifts&&shifts-back<=1,`seed ${seed}: ${shifts} shifts, ${back} returns`);
    const deck=o.orders.filter(x=>x.kind==='deck');assert.equal(deck.length,1,`seed ${seed}: the deck order, once`);
    assert.ok(deck[0].battle>=seconds('06:00:00')&&deck[0].battle<seconds('06:05:00'),`the deck order at ${deck[0].battle}`);assert.deepEqual([...deck[0].to].sort(),[...SECTION.pair].sort());
    assert.ok(o.deck.every(d=>d.k===SECTION.deckPost&&!d.moving&&d.slot<1),`seed ${seed}: the pair holds the deck post before the demolition ${JSON.stringify(o.deck)}`);
    assert.equal(o.after.section,undefined,'the record ends with the window');assert.ok(o.after.squad,'and the retreat of slice 3 starts');
    assert.ok(o.lines.some(l=>l.id==='dlg_m01_196'||l.id==='dlg_m01_197'),`seed ${seed}: the pair says it is in position`);
  }
  assert.ok(observe().orders.some(x=>x.kind==='shift'),'the control route shifts the pair');
});

test('what the section does cannot be felt by the Germans or the player: the same route without it is the same, tick for tick, for them (both golden routes, Kowal and the ckm included)',{timeout:600000},()=>{
  for(const [seed,support] of [[19390901,false],[7,true]]){
    const on=observe(seed,support).neutral,off=neutralRun(NoSection,seed,support);
    assert.equal(on,off,`seed ${seed} support ${support}: player, Germans, fire in flight, the main stream, objectives, flags, the consumed events and the events are identical with and without the section`);
  }
});

test('a save in the middle of a reaction (a shot waiting, a shift, the walk to the deck, the deck post, a man down) plays on exactly as the run it was taken from, also across two restores',{timeout:300000},()=>{
  const o=observe();
  for(const label of ['shooting','moving','toDeck','atDeck','casualty']){
    const raw=o.snaps[label];assert.ok(raw,`a save ${label}`);
    const s=load(raw);validateM01Snapshot(s.snapshot());
    compareContinuation(s,{label,ticks:240,doubleAt:[1,60,150],dt:t=>t%11===0?.013:.05});
  }
});

test('old saves load: a checkpoint of the window without the record restores, starts it with streams derived from the saved stream, plays on deterministically and draws nothing from the main stream',()=>{
  const o=observe(),old=json(o.snaps.cpC);delete old.timers.section;delete old.resumeCheckpoint;
  validateM01Snapshot(old);
  const run=(raw,plain=false)=>{const s=load(raw);if(plain){s.stepSection=()=>null;s.afterSection=()=>{};s.noteCasualty=()=>{};}for(let i=0;i<600;i++)s.tick(.05,{});return s;};
  const a=run(old),b=run(old),without=run(old,true);
  assert.ok(a.timers.section,'the record starts at the next tick');assert.equal(JSON.stringify(a.timers.section),JSON.stringify(b.timers.section),'the same save gives the same section');
  validateM01Snapshot(a.snapshot());
  assert.equal(without.timers.section,undefined);assert.equal(a.rng.state,without.rng.state,'the main stream moves exactly as without the section');
  // the streams come from the state of the main stream when the record starts: another state, other streams
  const other=json(old);other.rng=(old.rng^0x2a2a2a2a)>>>0;
  const c=load(other);c.tick(.05,{});c.drainEvents();const d=load(old);d.tick(.05,{});
  assert.notDeepEqual(c.timers.section.rng,d.timers.section.rng);
});

test('the section\'s variety is its streams\': the same moment with other streams answers the same calls differently, and with the same streams identically',()=>{
  const o=observe(),base=json(o.snaps.cpC);delete base.timers.section;delete base.resumeCheckpoint;
  const answers=mutateStreams=>{const s=load(base),out=[];s.tick(.05,{});if(mutateStreams)for(const id of SECTION.men)s.timers.section.rng[id]=(s.timers.section.rng[id]^0x13579bdf)>>>0;
    for(let i=0;i<1500;i++){s.tick(.05,{});for(const e of s.drainEvents())if(e.type==='section-callout'&&e.kind!=='pinned')out.push(e);}return out;};
  const a=answers(false),b=answers(false),c=answers(true);
  assert.ok(a.length>=6,`${a.length} calls in 75 s of the window`);
  assert.deepEqual(a.map(signature),b.map(signature),'the same streams, the same section');
  assert.notDeepEqual(a.map(signature),c.map(signature),'other streams, other answers');
  // the German who is called is the Germans\' business: the first calls name the same men on both
  assert.deepEqual(a.slice(0,3).map(e=>e.target),c.slice(0,3).map(e=>e.target));
});

test('casualties: the nearest man calls a man down and the sergeant gives the nearest man his side; Bąk\'s wound is a call too',()=>{
  const o=observe(),raid=o.callouts.filter(c=>c.kind==='casualty'&&c.battle<seconds('04:45:00'));
  assert.ok(raid.length>=2);
  for(const c of raid){
    assert.match(c.target,/^pl_west_\d$/);assert.ok(SECTION.casualtyCallers.includes(c.by));
    const order=o.orders.find(x=>x.kind==='sector'&&x.target===c.target);
    if(order){assert.ok(order.clock>=c.clock&&order.clock-c.clock<=8,`the order follows the call within 8 s (${order.clock-c.clock})`);assert.ok(!order.to.includes(c.target));assert.ok(SECTION.men.includes(order.to[0]));}
  }
  const bak=o.callouts.find(c=>c.kind==='casualty'&&c.target==='jozef_bak');
  if(bak){assert.ok(SECTION.casualtyCallers.includes(bak.by));assert.ok(bak.battle>=seconds('06:04:00'));}
});
