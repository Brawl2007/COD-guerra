import { M01Simulation, seconds } from '../../src/game/m01-simulation.js';

// A bounded route through the real simulation; no event, clock or objective injection.
// This is an automated state/control test, not a browser playthrough.
export function route(seed=19390901){
  const sim=new M01Simulation(seed),checkpoints={},events=[];
  function step(controls={}){
    sim.tick(.05,controls);
    for(const e of sim.drainEvents()){
      events.push(e);if(e.type==='checkpoint')checkpoints[e.id]=structuredClone(sim.checkpoint);
      if(e.type==='restored')throw new Error(`Route died at ${sim.battleClock}: ${sim.failure??'combat/bounds'}`);
    }
  }
  function until(predicate,limit=240,controls={}){
    for(let i=0;i<limit*20;i++){if(predicate())return;step(controls);}
    throw new Error(`Route stalled: ${sim.mission.text}; battle ${sim.battleClock}, gate ${JSON.stringify(sim.gate)}, unsafe allies ${JSON.stringify(sim.allies.filter(a=>a.alive&&a.active&&!a.civilian&&a.x>=-90).map(({id,x,z,state})=>({id,x,z,state})))}`);
  }
  // Steering is applied through the same controls as Game; simulation remains authoritative.
  function walk(x,z,limit=150){
    for(let i=0;i<limit*20;i++){
      const p=sim.player,dx=x-p.x,dz=z-p.z;
      if(Math.hypot(dx,dz)<1.2||sim.mission.phase==='OUTRO')return;
      let turn=Math.atan2(dz,dx)-p.angle;turn=Math.atan2(Math.sin(turn),Math.cos(turn));
      step({lookX:turn/.0022,forward:1,sprint:true});
    }
    throw new Error(`Movement blocked en route to ${x},${z}: ${JSON.stringify(sim.player)}`);
  }
  step({skip:true});
  walk(-66,26);walk(-15,26);walk(-15,2);walk(16,2);step({interact:true});
  until(()=>sim.active('follow_sergeant'),120);
  walk(-15,2);walk(-15,11);walk(-147,11);
  walk(-50,11);walk(-44,11);
  walk(-245,9);walk(-274,9);walk(-274,21);walk(-265,21);step({interact:true});
  walk(-274,21);walk(-274,8);walk(-123,8);step({interact:true});
  walk(-115,27);walk(-28,28);step({crouch:true});
  until(()=>sim.active('hold_access'),500);
  step({crouch:true});
  walk(-115,32);walk(-10,32);walk(-10,40);walk(30,40);
  until(()=>sim.consumedEvent('evt_m01_east_demolition'),500);
  walk(-15,40);walk(-115,27);walk(-275,27);walk(-292,26);
  until(()=>sim.consumedEvent('evt_m01_west_demolition'),500);
  walk(-292,68);walk(-262,70);
  until(()=>sim.scene?.id==='cs_m01_roll_call',30);const outro=sim.snapshot();step({skip:true});
  until(()=>sim.mission.complete,10);
  if(sim.battleClock!==seconds('07:05:00'))throw new Error('Wrong final battle clock');
  return {sim,checkpoints,events,outro};
}
