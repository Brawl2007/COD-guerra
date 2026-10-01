// Procedural presentation in metres. This never writes to an actor or advances gameplay.
export function actorPoseName(actor,time=0){
  if(!actor.alive)return 'fallen';
  if(actor.carriedBy)return 'carried';
  if(actor.state==='WOUNDED')return 'wounded';
  if(actor.pose==='seated')return 'seated';
  // Aliado sob fogo (suppressedUntil vem da simulação): agachado e curvado para a frente, cabeça em baixo.
  if(actor.team==='ally'&&time<(actor.suppressedUntil??0))return 'pinned';
  return actor.crouched?'crouched':'standing';
}

export function actorPose(actor,time){
  const name=actorPoseName(actor,time),seated=name==='seated',pinned=name==='pinned',crouched=name==='crouched'||pinned;
  const low=seated||crouched,hip=seated?.46:crouched?.48:.84,lean=crouched?-.1:0;
  const walk=name==='standing'&&['ADVANCE','RETREAT'].includes(actor.state);
  const phase=time*7+Number(actor.id.match(/\d+$/)?.[0]??0),stride=walk?Math.sin(phase)*.16:0;
  const limbs=[],boots=[];
  for(const [i,z]of [-.14,.14].entries()){
    const step=i?stride:-stride;
    const h=[lean,hip,z],k=[seated?.32:crouched?.16:step,.43-(crouched?.18:0),z];
    const ankle=[seated?.32:crouched?0:-step,.07,z];
    limbs.push({from:h,to:k,radius:.095},{from:k,to:ankle,radius:.085});
    boots.push([ankle[0]+.045,.055,z]);
    const shoulder=[lean,hip+.49,z*1.85];
    const elbow=seated?[.16,hip+.23,z*1.85]:[.20,hip+.22,z*1.9];
    const hand=seated?[.30,hip+.10,z*1.3]:[.43,hip+.26,z*1.25];
    limbs.push({from:shoulder,to:elbow,radius:.075},{from:elbow,to:hand,radius:.065});
  }
  const lying=name==='wounded'||name==='fallen',carried=name==='carried';
  return {name,limbs,boots,
    root:{offsetY:lying?.42:0,pivotY:lying||carried?.84:0,pitch:lying?-Math.PI/2:0,roll:carried?-Math.PI/2:pinned?-.95:0},
    torso:{position:[lean,hip+.34,0],size:[.24,low?.59:.65,.21]},
    head:[lean+.02,hip+(low?.74:.79),0],helmet:[lean+.02,hip+(low?.88:.93),0],
    rifle:[seated?.35:lean+.46,hip+(seated?.13:.27),.10]};
}
