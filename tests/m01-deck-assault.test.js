// M01 combat slice 2, the deck assault (grp_de_spans.deckAssault, src/game/m01-deck-assault.js, the deck methods of src/game/m01-simulation.js).
// State-level tests on the real control route (tests/helpers/m01-route.js) and on saves taken from it: not a browser playthrough, not a playtest.
import test from 'node:test';
import assert from 'node:assert/strict';
import definition from '../missions/m01-tczew/mission.json' with {type:'json'};
import layout from '../missions/m01-tczew/map-layout.json' with {type:'json'};
import {M01Simulation,validateM01Snapshot,seconds,DECK_AMMO_POOL} from '../src/game/m01-simulation.js';
import {DECK_ASSAULT,DECK_SAFE_X,deckAssaultPlan,deckRole} from '../src/game/m01-deck-assault.js';
import {validRound} from '../src/game/m01-fire.js';
import {validateM01AudioEvent} from '../src/game/m01-audio-events.js';
import {M01_DIFFICULTY_IDS} from '../src/game/m01-difficulty.js';
import {eyePosition} from '../src/world/spatial.js';
import {route} from './helpers/m01-route.js';
import {compareContinuation,json} from './helpers/m01-determinism.js';
import {clippingAudit,stackingAudit} from './helpers/m01-clipping.js';

const P=DECK_ASSAULT,ENTRY='evt_m01_germans_on_east_spans',BLAST='evt_m01_east_demolition';
const spans=s=>s.actors.filter(a=>a.group==='grp_de_spans'),assault=s=>spans(s).filter(a=>deckRole(a)==='assault');
const load=raw=>{const s=new M01Simulation(1);s.restoreSnapshot(raw);s.drainEvents();return s;};
const westLimit=a=>a.group==='grp_de_spans'&&a.deck!==undefined?DECK_SAFE_X:690;

let memo;
/** One real control route (seed 19390901, never fires), observed every tick: the deck men, the rounds they fire, saves at the entry, mid-advance and at the hold, clipping. */
function observed(){
  if(memo)return memo;
  const o={snap:{},minX:{},westViolations:[],rounds:{},nearPlayer:0,phasesSeen:new Set(),clip:clippingAudit(),stack:stackingAudit(),blastClock:null,clearAt:null,maxReal:0};
  let t0=null;
  const r=route(19390901,{onStep:step=>{
    const {sim,events}=step;o.clip.observe(step);o.stack.observe(step);
    for(const a of sim.actors)if(a.team==='enemy'&&a.x<westLimit(a)-1e-9)o.westViolations.push({id:a.id,x:a.x,clock:sim.clock});
    if(t0===null&&sim.consumedEvent(ENTRY)){t0=sim.clock;o.snap.entry=sim.snapshot();}
    if(t0===null||sim.consumedEvent(BLAST)){if(sim.consumedEvent(BLAST)&&o.blastClock===null){o.blastClock=sim.clock;o.snap.blast=sim.snapshot();}return;}
    for(const e of events){
      if(e.type==='enemy-fire'){const by=sim.actors.find(a=>a.alive&&Math.abs(eyePosition(a).x-e.origin.x)<1e-9&&Math.abs(eyePosition(a).z-e.origin.z)<1e-9);if(by?.group==='grp_de_spans')o.rounds.fired=(o.rounds.fired??0)+1;}
      if(e.type==='round-impact'&&e.by?.startsWith('de_spans')){o.rounds[e.kind]=(o.rounds[e.kind]??0)+1;if(e.crack||e.distance<=25)o.nearPlayer++;}
    }
    for(const a of spans(sim)){o.minX[a.id]=Math.min(o.minX[a.id]??Infinity,a.x);o.phasesSeen.add(a.deck.phase);}
    if(!o.snap.mid&&sim.clock-t0>=70)o.snap.mid=sim.snapshot();
    if(!o.snap.hold&&assault(sim).some(a=>a.deck.phase==='hold'))o.snap.hold=sim.snapshot();
    if(o.clearAt===null&&sim.deckClear())o.clearAt=sim.clock;
    o.maxReal=sim.clock-t0;
  }});
  o.sim=r.sim;o.t0=t0;memo=o;return o;
}

test('the deck assault plan is mission data validated at load: the overwatch posts lie in the east blast, the assault places beyond it, the forward line x 450-600',()=>{
  const bz=layout.blastZones.find(b=>b.event===BLAST),inBlast=p=>Math.hypot(p.x-bz.center[0],p.z-bz.center[2])<=bz.radiusM;
  assert.equal(DECK_SAFE_X,450);assert.equal(P.safeX,definition.groups.find(g=>g.id==='grp_de_spans').deckAssault.safeX);
  assert.ok(P.overwatchNodes.every(p=>inBlast(p)),'the four the blast fells (GERMAN_FELLED) post inside the blast radius');
  assert.ok(P.fallback.every(p=>p.x>=P.clearX&&p.x>=bz.center[0]+bz.radiusM),'the assault falls back beyond the blast radius');
  assert.ok(P.paths.every(path=>path.every(p=>p.x>=P.safeX&&p.z>37.5&&p.z<42.5)),'every node on the road deck, east of the safety line');
  assert.ok(P.paths.every(path=>path.at(-1).x>=450&&path.at(-1).x<=600),'the forward line of each assault man is mid-deck, x 450-600');
  const mutate=f=>{const d=json(definition);f(d.groups.find(g=>g.id==='grp_de_spans').deckAssault);return d;};
  for(const [name,f] of Object.entries({safeX:d=>{d.safeX=300;},limit:d=>{d.limits[0]=440;},version:d=>{d.version=2;},lane:d=>{d.lanes[1][0]=43;},order:d=>{d.assault.reverse();},
    fallback:d=>{d.fallback[0][0]=900;},overwatch:d=>{d.overwatchNodes[0][0]=950;},stations:d=>{d.stations.reverse();},timing:d=>{d.maxSec=-1;}}))
    assert.throws(()=>deckAssaultPlan(mutate(f)),/deck assault/,name);
});

test('real route: the assault advances from the east end to mid-deck and back, firing real rounds at the platoon and the player, while the demolition waits for the deck to clear',()=>{
  const o=observed();
  for(const a of P.assault){assert.ok(o.minX[a]>=DECK_SAFE_X&&o.minX[a]<=600,`${a} reached ${o.minX[a]}`);}
  for(const a of P.overwatch)assert.ok(o.minX[a]>=880&&o.minX[a]<P.clearX,`${a} posts on span 08 (${o.minX[a]})`);
  assert.deepEqual([...o.phasesSeen].sort(),['advance','clear','cover','fallback','hold']);
  assert.ok(o.rounds.platoon>0&&o.rounds.player>0,`real rounds at the platoon (${o.rounds.platoon}) and the player (${o.rounds.player})`);
  assert.ok(o.nearPlayer>=5,`rounds of the deck land or crack near the player (${o.nearPlayer})`);
  assert.ok(o.clearAt!==null&&o.blastClock>=o.clearAt,'the east demolition comes only after the deck is clear');
  assert.ok(o.maxReal<=P.maxSec+(P.clearX-P.safeX)/P.rushSpeed+15,`the assault never holds the clock longer than maxSec plus the run back (${o.maxReal.toFixed(1)} s)`);
  const blast=load(o.snap.blast);
  assert.equal(blast.battleClock>=seconds('06:10:00'),true);
  assert.ok(assault(blast).filter(a=>a.alive).every(a=>a.x>=P.clearX),'nobody of the assault is left west of the falling spans');
  assert.ok(spans(blast).filter(a=>P.overwatch.includes(a.id)).every(a=>!a.alive),'the four on span 08 are the ones the blast fells');
  assert.equal(o.sim.flags['m01.east_platoon_survivors'],12,'the survivors of the control route are unchanged');
});

test('no German is ever west of the safety line (deck men) or of x 690 (every other German), and no deck man walks into a solid or into another man',()=>{
  const o=observed();
  assert.deepEqual(o.westViolations,[]);
  assert.deepEqual(o.clip.events.filter(e=>/^de_spans_/.test(e.actor??e.id??'')),[],'no clipping by a deck man');assert.equal(o.clip.events.length,0,'no clipping by anybody');
  assert.equal(o.stack.summary().pairs,0,'nobody inside another man');
  for(const a of o.sim.actors)if(a.team==='enemy')assert.ok(a.x>=westLimit(a),`${a.id} at ${a.x} at the end of the route`);
});

test('a save in the middle of the advance, at the hold and at the entry validates and continues identically after double restores',()=>{
  const o=observed();
  for(const [label,raw] of Object.entries({entry:o.snap.entry,mid:o.snap.mid,hold:o.snap.hold})){
    validateM01Snapshot(json(raw));const s=load(raw);
    assert.ok(spans(s).every(a=>a.deck&&a.ai),'every deck man carries his record and his stream');
    compareContinuation(s,{label:`deck-${label}`,ticks:500,doubleAt:[1,170,340]});
  }
  // The same save on two simulations: the same deck, man for man, 60 s later (the record and the stream are the whole state).
  const a=load(o.snap.mid),b=load(o.snap.mid);for(let i=0;i<1200;i++){a.tick(.05);b.tick(.05);}
  assert.deepEqual(spans(a).map(m=>[m.x,m.z,m.deck,m.ai]),spans(b).map(m=>[m.x,m.z,m.deck,m.ai]));
});

test('killable: the player\'s rifle kills a deck man and the simulation emits enemy_down_by_player with his id, the weapon and the distance',()=>{
  const s=load(observed().snap.hold),target=assault(s).find(a=>a.alive&&a.deck.phase==='hold');assert.ok(target);
  Object.assign(s.player,{x:target.x-25,y:0,z:target.z,crouched:false,aiming:true});
  let event=null;
  for(let i=0;i<400&&target.alive;i++){
    const o=eyePosition(s.player),e=eyePosition(target),dx=e.x-o.x,dz=e.z-o.z,turn=Math.atan2(dz,dx)-s.player.angle,pitch=Math.atan2(e.y-.35-o.y,Math.hypot(dx,dz));
    target.suppressedUntil=0;
    s.tick(.05,{aim:true,lookX:Math.atan2(Math.sin(turn),Math.cos(turn))/.0022,lookY:(s.player.pitch-pitch)/.0022,fire:s.weapon.state==='READY',reload:!s.weapon.mag});
    event??=s.drainEvents().find(e=>e.type==='enemy_down_by_player')??null;
  }
  assert.equal(target.alive,false);assert.ok(event,'the event was emitted');
  assert.equal(event.id,target.id);assert.equal(event.group,'grp_de_spans');assert.equal(event.weapon,'kb_wz29');
  assert.ok(Math.abs(event.distance-Math.hypot(target.x-s.player.x,target.z-s.player.z))<.5,`the distance at the kill (${event.distance})`);assert.deepEqual(event.point,{x:target.x,y:target.y,z:target.z});
  assert.doesNotThrow(()=>validateM01AudioEvent(event));
  for(const bad of [{...event,id:'pl_east_3'},{...event,weapon:'ckm_wz30'},{...event,point:null},{...event,distance:NaN}])assert.throws(()=>validateM01AudioEvent(bad),/enemy_down_by_player/);
  validateM01Snapshot(s.snapshot());
});

test('no other death emits it: the east demolition fells four deck men and the event is not emitted',()=>{
  const s=load(observed().snap.hold);let events=[];
  for(let i=0;i<8000&&!s.consumedEvent(BLAST);i++){s.tick(.05);events.push(...s.drainEvents());}
  assert.ok(s.consumedEvent(BLAST));for(let i=0;i<5;i++){s.tick(.05);events.push(...s.drainEvents());}
  assert.ok(spans(s).filter(a=>!a.alive).length>=4);assert.equal(events.filter(e=>e.type==='enemy_down_by_player').length,0);
});

test('they fall back on their cue: the squad breaks on breakOut men out of the fight, and the hold, the suppression and maxSec each send a man back',()=>{
  const o=observed();
  // Losses: breakOut of the six down, every living man of the assault turns back on the next tick.
  const losses=load(o.snap.mid);assert.ok(assault(losses).every(a=>a.alive&&['advance','cover','hold'].includes(a.deck.phase)));
  for(const a of assault(losses).slice(0,P.breakOut))Object.assign(a,{health:0,alive:false,state:'DOWN'});
  losses.tick(.05);for(const a of assault(losses).filter(a=>a.alive))assert.equal(a.deck.phase,'fallback',a.id);
  assert.ok(losses.drainEvents().some(e=>e.type==='message'&&/Recuam/.test(e.message)),'the player is told');
  // One fewer than breakOut: the squad goes on.
  const fewer=load(o.snap.mid);for(const a of assault(fewer).slice(0,P.breakOut-1))Object.assign(a,{health:0,alive:false,state:'DOWN'});
  fewer.tick(.05);assert.ok(assault(fewer).filter(a=>a.alive).every(a=>a.deck.phase!=='fallback'));
  // Suppression: a man kept down in cover for breakPinnedSec falls back alone; the others go on.
  const pinned=load(o.snap.mid),man=assault(pinned).find(a=>a.alive&&a.deck.phase==='cover')??assault(pinned).find(a=>a.alive&&a.x<=P.pursuitToX);
  for(let i=0;i<4000&&man.deck.phase!=='fallback';i++){if(man.deck.phase==='cover'||man.deck.phase==='hold')man.suppressedUntil=pinned.clock+1;pinned.tick(.05);}
  assert.equal(man.deck.phase,'fallback');assert.ok(man.deck.pinned>=P.breakPinnedSec);
  // maxSec: with nobody shooting at them, every assault man is falling back or clear by maxSec after the entry.
  const late=load(o.snap.entry),t0=late.clock;
  while(late.clock<t0+P.maxSec+.1)late.tick(.05);
  for(const a of assault(late))assert.ok(['fallback','clear'].includes(a.deck.phase),`${a.id} ${a.deck.phase}`);
  // The fall-back runs to the place east of clearX; then T48 takes over at the demolition (the knot forms within 20 m, at most at x 1080).
  while(!late.consumedEvent(BLAST))late.tick(.05);
  while(late.battleClock<seconds('06:12:00'))late.tick(.05);
  const knot=assault(late).filter(a=>a.alive);assert.ok(knot.length>=2&&knot.every(a=>a.state==='REGROUP'&&a.x<=1081.8&&a.x>=P.clearX));
});

test('saves: an older save (no deck record) keeps the old march and rule; malformed or misplaced deck records and Germans past the line are refused',()=>{
  const raw=json(observed().snap.mid);
  // An older save made on the spans: no deck record, no stream on the spans. Allowed only east of 690 (the old rule); the old march goes on and the deck readiness ignores it.
  const legacy=json(observed().snap.entry);for(const a of legacy.actors)if(a.group==='grp_de_spans'){delete a.deck;delete a.ai;a.x=Math.max(a.x,1050);}delete legacy.resumeCheckpoint;
  validateM01Snapshot(json(legacy));const old=load(legacy);for(let i=0;i<600;i++)old.tick(.05);
  assert.ok(spans(old).every(a=>a.deck===undefined&&a.ai===undefined&&a.x>=690),'the old march, no record created on restore');assert.equal(old.deckClear(),true);
  const reject=(f,re)=>{const s=json(raw);f(s);assert.throws(()=>validateM01Snapshot(s),re);};
  const man=s=>s.actors.find(a=>a.id==='de_spans_5');
  reject(s=>{man(s).x=DECK_SAFE_X-1;},/elenco/);
  reject(s=>{delete man(s).deck;man(s).x=600;},/elenco/);
  reject(s=>{s.actors.find(a=>a.id==='de_east_7').deck=json(man(s).deck);},/assalto do tabuleiro/);
  reject(s=>{delete s.consumed[ENTRY];},/assalto do tabuleiro|eventos/);
  for(const bad of [d=>{d.v=2;},d=>{d.phase='charge';},d=>{d.node=99;},d=>{d.extra=1;},d=>{d.pinned=-1;},d=>{d.until=1e9;}])reject(s=>bad(man(s).deck),/assalto do tabuleiro/);
  reject(s=>{delete man(s).ai;},/assalto do tabuleiro/);
  // A round of the deck leaves from the deck: from x >= 450 for de_spans_*, from x >= 690 for everyone else.
  const r={id:'m01_round_1',by:'de_spans_5',weapon:'kar98k',kind:'player',ox:470,oy:1.6,oz:40,ax:30,ay:1,az:40,h:1.2,firedAt:5,arriveAt:5.7,tracer:false,victim:null};
  assert.ok(validRound(r,5));assert.ok(!validRound({...r,ox:449},5));assert.ok(!validRound({...r,by:'de_east_5'},5));
});

test('the section\'s clips at the deck post: one clip every 3 s while the player covers from the deck with 15 or fewer in reserve, DECK_AMMO_POOL rounds at most, saved and accounted',()=>{
  const s=load(observed().snap.entry);Object.assign(s.player,{x:30,y:0,z:40});
  const w=s.weapon;w.shotCount+=w.reserve-10;w.reserve=10;   // he has fired 30 rounds
  const before=w.reserve;s.tick(.05);assert.equal(w.reserve,before+5);assert.equal(s.timers.deckAmmo,5);validateM01Snapshot(s.snapshot());
  s.tick(.05);assert.equal(w.reserve,before+5,'not twice in 3 s');
  assert.equal(DECK_AMMO_POOL,120);let n=0;while(s.timers.deckAmmo<DECK_AMMO_POOL&&n++<8000){w.shotCount+=Math.max(0,w.reserve-10);w.reserve=Math.min(w.reserve,10);s.tick(.05);}
  assert.equal(s.timers.deckAmmo,DECK_AMMO_POOL);const at=w.reserve;w.shotCount+=w.reserve;w.reserve=0;s.tick(.05);for(let i=0;i<100;i++)s.tick(.05);assert.equal(w.reserve,0,'empty box');void at;
  validateM01Snapshot(s.snapshot());
  const far=load(observed().snap.entry);Object.assign(far.player,{x:-120,y:-3,z:16});far.weapon.shotCount+=30;far.weapon.reserve=10;far.tick(.05);assert.equal(far.timers.deckAmmo,undefined,'only at the deck post');
  for(const bad of [t=>{t.deckAmmo=DECK_AMMO_POOL+1;},t=>{t.deckAmmo=5;delete t.deckAmmoAt;},t=>{t.deckAmmo=0;},t=>{t.deckAmmoAt=1e9;}]){const raw=s.snapshot();bad(raw.timers);assert.throws(()=>validateM01Snapshot(raw),/deckAmmo|munição/);}
});

test('every difficulty level the simulation supports completes the control route with the deck assault and the player alive (the levels are data only, H9 D1)',()=>{
  const o=observed();
  for(const difficulty of M01_DIFFICULTY_IDS.filter(d=>d!=='recruta')){
    class Level extends M01Simulation{constructor(seed){super(seed,{difficulty});}}
    const r=route(19390901,{Simulation:Level});
    assert.equal(r.sim.mission.complete,true);assert.equal(r.sim.difficulty,difficulty);
    assert.equal(r.sim.player.health,o.sim.player.health,`${difficulty}: nothing reads the level yet, the same damage`);
    assert.equal(r.sim.flags['m01.east_platoon_survivors'],12);
  }
  assert.ok(o.sim.player.health>=50,`the control route ends with ${o.sim.player.health} health`);
});
