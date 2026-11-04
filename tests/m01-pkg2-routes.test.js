import test from 'node:test';
import assert from 'node:assert/strict';
import {seconds} from '../src/game/m01-simulation.js';
import {GARRISON_GROUP} from '../src/game/m01-garrison.js';
import {DECK_ASSAULT} from '../src/game/m01-deck-assault.js';
import {route} from './helpers/m01-route.js';

// Package 2 (2026-11-04, golden amendment 21) on the two golden routes (the control route of seed 19390901 and the support pilot of seed 7): the counts the evidence README reports for the 24 audited routes
// (tools/verification/m01-pkg2-metrics.mjs), as properties. State, not a playtest.

function measure(seed,support){
  const m={wounded:new Set(),treated:new Set(),carried:new Set(),laid:new Set(),grenades:0,exploded:0,searches:0,closest:Infinity,playerGrenadeDamage:0,cloudAtBoom:null,at0603:null,calls:0};
  const lastN=new Map();
  const r=route(seed,{support,onStep:({sim,events})=>{
    for(const e of events){
      if(e.type==='enemy-grenade')m.grenades++;
      if(e.type==='m01-blast'&&e.kind==='grenade'&&e.by!==undefined){m.exploded++;const rec=sim.sectors.damage.at(-1);m.cloudAtBoom={id:rec.id,dust:rec.dust,standing:sim.renderState.dust.some(c=>c.id===rec.id)};m.playerDistAtBoom=Math.min(m.playerDistAtBoom??Infinity,Math.hypot(rec.x-sim.player.x,rec.z-sim.player.z));}
      if(e.type==='deck-tactic'&&e.kind==='search')m.searches++;
    }
    for(const a of sim.actors){
      if(a.group!==GARRISON_GROUP)continue;
      if(a.state==='WOUNDED')m.wounded.add(a.id);
      if(a.aid){const n=lastN.get(a.id)??0;if(a.aid.n>n){m.calls+=a.aid.n-n;lastN.set(a.id,a.aid.n);}if(a.aid.t!==undefined)m.treated.add(a.id);if(a.aid.rest!==undefined)m.laid.add(a.id);}
      if(a.carriedBy==='leon_dudek')m.carried.add(a.id);
    }
    if(sim.consumedEvent('evt_m01_germans_on_east_spans')&&!sim.consumedEvent('evt_m01_east_demolition'))
      for(const g of sim.actors)if(g.group==='grp_de_spans'&&g.deck&&g.alive&&g.active&&g.deck.phase!=='clear')for(const p of sim.actors)if(p.team==='ally'&&p.alive&&p.active&&!p.displayOnly&&p.x>0&&p.x<700)m.closest=Math.min(m.closest,Math.hypot(g.x-p.x,g.z-p.z));
    if(m.at0603===null&&sim.battleClock>=seconds('06:03:30')){const d=sim.actor('leon_dudek'),post=sim.world.point('aid_position');m.at0603={task:d.task??null,job:Boolean(sim.timers.aid),dist:Math.hypot(d.x-post.x,d.z-post.z)};}
  }});
  return {m,sim:r.sim};
}

test('the control route: the wounded of the raid are treated and one is carried to cover, the medic is at his post before Bąk, the stick grenade is thrown at 23 m and leaves its cloud, the dust blocks rays',()=>{
  const {m,sim}=measure(19390901,false);
  assert.ok(m.wounded.size>=1,'a bomb wounded at least one man of the garrison');
  assert.equal(m.treated.size,m.wounded.size,'every wounded man was treated');
  assert.ok(m.carried.size>=1&&m.laid.size===m.carried.size,'and a man who lay away from cover was carried and laid');
  assert.ok(m.calls>=3,'they called out');
  assert.deepEqual([m.at0603.task,m.at0603.job],[null,false]);assert.ok(m.at0603.dist<3,`Dudek at the aid post at 06:03:30 (${m.at0603.dist.toFixed(2)} m)`);
  assert.ok(m.grenades>=1&&m.exploded===m.grenades,`${m.grenades} stick grenades thrown, ${m.exploded} exploded`);
  assert.deepEqual(m.cloudAtBoom.dust,{r:4.5,h:3.5,d:1,life:20});assert.equal(m.cloudAtBoom.standing,true,'the cloud stood at the explosion');
  assert.ok(m.closest>=DECK_ASSAULT.tactics.grenade.minM&&m.closest<=DECK_ASSAULT.tactics.grenade.rangeM,`the closest approach to a Pole on the deck, ${m.closest.toFixed(1)} m, is inside the throw`);
  assert.ok(sim.dustRays.blocked>0&&sim.dustRays.blocked<sim.dustRays.checked,`the dust answered "no" to ${sim.dustRays.blocked} of ${sim.dustRays.checked} sight questions that met a cloud`);
  assert.ok(m.playerDistAtBoom>DECK_ASSAULT.tactics.grenade.reachM*5,`the grenade fell ${m.playerDistAtBoom.toFixed(0)} m from the player: nowhere near its woundM (${DECK_ASSAULT.tactics.grenade.woundM} m)`);
  assert.equal(sim.flags['m01.east_platoon_survivors'],12);assert.ok(sim.mission.complete);
});

test('the support route: the same raid is tended and the medic is at his post; the assault does not come within a throw while the player covers the deck (no grenade: the plot of the pilot, not a rule)',()=>{
  const {m,sim}=measure(7,true);
  assert.ok(m.treated.size>=1&&m.treated.size===m.wounded.size);
  assert.deepEqual([m.at0603.task,m.at0603.job],[null,false]);assert.ok(m.at0603.dist<3);
  assert.ok(m.closest>DECK_ASSAULT.tactics.grenade.rangeM,`the support pilot's fire keeps the assault ${m.closest.toFixed(0)} m from the nearest Pole`);
  assert.ok(sim.dustRays.checked>0);
  assert.equal(sim.flags['m01.east_platoon_survivors'],18);assert.ok(sim.mission.complete);
});
