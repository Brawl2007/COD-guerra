import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation,seconds,validateM01Snapshot,GARRISON_IDS} from '../src/game/m01-simulation.js';
import {AID,AID_PHASES,isPatient,medicFree,bombDue,aidCover,coverSpot,restPoint} from '../src/game/m01-aid.js';
import {GARRISON_GROUP} from '../src/game/m01-garrison.js';
import definition from '../missions/m01-tczew/mission.json' with {type:'json'};
import {route} from './helpers/m01-route.js';
import {barkTrigger} from '../src/game/m01-barks.js';

// Package 2 (2026-11-04, golden amendment 21): the wounded of the west garrison call out; the medic (Dudek) runs to the nearest one, kneels, treats him, carries him to cover and goes back to his post.
// State and rules, not a playtest. The prelude is the real game up to the moment Dudek has brought the station casualty in (the first moment he is free), played with an idle player.

const DT=.05,E=n=>'evt_m01_'+n;
let PRELUDE=null;
const prelude=()=>{
  if(PRELUDE)return PRELUDE;
  const s=new M01Simulation(19390901);s.tick(DT,{skip:true});
  for(let i=0;i<40000;i++){s.tick(DT,{});const d=s.actor('leon_dudek');if(s.battleClock>=seconds('04:36:30')&&d.task==null&&s.consumedEvent(E('wounded_dragged')))break;}
  const d=s.actor('leon_dudek');assert.equal(d.task??null,null,'the prelude ended with the medic free');assert.ok(s.battleClock<seconds('04:45:00'),'before the Germans');
  return PRELUDE=s.snapshot();
};
const fresh=()=>{
  const s=new M01Simulation(1);s.restoreSnapshot(prelude());s.drainEvents();
  // The bomb still due at 04:43:10 falls now (it is not what these tests are about; the test of the bombs makes its own): the whole raid has fallen and the medic is not shaken by it.
  const pending=(s.timers.raidSchedule0434??[]).filter(t=>!t.emitted);
  if(pending.length){s.battleClock=Math.max(s.battleClock,pending.at(-1).at+.01);s.updateEarlyRaid();s.drainEvents();}
  man(s,'leon_dudek').suppressedUntil=0;
  return s;
};
const man=(s,id)=>s.actor(id);
/** One wounded man of the garrison and nobody else: the others are put back on their feet and unhurt (their bomb luck is not what these tests are about). */
const wound=(s,id,{health=40,x,z}={})=>{
  for(const a of s.actors)if(a.group===GARRISON_GROUP){Object.assign(a,{state:'GUARD',alive:true,active:true,health:100,suppressedUntil:0});delete a.aid;delete a.carriedBy;delete a.carry;delete a.diedAt;delete a.deathYaw;}
  const a=man(s,id);if(x!==undefined)Object.assign(a,{x,z});a.y=s.world.heightAt(a.x,a.z);Object.assign(a,{state:'WOUNDED',health,target:null});
  delete s.timers.aid;
  return a;
};
const aidPost=s=>s.world.point('aid_position');
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
/** Ticks until `done()` or `limit` seconds, logging the job's phase changes: [{t, phase}] (t in seconds from the start). */
const run=(s,done,limit=240)=>{
  const log=[];let last=null;const t0=s.clock;
  for(let i=0;i<limit/DT;i++){
    s.tick(DT,{});const ph=s.timers.aid?.phase??null;
    if(ph!==last){log.push({t:+(s.clock-t0).toFixed(2),phase:ph});last=ph;}
    if(done(s,log))break;
  }
  return log;
};

test('the prelude is the real game: wounded men of the garrison exist in it only if a bomb hurt them, and the medic is free of the station',()=>{
  const s=fresh();assert.equal(medicFree(s),true);assert.ok(s.consumedEvent(E('wounded_dragged')));
  assert.equal(AID.medic,'leon_dudek');assert.equal(definition.cast.find(c=>c.id===AID.medic).essential,undefined,'Dudek is not one of the essential men of the plot');
  assert.deepEqual(AID_PHASES,['go','treat','carry']);
});

test('a wounded man of the garrison gets a record and calls out three times at most, 14-22 s apart, until he is treated; the call is spoken through the director',()=>{
  const s=fresh(),a=wound(s,'pl_west_3');
  // the medic is held off (a scripted task) so that nobody treats him; the player stands near enough to hear (70 m)
  const medic=man(s,AID.medic);medic.task='stay_with_bak';
  Object.assign(s.player,{x:a.x+30,z:a.z-8});s.player.y=s.world.heightAt(s.player.x,s.player.z);
  const calls=[],said=[];let lastN=0;const t0=s.clock;
  for(let i=0;i<90/DT;i++){
    s.tick(DT,{});
    if(s.player.alive===false)break;
    if(a.aid&&a.aid.n>lastN){lastN=a.aid.n;calls.push(+(s.clock-t0).toFixed(2));}
    const sub=s.subtitle;if(sub&&/^dlg_m01_22[0-2]$/.test(sub.id)&&said[said.length-1]!==sub.id+sub.until)said.push(sub.id+sub.until);
  }
  assert.ok(a.aid,'the wounded man has a record');assert.equal(a.aid.n,AID.call.max,'three calls, no more');assert.equal(calls.length,3);
  assert.ok(calls[0]>=3-DT&&calls[0]<=7+DT*2,`the first call 3-7 s after the wound: ${calls[0]}`);
  for(let k=1;k<calls.length;k++)assert.ok(calls[k]-calls[k-1]>=14-DT&&calls[k]-calls[k-1]<=22+DT,`calls ${k-1} and ${k} are ${(calls[k]-calls[k-1]).toFixed(1)} s apart`);
  assert.ok(said.length>=1&&said.length<=3,`the director spoke ${said.length} of the calls (cooldown and budget apply)`);
  validateM01Snapshot(s.snapshot());
});

test('the medic answers the nearest wounded man, kneels at him, treats him for 6-10 s by the wound, and gives health back; a man treated no longer calls',()=>{
  const s=fresh(),a=wound(s,'pl_west_3',{health:40}),medic=man(s,AID.medic),h0=a.health;
  const log=run(s,(sim)=>a.aid?.t!==undefined,240);
  assert.deepEqual(log.map(l=>l.phase).slice(0,2),['go','treat'],'go, then treat');
  const go=log.find(l=>l.phase==='go'),treat=log.find(l=>l.phase==='treat');
  assert.ok(go&&treat&&treat.t>go.t,'he went, then he treated');
  assert.ok(a.aid.t!==undefined,'the record says when');
  assert.equal(a.health,Math.min(AID.healTo,h0+AID.heal),'health given back, up to healTo');
  assert.equal(a.state,'WOUNDED','a treated man is still down: he does not fight');
  assert.equal(a.alive,true);assert.equal(s.allies.includes(a),false,'the garrison is displayOnly: never an ally of the combat rules');
  assert.ok(dist(medic,a)<=AID.arriveM+.3,'he is at the man');
  // the treatment lasts 6-10 s: health 40 has lost 60 -> the full 10 s
  const treatedAt=a.aid.t;
  const phaseAfter=s.timers.aid?.phase??null;assert.ok(phaseAfter==='carry'||phaseAfter===null);
  const before=a.aid.n;for(let i=0;i<40/DT;i++)s.tick(DT,{});assert.equal(a.aid.n,before,'a treated man calls no more');
  assert.ok(treatedAt>0);
});

test('the treatment time follows the wound: a light wound takes the least, a deep one the most',()=>{
  const spans=[];
  for(const health of [85,40]){
    const s=fresh(),a=wound(s,'pl_west_3',{health});let start=null,end=null;
    run(s,sim=>{const j=sim.timers.aid;if(j?.phase==='treat'&&start===null)start=sim.clock;if(a.aid?.t!==undefined){end=a.aid.t;return true;}return false;},240);
    spans.push(+(end-start).toFixed(1));
  }
  assert.ok(Math.abs(spans[0]-(AID.treatSec[0]+(AID.treatSec[1]-AID.treatSec[0])*15/60))<.2,`a wound of 15: ${spans[0]} s`);
  assert.ok(Math.abs(spans[1]-AID.treatSec[1])<.2,`a wound of 60: ${spans[1]} s`);
});

test('a treated man far from a cover is carried to the nearest one and laid on its lee side; the medic goes back to the aid post free',()=>{
  const s=fresh(),a=wound(s,'pl_west_1',{x:-54,z:24}),medic=man(s,AID.medic);
  const trench=s.world.coverNodes.find(c=>c.id==='cv_trench_2'),expected=coverSpot(trench,24,0);
  const states=[];
  const log=run(s,(sim)=>{
    if(a.carry)states.push(a.carry.phase);
    if(a.aid?.rest!==undefined&&sim.timers.aid===undefined&&dist(medic,aidPost(sim))<2.2)return true;return false;},300);
  assert.deepEqual([...new Set(states)],['pickup','carry','putdown'],'the carry has the three phases of Bąk\'s');
  assert.ok(log.some(l=>l.phase==='carry'));
  assert.ok(dist(a,expected)<.01,`laid on the lee of cv_trench_2: ${a.x.toFixed(2)},${a.z.toFixed(2)} vs ${expected.x},${expected.z}`);
  assert.equal(a.carriedBy,null);assert.equal(a.carry,undefined);assert.equal(a.state,'WOUNDED');assert.ok(a.aid.rest>a.aid.t);
  assert.equal(medic.task,null,'the medic is free again');assert.equal(s.timers.aid,undefined);
  assert.ok(dist(medic,aidPost(s))<2.2,'and back at the aid post');
  validateM01Snapshot(s.snapshot());
});

test('a man who already lies by a cover is treated and left where he is; one with no cover or aid post within carryM is too',()=>{
  const s=fresh(),a=wound(s,'pl_west_0',{x:-44,z:18});   // 3.2 m from cv_trench_1
  assert.equal(restPoint(s,a),null);
  run(s,sim=>a.aid?.t!==undefined&&sim.timers.aid===undefined,240);
  assert.ok(a.aid.t!==undefined&&a.aid.rest===undefined,'treated, never carried');assert.ok(dist(a,{x:-44,z:18})<1e-9);assert.equal(a.carriedBy??null,null);
  const s2=fresh(),b=wound(s2,'pl_west_5',{x:-186,z:47});
  assert.equal(restPoint(s2,b),null,'the nearest cover is beyond carryM');
  run(s2,sim=>b.aid?.t!==undefined&&sim.timers.aid===undefined,300);
  assert.ok(b.aid.t!==undefined&&b.aid.rest===undefined&&dist(b,{x:-186,z:47})<1e-9);
});

test('he picks the nearest of two wounded men first and then the other, one job at a time',()=>{
  const s=fresh(),far=wound(s,'pl_west_5',{x:-186,z:47}),near=man(s,'pl_west_3');Object.assign(near,{state:'WOUNDED',health:50,x:-136,z:33});near.y=s.world.heightAt(near.x,near.z);
  const medic=man(s,AID.medic);Object.assign(medic,{x:-120,z:30});medic.y=s.world.heightAt(medic.x,medic.z);
  const order=[];let lastPatient=null;
  run(s,sim=>{const j=sim.timers.aid;if(j&&j.patient!==lastPatient){lastPatient=j.patient;order.push(j.patient);}return far.aid?.t!==undefined&&near.aid?.t!==undefined&&sim.timers.aid===undefined;},600);
  assert.deepEqual(order,['pl_west_3','pl_west_5'],'the nearer first');
  assert.ok(near.aid.t<far.aid.t);
});

test('the medic does not start, and stops where he is, while a bomb of the schedule is due near him or the wounded man; and he does not go with no wounded man in reach',()=>{
  const s=fresh(),a=wound(s,'pl_west_3',{health:40}),at=s.battleClock+4*3.5;   // (the battle clock runs 3.5x here: 4 s of the real clock)
  s.timers.raidSchedule0434=[{id:'raid_0434_x',at,point:{x:-130,y:s.world.heightAt(-130,35),z:35},emitted:false}];
  assert.equal(bombDue(s,[a]),true,'a bomb 4 real seconds away and 6 m from the man');assert.equal(bombDue(s,[{x:-130+AID.bombM+1,z:35}]),false,'a bomb 51 m away is no concern of a man at that distance');
  for(let i=0;i<3/DT;i++)s.tick(DT,{});
  assert.equal(s.timers.aid,undefined,'he waits for the bomb');assert.equal(man(s,AID.medic).task??null,null);
  const log=run(s,sim=>sim.timers.aid?.phase==='go',20);
  assert.ok(log.some(l=>l.phase==='go'),'once the bomb has fallen he goes');
  // nobody to treat: no job
  const s2=fresh();for(const g of s2.actors)if(g.group===GARRISON_GROUP){g.state='GUARD';delete g.aid;}
  for(let i=0;i<10/DT;i++)s2.tick(DT,{});assert.equal(s2.timers.aid,undefined);
  // outside the window: before 04:36:30 and from 05:30
  const s3=fresh(),b=wound(s3,'pl_west_3');s3.battleClock=seconds('05:30:00');assert.equal(medicFree(s3),false);s3.tick(DT,{});assert.equal(s3.timers.aid,undefined);
  const s4=fresh();s4.battleClock=seconds('04:36:00');assert.equal(medicFree(s4),false);
  const s5=fresh();man(s5,AID.medic).task='evacuate_bak';assert.equal(medicFree(s5),false,'a task of the script is never taken from him');
});

test('shaken he drops where he is, or makes for a cover within coverM and lies behind it, and goes on when the suppression ends; driven off the man he comes back and begins again',()=>{
  // in the open (no box cover within coverM): he stops and crouches
  const s=fresh(),a=wound(s,'pl_west_3',{health:40}),medic=man(s,AID.medic);
  Object.assign(medic,{x:-200,z:36});medic.y=s.world.heightAt(medic.x,medic.z);
  assert.equal(aidCover(s.world,medic,AID.coverM,{any:true}),null,'no cover near the open place');
  run(s,sim=>sim.timers.aid?.phase==='go',5);for(let i=0;i<10;i++)s.tick(DT,{});
  const at={x:medic.x,z:medic.z};medic.suppressedUntil=s.clock+3;
  for(let i=0;i<2/DT;i++)s.tick(DT,{});
  assert.ok(dist(medic,at)<.3,`shaken, he does not go on (${dist(medic,at).toFixed(2)} m)`);assert.equal(medic.crouched,true);assert.equal(s.timers.aid.phase,'go');
  const resumed=run(s,sim=>sim.timers.aid?.phase==='treat',60);
  assert.ok(resumed.some(l=>l.phase==='treat'),'and when it is over he goes on to the man');
  // beside a cover: he runs to its lee side and lies there
  const s2=fresh(),b=wound(s2,'pl_west_3',{health:40}),m2=man(s2,AID.medic);
  Object.assign(m2,{x:-62,z:30});m2.y=s2.world.heightAt(m2.x,m2.z);
  const trench=aidCover(s2.world,m2,AID.coverM,{any:true});assert.equal(trench.id,'cv_trench_2');
  run(s2,sim=>sim.timers.aid?.phase==='go',5);for(let i=0;i<4;i++)s2.tick(DT,{});
  m2.suppressedUntil=s2.clock+6;for(let i=0;i<5/DT;i++)s2.tick(DT,{});
  const spot=coverSpot(trench,m2.z);
  assert.ok(dist(m2,spot)<1.2,`he lies behind the trench (${dist(m2,spot).toFixed(2)} m from its lee side)`);assert.equal(m2.crouched,true);
  // driven off the man while treating: back to go, the treatment begins again from its full length
  const s3=fresh(),c=wound(s3,'pl_west_3',{health:40}),m3=man(s3,AID.medic);
  run(s3,sim=>sim.timers.aid?.phase==='treat',120);
  for(let i=0;i<4/DT;i++)s3.tick(DT,{});
  assert.ok(s3.timers.aid.left<AID.treatSec[1]-3,'four seconds into the treatment');
  m3.suppressedUntil=s3.clock+3;
  for(let i=0;i<8/DT;i++){s3.tick(DT,{});if(s3.timers.aid?.phase==='go')break;}
  assert.ok(s3.timers.aid&&['go','treat'].includes(s3.timers.aid.phase));
  const done=run(s3,sim=>c.aid?.t!==undefined,120);
  assert.ok(c.aid.t!==undefined,'in the end he is treated');
});

test('a bomb that falls on the lot does not touch the man on his shoulder; a man killed by a later bomb ends the job and the medic goes home',()=>{
  const s=fresh(),a=wound(s,'pl_west_1',{x:-54,z:24});const medic=man(s,AID.medic);
  run(s,sim=>a.carriedBy===medic.id&&a.carry?.phase==='carry',300);
  assert.equal(a.carriedBy,medic.id);const health=a.health;
  s.impact('bomb_on_the_lot',{x:a.x,y:0,z:a.z},true);
  assert.equal(a.health,health);assert.equal(a.alive,true,'blast skips the man who is carried');
  // a second patient killed during the way there ends the job
  const s2=fresh(),b=wound(s2,'pl_west_3',{health:40});
  run(s2,sim=>sim.timers.aid?.phase==='go',10);
  b.alive=false;b.health=0;b.state='DOWN';
  s2.tick(DT,{});assert.equal(s2.timers.aid,undefined);assert.equal(man(s2,AID.medic).task,null);
  assert.ok(dist(man(s2,AID.medic).target,aidPost(s2))<.01,'his target is the aid post again');
});

test('the job stops at 05:30 whatever it is: the carried man is put down where the medic stands, and the medic goes back',()=>{
  const s=fresh(),a=wound(s,'pl_west_1',{x:-54,z:24}),medic=man(s,AID.medic);
  run(s,sim=>a.carriedBy===medic.id&&a.carry?.phase==='carry',300);
  s.battleClock=seconds('05:30:00');s.tick(DT,{});
  assert.equal(s.timers.aid,undefined);assert.equal(a.carriedBy,null);assert.equal(a.carry,undefined);assert.equal(medic.task,null);assert.equal(a.state,'WOUNDED');
});

test('saves: a game saved in every phase of the job validates, restores, and goes on tick for tick as the original; an older save (no aid anywhere) loads and the job begins',()=>{
  const s=fresh(),a=wound(s,'pl_west_1',{x:-54,z:24}),medic=man(s,AID.medic);
  const snaps={};
  run(s,(sim)=>{const j=sim.timers.aid;const key=j?(j.phase==='carry'?'carry-'+a.carry.phase:j.phase):null;if(key&&!snaps[key])snaps[key]=sim.snapshot();return a.aid?.rest!==undefined&&sim.timers.aid===undefined;},300);
  assert.deepEqual(Object.keys(snaps).sort(),['carry-carry','carry-pickup','carry-putdown','go','treat']);
  for(const [key,snap] of Object.entries(snaps)){
    validateM01Snapshot(snap);
    const o=new M01Simulation(1);o.restoreSnapshot(snap);
    const twin=new M01Simulation(2);twin.restoreSnapshot(snap);
    for(let i=0;i<150;i++){o.tick(DT,{});twin.tick(DT,{});}
    assert.deepEqual(twin.snapshot(),o.snapshot(),`${key}: two restores go on identically`);
  }
  // a restored game finishes the job the original finishes
  const r=new M01Simulation(3);r.restoreSnapshot(snaps.treat);
  run(r,sim=>r.actor('pl_west_1').aid?.rest!==undefined&&sim.timers.aid===undefined,300);
  assert.ok(r.actor('pl_west_1').aid.rest!==undefined);
  // an older save: nothing of this module anywhere
  const clean=JSON.parse(JSON.stringify(prelude()));
  for(const x of clean.actors)delete x.aid;delete clean.timers.aid;   // a save made before this module: no record of any wounded man, no job
  assert.ok(clean.actors.every(x=>x.aid===undefined)&&clean.timers.aid===undefined);validateM01Snapshot(clean);
  const o2=new M01Simulation(4);o2.restoreSnapshot(clean);
  const w=wound(o2,'pl_west_3');const log=run(o2,sim=>w.aid?.t!==undefined,300);
  assert.ok(log.some(l=>l.phase==='go')&&w.aid.t!==undefined,'an old save with a wounded man gets the aid');
});

test('malformed aid records are refused by the validator: the wounded man\'s, the medic\'s job and the carry',()=>{
  const s=fresh(),a=wound(s,'pl_west_1',{x:-54,z:24});
  run(s,sim=>sim.timers.aid?.phase==='carry'&&a.carry?.phase==='carry',300);
  const good=s.snapshot();validateM01Snapshot(good);
  const mutate=(label,fn)=>{const t=JSON.parse(JSON.stringify(good));fn(t);assert.throws(()=>validateM01Snapshot(t),Error,label);};
  const patient=t=>t.actors.find(x=>x.id==='pl_west_1'),medic=t=>t.actors.find(x=>x.id==='leon_dudek');
  mutate('calls above the maximum',t=>{patient(t).aid.n=AID.call.max+1;});
  mutate('negative calls',t=>{patient(t).aid.n=-1;});
  mutate('a fractional count',t=>{patient(t).aid.n=1.5;});
  mutate('an unknown key',t=>{patient(t).aid.extra=1;});
  mutate('a call in the far future',t=>{patient(t).aid.at=t.clock+1000;});
  mutate('treated in the future',t=>{patient(t).aid.t=t.clock+10;});
  mutate('laid before treated',t=>{patient(t).aid.rest=t.clock-1;delete patient(t).aid.t;});
  mutate('an aid record on a man of the cast',t=>{medic(t).aid={n:0,at:1};});
  mutate('an array for a record',t=>{patient(t).aid=[0,1];});
  mutate('a job on a stranger',t=>{t.timers.aid.patient='szymon_kowal';});
  mutate('a job with an unknown phase',t=>{t.timers.aid.phase='dance';});
  mutate('a job from the future',t=>{t.timers.aid.since=t.clock+5;});
  mutate('treat without time left',t=>{t.timers.aid.phase='treat';});
  mutate('carry with no destination',t=>{delete t.timers.aid.dest;});
  mutate('carry to a non-number',t=>{t.timers.aid.dest={x:'a',z:1};});
  mutate('carry with an extra key in the destination',t=>{t.timers.aid.dest.y=0;});
  mutate('the medic has lost his task',t=>{medic(t).task=null;});
  mutate('the task without a job',t=>{delete t.timers.aid;});
  mutate('the task on someone else',t=>{t.actors.find(x=>x.id==='marek_zielinski').task='aid';});
  mutate('a carried man nobody carries',t=>{patient(t).carriedBy='marek_zielinski';});
  mutate('a job whose man is not wounded',t=>{patient(t).state='GUARD';});
  mutate('a job whose medic is dead',t=>{medic(t).alive=false;});
  mutate('the carry record of another length',t=>{patient(t).carry.duration=2;});
  mutate('an unknown key in the job',t=>{t.timers.aid.speed=1;});
  mutate('a non-garrison man carried by the medic',t=>{const k=t.actors.find(x=>x.id==='sapper_2');k.carriedBy='leon_dudek';k.carry={phase:'carry',startedAt:1,duration:1.6};});
});

test('the seven lines (dlg_m01_220-226) are said at their nodes, by the right voices, only to a player who is near; a call is anonymous, the medic must be there',()=>{
  const speakers=Object.fromEntries(definition.dialogue.filter(l=>/^dlg_m01_22[0-6]$/.test(l.id)).map(l=>[l.id,l.speaker]));
  assert.deepEqual(speakers,{dlg_m01_220:'generic_rifleman',dlg_m01_221:'generic_rifleman',dlg_m01_222:'generic_rifleman',dlg_m01_223:'leon_dudek',dlg_m01_224:'leon_dudek',dlg_m01_225:'leon_dudek',dlg_m01_226:'leon_dudek'});
  for(const l of definition.dialogue.filter(l=>/^dlg_m01_22[0-6]$/.test(l.id))){assert.match(l.note,/^PL: .+polaco por rever por falante nativo\.$/,`${l.id}: the Polish is flagged for review`);assert.ok(l.text.length<=40,`${l.id}: short`);}
  const said=(s,node,at)=>{s.dialogueQueue.length=0;s.dialogueConsumed.length=0;s.subtitle=null;s.timers.barks=undefined;barkTrigger(s,'aid',{node,point:at});return s.dialogueQueue.map(r=>r.id).concat(s.subtitle?[s.subtitle.id]:[]);};
  const s=fresh(),medic=man(s,AID.medic),near={x:s.player.x+10,y:s.player.y,z:s.player.z},far={x:s.player.x+200,y:s.player.y,z:s.player.z};
  Object.assign(medic,{x:near.x,z:near.z});
  assert.ok(['dlg_m01_220','dlg_m01_221','dlg_m01_222'].includes(said(s,'call',near)[0]),'a call near the player is one of the three');
  assert.deepEqual(said(s,'call',far),[],'a call 200 m away is not heard');
  assert.ok(['dlg_m01_223','dlg_m01_224'].includes(said(s,'arrive',near)[0]));
  assert.deepEqual(said(s,'carry',near),['dlg_m01_225']);assert.deepEqual(said(s,'delivered',near),['dlg_m01_226']);
  assert.deepEqual(said(s,'wave',near),[],'an unknown node says nothing');
  medic.x=s.player.x+300;assert.deepEqual(said(s,'carry',near),[],'Dudek too far from the player: he cannot be heard');
  medic.alive=false;medic.x=near.x;assert.deepEqual(said(s,'delivered',near),[],'a medic who is dead says nothing');
  assert.ok(['dlg_m01_220','dlg_m01_221','dlg_m01_222'].includes(said(s,'call',near)[0]),'but the wounded man still calls');
});

test('the plot is safe: on the golden control route the medic is at the aid post, free, with nobody to tend, long before Bąk is wounded at 06:04',()=>{
  const seen={};
  route(19390901,{onStep:({sim})=>{
    const d=sim.actor('leon_dudek');
    if(!seen.at0600&&sim.battleClock>=seconds('06:00:00')){seen.at0600={task:d.task??null,job:Boolean(sim.timers.aid),dist:dist(d,aidPost(sim))};}
    if(!seen.at0603&&sim.battleClock>=seconds('06:03:30')){seen.at0603={task:d.task??null,job:Boolean(sim.timers.aid),dist:dist(d,aidPost(sim))};}
    if(sim.timers.aid)seen.jobs=(seen.jobs??0)+1;
    for(const a of sim.actors)if(a.group===GARRISON_GROUP&&a.aid?.t!==undefined)seen.treated=(seen.treated??new Set()).add(a.id);
  }});
  assert.equal(seen.at0600.task,null);assert.equal(seen.at0600.job,false);assert.ok(seen.at0600.dist<3,`at 06:00 he is ${seen.at0600.dist.toFixed(1)} m from the aid post`);
  assert.equal(seen.at0603.task,null);assert.ok(seen.at0603.dist<3);
  assert.ok(seen.treated&&seen.treated.size>=1,'at least one wounded man of the garrison was treated on this route');
});
