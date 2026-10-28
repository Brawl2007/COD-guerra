// The group is visible in C10/C11 until each man reaches safety. Its members
// then leave the physical scene and must no longer be acquired or damaged.
export function m02ExposedLastGroup(sim){
 if(sim.activeCellId!=='C'||!sim.areaC?.c10Started||sim.areaC.c12Completed)return [];
 return sim.areaC.lastGroup.filter(actor=>actor.alive&&!actor.evacuated);
}

// A man who survives a serious wound continues using the authored wounded
// gait and speed. This is simulation state and therefore travels in saves.
export function updateM02EvacuationWound(sim,actor){
 if(sim.activeCellId!=='C'||!sim.areaC?.lastGroup.includes(actor))return;
 if(!actor.alive){actor.moving=false;actor.goal=null;return;}
 if(actor.health<=50){actor.wounded=true;actor.speed=Math.min(actor.speed??3.8,3.8);}
}
