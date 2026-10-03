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
  kb_wz29:Object.freeze({id:'kb_wz29',caliber:'7.92x57',feedKind:'internal-magazine',capacity:5,chargeFamilies:['mauser-stripper-5','single-round']}),
  kar98k:Object.freeze({id:'kar98k',caliber:'7.92x57',feedKind:'internal-magazine',capacity:5,chargeFamilies:['mauser-stripper-5','single-round']}),
  rkm_wz28:Object.freeze({id:'rkm_wz28',caliber:'7.92x57',feedKind:'detachable-magazine',capacity:20,feedFamily:'rkm28-mag'}),
  mg34:Object.freeze({id:'mg34',caliber:'7.92x57',feedKind:'belt',capacity:50,feedFamily:'mg34-belt'}),
  ckm_wz30:Object.freeze({id:'ckm_wz30',caliber:'7.92x57',feedKind:'belt',capacity:330,feedFamily:'ckm30-cloth-belt'}),
});

export function makeWorldWeapon({id,weaponType,position,orientation={yaw:0,pitch:0,roll:0},feed,holder=null,
  condition='serviceable',protected:protectedItem=false,persistent=false,droppedAt=null,sourceActorId=null,presentationId=null}){
  const profile=WEAPON_TYPES[weaponType];if(!profile)throw new Error(`unknown weaponType ${weaponType}`);
  if(!id)throw new Error('world weapon requires stable id');
  if(!feed||feed.kind!==profile.feedKind)throw new Error(`feed kind ${feed?.kind} does not match ${weaponType}`);
  if(Number.isInteger(feed.rounds)&&Number.isInteger(feed.capacity)&&(feed.rounds<0||feed.rounds>feed.capacity))throw new Error('invalid feed rounds');
  return {id,weaponType,position:position?clone(position):null,orientation:clone(orientation),holder:holder?clone(holder):null,
    feed:clone(feed),condition,protected:Boolean(protectedItem),persistent:Boolean(persistent),droppedAt,sourceActorId,presentationId};
}

export function makePrototypeState({playerPosition={x:0,y:0,z:0},playerForward={x:1,y:0,z:0}}={}){
  return {prototypeSchema:1,clock:0,player:{id:'player',position:clone(playerPosition),forward:clone(playerForward),equippedWeaponId:null,mountedWeaponId:null,vehicleSeat:null},
    actors:{},worldWeapons:{},mountedWeapons:{},vehicles:{}};
}

export function isCartridgeCompatible(weaponType,ammo){
  const w=WEAPON_TYPES[weaponType];return Boolean(w&&ammo?.kind==='cartridges'&&ammo.caliber===w.caliber&&Number.isInteger(ammo.rounds)&&ammo.rounds>=0);
}

export function isFeedDeviceCompatible(weaponType,device){
  const w=WEAPON_TYPES[weaponType];if(!w||!device||device.caliber!==w.caliber)return false;
  if(w.feedKind==='internal-magazine')return device.kind==='charger'&&w.chargeFamilies.includes(device.family);
  return device.kind===w.feedKind&&device.family===w.feedFamily;
}

export function rayBoxSegment(from,to,box){
  const d={x:to.x-from.x,y:to.y-from.y,z:to.z-from.z};let near=0,far=1;
  for(const axis of ['x','y','z']){
    if(Math.abs(d[axis])<1e-9){if(from[axis]<box.min[axis]||from[axis]>box.max[axis])return null;continue;}
    const a=(box.min[axis]-from[axis])/d[axis],b=(box.max[axis]-from[axis])/d[axis];near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));if(near>far)return null;
  }
  return near>=0&&near<=1?near:null;
}

export function makeTrace(obstacles=[]){
  return (from,to)=>{
    let first=null;for(const box of obstacles){const t=rayBoxSegment(from,to,box);if(t!==null&&(!first||t<first.t))first={...box,t};}
    return first;
  };
}

export function resolveInteraction(player,candidates,{trace=()=>null}={}){
  const valid=[];
  for(const c of candidates){
    if(!c||c.available===false||c.protected||!c.anchor)continue;
    const d=distance(player.position,c.anchor);if(d>(c.maxDistance??2.5))continue;
    const angle=angleDeg(player.forward,direction(player.position,c.anchor));if(angle>(c.maxAngleDeg??60))continue;
    if(trace(player.position,c.anchor))continue;
    valid.push({...c,distance:d,angleDeg:angle});
  }
  valid.sort((a,b)=>(b.priority??0)-(a.priority??0)||a.angleDeg-b.angleDeg||a.distance-b.distance||a.id.localeCompare(b.id));
  return valid[0]??null;
}

export function weaponPickupCandidate(state,weaponId){
  const w=state.worldWeapons[weaponId];if(!w)return null;
  const holderActor=w.holder?.kind==='actor'?state.actors[w.holder.id]:null;
  const available=!w.protected&&w.position!==null&&(!w.holder||holderActor?.alive===false);
  return {id:`pickup:${w.id}`,kind:'pickup-weapon',entityId:w.id,anchor:w.position,priority:40,maxDistance:2.4,maxAngleDeg:65,
    prompt:`E — Pick up ${w.weaponType}`,available,protected:w.protected};
}

export function dropActorWeapon(state,actorId,{clock=state.clock,lateral=.35}={}){
  const actor=state.actors[actorId];if(!actor||actor.alive!==false)throw new Error('actor must be dead before weapon drop');
  const w=Object.values(state.worldWeapons).find(item=>item.holder?.kind==='actor'&&item.holder.id===actorId);if(!w)return null;
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
