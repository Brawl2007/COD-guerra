// Contextual player actions call the existing mission director. They never skip
// unresolved encounters, create supplies or change checkpoint/schema rules.
export function m02PlayerAction(sim) {
  const player=sim.player;
  if (player.health<=0 || sim.currentChalkPrompt()) return null;
  const near=(x,z,r=4)=>Math.hypot(player.x-x,player.z-z)<=r;
  const action=(id,prompt,extra={})=>({id,prompt:`[E] ${prompt}`,distance:0,...extra});
  if (sim.activeCellId==='C' && sim.objective.id==='O09' && !sim.areaC.c12Completed && near(-55,54,10)) {
    return action('epilogue','Romper contacto e seguir para Varsóvia');
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
    default: return false;
  }
  return true;
}
