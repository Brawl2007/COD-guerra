// R2-b (2026-10-24, owner complaint «os polacos fazem pouco para contrariar o ataque; os inimigos mostram pouca inteligência; combate artificial»): the fight for the road deck, part 3: saves.
//   mid-fight saves of two real routes (the control pilot, the support pilot) taken when each new record first exists: the cycle of the section's real fire (timers.section.fire), a closing line of the assault
//   (deck.lim), the suppression the player causes (playerSuppressedUntil), and a hand-made save with a stick grenade in the air (grenades.active with by / at, timers.deckGrenadeAt, deck.gr, ai.seen).
//   They validate, restore without editing the save, continue identically to the original after double restores; the same saves with every R2-b key taken out (what an older build wrote) load, migrate
//   and continue; and every malformed new field is refused.
//   the whole route of each pilot: nobody west of safeX, nobody inside a solid or inside another man, the survivors, the east demolition after the deck is clear.
// State-level tests; no browser, no human. Parts 1 and 2: tests/m01-german-ai.test.js, tests/m01-german-ai-tactics.test.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation,validateM01Snapshot,seconds} from '../src/game/m01-simulation.js';
import {DECK_ASSAULT,DECK_SAFE_X} from '../src/game/m01-deck-assault.js';
import {route} from './helpers/m01-route.js';
import {compareContinuation,json} from './helpers/m01-determinism.js';
import {clippingAudit,stackingAudit} from './helpers/m01-clipping.js';
import {ENTRY,BLAST,load} from './helpers/m01-deck-scene.js';

const P=DECK_ASSAULT;
const spans=s=>s.actors.filter(a=>a.group==='grp_de_spans'),assault=s=>spans(s).filter(a=>P.assault.includes(a.id));
const strict=raw=>{validateM01Snapshot(json(raw));return load(raw);};

/** One whole route observed every tick: saves at the first tick each new record exists, the audits, the lowest x of a German, the end state. */
function record(seed,support,audit=true){
  // (the clipping and stacking audits cost ten times the route: the control route carries them, the support route's are in the 24-route audit of the evidence and in the golden audit's seeds 3 and 7)
  const snaps={},o={snaps,minX:Infinity,westViolations:[],clip:audit?clippingAudit():null,stack:audit?stackingAudit():null,blast:null,clearAt:null};let t0=null;
  const r=route(seed,{support,onStep:step=>{
    const {sim}=step;if(audit){o.clip.observe(step);o.stack.observe(step);}
    for(const a of sim.actors)if(a.team==='enemy'&&a.group==='grp_de_spans'&&a.deck&&a.x<DECK_SAFE_X-1e-9)o.westViolations.push({id:a.id,x:a.x,clock:sim.clock});
    if(!sim.consumedEvent(ENTRY)){if(!snaps.pre&&sim.battleClock>=seconds('06:04:50'))snaps.pre=sim.snapshot();return;}   // (10 battle seconds before the deck assault)
    if(sim.consumedEvent(BLAST)&&o.blast!==null)return;
    if(sim.consumedEvent(BLAST)){o.blast=sim.clock;snaps.blast=sim.snapshot();return;}
    t0??=sim.clock;const t=sim.clock-t0;
    for(const a of assault(sim))if(a.alive)o.minX=Math.min(o.minX,a.x);
    if(o.clearAt===null&&sim.deckClear())o.clearAt=sim.clock;
    if(!snaps.entry)snaps.entry=sim.snapshot();
    if(!snaps.t40&&t>=40)snaps.t40=sim.snapshot();
    if(!snaps.t120&&t>=120)snaps.t120=sim.snapshot();
    if(!snaps.fire&&sim.timers.section?.fire&&Object.keys(sim.timers.section.fire).length)snaps.fire=sim.snapshot();
    if(!snaps.lim&&assault(sim).some(a=>a.deck.lim!==undefined))snaps.lim=sim.snapshot();
    if(!snaps.player&&spans(sim).some(a=>a.playerSuppressedUntil>sim.clock))snaps.player=sim.snapshot();
  }});
  o.sim=r.sim;return o;
}
let control,support;
const ctl=()=>control??=record(19390901,false),sup=()=>support??=record(3,true,false);

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
test('mid-fight saves of the control route validate, restore without editing, and continue identically to the original after double restores: the cycle of the real fire, a closing line, the fight at 120 s',()=>{
  const o=ctl();
  assert.ok(o.snaps.fire,'the section\'s real fire started');assert.ok(o.snaps.lim,'a man of the assault went on to a closing line');
  for(const label of ['entry','t40','fire','lim','t120']){
    const raw=o.snaps[label],s=strict(raw);
    assert.ok(spans(s).every(a=>a.deck&&a.ai&&Number.isFinite(a.playerSuppressedUntil)),`${label}: every deck man carries his record, his stream and the player's suppression (0 until the player fires)`);
    compareContinuation(s,{label:`german-ai-${label}`,ticks:300,doubleAt:[1,150]});
  }
  const fire=o.snaps.fire.timers.section.fire;assert.ok(Object.keys(fire).length>=1&&Object.keys(fire).every(id=>['staszek_pawlak','east_platoon_voice','jozef_bak'].includes(id)),`the cycle of the riflemen: ${JSON.stringify(fire)}`);
  const lim=o.snaps.lim.actors.find(a=>a.deck?.lim!==undefined);assert.ok(lim&&P.lines[P.assault.indexOf(lim.id)].includes(lim.deck.lim),`${lim.id} has line ${lim.deck.lim} as his limit`);
  // the same save on two simulations: the same deck, man for man, 60 s later (the record and the stream are the whole state)
  const a=load(o.snaps.t40),b=load(o.snaps.t40);for(let i=0;i<1200;i++){a.tick(.05);b.tick(.05);}
  assert.deepEqual(spans(a).map(m=>[m.x,m.z,m.deck,m.ai,m.playerSuppressedUntil]),spans(b).map(m=>[m.x,m.z,m.deck,m.ai,m.playerSuppressedUntil]));
});

test('a save of the support route, with the suppression the player\'s rifle causes (playerSuppressedUntil), continues identically; the rule of the 20 s reads only that',()=>{
  const o=sup();assert.ok(o.snaps.player,'the support pilot suppressed a German');
  const raw=o.snaps.player,s=strict(raw),pinned=spans(s).filter(a=>a.playerSuppressedUntil>s.clock);
  assert.ok(pinned.length>=1&&pinned.every(a=>a.playerSuppressedUntil<=a.suppressedUntil+1e-9&&a.playerSuppressedUntil<=s.clock+5+1e-6),'the player\'s suppression is the 5 s of his own round, inside the man\'s own');
  compareContinuation(s,{label:'german-ai-player',ticks:300,doubleAt:[1,150]});
  assert.equal(o.sim.flags['m01.east_platoon_survivors'],18,'the support route keeps its 18');
});

test('an older save (no key of R2-b: no cycle of the fire, no closing line, no grenade, no sight record, no record of who suppressed whom) validates, migrates and continues; the suppression it holds was the player\'s',()=>{
  const strip=raw=>{
    const s=json(raw);delete s.timers.section?.fire;delete s.timers.deckGrenadeAt;
    for(const a of s.actors){
      if(a.group!=='grp_de_spans')continue;
      delete a.playerSuppressedUntil;if(a.deck){delete a.deck.lim;delete a.deck.gr;}if(a.ai)a.ai.seen=null;   // (an older build's deck men never wrote their sight record: it is null)
    }
    return s;
  };
  let used=0;
  for(const [name,raw] of [['entry',ctl().snaps.entry],['t40',ctl().snaps.t40],['support entry',sup().snaps.entry],['support player',sup().snaps.player]]){
    // an older build could not have a man past his own line 0: the saves taken from the lines are not of that kind
    const men=json(raw).actors.filter(a=>a.group==='grp_de_spans'&&a.deck&&P.assault.includes(a.id));
    if(men.some(a=>a.deck.lim!==undefined||a.deck.node>P.lines[P.assault.indexOf(a.id)][0]))continue;
    const old=strip(raw);validateM01Snapshot(json(old));const s=load(old);
    for(const a of spans(s).filter(a=>a.deck))assert.equal(a.playerSuppressedUntil,a.suppressedUntil>s.clock?a.suppressedUntil:0,`${name}: ${a.id}, all the suppression of an older save was the player's`);
    compareContinuation(s,{label:`older-${name}`,ticks:300,doubleAt:[1,150]});used++;
  }
  assert.ok(used>=2,`${used} older saves exercised (the entry of each pilot at least)`);
  // a save of before the deck assault has no deck record on anybody: nothing to migrate and nothing invented; the key comes with the record, at the first tick of the assault
  const pre=load(ctl().snaps.pre);assert.ok(spans(pre).every(a=>a.deck===undefined&&a.playerSuppressedUntil===undefined),'before the assault: no record, no key');
  for(let i=0;i<20*30&&!pre.consumedEvent(ENTRY);i++){pre.tick(.05);pre.drainEvents();}
  assert.ok(pre.consumedEvent(ENTRY)&&spans(pre).every(a=>a.deck&&a.playerSuppressedUntil===0),'at the assault every man gets the record and the key (0)');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// A stick grenade in the air, by hand: a legal thrower (de_spans_5 on the deck), a grenade 5 m from Pawlak that goes off in 1.2 s, the records the throw writes.
function inTheAir(){
  const raw=json(ctl().snaps.t120),clock=raw.clock;
  const man=raw.actors.find(a=>a.id==='de_spans_5');man.deck.gr=1;man.ai.seen={x:19.8,y:0,z:41.2,at:clock-2,who:'staszek_pawlak'};
  raw.timers.deckGrenadeAt=clock-1.4;raw.grenades.nextId=1;
  raw.grenades.active.push({id:'m01_grenade_0',x:24.8,y:.2,z:41.2,vx:0,vy:0,vz:0,fuse:1.2,by:'de_spans_5',at:clock-1.4});
  return raw;
}

test('a save with a stick grenade in the air validates and continues identically through the explosion: the blast, the pin of the Pole beside it, the telegraph, double restores',()=>{
  const raw=inTheAir();const s=strict(raw);
  const pawlak=s.actor('staszek_pawlak');pawlak.suppressedUntil=0;
  const out=compareContinuation(s,{label:'german-ai-grenade',ticks:120,doubleAt:[5,40]});
  assert.equal(out.firstDivergence,null);
  const t=load(inTheAir());t.actor('staszek_pawlak').suppressedUntil=0;let blast=null;
  for(let i=0;i<20*3&&!blast;i++){t.tick(.05);blast=t.drainEvents().find(e=>e.type==='m01-blast')??null;}
  assert.ok(blast,'it went off');assert.deepEqual([blast.kind,blast.by],['grenade','de_spans_5']);
  assert.ok(t.actor('staszek_pawlak').suppressedUntil>t.clock,'and pinned the Pole 5 m away');assert.equal(t.actor('staszek_pawlak').health,100);
  assert.equal(t.grenades.active.length,0);assert.doesNotThrow(()=>validateM01Snapshot(json(t.snapshot())));
});

test('every malformed field of R2-b is refused: the grenade (shape, thrower, time, fuse, id, number in the air), timers.deckGrenadeAt, the sight record, the suppression of the player, the cycle of the fire',()=>{
  const base=inTheAir();validateM01Snapshot(json(base));
  const bad=(name,f)=>{const s=json(base);f(s);assert.throws(()=>validateM01Snapshot(s),/inválido/,name);};
  const g=s=>s.grenades.active.find(x=>x.by),man=s=>s.actors.find(a=>a.id==='de_spans_5'),pawlak=s=>s.actors.find(a=>a.id==='staszek_pawlak');
  bad('extra key',s=>{g(s).extra=1;});bad('missing at',s=>{delete g(s).at;});
  for(const by of ['de_east_3','de_spans_12','de_spans_x','pl_east_1','player'])bad(`thrower ${by}`,s=>{g(s).by=by;});
  bad('thrown in the future',s=>{g(s).at=s.clock+1;});bad('fuse over the stick grenade\'s',s=>{g(s).fuse=P.tactics.grenade.fuseSec+.1;});bad('spent',s=>{g(s).fuse=0;});
  bad('id',s=>{g(s).id='grenade_0';});bad('NaN',s=>{g(s).vx=null;});
  bad('nine in the air',s=>{for(let i=1;i<9;i++)s.grenades.active.push({...g(s),id:`m01_grenade_${i}`});});
  bad('three of the player\'s',s=>{for(let i=1;i<=3;i++)s.grenades.active.push({id:`m01_grenade_${50+i}`,x:0,y:0,z:0,vx:0,vy:0,vz:0,fuse:2});});
  bad('before the deck assault',s=>{delete s.consumed[ENTRY];});
  bad('deckGrenadeAt in the future',s=>{s.timers.deckGrenadeAt=s.clock+1;});bad('deckGrenadeAt text',s=>{s.timers.deckGrenadeAt='7';});bad('deckGrenadeAt negative',s=>{s.timers.deckGrenadeAt=-1;});
  bad('seen.who',s=>{man(s).ai.seen.who='jan_wrona';});bad('seen.who number',s=>{man(s).ai.seen.who=7;});bad('seen extra key',s=>{man(s).ai.seen.extra=1;});bad('seen.at text',s=>{man(s).ai.seen.at='x';});
  bad('suppression of the player on an ally',s=>{pawlak(s).playerSuppressedUntil=s.clock;});
  bad('suppression of the player on a German of the east',s=>{s.actors.find(a=>a.id==='de_east_7').playerSuppressedUntil=0;});
  bad('suppression of the player too long',s=>{man(s).playerSuppressedUntil=s.clock+6;});bad('suppression of the player negative',s=>{man(s).playerSuppressedUntil=-1;});bad('suppression of the player NaN',s=>{man(s).playerSuppressedUntil=null;});
  // the cycle of the real fire (a save with one first)
  const withFire=json(ctl().snaps.fire);validateM01Snapshot(json(withFire));
  const badFire=(name,f)=>{const s=json(withFire);f(s);assert.throws(()=>validateM01Snapshot(s),/inválido/,name);};
  badFire('not a record',s=>{s.timers.section.fire=[];});badFire('Kowal has no cycle',s=>{s.timers.section.fire.szymon_kowal=s.clock+3;});badFire('a stranger',s=>{s.timers.section.fire.jan_wrona=s.clock+3;});
  badFire('text',s=>{s.timers.section.fire.staszek_pawlak='x';});badFire('too far',s=>{s.timers.section.fire.staszek_pawlak=s.clock+1e4;});badFire('negative',s=>{s.timers.section.fire.staszek_pawlak=-1;});
  badFire('before the deck assault',s=>{delete s.consumed[ENTRY];});
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
test('the whole route of each pilot with the fight of R2-b: nobody of the deck west of safeX, nobody inside a solid or another man, the survivors (12 control, 18 support), the east demolition after the deck is clear',()=>{
  for(const [label,o,survivors] of [['control',ctl(),12],['support',sup(),18]]){
    assert.deepEqual(o.westViolations,[],`${label}: nobody west of safeX`);assert.ok(o.minX>=DECK_SAFE_X-1e-9,`${label}: the lowest x of the assault ${o.minX}`);
    if(o.clip){assert.equal(o.clip.events.length,0,`${label}: no clipping`);assert.equal(o.stack.summary().pairs,0,`${label}: nobody inside another man`);}
    assert.equal(o.sim.flags['m01.east_platoon_survivors'],survivors,`${label}: the survivors`);
    assert.ok(o.clearAt!==null&&o.blast>=o.clearAt,`${label}: the east demolition comes only after the deck is clear`);
    assert.equal(o.sim.mission.complete,true,`${label}: the route completes`);
    assert.ok(assault(load(o.snaps.blast)).filter(a=>a.alive).every(a=>a.x>=P.clearX),`${label}: nobody of the assault is left west of the falling spans`);
  }
});
