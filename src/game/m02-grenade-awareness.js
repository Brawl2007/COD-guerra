// A soldier can react to a nearby visible grenade or its actual nearby bounce.
// Memory keeps the last perceived position; it does not track the projectile
// through a wall or use the future location of its detonation.
const halfCone=1.32,noticeRange=8,hearingRange=5,clearRadius=8.5;
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const incapable=actor=>!actor.alive||actor.nonCombatant||actor.detachedOutOfCell||
 ['DOWN','SURRENDERED','WOUNDED_UNARMED','WOUNDED_LIAISON','WALKING_SUPPORTED','EVACUATED_B12'].includes(actor.state);

function restorePosture(actor,threat){
 if(threat.previousCrouched!==undefined)actor.crouched=threat.previousCrouched;
 if(threat.previousEyeHeight!==undefined)actor.eyeHeight=threat.previousEyeHeight;
}

export function m02ReactToGrenade(sim,actor,side){
 let threat=actor.m02GrenadeThreat;
 if(incapable(actor)){
  if(threat)delete actor.m02GrenadeThreat;
  return false;
 }
 if(threat&&threat.cell!==sim.activeCellId){
  if(actor.state==='FLEE_GRENADE'){actor.state=threat.previousState;actor.tacticalState=threat.previousTacticalState;actor.goal=null;actor.navCorners=null;restorePosture(actor,threat);}
  delete actor.m02GrenadeThreat;threat=null;
 }
 if(threat&&actor.state!=='FLEE_GRENADE'){delete actor.m02GrenadeThreat;return false;}
 if(threat&&!sim.grenades.some(g=>g.id===threat.id&&!g.exploded)){
  if(actor.state==='FLEE_GRENADE'){
   actor.state=threat.previousState;actor.tacticalState=threat.previousTacticalState;
   actor.goal=threat.previousGoal;actor.navCorners=null;restorePosture(actor,threat);
  }
  delete actor.m02GrenadeThreat;threat=null;
 }
 if(!threat){
  let nearest=null;
  for(const g of sim.grenades){
   const dx=g.x-actor.x,dz=g.z-actor.z,dist=Math.hypot(dx,dz),vertical=g.y-(actor.y??0);
   if(g.exploded||dist>noticeRange||Math.abs(vertical)>4)continue;
   const point={x:g.x,y:g.y,z:g.z,eyeHeight:0,space:'metres'};
   const visible=Math.abs(angleDiff(Math.atan2(dz,dx),actor.facing??0))<=halfCone&&
    sim.world.lineOfSight(actor,point,{includeFoliage:true});
   const bounce=!visible&&dist<=hearingRange&&sim.events.some(e=>e.type==='grenade-bounced'&&e.grenadeId===g.id&&Math.abs(e.clock-sim.clock)<.002);
   const heard=bounce&&sim.world.lineOfSight(actor,point,{includeFoliage:false});
   if(!visible&&!heard)continue;
   if(!nearest||dist<nearest.dist)nearest={g,dx,dz,dist,perception:visible?'visual':'bounce'};
  }
  if(!nearest)return false;
  const {g,dx,dz,dist,perception}=nearest,seed=[...actor.id].reduce((n,c)=>n+c.charCodeAt(0),0);
  const direction=dist>.01?{x:-dx/dist,z:-dz/dist}:{x:Math.cos(seed),z:Math.sin(seed)};
  const travel=Math.max(2,clearRadius-dist),bounds=sim.world.layout.bounds.playable;
  const clamp=(v,min,max)=>Math.max(min+.5,Math.min(max-.5,v));
  // The B02 MG fires from a fixed aperture. Its gunner ducks in place;
  // navigating away would leave later rounds originating from an empty mount.
  const mounted=actor.id==='DE-A05'&&sim.activeCellId==='A';
  threat={id:g.id,cell:sim.activeCellId,seenX:g.x,seenZ:g.z,
   goalX:mounted?actor.x:clamp(actor.x+direction.x*travel,bounds.minX,bounds.maxX),goalZ:mounted?actor.z:clamp(actor.z+direction.z*travel,bounds.minZ,bounds.maxZ),
   previousState:actor.state??'ACTIVE',previousTacticalState:actor.tacticalState??null,
   previousGoal:actor.goal?structuredClone(actor.goal):null};
  if(mounted){
   if(actor.crouched!==undefined)threat.previousCrouched=actor.crouched;
   if(actor.eyeHeight!==undefined)threat.previousEyeHeight=actor.eyeHeight;
  }
  actor.m02GrenadeThreat=threat;
  const canWarn=side==='ally'&&sim.player.alive&&Math.hypot(sim.player.x-actor.x,sim.player.z-actor.z)<=20&&
   sim.world.lineOfSight(sim.player,actor,{includeFoliage:false});
  sim.events.push({type:'grenade-warning',grenadeId:g.id,actorId:actor.id,actorName:actor.name??'Soldado',side,perception,heardByPlayer:canWarn,clock:sim.clock});
 }
 // Cancelling pending rounds or an unfinished reload never creates ammunition.
 // The next normal update may start a fresh reload after the danger is gone.
 actor.burst=null;
 if(actor.reloadingUntil>sim.clock)actor.reloadingUntil=0;
 const mounted=actor.id==='DE-A05'&&sim.activeCellId==='A';
 actor.state='FLEE_GRENADE';actor.tacticalState=mounted?'TakeCoverGrenade':'FleeGrenade';
 if(mounted)actor.seeingTargetId=null;
 actor.goal={x:threat.goalX,z:threat.goalZ,crouch:mounted,nodeId:`grenade_${mounted?'cover':'escape'}_${threat.id}`};
 return true;
}
