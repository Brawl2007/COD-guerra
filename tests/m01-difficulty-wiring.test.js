// H9 D2 (2026-10-19): the D35 level table is read by the simulation. recruta is today's tuning byte for byte (every multiplier exactly 1, no new saved key: the per-tick
// golden of m01-animation-contract.test.js pins it); soldado and veterano change the damage, the aim, the cadence and the targets of the fire at the player, the burst
// cap F2, the fair-death clamp F1, the regen, the health at a checkpoint and Kowal's pool. Each rule is exercised here on its own; the per-level health over the 24 audit
// routes is measured by tools/verification/m01-difficulty-sweep.mjs (docs/verification/m01-runtime/difficulty-0535-2026-10-19/).
import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation,validateM01Snapshot} from '../src/game/m01-simulation.js';
import {M01_DIFFICULTY,oddsWeight,BURST_GROUP_SEC,F1_TELEGRAPH_GAP_SEC} from '../src/game/m01-difficulty.js';
import {route} from './helpers/m01-route.js';

const STEP=.05;
const fresh=(difficulty='recruta',seed=11)=>{const sim=new M01Simulation(seed,{difficulty});sim.tick(STEP,{skip:true});sim.drainEvents();return sim;};
const round=(sim,by,dt=0,kind='player')=>({by,kind,firedAt:sim.clock+dt});

test('recruta: every derived multiplier is exactly 1 and the old draws keep their thresholds',()=>{
  const R=M01_DIFFICULTY.recruta;
  assert.equal(oddsWeight(R.rifleGateEastThreshold,R.rifleGateEastThreshold),1);assert.equal(oddsWeight(R.spansPickPlayerThreshold,R.spansPickPlayerThreshold),1);
  assert.equal(R.aimErrorScale,1);assert.equal(R.cooldownScale,1);assert.equal(R.woundDamage,8);assert.deepEqual(R.woundChance,{exposed:.2,cover:.06});
  assert.equal(R.coverAdjustSalvoSec,42);assert.equal(R.kowalRounds,30);
  // The re-expressed weights of the other levels: the odds of the old draw against recruta's.
  assert.ok(Math.abs(oddsWeight(M01_DIFFICULTY.soldado.rifleGateEastThreshold,.5)-.35/.65)<1e-12);
  assert.ok(Math.abs(oddsWeight(M01_DIFFICULTY.veterano.spansPickPlayerThreshold,.25)-(M01_DIFFICULTY.veterano.spansPickPlayerThreshold/(1-M01_DIFFICULTY.veterano.spansPickPlayerThreshold))*3)<1e-12);
});

test('a wound: the level damage; recruta writes nothing new, the other levels record the time of the wound; no RNG draw',()=>{
  for(const id of ['recruta','soldado','veterano']){
    const sim=fresh(id),L=M01_DIFFICULTY[id],state=sim.rng.state,keys=Object.keys(sim.timers).sort();
    sim.woundPlayer(round(sim,'de_east_20'));
    assert.equal(sim.player.health,100-L.woundDamage,id);assert.equal(sim.rng.state,state,`${id}: the roll is landRound's, the wound draws nothing`);
    if(id==='recruta')assert.deepEqual(Object.keys(sim.timers).sort(),keys,'recruta: no new timer key');
    else assert.equal(sim.timers.lastHitAt,sim.clock);
    assert.ok(sim.drainEvents().some(e=>e.type==='player-hit'));
    validateM01Snapshot(sim.snapshot());
  }
});

test('burst cap F2: on soldado one MG34 burst wounds at most burstWoundCap times; the next burst wounds again; veterano has no cap',()=>{
  const sim=fresh('soldado'),L=M01_DIFFICULTY.soldado;assert.ok(L.burstWoundCap>=1);
  for(let k=0;k<7;k++)sim.woundPlayer(round(sim,'de_east_0',k*.075));
  assert.equal(sim.player.health,Math.max(1,100-L.burstWoundCap*L.woundDamage),'at most the cap from one burst');
  const before=sim.player.health;sim.woundPlayer(round(sim,'de_east_1',.1));assert.ok(sim.player.health<before||sim.player.health===1,'another gun is another burst');
  const s2=fresh('soldado');s2.woundPlayer(round(s2,'de_east_0',0));s2.woundPlayer(round(s2,'de_east_0',BURST_GROUP_SEC+.3));
  assert.equal(s2.player.health,100-2*L.woundDamage,'two bursts of the same gun are two bursts');
  const v=fresh('veterano'),V=M01_DIFFICULTY.veterano;assert.equal(V.burstWoundCap,null);
  v.player.health=100;for(let k=0;k<3;k++)v.woundPlayer(round(v,'de_east_0',k*.075));
  assert.equal(v.player.health,Math.max(1,100-3*V.woundDamage),'veterano: no cap (F1 alone keeps the first burst from killing)');
});

test('fair death F1: a lethal wound needs the same shooter engaging the player for reactionGraceSec, with no gap over 6 s; else health stays at 1',()=>{
  for(const id of ['soldado','veterano']){
    const L=M01_DIFFICULTY[id],a={id:'de_east_20',team:'enemy'};
    // No engagement at all (a round aimed elsewhere that struck him): clamped.
    let sim=fresh(id);sim.player.health=L.woundDamage;sim.woundPlayer(round(sim,'de_east_20',0,'platoon'));
    assert.equal(sim.player.health,1,`${id}: no telegraph, no death`);assert.equal(sim.player.alive,true);
    // His first round at the player is the telegraph: it cannot kill.
    sim=fresh(id);sim.player.health=L.woundDamage;sim.noteTelegraph(a,'player',1,.075);sim.woundPlayer(round(sim,a.id));
    assert.equal(sim.player.health,1,`${id}: the first round never kills`);
    // Engaged for longer than the grace: the wound kills.
    sim=fresh(id);sim.noteTelegraph(a,'player',1,.075);sim.clock+=L.reactionGraceSec+.2;sim.noteTelegraph(a,'player',1,.075);
    sim.player.health=L.woundDamage;sim.woundPlayer(round(sim,a.id));assert.equal(sim.player.health,0,`${id}: engaged >= grace, lethal`);assert.equal(sim.player.alive,false);
    // A gap of more than 6 s breaks the engagement: the next round is a first round again.
    sim=fresh(id);sim.noteTelegraph(a,'player',1,.075);sim.clock+=F1_TELEGRAPH_GAP_SEC+1;sim.noteTelegraph(a,'player',1,.075);
    sim.player.health=L.woundDamage;sim.woundPlayer(round(sim,a.id));assert.equal(sim.player.health,1,`${id}: a stale telegraph does not count`);
    // Another shooter's engagement does not license this one.
    sim=fresh(id);sim.noteTelegraph({id:'de_east_21',team:'enemy'},'player',1,.075);sim.clock+=3;sim.player.health=L.woundDamage;sim.woundPlayer(round(sim,a.id));
    assert.equal(sim.player.health,1,`${id}: the same shooter`);
    validateM01Snapshot(sim.snapshot());
  }
  const r=fresh('recruta');r.noteTelegraph({id:'de_east_20',team:'enemy'},'player',1,.075);assert.equal(r.timers.telegraph,undefined,'recruta records no telegraph');
  r.player.health=8;r.woundPlayer(round(r,'de_east_20'));assert.equal(r.player.health,0,'recruta: no fair-death rule, as before');
});

test('regen: soldado heals healing.ratePerSec after healing.afterUnhitSec without a wound; recruta and veterano never heal',()=>{
  for(const id of ['recruta','soldado','veterano']){
    const sim=fresh(id),h=M01_DIFFICULTY[id].healing;sim.player.health=50;if(id!=='recruta')sim.timers.lastHitAt=sim.clock;
    const ticks=n=>{for(let i=0;i<n;i++)sim.tick(STEP,{});};
    ticks(Math.round(((h?.afterUnhitSec??8)-.5)/STEP));assert.equal(sim.player.health,50,`${id}: nothing before the delay`);
    ticks(Math.round(1.5/STEP));
    if(h)assert.ok(Math.abs(sim.player.health-(50+h.ratePerSec*1))<=h.ratePerSec*STEP+1e-9,`${id}: +${h.ratePerSec}/s (${sim.player.health})`);else assert.equal(sim.player.health,50,id);
    validateM01Snapshot(sim.snapshot());
  }
});

test('checkpoint health: soldado and veterano save (and so restore) a checkpoint at full health; recruta keeps the health it has',()=>{
  for(const id of ['recruta','soldado','veterano']){
    const sim=fresh(id);sim.player.health=40;sim.saveCheckpoint('cp_m01_b_reorganizacao');
    const want=M01_DIFFICULTY[id].hpOnCheckpoint??40;assert.equal(sim.checkpoint.player.health,want,id);
    sim.player.health=12;sim.restoreCheckpoint();assert.equal(sim.player.health,want,`${id}: restored`);
  }
});

test('Kowal pool: the level\'s pool in a new game, in the validator and in the section-ammo identity; a legacy save stays recruta (30)',()=>{
  for(const id of ['recruta','soldado','veterano']){
    const sim=fresh(id),pool=M01_DIFFICULTY[id].kowalRounds;assert.equal(sim.timers.kowalRounds,pool,id);
    const s=sim.snapshot();validateM01Snapshot(s);
    const over=structuredClone(s);over.timers.kowalRounds=pool+1;assert.throws(()=>validateM01Snapshot(over),/kowalRounds|munição/,id);
    const absent=structuredClone(s);delete absent.timers.kowalRounds;validateM01Snapshot(absent);
    const back=new M01Simulation(3);back.restoreSnapshot(absent);assert.equal(back.timers.kowalRounds,pool,`${id}: an absent pool restores as the level's`);
  }
  const legacy=fresh('recruta').snapshot();assert.equal(legacy.difficulty,undefined);const r=new M01Simulation(1,{difficulty:'veterano'});r.restoreSnapshot(legacy);
  assert.equal(r.difficulty,'recruta','absent means recruta');assert.equal(r.timers.kowalRounds,30);
  const recrutaWithState=structuredClone(legacy);recrutaWithState.timers.lastHitAt=0;assert.throws(()=>validateM01Snapshot(recrutaWithState),/recruta/);
});

test('aim error: the level scales the dispersion of rounds aimed at the player (player/cover) only, with the same draws',()=>{
  const offset=(id,kind)=>{
    const sim=fresh(id,5),a=sim.actor('de_east_20'),p=sim.player,before=sim.rng.state;
    sim.burst(a,p,kind,{rounds:1,bias:[2.5,1.6],cone:[0,0]});const r=sim.enemyFire.rounds.at(-1),R=Math.hypot(r.ax-r.ox,r.az-r.oz);
    return {lateral:Math.hypot(r.ax-p.x,r.az-p.z),vertical:r.ay,draws:before,R};
  };
  for(const id of ['soldado','veterano']){
    const base=offset('recruta','player'),lvl=offset(id,'player'),k=M01_DIFFICULTY[id].aimErrorScale;
    assert.ok(Math.abs(lvl.lateral-k*base.lateral)<1e-6*base.R,`${id}: lateral x${k}`);
    const e0=offset('recruta','repair'),e1=offset(id,'repair');assert.equal(e1.lateral,e0.lateral,`${id}: repair fire keeps its aim`);
  }
});

test('the 05:35 fill: a dike rifleman who sees the player at the deck post (hold_access, the withdrawal) may pick him; nowhere else',()=>{
  const sim=fresh('recruta',9),dike=sim.actor('de_east_16'),sees=()=>true;
  dike.ai.target=null;
  const picks=(at,objective)=>{
    for(const o of ['hold_access','cover_withdrawal'])sim.objectives[`obj_m01_${o}`].state=o===objective?'active':'pending';
    Object.assign(sim.player,at);let n=0;
    for(let i=0;i<200;i++){dike.ai.target=null;const p=sim.aiTarget(dike,objective==='cover_withdrawal',sees,true,false);if(p.kind==='player')n++;}
    return n;
  };
  const onDeck={x:30,y:sim.world.heightAt(30,40),z:40},sandbags={x:-28,y:sim.world.heightAt(-28,28),z:28};
  assert.ok(picks(onDeck,'hold_access')>40,'held deck, 05:30-06:00: he takes the player');
  assert.equal(picks(sandbags,'hold_access'),0,'off the deck post: the east bridgehead only, as before');
  assert.equal(picks(onDeck,null),0,'outside hold_access and the withdrawal: as before');
});

test('the 05:35 fill: on the control route no stretch from train 963 to the east demolition is longer than 60 s without a round near the player',()=>{
  // Contact as in tools/verification/m01-combat-ai-metrics.mjs: an enemy round landing within 25 m of the player or cracking past him. Before the fill: 131.5 s from 05:34:54.
  let start=null,end=null;const at=[];
  route(19390901,{onStep:({sim,events})=>{
    if(start===null&&sim.consumedEvent('evt_m01_train963_arrives'))start=sim.clock;
    if(start!==null&&end===null&&sim.consumedEvent('evt_m01_east_demolition'))end=sim.clock;
    if(start!==null&&end===null)for(const e of events)if(e.type==='round-impact'&&(e.crack||e.distance<=25))at.push(sim.clock);
  }});
  const pts=[start,...at,end];let longest=0,from=null;for(let i=1;i<pts.length;i++)if(pts[i]-pts[i-1]>longest){longest=pts[i]-pts[i-1];from=pts[i-1];}
  assert.ok(longest<=60,`longest stretch without contact ${longest.toFixed(1)} s from ${from?.toFixed(1)} s`);
});
