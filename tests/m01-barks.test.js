// Reactive dialogue (src/game/m01-barks.js, docs/direction/M01_REACTIVE_DIALOGUE.md): data, the line queue with its priorities and its voice limit, the director's rules
// (cooldowns on the real clock, repeats, rotation, substitution), save/restore in the middle of a cooldown, and the rate of lines on the two golden routes.
// State tests and Node routes: they prove the machine, not how it sounds or feels in a game.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import definition from '../missions/m01-tczew/mission.json' with {type:'json'};
import mapLayout from '../missions/m01-tczew/map-layout.json' with {type:'json'};
import {M01Simulation,validateM01Snapshot,seconds,CKM_BELT,CKM_BURST_ROUNDS} from '../src/game/m01-simulation.js';
import {BARK_RULES,BARK_RULE_LIST,BARK_CONFIG,BARK_GROUPS,compileBarks,newBarkState,barkEvent,barkPoll,barkTrigger,barkChannelOpen,validateBarkState,TRIGGERS,
  CKM_BELT_FULL,CKM_BURST_ROUNDS_FULL} from '../src/game/m01-barks.js';
import {route} from './helpers/m01-route.js';
import {compareContinuation,json} from './helpers/m01-determinism.js';

const DT=.05;
const D=n=>`dlg_m01_${String(n).padStart(3,'0')}`;
/** A simulation just after the intro: no scene, the channel open, a real clock far enough from 0 for cooldowns to mean something. */
function fresh(seed=11){const s=new M01Simulation(seed);s.tick(DT,{skip:true});s.drainEvents();s.clock=300;return s;}
const reactive=s=>s.dialogueConsumed.filter(t=>/#\d+$/.test(t));
const delta=(s,fn)=>{const n=s.dialogueConsumed.length;fn();return s.dialogueConsumed.slice(n);};
// 2026-10-19 (review N1): a reactive line is counted (max, cooldown, «tocou há N s», the 60 s budget) when it goes on SCREEN, not when it is queued. The fixtures that cleared
// the queue to stand for «it was said» now put the line on screen first (advanceSubtitle), which is what saying it is.
const heard=s=>s.advanceSubtitle();
const sawPlayer=(s,a)=>{a.ai.seen={x:s.player.x,y:s.player.y,z:s.player.z,at:s.clock,who:'player'};};
const near=(s,id,dx=3,dz=0)=>{const a=s.actor(id);Object.assign(s.player,{x:a.x+dx,z:a.z+dz,y:a.y});};
const impact=(s,o={})=>s.emit({type:'round-impact',kind:'player',by:'de_east_2',point:{x:s.player.x+5,y:0,z:s.player.z},material:'earth',crack:false,distance:5,pass:'none',victim:null,pinned:[],...o});
const crack=(s,o={})=>impact(s,{crack:true,pass:'crack',distance:3,...o});
const ledger=s=>s.timers.barks;
const withLedger=(s,patch)=>{s.timers.barks={...newBarkState(),...patch};return s;};
const withdrawal=s=>{s.activate('cover_withdrawal');return s;};
const unspoken=(s,ids)=>{ // the director must not fall back on these lines: make them look used up
  const n={};for(const id of ids)n[id]=BARK_RULES.get(id).max||1;return n;};

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// Data
const LINES=new Map([...definition.dialogue,...definition.callouts.lines].filter(l=>l.id).map(l=>[l.id,l]));

test('the 55 reviewed lines are in the mission data and every one is wired (114 and 115 since 2026-10-22: the ckm now stops, and says so through its events)',()=>{
  for(let n=100;n<=154;n++){
    const line=LINES.get(D(n));assert.ok(line,`${D(n)} in mission.json`);
    assert.ok(line.text&&line.note&&line.context,D(n));
    assert.ok(line.bark,`${D(n)} has a rule`);assert.ok(BARK_RULES.has(D(n)),D(n));
    assert.doesNotMatch(`${line.context} ${line.note}`,/NEEDS_EVENT/,`${D(n)}: the event it needed exists`);
  }
  // 2026-10-22 (owner decision, golden amendment 15): this test used to forbid the words stoppage / jam in the simulation (the ckm had no model of either, so 114 and 115 stayed unwired
  // with NEEDS_EVENT). The ckm now stops (CKM_STOPPAGES, tests/m01-ckm-stoppage.test.js) and emits the two events the lines wait on; the rules are on those events.
  const sim=readFileSync(new URL('../src/game/m01-simulation.js',import.meta.url),'utf8');
  assert.match(sim,/type:'ckm_stoppage',by:g\.id/);assert.match(sim,/type:'ckm_stoppage_cleared',by:'ckm_loader'/);
  assert.equal(BARK_RULES.get(D(114)).on,'ckm_stoppage');assert.equal(BARK_RULES.get(D(115)).on,'ckm_stoppage_cleared');
  assert.ok(TRIGGERS.includes('ckm_stoppage')&&TRIGGERS.includes('ckm_stoppage_cleared'));
  assert.equal(LINES.get(D(114)).speaker,'ckm_gunner');assert.equal(LINES.get(D(115)).speaker,'ckm_loader');
  assert.equal(LINES.get(D(118)).speaker,'ckm_reserve');assert.equal(LINES.get(D(119)).speaker,'ckm_gunner');
  assert.notEqual(definition.cast.find(c=>c.id==='ckm_reserve').name,definition.cast.find(c=>c.id==='ckm_gunner').name,'118 and 119 are two different speakers on the subtitle');
});

test('the canonical lines nothing said now have a trigger: 030, 035 and 036 a rule, 042, 047 and 067 their event',()=>{
  for(const n of [30,35,36])assert.ok(BARK_RULES.has(D(n)),String(n));
  const sim=readFileSync(new URL('../src/game/m01-simulation.js',import.meta.url),'utf8');
  assert.match(sim,/line\(12\);line\(13\);line\(67\);line\(66\)/,'067 between 013 and 066');
  assert.match(sim,/line\(41\);if\(this\.actor\('leon_dudek'\)\.alive&&this\.actor\('leon_dudek'\)\.active\)line\(42\);line\(43\)/);
  // 2026-10-22 (SP-08, owner order): 047 and 048 moved with the corridor count into src/game/m01-corridor.js (stepCorridor), said when the count starts; 049 when it is complete.
  const corridor=readFileSync(new URL('../src/game/m01-corridor.js',import.meta.url),'utf8');
  assert.match(corridor,/sim\.line\('dlg_m01_047'\);sim\.line\('dlg_m01_048'\)/);assert.match(corridor,/sim\.line\('dlg_m01_049'\)/);
});

test('the three ckm crew voices are cast for the subtitle only: no extra body, no duplicate id, 103 actors (97 + the west garrison)',()=>{
  const voices=definition.cast.filter(c=>c.voiceOnly);
  assert.deepEqual(voices.map(c=>c.id),['ckm_gunner','ckm_loader','ckm_reserve']);
  assert.ok(voices.every(c=>c.fictional&&c.faction==='PL'&&c.loadout.every(i=>definition.allowedEquipment.includes(i))));
  const s=new M01Simulation(),ids=s.actors.map(a=>a.id);
  // 2026-10-23 (R1-a, golden amendment 16): 97 -> 103, the six unnamed men of the west garrison (pl_west_0..5, displayOnly); the voices still have no body of their own.
  assert.equal(ids.length,103);assert.equal(new Set(ids).size,103);
  assert.equal(s.actors.filter(a=>a.id.startsWith('ckm_')).length,3);
  validateM01Snapshot(s.snapshot());
});

test('the ckm numbers the director reads are the simulation\'s own',()=>{assert.equal(CKM_BELT_FULL,CKM_BELT);assert.equal(CKM_BURST_ROUNDS_FULL,CKM_BURST_ROUNDS);});

test('the rules are checked when the data is loaded: a typo stops the game instead of silencing a line',()=>{
  const bad=mutate=>{const d=structuredClone(definition);mutate(d);return d;};
  const line=(d,id)=>[...d.dialogue,...d.callouts.lines].find(l=>l.id===id);
  const cases=[
    [d=>{line(d,D(100)).bark.on='sometimes';},/unknown trigger/],
    [d=>{line(d,D(100)).bark.when.victime=true;},/unknown condition victime/],
    [d=>{line(d,D(100)).bark.when.victim=undefined;line(d,D(100)).bark.when.hit=true;},/needs the trigger/],
    [d=>{line(d,D(103)).bark.when.victim=true;},/needs the trigger/],
    [d=>{line(d,D(100)).bark.replaces=['co_m01_nowhere'];},/unknown line/],
    [d=>{line(d,D(104)).bark.after[0].event='evt_m01_nowhere';},/unknown event/],
    [d=>{line(d,D(144)).bark.when.active=['obj_m01_nowhere'];},/unknown objective/],
    [d=>{line(d,D(100)).priority=4;},/priority/],
    [d=>{line(d,D(100)).bark.max=-1;},/cooldown\/max/],
    [d=>{line(d,D(100)).bark.cooldown=-3;},/cooldown\/max/],
    [d=>{line(d,D(101)).bark.group='lonely';},/has one member/],
    [d=>{line(d,D(100)).speaker='nobody';},/unknown speaker/],
    [d=>{line(d,D(128)).bark.when.fireFrom='the_moon';},/zone/],
    [d=>{line(d,D(100)).bark.when.near={of:'event',m:0};},/near needs/],
    [d=>{line(d,D(103)).bark.when.near={of:'event',m:5};},/needs an event trigger/],
    [d=>{line(d,D(145)).bark.when.inArea='nowhere';},/unknown area/],
    [d=>{delete d.barks;},/needs a `barks` block/],
    [d=>{d.barks.budget60['1']=9;},/budget60 above/],
    [d=>{line(d,D(100)).bark.bogus=1;},/unknown bark key/],
    [d=>{line(d,D(147)).bark.when.farFrom.point='nowhere_point';},/unknown map point/],
  ];
  for(const [mutateFn,pattern] of cases)assert.throws(()=>compileBarks(bad(mutateFn)),pattern);
  assert.doesNotThrow(()=>compileBarks(structuredClone(definition)));
});

test('every rule belongs to a known trigger, has a priority, a speaker in the cast, and all its references resolve',()=>{
  assert.ok(BARK_RULE_LIST.length>=60);
  for(const r of BARK_RULE_LIST){assert.ok(TRIGGERS.includes(r.on),r.id);assert.ok([1,2,3].includes(r.priority),r.id);assert.ok(LINES.has(r.id),r.id);}
  for(const [name,g] of BARK_GROUPS)assert.ok(g.members.length>=2,name);
  assert.equal(BARK_CONFIG.voices,2);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The line queue: priority and the voice limit
test('scripted lines keep the old FIFO; they go ahead of any waiting reactive line, and are never dropped',()=>{
  const s=fresh();
  assert.equal(s.line(D('153'),'a'),true);   // reactive, priority 3: queued
  assert.equal(s.line(D('018'),'b'),true);assert.equal(s.line(D('019'),'c'),true);assert.equal(s.line(D('020'),'d'),true);   // the rally point: three scripted lines
  assert.deepEqual(s.dialogueQueue.map(l=>l.id),[D('018'),D('019'),D('020'),D('153')],'scripted first, in the order they came');
  assert.equal(s.line(D('018'),'b'),false,'the token is spent');
  assert.equal(s.line('dlg_m01_nowhere'),false);
  // five scripted lines at once are all kept (no voice limit for the script)
  const t=fresh();for(const n of ['012','013','067','066','014'])assert.equal(t.line(D(n)),true);
  assert.equal(t.dialogueQueue.length,5);assert.ok(t.dialogueQueue.every(l=>l.bark===undefined&&l.priority===undefined&&l.expires===undefined),'a scripted record is what it always was');
});

test('reactive lines order themselves by priority, and the most urgent one waiting is replaced only by one more urgent',()=>{
  const s=fresh();
  s.subtitle={id:D('014'),speaker:'Marek Zieliński',text:'x',duration:2.5,until:s.clock+2.5};   // someone is speaking: one voice taken
  assert.equal(s.line(D('153'),'p3'),true);                  // priority 3 waits: two voices alive
  assert.equal(s.line(D('144'),'p2'),true,'priority 2 replaces the waiting priority 3');
  assert.deepEqual(s.dialogueQueue.map(l=>l.id),[D('144')]);
  assert.equal(s.line(D('153'),'p3b'),false,'the channel is full and priority 3 is less urgent than the one waiting');
  assert.equal(s.line(D('144'),'p2b'),false,'an equal priority does not replace either');
  assert.equal(s.line(D('139'),'p1'),true,'priority 1 replaces the waiting priority 2');
  assert.deepEqual(s.dialogueQueue.map(l=>[l.id,l.priority,l.bark]),[[D('139'),1,true]]);
  assert.equal(s.dialogueConsumed.includes('p3b'),false,'a refused line leaves no token');
});

test('with nothing on screen two reactive lines are the limit: a third of the same urgency finds no room, a more urgent one takes the place of the last',()=>{
  const s=fresh();
  assert.equal(s.line(D('145'),'a'),true);assert.equal(s.line(D('144'),'b'),true);
  assert.deepEqual(s.dialogueQueue.map(l=>l.id),[D('145'),D('144')],'equal urgency keeps the order they came in');
  assert.equal(s.line(D('127'),'c'),false,'two voices alive already, and priority 2 is not more urgent than 2');
  assert.equal(s.line(D('153'),'c2'),false,'nor is priority 3');
  assert.equal(s.line(D('139'),'d'),true,'priority 1 takes the place of the last one');
  assert.deepEqual(s.dialogueQueue.map(l=>l.id),[D('139'),D('145')]);
  assert.ok((s.subtitle?1:0)+s.dialogueQueue.length<=BARK_CONFIG.voices);
});

test('a reactive line that waited past its time to live is dropped; a fresh one is shown',()=>{
  const s=fresh();
  s.subtitle={id:D('014'),speaker:'x',text:'x',duration:9,until:s.clock+9};
  assert.equal(s.line(D('139'),'late'),true);   // priority 1: lives 2.5 s in the queue
  s.clock+=1;s.advanceSubtitle();assert.equal(s.dialogueQueue.length,1);
  s.clock+=2;s.advanceSubtitle();assert.equal(s.dialogueQueue.length,0,'stale: the moment has passed');
  assert.equal(s.subtitle.id,D('014'));
  s.subtitle=null;assert.equal(s.line(D('139'),'fresh'),true);s.advanceSubtitle();assert.equal(s.subtitle.id,D('139'));
  assert.equal(s.subtitle.until,s.clock+s.subtitle.duration);
});

test('cutting: a scripted line cuts a reactive one after cutAfterSec, a danger call cuts an ambient remark, nothing cuts a scripted line',()=>{
  const cut=BARK_CONFIG.cutAfterSec;
  // scripted over reactive
  let s=fresh();s.line(D('153'),'a');s.advanceSubtitle();assert.equal(s.subtitle.id,D('153'));
  s.line(D('018'),'b');s.advanceSubtitle();assert.equal(s.subtitle.id,D('153'),'too soon: the remark keeps the screen');
  s.clock+=cut+.01;s.advanceSubtitle();assert.equal(s.subtitle.id,D('018'),'cut after cutAfterSec');
  // priority 1 over 3, but not over 2
  s=fresh();s.line(D('153'),'a');s.advanceSubtitle();s.clock+=cut+.01;s.line(D('139'),'b');s.advanceSubtitle();assert.equal(s.subtitle.id,D('139'));
  s=fresh();s.line(D('144'),'a');s.advanceSubtitle();s.clock+=cut+.01;s.line(D('139'),'b');s.advanceSubtitle();assert.equal(s.subtitle.id,D('144'),'a priority 2 line is not cut by a priority 1 one');
  s.clock+=1.6;s.advanceSubtitle();assert.equal(s.subtitle.id,D('139'),'it waits its turn instead');
  // a scripted line on screen is never cut, by a scripted or a reactive one
  s=fresh();s.line(D('018'),'a');s.advanceSubtitle();s.clock+=cut+.5;s.line(D('019'),'b');
  assert.equal(s.line(D('139'),'c'),false,'a scripted line on screen and one waiting fill the two voices: even a danger call does not jump the script');
  s.advanceSubtitle();assert.equal(s.subtitle.id,D('018'));assert.deepEqual(s.dialogueQueue.map(l=>l.id),[D('019')]);
  s=fresh();s.line(D('018'),'a');s.advanceSubtitle();s.clock+=cut+.5;
  assert.equal(s.line(D('139'),'c'),true,'one voice free: it waits behind the scripted line on screen');
  s.advanceSubtitle();assert.equal(s.subtitle.id,D('018'),'and does not cut it');
});

test('one subtitle at a time: nobody talks over anybody, and no more than two lines are ever alive for the reactive kind',()=>{
  const s=fresh();let worst=0,previous=null;const starts=[];
  const lines=[D('139'),D('153'),D('144'),D('145'),D('133'),D('125'),D('018'),D('127'),D('100')];
  for(let i=0;i<1200;i++){
    s.clock+=.05;
    if(i%7===0)s.line(lines[(i/7|0)%lines.length],`t${i}`);
    s.advanceSubtitle();
    const alive=(s.subtitle?.bark?1:0)+s.dialogueQueue.filter(l=>l.bark).length;worst=Math.max(worst,alive);
    if(s.subtitle&&(!previous||previous.id!==s.subtitle.id||previous.until!==s.subtitle.until))starts.push({id:s.subtitle.id,at:s.subtitle.until-s.subtitle.duration,dur:s.subtitle.duration,bark:Boolean(s.subtitle.bark)});
    previous=s.subtitle?{id:s.subtitle.id,until:s.subtitle.until}:null;
  }
  assert.ok(starts.length>20);assert.ok(worst<=2,`${worst} reactive lines alive`);
  for(let i=1;i<starts.length;i++){
    const before=starts[i-1],gap=starts[i].at-before.at;
    // the next subtitle starts when the one on screen has ended, or cuts a reactive one after cutAfterSec: never over a scripted line
    assert.ok(gap>=Math.min(before.dur,BARK_CONFIG.cutAfterSec)-1e-6,`${before.id} then ${starts[i].id} after ${gap.toFixed(2)} s`);
    if(!before.bark)assert.ok(gap>=before.dur-1e-6,`${before.id} (scripted) is never cut`);
  }
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The director
test('variant rotation: ally_hit alternates 100 and 101, each at most 3 times, and the callout is the last resort',()=>{
  const s=withdrawal(fresh());const said=[];
  for(let k=0;k<8;k++){
    s.clock+=21;   // past the cooldown of the group
    near(s,'marek_zielinski');
    said.push(...delta(s,()=>impact(s,{victim:'pl_east_17',point:{x:s.player.x+10,y:0,z:s.player.z}})));
    heard(s);s.dialogueQueue=[];s.subtitle=null;
  }
  assert.deepEqual(said,[`${D(100)}#1`,`${D(101)}#1`,`${D(100)}#2`,`${D(101)}#2`,`${D(100)}#3`,`${D(101)}#3`,'co_m01_ally_hit#1','co_m01_ally_hit#2'],
    '100 and 101 alternate and run out at 3; then the old callout «Sanitário!» takes over');
});

test('cooldowns run on the real clock, never on the compressed battle clock',()=>{
  const s=fresh();near(s,'szymon_kowal');
  assert.deepEqual(delta(s,()=>crack(s)),[`${D(139)}#1`]);heard(s);
  s.battleClock+=3600;   // an hour of battle clock in no time (the 24x and 27x of the pacing)
  s.clock+=5;assert.deepEqual(delta(s,()=>crack(s)),[],'5 s of real time: still cooling down (12 s)');
  s.battleClock-=3000;s.clock+=7.5;assert.deepEqual(delta(s,()=>crack(s)),[`${D(139)}#2`]);
});

test('max repeats: a line stops at its maximum, and one that is used up is not said again',()=>{
  const s=fresh();near(s,'szymon_kowal');s.actor('jozef_bak').alive=false;let said=0;   // (with Bąk by, 121 and 139 alternate)
  for(let k=0;k<12;k++){s.clock+=13;said+=delta(s,()=>crack(s)).length;heard(s);s.dialogueQueue=[];s.subtitle=null;}
  assert.equal(said,BARK_RULES.get(D(139)).max);
  assert.equal(ledger(s).n[D(139)],6);
});

test('substitution: a casualty speaks 100/101 instead of the callout, and the callout is held back for 15 s when it spoke first',()=>{
  const s=withdrawal(fresh());near(s,'marek_zielinski');
  const point={x:s.player.x+10,y:0,z:s.player.z};
  assert.deepEqual(delta(s,()=>impact(s,{victim:'pl_east_17',point})),[`${D(100)}#1`],'the substitute, not «Sanitário!»');
  // the callout spoke by itself 10 s ago (e.g. another trigger): 100 and 101 keep quiet, and so does the callout (its own cooldown)
  const t=withdrawal(fresh());near(t,'marek_zielinski');
  assert.equal(t.line('co_m01_ally_hit','manual'),true);heard(t);t.clock+=10;
  const sayings=ids=>delta(t,ids).filter(x=>/^(dlg_m01_10[01]|co_m01_ally_hit)#/.test(x));
  assert.deepEqual(sayings(()=>impact(t,{victim:'pl_east_17',point:{x:t.player.x+10,y:0,z:t.player.z}})),[],'tocou há 10 s < 15 s');
  t.clock+=6;t.dialogueQueue=[];t.subtitle=null;
  assert.equal(sayings(()=>impact(t,{victim:'pl_east_16',point:{x:t.player.x+10,y:0,z:t.player.z}})).length,1,'after 15 s the substitute speaks again');
});

test('substitution of the combat callouts: 120 comes only after the first co_m01_enemy_mg_fire_on_squad and not within 30 s of it',()=>{
  const s=fresh();near(s,'szymon_kowal');
  const mg=()=>impact(s,{by:'de_east_1',pinned:['marek_zielinski']});
  assert.deepEqual(delta(s,mg),[],'the callout has not been said: 120 does not take its place');
  assert.equal(s.line('co_m01_enemy_mg_fire_on_squad'),true);s.dialogueQueue=[];s.subtitle=null;
  s.clock+=20;assert.deepEqual(delta(s,mg),[],'20 s after the callout');
  s.clock+=11;assert.deepEqual(delta(s,mg),[`${D(120)}#1`],'31 s after it');
  // 128 (a flash at the gates) is held back for 30 s by the same callout, and speaks after it
  const u=fresh();near(u,'szymon_kowal');u.line('co_m01_enemy_mg_fire_on_squad');u.dialogueQueue=[];u.subtitle=null;u.clock+=10;
  const flash=()=>u.emit({type:'enemy-fire',origin:{x:1055,y:0,z:30},rounds:1,interval:.075,weapon:'kar98k',at:u.clock});
  assert.deepEqual(delta(u,flash),[],'10 s after the callout');
  u.clock+=25;assert.deepEqual(delta(u,flash),[`${D(128)}#1`],'35 s after it');
  // 143 is held back for 10 s by co_m01_enemy_group_suppressed
  const t=fresh();t.activate('cover_repair');
  const mgOff=()=>{const g=t.actor('de_east_0');Object.assign(g,{active:true,alive:true,suppressedAt:t.clock,suppressedUntil:t.clock+5});t.emit({type:'player-shot',point:{x:1055,y:0,z:32},material:'earth',hit:false,weapon:'kb_wz29'});};
  assert.equal(t.line('co_m01_enemy_group_suppressed','manual'),true);t.clock+=5;t.dialogueQueue=[];t.subtitle=null;
  assert.deepEqual(delta(t,mgOff),[],'the callout said it 5 s ago');
  t.clock+=6;assert.deepEqual(delta(t,mgOff),[`${D(143)}#1`]);
});

test('a follow-up comes between its time and its window after the line it answers, once, and only if the conditions still hold',()=>{
  const s=withdrawal(fresh());
  withLedger(s,{n:unspoken(s,[D(100),D(101),'co_m01_ally_hit'])});near(s,'marek_zielinski');
  assert.deepEqual(delta(s,()=>impact(s,{victim:'pl_east_17',point:{x:s.player.x+10,y:0,z:s.player.z}})),[`${D(102)}#1`]);heard(s);
  s.clock+=2;assert.deepEqual(delta(s,()=>barkPoll(s)),[],'too early: 103 is due 5 s after 102');
  s.clock+=3.1;s.player.moveBlend=1;assert.deepEqual(delta(s,()=>barkPoll(s)),[],'the player is running: «Deixe. Depois.» is for a man who stands');
  s.player.moveBlend=0;assert.deepEqual(delta(s,()=>barkPoll(s)),[`${D(103)}#1`]);
  s.clock+=50;assert.deepEqual(delta(s,()=>barkPoll(s)),[],'once: the window has gone');
});

test('a named speaker who is dead or gone says nothing; the platoon and any_pl are not bound to a body',()=>{
  const s=fresh();near(s,'szymon_kowal');s.actor('szymon_kowal').alive=false;s.actor('jozef_bak').alive=false;
  assert.deepEqual(delta(s,()=>crack(s)),[],'Kowal and Bąk are dead');
  const t=withdrawal(fresh());near(t,'marek_zielinski');
  for(const a of t.actors.filter(a=>a.group==='grp_east_platoon'||a.id==='generic_rifleman'))a.alive=false;
  assert.deepEqual(delta(t,()=>impact(t,{victim:'pl_east_17',point:{x:t.player.x+10,y:0,z:t.player.z}})),[`${D(100)}#1`],'«Soldado» is a voice, not an actor');
  const u=fresh();u.consumed.evt_m01_bak_wounded=u.clock;u.flags['m01.bak_status']='wounded';u.actor('leon_dudek').active=false;
  withLedger(u,{at:{evt_m01_bak_wounded:0}});u.clock+=4.5;assert.deepEqual(delta(u,()=>barkPoll(u)),[],'Dudek is not there for 104');
  // 042 itself is not said by a medic who is gone
  const v=fresh();v.actor('leon_dudek').alive=false;Object.assign(v.actor('jozef_bak'),{x:55,z:41});v.activate('hold_access');v.consume('evt_m01_bak_wounded');
  assert.ok(v.dialogueQueue.some(l=>l.id===D('041'))&&v.dialogueQueue.some(l=>l.id===D('043'))&&!v.dialogueQueue.some(l=>l.id===D('042')));
});

test('the channel is closed during a scene, the German silence, a demolition pre-roll and the end of the mission',()=>{
  const s=fresh();near(s,'szymon_kowal');
  assert.equal(barkChannelOpen(s),true);
  s.scene={id:'cs_m01_order',elapsed:1,beats:[]};assert.deepEqual(delta(s,()=>crack(s)),[],'scene');s.scene=null;
  s.battleClock=seconds('06:10:30');assert.deepEqual(delta(s,()=>crack(s)),[],'German silence');
  s.battleClock=seconds('06:09:57');assert.deepEqual(delta(s,()=>crack(s)),[],'the pre-roll of the east demolition (4 s)');
  s.battleClock=seconds('06:12:00');assert.equal(barkChannelOpen(s),true);
  s.mission.phase='OUTRO';assert.deepEqual(delta(s,()=>crack(s)),[],'roll call');s.mission.phase='AFTERMATH';
  assert.deepEqual(delta(s,()=>crack(s)),[`${D(139)}#1`]);
});

test('the global limits: a minimum gap since the last line of any kind, and at most 8/7/5 lines in 60 s by priority',()=>{
  const s=fresh();near(s,'szymon_kowal');s.activate('cover_repair');s.timers.repairPins=2;
  const pin=()=>impact(s,{by:'de_east_0',pinned:['pawel_krawiec']});
  assert.deepEqual(delta(s,()=>crack(s)),[`${D(139)}#1`]);
  s.clock+=BARK_CONFIG.gapSec['1']-.5;assert.deepEqual(delta(s,pin),[],'another priority 1 line needs 4 s since the last line: 3.5 s is too soon');
  s.clock+=1;assert.deepEqual(delta(s,pin),[`${D(125)}#1`],'4.5 s');
  // a minute full of scripted lines leaves no room for an ambient remark, and little for the rest
  const t=fresh();t.activate('hold_corridor');t.battleClock=seconds('06:30:00');
  assert.equal(delta(t,()=>barkPoll(t)).length,1,'a quiet minute: «Quieto demais» may be said');
  const u=fresh();u.activate('hold_corridor');u.battleClock=seconds('06:30:00');
  for(let i=0;i<6;i++){u.line(D(['018','019','020','021','023','024'][i]));u.clock+=2.5;u.dialogueQueue=[];u.subtitle=null;}
  u.clock+=9;   // the gap is over, the six scripted lines are still inside the minute
  assert.deepEqual(delta(u,()=>barkPoll(u)),[],'priority 3 is allowed 5 in a minute: six are there');
});

test('the quiet condition counts the whole of our side: the gun (ally-fire), Kowal\'s rkm (npc-shot) and the player\'s own shot hold «Quieto demais» back for 20 s',()=>{
  const cases=[
    ['the ckm',s=>s.emit({type:'ally-fire',by:'ckm_gunner',weapon:'ckm_wz30',origin:{x:8,y:-2.36,z:26},rounds:8,interval:.1,at:s.clock})],
    ['Kowal\'s rkm',s=>s.emit({type:'npc-shot',weapon:'rkm_wz28',point:{x:0,y:1.5,z:0},rounds:3})],
    ['the player',s=>{s.player.weaponShotAt=s.clock*1000;}],
  ];
  for(const [label,fire] of cases){
    const s=fresh();s.activate('hold_corridor');s.battleClock=seconds('06:30:00');fire(s);
    assert.deepEqual(delta(s,()=>barkPoll(s)),[],`${label}: our side has just fired`);
    s.clock+=19;assert.deepEqual(delta(s,()=>barkPoll(s)),[],`${label}: 19 s later`);
    s.clock+=2;assert.equal(delta(s,()=>barkPoll(s)).length,1,`${label}: 21 s later it is quiet`);
  }
  // and the ledger that remembers it is saved: a restore in the middle of the wait keeps waiting
  const s=fresh();s.activate('hold_corridor');s.battleClock=seconds('06:30:00');s.emit({type:'npc-shot',weapon:'rkm_wz28',point:{x:0,y:1.5,z:0},rounds:3});
  const r=new M01Simulation(11);r.restoreSnapshot(structuredClone(s.snapshot()));r.clock+=10;
  assert.deepEqual(delta(r,()=>barkPoll(r)),[],'restored: 10 s after the shot, still waiting');
});

test('the director draws nothing from the random streams and writes no actor',()=>{
  const s=fresh();near(s,'szymon_kowal');const rng=s.rng.state,ai=s.actors.map(a=>a.ai?.rng);
  const bodies=JSON.stringify(s.actors);
  crack(s);s.clock+=20;crack(s);barkPoll(s);barkTrigger(s,'guide');barkTrigger(s,'coverRotation',{node:'cv_portal_road_n'});
  assert.equal(s.rng.state,rng);assert.deepEqual(s.actors.map(a=>a.ai?.rng),ai);
  assert.equal(JSON.stringify(s.actors),bodies,'actors untouched');
});

test('save and restore in the middle of a cooldown continue identically, and a double restore changes nothing',()=>{
  const s=fresh(5);near(s,'szymon_kowal');
  assert.deepEqual(delta(s,()=>crack(s)),[`${D(139)}#1`]);   // the cooldown of 139 (12 s) and the gap are running
  s.tick(DT,{});
  compareContinuation(s,{label:'bark cooldown',ticks:700,doubleAt:[3,200],dt:t=>t%13===0?0:.05,
    fault:(tick,sim)=>{
      if(tick===40||tick===140||tick===300||tick===410)crack(sim);   // inside the cooldown, just after it, again
      if(tick===500)impact(sim,{by:'de_east_1',pinned:['marek_zielinski']});
    }});
  assert.ok(reactive(s).length>=1);
});

test('an older save without timers.barks restores, and the first line creates the record',()=>{
  const s=fresh();const snap=json(s.snapshot());delete snap.timers.barks;
  const t=new M01Simulation(2);t.restoreSnapshot(snap);t.clock=300;near(t,'szymon_kowal');
  assert.equal(t.timers.barks,undefined);
  assert.deepEqual(delta(t,()=>crack(t)),[`${D(139)}#1`]);
  validateM01Snapshot(t.snapshot());heard(t);
  assert.ok(t.timers.barks);validateM01Snapshot(t.snapshot());
});

test('a corrupt reactive record is refused atomically, in the save and in its checkpoint',()=>{
  const s=fresh();near(s,'szymon_kowal');crack(s);
  s.tick(DT,{});
  const good=json(s.snapshot());validateM01Snapshot(good);
  const changes=[
    b=>{b.last=s.clock+5;},b=>{b.recent=[1,2,3,4,5,6,7,8,9];},b=>{b.recent=[10,5];},b=>{b.at.dlg_m01_nowhere=1;},b=>{b.at[D(139)]=s.clock+1;},
    b=>{b.n[D(139)]=99;},b=>{b.n[D(139)]=0;},b=>{b.n.dlg_m01_018=1;},b=>{b.g.nogroup=[0,0];},b=>{b.g.ally_hit=[5,0];},b=>{b.g.ally_hit=[0];},
    b=>{b.seen.bogus=1;},b=>{b.seen.hits=0;},b=>{b.seen.sun=[5,1];},b=>{b.extra=1;},b=>{delete b.seen;},b=>{b.recent=null;},
  ];
  for(const nested of [false,true])for(const [i,change] of changes.entries()){
    const bad=json(good);if(nested)bad.resumeCheckpoint=json(good);
    change((nested?bad.resumeCheckpoint:bad).timers.barks);
    const target=fresh(),before=target.snapshot(),copy=json(bad);
    assert.throws(()=>target.restoreSnapshot(bad),/Checkpoint M01 inválido/,`change ${i} nested ${nested}`);
    assert.deepEqual(target.snapshot(),before);assert.deepEqual(bad,copy);
  }
  // queue records
  const badQueues=[
    q=>{q.push({id:D(139),speaker:'x',text:'x',duration:2.5,bark:true,priority:2,expires:1});},   // priority is not its rule's
    q=>{q.push({id:D(139),speaker:'x',text:'x',duration:2.5,bark:true,priority:1});},             // no expiry
    q=>{q.push({id:D('018'),speaker:'x',text:'x',duration:2.5,priority:1});},                       // a scripted record with a priority
    q=>{q.push({id:D(139),speaker:'x',text:'x',duration:2.5,bark:true,priority:1,expires:9},{id:D('018'),speaker:'x',text:'x',duration:2.5});},   // scripted after reactive
    q=>{q.push({id:D(153),speaker:'x',text:'x',duration:2.5,bark:true,priority:3,expires:9},{id:D(139),speaker:'x',text:'x',duration:2.5,bark:true,priority:1,expires:9});},   // not by urgency
  ];
  for(const [i,change] of badQueues.entries()){
    const bad=json(good);change(bad.dialogueQueue);
    assert.throws(()=>fresh().restoreSnapshot(bad),/Checkpoint M01 inválido/,`queue ${i}`);
  }
  assert.doesNotThrow(()=>validateBarkState(good.timers.barks,good.clock,m=>{throw new Error(m);}));
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The six lines nothing said, and the guide
test('067, 042 and 047 are said by their events, in the order of the script',()=>{
  const s=fresh();s.consume('evt_m01_planes_heard');
  assert.deepEqual(s.dialogueQueue.map(l=>l.id).slice(0,4),[D('012'),D('013'),D('067'),D('066')]);
  const t=fresh();Object.assign(t.actor('jozef_bak'),{x:55,z:41});t.activate('hold_access');t.consume('evt_m01_bak_wounded');
  assert.deepEqual(t.dialogueQueue.map(l=>l.id),[D('041'),D('042'),D('043')]);
  assert.equal(t.dialogueQueue[1].speaker,'Leon Dudek');
  const u=fresh();u.consume('evt_m01_east_demolition');u.activate('hold_corridor');u.clock=u.consumed.evt_m01_east_demolition+11;u.tick(DT,{});
  const said=[u.subtitle,...u.dialogueQueue].filter(Boolean).map(l=>l.id);
  assert.deepEqual(said.slice(0,2),[D('047'),D('048')],'count aloud, then count ours and not the shots');
});

// 2026-10-19 re-pin (bark director review N3): 030 «Cubro você!» was Bąk's, and Bąk never fires in the game; it is Kowal's now, said only when his rkm really fired in the last 6 s.
test('030: Kowal covers the player who reloads next to him while his rkm is firing, between train 963 and the east demolition',()=>{
  const s=fresh();s.consumed.evt_m01_train963_arrives=0;near(s,'szymon_kowal',2);const k=s.actor('szymon_kowal');
  k.firedAt=-1e9;assert.deepEqual(delta(s,()=>s.emit({type:'reload',weapon:'kb_wz29'})),[],'he has not fired: he says nothing');
  k.firedAt=s.clock-2;assert.deepEqual(delta(s,()=>s.emit({type:'reload',weapon:'kb_wz29'})),[`${D(30)}#1`]);
  s.clock+=50;k.firedAt=s.clock-2;s.advanceSubtitle();near(s,'szymon_kowal',12);assert.deepEqual(delta(s,()=>s.emit({type:'reload',weapon:'kb_wz29'})),[],'12 m is too far (8 m)');
  const t=fresh();near(t,'szymon_kowal',2);t.actor('szymon_kowal').firedAt=t.clock-1;assert.deepEqual(delta(t,()=>t.emit({type:'reload',weapon:'kb_wz29'})),[],'before train 963');
});

test('the «siga a voz» guide is a voice, not a message every 7 s: variants, 14 s apart, silent while the player closes in, a message only as the fallback',()=>{
  const s=fresh();s.activate('follow_sergeant');
  const rally=s.world.point('rally_point');Object.assign(s.player,{x:rally.x+60,z:rally.z,angle:0});
  s.drainEvents();
  s.tick(DT,{});   // first call
  const first=reactive(s).filter(t=>/dlg_m01_015[a-d]/.test(t));
  assert.equal(first.length,1);assert.equal(s.drainEvents().filter(e=>e.type==='message'&&/Zieliński chama-o/.test(e.message)).length,0,'a voice, no message');
  assert.ok(Math.abs(s.timers.guide-(s.clock+14))<1e-9,'next call in 14 s');
  // the player runs 20 m towards the rally point: the next call is skipped (and the 14 s run again)
  s.dialogueQueue=[];s.subtitle=null;s.clock+=14.1;s.player.x-=20;s.tick(DT,{});
  assert.equal(reactive(s).filter(t=>/dlg_m01_015[a-d]/.test(t)).length,1,'closing in: silent');
  // standing still: the variants rotate, never the same twice in a row
  for(let k=0;k<5;k++){s.dialogueQueue=[];s.subtitle=null;s.clock+=14.1;s.tick(DT,{});}
  const all=reactive(s).filter(t=>/dlg_m01_015[a-d]/.test(t));
  all.forEach((t,i)=>{if(i)assert.notEqual(t.split('#')[0],all[i-1].split('#')[0]);});
  assert.ok(new Set(all.map(t=>t.split('#')[0])).size>=3,'at least three of the four variants');
});

test('the guide waits for the voice that is speaking, and falls back on the old message when the channel is shut',()=>{
  const s=fresh();s.activate('follow_sergeant');
  s.subtitle={id:D('014'),speaker:'x',text:'x',duration:5,until:s.clock+5};
  s.drainEvents();s.tick(DT,{});assert.equal(reactive(s).length,0);assert.equal(s.timers.guide,0,'not asked yet: it will be asked again at the next tick');
  s.subtitle=null;withLedger(s,{last:s.clock-1,recent:Array.from({length:8},(_,i)=>s.clock-8+i)});   // the minute is full: the channel takes no more
  s.tick(DT,{});
  assert.ok(s.drainEvents().some(e=>e.type==='message'&&/Zieliński chama-o/.test(e.message)));
  assert.ok(s.timers.guide>s.clock+13.9);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// Every rule can be said: the scene is staged by hand (a Node route puts the player where he stands, not where each rule needs him)
const sees=(s,id)=>s.world.lineOfSight(s.actor(id),s.player);
const wherever={x:-26.5,z:28};
const inCover=s=>{Object.assign(s.player,{x:wherever.x,z:wherever.z});return s;};
const gunner=s=>s.actor('ckm_gunner');
// The events as the simulation emits them (the contract is in tests/m01-ckm-stoppage.test.js): the gun stops, and the loader clears it `sec` seconds later.
const MUZZLE={x:8,y:-2.36,z:26};
const stoppage=(s,sec=3.8,n=1)=>s.emit({type:'ckm_stoppage',by:'ckm_gunner',at:s.clock,clearAt:s.clock+sec,origin:MUZZLE,n});
const cleared=(s,n=1)=>s.emit({type:'ckm_stoppage_cleared',by:'ckm_loader',at:s.clock,origin:MUZZLE,n});
// R2-a: the events of the section as src/game/m01-section.js emits them (the contract is in tests/m01-section.test.js and validateM01AudioEvent): who called, what, where he stands, where it is.
const callOut=(s,o={})=>{const by=s.actor(o.by??'staszek_pawlak');
  return s.emit({type:'section-callout',kind:'mg',by:by.id,target:'de_east_0',side:'left',landmark:'gate',from:{x:by.x,y:by.y,z:by.z},point:{x:by.x,y:by.y,z:by.z},aim:{x:1055,y:0,z:32},at:s.clock,reactions:[],...o});};
const orderOut=(s,o={})=>{const l=s.actor('marek_zielinski');
  return s.emit({type:'section-order',kind:'hold',by:l.id,to:['szymon_kowal'],target:null,side:null,from:{x:l.x,y:l.y,z:l.z},point:{x:l.x,y:l.y,z:l.z},at:s.clock,...o});};
const speakFirst=(s,id,sec)=>{ // the line `id` was said `sec` seconds ago (for the follow-ups), and used up
  const L=s.timers.barks??(s.timers.barks=newBarkState());L.at[id]=s.clock-sec;L.n[id]=1;return s;
};
const CASES={
  [D(100)]:{stage:s=>{withdrawal(s);near(s,'marek_zielinski');},act:s=>impact(s,{victim:'pl_east_17',point:{x:s.player.x+10,y:0,z:s.player.z}})},
  [D(101)]:{stage:s=>{withdrawal(s);near(s,'marek_zielinski');withLedger(s,{g:{ally_hit:[1,0]}});},act:s=>impact(s,{victim:'pl_east_17',point:{x:s.player.x+10,y:0,z:s.player.z}})},
  [D(102)]:{stage:s=>{withdrawal(s);near(s,'marek_zielinski');withLedger(s,{n:unspoken(s,[D(100),D(101),'co_m01_ally_hit'])});},act:s=>impact(s,{victim:'pl_east_17',point:{x:s.player.x+60,y:0,z:s.player.z}})},
  [D(103)]:{stage:s=>{withdrawal(s);speakFirst(s,D(102),5.5);},act:s=>barkPoll(s)},
  [D(104)]:{stage:s=>{s.consumed.evt_m01_bak_wounded=s.clock-4.5;s.flags['m01.bak_status']='wounded';},act:s=>barkPoll(s)},
  [D(105)]:{stage:s=>{near(s,'marek_zielinski');s.player.health=92;},act:s=>s.emit({type:'player-hit'})},
  [D(106)]:{stage:s=>{near(s,'marek_zielinski');speakFirst(s,D(100),8.5);},act:s=>barkPoll(s)},
  [D(107)]:{stage:s=>{near(s,'marek_zielinski');speakFirst(s,D(100),8.5);s.timers.barks.g={medic_call:[1,0]};},act:s=>barkPoll(s)},
  [D(108)]:{stage:s=>{s.consumed.evt_m01_dudek_retrieves_bak=s.clock-2.5;s.flags['m01.bak_status']='rescued_by_dudek';},act:s=>barkPoll(s)},
  [D(109)]:{stage:s=>{near(s,'leon_dudek',4);s.player.carrying='jozef_bak';speakFirst(s,D(146),8.5);},act:s=>barkPoll(s)},
  [D(110)]:{stage:s=>{near(s,'ckm_gunner',20);gunner(s).ckmFire.bursts=1;},act:s=>s.emit({type:'ally-fire',by:'ckm_gunner',weapon:'ckm_wz30',origin:{x:8,y:-2,z:26},rounds:8,interval:.1,at:s.clock})},
  [D(111)]:{stage:s=>{near(s,'ckm_gunner',20);gunner(s).ckmFire.bursts=3;gunner(s).ckm={...gunner(s).ckm,burstPlan:{target:'de_east_6'}};},
    act:s=>s.emit({type:'ally-fire',by:'ckm_gunner',weapon:'ckm_wz30',origin:{x:8,y:-2,z:26},rounds:8,interval:.1,at:s.clock})},
  [D(112)]:{stage:s=>{near(s,'ckm_gunner',20);gunner(s).ckm={...gunner(s).ckm,phase:'feed'};gunner(s).ckmFire.belt=3;},act:s=>barkPoll(s)},
  [D(113)]:{stage:s=>{near(s,'ckm_loader',4);speakFirst(s,D(112),3.5);gunner(s).ckmFire.belt=CKM_BELT;},act:s=>barkPoll(s)},
  // 2026-10-22 (ckm stoppage): the two events of the simulation (startCKMStoppage and the clearance in updateCKMGunner of m01-simulation.js)
  [D(114)]:{stage:s=>{near(s,'ckm_gunner',20);},act:s=>stoppage(s)},
  [D(115)]:{stage:s=>{near(s,'ckm_loader',4);speakFirst(s,D(114),3.8);},act:s=>cleared(s)},
  [D(116)]:{stage:s=>{near(s,'ckm_gunner',20);s.battleClock=seconds('06:12:30');s.consumed.evt_m01_east_demolition=s.clock-12;gunner(s).ckm={...gunner(s).ckm,phase:'retreat'};},act:s=>barkPoll(s)},
  [D(117)]:{stage:s=>{near(s,'ckm_loader',4);s.battleClock=seconds('06:12:30');speakFirst(s,D(116),2);},act:s=>barkPoll(s)},
  [D(118)]:{stage:s=>{near(s,'ckm_reserve',6);s.battleClock=seconds('06:12:30');s.consumed.evt_m01_east_demolition=s.clock-20;gunner(s).ckm={...gunner(s).ckm,phase:'retreat'};withLedger(s,{n:unspoken(s,[D(116)])});},act:s=>barkPoll(s)},
  [D(119)]:{stage:s=>{s.battleClock=seconds('06:12:30');speakFirst(s,D(118),2.2);},act:s=>barkPoll(s)},
  [D(120)]:{stage:s=>{near(s,'szymon_kowal');withLedger(s,{at:{co_m01_enemy_mg_fire_on_squad:s.clock-100}});},act:s=>impact(s,{by:'de_east_1',pinned:['marek_zielinski']})},
  [D(121)]:{stage:s=>{near(s,'jozef_bak');s.actor('szymon_kowal').alive=false;},act:s=>crack(s)},
  [D(122)]:{stage:s=>{s.activate('cover_repair');inCover(s);const g=s.actor('de_east_0');g.active=true;g.mg34Prone={phase:'fire_burst',startedAt:s.clock,duration:1.9,progress:1};},act:s=>barkPoll(s)},
  [D(123)]:{stage:s=>{inCover(s);const g=s.actor('de_east_1');g.active=true;g.mg34Prone={phase:'reload',startedAt:s.clock,duration:1.9,progress:1};assert.ok(sees(s,'de_east_1'),'the gate MG sees the cover');},act:s=>barkPoll(s)},
  [D(124)]:{stage:s=>{inCover(s);const g=s.actor('de_east_1');g.active=true;g.mg34Prone={phase:'reload',startedAt:s.clock,duration:1.9,progress:1};withLedger(s,{g:{mg34_reload:[1,0]}});},act:s=>barkPoll(s)},
  [D(125)]:{stage:s=>{s.activate('cover_repair');s.timers.repairPins=2;},act:s=>impact(s,{by:'de_east_0',pinned:['pawel_krawiec','sapper_2']})},
  [D(126)]:{stage:s=>{s.activate('cover_repair');s.timers.repairPins=3;withLedger(s,{n:unspoken(s,[D(125)])});},act:s=>impact(s,{by:'de_east_0',pinned:['pawel_krawiec']})},
  [D(127)]:{stage:s=>{s.activate('cover_repair');s.timers.repairPins=1;s.timers.repairSuppressedUntil=s.clock-.5;},act:s=>barkPoll(s)},
  [D(128)]:{stage:s=>{near(s,'szymon_kowal');withLedger(s,{at:{co_m01_enemy_mg_fire_on_squad:s.clock-100}});},act:s=>s.emit({type:'enemy-fire',origin:{x:1055,y:0,z:30},rounds:1,interval:.075,weapon:'kar98k',at:s.clock})},
  [D(129)]:{stage:s=>{near(s,'szymon_kowal');withLedger(s,{at:{co_m01_enemy_mg_fire_on_squad:s.clock-100},g:{located:[1,0]}});},act:s=>s.emit({type:'enemy-fire',origin:{x:1055,y:0,z:13},rounds:1,interval:.075,weapon:'mg34',at:s.clock})},
  [D(130)]:{stage:s=>{near(s,'szymon_kowal');Object.assign(s.player,{x:-28,z:28});s.timers.coverFire={by:'de_east_5',at:s.clock-1,x:1053,y:0,z:10};},act:s=>s.emit({type:'enemy-fire',origin:{x:1053,y:0,z:10},rounds:1,interval:.075,weapon:'kar98k',at:s.clock})},
  [D(131)]:{stage:s=>{near(s,'szymon_kowal');Object.assign(s.player,{x:-28,z:28});s.timers.coverFire={by:'de_east_5',at:s.clock-1,x:1053,y:0,z:31};},act:s=>s.emit({type:'enemy-fire',origin:{x:1053,y:0,z:31},rounds:1,interval:.075,weapon:'kar98k',at:s.clock})},
  // (review B1, 2026-10-19: the director reads the AI's own sight of the player, ai.seen, written by aiTarget when the man picks his target: the staging writes what he saw.)
  [D(132)]:{stage:s=>{inCover(s);const g=s.actor('de_east_5');g.active=true;g.ai.peek=1;assert.ok(sees(s,'de_east_5'),'the gate rifleman sees the cover');sawPlayer(s,g);},act:s=>barkPoll(s)},
  [D(133)]:{stage:s=>{inCover(s);withLedger(s,{n:unspoken(s,[D(132)])});const g=s.actor('de_east_5');g.active=true;g.ai.peek=1;sawPlayer(s,g);barkPoll(s);s.clock+=.6;g.ai.peek=0;},act:s=>barkPoll(s)},
  [D(134)]:{stage:s=>{near(s,'marek_zielinski');for(const id of ['de_east_4','de_east_5']){const g=s.actor(id);g.active=true;g.ai.peek=1;}},act:s=>barkPoll(s)},
  [D(135)]:{stage:s=>{s.consumed.evt_m01_germans_on_east_spans=s.clock-5;s.battleClock=seconds('06:06:00');},act:s=>s.emit({type:'enemy-fire',origin:{x:600,y:0,z:40},rounds:1,interval:.075,weapon:'kar98k',at:s.clock})},
  [D(136)]:{stage:()=>{},act:s=>barkTrigger(s,'coverRotation',{node:'cv_portal_road_n'})},
  [D(137)]:{stage:()=>{},act:s=>barkTrigger(s,'coverRotation',{node:'cv_road_truss_3'})},
  [D(138)]:{stage:s=>{near(s,'szymon_kowal');s.grenades.active.push({id:'m01_grenade_0',x:s.player.x+6,y:0,z:s.player.z,vx:0,vy:0,vz:0,fuse:2});},act:s=>barkPoll(s)},
  [D(139)]:{stage:s=>near(s,'szymon_kowal'),act:s=>crack(s)},
  [D(140)]:{stage:s=>near(s,'szymon_kowal'),act:s=>s.emit({type:'player-shot',point:{x:1055,y:0,z:30},material:'character',hit:true,weapon:'kb_wz29'})},
  [D(141)]:{stage:s=>near(s,'szymon_kowal'),act:s=>s.emit({type:'enemy_down_by_player',id:'de_east_5',group:'grp_de_east',weapon:'kb_wz29',distance:1000,point:{x:1055,y:0,z:20},at:s.clock})},
  [D(142)]:{stage:s=>{Object.assign(s.player,{x:30,z:40});s.emit({type:'enemy_down_by_player',id:'de_east_5',group:'grp_de_east',weapon:'kb_wz29',distance:1000,point:{x:1055,y:0,z:20},at:s.clock});s.clock+=8;s.dialogueQueue=[];s.subtitle=null;},
    act:s=>s.emit({type:'enemy_down_by_player',id:'de_east_6',group:'grp_de_east',weapon:'kb_wz29',distance:1000,point:{x:1055,y:0,z:22},at:s.clock})},
  [D(143)]:{stage:s=>{s.activate('cover_repair');const g=s.actor('de_east_0');Object.assign(g,{active:true,suppressedAt:s.clock,suppressedUntil:s.clock+5});},act:s=>s.emit({type:'player-shot',point:{x:1055,y:0,z:32},material:'earth',hit:false,weapon:'kb_wz29'})},
  [D(144)]:{stage:s=>{s.activate('cover_repair');s.objectives.obj_m01_cover_repair.progress=55;},act:s=>barkPoll(s)},
  [D(145)]:{stage:s=>{s.activate('hold_access');s.timers.holdAccessVisited=true;Object.assign(s.player,{x:30,z:40});s.battleClock=seconds('05:40:00');},act:s=>barkPoll(s)},
  [D(146)]:{stage:s=>{s.player.carrying='jozef_bak';},act:s=>barkPoll(s)},
  [D(147)]:{stage:s=>{s.player.carrying='jozef_bak';Object.assign(s.player,{x:-60,z:30});withLedger(s,{n:unspoken(s,[D(146)])});},act:s=>barkPoll(s)},
  [D(148)]:{stage:s=>{s.finish('rescue_bak');s.flags['m01.bak_status']='rescued_by_player';},act:s=>barkPoll(s)},
  [D(149)]:{stage:s=>{speakFirst(s,D(148),3.5);},act:s=>barkPoll(s)},
  [D(150)]:{stage:s=>{s.activate('hold_corridor');Object.assign(s.actor('pl_east_0'),{active:true,alive:true,x:-200});speakFirst(s,D('049'),26);},act:s=>barkPoll(s)},
  [D(151)]:{stage:s=>{s.battleClock=seconds('06:30:00');s.consumed.evt_m01_east_demolition=s.clock-100;Object.assign(s.player,{x:-100});for(const a of s.actors)if(a.team==='ally'&&a.alive&&a.active&&!a.civilian)a.x=-120;
    const bak=s.actor('jozef_bak');bak.carriedBy='leon_dudek';bak.carry={phase:'carry',startedAt:s.clock,duration:1.6};},act:s=>barkPoll(s)},
  [D(152)]:{stage:s=>{s.battleClock=seconds('06:30:00');s.consumed.evt_m01_east_demolition=s.clock-100;Object.assign(s.player,{x:-100});for(const a of s.actors)if(a.team==='ally'&&a.alive&&a.active&&!a.civilian)a.x=-120;
    assert.equal(s.readiness('evt_m01_west_demolition'),true);},act:s=>barkPoll(s)},
  [D(153)]:{stage:s=>{s.activate('hold_corridor');s.battleClock=seconds('06:30:00');},act:s=>barkPoll(s)},
  [D(154)]:{stage:s=>{s.activate('cover_repair');},act:s=>barkPoll(s)},
  [D('030')]:{stage:s=>{s.consumed.evt_m01_train963_arrives=0;near(s,'szymon_kowal',2);s.actor('szymon_kowal').firedAt=s.clock-1;},act:s=>s.emit({type:'reload',weapon:'kb_wz29'})},
  [D('035')]:{stage:()=>{},act:s=>barkTrigger(s,'coverRotation',{node:'cv_tower_p1_n'})},
  [D('036')]:{stage:s=>{s.activate('hold_access');s.battleClock=seconds('05:40:00');Object.assign(s.player,{angle:-.12,pitch:.1});withLedger(s,{n:unspoken(s,[D(154)])});},
    act:s=>{for(let i=0;i<150;i++){s.clock+=.05;s.battleClock+=.05;barkPoll(s);}}},
  [D('015a')]:{stage:s=>{const r=s.world.point('rally_point');Object.assign(s.player,{x:r.x+60,z:r.z,angle:0});},act:s=>barkTrigger(s,'guide')},
  [D('015b')]:{stage:()=>{},act:s=>barkTrigger(s,'guide')},   // staged below: the rally point must be on the player's left
  [D('015c')]:{stage:s=>{const r=s.world.point('rally_point');Object.assign(s.player,{x:r.x+25,z:r.z,angle:0});withLedger(s,{g:{guide:[2,0]}});},act:s=>barkTrigger(s,'guide')},
  [D('015d')]:{stage:s=>{const r=s.world.point('rally_point');Object.assign(s.player,{x:r.x+60,z:r.z,angle:0});withLedger(s,{g:{guide:[3,0]}});},act:s=>barkTrigger(s,'guide')},
  // 2026-10-22 (slice 3 and SP-08): the section's bounds (trigger squadMove), Dudek under fire and covered in the escort, the east bank's fire on the road.
  [D(156)]:{stage:()=>{},act:s=>barkTrigger(s,'squadMove',{node:'passed'})},
  [D(157)]:{stage:()=>{},act:s=>barkTrigger(s,'squadMove',{node:'fallback'})},
  [D(158)]:{stage:()=>{},act:s=>barkTrigger(s,'squadMove',{node:'pinned'})},
  [D(159)]:{stage:()=>{},act:s=>barkTrigger(s,'squadMove',{node:'hold'})},
  [D(160)]:{stage:s=>{s.consumed.evt_m01_east_demolition=s.clock-30;near(s,'leon_dudek',30);},act:s=>impact(s,{kind:'squad',pinned:['leon_dudek']})},
  [D(161)]:{stage:s=>{s.timers.corridor={phase:'escort',counted:12,total:12,at:s.clock,since:s.clock};s.actor('leon_dudek').task='evacuate_bak';near(s,'leon_dudek',4);},act:s=>barkPoll(s)},
  [D(163)]:{stage:s=>{s.consumed.evt_m01_east_demolition=s.clock-30;near(s,'szymon_kowal',40);},act:s=>s.emit({type:'enemy-fire',origin:{x:1055,y:0,z:30},rounds:1,interval:.075,weapon:'kar98k',at:s.clock})},
  // 2026-10-24 (R2-a, golden amendment 17): the section's calls (section-callout), the answer, the sergeant's orders (section-order) and the arrival of the pair at a post (squadMove), the events as
  // src/game/m01-section.js emits them. Each pair of lines of a group is staged twice: the first member's turn, and the second's (the ledger's group record).
  [D(164)]:{stage:s=>near(s,'staszek_pawlak'),act:s=>callOut(s,{kind:'mg',side:'left'})},
  [D(165)]:{stage:s=>{near(s,'jozef_bak');withLedger(s,{g:{sec_mg_left:[1,0]}});},act:s=>callOut(s,{kind:'mg',side:'left'})},
  [D(166)]:{stage:s=>near(s,'staszek_pawlak'),act:s=>callOut(s,{kind:'mg',side:'right'})},
  [D(167)]:{stage:s=>{near(s,'jozef_bak');withLedger(s,{g:{sec_mg_right:[1,0]}});},act:s=>callOut(s,{kind:'mg',side:'right'})},
  [D(168)]:{stage:s=>near(s,'east_platoon_voice'),act:s=>callOut(s,{kind:'gate',side:null})},
  [D(169)]:{stage:s=>{near(s,'jozef_bak');withLedger(s,{g:{sec_gate:[1,0]}});},act:s=>callOut(s,{kind:'gate',side:'right'})},
  [D(170)]:{stage:s=>near(s,'jozef_bak'),act:s=>callOut(s,{kind:'dike',side:null,landmark:'dike',target:'de_east_20'})},
  [D(171)]:{stage:s=>{near(s,'staszek_pawlak');withLedger(s,{g:{sec_dike:[1,0]}});},act:s=>callOut(s,{kind:'dike',side:null,landmark:'dike',target:'de_east_20'})},
  [D(172)]:{stage:s=>near(s,'staszek_pawlak',60),act:s=>callOut(s,{kind:'deck',side:null,landmark:'deck',target:'de_spans_7'})},
  [D(173)]:{stage:s=>{near(s,'east_platoon_voice',60);withLedger(s,{g:{sec_deck:[1,0]}});},act:s=>callOut(s,{kind:'deck',side:null,landmark:'deck',target:'de_spans_7'})},
  [D(174)]:{stage:s=>near(s,'staszek_pawlak',60),act:s=>callOut(s,{kind:'advance',side:null,landmark:'deck',target:'de_spans_7'})},
  [D(175)]:{stage:s=>{near(s,'east_platoon_voice',60);withLedger(s,{g:{sec_advance:[1,0]}});},act:s=>callOut(s,{kind:'advance',side:null,landmark:'deck',target:'de_spans_7'})},
  [D(176)]:{stage:s=>near(s,'staszek_pawlak',60),act:s=>callOut(s,{kind:'fallback',side:null,landmark:'deck',target:'de_spans_5'})},
  [D(177)]:{stage:s=>{near(s,'east_platoon_voice',60);withLedger(s,{g:{sec_fall:[1,0]}});},act:s=>callOut(s,{kind:'fallback',side:null,landmark:'deck',target:'de_spans_5'})},
  [D(178)]:{stage:s=>near(s,'staszek_pawlak',60),act:s=>callOut(s,{kind:'down',side:null,landmark:'deck',target:'de_spans_5'})},
  [D(179)]:{stage:s=>{near(s,'east_platoon_voice',60);withLedger(s,{g:{sec_down:[1,0]}});},act:s=>callOut(s,{kind:'down',side:null,landmark:'deck',target:'de_spans_5'})},
  [D(180)]:{stage:s=>near(s,'staszek_pawlak'),act:s=>callOut(s,{kind:'pinned',by:'staszek_pawlak',target:null,side:null,landmark:null})},
  [D(181)]:{stage:s=>near(s,'east_platoon_voice'),act:s=>callOut(s,{kind:'pinned',by:'east_platoon_voice',target:null,side:null,landmark:null})},
  [D(182)]:{stage:s=>near(s,'staszek_pawlak'),act:s=>callOut(s,{kind:'casualty',by:'staszek_pawlak',target:'pl_west_0',side:null,landmark:null})},
  [D(183)]:{stage:s=>near(s,'east_platoon_voice'),act:s=>callOut(s,{kind:'casualty',by:'east_platoon_voice',target:'pl_west_0',side:null,landmark:null})},
  [D(184)]:{stage:s=>near(s,'szymon_kowal'),act:s=>callOut(s,{kind:'casualty',by:'szymon_kowal',target:'pl_west_1',side:null,landmark:null})},
  [D(185)]:{stage:s=>near(s,'ckm_gunner',20),act:s=>callOut(s,{kind:'casualty',by:'ckm_loader',target:'jozef_bak',side:null,landmark:null})},
  [D(186)]:{stage:s=>{near(s,'szymon_kowal');speakFirst(s,D(164),2);},act:s=>barkPoll(s)},
  [D(187)]:{stage:s=>near(s,'marek_zielinski'),act:s=>orderOut(s,{kind:'focus',side:'left',target:'de_east_0'})},
  [D(188)]:{stage:s=>near(s,'marek_zielinski'),act:s=>orderOut(s,{kind:'focus',side:'right',target:'de_east_0'})},
  [D(189)]:{stage:s=>near(s,'marek_zielinski'),act:s=>orderOut(s,{kind:'focus',side:null,target:'de_east_14'})},
  [D(190)]:{stage:s=>near(s,'marek_zielinski'),act:s=>orderOut(s,{kind:'hold'})},
  [D(191)]:{stage:s=>{near(s,'marek_zielinski');withLedger(s,{g:{sec_hold:[1,0]}});},act:s=>orderOut(s,{kind:'hold'})},
  [D(192)]:{stage:s=>near(s,'marek_zielinski'),act:s=>orderOut(s,{kind:'shift',to:['staszek_pawlak','east_platoon_voice']})},
  [D(193)]:{stage:s=>near(s,'marek_zielinski'),act:s=>orderOut(s,{kind:'return',to:['staszek_pawlak','east_platoon_voice']})},
  [D(194)]:{stage:s=>near(s,'marek_zielinski'),act:s=>orderOut(s,{kind:'deck',to:['staszek_pawlak','east_platoon_voice']})},
  [D(195)]:{stage:s=>near(s,'marek_zielinski'),act:s=>orderOut(s,{kind:'sector',to:['staszek_pawlak'],target:'pl_west_0'})},
  [D(196)]:{stage:s=>near(s,'staszek_pawlak'),act:s=>barkTrigger(s,'squadMove',{node:'arrive_deck'})},
  [D(197)]:{stage:s=>{near(s,'east_platoon_voice');withLedger(s,{g:{sec_arrive_deck:[1,0]}});},act:s=>barkTrigger(s,'squadMove',{node:'arrive_deck'})},
  [D(198)]:{stage:s=>near(s,'staszek_pawlak'),act:s=>barkTrigger(s,'squadMove',{node:'arrive_trench'})},
  [D(199)]:{stage:s=>near(s,'staszek_pawlak'),act:s=>barkTrigger(s,'squadMove',{node:'arrive_home'})},
  'co_m01_ally_hit':{stage:s=>{withdrawal(s);near(s,'marek_zielinski');withLedger(s,{n:unspoken(s,[D(100),D(101),D(102)])});},act:s=>impact(s,{victim:'pl_east_17',point:{x:s.player.x+10,y:0,z:s.player.z}})},
  'co_m01_cover_rotation':{stage:()=>{},act:s=>barkTrigger(s,'coverRotation',{node:'cv_sandbag_mid_2'})},
};
// 015b needs the rally point on the player's LEFT: stand east of it and look along the axis that puts it there (the sim's own bearing decides which)
CASES[D('015b')].stage=s=>{
  const r=s.world.point('rally_point');
  for(const angle of [Math.PI/2,-Math.PI/2]){Object.assign(s.player,{x:r.x+60,z:r.z,angle});
    const rel=Math.atan2(r.z-s.player.z,r.x-s.player.x)-s.player.angle,a=Math.atan2(Math.sin(rel),Math.cos(rel));if(a<-.35&&a>-2.09)break;}
  withLedger(s,{g:{guide:[1,0]}});
};

for(const r of BARK_RULE_LIST)test(`rule ${r.id} can be said (${r.on}), and only by its own conditions`,()=>{
  const c=CASES[r.id];assert.ok(c,`${r.id} has a staged case`);
  const s=fresh();c.stage(s);
  const said=delta(s,()=>c.act(s));
  assert.ok(said.includes(`${r.id}#1`),`${r.id} not said; said ${JSON.stringify(said)}`);
  assert.equal(said.length,1,'one line per trigger');
  // the line is queued as the rule says: reactive, with its priority
  const queued=[s.subtitle,...s.dialogueQueue].filter(Boolean).find(l=>l.id===r.id);
  if(queued){assert.equal(queued.bark,true);assert.equal(queued.priority,r.priority);}
});

test('the staged cases cover exactly the rules of the data',()=>{assert.deepEqual(Object.keys(CASES).sort(),BARK_RULE_LIST.map(r=>r.id).sort());});

test('the same rules stay silent when their conditions do not hold (the player is too far, the wrong objective, the wrong side)',()=>{
  const far=(s,id)=>Object.assign(s.player,{x:s.actor(id).x+500});
  let s=withdrawal(fresh());near(s,'marek_zielinski');
  assert.deepEqual(delta(s,()=>impact(s,{victim:'pl_east_17',point:{x:s.player.x+300,y:0,z:s.player.z}})),[],'a casualty 300 m away is not heard (100: 40 m, 102: 80 m)');
  s=fresh();far(s,'szymon_kowal');assert.deepEqual(delta(s,()=>crack(s)),[],'139: Kowal is out of earshot');
  s=fresh();near(s,'szymon_kowal');assert.deepEqual(delta(s,()=>impact(s,{pass:'whizz'})),[],'a whizz is not a crack');
  s=fresh();s.activate('cover_repair');s.timers.repairPins=1;assert.deepEqual(delta(s,()=>impact(s,{pinned:['pawel_krawiec']})),[],'125 wants two pins');
  s=fresh();near(s,'szymon_kowal');withLedger(s,{at:{co_m01_enemy_mg_fire_on_squad:s.clock-100}});
  assert.deepEqual(delta(s,()=>s.emit({type:'enemy-fire',origin:{x:1200,y:0,z:30},rounds:1,interval:.075,weapon:'kar98k',at:s.clock})),[],'a flash that is not at the gates');
  s=fresh();near(s,'szymon_kowal');Object.assign(s.player,{x:-28,z:28});s.timers.coverFire={by:'de_east_5',at:s.clock-1,x:1053,y:0,z:10};
  assert.deepEqual(delta(s,()=>s.emit({type:'enemy-fire',origin:{x:1053,y:0,z:10},rounds:1,interval:.075,weapon:'kar98k',at:s.clock})).filter(t=>t.startsWith(D(131))),[],'131 is for the right, the flash is on the left');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// 2026-10-22 (ckm stoppage, golden amendment 15): 114 and 115 on the two events of the simulation
test('114 and 115: the gunner calls the stoppage, the loader answers when it is cleared, only to a player in earshot, only as a pair, and each stoppage gets one of each',()=>{
  let s=fresh();near(s,'ckm_gunner',300);
  assert.deepEqual(delta(s,()=>stoppage(s)),[],'114: the player is 300 m from the gunner');
  s=fresh();near(s,'ckm_loader',300);speakFirst(s,D(114),3.8);
  assert.deepEqual(delta(s,()=>cleared(s)),[],'115: nor from the loader');
  s=fresh();near(s,'ckm_loader',4);
  assert.deepEqual(delta(s,()=>cleared(s)),[],'115 answers a 114: none was said');
  s=fresh();near(s,'ckm_loader',4);speakFirst(s,D(114),20);
  assert.deepEqual(delta(s,()=>cleared(s)),[],'115 is for a 114 of the last 8 s: this one was 20 s ago');
  // The pair, with the speaker, priority and text the data says.
  s=fresh();near(s,'ckm_gunner',6);
  assert.deepEqual(delta(s,()=>stoppage(s)),[`${D(114)}#1`]);heard(s);
  assert.equal(s.subtitle.id,D(114));assert.equal(s.subtitle.speaker,'Atirador da ckm');assert.equal(s.subtitle.priority,2);assert.equal(s.subtitle.text,'Travou! Recarregar!');
  s.clock+=3.8;
  assert.deepEqual(delta(s,()=>cleared(s)),[`${D(115)}#1`]);heard(s);
  assert.equal(s.subtitle.id,D(115));assert.equal(s.subtitle.speaker,'Municiador da ckm');assert.equal(s.subtitle.priority,2);assert.equal(s.subtitle.text,'Pronto. Atire!');   // 2026-10-22 (Captain's decision at integration): 115 is priority 2, like the call it answers (it was 3 and was heard 0 times in 21 stoppages in earshot)
  assert.deepEqual(delta(s,()=>cleared(s)),[],'one 115 for the 114: a second clearance finds no anchor of its own');
  // The second stoppage of the mission: both again (their cooldowns long over), counted by the ledger.
  s.clock+=60;s.dialogueQueue=[];s.subtitle=null;
  assert.deepEqual(delta(s,()=>stoppage(s,4.6,2)),[`${D(114)}#2`]);heard(s);s.clock+=4.6;s.subtitle=null;
  assert.deepEqual(delta(s,()=>cleared(s,2)),[`${D(115)}#2`]);heard(s);
  assert.equal(ledger(s).n[D(114)],2);assert.equal(ledger(s).n[D(115)],2);
  // A save in the middle of a stoppage keeps the 114 in the ledger: the 115 still follows it after the restore.
  const t=fresh(5);near(t,'ckm_gunner',6);delta(t,()=>stoppage(t));heard(t);t.tick(DT,{});
  const r=new M01Simulation(5);r.restoreSnapshot(structuredClone(t.snapshot()));r.clock+=3.8;near(r,'ckm_loader',4);
  assert.deepEqual(delta(r,()=>cleared(r)),[`${D(115)}#1`]);validateM01Snapshot(r.snapshot());
  // A man who is not there says nothing: the loader fallen, the 114 is said and the 115 is not.
  const u=fresh();near(u,'ckm_gunner',6);delta(u,()=>stoppage(u));heard(u);u.clock+=3.8;u.actor('ckm_loader').alive=false;
  assert.deepEqual(delta(u,()=>cleared(u)),[],'115: the loader is down');
  // Only the events say them: a poll with a stoppage under way says nothing.
  const v=fresh();near(v,'ckm_gunner',6);const g=gunner(v);g.ckm={phase:'stoppage',startedAt:v.clock,visible:true,clearAt:v.clock+3.8};
  assert.deepEqual(delta(v,()=>barkPoll(v)),[],'no rule is on the poll');
});

test('114 and 115 respect the channel like every bark: the gap of priority 2 (6 s) holds the call back, two voices alive take the answer away, and neither displaces a more urgent line',()=>{
  // Another bark began 2 s ago: priority 2 needs 6 s.
  let s=fresh();near(s,'ckm_gunner',6);withLedger(s,{last:s.clock-2,recent:[s.clock-2]});
  assert.deepEqual(delta(s,()=>stoppage(s)),[],'114: the channel was used 2 s ago');
  s.clock+=4.1;assert.deepEqual(delta(s,()=>stoppage(s)),[`${D(114)}#1`],'114: 6.1 s later it is said (the event is one-shot: the first chance was lost)');
  // Two voices alive (a scripted line on screen, a reactive one that has waited 4 s): the answer finds no room and is not queued; the call finds none unless it is more urgent.
  const crowd=(s,waiting)=>{   // the scene by hand: one scripted line on screen, one reactive line waiting since 7 s ago (so the gap of any priority is over)
    s.subtitle={id:D('014'),speaker:'Marek Zieliński',text:'x',duration:15,until:s.clock+15};
    s.dialogueConsumed.push('waiting');s.dialogueQueue.push({id:waiting.id,speaker:'x',text:'x',duration:2.5,bark:true,priority:waiting.priority,expires:s.clock+5,queuedAt:s.clock-7,token:'waiting'});};
  s=fresh();near(s,'ckm_loader',4);speakFirst(s,D(114),3.8);crowd(s,{id:D(144),priority:2});
  assert.deepEqual(delta(s,()=>cleared(s)),[],'115: two voices are alive already');
  assert.deepEqual(s.dialogueQueue.map(l=>l.id),[D(144)],'and it displaced nobody');
  // A more urgent line waiting is not replaced by the call (priority 2 against 1); a less urgent one is: the call takes its place.
  s=fresh();near(s,'ckm_gunner',6);crowd(s,{id:D(139),priority:1});
  assert.deepEqual(delta(s,()=>stoppage(s)),[],'114 does not displace a priority 1 line');assert.deepEqual(s.dialogueQueue.map(l=>l.id),[D(139)]);
  s=fresh();near(s,'ckm_gunner',6);crowd(s,{id:D(153),priority:3});
  stoppage(s);assert.deepEqual(s.dialogueQueue.map(l=>l.id),[D(114)],'114 (priority 2) replaces a waiting priority 3 line');
  assert.ok(s.dialogueConsumed.includes(`${D(114)}#1`)&&!s.dialogueConsumed.includes('waiting'),'and the token of the line it displaced is given back');
  // The budget of the minute: priority 2 is allowed 7 lines in 60 s and the minute is full of them (2026-10-22: 115 moved from priority 3, budget 5 with six lines, to priority 2, budget 7 with seven lines; the assertion is the same).
  s=fresh();near(s,'ckm_loader',4);speakFirst(s,D(114),3.8);
  const minute=Array.from({length:7},(_,i)=>s.clock-55+i*5);withLedger(s,{...s.timers.barks,last:minute[6],recent:minute});
  assert.deepEqual(delta(s,()=>cleared(s)),[],'115: seven lines in the last minute, the budget of priority 2 is seven');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The rate
function lineStats(sim,onStep){ // collects every subtitle that goes on screen
  const starts=[];let last=null;
  return {starts,step:()=>{const s=sim.subtitle;
    if(s&&(!last||last.id!==s.id||last.until!==s.until))starts.push({id:s.id,at:s.until-s.duration,dur:s.duration,bark:Boolean(s.bark),priority:s.priority??null,battle:sim.battleClock});
    last=s?{id:s.id,until:s.until}:null;onStep?.();}};
}
const busiest=list=>{let best=0;for(const s of list)best=Math.max(best,list.filter(x=>x.at>=s.at&&x.at<s.at+60).length);return best;};

test('the worst case: every trigger firing all the time for ten minutes never gives more than 8 lines in a minute, never overlaps, and keeps the gap',()=>{
  const s=withdrawal(fresh());s.activate('cover_repair');s.activate('hold_access');s.activate('hold_corridor');
  s.consumed.evt_m01_train963_arrives=0;s.battleClock=seconds('05:45:00');
  const rec=lineStats(s);let maxAlive=0;
  for(let i=0;i<12000;i++){   // 600 s
    s.clock+=DT;
    if(i%10===0){near(s,'szymon_kowal');crack(s);impact(s,{victim:'pl_east_17',point:{x:s.player.x+10,y:0,z:s.player.z}});impact(s,{by:'de_east_1',pinned:['marek_zielinski']});
      s.emit({type:'player-hit'});s.emit({type:'player-shot',point:{x:1055,y:0,z:30},material:'character',hit:true,weapon:'kb_wz29'});
      s.emit({type:'enemy-fire',origin:{x:1055,y:0,z:30},rounds:1,interval:.075,weapon:'kar98k',at:s.clock});
      s.timers.repairPins=2;impact(s,{by:'de_east_0',pinned:['pawel_krawiec']});}
    if(i%40===0)barkTrigger(s,'coverRotation',{node:['cv_portal_road_n','cv_road_truss_1','cv_tower_p1_n','cv_sandbag_mid_2'][(i/40|0)%4]});
    barkPoll(s);s.advanceSubtitle();rec.step();
    maxAlive=Math.max(maxAlive,(s.subtitle?1:0)+s.dialogueQueue.length);
  }
  const barks=rec.starts.filter(x=>x.bark);
  assert.ok(barks.length>20,`${barks.length} barks in ten minutes: the rules do speak`);
  assert.ok(busiest(barks)<=BARK_CONFIG.budget60['1'],`busiest minute ${busiest(barks)}`);
  assert.ok(maxAlive<=BARK_CONFIG.voices,`${maxAlive} voices alive`);
  const minGap=Math.min(...barks.slice(1).map((x,i)=>x.at-barks[i].at));
  assert.ok(minGap>=BARK_CONFIG.followGapSec-.06,`two lines began ${minGap.toFixed(2)} s apart`);
  for(let i=1;i<rec.starts.length;i++)assert.ok(rec.starts[i].at>=rec.starts[i-1].at+Math.min(rec.starts[i-1].dur,BARK_CONFIG.cutAfterSec)-1e-6,'one subtitle at a time');
});

test('both golden routes: lines per minute, the busiest minute, the longest silence in combat; the reactive lines stay inside the budget and never overlap',{timeout:240000},()=>{
  const COMBAT=[seconds('04:45:00'),seconds('06:10:00')];
  for(const [seed,support] of [[19390901,false],[7,true]]){   // the two routes of every golden: the control route and the covering-fire pilot of seed 7
    let rec;const r=route(seed,{support,onStep:({sim})=>{rec??=lineStats(sim);rec.step();}});
    const all=rec.starts,barks=all.filter(x=>x.bark),combat=all.filter(x=>x.battle>=COMBAT[0]&&x.battle<COMBAT[1]);
    let silence=0;for(let i=1;i<combat.length;i++)silence=Math.max(silence,combat[i].at-(combat[i-1].at+combat[i-1].dur));
    const minutes=r.sim.clock/60;
    assert.ok(barks.length>=15,`seed ${seed} support ${support}: ${barks.length} reactive lines on the route`);
    assert.ok(busiest(barks)<=BARK_CONFIG.budget60['1'],`seed ${seed} support ${support}: ${busiest(barks)} reactive lines in the busiest minute`);
    assert.ok(busiest(all)<=14,`seed ${seed} support ${support}: ${busiest(all)} lines (scripted and reactive) in the busiest minute`);
    assert.ok(barks.length/minutes<=60/BARK_CONFIG.gapSec['2'],`seed ${seed} support ${support}: ${(barks.length/minutes).toFixed(2)} reactive lines per minute`);
    assert.ok(silence<=70,`seed ${seed} support ${support}: ${silence.toFixed(1)} s of silence in combat`);   // measured 64.8 s (control, the deck assault) and 37.8 s; it was 84.7 s and 74.7 s before the reactive lines
    for(let i=1;i<all.length;i++)assert.ok(all[i].at>=all[i-1].at+Math.min(all[i-1].dur,BARK_CONFIG.cutAfterSec)-1e-6,`seed ${seed} support ${support}: ${all[i-1].id} then ${all[i].id}`);
    for(const id of ['dlg_m01_042','dlg_m01_047','dlg_m01_067'])assert.ok(all.some(x=>x.id===id),`seed ${seed} support ${support}: ${id} was said on the route`);
    assert.equal(r.sim.mission.complete,true);
  }
});

test('the HUD names the speaker of each subtitle: 118 and 119 are two different voices',()=>{
  const s=fresh();
  s.line(D(118));s.advanceSubtitle();const first=s.subtitle.speaker;
  s.clock+=4;s.line(D(119));s.advanceSubtitle();const second=s.subtitle.speaker;
  assert.equal(first,'Soldado da ckm');assert.equal(second,'Atirador da ckm');
  assert.ok(mapLayout.sun.keyframes.length>2);   // the sun data the glare rule reads
});

test('review N1: a reactive line that leaves the queue unseen was never said: no max, no cooldown, its token back; the order to change cover falls back to the HUD',()=>{
  const s=fresh();near(s,'szymon_kowal');
  assert.deepEqual(delta(s,()=>crack(s)),[`${D(139)}#1`]);
  const q=s.dialogueQueue.find(l=>l.id===D(139));assert.ok(q.queuedAt!==undefined);
  assert.equal(ledger(s)?.n?.[D(139)]??0,0,'not counted while it waits');
  s.subtitle={id:D('029'),speaker:'x',text:'x',duration:15,until:s.clock+1e3};   // somebody talks for a long time: the bark waits past its time to live
  s.clock=q.expires+.01;s.advanceSubtitle();
  assert.ok(!s.dialogueQueue.some(l=>l.id===D(139)),'dropped');assert.ok(!s.dialogueConsumed.includes(`${D(139)}#1`),'its token is given back');
  assert.equal(ledger(s)?.n?.[D(139)]??0,0,'its max is untouched');
  s.subtitle=null;assert.deepEqual(delta(s,()=>crack(s)),[`${D(139)}#1`],'said again at once: no cooldown was spent');heard(s);
  assert.equal(ledger(s).n[D(139)],1,'counted when shown');
  // The cover rotation: the voice is queued instead of the HUD message; when it expires unseen, the message is shown then.
  const t=fresh();t.drainEvents();t.line(D('029'));heard(t);t.subtitle.until=t.clock+1e3;
  assert.equal(t.line('co_m01_cover_rotation','co_m01_cover_rotation#1'),true);const v=t.dialogueQueue.find(l=>l.id==='co_m01_cover_rotation');v.fallback='Zieliński: mude de cobertura.';
  validateM01Snapshot(t.snapshot());
  t.clock=v.expires+.01;t.advanceSubtitle();
  assert.ok(t.drainEvents().some(e=>e.type==='message'&&e.message==='Zieliński: mude de cobertura.'),'the HUD message stands in for the voice that was not heard');
});
