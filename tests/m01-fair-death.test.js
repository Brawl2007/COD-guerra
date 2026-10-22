// Unit fixtures isolate the warning policy. Full route audits use the real world and controls without LOS stubs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation,validateM01Snapshot} from '../src/game/m01-simulation.js';
import {makeRound,validRound} from '../src/game/m01-fire.js';
import {route} from './helpers/m01-route.js';
const fresh=id=>{const s=new M01Simulation(19390901,{difficulty:id});s.tick(.05,{skip:true});s.drainEvents();return s;};
const by='de_east_20';
function wound(s){s.player.health=s.level.woundDamage;const rng=s.rng.state;s.woundPlayer({by,kind:'player',firedAt:s.clock});assert.equal(s.rng.state,rng);return s.drainEvents();}
function cue(s){s.noteTelegraph(s.actor(by),'player',1,0);s.noteDangerCue(s.actor(by),'player','flash');s.clock+=s.level.reactionGraceSec+.1;s.noteTelegraph(s.actor(by),'player',1,0);s.noteDangerCue(s.actor(by),'player','flash');}
for(const id of ['soldado','veterano']){
 test(`${id}: a legacy engagement is readable but cannot license a lethal wound; an actual fresh cue starts a new grace`,()=>{
  const s=fresh(id);s.clock+=3;s.timers.telegraph={[by]:{first:0,last:s.clock}};validateM01Snapshot(s.snapshot());
  const copy=new M01Simulation();copy.restoreSnapshot(s.snapshot());assert.deepEqual(copy.timers.telegraph,s.timers.telegraph);
  assert.equal(wound(s).some(e=>e.type==='player-down'),false);assert.equal(s.player.health,1);
  s.clock+=.6;s.noteTelegraph(s.actor(by),'player',7,.075);assert.equal(s.timers.telegraph[by].cue,undefined,'planned timing alone is never a cue');s.noteDangerCue(s.actor(by),'player','flash');assert.equal(s.timers.telegraph[by].cue.last,s.clock,'an actual cue is never future-dated');
  assert.equal(wound(s).some(e=>e.type==='player-down'),false,'the new cue must give its own full grace');
 });
 test(`${id}: a stale cue cannot kill even if no later burst ran the pruning loop`,()=>{
  const s=fresh(id);cue(s);s.clock+=6.01;assert.ok(s.timers.telegraph[by]);assert.equal(wound(s).some(e=>e.type==='player-down'),false);assert.equal(s.player.alive,true);
 });
 test(`${id}: every cinematic scene blocks a fatal combat round without consuming RNG`,()=>{
  for(const def of new M01Simulation().definition.cutscenes){
   const s=new M01Simulation(19390901,{difficulty:id});if(def.id!=='cs_m01_intro'){s.tick(.05,{skip:true});s.startScene(def.id);}cue(s);
   assert.equal(s.scene.id,def.id);assert.equal(wound(s).some(e=>e.type==='player-down'),false,def.id);assert.equal(s.player.health,1);assert.equal(s.player.alive,true);
  }
 });
 test(`${id}: a real grenade blast cannot kill during the order scene`,()=>{
  const s=fresh(id),p=s.player;s.startScene('cs_m01_order');s.player.health=1;s.grenades.active.push({id:'m01_grenade_unit',space:'metres',x:p.x,y:p.y+.9,z:p.z,vx:0,vy:0,vz:0,fuse:0});
  const rng=s.rng.state;s.updateGrenades(.05,false);assert.equal(s.player.health,1);assert.equal(s.player.alive,true);assert.equal(s.drainEvents().some(e=>e.type==='player-down'),false);assert.equal(s.rng.state,rng);
 });
 test(`${id}: rifle fire emits the existing event, but only a visible actual shot becomes a cue`,()=>{
  const s=fresh(id),a=s.actor(by);a.active=true;s.world.lineOfSight=()=>false;
  assert.equal(s.burst(a,s.player,'player',{rounds:1,bias:[0,0],cone:[0,0]}),true);assert.equal(s.drainEvents().filter(e=>e.type==='enemy-fire').length,1);assert.equal(s.timers.telegraph[by].cue,undefined);
  s.clock+=.1;s.world.lineOfSight=()=>true;s.burst(a,s.player,'player',{rounds:1,bias:[0,0],cone:[0,0]});
  assert.deepEqual(s.timers.telegraph[by].cue,{first:s.clock,last:s.clock,kind:'flash'});
  const r=s.enemyFire.rounds.at(-1),before=structuredClone(s.timers.telegraph);s.noticeFiredRound(a,{...r,firedAt:s.clock+1});assert.deepEqual(s.timers.telegraph,before,'future plans are not warnings');
  const base=fresh('recruta'),b=base.actor(by);b.active=true;base.world.lineOfSight=()=>true;
  for(let i=0;i<2;i++)base.burst(b,base.player,'player',{rounds:1,bias:[0,0],cone:[0,0]});assert.equal(s.rng.state,base.rng.state,'the two actual shots use the old draws only');
 });
 test(`${id}: a planned MG burst adds no warning until its actual visible shots; suppression cancels future cues`,()=>{
  const s=fresh(id),a=s.actor('de_east_0');a.active=true;s.updateMG34Posture(a);s.clock+=1.9;s.updateMG34Posture(a);assert.equal(a.mg34Prone.phase,'idle');s.world.lineOfSight=()=>false;
  assert.equal(s.burst(a,s.player,'player',{rounds:7,bias:[0,0],cone:[0,0],tracer:true}),true);const start=s.clock,rng=s.rng.state;
  assert.equal(a.mg34Prone.burst.plan.length,7);assert.equal(s.enemyFire.rounds.length,1);assert.equal(s.timers.telegraph[a.id].cue,undefined);
  s.world.lineOfSight=()=>true;s.clock=start+.076;s.emitMG34Rounds(a);assert.equal(s.enemyFire.rounds.length,2);assert.deepEqual(s.timers.telegraph[a.id].cue,{first:s.clock,last:s.clock,kind:'tracer'});
  s.world.lineOfSight=()=>false;s.clock=start+.151;s.emitMG34Rounds(a);assert.equal(s.timers.telegraph[a.id].cue.last,start+.076);
  a.suppressedUntil=s.clock+5;s.updateMG34Posture(a);s.clock=start+.6;s.emitMG34Rounds(a);assert.equal(s.enemyFire.rounds.length,3);assert.equal(s.timers.telegraph[a.id].cue.last,start+.076);assert.equal(s.rng.state,rng);
 });
 test(`${id}: an isolated real near-miss trajectory emits crack and records that source with no additional draw`,()=>{
  const s=fresh(id);Object.assign(s.player,{x:1210,y:99.1,z:-2});
  const r=makeRound({id:'m01_round_0',by,weapon:'kar98k',kind:'squad',origin:{x:1200,y:100,z:0},aim:{x:1220,y:100,z:0},firedAt:s.clock,bias:[0,0],cone:[0,0],gauss:()=>0});assert.equal(validRound(r,s.clock),true);
  s.noteTelegraph(s.actor(by),'player',1,0);const rng=s.rng.state;s.landRound(r);const impact=s.drainEvents().find(e=>e.type==='round-impact');assert.equal(impact.crack,true);assert.equal(impact.by,by);assert.equal(impact.pass,'crack');
  assert.deepEqual(s.timers.telegraph[by].cue,{first:s.clock,last:s.clock,kind:'crack'});assert.equal(s.rng.state,rng);
 });
 test(`${id}: cue records round-trip, while invented, future or extra cue fields fail atomically`,()=>{
  const s=fresh(id);cue(s);const saved=s.snapshot(),restored=new M01Simulation();restored.restoreSnapshot(saved);assert.deepEqual(restored.snapshot(),saved);
  for(const bad of [{kind:'imaginary'},{last:s.clock+.01},{first:-1},{extra:true}]){
   const copy=structuredClone(saved);Object.assign(copy.timers.telegraph[by].cue,bad);const target=fresh('recruta'),before=target.snapshot();assert.equal(target.loadCheckpoint(JSON.stringify(copy)).ok,false);assert.deepEqual(target.snapshot(),before);
  }
 });
}
test('Recruta keeps its original lethal behavior during scenes and has no cue record',()=>{
 const s=fresh('recruta');s.startScene('cs_m01_order');s.noteTelegraph(s.actor(by),'player',1,0);assert.equal(s.timers.telegraph,undefined);
 assert.equal(wound(s).filter(e=>e.type==='player-down').length,1);assert.equal(s.player.alive,false);
});

test('D4 retains D2 first-targeted-burst protection even when a real earlier cue exists',()=>{
 const s=fresh('veterano');s.clock=346.05;s.timers.telegraph={[by]:{first:344.15,last:344.15,cue:{kind:'flash',first:341.7,last:344.15}}};s.player.health=16.15;const rng=s.rng.state;
 s.woundPlayer({by,kind:'player',firedAt:344.15});assert.equal(s.player.health,1);assert.equal(s.player.alive,true);assert.equal(s.rng.state,rng);assert.equal(s.drainEvents().some(e=>e.type==='player-down'),false);
});
test('the real published D3 danger save restores intact without inventing actual cue evidence',async()=>{
 const {default:legacy}=await import('./fixtures/m01-d3-legacy-danger-save.json',{with:{type:'json'}});
 const expected=structuredClone(legacy);delete expected.resumeCheckpoint;assert.ok(Object.keys(expected.timers.telegraph).length);
 const s=fresh('recruta');assert.equal(s.loadCheckpoint(JSON.stringify(legacy)).ok,true);assert.equal(s.difficulty,'soldado');assert.deepEqual(s.snapshot(false),expected);
 assert.ok(Object.values(s.timers.telegraph).every(e=>!('cue'in e)),'restoring historical engagement is not an observed warning');
});

test('Veterano seed 2 with support completes its real route after preserving D2 protection',()=>{
 class Level extends M01Simulation{constructor(seed){super(seed,{difficulty:'veterano'});}}
 const {sim}=route(2,{support:true,Simulation:Level});assert.equal(sim.mission.complete,true);assert.equal(sim.player.alive,true);assert.equal(sim.difficulty,'veterano');
});
