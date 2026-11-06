import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {updateGermanGarrison} from '../src/game/m02-combat-ai.js';

test('B MG acquires from its own position and gives the M01 reaction interval before aimed fire',()=>{
 // Merge M02 único: a entrada em B tem a janela de segurança C06; o fixture abre o contacto (antes dele EB1 não vê ninguém).
 const s=new M02BenchSimulation();s.enterAreaBC06();Object.assign(s.areaB.contact,{opened:true,openedBy:'player_shot',openedAt:0,movementStartedAt:0,contactAt:0});s.allies=[];
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
 const s=new M02BenchSimulation();s.tick(.1,{grenade:true});for(let i=0;i<10;i++)s.tick(.05,{});
 assert.equal(s.grenades.length,1,'this checkpoint must contain a grenade already in flight');
 // Merge M02 único: o validador v2 só aceita fechaduras de portas que existem no layout (FIX-2b); usa-se uma porta real de B01.
 s.doorLocks.set('door_b01_north_service',{actorId:'pl_lis',expiresAt:1});
 const snapshot=s.snapshot();
 for(let i=0;i<45;i++)s.tick(.05,{});
 const final=s.snapshot();s.restoreSnapshot(snapshot);
 for(let i=0;i<45;i++)s.tick(.05,{});
 assert.deepEqual(s.snapshot(),final);
 const legacy=structuredClone(snapshot);
 // Saves anteriores desta linha (schema 2) não têm os campos aditivos do Codex: continuam legíveis sem eles.
 for(const key of ['playerGrenadeAction','playerWaterAction'])delete legacy[key];for(const g of legacy.grenades)delete g.releaseView;
 assert.doesNotThrow(()=>s.restoreSnapshot(legacy));
 const before=s.snapshot(),bad=structuredClone(before);bad.player.x=NaN;
 assert.throws(()=>s.restoreSnapshot(bad),/inválido/);assert.deepEqual(s.snapshot(),before);
});

import {m02PlayerAction,performM02PlayerAction} from '../src/game/m02-player-actions.js';
test('C12 exit interaction takes precedence over a nearby B12 door; leaving Lis behind remains a real outcome',()=>{
 const s=new M02BenchSimulation();s.enterAreaCC09();s.detonateC10FixedArtillery();
 s.areaC.lastGroup.forEach(a=>a.evacuated=true);
 s.teleportPlayer(-54,54.1,Math.PI/2);s.objective={id:'O09',status:'active'};
 assert.ok(s.currentDoorPrompt(),'fixture must reproduce the doorway conflict');
 assert.equal(m02PlayerAction(s).id,'epilogue');assert.equal(performM02PlayerAction(s),true);
 assert.equal(s.flags['m02.lis_status'],'missing');
 assert.equal(s.dialogue.hasTriggered('bz39_c12_01'),false);
});

test('contact with Lis starts a physical supported walk; it does not teleport him to B12',()=>{
 // Merge M02 único (ajuste justificado em M02_SINGLE_MERGE_REPORT.md): o contacto é o [E] deliberado de Piotr e o amparo é o percurso J3
 // desta linha (Lis só avança com Piotr ao pé). O desfecho I4 só é escrito no abrigo e diz COMO Lis saiu (amparado = wounded_walking);
 // assistLisInC11 é o atalho de bancada que impõe o desfecho. O que o Codex provava mantém-se: sem teletransporte, chegada determinista,
 // Lis abrigado não volta a uma posição de combate e o epílogo não o move.
 const s=new M02BenchSimulation();s.enterAreaCC09();s.startC10OrderChanges();s.detonateC10FixedArtillery();
 for(const e of s.enemies){e.alive=false;e.health=0;}
 const lisNow=()=>s.allies.find(a=>a.id==='pl_lis');
 for(let i=0;i<900&&!s.currentLisContactPrompt();i++){const l=lisNow();s.teleportPlayer(l.x+1.2,l.z,0,0);s.tick(.1,{});}
 assert.ok(s.currentLisContactPrompt(),'contacto disponível ao alcance');
 const before=[lisNow().x,lisNow().z];
 s.tick(.1,{interact:true});
 assert.equal(s.areaC.lisPhase,'supported');assert.ok(Math.hypot(lisNow().x-before[0],lisNow().z-before[1])<.5,'sem teletransporte');
 for(let i=0;i<4000&&s.areaC.lisPhase!=='sheltered';i++){const l=lisNow();s.teleportPlayer(l.x+1.0,l.z,0,0);s.tick(.1,{});}
 assert.equal(s.areaC.lisPhase,'sheltered');assert.equal(s.flags['m02.lis_status'],s.areaC.lisSupportMode);
 const arrived=[lisNow().x,lisNow().z],saved=s.snapshot();
 for(let i=0;i<50;i++)s.tick(.1,{});
 assert.deepEqual([lisNow().x,lisNow().z],arrived,'evacuated Lis must not walk back to a combat position');
 const expected=s.snapshot();s.restoreSnapshot(saved);for(let i=0;i<50;i++)s.tick(.1,{});
 assert.deepEqual(s.snapshot(),expected,'arrival remains deterministic after checkpoint restore');
 s.completeC12Epilogue();
 assert.deepEqual([lisNow().x,lisNow().z],arrived,'normal epilogue must not teleport an already sheltered Lis');
});

test('the exit warns whether Lis has not been rescued or is still on his way',()=>{
 const s=new M02BenchSimulation();s.enterAreaCC09();s.startC10OrderChanges();s.detonateC10FixedArtillery();
 s.areaC.lastGroup.forEach(a=>a.evacuated=true);
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
