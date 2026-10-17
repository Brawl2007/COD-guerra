// T47: presentation of the ckm wz.30 burst. Pure functions of the saved gunner state (ckm.burstPlan of the simulation) and the mission clock:
// no renderer timer, no random draw, nothing written. A frame that never saw the burst start (pause, load, restore) draws the same flash.
export const CKM_FLASH_SEC=.07,CKM_SMOKE_SEC=1.6;

const livePlan=actors=>{
  const g=actors.find(a=>a.id==='ckm_gunner'),plan=g?.ckm?.burstPlan;
  return g?.alive&&g.active&&g.ckm.visible&&plan?.policy==='live'?plan:null;
};

/** Muzzle flashes alive at `time`: one per already-issued round of the burst whose firedAt lies within the last CKM_FLASH_SEC. */
export function ckmFlashes(actors,time){
  const plan=livePlan(actors);if(!plan)return [];
  const out=[];
  for(let k=0;k<plan.emitted;k++){const r=plan.plan[k],age=time-r.firedAt;if(age>=0&&age<CKM_FLASH_SEC)out.push({id:r.id,x:r.ox,y:r.oy,z:r.oz,age});}
  return out;
}

/** Gun smoke of the burst in progress or just fired: where it starts, how old it is (seconds since the first round) and a stable seed from the burst id. */
export function ckmSmoke(actors,time){
  const plan=livePlan(actors);if(!plan)return null;
  const age=time-plan.startedAt,first=plan.plan[0];
  return age>=0&&age<CKM_SMOKE_SEC&&plan.emitted>0?{x:first.ox,y:first.oy,z:first.oz,age,id:first.id}:null;
}
