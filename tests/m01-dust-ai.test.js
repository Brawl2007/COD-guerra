import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {dustSpec,dustClouds} from '../src/game/m01-dust.js';
import {P,T,dist,station,pair,scene,eventsOf} from './helpers/m01-deck-scene.js';

// Package 2 (2026-11-04, golden amendment 21): what the dust does to the AI. The cloud is the simulation's; sees() is the question every acquisition asks; a Pole the dust hides is not a target, and a German
// who has none in sight bounds forward to see where he last saw one (the search of R2-b, which had no way to start on an open deck where every Pole stands in a line); the stick grenade leaves a cloud at the Pole.

const calm=s=>{for(const a of pair(s)){a.rounds=0;a.suppressedUntil=0;}};
const tactic=(evs,kind)=>evs.filter(e=>e.type==='deck-tactic'&&(!kind||e.kind===kind));
const cloudAt=(s,x,z,{age=2,id='m01_grenade_90'}={})=>s.sectors.damage.push({id,x,y:s.world.heightAt(x,z),z,started:s.clock-age,soundAt:s.clock-age,smokeSeconds:20,dust:dustSpec('grenade')});

/** A man of the assault in cover at station 17 (x 606) on the control route's deck, Pawlak 86 m west of him and the voice of the platoon 220 m farther on the same deck, so that the cloud on Pawlak hides both; the player is off the map. */
function veiledScene({cloud=true,seenAgo=5}={}){
  const {s}=scene();calm(s);
  const [pawlak,voice]=pair(s);
  Object.assign(pawlak,{x:520,z:41.2,crouched:false,active:true,alive:true,state:'GUARD'});pawlak.y=s.world.heightAt(pawlak.x,pawlak.z);
  Object.assign(voice,{x:300,z:41.2,crouched:false,active:true,alive:true,state:'GUARD'});voice.y=s.world.heightAt(voice.x,voice.z);
  s.player.x=1300;s.player.z=0;   // east of the map: not the playable area, so not a target
  const man=station(s,'de_spans_4',17,{phase:'cover',since:2,until:s.clock+30,cooldown:0});
  man.ai.seen={x:pawlak.x,y:pawlak.y+1,z:pawlak.z,at:s.clock-seenAgo,who:'staszek_pawlak'};
  if(cloud)cloudAt(s,pawlak.x,pawlak.z);
  return {s,man,pawlak,voice};
}

test('a Pole the dust hides is not a target; the man who has none in sight bounds forward to see where he last saw one, instead of firing at the place',()=>{
  const {s,man,pawlak,voice}=veiledScene();
  assert.equal(s.world.lineOfSight(man,pawlak),true,'the deck is open: it is the dust that hides him');assert.equal(s.sees(man,pawlak),false);assert.equal(s.sees(man,voice),false,'and the voice behind him on the same deck');
  const seen0={...man.ai.seen},fired=man.firedAt,node=man.deck.node;
  s.deckFire(man,false);
  assert.equal(man.deck.node,node+1,'he bounds one station forward');assert.equal(man.deck.phase,'advance');assert.equal(man.firedAt,fired,'and has not fired');
  assert.deepEqual(tactic(s.drainEvents(),'search').map(e=>[e.by,e.line]),[['de_spans_4',0]]);
  assert.deepEqual(man.ai.seen,seen0,'his sighting is the place where he last saw a Pole: the dust did not refresh it');
  // the same scene with the air clear: he sees them, fires, and stays
  const c=veiledScene({cloud:false});
  c.s.deckFire(c.man,false);
  assert.equal(c.man.deck.node,17);assert.equal(c.man.deck.phase,'cover');assert.ok(c.man.firedAt>-1e8,'he fired');
  assert.equal(tactic(c.s.drainEvents(),'search').length,0);assert.ok(c.man.ai.seen.at>=c.s.clock-1e-9,'and his sighting is fresh');
});

test('the search needs the memory, the cover and the room of R2-b still: not before afterSec, not after memorySec, not from a run or at his limit; and not for the overwatch',()=>{
  for(const [ago,ok] of [[T.search.afterSec-.1,false],[T.search.afterSec,true],[T.search.memorySec,true],[T.search.memorySec+.1,false]]){
    const {s,man}=veiledScene({seenAgo:ago});s.deckFire(man,false);assert.equal(man.deck.node===18,ok,`seen ${ago} s ago`);
  }
  {const {s,man}=veiledScene();man.deck.phase='advance';s.deckFire(man,false);assert.equal(tactic(s.drainEvents(),'search').length,0,'not while running');}
  {const {s,man}=veiledScene();const limit=P.lines[0][0];station(s,'de_spans_4',limit,{phase:'cover',since:2,until:s.clock+30,cooldown:0});s.deckFire(man,false);assert.equal(man.deck.node,limit,'at his limit there is no station to go to');}
  {const {s}=veiledScene();const over=s.actor('de_spans_0');Object.assign(over,{x:926,z:38.16});over.deck.phase='clear';over.cooldown=0;over.rounds=5;over.ai.seen={x:520,y:0,z:41.2,at:s.clock-5,who:'staszek_pawlak'};
    const node=over.deck.node;s.deckFire(over,false);assert.equal(over.deck.node,node);assert.equal(tactic(s.drainEvents(),'search').length,0);}
});

test('the dust hides a Pole only while it stands: when the smoke is gone the man sees him again, fires and stays',()=>{
  const {s,man,pawlak}=veiledScene();
  s.clock=s.sectors.damage.at(-1).started+19.5;man.ai.seen.at=s.clock-5;   // the grenade's smoke is in its last half second
  assert.equal(s.sees(man,pawlak),true);
  s.deckFire(man,false);assert.equal(man.deck.node,17);
});

test('the Poles are hidden by the dust in the same way: the section\'s riflemen do not see a German through a cloud',()=>{
  const {s}=scene();calm(s);
  const [pawlak]=pair(s);Object.assign(pawlak,{x:300,z:41.2,crouched:false,active:true,alive:true,state:'GUARD'});pawlak.y=s.world.heightAt(300,41.2);
  const t=s.actor('de_spans_4');Object.assign(t,{x:380,z:41.2,alive:true,active:true,state:'GUARD'});t.y=s.world.heightAt(380,41.2);
  assert.equal(s.sees(pawlak,t),true);
  cloudAt(s,340,41.2,{age:2});
  assert.equal(s.world.lineOfSight(pawlak,t),true);assert.equal(s.sees(pawlak,t),false,'a grenade\'s smoke between them: neither sees the other');assert.equal(s.sees(t,pawlak),false);
});

test('the searching fire of a gate MG34 goes where the player was last seen when the dust hides him, as it does when he steps out of sight',()=>{
  const s=new M01Simulation(19390901);s.tick(.05,{skip:true});s.drainEvents();
  const mg=s.actor('de_east_0');mg.active=true;s.actor('szymon_kowal').active=false;
  // the world is open between the gun and the player (a stub of the geometry; the dust is what is tested)
  s.world.lineOfSight=()=>true;
  const p=s.player;Object.assign(p,{x:-100,z:27});p.y=s.world.heightAt(p.x,p.z);
  const pick=()=>s.aiTarget(mg,false,t=>s.sees(mg,t),true,false);
  const open=pick();assert.equal(open.kind,'player');assert.equal(mg.ai.seen.who,'player');
  const seenAt={...mg.ai.seen};
  cloudAt(s,p.x+10,p.z,{age:2,id:'raid_test'});s.sectors.damage.at(-1).dust=dustSpec('bomb');   // a bomb's cloud over the road approach, between the gun and him
  s.clock+=1;
  assert.equal(s.sees(mg,p),false);
  const hidden=pick();
  assert.equal(hidden.kind,'area','no sight: searching fire');assert.equal(hidden.roundKind,'player','its rounds are the player\'s kind (the level\'s aim error applies)');
  assert.deepEqual([hidden.target.x,hidden.target.z],[seenAt.x,seenAt.z],'where he was last seen');
});

test('a German stick grenade leaves a cloud at the Pole it falls on: the explosion of germanGrenadeBlast is a blast that records its dust',()=>{
  const {s,man,pawlak}=veiledScene({cloud:false});
  s.grenades.active.push({id:'m01_grenade_77',x:pawlak.x,y:s.world.heightAt(pawlak.x,pawlak.z)+.1,z:pawlak.z,vx:0,vy:0,vz:0,fuse:.02,by:'de_spans_4',at:s.clock-3.8});
  s.updateGrenades(.05,false);
  const record=s.sectors.damage.find(d=>d.id==='m01_grenade_77');
  assert.ok(record,'the crater is recorded');assert.deepEqual(record.dust,dustSpec('grenade'));assert.equal(record.smokeSeconds,20);
  s.clock=record.started+3;
  assert.equal(dustClouds(s.sectors.damage,s.clock).filter(c=>c.id==='m01_grenade_77').length,1);
  assert.equal(s.sees(man,pawlak),false,'and the Pole it fell on is hidden from the thrower');
  s.clock=record.started+21;assert.equal(s.sees(man,pawlak),true,'until the smoke is gone');
});
