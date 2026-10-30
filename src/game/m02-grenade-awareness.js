// A soldier can react only to a nearby grenade in their visual cone, with an
// unobstructed ray to its actual position. Memory keeps the last observed
// position while fleeing; it does not track the projectile through a wall.
const halfCone=1.32,noticeRange=8,clearRadius=8.5;
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const incapable=actor=>!actor.alive||actor.nonCombatant||actor.detachedOutOfCell||
 ['DOWN','SURRENDERED','WOUNDED_UNARMED','WOUNDED_LIAISON','WALKING_SUPPORTED','EVACUATED_B12'].includes(actor.state)||actor.id==='DE-A05';

export function m02ReactToGrenade(sim,actor,side){
 let threat=actor.m02GrenadeThreat;
 if(incapable(actor)){
  if(threat)delete actor.m02GrenadeThreat;
  return false;
 }
 if(threat&&threat.cell!==sim.activeCellId){
  if(actor.state==='FLEE_GRENADE'){actor.state=threat.previousState;actor.tacticalState=threat.previousTacticalState;actor.goal=null;actor.navCorners=null;}
  delete actor.m02GrenadeThreat;threat=null;
 }
 if(threat&&actor.state!=='FLEE_GRENADE'){delete actor.m02GrenadeThreat;return false;}
 if(threat&&!sim.grenades.some(g=>g.id===threat.id&&!g.exploded)){
  if(actor.state==='FLEE_GRENADE'){
   actor.state=threat.previousState;actor.tacticalState=threat.previousTacticalState;
   actor.goal=threat.previousGoal;actor.navCorners=null;
  }
  delete actor.m02GrenadeThreat;threat=null;
 }
 if(!threat){
  let nearest=null;
  for(const g of sim.grenades){
   const dx=g.x-actor.x,dz=g.z-actor.z,dist=Math.hypot(dx,dz),vertical=g.y-(actor.y??0);
   if(g.exploded||dist>noticeRange||Math.abs(vertical)>4||
      Math.abs(angleDiff(Math.atan2(dz,dx),actor.facing??0))>halfCone)continue;
   const point={x:g.x,y:g.y,z:g.z,eyeHeight:0,space:'metres'};
   if(!sim.world.lineOfSight(actor,point,{includeFoliage:true}))continue;
   if(!nearest||dist<nearest.dist)nearest={g,dx,dz,dist};
  }
  if(!nearest)return false;
  const {g,dx,dz,dist}=nearest,seed=[...actor.id].reduce((n,c)=>n+c.charCodeAt(0),0);
  const direction=dist>.01?{x:-dx/dist,z:-dz/dist}:{x:Math.cos(seed),z:Math.sin(seed)};
  const travel=Math.max(2,clearRadius-dist),bounds=sim.world.layout.bounds.playable;
  const clamp=(v,min,max)=>Math.max(min+.5,Math.min(max-.5,v));
  threat={id:g.id,cell:sim.activeCellId,seenX:g.x,seenZ:g.z,
   goalX:clamp(actor.x+direction.x*travel,bounds.minX,bounds.maxX),goalZ:clamp(actor.z+direction.z*travel,bounds.minZ,bounds.maxZ),
   previousState:actor.state??'ACTIVE',previousTacticalState:actor.tacticalState??null,
   previousGoal:actor.goal?structuredClone(actor.goal):null};
  actor.m02GrenadeThreat=threat;
  const canWarn=side==='ally'&&sim.player.alive&&Math.hypot(sim.player.x-actor.x,sim.player.z-actor.z)<=20&&
   sim.world.lineOfSight(sim.player,actor,{includeFoliage:false});
  sim.events.push({type:'grenade-warning',grenadeId:g.id,actorId:actor.id,actorName:actor.name??'Soldado',side,heardByPlayer:canWarn,clock:sim.clock});
 }
 // Cancelling pending rounds or an unfinished reload never creates ammunition.
 // The next normal update may start a fresh reload after the danger is gone.
 actor.burst=null;
 if(actor.reloadingUntil>sim.clock)actor.reloadingUntil=0;
 actor.state='FLEE_GRENADE';actor.tacticalState='FleeGrenade';
 actor.goal={x:threat.goalX,z:threat.goalZ,crouch:false,nodeId:`grenade_escape_${threat.id}`};
 return true;
}
