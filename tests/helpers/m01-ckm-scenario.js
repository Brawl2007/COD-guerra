import {driver,toRepair} from './m01-route.js';

// T47: a real route to the first live ckm burst, with the exact saves a test needs around it. Nothing is injected: the simulation reaches the
// repair under German fire with the route's own controls, the Germans fire for real, and the gun answers.
//   pre      the save taken one tick before the burst starts (the decision tick follows)
//   mid      the save with 4 of the 8 rounds issued (a burst in progress)
//   landing  the save with all 8 issued and 2 landed (rounds still in flight, phase already back to aim)
export function firstBurst(seed=19390901){
  const d=toRepair(driver(seed)),{sim,step}=d;let seen=0,pre=null,mid=null,landing=null,fire=null;
  for(let i=0;i<40000&&!(fire&&landing);i++){
    const g=sim.actor('ckm_gunner'),f=g.ckmFire;
    if(!fire&&g.ckm.phase==='aim'&&f.nextAt-sim.clock>0&&f.nextAt-sim.clock<=.0501)pre=sim.snapshot();
    step({crouch:i===0});
    const e=d.events.slice(seen).find(e=>e.type==='ally-fire');seen=d.events.length;
    if(e&&!fire)fire=e;
    const plan=sim.actor('ckm_gunner').ckm.burstPlan;
    if(fire&&plan&&!mid&&plan.emitted===4)mid=sim.snapshot();
    if(fire&&plan&&!landing&&plan.emitted===8&&plan.landed===2)landing=sim.snapshot();
  }
  if(!(fire&&pre&&mid&&landing))throw new Error('No live ckm burst on the route');
  return {d,sim,pre,mid,landing,fire};
}
