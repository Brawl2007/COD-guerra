// R2-b (2026-10-24, owner complaint «os polacos fazem pouco para contrariar o ataque; os inimigos mostram pouca inteligência; combate artificial»): the fight for the road deck, part 2: the tactics.
//   the lines       the assault closes in stages (line 0 = the old limit, then the closing lines down to safeX) only while the Poles who hold the deck are under fire and nobody of the assault fell lately;
//                   a casualty on a closing line sends the man one line back; the deadline of the squad grows only while a man is on a closing line.
//   the girders     on the closing lines the two girders bound in turn (a man waits, at most alternateWaitSec, while a man of the other girder is on the run).
//   the Poles       the Germans take the Poles who hold the deck for targets (rounds of kind squad: they pin, they never wound), remember where they saw them, and a deck round pins them for pinSec.
//   the search      a man in cover who lost sight of the Pole he saw moves on to the station from which a man on his feet would see the place, never past his limit.
//   the grenade     a stick grenade at a Pole the man cannot hit with the rifle, within a throw; the fairness (F1, the level's wound, the fuse as the warning, the player in the open is never the target).
// State-level tests on hand-made scenes on a save of the first tick of the deck assault (tests/helpers/m01-deck-scene.js); no browser, no human. Part 1: tests/m01-german-ai.test.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation,validateM01Snapshot} from '../src/game/m01-simulation.js';
import {DECK_SAFE_X,deckLines,deckLimitNode,deckLineNumber} from '../src/game/m01-deck-assault.js';
import {M01_DIFFICULTY} from '../src/game/m01-difficulty.js';
import {validateM01AudioEvent} from '../src/game/m01-audio-events.js';
import {atLevel} from './helpers/m01-danger.js';
import {json} from './helpers/m01-determinism.js';
import {P,T,dist,load,entry,station,isolate,pair,scene,eventsOf} from './helpers/m01-deck-scene.js';

const calm=s=>{for(const a of pair(s))a.rounds=0;};   // the Poles of the section hold their fire (a scene about the lines is not about their rifles)
const tactic=(evs,kind)=>evs.filter(e=>e.type==='deck-tactic'&&(!kind||e.kind===kind));
const pin=s=>{for(const a of pair(s))a.suppressedUntil=s.clock+5;};

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
test('the lines: a man at his line presses on to the next one only while the Poles who hold the deck are under fire and nobody of the assault fell for casualtyHoldSec; one line at a time, never west of the deepest',()=>{
  const run=({pinned,fell=null,secs})=>{
    const {s}=scene();calm(s);
    const man=station(s,'de_spans_4',P.lines[0][0],{phase:'hold',until:s.clock+400,cooldown:1e6});
    if(fell!==null)Object.assign(s.actor('de_spans_5'),{alive:false,health:0,state:'DOWN',diedAt:s.clock-fell,x:700});   // a casualty `fell` s ago, east of the lines
    const t0=s.clock;let minX=Infinity;const evs=eventsOf(s,20*secs,{each:s=>{if(pinned)pin(s);minX=Math.min(minX,man.x);}});
    return {s,man,evs,tactics:tactic(evs),minX,first:tactic(evs)[0]&&tactic(evs)[0].at-t0};
  };
  // pinned Poles and nobody fallen: line 1 at once, line 2 when he has got there; the events say so
  const a=run({pinned:true,secs:75});
  assert.deepEqual(a.tactics.map(e=>[e.kind,e.line,e.by]),[['stage',1,'de_spans_4'],['stage',2,'de_spans_4']]);
  assert.ok(a.first<.2,`the first line is opened at once (${a.first})`);
  const deepest=P.paths[0].at(-1).x;assert.ok(a.minX>=deepest-.5&&a.minX<=deepest+1.5,`he reaches the deepest line (x ${a.minX.toFixed(1)}, line x ${deepest}) and goes no further`);
  assert.equal(deckLineNumber(a.man),2);assert.equal(a.man.deck.lim,P.lines[0][2]);
  // the Poles not under fire: he keeps his line (it is the old fight)
  const b=run({pinned:false,secs:40});assert.deepEqual(b.tactics,[]);assert.equal(b.man.deck.phase,'hold');assert.equal(b.man.deck.lim,undefined);assert.equal(b.man.x,P.limits[0]);
  // a man of the assault fell 5 s ago: the pressure is not enough until casualtyHoldSec after it
  const c=run({pinned:true,fell:5,secs:25});
  assert.ok(c.first>=T.casualtyHoldSec-5-.1&&c.first<=T.casualtyHoldSec-5+.2,`the stage waits for the casualty to be ${T.casualtyHoldSec} s old (${c.first})`);
  // the Poles under fire only a moment ago still count (pressure.windowSec), a second after that they do not
  const {s}=scene();calm(s);const man=station(s,'de_spans_4',P.lines[0][0],{phase:'hold',until:s.clock+400,cooldown:1e6});
  for(const x of pair(s))x.suppressedUntil=s.clock-T.pressure.windowSec+.5;
  assert.ok(s.deckPressure()>0&&s.deckPressure()<1+1e-9);s.tick(.05);assert.equal(deckLineNumber(man),1,'half a second of the window left');
  const {s:s2}=scene();calm(s2);const m2=station(s2,'de_spans_4',P.lines[0][0],{phase:'hold',until:s2.clock+400,cooldown:1e6});
  for(const x of pair(s2))x.suppressedUntil=s2.clock-T.pressure.windowSec-.5;
  s2.tick(.05);assert.equal(deckLineNumber(m2),0,'but not after it');
  // the share: one of the two pinned is exactly pressure.share (0.5)
  const {s:s3}=scene();calm(s3);const m3=station(s3,'de_spans_4',P.lines[0][0],{phase:'hold',until:s3.clock+400,cooldown:1e6});
  pair(s3)[0].suppressedUntil=s3.clock+5;assert.equal(s3.deckPressure(),.5);s3.tick(.05);assert.equal(deckLineNumber(m3),1,'half of them is the share');
  // nobody holds the deck (the pair gone, the rearguard not formed): no pressure to speak of
  const {s:s4}=scene();calm(s4);const m4=station(s4,'de_spans_4',P.lines[0][0],{phase:'hold',until:s4.clock+400,cooldown:1e6});
  for(const x of pair(s4)){x.suppressedUntil=s4.clock+5;x.active=false;}
  assert.equal(s4.deckDefenders().length,0);assert.equal(s4.deckPressure(),0);s4.tick(.05);assert.equal(deckLineNumber(m4),0);
});

test('a casualty on a closing line turns the front back one line; one on the approach does not; the man walks back to the line he left',()=>{
  const setup=(line,diedX,diedAgo=1)=>{
    const {s}=scene();calm(s);
    const lines=P.lines[0],man=station(s,'de_spans_4',lines[line],{phase:'hold',since:5,until:s.clock+60,cooldown:1e6,lim:lines[line]});
    Object.assign(s.actor('de_spans_5'),{alive:false,health:0,state:'DOWN',diedAt:s.clock-diedAgo,x:diedX});
    return {s,man,lines};
  };
  // a man fell on his own line 0 (east of the lines is not that): from line 1 back to line 0, whose limit is the old one (no `lim` any more)
  let {s,man,lines}=setup(1,480);let evs=eventsOf(s,2);
  assert.deepEqual(tactic(evs).map(e=>[e.kind,e.line]),[['pullback',0]]);assert.equal(man.deck.lim,undefined);assert.equal(man.deck.node,lines[0]);assert.equal(man.deck.phase,'advance');
  assert.equal(Math.cos(man.facing),1,'turned to the east: the section reads a man going back as a fall-back');
  let arrived=null;for(let i=0;i<20*40&&arrived===null;i++){s.tick(.05);s.drainEvents();if(man.deck.phase==='hold')arrived=i/20;}
  assert.ok(arrived!==null&&arrived>5&&Math.abs(man.x-P.limits[0])<1,`he walks back to the node of line 0 and holds it (${arrived} s, x ${man.x.toFixed(1)})`);
  // two lines: line 2 goes back to line 1 and keeps it as his limit
  ({s,man,lines}=setup(2,480));evs=eventsOf(s,2);assert.deepEqual(tactic(evs).map(e=>[e.kind,e.line]),[['pullback',1]]);assert.equal(man.deck.lim,lines[1]);assert.equal(man.deck.node,lines[1]);
  // a man who fell east of his own line 0 (the approach, the fall-back): no pullback (the casualty still keeps the pressure off for casualtyHoldSec)
  ({s,man}=setup(1,700));evs=eventsOf(s,20);assert.deepEqual(tactic(evs),[]);assert.equal(deckLineNumber(man),1);assert.equal(man.deck.phase,'hold');
  // a casualty from before he took the line does not count either
  ({s,man}=setup(1,480,60));man.deck.since=s.clock-1;evs=eventsOf(s,20);assert.deepEqual(tactic(evs,'pullback'),[]);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
test('the two girders bound in turn on the closing lines: a man whose cover is over waits, at most alternateWaitSec, while a man of the other girder is on the run; same girder, line 0 and before: no wait',()=>{
  const lines=P.lines[0];
  // A = de_spans_4 (north girder, z 37.7) on the end of line 0 with line 1 as his limit, his cover over `over` s ago; B = a man of the girder `other` ('de_spans_5' south, 'de_spans_8' north) on the run
  const stage=({over=1,node=lines[0],other='de_spans_5',run=true}={})=>{
    const {s}=scene();calm(s);isolate(s,['de_spans_4',other]);
    const a=station(s,'de_spans_4',node,{phase:'cover',since:5,until:s.clock-over,cooldown:1e6,lim:lines[1]});
    const k=P.assault.indexOf(other),b=station(s,other,P.lines[k][0]-1,{phase:run?'advance':'cover',since:1,until:s.clock+30,cooldown:1e6});
    if(run)b.x+=20;   // 20 m from the node he is running to
    return {s,a,b,k};
  };
  let {s,a}=stage();s.tick(.05);
  assert.equal(a.deck.phase,'cover','the other girder is on the run: he waits for it');
  let left=null;for(let i=0;i<20*7&&left===null;i++){s.tick(.05);s.drainEvents();if(a.deck.phase!=='cover')left=(i+2)/20;}
  assert.equal(a.deck.phase,'advance','and goes when the man has got there (20 m at 5.2 m/s: 3.8 s) or the wait is over');
  assert.ok(left>3.6&&left<=T.alternateWaitSec-1+.2,`he left his cover ${left} s after the check: the other man ran 3.8 s, the wait ends ${T.alternateWaitSec-1} s after`);
  // never longer than alternateWaitSec after his cover is over
  ({s,a}=stage({over:T.alternateWaitSec+.5}));s.tick(.05);assert.equal(a.deck.phase,'advance','the wait is over: he goes at once');
  ({s,a}=stage({over:T.alternateWaitSec-.5}));s.tick(.05);assert.equal(a.deck.phase,'cover');
  // the same girder: no wait
  ({s,a}=stage({other:'de_spans_8'}));s.tick(.05);assert.equal(a.deck.phase,'advance','de_spans_8 is on the north girder too');
  // the other girder, standing in cover and not running: no wait
  ({s,a}=stage({run:false}));s.tick(.05);assert.equal(a.deck.phase,'advance');
  // line 0 and before: no wait at all (the old assault)
  ({s,a}=stage({node:lines[0]-3}));s.tick(.05);assert.equal(a.deck.phase,'advance','before his line 0 nobody waits');
  // the order of the bounds in a whole advance of the two girders (north: 4, 8, 9; south: 5, 6, 7), both stepping on the closing lines: nobody rushes while the other girder is on the run (so far as the wait allows)
  const {s:w}=scene();calm(w);isolate(w,['de_spans_4','de_spans_5']);
  const n=station(w,'de_spans_4',lines[0],{phase:'hold',until:w.clock+400,cooldown:1e6}),so=station(w,'de_spans_5',P.lines[1][0],{phase:'hold',until:w.clock+400,cooldown:1e6});
  const running=(m,k)=>{const node=P.paths[k][m.deck.node];return m.deck.phase==='advance'&&dist(m,node)>=.9;};
  let overlap=0,runs=0;
  for(let i=0;i<20*50;i++){
    pin(w);w.tick(.05);w.drainEvents();
    if(n.deck.node>=lines[0]&&so.deck.node>=P.lines[1][0]){runs++;if(running(n,0)&&running(so,1))overlap++;}
  }
  assert.ok(runs>200,`they were on the closing lines for ${runs} ticks`);
  assert.ok(overlap<=runs*.15,`on the run together for ${overlap} of ${runs} ticks (the cover times are drawn, the wait is bounded: a few ticks of overlap, not the old simultaneous rush)`);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The Poles as targets.
test('the Poles who hold the deck are targets of the assault (kind squad), remembered where they were seen (ai.seen); the ones who fire at him are answered first; the overwatch, the range and the west side are as they were',()=>{
  const {s,t}=scene({at:[320,41.2]});
  Object.assign(s.player,{x:-60,z:20});assert.equal(s.world.lineOfSight(t,s.player),false,'the player is out of his sight');
  const [pawlak,voice]=pair(s);
  const draw=(n,over=false)=>{const out={};for(let i=0;i<n;i++){const r=s.deckTarget(t,true,false,over);const k=r?`${r.kind}:${r.id}`:'none';out[k]=(out[k]??0)+1;}return out;};
  // both Poles in sight, neither has fired: equal shares; nothing else is a target
  pawlak.firedAt=voice.firedAt=-1e9;
  const a=draw(2000);assert.deepEqual(Object.keys(a).sort(),['squad:east_platoon_voice','squad:staszek_pawlak']);
  assert.ok(Math.abs(a['squad:staszek_pawlak']/2000-.5)<.06,JSON.stringify(a));
  // what he saw is remembered: the nearest of them (Pawlak at x 19.8 is nearer to a man at 320 than the voice at 16.6)
  assert.deepEqual({who:t.ai.seen.who,at:t.ai.seen.at,x:t.ai.seen.x},{who:'staszek_pawlak',at:s.clock,x:pawlak.x});
  // the one who has just fired is answered three times as often (as the player who fires is)
  voice.firedAt=s.clock;const b=draw(4000);assert.ok(Math.abs(b['squad:east_platoon_voice']/4000-.75)<.04,JSON.stringify(b));
  // the overwatch does not take them; nor does a man 520 m or more away; nor a Pole east of the man
  assert.deepEqual(draw(20,true),{none:20});
  t.x=pawlak.x+T.squadTargets.rangeM+5;t.y=s.world.heightAt(t.x,t.z);assert.deepEqual(draw(20),{none:20},'beyond squadTargets.rangeM');
  t.x=10;assert.deepEqual(draw(20),{none:20},'the Poles are east of him: they are not targets of a man who has passed them');
});

test('a round of the assault cracks past a man who holds the deck: he is pinned for pinSec (the section\'s pair, the rearguard), any other ally for 1.5 s as before; nobody is wounded',()=>{
  const {s,t}=scene({at:[320,41.2]});
  Object.assign(s.player,{x:-60,z:20});
  const [pawlak,voice]=pair(s),kowal=s.actor('szymon_kowal');
  const land=(by,target)=>{
    const before=[pawlak,voice,kowal].map(x=>x.suppressedUntil);
    s.burst(by,target,'squad',{rounds:1,bias:[0,0],cone:[0,0]});
    for(let i=0;i<20*4;i++){s.tick(.05);s.drainEvents();if([pawlak,voice,kowal].some((x,j)=>x.suppressedUntil>before[j]))break;}
    return [pawlak,voice,kowal].map(x=>+(x.suppressedUntil-s.clock).toFixed(2));
  };
  calm(s);
  // a round of de_spans_4 along the lane at Pawlak: both of the pair are within 3 m of its path
  let [p,v]=land(t,pawlak);assert.ok(Math.abs(p-T.pinSec)<.06&&Math.abs(v-T.pinSec)<.06,`pinned ${p} s and ${v} s, pinSec ${T.pinSec}`);
  assert.equal(pawlak.health,100);assert.equal(voice.health,100);assert.equal(pawlak.alive,true);
  // a round of the east group (not a man of the deck assault): the old 1.5 s
  for(const x of pair(s))x.suppressedUntil=0;
  const east=s.actor('de_east_14');Object.assign(east,{x:320,z:41.2,y:s.world.heightAt(320,41.2)});
  [p,v]=land(east,pawlak);assert.ok(Math.abs(p-1.5)<.06&&Math.abs(v-1.5)<.06,`${p} ${v}`);
  // a round of the assault at a man who is no deck defender (Kowal, with the rkm) pins him 1.5 s too
  for(const x of pair(s))x.suppressedUntil=0;
  Object.assign(kowal,{active:true,x:60,z:41.2,y:0,state:'GUARD',crouched:false});
  const k=land(t,kowal);assert.ok(Math.abs(k[2]-1.5)<.06,`Kowal ${k[2]}`);assert.equal(kowal.health,100);
  assert.ok(T.pinSec>1.5,'and the deck defenders are pinned longer than that');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The search. The scenes put a wall across the deck (all six lanes) between the man's node and the place where he last saw a Pole: the stations east of it do not see the place, those west of it do.
const wallAt=x=>({id:`t_wall_${x}`,min:{x,y:-1,z:30},max:{x:x+2,y:8,z:50},material:'stone'});
const SEEN={x:300,y:0,z:41.2};
function searcher({node=17,phase='cover',seenAgo=5,wallX=590,lim,who='player'}={}){
  const {s}=scene();calm(s);
  const man=station(s,'de_spans_4',node,{phase,since:2,until:s.clock+30,cooldown:1e6,lim});
  if(seenAgo!==null)man.ai.seen={...SEEN,at:s.clock-seenAgo,who};
  if(wallX!==null)s.world.obstacles.push(wallAt(wallX));
  return {s,man};
}

test('the search: a man in cover on his way to his line who lost sight of the Pole he saw moves on to the first station from which a man on his feet would see the place, at most one bound, never past his limit',()=>{
  // the wall at 590 hides the place from stations 17 (606) and 16; station 18 (582) sees it
  let {s,man}=searcher();
  assert.equal(s.deckSearch(man),true);
  assert.deepEqual([man.deck.node,man.deck.phase,man.deck.since,man.deck.until,man.ai.peek,man.crouched],[18,'advance',s.clock,s.clock,0,false]);
  assert.deepEqual(tactic(eventsOf(s,1)).map(e=>[e.kind,e.by,e.line]),[['search','de_spans_4',0]]);
  // he gets there, kneels, and looks again (his cover phase): the way is the lane's, one station (the wall was only there to hide the place: it is gone before he walks)
  s.world.obstacles.pop();
  for(let i=0;i<20*8&&man.deck.phase==='advance';i++){s.tick(.05);s.drainEvents();}
  assert.equal(man.deck.phase,'cover');assert.ok(Math.abs(man.x-P.paths[0][18].x)<.9,`at station 18 (x ${man.x})`);
  // no wall: the first station ahead sees it, and that is where he goes (not two)
  ({s,man}=searcher({wallX:null}));assert.equal(s.deckSearch(man),true);assert.equal(man.deck.node,18);
  // the wall at 540 hides it from 18 and 19, the two stations of his bound: he stays where he is
  ({s,man}=searcher({wallX:540}));assert.equal(s.deckSearch(man),false);assert.deepEqual([man.deck.node,man.deck.phase],[17,'cover']);
  // the memory: not before afterSec, not after memorySec; the place at the boundaries counts
  for(const [ago,ok] of [[T.search.afterSec-.1,false],[T.search.afterSec,true],[T.search.memorySec,true],[T.search.memorySec+.1,false],[60,false]]){
    ({s,man}=searcher({seenAgo:ago}));assert.equal(s.deckSearch(man),ok,`seen ${ago} s ago`);
  }
  ({s,man}=searcher({seenAgo:null}));assert.equal(s.deckSearch(man),false,'a man who saw nobody has nothing to look for');
  // only in cover: a man who is running, holding his line, falling back or gone does not
  for(const phase of ['advance','hold','fallback','clear']){({s,man}=searcher({phase}));assert.equal(s.deckSearch(man),false,phase);assert.equal(man.deck.phase,phase);}
  // never past his limit: on the last station of line 0 there is no station to go to; one station before it, the limit is the one he may take; a station beyond it is not looked at
  const limit=P.lines[0][0];
  ({s,man}=searcher({node:limit,wallX:null}));assert.equal(s.deckSearch(man),false,'at his limit');
  ({s,man}=searcher({node:limit-1,wallX:470}));assert.equal(s.deckSearch(man),true);assert.equal(man.deck.node,limit,'the limit itself is allowed');
  ({s,man}=searcher({node:limit-1,wallX:440}));assert.equal(s.deckSearch(man),false,'the station that would see it (438) lies beyond line 0');
  // with line 1 as his limit the same station is his to take
  ({s,man}=searcher({node:limit,wallX:440,lim:P.lines[0][1]}));assert.equal(s.deckSearch(man),true);assert.equal(man.deck.node,limit+1);assert.equal(deckLineNumber(man),1);
});

test('the search through the fight: a man who saw the Poles and has none in sight at his next trigger moves on instead of firing at the place; a man who still sees one fires and stays',()=>{
  const run=({wallAfter})=>{
    const {s}=scene();calm(s);
    const man=station(s,'de_spans_4',17,{phase:'cover',since:2,until:s.clock+60,cooldown:.1});
    const evs=[],t0=s.clock;let walled=false,seenAt=null;
    for(let i=0;i<20*20;i++){
      s.tick(.05);for(const e of s.drainEvents())evs.push(e);
      if(seenAt===null&&man.ai.seen)seenAt=s.clock;
      if(!walled&&seenAt!==null&&wallAfter){walled=true;s.world.obstacles.push(wallAt(590));man.cooldown=T.search.afterSec+1;}   // his next trigger is afterSec + 1 s from now
    }
    return {s,man,evs,seenAt,t0};
  };
  const a=run({wallAfter:true});
  assert.ok(a.seenAt!==null,'he saw somebody at his first trigger');
  assert.deepEqual(tactic(a.evs,'search').map(e=>[e.by,e.line]),[['de_spans_4',0]]);
  assert.ok(a.man.deck.node>=18,'and went on');
  const b=run({wallAfter:false});
  assert.deepEqual(tactic(b.evs,'search'),[],'no wall: he sees them and fires');
  assert.equal(b.man.deck.node,17);
  assert.ok(b.man.firedAt>b.t0,'and fired');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The stick grenade. deckGrenade is called by the man's trigger (deckFire) before his rifle; the scenes call it directly. The player sits in the authored cover cv_sandbag_mid_2 of the west bank (the sim's own
// test of cover: world.coverAt) and the German 20 m east of him; the grenade needs no deck under it.
const COVER={x:-26.5,z:28};
function bomber({level='recruta',gap=20,phase='cover',node=17,player=[COVER.x,COVER.z],crouched=true,pairOn=false}={}){
  const {s}=scene({level});calm(s);
  if(!pairOn)for(const a of pair(s))a.active=false;   // (the Poles of the section are not part of the scene unless it says so)
  Object.assign(s.player,{x:player[0],z:player[1],y:s.world.heightAt(player[0],player[1]),crouched});
  const man=station(s,'de_spans_4',node,{phase,since:2,until:s.clock+30,cooldown:1e6});
  man.x=player[0]+gap;man.z=player[1];man.y=s.world.heightAt(man.x,man.z);
  return {s,man};
}
const german=s=>s.grenades.active.filter(g=>g.by);

test('the stick grenade: thrown at a Pole the man cannot hit with the rifle (the player in authored cover, a defender behind a wall) within a throw, from his feet, once per man and once per gapSec for the squad; a flat arc, the fuse as the warning',()=>{
  let {s,man}=bomber({level:'soldado'});
  assert.ok(s.world.coverAt(s.player),'the player is in authored cover');assert.equal(s.world.lineOfSight(man,s.player),true,'and in the sight of the German: cover is what keeps the rifle off him');
  const rng=s.rng.state,clock=s.clock;
  assert.equal(s.deckGrenade(man),true);
  assert.equal(s.rng.state,rng,'no draw from the main stream');
  const [g]=german(s);assert.equal(german(s).length,1);
  assert.deepEqual(Object.keys(g).sort(),['at','by','fuse','id','vx','vy','vz','x','y','z']);
  assert.deepEqual([g.by,g.at,g.fuse,g.id],['de_spans_4',clock,T.grenade.fuseSec,'m01_grenade_0']);
  assert.deepEqual([g.x,g.z],[man.x,man.z],'from his feet (the arm 1.5 m up)');assert.ok(Math.abs(g.y-(man.y+1.5))<1e-9);
  assert.equal(man.deck.gr,1);assert.equal(s.timers.deckGrenadeAt,clock);assert.equal(man.cooldown,T.grenade.gapSec);assert.equal(man.state,'SUPPRESS');assert.equal(man.crouched,false);
  assert.ok(Math.abs(Math.cos(man.facing)+1)<.01,'facing the target (west)');
  const ev=s.drainEvents(),thrown=ev.find(e=>e.type==='enemy-grenade');
  assert.deepEqual([thrown.by,thrown.fuse,thrown.flight,thrown.at],['de_spans_4',T.grenade.fuseSec,T.grenade.flightSec,clock]);
  // the arc lands within a few metres of the player (error 5 % of 20 m), t = flightSec after the throw: integrate the flight as the game does
  const sim={x:g.x,y:g.y,z:g.z,vx:g.vx,vy:g.vy,vz:g.vz};for(let t=0;t<T.grenade.flightSec-1e-9;t+=.05){sim.vy-=9.81*.05;sim.x+=sim.vx*.05;sim.y+=sim.vy*.05;sim.z+=sim.vz*.05;}
  assert.ok(Math.hypot(sim.x-s.player.x,sim.z-s.player.z)<5,`lands ${Math.hypot(sim.x-s.player.x,sim.z-s.player.z).toFixed(1)} m from the player`);
  assert.ok(Math.abs(sim.y-s.world.heightAt(sim.x,sim.z))<.6,'on the ground at the end of the flight');
  assert.deepEqual(ev.filter(e=>e.type==='message').map(e=>e.message),['Granada alemã! Afaste-se!'],'the HUD says it is coming when it falls near the player');
  // F1: the throw is the telegraph (soldado/veterano), so that the first grenade of an engagement cannot take the player to 0; recruta keeps no such record
  assert.deepEqual(s.timers.telegraph.de_spans_4,{first:clock,last:clock});
  ({s,man}=bomber());s.deckGrenade(man);assert.equal(s.timers.telegraph,undefined);
  // once per man; once per gapSec for the squad
  ({s,man}=bomber());assert.equal(s.deckGrenade(man),true);
  s.clock+=T.grenade.gapSec+1;assert.equal(s.deckGrenade(man),false,'one grenade each');
  const other=station(s,'de_spans_5',P.lines[1][0]-3,{phase:'cover',since:2,until:s.clock+30,cooldown:1e6});Object.assign(other,{x:man.x,z:man.z+1});
  s.clock-=T.grenade.gapSec/2;assert.equal(s.deckGrenade(other),false,'and the squad throws one every gapSec');
  s.clock+=T.grenade.gapSec;assert.equal(s.deckGrenade(other),true);assert.equal(german(s).length,2);
  // his trigger throws before it fires: the same call through deckFire (the rifle is not used)
  ({s,man}=bomber());const fired=man.firedAt;man.cooldown=0;s.deckFire(man,false);assert.equal(german(s).length,1);assert.equal(s.enemyFire.rounds.length,0,'no round with the grenade');assert.ok(man.firedAt>fired);
  // the overwatch never throws
  ({s,man}=bomber());const over=s.actor('de_spans_0');Object.assign(over,{x:man.x,z:man.z});over.deck.phase='clear';over.cooldown=0;over.rounds=5;s.deckFire(over,false);assert.equal(german(s).length,0);
});

test('the stick grenade is never unfair: not at a player he can hit, not out of the throw, not from the run, not in the silence, not in a crowd; a defender he can hit is not a target',()=>{
  const throws=o=>{const {s,man}=bomber(o);return s.deckGrenade(man);};
  assert.equal(throws({}),true,'the reference');
  // the player in the open and in sight: the rifle is the weapon
  assert.equal(throws({player:[-20,28],crouched:false}),false,'east of the sandbags, standing, in sight');
  // the throw: minM 6 m to rangeM 32 m
  for(const [gap,ok] of [[T.grenade.minM-.1,false],[T.grenade.minM+.1,true],[T.grenade.rangeM-.1,true],[T.grenade.rangeM+.1,false],[60,false]])assert.equal(throws({gap}),ok,`${gap} m`);
  // from cover or his line only
  for(const [phase,ok] of [['cover',true],['hold',true],['advance',false],['fallback',false],['clear',false]])assert.equal(throws({phase}),ok,phase);
  // the silence of 06:10 to 06:11 (T48): nothing is started
  {const {s,man}=bomber();s.germanSilence=()=>true;assert.equal(s.deckGrenade(man),false);}
  // at most DECK_GRENADES_MAX in the air (eight): a crowd of them is not a thing the game draws
  {const {s,man}=bomber();for(let i=0;i<8;i++)s.grenades.active.push({id:`m01_grenade_${90+i}`,x:0,y:0,z:0,vx:0,vy:0,vz:0,fuse:2,by:'de_spans_5',at:s.clock-1});assert.equal(s.deckGrenade(man),false);}
  // a dead player is nobody's target
  {const {s,man}=bomber();s.player.alive=false;assert.equal(s.deckGrenade(man),false);}
  // the Poles of the deck: a defender he can hit with the rifle is not a target of a grenade; behind a wall he is, if he is within the throw; the player is out of it
  {
    const {s,man}=bomber({pairOn:true});Object.assign(s.player,{x:-60,z:20,crouched:false});
    const [pawlak]=pair(s);Object.assign(man,{x:pawlak.x+25,z:pawlak.z,y:s.world.heightAt(pawlak.x+25,pawlak.z)});
    assert.equal(s.world.lineOfSight(man,pawlak),true);assert.equal(s.deckGrenade(man),false,'Pawlak is in his sight: the rifle');
    s.world.obstacles.push({id:'t_wall',min:{x:30,y:-1,z:30},max:{x:32,y:8,z:50},material:'stone'});
    assert.equal(s.world.lineOfSight(man,pawlak),false);assert.equal(s.deckGrenade(man),true,'behind a wall he is a target');
    const g=german(s)[0],dd=Math.hypot(g.vx*T.grenade.flightSec+g.x-pawlak.x,g.vz*T.grenade.flightSec+g.z-pawlak.z);assert.ok(dd<5,`the throw is at Pawlak (${dd.toFixed(1)} m)`);
    s.world.obstacles.pop();
  }
  // a Pole east of the man is behind him, not a target
  {const {s,man}=bomber();man.x=COVER.x-10;assert.equal(s.deckGrenade(man),false);}
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The explosion.
function blast({level='recruta',health=100,dist=3,wall=false,telegraph=undefined,ally=null,germanAt=null,gunner='de_spans_4'}={}){
  const {s}=scene({level});calm(s);
  Object.assign(s.player,{crouched:false,health});   // (at his own post on the deck, in the open)
  const gx=s.player.x+dist,gz=s.player.z,gy=s.world.heightAt(gx,gz)+.08;
  if(wall)s.world.obstacles.push({id:'t_wall',min:{x:s.player.x+dist/2-.3,y:-5,z:gz-4},max:{x:s.player.x+dist/2+.3,y:6,z:gz+4},material:'stone'});
  s.grenades.active.push({id:'m01_grenade_0',x:gx,y:gy,z:gz,vx:0,vy:0,vz:0,fuse:.12,by:gunner,at:s.clock-3});
  if(telegraph!==undefined)s.timers.telegraph={[gunner]:telegraph(s.clock)};
  const bystanders={};
  if(ally){const a=s.actor(ally.id);Object.assign(a,{x:gx+ally.d,z:gz,y:s.world.heightAt(gx+ally.d,gz),suppressedUntil:0});bystanders.ally=a;}
  if(germanAt!==null){const g=s.actor('de_spans_5');Object.assign(g,{x:gx+germanAt,z:gz+.5,y:s.world.heightAt(gx+germanAt,gz),alive:true,health:100});bystanders.german=g;}
  const evs=[];let blasted=null;
  for(let i=0;i<20*2&&s.player.alive;i++){s.tick(.05);for(const e of s.drainEvents()){evs.push(e);if(e.type==='m01-blast'&&!blasted)blasted=s.clock;}}
  return {s,evs,blasted,...bystanders};
}

test('the explosion: one wound of the level (recruta 8, soldado 34, veterano 50) within woundM with a clear path; nothing behind a wall or beyond; the Germans untouched; the Poles pinned, never wounded',()=>{
  for(const [level,dmg] of [['recruta',8],['soldado',34],['veterano',50]]){
    const r=blast({level,dist:3});
    assert.equal(r.s.player.health,100-dmg,`${level}: -${dmg}`);assert.equal(r.evs.filter(e=>e.type==='player-hit').length,1,'one wound, however close');
    const b=r.evs.find(e=>e.type==='m01-blast');assert.deepEqual([b.kind,b.by,b.aerial],['grenade','de_spans_4',false]);assert.doesNotThrow(()=>validateM01AudioEvent(b));
    assert.equal(r.s.grenades.active.length,0,'it is gone');
    assert.equal(blast({level,dist:T.grenade.woundM+.1}).s.player.health,100,`${level}: ${T.grenade.woundM+.1} m is outside`);
    assert.equal(blast({level,dist:2,wall:true}).s.player.health,100,`${level}: a wall between`);
  }
  assert.ok(M01_DIFFICULTY.recruta.woundDamage===8&&M01_DIFFICULTY.soldado.woundDamage===34&&M01_DIFFICULTY.veterano.woundDamage===50);
  // 3.4 m: inside (the vertical distance counts: the grenade lies on the ground, his chest 0.9 m up)
  assert.equal(blast({dist:3.3}).s.player.health,92);
  // the Germans in the blast are untouched (it is a grenade of the deck assault); the Poles within suppressM with a clear path are pinned suppressSec and never wounded
  const g=blast({germanAt:1,ally:{id:'staszek_pawlak',d:T.grenade.suppressM-1}});
  assert.equal(g.german.health,100);assert.equal(g.german.alive,true);
  assert.equal(g.ally.health,100);assert.ok(g.ally.suppressedUntil>g.blasted&&g.ally.suppressedUntil<=g.blasted+T.grenade.suppressSec+1e-9&&g.ally.suppressedUntil>=g.blasted+T.grenade.suppressSec-.06,`pinned ${(g.ally.suppressedUntil-g.blasted).toFixed(2)} s`);
  const far=blast({ally:{id:'staszek_pawlak',d:T.grenade.suppressM+2}});assert.ok(far.ally.suppressedUntil<far.blasted,'beyond suppressM: not pinned');
  const walled=blast({wall:true,dist:6,ally:{id:'staszek_pawlak',d:-3}});assert.ok(walled.ally.suppressedUntil<walled.blasted,'behind the wall: not pinned');
});

test('the explosion is fair: the first grenade of an engagement never takes the player to 0 (F1), the thrower who has engaged him for the level\'s grace may; recruta has no such rule; the death has its own words',()=>{
  for(const level of ['soldado','veterano']){
    const grace=M01_DIFFICULTY[level].reactionGraceSec,dmg=M01_DIFFICULTY[level].woundDamage;
    // the throw is the telegraph (first = at): health stays at 1
    let r=blast({level,health:dmg-4,telegraph:c=>({first:c-3,last:c-3})});
    assert.equal(r.s.player.alive,true,level);assert.equal(r.s.player.health,1,`${level}: left at 1`);
    // nothing recorded (a thrower the bookkeeping does not know): the same
    r=blast({level,health:dmg-4});assert.equal(r.s.player.health,1);
    // he has been engaging the player for longer than the grace: the wound is what it is
    r=blast({level,health:dmg-4,telegraph:c=>({first:c-3-grace-.5,last:c-3})});
    assert.equal(r.s.player.alive,false,`${level}: lethal after ${grace} s of engagement`);
    assert.equal(r.s.failure,'Abatido por uma granada de mão do tabuleiro.');
    const down=r.evs.find(e=>e.type==='player-down');assert.deepEqual([down.cause,down.by,down.text],['shot','de_spans_4','Abatido por uma granada de mão do tabuleiro.']);
  }
  // recruta: -8, and a man at 8 or less is down (the prototype tuning, no F1)
  const r=blast({health:8});assert.equal(r.s.player.alive,false);assert.equal(r.s.failure,'Abatido por uma granada de mão do tabuleiro.');
  assert.equal(blast({health:9}).s.player.health,1);
});

test('the warning: the grenade lies on the ground for the rest of its fuse and the existing bark of Kowal (dlg_m01_138, «Granada! Abaixem!») fires for it; the renderer\'s data is the grenades.active entry',()=>{
  const {s,man}=bomber();
  const kowal=s.actor('szymon_kowal');Object.assign(kowal,{active:true,x:COVER.x+2,z:COVER.z+1,y:s.world.heightAt(COVER.x+2,COVER.z+1),state:'GUARD'});
  assert.equal(s.deckGrenade(man),true);
  const g=german(s)[0];
  let said=null,landed=null;
  for(let i=0;i<20*5&&german(s).length;i++){
    s.tick(.05);s.drainEvents();
    if(landed===null&&s.world.heightAt(g.x,g.z)+.2>g.y&&s.clock-g.at>=T.grenade.flightSec)landed=s.clock-g.at;
    if(said===null&&s.dialogueConsumed.some(t=>t.startsWith('dlg_m01_138#')))said=s.clock-g.at;
  }
  assert.ok(landed!==null&&landed<=T.grenade.flightSec+.8,`on the ground ${landed} s after the throw`);
  assert.ok(said!==null,'Kowal warned');assert.ok(said>=T.grenade.fuseSec-3-.06&&said<=T.grenade.fuseSec-.5+.06,`at fuse 3 to 0.5: ${said} s after the throw of a ${T.grenade.fuseSec} s fuse`);
  assert.ok(T.grenade.fuseSec-T.grenade.flightSec>=1.5,'at least 1.5 s on the ground');
  assert.equal(german(s).length,0,'and it went off');
});
