import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {m02VisualActor} from '../src/render/m02-presentation.js';
import {m02CharacterSample} from '../src/render/m02-character-adapter.js';
import {m02ClearIncapableGrenadeThreat} from '../src/game/m02-grenade-awareness.js';

function setup(side='ally'){
 const sim=new M02BenchSimulation();sim.enterAreaBC06();
 const actor=side==='ally'?sim.allies.find(a=>a.id==='pl_gruca'):sim.enemies.find(a=>a.id==='DE-B01');
 sim.allies=side==='ally'?[actor]:[];sim.enemies=side==='enemy'?[actor]:[];
 Object.assign(sim.player,{x:0,y:0,z:100,angle:0});
 Object.assign(actor,{x:4,y:0,z:100,facing:Math.PI,state:'ACTIVE',goal:null,mag:0,reserve:5,reloadingUntil:sim.clock+2});
 sim.drainEvents();sim.throwGrenade({x:0,y:1.4,z:100},{x:1,y:0,z:0});
 return {sim,actor};
}

function preparePlayerThrow(sim){
 sim.tick(.05,{grenade:true});for(let i=0;i<9;i++)sim.tick(.05,{});
 assert.ok(sim.playerGrenadeAction);assert.equal(sim.grenades.length,0);
}
function releasePlayerThrow(sim){preparePlayerThrow(sim);sim.tick(.05,{});assert.equal(sim.grenades.length,1);}

test('a visible grenade interrupts an ally reload, produces a warning and real movement, with deterministic restore',()=>{
 const {sim,actor}=setup(),initialX=actor.x,beforeAmmo=actor.mag+actor.reserve;
 sim.tick(.05,{});const warning=sim.drainEvents().find(e=>e.type==='grenade-warning');
 assert.equal(warning?.actorId,actor.id);assert.equal(warning.heardByPlayer,true);assert.equal(warning.side,'ally');
 assert.equal(actor.state,'FLEE_GRENADE');assert.ok(actor.x>initialX);assert.equal(actor.reloadingUntil,0);
 assert.equal(actor.mag+actor.reserve,beforeAmmo,'interrupted reload cannot create ammunition');
 const save=sim.snapshot();
 const run=()=>{for(let i=0;i<12;i++)sim.tick(.05,{});return {snapshot:sim.snapshot(),events:sim.drainEvents()};};
 const first=run();sim.restoreSnapshot(save);sim.drainEvents();assert.deepEqual(run(),first);
 const safe=sim.snapshot(),bad=structuredClone(safe);bad.allies[0].m02GrenadeThreat.goalX=NaN;
 assert.throws(()=>sim.restoreSnapshot(bad),/inválid/);assert.deepEqual(sim.snapshot(),safe);
 for(let i=0;i<35;i++)sim.tick(.05,{});
 assert.equal(sim.grenades.length,0);assert.notEqual(sim.allies[0].state,'FLEE_GRENADE');
 assert.equal(sim.allies[0].m02GrenadeThreat,undefined);
});

test('grenades behind the observer or behind a wall cause no fabricated warning',()=>{
 for(const mode of ['rear','wall']){
  const {sim,actor}=setup();
  if(mode==='rear')actor.facing=0;
  else sim.world.obstacles.push({id:'awareness-wall',min:{x:2,y:0,z:98},max:{x:2.2,y:3,z:102},material:'brick'});
  sim.tick(.05,{});
  assert.equal(actor.m02GrenadeThreat,undefined,mode);assert.equal(sim.drainEvents().some(e=>e.type==='grenade-warning'),false,mode);
 }
});

test('a real nearby bounce is heard behind the observer, but not through a solid wall or beyond range',()=>{
 for(const mode of ['clear','wall','far']){
  const {sim,actor}=setup();sim.grenades=[];sim.drainEvents();actor.facing=0;
  if(mode==='wall')sim.world.obstacles.push({id:'bounce-wall',min:{x:2,y:0,z:98},max:{x:2.2,y:3,z:102},material:'brick'});
  sim.throwGrenade({x:mode==='far'?-2:1,y:.2,z:100},{x:0,y:-1,z:0});sim.tick(.05,{});
  const events=sim.drainEvents();assert.ok(events.some(e=>e.type==='grenade-bounced'),mode+' uses a real collision');
  const warning=events.find(e=>e.type==='grenade-warning');
  if(mode==='clear'){assert.equal(warning?.perception,'bounce');assert.equal(actor.state,'FLEE_GRENADE');}
  else{assert.equal(warning,undefined,mode);assert.equal(actor.m02GrenadeThreat,undefined);}
 }
});

test('an earlier bounce retained in the event queue is not heard again on a later tick',()=>{
 const {sim,actor}=setup();sim.grenades=[];sim.drainEvents();Object.assign(actor,{x:10,facing:0});
 sim.throwGrenade({x:1,y:.2,z:100},{x:0,y:-1,z:0});sim.tick(.05,{});
 assert.ok(sim.events.some(e=>e.type==='grenade-bounced'));assert.equal(actor.m02GrenadeThreat,undefined);
 actor.x=4;sim.tick(.05,{});
 assert.equal(actor.m02GrenadeThreat,undefined);assert.equal(sim.events.some(e=>e.type==='grenade-warning'),false);
});

test('an enemy seeing the actual grenade flees without producing an allied player warning',()=>{
 const {sim,actor}=setup('enemy'),before=actor.x;sim.tick(.05,{});
 const warning=sim.drainEvents().find(e=>e.type==='grenade-warning');
 assert.equal(warning?.side,'enemy');assert.equal(warning.heardByPlayer,false);
 assert.equal(actor.state,'FLEE_GRENADE');assert.ok(actor.x>before);
});

test('an observed grenade stops a real pending burst without spending its unfired rounds',()=>{
 const {sim,actor}=setup('enemy');Object.assign(actor,{weapon:'mp38',mag:5,reserve:0,reloadingUntil:0,nextFireAt:0});
 const shot=sim.fireActorBurst(actor,sim.player,{x:sim.player.x,y:1.4,z:sim.player.z},'enemy');
 assert.equal(shot.rounds,1);assert.equal(actor.mag,4);assert.equal(actor.burst.remaining,2);sim.drainEvents();
 sim.tick(.05,{});assert.equal(actor.burst,null);assert.equal(actor.mag,4);assert.equal(actor.shotsFired,1);
 assert.equal(sim.drainEvents().some(e=>e.type==='actor-burst'&&e.shooterId===actor.id),false);
});

test('the mounted B02 gunner ducks for a real grenade, then can resume firing after the blast',()=>{
 const sim=new M02BenchSimulation();sim.c01Active=false;
 const gunner=sim.enemies.find(a=>a.id==='DE-A05');sim.enemies=[gunner];sim.allies=[];
 sim.teleportPlayer(8,-30,0,0);gunner.nextFireAt=100;sim.drainEvents();
 const before={x:gunner.x,z:gunner.z,crouched:gunner.crouched,eyeHeight:gunner.eyeHeight};
 assert.equal(sim.evaluateMgLineOfFire().hasVisualLoS,true);
 preparePlayerThrow(sim);
 const first=sim.fireActorBurst(gunner,sim.player,{x:sim.player.x,y:1.4,z:sim.player.z},'enemy');
 assert.equal(first.rounds,1);assert.equal(gunner.mag,49);assert.equal(gunner.burst.remaining,4);sim.drainEvents();
 sim.tick(.05,{});
 const warning=sim.drainEvents().find(e=>e.type==='grenade-warning');
 assert.equal(warning?.actorId,'DE-A05');assert.equal(warning.perception,'visual');assert.equal(warning.heardByPlayer,false);
 assert.equal(sim.grenadeAmmo,1);assert.equal(gunner.tacticalState,'TakeCoverGrenade');
 assert.equal(gunner.crouched,true);assert.equal(gunner.eyeHeight,1.08);
 assert.equal(gunner.x,before.x);assert.equal(gunner.z,before.z);
 assert.equal(gunner.burst,null);assert.equal(gunner.mag,49);assert.equal(gunner.shotsFired,1);
 assert.deepEqual(sim.evaluateMgLineOfFire(),{mgActive:true,inArc:false,hasVisualLoS:false,canHitTarget:false,blockedById:'gunner_taking_cover',blockedByMaterial:null,distance:0});
 const visual=m02VisualActor(gunner,'enemy',sim.clock);
 assert.equal(m02CharacterSample(visual,sim.clock,new Map([['m02_mg34_crouch_aim',{}]])).clip,'m02_mg34_crouch_aim');

 const checkpoint=sim.snapshot(),bad=structuredClone(checkpoint);
 bad.enemies.find(e=>e.id==='DE-A05').m02GrenadeThreat.previousCrouched='false';
 assert.throws(()=>sim.restoreSnapshot(bad),/inválid/);assert.deepEqual(sim.snapshot(),checkpoint);
 const run=()=>{for(let i=0;i<80;i++)sim.tick(.05,{});return {snapshot:sim.snapshot(),events:sim.drainEvents()};};
 const result=run(),explosion=result.events.find(e=>e.type==='grenade-exploded');
 assert.ok(explosion);assert.ok(explosion.affectedActors.find(a=>a.id==='DE-A05').damage>0,'ducking does not grant blast immunity');
 const shots=result.events.filter(e=>e.type==='actor-burst'&&e.shooterId==='DE-A05');
 assert.ok(shots.length>0,'the surviving gunner resumes actual firing');
 assert.ok(shots.every(e=>e.clock>explosion.clock),'no rounds are fired while taking cover');
 const restored=result.snapshot.enemies.find(e=>e.id==='DE-A05');
 assert.equal(restored.crouched,before.crouched);assert.equal(restored.eyeHeight,before.eyeHeight);
 assert.equal(restored.x,before.x);assert.equal(restored.z,before.z);assert.equal(restored.m02GrenadeThreat,undefined);
 sim.restoreSnapshot(checkpoint);sim.drainEvents();assert.deepEqual(run(),result);
});

test('the mounted gunner does not react to a grenade hidden behind him or a solid wall',()=>{
 for(const mode of ['rear','wall']){
  const sim=new M02BenchSimulation();sim.c01Active=false;
  const gunner=sim.enemies.find(e=>e.id==='DE-A05');sim.enemies=[gunner];sim.allies=[];gunner.nextFireAt=100;
  if(mode==='rear')sim.teleportPlayer(16,-30,0,0);
  else{
   sim.teleportPlayer(8,-30,0,0);
   sim.world.obstacles.push({id:'mg-awareness-wall',min:{x:10,y:0,z:-32},max:{x:10.2,y:3,z:-28},material:'brick'});
  }
  sim.drainEvents();releasePlayerThrow(sim);sim.tick(.05,{});
  assert.equal(gunner.m02GrenadeThreat,undefined,mode);
  assert.equal(sim.drainEvents().some(e=>e.type==='grenade-warning'),false,mode);
 }
});

test('the mounted gunner can hear a real nearby bounce behind his firing arc',()=>{
 const sim=new M02BenchSimulation();sim.c01Active=false;
 const gunner=sim.enemies.find(e=>e.id==='DE-A05');sim.enemies=[gunner];sim.allies=[];
 gunner.nextFireAt=100;sim.teleportPlayer(8,-30,0,0);sim.drainEvents();
 sim.throwGrenade({x:16,y:.2,z:-30},{x:0,y:-1,z:0});sim.tick(.05,{});
 const events=sim.drainEvents(),warning=events.find(e=>e.type==='grenade-warning');
 assert.ok(events.some(e=>e.type==='grenade-bounced'));
 assert.equal(warning?.actorId,'DE-A05');assert.equal(warning.perception,'bounce');
 assert.equal(gunner.tacticalState,'TakeCoverGrenade');assert.equal(gunner.crouched,true);
 assert.equal(gunner.x,13.2);assert.equal(gunner.z,-30);
});

test('a blast that kills the mounted gunner clears his threat before the next checkpoint',()=>{
 const sim=new M02BenchSimulation();sim.c01Active=false;
 const gunner=sim.enemies.find(e=>e.id==='DE-A05');sim.enemies=[gunner];sim.allies=[];
 gunner.health=20;gunner.nextFireAt=100;sim.teleportPlayer(8,-30,0,0);
 releasePlayerThrow(sim);assert.equal(gunner.tacticalState,'TakeCoverGrenade');
 for(let i=0;i<45&&sim.grenades.length;i++)sim.tick(.05,{});
 const explosion=sim.drainEvents().find(e=>e.type==='grenade-exploded');
 assert.ok(explosion.affectedActors.find(a=>a.id==='DE-A05').damage>=20);
 assert.equal(gunner.alive,false);assert.equal(gunner.state,'DEAD');assert.equal(gunner.m02GrenadeThreat,undefined);
 assert.equal(gunner.goal,null);assert.equal(gunner.moving,false);
 assert.equal(sim.evaluateMgLineOfFire().mgActive,false);
 const checkpoint=sim.snapshot();assert.doesNotThrow(()=>sim.restoreSnapshot(checkpoint));
 assert.equal(sim.enemies[0].m02GrenadeThreat,undefined);

 // Other real blasts can kill an actor between ticks; the immediate snapshot
 // must also be clean, before the garrison loop has a chance to run.
 const immediate=new M02BenchSimulation();immediate.c01Active=false;
 const second=immediate.enemies.find(e=>e.id==='DE-A05');immediate.enemies=[second];immediate.allies=[];
 second.nextFireAt=100;immediate.teleportPlayer(8,-30,0,0);releasePlayerThrow(immediate);
 assert.ok(second.m02GrenadeThreat);immediate.detonateGrenadeAt(second.x,1,second.z);
 assert.equal(second.alive,false);assert.equal(second.m02GrenadeThreat,undefined);
 assert.equal(second.goal,null);assert.equal(second.moving,false);
 assert.equal(immediate.snapshot().enemies[0].m02GrenadeThreat,undefined);
});

test('the C04 wounded transition clears a grenade escape without restoring armed combat',()=>{
 const sim=new M02BenchSimulation();sim.c01Active=false;
 const wounded=sim.enemies.find(e=>e.c04Candidate),gunner=sim.enemies.find(e=>e.id==='DE-A05');
 sim.enemies=[gunner,wounded];sim.allies=[];gunner.nextFireAt=100;
 sim.teleportPlayer(-5.5,30,Math.PI/2,0);releasePlayerThrow(sim);
 assert.equal(wounded.state,'FLEE_GRENADE');assert.ok(wounded.m02GrenadeThreat);
 wounded.health=48;sim.tick(.05,{});
 assert.equal(wounded.state,'WOUNDED_UNARMED');assert.equal(wounded.nonCombatant,true);
 assert.equal(wounded.m02GrenadeThreat,undefined);
 const checkpoint=sim.snapshot();sim.restoreSnapshot(checkpoint);
 assert.equal(sim.enemies.find(e=>e.c04Candidate).state,'WOUNDED_UNARMED');
});

test('clearing an obsolete grenade threat preserves a new wounded evacuation destination',()=>{
 const {sim,actor}=setup();sim.tick(.05,{});assert.ok(actor.m02GrenadeThreat);
 const destination={x:-58,z:52,crouch:false,nodeId:'aid_station'};
 actor.state='WALKING_SUPPORTED';actor.goal=destination;
 assert.equal(m02ClearIncapableGrenadeThreat(actor),true);
 assert.equal(actor.m02GrenadeThreat,undefined);assert.deepEqual(actor.goal,destination);
});

test('older grenade-threat checkpoints without posture fields remain valid',()=>{
 const {sim}=setup();sim.tick(.05,{});const old=sim.snapshot();
 assert.equal(old.allies[0].m02GrenadeThreat.previousCrouched,undefined);
 assert.doesNotThrow(()=>sim.restoreSnapshot(old));
});

test('a hold order yields to danger and resumes its saved position after the explosion',()=>{
 const {sim,actor}=setup();Object.assign(actor,{mag:5,reserve:0,reloadingUntil:0});sim.issueSquadOrder('suppress');
 const anchor=sim.squadOrder.holdPositions[actor.id];let farthest=actor.x;
 for(let i=0;i<50;i++){sim.tick(.05,{});farthest=Math.max(farthest,actor.x);}
 assert.equal(sim.grenades.length,0);assert.ok(farthest>anchor.x+2,'the order cannot pin a man beside a grenade');
 assert.equal(actor.goal.nodeId,'order_hold_pl_gruca');assert.ok(actor.x<farthest-1,'the actor returns through normal movement');
 assert.equal(actor.health,100);
});

test('an escape target from a previous cell cannot drag an ally back across a transition',()=>{
 const {sim,actor}=setup();sim.tick(.05,{});assert.equal(actor.m02GrenadeThreat.cell,'B');
 sim.enterAreaCC09();sim.tick(.05,{});
 const moved=sim.allies.find(a=>a.id==='pl_gruca');assert.ok(moved);
 assert.equal(moved.m02GrenadeThreat,undefined);assert.notEqual(moved.goal?.nodeId,'grenade_escape_gren_1');
});

test('the C11 wounded Lis keeps his scripted evacuation instead of an armed flee action',()=>{
 const sim=new M02BenchSimulation();sim.enterAreaCC09();sim.startC10OrderChanges();sim.detonateC10FixedArtillery();sim.enemies=[];
 sim.assistLisInC11('wounded_walking');const lis=sim.allies.find(a=>a.id==='pl_lis');sim.allies=[lis];
 sim.throwGrenade({x:lis.x-3,y:1.4,z:lis.z},{x:1,y:0,z:0});sim.drainEvents();sim.tick(.05,{});
 assert.equal(lis.state,'WALKING_SUPPORTED');assert.equal(lis.m02GrenadeThreat,undefined);
});
