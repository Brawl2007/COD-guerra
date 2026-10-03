// Isolated architecture prototype for M01-WORLD-INTERACTIONS-ARCHITECTURE-V1.
// Not imported by production. All state is JSON-compatible and deterministic.

const clone=value=>structuredClone(value);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const length=v=>Math.hypot(v.x,v.y,v.z)||1;
const normalized=v=>{const l=length(v);return{x:v.x/l,y:v.y/l,z:v.z/l};};
const direction=(a,b)=>normalized({x:b.x-a.x,y:b.y-a.y,z:b.z-a.z});
const angleDeg=(forward,to)=>Math.acos(clamp(dot(normalized(forward),normalized(to)),-1,1))*180/Math.PI;

export const WEAPON_TYPES=Object.freeze({
  kb_wz29:Object.freeze({id:'kb_wz29',caliber:'7.92x57',feedKind:'internal-magazine',capacity:5,chargeFamilies:['kb-wz29-charger-5']}),
  kar98k:Object.freeze({id:'kar98k',caliber:'7.92x57',feedKind:'internal-magazine',capacity:5,chargeFamilies:['kar98k-charger-5']}),
  rkm_wz28:Object.freeze({id:'rkm_wz28',caliber:'7.92x57',feedKind:'detachable-magazine',capacity:20,feedFamily:'rkm28-mag'}),
  mg34:Object.freeze({id:'mg34',caliber:'7.92x57',feedKind:'belt',capacity:50,feedFamily:'mg34-belt'}),
  ckm_wz30:Object.freeze({id:'ckm_wz30',caliber:'7.92x57',feedKind:'belt',capacity:330,feedFamily:'ckm30-cloth-belt'}),
});

export const MOUNTED_TYPES=Object.freeze({
  artillery_prototype:Object.freeze({id:'artillery_prototype',feedKind:'single-shell'}),
  mortar_prototype:Object.freeze({id:'mortar_prototype',feedKind:'single-shell'}),
});

export function makeWorldWeapon({id,weaponType,position,orientation={yaw:0,pitch:0,roll:0},feed,holder=null,
  condition='serviceable',protected:protectedItem=false,persistent=false,droppedAt=null,sourceActorId=null,presentationId=null}){
  const profile=WEAPON_TYPES[weaponType];if(!profile)throw new Error(`unknown weaponType ${weaponType}`);
  if(!id)throw new Error('world weapon requires stable id');
  if(!feed||feed.kind!==profile.feedKind)throw new Error
…[3513 chars truncated — re-run with head/grep/tail for full output]…
;if(!w)return null;
  const facing=actor.facing??0;w.holder=null;w.position={x:actor.position.x-Math.sin(facing)*lateral,y:actor.position.y,z:actor.position.z+Math.cos(facing)*lateral};
  w.orientation={yaw:facing,pitch:0,roll:0};w.droppedAt=clock;return w;
}

export function dropEquippedWeapon(state,{position,orientation={yaw:0,pitch:0,roll:0},clock=state.clock,isPointSafe=()=>true}={}){
  const id=state.player.equippedWeaponId;if(!id)return null;if(!position||!isPointSafe(position))throw new Error('no safe drop point');
  const w=state.worldWeapons[id];if(!w||w.holder?.kind!=='player')throw new Error('equipped weapon ownership mismatch');
  w.holder=null;w.position=clone(position);w.orientation=clone(orientation);w.droppedAt=clock;state.player.equippedWeaponId=null;return w;
}

export function pickupWeapon(state,weaponId,{dropPoint=null,clock=state.clock,isPointSafe=()=>true}={}){
  const w=state.worldWeapons[weaponId];if(!w||w.protected||!w.position)throw new Error('weapon unavailable');
  if(w.holder?.kind==='actor'&&state.actors[w.holder.id]?.alive!==false)throw new Error('weapon still belongs to living actor');
  const old=state.player.equippedWeaponId;
  if(old&&old!==weaponId){if(!dropPoint||!isPointSafe(dropPoint))throw new Error('cannot safely drop current weapon');dropEquippedWeapon(state,{position:dropPoint,clock,isPointSafe});}
  w.holder={kind:'player',id:state.player.id};w.position=null;w.droppedAt=null;state.player.equippedWeaponId=w.id;return w;
}

export function cleanupWorldWeapons(state,{now=state.clock,playerPosition=state.player.position,maxLooseWeapons=24,keepRadius=35,minAge=30,
  activeInteractionEntityId=null,observedIds=[]}={}){
  const observed=new Set(observedIds),loose=Object.values(state.worldWeapons).filter(w=>w.position&&!w.holder);
  if(loose.length<=maxLooseWeapons)return [];
  const eligible=loose.filter(w=>!w.protected&&!w.persistent&&w.id!==activeInteractionEntityId&&!observed.has(w.id)&&
    Number.isFinite(w.droppedAt)&&now-w.droppedAt>=minAge&&distance(playerPosition,w.position)>keepRadius)
    .sort((a,b)=>a.droppedAt-b.droppedAt||distance(playerPosition,b.position)-distance(playerPosition,a.position)||a.id.localeCompare(b.id));
  const removeCount=Math.min(eligible.length,loose.length-maxLooseWeapons),removed=eligible.slice(0,removeCount).map(w=>w.id);
  for(const id of removed)delete state.worldWeapons[id];return removed;
}

export function makeMountedWeapon({id,weaponType,mountTransform={position:{x:0,y:0,z:0},yaw:0},pivot,muzzle,operatorStation,exitAnchors=[],
  traverse={min:-Math.PI/6,max:Math.PI/6,current:0},elevation={min:-Math.PI/18,max:Math.PI/9,current:0},feed,
  status='operational',occupantId=null,crewStations=[],requirements={},singleUserCapable=false,protected:protectedItem=false,presentationId=null}){
  const profile=WEAPON_TYPES[weaponType]||MOUNTED_TYPES[weaponType];if(!id||!profile)throw new Error('mounted weapon requires valid id/type');
  if(!feed||feed.kind!==profile.feedKind||!Number.isInteger(feed.rounds)||!Number.isInteger(feed.capacity)||feed.rounds<0||feed.rounds>feed.capacity)throw new Error('mounted weapon feed mismatch');
  if(traverse.min>traverse.max||elevation.min>elevation.max)throw new Error('invalid physical arc');
  return {id,weaponType,mountTransform:clone(mountTransform),pivot:clone(pivot),muzzle:clone(muzzle),operatorStation:clone(operatorStation),exitAnchors:clone(exitAnchors),
    traverse:clone(traverse),elevation:clone(elevation),feed:clone(feed),status,occupantId,crewStations:clone(crewStations),requirements:clone(requirements),
    singleUserCapable:Boolean(singleUserCapable),protected:Boolean(protectedItem),presentationId};
}

export function mountedInteractionCandidate(state,mountedId){
  const m=state.mountedWeapons[mountedId];if(!m)return null;
  const available=m.status==='operational'&&!m.occupantId&&!m.protected;
  return {id:`mount:${m.id}`,kind:'mounted-weapon',entityId:m.id,anchor:m.operatorStation,priority:55,maxDistance:2.2,maxAngleDeg:75,
    prompt:`E — Operate ${m.weaponType}`,available,protected:m.protected};
}

export function enterMountedWeapon(state,mountedId,{trace=()=>null}={}){
  const m=state.mountedWeapons[mountedId];if(!m||m.status!=='operational'||m.protected)throw new Error('mounted weapon unavailable');
  if(m.occupantId)throw new Error('operator station occupied');
  const c=mountedInteractionCandidate(state,mountedId),picked=resolveInteraction(state.player,[c],{trace});if(!picked)throw new Error('operator station not physically reachable');
  if(state.player.mountedWeaponId||state.player.vehicleSeat)throw new Error('player already occupies an interaction station');
  m.occupantId=state.player.id;state.player.mountedWeaponId=m.id;state.player.position=clone(m.operatorStation);return m;
}

export function aimMountedWeapon(state,mountedId,{traverseDelta=0,elevationDelta=0}={}){
  const m=state.mountedWeapons[mountedId];if(!m||m.occupantId!==state.player.id)throw new Error('player is not mounted operator');
  if(m.status!=='operational')throw new Error('mounted weapon disabled');
  m.traverse.current=clamp(m.traverse.current+traverseDelta,m.traverse.min,m.traverse.max);
  m.elevation.current=clamp(m.elevation.current+elevationDelta,m.elevation.min,m.elevation.max);
  return {traverse:m.traverse.current,elevation:m.elevation.current};
}

export function crewRoleOccupied(mounted,role){return mounted.crewStations.some(s=>s.role===role&&Boolean(s.occupantId));}

export function crewActionAvailable(mounted,action){
  if(mounted.status!=='operational')return false;
  const required=mounted.requirements?.[action]??(['aim','fire'].includes(action)?['operator']:[]);
  if(mounted.singleUserCapable&&mounted.occupantId&&required.every(role=>role==='operator'))return true;
  return required.every(role=>role==='operator'?Boolean(mounted.occupantId):crewRoleOccupied(mounted,role));
}

export function leaveMountedWeapon(state,mountedId,{isSafePoint=()=>true,trace=()=>null}={}){
  const m=state.mountedWeapons[mountedId];if(!m||m.occupantId!==state.player.id||state.player.mountedWeaponId!==mountedId)throw new Error('player is not operator');
  const from=m.operatorStation;const exit=m.exitAnchors.find(p=>isSafePoint(p)&&!trace(from,p));if(!exit)throw new Error('no safe mounted-weapon exit');
  m.occupantId=null;state.player.mountedWeaponId=null;state.player.position=clone(exit);return clone(exit);
}

export function mountedMuzzleDirection(mounted){
  const yaw=(mounted.mountTransform.yaw??0)+mounted.traverse.current,pitch=mounted.elevation.current,cp=Math.cos(pitch);
  return {x:Math.cos(yaw)*cp,y:Math.sin(pitch),z:Math.sin(yaw)*cp};
}

export function canMountedWeaponFire(mounted,{traceShot=()=>null,range=1000}={}){
  if(!crewActionAvailable(mounted,'fire'))return {ok:false,reason:'crew-or-status'};
  if(!mounted.feed||!Number.isInteger(mounted.feed.rounds)||mounted.feed.rounds<=0)return {ok:false,reason:'empty'};
  const origin=mounted.muzzle,d=mountedMuzzleDirection(mounted),end={x:origin.x+d.x*range,y:origin.y+d.y*range,z:origin.z+d.z*range};
  const hit=traceShot(origin,end);return hit?{ok:false,reason:'obstructed',hit}:{ok:true,reason:null};
}

export function makeCrewStation(id,role,occupantId=null){return {id,role,occupantId};}

export function makeVehicle({id,type,position={x:0,y:0,z:0},yaw=0,status='operational',mobility={canMove:true,steeringFactor:1,speedFactor:1},
  faction='ally',playerOperable=true,capturable=false,seats=[],mountedWeapons=[],damageState={},protected:protectedItem=false,presentationId=null}){
  if(!id||!type)throw new Error('vehicle requires id/type');
  const allowed=new Set(['operational','damaged','disabled','abandoned','burning','destroyed']);if(!allowed.has(status))throw new Error('invalid vehicle status');
  return {id,type,position:clone(position),yaw,status,mobility:clone(mobility),faction,playerOperable:Boolean(playerOperable),capturable:Boolean(capturable),
    seats:clone(seats),mountedWeapons:[...mountedWeapons],damageState:clone(damageState),protected:Boolean(protectedItem),presentationId};
}

export function makeSeat({id,role,entryPoint,exitPoints,access='open',occupantId=null,controls=[],enabled=true}){
  if(!id||!role||!entryPoint||!Array.isArray(exitPoints)||!exitPoints.length)throw new Error('seat contract incomplete');
  return {id,role,entryPoint:clone(entryPoint),exitPoints:clone(exitPoints),access,occupantId,controls:[...controls],enabled:Boolean(enabled)};
}

export function vehicleAllowsEntry(vehicle,seat){
  if(!seat?.enabled||seat.occupantId)return false;
  if(['burning','destroyed'].includes(vehicle.status))return false;
  if(vehicle.faction==='enemy'&&!vehicle.capturable)return false;
  if(!vehicle.playerOperable&&vehicle.faction!=='enemy')return false;
  if(seat.role==='driver'&&(!vehicle.mobility?.canMove||['disabled'].includes(vehicle.status)))return false;
  return true;
}

export function vehicleSeatCandidate(state,vehicleId,seatId){
  const v=state.vehicles[vehicleId],seat=v?.seats.find(s=>s.id===seatId);if(!v||!seat)return null;
  return {id:`seat:${vehicleId}:${seatId}`,kind:'vehicle-seat',vehicleId,seatId,anchor:seat.entryPoint,priority:50,maxDistance:2.4,maxAngleDeg:80,
    prompt:`E — Enter ${seat.role} seat`,available:vehicleAllowsEntry(v,seat),protected:v.protected};
}

export function enterVehicleSeat(state,vehicleId,seatId,{trace=()=>null}={}){
  const v=state.vehicles[vehicleId],seat=v?.seats.find(s=>s.id===seatId);if(!v||!seat)throw new Error('unknown vehicle seat');
  if(v.protected||!vehicleAllowsEntry(v,seat))throw new Error('vehicle seat unavailable');
  if(state.player.vehicleSeat||state.player.mountedWeaponId)throw new Error('player already occupies an interaction station');
  const c=vehicleSeatCandidate(state,vehicleId,seatId);if(!resolveInteraction(state.player,[c],{trace}))throw new Error('seat entry point not physically reachable');
  seat.occupantId=state.player.id;state.player.vehicleSeat={vehicleId,seatId};state.player.position=clone(seat.entryPoint);return seat;
}

export function exitVehicleSeat(state,{isSafePoint=()=>true,trace=()=>null}={}){
  const ref=state.player.vehicleSeat;if(!ref)throw new Error('player is not in a vehicle seat');
  const v=state.vehicles[ref.vehicleId],seat=v?.seats.find(s=>s.id===ref.seatId);if(!seat||seat.occupantId!==state.player.id)throw new Error('seat occupancy mismatch');
  const exit=seat.exitPoints.find(p=>isSafePoint(p)&&!trace(seat.entryPoint,p));if(!exit)throw new Error('no safe vehicle exit');
  seat.occupantId=null;state.player.vehicleSeat=null;state.player.position=clone(exit);return clone(exit);
}

export function vehicleControlAvailable(state,control){
  const ref=state.player.vehicleSeat;if(!ref)return false;const v=state.vehicles[ref.vehicleId],seat=v?.seats.find(s=>s.id===ref.seatId);if(!v||!seat)return false;
  if(control==='drive')return seat.role==='driver'&&seat.controls.includes('drive')&&vehicleAllowsEntry({...v,status:v.status}, {...seat,occupantId:null});
  return seat.controls.includes(control);
}

export function prototypeSnapshot(state){return clone(state);}

export function validatePrototypeSnapshot(s){
  const fail=m=>{throw new Error(`invalid interaction prototype snapshot: ${m}`);};
  if(!s||s.prototypeSchema!==1||!Number.isFinite(s.clock)||s.clock<0||!s.player)fail('header');
  const ids=new Set();for(const [id,w] of Object.entries(s.worldWeapons??{})){if(id!==w.id||ids.has(id)||!WEAPON_TYPES[w.weaponType])fail('world weapon');ids.add(id);if(w.position&&![w.position.x,w.position.y,w.position.z].every(Number.isFinite))fail('weapon position');if(!Number.isInteger(w.feed?.rounds)||!Number.isInteger(w.feed?.capacity)||w.feed.rounds<0||w.feed.rounds>w.feed.capacity)fail('weapon feed');}
  for(const [id,m] of Object.entries(s.mountedWeapons??{})){if(id!==m.id||ids.has(id))fail('mounted id');ids.add(id);if(!Number.isInteger(m.feed?.rounds)||!Number.isInteger(m.feed?.capacity)||m.feed.rounds<0||m.feed.rounds>m.feed.capacity)fail('mounted feed');if(m.traverse.current<m.traverse.min||m.traverse.current>m.traverse.max||m.elevation.current<m.elevation.min||m.elevation.current>m.elevation.max)fail('mounted arc');}
  const exclusiveOccupants=[];
  for(const m of Object.values(s.mountedWeapons??{}))if(m.occupantId)exclusiveOccupants.push(m.occupantId);
  for(const [id,v] of Object.entries(s.vehicles??{})){if(id!==v.id||ids.has(id))fail('vehicle id');ids.add(id);for(const seat of v.seats)if(seat.occupantId)exclusiveOccupants.push(seat.occupantId);}
  if(new Set(exclusiveOccupants).size!==exclusiveOccupants.length)fail('duplicate exclusive-station occupant');
  const playerHeld=Object.values(s.worldWeapons??{}).filter(w=>w.holder?.kind==='player'&&w.holder.id===s.player.id);if(playerHeld.length>(s.player.equippedWeaponId?1:0))fail('multiple player-held weapons');
  if(s.player.equippedWeaponId){const w=s.worldWeapons[s.player.equippedWeaponId];if(!w||w.holder?.kind!=='player'||w.holder.id!==s.player.id)fail('equipped backlink');}
  if(s.player.mountedWeaponId){const m=s.mountedWeapons[s.player.mountedWeaponId];if(!m||m.occupantId!==s.player.id)fail('mounted backlink');}
  if(s.player.vehicleSeat){const v=s.vehicles[s.player.vehicleSeat.vehicleId],seat=v?.seats.find(x=>x.id===s.player.vehicleSeat.seatId);if(!seat||seat.occupantId!==s.player.id)fail('seat backlink');}
  return true;
}

export function restorePrototypeSnapshot(target,raw){const candidate=clone(raw);validatePrototypeSnapshot(candidate);for(const k of Object.keys(target))delete target[k];Object.assign(target,candidate);return target;}

export function interactionGameplayFingerprint(state){
  const copy=prototypeSnapshot(state);
  for(const w of Object.values(copy.worldWeapons))delete w.presentationId;
  for(const m of Object.values(copy.mountedWeapons))delete m.presentationId;
  for(const v of Object.values(copy.vehicles))delete v.presentationId;
  return JSON.stringify(copy);
}

export function scenarioFixtures(){
  const s=makePrototypeState({playerPosition:{x:0,y:0,z:0},playerForward:{x:1,y:0,z:0}});
  s.actors.de_dead={id:'de_dead',alive:false,position:{x:1.5,y:0,z:0},facing:0};
  s.worldWeapons.kar98k_dead=makeWorldWeapon({id:'kar98k_dead',weaponType:'kar98k',position:{x:1.5,y:0,z:.35},feed:{kind:'internal-magazine',rounds:4,capacity:5,chamber:'unmodelled'},sourceActorId:'de_dead',droppedAt:10,presentationId:'kar98k_glb'});
  s.worldWeapons.player_wz29=makeWorldWeapon({id:'player_wz29',weaponType:'kb_wz29',position:null,holder:{kind:'player',id:'player'},feed:{kind:'internal-magazine',rounds:2,capacity:5,chamber:'unmodelled'},presentationId:'wz29_glb'});
  s.player.equippedWeaponId='player_wz29';
  s.mountedWeapons.fixed_mg=makeMountedWeapon({id:'fixed_mg',weaponType:'mg34',pivot:{x:4,y:1,z:0},muzzle:{x:4.8,y:1,z:0},operatorStation:{x:3.4,y:0,z:0},exitAnchors:[{x:3,y:0,z:-1},{x:3,y:0,z:1}],traverse:{min:-.35,max:.35,current:0},elevation:{min:-.15,max:.25,current:0},feed:{kind:'belt',family:'mg34-belt',rounds:32,capacity:50,chamber:'loaded'},singleUserCapable:true});
  s.mountedWeapons.artillery=makeMountedWeapon({id:'artillery',weaponType:'artillery_prototype',pivot:{x:8,y:0,z:0},muzzle:{x:9,y:1,z:0},operatorStation:{x:7.5,y:0,z:0},exitAnchors:[{x:7,y:0,z:-1}],feed:{kind:'single-shell',rounds:1,capacity:1,chamber:'loaded'},crewStations:[makeCrewStation('gunner','gunner',null),makeCrewStation('loader','loader','npc_loader')],requirements:{fire:['operator','loader'],load:['loader']}});
  s.vehicles.jeep=makeVehicle({id:'jeep',type:'jeep',position:{x:12,y:0,z:0},status:'operational',seats:[
    makeSeat({id:'driver',role:'driver',entryPoint:{x:11.3,y:0,z:-.8},exitPoints:[{x:10.8,y:0,z:-1.5},{x:12,y:0,z:-1.8}],access:'door-left',controls:['drive']}),
    makeSeat({id:'passenger',role:'passenger',entryPoint:{x:11.3,y:0,z:.8},exitPoints:[{x:10.8,y:0,z:1.5},{x:12,y:0,z:1.8}],access:'door-right'}),
    makeSeat({id:'gunner',role:'gunner',entryPoint:{x:12.2,y:0,z:1},exitPoints:[{x:12.8,y:0,z:1.5}],access:'open',controls:['mounted-weapon:jeep_mg']})
  ],mountedWeapons:['jeep_mg'],presentationId:'jeep_glb'});
  return s;
}

export function runPrototypeScenarios(){
  const A=scenarioFixtures();const pickup=pickupWeapon(A,'kar98k_dead',{dropPoint:{x:.4,y:0,z:-.4},clock:12});
  const resultA={picked:pickup.id,rounds:pickup.feed.rounds,oldWeaponPosition:A.worldWeapons.player_wz29.position,oldRounds:A.worldWeapons.player_wz29.feed.rounds};

  const B=prototypeSnapshot(A);const dropped=dropEquippedWeapon(B,{position:{x:1,y:0,z:0},clock:14});
  const resultB={id:dropped.id,rounds:dropped.feed.rounds,worldPosition:dropped.position,equipped:B.player.equippedWeaponId};

  const C=scenarioFixtures();C.player.position={x:3.2,y:0,z:0};C.player.forward={x:1,y:0,z:0};enterMountedWeapon(C,'fixed_mg');const aimed=aimMountedWeapon(C,'fixed_mg',{traverseDelta:99,elevationDelta:-99});const exit=leaveMountedWeapon(C,'fixed_mg');
  const resultC={aimed,exit,occupant:C.mountedWeapons.fixed_mg.occupantId};

  const D=scenarioFixtures();D.player.position={x:11,y:0,z:-.7};D.player.forward={x:1,y:0,z:0};enterVehicleSeat(D,'jeep','driver');const canDrive=vehicleControlAvailable(D,'drive');const jeepExit=exitVehicleSeat(D);const resultD={canDrive,exit:jeepExit,seats:D.vehicles.jeep.seats.map(s=>({id:s.id,role:s.role,occupantId:s.occupantId}))};

  const E=scenarioFixtures();E.player.position={x:7.2,y:0,z:0};E.player.forward={x:1,y:0,z:0};enterMountedWeapon(E,'artillery');const withLoader=crewActionAvailable(E.mountedWeapons.artillery,'fire');E.mountedWeapons.artillery.crewStations.find(s=>s.role==='loader').occupantId=null;const withoutLoader=crewActionAvailable(E.mountedWeapons.artillery,'fire');
  const resultE={playerStation:E.player.mountedWeaponId,withLoader,withoutLoader};
  return {A:resultA,B:resultB,C:resultC,D:resultD,E:resultE};
}

if(process.argv[1]&&import.meta.url===new URL(`file://${process.argv[1]}`).href)process.stdout.write(JSON.stringify(runPrototypeScenarios(),null,2)+'\n');
