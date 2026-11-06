import {driver,toRepair,route} from './m01-route.js';
import {CKM_STOPPAGES} from '../../src/game/m01-simulation.js';

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

// 2026-10-22 (ckm stoppage, golden amendment 15): a real route to the first stoppage of the table (CKM_STOPPAGES[0]), with the saves a test needs around it. It is the golden route itself
// (tests/helpers/m01-route.js route(), seed 19390901 or 7 with the covering-fire pilot); the run stops a few seconds after the gun is cleared.
//   pre        the save taken one tick before the stoppage strikes (the decision tick follows), with exactly the shape an older build saved (no ckmFire.jams, no clearAt)
//   mid        the save two seconds into the stoppage (phase stoppage on all three men)
//   cleared    the save on the tick the loader has cleared the gun (ckm_stoppage_cleared)
//   onset      {event, clock, battleClock, belt, bursts, rng} on the tick it strikes; cleared: {event, clock}
//   between    the types of every event from the onset to the clearance (there must be no ally-fire in it)
//   next       the first ally-fire after the clearance ({at, clock}), null if the run stopped first
export function firstStoppage(seed=19390901,{support=false}={}){
  const out={onset:null,cleared:null,pre:null,mid:null,after:null,between:[],next:null,stopped:false},STOP=new Error('first stoppage recorded');
  let last=null,afterClock=null;
  try{
    route(seed,{support,onStep:({sim,events})=>{
      const g=sim.actor('ckm_gunner'),f=g.ckmFire;
      for(const e of events){
        if(out.onset&&!out.cleared&&e.type!=='ckm_stoppage')out.between.push(e.type);
        if(e.type==='ckm_stoppage'&&!out.onset){out.onset={event:e,clock:sim.clock,battleClock:sim.battleClock,belt:f.belt,bursts:f.bursts,rng:f.rng};out.pre=last;}
        if(e.type==='ckm_stoppage_cleared'&&out.onset&&!out.cleared){out.cleared={event:e,clock:sim.clock};out.after=sim.snapshot();afterClock=sim.clock;}
        if(e.type==='ally-fire'&&out.cleared&&!out.next)out.next={at:e.at,clock:sim.clock};
      }
      if(out.onset&&!out.mid&&sim.clock>=out.onset.clock+2)out.mid=sim.snapshot();
      if(!out.onset&&(f.jams??0)===0&&f.bursts>=CKM_STOPPAGES[0].after)last=sim.snapshot();
      if(out.cleared&&(out.next||sim.clock>=afterClock+4)){out.stopped=true;throw STOP;}
    }});
  }catch(error){if(error!==STOP)throw error;}
  if(!(out.onset&&out.pre&&out.mid&&out.cleared))throw new Error('No ckm stoppage on the route');
  return out;
}
