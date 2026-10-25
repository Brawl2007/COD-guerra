import { M01Simulation, seconds } from '../../src/game/m01-simulation.js';
import { eyePosition } from '../../src/world/spatial.js';

// Test pilot: aims using input deltas and uses the real bolt/reload, without changing actors or RNG.
// Repair: the gate MG; withdrawal: the Germans on the spans, aimed a metre high so it never fires through the platoon.
export function coverControls(sim){
  if(!sim.weapon.mag)return {reload:true};
  const targets=sim.enemies.filter(a=>a.active&&a.alive&&
    (sim.active('cover_repair')?a.weapon==='mg34':a.group==='grp_de_spans'));
  const target=targets.find(a=>Math.hypot(a.x-sim.player.x,a.z-sim.player.z)<sim.weapon.profile.range-2&&sim.world.lineOfSight(sim.player,a));if(!target)return {};
  const p=sim.player,origin=eyePosition(p),dest=eyePosition(target),dx=dest.x-origin.x,dz=dest.z-origin.z;
  // Fogo de supressão acima do pelotão que atravessa: não atirar através dos próprios aliados.
  if(sim.active('cover_withdrawal'))dest.y+=1;
  const angle=Math.atan2(dz,dx),pitch=Math.atan2(dest.y-origin.y,Math.hypot(dx,dz)),turn=angle-p.angle;
  return {aim:true,lookX:Math.atan2(Math.sin(turn),Math.cos(turn))/.0022,lookY:(p.pitch-pitch)/.0022,fire:sim.weapon.state==='READY'};
}

/**
 * SP-08 (2026-10-22): the corridor task through the same controls as Game. While Jan counts he stays at the post; when Zieliński sends him back he runs to Dudek and walks
 * with him 3 m behind, on the river side (within the 10 m escort distance); afterwards he waits there for the blast. A simulation without the corridor task (the predecessors of
 * the golden amendments) gets no control at all: the old wait at the post, byte for byte.
 */
export function corridorControls(sim){
  const task=sim.corridorTask;if(!task)return {};
  if(task.phase==='done'&&sim.player.x<-300)return {};   // after the escort he waits by the station with Dudek and Zieliński for the blast, then walks back (route)
  const p=sim.player,goal=task.phase==='escort'&&task.carrier?{x:task.carrier.x+3,z:task.carrier.z+1.5}:{x:-292,z:26};
  const dx=goal.x-p.x,dz=goal.z-p.z,d=Math.hypot(dx,dz);if(d<1)return {};
  let turn=Math.atan2(dz,dx)-p.angle;turn=Math.atan2(Math.sin(turn),Math.cos(turn));
  return {lookX:turn/.0022,forward:1,sprint:d>12};
}
// A bounded route through the real simulation; no event, clock or objective injection.
// This is an automated state/control test, not a browser playthrough.
export function driver(seed=19390901,{support=false,onStep,Simulation=M01Simulation}={}){
  const sim=new Simulation(seed),checkpoints={},events=[],combatSnapshots={};
  function step(controls={}){
    sim.tick(.05,controls);
    const emitted=sim.drainEvents();
    for(const e of emitted){
      events.push(e);if(e.type==='checkpoint')checkpoints[e.id]=structuredClone(sim.checkpoint);
      if(e.type==='restored')throw new Error(`Route died at ${sim.battleClock}: ${sim.failure??'combat/bounds'}`);
      if(e.type==='round-impact'&&e.pinned?.includes('pawel_krawiec')&&!combatSnapshots.repairThreat)combatSnapshots.repairThreat=sim.snapshot();
      if(e.type==='m01-blast'&&sim.scene?.id==='cs_m01_east_blast')combatSnapshots.eastDemolition=sim.snapshot();
      if(e.type==='m01-blast'&&sim.scene?.id==='cs_m01_west_blast')combatSnapshots.westDemolition=sim.snapshot();
    }
    if(sim.active('cover_repair')&&!combatSnapshots.repair)combatSnapshots.repair=sim.snapshot();
    if(sim.consumedEvent('evt_m01_germans_on_east_spans')&&!combatSnapshots.withdrawal)combatSnapshots.withdrawal=sim.snapshot();
    if(sim.consumedEvent('evt_m01_east_demolition')&&sim.player.x<-100&&!combatSnapshots.eastDemolitionOutside)combatSnapshots.eastDemolitionOutside=sim.snapshot();
    onStep?.({sim,controls,events:emitted,dt:.05});
  }
  function until(predicate,limit=240,controls={}){
    for(let i=0;i<limit*20;i++){
      if(predicate())return;
      const own=typeof controls==='function'?controls():controls;
      step({...own,...(support&&(sim.active('cover_repair')||sim.active('cover_withdrawal'))?coverControls(sim):{})});
    }
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
  return {sim,checkpoints,events,combatSnapshots,step,until,walk};
}
/** The route's own steps up to the crate delivery, i.e. the start of obj_m01_cover_repair. */
export function toRepair(d){
  const {sim,step,until,walk}=d;
  step({skip:true});
  walk(-66,26);walk(-30,26);walk(-30,2);walk(16,2);step({interact:true});
  until(()=>sim.active('follow_sergeant'),120);
  walk(-30,2);walk(-30,11);walk(-147,11);
  walk(-50,11);walk(-44,11);
  // The crates and sandbags of the repair cluster (-150,8) and the two drums at the hut's west door (-272/-274, 14) are solid: pass north of the first, west of the second.
  walk(-150,15.5);walk(-245,9);walk(-275.5,9);walk(-275.5,21);walk(-265,21);step({interact:true});
  walk(-275.5,21);walk(-275.5,8);walk(-155,15.5);walk(-123,8);step({interact:true});
  if(!sim.active('cover_repair'))throw new Error('Route did not deliver the crate');
  return d;
}
/** A real route to the scripted station evacuation, optionally observing it from the yard. */
export function toStationEvacuation(d=driver(),{observe=false,phase='drag'}={}){
  const {sim,step,walk,until}=d;step({skip:true});
  walk(-66,26);walk(-30,26);walk(-30,2);walk(16,2);step({interact:true});
  if(observe){walk(-30,2);walk(-30,32);walk(-110,32);walk(-290,35);walk(-308,35);}
  until(()=>sim.consumedEvent('evt_m01_wounded_dragged'),120);
  if(observe&&phase==='release'){
    until(()=>sim.actor('generic_rifleman').stationDrag?.phase==='drag',180);walk(-331,32);
  }
  until(()=>sim.actor('generic_rifleman').stationDrag?.phase===phase,180);
  if(phase==='drag')until(()=>sim.actor('leon_dudek').x<-310,80);
  return d;
}
/** Stay in the real sandbag cover until an actual adjustment salvo is emitted. */
export function toCoverAdjustment({truss=false,Simulation}={}){
  const d=toRepair(driver(undefined,{Simulation})),{sim,walk,step,until}=d;
  walk(-115,27);walk(-26.5,28);step({crouch:true});
  until(()=>sim.active('hold_access'),500);
  if(truss){step({crouch:true});walk(-115,32);walk(-30,40);walk(-10,40);walk(30,40);walk(38.5,37);step({crouch:true});}
  d.beforeCoverAdjustment=sim.snapshot();
  until(()=>sim.timers.coverFire,65);
  return d;
}
// support: on the embankment slope beside the sappers (where the Lisewo gates are in sight) and on the south side of the deck.
export function route(seed=19390901,{support=false,onStep,Simulation=M01Simulation}={}){
  const {sim,checkpoints,events,combatSnapshots,step,until,walk}=toRepair(driver(seed,{support,onStep,Simulation}));
  if(support)walk(-120,16.5);else{walk(-115,27);walk(-28,28);step({crouch:true});}
  until(()=>sim.active('hold_access'),500);
  if(!support)step({crouch:true});
  // D43: like a player who is low after the repair, the support pilot asks Kowal for clips through the game's own interaction (E beside him, reserve <= 25,
  // timers.kowalRounds left) before going to the deck; it comes up from behind him (west), as tests/helpers/m01-cover.js does. A pilot that never did ran dry
  // before the east demolition on the knife-edge route (seed 3 with support).
  if(support&&sim.weapon.reserve<=25&&(sim.timers.kowalRounds??0)>0){
    const kowal=sim.actor('szymon_kowal');
    if(kowal.alive&&kowal.active){walk(kowal.x-1.5,kowal.z);for(let i=0;i<2&&sim.weapon.reserve<=25&&sim.timers.kowalRounds>0;i++){step({interact:true});step({});}}
  }
  walk(-115,32);walk(-30,40);walk(-10,40);walk(support?38:30,support?42.4:40);
  until(()=>sim.consumedEvent('evt_m01_east_demolition'),500);
  walk(-15,40);walk(-115,27);walk(-275,27);walk(-292,26);
  until(()=>sim.consumedEvent('evt_m01_west_demolition'),500,()=>corridorControls(sim));
  if(sim.corridorTask)walk(-292,26);   // SP-08: back to the post after the escort (a simulation without the task never left it)
  walk(-263,58);walk(-263,70);   // the shelter is entered by its open north passage (x -265..-261.5) through the gate of the fence, not through the west wall
  until(()=>sim.scene?.id==='cs_m01_roll_call',30);const outro=sim.snapshot();step({skip:true});
  until(()=>sim.mission.complete,10);
  if(sim.battleClock!==seconds('07:05:00'))throw new Error('Wrong final battle clock');
  return {sim,checkpoints,events,outro,combatSnapshots};
}
