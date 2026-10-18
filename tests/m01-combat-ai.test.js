import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation,validateM01Snapshot,combatStagePlan} from '../src/game/m01-simulation.js';
import {createDisplayFire,normalizeDisplayProfile,updateDisplayFire} from '../src/game/m01-display-fire.js';
import {compareContinuation,json} from './helpers/m01-determinism.js';
import {eyePosition} from '../src/world/spatial.js';

// Combat AI slice 1 (M01-COMBAT-AI-SLICE-1; docs/direction/COD_WAW_WWII_BENCHMARK.md, «Combate e IA»). The owner's playtest: Germans fire in repeating cycles,
// the allied MGs in looped bursts. These tests drive the real simulation from the arrival of train 963 (the first German shots) with no input.
const GATE=Array.from({length:12},(_,i)=>`de_east_${i+2}`),PLAN=combatStagePlan();
function underFire(seed=11){
  const s=new M01Simulation(seed);s.tick(.05,{skip:true});s.consume('evt_m01_train963_arrives');s.drainEvents();return s;
}
/** Runs `seconds` of game time and returns, per shooter, the clock of every shot or burst start (firedAt changes) and every Kowal burst. */
function shots(s,seconds,onTick=()=>{}){
  const at={},last=new Map(s.actors.map(a=>[a.id,a.firedAt]));
  for(let i=0;i<seconds*20;i++){
    s.player.health=100;s.tick(.05);   // the pilot stands still in the open: keep him alive (a restore would rewind the clock)
    for(const a of s.actors)if(a.firedAt!==last.get(a.id)){(at[a.id]??=[]).push(a.firedAt);last.set(a.id,a.firedAt);}
    onTick(s,s.drainEvents());
  }
  return at;
}
const gaps=ts=>ts.slice(1).map((t,i)=>t-ts[i]);
const cv=xs=>{const m=xs.reduce((a,b)=>a+b,0)/xs.length;return Math.sqrt(xs.reduce((a,b)=>a+(b-m)**2,0)/xs.length)/m;};

test('every German of grp_de_east and Kowal own an AI record with a stream derived from the seed; it is saved, restored and validated',()=>{
  const s=underFire(),ids=s.actors.filter(a=>a.ai).map(a=>a.id).sort();
  assert.deepEqual(ids,[...Array.from({length:40},(_,i)=>`de_east_${i}`),'szymon_kowal'].sort());
  const streams=new Set(s.actors.filter(a=>a.ai).map(a=>a.ai.rng));assert.equal(streams.size,41,'one distinct stream per man');
  assert.deepEqual(new M01Simulation(11).actor('de_east_5').ai,new M01Simulation(11).actor('de_east_5').ai,'derived from the seed only');
  assert.notDeepEqual(new M01Simulation(11).actor('de_east_5').ai.rng,new M01Simulation(12).actor('de_east_5').ai.rng);
  shots(s,30);validateM01Snapshot(s.snapshot());
  const copy=new M01Simulation(1);copy.restoreSnapshot(s.snapshot());assert.deepEqual(copy.snapshot(),s.snapshot());
});

test('gate riflemen peek: 1-3 aimed rounds a bolt apart, standing through the peek, then a longer skewed cover; no fixed cycle',()=>{
  const s=underFire(),seen=new Set();let standing=0,rounds=0;
  // The round leaves from his standing eye (Kowal may pin him down again in the same tick, after the shot: the posture at the end of the tick is not the proof).
  const at=shots(s,600,sim=>{for(const r of sim.enemyFire.rounds){if(seen.has(r.id)||r.kind==='attrition'||!GATE.includes(r.by))continue;seen.add(r.id);rounds++;
    const a=sim.actor(r.by);if(r.ox===a.x&&r.oz===a.z&&r.oy===eyePosition({...a,crouched:false}).y)standing++;}});
  const all=[],inPeek=[],cover=[];
  for(const id of GATE){const g=gaps(at[id]??[]);all.push(...g);
    for(const x of g)(x<2.85?inPeek:cover).push(x);
    if(g.length>=6)assert.ok(cv(g)>.45,`${id} fires in uneven peeks, not a cycle (cv ${cv(g).toFixed(2)})`);}
  assert.ok(all.length>150,`enough shots (${all.length})`);
  assert.ok(inPeek.length>=30,`follow-up rounds inside a peek (${inPeek.length})`);
  assert.ok(inPeek.every(x=>x>=1.7-1e-9),'the bolt is worked between two aimed rounds');
  assert.ok(cover.every(x=>x>=2.85),'a pause between peeks is a real cover');
  assert.ok(cover.some(x=>x>30)&&cover.some(x=>x<8),'cover pauses are skewed, short and long');
  assert.ok(cv(all)>.8,`whole gate line cv ${cv(all).toFixed(2)}`);
  assert.ok(rounds>150);assert.equal(standing,rounds,'every round is fired standing');
});

test('a rifleman reloads his clip in cover: never a round while the reload runs, and he waits for it',()=>{
  const s=underFire(5);let reloads=0;
  shots(s,900,sim=>{for(const id of GATE){const a=sim.actor(id);
    if(a.reload){if(sim.clock-a.reload.startedAt<.05)reloads++;assert.ok(sim.clock-a.firedAt>=0,'no round during the reload');
      assert.ok(a.cooldown>=a.reload.startedAt+a.reload.duration-sim.clock-1e-9||!a.alive||sim.clock<a.suppressedUntil,`${id} waits for his clip`);}}});
  assert.ok(reloads>=3,`clips changed (${reloads})`);
});

test('suppression breaks a peek once per episode, adds a drawn recovery and leaves him shaken (wider aim) for a while',()=>{
  const s=underFire(),a=s.actor('de_east_6');
  Object.assign(a.ai,{peek:2});a.cooldown=1;a.suppressedUntil=s.clock+2;
  const rng=a.ai.rng;s.updateCombat(.05);
  assert.equal(a.ai.peek,0,'peek broken');assert.notEqual(a.ai.rng,rng,'one recovery draw');
  assert.ok(a.ai.recover>=.5&&a.ai.recover<=3);assert.equal(a.ai.pinnedUntil,a.suppressedUntil);
  assert.equal(a.ai.shakenUntil,a.suppressedUntil+a.ai.recover+4);
  assert.ok(Math.abs(a.cooldown-(a.suppressedUntil-s.clock+1.2+a.ai.recover))<1e-9,'down for the suppression, the old 1.2 s and his own recovery');
  const drawn=a.ai.rng,recover=a.ai.recover;a.suppressedUntil+=1;s.updateCombat(.05);
  assert.equal(a.ai.rng,drawn,'an extension of the same suppression draws nothing');assert.equal(a.ai.recover,recover);
  // Shaken: his next round leaves with the wider bias.
  const opts=[];const burst=s.burst.bind(s);s.burst=(who,t,k,o)=>{if(who===a)opts.push(o);return burst(who,t,k,o);};
  a.suppressedUntil=0;a.cooldown=0;a.rounds=5;delete a.reload;s.player.weaponShotAt=-1e9;
  s.aiFire(a,false,()=>true,true);
  assert.deepEqual(opts.at(-1)?.bias,[2.5*1.9,1.6*1.9],'shaken aim');
  a.ai.shakenUntil=0;a.cooldown=0;a.ai.peek=0;s.aiFire(a,false,()=>true,true);assert.deepEqual(opts.at(-1).bias,[2.5,1.6],'steady aim again');
});

test('the player who fires becomes the threat: the gate riflemen who see him answer him more often, without firing more in all',()=>{
  // Count by target kind over a fresh window, with and without the threat.
  const count=threat=>{const s=underFire(3);let player=0,all=0;const burst=s.burst.bind(s);
    s.burst=(a,t,k,o)=>{const ok=burst(a,t,k,o);if(ok&&GATE.includes(a.id)){all++;if(k==='player')player++;}return ok;};
    shots(s,400,sim=>{if(threat)sim.player.weaponShotAt=sim.clock*1000;});return {player,all};};
  const calm=count(false),hot=count(true);
  assert.ok(hot.player>calm.player*1.5,JSON.stringify({calm,hot}));
  assert.ok(hot.all<=calm.all*1.15,'the threat redirects the fire, it does not add to it: '+JSON.stringify({calm,hot}));
});

test('MG34: bursts in groups of 1-3 on one target, 4-7 rounds by target, short pauses inside a group, and it holds while the belt is changed',()=>{
  const s=underFire(9),starts=[],rounds=[];const burst=s.burst.bind(s);
  s.burst=(a,t,k,o)=>{const ok=burst(a,t,k,o);if(ok&&a.id==='de_east_1'){starts.push(s.clock);rounds.push([k,o.rounds]);}return ok;};
  let held=0;
  shots(s,900,sim=>{const a=sim.actor('de_east_1');if(a.mg34Prone?.phase==='reload'){held++;assert.ok(a.mg34Prone.burst===undefined);}});
  const g=gaps(starts),short=g.filter(x=>x<2);
  assert.ok(starts.length>=40,`bursts (${starts.length})`);assert.ok(short.length>=8,`follow-up bursts inside a group (${short.length})`);
  assert.ok(short.every(x=>x>=4*.075+.45-1e-9),'a follow-up waits for the burst and a short pause');
  assert.ok(rounds.every(([k,n])=>n>=4&&n<=7&&(k!=='area'||n<=5)),JSON.stringify(rounds.slice(0,10)));
  assert.ok(cv(g)>.8,`MG34 cadence cv ${cv(g).toFixed(2)}`);
  assert.ok(held>0,'the belt was changed at least once with the gun holding');
});

test('Kowal answers flashes with 2-5 round bursts and an uneven reaction, never a fixed 4 s loop; his magazine never leaves one round',()=>{
  const s=underFire(),bursts=[],times=[];
  shots(s,600,(sim,events)=>{for(const e of events)if(e.type==='npc-shot'&&e.weapon==='rkm_wz28'){bursts.push(e.rounds);times.push(sim.clock);
    const k=sim.actor('szymon_kowal');assert.notEqual(k.rounds,1);assert.ok(k.rounds>=0);}});
  assert.ok(bursts.length>60,`bursts (${bursts.length})`);
  assert.ok(bursts.every(n=>n>=2&&n<=5),JSON.stringify(bursts));assert.ok(new Set(bursts).size>=3,'burst length varies');
  const g=gaps(times),mean=g.reduce((a,b)=>a+b,0)/g.length;
  assert.ok(mean>3.3&&mean<5.2,`mean cycle ${mean.toFixed(2)} s (about the old 4 s, so his suppression share is unchanged)`);
  assert.ok(cv(g)>.2,`cv ${cv(g).toFixed(2)}`);
  const repeated=g.slice(1).filter((x,i)=>Math.abs(x-g[i])<=.05).length/(g.length-1);assert.ok(repeated<.2,`repeat share ${repeated.toFixed(2)}`);
  // T38 posture rule still holds: up over the sandbags only around his own burst.
  const k=s.actor('szymon_kowal'),slot=PLAN.squad.slots.szymon_kowal;assert.ok(Math.hypot(k.x-slot.x,k.z-slot.z)<.5);
});

test('combat AI state continues identically across save/restore, and a save without it migrates without touching the main stream',()=>{
  const s=underFire(13);shots(s,120);
  compareContinuation(s,{label:'combat-ai',ticks:400,doubleAt:[1,150,300]});
  const legacy=json(s.snapshot());for(const a of legacy.actors)delete a.ai;delete legacy.resumeCheckpoint;
  const before=json(legacy),r=new M01Simulation(1);r.restoreSnapshot(legacy);
  assert.deepEqual(legacy,before,'input untouched');assert.equal(r.rng.state,legacy.rng,'no draw from the main stream');
  for(const a of r.actors.filter(a=>a.ai)){assert.equal(a.ai.peek,0);assert.equal(a.ai.pinnedUntil,a.suppressedUntil);}
  assert.deepEqual(r.actors.map(a=>a.cooldown),legacy.actors.map(a=>a.cooldown),'every saved cooldown runs out as saved');
  const twin=new M01Simulation(1);twin.restoreSnapshot(legacy);compareContinuation(twin,{label:'combat-ai-legacy',ticks:200});
  for(const bad of [a=>a.ai.peek=4,a=>a.ai.rng=-1,a=>a.ai.extra=1,a=>a.ai.target=5,a=>a.ai.seen={x:0,y:0,z:0},a=>a.ai.recover=9,a=>{a.ai.shakenUntil=1e9;}]){
    const raw=json(s.snapshot());bad(raw.actors.find(a=>a.id==='de_east_4'));assert.throws(()=>validateM01Snapshot(raw),/IA de combate/);
  }
  const misplaced=json(s.snapshot());misplaced.actors.find(a=>a.id==='marek_zielinski').ai=json(s.actor('de_east_4').ai);
  assert.throws(()=>validateM01Snapshot(misplaced),/IA de combate/,'only the Germans of grp_de_east and Kowal carry it');
});

test('display fire: respondSec answers the flash of the last seconds, followUp makes uneven groups; absent keys keep the old draws',()=>{
  const view=(actors,clock)=>({clock,actors,consumedEvent:()=>true,heightAt:()=>0});
  const men=[{id:'s',group:'g0',alive:true,active:true,x:0,y:0,z:0},...Array.from({length:6},(_,i)=>({id:`t${i}`,group:'g1',alive:true,active:true,x:1000,y:0,z:i*3,firedAt:i===4?95:-1e9}))];
  const p=normalizeDisplayProfile({id:'p',shooters:['s'],weapon:'ckm_wz30',rounds:[5,5],intervalSec:[9,24],targetGroup:'g1',respondSec:10,followUp:[.45,[1.2,2.6]]});
  const d=createDisplayFire(7,[p]);let clock=96;const gapsSeen=[];let lastId=0,last=null;
  for(let i=0;i<20*400;i++){clock+=.05;updateDisplayFire(d,view(men,clock),.05);
    if(d.nextId>lastId){if(clock<=105)assert.ok(d.rounds.at(-1).az>=4*3-3&&d.rounds.at(-1).az<=4*3+3,'laid on the man who fired at 95');
      if(last!==null)gapsSeen.push(clock-last);last=clock;lastId=d.nextId;}}
  assert.ok(gapsSeen.some(x=>x<=2.7)&&gapsSeen.some(x=>x>=9),JSON.stringify(gapsSeen.slice(0,12)));
  for(const bad of [{respondSec:0},{respondSec:61},{followUp:[2,[1,2]]},{followUp:[.5,[2,1]]},{followUp:.5},{respondSec:5,targetGroup:undefined,targetBox:[0,1,0,1]}])
    assert.throws(()=>normalizeDisplayProfile({id:'q',shooters:['s'],weapon:'x',rounds:[1,1],intervalSec:[1,2],targetGroup:'g1',...bad}),/displayFire/,JSON.stringify(bad));
  // Without the new keys a profile draws exactly as before (same rounds from the same seed).
  const plain=normalizeDisplayProfile({id:'p',shooters:['s'],weapon:'ckm_wz30',rounds:[5,5],intervalSec:[9,24],targetGroup:'g1'});
  assert.equal(plain.respondSec,undefined);assert.equal(plain.followUp,undefined);
});
