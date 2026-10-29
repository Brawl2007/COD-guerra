import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {updateGermanGarrison} from '../src/game/m02-combat-ai.js';

test('B MG acquires from its own position and gives the M01 reaction interval before aimed fire',()=>{
 const s=new M02BenchSimulation();s.enterAreaBC06();s.allies=[];
 const mg=s.enemies.find(e=>e.weapon==='mg34');s.enemies=[mg];
 Object.assign(mg,{x:0,y:0,z:100,facing:Math.PI/2,nextFireAt:0,seeingTargetId:null});
 Object.assign(s.player,{x:0,y:0,z:120,crouched:false,eyeHeight:1.65});
 s.evaluateMgLineOfFire=()=>{throw Error('Area A aperture must not drive Area B perception');};
 updateGermanGarrison(s,.05);assert.equal(mg.seeingTargetId,s.player.id);assert.equal(mg.shotsFired,0);
 s.clock+=1;updateGermanGarrison(s,.05);assert.equal(mg.shotsFired,0);
 s.clock+=.25;updateGermanGarrison(s,.05);assert.ok(mg.shotsFired>0);
});

test('C01 preparation trench is inside the movement envelope; walking cannot jump to the farm',()=>{
 const s=new M02BenchSimulation(19390909,{startScene:'C01'}),before={...s.player};
 const bounds=s.world.layout.bounds.playable;
 assert.ok(before.z>=bounds.minZ&&before.z<=bounds.maxZ);
 s.tick(.05,{forward:1});
 assert.ok(Math.hypot(s.player.x-before.x,s.player.z-before.z)<1);
 assert.ok(s.player.z< -170);
});

test('B/C movement and checkpoint continuation keep finite world coordinates',()=>{
 for(const cell of ['B','C']){
  const s=new M02BenchSimulation();s.clock=60;
  if(cell==='B')s.enterAreaBC06();else s.enterAreaCC09();
  const enemies=s.enemies.filter(e=>e.alive&&!e.nonCombatant);
  assert.ok(enemies.every(e=>e.nextFireAt>s.clock),'new garrison fire timers must be relative to entry clock');
  s.saveCheckpoint('movement');
  for(let i=0;i<20;i++)s.tick(.05,{forward:1,side:.25});
  const result=s.snapshot();
  assert.ok([s.player,...s.allies,...s.enemies].every(a=>[a.x,a.y,a.z].every(Number.isFinite)));
  s.restoreCheckpoint('movement');for(let i=0;i<20;i++)s.tick(.05,{forward:1,side:.25});
  assert.deepEqual(s.snapshot(),result);
 }
});

test('EC2 reserves do not inherit the defeated EA1 farm garrison morale',()=>{
 const s=new M02BenchSimulation();s.enterAreaCC09();
 for(const enemy of s.enemies){enemy.alive=false;enemy.health=0;}
 s.startC10OrderChanges();s.tick(.05);
 const reserve=s.enemies.filter(e=>e.encounterId==='EC2');
 assert.equal(reserve.length,12);
 assert.ok(reserve.every(e=>e.alive&&!e.nonCombatant&&e.state!=='SURRENDERED'));
});

test('mid-grenade RNG and portal locks survive exact continuation; old saves remain readable',()=>{
 const s=new M02BenchSimulation();s.tick(.1,{grenade:true});
 s.doorLocks.set('portal',{actorId:'pl_lis',expiresAt:1});
 const snapshot=s.snapshot();
 for(let i=0;i<45;i++)s.tick(.05,{});
 const final=s.snapshot();s.restoreSnapshot(snapshot);
 for(let i=0;i<45;i++)s.tick(.05,{});
 assert.deepEqual(s.snapshot(),final);
 const legacy=structuredClone(snapshot);
 for(const key of ['rngState','worldRevision','grenades','grenadeSeq','doorLocks'])delete legacy[key];
 assert.doesNotThrow(()=>s.restoreSnapshot(legacy));
 const before=s.snapshot(),bad=structuredClone(before);bad.player.x=NaN;
 assert.throws(()=>s.restoreSnapshot(bad),/inválido/);assert.deepEqual(s.snapshot(),before);
});

import {m02PlayerAction,performM02PlayerAction} from '../src/game/m02-player-actions.js';
test('C12 exit interaction takes precedence over a nearby B12 door; leaving Lis behind remains a real outcome',()=>{
 const s=new M02BenchSimulation();s.enterAreaCC09();s.detonateC10FixedArtillery();
 s.teleportPlayer(-54,54.1,Math.PI/2);s.objective={id:'O09',status:'active'};
 assert.ok(s.currentDoorPrompt(),'fixture must reproduce the doorway conflict');
 assert.equal(m02PlayerAction(s).id,'epilogue');assert.equal(performM02PlayerAction(s),true);
 assert.equal(s.flags['m02.lis_status'],'missing');
 assert.equal(s.dialogue.hasTriggered('bz39_c12_01'),false);
});

test('contact with Lis starts a physical supported walk; it does not teleport him to B12',()=>{
 const s=new M02BenchSimulation();s.enterAreaCC09();s.detonateC10FixedArtillery();
 for(const e of s.enemies){e.alive=false;e.health=0;}
 const lis=s.allies.find(a=>a.id==='pl_lis'),before=[lis.x,lis.z];
 s.assistLisInC11('wounded_walking');assert.deepEqual([lis.x,lis.z],before);
 assert.deepEqual([lis.goal.x,lis.goal.z],[-58,52]);
 for(let i=0;i<1400&&s.flags['m02.lis_status']!=='wounded_evacuated';i++)s.tick(.1,{});
 assert.equal(s.flags['m02.lis_status'],'wounded_evacuated');
 assert.ok(Math.hypot(lis.x+58,lis.z-52)<.65);
 assert.equal(lis.moving,false);assert.equal(lis.effectiveSpeed,0);assert.equal(lis.goal,null);
 const arrived=[lis.x,lis.z],saved=s.snapshot();
 for(let i=0;i<50;i++)s.tick(.1,{});
 assert.deepEqual([lis.x,lis.z],arrived,'evacuated Lis must not walk back to a combat position');
 assert.equal(lis.state,'EVACUATED_B12');assert.equal(lis.goal,null);
 const expected=s.snapshot();s.restoreSnapshot(saved);for(let i=0;i<50;i++)s.tick(.1,{});
 assert.deepEqual(s.snapshot(),expected,'arrival remains deterministic after checkpoint restore');
 const legacy=structuredClone(saved),legacyLis=legacy.allies.find(a=>a.id==='pl_lis');
 legacyLis.goal={x:-56,z:50,crouch:false,nodeId:'cv_c_b12_lis'};legacyLis.moving=true;
 s.restoreSnapshot(legacy);s.tick(.1,{});
 const restoredLis=s.allies.find(a=>a.id==='pl_lis');
 assert.deepEqual([restoredLis.x,restoredLis.z],arrived,'stale goals in earlier saves cannot restart the walk');
 assert.equal(restoredLis.moving,false);assert.equal(restoredLis.goal,null);
 s.completeC12Epilogue({lisOutcome:'wounded_evacuated'});
 assert.deepEqual([restoredLis.x,restoredLis.z],arrived,'normal epilogue must not teleport an already evacuated Lis');
});

test('the exit warns whether Lis has not been rescued or is still on his way',()=>{
 const s=new M02BenchSimulation();s.enterAreaCC09();s.startC10OrderChanges();s.detonateC10FixedArtillery();
 s.teleportPlayer(-54,54.1,Math.PI/2);s.objective={id:'O09',status:'active'};
 assert.match(m02PlayerAction(s).prompt,/sem socorrer Lis/);
 s.assistLisInC11('wounded_walking');assert.match(m02PlayerAction(s).prompt,/Lis ainda a caminho/);
 s.assistLisInC11('wounded_evacuated');assert.match(m02PlayerAction(s).prompt,/seguir para Varsóvia/);
});

test('blast damage can immobilize the supply cart and lose real undelivered volumes without duplication',()=>{
 const s=new M02BenchSimulation();s.enterAreaBC06();const cart=s.areaB.supplyCart;
 s.detonateGrenadeAt(cart.x,.5,cart.z,6.5);
 assert.equal(cart.wheelDamaged,true);assert.ok(cart.volumes.every(v=>v.lost));
 const snapshot=s.snapshot();s.restoreSnapshot(snapshot);assert.deepEqual(s.snapshot(),snapshot);
 assert.equal(s.pickupSupplyVolume('vol_water'),false);
});

test('C07 supplies are applied once and water never lowers an unwounded player health',()=>{
 const s=new M02BenchSimulation();s.enterAreaBC06();
 s.supplies.waterDelivered=true;s.supplies.ammoDelivered=true;s.player.health=100;
 s.completeC07Reorganization();const reserve=s.weapon.reserve;
 assert.equal(s.player.health,100);
 s.player.health=40;s.completeC07Reorganization();
 assert.equal(s.player.health,40);assert.equal(s.weapon.reserve,reserve);
});
