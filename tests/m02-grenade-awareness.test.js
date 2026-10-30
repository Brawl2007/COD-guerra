import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';

function setup(side='ally'){
 const sim=new M02BenchSimulation();sim.enterAreaBC06();
 const actor=side==='ally'?sim.allies.find(a=>a.id==='pl_gruca'):sim.enemies.find(a=>a.id==='DE-B01');
 sim.allies=side==='ally'?[actor]:[];sim.enemies=side==='enemy'?[actor]:[];
 Object.assign(sim.player,{x:0,y:0,z:100,angle:0});
 Object.assign(actor,{x:4,y:0,z:100,facing:Math.PI,state:'ACTIVE',goal:null,mag:0,reserve:5,reloadingUntil:sim.clock+2});
 sim.drainEvents();sim.throwGrenade({x:0,y:1.4,z:100},{x:1,y:0,z:0});
 return {sim,actor};
}

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
