import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEAPON_TYPES,makeWorldWeapon,makePrototypeState,isCartridgeCompatible,isFeedDeviceCompatible,makeTrace,resolveInteraction,weaponPickupCandidate,
  dropActorWeapon,dropEquippedWeapon,pickupWeapon,cleanupWorldWeapons,makeMountedWeapon,mountedInteractionCandidate,enterMountedWeapon,
  aimMountedWeapon,crewActionAvailable,leaveMountedWeapon,canMountedWeaponFire,makeCrewStation,makeVehicle,makeSeat,vehicleSeatCandidate,
  enterVehicleSeat,exitVehicleSeat,vehicleControlAvailable,prototypeSnapshot,validatePrototypeSnapshot,restorePrototypeSnapshot,
  interactionGameplayFingerprint,scenarioFixtures,runPrototypeScenarios
} from '../tools/verification/m01-world-interactions-prototype.mjs';

const deadKar=()=>makeWorldWeapon({id:'kar_dead',weaponType:'kar98k',position:{x:1.5,y:0,z:0},feed:{kind:'internal-magazine',rounds:4,capacity:5,chamber:'unmodelled'},droppedAt:10});

test('scenario A: dead-enemy Kar98k pickup preserves exactly four rounds',()=>{
  const s=scenarioFixtures();const w=pickupWeapon(s,'kar98k_dead',{dropPoint:{x:.3,y:0,z:-.4},clock:12});
  assert.equal(w.id,'kar98k_dead');assert.equal(w.feed.rounds,4);assert.equal(s.player.equippedWeaponId,'kar98k_dead');
  assert.equal(s.worldWeapons.player_wz29.feed.rounds,2,'old rifle did not refill while swapping');
});

test('pickup candidate requires proximity and a clear interaction line',()=>{
  const s=makePrototypeState();s.worldWeapons.kar_dead=deadKar();const c=weaponPickupCandidate(s,'kar_dead');
  assert.equal(resolveInteraction(s.player,[c])?.entityId,'kar_dead');
  s.player.position={x:-3,y:0,z:0};assert.equal(resolveInteraction(s.player,[c]),null,'too far');
  s.player.position={x:0,y:0,z:0};const wall={id:'wall',min:{x:.5,y:-1,z:-1},max:{x:.7,y:2,z:1}};
  assert.equal(resolveInteraction(s.player,[c],{trace:makeTrace([wall])}),null,'no pickup through wall');
});

test('interaction resolver uses explicit priority before angle/distance and stable IDs for ties',()=>{
  const p=makePrototypeState().player,candidates=[
    {id:'pickup:z',anchor:{x:1,y:0,z:0},priority:40,prompt:'weapon'},
    {id:'scripted',anchor:{x:1.8,y:0,z:.1},priority:100,prompt:'rescue'},
    {id:'pickup:a',anchor:{x:1,y:0,z:0},priority:40,prompt:'weapon2'}
  ];
  assert.equal(resolveInteraction(p,candidates).id,'scripted');
  assert.equal(resolveInteraction(p,candidates.filter(c=>c.priority===40)).id,'pickup:a');
});

test('living NPC weapon is not pickup-available; death drop preserves ID and ammo',()=>{
  const s=makePrototypeState();s.actors.de7={id:'de7',alive:true,position:{x:2,y:0,z:0},facing:Math.PI/2};
  s.worldWeapons.rifle=makeWorldWeapon({id:'rifle',weaponType:'kar98k',position:null,holder:{kind:'actor',id:'de7'},feed:{kind:'internal-magazine',rounds:3,capacity:5,chamber:'unmodelled'}});
  assert.equal(weaponPickupCandidate(s,'rifle').available,false);
  assert.throws(()=>dropActorWeapon(s,'de7'),/dead/);s.actors.de7.alive=false;const dropped=dropActorWeapon(s,'de7',{clock:20});
  assert.equal(dropped.id,'rifle');assert.equal(dropped.feed.rounds,3);assert.equal(dropped.droppedAt,20);assert.ok(dropped.position);
});

test('protected weapon cannot be selected or picked up',()=>{
  const s=makePrototypeState();s.worldWeapons.objective=makeWorldWeapon({id:'objective',weaponType:'kar98k',position:{x:1,y:0,z:0},feed:{kind:'internal-magazine',rounds:1,capacity:5,chamber:'unmodelled'},protected:true});
  const c=weaponPickupCandidate(s,'objective');assert.equal(c.available,false);assert.equal(resolveInteraction(s.player,[c]),null);assert.throws(()=>pickupWeapon(s,'objective'),/unavailable/);
});

test('drop preserves stable ID, feed state and does not disappear',()=>{
  const s=makePrototypeState();s.worldWeapons.wz=makeWorldWeapon({id:'wz',weaponType:'kb_wz29',position:null,holder:{kind:'player',id:'player'},feed:{kind:'internal-magazine',rounds:2,capacity:5,chamber:'unmodelled'}});s.player.equippedWeaponId='wz';
  const w=dropEquippedWeapon(s,{position:{x:.8,y:0,z:.1},clock:5});assert.equal(w.id,'wz');assert.equal(w.feed.rounds,2);assert.deepEqual(w.position,{x:.8,y:0,z:.1});assert.equal(s.player.equippedWeaponId,null);
});

test('weapon swap is atomic with respect to safe placement of old weapon',()=>{
  const s=scenarioFixtures(),before=prototypeSnapshot(s);assert.throws(()=>pickupWeapon(s,'kar98k_dead',{dropPoint:{x:.2,y:0,z:0},isPointSafe:()=>false}),/safely drop/);
  assert.deepEqual(s,before,'failed swap does not partially transfer either weapon');
});

test('cartridge compatibility is caliber-based but feed devices require the correct family',()=>{
  assert.equal(isCartridgeCompatible('kar98k',{kind:'cartridges',caliber:'7.92x57',rounds:12}),true);
  assert.equal(isCartridgeCompatible('kar98k',{kind:'cartridges',caliber:'.30-06',rounds:12}),false);
  assert.equal(isFeedDeviceCompatible('rkm_wz28',{kind:'detachable-magazine',caliber:'7.92x57',family:'rkm28-mag'}),true);
  assert.equal(isFeedDeviceCompatible('rkm_wz28',{kind:'detachable-magazine',caliber:'7.92x57',family:'mg34-belt'}),false);
  assert.equal(isFeedDeviceCompatible('mg34',{kind:'belt',caliber:'7.92x57',family:'mg34-belt'}),true);
  assert.equal(isFeedDeviceCompatible('ckm_wz30',{kind:'belt',caliber:'7.92x57',family:'mg34-belt'}),false,'same cartridge does not make MG34 belt a ckm feed');
});

test('internal-magazine charger compatibility is not inferred from caliber alone',()=>{
  assert.equal(isFeedDeviceCompatible('kar98k',{kind:'charger',caliber:'7.92x57',family:'mauser-stripper-5'}),true);
  assert.equal(isFeedDeviceCompatible('kar98k',{kind:'magazine',caliber:'7.92x57',family:'rkm28-mag'}),false);
});

test('cleanup is deterministic and preserves protected, observed, nearby and active-interaction weapons',()=>{
  const build=()=>{const s=makePrototypeState();for(let i=0;i<8;i++)s.worldWeapons[`w${i}`]=makeWorldWeapon({id:`w${i}`,weaponType:'kar98k',position:{x:100+i,y:0,z:0},feed:{kind:'internal-magazine',rounds:i%5,capacity:5,chamber:'unmodelled'},droppedAt:i});s.worldWeapons.w0.protected=true;s.worldWeapons.w1.persistent=true;s.worldWeapons.w2.position={x:2,y:0,z:0};return s;};
  const a=build(),b=build(),opts={now:100,maxLooseWeapons:4,keepRadius:20,minAge:30,activeInteractionEntityId:'w3',observedIds:['w4']};
  const ra=cleanupWorldWeapons(a,opts),rb=cleanupWorldWeapons(b,opts);assert.deepEqual(ra,rb);assert.deepEqual(ra,['w5','w6','w7']);
  for(const id of ['w0','w1','w2','w3','w4'])assert.ok(a.worldWeapons[id],`${id} preserved`);
});

test('fixed MG operator entry respects proximity/obstruction and exit releases station',()=>{
  const s=scenarioFixtures();s.player.position={x:3.2,y:0,z:0};s.player.forward={x:1,y:0,z:0};
  const wall={id:'wall',min:{x:3.25,y:-1,z:-.5},max:{x:3.3,y:2,z:.5}};assert.throws(()=>enterMountedWeapon(s,'fixed_mg',{trace:makeTrace([wall])}),/reachable/);
  enterMountedWeapon(s,'fixed_mg');assert.equal(s.mountedWeapons.fixed_mg.occupantId,'player');assert.equal(s.player.mountedWeaponId,'fixed_mg');
  const exit=leaveMountedWeapon(s,'fixed_mg');assert.deepEqual(exit,{x:3,y:0,z:-1});assert.equal(s.mountedWeapons.fixed_mg.occupantId,null);
});

test('mounted traverse/elevation clamp to physical arc and do not rotate through limits',()=>{
  const s=scenarioFixtures();s.player.position={x:3.2,y:0,z:0};s.player.forward={x:1,y:0,z:0};enterMountedWeapon(s,'fixed_mg');
  assert.deepEqual(aimMountedWeapon(s,'fixed_mg',{traverseDelta:100,elevationDelta:-100}),{traverse:.35,elevation:-.15});
  assert.deepEqual(aimMountedWeapon(s,'fixed_mg',{traverseDelta:-100,elevationDelta:100}),{traverse:-.35,elevation:.25});
});

test('mounted fire still rejects an obstruction in front of a legal physical arc',()=>{
  const s=scenarioFixtures(),m=s.mountedWeapons.fixed_mg;m.occupantId='player';m.requirements={fire:['operator']};
  assert.equal(canMountedWeaponFire(m,{traceShot:()=>null}).ok,true);
  const blocked=canMountedWeaponFire(m,{traceShot:()=>({id:'wall',distance:2})});assert.equal(blocked.ok,false);assert.equal(blocked.reason,'obstructed');
});

test('crew-dependent artillery requires the NPC loader even when player is gunner',()=>{
  const s=scenarioFixtures();s.player.position={x:7.2,y:0,z:0};s.player.forward={x:1,y:0,z:0};enterMountedWeapon(s,'artillery');
  assert.equal(crewActionAvailable(s.mountedWeapons.artillery,'fire'),true);s.mountedWeapons.artillery.crewStations.find(x=>x.role==='loader').occupantId=null;
  assert.equal(crewActionAvailable(s.mountedWeapons.artillery,'fire'),false);assert.equal(s.mountedWeapons.artillery.occupantId,'player','player is still only operator/gunner');
});

test('vehicle exposes independent driver passenger and gunner seats with role controls',()=>{
  const s=scenarioFixtures(),roles=s.vehicles.jeep.seats.map(x=>[x.id,x.role,x.controls]);assert.deepEqual(roles,[['driver','driver',['drive']],['passenger','passenger',[]],['gunner','gunner',['mounted-weapon:jeep_mg']]]);
  s.player.position={x:11,y:0,z:-.7};s.player.forward={x:1,y:0,z:0};enterVehicleSeat(s,'jeep','driver');assert.equal(vehicleControlAvailable(s,'drive'),true);assert.equal(vehicleControlAvailable(s,'mounted-weapon:jeep_mg'),false);
});

test('occupied vehicle seat and blocked physical entry are rejected',()=>{
  const s=scenarioFixtures();s.player.position={x:11,y:0,z:-.7};s.player.forward={x:1,y:0,z:0};s.vehicles.jeep.seats.find(x=>x.id==='driver').occupantId='npc_driver';
  assert.equal(vehicleSeatCandidate(s,'jeep','driver').available,false);assert.throws(()=>enterVehicleSeat(s,'jeep','driver'),/unavailable/);
  s.vehicles.jeep.seats.find(x=>x.id==='driver').occupantId=null;const wall={id:'door-block',min:{x:11.05,y:-1,z:-1},max:{x:11.15,y:2,z:-.4}};
  assert.throws(()=>enterVehicleSeat(s,'jeep','driver',{trace:makeTrace([wall])}),/reachable/);
});

test('destroyed or burning vehicle rejects entry; abandoned enemy is not magically capturable',()=>{
  for(const status of ['destroyed','burning']){const s=scenarioFixtures();s.player.position={x:11,y:0,z:-.7};s.player.forward={x:1,y:0,z:0};s.vehicles.jeep.status=status;assert.throws(()=>enterVehicleSeat(s,'jeep','driver'),/unavailable/);}
  const s=scenarioFixtures();s.player.position={x:11,y:0,z:-.7};s.player.forward={x:1,y:0,z:0};Object.assign(s.vehicles.jeep,{status:'abandoned',faction:'enemy',capturable:false});assert.throws(()=>enterVehicleSeat(s,'jeep','driver'),/unavailable/);
});

test('vehicle exit chooses first safe authored point and never ejects into blocked space',()=>{
  const s=scenarioFixtures();s.player.position={x:11,y:0,z:-.7};s.player.forward={x:1,y:0,z:0};enterVehicleSeat(s,'jeep','driver');
  const first=s.vehicles.jeep.seats.find(x=>x.id==='driver').exitPoints[0];const exit=exitVehicleSeat(s,{isSafePoint:p=>p!==first&&!(p.x===first.x&&p.z===first.z)});assert.deepEqual(exit,{x:12,y:0,z:-1.8});
});

test('vehicle exit remains seated when every exit point is unsafe',()=>{
  const s=scenarioFixtures();s.player.position={x:11,y:0,z:-.7};s.player.forward={x:1,y:0,z:0};enterVehicleSeat(s,'jeep','driver');assert.throws(()=>exitVehicleSeat(s,{isSafePoint:()=>false}),/no safe vehicle exit/);
  assert.deepEqual(s.player.vehicleSeat,{vehicleId:'jeep',seatId:'driver'});assert.equal(s.vehicles.jeep.seats.find(x=>x.id==='driver').occupantId,'player');
});

test('prototype save round trip preserves dropped weapon, mounted arc, vehicle seat and crew state exactly',()=>{
  const s=scenarioFixtures();s.clock=42;s.mountedWeapons.fixed_mg.traverse.current=.2;s.vehicles.jeep.status='damaged';s.vehicles.jeep.damageState={engine:.7};
  const snap=prototypeSnapshot(s),json=JSON.stringify(snap),parsed=JSON.parse(json);assert.equal(validatePrototypeSnapshot(parsed),true);
  s.worldWeapons.kar98k_dead.feed.rounds=0;s.mountedWeapons.fixed_mg.traverse.current=0;s.vehicles.jeep.status='destroyed';restorePrototypeSnapshot(s,parsed);assert.deepEqual(s,snap);
});

test('prototype restore validates atomically before mutating target',()=>{
  const s=scenarioFixtures(),before=prototypeSnapshot(s),bad=prototypeSnapshot(s);bad.worldWeapons.kar98k_dead.feed.rounds=99;
  assert.throws(()=>restorePrototypeSnapshot(s,bad),/weapon feed/);assert.deepEqual(s,before);
});

test('missing presentation assets do not alter gameplay fingerprint or interaction results',()=>{
  const a=scenarioFixtures(),b=scenarioFixtures();for(const w of Object.values(b.worldWeapons))w.presentationId=null;for(const m of Object.values(b.mountedWeapons))m.presentationId=null;for(const v of Object.values(b.vehicles))v.presentationId=null;
  assert.equal(interactionGameplayFingerprint(a),interactionGameplayFingerprint(b));
  assert.equal(resolveInteraction(a.player,[weaponPickupCandidate(a,'kar98k_dead')])?.entityId,resolveInteraction(b.player,[weaponPickupCandidate(b,'kar98k_dead')])?.entityId);
});

test('five requested prototype scenarios A-E execute without inventing ammo or crew',()=>{
  const r=runPrototypeScenarios();assert.equal(r.A.rounds,4);assert.equal(r.A.oldRounds,2);assert.equal(r.B.rounds,4);assert.equal(r.C.aimed.traverse,.35);assert.equal(r.D.canDrive,true);assert.deepEqual([r.E.withLoader,r.E.withoutLoader],[true,false]);
});

test('weapon definitions keep 7.92 cartridge commonality without collapsing feed systems',()=>{
  assert.equal(WEAPON_TYPES.kar98k.caliber,WEAPON_TYPES.mg34.caliber);assert.notEqual(WEAPON_TYPES.kar98k.feedKind,WEAPON_TYPES.mg34.feedKind);assert.notEqual(WEAPON_TYPES.mg34.feedFamily,WEAPON_TYPES.ckm_wz30.feedFamily);
});
