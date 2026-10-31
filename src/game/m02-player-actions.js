import {eyePosition,traceObstruction} from '../world/spatial.js';

// Kar98k and wz.29 use 7.92×57 mm; ammunition belongs to the dead actor and
// is transferred, never created. Living, surrendered and wounded men are not loot.
export function m02RifleAmmoSources(sim){
 return (sim.enemies??[]).filter(e=>e.alive===false&&e.state==='DEAD'&&!e.nonCombatant&&e.weapon==='kar98k'&&
  Number.isSafeInteger(e.mag)&&Number.isSafeInteger(e.reserve)&&e.mag>=0&&e.reserve>=0&&e.mag+e.reserve>0);
}
function canReachActor(sim,actor,height){
 const origin=eyePosition(sim.player),target={x:actor.x,y:(actor.y??0)+height,z:actor.z};
 const dx=target.x-origin.x,dy=target.y-origin.y,dz=target.z-origin.z,distance=Math.hypot(dx,dy,dz);
 return distance<1e-8||!traceObstruction(sim.world,origin,{x:dx/distance,y:dy/distance,z:dz/distance},Math.max(0,distance-.05));
}

// Contextual player actions call the existing mission director. They never skip
// unresolved encounters, create supplies or change checkpoint/schema rules.
export function m02PlayerAction(sim) {
  const player=sim.player;
  if (player.health<=0 || sim.playerGrenadeAction || sim.currentChalkPrompt()) return null;
  const near=(x,z,r=4)=>Math.hypot(player.x-x,player.z-z)<=r;
  const action=(id,prompt,extra={})=>({id,prompt:`[E] ${prompt}`,distance:0,...extra});
  if (sim.activeCellId==='C' && sim.objective.id==='O09' && !sim.areaC.c12Completed && near(-55,54,10)) {
    const lis=sim.allies.find(a=>a.id==='pl_lis'&&a.alive&&!a.detachedOutOfCell&&a.state==='WOUNDED_LIAISON');
    const prompt=!sim.areaC.lisContactedInC11
      ? lis?'Recuar sem socorrer Lis':'Recuar — Lis desaparecido'
      : sim.flags['m02.lis_status']==='wounded_walking'?'Recuar — Lis ainda a caminho':'Romper contacto e seguir para Varsóvia';
    return action('epilogue',prompt,{distance:Number(Math.hypot(player.x+55,player.z-54).toFixed(1))});
  }
  if(sim.activeCellId==='C'&&sim.areaC?.c11Started&&!sim.areaC.lisContactedInC11&&!player.carryingVolumeId){
    const lis=sim.allies.find(a=>a.id==='pl_lis'&&a.alive&&!a.detachedOutOfCell&&a.state==='WOUNDED_LIAISON');
    if(lis&&near(lis.x,lis.z,2)&&canReachActor(sim,lis,.95))return action('assist-lis','Socorrer Lis',{distance:Number(Math.hypot(lis.x-player.x,lis.z-player.z).toFixed(1))});
  }
  if(sim.currentDoorPrompt())return null;
  if (sim.activeCellId==='A' && sim.objective.id==='COMPLETE') {
    return action('area-b','Seguir a secção para Łęczyca');
  }
  if (sim.activeCellId==='B') {
    const cart=sim.areaB?.supplyCart;
    if (!cart) return null;
    if (!player.carryingVolumeId) {
      const volume=cart.volumes.find(v=>!v.delivered&&!v.lost&&!v.carriedBy&&near(v.x,v.z,2.5));
      if (volume) return action('pickup','Transportar abastecimento',{volumeId:volume.id});
    }
    const suppliesResolved=cart.volumes.every(v=>v.delivered||v.lost);
    if (suppliesResolved && !sim.areaB.corridorUnderDirectFire && near(cart.goalX,cart.goalZ,6)) {
      return sim.areaB.reorganizedC07 ? action('area-c','Seguir para Leśmierz') : action('reorganize','Reagrupar a secção');
    }
  }
  if(!player.carryingVolumeId&&sim.weapon.reserve<40){
    const candidate=m02RifleAmmoSources(sim).filter(e=>near(e.x,e.z,1.8)&&canReachActor(sim,e,.35))
      .sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z)||(a.id<b.id?-1:a.id>b.id?1:0))[0];
    if(candidate)return action('rifle-ammo','Recolher munição de 7,92 mm',{actorId:candidate.id,distance:Number(Math.hypot(candidate.x-player.x,candidate.z-player.z).toFixed(1))});
  }
  return null;
}

export function performM02PlayerAction(sim) {
  const action=m02PlayerAction(sim);
  if (!action) return false;
  switch(action.id) {
    case 'area-b': sim.triggerTransitionTAB(); sim.enterAreaBC06(); break;
    case 'pickup': sim.pickupSupplyVolume(action.volumeId); break;
    case 'reorganize': sim.completeC07Reorganization(); break;
    case 'area-c': sim.enterAreaCC09(); break;
    case 'epilogue': sim.completeC12Epilogue({lisOutcome:sim.areaC.lisContactedInC11?sim.flags['m02.lis_status']:'missing'}); break;
    case 'assist-lis': sim.assistLisInC11('wounded_walking'); break;
    case 'rifle-ammo': {
      const actor=sim.enemies.find(e=>e.id===action.actorId),given=sim.weapon.resupply(actor.mag+actor.reserve);
      const reserve=Math.min(actor.reserve,given);actor.reserve-=reserve;actor.mag-=given-reserve;
      sim.events.push({type:'rifle-ammo-collected',actorId:actor.id,rounds:given,clock:sim.clock});
      break;
    }
    default: return false;
  }
  return true;
}
