// Golden amendment 22 (2026-11-05): the German search in the REAL fight of the control golden route (seed 19390901), plot and determinism.
// The routes never make a German search by themselves (README of docs/verification/m01-runtime/act1-amend22-2026-11-05: 7 asks in 24 routes, all on the man's deepest line). What they cannot show is what the search does when its cause
// comes while the squad is still on its way, so this test brings the cause: the cloud a stick grenade leaves (r 4.5 m, 20 s: dustSpec('grenade')) falls on the Polish rearguard the first time a man of the assault holds a line that is not
// his deepest. The men who are then in cover on the way to their lines (the search of R2-b) bound toward the place; the man who holds his line (the hold search of amendment 22) is exercised on constructed scenes
// (tests/m01-german-ai-tactics.test.js, tests/m01-dust-ai.test.js): in this scene his memory of the Poles has run out by his next trigger.
// It is a forced scene on the real route, not a claim that the game does it: the same tick on every run, no draw, the record a grenade's cloud leaves.
import test from 'node:test';
import assert from 'node:assert/strict';
import definition from '../missions/m01-tczew/mission.json' with {type:'json'};
import {M01Simulation,seconds} from '../src/game/m01-simulation.js';
import {deckLines,deckLineNumber,deckRole} from '../src/game/m01-deck-assault.js';
import {dustSpec} from '../src/game/m01-dust.js';
import {route} from './helpers/m01-route.js';

const ENTRY='evt_m01_germans_on_east_spans';
function run({force}){
  const searches=[],asks=[];let forcedAt=null;
  class Probe extends M01Simulation{
    deckSearch(a){const phase=a.deck.phase,line=deckLineNumber(a),deepest=line===deckLines(a).length-1,r=super.deckSearch(a);asks.push({by:a.id,phase,line,deepest,result:r});return r;}
  }
  const result=route(19390901,{support:false,Simulation:Probe,onStep:({sim,events})=>{
    for(const e of events)if(e.type==='deck-tactic'&&e.kind==='search')searches.push({...e});
    if(force&&forcedAt===null&&sim.consumedEvent(ENTRY)){
      const holder=sim.actors.find(a=>a.group==='grp_de_spans'&&a.deck&&deckRole(a)==='assault'&&a.alive&&a.active&&a.deck.phase==='hold'&&deckLineNumber(a)<deckLines(a).length-1);
      const rear=sim.deckDefenders().filter(b=>b.id.startsWith('pl_east_'));
      if(holder&&rear.length){
        const x=Math.max(...rear.map(b=>b.x)),z=38.7;
        sim.sectors.damage.push({id:'m01_grenade_91',x,y:sim.world.heightAt(x,z),z,started:sim.clock,soundAt:sim.clock,smokeSeconds:20,dust:dustSpec('grenade')});
        forcedAt=sim.clock;
      }
    }
  }});
  return {sim:result.sim,searches,asks,forcedAt};
}
const plot=sim=>({complete:sim.mission.complete,battleClock:sim.battleClock,checkpoints:[...sim.checkpointsReached],survivors:sim.flags['m01.east_platoon_survivors'],
  objectives:Object.fromEntries(Object.entries(sim.objectives).map(([id,o])=>[id,o.state])),consumed:Object.keys(sim.consumed).sort(),
  flags:Object.fromEntries(Object.entries(sim.flags).filter(([k])=>k!=='m01.suggested_cover').sort())});

test('a cloud over the Poles while a man holds a line that is not his deepest: the men on their way search, nobody searches from his deepest line, the plot is the unforced route\'s, nobody essential falls, and two runs are the same run',()=>{
  const plain=run({force:false}),a=run({force:true}),b=run({force:true});
  // the route alone never searches (that is what the amendment measured); the scene makes it
  assert.deepEqual(plain.searches,[],'the unforced golden route makes no search');assert.equal(plain.asks.length,0,'and no man asks for one');
  assert.ok(a.forcedAt!==null,'a man held a line that was not his deepest while the Poles held the deck');
  assert.ok(a.searches.length>=2,`searches ${a.searches.length}`);
  assert.ok(a.searches.every(e=>/^de_spans_[4-9]$/.test(e.by)),'by men of the assault, never the overwatch');
  assert.ok(a.asks.filter(x=>x.result).every(x=>x.phase==='cover'||x.phase==='hold'),'from cover or from a hold');
  assert.ok(a.asks.some(x=>x.phase==='cover'&&x.result),'men in cover on the way to their lines bounded toward the place');
  assert.ok(a.asks.filter(x=>x.deepest).every(x=>!x.result),'nobody searched from his deepest line');
  assert.ok(a.searches.every(e=>e.at>=a.forcedAt),'no search before the cloud');
  // the plot: the same 12 objectives, CP-A..D, 07:05, the consumed events, the flags and the survivors as the unforced route
  assert.deepEqual(plot(a.sim),plot(plain.sim));assert.equal(a.sim.mission.complete,true);assert.equal(a.sim.battleClock,seconds('07:05:00'));assert.equal(a.sim.checkpointsReached.length,4);
  assert.equal(a.sim.flags['m01.east_platoon_survivors'],12);
  for(const c of definition.cast.filter(c=>c.essential)){const m=a.sim.actor(c.id);assert.ok(m.alive,`${c.id} is alive at the end`);}
  assert.ok(a.sim.player.alive!==false&&a.sim.player.health>0,'and the player');
  // determinism: the forced scene twice is the same fight, tick for tick at its end (events and the whole state)
  assert.deepEqual(a.searches,b.searches);assert.deepEqual(a.asks,b.asks);assert.equal(a.forcedAt,b.forcedAt);
  assert.equal(JSON.stringify(a.sim.snapshot(false)),JSON.stringify(b.sim.snapshot(false)));
});
