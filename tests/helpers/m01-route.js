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

// A bounded route through the real simulation; no event, clock or objective injection.
// This is an automated state/control test, not a browser playthrough.
export function driver(seed=19390901,{support=false}={}){
  const sim=new M01Simulation(seed),checkpoints={},events=[],combatSnapshots={};
  function step(controls={}){
    sim.tick(.05,controls);
    for(const e of sim.drainEvents()){
      events.push(e);if(e.type==='checkpoint')checkpoints[e.id]=structuredClone(sim.checkpoint);
      if(e.type==='restored')throw new Error(`Route died at ${sim.battleClock}: ${sim.failure??'combat/bounds'}`);
      if(e.type==='round-impact'&&e.pinned?.includes('pawel_krawiec')&&!combatSnapshots.repairThreat)combatSnapshots.repairThreat=sim.snapshot();
      if(e.type==='m01-blast'&&sim.scene?.id==='cs_m01_east_blast')combatSnapshots.eastDemolition=sim.snapshot();
      if(e.type==='m01-blast'&&sim.scene?.id==='cs_m01_west_blast')combatSnapshots.westDemolition=sim.snapshot();
    }
    if(sim.active('cover_repair')&&!combatSnapshots.repair)combatSnapshots.repair=sim.snapshot();
    if(sim.consumedEvent('evt_m01_germans_on_east_spans')&&!combatSnapshots.withdrawal)combatSnapshots.withdrawal=sim.snapshot();
    if(sim.consumedEvent('evt_m01_east_demolition')&&sim.player.x<-100&&!combatSnapshots.eastDemolitionOutside)combatSnapshots.eastDemolitionOutside=sim.snapshot();
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
  walk(-66,26);walk(-15,26);walk(-15,2);walk(16,2);step({interact:true});
  until(()=>sim.active('follow_sergeant'),120);
  walk(-15,2);walk(-15,11);walk(-147,11);
  walk(-50,11);walk(-44,11);
  walk(-245,9);walk(-274,9);walk(-274,21);walk(-265,21);step({interact:true});
  walk(-274,21);walk(-274,8);walk(-123,8);step({interact:true});
  if(!sim.active('cover_repair'))throw new Error('Route did not deliver the crate');
  return d;
}
// support: on the embankment slope beside the sappers (where the Lisewo gates are in sight) and on the south side of the deck.
export function route(seed=19390901,{support=false}={}){
  const {sim,checkpoints,events,combatSnapshots,step,until,walk}=toRepair(driver(seed,{support}));
  if(support)walk(-120,16.5);else{walk(-115,27);walk(-28,28);step({crouch:true});}
  until(()=>sim.active('hold_access'),500);
  if(!support)step({crouch:true});
  walk(-115,32);walk(-10,32);walk(-10,40);walk(support?38:30,support?42.4:40);
  until(()=>sim.consumedEvent('evt_m01_east_demolition'),500);
  walk(-15,40);walk(-115,27);walk(-275,27);walk(-292,26);
  until(()=>sim.consumedEvent('evt_m01_west_demolition'),500);
  walk(-292,68);walk(-262,70);
  until(()=>sim.scene?.id==='cs_m01_roll_call',30);const outro=sim.snapshot();step({skip:true});
  until(()=>sim.mission.complete,10);
  if(sim.battleClock!==seconds('07:05:00'))throw new Error('Wrong final battle clock');
  return {sim,checkpoints,events,outro,combatSnapshots};
}
