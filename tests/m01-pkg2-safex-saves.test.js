import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {M01Simulation,validateM01Snapshot,seconds} from '../src/game/m01-simulation.js';
import {DECK_ASSAULT,DECK_SAFE_X,DECK_SAFE_X_MIN,deckAssaultPlan,validDeckRecord,normalizeDeckRecord,nearestDeckLine} from '../src/game/m01-deck-assault.js';
import definition from '../missions/m01-tczew/mission.json' with {type:'json'};
import {driver,corridorControls} from './helpers/m01-route.js';

// Package 2, critical review (2026-11-04): a save made under ANOTHER safeX. The deck records hold node indices of each man's path (deck.lim, deck.node) and safeX shapes the path: 250 -> 190 renumbered the
// closing lines of every man (de_spans_5: [22, 26, 31] -> [22, 28, 33]), so the checkpoint cp_m01_d_retirada and the continuation save of the finished act, written by 57ba50f3, were refused with
// «Checkpoint M01 inválido: assalto do tabuleiro de_spans_5» and the player lost the save. The fix: the validator of a load accepts a `lim` / `node` that is a node of the man's path under some safeX
// (validDeckRecord, olderPlan), and restoreSnapshot puts them on the live lines (normalizeDeckRecord: the nearest line by node index, a tie to the deeper). The fixtures are real saves of 57ba50f3 (safeX 250,
// tests/fixtures/m01-pkg2-old-saves.json) and of the live build (safeX 190, tests/fixtures/m01-safex190-saves.json). State and rules, not a playtest.
const OLD=JSON.parse(readFileSync(new URL('./fixtures/m01-pkg2-old-saves.json',import.meta.url)));
const LIVE=JSON.parse(readFileSync(new URL('./fixtures/m01-safex190-saves.json',import.meta.url)));
const DT=.05,E=n=>'evt_m01_'+n;
const save=label=>structuredClone(OLD.saves.find(s=>s.label===label).snapshot);
const withSafeX=x=>{const d=structuredClone(definition);d.groups.find(g=>g.id==='grp_de_spans').deckAssault.safeX=x;return deckAssaultPlan(d);};
const OLD_PLAN=withSafeX(250);
const OLD_LINES=[[23,27,32],[22,26,31],[23,28,32],[20,25,29],[21,26,30],[19,23,27]];   // the closing lines of safeX 250 (57ba50f3), man by man: de_spans_4..9
const AFTER_250=['cp_m01_d_retirada','cp_m01_d_retirada seed 7','act 1 finished','06:09:30 deck assault on the closing lines'];
const deckMen=snap=>snap.actors.filter(a=>a.group==='grp_de_spans'&&a.deck);
const lineSet=(plan,id)=>plan.lines[plan.assault.indexOf(id)];
const fixturePath=name=>fileURLToPath(new URL('./fixtures/'+name,import.meta.url));

test('the older fixtures are what they say: the deck records of the saves of 57ba50f3 hold the lines of safeX 250, which are not the lines of today',()=>{
  assert.equal(OLD.source,'57ba50f3305d18a0ddcad0d2c3563f14e293d7a7');assert.equal(LIVE.safeX,190);assert.equal(DECK_SAFE_X,190);
  assert.deepEqual(OLD_PLAN.lines.map(l=>[...l]),OLD_LINES,'the closing lines of safeX 250');
  assert.notDeepEqual(DECK_ASSAULT.lines.map(l=>[...l]),OLD_LINES,'and today\'s are others (the cause of the refusal)');
  const phases=new Set(),deadPhases=new Set();
  for(const label of AFTER_250){
    const snap=save(label);
    for(const part of [snap,snap.resumeCheckpoint].filter(Boolean)){
      const men=deckMen(part).filter(a=>a.deck.lim!==undefined);
      assert.ok(men.length>=5,`${label}: ${men.length} men carry a deck.lim`);
      for(const a of men){
        assert.ok(lineSet(OLD_PLAN,a.id).includes(a.deck.lim),`${label}: ${a.id} lim ${a.deck.lim} is a line of safeX 250`);
        phases.add(a.deck.phase);if(!a.alive)deadPhases.add(a.deck.phase);
      }
      assert.ok(men.some(a=>!lineSet(DECK_ASSAULT,a.id).includes(a.deck.lim)),`${label}: some lim is no line of the live data (what the first version refused)`);
    }
  }
  for(const p of ['advance','cover','clear','fallback'])assert.ok(phases.has(p),`a man in phase ${p} carries a lim in one of the saves`);
  assert.ok(deadPhases.has('fallback')&&deadPhases.has('cover'),'and so do dead men in phase fallback and cover');
});

test('each older save validates, loads, and its deck records land on the live lines: the same line of the man (old line 1 -> live line 1, the old deepest -> the live deepest), the rest of the record untouched',()=>{
  for(const label of AFTER_250){
    const raw=save(label);validateM01Snapshot(structuredClone(raw));   // (it threw «assalto do tabuleiro de_spans_5» before the fix, for the first three)
    const s=new M01Simulation(1);s.restoreSnapshot(structuredClone(raw));
    const after=s.snapshot();
    const written=Object.fromEntries(deckMen(raw).map(a=>[a.id,a.deck]));
    for(const a of deckMen(after)){
      const was=written[a.id],k=DECK_ASSAULT.assault.indexOf(a.id);
      assert.ok(validDeckRecord(a,after.clock),`${label}: ${a.id} is a record the live data could have written`);
      if(k<0){assert.deepEqual(a.deck,was);continue;}
      const live=DECK_ASSAULT.lines[k],old=OLD_PLAN.lines[k];
      if(was.lim===undefined)assert.equal(a.deck.lim,undefined,`${label}: ${a.id} had no lim`);
      else assert.equal(a.deck.lim??live[0],live[old.indexOf(was.lim)],`${label}: ${a.id} lim ${was.lim} (line ${old.indexOf(was.lim)} of safeX 250) -> line ${old.indexOf(was.lim)} of the live data`);
      assert.deepEqual({...a.deck,lim:0},{...was,lim:0},`${label}: ${a.id} keeps node, phase and times`);
    }
    validateM01Snapshot(structuredClone(after));
    if(raw.resumeCheckpoint){
      for(const a of deckMen(s.checkpoint))assert.ok(validDeckRecord(a,s.checkpoint.clock),`${label}: the respawn checkpoint of the save is on the live lines too (${a.id})`);
      assert.equal(s.restoreCheckpoint(),true);validateM01Snapshot(s.snapshot());   // and the game goes back to it
    }
  }
});

test('two restores of an older save go on identically: the snapping is deterministic (the 06:09:30 save, the men on the closing lines, 30 s of game)',()=>{
  const label='06:09:30 deck assault on the closing lines',a=new M01Simulation(2),b=new M01Simulation(3);
  a.restoreSnapshot(save(label));b.restoreSnapshot(save(label));
  const before=Object.fromEntries(deckMen(a.snapshot()).map(m=>[m.id,m.deck.phase+':'+m.deck.node]));
  for(let i=0;i<600;i++){a.tick(DT,{});b.tick(DT,{});}
  assert.deepEqual(a.snapshot(),b.snapshot());
  assert.ok(deckMen(a.snapshot()).some(m=>m.deck.phase+':'+m.deck.node!==before[m.id]),'and the men did go on from the live lines');
  validateM01Snapshot(structuredClone(a.snapshot()));
});

/** The route's own tail from a restored save: wait for the east demolition if it has not fallen, walk back to the west bank, the west demolition, the shelter, the roll call, 07:05:00. Snapshots validate on the way. */
function playOn(snapshot,seed=19390901){
  class Restored extends M01Simulation{constructor(x){super(x);this.restoreSnapshot(structuredClone(snapshot));this.drainEvents();}}
  let n=0;
  const d=driver(seed,{Simulation:Restored,onStep:({sim})=>{if(++n%500===0)validateM01Snapshot(sim.snapshot());}});
  const {sim,step,until,walk}=d;
  until(()=>sim.consumedEvent(E('east_demolition')),500);
  walk(-15,40);walk(-115,27);walk(-275,27);walk(-292,26);
  until(()=>sim.consumedEvent(E('west_demolition')),500,()=>corridorControls(sim));
  if(sim.corridorTask)walk(-292,26);
  walk(-263,58);walk(-263,70);
  until(()=>sim.scene?.id==='cs_m01_roll_call',30);step({skip:true});
  until(()=>sim.mission.complete,10);
  return sim;
}

test('the checkpoints and the 06:09:30 save of 57ba50f3 load and play on to 07:05:00 with valid saves, nobody on his feet west of the live safeX, the survivors of the golden',()=>{
  for(const label of ['cp_m01_d_retirada','cp_m01_d_retirada seed 7','06:09:30 deck assault on the closing lines']){
    const sim=playOn(save(label),label.includes('seed 7')?7:OLD.seed);
    assert.equal(sim.battleClock,seconds('07:05:00'),`${label}: the act ends at 07:05:00`);assert.equal(sim.mission.complete,true);
    validateM01Snapshot(structuredClone(sim.snapshot()));
    assert.ok(sim.actors.every(a=>!(a.team==='enemy'&&a.group==='grp_de_spans'&&a.deck!==undefined&&a.alive&&a.x<DECK_SAFE_X)),`${label}: nobody on his feet west of safeX`);
    assert.equal(sim.flags['m01.east_platoon_survivors'],12,`${label}: the control route's survivors (12, as the golden)`);
  }
});

test('the act\'s final checkpoint (07:05:00, the one the game keeps at the end of the act) and the continuation save that carries it load and go on; the player who reloads returns to it, on the live lines',()=>{
  const raw=save('act 1 finished');assert.equal(raw.mission.complete,true);assert.equal(raw.battleClock,seconds('07:05:00'));
  const final=raw.resumeCheckpoint;assert.ok(final,'a continuation save carries the respawn checkpoint');
  assert.equal(final.mission.complete,true,'which, at the end of the act, is the final checkpoint: 07:05:00');assert.equal(final.battleClock,seconds('07:05:00'));assert.equal(Object.hasOwn(final,'resumeCheckpoint'),false);
  // the final checkpoint on its own (what the game stores for the act: sim.checkpoint, a flat schema-2 save)
  validateM01Snapshot(structuredClone(final));
  const f=new M01Simulation(1);f.restoreSnapshot(structuredClone(final));
  for(let i=0;i<20/DT;i++)f.tick(DT,{});
  assert.equal(f.mission.complete,true);validateM01Snapshot(structuredClone(f.snapshot()));
  for(const a of deckMen(f.snapshot()))assert.ok(validDeckRecord(a,f.clock),`${a.id} on the live lines`);
  // the continuation save, then a reload of its respawn checkpoint
  validateM01Snapshot(structuredClone(raw));
  const s=new M01Simulation(1);s.restoreSnapshot(structuredClone(raw));
  for(let i=0;i<20/DT;i++)s.tick(DT,{});
  assert.equal(s.mission.complete,true);validateM01Snapshot(structuredClone(s.snapshot()));
  assert.equal(s.restoreCheckpoint(),true);
  assert.equal(s.battleClock,seconds('07:05:00'));for(const a of deckMen(s.snapshot()))assert.ok(validDeckRecord(a,s.clock),`${a.id} on the live lines after the reload`);
  // both ways of coming back are one game: the final checkpoint restored directly and through the continuation save go on identically
  const g=new M01Simulation(2);g.restoreSnapshot(structuredClone(final));for(let i=0;i<200;i++){g.tick(DT,{});s.tick(DT,{});}
  assert.deepEqual(g.snapshot(false),s.snapshot(false));
});

test('nearestDeckLine and normalizeDeckRecord: the nearest line by node index, a tie to the deeper, line 0 as no key, the node clamped; a record that is already valid is left exactly as it is; twice is once',()=>{
  assert.equal(nearestDeckLine(27,[23,29,32]),29);assert.equal(nearestDeckLine(25,[23,29,32]),23,'closer to line 0');
  assert.equal(nearestDeckLine(26,[23,29,32]),29,'a tie (3 and 3) goes to the deeper line');assert.equal(nearestDeckLine(29,[20,26,32]),32,'the old deepest line of de_spans_7 is a tie: the live deepest');
  assert.equal(nearestDeckLine(5,[23,29,32]),23);assert.equal(nearestDeckLine(99,[23,29,32]),32);assert.equal(nearestDeckLine(7,[23]),23,'one line: that one');
  const P=DECK_ASSAULT,k=0,[l0,l1,l2]=P.lines[k],id=P.assault[k];
  const man=deck=>({id,group:'grp_de_spans',deck:{v:1,phase:'cover',node:20,until:0,since:0,t0:0,pinned:0,...deck}});
  for(const [name,deck,want] of [
    ['a live line stays',{lim:l1},{lim:l1}],['the deepest line stays',{lim:l2},{lim:l2}],['no lim stays none',{},{}],['line 0 as written stays (it is valid: left as it is)',{lim:l0},{lim:l0}],
    ['off a line, nearer line 1',{lim:l1+1},{lim:l1}],['off a line, nearer line 0: no key (the form deckLine() leaves)',{lim:l0+1},{}],['off a line, nearer line 1 from below',{lim:l1-1},{lim:l1}],
    ['the longest path any safeX gives',{lim:P.maxNodes[k]},{lim:l2}],['a lim far below line 0 is line 0',{lim:l0-9},{}],
  ]){
    const a=man(deck),before=structuredClone(a.deck);
    const changed=normalizeDeckRecord(a,P);
    const expected={...before};delete expected.lim;if(want.lim!==undefined)expected.lim=want.lim;expected.node=Math.min(before.node,P.paths[k].length-1);
    assert.deepEqual(a.deck,expected,name);assert.equal(changed,!isDeepStrictEqual(a.deck,before),`${name}: changed`);
    assert.equal(normalizeDeckRecord(a,P),false,`${name}: twice is once`);
  }
  {const a=man({node:99,lim:l1});normalizeDeckRecord(a,P);assert.equal(a.deck.node,P.paths[k].length-1,'a node past the deepest line');}
  assert.equal(normalizeDeckRecord({id:P.overwatch[0],deck:{v:1,phase:'clear',node:0,until:0,since:0,t0:0,pinned:0}},P),false,'the overwatch has no line');
  assert.equal(normalizeDeckRecord({id:'pl_east_0'},P),false,'and a man without a record nothing');
});

test('safeX varied in memory: the records of every older save (safeX 250 and 190) are accepted by the validator of a load and land on a record the plan of ANY safeX could have written; the same plan changes nothing',()=>{
  const values=[];for(let x=DECK_SAFE_X_MIN;x<=426;x+=6)values.push(x);values.push(190,250,426,427,450);   // (450: the highest safeX the limits allow is 458; from 427 on there is no closing line)
  const records=[];
  for(const label of AFTER_250)for(const part of [save(label),save(label).resumeCheckpoint].filter(Boolean))for(const a of deckMen(part))records.push({label,clock:part.clock,a});
  for(const a of deckMen(LIVE.saves[0].snapshot))records.push({label:'safeX 190 CP-D',clock:LIVE.saves[0].snapshot.clock,a});
  assert.ok(records.length>=50);
  let moved=0;
  for(const x of values){
    const alt=withSafeX(x);
    for(const {label,clock,a} of records){
      const r=structuredClone(a),k=alt.assault.indexOf(r.id),was=structuredClone(r.deck);
      assert.ok(validDeckRecord(r,clock,{olderPlan:true,plan:alt}),`safeX ${x}: ${label} ${r.id} is a record of some safeX`);
      if(normalizeDeckRecord(r,alt))moved++;
      assert.ok(validDeckRecord(r,clock,{plan:alt}),`safeX ${x}: ${label} ${r.id} lands on a record of this plan`);
      assert.equal(normalizeDeckRecord(r,alt),false,'twice is once');
      if(k<0)continue;   // (the overwatch: no line)
      const lines=alt.lines[k];
      if(was.lim!==undefined){const best=Math.min(...lines.map(l=>Math.abs(l-was.lim)));assert.equal(Math.abs((r.deck.lim??lines[0])-was.lim),best,`safeX ${x}: ${r.id} lim ${was.lim} -> the nearest of ${lines}`);}
      assert.equal(r.deck.node,Math.min(was.node,alt.paths[k].length-1),`safeX ${x}: ${r.id} node`);
      if(x===250&&label!=='safeX 190 CP-D')assert.deepEqual(r.deck,was,'the plan that wrote the save: nothing moves');
      if(x===190&&label==='safeX 190 CP-D')assert.deepEqual(r.deck,was,'the live plan and its own save: nothing moves');
    }
  }
  assert.ok(moved>50,`the sweep moved records (${moved})`);
  // what no safeX could have written is refused in every plan
  const alt=withSafeX(150),r=deckMen(save('cp_m01_d_retirada')).find(a=>a.id==='de_spans_5'),clock=save('cp_m01_d_retirada').clock;
  assert.ok(validDeckRecord(r,clock,{olderPlan:true,plan:alt}));
  for(const bad of [{lim:alt.maxNodes[1]+1},{lim:alt.lines[1][0]-1},{lim:1.5},{lim:'28'},{lim:null},{node:alt.maxNodes[1]+1},{node:-1},{node:2.5},{extra:1}])
    assert.ok(!validDeckRecord({id:r.id,deck:{...r.deck,...bad}},clock,{olderPlan:true,plan:alt}),JSON.stringify(bad));
});

test('safeX varied in memory, the whole game: a CP-D of 57ba50f3 (250) and of the live build (190) loads and plays on under other values of safeX (the mission data served with another safeX to a child process)',()=>{
  const CHILD=fixturePath('../helpers/m01-safex-child.mjs');
  const run=(safeX,fixture,label,secs=15)=>JSON.parse(execFileSync(process.execPath,[CHILD,String(safeX),fixturePath(fixture),label,String(secs)],{encoding:'utf8',timeout:240000,maxBuffer:1<<26}).trim().split('\n').at(-1));
  const lim=r=>Object.fromEntries(r.map(a=>[a.id,a.lim]));
  // 57ba50f3's CP-D (safeX 250) under lower values and under its writer's own
  for(const x of [120,130,150,250]){
    const o=run(x,'m01-pkg2-old-saves.json','cp_m01_d_retirada');
    assert.equal(o.safeX,x,'the child runs the game under the safeX asked');assert.equal(o.strictAtLoad,true,`safeX ${x}: strict at load`);assert.equal(o.strictAfter,true,`safeX ${x}: strict after 15 s`);
    o.restored.forEach((r,i)=>{if(i<4)return;if(r.lim!==null)assert.ok(o.lines[i-4].includes(r.lim),`safeX ${x}: ${r.id} lim ${r.lim} is a line of ${o.lines[i-4]}`);assert.ok(r.node<=o.last[i-4],`safeX ${x}: ${r.id} node ${r.node}`);});
    if(x===250)assert.deepEqual(lim(o.restored),lim(o.written),'the writer\'s own plan: no lim moves');
    else assert.notDeepEqual(lim(o.restored),lim(o.written),`safeX ${x}: the lines are others, some lim moved`);
  }
  // the live build's CP-D (190) under its own value and under higher and lower ones: the lines move the other way, the node is clamped; the body of de_spans_4 (x 377) lies west of a safeX of 427 or 450
  for(const x of [120,190,230,300,426,427,450]){
    const o=run(x,'m01-safex190-saves.json','cp_m01_d_retirada');
    assert.equal(o.safeX,x);assert.equal(o.strictAtLoad,true,`safeX ${x}: strict at load`);assert.equal(o.strictAfter,true,`safeX ${x}: strict after 15 s`);
    if(x===190)assert.deepEqual(lim(o.restored),lim(o.written),'the live plan and its own save: no lim moves');
    if(x>=427)assert.ok(o.lines.every(l=>l.length===1)&&o.restored.every(r=>r.lim===null),`safeX ${x}: no closing line at all, so no lim`);
    o.restored.forEach((r,i)=>{if(i>=4)assert.ok(r.node<=o.last[i-4],`safeX ${x}: ${r.id} node ${r.node} on the path (${o.last[i-4]})`);});
  }
  // a mid-fight save of 57ba50f3 (the men on the closing lines, x 366-578) under its own safeX and a lower one
  {const o=run(250,'m01-pkg2-old-saves.json','06:09:30 deck assault on the closing lines',10);assert.deepEqual(o.restored,o.written,'the writer\'s own plan: the record of every man is as written');
   const q=run(150,'m01-pkg2-old-saves.json','06:09:30 deck assault on the closing lines',10);assert.equal(q.strictAtLoad,true);assert.equal(q.strictAfter,true);}
});

test('the cast rule: a fallen man of the deck lies where he fell, so a raised safeX does not refuse his body; a man on his feet west of safeX, or a body below the lowest legal safeX, is still refused',()=>{
  const base=LIVE.saves[0].snapshot,body='de_spans_4',alive='de_spans_5';
  const at=(id,x)=>{const s=structuredClone(base);s.actors.find(a=>a.id===id).x=x;return s;};
  assert.equal(base.actors.find(a=>a.id===body).alive,false);assert.equal(base.actors.find(a=>a.id===alive).alive,true);
  assert.doesNotThrow(()=>validateM01Snapshot(at(body,DECK_SAFE_X-20)),'a body west of the live safeX (a lower safeX played the fight)');
  assert.doesNotThrow(()=>validateM01Snapshot(at(body,DECK_SAFE_X_MIN)));
  assert.throws(()=>validateM01Snapshot(at(body,DECK_SAFE_X_MIN-1)),/elenco/,'below the lowest safeX the data may hold');
  assert.throws(()=>validateM01Snapshot(at(alive,DECK_SAFE_X-1)),/elenco/,'a man on his feet west of safeX');
  const s=new M01Simulation(1);s.restoreSnapshot(at(body,DECK_SAFE_X-20));assert.equal(s.actor(body).x,DECK_SAFE_X-20,'and the body stays where it lies');
});
