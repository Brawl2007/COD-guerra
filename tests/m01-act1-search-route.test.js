// Golden amendment 22 (2026-11-05, a BEHAVIOUR amendment): the German supporting round and the search it makes, on the REAL golden routes (no forcing).
// The review of the first version of this amendment (texts + a search from a hold that never acted) found the search still at 0 searches on both golden routes: on the open deck every Pole is in sight of every German, so nothing
// ever made a man lose sight of anything before his deepest line. The cause that was missing is tactics.support (src/game/m01-simulation.js updateDeckSupport): one round of German supporting fire on the rearguard's line, whose
// cloud (m01-dust.js, kind shell, 8 m, 30 s) hides the Poles from the Germans on the deck, who then search (deckSearch). This file runs the two golden routes (control seed 19390901, support seed 7), pins the round and the
// searches they make, and proves on the control route that the round changes nothing of the plot, touches no one, falls where and when the data say, never falls when it must not, and is deterministic and saved.
import test from 'node:test';
import assert from 'node:assert/strict';
import definition from '../missions/m01-tczew/mission.json' with {type:'json'};
import {M01Simulation,seconds,validateM01Snapshot} from '../src/game/m01-simulation.js';
import {DECK_ASSAULT,DECK_SUPPORT_ID,deckRole,deckLines,deckLineNumber} from '../src/game/m01-deck-assault.js';
import {REARGUARD} from '../src/game/m01-rearguard.js';
import {SAFE_IMPACT_M} from '../src/game/m01-blast.js';
import {dustClouds} from '../src/game/m01-dust.js';
import {route} from './helpers/m01-route.js';

const S=DECK_ASSAULT.tactics.support,ENTRY=DECK_ASSAULT.from;
const FRONT=REARGUARD.posts.reduce((m,p)=>p.x>m.x?p:m);
const formed=sim=>REARGUARD.men.every(id=>{const a=sim.actor(id);return a.alive&&a.active&&a.rear?.phase==='hold';});
const coming=sim=>sim.actors.some(a=>a.group==='grp_de_spans'&&a.deck&&a.alive&&a.active&&deckRole(a)==='assault'&&['advance','cover','hold'].includes(a.deck.phase));

/** A whole route. `Simulation` may switch the round off (class Off). Records the searches (deck-tactic), every ask of the search (phase, result), the blasts and a save at the tick the rearguard first stood complete. */
function run(seed,support,Simulation=M01Simulation){
  const searches=[],asks=[],blasts=[];let formedSnap=null,formedAt=null,since=null;
  class Probe extends Simulation{
    deckSearch(a){const phase=a.deck.phase,line=deckLineNumber(a),deepest=line===deckLines(a).length-1,r=super.deckSearch(a);asks.push({by:a.id,phase,line,deepest,result:r,at:this.clock});return r;}
  }
  const result=route(seed,{support,Simulation:Probe,onStep:({sim,events})=>{
    for(const e of events){
      if(e.type==='deck-tactic'&&e.kind==='search')searches.push({...e});
      if(e.type==='m01-blast'&&e.kind==='shell')blasts.push({...e,clock:sim.clock});
    }
    if(formedSnap===null&&sim.consumedEvent(ENTRY)&&formed(sim)){formedSnap=sim.snapshot(false);formedAt=sim.clock;since=Math.max(...REARGUARD.men.map(id=>sim.actor(id).rear.since));}
  }});
  return {sim:result.sim,searches,asks,blasts,formedSnap,formedAt,since};
}
const plot=sim=>({complete:sim.mission.complete,battleClock:sim.battleClock,checkpoints:[...sim.checkpointsReached],survivors:sim.flags['m01.east_platoon_survivors'],
  objectives:Object.fromEntries(Object.entries(sim.objectives).map(([id,o])=>[id,o.state])),consumed:Object.keys(sim.consumed).sort(),
  flags:Object.fromEntries(Object.entries(sim.flags).filter(([k])=>k!=='m01.suggested_cover').sort())});
const str=v=>JSON.stringify(v);   // (the byte-for-byte comparison of two states)
const crater=sim=>sim.sectors.damage.filter(d=>d.id===DECK_SUPPORT_ID);
const load=(raw,Simulation=M01Simulation)=>{const s=new Simulation(1);s.restoreSnapshot(raw);s.drainEvents();return s;};
class Off extends M01Simulation{updateDeckSupport(){}}   // the game of before the round (the same data otherwise)
const tickFor=(s,secs,each=()=>{})=>{const evs=[];for(let i=0;i<Math.round(secs*20);i++){each(s,i);s.tick(.05);for(const e of s.drainEvents())evs.push({...e,clock:s.clock});}return evs;};

let control,support,controlOff;
test('the control golden route (seed 19390901): the round falls delaySec after the rearguard stands, in front of its front post, once; the search happens with movement, by the men of the assault, from cover',()=>{
  control=run(19390901,false);
  const {sim,searches,asks,blasts,since}=control;
  // the round: one crater, one blast event of kind shell, where and when the data say (a tick of 0.05 s)
  const c=crater(sim);assert.equal(c.length,1,'one round in the whole game');assert.equal(blasts.length,1);
  assert.ok(Math.abs(c[0].started-(since+S.delaySec))<=.051,`it fell ${S.delaySec} s after the last man of the rearguard took his post (${c[0].started.toFixed(2)} vs ${(since+S.delaySec).toFixed(2)})`);
  assert.equal(c[0].x,FRONT.x+S.aheadM);assert.equal(c[0].z,FRONT.z);assert.equal(c[0].y,0,'on the roadway');
  assert.deepEqual(c[0].dust,{r:8,h:7,d:1,life:30},'a cloud of kind shell');assert.equal(c[0].smokeSeconds,30);
  assert.equal(blasts[0].aerial,false);assert.deepEqual(blasts[0].point,{x:c[0].x,y:c[0].y,z:c[0].z});assert.equal(blasts[0].effects,undefined,'it hurt and shook no one');
  assert.ok(S.aheadM>20,'out of the 20 m ring in which a shell shakes a man');
  // the search: pinned (deterministic), after the round and while its cloud stands, by the assault men only, with movement (the bound is the event)
  assert.equal(searches.length,5,'five searches on the control golden route');
  assert.ok(searches.every(e=>/^de_spans_[4-9]$/.test(e.by)),'by men of the assault, never the overwatch');
  assert.ok(searches.every(e=>e.at>=c[0].started&&e.at<=c[0].started+c[0].dust.life),'after the round and while its cloud stands');
  assert.deepEqual(searches.map(e=>e.by),['de_spans_6','de_spans_8','de_spans_5','de_spans_4','de_spans_7']);
  assert.ok(asks.some(a=>a.result&&a.phase==='cover'),'the search of R2-b (from cover) acts');
  assert.ok(asks.filter(a=>a.deepest).every(a=>!a.result),'nobody searches from his deepest line (safeX stays the end of every movement)');
  // the plot, the essential men, the player
  assert.equal(sim.mission.complete,true);assert.equal(sim.battleClock,seconds('07:05:00'));assert.equal(sim.checkpointsReached.length,4);
  assert.equal(Object.keys(sim.objectives).length,12);assert.equal(sim.flags['m01.east_platoon_survivors'],12);
  for(const m of definition.cast.filter(m=>m.essential))assert.ok(sim.actor(m.id).alive,`${m.id} is alive at the end`);
  assert.ok(sim.player.alive!==false&&sim.player.health>0);
});

test('the support golden route (seed 7): the round falls too, and the one search is the search of a man who HOLDS a line (golden amendment 22, tactics.search.hold)',()=>{
  support=run(7,true);
  const {sim,searches,asks,blasts,since}=support;
  const c=crater(sim);assert.equal(c.length,1);assert.equal(blasts.length,1);
  assert.ok(Math.abs(c[0].started-(since+S.delaySec))<=.051);assert.equal(c[0].x,FRONT.x+S.aheadM);
  assert.equal(searches.length,1,'one search on the support golden route');
  assert.equal(searches[0].by,'de_spans_7');assert.ok(searches[0].at>=c[0].started&&searches[0].at<=c[0].started+c[0].dust.life);
  const ok=asks.filter(a=>a.result);assert.equal(ok.length,1);assert.equal(ok[0].phase,'hold','the man held his line when he lost the Poles and took the bound toward the next one');
  assert.equal(ok[0].deepest,false);
  assert.equal(sim.mission.complete,true);assert.equal(sim.battleClock,seconds('07:05:00'));assert.equal(sim.checkpointsReached.length,4);
  assert.equal(sim.flags['m01.east_platoon_survivors'],18);
  for(const m of definition.cast.filter(m=>m.essential))assert.ok(sim.actor(m.id).alive,`${m.id} is alive at the end`);
  assert.ok(sim.player.alive!==false&&sim.player.health>0);
});

test('the plot is the plot without the round: the same 12 objectives, CP-A..D, 07:05, consumed events, flags and survivors; and the round changes the fight (the route has searches only with it)',()=>{
  controlOff=run(19390901,false,Off);
  assert.equal(crater(controlOff.sim).length,0);assert.equal(controlOff.searches.length,0,'without the round the golden route makes no search (what the amendment measured before)');
  assert.deepEqual(plot(control.sim),plot(controlOff.sim));
  assert.notEqual(str(control.sim.snapshot(false)),str(controlOff.sim.snapshot(false)),'and the fight is not the same fight');
});

test('the round touches no one: the burst changes not one man (health, state, pin, place) in the call that makes it, and lands outside the ring that shakes a man',()=>{
  // The fight runs on without the round (class Off) up to the tick it is due; then the real call of the simulation is made by hand: it may add the crater and the report and nothing else.
  const s=load(control.formedSnap,Off);
  tickFor(s,S.delaySec+.1);
  assert.equal(crater(s).length,0);assert.ok(s.clock>=control.since+S.delaySec,'the round is due');
  const before=str(s.actors);s.drainEvents();
  M01Simulation.prototype.updateDeckSupport.call(s);
  assert.equal(crater(s).length,1,'the call made the round');
  assert.equal(str(s.actors),before,'and touched not one man: health, state, pin, place, everything is as it was');
  const made=s.drainEvents();assert.equal(made.length,1,'its only event is the report');assert.equal(made[0].type,'m01-blast');assert.equal(made[0].kind,'shell');assert.equal(made[0].effects,undefined);
  // the ring in which a shell shakes a man (m01-shell-blast.js) is 20 m: every Pole is outside it
  const c=crater(s)[0];
  for(const a of s.actors.filter(a=>a.team==='ally'&&!a.displayOnly&&a.alive&&a.active))assert.ok(Math.hypot(a.x-c.x,a.z-c.z)>20,`${a.id} is ${Math.hypot(a.x-c.x,a.z-c.z).toFixed(1)} m from the burst`);
});

test('the cloud hides the Poles from the Germans of the deck while it stands, and only then',()=>{
  const s=load(control.formedSnap);
  tickFor(s,S.delaySec+.5);const c=crater(s)[0];assert.ok(c,'the round has fallen');
  const german=s.actors.find(a=>a.group==='grp_de_spans'&&a.deck&&a.alive&&a.active&&deckRole(a)==='assault'&&a.x>c.x+60);
  const pole=s.actor(REARGUARD.men[0]);
  assert.ok(german&&pole.alive);
  assert.equal(s.world.lineOfSight(german,pole),true,'the world sees him (a straight deck)');
  assert.equal(s.sees(german,pole),false,'the cloud does not');
  assert.equal(s.sees(pole,german),false,'and the same the other way');
  assert.equal(s.sees(german,s.player),false,'nor the player behind the Poles');
  tickFor(s,c.dust.life+1);   // the cloud is gone
  assert.equal(dustClouds(s.sectors.damage,s.clock,[]).filter(k=>k.id===DECK_SUPPORT_ID).length,0);
});

test('when the round falls: never before delaySec, never when no man of the assault is still coming, never with the player within the safe distance, never after the window',()=>{
  const dueAt=control.since+S.delaySec;
  // (a) before delaySec nothing; the tick it is due it falls
  const a=load(control.formedSnap);let first=null;
  for(let i=0;i<Math.round((S.delaySec+2)*20);i++){a.tick(.05);if(first===null&&crater(a).length)first=a.clock;if(a.clock<dueAt-.06)assert.equal(crater(a).length,0,`nothing at ${a.clock.toFixed(2)}`);}
  assert.ok(first!==null&&first>=dueAt-.001&&first<=dueAt+.1,`it fell at ${first} (due ${dueAt.toFixed(2)})`);
  // (b) nobody of the assault still coming (all fallen back / clear): no round, and none later
  const b=load(control.formedSnap);
  for(const m of b.actors.filter(m=>m.group==='grp_de_spans'&&m.deck&&deckRole(m)==='assault'))m.deck.phase='clear';
  assert.equal(coming(b),false);tickFor(b,S.delaySec+S.windowSec+3);assert.equal(crater(b).length,0,'no man coming, no round');
  // (c) the player within the safe distance of the point: no round while he stands there, and the window runs out
  const c=load(control.formedSnap);c.player.x=FRONT.x+S.aheadM-SAFE_IMPACT_M+1;c.player.z=FRONT.z;
  tickFor(c,S.delaySec+S.windowSec+1,(s)=>{s.player.x=FRONT.x+S.aheadM-SAFE_IMPACT_M+1;s.player.z=FRONT.z;});
  assert.equal(crater(c).length,0,'the player is within the safe distance');
  // (d) never after the window: a save made after it (the same fight, run on without the round) gets no round
  const off=load(control.formedSnap,Off);tickFor(off,S.delaySec+S.windowSec+1);
  const late=load(off.snapshot(false));tickFor(late,10);assert.equal(crater(late).length,0,'a save made after the window never gets a round it did not have');
});

test('saved and restored: the crater is the record (no new key), a save after the round does not repeat it, a save before it gets it at the same moment, and the validator keeps the round at most once and only after the assault began',()=>{
  const s=load(control.formedSnap);
  tickFor(s,S.delaySec+1);assert.equal(crater(s).length,1);
  const raw=s.snapshot(false);validateM01Snapshot(raw);
  assert.deepEqual(Object.keys(raw.timers).filter(k=>/support/i.test(k)),[],'no new saved timer');
  const back=load(raw);tickFor(back,20);tickFor(s,20);assert.equal(crater(back).length,1,'restored, it does not fall twice');
  assert.equal(str(back.snapshot(false)),str(s.snapshot(false)),'the restored fight is the same fight');
  // a save made before the round (the formed one): the round comes at the same moment as in the route
  const early=load(control.formedSnap);tickFor(early,S.delaySec+.5);assert.equal(Math.abs(crater(early)[0].started-(control.since+S.delaySec))<=.051,true);
  // the validator: twice is refused
  const twice=JSON.parse(JSON.stringify(raw));twice.sectors.damage.push({...twice.sectors.damage.find(d=>d.id===DECK_SUPPORT_ID)});
  assert.throws(()=>validateM01Snapshot(twice),/destruição/);
  // and before the deck assault began it is refused (a fabricated record in an early save)
  const early2=new M01Simulation(1).snapshot(false);early2.sectors.damage.push({...raw.sectors.damage.find(d=>d.id===DECK_SUPPORT_ID),started:0,soundAt:0});
  assert.throws(()=>validateM01Snapshot(early2),/destruição/);
});

test('deterministic: the same fight twice from the same save is the same fight to the last byte, and neither the round nor the search draws from any stream (the game\'s or the man\'s)',()=>{
  const draws=[];
  class Watch extends M01Simulation{
    updateDeckSupport(){const r=this.rng.state;super.updateDeckSupport();draws.push(['support',r===this.rng.state]);}
    deckSearch(a){const r=this.rng.state,own=a.ai.rng,out=super.deckSearch(a);draws.push(['search',r===this.rng.state&&own===a.ai.rng,out]);return out;}
  }
  const a=load(control.formedSnap,Watch),b=load(control.formedSnap);
  const ea=tickFor(a,40),eb=tickFor(b,40);
  assert.equal(str(ea),str(eb));assert.equal(str(a.snapshot(false)),str(b.snapshot(false)));
  assert.ok(draws.filter(d=>d[0]==='support').length>100,'the round was asked every tick of the window');assert.ok(draws.filter(d=>d[0]==='search'&&d[2]).length>=3,'and the search made its bounds');
  assert.ok(draws.every(d=>d[1]),'not one draw from the main stream or from the stream of the man who searched');
});
